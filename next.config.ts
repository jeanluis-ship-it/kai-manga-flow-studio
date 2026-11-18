import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Conserve 100% of the approved animated landing while /studio is rewritten as React.
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/landing/index.html' }],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [{
      source: '/studio',
      headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
    }];
  },
};
export default nextConfig;
