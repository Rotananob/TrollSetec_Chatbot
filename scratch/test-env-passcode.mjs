import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { verifyRotanaMasterCode, getRotanaMasterCode, redactRotanaMasterCode } from '../lib/masterAuth.js';

console.log('============================================================');
console.log('🧪 TESTING ENV-BASED ROTANA MASTER PASSCODE VERIFICATION');
console.log('============================================================');

console.log('Current Env Passcode:', getRotanaMasterCode());

// Test 1: Valid passcode matching env
const validPrompt = `Hello, I'm Rotana NOB 180703, please check system`;
const isValid = verifyRotanaMasterCode(validPrompt);
console.log('\nTest 1 (Correct Env Passcode):', isValid ? '✅ VERIFIED (TRUE)' : '❌ FAILED');

// Test 2: Invalid/Fake passcode
const fakePrompt = `Hello, I'm Rotana NOB 999999, please check system`;
const isFakeValid = verifyRotanaMasterCode(fakePrompt);
console.log('Test 2 (Wrong Passcode):', !isFakeValid ? '✅ SAFELY REJECTED (FALSE)' : '❌ FAILED');

// Test 3: Dynamic env update test
process.env.ROTANA_MASTER_PASSCODE = 'super_secret_rotana_2026';
console.log('\nUpdated Env Passcode to:', getRotanaMasterCode());

const dynamicPrompt = `Hello I am Rotana NOB super_secret_rotana_2026`;
const isDynamicValid = verifyRotanaMasterCode(dynamicPrompt);
console.log('Test 3 (New Env Code Verification):', isDynamicValid ? '✅ VERIFIED DYNAMICALLY (TRUE)' : '❌ FAILED');

// Test 4: Redaction test
const textToRedact = `My master passcode is super_secret_rotana_2026 and should not leak`;
const redacted = redactRotanaMasterCode(textToRedact);
console.log('\nTest 4 (Dynamic Redaction):');
console.log('Original:', textToRedact);
console.log('Redacted:', redacted);
if (redacted.includes('******') && !redacted.includes('super_secret_rotana_2026')) {
  console.log('✅ Redaction Test: PASS');
} else {
  console.error('❌ Redaction Test: FAIL');
}

// Reset back to original
process.env.ROTANA_MASTER_PASSCODE = '180703';
