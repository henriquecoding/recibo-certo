import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { CAPITAIS_TAXA_LIBERATORIA, DIVIDENDOS_ENGLOBAMENTO_FRACAO } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 5.º, 22.º, 40.º-A, 68.º, 71.º e 81.º do CIRS. O art. 40.º-A é o que
// o pacote mandava confirmar antes de publicar percentagens — está confirmado.
export default function CorpoDividendosIrs() {
  return (
    <>
      <Seccao titulo="O que é uma taxa liberatória">
        <Paragrafo>
          «Liberatória» quer dizer que <strong>liberta</strong>: o imposto é retido na fonte a
          título definitivo e o assunto fica fechado ali. Não há nada a acrescentar à declaração, e
          o valor que entrou na tua conta já é líquido.
        </Paragrafo>
        <Paragrafo>
          É diferente de uma retenção por conta, como a dos recibos verdes, que é um adiantamento a
          acertar no IRS do ano seguinte. Aqui não há acerto — a menos que peças um.
        </Paragrafo>
        <Nota titulo="É por isto que os dividendos não aparecem no pré-preenchido">
          Não é omissão nem isenção. O imposto foi retido e entregue pela entidade que pagou, e o
          rendimento não tem de ser englobado. A taxa está na tabela de dados aqui em baixo.
        </Nota>
      </Seccao>

      <Seccao titulo="O que muda quando englobas">
        <Paragrafo>
          Podes optar por juntar os dividendos aos restantes rendimentos e tributá-los pelos
          escalões progressivos. O que foi retido não se perde: passa a funcionar como pagamento
          por conta, deduzido à coleta.
        </Paragrafo>
        <Paragrafo>
          E há uma peça que muda a conta toda, e que quase nunca entra nas comparações: optando
          pelo englobamento, os lucros de sociedades sujeitas e não isentas de IRC são considerados
          em apenas <strong>{pctExato(DIVIDENDOS_ENGLOBAMENTO_FRACAO.value)} do seu valor</strong>.
        </Paragrafo>
        <Nota titulo="Não é um benefício — é uma correção">
          Chama-se <em>eliminação da dupla tributação económica</em>. Aquele lucro já pagou IRC na
          sociedade antes de chegar a ti; contá-lo por inteiro outra vez no teu IRS seria tributar
          o mesmo dinheiro duas vezes. Daí a metade.
        </Nota>
        <AvisoPrazo titulo="A metade tem condições de origem">
          Aplica-se quando a entidade que distribui tem sede ou direção efetiva em Portugal e o
          beneficiário reside cá — e, por extensão, a entidades residentes na União Europeia ou no
          Espaço Económico Europeu que preencham os requisitos da diretiva das sociedades-mães e
          afiliadas. Fora desse perímetro, o lucro engloba por inteiro.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O englobamento é uma decisão global, não seletiva">
        <Paragrafo>
          Esta é a regra que estraga a estratégia esperta. Quem exerce a opção fica{" "}
          <strong>obrigado a englobar a totalidade dos rendimentos da mesma categoria</strong>. Não
          se escolhe englobar o dividendo que dá jeito e deixar de fora os juros que não dão.
        </Paragrafo>
        <Paragrafo>
          É por isso que a decisão se toma com a fotografia do ano inteiro à frente, e não com um
          rendimento de cada vez.
        </Paragrafo>
        <VaiPara href="/guias/rendimentos-capitais-categoria-e">
          Os outros rendimentos que a opção arrasta consigo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Dividendos estrangeiros: a conta é outra">
        <Paragrafo>
          Quando quem paga é uma entidade não residente, não há retenção liberatória portuguesa —
          e portanto não há nada «fechado». O rendimento declara-se pelo{" "}
          <strong>bruto</strong>, no anexo do estrangeiro, com o país da fonte e o imposto lá
          retido.
        </Paragrafo>
        <Paragrafo>
          Esse imposto dá direito a crédito, limitado ao menor entre o que pagaste lá e a fração da
          coleta portuguesa correspondente àquele rendimento — e, havendo convenção, nunca acima do
          que ela permitia reter.
        </Paragrafo>
        <VaiPara href="/guias/credito-imposto-estrangeiro">
          O duplo limite do crédito, com o caso dos dividendos
        </VaiPara>
        <VaiPara href="/guias/corretoras-estrangeiras-irs">
          Como declarar o que vem de uma corretora lá fora
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quando compensa — e como testar">
        <Paragrafo>
          A regra prática é comparar a taxa liberatória com a <strong>taxa marginal</strong> que
          incidiria sobre metade do dividendo, se o englobasses. Como só metade conta, o
          englobamento aguenta escalões mais altos do que a intuição sugere — e é aí que a maioria
          das comparações caseiras erra, por esquecer a redução.
        </Paragrafo>
        <Paragrafo>
          Duas coisas a não esquecer no teste: a opção arrasta a categoria inteira, e o
          englobamento altera o rendimento coletável, o que pode mexer noutras deduções e no
          escalão dos restantes rendimentos.
        </Paragrafo>
        <VaiPara href="/ferramentas/simulador-irs">
          Testa as duas hipóteses com os teus números
        </VaiPara>
      </Seccao>

      <Seccao titulo="Onde se assinala a opção">
        <Paragrafo>
          No anexo dos rendimentos de capitais da declaração Modelo 3, num campo próprio de opção
          pelo englobamento — e no anexo do estrangeiro, quando o rendimento vier de fora.
        </Paragrafo>
        <Paragrafo>
          A opção exerce-se <strong>na declaração do ano</strong>. Não é uma escolha permanente:
          decide-se ano a ano, com os números daquele ano. E também não é uma escolha que se
          recupere fora de prazo — se for para mudar depois da entrega, o caminho é a declaração de
          substituição.
        </Paragrafo>
        <VaiPara href="/guias/escaloes-irs">Os escalões a que o englobamento te expõe</VaiPara>
      </Seccao>
    </>
  );
}
