const MEME_ENDPOINT = 'https://troll-setec-chatbot.vercel.app/api/generate-meme';

async function testMeme() {
  console.log('Testing Meme API:', MEME_ENDPOINT);
  try {
    const res = await fetch(MEME_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': 'test-verify-device-123'
      },
      body: JSON.stringify({
        prompt: 'និស្សិតរៀន IT រត់រក WiFi ស៊ីតិច',
        bot: 'konpov',
        username: 'Sokha'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', data);
    if (res.ok && data.success) {
      console.log('✅ Meme Generation API: PASS');
    } else {
      console.log('Meme response status/message:', data.message || data.error);
    }
  } catch (err) {
    console.error('Meme test error:', err.message);
  }
}

testMeme();
