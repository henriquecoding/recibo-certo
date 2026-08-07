import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DEPENDENTES_IRS, PENSAO_ALIMENTOS_IRS } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 83.º-A do CIRS (n.os 1 e 2), art. 13.º (n.os 5, 7 e 8) e art. 78.º.
//
// O pacote manda sublinhar a incompatibilidade entre deduzir alimentos e
// declarar o mesmo filho como dependente — «é o erro mais frequente». Está
// escrita no próprio n.º 1 do art. 83.º-A, e tem secção própria.
export default function CorpoPensaoAlimentosIrs() {
  return (
    <>
      <Seccao titulo="O requisito que decide tudo: sentença ou homologação">
        <Paragrafo>
          Antes de qualquer conta, há uma condição que abre ou fecha o direito por inteiro: a
          obrigação de pagar alimentos tem de resultar de{" "}
          <strong>{PENSAO_ALIMENTOS_IRS.exigeTituloJudicial.value}</strong>.
        </Paragrafo>
        <Paragrafo>
          Não basta pagar. Não basta ter acordado com o outro progenitor, por escrito que seja. Não
          basta haver transferências mensais regulares durante anos. Sem sentença ou acordo
          homologado, <strong>não há dedução</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="É a razão mais comum de a dedução ser recusada">
          Muitos pais separados combinam entre si e cumprem escrupulosamente. Fiscalmente, esse
          acordo não existe — e o valor pago não desce um cêntimo ao imposto. Homologar o acordo
          resolve isso para o futuro, e é um passo que se faz uma vez.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A dedução e a ausência de limite">
        <Paragrafo>
          Deduzem-se à coleta <strong>{pctExato(PENSAO_ALIMENTOS_IRS.taxa.value)}</strong> das
          importâncias <strong>comprovadamente suportadas e não reembolsadas</strong>.
        </Paragrafo>
        <Paragrafo>
          E é das poucas deduções do Código do IRS <strong>sem limite máximo</strong>. A norma não
          fixa teto: paga-se mais, deduz-se mais, sem plafond.
        </Paragrafo>
        <Nota titulo="Deduz-se à coleta, não ao rendimento">
          A distinção muda a leitura do resultado: sobre <strong>{fmt(3000)}</strong> pagos no ano, a
          fração dedutível dá <strong>{fmt(3000 * PENSAO_ALIMENTOS_IRS.taxa.value)}</strong> abatidos
          ao <em>imposto</em>, não ao rendimento — e valem esse montante inteiro, seja qual for o teu
          escalão.
        </Nota>
        <AvisoPrazo titulo="Mas conta para o limite global das deduções">
          A ausência de limite é da própria norma. O limite global das deduções à coleta, em função do
          rendimento coletável, continua a aplicar-se — e quem já está no teto não ganha mais por
          acrescentar esta.
        </AvisoPrazo>
        <VaiPara href="/guias/deducoes-coleta">
          O limite global das deduções à coleta
        </VaiPara>
      </Seccao>

      <Seccao titulo="O lado de quem recebe">
        <Paragrafo>
          As pensões de alimentos são <strong>rendimento da categoria H</strong> de quem as recebe —
          a mesma categoria das pensões. Não são uma transferência neutra.
        </Paragrafo>
        <Paragrafo>
          Recebendo o filho a pensão, é dele o rendimento — e é a situação dele que importa para o
          limite de rendimentos do dependente, tratado mais abaixo.
        </Paragrafo>
        <Nota titulo="Há uma taxa autónoma própria">
          As pensões de alimentos enquadráveis no art. 83.º-A podem ser tributadas autonomamente a uma
          taxa própria, mais baixa do que as progressivas. Confirma o enquadramento do teu caso — a
          opção existe e nem sempre é a melhor.
        </Nota>
      </Seccao>

      <Seccao titulo="Filhos que também são dependentes: a incompatibilidade">
        <Paragrafo>
          É o erro mais frequente desta matéria, e a lei fecha-o expressamente no próprio artigo: a
          dedução não se aplica quando o beneficiário{" "}
          <strong>faça parte do mesmo agregado familiar</strong> para efeitos fiscais, ou
          relativamente ao qual estejam previstas <strong>outras deduções à coleta</strong> ao abrigo
          do art. 78.º.
        </Paragrafo>
        <Paragrafo>
          Por outras palavras: <strong>ou deduzes a pensão, ou declaras o filho como dependente</strong>.
          Não as duas.
        </Paragrafo>
        <AvisoPrazo titulo="E lembra-te de que ele não pode estar em dois agregados">
          A lei diz que um dependente não pode fazer parte de mais de um agregado familiar. Numa
          separação, isso significa que o filho está no agregado de um dos dois — e é o outro que
          tipicamente deduz a pensão.
        </AvisoPrazo>
        <Nota titulo="Faz a conta às duas hipóteses antes de decidir">
          Não há resposta universal: depende do valor da pensão, das despesas do filho e dos
          rendimentos de cada progenitor. Vale a pena simular os dois cenários — a diferença costuma
          ser material.
        </Nota>
        <VaiPara href="/guias/guarda-partilhada-irs">
          A repartição das deduções em guarda conjunta
        </VaiPara>
        <VaiPara href="/dashboard/simulador">Simular as duas hipóteses</VaiPara>
      </Seccao>

      <Seccao titulo="Prova de pagamento que a AT aceita">
        <Passos
          passos={[
            {
              titulo: "A sentença ou o acordo homologado",
              texto: "É o documento que abre o direito. Sem ele, nada do resto interessa.",
            },
            {
              titulo: "Transferência bancária identificada",
              texto: "Com o beneficiário identificado e uma descrição que ligue à obrigação. É a prova mais limpa que existe.",
            },
            {
              titulo: "Não pagues em dinheiro",
              texto: "Um pagamento em numerário sem recibo não é comprovável. A lei exige importâncias «comprovadamente suportadas» — e a prova é tua.",
            },
            {
              titulo: "Uma transferência por mês, no valor exato",
              texto: "Pagamentos irregulares, arredondados ou misturados com outras despesas dificultam a demonstração de quanto foi pensão.",
            },
            {
              titulo: "Guarda tudo, ano a ano",
              texto: "Extratos e comprovativos. A AT pode pedi-los anos depois, e a dedução sem prova é revertida com juros.",
            },
          ]}
        />
        <AvisoPrazo titulo="«Não reembolsadas» é uma condição, não uma formalidade">
          Valores que te sejam devolvidos, ou compensados noutra forma, não contam. O que se deduz é o
          encargo efetivo e definitivo.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Onde se declara em cada caso">
        <Paragrafo>
          <strong>Quem paga</strong> declara os montantes suportados no campo próprio das deduções à
          coleta, com a identificação fiscal do beneficiário. Sem esse número, a dedução não é
          associada a ninguém — e é recusada.
        </Paragrafo>
        <Paragrafo>
          <strong>Quem recebe</strong> declara-as como rendimento da categoria H, no anexo próprio.
          Recebendo o filho maior, é ele que declara — e é o rendimento dele que conta para o limite
          de dependente.
        </Paragrafo>
        <Nota titulo="Para filhos maiores há requisitos acrescidos">
          A dedução de pensões atribuídas a filhos maiores depende da verificação dos requisitos do
          art. 13.º: não ter mais de {DEPENDENTES_IRS.idadeMaxima.value} anos, e rendimentos anuais
          não superiores a {fmt(DEPENDENTES_IRS.limiteRendimentoAnual.value)} — o valor da retribuição
          mínima mensal garantida, para que a lei remete.
        </Nota>
        <VaiPara href="/guias/dependentes-irs">
          Até quando um filho conta como dependente
        </VaiPara>
        <VaiPara href="/guias/divorcio-irs">
          O que muda no IRS a partir do divórcio
        </VaiPara>
      </Seccao>
    </>
  );
}
