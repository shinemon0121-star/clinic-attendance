import { AttendanceRecord, PaidLeaveGrant, ShiftType, SHIFT_LABELS, SHIFT_COLORS, User } from '../types';
import {
  formatDateLocal,
  getWeekdayLabel,
  isJapaneseHoliday,
  isDefaultRestDay,
  calcSplitOvertimeMinutes,
  minutesToHHMM,
  calculatePaidLeaveBalance,
} from '../utils/dateUtils';

interface Props {
  user: User;
  records: AttendanceRecord[];
  dates: Date[];
  paidLeaveGrants: PaidLeaveGrant[];
  onEditRequest: (date: Date, record: AttendanceRecord | undefined) => void;
  onPrintRequest: (record: AttendanceRecord) => void;
}

// 有給系（行を赤背景にする区分）
const RED_SHIFTS = new Set([
  ShiftType.PUBLIC_HOLIDAY,
  ShiftType.SUBSTITUTE_LEAVE,
  ShiftType.PAID_LEAVE,
  ShiftType.HALF_PAID_LEAVE,
  ShiftType.SPECIAL_LEAVE,
  ShiftType.ABSENCE,
]);

// 出勤扱いの区分
const WORK_SHIFTS = new Set([
  ShiftType.DAY,
  ShiftType.NIGHT,
  ShiftType.DAY_AND_NIGHT,
  ShiftType.HOLIDAY_WORK,
  ShiftType.ON_CALL,
  ShiftType.TRAINING,
  ShiftType.TRIP,
]);

function StatCard({
  label, value, unit, sub, color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  color: 'blue' | 'indigo' | 'violet' | 'green' | 'emerald' | 'teal' | 'red' | 'slate';
}) {
  const colorMap: Record<string, string> = {
    blue:    'bg-blue-50 border-blue-200 text-blue-800',
    indigo:  'bg-indigo-50 border-indigo-200 text-indigo-800',
    violet:  'bg-violet-50 border-violet-200 text-violet-800',
    green:   'bg-green-50 border-green-200 text-green-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    teal:    'bg-teal-50 border-teal-200 text-teal-800',
    red:     'bg-red-50 border-red-200 text-red-800',
    slate:   'bg-slate-50 border-slate-200 text-slate-800',
  };
  return (
    <div className={`border rounded-2xl px-4 py-3 flex flex-col gap-0.5 ${colorMap[color]}`}>
      <div className="text-[10px] font-bold opacity-70 tracking-wide">{label}</div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-black leading-none">{value}</span>
        {unit && <span className="text-xs font-bold mb-0.5 opacity-80">{unit}</span>}
      </div>
      {sub && <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AttendanceTable({
  user,
  records,
  dates,
  paidLeaveGrants,
  onEditRequest,
  onPrintRequest,
}: Props) {
  const recordMap = new Map(records.map(r => [r.date, r]));
  const periodEndDate = dates.length > 0 ? dates[dates.length - 1] : new Date();
  const paidLeave = calculatePaidLeaveBalance(paidLeaveGrants, records, user.id, periodEndDate);

  // ── 集計 ──────────────────────────────────────────────────────────────
  let totalRegularOtMin = 0;
  let totalLateNightOtMin = 0;
  let workDays = 0;
  let holidayWorkDays = 0;
  let paidLeaveDays = 0;
  let halfPaidLeaveDays = 0;
  let subLeaveDays = 0;

  dates.forEach(d => {
    const rec = recordMap.get(formatDateLocal(d));
    const isRestDay = isDefaultRestDay(d);

    // 実効区分（記録なしは自動判定）
    const effectiveShift: ShiftType | null = rec?.shiftType ?? (isRestDay ? null : ShiftType.DAY);

    // 出勤日数（WORK_SHIFTSに含まれる区分）
    if (effectiveShift && WORK_SHIFTS.has(effectiveShift)) workDays++;

    if (rec) {
      const { regular, lateNight } = calcSplitOvertimeMinutes(rec.overtimeStart, rec.overtimeEnd);
      totalRegularOtMin += regular;
      totalLateNightOtMin += lateNight;
      if (rec.shiftType === ShiftType.HOLIDAY_WORK) holidayWorkDays++;
      if (rec.shiftType === ShiftType.PAID_LEAVE)      paidLeaveDays++;
      if (rec.shiftType === ShiftType.HALF_PAID_LEAVE) halfPaidLeaveDays++;
      if (rec.shiftType === ShiftType.SUBSTITUTE_LEAVE) subLeaveDays++;
    }
  });

  const periodPaidUsed = paidLeaveDays + halfPaidLeaveDays * 0.5;
  const paidLeaveAfterPeriod = paidLeave.balance;
  // 公休合計 = 元々公休日(水・日・祝)で記録なし + 手動で公休を選択した日
  const publicRestDays = dates.filter(d => {
    const dateStr = formatDateLocal(d);
    const rec = recordMap.get(dateStr);
    if (rec?.shiftType === ShiftType.PUBLIC_HOLIDAY) return true;
    if (!isDefaultRestDay(d)) return false;
    return !rec; // 記録がある＝別の区分に変更済みなので公休としてカウントしない
  }).length;
  const totalOtMin = totalRegularOtMin + totalLateNightOtMin;

  return (
    <div>
      {/* ── サマリーカードグリッド ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6 no-print">
        <StatCard
          label="出勤日数"
          value={workDays}
          unit="日"
          sub={holidayWorkDays > 0 ? `うち休出 ${holidayWorkDays}日` : undefined}
          color="blue"
        />
        <StatCard
          label="公休合計"
          value={publicRestDays}
          unit="日"
          sub="水・日・祝"
          color="red"
        />
        <StatCard
          label="通常時間外"
          value={minutesToHHMM(totalRegularOtMin)}
          sub={`深夜 ${minutesToHHMM(totalLateNightOtMin)} / 計 ${minutesToHHMM(totalOtMin)}`}
          color="indigo"
        />
        <StatCard
          label="深夜時間外"
          value={minutesToHHMM(totalLateNightOtMin)}
          sub="22:00〜翌5:00"
          color="violet"
        />
        <StatCard
          label="今月有給消化"
          value={periodPaidUsed}
          unit="日"
          sub={halfPaidLeaveDays > 0 ? `半日 ${halfPaidLeaveDays}回含む` : undefined}
          color="teal"
        />
        <StatCard
          label="有給残高"
          value={paidLeaveAfterPeriod}
          unit="日"
          sub={`累計付与 ${paidLeave.total}日`}
          color="green"
        />
        <StatCard
          label="代休使用日数"
          value={subLeaveDays}
          unit="日"
          color="red"
        />
      </div>

      {/* 印刷用サマリー */}
      <div className="hidden print:block mb-4 text-xs border border-slate-300 rounded p-3">
        <div className="grid grid-cols-7 gap-3 text-center">
          {[
            { label: '出勤日数',     value: `${workDays}日`,                      color: '#1d4ed8' },
            { label: '公休合計',     value: `${publicRestDays}日`,                color: '#dc2626' },
            { label: '通常時間外',   value: minutesToHHMM(totalRegularOtMin),     color: '#4338ca' },
            { label: '深夜時間外',   value: minutesToHHMM(totalLateNightOtMin),   color: '#7c3aed' },
            { label: '今月有給消化', value: `${periodPaidUsed}日`,                color: '#0f766e' },
            { label: '有給残高',     value: `${paidLeaveAfterPeriod}日`,          color: '#15803d' },
            { label: '代休使用日数', value: `${subLeaveDays}日`,                  color: '#dc2626' },
          ].map(item => (
            <div key={item.label} className="border border-slate-300 rounded p-1">
              <div className="text-[8pt] text-slate-500">{item.label}</div>
              <div className="text-[11pt] font-black" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 勤務テーブル ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="border border-slate-200 px-2 py-2 text-center w-14">日付</th>
              <th className="border border-slate-200 px-2 py-2 text-center w-7">曜</th>
              <th className="border border-slate-200 px-2 py-2 text-center w-20">区分</th>
              <th className="border border-slate-200 px-2 py-2 text-center w-20">時間外開始</th>
              <th className="border border-slate-200 px-2 py-2 text-center w-20">時間外終了</th>
              <th className="border border-slate-200 px-2 py-2 text-center w-20">通常残業</th>
              <th className="border border-slate-200 px-2 py-2 text-center w-20">深夜残業</th>
              <th className="border border-slate-200 px-2 py-2 text-left no-print max-w-[80px]">業務内容・備考</th>
              <th className="border border-slate-200 px-2 py-2 text-center no-print w-14">操作</th>
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
              const today = formatDateLocal(new Date()) === dateStr;
              const isLeaveShift = rec && RED_SHIFTS.has(rec.shiftType);

              const { regular: regOt, lateNight: lnOt } = calcSplitOvertimeMinutes(
                rec?.overtimeStart ?? null,
                rec?.overtimeEnd ?? null,
              );

              const rowBg = today
                ? 'bg-blue-50'
                : isRestDay || isLeaveShift
                ? 'bg-red-50'
                : isSat
                ? 'bg-sky-50'
                : '';

              const dowColor = isRestDay
                ? 'text-red-600 font-bold'
                : isSat
                ? 'text-blue-600 font-bold'
                : 'text-slate-600';

              return (
                <tr key={dateStr} className={`hover:brightness-95 ${rowBg}`}>
                  <td className={`border border-slate-200 px-2 py-1.5 text-center font-mono ${today ? 'font-black text-blue-700' : ''}`}>
                    {dateStr.slice(5).replace('-', '/')}
                  </td>
                  <td className={`border border-slate-200 px-2 py-1.5 text-center ${dowColor}`}>
                    {getWeekdayLabel(d)}
                  </td>
                  {/* 区分: 記録ありはそのまま表示、なしは自動表示（薄色） */}
                  <td className="border border-slate-200 px-1 py-1.5 text-center">
                    {rec ? (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${SHIFT_COLORS[rec.shiftType as ShiftType] ?? 'bg-slate-100 text-slate-600'}`}>
                        {SHIFT_LABELS[rec.shiftType as ShiftType] ?? rec.shiftType}
                      </span>
                    ) : isRestDay ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-400">
                        公休
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-400">
                        日勤
                      </span>
                    )}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-mono">
                    {rec?.overtimeStart ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-mono">
                    {rec?.overtimeEnd ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-mono">
                    {regOt > 0 ? <span className="text-indigo-700 font-bold">{minutesToHHMM(regOt)}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-center font-mono">
                    {lnOt > 0 ? <span className="text-violet-700 font-bold">{minutesToHHMM(lnOt)}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="border border-slate-200 px-2 py-1.5 text-slate-500 no-print max-w-[160px] truncate">
                    {rec?.overtimeDescription || ''}
                  </td>
                  <td className="border border-slate-200 px-1 py-1.5 text-center no-print">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => onEditRequest(d, rec)}
                        className={`text-[10px] px-1.5 py-1 rounded font-bold transition-colors ${
                          rec
                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800'
                            : 'bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                        }`}
                      >
                        {rec ? '修正' : '申請'}
                      </button>
                      {rec && isLeaveShift && (
                        <button
                          onClick={() => onPrintRequest(rec)}
                          className="text-[10px] px-1.5 py-1 bg-slate-100 hover:bg-green-100 text-slate-600 hover:text-green-700 rounded font-bold transition-colors"
                        >
                          届出
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800 text-white font-bold text-xs">
              <td colSpan={2} className="border border-slate-600 px-3 py-2 text-right">集計</td>
              <td colSpan={2} className="border border-slate-600 px-2 py-2 text-right">残業合計</td>
              <td colSpan={1} className="border border-slate-600 px-2 py-2 text-right">→</td>
              <td className="border border-slate-600 px-2 py-2 text-center font-mono text-indigo-200">
                {minutesToHHMM(totalRegularOtMin)}
              </td>
              <td className="border border-slate-600 px-2 py-2 text-center font-mono text-violet-200">
                {minutesToHHMM(totalLateNightOtMin)}
              </td>
              <td colSpan={2} className="border border-slate-600 px-2 py-2 no-print text-xs">
                出勤{workDays}日　公休{publicRestDays}日　有給{periodPaidUsed}日　代休{subLeaveDays}日{holidayWorkDays > 0 ? `　休出${holidayWorkDays}日` : ''}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
