"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O QUADRO — quatro colunas, e nenhuma percentagem
//  ---------------------------------------------------------------------
//  A coluna que justifica o quadro é «À espera do cliente». É onde vive o
//  trabalho parado, e é exatamente o que uma lista esconde: numa lista,
//  uma tarefa bloqueada há três semanas parece igual a uma que começou
//  ontem.
//
//  No telemóvel as quatro colunas não cabem lado a lado, e pô-las a rolar
//  na horizontal esconde três quartos do quadro atrás de um gesto. Em vez
//  disso há separadores: uma coluna de cada vez, com a contagem à vista
//  para se saber o que está nas outras.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { EASE } from "@/lib/motion";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar } from "@/components/ui/Confirmar";
import DatePicker from "@/components/ui/DatePicker";
import {
  COLUNAS, ETIQUETAS_SUGERIDAS, ROTULO_URGENCIA, acrescentarPasso, alternarPasso,
  apagarTarefa, criarTarefa, listarTarefas, moverTarefa, progressoDe, urgenciaDe,
  type EstadoTarefa, type Tarefa,
} from "@/lib/contabilistas/trabalho";
import { meusClientes } from "@/lib/contabilistas/dados";
import { tratamentoDoCliente, type Vinculo } from "@/lib/contabilistas/tipos";
import Button from "@/components/ui/Button";
import {
  Calendar, Check, ChevronDown, ChevronUp, Plus, Target, Trash, User,
} from "@/components/ui/Icons";

export default function TrabalhoPage() {
  const { ficha, aCarregar } = usarFicha();
  const avisos = useAvisos();
  const confirmar = useConfirmar();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [aLer, setALer] = useState(true);
  const [coluna, setColuna] = useState<EstadoTarefa>("por_tratar");
  const [aberta, setAberta] = useState<string | null>(null);
  const [aCriar, setACriar] = useState(false);

  const carregar = useCallback(async (id: string) => {
    setALer(true);
    try {
      const [ts, vs] = await Promise.all([listarTarefas(id), meusClientes(id)]);
      setTarefas(ts); setVinculos(vs);
    } catch (e) { avisos.erro((e as Error).message); }
    finally { setALer(false); }
  }, [avisos]);

  useEffect(() => { if (ficha) void carregar(ficha.userId); }, [ficha, carregar]);

  const porColuna = useMemo(() => {
    const mapa = new Map<EstadoTarefa, Tarefa[]>();
    for (const c of COLUNAS) mapa.set(c.id, []);
    for (const t of tarefas) mapa.get(t.estado)?.push(t);
    return mapa;
  }, [tarefas]);

  const nomeDoCliente = useCallback((vinculoId: string | null) => {
    if (!vinculoId) return null;
    const v = vinculos.find((x) => x.id === vinculoId);
    return v ? tratamentoDoCliente(v) : null;
  }, [vinculos]);

  async function mover(t: Tarefa, estado: EstadoTarefa) {
    setTarefas((a) => a.map((x) => (x.id === t.id ? { ...x, estado } : x)));
    const { erro } = await moverTarefa(t.id, estado);
    if (erro) { avisos.erro(erro); if (ficha) await carregar(ficha.userId); return; }
    if (estado === "entregue") avisos.sucesso("Entregue.");
  }

  async function apagar(t: Tarefa) {
    const ok = await confirmar({
      titulo: "Apagar esta tarefa?",
      descricao: `«${t.titulo}» desaparece do quadro, com os passos que tiver.`,
      confirmar: "Apagar",
      tom: "perigo",
    });
    if (!ok) return;
    const { erro } = await apagarTarefa(t.id);
    if (erro) { avisos.erro(erro); return; }
    setTarefas((a) => a.filter((x) => x.id !== t.id));
    avisos.sucesso("Tarefa apagada.");
  }

  if (aCarregar || aLer) return <EsqueletoPainel />;
  if (!ficha) return null;

  const atrasadas = tarefas.filter(
    (t) => t.estado !== "entregue" && urgenciaDe(t.prazo) === "atrasado"
  ).length;

  return (
    <div className="space-y-6">
      <CabecalhoPainel
        titulo="Trabalho"
        descricao={
          atrasadas > 0
            ? `${atrasadas} ${atrasadas === 1 ? "tarefa passou do prazo" : "tarefas passaram do prazo"}.`
            : "O que está por fazer, o que está parado à espera de alguém, e o que já saiu."
        }
        acao={
          <Button size="sm" onClick={() => setACriar((a) => !a)}>
            <Plus size={15} aria-hidden /> Tarefa
          </Button>
        }
      />

      <AnimatePresence>
        {aCriar && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <NovaTarefa
              vinculos={vinculos}
              onCriar={async (dados) => {
                const { erro } = await criarTarefa({ contabilistaId: ficha.userId, ...dados });
                if (erro) { avisos.erro(erro); return; }
                avisos.sucesso("Tarefa criada.");
                setACriar(false);
                await carregar(ficha.userId);
              }}
              onFechar={() => setACriar(false)}
            />
          </m.div>
        )}
      </AnimatePresence>

      {/* Telemóvel: separadores. Uma coluna de cada vez, com as contagens
          das outras à vista. */}
      <div role="tablist" aria-label="Colunas do quadro" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:hidden">
        {COLUNAS.map((c) => {
          const n = porColuna.get(c.id)?.length ?? 0;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={coluna === c.id}
              onClick={() => setColuna(c.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors ${
                coluna === c.id ? "bg-brand text-white" : "bg-white text-stone-600 hover:bg-stone-100"
              }`}
            >
              {c.rotulo}
              <span className={`tabular-nums ${coluna === c.id ? "text-white/70" : "text-stone-400"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="lg:hidden">
        <Coluna
          coluna={COLUNAS.find((c) => c.id === coluna)!}
          tarefas={porColuna.get(coluna) ?? []}
          aberta={aberta}
          onAbrir={setAberta}
          onMover={mover}
          onApagar={apagar}
          nomeDoCliente={nomeDoCliente}
          onRecarregar={() => carregar(ficha.userId)}
        />
      </div>

      {/* Ecrã grande: as quatro lado a lado. */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-4">
        {COLUNAS.map((c) => (
          <Coluna
            key={c.id}
            coluna={c}
            tarefas={porColuna.get(c.id) ?? []}
            aberta={aberta}
            onAbrir={setAberta}
            onMover={mover}
            onApagar={apagar}
            nomeDoCliente={nomeDoCliente}
            onRecarregar={() => carregar(ficha.userId)}
          />
        ))}
      </div>
    </div>
  );
}

function Coluna({
  coluna, tarefas, aberta, onAbrir, onMover, onApagar, nomeDoCliente, onRecarregar,
}: {
  coluna: (typeof COLUNAS)[number];
  tarefas: Tarefa[];
  aberta: string | null;
  onAbrir: (id: string | null) => void;
  onMover: (t: Tarefa, e: EstadoTarefa) => void;
  onApagar: (t: Tarefa) => void;
  nomeDoCliente: (v: string | null) => string | null;
  onRecarregar: () => void;
}) {
  return (
    <section aria-labelledby={`col-${coluna.id}`} className="flex flex-col">
      <header className="hidden items-baseline justify-between gap-2 pb-3 lg:flex">
        <h2 id={`col-${coluna.id}`} className="text-sm font-bold text-stone-700">{coluna.rotulo}</h2>
        <span className="text-sm tabular-nums text-stone-400">{tarefas.length}</span>
      </header>

      {tarefas.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-stone-200 px-4 py-8 text-center">
          <p className="text-sm text-stone-400">{coluna.ajuda}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {tarefas.map((t) => (
            <CartaoTarefa
              key={t.id}
              tarefa={t}
              expandida={aberta === t.id}
              onAbrir={() => onAbrir(aberta === t.id ? null : t.id)}
              onMover={onMover}
              onApagar={onApagar}
              cliente={nomeDoCliente(t.vinculoId)}
              onRecarregar={onRecarregar}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CartaoTarefa({
  tarefa, expandida, onAbrir, onMover, onApagar, cliente, onRecarregar,
}: {
  tarefa: Tarefa;
  expandida: boolean;
  onAbrir: () => void;
  onMover: (t: Tarefa, e: EstadoTarefa) => void;
  onApagar: (t: Tarefa) => void;
  cliente: string | null;
  onRecarregar: () => void;
}) {
  const [passoNovo, setPassoNovo] = useState("");
  const progresso = progressoDe(tarefa);
  const urgencia = tarefa.estado === "entregue" ? "sem_prazo" : urgenciaDe(tarefa.prazo);
  const aperta = urgencia === "atrasado" || urgencia === "hoje" || urgencia === "amanha";

  return (
    <li className={`rounded-2xl border bg-white shadow-card ${aperta ? "border-clay-text/30" : "border-stone-200"}`}>
      <button type="button" onClick={onAbrir} aria-expanded={expandida} className="w-full p-4 text-left">
        <span className="flex items-start justify-between gap-2">
          <span className={`text-sm font-semibold ${tarefa.estado === "entregue" ? "text-stone-400 line-through" : "text-stone-800"}`}>
            {tarefa.titulo}
          </span>
          {expandida
            ? <ChevronUp size={16} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
            : <ChevronDown size={16} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />}
        </span>

        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          {cliente && (
            <span className="flex items-center gap-1 text-stone-500">
              <User size={12} aria-hidden /> {cliente}
            </span>
          )}
          {tarefa.prazo && (
            <span className={`flex items-center gap-1 ${aperta ? "font-semibold text-clay-text" : "text-stone-500"}`}>
              <Calendar size={12} aria-hidden />
              {ROTULO_URGENCIA[urgencia] || dataCurta(tarefa.prazo)}
            </span>
          )}
          {/* «3 de 5 passos», nunca «60%». */}
          {progresso.rotulo && (
            <span className="flex items-center gap-1 text-stone-500">
              <Target size={12} aria-hidden /> {progresso.rotulo}
            </span>
          )}
        </span>

        {tarefa.etiquetas.length > 0 && (
          <span className="mt-2 flex flex-wrap gap-1">
            {tarefa.etiquetas.map((e) => (
              <span key={e} className="rounded-lg bg-stone-100 px-2 py-0.5 text-[0.6875rem] font-medium text-stone-600">
                {e}
              </span>
            ))}
          </span>
        )}
      </button>

      {expandida && (
        <div className="space-y-3 border-t border-stone-100 p-4">
          {tarefa.notas && (
            <p className="whitespace-pre-wrap rounded-xl bg-cream px-3 py-2 text-sm leading-relaxed text-stone-700">
              {tarefa.notas}
            </p>
          )}

          {tarefa.passos.length > 0 && (
            <ul className="space-y-1.5">
              {tarefa.passos.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={p.feito}
                      onChange={async (e) => { await alternarPasso(p.id, e.target.checked); onRecarregar(); }}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
                    />
                    <span className={p.feito ? "text-stone-400 line-through" : "text-stone-700"}>{p.texto}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!passoNovo.trim()) return;
              await acrescentarPasso(tarefa.id, passoNovo, tarefa.passos.length + 1);
              setPassoNovo(""); onRecarregar();
            }}
            className="flex gap-2"
          >
            <label className="sr-only" htmlFor={`passo-${tarefa.id}`}>Passo novo</label>
            <input
              id={`passo-${tarefa.id}`}
              value={passoNovo}
              onChange={(e) => setPassoNovo(e.target.value.slice(0, 200))}
              placeholder="Passo novo"
              className="min-h-[2.25rem] min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={!passoNovo.trim()}>
              <Plus size={14} aria-hidden />
              <span className="sr-only">Acrescentar passo</span>
            </Button>
          </form>

          <div className="flex flex-wrap gap-1.5 border-t border-stone-100 pt-3">
            {COLUNAS.filter((c) => c.id !== tarefa.estado).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onMover(tarefa, c.id)}
                className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-800"
              >
                {c.id === "entregue" ? <><Check size={12} className="mr-1 inline" aria-hidden />Entregue</> : `→ ${c.rotulo}`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onApagar(tarefa)}
              aria-label={`Apagar «${tarefa.titulo}»`}
              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-clay-text"
            >
              <Trash size={14} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function NovaTarefa({
  vinculos, onCriar, onFechar,
}: {
  vinculos: Vinculo[];
  onCriar: (d: { titulo: string; vinculoId?: string | null; prazo?: string | null; etiquetas?: string[]; notas?: string }) => void;
  onFechar: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [vinculoId, setVinculoId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [notas, setNotas] = useState("");

  const vivos = vinculos.filter((v) => v.estado === "ativo" || v.estado === "pausado");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (titulo.trim().length < 2) return;
        onCriar({ titulo, vinculoId: vinculoId || null, prazo: prazo || null, etiquetas, notas });
      }}
      className="space-y-3.5 rounded-4xl border border-stone-200 bg-white p-5 shadow-card"
    >
      <label className="block">
        <span className="text-sm font-semibold text-stone-700">O que é preciso fazer</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value.slice(0, 200))}
          placeholder="Entregar o IVA do 3.º trimestre"
          autoFocus
          className="mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-stone-700">Para quem <span className="font-normal text-stone-400">(opcional)</span></span>
          <select
            value={vinculoId}
            onChange={(e) => setVinculoId(e.target.value)}
            className="mt-2 min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">Sem cliente</option>
            {vivos.map((v) => (
              <option key={v.id} value={v.id}>{tratamentoDoCliente(v)}</option>
            ))}
          </select>
        </label>

        <div className="block">
          <label htmlFor="prazo-tarefa" className="text-sm font-semibold text-stone-700">
            Prazo <span className="font-normal text-stone-400">(opcional)</span>
          </label>
          <DatePicker
            id="prazo-tarefa"
            value={prazo}
            onChange={setPrazo}
            ariaLabel="Prazo da tarefa"
            placeholder="dd/mm/aaaa"
            className="mt-2"
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-stone-700">Etiquetas</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ETIQUETAS_SUGERIDAS.map((e) => {
            const ativa = etiquetas.includes(e);
            return (
              <button
                key={e}
                type="button"
                aria-pressed={ativa}
                onClick={() => setEtiquetas((a) => (ativa ? a.filter((x) => x !== e) : [...a, e]))}
                className={`min-h-[2rem] rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  ativa ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-semibold text-stone-700">Notas <span className="font-normal text-stone-400">(opcional)</span></span>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value.slice(0, 2000))}
          rows={2}
          className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={titulo.trim().length < 2}>Criar tarefa</Button>
        <Button type="button" variant="ghost" onClick={onFechar}>Cancelar</Button>
      </div>
    </form>
  );
}

function dataCurta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short" })
    .format(new Date(Date.UTC(a, m - 1, d)));
}
