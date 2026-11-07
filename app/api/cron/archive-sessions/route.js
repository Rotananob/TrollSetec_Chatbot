// app/api/cron/archive-sessions/route.js
import { checkAndExportInactiveSessions } from '@/lib/sessionManager';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const result = await checkAndExportInactiveSessions();
    return Response.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (err) {
    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  return GET(req);
}
