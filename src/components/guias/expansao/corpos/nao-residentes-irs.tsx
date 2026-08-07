import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { NAO_RESIDENTES } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado contra o articulado no Portal das Finanças a 07/08/2026:
// art. 15.º, art. 71.º (n.os 1, 4, 5, 8 e 11 a 13) e art. 72.º (n.os 1, 6,
// 15 e 16) do CIRS.
//
// O pacote avisa: «não afirmar uma taxa única de 25% sem qualificar a
// categoria». Confirma-se, e fica curto — não há uma taxa, há várias, e há
// duas saídas que devolvem as progressivas a quem reside na UE ou no EEE.
export default function CorpoNaoResidentesIrs() {
  return (
    <>
      <Seccao titulo="O que é rendimento de fonte portuguesa">
        <Paragrafo>
          Tudo neste guia parte de uma frase: sendo não residente, o IRS incide{" "}
          <strong>unicamente sobre os rendimentos obtidos em território português</strong>. O que
          ganhaste noutro país é problema desse país.
        </Paragrafo>
        <Paragrafo>
          A dificuldade está em saber onde um rendimento se considera obtido, e a resposta não é
          «onde o dinheiro entrou». É a lei que a dá, categoria a categoria, e a lógica muda em
          cada uma: o trabalho, pelo lugar onde é prestado ou pela entidade que paga; as rendas e as
          mais-valias imobiliárias, pelo lugar do imóvel; os capitais, pela residência de quem paga.
        </Paragrafo>
        <Nota titulo="Um imóvel cá é sempre fonte portuguesa">
          É a categoria mais previsível e a mais esquecida. As rendas de um apartamento em Portugal
          são tributadas cá independentemente de onde vives, de onde o inquilino te transfere o
          dinheiro e de haver ou não convenção.
        </Nota>
      </Seccao>

      <Seccao titulo="As taxas aplicáveis por categoria">
        <Paragrafo>
          Não há uma taxa de não residente — há um conjunto de taxas, e escolher a errada muda a
          conta em vários pontos percentuais. Os valores estão todos na tabela de dados aqui em
          baixo; o que importa é perceber a arrumação.
        </Paragrafo>
        <Paragrafo>
          · <strong>Trabalho dependente, categoria B e pensões</strong> — retenção na fonte a título
          definitivo, à taxa liberatória própria dos não residentes. A categoria B entra aqui{" "}
          <em>ainda que decorra de atos isolados</em>.
          <br />· <strong>Rendimentos de capitais</strong> — a mesma taxa liberatória que se aplica a
          residentes. Nesta categoria a residência não muda nada.
          <br />· <strong>Restantes rendimentos</strong> não imputáveis a estabelecimento estável e
          não sujeitos a retenção liberatória — taxa autónoma.
          <br />· <strong>Com estabelecimento estável</strong> em Portugal — taxa autónoma própria.
        </Paragrafo>
        <AvisoPrazo titulo="Prestar um serviço pontual cá já é categoria B">
          A lei apanha expressamente os atos isolados. Quem vive fora e vem cá dar uma formação, uma
          consultoria ou uma atuação sofre retenção sobre esse pagamento — não é preciso ter
          atividade aberta nem vir com frequência.
        </AvisoPrazo>
        <Nota titulo="Uma folga que existe e quase ninguém usa">
          No trabalho ou serviços prestados a uma <strong>única entidade</strong>, não há retenção
          até ao valor da retribuição mínima mensal garantida, aplicando-se a taxa só à parte que
          exceda. Depende de o titular comunicar por <em>declaração escrita</em> à entidade que paga
          que não aufere o mesmo tipo de rendimentos de outras entidades cá. Sem essa declaração, a
          entidade retém sobre tudo.
        </Nota>
      </Seccao>

      <Seccao titulo="Porque não há deduções">
        <Paragrafo>
          A explicação costuma ser «porque a lei não as dá aos não residentes», e não é essa. É mais
          simples e mais consequente: as taxas incidem sobre os{" "}
          <strong>{NAO_RESIDENTES.incideSobre.value}</strong>.
        </Paragrafo>
        <Paragrafo>
          Não havendo apuramento de um rendimento líquido, não há a que abater despesas de saúde,
          educação ou habitação. A retenção é definitiva no momento do pagamento, e o imposto acaba
          ali — não há declaração onde as deduções pudessem entrar.
        </Paragrafo>
        <Paragrafo>
          A única exceção que a lei ressalva são as <strong>pensões</strong>, que beneficiam da
          dedução específica do art. 53.º.
        </Paragrafo>
        <AvisoPrazo titulo="Quem reside na UE ou no EEE tem duas portas de volta">
          A primeira é uma <strong>opção</strong>: os residentes noutro Estado-Membro da União
          Europeia ou do Espaço Económico Europeu com intercâmbio de informações podem optar pela
          tributação à taxa que seria aplicável a residentes. A segunda é um{" "}
          <strong>pedido de devolução</strong> do imposto retido na parte em que exceda o que
          resultaria das taxas progressivas, com as despesas necessárias à obtenção do rendimento
          dedutíveis. O prazo do pedido está na tabela de dados.
        </AvisoPrazo>
        <Nota titulo="Mas contam todos os rendimentos, incluindo os de fora">
          É a contrapartida das duas portas, e é o que as torna inúteis para muita gente: para
          determinar a taxa, são considerados <strong>todos os rendimentos, incluindo os obtidos
          fora deste território</strong>, nas mesmas condições aplicáveis aos residentes. Quem ganha
          bem no país onde vive vai encontrar uma taxa progressiva mais alta do que a liberatória
          que já pagou.
        </Nota>
      </Seccao>

      <Seccao titulo="Mais-valias imobiliárias de não residentes">
        <Paragrafo>
          Vender um imóvel situado em Portugal é sempre rendimento de fonte portuguesa. O que mudou —
          e é a razão pela qual a informação antiga sobre isto está toda errada — é que os não
          residentes deixaram de ser tributados pela totalidade da mais-valia à taxa autónoma.
        </Paragrafo>
        <Paragrafo>
          A alínea do art. 72.º que fazia isso foi <strong>revogada</strong> pela Lei n.º 24-D/2022,
          e a mesma lei reescreveu o n.º 2 do art. 43.º sem distinguir residentes de não residentes.
          Fica o regime comum: apura-se o saldo entre mais-valias e menos-valias, considera-se a
          fração que a lei manda considerar, e o resultado vai às taxas progressivas. Os números
          estão no guia das mais-valias imobiliárias.
        </Paragrafo>
        <Nota titulo="Vender obriga a declarar, mesmo sem imposto a pagar">
          A mais-valia não tem retenção na fonte: apura-se na declaração do ano seguinte. Quem vende
          e sai do país sem entregar a declaração fica com uma omissão — e com um representante
          fiscal, se o tiver, a receber as notificações sobre ela.
        </Nota>
        <VaiPara href="/guias/mais-valias-imoveis">
          O cálculo da mais-valia, com o reinvestimento e as despesas que abatem
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quando há obrigação de entregar declaração">
        <Paragrafo>
          A regra prática: <strong>a retenção liberatória dispensa a declaração; a sua ausência
          obriga-a</strong>. Quando o imposto foi retido a título definitivo por uma entidade
          portuguesa, o assunto está fechado no momento do pagamento.
        </Paragrafo>
        <Paragrafo>
          Há declaração a entregar quando não houve entidade retentora — rendas pagas por um
          particular, mais-valias de uma venda —, quando se exerce a opção pelas taxas progressivas,
          e quando há rendimentos imputáveis a estabelecimento estável.
        </Paragrafo>
        <AvisoPrazo titulo="Ter representante fiscal não é entregar declaração">
          O representante recebe notificações e assegura o contacto. Não substitui as tuas obrigações
          declarativas nem responde por elas — a declaração continua a ser tua.
        </AvisoPrazo>
        <VaiPara href="/guias/representante-fiscal">
          Quando o representante é obrigatório, e a alternativa que o dispensa
        </VaiPara>
      </Seccao>

      <Seccao titulo="O papel da convenção">
        <Paragrafo>
          As taxas deste guia são as da lei portuguesa. Havendo convenção entre Portugal e o país
          onde resides, é ela que decide se Portugal pode tributar aquele rendimento e{" "}
          <strong>com que limite</strong> — e o limite convencionado é quase sempre inferior à taxa
          interna.
        </Paragrafo>
        <Paragrafo>
          Mas a redução não é automática. Para a entidade portuguesa reter à taxa da convenção, tem
          de ter na mão o formulário próprio, acompanhado do certificado de residência fiscal emitido
          pela autoridade do teu país. Sem isso, retém à taxa interna — e o excesso recupera-se
          depois, com prazo e diligência.
        </Paragrafo>
        <VaiPara href="/guias/modelo-21-rfi">
          O formulário que aciona a convenção, e o certificado que o faz valer
        </VaiPara>
        <VaiPara href="/guias/convencao-dupla-tributacao">
          Como ler a convenção do teu país, artigo a artigo
        </VaiPara>
      </Seccao>
    </>
  );
}
