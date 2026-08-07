import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { FATURACAO_PRAZOS, REGULARIZACAO_IVA } from "@/lib/fiscal-data";

// Corpo verificado a 07/08/2026 contra o articulado na coleção consolidada:
// arts. 29.º, 36.º e 78.º do CIVA, e o Decreto-Lei n.º 28/2019 quanto à
// comunicação de documentos.
//
// O pacote nota que os arts. 78.º-A a 78.º-D (créditos incobráveis) não têm
// página própria no Portal das Finanças — o guia não os desenvolve por isso,
// e remete para o PDF oficial do Código.
export default function CorpoNotaDeCredito() {
  return (
    <>
      <Seccao titulo="Anular ou retificar: o critério">
        <Paragrafo>
          O critério é um só e resolve quase todas as dúvidas:{" "}
          <strong>o documento já foi comunicado à AT?</strong>
        </Paragrafo>
        <Paragrafo>
          Não tendo sido — está em rascunho, ainda não foi emitido —, corrige-se sem mais. Tendo
          sido, o documento <strong>existe</strong> na esfera fiscal, e um documento que existe não
          se apaga: retifica-se por outro documento que o corrige.
        </Paragrafo>
        <AvisoPrazo titulo="Apagar do programa não apaga da AT">
          É o erro mais comum e o mais silencioso. O documento continua comunicado, continua a contar
          para o teu volume de negócios e continua a aparecer no e-Fatura do cliente — enquanto na
          tua contabilidade já não existe. A divergência aparece meses depois, sem explicação.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Erros no valor ou na taxa: nota de crédito">
        <Paragrafo>
          A nota de crédito é o documento que <strong>reduz</strong> o valor de uma fatura anterior.
          Serve para anular por inteiro, para corrigir um valor a mais, para conceder um desconto
          posterior ou para registar uma devolução.
        </Paragrafo>
        <Paragrafo>
          Quando a correção é <em>para mais</em> — faturaste menos do que devias — não é nota de
          crédito: é uma nota de débito, ou uma fatura adicional pela diferença.
        </Paragrafo>
        <Nota titulo="A nota de crédito não «apaga» a fatura">
          As duas coexistem. A fatura original mantém-se, comunicada e válida; a nota de crédito
          corrige-a. É por isso que ambas têm de estar na contabilidade e ambas são comunicadas.
        </Nota>
      </Seccao>

      <Seccao titulo="Erros no NIF ou no nome: substituição">
        <Paragrafo>
          Um erro na identificação do adquirente não se corrige com um ajuste de valor: o documento
          está dirigido à pessoa errada. O caminho é <strong>anular por nota de crédito</strong> e{" "}
          <strong>emitir nova fatura</strong> com os dados certos.
        </Paragrafo>
        <Paragrafo>
          É mais trabalhoso do que parece necessário, e é o único caminho correto — porque a fatura
          errada já entrou no e-Fatura de quem lá está identificado, e pode ter sido deduzida por
          ele.
        </Paragrafo>
        <AvisoPrazo titulo="Um NIF errado pode dar dedução a um estranho">
          Enquanto a fatura não for anulada, a despesa aparece nas deduções à coleta de outra pessoa.
          Corrigir depressa não é zelo — é evitar um problema que deixa de ser só teu.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que a nota de crédito tem de conter">
        <Paragrafo>
          Os mesmos elementos de qualquer documento fiscal — identificação das partes, data,
          numeração sequencial da sua própria série, ATCUD e código QR — e, além disso, a{" "}
          <strong>referência inequívoca à fatura que retifica</strong>.
        </Paragrafo>
        <Paragrafo>
          Sem essa referência, o documento não é retificativo: é um documento solto, que não liga a
          nada e não sustenta regularização nenhuma.
        </Paragrafo>
        <Nota titulo="A série é própria, não é a das faturas">
          As notas de crédito têm numeração sequencial própria, comunicada como qualquer outra série.
          Emitir uma nota de crédito com número de fatura é um erro de configuração do programa que
          se propaga a todos os documentos seguintes.
        </Nota>
        <VaiPara href="/guias/atcud-qr-code">
          O ATCUD e o QR: o que cada documento tem de mostrar
        </VaiPara>
      </Seccao>

      <Seccao titulo="Regularização do IVA e a prova exigida">
        <Paragrafo>
          Aqui está o requisito que quase toda a gente ignora, e que invalida a regularização quando
          falta. Reduzido o valor ou o imposto, a regularização{" "}
          <strong>a favor do sujeito passivo</strong> só pode ser feita quando este tiver na sua
          posse <strong>{REGULARIZACAO_IVA.provaExigida.value}</strong>.
        </Paragrafo>
        <Paragrafo>
          Sem essa prova, a lei diz que se considera <em>indevida</em> a respetiva dedução. Não é uma
          formalidade: é a condição de que o direito depende.
        </Paragrafo>
        <AvisoPrazo titulo="Guarda a confirmação de que o cliente recebeu">
          Um email com acusação de receção, uma assinatura no duplicado, um registo do envio. É este
          documento que sustenta a regularização se a AT vier perguntar — e o momento de o obter é
          quando se emite a nota de crédito, não dois anos depois.
        </AvisoPrazo>
        <Nota titulo="Do outro lado, o cliente também tem de corrigir">
          Quem recebeu a nota de crédito e já tinha deduzido o IVA corrige a dedução{" "}
          {REGULARIZACAO_IVA.adquirenteCorrigeAte.value}. É a contrapartida simétrica da tua
          regularização.
        </Nota>
      </Seccao>

      <Seccao titulo="Prazos para regularizar">
        <Paragrafo>
          Três prazos diferentes, e a assimetria entre eles é toda a matéria: corrigir a favor do{" "}
          <strong>Estado</strong> é obrigatório e rápido; corrigir a favor do{" "}
          <strong>sujeito passivo</strong> é facultativo e tem prazo longo.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Anulação ou redução do valor tributável",
              texto: `O fornecedor pode deduzir o imposto correspondente ${REGULARIZACAO_IVA.anulacaoAtePeriodoSeguinte.value} àquele em que se verificaram as circunstâncias.`,
            },
            {
              titulo: "Imposto liquidado a MENOS — obrigatório",
              texto: "A retificação é obrigatória, e pode ser feita sem qualquer penalidade até ao final do período seguinte àquele a que respeita a fatura a retificar.",
            },
            {
              titulo: "Imposto liquidado a MAIS — facultativo",
              texto: `É facultativo, e só pode ser feito no prazo de ${REGULARIZACAO_IVA.aMaisPrazoAnos.value} anos.`,
            },
            {
              titulo: "Erros materiais ou de cálculo",
              texto: "Facultativo quando resulte imposto a teu favor, com prazo próprio; obrigatório quando resulte imposto a favor do Estado.",
            },
            {
              titulo: "E emite o documento dentro do prazo geral",
              texto: `A fatura — e o documento retificativo — segue o prazo do art. 36.º: o ${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil seguinte ao momento em que o imposto é devido.`,
            },
          ]}
        />
        <Nota titulo="Créditos incobráveis são outra matéria">
          Quando o problema não é um erro mas um cliente que não paga, o mecanismo é o dos créditos
          incobráveis e de cobrança duvidosa — arts. 78.º e seguintes —, com requisitos próprios de
          prova e de comunicação ao adquirente. É matéria a tratar com um contabilista certificado.
        </Nota>
        <VaiPara href="/guias/fatura-nao-paga">
          O que fazer com uma fatura que não é paga
        </VaiPara>
        <VaiPara href="/guias/declaracao-periodica-iva">
          Onde a regularização entra na declaração periódica
        </VaiPara>
      </Seccao>
    </>
  );
}
