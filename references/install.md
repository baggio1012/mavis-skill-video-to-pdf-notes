# video-to-pdf-notes (mavis skill)

把本地视频(讲座 / 会议 / 课程)一键转写为带目录、逐字稿、关键数据表和行动建议的 PDF 笔记。

## 在 MiniMax Code 客户端使用

1. 打开 **MiniMax Code** 桌面 / Web 客户端
2. 左侧点 **"技能"** → **"市场"** → 右上 **"+ 创建"**
3. 选 **"从 GitHub 导入"**,粘贴本仓库 URL:
   ```
   https://github.com/baggio1012/mavis-skill-video-to-pdf-notes
   ```
4. 等待 1-2 分钟导入完成,即可在"我的"里使用

## 触发关键词

- "把这个视频做成 PDF 笔记"
- "总结成 PDF 材料"
- "video to notes / 把讲座做成 PDF"
- 给一个 `.mp4` / `.mkv` 路径 + "总结" / "做笔记"

## 流水线

```
本地 mp4 → ffmpeg(16kHz mono mp3) → matrix CDN → AI 转写 + 结构化总结
       → HTML 模板 → Edge 渲染 → PDF(带可点击目录)
```

详细步骤见 `SKILL.md`,各环节的工程细节见 `references/`。

## 依赖(首次使用前运行 Setup)

| # | 依赖 | 检查命令 | 安装命令 |
|---|---|---|---|
| 1 | ffmpeg(通过 `imageio-ffmpeg`) | `python -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"` | `pip install imageio-ffmpeg` |
| 2 | python3 shim(Windows only) | `where python3`(必须不是 Microsoft Store 的桩) | 见 `references/ffmpeg-path.md` |
| 3 | Playwright | `node -e "require('playwright')"` | `npm install -g playwright`(**不**要跑 `npx playwright install chromium`,我们用 Edge) |
| 4 | Microsoft Edge | `Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"` | Windows 10/11 预装,缺失则 `winget install Microsoft.Edge` |
| 5 | Matrix MCP 认证 | `mavis mcp auth status matrix`(必须 `authenticated`) | `mavis mcp auth login matrix` |

所有 5 项 `OK` 后,本仓库代码即可一键运行。

## License

MIT
