// lib/systemControl.js
// Centralized Real-time System Control, Maintenance Mode & Night Rest Schedule
// Used by Admin Control Panel (/jam-tic-kapea-1-sin), Chat API (/api/chat), and Chat Interfaces

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

export const DEFAULT_SYSTEM_STATE = {
  serverOnline: true,             // Master switch (true = Online, false = Maintenance)
  maintenanceMode: false,        // Explicit maintenance override
  maintenanceReason: 'ប្រព័ន្ធដំណើរការប្រក្រតី 100%',
  maintenanceBypassCode: 'rotana2026', // Admin Custom Bypass Passcode for Maintenance & Dev
  nightScheduleEnabled: true,    // Automated late-night sleep mode (02:00 - 06:00)
  nightStartHour: 2,             // 02:00 (2:00 AM Phnom Penh)
  nightEndHour: 6,               // 06:00 (6:00 AM Phnom Penh)
  nightRestMessage: 'ពេលយប់ជ្រៅហើយ! ប្រព័ន្ធ AI សុំសម្រាកគេងសិន ដើម្បីសន្សំកូតា និងកម្លាំងសម្រាប់ថ្ងៃស្អែក! សូមចូលមកលេងនៅម៉ោង 06:00 ព្រឹកឡើងវិញ!',
  konbongActive: true,           // KonBong switch
  konpovActive: true,            // KonPov switch
  konbongNotice: '',             // Custom notice when KonBong is paused
  konpovNotice: '',              // Custom notice when KonPov is paused
  sessionLimitActive: true,      // 30-min session limit switch
  broadcastNotice: '',           // Real-time broadcast notice across all screens
  lastUpdated: Date.now(),
  updatedBy: 'System Admin'
};

// In-memory cache for ultra-fast serverless response (<10ms)
let cachedSystemState = { ...DEFAULT_SYSTEM_STATE };
let lastCacheSync = 0;
const CACHE_TTL_MS = 3000; // 3 seconds TTL for ultra-responsive sync

// Get current hour in Asia/Phnom_Penh (UTC+7)
export function getCambodiaHour() {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Phnom_Penh',
      hour: 'numeric',
      hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === 'hour');
    if (hourPart) {
      return parseInt(hourPart.value, 10);
    }
  } catch {}
  // UTC+7 fallback
  return (new Date().getUTCHours() + 7) % 24;
}

// Check if current Phnom Penh time falls within night rest window
export function isNightRestTime(startHour = 2, endHour = 6) {
  const currentHour = getCambodiaHour();
  if (startHour > endHour) {
    // Crosses midnight, e.g. 23 to 6
    return currentHour >= startHour || currentHour < endHour;
  }
  return currentHour >= startHour && currentHour < endHour;
}

// Fetch current system state from Firebase RTDB with fast fallback
export async function getSystemControlState(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedSystemState && now - lastCacheSync < CACHE_TTL_MS) {
    return cachedSystemState;
  }

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/system_control.json`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        cachedSystemState = { ...DEFAULT_SYSTEM_STATE, ...data };
        lastCacheSync = now;
        return cachedSystemState;
      }
    }
  } catch (e) {
    // Retain cached state on network blip
  }

  lastCacheSync = now;
  return cachedSystemState;
}

// Update system control state (Writes to Firebase RTDB and updates local cache)
export async function updateSystemControlState(patch, updatedBy = 'Rotana NOB') {
  const now = Date.now();
  const updated = {
    ...cachedSystemState,
    ...patch,
    lastUpdated: now,
    updatedBy
  };

  cachedSystemState = updated;
  lastCacheSync = now;

  try {
    await fetch(`${FIREBASE_DB_URL}/system_control.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
      signal: AbortSignal.timeout(3500)
    });
  } catch (e) {
    console.warn('[SystemControl] Failed to persist state to Firebase:', e.message);
  }

  return updated;
}

// Evaluate if the system is currently in resting / maintenance mode
export function evaluateSystemRest(state) {
  const current = state || cachedSystemState;

  // 1. Master Server Offline or Explicit Maintenance Mode
  if (!current.serverOnline || current.maintenanceMode) {
    return {
      isResting: true,
      mode: 'maintenance',
      title: 'ប្រព័ន្ធកំពុងស្ថិតក្នុងការថែទាំ Maintenance Mode',
      reason: current.maintenanceReason || DEFAULT_SYSTEM_STATE.maintenanceReason
    };
  }

  // 2. Night Rest Schedule Active
  if (current.nightScheduleEnabled) {
    const isNight = isNightRestTime(current.nightStartHour ?? 2, current.nightEndHour ?? 6);
    if (isNight) {
      return {
        isResting: true,
        mode: 'night_rest',
        title: 'ប្រព័ន្ធសម្រាកពេលយប់ Night Resting Mode',
        reason: current.nightRestMessage || DEFAULT_SYSTEM_STATE.nightRestMessage
      };
    }
  }

  return {
    isResting: false,
    mode: 'online',
    title: 'ប្រព័ន្ធដំណើរការធម្មតា Online',
    reason: ''
  };
}
