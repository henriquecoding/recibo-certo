// Monta a página de revisão dos emails a partir do que `render-emails.mjs`
// produziu. Só junta — quem preenche os moldes é o outro script.
//
//   node scripts/gerar-revisao-emails.mjs <pasta-dos-html> <ficheiro-de-saida>

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pasta = process.argv[2];
const saida = process.argv[3];
const indice = JSON.parse(readFileSync(join(pasta, "indice.json"), "utf8"));

// O canal de cada um vem do catálogo (`src/lib/email/exemplos.ts`), que por
// sua vez espelha `aviso_merece_email()`. Uma tabela à parte aqui seria mais
// um sítio para dizer o contrário da base de dados.

const GRUPOS = [
  { id: "conta", nome: "Conta e subscrição", de: 1, ate: 4,
    nota: "Enviados diretamente pelo código, no momento do facto." },
  { id: "fiscal", nome: "Alertas fiscais", de: 5, ate: 13,
    nota: "O guardião do limite de IVA, os prazos e a auditoria ao recibo." },
  { id: "plataforma", nome: "Plataforma de contabilistas", de: 14, ate: 24,
    nota: "Um molde só. O que decide se sai email é aviso_merece_email() na base de dados." },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const num = (f) => parseInt(f.slice(0, 2), 10);

const itens = indice.map((e) => ({ ...e, canal: e.canal ?? "email", n: num(e.ficheiro) }));
const porEmail = itens.filter((i) => i.canal === "email").length;
const porSino = itens.length - porEmail;

const lista = GRUPOS.map((g) => {
  const doGrupo = itens.filter((i) => i.n >= g.de && i.n <= g.ate);
  return `
    <section class="grupo">
      <h2 class="grupo-nome">${esc(g.nome)} <span class="grupo-cont">${doGrupo.length}</span></h2>
      <p class="grupo-nota">${esc(g.nota)}</p>
      <ul class="lista">
        ${doGrupo.map((i) => `
          <li>
            <button class="item" data-alvo="${esc(i.ficheiro)}" type="button">
              <span class="item-topo">
                <span class="item-rotulo">${esc(i.rotulo)}</span>
                ${i.novo ? '<span class="chip chip-novo">novo</span>' : ""}
                ${i.canal === "sino" ? '<span class="chip chip-sino">só sino</span>' : ""}
              </span>
              <span class="item-assunto">${esc(i.subject)}</span>
            </button>
          </li>`).join("")}
      </ul>
    </section>`;
}).join("");

const moldes = itens.map((i) => `
<script type="text/plain" id="html-${esc(i.ficheiro)}">${i.html.replace(/<\//g, "<\\/")}</script>`).join("");

const dados = JSON.stringify(
  Object.fromEntries(itens.map((i) => [i.ficheiro, {
    rotulo: i.rotulo,
    assunto: i.subject, quando: i.quando, canal: i.canal,
  }])),
);

const pagina = `<title>Emails do ReciboCerto</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
  :root {
    --ground: #FBFAF8; --surface: #FFFFFF; --surface-2: #F5F4F1;
    --linha: #E7E5E4; --linha-forte: #D6D3D1;
    --ink: #1C1917; --texto: #44403C; --fraco: #78716C; --tenue: #A8A29E;
    --marca: #1D9E75; --marca-escura: #0F6E56; --marca-tenue: #E1F5EE;
    --ambar: #B45309; --ambar-tenue: #FEF6E7;
    --raio: 12px;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #14120F; --surface: #1C1917; --surface-2: #232019;
      --linha: #2E2A26; --linha-forte: #3D3833;
      --ink: #F5F5F4; --texto: #D6D3D1; --fraco: #A8A29E; --tenue: #78716C;
      --marca: #34C795; --marca-escura: #6FDCB4; --marca-tenue: #10352A;
      --ambar: #F0B252; --ambar-tenue: #3A2A12;
    }
  }
  :root[data-theme="dark"] {
    --ground: #14120F; --surface: #1C1917; --surface-2: #232019;
    --linha: #2E2A26; --linha-forte: #3D3833;
    --ink: #F5F5F4; --texto: #D6D3D1; --fraco: #A8A29E; --tenue: #78716C;
    --marca: #34C795; --marca-escura: #6FDCB4; --marca-tenue: #10352A;
    --ambar: #F0B252; --ambar-tenue: #3A2A12;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--ground); color: var(--texto);
    font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 15px; line-height: 1.6; -webkit-font-smoothing: antialiased;
  }
  .env { max-width: 1240px; margin: 0 auto; padding: 40px 20px 64px; }

  header.topo { border-bottom: 1px solid var(--linha); padding-bottom: 28px; margin-bottom: 32px; }
  .sobrescrito {
    font-family: "IBM Plex Mono", monospace; font-size: 11px; letter-spacing: .14em;
    text-transform: uppercase; color: var(--marca-escura); margin: 0 0 10px;
  }
  h1 {
    font-family: Newsreader, Georgia, serif; font-weight: 600; font-size: clamp(30px, 4.6vw, 44px);
    line-height: 1.12; color: var(--ink); margin: 0 0 12px; text-wrap: balance; letter-spacing: -.01em;
  }
  .intro { margin: 0; max-width: 62ch; color: var(--fraco); font-size: 15.5px; }

  .marcadores { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
  .marcador {
    display: flex; flex-direction: column; gap: 2px; padding: 10px 15px;
    background: var(--surface); border: 1px solid var(--linha); border-radius: var(--raio); min-width: 132px;
  }
  .marcador b {
    font-family: Newsreader, Georgia, serif; font-size: 26px; font-weight: 600;
    color: var(--ink); line-height: 1; font-variant-numeric: tabular-nums;
  }
  .marcador span {
    font-family: "IBM Plex Mono", monospace; font-size: 10.5px; letter-spacing: .08em;
    text-transform: uppercase; color: var(--tenue);
  }

  .alerta {
    display: flex; gap: 12px; margin-top: 22px; padding: 15px 17px;
    background: var(--ambar-tenue); border: 1px solid color-mix(in srgb, var(--ambar) 30%, transparent);
    border-radius: var(--raio);
  }
  .alerta-barra { width: 3px; border-radius: 3px; background: var(--ambar); flex: none; }
  .alerta p { margin: 0; font-size: 14px; color: var(--texto); }
  .alerta strong { color: var(--ink); }
  .alerta code {
    font-family: "IBM Plex Mono", monospace; font-size: 12.5px;
    background: color-mix(in srgb, var(--ambar) 14%, transparent); padding: 1px 5px; border-radius: 4px;
  }

  .palco { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 28px; align-items: start; }
  @media (max-width: 940px) { .palco { grid-template-columns: 1fr; } }

  .grupo { margin-bottom: 26px; }
  .grupo-nome {
    display: flex; align-items: baseline; gap: 8px; margin: 0 0 3px;
    font-size: 12px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--ink);
  }
  .grupo-cont {
    font-family: "IBM Plex Mono", monospace; font-size: 11px; font-weight: 400;
    color: var(--tenue); font-variant-numeric: tabular-nums;
  }
  .grupo-nota { margin: 0 0 12px; font-size: 12.5px; line-height: 1.5; color: var(--tenue); }
  .lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }

  .item {
    width: 100%; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 3px;
    padding: 11px 13px; background: var(--surface); border: 1px solid var(--linha);
    border-radius: 10px; color: inherit; font: inherit; transition: border-color .13s, background .13s;
  }
  .item:hover { border-color: var(--linha-forte); background: var(--surface-2); }
  .item:focus-visible { outline: 2px solid var(--marca); outline-offset: 2px; }
  .item[aria-current="true"] {
    border-color: var(--marca); background: var(--marca-tenue);
    box-shadow: inset 3px 0 0 var(--marca);
  }
  .item-topo { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .item-rotulo { font-size: 13.5px; font-weight: 600; color: var(--ink); }
  .item-assunto {
    font-family: "IBM Plex Mono", monospace; font-size: 11.5px; color: var(--fraco);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .chip {
    font-family: "IBM Plex Mono", monospace; font-size: 9.5px; letter-spacing: .07em;
    text-transform: uppercase; padding: 2px 6px; border-radius: 5px; font-weight: 500; flex: none;
  }
  .chip-novo { background: var(--marca); color: #fff; }
  .chip-sino { background: var(--ambar-tenue); color: var(--ambar); border: 1px solid color-mix(in srgb, var(--ambar) 34%, transparent); }

  .painel { position: sticky; top: 20px; border: 1px solid var(--linha); border-radius: 14px; background: var(--surface); overflow: hidden; }
  .painel-topo { padding: 17px 19px; border-bottom: 1px solid var(--linha); }
  .painel-rotulo { margin: 0 0 8px; font-family: Newsreader, Georgia, serif; font-size: 21px; font-weight: 600; color: var(--ink); }
  .campo { display: flex; gap: 9px; font-size: 13px; margin-top: 5px; }
  .campo dt {
    font-family: "IBM Plex Mono", monospace; font-size: 10.5px; letter-spacing: .07em;
    text-transform: uppercase; color: var(--tenue); width: 62px; flex: none; padding-top: 2px;
  }
  .campo dd { margin: 0; color: var(--texto); }
  .campo dd.mono { font-family: "IBM Plex Mono", monospace; font-size: 12.5px; color: var(--ink); }

  .barra {
    display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
    padding: 10px 19px; border-bottom: 1px solid var(--linha); background: var(--surface-2);
  }
  .larguras { display: flex; gap: 4px; }
  .larg {
    font-family: "IBM Plex Mono", monospace; font-size: 11px; padding: 5px 11px; cursor: pointer;
    background: transparent; border: 1px solid var(--linha); border-radius: 7px; color: var(--fraco);
    transition: all .13s; min-height: 30px;
  }
  .larg:hover { border-color: var(--linha-forte); color: var(--ink); }
  .larg[aria-pressed="true"] { background: var(--ink); border-color: var(--ink); color: var(--ground); }
  .larg:focus-visible { outline: 2px solid var(--marca); outline-offset: 2px; }

  .canal { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .ponto { width: 7px; height: 7px; border-radius: 50%; flex: none; }
  .canal.email .ponto { background: var(--marca); }
  .canal.email { color: var(--marca-escura); }
  .canal.sino .ponto { background: var(--ambar); }
  .canal.sino { color: var(--ambar); }

  .moldura { padding: 22px; display: flex; justify-content: center; background: var(--surface-2); }
  .quadro {
    width: 100%; max-width: 640px; border: 1px solid var(--linha); border-radius: 10px;
    background: #FAFAF9; transition: max-width .22s ease; overflow: hidden;
  }
  iframe { width: 100%; border: 0; display: block; height: 720px; background: #FAFAF9; }

  footer {
    margin-top: 40px; padding-top: 22px; border-top: 1px solid var(--linha);
    font-size: 12.5px; color: var(--tenue); max-width: 74ch;
  }
  footer code { font-family: "IBM Plex Mono", monospace; font-size: 11.5px; }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>

<div class="env">
  <header class="topo">
    <p class="sobrescrito">ReciboCerto · revisão de correio</p>
    <h1>Os 24 emails que o produto sabe enviar</h1>
    <p class="intro">
      Todos os moldes, em todas as variantes, preenchidos com dados de exemplo realistas
      e desenhados exatamente como chegam a uma caixa de entrada. Escolhe um à esquerda.
    </p>

    <div class="marcadores">
      <div class="marcador"><b>24</b><span>variantes</span></div>
      <div class="marcador"><b>8</b><span>moldes</span></div>
      <div class="marcador"><b>${porEmail}</b><span>vão ao email</span></div>
      <div class="marcador"><b>${porSino}</b><span>só ao sino</span></div>
    </div>

    ${porSino > 0 ? `
    <div class="alerta">
      <div class="alerta-barra"></div>
      <p>
        <strong>${porSino} ${porSino === 1 ? "aviso não chega" : "avisos não chegam"} ao email.</strong>
        ${porSino === 1 ? "Acende" : "Acendem"} o sino na aplicação, mas não ${porSino === 1 ? "sai" : "saem"}
        por email — <code>aviso_merece_email()</code> não ${porSino === 1 ? "o" : "os"} admite.
        Quem não voltar ao site continua sem saber.
      </p>
    </div>` : ""}
  </header>

  <div class="palco">
    <nav aria-label="Emails disponíveis">${lista}</nav>

    <div class="painel">
      <div class="painel-topo">
        <h2 class="painel-rotulo" id="p-rotulo">—</h2>
        <dl style="margin:0">
          <div class="campo"><dt>Assunto</dt><dd class="mono" id="p-assunto">—</dd></div>
          <div class="campo"><dt>Dispara</dt><dd id="p-quando">—</dd></div>
        </dl>
      </div>
      <div class="barra">
        <div class="larguras" role="group" aria-label="Largura de pré-visualização">
          <button class="larg" type="button" data-w="390" aria-pressed="false">390 px · telemóvel</button>
          <button class="larg" type="button" data-w="640" aria-pressed="true">640 px · computador</button>
        </div>
        <span class="canal email" id="p-canal"><span class="ponto"></span><span id="p-canal-txt">Vai ao email</span></span>
      </div>
      <div class="moldura">
        <div class="quadro" id="quadro">
          <iframe id="palco" title="Pré-visualização do email"></iframe>
        </div>
      </div>
    </div>
  </div>

  <footer>
    Gerado a partir de <code>src/lib/email/templates.ts</code> por <code>scripts/render-emails.mjs</code>,
    sem enviar nada. O que aqui se vê é o molde a ser preenchido — a entrega real depende de
    <code>RESEND_API_KEY</code> estar configurada e do domínio <code>recibocerto.pt</code> estar
    verificado no Resend.
  </footer>
</div>

${moldes}

<script>
  const DADOS = ${dados};
  const palco = document.getElementById("palco");
  const quadro = document.getElementById("quadro");
  const botoes = Array.from(document.querySelectorAll(".item"));

  function mostrar(ficheiro) {
    const meta = DADOS[ficheiro];
    if (!meta) return;
    const fonte = document.getElementById("html-" + ficheiro);
    palco.srcdoc = fonte.textContent;

    document.getElementById("p-rotulo").textContent = meta.rotulo;
    document.getElementById("p-assunto").textContent = meta.assunto;
    document.getElementById("p-quando").textContent = meta.quando;

    const canal = document.getElementById("p-canal");
    canal.className = "canal " + meta.canal;
    document.getElementById("p-canal-txt").textContent =
      meta.canal === "email" ? "Vai ao email" : "Só acende o sino — não sai email";

    botoes.forEach((b) => b.setAttribute("aria-current", String(b.dataset.alvo === ficheiro)));
    try { localStorage.setItem("rc:email-visto", ficheiro); } catch (e) {}
  }

  botoes.forEach((b) => b.addEventListener("click", () => mostrar(b.dataset.alvo)));

  document.querySelectorAll(".larg").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".larg").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      quadro.style.maxWidth = b.dataset.w + "px";
    });
  });

  let inicial = botoes[0]?.dataset.alvo;
  try {
    const guardado = localStorage.getItem("rc:email-visto");
    if (guardado && DADOS[guardado]) inicial = guardado;
  } catch (e) {}
  if (inicial) mostrar(inicial);
</script>
`;

writeFileSync(saida, pagina, "utf8");
console.log(`· revisão escrita para ${saida} (${(pagina.length / 1024).toFixed(0)} KB)`);
