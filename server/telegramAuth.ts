import crypto from 'node:crypto';

export interface TelegramUserData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface ParsedInitData {
  query_id?: string;
  user: TelegramUserData;
  auth_date: number;
  hash: string;
  start_param?: string;
}

/**
 * Validates Telegram WebApp initData string using Telegram's official HMAC-SHA256 algorithm.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(
  initDataRaw: string,
  botToken: string
): { isValid: boolean; user?: TelegramUserData; startParam?: string; error?: string } {
  if (!initDataRaw) {
    return { isValid: false, error: 'Empty initData' };
  }

  try {
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) {
      return { isValid: false, error: 'Missing hash parameter' };
    }

    // Extract and parse user payload
    const userJson = params.get('user');
    if (!userJson) {
      return { isValid: false, error: 'Missing user object' };
    }

    const user: TelegramUserData = JSON.parse(userJson);
    const startParam = params.get('start_param') || undefined;

    // In dev / preview environment where no bot token is set, allow preview
    if (!botToken || botToken.includes('123456789:ABCdef') || botToken === 'MY_BOT_TOKEN') {
      return { isValid: true, user, startParam };
    }

    // Telegram HMAC verification
    // 1. Sort all params alphabetically, excluding 'hash'
    const sortedEntries: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') {
        sortedEntries.push(`${key}=${value}`);
      }
    });
    sortedEntries.sort();
    const dataCheckString = sortedEntries.join('\n');

    // 2. secret_key = HMAC_SHA256("WebAppData", bot_token)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

    // 3. signature = HMAC_SHA256(secret_key, dataCheckString)
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    // 4. Constant-time comparison
    const hashBuffer = Buffer.from(hash, 'hex');
    const calcBuffer = Buffer.from(calculatedHash, 'hex');

    if (hashBuffer.length !== calcBuffer.length || !crypto.timingSafeEqual(hashBuffer, calcBuffer)) {
      return { isValid: false, error: 'Invalid HMAC signature' };
    }

    // 5. Check expiration (e.g. 24 hours)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (authDate && now - authDate > 86400 * 2) {
      return { isValid: false, error: 'initData expired (older than 48h)' };
    }

    return { isValid: true, user, startParam };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Failed to parse initData' };
  }
}
