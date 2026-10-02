import React, { useState, useEffect } from 'react';
import { AttendanceRecord, PaidLeaveGrant, ShiftType, User } from '../types';
import { formatDateLocal, getWeekdayLabel, parseAndFormatDate, calculatePaidLeaveBalance } from '../utils/dateUtils';
import { generateSealImageCached } from '../utils/sealGenerator';

interface Props {
  record: AttendanceRecord;
  user: User;
  allRecords: AttendanceRecord[];
  paidLeaveGrants: PaidLeaveGrant[];
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

// "17:00" → {h: 17, m: 0}
function splitTime24(timeStr: string | undefined): { h: number | null; m: number | null } {
  if (!timeStr) return { h: null, m: null };
  const match = timeStr.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return { h: null, m: null };
  return { h: parseInt(match[1], 10), m: parseInt(match[2], 10) };
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

export default function ApplicationFormPrint({ record, user, allRecords, paidLeaveGrants, issuedAt }: Props) {
  const [sealImage, setSealImage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const seal = generateSealImageCached(user.name);
      setSealImage(seal);
    } catch (error) {
      console.error('Failed to generate seal:', error);
    }
  }, [user.name]);

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

  const isHourlyLeave = !!record.hourlyLeaveHours;
  const showTimeBlock = isHourlyLeave || durationType === '時間';
  const startTime24 = splitTime24(record.applicationStartTime);
  const endTime24 = splitTime24(record.applicationEndTime);
  const durationHours = isHourlyLeave
    ? record.hourlyLeaveHours!
    : durationType === '時間'
    ? calcDurationHours(record.applicationStartTime, record.applicationEndTime)
    : 0;

  // 休暇の種類チェック
  const isPaidLeave = record.shiftType === ShiftType.PAID_LEAVE;
  const isHalfPaidLeave = record.shiftType === ShiftType.HALF_PAID_LEAVE;
  const isSpecialLeave = record.shiftType === ShiftType.SPECIAL_LEAVE;
  const isSummerLeave = record.shiftType === ShiftType.SUMMER_LEAVE;
  const isLate = record.shiftType === ShiftType.LATE;
  const isEarlyLeave = record.shiftType === ShiftType.EARLY_LEAVE;
  const isAbsenceGroup = record.shiftType === ShiftType.ABSENCE || isLate || isEarlyLeave;

  // 有休残日数・時間数（この申請を使用した後の残高）
  const refDate = new Date(record.date);
  const alreadySaved = allRecords.some(r => r.id === record.id);
  const recordsForCalc = alreadySaved ? allRecords : [...allRecords, record];
  const paidLeave = calculatePaidLeaveBalance(paidLeaveGrants, recordsForCalc, user.id, refDate);
  let balanceDays = Math.floor(paidLeave.balance);
  let balanceHours = Math.round((paidLeave.balance - balanceDays) * 8);
  if (balanceHours >= 8) {
    balanceDays += 1;
    balanceHours -= 8;
  }

  const Mark = ({ checked }: { checked: boolean }) => (
    <span style={{ display: 'inline-block', width: '1.2em' }}>{checked ? '●' : '○'}</span>
  );

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
            休暇・欠勤届
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
                  {sealImage ? (
                    <img
                      src={sealImage}
                      alt="seal"
                      style={{
                        position: 'absolute',
                        right: '1mm',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '15mm',
                        height: '15mm',
                      }}
                    />
                  ) : (
                    <span style={{ position: 'absolute', right: '2mm', top: '50%', transform: 'translateY(-50%)', fontSize: '13pt' }}>㊞</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
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
                }}
              >
                休暇の種類<br />
                <span style={{ fontSize: '8pt', color: '#555' }}>（いずれかに○）</span>
              </td>
              <td style={{ border: '1px solid #000', padding: '4mm' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '1.5mm 3mm', whiteSpace: 'nowrap' }}>
                        <Mark checked={isPaidLeave} />全日有休
                      </td>
                      <td style={{ padding: '1.5mm 3mm', whiteSpace: 'nowrap' }}>
                        <Mark checked={isHalfPaidLeave} />半日有休（午前／午後）
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '1.5mm 3mm', whiteSpace: 'nowrap' }}>
                        <Mark checked={isHourlyLeave} />時間有休
                      </td>
                      <td style={{ padding: '1.5mm 3mm', whiteSpace: 'nowrap' }}>
                        <Mark checked={isSpecialLeave} />特　　別
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '1.5mm 3mm', whiteSpace: 'nowrap' }}>
                        <Mark checked={isSummerLeave} />夏　期
                      </td>
                      <td style={{ padding: '1.5mm 3mm', whiteSpace: 'nowrap' }}>
                        <Mark checked={isAbsenceGroup} />欠　勤（
                        <span style={{ textDecoration: isLate ? 'underline' : 'none', fontWeight: isLate ? 'bold' : 'normal' }}>遅刻</span>
                        ／
                        <span style={{ textDecoration: isEarlyLeave ? 'underline' : 'none', fontWeight: isEarlyLeave ? 'bold' : 'normal' }}>早退</span>
                        ）
                      </td>
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
                  height: '26mm',
                  verticalAlign: 'top',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {record.applicationReason}
              </td>
            </tr>

            {/* 取得日時 */}
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
                取得日時
              </td>
              <td style={{ border: '1px solid #000', padding: '4mm', verticalAlign: 'middle' }}>
                {/* 日付ブロック */}
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
                <div style={{ textAlign: 'right', marginTop: '2mm', marginBottom: showTimeBlock ? '3mm' : 0 }}>
                  <u>&nbsp;{durationDays}&nbsp;</u> 日間
                </div>

                {showTimeBlock && (
                  <div style={{ borderTop: '1px dashed #999', paddingTop: '2.5mm' }}>
                    <div style={{ fontSize: '9pt', color: '#555', marginBottom: '2mm' }}>
                      時間有休、欠勤を申請する場合のみ記入
                    </div>
                    <div style={{ marginBottom: '2mm' }}>
                      <u>&nbsp;{startTime24.h ?? ''}&nbsp;</u> 時
                      <u>&nbsp;{startTime24.m ?? ''}&nbsp;</u> 分から
                      <span style={{ marginLeft: '6mm' }}>
                        <u>&nbsp;{endTime24.h ?? ''}&nbsp;</u> 時
                        <u>&nbsp;{endTime24.m ?? ''}&nbsp;</u> 分まで
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <u>&nbsp;{durationHours}&nbsp;</u> 時間
                    </div>
                  </div>
                )}
              </td>
            </tr>

            {/* 有休残日数・時間数 */}
            <tr>
              <td
                style={{
                  border: '1px solid #000',
                  textAlign: 'center',
                  padding: '3mm',
                  verticalAlign: 'middle',
                  fontSize: '9pt',
                }}
              >
                有休残日数<br />・時間数
              </td>
              <td style={{ border: '1px solid #000', padding: '4mm' }}>
                <u>&nbsp;{balanceDays}&nbsp;</u> 日　<u>&nbsp;{balanceHours}&nbsp;</u> 時間
                <span style={{ marginLeft: '6mm', fontSize: '9pt', color: '#555' }}>（使用後の残日数・時間数）</span>
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
                  height: '16mm',
                  verticalAlign: 'top',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {record.applicationOtherRemarks}
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
                  style={{
                    border: '1px solid #000',
                    width: '20mm',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    padding: '2mm',
                    lineHeight: 1.6,
                  }}
                >
                  所属長<br />決裁
                </td>
                <td
                  style={{
                    border: '1px solid #000',
                    width: '22mm',
                    height: '22mm',
                  }}
                ></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
