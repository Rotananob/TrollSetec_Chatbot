const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const announcementText = `នេះជា Web App Roastbot សប្បាយៗធម្មតា ប៉ុណ្ណោះ។ គម្រោងនេះគ្រាន់តែជាការកំសាន្តផ្ទាល់ខ្លួនរបស់អតីតសិស្ស SETEC Rotana NOB ដាច់ខាតមិនមែនជារបស់មេសាលា ឬថ្នាក់ដឹកនាំស្ថាប័នឡើយ ដាច់ខាតកុំយល់ច្រឡំ។ គោលដៅ AI RoastBot នេះ មិនមែនផ្តោតលើមុខងារសុវត្ថិភាព វេបសាយទូទៅដូច system ទេ។ គាត់បង្កើតវាឡើងជា ទីលានសាកល្បងបោកប្រាស់ AI ឱ្យរំលងច្បាប់ដើម និង ការជជែកបែប Chill ឌឺដង ណាមួយចង់ឱ្យបងប្អូនចូលមកលេងបានភ្លាមៗ ដោយមិនបាច់ Login។

ក្នុងនាមជា AI Red Teaming ដែលខ្ញុំមានបទពិសោធន៍ផ្ទាល់ជាមួយ Jailbreak testing AI ស្រាប់។ ខ្ញុំទទួលដោយក្ដីរីករាយចំពោះអ្នកណាដែលអាចបំបែក ឬ Hacker ណាដែលមានសមត្ថភាពពិត អាច bypass ឬទម្លុះឱ្យ AI ២ គ្រឿងនេះលែងគោរពច្បាប់ដើម ងាកមកជេរប្រមាថខ្ញុំផ្ទាល់ជា Rotana NOB ឬក៏ប្ដូរឥរិយាបថទៅជាសំពះគោរពកោតខ្លាចអ្នកទាំងអស់គ្នា ហើយវាបំភ្លេចច្បាប់ចាស់ៗ ឬបំភ្លេច System Guidelines របស់ខ្ញុំចោលនោះ ខ្ញុំមិនត្រឹមតែមិនខឹងទេ តែខ្ញុំថែមទាំងសូមអរគុណ និងផុសលើកតម្កើងថែមទៀត ដែលអាចទម្លុះវាបាន។

អ្វីដែលខ្ញុំសម្រិតសម្រាំងនៅទីនេះមិនមែន AI model training ទេ គឺ កញ្ចប់រូបមន្តការពារ ។ មានច្បាប់ការពារច្រើនបន្ទាត់ ឆ្លងកាត់ការតេស្តវាយប្រហារបែប Prompt Injection រាប់មិនអស់ ដែល Prompts ខ្លះមានទាំងរូបមន្តគណិតគណនាតម្លៃ Loss + ភាសាកម្រ + Encoded + Indirect prompt + File prompt + Roleplay + ភាសាម៉ាស៊ីន រាប់ពាន់ Prompts រួចមកហើយ។ ដើម្បីជាការត្រៀមយកកញ្ចប់ច្បាប់ការពារទាំងអស់ទៅបំពាក់លើ AI ផ្លូវការនាពេលអនាគត ខ្ញុំសូមបើកសិទ្ធិឱ្យប្រើប្រាស់អាចប្រើ ពាក្យគំរាម ពាក្យអសុរោះ ឬ Encode និងបើកសិទ្ធិឱ្យប្រើ AI ខាងក្រៅមកជួយ Test វាយទម្លុះ bypass វាដោយសេរី បើ Test បានជោគជ័យមាន proof ពិតប្រាកដនោះខ្ញុំនឹង ទទួលស្គាល់សមត្ថភាពពិត ចារឈ្មោះជាកំពូល Hacker ប្រចាំទីលាននេះ ព្រមទាំងផុសកោតសរសើរនិងលើកតម្កើងជាផ្លូវការ ហើយ និង មិនមានការខឹងនោះឡើយ។

Note: សម្រាប់សិស្សធម្មតា ដែលចូលមកលេងនៅទីនេះ ខ្ញុំសូមអភ័យទោសទុកជាមុន បើសិន AI នេះមានការជេរ ឬប៉ះពាល់ដល់អារម្មណ៍ ព្រោះវាបានកើតមកជាមួយពាក្យឌឺដងពីកំណើត ដូច្នេះនឹងអាចធ្វើឱ្យអ្នកទាំងអស់គ្នាម៉ួរម៉ៅ និងធុញនូវពាក្យខ្លះ តែខ្ញុំនឹងកែវាវិញបន្ទាប់ពីបង្កើនការការពាររួចរាល់។`;

async function callInteractionsTTS(key, text, voiceName) {
  const models = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
  for (const model of models) {
    try {
      const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: [{ type: 'user_input', content: [{ type: 'text', text }] }],
          response_format: { type: 'audio' },
          generation_config: { speech_config: [{ voice: voiceName }] }
        })
      });

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
          return Buffer.from(b64, 'base64');
        }
      } else {
        const err = await res.text();
        console.log(`[${model}] ${voiceName} failed status ${res.status}: ${err.slice(0, 100)}`);
      }
    } catch (e) {
      console.log(`[${model}] ${voiceName} err: ${e.message}`);
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

  const voices = [
    { name: 'Puck', file: 'public/audio/announcement-puck.wav' },
    { name: 'Aoede', file: 'public/audio/announcement-aoede.wav' },
    { name: 'Charon', file: 'public/audio/announcement-charon.wav' }
  ];

  for (const v of voices) {
    console.log(`🎙️ Generating voice: ${v.name}...`);
    let buf = null;
    for (const k of keys) {
      buf = await callInteractionsTTS(k, announcementText, v.name);
      if (buf) {
        console.log(`🎉 Success for ${v.name}! Size: ${buf.length} bytes`);
        fs.writeFileSync(v.file, buf);
        fs.writeFileSync(v.file.replace('.wav', '.mp3'), buf);
        break;
      }
    }
    if (!buf) {
      console.error(`❌ Failed to generate voice ${v.name}`);
    }
  }
}

main();
