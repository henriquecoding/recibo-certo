import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { CREDITO_IMPOSTO_ESTRANGEIRO } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 07/08/2026:
// art. 15.º, art. 16.º e art. 81.º (n.os 1, 2, 3, 9 e 10) do CIRS.
//
// O pacote avisa: «nunca generalizar taxas — cada convenção tem as suas.
// Ligar sempre à lista oficial da AT». O guia ensina a ler a convenção e não
// afirma um único número convencional: os limites de retenção são os do
// texto de cada uma, e é isso que se diz.
export default function CorpoConvencaoDuplaTributacao() {
  return (
    <>
      <Seccao titulo="O que uma convenção faz e o que não faz">
        <Paragrafo>
          Uma convenção <strong>não cria imposto</strong>. Não pode: os impostos criam-se por lei
          interna de cada Estado. O que ela faz é <strong>repartir o direito de tributar</strong>{" "}
          entre os dois países que a assinaram, rendimento a rendimento.
        </Paragrafo>
        <Paragrafo>
          A consequência prática é uma regra que resolve metade das dúvidas: se a lei interna de um
          país não tributa aquele rendimento, a convenção não o torna tributável. A convenção só
          limita — nunca acrescenta.
        </Paragrafo>
        <Nota titulo="Também não escolhe onde pagas menos">
          Ler a convenção não é escolher o país que cobra menos. É descobrir qual dos dois pode
          tributar, e com que teto — e depois aplicar a lei interna desse país, com as taxas dele.
        </Nota>
      </Seccao>

      <Seccao titulo="Onde encontrar a convenção do país em causa">
        <Paragrafo>
          A AT publica a lista das convenções em vigor com o texto integral de cada uma. É o único
          sítio onde se deve procurar: as convenções são bilaterais e{" "}
          <strong>cada uma é diferente</strong> — de um país para o outro mudam os limites de
          retenção, mudam as definições e mudam os artigos com números iguais.
        </Paragrafo>
        <Paragrafo>
          Há dois detalhes que fazem perder tempo a quem não os conhece. Primeiro, algumas convenções
          têm <strong>protocolos</strong> anexos que alteram o texto principal — e o protocolo é
          parte da convenção. Segundo, algumas foram modificadas pela{" "}
          <strong>convenção multilateral</strong> da OCDE, o que significa que o texto original já
          não é, sozinho, o texto aplicável.
        </Paragrafo>
        <AvisoPrazo titulo="A convenção com o país X não serve para o país Y">
          É o erro mais comum a seguir a não haver convenção nenhuma. Números lidos numa convenção
          aplicam-se àquele país e a mais nenhum. Não existe «a taxa das convenções».
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Os artigos que interessam por tipo de rendimento">
        <Paragrafo>
          As convenções seguem, quase todas, a mesma arrumação — a do modelo da OCDE. Saber a
          arrumação vale mais do que decorar números, porque é ela que se repete.
        </Paragrafo>
        <Paragrafo>
          · <strong>Residência</strong> — quem é residente de cada Estado, e a escada de desempate
          para quem é residente dos dois.
          <br />· <strong>Rendimentos imobiliários</strong> — tributáveis no Estado onde o imóvel
          está. Este é o mais estável de todos.
          <br />· <strong>Lucros das empresas</strong> — tributáveis no Estado de residência, salvo
          se houver estabelecimento estável no outro.
          <br />· <strong>Dividendos, juros e royalties</strong> — tributáveis nos dois, mas com um{" "}
          <em>teto</em> para o Estado da fonte. É aqui que vivem as taxas máximas.
          <br />· <strong>Mais-valias</strong> — regra geral no Estado de residência, com exceções
          para imóveis e para sociedades cujo valor assente em imóveis.
          <br />· <strong>Trabalho dependente</strong> — no Estado onde o trabalho é exercido, com a
          regra dos 183 dias a devolver a tributação ao Estado de residência em estadias curtas.
          <br />· <strong>Pensões</strong> — é o artigo que mais varia entre convenções, e o que mais
          decide a vida de quem se reforma noutro país.
          <br />· <strong>Eliminação da dupla tributação</strong> — o método que o Estado de
          residência usa: crédito ou isenção.
        </Paragrafo>
        <Nota titulo="A regra dos 183 dias da convenção não é a do art. 16.º">
          São coisas diferentes com o mesmo número. A do art. 16.º do CIRS decide se és residente em
          Portugal. A da convenção decide, para quem já se sabe residente de um Estado, se o outro
          pode tributar o trabalho lá exercido. Confundi-las leva a conclusões erradas nas duas
          pontas.
        </Nota>
        <VaiPara href="/guias/residencia-fiscal">
          Os critérios de residência da lei portuguesa
        </VaiPara>
      </Seccao>

      <Seccao titulo="Taxas máximas de retenção na fonte">
        <Paragrafo>
          Nos dividendos, juros e royalties, a convenção fixa um <strong>máximo</strong> que o Estado
          da fonte pode reter. Não é a taxa que se aplica: é o teto. Se a lei interna desse Estado
          previr menos, aplica-se o menos.
        </Paragrafo>
        <Paragrafo>
          Nos dividendos, muitas convenções têm <strong>dois tetos</strong>: um mais baixo para
          participações societárias qualificadas acima de certa percentagem, outro para os restantes
          casos. Quem lê só o primeiro número da linha aplica a si mesmo uma taxa que era para
          sociedades.
        </Paragrafo>
        <AvisoPrazo titulo="O teto não se aplica sozinho">
          Para a entidade que paga reter pelo limite da convenção, precisa de ter em mãos o
          formulário próprio com o certificado de residência fiscal. Sem isso retém pela taxa
          interna — e o excesso passa a ser um reembolso a pedir, não uma retenção evitada.
        </AvisoPrazo>
        <VaiPara href="/guias/modelo-21-rfi">
          O formulário e o certificado que ativam o limite da convenção
        </VaiPara>
      </Seccao>

      <Seccao titulo="Método do crédito vs. método da isenção">
        <Paragrafo>
          Repartido o direito de tributar, sobra a pergunta: o que faz o Estado de residência para
          não cobrar em cima do que o outro já cobrou? Há dois métodos, e a convenção diz qual.
        </Paragrafo>
        <Paragrafo>
          No <strong>método do crédito</strong>, o rendimento é tributado cá e desconta-se o imposto
          pago lá. O desconto tem dois limites: nunca mais do que{" "}
          {CREDITO_IMPOSTO_ESTRANGEIRO.duploLimite.value[0]}, nunca mais do que{" "}
          {CREDITO_IMPOSTO_ESTRANGEIRO.duploLimite.value[1]} — e, havendo convenção, nunca acima do
          que ela permitia reter. Se a coleta do ano não chegar, o remanescente reporta-se pelos anos
          que constam da tabela de dados aqui em baixo.
        </Paragrafo>
        <Paragrafo>
          No <strong>método da isenção com progressividade</strong>, o rendimento não é tributado
          cá — mas é <strong>obrigatoriamente englobado</strong> para determinar a taxa aplicável aos
          restantes. Não paga, mas empurra o resto para cima.
        </Paragrafo>
        <Nota titulo="E um caso em que não há crédito nenhum">
          Quando, por força da convenção, é o <em>Estado da fonte</em> que aplica o método do crédito
          de imposto, o titular não beneficia do crédito por dupla tributação internacional cá. É
          raro, é expresso na lei, e é o género de detalhe que só aparece quando se lê a convenção
          até ao fim.
        </Nota>
        <VaiPara href="/guias/credito-imposto-estrangeiro">
          O crédito passo a passo, com o duplo limite feito em números
        </VaiPara>
      </Seccao>

      <Seccao titulo="Estabelecimento estável: a armadilha de quem trabalha remoto">
        <Paragrafo>
          É o artigo que ninguém lê e o que mais problemas cria — não a ti, mas a quem te paga. Um{" "}
          <strong>estabelecimento estável</strong> é uma instalação fixa através da qual uma empresa
          exerce a sua atividade noutro país. Existindo, esse país pode tributar os lucros que lhe
          sejam imputáveis.
        </Paragrafo>
        <Paragrafo>
          O risco de quem trabalha remoto de Portugal para uma empresa estrangeira é o de a sua
          própria atividade cá vir a ser vista como um estabelecimento estável dessa empresa em
          Portugal — sobretudo quando o trabalho é continuado, feito de um local fixo, e mais ainda
          quando envolve <strong>negociar ou concluir contratos</strong> em nome dela.
        </Paragrafo>
        <AvisoPrazo titulo="A consequência recai sobre a empresa, e é ela que reage">
          Reconhecido um estabelecimento estável, a empresa passa a ter obrigações fiscais em
          Portugal. É por isto que muitas recusam contratar diretamente quem está cá e preferem
          prestação de serviços ou um intermediário — não é desconfiança, é gestão deste risco.
        </AvisoPrazo>
        <VaiPara href="/guias/remoto-empresa-estrangeira">
          As três estruturas possíveis, e o que cada uma custa
        </VaiPara>
        <VaiPara href="/guias/nao-residentes-irs">
          A taxa que a lei portuguesa aplica havendo estabelecimento estável
        </VaiPara>
      </Seccao>
    </>
  );
}
