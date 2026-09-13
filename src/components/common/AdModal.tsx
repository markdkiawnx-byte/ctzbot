import React, { useState, useEffect } from 'react';
import { ExternalLink, X, Sparkles } from 'lucide-react';
import { AdData } from '../../types';
import { api } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';

interface AdModalProps {
  ad: AdData | null;
  onClose: () => void;
}

export const AdModal: React.FC<AdModalProps> = ({ ad, onClose }) => {
  const { openLink, triggerHaptic } = useTelegram();
  const [secondsLeft, setSecondsLeft] = useState(ad?.durationSeconds || 10);

  useEffect(() => {
    if (!ad) return;
    api.recordAdEvent(ad.id, 'IMPRESSION');

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          api.recordAdEvent(ad.id, 'COMPLETION');
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ad, onClose]);

  if (!ad) return null;

  const handleCta = () => {
    triggerHaptic('medium');
    api.recordAdEvent(ad.id, 'CLICK');
    const target = ad.targetUrl || 'https://grannyreproof.com/w0k5m22w3?key=03f13319fd9f4e5a58c14b36df19db9b';
    openLink(target);
  };

  const handleSkip = () => {
    triggerHaptic('light');
    api.recordAdEvent(ad.id, 'CLOSE');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm glass-card rounded-2xl p-5 border-2 border-red-600/40 relative shadow-[0_0_30px_rgba(220,38,38,0.3)] flex flex-col">
        {/* Top Header Label */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-700/40 text-[10px] font-mono-code font-bold text-red-400 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-red-400" />
            <span>Sponsored / Promotion</span>
          </div>

          {/* Countdown & Skip */}
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-xs font-mono-code text-zinc-300 transition"
          >
            <span>Skip ({secondsLeft}s)</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Ad Media */}
        {ad.imageUrl && (
          <div className="w-full h-36 rounded-xl overflow-hidden mb-3 border border-red-950/50 relative">
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>
        )}

        {/* Ad Copy */}
        <h3 className="font-display font-bold text-base text-white mb-1">
          {ad.title}
        </h3>
        <p className="text-xs text-zinc-300 font-mono-code leading-relaxed mb-4">
          {ad.description}
        </p>

        {/* CTA Button */}
        <button
          onClick={handleCta}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-xs font-display font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center justify-center gap-1.5 transition"
        >
          <span>{ad.ctaText || 'Learn More'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
