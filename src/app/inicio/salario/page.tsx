import HomepageFocoShell from "@/components/foco/HomepageFocoShell";
import HomepageSalario from "@/components/foco/salario/HomepageSalario";
import type { DadosSalario } from "@/components/foco/salario/PalcoSalario";
import type { DadosContratacao } from "@/components/foco/salario/PalcoContratacao";
import snapshot from "@/generated/homepage/salario.json";
import { metadataDoFoco } from "@/lib/foco/metadata";

export const dynamic = "error";
export const metadata = metadataDoFoco("salario");

export default function SalarioPage() {
  return (
    <HomepageFocoShell foco="salario">
      <HomepageSalario
        dados={snapshot.dados as DadosSalario & { contratacao: DadosContratacao }}
      />
    </HomepageFocoShell>
  );
}
