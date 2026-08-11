import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const raiz = process.cwd();
const falhas = [];

function ler(caminho) {
  const absoluto = resolve(raiz, caminho);
  if (!existsSync(absoluto)) {
    falhas.push(`Ficheiro obrigatório em falta: ${caminho}`);
    return "";
  }
  return readFileSync(absoluto, "utf8");
}

function exigir(condicao, mensagem) {
  if (!condicao) falhas.push(mensagem);
}

const ficheiros = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const pacote = JSON.parse(ler("package.json") || "{}");
exigir(pacote.private === true, "package.json deve manter private=true.");
exigir(pacote.license === "UNLICENSED", "package.json deve manter license=UNLICENSED.");
exigir(ficheiros.includes("LICENSE"), "LICENSE proprietária não pode ser removida.");
exigir(ficheiros.includes("SECURITY.md"), "SECURITY.md não pode ser removido.");
exigir(ficheiros.includes(".github/CODEOWNERS"), "CODEOWNERS não pode ser removido.");

const nextConfig = ler("next.config.mjs");
exigir(
  /productionBrowserSourceMaps\s*:\s*false/.test(nextConfig),
  "Source maps de produção têm de permanecer desativados.",
);
exigir(
  /poweredByHeader\s*:\s*false/.test(nextConfig),
  "O header de fingerprinting X-Powered-By deve permanecer desativado.",
);
exigir(
  /key:\s*["']tdm-reservation["'][\s\S]{0,80}value:\s*["']1["']/.test(nextConfig),
  "O header tdm-reservation: 1 está em falta.",
);

const tdm = JSON.parse(ler("public/.well-known/tdmrep.json") || "[]");
exigir(
  Array.isArray(tdm) &&
    tdm.some((regra) => regra.location === "/" && regra["tdm-reservation"] === 1),
  "TDMRep deve reservar direitos para todo o site.",
);

const robots = ler("src/app/robots.ts");
const politica = ler("src/lib/crawler-policy.ts");
const proxy = ler("src/proxy.ts");
const agentesEssenciais = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "CCBot",
];
for (const agente of agentesEssenciais) {
  exigir(politica.includes(`"${agente}"`), `Agente essencial removido da política: ${agente}`);
}
exigir(
  robots.includes("AGENTES_EXTRACAO_BLOQUEADOS") && robots.includes('disallow: "/"'),
  "robots.ts deixou de bloquear a lista central de crawlers.",
);
exigir(
  proxy.includes("agenteDeExtracaoBloqueado") && proxy.includes("status: 403"),
  "Proxy deixou de aplicar bloqueio HTTP aos crawlers declarados.",
);

// Local-first é uma fronteira de privacidade: o quiz corrige no browser, o
// modo gratuito não exige conta e não pode nascer uma API de sessões/respostas
// como falsa solução para esconder o banco público.
const readme = ler("README.md");
const privacidade = ler("src/app/privacidade/page.tsx");
const quizLocal = ler("src/hooks/useQuizFiscal.ts");
exigir(
  readme.includes("modo local é permanente") &&
    readme.includes("Não exigem conta"),
  "README deixou de declarar o modo local permanente e sem conta.",
);
exigir(
  privacidade.includes("não é necessário criar conta") &&
    privacidade.includes("não são transmitidos para os nossos servidores"),
  "Política de Privacidade deixou de garantir o modo gratuito local.",
);
exigir(
  quizLocal.includes("carregarBancoQuiz") &&
    quizLocal.includes("embaralharOpcoes"),
  "Quiz deixou de selecionar/corrigir localmente.",
);
exigir(
  !ficheiros.some((caminho) =>
    /^src\/app\/api\/quiz\/sessoes(?:\/|$)/.test(caminho),
  ),
  "Não criar API de sessões/respostas: o quiz deve permanecer local-first.",
);
exigir(
  !/fetch\s*\(\s*["'`]\/api\/quiz\/sessoes/.test(quizLocal),
  "Quiz local passou a enviar sessões/respostas para uma API.",
);

for (const caminho of ficheiros) {
  const normalizado = caminho.toLowerCase();

  const envPermitido =
    normalizado === ".env.example" ||
    normalizado === ".env.sample" ||
    normalizado === ".env.template";
  if (
    !envPermitido &&
    (normalizado === ".env" ||
      normalizado.startsWith(".env.") ||
      normalizado.includes("/.env") ||
      normalizado.endsWith("/.env"))
  ) {
    falhas.push(`Ficheiro de ambiente rastreado: ${caminho}`);
  }

  if (/\.(?:pem|key|p12|pfx|jks|keystore)$/i.test(caminho)) {
    falhas.push(`Material de chave rastreado: ${caminho}`);
  }

  if (normalizado.startsWith("public/") && normalizado.endsWith(".map")) {
    falhas.push(`Source map público rastreado: ${caminho}`);
  }
}

const fronteirasExplicitas = new Set([
  "src/lib/quiz-fiscal/server.ts",
  "src/lib/supabase/server-admin.ts",
  "src/lib/supabase/verify-request-admin.ts",
  "src/lib/documentos/emissao.ts",
  "src/lib/analytics/servidor.ts",
  "src/lib/stripe/server.ts",
  "src/lib/stripe/config.ts",
  "src/lib/email/server.ts",
  "src/lib/sms.ts",
  "src/lib/cron-auth.ts",
  "src/lib/lemonsqueezy/server.ts",
  "src/lib/lemonsqueezy/config.ts",
  "src/lib/fiz/config.ts",
]);

for (const caminho of ficheiros) {
  const exigeServidor =
    /^src\/lib\/.*\.server\.ts$/.test(caminho) ||
    fronteirasExplicitas.has(caminho);
  if (!exigeServidor) continue;
  const conteudo = ler(caminho);
  exigir(
    /import\s+["']server-only["'];/.test(conteudo),
    `Módulo privilegiado sem import server-only: ${caminho}`,
  );
}

const padroesSegredo = [
  ["chave privada", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["token GitHub clássico", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["token GitHub granular", /\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ["chave Stripe live", /\bsk_live_[A-Za-z0-9]{16,}\b/],
  ["segredo webhook Stripe", /\bwhsec_[A-Za-z0-9]{16,}\b/],
];

const extensoesTexto = /\.(?:[cm]?[jt]sx?|json|ya?ml|md|txt|html|css|scss|sql|py|toml|ini|conf|env|sh)$/i;
for (const caminho of ficheiros) {
  if (!extensoesTexto.test(caminho) && !["LICENSE", "Dockerfile"].includes(caminho)) continue;
  const conteudo = ler(caminho);
  for (const [nome, padrao] of padroesSegredo) {
    if (padrao.test(conteudo)) falhas.push(`Possível ${nome} em ${caminho}`);
  }
  if (/NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|AUTH_TOKEN|PASSWORD)/.test(conteudo)) {
    falhas.push(`Nome de variável pública parece conter segredo em ${caminho}`);
  }
}

if (falhas.length > 0) {
  console.error("\nFronteira de segurança reprovada:\n");
  for (const falha of [...new Set(falhas)]) console.error(`  - ${falha}`);
  console.error("\nCorrige as violações antes do merge.\n");
  process.exit(1);
}

console.log(
  `Fronteira de segurança aprovada: ${ficheiros.length} ficheiros verificados; ` +
    "licença, local-first, TDM, crawlers, source maps, segredos e módulos server-only intactos.",
);
