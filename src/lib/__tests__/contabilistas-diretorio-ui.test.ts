import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

// O diretório deixou de ser um ficheiro só: o orquestrador trata do estado
// e dos pedidos, o cartão da apresentação, e o finder e os filtros dos
// controlos. As garantias abaixo não mudaram de exigência — mudaram de
// morada, e algumas ficaram mais fortes (ver o LinkedIn).
const CLIENTE = "src/app/contabilistas/DiretorioCliente.tsx";
const CARTAO = "src/app/contabilistas/ContabilistaCard.tsx";
const FINDER = "src/app/contabilistas/DiretorioFinder.tsx";
const FILTROS = "src/app/contabilistas/DiretorioFiltros.tsx";
const DADOS = "src/lib/contabilistas/diretorio.ts";

describe("diretório e perfil profissional — apresentação e tema", () => {
  it("substitui os selects nativos pelos menus do design system", () => {
    const finder = ler(FINDER);
    const cliente = ler(CLIENTE);
    const perfil = ler("src/app/contabilista/perfil/page.tsx");
    const select = ler("src/components/ui/SelectMenu.tsx");

    expect(finder).toContain("SelectMenu");
    expect(cliente).toContain("SelectMenu");
    expect(perfil).toContain("SelectMenu");
    for (const fonte of [finder, cliente, ler(CARTAO), ler(FILTROS), perfil]) {
      expect(fonte).not.toContain("<select");
    }
    expect(select).toContain('role="listbox"');
    expect(select).toContain('role="option"');
    expect(select).toContain('evento.key === "ArrowDown"');
    expect(select).toContain('evento.key === "Escape"');
    expect(select).toContain("dark:bg-stone-950");
    expect(select).toContain("dark:text-stone-200");
  });

  it("mostra identidade profissional e LinkedIn sem criar uma query por cartão", () => {
    const cartao = ler(CARTAO);
    const dados = ler(DADOS);
    const avatar = ler("src/components/contabilistas/AvatarContabilista.tsx");

    // A garantia antiga era «uma leitura em lote para todos os cartões».
    // Agora é mais forte: os dados do LinkedIn vêm na MESMA consulta dos
    // resultados, e não há sequer uma segunda ida à base.
    expect(dados).toContain("linkedin_ligado");
    expect(dados).toContain("linkedin_avatar_url");
    expect(cartao).not.toMatch(/obterLinkedIn/);
    expect(ler(CLIENTE)).not.toMatch(/obterLinkedIn/);

    expect(cartao).toContain("AvatarContabilista");
    expect(cartao).toContain("LinkedIn ligado");
    expect(cartao).toContain("Aceita clientes");
    expect(cartao).toContain("Sem vagas");
    expect(cartao).toContain("Ver perfil");
    expect(dados).toContain("Perfil profissional aprovado");
    expect(avatar).toContain("avatarLinkedInExpirou");
  });

  it("mantém contraste explícito no modo escuro", () => {
    // ⚠️ MUDANÇA DE CONVENÇÃO, deliberada.
    //
    // Este teste exigia `dark:bg-stone-900` / `dark:text-stone-100` /
    // `dark:border-stone-700` nos ecrãs do PAINEL. Isso contorna a camada
    // de override `.dark` de `globals.css` — e ganha-lhe, porque a variante
    // do Tailwind sai depois no CSS compilado com a mesma especificidade
    // (`.dark\:bg-stone-900:is(.dark *)` = (0,2,0), tal como
    // `.dark .bg-white`).
    //
    // O efeito era visível: os cartões do perfil e da fidelidade ficavam
    // com a palete FRIA do Tailwind (#1c1917) enquanto os da agenda e dos
    // casos ficavam com a palete QUENTE do projeto (#1e221b). Duas palete
    // escuras no mesmo painel, a um clique de distância.
    //
    // A regra passa a ser a do `CLAUDE.md` e da skill de design: nos
    // neutros, quem manda é a camada `.dark`. O que este teste garante
    // agora é que ninguém volta a redeclará-los — e isso está fixado em
    // `contabilistas-painel-coerencia.test.ts`.
    const perfil = ler("src/app/contabilista/perfil/page.tsx");
    const linkedinConta = ler("src/components/contabilistas/LinkedInConta.tsx");

    for (const [nome, fonte] of [["perfil", perfil], ["LinkedInConta", linkedinConta]] as const) {
      // `bg-white` e `border-stone-200` continuam lá: é deles que a camada
      // `.dark` deriva o tom escuro.
      expect(fonte, `${nome} deixou de usar as superfícies do design system`)
        .toMatch(/bg-white|bg-cream/);
    }

    // O DIRETÓRIO PÚBLICO é outra coisa e mantém-se como estava: são
    // superfícies fora do painel, e a unificação acima não lhes tocou.
    for (const ficheiro of [CLIENTE, CARTAO, FINDER, FILTROS]) {
      const fonte = ler(ficheiro);
      expect(fonte, ficheiro).toMatch(/dark:bg-stone-9\d0/);
      expect(fonte, ficheiro).toMatch(/dark:text-stone-[123]00/);
      expect(fonte, ficheiro).toMatch(/dark:border-stone-[78]00/);
    }
  });

  it("a procura é acessível: rótulo real, submissão e estado anunciado", () => {
    const finder = ler(FINDER);
    const cliente = ler(CLIENTE);
    const filtros = ler(FILTROS);

    // Um `placeholder` não é um rótulo.
    expect(finder).toContain('htmlFor="diretorio-procura"');
    expect(finder).toContain("sr-only");
    expect(finder).toContain('role="search"');
    // Enter dentro do formulário procura, e não recarrega a página.
    expect(finder).toContain("onSubmit");
    expect(finder).toContain("evento.preventDefault()");
    // As etiquetas são botões com estado, não `<span onClick>`.
    expect(finder).toContain("aria-pressed");
    expect(filtros).toContain("aria-pressed");
    // O contador de resultados é anunciado sem interromper a escrita.
    expect(cliente).toContain('role="status"');
    expect(cliente).toContain('aria-live="polite"');
  });

  it("o telemóvel tem folha inferior com foco preso e área segura", () => {
    const filtros = ler(FILTROS);

    expect(filtros).toContain("SuperficieModal");
    expect(filtros).toContain("max-h-[90dvh]");
    expect(filtros).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(filtros).toContain("env(safe-area-inset-bottom)");
    expect(filtros).toContain("rounded-t-4xl");
    // A coluna de filtros do desktop não aparece no telemóvel.
    expect(filtros).toContain("hidden");
    expect(filtros).toContain("lg:block");
  });

  it("o estado da procura vive no endereço", () => {
    const cliente = ler(CLIENTE);

    expect(cliente).toContain("useSearchParams");
    expect(cliente).toContain("parseFiltro");
    expect(cliente).toContain("filtroParaQuery");
    expect(cliente).toContain("window.history.replaceState");
  });
});
