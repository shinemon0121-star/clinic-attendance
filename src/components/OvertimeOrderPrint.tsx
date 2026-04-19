import React, { useEffect } from 'react';
import { AttendanceRecord, User } from '../types';
import { formatDateLocal, calcSplitOvertimeMinutes } from '../utils/dateUtils';

interface Props {
  records: AttendanceRecord[];
  user: User;
  period: { year: number; month: number; startDate: Date; endDate: Date };
  dates: Date[];
}

export default function OvertimeOrderPrint({ records, user, period, dates }: Props) {
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'ot-print-landscape';
    style.textContent = '@media print { @page { size: A4 landscape; margin: 10mm; } }';
    document.head.appendChild(style);
    return () => document.getElementById('ot-print-landscape')?.remove();
  }, []);

  const recordMap = new Map(records.map(r => [r.date, r]));
  const otRecords = dates
    .map(d => ({ d, rec: recordMap.get(formatDateLocal(d)) }))
    .filter(({ rec }) => rec?.overtimeStart && rec?.overtimeEnd);

  let totalRegular = 0;
  let totalLateNight = 0;
  otRecords.forEach(({ rec }) => {
    const { regular, lateNight } = calcSplitOvertimeMinutes(rec!.overtimeStart, rec!.overtimeEnd);
    totalRegular += regular;
    totalLateNight += lateNight;
  });

  // 分 → 小数時間（30分刻みなので必ず .0 or .5）
  const toH = (mins: number): string => {
    if (mins <= 0) return '';
    const h = mins / 60;
    return h % 1 === 0 ? `${h}` : `${h.toFixed(1)}`;
  };

  // "17:00" → "17時00分"
  const toJpTime = (t: string | null | undefined): string => {
    if (!t) return '';
    const [h, m] = t.split(':');
    return `${parseInt(h)}時${m}分`;
  };

  const now = new Date();
  const nowStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const B = '1px solid #374151';
  const cell = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: B,
    ...extra,
  });

  return (
    <div className="print:block hidden" style={{ fontFamily: "'Noto Sans JP', 'Meiryo', sans-serif", fontSize: '9pt' }}>

      {/* ─── タイトル ─── */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '13pt', fontWeight: 'bold', letterSpacing: '0.2em' }}>
          時 間 外 勤 務 、 休 日 勤 務 、 夜 間 勤 務 及 び 宿 日 直 勤 務 命 令 簿
        </div>
      </div>

      {/* ─── 年月・所属・氏名 ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', fontSize: '10pt' }}>
        <div>
          <span style={{ fontWeight: 'bold' }}>{period.year}年　{period.month}月分</span>
          <span style={{ marginLeft: '24px', fontWeight: 'bold' }}>
            {user.department}　部　　　課　　　係
          </span>
        </div>
        <div style={{ fontWeight: 'bold' }}>氏名　{user.name}</div>
      </div>

      {/* ─── メインテーブル ─── */}
      {otRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#888' }}>残業記録がありません</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', tableLayout: 'fixed' }}>

          {/* 列幅指定: 合計100% */}
          <colgroup>
            <col style={{ width: '5%' }} />   {/* 所属長の印 */}
            <col style={{ width: '5%' }} />   {/* 直接監督責任者の印 */}
            <col style={{ width: '6%' }} />   {/* 月日 */}
            <col style={{ width: '12%' }} />  {/* 勤務命令時間 */}
            <col style={{ width: '7%' }} />   {/* 130/100 */}
            <col style={{ width: '7%' }} />   {/* 150/100 */}
            <col style={{ width: '7%' }} />   {/* 休日勤務 */}
            <col style={{ width: '7%' }} />   {/* 夜間勤務 */}
            <col style={{ width: '7%' }} />   {/* 宿直勤務 */}
            <col style={{ width: '7%' }} />   {/* 日直5H以上 */}
            <col style={{ width: '7%' }} />   {/* 日直5H未満 */}
            <col style={{ width: '18%' }} />  {/* 従事事務の内容 */}
            <col style={{ width: '5%' }} />   {/* 従事者の印 */}
          </colgroup>

          {/* ═══ Header Row 1: 大分類 ═══ */}
          <tr>
            <th rowSpan={3} style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '2px', lineHeight: 1.4, fontSize: '8pt' })}>
              所属長<br/>の印
            </th>
            <th rowSpan={3} style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '2px', lineHeight: 1.4, fontSize: '8pt' })}>
              直接監督<br/>責任者<br/>の印
            </th>
            <th rowSpan={3} style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '2px 4px', lineHeight: 1.6 })}>
              月 　日
            </th>
            <th rowSpan={3} style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '2px 4px', lineHeight: 1.6 })}>
              勤務命令<br/>時　間
            </th>
            <th colSpan={7} style={cell({ textAlign: 'center', padding: '3px 4px', letterSpacing: '0.15em' })}>
              勤 務 の 区 　分
            </th>
            <th rowSpan={3} style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '2px 4px', lineHeight: 1.6, fontSize: '8pt' })}>
              従事事務<br/>の内容
            </th>
            <th rowSpan={3} style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '2px', lineHeight: 1.4, fontSize: '8pt' })}>
              従事者<br/>の印
            </th>
          </tr>

          {/* ═══ Header Row 2: 中分類 ═══ */}
          <tr>
            <th colSpan={2} style={cell({ textAlign: 'center', padding: '2px 4px' })}>
              時間外勤務
            </th>
            <th rowSpan={2} style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '2px', lineHeight: 1.4, fontSize: '8pt' })}>
              休日<br/>勤務
            </th>
            <th rowSpan={2} style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '2px', lineHeight: 1.4, fontSize: '8pt' })}>
              夜間<br/>勤務
            </th>
            <th rowSpan={2} style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '2px', lineHeight: 1.4, fontSize: '8pt' })}>
              宿直<br/>勤務
            </th>
            <th colSpan={2} style={cell({ textAlign: 'center', padding: '2px 4px' })}>
              日直勤務
            </th>
          </tr>

          {/* ═══ Header Row 3: 小分類 ═══ */}
          <tr>
            <th style={cell({ textAlign: 'center', padding: '2px', lineHeight: 1.3, fontSize: '8pt' })}>
              130<br/>100
            </th>
            <th style={cell({ textAlign: 'center', padding: '2px', lineHeight: 1.3, fontSize: '8pt' })}>
              150<br/>100
            </th>
            <th style={cell({ textAlign: 'center', padding: '2px', lineHeight: 1.3, fontSize: '8pt' })}>
              5時間<br/>以上
            </th>
            <th style={cell({ textAlign: 'center', padding: '2px', lineHeight: 1.3, fontSize: '8pt' })}>
              5時間<br/>未満
            </th>
          </tr>

          {/* ═══ データ行 ═══ */}
          {otRecords.map(({ d, rec }) => {
            const dateStr = formatDateLocal(d);
            const [, month, day] = dateStr.split('-');
            const { regular, lateNight } = calcSplitOvertimeMinutes(rec!.overtimeStart, rec!.overtimeEnd);

            return (
              <tr key={dateStr}>
                {/* 所属長の印 ── 各行に押印枠 */}
                <td style={cell({ height: '38px' })}></td>
                {/* 直接監督責任者の印 ── 各行に押印枠 */}
                <td style={cell({ height: '38px' })}></td>
                {/* 月日 */}
                <td style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '4px 4px' })}>
                  {parseInt(month)} 月 {parseInt(day)} 日
                </td>
                {/* 勤務命令時間 */}
                <td style={cell({ textAlign: 'center', verticalAlign: 'middle', padding: '4px 4px', lineHeight: 1.7 })}>
                  {toJpTime(rec!.overtimeStart)}から<br/>{toJpTime(rec!.overtimeEnd)}まで
                </td>
                {/* 130/100 通常残業 */}
                <td style={cell({ textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', padding: '4px 2px' })}>
                  {toH(regular)}
                </td>
                {/* 150/100 深夜残業 */}
                <td style={cell({ textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', padding: '4px 2px' })}>
                  {toH(lateNight)}
                </td>
                {/* 休日勤務 */}
                <td style={cell({ padding: '4px' })}></td>
                {/* 夜間勤務 */}
                <td style={cell({ padding: '4px' })}></td>
                {/* 宿直勤務 */}
                <td style={cell({ padding: '4px' })}></td>
                {/* 日直5時間以上 */}
                <td style={cell({ padding: '4px' })}></td>
                {/* 日直5時間未満 */}
                <td style={cell({ padding: '4px' })}></td>
                {/* 従事事務の内容 */}
                <td style={cell({ padding: '4px 6px', verticalAlign: 'middle', lineHeight: 1.5, wordBreak: 'break-all' })}>
                  {rec!.overtimeDescription}
                </td>
                {/* 従事者の印 */}
                <td style={cell({ padding: '4px' })}></td>
              </tr>
            );
          })}

          {/* ═══ 合計行 ═══ */}
          <tr>
            <td colSpan={4} style={cell({ textAlign: 'right', fontWeight: 'bold', padding: '4px 10px' })}>
              合 　計
            </td>
            <td style={cell({ textAlign: 'center', fontWeight: 'bold', padding: '4px 2px' })}>
              {toH(totalRegular)}
            </td>
            <td style={cell({ textAlign: 'center', fontWeight: 'bold', padding: '4px 2px' })}>
              {toH(totalLateNight)}
            </td>
            <td style={cell()}></td>
            <td style={cell()}></td>
            <td style={cell()}></td>
            <td style={cell()}></td>
            <td style={cell()}></td>
            <td colSpan={2} style={cell({ padding: '4px 6px', fontSize: '8pt', color: '#555' })}>
              {totalRegular > 0 && `通常 ${toH(totalRegular)}h`}
              {totalRegular > 0 && totalLateNight > 0 && '　'}
              {totalLateNight > 0 && `深夜 ${toH(totalLateNight)}h`}
            </td>
          </tr>

        </table>
      )}

      {/* ─── 備考 ─── */}
      <div style={{ marginTop: '8px', fontSize: '8pt' }}>
        <span style={{ fontWeight: 'bold' }}>※ 130/100: 通常時間外 / 150/100: 深夜時間外</span>
      </div>

      {/* ─── フッター ─── */}
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '7pt', color: '#555' }}>
        <span>システム出力時刻: {nowStr}</span>
        <span>1 / 1 ページ</span>
      </div>

    </div>
  );
}
