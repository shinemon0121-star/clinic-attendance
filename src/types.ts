export enum ShiftType {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
  DAY_AND_NIGHT = 'DAY_AND_NIGHT',
  HOLIDAY_WORK = 'HOLIDAY_WORK',
  PUBLIC_HOLIDAY = 'PUBLIC_HOLIDAY',
  PAID_LEAVE = 'PAID_LEAVE',
  HALF_PAID_LEAVE = 'HALF_PAID_LEAVE',
  SUBSTITUTE_LEAVE = 'SUBSTITUTE_LEAVE',
  ABSENCE = 'ABSENCE',
  SPECIAL_LEAVE = 'SPECIAL_LEAVE',
  ON_CALL = 'ON_CALL',
  TRAINING = 'TRAINING',
  TRIP = 'TRIP',
  ILLNESS = 'ILLNESS',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
  OTHER = 'OTHER',
}

export const SHIFT_LABELS: Record<ShiftType, string> = {
  [ShiftType.DAY]: '日勤',
  [ShiftType.NIGHT]: '夜勤',
  [ShiftType.DAY_AND_NIGHT]: '日勤+夜勤',
  [ShiftType.HOLIDAY_WORK]: '休日出勤',
  [ShiftType.PUBLIC_HOLIDAY]: '公休',
  [ShiftType.PAID_LEAVE]: '有給休暇',
  [ShiftType.HALF_PAID_LEAVE]: '半日有給',
  [ShiftType.SUBSTITUTE_LEAVE]: '代休',
  [ShiftType.ABSENCE]: '欠勤',
  [ShiftType.SPECIAL_LEAVE]: '特別休暇',
  [ShiftType.ON_CALL]: 'オンコール',
  [ShiftType.TRAINING]: '研修',
  [ShiftType.TRIP]: '出張',
  [ShiftType.ILLNESS]: '病気',
  [ShiftType.LATE]: '遅刻',
  [ShiftType.EARLY_LEAVE]: '早退',
  [ShiftType.OTHER]: 'その他',
};

export const SHIFT_COLORS: Record<ShiftType, string> = {
  [ShiftType.DAY]: 'bg-blue-100 text-blue-800',
  [ShiftType.NIGHT]: 'bg-indigo-100 text-indigo-800',
  [ShiftType.DAY_AND_NIGHT]: 'bg-violet-100 text-violet-800',
  [ShiftType.HOLIDAY_WORK]: 'bg-red-100 text-red-800',
  [ShiftType.PUBLIC_HOLIDAY]: 'bg-red-100 text-red-700',
  [ShiftType.PAID_LEAVE]: 'bg-green-100 text-green-800',
  [ShiftType.HALF_PAID_LEAVE]: 'bg-teal-100 text-teal-800',
  [ShiftType.SUBSTITUTE_LEAVE]: 'bg-red-100 text-red-700',
  [ShiftType.ABSENCE]: 'bg-rose-100 text-rose-800',
  [ShiftType.SPECIAL_LEAVE]: 'bg-purple-100 text-purple-800',
  [ShiftType.ON_CALL]: 'bg-orange-100 text-orange-800',
  [ShiftType.TRAINING]: 'bg-cyan-100 text-cyan-800',
  [ShiftType.TRIP]: 'bg-lime-100 text-lime-800',
  [ShiftType.ILLNESS]: 'bg-yellow-100 text-yellow-800',
  [ShiftType.LATE]: 'bg-orange-100 text-orange-800',
  [ShiftType.EARLY_LEAVE]: 'bg-orange-100 text-orange-800',
  [ShiftType.OTHER]: 'bg-slate-100 text-slate-800',
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
  // 申請書情報（病気、遅刻、早退、その他、有給系で使用）
  applicationReason?: string; // 申請理由
  applicationStartDate?: string; // 申請開始日
  applicationEndDate?: string; // 申請終了日
  applicationDurationType?: '日数' | '時間'; // 日数か時間か
  applicationDurationDays?: number; // 日数
  applicationStartTime?: string; // 開始時刻（午前/午後）
  applicationEndTime?: string; // 終了時刻（午前/午後）
  applicationOtherRemarks?: string; // その他特記事項
  hourlyLeaveHours?: number | null; // 時間休（1〜7時間、日勤の日のみ）
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

// 時間単位の年次有給休暇（時間休）の付与記録。単位は「時間」
export interface HourlyLeaveGrant {
  id: string;
  userId: string;
  grantDate: string;
  grantHours: number;
  description: string;
}

export interface ApplicationForm {
  id: string;
  userId: string;
  date: string; // 申請日
  applicationType: '休暇届' | '欠勤届';
  shiftType: ShiftType;
  reason: string; // 理由
  startDate: string; // 開始日
  startDayOfWeek?: string; // 開始日の曜日
  endDate?: string; // 終了日
  endDayOfWeek?: string; // 終了日の曜日
  durationType: '日数' | '時間'; // 日数か時間か
  durationDays?: number; // 日数
  startTime?: string; // 開始時刻（午前/午後）
  endTime?: string; // 終了時刻（午前/午後）
  durationHours?: number; // 時間数
  otherRemarks?: string; // その他
  approvals?: {
    director?: boolean;
    director_timestamp?: string;
    medical_director?: boolean;
    medical_director_timestamp?: string;
    admin_director?: boolean;
    admin_director_timestamp?: string;
    admin_manager?: boolean;
    admin_manager_timestamp?: string;
    department_head?: boolean;
    department_head_timestamp?: string;
  };
}
