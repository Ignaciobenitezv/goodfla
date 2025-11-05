// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // CDN clásico de Sanity
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/**" },
      // Algunos proyectos nuevos usan este host
      { protocol: "https", hostname: "images.sanitycdn.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
