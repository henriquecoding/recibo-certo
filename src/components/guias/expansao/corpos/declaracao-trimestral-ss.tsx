import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { AJUSTE_BASE_SS, SS_COEFICIENTE, SS_ISENCAO_PRIMEIRO_ANO_MESES, SS_MIN_MENSAL, SS_TAXA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o Código dos Regimes Contributivos
// e a informação oficial da Segurança Social sobre trabalhadores
// independentes. Os valores vêm todos do motor.
//
// O pacote pede que se ligue explicitamente o ajuste ao efeito na proteção
// social — é a última secção, e atravessa o guia todo.
export default function CorpoDeclaracaoTrimestralSs() {
  return (
    <>
      <Seccao titulo="O que se declara e em que prazo">
        <Paragrafo>
          Todos os trimestres declaras o <strong>rendimento obtido</strong> nos três meses
          anteriores. Não é uma estimativa nem um adiantamento: é o que efetivamente recebeste, e é a
          partir dele que a Segurança Social apura o que vais pagar nos três meses seguintes.
        </Paragrafo>
        <Paragrafo>
          A entrega faz-se na Segurança Social Direta, em <strong>janeiro, abril, julho e
          outubro</strong>, relativa ao trimestre imediatamente anterior. O pagamento é mensal, até
          ao dia 20 de cada mês.
        </Paragrafo>
        <AvisoPrazo titulo="Declara-se mesmo com rendimento zero">
          Um trimestre sem faturação declara-se na mesma, com valor zero. Não declarar não é o mesmo
          que declarar zero — e a diferença aparece na secção sobre a falta de entrega.
        </AvisoPrazo>
        <Nota titulo="É o valor recebido, não o faturado">
          A declaração trimestral segue o dinheiro que entrou, ao contrário do IRS da categoria B,
          que segue a emissão da fatura. Uma fatura de dezembro paga em fevereiro conta no trimestre
          em que foi paga.
        </Nota>
      </Seccao>

      <Seccao titulo="Rendimento relevante e base de incidência">
        <Paragrafo>
          A contribuição não incide sobre tudo o que declaras. Aplica-se um coeficiente ao rendimento
          e é o resultado — a <strong>base de incidência</strong> — que suporta a taxa.
        </Paragrafo>
        <Paragrafo>
          Nas prestações de serviços, a base é{" "}
          <strong>{pctExato(SS_COEFICIENTE.servicos.value)}</strong> do rendimento. Na venda de bens,
          é <strong>{pctExato(SS_COEFICIENTE.bens.value)}</strong> — a diferença reflete o peso das
          compras num negócio de revenda.
        </Paragrafo>
        <Nota titulo="Guarda esta palavra: é a base que conta para tudo">
          A base de incidência não é só o que pagas. É a <strong>remuneração registada</strong> na
          tua carreira contributiva — a que vai determinar o subsídio de doença, o subsídio parental,
          o subsídio de desemprego e a pensão. Tudo neste guia volta a este ponto.
        </Nota>
      </Seccao>

      <Seccao titulo="A taxa contributiva">
        <Paragrafo>
          A taxa é de <strong>{pctExato(SS_TAXA.value)}</strong> sobre a base de incidência. Há um
          teto mensal, acima do qual não se paga mais, e há um <strong>mínimo</strong>: a
          contribuição mensal não desce abaixo de{" "}
          <strong>{fmt(SS_MIN_MENSAL.value)}</strong> — mesmo num trimestre sem faturação nenhuma.
        </Paragrafo>
        <Paragrafo>
          Os valores exatos, incluindo o teto, estão na tabela de dados aqui em baixo.
        </Paragrafo>
        <AvisoPrazo titulo="O mínimo existe mesmo sem rendimento">
          É a surpresa mais comum de quem tem um trimestre parado. A obrigação contributiva não
          depende de ter faturado — depende de ter atividade aberta. Quem parou mesmo deve ponderar
          cessar a atividade em vez de a manter aberta a zero.
        </AvisoPrazo>
        <VaiPara href="/guias/cessar-atividade">Como se cessa a atividade</VaiPara>
      </Seccao>

      <Seccao titulo="O ajuste voluntário da base, em degraus">
        <Paragrafo>
          Apurada a base de incidência, podes fazê-la variar em até{" "}
          <strong>±{pctExato(AJUSTE_BASE_SS.amplitude.value)}</strong>, em intervalos de{" "}
          <strong>{pctExato(AJUSTE_BASE_SS.degrau.value)}</strong>. É a única alavanca que tens sobre
          a tua contribuição.
        </Paragrafo>
        <Paragrafo>
          Para <strong>baixo</strong>, alivia a tesouraria num período difícil. Para{" "}
          <strong>cima</strong>, aumenta a proteção social — e é uma opção que quase ninguém usa,
          apesar de ser o instrumento mais direto que existe para melhorar a pensão futura de quem
          trabalha por conta própria.
        </Paragrafo>
        <Nota titulo="O ajuste faz-se na própria declaração, e vale para o trimestre">
          Não é um pedido separado nem uma decisão permanente: escolhe-se em cada declaração
          trimestral. O que decidires num trimestre não te prende no seguinte.
        </Nota>
      </Seccao>

      <Seccao titulo="O que o ajuste custa no futuro">
        <Paragrafo>
          Esta é a secção que este guia existe para escrever. Baixar a base de incidência{" "}
          <strong>não é um desconto: é uma troca</strong>. Poupas hoje, e recebes menos em todos os
          momentos em que vieres a precisar.
        </Paragrafo>
        <Paragrafo>
          · O <strong>subsídio de doença</strong> é uma percentagem da remuneração de referência —
          que sai da base declarada. Base mais baixa, baixa mais barata.
          <br />· O <strong>subsídio parental</strong> segue a mesma lógica, e os meses relevantes
          são anteriores ao nascimento: já não dá para corrigir quando a licença começa.
          <br />· O <strong>subsídio de desemprego</strong> parte da mesma referência.
          <br />· E a <strong>pensão</strong> forma-se sobre as remunerações registadas ao longo de
          toda a carreira. Cada trimestre em que baixaste fica lá, para sempre.
        </Paragrafo>
        <AvisoPrazo titulo="A poupança é imediata e visível; o custo é distante e invisível">
          É exatamente a estrutura que leva as pessoas a decidir mal. Baixar a base no máximo permitido
          poupa alguns euros por mês agora; essa mesma fração tira um pedaço da baixa médica que
          talvez precises daqui a dois anos, e da pensão que vais receber durante vinte.
        </AvisoPrazo>
        <VaiPara href="/guias/reforma-independentes">
          Como a base declarada se transforma em pensão
        </VaiPara>
        <VaiPara href="/guias/subsidio-doenca-independentes">
          O que a base declarada vale numa baixa médica
        </VaiPara>
      </Seccao>

      <Seccao titulo="Falta de entrega: consequências">
        <Passos
          passos={[
            {
              titulo: "A Segurança Social usa a última base conhecida",
              texto: "Não declarar não suspende a contribuição: mantém-se a última base apurada, que pode ser muito superior ao que faturaste no trimestre.",
            },
            {
              titulo: "A dívida acumula com juros",
              texto: "E a situação contributiva deixa de estar regularizada — o que fecha portas que só se notam quando se precisa delas.",
            },
            {
              titulo: "Perde-se o acesso a prestações",
              texto: "A situação contributiva regularizada é condição de atribuição de várias prestações, incluindo a parentalidade. Não é uma penalização: é um requisito.",
            },
            {
              titulo: "E bloqueiam-se apoios, concursos e contratos públicos",
              texto: "A declaração de situação regularizada é exigida em candidaturas a apoios e em contratação pública.",
            },
            {
              titulo: "Regularizar cedo é sempre mais barato",
              texto: "Entregar as declarações em falta e pedir plano prestacional resolve quase sempre — e resolve melhor antes de a dívida seguir para execução.",
            },
          ]}
        />
        <Nota titulo="Nos primeiros meses de atividade não há nada a pagar">
          A isenção do início de atividade dura{" "}
          {SS_ISENCAO_PRIMEIRO_ANO_MESES.value} meses — mas a{" "}
          <strong>declaração trimestral entrega-se na mesma</strong>. É durante a isenção que muita
          gente ganha o hábito de não declarar, e é aí que o problema começa.
        </Nota>
        <VaiPara href="/guias/isencao-contribuicoes-ss">
          As situações de isenção, e quando cessam
        </VaiPara>
        <VaiPara href="/guias/plano-prestacoes">Pagar em prestações</VaiPara>
      </Seccao>
    </>
  );
}
