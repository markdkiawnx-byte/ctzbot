import React, { useState, useEffect } from 'react';
import { Flame, CheckCircle2, Clock, ExternalLink, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { TaskItem, UserBalance } from '../../types';
import { api } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';

interface EarnViewProps {
  balance: UserBalance | null;
  onBalanceUpdate: (updated: Partial<UserBalance>) => void;
}

const STREAK_VALUES = [100, 200, 300, 500, 750, 1000, 2500];

export const EarnView: React.FC<EarnViewProps> = ({ balance, onBalanceUpdate }) => {
  const { triggerHaptic, triggerNotificationHaptic, openLink } = useTelegram();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'all' | 'community'>('all');
  const [taskStates, setTaskStates] = useState<Record<string, 'INITIAL' | 'VISITED' | 'VERIFYING' | 'COMPLETED'>>({});
  const [claimStatus, setClaimStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isClaimingStreak, setIsClaimingStreak] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTasks();
      setTasks(data);
      const states: Record<string, any> = {};
      data.forEach(t => {
        if (t.isCompleted) {
          states[t.id] = 'COMPLETED';
        }
      });
      setTaskStates(states);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimStreak = async () => {
    setIsClaimingStreak(true);
    try {
      const res = await api.claimDailyReward();
      triggerNotificationHaptic('success');
      setClaimStatus({
        message: `🔥 Day ${res.claimedStreakDay} claimed! +${res.reward.toLocaleString()} CTZ added.`,
        type: 'success',
      });
      onBalanceUpdate({
        ctzBalance: res.newBalance,
        streakDays: res.streakDays,
        lastDailyClaimedAt: res.lastClaimedAt,
      });
    } catch (err: any) {
      triggerNotificationHaptic('error');
      setClaimStatus({
        message: err.message || 'Daily reward already claimed today.',
        type: 'error',
      });
    } finally {
      setIsClaimingStreak(false);
      setTimeout(() => setClaimStatus(null), 5000);
    }
  };

  const handleTaskAction = (task: TaskItem) => {
    triggerHaptic('medium');
    openLink(task.url);

    // Transition task state to VISITED so VERIFY button appears
    setTaskStates(prev => ({
      ...prev,
      [task.id]: 'VISITED',
    }));
  };

  const handleVerifyTask = async (task: TaskItem) => {
    triggerHaptic('light');
    setTaskStates(prev => ({ ...prev, [task.id]: 'VERIFYING' }));

    // Simulating security verification delay
    setTimeout(async () => {
      try {
        const res = await api.verifyTask(task.id);
        triggerNotificationHaptic('success');
        setTaskStates(prev => ({ ...prev, [task.id]: 'COMPLETED' }));
        onBalanceUpdate({
          ctzBalance: res.newBalance,
          level: res.level,
        });
        setClaimStatus({
          message: `Mission Verified! +${res.reward.toLocaleString()} CTZ credited!`,
          type: 'success',
        });
        setTimeout(() => setClaimStatus(null), 4000);
      } catch (err: any) {
        triggerNotificationHaptic('error');
        setTaskStates(prev => ({ ...prev, [task.id]: 'VISITED' }));
        setClaimStatus({
          message: err.message || 'Verification failed. Please ensure you completed the task.',
          type: 'error',
        });
        setTimeout(() => setClaimStatus(null), 4000);
      }
    }, 1800);
  };

  const currentStreakDay = balance?.streakDays || 0;

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'community') return t.taskType === 'TELEGRAM_CHANNEL' || t.taskType === 'TELEGRAM_GROUP';
    if (activeTab === 'daily') return t.taskType === 'CUSTOM';
    return true;
  });

  return (
    <div className="flex flex-col pb-24 pt-2 px-4 max-w-md mx-auto w-full">
      {/* Page Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-black text-xl text-white tracking-wide">
            EARN MISSIONS
          </h1>
          <p className="text-xs text-zinc-400 font-mono-code">
            Complete cyber objectives to boost your CTZ reserves
          </p>
        </div>
      </div>

      {/* Status Notice */}
      {claimStatus && (
        <div
          className={`mb-3 p-3 rounded-xl border text-xs font-mono-code flex items-center justify-between ${
            claimStatus.type === 'success'
              ? 'bg-red-950/80 border-red-500 text-red-200'
              : 'bg-zinc-900 border-zinc-700 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {claimStatus.type === 'success' ? <Sparkles className="w-4 h-4 text-red-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
            <span>{claimStatus.message}</span>
          </div>
          <button onClick={() => setClaimStatus(null)} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* 7-DAY STREAK SECTION */}
      <div className="glass-card rounded-2xl p-3.5 mb-5 border-red-900/30 shadow-[0_0_15px_rgba(220,38,38,0.1)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-950 border border-red-700/40">
              <Flame className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-white">Daily Streak Matrix</h2>
              <p className="text-[10px] text-zinc-400 font-mono-code">Claim once every 24h to unlock +2,500 CTZ</p>
            </div>
          </div>
          <button
            id="claim-streak-btn"
            disabled={isClaimingStreak}
            onClick={handleClaimStreak}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:opacity-50 text-white font-display font-bold text-xs shadow-[0_0_12px_rgba(220,38,38,0.4)] transition"
          >
            {isClaimingStreak ? 'Claiming...' : 'Claim Today'}
          </button>
        </div>

        {/* 7 Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {STREAK_VALUES.map((val, idx) => {
            const dayNum = idx + 1;
            const isCompleted = dayNum <= currentStreakDay;
            const isCurrent = dayNum === currentStreakDay + 1;

            return (
              <div
                key={dayNum}
                className={`flex flex-col items-center justify-between p-1.5 rounded-xl border text-center transition-all ${
                  isCompleted
                    ? 'bg-red-950/60 border-red-600/60 text-red-300'
                    : isCurrent
                    ? 'bg-zinc-900/90 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] text-white'
                    : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-500'
                }`}
              >
                <span className="text-[9px] font-mono-code font-bold">D{dayNum}</span>
                <span className="text-[10px] font-display font-bold my-1 text-white">
                  +{val}
                </span>
                {isCompleted ? (
                  <CheckCircle2 className="w-3 h-3 text-red-400" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks Category Filter */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'community', label: 'Telegram & Social' },
          { id: 'daily', label: 'Special' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id as any)}
            className={`px-3 py-1 rounded-full text-xs font-display font-semibold transition whitespace-nowrap ${
              activeTab === cat.id
                ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Task Items List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-500 font-mono-code text-xs gap-2">
            <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
            <span>Decrypting tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 font-mono-code text-xs">
            No missions found in this category.
          </div>
        ) : (
          filteredTasks.map(task => {
            const state = taskStates[task.id] || (task.isCompleted ? 'COMPLETED' : 'INITIAL');

            return (
              <div
                key={task.id}
                className="glass-card glass-card-hover rounded-2xl p-3.5 flex items-center justify-between gap-3 border-red-950/40"
              >
                {/* Task Icon & Text */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-950 to-zinc-950 border border-red-900/40 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-display font-bold text-xs sm:text-sm text-white truncate">
                      {task.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 line-clamp-1">
                      {task.description}
                    </span>
                    <span className="text-[11px] font-mono-code font-bold text-red-400 mt-0.5">
                      +{task.reward.toLocaleString()} CTZ
                    </span>
                  </div>
                </div>

                {/* Interactive Multi-Step Action Button */}
                <div className="shrink-0">
                  {state === 'COMPLETED' ? (
                    <div className="flex items-center gap-1 text-xs font-mono-code text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Done</span>
                    </div>
                  ) : state === 'VERIFYING' ? (
                    <button
                      disabled
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-700/50 text-xs font-display font-bold text-red-300"
                    >
                      <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                      <span>Checking...</span>
                    </button>
                  ) : state === 'VISITED' ? (
                    <button
                      id={`verify-task-${task.id}`}
                      onClick={() => handleVerifyTask(task)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-xs font-display font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] transition animate-pulse"
                    >
                      VERIFY
                    </button>
                  ) : (
                    <button
                      id={`start-task-${task.id}`}
                      onClick={() => handleTaskAction(task)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-display font-bold text-zinc-200 hover:text-white transition"
                    >
                      <span>GO</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
