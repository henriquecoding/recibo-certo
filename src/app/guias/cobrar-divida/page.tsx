import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, Nota, Passos, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("cobrar-divida");

export default function CobrarDividaPage() {
  return (
    <GuiaLayout slug="cobrar-divida">
      <Seccao titulo="A cobrança é uma escada">
        <Paragrafo>
          Raramente se salta do email para o tribunal. Cada degrau custa mais tempo e mais dinheiro
          do que o anterior, e a maioria das dívidas resolve-se nos dois primeiros — desde que
          fiques com prova de todos.
        </Paragrafo>
        <Passos
          passos={[
            {
              titulo: "Interpelação escrita",
              texto: (
                <>
                  Uma comunicação clara com o valor em dívida, a data de vencimento, os juros já
                  vencidos e os 40 € de indemnização. Envia por meio que deixe rasto. Não é
                  necessária para os juros correrem, mas é a prova de diligência que vais precisar.
                </>
              ),
            },
            {
              titulo: "Injunção",
              texto: (
                <>
                  Um procedimento próprio para obrigações pecuniárias emergentes de contratos. Se o
                  devedor não deduzir oposição, o requerimento ganha força executiva — sem uma ação
                  judicial declarativa completa.
                </>
              ),
              base: "DL 269/98",
            },
            {
              titulo: "Execução",
              texto: (
                <>
                  Com título executivo, avança-se para a penhora de bens ou saldos. É o degrau mais
                  caro e o que mais beneficia de acompanhamento profissional.
                </>
              ),
            },
          ]}
        />
      </Seccao>

      <Seccao titulo="O limite de valor da injunção">
        <Paragrafo>
          É aqui que muita gente desiste sem razão. A injunção destina-se, em geral, a obrigações de
          valor não superior a 15 000 € — mas <strong>tratando-se de transações comerciais</strong>,
          entre empresas ou entre empresas e entidades públicas, é admissível{" "}
          <strong>independentemente do valor</strong>.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Tipo de dívida", "Injunção admissível?"]}
          linhas={[
            ["Contrato até 15 000 €", "Sim"],
            ["Transação comercial entre empresas", "Sim, sem limite de valor"],
            ["Transação comercial com entidade pública", "Sim, sem limite de valor"],
            ["Contrato acima de 15 000 € sem natureza comercial", "Não — o caminho é a ação declarativa"],
          ]}
        />
      </Seccao>

      <Seccao titulo="Quando a injunção não é o caminho">
        <Nota titulo="Dívida contestada">
          Se o devedor põe em causa a própria existência da dívida ou a qualidade do trabalho
          prestado, é provável que deduza oposição — e aí o procedimento converte-se em ação. Vale a
          pena aconselhamento antes de avançar, não depois.
        </Nota>
        <Nota titulo="Devedor insolvente">
          Se já corre processo de insolvência, o caminho não é a injunção mas a reclamação de
          créditos no processo. É também um dos factos que permite tratar o crédito como incobrável
          para efeitos de IVA.
        </Nota>
      </Seccao>

      <Seccao titulo="Não te esqueças do IVA">
        <Paragrafo>
          Enquanto persegues o capital, há uma segunda recuperação a fazer em paralelo: o IVA que já
          entregaste ao Estado sobre aquela fatura. As duas coisas são independentes e têm prazos
          próprios.
        </Paragrafo>
        <VaiPara href="/guias/recuperar-iva-incobravel">
          Recuperar o IVA de faturas que não vais receber
        </VaiPara>
        <VaiPara href="/guias/juros-de-mora">
          Confirmar juros e encargos antes de interpelar
        </VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
