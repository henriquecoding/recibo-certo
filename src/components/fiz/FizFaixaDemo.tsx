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
//  Acompanha-o um botão de texto a sério. O «Experimentar» que se vê no
//  cartaz são pixels: quem navega por teclado, tem imagens bloqueadas ou usa
//  leitor de ecrã precisa de um alvo que exista no DOM.
// ═══════════════════════════════════════════════════════════════════════

import FizActionButton from "./FizActionButton";
import FizDisclosure from "./FizDisclosure";
import FizCriativoImagem from "@/components/parcerias/FizCriativoImagem";
import { copyDaSuperficie, DIVULGACAO_LIGACAO } from "@/content/parcerias-copy";
import {
  parceriaAtiva,
  parceriaUtilizavel,
  parceriasAtivas,
  placementDaSuperficie,
} from "@/lib/parcerias/catalogo.server";
import type { Superficie } from "@/content/parcerias-destinos";

export default async function FizFaixaDemo({
  superficie,
  className = "",
}: {
  superficie: Extract<Superficie, "demo.hero.faixa" | "demo.irs.faixa">;
  className?: string;
}) {
  // Sem parceria ativa não há faixa — e a demo continua exatamente igual.
  if (!parceriasAtivas()) return null;
  const parceria = await parceriaAtiva("fiz");
  if (!parceriaUtilizavel(parceria)) return null;
  if (parceria.modo !== "LIGACAO") return null;

  const placement = await placementDaSuperficie(parceria.id, superficie);
  if (!placement) return null;

  const recurso = copyDaSuperficie(superficie);
  const titulo = placement.copyTitulo?.trim() || recurso.titulo;
  const sub = placement.copySub?.trim() || recurso.sub;
  const cta = placement.copyCta?.trim() || recurso.cta;
  const divulgacao =
    placement.divulgacao?.trim() || parceria.divulgacao.trim() || DIVULGACAO_LIGACAO;

  // Destino de alta intenção: quem chega ao fim de uma demonstração já viu o
  // número e a conclusão. A variante entra por cima, para conseguirmos
  // distinguir quem clicou no cartaz de quem clicou no botão — é a única
  // forma de saber qual dos dois faz o trabalho.
  const base = `/ir/fiz?s=${encodeURIComponent(superficie)}&d=registo`;

  return (
    <aside className={className} aria-label="Publicidade de parceiro">
      {/* A nossa linha primeiro: é ela que nomeia a fronteira — o que é
          estimativa nossa e o que é execução deles. O cartaz do parceiro vem
          a seguir, e é dele a mensagem comercial. */}
      <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">{titulo}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{sub}</p>

      <FizCriativoImagem href={`${base}&v=banner`} className="mt-2.5" />

      <div className="mt-3">
        <FizActionButton href={`${base}&v=faixa`}>{cta}</FizActionButton>
      </div>
      <FizDisclosure texto={divulgacao} className="mt-2" />
    </aside>
  );
}
