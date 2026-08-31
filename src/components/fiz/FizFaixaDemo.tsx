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
  // ── Porque é que isto avisa ────────────────────────────────────────────
  //  As cinco condições abaixo devolvem todas `null`, e `null` desenha
  //  exatamente o mesmo que uma parceria que nunca existiu: nada. Quando o
  //  cartaz desaparece de produção, o HTML não distingue "interruptor de
  //  emergência ligado" de "link em falta na base de dados" — e sem essa
  //  distinção o diagnóstico é adivinhação.
  //
  //  O aviso só sai quando a faixa NÃO aparece, o que em operação normal é
  //  nunca. Fica no log do build (a página é estática) e nomeia a condição.
  const semFaixa = (motivo: string) => {
    console.warn(`[parcerias] ${superficie}: cartaz não renderizado — ${motivo}.`);
    return null;
  };

  // Sem parceria ativa não há faixa — e a demo continua exatamente igual.
  if (!parceriasAtivas()) return semFaixa("PARCERIAS_DESLIGADAS=true no ambiente");
  const parceria = await parceriaAtiva("fiz");
  // `parceriaUtilizavel` é um type guard: no ramo negativo o TypeScript
  // estreita `parceria` para `null`, mas em runtime ela pode muito bem ser um
  // objeto — só que inativo, sem link ou fora da janela. É precisamente esse
  // objeto que interessa ao diagnóstico, daí a referência guardada antes.
  const bruta = parceria;
  if (!parceriaUtilizavel(parceria)) {
    return semFaixa(
      bruta
        ? `parceria "fiz" inutilizável (ativo=${bruta.ativo}, link=${!!bruta.linkAfiliado}, janela=${bruta.inicioEm ?? "—"}..${bruta.fimEm ?? "—"})`
        : 'parceria "fiz" não encontrada em admin_partners nem em código',
    );
  }
  if (parceria.modo !== "LIGACAO") return semFaixa(`modo da parceria é "${parceria.modo}", não "LIGACAO"`);

  const placement = await placementDaSuperficie(parceria.id, superficie);
  if (!placement) {
    return semFaixa(
      `sem placement para "${superficie}" — ou existe linha em partner_placements com ativo=false ` +
        `(desligada no painel: desde a #85 isso manda e o piso em código já não a repõe), ` +
        `ou não existe linha e a superfície não consta de superficiesAtivas do parceiro "${parceria.id}"`,
    );
  }

  const recurso = copyDaSuperficie(superficie);
  const titulo = placement.copyTitulo?.trim() || recurso.titulo;
  const sub = placement.copySub?.trim() || recurso.sub;
  const divulgacao =
    placement.divulgacao?.trim() || parceria.divulgacao.trim() || DIVULGACAO_LIGACAO;

  // Destino de alta intenção: quem chega ao fim de uma demonstração já viu o
  // número e a conclusão.
  const href = `/ir/fiz?s=${encodeURIComponent(superficie)}&v=banner&d=registo`;

  return (
    <aside className={className} aria-label="Publicidade de parceiro">
      {/* A nossa linha primeiro: é ela que nomeia a fronteira — o que é
          estimativa nossa e o que é execução deles. O cartaz do parceiro vem
          a seguir, e é dele a mensagem comercial. */}
      <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">{titulo}</p>
      {/* Esta faixa assenta em superfícies da marca (`brand-light`, #e8f1ea)
          e não em branco. Lá, o `text-stone-500` remapeado dá 4,47:1 — passa
          a raspar ao lado dos 4,5:1 exigidos, e o axe apanha-o na homepage.
          Um degrau mais escuro dá 6,61:1 na mesma superfície e continua a
          ser secundário face ao título por cima. */}
      <p className="mt-0.5 texto-mini leading-relaxed text-stone-600 dark:text-stone-300">{sub}</p>

      <FizCriativoImagem href={href} className="mt-2.5" />

      <FizDisclosure texto={divulgacao} className="mt-2" />
    </aside>
  );
}
