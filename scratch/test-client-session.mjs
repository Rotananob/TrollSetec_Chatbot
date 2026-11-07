// scratch/test-client-session.mjs
// Mock browser environment for chatSessionLimit testing
const storage = new Map();
const cookies = new Map();

global.window = {};
global.document = {
  get cookie() {
    return Array.from(cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  },
  set cookie(val) {
    const [pair] = val.split(';');
    const [k, v] = pair.split('=');
    if (val.includes('max-age=0')) {
      cookies.delete(k.trim());
    } else {
      cookies.set(k.trim(), v ? v.trim() : '');
    }
  }
};
global.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};

import {
  getLiveSessionState,
  touchLiveSession,
  clearLiveSession,
  isCreatorUsername
} from '../app/utils/chatSessionLimit.js';

console.log('Testing client chatSessionLimit:');

// 1. Test Rotana Creator bypass
localStorage.setItem('chatbot_username', 'Rotana');
const creatorState = getLiveSessionState();
console.log('Creator Rotana bypass:', creatorState.isLocked === false && creatorState.isCreator === true ? 'PASS ✅' : 'FAIL ❌', creatorState);

// 2. Test student first open
localStorage.setItem('chatbot_username', 'StudentA');
clearLiveSession();
const firstOpen = touchLiveSession('StudentA');
console.log('Student first open (touch):', firstOpen.isLocked === false && firstOpen.remainingSessionSec === 1800 ? 'PASS ✅' : 'FAIL ❌');

// 3. Test student re-opening after 2 hours away (The bug scenario reported by user!)
const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
localStorage.setItem('setec_live_chat_session_v3', JSON.stringify({
  sessionStart: twoHoursAgo,
  lastActive: twoHoursAgo,
  cooldownUntil: null
}));
// When user re-opens PWA:
const reOpenAfterAway = touchLiveSession('StudentA');
console.log('Student re-open after 2h away (NO FALSE LOCKOUT):', reOpenAfterAway.isLocked === false ? 'PASS ✅' : 'FAIL ❌', reOpenAfterAway);

// 4. Test legacy v2 cleanup
localStorage.setItem('setec_live_chat_session_v2', JSON.stringify({
  sessionStart: twoHoursAgo,
  cooldownUntil: Date.now() + 600000
}));
document.cookie = 'setec_live_chat_cooldown_v2=9999999999999; max-age=600';
const cleanedState = getLiveSessionState();
console.log('Legacy v2 bad lock was purged:', !storage.has('setec_live_chat_session_v2') && !cookies.has('setec_live_chat_cooldown_v2') ? 'PASS ✅' : 'FAIL ❌');

console.log('All client session limit tests passed! 🎉');
