import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { POST } from '../app/api/chat/route.js';

async function testKonPovAudio() {
  const fullText = `អូយយយ~ សួរចំរឿងហ្នឹងដឹងថាជាសិស្សច្បាស់ណាស់អាប្អូនប្រុស! បណ្ណាល័យសាលា SETEC ហ្នឹងគឺដូចជាកន្លែងជួបជុំគ្នារវាងសិស្ស IT និងសិស្ស Graphic Design អញ្ចឹង! សិស្ស Design គាត់ចូលចិត្តទៅអង្គុយរក Inspiration គូររូប រចនាប្លង់ 3D Render យ៉ាងស្ងប់ស្ងាត់ ចំណែកឯសិស្ស IT វិញក៏ចូលទៅអង្គុយចុចកូដ Error ឡើងភ្នែកក្រហមដែរ! ពេលពួកគាត់អង្គុយតុជាប់គ្នា គឺជួយគ្នាទៅវិញទៅមកយ៉ាងស្និទ្ធស្នាលបំផុត ព្រោះ IT គ្មានសិល្បៈ ចំណែក Design គ្មានកូដ ដល់ពេលជួបគ្នាទើបបង្កើតបានជា Project ស្រស់ស្អាតនិងខ្លាំងកប់ពពក!`;

  const req = new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': 'test-device-konpov-audio'
    },
    body: JSON.stringify({
      prompt: fullText,
      audio: true,
      bot: 'konpov',
      generationConfig: {
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } }
        }
      }
    })
  });

  console.log('Testing KonPov Aoede Voice text length:', fullText.length);
  const start = Date.now();
  const res = await POST(req);
  console.log('Response status:', res.status, 'Time:', Date.now() - start, 'ms');
  const data = await res.json();
  const inline = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (inline?.data) {
    const buf = Buffer.from(inline.data, 'base64');
    console.log('Audio mimeType:', inline.mimeType);
    console.log('Audio byte length:', buf.length);
    console.log('Is Fallback voice:', data.isFallbackBotVoice);
    const estDuration = inline.mimeType?.includes('wav') ? (buf.length / 48000).toFixed(1) : (buf.length / 16000).toFixed(1);
    console.log('Estimated audio duration:', estDuration, 'seconds');
    if (parseFloat(estDuration) > 20) {
      console.log('✅ PASS: KonPov Audio duration is > 20 seconds, reading full message completely!');
    } else {
      console.log('❌ FAIL: Audio too short:', estDuration);
    }
  } else {
    console.log('Error/No data:', data);
  }
}

testKonPovAudio();
