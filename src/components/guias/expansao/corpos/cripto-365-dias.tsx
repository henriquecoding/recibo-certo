import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { CRIPTO_ISENCAO_DIAS, MAIS_VALIAS_REPORTE } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// art. 10.º (n.º 1, al. k) e n.º 19), art. 43.º, art. 55.º (n.º 1, al. d),
// art. 57.º e art. 72.º do CIRS.
export default function CorpoCripto365Dias() {
  return (
    <>
      <Seccao titulo="O que conta como alienação">
        <Paragrafo>
          A categoria G passou a incluir expressamente a{" "}
          <strong>alienação onerosa de criptoativos que não constituam valores mobiliários</strong>.
          É a alínea k) do n.º 1 do art. 10.º, e é ela que traz a cripto para dentro das
          mais-valias.
        </Paragrafo>
        <Paragrafo>
          «Alienação onerosa» é mais do que vender por euros. Trocar um criptoativo por outro é
          alienar o primeiro; usar cripto para pagar bens ou serviços é alienar; converter para uma
          <em> stablecoin</em> é alienar. O que muda de mãos é o ativo, e é aí que o ganho se
          realiza — independentemente de o dinheiro nunca ter passado por uma conta bancária.
        </Paragrafo>
        <Nota titulo="Transferir entre carteiras tuas não é alienar">
          Mover o mesmo ativo entre carteiras ou exchanges de que és titular não realiza ganho
          nenhum. É movimento de custódia, não transmissão. Mas dá trabalho na prova: o histórico
          tem de deixar claro que a saída de um lado e a entrada do outro são a mesma coisa.
        </Nota>
      </Seccao>

      <Seccao titulo="A contagem dos 365 dias">
        <Paragrafo>
          É o eixo do regime. Os ganhos de criptoativos detidos por período{" "}
          <strong>igual ou superior a {CRIPTO_ISENCAO_DIAS.value} dias</strong> ficam excluídos de
          tributação; abaixo disso, entram na categoria G e são tributados à taxa que está na tabela
          de dados aqui em baixo, com opção de englobamento.
        </Paragrafo>
        <Paragrafo>
          A contagem é por <strong>unidade adquirida</strong>, não por posição. Quem foi comprando
          ao longo do tempo tem lotes com idades diferentes dentro da mesma carteira, e vender
          «metade da posição» não é uma operação — é a alienação de lotes concretos, cada um com a
          sua data de aquisição.
        </Paragrafo>
        <AvisoPrazo titulo="A exclusão não abrange tudo">
          A alínea k) fala de criptoativos <strong>que não constituam valores mobiliários</strong>.
          Um criptoativo que seja qualificável como valor mobiliário fica fora desta regra e segue o
          regime dos valores mobiliários — onde não há exclusão por tempo de detenção. E a exclusão
          também não se aplica a criptoativos emitidos por entidades em regime fiscal claramente
          mais favorável.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Isento mas declarável: porquê">
        <Paragrafo>
          Porque são duas obrigações diferentes. A <strong>exclusão de tributação</strong> diz que
          aquele ganho não entra no imposto. A <strong>obrigação declarativa</strong> diz que a
          operação tem de constar da declaração. Uma não dispensa a outra.
        </Paragrafo>
        <Paragrafo>
          E há uma razão prática para além da formal: é a declaração que estabelece a{" "}
          <strong>data de aquisição</strong> e o custo de cada lote. Quem só declara quando paga
          imposto fica sem historial — e no ano em que vender antes dos {CRIPTO_ISENCAO_DIAS.value}{" "}
          dias, terá de provar um custo de aquisição que nunca declarou.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Exchange nacional vs. estrangeira e o anexo que muda">
        <Paragrafo>
          O regime substantivo é o mesmo; o que muda é <em>onde</em> se declara. Operações através
          de entidade com sede em Portugal seguem o anexo das mais-valias; operações realizadas
          através de entidade não residente vão para o <strong>anexo do estrangeiro</strong>, com o
          país da fonte identificado.
        </Paragrafo>
        <Paragrafo>
          E a entidade estrangeira traz consigo a segunda obrigação: se a exchange tiver
          características de conta de depósito ou de títulos, entra também na{" "}
          <strong>identificação de contas no estrangeiro</strong>, que não depende de ter havido
          rendimento.
        </Paragrafo>
        <Nota titulo="Confirma os quadros no formulário do ano">
          A numeração dos quadros dos anexos de mais-valias e do estrangeiro muda com frequência.
          Trabalha pelo tipo de operação e confirma o mapeamento no formulário publicado pela AT
          para o ano em causa.
        </Nota>
        <VaiPara href="/guias/anexo-j">
          O anexo do estrangeiro e a obrigação de identificar contas
        </VaiPara>
      </Seccao>

      <Seccao titulo="Método de imputação e prova do custo">
        <Paragrafo>
          Quando se vendem unidades compradas em datas diferentes, é preciso saber{" "}
          <em>quais</em> foram vendidas — porque disso dependem o custo de aquisição e a contagem
          dos {CRIPTO_ISENCAO_DIAS.value} dias. A regra de imputação a aplicar é a do Código do
          IRS, e é matéria em que vale a pena confirmar o enquadramento antes de fechar a
          declaração.
        </Paragrafo>
        <Paragrafo>
          A prova é o problema prático maior. Guarda, por operação: data e hora, ativo, quantidade,
          preço unitário, contravalor em euros à data, comissões e a identificação da plataforma. As
          exchanges fecham, mudam de política de exportação e apagam histórico — o teu registo tem
          de sobreviver a isso.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Perdas: o que se aproveita">
        <Paragrafo>
          O que se tributa é o <strong>saldo</strong> entre mais-valias e menos-valias do mesmo ano.
          Um ano com uma venda boa e uma venda má compensa-se dentro do próprio ano, sem qualquer
          formalidade.
        </Paragrafo>
        <Paragrafo>
          Se o saldo do ano for negativo, pode transitar para os{" "}
          {MAIS_VALIAS_REPORTE.anos.value} anos seguintes — as operações com criptoativos estão
          entre as abrangidas pelo reporte. Mas há uma condição, e é a que mais se perde.
        </Paragrafo>
        <AvisoPrazo titulo="O reporte exige o englobamento no ano da perda">
          A lei permite reportar o saldo negativo <strong>quando o sujeito passivo opte, ou seja
          obrigado, a englobar esses rendimentos</strong>. Quem deixa correr a taxa especial por
          defeito no ano mau fica sem nada para abater no ano bom — e a opção não se recupera
          depois.
        </AvisoPrazo>
        <Paragrafo>
          Note-se o outro lado da mesma moeda: uma perda em cripto detida há mais de{" "}
          {CRIPTO_ISENCAO_DIAS.value} dias está do lado excluído do regime. A exclusão corta nos dois
          sentidos.
        </Paragrafo>
        <VaiPara href="/guias/reporte-menos-valias">
          Como funciona o reporte de perdas, ano a ano
        </VaiPara>
        <VaiPara href="/guias/cripto-staking-mining">
          Staking, mining e airdrops: receber não é vender
        </VaiPara>
        <VaiPara href="/guias/mais-valias">
          As mais-valias das outras classes de ativos
        </VaiPara>
      </Seccao>
    </>
  );
}
