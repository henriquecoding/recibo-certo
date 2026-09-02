// ═══════════════════════════════════════════════════════════════════════
//  O PASSO SEGUINTE, NA HOMEPAGE — o mapa antes do cartaz
//  ---------------------------------------------------------------------
//  A presença da FIZ na homepage era um cartaz sozinho, encostado ao fundo
//  da página, a seguir à bússola. Funcionava como peça legal — estava no
//  HTML inicial, tinha divulgação e `rel="sponsored nofollow"` — e falhava
//  como peça editorial em duas coisas de uma vez:
//
//  1. Aparecia sem enquadramento. Um banner amarelo depois de sete secções
//     nossas lê-se como publicidade avulsa, e uma pessoa que já leu a página
//     inteira não sabe porque é que aquilo está ali.
//  2. A nossa própria linha vendia a FIZ como «contabilistas certificados».
//     O site TEM contabilistas — um diretório, perfis aprovados, vínculo sem
//     plano pago e uma ordem que não se compra. Anunciar um parceiro pago com
//     a mesma palavra que descreve o nosso diretório punha os dois a competir
//     pelo mesmo clique, e o que perdia era o nosso.
//
//  A correção não é tirar o anúncio: é dar-lhe o sítio certo dentro de um
//  mapa. Primeiro dizemos onde acabamos nós e quando é caso para um
//  profissional — essa faixa é nossa e não é publicidade. Só depois vem o
//  cartaz do parceiro, na faixa que é dele: a da execução.
//
//  ── A fronteira não é escrita aqui ──────────────────────────────────
//  As três frases vêm de `FRONTEIRA` (`src/lib/routing.ts`), que é a mesma
//  repartição publicada em `/metodologia#comercial`. Reescrevê-las aqui era
//  criar uma segunda versão da fronteira, livre de divergir da primeira sem
//  ninguém dar por isso.
//
//  ── E isto NÃO é uma recomendação ───────────────────────────────────
//  Depois de um resultado, quem escolhe a rota é `escolherRota()` — que põe o
//  contabilista à frente da FIZ e fecha a rota comercial quando a confiança
//  não chega. A homepage não tem resultado nenhum: isto é um cartaz rotulado,
//  e por isso nunca usa o vocabulário de recomendação («o teu caso»,
//  «sugerimos»). Diz quem faz o quê, e deixa a escolha à pessoa.
//
//  ── Porque é que é tão curto ────────────────────────────────────────
//  Esta secção entra nas CINCO rotas de homepage, e o HTML de cada uma leva
//  a cópia Flight por baixo — tudo o que aqui se escreve conta duas vezes,
//  cinco vezes. A primeira versão tinha três faixas e três parágrafos de
//  ressalvas, e sozinha empurrou `/inicio/empresa` para lá do budget de HTML
//  do `verificar-chunks-homepage`. O que sobrou é o que não se pode cortar
//  sem a secção deixar de fazer o seu trabalho: quem faz o quê, quem paga
//  para estar aqui, e para onde vai quem precisa de um profissional.
//
//  ── E porque é que NÃO vive no fim da página ─────────────────────────
//  Viveu, na casca comum às cinco entradas, a seguir à bússola. Era o sítio
//  mais fácil de montar — um só ponto — e o pior de todos para o que a
//  secção faz: a seguir ao último ato da leitura, depois do FAQ, das fontes
//  e da bússola, quem lá chega já fechou o separador. Um anúncio que ninguém
//  vê não é discreto, é inútil; e a fronteira que a secção explica também
//  não chegava a ninguém.
//
//  Passou a ser montada por CADA leitura, no fim do arco «o que fazer a
//  seguir» — a seguir à secção de Percurso, antes dos pilares e dos planos.
//  É o sítio onde as cinco páginas já falam de próximos passos, portanto a
//  secção lê-se como a continuação da anterior e não como uma interrupção:
//  o Percurso diz o que vem a seguir DENTRO do produto, e isto diz quem faz
//  o que fica de fora.
//
//  As cinco montagens são verificadas por `parcerias:demo` — uma leitura que
//  se esqueça dela reprova.
//
//  Componente de SERVIDOR, sem uma linha de JavaScript no cliente.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { ArrowRight, Megaphone, Scale, ShieldCheck } from "@/components/ui/Icons";
import FizDisclosure from "@/components/fiz/FizDisclosure";
import FizCriativoImagem from "./FizCriativoImagem";
import { anuncioDaSuperficie } from "@/lib/parcerias/anuncio.server";
import { FRONTEIRA } from "@/lib/routing";
import type { Superficie } from "@/content/parcerias-destinos";

const CARTAO = "rounded-4xl border p-5 shadow-card sm:p-6";
const ROTULO = "texto-micro font-bold uppercase tracking-[.14em]";
const SELO = "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl";

/**
 * A moldura é sempre a mesma nas cinco leituras — quem monta não a escolhe.
 *
 * Esteve como `className` aberto, e isso é um convite a que cada página lhe
 * dê o seu espaçamento: cinco secções iguais com cinco ritmos diferentes, e
 * ninguém repara até estarem lado a lado. Sem padding no topo de propósito:
 * a secção de Percurso, que vem sempre antes, já fecha com `py-24`.
 */
const MOLDURA =
  "rc-home-deferred rc-home-deferred--medium px-4 pb-10 sm:px-6 sm:pb-14";

export default async function PassoSeguinteHomepage({
  superficie,
}: {
  superficie: Extract<Superficie, "demo.hero.faixa">;
}) {
  // Falha fechado, e diz porquê no log do build: ver `anuncio.server.ts`.
  // Quando a parceria está desligada ficam as duas faixas nossas, e a secção
  // continua a fazer sentido sozinha — sem buraco na página.
  const anuncio = await anuncioDaSuperficie(superficie);

  return (
    <section aria-labelledby="passo-seguinte-titulo" className={MOLDURA}>
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p className="eyebrow mb-3 text-brand">O passo seguinte</p>
          <h2
            id="passo-seguinte-titulo"
            className="text-balance font-display display-2 font-semibold text-ink"
          >
            Preparar é connosco. Executar e decidir têm dono.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Não emitimos faturas por ti nem assinamos nada em teu nome. Daqui saem dois caminhos,
            com donos diferentes — e só um deles é publicidade.
          </p>
        </header>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {/* 1 · Nós */}
          <article className={`${CARTAO} border-brand/30 bg-brand-light dark:bg-brand/15`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`${SELO} bg-brand text-white`}>
                <ShieldCheck size={17} />
              </span>
              <span className={`${ROTULO} text-brand-dark dark:text-brand-mint`}>Estás aqui</span>
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold text-ink">Recibo Certo</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {FRONTEIRA.reciboCerto} Sem submeter nada em teu nome.
            </p>
          </article>

          {/* 2 · O contabilista — nosso, e sem cartaz nenhum */}
          <article
            className={`${CARTAO} flex flex-col border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`${SELO} bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300`}>
                <Scale size={17} />
              </span>
              <span className={`${ROTULO} text-stone-500 dark:text-stone-400`}>
                Não é publicidade
              </span>
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold text-ink">Um contabilista</h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {FRONTEIRA.contabilista}
            </p>
            {/* Os casos são os de `exigeProfissional` em `escolherRota()`,
                ditos por extenso: «sociedade» não se lê como «abri uma Lda». */}
            <p className="mt-2.5 texto-mini leading-relaxed text-stone-600 dark:text-stone-400">
              Lda, contabilidade organizada, herança ou rendimentos em mais do que um país. Procurar
              e pedir vínculo não exige plano pago, e a ordem do diretório não se compra.
            </p>
            <Link
              href="/contabilistas"
              // `sm:self-start` e não só `sm:w-auto`: num contentor `flex-col`
              // o alinhamento por omissão é `stretch`, e uma largura `auto`
              // continua a ser esticada até à borda do cartão.
              className="focus-marca mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 no-underline hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 sm:mt-auto sm:w-auto sm:self-start"
            >
              Ver o diretório <ArrowRight size={14} />
            </Link>
          </article>
        </div>

        {/* ── E só agora o cartaz ───────────────────────────────────────
            O criativo é um anúncio completo (diz o que a FIZ faz, a que preço
            e com que certificação) e é servido tal como veio, sem recorte nem
            recolorização — é assim que aquelas afirmações continuam a ser
            deles e não nossas. Vem depois do mapa de propósito: quem clica já
            sabe o que é a FIZ, o que não é, e que isto é pago.

            Um alvo só. O cartaz JÁ é um `<a>` com `aria-label`, e a imagem tem
            `alt` — o foco chega lá por teclado e o leitor de ecrã anuncia-o.
            Um botão por baixo seria um segundo CTA para a mesma ação. */}
        {anuncio && (
          <aside
            aria-label="Publicidade de parceiro"
            className="mt-3 overflow-hidden rounded-4xl border border-fiz-200 bg-fiz-50 p-5 sm:p-6"
          >
            {/* `lg:grid-cols-2` e não um `minmax()` à medida: a classe
                arbitrária fazia o Turbopack partir o CSS global em dois
                pedaços e emitir só um — as rotas que ficavam com o outro
                pediam um ficheiro que não existia, e o browser recusava a
                folha de estilos inteira. Duas colunas iguais chegam. */}
            <div className="grid gap-5 lg:grid-cols-2 lg:items-center lg:gap-8">
              <div className="min-w-0">
                {/* Rótulo ANTES do cartaz: é o que a política de afiliados
                    exige, e a divulgação por baixo não substitui. */}
                <p className={`inline-flex items-center gap-1.5 ${ROTULO} text-fiz-700`}>
                  <Megaphone size={12} /> Publicidade · o nosso parceiro
                </p>
                {/* A NOSSA linha, antes da deles: é ela que nomeia a fronteira
                    — o que é preparação nossa e o que é execução da FIZ. */}
                <p className="mt-2.5 font-display text-lg font-semibold leading-snug text-ink">
                  {anuncio.titulo}
                </p>
                {/* Não repete `FRONTEIRA.fiz`: esta linha é a copy da
                    superfície, corrigível no admin sem deploy, e diz o mesmo
                    — a execução é deles, com preço e contrato deles. */}
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {anuncio.sub}
                </p>
                <FizDisclosure texto={anuncio.divulgacao} className="mt-3" />
              </div>

              {/* `max-w-xl` e não largura livre: a 1152px o cartaz de 1,91:1
                  desenhava 600px de altura e a página acabava num painel
                  publicitário do tamanho de um ecrã. Foi `max-w-2xl` enquanto
                  a secção vivia no fim da página; agora que ela está no meio
                  da leitura, o cartaz tem de caber sem a interromper — e um
                  degrau abaixo tira-lhe também a folga vertical que sobrava
                  ao lado da nossa coluna de texto. */}
              <FizCriativoImagem href={anuncio.href} className="mx-auto w-full max-w-xl" />
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
