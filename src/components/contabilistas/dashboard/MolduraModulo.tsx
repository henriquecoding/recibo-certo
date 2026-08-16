"use client";

/**
 * A moldura comum a todos os módulos do painel.
 *
 * É aqui que vive a diferença entre os dois modos, e ela é exatamente a
 * que a referência A mostra:
 *
 *  · modo normal — ícone, título, e o menu `•••`. Sem grip, sem handle de
 *    redimensionar, sem etiqueta e sem grelha visível (§9.1).
 *
 *  · modo de edição — o grip à esquerda, a TAG ao lado do grip
 *    («AGD-01»), a etiqueta de tamanho no canto («L»), e o handle de
 *    redimensionar no canto inferior direito (§9.2, §5.4).
 *
 * A tag só aparece em edição, e isso é uma decisão da §5.4: no modo normal
 * competiria com o conteúdo, mas em edição é o que permite dizer qual
 * módulo está a ser movido, qual falhou a carregar num log, e a que item
 * um desfazer se aplica. `#1`/`#2` não servem — deixam de fazer sentido
 * assim que se remove um módulo do meio.
 *
 * O esqueleto ocupa a área final do módulo (§12.9): o frame já tem o
 * título e a altura certa antes de o conteúdo chegar, e por isso nada
 * salta quando ele chega.
 */

import type { ReactNode } from "react";
import { MODULOS } from "@/lib/contabilistas/dashboard/modulos";
import { classesDoTom, tamanhoDoModulo } from "@/lib/contabilistas/dashboard/apresentacao";
import type { GridPlacement, WidgetSize, WidgetType } from "@/lib/contabilistas/dashboard/tipos";
import {
  Award, BellAlert, Briefcase, Calendar, Clock, Gift, GripVertical, LayoutGrid,
  Mail, PaperClip, Invoice, User, Warning, BookOpen, CheckTrend, Target,
} from "@/components/ui/Icons";
import MenuFlutuante from "./MenuFlutuante";
import styles from "./painel-modular.module.css";

type IconeSVG = React.ComponentType<{ size?: number; className?: string }>;

/** O ícone de cada módulo. Um sítio só — a biblioteca e o frame leem daqui. */
export const ICONE_DO_MODULO: Record<WidgetType, IconeSVG> = {
  agenda_hoje: Calendar,
  precisam_atencao: Warning,
  prazos_proximos: Clock,
  partilhas_recebidas: PaperClip,
  simulacoes_recebidas: Invoice,
  documentos_rever: BookOpen,
  atividade_semana: CheckTrend,
  centro_avisos: BellAlert,
  estado_trabalho: Target,
  clientes: User,
  casos: Briefcase,
  fidelidade: Gift,
  progressao_comissao: Award,
  casos_em_risco: Warning,
  comunicacoes_recentes: Mail,
  resumo_por_cliente: LayoutGrid,
};

export interface AcaoDoMenu {
  rotulo: string;
  onSelect: () => void;
  /** Separador visual acima desta entrada. */
  separar?: boolean;
  perigoso?: boolean;
}

export default function MolduraModulo({
  type,
  tag,
  placement,
  edicao,
  aArrastar,
  acoes,
  arrastarProps,
  onRedimensionar,
  children,
}: {
  type: WidgetType;
  tag: string;
  placement: GridPlacement;
  edicao: boolean;
  aArrastar?: boolean;
  /** Entradas do menu `•••`. Em edição inclui mover/tamanho/remover. */
  acoes?: AcaoDoMenu[];
  /** Handlers de arrasto, injetados pela grelha de edição. */
  arrastarProps?: React.HTMLAttributes<HTMLButtonElement>;
  /** Começa o redimensionamento pelo canto. */
  onRedimensionar?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  const def = MODULOS[type];
  const Icone = ICONE_DO_MODULO[type];
  const tom = classesDoTom(type);
  const tamanho = tamanhoDoModulo(placement);

  return (
    <section
      className={`${styles.modulo} ${edicao ? styles.moduloEdicao : ""} ${
        aArrastar ? styles.moduloAArrastar : ""
      }`}
      aria-label={`${def.titulo}${edicao ? ` (${tag})` : ""}`}
    >
      <header className={styles.moduloTopo}>
        {edicao && (
          <>
            <button
              type="button"
              {...arrastarProps}
              className={`${styles.grip} focus-marca`}
              aria-label={`Mover ${def.titulo} (${tag})`}
            >
              <GripVertical size={14} aria-hidden />
            </button>
            {/* A tag, ao lado do grip — §5.4. */}
            <span className={styles.tag}>{tag}</span>
          </>
        )}

        <span className={`${styles.moduloIcone} ${tom.fundo}`}>
          <Icone size={13} className={tom.icone} aria-hidden />
        </span>
        <h3 className={styles.moduloTitulo}>{def.titulo}</h3>

        <span className="ml-auto flex shrink-0 items-center gap-1">
          {edicao && <span className={styles.badgeTamanho}>{tamanho}</span>}
          {acoes && acoes.length > 0 && <MenuModulo titulo={def.titulo} acoes={acoes} />}
        </span>
      </header>

      {/* `min-h-0` é o que permite o corpo rolar dentro da altura do
          módulo em vez de a empurrar. Sem isso, um Kanban com muitos
          cartões estica o cartão para fora da célula da grelha. */}
      <div className={styles.moduloCorpo}>{children}</div>

      {edicao && onRedimensionar && (
        <button
          type="button"
          onPointerDown={onRedimensionar}
          className={`${styles.resize} focus-marca`}
          aria-label={`Redimensionar ${def.titulo} (${tag}). Use o menu para tamanhos exatos.`}
        >
          <span aria-hidden className={styles.resizeMarca} />
        </button>
      )}
    </section>
  );
}

/**
 * O menu `•••`.
 *
 * Vive em `MenuFlutuante`, e a razão é concreta: `.modulo` declara
 * `overflow: hidden` — tem de declarar, senão um Kanban com muitos cartões
 * estica o cartão para fora da célula — e isso RECORTAVA o menu a meio,
 * por muito `z-index` que ele tivesse. Sair da árvore por portal é a única
 * forma de o mostrar inteiro.
 */
function MenuModulo({ titulo, acoes }: { titulo: string; acoes: AcaoDoMenu[] }) {
  return (
    <MenuFlutuante
      etiqueta={`Opções de ${titulo}`}
      className={styles.menu}
      gatilho={(p) => (
        <button
          {...p}
          type="button"
          aria-label={`Opções de ${titulo}`}
          className={`${styles.menuBotao} focus-marca`}
        >
          <span aria-hidden>•••</span>
        </button>
      )}
    >
      {(fechar) =>
        acoes.map((a) => (
          <button
            key={a.rotulo}
            type="button"
            role="menuitem"
            onClick={() => { fechar(); a.onSelect(); }}
            className={`${styles.menuItem} ${a.separar ? styles.menuItemSeparado : ""} ${
              a.perigoso ? styles.menuItemPerigoso : ""
            }`}
          >
            {a.rotulo}
          </button>
        ))
      }
    </MenuFlutuante>
  );
}

/** O esqueleto com a forma do módulo, para o frame não saltar (§12.9). */
export function CorpoACarregar({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-8 animate-pulse rounded-lg bg-stone-100" />
      ))}
    </div>
  );
}

export function CorpoVazio({ texto }: { texto: string }) {
  return (
    <p className="flex h-full items-center justify-center px-2 text-center text-xs leading-relaxed text-stone-400">
      {texto}
    </p>
  );
}

/**
 * Um módulo que falhou.
 *
 * Tem de dar uma saída. Sem `onRepetir` isto era um beco: o broker guardava
 * a promessa falhada para sempre e o cartão ficava em erro até se mudar de
 * rota. A mensagem é a legível — o texto cru do Postgres vai para a consola,
 * não para dentro de um cartão do painel.
 */
export function CorpoErro({
  texto, onRepetir,
}: { texto: string; onRepetir?: () => void }) {
  return (
    <div role="status" className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center">
      <p className="text-xs leading-relaxed text-clay-text">{texto}</p>
      {onRepetir && (
        <button
          type="button"
          onClick={onRepetir}
          className="focus-marca inline-flex min-h-7 items-center rounded-lg border border-stone-200 px-2.5 text-[0.6875rem] font-semibold text-stone-600 transition-colors hover:bg-stone-100"
        >
          Tentar outra vez
        </button>
      )}
    </div>
  );
}

export type { WidgetSize };
