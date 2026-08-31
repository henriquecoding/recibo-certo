#!/usr/bin/env node
/**
 * VERIFICAÇÃO DA HIERARQUIA VISUAL — o modo claro medido, não sentido.
 * ---------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE É QUE «PARECE TUDO UMA COISA SÓ» PRECISA DE UM NÚMERO         │
 * │                                                                     │
 * │ No escuro, um cartão vê-se: a superfície sobe (#141613 → #1E221B) e  │
 * │ a borda sobe outra vez (#2A2F25), portanto há DUAS pistas a          │
 * │ desenhá-lo. No claro havia meia: o cartão é branco sobre papel       │
 * │ (1,11:1, no limiar do percetível) e a borda `stone-100` (#F5F5F4)    │
 * │ era literalmente a cor do papel — 1,016:1 contra o fundo. Uma borda  │
 * │ invisível não é uma borda; é uma classe que não faz nada.            │
 * │                                                                     │
 * │ Isso não se afina a olho, porque a diferença entre 1,02 e 1,09 é     │
 * │ exactamente o que o olho NÃO distingue com confiança — e é toda a    │
 * │ diferença entre uma página lida como uma pilha de cartões e uma      │
 * │ lida como uma mancha só.                                            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * O QUE MEDE
 * Para cada superfície visível (algo com fundo próprio ou borda), calcula
 * as três pistas que a podem delimitar e fica com a MELHOR:
 *
 *   · degrau  — contraste entre o fundo próprio e o fundo por baixo
 *   · aresta  — contraste entre a borda e o fundo próprio
 *   · anel    — contraste do anel de `box-shadow` (spread) contra o fundo
 *
 * Uma superfície cuja melhor pista fica abaixo de `LIMIAR_INVISIVEL`
 * não está desenhada: existe no DOM e não existe no ecrã.
 *
 * O critério de aprovação não é um número inventado — é o modo ESCURO.
 * O escuro é a referência que o utilizador aponta como boa, por isso o
 * claro tem de chegar lá: mesma percentagem de superfícies invisíveis
 * (com uma folga), nas mesmas páginas.
 *
 * Uso:
 *   npm run dev            (ou npm run build && npm run start)
 *   npm run hierarquia:e2e
 *
 * Variáveis:
 *   RC_BASE_URL          por omissão http://localhost:3000
 *   PLAYWRIGHT_CHROMIUM  caminho para um Chromium já instalado (opcional)
 *   RC_CAPTURAS          pasta onde gravar as imagens (opcional)
 *   RC_HIERARQUIA_JSON   ficheiro onde gravar o relatório cru (opcional)
 *
 * Código de saída: 0 = tudo passa · 1 = pelo menos uma falha.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
/** A versão real, lida da fonte — para marcar o popup de Novidades como
 *  visto sem depender de o manter actualizado aqui à mão. */
const APP_VERSION =
  readFileSync(join(RAIZ, "src", "lib", "version.ts"), "utf8").match(
    /APP_VERSION\s*=\s*"([^"]+)"/,
  )?.[1] ?? "0.0.0";

const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const CAPTURAS = process.env.RC_CAPTURAS ?? null;
const RELATORIO = process.env.RC_HIERARQUIA_JSON ?? null;
const EXECUTAVEL = process.env.PLAYWRIGHT_CHROMIUM;

/** Abaixo disto a superfície não se vê. 1,05 é ~5% de diferença de
 *  luminância relativa: o mínimo a que uma aresta de 1 px se lê num ecrã
 *  normal, com luz normal. */
const LIMIAR_INVISIVEL = 1.05;
/** Entre este e o anterior a superfície vê-se mas não se afirma. */
const LIMIAR_FRACO = 1.09;

/* As páginas escolhidas para cobrir FORMAS diferentes de superfície, não
   só rotas diferentes: uma landing de cartões, uma grelha de planos, um
   índice denso, um painel com widgets, uma tabela, um formulário longo,
   um guia editorial e uma ferramenta com passos. Uma regressão de
   hierarquia aparece primeiro numa destas formas. */
const PAGINAS = [
  { nome: "landing", url: "/" },
  { nome: "landing-preco", url: "/inicio/preco" },
  { nome: "landing-recibos", url: "/inicio/recibos" },
  { nome: "precos", url: "/precos" },
  { nome: "guias", url: "/guias" },
  { nome: "ferramentas", url: "/ferramentas" },
  { nome: "contabilistas", url: "/contabilistas" },
  { nome: "dashboard", url: "/dashboard" },
  { nome: "calcular-preco", url: "/ferramentas/calcular-preco" },
  { nome: "metodologia", url: "/metodologia" },
  { nome: "recibos", url: "/dashboard/recibos" },
  { nome: "perfil", url: "/dashboard/perfil" },
  { nome: "prazos", url: "/dashboard/prazos" },
  { nome: "guia-irs-jovem", url: "/guias/irs-jovem" },
  { nome: "comparar-regimes", url: "/ferramentas/comparar-regimes" },
  { nome: "candidatura", url: "/contabilistas/candidatura" },
];

const VIEWPORTS = [
  { nome: "360", width: 360, height: 780 },
  { nome: "1440", width: 1440, height: 900 },
];

/* ══════════════════════════════════════════════════════════════════════
   O MEDIDOR, tal como corre DENTRO da página.

   Fica numa string e não numa função importada porque o `page.evaluate`
   serializa o que lhe damos: qualquer coisa que feche sobre o módulo
   (constantes, helpers) chega lá indefinida. Escrito uma vez, aqui.
   ══════════════════════════════════════════════════════════════════════ */
const MEDIDOR = () => {
  const analisar = (css) => {
    const m = css.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some((n) => Number.isNaN(n))) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  /** Compõe `frente` (com alfa) sobre `fundo` (opaco). */
  const compor = (frente, fundo) => ({
    r: frente.r * frente.a + fundo.r * (1 - frente.a),
    g: frente.g * frente.a + fundo.g * (1 - frente.a),
    b: frente.b * frente.a + fundo.b * (1 - frente.a),
    a: 1,
  });

  const luminancia = (c) => {
    const canal = (v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * canal(c.r) + 0.7152 * canal(c.g) + 0.0722 * canal(c.b);
  };

  const contraste = (a, b) => {
    const la = luminancia(a);
    const lb = luminancia(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  /** O fundo EFECTIVO por baixo de um elemento: sobe pelos antepassados a
   *  compor tudo o que for translúcido até encontrar opacidade. */
  const fundoPorBaixo = (el) => {
    const pilha = [];
    let no = el.parentElement;
    while (no) {
      const cor = analisar(getComputedStyle(no).backgroundColor);
      if (cor && cor.a > 0) {
        pilha.push(cor);
        if (cor.a >= 0.999) break;
      }
      no = no.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = pilha.length - 1; i >= 0; i--) base = compor(pilha[i], base);
    return base;
  };

  /** O anel de `box-shadow`: a camada com deslocamento e desfoque a zero
   *  e spread positivo (é assim que `shadow-card` desenha a sua aresta). */
  const anelDaSombra = (sombra) => {
    if (!sombra || sombra === "none") return null;
    // As camadas separam-se por vírgulas que NÃO estão dentro de rgb(...).
    const camadas = sombra.split(/,(?![^(]*\))/);
    for (const camada of camadas) {
      const cor = analisar(camada);
      if (!cor || cor.a <= 0) continue;
      const px = camada.match(/-?\d*\.?\d+px/g);
      if (!px || px.length < 4) continue;
      const [dx, dy, desfoque, spread] = px.slice(0, 4).map(parseFloat);
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && desfoque < 0.5 && spread > 0) {
        return cor;
      }
    }
    return null;
  };

  const superficies = [];
  const todos = document.querySelectorAll("body *");

  for (const el of todos) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 48 || rect.height < 28) continue;
    if (rect.bottom < 0 || rect.top > window.innerHeight * 3) continue;

    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    // Elementos posicionados fora do fluxo com opacidade 0 (painéis fechados).
    if (parseFloat(cs.opacity) < 0.2) continue;

    // ┌──────────────────────────────────────────────────────────────┐
    // │ O QUE NÃO CONTA: A DECORAÇÃO                                  │
    // │                                                              │
    // │ Halos, manchas de gradiente e grão são subtis DE PROPÓSITO —  │
    // │ contá-los como «superfícies invisíveis» punha a medição a     │
    // │ pedir que a atmosfera do desenho fosse destruída. Um elemento │
    // │ sem texto e fora do alcance do rato não é uma divisão que     │
    // │ alguém precise de ver: é ambiente.                            │
    // └──────────────────────────────────────────────────────────────┘
    const temTexto = (el.textContent ?? "").trim().length > 0;
    if (!temTexto && (cs.pointerEvents === "none" || el.getAttribute("aria-hidden") === "true")) {
      continue;
    }

    const fundoPai = fundoPorBaixo(el);
    const proprio = analisar(cs.backgroundColor);
    const temFundo = proprio && proprio.a > 0.02;
    const fundoProprio = temFundo ? compor(proprio, fundoPai) : fundoPai;

    const larguras = [
      parseFloat(cs.borderTopWidth),
      parseFloat(cs.borderRightWidth),
      parseFloat(cs.borderBottomWidth),
      parseFloat(cs.borderLeftWidth),
    ];
    const cores = [
      cs.borderTopColor,
      cs.borderRightColor,
      cs.borderBottomColor,
      cs.borderLeftColor,
    ];
    let aresta = 0;
    for (let i = 0; i < 4; i++) {
      if (larguras[i] < 0.5) continue;
      const cor = analisar(cores[i]);
      if (!cor || cor.a <= 0.02) continue;
      aresta = Math.max(aresta, contraste(compor(cor, fundoProprio), fundoProprio));
    }

    const anel = anelDaSombra(cs.boxShadow);
    const contrasteAnel = anel ? contraste(compor(anel, fundoPai), fundoPai) : 0;
    const temSombraDifusa = cs.boxShadow !== "none" && !anel;

    const degrau = temFundo ? contraste(fundoProprio, fundoPai) : 0;

    // Só interessa o que se PROPÕE a ser uma superfície: tem fundo próprio
    // diferente do pai, ou tem borda, ou tem sombra. O resto é estrutura.
    const proponente = temFundo || aresta > 0 || contrasteAnel > 0 || temSombraDifusa;
    if (!proponente) continue;
    // Um fundo idêntico ao do pai e sem mais nenhuma pista é um elemento
    // transparente com outro nome — não conta como superfície por desenhar.
    if (degrau < 1.005 && aresta === 0 && contrasteAnel === 0 && !temSombraDifusa) continue;

    superficies.push({
      etiqueta: el.tagName.toLowerCase(),
      classe: (typeof el.className === "string" ? el.className : "").slice(0, 140),
      largura: Math.round(rect.width),
      altura: Math.round(rect.height),
      degrau: Number(degrau.toFixed(4)),
      aresta: Number(aresta.toFixed(4)),
      anel: Number(contrasteAnel.toFixed(4)),
      difusa: temSombraDifusa,
      melhor: Number(Math.max(degrau, aresta, contrasteAnel).toFixed(4)),
    });
  }

  return superficies;
};

/* ══════════════════════════════════════════════════════════════════════ */

const falhas = [];
const linhas = [];
const registo = (m) => { linhas.push(m); console.log(m); };
const ok = (m) => registo("  OK    " + m);
const mal = (m) => { falhas.push(m); registo("  FALHA " + m); };

const percentil = (xs, p) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))];
};

async function correr() {
  const browser = await chromium.launch(
    EXECUTAVEL ? { executablePath: EXECUTAVEL } : {},
  );
  const resultado = { base: BASE, quando: new Date().toISOString(), paginas: [] };

  try {
    for (const vp of VIEWPORTS) {
      for (const tema of ["claro", "escuro"]) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          colorScheme: tema === "escuro" ? "dark" : "light",
        });
        // O tema persiste em localStorage e é lido pelo script anti-flash
        // do `layout.tsx` — mesma chave, senão a página nasce no tema errado
        // e a medição do escuro seria a do claro outra vez.
        //
        // Os dois avisos de primeira visita (cookies e «Novidades») entram
        // já respondidos: ambos são modais com fundo esbatido por cima da
        // página, e o que se quer medir é a página.
        await ctx.addInitScript(({ t, versao }) => {
          try {
            localStorage.setItem("recibocerto:theme", t);
            localStorage.setItem(
              "recibocerto:cookie-consent",
              JSON.stringify({
                necessarios: true,
                estatistica: false,
                marketing: false,
                data: new Date().toISOString(),
                versao: 2,
              }),
            );
            localStorage.setItem("recibocerto:changelog_visto", versao);
          } catch { /* modo privado */ }
        }, { t: tema === "escuro" ? "dark" : "light", versao: APP_VERSION });

        const page = await ctx.newPage();
        for (const p of PAGINAS) {
          try {
            await page.goto(BASE + p.url, { waitUntil: "domcontentloaded", timeout: 45000 });
          } catch {
            mal(`${p.nome} @${vp.nome}/${tema}: página não carregou`);
            continue;
          }
          // Confirma que o tema aplicado é mesmo o pedido.
          await page.evaluate((t) => {
            document.documentElement.classList.toggle("dark", t === "escuro");
          }, tema);
          await page.waitForTimeout(700);

          const superficies = await page.evaluate(MEDIDOR);
          const melhores = superficies.map((s) => s.melhor);
          const invisiveis = superficies.filter((s) => s.melhor < LIMIAR_INVISIVEL);
          const fracas = superficies.filter(
            (s) => s.melhor >= LIMIAR_INVISIVEL && s.melhor < LIMIAR_FRACO,
          );

          const linha = {
            pagina: p.nome,
            viewport: vp.nome,
            tema,
            total: superficies.length,
            invisiveis: invisiveis.length,
            fracas: fracas.length,
            pctInvisiveis: superficies.length
              ? Number(((invisiveis.length / superficies.length) * 100).toFixed(1))
              : 0,
            p10: Number(percentil(melhores, 0.1).toFixed(3)),
            mediana: Number(percentil(melhores, 0.5).toFixed(3)),
            piores: invisiveis
              .sort((a, b) => b.largura * b.altura - a.largura * a.altura)
              .slice(0, 6)
              .map((s) => ({ classe: s.classe, melhor: s.melhor, w: s.largura, h: s.altura })),
          };
          resultado.paginas.push(linha);

          if (CAPTURAS) {
            mkdirSync(CAPTURAS, { recursive: true });
            await page.screenshot({
              path: `${CAPTURAS}/${p.nome}-${vp.nome}-${tema}.png`,
              fullPage: false,
            });
          }
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }

  /* ── Relatório ─────────────────────────────────────────────────── */
  registo("");
  registo("  página          vp    tema     superfícies  invisíveis  fracas   p10    mediana");
  registo("  ─────────────────────────────────────────────────────────────────────────────────");
  for (const l of resultado.paginas) {
    registo(
      "  " +
        l.pagina.padEnd(15) +
        l.viewport.padEnd(6) +
        l.tema.padEnd(9) +
        String(l.total).padStart(8) +
        String(`${l.invisiveis} (${l.pctInvisiveis}%)`).padStart(14) +
        String(l.fracas).padStart(8) +
        String(l.p10.toFixed(3)).padStart(8) +
        String(l.mediana.toFixed(3)).padStart(10),
    );
  }
  registo("");

  /* ── O critério: o claro tem de chegar ao escuro ────────────────── */
  const porChave = new Map();
  for (const l of resultado.paginas) porChave.set(`${l.pagina}|${l.viewport}|${l.tema}`, l);

  for (const vp of VIEWPORTS) {
    for (const p of PAGINAS) {
      const claro = porChave.get(`${p.nome}|${vp.nome}|claro`);
      const escuro = porChave.get(`${p.nome}|${vp.nome}|escuro`);
      if (!claro || !escuro) continue;
      const nome = `${p.nome} @${vp.nome}`;

      // ① Nenhuma página pode ter mais de 8% de superfícies invisíveis.
      if (claro.pctInvisiveis > 8) {
        mal(
          `${nome}: ${claro.pctInvisiveis}% das superfícies do modo CLARO não têm ` +
            `pista visível (limite 8%). Piores: ` +
            claro.piores.map((x) => `${x.melhor}·${x.classe.slice(0, 42)}`).join(" | "),
        );
      } else {
        ok(`${nome}: modo claro com ${claro.pctInvisiveis}% de superfícies invisíveis`);
      }

      // ② E o claro não pode ficar atrás do escuro por mais de 3 pontos.
      const atraso = claro.pctInvisiveis - escuro.pctInvisiveis;
      if (atraso > 3) {
        mal(
          `${nome}: o claro está ${atraso.toFixed(1)} pontos atrás do escuro ` +
            `(${claro.pctInvisiveis}% vs ${escuro.pctInvisiveis}%)`,
        );
      }

      // ③ O décimo percentil do claro tem de estar acima do limiar.
      if (claro.p10 < LIMIAR_INVISIVEL) {
        mal(
          `${nome}: p10 do claro em ${claro.p10.toFixed(3)} — uma em cada dez ` +
            `superfícies está abaixo de ${LIMIAR_INVISIVEL}`,
        );
      }
    }
  }

  if (RELATORIO) {
    mkdirSync(dirname(RELATORIO), { recursive: true });
    writeFileSync(RELATORIO, JSON.stringify(resultado, null, 2));
    registo(`  relatório em ${RELATORIO}`);
  }

  registo("");
  if (falhas.length) {
    registo(`  ${falhas.length} falha(s).`);
    process.exit(1);
  }
  registo("  Hierarquia visual: tudo passa.");
}

correr().catch((e) => {
  console.error(e);
  process.exit(1);
});
