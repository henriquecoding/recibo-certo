"use client";

/**
 * «Organizar painel» — a folha inferior do telemóvel (§11).
 *
 * O telemóvel NÃO reproduz o arrasto 2D do desktop. Uma matriz de doze
 * colunas a 360px não é uma matriz: é uma fila de cartões ilegíveis com
 * handles que não se acertam com o dedo. Aqui a lista é vertical e as
 * ações são as quatro que fazem sentido — subir, descer, tamanho, ocultar.
 *
 * A ordem que se define aqui é a de `mobile.order`, e é a que a grelha usa
 * no telemóvel. O layout de desktop não é tocado: quem organiza no
 * telemóvel não desarruma o painel do computador.
 */

import { MODULOS } from "@/lib/contabilistas/dashboard/modulos";
import type {
  WorkspaceLayoutV2, WorkspaceWidgetInstance,
} from "@/lib/contabilistas/dashboard/tipos";
import { ICONE_DO_MODULO } from "./MolduraModulo";
import { ChevronDown, ChevronUp, Close, Eye, EyeOff } from "@/components/ui/Icons";
import styles from "./organizar.module.css";

const TAMANHOS: Array<"S" | "M" | "L"> = ["S", "M", "L"];
const NOME: Record<string, string> = { S: "Pequeno", M: "Médio", L: "Grande" };

export default function OrganizarMovel({
  layout, onFechar, onAlterar,
}: {
  layout: WorkspaceLayoutV2;
  onFechar: () => void;
  onAlterar: (items: WorkspaceWidgetInstance[]) => void;
}) {
  const ordenados = [...layout.items].sort(
    (a, b) => (a.mobile?.order ?? 99) - (b.mobile?.order ?? 99),
  );

  /** Reescreve `order` de 1..n depois de qualquer troca. */
  function comOrdem(lista: WorkspaceWidgetInstance[]): WorkspaceWidgetInstance[] {
    return lista.map((item, i) => ({
      ...item,
      mobile: {
        order: i + 1,
        size: item.mobile?.size ?? "M",
        ...(item.hidden ? { hidden: true } : {}),
      },
    }));
  }

  function trocar(indice: number, delta: number) {
    const alvo = indice + delta;
    if (alvo < 0 || alvo >= ordenados.length) return;
    const lista = [...ordenados];
    [lista[indice], lista[alvo]] = [lista[alvo], lista[indice]];
    onAlterar(comOrdem(lista));
  }

  function mudarTamanho(instanceId: string) {
    onAlterar(
      comOrdem(
        ordenados.map((i) => {
          if (i.instanceId !== instanceId) return i;
          const atual = i.mobile?.size ?? "M";
          const proximo = TAMANHOS[(TAMANHOS.indexOf(atual) + 1) % TAMANHOS.length];
          return { ...i, mobile: { ...(i.mobile ?? { order: 1, size: "M" }), size: proximo } };
        }),
      ),
    );
  }

  function alternarVisivel(instanceId: string) {
    onAlterar(
      comOrdem(
        ordenados.map((i) =>
          i.instanceId === instanceId ? { ...i, hidden: !i.hidden } : i,
        ),
      ),
    );
  }

  return (
    <div className={styles.fundo} role="dialog" aria-modal="true" aria-label="Organizar painel">
      <button type="button" className={styles.veu} onClick={onFechar} aria-label="Fechar" />
      <div className={styles.folha}>
        <header className={styles.topo}>
          <h2 className={styles.titulo}>Organizar painel</h2>
          <button type="button" onClick={onFechar} className={`${styles.fechar} focus-marca`} aria-label="Fechar">
            <Close size={16} aria-hidden />
          </button>
        </header>

        <ul className={styles.lista}>
          {ordenados.map((item, i) => {
            const def = MODULOS[item.type];
            const Icone = ICONE_DO_MODULO[item.type];
            const tamanho = item.mobile?.size ?? "M";
            return (
              <li key={item.instanceId} className={styles.linha}>
                <Icone size={14} className="shrink-0 text-stone-400" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={styles.linhaTitulo}>{def.titulo}</span>
                  <span className={styles.linhaTag}>{item.tag}</span>
                </span>

                <button
                  type="button"
                  onClick={() => mudarTamanho(item.instanceId)}
                  className={`${styles.botao} focus-marca`}
                  aria-label={`Tamanho de ${def.titulo}: ${NOME[tamanho]}. Toque para mudar.`}
                >
                  {NOME[tamanho]}
                </button>
                <button
                  type="button"
                  onClick={() => alternarVisivel(item.instanceId)}
                  className={`${styles.icone} focus-marca`}
                  aria-label={item.hidden ? `Mostrar ${def.titulo}` : `Ocultar ${def.titulo}`}
                >
                  {item.hidden ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                </button>
                <button
                  type="button"
                  onClick={() => trocar(i, -1)}
                  disabled={i === 0}
                  className={`${styles.icone} focus-marca`}
                  aria-label={`Subir ${def.titulo}`}
                >
                  <ChevronUp size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => trocar(i, 1)}
                  disabled={i === ordenados.length - 1}
                  className={`${styles.icone} focus-marca`}
                  aria-label={`Descer ${def.titulo}`}
                >
                  <ChevronDown size={14} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>

        <p className={styles.nota}>
          Esta ordem vale no telemóvel. O painel do computador fica como está.
        </p>
      </div>
    </div>
  );
}
