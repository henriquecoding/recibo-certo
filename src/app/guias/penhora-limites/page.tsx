import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("penhora-limites");

export default function PenhoraLimitesPage() {
  return (
    <GuiaLayout slug="penhora-limites">
      <Seccao titulo="Dois terços estão protegidos">
        <Paragrafo>
          A lei não permite penhorar o rendimento todo. São impenhoráveis{" "}
          <strong>dois terços da parte líquida</strong> dos vencimentos, salários e prestações
          periódicas pagas a título de aposentação ou de outra natureza idêntica que assegurem a
          subsistência do executado.
        </Paragrafo>
        <Paragrafo>
          Na determinação dessa parte líquida apenas são considerados os{" "}
          <strong>descontos legalmente obrigatórios</strong> — não entram aqui, por exemplo,
          amortizações voluntárias ou subscrições facultativas.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="A proteção tem teto e piso">
        <TabelaPrazos
          colunas={["Limite", "Valor", "Quando se aplica"]}
          linhas={[
            [
              "Máximo da impenhorabilidade",
              "Três salários mínimos nacionais à data de cada apreensão",
              "A proteção dos dois terços não vai além deste valor",
            ],
            [
              "Mínimo garantido",
              "Um salário mínimo nacional",
              "Quando o executado não tem outro rendimento",
            ],
          ]}
        />
        <Nota titulo="Porque é que isto importa na prática">
          Sem o teto, quem tem rendimento alto ficaria com dois terços protegidos em termos
          absolutos; sem o piso, quem tem rendimento baixo poderia ficar abaixo do mínimo de
          subsistência. Os dois limites existem para fechar as duas pontas.
        </Nota>
      </Seccao>

      <Seccao titulo="Se acharem que retiveram a mais">
        <Paragrafo>
          A retenção é feita por quem paga o rendimento, na sequência da notificação de penhora. Se
          o valor retido exceder o que a lei permite, há lugar a reclamação — e convém agir depressa,
          porque cada mês que passa é um mês de retenção indevida.
        </Paragrafo>
        <VaiPara href="/guias/execucao-fiscal">Como cheguei aqui: a execução fiscal</VaiPara>
        <VaiPara href="/guias/plano-prestacoes">Evitar a penhora com um plano</VaiPara>
        <VaiPara href="/guias/recibo-vencimento">Calcular o meu líquido</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
