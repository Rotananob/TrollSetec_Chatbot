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

// Client-side rate check: allows normal chatting freely and only debounces double clicks
let lastSendTimestamp = 0;

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
  lastSendTimestamp = now;

  // Clean up any stale legacy keys from old versions
  resetClientRateLimit();

  return { allowed: true };
}
