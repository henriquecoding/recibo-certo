#!/usr/bin/env node
/**
 * OS 308 CONCELHOS, DERIVADOS DA FONTE E NÃO ESCRITOS À MÃO
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO É GERADO E NÃO DIGITADO                                  │
 * │                                                                     │
 * │ O código territorial do INE é hierárquico: os primeiros caracteres  │
 * │ SÃO a NUTS II. `1B01503` (Almada) começa por `1B`; `1C11513`        │
 * │ (Sines) começa por `1C`. Escrever o mapa concelho → região à mão    │
 * │ seria pedir o erro que este repositório já cometeu uma vez —        │
 * │ presumir que `11A` era Grande Lisboa quando é a Área Metropolitana  │
 * │ do Porto.                                                            │
 * │                                                                     │
 * │ Distritos atravessam NUTS II, e é a razão pela qual «distrito»      │
 * │ nunca serviu: Sines e Grândola são Alentejo apesar de Setúbal;      │
 * │ Torres Vedras é Oeste apesar de Lisboa; Alcobaça e Peniche são      │
 * │ Oeste apesar de Leiria. O código resolve-os sem uma única exceção   │
 * │ escrita — e corrige-nos quando estamos enganados: o comentário de   │
 * │ `bulk/geografia-concelhos.ts` dá Mafra como Oeste, e em NUTS 2024   │
 * │ o INE publica-a como `1A01109`, Grande Lisboa. Derivar da fonte     │
 * │ apanhou isso; transcrever à mão tê-lo-ia propagado.                  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   node scripts/gen-concelhos.mjs           escreve o ficheiro
 *   node scripts/gen-concelhos.mjs --check   falha se estiver desatualizado
 *
 * Fonte: INE, metainformação do indicador 0014449 (Empresas por
 * Localização geográfica NUTS 2024 e Atividade económica). A dimensão
 * geográfica é a mesma em 0012918 (População residente), e o gerador
 * confronta as duas — se divergirem, os rácios sairiam errados por
 * concelhos inteiros e ninguém daria por isso.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DESTINO = join(AQUI, "..", "src", "lib", "negocio", "market", "concelhos.ts");

const META = (indicador) =>
  `https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=${indicador}&lang=PT`;

/** Nível 5 da dimensão geográfica: exatamente os 308 concelhos. */
const NIVEL_CONCELHO = "5";

async function concelhosDe(indicador) {
  const resposta = await fetch(META(indicador), { headers: { Accept: "application/json" } });
  if (!resposta.ok) throw new Error(`INE ${indicador}: HTTP ${resposta.status}`);
  const [corpo] = await resposta.json();
  const categorias = corpo?.Dimensoes?.Categoria_Dim?.[0];
  if (!categorias) throw new Error(`INE ${indicador}: metainformação sem categorias`);

  const encontrados = new Map();
  for (const [chave, lista] of Object.entries(categorias)) {
    if (!chave.startsWith("Dim_Num2_")) continue;
    for (const categoria of lista) {
      if (categoria.categ_nivel !== NIVEL_CONCELHO) continue;
      encontrados.set(categoria.categ_cod, categoria.categ_dsg);
    }
  }
  return encontrados;
}

/** Os prefixos NUTS II de 2024, do mais longo para o mais curto. */
const REGIOES = [
  ["1A", "grande-lisboa"],
  ["1B", "peninsula-setubal"],
  ["1C", "alentejo"],
  ["1D", "oeste-vale-tejo"],
  ["11", "norte"],
  ["15", "algarve"],
  ["19", "centro"],
  ["20", "acores"],
  ["30", "madeira"],
].sort((esquerda, direita) => direita[0].length - esquerda[0].length);

function regiaoDe(codigo) {
  for (const [prefixo, regiao] of REGIOES) {
    if (codigo.startsWith(prefixo)) return regiao;
  }
  return null;
}

const escapar = (texto) => texto.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

async function gerar() {
  const empresas = await concelhosDe("0014449");
  const populacao = await concelhosDe("0012918");

  if (empresas.size !== 308) {
    throw new Error(`0014449 devolveu ${empresas.size} concelhos, esperavam-se 308.`);
  }

  // ── As duas dimensões TÊM de coincidir ────────────────────────────
  //  Um rácio entre uma contagem de empresas de um concelho e a
  //  população de outro é um número plausível e completamente errado.
  //  Se as versões da nomenclatura divergirem, isto rebenta aqui em vez
  //  de sair ao ecrã.
  const divergentes = [...empresas.keys()].filter((codigo) => !populacao.has(codigo));
  if (divergentes.length > 0) {
    throw new Error(
      `Códigos em 0014449 que 0012918 não conhece: ${divergentes.slice(0, 5).join(", ")}`,
    );
  }

  const linhas = [...empresas.entries()]
    .map(([codigo, nome]) => {
      const regiao = regiaoDe(codigo);
      if (!regiao) throw new Error(`Código sem NUTS II reconhecível: ${codigo} (${nome})`);
      return { codigo, nome, regiao };
    })
    .sort((esquerda, direita) => esquerda.nome.localeCompare(direita.nome, "pt-PT"));

  const porRegiao = new Map();
  for (const item of linhas) porRegiao.set(item.regiao, (porRegiao.get(item.regiao) ?? 0) + 1);
  const resumo = [...porRegiao.entries()]
    .sort()
    .map(([regiao, quantos]) => `//  · ${regiao}: ${quantos}`)
    .join("\n");

  const corpo = `// ═══════════════════════════════════════════════════════════════════════
//  OS 308 CONCELHOS — GERADO, NÃO ESCRITO
//  ---------------------------------------------------------------------
//  ⚠️ Não editar à mão. \`node scripts/gen-concelhos.mjs\` reescreve este
//  ficheiro a partir da metainformação do INE, e \`--check\` falha o build
//  se ele divergir da fonte.
//
//  ── PORQUE O CONCELHO E NÃO A NUTS II ──────────────────────────────
//  «Que negócio abrir» varia ao concelho. Em NUTS II, Lisboa e Mafra são
//  a mesma célula, e Idanha-a-Nova e Coimbra também — o que faz a leitura
//  de oferta descrever um território que não é o de ninguém. Os dois
//  indicadores que o motor usa publicam aos 308 concelhos; era só a
//  ferramenta que pedia menos.
//
//  ── PORQUE A LISTA É FECHADA, E ISSO É PRIVACIDADE ─────────────────
//  Uma lista fechada de 308 entradas escolhe-se no cliente e chega para
//  decidir onde testar. Não recolhe morada, código postal nem GPS, e a
//  escolha nunca sai do dispositivo — é a regra 8 das fronteiras, e é
//  anterior à barreira de PII.
//
//  ── O CÓDIGO É QUE MANDA, NÃO O DISTRITO ───────────────────────────
//  O código territorial do INE é hierárquico e os primeiros caracteres
//  SÃO a NUTS II. Distritos atravessam regiões — Sines e Grândola são
//  Alentejo apesar de Setúbal, Torres Vedras é Oeste apesar de Lisboa,
//  Alcobaça e Peniche são Oeste apesar de Leiria — e o prefixo resolve
//  todos sem uma exceção escrita.
//
//  Concelhos por região:
${resumo}
//
//  Fonte: INE, metainformação dos indicadores 0014449 e 0012918
//  (dimensão «Localização geográfica (NUTS - 2024)», nível 5).
//  Gerado em ${new Date().toISOString().slice(0, 10)}.
// ═══════════════════════════════════════════════════════════════════════

import type { MarketRegion } from "./geografia";

export interface Concelho {
  /** Código territorial do INE, sete caracteres. É a chave nos dois indicadores. */
  codigo: string;
  nome: string;
  /** Derivada do prefixo do código, nunca do distrito. */
  regiao: MarketRegion;
}

/** Os 308, por ordem alfabética portuguesa. */
export const CONCELHOS: readonly Concelho[] = Object.freeze([
${linhas
  .map(
    (item) =>
      `  { codigo: "${item.codigo}", nome: "${escapar(item.nome)}", regiao: "${item.regiao}" },`,
  )
  .join("\n")}
] as const);

export const CONCELHO_POR_CODIGO: ReadonlyMap<string, Concelho> = new Map(
  CONCELHOS.map((item) => [item.codigo, item]),
);

/** Os concelhos de uma NUTS II, por ordem alfabética. */
export function concelhosDaRegiao(regiao: MarketRegion): readonly Concelho[] {
  return CONCELHOS.filter((item) => item.regiao === regiao);
}
`;

  return corpo;
}

const conferir = process.argv.includes("--check");
const gerado = await gerar();

if (conferir) {
  let atual = "";
  try {
    atual = readFileSync(DESTINO, "utf8");
  } catch {
    console.error("✗ concelhos.ts não existe. Corre `node scripts/gen-concelhos.mjs`.");
    process.exit(1);
  }
  // A data de geração muda todos os dias e não é conteúdo: comparar com
  // ela dentro faria o check falhar por passar a meia-noite.
  const semData = (texto) => texto.replace(/^\/\/  Gerado em .*$/m, "");
  if (semData(atual) !== semData(gerado)) {
    console.error("✗ concelhos.ts está desatualizado face ao INE. Corre o gerador.");
    process.exit(1);
  }
  const quantos = (atual.match(/\{ codigo: "/g) ?? []).length;
  console.log(`✓ concelhos.ts em dia — ${quantos} concelhos.`);
} else {
  writeFileSync(DESTINO, gerado, "utf8");
  const quantos = (gerado.match(/\{ codigo: "/g) ?? []).length;
  console.log(`✓ concelhos.ts escrito — ${quantos} concelhos.`);
}
