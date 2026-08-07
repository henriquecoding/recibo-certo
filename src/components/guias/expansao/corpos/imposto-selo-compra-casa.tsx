import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado a 06/08/2026 contra os arts. 1.º, 9.º, 23.º e 44.º do CIS
// e contra a Tabela Geral do Imposto do Selo, no PDF consolidado publicado
// pela AT (verbas 1.1 e 17.1). As taxas não estão em nenhum artigo do
// articulado — o CIS remete para a Tabela, e é a Tabela que as fixa.
export default function CorpoImpostoSeloCompraCasa() {
  return (
    <>
      <Seccao titulo="Selo da transmissão: sobre a escritura">
        <Paragrafo>
          O imposto do selo não tem taxa própria no articulado: o art. 1.º diz que incide sobre os
          atos, contratos e factos previstos na <strong>Tabela Geral</strong>, e é lá que as taxas
          vivem. A aquisição onerosa do direito de propriedade sobre imóveis é a{" "}
          <strong>verba 1.1</strong>, e a taxa está na tabela de dados aqui em baixo.
        </Paragrafo>
        <Paragrafo>
          A base é a mesma do IMT: aos negócios jurídicos sobre imóveis aplicam-se{" "}
          <strong>as regras de determinação da matéria tributável do CIMT</strong>. Ou seja, incide
          sobre o maior entre o preço e o valor patrimonial tributário — exatamente como o IMT, e
          pela mesma razão.
        </Paragrafo>
        <Nota titulo="É plano, não tem escalões">
          Ao contrário do IMT, não há taxa marginal nem parcela a abater. É uma percentagem única
          sobre o valor, do primeiro euro ao último. Simples de calcular e fácil de esquecer no
          orçamento.
        </Nota>
      </Seccao>

      <Seccao titulo="Selo do crédito: incide sobre o capital e varia com o prazo">
        <Paragrafo>
          Este é outro imposto, sobre outra coisa. A <strong>verba 17</strong> tributa as operações
          financeiras — a utilização de crédito — e a base não é o imóvel: é o{" "}
          <strong>capital financiado</strong>. Quem compra sem crédito não paga este.
        </Paragrafo>
        <Paragrafo>
          A taxa varia com o <strong>prazo</strong> do contrato, em três degraus — estão na tabela
          de dados aqui em baixo. Um crédito à habitação é quase sempre de prazo longo, portanto o
          que se aplica é o degrau mais alto, cobrado de uma vez na formalização e não diluído
          pelas prestações.
        </Paragrafo>
        <AvisoPrazo titulo="Prorrogar o prazo conta como crédito novo">
          A Tabela Geral é expressa: considera-se <strong>sempre</strong> como nova concessão de
          crédito a prorrogação do prazo do contrato. Renegociar o prazo de um crédito não é um
          ajuste administrativo — faz nascer imposto do selo outra vez.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Quem liquida cada um">
        <Paragrafo>
          São sujeitos passivos diferentes, e é por isso que os dois selos chegam por caminhos
          diferentes. No selo da transmissão, a liquidação segue as regras do CIMT — é liquidado com
          o IMT e é o comprador quem o paga, com{" "}
          <strong>notários e entidades que autentiquem documentos</strong> entre os sujeitos
          passivos identificados na lei.
        </Paragrafo>
        <Paragrafo>
          No selo do crédito o sujeito passivo é a{" "}
          <strong>entidade concedente do crédito</strong> — o banco. Não recebes guia nenhuma: o
          banco liquida e repercute-te o valor, e ele aparece no mapa de encargos da operação.
        </Paragrafo>
        <Nota titulo="Onde procurar cada um">
          O selo da transmissão vem no mesmo documento de cobrança do IMT. O selo do crédito vem na
          FINE e no mapa de custos que o banco entrega antes da escritura, muitas vezes numa linha
          só, com um nome pouco óbvio. Se o total da operação não bate certo, é geralmente aqui.
        </Nota>
      </Seccao>

      <Seccao titulo="Como entram na conta final da compra">
        <Paragrafo>
          O prazo geral do imposto do selo é o dia <strong>20 do mês seguinte</strong> àquele em que
          a obrigação se constituiu. Mas quando é liquidado com o IMT, segue o prazo do{" "}
          <strong>art. 36.º do CIMT</strong> — e esse tem de estar cumprido antes da escritura,
          porque sem o comprovativo o notário não pode lavrar o ato.
        </Paragrafo>
        <Paragrafo>
          Para orçamentar, a regra prática é somar quatro coisas ao preço: IMT, selo da transmissão,
          selo do crédito (se houver financiamento) e os custos de escritura e registo. Só o
          primeiro é que tem escalões — os outros são percentagens planas que ninguém repara até
          chegar a fatura.
        </Paragrafo>
        <Nota titulo="A isenção jovem abrange os dois primeiros">
          Quem reúna as condições da isenção de IMT na primeira habitação própria e permanente
          beneficia também de isenção do selo da transmissão. O selo do crédito não é abrangido: é
          uma operação financeira, não uma transmissão de imóvel.
        </Nota>
        <VaiPara href="/guias/imt">As condições exatas da isenção jovem</VaiPara>
        <VaiPara href="/guias/imi">O imposto que passa a ser anual depois da compra</VaiPara>
        <VaiPara href="/guias/herancas-imposto-selo">
          Quando a transmissão é gratuita, a verba é outra
        </VaiPara>
      </Seccao>
    </>
  );
}
