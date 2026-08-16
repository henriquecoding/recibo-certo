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
    const perfil = ler("src/app/contabilista/perfil/page.tsx");
    const linkedinConta = ler("src/components/contabilistas/LinkedInConta.tsx");

    expect(perfil).toContain("dark:bg-stone-900");
    expect(perfil).toContain("dark:text-stone-100");
    expect(perfil).toContain("dark:border-stone-700");
    expect(linkedinConta).toContain("dark:bg-stone-950/55");
    expect(linkedinConta).toContain("dark:text-stone-100");

    // Cada superfície nova do diretório declara fundo, texto e limite no
    // tema escuro — o modo claro nunca deixa de ser o que estava escrito.
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
