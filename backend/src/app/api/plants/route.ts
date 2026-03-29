import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// マイ植物一覧取得
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId が必要です' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('plants')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plants: data })
}

// 植物を新規登録
export async function POST(req: NextRequest) {
  try {
    const { userId, plantName, scientificName, wateringIntervalDays, diagnosisId } = await req.json()

    if (!userId || !plantName) {
      return NextResponse.json({ error: 'userId と plantName が必要です' }, { status: 400 })
    }

    const nextWateringAt = new Date()
    nextWateringAt.setDate(nextWateringAt.getDate() + (wateringIntervalDays ?? 7))

    const { data, error } = await supabaseAdmin
      .from('plants')
      .insert({
        user_id: userId,
        name: plantName,
        scientific_name: scientificName ?? null,
        last_diagnosis_id: diagnosisId ?? null,
        last_diagnosis_at: diagnosisId ? new Date().toISOString() : null,
        watering_interval_days: wateringIntervalDays ?? 7,
        next_watering_at: nextWateringAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plant: data })
  } catch (error) {
    console.error('Plants POST error:', error)
    return NextResponse.json({ error: '植物の登録に失敗しました' }, { status: 500 })
  }
}
