"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O FIM DE UMA FERRAMENTA — e o princípio de uma conversa
//  ---------------------------------------------------------------------
//  Dezasseis ferramentas acabavam num número e num vazio. Esta secção é o
//  que vem a seguir: uma a três pessoas que trabalham com aquilo,
//  ordenadas pelo que declaram saber fazer, e a opção de levar a simulação.
//
//  ── PORQUE É QUE VIVE EM `components/diretorio/` ─────────────────────
//  Porque é uma superfície PÚBLICA, e o modo escuro do projeto tem duas
//  convenções deliberadas: o painel do contabilista deriva os neutros da
//  camada `.dark` de `globals.css`; o diretório público declara-os com
//  variantes `dark:`. As duas estão fixadas por testes que se contradizem
//  se um ficheiro cair na pasta errada — e o resultado visível seria uma
//  secção quente com cartões frios lá dentro, que é exatamente o defeito
//  das duas paletes que esses testes existem para impedir.
//
//  ── DOIS ESTADOS, E NÃO TRÊS ─────────────────────────────────────────
//  Quem já tem contabilista vê o contabilista dele, e mais nada. É a regra
//  2 do `routing.ts` — «não é uma lead: é alguém que ela escolheu» — e
//  mostrar-lhe três alternativas por baixo seria, literalmente, oferecer
//  outros profissionais a meio de uma relação que ele já tem.
//
//  ── O QUE ESTA SECÇÃO NÃO FAZ ────────────────────────────────────────
//   · **não ordena por dinheiro.** Nem patamar, nem comissão, nem
//     antiguidade. O rodapé diz isso na página, e não só num comentário.
//   · **não avalia ninguém.** O motor ordena; o cartão descreve. Não há
//     nota, não há estrelas, não há «o mais indicado para ti».
//   · **não finge correspondência.** Quando ninguém declara as áreas de que
//     a ferramenta precisa, a secção di-lo — em vez de apresentar três
//     nomes como se fossem uma resposta.
//   · **não envia nada.** Levar a simulação é guardá-la no dispositivo. O
//     envio acontece onde sempre aconteceu: na folha de consentimento do
//     perfil, com os campos exatos à vista.
//
//  ── Custo ────────────────────────────────────────────────────────────
//  Duas consultas, vinte e quatro linhas no máximo, e só quando o
//  componente é montado — o que só acontece quando a secção se aproxima do
//  ecrã (ver `ContabilistasNoFim.tsx`). Uma ferramenta não paga rede por
//  uma coisa que está mil pixels abaixo da dobra.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { meuVinculo } from "@/lib/contabilistas/dados";
import type { Contabilista } from "@/lib/contabilistas/tipos";
import { vinculoAtivo } from "@/lib/contabilistas/vinculo";
import { lerCandidatos } from "@/lib/contabilistas/afinidade/leitura";
// De `motor` e não do índice: o índice corre a asserção de integridade e
// arrasta com ela o catálogo das ferramentas, que não tem nada que fazer
// no pacote do browser.
import { emFrase } from "@/lib/contabilistas/afinidade/motor";
import type { CandidatoAfinidade, Necessidade } from "@/lib/contabilistas/afinidade/tipos";
import { descreverBagagem, lerBagagem, type Bagagem } from "@/lib/contabilistas/bagagem";
import { registar } from "@/lib/analytics/cliente";
import ContabilistaCard from "./ContabilistaCard";
import AvatarContabilista from "@/components/contabilistas/AvatarContabilista";
import { ArrowRight, Briefcase, LayoutGrid, PaperClip, ShieldCheck } from "@/components/ui/Icons";

type Estado = "a-ler" | "vinculado" | "diretorio" | "vazio";

export interface Props {
  necessidade: Necessidade;
  /** Quantos cartões no máximo. Três é o que cabe numa linha sem espremer. */
  limite?: number;
}

export default function ContabilistasParaEsteResultado({ necessidade, limite = 3 }: Props) {
  const { user, carregado, disponivel } = useAuth();

  const [estado, setEstado] = useState<Estado>("a-ler");
  const [meu, setMeu] = useState<Contabilista | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoAfinidade[]>([]);
  const [correspondentes, setCorrespondentes] = useState(0);
  const [bagagem, setBagagem] = useState<Bagagem | null>(null);
  const [levar, setLevar] = useState(true);

  // A bagagem é do dispositivo: lê-se depois da hidratação, nunca no
  // primeiro render, senão o servidor e o cliente desenhariam coisas
  // diferentes.
  useEffect(() => {
    setBagagem(lerBagagem(necessidade.origem));
  }, [necessidade.origem]);

  useEffect(() => {
    if (!carregado || !disponivel) return;
    let vivo = true;

    (async () => {
      // 1. Já tem contabilista? Então a pergunta está respondida.
      if (user) {
        const v = await meuVinculo(user.id).catch(() => null);
        if (!vivo) return;
        if (v && vinculoAtivo(v.estado) && v.contabilista) {
          setMeu(v.contabilista);
          setEstado("vinculado");
          return;
        }
      }

      // 2. Não tem: o motor ordena quem existe.
      const r = await lerCandidatos(necessidade, { limite }).catch(() => null);
      if (!vivo) return;
      if (!r || r.candidatos.length === 0) {
        setEstado("vazio");
        return;
      }
      setCandidatos(r.candidatos);
      setCorrespondentes(r.correspondentes);
      setEstado("diretorio");
    })();

    return () => { vivo = false; };
  }, [carregado, disponivel, user, necessidade, limite]);

  // Uma impressão por resolução, e nunca uma por render.
  const medido = useRef(false);
  useEffect(() => {
    if (estado === "a-ler" || medido.current) return;
    medido.current = true;
    registar("accountant_match_impression", {
      tool_id: necessidade.origem,
      state: estado,
      candidate_count: estado === "vinculado" ? 1 : candidatos.length,
      matched_count: correspondentes,
      carries_result: bagagem !== null,
    });
  }, [estado, candidatos.length, correspondentes, bagagem, necessidade.origem]);

  // Sem nuvem configurada não há plataforma, e prometer uma porta que não
  // abre é pior do que não a desenhar.
  if (!disponivel) return null;
  if (estado === "a-ler") return <Esqueleto />;

  // ── Zero candidatos ────────────────────────────────────────────────
  //  Devolvia `null`, e com ele desaparecia a ÚNICA ponte entre este
  //  resultado e o diretório real — precisamente no cenário mais provável
  //  numa plataforma a começar, com poucos contabilistas inscritos. O
  //  motor não ter encontrado ninguém para ESTA matéria não quer dizer que
  //  não haja diretório: quer dizer que a escolha é da pessoa.
  if (estado === "vazio") {
    return (
      <section
        aria-labelledby="contabilistas-do-resultado"
        className="mt-8 border-t border-stone-200 pt-6 dark:border-stone-800"
      >
        <header className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
            <Briefcase size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="eyebrow text-brand">A seguir</p>
            <h2
              id="contabilistas-do-resultado"
              className="font-display mt-0.5 text-xl text-ink dark:text-stone-100 sm:text-2xl"
            >
              Falar com um contabilista sobre isto
            </h2>
          </div>
        </header>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          Ainda não temos ninguém inscrito para esta matéria em concreto. O diretório
          está a crescer — vê quem já lá está.
        </p>
        <Link
          href="/contabilistas"
          onClick={() =>
            registar("accountant_match_click", {
              tool_id: necessidade.origem, rank: 0, carries_result: bagagem !== null,
            })
          }
          className="focus-marca mt-4 inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-xl bg-brand px-3.5 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
        >
          Ver o diretório <ArrowRight size={14} aria-hidden />
        </Link>
      </section>
    );
  }

  return (
    // ── Uma continuação do resultado, não um cartão a competir com ele ──
    //  Isto vive DENTRO da ferramenta, muitas vezes já dentro de um cartão.
    //  Um segundo cartão com borda e sombra por cima do primeiro lê-se como
    //  publicidade encaixada a meio de um cálculo. Uma linha por cima e o
    //  título a seguir dizem o que é: o passo seguinte do mesmo resultado.
    <section
      aria-labelledby="contabilistas-do-resultado"
      className="mt-8 border-t border-stone-200 pt-6 dark:border-stone-800"
    >
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
          <Briefcase size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="eyebrow text-brand">A seguir</p>
          <h2
            id="contabilistas-do-resultado"
            className="font-display mt-0.5 text-xl text-ink dark:text-stone-100 sm:text-2xl"
          >
            {estado === "vinculado"
              ? "Queres que o teu contabilista veja isto?"
              : "Falar com um contabilista sobre isto"}
          </h2>
        </div>
      </header>

      {estado === "vinculado" && meu ? (
        <BarraDoMeu contabilista={meu} bagagem={bagagem} origem={necessidade.origem} />
      ) : (
        <Diretorio
          candidatos={candidatos}
          correspondentes={correspondentes}
          necessidade={necessidade}
          bagagem={bagagem}
          levar={levar}
          aoMudarLevar={setLevar}
        />
      )}
    </section>
  );
}

// ─── Quem já tem contabilista ──────────────────────────────────────────

/**
 * Uma barra, não uma grelha.
 *
 * Quem já escolheu não precisa de escolher outra vez, e o que falta aqui é
 * uma ação e não uma lista. O envio continua a ser feito na folha de
 * consentimento — daí o botão apontar para o perfil com a bagagem, e não
 * abrir aqui um segundo caminho para partilhar dados.
 */
function BarraDoMeu({
  contabilista, bagagem, origem,
}: {
  contabilista: Contabilista; bagagem: Bagagem | null; origem: string;
}) {
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl border border-brand/25 bg-brand-light/50 px-4 py-3.5 dark:border-brand/30 dark:bg-brand/10 sm:px-5">
        <AvatarContabilista
          contabilistaId={contabilista.userId}
          nome={contabilista.nome}
          temAvatar={contabilista.linkedinLigado}
          tamanho="sm"
        />
        <p className="min-w-0 flex-1 text-sm text-stone-600 dark:text-stone-300">
          <span className="block text-[0.625rem] font-semibold uppercase tracking-wider text-brand-dark dark:text-brand-mint">
            O teu contabilista
          </span>
          <span className="font-semibold text-stone-800 dark:text-stone-100">{contabilista.nome}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/contabilistas/${contabilista.slug}${bagagem ? `?de=${encodeURIComponent(origem)}` : ""}`}
            onClick={() =>
              registar("accountant_match_click", {
                tool_id: origem, rank: 1, carries_result: bagagem !== null,
              })
            }
            className="focus-marca inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-xl bg-brand px-3.5 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float"
          >
            {bagagem ? "Levar esta simulação" : "Ver perfil"}
            <ArrowRight size={14} aria-hidden />
          </Link>
          <Link
            href="/dashboard/contabilista"
            className="focus-marca inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-200"
          >
            <LayoutGrid size={14} aria-hidden /> A minha área
          </Link>
        </div>
      </div>

      {bagagem && (
        <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <PaperClip size={13} className="mt-0.5 shrink-0" aria-hidden />
          Levas <strong className="font-semibold text-stone-700 dark:text-stone-200">{descreverBagagem(bagagem)}</strong>.
          Vês os campos exatos e confirmas antes de seguir seja o que for.
        </p>
      )}
    </div>
  );
}

// ─── Quem ainda não escolheu ───────────────────────────────────────────

function Diretorio({
  candidatos, correspondentes, necessidade, bagagem, levar, aoMudarLevar,
}: {
  candidatos: CandidatoAfinidade[];
  correspondentes: number;
  necessidade: Necessidade;
  bagagem: Bagagem | null;
  levar: boolean;
  aoMudarLevar: (v: boolean) => void;
}) {
  const areas = useMemo(
    () => necessidade.areas.slice(0, 2).map((a) => emFrase(a.area)),
    [necessidade.areas],
  );

  const sufixo = bagagem && levar ? `?de=${encodeURIComponent(necessidade.origem)}` : "";

  return (
    <>
      {/* A lista de áreas vai depois de dois pontos e separada por
          vírgulas, e não com um «e» final. Metade dos nomes do eixo já
          traz uma conjunção dentro («Trabalhadores e salários»), e
          «recibos verdes e trabalhadores e salários» faz quem lê contar
          três coisas onde estão duas. */}
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        {correspondentes > 0 ? (
          <>
            {candidatos.length === 1 ? "Este contabilista trabalha" : "Estes contabilistas trabalham"}{" "}
            {areas.length === 1 ? "na área deste cálculo" : "nas áreas deste cálculo"}:{" "}
            <strong className="font-semibold text-stone-800 dark:text-stone-100">{areas.join(", ")}</strong>.
            {" "}Ligares-te a um contabilista e enviares-lhe o que simulaste não tem custo nenhum.
          </>
        ) : (
          <>
            Ainda não há no diretório ninguém a declarar{" "}
            {areas.length === 1 ? "esta área" : "estas áreas"}: {areas.join(", ")}.
            {candidatos.length === 1 ? " Este perfil atende" : " Estes perfis atendem"} de forma geral —
            vale a pena abrir e ver o que fazem.
          </>
        )}
      </p>

      {bagagem && (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-cream px-4 py-3 dark:bg-stone-800/60">
          <input
            type="checkbox"
            checked={levar}
            onChange={(e) => aoMudarLevar(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
          />
          <span className="min-w-0 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <span className="font-semibold text-stone-800 dark:text-stone-100">
              Levar o que acabei de simular
            </span>{" "}
            <span className="text-stone-500 dark:text-stone-400">({descreverBagagem(bagagem)})</span>
            <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
              Fica só neste dispositivo. Nada segue para ninguém sem tu veres os campos e confirmares.
            </span>
          </span>
        </label>
      )}

      <ul className={`mt-4 grid grid-cols-1 gap-4 ${grelha(candidatos.length)}`}>
        {candidatos.map((c) => (
          <li key={c.cartao.userId}>
            <ContabilistaCard
              cartao={c.cartao}
              areaEmDestaque={c.areasQueExplicam[0] ?? ""}
              motivo={c.motivo}
              href={`/contabilistas/${c.cartao.slug}${sufixo}`}
              onAbrir={() =>
                registar("accountant_match_click", {
                  tool_id: necessidade.origem,
                  rank: c.posicao,
                  carries_result: Boolean(bagagem && levar),
                })
              }
            />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* A frase que torna a ordem contestável. Sem ela, uma lista
            ordenada por um motor é indistinguível de uma lista vendida. */}
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden />
          A ordem vem das áreas que cada contabilista declara e do que escreve no perfil.
          Não há lugares pagos.
        </p>
        <Link
          href={`/contabilistas${areaDoLink(necessidade)}`}
          className="focus-marca -mx-2 inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-dark dark:text-brand-mint"
        >
          Ver o diretório
          <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </>
  );
}

/** Abrir o diretório já filtrado pela área principal — não do zero. */
function areaDoLink(n: Necessidade): string {
  const principal = n.areas[0]?.area;
  return principal ? `?especialidade=${encodeURIComponent(principal)}` : "";
}

/**
 * Um cartão sozinho numa grelha de três fica com um terço da largura e o
 * ar de um erro. A grelha acompanha o que existe.
 */
function grelha(n: number): string {
  if (n <= 1) return "sm:max-w-md";
  if (n === 2) return "sm:grid-cols-2";
  return "sm:grid-cols-2 xl:grid-cols-3";
}

function Esqueleto() {
  return (
    <section
      aria-hidden="true"
      className="mt-8 animate-pulse border-t border-stone-200 pt-6 dark:border-stone-800"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-stone-100 dark:bg-stone-800" />
        <div className="h-5 w-56 rounded bg-stone-100 dark:bg-stone-800" />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-44 rounded-4xl bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    </section>
  );
}
