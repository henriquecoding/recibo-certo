"use client";

/**
 * «Adicionar módulos» — o painel lateral da referência A.
 *
 * A estrutura é a da imagem, cabeçalho a rodapé:
 *
 *   Adicionar módulos                                    ✕
 *   Arraste para o painel ou clique para adicionar.
 *   [Todos] [Clientes] [Trabalho] [Fiscal]
 *   RECOMENDADOS
 *     ⠿ [ícone] Documentos por rever   M · Lista      +
 *   TODOS OS MÓDULOS
 *     ⠿ [ícone] Agenda de hoje         M · Lista      +
 *   Dica: pode redimensionar módulos arrastando pelos cantos.
 *
 * A legenda «M · Lista» não é decoração: diz o que vai acontecer ao painel
 * ANTES de se arrastar, e é a razão de o registry ter um campo `formato`.
 *
 * Lê SÓ do registry (§6). Nenhum metadado de módulo é repetido aqui — um
 * segundo sítio a declarar títulos e tamanhos é como esta classe de bug
 * começa.
 */

import { useMemo, useState } from "react";
import { MODULOS } from "@/lib/contabilistas/dashboard/modulos";
import { legendaDaBiblioteca } from "@/lib/contabilistas/dashboard/apresentacao";
import type { WidgetCategoria } from "@/lib/contabilistas/dashboard/modulos";
import type { WidgetType } from "@/lib/contabilistas/dashboard/tipos";
import { classesDoTom } from "@/lib/contabilistas/dashboard/apresentacao";
import { ICONE_DO_MODULO } from "./MolduraModulo";
import { Close, GripVertical, Plus, Search, Sparkle } from "@/components/ui/Icons";
import styles from "./biblioteca.module.css";

/** Os filtros da imagem, nesta ordem. «Todos» é o estado inicial. */
const FILTROS: { id: "todos" | WidgetCategoria; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "clientes", rotulo: "Clientes" },
  { id: "trabalho", rotulo: "Trabalho" },
  { id: "fiscal", rotulo: "Fiscal" },
];

/**
 * Os quatro «RECOMENDADOS» são os que a referência A mostra nessa
 * secção, nessa ordem. Não é um algoritmo de recomendação — é a lista da
 * imagem, e chamar-lhe outra coisa seria fingir inteligência que não existe.
 */
const RECOMENDADOS: WidgetType[] = [
  "documentos_rever", "casos_em_risco", "comunicacoes_recentes", "resumo_por_cliente",
];

export default function BibliotecaModulos({
  jaNoPainel, onAdicionar, onFechar,
}: {
  /** Tipos já presentes na vista, para não sugerir duplicados por engano. */
  jaNoPainel: ReadonlySet<WidgetType>;
  onAdicionar: (type: WidgetType) => void;
  onFechar: () => void;
}) {
  const [filtro, setFiltro] = useState<"todos" | WidgetCategoria>("todos");
  const [procura, setProcura] = useState("");

  const todos = useMemo(() => {
    const termo = procura.trim().toLowerCase();
    return Object.values(MODULOS)
      .filter((d) => (filtro === "todos" ? true : d.categoria === filtro))
      .filter((d) =>
        !termo ||
        d.titulo.toLowerCase().includes(termo) ||
        d.descricao.toLowerCase().includes(termo),
      )
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-PT"));
  }, [filtro, procura]);

  const recomendados = RECOMENDADOS.filter(
    (t) => (filtro === "todos" || MODULOS[t].categoria === filtro) && todos.some((d) => d.type === t),
  );

  return (
    <aside className={styles.painel} aria-label="Adicionar módulos">
      <header className={styles.topo}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className={styles.titulo}>Adicionar módulos</h2>
            <p className={styles.sub}>Arraste para o painel ou clique para adicionar.</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar a biblioteca"
            className={`${styles.fechar} focus-marca`}
          >
            <Close size={15} aria-hidden />
          </button>
        </div>

        <label className={styles.procura}>
          <Search size={13} className="shrink-0 text-stone-400" aria-hidden />
          <input
            type="search"
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
            placeholder="Procurar módulo…"
            className={styles.procuraCampo}
          />
        </label>

        <div className={styles.filtros} role="group" aria-label="Filtrar por categoria">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              aria-pressed={filtro === f.id}
              className={`${styles.chip} ${filtro === f.id ? styles.chipAtivo : ""} focus-marca`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.lista}>
        {recomendados.length > 0 && (
          <>
            <p className={styles.secao}>Recomendados</p>
            {recomendados.map((t) => (
              <Entrada
                key={t}
                type={t}
                jaTem={jaNoPainel.has(t)}
                onAdicionar={onAdicionar}
              />
            ))}
          </>
        )}

        <p className={styles.secao}>Todos os módulos</p>
        {todos.map((d) => (
          <Entrada
            key={d.type}
            type={d.type}
            jaTem={jaNoPainel.has(d.type)}
            onAdicionar={onAdicionar}
          />
        ))}
        {todos.length === 0 && (
          <p className="px-1 py-3 text-xs text-stone-400">Nenhum módulo corresponde.</p>
        )}
      </div>

      <footer className={styles.dica}>
        <Sparkle size={13} className="mt-0.5 shrink-0 text-brand-dark dark:text-brand-mint" aria-hidden />
        <span>Pode redimensionar módulos arrastando pelos cantos.</span>
      </footer>
    </aside>
  );
}

function Entrada({
  type, jaTem, onAdicionar,
}: {
  type: WidgetType;
  jaTem: boolean;
  onAdicionar: (t: WidgetType) => void;
}) {
  const def = MODULOS[type];
  const Icone = ICONE_DO_MODULO[type];
  const tom = classesDoTom(type);

  return (
    <div
      className={styles.entrada}
      draggable
      onDragStart={(e) => {
        // O arrasto a partir da biblioteca usa dataTransfer: a grelha de
        // edição aceita a queda e coloca no primeiro encaixe livre.
        e.dataTransfer.setData("text/rc-modulo", type);
        e.dataTransfer.effectAllowed = "copy";
      }}
    >
      <span className={styles.entradaGrip} aria-hidden>
        <GripVertical size={13} />
      </span>
      <span className={`${styles.entradaIcone} ${tom.fundo}`}>
        <Icone size={13} className={tom.icone} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={styles.entradaTitulo}>{def.titulo}</span>
        {/* «M · Lista» — o tamanho e o formato, antes de adicionar. */}
        <span className={styles.entradaLegenda}>{legendaDaBiblioteca(type)}</span>
      </span>
      <button
        type="button"
        onClick={() => onAdicionar(type)}
        className={`${styles.entradaMais} focus-marca`}
        aria-label={`Adicionar ${def.titulo} ao painel${jaTem ? " (já tem um)" : ""}`}
        title={jaTem ? "Já tem este módulo no painel" : def.descricao}
      >
        <Plus size={14} aria-hidden />
      </button>
    </div>
  );
}
