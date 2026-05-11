/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API base URL is needed by both server and client components.
  // Client components consume NEXT_PUBLIC_API_BASE_URL; server
  // components fall back to API_BASE_URL.
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      process.env.API_BASE_URL ??
      'http://localhost:3000',
  },
};

export default nextConfig;
