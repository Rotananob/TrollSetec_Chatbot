const fs = require('fs');
let code = fs.readFileSync('app/api/chat/route.js', 'utf8');

// Normalize line endings for replacement
const isCRLF = code.includes('\r\n');
const eol = isCRLF ? '\r\n' : '\n';

// Find the insertion point:
const searchTarget = 'const isCurseBackfire = isCurrentCurse && (hasAngryEmojiOrRage || userHistoryMsgs.length >= 1);';

const earlyDeclarations = [
  searchTarget,
  '',
  '      // Core Intention Detectors initialized early to prevent any Temporal Dead Zone errors:',
  '      const isGreetingPrompt = /^\\s*(?:hi|hello|hey|yo|bro|hallo|helo|hy|hola|hi\\s*b|hi\\s*bong|hi\\s*che|hello\\s*b|hello\\s*bong|hello\\s*che|hey\\s*b|hey\\s*bong|សួស្តី|សួស្ដី|សួស្តីបង|សួស្ដីបង|សួស្តីចែ|សួស្ដីចែ|ជំរាបសួរ|ជម្រាបសួរ|អរុណសួស្តី|ទិវាសួស្តី|សាយណ្ហសួស្តី|រាត្រីសួស្តី|good\\s*morning|good\\s*afternoon|good\\s*evening|good\\s*night|how\\s*are\\s*you|wassup|what\'s\\s*up|សុខសប្បាយ|សុខសប្បាយអត់|សុខសប្បាយទេ|ញ៉ាំបាយនៅ|ញ៉ាំបាយហើយនៅ|ញ៉ាំអីនៅ|ធ្វើអីហ្នឹង|ធ្វើអីហ្នឹងបង|ធ្វើអីហ្នឹងចែ)\\s*[!?.,~]*\\s*$/i.test(userPrompt);',
  '      const isSweetPrompt = /(?:kiss|kiss\\s*me|sweet|love|crush|baby|cute|miss\\s*you|ថើប|ថេីប|សុំថើប|ថើបមួយ|ថើបមួយមក|ចើប|ចើបមួយ|ចើបមួយមក|ចេីប|សុំចើប|ចង់ចើប|សុំស្រលាញ់|ស្រលាញ់|ស្រលាញ់បង|ស្រឡាញ់|សុំស្នេហ៍|នឹក|សង្សារ)/ui.test(userPrompt);',
  '      const isCursePrompt = !isSweetPrompt && /(?:ចុយ|ម្រាយ|មីចុយ|អាចុយ|អាឆ្កែ|មីឆ្កែ|ឆ្កែ|អាឡប់|មីឡប់|អាភ្លើ|មីភ្លើ|អាអត់ខួរ|មីអត់ខួរ|អត់ខួរ|អាថោក|មីថោក|ថោកទាប|ថោក|អាខ្វាក់|មីខ្វាក់|កាដួយ|ក្ដ|ក្ដិត|អាចម៍|ក្បាលម៉ែ|ឪហែង|ម៉ែហែង|អញ|ហែង|កំភ្លៀង|ទះក្បាល|ចោរ|fuck|bitch|shit|asshole|kduy|kdor|joy|lop|ah\\s*chke|me\\s*chke|chke|ah|hg)/ui.test(userPrompt);'
].join(eol);

// Remove the comments placeholder if present
code = code.replace(/^[ \t]*\/\/ isGreetingPrompt already initialized early[ \t]*\r?\n/m, '');
code = code.replace(/^[ \t]*\/\/ isSweetPrompt already initialized early[ \t]*\r?\n/m, '');
code = code.replace(/^[ \t]*const isCursePrompt = !isSweetPrompt[^\r\n]*\r?\n/m, '');

code = code.replace(searchTarget, earlyDeclarations);

// Remove late definitions
code = code.replace(/const isSweetPrompt = \/\(\?:kiss[^\r\n]*;/, '// isSweetPrompt already initialized early');
code = code.replace(/const isGreetingPrompt = \/\^\\s\*\(\?:hi[^\r\n]*;/, '// isGreetingPrompt already initialized early');

fs.writeFileSync('app/api/chat/route.js', code, 'utf8');
console.log('Done fixing chat route!');
