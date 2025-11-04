/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    'sanity',
    'next-sanity',
    '@sanity/ui',
    '@sanity/vision',
    'styled-components'
  ],
  compiler: {
    styledComponents: true
  }
};

export default nextConfig;
