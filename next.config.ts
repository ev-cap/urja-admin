import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable typed routes for type-safe navigation
  experimental: {
    typedRoutes: true,
  },

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
