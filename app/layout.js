import Script from 'next/script';
import VisitorTracker from '../components/VisitorTracker';
import PwaInstallPrompt from '../components/PwaInstallPrompt';
import SystemBroadcast from '../components/SystemBroadcast';
import './globals.css';

export const metadata = {
  title: 'ជ្រើសរើស Roastbot - SETEC',
  description: 'SETEC Meme & AI Roastbot by Rotana NOB',
  manifest: '/manifest.webmanifest',
  applicationName: 'SETEC Roastbot',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SETEC Roastbot',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/img/icon.jpg',
    shortcut: '/img/icon.jpg',
    apple: '/img/icon.jpg',
  },
};

export const viewport = {
  themeColor: '#0ea5e9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="km">
      <head>
        {/* Anti-Zoom Viewport Meta for iOS Mobile App Native Feel */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        {/* Google Analytics */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-7SYP7RZ59L"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7SYP7RZ59L');
          `}
        </Script>
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Angkor&family=Kantumruy+Pro:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* FontAwesome */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        {/* Ultra Stealth Security Shield: Silent Anti-Inspect, Anti-F12, Anti-DevTools Block (Zero Alerts) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // 1. Silent ContextMenu (Right-Click) Block - Absolute Zero Alerts
                function preventEvent(e) {
                  if (e && e.preventDefault) e.preventDefault();
                  if (e && e.stopPropagation) e.stopPropagation();
                  return false;
                }
                window.addEventListener('contextmenu', preventEvent, true);
                document.addEventListener('contextmenu', preventEvent, true);
                try { document.oncontextmenu = preventEvent; } catch(err) {}

                // 2. Comprehensive Shortcut Block: F12, Ctrl+U, Ctrl+Shift+I/J/C/K/E/S/M, Cmd+Opt+I/J/C/U, Shift+F10, ContextMenu
                window.addEventListener('keydown', function(e) {
                  var isCtrlOrCmd = e.ctrlKey || e.metaKey;
                  var isShift = e.shiftKey;
                  var isAlt = e.altKey;
                  var key = (e.key || '').toLowerCase();
                  var code = (e.code || '').toLowerCase();
                  var keyCode = e.keyCode || e.which;

                  // Standalone F12, ContextMenu key, Shift+F10
                  if (
                    key === 'f12' || code === 'f12' || keyCode === 123 ||
                    key === 'contextmenu' || code === 'contextmenu' ||
                    (isShift && (key === 'f10' || code === 'f10' || keyCode === 121))
                  ) {
                    return preventEvent(e);
                  }

                  if (isCtrlOrCmd) {
                    // Ctrl/Cmd + Shift + [I, J, C, K, E, S, M]
                    if (
                      isShift &&
                      (['i', 'j', 'c', 'k', 'e', 's', 'm'].indexOf(key) !== -1 ||
                       ['keyi', 'keyj', 'keyc', 'keyk', 'keye', 'keys', 'keym'].indexOf(code) !== -1 ||
                       [73, 74, 67, 75, 69, 83, 77].indexOf(keyCode) !== -1)
                    ) {
                      return preventEvent(e);
                    }

                    // Ctrl/Cmd + [U, S, P, H] (View Source, Save Page, Print Dump, History)
                    if (
                      ['u', 's', 'p', 'h'].indexOf(key) !== -1 ||
                      ['keyu', 'keys', 'keyp', 'keyh'].indexOf(code) !== -1 ||
                      [85, 83, 80, 72].indexOf(keyCode) !== -1
                    ) {
                      return preventEvent(e);
                    }

                    // Alt/Option + Cmd/Ctrl + [I, J, C, U]
                    if (
                      isAlt &&
                      (['i', 'j', 'c', 'u'].indexOf(key) !== -1 ||
                       ['keyi', 'keyj', 'keyc', 'keyu'].indexOf(code) !== -1 ||
                       [73, 74, 67, 85].indexOf(keyCode) !== -1)
                    ) {
                      return preventEvent(e);
                    }
                  }
                }, true);

                // 3. Prevent dragging images / anchors
                window.addEventListener('dragstart', function(e) {
                  if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'A')) {
                    return preventEvent(e);
                  }
                }, true);

                // 4. Silent Console Neutralization
                try {
                  var noop = function() {};
                  window.console.log = noop;
                  window.console.warn = noop;
                  window.console.error = noop;
                  window.console.info = noop;
                  window.console.debug = noop;
                  window.console.dir = noop;
                  window.console.table = noop;
                  window.console.trace = noop;
                  window.console.clear();
                  setInterval(function() {
                    try { window.console.clear(); } catch(err) {}
                  }, 1500);
                } catch(err) {}

                // 5. Silent Anti-Debugger Trap: Freezes DevTools on constructor evaluation
                try {
                  var devtoolsHits = 0;
                  setInterval(function() {
                    try {
                      var start = performance.now();
                      (function() {}['constructor']('debugger')());
                      var duration = performance.now() - start;
                      if (duration > 150) {
                        devtoolsHits++;
                        if (devtoolsHits >= 2) {
                          document.body.innerHTML = '';
                          window.location.replace('about:blank');
                        }
                      } else {
                        devtoolsHits = 0;
                      }
                    } catch(err) {}
                  }, 400);
                } catch(err) {}
              })();
            `,
          }}
        />
        {/* Anti-FOUC & Anti-Highlighting Critical CSS */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *, *::before, *::after { box-sizing: border-box; }
              html, body {
                margin: 0;
                padding: 0;
                background-color: #f0f9ff;
                font-family: 'Kantumruy Pro', system-ui, -apple-system, sans-serif;
                overflow-x: hidden;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
              }
              input, textarea, [contenteditable="true"] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
              }
              .hidden, input[type="file"].hidden { display: none !important; }
              img { max-width: 100%; height: auto; }
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        <VisitorTracker />
        <PwaInstallPrompt />
        <SystemBroadcast />
        {children}
        {/* Service Worker Registration */}
        <Script id="service-worker-register" strategy="afterInteractive">
          {`
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function() {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
