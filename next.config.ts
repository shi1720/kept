import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // PayPal popup checkout needs the opener relationship preserved (never use "same-origin" here).
    return [{ source: "/:path*", headers: [{ key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }] }];
  },
};

export default nextConfig;
