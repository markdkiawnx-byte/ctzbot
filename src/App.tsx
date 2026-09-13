import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/common/Header';
import { Navbar, TabType } from './components/common/Navbar';
import { HomeView } from './components/home/HomeView';
import { EarnView } from './components/earn/EarnView';
import { FriendsView } from './components/friends/FriendsView';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { WalletView } from './components/wallet/WalletView';
import { ProfileView } from './components/profile/ProfileView';
import { BotSimulatorModal } from './components/common/BotSimulatorModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { AdModal } from './components/common/AdModal';
import { useTelegram } from './hooks/useTelegram';
import { api } from './services/api';
import { TelegramUser, UserBalance, AdData } from './types';
import { Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const { isReady, initData, telegramUser, triggerHaptic } = useTelegram();
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Ad State
  const [activeAd, setActiveAd] = useState<AdData | null>(null);
  const [adConfig, setAdConfig] = useState<{ intervalSeconds: number; durationSeconds: number }>({
    intervalSeconds: 30,
    durationSeconds: 10,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Initialize and authenticate session
  useEffect(() => {
    if (!isReady) return;

    const authenticateSession = async () => {
      try {
        setIsLoading(true);
        // If in Telegram, pass initData; else fallback mock user for web preview
        const mockFallback = !initData
          ? {
              id: 'local_operative_99',
              first_name: 'Alex',
              username: 'alex_cyber',
              photo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
            }
          : undefined;

        const res = await api.authenticate(initData, mockFallback);
        setUser(res.user);
        setBalance(res.balance);

        // Fetch promotional ad config
        try {
          const adRes = await api.getAd();
          if (adRes) {
            setAdConfig({
              intervalSeconds: adRes.intervalSeconds || 30,
              durationSeconds: adRes.durationSeconds || 10,
            });
          }
        } catch {}
      } catch (err: any) {
        console.error('Authentication error:', err);
        setAuthError(err.message || 'Failed to authenticate');
      } finally {
        setIsLoading(false);
      }
    };

    authenticateSession();
  }, [isReady, initData]);

  // Periodic Promotional Ad Trigger (Every 30s as requested)
  useEffect(() => {
    if (isLoading || authError) return;

    const interval = setInterval(async () => {
      // Avoid interrupting wallet or admin tasks
      if (isAdminOpen || isBotModalOpen) return;

      try {
        const res = await api.getAd();
        if (res.ad) {
          setActiveAd(res.ad);
        }
      } catch {}
    }, adConfig.intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [isLoading, authError, isAdminOpen, isBotModalOpen, adConfig.intervalSeconds]);

  const handleBalanceUpdate = useCallback((updated: Partial<UserBalance>) => {
    setBalance(prev => (prev ? { ...prev, ...updated } : null));
  }, []);

  const handleSelectTab = (tab: TabType) => {
    triggerHaptic('light');
    setIsWalletOpen(false);
    setCurrentTab(tab);
  };

  const handleOpenWallet = () => {
    triggerHaptic('light');
    setIsWalletOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-4 text-white">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-950 border-2 border-red-500/50 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.5)]">
            <span className="font-display font-black text-xl text-white tracking-widest">CTZ</span>
          </div>
          <div className="absolute inset-0 rounded-2xl border border-red-500/40 animate-ping pointer-events-none" />
        </div>
        <span className="font-display font-black text-lg tracking-widest text-white mb-1">
          CTZ BOT
        </span>
        <div className="flex items-center gap-2 text-xs font-mono-code text-red-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Synchronizing Cyber Core...</span>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="p-3 rounded-2xl bg-red-950/60 border border-red-600/50 mb-3 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-lg text-white mb-1">Connection Refused</h2>
        <p className="text-xs text-zinc-400 font-mono-code max-w-xs mb-4">{authError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-display font-bold text-white shadow-[0_0_12px_#ef4444]"
        >
          RETRY CONNECTION
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col selection:bg-red-500 selection:text-white">
      {/* Top Header */}
      <Header
        user={user}
        balance={balance}
        onOpenBotSimulator={() => setIsBotModalOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenWallet={handleOpenWallet}
      />

      {/* Main App Content Views */}
      <main className="flex-1 w-full max-w-md mx-auto relative overflow-x-hidden">
        {isWalletOpen ? (
          <WalletView balance={balance} onBalanceUpdate={handleBalanceUpdate} />
        ) : currentTab === 'home' ? (
          <HomeView
            user={user}
            balance={balance}
            onBalanceUpdate={handleBalanceUpdate}
            onNavigateTab={handleSelectTab}
          />
        ) : currentTab === 'earn' ? (
          <EarnView balance={balance} onBalanceUpdate={handleBalanceUpdate} />
        ) : currentTab === 'friends' ? (
          <FriendsView />
        ) : currentTab === 'leaderboard' ? (
          <LeaderboardView currentUser={user} />
        ) : currentTab === 'profile' ? (
          <ProfileView
            user={user}
            balance={balance}
            onOpenBotSimulator={() => setIsBotModalOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
          />
        ) : null}
      </main>

      {/* Persistent Bottom Navbar */}
      <Navbar currentTab={isWalletOpen ? ('' as any) : currentTab} onSelectTab={handleSelectTab} />

      {/* Modals & Overlays */}
      {isBotModalOpen && (
        <BotSimulatorModal
          user={user}
          onClose={() => setIsBotModalOpen(false)}
          onLaunchApp={() => {
            setIsBotModalOpen(false);
            setCurrentTab('home');
          }}
        />
      )}

      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}

      {activeAd && <AdModal ad={activeAd} onClose={() => setActiveAd(null)} />}
    </div>
  );
}
