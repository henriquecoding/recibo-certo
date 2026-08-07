import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { IMT_PRAZO_PAGAMENTO_DIAS } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 12.º, 17.º, 9.º, 19.º, 36.º e 49.º do CIMT e art. 1.º do CIS.
// Os escalões do art. 17.º são atualizados todos os anos pelo Orçamento do
// Estado — descreve-se o MECANISMO, não a tabela.
export default function CorpoIMT() {
  return (
    <>
      <Seccao titulo="Sobre que valor incide">
        <Paragrafo>
          Não é sobre o preço. É sobre o <strong>maior</strong> de dois valores: o que consta do ato
          ou do contrato, e o valor patrimonial tributário do imóvel. Se o VPT for mais alto do que
          o preço que combinaste, é sobre o VPT que a conta é feita.
        </Paragrafo>
        <Nota titulo="Vale a pena ver a caderneta antes de assinar">
          O VPT está na caderneta predial e consulta-se no Portal das Finanças. Descobrir que é
          superior ao preço depois da promessa assinada é descobrir tarde: o imposto sobe e o
          orçamento da compra já estava fechado.
        </Nota>
      </Seccao>

      <Seccao titulo="Os escalões e a parcela a abater">
        <Paragrafo>
          O erro mais comum é multiplicar o valor todo pela taxa do escalão. Não funciona assim. O
          IMT usa <strong>taxas marginais</strong>: cada fatia do valor é tributada à taxa do seu
          escalão, e a fórmula prática aplica a taxa marginal ao valor total e subtrai uma{" "}
          <strong>parcela a abater</strong>, que existe precisamente para corrigir o efeito de
          degrau. Sem ela, passar um euro acima de um limiar faria o imposto saltar centenas de
          euros.
        </Paragrafo>
        <Paragrafo>
          Acima dos escalões há dois patamares de <strong>taxa única</strong> — e aí sim, aplica-se
          a taxa a todo o valor, sem parcela nenhuma. O topo de cada tabela está nos dados abaixo.
        </Paragrafo>
        <Nota titulo="A tabela não está escrita aqui de propósito">
          Os escalões do art. 17.º são atualizados todos os anos pelo Orçamento do Estado. Um número
          copiado para o corpo de um guia fica desatualizado em janeiro e ninguém dá por isso —
          consulta a tabela em vigor no artigo, que está nas fontes no fim da página.
        </Nota>
      </Seccao>

      <Seccao titulo="Habitação própria permanente vs. secundária">
        <Paragrafo>
          A finalidade que declaras muda a tabela aplicável, e a diferença é grande. A{" "}
          <strong>habitação própria e permanente</strong> tem uma tabela onde os primeiros escalões
          estão isentos; a habitação secundária e o arrendamento começam a pagar{" "}
          <strong>desde o primeiro euro</strong>. Prédios rústicos e restantes prédios urbanos têm
          taxas únicas próprias — as três estão na tabela de dados aqui em baixo.
        </Paragrafo>
        <AvisoPrazo titulo="Declarar HPP e não cumprir o destino é uma correção com juros à espera">
          A isenção e a tabela mais favorável dependem de o imóvel ser <em>efetivamente</em> afeto a
          habitação própria e permanente. Se a finalidade declarada não se concretizar, a
          liquidação é corrigida — com juros compensatórios.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A isenção para jovens até 35 anos">
        <Paragrafo>
          É a alteração com mais impacto prático dos últimos anos, e as condições são cumulativas.
          Está isenta de IMT a <strong>primeira aquisição</strong> de prédio urbano ou fração
          destinada exclusivamente a habitação própria e permanente, por quem tenha{" "}
          <strong>35 anos ou menos</strong> à data da transmissão e que, no ano da transmissão,{" "}
          <strong>não seja considerado dependente</strong> para efeitos de IRS.
        </Paragrafo>
        <Paragrafo>
          O limite não é um valor solto: é o topo do 1.º escalão da tabela própria destes
          compradores. Até esse limite não há IMT nenhum. Acima dele, a isenção acaba mas o benefício não desaparece
          de vez — o primeiro escalão continua sem imposto e só o excedente é tributado, o que na prática
          funciona como isenção parcial. Os valores concretos estão na tabela de dados aqui em
          baixo.
        </Paragrafo>
        <AvisoPrazo titulo="«Primeira aquisição» tem uma janela de três anos, não é «nunca na vida»">
          Ficam excluídos os compradores que sejam titulares do direito de propriedade — ou de uma
          figura parcelar desse direito — sobre prédio urbano habitacional{" "}
          <strong>à data da transmissão ou em qualquer momento nos três anos anteriores</strong>.
          Uma quota herdada há dois anos afasta a isenção; a mesma quota herdada há seis, não.
        </AvisoPrazo>
        <Nota titulo="Num casal, cada um conta por si">
          Quando o imóvel vem a ser bem comum do casal, a verificação dos pressupostos e o
          apuramento do IMT são feitos <strong>individualmente para cada cônjuge, em partes
          iguais</strong>, e cada um apresenta a sua declaração. Um dos dois pode ter direito à
          isenção sobre a sua metade mesmo que o outro não tenha.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando se paga — e porque é antes da escritura">
        <Paragrafo>
          A liquidação é de <strong>iniciativa do comprador</strong>: é ele que apresenta a
          declaração de modelo oficial, em qualquer serviço de finanças ou por via eletrónica. Se
          não o fizer, os serviços liquidam oficiosamente — com juros compensatórios e a coima que
          ao caso couber.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Apresentar a declaração",
              texto: "Em qualquer serviço de finanças ou no Portal das Finanças, com a identificação do imóvel e o valor do negócio. Também há que a apresentar quando o caso é de isenção — a isenção declara-se, não se presume.",
            },
            {
              titulo: "Pagar a guia",
              texto: `No próprio dia da liquidação ou nos ${IMT_PRAZO_PAGAMENTO_DIAS.value} dias seguintes. Passado esse prazo a liquidação fica sem efeito e há que a repetir.`,
            },
            {
              titulo: "Levar o comprovativo à escritura",
              texto: "É a peça que destrava o ato: sem ela, quem tem funções notariais não pode lavrar a escritura nem autenticar o documento particular.",
            },
          ]}
        />
        <Paragrafo>
          É daqui que vem a ideia de que «o IMT paga-se antes da escritura». A lei não o diz nessas
          palavras no artigo do prazo — di-lo no artigo das obrigações dos notários, que os proíbe
          de titular a transmissão sem lhes ser apresentado o extrato da declaração acompanhado do
          comprovativo da cobrança. O efeito prático é o mesmo, e é absoluto.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O selo que se soma">
        <Paragrafo>
          Além do IMT há <strong>Imposto do Selo</strong> sobre a mesma transmissão, com a taxa que
          consta da tabela de dados. Incide sobre a mesma base — o maior entre preço e VPT — e não
          tem escalões nem parcela a abater: é uma percentagem plana.
        </Paragrafo>
        <Paragrafo>
          Se a compra for com crédito, há ainda um <em>segundo</em> selo, sobre o financiamento e
          não sobre o imóvel. São impostos diferentes, com bases diferentes e liquidados em momentos
          diferentes — e é onde o orçamento da compra costuma escorregar.
        </Paragrafo>
        <VaiPara href="/guias/imposto-selo-compra-casa">Os dois selos da compra de casa</VaiPara>
      </Seccao>

      <Seccao titulo="Casos em que o IMT é devolvido">
        <Paragrafo>
          A liquidação não é definitiva. Se o negócio não se concretizar, ou se o imposto tiver sido
          liquidado sobre valor superior ao devido, há lugar a anulação e reembolso. E quando o erro
          foi dos serviços, o reembolso não vem sozinho — vem com juros a teu favor.
        </Paragrafo>
        <VaiPara href="/guias/juros-indemnizatorios">
          Os juros que a AT te deve quando o erro é dela
        </VaiPara>
        <VaiPara href="/guias/imi">Depois da compra vem o imposto anual</VaiPara>
      </Seccao>
    </>
  );
}
