import React from 'react';
import { AttendanceRecord, PaidLeaveGrant, User } from '../types';
import ApplicationFormPrint from './ApplicationFormPrint';

interface Props {
  user: User;
  record: AttendanceRecord | undefined;
  allRecords: AttendanceRecord[];
  paidLeaveGrants: PaidLeaveGrant[];
}

export default function LeaveRequestPrint({ user, record, allRecords, paidLeaveGrants }: Props) {
  if (!record) return null;
  return <ApplicationFormPrint user={user} record={record} allRecords={allRecords} paidLeaveGrants={paidLeaveGrants} />;
}
