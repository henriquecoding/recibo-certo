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
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/supabase/auth";
import { contagensDoPainel, obterMinhaFicha } from "@/lib/contabilistas/fonte/dados";
import { usarPainel, type Painel } from "@/components/contabilistas/usarPainel";
import {
  DESTINOS, SECCOES, SEM_CONTAGENS, destinoAtivo, hrefDaSeccao,
  porResponderNaSeccao, seccaoDoCaminho,
  type ContagensDoPainel, type SeccaoDoPainel,
} from "@/components/contabilistas/navegacao";
import type { Contabilista } from "@/lib/contabilistas/tipos";
import { contemCodigo } from "@/lib/feedback-sanitize";
import {
  Logo, ArrowLeft, Warning, ShieldCheck, Eye, RotateCcw, Check, ChevronDown,
  ArrowRight, Close,
} from "@/components/ui/Icons";
import { SuperficieModal } from "@/components/overlays/SuperficieModal";
import { percentagemDoPerfil } from "@/lib/contabilistas/perfil";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AvatarContabilista from "@/components/contabilistas/AvatarContabilista";
import BuscaDoPainel from "@/components/contabilistas/BuscaDoPainel";
import SinoNotificacoes from "@/components/contabilistas/SinoNotificacoes";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
// O módulo CSS fica onde estava (`app/contabilista/`): tem quatro
// consumidores, dois deles testes que o leem por caminho. Só a moldura
// mudou de sítio, e o alias é o mesmo que `BuscaDoPainel.tsx` já usa.
import styles from "@/app/contabilista/painel.module.css";
import MotionProvider from "@/components/ui/motion/MotionProvider";

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

export default function MolduraContabilista({ children }: { children: ReactNode }) {
  const { user, carregado, disponivel, abrirModal } = useAuth();
  const pathname = usePathname();
  const painel = usarPainel();
  const [ficha, setFicha] = useState<Contabilista | null>(null);
  const [contagens, setContagens] = useState<ContagensDoPainel>(SEM_CONTAGENS);
  const [aVerificar, setAVerificar] = useState(true);

  // Em que secção é que este ecrã vive. Decide o que a barra lateral abre
  // e se há linha de secção no telemóvel.
  const seccaoAberta = seccaoDoCaminho(pathname, painel.base, painel.href);

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

  // NOTA: aqui vivia um `scrollIntoView` que trazia o destino ativo ao
  // centro da doca. Existia porque a doca tinha dez destinos e rolava na
  // horizontal — metade ficava fora do ecrã, e a barra precisava de
  // JavaScript para se explicar. Com seis secções cabem todas em 320 px e
  // o efeito deixou de ter trabalho: um destino que já está visível não
  // precisa de ser trazido para lado nenhum.

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
          Seis secções numa coluna, e a secção aberta mostra os destinos
          que tem dentro. Eram dez destinos planos: numa calha horizontal
          obrigavam a comprimir ou a rolar, e numa coluna cabiam mas
          pediam à pessoa que guardasse dez categorias de cabeça. */}
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
            {SECCOES.map((seccao) => (
              <SeccaoNaSidebar
                key={seccao.id}
                seccao={seccao}
                aberta={seccao.id === seccaoAberta?.id}
                painel={painel}
                pathname={pathname}
                contagens={contagens}
              />
            ))}
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
          {/* A busca é montada aqui e só aqui: uma segunda instância
              registava um segundo ouvinte de ⌘K e abria duas paletas.
              Abaixo de `lg` o gatilho do topo não se vê e o componente
              mostra, por portal, um dock por cima da navegação inferior —
              ver o quadro em `BuscaDoPainel.tsx`. Este invólucro fica
              `hidden` para não ocupar espaço na linha do telemóvel, onde
              a identidade precisa dele. */}
          <div className="hidden shrink-0 lg:flex lg:min-w-0 lg:flex-1 lg:justify-center">
            {/* A paleta indexa as DEZ folhas, e não as seis secções: uma
                pesquisa que só chegasse ao nível de cima obrigava a passar
                por uma secção para lá chegar, que é exatamente o trabalho
                que ela existe para poupar. */}
            <BuscaDoPainel painel={painel} destinos={DESTINOS} contabilistaId={quemPergunta} />
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
            {/* A saída do painel, no telemóvel. Acima de `lg` isto vive no
                fundo da barra lateral — ver `PessoaNaSidebar`. */}
            <ContaNoTopo ficha={ficha} painel={painel} />
          </div>
        </div>
      </header>

      <main className={`${styles.content} ${styles.conteudoComSidebar}`}>
        {painel.demonstracao && <FaixaDemonstracao />}
        {/* Abaixo de `lg` não há barra lateral para abrir a secção — a
            linha faz esse trabalho. Acima, seria a mesma escolha escrita
            duas vezes no mesmo ecrã. */}
        <LinhaDaSeccao
          seccao={seccaoAberta}
          painel={painel}
          pathname={pathname}
          contagens={contagens}
        />
        <ProtecaoTextoPainel><MotionProvider>{children}</MotionProvider></ProtecaoTextoPainel>
      </main>
      </div>

      {/* Seis secções, e por isso já não é preciso rolar: em 320 px cabem
          todas com alvo ≥44 px. Eram dez destinos planos, e mais de metade
          vivia fora do ecrã — visível apenas para quem soubesse arrastar
          uma barra que não parecia arrastável. */}
      <nav
        aria-label="Painel de contabilista"
        className={styles.mobileDock}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className={styles.mobileList}>
          {SECCOES.map((seccao) => {
            const destino = painel.href(hrefDaSeccao(seccao));
            const ativa = seccao.id === seccaoAberta?.id;
            const quantos = porResponderNaSeccao(seccao, contagens);
            const { Icon } = seccao;
            return (
              <li key={seccao.id} className={styles.mobileItem}>
                <Link
                  href={destino}
                  /* Uma secção com destinos lá dentro NÃO é a página atual —
                     é a secção onde ela vive, e quem diz «page» é a linha de
                     secção logo acima do conteúdo. Com `page` nos dois, um
                     leitor de ecrã ouvia «Negócio, página atual» e a seguir
                     «Fidelidade, página atual»: duas respostas diferentes à
                     mesma pergunta. `true` é o que a ARIA tem para «o item
                     atual deste conjunto», sem prometer mais do que isso. */
                  aria-current={ativa ? (seccao.destinos.length === 1 ? "page" : true) : undefined}
                  className={`${styles.mobileLink} ${ativa ? styles.mobileLinkActive : ""}`}
                >
                  <span className="relative">
                    <Icon size={19} aria-hidden />
                    {quantos > 0 && (
                      <span
                        className={styles.pontoPorResponder}
                        aria-label={`${quantos} por responder`}
                      />
                    )}
                  </span>
                  <span className="max-w-full truncate">{seccao.curto}</span>
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
 * Uma secção na coluna escura — e, quando é a aberta, o que tem dentro.
 *
 * Uma secção de um só destino é um link e mais nada: abri-la para revelar
 * uma linha igual ao cabeçalho seria pedir um clique para não dizer nada.
 *
 * Quando tem destinos a sério, o realce forte vai para a PÁGINA e não para
 * a secção: a secção fica em texto branco (estás aqui) e o destino aberto
 * fica com a superfície clara (é isto que estás a ver). Realçar os dois da
 * mesma maneira dava duas linhas a dizer «página atual» na mesma coluna.
 */
function SeccaoNaSidebar({
  seccao, aberta, painel, pathname, contagens,
}: {
  seccao: SeccaoDoPainel;
  aberta: boolean;
  painel: Painel;
  pathname: string;
  contagens: ContagensDoPainel;
}) {
  const { Icon } = seccao;
  const sozinha = seccao.destinos.length === 1;
  const destinoDaSeccao = painel.href(hrefDaSeccao(seccao));
  const quantos = porResponderNaSeccao(seccao, contagens);

  return (
    <li>
      <Link
        href={destinoDaSeccao}
        /* «page» só quando a secção É a página. Tendo destinos lá dentro,
           a página é um deles — e é esse que o diz, uma linha abaixo. */
        aria-current={aberta ? (sozinha ? "page" : true) : undefined}
        className={`${styles.sidebarLink} ${
          aberta ? (sozinha ? styles.sidebarLinkActive : styles.sidebarLinkAberta) : ""
        }`}
      >
        <Icon size={17} aria-hidden />
        <span className="min-w-0 truncate">{seccao.label}</span>
        {/* Na secção fechada, o distintivo soma o que está por responder
            lá dentro — senão um pedido em «Partilhas» ficava invisível
            enquanto a secção não fosse aberta. Na aberta cala-se: os
            destinos por baixo dizem-no com precisão. */}
        {quantos > 0 && !aberta && (
          <span className={styles.sidebarBadge}>
            {quantos}
            <span className="sr-only"> por responder</span>
          </span>
        )}
      </Link>

      {aberta && !sozinha && (
        <ul className={styles.sidebarFilhos}>
          {seccao.destinos.map((d) => {
            const destino = painel.href(d.href);
            const ativo = destinoAtivo(destino, pathname, painel.base);
            const espera = d.porResponder?.(contagens) ?? 0;
            return (
              <li key={d.href}>
                <Link
                  href={destino}
                  aria-current={ativo ? "page" : undefined}
                  className={`${styles.sidebarFilho} ${ativo ? styles.sidebarFilhoAtivo : ""}`}
                >
                  <span className="min-w-0 truncate">{d.label}</span>
                  {espera > 0 && (
                    <span className={styles.sidebarBadge}>
                      {espera}
                      <span className="sr-only"> por responder</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/**
 * A linha da secção, no telemóvel.
 *
 * São LIGAÇÕES e não separadores, e a diferença não é de estilo: cada uma
 * leva a um endereço próprio, com histórico e com «abrir noutro
 * separador». Um `role="tab"` prometeria um painel que muda no mesmo sítio
 * — e não é isso que acontece.
 *
 * Só aparece onde tem trabalho: numa secção de um só destino não há nada
 * para escolher, e a linha seria uma barra a repetir o nome do ecrã.
 */
function LinhaDaSeccao({
  seccao, painel, pathname, contagens,
}: {
  seccao: SeccaoDoPainel | undefined;
  painel: Painel;
  pathname: string;
  contagens: ContagensDoPainel;
}) {
  if (!seccao || seccao.destinos.length === 1) return null;

  return (
    <nav aria-label={`Secção ${seccao.label}`} className={`${styles.linhaSeccao} lg:hidden`}>
      <ul className={styles.linhaSeccaoLista}>
        {seccao.destinos.map((d) => {
          const destino = painel.href(d.href);
          const ativo = destinoAtivo(destino, pathname, painel.base);
          const espera = d.porResponder?.(contagens) ?? 0;
          const { Icon } = d;
          return (
            <li key={d.href}>
              <Link
                href={destino}
                aria-current={ativo ? "page" : undefined}
                className={`${styles.linhaSeccaoLink} ${ativo ? styles.linhaSeccaoLinkAtivo : ""} focus-marca`}
              >
                <Icon size={14} aria-hidden />
                {d.label}
                {espera > 0 && (
                  <span className={styles.linhaSeccaoContagem}>
                    {espera}
                    <span className="sr-only"> por responder</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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

/**
 * ═════════════════════════════════════════════════════════════════════════
 *  A SAÍDA DO PAINEL, NO TELEMÓVEL
 *  -----------------------------------------------------------------------
 *  ┌───────────────────────────────────────────────────────────────────────┐
 *  │ NÃO HAVIA NENHUMA — E ISSO NÃO É UM DETALHE                            │
 *  │                                                                       │
 *  │ A forma de sair do painel de gestão vive no fundo da barra lateral     │
 *  │ (`PessoaNaSidebar`): carrega-se na pessoa e abre «Voltar à             │
 *  │ administração» ou «A minha conta». A barra lateral é `display: none`   │
 *  │ abaixo de 1024 px.                                                    │
 *  │                                                                       │
 *  │ Ou seja: no telemóvel entrava-se no painel e não se saía. Os nove      │
 *  │ destinos da barra de baixo são todos DENTRO do painel, a identidade    │
 *  │ do topo leva ao painel, e não havia mais nada. A única saída era o     │
 *  │ botão «voltar» do browser, que só funciona para quem lá chegou nesta   │
 *  │ sessão — quem abrisse o painel por ligação direta, ou lá estivesse há  │
 *  │ dez ecrãs, ficava sem caminho nenhum de volta ao produto.              │
 *  │                                                                       │
 *  │ O lugar na barra do topo existe porque a pesquisa saiu de lá para o    │
 *  │ dock por cima da navegação (ver `BuscaDoPainel.tsx`). Sem essa troca   │
 *  │ seriam quatro alvos e a identidade a disputar 360 px.                  │
 *  │                                                                       │
 *  │ Uma folha e não um menu ancorado: em 360 px um popover de 16 rem       │
 *  │ encostado à direita ou sai do ecrã ou fica colado à margem, e a folha  │
 *  │ é o padrão que o resto do produto já usa no telemóvel.                 │
 *  └───────────────────────────────────────────────────────────────────────┘
 * ═════════════════════════════════════════════════════════════════════════
 */
function ContaNoTopo({ ficha, painel }: { ficha: Contabilista; painel: Painel }) {
  const [aberto, setAberto] = useState(false);
  const gatilho = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Mudar de ecrã fecha: uma folha que sobrevive à navegação fica a tapar
  // a página onde a pessoa acabou de aterrar.
  useEffect(() => setAberto(false), [pathname]);

  const saida = painel.demonstracao
    ? { href: "/admin", label: "Voltar à administração" }
    : { href: "/dashboard", label: "A minha conta" };

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label="Conta e saída do painel"
        className="focus-marca flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl lg:hidden"
      >
        <span className="pointer-events-none overflow-hidden rounded-lg">
          <AvatarContabilista contabilistaId={ficha.userId} nome={ficha.nome} tamanho="sm" />
        </span>
      </button>

      <SuperficieModal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        rotulo="Conta e saída do painel"
        focoDeRegresso={() => gatilho.current}
        className="fixed inset-0 z-[120] lg:hidden"
      >
        <div
          className="absolute inset-0 bg-stone-950/45 backdrop-blur-sm"
          onClick={() => setAberto(false)}
          aria-hidden
        />
        {/* Sem variantes `dark:` nestes neutros: a camada `.dark` do
            `globals.css` já remapeia `bg-white`, `border-stone-*` e a
            escala de texto para a palete quente do painel. Redeclará-las
            aqui ganha à camada e dá duas paletes escuras no mesmo produto
            — ver `contabilistas-painel-coerencia.test.ts`. */}
        <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-stone-200 bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
            <span className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 overflow-hidden rounded-full">
                <AvatarContabilista contabilistaId={ficha.userId} nome={ficha.nome} tamanho="sm" />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-semibold text-ink">{ficha.nome}</span>
                <span className="block truncate text-xs text-stone-500">
                  {ficha.tituloProfissional ?? "Contabilista"}
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar"
              className="focus-marca flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100"
            >
              <Close size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
            <Link
              href={saida.href}
              className="focus-marca flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-ink no-underline transition-colors hover:bg-stone-50"
            >
              <ArrowLeft size={16} className="shrink-0 text-brand" aria-hidden />
              {saida.label}
            </Link>
          </div>
        </div>
      </SuperficieModal>
    </>
  );
}

// NOTA: `eAtivo` vivia aqui e comparava com `startsWith` puro. Passou a
// ser `destinoAtivo`, em `navegacao.tsx`, porque agora três superfícies
// fazem a mesma pergunta — barra lateral, linha de secção e doca — e uma
// regra escrita três vezes diverge à primeira afinação. A comparação
// também deixou de ser um prefixo de texto: `/contabilista/trabalho` já
// não pode acender por causa de um futuro `/contabilista/trabalhos`.

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
      <p className="flex min-w-0 basis-full items-start gap-2.5 text-sm leading-relaxed text-stone-700 sm:flex-1 sm:basis-0">
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
        className="focus-marca inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-brand/30 bg-white px-3 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-light dark:border-brand/40 dark:text-brand-mint"
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
