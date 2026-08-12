import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { construirDocumentos } from "@/lib/busca/documentos";
import { CAMINHO_INDICE, INTENCOES, VERSAO_INDICE, intencaoPorContexto } from "@/lib/busca/esquema";
import { LIMIAR, MIN_CARACTERES, TETO_DIALOGO, TETO_POPOVER, agruparPorTipo, pesquisar } from "@/lib/busca/pontuar";
import { distanciaAteUm, normalizar, tokens } from "@/lib/busca/normalizar";
import { termoGuardavel } from "@/lib/busca/recentes";
import { sugestoesPorContexto } from "@/lib/busca/sugestoes";
import { NAV_APRENDER, NAV_FERRAMENTAS, NAV_PRINCIPAL, navAtivo } from "@/components/nav-config";
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
  it("cada item acende na rota para onde aponta", () => {
    for (const item of NAV_PRINCIPAL) {
      expect(navAtivo(item.href)?.label, `«${item.label}» aponta para ${item.href} e não acende lá`).toBe(item.label);
    }
  });

  it("as sub-rotas de ferramentas acendem «Simular»", () => {
    // P1-01: `/ferramentas/...` não acendia nada, porque o item só ficava
    // activo na raiz exacta. Dez páginas sem indicador de onde se estava.
    expect(navAtivo("/ferramentas")?.label).toBe("Simular");
    expect(navAtivo("/ferramentas/simulador-irs")?.label).toBe("Simular");
    expect(navAtivo("/ferramentas/classificar-atividade")?.label).toBe("Simular");
    expect(navAtivo("/guias/iva-recibos-verdes")?.label).toBe("Guias");
    expect(navAtivo("/quiz-fiscal/iva")?.label).toBe("Quiz");
  });

  it("uma rota sem item não acende nada", () => {
    // Meio caminho é o pior estado: um item aceso numa página a que ele não
    // pertence diz à pessoa que está noutro sítio.
    expect(navAtivo("/privacidade")).toBeNull();
    expect(navAtivo("/dashboard")).toBeNull();
    expect(navAtivo("/")).toBeNull();
    // `/precos-especiais` não é `/precos`: um prefixo tem de casar no
    // separador, senão qualquer rota que comece pelas mesmas letras acende.
    expect(navAtivo("/precos-especiais")).toBeNull();
  });

  it("nunca há dois itens acesos ao mesmo tempo", () => {
    const rotas = ["/", "/ferramentas", "/ferramentas/simulador-irs", "/guias", "/guias/x", "/quiz-fiscal", "/precos"];
    for (const rota of rotas) {
      const acesos = NAV_PRINCIPAL.filter((i) => i.prefixos.some((p) => rota === p || rota.startsWith(`${p}/`)));
      expect(acesos.length, `${rota} acende ${acesos.length} itens`).toBeLessThanOrEqual(1);
    }
  });
});

describe("cabecalho:intencao", () => {
  it("navegação e intenção da pesquisa são contratos separados", () => {
    // P1-01: `Quiz` e `Planos` PARECIAM âmbitos da pesquisa e não mudavam
    // corpus nenhum. Agora a intenção não vem da navegação — vem da rota, e
    // é um eixo próprio.
    const rotulos = NAV_PRINCIPAL.map((i) => i.label);
    const intencoes = INTENCOES.map((i) => i.label);
    expect(rotulos.some((r) => intencoes.includes(r) && r !== "Simular")).toBe(false);
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
  it("nenhum destino do antigo menu se perdeu", () => {
    // O mega-dropdown «Recursos Fiscais» saiu da barra. Isto garante que a
    // mudança foi de SÍTIO e não de conteúdo.
    const destinos = [...NAV_FERRAMENTAS, ...NAV_APRENDER];
    expect(destinos.length).toBeGreaterThanOrEqual(9);
    for (const item of destinos) {
      expect(item.href.startsWith("/"), `${item.label} não tem rota absoluta`).toBe(true);
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.desc.trim().length).toBeGreaterThan(0);
    }
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
