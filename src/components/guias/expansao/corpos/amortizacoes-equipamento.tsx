import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DEPRECIACAO, ELEMENTOS_REDUZIDO_VALOR } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra os arts. 31.º, 33.º e 34.º do CIRC
// no articulado do Portal das Finanças. As TAXAS por tipo de ativo não são
// publicadas: o n.º 1 do art. 31.º remete para o decreto regulamentar, que
// não foi possível ler em fonte oficial nesta revisão. O guia dá o
// mecanismo, que é estável, e manda ao decreto.
export default function CorpoAmortizacoesEquipamento() {
  return (
    <>
      <Seccao titulo="Mil euros é a fronteira que resolve a maioria dos casos">
        <Paragrafo>
          A pergunta «quanto tempo demora a deduzir um portátil» tem, muitas vezes, a resposta{" "}
          <strong>nenhum</strong>: quando o custo unitário de aquisição ou produção não ultrapassa{" "}
          <strong>{fmt(ELEMENTOS_REDUZIDO_VALOR.value)}</strong>, é aceite a dedução{" "}
          <strong>integral</strong> no período em que o bem é reconhecido.
        </Paragrafo>
        <Paragrafo>
          É por isso que a maior parte do equipamento informático de uma empresa pequena nunca chega a
          ser depreciado: entra todo no ano da compra.
        </Paragrafo>
        <AvisoPrazo titulo="A exceção que trava a compra «às peças»">
          A regra não se aplica quando o elemento faz parte integrante de um{" "}
          <strong>conjunto que deva ser depreciado como um todo</strong>. Comprar uma linha de
          produção em vinte faturas de novecentos euros não a transforma em vinte elementos de
          reduzido valor.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Acima disso, deprecia-se — e as taxas não estão no Código">
        <Paragrafo>
          É o ponto que mais confunde quem vai procurar a resposta ao Código do IRC e não a encontra:{" "}
          {DEPRECIACAO.taxasNoDecretoRegulamentar.value}.
        </Paragrafo>
        <Paragrafo>
          O Código dá o método — no método da linha reta, aplica-se a taxa do decreto ao custo de
          aquisição ou de produção — e remete a tabela para outro diploma. Este guia não reproduz
          essas taxas: são muitas, são por tipo de ativo, e a tabela é o sítio certo para as ler.
        </Paragrafo>
        <Nota titulo="E se o bem não estiver na tabela?">
          {DEPRECIACAO.semTaxaFixada.value}.
        </Nota>
      </Seccao>

      <Seccao titulo="O ano da compra conta a partir do mês">
        <Paragrafo>
          {DEPRECIACAO.proporcionalNoAnoDeEntrada.value}.
        </Paragrafo>
        <Paragrafo>
          Na prática: um equipamento que entra em funcionamento em outubro não deduz o ano inteiro
          nesse exercício — e o Código deixa isso à opção do sujeito passivo, não impõe. É uma escolha
          com efeito no resultado do ano, e vale a pena tomá-la de propósito.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Quotas decrescentes: adiantar a dedução">
        <Paragrafo>
          Há um segundo método, que concentra a dedução nos primeiros anos: multiplica-se o valor
          ainda não depreciado pela taxa, corrigida por um coeficiente que cresce com a vida útil do
          bem.
        </Paragrafo>
        <Paragrafo>
          {DEPRECIACAO.quotasDecrescentes.value.map((c) => `${String(c.coeficiente).replace(".", ",")} para vida útil ${c.vidaUtil}`).join(" · ")}.
        </Paragrafo>
        <Nota titulo="Não deduz mais — deduz mais cedo">
          O total deduzido ao longo da vida do bem é o mesmo. O que muda é a distribuição no tempo, e
          é isso que interessa a quem tem lucro alto num ano e espera menos no seguinte.
        </Nota>
      </Seccao>

      <Seccao titulo="O que a lei não aceita como gasto">
        <Paragrafo>
          {DEPRECIACAO.naoDedutiveis.value}.
        </Paragrafo>
        <AvisoPrazo titulo="A parte do terreno não deprecia">
          Num imóvel, só o edificado é depreciável. Depreciar o valor todo é uma das correções mais
          comuns em inspeção — e das mais fáceis de detetar, porque a repartição consta da própria
          caderneta.
        </AvisoPrazo>
        <VaiPara href="/guias/viatura-empresa">
          As viaturas, que têm limite próprio e tributação autónoma por cima
        </VaiPara>
      </Seccao>

      <Seccao titulo="A rotina que evita correções">
        <Passos
          passos={[
            {
              titulo: "Registar a data de entrada em funcionamento, não a da fatura",
              texto: "É a que conta para começar a depreciar. Um equipamento faturado em dezembro e instalado em fevereiro deprecia a partir de fevereiro.",
            },
            {
              titulo: "Separar o custo do bem do custo do que não deprecia",
              texto: "Terrenos, formação, licenças de duração limitada. Cada um tem o seu tratamento, e a fatura única obriga a repartir.",
            },
            {
              titulo: "Verificar se o bem cabe no limiar de reduzido valor",
              texto: "É a verificação mais rentável desta lista: dedução toda no ano, sem mapa de depreciações, sem controlo plurianual.",
            },
            {
              titulo: "Manter o mapa de depreciações a par do inventário",
              texto: "Bens abatidos que continuam a depreciar, e bens em uso que já foram totalmente depreciados, são os dois sintomas de um mapa que deixou de refletir a realidade.",
            },
            {
              titulo: "Confirmar as taxas no decreto regulamentar do ano",
              texto: "É onde vivem, e é lá que se confirmam — não em tabelas copiadas de artigos.",
            },
            {
              titulo: "Escolher o método com intenção",
              texto: "Linha reta ou quotas decrescentes muda o resultado dos primeiros anos. A escolha faz-se no início e tem consequências durante toda a vida do bem.",
            },
          ]}
        />
        <VaiPara href="/guias/rfai">
          O mesmo investimento visto pelo lado do benefício fiscal
        </VaiPara>
        <VaiPara href="/guias/despesas-dedutiveis">
          O que se deduz de uma vez, e o que não
        </VaiPara>
      </Seccao>

      <Seccao titulo="Obras em espaço arrendado e ativos intangíveis">
        <Paragrafo>
          Obras feitas num espaço que não é teu não desaparecem no ano da despesa: são{" "}
          <strong>benfeitorias</strong>, e o Código manda calcular a depreciação com base no{" "}
          <strong>período de vida útil esperada</strong> — o que, num arrendamento, costuma ser a
          duração do contrato.
        </Paragrafo>
        <Paragrafo>
          Os <strong>ativos intangíveis</strong> seguem lógica própria. Uma licença de software com
          duração limitada amortiza-se ao longo dessa duração; uma subscrição mensal não é ativo
          nenhum, é gasto do período. Confundir as duas coisas é a origem de metade dos ajustamentos
          nesta matéria.
        </Paragrafo>
        <Nota titulo="A regra é sempre a mesma">
          Se o bem se consome no período, é gasto. Se serve vários períodos, é ativo — e reparte-se
          por eles.
        </Nota>
      </Seccao>
    </>
  );
}
