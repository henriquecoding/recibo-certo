import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";
import { HORARIO_SEMANAL_COMPLETO } from "@/lib/fiscal-data";

export const metadata: Metadata = metadataDoGuia("faltas-ao-trabalho");

export default function FaltasAoTrabalhoPage() {
  return (
    <GuiaLayout slug="faltas-ao-trabalho">
      <Seccao titulo="Justificada e paga são dois eixos diferentes">
        <AvisoPrazo titulo="Justificar não é o mesmo que não perder">
          Há faltas justificadas que <strong>não</strong> dão direito a retribuição. A maioria das
          pessoas assume que justificar resolve tudo, e só descobre o contrário no recibo do mês
          seguinte.
        </AvisoPrazo>
        <TabelaPrazos
          colunas={["", "Paga", "Não paga"]}
          linhas={[
            ["Justificada", "Casamento, falecimento de familiar próximo, assistência a filho, entre outras", "Algumas licenças, faltas por doença sem subsídio, e outras previstas na lei ou no IRCT"],
            ["Injustificada", "—", "Sempre. E com efeitos além do desconto do dia."],
          ]}
        />
        <Nota titulo="A matriz é a ideia central deste guia">
          Duas perguntas, não uma: «é justificada?» e «é paga?». As respostas são independentes.
        </Nota>
      </Seccao>

      <Seccao titulo="Como se calcula o desconto">
        <Paragrafo>
          O desconto por falta parte da retribuição horária, apurada pela fórmula legal: retribuição
          mensal × 12, a dividir por 52 × {HORARIO_SEMANAL_COMPLETO.value} horas. Multiplica-se pelo
          número de horas de ausência.
        </Paragrafo>
        <VaiPara href="/ferramentas/recibo-vencimento">Calcular o desconto com o meu salário</VaiPara>
      </Seccao>

      <Seccao titulo="O que a falta arrasta consigo">
        <TabelaPrazos
          colunas={["Efeito", "Quando"]}
          linhas={[
            [
              "Perde-se o subsídio de refeição do dia",
              "Sempre que não há trabalho prestado — o subsídio compensa uma refeição em dia de trabalho",
            ],
            [
              "Pode perder-se um dia de férias e o subsídio correspondente",
              "Nas faltas injustificadas, nos termos previstos na lei",
            ],
            [
              "Efeito disciplinar",
              "A falta injustificada constitui infração disciplinar, independentemente do desconto",
            ],
          ]}
        />
        <Nota titulo="É a parte que ninguém antecipa">
          O desconto do dia é esperado. O subsídio de refeição perdido e o proporcional de férias e
          de Natal, não — e é aí que o recibo fica mais baixo do que a conta feita em casa.
        </Nota>
      </Seccao>

      <Seccao titulo="Ausências que não são faltas">
        <Paragrafo>
          A baixa médica e as licenças parentais não são faltas: têm regimes próprios, com subsídio
          da Segurança Social e regras diferentes de desconto.
        </Paragrafo>
        <VaiPara href="/guias/baixa-medica">Baixa médica</VaiPara>
        <VaiPara href="/guias/licenca-parental">Licença parental</VaiPara>
        <VaiPara href="/guias/ferias-direitos">Direitos de férias</VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
