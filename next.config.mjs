/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: [
    '172.20.10.2:3000',
    '172.20.10.2',
    'localhost:3000',
    '127.0.0.1:3000'
  ],
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
    ];
  },
};

export default nextConfig;
