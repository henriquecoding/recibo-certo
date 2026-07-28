import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, AvisoPrazo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("prazos-fiscais-divida");

export default function PrazosFiscaisDividaPage() {
  return (
    <GuiaLayout slug="prazos-fiscais-divida">
      <Seccao titulo="Dois prazos que não são o mesmo">
        <Paragrafo>
          Quase toda a confusão nesta matéria vem de tratar como uma coisa só o que são duas. A{" "}
          <strong>caducidade</strong> limita o tempo que a Autoridade Tributária tem para{" "}
          <em>liquidar</em> o imposto. A <strong>prescrição</strong> limita o tempo que tem para{" "}
          <em>cobrar</em> uma dívida já liquidada. São prazos diferentes, com durações diferentes e
          regras próprias.
        </Paragrafo>
        <TabelaPrazos
          colunas={["", "Caducidade", "Prescrição"]}
          linhas={[
            ["O que limita", "O direito de liquidar o imposto", "O direito de cobrar a dívida"],
            ["Prazo", "4 anos", "8 anos"],
            [
              "Conta-se de",
              "Regra geral, sem prejuízo de a lei fixar outro prazo",
              "Nos impostos periódicos, do termo do ano do facto tributário; no IVA e nas retenções a título definitivo, do início do ano civil seguinte",
            ],
          ]}
        />
      </Seccao>

      <Seccao titulo="Caducidade da liquidação">
        <Paragrafo>
          O direito de liquidar os tributos caduca se a liquidação não for validamente notificada ao
          contribuinte no prazo de quatro anos, quando a lei não fixar outro. Repara na palavra{" "}
          <strong>notificada</strong>: não basta que os serviços tenham liquidado dentro do prazo —
          a notificação válida tem de chegar.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Prescrição da dívida">
        <Paragrafo>
          As dívidas tributárias prescrevem no prazo de oito anos. A contagem varia com o tipo de
          imposto, e é aqui que uma conta feita de cabeça costuma falhar.
        </Paragrafo>
        <AvisoPrazo titulo="O relógio pára e recomeça">
          Os prazos suspendem-se e interrompem-se em casos previstos na lei — citações em execução
          fiscal, reclamações, impugnações, planos prestacionais. Cada um destes factos pode empurrar
          a data final para muito depois do que uma soma simples de anos sugere. É por isso que
          quase nunca se pode concluir que uma dívida prescreveu apenas contando anos no calendário.
        </AvisoPrazo>
      </Seccao>

      <Seccao titulo="O que fazer com uma cobrança antiga">
        <Nota titulo="Reúne o histórico antes de concluir">
          Data da notificação da liquidação, citações recebidas, pagamentos por conta, adesões a
          planos prestacionais, reclamações e impugnações. É esse historial — e não o ano do imposto —
          que determina se o prazo ainda corre.
        </Nota>
        <Paragrafo>
          Se a dívida já foi liquidada e continuas a discordar do seu fundamento, o tempo decorrido é
          uma questão; a legalidade do ato é outra, com meios e prazos próprios.
        </Paragrafo>
        <VaiPara href="/guias/contestar-liquidacao">
          Contestar a liquidação em si
        </VaiPara>
        <VaiPara href="/guias/calendario-fiscal">
          Não deixar chegar aqui: o calendário das obrigações
        </VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
