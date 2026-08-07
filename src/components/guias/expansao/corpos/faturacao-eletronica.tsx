import { Seccao, Paragrafo, Nota, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COIMAS_RGIT, FATURACAO_PRAZOS } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

// Corpo verificado a 07/08/2026 quanto aos prazos e às coimas: art. 36.º do
// CIVA na coleção consolidada e art. 117.º do RGIT.
//
// O pacote marca este guia com «MÁXIMA PRIORIDADE DE VERIFICAÇÃO: as datas
// foram sucessivamente adiadas por diplomas anuais. NÃO publicar datas sem
// as confirmar no DL 28/2019 consolidado e no diploma de adiamento mais
// recente». O Diário da República serve um shell vazio e não foi possível
// verificar nenhuma dessas datas nesta revisão — pelo que NENHUMA é
// publicada aqui. O guia separa as três obrigações, que é o que resolve a
// confusão, e manda confirmar o calendário na fonte.
export default function CorpoFaturacaoEletronica() {
  return (
    <>
      <Seccao titulo="As três obrigações que se confundem">
        <Paragrafo>
          Quase toda a confusão sobre «faturação eletrónica» vem de se tratarem como uma só coisa
          três obrigações diferentes, com âmbitos diferentes, destinatários diferentes e calendários
          diferentes.
        </Paragrafo>
        <Paragrafo>
          · A <strong>aceitação do PDF</strong> como fatura eletrónica — um regime transitório, com
          data de fim.
          <br />· A exigência de <strong>formato estruturado com assinatura eletrónica
          qualificada</strong> — o que a lei entende por fatura eletrónica em sentido próprio.
          <br />· O <strong>SAF-T da contabilidade</strong> — um ficheiro anual de prestação de
          contas, que nada tem que ver com o formato das faturas.
        </Paragrafo>
        <AvisoPrazo titulo="As datas deste guia não estão aqui, de propósito">
          Cada uma destas obrigações foi adiada várias vezes, por diplomas anuais sucessivos. Uma
          data escrita hoje pode estar errada no próximo Orçamento do Estado — e uma data errada é
          pior do que nenhuma. Confirma o calendário em vigor no Portal das Finanças ou com um
          contabilista certificado antes de tomares qualquer decisão de investimento.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="PDF: até quando vale">
        <Paragrafo>
          O regime que aceita faturas em PDF como faturas eletrónicas é <strong>transitório</strong>.
          Foi criado para dar tempo às empresas e tem sido prorrogado — mas continua a ser
          transitório, e o seu fim está previsto.
        </Paragrafo>
        <Paragrafo>
          Enquanto vigorar, uma fatura em PDF enviada por email cumpre. Quando terminar, deixa de
          cumprir para os sujeitos abrangidos pela exigência de formato estruturado.
        </Paragrafo>
        <Nota titulo="PDF continua a valer como cópia, sempre">
          O que está em causa é o documento com valor fiscal, não a comodidade de enviar um PDF ao
          cliente. Mesmo depois de exigido o formato estruturado, nada impede que envies também uma
          representação legível.
        </Nota>
      </Seccao>

      <Seccao titulo="Formato estruturado e assinatura eletrónica qualificada">
        <Paragrafo>
          «Fatura eletrónica», em sentido próprio, não é uma fatura enviada por meios eletrónicos: é
          uma fatura <strong>emitida e recebida em formato estruturado</strong>, que permite o seu
          processamento automático — e cuja integridade e autenticidade são garantidas por assinatura
          ou selo eletrónico qualificado, ou por outros meios admitidos.
        </Paragrafo>
        <Paragrafo>
          A diferença prática: um PDF é feito para ser lido por pessoas; um ficheiro estruturado é
          feito para ser lido por sistemas, sem intervenção humana.
        </Paragrafo>
        <AvisoPrazo titulo="Exige acordo do destinatário">
          A utilização de fatura eletrónica depende de aceitação pelo destinatário. Não é uma decisão
          unilateral de quem emite — o que na prática significa que a transição se faz cliente a
          cliente.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Faturação eletrónica com entidades públicas">
        <Paragrafo>
          É a frente onde a obrigação chegou primeiro e é hoje incontornável. Faturar ao Estado —
          administração direta e indireta, autarquias, entidades públicas empresariais — segue o
          regime da fatura eletrónica, com formato e canal próprios.
        </Paragrafo>
        <Paragrafo>
          Enviar um PDF por email a uma entidade pública abrangida não cumpre a obrigação: a fatura
          não entra no circuito de pagamento, e o atraso não é imputável a quem a devia pagar.
        </Paragrafo>
        <Nota titulo="Há soluções gratuitas para volumes baixos">
          Quem fatura ao Estado esporadicamente não precisa de integrar sistemas: existem portais que
          permitem submeter documentos avulsos no formato exigido. Confirma qual serve a entidade a
          que faturas.
        </Nota>
        <VaiPara href="/guias/situacao-regularizada">
          A situação regularizada, que o Estado verifica antes de contratar
        </VaiPara>
      </Seccao>

      <Seccao titulo="SAF-T da contabilidade">
        <Paragrafo>
          É a terceira obrigação, e a que menos tem que ver com as outras duas. O SAF-T da{" "}
          <strong>contabilidade</strong> é um ficheiro anual, gerado a partir da contabilidade
          organizada, destinado ao pré-preenchimento da declaração de rendimentos das empresas.
        </Paragrafo>
        <Paragrafo>
          Não se confunde com o SAF-T da <strong>faturação</strong>, que é mensal e sai do programa de
          faturação. Quem está no regime simplificado não tem contabilidade organizada — e a obrigação
          não se lhe aplica.
        </Paragrafo>
        <AvisoPrazo titulo="Também esta foi adiada várias vezes">
          Confirma o calendário em vigor. Como as outras, é matéria de diploma anual.
        </AvisoPrazo>
        <VaiPara href="/guias/saf-t-faturacao">
          O SAF-T da faturação, que é outra coisa e é mensal
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que fazer agora e o que pode esperar">
        <Passos
          passos={[
            {
              titulo: "Confirmar o calendário em vigor — primeiro passo, sempre",
              texto: "No Portal das Finanças ou com um contabilista certificado. É o que decide se alguma destas obrigações já te toca.",
            },
            {
              titulo: "Se faturas ao Estado, resolver isso já",
              texto: "É a única frente em que a obrigação é certa e imediata para quem lá fatura. E o incumprimento tem efeito prático imediato: a fatura não é paga.",
            },
            {
              titulo: "Verificar se o teu programa já suporta formato estruturado",
              texto: "A maior parte dos programas certificados já o faz, ou fará por atualização. Perguntar ao fornecedor custa um email e evita uma migração de urgência.",
            },
            {
              titulo: "Falar com os clientes empresa que já o exigem",
              texto: "Como a fatura eletrónica depende de aceitação do destinatário, a transição faz-se cliente a cliente. Os grandes clientes costumam ser os primeiros a pedir.",
            },
            {
              titulo: "Não investir por antecipação numa data que pode mudar",
              texto: "É o conselho mais útil deste guia. Várias empresas compraram soluções para prazos que foram depois adiados um ano — e voltaram a comprar.",
            },
            {
              titulo: "Manter os prazos de emissão, que esses não mudam",
              texto: `Seja qual for o formato, a fatura emite-se até ao ${FATURACAO_PRAZOS.regraGeralDiasUteis.value}.º dia útil seguinte ao momento em que o imposto é devido — e ${FATURACAO_PRAZOS.adiantamentos.value}, nos adiantamentos.`,
            },
          ]}
        />
        <Nota titulo="A moldura da coima, para dimensionar o risco">
          A falta ou atraso na apresentação ou exibição de documentos vai de{" "}
          {fmt(COIMAS_RGIT.faltaDeclaracoesMin.value)} a{" "}
          {fmt(COIMAS_RGIT.faltaDeclaracoesMax.value)}. É um risco real e é menor do que o de um
          investimento feito para um prazo que muda.
        </Nota>
      </Seccao>
    </>
  );
}
