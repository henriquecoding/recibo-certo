import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { PRAZOS_ANUAIS_EMPRESA } from "@/lib/fiscal-data";

const dia = (mmdd: string) => {
  const [m, d] = mmdd.split("-");
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${Number(d)} de ${meses[Number(m) - 1]}`;
};

export const metadata: Metadata = metadataDoGuia("modelo-22-e-ies");

export default function Modelo22EIesPage() {
  return (
    <GuiaLayout slug="modelo-22-e-ies">
      <Seccao titulo="Duas declarações, duas perguntas diferentes">
        <TabelaPrazos
          colunas={["Declaração", "A que pergunta responde", "Prazo"]}
          linhas={[
            [
              "Modelo 22",
              "Quanto IRC é devido pelo exercício",
              `Até ${dia(PRAZOS_ANUAIS_EMPRESA.modelo22.value)} do ano seguinte`,
            ],
            [
              "IES",
              "Como está a empresa — contas, balanço, informação estatística e fiscal",
              `Até ${dia(PRAZOS_ANUAIS_EMPRESA.ies.value)} do ano seguinte`,
            ],
          ]}
        />
        <Paragrafo>
          Não são alternativas nem versões uma da outra: a Modelo 22 apura imposto, a IES presta
          contas. Uma empresa entrega as duas, todos os anos, mesmo sem atividade.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Antes das duas: aprovar as contas">
        <AvisoPrazo titulo="Até 31 de março">
          As contas do exercício são aprovadas em assembleia geral até{" "}
          {dia(PRAZOS_ANUAIS_EMPRESA.aprovacaoContas.value)} do ano seguinte. É esse passo que
          torna possível a IES — que cumpre também o depósito da prestação de contas.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="Quem assina">
        <Paragrafo>
          As declarações fiscais de uma sociedade são assinadas por{" "}
          <strong>Contabilista Certificado inscrito na Ordem</strong>. Não é o gerente que as
          submete sozinho, e não é uma formalidade dispensável.
        </Paragrafo>
        <VaiPara href="/ferramentas/mapa-contabilistas">Encontrar um contabilista</VaiPara>
      </Seccao>

      <Seccao titulo="O que custa falhar">
        <Paragrafo>
          A coima é o menor dos problemas. Falhar as entregas anuais fecha a porta à{" "}
          <strong>certidão de não dívida</strong> — que é exigida em candidaturas a apoios, em
          concursos públicos e por muitos clientes empresariais — e faz perder benefícios fiscais.
        </Paragrafo>
        <Nota titulo="Sem atividade também se entrega">
          Uma empresa dormente continua obrigada às entregas anuais. Deixar de faturar não é deixar
          de declarar — é a razão pela qual muitas empresas «esquecidas» acumulam coimas durante anos.
        </Nota>
        <VaiPara href="/guias/pagamentos-por-conta-irc">Pagamentos por conta ao longo do ano</VaiPara>
        <VaiPara href="/guias/prejuizos-fiscais">Reportar prejuízos</VaiPara>
        <VaiPara href="/guias/fechar-empresa">Se a empresa já não faz sentido</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
