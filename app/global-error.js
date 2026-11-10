'use client';

import { useEffect, useState } from 'react';

export default function GlobalError({ error, reset }) {
  const [details, setDetails] = useState('');

  useEffect(() => {
    console.error('Captured Global Error:', error);
    const errText = `${error?.name || 'Error'}: ${error?.message || ''}\n${error?.stack || String(error)}`;
    setDetails(errText);

    // Auto-heal ChunkLoadError or dynamic import mismatch after new deployments
    if (typeof window !== 'undefined') {
      const isChunkError = /chunk|loading|import|failed to fetch|dynamically imported/i.test(errText);
      const lastRetry = parseInt(sessionStorage.getItem('setec_chunk_auto_retry') || '0', 10);
      const now = Date.now();
      if (isChunkError && (!lastRetry || now - lastRetry > 15000)) {
        sessionStorage.setItem('setec_chunk_auto_retry', String(now));
        const target = `${window.location.pathname}?v=${now}`;
        window.location.replace(target);
      }
    }
  }, [error]);

  const handleHardRefresh = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((r) => r.unregister());
          });
        }
      } catch {}
      window.location.replace(`${window.location.pathname}?refresh=${Date.now()}`);
    }
  };

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.replace(`/?fresh=${Date.now()}`);
    }
  };

  return (
    <html lang="km">
      <head>
        <title>SETEC</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style dangerouslySetInnerHTML={{
          __html: `
            body {
              margin: 0;
              padding: 16px;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #082215;
              color: #fbf8f2;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .card {
              max-width: 440px;
              width: 100%;
              background: #0d3822;
              border: 1px solid #25613e;
              border-radius: 20px;
              padding: 24px;
              text-align: center;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
            }
            .logo-img {
              width: 56px;
              height: 56px;
              margin: 0 auto 14px;
              border-radius: 16px;
              object-fit: cover;
              border: 2px solid #fbf8f2;
              display: block;
            }
            .badge {
              display: inline-block;
              font-size: 10px;
              font-weight: 700;
              color: #0d3822;
              background: #fbf8f2;
              border: 1px solid #e4d9c4;
              padding: 4px 12px;
              border-radius: 9999px;
              margin-bottom: 8px;
            }
            h2 { font-size: 17px; margin: 0 0 6px; color: #fbf8f2; font-weight: 700; }
            p { font-size: 12px; color: #d7ccb7; margin: 0 0 16px; line-height: 1.5; }
            pre {
              background: #092818;
              border: 1px solid #1c4d32;
              padding: 10px;
              border-radius: 12px;
              font-size: 10px;
              text-align: left;
              color: #d7ccb7;
              max-height: 120px;
              overflow-x: auto;
              margin-bottom: 16px;
              white-space: pre-wrap;
              word-break: break-all;
            }
            .btn-group { display: flex; gap: 8px; }
            .btn {
              padding: 12px 14px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 700;
              cursor: pointer;
              border: none;
              transition: opacity 0.2s;
            }
            .btn:active { transform: scale(0.98); }
            .btn-secondary { background: transparent; color: #fbf8f2; border: 1px solid #2d6c46; flex: 1; }
            .btn-primary { background: #fbf8f2; color: #0d3822; flex: 2; border: 1px solid #e4d9c4; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          `
        }} />
      </head>
      <body>
        <div className="card">
          <img src="/img/icon.jpg" alt="SETEC" className="logo-img" />
          <div className="badge">វិទ្យាស្ថាន ស៊ីតិច</div>
          <h2>ប្រព័ន្ធកំពុងសម្រួលទិន្នន័យ</h2>
          <p>កម្មវិធីត្រូវការផ្ទុកកំណែទម្រង់ថ្មីចុងក្រោយ សូមចុចប៊ូតុងខាងក្រោមដើម្បីផ្ទុកទំព័រឡើងវិញ</p>
          
          {details && <pre>{details}</pre>}

          <div className="btn-group">
            <button className="btn btn-secondary" onClick={handleGoHome}>
              ទៅទំព័រដើម
            </button>
            <button className="btn btn-primary" onClick={handleHardRefresh}>
              ផ្ទុកទំព័រឡើងវិញ
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
