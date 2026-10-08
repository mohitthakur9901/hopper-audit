/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/services", "@repo/database", "@repo/ui", "@repo/types"],
};

export default nextConfig;
