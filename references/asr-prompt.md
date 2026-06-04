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

Use the full prompt below when the source has multiple speakers (a
recorded Tencent Meeting / Zoom call, a panel discussion, a round-table
podcast). The meeting variant differs from the lecture variant in two
ways: 任务 1 must label each speaker turn, and 任务 2 emphasises
decisions and action items over abstract analysis.

```text
这是一段中文会议录像(约 {N} 分钟,共 {M} 位发言人)。请按下面要求完成两件事:

【任务 1:逐字稿(verbatim transcript)】
完整转录全部发言,逐字不漏。每段发言前用说话人标签区分,如:
【主持人】、【嘉宾A】、【嘉宾B】、【记录人】。
如果同一段发言跨越多个议题,用空行分段并标注议题。
尽量标注大致时间戳(每 2-5 分钟一个),格式如 [00:00] [02:15] [04:30] ...。

【任务 2:结构化会议纪要】
在逐字稿之后,输出以下内容:

## 1. 会议概述
- 会议名称(如有) / 推断的会议类型
- 时间(如能推断出)
- 与会人(按角色:主持 / 嘉宾 / 记录人 等)
- 议题清单(2-5 个)
- 关键决议 / 行动项总数

## 2. 决策清单(decision log)
每条决策一行,严格使用以下格式:
  - [决议] 决策内容
    决策人: {name}
    截止: {date 或 "无明确截止"}
    类型: {战略 / 战术 / 流程 / 人事}

如果会议中只讨论未决议,标记为 [讨论] 而非 [决议]。

## 3. 行动项(action items)
每条行动项一行,严格使用以下格式:
  - [行动] 任务描述
    负责人: {name}
    截止: {date}
    状态: {新派 / 进行中 / 阻塞 / 完成(需证据)}
    依赖: {依赖的其他行动项或外部条件,如有}

如果某条行动项缺负责人,标记为 [行动-无主] 并在末尾汇总,不要替会议指定人选。

## 4. 关键讨论点
按议题分组,每组列出:
- **议题 X:{议题名称}**
  - 主要观点: ...
  - 反对 / 不同意见: ...
  - 最终倾向: ...(或"未达成共识")

## 5. 风险与未解决问题
明确说"悬而未决"的事项,不要替会议下结论。每条:
- 风险: ...
- 当前状态: ...
- 需要谁 / 什么时候再确认: ...

## 6. 后续追踪
需要在下次会议前确认 / 汇报的事项,按时间顺序排。

请用中文回答,语言专业但好懂。这份材料会直接做成 PDF 报告,会被发给没参会的人看。
```

Key differences vs the lecture variant:

- The meeting variant **mandates speaker labels** in 任务 1 — the
  reader can't follow who's saying what without them.
- 任务 2 强制每条决策 / 行动项有 "谁、什么时候" 字段,便于直接抄
  进 PDF 的表格列。
- 加了一个 [行动-无主] 标记,防止模型瞎补负责人。
- "请用中文回答... 会被发给没参会的人看" 是关键 prompt 信号,
  让模型倾向于写出 context-complete 的内容,不依赖 speaker tone
  或现场氛围。

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
