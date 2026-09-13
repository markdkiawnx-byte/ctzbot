import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2
} from 'lucide-react';
import { WalletData, TransactionItem, UserBalance } from '../../types';
import { api } from '../../services/api';
import { useTelegram } from '../../hooks/useTelegram';

interface WalletViewProps {
  balance: UserBalance | null;
  onBalanceUpdate: (updated: Partial<UserBalance>) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ balance, onBalanceUpdate }) => {
  const { triggerHaptic, triggerNotificationHaptic } = useTelegram();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'withdraw' | 'history'>('withdraw');
  const [txFilter, setTxFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Binance Pay');
  const [accountAddress, setAccountAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [wData, txs] = await Promise.all([api.getWallet(), api.getTransactions()]);
      setWalletData(wData);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPercent = (pct: number) => {
    if (!balance) return;
    triggerHaptic('light');
    const val = Math.floor((balance.ctzBalance * pct) / 100);
    setAmount(String(val));
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');

    const numAmount = parseInt(amount, 10);
    if (!numAmount || isNaN(numAmount)) {
      setFeedback({ type: 'error', message: 'Please enter a valid withdrawal amount.' });
      return;
    }
    if (!accountAddress.trim()) {
      setFeedback({ type: 'error', message: 'Please specify your wallet or account address.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await api.requestWithdrawal({
        amount: numAmount,
        paymentMethod,
        accountAddress: accountAddress.trim(),
      });
      triggerNotificationHaptic('success');
      setFeedback({
        type: 'success',
        message: `Withdrawal request for ${numAmount.toLocaleString()} CTZ submitted successfully (Status: PENDING).`,
      });
      onBalanceUpdate({ ctzBalance: res.newBalance });
      setAmount('');
      setAccountAddress('');
      // Reload history
      const updatedTxs = await api.getTransactions();
      setTransactions(updatedTxs);
    } catch (err: any) {
      triggerNotificationHaptic('error');
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit withdrawal request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTxs = transactions.filter(t => {
    if (txFilter === 'ALL') return true;
    return t.type.includes(txFilter);
  });

  return (
    <div className="flex flex-col pb-24 pt-2 px-4 max-w-md mx-auto w-full">
      {/* Title */}
      <div className="flex items-center gap-2 mb-1">
        <Wallet className="w-5 h-5 text-red-500" />
        <h1 className="font-display font-black text-xl text-white tracking-wide">
          CTZ REWARD WALLET
        </h1>
      </div>
      <p className="text-xs text-zinc-400 font-mono-code mb-3">
        Manage in-app CTZ balances, request redemptions, and view ledgers
      </p>

      {/* Main Balance Card */}
      <div className="glass-card rounded-2xl p-4 mb-4 border-red-900/40 relative overflow-hidden shadow-[0_0_20px_rgba(220,38,38,0.15)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-display uppercase tracking-wider text-zinc-400">
            Available CTZ Balance
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/40 font-mono-code font-bold">
            V1 Points
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-display font-black text-3xl sm:text-4xl text-white">
            {balance ? balance.ctzBalance.toLocaleString() : '0'}
          </span>
          <span className="font-display font-bold text-base text-red-500">CTZ</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs font-mono-code">
          <div>
            <span className="text-zinc-500 block text-[10px]">Lifetime Earned</span>
            <span className="text-zinc-300 font-semibold">
              {(balance?.totalEarned || 0).toLocaleString()} CTZ
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">Min. Threshold</span>
            <span className="text-zinc-300 font-semibold">
              {walletData ? `${walletData.minWithdrawal.toLocaleString()} CTZ` : '5,000 CTZ'}
            </span>
          </div>
        </div>
      </div>

      {/* Regulatory/In-App Notice Disclaimer */}
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 mb-4 text-[11px] font-mono-code text-zinc-400">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <span>
          <strong>Notice:</strong> CTZ Coins are in-app promotional rewards for gameplay, tasks, and referrals. Redemption requests are subject to operator manual review.
        </span>
      </div>

      {/* Section Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('withdraw');
          }}
          className={`py-2 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            activeTab === 'withdraw'
              ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Request Withdrawal</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('history');
          }}
          className={`py-2 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            activeTab === 'history'
              ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]'
              : 'bg-zinc-900/80 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Ledger & History</span>
        </button>
      </div>

      {/* Tab 1: Withdrawal Form */}
      {activeTab === 'withdraw' && (
        <form onSubmit={handleSubmitWithdrawal} className="glass-card rounded-2xl p-4 border-red-950/40 space-y-3.5">
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono-code flex items-center justify-between ${
                feedback.type === 'success'
                  ? 'bg-red-950/80 border-red-500 text-red-200'
                  : 'bg-zinc-900 border-red-800 text-red-300'
              }`}
            >
              <span>{feedback.message}</span>
              <button type="button" onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-display font-bold text-white">Amount (CTZ)</label>
              <div className="flex gap-1">
                {[25, 50, 100].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPercent(pct)}
                    className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-mono-code text-zinc-300"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-black/70 border border-zinc-800 focus:border-red-500 rounded-xl px-3 py-2 text-sm font-mono-code text-white outline-none transition"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-display font-bold text-white block mb-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {['Binance Pay', 'USDT (TRC20)', 'USDT (BEP20)', 'TON Wallet'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setPaymentMethod(method);
                  }}
                  className={`p-2 rounded-xl text-xs font-display font-bold text-center border transition ${
                    paymentMethod === method
                      ? 'bg-red-950/70 border-red-500 text-white'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Address / Account ID */}
          <div>
            <label className="text-xs font-display font-bold text-white block mb-1">
              {paymentMethod === 'Binance Pay' ? 'Binance User ID / Pay ID' : `${paymentMethod} Address`}
            </label>
            <input
              type="text"
              value={accountAddress}
              onChange={e => setAccountAddress(e.target.value)}
              placeholder={paymentMethod === 'Binance Pay' ? 'e.g. 192847192' : 'e.g. 0x... or T...'}
              className="w-full bg-black/70 border border-zinc-800 focus:border-red-500 rounded-xl px-3 py-2 text-sm font-mono-code text-white outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 disabled:opacity-50 text-white font-display font-bold text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            <span>SUBMIT WITHDRAWAL REQUEST</span>
          </button>
        </form>
      )}

      {/* Tab 2: Transaction History */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {/* Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['ALL', 'TAP', 'TASK', 'REFERRAL', 'WITHDRAWAL'].map(f => (
              <button
                key={f}
                onClick={() => setTxFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-bold transition whitespace-nowrap ${
                  txFilter === f
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredTxs.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-zinc-500 font-mono-code text-xs">
                No transaction records found.
              </div>
            ) : (
              filteredTxs.map(tx => {
                const isPositive = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className="glass-card rounded-xl p-3 flex items-center justify-between border-red-950/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isPositive
                            ? 'bg-emerald-950/60 border border-emerald-800/40 text-emerald-400'
                            : 'bg-red-950/60 border border-red-800/40 text-red-400'
                        }`}
                      >
                        {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-display font-bold text-xs text-white truncate">
                          {tx.description}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono-code text-zinc-400">
                          <span>{new Date(tx.createdAt).toLocaleString()}</span>
                          <span>•</span>
                          <span
                            className={
                              tx.status === 'COMPLETED'
                                ? 'text-zinc-400'
                                : tx.status === 'PENDING'
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`font-mono-code font-bold text-xs shrink-0 ${
                        isPositive ? 'text-red-400' : 'text-zinc-300'
                      }`}
                    >
                      {isPositive ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} CTZ
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
