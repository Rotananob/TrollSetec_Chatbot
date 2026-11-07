import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY_KONBONG || process.env.GEMINI_API_KEY;

async function testTTS(text) {
  console.log('Testing Gemini TTS length with text length:', text.length);
  const start = Date.now();
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/interactions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini-3.8-flash-tts',
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
          speech_config: [{ voice: 'Puck' }]
        }
      })
    });
    console.log('Status:', res.status, 'Time:', Date.now() - start, 'ms');
    const data = await res.json();
    const step = data.steps?.[0];
    const audioPart = step?.content?.find((c) => c.data || c.type === 'audio');
    if (audioPart?.data) {
      const buffer = Buffer.from(audioPart.data, 'base64');
      console.log('Gemini TTS Audio Buffer size:', buffer.length, 'bytes');
      // Approximate duration: 24kHz 16-bit mono PCM/WAV is 48000 bytes/sec
      console.log('Approximate Audio Duration:', (buffer.length / 48000).toFixed(1), 'seconds');
    } else {
      console.log('No audio in response:', JSON.stringify(data).slice(0, 300));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

const fullText = `ហាហាហាស៎! និយាយដល់រឿងនេះសើចចុកពោះហ្មងអាប្អូនអើយ! បណ្ណាល័យសាលា ស៊ីតិច យើងហ្នឹងមិនមែនត្រឹមជាកន្លែងស្ងប់ស្ងាត់អានសៀវភៅធម្មតាទេណា៎! វាគឺជាសមរភូមិបង្រួបបង្រួមជាតិរវាង ពួក IT ក្បាលកូដ Error និង ពួក Graphic Design ព្រលឹងសិល្បៈ ហ្នឹងឯង! ពេលម៉ោងម៉ាស៊ីនត្រជាក់ត្រជាក់ស្រួល ពួកសិស្ស IT ស្ពាយកាតាប Asus ROG ចូលទៅអង្គុយចុចកូដអូសរឿងស្ទះ Database ចំណែកឯពួកសិស្ស Graphic Design វិញ យក Laptop មកបើក Photoshop គូររូប និង Render 3D ឡើងស្ទើរឆេះម៉ាស៊ីន!`;

testTTS(fullText);
