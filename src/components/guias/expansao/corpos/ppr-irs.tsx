import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { DEDUCAO_PPR, PPR_RESGATE } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// art. 21.º do EBF (n.os 2 a 5) e art. 78.º do CIRS.
//
// O pacote dava a taxa de resgate nas condições legais como 8,6%. São dois
// quintos do rendimento tributados a 20% — ver `correcoes.ts`.
export default function CorpoPprIrs() {
  return (
    <>
      <Seccao titulo="A dedução à coleta e os limites por idade">
        <Paragrafo>
          Deduzes à coleta uma percentagem dos valores que aplicaste no ano, com um teto que{" "}
          <strong>desce com a idade</strong>. A percentagem e os três limites estão na tabela de
          dados aqui em baixo.
        </Paragrafo>
        <Paragrafo>
          Dois detalhes que mudam a conta. O primeiro: é dedução <strong>à coleta</strong>, não ao
          rendimento — abate imposto, não matéria coletável, e por isso vale mais do que uma
          dedução do mesmo montante. O segundo: o escalão etário conta pela{" "}
          <strong>idade a 1 de janeiro</strong> do ano em causa.
        </Paragrafo>
        <Nota titulo="Há um valor de entrega acima do qual não ganhas mais nada">
          Como a dedução é uma percentagem com teto, entregar acima do ponto em que o teto é
          atingido não acrescenta benefício fiscal nenhum nesse ano. Quem tem menos de 35 anos
          esgota o limite de {fmt(DEDUCAO_PPR.value.ate35)} com{" "}
          {fmt(DEDUCAO_PPR.value.ate35 / DEDUCAO_PPR.value.taxa)} entregues.
        </Nota>
        <VaiPara href="/guias/deducoes-coleta">
          As outras deduções à coleta, e o limite global que as trava
        </VaiPara>
      </Seccao>

      <Seccao titulo="As condições legais de resgate">
        <Paragrafo>
          O PPR não é uma conta à ordem com benefício fiscal. O regime favorável de resgate depende
          de o reembolso ocorrer numa das <strong>situações definidas na lei</strong> — reforma,
          idade legal de reforma, desemprego de longa duração, incapacidade permanente, doença
          grave, entre outras, além do caso de morte do subscritor.
        </Paragrafo>
        <Paragrafo>
          Há ainda uma segunda porta, que muita gente não conhece: passados{" "}
          <strong>{PPR_RESGATE.anosParaDispensa.value} anos</strong> a contar de cada entrega, e
          ocorrendo uma das situações previstas, a devolução das deduções deixa de ser exigida.
        </Paragrafo>
        <AvisoPrazo titulo="O prazo conta por entrega, não pelo plano">
          Os cinco anos contam-se a partir de <em>cada</em> entrega. Um plano aberto há dez anos
          onde continuaste a entregar todos os anos tem entregas com idades diferentes — e as mais
          recentes ainda não cumpriram o prazo.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A taxa reduzida sobre o rendimento">
        <Paragrafo>
          Resgatando nas condições legais, o que se tributa é apenas o{" "}
          <strong>rendimento</strong> — não o capital que entregaste. E tributa-se de forma
          particularmente favorável: a matéria coletável é constituída por{" "}
          <strong>dois quintos</strong> do rendimento, e a tributação é autónoma à taxa que consta
          da tabela de dados.
        </Paragrafo>
        <Paragrafo>
          Da combinação das duas coisas resulta a taxa efetiva sobre o rendimento, que também está
          nos dados abaixo — e é das mais baixas do sistema fiscal português para rendimento de
          capital.
        </Paragrafo>
        <Nota titulo="Se o resgate for em prestações regulares, o regime é outro">
          A lei distingue: recebido sob a forma de prestações regulares e periódicas, o rendimento
          segue as regras da categoria H — a das pensões — em vez das da categoria E. Não é melhor
          nem pior em abstrato; é uma conta diferente, que depende dos teus outros rendimentos.
        </Nota>
      </Seccao>

      <Seccao titulo="Resgate fora das condições: devolver com agravamento">
        <Paragrafo>
          Aqui há <strong>duas consequências, e somam-se</strong>. Confundi-las é o erro mais
          comum a falar deste produto.
        </Paragrafo>
        <Paragrafo>
          A primeira é sobre o <strong>rendimento</strong>: reembolsado fora das situações legais,
          é tributado autonomamente à taxa mais alta que consta dos dados — e{" "}
          <em>sem</em> a redução a dois quintos.
        </Paragrafo>
        <Paragrafo>
          A segunda é sobre as <strong>deduções que já usaste</strong>: as importâncias deduzidas
          são majoradas por cada ano ou fração decorrido desde o ano em que exerceste o direito à
          dedução, e acrescidas à coleta do IRS do ano em que o resgate acontece. A majoração está
          nos dados.
        </Paragrafo>
        <AvisoPrazo titulo="Quanto mais antigo o benefício, mais caro sai devolvê-lo">
          A majoração é por ano decorrido. Uma dedução usada há oito anos devolve-se com oito
          incrementos. É o que torna o resgate antecipado de um PPR antigo bastante mais caro do
          que o valor que foi deduzido na altura.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O PPR e a herança">
        <Paragrafo>
          Em caso de <strong>morte do subscritor</strong>, a lei é expressa: a devolução das
          deduções não é exigida. E as importâncias pagas pelo fundo continuam sujeitas às regras
          de tributação do rendimento previstas para o resgate — incluindo nos casos de reembolso
          por morte.
        </Paragrafo>
        <Paragrafo>
          Quem recebe deve confirmar a existência de <strong>beneficiários designados</strong> no
          contrato: havendo-os, o valor segue para eles diretamente, fora do processo de partilha
          da herança. É uma característica do produto que costuma passar despercebida a quem o
          subscreve.
        </Paragrafo>
        <VaiPara href="/guias/herdar-imovel">
          O que se participa à AT numa transmissão por morte
        </VaiPara>
      </Seccao>

      <Seccao titulo="Quando o benefício fiscal não chega para justificar o produto">
        <Paragrafo>
          A dedução tem teto anual, e é um teto baixo em termos absolutos. Como abate imposto e não
          rendimento, o ganho fiscal é o mesmo para toda a gente que atinja o limite —
          independentemente do escalão. Não é um produto que fique melhor quanto mais se ganha.
        </Paragrafo>
        <Paragrafo>
          Do outro lado da balança estão as <strong>comissões de gestão</strong>, que incidem sobre
          o capital todos os anos e não têm teto. Um benefício fiscal anual limitado pode ser
          consumido por uma comissão de gestão alta ao fim de poucos anos, e passa a haver custo
          líquido em vez de vantagem.
        </Paragrafo>
        <Nota titulo="A pergunta útil não é fiscal">
          É esta: este PPR, com esta comissão e este histórico, é um bom produto de poupança{" "}
          <em>antes</em> de qualquer benefício? Se a resposta for não, a dedução não resolve — e o
          dinheiro fica preso a um regime de resgate com condições.
        </Nota>
        <VaiPara href="/guias/reforma-antecipada">
          Se o objetivo é a reforma, há mais peças na conta
        </VaiPara>
        <VaiPara href="/guias/rendimentos-capitais-categoria-e">
          Como são tributados os outros rendimentos de capitais
        </VaiPara>
      </Seccao>
    </>
  );
}
