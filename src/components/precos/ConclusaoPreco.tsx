"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A CONCLUSÃO — o `ResultadoExplicado` a ser mesmo usado
//  ---------------------------------------------------------------------
//  `ResultadoExplicado` é a componente que a skill de crescimento manda
//  usar («impõe as seis camadas»), e não era usada por NENHUMA das quinze
//  ferramentas. Uma regra que nada cumpre não é uma regra: é um ficheiro.
//
//  A razão pela qual ninguém a adotava era real, e não preguiça: recebe
//  props estáticas e o cabeçalho dela dá autoridade de resultado ao número
//  que lhe passarem. Numa ferramenta que recalcula a cada tecla e que
//  passou duas fases inteiras a distinguir «um exemplo» de «uma
//  recomendação», substituir o cartão por ela desfazia esse trabalho.
//
//  ── A RECONCILIAÇÃO ─────────────────────────────────────────────────
//  As seis camadas são uma ORDEM, não um cartão único. O cartão de preço
//  cumpre as camadas 1 e 4 à sua maneira — com o estado de preenchimento,
//  a faixa como escala e a decomposição do PVP. O que faltava mesmo eram
//  as camadas 2, 3, 5 e 6, e nenhuma delas existia em lado nenhum:
//
//    2 · como chegámos aqui   premissas, fórmula, versão do motor
//    3 · o que fazer          a ação temporal, com a frase que impede o
//                             mal-entendido mais caro possível
//    5 · fontes e limites     ← A LACUNA MAIS GRAVE. A ferramenta nunca
//                             dizia o que o cálculo NÃO cobre
//    6 · próximo passo        uma ação, escolhida por `escolherRota`
//
//  Por isso a componente entra como CONCLUSÃO do resultado, e não como
//  moldura dele. Nada do que as fases anteriores construíram se perde, e
//  a ferramenta passa a ser a primeira a cumprir a regra — o que a torna
//  o exemplo que as outras catorze podem seguir.
//
//  Nota técnica, porque o comentário da própria componente induz em erro:
//  ela não tem `"use client"`, mas isso não a impede de ser usada por uma
//  árvore de cliente — importa `EnviarAoContabilista`, que é cliente, e o
//  Next compila-a como cliente quando o pai o é. Continua a renderizar no
//  servidor para quem a importar de um Server Component.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import ResultadoExplicado, { type Premissa } from "@/components/ui/ResultadoExplicado";
import type { EstadoConfianca } from "@/lib/analytics/eventos";
import { APP_VERSION } from "@/lib/version";
import { fmt, pct } from "@/lib/format";
import {
  cenarioPorChave,
  REVISAO_PRICING,
  type ContextoPreco,
  type EstadoPreenchimento,
  type ResultadoPreco,
} from "@/lib/pricing";
import ContabilistasNoResultado from "@/components/diretorio/ContabilistasNoResultado";

const PERFIL: Record<string, string> = {
  ti: "Trabalhador independente",
  empresa: "Sociedade",
  particular: "Particular ou ocasional",
  nao_sei: "Enquadramento por definir",
};

export default function ConclusaoPreco({
  contexto,
  resultado,
  estado,
  faltam,
  children,
}: {
  contexto: ContextoPreco;
  resultado: ResultadoPreco;
  estado: EstadoPreenchimento;
  /** Quantos campos essenciais faltam. Entra na nota de confiança. */
  faltam: number;
  /** As ações locais (guardar, copiar, imprimir). */
  children?: ReactNode;
}) {
  const confianca: EstadoConfianca = estado === "completo" ? "completo" : "estimado";
  const confortavel = resultado.faixa.ancoras.find((a) => a.chave === "confortavel");

  return (
    <>
    <ResultadoExplicado
      titulo="O preço que as tuas contas aguentam"
      valor={fmt(resultado.pvp)}
      // A regra do projeto — «nunca devolver um número sem faixa» — tem
      // aqui a sua forma canónica: o resultado É um intervalo, e a
      // componente sabe apresentá-lo como tal.
      valorMaximo={confortavel && confortavel.pvp > resultado.pvp ? fmt(confortavel.pvp) : undefined}
      perfil={PERFIL[contexto.vendedor.tipo] ?? PERFIL.nao_sei}
      confianca={confianca}
      notaConfianca={notaDeConfianca(estado, faltam)}
      premissas={premissasDe(contexto, resultado)}
      formula={formulaDe(resultado)}
      arredondamento="Preço líquido, IVA e PVP arredondados em conjunto, ao cêntimo"
      versaoMotor={APP_VERSION}
      acao={acaoDe(resultado)}
      // ── SEM `cenarios` ─────────────────────────────────────────────
      //  `cenariosDe()` mapeava `faixa.ancoras` — piso, mínimo,
      //  recomendado e confortável. São exatamente os quatro preços que a
      //  régua do `ResultadoPreco` já desenha, com explicação, mais acima
      //  no ecrã. Repeti-los aqui era mostrar os mesmos números duas
      //  vezes, e ainda por cima sob o título «E se mudasses uma coisa» —
      //  que é o título da OUTRA secção, a dos cenários a sério
      //  (`compararCenarios`). Quem chegava aqui via o mesmo cabeçalho
      //  pela segunda vez com conteúdo diferente.
      //
      //  Nada se perdeu: as âncoras continuam na régua, melhor
      //  apresentadas. Valia ~300 px no estado completo.
      fontes={FONTES}
      limites={limitesDe(contexto, resultado)}
      // A prova nasce fechada aqui — e só aqui. Ver o comentário de
      // `provaRecolhida` em `ResultadoExplicado`.
      provaRecolhida
      sinais={{
        confianca,
        temResultado: resultado.ok,
        enquadramento:
          contexto.vendedor.tipo === "ti"
            ? "independente"
            : contexto.vendedor.tipo === "empresa"
              ? "sociedade"
              : "desconhecido",
        contabilidadeOrganizada: contexto.vendedor.regimeContabilidade === "organizada",
      }}
    >
      {children}
    </ResultadoExplicado>

    {/* Fora do cartão do resultado e logo a seguir a ele: um preço que não
        fecha, um limiar de isenção de IVA à porta ou uma sociedade a
        considerar são exatamente os casos que se levam a alguém. */}
    <ContabilistasNoResultado />
    </>
  );
}

// ─── As camadas, derivadas do resultado ────────────────────────────────

function notaDeConfianca(estado: EstadoPreenchimento, faltam: number): string | undefined {
  if (estado === "completo") return undefined;
  if (estado === "exemplo") {
    return "Ainda não nos disseste nada sobre o teu caso: este número sai dos valores de partida do cenário, não do teu negócio.";
  }
  return faltam === 1
    ? "Falta uma resposta do essencial, e estamos a assumi-la por ti. Enquanto for nossa e não tua, é uma estimativa."
    : `Faltam ${faltam} respostas do essencial, e estamos a assumi-las por ti. Enquanto forem nossas e não tuas, é uma estimativa.`;
}

function premissasDe(c: ContextoPreco, r: ResultadoPreco): Premissa[] {
  const p: Premissa[] = [
    { rotulo: "O que estás a precificar", valor: cenarioPorChave(c.cenario).rotulo.toLowerCase() },
    { rotulo: "Custo por unidade", valor: fmt(r.custo.direto), nota: custoNota(r) },
    { rotulo: "Vendas por mês", valor: `${c.volume.unidadesMes}` },
    {
      rotulo: "Objetivo",
      valor:
        c.objetivo.modo === "markup"
          ? `${pct(c.objetivo.percentagem ?? 0)} de markup`
          : c.objetivo.modo === "lucro_mensal"
            ? `${fmt(c.objetivo.valor ?? 0)} por mês`
            : c.objetivo.modo === "preco_fixo"
              ? `preço fixado em ${fmt(c.objetivo.valor ?? 0)}`
              : `${pct(c.objetivo.percentagem ?? 0)} de margem`,
    },
    {
      rotulo: "IVA da venda",
      valor: r.taxaIVA > 0 ? pct(r.taxaIVA) : "isento",
      nota: r.taxaIVA > 0 ? undefined : "Não liquidas IVA — e também não o deduzes nas compras.",
    },
  ];

  if (r.custo.fixosPorUnidade > 0) {
    p.push({
      rotulo: "Contas fixas por unidade",
      valor: fmt(r.custo.fixosPorUnidade),
      nota: "Ao volume que declaraste. Menos vendas sobem esta quota.",
    });
  }

  if (r.fiscal.aplicavel) {
    p.push({
      rotulo: "Segurança Social e IRS",
      valor: pct(r.fiscal.ssFracao + r.fiscal.irsFracao),
      nota:
        r.fiscal.irsBase === "lucro"
          ? "O IRS incide sobre o lucro — contabilidade organizada."
          : "Incidem sobre a faturação, dê a venda lucro ou não.",
    });
  }

  return p;
}

function custoNota(r: ResultadoPreco): string | undefined {
  if (Math.abs(r.custo.direto - r.custo.diretoIntroduzido) < 0.005) return undefined;
  return `Introduziste ${fmt(r.custo.diretoIntroduzido)}; o custo real é este depois de IVA dedutível e desperdício.`;
}

function formulaDe(r: ResultadoPreco): string {
  const disponivel = pct(r.diagnostico.disponivel);
  return `preço líquido = (custos + taxas fixas) ÷ (${disponivel} disponível − margem pedida)  ·  PVP = preço líquido × (1 + IVA)`;
}

/**
 * A ação temporal.
 *
 * A componente é explícita em «nunca apresentada como obrigação já
 * cumprida», e por isso a frase que a acompanha — «nada foi submetido» —
 * é imposta pela própria componente e não por esta ferramenta.
 */
function acaoDe(r: ResultadoPreco) {
  if (!r.tesouraria || r.tesouraria.reservaMensal <= 0) return undefined;
  const proximo = r.tesouraria.proximos.find((l) => l.valor !== null);
  return {
    texto: `Guardar ${fmt(r.tesouraria.reservaMensal)} por mês para impostos`,
    prazo: proximo
      ? `O próximo pagamento é ${proximo.titulo.toLowerCase()}, a ${new Date(`${proximo.data}T00:00:00`).toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}.`
      : undefined,
  };
}

// `cenariosDe()` foi apagado, e não comentado: mapeava `faixa.ancoras`
// para a lista de cenários da conclusão, que duplicava a régua do
// `ResultadoPreco`. Ver a nota na chamada acima.

const FONTES = [
  {
    rotulo: "Taxas de IVA e isenção do Art. 53.º — Código do IVA",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx",
  },
  {
    rotulo: "Coeficientes do regime simplificado — Art. 31.º do CIRS",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs31.aspx",
  },
  {
    rotulo: "Contribuições do trabalhador independente — Código Contributivo",
    url: "https://www.seg-social.pt",
  },
] as const;

/**
 * O que este cálculo NÃO cobre.
 *
 * Era a lacuna mais grave da ferramenta: dizia com precisão o que fazia e
 * nunca dizia onde parava. Um limite por dizer é uma promessa implícita —
 * e a promessa implícita de uma calculadora fiscal é sempre «isto está
 * completo».
 *
 * Alguns são condicionais de propósito: listar o IRS a quem não é
 * trabalhador independente enche a caixa de coisas que não lhe dizem
 * respeito, e uma lista que não se lê não protege ninguém.
 */
function limitesDe(c: ContextoPreco, r: ResultadoPreco): string[] {
  const l: string[] = [
    "Mostra o que as contas aguentam, não o que o mercado aceita. Não sabemos o preço da tua concorrência.",
  ];

  if (r.fiscal.aplicavel) {
    l.push(
      "O IRS é uma taxa marginal estimada a partir da faturação que indicaste. A liquidação real depende do ano inteiro, das deduções e do agregado familiar.",
    );
  }

  if (c.vendedor.tipo === "empresa") {
    l.push(
      "A projeção da sociedade assume um ano completo ao volume declarado e não cobre prejuízos transitados nem benefícios fiscais.",
    );
  }

  if (c.custos.fixos.length === 0) {
    l.push("Não declaraste custos fixos, por isso o preço mínimo não cobre renda, contabilidade nem software.");
  }

  if (!c.vendedor.faturacaoAnualPrevista) {
    l.push("Sem a faturação anual prevista, não conseguimos avisar-te de quando passas o limiar de isenção de IVA.");
  }

  l.push(
    `Comissões de canal e taxas de pagamento são preçários de terceiros, verificados a ${new Date(REVISAO_PRICING).toLocaleDateString("pt-PT")}. Confirma no teu contrato.`,
  );

  return l;
}
