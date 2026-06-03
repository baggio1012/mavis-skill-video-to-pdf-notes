# ASR Prompt Templates for `matrix_audios_understand`

The shape of the prompt drives what comes back. The default "lecture"
prompt gets you a verbatim transcript with time markers + a 6-section
structured summary in one call. Switch the variant when the source
content type changes.

## Lecture / course / 公开课 (default)

```text
这是一段中文{讲座/课程/演讲}的音频(约 {N} 分钟)。请按下面要求完成两件事:

【任务 1:逐字稿(verbatim transcript)】
完整转录全部语音内容,逐字不漏。如果有多个说话人(主持人/嘉宾/讲师),
标注【主持人】、【嘉宾A】、【嘉宾B】等。
如果能标注大致时间戳(每 2-5 分钟一个标记)更好,格式如 [00:00] [02:15] [04:30] ...。

【任务 2:结构化总结】
在逐字稿之后,输出以下内容:

## 1. 讲座主题与背景
用 2-3 句话说明这是讲什么的、为什么在这个时点讲。

## 2. 核心观点(6-10 条 bullet)
按重要性或时间顺序列出。每条 bullet 一句话,清晰可独立理解。

## 3. 关键数据 / 政策 / 事件
列出所有提到的具体数字(百分比、金额、规模)、政策名称、机构名、人名、事件名。保留原文用语。

## 4. 嘉宾立场与分歧(如果多嘉宾)
每位嘉宾的核心观点 + 他们之间的分歧点(如果有)。

## 5. 给普通投资者的启示 / 行动建议
讲座里给到读者的具体可执行建议。

## 6. 值得继续追踪的话题
未来 1-3 个月值得继续关注的事件/数据/政策。

请用中文回答,语言专业但好懂。这份材料会直接做成 PDF 报告。

注意:讲座可能涉及投资观点,请忠实转述,不要添加你自己对市场的看法。
```

## Meeting / panel / 多 speaker

Replace 任务 2 with:

```text
## 1. 会议概述
时间、与会人、议题、决议总数。

## 2. 决策清单(decision log)
每条决策一行:决策内容 + 决策人 + 截止时间(如有)。

## 3. 行动项(action items)
每条:负责人 + 任务 + 截止时间 + 当前状态(如有)。

## 4. 关键讨论点
按议题分组,每组列出正反观点和最终倾向。

## 5. 风险与未解决问题
明确说"悬而未决"的事项,不要替会议下结论。

## 6. 后续追踪
需要在下次会议前确认/汇报的事项。
```

## Movie / 纪录片 (rare — usually not the right tool)

For narrative / visual content, the audio-only `audios_understand`
loses critical signal. Stop here and tell the user: "this is not the
right pipeline — use `videos_understand` directly to capture both audio
and visual frames."

## Sending the request

Use `mavis mcp call matrix matrix_audios_understand --file <args.json>`
where `<args.json>` looks like:

```json
{
  "audio_info": [
    {
      "url": "<cdn_url from matrix_upload_to_cdn>",
      "prompt": "<one of the prompts above>"
    }
  ]
}
```

Do **not** pass a Windows path (`E:\foo.mp3`) as `file` — the matrix
backend runs in a Linux container and will return `ENOENT`. Always go
through CDN upload first; pass the `cdn_url` as `url`.

## Common output failures

- **Transcript cuts off mid-sentence** at ~5 min mark: the audio is
  longer than the model's effective context. Re-upload a single slice
  (e.g. first 5 min, then second 5 min) and stitch the transcripts in
  post-processing.
- **Names rendered as pinyin or homophones** ("齐感摩尔" → "齐干莫尔"):
  expected. Cross-check with the source video before publishing the
  PDF; add a note in the appendix that names are AI-transcribed.
- **No timestamp markers in the output**: the model decided the audio
  had no clear section breaks. Add "请在每 3 分钟处插入 [hh:mm] 标记"
  to the prompt and retry.
