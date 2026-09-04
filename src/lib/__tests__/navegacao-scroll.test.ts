import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
//  UMA NAVEGAÇÃO ABRE A PÁGINA NO PRINCÍPIO
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE ISTO EXISTE PARA TORNAR IMPOSSÍVEL                     │
//  │                                                                     │
//  │ `scroll={false}` num `<Link>` desliga a única coisa que o Next faz   │
//  │ por nós numa navegação: pôr a página nova no princípio. Estava em    │
//  │ cinco sítios — os cinco pilares do telemóvel, a cápsula de           │
//  │ secretária e três ligações de foco — e em nenhum deles havia uma     │
//  │ linha a justificá-lo. Entraram todos no mesmo commit, colados ao     │
//  │ `prefetch={false}`, que esse sim tinha razão escrita.                │
//  │                                                                     │
//  │ Medido a 390×780, com a página rolada a 75 % e a tocar num pilar:    │
//  │                                                                     │
//  │     de /              tocar «Preço»      →  y 12794 → 12794  (88 %)  │
//  │     de /inicio/preco  tocar «Recibos»    →  y 11004 → 11004  (84 %)  │
//  │     de /inicio/preco  tocar «Empresa»    →  y 11004 → 11004  (84 %)  │
//  │     de /inicio/preco  tocar «Salário»    →  y 11004 → 11004  (83 %)  │
//  │     de /inicio/preco  tocar «Descobrir»  →  y 11004 → 11004  (64 %)  │
//  │                                                                     │
//  │ Cinco de dez combinações a abrir a página no rodapé. A rota estava   │
//  │ certa, o conteúdo estava certo, e nada dava erro — só o sítio da     │
//  │ página é que não. É a pior forma de o produto falhar: a pessoa pede  │
//  │ para VER uma coisa e recebe o fim de outra.                          │
//  │                                                                     │
//  │ Este portão lê a FONTE porque é aí que o defeito vive, e porque um   │
//  │ `scroll={false}` novo não parte nenhum teste, nenhum tipo e nenhum   │
//  │ build — entra em silêncio, como este entrou.                         │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  A REGRA, numa linha:
//
//      muda de ROTA        → abre no princípio (sem `scroll: false`)
//      muda de PARÂMETRO   → fica onde está    (com `scroll: false`)
//        na mesma rota
//
//  A segunda metade não é uma excepção arranjada para o teste passar: é
//  outra coisa. Carregar num interruptor que está à vista não é pedir
//  outra página, e levar a pessoa ao topo aí move-lhe o ecrã por baixo do
//  dedo.
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");

/**
 * Os sítios onde `scroll: false` é legítimo, com a razão de cada um.
 *
 * Uma lista de isenções sem razão escrita apodrece: daqui a seis meses
 * ninguém sabe se ainda faz sentido, e a saída fácil passa a ser
 * acrescentar mais uma linha. Cada entrada tem de dizer PORQUÊ, e o teste
 * a seguir confirma que a razão continua a ser verdade no código.
 */
const ISENCOES: Record<string, { porque: string; exigeNaFonte: string }> = {
  "components/foco/salario/HeroSalarioBifurcado.tsx": {
    porque:
      "É um `replace` para a MESMA rota, a trocar o parâmetro que diz qual " +
      "dos dois percursos está escolhido. Não é uma navegação: é um " +
      "interruptor à vista, e levar a pessoa ao topo mover-lhe-ia o ecrã " +
      "por baixo do dedo.",
    // A prova de que continua a ser a mesma rota: o destino é construído a
    // partir do `pathname` corrente. Se um dia passar a apontar para outro
    // sítio, esta asserção cai e a isenção deixa de valer.
    exigeNaFonte: "router.replace(`${window.location.pathname}?",
  },
};

/** Todos os `.ts`/`.tsx` de `src/`, excepto os próprios testes. */
function fontes(dir: string, fora: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === "__tests__" || nome === "generated") continue;
      fontes(caminho, fora);
    } else if (/\.tsx?$/.test(nome)) {
      fora.push(caminho);
    }
  }
  return fora;
}

/**
 * A fonte sem comentários.
 *
 * Os ficheiros deste projecto explicam-se em quadros, e os quadros CITAM o
 * que não está lá — «NÃO VOLTAR A PÔR AQUI `scroll={false}`». Procurar no
 * texto todo reprovaria por causa da explicação de porque é que a coisa
 * está ausente, e a saída óbvia (apagar a explicação) é a errada.
 */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const FICHEIROS = fontes(SRC).map((caminho) => ({
  rel: caminho.slice(SRC.length + 1).replaceAll("\\", "/"),
  codigo: semComentarios(readFileSync(caminho, "utf8")),
}));

describe("navegacao:scroll", () => {
  it("nenhuma ligação desliga o scroll-to-top de uma navegação", () => {
    const infratores = FICHEIROS.filter(
      (f) => !ISENCOES[f.rel] && /scroll=\{false\}/.test(f.codigo),
    ).map((f) => f.rel);

    expect(
      infratores,
      `\`scroll={false}\` desliga o scroll-to-top e abre a página a meio — ` +
        `medido a 88% da altura, no rodapé. Se for mesmo uma troca de ` +
        `parâmetro na MESMA rota, acrescenta o ficheiro a ISENCOES com a ` +
        `razão escrita.\nEm falta: ${infratores.join(", ")}`,
    ).toEqual([]);
  });

  it("nenhum `router.push`/`replace` desliga o scroll fora das isenções", () => {
    const infratores = FICHEIROS.filter(
      (f) => !ISENCOES[f.rel] && /scroll:\s*false/.test(f.codigo),
    ).map((f) => f.rel);

    expect(infratores, `Em falta: ${infratores.join(", ")}`).toEqual([]);
  });

  it("cada isenção continua a ser o que a sua razão diz", () => {
    for (const [rel, { porque, exigeNaFonte }] of Object.entries(ISENCOES)) {
      const f = FICHEIROS.find((x) => x.rel === rel);
      expect(f, `a isenção aponta para um ficheiro que já não existe: ${rel}`).toBeDefined();
      // A razão tem de estar escrita, e ser mais do que um aceno.
      expect(porque.length, `${rel}: a isenção precisa de uma razão a sério`).toBeGreaterThan(60);
      // E o código tem de continuar a fazer o que a razão diz que faz.
      expect(
        f!.codigo,
        `${rel}: a isenção diz «${porque}», mas o código já não contém ` +
          `\`${exigeNaFonte}\` — a razão deixou de ser verdade.`,
      ).toContain(exigeNaFonte);
      // E tem mesmo de usar o que a isenção autoriza; uma isenção que já
      // não é precisa é uma isenção que fica a proteger nada.
      expect(
        /scroll:\s*false|scroll=\{false\}/.test(f!.codigo),
        `${rel}: já não desliga o scroll — tira a isenção em vez de a deixar a apodrecer.`,
      ).toBe(true);
    }
  });

  it("a garantia está montada na raiz, e vale para o site todo", () => {
    // Tirar os `scroll={false}` corrigiu a maior parte, e não tudo: o Next
    // ainda rola por conta própria depois de nós — seis `scrollIntoView`
    // encadeados, apanhados com o protótipo instrumentado, o último dos
    // quais deixava o planeador a abrir a 841 px. A garantia tem de existir
    // em UM sítio e valer para todas as rotas, e não rota a rota.
    const layout = readFileSync(join(SRC, "app", "layout.tsx"), "utf8");
    expect(layout).toContain("<AbrirNoPrincipio />");
    expect(layout).toContain('from "@/components/navegacao/AbrirNoPrincipio"');
  });

  it("a garantia cede à pessoa, à âncora e à chegada", () => {
    // As três formas de esta correcção se tornar ela própria um defeito:
    //  · insistir depois de a pessoa começar a ler (o ecrã a fugir do dedo);
    //  · roubar o destino a quem pediu uma âncora;
    //  · atirar ao topo quem só recarregou a página a meio de uma leitura.
    const fonte = readFileSync(
      join(SRC, "components", "navegacao", "AbrirNoPrincipio.tsx"),
      "utf8",
    );
    const codigo = semComentarios(fonte);
    expect(codigo).toContain("window.location.hash");
    expect(codigo).toContain("chegada.current");
    for (const gesto of ["wheel", "touchstart", "keydown", "pointerdown"]) {
      expect(codigo, `o gesto «${gesto}» tem de largar a página`).toContain(`"${gesto}"`);
    }
    // `behavior: "auto"` e não o `smooth` do `globals.css`: um scroll
    // animado é um scroll interrompível, e o meio de uma página de 18 000 px
    // é tão mau como o fim.
    expect(codigo).toContain('behavior: "auto"');
  });

  it("a barra do telemóvel continua a tratar do toque no pilar onde já se está", () => {
    // O Next não trata deste caso: tocar no separador aceso não é uma
    // navegação, e sem isto quem estava no fim da página ficava lá, com o
    // toque a não fazer nada visível. É o complemento do scroll-to-top, e
    // não um substituto dele.
    const chrome = readFileSync(join(SRC, "components", "ChromeMobile.tsx"), "utf8");
    expect(chrome).toContain("naRotaExacta");
    expect(chrome).toContain("window.scrollTo({ top: 0");
  });
});
