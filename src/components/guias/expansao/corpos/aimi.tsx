import { Seccao, Paragrafo, Nota, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 135.º-A a 135.º-H do CIMI.
export default function CorpoAIMI() {
  return (
    <>
      <Seccao titulo="O que entra na soma e o que fica de fora">
        <Paragrafo>
          O AIMI incide sobre a <strong>soma dos VPT</strong> de todos os prédios urbanos em
          território português de que sejas titular — proprietário, usufrutuário ou superficiário.
          Não olha imóvel a imóvel: olha para o total.
        </Paragrafo>
        <Paragrafo>
          Ficam <strong>excluídos</strong> os prédios urbanos classificados como «comerciais,
          industriais ou para serviços» e os classificados como «outros». Sobra o que quase toda a
          gente tem: <strong>habitação e terrenos para construção</strong>. Também não contam os
          prédios que no ano anterior estiveram isentos ou não sujeitos a IMI.
        </Paragrafo>
        <Nota titulo="A habitação própria não está excluída">
          Ao contrário do que muita gente assume, a casa onde vives entra na soma. O que existe é
          uma dedução — e é ela que faz com que a esmagadora maioria dos proprietários nunca chegue
          a pagar AIMI.
        </Nota>
      </Seccao>

      <Seccao titulo="A dedução por sujeito passivo">
        <Paragrafo>
          Ao valor tributável deduz-se <strong>600 000 €</strong> quando o sujeito passivo é uma
          pessoa singular, e o mesmo montante quando é uma herança indivisa. Só o que passar disso é
          tributado. Uma pessoa singular com imóveis habitacionais que somem 500 000 € de VPT não
          paga AIMI nenhum — e não tem de fazer nada para isso.
        </Paragrafo>
        <Paragrafo>
          As pessoas coletivas não têm esta dedução: são tributadas sobre a soma toda.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="A opção conjunta e o efeito de duplicação">
        <Paragrafo>
          Casados e unidos de facto podem optar pela <strong>tributação conjunta</strong>. O efeito
          é o que interessa: os limites passam a contar a dobrar — a dedução conta por duas pessoas,
          e os patamares a partir dos quais as taxas marginais mais altas entram também duplicam.
        </Paragrafo>
        <Paragrafo>
          Há uma contrapartida a conhecer antes de optar: com a opção conjunta há{" "}
          <strong>uma única liquidação</strong> e os dois sujeitos passivos ficam{" "}
          <strong>solidariamente responsáveis</strong> pelo pagamento. Solidariamente quer dizer que
          a AT pode exigir a totalidade a qualquer um deles.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="As taxas por escalão">
        <Paragrafo>
          Sobre o valor que sobra depois da dedução, a taxa é de <strong>0,7%</strong> para pessoas
          singulares e heranças indivisas, e de <strong>0,4%</strong> para pessoas coletivas.
        </Paragrafo>
        <Paragrafo>
          Para pessoas singulares há dois agravamentos marginais, calculados sobre o valor
          tributável <em>antes</em> da dedução: <strong>1%</strong> na parte que exceda 1 000 000 €
          e não passe 2 000 000 €, e <strong>1,5%</strong> na parte acima de 2 000 000 €. Com a
          opção conjunta, estes dois patamares contam ao dobro.
        </Paragrafo>
        <Nota titulo="Dois casos com taxa muito mais alta">
          Prédios detidos por pessoas coletivas mas afetos ao <strong>uso pessoal</strong> dos
          titulares do capital, dos órgãos sociais ou dos seus cônjuges, ascendentes e descendentes
          são tributados a 0,7% — como se fossem de pessoa singular — com o agravamento marginal de
          1% acima de 1 000 000 €. E os prédios de entidades sujeitas a regime fiscal mais favorável
          pagam <strong>7,5%</strong>. Esta última não se aplica a pessoas singulares.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando é liquidado e pago">
        <Paragrafo>
          A liquidação é anual e automática, feita pela AT com base nas matrizes a{" "}
          <strong>1 de janeiro</strong> do ano a que o adicional respeita — data diferente da do
          IMI, que se reporta a 31 de dezembro. Os meses de liquidação e de pagamento estão na
          tabela de dados aqui em baixo, e o documento de cobrança é enviado até ao fim do mês
          anterior ao do pagamento.
        </Paragrafo>
        <Paragrafo>
          Falhar o prazo faz correr <strong>juros de mora</strong>. E se a liquidação for retardada
          por facto imputável ao contribuinte, acrescem ainda juros compensatórios.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Dedução em IRC para quem tem os imóveis numa sociedade">
        <Paragrafo>
          Quem detém imóveis através de sociedade tem uma variável a mais na decisão: a sociedade
          paga AIMI sem qualquer dedução, mas o adicional pode ter tratamento próprio no apuramento
          do IRC. A conta não se faz no vazio — depende da atividade da sociedade, do destino dos
          imóveis e de como os rendimentos chegam aos sócios.
        </Paragrafo>
        <VaiPara href="/guias/imovel-empresa-ou-pessoal">
          Comprar o imóvel na empresa ou em nome pessoal
        </VaiPara>
        <VaiPara href="/guias/imi">O IMI de que este adicional é adicional</VaiPara>
        <VaiPara href="/guias/vpt-reavaliacao">
          Se a soma dos VPT te põe perto da dedução, o VPT vale a pena ser revisto
        </VaiPara>
      </Seccao>
    </>
  );
}
