/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
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
