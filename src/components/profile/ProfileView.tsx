import React, { useState } from 'react';
import { User, ShieldCheck, Zap, Trophy, Users, Flame, ExternalLink, Volume2, Sparkles } from 'lucide-react';
import { TelegramUser, UserBalance } from '../../types';
import { useTelegram } from '../../hooks/useTelegram';

interface ProfileViewProps {
  user: TelegramUser | null;
  balance: UserBalance | null;
  onOpenBotSimulator: () => void;
  onOpenAdmin: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  balance,
  onOpenBotSimulator,
  onOpenAdmin,
}) => {
  const { openLink, triggerHaptic } = useTelegram();
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const toggleHaptics = () => {
    triggerHaptic('medium');
    setHapticsEnabled(!hapticsEnabled);
  };

  return (
    <div className="flex flex-col pb-28 pt-2 px-4 max-w-md mx-auto w-full">
      {/* Title */}
      <h1 className="font-display font-black text-xl text-white tracking-wide mb-1">
        OPERATIVE PROFILE
      </h1>
      <p className="text-xs text-zinc-400 font-mono-code mb-4">
        Authenticated Telegram identity and lifetime performance
      </p>

      {/* Cyberpunk User Card */}
      <div className="glass-card rounded-2xl p-4 mb-4 border-red-900/40 relative overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.15)]">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className="relative">
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-2xl border-2 border-red-600/60 object-cover shadow-[0_0_12px_rgba(220,38,38,0.3)]"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-900 to-zinc-950 border-2 border-red-600/60 flex items-center justify-center font-display font-black text-2xl text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]">
                {user?.firstName?.charAt(0).toUpperCase() || 'M'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 p-1 rounded-md bg-zinc-900 border border-red-600/50">
              <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
            </div>
          </div>

          {/* User Info */}
          <div className="flex flex-col min-w-0">
            <h2 className="font-display font-black text-base sm:text-lg text-white truncate">
              {user?.firstName || 'Cyber Operative'}
            </h2>
            <span className="text-xs font-mono-code text-red-400">
              {user?.username ? `@${user.username}` : 'No username set'}
            </span>
            <span className="text-[10px] font-mono-code text-zinc-400 mt-0.5">
              ID: {user?.telegramId || 'Local-Preview'}
            </span>
          </div>
        </div>

        {/* Level and CTZ Balance Banner */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-display text-zinc-400 uppercase">Current Tier</span>
            <div className="font-display font-bold text-sm text-white">
              Level {balance?.level || 1} — {balance?.levelName || 'Beginner'}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-display text-zinc-400 uppercase">Balance</span>
            <div className="font-display font-black text-sm text-red-400">
              {balance?.ctzBalance.toLocaleString() || 0} CTZ
            </div>
          </div>
        </div>
      </div>

      {/* Lifetime Stats Grid */}
      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-400 mb-2">
        Telemetry & Lifetime Statistics
      </h3>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="glass-card rounded-xl p-3 border-red-950/30">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-display">
            <Zap className="w-3.5 h-3.5 text-red-500" />
            <span>Total Core Taps</span>
          </div>
          <span className="font-mono-code font-bold text-base text-white mt-1 block">
            {(balance?.tapCount || 0).toLocaleString()}
          </span>
        </div>

        <div className="glass-card rounded-xl p-3 border-red-950/30">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-display">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Total Earned</span>
          </div>
          <span className="font-mono-code font-bold text-base text-white mt-1 block">
            {(balance?.totalEarned || 0).toLocaleString()} CTZ
          </span>
        </div>

        <div className="glass-card rounded-xl p-3 border-red-950/30">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-display">
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
            <span>Global Rank</span>
          </div>
          <span className="font-mono-code font-bold text-base text-white mt-1 block">
            #{user?.rank || 1}
          </span>
        </div>

        <div className="glass-card rounded-xl p-3 border-red-950/30">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-display">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Active Streak</span>
          </div>
          <span className="font-mono-code font-bold text-base text-white mt-1 block">
            {balance?.streakDays || 0} Days
          </span>
        </div>
      </div>

      {/* Preferences & System Tools */}
      <div className="glass-card rounded-2xl p-4 border-red-950/40 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-2 text-xs font-display font-semibold text-white">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <span>Haptic Feedback</span>
          </div>
          <button
            onClick={toggleHaptics}
            className={`w-10 h-6 rounded-full p-1 transition-colors ${
              hapticsEnabled ? 'bg-red-600' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                hapticsEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <button
          onClick={onOpenBotSimulator}
          className="w-full flex items-center justify-between py-1 text-xs font-display font-semibold text-zinc-300 hover:text-white transition"
        >
          <span>Open Telegram Bot Terminal</span>
          <ExternalLink className="w-3.5 h-3.5 text-red-400" />
        </button>

        <button
          onClick={onOpenAdmin}
          className="w-full flex items-center justify-between py-1 text-xs font-display font-semibold text-zinc-300 hover:text-red-400 transition"
        >
          <span>Security Admin Console</span>
          <ExternalLink className="w-3.5 h-3.5 text-red-400" />
        </button>

        <button
          onClick={() => openLink('https://t.me/ctz9Bot')}
          className="w-full flex items-center justify-between py-1 text-xs font-display font-semibold text-zinc-300 hover:text-white transition"
        >
          <span>Official Bot & Support (@ctz9Bot)</span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>
    </div>
  );
};
