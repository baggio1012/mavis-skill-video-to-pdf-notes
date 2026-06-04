# Edge Fallback for `render_html.cjs`

The `minimax-pdf` skill ships `scripts/render_html.cjs` which uses
Playwright's `chromium.launch()` by default. If Chromium is not
installed (the typical situation — `npx playwright install chromium`
downloads 150+ MB and often stalls), the script auto-runs the install
and re-tries. When that also fails, the only stable alternative on
Windows is to launch **Microsoft Edge** (preinstalled on every
Windows 10/11 box) via Playwright's `channel: 'msedge'`.

## Use the bundled `render_msedge.cjs` (recommended)

This skill ships a ready-to-use `render_msedge.cjs` (in
`references/render_msedge.cjs`) that already has the `channel: 'msedge'`
patch **and** a 2-attempt auto-retry loop. To use it:

```powershell
# 1. Copy the bundled cjs to a writable workspace directory
$skillDir  = "$env:USERPROFILE\.mavis\skills\video-to-pdf-notes-2"
$workspace = "$env:USERPROFILE\.mavis\agents\mavis\workspace"
Copy-Item "$skillDir\references\render_msedge.cjs" "$workspace\render_msedge.cjs" -Force

# 2. Run it on your HTML
node "$workspace\render_msedge.cjs" `
     --in "page.html" --out "out.pdf" --format A4 --margin "14mm 12mm" --wait 3000
```

If you import this skill into MiniMax Code from GitHub, you do **not**
need to run any setup — the `render_msedge.cjs` is already part of the
skill. Just open the file, copy it to your workspace, and call it
from your skill's HTML-render step.

## What the bundled cjs does differently

Two changes vs the upstream `render_html.cjs`:

1. `chromium.launch({ channel: 'msedge' })` on **both** launch sites
   (line 122 and line 140 in the original), so we never fall through
   to Playwright's Chromium download.
2. A 2-attempt retry loop around the entire launch+render cycle. Each
   attempt gets a fresh browser instance; the second attempt is
   preceded by a 2-second pause to let Edge clean up. This absorbs
   transient `Protocol error (Page.printToPDF): Printing failed` errors
   that succeed on the second try (observed in practice — see
   `references/ffmpeg-path.md` for the broader context).

The JSON output includes an `attempts` field so you can see whether
retry fired:

```json
{"status":"ok","out":"...","size_kb":525,"format":"A4","landscape":false,"attempts":2}
{"status":"retry","attempt":1,"next":2,"error":"Error: ..."}
```

## Patching the upstream cjs manually (legacy / debugging)

If you need to patch the upstream `render_html.cjs` directly (e.g.
when running this skill's HTML through a different framework), the
one-line shim is:

```powershell
$src = "$env:USERPROFILE\.mavis\.builtin-skills\minimax-pdf\scripts\render_html.cjs"
$dst = "$env:USERPROFILE\.mavis\agents\mavis\workspace\render_msedge.cjs"
Copy-Item $src $dst -Force

$content = Get-Content $dst -Raw
$content = $content.Replace(
  'chromium.launch()',
  "chromium.launch({ channel: 'msedge' })"
)
Set-Content -Path $dst -Value $content -Encoding UTF8
```

This produces a cjs with `channel: 'msedge'` patched in but **without**
the auto-retry loop — useful for debugging whether retry itself is
the source of a problem, but not for production use.

## Auto-retry on transient render failures

The shipped `render_html.cjs` only retries on **launch** failure (it then
runs `npx playwright install chromium` and re-launches). It does **not**
retry on **render** failure — and Edge's `page.pdf()` occasionally fails
with `Protocol error (Page.printToPDF): Printing failed` on the first
try, then succeeds on the second.

The patched `render_msedge.cjs` shipped with this skill wraps the entire
launch + render cycle in a 2-attempt retry loop. Each attempt gets a
fresh browser instance, with a 2-second pause between attempts. The
JSON output includes an `attempts` field so you can see whether retry
fired:

```json
{"status":"ok","out":"...","size_kb":525,"format":"A4","landscape":false,"attempts":2}
{"status":"retry","attempt":1,"next":2,"error":"Error: ..."}
```

If both attempts fail, the error JSON includes the final `error` and
a `hint` to either install Chromium (`npx playwright install chromium`)
or restart Edge. Auto-install of Chromium is **only** attempted on
launch failure, not on render failure — render failures are usually
transient and reinstalling Chromium would not help.

## Verify

After render, sanity-check with `pdfplumber` (Python; available via
`pip install pdfplumber`):

```python
import pdfplumber
with pdfplumber.open("out.pdf") as p:
    print(f"pages: {len(p.pages)}")
    # Confirm TOC link annotations survived
    from pypdf import PdfReader
    r = PdfReader("out.pdf")
    n_links = sum(
        1 for pg in r.pages if "/Annots" in pg
        for a in pg["/Annots"]
        if a.get_object().get("/Subtype") == "/Link"
    )
    print(f"link annotations: {n_links}")
```

For a typical 7-section + appendix layout, expect 10-15 pages and
7-10 link annotations (one per TOC entry).

## When Edge itself is missing

Rare on Windows, but possible on stripped-down Server SKUs. The next
fallback is to install `chrome-channel`:

```powershell
# If you have Google Chrome installed:
$content = $content.Replace(
  "chromium.launch({ channel: 'msedge' })",
  "chromium.launch({ channel: 'chrome' })"
)
```

If neither Edge nor Chrome is available, the only remaining path is
to actually let `npx playwright install chromium` finish. Give it a
long timeout (15+ min) and a real network — the bottleneck is usually
CDN reachability, not the tool itself.
