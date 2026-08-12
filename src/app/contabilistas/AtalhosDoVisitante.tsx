"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O QUE ESTA PESSOA, EM CONCRETO, PODE FAZER AQUI
//  ---------------------------------------------------------------------
//  O diretório mostrava a toda a gente exactamente a mesma coisa: uma lista
//  para escolher. Mas quem chega a esta página está num de quatro sítios
//  diferentes, e três deles não são «escolher»:
//
//   · já tem contabilista        → o que quer é marcar, enviar ou ver;
//   · tem um pedido por aceitar  → o que quer é saber se já foi aceite;
//   · é contabilista aprovado    → o que quer é o painel dele;
//   · não é nada disto           → aí sim, escolher.
//
//  Sem sessão iniciada não aparece nada: seria uma caixa vazia a ocupar o
//  lugar do que a pessoa veio procurar.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { meuVinculo, obterMinhaFicha } from "@/lib/contabilistas/dados";
import type { Contabilista, Vinculo } from "@/lib/contabilistas/tipos";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Briefcase, Calendar, LayoutGrid, PaperClip } from "@/components/ui/Icons";

export default function AtalhosDoVisitante() {
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

  // Sem sessão, sem nuvem, ou ainda a ler: o diretório fala por si.
  if (aLer || !user || !disponivel) return null;

  const cc = vinculo?.contabilista ?? null;
  const ativo = vinculo?.estado === "ativo" && cc;
  const aEsperar = (vinculo?.estado === "pendente" || vinculo?.estado === "convidado") && cc;
  const gere = ficha?.estado === "aprovado";

  if (!ativo && !aEsperar && !gere) return null;

  return (
    <div className="mt-8 space-y-3">
      {ativo && cc && (
        <section className="rounded-4xl border border-brand/25 bg-brand-light/40 p-5 sm:p-6">
          <p className="eyebrow">O teu contabilista</p>
          <h2 className="mt-1 font-display text-2xl text-ink">{cc.nome}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            Podes marcar consulta, enviar-lhe simulações e ver o teu cartão de
            fidelidade. Nada disto exige um plano pago.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/contabilistas/${cc.slug}`}>
              <Button size="sm"><Calendar size={15} aria-hidden /> Marcar consulta</Button>
            </Link>
            <Link href="/dashboard/contabilista">
              <Button size="sm" variant="secondary"><LayoutGrid size={15} aria-hidden /> A minha área</Button>
            </Link>
          </div>
        </section>
      )}

      {aEsperar && cc && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-4xl border border-stone-200 bg-white p-5 shadow-card">
          <div className="min-w-0">
            <p className="font-semibold text-stone-800">Pedido enviado a {cc.nome}</p>
            <p className="mt-0.5 text-sm text-stone-500">
              Assim que for aceite, podes marcar consulta e enviar simulações.
            </p>
          </div>
          <Badge tone="alert">À espera de resposta</Badge>
        </section>
      )}

      {gere && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-4xl border border-stone-200 bg-white p-5 shadow-card">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold text-stone-800">
              <Briefcase size={16} className="text-brand" aria-hidden />
              Tens painel de gestão
            </p>
            <p className="mt-0.5 text-sm text-stone-500">
              Agenda, clientes, partilhas recebidas e cartão de fidelidade.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/contabilista">
              <Button size="sm" variant="secondary">Abrir o painel</Button>
            </Link>
            <Link href="/contabilista/partilhas">
              <Button size="sm" variant="ghost"><PaperClip size={15} aria-hidden /> Partilhas</Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
