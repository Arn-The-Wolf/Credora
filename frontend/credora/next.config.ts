import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker/self-host uses standalone; Vercel supplies its own Next.js runtime.
  ...(!process.env.VERCEL ? { output: "standalone" as const } : {}),
  images: {
    domains: ["s3-alpha-sig.figma.com"],
  },
};

export default nextConfig;
