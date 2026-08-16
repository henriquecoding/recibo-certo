"use client";

// ═══════════════════════════════════════════════════════════════════════
//  QUEM JÁ NÃO PRECISA DE ESCOLHER
//  ---------------------------------------------------------------------
//  Substitui `AtalhosDoVisitante` sem perder nenhum dos seus estados. O
//  que muda é o peso: eram cartões grandes por cima da lista, e por isso
//  quem já tinha contabilista via primeiro um tutorial e só depois o que
//  lhe interessava. Agora é uma barra entre a procura e os resultados —
//  visível para quem precisa dela, invisível para quem não precisa (§46).
//
//  Três situações, três frases:
//   · vínculo ativo      → o nome de quem já o acompanha, e por onde ir;
//   · pedido por aceitar → o estado, que é a única coisa que falta saber;
//   · painel profissional→ a porta para o painel de gestão.
//
//  Sem sessão não aparece nada: uma caixa vazia a ocupar o lugar dos
//  resultados é pior do que caixa nenhuma.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { meuVinculo, obterMinhaFicha } from "@/lib/contabilistas/dados";
import type { Contabilista, Vinculo } from "@/lib/contabilistas/tipos";
import Badge from "@/components/ui/Badge";
import { ArrowRight, Briefcase, Clock, LayoutGrid, User } from "@/components/ui/Icons";

const BARRA =
  "flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-3xl border px-4 py-3.5 sm:px-5";

const ACAO =
  "focus-marca inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors";

export default function VisitanteContextBar() {
  const { user, carregado, disponivel } = useAuth();
  const [vinculo, setVinculo] = useState<(Vinculo & { contabilista: Contabilista | null }) | null>(null);
  const [ficha, setFicha] = useState<Contabilista | null>(null);
  const [aLer, setALer] = useState(true);

  useEffect(() => {
    if (!carregado) return;
    if (!user || !disponivel) { setALer(false); return; }

    let vivo = true;
    Promise.all([
      meuVinculo(user.id).catch(() => null),
      obterMinhaFicha(user.id).catch(() => null),
    ])
      .then(([v, f]) => { if (vivo) { setVinculo(v); setFicha(f); } })
      .finally(() => { if (vivo) setALer(false); });
    return () => { vivo = false; };
  }, [carregado, user, disponivel]);

  if (aLer || !user || !disponivel) return null;

  const cc = vinculo?.contabilista ?? null;
  const ativo = vinculo?.estado === "ativo" && cc;
  const aEsperar = (vinculo?.estado === "pendente" || vinculo?.estado === "convidado") && cc;
  const gere = ficha?.estado === "aprovado";

  if (!ativo && !aEsperar && !gere) return null;

  return (
    <div className="space-y-2.5">
      {ativo && cc && (
        <section className={`${BARRA} border-brand/25 bg-brand-light/50 dark:border-brand/30 dark:bg-brand/10`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand-dark dark:text-brand-mint">
            <User size={17} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-sm text-stone-600 dark:text-stone-300">
            <span className="block text-[0.625rem] font-semibold uppercase tracking-wider text-brand-dark dark:text-brand-mint">
              O teu contabilista
            </span>
            <span className="font-semibold text-stone-800 dark:text-stone-100">{cc.nome}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Link href={`/contabilistas/${cc.slug}`} className={`${ACAO} bg-brand text-white shadow-glow hover:bg-brand-dark`}>
              Ver perfil <ArrowRight size={14} aria-hidden />
            </Link>
            <Link href="/dashboard/contabilista" className={`${ACAO} bg-white text-stone-700 shadow-sm hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-200`}>
              <LayoutGrid size={14} aria-hidden /> A minha área
            </Link>
          </div>
        </section>
      )}

      {aEsperar && cc && (
        <section className={`${BARRA} border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-alert-bg text-alert-text">
            <Clock size={17} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-sm text-stone-600 dark:text-stone-300">
            <span className="font-semibold text-stone-800 dark:text-stone-100">
              Pedido enviado a {cc.nome}.
            </span>{" "}
            Assim que for aceite, podes marcar consulta e enviar simulações.
          </p>
          <Badge tone="alert">À espera de resposta</Badge>
        </section>
      )}

      {gere && (
        <section className={`${BARRA} border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-brand dark:bg-stone-800">
            <Briefcase size={17} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-sm text-stone-600 dark:text-stone-300">
            <span className="font-semibold text-stone-800 dark:text-stone-100">
              Tens painel profissional.
            </span>{" "}
            Agenda, clientes, partilhas recebidas e fidelidade.
          </p>
          <Link href="/contabilista" className={`${ACAO} bg-white text-stone-700 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700`}>
            Abrir o painel <ArrowRight size={14} aria-hidden />
          </Link>
        </section>
      )}
    </div>
  );
}
