import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, Nota, VaiPara } from "@/components/guias/BlocosDireitos";
// A taxa vem do motor: é a mesma dos juros legais civis (Portaria 291/2003).
import { JUROS_MORA } from "@/lib/fiscal-data";
import { pct } from "@/lib/format";

export const metadata: Metadata = metadataDoGuia("juros-indemnizatorios");

export default function JurosIndemnizatoriosPage() {
  return (
    <GuiaLayout slug="juros-indemnizatorios">
      <Seccao titulo="O espelho dos juros de mora">
        <Paragrafo>
          Quando és tu a pagar tarde, o Estado cobra juros. Quando é o Estado a cobrar-te a mais por
          erro dos serviços, a lei prevê o inverso: <strong>juros indemnizatórios</strong> a teu
          favor. É simétrico — e é sistematicamente esquecido por quem tem direito a eles.
        </Paragrafo>
        <Paragrafo>
          São devidos quando se determine, em reclamação graciosa ou impugnação judicial, que houve
          erro imputável aos serviços de que resultou pagamento de dívida tributária em montante
          superior ao legalmente devido.
        </Paragrafo>
      </Seccao>

      <Seccao titulo="Os quatro requisitos">
        <Paragrafo>
          Não basta ter pago a mais. Têm de estar reunidos: que exista <strong>erro</strong> num ato
          de liquidação; que esse erro seja <strong>imputável aos serviços</strong>; que a sua
          existência seja <strong>determinada</strong> em reclamação ou impugnação; e que dele tenha
          resultado pagamento superior ao devido.
        </Paragrafo>
        <Nota titulo="Quando o erro parece teu mas não é">
          A lei considera também haver erro imputável aos serviços quando, apesar de a liquidação
          assentar na tua declaração, seguiste orientações genéricas da administração tributária
          devidamente publicadas. Ou seja: se fizeste o que a AT dizia para fazer e ainda assim
          pagaste a mais, o erro não é teu.
        </Nota>
      </Seccao>

      {/* O caso mais provável na vida do leitor deste site — muito mais do
          que ganhar uma impugnação — e o único que não exige litígio nenhum. */}
      <Seccao titulo="O caso que te vai acontecer mesmo: o reembolso atrasado">
        <Paragrafo>
          Além do erro apurado em reclamação ou impugnação, a lei prevê outros casos. O mais
          relevante para quem entrega IRS todos os anos é este:{" "}
          <strong>o reembolso de IRS pago para lá do prazo legal gera juros indemnizatórios</strong>.
        </Paragrafo>
        <Paragrafo>
          Não é preciso reclamar, não é preciso impugnar, não é preciso provar erro de ninguém. Se o
          reembolso chegou atrasado, os juros são devidos — e contam-se à taxa dos juros legais,{" "}
          {pct(JUROS_MORA.civis.value)}.
        </Paragrafo>
        <Nota titulo="Porque é que isto quase nunca é reclamado">
          Porque ninguém sabe. O próprio texto deste guia diz que é um direito «sistematicamente
          esquecido por quem tem direito a ele» — e esta é a alínea mais esquecida de todas.
        </Nota>
      </Seccao>

      <Seccao titulo="Pede — não presumas que vêm sozinhos">
        <Paragrafo>
          A prática recomendada é pedir os juros indemnizatórios expressamente no próprio meio de
          defesa, e não contar com a sua atribuição automática. Como dependem do reconhecimento do
          erro, nascem no processo onde esse reconhecimento acontece.
        </Paragrafo>
        <VaiPara href="/guias/contestar-liquidacao">
          Como contestar a liquidação (é aí que se pedem)
        </VaiPara>
        <VaiPara href="/guias/reembolso-irs">
          Perceber o apuramento e o reembolso
        </VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
