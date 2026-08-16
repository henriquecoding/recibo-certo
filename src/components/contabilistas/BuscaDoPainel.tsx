"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A BUSCA DO PAINEL — um campo no topo, uma paleta a sério por trás
//  ---------------------------------------------------------------------
//  O campo do topo é o único elemento que não muda de ecrã para ecrã, e
//  promete «clientes, casos, documentos». Por trás fazia `includes()`:
//  não perdoava um acento, não perdoava uma gralha, não ordenava por
//  relevância nenhuma e nunca dizia «não encontrei» — havia sempre
//  alguma linha a preencher a lista.
//
//  Agora corre o MESMO motor da pesquisa do site (`lib/busca/pontuar`),
//  aplicado aos registos do painel: frase exata, prefixo, subcadeia em
//  fronteira de palavra, tokens, e uma gralha perdoada a partir de cinco
//  letras. Com limiar — «sem resultados» é uma resposta possível — e com
//  ordem determinística.
//
//  O que se indexa: clientes, casos, tarefas, consultas, partilhas e os
//  destinos de navegação. Pelas MESMAS portas do resto do painel
//  (`fonte/*`), o que faz com que funcione igual na demonstração e no
//  painel real. Os dados só são pedidos quando a paleta abre pela
//  primeira vez: o topo está em todos os ecrãs, e carregar seis listas a
//  cada navegação seria pagar por algo que a maioria das visitas não usa.
//
//  Nada do que se escreve aqui é guardado. No painel, o termo de pesquisa
//  é o nome de um cliente — ver o mesmo raciocínio em `busca/recentes.ts`.
// ═══════════════════════════════════════════════════════════════════════

import { useRouter } from "next/navigation";
import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
  type ComponentType,
} from "react";
import { listarCasos } from "@/lib/contabilistas/fonte/casos";
import { listarAgendamentos, listarPartilhas, meusClientes } from "@/lib/contabilistas/fonte/dados";
import { listarTarefas } from "@/lib/contabilistas/fonte/trabalho";
import { tratamentoDoCliente } from "@/lib/contabilistas/tipos";
import {
  agruparPorTipo, pesquisarNoPainel, ROTULO_DO_TIPO, sugestoesDeEntrada,
  type RegistoDoPainel,
} from "@/lib/contabilistas/busca";
import { MIN_CARACTERES } from "@/lib/busca/pontuar";
import { Realce } from "@/components/busca/partes";
import { SuperficieModal } from "@/components/overlays/SuperficieModal";
import type { Painel } from "@/components/contabilistas/usarPainel";
import {
  Briefcase, Calendar, Close, PaperClip, Search, Target, User,
} from "@/components/ui/Icons";
import styles from "@/app/contabilista/painel.module.css";

export const PLACEHOLDER_BUSCA = "Pesquisar clientes, casos, documentos…";

interface Destino {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

const ICONE_DO_TIPO = {
  navegacao: Search,
  cliente: User,
  caso: Briefcase,
  tarefa: Target,
  consulta: Calendar,
  partilha: PaperClip,
} as const;

const DATA_CURTA = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
});

export default function BuscaDoPainel({
  painel,
  destinos,
  contabilistaId,
}: {
  painel: Painel;
  destinos: Destino[];
  /** Vazio na demonstração: a loja em memória ignora quem pergunta. */
  contabilistaId: string;
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [indice, setIndice] = useState(0);
  const [dados, setDados] = useState<RegistoDoPainel[] | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const idLista = useId();

  // ── O índice ─────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    const [clientes, casos, tarefas, consultas, partilhas] = await Promise.all([
      meusClientes(contabilistaId).catch(() => []),
      listarCasos().catch(() => []),
      listarTarefas(contabilistaId).catch(() => []),
      listarAgendamentos({ contabilistaId }).catch(() => []),
      listarPartilhas({ contabilistaId }).catch(() => []),
    ]);

    // O nome por cliente, uma vez: as consultas e as partilhas trazem o
    // id, e uma lista de «Cliente 4F2A» não se procura por nome nenhum.
    const nomePorCliente = new Map<string, string>();
    for (const v of clientes) nomePorCliente.set(v.clienteId, tratamentoDoCliente(v));

    const linhas: RegistoDoPainel[] = [];

    for (const v of clientes) {
      if (v.estado === "terminado") continue;
      const porResponder = v.estado === "pendente" || v.estado === "convidado";
      linhas.push({
        id: `cliente-${v.id}`,
        tipo: "cliente",
        titulo: tratamentoDoCliente(v),
        aliases: [v.mensagem ?? ""].filter(Boolean),
        descricao: porResponder ? "Pedido por responder" : "Acompanhamento ativo",
        href: painel.href("/contabilista/clientes"),
        // Quem está à espera de resposta vale mais do que quem já entrou.
        prioridade: porResponder ? 90 : 60,
        distintivo: porResponder ? "Por responder" : undefined,
      });
    }

    for (const c of casos) {
      const semProposta = c.estado === "encaminhado";
      linhas.push({
        id: `caso-${c.id}`,
        tipo: "caso",
        titulo: c.assunto,
        aliases: [c.referencia, c.nomeCompleto, c.nif],
        descricao: c.situacao.slice(0, 240),
        href: `${painel.href("/contabilista/casos")}?caso=${c.id}`,
        prioridade: semProposta ? 95 : c.urgencia === "urgente" ? 85 : 55,
        distintivo: semProposta ? "Sem proposta" : undefined,
      });
    }

    const hoje = new Date().toISOString().slice(0, 10);
    for (const t of tarefas) {
      if (t.estado === "entregue") continue;
      const atrasada = Boolean(t.prazo && t.prazo < hoje);
      linhas.push({
        id: `tarefa-${t.id}`,
        tipo: "tarefa",
        titulo: t.titulo,
        aliases: [t.obrigacao ?? "", ...t.etiquetas].filter(Boolean),
        descricao: t.notas ?? "",
        href: painel.href("/contabilista/trabalho"),
        prioridade: atrasada ? 92 : 50,
        distintivo: atrasada ? "Prazo passado" : undefined,
      });
    }

    for (const a of consultas) {
      if (a.estado.startsWith("cancelado")) continue;
      const porConfirmar = a.estado === "pedido";
      const quando = DATA_CURTA.format(new Date(a.inicio));
      linhas.push({
        id: `consulta-${a.id}`,
        tipo: "consulta",
        titulo: `${quando} · ${nomePorCliente.get(a.clienteId) ?? "Cliente"}`,
        aliases: [a.assunto ?? "", a.modalidade].filter(Boolean),
        descricao: a.assunto ?? `Consulta ${a.modalidade}`,
        href: painel.href("/contabilista/agenda"),
        prioridade: porConfirmar ? 88 : 45,
        distintivo: porConfirmar ? "Por confirmar" : undefined,
      });
    }

    for (const p of partilhas) {
      linhas.push({
        id: `partilha-${p.id}`,
        tipo: "partilha",
        titulo: p.titulo,
        aliases: [nomePorCliente.get(p.clienteId) ?? "", p.nota ?? ""].filter(Boolean),
        descricao: p.tipo.replace(/_/g, " "),
        href: painel.href("/contabilista/partilhas"),
        prioridade: p.estado === "enviada" ? 80 : 40,
        distintivo: p.estado === "enviada" ? "Por ver" : undefined,
      });
    }

    setDados(linhas);
  }, [contabilistaId, painel]);

  const abrir = useCallback(() => {
    setAberta(true);
    setConsulta("");
    setIndice(0);
    setDados((d) => { if (d === null) void carregar(); return d; });
  }, [carregar]);

  // ⌘K / Ctrl+K em qualquer ecrã do painel. Ignorado enquanto se escreve
  // noutro campo: o atalho não pode roubar texto a quem preenche o perfil.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      const alvo = e.target;
      const aEscrever =
        alvo instanceof HTMLInputElement ||
        alvo instanceof HTMLTextAreaElement ||
        (alvo instanceof HTMLElement && alvo.isContentEditable);
      if (aEscrever && alvo !== campo.current) return;
      e.preventDefault();
      abrir();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [abrir]);

  // ── O que se mostra ──────────────────────────────────────────────────
  const navegacao = useMemo<RegistoDoPainel[]>(
    () => destinos.map((d, i) => ({
      id: `ir-${d.href}`,
      tipo: "navegacao" as const,
      titulo: d.label,
      aliases: [],
      descricao: "",
      href: painel.href(d.href),
      // A ordem do menu é a ordem do produto; serve de desempate.
      prioridade: Math.max(0, 30 - i),
    })),
    [destinos, painel],
  );

  const iconeDeDestino = useMemo(
    () => new Map(destinos.map((d) => [painel.href(d.href), d.Icon])),
    [destinos, painel],
  );

  const termo = consulta.trim();
  const escreveuPouco = termo.length > 0 && termo.length < MIN_CARACTERES;

  const grupos = useMemo(() => {
    if (!termo || escreveuPouco) return [];
    return agruparPorTipo(pesquisarNoPainel(termo, [...navegacao, ...(dados ?? [])]));
  }, [termo, escreveuPouco, navegacao, dados]);

  /** A lista achatada, que é sobre a qual as setas andam. */
  const visiveis = useMemo(() => {
    if (!termo) {
      const espera = sugestoesDeEntrada(dados ?? []);
      return [...espera, ...navegacao];
    }
    return grupos.flatMap(([, rs]) => rs.map((r) => r.registo));
  }, [termo, grupos, dados, navegacao]);

  useEffect(() => { setIndice(0); }, [consulta]);

  const escolher = useCallback((r: RegistoDoPainel | undefined) => {
    if (!r) return;
    setAberta(false);
    router.push(r.href);
  }, [router]);

  function aoTeclarNaPaleta(e: React.KeyboardEvent) {
    const n = visiveis.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (n === 0) return;
      const proximo = e.key === "ArrowDown" ? (indice + 1) % n : (indice - 1 + n) % n;
      setIndice(proximo);
      lista.current?.querySelector(`[data-linha="${proximo}"]`)
        ?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      if (n === 0) return;
      const destino = e.key === "Home" ? 0 : n - 1;
      setIndice(destino);
      lista.current?.querySelector(`[data-linha="${destino}"]`)
        ?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter") { e.preventDefault(); escolher(visiveis[indice]); }
  }

  // As linhas são numeradas na ordem em que aparecem: é isso que faz as
  // setas andarem por grupos sem saberem que os grupos existem.
  let contador = -1;
  const proximaLinha = () => ++contador;

  return (
    <>
      {/* O gatilho. No telemóvel encolhe para o ícone: a 360px o campo
          inteiro deixava o título do ecrã sem espaço nenhum. */}
      <button
        ref={gatilho}
        type="button"
        onClick={abrir}
        className={styles.busca}
        aria-label="Pesquisar no painel"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <Search size={16} className="shrink-0 text-stone-400" aria-hidden />
        <span className={styles.buscaTexto}>{PLACEHOLDER_BUSCA}</span>
        <kbd className={styles.buscaAtalho} aria-hidden>⌘K</kbd>
      </button>

      <SuperficieModal
        aberto={aberta}
        aoFechar={() => setAberta(false)}
        rotulo="Pesquisar no painel"
        focoInicial={() => campo.current}
        focoDeRegresso={() => gatilho.current}
        className="fixed inset-0 z-[120] flex items-end justify-center px-3 pb-3 sm:items-start sm:pt-[12vh]"
      >
        <div
          className="absolute inset-0 bg-stone-950/45 backdrop-blur-sm"
          onClick={() => setAberta(false)}
          aria-hidden
        />

        <div
          onKeyDown={aoTeclarNaPaleta}
          className="relative z-10 flex max-h-[80dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lift"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex shrink-0 items-center gap-2.5 border-b border-stone-100 px-4">
            <Search size={17} className="shrink-0 text-stone-400" aria-hidden />
            <input
              ref={campo}
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder={PLACEHOLDER_BUSCA}
              aria-label="Termo de pesquisa"
              aria-controls={idLista}
              aria-autocomplete="list"
              aria-activedescendant={visiveis.length ? `${idLista}-${indice}` : undefined}
              role="combobox"
              aria-expanded
              className="min-w-0 flex-1 border-0 bg-transparent py-3.5 text-[0.9375rem] text-ink outline-none placeholder:text-stone-400"
            />
            <button
              type="button"
              onClick={() => setAberta(false)}
              className="focus-marca -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
              aria-label="Fechar pesquisa"
            >
              <Close size={16} aria-hidden />
            </button>
          </div>

          {/* O número de resultados, dito a quem não vê a lista. */}
          <p role="status" aria-live="polite" className="sr-only">
            {!termo ? "" : escreveuPouco ? "Escreve mais uma letra."
              : visiveis.length === 0 ? "Sem resultados."
              : `${visiveis.length} ${visiveis.length === 1 ? "resultado" : "resultados"}.`}
          </p>

          <ul id={idLista} ref={lista} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
            {dados === null && termo && (
              <li className="px-3 py-8 text-center text-sm text-stone-500">
                A preparar a pesquisa…
              </li>
            )}

            {escreveuPouco && (
              <li className="px-3 py-8 text-center text-sm text-stone-500">
                Escreve pelo menos {MIN_CARACTERES} letras.
              </li>
            )}

            {termo && !escreveuPouco && dados !== null && visiveis.length === 0 && (
              <li className="px-3 py-8 text-center">
                <p className="text-sm text-stone-600">
                  Sem resultados para «{termo}».
                </p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-stone-400">
                  A pesquisa cobre clientes, casos, trabalho, agenda e partilhas deste
                  painel. Documentos de um caso encontram-se pela referência ou pelo
                  assunto do caso.
                </p>
              </li>
            )}

            {/* Sem termo: o que está à espera de alguém, e depois os atalhos. */}
            {!termo && visiveis.length > 0 && (() => {
              const espera = sugestoesDeEntrada(dados ?? []);
              return (
                <>
                  {espera.length > 0 && (
                    <li>
                      <p className="px-3 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-stone-400">
                        À espera de ti
                      </p>
                      <ul>
                        {espera.map((r) => (
                          <Linha
                            key={r.id}
                            registo={r}
                            termo=""
                            posicao={proximaLinha()}
                            indice={indice}
                            idLista={idLista}
                            Icon={ICONE_DO_TIPO[r.tipo]}
                            onEntrar={setIndice}
                            onEscolher={escolher}
                          />
                        ))}
                      </ul>
                    </li>
                  )}
                  <li>
                    <p className="px-3 pb-1 pt-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-stone-400">
                      Ir para
                    </p>
                    <ul>
                      {navegacao.map((r) => (
                        <Linha
                          key={r.id}
                          registo={r}
                          termo=""
                          posicao={proximaLinha()}
                          indice={indice}
                          idLista={idLista}
                          Icon={iconeDeDestino.get(r.href) ?? Search}
                          onEntrar={setIndice}
                          onEscolher={escolher}
                        />
                      ))}
                    </ul>
                  </li>
                </>
              );
            })()}

            {termo && grupos.map(([tipo, resultados]) => (
              <li key={tipo}>
                <p className="flex items-baseline justify-between gap-2 px-3 pb-1 pt-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-stone-400">
                  {ROTULO_DO_TIPO[tipo]}
                  <span className="tabular-nums font-normal">{resultados.length}</span>
                </p>
                <ul>
                  {resultados.map((r) => (
                    <Linha
                      key={r.registo.id}
                      registo={r.registo}
                      termo={termo}
                      posicao={proximaLinha()}
                      indice={indice}
                      idLista={idLista}
                      Icon={tipo === "navegacao"
                        ? iconeDeDestino.get(r.registo.href) ?? Search
                        : ICONE_DO_TIPO[tipo]}
                      onEntrar={setIndice}
                      onEscolher={escolher}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <footer className="hidden shrink-0 items-center gap-4 border-t border-stone-100 px-4 py-2 text-[11px] text-stone-400 sm:flex">
            <span><kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> navegar</span>
            <span><kbd className="font-sans">↵</kbd> abrir</span>
            <span><kbd className="font-sans">esc</kbd> fechar</span>
          </footer>
        </div>
      </SuperficieModal>
    </>
  );
}

/** Uma linha da paleta. Numerada, para as setas saberem onde estão. */
function Linha({
  registo, termo, posicao, indice, idLista, Icon, onEntrar, onEscolher,
}: {
  registo: RegistoDoPainel;
  termo: string;
  posicao: number;
  indice: number;
  idLista: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  onEntrar: (i: number) => void;
  onEscolher: (r: RegistoDoPainel) => void;
}) {
  const ativa = posicao === indice;
  return (
    <li data-linha={posicao}>
      <button
        type="button"
        id={`${idLista}-${posicao}`}
        role="option"
        aria-selected={ativa}
        onMouseEnter={() => onEntrar(posicao)}
        onClick={() => onEscolher(registo)}
        className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
          ativa
            ? "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
            : "text-stone-700"
        }`}
      >
        <Icon size={15} className="shrink-0 opacity-70" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {termo ? <Realce texto={registo.titulo} query={termo} /> : registo.titulo}
          </span>
          {registo.descricao && (
            <span className="block truncate text-xs text-stone-400">
              {termo ? <Realce texto={registo.descricao} query={termo} /> : registo.descricao}
            </span>
          )}
        </span>
        {registo.distintivo && (
          <span className="shrink-0 rounded-lg bg-alert-bg px-2 py-0.5 text-[10px] font-bold text-alert-text">
            {registo.distintivo}
          </span>
        )}
      </button>
    </li>
  );
}
