import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 112.º, 113.º, 120.º, 38.º, 11.º-A e 130.º do CIMI. Nenhuma taxa
// municipal concreta é escrita aqui — mudam todos os anos e por município.
export default function CorpoIMI() {
  return (
    <>
      <Seccao titulo="A conta: VPT × taxa municipal">
        <Paragrafo>
          O IMI não olha para o que pagaste pela casa. Incide sobre o{" "}
          <strong>valor patrimonial tributário</strong> — o VPT — que é um valor administrativo
          apurado pelas Finanças e que costuma ser bastante mais baixo do que o preço de mercado.
          A conta do ano é simples: VPT a multiplicar pela taxa que o teu município fixou.
        </Paragrafo>
        <Paragrafo>
          A lei não fixa uma taxa única. Fixa um intervalo: os prédios urbanos ficam entre{" "}
          <strong>0,3% e 0,45%</strong> e os prédios rústicos têm taxa própria de{" "}
          <strong>0,8%</strong>. É dentro desse intervalo que cada assembleia municipal decide,
          todos os anos, quanto cobra.
        </Paragrafo>
        <Nota titulo="Há dois agravamentos que apanham gente distraída">
          Prédios urbanos devolutos há mais de um ano e prédios em ruínas veem a taxa{" "}
          <strong>elevada ao triplo</strong>. E se o proprietário tiver domicílio fiscal num
          território com regime fiscal claramente mais favorável, a taxa passa a{" "}
          <strong>7,5%</strong> — mais de dez vezes a normal. Nenhum dos dois é raro em heranças
          antigas que ninguém tratou.
        </Nota>
      </Seccao>

      <Seccao titulo="Onde encontrar o teu VPT">
        <Paragrafo>
          Está na <strong>caderneta predial</strong>, que consultas e imprimes no Portal das
          Finanças sem custo. É o mesmo número que aparece na nota de cobrança e o mesmo que serve
          de base a quase tudo o resto: IMT na compra, AIMI se tiveres património acima da dedução,
          e mais-valias no dia em que vendes.
        </Paragrafo>
        <VaiPara href="/guias/vpt-reavaliacao">
          Como o VPT é calculado — e quando compensa pedir reavaliação
        </VaiPara>
      </Seccao>

      <Seccao titulo="As taxas variam por município — e mudam todos os anos">
        <Paragrafo>
          Dois apartamentos idênticos, com o mesmo VPT, em concelhos vizinhos, pagam valores
          diferentes. A taxa é fixada por deliberação da assembleia municipal, pode ser fixada{" "}
          <strong>por freguesia</strong>, e é comunicada à Autoridade Tributária para a liquidação
          do ano seguinte.
        </Paragrafo>
        <Paragrafo>
          Há ainda margens de ajuste que valem a pena conhecer: os municípios podem{" "}
          <strong>minorar até 30%</strong> a taxa em zonas de reabilitação urbana ou de combate à
          desertificação, e podem <strong>reduzir até 20%</strong> a taxa dos prédios arrendados —
          reduções que se acumulam. Do outro lado, podem majorar até 30% a taxa de prédios
          degradados.
        </Paragrafo>
        <Nota titulo="Por isso é que não escrevemos aqui a taxa do teu concelho">
          Seriam 308 números a mudar todos os anos. Confirma a taxa em vigor junto do teu município
          ou na nota de cobrança — é lá que ela aparece aplicada ao teu caso.
        </Nota>
      </Seccao>

      <Seccao titulo="Prazos: uma, duas ou três prestações">
        <Paragrafo>
          O imposto é liquidado pelos serviços centrais da AT em{" "}
          <strong>fevereiro e abril</strong> do ano seguinte àquele a que respeita, e o número de
          prestações depende só do valor a pagar. Os meses estão na tabela de dados oficiais aqui
          em baixo.
        </Paragrafo>
        <AvisoPrazo titulo="Falhar uma prestação vence todas as outras">
          O não pagamento de uma prestação no prazo implica o{" "}
          <strong>vencimento imediato das restantes</strong>. Não é um atraso numa prestação — é a
          dívida toda a ficar exigível de uma vez.
        </AvisoPrazo>
        <Paragrafo>
          Duas notas que poupam telefonemas: se o imposto a cobrar for{" "}
          <strong>inferior a 10 €</strong> não há liquidação nenhuma, e por isso não recebes nada;
          e cônjuges não separados judicialmente de pessoas e bens, ou unidos de facto, beneficiam
          do fracionamento sobre a <em>totalidade</em> do imposto, mesmo em compropriedade, desde
          que se trate da habitação própria e permanente onde têm o domicílio fiscal.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Isenção temporária de três anos">
        <Paragrafo>
          Existe uma isenção temporária para a habitação própria e permanente, com limites de VPT e
          de rendimento do agregado. Não a descrevemos aqui com números porque{" "}
          <strong>não está no Código do IMI</strong> — vive no Estatuto dos Benefícios Fiscais, e o
          artigo concreto não ficou confirmado nesta verificação.
        </Paragrafo>
        <Nota titulo="Preferimos a lacuna ao número bonito">
          Podíamos escrever dois valores redondos e ninguém daria por nada. Mas este site promete
          fonte por afirmação, e uma afirmação sobre limites de isenção sem o artigo que a sustenta
          é exatamente o tipo de coisa que leva alguém a contar com uma poupança que não tem.
          Confirma no serviço de finanças ou com um contabilista antes de contar com ela.
        </Nota>
      </Seccao>

      <Seccao titulo="Isenção permanente para baixos rendimentos">
        <Paragrafo>
          Esta está no Código, no art. 11.º-A, e é <strong>automática</strong>: a AT reconhece-a
          oficiosamente, todos os anos, sem ninguém a pedir. Abrange os prédios rústicos e a
          habitação própria e permanente do sujeito passivo ou do agregado, e os limites estão
          escritos em múltiplos do <strong>IAS</strong>, não em euros fixos — o rendimento bruto
          total do agregado não pode passar 2,3 vezes o valor de 14 IAS, nem o VPT global de todos
          os prédios do agregado passar 10 vezes o valor de 14 IAS.
        </Paragrafo>
        <Paragrafo>
          Contam os rendimentos do <strong>ano anterior</strong> àquele a que respeita a isenção. A
          isenção estende-se a arrumos, despensas e garagens do mesmo edifício, desde que usados só
          pelo proprietário ou pelo agregado.
        </Paragrafo>
        <AvisoPrazo titulo="Automática não quer dizer incondicional">
          O não cumprimento atempado das obrigações declarativas de IRS e de IMI, pelo sujeito
          passivo ou por qualquer membro do agregado, <strong>determina a não atribuição</strong> da
          isenção. Uma declaração entregue fora de prazo chega para a perder.
        </AvisoPrazo>
        <Nota titulo="Se foste viver para um lar ou para casa de familiares">
          A lei prevê o caso: quem, a 31 de dezembro, esteja a residir em lar, em instituição de
          saúde ou no domicílio fiscal de parentes até ao 4.º grau pode manter a isenção, fazendo
          prova junto da AT até àquela data de que o imóvel era antes a sua habitação própria e
          permanente.
        </Nota>
      </Seccao>

      <Seccao titulo="Se discordas do VPT">
        <Paragrafo>
          O caminho não é reclamar da nota de cobrança — é reclamar da{" "}
          <strong>matriz</strong>. O art. 130.º permite ao sujeito passivo reclamar{" "}
          <strong>a todo o tempo</strong> de qualquer incorreção na inscrição matricial, e a lista
          de fundamentos é explícita: VPT desatualizado, inclusão indevida do prédio na matriz, erro
          na descrição, duplicação ou omissão de prédios, e falta de averbamento de uma isenção já
          concedida.
        </Paragrafo>
        <Paragrafo>
          «A todo o tempo» é a parte que costuma surpreender: não há uma janela anual a perder. Mas
          os efeitos são para o futuro — corrigir a matriz hoje não devolve o IMI dos anos
          anteriores.
        </Paragrafo>
        <VaiPara href="/guias/aimi">Se somas vários imóveis, há um adicional a contar</VaiPara>
        <VaiPara href="/guias/imt">O imposto da compra é outro — e paga-se antes da escritura</VaiPara>
      </Seccao>
    </>
  );
}
