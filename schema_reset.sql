-- テーブルをすべて削除（既存データも削除）
DROP TABLE IF EXISTS paid_leave_grants CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (英語名で正確に)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  joined_date TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create attendance_records table
CREATE TABLE attendance_records (
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
CREATE TABLE paid_leave_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grant_date TEXT NOT NULL,
  grant_amount INTEGER NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(date);
CREATE INDEX idx_paid_leave_grants_user_id ON paid_leave_grants(user_id);

-- Disable RLS for development
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE paid_leave_grants DISABLE ROW LEVEL SECURITY;

-- Insert initial users
INSERT INTO users (id, name, department, role, joined_date) VALUES
('fujiwara', '藤原慎太郎', 'CE（臨床工学部）', 'ADMIN', '2024-04-01'),
('tsukahara', '塚原蓮々', 'CE（臨床工学部）', 'STAFF', '2024-04-01');
