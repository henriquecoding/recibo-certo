import HomepageFocoShell from "@/components/foco/HomepageFocoShell";
import HomepageRecibos from "@/components/foco/recibos/HomepageRecibos";
import type { DadosReciboSnapshot } from "@/components/foco/recibos/PalcoRecibos";
import snapshot from "@/generated/homepage/recibos.json";
import { metadataDoFoco } from "@/lib/foco/metadata";

export const dynamic = "error";
export const metadata = metadataDoFoco("recibos");

export default function RecibosPage() {
  return (
    <HomepageFocoShell foco="recibos">
      <HomepageRecibos dados={snapshot.dados as DadosReciboSnapshot} />
    </HomepageFocoShell>
  );
}
