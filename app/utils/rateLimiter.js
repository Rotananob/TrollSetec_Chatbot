// Client-side Anti-Spam / Anti-DDoS Rate Limiter
// Enforces max 5 chat requests per device in 1 minute (60 seconds)

export function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('troll_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    localStorage.setItem('troll_device_id', deviceId);
  }
  return deviceId;
}

export function checkClientRateLimit() {
  if (typeof window === 'undefined') return { allowed: true };
  const now = Date.now();
  const WINDOW_MS = 60 * 1000; // 60 seconds
  const MAX_LIMIT = 5;

  let timestamps = [];
  try {
    timestamps = JSON.parse(localStorage.getItem('troll_chat_timestamps') || '[]');
    if (!Array.isArray(timestamps)) timestamps = [];
  } catch {
    timestamps = [];
  }

  // Filter timestamps within the last 60 seconds
  timestamps = timestamps.filter(t => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_LIMIT) {
    const oldest = timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return {
      allowed: false,
      retryAfter,
      message: `ប្រព័ន្ធសុវត្ថិភាព Anti-Spam / Anti-DDoS:\nឧបករណ៍របស់អ្នកបានផ្ញើសារលើសពី ៥ ដងក្នុង ១ នាទី!\nសូមរង់ចាំ ${retryAfter} វិនាទីទៀតមុនពេលឆាតបន្ត ដើម្បីការពារ Server ពីការ Spam។`
    };
  }

  timestamps.push(now);
  localStorage.setItem('troll_chat_timestamps', JSON.stringify(timestamps));
  return { allowed: true };
}
