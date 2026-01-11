/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 서버 사이드에서만 사용하는 패키지들
      config.externals = config.externals || []
    }
    return config
  },
}

module.exports = nextConfig
