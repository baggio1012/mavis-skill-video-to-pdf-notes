# HTML Template for Video → PDF Notes

Use this as the structural skeleton. Fill the seven sections from the
`matrix_audios_understand` structured output (the `# 任务 2` portion).

The CSS below gives a clean business-report look (deep blue accent,
soft page-soft backgrounds for callouts, A4 portrait, 14mm/12mm
margins). Override the `--accent` variable if the user wants a
different brand color.

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>{{TITLE}}</title>
<style>
  :root {
    --accent: #1f4e79;
    --accent-light: #e8f0f8;
    --warn: #c0504d;
    --good: #4f7a28;
    --text: #222;
    --muted: #666;
    --line: #d9d9d9;
    --bg-soft: #fafafa;
  }
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans CJK SC", "Source Han Sans CN",
                 "Microsoft YaHei", "PingFang SC",
                 -apple-system, system-ui, sans-serif;
    color: var(--text); line-height: 1.65; font-size: 10.5pt;
  }
  h1, h2, h3, h4 { color: var(--accent); page-break-after: avoid;
                   margin-top: 0.6em; line-height: 1.3; }
  h1 { font-size: 24pt; margin: 0.4em 0; }
  h2 { font-size: 16pt; border-bottom: 2px solid var(--accent);
       padding-bottom: 0.2em; margin-top: 1.4em; }
  h3 { font-size: 13pt; color: var(--accent); margin-top: 1em; }
  p { margin: 0.5em 0; text-align: justify; }
  table { width: 100%; border-collapse: collapse; margin: 0.8em 0;
          font-size: 9.5pt; page-break-inside: avoid; }
  th { background: var(--accent); color: #fff; padding: 6px 8px;
       text-align: left; font-weight: 600; }
  td { padding: 5px 8px; border-bottom: 1px solid var(--line);
       vertical-align: top; }
  tr:nth-child(even) td { background: var(--bg-soft); }
  blockquote {
    border-left: 3px solid var(--accent);
    background: var(--accent-light);
    margin: 0.8em 0; padding: 0.6em 0.9em;
    border-radius: 0 4px 4px 0; color: #333;
  }
  .cover { page-break-after: always;
           height: calc(100vh - 28mm);
           display: flex; flex-direction: column;
           justify-content: space-between; padding: 1em 0; }
  .eyebrow { color: var(--accent); font-size: 11pt;
             letter-spacing: 0.1em; text-transform: uppercase; }
  .toc { page-break-after: always; }
  .toc-list { list-style: none; padding: 0; }
  .toc-list li { display: flex; justify-content: space-between;
                 padding: 0.5em 0;
                 border-bottom: 1px dotted var(--line); }
  .toc-list a { color: var(--text); text-decoration: none; }
  .toc-list .num { color: var(--accent); font-weight: 600;
                   margin-right: 0.5em; }
  .toc-list .pg { color: var(--muted);
                  font-variant-numeric: tabular-nums; }
  .section { page-break-before: always; }
  .transcript-block {
    background: var(--bg-soft);
    border-left: 3px solid var(--accent);
    padding: 0.8em 1em; margin: 0.8em 0;
    border-radius: 0 4px 4px 0;
    font-size: 10pt; line-height: 1.75;
  }
  .ts-marker {
    display: inline-block;
    background: var(--accent); color: #fff;
    padding: 1px 8px; border-radius: 10px;
    font-size: 9pt;
    font-family: "SF Mono", Consolas, "Courier New", monospace;
    margin-right: 6px;
  }
  .pill { display: inline-block;
          background: var(--accent-light); color: var(--accent);
          padding: 2px 8px; border-radius: 10px;
          font-size: 9pt; font-weight: 500; margin: 0 2px; }
  .pill.warn { background: #fde9e8; color: var(--warn); }
  .pill.good { background: #eaf3dd; color: var(--good); }
  .key-callout {
    background: linear-gradient(135deg, #f8fbff 0%, #e8f0f8 100%);
    border: 1px solid #b4c7e7;
    border-left: 4px solid var(--accent);
    padding: 0.9em 1.1em; margin: 1em 0; border-radius: 4px;
  }
  .footer-note {
    color: var(--muted); font-size: 9pt; font-style: italic;
    margin-top: 1.5em; border-top: 1px solid var(--line);
    padding-top: 0.5em;
  }
</style>
</head>
<body>

<!-- ============ Cover ============ -->
<section class="cover">
  <div>
    <div class="eyebrow">财经讲座 · 文字整理稿</div>
    <h1>{{TITLE}}</h1>
    <p style="font-size:13pt;color:var(--muted);margin:0;">
      {{SUBTITLE}}
    </p>
  </div>
  <div style="margin:3em 0;">
    <table style="font-size:11pt;border:none;">
      <tr><td style="border:none;padding:4px 12px 4px 0;color:var(--muted);width:30%;">主讲人</td>
          <td style="border:none;padding:4px 0;"><strong>{{SPEAKER}}</strong></td></tr>
      <tr><td style="border:none;padding:4px 12px 4px 0;color:var(--muted);">讲座日期</td>
          <td style="border:none;padding:4px 0;">{{DATE}}</td></tr>
      <tr><td style="border:none;padding:4px 12px 4px 0;color:var(--muted);">讲座时长</td>
          <td style="border:none;padding:4px 0;">{{DURATION}}</td></tr>
      <tr><td style="border:none;padding:4px 12px 4px 0;color:var(--muted);">视频来源</td>
          <td style="border:none;padding:4px 0;">{{SOURCE_PATH}}</td></tr>
      <tr><td style="border:none;padding:4px 12px 4px 0;color:var(--muted);">整理方式</td>
          <td style="border:none;padding:4px 0;">AI 视频理解 + 人工校对(以原讲座为准)</td></tr>
    </table>
  </div>
  <div style="font-size:9.5pt;color:var(--muted);border-top:1px solid var(--line);padding-top:0.5em;">
    本材料由 Minvis(MiniMax-M3)辅助整理自原视频讲座,核心观点、具体数据、人名机构名均以原讲座为准。
    讲座中提及的投资观点仅代表主讲人立场,不构成投资建议。
  </div>
</section>

<!-- ============ TOC ============ -->
<section class="toc">
  <h2>目录 / Contents</h2>
  <ul class="toc-list">
    <li><a href="#sec-overview"><span><span class="num">01</span>讲座主题与背景</span><span class="pg">3</span></a></li>
    <li><a href="#sec-keypoints"><span><span class="num">02</span>核心观点</span><span class="pg">4</span></a></li>
    <li><a href="#sec-data"><span><span class="num">03</span>关键数据 · 政策 · 事件</span><span class="pg">5</span></a></li>
    <li><a href="#sec-stance"><span><span class="num">04</span>嘉宾立场与分歧</span><span class="pg">7</span></a></li>
    <li><a href="#sec-action"><span><span class="num">05</span>行动建议</span><span class="pg">8</span></a></li>
    <li><a href="#sec-track"><span><span class="num">06</span>待追踪话题</span><span class="pg">9</span></a></li>
    <li><a href="#sec-transcript"><span><span class="num">07</span>讲座逐字稿</span><span class="pg">10</span></a></li>
    <li><a href="#sec-disclaimer"><span><span class="num">08</span>附录:免责声明</span><span class="pg">12</span></a></li>
  </ul>
</section>

<!-- ============ Section template (repeat per section) ============ -->
<section class="section" id="sec-{{SLUG}}">
  <h2>{{SECTION_NUMBER}} · {{SECTION_TITLE}}</h2>
  {{SECTION_BODY}}
</section>

</body>
</html>
```

## Section-by-section fill rules

- **Cover** — pull title / speaker / date / duration from the audio
  intro. If the speaker never says a date, leave it blank or use the
  file's mtime.
- **TOC** — page numbers in the template are educated guesses; verify
  after render and patch once if they are off by more than 1.
- **01 主题与背景** — copy from the `# 1. 讲座主题与背景` block in the
  ASR output. Usually 2-3 sentences.
- **02 核心观点** — 6-10 bullet points from `# 2. 核心观点`. Use
  `<span class="pill">` for inline numbers and `<span class="pill warn">`
  for risk / negative signals.
- **03 关键数据** — re-shape the bullet list under `# 3. 关键数据` into
  one or two tables (column layout: 类别 / 名称 / 数值 / 备注).
  `<table>` is the right primitive here.
- **04 嘉宾立场** — the comparison table from `# 4. 嘉宾立场与分歧` is
  already a good fit for `<table>`. Keep the column header pattern:
  `议题 / 主讲人立场 / 市场主流 / 分歧焦点`.
- **05 行动建议** — numbered `<ol>` from `# 5. ... 启示 / 行动建议`.
- **06 待追踪** — `<ul>` from `# 6. 值得继续追踪`.
- **07 逐字稿** — for each `[hh:mm]` marker in the ASR output, emit a
  `<h3><span class="ts-marker">[hh:mm]</span>{{TITLE}}</h3>` followed
  by a `<div class="transcript-block">` containing the verbatim
  paragraph(s). Preserve the original phrasing; do not paraphrase.
- **08 附录** — write 整理流程 + 免责声明 yourself, do not copy from
  the ASR. The disclaimer is non-negotiable: investment views are the
  speaker's, not the AI's, and AI-transcribed names may be inaccurate.

## Common pitfalls

- **TOC page numbers are wrong after the first render**. Render once,
  inspect, and patch. Do not over-engineer a page-count predictor.
- **`<h1>` on the cover + a `margin-top: 0.6em` in the CSS** will push
  the title down. Override the cover's `h1 { margin-top: 0 }` if it
  looks low.
- **Verbatim transcript in a single `<div>` runs across multiple
  pages** without a section break. Split it on `[hh:mm]` markers so
  each becomes its own `<section class="section">` for clean
  page-break-before behavior.
- **Empty placeholder `{{...}}` strings** end up in the PDF if you
  forget to fill them. Grep the rendered HTML for `{{` before
  rendering.
