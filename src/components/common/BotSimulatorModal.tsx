import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, X, Bot, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { BotResponse, TelegramUser } from '../../types';
import { api } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';

interface BotSimulatorModalProps {
  user: TelegramUser | null;
  onClose: () => void;
  onLaunchApp: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  buttons?: any[][];
  time: string;
}

export const BotSimulatorModal: React.FC<BotSimulatorModalProps> = ({
  user,
  onClose,
  onLaunchApp,
}) => {
  const { openLink, triggerHaptic } = useTelegram();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputCommand, setInputCommand] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize with /start output
  useEffect(() => {
    runCommand('/start');
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const runCommand = async (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    triggerHaptic('light');

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputCommand('');
    setIsTyping(true);

    try {
      const res: BotResponse = await api.simulateBotCommand(trimmed, {
        id: user?.telegramId || '123456789',
        first_name: user?.firstName || 'Miner',
        username: user?.username || 'miner_ctz',
      });

      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: res.text,
        buttons: res.reply_markup?.inline_keyboard,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'bot',
          text: `⚠️ Error executing command: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleButtonClick = (btn: any) => {
    triggerHaptic('medium');
    if (btn.web_app) {
      onLaunchApp();
      onClose();
    } else if (btn.url) {
      openLink(btn.url);
    } else if (btn.callback_data) {
      runCommand(btn.callback_data);
    }
  };

  const quickCommands = [
    '/start',
    '/app',
    '/balance',
    '/referral',
    '/tasks',
    '/leaderboard',
    '/wallet',
    '/help',
    '/support',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md h-[88vh] glass-card rounded-2xl border-2 border-red-600/40 flex flex-col shadow-[0_0_35px_rgba(220,38,38,0.35)] overflow-hidden">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-zinc-950/90 border-b border-red-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-950 border border-red-600/50 flex items-center justify-center">
              <Bot className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <span className="font-display font-black text-xs text-white tracking-wider flex items-center gap-1.5">
                CTZ BOT 🤖
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono">ONLINE</span>
              </span>
              <span className="text-[10px] font-mono-code text-zinc-400">@ctz9Bot simulator</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMessages([])}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Clear terminal"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Command Chips */}
        <div className="px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/80 flex gap-1.5 overflow-x-auto">
          {quickCommands.map(cmd => (
            <button
              key={cmd}
              onClick={() => runCommand(cmd)}
              className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-red-950/50 border border-zinc-800 hover:border-red-700/50 text-[11px] font-mono-code text-red-300 transition whitespace-nowrap"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Chat Logs */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#08080a]/90 font-mono-code text-xs">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-red-900/40 border border-red-600/50 text-white'
                    : 'bg-zinc-900/90 border border-zinc-800 text-zinc-200'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.text}
                </div>

                {/* Inline Buttons */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {msg.buttons.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-1 gap-1.5">
                        {row.map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            onClick={() => handleButtonClick(btn)}
                            className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-red-950/70 border border-red-900/40 hover:border-red-500/60 text-xs font-display font-bold text-white flex items-center justify-center gap-1.5 transition shadow-[0_0_8px_rgba(220,38,38,0.2)]"
                          >
                            <span>{btn.text}</span>
                            {btn.url && <ExternalLink className="w-3 h-3 text-red-400" />}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[9px] text-zinc-600 mt-1 px-1">
                {msg.time}
              </span>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-1.5 text-zinc-500 text-xs italic">
              <Sparkles className="w-3.5 h-3.5 text-red-500 animate-spin" />
              <span>CTZ BOT is typing...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            runCommand(inputCommand);
          }}
          className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputCommand}
            onChange={e => setInputCommand(e.target.value)}
            placeholder="Type a command (e.g. /start, /balance)..."
            className="flex-1 bg-black border border-zinc-800 focus:border-red-500 rounded-xl px-3 py-2 text-xs font-mono-code text-white outline-none"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition shadow-[0_0_10px_#ef4444]"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
