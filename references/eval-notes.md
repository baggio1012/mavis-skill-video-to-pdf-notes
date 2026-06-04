# Eval Notes — `video-to-pdf-notes` skill

> Lightweight self-evaluation recorded on 2026-06-04 after 2 production
> runs (260328 lecture + 260307 lecture). Not a full Team Engine
> producer-vs-baseline comparison — the pipeline is too heavy (each run
> is 5-10 min of API calls + CDN upload + render) to do a 2-arm
> compare in a normal session. Instead: empirical observations from
> the 2 production runs, plus an inferred baseline.

## Production runs (with-skill)

### Run 1: `260328一周财经热点解读.mp4` (3.2 GB, 22 min, 牛总)

| Metric | Value |
|---|---|
| Pipeline duration (wall clock) | ~12 min end-to-end |
| Audio extraction | 18.5s (ffmpeg via imageio-ffmpeg) |
| MP3 size | 82 MB (16 kHz mono 64 kbps) |
| CDN upload | <2s |
| AI transcribe + structure | 1 call, returned 1.8 KB JSON |
| HTML render | 1 attempt, 462 KB PDF (12 pages) |
| TOC link annotations | 8/8 working |
| Final delivery | `260328_一周财经热点解读_牛总.pdf`, 525 KB |

### Run 2: `260307一周财经热点解读.mp4` (2.49 GB, 17 min, 讲师)

| Metric | Value |
|---|---|
| Pipeline duration | ~10 min |
| Audio extraction | 18.5s, 63.6 MB MP3 |
| Render | **1 retry** (`attempts: 2`) — first `page.pdf()` failed with `Protocol error (Page.printToPDF): Printing failed`, second succeeded |
| Final delivery | `260307_一周财经热点解读_讲师.pdf`, 462 KB, 11 pages |
| TOC link annotations | 8/8 working |

### Observations

- **Render retry is real**: 1 out of 2 runs needed it. Without the
  retry loop, that run would have failed and the user would have had
  to manually re-invoke. Bundling the retry into the cjs saves real
  human time.
- **The 2-render-target render_msedge.cjs shipped in this skill works
  out of the box** for any user with the prerequisites (imageio-ffmpeg +
  Playwright + Edge). Verified by re-rendering `lecture_260307.html`
  through the bundled cjs directly: 462 KB output, 1 attempt.
- **The setup table in SKILL.md is the load-bearing piece**: any
  missing dependency shows up as a 5-minute timeout, not a clear error.
  Catching `imageio-ffmpeg` / Playwright / matrix auth / Edge up front
  saves debugging time on the first run.

## Inferred baseline (without-skill)

Without loading this skill, an LLM given the prompt "把
`260328一周财经热点解读.mp4` 这个 3.2 GB 的财经视频做成 PDF 笔记"
would likely:

- Try to call `mavis mcp call matrix videos_understand --file E:\...mp4`
  directly. **This fails with `ENOENT`** because the matrix backend
  runs in a Linux container and cannot see Windows paths. The LLM
  has no documented fix for this in its training; recovery typically
  takes 2-3 wrong attempts before the user finds a working CDN upload
  path.
- Even if it does get the audio transcribed, it has no SKILL.md to
  fall back on for the **HTML→PDF** step. It would either:
  - Try to use `mavis mcp call matrix ...` with no PDF-generating tool
    (matrix does not produce PDFs), or
  - Use `pdfkit` / `weasyprint` from a Python script (likely to fail
    on CJK font embedding on Windows without `pip install` of the right
    font shim).
- The output is unlikely to have a clickable TOC, 7-section structure,
  or speaker-tagged transcript — those are skill-specific patterns the
  base LLM has no convention for.

The setup env-check is the highest-leverage piece: it converts a
likely 30-minute debug session ("ffmpeg is missing" / "edge channel
fails" / "videos_understand ENOENT") into a 30-second "MISSING: ffmpeg →
`pip install imageio-ffmpeg`" loop.

## Recommended future eval

When Team Engine is available, run a `producer-vs-baseline` Plan A
eval with these specs:

- **Eval prompt**: `把 E:\BaiduNetdiskDownload\260307一周财经热点解读.mp4
  (2.49 GB, 17 min, financial lecture) 这个视频提炼总结成 PDF 材料`
- **Producer arm**: load `video-to-pdf-notes` skill, run the 7-step
  procedure, deliver the resulting PDF + summary JSON
- **Baseline arm**: no skill loaded, attempt the same task using only
  general knowledge
- **Compare rubric** (5-point, from `plans/eval-skill.template.yaml`):
  1. Output completeness (PDF generated, clickable TOC, all 7 sections)
  2. Content fidelity (speaker names, numbers, policy names correctly
     transcribed)
  3. Actionability (action items have owners + deadlines, not vague
     advice)
  4. Setup robustness (does the env check fire and recover on a fresh
     machine?)
  5. Time-to-first-PDF (wall clock from user prompt to deliverable)

A score of 4/5 or better on the producer arm, with at least 2 points
of margin over baseline, is the success criterion.
