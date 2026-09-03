"use client";

// ═══════════════════════════════════════════════════════════════════════
//  SINO — o que aconteceu enquanto não estavas a olhar
//  ---------------------------------------------------------------------
//  Só mostra o que PEDE alguma coisa: uma mensagem para responder, um
//  pedido de vínculo para decidir, uma consulta para confirmar, o limite
//  do IVA a aproximar-se. Nada de «alguém viu o teu perfil» — um sino que
//  toca por tudo deixa de se ouvir.
//
//  Chega por Realtime. Sem sondagem: um `setInterval` a perguntar de dez
//  em dez segundos gasta o plano gratuito a fazer nada na maior parte das
//  vezes, e mesmo assim chega tarde.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ ESTE PAINEL NUNCA CHEGOU A VER-SE. TRÊS RAZÕES INDEPENDENTES.        │
//  │                                                                     │
//  │ Nenhuma delas dava erro. O botão abria, o `aria-expanded` passava a  │
//  │ `true`, o painel existia no DOM com o texto todo lá dentro — e não   │
//  │ havia nada no ecrã. Só se apanham com um browser, com sessão, a      │
//  │ medir o que está pintado.                                            │
//  │                                                                     │
//  │ 1. `opacity: 0`, SEMPRE. O painel era um `m.div` do `motion`, e o    │
//  │    `MotionProvider` do painel envolve só o `<main>` — o sino vive no │
//  │    cabeçalho e na barra lateral, FORA dele. Sem as features do       │
//  │    LazyMotion, um `m.*` não anima: fica congelado no `initial`, que  │
//  │    aqui era `opacity: 0, y: 8, scale: 0.99`. Medido no browser:      │
//  │    `opacity: 0; transform: translateY(8px) scale(0.99)`, para        │
//  │    sempre. Por isso a entrada passou a ser CSS (`rc-dialogo-entrada` │
//  │    em `globals.css`), que não tem estado inicial por onde falhar —   │
//  │    e de caminho tira o `motion` do chrome do painel.                 │
//  │                                                                     │
//  │ 2. ABRIA INTEIRO ABAIXO DA DOBRA, no computador. Ver `ancoragem`.   │
//  │                                                                     │
//  │ 3. NÃO EXISTIA NO TELEMÓVEL. Vivia no rodapé da `Sidebar`, que é     │
//  │    `hidden lg:flex`. E, posto no cabeçalho, ficava atrás da barra    │
//  │    de navegação inferior — daí o portal, o mesmo remédio e a mesma   │
//  │    razão do dock da pesquisa.                                        │
//  │                                                                     │
//  │ E uma quarta, que se via mas mentia: O ERRO DA LEITURA ERA ENGOLIDO  │
//  │ (`catch(() => {})`), e uma falha de rede dava o mesmo ecrã que «não  │
//  │ tens avisos».                                                        │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ⚠️ NÃO ESCREVER `dark:` NOS NEUTROS. Este ficheiro não tem uma única
//  classe `dark:`, e é assim de propósito: o modo escuro deste projeto é
//  uma camada `.dark` em `globals.css` que já remapeia `bg-white`,
//  `text-ink`, `border-stone-*`, `text-stone-*`, `hover:bg-cream` e os
//  hovers todos que aqui se usam — para uma palete QUENTE (#1e221b).
//  Escrever `dark:bg-stone-900` contorna essa camada e ganha-lhe, e o
//  resultado é uma segunda palete escura, fria, a um clique da primeira.
//  `contabilistas-painel-coerencia.test.ts` reprova quem o fizer.
//
//  O estado vive em `lib/notificacoes/loja.ts`. Foi de lá que veio a
//  correção do ponto 1: enquanto o canal Realtime era propriedade DESTE
//  componente, dois sinos eram dois canais e havia uma regra a proibir o
//  segundo — e era essa regra que mantinha o sino fora do telemóvel. Agora
//  o canal é da loja e abre-se uma vez, quantos sinos haja.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/supabase/auth";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { descreverNotificacao } from "@/lib/notificacoes/catalogo";
import { quando } from "@/lib/notificacoes/tempo";
import type { Notificacao } from "@/lib/contabilistas/fonte/conversa";
import {
  BellAlert, Briefcase, Calendar, Check, Close, Coin, Export, FileSign, Gift,
  Handshake, Mail, MapPin, RotateCcw, Scale, Shield, ShieldCheck, Trophy,
} from "@/components/ui/Icons";

type Icone = React.ComponentType<{ size?: number; className?: string }>;

/**
 * As chaves de `CATALOGO_NOTIFICACOES` → ícones.
 *
 * Um mapa local e não o `iconeDe` das ferramentas: aquele serve um
 * catálogo com outra vida e outras chaves, e acrescentar-lhe entradas por
 * causa dos avisos punha dois domínios a partilhar uma lista que um teste
 * de cada lado valida. `notificacoes.test.ts` garante que este mapa cobre
 * o catálogo inteiro.
 */
export const ICONES_AVISO: Record<string, Icone> = {
  BellAlert, Briefcase, Calendar, Check, Close, Coin, Export, FileSign, Gift,
  Handshake, Mail, MapPin, Scale, Shield, ShieldCheck, Trophy,
};

export default function SinoNotificacoes() {
  const { user, carregado, disponivel } = useAuth();
  const { avisos, estado, porLer, haMais, marcarLida, marcarTodas, recarregar, verMais } =
    useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  const fechar = useCallback(() => setAberto(false), []);

  // ── Folha ou pastilha ─────────────────────────────────────────────
  //
  // Começa em `false` e só muda num efeito: no servidor não há
  // `matchMedia`, e decidir isto durante a hidratação daria uma árvore
  // diferente da que foi servida.
  const [ehFolha, setEhFolha] = useState(false);
  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 639px)");
    const ler = () => setEhFolha(consulta.matches);
    ler();
    consulta.addEventListener("change", ler);
    return () => consulta.removeEventListener("change", ler);
  }, []);

  // ── Para onde é que a pastilha abre ───────────────────────────────
  //
  // ┌─────────────────────────────────────────────────────────────────────┐
  // │ NO COMPUTADOR, O PAINEL ABRIA INTEIRO ABAIXO DA DOBRA                │
  // │                                                                     │
  // │ Medido, num browser, com sessão: janela de 900px, botão em y=848,    │
  // │ painel de 907 a 1483 — VISÍVEL 0%. E o mesmo a 768px e a 1080px,     │
  // │ porque o sino vive no RODAPÉ de uma barra lateral `h-screen`: por    │
  // │ mais alta que seja a janela, o botão está sempre no fundo dela, e    │
  // │ `top-12` põe o painel 48px ABAIXO disso.                             │
  // │                                                                     │
  // │ Não dava erro nenhum. O botão abria, o `aria-expanded` passava a     │
  // │ `true`, o painel existia no DOM — e não havia nada para ver. Somado  │
  // │ a não existir no telemóvel, o sino não era alcançável em lado        │
  // │ nenhum.                                                             │
  // │                                                                     │
  // │ É o mesmo remédio do `MenuFlutuante` do painel modular, e pela mesma │
  // │ razão: um menu no fundo do ecrã tem de saber virar-se para cima.     │
  // └─────────────────────────────────────────────────────────────────────┘
  //
  // A decisão é por medição e não por sítio: o mesmo componente vive no
  // rodapé da barra lateral (abre para cima) e no cabeçalho do painel de
  // contabilista (abre para baixo). Fixá-la num dos dois partia o outro.
  const [ancoragem, setAncoragem] = useState<{ paraCima: boolean; alturaMax: number } | null>(null);

  useLayoutEffect(() => {
    if (!aberto || ehFolha) { setAncoragem(null); return; }
    const alvo = botao.current;
    if (!alvo) return;

    const medir = () => {
      const r = alvo.getBoundingClientRect();
      const MARGEM = 16;
      // O painel encosta-se ao botão a 12 (3rem) de distância, dos dois lados.
      const abaixo = window.innerHeight - r.bottom - MARGEM - 12;
      const acima = r.top - MARGEM - 12;
      const paraCima = abaixo < acima;
      setAncoragem({
        paraCima,
        // Nunca mais alto do que o espaço que existe — senão a correção
        // trocava «abaixo da dobra» por «acima dela».
        alturaMax: Math.max(180, Math.min(paraCima ? acima : abaixo, window.innerHeight * 0.7)),
      });
    };

    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [aberto, ehFolha]);

  // ── Fechar ao clicar fora ─────────────────────────────────────────
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      // `painel` também, e não só `caixa`: no telemóvel a folha sai por
      // portal e deixa de estar dentro da caixa do botão. Sem isto, um
      // clique DENTRO da própria folha fechava-a.
      if (caixa.current?.contains(alvo) || painel.current?.contains(alvo)) return;
      setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  // ── Teclado e foco ────────────────────────────────────────────────
  //
  // Antes: `Escape` fechava e mais nada. Abrir com o teclado deixava o foco
  // no botão, e a lista — que é toda ligações — ficava atrás de um Tab que
  // passava por ela sem entrar. Um diálogo que se anuncia como diálogo e
  // não recebe o foco é pior do que um `<div>`.
  //
  // Não leva `aria-modal`: acima de `sm` o painel é uma pastilha ancorada e
  // o resto da página continua alcançável com o rato. Dizer o contrário ao
  // leitor de ecrã seria mentir-lhe sobre o que está inerte.
  useEffect(() => {
    if (!aberto) return;
    const container = painel.current;
    const anterior = document.activeElement as HTMLElement | null;

    const focaveis = () =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    (focaveis()[0] ?? container)?.focus();

    // O bloqueio do scroll é SÓ no telemóvel, onde o painel é uma folha com
    // véu por cima da página. Acima de `sm` é uma pastilha de 20rem no
    // canto, e prender a página inteira por causa dela seria roubar o
    // scroll a quem só queria espreitar.
    const overflowAntes = document.body.style.overflow;
    if (ehFolha) document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setAberto(false);
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const alvos = focaveis();
      if (alvos.length === 0) return;
      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];
      const atual = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (atual === primeiro || !container.contains(atual))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (atual === ultimo || !container.contains(atual))) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (ehFolha) document.body.style.overflow = overflowAntes;
      // Devolver o foco a quem o tinha. `botao.current` como alternativa
      // porque o painel pode ter fechado por navegação.
      (anterior ?? botao.current)?.focus?.();
    };
  }, [aberto, ehFolha]);

  const abrirAviso = useCallback(
    (n: Notificacao) => {
      marcarLida(n.id);
      setAberto(false);
    },
    [marcarLida],
  );

  if (!carregado || !user || !disponivel) return null;

  const rotulo = porLer > 0 ? `Notificações: ${porLer} por ler` : "Notificações";

  const conteudo = (
    <>
      {aberto && (
        <>
          {/* O véu é do telemóvel. Acima de `sm` a pastilha vive ancorada
              ao botão e o resto da página fica como estava. */}
          <div
            aria-hidden
            onClick={fechar}
            className="rc-overlay-entrada fixed inset-0 z-[65] bg-black/40 backdrop-blur-[2px] sm:hidden"
          />
          <div
            ref={painel}
            tabIndex={-1}
            role="dialog"
            aria-label="Notificações"
            // Telemóvel: folha inferior, como o resto dos modais do
            // produto — `max-h-[85dvh]`, `safe-area`, corpo com
            // `min-h-0 overflow-y-auto`. A partir de `sm`, pastilha
            // ancorada ao botão — para baixo ou para cima, conforme o
            // espaço que houver (ver `ancoragem`).
            className={`rc-dialogo-entrada fixed inset-x-0 bottom-0 z-[70] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-4xl border border-stone-200 bg-white shadow-float focus:outline-none sm:absolute sm:inset-x-auto sm:right-0 sm:z-50 sm:w-80 sm:rounded-3xl ${
              ancoragem?.paraCima
                ? "sm:bottom-12 sm:top-auto"
                : "sm:bottom-auto sm:top-12"
            }`}
            style={ancoragem ? { maxHeight: `${Math.round(ancoragem.alturaMax)}px` } : undefined}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
              <h2 className="font-display text-base text-ink">Notificações</h2>
              <span className="flex items-center gap-1">
                {porLer > 0 && (
                  <button
                    type="button"
                    onClick={marcarTodas}
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-light"
                  >
                    <Check size={13} aria-hidden /> Marcar lidas
                  </button>
                )}
                <button
                  type="button"
                  onClick={fechar}
                  aria-label="Fechar"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 sm:hidden"
                >
                  <Close size={16} aria-hidden />
                </button>
              </span>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] sm:pb-0">
              {estado === "a-carregar" && avisos.length === 0 ? (
                <ul className="space-y-2 p-4" aria-label="A carregar avisos">
                  {[0, 1, 2].map((i) => (
                    <li
                      key={i}
                      className="h-14 animate-pulse rounded-2xl bg-stone-100"
                    />
                  ))}
                </ul>
              ) : estado === "erro" ? (
                // Um erro de leitura tem de se distinguir de «não há
                // nada»: eram o mesmo ecrã, e o mesmo ecrã diz a coisa
                // errada metade das vezes.
                <div className="px-4 py-8 text-center">
                  <p className="text-sm leading-relaxed text-stone-500">
                    Não conseguimos ler os teus avisos.
                    <br />
                    Podem existir e não estarem aqui.
                  </p>
                  <button
                    type="button"
                    onClick={recarregar}
                    className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
                  >
                    <RotateCcw size={13} aria-hidden /> Tentar outra vez
                  </button>
                </div>
              ) : avisos.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm leading-relaxed text-stone-400">
                  Nada por aqui.
                  <br />
                  Avisamos-te quando houver.
                </p>
              ) : (
                <>
                  <ul>
                    {avisos.map((n) => (
                      <LinhaAviso key={n.id} aviso={n} aoAbrir={abrirAviso} />
                    ))}
                  </ul>
                  {haMais && (
                    <div className="border-t border-stone-100 p-2">
                      <button
                        type="button"
                        onClick={verMais}
                        className="w-full rounded-xl px-3 py-2.5 text-xs font-semibold text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
                      >
                        Ver mais antigos
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <div ref={caixa} className="relative">
      <button
        ref={botao}
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={rotulo}
        // 36px, e não 40: é a medida do `ThemeToggle` e do `BotaoNovidades`,
        // que são os vizinhos deste botão nas três superfícies onde ele
        // vive. Quatro pixéis a mais faziam-no parecer outro nível de
        // controlo — e, no cabeçalho do telemóvel a 320px, empurravam o
        // logótipo o suficiente para o encolher.
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <BellAlert size={18} aria-hidden />
        {porLer > 0 && (
          <span
            aria-hidden
            className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand px-1 text-[0.625rem] font-bold tabular-nums text-white"
          >
            {porLer > 9 ? "9+" : porLer}
          </span>
        )}
      </button>

      {/* A contagem dita, e só quando muda. O `aria-label` do botão também
          a leva, mas só se ouve a quem lá for com o foco — e um aviso que
          chega enquanto se está noutro sítio da página não chegaria a
          ninguém. `polite` para não cortar o que está a ser lido. */}
      <span aria-live="polite" className="sr-only">
        {porLer > 0 ? `${porLer} ${porLer === 1 ? "aviso por ler" : "avisos por ler"}` : ""}
      </span>

      {/* No telemóvel a folha sai por PORTAL, e não é preferência de
          arrumação: o sino vive dentro de um cabeçalho `sticky z-40`, que é
          um contexto de empilhamento — nenhum `z-index` de um filho seu
          consegue passar por cima da barra de navegação inferior, que é
          irmã do cabeçalho e vem depois no DOM. Sem o portal, o fundo da
          folha ficava escondido atrás dos cinco lugares.

          Acima de `sm` não há portal nenhum: a pastilha é `absolute` e tem
          de ficar ancorada ao botão. */}
      {ehFolha ? createPortal(conteudo, document.body) : conteudo}
    </div>
  );
}

function LinhaAviso({
  aviso,
  aoAbrir,
}: {
  aviso: Notificacao;
  aoAbrir: (n: Notificacao) => void;
}) {
  const { icone, exigencia } = descreverNotificacao(aviso.tipo);
  const Icone = ICONES_AVISO[icone] ?? BellAlert;
  const porLer = !aviso.lidaEm;

  const conteudo = (
    <span className="flex items-start gap-3">
      <span
        aria-hidden
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          // `text-brand` sem `dark:` de propósito: a camada `.dark` de
          // `globals.css` já o remapeia para o verde-menta do tema. Escrever
          // um `dark:text-*` aqui era duplicar a decisão num sítio que a
          // afinação do tema não conhece.
          porLer && exigencia === "decidir"
            ? "bg-brand/10 text-brand"
            : "bg-stone-100 text-stone-400"
        }`}
      >
        <Icone size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm ${
            porLer
              ? "font-semibold text-stone-800"
              : "text-stone-600"
          }`}
        >
          {aviso.titulo}
        </span>
        {aviso.corpo && (
          <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">
            {aviso.corpo}
          </span>
        )}
        <span className="mt-1 block text-xs text-stone-400">
          <Quando iso={aviso.criadoEm} />
        </span>
      </span>
      {porLer && (
        <span
          aria-hidden
          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand"
        />
      )}
    </span>
  );

  const classe =
    "block w-full px-4 py-3 text-left transition-colors hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand";

  return (
    <li className="border-b border-stone-100 last:border-0">
      {aviso.url ? (
        <Link href={aviso.url} onClick={() => aoAbrir(aviso)} className={classe}>
          {conteudo}
        </Link>
      ) : (
        <button type="button" onClick={() => aoAbrir(aviso)} className={classe}>
          {conteudo}
        </button>
      )}
    </li>
  );
}

/**
 * «há 5 min», «ontem», «12 ago». Relativo enquanto ajuda, absoluto depois.
 *
 * Vivo, e não calculado uma vez no render: um painel aberto durante dez
 * minutos dizia «agora» a um aviso de dez minutos. Um minuto de intervalo
 * chega — a unidade mais fina que isto mostra é o minuto — e só corre
 * enquanto o painel está montado.
 */
function Quando({ iso }: { iso: string }) {
  const [texto, setTexto] = useState(() => quando(iso));

  useEffect(() => {
    setTexto(quando(iso));
    const t = setInterval(() => setTexto(quando(iso)), 60_000);
    return () => clearInterval(t);
  }, [iso]);

  return (
    <time dateTime={iso} title={new Intl.DateTimeFormat("pt-PT", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(iso))}>
      {texto}
    </time>
  );
}
