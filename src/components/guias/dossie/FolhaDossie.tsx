"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A FOLHA DE COMPOSIÇÃO — os três passos, e os três destinos
//  ---------------------------------------------------------------------
//  Carregada por `next/dynamic({ ssr: false })` a partir de
//  `DossieDoGuia`, e dentro de um `ErrorBoundary`. Não é preciosismo: este
//  ficheiro traz a composição, os quatro formatos, a camada de dados dos
//  três destinos e a folha inteira — e a maior parte de quem abre um guia
//  nunca chega a abri-la. Pô-lo no bundle de 169 páginas para desenhar um
//  botão era o mesmo erro que `atalhos.servidor.ts` documentou.
//
//  Mobile-first, como o resto: folha inferior com `max-h-[90dvh]`, corpo
//  `min-h-0 overflow-y-auto`, `env(safe-area-inset-bottom)`, alvos ≥ 44 px,
//  foco preso enquanto está aberta e devolvido a quem o tinha ao fechar.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { useAvisos } from "@/components/ui/Avisos";
import { meuVinculo } from "@/lib/contabilistas/dados";
import type { Contabilista } from "@/lib/contabilistas/tipos";
import { TEXTO_CONSENTIMENTO } from "@/lib/contabilistas/vinculo";
import { descreverBagagem, lerBagagem } from "@/lib/contabilistas/bagagem";
import { registar } from "@/lib/analytics/cliente";
import { descarregar } from "@/lib/export/nomes";
import Button from "@/components/ui/Button";
import { ArrowRight, Check, Close, Download, Link as LinkIcon, Spinner, Warning } from "@/components/ui/Icons";
import {
  comporDossie, excluidosConfirmados, comRespostas, impressaoCurta, NOTA_MAX,
  paraCsv, paraJson, paraMarkdown, prazosParaIcs, respostasIniciais,
  type DossieDeGuia, type EstadoElemento, type IdSeccao, type ProjecaoDeGuia,
  type RespostaPergunta, type RespostasDoDossie,
} from "@/lib/guias/dossie";
import { criarLigacao, enviarAoVinculo } from "@/lib/guias/dossie/dados";
import { guardarPassagem } from "@/lib/guias/dossie/handoff";
import { PassoCaso, PassoSeccoes } from "./PassosDoDossie";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** A chave onde `ChecklistGuia` guarda o que a pessoa marcou. */
const chaveChecklist = (slug: string) => `recibocerto:guias:checklist:${slug}`;

// ═══════════════════════════════════════════════════════════════════════
//  A folha
// ═══════════════════════════════════════════════════════════════════════

type Etapa = 0 | 1 | 2;
const TITULOS: Record<Etapa, string> = {
  0: "O que segue",
  1: "O teu caso",
  2: "A quem",
};

export default function FolhaDossie({ projecao, onFechar }: { projecao: ProjecaoDeGuia; onFechar: () => void }) {
  const { user, disponivel } = useAuth();
  const avisos = useAvisos();
  const router = useRouter();
  const caixaRef = useRef<HTMLDivElement>(null);

  const [etapa, setEtapa] = useState<Etapa>(0);
  const [respostas, setRespostas] = useState<RespostasDoDossie>(() => respostasIniciais(projecao));
  const [dossie, setDossie] = useState<DossieDeGuia | null>(null);
  const [aCompor, setACompor] = useState(false);
  const [consentiu, setConsentiu] = useState(false);
  const [etiqueta, setEtiqueta] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [feito, setFeito] = useState<{ titulo: string; detalhe: string; ligacao?: string } | null>(null);
  const [cc, setCc] = useState<Contabilista | null>(null);
  const [vinculoAtivo, setVinculoAtivo] = useState(false);
  const [bagagem, setBagagem] = useState<ReturnType<typeof lerBagagem>>(null);

  // A bagagem é lida uma vez, à entrada. Não entra em nada até a pessoa a
  // ligar no passo 1 — ver a nota em `PassoSeccoes`.
  useEffect(() => { setBagagem(lerBagagem()); }, []);

  // ── O estado que a checklist do guia já conhece ──────────────────────
  //  A5: a checklist morre no dispositivo. É o sinal mais forte de
  //  intenção que o site tem — «esta pessoa marcou 3 de 4» — e nunca saía
  //  dali. Aqui entra como estado por item, e a pessoa pode corrigi-lo.
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(chaveChecklist(projecao.guia.slug));
      if (!bruto) return;
      const marcados = JSON.parse(bruto) as unknown;
      if (!Array.isArray(marcados)) return;
      const estados: Record<number, EstadoElemento> = {};
      for (let i = 0; i < projecao.elementos.length; i += 1) {
        estados[i] = marcados.includes(i) ? "tenho" : "por_reunir";
      }
      setRespostas((r) => ({ ...r, elementos: estados }));
    } catch {
      /* sem checklist guardada — tudo fica em «não sei» */
    }
  }, [projecao.guia.slug, projecao.elementos.length]);

  useEffect(() => {
    if (!user || !disponivel) return;
    let vivo = true;
    meuVinculo(user.id)
      .then((v) => {
        if (!vivo) return;
        setCc(v?.contabilista ?? null);
        setVinculoAtivo(v?.estado === "ativo");
      })
      .catch(() => undefined);
    return () => { vivo = false; };
  }, [user, disponivel]);

  // Foco e teclado — as regras de sempre.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => caixaRef.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus(), 60);
    return () => {
      clearTimeout(t);
      if (anterior && typeof anterior.focus === "function") anterior.focus();
    };
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onFechar(); return; }
      if (e.key !== "Tab" || !caixaRef.current) return;
      const focaveis = Array.from(caixaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;
      if (e.shiftKey && (atual === primeiro || !caixaRef.current.contains(atual))) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault(); primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const incluidas = useMemo(() => new Set<IdSeccao>(respostas.incluidas), [respostas.incluidas]);
  const perguntas = useMemo(
    () => comRespostas(projecao.perguntas, respostas.respostas),
    [projecao.perguntas, respostas.respostas],
  );
  const excluidos = useMemo(() => excluidosConfirmados(perguntas), [perguntas]);

  /** Compõe. A `impressao` é assíncrona, por isso isto também é. */
  const compor = useCallback(async () => {
    setACompor(true);
    try {
      const d = await comporDossie(projecao, {
        ...respostas,
        // A simulação é a única secção com valores fiscais e nasce
        // DESLIGADA. Entra apenas quando a pessoa a liga no passo 1 — e o
        // que entra já foi filtrado por `CAMPOS_PARTILHA` na origem.
        simulacao: incluidas.has("simulacao") ? bagagem : null,
      });
      setDossie(d);
      registar("guide_dossier_ready", {
        guide_id: projecao.guia.slug,
        section_count: d.seccoes.length,
        unknown_count: perguntas.filter((p) => p.resposta === "nao_sei").length,
      });
      return d;
    } finally {
      setACompor(false);
    }
  }, [projecao, respostas, incluidas, perguntas, bagagem]);

  async function avancar() {
    if (etapa === 0) { setEtapa(1); return; }
    if (etapa === 1) { await compor(); setEtapa(2); return; }
  }

  const dossieOuCompor = useCallback(async () => dossie ?? (await compor()), [dossie, compor]);

  // ── Extração local: os quatro formatos ───────────────────────────────
  async function exportar(formato: "md" | "csv" | "ics" | "json") {
    const d = await dossieOuCompor();
    const base = `recibocerto-dossie-${d.guia.slug}-${impressaoCurta(d.fixado.impressao).replace("…", "")}`;
    const conteudo =
      formato === "md" ? paraMarkdown(d)
      : formato === "csv" ? paraCsv(d)
      : formato === "ics" ? prazosParaIcs(d)
      : paraJson(d);
    const mime =
      formato === "md" ? "text/markdown;charset=utf-8"
      : formato === "csv" ? "text/csv;charset=utf-8"
      : formato === "ics" ? "text/calendar;charset=utf-8"
      : "application/json;charset=utf-8";
    descarregar(conteudo, `${base}.${formato}`, mime);
    registar("guide_dossier_extract", {
      guide_id: d.guia.slug,
      view: "dossie",
      action: "exportar",
      format: formato,
      item_count: d.seccoes.reduce((n, s) => n + s.itens.length, 0),
    });
  }

  async function copiar() {
    const d = await dossieOuCompor();
    try {
      await navigator.clipboard.writeText(paraMarkdown(d));
      avisos.sucesso("Dossiê copiado.");
      registar("guide_dossier_extract", {
        guide_id: d.guia.slug, view: "dossie", action: "copiar", format: "markdown",
        item_count: d.seccoes.reduce((n, s) => n + s.itens.length, 0),
      });
    } catch {
      avisos.erro("O browser não deixou copiar. Descarrega o ficheiro.");
    }
  }

  // ── Os três destinos ─────────────────────────────────────────────────
  async function enviarAoMeu() {
    if (!user || !cc) return;
    setAEnviar(true);
    const d = await dossieOuCompor();
    const { erro } = await enviarAoVinculo({
      contabilistaId: cc.userId, clienteId: user.id, dossie: d, nota: d.nota,
    });
    setAEnviar(false);
    if (erro) { avisos.erro(erro); return; }
    registar("guide_dossier_sent", {
      guide_id: d.guia.slug, destination: "vinculo",
      consent_version: d.consentimento.versao, section_count: d.seccoes.length,
    });
    setFeito({
      titulo: `${cc.nome.split(" ")[0]} já tem o dossiê.`,
      detalhe: "Podes revogar o acesso quando quiseres, na tua área.",
    });
  }

  async function abrirCaso() {
    const d = await dossieOuCompor();
    guardarPassagem(d);
    registar("guide_dossier_sent", {
      guide_id: d.guia.slug, destination: "caso",
      consent_version: d.consentimento.versao, section_count: d.seccoes.length,
    });
    router.push("/dashboard/casos/novo");
  }

  async function criarALigacao() {
    if (!user) return;
    setAEnviar(true);
    const d = await dossieOuCompor();
    const r = await criarLigacao({ clienteId: user.id, dossie: d, etiqueta });
    setAEnviar(false);
    if (r.erro || !r.caminho) { avisos.erro(r.erro ?? "Não foi possível criar a ligação."); return; }
    registar("guide_dossier_sent", {
      guide_id: d.guia.slug, destination: "ligacao",
      consent_version: d.consentimento.versao, section_count: d.seccoes.length,
    });
    setFeito({
      titulo: "Ligação criada.",
      detalhe: "Vale 30 dias, regista cada abertura e podes revogá-la a qualquer momento. Copia-a agora — por segurança, não a voltamos a mostrar.",
      ligacao: `${window.location.origin}${r.caminho}`,
    });
  }

  const seccoesVisiveis = projecao.seccoes;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="folha-dossie-titulo"
      // z-[8000], e não `z-50`: a folha vive numa página PÚBLICA, e a doca
      // de navegação do telemóvel (`ChromeMobile`) também é `z-50` e é
      // montada depois. Com o mesmo índice ganha quem vem por último — e o
      // rodapé da folha, que é onde está o botão de continuar, ficava por
      // baixo da barra. É a mesma camada dos outros modais do site
      // (`AuthModal`, `ComoFuncionaModal`).
      className="fixed inset-0 z-[8000] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
    >
      <div
        ref={caixaRef}
        className="flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-4xl bg-white shadow-float dark:bg-stone-900 sm:rounded-4xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 p-5 dark:border-stone-800">
          <div className="min-w-0">
            <p className="eyebrow">
              {feito ? "Feito" : `Passo ${etapa + 1} de 3 · ${TITULOS[etapa]}`}
            </p>
            <h2 id="folha-dossie-titulo" className="mt-1 font-display text-xl text-ink">
              {feito ? feito.titulo : projecao.guia.titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="inline-flex min-h-[2.25rem] min-w-[2.25rem] shrink-0 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
          >
            <Close size={18} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {feito ? (
            <div className="py-4 text-center">
              <Check size={30} className="mx-auto text-brand" aria-hidden />
              <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                {feito.detalhe}
              </p>
              {feito.ligacao && (
                <div className="mt-4 rounded-2xl border border-stone-200 bg-cream p-3 text-left dark:border-stone-700 dark:bg-stone-800">
                  <code className="block break-all text-xs text-stone-700 dark:text-stone-200">
                    {feito.ligacao}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(feito.ligacao ?? "");
                        avisos.sucesso("Ligação copiada.");
                      } catch {
                        avisos.erro("O browser não deixou copiar. Seleciona e copia à mão.");
                      }
                    }}
                  >
                    Copiar ligação
                  </Button>
                </div>
              )}
              <Link href="/dashboard/contabilista" className="mt-5 inline-block">
                <Button variant="secondary" size="sm">Ver o que já enviei</Button>
              </Link>
            </div>
          ) : etapa === 0 ? (
            <PassoSeccoes
              seccoes={seccoesVisiveis}
              incluidas={incluidas}
              alternar={(id) =>
                setRespostas((r) => ({
                  ...r,
                  incluidas: r.incluidas.includes(id)
                    ? r.incluidas.filter((x) => x !== id)
                    : [...r.incluidas, id],
                }))
              }
              simulacao={
                bagagem
                  ? { titulo: bagagem.titulo, descricao: descreverBagagem(bagagem) }
                  : null
              }
            />
          ) : etapa === 1 ? (
            <PassoCaso
              projecao={projecao}
              perguntas={perguntas}
              responder={(id, v: RespostaPergunta) =>
                setRespostas((r) => ({ ...r, respostas: { ...r.respostas, [id]: v } }))
              }
              elementos={respostas.elementos}
              marcarElemento={(i, e) =>
                setRespostas((r) => ({ ...r, elementos: { ...r.elementos, [i]: e } }))
              }
              nota={respostas.nota ?? ""}
              escreverNota={(v) => setRespostas((r) => ({ ...r, nota: v }))}
              notaMax={NOTA_MAX}
              excluidos={excluidos}
            />
          ) : (
            <Destinos
              dossie={dossie}
              temVinculo={vinculoAtivo && Boolean(cc)}
              nomeDoContabilista={cc?.nome ?? ""}
              autenticado={Boolean(user)}
              nuvemDisponivel={disponivel}
              consentiu={consentiu}
              setConsentiu={setConsentiu}
              etiqueta={etiqueta}
              setEtiqueta={setEtiqueta}
              aEnviar={aEnviar}
              enviarAoMeu={enviarAoMeu}
              abrirCaso={abrirCaso}
              criarALigacao={criarALigacao}
              exportar={exportar}
              copiar={copiar}
            />
          )}
        </div>

        {!feito && etapa < 2 && (
          <footer className="shrink-0 border-t border-stone-100 p-5 dark:border-stone-800">
            <div className="flex items-center gap-3">
              {etapa > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEtapa((e) => (e - 1) as Etapa)}
                >
                  Voltar
                </Button>
              )}
              <Button className="flex-1" onClick={avancar} disabled={aCompor}>
                {aCompor ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size={16} aria-hidden /> A compor…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Continuar <ArrowRight size={16} aria-hidden />
                  </span>
                )}
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Passo 3 · a quem
// ═══════════════════════════════════════════════════════════════════════

function Destinos(p: {
  dossie: DossieDeGuia | null;
  temVinculo: boolean;
  nomeDoContabilista: string;
  autenticado: boolean;
  nuvemDisponivel: boolean;
  consentiu: boolean;
  setConsentiu: (v: boolean) => void;
  etiqueta: string;
  setEtiqueta: (v: string) => void;
  aEnviar: boolean;
  enviarAoMeu: () => void;
  abrirCaso: () => void;
  criarALigacao: () => void;
  exportar: (f: "md" | "csv" | "ics" | "json") => void;
  copiar: () => void;
}) {
  const d = p.dossie;

  return (
    <>
      {d && (
        <div className="rounded-2xl border border-stone-200 p-3 dark:border-stone-700">
          <p className="texto-mini text-stone-400">O que ficou preparado</p>
          <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
            {d.seccoes.length} {d.seccoes.length === 1 ? "secção" : "secções"} ·{" "}
            {d.seccoes.reduce((n, s) => n + s.itens.length, 0)} itens · versão de{" "}
            {d.fixado.revistoEm}
          </p>
          <p className="texto-mini mt-1 break-all text-stone-400">
            impressão {impressaoCurta(d.fixado.impressao)}
          </p>
        </div>
      )}

      <label className="mt-4 flex items-start gap-3 rounded-2xl bg-cream p-4 dark:bg-stone-800">
        <input
          type="checkbox"
          checked={p.consentiu}
          onChange={(e) => p.setConsentiu(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
        />
        <span className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          {TEXTO_CONSENTIMENTO} Seguem só as secções que escolhi, e a autorização expira
          ao fim de 30 dias.
        </span>
      </label>

      <h3 className="mt-6 text-sm font-semibold text-stone-700 dark:text-stone-200">
        Para onde vai
      </h3>

      <ul className="mt-3 space-y-3">
        {/* D1 — o contabilista que a pessoa já tem. */}
        {p.temVinculo && (
          <li className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
            <p className="text-sm font-semibold text-ink">O meu contabilista</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Chega ao painel de {p.nomeDoContabilista} no instante em que enviares.
            </p>
            <Button
              size="sm"
              className="mt-3 w-full"
              disabled={!p.consentiu || p.aEnviar}
              onClick={p.enviarAoMeu}
            >
              {p.aEnviar ? "A enviar…" : `Enviar a ${p.nomeDoContabilista.split(" ")[0]}`}
            </Button>
          </li>
        )}

        {/* D2 — escolher na plataforma. */}
        {p.nuvemDisponivel && (
          <li className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
            <p className="text-sm font-semibold text-ink">Escolher um contabilista certificado</p>
            <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Abrimos um caso com o assunto, a área e a descrição já escritos a partir deste
              dossiê — e mudas o que quiseres antes de enviar.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 w-full"
              disabled={!p.consentiu || p.aEnviar}
              onClick={p.abrirCaso}
            >
              {p.autenticado ? "Preparar o caso" : "Entrar e preparar o caso"}
            </Button>
          </li>
        )}

        {/* D3 — o contabilista dela, que não está aqui. */}
        {p.nuvemDisponivel && p.autenticado && (
          <li className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <LinkIcon size={15} className="text-brand" aria-hidden />
              O meu contabilista, que não usa a plataforma
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              Criamos uma ligação privada que ele abre sem conta. Vale 30 dias, mostra-te
              quantas vezes foi aberta, e revoga-se num clique.
            </p>
            <label className="mt-3 block">
              <span className="texto-mini text-stone-500 dark:text-stone-400">
                Etiqueta, para te lembrares de quem é (opcional)
              </span>
              <input
                type="text"
                value={p.etiqueta}
                onChange={(e) => p.setEtiqueta(e.target.value.slice(0, 60))}
                placeholder="O meu contabilista"
                className="mt-1 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              />
            </label>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3 w-full"
              disabled={!p.consentiu || p.aEnviar}
              onClick={p.criarALigacao}
            >
              {p.aEnviar ? "A criar…" : "Criar ligação"}
            </Button>
          </li>
        )}

        {/* Sempre — levar o ficheiro. Não depende de conta nem de nuvem. */}
        <li className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Download size={15} className="text-brand" aria-hidden />
            Levar o ficheiro
          </p>
          <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Sem conta e sem plataforma nenhuma. Todos os formatos levam a versão do guia e a
            impressão do conteúdo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={p.copiar}>Copiar</Button>
            <Button size="sm" variant="secondary" onClick={() => p.exportar("md")}>Markdown</Button>
            <Button size="sm" variant="secondary" onClick={() => p.exportar("csv")}>CSV</Button>
            <Button size="sm" variant="secondary" onClick={() => p.exportar("ics")}>Prazos (.ics)</Button>
            <Button size="sm" variant="secondary" onClick={() => p.exportar("json")}>JSON</Button>
          </div>
        </li>
      </ul>

      {!p.nuvemDisponivel && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-500 dark:bg-stone-800 dark:text-stone-400">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />
          A plataforma de contabilistas não está disponível neste ambiente. O ficheiro
          continua a poder ser levado.
        </p>
      )}
    </>
  );
}
