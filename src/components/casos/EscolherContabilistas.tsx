"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ESCOLHER QUEM VÊ O CASO
//  ---------------------------------------------------------------------
//  Antes, esta decisão era da administração: alguém lia o caso — a
//  situação inteira, escrita para outra pessoa — e decidia para quem ia.
//  Isso acabou, e este ecrã é o que fica no lugar.
//
//  Quem escolhe é quem descreveu o caso. Não é só uma questão de
//  privacidade: era esquisito à partida. A pessoa que sabe o que quer é a
//  que tem o problema.
//
//  O TETO CONTINUA A SER TRÊS, e continua a ser imposto pelo gatilho da
//  migração 051. Aqui mostra-se, para que a pessoa perceba que está a
//  gastar escolhas — e diz-se porquê: mandar o mesmo caso a toda a gente
//  ocupa quinze pessoas com trabalho que quatorze vão perder.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import { Check, ExternalLink, MapPin, Search, Spinner, User } from "@/components/ui/Icons";
import {
  enviarCasoAContabilista, listarEncaminhamentos, TETO_DE_ENCAMINHAMENTOS,
} from "@/lib/contabilistas/fonte/casos";
import { listarContabilistas } from "@/lib/contabilistas/dados";
import type { Contabilista } from "@/lib/contabilistas/tipos";

export default function EscolherContabilistas({
  casoId,
  area,
  aoMudar,
}: {
  casoId: string;
  /** A área do caso, para propor primeiro quem a declara como especialidade. */
  area: string;
  aoMudar?: () => void;
}) {
  const avisos = useAvisos();
  const [lista, setLista] = useState<Contabilista[]>([]);
  const [jaTem, setJaTem] = useState<string[]>([]);
  const [procura, setProcura] = useState("");
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const [cs, es] = await Promise.all([
        listarContabilistas({ soAceitaNovos: true }),
        listarEncaminhamentos(casoId),
      ]);
      setLista(cs);
      setJaTem(es.filter((e) => e.estado !== "retirado").map((e) => e.contabilistaId));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar o diretório.");
    } finally {
      setACarregar(false);
    }
  }, [casoId]);

  useEffect(() => { void carregar(); }, [carregar]);

  /**
   * Quem declara esta área aparece primeiro. Não é um ranking nem uma
   * recomendação paga — é a mesma ordem alfabética com um critério de
   * relevância por cima, e o `routing.ts` proíbe que seja outra coisa.
   */
  const ordenada = useMemo(() => {
    const p = procura.trim().toLowerCase();
    return lista
      .filter((c) => !p
        || c.nome.toLowerCase().includes(p)
        || (c.concelho ?? "").toLowerCase().includes(p)
        || (c.distrito ?? "").toLowerCase().includes(p))
      .slice()
      .sort((a, b) => {
        const na = a.especialidades.includes(area) ? 0 : 1;
        const nb = b.especialidades.includes(area) ? 0 : 1;
        return na - nb || a.nome.localeCompare(b.nome, "pt-PT");
      });
  }, [lista, procura, area]);

  const restam = TETO_DE_ENCAMINHAMENTOS - jaTem.length;

  async function enviar(c: Contabilista) {
    setAEnviar(c.userId);
    const { erro: falhou } = await enviarCasoAContabilista(casoId, c.userId);
    setAEnviar(null);
    if (falhou) { avisos.erro(falhou); return; }
    avisos.sucesso(`O caso seguiu para ${c.nome}.`, {
      detalhe: "Vais receber aviso quando houver resposta.",
    });
    await carregar();
    aoMudar?.();
  }

  if (aCarregar) {
    return <div className="h-40 animate-pulse rounded-4xl bg-stone-100" />;
  }

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="font-display text-lg text-ink">Quem vai ver este caso</h2>
      <p className="mt-1 text-sm leading-relaxed text-stone-500">
        Escolhes tu. Podes enviá-lo a {TETO_DE_ENCAMINHAMENTOS} contabilistas no
        máximo — assim recebes mais do que uma proposta sem ocupar meia dúzia de
        pessoas com trabalho que só uma vai fazer.
      </p>

      {erro && (
        <p role="alert" className="mt-3 rounded-2xl bg-clay-bg/40 px-4 py-3 text-xs leading-relaxed text-clay-text">
          {erro}
        </p>
      )}

      <p className="mt-3 text-xs tabular-nums text-stone-500">
        {restam <= 0
          ? `Já enviaste a ${jaTem.length} — é o máximo.`
          : `${jaTem.length} de ${TETO_DE_ENCAMINHAMENTOS} enviados · ${restam} por usar`}
      </p>

      {restam > 0 && (
        <>
          <label htmlFor="procurar-contabilista" className="sr-only">
            Procurar por nome ou zona
          </label>
          <div className="relative mt-4">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              aria-hidden
            />
            <input
              id="procurar-contabilista"
              type="search"
              value={procura}
              onChange={(e) => setProcura(e.target.value)}
              placeholder="Nome, concelho ou distrito"
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
          </div>

          <ul className="mt-3 space-y-2">
            {/* Duas mensagens, como no diretório principal. «Ninguém
                corresponde a essa procura» sobre uma lista VAZIA culpava a
                pessoa por um problema que é da plataforma: sem nenhum
                contabilista a aceitar clientes, não há procura nenhuma que
                dê resultado. */}
            {ordenada.length === 0 && (
              <li className="rounded-2xl border border-stone-200 bg-cream px-4 py-6 text-center text-sm leading-relaxed text-stone-500">
                {lista.length === 0 ? (
                  <>
                    Ainda não há contabilistas a aceitar novos clientes. O diretório
                    está a crescer — o teu caso fica guardado e podes enviá-lo assim
                    que houver alguém.
                  </>
                ) : (
                  <>Ninguém corresponde a essa procura.</>
                )}
              </li>
            )}
            {ordenada.slice(0, 12).map((c) => {
              const tem = jaTem.includes(c.userId);
              return (
                <li
                  key={c.userId}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-stone-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <User size={14} className="shrink-0 text-stone-400" aria-hidden />
                      <span className="text-sm font-semibold text-stone-800">{c.nome}</span>
                      {c.especialidades.includes(area) && (
                        <span className="rounded-lg bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                          Faz esta área
                        </span>
                      )}
                    </div>
                    {(c.concelho || c.distrito) && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                        <MapPin size={12} aria-hidden />
                        {[c.concelho, c.distrito].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <Link
                      href={`/contabilistas/${c.slug}`}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-brand-dark"
                    >
                      Ver o perfil <ExternalLink size={10} aria-hidden />
                    </Link>
                  </div>

                  {tem ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-light px-2.5 py-1 text-[11px] font-semibold text-brand-dark">
                      <Check size={12} aria-hidden /> Já tem o caso
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void enviar(c)}
                      disabled={aEnviar !== null}
                    >
                      {aEnviar === c.userId
                        ? <><Spinner size={13} /> A enviar…</>
                        : "Enviar a esta pessoa"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          {ordenada.length > 12 && (
            <p className="mt-3 text-xs text-stone-400">
              A mostrar 12 de {ordenada.length}. Escreve um nome ou uma zona para
              encurtar, ou vê o{" "}
              <Link href="/contabilistas" className="underline underline-offset-2 hover:text-brand-dark">
                diretório completo
              </Link>.
            </p>
          )}
        </>
      )}
    </section>
  );
}
