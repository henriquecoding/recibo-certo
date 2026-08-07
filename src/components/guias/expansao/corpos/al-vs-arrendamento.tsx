import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";

// Corpo verificado a 06/08/2026: arts. 3.º, 31.º (n.º 1, als. c e h, e n.º 2)
// e 72.º (n.os 1 e 2) do CIRS. É um guia de DECISÃO — não dá um vencedor,
// porque não há um: dá os eixos em que a resposta muda.
export default function CorpoAlVsArrendamento() {
  return (
    <>
      <Seccao titulo="Os dois regimes lado a lado">
        <Paragrafo>
          A diferença não é de grau, é de natureza. O <strong>arrendamento</strong> é cedência do
          uso de um imóvel: rendimento predial, categoria F. O <strong>alojamento local</strong> é
          prestação de serviços: atividade empresarial, categoria B. Tudo o resto decorre daí.
        </Paragrafo>
        <Paragrafo>
          Na categoria F declaras rendas e deduzes os gastos reais do imóvel. Na categoria B abres
          atividade, faturas, entras no IVA e contribuis para a Segurança Social — e, no regime
          simplificado, não deduzes gastos: aplicas um coeficiente.
        </Paragrafo>
        <Nota titulo="Não é uma escolha declarativa">
          Não se «opta» por um ou por outro no IRS. A qualificação segue o que fazes: se prestas
          serviço de alojamento de curta duração com registo de AL, é categoria B, e declará-lo como
          renda não muda isso.
        </Nota>
      </Seccao>

      <Seccao titulo="O que muda no IRS">
        <Paragrafo>
          No <strong>arrendamento habitacional</strong>, a taxa autónoma incide sobre o rendimento
          líquido — o que sobra depois dos gastos do imóvel — e desce com a duração do contrato,
          até 20 pontos percentuais em contratos longos. Um contrato de vinte anos com despesas
          normais é uma das formas mais leves de tributação de rendimento que existem em Portugal.
        </Paragrafo>
        <Paragrafo>
          No <strong>alojamento local</strong>, o coeficiente aplica-se ao rendimento{" "}
          <em>bruto</em>, e o resultado é englobado com os teus restantes rendimentos — ou seja,
          entra nos escalões progressivos e pode empurrar-te para cima. Duas pessoas com a mesma
          faturação de AL pagam impostos diferentes consoante o que ganham fora dele.
        </Paragrafo>
        <AvisoPrazo titulo="É aqui que a comparação se decide, e não na taxa nominal">
          Comparar «25% da categoria F» com «coeficiente de 0,35 da categoria B» não quer dizer
          nada: uma é uma taxa sobre o líquido, a outra é uma fração do bruto que depois é
          tributada pela tua taxa marginal. Só a conta feita com os teus números responde.
        </AvisoPrazo>
        <VaiPara href="/guias/escaloes-irs">Os escalões em que o rendimento do AL vai cair</VaiPara>
      </Seccao>

      <Seccao titulo="O que muda na Segurança Social">
        <Paragrafo>
          Esta é a diferença que mais gente esquece ao fazer as contas, e é estrutural: as{" "}
          <strong>rendas da categoria F não geram contribuições</strong>. O alojamento local, como
          atividade da categoria B, gera — com declaração trimestral e contribuição sobre o
          rendimento relevante.
        </Paragrafo>
        <Paragrafo>
          Há uma compensação parcial no lado do IRS: no regime simplificado, os rendimentos de
          prestações de serviços permitem deduzir as contribuições obrigatórias na parte em que
          excedam 10% do rendimento bruto. Mas atenção — essa dedução{" "}
          <strong>não abrange</strong> a alínea das áreas de contenção.
        </Paragrafo>
        <VaiPara href="/guias/seguranca-social">
          Como se calcula a contribuição de um trabalhador independente
        </VaiPara>
      </Seccao>

      <Seccao titulo="Custos operacionais que não aparecem na tabela">
        <Paragrafo>
          O AL rende mais bruto porque <em>é</em> um negócio, e negócios têm custos. Limpezas entre
          hóspedes, lavandaria, consumíveis, água, luz e internet sempre ligadas, comissões das
          plataformas, gestão de check-ins, manutenção acelerada pelo uso intenso, seguro de
          responsabilidade civil, livro de reclamações eletrónico.
        </Paragrafo>
        <Paragrafo>
          No regime simplificado, nada disto se deduz individualmente — o coeficiente já assume uma
          margem de custos, e assume-a de forma fixa. Se os teus custos reais forem acima dessa
          margem, estás a pagar imposto sobre dinheiro que não ganhaste. Se forem abaixo, o
          coeficiente está a favorecer-te.
        </Paragrafo>
        <Nota titulo="É por aqui que se decide olhar para a contabilidade organizada">
          Quando os custos reais ultrapassam com folga a margem presumida pelo coeficiente, deixa de
          fazer sentido o simplificado. A conta muda de forma e passa a ser lucro real.
        </Nota>
        <VaiPara href="/guias/contabilidade-organizada">
          Quando compensa passar ao lucro real
        </VaiPara>
      </Seccao>

      <Seccao titulo="Risco e ocupação">
        <Paragrafo>
          O arrendamento tem um risco concentrado — um inquilino que não paga — e receita estável. O
          AL tem risco distribuído por muitos hóspedes e receita <strong>sazonal</strong>: a
          rentabilidade anunciada por noite só se converte em rendimento anual se a taxa de ocupação
          se mantiver, e a ocupação depende de coisas que não controlas.
        </Paragrafo>
        <Paragrafo>
          Há ainda o risco regulatório, que é assimétrico. Um contrato de arrendamento longo é
          estável por natureza; um registo de AL depende de um quadro municipal que já mudou várias
          vezes e pode voltar a mudar. Quem financia a compra a contar com receita de AL está a
          assumir os dois riscos ao mesmo tempo.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Um exemplo com números">
        <Paragrafo>
          Não pomos aqui um exemplo com valores inventados, e é uma decisão deliberada. Um exemplo
          numérico desta comparação depende de <strong>seis variáveis</strong> — faturação bruta do
          AL, taxa de ocupação, custos operacionais reais, renda de mercado do arrendamento,
          duração do contrato que estarias disposto a assinar, e os teus outros rendimentos — e um
          número escolhido a dedo faz qualquer dos lados ganhar.
        </Paragrafo>
        <Paragrafo>
          O que dá para dizer com segurança é a forma da conta: o AL só compensa quando a{" "}
          <em>margem depois de custos operacionais, contribuições e IRS englobado</em> supera a
          renda líquida de um contrato longo com a taxa já reduzida. Nas zonas onde a renda de
          mercado é alta e a ocupação turística é sazonal, essa comparação está mais renhida do que
          o marketing das plataformas sugere.
        </Paragrafo>
        <VaiPara href="/ferramentas/simulador-irs">
          Faz a conta com os teus números no simulador de IRS
        </VaiPara>
        <VaiPara href="/guias/alojamento-local">
          O regime do AL em detalhe, incluindo IVA e obrigações não fiscais
        </VaiPara>
        <VaiPara href="/guias/arrendamento-categoria-f">
          A escada de reduções que torna o arrendamento longo competitivo
        </VaiPara>
      </Seccao>
    </>
  );
}
