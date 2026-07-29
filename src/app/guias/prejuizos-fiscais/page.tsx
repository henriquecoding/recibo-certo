import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { PREJUIZOS_FISCAIS } from "@/lib/fiscal-data";
import { pct } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("prejuizos-fiscais");

export default function PrejuizosFiscaisPage() {
  return (
    <GuiaLayout slug="prejuizos-fiscais">
      <Seccao titulo="O prejuízo não se perde">
        <Paragrafo>
          O prejuízo fiscal de um ano abate ao lucro tributável dos anos seguintes. É o principal
          argumento a favor da sociedade nos primeiros anos de vida de um negócio: quem investe
          antes de faturar não perde esse investimento do ponto de vista fiscal.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Regra", "Valor"]}
          linhas={[
            ["Prazo para deduzir", "Sem limite temporal"],
            ["Teto anual", `${pct(PREJUIZOS_FISCAIS.limitePercentagemLucro.value)} do lucro tributável do ano`],
            ["A parte que excede o teto", "Mantém-se reportável para os anos seguintes"],
          ]}
        />
        <Nota titulo="O regime mudou em 2023">
          Antes eram 12 anos e 70% — e é isso que a maioria dos resultados de pesquisa ainda afirma.
          Hoje não há prazo, e o teto é de {pct(PREJUIZOS_FISCAIS.limitePercentagemLucro.value)}.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando a dedução pode cessar">
        <AvisoPrazo titulo="Mudança de dono acima de 50%">
          A dedução pode cessar quando se verifique a alteração da titularidade de mais de{" "}
          {pct(PREJUIZOS_FISCAIS.alteracaoTitularidadeLimite.value)} do capital social, salvo nas
          exceções previstas na lei e mediante autorização. É uma regra a ter presente em qualquer
          entrada de sócio ou venda de participação.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Prejuízo não significa imposto zero">
        <AvisoPrazo titulo="A tributação autónoma paga-se na mesma">
          Ter prejuízo não significa não ter imposto a pagar. A tributação autónoma incide sobre
          encargos específicos — viaturas, representação, despesas não documentadas — independentemente
          do resultado, e em ano de prejuízo é <strong>agravada</strong>.
        </AvisoPrazo>
        <VaiPara href="/guias/tributacao-autonoma">Como funciona a tributação autónoma</VaiPara>
      </Seccao>

      <Seccao titulo="O que preparar">
        <Paragrafo>
          O reporte faz-se na Modelo 22, com o mapa dos prejuízos por exercício. Manter esse mapa
          organizado desde o primeiro ano evita perder deduções por falta de rasto.
        </Paragrafo>
        <VaiPara href="/guias/modelo-22-e-ies">Onde se declara</VaiPara>
        <VaiPara href="/guias/distribuir-lucros">Quando voltar a haver lucro</VaiPara>
        <VaiPara href="/guias/irc">Como funciona o IRC</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
