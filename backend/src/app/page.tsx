"use client"
import { useState, useRef } from "react"

interface DiagnoseResult {
  plant_name: string
  scientific_name: string
  confidence: number
  family: string
  condition: {
    overall: string
    summary: string
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
  recommended_products: { name: string; keyword: string }[]
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return "\u6625"
  if (month >= 6 && month <= 8) return "\u590f"
  if (month >= 9 && month <= 11) return "\u79cb"
  return "\u51ac"
}

function formatDateTime(date: Date) {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  const s = String(date.getSeconds()).padStart(2, "0")
  return `${y}${mo}${d}_${h}${mi}${s}`
}

function formatDateTimeDisplay(date: Date) {
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  const s = String(date.getSeconds()).padStart(2, "0")
  return `${y}\u5e74${mo}\u6708${d}\u65e5 ${h}:${mi}:${s}`
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

const INDOOR = "室内"
const OUTDOOR = "\u5c4a\u5916"

const PHOTO_TIPS = [
  { icon: "\uD83C\uDF3F", label: "\u5168\u4f53\u50cf", desc: "\u690d\u7269\u5168\u4f53\u304c\u5165\u308b\u3088\u3046\u306b" },
  { icon: "\uD83C\uDF43", label: "\u8449\uff08\u8868\u9762\u30fb\u88cf\u9762\uff09", desc: "\u8272\u30fb\u6a21\u69d8\u30fb\u75c5\u5909\u3092\u78ba\u8a8d" },
  { icon: "\uD83C\uDF31", label: "\u830e\u30fb\u682a\u5143", desc: "\u6839\u8150\u308c\u30fb\u50b7\u306e\u78ba\u8a8d\u306b" },
  { icon: "\uD83C\uDF38", label: "\u82b1\u30fb\u5b9f", desc: "\u3042\u308c\u3070\u8b58\u5225\u7cbe\u5ea6\u304c\u5927\u5e45UP" },
]

const SOIL_OPTIONS = [
  { value: "", label: "\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044" },
  { value: "乾燥している", label: "乾燥している" },
  { value: "\u9069\u5ea6\u306b\u6e7f\u3063\u3066\u3044\u308b", label: "\u9069\u5ea6\u306b\u6e7f\u3063\u3066\u3044\u308b" },
  { value: "\u304b\u306a\u308a\u6e7f\u3063\u3066\u3044\u308b", label: "\u304b\u306a\u308a\u6e7f\u3063\u3066\u3044\u308b" },
  { value: "\u6c34\u304c\u6e9c\u307e\u3063\u3066\u3044\u308b", label: "\u6c34\u304c\u6e9c\u307e\u3063\u3066\u3044\u308b" },
]

const CHAT_PLACEHOLDERS = [
  "\u4f8b\uff09\u53ce\u7a6b\u6642\u671f\u3092\u6559\u3048\u3066",
  "\u4f8b\uff09\u690d\u3048\u66ff\u3048\u306e\u30bf\u30a4\u30df\u30f3\u30b0\u306f\uff1f",
  "\u4f8b\uff09\u8449\u304c\u9ec4\u8272\u304f\u306a\u308b\u539f\u56e0\u306f\uff1f",
  "\u4f8b\uff09\u6563\u6b69\u306e\u65b9\u6cd5\u3092\u6559\u3048\u3066",
]

export default function Home() {
  const [images, setImages] = useState<{ url: string; file: File }[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [location, setLocation] = useState(INDOOR)
  const [temperature, setTemperature] = useState("")
  const [humidity, setHumidity] = useState("")
  const [lastWatered, setLastWatered] = useState("")
  const [soilCondition, setSoilCondition] = useState("")
  const [showEnvForm, setShowEnvForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnoseResult | null>(null)
  const [diagnosedAt, setDiagnosedAt] = useState<Date | null>(null)
  const [diagnosedImageUrl, setDiagnosedImageUrl] = useState<string | null>(null)
  const [needsRetake, setNeedsRetake] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [savingPdf, setSavingPdf] = useState(false)
  const [chatPlaceholderIndex] = useState(() => Math.floor(Math.random() * CHAT_PLACEHOLDERS.length))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const resetAll = () => {
    setImages([])
    setSelectedIndex(0)
    setResult(null)
    setDiagnosedAt(null)
    setDiagnosedImageUrl(null)
    setNeedsRetake(false)
    setError(null)
    setChatMessages([])
    setChatInput("")
    setTemperature("")
    setHumidity("")
    setLastWatered("")
    setSoilCondition("")
    setShowEnvForm(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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
      if (updated.length === 0) setSelectedIndex(0)
      else setSelectedIndex(Math.min(index === 0 ? 0 : index - 1, updated.length - 1))
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
      if (temperature) formData.append("temperature", temperature)
      if (humidity) formData.append("humidity", humidity)
      if (lastWatered) formData.append("lastWatered", lastWatered)
      if (soilCondition) formData.append("soilCondition", soilCondition)
      const res = await fetch("/api/diagnose", { method: "POST", body: formData })
      const data = await res.json()
      if (data.needsRetake) {
        setNeedsRetake(true)
      } else if (data.result) {
        setResult(data.result)
        setDiagnosedAt(new Date())
        setDiagnosedImageUrl(images[0].url)
      } else {
        setError(data.error ?? "\u8a3a\u65ad\u306b\u5931\u6557\u3057\u307e\u3057\u305f")
      }
    } catch {
      setError("\u901a\u4fe1\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f")
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
        body: JSON.stringify({ question: userMessage, diagnosis: result, history: chatMessages }),
      })
      const data = await res.json()
      setChatMessages([...newMessages, { role: "assistant", content: data.answer }])
    } catch {
      setChatMessages([...newMessages, { role: "assistant", content: "\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002" }])
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
      const el = resultRef.current
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: el.scrollWidth,
        windowWidth: el.scrollWidth,
      })
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const margin = 10
      const contentW = pageW - margin * 2
      const ratio = canvas.width / contentW
      const contentH = canvas.height / ratio

      if (contentH <= pageH - margin * 2) {
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, contentW, contentH)
      } else {
        let srcY = 0
        let page = 0
        const sliceH = (pageH - margin * 2) * ratio
        while (srcY < canvas.height) {
          if (page > 0) pdf.addPage()
          const h = Math.min(sliceH, canvas.height - srcY)
          const sliceCanvas = document.createElement("canvas")
          sliceCanvas.width = canvas.width
          sliceCanvas.height = h
          sliceCanvas.getContext("2d")!.drawImage(canvas, 0, srcY, canvas.width, h, 0, 0, canvas.width, h)
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, contentW, h / ratio)
          srcY += h
          page++
        }
      }
      const dateStr = formatDateTime(diagnosedAt ?? new Date())
      pdf.save(`${result.plant_name}_\u8a3a\u65ad\u7d50\u679c_${dateStr}.pdf`)
    } catch {
      alert("PDF\u4fdd\u5b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f")
    } finally {
      setSavingPdf(false)
    }
  }

  const conditionColor = (overall: string) => {
    if (overall === "\u826f\u597d") return "#1D9E75"
    if (overall === "\u6ce8\u610f") return "#BA7517"
    return "#A32D2D"
  }

  const amazonUrl = (keyword: string) =>
    `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
    color: "#333",
  }

  const phStyle: React.CSSProperties = {
    ...inputStyle,
    color: "#bbb",
  }

  return (
    <main style={{ minHeight: "100vh", background: "#F8FBF8", padding: "24px 16px 48px" }}>
      <style>{`
        input::placeholder { color: #bbb; }
        select option:first-child { color: #bbb; }
      `}</style>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1D3A2A", margin: "0 0 6px" }}>
            {"\uD83C\uDF3F \u690d\u7269\u8a3a\u65ad"}
          </h1>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
            {"\u5199\u771f\u3092\u64ae\u308b\u3060\u3051\u3067\u690d\u7269\u306e\u72b6\u614b\u3068\u30b1\u30a2\u65b9\u6cd5\u304c\u308f\u304b\u308a\u307e\u3059"}
          </p>
        </div>

        <div style={{ background: "#EEF8F3", borderRadius: 14, padding: "14px 16px", marginBottom: 20, border: "1px solid #C5E8D8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1D6A4A", margin: 0 }}>
              {"\uD83D\uDCF8 \u8907\u6570\u306e\u5199\u771f\u3067\u8a3a\u65ad\u7cbe\u5ea6\u304c\u30a2\u30c3\u30d7\u3057\u307e\u3059"}
            </p>
            <span style={{ fontSize: 11, color: "#fff", background: "#1D9E75", borderRadius: 20, padding: "2px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>
              {"\u6700\u59275\u679a"}
            </span>
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
          {images.length > 0 ? (
            <>
              <img src={images[selectedIndex].url} alt="plant" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button onClick={() => removeImage(selectedIndex)} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)", border: "2px solid rgba(255,255,255,0.8)", borderRadius: "50%", width: 32, height: 32, color: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {"\u00d7"}
              </button>
              <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.55)", borderRadius: 20, padding: "3px 12px" }}>
                <span style={{ color: "#fff", fontSize: 12 }}>{selectedIndex + 1} / {images.length}</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 36, margin: "0 0 8px" }}>{"\uD83D\uDCF7"}</p>
              <p style={{ color: "#2D8F64", fontSize: 14, margin: 0 }}>{"\u4e0b\u306e\u30dc\u30bf\u30f3\u304b\u3089\u5199\u771f\u3092\u8ffd\u52a0"}</p>
            </div>
          )}
        </div>

        {images.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12, overflowX: "auto", paddingBottom: 4 }}>
            {images.map((img, i) => (
              <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                <div onClick={() => setSelectedIndex(i)} style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", border: i === selectedIndex ? "2.5px solid #1D9E75" : "2px solid #ddd", cursor: "pointer" }}>
                  <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <button onClick={() => removeImage(i)} style={{ position: "absolute", top: -6, right: -6, background: "#555", border: "1.5px solid #fff", borderRadius: "50%", width: 20, height: 20, color: "#fff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, padding: 0 }}>
                  {"\u00d7"}
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <div onClick={() => fileInputRef.current?.click()} style={{ width: 64, height: 64, borderRadius: 10, border: "2px dashed #9FE1CB", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, background: "#E8F5EE" }}>
                <span style={{ fontSize: 24, color: "#1D9E75" }}>+</span>
              </div>
            )}
          </div>
        )}

        {images.length < 5 ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => cameraInputRef.current?.click()} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #9FE1CB", background: "#fff", color: "#1D9E75", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
              {"\uD83D\uDCF7 \u30ab\u30e1\u30e9\u3067\u64ae\u5f71"}
            </button>
            <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #9FE1CB", background: "#fff", color: "#1D9E75", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
              {"\uD83D\uDDBC\uFE0F \u30ae\u30e3\u30e9\u30ea\u30fc\u304b\u3089\u9078\u629e"}
            </button>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={e => addImages(e.target.files)} style={{ display: "none" }} />
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={e => addImages(e.target.files)} style={{ display: "none" }} />
          </div>
        ) : (
          <div style={{ background: "#FFF3CC", borderRadius: 10, padding: "8px 12px", marginBottom: 12, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#8A5C00", margin: 0 }}>
              {"\u2713 \u5199\u771f\u304c5\u679a\u63c3\u3044\u307e\u3057\u305f\u3002\u305d\u306e\u307e\u307e\u8a3a\u65ad\u3067\u304d\u307e\u3059\u3002"}
            </p>
          </div>
        )}

        {images.length > 0 && (
          <p style={{ fontSize: 12, color: "#888", textAlign: "center", marginBottom: 12 }}>
            {images.length}{"\u679a\u306e\u5199\u771f\u3092\u307e\u3068\u3081\u3066\u89e3\u6790\u3057\u307e\u3059\uff08\u6b8b\u308a"}{5 - images.length}{"\u679a\u8ffd\u52a0\u53ef\uff09"}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 12, border: "0.5px solid #ddd" }}>
          <div>
            <p style={{ fontSize: 14, color: "#444", margin: 0 }}>
              {"\u64ae\u5f71\u5834\u6240\uff1a"}<strong>{location === INDOOR ? "\u5ba4\u5185" : "\u5c4e\u5916"}</strong>
            </p>
            <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>{"\u65e5\u7167\u30a2\u30c9\u30d0\u30a4\u30b9\u306b\u5f71\u97ff\u3057\u307e\u3059"}</p>
          </div>
          <button
            onClick={() => setLocation(location === INDOOR ? OUTDOOR : INDOOR)}
            style={{ background: location === OUTDOOR ? "#1D9E75" : "#ccc", border: "none", borderRadius: 20, width: 52, height: 28, cursor: "pointer", flexShrink: 0 }}
          />
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #ddd", marginBottom: 16, overflow: "hidden" }}>
          <button onClick={() => setShowEnvForm(!showEnvForm)} style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontSize: 14, color: "#444", margin: 0, fontWeight: 600 }}>
                {"\uD83C\uDF21\uFE0F \u74b0\u5883\u60c5\u5831\u3092\u5165\u529b\u3059\u308b\uff08\u4efb\u610f\uff09"}
              </p>
              <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>
                {"\u5165\u529b\u3059\u308b\u3068\u3088\u308a\u7cbe\u5ea6\u306e\u9ad8\u3044\u8a3a\u65ad\u304c\u3067\u304d\u307e\u3059"}
              </p>
            </div>
            <span style={{ fontSize: 12, color: "#888" }}>{showEnvForm ? "\u25b2" : "\u25bc"}</span>
          </button>
          {showEnvForm && (
            <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <p style={{ fontSize: 12, color: "#666", margin: "0 0 4px", fontWeight: 600 }}>{"\u6c17\u6e29\uff08\u2103\uff09"}</p>
                  <input type="number" value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="25" style={inputStyle} />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: "#666", margin: "0 0 4px", fontWeight: 600 }}>{"\u6e7f\u5ea6\uff08%\uff09"}</p>
                  <input type="number" value={humidity} onChange={e => setHumidity(e.target.value)} placeholder="60" style={inputStyle} />
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: "#666", margin: "0 0 4px", fontWeight: 600 }}>{"\u6700\u5f8c\u306b\u6c34\u3092\u3084\u3063\u305f\u65e5"}</p>
                <input type="date" value={lastWatered} onChange={e => setLastWatered(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <p style={{ fontSize: 12, color: "#666", margin: "0 0 4px", fontWeight: 600 }}>{"\u571f\u306e\u72b6\u614b"}</p>
                <select value={soilCondition} onChange={e => setSoilCondition(e.target.value)} style={{ ...inputStyle, color: soilCondition === "" ? "#bbb" : "#333" }}>
                  {SOIL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ color: opt.value === "" ? "#bbb" : "#333" }}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleDiagnose} disabled={images.length === 0 || loading} style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", background: images.length === 0 || loading ? "#9FE1CB" : "#1D9E75", color: "#fff", fontSize: 16, fontWeight: 700, cursor: images.length === 0 || loading ? "not-allowed" : "pointer", marginBottom: 24 }}>
          {loading
            ? "AI\u304c\u8a3a\u65ad\u4e2d..."
            : images.length === 0
            ? "\u5199\u771f\u3092\u8ffd\u52a0\u3057\u3066\u304f\u3060\u3055\u3044"
            : `\uD83D\uDD0D ${images.length}\u679a\u306e\u5199\u771f\u3067\u8a3a\u65ad\u3059\u308b`}
        </button>

        {error && (
          <div style={{ background: "#FDECEA", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ color: "#A32D2D", margin: 0, fontSize: 14 }}>{error}</p>
          </div>
        )}

        {needsRetake && (
          <div style={{ background: "#FFF3CC", borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <p style={{ color: "#8A5C00", margin: 0, fontSize: 14 }}>
              {"\u26a0 \u5225\u306e\u89d2\u5ea6\u3084\u660e\u308b\u3044\u5834\u6240\u3067\u518d\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002"}
            </p>
          </div>
        )}

        {result && (
          <>
            <div ref={resultRef} style={{ background: "#fff", borderRadius: 16, padding: 20, border: "0.5px solid #ddd", marginBottom: 16 }}>

              {diagnosedAt && (
                <p style={{ fontSize: 11, color: "#aaa", margin: "0 0 12px", textAlign: "right" }}>
                  {"\u8a3a\u65ad\u65e5\u6642\uff1a"}{formatDateTimeDisplay(diagnosedAt)}
                </p>
              )}

              {diagnosedImageUrl && (
                <div style={{ width: 160, height: 160, borderRadius: 12, overflow: "hidden", marginBottom: 16, flexShrink: 0 }}>
                  <img src={diagnosedImageUrl} alt="diagnosed plant" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#1D3A2A", margin: 0 }}>{result.plant_name}</p>
                  <p style={{ fontSize: 13, color: "#666", fontStyle: "italic", margin: "2px 0" }}>{result.scientific_name}</p>
                  <p style={{ fontSize: 12, color: "#999", margin: 0 }}>{result.family}</p>
                </div>
                <div style={{ background: conditionColor(result.condition.overall) + "22", borderRadius: 10, padding: "6px 12px", flexShrink: 0, marginLeft: 12 }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: conditionColor(result.condition.overall), margin: 0 }}>{result.confidence}%</p>
                </div>
              </div>

              <div style={{ background: conditionColor(result.condition.overall) + "18", borderRadius: 10, padding: "12px 14px", marginBottom: 12, borderLeft: `4px solid ${conditionColor(result.condition.overall)}` }}>
                <p style={{ color: conditionColor(result.condition.overall), fontWeight: 700, margin: "0 0 6px", fontSize: 15 }}>
                  {result.condition.overall === "\u826f\u597d" ? "\u2713 \u826f\u597d" : result.condition.overall === "\u6ce8\u610f" ? "\u26a0 \u6ce8\u610f" : "\u2757 \u8981\u51e6\u7f6e"}
                </p>
                <p style={{ color: conditionColor(result.condition.overall), margin: 0, fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
                  {result.condition.summary}
                </p>
                {result.condition.disease && (
                  <p style={{ color: conditionColor(result.condition.overall), margin: "6px 0 0", fontSize: 12, fontWeight: 600 }}>
                    {"\u75c5\u6c17\uff1a"}{result.condition.disease}
                  </p>
                )}
              </div>

              {result.condition.issues.length > 0 && (
                <div style={{ background: "#FFF8E7", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  {result.condition.issues.map((issue, i) => (
                    <p key={i} style={{ color: "#8A5C00", margin: i === 0 ? 0 : "4px 0 0", fontSize: 13 }}>{"\u2022 "}{issue}</p>
                  ))}
                </div>
              )}

              {result.care_advice.immediate_action && (
                <div style={{ background: "#FDECEA", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                  <p style={{ color: "#A32D2D", fontWeight: 600, margin: 0, fontSize: 13 }}>
                    {"\uD83D\uDEA8 \u4eca\u3059\u3050\uff1a"}{result.care_advice.immediate_action}
                  </p>
                </div>
              )}

              <div style={{ borderTop: "0.5px solid #eee", paddingTop: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#333", marginBottom: 12 }}>
                  {"\u30b1\u30a2\u30a2\u30c9\u30d0\u30a4\u30b9"}
                </p>
                {[
                  { icon: "\uD83D\uDCA7", label: "\u6c34\u3084\u308a", text: result.care_advice.watering },
                  { icon: "\u2600\uFE0F", label: "\u65e5\u7167", text: result.care_advice.sunlight },
                  { icon: "\uD83C\uDF31", label: "\u80a5\u6599", text: result.care_advice.fertilizer },
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
                <p style={{ fontSize: 13, color: "#1D6A4A", margin: 0, lineHeight: 1.6 }}>
                  {"\uD83C\uDF43 "}{result.season_tip}
                </p>
              </div>

              {result.recipe && (
                <div style={{ background: "#FFF8E7", borderRadius: 8, padding: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#8A5C00", margin: "0 0 4px" }}>
                    {"\uD83C\uDF7D\uFE0F \u304a\u3059\u3059\u3081\u306e\u98df\u3079\u65b9"}
                  </p>
                  <p style={{ fontSize: 13, color: "#8A5C00", margin: 0, lineHeight: 1.6 }}>{result.recipe}</p>
                </div>
              )}
            </div>

            {result.recommended_products && result.recommended_products.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "0.5px solid #ddd", marginBottom: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#333", margin: "0 0 4px" }}>
                  {"\uD83D\uDED2 \u304a\u3059\u3059\u3081\u5546\u54c1"}
                </p>
                <p style={{ fontSize: 12, color: "#888", margin: "0 0 14px" }}>
                  {"\u8a3a\u65ad\u7d50\u679c\u306b\u57fa\u3065\u3044\u3066Amazon\u3067\u691c\u7d22\u3067\u304d\u307e\u3059"}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {result.recommended_products.map((product, i) => (
                    <a key={i} href={amazonUrl(product.keyword)} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#FFF8E7", borderRadius: 10, border: "1px solid #F0D9A0", textDecoration: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{"\uD83D\uDCE6"}</span>
                        <p style={{ fontSize: 13, color: "#333", margin: 0, fontWeight: 600 }}>{product.name}</p>
                      </div>
                      <span style={{ fontSize: 12, color: "#E47911", fontWeight: 600, whiteSpace: "nowrap", marginLeft: 8 }}>{"Amazon \u2192"}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleSavePdf} disabled={savingPdf} style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid #ddd", background: "#fff", color: "#555", fontSize: 14, fontWeight: 600, cursor: savingPdf ? "not-allowed" : "pointer", marginBottom: 16 }}>
              {savingPdf ? "PDF\u3092\u751f\u6210\u4e2d..." : "\uD83D\uDCC4 \u8a3a\u65ad\u7d50\u679c\u3092PDF\u3067\u4fdd\u5b58"}
            </button>

            <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "0.5px solid #ddd", marginBottom: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#333", margin: "0 0 4px" }}>
                {"\uD83D\uDCAC \u3053\u306e\u690d\u7269\u306b\u3064\u3044\u3066\u3055\u3089\u306b\u8cea\u554f\u3059\u308b"}
              </p>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 14px" }}>
                {"\u8a3a\u65ad\u7d50\u679c\u3092\u3082\u3068\u306bAI\u304c\u56de\u7b54\u3057\u307e\u3059"}
              </p>

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
                      <div style={{ background: "#F0F0F0", borderRadius: "14px 14px 14px 4px", padding: "10px 14px", fontSize: 13, color: "#888" }}>
                        {"\u8003\u3048\u4e2d..."}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChat()}
                  placeholder={CHAT_PLACEHOLDERS[chatPlaceholderIndex]}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, outline: "none", color: "#333" }}
                />
                <button onClick={handleChat} disabled={!chatInput.trim() || chatLoading} style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: !chatInput.trim() || chatLoading ? "#9FE1CB" : "#1D9E75", color: "#fff", fontWeight: 600, cursor: !chatInput.trim() || chatLoading ? "not-allowed" : "pointer", fontSize: 13 }}>
                  {"\u9001\u4fe1"}
                </button>
              </div>
            </div>

            <button onClick={resetAll} style={{ width: "100%", padding: 16, borderRadius: 14, border: "2px solid #1D9E75", background: "#fff", color: "#1D9E75", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              {"\uD83D\uDCF7 \u5225\u306e\u5199\u771f\u3067\u8a3a\u65ad\u3059\u308b"}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
