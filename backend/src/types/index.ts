// 診断リクエスト
export interface DiagnoseRequest {
  imageBase64: string
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  season: '春' | '夏' | '秋' | '冬'
  location: '室内' | '屋外'
  userId?: string
}

// 診断結果
export interface DiagnoseResult {
  plant_name: string
  scientific_name: string
  confidence: number        // 0-100
  family: string
  condition: {
    overall: '良好' | '注意' | '要処置'
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

// Supabase テーブル型
export interface Diagnosis {
  id: string
  user_id: string
  plant_name: string
  scientific_name: string
  confidence: number
  condition_overall: string
  disease: string | null
  care_advice: DiagnoseResult['care_advice']
  season_tip: string
  image_url: string | null
  created_at: string
}

export interface Plant {
  id: string
  user_id: string
  name: string
  scientific_name: string
  last_diagnosis_id: string | null
  last_diagnosis_at: string | null
  watering_interval_days: number
  next_watering_at: string | null
  notes: string | null
  created_at: string
}
