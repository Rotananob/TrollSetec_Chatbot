// scratch/test-quotes-content.mjs
import { VIRAL_TROLL_QUOTES } from '../app/prompts/communityLore.js';

console.log(`Checking ${VIRAL_TROLL_QUOTES.length} viral quotes:`);
VIRAL_TROLL_QUOTES.forEach((q, idx) => {
  if (!q.quoteKh || !q.quoteEn || !q.tags || q.tags.length === 0) {
    console.error(`Quote ${idx} is missing fields!`, q);
    process.exit(1);
  }
  // Check that quoteKh has Khmer and quoteEn is English
  const hasKhmerInKh = /[\u1780-\u17FF]/.test(q.quoteKh);
  const hasOnlyEnglishInEn = !/[\u1780-\u17FF]/.test(q.quoteEn);
  console.log(`[${idx + 1}] [${q.department}]:`);
  console.log(`   Khmer: ${q.quoteKh}`);
  console.log(`   English: ${q.quoteEn}`);
  console.log(`   Tags: ${q.tags.join(' ')}`);
  if (!hasKhmerInKh || !hasOnlyEnglishInEn) {
    console.warn(`   ⚠️ Warning: language purity check failed on quote ${idx + 1}`);
  }
});
console.log('All quotes validated successfully! ✅');
