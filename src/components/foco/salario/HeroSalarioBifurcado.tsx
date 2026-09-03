"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import HeroFoco from "@/components/foco/HeroFoco";
import LinkFocoIntencao from "@/components/foco/LinkFocoIntencao";
import { FOCO_POR_ID } from "@/components/foco/focos";
import {
  ArrowRight,
  Briefcase,
  Building,
  Check,
  FileSign,
  Lock,
  ShieldCheck,
  User,
} from "@/components/ui/Icons";
import { registar } from "@/lib/analytics/cliente";
import { contextoContratacao } from "@/lib/analytics/contratacao";
import { PASSO_CONTRATACAO } from "@/lib/foco/arco-contratacao";
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
      <>
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

      {/* ┌───────────────────────────────────────────────────────────────┐
          │ O LADO PATRONAL TINHA PALCO E NÃO TINHA PERCURSO               │
          │                                                               │
          │ Escolhido «para quem contrata», o hero mudava, o palco mudava, │
          │ o método mudava — e a partir daqui a página voltava a ser a de │
          │ quem RECEBE um salário, sem uma linha a explicar a passagem.   │
          │ Quem contrata ficava sem saber de onde vem este passo (é o     │
          │ quarto do arco do negócio), o que fazer a seguir, nem porque   │
          │ é que o resto do ecrã fala de outra pessoa.                    │
          │                                                               │
          │ Esta secção fecha as três coisas, e a última — a passagem —    │
          │ é a que não se pode remover sem o defeito voltar.              │
          └───────────────────────────────────────────────────────────────┘ */}
      <section
        id="percurso-contratacao"
        aria-labelledby="percurso-contratacao-titulo"
        className="scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <div className="eyebrow mb-3 text-brand">
              {PASSO_CONTRATACAO.etapa} · {PASSO_CONTRATACAO.rotulo}
            </div>
            <h2
              id="percurso-contratacao-titulo"
              className="text-balance font-display display-2 font-semibold text-ink"
            >
              Contratar é o quarto passo, não o primeiro.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
              Antes desta decisão há três: o que vender, a que preço, e com que estrutura. Se
              alguma delas ainda estiver em aberto, a contratação é a mais cara das formas de a
              descobrir — o posto começa a custar no primeiro dia e a comunicação da admissão tem
              de estar feita antes disso.
            </p>
          </div>

          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            <div className="rounded-4xl border border-brand bg-brand-light p-5 shadow-card dark:bg-brand/15 sm:p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white">
                <Briefcase size={18} />
              </span>
              <div className="mt-5 texto-micro font-bold uppercase tracking-[.14em] text-brand">
                Estás aqui
              </div>
              <h3 className="mt-1 font-display text-xl font-semibold text-ink">
                Planear com os teus números
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Orçamento, pacote, líquido provável e a capacidade que o posto exige — com o que
                falta confirmar separado do que já está.
              </p>
              <Link
                href={PASSO_CONTRATACAO.ferramenta}
                className="focus-marca mt-5 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-brand-dark no-underline dark:text-brand-mint"
              >
                {PASSO_CONTRATACAO.ctaPassoAtual} <ArrowRight size={13} />
              </Link>
            </div>

            <LinkFocoIntencao
              foco="empresa"
              className="focus-marca group rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
                <Building size={18} />
              </span>
              <div className="mt-5 texto-micro font-bold uppercase tracking-[.14em] text-stone-400">
                Se a estrutura ainda está em aberto
              </div>
              <h3 className="mt-1 font-display text-xl font-semibold text-ink">
                Ver o passo anterior
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                Contratar não exige sociedade, mas muda o que a estrutura tem de aguentar. O ponto
                de viragem responde a essa parte.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-transform group-hover:translate-x-1">
                Abrir <ArrowRight size={13} />
              </span>
            </LinkFocoIntencao>

            <Link
              href={PASSO_CONTRATACAO.guia}
              className="focus-marca group rounded-4xl border border-stone-100 bg-white p-5 no-underline shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
                <FileSign size={18} />
              </span>
              <div className="mt-5 texto-micro font-bold uppercase tracking-[.14em] text-stone-400">
                Depois de decidir
              </div>
              <h3 className="mt-1 font-display text-xl font-semibold text-ink">
                Contratar a primeira pessoa
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                O que se comunica, a quem, por que ordem e com que prazos — incluindo o seguro,
                que é obrigatório desde o primeiro dia.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand transition-transform group-hover:translate-x-1">
                Ler o guia <ArrowRight size={13} />
              </span>
            </Link>
          </div>

          {/* A passagem. Sem isto, o ecrã seguinte é sobre outra pessoa e
              ninguém explicou porquê. */}
          <div className="mt-4 flex flex-col gap-4 rounded-4xl border border-dashed border-stone-300 px-5 py-4 dark:border-stone-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-300">
                <User size={17} />
              </span>
              <div>
                <div className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                  Daqui para baixo, a página fala do outro lado
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                  É o recibo que a tua proposta vai gerar — e conferi-lo é a melhor forma de
                  perceber o que a pessoa recebe de facto.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => escolher("trabalhador")}
              className="focus-marca inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 no-underline hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            >
              Ver o lado de quem recebe <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </section>
      </>
    ) : null}
    </>
  );
}
