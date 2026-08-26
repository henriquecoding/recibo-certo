import type { Metadata } from "next";
import Nav from "@/components/Nav";

import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import CalculadoraSecao from "@/components/CalculadoraSecao";
import ExplorarSecao from "@/components/ExplorarSecao";
import FilaPilares from "@/components/navegacao/FilaPilares";
import FAQ from "@/components/FAQ";
import Fontes from "@/components/Fontes";
import { compararCategorias, calcularVencimento } from "@/lib/fiscal-dependente";
import { calcular } from "@/lib/fiscal";
import { ATIVIDADES } from "@/lib/fiscal-data";

import Precos from "@/components/Precos";
import Footer from "@/components/Footer";
import FizFaixaDemo from "@/components/fiz/FizFaixaDemo";
import HomepageDescobrir from "@/components/descobrir/HomepageDescobrir";
import HomepagePreco from "@/components/preco/HomepagePreco";
import HomepageRecibos from "@/components/foco/recibos/HomepageRecibos";
import HomepageSalario from "@/components/foco/salario/HomepageSalario";
import HomepageEmpresa from "@/components/foco/empresa/HomepageEmpresa";
import { FOCOS } from "@/components/foco/focos";
import Bussola from "@/components/foco/Bussola";
import { dadosRecibo, dadosSalario, dadosEmpresa } from "@/lib/foco/dados-servidor";
import type { FocoHomepage } from "@/lib/foco-homepage";
import { faqs } from "@/lib/faq";
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
  generateFAQSchema,
} from "@/lib/seo";

const jsonLdBase = [
  generateWebSiteSchema(),
  generateOrganizationSchema(),
  generateSoftwareApplicationSchema(),
  generateBreadcrumbSchema([{ name: "Início", url: "/" }]),
];

const jsonLdComFaq = {
  "@context": "https://schema.org",
  "@graph": [...jsonLdBase, generateFAQSchema(faqs)],
};

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
  const foco = normalizarFocoHomepage((await searchParams).foco);
  if (!foco) return {};

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
      url: `/?foco=${foco}`,
      siteName: "ReciboCerto",
      locale: "pt_PT",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: tituloSocial, description },
  };
}

// ── Números do Hero — todos calculados no servidor (build) ────────────────
// Com o motor fiscal verificado, passados como props. Mantém
// `fiscal-dependente`/`fiscal`/`fiscal-data` FORA do bundle inicial do cliente.
//
// Os quatro perfis do Hero vêm agora daqui. Os de empresa/comparação já vinham;
// os de recibo verde e de vencimento estavam escritos à mão dentro do Hero e
// tinham começado a divergir — a Segurança Social do recibo de 2 000 € estava
// em 299 € por se ter truncado 299,60 em vez de arredondar. Um valor a menos
// não é grave; o mecanismo que o deixou envelhecer sozinho é que era.
const HERO_FAT = 30_000;
const HERO_RECIBO = 2_000;
const HERO_SALARIO = 1_500;

const landingCmp = compararCategorias({ brutoAnual: HERO_FAT, dependentes: 0 });

/** Recibo verde de 2 000 €, Art. 151.º, atividade estabelecida (2.º ano ou
 *  seguinte) — o exemplo do perfil "independente". */
const landingRecibo = calcular({
  bruto: HERO_RECIBO,
  tipo: "art151",
  regiao: "continente",
  regimeIVA: "isento",
  baseSS: "servicos",
  dispensaRetencao: false,
  isencaoSSPrimeiroAno: false,
  acumulaEmprego: false,
});

/** Vencimento de 1 500 €, não casado, sem dependentes, Continente, sem
 *  subsídio de refeição — o exemplo do perfil "dependente". */
const landingVencimento = calcularVencimento({
  salarioBruto: HERO_SALARIO,
  dependentes: 0,
});

export default async function Home({ searchParams }: HomeProps) {
  const foco = normalizarFocoHomepage((await searchParams).foco);
  // O `FAQPage` descreve as perguntas de `faqs`, que só existem na homepage
  // normal. Cada foco traz o seu próprio FAQ, com outras perguntas — emitir
  // aquele esquema aqui seria declarar à pesquisa perguntas que a página não
  // tem.
  const jsonLd = foco
    ? { "@context": "https://schema.org", "@graph": jsonLdBase }
    : jsonLdComFaq;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div id="top">
        <Nav foco={foco} />
        <main>
          {/* ── A RÉGUA DOS CINCO FOCOS NÃO VIVE AQUI ───────────────
              Cheguei a montar uma, e era um sexto sítio onde escolher:
              a cápsula do cabeçalho, a barra do telemóvel e o
              `FilaPilares` já mostram os mesmos cinco pilares, todos
              a ler `hrefDaSuperficiePilar`.

              O que estava partido não era a falta de um controlo — era
              o controlo existente a MISTURAR dois tipos de separador:
              «Descobrir» e «Preço» trocavam o conteúdo na mesma página
              e os outros três saíam dela para `/ferramentas/<slug>`.
              A NN/g é explícita sobre isso desorientar.

              Dar `homepageHref` aos cinco pilares corrigiu a cápsula
              que já existia. Acrescentar outra régua por baixo dela
              seria resolver o problema criando-o outra vez. */}
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
          ) : (
            <>
          <Hero cmp={landingCmp} recibo={landingRecibo} vencimento={landingVencimento} />

          {/* ── A BÚSSOLA ───────────────────────────────────────────
              O sistema que guia quem chega a `/` até ao foco certo.
              Substitui o cartão «Sou trabalhador / Gostaria de», que
              perguntava quem és; esta pergunta o que queres saber, e
              cada entrada é uma ligação real para a leitura desse
              foco. Vive imediatamente a seguir ao hero porque é a
              primeira decisão que a página pede. */}
          <section className="px-6 pt-10 sm:pt-14">
            <div className="mx-auto max-w-5xl">
              <Bussola
                compacta
                titulo="Cinco perguntas. Começa pela tua."
                nota="Cada uma abre uma leitura própria, com a sua demonstração."
              />
            </div>
          </section>
          {/* Ver a nota em `FizFaixaDemo`: o ato da demo é o extra, isto é o
              piso — renderizado no servidor, imóvel, e o único caminho para
              quem tem movimento reduzido, JavaScript desligado ou um ecrã
              tátil onde o alvo desaparece por baixo do dedo. */}
          {/* `px-6` por fora e `max-w-5xl` por dentro — a mesma ordem das
              secções e do hero. Com as duas classes no mesmo elemento, o
              conteúdo desta faixa nascia 24px mais à direita do que tudo o que
              tem por cima e por baixo. */}
          <div className="px-6">
            <div className="mx-auto max-w-5xl">
              <FizFaixaDemo superficie="demo.hero.faixa" />
            </div>
          </div>

          {/*
           * ── Simulador integrado ──────────────────────────────────────────
           * Uma única ferramenta interativa, adaptada ao perfil (recibos verdes,
           * vencimento, empresa ou comparador). É o produto — vive logo a seguir
           * ao Hero para o utilizador experimentar de imediato.
           */}
          <section
            id="calculadora"
            className="grain border-y border-stone-100 bg-white px-6 py-14 scroll-mt-20 sm:py-20"
          >
            <CalculadoraSecao />
          </section>

          {/*
           * ── Os cinco pilares ──────────────────────────────────────────────
           * A MESMA navegação da cápsula e da barra do telemóvel, aqui com a
           * linha de resultado que não cabe numa barra. Server Component: são
           * cinco `<a href>` no HTML servido, e os quatro «pilares» antigos
           * desta página não eram sequer ligações — eram um valor em
           * `localStorage` a ramificar o hero no cliente.
           *
           * Vive DEPOIS da calculadora e não antes: o simulador é o produto e
           * continua a ser a primeira coisa a seguir ao hero. Quem quer
           * navegar já tem os cinco destinos acima da dobra, na cápsula (ou
           * na barra, no telemóvel); isto é para quem rolou.
           */}
          <section className="px-6 pt-14 sm:pt-20">
            <div className="mx-auto max-w-5xl">
              <FilaPilares />
            </div>
          </section>

          {/*
           * ── #explorar — launchpad único, moldado ao perfil ────────────────
           * Substitui as antigas Features + Ferramentas + Simulador de IRS +
           * Aprender por UMA secção compacta que mostra só o essencial de cada
           * perfil: um destaque (a demo do IRS em direto onde é protagonista, ou o
           * cartão-chave), a fila de ferramentas relevantes e a de guias + Quiz.
           * `nAtividades` é calculado no servidor para o chip nunca inventar.
           */}
          <section id="explorar" className="px-6 py-14 scroll-mt-20 sm:py-20">
            <ExplorarSecao nAtividades={ATIVIDADES.length} />
          </section>

          <Stats />

          <Precos />

          <FAQ />

          <Fontes />
            </>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
}
