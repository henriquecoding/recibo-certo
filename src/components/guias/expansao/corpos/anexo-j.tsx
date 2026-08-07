import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { CREDITO_IMPOSTO_ESTRANGEIRO } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 15.º, 16.º, 22.º, 57.º e 81.º do CIRS.
//
// A numeração dos quadros do Anexo J muda quase todos os anos — o pacote
// avisa disso e tem razão. Este corpo fala do QUE vai a cada bloco, nunca
// do número do quadro.
export default function CorpoAnexoJ() {
  return (
    <>
      <Seccao titulo="Residência fiscal e tributação do rendimento mundial">
        <Paragrafo>
          A regra que explica tudo o resto está numa frase do art. 15.º: sendo residente em
          território português, o IRS incide sobre a{" "}
          <strong>totalidade dos teus rendimentos, incluindo os obtidos fora</strong> desse
          território. Não há uma fronteira fiscal a separar o que ganhas cá do que ganhas lá.
        </Paragrafo>
        <Paragrafo>
          O inverso também consta: aos <strong>não residentes</strong>, o IRS incide unicamente
          sobre os rendimentos obtidos em território português. É por isso que a primeira pergunta
          nunca é «onde está o dinheiro» — é «onde é a minha residência fiscal».
        </Paragrafo>
        <Nota titulo="A residência pode ser parcial no mesmo ano">
          Quem chega ou sai a meio do ano pode ter dois estatutos no mesmo ano civil, e a regra
          aplica-se a cada um deles separadamente. Não é uma média nem uma escolha — é um período
          com cada estatuto.
        </Nota>
        <VaiPara href="/guias/residencia-fiscal">
          Como se determina a residência fiscal, e o que a muda
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que vai a cada quadro">
        <Paragrafo>
          O Anexo J não é uma categoria de rendimento: é o <strong>anexo do estrangeiro</strong>.
          Recolhe rendimentos de todas as categorias, desde que a fonte seja de fora — trabalho
          dependente pago por entidade estrangeira, rendimentos empresariais, juros e dividendos de
          contas lá fora, rendas de imóveis no estrangeiro, mais-valias de ativos vendidos fora,
          pensões.
        </Paragrafo>
        <Paragrafo>
          Cada bloco pede três coisas: o <strong>país da fonte</strong>, o{" "}
          <strong>rendimento bruto</strong> e o <strong>imposto pago no estrangeiro</strong>. O país
          não é decorativo — é ele que determina que convenção se aplica, e portanto qual o teto do
          crédito de imposto.
        </Paragrafo>
        <AvisoPrazo titulo="Não decores números de quadro">
          A numeração dos quadros do Anexo J muda quase todos os anos. Guias que citam «quadro 8A»
          envelhecem em janeiro. Trabalha pelo tipo de rendimento e confirma o mapeamento no
          formulário do ano em causa, publicado pela AT.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A obrigação de identificar contas no estrangeiro">
        <Paragrafo>
          Esta é a que apanha mais gente desprevenida, porque não depende de haver rendimento
          nenhum. Existe uma obrigação de <strong>identificar as contas de depósitos ou de títulos
          abertas em instituição financeira não residente</strong> de que sejas titular,
          beneficiário ou estejas autorizado a movimentar.
        </Paragrafo>
        <Paragrafo>
          «Sem movimentos» não é exceção. Uma conta de corretora aberta e esquecida, com saldo zero,
          continua a ser uma conta a identificar. E «autorizado a movimentar» é mais largo do que
          «titular»: quem tem procuração sobre a conta de outra pessoa também está abrangido.
        </Paragrafo>
        <Nota titulo="O IBAN chega — o saldo não é pedido">
          A obrigação é de identificação, não de declaração de património. Pede-se o número
          internacional da conta e o país; não se declara saldo nem movimentos.
        </Nota>
      </Seccao>

      <Seccao titulo="Imposto pago lá fora e crédito de imposto cá">
        <Paragrafo>
          Declarar rendimento estrangeiro não significa pagá-lo duas vezes. O art. 81.º dá direito a
          um <strong>crédito de imposto por dupla tributação jurídica internacional</strong> — e
          fixa-lhe um limite que é o menor de dois valores: o imposto sobre o rendimento pago no
          estrangeiro, ou a fração da coleta do IRS correspondente a esses rendimentos.
        </Paragrafo>
        <Paragrafo>
          Havendo convenção com o país da fonte, entra um segundo teto: a dedução{" "}
          <strong>não pode ultrapassar o imposto pago nos termos previstos pela convenção</strong>.
          Quem sofreu retenção acima da taxa convencionada não recupera o excesso cá — recupera-o no
          país da fonte, se o pedir lá.
        </Paragrafo>
        <Paragrafo>
          E se a coleta do ano não chegar para absorver o crédito, ele não se perde de imediato: o
          remanescente pode ser deduzido nos {CREDITO_IMPOSTO_ESTRANGEIRO.reporteAnos.value}{" "}
          períodos de tributação seguintes.
        </Paragrafo>
        <VaiPara href="/guias/credito-imposto-estrangeiro">
          O duplo limite em detalhe, com o caso dos dividendos
        </VaiPara>
      </Seccao>

      <Seccao titulo="Conversão cambial e datas">
        <Paragrafo>
          Tudo se declara em <strong>euros</strong>, e a conversão faz-se pelo câmbio da{" "}
          <strong>data de cada operação</strong> — não pelo câmbio de 31 de dezembro, nem por uma
          média anual escolhida por conveniência.
        </Paragrafo>
        <Paragrafo>
          Para mais-valias isto significa <em>duas</em> conversões, e é aí que a conta se torna
          diferente da que a corretora mostra: converte-se o custo de aquisição ao câmbio do dia da
          compra e o valor de realização ao câmbio do dia da venda. O ganho em euros pode ser
          diferente do ganho em dólares — pode até existir sem ter existido na moeda original.
        </Paragrafo>
        <Nota titulo="É por isto que o relatório da corretora não serve tal e qual">
          O relatório vem quase sempre na moeda da conta e com o ganho já calculado nessa moeda.
          Copiar esse número para a declaração é declarar um ganho que não é o ganho fiscal
          português.
        </Nota>
      </Seccao>

      <Seccao titulo="Erros que geram divergências automáticas">
        <Passos
          passos={[
            {
              titulo: "Declarar o líquido em vez do bruto",
              texto: "O rendimento declara-se pelo bruto, e o imposto retido lá fora vai em campo próprio. Declarar o valor que chegou à conta faz desaparecer o crédito de imposto — pagas a mais e não dás por isso.",
            },
            {
              titulo: "Omitir a conta por não ter rendimentos",
              texto: "A identificação da conta é autónoma. Não depende de ter havido juros, dividendos ou vendas nesse ano.",
            },
            {
              titulo: "Somar países num só bloco",
              texto: "O país determina a convenção aplicável e o teto do crédito. Agregar rendimentos de países diferentes numa linha só torna o crédito impossível de apurar.",
            },
            {
              titulo: "Usar o câmbio de fim de ano",
              texto: "A conversão é à data de cada operação. É a origem mais comum de divergências em mais-valias.",
            },
          ]}
        />
        <Paragrafo>
          Estas divergências são detetadas automaticamente porque Portugal recebe informação de
          outras administrações fiscais ao abrigo da troca automática de informações. O que a AT
          recebe do estrangeiro é comparado com o que declaraste — e a ausência de declaração é tão
          visível como um valor diferente.
        </Paragrafo>
        <VaiPara href="/guias/corretoras-estrangeiras-irs">
          O caso concreto de quem investe através de corretora estrangeira
        </VaiPara>
        <VaiPara href="/guias/rendimentos-capitais-categoria-e">
          Juros e depósitos: o que muda quando o pagador é estrangeiro
        </VaiPara>
      </Seccao>
    </>
  );
}
