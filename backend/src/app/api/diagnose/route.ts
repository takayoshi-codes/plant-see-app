import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { supabaseAdmin } from "@/lib/supabase"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

const SYSTEM_PROMPT = `You are a plant expert AI. Analyze the plant photo and respond ONLY in this exact JSON format with no other text:
{
  "plant_name": "plant common name in Japanese",
  "scientific_name": "scientific name",
  "confidence": integer 0 to 100,
  "family": "family name in Japanese",
  "condition": {
    "overall": "one of: 良好 or 注意 or 要処置",
    "issues": [],
    "disease": null
  },
  "care_advice": {
    "watering": "watering advice in Japanese",
    "sunlight": "sunlight advice in Japanese",
    "fertilizer": "fertilizer advice in Japanese",
    "immediate_action": null
  },
  "season_tip": "seasonal tip in Japanese",
  "recipe": "If this is a herb, vegetable, or edible plant, suggest 1-2 recommended ways to eat or cook it in Japanese. If not edible, return null"
}`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const imageFile = formData.get("image") as File | null
    const mimeType = (formData.get("mimeType") as string) ?? "image/jpeg"
    const season = (formData.get("season") as string) ?? "spring"
    const location = (formData.get("location") as string) ?? "indoor"
    const userId = formData.get("userId") as string | null

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const arrayBuffer = await imageFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    const result = await model.generateContent([
      { inlineData: { mimeType: mimeType, data: base64 } },
      `${SYSTEM_PROMPT}\n\nDiagnose this plant. Season: ${season}, Location: ${location}`,
    ])

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

    if (userId) {
      const imageBuffer = Buffer.from(arrayBuffer)
      const fileName = `${userId}/${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("plant-images")
        .upload(fileName, imageBuffer, { contentType: mimeType, upsert: false })

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
