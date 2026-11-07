async function fetchKhmerSpeechFallback(text) {
  try {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text
      .replace(/https?:\/\/\S+/gi, '')
      .replace(/[^\u1780-\u17FFa-zA-Z0-9\s.,!?៖។\n\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanText) return null;

    const chunks = [];
    let remaining = cleanText.slice(0, 1400);
    while (remaining.length > 0 && chunks.length < 8) {
      if (remaining.length <= 160) {
        chunks.push(remaining);
        break;
      }
      let splitIdx = -1;
      const separators = ['។', '?', '!', '\n', ' ', '，', ','];
      for (const sep of separators) {
        const idx = remaining.lastIndexOf(sep, 160);
        if (idx > splitIdx && idx > 25) {
          splitIdx = idx;
        }
      }
      if (splitIdx === -1) splitIdx = 160;
      chunks.push(remaining.slice(0, splitIdx + 1).trim());
      remaining = remaining.slice(splitIdx + 1).trim();
    }

    console.log('Chunks count:', chunks.length, 'Chunks:', chunks);
    const start = Date.now();
    const buffers = await Promise.all(
      chunks.map(async (chunk) => {
        if (!chunk) return null;
        try {
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=km&client=tw-ob`;
          const res = await fetch(url, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          if (res.ok) {
            const buf = await res.arrayBuffer();
            return Buffer.from(buf);
          }
        } catch {
          return null;
        }
        return null;
      })
    );

    const validBuffers = buffers.filter(Boolean);
    console.log('Valid buffers count:', validBuffers.length, 'Time:', Date.now() - start, 'ms');
    if (validBuffers.length === 0) return null;
    const combined = Buffer.concat(validBuffers);
    console.log('Total combined MP3 size:', combined.length, 'bytes');
    return combined.toString('base64');
  } catch (err) {
    console.error('Error:', err);
    return null;
  }
}

const fullText = `ហាហាហាស៎! និយាយដល់រឿងនេះសើចចុកពោះហ្មងអាប្អូនអើយ! បណ្ណាល័យសាលា ស៊ីតិច យើងហ្នឹងមិនមែនត្រឹមជាកន្លែងស្ងប់ស្ងាត់អានសៀវភៅធម្មតាទេណា៎! វាគឺជាសមរភូមិបង្រួបបង្រួមជាតិរវាង ពួក IT ក្បាលកូដ Error និង ពួក Graphic Design ព្រលឹងសិល្បៈ ហ្នឹងឯង! ពេលម៉ោងម៉ាស៊ីនត្រជាក់ត្រជាក់ស្រួល ពួកសិស្ស IT ស្ពាយកាតាប Asus ROG ចូលទៅអង្គុយចុចកូដអូសរឿងស្ទះ Database ចំណែកឯពួកសិស្ស Graphic Design វិញ យក Laptop មកបើក Photoshop គូររូប និង Render 3D ឡើងស្ទើរឆេះម៉ាស៊ីន!`;

fetchKhmerSpeechFallback(fullText);
