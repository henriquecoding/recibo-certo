import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, DISPENSA_COIMA, REDUCAO_COIMA } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

// Corpo verificado a 07/08/2026: arts. 29.º e 30.º do RGIT na redação da
// Lei n.º 7/2021 (em vigor desde 1/1/2022), art. 26.º, n.º 3 do RGIT, e
// arts. 59.º e 78.º da LGT.
//
// O pacote dá «15 dias» como prazo de regularização após o pedido. A al.
// a) do n.º 3 do art. 30.º diz 30 dias. Ver `correcoes.ts`.
export default function CorpoRegularizacaoVoluntaria() {
  return (
    <>
      <Seccao titulo="O que conta como regularização voluntária">
        <Paragrafo>
          É entregar o que faltava — a declaração, o documento, a prestação tributária —{" "}
          <strong>antes de a administração agir</strong>. Não é um pedido de perdão nem um regime
          especial: é um direito, com percentagens fixadas na lei.
        </Paragrafo>
        <Paragrafo>
          O nome «voluntária» diz exatamente o que a lei valoriza: a iniciativa ser tua. A partir do
          momento em que a AT deteta a falta, o mesmo ato passa a ser resposta, e vale menos.
        </Paragrafo>
        <Nota titulo="Vale para qualquer obrigação, não só para o IRS">
          Declarações em falta, declarações trimestrais, declarações periódicas de IVA, faltas de
          entrega. O mecanismo é o mesmo em todas — muda a moldura da coima, não a lógica da redução.
        </Nota>
      </Seccao>

      <Seccao titulo="A janela: antes de quê, exatamente">
        <Paragrafo>
          A lei nomeia quatro acontecimentos, e basta <em>um</em> deles para a janela maior fechar:
          ter sido levantado <strong>auto de notícia</strong>, ter sido recebida{" "}
          <strong>participação</strong> ou <strong>denúncia</strong>, ou ter sido{" "}
          <strong>iniciado procedimento de inspeção tributária</strong>.
        </Paragrafo>
        <Paragrafo>
          Nenhum deles é «a AT reparou». Cada um é um ato formal, com data. É por isso que a janela é
          verificável, e não uma questão de sorte.
        </Paragrafo>
        <AvisoPrazo titulo="O início da inspeção é o que fecha primeiro, e chega por carta">
          Recebida a carta-aviso ou notificada a ordem de serviço, a redução maior deixa de estar
          disponível. Fica a segunda janela — até ao termo do prazo de audição prévia —, que vale
          menos mas ainda vale muito.
        </AvisoPrazo>
        <VaiPara href="/guias/inspecao-tributaria">
          O que é a carta-aviso, a ordem de serviço e a audição prévia
        </VaiPara>
      </Seccao>

      <Seccao titulo="Percentagens de redução por momento">
        <Paragrafo>
          São duas, e a distância entre elas é de um fator de quatro.
        </Paragrafo>
        <Paragrafo>
          · <strong>{pctExato(REDUCAO_COIMA.antesDeQualquerAcao.value)}</strong> do montante mínimo
          legal, quando nada foi ainda iniciado.
          <br />· <strong>{pctExato(REDUCAO_COIMA.ateAudicaoPrevia.value)}</strong> do montante
          mínimo legal, até ao termo do prazo de audição prévia numa inspeção.
        </Paragrafo>
        <Paragrafo>
          As percentagens incidem sobre {REDUCAO_COIMA.baseDeCalculo.value} — nunca sobre o máximo
          nem sobre um valor a arbitrar.
        </Paragrafo>
        <AvisoPrazo titulo="E há um piso que fixa o valor real">
          Havendo redução, o montante mínimo a pagar é de{" "}
          <strong>{fmt(COIMAS_RGIT.minimoComReducao.value)}</strong>. Numa coima de declarações, a
          percentagem sozinha daria menos — é o piso que decide o valor efetivo. Sem redução, o piso
          é de {fmt(COIMAS_RGIT.minimoAPagar.value)}.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O pedido: quando é preciso e quando é implícito">
        <Paragrafo>
          O guia chama-se «o pedido que quase ninguém faz», e a resposta verificada é melhor do que a
          pergunta sugere: na maior parte dos casos <strong>não é preciso pedir nada</strong>.
        </Paragrafo>
        <Paragrafo>
          A lei diz que, sempre que a regularização não dependa de tributo a liquidar pelos serviços,{" "}
          <strong>vale como pedido de redução {REDUCAO_COIMA.pedidoImplicito.value}</strong>. Entregar
          a declaração em falta é, em si, o pedido.
        </Paragrafo>
        <Paragrafo>
          Nesses casos, se o pagamento da coima reduzida não for feito ao mesmo tempo que a entrega,
          és <strong>notificado para o fazer</strong> — e é essa notificação que abre o prazo da
          secção seguinte.
        </Paragrafo>
        <Nota titulo="Onde ainda faz sentido pedir por escrito">
          Quando a regularização depende de liquidação pelos serviços, e sempre que queiras deixar
          registada a data em que agiste. Um pedido datado é a prova de que estavas dentro da janela
          — e a janela é precisamente o que se discute.
        </Nota>
      </Seccao>

      <Seccao titulo="Pagar no prazo">
        <Paragrafo>
          O direito à redução <strong>depende do pagamento</strong>. Não basta pedir: é preciso pagar
          nos <strong>{REDUCAO_COIMA.prazoPagamentoDias.value} dias</strong> posteriores à
          notificação da coima reduzida, e ter a situação tributária regularizada no mesmo prazo.
        </Paragrafo>
        <Paragrafo>
          Falhando isso, é <em>de imediato</em> instaurado processo de contraordenação — e o valor
          volta a ser o da coima cheia.
        </Paragrafo>
        <AvisoPrazo titulo="São os dois no mesmo prazo, não um de cada vez">
          Pagar a coima e deixar o imposto por regularizar não cumpre a condição. A lei exige as duas
          coisas dentro da mesma janela, e é onde os processos mais se perdem.
        </AvisoPrazo>
        <Nota titulo="Uma redução consumida tira-te a dispensa dos anos seguintes">
          A dispensa de coima exige {DISPENSA_COIMA.anosDeHistorialLimpo.value} anos sem condenação{" "}
          <em>e sem ter beneficiado</em> de dispensa ou de coima reduzida. Aproveitar a redução hoje
          é usar uma carta que só volta a existir daqui a cinco anos.
        </Nota>
        <VaiPara href="/guias/coimas-fiscais">
          As molduras, os pisos e a diferença entre dispensa e redução
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que fazer se já houve inspeção">
        <Passos
          passos={[
            {
              titulo: "Identificar em que fase estás",
              texto: "Carta-aviso, ordem de serviço notificada, projeto de relatório, relatório final. Só a partir do projeto de relatório é que corre o prazo de audição prévia — e é ele que define a última janela.",
            },
            {
              titulo: "Regularizar até ao termo do prazo de audição prévia",
              texto: `Dentro dessa janela a coima reduz-se a ${pctExato(REDUCAO_COIMA.ateAudicaoPrevia.value)} do mínimo legal. Depois dela, não há redução.`,
            },
            {
              titulo: "Usar a audição prévia para o que ela serve",
              texto: "É o momento de contestar o que está errado no projeto de correções — e o único em que ainda se muda o relatório final antes de haver liquidação.",
            },
            {
              titulo: "Se a infração não existiu, não regularizar: contestar",
              texto: "Regularizar é assumir a falta. Quando a obrigação não existia ou já tinha sido cumprida, a via é a defesa, não o pagamento reduzido.",
            },
            {
              titulo: "Depois da liquidação, mudam os instrumentos",
              texto: "Deixa de ser matéria de coima e passa a ser reclamação graciosa, revisão do ato tributário ou impugnação — cada uma com o seu prazo.",
            },
          ]}
        />
        <VaiPara href="/guias/declaracao-substituicao">
          Corrigir a declaração: os três relógios de quem quer emendar
        </VaiPara>
        <VaiPara href="/guias/irs-fora-do-prazo">
          O caso concreto do IRS entregue fora de prazo
        </VaiPara>
      </Seccao>
    </>
  );
}
