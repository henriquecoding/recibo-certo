import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import {
  AJUDAS_CUSTO,
  DEPRECIACAO,
  TA_AGRAVAMENTO_PREJUIZO,
  TA_AJUDAS_CUSTO,
  TA_ELETRICA_LIMITE_CUSTO,
  TA_VIATURAS_COMBUSTAO,
  TA_VIATURAS_ELETRICA,
  TA_VIATURAS_PHEV,
} from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026. As taxas de tributação autónoma vêm do
// motor (art. 88.º CIRC) e as depreciações do art. 34.º, n.º 1, al. e).
// O limite por quilómetro em viatura própria NÃO é publicado: é fixado
// por referência aos servidores do Estado e não foi possível confirmar a
// portaria em vigor nesta revisão.
export default function CorpoViaturaEmpresa() {
  return (
    <>
      <Seccao titulo="Três caminhos, e nenhum é o óbvio">
        <Paragrafo>
          Comprar pela empresa, fazer renting, ou usar a viatura pessoal e reembolsar quilómetros. A
          conversa costuma parar no primeiro, porque «deduz» — e é aí que falta metade da conta.
        </Paragrafo>
        <Paragrafo>
          Uma viatura na empresa deduz gastos, sim. E paga <strong>tributação autónoma</strong> sobre
          esses mesmos gastos, todos os anos, independentemente de haver lucro.
        </Paragrafo>
        <Nota titulo="A tributação autónoma não é imposto sobre o lucro">
          Paga-se mesmo em ano de prejuízo. É a característica que a torna tão diferente do resto do
          IRC — e a que faz com que a comparação com os quilómetros mude de sinal em empresas
          pequenas.
        </Nota>
      </Seccao>

      <Seccao titulo="As taxas, por escalão de custo de aquisição">
        <Paragrafo>
          · <strong>Combustão:</strong> {TA_VIATURAS_COMBUSTAO.value.ate37500 * 100}%,{" "}
          {String(TA_VIATURAS_COMBUSTAO.value.ate45000 * 100).replace(".", ",")}% e{" "}
          {String(TA_VIATURAS_COMBUSTAO.value.acima45000 * 100).replace(".", ",")}%, conforme o
          escalão.
          <br />· <strong>Híbridos plug-in:</strong>{" "}
          {String(TA_VIATURAS_PHEV.value.ate37500 * 100).replace(".", ",")}%,{" "}
          {String(TA_VIATURAS_PHEV.value.ate45000 * 100).replace(".", ",")}% e{" "}
          {String(TA_VIATURAS_PHEV.value.acima45000 * 100).replace(".", ",")}%.
          <br />· <strong>Elétricos:</strong>{" "}
          {pctExato(TA_VIATURAS_ELETRICA.value)} até ao custo de aquisição de{" "}
          {fmt(TA_ELETRICA_LIMITE_CUSTO.value)}.
        </Paragrafo>
        <AvisoPrazo titulo="Com prejuízo fiscal, as taxas sobem">
          Há um agravamento de {TA_AGRAVAMENTO_PREJUIZO.value * 100} pontos percentuais quando o
          exercício dá prejuízo. A viatura fica mais cara precisamente no ano em que a empresa menos
          pode.
        </AvisoPrazo>
        <VaiPara href="/guias/tributacao-autonoma">
          As restantes taxas do artigo 88.º, e o que também é tributado
        </VaiPara>
      </Seccao>

      <Seccao titulo="A depreciação tem teto">
        <Paragrafo>
          Não são aceites como gasto {DEPRECIACAO.naoDedutiveis.value}.
        </Paragrafo>
        <Paragrafo>
          Ou seja: acima do montante fixado por portaria, a parcela do custo da viatura{" "}
          <strong>nem sequer deprecia</strong>. Uma viatura cara é duplamente penalizada — deduz menos
          e paga autónoma mais alta.
        </Paragrafo>
        <Nota titulo="A regra abrange expressamente os elétricos">
          A alínea menciona-os. O elétrico tem taxa de autónoma mais baixa, mas o limite ao custo de
          aquisição não desaparece.
        </Nota>
      </Seccao>

      <Seccao titulo="A alternativa: a viatura é tua, a empresa reembolsa">
        <Paragrafo>
          Usar a viatura pessoal e receber por quilómetro percorrido evita a autónoma sobre a viatura,
          evita o teto da depreciação e evita o ativo no balanço.
        </Paragrafo>
        <Paragrafo>
          Tem, em contrapartida, um <strong>limite por quilómetro</strong>. Este guia não o publica: o
          valor é fixado por referência aos limites legais dos servidores do Estado e é atualizado por
          diploma, e não foi possível confirmar a portaria em vigor nesta revisão. Confirma-o antes de
          fixar a tabela interna da empresa.
        </Paragrafo>
        <AvisoPrazo titulo="E os quilómetros também podem pagar autónoma">
          À taxa de {pctExato(TA_AJUDAS_CUSTO.value)}, quando não sejam faturados a clientes nem
          tributados em IRS na esfera de quem os recebe. Faturá-los ao cliente, quando é possível,
          resolve a questão.
        </AvisoPrazo>
        <Paragrafo>
          A título de referência de grandeza para as deslocações, o limite diário isento de ajudas de
          custo em território nacional é de {fmt(AJUDAS_CUSTO.nacionalDia.value)}.
        </Paragrafo>
        <VaiPara href="/guias/ajudas-de-custo-km">
          Ajudas de custo e quilómetros, do lado de quem os recebe
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como se decide, com números em vez de opiniões">
        <Passos
          passos={[
            {
              titulo: "Estimar os quilómetros anuais em serviço, a sério",
              texto: "É a variável que decide. Abaixo de um certo volume, o reembolso por quilómetro ganha quase sempre; acima, a viatura da empresa começa a compensar.",
            },
            {
              titulo: "Somar TODOS os gastos da viatura da empresa",
              texto: "Depreciação, combustível, seguro, manutenção, portagens. A autónoma incide sobre os encargos, não só sobre a compra.",
            },
            {
              titulo: "Aplicar a autónoma do escalão certo",
              texto: "O escalão é o do custo de aquisição, não o do valor atual. Uma viatura cara comprada há cinco anos continua no escalão em que entrou.",
            },
            {
              titulo: "Testar o cenário de prejuízo",
              texto: "Se há hipótese razoável de um ano negativo, refaz a conta com o agravamento. É o cenário que costuma inverter a decisão.",
            },
            {
              titulo: "Verificar o que acontece ao IVA",
              texto: "A dedutibilidade do IVA das viaturas ligeiras de passageiros é limitada, com regras próprias por tipo de veículo e de utilização. Confirma-as antes de contar com ela.",
            },
            {
              titulo: "Decidir e documentar",
              texto: "Seja qual for o caminho, o que sustenta a decisão em inspeção é o registo: mapa de quilómetros, afetação, faturas em nome de quem suporta o encargo.",
            },
          ]}
        />
        <VaiPara href="/guias/amortizacoes-equipamento">
          Como se deprecia o resto do imobilizado
        </VaiPara>
        <VaiPara href="/guias/irc">
          Onde a autónoma entra no apuramento do imposto
        </VaiPara>
      </Seccao>

      <Seccao titulo="Renting e locação financeira">
        <Paragrafo>
          Não fogem à tributação autónoma. Ela incide sobre os <strong>encargos</strong> com viaturas
          ligeiras de passageiros, e as rendas de aluguer são encargos como os outros — o que muda é a
          forma do gasto, não a sua sujeição.
        </Paragrafo>
        <Paragrafo>
          O que muda a sério é o balanço e a tesouraria: o renting não capitaliza o ativo e converte a
          compra numa renda mensal previsível; a locação financeira aproxima-se da compra, com o ativo
          e a dívida reconhecidos.
        </Paragrafo>
        <Nota titulo="E o limite ao custo de aquisição não desaparece">
          A parcela da renda que corresponde à depreciação da viatura continua sujeita ao mesmo teto.
          Alugar uma viatura cara não contorna a regra.
        </Nota>
      </Seccao>

      <Seccao titulo="IVA: quando é dedutível">
        <Paragrafo>
          Na regra geral, o IVA das <strong>viaturas ligeiras de passageiros</strong> não é dedutível —
          nem o da aquisição, nem o dos encargos associados. É uma exclusão do próprio Código, não uma
          questão de afetação.
        </Paragrafo>
        <Paragrafo>
          Há exceções relevantes: viaturas destinadas a venda, a aluguer no exercício da atividade, ao
          transporte de mercadorias ou ao serviço público de transportes, e regras próprias para
          veículos elétricos até determinado limite de custo. Cada uma tem condições — confirma-as para
          o teu caso concreto.
        </Paragrafo>
        <AvisoPrazo titulo="É a diferença que mais pesa numa viatura cara">
          Numa compra, o IVA não dedutível soma-se ao custo de aquisição — e o custo de aquisição é
          precisamente o que determina o escalão da tributação autónoma. Um efeito puxa o outro.
        </AvisoPrazo>
        <VaiPara href="/guias/iva-recibos-verdes">
          Como funciona a dedução de IVA, no geral
        </VaiPara>
      </Seccao>

      <Seccao titulo="Elétricos e híbridos: o que muda mesmo">
        <Paragrafo>
          O elétrico tem a taxa de tributação autónoma mais baixa das três famílias, e mantém-na até um
          <strong> limite de custo de aquisição</strong>. Acima desse limite, a vantagem estreita-se.
        </Paragrafo>
        <Paragrafo>
          O híbrido plug-in ocupa o degrau intermédio, com condições próprias de autonomia elétrica e
          de emissões a verificar-se. Não basta o veículo ser híbrido: tem de cumprir os requisitos
          técnicos que a lei associa ao escalão.
        </Paragrafo>
        <Nota titulo="A escolha do veículo é, em boa parte, uma escolha fiscal">
          Entre dois veículos com preço semelhante, a diferença de tributação autónoma ao longo de
          cinco anos costuma superar a diferença de preço. É uma conta que se faz em minutos e quase
          nunca se faz.
        </Nota>
      </Seccao>
    </>
  );
}
