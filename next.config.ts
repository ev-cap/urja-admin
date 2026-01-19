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

  // Optimize CSS loading
  // This helps reduce CSS preload warnings by optimizing chunk splitting
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      // Optimize CSS chunk splitting in production
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: false,
            vendors: false,
            // Group CSS into a single chunk to reduce preload warnings
            styles: {
              name: 'styles',
              test: /\.(css|scss|sass)$/,
              chunks: 'all',
              enforce: true,
              priority: 20,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
