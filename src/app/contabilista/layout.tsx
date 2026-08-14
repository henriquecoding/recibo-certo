"use client";

// ═══════════════════════════════════════════════════════════════════════
//  Painel de gestão do contabilista — a fronteira de entrada
//  ---------------------------------------------------------------------
//  Este guarda é conveniência, não segurança. Quem autoriza é a RLS da
//  migração 042: conhecer o URL não dá acesso a dados nenhuns, porque cada
//  consulta à base de dados é filtrada pela identidade de quem a faz.
//  O que isto evita é mostrar um painel vazio a quem não devia estar cá.
//
//  A proteção de texto abaixo é a primeira barreira de UX: impede que
//  formulários enviem HTML/scripts e explica o erro junto da interação.
//  A segurança real não depende dela: a base repete a regra por trigger,
//  pelo que contornar o browser não contorna a proteção.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect, useRef, useState,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ComponentType,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/supabase/auth";
import { contagensDoPainel, obterMinhaFicha } from "@/lib/contabilistas/dados";
import type { Contabilista } from "@/lib/contabilistas/tipos";
import { contemCodigo } from "@/lib/feedback-sanitize";
import {
  Logo, LayoutGrid, Calendar, User, PaperClip, Gift, Settings, ArrowLeft, Warning,
  Target, Briefcase, ShieldCheck,
} from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import SinoNotificacoes from "@/components/contabilistas/SinoNotificacoes";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import styles from "./painel.module.css";

interface Contagens {
  pedidos: number;
  partilhasPorLer: number;
  consultasPorConfirmar: number;
}

interface Item {
  href: string;
  label: string;
  curto: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  /** Quantas coisas esperam por resposta neste separador. */
  porResponder?: (c: Contagens) => number;
}

const NAV: Item[] = [
  { href: "/contabilista", label: "Hoje", curto: "Hoje", Icon: LayoutGrid },
  // Os casos vêm antes da agenda: é por onde chegam clientes novos, e o
  // que está por responder pesa mais do que o que já está marcado.
  { href: "/contabilista/casos", label: "Casos", curto: "Casos", Icon: Briefcase },
  {
    href: "/contabilista/agenda", label: "Agenda", curto: "Agenda", Icon: Calendar,
    porResponder: (c) => c.consultasPorConfirmar,
  },
  {
    href: "/contabilista/clientes", label: "Clientes", curto: "Clientes", Icon: User,
    porResponder: (c) => c.pedidos,
  },
  { href: "/contabilista/trabalho", label: "Trabalho", curto: "Trabalho", Icon: Target },
  {
    href: "/contabilista/partilhas", label: "Partilhas", curto: "Partilhas", Icon: PaperClip,
    porResponder: (c) => c.partilhasPorLer,
  },
  { href: "/contabilista/fidelidade", label: "Fidelidade", curto: "Fidelidade", Icon: Gift },
  { href: "/contabilista/perfil", label: "Perfil público", curto: "Perfil", Icon: Settings },
];

const SEM_CONTAGENS: Contagens = { pedidos: 0, partilhasPorLer: 0, consultasPorConfirmar: 0 };
const MENSAGEM_TEXTO_SEGURO = "Por segurança, não incluas código, HTML ou scripts neste campo.";
const SELETOR_TEXTO = [
  'input:not([type])',
  'input[type="text"]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[type="url"]',
  'input[type="search"]',
  "textarea",
].join(",");

type CampoTexto = HTMLInputElement | HTMLTextAreaElement;

function eCampoTexto(alvo: EventTarget | null): alvo is CampoTexto {
  if (typeof window === "undefined") return false;
  if (alvo instanceof HTMLTextAreaElement) return true;
  if (!(alvo instanceof HTMLInputElement)) return false;
  return ["", "text", "email", "tel", "url", "search"].includes(alvo.type);
}

function primeiroPerigoso(raiz: ParentNode): CampoTexto | null {
  const campos = raiz.querySelectorAll<CampoTexto>(SELETOR_TEXTO);
  for (const campo of campos) {
    if (!campo.disabled && contemCodigo(campo.value)) return campo;
  }
  return null;
}

function marcarPerigoso(campo: CampoTexto) {
  campo.setCustomValidity(MENSAGEM_TEXTO_SEGURO);
  campo.focus({ preventScroll: true });
  campo.scrollIntoView({ block: "center", behavior: "smooth" });
  campo.reportValidity();
}

export default function ContabilistaLayout({ children }: { children: ReactNode }) {
  const { user, carregado, disponivel, abrirModal } = useAuth();
  const pathname = usePathname();
  const [ficha, setFicha] = useState<Contabilista | null>(null);
  const [contagens, setContagens] = useState<Contagens>(SEM_CONTAGENS);
  const [aVerificar, setAVerificar] = useState(true);
  const ativoMovel = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!carregado) return;
    if (!user || !disponivel) { setAVerificar(false); return; }
    let vivo = true;
    obterMinhaFicha(user.id)
      .then((f) => { if (vivo) setFicha(f); })
      .catch(() => { if (vivo) setFicha(null); })
      .finally(() => { if (vivo) setAVerificar(false); });
    return () => { vivo = false; };
  }, [carregado, user, disponivel]);

  // As contagens da navegação. Recarregam a cada mudança de separador —
  // é quando o número pode ter deixado de ser verdade, porque a ação que o
  // mudou aconteceu no ecrã anterior.
  useEffect(() => {
    if (!user || !disponivel || ficha?.estado !== "aprovado") return;
    let vivo = true;
    contagensDoPainel(user.id)
      .then((c) => { if (vivo) setContagens(c); })
      .catch(() => { if (vivo) setContagens(SEM_CONTAGENS); });
    return () => { vivo = false; };
  }, [user, disponivel, ficha?.estado, pathname]);

  // A barra móvel tem oito destinos e rola horizontalmente. Quando a pessoa
  // chega por ligação direta a um destino que está fora do primeiro ecrã,
  // o separador ativo vem para o centro em vez de ficar escondido.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      ativoMovel.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  if (!carregado || aVerificar) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-pulse rounded-full bg-brand-light" />
      </div>
    );
  }

  if (!user) return <Portao titulo="Entra na tua conta" texto="O painel de gestão precisa de sessão iniciada." acao={<Button onClick={() => abrirModal("entrar")}>Entrar</Button>} />;

  if (!ficha) {
    return (
      <Portao
        titulo="Ainda não tens conta de contabilista"
        texto="Qualquer pessoa se pode candidatar. A administração analisa e responde — podes anexar comprovativos ou tratar disso por email."
        acao={<Link href="/contabilistas/candidatura"><Button>Pedir acesso</Button></Link>}
      />
    );
  }

  if (ficha.estado !== "aprovado") {
    const texto =
      ficha.estado === "suspenso"
        ? "A tua conta está suspensa. Vê o email de contacto ou fala com a administração para perceber porquê."
        : "A tua candidatura ainda está a ser analisada. Avisamos-te assim que houver decisão.";
    return <Portao titulo="Acesso em espera" texto={texto} acao={<Link href="/dashboard"><Button variant="secondary">Voltar ao painel</Button></Link>} />;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <Link href="/contabilista" className={styles.identity} aria-label={`${ficha.nome} — painel de gestão`}>
            <Logo small />
            <span className="min-w-0">
              <span className={styles.identityMeta}>Painel profissional</span>
              <span className={`${styles.identityName} block text-ink`}>{ficha.nome}</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/dashboard"
              className="hidden min-h-10 items-center gap-1.5 rounded-xl border border-stone-200/70 bg-white/50 px-3 text-sm font-medium text-stone-500 transition-colors hover:border-brand/20 hover:bg-white hover:text-stone-800 sm:inline-flex dark:border-stone-800 dark:bg-stone-900/40 dark:hover:bg-stone-900"
            >
              <ArrowLeft size={15} aria-hidden /> A minha conta
            </Link>
            {/* Um só sino por layout. Duplicá-lo cria dois listeners Realtime
                com o mesmo nome e volta a provocar a regressão já corrigida. */}
            <SinoNotificacoes />
            <ThemeToggle />
          </div>
        </div>

        <nav aria-label="Painel de contabilista" className={`hidden lg:block ${styles.navRail}`}>
          <ul className={styles.navList}>
            {NAV.map(({ href, label, Icon, porResponder }) => {
              const ativo = href === "/contabilista" ? pathname === href : pathname.startsWith(href);
              const quantos = porResponder?.(contagens) ?? 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={ativo ? "page" : undefined}
                    className={`${styles.navLink} ${ativo ? styles.navLinkActive : ""}`}
                  >
                    <Icon size={16} aria-hidden />
                    {label}
                    {quantos > 0 && (
                      <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1.5 text-[0.6875rem] font-semibold tabular-nums text-white">
                        {quantos}
                        <span className="sr-only"> por responder</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className={styles.content}>
        <ProtecaoTextoPainel>{children}</ProtecaoTextoPainel>
      </main>

      {/* O painel tem oito destinos. Em vez de os comprimir numa grelha de
          seis colunas, todos conservam alvo ≥44 px e a barra rola. O destino
          ativo é centrado automaticamente pelo efeito acima. */}
      <nav
        aria-label="Painel de contabilista"
        className={styles.mobileDock}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className={styles.mobileList}>
          {NAV.map(({ href, curto, Icon, porResponder }) => {
            const ativo = href === "/contabilista" ? pathname === href : pathname.startsWith(href);
            const quantos = porResponder?.(contagens) ?? 0;
            return (
              <li key={href} className={styles.mobileItem}>
                <Link
                  ref={ativo ? ativoMovel : undefined}
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={`${styles.mobileLink} ${ativo ? styles.mobileLinkActive : ""}`}
                >
                  <span className="relative">
                    <Icon size={19} aria-hidden />
                    {quantos > 0 && (
                      <span
                        className="absolute -right-1.5 -top-0.5 flex h-2 w-2 rounded-full bg-brand ring-2 ring-white dark:ring-stone-950"
                        aria-label={`${quantos} por responder`}
                      />
                    )}
                  </span>
                  <span className="max-w-[4.1rem] truncate">{curto}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/**
 * A mesma regra do formulário de Ajuda & Suporte, aplicada a todo o painel.
 *
 * É deliberadamente uma barreira de UX, não a fronteira de confiança: a BD
 * tem a mesma verificação em triggers. Aqui bloqueamos o submit, paste e drop
 * para a pessoa perceber imediatamente o que precisa de corrigir.
 */
function ProtecaoTextoPainel({ children }: { children: ReactNode }) {
  const avisos = useAvisos();

  function recusar(campo: CampoTexto) {
    marcarPerigoso(campo);
    avisos.erro("Código e HTML não são aceites.", { detalhe: "Escreve apenas o conteúdo em texto simples." });
  }

  function aoAlterar(event: FormEvent<HTMLDivElement>) {
    if (!eCampoTexto(event.target)) return;
    event.target.setCustomValidity(contemCodigo(event.target.value) ? MENSAGEM_TEXTO_SEGURO : "");
  }

  function aoSubmeter(event: FormEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLFormElement)) return;
    const perigoso = primeiroPerigoso(event.target);
    if (!perigoso) return;
    event.preventDefault();
    event.stopPropagation();
    recusar(perigoso);
  }

  function aoClicar(event: ReactMouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return;
    const botao = event.target.closest("button");
    // `Button` sem `type` é submit por semântica HTML mesmo quando está fora
    // de <form> (por exemplo, «Guardar perfil»). Estes botões também passam
    // pela proteção. Botões explicitamente `type=button` — abas, cancelar,
    // navegação da agenda — não são ações de submissão e continuam livres.
    if (!(botao instanceof HTMLButtonElement) || botao.type !== "submit") return;
    const raiz = botao.form ?? event.currentTarget;
    const perigoso = primeiroPerigoso(raiz);
    if (!perigoso) return;
    event.preventDefault();
    event.stopPropagation();
    recusar(perigoso);
  }

  function aoColar(event: ReactClipboardEvent<HTMLDivElement>) {
    if (!eCampoTexto(event.target)) return;
    const texto = event.clipboardData.getData("text");
    if (!texto) return;
    const inicio = event.target.selectionStart ?? event.target.value.length;
    const fim = event.target.selectionEnd ?? inicio;
    const proposto = event.target.value.slice(0, inicio) + texto + event.target.value.slice(fim);
    if (!contemCodigo(proposto)) return;
    event.preventDefault();
    recusar(event.target);
  }

  function aoLargar(event: ReactDragEvent<HTMLDivElement>) {
    if (!eCampoTexto(event.target)) return;
    const texto = event.dataTransfer.getData("text");
    if (!texto || !contemCodigo(texto)) return;
    event.preventDefault();
    recusar(event.target);
  }

  return (
    <div
      onInputCapture={aoAlterar}
      onSubmitCapture={aoSubmeter}
      onClickCapture={aoClicar}
      onPasteCapture={aoColar}
      onDropCapture={aoLargar}
    >
      <div className={styles.securityBar} role="status">
        <ShieldCheck size={13} aria-hidden />
        <span>Campos protegidos: HTML, scripts e código executável são bloqueados.</span>
      </div>
      {children}
    </div>
  );
}

function Portao({ titulo, texto, acao }: { titulo: string; texto: string; acao: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-md rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card sm:p-8">
        <Warning size={26} className="mx-auto text-stone-300" aria-hidden />
        <h1 className="mt-4 font-display text-2xl text-ink">{titulo}</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-stone-500">{texto}</p>
        <div className="mt-6 flex justify-center">{acao}</div>
      </div>
    </div>
  );
}
