import React from 'react';
import { AttendanceRecord, PaidLeaveGrant, User } from '../types';
import {
  formatDateLocal,
  getWeekdayLabel,
  isJapaneseHoliday,
  isDefaultRestDay,
  calcSplitOvertimeMinutes,
  minutesToHHMM,
  calculatePaidLeaveBalance,
} from '../utils/dateUtils';
import { ShiftType, SHIFT_LABELS } from '../types';

interface Props {
  users: User[];
  allRecords: AttendanceRecord[];
  paidLeaveGrants: PaidLeaveGrant[];
  dates: Date[];
  period: { year: number; month: number; startDate: Date; endDate: Date };
}

const RED_SHIFTS = new Set([
  ShiftType.SUBSTITUTE_LEAVE,
  ShiftType.PAID_LEAVE,
  ShiftType.HALF_PAID_LEAVE,
  ShiftType.SPECIAL_LEAVE,
  ShiftType.ABSENCE,
]);

const WORK_SHIFTS = new Set([
  ShiftType.DAY,
  ShiftType.NIGHT,
  ShiftType.HOLIDAY_WORK,
  ShiftType.ON_CALL,
  ShiftType.TRAINING,
  ShiftType.TRIP,
]);

export default function AllAttendancePrint({ users, allRecords, paidLeaveGrants, dates, period }: Props) {
  return (
    <div className="print:block hidden font-['Noto_Sans_JP']">
      {users.map((user, userIndex) => {
        const records = allRecords.filter(r =>
          r.userId?.trim().toLowerCase() === user.id.trim().toLowerCase()
        );
        const recordMap = new Map(records.map(r => [r.date, r]));
        const paidLeave = calculatePaidLeaveBalance(paidLeaveGrants, records, user.id);

        let totalRegOt = 0, totalLnOt = 0;
        let workDays = 0, paidDays = 0, subDays = 0, holidayWorkDays = 0;

        dates.forEach(d => {
          const rec = recordMap.get(formatDateLocal(d));
          const isRestDay = isDefaultRestDay(d);
          const effectiveShift: ShiftType | null = rec?.shiftType ?? (isRestDay ? null : ShiftType.DAY);

          if (effectiveShift && WORK_SHIFTS.has(effectiveShift)) workDays++;

          if (rec) {
            const { regular, lateNight } = calcSplitOvertimeMinutes(rec.overtimeStart, rec.overtimeEnd);
            totalRegOt += regular;
            totalLnOt += lateNight;
            if (rec.shiftType === ShiftType.PAID_LEAVE) paidDays++;
            if (rec.shiftType === ShiftType.HALF_PAID_LEAVE) paidDays += 0.5;
            if (rec.shiftType === ShiftType.SUBSTITUTE_LEAVE) subDays++;
            if (rec.shiftType === ShiftType.HOLIDAY_WORK) holidayWorkDays++;
          }
        });

        return (
          <div
            key={user.id}
            style={{ pageBreakAfter: userIndex < users.length - 1 ? 'always' : 'avoid' }}
            className="p-6"
          >
            {/* ヘッダー */}
            <h1 className="text-2xl font-bold text-center mb-3">出　勤　簿</h1>
            <div className="flex justify-between text-xs mb-4 border-b pb-2">
              <span>期間：{formatDateLocal(period.startDate)} 〜 {formatDateLocal(period.endDate)}</span>
              <span>所属：{user.department}</span>
              <span>氏名：{user.name}</span>
              <span>有給残：{paidLeave.balance}日　代休使用：{subDays}日</span>
            </div>

            {/* テーブル */}
            <table className="w-full border-collapse text-[9pt]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 px-1 py-1 text-center w-12">日付</th>
                  <th className="border border-slate-400 px-1 py-1 text-center w-5">曜</th>
                  <th className="border border-slate-400 px-1 py-1 text-center w-16">区分</th>
                  <th className="border border-slate-400 px-1 py-1 text-center w-14">時間外開始</th>
                  <th className="border border-slate-400 px-1 py-1 text-center w-14">時間外終了</th>
                  <th className="border border-slate-400 px-1 py-1 text-center w-12">通常残業</th>
                  <th className="border border-slate-400 px-1 py-1 text-center w-12">深夜残業</th>
                </tr>
              </thead>
              <tbody>
                {dates.map(d => {
                  const dateStr = formatDateLocal(d);
                  const rec = recordMap.get(dateStr);
                  const dow = d.getDay();
                  const isHoliday = isJapaneseHoliday(d);
                  const isSun = dow === 0;
                  const isWed = dow === 3;
                  const isSat = dow === 6;
                  const isRestDay = isSun || isWed || isHoliday;
                  const isLeaveShift = rec && RED_SHIFTS.has(rec.shiftType);
                  const { regular: ro, lateNight: lo } = calcSplitOvertimeMinutes(
                    rec?.overtimeStart ?? null, rec?.overtimeEnd ?? null
                  );

                  const rowStyle: React.CSSProperties = isRestDay || isLeaveShift
                    ? { backgroundColor: '#fee2e2' }
                    : isSat ? { backgroundColor: '#e0f2fe' } : {};

                  const dowColor = isRestDay ? '#dc2626' : isSat ? '#2563eb' : '#374151';

                  // 区分表示（記録なしは自動）
                  const shiftLabel = rec
                    ? (SHIFT_LABELS[rec.shiftType as ShiftType] ?? rec.shiftType)
                    : isRestDay ? '公休' : '日勤';

                  // シフトタイプに応じた色を決定
                  const getShiftColor = (shift: string | null): string => {
                    if (shift === '公休') return '#dc2626'; // 赤
                    if (shift === '日勤') return '#2563eb'; // 青
                    if (rec?.shiftType === ShiftType.PAID_LEAVE || rec?.shiftType === ShiftType.HALF_PAID_LEAVE) return '#16a34a'; // 緑
                    return '#000000'; // 黒
                  };

                  const shiftColor = getShiftColor(shiftLabel);
                  const shiftFontWeight = (rec?.shiftType === ShiftType.PAID_LEAVE || rec?.shiftType === ShiftType.HALF_PAID_LEAVE) ? 'bold' : 'normal';

                  return (
                    <tr key={dateStr} style={rowStyle}>
                      <td className="border border-slate-400 px-1 py-0.5 text-center font-mono text-[8pt]">
                        {dateStr.slice(5).replace('-', '/')}
                      </td>
                      <td className="border border-slate-400 px-1 py-0.5 text-center font-bold text-[8pt]" style={{ color: dowColor }}>
                        {getWeekdayLabel(d)}
                      </td>
                      <td className="border border-slate-400 px-1 py-0.5 text-center text-[8pt]" style={{ color: shiftColor, fontWeight: shiftFontWeight }}>
                        {shiftLabel}
                      </td>
                      <td className="border border-slate-400 px-1 py-0.5 text-center font-mono text-[8pt]">
                        {rec?.overtimeStart ?? ''}
                      </td>
                      <td className="border border-slate-400 px-1 py-0.5 text-center font-mono text-[8pt]">
                        {rec?.overtimeEnd ?? ''}
                      </td>
                      <td className="border border-slate-400 px-1 py-0.5 text-center font-mono text-[8pt]">
                        {ro > 0 ? minutesToHHMM(ro) : ''}
                      </td>
                      <td className="border border-slate-400 px-1 py-0.5 text-center font-mono text-[8pt]">
                        {lo > 0 ? minutesToHHMM(lo) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
                  <td colSpan={3} className="border border-slate-600 px-2 py-1 text-right text-[8pt] font-bold">残業合計</td>
                  <td colSpan={2} className="border border-slate-600 px-1 py-1 text-right text-[8pt]">→</td>
                  <td className="border border-slate-600 px-1 py-1 text-center font-mono text-[8pt]">{minutesToHHMM(totalRegOt)}</td>
                  <td className="border border-slate-600 px-1 py-1 text-center font-mono text-[8pt]">{minutesToHHMM(totalLnOt)}</td>
                </tr>
                <tr style={{ backgroundColor: '#334155', color: 'white' }}>
                  <td colSpan={7} className="border border-slate-600 px-2 py-1 text-[8pt]">
                    出勤{workDays}日 有給{paidDays}日 代休{subDays}日{holidayWorkDays > 0 ? ` 休出${holidayWorkDays}日` : ''}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* 署名欄 */}
            <div className="mt-4 flex gap-6 justify-end text-xs">
              {['本人確認', '係長', '課長', '部長'].map(t => (
                <div key={t} className="text-center">
                  <div className="border border-slate-400 w-14 h-10 mb-1"></div>
                  <div>{t}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
