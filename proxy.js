// proxy.js
// Next.js 16 Edge Proxy: Enterprise-Grade Anti-DDoS, Security Headers & Bot Defense
import { NextResponse } from 'next/server';

// Known malicious user-agent signatures and automated scanner tools
const MALICIOUS_BOT_PATTERN =
  /python-requests|aiohttp|curl\/|wget|httpclient|postman|insomnia|go-http-client|axios|node-fetch|libwww|scapy|sqlmap|nikto|masscan|nmap|scrapy|zgrab|censys|shodan|headlesschrome|phantomjs|selenium|wrk|vegeta|locust|apachebench|ab\//i;

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
  const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS', 'HEAD'];
  if (!ALLOWED_METHODS.includes(method)) {
    return new Response('405 Method Not Allowed', { status: 405 });
  }

  // 3. Block Automated Scanner Tools on API endpoints (Creator Rotana is exempt)
  const isRotanaPasscode = request.headers.get('x-rotana-passcode');
  if (!isRotanaPasscode && pathname.startsWith('/api/')) {
    // If user-agent is completely empty or suspiciously short (< 4 chars)
    if (!userAgent || userAgent.trim().length < 4) {
      return new Response('403 Forbidden: Invalid User-Agent.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // If matches known hacker/bot tools
    if (MALICIOUS_BOT_PATTERN.test(userAgent)) {
      return new Response('403 Forbidden: Automated attack script detected.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }

  // 4. Pass through with Enterprise Security Headers
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
