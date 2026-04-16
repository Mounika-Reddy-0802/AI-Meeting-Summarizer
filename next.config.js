/** @type {import('next').NextConfig} */
const isStaticBuild = process.env.BUILD_TARGET === 'static';

module.exports = {
  ...(isStaticBuild ? { output: 'export' } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    ZOOM_SDK_KEY: process.env.ZOOM_SDK_KEY,
    ZOOM_SDK_SECRET: process.env.ZOOM_SDK_SECRET,
    ZOOM_ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID,
    ZOOM_S2S_CLIENT_ID: process.env.ZOOM_S2S_CLIENT_ID,
    ZOOM_S2S_CLIENT_SECRET: process.env.ZOOM_S2S_CLIENT_SECRET,
  },
};