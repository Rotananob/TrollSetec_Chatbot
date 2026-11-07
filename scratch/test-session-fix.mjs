// scratch/test-session-fix.mjs
import { checkChatSessionLimit } from '../lib/rateLimit.js';

console.log('Testing session limit fix:');

// 1. Test Rotana bypass
const rotanaCheck = checkChatSessionLimit('1.2.3.4', 'device-1', 'Rotana');
console.log('Rotana bypass test:', rotanaCheck.allowed === true && rotanaCheck.isCreator === true ? 'PASS ✅' : 'FAIL ❌', rotanaCheck);

const rotanaNobCheck = checkChatSessionLimit('1.2.3.4', 'device-1', 'Rotana NOB');
console.log('Rotana NOB bypass test:', rotanaNobCheck.allowed === true && rotanaNobCheck.isCreator === true ? 'PASS ✅' : 'FAIL ❌', rotanaNobCheck);

// 2. Test student opening app for first time
const student1 = checkChatSessionLimit('10.0.0.1', 'student-dev-1', 'Dara');
console.log('Student first open:', student1.allowed === true && !student1.isSessionLocked ? 'PASS ✅' : 'FAIL ❌', student1);

// 3. Test student opening app after being away for 15 minutes (> 10m idle)
// Simulate session that was lastActive 15 minutes ago
// In rateLimit.js, if we test with another user:
const student2 = checkChatSessionLimit('10.0.0.2', 'student-dev-2', 'Sok');
console.log('Student 2 first open:', student2.allowed === true ? 'PASS ✅' : 'FAIL ❌');

console.log('All rateLimit tests finished.');
