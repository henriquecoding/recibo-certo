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
//
//  ⚠️ Este layout serve DUAS moradas: `/contabilista`, onde vive o trabalho
//  real, e `/admin/contabilista`, onde a administração abre o mesmo painel
//  com dados inventados. Não há segunda implementação — o que se muda aqui
//  muda nos dois. Onde a demonstração difere, a diferença está sempre atrás
//  de `painel.demonstracao`, e nunca num ramo que duplique interface.
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
import { contagensDoPainel, obterMinhaFicha } from "@/lib/contabilistas/fonte/dados";
import { usarPainel, type Painel } from "@/components/contabilistas/usarPainel";
import type { Contabilista } from "@/lib/contabilistas/tipos";
import { contemCodigo } from "@/lib/feedback-sanitize";
import {
  Logo, LayoutGrid, Calendar, User, PaperClip, Gift, Settings, ArrowLeft, Warning,
  Target, Briefcase, ShieldCheck, Eye, RotateCcw, Check, ChevronDown, ArrowRight,
  Award,
} from "@/components/ui/Icons";
import { percentagemDoPerfil } from "@/lib/contabilistas/perfil";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AvatarContabilista from "@/components/contabilistas/AvatarContabilista";
import BuscaDoPainel from "@/components/contabilistas/BuscaDoPainel";
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

// A ordem é a das referências: quem se acompanha primeiro (clientes),
// depois o que se lhes está a fazer (casos, agenda, trabalho, partilhas),
// e no fim o que é do próprio profissional (fidelidade, perfil).
const NAV: Item[] = [
  { href: "/contabilista", label: "Hoje", curto: "Hoje", Icon: LayoutGrid },
  {
    href: "/contabilista/clientes", label: "Clientes", curto: "Clientes", Icon: User,
    porResponder: (c) => c.pedidos,
  },
  { href: "/contabilista/casos", label: "Casos", curto: "Casos", Icon: Briefcase },
  {
    href: "/contabilista/agenda", label: "Agenda", curto: "Agenda", Icon: Calendar,
    porResponder: (c) => c.consultasPorConfirmar,
  },
  { href: "/contabilista/trabalho", label: "Trabalho", curto: "Trabalho", Icon: Target },
  {
    href: "/contabilista/partilhas", label: "Partilhas", curto: "Partilhas", Icon: PaperClip,
    porResponder: (c) => c.partilhasPorLer,
  },
  { href: "/contabilista/fidelidade", label: "Fidelidade", curto: "Fidelidade", Icon: Gift },
  { href: "/contabilista/progressao", label: "Progressão", curto: "Progressão", Icon: Award },
  { href: "/contabilista/perfil", label: "Perfil", curto: "Perfil", Icon: Settings },
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
  const painel = usarPainel();
  const [ficha, setFicha] = useState<Contabilista | null>(null);
  const [contagens, setContagens] = useState<Contagens>(SEM_CONTAGENS);
  const [aVerificar, setAVerificar] = useState(true);
  const ativoMovel = useRef<HTMLAnchorElement>(null);

  // Na demonstração a identidade do contabilista vem da semente, não da
  // sessão: a loja vive em memória e ignora o id de quem pergunta. Quem
  // chega àquela morada já passou pela guarda da administração — essa sim
  // exige sessão e papel verificados no servidor.
  const podeLer = painel.demonstracao || Boolean(user && disponivel);
  const quemPergunta = user?.id ?? "";

  useEffect(() => {
    if (!carregado) return;
    if (!podeLer) { setAVerificar(false); return; }
    let vivo = true;
    obterMinhaFicha(quemPergunta)
      .then((f) => { if (vivo) setFicha(f); })
      .catch(() => { if (vivo) setFicha(null); })
      .finally(() => { if (vivo) setAVerificar(false); });
    return () => { vivo = false; };
  }, [carregado, quemPergunta, podeLer]);

  // As contagens da navegação. Recarregam a cada mudança de separador —
  // é quando o número pode ter deixado de ser verdade, porque a ação que o
  // mudou aconteceu no ecrã anterior.
  useEffect(() => {
    if (!podeLer || ficha?.estado !== "aprovado") return;
    let vivo = true;
    contagensDoPainel(quemPergunta)
      .then((c) => { if (vivo) setContagens(c); })
      .catch(() => { if (vivo) setContagens(SEM_CONTAGENS); });
    return () => { vivo = false; };
  }, [quemPergunta, podeLer, ficha?.estado, pathname]);

  // A barra móvel tem nove destinos e rola horizontalmente. Quando a pessoa
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

  if (!user && !painel.demonstracao) return <Portao titulo="Entra na tua conta" texto="O painel de gestão precisa de sessão iniciada." acao={<Button onClick={() => abrirModal("entrar")}>Entrar</Button>} />;

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
    <div className={`${styles.shell} ${styles.comSidebar}`}>
      {/* ── Sidebar (≥lg) ─────────────────────────────────────────────
          Os nove destinos numa coluna. Numa calha horizontal obrigavam
          a comprimir ou a rolar, e o destino ativo perdia-se; aqui cabem
          todos e o topo fica livre para as ações do ecrã. */}
      <aside className={styles.sidebar}>
        <Link href={painel.href("/contabilista")} className={styles.sidebarMarca} aria-label="Painel de gestão">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-sm font-bold tracking-tight text-white">
            RC
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold text-white">Recibo Certo</span>
            <span className="block text-[0.6875rem] uppercase tracking-wider text-white/55">
              {painel.demonstracao ? "Painel simulado" : "Painel de gestão"}
            </span>
          </span>
        </Link>

        <nav aria-label="Painel de contabilista" className={styles.sidebarNav}>
          <ul className="space-y-0.5">
            {NAV.map(({ href, label, Icon, porResponder }) => {
              const destino = painel.href(href);
              const ativo = eAtivo(destino, pathname, painel);
              const quantos = porResponder?.(contagens) ?? 0;
              return (
                <li key={href}>
                  <Link
                    href={destino}
                    aria-current={ativo ? "page" : undefined}
                    className={`${styles.sidebarLink} ${ativo ? styles.sidebarLinkActive : ""}`}
                  >
                    <Icon size={17} aria-hidden />
                    <span className="min-w-0 truncate">{label}</span>
                    {quantos > 0 && (
                      <span className={styles.sidebarBadge}>
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

        <div className={styles.sidebarRodape}>
          <EstadoNaSidebar ficha={ficha} painel={painel} />
          <PessoaNaSidebar ficha={ficha} painel={painel} />
        </div>
      </aside>

      {/* ── Coluna do conteúdo ───────────────────────────────────────── */}
      <div className="flex min-w-0 flex-col">
      <header className={styles.topbar}>
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:px-4 lg:max-w-none lg:gap-4">
          {/* A identidade só no telemóvel: no desktop está na sidebar, e
              repeti-la punha a mesma informação duas vezes no mesmo ecrã.
              O `lg:hidden` vai no invólucro e não no elemento com a classe
              do módulo CSS — `.identity` declara `display: flex`, e com a
              mesma especificidade ganha quem for escrito depois. */}
          <span className="min-w-0 flex-1 lg:hidden">
            <Link
              href={painel.href("/contabilista")}
              className={styles.identity}
              aria-label={`${ficha.nome} — painel de gestão`}
            >
              <Logo small />
              <span className="min-w-0">
                <span className={styles.identityMeta}>
                  {painel.demonstracao ? "Painel profissional · simulado" : "Painel profissional"}
                </span>
                <span className={`${styles.identityName} block text-ink`}>{ficha.nome}</span>
              </span>
            </Link>
          </span>
          {/* No desktop a identidade está na sidebar; o topo passa a ser
              do ecrã. `TituloDoPainel` é preenchido por cada página. */}
          <div id="painel-titulo" className="hidden min-w-0 shrink-0 lg:block" />
          {/* A busca vive aqui e só aqui: uma segunda instância registava
              um segundo ouvinte de ⌘K e abria duas paletas. A 360px o
              componente encolhe sozinho para o ícone. */}
          <div className="shrink-0 lg:flex lg:min-w-0 lg:flex-1 lg:justify-center">
            <BuscaDoPainel painel={painel} destinos={NAV} contabilistaId={quemPergunta} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* As ações do ecrã montam-se aqui por portal — ver
                `AcoesDoPainel`. É o que a referência mostra no topo:
                pré-visualizar, guardar, exportar, conforme a página. */}
            <div id="painel-acoes" className="flex items-center gap-1.5" />
            {/* Um só sino por layout. Duplicá-lo cria dois listeners Realtime
                com o mesmo nome e volta a provocar a regressão já corrigida. */}
            <SinoNotificacoes />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className={`${styles.content} ${styles.conteudoComSidebar}`}>
        {painel.demonstracao && <FaixaDemonstracao />}
        <ProtecaoTextoPainel>{children}</ProtecaoTextoPainel>
      </main>
      </div>

      {/* O painel tem nove destinos. Em vez de os comprimir numa grelha de
          seis colunas, todos conservam alvo ≥44 px e a barra rola. O destino
          ativo é centrado automaticamente pelo efeito acima. */}
      <nav
        aria-label="Painel de contabilista"
        className={styles.mobileDock}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className={styles.mobileList}>
          {NAV.map(({ href, curto, Icon, porResponder }) => {
            const destino = painel.href(href);
            const ativo = eAtivo(destino, pathname, painel);
            const quantos = porResponder?.(contagens) ?? 0;
            return (
              <li key={href} className={styles.mobileItem}>
                <Link
                  ref={ativo ? ativoMovel : undefined}
                  href={destino}
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
 * O cartão de estado, no fundo da coluna escura.
 *
 * Diz três coisas que valem em qualquer ecrã: se o perfil está visível,
 * quanto falta para estar completo, e se aceita clientes. A percentagem
 * vem de `percentagemDoPerfil` — a mesma função que o editor usa. Não há
 * um segundo cálculo aqui, senão a coluna e o ecrã do perfil mostravam
 * números diferentes do mesmo perfil, lado a lado.
 *
 * ⚠️ Isto NÃO é progressão profissional (§133): completar campos do perfil
 * não dá XP nem baixa comissão. É só o estado de uma página.
 */
function EstadoNaSidebar({ ficha, painel }: { ficha: Contabilista; painel: Painel }) {
  const pct = percentagemDoPerfil(ficha);
  return (
    <Link href={painel.href("/contabilista/perfil")} className={styles.sidebarCartao}>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
        <Check size={14} className="shrink-0 text-brand-mint" aria-hidden />
        Perfil visível
      </p>
      <div
        className={`${styles.sidebarBarra} mt-2.5`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Perfil completo"
      >
        <div className={styles.sidebarBarraProgresso} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-white/60">{pct}% completo</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-white/70">
        {ficha.aceitaNovosClientes ? (
          <>
            <Check size={12} className="shrink-0 text-brand-mint" aria-hidden />
            Aceita novos clientes
          </>
        ) : (
          <>
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
            Sem novas vagas
          </>
        )}
      </p>
      {/* O ecrã da progressão já existe, e este pé continua a dizer «Ver
          perfil» — decisão tomada, não nota por resolver.

          Nas referências este pé diz «Ver progressão», mas as referências
          mostram DOIS cartões diferentes neste sítio: um de perfil (com a
          percentagem) e um de comissão (com o patamar e o XP). Este cartão
          é o do perfil: o número grande que mostra é a completude da
          página. Mandá-lo para a Progressão criava exatamente a confusão
          que a §133 proíbe — que preencher campos do perfil faz subir o
          patamar e baixar a comissão, o que não é verdade.
          A Progressão tem o seu destino próprio na navegação, acima. */}
      <span className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-brand-mint">
        Ver perfil <ArrowRight size={12} aria-hidden />
      </span>
    </Link>
  );
}

/**
 * A pessoa autenticada, no fundo de tudo.
 *
 * O galo abre o que era a antiga linha de rodapé — voltar à conta, ou à
 * administração quando o painel está em demonstração. Colapsado por
 * defeito porque é navegação de saída: usa-se uma vez por sessão.
 */
function PessoaNaSidebar({ ficha, painel }: { ficha: Contabilista; painel: Painel }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      {aberto && (
        <Link
          href={painel.demonstracao ? "/admin" : "/dashboard"}
          className="mb-1 flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={15} aria-hidden />
          {painel.demonstracao ? "Voltar à administração" : "A minha conta"}
        </Link>
      )}
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className={`${styles.sidebarPessoa} focus-marca w-full`}
      >
        <span className="shrink-0 overflow-hidden rounded-full">
          <AvatarContabilista
            contabilistaId={ficha.userId}
            nome={ficha.nome}
            tamanho="sm"
          />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold text-white">{ficha.nome}</span>
          <span className="block truncate text-[0.6875rem] text-white/55">
            {ficha.tituloProfissional ?? "Contabilista"}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-white/50 transition-transform ${aberto ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
    </div>
  );
}

/** O separador ativo, medido contra a base onde o painel está aberto. */
function eAtivo(destino: string, pathname: string, painel: Painel): boolean {
  return destino === painel.base ? pathname === destino : pathname.startsWith(destino);
}

/**
 * A faixa que diz onde a pessoa está.
 *
 * Um painel de demonstração que se parece com o real precisa de o dizer em
 * todos os ecrãs, e não só à entrada: quem entra por ligação direta no
 * separador dos casos não passou por nenhum aviso. A faixa fica no topo do
 * conteúdo — acima da barra de proteção de texto, que também é do painel —
 * e não desaparece com o scroll do separador.
 *
 * «Repor» recarrega a página de propósito: a loja vive em memória e é
 * semeada de novo a cada carregamento, pelo que recarregar É repor. Fingir
 * outro mecanismo daria duas formas de fazer a mesma coisa.
 */
function FaixaDemonstracao() {
  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-brand/25 bg-brand-light/50 px-4 py-3 dark:border-brand/30 dark:bg-brand/10"
    >
      {/* No telemóvel o aviso fica com a linha toda e o botão passa para
          baixo. A partilhar a linha com o botão a 360px, sobravam-lhe cerca
          de 150px e o texto lia-se em coluna, palavra a palavra. */}
      <p className="flex min-w-0 basis-full items-start gap-2.5 text-sm leading-relaxed text-stone-700 sm:flex-1 sm:basis-0 dark:text-stone-200">
        <Eye size={16} className="mt-0.5 shrink-0 text-brand-dark dark:text-brand-mint" aria-hidden />
        <span>
          <strong className="font-semibold">Painel de contabilista em demonstração.</strong>{" "}
          A estrutura, os ecrãs e as regras são os do painel real — os dados são inventados
          e nada disto sai do teu browser. As alterações que fizeres duram até recarregares.
        </span>
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="focus-marca inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-brand/30 bg-white px-3 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-light dark:border-brand/40 dark:bg-stone-900 dark:text-brand-mint"
      >
        <RotateCcw size={14} aria-hidden /> Repor os dados
      </button>
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
