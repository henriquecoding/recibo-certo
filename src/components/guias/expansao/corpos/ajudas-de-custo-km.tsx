import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import {
  ABONO_PARA_FALHAS,
  AJUDAS_CUSTO,
  AJUDAS_CUSTO_PRESSUPOSTOS,
  SUBSIDIO_REFEICAO,
  SUBSIDIO_REFEICAO_MAJORACAO_VALES,
  TA_AJUDAS_CUSTO,
} from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o art. 2.º, n.º 3, als. b), c) e d)
// do CIRS no articulado do Portal das Finanças — a al. b), 2) já na redação
// da Lei n.º 45-A/2024. O limite por QUILÓMETRO não é publicado: a al. d)
// remete para os limites legais dos servidores do Estado, fixados por
// diploma próprio que não foi possível confirmar nesta revisão.
export default function CorpoAjudasDeCustoKm() {
  return (
    <>
      <Seccao titulo="Não são salário — até deixarem de não ser">
        <Paragrafo>
          Ajudas de custo, quilómetros e subsídio de refeição têm um tratamento próprio: dentro dos
          limites legais, <strong>não pagam IRS nem Segurança Social</strong>. É o que faz deles a
          forma mais eficiente de compensar despesas de trabalho.
        </Paragrafo>
        <Paragrafo>
          Acima dos limites, o excedente é <strong>remuneração para todos os efeitos</strong> — entra
          na retenção, entra na base contributiva, e entra no cálculo de subsídios e de indemnizações.
          Não há meio-termo.
        </Paragrafo>
        <Nota titulo="É o excedente que é tributado, não o abono todo">
          Um abono acima do limite não perde a isenção da parte que cabia dentro dele. Tributa-se a
          diferença.
        </Nota>
      </Seccao>

      <Seccao titulo="Subsídio de refeição: um limite, e uma majoração">
        <Paragrafo>
          A lei não fixa dois valores. Fixa um — <strong>{fmt(SUBSIDIO_REFEICAO.dinheiro.value)}</strong>{" "}
          por dia em numerário — e diz que o limite é excedido em{" "}
          <strong>{pctExato(SUBSIDIO_REFEICAO_MAJORACAO_VALES.value)}</strong> sempre que o subsídio
          seja atribuído através de <strong>vales de refeição</strong>.
        </Paragrafo>
        <Paragrafo>
          Daí o valor do cartão: <strong>{fmt(SUBSIDIO_REFEICAO.cartao.value)}</strong>. Não é um
          segundo número independente — é o primeiro, majorado. Quando um sobe, o outro acompanha.
        </Paragrafo>
        <AvisoPrazo titulo="É a diferença que mais dinheiro deixa em cima da mesa">
          Entre pagar em dinheiro e pagar em cartão vão{" "}
          {fmt(SUBSIDIO_REFEICAO.cartao.value - SUBSIDIO_REFEICAO.dinheiro.value)} por dia de trabalho,
          livres de imposto e de contribuições dos dois lados. Ao longo de um ano, é dinheiro a sério —
          e a mudança não custa nada à empresa.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Ajudas de custo: dois patamares, não um">
        <Paragrafo>
          O Código não fixa valores: remete para os limites legais dos <strong>servidores do
          Estado</strong>. E a tabela do Estado tem escalões — o que faz com que o setor privado tenha
          dois patamares, e não um só.
        </Paragrafo>
        <Paragrafo>
          · <strong>Trabalhadores em geral</strong> —{" "}
          {fmt(AJUDAS_CUSTO.nacionalDia.value)} por dia em território nacional e{" "}
          {fmt(AJUDAS_CUSTO.estrangeiroDia.value)} em deslocação ao estrangeiro.
          <br />· <strong>Administradores, gerentes e membros de órgãos estatutários</strong> —{" "}
          {fmt(AJUDAS_CUSTO.nacionalDiaDirecao.value)} e{" "}
          {fmt(AJUDAS_CUSTO.estrangeiroDiaDirecao.value)}, por lhes corresponder o escalão equiparado
          a membros do Governo.
        </Paragrafo>
        <Nota titulo="Usar o patamar errado custa nos dois sentidos">
          Aplicar o do trabalhador a um gerente tributa o que estava isento. Aplicar o do gerente a um
          trabalhador deixa passar rendimento que devia ser tributado — e é a administração fiscal que
          o descobre depois.
        </Nota>
      </Seccao>

      <Seccao titulo="Os quilómetros em viatura própria">
        <Paragrafo>
          Quem usa o carro pessoal em serviço da entidade patronal tem direito a ser reembolsado por
          quilómetro, e esse reembolso é isento dentro do limite legal.
        </Paragrafo>
        <Paragrafo>
          Este guia <strong>não publica o valor por quilómetro</strong>. A lei fiscal remete para os
          limites dos servidores do Estado, que são fixados por diploma próprio e atualizados, e não
          foi possível confirmar o que está em vigor nesta revisão. Confirma-o antes de fixar a tabela
          interna da empresa — publicar um cêntimo errado aqui replica-se por milhares de quilómetros.
        </Paragrafo>
        <AvisoPrazo titulo="O boletim de itinerário não é papelada">
          Data, origem, destino, motivo, quilómetros, matrícula. Sem ele, o reembolso não é reembolso
          de nada — é remuneração, e é assim que é tratado numa inspeção.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A condição que quase ninguém verifica">
        <Paragrafo>
          Ficar abaixo do limite não chega. A lei diz que{" "}
          {AJUDAS_CUSTO_PRESSUPOSTOS.value}.
        </Paragrafo>
        <Paragrafo>
          Os pressupostos do regime público são coisas concretas: haver uma <strong>deslocação em
          serviço</strong>, para fora do local de trabalho habitual, com carácter temporário. Uma
          ajuda de custo paga todos os meses, com o mesmo valor, a quem trabalha sempre no mesmo
          sítio, não cumpre nenhum deles — e é requalificada como salário.
        </Paragrafo>
        <AvisoPrazo titulo="É o esquema mais comum, e o mais fácil de desmontar">
          Substituir parte do salário por ajudas de custo fixas é uma prática antiga. Não sobrevive a
          uma inspeção: sem deslocação, não há ajuda de custo — e a requalificação traz IRS,
          contribuições e coimas dos dois lados.
        </AvisoPrazo>
        <Paragrafo>
          Na mesma alínea, a lei tributa ainda as verbas para despesas de deslocação, viagens ou
          representação <strong>de que não tenham sido prestadas contas até ao termo do
          exercício</strong>. Um adiantamento por justificar transforma-se em rendimento no fim do ano.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="E o abono para falhas">
        <Paragrafo>
          É o parente esquecido desta família: devido a quem, no seu trabalho, tenha de{" "}
          <strong>movimentar numerário</strong>. Também não tem valor em euros — tem percentagem.
        </Paragrafo>
        <Paragrafo>
          É rendimento do trabalho apenas na parte em que exceda{" "}
          <strong>{pctExato(ABONO_PARA_FALHAS.value)}</strong> da remuneração mensal fixa. Abaixo
          disso, não paga IRS.
        </Paragrafo>
        <Nota titulo="Indexado ao salário, e não a uma tabela">
          Sobe quando o salário sobe, sozinho. É das poucas isenções do Código que não precisa de
          atualização anual.
        </Nota>
      </Seccao>

      <Seccao titulo="Do lado da empresa: a tributação autónoma">
        <Paragrafo>
          O que para o trabalhador é isento pode, para a empresa, ter custo. As ajudas de custo e os
          encargos com a viatura própria do trabalhador são tributados autonomamente à taxa de{" "}
          <strong>{pctExato(TA_AJUDAS_CUSTO.value)}</strong>.
        </Paragrafo>
        <Paragrafo>
          Há duas saídas, e ambas estão na própria norma: os encargos <strong>faturados a
          clientes</strong> não pagam autónoma; e os que sejam <strong>tributados em IRS</strong> na
          esfera de quem os recebe também não. É a razão pela qual, em consultoria, faturar as
          deslocações ao cliente é mais eficiente do que absorvê-las.
        </Paragrafo>
        <VaiPara href="/guias/tributacao-autonoma">
          As restantes taxas do artigo 88.º
        </VaiPara>
        <VaiPara href="/guias/viatura-empresa">
          Comprar pela empresa ou reembolsar quilómetros, com números
        </VaiPara>
      </Seccao>

      <Seccao titulo="A rotina que sobrevive a uma inspeção">
        <Passos
          passos={[
            {
              titulo: "Pagar o subsídio de refeição em cartão",
              texto: `A majoração de ${pctExato(SUBSIDIO_REFEICAO_MAJORACAO_VALES.value)} é a decisão com melhor retorno desta lista, e é administrativa.`,
            },
            {
              titulo: "Separar o patamar de cada pessoa na tabela interna",
              texto: "Trabalhadores num, órgãos estatutários noutro. Uma tabela única aplica sempre o limite errado a metade das pessoas.",
            },
            {
              titulo: "Exigir boletim de itinerário por deslocação",
              texto: "Data, trajeto, motivo, quilómetros. É o documento que separa reembolso de remuneração.",
            },
            {
              titulo: "Confirmar que há mesmo deslocação em serviço",
              texto: "Ajudas de custo fixas, mensais e iguais para quem não se desloca são o padrão que a administração fiscal procura primeiro.",
            },
            {
              titulo: "Prestar contas dos adiantamentos até ao fim do exercício",
              texto: "Verbas por justificar a 31 de dezembro passam a ser rendimento tributável. É uma limpeza de dezembro, não de abril.",
            },
            {
              titulo: "Faturar as deslocações ao cliente sempre que for possível",
              texto: "Evita a tributação autónoma na empresa, e torna o custo visível a quem o gerou.",
            },
            {
              titulo: "Confirmar os limites do ano antes de fixar a tabela",
              texto: "Os valores acompanham as atualizações do regime dos servidores do Estado. Uma tabela interna copiada de há dois anos tributa a menos — e a diferença é da empresa.",
            },
          ]}
        />
        <VaiPara href="/guias/recibo-vencimento">
          Onde estas parcelas aparecem no recibo
        </VaiPara>
        <VaiPara href="/guias/teletrabalho">
          As despesas do teletrabalho, que seguem lógica diferente
        </VaiPara>
      </Seccao>
    </>
  );
}
