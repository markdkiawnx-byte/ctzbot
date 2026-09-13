import React, { useState, useEffect } from 'react';
import { Users, Copy, Check, Share2, Sparkles, Gift, UserPlus, Loader2 } from 'lucide-react';
import { ReferralData } from '../../types';
import { api } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';

export const FriendsView: React.FC = () => {
  const { triggerHaptic, triggerNotificationHaptic, openLink } = useTelegram();
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    setIsLoading(true);
    try {
      const res = await api.getReferrals();
      setData(res);
    } catch (err) {
      console.error('Failed to load referrals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    triggerNotificationHaptic('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (!data?.referralLink) return;
    triggerHaptic('medium');
    const text = encodeURIComponent('🚀 Join me on CTZ BOT! Mine CTZ Coins, complete missions, and claim +500 CTZ welcome bonus now:');
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(data.referralLink)}&text=${text}`;
    openLink(shareUrl);
  };

  return (
    <div className="flex flex-col pb-24 pt-2 px-4 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-red-500" />
        <h1 className="font-display font-black text-xl text-white tracking-wide">
          INVITE FRIENDS
        </h1>
      </div>
      <p className="text-xs text-zinc-400 font-mono-code mb-4">
        Invite friends and earn CTZ Coins together.
      </p>

      {/* Cyberpunk Referral Feature Card */}
      <div className="glass-card rounded-2xl p-4 mb-4 border-red-900/40 relative overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.15)]">
        {/* Background glow lines */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-950/80 border border-red-700/50">
              <Gift className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <span className="font-display font-bold text-sm text-white">Dual Cyber Bounty</span>
              <p className="text-[10px] text-zinc-400 font-mono-code">Guaranteed rewards on every activation</p>
            </div>
          </div>
        </div>

        {/* Reward Tiers breakdown */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="bg-zinc-950/70 border border-red-950/60 rounded-xl p-2.5 flex flex-col">
            <span className="text-[10px] font-display text-zinc-400">YOU RECEIVE</span>
            <span className="font-display font-black text-base text-red-400 mt-0.5">
              +{data?.referrerBonus || 1000} CTZ
            </span>
            <span className="text-[9px] text-zinc-500 font-mono-code mt-0.5">per verified recruit</span>
          </div>

          <div className="bg-zinc-950/70 border border-red-950/60 rounded-xl p-2.5 flex flex-col">
            <span className="text-[10px] font-display text-zinc-400">FRIEND RECEIVES</span>
            <span className="font-display font-black text-base text-white mt-0.5">
              +{data?.referredBonus || 500} CTZ
            </span>
            <span className="text-[9px] text-zinc-500 font-mono-code mt-0.5">welcome starter grant</span>
          </div>
        </div>

        {/* Referral Link Box */}
        <div className="mt-3 flex items-center gap-2 bg-black/60 border border-zinc-800 rounded-xl p-2">
          <span className="text-xs font-mono-code text-zinc-300 truncate flex-1 select-all">
            {data?.referralLink || 'Loading referral link...'}
          </span>
          <button
            id="copy-referral-link-btn"
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-display font-bold text-white flex items-center gap-1 shrink-0 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-red-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-300" />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>
        </div>

        {/* Primary Share Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            id="copy-link-main-btn"
            onClick={handleCopy}
            className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-display font-bold text-white flex items-center justify-center gap-1.5 transition"
          >
            <Copy className="w-4 h-4 text-red-400" />
            <span>COPY LINK</span>
          </button>

          <button
            id="invite-friends-btn"
            onClick={handleShare}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-xs font-display font-bold text-white flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(220,38,38,0.4)] transition"
          >
            <Share2 className="w-4 h-4" />
            <span>INVITE FRIENDS</span>
          </button>
        </div>
      </div>

      {/* Referrals Stats Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="glass-card rounded-xl p-3 flex flex-col items-center justify-center text-center border-red-950/40">
          <Users className="w-4 h-4 text-zinc-400 mb-1" />
          <span className="text-[10px] text-zinc-400 font-display">Total Invited</span>
          <span className="font-mono-code font-bold text-sm text-white mt-0.5">
            {data?.totalInvited || 0}
          </span>
        </div>

        <div className="glass-card rounded-xl p-3 flex flex-col items-center justify-center text-center border-red-950/40">
          <UserPlus className="w-4 h-4 text-red-500 mb-1" />
          <span className="text-[10px] text-zinc-400 font-display">Active Recruits</span>
          <span className="font-mono-code font-bold text-sm text-red-400 mt-0.5">
            {data?.activeReferrals || 0}
          </span>
        </div>

        <div className="glass-card rounded-xl p-3 flex flex-col items-center justify-center text-center border-red-950/40">
          <Sparkles className="w-4 h-4 text-amber-400 mb-1" />
          <span className="text-[10px] text-zinc-400 font-display">Earnings</span>
          <span className="font-mono-code font-bold text-sm text-white mt-0.5 truncate max-w-full">
            {(data?.totalEarnings || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Friends Joined List */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display font-bold text-sm text-white">Recruited Operatives</h2>
        <span className="text-[11px] font-mono-code text-zinc-500">
          {data?.friends.length || 0} joined
        </span>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center text-zinc-500 font-mono-code text-xs gap-2">
            <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
            <span>Scanning recruit roster...</span>
          </div>
        ) : !data?.friends || data.friends.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center border-red-950/40 flex flex-col items-center justify-center">
            <Users className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-xs font-display font-semibold text-zinc-300">No friends joined yet</p>
            <p className="text-[11px] font-mono-code text-zinc-500 mt-1 max-w-xs">
              Share your link with your network to earn +1,000 CTZ for each recruit!
            </p>
          </div>
        ) : (
          data.friends.map((friend, idx) => (
            <div
              key={idx}
              className="glass-card rounded-xl p-2.5 flex items-center justify-between border-red-950/30"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-display font-bold text-xs text-white shrink-0">
                  {friend.firstName.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-display font-bold text-xs text-white truncate">
                    {friend.firstName}
                  </span>
                  <span className="text-[10px] font-mono-code text-zinc-400 truncate">
                    {friend.username ? `@${friend.username}` : `Level ${friend.level}`}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-mono-code font-bold text-red-400">
                  +{friend.earnedBonus.toLocaleString()} CTZ
                </span>
                <div className="text-[9px] font-mono-code text-zinc-500">
                  {new Date(friend.joinedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
