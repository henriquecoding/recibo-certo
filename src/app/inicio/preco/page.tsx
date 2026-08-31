import HomepageFocoShell from "@/components/foco/HomepageFocoShell";
import HomepagePreco from "@/components/preco/HomepagePreco";
import snapshot from "@/generated/homepage/preco.json";
import { metadataDoFoco } from "@/lib/foco/metadata";
import type { ParametrosDemoPreco } from "@/lib/pricing/demo-homepage";
import type { CenarioDemoPreco } from "@/lib/pricing/demo-homepage.servidor";

export const dynamic = "error";
export const metadata = metadataDoFoco("preco");

const dados = snapshot.dados as unknown as {
  parametros: ParametrosDemoPreco;
  cenarios: CenarioDemoPreco[];
};

export default function PrecoPage() {
  return (
    <HomepageFocoShell foco="preco">
      <HomepagePreco parametros={dados.parametros} cenarios={dados.cenarios} />
    </HomepageFocoShell>
  );
}
