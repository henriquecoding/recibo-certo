"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import { LancadorBusca } from "@/components/busca/LancadorBusca";
import { MenuConta } from "@/components/header/MenuConta";
import { useBuscaAberta } from "@/components/busca/motor";
import { Logo, ArrowRight, ChevronDown, Menu as MenuIcon } from "@/components/ui/Icons";
import { useAuth } from "@/lib/supabase/auth";
import BarraSecoes from "@/components/navegacao/BarraSecoes";
import CapsulaNav from "@/components/navegacao/CapsulaNav";
import MenuCompleto from "@/components/navegacao/MenuCompleto";
import type { FocoHomepage } from "@/lib/foco-homepage";

/**
 * O cabeçalho de secretária — três linhas, sempre as mesmas.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ A PESQUISA É O ELEMENTO CENTRAL, E UM ELEMENTO CENTRAL PRECISA DE ESPAÇO │
 * │                                                                         │
 * │ Estava espremida entre os links e os botões, com 200 px e um rótulo      │
 * │ «Pesquisar…» — do tamanho de um detalhe, num produto onde encontrar a    │
 * │ ferramenta certa É a tarefa. Agora tem uma linha só para si, com largura │
 * │ a sério, e a navegação por cima diz onde se está.                        │
 * │                                                                         │
 * │ A partir dos primeiros 40 px de scroll a atenção é do conteúdo: a        │
 * │ navegação recolhe, a barra encolhe para junto da marca e o cabeçalho     │
 * │ fica numa linha. Continua no mesmo eixo e à mesma distância do topo do   │
 * │ ecrã. Muda de tamanho; nunca muda de sítio.                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PORQUE HÁ UM ESPAÇADOR EM FLUXO COM ALTURA CONSTANTE                     │
 * │                                                                         │
 * │ Um cabeçalho que encolhe E ocupa espaço no fluxo é uma realimentação,    │
 * │ não um efeito: encolher tira altura ao documento, o documento fica mais  │
 * │ curto, o browser reajusta a posição de scroll, o reajuste atravessa o    │
 * │ limiar ao contrário, e ele volta a crescer.                              │
 * │                                                                         │
 * │ Fora do fluxo — `fixed`, com um espaçador que reserva SEMPRE a altura    │
 * │ máxima — o problema deixa de poder existir.                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
const ACAO =
  "btn-shine focus-marca inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-5 text-sm font-semibold text-white no-underline shadow-glow transition-shadow hover:shadow-float";

export default function Nav({ foco = null }: { foco?: FocoHomepage | null }) {
  const { disponivel, user } = useAuth();
  const [rolado, setRolado] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ DOIS ESTADOS, PORQUE SÃO DUAS PERGUNTAS — E JUNTÁ-LOS DAVA UM SALTO│
   * │                                                                   │
   * │   `abertoManual`        a escolha de quem lá está. Nasce ABERTO.   │
   * │                        É esta que decide quanto espaço a PÁGINA    │
   * │                        reserva (`data-reserva`).                   │
   * │   `recolhidoPorScroll`  um esconder passageiro, por se ter descido │
   * │                        na página. NUNCA toca no espaço reservado.  │
   * │                                                                   │
   * │ Porque não é um estado só: o espaçador está EM FLUXO. Encolhê-lo   │
   * │ a meio da página tira 116 px ao documento, e todo o conteúdo salta │
   * │ para cima debaixo dos olhos de quem está a ler — a rolar, que é o  │
   * │ pior momento possível. Congelar a reserva não custa nada, porque   │
   * │ nessa altura ela está fora do ecrã, acima da dobra.                │
   * │                                                                   │
   * │ O clique pode mexer na reserva: é causa directa, lê-se como o      │
   * │ cartão a abrir e a fechar, e no topo da página é a única forma de  │
   * │ o espaço voltar mesmo a ser da página.                             │
   * └───────────────────────────────────────────────────────────────────┘
   */
  const [abertoManual, setAbertoManual] = useState(true);
  const [recolhidoPorScroll, setRecolhidoPorScroll] = useState(false);
  const buscaAberta = useBuscaAberta();

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ DERIVADO, E NÃO UM EFEITO — E A DIFERENÇA É UM DEFEITO DE FOCO       │
   * │                                                                     │
   * │ Pedir a pesquisa tem de abrir o cartão no MESMO render, porque é     │
   * │ nesse render que o painel monta e vai buscar o campo. Com um efeito  │
   * │ a fazer a expansão, haveria um commit em que `aberto` já é verdade e │
   * │ o campo ainda está em `hidden` — e um elemento escondido não aceita  │
   * │ foco. Derivar resolve-o por construção.                              │
   * │                                                                     │
   * │ O efeito abaixo é outra coisa: FIXA a expansão. Sem ele, fechar o    │
   * │ painel com Escape recolhia o cartão no mesmo commit em que o         │
   * │ `LancadorBusca` devolve o foco ao campo — e o campo já não estaria   │
   * │ lá. Usar a pesquisa passa a deixar o cabeçalho aberto, que é também  │
   * │ o que a pessoa espera depois de o ter aberto para procurar.           │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  const corpoVisivel = (abertoManual && !recolhidoPorScroll) || buscaAberta;

  useEffect(() => {
    if (buscaAberta) {
      setAbertoManual(true);
      setRecolhidoPorScroll(false);
    }
  }, [buscaAberta]);

  /**
   * O clique tem DOIS significados, e ler mal qual deles é fecha o cartão a
   * quem estava a pedir para o abrir.
   *
   * Recolhido por ter descido na página, a lingueta diz «Navegação e
   * pesquisa» — carregar nela é ABRIR. Alternar `abertoManual` aqui punha-o
   * a `false` (estava a `true` todo este tempo, só escondido) e o cartão
   * ficava fechado com o mesmo aspecto, como se o clique não tivesse feito
   * nada.
   */
  const alternar = () => {
    if (recolhidoPorScroll) {
      setRecolhidoPorScroll(false);
      setAbertoManual(true);
      return;
    }
    setAbertoManual((antes) => !antes);
  };

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ O QUE RECOLHE AO ROLAR — E O QUE JÁ SE TENTOU RECOLHER E NÃO PODE    │
   * │                                                                     │
   * │ Recolhe a NAVEGAÇÃO e a PESQUISA. Fica a linha da marca, com as      │
   * │ secções, a conta e o «Começar». É a diferença que interessa: já se   │
   * │ tentou recolher a linha de cima, e sumirem a marca, as secções, a    │
   * │ conta e o «Começar» ao mesmo gesto lê-se como avaria. Foi a queixa   │
   * │ que originou a regra, e a regra continua de pé.                       │
   * │                                                                     │
   * │ Recolher a da pesquisa já partiu o teclado uma vez: com o campo em   │
   * │ `display:none`, fechar o painel com Escape deixava o foco no         │
   * │ `<body>`, porque o efeito que o devolve chama `focus()` num elemento │
   * │ que já não é focável. Por isso há aqui DUAS defesas, e não uma:      │
   * │   · `corpoVisivel` inclui `buscaAberta` — com o painel aberto, o     │
   * │     campo existe, aconteça o que acontecer ao scroll;                │
   * │   · o observador abaixo recusa-se a recolher se o foco estiver lá    │
   * │     dentro. Ninguém perde o cursor por ter rolado a página.           │
   * │                                                                     │
   * │ O `verificar-cabecalho.mjs` apanhou esse defeito da primeira vez e   │
   * │ continua a ser quem o guarda.                                         │
   * └─────────────────────────────────────────────────────────────────────┘
   */

  /**
   * O FUNDO não segue a densidade — segue o scroll, e só ele.
   *
   * Estiveram presas à mesma variável e são decisões diferentes. O fundo
   * depende apenas de haver conteúdo a passar por baixo — e com a página
   * rolada há, com ou sem painel de pesquisa aberto. Sem isto, o texto da
   * página lê-se através do cabeçalho, por trás do painel.
   */
  const opaco = rolado;

  const [avatarUrl, setAvatarUrl] = useState("");
  const sentinela = useRef<HTMLDivElement>(null);
  const sentinelaRecolher = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setAvatarUrl("");
      return;
    }
    let ativo = true;
    // Carrega o leitor de perfil (que importa o SDK do Supabase) só quando há
    // sessão — mantém o SDK fora do bundle inicial das páginas públicas.
    import("@/lib/supabase/profile").then(({ obterPerfil }) =>
      obterPerfil(user.id).then((p) => {
        if (ativo) setAvatarUrl(p.avatarUrl);
      }),
    );
    return () => {
      ativo = false;
    };
  }, [user]);

  /**
   * ┌─────────────────────────────────────────────────────────────────────────┐
   * │ UMA SENTINELA, E NÃO UM OUVINTE DE SCROLL                                │
   * │                                                                         │
   * │ O ouvinte corria em cada evento de scroll, na thread principal, durante  │
   * │ toda a leitura da página — para responder a uma pergunta que muda duas   │
   * │ ou três vezes por sessão. A sentinela é um elemento de 40 px no topo do  │
   * │ documento: o `IntersectionObserver` avisa quando ele sai do ecrã, e o    │
   * │ limiar passa a ser geometria em vez de aritmética repetida a 60 Hz.      │
   * └─────────────────────────────────────────────────────────────────────────┘
   */
  useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo) return;
    const observador = new IntersectionObserver(([entrada]) => setRolado(!entrada?.isIntersecting), {
      threshold: 0,
    });
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ O LIMIAR É UMA CAIXA, E A CAIXA É A PRÓPRIA FAIXA DO CABEÇALHO       │
   * │                                                                     │
   * │ A segunda sentinela tem exactamente `--rc-header-alto` — a altura    │
   * │ que o cabeçalho aberto reserva. Enquanto essa faixa estiver no ecrã, │
   * │ o cartão fica aberto; assim que ela sai, recolhe. Não é um número    │
   * │ escolhido a olho: é o momento em que o cabeçalho deixou de estar     │
   * │ sobre o seu próprio espaço e passou a estar sobre o texto.            │
   * │                                                                     │
   * │ E é uma sentinela, e não um ouvinte de scroll, pela mesma razão que  │
   * │ a de cima: a pergunta muda duas ou três vezes por sessão e não vale  │
   * │ trabalho na thread principal a 60 Hz. Também não há realimentação —  │
   * │ recolher NÃO mexe na altura do documento (ver `data-reserva`), logo  │
   * │ a sentinela não se move e o limiar não pode oscilar.                  │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  useEffect(() => {
    const alvo = sentinelaRecolher.current;
    if (!alvo) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          // De volta ao topo: o cartão volta a abrir. Sem isto, a reserva
          // ficava alta com o cartão baixo — um buraco de 116 px por baixo
          // dele, exactamente onde ele é visível.
          setRecolhidoPorScroll(false);
          return;
        }
        // Nunca por baixo dos pés de quem está lá dentro: esconder o que
        // tem o foco atira-o para o `<body>`. Fica aberto até ao próximo
        // regresso ao topo — custa uns píxeis, poupa o cursor.
        const corpo = document.getElementById("rc-cabecalho-corpo");
        if (corpo?.contains(document.activeElement)) return;
        setRecolhidoPorScroll(true);
      },
      { threshold: 0 },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  return (
    <>
      {/* Espaçador em fluxo — só no desktop. No telemóvel o cabeçalho vive em
          baixo (ChromeMobile), por isso aqui não reservamos espaço nem
          mostramos este header (evita o «duplo header» no telemóvel).
          A sentinela de 40 px continua a existir, mas já só decide a sombra:
          a altura é uma só. */}
      <div aria-hidden className="relative hidden h-[var(--rc-header-atual)] lg:block">
        <div ref={sentinela} className="absolute inset-x-0 top-0 h-10" />
        {/* A segunda sentinela tem altura FIXA — `--rc-header-alto`, e não
            `--rc-header-atual`. Se seguisse a altura actual, o limiar mudava
            de sítio de cada vez que o cartão mudava de tamanho, e o gesto
            para o recolher deixava de ser o mesmo para o voltar a abrir. */}
        <div ref={sentinelaRecolher} className="absolute inset-x-0 top-0 h-[var(--rc-header-alto)]" />
      </div>

      {/**
       * ┌───────────────────────────────────────────────────────────────────┐
       * │ UM CARTÃO A FLUTUAR, E TRÊS LINHAS LÁ DENTRO                       │
       * │                                                                   │
       * │   1  marca · secções   |   conta · começar · menu                 │
       * │   2  a bandeja dos cinco pilares                                   │
       * │   3  a barra de pesquisa                                           │
       * │                                                                   │
       * │ Foi uma faixa de extremo a extremo com uma régua por baixo, e isso │
       * │ punha o cabeçalho num sistema diferente do da página — que é uma   │
       * │ pilha de cartões brancos sobre papel quente. Agora é o primeiro    │
       * │ desses cartões.                                                    │
       * │                                                                   │
       * │ As três linhas partilham as arestas do cartão por construção: é    │
       * │ uma coluna só, e nenhuma delas leva largura própria. Houve uma     │
       * │ versão em que a bandeja e a barra tinham 704 px e a primeira linha │
       * │ ocupava tudo — num ecrã largo dava um «T», e o desequilíbrio não   │
       * │ era de espaçamento: era duas das três não pertencerem à mesma      │
       * │ grelha.                                                            │
       * │                                                                   │
       * │ NADA RECOLHE AO ROLAR. Já se tentou recolher a primeira linha      │
       * │ (sumiam a marca, as secções, a conta e o «Começar» de uma vez) e   │
       * │ recolher a da pesquisa (o campo ficava em `display:none` e o       │
       * │ Escape deixava o foco no `<body>`). O que muda com o scroll é a    │
       * │ sombra do cartão, e mais nada.                                     │
       * └───────────────────────────────────────────────────────────────────┘
       */}
      <header
        // Dois atributos porque são duas verdades diferentes, e escrever uma
        // só levava o CSS a encolher o espaçador durante o scroll:
        //   `data-expandido`  o corpo está à vista AGORA. É o que os testes
        //                     e o `aria-expanded` leem.
        //   `data-reserva`    quanto espaço a página deixa. Só muda a clique.
        data-expandido={corpoVisivel}
        data-reserva={abertoManual ? "alta" : "baixa"}
        className="fixed inset-x-0 top-0 z-50 hidden px-6 pt-[var(--rc-header-margem)] lg:block"
      >
        <div
          data-opaco={opaco}
          className={`mx-auto w-full max-w-[92rem] rounded-4xl border bg-white p-[var(--rc-cartao-p)] transition-shadow duration-300 dark:bg-stone-900 ${
            opaco
              ? "border-stone-200/70 shadow-float dark:border-stone-800"
              : "border-stone-100 shadow-card dark:border-stone-800/80"
          }`}
        >
          {/* ── Linha 1 — marca · secções | conta · começar · menu ─────── */}
          <div className="flex h-[var(--rc-header-linha)] min-w-0 items-center justify-between gap-4 px-2">
            <div className="flex min-w-0 items-center gap-4">
              <Link href="/" aria-label="ReciboCerto — início" className="focus-marca flex-shrink-0 rounded-xl">
                <Logo />
              </Link>
              <BarraSecoes />
            </div>

            {/* Uma entrada de conta, UMA acção, e o «Menu». O tema vive dentro
                da folha — ver o quadro em `MenuConta.tsx`. O feedback está na
                barra de secções, ao lado dos destinos que também são «o resto
                do produto». */}
            <div className="flex flex-shrink-0 items-center gap-2">
              <MenuConta avatarUrl={avatarUrl} />

              <m.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
                {user ? (
                  <Link href="/dashboard" className={ACAO}>
                    Painel
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                ) : disponivel ? (
                  <CTAComecar />
                ) : (
                  <Link href="/dashboard" className={ACAO}>
                    Começar Grátis
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                )}
              </m.div>

              {/* «Menu» não é o sexto pilar: vive nesta linha, com a forma de
                  um controlo com contorno, e não dentro da bandeja. Esteve lá
                  separado por uma régua, e uma régua é sinal fraco de mais
                  para dizer «isto é de outra natureza». */}
              <button
                type="button"
                data-menu-gatilho="secretaria"
                aria-haspopup="dialog"
                aria-expanded={menuAberto}
                onClick={() => setMenuAberto(true)}
                className="focus-marca inline-flex h-11 flex-shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-stone-600 transition-colors hover:border-brand/40 hover:text-brand-dark dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-brand"
              >
                <MenuIcon size={17} className="flex-shrink-0 text-stone-400 dark:text-stone-500" />
                Menu
              </button>
            </div>
          </div>

          {/* ── Linhas 2 e 3 — só quando a pessoa as pede ────────────────
              `hidden` e não uma altura zero com `overflow-hidden`: o painel
              da pesquisa é `position:absolute` dentro desta caixa, e um
              `overflow-hidden` no cartão cortava-o ao abrir. É também por
              isso que a mudança é instantânea e não animada — animar a
              altura obrigaria ao mesmo corte durante a transição. */}
          <div id="rc-cabecalho-corpo" hidden={!corpoVisivel}>
            {/* ── Linha 2 — a bandeja dos cinco pilares ────────────────── */}
            <div className="mt-[var(--rc-cartao-gap)] flex h-[var(--rc-linha-nav)] items-center">
              <CapsulaNav foco={foco} />
            </div>

            {/* ── Linha 3 — a barra de pesquisa ────────────────────────── */}
            <div className="mt-[var(--rc-cartao-gap)] w-full">
              <LancadorBusca inputId="rc-header-busca" />
            </div>
          </div>

          {/* ── A lingueta ───────────────────────────────────────────────
              Fica SEMPRE por baixo da primeira linha, aberta ou fechada, para
              não haver um alvo que aparece e desaparece. Diz o que faz por
              palavras: uma seta sozinha seria uma adivinha num sítio onde o
              custo de errar é abrir uma coisa que não se queria. */}
          <div className="mt-1 flex h-[var(--rc-linha-alternar)] items-center justify-center">
            <button
              type="button"
              data-cabecalho-alternar
              aria-expanded={corpoVisivel}
              aria-controls="rc-cabecalho-corpo"
              onClick={alternar}
              className="focus-marca inline-flex h-[var(--rc-linha-alternar)] items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            >
              {corpoVisivel ? "Recolher" : "Navegação e pesquisa"}
              <ChevronDown
                size={13}
                aria-hidden
                className={`flex-shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                  corpoVisivel ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* A folha é a MESMA do telemóvel — um componente, duas geometrias.
          Ver o quadro em `MenuCompleto.tsx`. */}
      <MenuCompleto aberto={menuAberto} aoFechar={() => setMenuAberto(false)} superficie="secretaria" />
    </>
  );
}

function CTAComecar() {
  const { abrirModal } = useAuth();
  return (
    <button type="button" onClick={() => abrirModal("criar")} className={ACAO}>
      Começar Grátis
      <ArrowRight size={14} aria-hidden />
    </button>
  );
}
