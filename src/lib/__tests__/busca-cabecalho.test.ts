import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { construirDocumentos } from "@/lib/busca/documentos";
import { CAMINHO_INDICE, INTENCOES, VERSAO_INDICE, intencaoPorContexto } from "@/lib/busca/esquema";
import {
  LIMIAR,
  MIN_CARACTERES,
  TETO_DIALOGO,
  TETO_POPOVER,
  agruparPorTipo,
  pesquisar,
  pontuarTexto,
} from "@/lib/busca/pontuar";
import { distanciaAteUm, normalizar, tokens } from "@/lib/busca/normalizar";
import { termoGuardavel } from "@/lib/busca/recentes";
import { sugestoesPorContexto } from "@/lib/busca/sugestoes";
import { MENU_GRUPOS, PILARES, SECOES, destinoAtivo, hrefAtivo } from "@/lib/navegacao";
import { gerarPrazos } from "@/lib/prazos";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { GUIAS } from "@/lib/guias-config";
import { CATALOGO_FERRAMENTAS } from "@/lib/ferramentas";
import { PRIORIDADE } from "@/components/overlays/CoordenadorOverlays";

// ─────────────────────────────────────────────────────────────────────
// O cabeçalho e a pesquisa apoiam-se em ligações que NENHUM compilador
// verifica: a cobertura do catálogo, o que a pesquisa considera parecido,
// um prefixo de rota, o que se guarda no dispositivo. Todas falham da
// mesma maneira — em silêncio, com um `?? fallback` ou um `.filter()` a
// apagar o engano — e o que se vê é a interface ligeiramente errada, não
// um erro.
//
// Estes testes transformam cada uma dessas ligações numa reprovação.
// ─────────────────────────────────────────────────────────────────────

const DOCS = construirDocumentos();
const NAV = readFileSync(join(process.cwd(), "src", "components", "Nav.tsx"), "utf8");

describe("cabecalho: pesquisa em destaque", () => {
  it("abre visível e ocupa uma linha inteira abaixo dos cinco focos", () => {
    // A pesquisa é uma porta principal do produto. Este contrato impede
    // que volte a ser comprimida num ícone ou escondida por omissão numa
    // reformulação do hero.
    expect(NAV).toContain("const [abertoManual, setAbertoManual] = useState(true)");
    const capsula = NAV.indexOf("<CapsulaNav foco={foco} />");
    const busca = NAV.indexOf('<LancadorBusca inputId="rc-header-busca" />');
    expect(capsula).toBeGreaterThan(-1);
    expect(busca).toBeGreaterThan(capsula);
    expect(NAV.slice(busca - 100, busca)).toContain("w-full");
  });
});

describe("busca:cobertura", () => {
  it("indexa TODOS os guias publicáveis da fonte canónica", () => {
    // Era esta a falha P0-01: o índice do cabeçalho tinha 14 guias escritos
    // à mão e o catálogo público tinha 167. A pesquisa ignorava mais de 90%
    // do que havia para ler, e nada dava erro — apenas devolvia menos.
    const esperados = GUIAS.map((g) => g.href).sort();
    const indexados = DOCS.filter((d) => d.tipo === "guia")
      .map((d) => d.href)
      .sort();

    expect(indexados).toEqual(esperados);
  });

  it("indexa todas as ferramentas do catálogo público", () => {
    const esperados: string[] = CATALOGO_FERRAMENTAS
      .filter((f) => f.surfaces.includes("search"))
      .map((f) => f.canonicalHref as string)
      .sort();
    const indexados = DOCS.filter((d) => d.tipo === "ferramenta" || d.tipo === "quiz")
      .map((d) => d.href)
      .filter((h) => esperados.includes(h))
      .sort();

    expect(indexados).toEqual(esperados);
  });

  it("não há ids repetidos nem destinos repetidos fora das atividades", () => {
    const ids = DOCS.map((d) => d.id);
    expect(new Set(ids).size, "ids duplicados no índice").toBe(ids.length);

    const destinos = DOCS.filter((d) => d.tipo !== "atividade").map((d) => d.href);
    expect(new Set(destinos).size, "destinos duplicados no índice").toBe(destinos.length);
  });

  it("todo o documento tem destino absoluto, título e descrição", () => {
    for (const d of DOCS) {
      expect(d.href.startsWith("/"), `${d.id} sem rota absoluta`).toBe(true);
      expect(d.titulo.trim().length, `${d.id} sem título`).toBeGreaterThan(0);
      expect(d.descricao.trim().length, `${d.id} sem descrição`).toBeGreaterThan(0);
      expect(d.intencoes.length, `${d.id} sem intenção`).toBeGreaterThan(0);
      expect(d.perfis.length, `${d.id} sem perfil`).toBeGreaterThan(0);
    }
  });

  it("o ficheiro gerado está em dia com a fonte", () => {
    // O painel do cabeçalho consome o JSON, não este módulo. Se os dois
    // divergirem, os testes ficam todos verdes e a pesquisa em produção
    // continua a devolver o catálogo antigo — que é exactamente a classe
    // de defeito que a auditoria encontrou.
    const bruto = readFileSync(join(process.cwd(), "public", CAMINHO_INDICE.replace(/^\//, "")), "utf8");
    const indice = JSON.parse(bruto) as { versao: number; documentos: { id: string }[] };

    expect(indice.versao).toBe(VERSAO_INDICE);
    expect(indice.documentos.map((d) => d.id)).toEqual(DOCS.map((d) => d.id));
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  COBERTURA v3 — o site inteiro, e não só o que é conteúdo
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTE BLOCO EXISTE PARA TORNAR IMPOSSÍVEL                       │
//  │                                                                     │
//  │ A versão anterior do índice cobria ferramentas, guias, atividades,   │
//  │ o quiz e os planos — e nada mais. Havia perguntas inteiras do site   │
//  │ sem resposta possível: «quando entrego o IVA?» caía no guia do IVA,  │
//  │ «como calculam isto?» não devolvia a metodologia, «quero falar com   │
//  │ alguém» não devolvia o diretório de contabilistas.                   │
//  │                                                                     │
//  │ Nenhuma destas falhas dava erro. Davam menos — e «menos» é           │
//  │ exactamente o que ninguém vê num índice de trezentos documentos.     │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

describe("busca:cobertura-v3", () => {
  it("todo o documento declara família de decisão e renderer", () => {
    for (const d of DOCS) {
      expect(d.dominio, `${d.id} sem domínio`).toBeTruthy();
      expect(d.renderer, `${d.id} sem renderer`).toBeTruthy();
    }
  });

  it("as três famílias de obrigações existem e trazem fonte", () => {
    const obrigacoes = DOCS.filter((d) => d.tipo === "obrigacao");
    expect(obrigacoes.map((d) => d.id).sort()).toEqual([
      "obrigacao:irs",
      "obrigacao:iva",
      "obrigacao:ss",
    ]);

    // A regra absoluta do produto: nenhuma afirmação sobre a lei sem
    // proveniência. Aqui é o tipo que a impõe, e este teste que a prova.
    for (const o of obrigacoes) {
      expect(o.fonte?.url, `${o.id} sem URL de fonte`).toMatch(/^https:\/\//);
      expect(o.fonte?.label, `${o.id} sem rótulo de fonte`).toBeTruthy();
      expect(o.fonte?.revistoEm, `${o.id} sem data de revisão`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(o.renderer).toBe("obligation");
    }
  });

  it("a contagem de prazos da descrição vem do motor, não de um número escrito", () => {
    // E é a contagem do CALENDÁRIO, não a de uma pessoa: o motor gera as
    // datas dos dois regimes de IVA, e somá-las como se fossem as de
    // alguém dá um número correcto à letra e errado na prática.
    // Se a lei mudar e `gerarPrazos` passar a produzir outras datas, a
    // descrição muda com ela. Um número à mão ficaria a mentir em silêncio.
    const prazos = gerarPrazos(FISCAL_YEAR);
    const iva = DOCS.find((d) => d.id === "obrigacao:iva")!;
    const datas = prazos.filter((p) => p.categoria === "iva").length;
    expect(iva.descricao).toContain(`${datas} datas no calendário`);
    expect(iva.anoFiscal).toBe(FISCAL_YEAR);
    expect(iva.descricao, "não diz que o regime manda").toContain("dependem do teu regime");
  });

  it("as páginas institucionais entram, e derivam do menu", () => {
    const paginas = DOCS.filter((d) => d.tipo === "pagina").map((d) => d.href);
    for (const esperado of ["/metodologia", "/estado-dos-dados", "/privacidade", "/termos", "/ferramentas", "/guias"]) {
      expect(paginas, `${esperado} fora do índice`).toContain(esperado);
    }

    // O menu é a fonte: uma entrada nova em «Confiar» ou «Legal» tem de
    // aparecer aqui sem ninguém tocar no índice.
    const doMenu = MENU_GRUPOS.filter((g) => g.titulo === "Confiar" || g.titulo === "Legal")
      .flatMap((g) => g.entradas.map((e) => e.href))
      .sort();
    for (const href of doMenu) expect(paginas).toContain(href);
  });

  it("o apoio profissional é uma zona própria — e não traz perfis no índice", () => {
    const apoio = DOCS.filter((d) => d.tipo === "apoio");
    expect(apoio).toHaveLength(1);
    expect(apoio[0].href).toBe("/contabilistas");
    expect(apoio[0].renderer).toBe("professional_support");

    // Um perfil de contabilista no índice estático seria publicar o
    // diretório inteiro em JSON, congelado no último build.
    const bruto = readFileSync(join(process.cwd(), "public", CAMINHO_INDICE.replace(/^\//, "")), "utf8");
    expect(bruto).not.toContain("/contabilistas/");
  });

  it("as ferramentas de comparação apresentam-se como comparação", () => {
    const comparar = DOCS.find((d) => d.id === "ferramenta:comparar-regimes");
    expect(comparar?.renderer).toBe("comparison");
    expect(comparar?.dominio).toBe("comparar");
  });

  it("os destinos que exigem conta dizem-no antes do clique", () => {
    for (const d of DOCS) {
      if (d.href.startsWith("/dashboard")) {
        expect(d.requerConta, `${d.id} vai para o painel sem o declarar`).toBe(true);
      }
    }
  });
});

describe("busca:relevancia-v3", () => {
  it("«iva» sozinho responde com o guia, não com o calendário que exige conta", () => {
    // Ver o quadro em `documentos.ts`: um alias exacto vale 120 pontos e
    // passa à frente de qualquer título. Bastou ter «iva» na lista de
    // aliases da obrigação para a melhor resposta a uma pergunta comum
    // deixar de ser a melhor resposta.
    const primeiro = pesquisar("iva", DOCS, { limite: 8 })[0];
    expect(primeiro.doc.tipo).toBe("guia");
  });

  it("«quando entrego o iva» responde com a obrigação", () => {
    const primeiro = pesquisar("quando entrego o iva", DOCS, { limite: 8 })[0];
    expect(primeiro.doc.id).toBe("obrigacao:iva");
  });

  it("a frase completa vale sempre mais do que parte dela", () => {
    // O defeito que a consulta acima destapou: as regras de frase saíam com
    // `return` imediato (prefixo = 90) e nunca chegavam a contar palavras.
    // Numa consulta de quatro palavras o tecto dos tokens é 180 — logo,
    // quem tinha a frase inteira perdia para quem só tinha três das
    // palavras. Ver o quadro em `pontuar.ts`.
    const comFrase = pontuarTexto(normalizar("quando entrego o iva"), "quando entrego o iva");
    const comParte = pontuarTexto(normalizar("quando entrego o iva"), "quando entrego o irs e mais coisas");
    expect(comFrase).toBeGreaterThan(comParte);
  });

  it("«contabilista» leva ao diretório, e não a um guia sobre contabilistas", () => {
    const primeiro = pesquisar("contabilista", DOCS, { limite: 8 })[0];
    expect(primeiro.doc.tipo).toBe("apoio");
  });

  it("«metodologia» e «privacidade» encontram as suas páginas", () => {
    expect(pesquisar("metodologia", DOCS, { limite: 5 })[0].doc.href).toBe("/metodologia");
    expect(pesquisar("privacidade", DOCS, { limite: 5 })[0].doc.href).toBe("/privacidade");
  });
});

describe("busca:relevancia", () => {
  it("não aceita correspondência por letras dispersas", () => {
    // O caso reproduzido em produção: «doações» devolvia «Retenção na
    // fonte» e «Fatura, recibo e fatura-recibo» porque as letras apareciam
    // pela mesma ordem algures no texto. Um resultado assim não é mau: é
    // inventado, e ensina a pessoa a não confiar na pesquisa.
    const titulos = pesquisar("doações", DOCS).map((r) => r.doc.titulo);
    expect(titulos).not.toContain("Retenção na fonte");
    expect(titulos).not.toContain("Fatura, recibo e fatura-recibo");
  });

  it("«doações» continua a encontrar o que é mesmo sobre doações", () => {
    // Um matcher que não devolve falsos positivos por não devolver nada
    // não teria resolvido nada.
    const titulos = pesquisar("doações", DOCS).map((r) => r.doc.titulo.toLowerCase());
    expect(titulos.some((t) => t.includes("doar") || t.includes("doaç") || t.includes("heran"))).toBe(true);
  });

  it("perdoa uma gralha em palavras longas, e só nessas", () => {
    expect(pesquisar("segurnça social", DOCS).length).toBeGreaterThan(0);

    // Três letras: uma edição transforma «iva» noutra pergunta. A distância
    // é a mesma; o que muda é a decisão de não a perdoar.
    expect(distanciaAteUm("iva", "ivo")).toBe(true);
    const sinteticos = [
      {
        id: "curto",
        tipo: "guia" as const,
        titulo: "Regras do IVA",
        descricao: "Uma explicação.",
        href: "/guias/x",
        aliases: [],
        grupo: "IVA",
        intencoes: ["compreender" as const],
        perfis: ["todos" as const],
        dominio: "obrigacoes" as const,
        renderer: "guide" as const,
        prioridade: 50,
      },
    ];
    expect(pesquisar("ivo", sinteticos)).toEqual([]);
  });

  it("a subcadeia tem de começar numa fronteira de palavra", () => {
    // `includes` puro reintroduzia o problema da subsequência pela porta do
    // lado: «ira» encontrava «primeira», «estrangeira» e «Parteiras».
    for (const r of pesquisar("ira", DOCS)) {
      const texto = `${r.doc.titulo} ${r.doc.aliases.join(" ")} ${r.doc.descricao}`.toLowerCase();
      expect(/(^|\s)ira/.test(normalizar(texto)) || /(^|\s)ir[ae]/.test(normalizar(texto)), r.doc.titulo).toBe(true);
    }
  });

  it("não devolve nada abaixo do mínimo de caracteres", () => {
    expect(pesquisar("", DOCS)).toEqual([]);
    expect(pesquisar("a", DOCS)).toEqual([]);
    expect(MIN_CARACTERES).toBe(2);
  });

  it("não lista atividades sem consulta", () => {
    // P0-04: o estado vazio de «Atividades» criava 120 resultados e 130
    // controlos focáveis dentro da pesquisa.
    const atividades = DOCS.filter((d) => d.tipo === "atividade");
    expect(atividades.length).toBeGreaterThan(100);
    expect(pesquisar("", atividades)).toEqual([]);
  });

  it("respeita os tectos das duas superfícies", () => {
    expect(pesquisar("irs", DOCS, { limite: TETO_POPOVER }).length).toBeLessThanOrEqual(TETO_POPOVER);
    expect(pesquisar("irs", DOCS, { limite: TETO_DIALOGO }).length).toBeLessThanOrEqual(TETO_DIALOGO);
    expect(TETO_POPOVER).toBe(8);
    expect(TETO_DIALOGO).toBe(12);
  });

  it("cada resultado sabe dizer que campo o produziu", () => {
    for (const r of pesquisar("iva", DOCS, { limite: 8 })) {
      expect(["titulo", "aliases", "descricao"]).toContain(r.campo);
      expect(r.pontos).toBeGreaterThanOrEqual(LIMIAR);
    }
  });

  it("uma consulta com duas palavras prefere quem responde às duas", () => {
    const resultados = pesquisar("abrir empresa", DOCS, { limite: 8 });
    expect(resultados.length).toBeGreaterThan(0);
    const primeiro = `${resultados[0].doc.titulo} ${resultados[0].doc.aliases.join(" ")}`.toLowerCase();
    expect(primeiro).toContain("empresa");
  });

  it("o grupo do melhor resultado vem primeiro, mesmo não sendo ferramenta", () => {
    // Uma ordem fixa de tipos enterrava o melhor resultado: em «iva», o guia
    // ganhava por larga margem e aparecia depois de uma calculadora que só o
    // menciona na descrição.
    const grupos = agruparPorTipo(pesquisar("iva", DOCS, { limite: 8 }));
    expect(grupos[0][0]).toBe("guia");
    // E dentro do grupo, a ordem continua a ser a do ranking.
    for (const [, lista] of grupos) {
      const pontos = lista.map((r) => r.pontos);
      expect([...pontos].sort((a, b) => b - a)).toEqual(pontos);
    }
  });

  it("a ordenação é estável — dois empates não trocam de lugar", () => {
    const a = pesquisar("irs", DOCS, { limite: 8 }).map((r) => r.doc.id);
    const b = pesquisar("irs", [...DOCS].reverse(), { limite: 8 }).map((r) => r.doc.id);
    expect(a).toEqual(b);
  });

  it("o filtro por intenção só devolve documentos dessa intenção", () => {
    for (const i of INTENCOES) {
      if (i.id === "tudo") continue;
      for (const r of pesquisar("irs", DOCS, { intencao: i.id })) {
        expect(r.doc.intencoes, `${r.doc.id} não é «${i.id}»`).toContain(i.id);
      }
    }
  });

  it("normaliza acentos, maiúsculas e pontuação", () => {
    expect(normalizar("Fatura-Recibo, Ç/Ã!")).toBe("fatura recibo c a");
    expect(tokens("IRS Jovem 2026")).toEqual(["irs", "jovem", "2026"]);
  });
});

describe("busca:privacidade", () => {
  it("não guarda o que parece um identificador", () => {
    // Num produto fiscal a barra recebe NIF, IBAN e nomes de clientes — e
    // o histórico fica num dispositivo que pode ser partilhado.
    expect(termoGuardavel("123456789")).toBeNull();
    expect(termoGuardavel("o meu nif é 123456789")).toBeNull();
    expect(termoGuardavel("PT50 0002 0123 1234 5678 9015 4")).toBeNull();
    expect(termoGuardavel("alguem@exemplo.pt")).toBeNull();
    expect(termoGuardavel("recebi 12 500,00 euros")).toBeNull();
    expect(termoGuardavel("a")).toBeNull();
    expect(termoGuardavel("x".repeat(200))).toBeNull();
  });

  it("guarda uma pesquisa normal", () => {
    expect(termoGuardavel("  iva   recibos  verdes ")).toBe("iva recibos verdes");
  });
});

describe("cabecalho:navegacao", () => {
  // A barra deixou de ter «Simular · Guias · Quiz · Planos · Contabilistas»
  // e passou a ter os CINCO PILARES. A mudança foi deliberada e está
  // explicada em `lib/navegacao.ts`; o que estes testes garantem é que a
  // regra nova vale nas duas superfícies e não só numa.

  it("cada pilar acende na rota para onde aponta", () => {
    for (const pilar of PILARES) {
      expect(hrefAtivo(pilar.href), `«${pilar.label}» aponta para ${pilar.href} e não acende lá`).toBe(pilar.href);
    }
  });

  it("cada secção do menu acende na rota para onde aponta", () => {
    for (const secao of SECOES) {
      expect(hrefAtivo(secao.href), `«${secao.label}» não acende em ${secao.href}`).toBe(secao.href);
    }
  });

  it("o pilar ganha à secção que o contém", () => {
    // `/ferramentas/recibos-verdes` casa com o prefixo do pilar «Recibos
    // verdes» E com o de «Todas as ferramentas». Sem uma ordem decidida de
    // uma vez, respondiam os dois que sim — e dois `aria-current="page"` no
    // mesmo documento dizem a um leitor de ecrã que a pessoa está em dois
    // sítios ao mesmo tempo.
    expect(destinoAtivo("/ferramentas/recibos-verdes")?.tipo).toBe("pilar");
    expect(hrefAtivo("/ferramentas/recibos-verdes")).toBe("/ferramentas/recibos-verdes");
    expect(hrefAtivo("/ferramentas/calcular-preco")).toBe("/ferramentas/calcular-preco");
    // Uma ferramenta que NÃO é pilar continua a acender a secção.
    expect(hrefAtivo("/ferramentas/simulador-irs")).toBe("/ferramentas");
    expect(hrefAtivo("/ferramentas")).toBe("/ferramentas");
    expect(hrefAtivo("/guias/iva-recibos-verdes")).toBe("/guias");
    expect(hrefAtivo("/quiz-fiscal/iva")).toBe("/quiz-fiscal");
  });

  it("uma rota sem destino não acende nada", () => {
    // Meio caminho é o pior estado: um item aceso numa página a que ele não
    // pertence diz à pessoa que está noutro sítio.
    expect(destinoAtivo("/privacidade")).toBeNull();
    expect(destinoAtivo("/dashboard")).toBeNull();
    expect(destinoAtivo("/")).toBeNull();
    // `/precos-especiais` não é `/precos`: um prefixo tem de casar no
    // separador, senão qualquer rota que comece pelas mesmas letras acende.
    expect(destinoAtivo("/precos-especiais")).toBeNull();
    // E `/contabilista` (o painel, no singular) não é `/contabilistas`.
    expect(destinoAtivo("/contabilista")).toBeNull();
  });

  it("nunca há dois destinos acesos ao mesmo tempo", () => {
    const rotas = [
      "/", "/ferramentas", "/ferramentas/simulador-irs", "/ferramentas/recibos-verdes",
      "/ferramentas/calcular-preco", "/ferramentas/descobrir-negocio", "/guias", "/guias/x",
      "/quiz-fiscal", "/precos", "/contabilistas", "/contabilistas/joao",
    ];
    for (const rota of rotas) {
      const aceso = hrefAtivo(rota);
      const quantos = [...PILARES, ...SECOES].filter((d) => d.href === aceso).length;
      expect(quantos, `${rota} acende ${quantos} destinos`).toBeLessThanOrEqual(1);
    }
  });

  it("são cinco pilares — o número de lugares da barra do telemóvel", () => {
    // Não é um número redondo escolhido por gosto: é o que cabe na barra
    // inferior a 360 px com rótulo visível em cada lugar. Ver o quadro em
    // `chrome-movel.test.ts`. Um sexto pilar obriga a rever ESSE limite
    // primeiro, e não a espremer os rótulos.
    expect(PILARES).toHaveLength(5);
  });

  it("os dois motores são pilares, e não itens enterrados no hub", () => {
    // Declaravam `surfaces: [..., "homepage", ...]` no catálogo e não
    // apareciam em lado nenhum fora de `/ferramentas`. Agora são os dois
    // primeiros lugares da navegação, nas duas superfícies.
    const ids = PILARES.map((p) => p.id);
    expect(ids.slice(0, 2)).toEqual(["descobrir", "preco"]);
    expect(PILARES.map((p) => p.toolId)).toContain("calcular-preco");
    expect(PILARES.map((p) => p.toolId)).toContain("descobrir-negocio");
  });

  it("todo o pilar tem rótulo curto que cabe na barra do telemóvel", () => {
    // Medido a 360 px: cada um dos cinco lugares tem ~64,8 px úteis, e em
    // DM Sans 10px/600 com `tracking-tight` cabem cerca de doze caracteres.
    // Nove é o tecto que este projeto assume, com folga deliberada.
    for (const pilar of PILARES) {
      expect(pilar.curto.length, `«${pilar.curto}» é comprido de mais para a barra`).toBeLessThanOrEqual(9);
      expect(pilar.curto.trim().length).toBeGreaterThan(0);
      expect(pilar.label.trim().length).toBeGreaterThan(0);
      expect(pilar.resultado.trim().length, `«${pilar.label}» sem linha de resultado`).toBeGreaterThan(0);
    }
  });

  it("todo o pilar aponta para o destino canónico de uma ferramenta real", () => {
    const porId = new Map(CATALOGO_FERRAMENTAS.map((f) => [f.id, f]));
    for (const pilar of PILARES) {
      const ferramenta = porId.get(pilar.toolId);
      expect(ferramenta, `pilar «${pilar.label}» aponta para a ferramenta inexistente ${pilar.toolId}`).toBeDefined();
      expect(pilar.href, `pilar «${pilar.label}» não usa o canonical do catálogo`).toBe(ferramenta!.canonicalHref);
      // Nunca uma query da homepage — era o defeito P0-02.
      expect(pilar.href.startsWith("/ferramentas/")).toBe(true);
    }
  });
});

describe("cabecalho:intencao", () => {
  it("navegação e intenção da pesquisa são contratos separados", () => {
    // P1-01: `Quiz` e `Planos` PARECIAM âmbitos da pesquisa e não mudavam
    // corpus nenhum. Agora a intenção não vem da navegação — vem da rota, e
    // é um eixo próprio. Com «Simular» fora da barra, a separação passou a
    // ser TOTAL: nenhum rótulo de navegação é o nome de uma intenção.
    const rotulos = [...PILARES.map((p) => p.label), ...SECOES.map((s) => s.label)];
    const intencoes = INTENCOES.map((i) => i.label);
    expect(rotulos.filter((r) => intencoes.includes(r))).toEqual([]);
  });

  it("a intenção sugerida segue a rota", () => {
    expect(intencaoPorContexto("/guias")).toBe("compreender");
    expect(intencaoPorContexto("/ferramentas/simulador-irs")).toBe("simular");
    expect(intencaoPorContexto("/")).toBe("tudo");
  });

  it("toda a intenção tem rótulo e explicação", () => {
    for (const i of INTENCOES) {
      expect(i.label.trim().length, `intenção «${i.id}» sem rótulo`).toBeGreaterThan(0);
      expect(i.sub.trim().length, `intenção «${i.id}» sem explicação`).toBeGreaterThan(0);
    }
  });
});

describe("busca:estado-inicial", () => {
  it("são no máximo três sugestões, e todas apontam para rotas reais", () => {
    // P1-04: o painel abria com quinze destinos e exigia leitura antes de
    // se poder pesquisar.
    for (const rota of ["/", "/guias", "/ferramentas", "/dashboard/prazos"]) {
      const sugestoes = sugestoesPorContexto(rota);
      expect(sugestoes.length, `${rota} sugere ${sugestoes.length}`).toBeLessThanOrEqual(3);
      for (const s of sugestoes) {
        expect(s.href.startsWith("/"), `${s.id} sem rota absoluta`).toBe(true);
        expect(s.pergunta.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("as sugestões de guia existem mesmo no catálogo", () => {
    const hrefs = new Set(DOCS.map((d) => d.href));
    for (const rota of ["/", "/guias", "/ferramentas"]) {
      for (const s of sugestoesPorContexto(rota)) {
        if (!s.href.startsWith("/guias/")) continue;
        expect(hrefs.has(s.href), `${s.href} não existe no índice`).toBe(true);
      }
    }
  });
});

describe("cabecalho:recursos", () => {
  it("nada do que saiu da barra se perdeu — mudou de sítio", () => {
    // «Guias», «Quiz», «Planos» e «Contabilistas» eram itens da barra e
    // passaram para a folha do menu (e para o rodapé). Isto garante que a
    // mudança foi de SÍTIO e não de conteúdo.
    const destinos = MENU_GRUPOS.flatMap((g) => g.entradas);
    for (const rota of ["/guias", "/quiz-fiscal", "/precos", "/contabilistas", "/ferramentas"]) {
      expect(destinos.map((d) => d.href), `${rota} desapareceu da navegação`).toContain(rota);
    }
    for (const item of destinos) {
      expect(item.href.startsWith("/"), `${item.label} não tem rota absoluta`).toBe(true);
      expect(item.label.trim().length).toBeGreaterThan(0);
    }
    // Sem destinos repetidos entre grupos: dois caminhos para o mesmo sítio
    // na mesma superfície é o defeito, não a conveniência.
    const hrefs = destinos.map((d) => d.href);
    expect(new Set(hrefs).size, "há destinos repetidos no menu").toBe(hrefs.length);
  });
});

describe("overlays:prioridade", () => {
  it("o consentimento vem primeiro e as novidades por último", () => {
    // P0-05: na primeira visita, «Novidades» aparecia por cima das
    // preferências de cookies e o foco ficava no diálogo de baixo.
    expect(PRIORIDADE.cookies).toBeGreaterThan(PRIORIDADE.busca);
    expect(PRIORIDADE.cookies).toBeGreaterThan(PRIORIDADE.auth);
    expect(PRIORIDADE.novidades).toBeLessThan(PRIORIDADE.auth);
    expect(Math.min(...Object.values(PRIORIDADE))).toBe(PRIORIDADE.novidades);
  });
});
