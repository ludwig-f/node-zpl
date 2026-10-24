import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // The command reference moved out of the docs
  async redirects() {
    return [
      { source: "/docs/commands", destination: "/reference", permanent: true },
    ];
  },
  // The playground runs code from shared links in a worker. Workers follow
  // their own script's policy, so this keeps that code from reaching other
  // servers, by fetch or by import(): it may only load the site's scripts
  // and run code with new Function.
  async headers() {
    return [
      {
        source: "/_next/static/chunks/:file(turbopack-worker-.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'none'",
          },
        ],
      },
    ];
  },
};

export default withMDX(config);
