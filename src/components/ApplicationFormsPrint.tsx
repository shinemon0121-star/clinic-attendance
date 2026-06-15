import React from 'react';
import { AttendanceRecord, User } from '../types';
import { formatDateLocal } from '../utils/dateUtils';
import ApplicationFormPrint from './ApplicationFormPrint';

interface Props {
  users: User[];
  allRecords: AttendanceRecord[];
  periodStartDate?: Date;
  periodEndDate?: Date;
}

export default function ApplicationFormsPrint({ users, allRecords, periodStartDate, periodEndDate }: Props) {
  // 申請書が必要なレコード（applicationReasonが存在）をフィルタリング
  let applicationRecords = allRecords.filter(
    rec => rec.applicationReason && rec.applicationReason.trim().length > 0
  );

  // 期間が指定されている場合は、その期間内のレコードのみをフィルタリング
  if (periodStartDate && periodEndDate) {
    const startStr = formatDateLocal(periodStartDate);
    const endStr = formatDateLocal(periodEndDate);
    applicationRecords = applicationRecords.filter(
      rec => rec.date >= startStr && rec.date <= endStr
    );
  }

  // ユーザーごとにグループ化
  const recordsByUser = new Map<string, AttendanceRecord[]>();
  applicationRecords.forEach(rec => {
    const userId = rec.userId?.trim().toLowerCase() || '';
    if (!recordsByUser.has(userId)) {
      recordsByUser.set(userId, []);
    }
    recordsByUser.get(userId)!.push(rec);
  });

  return (
    <div className="hidden print:block">
      {users.map(user => {
        const userRecords = recordsByUser.get(user.id.trim().toLowerCase()) || [];

        if (userRecords.length === 0) return null;

        return (
          <div key={user.id}>
            {userRecords.map((record, index) => (
              <ApplicationFormPrint
                key={`${record.id}-${index}`}
                user={user}
                record={record}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
