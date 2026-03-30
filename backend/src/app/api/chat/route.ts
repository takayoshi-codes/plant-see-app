import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

export async function POST(req: NextRequest) {
  try {
    const { question, diagnosis, history } = await req.json()

    const context = `
あなたは植物の専門家AIです。以下の診断結果をもとに、ユーザーの質問に日本語で丁寧に答えてください。

【診断結果】
植物名: ${diagnosis.plant_name}（${diagnosis.scientific_name}）
科名: ${diagnosis.family}
生育状況: ${diagnosis.condition.overall}
${diagnosis.condition.disease ? `病気: ${diagnosis.condition.disease}` : ""}
水やり: ${diagnosis.care_advice.watering}
日照: ${diagnosis.care_advice.sunlight}
肥料: ${diagnosis.care_advice.fertilizer}
${diagnosis.care_advice.immediate_action ? `緊急対応: ${diagnosis.care_advice.immediate_action}` : ""}
季節のアドバイス: ${diagnosis.season_tip}
${diagnosis.recipe ? `食べ方: ${diagnosis.recipe}` : ""}
`

    const historyText = history.length > 0
      ? "\n【これまでの会話】\n" + history.map((m: { role: string; content: string }) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`).join("\n")
      : ""

    const prompt = `${context}${historyText}\n\n【ユーザーの質問】\n${question}`

    const result = await model.generateContent(prompt)
    const answer = result.response.text()

    return NextResponse.json({ answer })
  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json({ answer: "エラーが発生しました。もう一度お試しください。" }, { status: 500 })
  }
}
