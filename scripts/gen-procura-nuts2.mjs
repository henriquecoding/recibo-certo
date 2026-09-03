#!/usr/bin/env node
/**
 * O INSTANTÂNEO DE PROCURA — commitado, como já era o da oferta
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO EXISTE                                                   │
 * │                                                                     │
 * │ Os dois eixos do motor tinham arquiteturas opostas, e só uma        │
 * │ sobrevivia a um mau dia:                                             │
 * │                                                                     │
 * │   OFERTA   `import` de JSON commitado ....... entrega 100 %         │
 * │   PROCURA  `fetch` ao INE/Eurostat/RNAL no PEDIDO ... 0 % sem rede  │
 * │                                                                     │
 * │ Quando os pilotos não respondem, `procura` fica `null` em TODAS as  │
 * │ hipóteses — dezassete pontos em cem desaparecem sem deixar rasto no │
 * │ ecrã, e a pessoa recebe «não sabemos» sobre tudo. Medido: com os    │
 * │ pilotos ligados o eixo pontua em ~42 % das hipóteses; sem eles, em  │
 * │ 0 %.                                                                 │
 * │                                                                     │
 * │ A correção não é arquitetura nova. É replicar no eixo da procura o  │
 * │ padrão que já está escrito, testado e a funcionar no da oferta:     │
 * │ um job colhe, o repositório guarda, e o pedido do utilizador lê de  │
 * │ um ficheiro que está sempre lá.                                      │
 * │                                                                     │
 * │     ANTES:  fetch ao vivo → falhou? → nada                          │
 * │     DEPOIS: instantâneo (há sempre) → fetch ao vivo → substitui     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ── PORQUE `nuts2` E NÃO `concelhos` NO NOME ─────────────────────────
 * O relatório que pediu isto chamou-lhe `procura-concelhos.json`, por
 * simetria com a matriz de oferta. Seria um nome errado: as séries de
 * procura que os pilotos leem publicam-se às NUTS II e ao país, não aos
 * 308 concelhos. Um ficheiro chamado «concelhos» com dados regionais
 * seria exatamente o género de número plausível e conclusão errada que
 * o resto deste motor existe para não produzir. O nome diz a
 * granularidade que os dados têm.
 *
 * ── PORQUE NÃO REIMPLEMENTA NADA ─────────────────────────────────────
 * Carrega o `pilot-loader.ts` da aplicação pelo próprio módulo, com o
 * mesmo padrão de `ingerir-mercado.mjs`. Os manifestos, os conectores, a
 * quarentena, a frescura e o gate de evidência são TypeScript testado —
 * reimplementá-los aqui daria duas versões da mesma regra, a divergir na
 * primeira correção. Este ficheiro só orquestra e serializa.
 *
 * Uso:
 *   node scripts/gen-procura-nuts2.mjs           reescreve o instantâneo
 *   node scripts/gen-procura-nuts2.mjs --check   falha se divergir
 *
 * Fontes: INE (pindica.jsp), Eurostat, RNAL/Turismo de Portugal e o
 * instantâneo de contratos públicos do dados.gov — as mesmas que os
 * pilotos já usam, com as mesmas licenças já analisadas.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(
  RAIZ, "src", "lib", "negocio", "market", "bulk", "dados", "procura-nuts2.json",
);

/**
 * Carrega o carregador de pilotos da aplicação, em TypeScript, sem o
 * traduzir. Mesmo padrão de `ingerir-mercado.mjs`.
 */
async function carregarLoader() {
  const { createServer } = await import("vite");
  const servidor = await createServer({
    root: RAIZ,
    logLevel: "error",
    server: { middlewareMode: true, watch: null },
    resolve: { alias: { "@": join(RAIZ, "src") } },
  });
  const modulo = await servidor.ssrLoadModule("/src/lib/negocio/market/pilot-loader.ts");
  const pilotos = await servidor.ssrLoadModule("/src/lib/negocio/market/pilots.ts");
  return {
    loadPilotMarketEvidence: modulo.loadPilotMarketEvidence,
    MARKET_PILOTS: pilotos.MARKET_PILOTS,
    fechar: () => servidor.close(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  A TENDÊNCIA — a pergunta que «é alto?» não responde
//  ---------------------------------------------------------------------
//  Todas as leituras do motor são um instante. «A ocupação está nos 56 %»
//  não diz se o mercado está a abrir ou a fechar, e essas são decisões
//  opostas para quem vai investir.
//
//  ── PORQUE ISTO CORRE AQUI E NÃO NO PEDIDO ─────────────────────────
//  Medido: a API do INE devolve UM período por pedido. Para ter dois é
//  preciso nomeá-los em `Dim1`, e para saber como se chamam é preciso ler
//  primeiro o `pindicaMeta`. São dois pedidos por indicador — aceitável
//  num job semanal, inaceitável no caminho de quem abre a página, que é
//  a lição que `oferta.ts` já aprendeu duas vezes.
//
//  Os manifestos são LIDOS de `pilots.ts`, nunca repetidos aqui: os
//  filtros de dimensão e as geografias válidas têm de ser os mesmos que
//  o conector usa, ou a tendência descreveria outra série.
// ═══════════════════════════════════════════════════════════════════════

const META = (indicador) =>
  `https://www.ine.pt/ine/json_indicador/pindicaMeta.jsp?varcd=${indicador}&lang=PT`;

async function pedirJson(endereco, segundos = 90) {
  const resposta = await fetch(endereco, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(segundos * 1000),
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  return resposta.json();
}

/** Os dois períodos mais recentes de um indicador, pelos códigos do INE. */
async function doisUltimosPeriodos(indicador) {
  const corpo = await pedirJson(META(indicador));
  const bloco = corpo?.[0]?.Dimensoes?.Categoria_Dim?.[0];
  if (!bloco) return null;
  const codigos = [];
  for (const chave of Object.keys(bloco)) {
    if (!chave.includes("Num1")) continue;
    const valor = bloco[chave];
    const registo = Array.isArray(valor) ? valor[0] : valor;
    if (registo?.categ_cod) codigos.push(String(registo.categ_cod));
  }
  // Os códigos do INE ordenam-se lexicograficamente dentro da mesma
  // periodicidade (S7A2024 < S7A2025), que é o caso de todas estas séries.
  codigos.sort();
  return codigos.length >= 2 ? codigos.slice(-2) : null;
}

/**
 * A variação entre os dois últimos períodos, por geografia.
 *
 * Devolve `null` — nunca zero — quando não há dois períodos comparáveis.
 * Zero seria «não mudou», que é uma afirmação sobre o mercado.
 */
async function tendenciaDaSerie(serie) {
  const manifesto = serie.source.manifest;
  const periodos = await doisUltimosPeriodos(manifesto.indicatorCode);
  if (!periodos) return null;

  const extra = Object.entries(manifesto.dimensionFilters ?? {})
    .map(([dim, valores]) => `&${dim.replace("dim_", "Dim")}=${valores.join(",")}`)
    .join("");
  const endereco =
    `https://www.ine.pt/ine/json_indicador/pindica.jsp?op=2&varcd=${manifesto.indicatorCode}` +
    `&Dim1=${periodos.join(",")}${extra}&lang=PT`;

  const corpo = await pedirJson(endereco, 120);
  const dados = corpo?.[0]?.Dados;
  if (!dados) return null;

  const rotulos = Object.keys(dados).sort();
  if (rotulos.length < 2) return null;
  const [antes, agora] = [rotulos[rotulos.length - 2], rotulos[rotulos.length - 1]];

  const numero = (valor) => {
    if (valor === null || valor === undefined || valor === "") return null;
    const convertido = Number(String(valor).replace(",", "."));
    return Number.isFinite(convertido) ? convertido : null;
  };

  const permitidas = new Set(Object.keys(manifesto.geographyByCode ?? {}));
  const ler = (rotulo) => {
    const mapa = new Map();
    for (const linha of dados[rotulo] ?? []) {
      if (!permitidas.has(linha.geocod)) continue;
      const valor = numero(linha.valor);
      if (valor !== null) mapa.set(linha.geocod, valor);
    }
    return mapa;
  };

  const anteriores = ler(antes);
  const atuais = ler(agora);
  const porGeografia = {};
  for (const [codigo, atual] of atuais) {
    const anterior = anteriores.get(codigo);
    if (anterior === undefined || anterior === 0) continue;
    porGeografia[codigo] = {
      anterior,
      atual,
      variacaoPct: Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10,
    };
  }
  if (Object.keys(porGeografia).length === 0) return null;

  return {
    seriesId: serie.id,
    seriesLabel: serie.label,
    indicador: manifesto.indicatorCode,
    unidade: manifesto.unit,
    periodoAnterior: antes,
    periodoAtual: agora,
    porGeografia,
  };
}

/** As tendências de todas as séries de PROCURA servidas pelo INE. */
async function colherTendencias(pilotosDefinidos) {
  const vistas = new Set();
  const saida = [];
  for (const piloto of pilotosDefinidos) {
    for (const serie of piloto.series) {
      if (serie.source?.connector !== "ine") continue;
      if (serie.kind !== "demand" && serie.kind !== "transactional") continue;
      if (vistas.has(serie.id)) continue;
      vistas.add(serie.id);
      try {
        const tendencia = await tendenciaDaSerie(serie);
        if (tendencia) saida.push(tendencia);
      } catch (erro) {
        // Uma série sem tendência não estraga as outras nem o instantâneo:
        // o campo é opcional em toda a cadeia, e a ausência declara-se.
        console.warn(`  · sem tendência para ${serie.id}: ${String(erro).slice(0, 80)}`);
      }
    }
  }
  return saida.sort((a, b) => a.seriesId.localeCompare(b.seriesId));
}

async function construir() {
  const { loadPilotMarketEvidence, MARKET_PILOTS, fechar } = await carregarLoader();
  let pilotos;
  let tendencias = [];
  try {
    pilotos = await loadPilotMarketEvidence({});
    tendencias = await colherTendencias(MARKET_PILOTS);
  } finally {
    await fechar();
  }

  // ── Um instantâneo vazio é pior do que nenhum ─────────────────────
  //  Escrevê-lo apagaria as leituras boas que estão no repositório e
  //  substituí-las-ia por «não sabemos», que é precisamente o ecrã que
  //  este ficheiro existe para evitar. Falhar aqui deixa o instantâneo
  //  anterior intacto — velho é melhor do que vazio.
  const totalObs = pilotos.reduce((soma, item) => soma + item.observations.length, 0);
  if (totalObs === 0) {
    throw new Error(
      "Nenhuma observação veio das fontes nesta corrida. O instantâneo anterior fica como está.",
    );
  }
  const vazios = pilotos.filter((item) => item.observations.length === 0);

  const documento = {
    schemaVersion: 1,
    id: "procura-nuts2",
    geradoEm: new Date().toISOString(),
    /**
     * A granularidade REAL destas séries. Está aqui para quem ler o
     * ficheiro não ter de a deduzir do nome.
     */
    granularidade: "nuts2+pais",
    /** Pilotos que vieram sem uma única leitura. Declarados, não escondidos. */
    semObservacoes: vazios.map((item) => item.templateId).sort(),
    pilotos,
    /**
     * A variação entre os dois últimos períodos, por série e geografia.
     *
     * Separada dos pilotos de propósito: é uma leitura DIFERENTE, colhida
     * por outro caminho (dois períodos nomeados em `Dim1`), e misturá-la
     * nas observações faria parecer que o conector a devolve — não
     * devolve, devolve um período de cada vez.
     */
    tendencias,
  };

  // O hash cobre os DADOS e não `geradoEm`: sem isto o job commitava a
  // cada corrida só para dizer que os números continuam iguais.
  //
  // `checkedAt` e `retrievedAt` também saem da conta, e pela mesma razão:
  // são carimbos de quando perguntámos, não do que a fonte respondeu.
  //
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ `evaluatedAt` FALTAVA, E ISSO TORNAVA O PORTÃO IMPOSSÍVEL          │
  // │                                                                   │
  // │ `gate.evaluatedAt` é o carimbo de quando o gate de evidência foi   │
  // │ avaliado — muda a cada corrida, tal como os outros três, e não     │
  // │ estava na lista. O hash mudava SEMPRE, mesmo com dados idênticos:  │
  // │ três corridas seguidas deram b488b66e…, 11e59d1f… e 923b6d82…      │
  // │                                                                   │
  // │ O `--check` não podia passar. Não conseguia distinguir «a fonte    │
  // │ mudou» de «voltámos a perguntar», e portanto respondia sempre      │
  // │ «desatualizado» — que é o mesmo que não responder nada. Correndo   │
  // │ com `continue-on-error` num workflow agendado, ninguém deu conta.  │
  // └───────────────────────────────────────────────────────────────────┘
  // A lista completa dos carimbos de RELÓGIO. `sourceHealth.lastRunAt` e
  // `lastSuccessfulRunAt` faltavam também: dizem quando corremos, não o que
  // a fonte respondeu. Com os seis fora, duas corridas seguidas sobre os
  // mesmos dados dão o mesmo hash — que é a única coisa que faz de um hash
  // um portão em vez de um número.
  const CARIMBOS = new Set([
    "geradoEm",
    "checkedAt",
    "retrievedAt",
    "evaluatedAt",
    "lastRunAt",
    "lastSuccessfulRunAt",
  ]);
  const semCarimbos = JSON.stringify(documento, (chave, valor) =>
    CARIMBOS.has(chave) ? undefined : valor,
  );
  documento.contentHash = `sha256:${createHash("sha256").update(semCarimbos).digest("hex")}`;
  return documento;
}

// ┌─────────────────────────────────────────────────────────────────────┐
// │ «NÃO CONSEGUI PERGUNTAR» NÃO É «ESTÁ DESATUALIZADO»                  │
// │                                                                     │
// │ Este gerador fala com uma fonte externa a cada execução. Quando ela  │
// │ não responde — proxy, manutenção, 403 de rate limit — a exceção      │
// │ subia sem tratamento e o `--check` morria com um traço de pilha do   │
// │ Node. Quem o corre à mão fica sem saber se o repositório está mal ou │
// │ se foi só a rede, e um portão que confunde as duas coisas ou reprova │
// │ pelo proxy de alguém, ou aprende-se a ignorá-lo.                     │
// │                                                                     │
// │ Em `--check`, uma falha de rede passa a AVISO com saída 0: ficou por │
// │ verificar, e o texto di-lo. A gerar (sem `--check`) continua a ser   │
// │ erro — aí a rede é o trabalho.                                       │
// └─────────────────────────────────────────────────────────────────────┘
const conferir = process.argv.includes("--check");

async function tentar(fn) {
  try {
    return await fn();
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    if (!conferir) {
      console.error(`\u2717 ${mensagem}`);
      process.exit(1);
    }
    console.warn(`  aviso\u00b7 N\u00e3o foi poss\u00edvel falar com a fonte (${mensagem}).`);
    console.warn("         Ficou POR VERIFICAR se o ficheiro est\u00e1 em dia \u2014 n\u00e3o confundas com estar bem.");
    process.exit(0);
  }
}

const documento = await tentar(construir);
const serializado = `${JSON.stringify(documento, null, 2)}\n`;
const contarObs = (doc) => doc.pilotos.reduce((soma, item) => soma + item.observations.length, 0);

if (conferir) {
  let atual;
  try {
    atual = JSON.parse(readFileSync(DESTINO, "utf8"));
  } catch {
    console.error("✗ procura-nuts2.json não existe. Corre o gerador.");
    process.exit(1);
  }
  if (atual.contentHash !== documento.contentHash) {
    console.error(
      `✗ procura-nuts2.json desatualizado.\n  no repositório: ${atual.contentHash}\n  nas fontes agora: ${documento.contentHash}`,
    );
    process.exit(1);
  }
  console.log(
    `✓ procura-nuts2.json em dia — ${atual.pilotos.length} pilotos · ${contarObs(atual)} observações.`,
  );
} else {
  writeFileSync(DESTINO, serializado, "utf8");
  console.log(
    `✓ procura-nuts2.json escrito — ${documento.pilotos.length} pilotos · ${contarObs(documento)} observações · ${documento.tendencias.length} tendências · ${(serializado.length / 1024).toFixed(1)} KB${
      documento.semObservacoes.length > 0 ? ` · sem leituras: ${documento.semObservacoes.join(", ")}` : ""
    }`,
  );
}
