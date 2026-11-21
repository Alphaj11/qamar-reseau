import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise l'ouverture des pages depuis un téléphone sur le même Wi-Fi (développement)
  allowedDevOrigins: ["192.168.1.16"],
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // L'affiche et les pages ne doivent pas être intégrées dans un autre site (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
