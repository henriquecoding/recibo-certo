import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("reversao-gerentes");

export default function ReversaoGerentesPage() {
  return (
    <GuiaLayout slug="reversao-gerentes">
      <Seccao titulo="A sociedade responde primeiro — mas não sozinha para sempre">
        <Paragrafo>
          A responsabilidade dos gerentes e administradores por dívidas fiscais da sociedade é{" "}
          <strong>subsidiária</strong>: só se efetiva quando o património da pessoa coletiva se
          revela insuficiente. Não é automática. Mas também não é remota — e o que decide a maioria
          dos casos é uma distinção que passa despercebida.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="As duas alíneas, e quem tem de provar o quê">
        <TabelaPrazos
          colunas={["", "Alínea a)", "Alínea b)"]}
          linhas={[
            [
              "Situação",
              "A dívida constituiu-se no período do cargo, ou o prazo de pagamento terminou depois dele",
              "O prazo legal de pagamento terminou durante o exercício do cargo",
            ],
            [
              "Condição",
              "Por culpa do gerente o património da sociedade se tornou insuficiente",
              "Salvo se o gerente provar que não lhe foi imputável a falta de pagamento",
            ],
            [
              "Quem prova",
              "A administração tributária tem de demonstrar a culpa",
              "O ónus inverte-se: é o gerente que tem de provar",
            ],
          ]}
        />
        <AvisoPrazo titulo="É aqui que a maioria dos casos se decide">
          A diferença entre as duas alíneas não é de grau, é de ónus da prova. Na alínea b) a lei
          presume a imputabilidade e cabe ao gerente ilidi-la. Por isso a datação exata das dívidas
          e do exercício do cargo não é um detalhe administrativo — é o essencial da defesa.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Não é só quem consta do registo">
        <Nota titulo="Gerência de facto">
          A qualificação não depende apenas do que está registado. Quem exerceu funções de
          administração na prática pode ser abrangido, e quem constava do registo sem nunca ter
          exercido tem argumentos para o demonstrar. Em ambos os sentidos, é matéria de prova.
        </Nota>
        <Paragrafo>
          A responsabilidade prevista na lei estende-se ainda, em condições próprias, a membros de
          órgãos de fiscalização, revisores oficiais de contas e contabilistas certificados, quando
          haja violação dos seus deveres.
        </Paragrafo>
        <VaiPara href="/guias/execucao-fiscal">Recebi citação: o que corre agora</VaiPara>
        <VaiPara href="/guias/contestar-liquidacao">Contestar a reversão</VaiPara>
        <VaiPara href="/guias/unipessoal-vs-eni">Repensar a estrutura</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
