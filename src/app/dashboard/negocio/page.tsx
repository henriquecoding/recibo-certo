import PaginaFerramenta from "@/components/dashboard/PaginaFerramenta";
import NegocioStudio from "@/components/negocio/NegocioStudio";

export const metadata = {
  title: "Projeto de negócio",
  description:
    "Constrói o teu negócio: ofertas, preços, volumes, custos de estrutura e viabilidade — e compara começar como independente ou como sociedade.",
};

export default function Page() {
  return (
    <PaginaFerramenta
      eyebrow="Simuladores"
      titulo="Projeto de negócio"
      descricao="O que vais vender, quanto precisa de custar, quantas consegues vender e o que essa operação aguenta pagar. A forma jurídica é a última decisão, não a primeira."
    >
      <NegocioStudio />
    </PaginaFerramenta>
  );
}
