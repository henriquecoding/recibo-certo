import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { MAIS_VALIAS_IMOBILIARIO_INCLUSAO } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 06/08/2026: arts. 23.º, 46.º e 47.º do CIRC, arts.
// 135.º-A, 135.º-B e 135.º-F (n.º 4) do CIMI e art. 12.º do CIMT.
//
// Guia de DECISÃO com revisão especializada exigida: o que se afirma aqui é
// o que os artigos dizem. O que depende do caso concreto — atividade real da
// sociedade, forma de retirar o rendimento, estrutura societária — está
// identificado como tal, e não resolvido.
export default function CorpoImovelEmpresaOuPessoal() {
  return (
    <>
      <Seccao titulo="O que se deduz do lado da empresa">
        <Paragrafo>
          É o argumento com que a conversa começa, e é verdadeiro: para determinar o lucro
          tributável são dedutíveis <strong>todos os gastos e perdas incorridos ou suportados para
          obter ou garantir os rendimentos sujeitos a IRC</strong>. Num imóvel afeto à atividade
          isso abrange conservação e reparação, e os gastos de natureza financeira — os{" "}
          <strong>juros</strong> do financiamento, que em nome pessoal não deduzem nada.
        </Paragrafo>
        <Paragrafo>
          Acresce a <strong>depreciação</strong> do imóvel, que vai reduzindo o lucro tributável ano
          após ano sem corresponder a saída de dinheiro nenhuma. É a vantagem mais citada — e a que
          se paga toda de uma vez mais à frente.
        </Paragrafo>
        <AvisoPrazo titulo="A dedutibilidade depende de o imóvel servir mesmo a atividade">
          A norma exige que o gasto seja incorrido «para obter ou garantir os rendimentos sujeitos a
          IRC». Um imóvel que não serve a atividade da sociedade não gera gastos dedutíveis por
          estar registado em nome dela. É a primeira coisa que uma inspeção verifica.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="AIMI e a ausência de dedução pessoal">
        <Paragrafo>
          Aqui a empresa perde. O AIMI incide sobre a soma dos VPT dos prédios urbanos
          habitacionais e terrenos para construção de que o sujeito passivo seja titular — e{" "}
          <strong>as pessoas coletivas não têm a dedução de 600 000 €</strong> que as pessoas
          singulares têm. A sociedade é tributada sobre a soma toda, desde o primeiro euro de VPT.
        </Paragrafo>
        <Paragrafo>
          A taxa das pessoas coletivas é mais baixa do que a das singulares, mas isso raramente
          compensa a dedução perdida em patrimónios pequenos e médios. É uma conta de duas linhas
          que vale a pena fazer antes de decidir.
        </Paragrafo>
        <VaiPara href="/guias/aimi">A dedução, as taxas e a opção conjunta em detalhe</VaiPara>
      </Seccao>

      <Seccao titulo="A mais-valia em IRC quando vendes">
        <Paragrafo>
          É a parte que quase nunca entra na decisão, e é a que mais pesa. Em IRC, a mais-valia é a
          diferença entre o valor de realização líquido de encargos e o valor de aquisição{" "}
          <strong>deduzido das depreciações e amortizações aceites fiscalmente</strong>.
        </Paragrafo>
        <Paragrafo>
          Lê-se depressa e muda tudo: <strong>as depreciações que foste deduzindo ao longo dos anos
          voltam a aparecer na venda</strong>, sob a forma de um valor de aquisição mais baixo e,
          portanto, de uma mais-valia maior. A vantagem anual não é um desconto — é um
          adiamento.
        </Paragrafo>
        <Paragrafo>
          Há correção monetária, mas com uma condição: o valor de aquisição corrigido só é
          atualizado pelos coeficientes de desvalorização da moeda quando, à data da realização,
          tenham decorrido <strong>pelo menos dois anos</strong> desde a aquisição.
        </Paragrafo>
        <Nota titulo="E do lado pessoal, metade não é tributada">
          Nas mais-valias de imóveis em IRS, o saldo é considerado em{" "}
          {pctExato(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} do seu valor. Em IRC não há regra
          equivalente: a mais-valia entra por inteiro no lucro tributável. Somando isto à
          recuperação das depreciações, a venda é frequentemente onde a opção pela empresa se
          desfaz.
        </Nota>
        <VaiPara href="/guias/mais-valias-imoveis">A conta da mais-valia em nome pessoal</VaiPara>
      </Seccao>

      <Seccao titulo="Tirar o imóvel da empresa: o segundo IMT">
        <Paragrafo>
          Passar o imóvel da sociedade para ti é uma <strong>transmissão</strong>, e é tributada
          como tal. Há IMT outra vez — sobre o maior entre o valor do ato e o valor patrimonial
          tributário — e imposto do selo outra vez.
        </Paragrafo>
        <Paragrafo>
          Não é um custo evitável com engenharia declarativa: é a consequência de o imóvel ter
          mudado de titular. Quem compra pela empresa a pensar em passar o imóvel para si mais tarde
          está a comprar duas vezes.
        </Paragrafo>
        <AvisoPrazo titulo="E a saída pode ter mais do que um imposto">
          Conforme a forma escolhida — venda, distribuição em espécie, redução de capital,
          dissolução — pode haver, além do IMT e do selo, tributação do lado da sociedade e do lado
          do sócio. É matéria que depende do caso concreto e que não se decide a partir de um guia.
        </AvisoPrazo>
        <VaiPara href="/guias/imt">Como o IMT é calculado sobre a transmissão</VaiPara>
      </Seccao>

      <Seccao titulo="Uso pessoal de imóvel da empresa">
        <Paragrafo>
          A lei antecipou o arranjo. Os prédios detidos por pessoas coletivas mas{" "}
          <strong>afetos a uso pessoal</strong> dos titulares do capital, dos membros dos órgãos
          sociais ou dos respetivos cônjuges, ascendentes e descendentes são tributados em AIMI{" "}
          <strong>à taxa das pessoas singulares</strong>, com o agravamento marginal acima de um
          milhão de euros — e sem a dedução de que as pessoas singulares beneficiam.
        </Paragrafo>
        <Paragrafo>
          Estes prédios têm ainda de ser <strong>identificados no anexo à declaração periódica de
          rendimentos</strong>. Ou seja: a afetação a uso pessoal é declarável, não é uma
          circunstância de facto que passe despercebida.
        </Paragrafo>
        <Nota titulo="Há um segundo efeito, do lado de quem usa">
          Usar sem contrapartida um bem da sociedade tende a configurar rendimento em espécie de
          quem o usa. É um dos pontos em que este guia precisa mesmo de revisão caso a caso — a
          qualificação depende do vínculo, da existência de contrato e das condições praticadas.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando faz mesmo sentido">
        <Paragrafo>
          Do que os artigos permitem afirmar, a opção pela empresa tende a fazer sentido quando{" "}
          <strong>o imóvel serve efetivamente a atividade</strong> — instalações, armazém, espaço de
          trabalho — e quando não está previsto sair da sociedade. Aí os gastos e a depreciação
          reduzem lucro que existiria de qualquer forma, e o adiamento não é um problema porque não
          há venda planeada.
        </Paragrafo>
        <Paragrafo>
          Tende a não fazer sentido quando o imóvel é habitação, quando o horizonte inclui vender ou
          passá-lo para nome pessoal, e quando o património imobiliário fica abaixo da dedução de
          AIMI das pessoas singulares — porque aí a empresa só acrescenta custos.
        </Paragrafo>
        <AvisoPrazo titulo="Esta decisão não se toma a partir de um guia">
          O que está acima é o que os artigos dizem. O que decide o teu caso são a atividade real da
          sociedade, a forma como retiras rendimento dela, o horizonte de detenção e a estrutura
          societária. Confirma com um contabilista certificado antes de escriturar seja o que for.
        </AvisoPrazo>
        <VaiPara href="/guias/unipessoal-vs-eni">
          A decisão anterior a esta: sociedade ou nome individual
        </VaiPara>
        <VaiPara href="/guias/salario-gerente-ou-dividendos">
          Como o dinheiro sai da empresa, que é metade desta conta
        </VaiPara>
      </Seccao>
    </>
  );
}
