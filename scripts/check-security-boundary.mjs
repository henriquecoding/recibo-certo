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

const securityTxt = ler("public/.well-known/security.txt");
exigir(
  securityTxt.includes("Contact: mailto:recibocerto.pt@gmail.com") &&
    securityTxt.includes("Canonical: https://www.recibocerto.pt/.well-known/security.txt"),
  "security.txt deve manter contacto e URL canónica.",
);
const expiraSecurityTxt = securityTxt.match(/^Expires:\s*(.+)$/m)?.[1]?.trim();
exigir(
  Boolean(expiraSecurityTxt) &&
    Number.isFinite(Date.parse(expiraSecurityTxt)) &&
    Date.parse(expiraSecurityTxt) > Date.now(),
  "security.txt está sem validade ou expirou; renovar a data Expires.",
);

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

// Proteger conteúdo não pode tornar o site invisível: a homepage deve continuar
// indexável e elegível para snippets/previews completos nos motores tradicionais.
const layout = ler("src/app/layout.tsx");
exigir(
  /robots:\s*\{[\s\S]{0,300}index:\s*true[\s\S]{0,120}follow:\s*true/.test(layout),
  "Metadata global deixou de permitir indexação e seguimento.",
);
exigir(
  layout.includes('"max-image-preview": "large"') &&
    layout.includes('"max-video-preview": -1') &&
    layout.includes('"max-snippet": -1') &&
    !layout.includes('"max-image-preview": "none"') &&
    !layout.includes('"max-snippet": 0'),
  "SEO global deve permitir snippets e previews completos; proteção de IA pertence à política de crawlers/TDM.",
);

const vercel = JSON.parse(ler("vercel.json") || "{}");
exigir(
  vercel?.git?.deploymentEnabled?.["agent/**"] === false &&
    vercel?.git?.deploymentEnabled?.["dependabot/**"] === false,
  "Previews Vercel de branches agent/** e dependabot/** devem permanecer desativados.",
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
// ┌─────────────────────────────────────────────────────────────────────┐
// │ TREINO E RESPOSTA SÃO DUAS LISTAS, E O PORTÃO GUARDA AS DUAS         │
// │                                                                     │
// │ Antes, este bloco exigia que TODOS os agentes — incluindo os         │
// │ motores de resposta — estivessem na lista de bloqueados. Era o       │
// │ portão a impor a decisão errada: enquanto vigorasse, qualquer        │
// │ tentativa de reabrir a citação em ChatGPT Search ou Perplexity       │
// │ reprovava aqui, e o programa de autoridade não tinha por onde        │
// │ existir.                                                            │
// │                                                                     │
// │ Passa a verificar o que interessa mesmo: que o TREINO continua       │
// │ bloqueado, que a RESPOSTA continua permitida, e que as duas listas   │
// │ não se cruzam. Um agente que apareça nas duas é uma decisão por      │
// │ tomar, não uma configuração válida.                                  │
// └─────────────────────────────────────────────────────────────────────┘
const treinoEssencial = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "CCBot",
  "Bytespider",
];
const respostaEssencial = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

const bloco = (nome) => {
  const i = politica.indexOf(`export const ${nome} = [`);
  if (i < 0) return "";
  return politica.slice(i, politica.indexOf("] as const;", i));
};
const blocoBloqueados = bloco("AGENTES_EXTRACAO_BLOQUEADOS");
const blocoPermitidos = bloco("AGENTES_RESPOSTA_PERMITIDOS");

exigir(blocoBloqueados.length > 0, "A lista AGENTES_EXTRACAO_BLOQUEADOS desapareceu da política.");
exigir(blocoPermitidos.length > 0, "A lista AGENTES_RESPOSTA_PERMITIDOS desapareceu da política.");

for (const agente of treinoEssencial) {
  exigir(
    blocoBloqueados.includes(`"${agente}"`),
    `Agente de TREINO fora da lista de bloqueados: ${agente}`,
  );
  exigir(
    !blocoPermitidos.includes(`"${agente}"`),
    `Agente de treino na lista de permitidos: ${agente}`,
  );
}
for (const agente of respostaEssencial) {
  exigir(
    blocoPermitidos.includes(`"${agente}"`),
    `Motor de RESPOSTA fora da lista de permitidos: ${agente}`,
  );
  exigir(
    !blocoBloqueados.includes(`"${agente}"`),
    `Motor de resposta na lista de bloqueados — o programa de autoridade deixa de poder existir: ${agente}`,
  );
}

exigir(
  robots.includes("AGENTES_EXTRACAO_BLOQUEADOS") && robots.includes('disallow: "/"'),
  "robots.ts deixou de bloquear a lista central de crawlers.",
);
exigir(
  robots.includes("AGENTES_RESPOSTA_PERMITIDOS"),
  "robots.ts deixou de declarar os motores de resposta.",
);
exigir(
  proxy.includes("agenteDeExtracaoBloqueado") && proxy.includes("status: 403"),
  "Proxy deixou de aplicar bloqueio HTTP aos crawlers declarados.",
);
// O `/llms.txt` diz a um modelo COMO citar. Recusá-lo a quem ele se dirige é
// a contradição que este portão passa a impedir.
exigir(
  proxy.includes('"/llms.txt"'),
  "O proxy voltou a recusar o /llms.txt aos agentes a quem ele se dirige.",
);

// Local-first é uma fronteira de privacidade: o quiz corrige no browser, o
// modo gratuito não exige conta e não pode nascer uma API de sessões/respostas
// como falsa solução para esconder o banco público.
const readme = ler("README.md");
const privacidade = ler("src/app/privacidade/page.tsx");
const quizLocal = ler("src/hooks/useQuizFiscal.ts");
const textoPlano = (valor) =>
  valor.replace(/[*_`]/g, "").replace(/\s+/g, " ").toLocaleLowerCase("pt-PT");
const readmePlano = textoPlano(readme);
const privacidadePlana = textoPlano(privacidade);
exigir(
  readmePlano.includes("modo local é permanente") &&
    readmePlano.includes("não exigem conta"),
  "README deixou de declarar o modo local permanente e sem conta.",
);
exigir(
  privacidadePlana.includes("não é necessário criar conta") &&
    privacidadePlana.includes("não são transmitidos para os nossos servidores"),
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
