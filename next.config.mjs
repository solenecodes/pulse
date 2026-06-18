/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    qualities: [70, 75, 100]
  },
  serverExternalPackages: ["@prisma/client", "prisma", "@github/copilot-sdk"]
};

export default nextConfig;
