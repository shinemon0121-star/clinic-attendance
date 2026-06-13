import React from 'react';
import { AttendanceRecord, ShiftType, User } from '../types';
import { formatDateLocal, getWeekdayLabel, parseAndFormatDate } from '../utils/dateUtils';

interface Props {
  record: AttendanceRecord;
  user: User;
  issuedAt?: Date;
}

// 西暦→令和
function toReiwa(year: number): number {
  return year - 2018;
}

// 日付をパースして {reiwa, month, day, dow} を返す
function parseDate(dateStr: string): { reiwa: number; month: number; day: number; dow: string } | null {
  if (!dateStr) return null;
  const parsed = parseAndFormatDate(dateStr);
  if (!parsed) return null;
  const [y, m, d] = parsed.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    reiwa: toReiwa(y),
    month: m,
    day: d,
    dow: getWeekdayLabel(date),
  };
}

// 午前/午後 と 時・分 に分割
function splitAmPmTime(timeStr: string | undefined): { ampm: string; h: number | null; min: number | null } {
  if (!timeStr) return { ampm: '', h: null, min: null };
  if (timeStr === '午前' || timeStr === '午後') return { ampm: timeStr, h: null, min: null };
  // HH:MM の場合
  const m = timeStr.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    // 12時間制に変換
    const ampm = h < 12 ? '午前' : '午後';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { ampm, h: h12, min };
  }
  return { ampm: '', h: null, min: null };
}

// 時間数を計算（HH:MM形式）
function calcDurationHours(startTime: string | undefined, endTime: string | undefined): number {
  if (!startTime || !endTime) return 0;
  const startMatch = startTime.match(/^(\d{1,2}):(\d{1,2})$/);
  const endMatch = endTime.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!startMatch || !endMatch) return 0;
  const startH = parseInt(startMatch[1], 10);
  const startM = parseInt(startMatch[2], 10);
  const endH = parseInt(endMatch[1], 10);
  const endM = parseInt(endMatch[2], 10);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60; // 日を跨ぐ場合
  return Math.round(diff / 60 * 10) / 10; // 小数第一位まで
}

// 休暇の種類コード
const KIND_MAP: Record<string, ShiftType> = {
  'イ': ShiftType.PAID_LEAVE,
  'ロ': ShiftType.ILLNESS,
  'ハ': ShiftType.SPECIAL_LEAVE,
  'ニ': ShiftType.ABSENCE,
  'ホ': ShiftType.LATE,
  'ヘ': ShiftType.EARLY_LEAVE,
  'ト': ShiftType.SUBSTITUTE_LEAVE,
  'チ': ShiftType.OTHER,
};

const KIND_LABELS: { code: string; label: string }[] = [
  { code: 'イ', label: '有　休' },
  { code: 'ロ', label: '病　気' },
  { code: 'ハ', label: '特　別' },
  { code: 'ニ', label: '欠　勤' },
  { code: 'ホ', label: '遅　刻' },
  { code: 'ヘ', label: '早　退' },
  { code: 'ト', label: '代　休' },
  { code: 'チ', label: 'その他' },
];

export default function ApplicationFormPrint({ record, user, issuedAt }: Props) {
  const issuedDate = issuedAt ?? new Date();
  const todayReiwa = toReiwa(issuedDate.getFullYear());
  const todayMonth = issuedDate.getMonth() + 1;
  const todayDay = issuedDate.getDate();

  const start = parseDate(record.applicationStartDate || record.date);
  const end = parseDate(record.applicationEndDate || record.date);

  const durationType = record.applicationDurationType ?? '日数';
  const durationDays = record.applicationDurationDays ?? (() => {
    if (!start || !end) return 1;
    const s = new Date(2018 + start.reiwa, start.month - 1, start.day);
    const e = new Date(2018 + end.reiwa, end.month - 1, end.day);
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  })();

  const startTime = splitAmPmTime(record.applicationStartTime);
  const endTime = splitAmPmTime(record.applicationEndTime);
  const durationHours = durationType === '時間' ? calcDurationHours(record.applicationStartTime, record.applicationEndTime) : 0;

  // 半休の場合は有休にチェック + その他欄に「半日」
  const checkedCode: string | null = (() => {
    if (record.shiftType === ShiftType.HALF_PAID_LEAVE) return 'イ';
    const entry = Object.entries(KIND_MAP).find(([, v]) => v === record.shiftType);
    return entry?.[0] ?? null;
  })();

  const isChecked = (code: string) => checkedCode === code;

  return (
    <div className="hidden print:block font-['Noto_Sans_JP'] text-black">
      <div
        style={{
          pageBreakAfter: 'always',
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm 18mm',
          margin: '0 auto',
          background: 'white',
          boxSizing: 'border-box',
        }}
      >
        {/* タイトル */}
        <div style={{ textAlign: 'center', marginBottom: '8mm' }}>
          <h1 style={{ fontSize: '26pt', fontWeight: 'bold', letterSpacing: '0.4em', margin: 0 }}>
            休暇・欠勤（遅刻.早退）届
          </h1>
        </div>

        {/* 提出日 */}
        <div style={{ textAlign: 'right', marginBottom: '6mm', fontSize: '11pt' }}>
          令和 <span style={{ display: 'inline-block', minWidth: '2em', borderBottom: '1px dotted #999' }}>&nbsp;{todayReiwa}&nbsp;</span> 年
          <span style={{ display: 'inline-block', minWidth: '2em', borderBottom: '1px dotted #999' }}>&nbsp;{todayMonth}&nbsp;</span> 月
          <span style={{ display: 'inline-block', minWidth: '2em', borderBottom: '1px dotted #999' }}>&nbsp;{todayDay}&nbsp;</span> 日
        </div>

        {/* 理事長 殿 */}
        <div style={{ fontSize: '13pt', marginBottom: '5mm' }}>理事長　殿</div>

        {/* 所属・氏名 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6mm', fontSize: '11pt' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2mm 4mm', whiteSpace: 'nowrap' }}>所属</td>
                <td style={{ padding: '2mm 4mm', borderBottom: '1px solid #000', minWidth: '50mm' }}>
                  {user.department}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '2mm 4mm', whiteSpace: 'nowrap' }}>氏名</td>
                <td style={{ padding: '2mm 4mm', borderBottom: '1px solid #000', minWidth: '50mm', position: 'relative' }}>
                  {user.name}
                  <span style={{ position: 'absolute', right: '2mm', top: '50%', transform: 'translateY(-50%)', fontSize: '13pt' }}>㊞</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 申請文 */}
        <div style={{ fontSize: '12pt', marginBottom: '5mm' }}>
          私は下記の通り休暇を受けたいのでご承認方お願い致します。
        </div>

        {/* メインテーブル */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt', border: '1.5px solid #000' }}>
          <tbody>
            {/* 休暇の種類 */}
            <tr>
              <td
                style={{
                  width: '25mm',
                  border: '1px solid #000',
                  textAlign: 'center',
                  padding: '3mm',
                  verticalAlign: 'middle',
                  fontWeight: 'normal',
                }}
              >
                休暇の種類
              </td>
              <td style={{ border: '1px solid #000', padding: '4mm' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      {KIND_LABELS.slice(0, 4).map(k => (
                        <td key={k.code} style={{ padding: '1mm 3mm', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-block', width: '1.2em' }}>
                            {isChecked(k.code) ? '●' : '○'}
                          </span>
                          （{k.code}）{k.label}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      {KIND_LABELS.slice(4, 8).map(k => (
                        <td key={k.code} style={{ padding: '1mm 3mm', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-block', width: '1.2em' }}>
                            {isChecked(k.code) ? '●' : '○'}
                          </span>
                          （{k.code}）{k.label}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* 理由 */}
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  textAlign: 'center',
                  padding: '3mm',
                  verticalAlign: 'middle',
                  letterSpacing: '1em',
                  paddingRight: 0,
                }}
              >
                理由
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '4mm',
                  height: '30mm',
                  verticalAlign: 'top',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {record.applicationReason}
              </td>
            </tr>

            {/* 期日 */}
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  textAlign: 'center',
                  padding: '3mm',
                  verticalAlign: 'middle',
                  letterSpacing: '1em',
                  paddingRight: 0,
                }}
              >
                期日
              </td>
              <td style={{ border: '1px solid #000', padding: '4mm', verticalAlign: 'middle' }}>
                {/* 日付ブロック */}
                <div style={{ marginBottom: '3mm' }}>
                  <div style={{ marginBottom: '2mm' }}>
                    令和 <u>&nbsp;{start?.reiwa ?? ''}&nbsp;</u> 年
                    <u>&nbsp;{start?.month ?? ''}&nbsp;</u> 月
                    <u>&nbsp;{start?.day ?? ''}&nbsp;</u> 日（<u>&nbsp;{start?.dow ?? ''}&nbsp;</u>曜）から
                  </div>
                  <div>
                    令和 <u>&nbsp;{end?.reiwa ?? ''}&nbsp;</u> 年
                    <u>&nbsp;{end?.month ?? ''}&nbsp;</u> 月
                    <u>&nbsp;{end?.day ?? ''}&nbsp;</u> 日（<u>&nbsp;{end?.dow ?? ''}&nbsp;</u>曜）まで
                  </div>
                </div>

                {/* 時間ブロック */}
                {durationType === '時間' && (
                  <div style={{ marginBottom: '3mm' }}>
                    <div style={{ marginBottom: '2mm', display: 'flex', gap: '20mm' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ textDecoration: startTime.ampm === '午前' ? 'underline' : 'none', fontWeight: startTime.ampm === '午前' ? 'bold' : 'normal' }}>
                          午前
                        </span>
                        <u>&nbsp;{startTime.ampm === '午前' && startTime.h ? startTime.h : ''}&nbsp;</u> 時
                        <u>&nbsp;{startTime.ampm === '午前' && startTime.min !== null ? String(startTime.min).padStart(1, '0') : ''}&nbsp;</u> 分
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ textDecoration: startTime.ampm === '午後' ? 'underline' : 'none', fontWeight: startTime.ampm === '午後' ? 'bold' : 'normal' }}>
                          午後
                        </span>
                        <u>&nbsp;{startTime.ampm === '午後' && startTime.h ? startTime.h : ''}&nbsp;</u> 時
                        <u>&nbsp;{startTime.ampm === '午後' && startTime.min !== null ? String(startTime.min).padStart(1, '0') : ''}&nbsp;</u> 分
                      </div>
                    </div>
                    <div style={{ marginBottom: '2mm' }}>から</div>
                    <div style={{ marginBottom: '2mm', display: 'flex', gap: '20mm' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ textDecoration: endTime.ampm === '午前' ? 'underline' : 'none', fontWeight: endTime.ampm === '午前' ? 'bold' : 'normal' }}>
                          午前
                        </span>
                        <u>&nbsp;{endTime.ampm === '午前' && endTime.h ? endTime.h : ''}&nbsp;</u> 時
                        <u>&nbsp;{endTime.ampm === '午前' && endTime.min !== null ? String(endTime.min).padStart(1, '0') : ''}&nbsp;</u> 分
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ textDecoration: endTime.ampm === '午後' ? 'underline' : 'none', fontWeight: endTime.ampm === '午後' ? 'bold' : 'normal' }}>
                          午後
                        </span>
                        <u>&nbsp;{endTime.ampm === '午後' && endTime.h ? endTime.h : ''}&nbsp;</u> 時
                        <u>&nbsp;{endTime.ampm === '午後' && endTime.min !== null ? String(endTime.min).padStart(1, '0') : ''}&nbsp;</u> 分
                      </div>
                    </div>
                    <div>まで</div>
                  </div>
                )}

                {/* 合計 */}
                <div style={{ textAlign: 'right' }}>
                  {durationType === '日数' ? (
                    <span>
                      <u>&nbsp;{durationDays}&nbsp;</u> 日間
                    </span>
                  ) : (
                    <span>
                      <u>&nbsp;{durationHours}&nbsp;</u> 時間
                    </span>
                  )}
                </div>
              </td>
            </tr>

            {/* その他 */}
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  textAlign: 'center',
                  padding: '3mm',
                  verticalAlign: 'middle',
                  letterSpacing: '0.5em',
                  paddingRight: 0,
                }}
              >
                その他
              </td>
              <td
                style={{
                  border: '1px solid #000',
                  padding: '4mm',
                  height: '18mm',
                  verticalAlign: 'top',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {record.shiftType === ShiftType.HALF_PAID_LEAVE ? '半日' : ''}
                {record.applicationOtherRemarks ? (record.shiftType === ShiftType.HALF_PAID_LEAVE ? '　' : '') + record.applicationOtherRemarks : ''}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 決裁欄 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8mm' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '10pt' }}>
            <tbody>
              <tr>
                <td
                  rowSpan={2}
                  style={{
                    border: '1px solid #000',
                    width: '12mm',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    padding: '2mm',
                    letterSpacing: '0.5em',
                  }}
                >
                  決裁
                </td>
                {['理事長', '院　長', '事務局長', '事務長', '所属長'].map((t) => (
                  <td
                    key={t}
                    style={{
                      border: '1px solid #000',
                      width: '18mm',
                      height: '8mm',
                      textAlign: 'center',
                      padding: '1mm',
                      fontSize: '9pt',
                    }}
                  >
                    {t}
                  </td>
                ))}
              </tr>
              <tr>
                {[0, 1, 2, 3, 4].map((i) => (
                  <td
                    key={i}
                    style={{
                      border: '1px solid #000',
                      width: '18mm',
                      height: '18mm',
                    }}
                  ></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
