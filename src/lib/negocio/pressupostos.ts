// ═══════════════════════════════════════════════════════════════════════
//  O LIVRO DE PRESSUPOSTOS — o que é teu e o que estamos a assumir
//  ---------------------------------------------------------------------
//  A pricing engine já separa o que a pessoa respondeu do que o sistema
//  assumiu (`pricing/preenchimento.ts`), e é o mecanismo que impede um
//  exemplo de se apresentar como conselho. O modelo de negócio precisa do
//  mesmo rigor, com mais superfície para o perder: aqui há volumes,
//  capacidades, sazonalidade, prazos e crescimento — todos com um valor
//  por omissão defensável, e todos capazes de mudar a conclusão.
//
//  ── A REGRA ────────────────────────────────────────────────────────
//  Um pressuposto declarado é honesto. Um pressuposto escondido é um
//  número inventado com a autoridade de um resultado. A diferença entre
//  os dois é esta lista.
//
//  E só entra quem MEXE no resultado: um pressuposto irrelevante só
//  ocupa espaço na lista dos que interessam, e faz a lista deixar de ser
//  lida — que é a maneira mais eficaz de a tornar inútil.
// ═══════════════════════════════════════════════════════════════════════

import { fmt } from "@/lib/format";
import { num } from "@/lib/pricing/numeros";
import { custosDosPostos, temTrabalhadorValido, type AgregadoNegocio } from "./agregar";
import { capacidadeDe, volumeDerivado } from "./ofertas";
import type { ContextoNegocio, PressupostoNegocio } from "./tipos";

export function levantarPressupostos(
  contexto: ContextoNegocio,
  a: AgregadoNegocio,
): PressupostoNegocio[] {
  const lista: PressupostoNegocio[] = [];

  // ── Por oferta ──────────────────────────────────────────────────
  for (const r of a.ofertas) {
    const o = r.oferta;

    if (volumeDerivado(o.volume) && r.unidadesMes > 0) {
      lista.push({
        id: `volume-faixa-${o.id}`,
        rotulo: `Faixa de vendas de ${o.nome}`,
        valor: "−40% / +50% do esperado",
        origem: "default",
        impacto: "medio",
        resolverEm: `volume-${o.id}`,
        porque:
          "Sem um mau mês e um bom mês teus, a faixa é nossa — e é ela que diz se o negócio aguenta um trimestre fraco.",
      });
    }

    if (r.unidadesMes === 0) {
      lista.push({
        id: `volume-zero-${o.id}`,
        rotulo: `Vendas de ${o.nome}`,
        valor: "nenhuma",
        origem: "default",
        impacto: "alto",
        resolverEm: `volume-${o.id}`,
        porque: "Uma oferta sem volume não entra na receita. O preço está calculado, mas não gera nada.",
      });
    }

    const cap = capacidadeDe(o);
    if (!cap) {
      lista.push({
        id: `capacidade-${o.id}`,
        rotulo: `Capacidade de ${o.nome}`,
        valor: "sem limite",
        origem: "default",
        impacto: "medio",
        resolverEm: `capacidade-${o.id}`,
        porque:
          "Sem teto declarado, qualquer volume parece possível. Um limite — stock, lote, horas — impede um plano que não cabe no mês.",
      });
    } else if (cap.derivada) {
      lista.push({
        id: `capacidade-derivada-${o.id}`,
        rotulo: `Capacidade de ${o.nome}`,
        valor: `${cap.maximoMes} por mês, calculado das horas`,
        origem: "derivado",
        impacto: "baixo",
        resolverEm: `capacidade-${o.id}`,
        porque: "Sai das horas que declaraste na oferta. Se tens outro limite real, vale a pena escrevê-lo.",
      });
    }

    if (o.respondidos.length === 0) {
      lista.push({
        id: `oferta-exemplo-${o.id}`,
        rotulo: `Preço de ${o.nome}`,
        valor: "valores de exemplo",
        origem: "default",
        impacto: "alto",
        resolverEm: `oferta-${o.id}`,
        porque: "Ninguém mexeu nos campos desta oferta. O preço vem dos exemplos do cenário, não do teu caso.",
      });
    }
  }

  // ── Do negócio ──────────────────────────────────────────────────
  // §41: um cartão de trabalhador em branco não é estrutura declarada.
  const temEstrutura =
    (contexto.estrutura?.overheadMensal?.length ?? 0) > 0 ||
    temTrabalhadorValido(contexto.estrutura);

  // E se houver cartões por preencher, isso é um pressuposto por direito
  // próprio — não um silêncio.
  const vazios = (contexto.estrutura?.trabalhadores ?? []).filter(
    (t) => num(t.remuneracao?.salarioBaseMensal) <= 0,
  );
  if (vazios.length > 0) {
    lista.push({
      id: "trabalhador-por-preencher",
      rotulo: vazios.length === 1 ? "Um posto por preencher" : `${vazios.length} postos por preencher`,
      valor: "sem salário declarado",
      origem: "default",
      impacto: "alto",
      resolverEm: "trabalhadores",
      porque:
        "Um posto sem salário não entra em custo nenhum, mas ocupa uma linha no ecrã — e faz o modelo parecer mais completo do que está.",
    });
  }

  lista.push(...pressupostosDosPostos(contexto));

  if (!temEstrutura && !contexto.respondidos.includes("estrutura-sem-custos")) {
    lista.push({
      id: "estrutura-vazia",
      rotulo: "Custos de manter o negócio aberto",
      valor: "nenhum",
      origem: "default",
      impacto: "alto",
      resolverEm: "estrutura",
      porque:
        "Sem estrutura declarada, o ponto de equilíbrio é zero e o resultado é o melhor possível. Contabilidade, software, seguros e sede contam mesmo num mês sem vendas.",
    });
  }

  if (contexto.procura.modo !== "sazonal") {
    lista.push({
      id: "sazonalidade",
      rotulo: "Sazonalidade",
      valor: "uniforme ao longo do ano",
      origem: "default",
      impacto: "medio",
      resolverEm: "procura",
      porque:
        "Todos os meses iguais. Num negócio com época alta e época baixa, o mês fraco é o que decide se há dinheiro para pagar as contas.",
    });
  }

  if (!contexto.procura.crescimentoMensal) {
    lista.push({
      id: "crescimento",
      rotulo: "Crescimento",
      valor: "0% ao mês",
      origem: "default",
      impacto: "baixo",
      resolverEm: "procura",
      porque: "O cenário assume o mesmo volume todos os meses — nem arranque lento, nem bola de neve.",
    });
  }

  // §51 — o que a projeção de caixa ainda não modela, dito em voz alta.
  // Só interessa a quem liquida IVA: sem IVA cobrado, não há IVA
  // dedutível para faltar.
  if (contexto.caixa && a.ivaCobradoMes > 0) {
    lista.push({
      id: "iva-dedutivel",
      rotulo: "IVA dedutível das compras",
      valor: "fora da projeção de caixa",
      origem: "default",
      impacto: "medio",
      resolverEm: "caixa",
      porque:
        "O IVA que suportas nas compras é dedutível e não está nesta projeção. Na prática entregas menos do que aqui aparece — a projeção erra para o lado seguro, de propósito.",
    });
  }

  if (!contexto.caixa) {
    lista.push({
      id: "prazo-recebimento",
      rotulo: "Prazo de recebimento",
      valor: "imediato",
      origem: "default",
      impacto: "medio",
      resolverEm: "caixa",
      porque:
        "Assume-se que recebes no ato. Se faturas a 30 ou 60 dias, o lucro é o mesmo mas o dinheiro chega mais tarde — e é aí que os negócios rentáveis ficam sem caixa.",
    });
  }

  // ── A base declarada é trabalho da pessoa, mas não é «real» ─────
  //  §86: quem escreveu números vindos da contabilidade merece um nível de
  //  confiança superior a um exemplo nosso — e não merece que lhe
  //  chamemos «real» se ela escreveu uma estimativa. A proveniência diz o
  //  que sabemos: foi declarado.
  if ((contexto.base?.volumeAnual ?? 0) > 0) {
    lista.push({
      id: "base-declarada",
      rotulo: "Volume de negócios e custos da atividade",
      valor: `${fmt(contexto.base!.volumeAnual)}/ano, declarado por ti`,
      origem: "utilizador",
      impacto: "alto",
      resolverEm: "base",
      porque:
        "Estes números entraram em bloco, sem passar pelas ofertas. Servem para a estrutura e para a comparação, mas não dizem a que preço nem em que volume — e é isso que decide se o negócio aguenta um mês fraco.",
    });
  }

  if (contexto.fiscal.enquadramento === "nao_sei") {
    lista.push({
      id: "enquadramento",
      rotulo: "Forma de operar",
      valor: "ainda por decidir",
      origem: "utilizador",
      impacto: "alto",
      resolverEm: "comparar",
      porque:
        "Independente e sociedade pagam impostos diferentes sobre o mesmo lucro. A comparação usa o negócio que construíste, não números abstratos.",
    });
  }

  if (a.temFiscalidadeVendedor) {
    lista.push({
      id: "encargos-no-preco",
      rotulo: "Segurança Social e IRS",
      valor: `${fmt(a.encargosVendedorMes)}/mês, já dentro do preço`,
      origem: "derivado",
      impacto: "alto",
      resolverEm: "comparar",
      porque:
        "As ofertas têm fiscalidade de trabalhador independente. O resultado operacional é antes disso, para poder ser comparado com o de uma sociedade.",
    });
  }

  return lista.sort((x, y) => ORDEM[y.impacto] - ORDEM[x.impacto]);
}

const ORDEM: Record<PressupostoNegocio["impacto"], number> = { alto: 3, medio: 2, baixo: 1 };

/**
 * O que fica por saber em cada posto de trabalho. (§42)
 *
 * Cada um destes é um custo real que a conta não tem, ou um número que a
 * conta assumiu. O seguro de acidentes de trabalho é obrigatório desde o
 * primeiro dia e nós estimamo-lo; a medicina do trabalho é obrigatória e
 * fica a zero; o líquido depende de uma situação pessoal que ninguém
 * declarou. Sem esta lista, os três desapareciam num número só.
 */
function pressupostosDosPostos(contexto: ContextoNegocio): PressupostoNegocio[] {
  const lista: PressupostoNegocio[] = [];

  for (const { trabalhador: t, custo } of custosDosPostos(contexto.estrutura)) {
    const quem = t.funcao?.trim() || "posto sem nome";

    if (custo.estimado.calendarioPorConfirmar) {
      lista.push({
        id: `posto-calendario-${t.id}`,
        rotulo: `Subsídios de ${quem}`,
        valor: "fora da conta — calendário por confirmar",
        origem: "default",
        impacto: "alto",
        resolverEm: "trabalhadores",
        porque:
          "Este posto veio de uma versão anterior do projeto, em que os subsídios de férias e Natal não entravam no custo. São devidos por lei — confirma o calendário para a conta ficar certa.",
      });
    }

    if (custo.estimado.seguroAT) {
      lista.push({
        id: `posto-seguro-${t.id}`,
        rotulo: `Seguro de acidentes de trabalho de ${quem}`,
        valor: `${fmt(custo.empresa.seguroAT)}/ano, estimado`,
        origem: "default",
        impacto: "medio",
        resolverEm: "trabalhadores",
        porque:
          "É obrigatório desde o primeiro dia, mas o prémio depende da atividade e da seguradora. O valor na conta é uma estimativa de planeamento, não um prémio real.",
      });
    }

    if (custo.estimado.sst) {
      lista.push({
        id: `posto-sst-${t.id}`,
        rotulo: `Saúde e segurança no trabalho de ${quem}`,
        valor: "ainda sem orçamento",
        origem: "default",
        impacto: "medio",
        resolverEm: "trabalhadores",
        porque:
          "A medicina do trabalho é obrigatória e não está nesta conta. Enquanto não houver orçamento, o custo do posto está abaixo da verdade.",
      });
    }

    if (custo.estimado.liquidoPorEstimar) {
      lista.push({
        id: `posto-liquido-${t.id}`,
        rotulo: `Líquido de ${quem}`,
        valor: "não estimado",
        origem: "default",
        // Baixo para o NEGÓCIO — o custo da empresa não muda com isto —
        // e alto para quem quiser saber o que vai oferecer a alguém.
        impacto: "baixo",
        resolverEm: "trabalhadores",
        porque:
          "O líquido depende do estado civil, dos dependentes e da região de quem for contratado. Não inventamos nenhum: o custo da empresa está certo, o que a pessoa recebe é que fica por estimar.",
      });
    }

    if (num(t.contrato?.inicioMes) === 0) {
      lista.push({
        id: `posto-entrada-${t.id}`,
        rotulo: `Entrada de ${quem}`,
        valor: "desde o início",
        origem: "default",
        impacto: "medio",
        resolverEm: "trabalhadores",
        porque:
          "Assume-se que a pessoa está lá desde o primeiro mês. Contratar a meio do ano muda o custo do primeiro ano e a caixa dos meses anteriores.",
      });
    }
  }

  return lista;
}

/** Os que a pessoa confirmou — o outro lado do livro. */
export function confirmados(contexto: ContextoNegocio, a: AgregadoNegocio): PressupostoNegocio[] {
  const lista: PressupostoNegocio[] = [];

  for (const r of a.ofertas) {
    if (r.oferta.respondidos.length === 0) continue;
    lista.push({
      id: `preco-${r.oferta.id}`,
      rotulo: `Preço de ${r.oferta.nome}`,
      valor: fmt(r.preco.pvp),
      origem: "utilizador",
      impacto: "alto",
    });
    if (r.unidadesMes > 0) {
      lista.push({
        id: `vendas-${r.oferta.id}`,
        rotulo: `Vendas de ${r.oferta.nome}`,
        valor: `${r.unidadesMes} por mês`,
        origem: "utilizador",
        impacto: "alto",
      });
    }
  }

  for (const c of contexto.estrutura?.overheadMensal ?? []) {
    if (num(c.mensal) <= 0) continue;
    lista.push({
      id: `estrutura-${c.id}`,
      rotulo: c.rotulo,
      valor: `${fmt(c.mensal)}/mês`,
      origem: "utilizador",
      impacto: "medio",
    });
  }

  return lista;
}
