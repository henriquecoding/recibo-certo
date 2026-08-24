import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, Passos, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { SEGURO_ACIDENTES_TRABALHO_ESTIMATIVA, SMN, SS_DEPENDENTE, SUBSIDIO_REFEICAO } from "@/lib/fiscal-data";
import { fmt, pctExato } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("contratar-primeiro-trabalhador");

export default function ContratarPrimeiroTrabalhadorPage() {
  // Exemplo com o salário mínimo, para o custo real ficar concreto.
  const base = SMN.value;
  const anualBase = base * 14;
  const tsu = anualBase * SS_DEPENDENTE.entidade.value;
  const refeicao = SUBSIDIO_REFEICAO.cartao.value * 22 * 11;
  const seguro = anualBase * SEGURO_ACIDENTES_TRABALHO_ESTIMATIVA.value;

  return (
    <GuiaLayout slug="contratar-primeiro-trabalhador">
      <Seccao titulo="O salário não é o custo">
        <Paragrafo>
          O erro mais comum de quem contrata pela primeira vez é orçamentar o salário e pouco mais.
          O custo real de um posto de trabalho tem quatro parcelas, e a soma surpreende.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Parcela", `Exemplo com ${fmt(base)}/mês`, "Nota"]}
          linhas={[
            ["Salário em 14 meses", fmt(anualBase), "12 meses + subsídio de férias + subsídio de Natal"],
            [
              `Contribuição da empresa (${pctExato(SS_DEPENDENTE.entidade.value)})`,
              fmt(tsu),
              "Incide sobre a remuneração e sobre os subsídios",
            ],
            [
              "Subsídio de refeição",
              fmt(refeicao),
              `${fmt(SUBSIDIO_REFEICAO.cartao.value)}/dia em cartão, 22 dias, 11 meses`,
            ],
            [
              "Seguro de acidentes de trabalho",
              `~${fmt(seguro)}`,
              "Estimativa de mercado — o prémio varia com a atividade e a seguradora",
            ],
            ["Total anual aproximado", fmt(anualBase + tsu + refeicao + seguro), "Contra os " + fmt(base * 12) + " que uma conta apressada daria"],
          ]}
        />
        <VaiPara href="/ferramentas/recibo-vencimento">Calcular o custo com o meu salário</VaiPara>
      </Seccao>

      <Seccao titulo="A comunicação que tem prazo">
        <AvisoPrazo titulo="24 horas ANTES do início">
          A admissão tem de ser comunicada à Segurança Social nas 24 horas anteriores ao início da
          produção de efeitos do contrato. Não é «no próprio dia» nem «na primeira semana» —
          é antes. Falhar é contraordenação.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O seguro é obrigatório desde o primeiro dia">
        <Paragrafo>
          Sem exceção e sem período de tolerância. Contratar alguém sem seguro de acidentes de
          trabalho em vigor expõe a empresa à responsabilidade integral por qualquer sinistro — que
          é o tipo de risco que fecha empresas pequenas.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Pela ordem certa">
        <Passos
          passos={[
            { titulo: "Definir o posto e o salário", texto: "Com o custo total à frente, não só o valor do vencimento." },
            { titulo: "Contratar o seguro de acidentes de trabalho", texto: "Tem de estar em vigor no primeiro dia." },
            { titulo: "Comunicar a admissão à Segurança Social", texto: "Nas 24 horas anteriores ao início." },
            { titulo: "Formalizar o contrato", texto: "Por escrito sempre que a lei o exija — termo, tempo parcial, teletrabalho, muito curta duração." },
            { titulo: "Preparar o processamento mensal", texto: "Recibo, DMR, entrega das contribuições até ao dia 20 e retenção de IRS." },
          ]}
        />
        <Nota titulo="Período experimental">
          A duração varia com o tipo de contrato e com a função, e há uma regra própria para quem
          procura o primeiro emprego. Confirmar antes de contar com ele.
        </Nota>
        <VaiPara href="/guias/recibo-vencimento">Como se lê um recibo de vencimento</VaiPara>
        <VaiPara href="/guias/subsidios-ferias-natal">Subsídios de férias e de Natal</VaiPara>
        <VaiPara href="/guias/salario-gerente-ou-dividendos">E quanto me pago a mim próprio</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
