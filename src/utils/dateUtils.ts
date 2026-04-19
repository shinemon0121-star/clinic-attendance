import { AttendanceRecord, PaidLeaveGrant, ShiftType } from '../types';

// ─── 日本の祝日 ────────────────────────────────────────────────────────────────
const JAPANESE_HOLIDAYS = new Set([
  // 2024
  '2024-01-01','2024-01-08','2024-02-11','2024-02-12','2024-02-23',
  '2024-03-20','2024-04-29','2024-05-03','2024-05-04','2024-05-05',
  '2024-05-06','2024-07-15','2024-08-11','2024-08-12','2024-09-16',
  '2024-09-22','2024-09-23','2024-10-14','2024-11-03','2024-11-04','2024-11-23',
  // 2025
  '2025-01-01','2025-01-13','2025-02-11','2025-02-23','2025-02-24',
  '2025-03-20','2025-04-29','2025-05-03','2025-05-04','2025-05-05',
  '2025-05-06','2025-07-21','2025-08-11','2025-09-15','2025-09-23',
  '2025-10-13','2025-11-03','2025-11-23','2025-11-24',
  // 2026
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23','2026-03-20',
  '2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06',
  '2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23',
  '2026-10-12','2026-11-03','2026-11-23',
  // 2027
  '2027-01-01','2027-01-11','2027-02-11','2027-02-23','2027-03-21','2027-03-22',
  '2027-04-29','2027-05-03','2027-05-04','2027-05-05',
  '2027-07-19','2027-08-11','2027-09-20','2027-09-23',
  '2027-10-11','2027-11-03','2027-11-23',
]);

export function isJapaneseHoliday(date: Date): boolean {
  return JAPANESE_HOLIDAYS.has(formatDateLocal(date));
}

// ─── 日付フォーマット ────────────────────────────────────────────────────────
export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseAndFormatDate(str: string): string {
  if (!str) return '';

  const s = String(str).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // YYYY/MM/DD or YYYY/M/D
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  // YYYY年MM月DD日
  const ja = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (ja) {
    return `${ja[1]}-${ja[2].padStart(2, '0')}-${ja[3].padStart(2, '0')}`;
  }

  // Excel serial number (roughly 2000–2035)
  if (/^\d+$/.test(s)) {
    const serial = parseInt(s);
    if (serial > 36526 && serial < 50000) {
      const d = new Date(Math.round((serial - 25569) * 86400000));
      return formatDateLocal(d);
    }
  }

  // Fallback to Date constructor
  const d = new Date(s);
  if (!isNaN(d.getTime())) return formatDateLocal(d);

  return '';
}

// ─── 勤怠期間（15日締め：毎月16日～翌月15日） ────────────────────────────────
export function getAttendancePeriod(date: Date): {
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
} {
  const d = date.getDate();
  let startDate: Date;
  let endDate: Date;
  let year = date.getFullYear();
  let month = date.getMonth() + 1;

  if (d >= 16) {
    // 16日以降 → 当月16日～翌月15日
    startDate = new Date(year, month - 1, 16);
    endDate = new Date(year, month, 15);
    // year/month は期間の開始月を表す
  } else {
    // 1日～15日 → 前月16日～当月15日
    month = month === 1 ? 12 : month - 1;
    year = month === 12 ? year - 1 : year;
    startDate = new Date(year, month - 1, 16);
    endDate = new Date(year, month, 15);
  }

  return { year, month, startDate, endDate };
}

export function getDatesInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ─── 勤務時間計算 ────────────────────────────────────────────────────────────
export function timeToMinutes(time: string | null): number {
  if (!time) return 0;
  const parts = time.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return h * 60 + m;
}

export function minutesToHHMM(minutes: number): string {
  if (minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** 勤務時間（分）を返す。6時間超で45分、8時間超で60分の休憩を差し引く */
export function calcWorkMinutes(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0;
  let diff = timeToMinutes(checkOut) - timeToMinutes(checkIn);
  if (diff <= 0) diff += 24 * 60; // 日を跨ぐ場合（夜勤等）
  // 休憩時間は記載しない（引き算なし）
  return Math.max(0, diff);
}

/**
 * 残業時間を30分刻みで切り捨てて、通常残業と深夜残業（22:00〜翌5:00）に分割して返す
 * 例: 17:00〜18:32 → total:90, regular:90, lateNight:0
 *     20:00〜23:30 → total:210, regular:120, lateNight:90
 */
export function calcSplitOvertimeMinutes(
  overtimeStart: string | null,
  overtimeEnd: string | null
): { regular: number; lateNight: number; total: number } {
  if (!overtimeStart || !overtimeEnd) return { regular: 0, lateNight: 0, total: 0 };

  let sMin = timeToMinutes(overtimeStart);
  let eMin = timeToMinutes(overtimeEnd);
  if (eMin <= sMin) eMin += 1440; // 日跨ぎ

  const rawTotal = eMin - sMin;
  // 30分刻み切り捨て
  const total = Math.floor(rawTotal / 30) * 30;
  if (total <= 0) return { regular: 0, lateNight: 0, total: 0 };

  const effectiveEnd = sMin + total;

  // 深夜帯: 22:00(1320)〜24:00(1440) および 0:00(0 or 1440)〜5:00(300 or 1740)
  let lateNight = 0;

  // ① 22:00〜24:00 との交差
  const e1s = Math.max(sMin, 1320);
  const e1e = Math.min(effectiveEnd, 1440);
  if (e1e > e1s) lateNight += e1e - e1s;

  // ② 日を跨いだ場合の 0:00〜5:00 (24h+表記: 1440〜1740)
  if (effectiveEnd > 1440) {
    const e2s = Math.max(sMin, 1440);
    const e2e = Math.min(effectiveEnd, 1740);
    if (e2e > e2s) lateNight += e2e - e2s;
  }

  // ③ 日を跨がない早朝の場合（0:00〜5:00）
  if (effectiveEnd <= 1440 && sMin < 300) {
    const e3s = sMin;
    const e3e = Math.min(effectiveEnd, 300);
    if (e3e > e3s) lateNight += e3e - e3s;
  }

  return {
    regular: Math.max(0, total - lateNight),
    lateNight: Math.max(0, lateNight),
    total,
  };
}

/** 公休日（日曜・水曜・祝日）かどうかを判定する */
export function isDefaultRestDay(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 3 || isJapaneseHoliday(date);
}

/** 残業時間合計（30分切り捨て後）を返す */
export function calcOvertimeMinutes(
  overtimeStart: string | null,
  overtimeEnd: string | null
): number {
  return calcSplitOvertimeMinutes(overtimeStart, overtimeEnd).total;
}

// ─── 残業時間合計 ────────────────────────────────────────────────────────────
export function calcTotalOvertimeMinutes(records: AttendanceRecord[]): number {
  return records.reduce((sum, r) => sum + calcOvertimeMinutes(r.overtimeStart, r.overtimeEnd), 0);
}

// ─── 代休残高 ────────────────────────────────────────────────────────────────
export function calculateSubstituteLeaveBalance(
  records: AttendanceRecord[],
  userId: string
): number {
  const uid = userId.trim().toLowerCase();
  const userRecs = records.filter(r => r.userId?.trim().toLowerCase() === uid);
  const earned = userRecs.filter(r => r.shiftType === ShiftType.HOLIDAY_WORK).length;
  const used = userRecs.filter(r => r.shiftType === ShiftType.SUBSTITUTE_LEAVE).length;
  return earned - used;
}

// ─── 有給残高 ────────────────────────────────────────────────────────────────
export function calculatePaidLeaveBalance(
  grants: PaidLeaveGrant[],
  records: AttendanceRecord[],
  userId: string
): { total: number; used: number; balance: number } {
  const uid = userId.trim().toLowerCase();
  const total = grants
    .filter(g => g.userId?.trim().toLowerCase() === uid)
    .reduce((sum, g) => sum + g.grantAmount, 0);
  const userRecs = records.filter(r => r.userId?.trim().toLowerCase() === uid);
  const used = userRecs.reduce((sum, r) => {
    if (r.shiftType === ShiftType.PAID_LEAVE) return sum + 1;
    if (r.shiftType === ShiftType.HALF_PAID_LEAVE) return sum + 0.5;
    return sum;
  }, 0);
  return { total, used, balance: total - used };
}

// ─── 曜日ラベル ──────────────────────────────────────────────────────────────
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
export function getWeekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()];
}

// ─── 法定有給付与スケジュール自動計算 ────────────────────────────────────────
// 労働基準法に基づく付与日数
const PAID_LEAVE_SCHEDULE = [
  { months:  6, days: 10 },
  { months: 18, days: 11 },
  { months: 30, days: 12 },
  { months: 42, days: 13 },
  { months: 54, days: 16 },
  { months: 66, days: 18 },
  // 78ヶ月（6年6ヶ月）以降は12ヶ月ごとに20日
];

export interface AutoPaidLeaveGrant {
  months: number;      // 入社からの経過月数
  grantDate: string;   // 付与日（YYYY-MM-DD）
  grantAmount: number; // 付与日数
  label: string;       // 表示ラベル（例: 入社1年6ヶ月）
}

/** 入社日を基に、today までに付与されるべき有給スケジュールを返す */
export function calcAutoPaidLeaveGrants(joinedDate: string, today?: Date): AutoPaidLeaveGrant[] {
  if (!joinedDate) return [];
  const joined = new Date(joinedDate);
  if (isNaN(joined.getTime())) return [];
  const cutoff = today ?? new Date();
  const result: AutoPaidLeaveGrant[] = [];

  const addGrant = (months: number, days: number) => {
    const d = new Date(joined);
    d.setMonth(d.getMonth() + months);
    if (d > cutoff) return false; // まだ未到来
    const y = Math.floor(months / 12);
    const m = months % 12;
    const label =
      y === 0 ? `入社${m}ヶ月` :
      m === 0 ? `入社${y}年` :
      `入社${y}年${m}ヶ月`;
    result.push({ months, grantDate: formatDateLocal(d), grantAmount: days, label });
    return true;
  };

  // 固定スケジュール（6ヶ月〜66ヶ月）
  for (const s of PAID_LEAVE_SCHEDULE) {
    if (!addGrant(s.months, s.days)) break;
  }

  // 78ヶ月以降は12ヶ月ごとに20日を繰り返す
  let m = 78;
  while (m < 1200) {
    if (!addGrant(m, 20)) break;
    m += 12;
  }

  return result;
}
