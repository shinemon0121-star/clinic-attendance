export enum ShiftType {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
  HOLIDAY_WORK = 'HOLIDAY_WORK',
  PAID_LEAVE = 'PAID_LEAVE',
  HALF_PAID_LEAVE = 'HALF_PAID_LEAVE',
  SUBSTITUTE_LEAVE = 'SUBSTITUTE_LEAVE',
  ABSENCE = 'ABSENCE',
  SPECIAL_LEAVE = 'SPECIAL_LEAVE',
  ON_CALL = 'ON_CALL',
  TRAINING = 'TRAINING',
}

export const SHIFT_LABELS: Record<ShiftType, string> = {
  [ShiftType.DAY]: '日勤',
  [ShiftType.NIGHT]: '夜勤',
  [ShiftType.HOLIDAY_WORK]: '休日出勤',
  [ShiftType.PAID_LEAVE]: '有給休暇',
  [ShiftType.HALF_PAID_LEAVE]: '半日有給',
  [ShiftType.SUBSTITUTE_LEAVE]: '代休',
  [ShiftType.ABSENCE]: '欠勤',
  [ShiftType.SPECIAL_LEAVE]: '特別休暇',
  [ShiftType.ON_CALL]: 'オンコール',
  [ShiftType.TRAINING]: '研修',
};

export const SHIFT_COLORS: Record<ShiftType, string> = {
  [ShiftType.DAY]: 'bg-blue-100 text-blue-800',
  [ShiftType.NIGHT]: 'bg-indigo-100 text-indigo-800',
  [ShiftType.HOLIDAY_WORK]: 'bg-red-100 text-red-800',
  [ShiftType.PAID_LEAVE]: 'bg-green-100 text-green-800',
  [ShiftType.HALF_PAID_LEAVE]: 'bg-teal-100 text-teal-800',
  [ShiftType.SUBSTITUTE_LEAVE]: 'bg-red-100 text-red-700',
  [ShiftType.ABSENCE]: 'bg-rose-100 text-rose-800',
  [ShiftType.SPECIAL_LEAVE]: 'bg-purple-100 text-purple-800',
  [ShiftType.ON_CALL]: 'bg-orange-100 text-orange-800',
  [ShiftType.TRAINING]: 'bg-cyan-100 text-cyan-800',
};

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string | null;   // 打刻廃止（後方互換のため保持）
  checkOut?: string | null;  // 打刻廃止（後方互換のため保持）
  shiftType: ShiftType;
  overtimeStart: string | null;
  overtimeEnd: string | null;
  overtimeDescription: string;
  isHoliday: boolean;
}

export interface User {
  id: string;
  name: string;
  department: string;
  role: 'ADMIN' | 'STAFF';
  joinedDate: string;
}

export interface AppSettings {
  spreadsheetUrl: string;
  displaySpreadsheetUrl: string;
}

export interface PaidLeaveGrant {
  id: string;
  userId: string;
  grantDate: string;
  grantAmount: number;
  description: string;
}
