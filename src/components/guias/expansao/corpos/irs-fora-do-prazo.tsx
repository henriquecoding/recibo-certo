import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, REDUCAO_COIMA, REVISAO_E_RECLAMACAO } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026: arts. 26.º, 30.º e 116.º do RGIT, art.
// 70.º do CPPT e arts. 57.º e 58.º-A do CIRS.
export default function CorpoIrsForaDoPrazo() {
  return (
    <>
      <Seccao titulo="O que acontece quando não entregas">
        <Paragrafo>
          Não acontece nada de imediato — e é isso que engana. O prazo fecha, o sistema deixa de
          aceitar a entrega dentro do prazo, e durante semanas ou meses não há sinal nenhum.
        </Paragrafo>
        <Paragrafo>
          O que se passa por baixo é isto: a falta de entrega é uma infração; o teu reembolso, se
          havia, não é processado; e a AT ganha o direito de liquidar o imposto sozinha, com os
          elementos que tem.
        </Paragrafo>
        <AvisoPrazo titulo="A entrega continua possível, e é o que resolve tudo">
          Ter falhado o prazo não te impede de entregar. Pelo contrário: é a entrega — feita por tua
          iniciativa, antes de a AT agir — que reduz a coima ao mínimo e destrava o resto.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="A liquidação oficiosa da AT">
        <Paragrafo>
          Não entregando, a AT acaba por liquidar o imposto com base nos elementos de que dispõe. E
          esses elementos são, por definição, apenas os que lhe foram comunicados.
        </Paragrafo>
        <Paragrafo>
          O que isso significa na prática: entram os rendimentos que as entidades declararam; não
          entram as tuas deduções à coleta, nem as despesas, nem os benefícios a que terias direito,
          nem as opções que só tu podias exercer. O resultado é quase sempre{" "}
          <strong>pior do que a declaração que terias entregado</strong>.
        </Paragrafo>
        <Nota titulo="E vem com uma nota de cobrança">
          A liquidação oficiosa produz imposto a pagar, com prazo próprio. Deixar correr transforma
          um problema declarativo num problema de cobrança — e daí para a execução fiscal é um passo.
        </Nota>
        <AvisoPrazo titulo="Da liquidação oficiosa também se reclama">
          Se já houve liquidação oficiosa, a reclamação graciosa apresenta-se no prazo de{" "}
          <strong>{REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias</strong>. Mas o caminho
          mais simples continua a ser entregar a declaração em falta, para que a liquidação passe a
          ser feita sobre a tua situação real.
        </AvisoPrazo>
        <VaiPara href="/guias/execucao-fiscal">
          O que acontece se a dívida passar a execução
        </VaiPara>
      </Seccao>

      <Seccao titulo="A coima e a redução por entrega voluntária">
        <Paragrafo>
          A falta ou atraso na entrega de declarações é punível com coima entre{" "}
          <strong>{fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)}</strong> e{" "}
          <strong>{fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}</strong>. É a moldura — não é o que se
          paga.
        </Paragrafo>
        <Paragrafo>
          Entregando por iniciativa própria, antes de qualquer ação da AT, a coima reduz-se a{" "}
          <strong>{pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value)}</strong> do montante mínimo
          legal. Como {pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value)} do mínimo daria menos do que
          o piso legal, o que se paga é o piso:{" "}
          <strong>{fmt(COIMAS_RGIT.minimoComReducao.value)}</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="E o pedido é implícito — não há formulário">
          A lei diz que a própria entrega da declaração em falta{" "}
          <strong>vale como pedido de redução</strong>, quando a regularização não dependa de imposto
          a liquidar pelos serviços. Entregar é pedir. Depois recebes a notificação da coima
          reduzida, e tens {REDUCAO_COIMA.prazoPagamentoDias.value} dias para a pagar.
        </AvisoPrazo>
        <Nota titulo="A diferença entre agir hoje e esperar é de várias dezenas de euros">
          Entregar agora custa o piso da coima reduzida. Esperar que a AT levante auto de notícia
          custa a coima sem redução, com o mínimo de {fmt(COIMAS_RGIT.minimoAPagar.value)} — e mais,
          conforme o caso. E não há terceira janela.
        </Nota>
        <VaiPara href="/guias/regularizacao-voluntaria">
          Como funciona a redução, e o que fecha a janela
        </VaiPara>
      </Seccao>

      <Seccao titulo="Juros compensatórios">
        <Paragrafo>
          São coisa diferente da coima, e não têm redução nenhuma. Compensam o Estado pelo tempo em
          que esteve sem o imposto que lhe era devido, e correm desde a data em que o pagamento devia
          ter sido feito até à regularização.
        </Paragrafo>
        <Paragrafo>
          Duas consequências práticas. Havendo imposto a pagar, cada mês de atraso acrescenta.
          Havendo <em>reembolso</em> a receber, não há juros compensatórios — não há imposto em
          falta, e o que se perde é o reembolso, que fica retido.
        </Paragrafo>
        <Nota titulo="É por isto que quem ia receber também deve entregar">
          Não há juros nem prejuízo para o Estado, mas há coima na mesma — a infração é a falta de
          entrega, não a falta de pagamento. E o reembolso só sai depois de a declaração existir.
        </Nota>
      </Seccao>

      <Seccao titulo="O reembolso fica retido">
        <Paragrafo>
          É a consequência mais silenciosa e a que afeta mais gente. Sem declaração não há
          liquidação; sem liquidação não há reembolso a processar. O dinheiro não se perde — fica à
          espera.
        </Paragrafo>
        <Paragrafo>
          E há um segundo travão: mesmo depois de entregares, o reembolso pode ser retido se houver
          dívidas em cobrança. A AT compensa créditos e débitos antes de transferir.
        </Paragrafo>
        <AvisoPrazo titulo="Confirma o IBAN antes de esperar pelo dinheiro">
          Um IBAN desatualizado ou de uma conta encerrada trava o reembolso depois de tudo o resto
          estar resolvido. Verifica-o no Portal das Finanças no momento em que entregas.
        </AvisoPrazo>
        <VaiPara href="/guias/reembolso-irs">
          Como e quando chega o reembolso
        </VaiPara>
      </Seccao>

      <Seccao titulo="Passos concretos para regularizar">
        <Passos
          passos={[
            {
              titulo: "Entregar a declaração em falta, hoje",
              texto: "É o passo que fecha a janela do teu lado antes de a AT a fechar do lado dela. Tudo o resto depende deste.",
            },
            {
              titulo: "Entregar todos os anexos que a tua situação exija",
              texto: "Uma declaração entregue com anexos em falta é uma declaração incompleta, e vai ter de ser substituída — com a janela da redução já gasta.",
            },
            {
              titulo: "Verificar o IBAN e os elementos do agregado",
              texto: "É o momento em que estás no Portal das Finanças de qualquer maneira. Corrigir depois custa outra volta.",
            },
            {
              titulo: "Esperar pela notificação da coima reduzida",
              texto: `Tendo a entrega valido como pedido de redução, a AT notifica-te do valor. A partir daí tens ${REDUCAO_COIMA.prazoPagamentoDias.value} dias para pagar — e a situação tem de ficar regularizada no mesmo prazo.`,
            },
            {
              titulo: "Pagar o imposto e os juros que resultarem",
              texto: "É o que faz parar os juros compensatórios. Não havendo meios para pagar de uma vez, o plano prestacional é preferível a deixar a dívida seguir para execução.",
            },
            {
              titulo: "Confirmar que a situação tributária ficou regularizada",
              texto: "Verifica-se no Portal das Finanças. É condição do direito à redução — e do acesso a apoios, concursos e contratos com o Estado.",
            },
          ]}
        />
        <VaiPara href="/guias/plano-prestacoes">
          Pagar em prestações, quando não dá para pagar de uma vez
        </VaiPara>
        <VaiPara href="/guias/situacao-regularizada">
          Como se confirma e se mantém a situação regularizada
        </VaiPara>
      </Seccao>
    </>
  );
}
