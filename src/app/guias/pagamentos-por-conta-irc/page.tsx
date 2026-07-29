import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { PAGAMENTOS_CONTA_IRC } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("pagamentos-por-conta-irc");

export default function PagamentosPorContaIrcPage() {
  return (
    <GuiaLayout slug="pagamentos-por-conta-irc">
      <Seccao titulo="A surpresa do segundo ano">
        <Paragrafo>
          Uma empresa que teve lucro no primeiro ano recebe, no segundo, uma obrigação que não
          esperava: <strong>pagar IRC antes de haver contas</strong>. São três pagamentos por conta,
          calculados sobre a coleta do ano <em>passado</em>, e entregues ao longo do ano corrente.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Pagamento", "Prazo"]}
          linhas={[
            ["1.º", "Até 31 de julho"],
            ["2.º", "Até 30 de setembro"],
            ["3.º", "Até 15 de dezembro"],
          ]}
        />
      </Seccao>

      <Seccao titulo="Quanto é">
        <TabelaPrazos
          colunas={["Volume de negócios do ano anterior", "Total dos pagamentos por conta"]}
          linhas={[
            [
              `Até ${fmt(PAGAMENTOS_CONTA_IRC.limiteVolumeNegocios.value)}`,
              `${pct(PAGAMENTOS_CONTA_IRC.taxaAte500k.value)} da coleta do ano anterior, líquida de retenções`,
            ],
            [
              `Acima de ${fmt(PAGAMENTOS_CONTA_IRC.limiteVolumeNegocios.value)}`,
              `${pct(PAGAMENTOS_CONTA_IRC.taxaAcima500k.value)} da coleta do ano anterior, líquida de retenções`,
            ],
          ]}
        />
        <Nota titulo="Há dispensa">
          Não há lugar a pagamentos por conta quando a coleta do período anterior, líquida de
          retenções, é igual ou inferior a {fmt(PAGAMENTOS_CONTA_IRC.dispensaColeta.value)}.
        </Nota>
      </Seccao>

      <Seccao titulo="A armadilha de travar o terceiro">
        <AvisoPrazo titulo="Errar a estimativa por mais de 20% custa juros">
          Se estimares que o já pago cobre o imposto devido, podes limitar ou suspender o terceiro
          pagamento. Mas se a estimativa errar por mais de{" "}
          {pct(PAGAMENTOS_CONTA_IRC.margemErroTerceiro.value)}, são devidos juros compensatórios
          sobre a diferença.
        </AvisoPrazo>
        <Paragrafo>
          É uma faculdade útil para quem teve um ano claramente pior do que o anterior — e um risco
          para quem a usa por otimismo. A conta tem de estar feita antes de dezembro, não depois.
        </Paragrafo>
        <VaiPara href="/ferramentas/simulador-empresa">Estimar o IRC do ano corrente</VaiPara>
      </Seccao>

      <Seccao titulo="E se não conseguires pagar">
        <Paragrafo>
          O pagamento por conta em falta segue para cobrança como qualquer outra dívida. Antes de
          chegar aí, vale a pena conhecer as opções.
        </Paragrafo>
        <VaiPara href="/guias/plano-prestacoes">Pagar a prestações</VaiPara>
        <VaiPara href="/guias/modelo-22-e-ies">As entregas anuais da empresa</VaiPara>
        <VaiPara href="/guias/calendario-fiscal">O calendário fiscal completo</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
