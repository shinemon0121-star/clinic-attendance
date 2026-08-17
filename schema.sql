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
CREATE TABLE IF NOT EXISTS paid_leave_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grant_date TEXT NOT NULL,
  grant_amount INTEGER NOT NULL,
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_paid_leave_grants_user_id ON paid_leave_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_hourly_leave_grants_user_id ON hourly_leave_grants(user_id);

-- Disable RLS policies (allow public read/write for now)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE paid_leave_grants DISABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_leave_grants DISABLE ROW LEVEL SECURITY;

-- Grant access to anon/authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hourly_leave_grants TO anon, authenticated;
