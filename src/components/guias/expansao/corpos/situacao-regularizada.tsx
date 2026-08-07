import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, REDUCAO_COIMA, SS_MIN_MENSAL } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 19.º da LGT, arts. 169.º e 196.º do CPPT, e arts. 26.º e 30.º do
// RGIT quanto à regularização.
export default function CorpoSituacaoRegularizada() {
  return (
    <>
      <Seccao titulo="As duas certidões: fisco e Segurança Social">
        <Paragrafo>
          São <strong>duas</strong>, emitidas por entidades diferentes, e quem pede uma costuma
          precisar das duas. Ter a situação regularizada num lado não diz nada sobre o outro.
        </Paragrafo>
        <Paragrafo>
          · A <strong>certidão de situação tributária</strong> regularizada, emitida pela Autoridade
          Tributária.
          <br />· A <strong>declaração de situação contributiva</strong> regularizada, emitida pela
          Segurança Social.
        </Paragrafo>
        <Paragrafo>
          Ambas são <strong>gratuitas</strong> e obtêm-se online, em minutos. O difícil nunca é
          obtê-las — é o que as bloqueia.
        </Paragrafo>
        <Nota titulo="Onde são exigidas">
          Candidaturas a apoios e a fundos, contratação pública, licenciamentos, financiamento
          bancário, e vários regimes fiscais que a exigem como condição — o dos ex-residentes, entre
          eles.
        </Nota>
        <VaiPara href="/guias/programa-regressar">
          Um regime que a exige como condição de acesso
        </VaiPara>
      </Seccao>

      <Seccao titulo="Como se obtêm">
        <Paragrafo>
          A tributária pede-se no <strong>Portal das Finanças</strong>, na área das certidões. A
          contributiva pede-se na <strong>Segurança Social Direta</strong>. As duas são emitidas na
          hora, em PDF, com um código de acesso que permite a terceiros confirmá-las online.
        </Paragrafo>
        <Paragrafo>
          É esse código que se entrega, e não o documento: quem o recebe verifica a certidão na fonte,
          e vê o estado <em>atual</em> — não uma fotografia do dia em que foi emitida.
        </Paragrafo>
        <AvisoPrazo titulo="Pede-as antes de precisares">
          Descobrir que estão bloqueadas no dia em que se fecha uma candidatura é o pior momento
          possível. Desbloqueá-las leva dias, e às vezes semanas.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que impede a emissão">
        <Paragrafo>
          Qualquer <strong>dívida em cobrança</strong> ou <strong>obrigação declarativa em
          falta</strong>. E as causas mais frequentes são pequenas e antigas, não grandes e recentes.
        </Paragrafo>
        <Paragrafo>
          · Uma <strong>coima</strong> de há dois anos, de uma declaração entregue fora do prazo.
          <br />· Um <strong>trimestre da Segurança Social</strong> por pagar — e vale a pena reter
          que a contribuição mínima mensal de{" "}
          <strong>{fmt(SS_MIN_MENSAL.value)}</strong> existe mesmo em trimestres sem faturação, e é a
          origem mais comum de dívida contributiva em silêncio.
          <br />· Uma <strong>declaração periódica de IVA</strong> não entregue num período sem
          operações.
          <br />· Uma <strong>Modelo 3</strong> de um ano em que não havia imposto a pagar.
        </Paragrafo>
        <AvisoPrazo titulo="Declarações em falta bloqueiam mesmo sem dívida">
          É a causa que mais surpreende. Não devias nada, não havia imposto, mas a declaração não foi
          entregue — e a certidão não sai. Não é uma dívida: é uma omissão.
        </AvisoPrazo>
        <VaiPara href="/guias/portal-das-financas">
          Onde se consultam as obrigações em falta
        </VaiPara>
      </Seccao>

      <Seccao titulo="Dívidas em plano de prestações">
        <Paragrafo>
          Uma dívida em <strong>plano de pagamento em prestações</strong>, com as prestações em dia e
          a garantia prestada ou dispensada, <strong>não impede</strong> a emissão da certidão.
        </Paragrafo>
        <Paragrafo>
          É a saída que muita gente não conhece: não é preciso pagar tudo para ter a situação
          regularizada — é preciso ter a dívida <em>enquadrada</em> e estar a cumprir.
        </Paragrafo>
        <AvisoPrazo titulo="Falhar uma prestação faz cair tudo de uma vez">
          O incumprimento do plano faz vencer as prestações seguintes e devolve a dívida ao estado
          anterior. A certidão deixa de sair, e o processo volta à execução.
        </AvisoPrazo>
        <VaiPara href="/guias/plano-prestacoes">
          Como se pede o pagamento em prestações
        </VaiPara>
      </Seccao>

      <Seccao titulo="Dívidas com execução suspensa">
        <Paragrafo>
          Uma dívida cuja execução esteja <strong>legalmente suspensa</strong> — por ter sido
          apresentada reclamação, impugnação ou oposição, com garantia prestada ou dispensada —
          também não impede a certidão.
        </Paragrafo>
        <Paragrafo>
          A lógica é a mesma do plano prestacional: o que a certidão atesta não é ausência de dívida,
          é ausência de <strong>dívida exigível e não enquadrada</strong>.
        </Paragrafo>
        <Nota titulo="A garantia é a peça que costuma travar">
          Suspender a execução exige, em regra, garantia — bancária, seguro-caução, penhor — ou a sua
          dispensa, que se pede e se fundamenta. É a parte cara e a que demora.
        </Nota>
        <VaiPara href="/guias/suspender-execucao">
          Como se suspende uma execução fiscal
        </VaiPara>
      </Seccao>

      <Seccao titulo="Autorizar consulta por terceiros">
        <Paragrafo>
          Em vez de entregar a certidão, podes <strong>autorizar a consulta</strong> por uma entidade
          determinada — uma prática comum em candidaturas e em contratação pública.
        </Paragrafo>
        <Paragrafo>
          A autorização é dada no portal, identifica a entidade e é revogável. A vantagem para quem
          consulta é ver o estado atual; a vantagem para ti é não teres de renovar documentos ao longo
          de um processo que se arrasta.
        </Paragrafo>
        <Nota titulo="Revoga as autorizações que já não fazem sentido">
          Como as dos contabilistas, ficam ativas até serem revogadas. Uma limpeza anual resolve.
        </Nota>
      </Seccao>

      <Seccao titulo="Prazos de validade">
        <Paragrafo>
          As certidões têm prazo de validade próprio, e quem as exige costuma pedir que sejam
          recentes. Mas a validade formal importa menos do que parece: o que conta é o{" "}
          <strong>estado no momento em que é verificada</strong>.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Verificar o estado antes de qualquer candidatura",
              texto: "Nos dois sítios. É uma consulta de minutos, e é onde os bloqueios aparecem com tempo para os resolver.",
            },
            {
              titulo: "Regularizar declarações em falta primeiro",
              texto: `Entregar por iniciativa própria, antes de qualquer ação da AT, reduz a coima a ${pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value)} do mínimo legal — com o piso de ${fmt(COIMAS_RGIT.minimoComReducao.value)}.`,
            },
            {
              titulo: "Pagar as coimas dentro do prazo da notificação",
              texto: `São ${REDUCAO_COIMA.prazoPagamentoDias.value} dias, e a situação tem de ficar regularizada no mesmo prazo. Falhar faz perder a redução.`,
            },
            {
              titulo: "Enquadrar a dívida que não consigas pagar de uma vez",
              texto: "Plano prestacional. Uma dívida enquadrada e em cumprimento não bloqueia a certidão; uma dívida ignorada bloqueia.",
            },
            {
              titulo: "Confirmar que ambas as certidões saem",
              texto: "Fisco e Segurança Social. Resolver uma e assumir a outra é o erro mais comum — e a que falta costuma ser a contributiva.",
            },
          ]}
        />
        <AvisoPrazo titulo="A verificação é feita no momento da adjudicação, e pode ser repetida">
          Uma certidão emitida em janeiro não protege de uma dívida nascida em março. Em processos
          longos, o estado é reconfirmado — e é aí que uma pendência entretanto criada aparece.
        </AvisoPrazo>
        <VaiPara href="/guias/regularizacao-voluntaria">
          A janela da redução da coima, e o que a fecha
        </VaiPara>
        <VaiPara href="/guias/declaracao-trimestral-ss">
          A declaração trimestral, cuja falta gera dívida contributiva em silêncio
        </VaiPara>
      </Seccao>
    </>
  );
}
