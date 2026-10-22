-- Supabase Database Schema for 勤怠管理システム
-- Run this SQL in Supabase SQL Editor to set up all tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  joined_date TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  shift_type TEXT NOT NULL,
  overtime_start TEXT,
  overtime_end TEXT,
  overtime_description TEXT DEFAULT '',
  is_holiday BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create paid_leave_grants table
-- grant_amount は NUMERIC（半日=0.5日などの小数調整を保存できるようにするため）
CREATE TABLE IF NOT EXISTS paid_leave_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grant_date TEXT NOT NULL,
  grant_amount NUMERIC NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create hourly_leave_grants table（時間休：時間単位の年次有給休暇。2026-09-16制度開始）
CREATE TABLE IF NOT EXISTS hourly_leave_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grant_date TEXT NOT NULL,
  grant_hours NUMERIC NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- attendance_records に時間休の取得時間数（1〜7時間）を記録する列を追加
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS hourly_leave_hours NUMERIC;

-- ICカード（RC-S380等）と職員の対応付け
CREATE TABLE IF NOT EXISTS ic_card_users (
  idm TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ICカードをかざした記録（PC側の補助プログラムが書き込む）
CREATE TABLE IF NOT EXISTS ic_card_taps (
  id TEXT PRIMARY KEY,
  idm TEXT NOT NULL,
  tapped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_paid_leave_grants_user_id ON paid_leave_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_hourly_leave_grants_user_id ON hourly_leave_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_ic_card_taps_tapped_at ON ic_card_taps(tapped_at);

-- Enable RLS + allow-all policy（Supabase「rls_disabled_in_public」警告対策。2026-10 変更）
-- Supabase Auth 未使用のため anon/authenticated への権限は従来通りフルオープン
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','attendance_records','paid_leave_grants','hourly_leave_grants','ic_card_users','ic_card_taps']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon_authenticated" ON public.%I', t);
    EXECUTE format('CREATE POLICY "allow_all_anon_authenticated" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO anon, authenticated', t);
  END LOOP;
END $$;
