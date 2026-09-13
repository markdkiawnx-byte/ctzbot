import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  CheckSquare,
  ArrowUpRight,
  Settings,
  FileText,
  AlertTriangle,
  Search,
  Lock,
  X,
  Plus,
  Trash2,
  Check,
  Ban,
  DollarSign,
  Loader2
} from 'lucide-react';
import { api } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';

interface AdminPanelProps {
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { triggerHaptic, triggerNotificationHaptic } = useTelegram();
  const [adminToken, setAdminToken] = useState<string>(localStorage.getItem('ctz_admin_token') || '');
  const [secretInput, setSecretInput] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'tasks' | 'withdrawals' | 'settings' | 'logs'>('stats');

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Users tab
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [balanceAdjustAmount, setBalanceAdjustAmount] = useState('');
  const [balanceAdjustReason, setBalanceAdjustReason] = useState('');

  // Tasks tab
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [newTask, setNewTask] = useState<any>({
    title: '',
    description: '',
    reward: 500,
    url: '',
    task_type: 'TELEGRAM_CHANNEL',
    is_active: 1,
  });

  // Withdrawals tab
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([]);

  // Settings tab
  const [settingsObj, setSettingsObj] = useState<Record<string, string>>({});

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (adminToken) {
      verifyToken(adminToken);
    }
  }, [adminToken]);

  const verifyToken = async (token: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getAdminStats(token);
      setStats(data);
      setIsAuthenticated(true);
      localStorage.setItem('ctz_admin_token', token);
    } catch {
      setIsAuthenticated(false);
      localStorage.removeItem('ctz_admin_token');
      setErrorMsg('Invalid admin secret key or session expired');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const token = await api.adminLogin(secretInput.trim());
      setAdminToken(token);
      await verifyToken(token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
      setIsLoading(false);
    }
  };

  // Tab Loaders
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'stats') {
      api.getAdminStats(adminToken).then(setStats);
    } else if (activeTab === 'users') {
      api.getAdminUsers(adminToken, userSearch).then(setUsersList);
    } else if (activeTab === 'tasks') {
      api.getAdminTasks(adminToken).then(setTasksList);
    } else if (activeTab === 'withdrawals') {
      api.getAdminWithdrawals(adminToken).then(setWithdrawalsList);
    } else if (activeTab === 'logs') {
      api.getAdminAuditLogs(adminToken).then(setAuditLogs);
    }
  }, [activeTab, isAuthenticated, adminToken]);

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = await api.getAdminUsers(adminToken, userSearch);
    setUsersList(list);
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !balanceAdjustAmount) return;
    try {
      await api.adjustUserBalance(adminToken, selectedUser.id, parseInt(balanceAdjustAmount, 10), balanceAdjustReason);
      triggerNotificationHaptic('success');
      alert(`Adjusted balance for ${selectedUser.first_name}`);
      setBalanceAdjustAmount('');
      setBalanceAdjustReason('');
      setSelectedUser(null);
      const list = await api.getAdminUsers(adminToken, userSearch);
      setUsersList(list);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleSuspend = async (user: any) => {
    const suspend = !user.is_suspended;
    const reason = prompt(`Reason for ${suspend ? 'suspending' : 'unsuspending'} ${user.first_name}:`, 'Security review');
    if (reason === null) return;
    try {
      await api.toggleUserSuspension(adminToken, user.id, suspend, reason);
      triggerNotificationHaptic('success');
      const list = await api.getAdminUsers(adminToken, userSearch);
      setUsersList(list);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleWithdrawalAction = async (id: string, action: 'APPROVE' | 'REJECT' | 'COMPLETE') => {
    const note = prompt(`Enter administrator note for ${action}:`, 'Reviewed and processed');
    try {
      await api.actionAdminWithdrawal(adminToken, id, action, note || undefined);
      triggerNotificationHaptic('success');
      const list = await api.getAdminWithdrawals(adminToken);
      setWithdrawalsList(list);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveAdminTask(adminToken, newTask);
      triggerNotificationHaptic('success');
      setNewTask({
        title: '',
        description: '',
        reward: 500,
        url: '',
        task_type: 'TELEGRAM_CHANNEL',
        is_active: 1,
      });
      const list = await api.getAdminTasks(adminToken);
      setTasksList(list);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteAdminTask(adminToken, id);
      const list = await api.getAdminTasks(adminToken);
      setTasksList(list);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-2xl h-[90vh] glass-card rounded-2xl border-2 border-red-600/50 flex flex-col shadow-[0_0_40px_rgba(220,38,38,0.4)] overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-zinc-950 border-b border-red-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-600/50 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h2 className="font-display font-black text-sm text-white tracking-wider flex items-center gap-2">
                CTZ SECURITY ADMIN
                {isAuthenticated && <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-1.5 py-0.5 rounded font-mono">AUTHORIZED</span>}
              </h2>
              <span className="text-[10px] font-mono-code text-zinc-400">Mission control & audit verification</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Gate */}
        {!isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-600/40 flex items-center justify-center mb-3 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-1">Administrative Authentication</h3>
            <p className="text-xs text-zinc-400 font-mono-code max-w-sm mb-4">
              Enter the CTZ Admin Secret token configured in your environment variables.
            </p>

            {errorMsg && (
              <div className="mb-3 px-3 py-1.5 rounded-lg bg-red-950 border border-red-800 text-xs font-mono-code text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3">
              <input
                type="password"
                value={secretInput}
                onChange={e => setSecretInput(e.target.value)}
                placeholder="Enter ADMIN_SECRET (ctz58235)..."
                className="w-full bg-black/80 border border-zinc-800 focus:border-red-500 rounded-xl px-3 py-2 text-xs font-mono-code text-white outline-none"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-xs font-display font-bold text-white shadow-[0_0_12px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>VERIFY & ENTER</span>
              </button>
              <div className="text-[10px] text-zinc-500 font-mono-code">
                Secret: <code>ctz58235</code>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs */}
            <div className="flex gap-1 px-4 py-2 bg-zinc-950/80 border-b border-zinc-800/80 overflow-x-auto text-xs font-display font-bold">
              {[
                { id: 'stats', label: 'Dashboard' },
                { id: 'users', label: 'Operatives / Users' },
                { id: 'tasks', label: 'Missions' },
                { id: 'withdrawals', label: 'Withdrawals' },
                { id: 'logs', label: 'Audit Logs' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-4 overflow-y-auto font-mono-code text-xs">
              {/* DASHBOARD STATS */}
              {activeTab === 'stats' && stats && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="glass-card rounded-xl p-3 border-red-950/40">
                      <span className="text-[10px] font-display text-zinc-400 uppercase">Total Users</span>
                      <div className="font-display font-black text-xl text-white mt-1">{stats.totalUsers}</div>
                    </div>
                    <div className="glass-card rounded-xl p-3 border-red-950/40">
                      <span className="text-[10px] font-display text-zinc-400 uppercase">Active (24h)</span>
                      <div className="font-display font-black text-xl text-red-400 mt-1">{stats.activeUsers}</div>
                    </div>
                    <div className="glass-card rounded-xl p-3 border-red-950/40">
                      <span className="text-[10px] font-display text-zinc-400 uppercase">Total CTZ Issued</span>
                      <div className="font-display font-black text-xl text-white mt-1">{stats.totalCtzIssued.toLocaleString()}</div>
                    </div>
                    <div className="glass-card rounded-xl p-3 border-red-950/40">
                      <span className="text-[10px] font-display text-zinc-400 uppercase">Pending Withdrawals</span>
                      <div className="font-display font-black text-xl text-amber-400 mt-1">{stats.pendingWithdrawals}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card rounded-xl p-3 border-red-950/40">
                      <span className="text-[10px] font-display text-zinc-400 uppercase">Referrals Formed</span>
                      <div className="font-display font-bold text-lg text-white mt-1">{stats.totalReferrals}</div>
                    </div>
                    <div className="glass-card rounded-xl p-3 border-red-950/40">
                      <span className="text-[10px] font-display text-zinc-400 uppercase">Tasks Completed</span>
                      <div className="font-display font-bold text-lg text-white mt-1">{stats.tasksCompleted}</div>
                    </div>
                    <div className="glass-card rounded-xl p-3 border-red-950/40">
                      <span className="text-[10px] font-display text-zinc-400 uppercase">Anti-Cheat Flags</span>
                      <div className="font-display font-bold text-lg text-red-500 mt-1">{stats.suspiciousCount}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* USERS MANAGEMENT */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <form onSubmit={handleUserSearch} className="flex gap-2">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search by username, name, or Telegram ID..."
                      className="flex-1 bg-black/70 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                    />
                    <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-display font-bold flex items-center gap-1">
                      <Search className="w-3.5 h-3.5" />
                      <span>Search</span>
                    </button>
                  </form>

                  {/* Adjust Balance Dialog */}
                  {selectedUser && (
                    <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-red-600/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-white">
                          Adjust Balance: {selectedUser.first_name} (@{selectedUser.username || 'n/a'})
                        </span>
                        <button onClick={() => setSelectedUser(null)} className="text-zinc-400 hover:text-white">✕</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={balanceAdjustAmount}
                          onChange={e => setBalanceAdjustAmount(e.target.value)}
                          placeholder="Amount (+ or - CTZ)"
                          className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none"
                        />
                        <input
                          type="text"
                          value={balanceAdjustReason}
                          onChange={e => setBalanceAdjustReason(e.target.value)}
                          placeholder="Audit reason..."
                          className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none"
                        />
                      </div>
                      <button
                        onClick={handleAdjustBalance}
                        className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white font-display font-bold rounded-lg"
                      >
                        Commit Balance Adjustment
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {usersList.map(u => (
                      <div key={u.id} className="glass-card rounded-xl p-3 flex items-center justify-between border-red-950/30">
                        <div className="flex flex-col min-w-0">
                          <span className="font-display font-bold text-xs text-white truncate flex items-center gap-1.5">
                            {u.first_name} {u.username ? `(@${u.username})` : ''}
                            {u.is_suspended === 1 && (
                              <span className="px-1.5 bg-red-950 text-red-400 border border-red-800 rounded text-[9px]">SUSPENDED</span>
                            )}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            Telegram ID: {u.telegram_id} • Balance: {u.ctz_balance?.toLocaleString() || 0} CTZ • Lvl {u.level || 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-display font-bold"
                          >
                            Adjust CTZ
                          </button>
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            className={`p-1.5 rounded-lg border text-[10px] ${
                              u.is_suspended
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : 'bg-red-950 text-red-400 border-red-800'
                            }`}
                            title={u.is_suspended ? 'Unsuspend' : 'Suspend'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TASKS MANAGEMENT */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  {/* Create Task Form */}
                  <form onSubmit={handleCreateTask} className="glass-card rounded-xl p-3.5 border-red-950/40 space-y-2">
                    <span className="font-display font-bold text-xs text-white block">Create New Mission</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Task Title (e.g. Join Partner Group)"
                        required
                        className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none"
                      />
                      <input
                        type="number"
                        value={newTask.reward}
                        onChange={e => setNewTask({ ...newTask, reward: parseInt(e.target.value, 10) })}
                        placeholder="Reward CTZ"
                        required
                        className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={newTask.url}
                        onChange={e => setNewTask({ ...newTask, url: e.target.value })}
                        placeholder="Target URL"
                        required
                        className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none"
                      />
                      <select
                        value={newTask.task_type}
                        onChange={e => setNewTask({ ...newTask, task_type: e.target.value })}
                        className="bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none"
                      >
                        <option value="TELEGRAM_CHANNEL">Telegram Channel</option>
                        <option value="TELEGRAM_GROUP">Telegram Group</option>
                        <option value="SOCIAL_MEDIA">Social Media / X</option>
                        <option value="YOUTUBE">YouTube</option>
                        <option value="WEBSITE_VISIT">Website Visit</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={newTask.description}
                      onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Task description..."
                      required
                      className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-xs text-white outline-none"
                    />
                    <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-display font-bold rounded-lg flex items-center justify-center gap-1">
                      <Plus className="w-4 h-4" />
                      <span>Deploy Mission</span>
                    </button>
                  </form>

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {tasksList.map(task => (
                      <div key={task.id} className="glass-card rounded-xl p-3 flex items-center justify-between border-red-950/30">
                        <div className="flex flex-col min-w-0">
                          <span className="font-display font-bold text-xs text-white truncate">
                            {task.title} (+{task.reward} CTZ)
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            Type: {task.task_type} • Claims: {task.current_claims}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950 text-zinc-400 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WITHDRAWALS MANAGEMENT */}
              {activeTab === 'withdrawals' && (
                <div className="space-y-2">
                  {withdrawalsList.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500">No withdrawal requests found.</div>
                  ) : (
                    withdrawalsList.map(w => (
                      <div key={w.id} className="glass-card rounded-xl p-3 border-red-950/30 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-xs text-white">
                            {w.first_name} (@{w.username || 'n/a'})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              w.status === 'PENDING'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : w.status === 'APPROVED' || w.status === 'COMPLETED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300">
                          Amount: <strong className="text-red-400">{w.amount.toLocaleString()} CTZ</strong> • Method: <strong>{w.payment_method}</strong>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono select-all bg-black/60 p-1.5 rounded border border-zinc-800 break-all">
                          Address: {w.account_address}
                        </div>

                        {w.status === 'PENDING' && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleWithdrawalAction(w.id, 'APPROVE')}
                              className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-display font-bold text-[10px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleWithdrawalAction(w.id, 'COMPLETE')}
                              className="flex-1 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-display font-bold text-[10px]"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleWithdrawalAction(w.id, 'REJECT')}
                              className="flex-1 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-display font-bold text-[10px]"
                            >
                              Reject & Refund
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* AUDIT LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-1.5">
                  {auditLogs.map(l => (
                    <div key={l.id} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px]">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="font-bold text-white">{l.action}</span>
                        <span>{new Date(l.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-zinc-300 mt-0.5">
                        Target: {l.target_user_id} • Old: {l.old_value} ➔ New: {l.new_value}
                      </div>
                      {l.reason && <div className="text-zinc-500 italic mt-0.5">Reason: {l.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
