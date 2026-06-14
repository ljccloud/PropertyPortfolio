import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow Server Actions from both local dev and any Vercel deployment
      allowedOrigins: [
        'localhost:3000',
        '*.vercel.app',
      ],
    },
  },
};

export default nextConfig;
