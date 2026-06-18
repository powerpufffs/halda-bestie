/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the document parsers (and pdf-parse's pdfjs dependency) out of the
  // webpack bundle so they're required natively at runtime in the API route.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth"],
  },
};

export default nextConfig;
