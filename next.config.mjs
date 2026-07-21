/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "pub-04bf30e07d894ad6ad7d3c87f513e078.r2.dev" },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
