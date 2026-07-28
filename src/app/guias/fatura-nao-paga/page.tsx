import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, Passos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("fatura-nao-paga");

export default function FaturaNaoPagaPage() {
  return (
    <GuiaLayout slug="fatura-nao-paga">
      <Seccao titulo="Porque é que já deves imposto de dinheiro que não recebeste">
        <Paragrafo>
          É a pergunta que mais aflige quem trabalha por conta própria, e a resposta está numa
          única norma. Na categoria B, o rendimento fica sujeito a tributação{" "}
          <strong>desde o momento em que, para efeitos de IVA, é obrigatória a emissão de fatura</strong>
          {" "}— não desde o dia em que o dinheiro entra na conta. Só quando não há obrigação de
          emitir fatura é que releva o momento do pagamento.
        </Paragrafo>
        <Paragrafo>
          Ou seja: a partir do momento em que prestaste o serviço e emitiste (ou devias ter emitido)
          o documento, aquele valor conta como rendimento do ano, entra no teu IRS e — se não
          estiveres isento — o IVA correspondente é entregue ao Estado. O incumprimento do cliente
          não suspende nada disto.
        </Paragrafo>
        <AvisoPrazo titulo="Atrasar a fatura não adia o imposto">
          A fatura tem de ser emitida, o mais tardar, no 5.º dia útil seguinte ao momento em que o
          imposto é devido. Emitir mais tarde para empurrar o imposto para a frente não é
          planeamento fiscal — é uma contraordenação, e o imposto continua a reportar-se ao momento
          em que a obrigação nasceu.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que fazer, por esta ordem">
        <Passos
          passos={[
            {
              titulo: "Fixa a data de vencimento",
              texto: (
                <>
                  Tudo o que se segue conta a partir dela. Se o contrato não disser nada, o prazo
                  supletivo nas transações comerciais é de 30 dias a contar da receção da fatura.
                </>
              ),
              base: "DL 62/2013, Art. 4.º",
            },
            {
              titulo: "Conta os juros — que já estão a correr",
              texto: (
                <>
                  Nas transações comerciais os juros de mora vencem-se automaticamente, sem
                  necessidade de qualquer aviso, a partir do dia seguinte ao vencimento. Acrescem
                  40 € fixos de indemnização por custos de cobrança.
                </>
              ),
              base: "DL 62/2013, Art. 4.º e 7.º",
            },
            {
              titulo: "Interpela por escrito",
              texto: (
                <>
                  Não é preciso para os juros nascerem, mas é a prova de que fizeste diligências —
                  e essa prova é condição para recuperares o IVA mais tarde. Guarda tudo.
                </>
              ),
            },
            {
              titulo: "Recupera o IVA quando os prazos se cumprirem",
              texto: (
                <>
                  O IVA que entregaste sobre uma fatura não paga pode ser deduzido quando o crédito
                  passa a ser de cobrança duvidosa ou incobrável. Há prazos de mora a cumprir e
                  prova a reunir.
                </>
              ),
              base: "Art. 78.º-A CIVA",
            },
            {
              titulo: "Cobra, se ainda assim não pagar",
              texto: (
                <>
                  A injunção transforma o teu crédito em título executivo sem uma ação judicial
                  completa e, nas transações comerciais, não tem limite de valor.
                </>
              ),
              base: "DL 269/98",
            },
          ]}
        />
      </Seccao>

      <Seccao titulo="Continuar a partir daqui">
        <VaiPara href="/guias/juros-de-mora">
          Quanto posso exigir além do valor da fatura
        </VaiPara>
        <VaiPara href="/guias/recuperar-iva-incobravel">
          Recuperar o IVA que já entreguei ao Estado
        </VaiPara>
        <VaiPara href="/guias/cobrar-divida">
          Cobrar: da carta à injunção
        </VaiPara>
        <VaiPara href="/guias/iva-de-caixa">
          Evitar que volte a acontecer: o regime de IVA de caixa
        </VaiPara>
      </Seccao>

      <Seccao titulo="O que este guia não resolve">
        <Nota titulo="Não é aconselhamento jurídico">
          A decisão de avançar para injunção ou execução, e a avaliação da solvência do devedor,
          dependem do caso concreto. Este guia diz-te o que existe e em que prazos — não substitui
          um contabilista certificado nem um advogado.
        </Nota>
        <Paragrafo>
          Também não trata de salários em atraso: se és trabalhador por conta de outrem e o que
          falta é o vencimento, a matéria é laboral e o caminho é outro.
        </Paragrafo>
      </Seccao>
    </GuiaLayout>
  );
}
