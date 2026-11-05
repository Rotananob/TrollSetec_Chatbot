// Client-side Rate Limiter Helper
// Safely resets any old lockouts and allows legitimate users to chat freely

export function getDeviceId() {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('troll_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('troll_device_id', deviceId);
  }
  return deviceId;
}

export function resetClientRateLimit() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('troll_chat_timestamps');
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('troll_rate_') || k.includes('timestamp'))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}

// Client-side rate check: Max 7 messages per 1 minute window (prevents spam and triggers modal)
let lastSendTimestamp = 0;
let inMemoryTimestamps = [];

export function checkClientRateLimit() {
  if (typeof window === 'undefined') return { allowed: true };
  const now = Date.now();

  // Rapid double-tap debounce (prevent sending 2 messages within 350ms)
  if (now - lastSendTimestamp < 350) {
    return {
      allowed: false,
      retryAfter: 1,
      message: 'សូមកុំចុចបញ្ជូនញាប់ពេក!'
    };
  }

  // Sliding 60-second window: check if user sent > 7 messages in 1 minute
  inMemoryTimestamps = inMemoryTimestamps.filter((t) => now - t < 60000);
  if (inMemoryTimestamps.length >= 7) {
    const oldest = inMemoryTimestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + 60000 - now) / 1000));
    return {
      allowed: false,
      retryAfter,
      message: 'ប្រព័ន្ធបានចាប់សកម្មភាពថាអ្នកកំពុងព្យាយាមផ្ញើសារច្រើនដងក្នុងមួយនាទី!'
    };
  }

  lastSendTimestamp = now;
  inMemoryTimestamps.push(now);

  // Clean up any stale legacy keys from old versions
  resetClientRateLimit();

  return { allowed: true };
}
