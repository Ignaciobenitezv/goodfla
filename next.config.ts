// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Esto solo ya suele alcanzar
    domains: ["cdn.sanity.io", "images.sanitycdn.com"],

    // Y esto cubre rutas por si tu Next ignora 'domains' en algún caso
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/files/**" },
      { protocol: "https", hostname: "images.sanitycdn.com", pathname: "/**" },
    ],

    formats: ["image/avif", "image/webp"],
  },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
