import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AttendanceRecord, ShiftType, User, AppSettings, PaidLeaveGrant } from './types';
import {
  getAttendancePeriod,
  getDatesInRange,
  formatDateLocal,
  parseAndFormatDate,
  isJapaneseHoliday,
  isDefaultRestDay,
  calculateSubstituteLeaveBalance,
  calculatePaidLeaveBalance,
} from './utils/dateUtils';
import { loadUsersFromDB, loadRecordsFromDB, loadGrantsFromDB, saveUsersToDB, saveRecordsToDB, saveGrantsToDB, deleteRecord } from './utils/supabaseClient';
import AttendanceTable from './components/AttendanceTable';
import ClockPanel from './components/ClockPanel';
import AdminPanel from './components/AdminPanel';
import EditRecordModal from './components/EditRecordModal';
import OvertimeOrderPrint from './components/OvertimeOrderPrint';
import LeaveRequestPrint from './components/LeaveRequestPrint';
import AllAttendancePrint from './components/AllAttendancePrint';

const INITIAL_USERS: User[] = [
  { id: 'fujiwara', name: '藤原慎太郎', department: 'CE（臨床工学部）', role: 'ADMIN', joinedDate: '2022-03-15' },
  { id: 'tsukahara', name: '塚原蓮々', department: 'CE（臨床工学部）', role: 'STAFF', joinedDate: '2024-04-01' },
];

const App: React.FC = () => {
  // Supabaseのみを使用。ローカルストレージは使わない（マルチデバイス対応）
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [activeUserId, setActiveUserId] = useState<string>(INITIAL_USERS[0]?.id || '');
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [paidLeaveGrants, setPaidLeaveGrants] = useState<PaidLeaveGrant[]>([]);

  const [settings, setSettings] = useState<AppSettings>({ spreadsheetUrl: '', displaySpreadsheetUrl: '' });

  const [viewDate, setViewDate] = useState(new Date());
  const [editingData, setEditingData] = useState<{ date: Date; record: AttendanceRecord | undefined } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<'ATTENDANCE' | 'OVERTIME_ORDER' | 'LEAVE_REQUEST' | 'ALL_ATTENDANCE'>('ATTENDANCE');
  const [selectedPrintRecord, setSelectedPrintRecord] = useState<AttendanceRecord | undefined>(undefined);

  const fileSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fileStatus, setFileStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Supabase への自動同期（500ms デバウンス）
  useEffect(() => {
    if (fileSaveTimer.current) clearTimeout(fileSaveTimer.current);
    setFileStatus('saving');
    fileSaveTimer.current = setTimeout(async () => {
      try {
        await Promise.all([
          saveRecordsToDB(allRecords),
          saveUsersToDB(users),
          saveGrantsToDB(paidLeaveGrants),
        ]);
        setFileStatus('saved');
        setLastSyncTime(new Date().toLocaleTimeString('ja-JP'));
      } catch (e) {
        console.error('Supabase save failed', e);
        setFileStatus('error');
      }
    }, 500);
  }, [allRecords, users, paidLeaveGrants]);

  // 起動時に Supabase からデータをロード
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔄 Supabase からのロード開始...');
        let [usersData, recordsData, grantsData] = await Promise.all([
          loadUsersFromDB(),
          loadRecordsFromDB(),
          loadGrantsFromDB(),
        ]);

        // users が空の場合、初期ユーザーを投入
        if (usersData.length === 0) {
          console.log('⚠️ ユーザーが空です。初期ユーザーを投入します...');
          await saveUsersToDB(INITIAL_USERS);
          usersData = INITIAL_USERS;
        }

        console.log('✅ ロード成功:', { usersData: usersData.length, recordsData: recordsData.length, grantsData: grantsData.length });
        setUsers(usersData);
        setActiveUserId(usersData[0]?.id || '');
        if (recordsData.length > 0) {
          setAllRecords(recordsData);
        }
        if (grantsData.length > 0) {
          setPaidLeaveGrants(grantsData);
        }
        setFileStatus('saved');
      } catch (e: any) {
        console.error('❌ Supabase からのロード失敗:', {
          message: e?.message,
          code: e?.code,
          details: e?.details,
          hint: e?.hint,
          fullError: e
        });
        setFileStatus('error');
      }
    };
    loadData();
  }, []);


  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [usersData, recordsData, grantsData] = await Promise.all([
        loadUsersFromDB(),
        loadRecordsFromDB(),
        loadGrantsFromDB(),
      ]);
      setUsers(usersData);
      setAllRecords(recordsData);
      setPaidLeaveGrants(grantsData);
      setLastSyncTime(new Date().toLocaleTimeString('ja-JP'));
      alert('✅ Supabase から最新データを取得しました。');
    } catch (e: any) {
      console.error('詳細エラー:', e);
      alert(`❌ 取得失敗: ${JSON.stringify(e)}`);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const resetUsers = useCallback(async () => {
    try {
      setUsers(INITIAL_USERS);
      setActiveUserId(INITIAL_USERS[0].id);
      alert('✅ ユーザーデータを初期化しました。Supabase に同期中...');
    } catch (e: any) {
      console.error('ユーザー初期化エラー:', e);
      alert(`❌ 初期化失敗: ${e.message}`);
    }
  }, []);

  const activeUser = users.find(u => u.id === activeUserId) || users[0];
  const filteredRecords = allRecords.filter(r =>
    r.userId && r.userId.trim().toLowerCase() === activeUserId.trim().toLowerCase()
  );
  const subLeaveBalance = calculateSubstituteLeaveBalance(allRecords, activeUserId);
  const todayStr = formatDateLocal(new Date());
  const todayRecord = filteredRecords.find(r => r.date === todayStr);

  const period = getAttendancePeriod(viewDate);
  const dates = getDatesInRange(period.startDate, period.endDate);

  useEffect(() => {
    if (printTarget === 'ATTENDANCE' || printTarget === 'LEAVE_REQUEST') {
      document.body.classList.add('print-portrait');
      document.body.classList.remove('print-landscape');
    } else if (printTarget === 'OVERTIME_ORDER') {
      document.body.classList.add('print-landscape');
      document.body.classList.remove('print-portrait');
    }
  }, [printTarget]);

  const handlePrint = (target: 'ATTENDANCE' | 'OVERTIME_ORDER' | 'LEAVE_REQUEST' | 'ALL_ATTENDANCE', record?: AttendanceRecord) => {
    setPrintTarget(target);
    if (record) setSelectedPrintRecord(record);
    setTimeout(() => window.print(), 300);
  };

  // 申請の保存
  const handleSaveRecord = (rec: AttendanceRecord) => {
    const uId = activeUserId.trim().toLowerCase();
    const updatedRec = { ...rec, userId: uId };
    setAllRecords(prev => [
      ...prev.filter(r => !(r.date === rec.date && r.userId === uId)),
      updatedRec,
    ]);
    setEditingData(null);
  };

  // 申請の取消（記録を削除して自動入力に戻す）
  const handleDeleteRecord = async () => {
    if (!editingData) return;
    try {
      const uId = activeUserId.trim().toLowerCase();
      const dateStr = formatDateLocal(editingData.date);
      const recordToDelete = allRecords.find(r => r.date === dateStr && r.userId === uId);

      if (recordToDelete?.id) {
        await deleteRecord(recordToDelete.id);
        console.log(`✅ レコード削除: ${recordToDelete.id}`);
      }

      setAllRecords(prev => prev.filter(r => !(r.date === dateStr && r.userId === uId)));
      setEditingData(null);
    } catch (e: any) {
      console.error('❌ レコード削除エラー:', e);
      alert(`❌ 削除失敗: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-['Noto_Sans_JP']">
      <header className="bg-white border-b sticky top-0 z-40 p-4 flex justify-between items-center no-print shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-slate-800 tracking-tighter">Smart Attendance</h1>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            fileStatus === 'saved'  ? 'bg-green-100 text-green-700' :
            fileStatus === 'saving' ? 'bg-yellow-100 text-yellow-700 animate-pulse' :
            'bg-red-100 text-red-700'
          }`}>
            {fileStatus === 'saved' ? '保存済み' : fileStatus === 'saving' ? '保存中…' : '保存失敗'}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handlePrint('ATTENDANCE')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm">
            出勤簿（個人）
          </button>
          <button onClick={() => handlePrint('ALL_ATTENDANCE')} className="px-4 py-2 bg-blue-800 text-white rounded-lg text-xs font-bold hover:bg-blue-900 shadow-sm">
            出勤簿（全員）
          </button>
          <button onClick={() => handlePrint('OVERTIME_ORDER')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">
            命令簿 印刷
          </button>
          <button
            onClick={() => refreshData()}
            className={`px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 ${isSyncing ? 'animate-pulse opacity-70' : ''}`}
          >
            {isSyncing ? '更新中...' : '最新取得'}
          </button>
        </div>
      </header>

      {/* 出勤簿 印刷ヘッダー */}
      {printTarget === 'ATTENDANCE' && (
        <div className="print:block hidden attendance-table p-6">
          <h1 className="text-2xl font-bold mb-4 text-center">出　勤　簿</h1>
          <div className="flex justify-between mb-2 text-[10pt]">
            <div>期間：{formatDateLocal(period.startDate)} ～ {formatDateLocal(period.endDate)}</div>
            <div>所属：{activeUser?.department}</div>
            <div>氏名：{activeUser?.name}</div>
          </div>
        </div>
      )}

      {printTarget === 'OVERTIME_ORDER' && (
        <OvertimeOrderPrint records={filteredRecords} user={activeUser!} period={period} dates={dates} />
      )}

      {printTarget === 'LEAVE_REQUEST' && (
        <LeaveRequestPrint user={activeUser!} record={selectedPrintRecord} />
      )}

      {printTarget === 'ALL_ATTENDANCE' && (
        <AllAttendancePrint
          users={users}
          allRecords={allRecords}
          paidLeaveGrants={paidLeaveGrants}
          dates={dates}
          period={period}
        />
      )}

      <main className={`max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8 ${printTarget === 'ATTENDANCE' || printTarget === 'ALL_ATTENDANCE' ? '' : 'print:hidden'}`}>

        {/* ── 上部パネル（状況 + 管理） ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
          <div className="lg:col-span-1">
            <ClockPanel
              user={activeUser!}
              currentRecord={todayRecord}
              subLeaveBalance={subLeaveBalance}
              paidLeaveGrants={paidLeaveGrants}
              allRecords={allRecords}
              onOpenToday={() => setEditingData({ date: new Date(), record: todayRecord })}
            />
          </div>
          <div className="lg:col-span-2">
            <AdminPanel
              users={users}
              activeUserId={activeUserId}
              onSelectUser={setActiveUserId}
              onAddUser={(name, dept, joined) => {
                const newUser: User = {
                  id: name.toLowerCase().replace(/\s+/g, ''),
                  name,
                  department: dept,
                  role: 'STAFF',
                  joinedDate: joined || formatDateLocal(new Date()),
                };
                setUsers(prev => [...prev, newUser]);
              }}
              onUpdateUser={(updated) => {
                setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
              }}
              onResetData={() => { if (window.confirm('勤務記録をリセットしますか？')) setAllRecords([]); }}
              onResetUsers={resetUsers}
              settings={settings}
              lastSyncTime={lastSyncTime}
              paidLeaveGrants={paidLeaveGrants}
              onAddGrant={(g) => {
                const newGrant = { ...g, id: `grant-${Date.now()}` };
                setPaidLeaveGrants(prev => [...prev, newGrant]);
              }}
              onBulkAddGrants={(grants) => {
                const newGrants = grants.map((g, i) => ({ ...g, id: `grant-${Date.now()}-${i}` }));
                setPaidLeaveGrants(prev => [...prev, ...newGrants]);
              }}
              onUpdateSettings={setSettings}
              onBulkSync={() => alert('✅ 自動保存機能が有効です。変更は自動的に Supabase に同期されます。')}
              onFetchFromSheet={refreshData}
            />
          </div>
        </div>

        {/* ── 勤務実績明細テーブル ── */}
        <section className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 print:p-2 print:border-none print:rounded-none print:shadow-none print:bg-white print:break-inside-avoid ${printTarget === 'OVERTIME_ORDER' ? 'print:hidden' : 'attendance-table'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                勤務実績明細
              </h2>
              <p className="text-xs text-slate-500 mt-1 ml-4">
                水・日・祝は公休（自動）、他は日勤（自動）。変更申請は各行の「申請」ボタンから。
              </p>
            </div>
            <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                className="p-2 hover:bg-white rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-black px-4">{period.year}年 {period.month}月度</span>
              <button
                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                className="p-2 hover:bg-white rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <AttendanceTable
            user={activeUser!}
            records={filteredRecords}
            subLeaveBalance={subLeaveBalance}
            paidLeaveGrants={paidLeaveGrants}
            dates={dates}
            onEditRequest={(date, record) => setEditingData({ date, record })}
            onPrintRequest={(record) => handlePrint('LEAVE_REQUEST', record)}
          />
        </section>
      </main>

      {editingData && (
        <EditRecordModal
          date={editingData.date}
          record={editingData.record}
          onSave={handleSaveRecord}
          onDelete={handleDeleteRecord}
          onClose={() => setEditingData(null)}
        />
      )}
    </div>
  );
};

export default App;
