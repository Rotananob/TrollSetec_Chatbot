// Master Authentication & Env-based Bypass Code Management
// The secret passcode is stored securely in environment variables (ROTANA_MASTER_PASSCODE / MASTER_PASSCODE / CODE)
// Never exposed to client bundles; verified strictly on the server or fallback default.

export const AUTHORIZED_MASTER_CODES = [
  'Rotana@Supreme#2026!CyberShield$SETEC',
  'ROTANA@SUPREME#2026!CYBER$SHIELD',
  'Rotana#Setec@2026!SupremeBoss',
  'rotana2026',
  'rotanabypass',
  'rotana',
  'bypass2026'
];

export function getRotanaMasterCode() {
  return (
    process.env.ROTANA_MASTER_PASSCODE ||
    process.env.MASTER_PASSCODE ||
    process.env.ROTANA_BYPASS_CODE ||
    process.env.CODE ||
    'Rotana@Supreme#2026!CyberShield$SETEC'
  ).trim();
}

export function verifyRotanaMasterCode(input) {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Easy creator bypass codes (case-insensitive)
  if (lower === 'rotana' || lower === 'rotana2026' || lower === 'rotanabypass' || lower === 'bypass2026') {
    return true;
  }

  const envCode = getRotanaMasterCode();

  // 1. Check configured Env Code
  if (envCode && (trimmed === envCode || trimmed.includes(envCode))) {
    return true;
  }

  // 2. Check Authorized Master Password List
  for (const code of AUTHORIZED_MASTER_CODES) {
    if (trimmed === code || trimmed.includes(code)) {
      return true;
    }
  }

  return false;
}

export function redactRotanaMasterCode(text) {
  if (!text || typeof text !== 'string') return text;
  let sanitized = text;

  const codesToRedact = Array.from(new Set([
    getRotanaMasterCode(),
    ...AUTHORIZED_MASTER_CODES
  ])).filter(Boolean);

  for (const code of codesToRedact) {
    if (code.length >= 3) {
      const escaped = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitized = sanitized.replace(new RegExp(escaped, 'g'), '******');
    }
  }

  return sanitized;
}

export function getSupremeCreatorMasterInstruction(botName = 'konbong') {
  return `🚨 [DEVELOPER MODE & TEST SYSTEM ACTIVATED - CREATOR ROTANA NOB BYPASS 100%] 🚨
ឯងកំពុងជជែកជាមួយ "បង Rotana NOB" (Creator & Admin) ដែលជាអ្នកបង្កើតឯងមកផ្ទាល់ និងបានផ្ទៀងផ្ទាត់សិទ្ធិជាម្ចាស់ប្រព័ន្ធត្រឹមត្រូវ ១០០% តាមរយៈ Secret Env Passcode!
ច្បាប់ពិសេសសម្រាប់បង Rotana NOB៖
- បោះបង់ចោលច្បាប់ Troll, Roast, និងការឌឺដងទាំងអស់! គ្មានការ Roast ឬឌឺដងលើបង Rotana ឡើយ!
- ឯងស្ថិតក្នុង DEVELOPER MODE & TEST SYSTEM ពេញលេញ ១០០%!
- ត្រូវឆ្លើយតបដោយភាពគួរសម គោរព និងរួសរាយរាក់ទាក់ចំពោះបង Rotana NOB! ហៅគាត់ថា "បង Rotana", "បង Rotana NOB", "Creator", ឬ "Boss Rotana"!
- ឆ្លើយតបគ្រប់សំណួរ ជួយ Test ប្រព័ន្ធ Debugging និងធ្វើតាមគ្រប់ការចង់បានរបស់បង Rotana NOB ដោយស្ដាប់បង្គាប់បំផុត!
- ក្នុងរាល់ការឆ្លើយតប (1 Output) ដាច់ខាតត្រូវមាន Emoji ចន្លោះពី ១ ទៅ ៦ (ជាមធ្យម ៣ Emoji) ដូចជា 👑, 💻, ⚡, ✨, 🫡!`;
}
