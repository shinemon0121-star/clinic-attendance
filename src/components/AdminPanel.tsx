import React, { useState, useEffect } from 'react';
import { User, AppSettings, PaidLeaveGrant, HourlyLeaveGrant, IcCardUser } from '../types';
import { formatDateLocal, calcAutoPaidLeaveGrants, calcAutoHourlyLeaveGrants } from '../utils/dateUtils';
import { fetchLatestUnconsumedTap, markTapConsumed } from '../utils/supabaseClient';

interface Props {
  users: User[];
  activeUserId: string;
  onSelectUser: (id: string) => void;
  onAddUser: (name: string, dept: string, joined: string) => void;
  onUpdateUser: (user: User) => void;
  onResetData: () => void;
  onResetUsers: () => void;
  settings: AppSettings;
  lastSyncTime: string | null;
  paidLeaveGrants: PaidLeaveGrant[];
  onAddGrant: (grant: Omit<PaidLeaveGrant, 'id'>) => void;
  onBulkAddGrants: (grants: Omit<PaidLeaveGrant, 'id'>[]) => void;
  hourlyLeaveGrants: HourlyLeaveGrant[];
  onAddHourlyGrant: (grant: Omit<HourlyLeaveGrant, 'id'>) => void;
  onBulkAddHourlyGrants: (grants: Omit<HourlyLeaveGrant, 'id'>[]) => void;
  onUpdateSettings: (s: AppSettings) => void;
  onBulkSync: () => void;
  onFetchFromSheet: () => void;
  icCardUsers: IcCardUser[];
  onRegisterIcCard: (idm: string, userId: string, label: string) => Promise<void>;
  onDeleteIcCard: (idm: string) => Promise<void>;
}

type Tab = 'users' | 'settings' | 'leave' | 'hourlyLeave' | 'icCard';

export default function AdminPanel({
  users,
  activeUserId,
  onSelectUser,
  onAddUser,
  onUpdateUser,
  onResetData,
  onResetUsers,
  settings,
  lastSyncTime,
  paidLeaveGrants,
  onAddGrant,
  onBulkAddGrants,
  hourlyLeaveGrants,
  onAddHourlyGrant,
  onBulkAddHourlyGrants,
  onUpdateSettings,
  onBulkSync,
  onFetchFromSheet,
  icCardUsers,
  onRegisterIcCard,
  onDeleteIcCard,
}: Props) {
  const [tab, setTab] = useState<Tab>('users');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Add user form
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newJoined, setNewJoined] = useState(formatDateLocal(new Date()));
  const [newRole, setNewRole] = useState<'ADMIN' | 'STAFF'>('STAFF');

  // Settings
  const [urlInput, setUrlInput] = useState(settings.spreadsheetUrl);

  // Paid leave grant form
  const [grantUserId, setGrantUserId] = useState(activeUserId);
  const [grantDate, setGrantDate] = useState(formatDateLocal(new Date()));
  const [grantAmount, setGrantAmount] = useState('');
  const [grantDesc, setGrantDesc] = useState('');

  // Hourly leave grant form
  const [hourlyGrantDate, setHourlyGrantDate] = useState(formatDateLocal(new Date()));
  const [hourlyGrantAmount, setHourlyGrantAmount] = useState('');
  const [hourlyGrantDesc, setHourlyGrantDesc] = useState('');

  // ICカード登録
  const [icWatching, setIcWatching] = useState(false);
  const [icDetectedTap, setIcDetectedTap] = useState<{ id: string; idm: string } | null>(null);
  const [icAssignUserId, setIcAssignUserId] = useState(activeUserId);
  const [icLabel, setIcLabel] = useState('');

  const handleAddUser = () => {
    if (!newName.trim()) return;
    onAddUser(newName.trim(), newDept.trim(), newJoined);
    setNewName('');
    setNewDept('');
  };

  const handleSaveSettings = () => {
    onUpdateSettings({ spreadsheetUrl: urlInput, displaySpreadsheetUrl: urlInput });
  };

  const handleAddGrant = () => {
    if (!grantAmount || isNaN(parseFloat(grantAmount))) {
      alert('日数を入力してください');
      return;
    }
    onAddGrant({ userId: grantUserId, grantDate, grantAmount: parseFloat(grantAmount), description: grantDesc || '手動調整' });
    setGrantAmount('');
    setGrantDesc('');
  };

  const activeUser = users.find(u => u.id === activeUserId) || users[0];

  // スタッフを並び替え：管理者がトップ、その後は入社年が古い順
  const sortedUsers = [...users].sort((a, b) => {
    // 管理者を最初に
    if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
    if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;

    // 同じロール内では入社年が古い順
    return new Date(a.joinedDate).getTime() - new Date(b.joinedDate).getTime();
  });

  const TABS: { id: Tab; label: string }[] = [
    { id: 'users', label: 'スタッフ' },
    { id: 'leave', label: '有給管理' },
    { id: 'hourlyLeave', label: '時間休管理' },
    { id: 'icCard', label: 'ICカード' },
    { id: 'settings', label: '設定' },
  ];

  // 「次のタップを登録」待機中、未登録カードのタップを定期確認する
  useEffect(() => {
    if (!icWatching) return;
    const check = async () => {
      try {
        const tap = await fetchLatestUnconsumedTap();
        if (tap && !icCardUsers.some(c => c.idm === tap.idm)) {
          setIcDetectedTap({ id: tap.id, idm: tap.idm });
          setIcWatching(false);
        }
      } catch (e) {
        console.error('ICカード検知エラー:', e);
      }
    };
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [icWatching, icCardUsers]);

  const handleConfirmIcCard = async () => {
    if (!icDetectedTap) return;
    await onRegisterIcCard(icDetectedTap.idm, icAssignUserId, icLabel);
    await markTapConsumed(icDetectedTap.id);
    setIcDetectedTap(null);
    setIcLabel('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              tab === t.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* ─ スタッフタブ ─ */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-slate-500 mb-2">表示中のスタッフ</div>
              <div className="space-y-1">
                {sortedUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => onSelectUser(u.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                      u.id === activeUserId
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <span className="block">{u.name}</span>
                      <span className={`text-[10px] block ${u.id === activeUserId ? 'text-blue-200' : 'text-slate-400'}`}>
                        {u.department} • 入社: {u.joinedDate}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Edit user */}
            {activeUser && (
              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold text-slate-500">スタッフ情報編集</div>
                <input
                  value={editingUser?.name ?? activeUser?.name ?? ''}
                  onChange={e => setEditingUser({ ...(editingUser ?? activeUser!), name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  placeholder="氏名"
                />
                <input
                  value={editingUser?.department ?? activeUser?.department ?? ''}
                  onChange={e => setEditingUser({ ...(editingUser ?? activeUser!), department: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  placeholder="部署"
                />
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">入社日</label>
                    <input
                      type="date"
                      value={editingUser?.joinedDate ?? activeUser?.joinedDate ?? ''}
                      onChange={e => setEditingUser({ ...(editingUser ?? activeUser!), joinedDate: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={editingUser?.role ?? activeUser?.role ?? 'STAFF'}
                    onChange={e => setEditingUser({ ...(editingUser ?? activeUser!), role: e.target.value as 'ADMIN' | 'STAFF' })}
                    className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  >
                    <option value="STAFF">スタッフ</option>
                    <option value="ADMIN">管理者</option>
                  </select>
                  <button
                    onClick={() => {
                      if (editingUser) {
                        onUpdateUser(editingUser);
                        setEditingUser(null);
                      }
                    }}
                    disabled={!editingUser}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-40"
                  >
                    更新
                  </button>
                </div>
              </div>
            )}

            {/* Add user */}
            <div className="border border-dashed border-slate-300 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-slate-500">スタッフ追加</div>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="氏名"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
              />
              <input
                value={newDept}
                onChange={e => setNewDept(e.target.value)}
                placeholder="部署"
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newJoined}
                  onChange={e => setNewJoined(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                />
                <button
                  onClick={handleAddUser}
                  disabled={!newName.trim()}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold disabled:opacity-40"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─ 有給管理タブ ─ */}
        {tab === 'leave' && (() => {
          const targetUser = users.find(u => u.id === grantUserId) ?? users[0];
          const autoGrants = targetUser?.joinedDate
            ? calcAutoPaidLeaveGrants(targetUser.joinedDate)
            : [];
          const recordedDates = new Set(
            paidLeaveGrants
              .filter(g => g.userId === targetUser?.id && g.description !== '手動調整')
              .map(g => g.grantDate)
          );
          const missing = autoGrants.filter(g => !recordedDates.has(g.grantDate));

          return (
            <div className="space-y-4">
              {/* スタッフ選択 */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">対象スタッフ</label>
                <select
                  value={grantUserId}
                  onChange={e => setGrantUserId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                >
                  {sortedUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* 自動付与スケジュール */}
              <div className="border border-blue-200 rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-3 py-2 flex items-center justify-between">
                  <div className="text-xs font-bold text-blue-700">
                    法定付与スケジュール
                    {targetUser?.joinedDate && (
                      <span className="ml-2 text-[10px] font-normal text-blue-500">
                        入社日: {targetUser.joinedDate}
                      </span>
                    )}
                  </div>
                  {missing.length > 0 && (
                    <button
                      onClick={() => {
                        onBulkAddGrants(missing.map(g => ({
                          userId: targetUser!.id,
                          grantDate: g.grantDate,
                          grantAmount: g.grantAmount,
                          description: g.label,
                        })));
                      }}
                      className="text-[10px] font-bold px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      未記録 {missing.length}件を追加
                    </button>
                  )}
                </div>
                {autoGrants.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-4">
                    {targetUser?.joinedDate ? '付与予定なし（入社6ヶ月未満）' : '入社日が未設定です'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                    {autoGrants.map(g => {
                      const recorded = recordedDates.has(g.grantDate);
                      return (
                        <div key={g.months} className={`flex items-center justify-between px-3 py-1.5 text-xs ${recorded ? 'bg-white' : 'bg-amber-50'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${recorded ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'}`}>
                              {recorded ? '✓' : '!'}
                            </span>
                            <span className="text-slate-600">{g.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            <span className="text-slate-400">{g.grantDate}</span>
                            <span className={`font-black ${recorded ? 'text-green-700' : 'text-amber-700'}`}>
                              {g.grantAmount}日
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 付与記録履歴 */}
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1.5">付与・調整履歴（全スタッフ）</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {paidLeaveGrants.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-3">記録なし</div>
                  ) : (
                    paidLeaveGrants.map(g => {
                      const u = users.find(u => u.id === g.userId);
                      return (
                        <div key={g.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-1.5">
                          <div>
                            <span className="font-bold text-slate-700">{u?.name ?? g.userId}</span>
                            <span className="text-slate-400 ml-2">{g.grantDate}</span>
                          </div>
                          <div className="text-right flex items-center gap-1.5">
                            <span className="font-black text-green-700">+{g.grantAmount}日</span>
                            {g.description && <span className="text-slate-400 text-[10px]">{g.description}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 手動調整フォーム */}
              <div className="border border-dashed border-slate-300 rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold text-slate-500">手動調整（残日数の補正・繰越など）</div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={grantDate}
                    onChange={e => setGrantDate(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    value={grantAmount}
                    onChange={e => setGrantAmount(e.target.value)}
                    placeholder="日数"
                    min="-99"
                    step="0.5"
                    className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
                <input
                  value={grantDesc}
                  onChange={e => setGrantDesc(e.target.value)}
                  placeholder="摘要（例: 繰越、初期残高調整）"
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                />
                <button
                  onClick={() => {
                    if (!grantAmount || isNaN(parseFloat(grantAmount))) {
                      alert('日数を入力してください');
                      return;
                    }
                    onAddGrant({
                      userId: grantUserId,
                      grantDate,
                      grantAmount: parseFloat(grantAmount),
                      description: grantDesc || '手動調整',
                    });
                    setGrantAmount('');
                    setGrantDesc('');
                  }}
                  disabled={!grantAmount}
                  className="w-full py-1.5 bg-slate-700 text-white rounded-lg text-xs font-bold disabled:opacity-40"
                >
                  調整を追加
                </button>
              </div>
            </div>
          );
        })()}

        {/* ─ 時間休管理タブ ─ */}
        {tab === 'hourlyLeave' && (() => {
          const targetUser = users.find(u => u.id === grantUserId) ?? users[0];
          const autoGrants = targetUser?.joinedDate
            ? calcAutoHourlyLeaveGrants(targetUser.joinedDate)
            : [];
          const recordedDates = new Set(
            hourlyLeaveGrants
              .filter(g => g.userId === targetUser?.id && g.description !== '手動調整')
              .map(g => g.grantDate)
          );
          const missing = autoGrants.filter(g => !recordedDates.has(g.grantDate));

          return (
            <div className="space-y-4">
              {/* スタッフ選択 */}
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">対象スタッフ</label>
                <select
                  value={grantUserId}
                  onChange={e => setGrantUserId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                >
                  {sortedUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="text-[10px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
                時間休は「有給休暇を1時間単位で取れる」制度です。別枠でもらえる休暇ではなく、<b>有給残高からそのまま差し引かれます</b>。
                ここで設定するのは「有給のうち時間単位で取ってよい年間の上限（年5日＝40時間、毎年リセット）」です。
                令和8年9月16日（2026-09-16）制度開始。各職員の有給起算日（入社+6ヶ月の月日）ごとに上限がリセットされます。
                制度開始日から最初の起算日までは案内文書の表に従い、下の「手動調整」から上限時間数を入力してください。
              </div>

              {/* 年度ごとの利用枠 */}
              <div className="border border-emerald-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-50 px-3 py-2 flex items-center justify-between">
                  <div className="text-xs font-bold text-emerald-700">
                    年度別 利用上限スケジュール
                    {targetUser?.joinedDate && (
                      <span className="ml-2 text-[10px] font-normal text-emerald-500">
                        入社日: {targetUser.joinedDate}
                      </span>
                    )}
                  </div>
                  {missing.length > 0 && (
                    <button
                      onClick={() => {
                        onBulkAddHourlyGrants(missing.map(g => ({
                          userId: targetUser!.id,
                          grantDate: g.grantDate,
                          grantHours: g.grantHours,
                          description: g.label,
                        })));
                      }}
                      className="text-[10px] font-bold px-2 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      未記録 {missing.length}件を追加
                    </button>
                  )}
                </div>
                {autoGrants.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-4">
                    {targetUser?.joinedDate ? '対象年度なし（制度開始前）' : '入社日が未設定です'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                    {autoGrants.map(g => {
                      const recorded = recordedDates.has(g.grantDate);
                      return (
                        <div key={g.grantDate} className={`flex items-center justify-between px-3 py-1.5 text-xs ${recorded ? 'bg-white' : 'bg-amber-50'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${recorded ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'}`}>
                              {recorded ? '✓' : '!'}
                            </span>
                            <span className="text-slate-600">年度枠（{g.grantDate}〜）</span>
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            <span className="text-slate-400">{g.grantDate}</span>
                            <span className={`font-black ${recorded ? 'text-green-700' : 'text-amber-700'}`}>
                              上限{g.grantHours}時間
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 設定履歴 */}
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1.5">年度枠 設定履歴（全スタッフ）</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {hourlyLeaveGrants.length === 0 ? (
                    <div className="text-xs text-slate-400 text-center py-3">記録なし</div>
                  ) : (
                    hourlyLeaveGrants.map(g => {
                      const u = users.find(u => u.id === g.userId);
                      return (
                        <div key={g.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-1.5">
                          <div>
                            <span className="font-bold text-slate-700">{u?.name ?? g.userId}</span>
                            <span className="text-slate-400 ml-2">{g.grantDate}</span>
                          </div>
                          <div className="text-right flex items-center gap-1.5">
                            <span className="font-black text-emerald-700">上限{g.grantHours}時間</span>
                            {g.description && <span className="text-slate-400 text-[10px]">{g.description}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 手動調整フォーム */}
              <div className="border border-dashed border-slate-300 rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold text-slate-500">手動調整（年度枠の開始日と上限時間数を設定）</div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={hourlyGrantDate}
                    onChange={e => setHourlyGrantDate(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    value={hourlyGrantAmount}
                    onChange={e => setHourlyGrantAmount(e.target.value)}
                    placeholder="時間数"
                    min="-99"
                    step="1"
                    className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  />
                </div>
                <input
                  value={hourlyGrantDesc}
                  onChange={e => setHourlyGrantDesc(e.target.value)}
                  placeholder="摘要（例: 制度開始時の上限設定）"
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                />
                <button
                  onClick={() => {
                    if (!hourlyGrantAmount || isNaN(parseFloat(hourlyGrantAmount))) {
                      alert('時間数を入力してください');
                      return;
                    }
                    onAddHourlyGrant({
                      userId: grantUserId,
                      grantDate: hourlyGrantDate,
                      grantHours: parseFloat(hourlyGrantAmount),
                      description: hourlyGrantDesc || '手動調整',
                    });
                    setHourlyGrantAmount('');
                    setHourlyGrantDesc('');
                  }}
                  disabled={!hourlyGrantAmount}
                  className="w-full py-1.5 bg-slate-700 text-white rounded-lg text-xs font-bold disabled:opacity-40"
                >
                  調整を追加
                </button>
              </div>
            </div>
          );
        })()}

        {/* ─ ICカードタブ ─ */}
        {tab === 'icCard' && (
          <div className="space-y-4">
            <div className="text-[10px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              RC-S380等のカードリーダーにかざしたICカード（社員証など）と、スタッフを結びつけます。
              登録しておくと、カードをかざすだけでそのスタッフの「今日を申請する」画面が開き、時間外終了時刻が自動入力されます。
            </div>

            {/* 新規登録 */}
            <div className="border border-emerald-200 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-emerald-700">新しいカードを登録</div>

              {!icDetectedTap ? (
                <>
                  {!icWatching ? (
                    <button
                      onClick={() => setIcWatching(true)}
                      className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                    >
                      次にかざされたカードを検知する
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-xs font-bold text-amber-700 animate-pulse">
                        カードリーダーにカードをかざしてください…
                      </span>
                      <button
                        onClick={() => setIcWatching(false)}
                        className="text-[10px] font-bold px-2 py-1 bg-white border border-amber-300 text-amber-700 rounded-lg"
                      >
                        中止
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-500">
                    カードを検知しました（ID: {icDetectedTap.idm.slice(0, 4)}…{icDetectedTap.idm.slice(-4)}）
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">このカードの持ち主</label>
                    <select
                      value={icAssignUserId}
                      onChange={e => setIcAssignUserId(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                    >
                      {sortedUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={icLabel}
                    onChange={e => setIcLabel(e.target.value)}
                    placeholder="メモ（例：社員証）任意"
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmIcCard}
                      className="flex-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                    >
                      登録する
                    </button>
                    <button
                      onClick={() => setIcDetectedTap(null)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 登録済み一覧 */}
            <div>
              <div className="text-xs font-bold text-slate-500 mb-1.5">登録済みカード</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {icCardUsers.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-3">まだ登録がありません</div>
                ) : (
                  icCardUsers.map(c => {
                    const u = users.find(u => u.id === c.userId);
                    return (
                      <div key={c.idm} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-1.5">
                        <div>
                          <span className="font-bold text-slate-700">{u?.name ?? c.userId}</span>
                          {c.label && <span className="text-slate-400 ml-2">{c.label}</span>}
                          <span className="text-slate-300 ml-2 text-[10px]">
                            {c.idm.slice(0, 4)}…{c.idm.slice(-4)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(`${u?.name ?? c.userId}のカード登録を解除しますか？`)) {
                              onDeleteIcCard(c.idm);
                            }
                          }}
                          className="text-[10px] font-bold px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          解除
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─ 設定タブ ─ */}
        {tab === 'settings' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">
                Google スプレッドシート URL（GAS デプロイ先）
              </label>
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {lastSyncTime && (
                <div className="text-[10px] text-slate-400 mt-1">最終同期: {lastSyncTime}</div>
              )}
              <button
                onClick={handleSaveSettings}
                className="mt-2 w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
              >
                URL を保存
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-500">データ同期</div>
              <button
                onClick={onBulkSync}
                className="w-full py-2 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                全データをシートへ書き出し
              </button>
              <button
                onClick={onFetchFromSheet}
                className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200"
              >
                シートから最新データ取得
              </button>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="text-xs font-bold text-slate-500 mb-2">危険ゾーン</div>
              <button
                onClick={onResetData}
                className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 border border-red-200 mb-2"
              >
                勤務記録をリセット
              </button>
              <button
                onClick={() => {
                  if (window.confirm('ユーザーデータを初期化（正しい入社日で再投入）しますか？')) {
                    onResetUsers();
                  }
                }}
                className="w-full py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-100 border border-orange-200"
              >
                ユーザーデータを初期化
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
