import React, { useState, useEffect } from 'react';
import { AttendanceRecord, ShiftType, SHIFT_LABELS } from '../types';
import { formatDateLocal, getWeekdayLabel, isJapaneseHoliday, isDefaultRestDay } from '../utils/dateUtils';

interface Props {
  date: Date;
  record: AttendanceRecord | undefined;
  onSave: (rec: AttendanceRecord) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const ALL_SHIFTS = Object.values(ShiftType);

export default function EditRecordModal({ date, record, onSave, onDelete, onClose }: Props) {
  const dateStr = formatDateLocal(date);
  const isRestDay = isDefaultRestDay(date);

  // 休日でレコードがない場合は休日出勤をデフォルトに、平日は日勤
  const defaultShift = record?.shiftType ?? (isRestDay ? ShiftType.HOLIDAY_WORK : ShiftType.DAY);

  const [shiftType, setShiftType] = useState<ShiftType>(defaultShift);
  const [overtimeStart, setOvertimeStart] = useState(record?.overtimeStart ?? '17:00');
  const [overtimeEnd, setOvertimeEnd] = useState(record?.overtimeEnd ?? '');
  const [overtimeDesc, setOvertimeDesc] = useState(record?.overtimeDescription ?? '');

  useEffect(() => {
    const s = record?.shiftType ?? (isDefaultRestDay(date) ? ShiftType.HOLIDAY_WORK : ShiftType.DAY);
    setShiftType(s);
    setOvertimeStart(record?.overtimeStart ?? '17:00');
    setOvertimeEnd(record?.overtimeEnd ?? '');
    setOvertimeDesc(record?.overtimeDescription ?? '');
  }, [record, dateStr]);

  const handleSave = () => {
    // overtimeEnd が空の場合、現在の時刻を自動入力
    const finalOvertimeEnd = overtimeEnd || (() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    })();

    const rec: AttendanceRecord = {
      id: record?.id ?? `${dateStr}-new`,
      userId: record?.userId ?? '',
      date: dateStr,
      shiftType,
      overtimeStart: overtimeStart || null,
      overtimeEnd: finalOvertimeEnd || null,
      overtimeDescription: overtimeDesc,
      isHoliday: isJapaneseHoliday(date),
    };
    onSave(rec);
  };

  const handleDelete = () => {
    if (window.confirm('この日の申請を取り消し、自動入力に戻しますか？')) {
      onDelete?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-slate-800 text-lg">
            {dateStr.replace(/-/g, '/')} ({getWeekdayLabel(date)})
            {isJapaneseHoliday(date) && <span className="ml-2 text-xs text-red-600 font-bold">祝日</span>}
            {isRestDay && !isJapaneseHoliday(date) && <span className="ml-2 text-xs text-red-600 font-bold">公休</span>}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold">✕</button>
        </div>

        {!record && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-medium">
            {isRestDay
              ? '公休日への申請（休日出勤・代休等）です。'
              : '通常日勤日への申請（時間外・有給等）です。変更が必要な場合のみ保存してください。'}
          </div>
        )}

        <div className="space-y-4">
          {/* 勤務区分 */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-2">勤務区分</label>
            <div className="grid grid-cols-3 gap-1.5">
              {ALL_SHIFTS.map(s => (
                <button
                  key={s}
                  onClick={() => setShiftType(s)}
                  className={`text-xs py-1.5 px-2 rounded-lg font-bold border transition-all ${
                    shiftType === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {SHIFT_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* 時間外 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">時間外開始時刻</label>
              <input
                type="time"
                value={overtimeStart}
                onChange={e => setOvertimeStart(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">時間外終了時刻</label>
              <input
                type="time"
                value={overtimeEnd}
                onChange={e => setOvertimeEnd(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* 業務内容・備考 */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">業務内容・備考</label>
            <textarea
              value={overtimeDesc}
              onChange={e => setOvertimeDesc(e.target.value)}
              rows={3}
              placeholder="例：緊急透析対応、翌日症例準備 など"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all"
          >
            申請保存
          </button>
          {record && (
            <button
              onClick={handleDelete}
              className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 active:scale-95 transition-all"
            >
              取消
            </button>
          )}
          {record && (
            <button
              onClick={() => {
                if (window.confirm('届出を印刷しますか？')) onClose();
              }}
              className="px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-bold hover:bg-green-100 active:scale-95 transition-all"
            >
              届出
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 active:scale-95 transition-all"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
