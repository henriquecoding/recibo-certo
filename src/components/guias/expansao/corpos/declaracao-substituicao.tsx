import { Seccao, Paragrafo, Nota, AvisoPrazo, VaiPara } from "@/components/guias/BlocosDireitos";
import { IRS_AUTOMATICO, REDUCAO_COIMA, REVISAO_E_RECLAMACAO } from "@/lib/fiscal-data";
import { pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026 contra o articulado no Portal das Finanças:
// art. 78.º da LGT (n.os 1, 4, 6 e 7), art. 70.º do CPPT, art. 30.º do RGIT
// e art. 58.º-A, n.º 3 do CIRS.
//
// O pacote manda confirmar os prazos antes de indicar números. Estão
// confirmados, e são três relógios diferentes — o da reclamação, o da
// revisão e o da coima — que costumam ser tratados como um só.
export default function CorpoDeclaracaoSubstituicao() {
  return (
    <>
      <Seccao titulo="Substituição dentro do prazo normal">
        <Paragrafo>
          É o caso mais simples e o que ninguém devia temer: enquanto o prazo legal de entrega
          estiver aberto, podes entregar uma declaração nova que substitui a anterior. A última
          entregue é a que vale.
        </Paragrafo>
        <Paragrafo>
          Não há coima, não há juros, não há justificação a dar. É o mecanismo normal de correção, e
          existe precisamente para isto.
        </Paragrafo>
        <Nota titulo="A declaração de substituição é completa, não é um adenda">
          Substituir é reentregar tudo — não é enviar só a parte corrigida. Uma declaração de
          substituição que esqueça um anexo que estava na primeira faz desaparecer esse anexo.
        </Nota>
      </Seccao>

      <Seccao titulo="Substituição fora do prazo">
        <Paragrafo>
          Continua a ser possível, e continua a ser o caminho certo. O que muda é que passa a haver
          consequências associadas, e elas dependem do <strong>sentido</strong> da correção.
        </Paragrafo>
        <Paragrafo>
          Se a correção <strong>aumenta</strong> o imposto, há imposto em falta e há infração — com
          coima e juros compensatórios. Se <strong>diminui</strong>, não há infração nenhuma: há um
          crédito teu, e o problema passa a ser de prazo para o reclamar.
        </Paragrafo>
        <AvisoPrazo titulo="Há uma janela sem penalidade que quase ninguém usa">
          Quem tenha ficado com a declaração automática convertida em declaração entregue — por não
          ter confirmado nem entregado nada — pode substituí-la nos{" "}
          <strong>{IRS_AUTOMATICO.substituicaoSemPenalidadeDias.value} dias posteriores à
          liquidação, sem qualquer penalidade</strong>. É o melhor prazo de todo o IRS.
        </AvisoPrazo>
        <VaiPara href="/guias/irs-automatico">
          A declaração automática, e o que acontece a quem não faz nada
        </VaiPara>
      </Seccao>

      <Seccao titulo="Correções a favor do Estado">
        <Paragrafo>
          Descobriste um rendimento que não declaraste, ou uma dedução a que não tinhas direito.
          Substituir é o caminho — e substituir <em>cedo</em> é o que decide o custo.
        </Paragrafo>
        <Paragrafo>
          Entregar a declaração de substituição antes de qualquer ação da AT reduz a coima a{" "}
          <strong>{pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value)}</strong> do montante mínimo
          legal. E, na maior parte dos casos, não é preciso pedir nada: a própria entrega da
          declaração em falta <strong>vale como pedido de redução</strong>.
        </Paragrafo>
        <Paragrafo>
          Aos juros compensatórios não há redução: são a compensação do atraso no pagamento e
          correm até à regularização. Quanto mais cedo se entrega, menos correm.
        </Paragrafo>
        <AvisoPrazo titulo="Esperar não faz o problema desaparecer">
          O cruzamento de dados da AT chega quase sempre lá — e quando chega, a janela da redução já
          fechou e o custo multiplica-se. É a decisão mais rentável deste guia, e a mais adiada.
        </AvisoPrazo>
        <VaiPara href="/guias/regularizacao-voluntaria">
          A janela da redução, e o que a fecha
        </VaiPara>
      </Seccao>

      <Seccao titulo="Correções a teu favor e o prazo de reclamação">
        <Paragrafo>
          Aqui não há infração — houve imposto pago a mais — e por isso o instrumento não é a coima:
          é o prazo. E o prazo principal é o da <strong>reclamação graciosa</strong>:{" "}
          <strong>{REVISAO_E_RECLAMACAO.reclamacaoGraciosaDias.value} dias</strong>, contados dos
          factos que a lei fixa.
        </Paragrafo>
        <Paragrafo>
          É um prazo generoso comparado com muitos outros, e um prazo curto comparado com o tempo que
          as pessoas demoram a perceber que pagaram a mais — que costuma ser quando fazem a
          declaração do ano seguinte e comparam.
        </Paragrafo>
        <Nota titulo="Reclamar não é o mesmo que substituir">
          A substituição corrige a <em>declaração</em>. A reclamação graciosa contesta a{" "}
          <em>liquidação</em>. Depois de haver liquidação, é a segunda que abre a porta — e é dela
          que se conta o prazo.
        </Nota>
      </Seccao>

      <Seccao titulo="Revisão oficiosa: a via esquecida">
        <Paragrafo>
          Passado o prazo da reclamação, muita gente assume que acabou. Não acabou: o art. 78.º da
          Lei Geral Tributária prevê a <strong>revisão dos atos tributários</strong>, e é a via que
          salva os casos antigos.
        </Paragrafo>
        <Paragrafo>
          Por iniciativa da administração, com fundamento em{" "}
          <strong>erro imputável aos serviços</strong>, a revisão pode ser feita no prazo de{" "}
          <strong>{REVISAO_E_RECLAMACAO.revisaoPorErroDosServicosAnos.value} anos</strong> após a
          liquidação — ou a todo o tempo, se o tributo ainda não tiver sido pago. E o pedido do
          contribuinte dirigido ao órgão competente <strong>interrompe esse prazo</strong>.
        </Paragrafo>
        <Paragrafo>
          Há ainda duas vias mais estreitas: a <strong>injustiça grave ou notória</strong>, que o
          dirigente máximo do serviço pode autorizar excecionalmente nos{" "}
          {REVISAO_E_RECLAMACAO.injusticaGraveAnos.value} anos posteriores ao ato — desde que o erro
          não seja imputável a comportamento negligente do contribuinte —, e a{" "}
          <strong>duplicação de coleta</strong>, revisível em{" "}
          {REVISAO_E_RECLAMACAO.duplicacaoColetaAnos.value} anos seja qual for o fundamento.
        </Paragrafo>
        <AvisoPrazo titulo="«Erro imputável aos serviços» é mais amplo do que parece">
          Não significa má-fé nem sequer erro humano identificável: a jurisprudência tem entendido
          que abrange o erro na aplicação da lei pela administração, ainda que induzido pela
          declaração do contribuinte. É a razão pela qual esta via resolve casos que pareciam
          perdidos — e é matéria em que vale a pena ouvir um profissional antes de desistir.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Efeito em coimas e juros">
        <Paragrafo>
          Três coisas diferentes, que se resolvem de maneiras diferentes.
        </Paragrafo>
        <Paragrafo>
          · <strong>Imposto</strong> — o que devias. Paga-se, e é o que faz parar os juros.
          <br />· <strong>Juros compensatórios</strong> — a compensação do atraso. Não têm redução, e
          correm até à regularização.
          <br />· <strong>Coima</strong> — a punição da infração. Tem redução, e a percentagem
          depende do momento em que se regulariza.
        </Paragrafo>
        <Paragrafo>
          A ordem prática é sempre a mesma: substituir a declaração o mais cedo possível, pagar o
          imposto e os juros que resultarem, e pagar a coima reduzida dentro do prazo que a
          notificação fixar. Deixar qualquer uma das três a meio faz perder a redução das outras.
        </Paragrafo>
        <VaiPara href="/guias/coimas-fiscais">
          As molduras das coimas, e a diferença entre dispensa e redução
        </VaiPara>
        <VaiPara href="/guias/irs-fora-do-prazo">
          O caso concreto de quem não entregou de todo
        </VaiPara>
      </Seccao>
    </>
  );
}
