import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // samples/ and seed/ are read from disk by server actions.
  outputFileTracingIncludes: { "/*": ["./samples/**/*", "./seed/**/*"] },
};

export default nextConfig;
