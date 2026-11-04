import { alertChatActivity } from '../../../lib/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-device-id',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// In-memory set of users/devices who already generated their 1 single meme
const memeCreatedDevices = new Set();

export async function POST(req) {
  try {
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const clientIp = forwardedFor.split(',')[0].trim() || 'unknown-ip';
    const clientUserAgent = req.headers.get('user-agent') || 'Unknown';
    const deviceId = req.headers.get('x-device-id') || clientIp;

    const body = await req.json();
    const { prompt, bot = 'konpov', username = 'User' } = body;

    // Strict 1-image per user quota check
    const quotaKey = `${clientIp}_${deviceId}`;
    if (memeCreatedDevices.has(quotaKey)) {
      return Response.json(
        {
          success: false,
          quotaExceeded: true,
          message:
            bot === 'konpov'
              ? `អាម៉ូយ ${username}! គេប្រាប់ថាម្នាក់បានតែមួយរូបទេ! ចង់បានលើសហ្នឹងទៅដេកយល់សប្តិទៅអាប្អូន! 😂 កុំមកលោភលន់ពេក ទុក quota ឱ្យគេលេងផង! 🔥`
              : `អូអាប្អូន ${username}! កូតាបង្កើតរូបភាព Meme របស់ប្អូនអស់ហើយ (១ នាក់បង្កើតបានតែ ១ រូបគត់)! សុំទោសផងប្អូន ទុកឱកាសឱ្យមិត្តភក្តិដទៃទៀតផងណា៎! 😄✨`
        },
        { status: 403, headers: corsHeaders }
      );
    }

    // Mark quota as consumed
    memeCreatedDevices.add(quotaKey);

    const userIdea = (prompt || 'SETEC student trying to pass exam without studying').trim();

    // Expert meme prompt focusing strictly on pure comedic troll meme humor
    const memePrompt = `hilarious viral internet meme caricature, pure comedy humor, exaggerated funny facial expression, comic meme format, funny situation about ${userIdea}, vibrant funny cartoon colors, witty comedic masterpiece, masterpiece meme, bold meme text vibe`;

    const seed = Math.floor(Math.random() * 9000000) + 1000000;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(memePrompt)}?width=768&height=768&model=flux&seed=${seed}&nologo=true`;

    const funnyCaption =
      bot === 'konpov'
        ? `ហាហា! រូប Meme តាមបញ្ជាឯងចេញមកហើយអាម៉ូយ ${username}! 🤣🤣 មើលមុខក្នុងរូបទៅដូចឯងពេលប្រឡងបាក់ឌុបចឹង! ចង់បានថែមមែនទេ? អត់មានទៀតទេអាអូន ព្រោះ ១ នាក់បានតែ ១ រូបគត់! 🔥`
        : `រូបភាព Meme តាមការចង់បានរបស់ប្អូន ${username} ត្រូវបានបង្កើតរួចរាល់ហើយ! 😂✨ សង្ឃឹមថាប្អូននឹងចូលចិត្ត! (បញ្ជាក់៖ កូតា ១ នាក់បានបង្កើតតែ ១ រូបគត់ សូមរក្សាទុករូបនេះឱ្យបានល្អណា៎!)`;

    // Alert Telegram of meme generation
    alertChatActivity({
      username,
      bot,
      ip: clientIp,
      userAgent: clientUserAgent,
      prompt: `🎨 [បង្កើត Meme Pure]: "${userIdea}" -> ${imageUrl}`,
      isError: false
    }).catch((e) => console.error('[Telegram] Meme alert error:', e));

    return Response.json(
      {
        success: true,
        imageUrl,
        memePrompt,
        caption: funnyCaption
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Meme generation error:', err);
    return Response.json(
      { success: false, error: err.message || 'Meme generation failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
