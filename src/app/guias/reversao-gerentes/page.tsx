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

      {/* O guia explicava bem a diferença entre as alíneas e não dizia ao
          gerente citado o que fazer nos 30 dias seguintes. Faltava o direito
          com valor imediato — que é dinheiro e depende de um prazo. */}
      <Seccao titulo="Fui citado. O que fazer nos próximos 30 dias">
        <AvisoPrazo titulo="Pagar dentro do prazo de oposição isenta de custas e de juros">
          O responsável subsidiário que, citado, pague a dívida <strong>dentro do prazo de
          oposição</strong> fica isento de custas e dos juros de mora liquidados no processo. É
          dinheiro, é imediato, e perde-se com o prazo. O prazo de oposição é de{" "}
          <strong>30 dias</strong> a contar da citação.
        </AvisoPrazo>
        <Paragrafo>
          Isto não significa que pagar seja a decisão certa — significa que a decisão tem de ser
          tomada dentro daquele prazo, com a conta feita. Pagar depois custa custas e juros; pagar
          dentro do prazo, não.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Fundamento de defesa", "O que se verifica"]}
          linhas={[
            [
              "Falta de audição prévia",
              "A reversão exige audição prévia do responsável subsidiário antes de ser decidida.",
            ],
            [
              "Bens da sociedade não estão esgotados",
              "A reversão depende da fundada insuficiência dos bens penhoráveis da sociedade — não basta a dívida existir.",
            ],
            [
              "Prescrição já corrida",
              "A interrupção da prescrição contra a sociedade só aproveita contra o responsável subsidiário se a citação deste ocorrer dentro do prazo previsto na lei.",
            ],
          ]}
        />
        <Nota titulo="O argumento de prescrição perde-se por desconhecimento">
          É frequente o processo contra a sociedade ter interrompido a prescrição há muito, e a
          citação do gerente chegar bastante depois. Nessa situação, o efeito interruptivo pode não
          se estender a quem é citado tarde — e é uma defesa que ninguém levanta se não souber que
          existe.
        </Nota>
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
