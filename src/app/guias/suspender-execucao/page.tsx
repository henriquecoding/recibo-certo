import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, Passos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("suspender-execucao");

export default function SuspenderExecucaoPage() {
  return (
    <GuiaLayout slug="suspender-execucao">
      <Seccao titulo="Contestar não trava a cobrança">
        <Paragrafo>
          É o erro mais caro nesta matéria, e é fácil de cometer: apresentar reclamação ou impugnação
          e assumir que a cobrança pára. Não pára. A execução continua a correr, e com ela os atos
          de penhora.
        </Paragrafo>
        <AvisoPrazo titulo="O que suspende é a garantia, não a discussão">
          A execução suspende-se, até decisão, quando esteja a discutir-se a legalidade da dívida
          exequenda <strong>e</strong> tenha sido constituída ou prestada garantia, ou a penhora já
          garanta a totalidade da quantia exequenda e do acrescido. São condições cumulativas.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="As três vias">
        <Passos
          passos={[
            {
              titulo: "Prestar garantia",
              texto: (
                <>
                  Garantia bancária, caução, seguro-caução ou outro meio idóneo aceite. Tem um custo
                  real que deve ser comparado com o valor em discussão.
                </>
              ),
              base: "Art. 199.º CPPT",
            },
            {
              titulo: "Penhora já suficiente",
              texto: (
                <>
                  Se já existe penhora que cobre a totalidade da quantia exequenda e do acrescido, a
                  suspensão pode operar sem garantia adicional.
                </>
              ),
              base: "Art. 169.º CPPT",
            },
            {
              titulo: "Pedir dispensa de garantia",
              texto: (
                <>
                  A lei prevê a dispensa, mas depende de pressupostos próprios que têm de ser
                  alegados e provados por ti. Não é automática nem se presume.
                </>
              ),
              base: "Art. 199.º CPPT",
            },
          ]}
        />
      </Seccao>

      <Seccao titulo="Fazer as contas antes">
        <Nota titulo="A garantia custa dinheiro">
          Uma garantia bancária tem comissões e pode exigir contragarantias. Em dívidas pequenas, o
          custo da garantia pode aproximar-se do valor em disputa. Vale a pena somar antes de
          decidir, e ponderar se o caminho não é pagar e discutir depois — com direito a juros
          indemnizatórios se vieres a ter razão.
        </Nota>
        <VaiPara href="/guias/juros-indemnizatorios">
          Se eu pagar e ganhar, recebo juros?
        </VaiPara>
        <VaiPara href="/guias/plano-prestacoes">Ou peço prestações</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
