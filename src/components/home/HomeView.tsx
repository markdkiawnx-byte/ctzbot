import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Trophy, Flame, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { CtzCoin } from '../common/CtzCoin';
import { UserBalance, TelegramUser } from '../../types';
import { api } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';

interface HomeViewProps {
  user: TelegramUser | null;
  balance: UserBalance | null;
  onBalanceUpdate: (updated: Partial<UserBalance>) => void;
  onNavigateTab: (tab: any) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  balance,
  onBalanceUpdate,
  onNavigateTab,
}) => {
  const { triggerHaptic, triggerNotificationHaptic } = useTelegram();
  const [optimisticBalance, setOptimisticBalance] = useState<number>(balance?.ctzBalance || 0);
  const [optimisticEnergy, setOptimisticEnergy] = useState<number>(balance?.energy || 1000);
  const [countdownText, setCountdownText] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [dailyClaimMsg, setDailyClaimMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const pendingTapsRef = useRef<number>(0);
  const tapTimeoutRef = useRef<any>(null);

  // Sync state when authoritative balance updates
  useEffect(() => {
    if (balance) {
      setOptimisticBalance(balance.ctzBalance);
      setOptimisticEnergy(balance.energy);
    }
  }, [balance?.ctzBalance, balance?.energy]);

  // Local real-time energy regen tick
  useEffect(() => {
    if (!balance) return;
    const interval = setInterval(() => {
      setOptimisticEnergy(prev => {
        if (prev < balance.maxEnergy) {
          return Math.min(balance.maxEnergy, prev + 1);
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [balance?.maxEnergy]);

  // Regeneration countdown calculation
  useEffect(() => {
    if (!balance) return;
    const updateCountdown = () => {
      const remaining = balance.maxEnergy - optimisticEnergy;
      if (remaining <= 0) {
        setCountdownText('Full Energy ⚡');
        return;
      }
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setCountdownText(`${mins > 0 ? `${mins}m ` : ''}${secs}s to full`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [balance?.maxEnergy, optimisticEnergy]);

  // Server tap batching sync
  const flushTapsToServer = useCallback(async () => {
    const count = pendingTapsRef.current;
    if (count <= 0) return;
    pendingTapsRef.current = 0;
    setIsSyncing(true);

    try {
      const res = await api.tap(count);
      onBalanceUpdate({
        ctzBalance: res.balance,
        energy: res.energy,
        maxEnergy: res.maxEnergy,
        tapCount: res.tapCount,
        totalEarned: res.totalEarned,
        level: res.level,
        levelName: res.levelName,
        tapMultiplier: res.tapMultiplier,
        nextLevel: res.nextLevel,
      });
      setOptimisticBalance(res.balance);
      setOptimisticEnergy(res.energy);
    } catch (err: any) {
      console.error('Failed to sync taps:', err);
      // Revert if error
      if (balance) {
        setOptimisticEnergy(balance.energy);
        setOptimisticBalance(balance.ctzBalance);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [balance, onBalanceUpdate]);

  const handleTap = () => {
    if (optimisticEnergy <= 0) {
      triggerNotificationHaptic('warning');
      return;
    }

    triggerHaptic('light');

    // Optimistic UI updates
    const tapReward = 1;
    const multiplier = balance?.tapMultiplier || 1;
    const earned = Math.round(tapReward * multiplier);

    setOptimisticBalance(prev => prev + earned);
    setOptimisticEnergy(prev => Math.max(0, prev - 1));

    pendingTapsRef.current += 1;

    // Debounced batching: flush to server every 250ms or when tapping stops
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    tapTimeoutRef.current = setTimeout(flushTapsToServer, 250);
  };

  // Quick Daily Reward Claim
  const handleQuickDailyClaim = async () => {
    try {
      const res = await api.claimDailyReward();
      triggerNotificationHaptic('success');
      setDailyClaimMsg({
        type: 'success',
        text: `Claimed Day ${res.claimedStreakDay} Reward: +${res.reward.toLocaleString()} CTZ!`,
      });
      onBalanceUpdate({
        ctzBalance: res.newBalance,
        streakDays: res.streakDays,
        lastDailyClaimedAt: res.lastClaimedAt,
      });
    } catch (err: any) {
      triggerNotificationHaptic('error');
      setDailyClaimMsg({
        type: 'info',
        text: err.message || 'Reward already claimed today.',
      });
    }
    setTimeout(() => setDailyClaimMsg(null), 4000);
  };

  // Level progress calculation
  const currentTotal = balance?.totalEarned || 0;
  const nextLvl = balance?.nextLevel;
  const progressPercent = nextLvl
    ? Math.min(100, Math.max(0, Math.round((currentTotal / nextLvl.minCtz) * 100)))
    : 100;

  return (
    <div className="flex flex-col items-center pb-24 pt-2 px-4 max-w-md mx-auto w-full">
      {/* Daily Claim Notification Banner */}
      {dailyClaimMsg && (
        <div
          className={`w-full mb-3 px-3 py-2 rounded-xl text-xs font-mono-code flex items-center justify-between border ${
            dailyClaimMsg.type === 'success'
              ? 'bg-red-950/80 border-red-500 text-red-200'
              : 'bg-zinc-900 border-zinc-700 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-red-400" />
            <span>{dailyClaimMsg.text}</span>
          </div>
          <button onClick={() => setDailyClaimMsg(null)} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Level & Rank Header Bar */}
      <div className="w-full glass-card rounded-2xl p-3.5 mb-3 border-red-950/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-950/70 border border-red-600/40 flex items-center justify-center font-display font-bold text-xs text-red-400">
              {balance?.level || 1}
            </div>
            <div>
              <div className="text-xs font-display font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>{balance?.levelName || 'Beginner'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/90 text-red-400 border border-red-800/40 font-mono-code">
                  {balance?.tapMultiplier || 1}x Multiplier
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono-code">
                {nextLvl
                  ? `${currentTotal.toLocaleString()} / ${nextLvl.minCtz.toLocaleString()} CTZ`
                  : 'MAX LEVEL ACHIEVED'}
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('leaderboard')}
            className="flex items-center gap-1 text-[11px] font-mono-code text-zinc-400 hover:text-red-400 transition"
          >
            <Trophy className="w-3 h-3 text-red-500" />
            <span>Rank #{user?.rank || 1}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Level Progress Bar */}
        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Balance Display */}
      <div className="flex flex-col items-center my-2">
        <span className="text-[11px] font-display uppercase tracking-widest text-zinc-400">
          CTZ Coin Balance
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span
            id="ctz-balance-display"
            className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight drop-shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          >
            {optimisticBalance.toLocaleString()}
          </span>
          <span className="font-display font-bold text-lg text-red-500">CTZ</span>
        </div>
        {isSyncing && (
          <span className="text-[9px] text-red-400/80 font-mono-code animate-pulse mt-0.5">
            authoritative sync...
          </span>
        )}
      </div>

      {/* Tap-To-Earn Futuristic CTZ Coin */}
      <CtzCoin
        onTap={handleTap}
        disabled={optimisticEnergy <= 0}
        tapReward={1}
        levelMultiplier={balance?.tapMultiplier || 1}
      />

      {/* Energy System HUD Bar */}
      <div className="w-full max-w-sm glass-card rounded-2xl p-3 border-red-950/40 my-2">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="flex items-center gap-1.5 font-display font-bold text-zinc-200">
            <Zap className={`w-4 h-4 ${optimisticEnergy > 0 ? 'text-red-500 fill-red-500/40 animate-pulse' : 'text-zinc-600'}`} />
            <span>Energy Core</span>
          </div>
          <div className="font-mono-code font-bold text-xs flex items-center gap-1">
            <span className={optimisticEnergy < 50 ? 'text-red-400' : 'text-white'}>
              {optimisticEnergy}
            </span>
            <span className="text-zinc-500">/ {balance?.maxEnergy || 1000}</span>
          </div>
        </div>

        {/* Energy Fill Gauge */}
        <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-red-950/50 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              optimisticEnergy <= 0
                ? 'bg-zinc-800'
                : 'bg-gradient-to-r from-red-800 via-red-600 to-red-500 shadow-[0_0_10px_#ef4444]'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, (optimisticEnergy / (balance?.maxEnergy || 1000)) * 100))}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-[10px] font-mono-code text-zinc-400">
          <span>{countdownText}</span>
          {optimisticEnergy <= 0 && (
            <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse">
              <AlertCircle className="w-3 h-3" />
              ⚡ Not enough energy
            </span>
          )}
        </div>
      </div>

      {/* Quick Action Matrix Cards */}
      <div className="grid grid-cols-3 gap-2 w-full mt-2">
        {/* Daily Streak Card */}
        <button
          onClick={handleQuickDailyClaim}
          className="glass-card glass-card-hover rounded-xl p-2.5 flex flex-col items-center justify-center text-center group border-red-950/40"
        >
          <Flame className="w-5 h-5 text-red-500 mb-1 group-hover:scale-110 transition" />
          <span className="text-[10px] text-zinc-400 font-display">Daily Streak</span>
          <span className="text-xs font-mono-code font-bold text-white mt-0.5">
            {balance?.streakDays || 0} / 7 Days
          </span>
        </button>

        {/* Total Earned Card */}
        <div className="glass-card rounded-xl p-2.5 flex flex-col items-center justify-center text-center border-red-950/40">
          <Sparkles className="w-5 h-5 text-amber-500 mb-1" />
          <span className="text-[10px] text-zinc-400 font-display">Total Earned</span>
          <span className="text-xs font-mono-code font-bold text-white mt-0.5 truncate max-w-full">
            {(balance?.totalEarned || 0).toLocaleString()}
          </span>
        </div>

        {/* Total Taps Card */}
        <div className="glass-card rounded-xl p-2.5 flex flex-col items-center justify-center text-center border-red-950/40">
          <Zap className="w-5 h-5 text-red-400 mb-1" />
          <span className="text-[10px] text-zinc-400 font-display">Total Taps</span>
          <span className="text-xs font-mono-code font-bold text-white mt-0.5">
            {(balance?.tapCount || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
