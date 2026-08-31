"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import HeroFoco from "@/components/foco/HeroFoco";
import { FOCO_POR_ID } from "@/components/foco/focos";
import { Briefcase, Check, Lock, ShieldCheck, User } from "@/components/ui/Icons";
import { registar } from "@/lib/analytics/cliente";
import { contextoContratacao } from "@/lib/analytics/contratacao";
import PalcoSalario, { type DadosSalario } from "./PalcoSalario";
import PalcoContratacao, { type DadosContratacao } from "./PalcoContratacao";

export default function HeroSalarioBifurcado({
  dados,
  contratacao,
}: {
  dados: DadosSalario;
  contratacao: DadosContratacao;
}) {
  // O HTML estático serve o percurso do trabalhador completo. Depois da
  // hidratação, a query pode trocar para empregador sem transformar a rota
  // inteira em dinâmica nem deixar o H1 preso num fallback de Suspense.
  const [employer, setEmployer] = useState(false);
  const [queryReady, setQueryReady] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const sync = () => {
      setEmployer(new URLSearchParams(window.location.search).get("percurso") === "empregador");
      setQueryReady(true);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    if (!queryReady) return;
    registar("salary_path_impression", {
      ...contextoContratacao("salario"),
      path: employer ? "empregador" : "trabalhador",
    });
  }, [employer, queryReady]);
  const foco = FOCO_POR_ID.get("salario")!;
  const escolher = (percurso: "trabalhador" | "empregador") => {
    setEmployer(percurso === "empregador");
    registar("salary_path_selected", {
      ...contextoContratacao("salario"),
      path: percurso,
    });
    const params = new URLSearchParams(window.location.search);
    params.set("percurso", percurso);
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <>
    <HeroFoco
      foco={foco}
      ancora={employer ? "#metodo-contratacao" : "#metodo-salario"}
      rotuloAncora={employer ? "Ver o método patronal" : "Ver como se confere"}
      ferramentaHref={employer ? "/ferramentas/planeador-contratacao" : undefined}
      ctaPrimario={employer ? "Planear uma contratação" : undefined}
      tituloAlternativo="O salário, dos dois lados."
      subtituloAlternativo="Receber ou contratar: começa pela pergunta certa."
      palcoAlternativo="A decisão"
      selos={employer
        ? [
            { Icon: Lock, texto: "Nenhum cenário é guardado ao simular" },
            { Icon: ShieldCheck, texto: "Custos patronais e payroll de 2026" },
          ]
        : [
            { Icon: Lock, texto: "O teu recibo não sai do dispositivo" },
            { Icon: ShieldCheck, texto: "Tabelas de retenção de 2026" },
          ]}
    >
      <div role="radiogroup" aria-label="Escolhe o teu percurso" className="mb-4 grid gap-2 rounded-2xl border border-stone-200 bg-white/85 p-2 shadow-card backdrop-blur dark:border-stone-700 dark:bg-stone-900/85 sm:grid-cols-2 sm:p-2.5">
        <button
          type="button"
          role="radio"
          aria-checked={!employer}
          onClick={() => escolher("trabalhador")}
          className={`focus-marca flex min-h-[68px] items-center gap-3 rounded-xl px-3.5 py-3 no-underline transition sm:px-4 ${!employer ? "bg-brand text-white shadow-glow" : "text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"}`}
        >
          <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${!employer ? "bg-white/15" : "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"}`}><User size={17} /></span>
          <span className="min-w-0"><span className="block texto-micro font-bold uppercase tracking-[.12em] opacity-70">Para quem recebe</span><span className="mt-0.5 block text-sm font-bold">Simular o meu salário</span><span className={`mt-0.5 block text-xs leading-relaxed ${!employer ? "text-brand-light" : "text-stone-500 dark:text-stone-400"}`}>Quanto vou receber — e o recibo está certo?</span></span>
          {!employer ? <Check size={15} className="ml-auto flex-none" /> : null}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={employer}
          onClick={() => escolher("empregador")}
          className={`focus-marca flex min-h-[68px] items-center gap-3 rounded-xl px-3.5 py-3 no-underline transition sm:px-4 ${employer ? "bg-brand-deep text-white shadow-glow" : "text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"}`}
        >
          <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${employer ? "bg-white/15" : "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"}`}><Briefcase size={17} /></span>
          <span className="min-w-0"><span className="block texto-micro font-bold uppercase tracking-[.12em] opacity-70">Para quem contrata</span><span className="mt-0.5 block text-sm font-bold">Planear uma contratação</span><span className={`mt-0.5 block text-xs leading-relaxed ${employer ? "text-brand-light" : "text-stone-500 dark:text-stone-400"}`}>Quanto posso pagar para contratar?</span></span>
          {employer ? <Check size={15} className="ml-auto flex-none" /> : null}
        </button>
      </div>
      {employer ? <PalcoContratacao dados={contratacao} /> : <PalcoSalario dados={dados} />}
    </HeroFoco>
    {employer ? (
      <section id="metodo-contratacao" className="border-y border-brand/15 bg-brand-deep px-4 py-10 text-white sm:px-6 sm:py-14">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-mint">O método patronal</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-balance">Uma contratação tem três contas, não uma.</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Empresa", "Tudo o que o posto retira à tesouraria."],
              ["Trabalhador", "O líquido, exato ou em intervalo responsável."],
              ["Estado", "IRS retido e contribuições de ambos os lados."],
            ].map(([title, text]) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-white/[.06] p-4">
                <h3 className="text-sm font-bold text-brand-mint">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    ) : null}
    </>
  );
}
