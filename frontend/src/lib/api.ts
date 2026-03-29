export interface DiagnoseResult {
  plant_name: string
  scientific_name: string
  confidence: number
  family: string
  condition: {
    overall: "ó«çD" | "íçà”" | "óvèàíu"
    issues: string[]
    disease: string | null
  }
  care_advice: {
    watering: string
    sunlight: string
    fertilizer: string
    immediate_action: string | null
  }
  season_tip: string
}

export interface Plant {
  id: string
  name: string
  scientific_name: string | null
  last_diagnosis_at: string | null
  watering_interval_days: number
  next_watering_at: string | null
  condition_overall?: string
}

export function getCurrentSeason(): "èt" | "âƒ" | "èH" | "ì~" {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return "èt"
  if (month >= 6 && month <= 8) return "âƒ"
  if (month >= 9 && month <= 11) return "èH"
  return "ì~"
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001"

export async function diagnoseImage(params: {
  imageUri: string
  mimeType?: string
  location: "é∫ì‡" | "âÆäO"
  userId?: string
}): Promise<{ result?: DiagnoseResult; needsRetake?: boolean; message?: string }> {
  const mimeType = (params.mimeType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp"

  const formData = new FormData()
  formData.append("image", {
    uri: params.imageUri,
    type: mimeType,
    name: "plant.jpg",
  } as any)
  formData.append("mimeType", mimeType)
  formData.append("season", getCurrentSeason())
  formData.append("location", params.location)
  if (params.userId) formData.append("userId", params.userId)

  const res = await fetch(`${API_URL}/api/diagnose`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "êfífÇ…é∏îsÇµÇ‹ÇµÇΩ")
  }
  return res.json()
}

export async function fetchPlants(userId: string): Promise<Plant[]> {
  const res = await fetch(`${API_URL}/api/plants?userId=${userId}`)
  if (!res.ok) throw new Error("êAï®àÍóóÇÃéÊìæÇ…é∏îsÇµÇ‹ÇµÇΩ")
  const data = await res.json()
  return data.plants ?? []
}

export async function registerPlant(params: {
  userId: string
  plantName: string
  scientificName?: string
  wateringIntervalDays?: number
  diagnosisId?: string
}): Promise<Plant> {
  const res = await fetch(`${API_URL}/api/plants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: params.userId,
      plantName: params.plantName,
      scientificName: params.scientificName,
      wateringIntervalDays: params.wateringIntervalDays ?? 7,
      diagnosisId: params.diagnosisId,
    }),
  })
  if (!res.ok) throw new Error("êAï®ÇÃìoò^Ç…é∏îsÇµÇ‹ÇµÇΩ")
  const data = await res.json()
  return data.plant
}
