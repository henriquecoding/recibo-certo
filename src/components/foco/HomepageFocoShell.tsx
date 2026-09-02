import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import PassoSeguinteHomepage from "@/components/parcerias/PassoSeguinteHomepage";
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
          <PerfilProvider>{children}</PerfilProvider>
          {/* Fecha as cinco leituras da homepage: onde acabamos nós, quem faz
              o resto, e o cartaz do parceiro na faixa que é dele. */}
          <PassoSeguinteHomepage
            superficie="demo.hero.faixa"
            className="rc-home-deferred rc-home-deferred--medium px-4 pb-14 sm:px-6 sm:pb-20"
          />
        </main>
        <Footer />
      </div>
    </>
  );
}
