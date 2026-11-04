import Script from 'next/script';
import VisitorTracker from '../components/VisitorTracker';
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
          href="https://fonts.googleapis.com/css2?family=Angkor&family=Kantumruy+Pro:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
        {/* FontAwesome */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        {/* Tailwind CDN */}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </head>
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        <VisitorTracker />
        {children}
        {/* Service Worker */}
        <Script id="service-worker-reg" strategy="lazyOnload">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then((reg) => {
                    console.log('PWA ServiceWorker registered with scope:', reg.scope);
                  })
                  .catch((err) => console.warn('PWA ServiceWorker registration failed:', err));
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
