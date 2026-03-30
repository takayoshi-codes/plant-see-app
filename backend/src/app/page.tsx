"use client"
import { useState, useRef } from "react"

interface DiagnoseResult {
  plant_name: string
  scientific_name: string
  confidence: number
  family: string
  condition: {
    overall: string
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
  recipe: string | null
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return "春"
  if (month >= 6 && month <= 8) return "夏"
  if (month >= 9 && month <= 11) return "秋"
  return "冬"
}

const PHOTO_TIPS = [
  { icon: "🌿", label: "全体像", desc: "植物全体が入るように" },
  { icon: "🍃", label: "葉（表面・裏面）", desc: "色・模様・病変を確認" },
  { icon: "🌱", label: "茎・株元", desc: "根腐れ・傷の確認に" },
  { icon: "🌸", label: "花・実", desc: "あれば識別精度が大幅UP" },
]

export default function Home() {
  const [images, setImages] = useState<{ url: string; file: File }[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [location, setLocation] = useState<string>("室内")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnoseResult | null>(null)
  const [needsRetake, setNeedsRetake] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const addImages = (files: FileList | null) => {
    if (!files) return
    const remaining = 5 - images.length
    const newFiles = Array.from(files).slice(0, remaining)
    const newImages = newFiles.map(file => ({ url: URL.createObjectURL(file), file }))
    setImages(prev => {
      const updated = [...prev, ...newImages]
      setSelectedIndex(updated.length - 1)
      return updated
    })
    setResult(null)
    setNeedsRetake(false)
    setError(null)
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const updated = prev.filter((_, i) => i !== index)
      setSelectedIndex(Math.min(index === 0 ? 0 : index - 1, updated.length - 1))
      return updated
    })
    setResult(null)
  }

  const handleDiagnose = async () => {
    if (images.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      images.forEach((img, i) => {
        formData.append(`image_${i}`, img.file)
        formData.append(`mimeType_${i}`, img.file.type)
      })
      formData.append("imageCount", String(images.length))
      formData.append("season", getCurrentSeason())
      formData.append("location", location)
      const res = await fetch("/api/diagnose", { method: "POST", body: formData })
      const data = await res.json()
      if (data.needsRetake) {
        setNeedsRetake(true)
      } else if (data.result) {
        setResult(data.result)
      } else {
        setError(data.error ?? "診断に失敗しました")
      }
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  const conditionColor = (overall: string) => {
    if (overall === "良好") return "#1D9E75"
    if (overall === "注意") return "#BA7517"
    return "#A32D2D"
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F8FBF8", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* ヘッダー */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1D3A2A", margin: "0 0 6px" }}>🌿 植物診断</h1>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>写真を撮るだけで植物の状態とケア方法がわかります</p>
        </div>

        {/* 精度アップのヒント */}
        <div style={{ background: "#EEF8F3", borderRadius: 14, padding: "14px 16px", marginBottom: 20, border: "1px solid #C5E8D8" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1D6A4A", margin: "0 0 10px" }}>📸 複数の写真で診断精度がアップします</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {PHOTO_TIPS.map(tip => (
              <div key={tip.label} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span style={{ fontSize: 16 }}>{tip.icon}</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#1D6A4A", margin: 0 }}>{tip.label}</p>
                  <p style={{ fontSize: 11, color: "#4A9E7A", margin: 0 }}>{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* メイン画像エリア */}
        <div style={{ width: "100%", height: 240, borderRadius: 16, background: "#E8F5EE", border: "2px dashed #9FE1CB", overflow: "hidden", marginBottom: 10, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {images.length > 0
            ? <>
                <img src={images[selectedIndex].url} alt="plant" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => removeImage(selectedIndex)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", fontSize: 14 }}>×</button>
                <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.5)", borderRadius: 12, padding: "2px 10px" }}>
                  <span style={{ color: "#fff", fontSize: 12 }}>{selectedIndex + 1} / {images.length}</span>
                </div>
              </>
            : (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 32, margin: "0 0 8px" }}>📷</p>
                <p style={{ color: "#2D8F64", fontSize: 14, margin: 0 }}>下のボタンから写真を追加</p>
              </div>
            )
          }
        </div>

        {/* サムネイル */}
        {images.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
            {images.map((img, i) => (
              <div key={i} onClick={() => setSelectedIndex(i)} style={{ width: 60, height: 60, borderRadius: 10, overflow: "hidden", border: i === selectedIndex ? "2.5px solid #1D9E75" : "2px solid #ddd", cursor: "pointer", flexShrink: 0 }}>
                <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        )}

        {/* 写真追加ボタン */}
        {images.length < 5
          ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => cameraInputRef.current?.click()} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #9FE1CB", background: "#fff", color: "#1D9E75", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
                📷 カメラで撮影
              </button>
              <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #9FE1CB", background: "#fff", color: "#1D9E75", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
                🖼️ ギャラリーから選択
              </button>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={e => addImages(e.target.files)} style={{ display: "none" }} />
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={e => addImages(e.target.files)} style={{ display: "none" }} />
            </div>
          )
          : (
            <div style={{ background: "#FFF3CC", borderRadius: 10, padding: "8px 12px", marginBottom: 12, textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#8A5C00", margin: 0 }}>写真は最大5枚まで追加できます</p>
            </div>
          )
        }

        {images.length > 0 && (
          <p style={{ fontSize: 12, color: "#888", textAlign: "center", marginBottom: 12 }}>
            {images.length}枚の写真をまとめて解析します
          </p>
        )}

        {/* 撮影場所 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: "0.5px solid #ddd" }}>
          <div>
            <p style={{ fontSize: 14, color: "#444", margin: 0 }}>撮影場所：<strong>{location}</strong></p>
            <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>日照アドバイスに影響します</p>
          </div>
          <button onClick={() => setLocation(location === "室内" ? "屋外" : "室内")} style={{ background: location === "屋外" ? "#1D9E75" : "#ccc", border: "none", borderRadius: 20, width: 52, height: 28, cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }} />
        </div>

        {/* 診断ボタン */}
        <button onClick={handleDiagnose} disabled={images.length === 0 || loading} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: images.length === 0 || loading ? "#9FE1CB" : "#1D9E75", color: "#fff", fontSize: 16, fontWeight: 700, cursor: images.length === 0 || loading ? "not-allowed" : "pointer", marginBottom: 24 }}>
          {loading ? "AIが診断中..." : images.length === 0 ? "写真を追加してください" : `🔍 ${images.length}枚の写真で診断する`}
        </button>

        {error && (
          <div style={{ background: "#FDECEA", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ color: "#A32D2D", margin: 0, fontSize: 14 }}>{error}</p>
          </div>
        )}

        {needsRetake && (
          <div style={{ background: "#FFF3CC", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ color: "#8A5C00", margin: 0, fontSize: 14 }}>⚠ 別の角度や明るい場所で再度お試しください。</p>
          </div>
        )}

        {result && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "0.5px solid #ddd" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#1D3A2A", margin: 0 }}>{result.plant_name}</p>
                <p style={{ fontSize: 13, color: "#666", fontStyle: "italic", margin: "2px 0" }}>{result.scientific_name}</p>
                <p style={{ fontSize: 12, color: "#999", margin: 0 }}>{result.family}</p>
              </div>
              <div style={{ background: conditionColor(result.condition.overall) + "22", borderRadius: 10, padding: "6px 12px", flexShrink: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: conditionColor(result.condition.overall), margin: 0 }}>{result.confidence}%</p>
              </div>
            </div>

            <div style={{ background: conditionColor(result.condition.overall) + "22", borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <p style={{ color: conditionColor(result.condition.overall), fontWeight: 600, margin: 0, fontSize: 14 }}>
                {result.condition.overall === "良好" ? "✓ 良好" : result.condition.overall === "注意" ? "⚠ 注意" : "❗ 要処置"}
              </p>
              {result.condition.disease && (
                <p style={{ color: conditionColor(result.condition.overall), margin: "4px 0 0", fontSize: 12 }}>病気：{result.condition.disease}</p>
              )}
            </div>

            {result.condition.issues.length > 0 && (
              <div style={{ background: "#FFF8E7", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                {result.condition.issues.map((issue, i) => (
                  <p key={i} style={{ color: "#8A5C00", margin: i === 0 ? 0 : "4px 0 0", fontSize: 13 }}>• {issue}</p>
                ))}
              </div>
            )}

            {result.care_advice.immediate_action && (
              <div style={{ background: "#FDECEA", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <p style={{ color: "#A32D2D", fontWeight: 600, margin: 0, fontSize: 13 }}>🚨 今すぐ：{result.care_advice.immediate_action}</p>
              </div>
            )}

            <div style={{ borderTop: "0.5px solid #eee", paddingTop: 14, marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 12 }}>ケアアドバイス</p>
              {[
                { icon: "💧", label: "水やり", text: result.care_advice.watering },
                { icon: "☀️", label: "日照", text: result.care_advice.sunlight },
                { icon: "🌱", label: "肥料", text: result.care_advice.fertilizer },
              ].map(({ icon, label, text }) => (
                <div key={label} style={{ display: "flex", marginBottom: 12 }}>
                  <span style={{ fontSize: 20, marginRight: 12, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#666", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontSize: 14, color: "#333", margin: 0, lineHeight: 1.7 }}>{text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#EEF8F3", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: "#1D6A4A", margin: 0, lineHeight: 1.6 }}>🍃 {result.season_tip}</p>
            </div>

            {result.recipe && (
              <div style={{ background: "#FFF8E7", borderRadius: 8, padding: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#8A5C00", margin: "0 0 4px" }}>🍽️ おすすめの食べ方</p>
                <p style={{ fontSize: 13, color: "#8A5C00", margin: 0, lineHeight: 1.6 }}>{result.recipe}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
