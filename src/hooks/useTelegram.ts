import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [initData, setInitData] = useState<string>('');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        setIsTelegram(Boolean(tg.initData && tg.initData.length > 0));
        setInitData(tg.initData || '');
        if (tg.initDataUnsafe?.user) {
          setTelegramUser(tg.initDataUnsafe.user);
        }
      } catch (err) {
        console.warn('Error initializing Telegram WebApp:', err);
      }
    }
    setIsReady(true);
  }, []);

  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(style);
      } else if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {}
  }, []);

  const triggerNotificationHaptic = useCallback((type: 'error' | 'success' | 'warning') => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(type);
      } else if (navigator.vibrate) {
        navigator.vibrate(type === 'success' ? [15, 30, 15] : [30, 20, 30]);
      }
    } catch {}
  }, []);

  const openLink = useCallback((url: string) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink && url.includes('t.me')) {
      tg.openTelegramLink(url);
    } else if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const closeApp = useCallback(() => {
    window.Telegram?.WebApp?.close();
  }, []);

  return {
    isReady,
    isTelegram,
    telegramUser,
    initData,
    triggerHaptic,
    triggerNotificationHaptic,
    openLink,
    closeApp,
  };
}
