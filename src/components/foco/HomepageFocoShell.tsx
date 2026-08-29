import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FizFaixaDemo from "@/components/fiz/FizFaixaDemo";
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
          <div className="rc-home-deferred rc-home-deferred--compact px-4 pb-14 sm:px-6 sm:pb-20">
            <div className="mx-auto max-w-6xl">
              <FizFaixaDemo superficie="demo.hero.faixa" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
