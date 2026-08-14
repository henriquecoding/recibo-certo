"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «Enviar ao meu contabilista» — a peça que qualquer ferramenta usa
//  ---------------------------------------------------------------------
//  É isto que liga os simuladores à plataforma. Uma ferramenta passa o tipo
//  e o resultado; o resto — vínculo, consentimento, lista branca de campos,
//  medição — acontece aqui, uma vez, em vez de em cada página.
//
//  ⚠️ NÃO verifica o plano, e não pode passar a verificar. Ver
//  `PARTILHA_NUNCA_EXIGE_PLUS` em `src/lib/contabilistas/vinculo.ts`.
//
//  ⚠️ Antes de enviar, a pessoa VÊ os campos exatos que vão seguir. É o que
//  o `routing.ts` exige da rota de contabilista: «formulário mínimo, com o
//  destinatário identificado e os campos exatos à vista antes de enviar».
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { meuVinculo, partilhar } from "@/lib/contabilistas/dados";
import type { Contabilista, TipoPartilha } from "@/lib/contabilistas/tipos";
import {
  CONSENTIMENTO_VERSAO, ROTULO_PARTILHA, TEXTO_CONSENTIMENTO,
  sanitizarConteudoPartilha,
} from "@/lib/contabilistas/vinculo";
import { registar } from "@/lib/analytics/cliente";
import Button from "@/components/ui/Button";
import { Briefcase, Check, Close, Lock, Warning } from "@/components/ui/Icons";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  tipo: TipoPartilha;
  /** O resultado a enviar. Filtrado pela lista branca antes de sair daqui. */
  conteudo: unknown;
  /** Identificador da ferramenta, para a medição. */
  toolId: string;
  titulo?: string;
  /** `discreto` para dentro de um cartão de resultado já cheio de ações. */
  variante?: "cartao" | "discreto";
}

export default function EnviarAoContabilista({
  tipo, conteudo, toolId, titulo, variante = "cartao",
}: Props) {
  const { user, carregado, disponivel } = useAuth();
  const [cc, setCc] = useState<Contabilista | null>(null);
  const [ativo, setAtivo] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!carregado || !user || !disponivel) return;
    let vivo = true;
    meuVinculo(user.id)
      .then((v) => {
        if (!vivo) return;
        setCc(v?.contabilista ?? null);
        setAtivo(v?.estado === "ativo");
      })
      .catch(() => { if (vivo) { setCc(null); setAtivo(false); } });
    return () => { vivo = false; };
  }, [carregado, user, disponivel]);

  // Sem nuvem configurada não há plataforma; mostrar o convite seria prometer
  // uma porta que não abre.
  if (!disponivel) return null;

  // Sem contabilista ligado, a ferramenta encaminha para o diretório. É a
  // rota `contabilista` do `routing.ts` no seu estado inicial.
  if (!cc || !ativo) {
    if (variante === "discreto") {
      return (
        <Link
          href="/contabilistas"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark underline underline-offset-2"
        >
          <Briefcase size={15} aria-hidden /> Falar com um contabilista
        </Link>
      );
    }
    return (
      <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card">
        <h3 className="flex items-center gap-2 font-display text-lg text-ink">
          <Briefcase size={18} className="text-brand" aria-hidden />
          Queres que um contabilista veja isto?
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
          Liga-te a um contabilista certificado e envia-lhe este resultado com um
          clique. <strong className="text-stone-800">Não precisas de nenhum plano pago.</strong>
        </p>
        <Link href="/contabilistas" className="mt-4 inline-block">
          <Button size="sm" variant="secondary">Ver contabilistas</Button>
        </Link>
      </section>
    );
  }

  return (
    <>
      {variante === "discreto" ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark underline underline-offset-2"
        >
          <Briefcase size={15} aria-hidden /> Enviar a {cc.nome.split(" ")[0]}
        </button>
      ) : (
        <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card">
          <h3 className="flex items-center gap-2 font-display text-lg text-ink">
            <Briefcase size={18} className="text-brand" aria-hidden />
            Enviar a {cc.nome}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            Envia este resultado ao teu contabilista. Vês exatamente o que segue antes
            de confirmar, e podes revogar o acesso depois.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setAberto(true)}>
            Enviar resultado
          </Button>
        </section>
      )}

      {aberto && (
        <Folha
          cc={cc}
          tipo={tipo}
          conteudo={conteudo}
          toolId={toolId}
          titulo={titulo}
          onFechar={() => setAberto(false)}
        />
      )}
    </>
  );
}

/**
 * Folha inferior no telemóvel, diálogo centrado a partir de `sm`.
 * Corpo com `min-h-0 flex-1 overflow-y-auto` dentro de `max-h-[90dvh]`,
 * como o design system exige — senão o conteúdo longo empurra as ações
 * para fora do ecrã em telemóveis baixos.
 */
function Folha({
  cc, tipo, conteudo, toolId, titulo, onFechar,
}: {
  cc: Contabilista; tipo: TipoPartilha; conteudo: unknown;
  toolId: string; titulo?: string; onFechar: () => void;
}) {
  const { user } = useAuth();
  const [consentiu, setConsentiu] = useState(false);
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [estado, setEstado] = useState<"parado" | "a-enviar" | "enviado">("parado");
  const caixaRef = useRef<HTMLDivElement>(null);

  const limpo = sanitizarConteudoPartilha(tipo, conteudo);
  const campos = Object.entries(limpo.conteudo);

  const fechar = useCallback(() => onFechar(), [onFechar]);

  // O foco entra na folha ao abrir e volta a quem o tinha ao fechar. Sem
  // isto, o teclado ficava na página por baixo — a ler uma coisa e a
  // navegar noutra.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      caixaRef.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();
    }, 60);
    return () => {
      clearTimeout(t);
      if (anterior && typeof anterior.focus === "function") anterior.focus();
    };
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") { fechar(); return; }
      if (e.key !== "Tab" || !caixaRef.current) return;

      const focaveis = Array.from(caixaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;

      if (e.shiftKey && (atual === primeiro || !caixaRef.current.contains(atual))) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && atual === ultimo) {
        e.preventDefault(); primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [fechar]);

  async function enviar() {
    if (!user || !consentiu) return;
    setEstado("a-enviar"); setErro(null);

    registar("lead_consent", {
      case_type: tipo, partner_id: "contabilista", consent_version: CONSENTIMENTO_VERSAO,
    });

    const { erro: e } = await partilhar({
      contabilistaId: cc.userId, clienteId: user.id, tipo, conteudo, titulo, nota,
    });

    if (e) { setErro(e); setEstado("parado"); return; }

    registar("accountant_share", {
      tool_id: toolId, share_kind: tipo,
      consent_version: CONSENTIMENTO_VERSAO, field_count: campos.length,
    });
    setEstado("enviado");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="folha-partilha-titulo"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}
    >
      <div
        ref={caixaRef}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-4xl bg-white shadow-float sm:rounded-4xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 p-5">
          <div className="min-w-0">
            <p className="eyebrow">{ROTULO_PARTILHA[tipo]}</p>
            <h2 id="folha-partilha-titulo" className="mt-1 font-display text-xl text-ink">
              {estado === "enviado" ? "Enviado" : `Enviar a ${cc.nome}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar"
            className="inline-flex min-h-[2.25rem] min-w-[2.25rem] shrink-0 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <Close size={18} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {estado === "enviado" ? (
            <div className="py-6 text-center">
              <Check size={30} className="mx-auto text-brand" aria-hidden />
              <p className="mt-3 font-display text-lg text-ink">
                {cc.nome.split(" ")[0]} já tem acesso a este resultado.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                Podes revogar o acesso quando quiseres, na tua área.
              </p>
              <Link href="/dashboard/contabilista" className="mt-5 inline-block">
                <Button variant="secondary" size="sm">Ver o que já enviei</Button>
              </Link>
            </div>
          ) : limpo.erro ? (
            <p className="flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-3 text-sm text-alert-text">
              <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {limpo.erro}
            </p>
          ) : (
            <>
              <p className="flex items-start gap-2.5 rounded-2xl bg-cream px-4 py-3 text-sm leading-relaxed text-stone-600">
                <Lock size={15} className="mt-0.5 shrink-0 text-stone-400" aria-hidden />
                Segue uma cópia destes campos — e mais nada. O teu histórico, os teus
                recibos e as tuas outras simulações continuam só teus.
              </p>

              <h3 className="mt-5 text-sm font-semibold text-stone-700">
                O que vai seguir ({campos.length})
              </h3>
              <dl className="mt-2 divide-y divide-stone-100 rounded-2xl border border-stone-100">
                {campos.map(([chave, valor]) => (
                  <div key={chave} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                    <dt className="text-sm text-stone-500">{humanizar(chave)}</dt>
                    <dd className="min-w-0 break-words text-sm font-medium tabular-nums text-stone-800">
                      {formatar(valor)}
                    </dd>
                  </div>
                ))}
              </dl>

              {limpo.removidos.length > 0 && (
                <p className="mt-2.5 text-xs leading-relaxed text-stone-400">
                  {limpo.removidos.length}{" "}
                  {limpo.removidos.length === 1 ? "campo não autorizado ficou" : "campos não autorizados ficaram"} de fora.
                </p>
              )}

              <label className="mt-5 block">
                <span className="text-sm font-medium text-stone-600">Nota (opcional)</span>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value.slice(0, 2000))}
                  rows={3}
                  placeholder="O que queres que ele veja primeiro."
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-stone-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </label>

              <label className="mt-4 flex items-start gap-3 rounded-2xl bg-cream p-4">
                <input
                  type="checkbox"
                  checked={consentiu}
                  onChange={(e) => setConsentiu(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand"
                />
                <span className="text-sm leading-relaxed text-stone-600">{TEXTO_CONSENTIMENTO}</span>
              </label>

              {erro && (
                <p role="alert" className="mt-3 flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
                  <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
                </p>
              )}
            </>
          )}
        </div>

        {estado !== "enviado" && !limpo.erro && (
          <footer className="shrink-0 border-t border-stone-100 p-5">
            <Button
              className="w-full"
              onClick={enviar}
              disabled={!consentiu || estado === "a-enviar"}
            >
              {estado === "a-enviar" ? "A enviar…" : "Confirmar e enviar"}
            </Button>
          </footer>
        )}
      </div>
    </div>
  );
}

function humanizar(chave: string): string {
  const s = chave.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatar(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(v);
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return `${v.length} ${v.length === 1 ? "item" : "itens"}`;
  return "—";
}
