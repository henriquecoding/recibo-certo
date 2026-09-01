import { describe, expect, it } from "vitest";
import { construirDocumentos } from "@/lib/busca/documentos";
import { TETO_POPOVER, pesquisar } from "@/lib/busca/pontuar";
import { consultaParaRanking, entidade, lerNumeroPT, reconhecer } from "@/lib/busca/reconhecer";
import { compilarPlano, type PlanoBusca } from "@/lib/busca/plano";
import type { DominioBusca, RendererBusca } from "@/lib/busca/esquema";

// ═══════════════════════════════════════════════════════════════════════
//  O CORPUS DOURADO — a única forma de saber se o reconhecimento presta
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE UM CORPUS E NÃO «EXPERIMENTAR NO BROWSER»                     │
//  │                                                                     │
//  │ Um extractor determinístico melhora consulta a consulta: alguém      │
//  │ acrescenta «avença» ao vocabulário de dinheiro para resolver um      │
//  │ caso e parte outro que ninguém volta a escrever à mão. Sem uma       │
//  │ lista fixa de perguntas reais, cada afinação é uma aposta e a única  │
//  │ medição é a memória de quem afinou.                                  │
//  │                                                                     │
//  │ Duas metades, e a segunda é a que interessa: o que a pesquisa TEM    │
//  │ de perceber, e o que ela NÃO PODE afirmar. Num produto fiscal, um    │
//  │ falso «percebi» custa mais do que dez «não percebi» — a pessoa       │
//  │ confia numa conta que nunca pediu.                                   │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

const DOCS = construirDocumentos();

function planoDe(consulta: string): PlanoBusca {
  const reconhecimento = reconhecer(consulta);
  const resultados = pesquisar(consultaParaRanking(consulta, reconhecimento), DOCS, {
    limite: TETO_POPOVER,
    sinais: { dominio: reconhecimento.dominio, intencao: reconhecimento.intencao },
  });
  return compilarPlano({ consulta, reconhecimento, resultados, documentos: DOCS });
}

/* ─── Leitura de números à portuguesa ─────────────────────────────── */

describe("busca:numeros-pt", () => {
  it("lê os formatos que as pessoas escrevem", () => {
    expect(lerNumeroPT("1200")).toBe(1200);
    expect(lerNumeroPT("1.200")).toBe(1200);
    expect(lerNumeroPT("1 200")).toBe(1200);
    expect(lerNumeroPT("1.200,50")).toBe(1200.5);
    expect(lerNumeroPT("1200,50")).toBe(1200.5);
    expect(lerNumeroPT("3.500")).toBe(3500);
    expect(lerNumeroPT("1.000.000")).toBe(1000000);
  });

  it("distingue milhares de decimais pela contagem de dígitos", () => {
    // `1.200` é mil e duzentos; `1.2` é um vírgula dois. Não há preferência
    // a decidir isto — há uma regra.
    expect(lerNumeroPT("1.2")).toBe(1.2);
    expect(lerNumeroPT("1.25")).toBe(1.25);
  });

  it("recusa o que não é número", () => {
    expect(lerNumeroPT("abc")).toBeNull();
    expect(lerNumeroPT("")).toBeNull();
  });
});

/* ─── Entidades ───────────────────────────────────────────────────── */

describe("busca:entidades", () => {
  it("um número com moeda é dinheiro", () => {
    const v = entidade(reconhecer("quanto me fica de um recibo de 1 200 €?"), "valor");
    expect(v?.valor).toBe(1200);
    expect(v?.texto).toBe("1 200");
  });

  it("um número numa frase sobre dinheiro também é dinheiro", () => {
    expect(entidade(reconhecer("recebo 3500 por mês"), "valor")?.valor).toBe(3500);
  });

  it("um ano NÃO é um rendimento", () => {
    // «IRS de 2026» não é uma simulação de 2 026 €. Era o falso positivo
    // mais provável, porque a janela de anos cai no meio dos rendimentos.
    const r = reconhecer("escalões de irs de 2026");
    expect(entidade(r, "valor")).toBeUndefined();
    expect(entidade(r, "ano")?.valor).toBe(2026);
  });

  it("um número de artigo ou de modelo NÃO é um rendimento", () => {
    expect(entidade(reconhecer("modelo 3"), "valor")).toBeUndefined();
    expect(entidade(reconhecer("artigo 151"), "valor")).toBeUndefined();
    expect(entidade(reconhecer("iva a 23"), "valor")).toBeUndefined();
  });

  it("lê a periodicidade quando ela está escrita, e só então", () => {
    expect(entidade(reconhecer("3 500 € por mês"), "periodicidade")?.valor).toBe("mes");
    expect(entidade(reconhecer("30 000 € por ano"), "periodicidade")?.valor).toBe("ano");
    expect(entidade(reconhecer("quanto cobro à hora"), "periodicidade")?.valor).toBe("hora");
    expect(entidade(reconhecer("quanto me fica de 1200 €"), "periodicidade")).toBeUndefined();
  });

  it("lê o distrito a partir do catálogo do diretório", () => {
    expect(entidade(reconhecer("contabilista no Porto"), "localidade")?.valor).toBe("Porto");
    expect(entidade(reconhecer("contabilista em Faro"), "localidade")?.valor).toBe("Faro");
    expect(entidade(reconhecer("contabilista"), "localidade")).toBeUndefined();
  });

  it("uma comparação exige DOIS lados nomeados", () => {
    expect(entidade(reconhecer("recibos verdes ou empresa"), "comparacao")).toBeDefined();
    // «quanto recebo ou quanto reservo» tem um «ou» e não compara regimes.
    expect(entidade(reconhecer("quanto recebo ou quanto reservo"), "comparacao")).toBeUndefined();
  });
});

/* ─── O corpus ────────────────────────────────────────────────────── */

interface CasoDourado {
  consulta: string;
  dominio?: DominioBusca;
  renderer?: RendererBusca;
  /** O id que tem de ser a ação principal. */
  principal?: string;
  /**
   * O id que tem de estar no plano — como principal OU como alternativa.
   *
   * É a expectativa certa para consultas genuinamente ambíguas: exigir
   * que uma delas seja coroada seria pedir ao código que fingisse uma
   * certeza que a frase não dá.
   */
  contem?: string;
  /** Estados aceitáveis. Vazio = qualquer um menos `sem_caminho`. */
  estados?: PlanoBusca["estado"][];
}

const CORPUS: CasoDourado[] = [
  // ── Recibos verdes ───────────────────────────────────────────────
  { consulta: "quanto me fica de um recibo verde de 1 200 €", dominio: "recibos" },
  { consulta: "quanto recebo de recibos verdes", dominio: "recibos" },
  { consulta: "calculadora de recibos verdes", dominio: "recibos" },
  { consulta: "quanto tenho de guardar para impostos", dominio: "recibos" },
  { consulta: "abrir atividade nas finanças", dominio: "recibos" },
  { consulta: "ato isolado", dominio: "recibos" },
  { consulta: "regime simplificado coeficiente", dominio: "recibos" },
  { consulta: "retenção na fonte", dominio: "recibos" },
  { consulta: "classificar a minha atividade", dominio: "recibos" },
  { consulta: "categoria b", dominio: "recibos" },

  // ── Obrigações ───────────────────────────────────────────────────
  { consulta: "quando entrego o iva", principal: "obrigacao:iva", renderer: "obligation" },
  { consulta: "quando pago a segurança social", principal: "obrigacao:ss" },
  // «Prazo do IRS» é ambíguo de propósito no corpus: pode ser «quando é o
  // prazo» ou «e se eu falhar o prazo?», e o guia «IRS fora do prazo»
  // responde à segunda com as mesmas duas palavras. A obrigação tem de
  // estar lá; exigir que ganhasse seria afinar o ranking até a frase
  // significar o que nos dava jeito.
  { consulta: "prazo do irs", contem: "obrigacao:irs" },
  { consulta: "quando entrego o irs", principal: "obrigacao:irs" },
  { consulta: "calendário fiscal", dominio: "obrigacoes" },
  { consulta: "pagamentos por conta", dominio: "obrigacoes" },
  { consulta: "declaração trimestral", dominio: "obrigacoes" },

  // ── Empresa ──────────────────────────────────────────────────────
  { consulta: "simulador de empresa", dominio: "empresa" },
  { consulta: "abrir empresa", dominio: "empresa" },
  { consulta: "irc", dominio: "empresa" },
  { consulta: "dividendos ou salário de gerência", dominio: "empresa" },

  // ── Salário ──────────────────────────────────────────────────────
  { consulta: "recibo de vencimento", dominio: "salario" },
  { consulta: "quanto custa contratar alguém", dominio: "salario" },
  { consulta: "salário líquido", dominio: "salario" },
  { consulta: "subsídio de férias", dominio: "salario" },

  // ── Preço ────────────────────────────────────────────────────────
  { consulta: "quanto devo cobrar", dominio: "preco" },
  { consulta: "calcular preço", dominio: "preco" },
  { consulta: "margem e markup", dominio: "preco" },

  // ── Comparar ─────────────────────────────────────────────────────
  { consulta: "recibos verdes ou empresa", dominio: "comparar", renderer: "comparison" },
  { consulta: "compensa abrir empresa", dominio: "comparar" },
  { consulta: "comparar regimes", dominio: "comparar" },

  // ── Apoio profissional ───────────────────────────────────────────
  { consulta: "contabilista", principal: "apoio:contabilistas", renderer: "professional_support" },
  { consulta: "contabilista no Porto", principal: "apoio:contabilistas" },
  { consulta: "quero falar com alguém", dominio: "apoio" },
  { consulta: "preciso de ajuda profissional", dominio: "apoio" },

  // ── Produto e confiança ──────────────────────────────────────────
  { consulta: "planos e preços", dominio: "produto" },
  { consulta: "metodologia", principal: "pagina:metodologia" },
  { consulta: "privacidade", principal: "pagina:privacidade" },
  { consulta: "estado dos dados", principal: "pagina:estado-dos-dados" },

  // ── Património ───────────────────────────────────────────────────
  { consulta: "imposto sobre heranças", dominio: "patrimonio" },
  { consulta: "mais valias de um imóvel", dominio: "patrimonio" },

  // ── Descoberta ───────────────────────────────────────────────────
  { consulta: "que negócio posso abrir", dominio: "descoberta" },
];

describe("busca:corpus-dourado", () => {
  for (const caso of CORPUS) {
    it(`«${caso.consulta}»`, () => {
      const plano = planoDe(caso.consulta);

      expect(plano.estado, "sem caminho nenhum").not.toBe("sem_caminho");
      if (caso.estados) expect(caso.estados).toContain(plano.estado);
      if (caso.dominio) expect(plano.dominio ?? plano.principal?.dominio).toBe(caso.dominio);
      if (caso.principal) expect(plano.principal?.id).toBe(caso.principal);
      if (caso.contem) {
        const ids = [plano.principal?.id, ...plano.alternativas.map((a) => a.id)];
        expect(ids).toContain(caso.contem);
      }
      if (caso.renderer) expect(plano.principal?.renderer).toBe(caso.renderer);
    });
  }
});

/* ─── O que a pesquisa NÃO pode afirmar ───────────────────────────── */

describe("busca:honestidade", () => {
  it("um valor sozinho não vira um caminho — vira uma pergunta", () => {
    const plano = planoDe("1200 €");
    expect(plano.estado).toBe("clarificar");
    expect(plano.clarificacao?.tipo).toBe("valor_sem_destino");
    expect(plano.clarificacao?.opcoes.length).toBeGreaterThanOrEqual(2);
    expect(plano.principal).toBeUndefined();
  });

  it("uma consulta sem correspondência não inventa um caminho", () => {
    const plano = planoDe("xpto qwerty zzz");
    expect(plano.estado).toBe("sem_caminho");
    expect(plano.principal).toBeUndefined();
    expect(plano.explicacoes).toContain("NO_MATCH");
    // O apoio continua a existir — como alternativa, nunca como fuga.
    expect(plano.apoio?.principal).toBe(false);
  });

  it("o apoio só é o caminho principal quando foi pedido", () => {
    expect(planoDe("contabilista no Porto").apoio?.principal).toBe(true);
    expect(planoDe("quanto me fica de 1200 €").apoio?.principal).toBe(false);
  });

  it("o diretório recebe filtros de catálogo, nunca a frase", () => {
    const plano = planoDe("contabilista no Porto para o iva de um cliente que não me pagou");
    const href = plano.apoio?.href ?? "";

    expect(href).toContain("distrito=Porto");
    expect(href).toContain("especialidade=IVA");
    // `q=` é o parâmetro de texto livre do diretório. A frase da pessoa não
    // viaja: o caso partilha-se do outro lado, com as palavras dela.
    expect(href).not.toContain("q=");
    expect(href).not.toContain("cliente");
  });

  it("nenhum valor entra num endereço", () => {
    // A regra que a auditoria fixou: o valor viaja em `sessionStorage`
    // (ver `handoff.ts`), nunca em query string, nunca em analytics.
    for (const consulta of ["quanto me fica de 1 200 €", "recebo 3500 por mês", "salário de 1 800 €"]) {
      const plano = planoDe(consulta);
      const enderecos = [plano.principal?.href, plano.apoio?.href, ...plano.alternativas.map((a) => a.href)];
      for (const href of enderecos) {
        if (!href) continue;
        expect(href, `${consulta} → ${href}`).not.toMatch(/1200|1 200|3500|1800/);
      }
    }
  });

  it("faz no máximo UMA pergunta de cada vez", () => {
    for (const caso of CORPUS) {
      const plano = planoDe(caso.consulta);
      // O tipo já o garante (é um objeto, não uma lista). Este teste existe
      // para reprovar a tentação de o transformar num array.
      expect(Array.isArray(plano.clarificacao)).toBe(false);
    }
  });

  it("uma clarificação traz sempre uma saída para quem não sabe", () => {
    // Obrigar a escolher entre duas opções que a pessoa não distingue é
    // pedir-lhe que invente um dado.
    for (const consulta of ["quanto me fica de 1 200 €", "recibos verdes ou empresa com 3 500 € por mês"]) {
      const plano = planoDe(consulta);
      if (!plano.clarificacao) continue;
      const ids = plano.clarificacao.opcoes.map((o) => o.id);
      expect(ids.length).toBeLessThanOrEqual(3);
    }
  });

  it("a confiança alta exige margem, e não só um primeiro lugar", () => {
    for (const caso of CORPUS) {
      const plano = planoDe(caso.consulta);
      if (plano.confianca === "alta") {
        expect(plano.explicacoes, caso.consulta).toContain("LEADING_MARGIN");
      }
    }
  });

  it("o resumo do pedido devolve as palavras da pessoa", () => {
    const plano = planoDe("recibos verdes ou empresa com 3 500 € por mês");
    const valor = plano.entidades.find((e) => e.tipo === "valor");
    expect(valor?.texto).toBe("3 500");
  });
});

/* ─── Os sinais de tarefa ─────────────────────────────────────────── */

describe("busca:sinais-de-tarefa", () => {
  it("um bónus de domínio nunca faz entrar um documento novo", () => {
    // O limiar julga o TEXTO. Se o texto não chegou para o mostrar,
    // pertencer à família certa não é razão para o mostrar.
    const semSinais = pesquisar("iva", DOCS, { limite: 50 }).map((r) => r.doc.id).sort();
    const comSinais = pesquisar("iva", DOCS, {
      limite: 50,
      sinais: { dominio: "obrigacoes", intencao: "cumprir" },
    })
      .map((r) => r.doc.id)
      .sort();

    expect(comSinais).toEqual(semSinais);
  });

  it("mas reordena quando duas coisas respondem às mesmas palavras", () => {
    const consulta = "quanto pago a um trabalhador";
    const semSinais = pesquisar(consulta, DOCS, { limite: 8 });
    const comSinais = pesquisar(consulta, DOCS, {
      limite: 8,
      sinais: { dominio: "salario", intencao: "simular" },
    });

    expect(comSinais[0].doc.dominio).toBe("salario");
    expect(semSinais.length).toBe(comSinais.length);
  });
});
