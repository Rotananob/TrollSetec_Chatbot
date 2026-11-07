import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { buildKonBongSystemInstruction } from '../app/prompts/konBongPrompt.js';
import { buildKonPovSystemInstruction } from '../app/prompts/konPovPrompt.js';

const apiKey = process.env.GEMINI_API_KEY_KONBONG || process.env.GEMINI_API_KEY;

async function testPrompt(botName, promptText, sysInstruction) {
  console.log(`\n============================================================`);
  console.log(`[Testing ${botName}] Prompt: "${promptText}"`);
  console.log(`============================================================`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: sysInstruction }] },
      generationConfig: { maxOutputTokens: 600, temperature: 0.7 }
    })
  });

  const data = await res.json();
  const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log(`Response:\n${output}`);
  return output;
}

async function run() {
  const kbInstruction = buildKonBongSystemInstruction({
    promptText: 'quote test',
    username: 'Dara',
    userGender: 'ប្រុស',
    savageLevel: 'medium'
  });

  const kpInstruction = buildKonPovSystemInstruction({
    promptText: 'quote test',
    username: 'Bopha',
    userGender: 'ស្រី',
    savageLevel: 'savage'
  });

  await testPrompt('KonBong', 'សុំ Quote Troll ឡូយៗបែប IG និង X សម្រាប់សិស្ស IT & CS ទាំងភាសាខ្មែរ និងអង់គ្លេសមួយកប់មកបង!', kbInstruction);
  await testPrompt('KonPov', 'សុំ Quote Troll បែប IG និង X សម្រាប់សិស្ស Interior Design ទាំង 3D Render និងប្លង់មកចែ!', kpInstruction);
}

run();
