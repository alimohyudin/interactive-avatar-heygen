/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // Your existing rewrites...
      ],
      afterFiles: [
        // Your existing rewrites...
      ],
      fallback: [
        // Your existing fallback rewrites...
        {
          source: '/static.heygen.ai/static/streaming.proto',
          destination: 'https://static.heygen.ai/static/streaming.proto',
        },
      ],
    }
  },
}

export default nextConfig
