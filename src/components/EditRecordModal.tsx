import React, { useState, useEffect } from 'react';
import { AttendanceRecord, ShiftType, SHIFT_LABELS } from '../types';
import { formatDateLocal, getWeekdayLabel, isJapaneseHoliday, isDefaultRestDay } from '../utils/dateUtils';

interface Props {
  date: Date;
  record: AttendanceRecord | undefined;
  onSave: (rec: AttendanceRecord) => void;
  onDelete?: () => void;
  onClose: () => void;
  onPrintApplicationForm?: (rec: AttendanceRecord) => void;
}

const ALL_SHIFTS = Object.values(ShiftType);

// 申請書が必要な勤務区分
const REQUIRES_APPLICATION = new Set([
  ShiftType.PAID_LEAVE,
  ShiftType.HALF_PAID_LEAVE,
  ShiftType.SUBSTITUTE_LEAVE,
  ShiftType.SPECIAL_LEAVE,
  ShiftType.ILLNESS,
  ShiftType.LATE,
  ShiftType.EARLY_LEAVE,
  ShiftType.ABSENCE,
  ShiftType.OTHER,
  // Note: PUBLIC_HOLIDAY is not included - it's a simple rest day marker
]);

export default function EditRecordModal({ date, record, onSave, onDelete, onClose, onPrintApplicationForm }: Props) {
  const dateStr = formatDateLocal(date);
  const isRestDay = isDefaultRestDay(date);
  const defaultShift = record?.shiftType ?? (isRestDay ? ShiftType.HOLIDAY_WORK : ShiftType.DAY);

  const [shiftType, setShiftType] = useState<ShiftType>(defaultShift);
  const getDefaultOvertimeStart = (shift: ShiftType) => {
    if (shift === ShiftType.DAY_AND_NIGHT) return '08:30';
    return '17:00';
  };
  const [overtimeStart, setOvertimeStart] = useState(record?.overtimeStart ?? getDefaultOvertimeStart(defaultShift));
  const [overtimeEnd, setOvertimeEnd] = useState(record?.overtimeEnd ?? (defaultShift === ShiftType.DAY_AND_NIGHT ? '15:45' : ''));
  const [overtimeDesc, setOvertimeDesc] = useState(record?.overtimeDescription ?? '');

  // 申請書用フィールド
  const [applicationReason, setApplicationReason] = useState(record?.applicationReason ?? '');
  const [applicationStartDate, setApplicationStartDate] = useState(record?.applicationStartDate ?? dateStr);
  const [applicationEndDate, setApplicationEndDate] = useState(record?.applicationEndDate ?? dateStr);
  const [applicationDurationType, setApplicationDurationType] = useState<'日数' | '時間'>(record?.applicationDurationType ?? '日数');
  const [applicationDurationDays, setApplicationDurationDays] = useState(record?.applicationDurationDays ?? 1);
  const [applicationStartTime, setApplicationStartTime] = useState(record?.applicationStartTime ?? '09:00');
  const [applicationEndTime, setApplicationEndTime] = useState(record?.applicationEndTime ?? '17:00');
  const [applicationOtherRemarks, setApplicationOtherRemarks] = useState(record?.applicationOtherRemarks ?? '');

  // 時間休（日勤の日のみ、1〜7時間）
  const [hourlyLeaveHours, setHourlyLeaveHours] = useState<number | null>(record?.hourlyLeaveHours ?? null);

  useEffect(() => {
    const s = record?.shiftType ?? (isDefaultRestDay(date) ? ShiftType.HOLIDAY_WORK : ShiftType.DAY);
    setShiftType(s);
    setOvertimeStart(record?.overtimeStart ?? getDefaultOvertimeStart(s));
    setOvertimeEnd(record?.overtimeEnd ?? (s === ShiftType.DAY_AND_NIGHT ? '15:45' : ''));
    setOvertimeDesc(record?.overtimeDescription ?? '');
    setApplicationReason(record?.applicationReason ?? '');
    setApplicationStartDate(record?.applicationStartDate ?? dateStr);
    setApplicationEndDate(record?.applicationEndDate ?? dateStr);
    setHourlyLeaveHours(record?.hourlyLeaveHours ?? null);
  }, [record, dateStr]);


  const requiresApplication = REQUIRES_APPLICATION.has(shiftType);

  const allowsOvertime = !requiresApplication && (
    shiftType === ShiftType.DAY ||
    shiftType === ShiftType.NIGHT ||
    shiftType === ShiftType.DAY_AND_NIGHT ||
    shiftType === ShiftType.ON_CALL
  );

  const handleSave = () => {
    if (requiresApplication && !applicationReason.trim()) {
      alert('理由を入力してください');
      return;
    }

    const rec: AttendanceRecord = {
      id: record?.id ?? `${dateStr}-new`,
      userId: record?.userId ?? '',
      date: dateStr,
      shiftType,
      overtimeStart: allowsOvertime ? (overtimeStart || null) : null,
      overtimeEnd: allowsOvertime ? (overtimeEnd || null) : null,
      overtimeDescription: allowsOvertime ? overtimeDesc : '',
      isHoliday: isJapaneseHoliday(date),
      hourlyLeaveHours: shiftType === ShiftType.DAY ? hourlyLeaveHours : null,
      ...(requiresApplication && {
        applicationReason,
        applicationStartDate,
        applicationEndDate,
        applicationDurationType,
        applicationDurationDays,
        applicationStartTime,
        applicationEndTime,
        applicationOtherRemarks,
      }),
    };
    onSave(rec);
  };

  const handleDelete = () => {
    if (window.confirm('この日の申請を取り消し、自動入力に戻しますか？')) {
      onDelete?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-slate-800 text-lg">
            {dateStr.replace(/-/g, '/')} ({getWeekdayLabel(date)})
            {isJapaneseHoliday(date) && <span className="ml-2 text-xs text-red-600 font-bold">祝日</span>}
            {isRestDay && !isJapaneseHoliday(date) && <span className="ml-2 text-xs text-red-600 font-bold">公休</span>}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold">✕</button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 勤務区分 */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-2">勤務区分</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {ALL_SHIFTS.map(s => (
                <button
                  key={s}
                  onClick={() => {
                    if (s === shiftType) return; // 同じ区分は何もしない
                    setShiftType(s);
                    // 区分を切り替えた場合は時間外を空にする（手入力へ）
                    if (s === ShiftType.DAY_AND_NIGHT) {
                      setOvertimeStart('08:30');
                      setOvertimeEnd('15:45');
                    } else {
                      setOvertimeStart('');
                      setOvertimeEnd('');
                    }
                  }}
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

          {/* 時間外（日勤・夜勤・日勤+夜勤・オンコール） */}
          {allowsOvertime && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">時間外開始時刻</label>
                  {shiftType === ShiftType.DAY_AND_NIGHT ? (
                    <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 flex items-center">
                      {overtimeStart}
                    </div>
                  ) : (
                    <input
                      type="time"
                      value={overtimeStart}
                      onChange={e => setOvertimeStart(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">時間外終了時刻</label>
                  {shiftType === ShiftType.DAY_AND_NIGHT ? (
                    <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 flex items-center">
                      {overtimeEnd}
                    </div>
                  ) : (
                    <input
                      type="time"
                      value={overtimeEnd}
                      onChange={e => setOvertimeEnd(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">業務内容・備考</label>
                <textarea
                  value={overtimeDesc}
                  onChange={e => setOvertimeDesc(e.target.value)}
                  rows={2}
                  placeholder="例：緊急透析対応、翌日症例準備 など"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
            </>
          )}

          {/* 時間休（日勤の日のみ、1〜7時間） */}
          {shiftType === ShiftType.DAY && (
            <div className="border-t pt-4">
              <label className="text-xs font-bold text-slate-500 block mb-2">
                時間休（取得する場合のみ選択・任意）
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => setHourlyLeaveHours(null)}
                  className={`text-xs py-1.5 px-2 rounded-lg font-bold border transition-all ${
                    hourlyLeaveHours === null
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  なし
                </button>
                {[1, 2, 3, 4, 5, 6, 7].map(h => (
                  <button
                    key={h}
                    onClick={() => setHourlyLeaveHours(h)}
                    className={`text-xs py-1.5 px-2 rounded-lg font-bold border transition-all ${
                      hourlyLeaveHours === h
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'
                    }`}
                  >
                    △{h}H
                  </button>
                ))}
              </div>
              {hourlyLeaveHours !== null && (
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {hourlyLeaveHours}時間有休（{hourlyLeaveHours}有）として、有給残高から{(hourlyLeaveHours / 8).toFixed(3).replace(/\.?0+$/, '')}日分が差し引かれます（年間上限あり）。1日1回のみ取得可能です。
                </p>
              )}
            </div>
          )}

          {/* 申請書必須フィールド */}
          {requiresApplication && (
            <>
              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-slate-700 mb-3">申請書情報（必須）</h4>

                {/* 理由 */}
                <div className="mb-3">
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">理由 <span className="text-red-600">*</span></label>
                  <textarea
                    value={applicationReason}
                    onChange={e => setApplicationReason(e.target.value)}
                    rows={2}
                    placeholder="申請理由を記入してください"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                {/* 期日タイプ選択 */}
                <div className="mb-3">
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">期日タイプ</label>
                  <div className="flex gap-3">
                    {(['日数', '時間'] as const).map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="durationType"
                          value={type}
                          checked={applicationDurationType === type}
                          onChange={e => setApplicationDurationType(e.target.value as '日数' | '時間')}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 日数の場合 */}
                {applicationDurationType === '日数' && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">開始日</label>
                      <input
                        type="date"
                        value={applicationStartDate}
                        onChange={e => setApplicationStartDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">終了日</label>
                      <input
                        type="date"
                        value={applicationEndDate}
                        onChange={e => setApplicationEndDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                )}

                {/* 時間の場合 */}
                {applicationDurationType === '時間' && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">開始時刻</label>
                      <input
                        type="time"
                        value={applicationStartTime}
                        onChange={e => setApplicationStartTime(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">終了時刻</label>
                      <input
                        type="time"
                        value={applicationEndTime}
                        onChange={e => setApplicationEndTime(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                )}

                {/* その他特記事項 */}
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">その他特記事項</label>
                  <textarea
                    value={applicationOtherRemarks}
                    onChange={e => setApplicationOtherRemarks(e.target.value)}
                    rows={2}
                    placeholder="あれば記入"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all"
          >
            申請保存
          </button>
          {requiresApplication && applicationReason.trim() && onPrintApplicationForm && (
            <button
              onClick={() => {
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
                  applicationReason,
                  applicationStartDate,
                  applicationEndDate,
                  applicationDurationType,
                  applicationDurationDays,
                  applicationStartTime,
                  applicationEndTime,
                  applicationOtherRemarks,
                };
                onPrintApplicationForm(rec);
              }}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all"
            >
              申請書印刷
            </button>
          )}
          {record && (
            <button
              onClick={handleDelete}
              className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 active:scale-95 transition-all"
            >
              取消
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
