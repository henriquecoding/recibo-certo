import HomepageEmpresa from "@/components/foco/empresa/HomepageEmpresa";
import type { DadosEmpresa } from "@/components/foco/empresa/PalcoEmpresa";
import HomepageFocoShell from "@/components/foco/HomepageFocoShell";
import snapshot from "@/generated/homepage/empresa.json";
import { metadataDoFoco } from "@/lib/foco/metadata";

export const dynamic = "error";
export const metadata = metadataDoFoco("empresa");

export default function EmpresaPage() {
  return (
    <HomepageFocoShell foco="empresa">
      <HomepageEmpresa dados={snapshot.dados as DadosEmpresa} />
    </HomepageFocoShell>
  );
}
