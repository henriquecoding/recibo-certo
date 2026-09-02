import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import NegocioStudio from "@/components/negocio/NegocioStudio";
import { OPPORTUNITY_TEMPLATES } from "@/lib/negocio/market";

export const metadata = {
  title: "Projeto de negócio",
  description:
    "Constrói o teu negócio: ofertas, preços, volumes, custos de estrutura e viabilidade — e compara começar como independente ou como sociedade.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ o?: string | string[] }>;
}) {
  const params = await searchParams;
  const opportunityId = typeof params.o === "string" ? params.o : undefined;
  const opportunity = OPPORTUNITY_TEMPLATES.find((item) => item.id === opportunityId);

  return (
    <PaginaFerramenta
      eyebrow="O teu negócio"
      titulo="Projeto de negócio"
      descricao="O que vais vender, quanto precisa de custar, quantas consegues vender e o que essa operação aguenta pagar. A forma jurídica é a última decisão, não a primeira."
    >
      <NegocioStudio
        ofertaInicial={
          opportunity
            ? { cenario: opportunity.pricingScenario, nome: opportunity.title }
            : undefined
        }
      />
    </PaginaFerramenta>
  );
}
