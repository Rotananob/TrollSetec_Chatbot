'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (!error) return;
    console.warn('[Silent Auto-Recover Global Error]:', error);

    // Completely silent auto-recovery: soft reset first, silent refresh if needed
    try {
      if (typeof reset === 'function') {
        reset();
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.replace(`${window.location.pathname}?recover=${Date.now()}`);
      }
    }
  }, [error, reset]);

  // NEVER render any visible green crash popup card or stack trace to users!
  return (
    <html lang="km">
      <head>
        <title>SETEC Chatbot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0c1015' }}>
        <div style={{ display: 'none' }} />
      </body>
    </html>
  );
}
