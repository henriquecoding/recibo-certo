import type { Metadata } from "next";
import ToolShell from "@/components/ferramentas/ToolShell";
import { porId } from "@/lib/ferramentas";
import { generateSoftwareApplicationSchema } from "@/lib/seo";
import Wizard from "./Wizard";

const TOOL = porId("payout-mor")!;

export const metadata: Metadata = {
  title: "Recibo verde ao Merchant of Record (Paddle, Lemon Squeezy) | Recibo Certo",
  description:
    "Guia passo-a-passo para emitir o recibo mensal ao Paddle ou Lemon Squeezy com IVA em autoliquidação e 100 % do payout líquido. Dados do adquirente e fundamento legal incluídos.",
  keywords: [
    "recibo merchant of record", "paddle recibo verde", "lemon squeezy recibo",
    "IVA autoliquidação payout", "recibo para plataforma estrangeira",
  ],
  alternates: { canonical: `https://www.recibocerto.pt${TOOL.canonicalHref}` },
  openGraph: {
    title: "Recibo verde ao Merchant of Record | Recibo Certo",
    description:
      "Cinco passos para emitir o recibo do teu payout com o adquirente, o IVA e a retenção corretos.",
    url: `https://www.recibocerto.pt${TOOL.canonicalHref}`,
    siteName: "Recibo Certo",
    locale: "pt_PT",
    type: "article",
  },
};

export default function PayoutMorPage() {
  const appSchema = generateSoftwareApplicationSchema();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }} />
      <ToolShell
        tool={TOOL}
        subtitulo="Emite o recibo verde mensal ao Paddle ou Lemon Squeezy com IVA em autoliquidação — 100 % do payout líquido, com o fundamento legal de cada campo."
      >
        <Wizard />
      </ToolShell>
    </>
  );
}
