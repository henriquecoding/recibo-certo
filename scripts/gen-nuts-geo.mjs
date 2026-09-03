#!/usr/bin/env node
/**
 * FRONTEIRAS NUTS 2 DE PORTUGAL — alojadas aqui, não no GitHub de outrem.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO DEIXOU DE VIR DE `raw.githubusercontent.com`             │
 * │                                                                     │
 * │ Dois mapas do produto — o de regiões e o de «onde operar» — iam      │
 * │ buscar as fronteiras, EM RUNTIME E DO BROWSER DE CADA VISITANTE, a   │
 * │ `raw.githubusercontent.com/eurostat/Nuts2json/master/…`. Três        │
 * │ problemas, e nenhum deles dava erro no build:                        │
 * │                                                                     │
 * │  1. FIABILIDADE — um ramo `master` de um repositório de terceiros,   │
 * │     servido por um endpoint sem SLA e com limitação de débito. Se o  │
 * │     caminho mudar, os mapas partem em produção sem uma linha deste   │
 * │     lado ter mudado.                                                 │
 * │  2. CADEIA DE FORNECIMENTO — quem controlar aquele repositório       │
 * │     controla o que os mapas desenham.                                │
 * │  3. PRIVACIDADE — o IP de cada visitante chegava ao GitHub, que não  │
 * │     estava (nem podia estar) na lista de destinatários da política   │
 * │     de privacidade.                                                  │
 * │                                                                     │
 * │ O ficheiro de origem traz 328 regiões de toda a Europa (291 KB) e os │
 * │ dois componentes usavam SETE. Aqui filtram-se as sete e escreve-se   │
 * │ o resultado em `public/geo/`, com a proveniência lá dentro.          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   node scripts/gen-nuts-geo.mjs            escreve o ficheiro
 *   node scripts/gen-nuts-geo.mjs --check    confirma que está em dia
 *
 * O ficheiro gerado É PARA COMMITAR — é ele que a aplicação serve.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "public", "geo", "nuts2-pt.json");

/** A versão fica FIXADA. `master` é um alvo em movimento. */
const VERSAO = "v2/2021/4326/20M";
const ORIGEM = `https://raw.githubusercontent.com/eurostat/Nuts2json/master/pub/${VERSAO}/nutsrg_2.json`;

/**
 * As sete regiões NUTS 2 de Portugal na nomenclatura de 2021.
 *
 * O motor de descoberta trabalha com NOVE, porque a NUTS 2024 partiu a antiga
 * PT17 (Lisboa) em Grande Lisboa, Península de Setúbal e Oeste e Vale do Tejo.
 * A fronteira serve de referência visual; a resposta vem sempre do concelho
 * mais próximo. Ver a nota em `MapaOndeOperar.tsx`.
 */
const PT = ["PT11", "PT15", "PT16", "PT17", "PT18", "PT20", "PT30"];

const codigo = (f) => String(f.id ?? f.properties?.id ?? f.properties?.NUTS_ID ?? "");

async function gerar() {
  const resposta = await fetch(ORIGEM, {
    headers: { "User-Agent": "ReciboCertoNutsGeo/1.0" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!resposta.ok) throw new Error(`Eurostat/Nuts2json: HTTP ${resposta.status}`);
  const bruto = await resposta.json();

  const features = (bruto.features ?? []).filter((f) => PT.includes(codigo(f)));
  if (features.length !== PT.length) {
    const vistos = features.map(codigo).sort();
    throw new Error(
      `Esperavam-se ${PT.length} regiões de Portugal e vieram ${features.length}: ${vistos.join(", ")}. ` +
        "A origem mudou de forma — NÃO escrever o ficheiro sem perceber porquê.",
    );
  }

  // Ordem estável, para o `--check` comparar conteúdo e não a sorte do array.
  features.sort((a, b) => codigo(a).localeCompare(codigo(b)));

  return JSON.stringify(
    {
      type: "FeatureCollection",
      // A proveniência viaja DENTRO do ficheiro: quem o abrir daqui a dois
      // anos sabe de onde veio, de que versão, e que é gerado.
      _proveniencia: {
        fonte: "Eurostat — Nuts2json",
        origem: ORIGEM,
        versao: VERSAO,
        nomenclatura: "NUTS 2021",
        licenca: "© EuroGeographics para as fronteiras administrativas",
        regioes: PT,
        gerado: "node scripts/gen-nuts-geo.mjs",
      },
      features,
    },
    null,
    0,
  );
}

const conferir = process.argv.includes("--check");
let gerado;
try {
  gerado = await gerar();
} catch (erro) {
  // Rede indisponível não é o mesmo que ficheiro desatualizado. Um portão
  // que confunde as duas coisas ou reprova por causa do proxy de alguém, ou
  // deixa passar uma desatualização a fingir que foi a rede.
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  if (conferir) {
    console.warn(`  aviso· Não foi possível falar com o Eurostat (${mensagem}).`);
    console.warn("         Ficou POR VERIFICAR se as fronteiras estão em dia — não confundas com estarem bem.");
    process.exit(0);
  }
  console.error(`✗ ${mensagem}`);
  process.exit(1);
}

if (conferir) {
  let atual = "";
  try {
    atual = readFileSync(DESTINO, "utf8");
  } catch {
    console.error("✗ public/geo/nuts2-pt.json não existe. Corre `node scripts/gen-nuts-geo.mjs`.");
    process.exit(1);
  }
  if (atual !== gerado) {
    console.error("✗ public/geo/nuts2-pt.json está desatualizado face ao Eurostat. Corre o gerador.");
    process.exit(1);
  }
  console.log(`✓ Fronteiras NUTS 2 em dia — ${PT.length} regiões, ${(atual.length / 1024).toFixed(1)} KB.`);
} else {
  mkdirSync(dirname(DESTINO), { recursive: true });
  writeFileSync(DESTINO, gerado, "utf8");
  console.log(`✓ public/geo/nuts2-pt.json escrito — ${PT.length} regiões, ${(gerado.length / 1024).toFixed(1)} KB.`);
}
