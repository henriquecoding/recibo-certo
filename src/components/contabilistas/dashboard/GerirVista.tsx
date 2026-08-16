"use client";

// ═══════════════════════════════════════════════════════════════════════
//  GERIR A VISTA — criar já se podia; o resto faltava
//  ---------------------------------------------------------------------
//  O painel modular deixava criar vistas e nunca deixava desfazer isso.
//  «Vista 5» ficava para sempre no separador, com o nome que o sistema lhe
//  deu, e a única forma de a tirar de lá era não lhe tocar. As funções
//  existiam desde a migração do painel modular — `renomearVista`,
//  `definirVistaPrincipal`, `apagarVista` — e nenhuma tinha botão.
//
//  Três decisões:
//
//   · **Apagar é destrutivo e pergunta-se.** Uma vista leva os módulos que
//     tem; dizê-lo antes é a diferença entre um aviso e uma surpresa.
//   · **A última vista não se apaga.** Um painel sem vistas não é um
//     painel vazio — é um painel partido, com um ecrã de recuperação em
//     vez do trabalho de quem lá chega.
//   · **Renomear é escrever, não é um diálogo.** O nome fica editável no
//     sítio onde está, com Enter para gravar e Escape para desistir.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar } from "@/components/ui/Confirmar";
import type { WorkspaceView } from "@/lib/contabilistas/dashboard/tipos";
import { Check, Close, Pencil, Star, Trash } from "@/components/ui/Icons";
import styles from "./workspace.module.css";

/** O nome de uma vista. Curto porque vive num separador. */
const MAX_NOME = 40;

export default function GerirVista({
  vista,
  ePrincipal,
  podeApagar,
  aoMudar,
}: {
  vista: WorkspaceView;
  ePrincipal: boolean;
  /** Falso quando é a última: apagar deixaria o painel sem nada. */
  podeApagar: boolean;
  /** Recarrega as vistas. `apagada` diz qual sair do ecrã. */
  aoMudar: (opcoes?: { apagada?: string }) => void;
}) {
  const avisos = useAvisos();
  const confirmar = useConfirmar();

  const [aberto, setAberto] = useState(false);
  const [aRenomear, setARenomear] = useState(false);
  const [nome, setNome] = useState(vista.nome);
  const [ocupado, setOcupado] = useState(false);
  const caixa = useRef<HTMLDivElement | null>(null);
  const campo = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setNome(vista.nome); }, [vista.nome]);

  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (e: PointerEvent) => {
      const alvo = e.target as Node | null;
      if (alvo && !caixa.current?.contains(alvo)) setAberto(false);
    };
    const fecharEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fecharFora);
    document.addEventListener("keydown", fecharEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharFora);
      document.removeEventListener("keydown", fecharEscape);
    };
  }, [aberto]);

  useEffect(() => { if (aRenomear) campo.current?.select(); }, [aRenomear]);

  async function gravarNome() {
    const limpo = nome.trim().slice(0, MAX_NOME);
    if (!limpo || limpo === vista.nome) { setARenomear(false); setNome(vista.nome); return; }

    setOcupado(true);
    const { renomearVista } = await import("@/lib/contabilistas/fonte/dashboard");
    const { erro } = await renomearVista(vista.id, limpo);
    setOcupado(false);
    setARenomear(false);
    if (erro) { setNome(vista.nome); avisos.erro("Não foi possível mudar o nome.", { detalhe: erro }); return; }
    aoMudar();
  }

  async function tornarPrincipal() {
    setAberto(false);
    setOcupado(true);
    const { definirVistaPrincipal } = await import("@/lib/contabilistas/fonte/dashboard");
    const { erro } = await definirVistaPrincipal(vista.id);
    setOcupado(false);
    if (erro) { avisos.erro("Não foi possível definir a vista principal.", { detalhe: erro }); return; }
    avisos.sucesso(`«${vista.nome}» passa a abrir primeiro.`);
    aoMudar();
  }

  async function apagar() {
    setAberto(false);
    const quantos = vista.layout.items.length;
    const ok = await confirmar({
      titulo: `Apagar a vista «${vista.nome}»?`,
      descricao: "A vista sai do painel e não volta.",
      consequencias: [
        quantos === 1
          ? "O módulo que está nela é retirado do painel."
          : `Os ${quantos} módulos que estão nela são retirados do painel.`,
        "Os dados não se perdem: os módulos leem de clientes, agenda e casos, que ficam como estão.",
      ],
      confirmar: "Apagar vista",
    });
    if (!ok) return;

    setOcupado(true);
    const { apagarVista } = await import("@/lib/contabilistas/fonte/dashboard");
    const { erro } = await apagarVista(vista.id);
    setOcupado(false);
    if (erro) { avisos.erro("Não foi possível apagar a vista.", { detalhe: erro }); return; }
    avisos.sucesso(`Vista «${vista.nome}» apagada.`);
    aoMudar({ apagada: vista.id });
  }

  if (aRenomear) {
    return (
      <span className={styles.renomear}>
        <label htmlFor={`nome-vista-${vista.id}`} className="sr-only">
          Nome da vista
        </label>
        <input
          id={`nome-vista-${vista.id}`}
          ref={campo}
          value={nome}
          disabled={ocupado}
          onChange={(e) => setNome(e.target.value.slice(0, MAX_NOME))}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void gravarNome(); }
            if (e.key === "Escape") { e.preventDefault(); setARenomear(false); setNome(vista.nome); }
          }}
          onBlur={() => void gravarNome()}
          className={styles.campoNome}
        />
        <button
          type="button"
          onClick={() => void gravarNome()}
          className={`${styles.acaoVista} focus-marca`}
          aria-label="Guardar o nome"
        >
          <Check size={13} aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <span ref={caixa} className={styles.gerir}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        disabled={ocupado}
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label={`Gerir a vista ${vista.nome}`}
        className={`${styles.acaoVista} focus-marca`}
      >
        <span aria-hidden className={styles.tresPontos}>•••</span>
      </button>

      {aberto && (
        <div role="menu" className={styles.menuVista}>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setAberto(false); setARenomear(true); }}
            className={`${styles.itemMenu} focus-marca`}
          >
            <Pencil size={13} aria-hidden /> Mudar o nome
          </button>

          {!ePrincipal && (
            <button
              type="button"
              role="menuitem"
              onClick={() => void tornarPrincipal()}
              className={`${styles.itemMenu} focus-marca`}
            >
              <Star size={13} aria-hidden /> Abrir esta primeiro
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => void apagar()}
            disabled={!podeApagar}
            title={podeApagar ? undefined : "É a única vista do painel."}
            className={`${styles.itemMenu} ${styles.itemDestrutivo} focus-marca`}
          >
            <Trash size={13} aria-hidden /> Apagar vista
          </button>

          {!podeApagar && (
            <p className={styles.notaMenu}>
              <Close size={11} aria-hidden /> Um painel precisa de pelo menos uma vista.
            </p>
          )}
        </div>
      )}
    </span>
  );
}
