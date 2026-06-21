import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import { SimuladorVencimento } from "@/components/dependente/SimuladorVencimento";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Simuladores"
      titulo="Recibo de vencimento"
      descricao="Por conta de outrem? Do salário bruto ao líquido — IRS retido, Segurança Social e subsídio de refeição, com as tabelas oficiais de 2026."
    >
      <SimuladorVencimento />
    </PaginaFerramenta>
  );
}
