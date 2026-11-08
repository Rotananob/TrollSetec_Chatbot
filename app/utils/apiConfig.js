// app/utils/apiConfig.js
// Automatically resolves API endpoints based on the active domain

export function getApiEndpoint(endpoint) {
  // If explicitly configured in environment variable, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}${endpoint}`;
  }

  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').toLowerCase();
    // Only local development environments use relative endpoints
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return endpoint;
    }
    // All production platforms (Firebase Hosting, PWA standalone, mobile WebAPK, custom domain)
    // must reliably route to the production 24/7 Vercel API backend with full CORS!
    return `https://troll-setec-chatbot.vercel.app${endpoint}`;
  }

  return endpoint;
}
