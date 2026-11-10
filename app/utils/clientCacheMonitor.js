'use client';

// Helper to calculate string size in bytes
function getStringBytes(str) {
  if (!str) return 0;
  return new Blob([str]).size;
}

// Keys that must NEVER be deleted during cache cleanup
const PROTECTED_PREFIXES = [
  'chatbot_username',
  'chatbot_user_age',
  'chatbot_gender',
  'chatbot_avatar',
  'chatbot_theme',
  'troll_savage_level',
  'troll_audio_speed',
  'setec_live_chat_session',
  'troll_rotana_bypass',
  'troll_rotana_master',
  'setec_bypass_device',
  'troll_device_id',
  'rotana_admin_passcode',
  'rotana_admin_remember',
  'setec_tts_disabled',
  'setec_chat_backup'
];

function isProtectedKey(key) {
  if (!key) return true;
  return PROTECTED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

// Measure storage metrics across localStorage and sessionStorage
export function getStorageMetrics() {
  if (typeof window === 'undefined') {
    return {
      totalBytes: 0,
      totalMB: '0.00',
      audioBytes: 0,
      audioMB: '0.00',
      audioCount: 0,
      percentUsed: 0,
      isNearFull: false,
      isCritical: false
    };
  }

  let totalBytes = 0;
  let audioBytes = 0;
  let audioCount = 0;

  try {
    // 1. Measure sessionStorage (where voice base64 clips live)
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      const val = sessionStorage.getItem(key) || '';
      const bytes = getStringBytes(key) + getStringBytes(val);
      totalBytes += bytes;

      if (key.startsWith('troll_audio_') || key.startsWith('audio_cache_')) {
        audioBytes += bytes;
        if (!key.includes('_mime_') && !key.includes('_fallback_')) {
          audioCount++;
        }
      }
    }
  } catch {}

  try {
    // 2. Measure localStorage (where metadata and temporary items live)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) || '';
      const bytes = getStringBytes(key) + getStringBytes(val);
      totalBytes += bytes;

      if (key.includes('_audio_')) {
        audioBytes += bytes;
        audioCount++;
      }
    }
  } catch {}

  // Typical mobile / desktop browser storage quota is ~5MB (5242880 bytes) per origin
  const ESTIMATED_MAX_BYTES = 5 * 1024 * 1024;
  const percentUsed = Math.min(100, Math.round((totalBytes / ESTIMATED_MAX_BYTES) * 100));

  // Thresholds:
  // Near full if audioCount >= 8, or total storage >= 2.2MB, or percentUsed >= 45%
  // Critical if audioCount >= 14, or total storage >= 3.8MB, or percentUsed >= 75%
  const isNearFull = audioCount >= 8 || totalBytes >= 2.2 * 1024 * 1024 || percentUsed >= 45;
  const isCritical = audioCount >= 14 || totalBytes >= 3.8 * 1024 * 1024 || percentUsed >= 75;

  return {
    totalBytes,
    totalMB: (totalBytes / (1024 * 1024)).toFixed(2),
    audioBytes,
    audioMB: (audioBytes / (1024 * 1024)).toFixed(2),
    audioCount,
    percentUsed,
    isNearFull,
    isCritical
  };
}

const DISMISS_COOLDOWN_KEY = 'setec_cache_warning_dismissed_at';

// Check if automatic warning modal should pop up
export function shouldShowCacheWarning() {
  if (typeof window === 'undefined') return false;

  const metrics = getStorageMetrics();
  if (!metrics.isNearFull) return false;

  // If critical, always show
  if (metrics.isCritical) return true;

  // Otherwise respect cooldown: don't annoy user within 20 minutes of dismissing
  try {
    const lastDismissed = parseInt(localStorage.getItem(DISMISS_COOLDOWN_KEY) || '0', 10);
    const now = Date.now();
    const twentyMinutes = 20 * 60 * 1000;
    if (lastDismissed && now - lastDismissed < twentyMinutes) {
      return false;
    }
  } catch {}

  return true;
}

// Record dismissal time so popup won't badger the user continuously
export function recordCacheWarningDismissed() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISMISS_COOLDOWN_KEY, String(Date.now()));
  } catch {}
}

// Safely clear old audio and temporary caches while preserving user profile & chat history
export function clearOldClientCache() {
  if (typeof window === 'undefined') {
    return { freedBytes: 0, freedMB: '0.00', cleanedCount: 0 };
  }

  let freedBytes = 0;
  let cleanedCount = 0;

  // 1. Purge sessionStorage audio keys
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('troll_audio_') ||
        key.startsWith('audio_cache_') ||
        key.startsWith('temp_') ||
        key.startsWith('cached_voice_')
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      const val = sessionStorage.getItem(key) || '';
      freedBytes += getStringBytes(key) + getStringBytes(val);
      if (!key.includes('_mime_') && !key.includes('_fallback_')) {
        cleanedCount++;
      }
      sessionStorage.removeItem(key);
    });
  } catch {}

  // 2. Purge non-protected temporary audio keys in localStorage
  try {
    const localKeysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        (key.includes('_audio_') || key.startsWith('konpov_audio_') || key.startsWith('konbong_audio_') || key.startsWith('konkandal_audio_')) &&
        !isProtectedKey(key)
      ) {
        localKeysToRemove.push(key);
      }
    }

    localKeysToRemove.forEach((key) => {
      const val = localStorage.getItem(key) || '';
      freedBytes += getStringBytes(key) + getStringBytes(val);
      cleanedCount++;
      localStorage.removeItem(key);
    });
  } catch {}

  // 3. Clear window ServiceWorker / CacheStorage entries
  if ('caches' in window) {
    try {
      window.caches.keys().then((keys) => {
        keys.forEach((k) => window.caches.delete(k));
      }).catch(() => {});
    } catch {}
  }

  // Clear dismissal lock so system resets clean
  try {
    localStorage.removeItem(DISMISS_COOLDOWN_KEY);
  } catch {}

  return {
    freedBytes,
    freedMB: (freedBytes / (1024 * 1024)).toFixed(2),
    cleanedCount
  };
}
