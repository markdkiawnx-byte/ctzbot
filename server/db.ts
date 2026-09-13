import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.resolve(process.cwd(), 'ctz_bot.sqlite');

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    // Enable WAL mode and foreign keys for performance and ACID integrity
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      telegram_id TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT,
      photo_url TEXT,
      role TEXT DEFAULT 'user',
      is_suspended INTEGER DEFAULT 0,
      suspension_reason TEXT,
      created_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS balances (
      user_id TEXT PRIMARY KEY,
      ctz_balance INTEGER DEFAULT 0,
      energy INTEGER DEFAULT 1000,
      max_energy INTEGER DEFAULT 1000,
      energy_last_updated INTEGER NOT NULL,
      tap_count INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0,
      last_daily_claimed_at INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'COMPLETED',
      description TEXT NOT NULL,
      reference_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_id TEXT UNIQUE NOT NULL,
      bonus_referrer INTEGER DEFAULT 1000,
      bonus_referred INTEGER DEFAULT 500,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reward INTEGER NOT NULL,
      url TEXT NOT NULL,
      task_type TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      max_claims INTEGER DEFAULT 0,
      current_claims INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_completions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      reward_claimed INTEGER NOT NULL,
      completed_at INTEGER NOT NULL,
      UNIQUE(user_id, task_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS withdrawals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      account_address TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      admin_notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ads (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      target_url TEXT,
      cta_text TEXT DEFAULT 'Learn More',
      display_duration_seconds INTEGER DEFAULT 10,
      display_interval_seconds INTEGER DEFAULT 30,
      is_active INTEGER DEFAULT 1,
      max_impressions INTEGER DEFAULT 10000,
      current_impressions INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ad_events (
      id TEXT PRIMARY KEY,
      ad_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'INFO',
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_user_id TEXT,
      old_value TEXT,
      new_value TEXT,
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suspicious_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      flagged_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default settings and initial tasks if empty
  seedDefaults(db);
}

function seedDefaults(db: DatabaseSync) {
  const settingsCount = (db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number }).count;
  if (settingsCount === 0) {
    const now = Date.now();
    const defaults = [
      ['app_name', 'CTZ BOT'],
      ['maintenance_mode', 'false'],
      ['tap_reward', '1'],
      ['max_energy_base', '1000'],
      ['energy_regen_seconds', '1'], // 1 energy every 1 second
      ['referral_reward_referrer', '1000'],
      ['referral_reward_referred', '500'],
      ['min_withdrawal_amount', '5000'],
      ['max_withdrawal_amount', '500000'],
      ['daily_withdrawal_limit', '100000'],
      ['support_username', '@ctz9Bot'],
      ['bot_username', 'ctz9Bot'],
      ['bot_url', 'https://t.me/ctz9Bot'],
      ['community_url', 'https://t.me/ctz9Bot'],
      ['ad_interval_seconds', '30'],
      ['ad_duration_seconds', '10'],
      ['adsterra_url', 'https://grannyreproof.com/w0k5m22w3?key=03f13319fd9f4e5a58c14b36df19db9b'],
    ];

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
    for (const [key, val] of defaults) {
      stmt.run(key, val, now);
    }
  } else {
    // Ensure bot and adsterra settings are up to date
    const now = Date.now();
    const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
    updateStmt.run('bot_username', 'ctz9Bot', now);
    updateStmt.run('bot_url', 'https://t.me/ctz9Bot', now);
    updateStmt.run('support_username', '@ctz9Bot', now);
    updateStmt.run('adsterra_url', 'https://grannyreproof.com/w0k5m22w3?key=03f13319fd9f4e5a58c14b36df19db9b', now);
  }

  const tasksCount = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }).count;
  if (tasksCount === 0) {
    const now = Date.now();
    const initialTasks = [
      ['task-1', 'Join CTZ Community Channel', 'Stay updated with official announcements and exclusive alpha', 1000, 'https://t.me/CTZ_Community', 'TELEGRAM_CHANNEL', 1, 0, 0, now],
      ['task-2', 'Follow CTZ on X / Twitter', 'Follow our official X handle for quick announcements and giveaways', 750, 'https://x.com/ctz_bot', 'SOCIAL_MEDIA', 1, 0, 0, now],
      ['task-3', 'Join CTZ Global Chat', 'Chat with thousands of fellow CTZ miners worldwide', 500, 'https://t.me/CTZ_Chat', 'TELEGRAM_GROUP', 1, 0, 0, now],
      ['task-4', 'Visit CTZ Ecosystem Whitepaper', 'Read about CTZ utility, mechanics, and upcoming token distribution', 600, 'https://ctzbot.io/whitepaper', 'WEBSITE_VISIT', 1, 0, 0, now],
      ['task-5', 'Watch CTZ Introduction on YouTube', 'Quick 2-minute overview of tap mechanics and level upgrades', 800, 'https://youtube.com', 'YOUTUBE', 1, 0, 0, now],
      ['task-6', 'Invite 3 Friends Challenge', 'Expand the CTZ network and unlock special Pioneer status', 2500, '#referrals', 'CUSTOM', 1, 0, 0, now],
    ];

    const taskStmt = db.prepare(`
      INSERT INTO tasks (id, title, description, reward, url, task_type, is_active, max_claims, current_claims, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const task of initialTasks) {
      taskStmt.run(...task);
    }
  }

  const adsCount = (db.prepare('SELECT COUNT(*) as count FROM ads').get() as { count: number }).count;
  if (adsCount === 0) {
    const now = Date.now();
    const adStmt = db.prepare(`
      INSERT INTO ads (id, title, description, image_url, target_url, cta_text, display_duration_seconds, display_interval_seconds, is_active, max_impressions, current_impressions, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    adStmt.run(
      'ad-adsterra',
      'Monetag & Adsterra Sponsored Offer',
      'Check out this featured partner campaign. Visit the sponsor link to boost community rewards and unlock special bonuses!',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
      'https://grannyreproof.com/w0k5m22w3?key=03f13319fd9f4e5a58c14b36df19db9b',
      'Open Offer 🚀',
      10,
      30,
      1,
      100000,
      0,
      now
    );
  }

  // Always ensure Adsterra sponsored ad exists and is active
  const ensureAd = db.prepare(`
    INSERT OR REPLACE INTO ads (id, title, description, image_url, target_url, cta_text, display_duration_seconds, display_interval_seconds, is_active, max_impressions, current_impressions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  ensureAd.run(
    'ad-adsterra',
    'Monetag & Adsterra Sponsored Offer',
    'Check out this featured partner campaign. Visit the sponsor link to boost community rewards and unlock special bonuses!',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    'https://grannyreproof.com/w0k5m22w3?key=03f13319fd9f4e5a58c14b36df19db9b',
    'Open Offer 🚀',
    10,
    30,
    1,
    100000,
    0,
    Date.now()
  );

  // Always ensure Monetag / Adsterra task exists in missions
  const ensureTask = db.prepare(`
    INSERT OR REPLACE INTO tasks (id, title, description, reward, url, task_type, is_active, max_claims, current_claims, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  ensureTask.run(
    'task-adsterra',
    'Visit Monetag / Adsterra Sponsor Offer',
    'Explore our official sponsor campaign on Adsterra to claim instant bonus CTZ Coins',
    800,
    'https://grannyreproof.com/w0k5m22w3?key=03f13319fd9f4e5a58c14b36df19db9b',
    'WEBSITE_VISIT',
    1,
    0,
    0,
    Date.now()
  );

  const announcementCount = (db.prepare('SELECT COUNT(*) as count FROM announcements').get() as { count: number }).count;
  if (announcementCount === 0) {
    const now = Date.now();
    const annStmt = db.prepare(`
      INSERT INTO announcements (id, title, content, type, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    annStmt.run(
      'ann-1',
      'Welcome to CTZ BOT Genesis Mining!',
      'Tap to earn CTZ Coins, invite your crew, level up to Legend status, and climb the global leaderboards.',
      'PROMO',
      1,
      now
    );
  }
}
