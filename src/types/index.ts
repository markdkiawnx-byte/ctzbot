export interface TelegramUser {
  id: string;
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  role?: string;
  createdAt?: number;
  rank?: number;
}

export interface LevelInfo {
  level: number;
  name: string;
  minCtz: number;
  tapMultiplier: number;
  maxEnergyBonus: number;
}

export interface UserBalance {
  ctzBalance: number;
  energy: number;
  maxEnergy: number;
  tapCount: number;
  totalEarned: number;
  level: number;
  levelName: string;
  tapMultiplier: number;
  nextLevel: LevelInfo | null;
  streakDays: number;
  lastDailyClaimedAt: number;
  secondsUntilFullEnergy: number;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  reward: number;
  url: string;
  taskType: 'TELEGRAM_CHANNEL' | 'TELEGRAM_GROUP' | 'WEBSITE_VISIT' | 'YOUTUBE' | 'SOCIAL_MEDIA' | 'CUSTOM';
  isCompleted: boolean;
  currentClaims: number;
  maxClaims: number;
}

export interface FriendItem {
  firstName: string;
  username?: string;
  photoUrl?: string;
  level: number;
  earnedBonus: number;
  joinedAt: number;
}

export interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalInvited: number;
  activeReferrals: number;
  totalEarnings: number;
  referrerBonus: number;
  referredBonus: number;
  friends: FriendItem[];
}

export interface LeaderboardUser {
  rank: number;
  id: string;
  firstName: string;
  username?: string;
  photoUrl?: string;
  balance: number;
  level: number;
  tapCount: number;
  referralsCount: number;
  tasksCount: number;
}

export interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: number;
}

export interface WithdrawalItem {
  id: string;
  amount: number;
  payment_method: string;
  account_address: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  admin_notes?: string;
  created_at: number;
  first_name?: string;
  username?: string;
}

export interface WalletData {
  ctzBalance: number;
  totalEarned: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  dailyLimit: number;
  allowedMethods: string[];
  pendingWithdrawals: WithdrawalItem[];
  disclaimer: string;
}

export interface AdData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  targetUrl?: string;
  ctaText: string;
  durationSeconds: number;
}

export interface BotButton {
  text: string;
  url?: string;
  web_app?: { url: string };
  callback_data?: string;
}

export interface BotResponse {
  text: string;
  parse_mode?: string;
  reply_markup?: {
    inline_keyboard?: BotButton[][];
  };
}
