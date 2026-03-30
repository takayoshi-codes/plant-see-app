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

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return "春"
  if (month >= 6 && month <= 8) return "夏"
  if (month >= 9 && month <= 11) return "秋"
  return "冬"
}

async function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        if (blob) resolve(new File([blob], file.name, { type: "image/jpeg" }))
        else resolve(file)
      }, "image/jpeg", quality)
    }
    img.src = URL.createObjectURL(file)
  })
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [savingPdf, setSavingPdf] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const addImages = async (files: FileList | null) => {
    if (!files) return
    const remaining = 5 - images.length
    const newFiles = Array.from(files).slice(0, remaining)
    const compressed = await Promise.all(newFiles.map(f => compressImage(f)))
    const newImages = compressed.map((file, i) => ({ url: URL.createObjectURL(newFiles[i]), file }))
    setImages(prev => {
      const updated = [...prev, ...newImages]
      setSelectedIndex(updated.length - 1)
      return updated
    })
    setResult(null)
    setNeedsRetake(false)
    setError(null)
    setChatMessages([])
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const updated = prev.filter((_, i) => i !== index)
      setSelectedIndex(Math.min(index === 0 ? 0 : index - 1, updated.length - 1))
      return updated
    })
    setResult(null)
    setChatMessages([])
  }

  const handleDiagnose = async () => {
    if (images.length === 0) return
    setLoading(true)
    setError(null)
    setChatMessages([])
    try {
      const formData = new FormData()
      images.forEach((img, i) => {
        formData.append(`image_${i}`, img.file)
        formData.append(`mimeType_${i}`, "image/jpeg")
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

  const handleChat = async () => {
    if (!chatInput.trim() || !result) return
    const userMessage = chatInput.trim()
    setChatInput("")
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: userMessage }]
    setChatMessages(newMessages)
    setChatLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          diagnosis: result,
          history: chatMessages,
        }),
      })
      const data = await res.json()
      setChatMessages([...newMessages, { role: "assistant", content: data.answer }])
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleSavePdf = async () => {
    if (!result || !resultRef.current) return
    setSavingPdf(true)
    try {
      const { default: jsPDF } = await import("jspdf")
      const { default: html2canvas } = await import("html2canvas")
      const canvas = await html2canvas(resultRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${result.plant_name}_診断結果.pdf`)
    } catch {
      alert("PDF保存に失敗しました")
    } finally {
      setSavingPdf(false)
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

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1D3A2A", margin: "0 0 6px" }}>🌿 植物診断</h1>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>写真を撮るだけで植物の状態とケア方法がわかります</p>
        </div>

        <div style={{ background: "#EEF8F3", borderRadius: 14, padding: "14px 16px", marginBottom: 20, border: "1px solid #C5E8D8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1D6A4A", margin: 0 }}>📸 複数の写真で診断精度がアップします</p>
            <span style={{ fontSize: 11, color: "#fff", background: "#1D9E75", borderRadius: 20, padding: "2px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>最大5枚</span>
          </div>
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

        {images.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
            {images.map((img, i) => (
              <div key={i} onClick={() => setSelectedIndex(i)} style={{ width: 60, height: 60, borderRadius: 10, overflow: "hidden", border: i === selectedIndex ? "2.5px solid #1D9E75" : "2px solid #ddd", cursor: "pointer", flexShrink: 0 }}>
                <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
            {images.length < 5 && (
              <div onClick={() => fileInputRef.current?.click()} style={{ width: 60, height: 60, borderRadius: 10, border: "2px dashed #9FE1CB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, background: "#E8F5EE" }}>
                <span style={{ fontSize: 22, color: "#1D9E75" }}>+</span>
              </div>
            )}
          </div>
        )}

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
              <p style={{ fontSize: 12, color: "#8A5C00", margin: 0 }}>✓ 写真が5枚揃いました。このまま診断できます。</p>
            </div>
          )
        }

        {images.length > 0 && (
          <p style={{ fontSize: 12, color: "#888", textAlign: "center", marginBottom: 12 }}>
            {images.length}枚の写真をまとめて解析します（残り{5 - images.length}枚追加可）
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: "0.5px solid #ddd" }}>
          <div>
            <p style={{ fontSize: 14, color: "#444", margin: 0 }}>撮影場所：<strong>{location}</strong></p>
            <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>日照アドバイスに影響します</p>
          </div>
          <button onClick={() => setLocation(location === "室内" ? "屋外" : "室内")} style={{ background: location === "屋外" ? "#1D9E75" : "#ccc", border: "none", borderRadius: 20, width: 52, height: 28, cursor: "pointer", flexShrink: 0 }} />
        </div>

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
          <>
            <div ref={resultRef} style={{ background: "#fff", borderRadius: 16, padding: 20, border: "0.5px solid #ddd", marginBottom: 16 }}>
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

            {/* PDF保存ボタン */}
            <button onClick={handleSavePdf} disabled={savingPdf} style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid #ddd", background: "#fff", color: "#555", fontSize: 14, fontWeight: 600, cursor: savingPdf ? "not-allowed" : "pointer", marginBottom: 24 }}>
              {savingPdf ? "PDFを生成中..." : "📄 診断結果をPDFで保存"}
            </button>

            {/* 追加質問チャット */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "0.5px solid #ddd" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#333", margin: "0 0 4px" }}>💬 この植物についてさらに質問する</p>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 14px" }}>診断結果をもとにAIが回答します</p>

              {chatMessages.length > 0 && (
                <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "80%", background: msg.role === "user" ? "#1D9E75" : "#F0F0F0", color: msg.role === "user" ? "#fff" : "#333", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "10px 14px", fontSize: 13, lineHeight: 1.6 }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ background: "#F0F0F0", borderRadius: "14px 14px 14px 4px", padding: "10px 14px", fontSize: 13, color: "#888" }}>考え中...</div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChat()}
                  placeholder="例：植え替えの時期はいつですか？"
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, outline: "none" }}
                />
                <button onClick={handleChat} disabled={!chatInput.trim() || chatLoading} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: !chatInput.trim() || chatLoading ? "#9FE1CB" : "#1D9E75", color: "#fff", fontWeight: 600, cursor: !chatInput.trim() || chatLoading ? "not-allowed" : "pointer", fontSize: 13 }}>
                  送信
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
