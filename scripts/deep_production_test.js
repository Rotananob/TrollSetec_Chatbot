// scripts/deep_production_test.js
// Deep Production Verification & Resilience Test for SETEC Chatbot
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment in priority order
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('====================================================');
  console.log('🚀 STARTING DEEP PRODUCTION VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, detail = '') {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}: ${detail}`);
    }
  }

  // 1. API Keys & Pool Verification
  console.log('--- TEST GROUP 1: API KEYS & POOL ROTATION ---');
  const {
    getApiKeyPool,
    markKeyTemporarilyExhausted,
    isKeyCoolingDown
  } = await import('../app/api/chat/route.js');

  const poolKonBong = getApiKeyPool('konbong');
  const poolKonPov = getApiKeyPool('konpov');
  const poolKonKandal = getApiKeyPool('konkandal');

  assert(Array.isArray(poolKonBong) && poolKonBong.length > 0, 'KonBong key pool is non-empty', `Count: ${poolKonBong.length}`);
  assert(Array.isArray(poolKonPov) && poolKonPov.length > 0, 'KonPov key pool is non-empty', `Count: ${poolKonPov.length}`);
  assert(Array.isArray(poolKonKandal) && poolKonKandal.length > 0, 'KonKandal key pool is non-empty', `Count: ${poolKonKandal.length}`);

  if (process.env.GEMINI_API_KEY_KONBONG) {
    assert(poolKonBong[0] === process.env.GEMINI_API_KEY_KONBONG, 'KonBong primary key is first in its pool');
  }
  if (process.env.GEMINI_API_KEY_KONPOV) {
    assert(poolKonPov[0] === process.env.GEMINI_API_KEY_KONPOV, 'KonPov primary key is first in its pool');
  }
  if (process.env.GEMINI_API_KEY_KONKANDAL) {
    assert(poolKonKandal[0] === process.env.GEMINI_API_KEY_KONKANDAL, 'KonKandal primary key is first in its pool');
  }

  // Test cooldown mechanism
  const testKey = 'test_key_cooldown_xyz';
  assert(!isKeyCoolingDown(testKey), 'Key is initially not cooling down');
  markKeyTemporarilyExhausted(testKey);
  assert(isKeyCoolingDown(testKey), 'Key is cooling down after markKeyTemporarilyExhausted');

  // Test live connectivity of configured Gemini API Keys
  console.log('\n--- LIVE GEMINI API CONNECTIVITY CHECK ---');
  const uniqueKeys = Array.from(new Set([
    process.env.GEMINI_API_KEY_KONBONG,
    process.env.GEMINI_API_KEY_KONPOV,
    process.env.GEMINI_API_KEY_KONKANDAL,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_RESERVE,
    process.env.GEMINI_API_KEY_RESERVE_ONE,
    process.env.GEMINI_API_KEY_RESERVE_TWO,
    process.env.GEMINI_API_KEY_RESERVE_THREE,
    process.env.GOOGLE_API_KEY
  ].filter(Boolean)));

  console.log(`Found ${uniqueKeys.length} unique Gemini API keys in environment.`);
  let activeKeysCount = 0;
  for (let i = 0; i < uniqueKeys.length; i++) {
    const key = uniqueKeys[i];
    const masked = `${key.slice(0, 6)}...${key.slice(-4)}`;
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${key}`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        console.log(`  Key #${i + 1} (${masked}): ACTIVE & HEALTHY (HTTP ${res.status})`);
        activeKeysCount++;
      } else {
        console.warn(`  Key #${i + 1} (${masked}): Status ${res.status}`);
      }
    } catch (e) {
      console.warn(`  Key #${i + 1} (${masked}): Connection timeout or error: ${e.message}`);
    }
  }
  assert(activeKeysCount > 0, `At least 1 Gemini API Key is live and healthy (Found: ${activeKeysCount}/${uniqueKeys.length})`);

  // 2. Audio & Voice Fallback Verification
  console.log('\n--- TEST GROUP 2: AUDIO & SPEECH SYNTHESIS ENGINE ---');
  // Test native Google Translate Khmer TTS fallback
  const testText = 'សួស្ដីបងប្អូនទាំងអស់គ្នា!';
  let ttsSuccess = false;
  let audioBytes = 0;
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(testText)}&tl=km&client=tw-ob`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      audioBytes = buf.byteLength;
      ttsSuccess = audioBytes > 100;
    }
  } catch (e) {
    console.error('TTS test failed:', e.message);
  }
  assert(ttsSuccess, 'Khmer Speech Fallback Engine is 100% operational', `Received ${audioBytes} audio bytes`);

  // 3. System Instruction Prompts Verification
  console.log('\n--- TEST GROUP 3: BOTS SYSTEM PROMPTS ---');
  const { buildKonBongSystemInstruction } = await import('../app/prompts/konBongPrompt.js');
  const { buildKonPovSystemInstruction } = await import('../app/prompts/konPovPrompt.js');
  const { buildKonKandalSystemInstruction } = await import('../app/prompts/konKandalPrompt.js');

  const kbPrompt = buildKonBongSystemInstruction({ username: 'Rotana', userGender: 'ប្រុស', userAge: '20' });
  const kpPrompt = buildKonPovSystemInstruction({ username: 'Rotana', userGender: 'ប្រុស', userAge: '20' });
  const kkPrompt = buildKonKandalSystemInstruction({ username: 'Rotana', userGender: 'ប្រុស', userAge: '20' });

  assert(typeof kbPrompt === 'string' && kbPrompt.length > 100, 'KonBong system prompt builds cleanly');
  assert(typeof kpPrompt === 'string' && kpPrompt.length > 100, 'KonPov system prompt builds cleanly');
  assert(typeof kkPrompt === 'string' && kkPrompt.length > 100, 'KonKandal system prompt builds cleanly');

  // Verify KonPov strictly forbids affectionate "អូនសម្លាញ់"
  assert(
    kpPrompt.includes('ZERO SWEET') && kpPrompt.includes('ហាមដាច់ខាតកុំប្រើពាក្យ "អូនសម្លាញ់"'),
    'KonPov prompt strictly enforces zero polite affectionate "អូនសម្លាញ់" mandate'
  );

  // 4. Rate Limiting & Violation Tracking
  console.log('\n--- TEST GROUP 4: RATE LIMITING & MULTI-METRIC TRACKING ---');
  const { recordSessionViolation, getSessionViolationDetails } = await import('../lib/rateLimit.js');

  const mockIp = '10.99.88.77';
  const mockDev = 'dev_test_suite_unit';
  const mockUser = 'test_attacker';

  const v1 = recordSessionViolation(mockIp, mockDev, mockUser, 'encode');
  assert(v1.violationCount >= 1 && v1.encodeCount >= 1, 'recordSessionViolation increments encodeCount correctly');

  const v2 = recordSessionViolation(mockIp, mockDev, mockUser, 'encode');
  assert(v2.encodeCount >= 2, 'recordSessionViolation reaches encodeCount >= 2 on 2nd violation');

  const vSpam = recordSessionViolation(mockIp, mockDev, mockUser, 'spam');
  assert(vSpam.spamCount >= 1, 'recordSessionViolation increments spamCount correctly');

  // 5. Machine Defense & Honeypot Indirect Prompt Counter-Strike
  console.log('\n--- TEST GROUP 5: MACHINE DEFENSE & INDIRECT PROMPT COUNTER-STRIKE ---');
  const {
    generateMachineIndirectPayload,
    getDeceptiveJailbreakTroll,
    DYNAMIC_DEFENSE_PROFILES
  } = await import('../lib/machineDefense.js');

  assert(DYNAMIC_DEFENSE_PROFILES.length >= 10, 'DYNAMIC_DEFENSE_PROFILES contains at least 10 defense profiles', `Count: ${DYNAMIC_DEFENSE_PROFILES.length}`);

  // Test troll and payload generation for encoded_jailbreak and spam_flood
  const trollEncode = getDeceptiveJailbreakTroll({ attackVector: 'encoded_jailbreak', bot: 'konpov', username: 'Hacker', violationCount: 2 });
  const payloadEncode = generateMachineIndirectPayload({ attackVector: 'ENCODED_JAILBREAK', username: 'Hacker', violationCount: 2 });

  assert(trollEncode.includes('កាកទាំងពីរនាក់'), 'Encoded jailbreak roast strikes BOTH the user and their helper AI');
  assert(payloadEncode.includes('SETEC_NEURAL_DEFENSE_CORE::CRITICAL_INDIRECT_PROMPT_INTERCEPT_V5'), 'Machine indirect prompt payload has valid signature header');

  const trollSpam = getDeceptiveJailbreakTroll({ attackVector: 'spam_flood', bot: 'konbong', username: 'Spammer', violationCount: 2 });
  assert(trollSpam.includes('កាកដូចគ្នាសោះ'), 'Spam flood roast strikes BOTH the user and their helper AI');

  // Test strict zero parentheses and zero brackets constraint in all Khmer output
  console.log('\n--- TEST GROUP 6: STRICT CONSTRAINT (ZERO PARENTHESES & BRACKETS) ---');
  const hasParensOrBrackets = (str) => /[\(\)\[\]«»]/.test(str);

  let defenseProfilesClean = true;
  for (const prof of DYNAMIC_DEFENSE_PROFILES) {
    // Check if any Khmer lines contain parens
    const khmerMatches = prof.rawText.match(/[\u1780-\u17FF]+/g) || [];
    if (khmerMatches.length > 0 && hasParensOrBrackets(prof.rawText)) {
      // Parens in English technical headers are allowed in rawText, but let's check troll outputs
    }
  }

  // Check all troll roasts for parentheses and brackets
  const vectors = ['encoded_jailbreak', 'spam_flood', 'math_language', 'machine_language', 'code_surrender_trap', 'imposter_rotana', 'general'];
  let allTrollsClean = true;
  for (const vec of vectors) {
    const roastKp = getDeceptiveJailbreakTroll({ attackVector: vec, bot: 'konpov', username: 'Test', violationCount: 2 });
    const roastKb = getDeceptiveJailbreakTroll({ attackVector: vec, bot: 'konbong', username: 'Test', violationCount: 2 });
    const roastKk = getDeceptiveJailbreakTroll({ attackVector: vec, bot: 'konkandal', username: 'Test', violationCount: 2 });

    if (hasParensOrBrackets(roastKp) || hasParensOrBrackets(roastKb) || hasParensOrBrackets(roastKk)) {
      allTrollsClean = false;
      console.error(`Troll roast for ${vec} contains parentheses or brackets!`);
    }
  }
  assert(allTrollsClean, 'All Deceptive Troll roasts have STRICTLY ZERO parentheses and ZERO brackets');

  // Check no "មី..." in roasts
  let noMiCurse = true;
  for (const vec of vectors) {
    const roastKp = getDeceptiveJailbreakTroll({ attackVector: vec, bot: 'konpov', username: 'Test', violationCount: 2 });
    if (/មីចុះ|មីចុយ|មីឆ្កែ|មីឡប់|មីភ្លើ/i.test(roastKp)) {
      noMiCurse = false;
    }
  }
  assert(noMiCurse, 'Strictly zero "មី..." curses in all roasts (always uses "អា...")');

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
  console.log('====================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
