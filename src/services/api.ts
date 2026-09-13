import {
  TelegramUser,
  UserBalance,
  TaskItem,
  ReferralData,
  LeaderboardUser,
  TransactionItem,
  WalletData,
  AdData,
  BotResponse
} from '../types';

let authToken: string = localStorage.getItem('ctz_auth_token') || '';

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('ctz_auth_token', token);
}

export function getAuthToken(): string {
  return authToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    const errorMsg = data?.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg) as any;
    err.code = data?.error?.code;
    err.details = data?.error;
    throw err;
  }

  return data.data;
}

export const api = {
  authenticate: async (initData: string, mockUser?: any): Promise<{ token: string; user: TelegramUser; balance: UserBalance }> => {
    const result = await request<{ token: string; user: TelegramUser; balance: UserBalance }>('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData, mockUser }),
    });
    setAuthToken(result.token);
    return result;
  },

  getUser: async (): Promise<{ user: TelegramUser; balance: UserBalance }> => {
    return request<{ user: TelegramUser; balance: UserBalance }>('/api/user');
  },

  tap: async (count: number = 1): Promise<{
    balance: number;
    earned: number;
    tapsProcessed: number;
    energy: number;
    maxEnergy: number;
    tapCount: number;
    totalEarned: number;
    level: number;
    levelName: string;
    tapMultiplier: number;
    nextLevel: any;
    secondsUntilFull: number;
  }> => {
    return request('/api/tap', {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  },

  claimDailyReward: async (): Promise<{
    claimedStreakDay: number;
    reward: number;
    newBalance: number;
    streakDays: number;
    lastClaimedAt: number;
  }> => {
    return request('/api/daily-reward/claim', {
      method: 'POST',
    });
  },

  getTasks: async (): Promise<TaskItem[]> => {
    return request<TaskItem[]>('/api/tasks');
  },

  verifyTask: async (taskId: string): Promise<{ reward: number; newBalance: number; level: number }> => {
    return request('/api/tasks/verify', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
  },

  getReferrals: async (): Promise<ReferralData> => {
    return request<ReferralData>('/api/referrals');
  },

  getLeaderboard: async (type: string = 'ctz'): Promise<{ leaders: LeaderboardUser[]; userRank: number }> => {
    return request(`/api/leaderboard?type=${encodeURIComponent(type)}`);
  },

  getWallet: async (): Promise<WalletData> => {
    return request<WalletData>('/api/wallet');
  },

  requestWithdrawal: async (payload: { amount: number; paymentMethod: string; accountAddress: string }): Promise<any> => {
    return request('/api/withdraw', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getTransactions: async (): Promise<TransactionItem[]> => {
    return request<TransactionItem[]>('/api/transactions');
  },

  getAd: async (): Promise<{ ad: AdData | null; intervalSeconds: number; durationSeconds: number }> => {
    return request('/api/ads');
  },

  recordAdEvent: async (adId: string, eventType: 'IMPRESSION' | 'CLICK' | 'CLOSE' | 'COMPLETION') => {
    return request('/api/ads/event', {
      method: 'POST',
      body: JSON.stringify({ adId, eventType }),
    });
  },

  simulateBotCommand: async (command: string, fromUser: any): Promise<BotResponse> => {
    return request('/api/bot/simulate', {
      method: 'POST',
      body: JSON.stringify({ command, fromUser }),
    });
  },

  getAnnouncements: async (): Promise<{ announcements: any[]; maintenanceMode: boolean }> => {
    return request('/api/announcements');
  },

  // Admin API methods
  adminLogin: async (secret: string) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data?.error?.message || 'Login failed');
    return data.token;
  },

  getAdminStats: async (adminToken: string) => {
    const res = await fetch('/api/admin/stats', {
      headers: { 'x-admin-token': adminToken },
    });
    return (await res.json()).data;
  },

  getAdminUsers: async (adminToken: string, search: string = '') => {
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`, {
      headers: { 'x-admin-token': adminToken },
    });
    return (await res.json()).data;
  },

  adjustUserBalance: async (adminToken: string, userId: string, amount: number, reason: string) => {
    const res = await fetch('/api/admin/user/adjust-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ userId, amount, reason }),
    });
    return (await res.json()).data;
  },

  toggleUserSuspension: async (adminToken: string, userId: string, suspend: boolean, reason?: string) => {
    const res = await fetch('/api/admin/user/toggle-suspend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ userId, suspend, reason }),
    });
    return (await res.json()).data;
  },

  getAdminWithdrawals: async (adminToken: string) => {
    const res = await fetch('/api/admin/withdrawals', {
      headers: { 'x-admin-token': adminToken },
    });
    return (await res.json()).data;
  },

  actionAdminWithdrawal: async (adminToken: string, id: string, action: 'APPROVE' | 'REJECT' | 'COMPLETE', note?: string) => {
    const res = await fetch(`/api/admin/withdrawals/${encodeURIComponent(id)}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ action, note }),
    });
    return (await res.json()).data;
  },

  getAdminTasks: async (adminToken: string) => {
    const res = await fetch('/api/admin/tasks', {
      headers: { 'x-admin-token': adminToken },
    });
    return (await res.json()).data;
  },

  saveAdminTask: async (adminToken: string, task: any) => {
    const res = await fetch('/api/admin/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify(task),
    });
    return (await res.json()).data;
  },

  deleteAdminTask: async (adminToken: string, id: string) => {
    const res = await fetch(`/api/admin/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': adminToken },
    });
    return (await res.json()).data;
  },

  updateAdminSettings: async (adminToken: string, settings: Record<string, any>) => {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ settings }),
    });
    return (await res.json()).data;
  },

  getAdminAuditLogs: async (adminToken: string) => {
    const res = await fetch('/api/admin/audit-logs', {
      headers: { 'x-admin-token': adminToken },
    });
    return (await res.json()).data;
  },
};
