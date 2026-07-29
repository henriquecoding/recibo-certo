import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, Passos, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("fechar-empresa");

export default function FecharEmpresaPage() {
  return (
    <GuiaLayout slug="fechar-empresa">
      <Seccao titulo="Fechar não é deixar de faturar">
        <Paragrafo>
          Uma sociedade que deixa de ter atividade continua a existir — e continua obrigada às
          entregas anuais, à contabilidade e às contribuições que tenha. Deixar de faturar sem fechar
          é acumular obrigações em silêncio.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Passo", "O que é"]}
          linhas={[
            ["Dissolução", "Abre o processo. A sociedade passa a estar «em liquidação» e mantém personalidade jurídica."],
            ["Liquidação", "Paga o passivo, cobra o ativo e partilha o que sobra pelos sócios."],
            ["Registo do encerramento", "Só aqui a sociedade se extingue."],
          ]}
        />
      </Seccao>

      <Seccao titulo="A via rápida, e quando não serve">
        <Paragrafo>
          Existe a <strong>dissolução na hora</strong>, num balcão único, para sociedades sem
          passivo e com o ativo já partilhado. É rápida e barata — mas exige exatamente isso: contas
          arrumadas e nada em aberto.
        </Paragrafo>
        <Nota titulo="Se há passivo que não consegue ser pago">
          Aí o caminho não é a dissolução: é a insolvência. Tentar dissolver uma sociedade
          insolvente expõe os gerentes, em vez de os proteger.
        </Nota>
      </Seccao>

      <Seccao titulo="Pela ordem certa">
        <Passos
          passos={[
            { titulo: "Deliberar a dissolução", texto: "Em assembleia geral, com nomeação de liquidatários." },
            { titulo: "Pagar o passivo", texto: "Todo, incluindo dívidas fiscais e contributivas." },
            { titulo: "Partilhar o que resta", texto: "Pelos sócios, na proporção das participações." },
            { titulo: "Registar o encerramento da liquidação", texto: "É o ato que extingue a sociedade." },
            { titulo: "Declarar a cessação nas Finanças e na Segurança Social", texto: "O registo comercial não substitui a declaração fiscal." },
          ]}
        />
      </Seccao>

      <Seccao titulo="O que NÃO se fecha com a empresa">
        <AvisoPrazo titulo="A responsabilidade dos gerentes sobrevive">
          A responsabilidade subsidiária dos gerentes por dívidas fiscais da sociedade não
          desaparece com o encerramento: pode ser efetivada por reversão depois de a empresa estar
          fechada. Fechar com dívidas por regularizar não corta o fio — apenas o transfere.
        </AvisoPrazo>
        <VaiPara href="/guias/reversao-gerentes">Quando a dívida da empresa passa para o gerente</VaiPara>
      </Seccao>

      <Seccao titulo="Quanto tempo guardar os documentos">
        <Paragrafo>
          A extinção da sociedade não apaga o prazo durante o qual a Autoridade Tributária pode
          liquidar e cobrar. Os documentos têm de continuar disponíveis, e alguém tem de saber onde
          estão — normalmente o antigo gerente.
        </Paragrafo>
        <VaiPara href="/guias/prazos-fiscais-divida">Até quando é que a AT pode cobrar</VaiPara>
        <VaiPara href="/guias/cessar-atividade">Cessar atividade como independente</VaiPara>
        <VaiPara href="/guias/modelo-22-e-ies">As entregas anuais até ao fim</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
