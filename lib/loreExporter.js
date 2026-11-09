// lib/loreExporter.js
// Dedicated SETEC Lore & AI Training Dataset Aggregator & Weekly Telegram Dispatcher
// Automatically collects user contributions, structures them into clean JSON & TXT training formats,
// and sends them directly to Rotana NOB on Telegram for review and future model training.

import { getCambodiaTime, parseUserAgent, sendTelegramDocument, sendTelegramMessage, TOPIC_KEYS } from './telegram.js';

const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

/**
 * Save user lore contribution into Firebase RTDB (/setec_lore_contributions/<id>.json)
 */
export async function saveLoreContribution({ username, category, content, bot, ip, userAgent }) {
  const now = Date.now();
  const loreId = `lore_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const timeFormatted = getCambodiaTime(new Date(now));
  const parsedUA = parseUserAgent(userAgent);

  const record = {
    id: loreId,
    username: username || 'Anonymous SETECer',
    category: category || 'SETEC Lore & Training',
    content: (content || '').trim(),
    bot: bot || 'General Chatbot',
    ip: ip || 'Unknown',
    device: parsedUA.summary,
    submittedAt: now,
    submittedAtCambodia: timeFormatted,
    submittedAtIso: new Date(now).toISOString(),
    status: 'pending_review'
  };

  try {
    const url = `${FIREBASE_DB_URL}/setec_lore_contributions/${loreId}.json`;
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(5000)
    });
    return { success: true, record };
  } catch (err) {
    console.error('[LoreExporter] Error saving lore contribution:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all lore contributions from Firebase RTDB
 */
export async function fetchLoreContributions() {
  try {
    const url = `${FIREBASE_DB_URL}/setec_lore_contributions.json`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== 'object') return [];

    const list = Object.values(data).filter(item => item && item.content);
    // Sort newest first
    list.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
    return list;
  } catch (err) {
    console.error('[LoreExporter] Error fetching lore:', err);
    return [];
  }
}

/**
 * Generate clean JSON training dataset format
 */
export function generateLoreJsonDataset(items = []) {
  const dataset = items.map((item, idx) => {
    return {
      index: idx + 1,
      id: item.id || `lore_${idx}`,
      category: item.category || 'SETEC Lore',
      contributor: item.username || 'Anonymous',
      submitted_at: item.submittedAtCambodia || item.submittedAtIso || 'Unknown',
      raw_lore_text: item.content || '',
      ai_training_prompt_pair: {
        instruction: `រៀបរាប់អំពីរឿងពិត វប្បធម៌ ឬ Lore នៅក្នុងវិទ្យាស្ថាន ស៊ីតិច (SETEC) ទាក់ទងនឹង ${item.category || 'ទូទៅ'}`,
        context: `SETEC Institute Community Lore - ប្រភពពីនិស្សិតផ្ទាល់`,
        output: item.content || ''
      },
      review_status: item.status || 'pending_review'
    };
  });

  return JSON.stringify(dataset, null, 2);
}

/**
 * Generate human-readable TXT review document for Rotana NOB
 */
export function generateLoreTextReview(items = []) {
  const nowKh = getCambodiaTime();
  const divider = '='.repeat(80);
  const subDivider = '-'.repeat(80);

  let text = `${divider}\n`;
  text += `📚 SETEC INSTITUTE LORE & AI TRAINING REVIEW DATASET\n`;
  text += `👑 គ្រប់គ្រងដោយ: Rotana NOB (Lead AI & Creator)\n`;
  text += `📅 កាលបរិច្ឆេទប្រមូលឯកសារ: ${nowKh}\n`;
  text += `📊 ចំនួនទិន្នន័យសរុប: ${items.length} រឿង\n`;
  text += `${divider}\n\n`;

  text += `📖 សេចក្តីណែនាំសម្រាប់ ROTANA NOB មុនយកទៅបង្រៀន AI (TRAINING WORKFLOW):\n`;
  text += `១. Review មើលរឿងនីមួយៗខាងក្រោម ពិនិត្យអក្ខរាវិរុទ្ធ និងភាពត្រឹមត្រូវនៃ Lore សាលា ស៊ីតិច។\n`;
  text += `២. លុបចេញនូវចំណុចណាដែលមិនសមរម្យ ឬជា Spam។\n`;
  text += `៣. កែសម្រួលរួច អាចយកទៅ append ចូលក្នុង \`app/prompts/communityLore.js\` ឬប្រើឯកសារ JSON ទៅ Fine-tune AI Model ដោយផ្ទាល់!\n\n`;

  items.forEach((item, idx) => {
    text += `${divider}\n`;
    text += `[រឿងទី ${idx + 1} / ${items.length}]\n`;
    text += `🆔 ID: ${item.id || 'N/A'}\n`;
    text += `👤 អ្នកចែករំលែក (Contributor): ${item.username || 'Anonymous'}\n`;
    text += `🏷️ ប្រធានបទ (Category): ${item.category || 'SETEC Lore'}\n`;
    text += `🤖 Bot: ${item.bot || 'General'}\n`;
    text += `⏰ កាលបរិច្ឆេទ: ${item.submittedAtCambodia || 'Unknown'}\n`;
    text += `📱 ឧបករណ៍: ${item.device || 'N/A'}\n`;
    text += `📝 ខ្លឹមសារ LORE សម្រាប់ AI TRAINING:\n`;
    text += `${subDivider}\n`;
    text += `${item.content}\n`;
    text += `${subDivider}\n\n`;
  });

  text += `${divider}\n`;
  text += `🏁 ចប់ឯកសារប្រមូលផ្ដុំទិន្នន័យ LORE ប្រចាំសប្ដាហ៍ (${items.length} រឿង)\n`;
  text += `${divider}\n`;

  return text;
}

/**
 * Dispatch weekly Lore JSON & TXT documents to Rotana NOB via Telegram (Topic 89: CONTRIBUTE)
 */
export async function sendWeeklyLoreToTelegram({ force = false } = {}) {
  const items = await fetchLoreContributions();

  if (items.length === 0) {
    await sendTelegramMessage(
      `📚 <b>របាយការណ៍ SETEC LORE ប្រចាំសប្ដាហ៍</b>\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `ℹ️ បច្ចុប្បន្នពុំទាន់មានទិន្នន័យ Lore ថ្មីពីអ្នកប្រើប្រាស់នៅឡើយទេ!`,
      TOPIC_KEYS.CONTRIBUTE
    );
    return { success: true, count: 0, message: 'No lore contributions found' };
  }

  const nowKh = getCambodiaTime();
  const dateSlug = new Date().toISOString().slice(0, 10);
  const jsonContent = generateLoreJsonDataset(items);
  const txtContent = generateLoreTextReview(items);

  // 1. Send JSON Training Dataset Document
  const jsonFileName = `setec_lore_dataset_${dateSlug}.json`;
  const jsonCaption =
    `📦 <b>SETEC LORE TRAINING DATASET (JSON FORMAT)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📊 <b>ចំនួនទិន្នន័យសរុប:</b> <b>${items.length} រឿង</b>\n` +
    `📅 <b>កាលបរិច្ឆេទ:</b> ${nowKh}\n` +
    `🎯 <b>គោលបំណង:</b> សម្រាប់បង <b>Rotana NOB</b> យកទៅ Train AI, Fine-tuning ឬ Import ចូលប្រព័ន្ធ!\n` +
    `💡 <i>ឯកសារមានរចនាសម្ព័ន្ធគូ Instruction/Output ស្អាតបាតរួចរាល់!</i>`;

  await sendTelegramDocument({
    fileBuffer: Buffer.from(jsonContent, 'utf-8'),
    fileName: jsonFileName,
    caption: jsonCaption,
    topicKey: TOPIC_KEYS.CONTRIBUTE
  });

  // 2. Send Human-Readable TXT Review Document
  const txtFileName = `SETEC_LORE_REVIEW_${dateSlug}.txt`;
  const txtCaption =
    `📝 <b>SETEC LORE FULL TEXT REVIEW (TXT FORMAT)</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📊 <b>ចំនួនទិន្នន័យសរុប:</b> <b>${items.length} រឿង</b>\n` +
    `📅 <b>កាលបរិច្ឆេទ:</b> ${nowKh}\n` +
    `🔍 <b>គោលបំណង:</b> សម្រាប់បង <b>Rotana NOB</b> បើកអាន និង Review ផ្ទាល់នៅលើទូរស័ព្ទដៃ ឬកុំព្យូទ័របានយ៉ាងស្រួល!\n` +
    `✍️ <i>Review ចប់ កែសម្រួលរួច យកមកដាក់បង្រៀន AI តែម្ដង!</i>`;

  await sendTelegramDocument({
    fileBuffer: Buffer.from(txtContent, 'utf-8'),
    fileName: txtFileName,
    caption: txtCaption,
    topicKey: TOPIC_KEYS.CONTRIBUTE
  });

  // Record export timestamp in RTDB
  try {
    await fetch(`${FIREBASE_DB_URL}/setec_lore_metadata/lastExport.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastExportedAt: Date.now(),
        lastExportedAtCambodia: nowKh,
        totalItemsExported: items.length
      })
    });
  } catch (e) {
    console.warn('[LoreExporter] Metadata update error:', e);
  }

  return { success: true, count: items.length };
}
