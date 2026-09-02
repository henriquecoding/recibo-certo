// ═══════════════════════════════════════════════════════════════════════
//  FAIXA ESTÁTICA POR BAIXO DE UMA DEMONSTRAÇÃO — o piso
//  ---------------------------------------------------------------------
//  Um botão que só existe durante 3 segundos a cada ciclo é um botão hostil.
//  Quatro cenários partem-no, e três deles não se resolvem com trancas:
//
//   · `prefers-reduced-motion` — as duas demos repousam no ato do RESULTADO,
//     não no da parceria. O ato FIZ NUNCA aparece a quem pediu menos
//     movimento, e essa é precisamente parte do público que mais beneficia
//     de um caminho estático.
//   · toque — `onMouseEnter` não dispara de forma fiável num ecrã tátil;
//   · sem JavaScript ou antes da hidratação — as demos são `"use client"` e
//     antes de hidratar não há link nenhum no DOM.
//
//  Esta faixa é um componente de SERVIDOR, fora do palco. Está no HTML
//  inicial, não se move, não desaparece, e é a única superfície das demos que
//  os motores de pesquisa veem — com `rel="sponsored nofollow"`, portanto sem
//  transmitir autoridade.
//
//  O botão dentro do ato é o extra. Isto é o piso.
//
//  ── Porque é aqui que vive o cartaz ──────────────────────────────────
//  O criativo da FIZ é um anúncio completo: diz o que fazem, a que preço e
//  com que certificação, e traz o seu próprio botão. Dentro do cartão da
//  página de Planos seria a mesma mensagem duas vezes, porque esse cartão é
//  precisamente a explicação da parceria. Aqui não há explicação nenhuma da
//  FIZ — a página é sobre o nosso simulador —, por isso o cartaz é a única
//  presença deles e não repete nada.
//
//  ── Um alvo só ──────────────────────────────────────────────────────
//  Esteve aqui um botão «Conhecer a FIZ» por baixo do cartaz, com a
//  justificação de que o «Experimentar» do criativo são pixels e quem usa
//  teclado ou leitor de ecrã precisa de um alvo a sério.
//
//  A justificação não se sustentava: o cartaz JÁ é um `<a>` com `aria-label`
//  e a imagem tem `alt`. O foco chega lá por Tab, o leitor de ecrã anuncia-o,
//  e com imagens desligadas o `alt` é o texto da ligação. Estava tudo
//  coberto — o botão era um segundo CTA para a mesma ação, colado ao
//  primeiro.
// ═══════════════════════════════════════════════════════════════════════

import FizDisclosure from "./FizDisclosure";
import FizCriativoImagem from "@/components/parcerias/FizCriativoImagem";
import { anuncioDaSuperficie } from "@/lib/parcerias/anuncio.server";
import type { Superficie } from "@/content/parcerias-destinos";

export default async function FizFaixaDemo({
  superficie,
  className = "",
}: {
  superficie: Extract<Superficie, "demo.hero.faixa" | "demo.irs.faixa">;
  className?: string;
}) {
  // As cinco guardas — parcerias desligadas, parceria inutilizável, fora da
  // janela, modo errado, placement desligado — vivem em `anuncio.server.ts`,
  // porque agora há duas superfícies a mostrar este cartaz e uma guarda
  // duplicada é uma guarda que um dia só se aperta de um lado.
  const anuncio = await anuncioDaSuperficie(superficie);
  if (!anuncio) return null;

  return (
    <aside className={className} aria-label="Publicidade de parceiro">
      {/* A nossa linha primeiro: é ela que nomeia a fronteira — o que é
          estimativa nossa e o que é execução deles. O cartaz do parceiro vem
          a seguir, e é dele a mensagem comercial. */}
      <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">{anuncio.titulo}</p>
      {/* Esta faixa assenta em superfícies da marca (`brand-light`, #e8f1ea)
          e não em branco. Lá, o `text-stone-500` remapeado dá 4,47:1 — passa
          a raspar ao lado dos 4,5:1 exigidos, e o axe apanha-o na homepage.
          Um degrau mais escuro dá 6,61:1 na mesma superfície e continua a
          ser secundário face ao título por cima. */}
      <p className="mt-0.5 texto-mini leading-relaxed text-stone-600 dark:text-stone-300">
        {anuncio.sub}
      </p>

      <FizCriativoImagem href={anuncio.href} className="mt-2.5" />

      <FizDisclosure texto={anuncio.divulgacao} className="mt-2" />
    </aside>
  );
}
