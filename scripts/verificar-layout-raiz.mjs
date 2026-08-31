#!/usr/bin/env node

/**
 * Fronteira estrutural do layout raiz.
 *
 * Os providers globais existentes expõem contratos leves e carregam os
 * respetivos runtimes apenas depois de sessão ou intenção. Esta alternativa
 * deliberada a route groups só é segura enquanto ninguém voltar a importar
 * Motion, Perfil, Supabase ou Stripe diretamente para a raiz — e enquanto um
 * provider novo não entrar sem uma decisão explícita neste allowlist.
 */

import { readFile } from "node:fs/promises";

const caminho = new URL("../src/app/layout.tsx", import.meta.url);
const fonte = await readFile(caminho, "utf8");

const PROVIDERS_PERMITIDOS = new Set([
  "AuthProvider",
  "SubscricaoProvider",
  "CoordenadorOverlays",
  "AvisosProvider",
  "ConfirmacaoProvider",
  "ControladorPrefetchFocos",
]);

const IMPORTS_PROIBIDOS = [
  "motion/react",
  "MotionProvider",
  "PerfilProvider",
  "@supabase/supabase-js",
  'from "stripe"',
  "from 'stripe'",
];

const falhas = [];
for (const marcador of IMPORTS_PROIBIDOS) {
  if (fonte.includes(marcador)) {
    falhas.push(`layout raiz importou «${marcador}».`);
  }
}

const providersMontados = new Set(
  [...fonte.matchAll(/<([A-Z][A-Za-z0-9]*Provider)\b/g)].map(
    (correspondencia) => correspondencia[1],
  ),
);
for (const provider of providersMontados) {
  if (!PROVIDERS_PERMITIDOS.has(provider)) {
    falhas.push(
      `provider global «${provider}» não está no allowlist; ` +
        "mover para a subtree certa ou documentar a decisão.",
    );
  }
}

if (falhas.length > 0) {
  console.error("[layout-raiz] fronteira estrutural violada:");
  for (const falha of falhas) console.error(`- ${falha}`);
  process.exitCode = 1;
} else {
  console.log(
    `[layout-raiz] ${providersMontados.size} providers leves permitidos; ` +
      "sem runtimes pesados diretos.",
  );
}
