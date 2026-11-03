import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'ជ្រើសរើស Chatbot - SETEC',
  description: 'SETEC Meme & AI Chatbot by Rotana NOB',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/img/icon.jpg',
    shortcut: '/img/icon.jpg',
    apple: '/img/icon.jpg',
  },
};

export const viewport = {
  themeColor: '#0ea5e9',
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
      <body>
        {children}
        {/* Service Worker */}
        <Script id="service-worker-reg" strategy="lazyOnload">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('SW registered'))
                .catch(e => console.warn('SW failed', e));
            }
          `}
        </Script>
      </body>
    </html>
  );
}
