# 🌿 PlantDoc — 植物診断アプリ

写真を撮るだけで植物の名前・状態・ケアアドバイスがわかる AI 診断アプリ。

---

## 構成

```
plant-app/
├── backend/          # Next.js (Vercel にデプロイ)
│   ├── src/
│   │   ├── app/api/
│   │   │   ├── diagnose/route.ts   # 診断 API（メイン）
│   │   │   └── plants/route.ts     # マイ植物 CRUD
│   │   ├── lib/
│   │   │   ├── claude.ts           # Claude Vision API
│   │   │   └── supabase.ts         # Supabase クライアント
│   │   └── types/index.ts
│   └── schema.sql    # Supabase DB スキーマ
│
└── frontend/         # Expo React Native
    └── src/
        ├── app/index.tsx            # ナビゲーション
        ├── screens/
        │   ├── HomeScreen.tsx       # 撮影・診断・結果表示
        │   ├── PlantsScreen.tsx     # マイ植物一覧
        │   └── AuthScreen.tsx       # ログイン・新規登録
        ├── hooks/useAuth.ts         # 認証フック
        └── lib/api.ts               # API クライアント・型定義
```

---

## セットアップ手順

### 1. Supabase（DB・認証）

1. [supabase.com](https://supabase.com) でプロジェクト作成（無料）
2. Dashboard > SQL Editor を開き `backend/schema.sql` の内容を貼り付けて実行
3. Project Settings > API から以下をコピー:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Anthropic API キー

1. [console.anthropic.com](https://console.anthropic.com) でアカウント作成
2. API Keys > Create Key でキーを発行
3. `ANTHROPIC_API_KEY` に設定

### 3. バックエンド（Next.js）

```bash
cd backend
cp .env.example .env.local
# .env.local に各キーを入力

npm install
npm run dev        # localhost:3001 で起動確認
```

**Vercel にデプロイ:**
```bash
npm install -g vercel
vercel                # 画面の指示に従うだけ
# 環境変数は Vercel Dashboard > Settings > Environment Variables に設定
```

### 4. フロントエンド（Expo）

```bash
cd frontend
cp .env.example .env.local
# EXPO_PUBLIC_API_URL に Vercel の URL を設定（例: https://plant-app.vercel.app）
# EXPO_PUBLIC_SUPABASE_URL と ANON_KEY も設定

npm install
npx expo start       # QR コードをスキャンして実機確認
```

---

## 主要 API エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/diagnose` | 画像を送信して植物を診断 |
| GET | `/api/plants?userId=...` | マイ植物一覧取得 |
| POST | `/api/plants` | 植物を新規登録 |

### POST /api/diagnose リクエスト例

```json
{
  "imageBase64": "...",
  "mimeType": "image/jpeg",
  "season": "春",
  "location": "室内",
  "userId": "optional-supabase-user-id"
}
```

### レスポンス例（正常）

```json
{
  "result": {
    "plant_name": "モンステラ",
    "scientific_name": "Monstera deliciosa",
    "confidence": 94,
    "family": "サトイモ科",
    "condition": {
      "overall": "注意",
      "issues": ["葉の黄変"],
      "disease": null
    },
    "care_advice": {
      "watering": "週1回、土が乾いたらたっぷりと。",
      "sunlight": "明るい間接光が最適です。直射日光は避けてください。",
      "fertilizer": "春〜夏は月2回、薄めた液体肥料を与えてください。",
      "immediate_action": "黄変した葉は付け根から取り除いてください。"
    },
    "season_tip": "春は成長期です。新芽が出やすい時期なので、ひと回り大きな鉢への植え替えも検討しましょう。"
  }
}
```

### レスポンス例（再撮影が必要な場合）

```json
{
  "needsRetake": true,
  "confidence": 42,
  "message": "植物をうまく識別できませんでした。別の角度や明るい場所で再撮影してください。"
}
```

---

## コスト目安

| 項目 | 費用 |
|------|------|
| Vercel ホスティング | 無料（Hobby プラン） |
| Supabase DB | 無料（500MB まで） |
| Claude API | 約 $0.003〜0.008 / 診断1回 |
| Expo EAS Build | 無料（月15ビルドまで） |
| App Store 登録 | $99 / 年（Apple Developer） |
| Google Play 登録 | $25 初回のみ |

---

## 今後の拡張（Phase 2）

- [ ] Stripe サブスク課金（Pro プラン）
- [ ] 水やりリマインダー（Expo Notifications）
- [ ] 成長記録（写真タイムライン）
- [ ] Plant.id API 連携（識別精度向上）
- [ ] 季節ケアカレンダー
