"use client"
import { useState } from "react"

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

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [location, setLocation] = useState<string>("室内")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnoseResult | null>(null)
  const [needsRetake, setNeedsRetake] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImageUrl(URL.createObjectURL(file))
    setResult(null)
    setNeedsRetake(false)
    setError(null)
  }

  const handleDiagnose = async () => {
    if (!imageFile) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("image", imageFile)
      formData.append("mimeType", imageFile.type)
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
    <main style={{ minHeight: "100vh", background: "#F8FBF8", padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1D3A2A", textAlign: "center", marginBottom: 24 }}>
          🌿 植物診断
        </h1>

        <label style={{ display: "flex", flexDirection: "column", width: "100%", height: 220, borderRadius: 16, background: "#E8F5EE", border: "2px dashed #9FE1CB", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", marginBottom: 12 }}>
          {imageUrl
            ? <img src={imageUrl} alt="plant" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ color: "#2D8F64", fontSize: 14 }}>📷 クリックして写真を選択</span>
          }
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        </label>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: "0.5px solid #ddd" }}>
          <span style={{ fontSize: 14, color: "#444" }}>撮影場所：{location}</span>
          <button onClick={() => setLocation(location === "室内" ? "屋外" : "室内")} style={{ background: location === "屋外" ? "#1D9E75" : "#ccc", border: "none", borderRadius: 20, width: 48, height: 26, cursor: "pointer" }} />
        </div>

        <button onClick={handleDiagnose} disabled={!imageFile || loading} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: !imageFile || loading ? "#9FE1CB" : "#1D9E75", color: "#fff", fontSize: 16, fontWeight: 700, cursor: !imageFile || loading ? "not-allowed" : "pointer", marginBottom: 24 }}>
          {loading ? "診断中..." : "🔍 診断する"}
        </button>

        {error && (
          <div style={{ background: "#FDECEA", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ color: "#A32D2D", margin: 0, fontSize: 14 }}>{error}</p>
          </div>
        )}

        {needsRetake && (
          <div style={{ background: "#FFF3CC", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ color: "#8A5C00", margin: 0, fontSize: 14 }}>別の角度や明るい場所で再度お試しください。</p>
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
              <div style={{ background: conditionColor(result.condition.overall) + "22", borderRadius: 10, padding: "6px 12px" }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: conditionColor(result.condition.overall), margin: 0 }}>{result.confidence}%</p>
              </div>
            </div>

            <div style={{ background: conditionColor(result.condition.overall) + "22", borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <p style={{ color: conditionColor(result.condition.overall), fontWeight: 600, margin: 0, fontSize: 14 }}>
                {result.condition.overall === "良好" ? "✓" : "⚠"} {result.condition.overall}
              </p>
            </div>

            {result.care_advice.immediate_action && (
              <div style={{ background: "#FDECEA", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <p style={{ color: "#A32D2D", fontWeight: 600, margin: 0, fontSize: 13 }}>🚨 今すぐ：{result.care_advice.immediate_action}</p>
              </div>
            )}

            <div style={{ borderTop: "0.5px solid #eee", paddingTop: 14, marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 12 }}>ケアアドバイス</p>
              {[
                { icon: "💧", label: "水やり", text: result.care_advice.watering },
                { icon: "☀️", label: "日照", text: result.care_advice.sunlight },
                { icon: "🌱", label: "肥料", text: result.care_advice.fertilizer },
              ].map(({ icon, label, text }) => (
                <div key={label} style={{ display: "flex", marginBottom: 10 }}>
                  <span style={{ fontSize: 18, marginRight: 10 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#666", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontSize: 14, color: "#333", margin: 0, lineHeight: 1.6 }}>{text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#EEF8F3", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: "#1D6A4A", margin: 0, lineHeight: 1.6 }}>🍃 {result.season_tip}</p>
            </div>

            {result.recipe && (
              <div style={{ background: "#FFF8E7", borderRadius: 8, padding: 10 }}>
                <p style={{ fontSize: 13, color: "#8A5C00", margin: 0, lineHeight: 1.6 }}>🍽️ {result.recipe}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
