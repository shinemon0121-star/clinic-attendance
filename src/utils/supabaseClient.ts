import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Supabase の環境変数が設定されていません。.env.local を確認してください。');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// テーブル存在確認（デバッグ用）
export async function checkTables() {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  if (error) console.error('テーブル確認エラー:', error);
  else console.log('✅ 既存テーブル:', data);
}

// データベース操作関数
export async function loadUsersFromDB() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('❌ loadUsersFromDB error:', error);
    throw error;
  }
  return (data || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    department: u.department,
    role: u.role,
    joinedDate: u.joined_date,
  }));
}

export async function loadRecordsFromDB() {
  const { data, error } = await supabase.from('attendance_records').select('*');
  if (error) {
    console.error('❌ loadRecordsFromDB error:', error);
    throw error;
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    date: r.date,
    shiftType: r.shift_type,
    overtimeStart: r.overtime_start,
    overtimeEnd: r.overtime_end,
    overtimeDescription: r.overtime_description || '',
    isHoliday: r.is_holiday,
    hourlyLeaveHours: r.hourly_leave_hours ?? null,
  }));
}

export async function loadGrantsFromDB() {
  const { data, error } = await supabase.from('paid_leave_grants').select('*');
  if (error) {
    console.error('❌ loadGrantsFromDB error:', error);
    throw error;
  }
  return (data || []).map((g: any) => ({
    id: g.id,
    userId: g.user_id,
    grantDate: g.grant_date,
    grantAmount: g.grant_amount,
    description: g.description || '',
  }));
}

export async function loadHourlyLeaveGrantsFromDB() {
  const { data, error } = await supabase.from('hourly_leave_grants').select('*');
  if (error) {
    console.error('❌ loadHourlyLeaveGrantsFromDB error:', error);
    throw error;
  }
  return (data || []).map((g: any) => ({
    id: g.id,
    userId: g.user_id,
    grantDate: g.grant_date,
    grantHours: g.grant_hours,
    description: g.description || '',
  }));
}

export async function saveUsersToDB(users: any[]) {
  const usersToSave = users.map(u => {
    if (!u.joinedDate) {
      console.error(`❌ User ${u.id} has no joinedDate! This should not happen.`);
      throw new Error(`User ${u.id} missing joinedDate`);
    }
    return {
      id: u.id,
      name: u.name,
      department: u.department,
      role: u.role,
      joined_date: u.joinedDate,
    };
  });
  console.log('💾 Saving users:', usersToSave);
  const { error } = await supabase.from('users').upsert(usersToSave);
  if (error) {
    console.error('❌ saveUsersToDB error:', error);
    throw error;
  }
}

export async function saveRecordsToDB(records: any[]) {
  const { error } = await supabase.from('attendance_records').upsert(
    records.map(r => ({
      id: r.id,
      user_id: r.userId,
      date: r.date,
      shift_type: r.shiftType,
      overtime_start: r.overtimeStart || null,
      overtime_end: r.overtimeEnd || null,
      overtime_description: r.overtimeDescription || '',
      is_holiday: r.isHoliday,
      hourly_leave_hours: r.hourlyLeaveHours ?? null,
    }))
  );
  if (error) {
    console.error('❌ saveRecordsToDB error:', error);
    throw error;
  }
}

export async function saveGrantsToDB(grants: any[]) {
  const { error } = await supabase.from('paid_leave_grants').upsert(
    grants.map(g => ({
      id: g.id,
      user_id: g.userId,
      grant_date: g.grantDate,
      grant_amount: g.grantAmount || g.days || 0,
      description: g.description || '',
    }))
  );
  if (error) {
    console.error('❌ saveGrantsToDB error:', error);
    throw error;
  }
}

export async function saveHourlyLeaveGrantsToDB(grants: any[]) {
  const { error } = await supabase.from('hourly_leave_grants').upsert(
    grants.map(g => ({
      id: g.id,
      user_id: g.userId,
      grant_date: g.grantDate,
      grant_hours: g.grantHours || 0,
      description: g.description || '',
    }))
  );
  if (error) {
    console.error('❌ saveHourlyLeaveGrantsToDB error:', error);
    throw error;
  }
}

export async function upsertRecord(record: any) {
  const { error } = await supabase.from('attendance_records').upsert({
    id: record.id,
    user_id: record.userId,
    date: record.date,
    shift_type: record.shiftType,
    overtime_start: record.overtimeStart || null,
    overtime_end: record.overtimeEnd || null,
    overtime_description: record.overtimeDescription || '',
    is_holiday: record.isHoliday,
    hourly_leave_hours: record.hourlyLeaveHours ?? null,
  });
  if (error) throw error;
}

export async function deleteRecord(recordId: string) {
  const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
  if (error) throw error;
}
