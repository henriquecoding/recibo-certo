"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listarContabilistas } from "@/lib/contabilistas/dados";
import { DISTRITOS, ESPECIALIDADES } from "@/lib/contabilistas/catalogo";
import { eurosDeCents } from "@/lib/contabilistas/fidelidade";
import {
  obterLinkedInsPublicos,
  type LinkedInPublico,
} from "@/lib/contabilistas/linkedin";
import type { Contabilista } from "@/lib/contabilistas/tipos";
import AvatarContabilista from "@/components/contabilistas/AvatarContabilista";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import Button from "@/components/ui/Button";
import SelectMenu, { type OpcaoSelectMenu } from "@/components/ui/SelectMenu";
import {
  ArrowRight, Briefcase, Building, Gift, Globe, MapPin, Search, ShieldCheck, Warning,
} from "@/components/ui/Icons";

const OPCOES_DISTRITO: readonly OpcaoSelectMenu[] = [
  { value: "", label: "Todos os distritos" },
  ...DISTRITOS.map((d) => ({ value: d, label: d })),
];

const OPCOES_AREA: readonly OpcaoSelectMenu[] = [
  { value: "", label: "Todas as áreas" },
  ...ESPECIALIDADES.map((e) => ({ value: e, label: e })),
];

function textoModalidades(c: Contabilista): string {
  const presencial = c.modalidades.includes("presencial");
  const online = c.modalidades.includes("online");
  if (presencial && online) return "Atendimento presencial e online";
  if (online) return "Atendimento online";
  if (presencial) return "Atendimento presencial";
  return "Atendimento a combinar";
}

export default function DiretorioCliente() {
  const [lista, setLista] = useState<Contabilista[]>([]);
  const [linkedin, setLinkedin] = useState<Record<string, LinkedInPublico>>({});
  const [estado, setEstado] = useState<"a-ler" | "pronto" | "erro">("a-ler");
  const [erro, setErro] = useState("");
  const [procura, setProcura] = useState("");
  const [distrito, setDistrito] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [modalidade, setModalidade] = useState<"" | "online" | "presencial">("");
  const [comVagas, setComVagas] = useState(false);

  useEffect(() => {
    let vivo = true;

    listarContabilistas()
      .then(async (l) => {
        const perfisLinkedIn = await obterLinkedInsPublicos(l.map((c) => c.userId));
        if (!vivo) return;
        setLista(l);
        setLinkedin(perfisLinkedIn);
        setEstado("pronto");
      })
      .catch((e: Error) => {
        if (vivo) {
          // Sem Supabase configurado o diretório não existe — dizê-lo é melhor
          // do que mostrar uma lista vazia que parece «não há ninguém».
          setErro(e.message);
          setEstado("erro");
        }
      });

    return () => { vivo = false; };
  }, []);

  const filtrada = useMemo(() => {
    const p = procura.trim().toLowerCase();
    return lista.filter((c) => {
      if (distrito && c.distrito !== distrito) return false;
      if (especialidade && !c.especialidades.includes(especialidade)) return false;
      if (modalidade && !c.modalidades.includes(modalidade)) return false;
      if (comVagas && !c.aceitaNovosClientes) return false;
      if (!p) return true;
      return (
        c.nome.toLowerCase().includes(p) ||
        (c.concelho ?? "").toLowerCase().includes(p) ||
        (c.distrito ?? "").toLowerCase().includes(p) ||
        c.especialidades.some((e) => e.toLowerCase().includes(p))
      );
    });
  }, [lista, procura, distrito, especialidade, modalidade, comVagas]);

  const temFiltros = Boolean(procura || distrito || especialidade || modalidade || comVagas);

  function limparFiltros() {
    setProcura("");
    setDistrito("");
    setEspecialidade("");
    setModalidade("");
    setComVagas(false);
  }

  if (estado === "a-ler") {
    return (
      <div className="mt-8 grid gap-4 sm:grid-cols-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-4xl bg-stone-100 dark:bg-stone-900" />
        ))}
      </div>
    );
  }

  if (estado === "erro") {
    return (
      <p role="alert" className="mt-8 flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-3 text-sm text-alert-text dark:bg-yellow-950/30 dark:text-yellow-200">
        <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />
        O diretório não está disponível de momento. {erro}
      </p>
    );
  }

  return (
    <>
      <div className="mt-8 rounded-4xl border border-stone-200 bg-white/85 p-3 shadow-card backdrop-blur sm:p-4 dark:border-stone-800 dark:bg-stone-900/75">
        <div className="space-y-3">
          <label htmlFor="procura" className="sr-only">Procurar contabilista</label>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" aria-hidden />
            <input
              id="procura"
              value={procura}
              onChange={(e) => setProcura(e.target.value)}
              placeholder="Nome, concelho ou área"
              className="focus-marca min-h-[2.75rem] w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-11 pr-3.5 text-sm text-stone-800 shadow-sm placeholder:text-stone-400 focus:border-brand dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600"
            />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <SelectMenu
              id="distrito"
              value={distrito}
              options={OPCOES_DISTRITO}
              onChange={setDistrito}
              ariaLabel="Filtrar por distrito"
            />
            <SelectMenu
              id="area"
              value={especialidade}
              options={OPCOES_AREA}
              onChange={setEspecialidade}
              ariaLabel="Filtrar por área"
            />
          </div>

          {/* Quem atende online não depende do distrito — é o filtro que
              transforma «não há ninguém no meu concelho» em «há». */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {([["", "Presencial e online"], ["online", "Atende online"], ["presencial", "Atende presencial"]] as const).map(
              ([valor, texto]) => (
                <button
                  key={valor || "todas"}
                  type="button"
                  aria-pressed={modalidade === valor}
                  onClick={() => setModalidade(valor)}
                  className={`min-h-[2.25rem] rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                    modalidade === valor
                      ? "bg-brand text-white shadow-sm"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  }`}
                >
                  {texto}
                </button>
              ),
            )}
            <button
              type="button"
              aria-pressed={comVagas}
              onClick={() => setComVagas((v) => !v)}
              className={`min-h-[2.25rem] rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                comVagas
                  ? "bg-brand text-white shadow-sm"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              }`}
            >
              Só com vagas
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p role="status" className="text-sm text-stone-500 dark:text-stone-400">
          {filtrada.length === 0
            ? "Nenhum resultado."
            : `${filtrada.length} ${filtrada.length === 1 ? "contabilista" : "contabilistas"}.`}
        </p>
        {temFiltros && (
          <button
            type="button"
            onClick={limparFiltros}
            className="min-h-[2.25rem] text-sm font-medium text-brand-dark underline underline-offset-2 hover:text-brand dark:text-brand-mint"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {filtrada.length === 0 ? (
        <div className="mt-4">
          <EstadoVazio
            Icon={Briefcase}
            titulo={lista.length === 0 ? "O diretório ainda está a começar" : "Sem resultados para estes filtros"}
            descricao={
              lista.length === 0
                ? "Ainda não há contabilistas aprovados. Se és contabilista, podes ser dos primeiros."
                : "Tenta alargar a procura, ou procura quem atenda online."
            }
            acao={
              lista.length === 0 ? (
                <Link href="/contabilistas/candidatura">
                  <Button variant="secondary">Candidatar-me</Button>
                </Link>
              ) : (
                <Button variant="secondary" onClick={limparFiltros}>Limpar filtros</Button>
              )
            }
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {filtrada.map((c) => {
            const li = linkedin[c.userId];
            const ligadoAoLinkedIn = Boolean(li?.ligadoEm);
            return (
              <li key={c.userId}>
                <Link
                  href={`/contabilistas/${c.slug}`}
                  className="group relative flex h-full min-h-72 flex-col overflow-hidden rounded-4xl border border-stone-200 bg-white p-5 shadow-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lift focus-marca dark:border-stone-800 dark:bg-stone-900 dark:hover:border-brand/40"
                >
                  <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand/5 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-brand/10" />

                  <div className="relative flex items-start gap-4">
                    <AvatarContabilista
                      contabilistaId={c.userId}
                      nome={c.nome}
                      avatarUrl={li?.avatarUrl}
                      tamanho="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                          c.aceitaNovosClientes
                            ? "bg-brand-light text-brand-dark dark:bg-brand/20 dark:text-brand-mint"
                            : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                        }`}>
                          {c.aceitaNovosClientes ? "Aceita novos clientes" : "Sem vagas"}
                        </span>
                        {ligadoAoLinkedIn && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0A66C2]/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-[#0A66C2] dark:bg-[#0A66C2]/20 dark:text-blue-300">
                            <span aria-hidden className="flex h-3.5 w-3.5 items-center justify-center rounded-[3px] bg-[#0A66C2] text-[8px] font-bold leading-none text-white">in</span>
                            LinkedIn ligado
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 font-display text-2xl leading-tight text-ink transition-colors group-hover:text-brand-dark dark:text-stone-50 dark:group-hover:text-brand-mint">
                        {c.nome}
                      </h3>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                        <ShieldCheck size={14} className="shrink-0 text-brand" aria-hidden />
                        {c.occ ? `OCC n.º ${c.occ}` : "Perfil profissional aprovado"}
                      </p>

                      {(c.concelho || c.distrito) && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                          <MapPin size={14} className="shrink-0" aria-hidden />
                          {[c.concelho, c.distrito].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {c.bio ? (
                    <p className="relative mt-4 line-clamp-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{c.bio}</p>
                  ) : (
                    <p className="relative mt-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                      {textoModalidades(c)}. Abre o perfil para conhecer a disponibilidade, formas de contacto e como iniciar o acompanhamento.
                    </p>
                  )}

                  <div className="relative mt-4 flex flex-wrap gap-1.5">
                    {c.especialidades.slice(0, 3).map((e) => (
                      <span key={e} className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                        {e}
                      </span>
                    ))}
                    {c.especialidades.length > 3 && (
                      <span className="px-1 py-1 text-xs text-stone-400">+{c.especialidades.length - 3}</span>
                    )}
                    {c.especialidades.length === 0 && c.modalidades.includes("online") && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                        <Globe size={13} aria-hidden /> Online
                      </span>
                    )}
                    {c.especialidades.length === 0 && c.modalidades.includes("presencial") && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                        <Building size={13} aria-hidden /> Presencial
                      </span>
                    )}
                  </div>

                  <div className="relative mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-stone-100 pt-4 dark:border-stone-800">
                    <div className="min-w-0 text-sm">
                      {c.precoConsultaCents > 0 && (
                        <p className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                          {eurosDeCents(c.precoConsultaCents)} <span className="font-normal text-stone-400">/ consulta</span>
                        </p>
                      )}
                      {c.fidelidadeAtiva && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-brand-dark dark:text-brand-mint">
                          <Gift size={13} aria-hidden />
                          {c.fidelidadeDescontoPct}% ao fim de {c.fidelidadeMeta}
                        </p>
                      )}
                    </div>

                    <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark dark:text-brand-mint">
                      Ver perfil <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
