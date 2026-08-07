import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { CREDITO_IMPOSTO_ESTRANGEIRO, DEDUCAO_ESPECIFICA_PENSOES, RESIDENCIA_FISCAL } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// arts. 15.º, 16.º, 53.º e 81.º (n.os 1, 2, 3 e 9) do CIRS.
//
// Sobre as convenções: nenhuma taxa concreta é afirmada aqui. Cada
// convenção tem as suas, e o guia manda à lista oficial da AT — como o
// pacote pede em toda a secção do estrangeiro.
export default function CorpoPensaoEstrangeira() {
  return (
    <>
      <Seccao titulo="Residência determina onde declaras">
        <Paragrafo>
          Tudo parte daqui, e é uma pergunta antes de ser uma regra: <strong>és residente fiscal em
          Portugal?</strong> Sendo, o IRS incide sobre a totalidade dos teus rendimentos, incluindo
          os obtidos fora — a pensão estrangeira entra.
        </Paragrafo>
        <Paragrafo>
          Ser residente decide-se pelos critérios do art. 16.º: mais de{" "}
          {RESIDENCIA_FISCAL.diasPermanencia.value} dias em qualquer período de{" "}
          {RESIDENCIA_FISCAL.janelaMeses.value} meses, ou o critério da habitação, que dispensa a
          contagem de dias.
        </Paragrafo>
        <AvisoPrazo titulo="Receber a pensão numa conta estrangeira não muda nada">
          O que decide é onde <em>tu</em> resides, não onde a pensão é paga nem onde está o banco. E
          a conta no estrangeiro traz uma obrigação adicional: a de a identificar.
        </AvisoPrazo>
        <VaiPara href="/guias/residencia-fiscal">
          Os critérios de residência, e como se contam os dias
        </VaiPara>
      </Seccao>

      <Seccao titulo="O artigo das pensões na convenção">
        <Paragrafo>
          Havendo convenção entre Portugal e o país que paga a pensão, é ela que reparte o direito de
          tributar. E o artigo das pensões é, de todos, o que <strong>mais varia</strong> entre
          convenções.
        </Paragrafo>
        <Paragrafo>
          A regra mais comum atribui o direito de tributar ao <strong>Estado de residência</strong> —
          Portugal, no teu caso. Mas há convenções que o atribuem ao Estado da fonte, e há
          convenções com regras mistas em função do montante ou do tipo de pensão.
        </Paragrafo>
        <AvisoPrazo titulo="Não há «a regra das convenções» — há a tua convenção">
          Consulta o texto da convenção com o país em causa, na lista oficial publicada pela
          Autoridade Tributária. Números lidos numa convenção não valem para outra, e a diferença
          entre duas pode ser a de pagar cá ou lá.
        </AvisoPrazo>
        <VaiPara href="/guias/convencao-dupla-tributacao">
          Como ler uma convenção, artigo a artigo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Pensões públicas: a exceção">
        <Paragrafo>
          É a distinção mais importante deste guia, e a que mais gente desconhece. As convenções
          tratam separadamente as pensões pagas <strong>por causa de serviços prestados ao
          Estado</strong> — funções públicas — e as restantes.
        </Paragrafo>
        <Paragrafo>
          Na generalidade das convenções, as pensões públicas são tributadas{" "}
          <strong>no Estado que as paga</strong>, e não no de residência. Um antigo funcionário
          público de outro país, residente em Portugal, pode ter a pensão tributada lá — ao contrário
          do que aconteceria com uma pensão privada do mesmo país.
        </Paragrafo>
        <Nota titulo="E há exceções à exceção">
          Várias convenções devolvem a tributação ao Estado de residência quando o beneficiário é{" "}
          <em>nacional</em> desse Estado. É por isto que este ponto se resolve com o texto da
          convenção à frente, e não por analogia.
        </Nota>
        <AvisoPrazo titulo="A distinção não é «Segurança Social» contra «fundo privado»">
          Uma pensão da segurança social de outro país é normalmente uma pensão privada para efeitos
          da convenção. O que faz uma pensão ser pública é ter origem em serviços prestados ao
          Estado, não a natureza da entidade que a paga.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Crédito de imposto ou isenção">
        <Paragrafo>
          Atribuído o direito de tributar, sobra a pergunta de como se evita pagar duas vezes. A
          convenção diz qual dos dois métodos se aplica.
        </Paragrafo>
        <Paragrafo>
          No <strong>método do crédito</strong>, a pensão é tributada cá e desconta-se o imposto pago
          lá — pelo menor entre {CREDITO_IMPOSTO_ESTRANGEIRO.duploLimite.value[0]} e{" "}
          {CREDITO_IMPOSTO_ESTRANGEIRO.duploLimite.value[1]}, e nunca acima do que a convenção
          permitia reter. Não chegando a coleta do ano, o remanescente reporta-se por{" "}
          {CREDITO_IMPOSTO_ESTRANGEIRO.reporteAnos.value} anos.
        </Paragrafo>
        <Paragrafo>
          No <strong>método da isenção com progressividade</strong>, a pensão não é tributada cá —
          mas é <strong>obrigatoriamente englobada</strong> para determinar a taxa aplicável aos
          restantes rendimentos. Não paga, mas empurra o resto para cima.
        </Paragrafo>
        <AvisoPrazo titulo="Isenção com progressividade não é «não declarar»">
          É o erro mais comum de quem beneficia deste método. A pensão declara-se, entra no cálculo
          da taxa, e só depois é retirada da tributação. Omiti-la altera a taxa de tudo o resto.
        </AvisoPrazo>
        <VaiPara href="/guias/credito-imposto-estrangeiro">
          O duplo limite do crédito, passo a passo
        </VaiPara>
      </Seccao>

      <Seccao titulo="Onde se declara">
        <Paragrafo>
          No <strong>anexo do estrangeiro</strong>, pelo <strong>bruto</strong>, com o país da fonte
          identificado e o imposto aí retido em campo próprio. Nunca pelo líquido recebido —
          declarar o líquido faz desaparecer o crédito de imposto.
        </Paragrafo>
        <Paragrafo>
          A dedução específica da categoria H aplica-se igualmente, venha a pensão de onde vier:{" "}
          <strong>{fmt(DEDUCAO_ESPECIFICA_PENSOES.value)}</strong>, que é o valor para que o art.
          53.º remete.
        </Paragrafo>
        <AvisoPrazo titulo="E a conta bancária no estrangeiro identifica-se, mesmo sem rendimentos">
          A obrigação de identificar contas abertas em instituições financeiras não residentes é
          autónoma da existência de rendimento. A conta onde a pensão é depositada entra nela.
        </AvisoPrazo>
        <Nota titulo="Nada disto vem pré-preenchido">
          Nenhuma entidade estrangeira comunica à AT portuguesa. A declaração fica em branco — a
          obrigação de a preencher, não.
        </Nota>
        <VaiPara href="/guias/anexo-j">
          O anexo do estrangeiro, e a identificação de contas
        </VaiPara>
      </Seccao>

      <Seccao titulo="Regimes de que podes beneficiar">
        <Paragrafo>
          Dois, e nenhum é automático nem desenhado para pensionistas.
        </Paragrafo>
        <Paragrafo>
          O <strong>regime dos ex-residentes</strong> exclui de tributação metade dos rendimentos das
          categorias A e B — não abrange pensões. Quem volta a Portugal com pensão e{" "}
          <em>também</em> trabalha pode beneficiar dele quanto à parte do trabalho, se cumprir as
          condições.
        </Paragrafo>
        <Paragrafo>
          O <strong>incentivo do art. 58.º-A do Estatuto dos Benefícios Fiscais</strong> depende da
          atividade exercida e tem prazo de inscrição — confirma-o logo nas primeiras semanas de
          residência.
        </Paragrafo>
        <AvisoPrazo titulo="Regimes antigos para pensionistas já não existem nos mesmos termos">
          O regime do residente não habitual foi revogado, com salvaguardas transitórias para quem
          já estava inscrito ou reunia as condições nas datas fixadas. Informação anterior a essa
          revogação, que ainda circula muito, descreve um regime que já não está aberto.
        </AvisoPrazo>
        <VaiPara href="/guias/programa-regressar">
          O regime dos ex-residentes, condição a condição
        </VaiPara>
        <VaiPara href="/guias/primeiro-ano-fiscal-portugal">
          O primeiro ano de quem se muda para Portugal
        </VaiPara>
      </Seccao>
    </>
  );
}
