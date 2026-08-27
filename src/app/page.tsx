import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import FizFaixaDemo from "@/components/fiz/FizFaixaDemo";
// ── AS CINCO LEITURAS CARREGAM UMA DE CADA VEZ ────────────────────────
//  Estavam importadas estaticamente. Só UMA é renderizada em cada
//  pedido — mas um import estático não sabe disso, e as cinco iam para o
//  mesmo pacote: quem abria `/` descarregava os cinco palcos, as cinco
//  coreografias e os cinco motores de desenho para ver zero deles.
//
//  `next/dynamic` sem `ssr: false` mantém tudo: o HTML continua a ser
//  renderizado no servidor (o palco resolvido, as ligações reais, o
//  conteúdo para quem não tem JavaScript) e só o CÓDIGO passa a ser um
//  pedaço próprio, pedido quando aquela leitura é mesmo aberta.
import dynamic from "next/dynamic";

const HomepageDescobrir = dynamic(() => import("@/components/descobrir/HomepageDescobrir"));
const HomepagePreco = dynamic(() => import("@/components/preco/HomepagePreco"));
const HomepageRecibos = dynamic(() => import("@/components/foco/recibos/HomepageRecibos"));
const HomepageSalario = dynamic(() => import("@/components/foco/salario/HomepageSalario"));
const HomepageEmpresa = dynamic(() => import("@/components/foco/empresa/HomepageEmpresa"));
import { FOCOS } from "@/components/foco/focos";
import { dadosRecibo, dadosSalario, dadosEmpresa } from "@/lib/foco/dados-servidor";
import type { FocoHomepage } from "@/lib/foco-homepage";
import { normalizarFocoHomepage } from "@/lib/foco-homepage";
import { cenariosDemoPreco, parametrosDemoPreco } from "@/lib/pricing/demo-homepage.servidor";
import { COMPETENCIA_POR_ID } from "@/lib/negocio/descoberta/conhecimento/dados/competencias";
import { MODELO_POR_ID } from "@/lib/negocio/descoberta/conhecimento/dados/modelos";
import { PROBLEMA_POR_ID } from "@/lib/negocio/descoberta/conhecimento/dados/problemas";
import { referenciaCurada } from "@/lib/negocio/descoberta/conhecimento/seeds";
import {
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateSoftwareApplicationSchema,
  generateBreadcrumbSchema,
} from "@/lib/seo";

const jsonLdBase = [
  generateWebSiteSchema(),
  generateOrganizationSchema(),
  generateSoftwareApplicationSchema(),
  generateBreadcrumbSchema([{ name: "Início", url: "/" }]),
];

// O par que a demonstração encena. Deixou de ser duas escolhas
// independentes: é UM dossier curado, e por isso `referenciaCurada` devolve
// o título que a hipótese vai ter. Antes o par era (problema × avença), que
// no catálogo é o dossier das ilhas — e o palco, não podendo usar esse
// título, escrevia um à mão que não existia em lado nenhum.
const PAR_EXEMPLO = { problema: "processos-dispersos-micro", modelo: "projeto" } as const;

const problemaExemplo = PROBLEMA_POR_ID.get(PAR_EXEMPLO.problema);
const modeloExemplo = MODELO_POR_ID.get(PAR_EXEMPLO.modelo);
const competenciaExemplo = COMPETENCIA_POR_ID.get("organizacao");
const dossierExemplo = referenciaCurada(PAR_EXEMPLO.problema, PAR_EXEMPLO.modelo);
const primeiroTesteExemplo = problemaExemplo?.comoValidar[1] ?? problemaExemplo?.comoValidar[0];

if (
  !problemaExemplo ||
  !modeloExemplo ||
  !competenciaExemplo ||
  !dossierExemplo ||
  !primeiroTesteExemplo
) {
  throw new Error("O exemplo editorial da homepage deixou de existir no grafo de descoberta.");
}

/**
 * O palco não inventa um negócio, um título nem um teste: as cinco linhas
 * vêm do mesmo grafo que alimenta a ferramenta completa. Só atravessam a
 * fronteira servidor/cliente as strings que a demonstração desenha.
 */
const exemploDescoberta = Object.freeze({
  competencia: competenciaExemplo.rotulo,
  problema: problemaExemplo.enunciado,
  modelo: modeloExemplo.rotulo,
  titulo: dossierExemplo.template.title,
  primeiroTeste: primeiroTesteExemplo,
  testeDeFalsificacao: problemaExemplo.testeDeFalsificacao,
});

/**
 * A demonstração de «Preço» é resolvida pela engine a sério, aqui, uma vez
 * por processo — como os exemplos do Hero mais abaixo. Para o cliente
 * atravessam só a taxa de IVA, as duas frações de imposto pessoal e os
 * quatro cenários já calculados; `precificar()` e os dezoito motores ficam
 * deste lado da fronteira.
 */
const parametrosPreco = parametrosDemoPreco();
const cenariosPreco = cenariosDemoPreco();

type HomeProps = {
  searchParams: Promise<{ foco?: string | string[] }>;
};

/**
 * Os metadados de cada foco saem da MESMA tabela que define os focos
 * (`components/foco/focos.ts`), com os metadados sociais completos
 * (`openGraph`, `twitter`, título absoluto) por cima.
 *
 * Estavam escritos aqui à mão para dois focos; ao quinto isso seriam cinco
 * sítios para um título divergir do outro sem ninguém dar por isso.
 */
const METADADOS_POR_FOCO = Object.fromEntries(
  FOCOS.map((f) => [f.id, { title: f.titulo, description: f.descricao }]),
) as Record<FocoHomepage, { title: string; description: string }>;

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const focoPedido = normalizarFocoHomepage((await searchParams).foco);
  const foco = focoPedido ?? "descobrir";

  const { title, description } = METADADOS_POR_FOCO[foco];
  const tituloSocial = `${title} | ReciboCerto`;

  return {
    // A homepage e o layout raiz pertencem ao mesmo segmento; o template do
    // layout só se aplica a segmentos filhos. `absolute` conserva a marca no
    // separador sem a duplicar noutras rotas.
    title: { absolute: tituloSocial },
    description,
    // A canonical continua a ser `/`: a experiência editorial é uma leitura
    // da homepage, não uma página nova. A rota indexável de cada ferramenta
    // é a que vive em `/ferramentas/<slug>` e não passa por aqui.
    alternates: { canonical: "/" },
    openGraph: {
      title: tituloSocial,
      description,
      url: focoPedido ? `/?foco=${foco}` : "/",
      siteName: "ReciboCerto",
      locale: "pt_PT",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: tituloSocial, description },
  };
}

export default async function Home({ searchParams }: HomeProps) {
  // `/` é a primeira leitura do instrumento — não uma homepage antiga à
  // parte. A query só muda a pergunta ativa; nunca muda de produto.
  const foco = normalizarFocoHomepage((await searchParams).foco) ?? "descobrir";
  const jsonLd = { "@context": "https://schema.org", "@graph": jsonLdBase };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div id="top">
        <Nav foco={foco} />
        <main>
          {foco === "descobrir" ? (
            <HomepageDescobrir exemplo={exemploDescoberta} />
          ) : foco === "preco" ? (
            <HomepagePreco parametros={parametrosPreco} cenarios={cenariosPreco} />
          ) : foco === "recibos" ? (
            <HomepageRecibos dados={dadosRecibo()} />
          ) : foco === "salario" ? (
            <HomepageSalario dados={dadosSalario()} />
          ) : foco === "empresa" ? (
            <HomepageEmpresa dados={dadosEmpresa()} />
          ) : null}

          <div className="px-4 pb-14 sm:px-6 sm:pb-20">
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
