"use client";

// O formulário de contacto — o ÚNICO componente interativo desta página.
//
// ── O que mudou ────────────────────────────────────────────────────────────
// O anterior tinha três separadores, uma barra de progresso que contava nove
// campos arbitrários (dava para submeter com 22% e receber "sucesso"), pedia
// montante mínimo e máximo sem impedir que o mínimo fosse maior que o máximo,
// e escrevia direto na base de dados a partir do browser. As `label` não
// tinham `htmlFor`, os campos não tinham `id`, `name` nem `autocomplete`, os
// erros não eram anunciados e uma exceção de rede deixava o botão preso em
// "A enviar…".
//
// Este é uma coluna, cinco campos, sem separadores. E pede a coisa certa: o
// deck, não uma "proposta de investimento" — ninguém propõe termos antes de
// ter visto o que quer que seja.

import { useEffect, useRef, useState } from "react";
import { INTERESSES, VERSAO_PRIVACIDADE, validarLead, type ErrosCampos } from "../_lib/validation";
import { RESUMO_PRIVACIDADE, EMAIL_INVESTIDORES, SLA_RESPOSTA } from "../_data/legal";
import { BOTAO_PRIMARIO } from "./Primitivas";

type Estado = "idle" | "sending" | "success" | "error";

const OPCOES: { valor: (typeof INTERESSES)[number]; rotulo: string }[] = [
  { valor: "deck", rotulo: "Receber o deck" },
  { valor: "intro", rotulo: "Marcar uma apresentação" },
  { valor: "strategic-partnership", rotulo: "Parceria estratégica" },
];

const CAMPO =
  "mt-1.5 block w-full min-h-11 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-stone-400 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-dark/30 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100";
const ROTULO = "block text-[13px] font-semibold text-stone-700 dark:text-stone-300";

export default function FormularioInteresse() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [erroGeral, setErroGeral] = useState("");
  const [erros, setErros] = useState<ErrosCampos>({});

  // Marcados no MOUNT e não no render: `crypto.randomUUID` não existe no
  // servidor nem em contextos inseguros, e `Date.now()` no render daria um
  // valor diferente entre servidor e cliente, partindo a hidratação.
  const inicio = useRef<string>("");
  const chave = useRef<string>("");
  useEffect(() => {
    inicio.current = new Date().toISOString();
    chave.current = gerarUuid();
  }, []);

  async function submeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const parametros = new URLSearchParams(window.location.search);

    const payload = {
      name: String(dados.get("name") || ""),
      email: String(dados.get("email") || ""),
      organisation: String(dados.get("organisation") || ""),
      role: String(dados.get("role") || ""),
      interest: String(dados.get("interest") || ""),
      message: String(dados.get("message") || ""),
      companyFax: String(dados.get("companyFax") || ""),
      privacyAcknowledged: dados.get("privacyAcknowledged") === "on",
      privacyVersion: VERSAO_PRIVACIDADE,
      startedAt: inicio.current || new Date(Date.now() - 3000).toISOString(),
      idempotencyKey: chave.current || gerarUuid(),
      sourceUrl: window.location.origin + window.location.pathname,
      utmSource: parametros.get("utm_source") || "",
      utmMedium: parametros.get("utm_medium") || "",
      utmCampaign: parametros.get("utm_campaign") || "",
    };

    // Validação local com o MESMO módulo do servidor — o feedback chega antes
    // da viagem, mas quem decide continua a ser o servidor.
    const local = validarLead(payload);
    if (!local.ok) {
      const semHoneypot = { ...local.erros };
      delete semHoneypot.companyFax;
      delete semHoneypot.startedAt;
      if (Object.keys(semHoneypot).length > 0) {
        setErros(semHoneypot);
        setEstado("error");
        setErroGeral("Faltam dados no formulário. Vê os campos assinalados.");
        return;
      }
    }

    setEstado("sending");
    setErroGeral("");
    setErros({});

    try {
      const resposta = await fetch("/api/investidores/interesse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (resposta.status === 429) {
        setEstado("error");
        setErroGeral("Demasiados pedidos deste dispositivo hoje. Escreve-nos diretamente para " + EMAIL_INVESTIDORES + ".");
        return;
      }
      if (resposta.status === 422) {
        const corpo = (await resposta.json().catch(() => ({}))) as { fields?: ErrosCampos };
        setErros(corpo.fields ?? {});
        setEstado("error");
        setErroGeral("Alguns campos precisam de atenção.");
        return;
      }
      if (!resposta.ok) throw new Error(String(resposta.status));

      setEstado("success");
    } catch {
      // A exceção é apanhada — sem isto o botão ficava preso em "A enviar…"
      // e a pessoa não sabia se tinha enviado ou não.
      setEstado("error");
      setErroGeral(
        `Não foi possível enviar agora. Tenta outra vez ou escreve para ${EMAIL_INVESTIDORES}.`,
      );
    }
  }

  if (estado === "success") {
    return (
      <div
        role="status"
        className="rounded-3xl border border-brand-dark/25 bg-brand-light/60 p-6 dark:border-brand/25 dark:bg-brand/10"
      >
        <h3 className="font-display text-xl font-semibold text-ink">Pedido recebido</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
          Respondemos {SLA_RESPOSTA}. Enviámos também uma confirmação para o email que indicou.
        </p>
        <p className="mt-4 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
          Entretanto, o produto está aberto e sem registo —{" "}
          <a href="/" className="font-semibold text-brand-dark underline underline-offset-2 dark:text-brand-mint">
            é a forma mais rápida de perceber o que fazemos
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submeter} className="grid gap-5">
      <Campo id="investor-name" nome="name" rotulo="Nome" autoComplete="name" obrigatorio erro={erros.name} maxLength={120} />
      <Campo
        id="investor-email"
        nome="email"
        rotulo="Email profissional"
        tipo="email"
        autoComplete="email"
        obrigatorio
        erro={erros.email}
        maxLength={254}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="investor-org" nome="organisation" rotulo="Fundo ou empresa" autoComplete="organization" erro={erros.organisation} maxLength={160} />
        <Campo id="investor-role" nome="role" rotulo="Cargo" autoComplete="organization-title" erro={erros.role} maxLength={120} />
      </div>

      <div>
        <label htmlFor="investor-interest" className={ROTULO}>
          O que procura <span className="text-stone-400">(obrigatório)</span>
        </label>
        <select
          id="investor-interest"
          name="interest"
          required
          defaultValue=""
          aria-invalid={erros.interest ? true : undefined}
          aria-describedby={erros.interest ? "erro-interest" : undefined}
          className={CAMPO}
        >
          <option value="" disabled>
            Selecionar…
          </option>
          {OPCOES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        {erros.interest && (
          <p id="erro-interest" className="mt-1.5 text-[12px] font-medium text-red-700 dark:text-red-400">
            {erros.interest}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="investor-message" className={ROTULO}>
          Mensagem <span className="text-stone-400">(opcional)</span>
        </label>
        <textarea
          id="investor-message"
          name="message"
          rows={4}
          maxLength={1500}
          placeholder="Tese, estágio em que investe, ou uma pergunta concreta."
          aria-invalid={erros.message ? true : undefined}
          className={CAMPO}
        />
      </div>

      {/* Honeypot. `aria-hidden` + `tabIndex=-1` mantêm-no fora do teclado e
          dos leitores de ecrã; só um autómato o preenche. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="company-fax">Fax da empresa</label>
        <input id="company-fax" name="companyFax" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-700 dark:bg-stone-800/50">
        <label className="flex items-start gap-3 text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
          <input
            name="privacyAcknowledged"
            type="checkbox"
            required
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-400 text-brand-dark focus:ring-2 focus:ring-brand-dark/40"
            aria-invalid={erros.privacyAcknowledged ? true : undefined}
          />
          <span>
            Li a{" "}
            <a
              href="/privacidade#investidores"
              className="font-semibold text-brand-dark underline underline-offset-2 dark:text-brand-mint"
            >
              Nota de Privacidade para Investidores
            </a>
            . {RESUMO_PRIVACIDADE}
          </span>
        </label>
        {erros.privacyAcknowledged && (
          <p className="mt-2 text-[12px] font-medium text-red-700 dark:text-red-400">{erros.privacyAcknowledged}</p>
        )}
      </div>

      {estado === "error" && erroGeral && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {erroGeral}
        </p>
      )}

      <div>
        <button type="submit" disabled={estado === "sending"} className={`${BOTAO_PRIMARIO} disabled:opacity-60`}>
          {estado === "sending" ? "A enviar…" : "Pedir o deck"}
        </button>
        <p className="mt-3 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
          Respondemos {SLA_RESPOSTA}. Sem NDA para a primeira conversa.
        </p>
      </div>
    </form>
  );
}

function Campo({
  id,
  nome,
  rotulo,
  tipo = "text",
  autoComplete,
  obrigatorio,
  erro,
  maxLength,
}: {
  id: string;
  nome: string;
  rotulo: string;
  tipo?: string;
  autoComplete?: string;
  obrigatorio?: boolean;
  erro?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className={ROTULO}>
        {rotulo} {obrigatorio && <span className="text-stone-400">(obrigatório)</span>}
      </label>
      <input
        id={id}
        name={nome}
        type={tipo}
        autoComplete={autoComplete}
        required={obrigatorio}
        maxLength={maxLength}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `erro-${nome}` : undefined}
        className={CAMPO}
      />
      {erro && (
        <p id={`erro-${nome}`} className="mt-1.5 text-[12px] font-medium text-red-700 dark:text-red-400">
          {erro}
        </p>
      )}
    </div>
  );
}

/** `crypto.randomUUID` não existe em contextos inseguros nem em browsers
 *  antigos; o recurso mantém a idempotência a funcionar na mesma. */
function gerarUuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
