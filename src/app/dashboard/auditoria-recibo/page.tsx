import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import { AuditoriaRecibo } from "@/components/dependente/AuditoriaRecibo";

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Ferramentas"
      titulo="Auditoria do recibo de vencimento"
      descricao="Introduz os valores do teu recibo e descobre se a entidade aplicou bem o IRS e a Segurança Social de 2026. Deteta erros a teu favor."
    >
      <AuditoriaRecibo />
    </PaginaFerramenta>
  );
}
