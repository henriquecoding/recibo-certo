import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { SUBSIDIO_DOENCA } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("baixa-medica");

export default function BaixaMedicaPage() {
  const escaloes = SUBSIDIO_DOENCA.escaloes.value;
  const rotuloDias = (i: number) => {
    const ate = escaloes[i].ateDias;
    const desde = i === 0 ? 1 : escaloes[i - 1].ateDias + 1;
    return Number.isFinite(ate) ? `${desde} a ${ate} dias` : `Mais de ${escaloes[i - 1].ateDias} dias`;
  };

  return (
    <GuiaLayout slug="baixa-medica">
      <Seccao titulo="Os três dias que ninguém paga">
        <AvisoPrazo titulo="Período de espera">
          Os primeiros {SUBSIDIO_DOENCA.periodoEsperaDias.value} dias de incapacidade não são
          subsidiados aos trabalhadores por conta de outrem. A Segurança Social não os paga e a
          entidade empregadora, em regra, também não é obrigada a pagá-los.
        </AvisoPrazo>
        <Paragrafo>
          Há exceções em que o subsídio começa no primeiro dia:{" "}
          <strong>internamento hospitalar</strong>, <strong>tuberculose</strong> e{" "}
          <strong>doença profissional</strong>.
        </Paragrafo>
        <Nota titulo="Vale a pena confirmar o teu IRCT">
          Alguns instrumentos de regulamentação coletiva e algumas empresas pagam os três dias de
          espera. Não é a regra, mas acontece — e ninguém o diz se não for perguntado.
        </Nota>
      </Seccao>

      <Seccao titulo="Tenho direito? Os dois filtros">
        <TabelaPrazos
          colunas={["Filtro", "O que exige"]}
          linhas={[
            [
              "Prazo de garantia",
              `${SUBSIDIO_DOENCA.prazoGarantiaMeses.value} meses com registo de remunerações, seguidos ou interpolados`,
            ],
            [
              "Índice de profissionalidade",
              "Dias com registo de remunerações nos quatro meses imediatamente anteriores aos dois que precedem o mês da baixa",
            ],
          ]}
        />
      </Seccao>

      <Seccao titulo="Quanto recebes">
        <Paragrafo>
          O subsídio é uma percentagem da <strong>remuneração de referência</strong> — o total das
          remunerações dos primeiros seis dos últimos oito meses, a dividir por 180. A percentagem
          sobe com a duração da baixa.
        </Paragrafo>
        <TabelaPrazos
          colunas={["Duração da baixa", "Percentagem da remuneração de referência"]}
          linhas={escaloes.map((e, i) => [rotuloDias(i), pct(e.taxa)])}
        />
        <Nota titulo="Há uma majoração de 5 pontos">
          Os escalões de {pct(escaloes[0].taxa)} e {pct(escaloes[1].taxa)} sobem{" "}
          {pct(SUBSIDIO_DOENCA.majoracao.value)} quando a remuneração de referência não excede{" "}
          {fmt(SUBSIDIO_DOENCA.majoracaoRemuneracaoLimite.value)}, ou quando o agregado tem três ou
          mais descendentes nas condições legais.
        </Nota>
      </Seccao>

      <Seccao titulo="O que acontece ao resto do recibo">
        <Paragrafo>
          Durante a baixa não há trabalho prestado: o subsídio de refeição não é devido. As férias e
          os subsídios de férias e de Natal têm regras próprias que dependem da duração da ausência
          e do que o teu IRCT preveja.
        </Paragrafo>
        <Nota titulo="E se és trabalhador independente?">
          O regime é diferente — o período de espera e as condições de acesso não são os mesmos. O
          guia da Segurança Social dos independentes explica o enquadramento.
        </Nota>
        <VaiPara href="/guias/seguranca-social">Segurança Social dos independentes</VaiPara>
        <VaiPara href="/guias/licenca-parental">Licença parental</VaiPara>
        <VaiPara href="/ferramentas/recibo-vencimento">Calcular a minha remuneração de referência</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
