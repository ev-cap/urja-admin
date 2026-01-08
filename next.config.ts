import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Image optimization for external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.clerk.com',
      },
    ],
  },

  // Strict mode for better development experience
  reactStrictMode: true,
};

export default nextConfig;
