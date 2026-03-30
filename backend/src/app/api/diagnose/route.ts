import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { supabaseAdmin } from "@/lib/supabase"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

const SYSTEM_PROMPT = `You are a plant expert AI. Analyze the plant photo(s) and any environmental data provided, then respond ONLY in this exact JSON format with no other text:
{
  "plant_name": "plant common name in Japanese",
  "scientific_name": "scientific name",
  "confidence": integer 0 to 100,
  "family": "family name in Japanese",
  "condition": {
    "overall": "one of: 良好 or 注意 or 要処置",
    "summary": "1-2 sentences in Japanese explaining WHY this status was given, incorporating any environmental data if provided",
    "issues": [],
    "disease": null
  },
  "care_advice": {
    "watering": "watering advice in Japanese, considering last watered date and soil condition if provided",
    "sunlight": "sunlight advice in Japanese",
    "fertilizer": "fertilizer advice in Japanese",
    "immediate_action": null
  },
  "season_tip": "seasonal tip in Japanese",
  "recipe": "If this is a herb, vegetable, or edible plant, suggest 1-2 recommended ways to eat or cook it in Japanese. If not edible, return null",
  "recommended_products": [
    { "name": "商品カテゴリ名（日本語・簡潔に）", "keyword": "Amazon検索用キーワード（日本語）" }
  ]
}

For recommended_products: suggest 2-4 products that would genuinely help with this plant's specific condition and care needs. Examples: 液体肥料, 観葉植物の土, 土壌水分計, 殺虫剤, 植え替えセット, 霧吹き etc. Match to the actual diagnosis.`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const imageCount = parseInt((formData.get("imageCount") as string) ?? "1")
    const season = (formData.get("season") as string) ?? "spring"
    const location = (formData.get("location") as string) ?? "indoor"
    const userId = formData.get("userId") as string | null
    const temperature = formData.get("temperature") as string | null
    const humidity = formData.get("humidity") as string | null
    const lastWatered = formData.get("lastWatered") as string | null
    const soilCondition = formData.get("soilCondition") as string | null

    const imageParts: { inlineData: { mimeType: string; data: string } }[] = []
    const firstArrayBuffer: ArrayBuffer[] = []

    for (let i = 0; i < imageCount; i++) {
      const imageFile = formData.get(`image_${i}`) as File | null
      const mimeType = (formData.get(`mimeType_${i}`) as string) ?? "image/jpeg"
      if (!imageFile) continue
      const arrayBuffer = await imageFile.arrayBuffer()
      if (i === 0) firstArrayBuffer.push(arrayBuffer)
      const base64 = Buffer.from(arrayBuffer).toString("base64")
      imageParts.push({ inlineData: { mimeType, data: base64 } })
    }

    if (imageParts.length === 0) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const envInfo = [
      temperature ? `気温: ${temperature}℃` : null,
      humidity ? `湿度: ${humidity}%` : null,
      lastWatered ? `最後の水やり: ${lastWatered}` : null,
      soilCondition ? `土の状態: ${soilCondition}` : null,
    ].filter(Boolean).join(", ")

    const prompt = `${SYSTEM_PROMPT}\n\nDiagnose this plant using all ${imageParts.length} photo(s). Season: ${season}, Location: ${location}${envInfo ? `, Environmental data: ${envInfo}` : ""}`

    const result = await model.generateContent([...imageParts, prompt])

    const text = result.response.text()
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim()
    const diagnosis = JSON.parse(cleaned)

    if (diagnosis.confidence < 60) {
      return NextResponse.json({
        needsRetake: true,
        confidence: diagnosis.confidence,
        message: "別の角度や明るい場所で再撮影してください。",
      })
    }

    if (userId && firstArrayBuffer.length > 0) {
      const imageBuffer = Buffer.from(firstArrayBuffer[0])
      const fileName = `${userId}/${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("plant-images")
        .upload(fileName, imageBuffer, { contentType: "image/jpeg", upsert: false })

      let imageUrl = null
      if (!uploadError && uploadData) {
        const { data: urlData } = supabaseAdmin.storage.from("plant-images").getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }

      await supabaseAdmin.from("diagnoses").insert({
        user_id: userId,
        plant_name: diagnosis.plant_name,
        scientific_name: diagnosis.scientific_name,
        confidence: diagnosis.confidence,
        condition_overall: diagnosis.condition.overall,
        disease: diagnosis.condition.disease,
        care_advice: diagnosis.care_advice,
        season_tip: diagnosis.season_tip,
        image_url: imageUrl,
      })
    }

    return NextResponse.json({ result: diagnosis })
  } catch (error) {
    console.error("Diagnose error:", error)
    return NextResponse.json({ error: "diagnosis failed" }, { status: 500 })
  }
}
