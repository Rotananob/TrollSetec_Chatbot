export const metadata = {
  title: 'SETEC Master Command Center - Rotana NOB',
  description: 'SETEC System Control & Security Operations Center by Rotana NOB',
  manifest: '/admin-manifest.webmanifest',
  applicationName: 'SETEC Admin',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SETEC Admin',
    startupImage: ['/img/icon.jpg']
  },
  icons: {
    icon: '/img/icon.jpg',
    shortcut: '/img/icon.jpg',
    apple: '/img/icon.jpg',
  },
};

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function JamTicKapeaLayout({ children }) {
  return children;
}
