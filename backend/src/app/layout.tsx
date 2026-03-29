import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "PlantDoc - 植物診断アプリ",
  description: "写真を撮るだけで植物の名前・状態・ケアアドバイスがわかるAI診断アプリ",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, fontFamily: "sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
