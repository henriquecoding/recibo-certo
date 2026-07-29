import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Passos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("execucao-fiscal");

export default function ExecucaoFiscalPage() {
  return (
    <GuiaLayout slug="execucao-fiscal">
      <Seccao titulo="A citação é o relógio a começar">
        <Paragrafo>
          A execução fiscal é a cobrança coerciva de uma dívida que já não está em pagamento
          voluntário. A citação é o momento em que és formalmente chamado ao processo — e o momento
          a partir do qual correm os prazos que ainda te deixam agir.
        </Paragrafo>
        <AvisoPrazo titulo="Ignorar é a única via sem retorno">
          Não responder não suspende nada. A partir da citação, o processo avança para penhora de
          bens, saldos bancários e rendimentos, com custas a acumular. Todas as saídas úteis
          dependem de agires dentro de prazo.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="As saídas que continuam abertas">
        <Passos
          passos={[
            {
              titulo: "Pagar",
              texto: <>Extingue o processo. É a via mais barata quando é possível, porque evita custas e juros adicionais.</>,
            },
            {
              titulo: "Pedir pagamento em prestações",
              texto: <>Permite diluir a dívida no tempo e, em regra, evita atos de penhora enquanto o plano é cumprido.</>,
              base: "Art. 196.º CPPT",
            },
            {
              titulo: "Suspender, prestando garantia",
              texto: (
                <>
                  Se estás a discutir a legalidade da dívida, a execução suspende-se desde que tenha
                  sido constituída ou prestada garantia — ou que a penhora já garanta a totalidade
                  da quantia exequenda e do acrescido.
                </>
              ),
              base: "Art. 169.º CPPT",
            },
            {
              titulo: "Opor-te",
              texto: <>A oposição à execução tem fundamentos e prazo próprios, contados da citação. É matéria para apoio profissional.</>,
            },
          ]}
        />
      </Seccao>

      <Seccao titulo="E o tempo?">
        <Paragrafo>
          Uma dívida em execução não é eterna, mas a contagem da prescrição suspende-se e
          interrompe-se com factos do próprio processo — a começar pela citação. Por isso raramente
          se conclui alguma coisa contando anos no calendário.
        </Paragrafo>
        <VaiPara href="/guias/prazos-fiscais-divida">Caducidade e prescrição, explicadas</VaiPara>
        <VaiPara href="/guias/plano-prestacoes">Pedir prestações</VaiPara>
        <VaiPara href="/guias/suspender-execucao">Suspender enquanto discuto</VaiPara>
        <VaiPara href="/guias/penhora-limites">O que me podem penhorar</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
