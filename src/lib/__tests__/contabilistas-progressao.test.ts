// ═══════════════════════════════════════════════════════════════════════
//  PROGRESSÃO E COMISSÃO — os valores oficiais, e a fronteira comercial
//  ---------------------------------------------------------------------
//  ⚠️ Este teste substituiu uma versão minha que usava os números do
//  MOCKUP: 600 XP no patamar 4, 9,99 €, +20/+15 XP. Os oficiais são os do
//  Relatório Mestre §164 — 0/200/500/900/1500/2300 XP,
//  grátis/14,99/24,99/39,99/64,99/99,99 €, +10/+25/+100 XP. A referência C
//  é direção visual; onde divergir num valor, o relatório ganha.
//
//  A segunda metade guarda uma coisa que nenhum cálculo garante: que pagar
//  um patamar compra a percentagem e MAIS NADA. A partir do momento em que
//  existe um botão de pagar, «ordenar parceiros pelo valor pago» só
//  continua proibido se o patamar não for um sinal que o diretório, o
//  routing ou o contrato público consigam ler.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATALOGO_VERSAO, MARCOS_CREDITO, PATAMARES, XP_POR_EVENTO, copyEmFalta,
  copyJornadaProgressao, creditosDoMarco, descontoPorCreditos,
  descricaoDescontoFidelidade, formatarComissao, opcoesDisponiveis,
  patamarConquistado, patamarEfetivo, precoComDesconto, simularDesbloqueio,
  vistaProgressao,
} from "../contabilistas/progressao/catalogo";
import {
  COPY_BASE_DA_COMISSAO, COPY_ELEGIBILIDADE, COPY_QUEM_FATURA,
  DESBLOQUEIO_NAO_COMPRA, DESBLOQUEIO_PAGO_ATIVO,
} from "../contabilistas/progressao/fronteiras";

const RAIZ = process.cwd();
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

/**
 * O ficheiro sem comentários.
 *
 * Vários dos ficheiros inspecionados explicam POR ESCRITO a regra que se
 * está a verificar — o `PerfilPreview` diz que não recebe «comissão, XP,
 * patamar ou créditos». Procurar no texto todo dava um teste que falha por
 * o código estar bem documentado, o que é o incentivo errado.
 */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ")
    .replace(/([^:])\/\/.*$/gm, "$1");
}
const lerCodigo = (...p: string[]) => semComentarios(ler(...p));

describe("progressão — catálogo", () => {
  it("cada patamar reduz a comissão", () => {
    for (let i = 1; i < PATAMARES.length; i += 1) {
      expect(PATAMARES[i]!.comissaoBps).toBeLessThan(PATAMARES[i - 1]!.comissaoBps);
    }
  });

  it("valores oficiais §164", () => {
    expect(PATAMARES.map((p) => p.comissaoBps)).toEqual([1000, 900, 800, 700, 600, 500]);
    expect(PATAMARES.map((p) => p.xpMinimo)).toEqual([0, 200, 500, 900, 1500, 2300]);
    expect(PATAMARES.map((p) => p.precoDesbloqueioCents)).toEqual([null, 1499, 2499, 3999, 6499, 9999]);
    expect(CATALOGO_VERSAO).toBe(1);
  });

  it("Parceiro não passa de €99,99 base nesta versão", () => {
    expect(Math.max(...PATAMARES.map((p) => p.precoDesbloqueioCents ?? 0))).toBe(9999);
  });

  it("thresholds", () => {
    expect(patamarConquistado(0)).toBe(1);
    expect(patamarConquistado(199)).toBe(1);
    expect(patamarConquistado(200)).toBe(2);
    expect(patamarConquistado(500)).toBe(3);
    expect(patamarConquistado(900)).toBe(4);
    expect(patamarConquistado(1500)).toBe(5);
    expect(patamarConquistado(2300)).toBe(6);
    expect(patamarConquistado(99999)).toBe(6);
  });

  it("efetivo é o máximo, e comprar não muda o conquistado", () => {
    expect(patamarEfetivo(3, 1)).toBe(3);
    expect(patamarEfetivo(3, 4)).toBe(4);
    expect(patamarEfetivo(5, 2)).toBe(5);
  });

  it("formata a comissão sem casas decimais desnecessárias", () => {
    expect(formatarComissao(1000)).toBe("10%");
    expect(formatarComissao(500)).toBe("5%");
  });
});

describe("progressão — créditos", () => {
  it("marcos, não escada acumulável", () => {
    expect(descontoPorCreditos(0)).toBe(0);
    expect(descontoPorCreditos(1)).toBe(5);
    expect(descontoPorCreditos(4)).toBe(5);
    expect(descontoPorCreditos(5)).toBe(15);
    expect(descontoPorCreditos(9)).toBe(15);
    expect(descontoPorCreditos(10)).toBe(20);
    expect(descontoPorCreditos(30)).toBe(20);
  });

  it("consome só os créditos do marco atingido", () => {
    expect(creditosDoMarco(7)).toBe(5);
    expect(creditosDoMarco(12)).toBe(10);
    expect(creditosDoMarco(0)).toBe(0);
  });

  it("oferece as alternativas do saldo, para se poderem guardar créditos", () => {
    expect(opcoesDisponiveis(7).map((o) => o.creditos)).toEqual([0, 1, 5]);
    expect(opcoesDisponiveis(12).map((o) => o.creditos)).toEqual([0, 1, 5, 10]);
  });

  it("tabela de preços §64", () => {
    expect(precoComDesconto(1499, 5)).toBe(1424);
    expect(precoComDesconto(1499, 15)).toBe(1274);
    expect(precoComDesconto(1499, 20)).toBe(1199);
    expect(precoComDesconto(2499, 15)).toBe(2124);
    expect(precoComDesconto(3999, 15)).toBe(3399);
    expect(precoComDesconto(6499, 20)).toBe(5199);
    expect(precoComDesconto(9999, 20)).toBe(7999);
  });

  it("simula o desbloqueio e diz com quanto se fica", () => {
    const s = simularDesbloqueio(PATAMARES[3]!, 7, 7)!;
    expect(s).toEqual({
      baseCents: 3999, creditosUsados: 5, descontoPct: 15,
      finalCents: 3399, saldoDepois: 2,
    });
  });

  it("o patamar Base não é comprável", () => {
    expect(simularDesbloqueio(PATAMARES[0]!, 10, 10)).toBeNull();
  });
});

describe("progressão — vista", () => {
  it("mostra quanto falta dentro do intervalo, não do total", () => {
    const v = vistaProgressao({
      xp: 350, clientesElegiveis: 5, creditosDisponiveis: 0, creditosReservados: 0,
      patamarConquistado: 2, patamarComprado: 1,
    });
    expect(v.atual.ordem).toBe(2);
    expect(v.proximo!.ordem).toBe(3);
    expect(v.xpEmFalta).toBe(150);
    expect(v.progressoNoIntervalo).toBeCloseTo(0.5, 5);
  });

  it("no topo deixa de falar de XP em falta", () => {
    const v = vistaProgressao({
      xp: 5000, clientesElegiveis: 20, creditosDisponiveis: 3, creditosReservados: 0,
      patamarConquistado: 6, patamarComprado: 1,
    });
    expect(v.noTopo).toBe(true);
    expect(v.proximo).toBeNull();
    expect(v.xpEmFalta).toBe(0);
  });

  it("quem comprou continua a ver o próximo patamar por mérito", () => {
    const v = vistaProgressao({
      xp: 610, clientesElegiveis: 8, creditosDisponiveis: 0, creditosReservados: 0,
      patamarConquistado: 3, patamarComprado: 4,
    });
    expect(v.efetivo).toBe(4);
    expect(v.proximo!.ordem).toBe(5);
    expect(v.xp).toBe(610);           // a compra não mexeu no XP
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  A FRONTEIRA COMERCIAL
// ═══════════════════════════════════════════════════════════════════════

describe("o que o desbloqueio pago NUNCA compra", () => {
  it("está escrito, para quem está a decidir pagar", () => {
    expect(DESBLOQUEIO_NAO_COMPRA.length).toBeGreaterThanOrEqual(4);
    const tudo = DESBLOQUEIO_NAO_COMPRA.join(" ").toLowerCase();
    expect(tudo).toMatch(/diretório|pesquisa/);
    expect(tudo).toMatch(/encaminhamento/);
    expect(tudo).toMatch(/selo|distintivo|verificação/);
  });

  it("o patamar não entra em NENHUMA definição do contrato público", () => {
    // §138. A view é REDEFINIDA por cada migração que lhe acrescenta um
    // campo, e é numa dessas redefinições futuras que a coluna entraria.
    // Ler só a migração que a criou dava um teste que fica verdadeiro e
    // deixa de ser útil.
    const definicoes = definicoesDaViewPublica();
    expect(definicoes.length).toBeGreaterThanOrEqual(2);
    for (const { ficheiro, corpo } of definicoes) {
      for (const coluna of [
        "xp", "patamar", "comissao", "creditos", "clientes_elegiveis",
        "highest_earned_tier", "highest_purchased_tier",
      ]) {
        expect(corpo, `${ficheiro} passou a expor ${coluna}`)
          .not.toMatch(new RegExp(`\\b${coluna}\\b`));
      }
    }
  });

  it("o perfil público não recebe a progressão", () => {
    const preview = lerCodigo("src", "components", "contabilistas", "PerfilPreview.tsx");
    expect(preview).not.toMatch(/comissao|patamar|creditos|\bxp\b/i);
  });

  it("o routing não lê o patamar", () => {
    const routing = lerCodigo("src", "lib", "routing.ts");
    expect(routing).not.toMatch(/patamar|comissaoBps|progressao/i);
    expect(routing).toContain("MONETIZACAO_PROIBIDA");
  });

  it("a ordenação do diretório não lê o patamar", () => {
    const dados = lerCodigo("src", "lib", "contabilistas", "dados.ts");
    const listagem = dados.slice(
      dados.indexOf("export async function listarContabilistas"),
      dados.indexOf("export async function obterContabilistaPorSlug"),
    );
    expect(listagem.length).toBeGreaterThan(0);
    expect(listagem).not.toMatch(/patamar|comissao|\bxp\b|credito/i);
  });

  it("o catálogo não sabe ordenar nem encaminhar", () => {
    const fonte = lerCodigo("src", "lib", "contabilistas", "progressao", "catalogo.ts");
    expect(fonte).not.toMatch(/from ["'].*routing["']/);
    expect(fonte).not.toMatch(/escolherRota|listarContabilistas/);
  });
});

describe("o que a interface tem de dizer sobre dinheiro", () => {
  it("diz sobre o que a taxa incide — as duas bases", () => {
    expect(COPY_BASE_DA_COMISSAO).toMatch(/propostas aceites/i);
    expect(COPY_BASE_DA_COMISSAO).toMatch(/consultas realizadas/i);
  });

  it("diz quem fatura, e que não retém dinheiro de terceiros", () => {
    // §10 do plano: o Recibo Certo não é intermediário financeiro entre
    // cliente e contabilista. Afirmar o contrário seria afirmar uma
    // atividade que não exerce.
    expect(COPY_QUEM_FATURA).toMatch(/fatura/i);
    expect(COPY_QUEM_FATURA).toMatch(/não ret[ée]m/i);
    expect(COPY_QUEM_FATURA).toMatch(/paga-te diretamente/i);
  });

  it("diz o que «elegível» exclui", () => {
    expect(COPY_ELEGIBILIDADE).toMatch(/Recibo Certo/);
  });

  it("a cobrança está desligada, e o código di-lo", () => {
    expect(DESBLOQUEIO_PAGO_ATIVO).toBe(false);
  });

  it("o ecrã nunca diz que a comissão aumenta", () => {
    // §164 proíbe a frase pelo nome. Num ecrã que mostra 10% → 5%, «cada
    // patamar aumenta a tua comissão» cria uma contradição visível.
    // `lerCodigo`, não `ler`: o próprio ecrã cita a frase proibida no
    // comentário que explica porque é proibida. Um teste que falhasse por
    // isso premiava apagar a explicação.
    const ecra = lerCodigo("src", "app", "contabilista", "progressao", "page.tsx");
    expect(ecra).not.toMatch(/aumenta a tua comiss/i);
    expect(copyJornadaProgressao("reducao")).toMatch(/reduz a comiss/i);
  });

  it("o ecrã fala de créditos, não de cartões concluídos", () => {
    // Quem concluiu 10 cartões e gastou 5 créditos tem direito a 15%, não
    // a 20%. Dizer «10 cartões concluídos → 20%» promete um desconto que o
    // saldo não suporta.
    const ecra = lerCodigo("src", "app", "contabilista", "progressao", "page.tsx");
    expect(ecra).toMatch(/créditos de fidelidade/i);
    expect(ecra).not.toMatch(/cart(ões|ao) conclu/i);
    for (const m of descricaoDescontoFidelidade()) {
      expect(m.rotulo).toMatch(/crédito/i);
    }
  });

  it("não usa urgência artificial", () => {
    const fonte = semAcentos(lerCodigo("src", "app", "contabilista", "progressao", "page.tsx"));
    expect(fonte).not.toMatch(/ultima oportunidade|so hoje|termina em|restam apenas|nao percas/i);
  });
});

/** Compara sem acentos: a proibição não depende de como se escreveu. */
function semAcentos(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Todos os corpos de `CREATE ... VIEW contabilistas_publico`. */
function definicoesDaViewPublica(): { ficheiro: string; corpo: string }[] {
  const dir = join(RAIZ, "supabase", "migrations");
  const achados: { ficheiro: string; corpo: string }[] = [];
  for (const ficheiro of readdirSync(dir).sort()) {
    if (!ficheiro.endsWith(".sql")) continue;
    const sql = semComentarios(ler("supabase", "migrations", ficheiro));
    const re = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+public\.contabilistas_publico/gi;
    for (let m = re.exec(sql); m; m = re.exec(sql)) {
      const fim = sql.indexOf(";", m.index);
      achados.push({ ficheiro, corpo: sql.slice(m.index, fim === -1 ? undefined : fim) });
    }
  }
  return achados;
}
