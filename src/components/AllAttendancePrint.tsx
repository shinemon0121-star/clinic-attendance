import React from 'react';
import { AttendanceRecord, PaidLeaveGrant, HourlyLeaveGrant, User } from '../types';
import { formatDateLocal } from '../utils/dateUtils';
import AttendanceTable from './AttendanceTable';

interface Props {
  users: User[];
  allRecords: AttendanceRecord[];
  paidLeaveGrants: PaidLeaveGrant[];
  hourlyLeaveGrants: HourlyLeaveGrant[];
  dates: Date[];
  period: { year: number; month: number; startDate: Date; endDate: Date };
}

const noop = () => {};

// 出勤簿（個人）と全く同じ表示（AttendanceTable）を、登録スタッフ全員分ループして印刷する
export default function AllAttendancePrint({ users, allRecords, paidLeaveGrants, hourlyLeaveGrants, dates, period }: Props) {
  return (
    <div className="print:block hidden font-['Noto_Sans_JP']">
      {users.map((user, userIndex) => {
        const records = allRecords.filter(r =>
          r.userId?.trim().toLowerCase() === user.id.trim().toLowerCase()
        );

        return (
          <div
            key={user.id}
            style={{ pageBreakAfter: userIndex < users.length - 1 ? 'always' : 'avoid' }}
            className="p-6 print:p-2"
          >
            <h1 className="text-2xl font-bold mb-4 print:mb-2 text-center">出　勤　簿</h1>
            <div className="flex justify-between mb-2 print:mb-1 text-[10pt]">
              <div>期間：{formatDateLocal(period.startDate)} ～ {formatDateLocal(period.endDate)}</div>
              <div>所属：{user.department}</div>
              <div>氏名：{user.name}</div>
            </div>

            <AttendanceTable
              user={user}
              records={records}
              dates={dates}
              paidLeaveGrants={paidLeaveGrants}
              hourlyLeaveGrants={hourlyLeaveGrants}
              onEditRequest={noop}
              onPrintRequest={noop}
            />
          </div>
        );
      })}
    </div>
  );
}
