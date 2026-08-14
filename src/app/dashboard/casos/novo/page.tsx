"use client";

// ═══════════════════════════════════════════════════════════════════════
//  DESCREVER O CASO
//  ---------------------------------------------------------------------
//  O ecrã que substitui «escolher um contabilista». Em vez de olhar para
//  uma lista de pessoas e adivinhar qual serve, a pessoa diz o que precisa
//  — e nós encaminhamos.
//
//  Três decisões de desenho que não são cosméticas:
//
//   · Um passo de cada vez. O formulário tem nove campos; nove campos numa
//     página são uma parede, e a maior parte das desistências acontece
//     antes do primeiro. Assim são três perguntas curtas.
//   · O que segue e o que não segue é dito ANTES de se escrever, e não
//     numa nota de rodapé. Quem escreve o telefone tem de saber que ele
//     não chega ao contabilista.
//   · O NIF é validado aqui e no servidor. Aqui para responder já; no
//     servidor porque é lá que a garantia mora.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/supabase/auth";
import { useAvisos } from "@/components/ui/Avisos";
import Button from "@/components/ui/Button";
import InfoTip from "@/components/ui/InfoTip";
import {
  ArrowLeft, ArrowRight, Check, Lock, Spinner, ShieldCheck, Warning,
} from "@/components/ui/Icons";
import {
  AREAS, URGENCIAS, SITUACAO_MIN, SITUACAO_MAX, TETO_DE_ENCAMINHAMENTOS,
  nifValido, submeterCaso, type AreaDoCaso, type UrgenciaDoCaso,
} from "@/lib/contabilistas/casos";

const PASSOS = ["O que precisas", "Descreve a situação", "Quem és"] as const;

export default function DescreverCaso() {
  const { user, carregado } = useAuth();
  const router = useRouter();
  const avisos = useAvisos();

  const [passo, setPasso] = useState(0);
  const [area, setArea] = useState<AreaDoCaso | null>(null);
  const [urgencia, setUrgencia] = useState<UrgenciaDoCaso>("normal");
  const [assunto, setAssunto] = useState("");
  const [situacao, setSituacao] = useState("");
  const [orcamento, setOrcamento] = useState("");
  const [nome, setNome] = useState("");
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [telefone, setTelefone] = useState("");
  const [aEnviar, setAEnviar] = useState(false);

  const nifOk = useMemo(() => nif.length === 0 || nifValido(nif), [nif]);

  const podeAvancar =
    passo === 0 ? area !== null
    : passo === 1 ? assunto.trim().length >= 3 && situacao.trim().length >= SITUACAO_MIN
    : nome.trim().length >= 2 && nifValido(nif) && /\S+@\S+\.\S+/.test(email);

  async function enviar() {
    if (!area) return;
    setAEnviar(true);
    const r = await submeterCaso({
      assunto, situacao, area, urgencia, nome, nif, email,
      telefone: telefone || undefined,
      orcamentoCents: orcamento ? Math.round(Number(orcamento.replace(",", ".")) * 100) : null,
    });
    setAEnviar(false);
    if (r.erro) { avisos.erro(r.erro); return; }
    avisos.sucesso(`Caso ${r.referencia} recebido.`, {
      detalhe: "Vamos ler o que escreveste e encaminhar para quem o pode resolver.",
      duracaoMs: 9000,
    });
    router.push("/dashboard/casos");
  }

  if (!carregado) return <div className="h-64 animate-pulse rounded-4xl bg-stone-100" />;
  if (!user) {
    return (
      <div className="rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card">
        <Lock size={26} className="mx-auto text-stone-300" aria-hidden />
        <p className="mt-3 font-display text-lg text-ink">Entra na tua conta</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500">
          Precisas de conta para descreveres um caso — é por ela que acompanhas as respostas.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/casos"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-800"
      >
        <ArrowLeft size={14} aria-hidden /> Os meus casos
      </Link>

      <h1 className="mt-4 font-display text-3xl leading-tight text-ink sm:text-4xl">
        Descreve o teu caso
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">
        Não precisas de escolher ninguém. Diz o que precisas e encaminhamos para até{" "}
        {TETO_DE_ENCAMINHAMENTOS} contabilistas certificados — se houver mais do que uma
        proposta, escolhes.
      </p>

      {/* ⚠️ Dito antes de se escrever, e não numa nota de rodapé. */}
      <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-brand-light px-4 py-3 text-xs leading-relaxed text-brand-dark">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          O contabilista recebe o teu <strong>nome e NIF</strong> — precisa deles para trabalhar.
          Não recebe o teu <strong>email, telefone nem morada</strong>: a conversa acontece toda
          aqui dentro. E tudo o que for escrito passa por nós antes de seguir — não é um canal
          privado, e não queremos que penses que é.
        </span>
      </p>

      {/* Onde vais. Três passos curtos em vez de uma parede de campos. */}
      <ol className="mt-6 flex items-center gap-2" aria-label="Passos">
        {PASSOS.map((nome, i) => (
          <li key={nome} className="flex flex-1 items-center gap-2">
            <span
              aria-current={i === passo ? "step" : undefined}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition-colors ${
                i < passo ? "bg-brand text-white"
                : i === passo ? "bg-ink text-white"
                : "bg-stone-100 text-stone-400"
              }`}
            >
              {i < passo ? <Check size={12} aria-hidden /> : i + 1}
            </span>
            <span className={`hidden text-xs sm:block ${i === passo ? "font-semibold text-ink" : "text-stone-400"}`}>
              {nome}
            </span>
            {i < PASSOS.length - 1 && <span className="h-px flex-1 bg-stone-200" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={passo}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {passo === 0 && (
              <fieldset>
                <legend className="font-display text-lg text-ink">Com que é que precisas de ajuda?</legend>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {AREAS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      aria-pressed={area === a.id}
                      onClick={() => setArea(a.id)}
                      className={`rounded-2xl border p-3.5 text-left transition-all ${
                        area === a.id
                          ? "border-brand bg-brand-light shadow-card"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-ink">{a.titulo}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{a.ajuda}</span>
                    </button>
                  ))}
                </div>

                <legend className="mt-6 font-display text-lg text-ink">Há pressa?</legend>
                <div className="mt-3 space-y-2">
                  {URGENCIAS.map((u) => (
                    <label
                      key={u.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors ${
                        urgencia === u.id ? "border-brand bg-brand-light" : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="urgencia"
                        checked={urgencia === u.id}
                        onChange={() => setUrgencia(u.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 border-stone-300 text-brand focus:ring-brand"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink">{u.titulo}</span>
                        <span className="mt-0.5 block text-xs text-stone-500">{u.ajuda}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {passo === 1 && (
              <div>
                <label htmlFor="assunto" className="block font-display text-lg text-ink">
                  Numa linha, o que é?
                </label>
                <input
                  id="assunto"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value.slice(0, 160))}
                  placeholder="Nunca entreguei o IVA desde que abri atividade"
                  className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />

                <label htmlFor="situacao" className="mt-5 block font-display text-lg text-ink">
                  Conta-nos a situação
                </label>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Quanto mais claro fores, melhor a proposta que recebes. Não escrevas aqui o
                  teu contacto — ele não segue, e a mensagem volta para trás.
                </p>
                <textarea
                  id="situacao"
                  rows={7}
                  value={situacao}
                  onChange={(e) => setSituacao(e.target.value.slice(0, SITUACAO_MAX))}
                  placeholder="Abri atividade em março, faturo cerca de 2.000 € por mês a clientes em Portugal, e nunca entreguei uma declaração periódica de IVA. Não sei se estou em falta nem quanto devo."
                  className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
                <p className="mt-1 text-right text-[11px] tabular-nums text-stone-400">
                  {situacao.trim().length < SITUACAO_MIN
                    ? `faltam ${SITUACAO_MIN - situacao.trim().length} caracteres`
                    : `${situacao.length} / ${SITUACAO_MAX}`}
                </p>

                <label htmlFor="orcamento" className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-stone-700">
                  Quanto estás disposto a gastar?
                  <InfoTip>Opcional. Ajuda a encaminhar para quem trabalha nessa faixa — e evita propostas que ficam muito longe do que esperavas.</InfoTip>
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    id="orcamento"
                    inputMode="decimal"
                    value={orcamento}
                    onChange={(e) => setOrcamento(e.target.value.replace(/[^\d,.]/g, ""))}
                    placeholder="250"
                    className="w-32 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                  />
                  <span className="text-sm text-stone-500">euros, se souberes</span>
                </div>
              </div>
            )}

            {passo === 2 && (
              <div>
                <p className="font-display text-lg text-ink">Quem és</p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="nome" className="block text-sm font-semibold text-stone-700">
                      Nome completo
                    </label>
                    <p className="mt-0.5 text-xs text-stone-500">O contabilista vê isto.</p>
                    <input
                      id="nome"
                      autoComplete="name"
                      value={nome}
                      onChange={(e) => setNome(e.target.value.slice(0, 160))}
                      className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                    />
                  </div>

                  <div>
                    <label htmlFor="nif" className="block text-sm font-semibold text-stone-700">
                      NIF
                    </label>
                    <p className="mt-0.5 text-xs text-stone-500">
                      O contabilista vê isto — sem NIF não se trata de nada com as Finanças.
                    </p>
                    <input
                      id="nif"
                      inputMode="numeric"
                      autoComplete="off"
                      value={nif}
                      aria-invalid={!nifOk}
                      aria-describedby={!nifOk ? "nif-erro" : undefined}
                      onChange={(e) => setNif(e.target.value.replace(/\D/g, "").slice(0, 9))}
                      className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-3 text-sm tabular-nums focus:outline-none focus:ring-2 sm:w-48 ${
                        nifOk
                          ? "border-stone-200 focus:border-brand focus:ring-brand/25"
                          : "border-alert-border focus:border-alert focus:ring-alert/25"
                      }`}
                    />
                    {!nifOk && (
                      <p id="nif-erro" className="mt-1.5 flex items-center gap-1.5 text-xs text-alert-text">
                        <Warning size={12} aria-hidden /> Esse NIF não é válido. Confere os nove dígitos.
                      </p>
                    )}
                  </div>

                  {/* A partir daqui, o que NÃO segue. Separado a sério, e não
                      por uma linha de texto no meio dos outros campos. */}
                  <div className="rounded-2xl border border-stone-200 bg-cream/50 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                      <Lock size={13} aria-hidden /> Fica connosco
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">
                      É por aqui que te avisamos. O contabilista nunca chega a isto — é o que
                      garante que a conversa não sai da plataforma.
                    </p>

                    <label htmlFor="email" className="mt-3 block text-sm font-semibold text-stone-700">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.trim().slice(0, 180))}
                      className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                    />

                    <label htmlFor="telefone" className="mt-3 block text-sm font-semibold text-stone-700">
                      Telefone <span className="font-normal text-stone-400">(opcional)</span>
                    </label>
                    <input
                      id="telefone"
                      type="tel"
                      autoComplete="tel"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value.slice(0, 20))}
                      className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm tabular-nums focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 sm:w-56"
                    />
                  </div>
                </div>
              </div>
            )}
          </m.div>
        </AnimatePresence>

        <div className="mt-6 flex flex-col gap-2 border-t border-stone-100 pt-5 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => setPasso((p) => Math.max(0, p - 1))}
            disabled={passo === 0}
            className="w-full sm:w-auto"
          >
            <ArrowLeft size={14} aria-hidden /> Voltar
          </Button>

          {passo < PASSOS.length - 1 ? (
            <Button
              onClick={() => setPasso((p) => p + 1)}
              disabled={!podeAvancar}
              className="w-full sm:w-auto"
            >
              Continuar <ArrowRight size={14} aria-hidden />
            </Button>
          ) : (
            <Button onClick={() => void enviar()} disabled={!podeAvancar || aEnviar} className="w-full sm:w-auto">
              {aEnviar ? <><Spinner size={14} /> A enviar…</> : "Enviar o caso"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
