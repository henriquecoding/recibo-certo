/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Tree-shaking dirigido aos barrels mais pesados — evita arrastar o pacote
  // inteiro do `motion` para o bundle inicial.
  experimental: {
    optimizePackageImports: ["motion"],
  },

  // Remove console.log/info/debug do bundle de produção (mantém error/warn para
  // diagnóstico). Reduz JS enviado ao cliente sem afetar o desenvolvimento.
  compiler: {
    removeConsole: { exclude: ["error", "warn"] },
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },

  async redirects() {
    return [
      // O comparador mudou-se para a homepage (modo "Comparar Cenários").
      // 301 preserva o valor SEO do antigo URL indexado.
      {
        source: "/ferramentas/comparador",
        destination: "/?modo=comparar",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      // Páginas privadas — nunca indexar (layouts são Client Components,
      // não podem exportar metadata, então usamos HTTP header).
      {
        source: "/dashboard/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
