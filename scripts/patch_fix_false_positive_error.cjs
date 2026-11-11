// scripts/patch_fix_false_positive_error.cjs
// ROOT CAUSE FIX:
// 1) isCutoffText regex matches normal Khmer words "ស្វាងសិន", "ស្វាងចែសសិន"
//    and "Send Alert" which appear in normal bot roast replies → false error guideline shown
// 2) The UI regex for showing error guideline (in message render) has same problem
// 3) Fix: Remove "ស្វាងសិន", "ស្វាងចែសសិន", "Send Alert" from isCutoffText + UI regex
//         Only keep truly machine-generated markers that normal bot never says

const fs = require('fs');
const path = require('path');

const BOT_FILES = [
  'app/KonBong/page.js',
  'app/KonPov/page.js',
  'app/KonKandal/page.js'
];

// OLD isCutoffText logic regex patterns (in isCutoffText const definition)
const OLD_CUTOFF_CONST_KONBONG = `const isCutoffText = /(?:Send Alert|កាត់ផ្ដាច់ការ|Sensor សុវត្ថិភាព|កេះ Signal ទៅ Server|កេះទៅ Server|សតិបញ្ញា|ស្វាងសិន|ស្វាងចែសសិន|ទះក្បាលពួកអា|ការពារប្រព័ន្ធ)/i.test(botText || '');`;
const NEW_CUTOFF_CONST = `// FIXED: Removed "ស្វាងសិន", "ស្វាងចែសសិន", "Send Alert" — normal bot Khmer roast words, NOT cutoff markers
      // Only match truly machine-generated cutoff sentinels that never appear in normal replies
      const isCutoffText = /(?:setec-smart-cutoff-v1|កាត់ផ្ដាច់ការ STREAM|Sensor សុវត្ថិភាព AI|កេះ Signal ទៅ Server|System Security Triggered|ទះក្បាលពួកអា Bot)/i.test(botText || '');`;

// OLD UI regex (in message render, for showing error guideline)
const OLD_UI_REGEX_KONBONG  = `/(?:Send Alert|កាត់ផ្ដាច់|Sensor សុវត្ថិភាព|កេះ Signal ទៅ Server|កេះទៅ Server|ទះក្បាលពួកអា|ស្វាងសិន|ស្វាងចែសសិន)/i.test(msg.text || '')`;
const OLD_UI_REGEX_KONPOV   = `/(?:Send Alert|កាត់ផ្ដាច់|Sensor សុវត្ថិភាព|កេះ Signal ទៅ Server|កេះទៅ Server|ទះក្បាលពួកអា|ស្វាងសិន|ស្វាងចែសសិន)/i.test(msg.text || '')`;
const OLD_UI_REGEX_KONPOV2  = `/(?:Send Alert|កាត់ផ្ដាច់|Sensor សុវត្ថិភាព|កេះ Signal ទៅ Server|កេះទៅ Server|ទះក្បាលពួកអា|ស្វាងសិន|ស្វាងចែសសិន)/i.test(item.text || '')`;
const OLD_UI_REGEX_KONKANDAL= `/(?:Send Alert|កាត់ផ្ដាច់|Sensor សុវត្ថិភាព|កេះ Signal ទៅ Server|កេះទៅ Server|ទះក្បាលពួកអា|ស្វាងសិន|ស្វាងចែសសិន)/i.test(msg.text || '')`;
const NEW_UI_REGEX = `// FIXED: Only machine sentinel markers — normal roast words removed
                        /(?:setec-smart-cutoff-v1|កាត់ផ្ដាច់ការ STREAM|Sensor សុវត្ថិភាព AI|កេះ Signal ទៅ Server|System Security Triggered|ទះក្បាលពួកអា Bot)/i.test(msg.text || '')`;
const NEW_UI_REGEX_ITEM = `// FIXED: Only machine sentinel markers — normal roast words removed
                        /(?:setec-smart-cutoff-v1|កាត់ផ្ដាច់ការ STREAM|Sensor សុវត្ថិភាព AI|កេះ Signal ទៅ Server|System Security Triggered|ទះក្បាលពួកអា Bot)/i.test(item.text || '')`;

// Also fix the SERVER-SIDE getSmartCutoffResponse sentinel marker
// to output a unique string that only the machine generates
// (Already handled by isSmartCutoff flag from API, but guard the client regex)

let totalFixes = 0;

for (const relPath of BOT_FILES) {
  const FILE = path.join(__dirname, '..', relPath);
  let content = fs.readFileSync(FILE, 'utf8');
  let fixCount = 0;

  // ── Fix 1: isCutoffText const (in handleChat logic)
  // All 3 bots have same pattern
  const isCutoffConstPattern = /const isCutoffText = \/\(\?:Send Alert\|[^)]+\)\/i\.test\(botText \|\| ''\);/g;
  if (isCutoffConstPattern.test(content)) {
    content = content.replace(
      /const isCutoffText = \/\(\?:Send Alert\|[^)]+\)\/i\.test\(botText \|\| ''\);/g,
      NEW_CUTOFF_CONST.trim()
    );
    console.log(`✅ ${relPath}: Fixed isCutoffText const`);
    fixCount++;
  } else {
    console.log(`⚠️  ${relPath}: isCutoffText const pattern not matched (may already fixed or different)`);
  }

  // ── Fix 2: UI render regex (msg.text check)
  const uiRegexPattern = /\/\(\?:Send Alert\|[^)]+\)\/i\.test\((msg|item)\.text \|\| ''\)/g;
  const matches = content.match(uiRegexPattern);
  if (matches) {
    content = content.replace(
      /\/\(\?:Send Alert\|[^)]+\)\/i\.test\(msg\.text \|\| ''\)/g,
      `/(?:setec-smart-cutoff-v1|កាត់ផ្ដាច់ការ STREAM|System Security Triggered)/i.test(msg.text || '')`
    );
    content = content.replace(
      /\/\(\?:Send Alert\|[^)]+\)\/i\.test\(item\.text \|\| ''\)/g,
      `/(?:setec-smart-cutoff-v1|កាត់ផ្ដាច់ការ STREAM|System Security Triggered)/i.test(item.text || '')`
    );
    console.log(`✅ ${relPath}: Fixed UI render regex (${matches.length} occurrences)`);
    fixCount++;
  } else {
    console.log(`⚠️  ${relPath}: UI render regex not matched`);
  }

  fs.writeFileSync(FILE, content, 'utf8');
  totalFixes += fixCount;
  console.log(`   ${relPath}: ${fixCount} fixes applied`);
}

console.log(`\nTotal fixes applied: ${totalFixes}`);
console.log('\nVerifying...');

// Verify no "ស្វាងសិន" remains in isCutoffText or UI regex
for (const relPath of BOT_FILES) {
  const FILE = path.join(__dirname, '..', relPath);
  const c = fs.readFileSync(FILE, 'utf8');
  const hasOldPattern = c.includes('ស្វាងសិន|ស្វាងចែសសិន') || 
    (c.includes('Send Alert') && c.includes('isCutoffText'));
  if (hasOldPattern) {
    // Check if remaining "Send Alert" is only in button label text (not in regex)
    const lines = c.split('\n');
    const problematic = lines.filter((l, i) => {
      return (l.includes('ស្វាងសិន') || l.includes('Send Alert')) && 
             l.includes('/i.test(');
    });
    if (problematic.length > 0) {
      console.error(`❌ ${relPath}: Still has false positive pattern!`);
      problematic.forEach(l => console.error('   ', l.trim().substring(0, 100)));
    } else {
      console.log(`✅ ${relPath}: Clean — Send Alert only in button labels (OK)`);
    }
  } else {
    console.log(`✅ ${relPath}: Clean`);
  }
}

console.log('\nDone.');
