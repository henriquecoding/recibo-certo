import { describe, it, expect } from "vitest";
import {
  CATALOGO,
  EVENTOS_SO_SERVIDOR,
  baldeDeTempo,
  baldeDeValor,
  eventoConhecido,
  type NomeEvento,
} from "@/lib/analytics/eventos";
import { CHAVES_PROIBIDAS, fragmentoProibido, verificarSemPII } from "@/lib/analytics/pii";
import { apurarDVM, confiancaContaParaDVM, taxaDeAtivacao, receitaPor1000DVM, type EventoParaDVM } from "@/lib/analytics/dvm";
import { BLOCOS_PAINEL, KPIS, kpi } from "@/lib/analytics/painel";
import { origemAtual, origemEDireta } from "@/lib/analytics/identidade";
import { CLUSTERS, ICPS, clusterDoGuia, inventarioPorCluster } from "@/lib/clusters";
import { escolherRota, MONETIZACAO_PROIBIDA, NUNCA_COMUNICAR } from "@/lib/routing";
import { CAMADAS_PAGINA_CITAVEL, CAMADAS_RESULTADO, PROMPTS_BENCHMARK } from "@/lib/autoridade";
import { REVISOES_MANUAIS, revisaoDaRota, revisaoDosGuias, comoData } from "@/lib/revisoes";
import { PUBLIC_ROUTES, FERRAMENTA_SLUGS, GUIA_SLUGS } from "@/lib/seo";
import { GUIDE_MANIFESTS, manifesto } from "@/lib/guias/manifests";
import { DATA_LAST_REVIEW } from "@/lib/fiscal-data";

// ═══════════════════════════════════════════════════════════════════════
//  Rede de segurança do sistema operativo de crescimento.
//
//  O relatório estratégico faz promessas que só valem enquanto o código as
//  cumprir: nenhum dado fiscal na medição, uma rota comercial de cada vez,
//  datas de revisão reais em vez da data do build. Cada uma dessas
//  promessas está aqui como teste — porque uma promessa sem teste dura até
//  ao primeiro refactor apressado.
// ═══════════════════════════════════════════════════════════════════════

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("medição: dicionário de eventos", () => {
  it("todo o evento declarado tem disparo, pergunta que serve e origem", () => {
    for (const [nome, def] of Object.entries(CATALOGO)) {
      expect(def.disparo.length, nome).toBeGreaterThan(10);
      expect(def.serve.length, nome).toBeGreaterThan(10);
      expect(["cliente", "servidor"]).toContain(def.origem);
    }
  });

  it("os eventos de receita são exclusivos do servidor", () => {
    // Se algum destes passar a poder vir do browser, qualquer pessoa com a
    // consola aberta escreve receita no painel.
    const receita: NomeEvento[] = [
      "plus_checkout_complete",
      "fiz_outcome",
      "lead_submitted",
      "lead_accepted",
      "lead_won",
    ];
    for (const n of receita) expect(EVENTOS_SO_SERVIDOR, n).toContain(n);
  });

  it("recusa nomes fora do catálogo", () => {
    expect(eventoConhecido("simulator_start")).toBe(true);
    expect(eventoConhecido("click_2")).toBe(false);
  });

  it("os baldes escondem a grandeza exata", () => {
    expect(baldeDeTempo(3_000)).toBe("0-5s");
    expect(baldeDeTempo(400_000)).toBe("5min+");
    expect(baldeDeTempo(-1)).toBe("desconhecido");
    expect(baldeDeValor(34_500)).toBe("20k-50k");
    expect(baldeDeValor(1_000_000)).toBe("100k+");
  });
});

describe("medição: a barreira de PII", () => {
  it("recusa campos com nome de dado proibido", () => {
    for (const chave of ["nif", "salarioBruto", "valor_liquido", "VALOR-LÍQUIDO", "email"]) {
      expect(verificarSemPII({ [chave]: "x" }).ok, chave).toBe(false);
    }
  });

  it("recusa um valor com forma de NIF mesmo sob nome inocente", () => {
    const r = verificarSemPII({ ref: "512345678" });
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("9 ou 11 dígitos");
  });

  it("recusa email, IBAN e texto livre", () => {
    expect(verificarSemPII({ ref: "a@b.pt" }).ok).toBe(false);
    expect(verificarSemPII({ ref: "PT50000201231234567890154" }).ok).toBe(false);
    expect(verificarSemPII({ ref: "a".repeat(200) }).ok).toBe(false);
  });

  it("atravessa objetos aninhados e arrays", () => {
    expect(verificarSemPII({ a: { b: { nif: "1" } } }).ok).toBe(false);
    expect(verificarSemPII({ a: [{ ok: "x" }, { telefone: "9" }] }).ok).toBe(false);
  });

  it("deixa passar identificadores opacos e baldes", () => {
    // Um UUID pode conter, por acaso, onze dígitos seguidos; um `*_id` é
    // gerado por nós e não pode ser recusado por isso.
    expect(verificarSemPII({ click_id: "12345678901a-4f2b" }).ok).toBe(true);
    expect(verificarSemPII({ elapsed_bucket: "1-5min" }).ok).toBe(true);
    expect(verificarSemPII({ result_version: "2026.1" }).ok).toBe(true);
  });

  it("deixa passar um payload real do catálogo", () => {
    expect(
      verificarSemPII({
        tool_id: "simulador-irs",
        fiscal_year: 2026,
        confidence_state: "completo",
        source: "google",
        medium: "organic",
      }).ok,
    ).toBe(true);
  });

  it("a lista de proibidos cobre os quatro grupos do §8.2", () => {
    for (const esperado of ["nif", "salario", "rendimento", "documento", "email"]) {
      expect(CHAVES_PROIBIDAS).toContain(esperado);
    }
    expect(fragmentoProibido("meuSalarioMensal")).toBe("salario");
    expect(fragmentoProibido("tool_id")).toBeNull();
  });
});

describe("medição: DVM", () => {
  const base = { ator: "a1", sessao: "s1", tool_id: "simulador-irs", em: "2026-08-08T10:00:00Z" };

  it("exige o par completo + resultado visto, na mesma sessão", () => {
    const so = apurarDVM([{ ...base, nome: "simulator_complete" }] as EventoParaDVM[]);
    expect(so.dvm).toBe(0);

    const par = apurarDVM([
      { ...base, nome: "simulator_complete" },
      { ...base, nome: "result_view" },
    ] as EventoParaDVM[]);
    expect(par.dvm).toBe(1);
    expect(par.decisoes).toBe(1);
  });

  it("não junta um cálculo de uma sessão com um resultado de outra", () => {
    const r = apurarDVM([
      { ...base, nome: "simulator_complete" },
      { ...base, nome: "result_view", sessao: "s2" },
    ] as EventoParaDVM[]);
    expect(r.dvm).toBe(0);
  });

  it("conta utilizadores únicos, não repetições", () => {
    const r = apurarDVM([
      { ...base, nome: "simulator_complete" },
      { ...base, nome: "result_view" },
      { ...base, nome: "simulator_complete", sessao: "s2" },
      { ...base, nome: "result_view", sessao: "s2" },
    ] as EventoParaDVM[]);
    expect(r.decisoes).toBe(2);
    expect(r.dvm).toBe(1); // a mesma pessoa
  });

  it("um resultado fora de escopo não é uma decisão", () => {
    expect(confiancaContaParaDVM("fora_de_escopo")).toBe(false);
    const r = apurarDVM([
      { ...base, nome: "simulator_complete", confidence_state: "fora_de_escopo" },
      { ...base, nome: "result_view" },
    ] as EventoParaDVM[]);
    expect(r.dvm).toBe(0);
  });

  it("uma estimativa continua a ser uma decisão", () => {
    const r = apurarDVM([
      { ...base, nome: "simulator_complete", confidence_state: "estimado" },
      { ...base, nome: "result_view" },
    ] as EventoParaDVM[]);
    expect(r.dvm).toBe(1);
  });

  it("separa por ferramenta", () => {
    const r = apurarDVM([
      { ...base, nome: "simulator_complete" },
      { ...base, nome: "result_view" },
      { ...base, nome: "simulator_complete", tool_id: "ato-isolado" },
      { ...base, nome: "result_view", tool_id: "ato-isolado" },
    ] as EventoParaDVM[]);
    expect(r.porFerramenta["simulador-irs"]).toBe(1);
    expect(r.porFerramenta["ato-isolado"]).toBe(1);
  });

  it("divisões por zero devolvem zero, não NaN", () => {
    expect(taxaDeAtivacao(0, 0)).toBe(0);
    expect(receitaPor1000DVM(1000, 0)).toBe(0);
    expect(receitaPor1000DVM(1000, 100)).toBe(10_000);
  });
});

describe("medição: atribuição", () => {
  it("lê UTM e parceiro da URL", () => {
    const o = origemAtual(
      "https://www.recibocerto.pt/guias/abrir-atividade?utm_source=youtube&utm_medium=video&utm_campaign=set2026&parceiro=cowork",
      "",
    );
    expect(o.source).toBe("youtube");
    expect(o.medium).toBe("video");
    expect(o.campaign).toBe("set2026");
    expect(o.partner_id).toBe("cowork");
    expect(o.landing).toBe("/guias/abrir-atividade");
  });

  it("um referrer externo sem UTM conta como referral", () => {
    const o = origemAtual("https://www.recibocerto.pt/", "https://www.reddit.com/r/portugal/");
    expect(o.source).toBe("www.reddit.com");
    expect(o.medium).toBe("referral");
    expect(origemEDireta(o)).toBe(false);
  });

  it("sem UTM nem referrer é direto", () => {
    expect(origemEDireta(origemAtual("https://www.recibocerto.pt/", ""))).toBe(true);
  });
});

describe("painel semanal", () => {
  it("cada KPI tem fórmula, dono e guardrail", () => {
    for (const k of KPIS) {
      expect(k.formula.length, k.id).toBeGreaterThan(5);
      expect(k.guardrail.length, k.id).toBeGreaterThan(5);
    }
  });

  it("os ids dos KPIs são únicos", () => {
    expect(new Set(KPIS.map((k) => k.id)).size).toBe(KPIS.length);
  });

  it("cada bloco tem pergunta de decisão e só refere KPIs que existem", () => {
    for (const b of BLOCOS_PAINEL) {
      expect(b.pergunta.endsWith("?"), b.id).toBe(true);
      for (const id of b.kpis) expect(kpi(id), `${b.id} → ${id}`).toBeDefined();
    }
  });
});

describe("routing comercial", () => {
  it("baixa confiança bloqueia qualquer rota comercial", () => {
    const r = escolherRota({
      confianca: "fora_de_escopo",
      temResultado: true,
      enquadramento: "independente",
    });
    expect(r.rota).toBe("sem_parceiro");
    expect(r.motivo).toBe("confianca_insuficiente");
  });

  it("uma pergunta informativa não abre rota comercial", () => {
    const r = escolherRota({ confianca: "completo", temResultado: false });
    expect(r.rota).toBe("sem_parceiro");
  });

  it("o caso que exige profissional ganha à FIZ", () => {
    // Um independente com contabilidade organizada continua a ser um caso
    // de julgamento profissional — a integração existente não pode ganhar.
    const r = escolherRota({
      confianca: "completo",
      temResultado: true,
      enquadramento: "independente",
      contabilidadeOrganizada: true,
    });
    expect(r.rota).toBe("contabilista");
    expect(r.exigeConsentimento).toBe(true);
  });

  it("herança e multi-jurisdição vão para especialista, não para a FIZ", () => {
    for (const sinal of [{ heranca: true }, { multiJurisdicao: true }, { casoComplexo: true }]) {
      const r = escolherRota({
        confianca: "completo",
        temResultado: true,
        enquadramento: "independente",
        ...sinal,
      });
      expect(r.rota, JSON.stringify(sinal)).toBe("contabilista");
    }
  });

  it("execução no escopo vai para a FIZ, sem consentimento adicional", () => {
    const r = escolherRota({ confianca: "completo", temResultado: true, enquadramento: "eni" });
    expect(r.rota).toBe("fiz");
    expect(r.exigeConsentimento).toBe(false);
  });

  it("não vende o Plus a quem já é subscritor", () => {
    const sinais = {
      confianca: "completo" as const,
      temResultado: true,
      enquadramento: "dependente" as const,
      decisoesAnteriores: 5,
    };
    expect(escolherRota(sinais).rota).toBe("plus");
    expect(escolherRota({ ...sinais, ehPlus: true }).rota).toBe("sem_parceiro");
  });

  it("devolve sempre exatamente uma rota, com motivo", () => {
    const r = escolherRota({ confianca: "completo", temResultado: true });
    expect(["fiz", "contabilista", "plus", "sem_parceiro"]).toContain(r.rota);
    expect(r.motivo).toBeTruthy();
    expect(r.mensagem.length).toBeGreaterThan(10);
  });

  it("as fronteiras que nunca se atravessam estão declaradas", () => {
    expect(NUNCA_COMUNICAR.length).toBeGreaterThanOrEqual(3);
    expect(MONETIZACAO_PROIBIDA.length).toBeGreaterThanOrEqual(5);
    expect(NUNCA_COMUNICAR.join(" ")).toContain("submetida");
  });
});

describe("clusters de decisão", () => {
  it("os oito clusters têm intenção, ativo e transição", () => {
    expect(CLUSTERS).toHaveLength(8);
    for (const c of CLUSTERS) {
      expect(c.intencoes.length, c.id).toBeGreaterThan(1);
      expect(c.ativoPrincipal.startsWith("/"), c.id).toBe(true);
      expect(c.transicaoNota.length, c.id).toBeGreaterThan(10);
    }
  });

  it("o ativo principal de cada cluster é uma rota que existe", () => {
    for (const c of CLUSTERS) {
      if (c.ativoPrincipal.startsWith("/ferramentas/")) {
        const slug = c.ativoPrincipal.slice("/ferramentas/".length);
        expect(FERRAMENTA_SLUGS as readonly string[], c.id).toContain(slug);
      }
    }
  });

  it("cada ICP do cluster existe no catálogo de ICPs", () => {
    const ids = ICPS.map((i) => i.id);
    for (const c of CLUSTERS) expect(ids, c.id).toContain(c.icp);
  });

  it("o inventário classifica cada guia ativo exatamente uma vez", () => {
    const inventario = inventarioPorCluster();
    const total = inventario.reduce((s, i) => s + i.guias, 0);
    const ativos = GUIDE_MANIFESTS.filter((m) => m.status !== "archived").length;
    expect(total).toBe(ativos);

    const todos = inventario.flatMap((i) => i.slugs);
    expect(new Set(todos).size).toBe(todos.length);
  });

  it("torna visível o que fica fora dos clusters eleitos", () => {
    // O relatório manda congelar a expansão fora dos clusters — e não se
    // congela o que não se consegue ver. O balde tem de existir sempre.
    const fora = inventarioPorCluster().find((i) => i.cluster === "sem_cluster");
    expect(fora).toBeDefined();
  });

  it("um guia com cluster explícito ignora o grupo do hub", () => {
    expect(clusterDoGuia("ato-isolado", "irs")).toBe("ato-isolado");
    expect(clusterDoGuia("guia-inventado-qualquer")).toBe("sem_cluster");
  });
});

describe("autoridade e citabilidade", () => {
  it("a anatomia de resultado tem as seis camadas do §14.3", () => {
    expect(CAMADAS_RESULTADO).toHaveLength(6);
    expect(CAMADAS_RESULTADO.map((c) => c.id)).toEqual([
      "cabecalho", "como", "acao", "cenarios", "fontes", "ctas",
    ]);
  });

  it("a anatomia de página citável tem as seis camadas do §10.2", () => {
    expect(CAMADAS_PAGINA_CITAVEL).toHaveLength(6);
    expect(CAMADAS_PAGINA_CITAVEL.map((c) => c.camada)).toEqual([
      "Resposta", "Cenário", "Cálculo", "Evidência", "Limites", "Ação",
    ]);
  });

  it("o benchmark tem 20 prompts, com ids únicos e perguntas reais", () => {
    expect(PROMPTS_BENCHMARK).toHaveLength(20);
    expect(new Set(PROMPTS_BENCHMARK.map((p) => p.id)).size).toBe(20);
    for (const p of PROMPTS_BENCHMARK) {
      expect(p.pergunta.endsWith("?"), p.id).toBe(true);
      expect(p.paginaAlvo.startsWith("/"), p.id).toBe(true);
    }
  });

  it("cada prompt aponta para uma superfície que existe", () => {
    for (const p of PROMPTS_BENCHMARK) {
      if (p.paginaAlvo.startsWith("/guias/")) {
        const slug = p.paginaAlvo.slice("/guias/".length);
        expect(manifesto(slug), `${p.id} → ${slug}`).toBeDefined();
      } else if (p.paginaAlvo.startsWith("/ferramentas/")) {
        const slug = p.paginaAlvo.slice("/ferramentas/".length);
        expect(FERRAMENTA_SLUGS as readonly string[], p.id).toContain(slug);
      }
    }
  });

  it("todos os ICPs prioritários estão cobertos pelo benchmark", () => {
    const cobertos = new Set(PROMPTS_BENCHMARK.map((p) => p.icp));
    for (const icp of ["A", "B", "C", "D"]) expect(cobertos, icp).toContain(icp);
  });
});

describe("frescura de indexação: lastmod material", () => {
  it("um guia herda a data de revisão do seu manifesto — não a do build", () => {
    const slug = GUIA_SLUGS[0];
    expect(revisaoDaRota(`/guias/${slug}`)).toBe(manifesto(slug)!.lastReviewedAt);
  });

  it("as ferramentas seguem a revisão dos parâmetros fiscais", () => {
    for (const slug of FERRAMENTA_SLUGS) {
      expect(revisaoDaRota(`/ferramentas/${slug}`)).toBe(DATA_LAST_REVIEW);
    }
  });

  it("o índice dos guias mostra a revisão mais recente que lista", () => {
    const maisRecente = revisaoDosGuias();
    expect(revisaoDaRota("/guias")).toBe(maisRecente);
    for (const m of GUIDE_MANIFESTS.filter((g) => g.status !== "archived")) {
      expect(m.lastReviewedAt <= maisRecente, m.slug).toBe(true);
    }
  });

  it("todas as datas manuais são ISO e não estão no futuro", () => {
    const hoje = new Date().toISOString().slice(0, 10);
    for (const [rota, data] of Object.entries(REVISOES_MANUAIS)) {
      expect(ISO.test(data), rota).toBe(true);
      expect(data <= hoje, `${rota} (${data})`).toBe(true);
    }
  });

  it("toda a rota pública tem data material conhecida", () => {
    // Um `lastmod` em falta é aceitável; um `lastmod` inventado não é. Este
    // teste garante que hoje não falta nenhum — se uma rota nova entrar sem
    // data, aparece aqui e não em silêncio no sitemap.
    const semData = PUBLIC_ROUTES.filter((r) => revisaoDaRota(r.path) === null).map((r) => r.path);
    expect(semData).toEqual([]);
  });

  it("nenhuma data de revisão é a data do build", () => {
    // A regressão que este ficheiro existe para impedir.
    const hoje = new Date().toISOString().slice(0, 10);
    const datas = PUBLIC_ROUTES.map((r) => revisaoDaRota(r.path)).filter(Boolean) as string[];
    expect(datas.every((d) => d !== hoje) || DATA_LAST_REVIEW === hoje).toBe(true);
  });

  it("comoData recusa lixo em vez de devolver uma data inválida", () => {
    expect(comoData(null)).toBeUndefined();
    expect(comoData("não é uma data")).toBeUndefined();
    expect(comoData("2026-08-07")?.toISOString()).toBe("2026-08-07T00:00:00.000Z");
  });
});

describe("páginas de autoridade", () => {
  it("as três estão registadas no sitemap", () => {
    const rotas = PUBLIC_ROUTES.map((r) => r.path);
    for (const p of ["/metodologia", "/estado-dos-dados", "/changelog-fiscal"]) {
      expect(rotas, p).toContain(p);
    }
  });
});
