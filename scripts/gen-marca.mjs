// ═══════════════════════════════════════════════════════════════════════
//  OS ATIVOS DE MARCA EM RASTER — RC-MARCA-001
//  ---------------------------------------------------------------------
//  Não existia um único PNG da marca no projeto, e isso não era um
//  detalhe: era a causa de três buracos ao mesmo tempo.
//
//    · A Stripe exige JPG/PNG para o ícone e o logótipo. Sem eles, o
//      checkout, os recibos, as faturas e o portal saíam sem marca.
//    · O Google exige JPG/PNG/BMP para o logótipo do ecrã de
//      consentimento. Sem ele, não há verificação de marca — e sem
//      verificação, o Google mostra o domínio em vez do nome.
//    · O iOS ignora SVG no `apple-touch-icon`. Quem punha o site no ecrã
//      principal ficava com um quadrado genérico.
//
//  Gerar em vez de exportar à mão é o que garante que os cinco ficheiros
//  são o MESMO desenho. Exportados um a um, bastava um retoque no SVG
//  para ficarem quatro versões da marca em circulação — que é exatamente
//  o problema que este projeto acabou de corrigir.
//
//  Usa o Chromium do Playwright, que já é dependência de
//  desenvolvimento. Não acrescenta nada ao `package.json`.
//
//    node scripts/gen-marca.mjs           gera
//    node scripts/gen-marca.mjs --check   falha se estiver desatualizado
// ═══════════════════════════════════════════════════════════════════════

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(RAIZ, "public", "marca");
const VERIFICAR = process.argv.includes("--check");

const marca = readFileSync(join(RAIZ, "src", "app", "icon.svg"), "utf8");
const logotipo = readFileSync(join(RAIZ, "public", "logo.svg"), "utf8");

/** O papel da marca. Nunca transparente onde o destino não a suporta. */
const BRANCO = "#FFFFFF";

const PECAS = [
  // ── Ícone quadrado ────────────────────────────────────────────────
  // 512 é o tamanho de origem: serve o manifest e é de onde a Stripe e o
  // Google reamostram sem perder nitidez.
  { nome: "icone-512.png", svg: marca, largura: 512, altura: 512, margem: 0.06, fundo: null },
  { nome: "icone-256.png", svg: marca, largura: 256, altura: 256, margem: 0.06, fundo: null },
  // 192 e 180: manifest (Android) e `apple-touch-icon`. O iOS compõe a
  // transparência sobre PRETO, por isso estes levam papel a sério.
  { nome: "icone-192.png", svg: marca, largura: 192, altura: 192, margem: 0.1, fundo: BRANCO },
  { nome: "icone-180.png", svg: marca, largura: 180, altura: 180, margem: 0.1, fundo: BRANCO },
  // 120×120 é o tamanho que o Google recomenda para o logótipo do ecrã
  // de consentimento.
  { nome: "icone-120.png", svg: marca, largura: 120, altura: 120, margem: 0.1, fundo: BRANCO },

  // ── Logótipo com o nome ───────────────────────────────────────────
  // Proporção do `logo.svg` (240×48), a 2× e a 4×.
  { nome: "logotipo-960.png", svg: logotipo, largura: 960, altura: 192, margem: 0.04, fundo: null },
  // Para email: fundo a sério, porque metade dos clientes não compõe
  // transparência de forma previsível.
  { nome: "logotipo-email.png", svg: logotipo, largura: 480, altura: 96, margem: 0.04, fundo: BRANCO },
];

function pagina({ svg, largura, altura, margem, fundo }) {
  const p = Math.round(Math.min(largura, altura) * margem);
  // O SVG entra como <img> de um data URI: assim o Chromium escala-o como
  // vetor, e o resultado é nítido em qualquer tamanho.
  const uri = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0}
    body{width:${largura}px;height:${altura}px;display:flex;align-items:center;
         justify-content:center;background:${fundo ?? "transparent"};
         box-sizing:border-box;padding:${p}px}
    img{width:100%;height:100%;object-fit:contain;display:block}
  </style><img src="${uri}" alt="">`;
}

const sha = (b) => createHash("sha256").update(b).digest("hex");

// ── Porque é que a verificação olha para os SVG e não para os PNG ──────
//  Comparar os PNG gerados com os do repositório parece o teste óbvio e
//  é o errado: dois Chromium de versões diferentes produzem bytes
//  diferentes para o mesmo desenho, e o portão passaria a falhar em CI
//  por razões que não têm nada a ver com a marca.
//
//  O que interessa saber é outra coisa: «alguém mexeu no desenho e
//  esqueceu-se de regenerar?». Isso lê-se na ORIGEM — os dois SVG e a
//  lista de peças. É determinístico, e é exatamente a pergunta certa.
const IMPRESSAO = join(SAIDA, "origem.json");
const impressaoAtual = {
  marca: sha(marca),
  logotipo: sha(logotipo),
  pecas: sha(JSON.stringify(PECAS.map((p) => [p.nome, p.svg === marca ? "marca" : "logotipo", p.largura, p.altura, p.margem, p.fundo]))),
};

if (VERIFICAR) {
  const gravada = existsSync(IMPRESSAO) ? JSON.parse(readFileSync(IMPRESSAO, "utf8")) : null;
  const emFalta = PECAS.filter((p) => !existsSync(join(SAIDA, p.nome))).map((p) => p.nome);
  const mudou = !gravada || Object.keys(impressaoAtual).some((k) => gravada[k] !== impressaoAtual[k]);
  if (emFalta.length || mudou) {
    console.error("Ativos de marca desatualizados. Corre `npm run marca:gen` e inclui os ficheiros no commit.");
    for (const f of emFalta) console.error(`  · em falta: ${f}`);
    if (mudou) console.error("  · o desenho de origem (SVG) mudou desde a última geração");
    process.exit(1);
  }
  console.log(`Ativos de marca em dia — ${PECAS.length} ficheiros.`);
  process.exit(0);
}

const navegador = await chromium.launch(
  // Mesma convenção dos outros scripts: um Chromium do sistema quando existe.
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
);
const contexto = await navegador.newContext({ deviceScaleFactor: 1 });
const p = await contexto.newPage();

mkdirSync(SAIDA, { recursive: true });

for (const peca of PECAS) {
  await p.setViewportSize({ width: peca.largura, height: peca.altura });
  await p.setContent(pagina(peca), { waitUntil: "load" });
  const png = await p.screenshot({ omitBackground: peca.fundo === null, type: "png" });
  writeFileSync(join(SAIDA, peca.nome), png);
  console.log(`  ${peca.nome.padEnd(22)} ${peca.largura}×${peca.altura}  ${(png.length / 1024).toFixed(1)} KB`);
}

await navegador.close();
writeFileSync(IMPRESSAO, `${JSON.stringify(impressaoAtual, null, 2)}\n`);

console.log(`\n${PECAS.length} ativos em public/marca/`);
