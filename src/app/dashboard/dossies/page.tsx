"use client";

// ═══════════════════════════════════════════════════════════════════════
//  DOSSIÊS QUE ENVIEI — as ligações de D3, e o poder de as cortar
//  ---------------------------------------------------------------------
//  A folha de composição promete três coisas sobre uma ligação: que expira
//  em 30 dias, que mostra quantas vezes foi aberta, e que se revoga a
//  qualquer momento. Uma promessa dessas sem um sítio onde se cumpra é
//  publicidade.
//
//  Vive à parte de «O meu contabilista» porque serve exatamente quem NÃO
//  tem contabilista na plataforma — e essa página começa por devolver
//  «ainda não tens ninguém ligado».
//
//  ⚠️ O TOKEN NÃO ESTÁ AQUI, e não pode estar: a base guarda só o hash. A
//  ligação mostra-se uma vez, no momento em que é criada. Isto é o registo
//  do que foi criado, não um cofre de endereços.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/auth";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar } from "@/components/ui/Confirmar";
import { registar } from "@/lib/analytics/cliente";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { BookOpen, Lock, Warning } from "@/components/ui/Icons";
import {
  DIAS_DE_LIGACAO, estadoDaLigacao, listarLigacoes, prorrogarLigacao, revogarLigacao,
  type LigacaoDeDossie,
} from "@/lib/guias/dossie/dados";

const data = (iso: string) =>
  new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(iso));

/** Balde de idade, para a medição. Nunca a data exata (§8.2: só baldes). */
function balde(criadoEm: string): string {
  const dias = Math.floor((Date.now() - new Date(criadoEm).getTime()) / 86_400_000);
  if (dias <= 1) return "0-1d";
  if (dias <= 7) return "2-7d";
  if (dias <= 30) return "8-30d";
  return "30d+";
}

export default function MeusDossies() {
  const { user, carregado, disponivel } = useAuth();
  const avisos = useAvisos();
  const confirmar = useConfirmar();
  const [lista, setLista] = useState<LigacaoDeDossie[]>([]);
  const [aLer, setALer] = useState(true);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!user || !disponivel) { setALer(false); return; }
    setALer(true);
    try {
      setLista(await listarLigacoes(user.id));
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setALer(false);
    }
  }, [user, disponivel]);

  useEffect(() => { if (carregado) void carregar(); }, [carregado, carregar]);

  async function revogar(l: LigacaoDeDossie) {
    const ok = await confirmar({
      titulo: "Revogar esta ligação?",
      descricao: `«${l.etiqueta ?? l.guiaSlug}» deixa de abrir no instante em que confirmares.`,
      consequencias: [
        "Quem tiver o endereço passa a ver uma página a dizer que foi revogada.",
        "O que já tiver sido copiado do outro lado não volta atrás.",
        "Podes preparar outro dossiê quando quiseres.",
      ],
      confirmar: "Revogar acesso",
      tom: "perigo",
    });
    if (!ok) return;

    setOcupado(l.id);
    const { erro: e } = await revogarLigacao(l.id);
    setOcupado(null);
    if (e) { avisos.erro(e); return; }
    registar("guide_dossier_revoked", {
      guide_id: l.guiaSlug,
      destination: "ligacao",
      age_bucket: balde(l.criadoEm),
    });
    avisos.sucesso("Ligação revogada.");
    await carregar();
  }

  async function prorrogar(l: LigacaoDeDossie) {
    setOcupado(l.id);
    const { erro: e } = await prorrogarLigacao(l.id);
    setOcupado(null);
    if (e) { avisos.erro(e); return; }
    avisos.sucesso(`Ligação válida por mais ${DIAS_DE_LIGACAO} dias.`);
    await carregar();
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">A minha conta</p>
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">Dossiês que enviei</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          As ligações que criaste para levar um guia a um contabilista que não usa a
          plataforma. Cada uma vale {DIAS_DE_LIGACAO} dias, regista as aberturas, e corta-se
          quando quiseres.
        </p>
      </header>

      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      {aLer ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-4xl bg-stone-100 dark:bg-stone-800" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card dark:border-stone-700 dark:bg-stone-900">
          <BookOpen size={26} className="mx-auto text-stone-300" aria-hidden />
          <p className="mt-3 font-display text-lg text-ink">Ainda não enviaste nenhum</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            No fim de qualquer guia há um botão para preparar o dossiê daquele caso — com a
            base legal, os elementos a reunir e o que depende da tua situação — e escolher a
            quem o levar.
          </p>
          <Link href="/guias" className="mt-5 inline-block">
            <Button variant="secondary" size="sm">Ver os guias</Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((l) => {
            const estado = estadoDaLigacao(l);
            return (
              <li
                key={l.id}
                className="rounded-4xl border border-stone-200 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800 dark:text-stone-100">
                      {l.etiqueta ?? "Sem etiqueta"}
                    </p>
                    <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                      <Link
                        href={`/guias/${l.guiaSlug}`}
                        className="underline underline-offset-2 hover:text-stone-700 dark:hover:text-stone-200"
                      >
                        {l.guiaSlug}
                      </Link>{" "}
                      · versão de {l.guiaRevisao} · criada a {data(l.criadoEm)}
                    </p>
                    <p className="texto-mini mt-1 text-stone-400">
                      {l.acessos === 0
                        ? "Ainda não foi aberta."
                        : `Aberta ${l.acessos} ${l.acessos === 1 ? "vez" : "vezes"}${
                            l.ultimoAcesso ? `, a última a ${data(l.ultimoAcesso)}` : ""
                          }.`}
                      {estado === "ativa" ? ` Expira a ${data(l.expiraEm)}.` : ""}
                    </p>
                  </div>
                  <Badge tone={estado === "ativa" ? "brand" : "neutral"}>
                    {estado === "ativa" ? "Ativa" : estado === "revogada" ? "Revogada" : "Expirada"}
                  </Badge>
                </div>

                {estado !== "revogada" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={ocupado === l.id}
                      onClick={() => void revogar(l)}
                    >
                      Revogar acesso
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={ocupado === l.id}
                      onClick={() => void prorrogar(l)}
                    >
                      Prorrogar {DIAS_DE_LIGACAO} dias
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="flex items-start gap-2.5 rounded-2xl bg-cream px-4 py-3 text-xs leading-relaxed text-stone-500 dark:bg-stone-800 dark:text-stone-400">
        <Lock size={14} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
        O endereço completo de uma ligação só é mostrado no momento em que é criada. Aqui
        fica o registo do que existe — nunca a chave que a abre.
      </p>
    </div>
  );
}
