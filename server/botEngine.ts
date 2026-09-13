import { DatabaseSync } from 'node:sqlite';
import { getDb } from './db.js';
import { getLevelForCtz, getSetting } from './gameService.js';

export interface BotButton {
  text: string;
  url?: string;
  web_app?: { url: string };
  callback_data?: string;
}

export interface BotResponse {
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: {
    inline_keyboard?: BotButton[][];
  };
}

export function handleBotCommand(
  commandRaw: string,
  fromUser: { id: string | number; first_name: string; username?: string }
): BotResponse {
  const db = getDb();
  const parts = commandRaw.trim().split(/\s+/);
  const command = (parts[0] || '').toLowerCase();
  const arg = parts[1] || '';

  const appUrl = process.env.APP_URL || 'https://ctzbot.io';
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || getSetting(db, 'bot_username', 'ctz9Bot');
  const telegramId = String(fromUser.id);

  // Retrieve user from DB if exists
  const userRow = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as any;
  let balanceRow = userRow ? (db.prepare('SELECT * FROM balances WHERE user_id = ?').get(userRow.id) as any) : null;

  const supportUsername = getSetting(db, 'support_username', '@ctz9Bot');
  const communityUrl = getSetting(db, 'community_url', 'https://t.me/ctz9Bot');

  switch (command) {
    case '/start': {
      let welcomeExtra = '';
      if (arg && (!userRow || !userRow.id)) {
        welcomeExtra = `\n🎁 *Referral detected!* You will receive a bonus +500 CTZ on signup.`;
      }

      return {
        text: `*Welcome to CTZ BOT* 🚀\n\nTap, complete tasks, invite friends and collect *CTZ Coins*.\n\nLevel up through 7 futuristic tiers, regenerate cyber energy, and compete on the global leaderboard.${welcomeExtra}`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 OPEN CTZ BOT',
                web_app: { url: appUrl },
              },
            ],
            [
              { text: '📢 Community', url: communityUrl },
              { text: '💬 Support', url: `https://t.me/${supportUsername.replace('@', '')}` },
            ],
            [
              { text: '📚 Help & Guide', callback_data: '/help' },
              { text: '👥 Invite Friends', callback_data: '/referral' },
            ],
          ],
        },
      };
    }

    case '/app': {
      return {
        text: `⚡ *Launch CTZ BOT Mini App*\n\nTap the button below to launch the high-speed cyber dashboard.`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 Launch CTZ Mini App',
                web_app: { url: appUrl },
              },
            ],
          ],
        },
      };
    }

    case '/balance': {
      if (!balanceRow) {
        return {
          text: `⚠️ *Account Not Initialized*\n\nPlease launch the mini app once to initialize your CTZ wallet.`,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🚀 Open Mini App', web_app: { url: appUrl } }]],
          },
        };
      }

      const lvl = getLevelForCtz(balanceRow.total_earned);
      return {
        text: `💳 *CTZ BOT Balance Summary*\n\n` +
          `👤 *User:* ${fromUser.first_name} (@${fromUser.username || 'n/a'})\n` +
          `💰 *CTZ Balance:* \`${balanceRow.ctz_balance.toLocaleString()} CTZ\`\n` +
          `⚡ *Energy:* \`${balanceRow.energy} / ${balanceRow.max_energy}\`\n` +
          `🎖️ *Level:* \`${lvl.level} - ${lvl.name}\` (${lvl.tapMultiplier}x Multiplier)\n` +
          `👆 *Total Taps:* \`${balanceRow.tap_count.toLocaleString()}\`\n` +
          `🔥 *Daily Streak:* \`${balanceRow.streak_days} Days\``,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Tap & Earn Now', web_app: { url: appUrl } }],
          ],
        },
      };
    }

    case '/referral': {
      const refCode = userRow ? userRow.id : `ctz_${telegramId}`;
      const refLink = `https://t.me/${botUsername}?start=${refCode}`;

      let totalInvited = 0;
      let totalEarned = 0;
      if (userRow) {
        const stats = db.prepare(`
          SELECT COUNT(*) as invited, COALESCE(SUM(bonus_referrer), 0) as earned
          FROM referrals WHERE referrer_id = ?
        `).get(userRow.id) as any;
        totalInvited = stats?.invited || 0;
        totalEarned = stats?.earned || 0;
      }

      return {
        text: `👥 *CTZ BOT Referral Program*\n\n` +
          `Invite friends to mine CTZ together! Both you and your invited friend get rewarded:\n\n` +
          `• *You receive:* +1,000 CTZ per active invite\n` +
          `• *Friend receives:* +500 CTZ welcome bonus\n\n` +
          `📊 *Your Stats:*\n` +
          `• Total Invited: \`${totalInvited}\` friends\n` +
          `• Referral Earnings: \`${totalEarned.toLocaleString()} CTZ\`\n\n` +
          `🔗 *Your Unique Referral Link:*\n\`${refLink}\``,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📢 Share Referral Link',
                url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('Join CTZ BOT and start mining CTZ Coins with me! 🚀')}`,
              },
            ],
            [{ text: '🚀 Open Mini App', web_app: { url: appUrl } }],
          ],
        },
      };
    }

    case '/tasks': {
      const activeTasks = db.prepare('SELECT title, reward, task_type FROM tasks WHERE is_active = 1 LIMIT 4').all() as any[];
      let taskList = activeTasks.map(t => `• *${t.title}* (+${t.reward} CTZ)`).join('\n');
      if (!taskList) taskList = '• Daily check-in (+100 to +2500 CTZ)\n• Community channels';

      return {
        text: `📋 *Available CTZ Tasks*\n\nComplete simple missions to boost your CTZ balance instantly:\n\n${taskList}\n\nLaunch the app to verify and claim your rewards!`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '📋 View All Tasks', web_app: { url: `${appUrl}?tab=earn` } }]],
        },
      };
    }

    case '/leaderboard': {
      const topUsers = db.prepare(`
        SELECT u.first_name, u.username, b.ctz_balance, b.level
        FROM balances b
        JOIN users u ON b.user_id = u.id
        WHERE u.is_suspended = 0
        ORDER BY b.ctz_balance DESC
        LIMIT 5
      `).all() as any[];

      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      let leadersText = topUsers.map((u, i) => {
        const name = u.first_name || (u.username ? `@${u.username}` : 'Miner');
        return `${medals[i]} *${name}* — \`${u.ctz_balance.toLocaleString()} CTZ\` (Lvl ${u.level})`;
      }).join('\n');

      if (!leadersText) {
        leadersText = 'Be the first miner to climb the ranks!';
      }

      return {
        text: `🏆 *CTZ BOT Global Leaderboard (Top 5)*\n\n${leadersText}\n\nTop 100 rankings and full tiers available in the Mini App!`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🏆 Open Full Leaderboard', web_app: { url: `${appUrl}?tab=leaderboard` } }]],
        },
      };
    }

    case '/wallet': {
      const ctz = balanceRow ? balanceRow.ctz_balance.toLocaleString() : '0';
      return {
        text: `💳 *CTZ Wallet & Rewards*\n\n` +
          `• *Available Balance:* \`${ctz} CTZ\`\n` +
          `• *Asset Class:* In-App Point / Reward Unit (Version 1)\n\n` +
          `Withdrawals are processed through manual verification in Binance Pay, USDT, or TON address once you hit minimum threshold (5,000 CTZ).`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '💳 Manage Wallet', web_app: { url: `${appUrl}?tab=wallet` } }]],
        },
      };
    }

    case '/support': {
      return {
        text: `💬 *CTZ Official Support*\n\nNeed assistance with account, tasks, or withdrawals?\n\n• *Support Representative:* ${supportUsername}\n• *Community Channel:* ${communityUrl}\n\nOur team typically responds within 2-4 hours.`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💬 Contact Support', url: `https://t.me/${supportUsername.replace('@', '')}` }],
            [{ text: '📢 Join Community', url: communityUrl }],
          ],
        },
      };
    }

    case '/help':
    default: {
      return {
        text: `📚 *CTZ BOT Guide & Commands*\n\n` +
          `*Commands:*\n` +
          `/start - Welcome & main dashboard\n` +
          `/app - Quick launch Telegram Mini App\n` +
          `/balance - Check your CTZ Coins & energy\n` +
          `/referral - Your referral link & friends stats\n` +
          `/tasks - View available earning missions\n` +
          `/leaderboard - Global top miners\n` +
          `/wallet - Manage CTZ and request withdrawal\n` +
          `/support - Official support team\n\n` +
          `💡 *How to Earn:* Tap the CTZ core, maintain your 7-day streak, complete tasks, and invite allies!`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🚀 OPEN CTZ BOT', web_app: { url: appUrl } }]],
        },
      };
    }
  }
}
