import React from 'react';
import { AttendanceRecord, User } from '../types';
import ApplicationFormPrint from './ApplicationFormPrint';

interface Props {
  user: User;
  record: AttendanceRecord | undefined;
}

export default function LeaveRequestPrint({ user, record }: Props) {
  if (!record) return null;
  return <ApplicationFormPrint user={user} record={record} />;
}
