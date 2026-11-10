const fs = require('fs');

const filesToScan = [
  'app/prompts/konPovPrompt.js',
  'app/prompts/konBongPrompt.js',
  'app/prompts/konKandalPrompt.js',
  'app/api/chat/route.js',
  'lib/machineDefense.js',
  'lib/smartCutoff.js',
  'app/KonPov/page.js',
  'app/KonBong/page.js',
  'app/KonKandal/page.js'
];

const curseWords = [
  'មីចុយម្រាយ',
  'មីចុយ',
  'មីឆ្កែ',
  'មីឆ្កួត',
  'មីឡប់',
  'មីភ្លើ',
  'មីអត់ខួរ',
  'មីថោកទាប',
  'មីថោក',
  'មីកាក',
  'មីក្មេង',
  'មីល្អិត',
  'មីខ្វាក់',
  'មីច្រឡើត',
  'មីងាប់',
  'មីប្អូន',
  'មីមុខ'
];

filesToScan.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    curseWords.forEach(word => {
      if (line.includes(word)) {
        console.log(file + ':' + (idx + 1) + ' [' + word + '] -> ' + line.trim().slice(0, 120));
      }
    });
  });
});
