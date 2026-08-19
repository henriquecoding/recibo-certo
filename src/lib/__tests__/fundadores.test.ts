// ═══════════════════════════════════════════════════════════════════════
//  O PROGRAMA FUNDADOR — os dois lados têm de dizer o mesmo
//  ---------------------------------------------------------------------
//  O padrão é o do `catalogo.ts`: os valores vivem em dois sítios — o SQL,
//  que é a autoridade em runtime, e o TypeScript, que desenha o ecrã — e
//  há um teste que os compara. Sem ele, um ecrã promete 5% e uma fatura
//  cobra 6%, e ninguém dá por isso até o primeiro contabilista reclamar.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COMISSAO_FUNDADOR_BPS, COMISSAO_FUNDADOR_TEXTO, JUSTIFICACAO_MIN,
  LUGARES_FUNDADORES, LUGARES_DESCONHECIDOS,
  comissaoEfetivaBps, estadoDaPropostaLegivel, normalizarLugares,
  patamaresQueOFundadorSalta, poupancaDaProposta, textoLugares, validarProposta,
  type PropostaDesbloqueio,
} from "@/lib/contabilistas/progressao/fundadores";
import { PATAMARES } from "@/lib/contabilistas/progressao/catalogo";

const SQL = readFileSync(
  join(process.cwd(), "supabase/migrations/20260819100000_fundadores_e_negociacao.sql"),
  "utf8",
);

describe("fundadores: o SQL e o TypeScript dizem o mesmo", () => {
  it("o número de lugares é o mesmo dos dois lados", () => {
    const m = /lugares_fundadores_total\(\) RETURNS integer\s*\nLANGUAGE sql IMMUTABLE AS \$\$ SELECT (\d+) \$\$/
      .exec(SQL);
    expect(m, "não encontrei `lugares_fundadores_total` no SQL").not.toBeNull();
    expect(Number(m![1])).toBe(LUGARES_FUNDADORES);
  });

  it("a comissão de fundador é a mesma dos dois lados", () => {
    const m = /comissao_fundador_bps\(\) RETURNS integer\s*\nLANGUAGE sql IMMUTABLE AS \$\$ SELECT (\d+) \$\$/
      .exec(SQL);
    expect(m, "não encontrei `comissao_fundador_bps` no SQL").not.toBeNull();
    expect(Number(m![1])).toBe(COMISSAO_FUNDADOR_BPS);
  });

  it("o mínimo da justificação é o mesmo dos dois lados", () => {
    expect(SQL).toContain(`char_length(justificacao) BETWEEN ${JUSTIFICACAO_MIN} AND 2000`);
    expect(SQL).toContain(`char_length(coalesce(btrim(p_justificacao), '')) < ${JUSTIFICACAO_MIN}`);
  });

  it("os dois lados usam `least`, e não uma igualdade a 500", () => {
    // Se um dia existir um patamar abaixo dos 5%, quem lá chegou por
    // mérito não pode ser empurrado para cima pelo benefício.
    expect(SQL).toContain("least(p_bps_do_patamar, public.comissao_fundador_bps())");
  });
});

describe("fundadores: ⚠️ o benefício chega mesmo à fatura", () => {
  // ESTE É O TESTE QUE FALTAVA, e a razão de faltar é instrutiva: tinha
  // sido construído o programa inteiro — tabela, lugares, cartão no ecrã,
  // página a prometer 5% — e o número que a Stripe cobra vinha de outro
  // sítio, que não sabia que o programa existia. Um fundador via 5% em
  // todo o lado e pagava 10%, e a diferença só aparecia no extrato.
  //
  // A regra que estes testes fixam: quem decide o `application_fee` é
  // `comissao_bps_do_contabilista`, e ela TEM de passar pelo benefício.
  const PAGAMENTOS = readFileSync(
    join(process.cwd(), "supabase/migrations/20260816140000_pagamentos_stripe_connect.sql"),
    "utf8",
  );

  it("a função que a Stripe usa passa pelo benefício", () => {
    // O `RETURN` da versão nova, na migração dos fundadores.
    expect(SQL).toContain(
      "RETURN public.comissao_efetiva_bps(p_contabilista, COALESCE(v_bps, 1000));");
  });

  it("é mesmo essa a função que o pagamento chama", () => {
    // Se um dia o cálculo do `application_fee` passar a ler outra coisa,
    // este teste falha — e é isso que se quer.
    expect(PAGAMENTOS).toContain(
      "v_bps := public.comissao_bps_do_contabilista(v_ag.contabilista_id);");
    expect(PAGAMENTOS).toContain("v_comissao := ROUND(v_liquido * v_bps / 10000.0);");
  });

  it("a substituição é da MESMA assinatura — senão eram duas funções", () => {
    // `CREATE OR REPLACE` com outra assinatura cria uma sobrecarga em vez
    // de substituir, e o pagamento continuava a chamar a antiga.
    const assinatura = "public.comissao_bps_do_contabilista(p_contabilista uuid)\nRETURNS integer";
    expect(PAGAMENTOS).toContain(assinatura);
    expect(SQL).toContain(assinatura);
  });

  it("o benefício aplica-se DEPOIS do caminho de falha", () => {
    // Sem linha de progressão, a função devolve o patamar Base (10%). Um
    // fundador nessa situação continua a pagar 5%.
    const i = SQL.indexOf("RETURN public.comissao_efetiva_bps(p_contabilista, COALESCE(v_bps, 1000));");
    expect(i).toBeGreaterThan(0);
  });

  it("o ecrã lê o mesmo número que a fatura, e não uma segunda conta", () => {
    expect(SQL).toContain("'comissaoEfetivaBps', public.comissao_bps_do_contabilista(v_uid)");
  });
});

describe("fundadores: a comissão efetiva", () => {
  it("um fundador no patamar base paga 5%, e não 10%", () => {
    expect(comissaoEfetivaBps(1000, true)).toBe(500);
  });

  it("quem não é fundador paga o do patamar", () => {
    expect(comissaoEfetivaBps(1000, false)).toBe(1000);
  });

  it("⚠️ o benefício nunca PIORA o que já se conquistou", () => {
    // O caso que o `least` existe para cobrir. Um patamar hipotético de
    // 4% não pode ser arredondado para cima até 5% por causa do benefício.
    expect(comissaoEfetivaBps(400, true)).toBe(400);
  });

  it("no patamar mais baixo que existe hoje, o benefício não muda nada", () => {
    const ultimo = PATAMARES[PATAMARES.length - 1]!;
    expect(comissaoEfetivaBps(ultimo.comissaoBps, true)).toBe(ultimo.comissaoBps);
  });

  it("5% é mesmo um patamar do catálogo, e não um número solto", () => {
    expect(PATAMARES.some((p) => p.comissaoBps === COMISSAO_FUNDADOR_BPS)).toBe(true);
    expect(COMISSAO_FUNDADOR_TEXTO).toBe("5%");
  });

  it("diz quantos patamares o fundador salta", () => {
    // Do «Base» (1) ao patamar de 5% (6) são CINCO subidas, não seis: o
    // que se conta são os degraus, não os patamares em que se pisa.
    expect(patamaresQueOFundadorSalta()).toBe(5);
    expect(PATAMARES.find((p) => p.comissaoBps === COMISSAO_FUNDADOR_BPS)?.ordem).toBe(6);
  });
});

describe("fundadores: o contador", () => {
  it("sem confirmação, falha fechada", () => {
    expect(LUGARES_DESCONHECIDOS.verificado).toBe(false);
    expect(LUGARES_DESCONHECIDOS.esgotado).toBe(true);
    expect(textoLugares(LUGARES_DESCONHECIDOS)).toMatch(/não conseguimos confirmar/i);
  });

  it("conta os que restam", () => {
    const l = normalizarLugares({ total: 10, ocupados: 7 });
    expect(l.restantes).toBe(3);
    expect(l.esgotado).toBe(false);
    expect(textoLugares(l)).toBe("Restam 3 lugares de fundador, de 10.");
  });

  it("o singular é singular", () => {
    expect(textoLugares(normalizarLugares({ total: 10, ocupados: 9 })))
      .toBe("Falta 1 lugar de fundador, de 10.");
  });

  it("esgotado diz que está esgotado", () => {
    const l = normalizarLugares({ total: 10, ocupados: 10 });
    expect(l.esgotado).toBe(true);
    expect(textoLugares(l)).toMatch(/estão ocupados/i);
  });

  it("nunca conta negativo, nem que a base devolva disparate", () => {
    expect(normalizarLugares({ total: 10, ocupados: 14 }).restantes).toBe(0);
    expect(normalizarLugares({ total: 10, ocupados: -3 }).ocupados).toBe(0);
  });

  it("o contador não inventa urgência", () => {
    for (const ocupados of [0, 5, 9, 10]) {
      const t = textoLugares(normalizarLugares({ total: 10, ocupados }));
      expect(t).not.toMatch(/corre|últim|despacha|rápido|agora ou/i);
    }
  });
});

describe("fundadores: validar uma proposta antes de a enviar", () => {
  const base = { precoCatalogoCents: 3999, justificacao: "x".repeat(JUSTIFICACAO_MIN) };

  it("um valor abaixo do catálogo com justificação passa", () => {
    expect(validarProposta({ ...base, valorCents: 2500 }).valido).toBe(true);
  });

  it("propor o preço de tabela não é negociar", () => {
    const r = validarProposta({ ...base, valorCents: 3999 });
    expect(r.valido).toBe(false);
    expect(r.problemas.join(" ")).toMatch(/abaixo do preço de tabela/i);
  });

  it("propor acima do catálogo é recusado", () => {
    expect(validarProposta({ ...base, valorCents: 9999 }).valido).toBe(false);
  });

  it("uma justificação curta diz quanto falta", () => {
    const r = validarProposta({ ...base, valorCents: 2500, justificacao: "porque sim" });
    expect(r.valido).toBe(false);
    expect(r.problemas.join(" ")).toMatch(/faltam \d+ caracteres/);
  });

  it("espaços em branco não contam como justificação", () => {
    const r = validarProposta({
      ...base, valorCents: 2500, justificacao: " ".repeat(200),
    });
    expect(r.valido).toBe(false);
  });

  it("um valor negativo é recusado", () => {
    expect(validarProposta({ ...base, valorCents: -1 }).valido).toBe(false);
  });

  it("junta os problemas em vez de mostrar um de cada vez", () => {
    const r = validarProposta({ ...base, valorCents: 9999, justificacao: "curto" });
    expect(r.problemas.length).toBe(2);
  });
});

describe("fundadores: como se lê uma proposta", () => {
  const p = (extra: Partial<PropostaDesbloqueio>): PropostaDesbloqueio => ({
    id: "1", contabilistaId: "c", patamarAlvo: 4,
    precoCatalogoCents: 3999, valorPropostoCents: 2500,
    justificacao: "x".repeat(50), estado: "enviada",
    contrapropostaCents: null, notaAdmin: null,
    decididaEm: null, validaAte: null, criadoEm: "2026-08-19T10:00:00Z",
    ...extra,
  });

  it("à espera diz que está à espera", () => {
    expect(estadoDaPropostaLegivel(p({})).titulo).toBe("À espera de resposta");
  });

  it("aceite dentro do prazo é boa notícia", () => {
    const r = estadoDaPropostaLegivel(p({
      estado: "aceite", validaAte: "2099-01-01T00:00:00Z",
    }));
    expect(r.tom).toBe("bom");
  });

  it("⚠️ aceite mas caducada não se lê como aceite", () => {
    // O caso que engana: o estado diz «aceite» e o valor já não vale. Uma
    // interface que só olhasse para o estado prometia um preço morto.
    const r = estadoDaPropostaLegivel(p({
      estado: "aceite", validaAte: "2020-01-01T00:00:00Z",
    }));
    expect(r.tom).toBe("aviso");
    expect(r.titulo).toMatch(/já passou o prazo/i);
  });

  it("recusada diz o que se pode fazer a seguir", () => {
    expect(estadoDaPropostaLegivel(p({ estado: "recusada" })).explicacao)
      .toMatch(/propor outro valor/i);
  });

  it("a poupança conta sobre o valor que está em cima da mesa", () => {
    expect(poupancaDaProposta(p({}))).toBe(3999 - 2500);
    // Com contraproposta, é ela que conta — mostrar a poupança do valor
    // pedido seria mostrar um número que já ninguém oferece.
    expect(poupancaDaProposta(p({
      estado: "contraproposta", contrapropostaCents: 3200,
    }))).toBe(3999 - 3200);
  });

  it("uma contraproposta pior do que o catálogo não dá poupança negativa", () => {
    expect(poupancaDaProposta(p({ contrapropostaCents: 5000 }))).toBe(0);
  });
});

describe("fundadores: as fronteiras comerciais aguentam-se", () => {
  it("o SQL diz, por escrito, que um valor aceite não compra posição", () => {
    expect(SQL).toMatch(/DESBLOQUEIO_NAO_COMPRA/);
    expect(SQL).toMatch(/não é um leilão/i);
  });

  it("uma proposta aceite caduca — não vale para sempre", () => {
    expect(SQL).toContain("now() + interval '30 days'");
    expect(SQL).toMatch(/d\.valida_ate IS NULL OR d\.valida_ate > now\(\)/);
  });

  it("só há uma proposta aberta de cada vez, e é o índice que o garante", () => {
    expect(SQL).toContain("desbloqueio_propostas_uma_aberta_idx");
    expect(SQL).toMatch(/WHERE estado IN \('enviada', 'contraproposta'\)/);
  });

  it("o lugar de fundador é único por construção", () => {
    expect(SQL).toContain("fundadores_numero_ocupado_idx");
    expect(SQL).toContain("pg_advisory_xact_lock(hashtext('recibocerto:lugares_fundadores'))");
  });

  it("uma suspensão não dá o lugar a outro; uma recusa dá", () => {
    expect(SQL).toMatch(/ELSIF NEW\.estado = 'recusado'/);
    expect(SQL).not.toMatch(/NEW\.estado = 'suspenso'[\s\S]{0,200}libertado_em = now\(\)/);
  });

  it("quem é fundador não é lista pública", () => {
    // Publicar os dez transformava um reconhecimento num distintivo, e um
    // distintivo no diretório é o que `routing.ts` proíbe.
    expect(SQL).toMatch(/USING \(contabilista_id = \(SELECT auth\.uid\(\)\) OR public\.is_admin\(\)\)/);
  });
});
