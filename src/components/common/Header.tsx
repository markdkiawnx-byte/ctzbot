import React from 'react';
import { ShieldAlert, Terminal, Zap, Wallet } from 'lucide-react';
import { UserBalance, TelegramUser } from '../../types';

interface HeaderProps {
  balance: UserBalance | null;
  user: TelegramUser | null;
  onOpenBotSimulator: () => void;
  onOpenAdmin: () => void;
  onOpenWallet: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  balance,
  user,
  onOpenBotSimulator,
  onOpenAdmin,
  onOpenWallet,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#09090d]/90 backdrop-blur-md border-b border-red-950/40 px-3 py-2.5 pt-safe">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand / Profile Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center p-1 border border-red-500/40 shadow-[0_0_10px_rgba(220,38,38,0.4)]">
            <span className="font-display font-black text-xs text-white tracking-tighter">CTZ</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display font-bold text-xs tracking-wider text-white flex items-center gap-1 truncate">
              {user?.firstName || 'CTZ MINER'}
              {user?.role === 'admin' && (
                <span className="text-[9px] px-1 bg-red-950 text-red-400 border border-red-700/50 rounded font-mono">ADMIN</span>
              )}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono-code truncate">
              {balance ? `LVL ${balance.level} • ${balance.levelName}` : 'SYNCING...'}
            </span>
          </div>
        </div>

        {/* Right: Quick Action Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Energy Pill */}
          {balance && (
            <div className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 border border-red-900/30 text-[11px] font-mono-code text-zinc-300">
              <Zap className="w-3 h-3 text-red-500 fill-red-500/50" />
              <span>{balance.energy}</span>
            </div>
          )}

          {/* Wallet Balance Quick Pill */}
          <button
            id="header-wallet-btn"
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/40 hover:bg-red-900/40 border border-red-600/30 text-xs font-display font-bold text-white transition shadow-[0_0_8px_rgba(220,38,38,0.2)]"
            title="Open Wallet"
          >
            <Wallet className="w-3.5 h-3.5 text-red-400" />
            <span className="font-mono-code">
              {balance ? balance.ctzBalance.toLocaleString() : '0'}
            </span>
          </button>

          {/* Bot Simulator Button */}
          <button
            id="header-bot-terminal-btn"
            onClick={onOpenBotSimulator}
            className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 hover:text-white transition"
            title="Telegram Bot Terminal"
          >
            <Terminal className="w-4 h-4 text-red-400" />
          </button>

          {/* Admin Button */}
          <button
            id="header-admin-btn"
            onClick={onOpenAdmin}
            className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-red-950/60 border border-zinc-700/50 hover:border-red-600/50 text-zinc-400 hover:text-red-400 transition"
            title="Admin Portal"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
