import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { MAIS_VALIAS_IMOBILIARIO_INCLUSAO, MAIS_VALIAS_IMOVEIS } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 10.º (n.os 5 a 8), 43.º, 44.º, 51.º e 55.º do CIRS. O n.º 7 — o
// reinvestimento em imóveis para arrendamento a renda moderada — vinha no
// pacote como alteração por confirmar: está em vigor, com a redação do
// Decreto-Lei n.º 97/2026, de 20 de maio.
export default function CorpoMaisValiasImoveis() {
  return (
    <>
      <Seccao titulo="A fórmula: realização menos aquisição corrigida menos encargos">
        <Paragrafo>
          A mais-valia não é a diferença entre o que recebeste e o que pagaste. É a diferença entre
          o <strong>valor de realização</strong> e o valor de aquisição{" "}
          <strong>corrigido pela inflação</strong>, subtraídos ainda os encargos que a lei admite.
          A conta que quase toda a gente faz de cabeça — preço de venda menos preço de compra — dá
          sempre um número mais alto do que o real.
        </Paragrafo>
        <Paragrafo>
          O valor de realização é o preço, com regras próprias para os casos que não são uma venda
          normal: na <strong>troca</strong> é o valor atribuído aos bens recebidos ou o valor de
          mercado, se for superior, ajustado pelo dinheiro que entra ou sai; na{" "}
          <strong>expropriação</strong> é o valor da indemnização.
        </Paragrafo>
        <Nota titulo="E o saldo é anual, não é por imóvel">
          O que se tributa é o <strong>saldo entre mais-valias e menos-valias realizadas no mesmo
          ano</strong>. Vender um imóvel com ganho e outro com perda no mesmo ano civil compensa —
          vender com um ano de intervalo, não.
        </Nota>
      </Seccao>

      <Seccao titulo="O coeficiente de desvalorização da moeda">
        <Paragrafo>
          O valor de aquisição é multiplicado por um <strong>coeficiente</strong> que corrige a
          inflação acumulada desde o ano da compra. Uma casa comprada há vinte anos tem um valor de
          aquisição corrigido bastante superior ao que está na escritura — e isso reduz
          diretamente a mais-valia.
        </Paragrafo>
        <Paragrafo>
          Os coeficientes são publicados por <strong>portaria anual</strong>, um por cada ano de
          aquisição. Não os escrevemos aqui de propósito: são dezenas de valores que mudam todos os
          anos, e um número copiado para um guia fica desatualizado sem ninguém dar por isso.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Porque só metade é tributada">
        <Paragrafo>
          O saldo das mais-valias de imóveis é{" "}
          <strong>considerado em {pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} do seu valor</strong>. É
          uma regra do art. 43.º e é a razão pela qual o imposto acaba por ser menor do que a
          intuição sugere: metade do ganho nunca chega a entrar no rendimento coletável.
        </Paragrafo>
        <AvisoPrazo titulo="Há um caso em que o saldo conta por inteiro">
          Imóveis que tenham beneficiado de <strong>apoio público não reembolsável</strong> para
          aquisição ou obras, acima da fração do VPT que está na tabela de dados, e que sejam
          vendidos antes do prazo aí indicado, são tributados{" "}
          <strong>por inteiro</strong>. A redução do art. 43.º não se aplica.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Isenção por reinvestimento: requisitos e prazos">
        <Paragrafo>
          Se o imóvel vendido era <strong>habitação própria e permanente</strong>, o ganho pode ser
          totalmente excluído de tributação — mas as condições são{" "}
          <strong>cumulativas</strong>, e falhar uma chega para perder a exclusão inteira:
        </Paragrafo>
        <Paragrafo>
          · O valor de realização, <strong>deduzido da amortização do empréstimo</strong> contraído
          para a aquisição, tem de ser reinvestido noutro imóvel com o mesmo destino — aquisição,
          terreno para construção, construção, ampliação ou melhoramento — em Portugal, noutro
          Estado-membro da União Europeia ou do Espaço Económico Europeu com intercâmbio de
          informação fiscal.
          <br />· O reinvestimento tem de ser feito na janela que está na tabela de dados aqui em
          baixo — e ela abre <em>antes</em> da venda, não só depois.
          <br />· Tens de <strong>manifestar a intenção de reinvestir</strong>, ainda que
          parcialmente, indicando o montante na declaração do ano da alienação.
          <br />· O imóvel vendido tem de ter sido a tua habitação própria e permanente,{" "}
          <strong>comprovada pelo domicílio fiscal</strong>, nos 12 meses anteriores à
          transmissão — ou à data do reinvestimento, se anterior.
        </Paragrafo>
        <AvisoPrazo titulo="A declaração da intenção é a condição que mais se perde">
          As outras dependem de dinheiro e de datas. Esta depende só de preencher um campo na
          declaração do ano da venda — e é a que mais gente falha, porque só se lembra do
          reinvestimento no ano em que compra a casa seguinte. Sem a intenção declarada nesse ano, a
          exclusão não se aplica.
        </AvisoPrazo>
        <Paragrafo>
          Há ainda condições do lado da chegada: comprando outro imóvel, tens de o afetar a
          habitação dentro de <strong>12 meses após o reinvestimento</strong>; nos restantes casos —
          construção, ampliação, melhoramento — tens de requerer a inscrição na matriz até{" "}
          <strong>48 meses</strong> desde a realização e afetar o imóvel a habitação até ao fim do
          quinto ano seguinte. E o domicílio fiscal tem de ficar lá fixado.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Reinvestir em arrendamento: a segunda via">
        <Paragrafo>
          Desde a redação dada pelo Decreto-Lei n.º 97/2026, existe uma segunda forma de excluir o
          ganho — e esta não exige que compres para ti. É a de reinvestir na aquisição de imóveis{" "}
          <strong>situados em território nacional, destinados a arrendamento para habitação com
          renda mensal dentro dos limites fixados nesse diploma</strong>.
        </Paragrafo>
        <Paragrafo>
          A janela de reinvestimento e a obrigação de declarar a intenção são as mesmas. O que muda
          é o que tens de fazer depois: celebrar contrato de arrendamento habitacional dentro dos
          limites de renda em <strong>seis meses</strong> contados do reinvestimento ou da
          realização, se posterior — salvo impedimento justificado, como obras urgentes — e manter o
          imóvel arrendado durante pelo menos <strong>36 meses, seguidos ou interpolados, nos
          primeiros cinco anos</strong>.
        </Paragrafo>
        <Nota titulo="Os limites de renda não estão no Código do IRS">
          O art. 10.º remete para os n.os 2 e 3 do art. 2.º do Decreto-Lei n.º 97/2026. É lá que os
          valores estão fixados, e é lá que têm de ser confirmados antes de contar com esta via —
          são o tipo de limite que se atualiza sem o Código do IRS mudar uma vírgula.
        </Nota>
      </Seccao>

      <Seccao titulo="Reinvestimento parcial é isenção proporcional">
        <Paragrafo>
          Não é tudo ou nada. Se reinvestires uma parte do valor de realização, a exclusão aplica-se
          na <strong>proporção</strong> do que foi reinvestido — o resto é tributado normalmente,
          com a inclusão parcial do art. 43.º.
        </Paragrafo>
        <Paragrafo>
          É por isso que a alínea que manda declarar a intenção diz «ainda que parcial»: mesmo
          quem sabe à partida que não vai reinvestir tudo tem de o declarar, e tem de declarar
          quanto.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="O que conta como encargo (e a prova que a AT aceita)">
        <Paragrafo>
          Ao valor de aquisição acrescem os <strong>encargos com a valorização</strong> do imóvel
          comprovadamente realizados nos últimos 12 anos, e as{" "}
          <strong>despesas necessárias e efetivamente praticadas</strong> inerentes à aquisição e à
          alienação. Na prática: obras que valorizaram, IMT e imposto do selo pagos na compra,
          escritura, registo, comissão de mediação imobiliária, certificado energético.
        </Paragrafo>
        <Paragrafo>
          «Comprovadamente» e «efetivamente praticadas» são exigências de prova. Fatura em teu nome,
          com o teu NIF, identificando o imóvel — e comprovativo de pagamento. Uma obra paga em
          dinheiro sem fatura não existe para este efeito, por muito real que tenha sido.
        </Paragrafo>
        <AvisoPrazo titulo="Obras feitas com o imóvel afeto a atividade não contam">
          Não são considerados os encargos de valorização realizados durante o período em que o
          imóvel esteve afeto a atividade empresarial ou profissional. Quem teve o imóvel em
          alojamento local e fez obras nesse período tem de separar o antes do depois.
        </AvisoPrazo>
        <VaiPara href="/guias/despesas-senhorio">
          A fronteira entre conservar e valorizar, do lado do arrendamento
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como se declara no Anexo G">
        <Paragrafo>
          A alienação declara-se no <strong>Anexo G</strong>: valor e data de realização, valor e
          data de aquisição, encargos, e — quando é caso disso — a intenção de reinvestir e o
          montante. O coeficiente de desvalorização é aplicado pelo sistema a partir do ano de
          aquisição que declarares.
        </Paragrafo>
        <Paragrafo>
          Se houver menos-valia, ela não se perde de imediato: o saldo negativo de imóveis pode ser
          reportado aos anos seguintes, dentro do prazo do art. 55.º. Mas só compensa mais-valias{" "}
          <strong>da mesma categoria</strong> — nunca rendimentos do trabalho.
        </Paragrafo>
        <VaiPara href="/guias/mais-valias">
          Mais-valias de ações, cripto e outros ativos
        </VaiPara>
        <VaiPara href="/guias/imt">O imposto que pagaste na compra e que agora acresce ao custo</VaiPara>
        <VaiPara href="/guias/vpt-reavaliacao">
          Porque é que baixar o VPT antes de vender pode sair caro
        </VaiPara>
      </Seccao>
    </>
  );
}
