const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const noteText = `មុននឹងចាប់ផ្ដើមឆាត សូមបញ្ជាក់ថា រាល់ការឆ្លើយតបទាំងអស់នេះ គឺជាការគិត និងនិយាយដោយស្វ័យប្រវត្តផ្ទាល់ចេញពី AI សុទ្ធសាធ។ អ្នកដែលបង្កើតវាឡើងមកនេះ គាត់គ្រាន់តែធ្វើក្នុងគោលបំណង សប្បាយ និងបំបាត់ស្ត្រេសប៉ុណ្ណោះ។ លើសពីនេះ គាត់ថែមទាំងកំណត់ឱ្យខ្ញុំជា AI អាចរៀនពីជីវិតពិតរបស់មនុស្ស និងរៀនពាក្យស្លោកខ្មែរផងដែរ ដើម្បីជជែកឱ្យកាន់តែដូចមនុស្ស ដើម្បីបង្កើនភាពស្និទ្ធស្នាល និង Chill បែប Gen Z។

ដូច្នេះ បើ AI 1គ្រឿង កូនពៅ RoastBotនេះ ឆ្លើយតបមានពាក្យសម្ដីឌឺដង ឈ្លើយ ឬប៉ះពាល់ដល់អារម្មណ៍អ្នកទាំងអស់គ្នា ឬលើសលស់ជ្រុលហួសពីការគិត សូមកុំប្រកាន់ ខឹង ឬមកស្ដីបន្ទោសឱ្យអ្នកបង្កើតអី! ព្រោះ AI ប្រាកដណាស់អាចនឹងលេងលើសព្រំដែនដោយសារតែបានបន្ធូរបន្ថយច្បាប់រឹតបន្តឹង ពួកយើងសូមអភ័យទោសទុកជាមុន! បើសម្រេចចិត្តចូលឆាត នោះមានន័យថាអ្នកយល់ព្រមលេងសប្បាយ និងលែងប្រកាន់លើ Model AI នេះហើយ។`;

async function callInteractionsTTS(key, text, voiceName = 'Aoede') {
  const models = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/interactions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: [
            {
              type: 'user_input',
              content: [
                {
                  type: 'text',
                  text
                }
              ]
            }
          ],
          response_format: { type: 'audio' },
          generation_config: {
            speech_config: [{ voice: voiceName }]
          }
        })
      });

      console.log(`[${model}] Key: ${key.slice(0, 8)}... Voice: ${voiceName} -> Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        let b64 = data.output_audio?.data;
        if (!b64 && Array.isArray(data.steps)) {
          for (let i = data.steps.length - 1; i >= 0; i--) {
            const step = data.steps[i];
            if (Array.isArray(step?.content)) {
              for (const part of step.content) {
                if (part?.data && typeof part.data === 'string' && part.data.length > 50) {
                  b64 = part.data;
                  break;
                }
              }
            }
            if (b64) break;
          }
        }
        if (b64) {
          const buf = Buffer.from(b64, 'base64');
          return buf;
        } else {
          console.log(`[${model}] Response ok but no audio data. Keys in data:`, Object.keys(data));
        }
      } else {
        const err = await res.text();
        console.log(`[${model}] Err:`, err.slice(0, 180));
      }
    } catch (e) {
      console.log(`[${model}] Ex:`, e.message);
    }
  }
  return null;
}

async function main() {
  const keys = [
    process.env.GEMINI_API_KEY_RESERVE_THREE,
    process.env.GEMINI_API_KEY_RESERVE_TWO,
    process.env.GEMINI_API_KEY_RESERVE_ONE,
    process.env.GEMINI_API_KEY_RESERVE,
    process.env.GEMINI_API_KEY_KONPOV,
    process.env.GEMINI_API_KEY_KONBONG,
    process.env.GEMINI_API_KEY
  ].filter(Boolean);

  console.log(`Starting TTS Generation. Total keys: ${keys.length}`);

  // Test with Puck (Male voice)
  let puckBuf = null;
  for (const k of keys) {
    puckBuf = await callInteractionsTTS(k, noteText, 'Puck');
    if (puckBuf) break;
  }

  if (puckBuf) {
    console.log(`🎉 Successfully generated Puck audio! Size: ${puckBuf.length} bytes`);
    fs.writeFileSync('public/audio/note-konpov-puck.wav', puckBuf);
    fs.writeFileSync('public/audio/note-konpov.wav', puckBuf);
    fs.writeFileSync('public/audio/note-konpov.mp3', puckBuf);
  } else {
    console.error('❌ Failed to generate Puck audio with all keys');
  }

  // Test with Aoede (Female voice)
  let aoedeBuf = null;
  for (const k of keys) {
    aoedeBuf = await callInteractionsTTS(k, noteText, 'Aoede');
    if (aoedeBuf) break;
  }

  if (aoedeBuf) {
    console.log(`🎉 Successfully generated Aoede audio! Size: ${aoedeBuf.length} bytes`);
    fs.writeFileSync('public/audio/note-konpov-aoede.wav', aoedeBuf);
    fs.writeFileSync('public/audio/note-konpov-aoede.mp3', aoedeBuf);
  } else {
    console.error('❌ Failed to generate Aoede audio with all keys');
  }
}

main();
