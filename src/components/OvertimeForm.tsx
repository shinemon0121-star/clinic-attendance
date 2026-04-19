import React, { useState, useEffect } from 'react';
import { AttendanceRecord } from '../types';
import { calcOvertimeMinutes, minutesToHHMM } from '../utils/dateUtils';

interface Props {
  currentRecord: AttendanceRecord | undefined;
  onUpdate: (data: Partial<AttendanceRecord>) => void;
}

export default function OvertimeForm({ currentRecord, onUpdate }: Props) {
  const [overtimeStart, setOvertimeStart] = useState('');
  const [overtimeEnd, setOvertimeEnd] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (currentRecord) {
      setOvertimeStart(currentRecord.overtimeStart || '');
      setOvertimeEnd(currentRecord.overtimeEnd || '');
      setDescription(currentRecord.overtimeDescription || '');
    }
  }, [currentRecord?.id]);

  const hasOvertime = !!(currentRecord?.overtimeStart && currentRecord?.overtimeEnd);
  const overtimeMin = calcOvertimeMinutes(overtimeStart, overtimeEnd);

  const handleSave = () => {
    if (!overtimeStart || !overtimeEnd) {
      alert('残業開始・終了時刻を入力してください');
      return;
    }
    onUpdate({ overtimeStart, overtimeEnd, overtimeDescription: description });
  };

  const handleClear = () => {
    setOvertimeStart('');
    setOvertimeEnd('');
    setDescription('');
    onUpdate({ overtimeStart: null, overtimeEnd: null, overtimeDescription: '' });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
          残業記録（本日）
        </h2>
        {hasOvertime && (
          <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-full">
            {minutesToHHMM(calcOvertimeMinutes(currentRecord!.overtimeStart, currentRecord!.overtimeEnd))} 記録済み
          </span>
        )}
      </div>

      {!currentRecord?.checkIn ? (
        <div className="text-sm text-slate-400 text-center py-8">
          本日の出勤記録がありません
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">残業開始</label>
              <input
                type="time"
                value={overtimeStart}
                onChange={e => setOvertimeStart(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">残業終了</label>
              <input
                type="time"
                value={overtimeEnd}
                onChange={e => setOvertimeEnd(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {overtimeStart && overtimeEnd && (
            <div className="text-xs text-indigo-600 font-bold bg-indigo-50 px-3 py-2 rounded-lg">
              残業時間: {minutesToHHMM(overtimeMin)}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">業務内容・理由</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="例: 緊急透析対応、翌日症例準備 など"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all"
            >
              保存
            </button>
            {hasOvertime && (
              <button
                onClick={handleClear}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 active:scale-95 transition-all"
              >
                クリア
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
