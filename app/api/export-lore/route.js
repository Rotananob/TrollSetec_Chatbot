// app/api/export-lore/route.js
// API Endpoint for SETEC Lore Dataset Export & Telegram Weekly Dispatch
export const dynamic = 'force-dynamic';

import {
  fetchLoreContributions,
  generateLoreJsonDataset,
  generateLoreTextReview,
  sendWeeklyLoreToTelegram
} from '@/lib/loreExporter';
import { getCambodiaTime } from '@/lib/telegram';
import { verifyRotanaMasterCode, verifySessionBypassCode } from '@/lib/masterAuth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-rotana-passcode, x-rotana-bypass, *'
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'list';
  const passcode = req.headers.get('x-rotana-passcode') || req.headers.get('x-rotana-bypass') || searchParams.get('passcode') || '';

  // Ultra-Strict Access Control: Only Creator Rotana NOB or authenticated bypass can export lore datasets
  const isAuthorized = verifyRotanaMasterCode(passcode) || verifySessionBypassCode(passcode);
  if (!isAuthorized) {
    return Response.json(
      { success: false, error: 'Unauthorized: Access to system lore dataset is strictly restricted.' },
      { status: 403, headers: corsHeaders }
    );
  }

  try {
    // 1. Send Weekly Lore Directly to Rotana's Telegram
    if (action === 'telegram') {
      const result = await sendWeeklyLoreToTelegram({ force: true });
      return Response.json(
        {
          success: true,
          message: `បានផ្ញើឯកសារ Lore ប្រចាំសប្ដាហ៍ (${result.count} រឿង) ទៅកាន់ Telegram រួចរាល់!`,
          count: result.count,
          timestamp: getCambodiaTime()
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 2. Download JSON Dataset File
    if (action === 'download_json' || action === 'json') {
      const items = await fetchLoreContributions();
      const jsonContent = generateLoreJsonDataset(items);
      const dateSlug = new Date().toISOString().slice(0, 10);
      return new Response(jsonContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="setec_lore_dataset_${dateSlug}.json"`
        }
      });
    }

    // 3. Download Full Text Review File
    if (action === 'download_txt' || action === 'txt') {
      const items = await fetchLoreContributions();
      const txtContent = generateLoreTextReview(items);
      const dateSlug = new Date().toISOString().slice(0, 10);
      return new Response(txtContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="SETEC_LORE_REVIEW_${dateSlug}.txt"`
        }
      });
    }

    // 4. Default: Return list for Admin Panel UI
    const items = await fetchLoreContributions();
    return Response.json(
      {
        success: true,
        count: items.length,
        items,
        timestamp: getCambodiaTime()
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('[ExportLore] Error:', err);
    return Response.json(
      { success: false, error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req) {
  return GET(req);
}
