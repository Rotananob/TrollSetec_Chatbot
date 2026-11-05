// Client-side Anti-Spam Rate Limiter
// Enforces generous human-friendly limits tracked strictly per username (never locking the device permanently)

export function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('troll_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('troll_device_id', deviceId);
  }
  return deviceId;
}

// Reset rate limits when user exits or changes their name
export function resetClientRateLimit(username = '') {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('troll_chat_timestamps');
    if (username) {
      localStorage.removeItem(`troll_rate_${username.trim().toLowerCase()}`);
    }
    // Also clean up any legacy rate limit keys
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('troll_rate_')) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}

export function checkClientRateLimit(username = '') {
  if (typeof window === 'undefined') return { allowed: true };
  const now = Date.now();
  const WINDOW_MS = 60 * 1000; // 60 seconds
  const MAX_LIMIT = 25;        // 25 messages per minute per username

  const cleanName = (username || '').trim().toLowerCase() || 'default_user';
  const storageKey = `troll_rate_${cleanName}`;

  let timestamps = [];
  try {
    timestamps = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(timestamps)) timestamps = [];
  } catch {
    timestamps = [];
  }

  // Filter timestamps within the last 60 seconds
  timestamps = timestamps.filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_LIMIT) {
    const oldest = timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return {
      allowed: false,
      retryAfter,
      message: `ប្រព័ន្ធសុវត្ថិភាព Anti-Spam:\nឈ្មោះ "${username || cleanName}" បានផ្ញើសារញឹកញាប់ពេក (លើសពី ២៥ សារក្នុង ១ នាទី)!\nសូមរង់ចាំ ${retryAfter} វិនាទី ឬប្ដូរឈ្មោះដើម្បីបន្តឆាត។`
    };
  }

  timestamps.push(now);
  try {
    localStorage.setItem(storageKey, JSON.stringify(timestamps));
  } catch {}
  return { allowed: true };
}
