"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A CONCLUSÃO — as seis camadas do `ResultadoExplicado`
//  ---------------------------------------------------------------------
//  Entra como CONCLUSÃO do estúdio e não como moldura dele, pela mesma
//  razão que a calculadora de preço tomou a mesma decisão: as seis
//  camadas são uma ORDEM de leitura, não um cartão único. O portefólio, a
//  estrutura e o cockpit são o trabalho; isto é o que se leva dele.
//
//  ── PORQUE É QUE OS CTAs NÃO SÃO ESCOLHIDOS AQUI ───────────────────
//  Porque o componente não aceita botões — aceita SINAIS, e é
//  `escolherRota()` que decide qual é a ação principal. Se cada ecrã
//  pudesse escolher os seus, a regra «nunca três ações com o mesmo peso»
//  duraria até à primeira semana com a receita abaixo do esperado.
//
//  ── E A PARTILHA ───────────────────────────────────────────────────
//  `plano_negocio` é a lista branca mais restrita da tabela. O bloco de
//  envio mostra campo a campo o que segue, ANTES de seguir — e nunca
//  verifica o plano: enviar ao contabilista da própria pessoa é grátis.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { fmt, pct } from "@/lib/format";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { APP_VERSION } from "@/lib/version";
import ResultadoExplicado, {
  type CenarioComparado,
  type Premissa,
} from "@/components/ui/ResultadoExplicado";
import { conteudoPartilhaNegocio } from "@/lib/negocio/adapters/contabilista";
import { sinaisDoNegocio } from "@/lib/negocio/adapters/routing";
import { EXPLICACAO_CONFIANCA } from "@/lib/negocio/viabilidade";
import { FERRAMENTA_NEGOCIO } from "./medicao";
import type { ContextoNegocio, ResultadoNegocio } from "@/lib/negocio/tipos";

const PERFIL: Record<string, string> = {
  nao_sei: "Forma jurídica ainda por decidir",
  independente: "Trabalhador independente",
  eni: "Empresário em nome individual",
  sociedade: "Sociedade",
};

export default function ConclusaoNegocio({
  negocio,
  contexto,
}: {
  negocio: ResultadoNegocio;
  contexto: ContextoNegocio;
}) {
  const sinais = useMemo(() => sinaisDoNegocio(negocio, contexto), [negocio, contexto]);
  const conteudo = useMemo(() => conteudoPartilhaNegocio(negocio, contexto), [negocio, contexto]);

  // ── 2. Como chegámos aqui ────────────────────────────────────────
  const premissas: Premissa[] = [
    {
      rotulo: "Ofertas",
      valor: `${negocio.ofertas.length}`,
      nota: negocio.ofertas.map((o) => o.oferta.nome).join(" · "),
    },
    {
      rotulo: "Receita mensal (sem IVA)",
      valor: fmt(negocio.receitaSemIVAMes),
      nota: "Preço líquido de cada oferta × volume esperado. O IVA fica de fora — nunca foi receita.",
    },
    {
      rotulo: "Custos variáveis",
      valor: fmt(negocio.custosVariaveisMes),
      nota: "O que só existe quando vendes: matéria-prima, comissões, portes, devoluções.",
    },
    {
      rotulo: "Estrutura",
      valor: fmt(negocio.overheadMes + negocio.custoTrabalhadoresMes),
      nota: "O que pagas mesmo num mês sem vendas, já com os encargos de quem está contratado.",
    },
  ];

  if (negocio.temFiscalidadeVendedor && negocio.encargosVendedorMes > 0) {
    premissas.push({
      rotulo: "Segurança Social e IRS",
      valor: `${fmt(negocio.encargosVendedorMes)}/mês`,
      nota: "Já dentro do preço das ofertas. O resultado operacional está ANTES disto, para poder ser comparado com o de uma sociedade.",
    });
  }

  // ── 4. Cenários ──────────────────────────────────────────────────
  const cenarios: CenarioComparado[] = [];
  if (negocio.sensibilidade) {
    for (const t of negocio.sensibilidade.tornado.slice(0, 3)) {
      cenarios.push({
        rotulo: `Se ${t.rotulo.toLowerCase()} correr mal`,
        valor: fmt(t.pior),
        diferenca: `${fmt(t.pior - negocio.sensibilidade.base)} face ao cenário atual`,
      });
    }
  }
  if (negocio.caixa && negocio.caixa.saldoMinimo < 0) {
    cenarios.push({
      rotulo: `Caixa em ${negocio.caixa.rotuloDoMesMinimo}`,
      valor: fmt(negocio.caixa.saldoMinimo),
      diferenca: `Precisas de cerca de ${fmt(
        negocio.caixa.capitalAdicionalNecessario,
      )} de folga para atravessar o período`,
    });
  }

  // ── 5. Limites ───────────────────────────────────────────────────
  const limites = [
    "Isto é um modelo do teu negócio, não uma previsão. Os volumes são estimativas tuas, e é delas que sai tudo o resto.",
    "A comparação entre independente e sociedade é de ordem de grandeza: não modela salário do gerente, tributação autónoma nem benefícios fiscais. O simulador de empresa faz isso.",
    "Não inclui a tua situação pessoal — dependentes, estado civil, outros rendimentos — que muda o IRS de forma material.",
  ];
  if (negocio.confianca !== "estruturado") {
    limites.unshift(
      `Faltam ${negocio.pressupostos.length} pressupostos por confirmar. Enquanto assim for, o número é uma estimativa sobre estimativas.`,
    );
  }
  if (!negocio.caixa) {
    limites.push(
      "Não projetámos a caixa. Um negócio pode ser lucrativo e ficar sem dinheiro antes de receber — vale a pena testar.",
    );
  }

  const equilibrio = negocio.breakEven;
  const acao = equilibrio.possivel
    ? {
        texto:
          equilibrio.folgaVendas >= 0
            ? `Confirmar que consegues mesmo ${equilibrio.vendasMes} vendas por mês — é a partir daí que a estrutura se paga.`
            : `Faltam ${Math.abs(equilibrio.folgaVendas)} vendas por mês para as contas fecharem. Ou sobe o preço, ou baixa a estrutura, ou aumenta o volume.`,
      }
    : undefined;

  return (
    <ResultadoExplicado
      titulo={
        negocio.resultadoOperacionalMes >= 0
          ? "As contas fecham neste cenário"
          : "Neste cenário as contas não fecham"
      }
      valor={`${fmt(negocio.resultadoOperacionalMes)}/mês`}
      perfil={PERFIL[contexto.fiscal.enquadramento] ?? "Negócio"}
      confianca={sinais.confianca}
      notaConfianca={EXPLICACAO_CONFIANCA[negocio.confianca]}
      premissas={premissas}
      formula="resultado = (preço líquido × volume) − custos variáveis − estrutura"
      arredondamento={`Margem de contribuição de ${pct(
        negocio.receitaSemIVAMes > 0 ? negocio.margemContribuicaoMes / negocio.receitaSemIVAMes : 0,
      )}. Os valores arredondam-se ao cêntimo na apresentação; os cálculos correm em precisão completa.`}
      versaoMotor={APP_VERSION}
      acao={acao}
      cenarios={cenarios.length > 0 ? cenarios : undefined}
      fontes={[
        {
          rotulo: `Parâmetros fiscais de ${FISCAL_YEAR}`,
          url: "/metodologia",
        },
        {
          rotulo: "Como formamos o preço de cada oferta",
          url: "/ferramentas/calcular-preco",
        },
        {
          rotulo: "Guia de abrir empresa — formas jurídicas e obrigações",
          url: "/guias/abrir-empresa",
        },
      ]}
      limites={limites}
      sinais={sinais}
      partilha={{ tipo: "plano_negocio", conteudo, toolId: FERRAMENTA_NEGOCIO }}
      // A prova nasce fechada: as premissas e as fontes valem várias
      // dobras em telemóvel, e são exatamente o que quase ninguém lê e
      // ninguém pode perder. O que decide fica aberto.
      provaRecolhida
    />
  );
}
