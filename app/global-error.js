'use client';

import { useEffect, useState } from 'react';

export default function GlobalError({ error, reset }) {
  const [details, setDetails] = useState('');

  useEffect(() => {
    console.error('Captured Global Error:', error);
    setDetails(error?.stack || error?.message || String(error));
  }, [error]);

  const handleHardReset = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
      } catch {}
      window.location.reload();
    }
  };

  return (
    <html lang="km">
      <head>
        <title>SETEC System Recovery</title>
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
              background-color: #030d08;
              color: #ecfdf5;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .card {
              max-width: 480px;
              width: 100%;
              background: #061910;
              border: 1px solid rgba(16, 185, 129, 0.4);
              border-radius: 24px;
              padding: 24px;
              text-align: center;
              box-shadow: 0 0 60px rgba(16, 185, 129, 0.2);
            }
            .icon-box {
              width: 56px;
              height: 56px;
              margin: 0 auto 16px;
              border-radius: 16px;
              background: rgba(16, 185, 129, 0.15);
              border: 1px solid rgba(52, 211, 153, 0.4);
              color: #34d399;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
            }
            h2 { font-size: 18px; margin: 0 0 8px; color: #a7f3d0; }
            p { font-size: 13px; color: #6ee7b7; margin: 0 0 16px; line-height: 1.5; }
            pre {
              background: #020805;
              border: 1px solid #064e3b;
              padding: 12px;
              border-radius: 12px;
              font-size: 11px;
              text-align: left;
              color: #a7f3d0;
              max-height: 160px;
              overflow-x: auto;
              margin-bottom: 20px;
              white-space: pre-wrap;
              word-break: break-all;
            }
            .btn-group { display: flex; gap: 10px; }
            .btn {
              flex: 1;
              padding: 12px;
              border-radius: 12px;
              font-size: 13px;
              font-weight: bold;
              cursor: pointer;
              border: none;
              transition: opacity 0.2s;
            }
            .btn:active { transform: scale(0.98); }
            .btn-secondary { background: #064e3b; color: #a7f3d0; }
            .btn-primary { background: #059669; color: #ffffff; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
          `
        }} />
      </head>
      <body>
        <div className="card">
          <div className="icon-box">
            <i className="fas fa-shield-halved"></i>
          </div>
          <h2>ប្រព័ន្ធកំពុងសម្រួលទិន្នន័យ (Recovery Mode)</h2>
          <p>កម្មវិធីបានជួបប្រទះបញ្ហាក្នុងការផ្ទុក Script ឬ Cache ចាស់ សូមចុចប៊ូតុងខាងក្រោមដើម្បីសម្អាត Cache និងផ្ទុកឡើងវិញ៖</p>
          
          {details && <pre>{details}</pre>}

          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => reset()}>
              ព្យាយាមម្ដងទៀត
            </button>
            <button className="btn btn-primary" onClick={handleHardReset}>
              សម្អាត Cache & Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
