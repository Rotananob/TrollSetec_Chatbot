import Script from 'next/script';
import VisitorTracker from '../components/VisitorTracker';
import PwaInstallPrompt from '../components/PwaInstallPrompt';
import SystemBroadcast from '../components/SystemBroadcast';
import './globals.css';

export const metadata = {
  title: 'ជ្រើសរើស Chatbot - SETEC',
  description: 'SETEC Meme & AI Chatbot by Rotana NOB',
  manifest: '/manifest.webmanifest',
  applicationName: 'SETEC Chat',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SETEC Chat',
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
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="km">
      <head>
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
        {/* Anti-FOUC Critical CSS */}
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
        {/* Service Worker Registration for PWA Installability */}
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
