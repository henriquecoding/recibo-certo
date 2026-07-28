import type { Metadata } from "next";
import GuiaLayout from "@/components/guias/GuiaLayout";
import { metadataDoGuia } from "@/lib/guias/metadata";
import { Seccao, Paragrafo, Nota, TabelaPrazos, VaiPara } from "@/components/guias/BlocosDireitos";

export const metadata: Metadata = metadataDoGuia("iva-de-caixa");

export default function IvaDeCaixaPage() {
  return (
    <GuiaLayout slug="iva-de-caixa">
      <Seccao titulo="O que muda">
        <Paragrafo>
          No regime normal, o IVA é exigível com a emissão da fatura: entregas o imposto ao Estado
          independentemente de teres recebido. No regime de IVA de caixa, o imposto das operações
          ativas só se torna exigível <strong>no momento do recebimento</strong>.
        </Paragrafo>
        <Paragrafo>
          É uma alteração de tesouraria significativa para quem fatura com prazos longos. Mas há
          uma contrapartida que costuma ser omitida quando o regime é apresentado.
        </Paragrafo>
        <Nota titulo="A contrapartida">
          O IVA suportado nas tuas compras também deixa de ser dedutível na fatura e passa a
          sê-lo só depois de as teres pago. O regime aplica-se aos dois lados da conta — não é um
          benefício unilateral.
        </Nota>
      </Seccao>

      <Seccao titulo="Regime normal vs. IVA de caixa">
        <TabelaPrazos
          colunas={["", "Regime normal", "IVA de caixa"]}
          linhas={[
            ["IVA que liquidas", "Exigível com a fatura", "Exigível com o recebimento"],
            ["IVA que deduzes", "Dedutível com a fatura", "Dedutível com o pagamento"],
            ["Fatura não paga", "IVA entregue na mesma", "IVA não entregue enquanto não receberes"],
            ["Exigência administrativa", "Menor", "Rastrear recebimento a recebimento"],
          ]}
        />
      </Seccao>

      <Seccao titulo="Quem pode optar">
        <Paragrafo>
          O acesso depende do volume de negócios do ano civil anterior. O limiar foi elevado para
          2 000 000 €, com efeitos a partir de 1 de julho de 2025. Ficam de fora, entre outros, os
          sujeitos passivos que realizam exclusivamente operações isentas e quem está no regime de
          isenção.
        </Paragrafo>
        <Nota titulo="A adesão é opcional e tem momento próprio">
          Não é um regime automático nem se entra e sai a meio do ano a qualquer momento. A opção
          exerce-se por comunicação à Autoridade Tributária, em data própria. Confirma o calendário
          no Portal das Finanças ou com o teu contabilista antes de contar com ele.
        </Nota>
      </Seccao>

      <Seccao titulo="Quando não compensa">
        <Paragrafo>
          Se recebes quase tudo a pronto pagamento, o ganho de tesouraria é residual e o custo
          administrativo não: o regime obriga a associar cada recebimento à respetiva fatura. E se
          estás isento pelo Art. 53.º, o regime não te traz nada — não entregas IVA.
        </Paragrafo>
        <VaiPara href="/guias/fatura-nao-paga">
          O que fazer com as faturas que já estão por pagar
        </VaiPara>
        <VaiPara href="/guias/recuperar-iva-incobravel">
          Recuperar IVA já entregue no regime normal
        </VaiPara>
      </Seccao>
    </GuiaLayout>
  );
}
