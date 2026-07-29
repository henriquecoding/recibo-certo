import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { COMPENSACAO_CESSACAO, SMN } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("fim-do-contrato");

export default function FimDoContratoPage() {
  const tetoBase = COMPENSACAO_CESSACAO.tetoBaseRMMG.value * SMN.value;
  const tetoGlobal = COMPENSACAO_CESSACAO.tetoTotalRMMG.value * SMN.value;

  return (
    <GuiaLayout slug="fim-do-contrato">
      <Seccao titulo="São três contas, não uma">
        <Paragrafo>
          Quando o contrato acaba há três parcelas que se somam e que costumam vir erradas:{" "}
          <strong>compensação por antiguidade</strong>, <strong>aviso prévio</strong> e{" "}
          <strong>créditos finais</strong>. Confundi-las é a razão pela qual quase todas as contas
          feitas em casa dão um número diferente do da empresa.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="A compensação: 12 dias por ano — e os tetos">
        <Paragrafo>
          Nos contratos celebrados a partir de 1 de outubro de 2013, a compensação é de{" "}
          <strong>{COMPENSACAO_CESSACAO.diasPorAno.value} dias</strong> de retribuição base e
          diuturnidades por cada ano completo de antiguidade, com proporcional nas frações.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Teto", "Valor em 2026"]}
          linhas={[
            [
              `Retribuição base a considerar: ${COMPENSACAO_CESSACAO.tetoBaseRMMG.value} × RMMG`,
              fmt(tetoBase),
            ],
            [
              `Total: ${COMPENSACAO_CESSACAO.tetoTotalMeses.value} meses de retribuição, ou ${COMPENSACAO_CESSACAO.tetoTotalRMMG.value} × RMMG`,
              `o menor dos dois — no limite, ${fmt(tetoGlobal)}`,
            ],
          ]}
        />
      </Seccao>

      <Seccao titulo="Os regimes transitórios são o essencial">
        <AvisoPrazo titulo="Admissão antes de outubro de 2013 muda tudo">
          Quem foi admitido antes de novembro de 2011 acumula tranches com contagens diferentes. A
          antiguidade não se multiplica por 12 dias de ponta a ponta: reparte-se por períodos.
        </AvisoPrazo>
        <TabelaPrazos
          colunas={["Período de antiguidade", "Dias por ano"]}
          linhas={COMPENSACAO_CESSACAO.transitorios.value.map((t) => [t.rotulo, String(t.diasPorAno)])}
        />
        <Nota titulo="É a razão de dois colegas receberem valores muito diferentes">
          Com a mesma antiguidade e o mesmo salário, quem entrou em 2010 e quem entrou em 2015 têm
          compensações que não se parecem — e a diferença não é erro da empresa.
        </Nota>
        <VaiPara href="/ferramentas/recibo-vencimento">Calcular com os meus valores</VaiPara>
      </Seccao>

      <Seccao titulo="Os créditos finais somam-se à compensação">
        <TabelaPrazos
          colunas={["Crédito", "O que é"]}
          linhas={[
            ["Férias vencidas e não gozadas", "Dias a que já tinhas direito e não chegaste a gozar"],
            ["Proporcional de férias do ano da cessação", "Pelos meses completos trabalhados no ano"],
            ["Proporcional de subsídio de férias", "Idem"],
            ["Proporcional de subsídio de Natal", "Idem"],
            ["Formação contínua não ministrada", "As horas de formação a que tinhas direito e não recebeste"],
          ]}
        />
        <Nota titulo="A formação é o crédito mais esquecido">
          Raramente aparece nas contas finais e raramente é reclamado — mas é devido.
        </Nota>
      </Seccao>

      <Seccao titulo="Depois disto">
        <VaiPara href="/guias/subsidio-desemprego">Tenho direito a subsídio de desemprego?</VaiPara>
        <VaiPara href="/guias/ferias-direitos">Contas de férias</VaiPara>
        <VaiPara href="/ferramentas/auditoria-recibo">Auditar o que me pagaram</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
