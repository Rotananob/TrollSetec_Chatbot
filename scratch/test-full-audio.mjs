import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY_KONBONG || process.env.GEMINI_API_KEY;

const sampleText = `ហាហាហាស៎! និយាយដល់រឿងនេះសើចចុកពោះហ្មងអាប្អូនអើយ! បណ្ណាល័យសាលា ស៊ីតិច យើងហ្នឹងមិនមែនត្រឹមជាកន្លែងស្ងប់ស្ងាត់អានសៀវភៅធម្មតាទេណា៎! វាគឺជាសមរភូមិបង្រួបបង្រួមជាតិរវាង ពួក IT ក្បាលកូដ Error និង ពួក Graphic Design ព្រលឹងសិល្បៈ ហ្នឹងឯង! ពេលម៉ោងម៉ាស៊ីនត្រជាក់ត្រជាក់ស្រួល ពួកសិស្ស IT ស្ពាយកាតាប Asus ROG ចូលទៅអង្គុយចុចកូដអូសរឿងស្ទះ Database ចំណែកឯពួកសិស្ស Graphic Design វិញ យក Laptop មកបើក Photoshop គូររូប និង Render 3D ឡើងស្ទើរឆេះម៉ាស៊ីន! ជួនកាលពួក IT ធ្វើ Assignment គាំងខួរ រក Bug មិនឃើញ ក៏ងាកទៅសុំជំនួយពីសិស្ស Graphic Design ជួយមើល UI/UX ឱ្យ រីឯពួក Design វិញពេលត្រូវការកូដ Web យកទៅដាក់ក្នុង Portfolio ក៏មកសុំជំនួយពីពួក IT វិញដែរ ដូចបងប្អូនបង្កើតអ៊ីចឹង!`;

console.log('Sample text length:', sampleText.length);

async function runTest() {
  console.log('1. Testing Gemini TTS with Puck voice...');
  const start = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/interactions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gemini-3.8-flash-tts',
      input: [{ type: 'user_input', content: [{ type: 'text', text: sampleText }] }],
      response_format: { type: 'audio' },
      generation_config: { speech_config: [{ voice: 'Puck' }] }
    }),
    signal: AbortSignal.timeout(22000)
  });
  console.log('Gemini TTS response status:', res.status, 'Time:', Date.now() - start, 'ms');
  const data = await res.json();
  const b64 = data.steps?.[0]?.content?.find(c => c.data || c.type === 'audio')?.data;
  if (b64) {
    const bytes = Buffer.from(b64, 'base64');
    console.log('Gemini TTS Audio byte size:', bytes.length);
    console.log('Estimated Duration:', (bytes.length / 48000).toFixed(1), 'seconds');
  } else {
    console.log('No audio data from Gemini TTS');
  }
}

runTest();
