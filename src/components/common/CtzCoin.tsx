import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  amount: number;
}

interface CtzCoinProps {
  onTap: () => void;
  disabled?: boolean;
  tapReward?: number;
  levelMultiplier?: number;
}

export const CtzCoin: React.FC<CtzCoinProps> = ({
  onTap,
  disabled = false,
  tapReward = 1,
  levelMultiplier = 1,
}) => {
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    setIsPressed(true);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const reward = Math.round(tapReward * levelMultiplier);
    const id = Date.now() + Math.random();

    setFloatingNumbers(prev => [...prev.slice(-15), { id, x, y, amount: reward }]);
    onTap();
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  const handleAnimationComplete = (id: number) => {
    setFloatingNumbers(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="relative flex items-center justify-center my-4 select-none touch-none">
      {/* Ambient Pulsing Glow behind Coin */}
      <div
        className={`absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full transition-all duration-300 pointer-events-none ${
          disabled
            ? 'bg-zinc-900/30 blur-2xl'
            : isPressed
            ? 'bg-red-600/40 blur-3xl scale-110'
            : 'bg-red-600/20 blur-2xl animate-pulse-subtle'
        }`}
      />

      {/* Cybernetic HUD Outer Rings */}
      <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border border-red-500/15 pointer-events-none animate-[spin_40s_linear_infinite]" />
      <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-dashed border-red-500/25 pointer-events-none animate-[spin_25s_linear_infinite_reverse]" />

      {/* Futuristic CTZ Coin Container */}
      <motion.div
        id="ctz-coin-core"
        animate={{ scale: isPressed ? 0.94 : 1 }}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-full cursor-pointer flex items-center justify-center p-2 shadow-2xl transition-all ${
          disabled
            ? 'opacity-60 cursor-not-allowed grayscale'
            : 'hover:border-red-500/60 active:border-red-400'
        }`}
        style={{
          background: 'radial-gradient(circle at 35% 30%, #20080a 0%, #0d0608 55%, #050304 100%)',
          border: '3px solid rgba(220, 38, 38, 0.45)',
          boxShadow: isPressed
            ? '0 0 35px rgba(239, 68, 68, 0.5), inset 0 0 30px rgba(220, 38, 38, 0.3)'
            : '0 0 25px rgba(220, 38, 38, 0.25), inset 0 0 20px rgba(220, 38, 38, 0.15)',
        }}
      >
        {/* Inner Circuit Track */}
        <div className="absolute inset-3 rounded-full border border-red-500/30 flex items-center justify-center pointer-events-none">
          {/* Hexagonal / Cyber Matrix Marks */}
          <div className="absolute -top-1 w-2 h-2 bg-red-500 rounded-xs shadow-[0_0_8px_#ef4444]" />
          <div className="absolute -bottom-1 w-2 h-2 bg-red-500 rounded-xs shadow-[0_0_8px_#ef4444]" />
          <div className="absolute -left-1 w-2 h-2 bg-red-500 rounded-xs shadow-[0_0_8px_#ef4444]" />
          <div className="absolute -right-1 w-2 h-2 bg-red-500 rounded-xs shadow-[0_0_8px_#ef4444]" />
        </div>

        {/* Central Core Branding: CTZ Symbol */}
        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            {/* Geometric CTZ Futuristic Emblem */}
            <svg
              className="w-28 h-28 sm:w-32 sm:h-32 drop-shadow-[0_0_15px_rgba(239,68,68,0.7)]"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="ctzRedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff4d4d" />
                  <stop offset="50%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <linearGradient id="cyberEdge" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Hexagon Outer Shield */}
              <polygon
                points="60,8 105,33 105,87 60,112 15,87 15,33"
                fill="none"
                stroke="url(#cyberEdge)"
                strokeWidth="2.5"
              />

              {/* Cyber Circuit Connectors */}
              <path d="M60 8 L60 30 M105 33 L85 45 M105 87 L85 75 M60 112 L60 90 M15 87 L35 75 M15 33 L35 45" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.5" />

              {/* CTZ Interlocking Monogram */}
              {/* Letter C */}
              <path
                d="M48 42 H34 C29 42 26 45 26 50 V70 C26 75 29 78 34 78 H48"
                stroke="url(#ctzRedGradient)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Letter T */}
              <path
                d="M52 42 H68 M60 42 V78"
                stroke="url(#ctzRedGradient)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Letter Z */}
              <path
                d="M72 42 H88 L72 78 H88"
                stroke="url(#ctzRedGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Core reactor node */}
              <circle cx="60" cy="60" r="4" fill="#ffffff" filter="drop-shadow(0 0 6px #ef4444)" />
            </svg>
          </div>

          <span className="font-display font-bold text-sm tracking-widest text-red-400 mt-1 uppercase neon-text-red">
            CTZ CORE
          </span>
          <span className="text-[10px] text-zinc-400 font-mono-code font-semibold tracking-wider">
            +{Math.round(tapReward * levelMultiplier)} CTZ / TAP
          </span>
        </div>

        {/* Dynamic Floating Numbers on Tap */}
        <AnimatePresence>
          {floatingNumbers.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 1, y: 0, scale: 0.9 }}
              animate={{ opacity: 0, y: -90, scale: 1.25 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              onAnimationComplete={() => handleAnimationComplete(item.id)}
              className="absolute pointer-events-none font-display font-black text-xl sm:text-2xl text-white drop-shadow-[0_0_8px_#ef4444] z-30"
              style={{ left: item.x, top: item.y }}
            >
              +{item.amount}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
