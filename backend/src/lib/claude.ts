import Anthropic from '@anthropic-ai/sdk'
import { DiagnoseRequest, DiagnoseResult } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const SYSTEM_PROMPT = `あなたは植物の専門家AIです。ユーザーが送信した植物の写真を分析し、
必ず以下のJSON形式のみで回答してください。前置きや説明は不要です。マークダウンのコードブロックも不要です。

{
  "plant_name": "植物の一般名（日本語）",
  "scientific_name": "学名",
  "confidence": 0から100の整数,
  "family": "科名",
  "condition": {
    "overall": "良好 または 注意 または 要処置",
    "issues": ["問題点1", "問題点2"],
    "disease": "病気名またはnull"
  },
  "care_advice": {
    "watering": "水やりのアドバイス（1〜2文）",
    "sunlight": "日照のアドバイス（1〜2文）",
    "fertilizer": "肥料のアドバイス（1〜2文）",
    "immediate_action": "今すぐやること（緊急度が高い場合のみ、なければnull）"
  },
  "season_tip": "現在の季節に合わせたワンポイントアドバイス"
}`

export async function diagnoseWithClaude(req: DiagnoseRequest): Promise<DiagnoseResult> {
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: req.mimeType,
              data: req.imageBase64,
            },
          },
          {
            type: 'text',
            text: `この植物を診断してください。\n現在の季節: ${req.season}\n撮影環境: ${req.location}`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // JSONパース（コードブロックが混入した場合の除去も含む）
  const cleaned = text.replace(/```json\n?|```\n?/g, '').trim()
  const result: DiagnoseResult = JSON.parse(cleaned)
  return result
}
