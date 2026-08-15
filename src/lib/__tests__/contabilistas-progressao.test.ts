// ═══════════════════════════════════════════════════════════════════════
//  PROGRESSÃO E COMISSÃO — a aritmética, e a fronteira que o dinheiro
//  não atravessa
//  ---------------------------------------------------------------------
//  Metade destes testes é aritmética de cêntimos e de degraus. A outra
//  metade guarda uma coisa que nenhum cálculo garante: que pagar um
//  patamar compra a percentagem e MAIS NADA.
//
//  A razão de ser um teste e não um comentário é o `MONETIZACAO_PROIBIDA`
//  do `routing.ts`: «ordenar parceiros pelo valor pago» está proibido, e
//  a partir do momento em que existe um botão de pagar, a única forma de
//  isso continuar verdade é o patamar não ser um sinal que o diretório, o
//  routing ou o contrato público consigam ler. Um dia alguém vai precisar
//  de «destacar os melhores contabilistas» e a coluna do patamar vai
//  parecer a resposta óbvia. É esse dia que estes testes esperam.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMISSAO_INICIAL_PCT,
  COMISSAO_PISO_PCT,
  COPY_BASE_DA_COMISSAO,
  COPY_DESCONTO_UNICO,
  COPY_ELEGIBILIDADE,
  COPY_QUEM_FATURA,
  DESBLOQUEIO_NAO_COMPRA,
  DESBLOQUEIO_PAGO_ATIVO,
  ESCALA_FIDELIDADE,
  PATAMARES,
  PATAMAR_MAX,
  XP_POR_EVENTO,
  calcularProgressao,
  comissaoLegivel,
  descontoDeFidelidadePct,
  patamarDeNivel,
  patamarPorMerito,
  precoDeDesbloqueio,
  proximoBonusDeFidelidade,
  somarXP,
  type EstadoProgressao,
} from "../contabilistas/progressao";

const RAIZ = process.cwd();
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

/**
 * O ficheiro sem comentários.
 *
 * Estes testes perguntam o que o CÓDIGO faz, e vários dos ficheiros que
 * eles inspecionam explicam em comentário precisamente a regra que se
 * está a verificar — o `PerfilPreview` diz, por escrito, que não recebe
 * «comissão, XP, patamar ou créditos». Procurar no texto todo dava um
 * teste que falha por o código estar bem documentado, o que é o incentivo
 * errado: passaria a compensar apagar a explicação.
 */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ")
    .replace(/([^:])\/\/.*$/gm, "$1");
}

/** Lê já sem comentários — é como quase todos estes testes querem ler. */
const lerCodigo = (...p: string[]) => semComentarios(ler(...p));

const DIR_MIGRACOES = join(RAIZ, "supabase", "migrations");
const MIGRACAO_PROGRESSAO = ler(
  "supabase", "migrations", "20260815220000_progressao_contabilistas.sql",
);

/**
 * Todos os corpos de `CREATE ... VIEW contabilistas_publico`, de todas as
 * migrações.
 *
 * A view é redefinida por cada migração que lhe acrescenta um campo, e é
 * na redefinição mais recente — ou na próxima — que uma coluna de
 * progressão entraria sem ninguém notar. Ler só a migração que a criou
 * dava um teste que fica verdadeiro e deixa de ser útil.
 */
function definicoesDaViewPublica(): { ficheiro: string; corpo: string }[] {
  const achados: { ficheiro: string; corpo: string }[] = [];
  for (const ficheiro of readdirSync(DIR_MIGRACOES).sort()) {
    if (!ficheiro.endsWith(".sql")) continue;
    const sql = semComentarios(ler("supabase", "migrations", ficheiro));
    const re = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+public\.contabilistas_publico/gi;
    for (let m = re.exec(sql); m; m = re.exec(sql)) {
      // Da definição até ao fim da instrução: o `;` que fecha o SELECT.
      const fim = sql.indexOf(";", m.index);
      achados.push({ ficheiro, corpo: sql.slice(m.index, fim === -1 ? undefined : fim) });
    }
  }
  return achados;
}

/** O estado da referência visual: patamar 3, a 60 XP do patamar 4. */
const REFERENCIA: EstadoProgressao = {
  xp: 540,
  clientesElegiveis: 5,
  patamarComprado: null,
  cartoesConcluidos: 5,
};

describe("a escada dos patamares", () => {
  it("tem seis degraus e a comissão desce sempre", () => {
    expect(PATAMARES).toHaveLength(6);
    for (let i = 1; i < PATAMARES.length; i++) {
      expect(PATAMARES[i].comissaoPct).toBeLessThan(PATAMARES[i - 1].comissaoPct);
      expect(PATAMARES[i].xpNecessario).toBeGreaterThan(PATAMARES[i - 1].xpNecessario);
      expect(PATAMARES[i].clientesNecessarios)
        .toBeGreaterThan(PATAMARES[i - 1].clientesNecessarios);
      expect(PATAMARES[i].precoDesbloqueioCents)
        .toBeGreaterThan(PATAMARES[i - 1].precoDesbloqueioCents);
    }
  });

  it("começa nos 10% e tem piso nos 5%", () => {
    expect(COMISSAO_INICIAL_PCT).toBe(10);
    expect(COMISSAO_PISO_PCT).toBe(5);
    // Sem piso, um degrau novo amanhã levava a comissão a zero — e uma
    // plataforma que intermedia de graça não paga a revisão das mensagens
    // que a mediação obriga a fazer.
    expect(Math.min(...PATAMARES.map((p) => p.comissaoPct))).toBe(COMISSAO_PISO_PCT);
    expect(PATAMARES.every((p) => p.comissaoPct > 0)).toBe(true);
  });

  it("o primeiro patamar é gratuito — é onde todos começam", () => {
    expect(PATAMARES[0].precoDesbloqueioCents).toBe(0);
    expect(PATAMARES[0].xpNecessario).toBe(0);
    expect(PATAMARES[0].clientesNecessarios).toBe(0);
  });

  it("o nível pedido é apertado às fronteiras da escada", () => {
    expect(patamarDeNivel(0).nivel).toBe(1);
    expect(patamarDeNivel(-3).nivel).toBe(1);
    expect(patamarDeNivel(99).nivel).toBe(PATAMAR_MAX);
    expect(patamarDeNivel(4).comissaoPct).toBe(7);
  });
});

describe("subir por mérito exige as duas coisas", () => {
  it("XP sem clientes não sobe", () => {
    // Quem fecha muitos serviços a um cliente único não construiu uma
    // carteira — e a escada mede carteira.
    expect(patamarPorMerito(5000, 0)).toBe(1);
  });

  it("clientes sem XP não sobem", () => {
    // Juntar clientes e não lhes entregar nada também não é trabalho feito.
    expect(patamarPorMerito(0, 50)).toBe(1);
  });

  it("as duas condições juntas sobem", () => {
    expect(patamarPorMerito(200, 2)).toBe(2);
    expect(patamarPorMerito(400, 4)).toBe(3);
    expect(patamarPorMerito(600, 7)).toBe(4);
    expect(patamarPorMerito(1300, 16)).toBe(6);
  });

  it("a condição que falta trava no degrau anterior", () => {
    expect(patamarPorMerito(600, 4)).toBe(3);
    expect(patamarPorMerito(400, 7)).toBe(3);
  });

  it("números absurdos não rebentam a escada", () => {
    expect(patamarPorMerito(Number.NaN, Number.NaN)).toBe(1);
    expect(patamarPorMerito(-100, -100)).toBe(1);
    expect(patamarPorMerito(9e9, 9e9)).toBe(PATAMAR_MAX);
  });
});

describe("o XP vem de trabalho verificável", () => {
  it("cada evento vale o que a referência diz", () => {
    expect(XP_POR_EVENTO.cliente_elegivel).toBe(20);
    expect(XP_POR_EVENTO.servico_concluido).toBe(15);
    expect(XP_POR_EVENTO.cartao_fidelidade_concluido).toBe(100);
  });

  it("o cartão fechado vale mais do que um serviço", () => {
    // É a prova de relação continuada, e não de uma entrega isolada.
    expect(XP_POR_EVENTO.cartao_fidelidade_concluido)
      .toBeGreaterThan(XP_POR_EVENTO.servico_concluido);
  });

  it("somar uma lista dá a soma", () => {
    expect(somarXP(["cliente_elegivel", "servico_concluido"])).toBe(35);
    expect(somarXP([])).toBe(0);
  });

  it("preencher o perfil não é um evento de XP", () => {
    // §133: dar XP por completar campos criava um incentivo superficial e
    // confundia a completude de uma página com progressão profissional.
    // A `percentagemDoPerfil` e esta escada são coisas diferentes.
    expect(Object.keys(XP_POR_EVENTO)).not.toContain("perfil_completo");
    expect(lerCodigo("src", "lib", "contabilistas", "progressao.ts"))
      .not.toMatch(/percentagemDoPerfil|essenciaisDoPerfil/);
  });

  it("diz o que «elegível» exclui", () => {
    // Uma palavra que exclui obriga a dizer o que exclui, senão o
    // contador parece avariado a quem trabalha fora da plataforma.
    expect(COPY_ELEGIBILIDADE).toMatch(/ReciboCerto/);
    expect(COPY_ELEGIBILIDADE.length).toBeGreaterThan(30);
  });
});

describe("onde a pessoa está", () => {
  const p = calcularProgressao(REFERENCIA);

  it("reproduz a referência: patamar 3, 8%, faltam 60 XP", () => {
    expect(p.patamar.nivel).toBe(3);
    expect(p.comissaoPct).toBe(8);
    expect(p.proximo?.nivel).toBe(4);
    expect(p.proximo?.comissaoPct).toBe(7);
    expect(p.xpEmFalta).toBe(60);
  });

  it("mede o degrau atual, não a escada inteira", () => {
    // Uma barra medida contra o total mal se move no fim, e a pessoa
    // deixa de ver o efeito do trabalho da semana.
    expect(p.xpDoDegrau).toEqual({ de: 400, ate: 600 });
    expect(p.fracaoDoDegrau).toBeCloseTo(140 / 200);
    expect(p.clientesDoDegrau).toEqual({ feitos: 1, precisos: 3 });
  });

  it("no topo da escada não há próximo nem falta nada", () => {
    const topo = calcularProgressao({ ...REFERENCIA, xp: 99999, clientesElegiveis: 99 });
    expect(topo.noTopo).toBe(true);
    expect(topo.proximo).toBeNull();
    expect(topo.xpEmFalta).toBe(0);
    expect(topo.clientesEmFalta).toBe(0);
    expect(topo.fracaoDoDegrau).toBe(1);
    expect(topo.comissaoPct).toBe(COMISSAO_PISO_PCT);
  });

  it("nunca devolve comissão fora da escada", () => {
    const casos: EstadoProgressao[] = [
      { xp: 0, clientesElegiveis: 0, patamarComprado: null, cartoesConcluidos: 0 },
      { xp: -1, clientesElegiveis: -1, patamarComprado: 0, cartoesConcluidos: -5 },
      { xp: 9e9, clientesElegiveis: 9e9, patamarComprado: 99, cartoesConcluidos: 9e9 },
      { xp: Number.NaN, clientesElegiveis: Number.NaN, patamarComprado: null, cartoesConcluidos: 0 },
    ];
    for (const c of casos) {
      const r = calcularProgressao(c);
      expect(r.comissaoPct).toBeGreaterThanOrEqual(COMISSAO_PISO_PCT);
      expect(r.comissaoPct).toBeLessThanOrEqual(COMISSAO_INICIAL_PCT);
      expect(r.fracaoDoDegrau).toBeGreaterThanOrEqual(0);
      expect(r.fracaoDoDegrau).toBeLessThanOrEqual(1);
    }
  });
});

describe("o patamar comprado e o merecido", () => {
  it("o comprado vale quando é maior", () => {
    const p = calcularProgressao({ ...REFERENCIA, patamarComprado: 4 });
    expect(p.patamar.nivel).toBe(4);
    expect(p.comissaoPct).toBe(7);
    expect(p.porDesbloqueio).toBe(true);
    // O mérito continua a ser dito: é o que a pessoa construiu.
    expect(p.patamarPorMerito.nivel).toBe(3);
  });

  it("o mérito vale quando ultrapassa o comprado", () => {
    const p = calcularProgressao({ xp: 1300, clientesElegiveis: 16, patamarComprado: 2, cartoesConcluidos: 0 });
    expect(p.patamar.nivel).toBe(6);
    expect(p.porDesbloqueio).toBe(false);
  });

  it("quem pagou não perde o patamar se o XP baixar", () => {
    // Um desbloqueio revogável era vender uma coisa e retirá-la depois.
    const p = calcularProgressao({ xp: 0, clientesElegiveis: 0, patamarComprado: 5, cartoesConcluidos: 0 });
    expect(p.patamar.nivel).toBe(5);
    expect(p.comissaoPct).toBe(6);
    expect(p.porDesbloqueio).toBe(true);
  });

  it("só se desbloqueia o degrau imediatamente seguinte", () => {
    // Saltar do 2 para o 6 com um pagamento transformava a escada numa
    // tabela de preços da comissão.
    const p = calcularProgressao(REFERENCIA);
    expect(p.proximo?.nivel).toBe(p.patamar.nivel + 1);
  });
});

describe("o desconto de fidelidade sobre o desbloqueio", () => {
  it("segue a escala da referência", () => {
    expect(descontoDeFidelidadePct(0)).toBe(0);
    expect(descontoDeFidelidadePct(1)).toBe(5);
    expect(descontoDeFidelidadePct(4)).toBe(5);
    expect(descontoDeFidelidadePct(5)).toBe(15);
    expect(descontoDeFidelidadePct(9)).toBe(15);
    expect(descontoDeFidelidadePct(10)).toBe(20);
    expect(descontoDeFidelidadePct(500)).toBe(20);
  });

  it("nunca passa do máximo da escala", () => {
    const max = ESCALA_FIDELIDADE[ESCALA_FIDELIDADE.length - 1].descontoPct;
    for (const n of [0, 1, 5, 10, 99, 1e6, -4, Number.NaN]) {
      expect(descontoDeFidelidadePct(n)).toBeLessThanOrEqual(max);
      expect(descontoDeFidelidadePct(n)).toBeGreaterThanOrEqual(0);
    }
  });

  it("reproduz o preço da referência ao cêntimo", () => {
    // 39,99 € menos 15% = 33,99 €. É o painel que fala de dinheiro, e é
    // por isso que este número é testado ao cêntimo e não por aproximação.
    const preco = precoDeDesbloqueio(4, 5);
    expect(preco.baseCents).toBe(3999);
    expect(preco.descontoPct).toBe(15);
    expect(preco.descontoCents).toBe(600);
    expect(preco.finalCents).toBe(3399);
  });

  it("sem cartões o preço é o preço", () => {
    const preco = precoDeDesbloqueio(4, 0);
    expect(preco.descontoCents).toBe(0);
    expect(preco.finalCents).toBe(preco.baseCents);
  });

  it("o desconto nunca torna o desbloqueio gratuito", () => {
    // Um desbloqueio a zero seria uma via paga que não se paga — e a
    // escada deixava de ter duas vias, passava a ter uma.
    for (let nivel = 2; nivel <= PATAMAR_MAX; nivel++) {
      const preco = precoDeDesbloqueio(nivel, 1e6);
      expect(preco.finalCents).toBeGreaterThan(0);
    }
  });

  it("aponta o bónus seguinte, e nada no fim da escala", () => {
    expect(proximoBonusDeFidelidade(0)).toEqual({ cartoesEmFalta: 1, descontoPct: 5 });
    expect(proximoBonusDeFidelidade(3)).toEqual({ cartoesEmFalta: 2, descontoPct: 15 });
    expect(proximoBonusDeFidelidade(5)).toEqual({ cartoesEmFalta: 5, descontoPct: 20 });
    expect(proximoBonusDeFidelidade(10)).toBeNull();
    expect(proximoBonusDeFidelidade(999)).toBeNull();
  });

  it("diz que não acumula, antes de a pessoa descobrir no fim", () => {
    expect(COPY_DESCONTO_UNICO).toMatch(/não acumula/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  A FRONTEIRA COMERCIAL
// ═══════════════════════════════════════════════════════════════════════

describe("o que o desbloqueio pago NUNCA compra", () => {
  const FONTE = ler("src", "lib", "contabilistas", "progressao.ts");

  it("está escrito, para quem está a decidir pagar", () => {
    // Um pagamento cujo efeito não está escrito é um pagamento mal
    // informado.
    expect(DESBLOQUEIO_NAO_COMPRA.length).toBeGreaterThanOrEqual(4);
    const tudo = DESBLOQUEIO_NAO_COMPRA.join(" ").toLowerCase();
    expect(tudo).toMatch(/diretório|pesquisa/);
    expect(tudo).toMatch(/encaminhamento/);
    expect(tudo).toMatch(/selo|distintivo|verificação/);
  });

  it("o patamar não entra em NENHUMA definição do contrato público", () => {
    // §138. A migração do contrato público diz as colunas uma a uma
    // exactamente para isto: uma coluna de comissão ali seria a comissão
    // de todos os contabilistas à vista.
    //
    // Verificar só a migração que criou a view não bastava: ela é
    // REDEFINIDA por migrações posteriores (a do perfil profissional já o
    // faz), e é numa dessas redefinições futuras que a coluna entraria.
    // Por isso o teste varre todas — incluindo as que ainda não existem.
    const definicoes = definicoesDaViewPublica();
    expect(definicoes.length).toBeGreaterThanOrEqual(2);

    for (const { ficheiro, corpo } of definicoes) {
      for (const coluna of [
        "xp", "patamar", "patamar_comprado", "comissao_pct",
        "clientes_elegiveis", "creditos", "cartoes_concluidos",
      ]) {
        expect(corpo, `${ficheiro} passou a expor ${coluna}`)
          .not.toMatch(new RegExp(`\\b${coluna}\\b`));
      }
    }
  });

  it("a progressão vive fora de `contabilistas`, que ainda é pública", () => {
    // A razão de ser uma tabela à parte e não colunas em `contabilistas`:
    // a política `contabilistas_diretorio_publico`, aberta a anon, AINDA
    // ESTÁ DE PÉ — a migração do contrato público não a fechou de
    // propósito, para não esvaziar o diretório em produção. Enquanto ela
    // existe, uma coluna nova em `contabilistas` nasce legível sem sessão,
    // view ou não view.
    expect(MIGRACAO_PROGRESSAO).toMatch(/CREATE TABLE[^;]*contabilista_progressao/);
    expect(MIGRACAO_PROGRESSAO).not.toMatch(
      /ALTER TABLE public\.contabilistas\s+ADD COLUMN[^;]*(\bxp\b|patamar|comissao)/i,
    );
  });

  it("o perfil público não recebe a progressão", () => {
    // O preview do perfil deriva de um subconjunto declarado, e não da
    // ficha inteira, precisamente para que campos novos não apareçam lá
    // por arrastamento.
    const preview = lerCodigo("src", "components", "contabilistas", "PerfilPreview.tsx");
    expect(preview).not.toMatch(/comissaoPct|patamarComprado|\bxp\b/i);
  });

  it("o routing não lê o patamar", () => {
    // `MONETIZACAO_PROIBIDA` proíbe ordenar parceiros pelo valor pago.
    // Com um botão de pagar a existir, a única garantia é o routing não
    // ter por onde saber quem pagou.
    const routing = lerCodigo("src", "lib", "routing.ts");
    expect(routing).not.toMatch(/patamar|comissaoPct|progressao/i);
    expect(routing).toContain("MONETIZACAO_PROIBIDA");
  });

  it("a ordenação do diretório não lê o patamar", () => {
    const dados = lerCodigo("src", "lib", "contabilistas", "dados.ts");
    const listagem = dados.slice(
      dados.indexOf("export async function listarContabilistas"),
      dados.indexOf("export async function obterContabilistaPorSlug"),
    );
    expect(listagem.length).toBeGreaterThan(0);
    expect(listagem).not.toMatch(/patamar|comissao|\bxp\b/i);
  });

  it("o domínio da progressão não sabe ordenar nem encaminhar", () => {
    // Não tem por onde: não importa o routing nem a listagem. Se um dia
    // importar, é aqui que se descobre.
    expect(FONTE).not.toMatch(/from ["']\.\.\/routing["']/);
    expect(FONTE).not.toMatch(/escolherRota|listarContabilistas/);
  });
});

describe("o que a interface tem de dizer sobre dinheiro", () => {
  it("diz sobre o que a taxa incide — as duas bases", () => {
    // Uma só das bases deixava metade do negócio intermediado fora da
    // conta, e a frase tem de dizer as duas.
    expect(COPY_BASE_DA_COMISSAO).toMatch(/propostas aceites/i);
    expect(COPY_BASE_DA_COMISSAO).toMatch(/consultas realizadas/i);
  });

  it("diz quem fatura a quem, e que não retém dinheiro de terceiros", () => {
    // §10 de PLATAFORMA-CONTABILISTAS.md: o ReciboCerto não é
    // intermediário financeiro entre cliente e contabilista. Afirmar o
    // contrário seria afirmar uma atividade que não exerce.
    expect(COPY_QUEM_FATURA).toMatch(/fatura/i);
    expect(COPY_QUEM_FATURA).toMatch(/não ret[ée]m/i);
    expect(COPY_QUEM_FATURA).toMatch(/paga-te diretamente/i);
  });

  it("a cobrança está desligada, e o código di-lo", () => {
    // Um botão que aceita o clique e não cobra deixava a pessoa a
    // acreditar que já tinha o patamar, à espera de uma fatura que não
    // vinha.
    expect(DESBLOQUEIO_PAGO_ATIVO).toBe(false);
  });

  it("não usa urgência artificial", () => {
    // A skill de crescimento proíbe dark patterns em checkout e em
    // urgência. Uma escada de comissões é exactamente onde eles apareciam.
    expect(FONTE_SEM_ACENTOS(ler("src", "lib", "contabilistas", "progressao.ts")))
      .not.toMatch(/ultima oportunidade|so hoje|termina em|acaba em|restam apenas|nao percas/i);
  });

  it("a percentagem lê-se como percentagem", () => {
    expect(comissaoLegivel(8)).toBe("8%");
    expect(comissaoLegivel(7.5)).toBe("7,5%");
  });
});

/** Compara sem acentos: a proibição não pode depender de como se escreveu. */
function FONTE_SEM_ACENTOS(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
