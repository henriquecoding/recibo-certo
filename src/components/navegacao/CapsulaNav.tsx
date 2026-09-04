"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A BANDEJA DOS CINCO PILARES — a segunda linha do cabeçalho
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ UMA FAIXA, E NÃO UMA BANDEJA — AS RÉGUAS É QUE FAZEM AS COLUNAS      │
//  │                                                                     │
//  │ Foi uma bandeja cinzenta com cantos redondos, e a bandeja competia   │
//  │ com o próprio cartão do cabeçalho: duas superfícies com forma        │
//  │ própria, uma dentro da outra, a dizer as duas «eu é que sou o        │
//  │ contentor». Passa a ser uma FAIXA delimitada por duas hairlines,     │
//  │ com a largura do cartão e sem forma própria.                         │
//  │                                                                     │
//  │ Cada pilar tem a mesma fatia (`flex-1`) e uma régua de altura        │
//  │ inteira separa fatias vizinhas — o espaço deixa de ser ar e passa a  │
//  │ ser coluna. A régua desaparece ao lado do pilar aceso: ali quem      │
//  │ separa é a própria pastilha, e uma régua colada a ela é um traço a   │
//  │ mais.                                                                │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O PONTO DE ESTADO É DERIVADO — NUNCA UM ENFEITE                      │
//  │                                                                     │
//  │ Um ponto ao lado de um rótulo é uma afirmação: «há aqui alguma       │
//  │ coisa nova». Se for decoração, ensina-se em duas visitas que não     │
//  │ significa nada, e o dia em que significar já ninguém olha.           │
//  │                                                                     │
//  │ Vem do catálogo: a ferramenta canónica do pilar declara `status:     │
//  │ "novo"`, e é o catálogo que o retira quando deixa de ser verdade.     │
//  │ Não há aqui lista nenhuma para manter em dia.                        │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O ESTADO ACTIVO SÃO TRÊS SINAIS, E NENHUM É SÓ COR                   │
//  │                                                                     │
//  │ Relevo (a pastilha branca levanta-se da bandeja cinzenta, com        │
//  │ sombra), contraste de fundo, e a cor da marca no ícone e no rótulo.  │
//  │ Verificado em cinzento E sem sombras ao mesmo tempo: o que sobra é   │
//  │ a aresta branco/cinza e um rótulo mais escuro do que os vizinhos.    │
//  │                                                                     │
//  │ É o `aria-current="page"` que carrega o estado para a tecnologia de  │
//  │ apoio; a pintura segue-o, em vez de serem duas verdades a manter.    │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { iconeDe } from "@/components/ferramentas/icon-map";
import { PILARES, hrefAtivo, hrefDaSuperficiePilar } from "@/lib/navegacao";
import { porId } from "@/lib/ferramentas";
import { medirNavegacao } from "@/lib/busca/medicao";
import type { FocoHomepage } from "@/lib/foco-homepage";
import { useIntencaoFocos } from "@/components/foco/ControladorPrefetchFocos";

const ITEM =
  "focus-marca flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-xl px-3 text-sm transition-colors";

const INATIVO = "font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-200";

const ATIVO = "font-semibold bg-stone-100 text-brand-dark dark:bg-stone-800 dark:text-brand";

/** `true` quando a ferramenta canónica do pilar se declara nova. */
const temNovidade = (toolId: string) => porId(toolId)?.status === "novo";

export default function CapsulaNav({ foco = null }: { foco?: FocoHomepage | null }) {
  const pathname = usePathname();
  const aceso = hrefAtivo(pathname);
  const { pendente, preparar, iniciar } = useIntencaoFocos();

  return (
    <nav
      aria-label="Principal"
      className="flex w-full items-stretch border-y border-stone-100 dark:border-stone-800"
    >
      {PILARES.map((pilar, i) => {
        const Icon = iconeDe(pilar.icone);
        const naSuperficieCanonica = aceso === pilar.href;
        // Se a pessoa já está na ferramenta canónica, o destino desenhado
        // também é essa ferramenta. Assim `aria-current="page"` nunca fica
        // num link que, ao ser activado, abre a homepage editorial.
        const destino = naSuperficieCanonica
          ? pilar.href
          : hrefDaSuperficiePilar(pilar);
        const ativo = foco === pilar.id || naSuperficieCanonica;
        const anterior = i > 0 ? PILARES[i - 1] : null;
        const destacado = pendente ? pendente === pilar.id : ativo;
        const anteriorAceso = Boolean(
          anterior &&
            (pendente
              ? pendente === anterior.id
              : foco === anterior.id || aceso === anterior.href),
        );
        return (
          <Fragment key={pilar.id}>
            {i > 0 && !destacado && !anteriorAceso && (
              <span aria-hidden className="my-2 w-px flex-shrink-0 bg-stone-100 dark:bg-stone-800" />
            )}
            <Link
              href={destino}
              // ── PRÉ-CARREGAR POR INTENÇÃO, NUNCA AS CINCO À ENTRADA ───
              //  `prefetch={false}` desliga TODA a política automática do
              //  Link, incluindo hover. Por isso os três eventos abaixo
              //  entregam o alvo ao controlador comum: pointerenter, foco e
              //  pointerdown. Ele deduplica, respeita Save-Data/2g e mantém
              //  uma única operação especulativa em curso.
              prefetch={false}
              // Sem `scroll={false}`: uma navegação que muda de rota tem de
              // pôr a página nova no princípio. Ver o quadro em
              // `ChromeMobile.tsx` — esteve aqui e abria as páginas no rodapé.
              aria-label={pilar.label}
              aria-current={ativo ? "page" : undefined}
              aria-busy={pendente === pilar.id || undefined}
              onPointerEnter={() => preparar(pilar.id)}
              onFocus={() => preparar(pilar.id)}
              onPointerDown={(evento) => {
                if (
                  evento.button === 0 &&
                  !evento.metaKey &&
                  !evento.ctrlKey &&
                  !evento.shiftKey &&
                  !evento.altKey
                ) {
                  iniciar(pilar.id, "pointer");
                }
              }}
              onClick={(evento) => {
                if (evento.detail === 0) iniciar(pilar.id, "teclado");
                medirNavegacao(pilar.id, "secretaria");
              }}
              className={`${ITEM} ${destacado ? ATIVO : INATIVO}`}
            >
              <Icon
                size={17}
                className={`flex-shrink-0 ${destacado ? "text-brand" : "text-stone-400 dark:text-stone-500"}`}
              />
              <span className="truncate">{pilar.label}</span>
              {/* Um ponto, e não uma pastilha «NOVO»: a fila tem cinco
                  lugares e uma palavra a mais em qualquer um deles empurra
                  os outros. O nome acessível diz o que o ponto significa —
                  um ponto sozinho não é informação para quem não o vê. */}
              {temNovidade(pilar.toolId) && (
                <span className="flex flex-shrink-0 items-center">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
                  <span className="sr-only">Novidade</span>
                </span>
              )}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
