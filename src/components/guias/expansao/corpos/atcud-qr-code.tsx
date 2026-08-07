import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, FATURACAO_PRAZOS } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto aos prazos e às coimas: art. 36.º do
// CIVA na coleção consolidada e art. 117.º do RGIT.
//
// A mecânica do ATCUD e do QR consta do Decreto-Lei n.º 28/2019 e das
// portarias que o regulamentam. As datas de entrada em vigor foram
// sucessivamente adiadas por diplomas anuais e o Diário da República serve
// um shell vazio: este guia descreve o MECANISMO, que é estável, e não fixa
// datas — o pacote marca isso como máxima prioridade de verificação.
export default function CorpoAtcudQrCode() {
  return (
    <>
      <Seccao titulo="O que é o ATCUD">
        <Paragrafo>
          É o <strong>código único de documento</strong>, e resolve um problema simples: como é que
          alguém — a AT, um cliente, um fiscal — confirma que aquele documento é mesmo o que diz ser?
        </Paragrafo>
        <Paragrafo>
          Compõe-se de duas partes: o <strong>código de validação da série</strong>, atribuído pela
          AT quando comunicas a série, e o <strong>número sequencial</strong> do documento dentro
          dessa série. Escreve-se com as duas separadas por um hífen.
        </Paragrafo>
        <Nota titulo="É por série, não por documento">
          O código de validação obtém-se uma vez por série. Depois, cada documento dessa série leva
          esse código mais o seu próprio número. Não há um pedido por fatura.
        </Nota>
      </Seccao>

      <Seccao titulo="Registar uma série e obter o código de validação">
        <Paragrafo>
          Comunica-se a série à AT — no Portal das Finanças ou automaticamente pelo programa de
          faturação, através de serviço próprio — indicando o tipo de documento, o identificador da
          série, o número inicial e a data prevista de início de utilização.
        </Paragrafo>
        <Paragrafo>
          A AT devolve o <strong>código de validação</strong>, que fica associado àquela série
          enquanto ela existir. Programas certificados fazem isto sem intervenção manual; quem factura
          no Portal das Finanças não precisa de fazer nada.
        </Paragrafo>
        <AvisoPrazo titulo="Comunica antes de emitir, não depois">
          A série tem de estar comunicada e validada <em>antes</em> do primeiro documento que a usa.
          Emitir primeiro e comunicar depois deixa documentos emitidos sem código válido — e não há
          forma de lhes atribuir um retroativamente.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que o QR code contém">
        <Paragrafo>
          Uma representação estruturada dos dados essenciais do documento: identificação do emitente
          e do adquirente, tipo e data do documento, valores por taxa de imposto, total, o ATCUD e a
          assinatura.
        </Paragrafo>
        <Paragrafo>
          Serve para que qualquer pessoa possa ler o documento com o telemóvel e — no caso do
          adquirente — registá-lo no e-Fatura sem o digitar. É a razão pela qual o QR existe: não é
          para a AT, é para quem recebe.
        </Paragrafo>
        <Nota titulo="O QR não substitui a comunicação">
          Os documentos continuam a ser comunicados à AT pelos meios próprios. O QR é uma
          conveniência de leitura, não um canal de comunicação.
        </Nota>
        <VaiPara href="/guias/e-fatura">
          O e-Fatura, do lado de quem regista as despesas
        </VaiPara>
      </Seccao>

      <Seccao titulo="Onde têm de aparecer no documento">
        <Paragrafo>
          O <strong>ATCUD</strong> em todas as páginas, em texto legível, junto aos restantes
          elementos de identificação do documento. O <strong>QR code</strong> na primeira ou na
          última página, com dimensão que permita a leitura.
        </Paragrafo>
        <Paragrafo>
          Valem para <strong>todos</strong> os documentos fiscalmente relevantes — faturas,
          faturas-recibo, notas de crédito, notas de débito, guias de transporte —, não apenas para
          as faturas.
        </Paragrafo>
        <AvisoPrazo titulo="Um PDF gerado por outro programa não herda o ATCUD">
          Quem emite no programa certificado e depois recria o documento noutra ferramenta — para o
          «arranjar», para lhe pôr o logótipo — produz um documento diferente, sem código válido. O
          documento fiscal é o que o programa emitiu.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Documentos sem ATCUD: consequências">
        <Paragrafo>
          Um documento sem os elementos obrigatórios não cumpre os requisitos legais. Do lado de quem
          emite, é contraordenação; do lado de quem recebe, é um documento que pode não sustentar a
          dedução do IVA nem a despesa.
        </Paragrafo>
        <Paragrafo>
          A moldura da coima por falta ou atraso na apresentação ou exibição de documentos vai de{" "}
          <strong>{fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)}</strong> a{" "}
          <strong>{fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}</strong>.
        </Paragrafo>
        <Nota titulo="O problema maior costuma ser comercial, não sancionatório">
          Um cliente empresa que receba um documento sem ATCUD devolve-o. É aí que o erro aparece
          primeiro — e é uma boa notícia, porque aparece a tempo de ser corrigido.
        </Nota>
        <VaiPara href="/guias/coimas-fiscais">
          As molduras das coimas, e como se reduzem
        </VaiPara>
      </Seccao>

      <Seccao titulo="Mudança de programa ou de ano">
        <Passos
          passos={[
            {
              titulo: "Ao mudar de programa, comunica séries novas",
              texto: "As séries do programa antigo não migram. Cria séries próprias no programa novo e comunica-as antes de emitir o primeiro documento.",
            },
            {
              titulo: "Não reutilizes o identificador de uma série antiga",
              texto: "Duas séries com o mesmo identificador e códigos diferentes é uma confusão que se propaga a toda a contabilidade do ano.",
            },
            {
              titulo: "Ao virar o ano, decide se abres série nova",
              texto: "É prática comum abrir série anual, e nesse caso ela é comunicada como qualquer outra. Manter a mesma série entre anos também é possível — o que não é possível é mudar sem comunicar.",
            },
            {
              titulo: "Guarda o SAF-T e os documentos do programa antigo",
              texto: "A obrigação de conservação não desaparece por teres mudado de ferramenta. Exporta antes de cancelar a subscrição — depois pode ser tarde.",
            },
            {
              titulo: "Confirma que a numeração não reinicia a meio",
              texto: `A sequência dentro de cada série tem de ser contínua. E o prazo de emissão continua a ser o do art. 36.º: o ${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil seguinte ao momento em que o imposto é devido.`,
            },
          ]}
        />
        <VaiPara href="/guias/programa-faturacao-certificado">
          Quando é obrigatório usar programa certificado
        </VaiPara>
      </Seccao>
    </>
  );
}
