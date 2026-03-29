-- =============================================
-- 植物診断アプリ Supabase スキーマ
-- Supabase Dashboard > SQL Editor で実行してください
-- =============================================

-- 診断履歴テーブル
create table if not exists diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plant_name text not null,
  scientific_name text,
  confidence integer not null check (confidence between 0 and 100),
  condition_overall text not null check (condition_overall in ('良好', '注意', '要処置')),
  disease text,
  care_advice jsonb not null,
  season_tip text,
  image_url text,
  created_at timestamptz default now()
);

-- マイ植物テーブル
create table if not exists plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  scientific_name text,
  last_diagnosis_id uuid references diagnoses(id) on delete set null,
  last_diagnosis_at timestamptz,
  watering_interval_days integer not null default 7,
  next_watering_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- RLS（Row Level Security）有効化
alter table diagnoses enable row level security;
alter table plants enable row level security;

-- 自分のデータのみ読み書き可能にするポリシー
create policy "users can manage own diagnoses"
  on diagnoses for all
  using (auth.uid() = user_id);

create policy "users can manage own plants"
  on plants for all
  using (auth.uid() = user_id);

-- インデックス
create index if not exists diagnoses_user_id_idx on diagnoses(user_id);
create index if not exists diagnoses_created_at_idx on diagnoses(created_at desc);
create index if not exists plants_user_id_idx on plants(user_id);
create index if not exists plants_next_watering_idx on plants(next_watering_at);
