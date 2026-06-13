import React from 'react';
import { AttendanceRecord, User } from '../types';
import ApplicationFormPrint from './ApplicationFormPrint';

interface Props {
  users: User[];
  allRecords: AttendanceRecord[];
}

export default function ApplicationFormsPrint({ users, allRecords }: Props) {
  // 申請書が必要なレコード（applicationReasonが存在）をフィルタリング
  const applicationRecords = allRecords.filter(
    rec => rec.applicationReason && rec.applicationReason.trim().length > 0
  );

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
