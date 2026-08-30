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
import { faqs } from "@/lib/faq";
import {
  generateWebSiteSchema,
  generateOrganizationSchema,
  generateSoftwareApplicationSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
} from "@/lib/seo";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    generateWebSiteSchema(),
    generateOrganizationSchema(),
    generateSoftwareApplicationSchema(),
    generateBreadcrumbSchema([{ name: "Início", url: "/" }]),
    generateFAQSchema(faqs),
  ],
};

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

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div id="top">
        <Nav />
        <main>
          <Hero cmp={landingCmp} recibo={landingRecibo} vencimento={landingVencimento} />
          {/* Ver a nota em `FizFaixaDemo`: o ato da demo é o extra, isto é o
              piso — renderizado no servidor, imóvel, e o único caminho para
              quem tem movimento reduzido, JavaScript desligado ou um ecrã
              tátil onde o alvo desaparece por baixo do dedo. */}
          {/* `px-6` por fora e `max-w-5xl` por dentro — a mesma ordem das
              secções e do hero. Com as duas classes no mesmo elemento, o
              conteúdo desta faixa nascia 24px mais à direita do que tudo o que
              tem por cima e por baixo. */}
          <div className="px-4 sm:px-6">
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
            // `px-4` na base e `px-6` a partir de `sm:`: a 360px cada 8px de
            // margem custa 4,4% da largura útil, e a secção ainda tem um
            // cartão com padding próprio por dentro — eram 96px dos 360 só em
            // ar lateral. O `scroll-mt` segue a mesma lógica do chrome: no
            // telemóvel a barra vive toda EM BAIXO, portanto reservar 80px no
            // topo era abrir um buraco por baixo de um cabeçalho que não
            // existe. A partir de `lg:` há cápsula fixa no topo e os 80
            // voltam.
            className="grain border-y border-stone-100 bg-white px-4 py-14 scroll-mt-4 sm:px-6 sm:py-20 lg:scroll-mt-20"
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
          <section className="px-4 pt-14 sm:px-6 sm:pt-20">
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
          <section id="explorar" className="px-4 py-14 scroll-mt-4 sm:px-6 sm:py-20 lg:scroll-mt-20">
            <ExplorarSecao nAtividades={ATIVIDADES.length} />
          </section>

          <Stats />

          <Precos />

          <FAQ />

          <Fontes />
        </main>
        <Footer />
      </div>
    </>
  );
}
