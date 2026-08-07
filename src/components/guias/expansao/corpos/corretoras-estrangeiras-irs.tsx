import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { MAIS_VALIAS_REPORTE } from "@/lib/fiscal-data";

// Corpo verificado contra o articulado no Portal das Finanças a 06/08/2026:
// arts. 5.º, 10.º, 43.º, 71.º, 72.º e 81.º do CIRS.
//
// O pacote pede que não se nomeiem corretoras em afirmações normativas —
// e tem razão: o regime não depende da plataforma. Aqui só se descreve o
// fluxo operacional, que é igual em todas.
export default function CorpoCorretorasEstrangeirasIrs() {
  return (
    <>
      <Seccao titulo="Porque não vem pré-preenchido">
        <Paragrafo>
          O IRS pré-preenchido alimenta-se do que as entidades portuguesas comunicam à AT. Uma
          corretora sem sede, direção efetiva ou estabelecimento estável em Portugal{" "}
          <strong>não tem essa obrigação</strong> — e por isso não comunica nada.
        </Paragrafo>
        <Paragrafo>
          O que não muda é a tributação. Sendo residente, és tributado pela totalidade dos teus
          rendimentos, incluindo os obtidos fora. A ausência de pré-preenchimento não é uma
          tolerância: é trabalho que passa para o teu lado.
        </Paragrafo>
        <Nota titulo="E a AT sabe que a conta existe">
          Portugal participa na troca automática de informações financeiras. A administração fiscal
          do país da corretora comunica os dados da conta à AT. O que não é comunicado é o cálculo
          da mais-valia em euros — esse ninguém o faz por ti.
        </Nota>
      </Seccao>

      <Seccao titulo="O relatório fiscal: o que pedir a cada corretora">
        <Paragrafo>
          Praticamente todas disponibilizam um relatório anual, com nomes diferentes. O que importa
          não é o nome — é conter estes campos, operação a operação:
        </Paragrafo>
        <Paragrafo>
          · <strong>Data</strong> de aquisição e de alienação de cada lote.
          <br />· <strong>Quantidade</strong> e <strong>preço unitário</strong> em cada uma.
          <br />· <strong>Moeda</strong> da operação.
          <br />· <strong>Comissões</strong> e encargos de cada transação.
          <br />· <strong>Dividendos brutos</strong> e <strong>imposto retido na origem</strong>,
          por país.
        </Paragrafo>
        <AvisoPrazo titulo="Exporta antes de precisares">
          O histórico completo nem sempre está disponível anos depois, e contas encerradas perdem o
          acesso. Exporta o relatório de cada ano no início do ano seguinte, e guarda-o fora da
          plataforma.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Mais-valias: imputação de lotes e conversão cambial">
        <Paragrafo>
          Duas dificuldades, e a segunda é a que engana mais.
        </Paragrafo>
        <Paragrafo>
          A primeira é saber <strong>que lotes</strong> foram vendidos, quando se comprou a mesma
          ação em datas e preços diferentes. Disso depende o custo de aquisição, e o método de
          imputação a aplicar é o do Código do IRS — não necessariamente o que a corretora usa no
          relatório dela.
        </Paragrafo>
        <Paragrafo>
          A segunda é a <strong>conversão cambial</strong>. Cada operação converte-se ao câmbio da
          sua própria data: a compra ao câmbio do dia da compra, a venda ao câmbio do dia da venda.
          Não é o câmbio de fim de ano nem uma média.
        </Paragrafo>
        <Nota titulo="O ganho em euros pode não ser o ganho em dólares">
          Uma posição que fechou plana em dólares pode ter ganho ou perdido em euros, só por
          movimento cambial entre as duas datas. É ganho fiscal real, e é a razão pela qual o número
          do relatório da corretora quase nunca é o número a declarar.
        </Nota>
        <Paragrafo>
          O que se declara é o <strong>saldo</strong> entre mais-valias e menos-valias do ano, não
          cada operação isoladamente. A taxa aplicável está na tabela de dados aqui em baixo.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Dividendos e retenção na origem">
        <Paragrafo>
          Os dividendos de fonte estrangeira são rendimentos de capitais e chegam-te já com{" "}
          <strong>imposto retido no país da fonte</strong>. Declaram-se pelo{" "}
          <strong>bruto</strong>, com o imposto retido indicado à parte e o país identificado.
        </Paragrafo>
        <Paragrafo>
          O imposto retido dá direito a crédito, mas com dois tetos: o menor entre o imposto pago lá
          fora e a fração da coleta portuguesa correspondente àquele rendimento — e, havendo
          convenção, nunca acima do que a convenção permitia reter.
        </Paragrafo>
        <AvisoPrazo titulo="Retenção acima da convenção não se recupera cá">
          Se a corretora reteve à taxa interna do país da fonte em vez da taxa reduzida da
          convenção, o excesso não é creditável em Portugal. Recupera-se no país da fonte, e quase
          sempre exige um formulário submetido <em>antes</em> do pagamento do dividendo.
        </AvisoPrazo>
        <VaiPara href="/guias/credito-imposto-estrangeiro">
          O duplo limite do crédito, passo a passo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Identificar a conta, mesmo sem rendimentos">
        <Paragrafo>
          A obrigação de identificar contas abertas em instituições financeiras não residentes é{" "}
          <strong>autónoma</strong> da existência de rendimento. Uma conta de corretora aberta e
          nunca usada, com saldo zero, continua a ser uma conta a identificar.
        </Paragrafo>
        <Paragrafo>
          Pede-se a identificação internacional da conta e o país. Não se declara saldo, nem
          movimentos, nem carteira.
        </Paragrafo>
        <VaiPara href="/guias/anexo-j">Onde se identificam as contas, e o resto do anexo</VaiPara>
      </Seccao>

      <Seccao titulo="Comissões e o que abate">
        <Paragrafo>
          Ao valor de aquisição acrescem, e ao de realização abatem, as{" "}
          <strong>despesas necessárias e efetivamente praticadas, inerentes à aquisição e à
          alienação</strong>. As comissões de compra e de venda cabem aí.
        </Paragrafo>
        <Paragrafo>
          Não cabem os custos de manter a conta: comissões de custódia, de inatividade ou de câmbio
          de saldo não são inerentes a uma aquisição ou alienação concreta. E também não abatem os
          juros de margem — são gastos de natureza financeira, não encargos da transação.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Checklist final antes de submeter">
        <Passos
          passos={[
            {
              titulo: "Relatório anual exportado e guardado fora da plataforma",
              texto: "Com data, quantidade, preço, moeda, comissões e imposto retido por país.",
            },
            {
              titulo: "Cada operação convertida ao câmbio da sua data",
              texto: "Compra ao câmbio do dia da compra, venda ao câmbio do dia da venda. Nunca o câmbio de 31 de dezembro.",
            },
            {
              titulo: "Dividendos pelo bruto, com o retido em campo próprio",
              texto: "Declarar o líquido faz desaparecer o crédito de imposto — pagas a mais e não dás por isso.",
            },
            {
              titulo: "País da fonte separado, rendimento a rendimento",
              texto: "É o país que determina a convenção aplicável e o teto do crédito. Agregar países torna o crédito impossível de apurar.",
            },
            {
              titulo: "Conta identificada, mesmo sem rendimentos no ano",
              texto: "A obrigação não depende de ter havido movimentos.",
            },
            {
              titulo: "Decisão sobre o englobamento tomada — e não adiada",
              texto: `Se o ano fechou negativo, o reporte para os ${MAIS_VALIAS_REPORTE.anos.value} anos seguintes depende de englobar nesse ano.`,
            },
          ]}
        />
        <VaiPara href="/guias/reporte-menos-valias">
          O que fazer com um ano que fechou a perder
        </VaiPara>
        <VaiPara href="/guias/etf-irs">
          Se o que tens são ETFs, há uma camada a mais
        </VaiPara>
      </Seccao>
    </>
  );
}
