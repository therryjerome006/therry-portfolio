import type { NextConfig } from "next";

function supabaseHostname() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

const storageHost = supabaseHostname();

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/famille", destination: "/realisations", permanent: true }];
  },
  experimental: {
    proxyClientMaxBodySize: "80mb",
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: storageHost
      ? [{ protocol: "https", hostname: storageHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
