const fs = require('fs');
const lines = fs.readFileSync('app/prompts/konPovPrompt.js', 'utf8').split('\n');
for (let i = 304; i <= 314; i++) {
  console.log(i + ': ' + JSON.stringify(lines[i]));
}
