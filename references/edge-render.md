# Edge Fallback for `render_html.cjs`

The `minimax-pdf` skill ships `scripts/render_html.cjs` which uses
Playwright's `chromium.launch()` by default. If Chromium is not
installed (the typical situation — `npx playwright install chromium`
downloads 150+ MB and often stalls), the script auto-runs the install
and re-tries. When that also fails, the only stable alternative on
Windows is to launch **Microsoft Edge** (preinstalled on every
Windows 10/11 box) via Playwright's `channel: 'msedge'`.

## One-line shim

Copy `render_html.cjs` to a working directory, then patch both
`chromium.launch()` call sites to pass `{ channel: 'msedge' }`:

```powershell
Copy-Item `
  "$env:USERPROFILE\.mavis\.builtin-skills\minimax-pdf\scripts\render_html.cjs" `
  "$env:USERPROFILE\.mavis\agents\mavis\workspace\render_msedge.cjs"

$content = Get-Content "$env:USERPROFILE\.mavis\agents\mavis\workspace\render_msedge.cjs" -Raw
$content = $content.Replace(
  'chromium.launch()',
  "chromium.launch({ channel: 'msedge' })"
)
Set-Content -Path "$env:USERPROFILE\.mavis\agents\mavis\workspace\render_msedge.cjs" `
           -Value $content -Encoding UTF8
```

## Run

```powershell
node "$env:USERPROFILE\.mavis\agents\mavis\workspace\render_msedge.cjs" `
     --in "page.html" --out "out.pdf" --format A4 --margin "14mm 12mm" --wait 3000
```

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
