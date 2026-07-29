import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IAS, SUBSIDIO_DESEMPREGO } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("subsidio-desemprego");

export default function SubsidioDesempregoPage() {
  const maximo = SUBSIDIO_DESEMPREGO.maximoIAS.value * IAS.value;

  return (
    <GuiaLayout slug="subsidio-desemprego">
      {/* Vem primeiro de propósito: é a secção que falta em quase todos os
          artigos sobre o tema, e é a razão n.º 1 de indeferimento. */}
      <Seccao titulo="Quem NÃO tem direito">
        <AvisoPrazo titulo="Quem se despede sem justa causa não recebe">
          A cessação tem de ser <strong>involuntária</strong>. Quem se despede por iniciativa própria
          sem justa causa não tem direito a subsídio de desemprego — e é a razão número um de
          indeferimento. A revogação por acordo tem regras próprias e nem sempre dá acesso.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O prazo de garantia">
        <Paragrafo>
          São precisos <strong>{SUBSIDIO_DESEMPREGO.prazoGarantiaDias.value} dias</strong> com
          registo de remunerações por trabalho por conta de outrem nos 24 meses imediatamente
          anteriores à data do desemprego.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Quanto recebes">
        <TabelaPrazos
          colunas={["Parâmetro", "Valor em 2026"]}
          linhas={[
            ["Montante", `${pct(SUBSIDIO_DESEMPREGO.taxa.value)} da remuneração de referência`],
            ["Máximo", `${SUBSIDIO_DESEMPREGO.maximoIAS.value.toLocaleString("pt-PT")} × IAS — ${fmt(maximo)}`],
            [
              "Limite adicional",
              `Nunca mais de ${pct(SUBSIDIO_DESEMPREGO.tetoReferenciaLiquida.value)} da remuneração de referência líquida de contribuições e IRS`,
            ],
            [
              "Duração",
              `Entre ${SUBSIDIO_DESEMPREGO.duracaoMinimaDias.value} e ${SUBSIDIO_DESEMPREGO.duracaoMaximaDias.value} dias, conforme a idade e a carreira contributiva`,
            ],
          ]}
        />
        <Nota titulo="O limite mínimo está em revisão">
          A lei fixa um limite mínimo indexado ao IAS, majorado quando as remunerações registadas não
          foram inferiores à retribuição mínima. As fontes secundárias divergem na leitura desse
          mínimo, por isso não fixamos aqui um número: confirma na Segurança Social Direta ou num
          atendimento antes de contar com um valor concreto.
        </Nota>
        <Paragrafo>
          A remuneração de referência é a média das remunerações dos 12 meses anteriores aos dois que
          precedem a data do desemprego.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O que fazer, e por que ordem">
        <Paragrafo>
          Pedir a declaração de situação de desemprego à entidade empregadora, inscrever-se no
          centro de emprego dentro do prazo e requerer o subsídio. O atraso na inscrição pode
          reduzir o período de concessão.
        </Paragrafo>
        <VaiPara href="/guias/fim-do-contrato">As contas finais do contrato</VaiPara>
        <VaiPara href="/guias/acumulacao-emprego">Acumular com trabalho independente</VaiPara>
        <VaiPara href="/?modo=comparar">Comparar cenários depois do desemprego</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
