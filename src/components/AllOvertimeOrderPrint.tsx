import React from 'react';
import { AttendanceRecord, User } from '../types';
import OvertimeOrderPrint from './OvertimeOrderPrint';

interface Props {
  users: User[];
  allRecords: AttendanceRecord[];
  period: { year: number; month: number; startDate: Date; endDate: Date };
  dates: Date[];
}

// 命令簿（個人）と全く同じ表示（OvertimeOrderPrint）を、登録スタッフ全員分ループして印刷する
export default function AllOvertimeOrderPrint({ users, allRecords, period, dates }: Props) {
  return (
    <>
      {users.map((user, userIndex) => {
        const records = allRecords.filter(r =>
          r.userId?.trim().toLowerCase() === user.id.trim().toLowerCase()
        );

        return (
          <div key={user.id} style={{ pageBreakAfter: userIndex < users.length - 1 ? 'always' : 'avoid' }}>
            <OvertimeOrderPrint records={records} user={user} period={period} dates={dates} />
          </div>
        );
      })}
    </>
  );
}
