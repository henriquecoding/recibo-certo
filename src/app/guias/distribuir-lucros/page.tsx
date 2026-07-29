import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DIVIDENDOS_TAXA, DIV_INCLUSAO_ENGLOBAMENTO, PRAZOS_ANUAIS_EMPRESA, RESERVA_LEGAL } from "@/lib/fiscal-data";
import { pct } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("distribuir-lucros");

export default function DistribuirLucrosPage() {
  return (
    <GuiaLayout slug="distribuir-lucros">
      <Seccao titulo="Antes de distribuir: a reserva legal">
        <AvisoPrazo titulo="Não é opcional">
          Pelo menos {pct(RESERVA_LEGAL.percentagemLucro.value)} do lucro do exercício é destinado à
          constituição da reserva legal, até esta atingir{" "}
          {pct(RESERVA_LEGAL.limiteCapital.value)} do capital social. Essa parte não é distribuível,
          e distribuí-la é uma distribuição ilícita.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Três destinos para o lucro">
        <TabelaPrazos
          colunas={["Via", "O que custa", "Quando compensa"]}
          linhas={[
            [
              "Taxa liberatória",
              `${pct(DIVIDENDOS_TAXA.value)}, retidos pela empresa`,
              "Quando a tua taxa marginal de IRS é alta. Não vai à Modelo 3.",
            ],
            [
              "Englobamento",
              `Entra por ${pct(DIV_INCLUSAO_ENGLOBAMENTO.value)} do valor, aos escalões`,
              "Quando a tua taxa marginal é baixa. Obriga a englobar TODOS os rendimentos da mesma categoria.",
            ],
            [
              "Não distribuir",
              "Só o IRC já pago",
              "Quando o dinheiro é para reinvestir ou reforçar os capitais próprios.",
            ],
          ]}
        />
        <Nota titulo="Não distribuir é uma decisão, não um adiamento">
          O lucro que fica na empresa foi tributado em IRC e mais nada. Se o objetivo é fazer
          crescer o negócio, deixá-lo lá dentro é frequentemente a via mais barata — e a leitura
          certa é a da riqueza total, não a do que entrou na conta pessoal este ano.
        </Nota>
      </Seccao>

      <Seccao titulo="A conta do englobamento">
        <Paragrafo>
          Optando pelo englobamento, os lucros distribuídos por entidades residentes são
          considerados em apenas {pct(DIV_INCLUSAO_ENGLOBAMENTO.value)} do seu valor. Isso significa
          que a taxa efetiva sobre o dividendo é metade da tua taxa marginal — o que compensa
          enquanto essa metade for inferior aos {pct(DIVIDENDOS_TAXA.value)} da liberatória.
        </Paragrafo>
        <AvisoPrazo titulo="O englobamento é tudo ou nada">
          Optar pelo englobamento numa categoria obriga a englobar todos os rendimentos dessa
          categoria no mesmo ano. Não se escolhe rendimento a rendimento.
        </AvisoPrazo>
        <VaiPara href="/ferramentas/simulador-irs">Comparar as duas vias no simulador de IRS</VaiPara>
      </Seccao>

      <Seccao titulo="O calendário">
        <TabelaPrazos
          colunas={["Passo", "Prazo"]}
          linhas={[
            ["Aprovação de contas do exercício", `Até ${PRAZOS_ANUAIS_EMPRESA.aprovacaoContas.value.split("-").reverse().join("/")}`],
            ["Deliberação de distribuição", "Na assembleia que aprova as contas, ou em assembleia posterior"],
            ["Retenção na fonte sobre os lucros", "Entregue até ao dia 20 do mês seguinte ao da colocação à disposição"],
          ]}
        />
        <VaiPara href="/guias/salario-gerente-ou-dividendos">Salário ou dividendos: a mistura</VaiPara>
        <VaiPara href="/guias/prejuizos-fiscais">E se o ano deu prejuízo</VaiPara>
        <VaiPara href="/guias/irc">Como funciona o IRC</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
