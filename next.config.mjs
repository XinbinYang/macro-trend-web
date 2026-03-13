/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static export to fix build issues
  output: 'standalone',
  // Ensure trailing slashes for consistency
  trailingSlash: true,
  // Disable image optimization for static builds
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
