/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // whitelist directo
    domains: ["cdn.sanity.io", "images.sanitycdn.com"],
    // y por si tu build usa remotePatterns
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/files/**" },
      { protocol: "https", hostname: "images.sanitycdn.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  transpilePackages: [
    "sanity",
    "next-sanity",
    "@sanity/ui",
    "@sanity/vision",
    "styled-components",
  ],
  compiler: {
    styledComponents: true,
  },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
