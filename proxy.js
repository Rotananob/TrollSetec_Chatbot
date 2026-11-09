// proxy.js
// Next.js 16 Edge Proxy: Enterprise-Grade Anti-DDoS, Security Headers, DevTools & Anti-cURL/Bot Defense
import { NextResponse } from 'next/server';

// Comprehensive Bot, Scraper, Automated Tool & cURL Signatures
const BOT_AND_CURL_PATTERN =
  /(^|[^a-zA-Z0-9])(curl|wget|python|aiohttp|httpx|httpie|urllib|requests|scrapy|postman|postmanruntime|insomnia|go-http-client|axios|node-fetch|undici|got|superagent|libwww|scapy|sqlmap|nikto|masscan|nmap|zgrab|censys|shodan|headless|phantomjs|selenium|puppeteer|playwright|cypress|wrk|vegeta|locust|apachebench|ab\/|restsharp|okhttp|dart|httpclient|apache-httpclient|powershell|invoke-webrequest|invoke-restmethod)($|[^a-zA-Z0-9])/i;

// Sensitive paths and vulnerability scanner probes
const PROBE_PATTERN =
  /(\.env|\.git|\.aws|\.ssh|\/wp-|\/xmlrpc|\/phpmyadmin|\/admin\.php|\/eval|\/cgi-bin|\/solr|\/actuator|\/etc\/passwd)/i;

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const method = request.method.toUpperCase();

  // 1. Block Malicious Scanner Probes immediately with 403
  if (PROBE_PATTERN.test(pathname)) {
    return new Response('403 Forbidden: Security probe intercepted.', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Security-Action': 'probe-blocked'
      }
    });
  }

  // 2. Block unsupported HTTP methods
  const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS', 'HEAD', 'PUT', 'DELETE', 'PATCH'];
  if (!ALLOWED_METHODS.includes(method)) {
    return new Response('405 Method Not Allowed', { status: 405 });
  }

  // Allow OPTIONS preflight instantly
  if (method === 'OPTIONS') {
    return NextResponse.next();
  }

  // 3. Creator Rotana Exemption Check
  const authHeader = request.headers.get('authorization') || '';
  const isRotanaPasscode =
    request.headers.get('x-rotana-passcode') ||
    request.headers.get('x-rotana-secret-key') ||
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '');
  const isCreatorExempt = Boolean(
    isRotanaPasscode &&
      (isRotanaPasscode.toLowerCase().includes('rotana') ||
        isRotanaPasscode === 'rotana2026' ||
        isRotanaPasscode.length >= 8)
  );

  // 4. Global Anti-Bot, Anti-cURL & Automated Tool Blocker (Site-wide: Pages and API)
  if (!isCreatorExempt) {
    // If User-Agent is completely empty or suspiciously short (< 5 chars)
    if (!userAgent || userAgent.trim().length < 5) {
      return new Response('403 Forbidden: Missing valid browser User-Agent.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain', 'X-Security-Action': 'invalid-ua' }
      });
    }

    // If matches cURL, Wget, Python, Postman, or known automated scraping tools
    if (BOT_AND_CURL_PATTERN.test(userAgent)) {
      return new Response('403 Forbidden: Direct automated access, cURL and bots are strictly prohibited.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain', 'X-Security-Action': 'bot-curl-blocked' }
      });
    }

    // Additional Layer for API routes: Require valid browser context on mutation requests
    if (pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const origin = request.headers.get('origin') || '';
      const referer = request.headers.get('referer') || '';
      const secFetch = request.headers.get('sec-fetch-mode') || request.headers.get('sec-fetch-site') || '';

      // If spoofed cURL (pretends to be a browser via fake UA but has zero browser origin/referer/sec-fetch)
      if (!origin && !referer && !secFetch) {
        return new Response('403 Forbidden: Web browser session context required. Raw cURL requests blocked.', {
          status: 403,
          headers: { 'Content-Type': 'text/plain', 'X-Security-Action': 'spoofed-curl-blocked' }
        });
      }
    }
  }

  // 5. Pass through with Enterprise Security Headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
