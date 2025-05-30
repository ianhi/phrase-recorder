/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true
  },
  // // Configure for GitHub Pages deployment
  basePath: process.env.NODE_ENV === 'production' ? '/phrase-recorder' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/phrase-recorder/' : '',
  
  // Ensure static export works properly
  experimental: {
    esmExternals: 'loose'
  }
}

export default nextConfig
