import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { FERIAS } from "@/lib/fiscal-data";

export const metadata: Metadata = metadataDoGuia("ferias-direitos");

export default function FeriasDireitosPage() {
  return (
    <GuiaLayout slug="ferias-direitos">
      <Seccao titulo="22 dias úteis">
        <Paragrafo>
          O período anual de férias tem a duração mínima de{" "}
          <strong>{FERIAS.diasUteisAno.value} dias úteis</strong>. Contam-se dias úteis, não dias de
          calendário: os sábados, domingos e feriados não descontam do direito.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="No ano de admissão a regra é outra">
        <TabelaPrazos
          colunas={["Regra", "Valor"]}
          linhas={[
            ["Por cada mês de duração do contrato", `${FERIAS.anoAdmissaoDiasPorMes.value} dias úteis`],
            ["Máximo no ano de admissão", `${FERIAS.anoAdmissaoMaximo.value} dias úteis`],
            ["Quando se podem gozar", "Após seis meses completos de execução do contrato"],
          ]}
        />
      </Seccao>

      <Seccao titulo="Quem marca">
        <Paragrafo>
          Por acordo, em primeiro lugar. Na falta de acordo, cabe ao empregador marcar — mas dentro
          de limites: há um período do ano em que o pode fazer, e há a obrigação de elaborar e
          afixar o mapa de férias.
        </Paragrafo>
        <Nota titulo="«Marcar» não é «impor a qualquer momento»">
          A faculdade do empregador existe para resolver o desacordo, não para dispensar a tentativa
          de acordo. E o mapa de férias afixado é o documento que fixa o que ficou marcado.
        </Nota>
      </Seccao>

      <Seccao titulo="O direito que quase ninguém reclama">
        <AvisoPrazo titulo="Férias não gozadas por culpa do empregador valem o triplo">
          Se as férias não forem gozadas por culpa da entidade empregadora, há direito ao pagamento
          do <strong>triplo da retribuição correspondente</strong> ao período em falta — além do
          direito a gozá-las no ano seguinte.
        </AvisoPrazo>
        <Paragrafo>
          É um direito real, frequentemente violado e raramente reclamado, por puro
          desconhecimento. O perfil é idêntico ao da indemnização mínima por custos de cobrança nas
          faturas em atraso: existe, é automático, e ninguém o pede.
        </Paragrafo>
        <VaiPara href="/guias/juros-de-mora">O paralelo do lado das faturas</VaiPara>
      </Seccao>

      <Seccao titulo="O que se recebe e o que acontece no fim do contrato">
        <Paragrafo>
          Durante as férias recebe-se a retribuição normal, mais o subsídio de férias. Na cessação
          do contrato, os dias vencidos e não gozados e os proporcionais do ano entram nos créditos
          finais.
        </Paragrafo>
        <VaiPara href="/guias/subsidios-ferias-natal">Subsídios de férias e de Natal</VaiPara>
        <VaiPara href="/guias/fim-do-contrato">As contas finais do contrato</VaiPara>
        <VaiPara href="/guias/faltas-ao-trabalho">Como as faltas afetam as férias</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
