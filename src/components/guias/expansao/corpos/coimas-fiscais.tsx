import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, DISPENSA_COIMA, REDUCAO_COIMA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// arts. 26.º, 29.º, 30.º, 114.º, 116.º e 117.º do RGIT — os arts. 29.º e
// 30.º na redação da Lei n.º 7/2021, em vigor desde 1 de janeiro de 2022.
//
// O pacote avisa para distinguir dispensa (art. 29.º) de redução (art.
// 30.º). É a espinha deste guia: não são graus da mesma coisa.
export default function CorpoCoimasFiscais() {
  return (
    <>
      <Seccao titulo="Que infrações geram coima">
        <Paragrafo>
          Quase todas as obrigações fiscais têm uma coima associada ao seu incumprimento, e o Regime
          Geral das Infrações Tributárias arruma-as por tipo. As três que apanham mais gente são
          estas.
        </Paragrafo>
        <Paragrafo>
          · <strong>Falta ou atraso de declarações</strong> — o IRS, o IVA, a declaração trimestral.
          <br />· <strong>Falta ou atraso na apresentação de documentos</strong>, e as declarações de
          início, alteração ou cessação de atividade, que têm moldura própria e mais alta.
          <br />· <strong>Falta de entrega da prestação tributária</strong> — não entregar imposto
          que retiveste ou liquidaste. É a mais grave das três, e a moldura mostra porquê: mede-se em
          proporção do imposto, não em euros fixos.
        </Paragrafo>
        <Nota titulo="Coima não é imposto, nem juro">
          São três coisas separadas que aparecem juntas. O <strong>imposto</strong> é o que devias.
          Os <strong>juros compensatórios</strong> pagam o atraso no pagamento. A{" "}
          <strong>coima</strong> pune a infração. Regularizar o imposto não apaga a coima, e pagar a
          coima não substitui o imposto.
        </Nota>
      </Seccao>

      <Seccao titulo="Os montantes do RGIT">
        <Paragrafo>
          Cada tipo de infração tem uma moldura — um mínimo e um máximo — e os valores estão na
          tabela de dados aqui em baixo. O que interessa perceber é como se navega dentro dela,
          porque o valor final quase nunca é o do meio.
        </Paragrafo>
        <Paragrafo>
          Há dois ajustes que se aplicam por cima da moldura de cada tipo. As coimas aplicáveis a{" "}
          <strong>pessoas singulares</strong> não podem exceder metade dos limites fixados para as
          pessoas coletivas. E os limites dos tipos legais são elevados para o{" "}
          <strong>dobro</strong> quando aplicados a uma pessoa coletiva ou entidade equiparada.
        </Paragrafo>
        <AvisoPrazo titulo="E há dois pisos, que são o que realmente se paga">
          O montante mínimo a pagar é de <strong>{fmt(COIMAS_RGIT.minimoAPagar.value)}</strong> —
          exceto havendo redução, em que passa a{" "}
          <strong>{fmt(COIMAS_RGIT.minimoComReducao.value)}</strong>. É o segundo piso que manda no
          caso comum: {pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value)} do mínimo de uma coima de
          declarações daria menos do que isso, e o piso levanta-o.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Negligência e dolo">
        <Paragrafo>
          A distinção decide a moldura. <strong>Negligência</strong> é falhar por descuido,
          desorganização ou desconhecimento; <strong>dolo</strong> é falhar sabendo e querendo.
        </Paragrafo>
        <Paragrafo>
          Na falta de entrega da prestação tributária a diferença é enorme, e vê-se na tabela: por
          negligência, a coima é uma fração do imposto em falta; por dolo, pode chegar ao dobro do
          valor em falta.
        </Paragrafo>
        <Nota titulo="Para efeitos de redução, conta sempre a negligência">
          É uma regra generosa e pouco conhecida: quando se calcula a coima reduzida, considera-se{" "}
          <em>sempre</em> como montante mínimo o estabelecido para os casos de negligência. Quem
          regulariza voluntariamente não vê a moldura do dolo aplicada ao cálculo.
        </Nota>
      </Seccao>

      <Seccao titulo="Redução por regularização voluntária">
        <Paragrafo>
          É o mecanismo mais valioso deste guia, e funciona por um relógio: o que decide a
          percentagem não é a gravidade da falta — é o <strong>momento</strong> em que se pede,
          medido contra a ação da administração.
        </Paragrafo>
        <Paragrafo>
          Antes de qualquer ação da AT — sem auto de notícia, sem participação, sem denúncia, sem
          inspeção iniciada — a coima reduz-se a{" "}
          <strong>{pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value)}</strong> do montante mínimo
          legal. Já dentro de uma inspeção, até ao termo do prazo de audição prévia, reduz-se a{" "}
          <strong>{pctExato(REDUCAO_COIMA.ateAudicaoPrevia.value)}</strong>.
        </Paragrafo>
        <AvisoPrazo titulo="Na maior parte dos casos, o pedido é implícito">
          Quando a regularização não depende de imposto a liquidar pelos serviços, a lei diz que{" "}
          <strong>vale como pedido de redução a própria entrega</strong> da declaração ou do
          documento em falta. Não há formulário: entregar é pedir.
        </AvisoPrazo>
        <VaiPara href="/guias/regularizacao-voluntaria">
          A janela, o pedido e os 30 dias para pagar
        </VaiPara>
      </Seccao>

      <Seccao titulo="Dispensa de coima">
        <Paragrafo>
          Não é uma redução maior — é outra coisa, com pressupostos próprios. E são duas vias
          distintas dentro do mesmo artigo.
        </Paragrafo>
        <Paragrafo>
          A primeira é automática e depende do <strong>historial</strong>: não pode ser aplicada
          coima a quem, nos <strong>{DISPENSA_COIMA.anosDeHistorialLimpo.value} anos anteriores</strong>,
          não tenha sido condenado por infração tributária nem tenha beneficiado de dispensa ou de
          coima reduzida.
        </Paragrafo>
        <Paragrafo>
          A segunda exige, cumulativamente, que a infração{" "}
          <strong>não ocasione prejuízo efetivo à receita tributária</strong> e que a falta esteja{" "}
          <strong>regularizada</strong>. Esta tem de ser <em>requerida</em> no prazo concedido para a
          defesa, e a falta regularizada até ao termo desse prazo.
        </Paragrafo>
        <AvisoPrazo titulo="A porta da segunda via fecha-se sozinha no caso mais comum">
          A lei diz que existe <strong>sempre</strong> prejuízo efetivo quando esteja em causa falta
          de entrega da prestação tributária. Quem não entregou imposto que devia não cabe nesta via
          — resta-lhe a do historial limpo, ou a redução.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Quando já não há redução possível">
        <Paragrafo>
          Quando a AT já agiu <em>e</em> a janela da audição prévia já fechou. As duas percentagens
          de redução estão amarradas a momentos concretos, e passados esses momentos não há terceira
          hipótese.
        </Paragrafo>
        <Paragrafo>
          É por isto que a ordem importa mais do que o valor: regularizar hoje, por iniciativa
          própria, custa uma fração do mínimo; regularizar depois de a carta chegar custa o
          quádruplo dessa fração; regularizar depois disso custa a coima inteira.
        </Paragrafo>
        <Nota titulo="Uma carta da AT não é sempre o fim da janela">
          O que fecha a redução maior é o auto de notícia, a participação, a denúncia ou o início da
          inspeção. Um pedido de esclarecimentos não é nenhuma dessas coisas — mas é um sinal claro
          de que o relógio está a andar.
        </Nota>
        <VaiPara href="/guias/inspecao-tributaria">
          O que acontece quando a inspeção começa, e onde ainda se muda o desfecho
        </VaiPara>
      </Seccao>

      <Seccao titulo="Pagar ou defender-se">
        <Paragrafo>
          Pagar a coima reduzida é rápido, fecha o assunto e evita o processo de contraordenação. Mas
          tem uma consequência que quase ninguém pondera: beneficiar de redução{" "}
          <strong>consome o historial limpo</strong> exigido pela dispensa dos anos seguintes.
        </Paragrafo>
        <Paragrafo>
          Defender-se faz sentido quando há razão para contestar a infração em si — a obrigação não
          existia, foi cumprida, ou o prazo não tinha decorrido. Aí a discussão não é sobre o valor:
          é sobre se houve infração.
        </Paragrafo>
        <AvisoPrazo titulo="Não responder é a pior das opções">
          Ignorar a notificação faz correr o processo à revelia, sem redução e sem defesa — e a
          dívida acaba em execução fiscal, com custas por cima. Responder, mesmo que seja para pagar,
          é sempre melhor do que o silêncio.
        </AvisoPrazo>
        <VaiPara href="/guias/suspender-execucao">
          Se a dívida já foi para execução fiscal
        </VaiPara>
        <VaiPara href="/guias/situacao-regularizada">
          Como se recupera a situação tributária regularizada
        </VaiPara>
      </Seccao>
    </>
  );
}
