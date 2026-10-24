import { createMDX } from 'fumadocs-mdx/next';

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
};

export default withMDX(config);
