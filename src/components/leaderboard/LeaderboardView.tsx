import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Users, CheckSquare, Zap, Loader2 } from 'lucide-react';
import { LeaderboardUser, TelegramUser } from '../../types';
import { api } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';

interface LeaderboardViewProps {
  currentUser: TelegramUser | null;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ currentUser }) => {
  const { triggerHaptic } = useTelegram();
  const [activeFilter, setActiveFilter] = useState<'ctz' | 'referrals' | 'level' | 'taps'>('ctz');
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard(activeFilter);
  }, [activeFilter]);

  const loadLeaderboard = async (filter: string) => {
    setIsLoading(true);
    try {
      const res = await api.getLeaderboard(filter);
      setLeaders(res.leaders);
      setUserRank(res.userRank);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (f: 'ctz' | 'referrals' | 'level' | 'taps') => {
    triggerHaptic('light');
    setActiveFilter(f);
  };

  const top1 = leaders[0];
  const top2 = leaders[1];
  const top3 = leaders[2];
  const rest = leaders.slice(3);

  const formatMetric = (user: LeaderboardUser) => {
    if (activeFilter === 'referrals') return `${user.referralsCount} Invites`;
    if (activeFilter === 'level') return `Lvl ${user.level}`;
    if (activeFilter === 'taps') return `${user.tapCount.toLocaleString()} Taps`;
    return `${user.balance.toLocaleString()} CTZ`;
  };

  return (
    <div className="flex flex-col pb-28 pt-2 px-4 max-w-md mx-auto w-full">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="font-display font-black text-xl text-white tracking-wide flex items-center gap-2">
            <Trophy className="w-5 h-5 text-red-500" />
            GLOBAL LEADERBOARD
          </h1>
          <p className="text-xs text-zinc-400 font-mono-code">
            Top 100 cyber operatives across the CTZ network
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800 mb-4">
        {[
          { id: 'ctz', label: 'CTZ Coins', icon: Flame },
          { id: 'referrals', label: 'Friends', icon: Users },
          { id: 'level', label: 'Level', icon: Trophy },
          { id: 'taps', label: 'Taps', icon: Zap },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id as any)}
              className={`py-1.5 rounded-lg text-xs font-display font-bold flex flex-col items-center justify-center gap-0.5 transition ${
                isActive
                  ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px] whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Futuristic Podium (Top 3) */}
      {!isLoading && leaders.length >= 1 && (
        <div className="grid grid-cols-3 gap-2 items-end mb-4 pt-4">
          {/* #2 Silver (Left) */}
          {top2 ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-1">
                <div className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-zinc-400 p-0.5 flex items-center justify-center font-display font-bold text-white text-lg shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {top2.firstName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-300 text-zinc-900 font-display font-black text-xs flex items-center justify-center border border-zinc-950">
                  2
                </div>
              </div>
              <span className="font-display font-bold text-xs text-white truncate max-w-[90px] text-center">
                {top2.firstName}
              </span>
              <span className="text-[10px] font-mono-code text-zinc-300 font-semibold truncate">
                {formatMetric(top2)}
              </span>
              <div className="w-full h-14 bg-gradient-to-t from-zinc-800 to-zinc-900/60 rounded-t-xl mt-1.5 border-t border-zinc-500/50" />
            </div>
          ) : <div />}

          {/* #1 Gold Champion (Center) */}
          {top1 ? (
            <div className="flex flex-col items-center z-10">
              <div className="relative mb-1">
                <div className="w-16 h-16 rounded-full bg-red-950 border-2 border-amber-400 p-0.5 flex items-center justify-center font-display font-black text-white text-xl shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                  {top1.firstName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-zinc-950 font-display font-black text-xs flex items-center justify-center border-2 border-zinc-950 shadow">
                  1
                </div>
              </div>
              <span className="font-display font-black text-xs text-amber-300 truncate max-w-[100px] text-center">
                {top1.firstName}
              </span>
              <span className="text-[11px] font-mono-code text-red-400 font-bold truncate">
                {formatMetric(top1)}
              </span>
              <div className="w-full h-20 bg-gradient-to-t from-red-950 to-red-900/60 rounded-t-xl mt-1.5 border-t-2 border-amber-400 shadow-[0_0_15px_rgba(220,38,38,0.3)]" />
            </div>
          ) : <div />}

          {/* #3 Bronze (Right) */}
          {top3 ? (
            <div className="flex flex-col items-center">
              <div className="relative mb-1">
                <div className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-amber-700 p-0.5 flex items-center justify-center font-display font-bold text-white text-lg shadow-[0_0_10px_rgba(180,83,9,0.2)]">
                  {top3.firstName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white font-display font-black text-xs flex items-center justify-center border border-zinc-950">
                  3
                </div>
              </div>
              <span className="font-display font-bold text-xs text-white truncate max-w-[90px] text-center">
                {top3.firstName}
              </span>
              <span className="text-[10px] font-mono-code text-zinc-300 font-semibold truncate">
                {formatMetric(top3)}
              </span>
              <div className="w-full h-10 bg-gradient-to-t from-zinc-900 to-amber-950/40 rounded-t-xl mt-1.5 border-t border-amber-700/50" />
            </div>
          ) : <div />}
        </div>
      )}

      {/* Roster List */}
      <div className="space-y-1.5">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-500 font-mono-code text-xs gap-2">
            <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
            <span>Calculating standings...</span>
          </div>
        ) : rest.length === 0 && leaders.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 font-mono-code text-xs">
            No active players found.
          </div>
        ) : (
          rest.map((u, i) => (
            <div
              key={u.id}
              className="glass-card rounded-xl p-2.5 flex items-center justify-between border-red-950/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-display font-bold text-xs text-zinc-400 w-5 text-center">
                  #{i + 4}
                </span>
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-display font-bold text-xs text-zinc-200 shrink-0">
                  {u.firstName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-display font-bold text-xs text-white truncate">
                    {u.firstName}
                  </span>
                  <span className="text-[10px] font-mono-code text-zinc-400 truncate">
                    {u.username ? `@${u.username}` : `Level ${u.level}`}
                  </span>
                </div>
              </div>

              <span className="font-mono-code font-bold text-xs text-red-400 shrink-0">
                {formatMetric(u)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Sticky Current User Rank Bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-4 max-w-md mx-auto pointer-events-none">
        <div className="glass-card rounded-2xl p-3 border-red-600/50 bg-[#120709]/95 backdrop-blur-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-red-600 text-white font-display font-black text-xs flex items-center justify-center shrink-0">
              #{userRank}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-xs text-white truncate">
                YOUR STANDING ({currentUser?.firstName || 'Operative'})
              </span>
              <span className="text-[10px] font-mono-code text-zinc-400">
                Global Network Rank
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-display font-bold text-xs text-red-400">
              Rank #{userRank}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
