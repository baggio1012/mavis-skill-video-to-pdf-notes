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

## 依赖

| 依赖 | 来源 |
|---|---|
| `imageio-ffmpeg`(含 ffmpeg.exe) | `pip install imageio-ffmpeg` |
| Microsoft Edge | Windows 10/11 预装 |
| mavis daemon + matrix MCP | 由 Mavis 框架提供 |
| Edge 渲染需要 Playwright | `npm install -g playwright` |

## License

MIT
