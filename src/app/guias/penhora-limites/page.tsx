import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
// Regra 1: os valores não se escrevem no texto — derivam do SMN, para que em
// janeiro de 2027 não continuem a dizer 2 760 € quando o mínimo já subiu.
import { PENHORA_PISO_CALC, PENHORA_TETO_CALC, SMN } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

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
          colunas={["Limite", "Valor em 2026", "Quando se aplica"]}
          linhas={[
            [
              "Máximo da impenhorabilidade",
              `Três salários mínimos — ${fmt(PENHORA_TETO_CALC)}`,
              "A proteção dos dois terços não vai além deste valor",
            ],
            [
              "Mínimo garantido",
              `Um salário mínimo — ${fmt(PENHORA_PISO_CALC)}`,
              "Quando o executado não tem outro rendimento",
            ],
          ]}
        />
        <Nota titulo="Porque é que isto importa na prática">
          Sem o teto, quem tem rendimento alto ficaria com dois terços protegidos em termos
          absolutos; sem o piso, quem tem rendimento baixo poderia ficar abaixo do mínimo de
          subsistência. Os dois limites existem para fechar as duas pontas. Os valores acompanham o
          salário mínimo nacional, que em 2026 é de {fmt(SMN.value)}.
        </Nota>
      </Seccao>

      <Seccao titulo="Não é só o salário: a conta bancária">
        <Paragrafo>
          A penhora de saldo bancário é a mais frequente na execução fiscal e a mais assustadora,
          porque acontece <strong>sem aviso</strong>: o dinheiro deixa de estar disponível e só
          depois se percebe porquê.
        </Paragrafo>
        <Paragrafo>
          Também aqui a lei protege um mínimo. É impenhorável o saldo correspondente a{" "}
          <strong>um salário mínimo nacional</strong> — {fmt(PENHORA_PISO_CALC)} em 2026. Se a
          penhora tiver ido além disso, há que reclamar, e depressa.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Duas exceções que mudam tudo">
        <TabelaPrazos
          colunas={["Situação", "O que muda"]}
          linhas={[
            [
              "Execução por dívida de alimentos",
              "O regime dos dois terços não se aplica. A proteção reduz-se ao equivalente à pensão social do regime não contributivo — muito abaixo do salário mínimo.",
            ],
            [
              "Casa de morada de família",
              "Pode ser penhorada, mas a venda executiva está sujeita a limites próprios, designadamente quando a dívida é de valor reduzido face ao valor do imóvel.",
            ],
          ]}
        />
        <Nota titulo="Aqui a resposta honesta é: fala com um advogado">
          Estas duas exceções decidem-se caso a caso e no processo concreto. Uma página não substitui
          quem consegue ler as peças do processo e agir dentro do prazo.
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
        <VaiPara href="/guias/recibo-vencimento">Calcular o meu líquido e ver quanto é penhorável</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
