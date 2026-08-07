import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { ICE } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o art. 43.º-D do EBF no articulado
// do Portal das Finanças, na redação da Lei n.º 45-A/2024 — que revogou o
// n.º 2 e, com ele, a majoração do spread por dimensão da empresa.
export default function CorpoIceCapitalizacao() {
  return (
    <>
      <Seccao titulo="O que o ICE premeia">
        <Paragrafo>
          O ICE deduz ao <strong>lucro tributável</strong> — e não à coleta — uma importância
          calculada sobre os <strong>aumentos líquidos dos capitais próprios elegíveis</strong>.
        </Paragrafo>
        <Paragrafo>
          Traduzido: recompensa quem deixa dinheiro dentro da empresa. Lucros aplicados em resultados
          transitados ou em reservas, entradas em dinheiro no capital, prémios de emissão, conversão
          de créditos em capital — tudo isso conta.
        </Paragrafo>
        <Nota titulo="Substituiu a DLRR, e não é a mesma coisa">
          A dedução por lucros retidos e reinvestidos foi revogada com efeitos a 2023. O ICE não exige
          reinvestimento em ativos: exige que o capital próprio suba e lá fique.
        </Nota>
      </Seccao>

      <Seccao titulo="A taxa, e porque é que não a podemos publicar">
        <Paragrafo>
          A dedução corresponde à <strong>Euribor a 12 meses</strong> — a média do período de
          tributação, calculada com base no último dia de cada mês — adicionada de um{" "}
          <strong>spread de {ICE.spread.value * 100} pontos percentuais</strong>.
        </Paragrafo>
        <Paragrafo>
          A parte fixa é o spread. A outra depende de um índice que só se conhece no fim do período,
          e por isso não há aqui uma percentagem para copiar: há uma fórmula, e a fórmula é a
          resposta.
        </Paragrafo>
        <AvisoPrazo titulo="O spread deixou de variar com a dimensão da empresa">
          Havia uma majoração para PME e empresas de pequena-média capitalização, no n.º 2 do artigo.
          Esse número foi <strong>revogado</strong>. Textos que ainda distingam dois spreads estão
          desatualizados.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Os dois limites — e a palavra que muda tudo">
        <Paragrafo>
          A dedução não pode exceder, em cada período, o <strong>maior</strong> de dois limites:{" "}
          <strong>{fmt(ICE.limiteAbsoluto.value)}</strong> ou{" "}
          <strong>{pctExato(ICE.limiteEbitda.value)}</strong> do resultado antes de depreciações,
          amortizações, gastos de financiamento líquidos e impostos.
        </Paragrafo>
        <Paragrafo>
          Repara na palavra <em>maior</em>. Não é o menor dos dois, como acontece em quase todos os
          outros regimes com duplo limite — e é por isso que ler isto depressa dá o resultado ao
          contrário.
        </Paragrafo>
        <Nota titulo="E o que exceder não se perde">
          A parte que ultrapasse o limite do resultado é dedutível em{" "}
          {ICE.reporteAnos.value} períodos de tributação posteriores.
        </Nota>
      </Seccao>

      <Seccao titulo="Líquidos: distribuir apaga o que se acumulou">
        <Paragrafo>
          O apuramento faz-se pelo somatório do próprio exercício e de cada um dos{" "}
          <strong>{ICE.periodosAnteriores.value} períodos anteriores</strong> — e do lado negativo
          entram as <strong>saídas a favor dos titulares</strong>: reduções de capital, partilhas do
          património, distribuições de reservas ou de resultados transitados.
        </Paragrafo>
        <Paragrafo>
          É a mecânica que mais surpreende: uma distribuição de dividendos num ano corta o benefício
          acumulado nos anos anteriores. Resultando do somatório uma diferença negativa,{" "}
          <strong>considera-se zero</strong> — não gera dedução negativa, mas também não deixa nada
          para deduzir.
        </Paragrafo>
        <AvisoPrazo titulo="A decisão de distribuir passa a ter um preço fiscal">
          Não é um argumento para nunca distribuir. É um número a pôr do outro lado da conta quando se
          decide quanto distribuir, e em que ano.
        </AvisoPrazo>
        <VaiPara href="/guias/distribuir-lucros">
          Distribuir ou reter: a decisão vista do outro lado
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quem pode, e a partir de quando">
        <Passos
          passos={[
            {
              titulo: "Exercer, a título principal, atividade comercial, industrial ou agrícola",
              texto: "É o primeiro filtro do artigo, e deixa de fora entidades cuja atividade principal seja outra.",
            },
            {
              titulo: "Não estar sujeito à supervisão do Banco de Portugal ou da ASF",
              texto: "Instituições de crédito, outras instituições financeiras e seguradoras estão excluídas, incluindo sucursais em Portugal.",
            },
            {
              titulo: `Cumprir as condições formais: ${ICE.exigeSituacaoRegularizada.value}`,
              texto: "São cumulativas. Falhar uma chega para não haver benefício nenhum.",
            },
            {
              titulo: `Contar apenas aumentos de ${ICE.primeiroPeriodoElegivel.value}`,
              texto: "Capital próprio acumulado antes disso não entra — o regime começou do zero.",
            },
            {
              titulo: "Não financiar o aumento com dinheiro que veio da própria empresa",
              texto: "O artigo exclui entradas financiadas por aumentos de capital próprio noutra entidade, e presume o mesmo quando há mútuos entre entidades relacionadas nos seis períodos anteriores.",
            },
            {
              titulo: "Levar o apuramento a um contabilista certificado",
              texto: "Este é o benefício desta secção que menos se resolve sozinho: depende de saldos de capital próprio de sete períodos e de um EBITDA fiscal apurado nos termos do art. 67.º do CIRC.",
            },
          ]}
        />
        <VaiPara href="/guias/suprimentos-prestacoes-suplementares">
          Suprimentos ou prestações suplementares: só uma delas conta aqui
        </VaiPara>
        <VaiPara href="/guias/irc">
          O lucro tributável a que esta dedução se aplica
        </VaiPara>
      </Seccao>

      <Seccao titulo="Cumulação com outros benefícios">
        <Paragrafo>
          O ICE deduz ao <strong>lucro tributável</strong>, e não à coleta. Isso põe-no num degrau
          diferente do SIFIDE e do RFAI, que deduzem à coleta — e é por isso que podem coexistir no
          mesmo exercício sem competirem pelo mesmo limite.
        </Paragrafo>
        <Paragrafo>
          A ordem importa: primeiro apura-se o lucro tributável, já com a dedução do ICE; depois
          aplica-se a taxa; e só então entram as deduções à coleta. Um ICE alto reduz a coleta
          disponível para as outras deduções — que se reportam, mas mais tarde.
        </Paragrafo>
        <Nota titulo="É por isso que a ordem se planeia">
          Em anos de coleta apertada, saber que os créditos de SIFIDE e de RFAI se reportam permite
          usar o ICE sem receio de estar a desperdiçar os outros.
        </Nota>
        <VaiPara href="/guias/sifide">
          O benefício que deduz à coleta, do lado da investigação
        </VaiPara>
      </Seccao>
    </>
  );
}
