import React, { useEffect } from 'react';
import { AttendanceRecord, User, ShiftType, SHIFT_LABELS } from '../types';
import { formatDateLocal, getWeekdayLabel, isJapaneseHoliday } from '../utils/dateUtils';

interface Props {
  user: User;
  record: AttendanceRecord | undefined;
}

export default function LeaveRequestPrint({ user, record }: Props) {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'leave-print-portrait';
    style.textContent = '@media print { @page { size: A4 portrait; margin: 15mm; } }';
    document.head.appendChild(style);
    return () => document.getElementById('leave-print-portrait')?.remove();
  }, []);

  const today = formatDateLocal(new Date());

  if (!record) return null;

  const recordDate = new Date(record.date);
  const shiftLabel = SHIFT_LABELS[record.shiftType as ShiftType] ?? record.shiftType;

  return (
    <div className="print:block hidden p-8 text-sm font-['Noto_Sans_JP'] max-w-[600px] mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black border-b-2 border-black pb-2 inline-block">
          休　暇　届
        </h1>
      </div>

      <div className="text-right mb-6 text-xs">
        届出日：{today.replace(/-/g, '年').replace(/-/, '月') + '日'}
      </div>

      <table className="w-full border-collapse text-sm mb-8">
        <tbody>
          <tr>
            <td className="border border-slate-400 bg-slate-100 px-4 py-3 font-bold w-32">所属</td>
            <td className="border border-slate-400 px-4 py-3">{user.department}</td>
          </tr>
          <tr>
            <td className="border border-slate-400 bg-slate-100 px-4 py-3 font-bold">氏名</td>
            <td className="border border-slate-400 px-4 py-3">{user.name}　　　　　㊞</td>
          </tr>
          <tr>
            <td className="border border-slate-400 bg-slate-100 px-4 py-3 font-bold">休暇種別</td>
            <td className="border border-slate-400 px-4 py-3 font-bold">{shiftLabel}</td>
          </tr>
          <tr>
            <td className="border border-slate-400 bg-slate-100 px-4 py-3 font-bold">休暇日</td>
            <td className="border border-slate-400 px-4 py-3">
              {record.date.replace(/-/g, '年').replace(/-/, '月') + '日'}
              （{getWeekdayLabel(recordDate)}）
              {isJapaneseHoliday(recordDate) && '　祝日'}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-400 bg-slate-100 px-4 py-3 font-bold">事由・備考</td>
            <td className="border border-slate-400 px-4 py-3 min-h-[60px]">
              {record.overtimeDescription || '　'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 確認欄 */}
      <div className="mt-8">
        <div className="text-xs font-bold text-slate-500 mb-2">承　認　欄</div>
        <div className="flex gap-4">
          {['担当', '係長', '課長', '部長'].map(title => (
            <div key={title} className="flex-1 text-center">
              <div className="border border-slate-400 h-16 mb-1"></div>
              <div className="text-xs">{title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
