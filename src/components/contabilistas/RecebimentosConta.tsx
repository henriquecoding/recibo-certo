"use client";

// ═══════════════════════════════════════════════════════════════════════
//  RECEBIMENTOS — o cartão que vive no perfil
//  ---------------------------------------------------------------------
//  O par do `LinkedInConta`, e pela mesma razão: uma ligação a um serviço
//  externo não é uma página, é uma parte da identidade profissional. O
//  LinkedIn estava no perfil e a Stripe não estava em lado nenhum — quem
//  não soubesse que existia uma página «Recebimentos» nunca ligava nada, e
//  o produto ficava a prometer pagamentos que ninguém tinha ativado.
//
//  Três coisas que este cartão faz e a página anterior não fazia:
//
//   1. Distingue os seis estados (`estado.ts`) em vez de «ligado / não
//      ligado». O caso que interessa é «já cobras mas o dinheiro não sai»,
//      que aparecia como tudo pronto.
//   2. Diz os requisitos em português. `individual.verification.document`
//      em `font-mono` não é transparência — é passar o trabalho de
//      traduzir para quem menos o consegue fazer.
//   3. Sincroniza ao voltar do formulário. O webhook é a fonte normal, mas
//      chega quando chega, e ficar a olhar para «em análise» depois de ter
//      acabado tudo parece uma avaria.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import {
  abrirOnboarding, estadoDosRecebimentos, sincronizarRecebimentos,
} from "@/lib/contabilistas/fonte/pagamentos";
import {
  classificarRecebimentos, requisitosLegiveis, type RetratoDosRecebimentos,
} from "@/lib/contabilistas/stripe/estado";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import { Check, ExternalLink, Wallet, Warning } from "@/components/ui/Icons";

const MOLDURA: Record<RetratoDosRecebimentos["tom"], string> = {
  marca: "border-brand/30 bg-brand-light/40",
  aviso: "border-alert-border bg-alert-bg",
  neutro: "border-stone-200 bg-cream/55",
};

const ETIQUETA: Record<RetratoDosRecebimentos["tom"], string> = {
  marca: "bg-brand-light text-brand-dark dark:bg-brand/20 dark:text-brand-mint",
  aviso: "bg-alert-bg text-alert-text",
  neutro: "bg-stone-100 text-stone-500",
};

const NOME_CURTO: Record<RetratoDosRecebimentos["estado"], string> = {
  sem_conta: "Não ligado",
  incompleta: "Por acabar",
  acao_necessaria: "Falta responder",
  em_analise: "Em verificação",
  restrita: "Com limitações",
  ativa: "Ativo",
};

export default function RecebimentosConta({
  /** Quando a página já leu o estado, evita uma segunda leitura. */
  aoMudar,
}: {
  aoMudar?: () => void;
} = {}) {
  const avisos = useAvisos();
  const [retrato, setRetrato] = useState<RetratoDosRecebimentos | null>(null);
  const [requisitos, setRequisitos] = useState<string[]>([]);
  const [aLer, setALer] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setALer(true);
    setErro(null);
    try {
      const c = await estadoDosRecebimentos();
      setRetrato(classificarRecebimentos(c));
      setRequisitos(c.requisitos ?? []);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setALer(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function abrirFormulario() {
    setOcupado(true);
    setErro(null);
    const r = await abrirOnboarding();
    setOcupado(false);
    if (r.erro) { setErro(r.erro); return; }
    // Em sucesso o browser sai daqui para a Stripe.
    if (r.url) window.location.href = r.url;
  }

  async function abrirPainel() {
    setOcupado(true);
    setErro(null);
    const r = await sincronizarRecebimentos();
    setOcupado(false);
    if (r.erro) { setErro(r.erro); return; }

    setRetrato(classificarRecebimentos({ ...r, ligada: true }));
    setRequisitos(r.requisitos ?? []);
    aoMudar?.();

    if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
    else avisos.sucesso("Estado atualizado.");
  }

  if (aLer || !retrato) {
    return (
      <section aria-busy="true" className="rounded-3xl border border-stone-200 bg-cream/55 p-4 sm:p-5">
        <div className="h-24 animate-pulse rounded-2xl bg-stone-100" />
      </section>
    );
  }

  const legiveis = requisitosLegiveis(requisitos);

  return (
    <section
      aria-labelledby="recebimentos-titulo"
      className={`rounded-3xl border p-4 sm:p-5 ${MOLDURA[retrato.tom]}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-card"
          >
            {retrato.aceitaPagamentos
              ? <Check size={22} className="text-brand" />
              : <Wallet size={22} className="text-stone-400" />}
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="recebimentos-titulo" className="font-semibold text-stone-800">
                Recebimentos
              </h2>
              <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${ETIQUETA[retrato.tom]}`}>
                {NOME_CURTO[retrato.estado]}
              </span>
            </div>

            <p className="mt-1 font-medium text-stone-700">{retrato.titulo}</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-stone-500">
              {retrato.explicacao}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {retrato.accao && retrato.destino === "onboarding" && (
            <Button type="button" size="sm" onClick={abrirFormulario} disabled={ocupado}>
              {ocupado ? "A abrir…" : retrato.accao}
            </Button>
          )}
          {retrato.destino === "painel" && (
            <Button type="button" size="sm" variant="secondary" onClick={abrirPainel} disabled={ocupado}>
              <ExternalLink size={14} aria-hidden />
              {ocupado ? "A abrir…" : retrato.accao ?? "Painel da Stripe"}
            </Button>
          )}
        </div>
      </div>

      {erro && (
        <p role="alert" className="mt-3 rounded-xl bg-clay-bg px-3 py-2 text-xs leading-relaxed text-clay-text">
          {erro}
        </p>
      )}

      {legiveis.length > 0 && (
        <div className="mt-3.5 rounded-2xl border border-stone-200 bg-white px-3.5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
            O que a Stripe ainda pede
          </p>
          <ul className="mt-2 space-y-1.5">
            {legiveis.map((r) => (
              <li key={r.codigo} className="flex items-start gap-2 text-sm leading-relaxed text-stone-700">
                <Warning size={14} className="mt-0.5 shrink-0 text-alert-text" aria-hidden />
                {/* Sem tradução mostra-se o código. Feio, mas honesto — e a
                    lista dos que aparecem assim é o que diz onde
                    acrescentar a próxima linha em `estado.ts`. */}
                {r.texto ?? <code className="font-mono text-xs">{r.codigo}</code>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-stone-500">
        Os dados bancários e de identificação vivem na Stripe e nunca passam pelos nossos
        servidores. O dinheiro das consultas vai direto para o teu saldo — não passa pela
        conta do Recibo Certo.
      </p>
    </section>
  );
}
