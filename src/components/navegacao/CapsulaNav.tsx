"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A BANDEJA DOS CINCO PILARES — a segunda linha do cabeçalho
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ OCUPA A LINHA TODA, E AS RÉGUAS SÃO O QUE TORNA ISSO LEGÍTIMO         │
//  │                                                                     │
//  │ Uma bandeja esticada sem mais nada foi tentada e ficava mal: seis    │
//  │ rótulos com ~80 px de ar entre eles perdem o agrupamento que uma     │
//  │ bandeja existe para comunicar, e lê-se como itens a boiar num tubo.  │
//  │ A correcção óbvia — encolher a bandeja ao conteúdo — resolvia isso e │
//  │ deixava a linha com um bloco à esquerda e um vazio à direita.        │
//  │                                                                     │
//  │ A resposta certa não era nenhuma das duas: é ocupar a linha inteira  │
//  │ E dar-lhe estrutura por dentro. Cada pilar tem a mesma fatia         │
//  │ (`flex-1`), e uma régua fina separa fatias vizinhas. O espaço deixa  │
//  │ de ser ar e passa a ser coluna.                                      │
//  │                                                                     │
//  │ A régua desaparece ao lado do pilar aceso: ali quem separa é a       │
//  │ própria pastilha, e uma régua colada a ela seria um traço a mais.    │
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
import { medirNavegacao } from "@/lib/busca/medicao";
import type { FocoHomepage } from "@/lib/foco-homepage";

const ITEM =
  "focus-marca flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-full px-3 text-sm transition-colors";

const INATIVO = "font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200";

const ATIVO = "font-semibold bg-white text-brand-dark shadow-card dark:bg-stone-950 dark:text-brand";

export default function CapsulaNav({ foco = null }: { foco?: FocoHomepage | null }) {
  const pathname = usePathname();
  const aceso = hrefAtivo(pathname);

  return (
    <nav
      aria-label="Principal"
      className="flex w-full items-center gap-1 rounded-full bg-stone-100 p-1.5 dark:bg-stone-800/70"
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
        const anteriorAceso = Boolean(
          anterior && (foco === anterior.id || aceso === anterior.href),
        );
        return (
          <Fragment key={pilar.id}>
            {i > 0 && !ativo && !anteriorAceso && (
              <span aria-hidden className="h-5 w-px flex-shrink-0 bg-stone-200 dark:bg-stone-700" />
            )}
            <Link
              href={destino}
              aria-label={pilar.label}
              aria-current={ativo ? "page" : undefined}
              onClick={() => medirNavegacao(pilar.id, "secretaria")}
              className={`${ITEM} ${ativo ? ATIVO : INATIVO}`}
            >
              <Icon
                size={17}
                className={`flex-shrink-0 ${ativo ? "text-brand" : "text-stone-400 dark:text-stone-500"}`}
              />
              <span className="truncate">{pilar.label}</span>
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
