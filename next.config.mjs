/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // O código de produção continua minificado e nunca publica source maps no
  // browser. É uma barreira de exposição, não uma promessa de impossibilidade
  // de engenharia reversa: JavaScript executado no cliente é sempre observável.
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

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

  // Garante que os ficheiros de fonte da imagem social (_og/*.ttf) viajam com
  // as funções das rotas Open Graph / Twitter. A imagem é estática (gerada no
  // build), mas isto mantém o `fs.readFile` robusto se alguma vez for renderizada
  // em runtime — sem isto, a fonte da casa cairia no fallback por omissão.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./src/app/_og/**"],
    "/twitter-image": ["./src/app/_og/**"],
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
    // Cabeçalhos de segurança aplicados a todas as respostas. A CSP é
    // deliberadamente conservadora: apenas `base-uri`/`object-src`/
    // `frame-ancestors` (sem `default-src`), para endurecer contra clickjacking,
    // injeção de <object>/<base> e frame hijacking SEM restringir origens de
    // scripts/estilos/imagens/ligações — assim não parte Stripe, Supabase,
    // mapas (OpenStreetMap/Leaflet) nem anúncios. Uma CSP estrita com nonces
    // pode vir depois, validada página a página.
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=()" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      // Reserva legível por máquina dos direitos de prospeção de texto e dados
      // (TDMRep / Art. 4.º, n.º 3 da Diretiva (UE) 2019/790).
      { key: "tdm-reservation", value: "1" },
      // noai/noimageai ainda não são diretivas universais; são uma camada
      // adicional e nunca substituem robots.txt, TDMRep nem controlo de acesso.
      { key: "X-Robots-Tag", value: "noai, noimageai" },
      {
        key: "Content-Security-Policy",
        value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
      },
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
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
      // Prova de propriedade do Search Console: uma linha de texto, não uma
      // página. Fora do índice para não entrar nos resultados como conteúdo
      // fino. Não interfere com a validação — o Google lê o ficheiro
      // diretamente, e `noindex` trava a indexação, não a leitura.
      {
        source: "/google3874ac9e9ed1ae13.html",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
