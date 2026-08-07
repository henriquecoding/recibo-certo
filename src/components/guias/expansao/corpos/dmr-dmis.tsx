import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, REDUCAO_COIMA, SS_TAXA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto às coimas e à taxa contributiva:
// arts. 26.º, 30.º, 116.º e 117.º do RGIT, e o Código dos Regimes
// Contributivos.
//
// O pacote manda «confirmar prazos exatos nas portarias aplicáveis». Não
// foi possível confirmá-los em fonte legível nesta revisão — pelo que o
// guia diz que ambas são mensais, diz em que altura do mês caem, e manda
// confirmar os dias no calendário fiscal do ano.
export default function CorpoDmrDmis() {
  return (
    <>
      <Seccao titulo="DMR: o que declara e quando">
        <Paragrafo>
          A declaração mensal de remunerações comunica à AT as{" "}
          <strong>remunerações de trabalho dependente</strong> pagas no mês e as{" "}
          <strong>retenções de IRS</strong> que sobre elas foram feitas — trabalhador a trabalhador.
        </Paragrafo>
        <Paragrafo>
          É <strong>mensal</strong>, respeita ao mês anterior e cai na primeira metade do mês. O dia
          exato consta da portaria aplicável e do calendário fiscal do ano — confirma-o no Portal das
          Finanças.
        </Paragrafo>
        <Nota titulo="É o que faz aparecer o salário no pré-preenchido">
          Sem DMR, o rendimento e a retenção do trabalhador não entram na declaração dele. O
          incumprimento do empregador transforma-se em trabalho do empregado.
        </Nota>
        <VaiPara href="/guias/modelo-10">
          A Modelo 10, para os rendimentos que não vão na DMR
        </VaiPara>
      </Seccao>

      <Seccao titulo="DMIS: o que declara e quando">
        <Paragrafo>
          A declaração mensal de imposto do selo comunica o <strong>imposto do selo liquidado</strong>{" "}
          no mês, por verba da Tabela Geral — e o que foi cobrado a terceiros e entregue ao Estado.
        </Paragrafo>
        <Paragrafo>
          Apanha muito mais gente do que parece. Contratos de arrendamento, operações de crédito,
          garantias, e várias operações financeiras geram imposto do selo — e quem o liquida tem de o
          declarar.
        </Paragrafo>
        <AvisoPrazo titulo="É a declaração que mais gente descobre tarde">
          Quem nunca ouviu falar dela costuma ser quem tem uma obrigação pontual — um contrato, uma
          operação isolada — e não sabe que ela existe. A falta é detetada por cruzamento, meses
          depois.
        </AvisoPrazo>
        <VaiPara href="/guias/imposto-selo-compra-casa">
          O imposto do selo na compra de casa, para dimensionar
        </VaiPara>
      </Seccao>

      <Seccao titulo="A duplicação com a Segurança Social">
        <Paragrafo>
          É a confusão que dá nome a este guia. A <strong>DMR fiscal</strong> vai para a Autoridade
          Tributária; a <strong>declaração de remunerações da Segurança Social</strong> vai para a
          Segurança Social. São <strong>duas declarações diferentes</strong>, para duas entidades
          diferentes.
        </Paragrafo>
        <Paragrafo>
          Declaram informação parcialmente sobreposta — as mesmas remunerações — mas com finalidades
          distintas: uma serve o IRS, a outra serve as contribuições à taxa de{" "}
          {pctExato(SS_TAXA.value)} e a formação de direitos.
        </Paragrafo>
        <AvisoPrazo titulo="Entregar uma não dispensa a outra">
          É o erro estrutural. Muitos programas de processamento salarial geram as duas, e quem as vê
          sair juntas assume que é uma coisa só. Não é — e a que falta é detetada pela entidade que
          não a recebeu.
        </AvisoPrazo>
        <Nota titulo="E os prazos não coincidem necessariamente">
          Cada uma tem o seu calendário. Confirma os dois separadamente, e marca-os separadamente.
        </Nota>
        <VaiPara href="/guias/declaracao-trimestral-ss">
          As obrigações declarativas do lado da Segurança Social
        </VaiPara>
      </Seccao>

      <Seccao titulo="Meses sem movimento">
        <Paragrafo>
          A regra é a mesma de todas as declarações periódicas, e é contraintuitiva: um mês sem
          movimento <strong>declara-se</strong>. Não entregar não é o mesmo que entregar a zero.
        </Paragrafo>
        <Paragrafo>
          A administração distingue «não houve remunerações» de «não foi comunicado». A segunda é uma
          falta, e é detetada automaticamente por ausência de entrega no período.
        </Paragrafo>
        <AvisoPrazo titulo="Cada mês em falta é uma infração autónoma">
          Não é um problema — são tantos quantos os meses. E a moldura de cada um vai de{" "}
          {fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a{" "}
          {fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Coimas por falta de entrega">
        <Passos
          passos={[
            {
              titulo: "A moldura é por período, e soma",
              texto: `De ${fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a ${fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)} por cada declaração em falta. Doze meses esquecidos são doze infrações.`,
            },
            {
              titulo: "Entregar por iniciativa própria reduz ao mínimo",
              texto: `Antes de auto de notícia, participação, denúncia ou inspeção iniciada, a coima reduz-se a ${pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value)} do montante mínimo legal — com o piso de ${fmt(COIMAS_RGIT.minimoComReducao.value)}.`,
            },
            {
              titulo: "E o pedido é implícito",
              texto: "A própria entrega da declaração em falta vale como pedido de redução, quando a regularização não dependa de imposto a liquidar pelos serviços. Não há formulário.",
            },
            {
              titulo: "Depois há o prazo de pagamento",
              texto: `Recebida a notificação da coima reduzida, tens ${REDUCAO_COIMA.prazoPagamentoDias.value} dias para pagar — e a situação tem de ficar regularizada no mesmo prazo.`,
            },
            {
              titulo: "Entregar tudo de uma vez é melhor do que aos poucos",
              texto: "A janela da redução é a mesma para todos os períodos. Regularizar metade e deixar a outra metade para depois arrisca perder a redução na parte que sobrou.",
            },
          ]}
        />
        <Nota titulo="A deteção é automática, e é rápida">
          Estas declarações são de periodicidade fixa: a ausência de entrega num período é visível sem
          qualquer análise. Não é matéria em que esperar ajude.
        </Nota>
        <VaiPara href="/guias/regularizacao-voluntaria">
          A janela da redução da coima, e o que a fecha
        </VaiPara>
        <VaiPara href="/guias/coimas-fiscais">
          As molduras, os pisos e a diferença entre dispensa e redução
        </VaiPara>
      </Seccao>
    </>
  );
}
