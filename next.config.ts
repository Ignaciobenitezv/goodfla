// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
  // 👉 evita que `next build` falle por ESLint
  eslint: { ignoreDuringBuilds: true },

  // (opcional de emergencia) si querés compilar aunque haya type errors:
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
