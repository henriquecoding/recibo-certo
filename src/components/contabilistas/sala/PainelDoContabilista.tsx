"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O LADO DO CONTABILISTA — identidade, ações e contexto
//  ---------------------------------------------------------------------
//  Três peças que respondem, por esta ordem, às três perguntas com que se
//  abre a ficha de um cliente: com quem estou a falar, o que posso fazer,
//  e onde é que isto ia.
//
//  A peça do meio é a que interessa explicar. «Ações disponíveis» lista o
//  que se pode fazer E o que não existe — «sem email · sem telemóvel · sem
//  WhatsApp». Dizer o que falta parece estranho até se perceber que é a
//  primeira pergunta de qualquer contabilista que chega: «e como é que eu
//  falo com esta pessoa?». Deixá-la sem resposta manda-a procurar o
//  contacto; respondê-la de frente fecha o assunto e explica porquê.
// ═══════════════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { Calendar, Gift, Lock, PaperClip } from "@/components/ui/Icons";

/**
 * A identidade do cliente, com o que se sabe dela.
 *
 * ⚠️ O primeiro selo diz «Vínculo confirmado» e não «Identidade
 * verificada», e a diferença não é de estilo. A plataforma não verifica a
 * identidade de ninguém neste fluxo: o cliente escolhe um nome de
 * tratamento e o contabilista aceita o pedido. O que ESTÁ confirmado é o
 * vínculo — as duas partes disseram que sim.
 *
 * Escrever «identidade verificada» sobre isto seria a plataforma a
 * garantir uma coisa que não confirmou, e é o género de frase em que
 * alguém confia para tomar uma decisão. Quando houver verificação a
 * sério — o NIF revisto que os casos já recolhem —, o selo muda de nome
 * porque passa a poder mudar.
 */
export function IdentidadeDoCliente({
  tratamento,
  vinculoConfirmado,
  desde,
}: {
  tratamento: string;
  vinculoConfirmado: boolean;
  desde: string;
}) {
  return (
    <section
      aria-labelledby="identidade-titulo"
      className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Cliente</p>

      <h1 id="identidade-titulo" className="mt-1.5 font-display text-3xl leading-tight text-ink sm:text-4xl">
        {tratamento}
      </h1>

      <div className="mt-3 flex flex-wrap gap-2">
        {vinculoConfirmado && <Badge tone="brand">Vínculo confirmado</Badge>}
        <Badge tone="danger">Contactos protegidos</Badge>
      </div>

      <p className="mt-3 text-sm text-stone-500">Cliente desde {desde}.</p>
    </section>
  );
}

/**
 * O que se pode fazer, e o que não existe.
 *
 * A segunda linha é a mais importante do painel inteiro, e por isso está
 * escrita em tom de argila e não em cinzento discreto: é a resposta a uma
 * pergunta que toda a gente faz, e uma resposta a meia-voz manda procurar
 * noutro sítio.
 */
export interface AcaoDisponivel {
  rotulo: string;
  /** Para onde leva. Sem `href`, a ação acontece nesta mesma página. */
  href?: string;
}

export function AcoesDisponiveis({ acoes }: { acoes: AcaoDisponivel[] }) {
  return (
    <section
      aria-labelledby="acoes-titulo"
      className="rounded-4xl border border-stone-200 bg-cream p-5"
    >
      <h2 id="acoes-titulo" className="font-display text-lg text-ink">
        Ações disponíveis
      </h2>

      {/* Eram texto separado por «·» — uma lista do que existe noutras
          páginas, sem caminho para lá. Cada ação que tem sítio próprio é
          agora um link; as que acontecem nesta página ficam como rótulo. */}
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {acoes.map((a) => (
          <li key={a.rotulo}>
            {a.href ? (
              <Link
                href={a.href}
                className="inline-flex min-h-[2.25rem] items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:border-brand hover:text-brand-dark"
              >
                {a.rotulo}
              </Link>
            ) : (
              <span className="inline-flex min-h-[2.25rem] items-center rounded-xl border border-stone-200 px-3 py-1.5 text-sm text-stone-600">
                {a.rotulo}
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-start gap-2 text-sm font-semibold leading-relaxed text-clay-text">
        <Lock size={14} className="mt-0.5 shrink-0" aria-hidden />
        Sem email · sem telemóvel · sem WhatsApp
      </p>
    </section>
  );
}

/**
 * Onde é que isto ia.
 *
 * Três linhas, e cada uma delas é um facto com data. Nada aqui é uma
 * métrica calculada nem uma tendência: são as três coisas que alguém
 * precisa de saber para retomar uma conversa sem reler o histórico.
 */
export function ContextoSemRuido({
  proximaConsulta,
  ultimaPartilha,
  fidelidade,
}: {
  proximaConsulta: string | null;
  ultimaPartilha: { titulo: string; quando: string } | null;
  fidelidade: { carimbos: number; meta: number } | null;
}) {
  return (
    <section aria-labelledby="contexto-titulo" className="space-y-2.5">
      <h2 id="contexto-titulo" className="font-display text-lg text-ink">
        Contexto sem ruído
      </h2>

      <Linha Icone={Calendar} rotulo="Próxima consulta">
        {proximaConsulta
          ? new Intl.DateTimeFormat("pt-PT", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            }).format(new Date(proximaConsulta)).replace(".", "")
          : "Nenhuma marcada"}
      </Linha>

      <Linha Icone={PaperClip} rotulo="Última partilha">
        {ultimaPartilha
          ? `${ultimaPartilha.titulo} · ${new Intl.DateTimeFormat("pt-PT", {
              day: "numeric", month: "short",
            }).format(new Date(ultimaPartilha.quando)).replace(".", "")}`
          : "Ainda não enviou nada"}
      </Linha>

      <Linha Icone={Gift} rotulo="Fidelidade">
        {fidelidade && fidelidade.meta > 0
          ? `${fidelidade.carimbos} de ${fidelidade.meta} · regra original preservada`
          : "Sem cartão aberto"}
      </Linha>
    </section>
  );
}

function Linha({
  Icone, rotulo, children,
}: {
  Icone: (p: { size?: number; className?: string; "aria-hidden"?: boolean }) => ReactNode;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs text-stone-500">
        <Icone size={13} className="text-stone-400" aria-hidden />
        {rotulo}
      </p>
      <p className="mt-0.5 font-semibold text-stone-800">{children}</p>
    </div>
  );
}

/**
 * A frase de fecho.
 *
 * O único bloco da aplicação com fundo de marca cheio, e é de propósito
 * que seja este: é a única afirmação que a plataforma faz sobre si própria
 * dentro da relação. Dizer «não falo por vocês» ocupa o lugar que, na
 * maioria dos produtos, é ocupado por um selo de confiança — e diz o
 * contrário do que um selo diz.
 */
export function NotaDaPlataforma() {
  return (
    <aside className="rounded-4xl bg-brand-dark p-5 text-white">
      <p className="font-semibold">A plataforma não fala por vocês.</p>
      <p className="mt-1.5 text-sm leading-relaxed text-white/80">
        Ela mantém o canal seguro, o histórico íntegro e o próximo passo claro.
      </p>
    </aside>
  );
}
