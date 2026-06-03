---
name: video-to-pdf-notes
description: |
  Turn a local video file (lecture / meeting / course / 公开课) into a
  structured PDF study notes document. Pipeline: extract audio with ffmpeg →
  upload to Matrix CDN → AI understand + transcribe → render HTML→PDF with
  Edge (or Chromium) → TOC + cover + verbatim transcript + key data + action
  items. Load this skill when the user provides a local video path and asks
  to "做成 PDF 笔记", "总结成 PDF", "提炼为 PDF 材料", "video to notes",
  "把这段讲座做成 PDF", or names an .mp4 / .mkv / .mov and asks for a
  document. Do NOT use for: pure audio transcription without PDF (use
  matrix_transcribe_audio directly), text-to-PDF where source is already
  written notes (use minimax-pdf reformat), industry research without source
  video (use industry-research-report), or PPT output (use
  html-presentation-generator).
---

# Video → PDF Notes

## Inputs to collect

Ask the user up front — do not guess:

- **Video file absolute path** (e.g. `E:\BaiduNetdiskDownload\xxx.mp4`).
  Cloud-drive paths (百度网盘 / 阿里云盘 / OneDrive) are fine as long as the
  file is already downloaded locally.
- **Content type** — drives PDF structure and ASR prompt shape:
  - `lecture` / `course` / `公开课` (one speaker, knowledge-heavy) → use the
    default 7-section outline below.
  - `meeting` / `panel` (multi-speaker, decisions, action items) → add
    "decision log" + per-speaker stance to the ASR prompt.
  - `movie` / `documentary` / `动画` → flag it: audio is not the main
    signal, default pipeline is wrong; route to `minimax-vision` or
    `videos_understand` directly.
- **Optional**: target PDF length (default 10-15 pages A4), accent color,
  language (default zh-CN).

Skip this section if the user has already given path + type in the request.

## Setup (one-time, before first run)

This skill pulls in four external tools. Verify each one before running the
pipeline; install the missing ones. Run these on the host where mavis
daemon is running (Windows / macOS / Linux all work; commands shown are
the Windows / PowerShell variant — translate `&&` to `;` for PowerShell 5.1
or use the bash equivalent on macOS / Linux).

| # | Dependency | Check | Install if missing |
|---|---|---|---|
| 1 | **ffmpeg** | `python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"` (must print a path to `ffmpeg-*.exe`) | `pip install imageio-ffmpeg` (Windows-friendly fallback; see `references/ffmpeg-path.md` for why this beats `winget install`) |
| 2 | **python3 shim** (Windows only) | `where python3` — must NOT point at the Microsoft Store stub under `WindowsApps` | If only `python.exe` is in `C:\Program Files\Python312\`, create a copy at `%USERPROFILE%\bin\python3.exe` and prepend `%USERPROFILE%\bin` to the user PATH |
| 3 | **Playwright** (Node.js ≥ 18) | `node -e "require('playwright')"` (must exit 0) | `npm install -g playwright` (do **not** also run `npx playwright install chromium` — we will use the preinstalled Edge instead) |
| 4 | **Microsoft Edge** (Windows 10/11) | `Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"` (must be True) | Preinstalled on every Windows 10/11 box; if missing, install via `winget install Microsoft.Edge` or download from microsoft.com |
| 5 | **Matrix MCP auth** | `mavis mcp auth status matrix` (must show `authenticated`) | `mavis mcp auth login matrix` — the matrix MCP server is the only one that needs the user's own login; everything else uses the daemon's shared credentials |

Run this check once at the start of a session; do not re-run per PDF.

```powershell
# Quick env check (run from a PowerShell prompt)
$checks = @{
  'ffmpeg'          = { python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())" 2>$null }
  'playwright'      = { node -e "require('playwright')" 2>$null }
  'edge'            = { Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" }
  'matrix auth'     = { mavis mcp auth status matrix 2>$null | Select-String "authenticated" }
}
foreach ($k in $checks.Keys) { Write-Host ("{0,-14} {1}" -f $k, (& $checks[$k] ? "OK" : "MISSING")) }
```

If any line prints `MISSING`, install that one component and re-run the
check. Once all four are green, the rest of the pipeline will just work.

## Procedure

0. **Pre-flight env check** (5 seconds — only if Setup was not run in the
   current session; skip otherwise).
   Why: a missing dep usually surfaces as a cryptic 2-minute timeout
   later in the pipeline. Catching it here saves debugging time.

1. **Locate and verify the file**.
   `Get-ChildItem -Path '<path-glob>' -File | Select-Object FullName, Length`.
   A real local lecture is usually 1-6 GB mp4, 30 min - 3 hours. If the file
   is not on the local filesystem (cloud-only), tell the user to download
   it first — do not try to stream from a web URL.

2. **Extract audio to 16 kHz mono MP3 (64 kbps)**. Use ffmpeg from
   `imageio-ffmpeg` (see `references/ffmpeg-path.md` for why this beats
   `winget install` and `winget` on Windows). One command:

   ```powershell
   $ff = python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"
   & $ff -hide_banner -loglevel warning -y `
       -i "<input.mp4>" -vn -ac 1 -ar 16000 -b:a 64k "<output.mp3>"
   ```

   A 3 GB mp4 with ~22 min of speech lands at ~80 MB mp3 in <30 s. The
   reason for these specific args: 16 kHz is the standard ASR sample rate
   (any higher is wasted), mono is fine for a single speaker, 64 kbps mp3
   keeps consonants audible without ballooning size.

3. **Upload to Matrix CDN**. The matrix MCP backend runs in a Linux
   container, so passing a Windows path like `E:\foo.mp4` directly to
   `videos_understand` returns `ENOENT`. Use `matrix_upload_to_cdn` first:

   ```powershell
   mavis mcp call matrix matrix_upload_to_cdn --file <args.json>
   ```

   where `<args.json>` contains `{"file_path": "C:\\...\\audio.mp3"}`
   (double-escape backslashes). Capture the returned `cdn_url`.

4. **AI transcribe + structure-summarize in one shot**. Use
   `matrix_audios_understand` with the prompt in
   `references/asr-prompt.md`. This is more efficient than a separate
   `transcribe_audio` + manual structuring pass — one model call returns
   both the verbatim transcript (with timestamp anchors) and a 6-section
   structured summary. Pass the `cdn_url` from step 3, not a Windows path.

5. **Build the HTML for PDF rendering**. Use the template in
   `references/html-template.md`. Inject the structured output from step 4
   into the 7 sections:
   1. Cover (title / speaker / date / duration / source path)
   2. TOC (clickable anchors — see `references/html-template.md` §TOC)
   3. Background + main topics
   4. Key points (bullets, 6-10)
   5. Key data / policy / events (tables)
   6. Stance & disagreement (table comparing viewpoints)
   7. Action items for the reader (numbered list)
   8. Verbatim transcript split by `[hh:mm]` markers
   9. Appendix: pipeline notes + disclaimer

6. **Render HTML → PDF**. Use the `minimax-pdf` skill. The bundled
   `render_html.cjs` defaults to Chromium which may not be installed; on
   Windows fall back to Edge with the `channel: 'msedge'` shim in
   `references/edge-render.md`. Verify after render:
   `pdfinfo` or `pdfplumber.open(...)` to confirm page count and that the
   TOC link annotations are present (`/Annots` with `/Subtype /Link`).

7. **Verify page count vs hand-written TOC numbers**. Iterate once if the
   TOC points to wrong pages (the rendered page count usually differs by
   1-2 from your draft estimate).

## Output contract

- One PDF file, A4, default 10-15 pages, language zh-CN unless user said
  otherwise.
- File naming: `<basename>_notes.pdf` next to the input video if writable,
  else in the active workspace directory.
- Required contents: cover, clickable TOC, verbatim transcript (with time
  markers), key data table, action items, appendix with disclaimer.
- Required PDF mechanics: clickable TOC links (not just text), no blank
  pages, real CJK glyphs (no `?` boxes from missing fonts).

## Failure handling

- **`winget install ffmpeg` hangs or fails on Windows**: do not retry;
  switch to `imageio-ffmpeg` (see `references/ffmpeg-path.md`). The
  download-via-github-release path is unreliable behind most Chinese
  proxies; `pip install imageio-ffmpeg` is the proven route.
- **`videos_understand` returns `ENOENT` on a Windows path**: the matrix
  backend cannot see Windows drives. Always go through
  `matrix_upload_to_cdn` first; pass `cdn_url` to the audio / video
  understand tools.
- **Edge channel launch fails in `render_html.cjs`**: check
  `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` exists.
  If not, install Edge or fall back to `channel: 'chrome'` (requires
  Google Chrome).
- **Audio extraction runs but output is silent / corrupt**: the input
  likely uses a codec `imageio-ffmpeg`'s build doesn't include. Re-encode
  with explicit codec flags: `-c:a libmp3lame -ar 16000 -ac 1`.
- **ASR returns very short / nonsense transcript**: the audio might be
  music-only or heavily accented. Re-prompt the user; do not auto-fall-back
  to guessing content.
- **`videos_understand` upload times out on a multi-GB file**: that's
  the wrong tool for very large videos. The right path is the
  extract-audio-first pipeline above; never upload the raw video to CDN
  unless the user explicitly asks and the file is <500 MB.

## Examples

### Canonical

Input: `E:\BaiduNetdiskDownload\260328一周财经热点解读.mp4` (3.2 GB, 22 min,
financial lecture by "牛总").

Output: `C:\Users\66623\.mavis\agents\mavis\workspace\260328_一周财经热点解读_牛总.pdf`
(12-page A4, ~525 KB, clickable TOC, verbatim transcript with 7
`[hh:mm]` markers, 3 data tables, 5-item action list, disclaimer
appendix).

### One-liner edge case

Input: 用户在 1 小时前录的腾讯会议录像,50 分钟,4 个参会人,要做会议纪要 PDF.

Output: pipeline above with one prompt change — replace the default
"lecture" prompt in `references/asr-prompt.md` with the meeting variant
(decision log + per-speaker stance); otherwise identical.
