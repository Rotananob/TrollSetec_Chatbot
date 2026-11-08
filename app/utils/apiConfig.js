// app/utils/apiConfig.js
// Automatically resolves API endpoints based on the active domain

export function getApiEndpoint(endpoint) {
  // If explicitly configured in environment variable, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}${endpoint}`;
  }

  // When running on Firebase Hosting (*.web.app or *.firebaseapp.com),
  // forward API requests to the production Vercel backend which runs 24/7 with full CORS
  if (typeof window !== 'undefined') {
    const host = (window.location.hostname || '').toLowerCase();
    if (host.includes('web.app') || host.includes('firebaseapp.com')) {
      return `https://troll-setec-chatbot.vercel.app${endpoint}`;
    }
  }

  // Localhost or Vercel default relative path
  return endpoint;
}
