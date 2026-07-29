import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { LICENCA_PARENTAL } from "@/lib/fiscal-data";
import { pct } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("licenca-parental");

export default function LicencaParentalPage() {
  return (
    <GuiaLayout slug="licenca-parental">
      <Seccao titulo="A escolha faz-se antes, não depois">
        <AvisoPrazo titulo="A modalidade escolhe-se no requerimento">
          A modalidade da licença parental inicial define-se quando se requer, condiciona os dois
          progenitores e não se altera a meio. É a decisão financeira mais consequente do primeiro
          ano de vida de uma criança — e é tomada, quase sempre, sem ninguém ter feito as contas.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="As quatro combinações">
        <TabelaPrazos
          colunas={["Opção", "Percentagem", "Condição"]}
          linhas={LICENCA_PARENTAL.modalidades.value.map((m) => [
            `${m.dias} dias`,
            pct(m.taxa),
            m.partilhada
              ? `Com partilha: cada progenitor goza, em exclusivo, pelo menos ${LICENCA_PARENTAL.partilhaDiasExclusivos.value} dias seguidos ou dois períodos de 15`
              : "Sem partilha",
          ])}
        />
        <Paragrafo>
          Repara na aritmética: 150 dias a {pct(0.8)} rendem menos do que 120 dias a {pct(1)} mais
          30 dias partilhados a {pct(1)}. A partilha não é só uma questão de organização familiar —
          muda o total recebido.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="A licença exclusiva do pai é sempre a 100%">
        <Paragrafo>
          São <strong>{LICENCA_PARENTAL.paiObrigatoriaDias.value} dias obrigatórios</strong>, mais{" "}
          {LICENCA_PARENTAL.paiOpcionaisDias.value} dias opcionais gozáveis durante a licença
          inicial da mãe. São pagos a {pct(LICENCA_PARENTAL.paiTaxa.value)} da remuneração de
          referência, <strong>qualquer que seja a modalidade escolhida</strong> para a licença
          inicial.
        </Paragrafo>
        <Nota titulo="Obrigatórios quer dizer obrigatórios">
          Não é uma faculdade do pai nem uma concessão da entidade empregadora: os dias obrigatórios
          têm de ser gozados, e os primeiros seguem-se imediatamente ao nascimento.
        </Nota>
      </Seccao>

      <Seccao titulo="O que preparar">
        <Paragrafo>
          O requerimento faz-se na Segurança Social Direta, com a modalidade escolhida e a
          declaração de ambos os progenitores quando há partilha. A remuneração de referência de
          cada um determina o valor — e pode ser bastante diferente entre os dois.
        </Paragrafo>
        <VaiPara href="/guias/baixa-medica">Baixa médica: o outro subsídio</VaiPara>
        <VaiPara href="/guias/ferias-direitos">Férias e o que a licença afeta</VaiPara>
        <VaiPara href="/ferramentas/recibo-vencimento">Calcular a remuneração de referência</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
