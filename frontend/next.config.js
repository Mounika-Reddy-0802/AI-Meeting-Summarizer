/** @type {import('next').NextConfig} */
const isStaticBuild = process.env.BUILD_TARGET === 'static';

module.exports = {
  ...(isStaticBuild ? { output: 'export' } : {}),
  images: { unoptimized: true },
  trailingSlash: true,
};
