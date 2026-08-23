#!/usr/bin/env node
/**
 * A MATRIZ DE OFERTA AO CONCELHO — ingerida, não pedida a quente
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO É UM CONECTOR                                        │
 * │                                                                     │
 * │ O indicador 0014449 publica aos 308 concelhos — e também às 3 394   │
 * │ freguesias, às 26 NUTS III, às 9 NUTS II e ao país. A API do INE    │
 * │ não tem parâmetro de profundidade: ou se pedem geografias uma a     │
 * │ uma, ou vem tudo.                                                    │
 * │                                                                     │
 * │ Medido, com as 23 divisões que a ontologia usa:                     │
 * │                                                                     │
 * │   · 308 códigos em Dim2 ......... ORA-06502, buffer too small       │
 * │   · 100 códigos × 23 divisões ... ORA-06502                          │
 * │   · 100 códigos × 1 divisão ..... OK (× 23 divisões = 23 pedidos)   │
 * │   · sem Dim2, tudo ............... 19,7 MB · 9,4 s · UM pedido      │
 * │                                                                     │
 * │ O ficheiro `oferta.ts` já aprendeu esta lição uma vez e escreveu-a: │
 * │ vinte e três pedidos ao INE fazem o INE deixar cair alguns, e o     │
 * │ efeito observável é a funcionalidade desligada por um erro que não  │
 * │ dá erro nenhum. A saída não é multiplicar pedidos — é não os fazer  │
 * │ no caminho do utilizador.                                            │
 * │                                                                     │
 * │ 19,7 MB não cabem numa função de servidor a pedido (a Data Cache da │
 * │ Vercel corta aos 2 MB por entrada, pelo que nem sequer ficaria em   │
 * │ cache). Cabem aqui: um job, uma vez, e o que fica no repositório é  │
 * │ a matriz compacta — 23 KB, 9 KB comprimidos, que é o que o browser  │
 * │ recebe.                                                              │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ── PORQUE A MATRIZ VAI INTEIRA PARA O BROWSER ───────────────────────
 * A zona de quem pergunta NUNCA sai do dispositivo (regra 8 das
 * fronteiras). O servidor não pode filtrar pelo concelho da pessoa
 * porque não o conhece — e não o deve conhecer. Por isso vai a matriz
 * toda, e é o cliente que escolhe a sua linha e a compara com as outras
 * 307. Nove KB comprimidos é um preço pequeno por não perguntar onde a
 * pessoa mora.
 *
 * Uso:
 *   node scripts/gen-oferta-concelhos.mjs           reescreve o instantâneo
 *   node scripts/gen-oferta-concelhos.mjs --check   falha se divergir
 *
 * Fonte: INE — 0014449 (Empresas por NUTS 2024 e Divisão CAE Rev. 3,
 * Sistema de contas integradas das empresas) e 0012918 (População
 * residente, Estimativas anuais). Licença CC BY 4.0 via dados.gov.pt.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const DESTINO = join(
  RAIZ,
  "src", "lib", "negocio", "market", "bulk", "dados", "oferta-concelhos.json",
);

const EMPRESAS = "0014449";
const POPULACAO = "0012918";

/** Sete caracteres é o nível 5 da dimensão geográfica: o concelho. */
const CODIGO_CONCELHO = /^[0-9A-Z]{7}$/;

const url = (indicador, extra = "") =>
  `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=${indicador}${extra}&lang=PT`;

async function pedir(indicador, extra, segundos) {
  const endereco = url(indicador, extra);
  const resposta = await fetch(endereco, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(segundos * 1000),
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} — ${endereco.slice(0, 80)}`);
  const corpo = await resposta.json();
  const [item] = corpo;
  if (!item?.Dados) {
    const motivo = item?.Sucesso?.Falso?.[0]?.Msg ?? "resposta sem Dados";
    throw new Error(`INE recusou: ${motivo}`);
  }
  // O período mais recente. A ordenação lexicográfica basta: os períodos
  // anuais do INE são «2023», «2024» — comparáveis como texto.
  const periodos = Object.keys(item.Dados).sort();
  const periodo = periodos[periodos.length - 1];
  return { periodo, linhas: item.Dados[periodo] ?? [] };
}

/** Um valor que não seja número não serve para dividir, e descarta-se. */
function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : null;
}

async function construir() {
  // ── As divisões vêm dos DOIS lados da subtração ──────────────────
  //  A ontologia diz em que divisão o OPERADOR se inscreve; os problemas
  //  dizem em que divisões estão os CLIENTES. As duas listas são lidas
  //  dos ficheiros e não repetidas aqui: uma lista duplicada diverge no
  //  dia em que alguém acrescenta uma capacidade ou um problema, e o
  //  sintoma seria uma hipótese sem leitura — silenciosa.
  const caeDe = (caminho) => {
    const texto = readFileSync(join(RAIZ, ...caminho), "utf8");
    return [...texto.matchAll(/cae:\s*\[([^\]]*)\]/g)].flatMap((par) =>
      [...par[1].matchAll(/"([0-9A-Z]{2,3})"/g)].map((item) => item[1]),
    );
  };
  const base = ["src", "lib", "negocio", "descoberta", "conhecimento", "dados"];
  const divisoes = [
    ...new Set([
      ...caeDe([...base, "ontologia.ts"]),
      ...caeDe([...base, "problemas.ts"]),
    ]),
  ].sort();
  if (divisoes.length === 0) throw new Error("Não encontrei divisões na ontologia nem nos problemas.");

  const empresas = await pedir(EMPRESAS, `&Dim3=${divisoes.join(",")}`, 180);
  const populacao = await pedir(POPULACAO, "&Dim3=T&Dim4=T", 90);

  // ── Só o nível 5, e a ordem é canónica ───────────────────────────
  const porDivisao = new Map();
  const codigos = new Set();
  for (const linha of empresas.linhas) {
    const codigo = linha.geocod;
    if (!CODIGO_CONCELHO.test(codigo)) continue;
    const valor = numero(linha.valor);
    if (valor === null) continue;
    codigos.add(codigo);
    const mapa = porDivisao.get(linha.dim_3) ?? new Map();
    mapa.set(codigo, valor);
    porDivisao.set(linha.dim_3, mapa);
  }

  const habitantes = new Map();
  for (const linha of populacao.linhas) {
    if (!CODIGO_CONCELHO.test(linha.geocod)) continue;
    const valor = numero(linha.valor);
    if (valor !== null) habitantes.set(linha.geocod, valor);
  }

  const ordem = [...codigos].sort();
  if (ordem.length !== 308) {
    throw new Error(`Esperava 308 concelhos nas empresas, vieram ${ordem.length}.`);
  }
  const semPopulacao = ordem.filter((codigo) => !habitantes.has(codigo));
  if (semPopulacao.length > 0) {
    // Sem população não há rácio, e um concelho a faltar tornaria a
    // comparação enviesada em silêncio. Falha aqui.
    throw new Error(`Concelhos sem população: ${semPopulacao.slice(0, 5).join(", ")}`);
  }

  const emFalta = divisoes.filter((divisao) => !porDivisao.has(divisao));

  const documento = {
    schemaVersion: 1,
    id: "oferta-concelhos",
    geradoEm: new Date().toISOString(),
    indicadorEmpresas: EMPRESAS,
    indicadorPopulacao: POPULACAO,
    periodoEmpresas: empresas.periodo,
    periodoPopulacao: populacao.periodo,
    /** Códigos INE dos 308 concelhos. Todos os arrays alinham por índice. */
    ordem,
    /** Divisão CAE → contagem de empresas, alinhada com `ordem`. */
    porDivisao: Object.fromEntries(
      [...porDivisao.entries()]
        .sort(([esquerda], [direita]) => esquerda.localeCompare(direita))
        .map(([divisao, mapa]) => [divisao, ordem.map((codigo) => mapa.get(codigo) ?? 0)]),
    ),
    /** População residente, alinhada com `ordem`. */
    populacao: ordem.map((codigo) => habitantes.get(codigo)),
    /** Divisões pedidas que a fonte não devolveu. Declaradas, não escondidas. */
    emFalta,
  };

  // O hash cobre os dados e NÃO `geradoEm`: sem isto o job commitava a
  // cada corrida só para dizer que os números continuam iguais.
  const { geradoEm: _ignorado, ...semData } = documento;
  documento.contentHash = `sha256:${createHash("sha256")
    .update(JSON.stringify(semData))
    .digest("hex")}`;
  return documento;
}

const conferir = process.argv.includes("--check");
const documento = await construir();
const serializado = `${JSON.stringify(documento, null, 2)}\n`;

if (conferir) {
  let atual;
  try {
    atual = JSON.parse(readFileSync(DESTINO, "utf8"));
  } catch {
    console.error("✗ oferta-concelhos.json não existe. Corre o gerador.");
    process.exit(1);
  }
  if (atual.contentHash !== documento.contentHash) {
    console.error(
      `✗ oferta-concelhos.json desatualizado.\n  no repositório: ${atual.contentHash}\n  no INE agora:   ${documento.contentHash}`,
    );
    process.exit(1);
  }
  console.log(
    `✓ oferta-concelhos.json em dia — ${atual.ordem.length} concelhos × ${Object.keys(atual.porDivisao).length} divisões (${atual.periodoEmpresas}).`,
  );
} else {
  writeFileSync(DESTINO, serializado, "utf8");
  console.log(
    `✓ oferta-concelhos.json escrito — ${documento.ordem.length} concelhos × ${Object.keys(documento.porDivisao).length} divisões · empresas ${documento.periodoEmpresas} · população ${documento.periodoPopulacao} · ${(serializado.length / 1024).toFixed(1)} KB${documento.emFalta.length > 0 ? ` · em falta: ${documento.emFalta.join(", ")}` : ""}`,
  );
}
