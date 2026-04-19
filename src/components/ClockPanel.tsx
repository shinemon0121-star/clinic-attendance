import React, { useState, useEffect } from 'react';
import { AttendanceRecord, PaidLeaveGrant, ShiftType, SHIFT_LABELS, SHIFT_COLORS, User } from '../types';
import { formatDateLocal, isDefaultRestDay, calculatePaidLeaveBalance } from '../utils/dateUtils';

interface Props {
  user: User;
  currentRecord: AttendanceRecord | undefined;
  subLeaveBalance: number;
  paidLeaveGrants: PaidLeaveGrant[];
  allRecords: AttendanceRecord[];
  onOpenToday: () => void;
}

export default function ClockPanel({
  user,
  currentRecord,
  subLeaveBalance,
  paidLeaveGrants,
  allRecords,
  onOpenToday,
}: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateLabel = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  const today = new Date();
  const isRestDay = isDefaultRestDay(today);
  const effectiveShift: ShiftType | null = currentRecord?.shiftType ?? (isRestDay ? null : ShiftType.DAY);

  const paidLeave = calculatePaidLeaveBalance(paidLeaveGrants, allRecords, user.id);

  // 今日に申請済みかどうか
  const hasRecord = !!currentRecord;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* 時計 */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 text-center">
        <div className="text-4xl font-black tracking-widest font-mono mb-1">{timeStr}</div>
        <div className="text-xs text-slate-300">{dateLabel}</div>
      </div>

      {/* ユーザー情報 */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-lg">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm">{user.name}</div>
            <div className="text-xs text-slate-500">{user.department}</div>
          </div>
          {user.role === 'ADMIN' && (
            <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
              管理者
            </span>
          )}
        </div>
      </div>

      {/* 本日の区分 */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">本日の区分</div>
        <div className="flex items-center gap-2">
          {effectiveShift ? (
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${SHIFT_COLORS[effectiveShift]}`}>
              {SHIFT_LABELS[effectiveShift]}
            </span>
          ) : (
            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700">
              公休
            </span>
          )}
          {hasRecord ? (
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">申請済み</span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">自動入力</span>
          )}
        </div>
        {currentRecord?.overtimeStart && currentRecord?.overtimeEnd && (
          <div className="mt-1.5 text-xs text-indigo-600 font-medium">
            時間外: {currentRecord.overtimeStart} 〜 {currentRecord.overtimeEnd}
          </div>
        )}
      </div>

      {/* 申請ボタン */}
      <div className="px-5 py-4 border-b border-slate-100">
        <button
          onClick={onOpenToday}
          className="w-full py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
        >
          {hasRecord ? '今日の申請を修正' : '今日を申請する'}
        </button>
        <p className="text-[10px] text-slate-400 text-center mt-1.5">
          時間外・有給・区分変更が必要な場合のみ申請
        </p>
      </div>

      {/* 休暇残高 */}
      <div className="px-5 py-4 bg-slate-50 grid grid-cols-2 gap-3">
        <div className="text-center">
          <div className="text-lg font-black text-slate-800">{paidLeave.balance}</div>
          <div className="text-[10px] text-slate-500 font-medium">有給残日数</div>
          <div className="text-[10px] text-slate-400">付与 {paidLeave.total} / 使用 {paidLeave.used}</div>
        </div>
        <div className="text-center border-l border-slate-200">
          <div className="text-lg font-black text-slate-800">{subLeaveBalance}</div>
          <div className="text-[10px] text-slate-500 font-medium">代休残日数</div>
        </div>
      </div>
    </div>
  );
}
