/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
