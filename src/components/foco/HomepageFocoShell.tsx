import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import type { FocoHomepage } from "@/lib/foco-homepage";
import { PerfilProvider } from "@/lib/perfil";
import {
  generateBreadcrumbSchema,
  generateOrganizationSchema,
  generateSoftwareApplicationSchema,
  generateWebSiteSchema,
} from "@/lib/seo";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    generateWebSiteSchema(),
    generateOrganizationSchema(),
    generateSoftwareApplicationSchema(),
    generateBreadcrumbSchema([{ name: "Início", url: "/" }]),
  ],
};

/** Casca de servidor comum; nunca importa nenhum dos cinco palcos. */
export default function HomepageFocoShell({
  foco,
  children,
}: {
  foco: FocoHomepage;
  children: ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div id="top">
        <Nav foco={foco} />
        <main data-homepage-foco={foco}>
          {/* O bloco «O passo seguinte» esteve aqui, depois da bússola, e era
              o pior sítio possível: a seguir ao último ato da leitura, ninguém
              lá chegava. Passou a ser montado por cada leitura, no fim do arco
              de próximos passos — ver `PassoSeguinteHomepage`. */}
          <PerfilProvider>{children}</PerfilProvider>
        </main>
        <Footer />
      </div>
    </>
  );
}
