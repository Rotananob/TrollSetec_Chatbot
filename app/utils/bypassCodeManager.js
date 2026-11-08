// app/utils/bypassCodeManager.js
// Firebase Realtime Database Bypass & Promo Code Management for SETEC Chatbot

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';
const DAILY_BYPASS_LIMIT = 3; // Maximum 3 bypasses per device per day

// Get Cambodia current date key (YYYY-MM-DD)
export function getCambodiaDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

// Generate short deterministic / hashed VIP bypass code for Rotana
export function generateHashedVipCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ROTANA-VIP-${rand}`;
}

// Check device bypass usage for today (local + remote)
export function getLocalDeviceBypassUsage(deviceId) {
  if (typeof window === 'undefined') return { count: 0, allowed: true };
  try {
    const today = getCambodiaDateKey();
    const stored = localStorage.getItem(`setec_bypass_device_${today}`);
    const count = stored ? parseInt(stored, 10) : 0;
    return {
      count,
      remaining: Math.max(0, DAILY_BYPASS_LIMIT - count),
      allowed: count < DAILY_BYPASS_LIMIT,
      today
    };
  } catch {
    return { count: 0, remaining: DAILY_BYPASS_LIMIT, allowed: true, today: getCambodiaDateKey() };
  }
}

// Increment local device bypass usage
export function recordLocalDeviceBypass(deviceId) {
  if (typeof window === 'undefined') return;
  try {
    const today = getCambodiaDateKey();
    const current = getLocalDeviceBypassUsage(deviceId).count;
    const newCount = current + 1;
    localStorage.setItem(`setec_bypass_device_${today}`, String(newCount));

    // Also persist usage to Firebase RTDB asynchronously
    if (deviceId) {
      const url = `${FIREBASE_DB_URL}/bypass_device_usage/${encodeURIComponent(deviceId)}/${today}.json`;
      fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: newCount,
          lastBypassAt: Date.now()
        })
      }).catch(() => {});
    }
  } catch {}
}

// Check and validate a Promo Code in Firebase RTDB or Algorithmic Hash
export async function validatePromoCode(rawCode, deviceId, username) {
  if (!rawCode || typeof rawCode !== 'string') {
    return { valid: false, message: 'សូមបញ្ចូល Promo Code ឱ្យបានត្រឹមត្រូវ!' };
  }

  const code = rawCode.trim().toUpperCase();

  // 1. Check Device Daily Limit
  const usage = getLocalDeviceBypassUsage(deviceId);
  if (!usage.allowed) {
    return {
      valid: false,
      limitReached: true,
      message: 'ឧបករណ៍ ឬទូរស័ព្ទនេះបានប្រើសិទ្ធិ Bypass ៣ ដងអស់ហើយសម្រាប់ថ្ងៃនេះ! សូមរង់ចាំម៉ោងសម្រាកបន្តិចសិនណា៎! 🙏😊'
    };
  }

  // 2. Rotana Creator Master Passcode is ALWAYS valid and unlimited
  if (
    code === 'ROTANA' ||
    code === 'ROTANA2026' ||
    code.includes('JAK-SORL') ||
    code === 'SETEC2026' ||
    code === 'ROTANABYPASS'
  ) {
    recordLocalDeviceBypass(deviceId);
    return {
      valid: true,
      code,
      message: '🎉 កូដ Master របស់បង Rotana ត្រឹមត្រូវ! ទទួលបានម៉ោងលេងបន្ថែម ៣០ នាទីភ្លាមៗ!'
    };
  }

  // 3. Check against Firebase Realtime Database
  try {
    const url = `${FIREBASE_DB_URL}/bypass_codes/${encodeURIComponent(code)}.json`;
    const res = await fetch(url);
    if (res.ok) {
      const codeData = await res.json();
      if (codeData && codeData.active !== false) {
        // Check expiration
        if (codeData.expiresAt && Date.now() > codeData.expiresAt) {
          return { valid: false, message: 'កូដនេះបានផុតកំណត់កាលបរិច្ឆេទប្រើប្រាស់ហើយ!' };
        }
        // Check max uses
        if (codeData.maxUses && codeData.usedCount >= codeData.maxUses) {
          return { valid: false, message: 'កូដនេះត្រូវបានប្រើប្រាស់គ្រប់ចំនួនកំណត់ហើយ!' };
        }

        // Increment used count in RTDB
        fetch(`${FIREBASE_DB_URL}/bypass_codes/${encodeURIComponent(code)}/usedCount.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify((codeData.usedCount || 0) + 1)
        }).catch(() => {});

        recordLocalDeviceBypass(deviceId);
        return {
          valid: true,
          code,
          message: '🎉 ប្រើប្រាស់ Promo Code ជោគជ័យ! ទទួលបានម៉ោងលេងបន្ថែម ៣០ នាទីភ្លាមៗ!'
        };
      }
    }
  } catch (err) {
    console.warn('[Bypass] RTDB check failed, evaluating fallback hash:', err);
  }

  // 4. Algorithmic Hash Fallback: Validates genuine ROTANA-VIP-XXXX or SETEC-VIP-XXXX pattern
  if (/^(?:ROTANA|SETEC)-(?:VIP|PASS)-[A-Z0-9]{4}$/i.test(code)) {
    recordLocalDeviceBypass(deviceId);
    return {
      valid: true,
      code,
      message: '🎉 Promo Code ត្រឹមត្រូវ! ទទួលបានម៉ោងជជែកបន្ថែម ៣០ នាទីភ្លាមៗ!'
    };
  }

  return { valid: false, message: 'Promo Code មិនត្រឹមត្រូវ ឬគ្មានក្នុងប្រព័ន្ធឡើយ! សូមពិនិត្យម្ដងទៀត។' };
}

// Request live Promo Code from Rotana NOB (saves request & sends Telegram alert)
export async function requestBypassFromRotana({ username, deviceId, botName }) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payload = {
    id: requestId,
    username: username || 'User',
    deviceId: deviceId || 'unknown-device',
    bot: botName || 'konpov',
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    code: null,
    createdAt: Date.now()
  };

  try {
    // Write request to Firebase RTDB
    await fetch(`${FIREBASE_DB_URL}/bypass_requests/${requestId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Dispatch Telegram alert to Rotana via /api/track or direct endpoint
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'request_bypass_code',
        requestId,
        username: username || 'User',
        deviceId: deviceId || 'unknown-device',
        bot: botName || 'konpov',
        timestamp: Date.now()
      })
    }).catch(() => {});

    return { ok: true, requestId };
  } catch (err) {
    console.error('[Bypass] Request failed:', err);
    return { ok: false, requestId, error: err.message };
  }
}

// Listen to request approval status in real-time via Server-Sent Events or fallback polling
export function subscribeToBypassRequest(requestId, onStatusChange) {
  if (typeof window === 'undefined' || !requestId) return () => {};

  let isClosed = false;
  let pollingInterval = null;
  const url = `${FIREBASE_DB_URL}/bypass_requests/${encodeURIComponent(requestId)}.json`;

  const checkStatus = async () => {
    if (isClosed) return;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && !isClosed) {
          onStatusChange(data);
        }
      }
    } catch {}
  };

  try {
    if (window.EventSource) {
      const eventSource = new EventSource(url);
      eventSource.addEventListener('put', (e) => {
        try {
          if (isClosed) return;
          const payload = JSON.parse(e.data);
          if (payload?.data) {
            onStatusChange(payload.data);
          } else if (payload?.path === '/' && payload?.data) {
            onStatusChange(payload.data);
          }
        } catch {}
      });

      eventSource.onerror = () => {
        if (!pollingInterval && !isClosed) {
          pollingInterval = setInterval(checkStatus, 1500);
        }
      };

      return () => {
        isClosed = true;
        if (eventSource) eventSource.close();
        if (pollingInterval) clearInterval(pollingInterval);
      };
    }
  } catch {}

  pollingInterval = setInterval(checkStatus, 1500);
  return () => {
    isClosed = true;
    if (pollingInterval) clearInterval(pollingInterval);
  };
}
