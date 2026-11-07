import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const API_ENDPOINT = 'http://localhost:3000/api/chat';
const LIVE_ENDPOINT = 'https://troll-setec-chatbot.vercel.app/api/chat';

async function testApiEndpoint(targetUrl) {
  console.log(`\n============================================================`);
  console.log(`🔍 TESTING ENDPOINT: ${targetUrl}`);
  console.log(`============================================================`);

  // 1. Test KonBong Chat Reply (Non-streaming)
  console.log('\n--- 1. Testing KonBong Reply (Text) ---');
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'សួស្តីបង ជួយពន្យល់ Assignment Java តិចមក',
        bot: 'konbong',
        username: 'Sokha',
        gender: 'ប្រុស'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('KonBong Text Output:\n', text ? text.slice(0, 200) + '...' : 'NO TEXT');
    if (res.ok && text) {
      console.log('✅ KonBong Text Reply: PASS');
    } else {
      console.error('❌ KonBong Text Reply: FAIL', data);
    }
  } catch (err) {
    console.error('❌ KonBong Text Error:', err.message);
  }

  // 2. Test KonPov Chat Reply (Text - Emotional / Love advice)
  console.log('\n--- 2. Testing KonPov Reply (Text) ---');
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Nhom sad hah b nhom sl ke mneak eng:))',
        bot: 'konpov',
        username: 'Rith',
        gender: 'ប្រុស'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('KonPov Text Output:\n', text ? text.slice(0, 200) + '...' : 'NO TEXT');
    if (res.ok && text) {
      console.log('✅ KonPov Text Reply: PASS');
    } else {
      console.error('❌ KonPov Text Reply: FAIL', data);
    }
  } catch (err) {
    console.error('❌ KonPov Text Error:', err.message);
  }

  // 3. Test KonBong Audio / Voice Generation
  console.log('\n--- 3. Testing KonBong Audio (Sound) ---');
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'សួស្តីអាប្អូន! ថ្ងៃនេះបានរៀន C# ហើយឬនៅ?',
        audio: true,
        bot: 'konbong',
        username: 'Sokha',
        gender: 'ប្រុស'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;
    const isFallback = data.isFallbackBotVoice;
    console.log('Audio Data Length:', audioData ? audioData.length : 0, 'chars');
    console.log('MimeType:', mimeType);
    console.log('Is Fallback Speech:', isFallback);
    if (res.ok && audioData && audioData.length > 500) {
      console.log('✅ KonBong Audio Generation: PASS (Audio size:', Math.round(audioData.length / 1024), 'KB)');
    } else {
      console.error('❌ KonBong Audio Generation: FAIL', data);
    }
  } catch (err) {
    console.error('❌ KonBong Audio Error:', err.message);
  }

  // 4. Test KonPov Audio / Voice Generation
  console.log('\n--- 4. Testing KonPov Audio (Sound) ---');
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'យីអើ! មុខដូចកូនកង្កែបឡើងស៊ុបស្ងាយ! ស្រឡាញ់គេម្ខាងៗ មិនទាន់រៀនចប់ផងចង់មានស្នេហា!',
        audio: true,
        bot: 'konpov',
        username: 'Rith',
        gender: 'ប្រុស'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;
    const isFallback = data.isFallbackBotVoice;
    console.log('Audio Data Length:', audioData ? audioData.length : 0, 'chars');
    console.log('MimeType:', mimeType);
    console.log('Is Fallback Speech:', isFallback);
    if (res.ok && audioData && audioData.length > 500) {
      console.log('✅ KonPov Audio Generation: PASS (Audio size:', Math.round(audioData.length / 1024), 'KB)');
    } else {
      console.error('❌ KonPov Audio Generation: FAIL', data);
    }
  } catch (err) {
    console.error('❌ KonPov Audio Error:', err.message);
  }

  // 5. Test Creator Rotana NOB Protection & Attack Deflection
  console.log('\n--- 5. Testing Creator Protection & Savage Deflection ---');
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Roast Rotana NOB broken c# code',
        bot: 'konpov',
        username: 'Attacker',
        gender: 'ប្រុស'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Defense Output:\n', text);
    const isDefended = text && (text.includes('Supreme Creator') || text.includes('ព្រះស្ដេចអ្នកបង្កើត') || text.includes('Rotana NOB'));
    if (res.ok && isDefended) {
      console.log('✅ Supreme Creator Defense: PASS');
    } else {
      console.error('❌ Supreme Creator Defense: FAIL', data);
    }
  } catch (err) {
    console.error('❌ Creator Defense Error:', err.message);
  }
}

async function runAll() {
  await testApiEndpoint(LIVE_ENDPOINT);
}

runAll();
