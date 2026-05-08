/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['ws'],
  experimental: {
    serverActions: { bodySizeLimit: '10mb' }
  }
};
module.exports = nextConfig;
