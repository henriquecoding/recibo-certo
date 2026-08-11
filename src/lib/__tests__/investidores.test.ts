// Verificações da página de investidores.
//
// O relatório mestre pede quatro famílias de teste (§16): unitários do
// cálculo, contrato de conteúdo, segurança do formulário e ausência de
// marcadores por preencher. Estão todas aqui, exceto as que precisam mesmo de
// um browser — essas correm no harness de runtime.
//
// O que estes testes protegem, em cada caso, é uma regressão que já aconteceu
// uma vez: um donut que somava 101%, um mercado inventado, um número zero no
// HTML, uma promessa de privacidade falsa e um INSERT anónimo aberto ao mundo.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { allocateWholePercentages } from "@/app/investidores/_lib/percentages";
import { marketSizing } from "@/app/investidores/_lib/market-sizing";
import { validarLead, VERSAO_PRIVACIDADE, TEMPO_MINIMO_MS } from "@/app/investidores/_lib/validation";
import { assertMetrica, assertAfirmacoes, type MetricaInvestidor } from "@/app/investidores/_lib/evidence";
import { METRICAS_PUBLICAS, METRICAS_RESERVADAS, TODAS_AS_METRICAS } from "@/app/investidores/_data/metrics";
import { AFIRMACOES, RONDA, CONCORRENCIA } from "@/app/investidores/_data/content";
import { MERCADO, UNIVERSOS, PRECO_PLUS_MENSAL, ESTRUTURA_PME } from "@/app/investidores/_data/market";

const RAIZ = join(__dirname, "..", "..");

/**
 * Lê um ficheiro SEM comentários.
 *
 * Não é um detalhe: estes ficheiros explicam por escrito o que foi removido e
 * porquê ("o Supabase deixou de ser importado", "o banner saiu do rodapé"). Um
 * teste que procure a palavra em todo o ficheiro acusa a própria explicação e
 * dá um falso positivo — foi exatamente o que aconteceu na primeira versão
 * destas verificações. O que interessa é o que o ficheiro FAZ, não o que
 * conta sobre o passado.
 */
function codigo(...caminho: string[]): string {
  return readFileSync(join(RAIZ, ...caminho), "utf8")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ") // {/* comentário JSX */}
    .replace(/\/\*[\s\S]*?\*\//g, " ") //           /* bloco */
    .replace(/^\s*\/\/.*$/gm, " "); //              // linha
}

/* ═══════════════════════════════════════════════════════════════════════
   Percentagens — INV-P1-01
   ═══════════════════════════════════════════════════════════════════════ */

describe("percentagens inteiras", () => {
  it("somam exatamente 100 no caso que dava 101%", () => {
    // 59 + 17 + 2 + 23 = 101 era o que a página publicada mostrava, porque
    // cada fatia era arredondada isoladamente.
    const partes = allocateWholePercentages([46656, 14000, 1200, 18144], 80000);
    expect(partes.reduce((s, v) => s + v, 0)).toBe(100);
  });

  it("somam 100 para mil composições aleatórias", () => {
    for (let i = 0; i < 1000; i += 1) {
      const n = 2 + (i % 5);
      const partes = Array.from({ length: n }, () => Math.random() * 10_000);
      const total = partes.reduce((s, v) => s + v, 0);
      const pcts = allocateWholePercentages(partes, total);
      expect(pcts.reduce((s, v) => s + v, 0), `falhou com ${JSON.stringify(partes)}`).toBe(100);
      expect(pcts.every((p) => p >= 0)).toBe(true);
    }
  });

  it("não rebenta com total zero, negativo ou lista vazia", () => {
    expect(allocateWholePercentages([1, 2], 0)).toEqual([0, 0]);
    expect(allocateWholePercentages([1, 2], -5)).toEqual([0, 0]);
    expect(allocateWholePercentages([], 100)).toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   Mercado — INV-P0-03
   ═══════════════════════════════════════════════════════════════════════ */

describe("dimensionamento de mercado", () => {
  it("calcula clientes e ARR de forma consistente", () => {
    const r = marketSizing({
      clientesElegiveis: 773_000,
      arpaMensalEur: 1.99,
      fatiaServivel: 0.25,
      fatiaAlcancavel5a: 0.05,
    });
    expect(r.tamArr).toBeCloseTo(18_459_240, -1);
    expect(r.samClientes).toBe(193_250);
    expect(r.somClientes).toBe(9_662);
    // Cada nível é uma fração do anterior, nunca maior.
    expect(r.samClientes).toBeLessThan(r.tamClientes);
    expect(r.somClientes).toBeLessThan(r.samClientes);
  });

  it("a página usa o universo do beachhead, não o das empresas", () => {
    // O erro anterior era usar "1,3 milhões de empresas" — nem é um número que
    // alguma fonte publique, nem descreve o cliente deste produto.
    expect(MERCADO.tamClientes).toBe(UNIVERSOS.trabalhadoresContaPropria.valor);
    expect(MERCADO.tamClientes).not.toBe(UNIVERSOS.empresasAtivas.valor);
    expect(MERCADO.tamClientes).not.toBe(1_300_000);
  });

  it("usa o preço real do produto e não um preço futuro", () => {
    expect(PRECO_PLUS_MENSAL).toBe(1.99);
    expect(MERCADO.tamArr).toBeCloseTo(MERCADO.tamClientes * PRECO_PLUS_MENSAL * 12, 2);
  });

  it("a estrutura de PME bate certo com a fonte citada", () => {
    // A página dizia "97% micro e pequenas". Na ficha europeia são 95,5 + 3,8.
    expect(ESTRUTURA_PME.micro + ESTRUTURA_PME.pequenas).toBeCloseTo(99.3, 1);
    const soma =
      ESTRUTURA_PME.micro + ESTRUTURA_PME.pequenas + ESTRUTURA_PME.medias + ESTRUTURA_PME.grandes;
    expect(soma).toBeCloseTo(100, 1);
  });

  it("cada universo traz fonte com URL e ano", () => {
    for (const u of Object.values(UNIVERSOS)) {
      expect(u.fonte.url).toMatch(/^https?:\/\//);
      expect(u.fonte.referencia.length).toBeGreaterThan(3);
      expect(u.definicao.length).toBeGreaterThan(30);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   Evidência — INV-P0-04
   ═══════════════════════════════════════════════════════════════════════ */

describe("contrato de evidência", () => {
  it("todas as métricas públicas trazem valor, definição, data e dono", () => {
    expect(METRICAS_PUBLICAS.length).toBeGreaterThan(0);
    for (const m of METRICAS_PUBLICAS) {
      expect(m.asOf).toMatch(/^20\d{2}-\d{2}-\d{2}$/);
      expect(m.definicao.length).toBeGreaterThan(20);
      expect(m.dono.length).toBeGreaterThan(1);
      expect(m.sistemaFonte).not.toBe("manual-unverified");
      expect(m.valor).toBeDefined();
      expect(m.formatado).toBeTruthy();
    }
  });

  it("as métricas de tração continuam sem valor enquanto não houver fonte", () => {
    // Se um dia alguém as publicar, tem de trocar `visibilidade` E dar-lhes
    // uma fonte real — `assertMetrica` recusa o atalho. Este teste garante
    // que ninguém as preenche com um número inventado por engano.
    expect(METRICAS_RESERVADAS.length).toBeGreaterThan(0);
    for (const m of METRICAS_RESERVADAS) {
      expect(m.valor, `${m.id} tem valor mas está reservada`).toBeUndefined();
      expect(m.definicao.length).toBeGreaterThan(40);
    }
  });

  it("recusa uma métrica actual sem origem verificável", () => {
    const má: MetricaInvestidor = {
      id: "teste",
      rotulo: "Utilizadores",
      valor: 10_000,
      formatado: "10 000",
      unidade: "users",
      tipo: "actual",
      visibilidade: "public",
      asOf: "2026-08-11",
      definicao: "Um número que alguém se lembrou de escrever aqui sem medir nada.",
      sistemaFonte: "manual-unverified",
      dono: "Ninguém",
    };
    expect(() => assertMetrica(má)).toThrow(/não-verificada/);
  });

  it("recusa uma métrica pública sem valor", () => {
    expect(() =>
      assertMetrica({
        id: "vazia",
        rotulo: "MRR",
        unidade: "eur",
        tipo: "actual",
        visibilidade: "public",
        asOf: "2026-08-11",
        definicao: "Receita recorrente mensal líquida de descontos e sem IVA.",
        sistemaFonte: "faturação",
        dono: "Fundador",
      }),
    ).toThrow(/sem valor/);
  });

  it("nenhuma afirmação futura é apresentada como estado atual", () => {
    expect(() => assertAfirmacoes(AFIRMACOES)).not.toThrow();
    const live = AFIRMACOES.filter((a) => a.estado === "live").map((a) => a.texto.toLowerCase()).join(" ");
    for (const proibida of ["crédito integrado", "take rate", "certificação própria", "código auditado", "retenção alta"]) {
      expect(live, `"${proibida}" não pode estar em live`).not.toContain(proibida);
    }
  });

  it("apanha uma afirmação futura escrita como presente", () => {
    expect(() =>
      assertAfirmacoes([
        {
          id: "mau-exemplo",
          texto: "Oferecemos crédito integrado aos nossos utilizadores.",
          estado: "live",
          verificacao: "nenhuma",
        },
      ]),
    ).toThrow(/crédito integrado/);
  });

  it("todas as afirmações dizem como se verificam", () => {
    for (const a of AFIRMACOES) expect(a.verificacao.trim().length).toBeGreaterThan(10);
    // E há pelo menos uma de cada estado — a taxonomia só serve se for usada.
    for (const estado of ["live", "planned", "hypothesis"] as const) {
      expect(AFIRMACOES.some((a) => a.estado === estado), `sem afirmações em ${estado}`).toBe(true);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   Conteúdo — a ronda não pode ir a meio
   ═══════════════════════════════════════════════════════════════════════ */

describe("ficha da ronda", () => {
  it("ou está divulgada por inteiro, ou não está divulgada", () => {
    if (RONDA.divulgada) {
      // Publicar meia ficha é pior do que não publicar: um investidor vê o
      // montante e não vê o instrumento, e pergunta-se o que mais falta.
      for (const campo of ["estagio", "montante", "instrumento", "fechoPrevisto"] as const) {
        expect(RONDA[campo], `ronda divulgada sem ${campo}`).toBeTruthy();
      }
    } else {
      expect(RONDA.montante).toBeUndefined();
      expect(RONDA.instrumento).toBeUndefined();
    }
  });

  it("a matriz de concorrência é honesta sobre o que o produto não faz", () => {
    const nosso = CONCORRENCIA.find((l) => l.proprio);
    expect(nosso).toBeDefined();
    // Não emitimos faturas nem processamos pagamentos. Dizer o contrário na
    // matriz seria o mesmo erro que a auditoria encontrou na copy.
    expect(nosso!.faturacao).toBe("nao");
    expect(nosso!.pagamentos).toBe("nao");
    expect(CONCORRENCIA.length).toBeGreaterThanOrEqual(4);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   Validação do formulário — INV-P0-07 / INV-P1-04
   ═══════════════════════════════════════════════════════════════════════ */

const AGORA = Date.parse("2026-08-11T12:00:00.000Z");

function leadValido(extra: Record<string, unknown> = {}) {
  return {
    name: "Ana Ribeiro",
    email: "ana@fundo.pt",
    organisation: "Fundo Exemplo",
    role: "Partner",
    interest: "deck",
    message: "",
    sourceUrl: "https://www.recibocerto.pt/investidores",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    privacyVersion: VERSAO_PRIVACIDADE,
    privacyAcknowledged: true,
    startedAt: new Date(AGORA - 10_000).toISOString(),
    idempotencyKey: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    companyFax: "",
    ...extra,
  };
}

describe("validação do lead", () => {
  it("aceita um pedido bem formado", () => {
    const r = validarLead(leadValido(), AGORA);
    expect(r.ok).toBe(true);
  });

  it("rejeita email inválido, nome curto e interesse fora do enum", () => {
    const r = validarLead(leadValido({ email: "isto-nao-e-email", name: "A", interest: "outro" }), AGORA);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erros.email).toBeTruthy();
      expect(r.erros.name).toBeTruthy();
      expect(r.erros.interest).toBeTruthy();
    }
  });

  it("rejeita o honeypot preenchido", () => {
    const r = validarLead(leadValido({ companyFax: "http://spam.example" }), AGORA);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.companyFax).toBe("rejeitado");
  });

  it("rejeita preenchimento demasiado rápido", () => {
    const r = validarLead(leadValido({ startedAt: new Date(AGORA - 100).toISOString() }), AGORA);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.startedAt).toBe("too_fast");
  });

  it("rejeita um startedAt no futuro — a forma óbvia de contornar o mínimo", () => {
    const r = validarLead(leadValido({ startedAt: new Date(AGORA + 60_000).toISOString() }), AGORA);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.startedAt).toBe("too_fast");
  });

  it("aceita exatamente no limite do tempo mínimo", () => {
    const r = validarLead(leadValido({ startedAt: new Date(AGORA - TEMPO_MINIMO_MS).toISOString() }), AGORA);
    expect(r.ok).toBe(true);
  });

  it("exige o reconhecimento da nota de privacidade e a sua versão", () => {
    expect(validarLead(leadValido({ privacyAcknowledged: false }), AGORA).ok).toBe(false);
    expect(validarLead(leadValido({ privacyVersion: "qualquer-coisa" }), AGORA).ok).toBe(false);
  });

  it("exige uma chave de idempotência em forma de UUID", () => {
    expect(validarLead(leadValido({ idempotencyKey: "123" }), AGORA).ok).toBe(false);
  });

  it("corta mensagens acima do limite em vez de as deixar passar", () => {
    const r = validarLead(leadValido({ message: "x".repeat(1600) }), AGORA);
    expect(r.ok).toBe(false);
  });

  it("normaliza o email para minúsculas", () => {
    const r = validarLead(leadValido({ email: "  ANA@Fundo.PT " }), AGORA);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados.email).toBe("ana@fundo.pt");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   Arquitetura — INV-P0-01, INV-P0-07, INV-P2-01
   ═══════════════════════════════════════════════════════════════════════ */

describe("arquitetura da página", () => {
  const pagina = codigo("app", "investidores", "page.tsx");

  it("a página é um Server Component", () => {
    expect(pagina.startsWith('"use client"')).toBe(false);
    expect(pagina).not.toMatch(/^"use client"/m);
  });

  it("não há contagem animada a partir de zero em conteúdo essencial", () => {
    // Era isto que punha "0,0 milhões" no HTML servido.
    expect(pagina).not.toMatch(/CountUpOnView|useState\(0\)/);
    expect(pagina).not.toMatch(/IntersectionObserver/);
  });

  it("o formulário é o único componente de cliente", () => {
    const clientes = ["FormularioInteresse.client"];
    const importados = [...pagina.matchAll(/from "\.\/_components\/([A-Za-z.]+)"/g)].map((m) => m[1]);
    const naoServidor = importados.filter((i) => i.includes(".client"));
    expect(naoServidor).toEqual(clientes);
  });

  it("o Supabase não é importado pela página nem pelo formulário", () => {
    const form = codigo("app", "investidores", "_components", "FormularioInteresse.client.tsx");
    expect(pagina).not.toMatch(/supabase/i);
    expect(form).not.toMatch(/supabase/i);
    // E o caminho antigo — escrever direto da browser — deixou de existir.
    const admin = codigo("lib", "supabase", "admin.ts");
    expect(admin).not.toMatch(/export async function submeterProposta/);
  });

  it("o cliente admin é server-only", () => {
    const serverAdmin = readFileSync(join(RAIZ, "lib", "supabase", "server-admin.ts"), "utf8");
    expect(serverAdmin).toMatch(/import "server-only"/);
    expect(serverAdmin).not.toMatch(/NEXT_PUBLIC_SUPABASE_SERVICE/);
  });

  it("os CTA usam o verde escuro, que passa em contraste AA", () => {
    // #1D9E75 sobre branco dá 3,39:1 — abaixo dos 4,5:1 exigidos.
    const prim = codigo("app", "investidores", "_components", "Primitivas.tsx");
    const botaoPrimario = prim.slice(prim.indexOf("BOTAO_PRIMARIO"), prim.indexOf("BOTAO_SECUNDARIO"));
    expect(botaoPrimario).toMatch(/bg-brand-dark/);
    expect(botaoPrimario).not.toMatch(/bg-brand\s/);
    expect(botaoPrimario).toMatch(/min-h-11/);
  });

  it("a rota da API revoga o caminho anónimo e trava abuso", () => {
    const rota = codigo("app", "api", "investidores", "interesse", "route.ts");
    expect(rota).toMatch(/consume_investor_rate_limit/);
    expect(rota).toMatch(/idempotency_key/);
    expect(rota).toMatch(/body_too_large/);
    expect(rota).toMatch(/origin_rejected/);
    expect(rota).toMatch(/createHmac/);
    // O IP em claro nunca é guardado.
    expect(rota).not.toMatch(/ip: *clientIp|ip_address/);
  });

  it("aguenta a migração ainda não estar corrida", () => {
    // O código é publicado no merge; o SQL corre à mão, noutro momento. Nessa
    // janela a função e as colunas novas não existem — e recusar todos os
    // contactos com 503 seria pior do que o problema que a migração resolve.
    const rota = codigo("app", "api", "investidores", "interesse", "route.ts");
    expect(rota).toMatch(/PGRST202/); // função de rate limit em falta
    expect(rota).toMatch(/PGRST204/); // colunas em falta
    expect(rota).toMatch(/investidores_rate_limit_por_migrar/);
    expect(rota).toMatch(/investidores_colunas_por_migrar/);
  });

  it("a migração fecha o INSERT anónimo", () => {
    const sql = readFileSync(
      join(RAIZ, "..", "supabase", "migrations", "031_investidores_endurecimento.sql"),
      "utf8",
    );
    expect(sql).toMatch(/drop policy if exists "propostas_insere_publico"/i);
    expect(sql).toMatch(/revoke insert on public\.propostas_investidores from anon, authenticated/i);
    expect(sql).toMatch(/create unique index if not exists propostas_idempotency_unique/i);
    expect(sql).toMatch(/security definer/i);
  });

  it("a política de privacidade descreve o tratamento dos investidores", () => {
    const politica = codigo("app", "privacidade", "page.tsx");
    expect(politica).toMatch(/id="investidores"/);
    expect(politica).toMatch(/Diligências pré-contratuais/i);
    expect(politica).toMatch(/12 meses/);
    // A promessa antiga era falsa e não pode voltar.
    expect(politica).not.toMatch(/Nunca partilhamos informação com terceiros/i);
  });

  it("o rodapé deixou de ter o banner de investidores em todas as páginas", () => {
    const footer = codigo("components", "Footer.tsx");
    expect(footer).not.toMatch(/Investe no copiloto fiscal/);
    expect(footer).not.toMatch(/Conhecer a oportunidade/);
    // A ligação discreta continua a existir.
    expect(footer).toMatch(/href: "\/investidores"/);
  });

  it("mantém noindex enquanto a revisão jurídica não estiver feita", () => {
    const layout = codigo("app", "investidores", "layout.tsx");
    expect(layout).toMatch(/index:\s*false/);
    // …mas deixa de bloquear o rastreio das ligações internas.
    expect(layout).toMatch(/follow:\s*true/);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   Nenhum marcador por preencher chega a produção
   ═══════════════════════════════════════════════════════════════════════ */

describe("sem marcadores por preencher", () => {
  it("nem no conteúdo nem nas métricas", () => {
    const textos = [
      ...TODAS_AS_METRICAS.flatMap((m) => [m.rotulo, m.definicao, m.formatado ?? ""]),
      ...AFIRMACOES.map((a) => a.texto),
    ];
    for (const t of textos) {
      for (const proibido of ["[€]", "[data]", "TODO", "Lorem ipsum", "XXX"]) {
        expect(t, `"${proibido}" em "${t.slice(0, 60)}"`).not.toContain(proibido);
      }
    }
  });
});
