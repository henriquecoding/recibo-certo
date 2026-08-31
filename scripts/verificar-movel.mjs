#!/usr/bin/env node
/**
 * VERIFICAÇÃO DO TELEMÓVEL — a regra 5b medida, não sentida.
 * ---------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE É QUE «O MÓVEL ESTÁ MAL» PRECISA DE NÚMEROS                   │
 * │                                                                     │
 * │ O CLAUDE.md diz «mobile-first, sempre (inegociável)» desde o         │
 * │ princípio, e a homepage tinha, ao mesmo tempo: a demonstração do     │
 * │ IRS a sair pela direita do cartão com os valores cortados a meio,    │
 * │ títulos de ferramentas espremidos a SETE pixéis de largura por um    │
 * │ badge que não encolhe, e 31 sítios com texto abaixo de 12px — dois   │
 * │ deles a 9.                                                          │
 * │                                                                     │
 * │ Nada disto deu erro. Nenhum teste reprovou, o build passou, e a      │
 * │ revisão a 1440px não tinha como ver: a 1440 a demo cabe, o badge     │
 * │ cabe ao lado do título e 10px é um rótulo discreto. Uma regra que    │
 * │ só se verifica olhando para o ecrã errado não é uma regra — é uma    │
 * │ intenção.                                                           │
 * │                                                                     │
 * │ Isto mede as cinco rotas da homepage nas larguras onde ela vive de   │
 * │ verdade.                                                            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * O QUE MEDE, e porque é que cada um destes falha em silêncio
 *
 *   1 · ROLAGEM LATERAL — `scrollWidth` do documento maior do que a
 *       janela. É o defeito que se sente sem se conseguir apontar: a
 *       página «abana» de lado.
 *
 *   2 · TRANSBORDO — uma caixa cujo conteúdo é mais largo do que ela e
 *       que não o esconde nem o deixa rolar. O conteúdo sai por fora do
 *       cartão e é o RECORTE DA JANELA que o corta. Foi assim que a
 *       demonstração do IRS apareceu com «28 500 €» sem o «€».
 *
 *   3 · PISO TIPOGRÁFICO — texto abaixo de `PISO_PX`. Ver o quadro em
 *       `globals.css` sobre `.texto-micro` / `.texto-mini`.
 *
 *   4 · ALVOS — o que se toca abaixo de 36px. O rato acerta em 28; o
 *       polegar não.
 *
 *   5 · TEXTO ESMAGADO — um `truncate` cuja caixa ficou tão estreita que
 *       só lá cabem as reticências. Tecnicamente não transborda; na
 *       prática o rótulo desapareceu.
 *
 * O que NÃO conta como defeito, e porquê:
 *   · camadas decorativas (`pointer-events-none`, `aria-hidden`) — os
 *     halos desfocados são maiores do que a caixa DE PROPÓSITO, e vivem
 *     dentro de um `overflow-hidden` que os corta;
 *   · caixas que assumem a rolagem (`overflow-x: auto/scroll`) — uma
 *     tabela que rola de lado é uma decisão, não um acidente;
 *   · elementos com menos de 24px nas duas dimensões — pontos, anéis e
 *     indicadores, onde 1px de arredondamento vira um falso positivo.
 *
 * Uso:
 *   npm run build && npm run start      (o portão mede o ARTEFACTO)
 *   npm run movel:e2e
 *
 * O que percorre: as CINCO rotas de foco — `/`, `/inicio/preco`,
 * `/inicio/recibos`, `/inicio/empresa` e `/inicio/salario` — a 360 e a
 * 320px, no claro e no escuro.
 *
 * Variáveis:
 *   RC_BASE_URL          por omissão http://localhost:3000
 *   PLAYWRIGHT_CHROMIUM  caminho para um Chromium já instalado (opcional)
 *   RC_MOVEL_JSON        ficheiro onde gravar o relatório cru (opcional)
 *   RC_MOVEL_CAPTURAS    pasta onde gravar as imagens (opcional)
 *
 * Código de saída: 0 = tudo passa · 1 = pelo menos uma falha.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_VERSION =
  readFileSync(join(RAIZ, "src", "lib", "version.ts"), "utf8").match(
    /APP_VERSION\s*=\s*"([^"]+)"/,
  )?.[1] ?? "0.0.0";
/* O aviso de cookies é rejeitado quando a versão guardada não é a corrente
   (`lerConsentimento`), e um consentimento «respondido» com a versão errada
   punha o painel por cima da página que se queria medir. A versão vem da
   fonte, como a da aplicação — uma constante à mão volta a envelhecer. */
const CONSENT_VERSION = Number(
  readFileSync(join(RAIZ, "src", "lib", "cookie-consent.ts"), "utf8").match(
    /CONSENT_VERSION\s*=\s*(\d+)/,
  )?.[1] ?? 1,
);

const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const RELATORIO = process.env.RC_MOVEL_JSON ?? null;
const CAPTURAS = process.env.RC_MOVEL_CAPTURAS ?? null;
const EXECUTAVEL = process.env.PLAYWRIGHT_CHROMIUM;

/** O piso tipográfico do telemóvel. Ver `globals.css`. */
const PISO_PX = 12;
/** Alvo tátil mínimo do design system. */
const ALVO_MIN = 36;
/** Abaixo disto um elemento é um ponto ou um anel, não uma caixa de conteúdo. */
const RUIDO_PX = 24;

/* As duas larguras onde a página vive de verdade: 360 é o telemóvel
   comum, 320 é o mais estreito que ainda se vende. Se passa nas duas,
   passa em tudo o que está no meio. */
const VIEWPORTS = [
  { nome: "360", width: 360, height: 780 },
  { nome: "320", width: 320, height: 720 },
];

/* ┌────────────────────────────────────────────────────────────────────┐
   │ A HOMEPAGE DEIXOU DE RAMIFICAR POR PERFIL — RAMIFICA POR ROTA       │
   │                                                                    │
   │ Enquanto `/` era uma página só, o que mudava dentro dela era o     │
   │ perfil guardado: hero, calculadora e launchpad tinham quatro       │
   │ versões, e medir uma era medir um quarto da página. Daí os quatro  │
   │ perfis.                                                            │
   │                                                                    │
   │ A homepage de cinco focos inverte isso. `usePerfil` já não é lido  │
   │ por nada que ela renderize — a bússola ESCREVE o perfil ao         │
   │ encaminhar, e a ramificação passou a ser o URL: cinco rotas        │
   │ estáticas, cada uma com o seu palco. Repetir a mesma rota quatro   │
   │ vezes media quatro vezes o mesmo DOM; o que ficava por medir eram  │
   │ as OUTRAS QUATRO ROTAS, que nunca passaram por aqui.               │
   │                                                                    │
   │ A matriz troca perfis por rotas, ao mesmo custo: 5 × 2 larguras ×  │
   │ 2 temas.                                                           │
   └────────────────────────────────────────────────────────────────────┘ */
const PAGINAS = [
  { nome: "descobrir", url: "/", foco: "descobrir" },
  { nome: "preco", url: "/inicio/preco", foco: "preco" },
  { nome: "recibos", url: "/inicio/recibos", foco: "recibos" },
  { nome: "empresa", url: "/inicio/empresa", foco: "empresa" },
  { nome: "salario", url: "/inicio/salario", foco: "salario" },
];

/* ══════════════════════════════════════════════════════════════════════
   A SONDA, tal como corre DENTRO da página.

   Fica numa string (como o `MEDIDOR` da hierarquia) porque o
   `page.evaluate` serializa o que lhe damos: qualquer coisa que feche
   sobre o módulo chega lá indefinida.
   ══════════════════════════════════════════════════════════════════════ */
const SONDA = ({ piso, alvoMin, ruido }) => {
  const nome = (el) => {
    const partes = [];
    let n = el;
    while (n && n.nodeType === 1 && partes.length < 4) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += `#${n.id}`;
      else if (typeof n.className === "string" && n.className.trim()) {
        s += `.${n.className.trim().split(/\s+/).slice(0, 3).join(".")}`;
      }
      partes.unshift(s);
      n = n.parentElement;
    }
    return partes.join(" > ");
  };

  /** Decorativo: existe para se ver, não para se ler nem tocar. */
  const decorativo = (el, cs) =>
    cs.pointerEvents === "none" ||
    el.closest("[aria-hidden='true']") !== null ||
    el.closest(".sr-only") !== null;

  const vw = document.documentElement.clientWidth;
  const transbordos = [];
  const pequenos = [];
  const alvos = [];
  const esmagados = [];
  const vistos = new Set();

  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const dec = decorativo(el, cs);

    // 2 · transbordo: conteúdo mais largo do que a caixa, e a caixa não o
    //     esconde nem o deixa rolar.
    //
    //     ┌─────────────────────────────────────────────────────────────┐
    //     │ QUEM TRANSBORDA NÃO É QUEM O `scrollWidth` ACUSA             │
    //     │                                                             │
    //     │ Um halo desfocado é `absolute -inset-6` DE PROPÓSITO: é      │
    //     │ maior do que a caixa porque é assim que se desenha uma       │
    //     │ atmosfera. O `scrollWidth` do PAI conta-o à mesma, e com ele │
    //     │ o do avô e o do bisavô — uma única mancha decorativa gerava  │
    //     │ quatro «defeitos» em cascata, nenhum deles real.             │
    //     │                                                             │
    //     │ Por isso não basta perguntar «esta caixa transborda?». É     │
    //     │ preciso perguntar «transborda por causa de QUÊ?» — e só      │
    //     │ conta se houver um descendente NÃO decorativo a sair por     │
    //     │ fora. Senão o portão passa a gritar onde não há nada, e um   │
    //     │ portão que grita de mais deixa de ser lido.                  │
    //     └─────────────────────────────────────────────────────────────┘
    if (
      !dec &&
      el.scrollWidth > el.clientWidth + 1 &&
      el.clientWidth > ruido &&
      r.height > 4 &&
      cs.overflowX === "visible"
    ) {
      const limite = r.left + el.clientWidth + 1;
      const culpado = [...el.querySelectorAll("*")].find((f) => {
        const fcs = getComputedStyle(f);
        if (fcs.display === "none" || fcs.visibility === "hidden") return false;
        if (decorativo(f, fcs)) return false;
        const fr = f.getBoundingClientRect();
        if (fr.width === 0 || fr.right <= limite) return false;
        // Uma etiqueta flutuante (`position:absolute`) sair da coluna onde
        // se ancora é o que ela existe para fazer: o balão da taxa marginal
        // tem 48px e a coluna 26, e os 11px de cada lado caem por cima das
        // colunas vizinhas de propósito. Só conta como defeito se ela sair
        // do ECRÃ — que é a fronteira onde deixa de haver por onde cair.
        if (fcs.position === "absolute" || fcs.position === "fixed") {
          return fr.left < -1 || fr.right > document.documentElement.clientWidth + 1;
        }
        // ┌───────────────────────────────────────────────────────────┐
        // │ O QUE ROLA NÃO SE PERDE                                    │
        // │                                                           │
        // │ A régua de perguntas sangra até à berma DE PROPÓSITO       │
        // │ (`-mx-4`) e o que sai da coluna é a CALHA — um             │
        // │ `overflow-x:auto` que continua com o dedo, dentro de uma   │
        // │ secção `overflow-hidden` que a recorta. Nada disto é       │
        // │ texto cortado: é a decisão de deixar a régua ir ao         │
        // │ limite do ecrã.                                           │
        // │                                                           │
        // │ O portão já não acusava a calha (uma caixa que assume a    │
        // │ rolagem está isenta) mas acusava os PAIS dela, com a       │
        // │ calha como culpada — e a mesma decisão passava a valer     │
        // │ quatro defeitos por rota. Continua a contar tudo o resto:  │
        // │ um transbordo só é perdoado quando o culpado é uma calha   │
        // │ ou vive dentro de uma.                                    │
        // └───────────────────────────────────────────────────────────┘
        const rola = (n) => {
          const c = getComputedStyle(n);
          return c.overflowX === "auto" || c.overflowX === "scroll";
        };
        if (rola(f)) return false;
        for (let a = f.parentElement; a && a !== el; a = a.parentElement) {
          if (rola(a)) return false;
        }
        if ([...f.querySelectorAll("*")].some((n) => rola(n) && n.getBoundingClientRect().right > limite)) {
          return false;
        }
        return true;
      });
      if (culpado) {
        transbordos.push({
          sel: nome(el),
          caixa: el.clientWidth,
          conteudo: el.scrollWidth,
          excesso: el.scrollWidth - el.clientWidth,
          culpado: nome(culpado),
          texto: (culpado.textContent || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
        });
      }
    }

    // 5 · texto esmagado: um `truncate` reduzido a reticências.
    if (
      !dec &&
      cs.whiteSpace === "nowrap" &&
      cs.textOverflow === "ellipsis" &&
      el.scrollWidth > el.clientWidth + 1 &&
      el.clientWidth < 40 &&
      (el.textContent || "").trim().length > 3
    ) {
      esmagados.push({
        sel: nome(el),
        caixa: el.clientWidth,
        conteudo: el.scrollWidth,
        texto: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
      });
    }

    // 3 · piso tipográfico — só texto PRÓPRIO e visível.
    const proprio = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (proprio.length > 1 && el.closest(".sr-only") === null) {
      const fs = Math.round(parseFloat(cs.fontSize) * 100) / 100;
      if (fs < piso) {
        const chave = `${fs}|${nome(el)}`;
        if (!vistos.has(chave)) {
          vistos.add(chave);
          pequenos.push({ px: fs, sel: nome(el), texto: proprio.slice(0, 60) });
        }
      }
    }

    // 4 · alvos táteis.
    const clicavel =
      el.matches("a[href], button, input, select, textarea, [role='button'], [role='tab'], [role='switch'], [role='checkbox']") &&
      cs.pointerEvents !== "none" &&
      el.closest("[aria-hidden='true']") === null &&
      !el.disabled;
    if (clicavel && (r.height < alvoMin - 0.5 || r.width < ruido)) {
      alvos.push({
        sel: nome(el),
        w: Math.round(r.width),
        h: Math.round(r.height),
        texto: ((el.textContent || "").trim() || el.getAttribute("aria-label") || "").slice(0, 45),
      });
    }
  }

  return {
    vw,
    scrollW: document.documentElement.scrollWidth,
    transbordos: transbordos.slice(0, 25),
    pequenos: pequenos.sort((a, b) => a.px - b.px).slice(0, 25),
    alvos: alvos.slice(0, 25),
    esmagados: esmagados.slice(0, 25),
  };
};

/* ══════════════════════════════════════════════════════════════════════ */

let falhas = 0;
const mal = (msg) => {
  falhas++;
  console.error(`  ✗ ${msg}`);
};

async function correr() {
  const browser = await chromium.launch(EXECUTAVEL ? { executablePath: EXECUTAVEL } : {});
  const resultado = { base: BASE, quando: new Date().toISOString(), corridas: [] };
  if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

  try {
    for (const vp of VIEWPORTS) {
      for (const tema of ["claro", "escuro"]) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          isMobile: true,
          hasTouch: true,
          colorScheme: tema === "escuro" ? "dark" : "light",
        });
        // Tema, consentimento e «Novidades» entram já respondidos: são
        // modais por cima da página, e o que se quer medir é a página.
        await ctx.addInitScript(({ t, versao, consentimento }) => {
          try {
            localStorage.setItem("recibocerto:theme", t);
            localStorage.setItem(
              "recibocerto:cookie-consent",
              JSON.stringify({
                necessarios: true,
                estatistica: false,
                marketing: false,
                data: new Date().toISOString(),
                versao: consentimento,
              }),
            );
            localStorage.setItem("recibocerto:changelog_visto", versao);
          } catch {
            /* modo privado */
          }
        }, {
          t: tema === "escuro" ? "dark" : "light",
          versao: APP_VERSION,
          consentimento: CONSENT_VERSION,
        });

        const page = await ctx.newPage();
        for (const pg of PAGINAS) {
          const etiqueta = `${pg.nome} @${vp.nome}/${tema}`;
          try {
            await page.goto(BASE + pg.url, { waitUntil: "domcontentloaded", timeout: 60000 });
          } catch {
            mal(`${etiqueta}: página não carregou`);
            continue;
          }
          await page.evaluate((t) => {
            document.documentElement.classList.toggle("dark", t === "escuro");
          }, tema);
          // ┌───────────────────────────────────────────────────────────┐
          // │ PERCORRER A PÁGINA NÃO É UM DETALHE — É O QUE A TORNA      │
          // │ MEDÍVEL                                                    │
          // │                                                           │
          // │ O simulador, o comparador e a demo do IRS entram por       │
          // │ `IntersectionObserver` + `next/dynamic`, e enquanto não    │
          // │ chegam o que está no DOM é um esqueleto — que passa em     │
          // │ tudo, porque um esqueleto não tem texto nem alvos. Uma     │
          // │ passagem só, ou uma espera curta, dá um verde que só quer  │
          // │ dizer «não cheguei a ver a página».                        │
          // │                                                           │
          // │ Daí duas passagens e uma sentinela: se no fim não houver   │
          // │ um campo de formulário dentro do `#calculadora`, a medição │
          // │ é declarada inválida em vez de ser dada por boa.           │
          // └───────────────────────────────────────────────────────────┘
          for (let passagem = 0; passagem < 2; passagem++) {
            await page.evaluate(async () => {
              const passo = window.innerHeight * 0.7;
              for (let y = 0; y < document.body.scrollHeight; y += passo) {
                window.scrollTo(0, y);
                await new Promise((r) => setTimeout(r, 150));
              }
            });
            await page.waitForTimeout(1500);
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(1200);

          // A sentinela é o ESQUELETO, não um campo: cada rota de foco
          // abre num palco diferente e as secções abaixo dele entram por
          // `content-visibility` + `next/dynamic`. O que TODAS têm em
          // comum é (a) declararem o foco que renderizaram, (b) terem um
          // palco com altura de palco e (c) deixarem de anunciar «A
          // carregar» quando o chunk chega. Uma rota que responda 200 e
          // renderize o foco errado — ou o esqueleto — é uma medição
          // inválida, não um verde.
          const porMontar = await page.evaluate((focoEsperado) => {
            const falta = [];
            const principal = document.querySelector("main[data-homepage-foco]");
            if (!principal) return ["main[data-homepage-foco] (ausente)"];
            const foco = principal.getAttribute("data-homepage-foco");
            if (foco !== focoEsperado) {
              falta.push(`renderizou «${foco}» onde se esperava «${focoEsperado}»`);
            }
            const palco = document.querySelector("[data-palco]");
            if (!palco) falta.push("palco (ausente)");
            else {
              const altura = Math.round(palco.getBoundingClientRect().height);
              if (altura < 300) falta.push(`palco (altura ${altura}px)`);
            }
            const diferidas = [...document.querySelectorAll(".rc-home-deferred")];
            if (diferidas.length === 0) falta.push("secções diferidas (ausentes)");
            diferidas.forEach((seccao, indice) => {
              const altura = Math.round(seccao.getBoundingClientRect().height);
              if (/A carregar/i.test(seccao.textContent || "")) {
                falta.push(`secção diferida ${indice + 1} (ainda no esqueleto)`);
              } else if (altura < 120) {
                falta.push(`secção diferida ${indice + 1} (altura ${altura}px)`);
              }
            });
            return falta;
          }, pg.foco);
          if (porMontar.length) {
            mal(`${etiqueta}: a página não chegou a montar — ${porMontar.join(", ")}. Medição inválida (não é um verde, é uma página por carregar)`);
            continue;
          }

          const r = await page.evaluate(SONDA, {
            piso: PISO_PX,
            alvoMin: ALVO_MIN,
            ruido: RUIDO_PX,
          });
          resultado.corridas.push({ ...pg, viewport: vp.nome, tema, ...r });

          const problemas =
            (r.scrollW > r.vw + 1 ? 1 : 0) +
            r.transbordos.length +
            r.pequenos.length +
            r.alvos.length +
            r.esmagados.length;

          if (problemas === 0) {
            console.log(`  ✓ ${etiqueta}`);
          } else {
            console.log(`\n  ▌ ${etiqueta}`);
            if (r.scrollW > r.vw + 1) {
              mal(`${etiqueta}: a página rola de lado — ${r.scrollW}px numa janela de ${r.vw}`);
            }
            for (const t of r.transbordos) {
              mal(`${etiqueta}: transborda ${t.excesso}px (caixa ${t.caixa}, conteúdo ${t.conteudo}) — ${t.sel}\n      por causa de: ${t.culpado}\n      «${t.texto}»`);
            }
            for (const e of r.esmagados) {
              mal(`${etiqueta}: texto esmagado a ${e.caixa}px (precisa de ${e.conteudo}) — ${e.sel}\n      «${e.texto}»`);
            }
            for (const p of r.pequenos) {
              mal(`${etiqueta}: ${p.px}px < ${PISO_PX}px — ${p.sel}\n      «${p.texto}»`);
            }
            for (const a of r.alvos) {
              mal(`${etiqueta}: alvo ${a.w}×${a.h} < ${ALVO_MIN}px — ${a.sel}\n      «${a.texto}»`);
            }
          }

          if (CAPTURAS) {
            await page.screenshot({
              path: join(CAPTURAS, `${pg.nome}-${vp.nome}-${tema}.png`),
              fullPage: true,
            });
          }
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (RELATORIO) {
    writeFileSync(RELATORIO, JSON.stringify(resultado, null, 2));
    console.log(`\nRelatório cru em ${RELATORIO}`);
  }

  console.log(
    falhas === 0
      ? `\n✓ Telemóvel: nada rola de lado, nada transborda, nada abaixo de ${PISO_PX}px, nenhum alvo abaixo de ${ALVO_MIN}px.`
      : `\n✗ Telemóvel: ${falhas} ${falhas === 1 ? "falha" : "falhas"}.`,
  );
  process.exit(falhas === 0 ? 0 : 1);
}

correr().catch((e) => {
  console.error(e);
  process.exit(1);
});
