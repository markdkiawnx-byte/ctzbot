import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { getDb } from './db.js';
import { validateTelegramInitData, TelegramUserData } from './telegramAuth.js';
import {
  calculateRegeneratedEnergy,
  getLevelForCtz,
  getNextLevel,
  getSetting,
  DAILY_REWARDS,
  LEVELS
} from './gameService.js';
import { handleBotCommand } from './botEngine.js';

export const apiRouter = Router();

// Middleware to resolve authenticated user from Authorization header or cookie/session
function getAuthUser(req: Request): { user: any; balance: any } | null {
  const db = getDb();
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  // token is user_id or encoded telegram_id
  const user = db.prepare('SELECT * FROM users WHERE id = ? OR telegram_id = ?').get(token, token) as any;
  if (!user) return null;

  const balance = db.prepare('SELECT * FROM balances WHERE user_id = ?').get(user.id) as any;
  return { user, balance };
}

function adminAuthMiddleware(req: Request, res: Response, next: () => void) {
  const adminSecret = process.env.ADMIN_SECRET || 'ctz58235';
  const provided = req.headers['x-admin-token'] || req.query.admin_token;
  if (provided !== adminSecret) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED_ADMIN', message: 'Invalid or missing admin credentials' },
    });
  }
  next();
}

// ----------------------------------------------------
// PUBLIC & SETTINGS ENDPOINTS
// ----------------------------------------------------

apiRouter.get('/settings', (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  res.json({ success: true, data: map });
});

apiRouter.get('/announcements', (req: Request, res: Response) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC').all();
  const maintenance = getSetting(db, 'maintenance_mode', 'false') === 'true';
  res.json({
    success: true,
    data: {
      announcements: items,
      maintenanceMode: maintenance,
    },
  });
});

// ----------------------------------------------------
// AUTHENTICATION (TELEGRAM INITDATA VALIDATION)
// ----------------------------------------------------

apiRouter.post('/auth/telegram', (req: Request, res: Response) => {
  const { initData, mockUser } = req.body;
  const botToken = process.env.BOT_TOKEN || '8247058716:AAH-vEgqdc_wBxKq3CwT0gFHnwnOQYoMrSY';
  const db = getDb();

  let telegramUser: TelegramUserData | undefined;
  let startParam: string | undefined;

  if (initData) {
    const val = validateTelegramInitData(initData, botToken);
    if (!val.isValid || !val.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TELEGRAM_DATA', message: val.error || 'Authentication signature check failed' },
      });
    }
    telegramUser = val.user;
    startParam = val.startParam;
  } else if (mockUser && mockUser.id) {
    // For local dev preview when opened outside Telegram
    telegramUser = {
      id: Number(mockUser.id) || 123456789,
      first_name: mockUser.first_name || 'Cyber Miner',
      username: mockUser.username || 'miner_ctz',
      photo_url: mockUser.photo_url || '',
    };
    startParam = mockUser.start_param;
  } else {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_DATA', message: 'No Telegram initData or mock profile provided' },
    });
  }

  const telegramId = String(telegramUser.id);
  const now = Date.now();

  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as any;
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const userId = 'usr_' + crypto.randomBytes(6).toString('hex');
    db.prepare(`
      INSERT INTO users (id, telegram_id, username, first_name, last_name, photo_url, role, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      telegramId,
      telegramUser.username || null,
      telegramUser.first_name || 'Miner',
      telegramUser.last_name || null,
      telegramUser.photo_url || null,
      'user',
      now,
      now
    );

    // Initial balance row
    db.prepare(`
      INSERT INTO balances (user_id, ctz_balance, energy, max_energy, energy_last_updated, tap_count, total_earned, level, streak_days, last_daily_claimed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 0, 1000, 1000, now, 0, 0, 1, 0, 0, now);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    // Handle referral bonus if valid start_param
    if (startParam) {
      const referrer = db.prepare('SELECT * FROM users WHERE id = ? OR telegram_id = ?').get(startParam, startParam) as any;
      if (referrer && referrer.id !== user.id) {
        const bonusReferrer = parseInt(getSetting(db, 'referral_reward_referrer', '1000'), 10);
        const bonusReferred = parseInt(getSetting(db, 'referral_reward_referred', '500'), 10);

        try {
          db.prepare(`
            INSERT INTO referrals (id, referrer_id, referred_id, bonus_referrer, bonus_referred, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run('ref_' + crypto.randomBytes(6).toString('hex'), referrer.id, user.id, bonusReferrer, bonusReferred, now);

          // Update referrer balance & ledger
          db.prepare('UPDATE balances SET ctz_balance = ctz_balance + ?, total_earned = total_earned + ? WHERE user_id = ?')
            .run(bonusReferrer, bonusReferrer, referrer.id);

          db.prepare(`
            INSERT INTO transactions (id, user_id, type, amount, status, description, reference_id, created_at)
            VALUES (?, ?, 'REFERRAL', ?, 'COMPLETED', ?, ?, ?)
          `).run('tx_' + crypto.randomBytes(6).toString('hex'), referrer.id, bonusReferrer, `Referral reward for ${user.first_name}`, user.id, now);

          // Update new user balance & ledger
          db.prepare('UPDATE balances SET ctz_balance = ctz_balance + ?, total_earned = total_earned + ? WHERE user_id = ?')
            .run(bonusReferred, bonusReferred, user.id);

          db.prepare(`
            INSERT INTO transactions (id, user_id, type, amount, status, description, reference_id, created_at)
            VALUES (?, ?, 'REFERRAL', ?, 'COMPLETED', ?, ?, ?)
          `).run('tx_' + crypto.randomBytes(6).toString('hex'), user.id, bonusReferred, 'Welcome referral bonus', referrer.id, now);
        } catch {
          // Ignore duplicate referral
        }
      }
    }
  } else {
    // Update last active and user details
    db.prepare('UPDATE users SET last_active_at = ?, username = ?, first_name = ?, photo_url = ? WHERE id = ?')
      .run(now, telegramUser.username || user.username, telegramUser.first_name || user.first_name, telegramUser.photo_url || user.photo_url, user.id);
  }

  if (user.is_suspended) {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCOUNT_SUSPENDED', message: `Account suspended: ${user.suspension_reason || 'Security policy violation'}` },
    });
  }

  // Load balance and calculate regenerated energy
  let balance = db.prepare('SELECT * FROM balances WHERE user_id = ?').get(user.id) as any;
  const regenSec = parseInt(getSetting(db, 'energy_regen_seconds', '1'), 10);
  const currentLvl = getLevelForCtz(balance.total_earned);
  const currentMaxEnergy = 1000 + currentLvl.maxEnergyBonus;

  const energyCalc = calculateRegeneratedEnergy(balance.energy, currentMaxEnergy, balance.energy_last_updated, regenSec);

  if (energyCalc.currentEnergy !== balance.energy || currentMaxEnergy !== balance.max_energy) {
    db.prepare('UPDATE balances SET energy = ?, max_energy = ?, energy_last_updated = ? WHERE user_id = ?')
      .run(energyCalc.currentEnergy, currentMaxEnergy, energyCalc.newLastUpdated, user.id);
    balance.energy = energyCalc.currentEnergy;
    balance.max_energy = currentMaxEnergy;
  }

  res.json({
    success: true,
    data: {
      token: user.id,
      user: {
        id: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        photoUrl: user.photo_url,
        role: user.role,
        isNewUser,
      },
      balance: {
        ctzBalance: balance.ctz_balance,
        energy: balance.energy,
        maxEnergy: balance.max_energy,
        tapCount: balance.tap_count,
        totalEarned: balance.total_earned,
        level: currentLvl.level,
        levelName: currentLvl.name,
        tapMultiplier: currentLvl.tapMultiplier,
        nextLevel: getNextLevel(currentLvl.level),
        streakDays: balance.streak_days,
        lastDailyClaimedAt: balance.last_daily_claimed_at,
        secondsUntilFullEnergy: energyCalc.secondsUntilFull,
      },
    },
  });
});

// ----------------------------------------------------
// USER AUTHORITATIVE STATE
// ----------------------------------------------------

apiRouter.get('/user', (req: Request, res: Response) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const { user, balance } = auth;
  const db = getDb();

  const regenSec = parseInt(getSetting(db, 'energy_regen_seconds', '1'), 10);
  const currentLvl = getLevelForCtz(balance.total_earned);
  const currentMaxEnergy = 1000 + currentLvl.maxEnergyBonus;

  const energyCalc = calculateRegeneratedEnergy(balance.energy, currentMaxEnergy, balance.energy_last_updated, regenSec);

  if (energyCalc.currentEnergy !== balance.energy || currentMaxEnergy !== balance.max_energy) {
    db.prepare('UPDATE balances SET energy = ?, max_energy = ?, energy_last_updated = ? WHERE user_id = ?')
      .run(energyCalc.currentEnergy, currentMaxEnergy, energyCalc.newLastUpdated, user.id);
    balance.energy = energyCalc.currentEnergy;
    balance.max_energy = currentMaxEnergy;
  }

  // Calculate user rank on leaderboard
  const rankRow = db.prepare(`
    SELECT COUNT(*) + 1 as rank FROM balances
    WHERE ctz_balance > ?
  `).get(balance.ctz_balance) as { rank: number };

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        telegramId: user.telegram_id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        photoUrl: user.photo_url,
        createdAt: user.created_at,
        rank: rankRow.rank,
      },
      balance: {
        ctzBalance: balance.ctz_balance,
        energy: balance.energy,
        maxEnergy: balance.max_energy,
        tapCount: balance.tap_count,
        totalEarned: balance.total_earned,
        level: currentLvl.level,
        levelName: currentLvl.name,
        tapMultiplier: currentLvl.tapMultiplier,
        nextLevel: getNextLevel(currentLvl.level),
        streakDays: balance.streak_days,
        lastDailyClaimedAt: balance.last_daily_claimed_at,
        secondsUntilFullEnergy: energyCalc.secondsUntilFull,
      },
    },
  });
});

// ----------------------------------------------------
// TAP-TO-EARN (SERVER-SIDE VALIDATION & ATOMIC UPDATE)
// ----------------------------------------------------

apiRouter.post('/tap', (req: Request, res: Response) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const { user } = auth;
  const db = getDb();

  if (user.is_suspended) {
    return res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended' } });
  }

  const requestedTaps = Math.min(50, Math.max(1, parseInt(req.body.count || '1', 10)));
  const now = Date.now();

  // Load fresh balance row
  const balanceRow = db.prepare('SELECT * FROM balances WHERE user_id = ?').get(user.id) as any;
  const currentLvl = getLevelForCtz(balanceRow.total_earned);
  const maxEnergy = 1000 + currentLvl.maxEnergyBonus;
  const regenSec = parseInt(getSetting(db, 'energy_regen_seconds', '1'), 10);

  // Recalculate regenerated energy
  const energyCalc = calculateRegeneratedEnergy(balanceRow.energy, maxEnergy, balanceRow.energy_last_updated, regenSec);

  if (energyCalc.currentEnergy < 1) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_ENERGY',
        message: '⚡ Not enough energy. Please wait for cyber core regeneration.',
        secondsUntilFull: energyCalc.secondsUntilFull,
      },
    });
  }

  // Allowed taps cannot exceed current energy
  const actualTaps = Math.min(requestedTaps, energyCalc.currentEnergy);
  const baseTapReward = parseInt(getSetting(db, 'tap_reward', '1'), 10);
  const earnedCtz = Math.round(actualTaps * baseTapReward * currentLvl.tapMultiplier);
  const newEnergy = energyCalc.currentEnergy - actualTaps;
  const newBalance = balanceRow.ctz_balance + earnedCtz;
  const newTotalEarned = balanceRow.total_earned + earnedCtz;
  const newTapCount = balanceRow.tap_count + actualTaps;
  const newLvl = getLevelForCtz(newTotalEarned);

  // Atomically commit update
  db.prepare(`
    UPDATE balances
    SET ctz_balance = ?, energy = ?, energy_last_updated = ?, tap_count = ?, total_earned = ?, level = ?, updated_at = ?
    WHERE user_id = ?
  `).run(newBalance, newEnergy, energyCalc.newLastUpdated, newTapCount, newTotalEarned, newLvl.level, now, user.id);

  res.json({
    success: true,
    data: {
      balance: newBalance,
      earned: earnedCtz,
      tapsProcessed: actualTaps,
      energy: newEnergy,
      maxEnergy: 1000 + newLvl.maxEnergyBonus,
      tapCount: newTapCount,
      totalEarned: newTotalEarned,
      level: newLvl.level,
      levelName: newLvl.name,
      tapMultiplier: newLvl.tapMultiplier,
      nextLevel: getNextLevel(newLvl.level),
      secondsUntilFull: Math.max(0, (maxEnergy - newEnergy) * regenSec),
    },
  });
});

// ----------------------------------------------------
// DAILY REWARDS (7-DAY STREAK CLAIM)
// ----------------------------------------------------

apiRouter.post('/daily-reward/claim', (req: Request, res: Response) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const { user } = auth;
  const db = getDb();
  const balanceRow = db.prepare('SELECT * FROM balances WHERE user_id = ?').get(user.id) as any;

  const now = Date.now();
  const lastClaimed = balanceRow.last_daily_claimed_at || 0;
  const elapsedHours = (now - lastClaimed) / (1000 * 60 * 60);

  // Policy: Must be >= 20 hours since last claim to allow reasonable daily cadence
  if (lastClaimed > 0 && elapsedHours < 20) {
    const hoursRemaining = (20 - elapsedHours).toFixed(1);
    return res.status(400).json({
      success: false,
      error: {
        code: 'ALREADY_CLAIMED_TODAY',
        message: `Daily reward already claimed today. Next reward available in ${hoursRemaining}h.`,
        hoursRemaining,
      },
    });
  }

  // Missed-day streak reset: if > 48 hours, streak resets to Day 1
  let newStreak = balanceRow.streak_days + 1;
  if (elapsedHours > 48 || balanceRow.streak_days >= 7) {
    newStreak = 1;
  }

  const rewardAmount = DAILY_REWARDS[newStreak - 1] || 100;
  const newBalance = balanceRow.ctz_balance + rewardAmount;
  const newTotalEarned = balanceRow.total_earned + rewardAmount;
  const newLvl = getLevelForCtz(newTotalEarned);

  // Update DB and record transaction
  db.prepare(`
    UPDATE balances
    SET ctz_balance = ?, total_earned = ?, streak_days = ?, last_daily_claimed_at = ?, level = ?, updated_at = ?
    WHERE user_id = ?
  `).run(newBalance, newTotalEarned, newStreak, now, newLvl.level, now, user.id);

  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, status, description, created_at)
    VALUES (?, ?, 'DAILY_REWARD', ?, 'COMPLETED', ?, ?)
  `).run('tx_' + crypto.randomBytes(6).toString('hex'), user.id, rewardAmount, `Day ${newStreak} Streak Reward`, now);

  res.json({
    success: true,
    data: {
      claimedStreakDay: newStreak,
      reward: rewardAmount,
      newBalance,
      streakDays: newStreak,
      lastClaimedAt: now,
    },
  });
});

// ----------------------------------------------------
// TASKS & VERIFICATION
// ----------------------------------------------------

apiRouter.get('/tasks', (req: Request, res: Response) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const db = getDb();
  const tasks = db.prepare('SELECT * FROM tasks WHERE is_active = 1 ORDER BY reward DESC').all() as any[];
  const completions = db.prepare('SELECT task_id FROM task_completions WHERE user_id = ?').all(auth.user.id) as { task_id: string }[];
  const completedSet = new Set(completions.map(c => c.task_id));

  const enriched = tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    reward: t.reward,
    url: t.url,
    taskType: t.task_type,
    isCompleted: completedSet.has(t.id),
    currentClaims: t.current_claims,
    maxClaims: t.max_claims,
  }));

  res.json({ success: true, data: enriched });
});

apiRouter.post('/tasks/verify', (req: Request, res: Response) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const { taskId } = req.body;
  if (!taskId) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_TASK', message: 'taskId is required' } });
  }

  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND is_active = 1').get(taskId) as any;
  if (!task) {
    return res.status(404).json({ success: false, error: { code: 'TASK_NOT_FOUND', message: 'Task not found or expired' } });
  }

  // Check if already completed
  const existing = db.prepare('SELECT id FROM task_completions WHERE user_id = ? AND task_id = ?').get(auth.user.id, taskId);
  if (existing) {
    return res.status(400).json({ success: false, error: { code: 'ALREADY_COMPLETED', message: 'Task already completed' } });
  }

  const now = Date.now();

  try {
    // Record completion
    db.prepare(`
      INSERT INTO task_completions (id, user_id, task_id, reward_claimed, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('tc_' + crypto.randomBytes(6).toString('hex'), auth.user.id, taskId, task.reward, now);

    // Update claim count
    db.prepare('UPDATE tasks SET current_claims = current_claims + 1 WHERE id = ?').run(taskId);

    // Credit reward
    const balance = db.prepare('SELECT * FROM balances WHERE user_id = ?').get(auth.user.id) as any;
    const newBal = balance.ctz_balance + task.reward;
    const newTotal = balance.total_earned + task.reward;
    const newLvl = getLevelForCtz(newTotal);

    db.prepare('UPDATE balances SET ctz_balance = ?, total_earned = ?, level = ?, updated_at = ? WHERE user_id = ?')
      .run(newBal, newTotal, newLvl.level, now, auth.user.id);

    // Log transaction
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, status, description, reference_id, created_at)
      VALUES (?, ?, 'TASK', ?, 'COMPLETED', ?, ?, ?)
    `).run('tx_' + crypto.randomBytes(6).toString('hex'), auth.user.id, task.reward, `Mission: ${task.title}`, taskId, now);

    res.json({
      success: true,
      data: {
        reward: task.reward,
        newBalance: newBal,
        level: newLvl.level,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'VERIFICATION_FAILED', message: err.message } });
  }
});

// ----------------------------------------------------
// REFERRALS & FRIENDS
// ----------------------------------------------------

apiRouter.get('/referrals', (req: Request, res: Response) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const db = getDb();
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || getSetting(db, 'bot_username', 'ctz9Bot');
  const referralCode = auth.user.id;
  const referralLink = `https://t.me/${botUsername}?start=${referralCode}`;

  const friends = db.prepare(`
    SELECT r.bonus_referrer, r.created_at, u.first_name, u.username, u.photo_url, b.ctz_balance, b.level
    FROM referrals r
    JOIN users u ON r.referred_id = u.id
    JOIN balances b ON u.id = b.user_id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
  `).all(auth.user.id) as any[];

  const totalInvited = friends.length;
  const activeReferrals = friends.filter(f => f.ctz_balance > 50).length;
  const totalEarnings = friends.reduce((acc, f) => acc + f.bonus_referrer, 0);

  res.json({
    success: true,
    data: {
      referralCode,
      referralLink,
      totalInvited,
      activeReferrals,
      totalEarnings,
      referrerBonus: parseInt(getSetting(db, 'referral_reward_referrer', '1000'), 10),
      referredBonus: parseInt(getSetting(db, 'referral_reward_referred', '500'), 10),
      friends: friends.map(f => ({
        firstName: f.first_name,
        username: f.username,
        photoUrl: f.photo_url,
        level: f.level,
        earnedBonus: f.bonus_referrer,
        joinedAt: f.created_at,
      })),
    },
  });
});

// ----------------------------------------------------
// LEADERBOARD (GLOBAL RANKINGS)
// ----------------------------------------------------

apiRouter.get('/leaderboard', (req: Request, res: Response) => {
  const auth = getAuthUser(req);
  const db = getDb();
  const filterType = (req.query.type as string) || 'ctz';

  let orderClause = 'b.ctz_balance DESC';
  if (filterType === 'referrals') {
    orderClause = 'referrals_count DESC, b.ctz_balance DESC';
  } else if (filterType === 'level') {
    orderClause = 'b.level DESC, b.total_earned DESC';
  } else if (filterType === 'taps') {
    orderClause = 'b.tap_count DESC';
  }

  const leaders = db.prepare(`
    SELECT
      u.id, u.first_name, u.username, u.photo_url,
      b.ctz_balance, b.level, b.tap_count, b.total_earned,
      (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = u.id) as referrals_count,
      (SELECT COUNT(*) FROM task_completions tc WHERE tc.user_id = u.id) as tasks_count
    FROM balances b
    JOIN users u ON b.user_id = u.id
    WHERE u.is_suspended = 0
    ORDER BY ${orderClause}
    LIMIT 100
  `).all() as any[];

  let userRank = 0;
  if (auth) {
    const userBalance = auth.balance.ctz_balance;
    const r = db.prepare('SELECT COUNT(*) + 1 as rank FROM balances WHERE ctz_balance > ?').get(userBalance) as any;
    userRank = r?.rank || 1;
  }

  res.json({
    success: true,
    data: {
      leaders: leaders.map((l, index) => ({
        rank: index + 1,
        id: l.id,
        firstName: l.first_name,
        username: l.username,
        photoUrl: l.photo_url,
        balance: l.ctz_balance,
        level: l.level,
        tapCount: l.tap_count,
        referralsCount: l.referrals_count,
        tasksCount: l.tasks_count,
      })),
      userRank,
    },
  });
});

// ----------------------------------------------------
// WALLET & REQUEST-BASED WITHDRAWALS
// ----------------------------------------------------

apiRouter.get('/wallet', (req: Request, res: Response) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const db = getDb();
  const minWithdrawal = parseInt(getSetting(db, 'min_withdrawal_amount', '5000'), 10);
  const maxWithdrawal = parseInt(getSetting(db, 'max_withdrawal_amount', '500000'), 10);
  const dailyLimit = parseInt(getSetting(db, 'daily_withdrawal_limit', '100000'), 10);

  const pendingWithdrawals = db.prepare(`
    SELECT * FROM withdrawals WHERE user_id = ? AND status = 'PENDING' ORDER BY created_at DESC
  `).all(auth.user.id);

  res.json({
    success: true,
    data: {
      ctzBalance: auth.balance.ctz_balance,
      totalEarned: auth.balance.total_earned,
      minWithdrawal,
      maxWithdrawal,
      dailyLimit,
      allowedMethods: ['Binance Pay', 'USDT (TRC20)', 'USDT (BEP20)', 'TON Wallet'],
      pendingWithdrawals,
      disclaimer: 'CTZ Coins are currently in-app reward points. Withdrawals are subject to verification and review by the project operators.',
    },
  });
});

apiRouter.post('/withdraw', (req: Request, res: Response) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const { amount, paymentMethod, accountAddress } = req.body;
  const numAmount = parseInt(amount, 10);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Invalid withdrawal amount' } });
  }
  if (!paymentMethod || !accountAddress) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Payment method and address are required' } });
  }

  const db = getDb();
  const minWithdrawal = parseInt(getSetting(db, 'min_withdrawal_amount', '5000'), 10);
  const maxWithdrawal = parseInt(getSetting(db, 'max_withdrawal_amount', '500000'), 10);

  if (numAmount < minWithdrawal) {
    return res.status(400).json({
      success: false,
      error: { code: 'BELOW_MINIMUM', message: `Minimum withdrawal is ${minWithdrawal.toLocaleString()} CTZ` },
    });
  }
  if (numAmount > maxWithdrawal) {
    return res.status(400).json({
      success: false,
      error: { code: 'ABOVE_MAXIMUM', message: `Maximum withdrawal per request is ${maxWithdrawal.toLocaleString()} CTZ` },
    });
  }

  const balanceRow = db.prepare('SELECT ctz_balance FROM balances WHERE user_id = ?').get(auth.user.id) as any;
  if (balanceRow.ctz_balance < numAmount) {
    return res.status(400).json({
      success: false,
      error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient CTZ balance for withdrawal' },
    });
  }

  const now = Date.now();
  const withdrawalId = 'wth_' + crypto.randomBytes(6).toString('hex');

  // Atomically deduct balance and create withdrawal request
  db.prepare('UPDATE balances SET ctz_balance = ctz_balance - ? WHERE user_id = ?').run(numAmount, auth.user.id);

  db.prepare(`
    INSERT INTO withdrawals (id, user_id, amount, payment_method, account_address, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(withdrawalId, auth.user.id, numAmount, paymentMethod, accountAddress, now, now);

  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, status, description, reference_id, created_at)
    VALUES (?, ?, 'WITHDRAWAL_REQUEST', ?, 'PENDING', ?, ?, ?)
  `).run('tx_' + crypto.randomBytes(6).toString('hex'), auth.user.id, -numAmount, `Withdrawal via ${paymentMethod}`, withdrawalId, now);

  res.json({
    success: true,
    data: {
      withdrawalId,
      amount: numAmount,
      paymentMethod,
      accountAddress,
      status: 'PENDING',
      createdAt: now,
      newBalance: balanceRow.ctz_balance - numAmount,
    },
  });
});

// ----------------------------------------------------
// TRANSACTION HISTORY
// ----------------------------------------------------

apiRouter.get('/transactions', (req: Request, res: Response) => {
  const auth = getAuthUser(req);
  if (!auth) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  const db = getDb();
  const txs = db.prepare(`
    SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(auth.user.id) as any[];

  res.json({
    success: true,
    data: txs.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      status: t.status,
      description: t.description,
      createdAt: t.created_at,
    })),
  });
});

// ----------------------------------------------------
// PROMOTIONAL ADS SYSTEM
// ----------------------------------------------------

apiRouter.get('/ads', (req: Request, res: Response) => {
  const db = getDb();
  const activeAd = db.prepare(`
    SELECT * FROM ads WHERE is_active = 1 AND current_impressions < max_impressions ORDER BY RANDOM() LIMIT 1
  `).get() as any;

  const intervalSec = parseInt(getSetting(db, 'ad_interval_seconds', '30'), 10);
  const durationSec = parseInt(getSetting(db, 'ad_duration_seconds', '10'), 10);

  res.json({
    success: true,
    data: {
      ad: activeAd
        ? {
            id: activeAd.id,
            title: activeAd.title,
            description: activeAd.description,
            imageUrl: activeAd.image_url,
            targetUrl: activeAd.target_url,
            ctaText: activeAd.cta_text,
            durationSeconds: activeAd.display_duration_seconds || durationSec,
          }
        : null,
      intervalSeconds: intervalSec,
      durationSeconds: durationSec,
    },
  });
});

apiRouter.post('/ads/event', (req: Request, res: Response) => {
  const { adId, eventType } = req.body;
  const auth = getAuthUser(req);
  const db = getDb();

  if (adId && eventType) {
    const eventId = 'ade_' + crypto.randomBytes(6).toString('hex');
    const userId = auth?.user?.id || 'anonymous';
    try {
      db.prepare('INSERT INTO ad_events (id, ad_id, user_id, event_type, timestamp) VALUES (?, ?, ?, ?, ?)')
        .run(eventId, adId, userId, eventType, Date.now());

      if (eventType === 'IMPRESSION') {
        db.prepare('UPDATE ads SET current_impressions = current_impressions + 1 WHERE id = ?').run(adId);
      }
    } catch {}
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// TELEGRAM BOT SIMULATOR
// ----------------------------------------------------

apiRouter.post('/bot/simulate', (req: Request, res: Response) => {
  const { command, fromUser } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: { message: 'Missing command' } });
  }

  const user = fromUser || { id: '123456789', first_name: 'Miner', username: 'miner_ctz' };
  const response = handleBotCommand(command, user);
  res.json({ success: true, data: response });
});

// ----------------------------------------------------
// SECURE ADMIN PANEL API
// ----------------------------------------------------

apiRouter.post('/admin/login', (req: Request, res: Response) => {
  const { secret } = req.body;
  const realSecret = process.env.ADMIN_SECRET || 'ctz58235';
  if (secret === realSecret) {
    return res.json({ success: true, token: realSecret });
  }
  res.status(401).json({ success: false, error: { message: 'Invalid admin secret key' } });
});

apiRouter.get('/admin/stats', adminAuthMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const activeUsers = (db.prepare('SELECT COUNT(*) as count FROM users WHERE last_active_at > ?').get(Date.now() - 86400000) as any).count;
  const newUsersToday = (db.prepare('SELECT COUNT(*) as count FROM users WHERE created_at > ?').get(Date.now() - 86400000) as any).count;
  const totalCtzIssued = (db.prepare('SELECT COALESCE(SUM(total_earned), 0) as total FROM balances').get() as any).total;
  const totalReferrals = (db.prepare('SELECT COUNT(*) as count FROM referrals').get() as any).count;
  const tasksCompleted = (db.prepare('SELECT COUNT(*) as count FROM task_completions').get() as any).count;
  const pendingWithdrawals = (db.prepare("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'PENDING'").get() as any).count;
  const suspiciousCount = (db.prepare('SELECT COUNT(*) as count FROM suspicious_activity').get() as any).count;

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      newUsersToday,
      totalCtzIssued,
      totalReferrals,
      tasksCompleted,
      pendingWithdrawals,
      suspiciousCount,
    },
  });
});

apiRouter.get('/admin/users', adminAuthMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const query = (req.query.search as string) || '';
  let users: any[];

  if (query) {
    users = db.prepare(`
      SELECT u.*, b.ctz_balance, b.energy, b.tap_count, b.level, b.total_earned
      FROM users u
      LEFT JOIN balances b ON u.id = b.user_id
      WHERE u.username LIKE ? OR u.first_name LIKE ? OR u.telegram_id LIKE ?
      ORDER BY u.created_at DESC LIMIT 50
    `).all(`%${query}%`, `%${query}%`, `%${query}%`);
  } else {
    users = db.prepare(`
      SELECT u.*, b.ctz_balance, b.energy, b.tap_count, b.level, b.total_earned
      FROM users u
      LEFT JOIN balances b ON u.id = b.user_id
      ORDER BY u.created_at DESC LIMIT 50
    `).all();
  }

  res.json({ success: true, data: users });
});

apiRouter.post('/admin/user/adjust-balance', adminAuthMiddleware, (req: Request, res: Response) => {
  const { userId, amount, reason } = req.body;
  const numAmount = parseInt(amount, 10);
  if (!userId || isNaN(numAmount)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid parameters' } });
  }

  const db = getDb();
  const current = db.prepare('SELECT ctz_balance FROM balances WHERE user_id = ?').get(userId) as any;
  if (!current) {
    return res.status(404).json({ success: false, error: { message: 'User not found' } });
  }

  const newBalance = Math.max(0, current.ctz_balance + numAmount);
  db.prepare('UPDATE balances SET ctz_balance = ? WHERE user_id = ?').run(newBalance, userId);

  const now = Date.now();
  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, admin_id, action, target_user_id, old_value, new_value, reason, created_at)
    VALUES (?, 'ADMIN', 'ADJUST_BALANCE', ?, ?, ?, ?, ?)
  `).run('aud_' + crypto.randomBytes(6).toString('hex'), userId, String(current.ctz_balance), String(newBalance), reason || 'Manual adjustment', now);

  // Transaction record
  db.prepare(`
    INSERT INTO transactions (id, user_id, type, amount, status, description, created_at)
    VALUES (?, ?, 'ADMIN_ADJUSTMENT', ?, 'COMPLETED', ?, ?)
  `).run('tx_' + crypto.randomBytes(6).toString('hex'), userId, numAmount, `Admin Adjustment: ${reason || 'Manual'}`, now);

  res.json({ success: true, data: { newBalance } });
});

apiRouter.post('/admin/user/toggle-suspend', adminAuthMiddleware, (req: Request, res: Response) => {
  const { userId, suspend, reason } = req.body;
  const db = getDb();
  const val = suspend ? 1 : 0;
  db.prepare('UPDATE users SET is_suspended = ?, suspension_reason = ? WHERE id = ?').run(val, reason || null, userId);

  db.prepare(`
    INSERT INTO audit_logs (id, admin_id, action, target_user_id, old_value, new_value, reason, created_at)
    VALUES (?, 'ADMIN', 'TOGGLE_SUSPEND', ?, '', ?, ?, ?)
  `).run('aud_' + crypto.randomBytes(6).toString('hex'), userId, String(val), reason || 'Policy action', Date.now());

  res.json({ success: true });
});

apiRouter.get('/admin/withdrawals', adminAuthMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const list = db.prepare(`
    SELECT w.*, u.first_name, u.username, u.telegram_id
    FROM withdrawals w
    JOIN users u ON w.user_id = u.id
    ORDER BY w.created_at DESC
  `).all();
  res.json({ success: true, data: list });
});

apiRouter.post('/admin/withdrawals/:id/action', adminAuthMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, note } = req.body; // 'APPROVE', 'REJECT', 'COMPLETE'
  const db = getDb();

  const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(id) as any;
  if (!withdrawal) {
    return res.status(404).json({ success: false, error: { message: 'Withdrawal not found' } });
  }

  const now = Date.now();
  let newStatus = withdrawal.status;

  if (action === 'APPROVE') {
    newStatus = 'APPROVED';
  } else if (action === 'COMPLETE') {
    newStatus = 'COMPLETED';
  } else if (action === 'REJECT') {
    newStatus = 'REJECTED';
    // Refund user balance
    db.prepare('UPDATE balances SET ctz_balance = ctz_balance + ? WHERE user_id = ?').run(withdrawal.amount, withdrawal.user_id);
    db.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, status, description, reference_id, created_at)
      VALUES (?, ?, 'WITHDRAWAL_REFUND', ?, 'COMPLETED', ?, ?, ?)
    `).run('tx_' + crypto.randomBytes(6).toString('hex'), withdrawal.user_id, withdrawal.amount, `Refund: Withdrawal rejected (${note || 'policy'})`, id, now);
  }

  db.prepare('UPDATE withdrawals SET status = ?, admin_notes = ?, updated_at = ? WHERE id = ?')
    .run(newStatus, note || null, now, id);

  db.prepare(`
    INSERT INTO audit_logs (id, admin_id, action, target_user_id, old_value, new_value, reason, created_at)
    VALUES (?, 'ADMIN', 'WITHDRAWAL_STATUS', ?, ?, ?, ?, ?)
  `).run('aud_' + crypto.randomBytes(6).toString('hex'), withdrawal.user_id, withdrawal.status, newStatus, note || '', now);

  res.json({ success: true, data: { status: newStatus } });
});

apiRouter.get('/admin/tasks', adminAuthMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  res.json({ success: true, data: tasks });
});

apiRouter.post('/admin/tasks', adminAuthMiddleware, (req: Request, res: Response) => {
  const { id, title, description, reward, url, task_type, is_active } = req.body;
  const db = getDb();
  const now = Date.now();

  if (id) {
    db.prepare(`
      UPDATE tasks SET title = ?, description = ?, reward = ?, url = ?, task_type = ?, is_active = ?
      WHERE id = ?
    `).run(title, description, reward, url, task_type, is_active ? 1 : 0, id);
  } else {
    const newId = 'task_' + crypto.randomBytes(5).toString('hex');
    db.prepare(`
      INSERT INTO tasks (id, title, description, reward, url, task_type, is_active, max_claims, current_claims, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `).run(newId, title, description, reward, url, task_type, is_active ? 1 : 0, now);
  }

  res.json({ success: true });
});

apiRouter.delete('/admin/tasks/:id', adminAuthMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

apiRouter.get('/admin/ads', adminAuthMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const ads = db.prepare('SELECT * FROM ads ORDER BY created_at DESC').all();
  res.json({ success: true, data: ads });
});

apiRouter.post('/admin/ads', adminAuthMiddleware, (req: Request, res: Response) => {
  const { id, title, description, image_url, target_url, cta_text, display_duration_seconds, display_interval_seconds, is_active } = req.body;
  const db = getDb();
  const now = Date.now();

  if (id) {
    db.prepare(`
      UPDATE ads
      SET title = ?, description = ?, image_url = ?, target_url = ?, cta_text = ?, display_duration_seconds = ?, display_interval_seconds = ?, is_active = ?
      WHERE id = ?
    `).run(title, description, image_url, target_url, cta_text, display_duration_seconds, display_interval_seconds, is_active ? 1 : 0, id);
  } else {
    const newId = 'ad_' + crypto.randomBytes(5).toString('hex');
    db.prepare(`
      INSERT INTO ads (id, title, description, image_url, target_url, cta_text, display_duration_seconds, display_interval_seconds, is_active, max_impressions, current_impressions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 100000, 0, ?)
    `).run(newId, title, description, image_url, target_url, cta_text, display_duration_seconds || 10, display_interval_seconds || 30, is_active ? 1 : 0, now);
  }

  res.json({ success: true });
});

apiRouter.post('/admin/settings', adminAuthMiddleware, (req: Request, res: Response) => {
  const { settings } = req.body;
  const db = getDb();
  const now = Date.now();

  if (settings && typeof settings === 'object') {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
    for (const [k, v] of Object.entries(settings)) {
      stmt.run(k, String(v), now);
    }
  }

  res.json({ success: true });
});

apiRouter.get('/admin/audit-logs', adminAuthMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  res.json({ success: true, data: logs });
});

apiRouter.get('/admin/suspicious', adminAuthMiddleware, (req: Request, res: Response) => {
  const db = getDb();
  const list = db.prepare(`
    SELECT s.*, u.username, u.first_name, u.telegram_id
    FROM suspicious_activity s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.flagged_at DESC LIMIT 50
  `).all();
  res.json({ success: true, data: list });
});
