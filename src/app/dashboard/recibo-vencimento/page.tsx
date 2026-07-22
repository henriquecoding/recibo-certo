import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import { MotorReciboVencimento } from "@/components/dependente/MotorReciboVencimento";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Simuladores"
      titulo="Recibo de vencimento"
      descricao="Constrói o recibo rubrica a rubrica e confirma IRS, Segurança Social, líquido e custo da empresa com as regras de 2026."
    >
      <MotorReciboVencimento />
    </PaginaFerramenta>
  );
}
