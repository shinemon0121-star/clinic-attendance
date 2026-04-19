import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Supabase の環境変数が設定されていません。.env.local を確認してください。');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// データベース操作関数
export async function loadUsersFromDB() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data || [];
}

export async function loadRecordsFromDB() {
  const { data, error } = await supabase.from('attendance_records').select('*');
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    date: r.date,
    shiftType: r.shift_type,
    overtimeStart: r.overtime_start,
    overtimeEnd: r.overtime_end,
    overtimeDescription: r.overtime_description || '',
    isHoliday: r.is_holiday,
  }));
}

export async function loadGrantsFromDB() {
  const { data, error } = await supabase.from('paid_leave_grants').select('*');
  if (error) throw error;
  return (data || []).map((g: any) => ({
    id: g.id,
    userId: g.user_id,
    grantDate: g.grant_date,
    grantAmount: g.grant_amount,
    description: g.description || '',
  }));
}

export async function saveUsersToDB(users: any[]) {
  const { error } = await supabase.from('users').delete().neq('id', '');
  if (error) throw error;
  const { error: insertError } = await supabase.from('users').insert(
    users.map(u => ({
      id: u.id,
      name: u.name,
      department: u.department,
      role: u.role,
      joined_date: u.joinedDate,
    }))
  );
  if (insertError) throw insertError;
}

export async function saveRecordsToDB(records: any[]) {
  const { error } = await supabase.from('attendance_records').delete().neq('id', '');
  if (error) throw error;
  const { error: insertError } = await supabase.from('attendance_records').insert(
    records.map(r => ({
      id: r.id,
      user_id: r.userId,
      date: r.date,
      shift_type: r.shiftType,
      overtime_start: r.overtimeStart || null,
      overtime_end: r.overtimeEnd || null,
      overtime_description: r.overtimeDescription || '',
      is_holiday: r.isHoliday,
    }))
  );
  if (insertError) throw insertError;
}

export async function saveGrantsToDB(grants: any[]) {
  const { error } = await supabase.from('paid_leave_grants').delete().neq('id', '');
  if (error) throw error;
  const { error: insertError } = await supabase.from('paid_leave_grants').insert(
    grants.map(g => ({
      id: g.id,
      user_id: g.userId,
      grant_date: g.grantDate,
      grant_amount: g.grantAmount || g.days || 0,
      description: g.description || '',
    }))
  );
  if (insertError) throw insertError;
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
  });
  if (error) throw error;
}

export async function deleteRecord(recordId: string) {
  const { error } = await supabase.from('attendance_records').delete().eq('id', recordId);
  if (error) throw error;
}
