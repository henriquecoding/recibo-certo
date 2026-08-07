import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { DECLARACAO_PERIODICA_IVA, FALTA_ENTREGA_PRESTACAO, REGULARIZACAO_IVA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// arts. 27.º, 29.º, 41.º e 78.º do CIVA — os arts. 41.º e 27.º já com as
// alterações do Decreto-Lei n.º 49/2025 — e art. 114.º do RGIT.
//
// O pacote avisa: «os prazos concretos de cada trimestre variam com fins de
// semana e feriados — gerar a partir de calendário, não fixar no texto». É
// o que se faz: o guia dá a REGRA (dia 20 e dia 25 do 2.º mês seguinte) e
// não datas de trimestres concretos.
export default function CorpoDeclaracaoPeriodicaIva() {
  return (
    <>
      <Seccao titulo="Mensal ou trimestral: o que determina">
        <Paragrafo>
          É a primeira coisa a saber, e o pacote de informação que circula raramente dá o número. O
          que decide é o <strong>volume de negócios do ano civil anterior</strong>, com um limiar
          único: <strong>{fmt(DECLARACAO_PERIODICA_IVA.limiarMensal.value)}</strong>.
        </Paragrafo>
        <Paragrafo>
          Igual ou superior a esse valor, a periodicidade é <strong>mensal</strong>. Abaixo dele, é{" "}
          <strong>trimestral</strong>. Não é uma escolha — é uma consequência.
        </Paragrafo>
        <AvisoPrazo titulo="Passar o limiar obriga a comunicar em janeiro">
          Quem tenha obtido, no ano anterior, volume de negócios igual ou superior ao limiar entrega a
          declaração de alterações <strong>durante o mês de janeiro seguinte</strong>, e fica obrigado
          ao envio mensal a partir de 1 de janeiro desse ano. Não é automático: é uma declaração a
          entregar.
        </AvisoPrazo>
        <Nota titulo="Um ano parcial converte-se em ano completo">
          Quando o volume de negócios respeita a uma fração do ano — início de atividade a meio —, é
          convertido no volume anual correspondente. Não se compara um semestre com um limiar anual.
        </Nota>
      </Seccao>

      <Seccao titulo="Os prazos de entrega e de pagamento">
        <Paragrafo>
          São dois prazos diferentes, com cinco dias de intervalo, e ambos contados sobre o{" "}
          <strong>{DECLARACAO_PERIODICA_IVA.mesesAposPeriodo.value}.º mês seguinte</strong> ao
          período.
        </Paragrafo>
        <Paragrafo>
          · <strong>Entrega</strong> — até ao dia{" "}
          {DECLARACAO_PERIODICA_IVA.diaEntrega.value}.
          <br />· <strong>Pagamento</strong> — até ao dia{" "}
          {DECLARACAO_PERIODICA_IVA.diaPagamento.value}.
        </Paragrafo>
        <Paragrafo>
          Para quem está no regime trimestral, o período de referência é o trimestre; para quem está
          no mensal, o mês. A regra do dia e do 2.º mês é a mesma nos dois.
        </Paragrafo>
        <AvisoPrazo titulo="Entregar sem pagar não é meio caminho andado">
          São obrigações distintas com consequências distintas. A falta de entrega da declaração é uma
          infração; a falta de entrega do <em>imposto</em> é outra, mais grave — e mede-se em
          proporção do que ficou por entregar, não em euros fixos.
        </AvisoPrazo>
        <Nota titulo="Este guia não dá datas de trimestres concretos">
          Os dias concretos variam com fins de semana e feriados, e são publicados no calendário
          fiscal da AT. A regra é estável; as datas não.
        </Nota>
        <VaiPara href="/dashboard/prazos">O calendário fiscal, com alertas antecipados</VaiPara>
      </Seccao>

      <Seccao titulo="As férias fiscais de agosto">
        <Paragrafo>
          Há um regime de <strong>transição de obrigações declarativas</strong> que caiam durante o
          mês de agosto, pensado para o período de férias. Na prática, obrigações com prazo em agosto
          podem cumprir-se em setembro sem penalidade.
        </Paragrafo>
        <Paragrafo>
          Confirma o regime em vigor no calendário fiscal do ano — é matéria que tem sido objeto de
          despachos e que convém verificar em vez de assumir.
        </Paragrafo>
        <AvisoPrazo titulo="A transição é da declaração, não necessariamente do pagamento">
          Beneficiar do adiamento da entrega e assumir que o pagamento acompanha é o erro que
          transforma uma facilidade num juro. Verifica os dois prazos separadamente.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="IVA liquidado: onde entra cada operação">
        <Paragrafo>
          O IVA liquidado é o que cobraste aos teus clientes, separado por <strong>taxa</strong> e por{" "}
          <strong>tipo de operação</strong> — e a separação importa porque cada campo tem um
          significado próprio na declaração.
        </Paragrafo>
        <Paragrafo>
          · Operações internas, por taxa: reduzida, intermédia e normal.
          <br />· Operações <strong>isentas</strong> ou não tributadas, que se declaram sem imposto
          mas <em>declaram-se</em>.
          <br />· Operações em que és tu o devedor por <strong>autoliquidação</strong> — aquisições
          intracomunitárias de serviços, construção civil, sucatas.
          <br />· Operações <strong>fora do campo</strong> do imposto português, por localização.
        </Paragrafo>
        <AvisoPrazo titulo="As operações sem IVA também se declaram">
          É o erro mais comum de quem fatura para fora. Uma prestação a um cliente de outro
          Estado-Membro não leva IVA português — mas entra na declaração periódica, e entra também na
          recapitulativa. Não aparecer em lado nenhum é uma omissão, não uma simplificação.
        </AvisoPrazo>
        <VaiPara href="/guias/autoliquidacao-iva">
          A autoliquidação, dos dois lados
        </VaiPara>
      </Seccao>

      <Seccao titulo="IVA dedutível e as exclusões">
        <Paragrafo>
          Deduz-se o imposto suportado em bens e serviços <strong>afetos à atividade</strong>{" "}
          tributada, desde que documentado em fatura passada em forma legal e com o teu número de
          identificação.
        </Paragrafo>
        <Paragrafo>
          Mas há <strong>exclusões expressas</strong>, e são as que mais dúvidas geram: despesas com
          viaturas de turismo, combustíveis fora das percentagens admitidas, despesas de alojamento,
          alimentação e bebidas, e despesas de divertimento e de luxo — cada uma com o seu regime e as
          suas exceções.
        </Paragrafo>
        <Nota titulo="Sem fatura em forma legal não há dedução">
          Um talão sem NIF, uma fatura simplificada acima do limite admitido, um recibo que não é
          fatura. O IVA existiu, foi pago, e não se deduz — porque falta o documento que o suporta.
        </Nota>
      </Seccao>

      <Seccao titulo="Regularizações">
        <Paragrafo>
          É onde entram as notas de crédito, as correções de erros e os créditos incobráveis. E é onde
          a assimetria da lei se sente: corrigir a favor do Estado é obrigatório e rápido; corrigir a
          teu favor é facultativo e condicionado.
        </Paragrafo>
        <Paragrafo>
          A regularização <strong>a favor do sujeito passivo</strong> exige{" "}
          {REGULARIZACAO_IVA.provaExigida.value}. Sem isso, a lei considera a dedução indevida.
        </Paragrafo>
        <VaiPara href="/guias/nota-de-credito">
          As notas de crédito, os prazos e a prova exigida
        </VaiPara>
      </Seccao>

      <Seccao titulo="Crédito de imposto: reportar ou pedir reembolso">
        <Paragrafo>
          Quando o IVA dedutível excede o liquidado, o resultado é um <strong>crédito</strong> a teu
          favor. E há duas coisas que podes fazer com ele.
        </Paragrafo>
        <Paragrafo>
          · <strong>Reportar</strong> para o período seguinte, abatendo ao imposto que vieres a
          liquidar. É o caminho simples, automático e sem verificações.
          <br />· <strong>Pedir reembolso</strong>, quando o crédito atinge os montantes e as
          condições legalmente exigidos. É dinheiro que volta — e é um pedido que costuma desencadear
          verificação documental.
        </Paragrafo>
        <AvisoPrazo titulo="Um pedido de reembolso é um convite a que confiram tudo">
          Não é motivo para não o fazer: é motivo para o fazer com a documentação em ordem. Faturas de
          aquisição, prova de afetação à atividade, coerência com o SAF-T.
        </AvisoPrazo>
        <Nota titulo="Créditos que ficam anos a reportar merecem uma conversa">
          Um crédito permanente costuma indicar uma estrutura de atividade em que o reembolso faria
          sentido — exportação, operações isentas com direito a dedução, investimento continuado. Vale
          a pena falar com um contabilista certificado.
        </Nota>
      </Seccao>

      <Seccao titulo="Declaração de substituição">
        <Passos
          passos={[
            {
              titulo: "Detetar o erro e identificar o período",
              texto: "A substituição é por período. Um erro que atravessa vários trimestres corrige-se em cada um deles, não num só.",
            },
            {
              titulo: "Substituir antes de qualquer ação da AT",
              texto: "É o que mantém aberta a redução da coima. Depois de auto de notícia ou de inspeção iniciada, a janela maior fechou.",
            },
            {
              titulo: "Pagar o imposto que resultar",
              texto: `A falta de entrega da prestação tributária é punível, por negligência, com coima entre ${pctExato(FALTA_ENTREGA_PRESTACAO.negligenciaMin.value)} e ${pctExato(FALTA_ENTREGA_PRESTACAO.negligenciaMax.value)} do imposto em falta. Regularizar cedo é o que a reduz.`,
            },
            {
              titulo: "Verificar o efeito nos períodos seguintes",
              texto: "Um erro num crédito reportado propaga-se. Corrigir o período de origem sem acertar os seguintes deixa a cadeia errada.",
            },
            {
              titulo: "Confirmar a coerência com o SAF-T",
              texto: "A declaração e os documentos comunicados são cruzados. Uma substituição que os afaste ainda mais gera a divergência que se queria evitar.",
            },
          ]}
        />
        <VaiPara href="/guias/saf-t-faturacao">
          O SAF-T mensal, que a AT cruza com esta declaração
        </VaiPara>
        <VaiPara href="/guias/regularizacao-voluntaria">
          A janela da redução da coima, e o que a fecha
        </VaiPara>
      </Seccao>
    </>
  );
}
