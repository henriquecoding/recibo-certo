"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «VAMOS PARTIR DO QUE JÁ EXISTE» — o atalho de quem já fatura
//  ---------------------------------------------------------------------
//  §5-6 do relatório. A porta «Já tenho empresa» prometia saltar para a
//  estrutura e a comparação — e entregava um contexto vazio: sem ofertas
//  não havia receita, sem receita não abria comparação, caixa nem
//  conclusão. A promessa era verdadeira na copy e falsa no ecrã.
//
//  Quem trabalha a partir da contabilidade tem dois números na cabeça e
//  não tem paciência para reconstruir o negócio oferta a oferta só para
//  poder responder a uma pergunta de estrutura. §117: «não obrigar a
//  criar ofertas se a pessoa já trabalha a partir da contabilidade».
//
//  ── A FRONTEIRA QUE ESTE ECRÃ TEM DE TORNAR ÓBVIA ──────────────────
//  «Custos da atividade» ≠ «estrutura». Se as duas coisas entrarem no
//  mesmo campo, o overhead conta duas vezes — no resultado E no handoff
//  para o simulador de empresa. A descrição do campo di-lo em voz alta,
//  porque a dupla contagem não dá sinal nenhum: o número continua
//  plausível.
//
//  ── E A PORTA CONTINUA ABERTA PARA O OUTRO LADO ────────────────────
//  «Construir a partir das minhas ofertas» está aqui, ao lado. Declarar
//  em bloco não fecha o percurso detalhado — soma-se-lhe.
// ═══════════════════════════════════════════════════════════════════════

import { fmt } from "@/lib/format";
import { IVA_TAXAS, META_REGIAO, type Regiao } from "@/lib/fiscal-data";
import { CampoEuros, Segmentado } from "@/components/precos/atomos";
import { Plus } from "@/components/ui/Icons";
import { agregarBase } from "@/lib/negocio/agregar";
import type { BaseDeclarada } from "@/lib/negocio/tipos";
import { BotaoSecundario, Cartao } from "./atomos";

export default function BaseNegocioEditor({
  base,
  regiao,
  temOfertas,
  aoMudar,
  aoAdicionarOferta,
}: {
  base: BaseDeclarada | undefined;
  regiao: Regiao | undefined;
  temOfertas: boolean;
  aoMudar: (patch: Partial<BaseDeclarada>) => void;
  aoAdicionarOferta: () => void;
}) {
  const volume = base?.volumeAnual ?? 0;
  const custos = base?.custosAtividadeAno ?? 0;
  const comIVA = base?.comIVA ?? false;
  const nomeRegiao = META_REGIAO[regiao ?? "continente"];
  const taxaFmt = `${(IVA_TAXAS[regiao ?? "continente"].value.normal * 100).toLocaleString("pt-PT")}%`;

  // A MESMA função que o agregador usa. Um segundo cálculo aqui era a
  // maneira mais fácil de este resumo e o resultado divergirem no dia em
  // que a regra do IVA mudasse num só dos dois sítios.
  const agregado = agregarBase(base, regiao);
  const margemMes = agregado.receitaSemIVAMes - agregado.custosVariaveisMes;

  return (
    <Cartao
      titulo="Vamos partir do que já existe"
      descricao="Dois números da tua contabilidade chegam para abrir a estrutura, a caixa e a comparação"
      id="base"
      acao={
        <BotaoSecundario onClick={aoAdicionarOferta}>
          <Plus size={14} />
          {temOfertas ? "Outra oferta" : "Construir a partir das ofertas"}
        </BotaoSecundario>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CampoEuros
          id="base-volume"
          rotulo="Volume de negócios anual"
          descricao="O que faturaste no último ano completo, ou o que esperas faturar neste."
          valor={volume}
          aoMudar={(v) => aoMudar({ volumeAnual: v })}
          max={100_000_000}
        />
        <Segmentado
          id="base-com-iva"
          rotulo="Esse valor inclui IVA?"
          descricao={
            comIVA
              ? `Convertemos à taxa normal de ${nomeRegiao} (${taxaFmt}). O IVA nunca foi receita — é do Estado, a passar pela tua conta.`
              : "É o volume de negócios: o que a AT considera receita."
          }
          opcoes={[
            { valor: "nao", rotulo: "Sem IVA" },
            { valor: "sim", rotulo: "Com IVA" },
          ]}
          valor={comIVA ? "sim" : "nao"}
          aoMudar={(v) => aoMudar({ comIVA: v === "sim" })}
        />
      </div>

      <div className="mt-3">
        <CampoEuros
          id="base-custos"
          rotulo="Custos da atividade por ano"
          descricao="Fornecedores, matérias-primas, subcontratos, comissões — o que anda com a faturação."
          ajuda="A estrutura (contabilidade, software, sede, seguros) e o pessoal declaram-se logo a seguir, e não entram aqui. Somar as duas coisas no mesmo campo faria a estrutura contar duas vezes — no resultado e em tudo o que dele sai."
          valor={custos}
          aoMudar={(v) => aoMudar({ custosAtividadeAno: v })}
          max={100_000_000}
        />
      </div>

      {volume > 0 ? (
        <p className="mt-3 border-t border-stone-100 pt-3 text-sm leading-relaxed text-stone-700 dark:border-stone-800 dark:text-stone-200">
          Margem da atividade:{" "}
          <strong className="tabular-nums">{fmt(margemMes)}</strong> por mês, antes da estrutura.
        </p>
      ) : null}

      <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
        Estes números entram como declarados por ti. Servem para a estrutura, a caixa e a comparação — mas não dizem a
        que preço nem em que volume, e é isso que decide se o negócio aguenta um mês fraco. Uma oferta modelada responde
        a essa parte.
      </p>
    </Cartao>
  );
}
