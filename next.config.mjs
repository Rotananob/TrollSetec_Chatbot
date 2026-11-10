/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  allowedDevOrigins: [
    '172.20.10.2:3000',
    '172.20.10.2',
    'localhost:3000',
    '127.0.0.1:3000'
  ],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS, PUT, DELETE, PATCH' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-device-id, x-session-id, x-user-age, x-rotana-secret-key, x-rotana-bypass, x-rotana-passcode, x-bypass-code, X-Requested-With, Accept, Origin, Range, Cache-Control, *' },
          { key: 'Access-Control-Max-Age', value: '86400' }
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/index.html',
        destination: '/',
        permanent: true,
      },
      {
        source: '/KonBong.html',
        destination: '/KonBong',
        permanent: true,
      },
      {
        source: '/KonPov.html',
        destination: '/KonPov',
        permanent: true,
      },
      {
        source: '/KonKandal.html',
        destination: '/KonKandal',
        permanent: true,
      },
      {
        source: '/konkandal.html',
        destination: '/KonKandal',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/prompts/:path*',
        destination: '/_not-found',
      },
      {
        source: '/konbong',
        destination: '/KonBong',
      },
      {
        source: '/konpov',
        destination: '/KonPov',
      },
      {
        source: '/konkandal',
        destination: '/KonKandal',
      },
    ];
  },
};

export default nextConfig;
