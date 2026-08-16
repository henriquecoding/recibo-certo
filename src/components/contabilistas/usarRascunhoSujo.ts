"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A GUARDA DO RASCUNHO POR GRAVAR
//  ---------------------------------------------------------------------
//  Três ecrãs do painel mantêm rascunho sujo — o perfil (dezasseis campos),
//  a semana-tipo e a regra de fidelidade — e nenhum deles tinha guarda
//  nenhuma. Não havia um único `beforeunload` em todo o `src/`.
//
//  Isto importa mais aqui do que noutro sítio qualquer por causa da forma
//  do painel: a barra lateral tem nove destinos permanentemente a um
//  clique, e a doca do telemóvel tem os mesmos nove. Bastava carregar em
//  «Clientes» a meio de escrever a apresentação profissional para a perder
//  sem uma pergunta.
//
//  Duas saídas, duas defesas:
//
//   · fechar/recarregar o separador → `beforeunload`, que é o único
//     mecanismo que o browser dá e que não deixa personalizar o texto;
//   · navegar dentro da app → interceção do clique em `<a>`, porque o
//     App Router não expõe um `router.events` onde se possa dizer «não».
//     É por captura, antes de o Next receber o evento.
//
//  O que isto NÃO faz: bloquear o botão «voltar» do browser. Um
//  `popstate` já aconteceu quando chega, e desfazê-lo com `history.push`
//  cria um ciclo pior do que o problema. Assumido.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect } from "react";
import { useConfirmar } from "@/components/ui/Confirmar";

export interface OpcoesRascunho {
  /** Há alterações por gravar neste instante? */
  sujo: boolean;
  /** O que se perde, dito à pessoa. Uma frase. */
  descricao?: string;
}

export function usarRascunhoSujo({ sujo, descricao }: OpcoesRascunho): void {
  const confirmar = useConfirmar();

  // Fechar ou recarregar o separador.
  useEffect(() => {
    if (!sujo) return;
    function aoSair(e: BeforeUnloadEvent) {
      e.preventDefault();
      // O texto é do browser desde 2021 — o valor só liga o diálogo.
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [sujo]);

  // Navegar dentro da app.
  useEffect(() => {
    if (!sujo) return;

    async function aoClicar(e: MouseEvent) {
      // Cliques com modificadores abrem noutro separador: o rascunho fica
      // onde está e não há nada a perguntar.
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const alvo = e.target instanceof Element ? e.target.closest("a") : null;
      if (!(alvo instanceof HTMLAnchorElement)) return;
      if (alvo.target && alvo.target !== "_self") return;
      if (alvo.hasAttribute("download")) return;

      const destino = alvo.getAttribute("href");
      if (!destino || destino.startsWith("#")) return;

      // Só interessa navegação que troca de página. Uma âncora para o
      // mesmo sítio não perde nada.
      const url = new URL(alvo.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      e.preventDefault();
      e.stopPropagation();

      const ok = await confirmar({
        titulo: "Sair sem guardar?",
        descricao: descricao ?? "Tens alterações por guardar neste ecrã.",
        consequencias: ["O que escreveste perde-se e não há forma de o recuperar."],
        confirmar: "Sair sem guardar",
        cancelar: "Ficar e guardar",
        tom: "perigo",
      });
      if (ok) {
        // A guarda desliga-se ao sair de propósito: sem isto, o
        // `beforeunload` voltava a perguntar por cima da resposta.
        window.removeEventListener("click", aoClicar, true);
        window.location.href = url.href;
      }
    }

    window.addEventListener("click", aoClicar, true);
    return () => window.removeEventListener("click", aoClicar, true);
  }, [sujo, descricao, confirmar]);
}
