import type { Config } from "tailwindcss";

/** A família da marca, numa variável e não escrita duas vezes.
 *
 *  `textColor.brand` (lá em baixo) precisa de reescrever o DEFAULT e de
 *  manter os outros quatro degraus. Copiá-los para lá parece inofensivo e
 *  não é: `theme.extend` SUBSTITUI o valor inteiro quando o que se lhe dá
 *  não é um objecto a fundir, portanto a cópia teria de estar completa — e
 *  bastava afinar `brand-dark` aqui para `text-brand-dark` ficar no valor
 *  antigo, em silêncio. Escrito uma vez, espalhado a partir daqui. */
const MARCA = {
  DEFAULT: "#177E5E",
  dark: "#0F6E56",
  deep: "#0A4A39",
  light: "#E1F5EE",
  mint: "#9FE1CB",
} as const;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          // Escurecido de #1D9E75 para #177E5E em 2026-08.
          //
          // O anterior dava 3,39:1 contra branco — e o contraste é simétrico,
          // por isso falhava AA nas DUAS direções ao mesmo tempo: texto branco
          // sobre o verde (botões, distintivos, CTAs) e texto verde sobre
          // branco (logótipo, «eyebrows», links). Eram 825 nós a falhar em
          // cinco páginas.
          //
          // #177E5E dá 5,00:1 contra branco e 4,54:1 contra o `cream` do
          // fundo, o que passa AA para texto normal nos dois casos. É o
          // escurecimento MÍNIMO que lá chega com folga — 20% — escolhido
          // assim de propósito para mexer o menos possível na identidade.
          ...MARCA,
        },
        // ── O PAPEL DA PÁGINA ──────────────────────────────────────────
        //
        // ┌──────────────────────────────────────────────────────────────┐
        // │ ERA #F5F4F0, E ERA AQUI QUE ESTAVA O PROBLEMA TODO            │
        // │                                                              │
        // │ A primeira tentativa de arranjar o modo claro foi dar bordas  │
        // │ a sério aos cartões e deixar o papel quieto — porque mexer no │
        // │ papel obrigava a mexer no verde da marca, e isso parecia caro │
        // │ de mais. O resultado passou a medição inteira e, posto ao     │
        // │ lado do anterior, era indistinguível. Uma linha de 1 px numa  │
        // │ página que é toda quase-branca não constrói estrutura         │
        // │ nenhuma: o olho continua a ver um campo só.                    │
        // │                                                              │
        // │ Provado por eliminação, com a mesma região renderizada oito   │
        // │ vezes: bordas mais escuras — igual. Sombra ao nível da        │
        // │ Stripe — quase igual (uma sombra precisa de chão onde cair, e │
        // │ um papel a 1,10:1 do cartão não é chão). Papel mais fundo —   │
        // │ noite e dia, mesmo com as bordas fracas de origem.            │
        // │                                                              │
        // │ #EDEAE0 põe o cartão branco a 1,204:1 do papel, contra os     │
        // │ 1,101:1 de antes. É o que faz um cartão parecer pousado sobre │
        // │ alguma coisa em vez de recortado no nada.                      │
        // └──────────────────────────────────────────────────────────────┘
        //
        // O preço, pago em `textColor.brand` mais abaixo: `text-brand`
        // sobre este papel caía para 4,17:1. Não há como escurecer o papel
        // sem isso — a folga do verde sobre o papel antigo era de 0,06.
        cream: "#EDEAE0",
        // Segue o papel para manter a relação que tinha (1,08:1 acima dele).
        sand: "#E6E2D5",
        ink: "#1A1A17",
        // ── O DEGRAU BAIXO DA ESCALA NEUTRA, NO CLARO ──────────────────
        //
        // Estes três substituem o `stone` 50/100/200 do Tailwind, que é
        // um cinzento praticamente neutro (#FAFAF9 tem 1 ponto de calor)
        // ao lado de um papel que é quente a sério (`cream` #F5F4F0, com
        // 5). A diferença não se nota num chip isolado e nota-se numa
        // página inteira: os preenchimentos puxavam a cinzento sobre um
        // fundo que puxa a bege, e o conjunto ficava sujo.
        //
        // ┌──────────────────────────────────────────────────────────────┐
        // │ SÓ A TEMPERATURA MUDA — A LUMINÂNCIA FICA ONDE ESTAVA         │
        // │                                                              │
        // │ `stone-100` e `stone-200` são preenchimentos que LEVAM TEXTO  │
        // │ (185 sítios com `bg-stone-100 text-brand` ou                  │
        // │ `bg-stone-100 text-stone-500`), e o verde da marca já está no │
        // │ limite: #177E5E sobre #F5F5F4 dá 4,60:1, com 0,10 de folga    │
        // │ sobre os 4,5 de AA. Escurecer o preenchimento um único degrau │
        // │ (#F0EDE5) leva-o a 4,29 — falha, em 185 sítios de uma vez.    │
        // │                                                              │
        // │ Por isso estes três têm a MESMA luminância dos originais e só │
        // │ mudam de tom. O contraste do texto sobre eles é o mesmo ao    │
        // │ centésimo; a página é que deixa de ter dois neutros a       │
        // │ discutir. Quem quiser mais separação vai buscá-la à borda,    │
        // │ que não leva texto nenhum — ver `borderColor` mais abaixo.    │
        // │                                                              │
        // │ A excepção é o `50`, que TINHA folga: 4,94/4,81 contra os     │
        // │ 4,5 exigidos. Desce de 1,044:1 para 1,080:1 contra o branco   │
        // │ — um painel encaixado dentro de um cartão passa a ver-se —    │
        // │ e ainda sobra (4,77/4,65).                                    │
        // └──────────────────────────────────────────────────────────────┘
        stone: {
          50: "#F8F6F1",
          100: "#F7F5EE",
          200: "#E7E5DE",
        },
        alert: {
          bg: "#FEFBD0",
          DEFAULT: "#FFF8A0",
          border: "#E8D97A",
          text: "#7A5C00",
        },
        // Argila/terracota pastel — usada para valores que saem (retenção, SS,
        // ações destrutivas). Substitui o vermelho agressivo. Tem override no
        // dark em globals.css (tom pastel claro sobre superfície quente escura).
        clay: {
          bg: "#F6E7E0",
          DEFAULT: "#C2745A",
          border: "#E6C5B7",
          text: "#97553C",
        },
        // ── Pastéis de CATEGORIA (painel de contabilistas) ──────────────
        //
        // Servem para distinguir TIPOS de coisa num ecrã denso — uma consulta
        // online de uma presencial, um pedido de um envio — e não para
        // decorar. A regra que os mantém úteis: a cor identifica, o verde da
        // marca age. Um botão nunca é rosa; um cartão de dados nunca é verde
        // a não ser que o assunto seja mesmo a marca.
        //
        // Cada tom tem `bg` (superfície), `text` (mínimo AA sobre o `bg`) e
        // `border`. Todos têm override `.dark` em globals.css — sem isso, um
        // pastel claro sobre superfície escura fica ilegível.
        categoria: {
          rosa:  { bg: "#FBE9EF", text: "#8E3A5B", border: "#F3D2DE" },
          azul:  { bg: "#E4EDFB", text: "#2E4E7E", border: "#CBDDF5" },
          lilas: { bg: "#EDE9FA", text: "#4F3D8C", border: "#DCD5F3" },
          areia: { bg: "#F7EEE2", text: "#7A5230", border: "#EBDCC7" },
        },
        // ── Paleta FIZ (parceiro de execução fiscal) ────────────────────
        // Escala do amarelo pastel até ao amarelo da marca FIZ (#FAC72B,
        // o fundo da logo). Usada EXCLUSIVAMENTE em superfícies FIZ, para
        // que o utilizador distinga sempre o que é ReciboCerto (verde) do
        // que é operado pela FIZ (amarelo). Os tons 700–900 existem para
        // garantir contraste AA de texto sobre as superfícies claras — o
        // amarelo da marca nunca é usado como cor de texto.
        fiz: {
          50: "#FEFCF2",
          100: "#FEF7DE",
          200: "#FDEFBC",
          300: "#FCE28B",
          400: "#FBD65C",
          DEFAULT: "#FAC72B",
          500: "#FAC72B",
          600: "#D9A50F",
          700: "#A87F0B",
          800: "#6E5307",
          900: "#3D2E04",
          ink: "#1A1A17",
        },
        quiz: {
          leather: "#C4A076",
          "leather-dark": "#B28A60",
          parchment: "#FAF4EC",
          "parchment-border": "#F0E6DA",
          "parchment-warm": "#F7EDE1",
          "parchment-mid": "#E8DBCB",
          "parchment-header": "#f1e4d4",
          "parchment-line": "#d4b896",
          olive: "#4D6243",
          forest: "#293B27",
          "forest-deep": "#1C3A22",
          sage: "#768771",
          "sage-dark": "#607757",
          "sage-light": "#DBDCC4",
          "sage-border": "#C4C4AF",
          option: "#92906B",
          "option-dark": "#454225",
          gold: "#b59562",
          "logo-green": "#145532",
          "logo-mint": "#55b15a",
          "level-bg": "#415439",
          "xp-dark": "#425c3b",
          "xp-light": "#6d815a",
          "nav-green": "#44613d",
          "footer-bg": "#1d2218",
          "footer-mid": "#293023",
          "footer-text": "#ebd4a4",
        },
      },
      // ══════════════════════════════════════════════════════════════════
      // AS BORDAS SÃO UM TOKEN À PARTE — E É AQUI QUE O MODO CLARO SE
      // GANHA OU SE PERDE
      //
      // ┌──────────────────────────────────────────────────────────────┐
      // │ UMA BORDA QUE NÃO SE VÊ NÃO É UMA BORDA                       │
      // │                                                              │
      // │ `border-stone-100` (#F5F5F4) contra o papel `cream` (#F5F4F0) │
      // │ dava 1,016:1. Não é «subtil»: é a mesma cor. E era a classe   │
      // │ de borda mais usada do projecto — 804 sítios a escrever uma   │
      // │ aresta que o ecrã nunca desenhou. Contra o branco de um       │
      // │ cartão dava 1,091:1, o que é meia pista.                       │
      // │                                                              │
      // │ Era por isso que o modo claro «parecia tudo uma coisa só»     │
      // │ enquanto o escuro se lia bem: no escuro o cartão sobe do      │
      // │ fundo (1,126:1) E a borda sobe outra vez (1,178:1 contra o    │
      // │ cartão), portanto há duas pistas a desenhar cada caixa. No    │
      // │ claro havia o degrau branco-sobre-papel (1,101:1) e mais      │
      // │ nada — metade da informação.                                  │
      // │                                                              │
      // │ Medido em oito páginas × dois tamanhos por                    │
      // │ `scripts/verificar-hierarquia.mjs`: no claro até 60% das      │
      // │ superfícies de uma página não tinham NENHUMA pista acima do   │
      // │ limiar do percetível; no escuro, 0%.                          │
      // └──────────────────────────────────────────────────────────────┘
      //
      // Uma borda não leva texto por cima, portanto — ao contrário do
      // preenchimento — pode escurecer o quanto for preciso sem tocar em
      // nenhum contraste de leitura. É o único sítio onde havia margem, e
      // é de lá que vem toda a hierarquia nova. Separar `borderColor` de
      // `colors` é o que permite que `bg-stone-100` e `border-stone-100`
      // deixem de ser obrigados a ser a mesma cor: um é um fundo com
      // tecto de acessibilidade, o outro é uma linha sem tecto nenhum.
      //
      // ┌──────────────────────────────────────────────────────────────┐
      // │ UMA BORDA TEM DOIS LADOS, E OS DOIS CONTAM                    │
      // │                                                              │
      // │ A primeira escada foi afinada só contra o cartão BRANCO, com  │
      // │ o papel ainda em #F5F4F0. Quando o papel desceu para #EDEAE0, │
      // │ metade das páginas voltou a falhar a medição — e por uma      │
      // │ razão que só se vê medindo: `border-stone-100` a #EBE7DE dava │
      // │ 1,234:1 contra o branco e 1,025:1 contra o papel novo. As     │
      // │ listas e as faixas que vivem DIRECTAMENTE no papel (o rodapé  │
      // │ móvel, os separadores dos formulários, as tabelas dos guias)  │
      // │ ficaram outra vez sem aresta nenhuma.                          │
      // │                                                              │
      // │ Uma borda não separa «de branco»: separa do que estiver dos   │
      // │ dois lados dela. Estes valores passam ambos os testes.         │
      // └──────────────────────────────────────────────────────────────┘
      //
      //            contra o branco     contra o papel     escuro (ref.)
      //   100         1,331:1             1,106:1            1,178:1
      //   200         1,424:1             1,183:1            1,248:1
      //   300         1,687:1             1,402:1            1,510:1
      //
      // O claro fica um pouco acima de propósito: uma aresta escura sobre
      // superfície clara lê-se com menos força do que uma aresta clara
      // sobre superfície escura, à mesma razão de contraste.
      //
      // Nada disto chega ao escuro: `globals.css` remapeia
      // `.border-stone-100/200/300` na camada `.dark` com valores fixos
      // próprios, e `border-stone-50` só aparece acompanhado de um
      // `dark:border-*` escrito à mão.
      // ══════════════════════════════════════════════════════════════════
      borderColor: {
        stone: {
          50: "#E7E2D6",
          100: "#E4DFD1",
          200: "#DED8C6",
          300: "#D0C7AC",
        },
        // A mesma correção na paleta do parceiro, e com a mesma lição: o
        // cartão da FIZ na landing não tem fundo próprio — assenta no
        // papel. `border-fiz-200` de origem dava 1,046:1 contra ele, e a
        // primeira tentativa (#FBE49A) deu exactamente o mesmo, porque o
        // papel entretanto desceu e foi ao encontro do amarelo. Aqui os
        // dois lados são o papel e o amarelo-pálido das superfícies FIZ:
        // 1,137:1 e 1,331:1.
        //
        // Continua a não ser cor de texto (a regra da paleta FIZ é essa: o
        // amarelo da marca nunca escreve), portanto não há tecto de
        // acessibilidade a respeitar. No escuro, `.dark .border-fiz-200`
        // e `.border-fiz-300` já têm o seu próprio castanho-âmbar.
        fiz: {
          200: "#F8DA82",
          300: "#F5D06B",
        },
      },
      // ══════════════════════════════════════════════════════════════════
      // O VERDE ESCREVE UM TOM ABAIXO DO VERDE QUE PREENCHE
      //
      // ┌──────────────────────────────────────────────────────────────┐
      // │ DOIS TRABALHOS, DUAS RÉGUAS                                   │
      // │                                                              │
      // │ `bg-brand` é a marca a ser vista: o botão, o logótipo, os     │
      // │ blocos verdes cheios. A régua dele é o BRANCO por cima —      │
      // │ 5,02:1, e escurecer só melhoraria.                             │
      // │                                                              │
      // │ `text-brand` é a marca a ser LIDA: rótulos de 12 px sobre o   │
      // │ papel. A régua é 4,5:1 de texto pequeno, e com o papel a      │
      // │ #EDEAE0 o #177E5E dá 4,17 — falha.                             │
      // │                                                              │
      // │ Separar os dois é o que permite escurecer o papel sem tocar   │
      // │ na cor que as pessoas reconhecem como a marca. #157859 é 10%  │
      // │ menos luminoso e, a olho, o mesmo verde: passa a 4,52:1 sobre │
      // │ o papel e 5,44:1 sobre um cartão branco.                       │
      // │                                                              │
      // │ Fica de fora tudo o que não é texto — `bg-brand`,             │
      // │ `border-brand`, `ring-brand`, `fill/stroke-brand` continuam   │
      // │ em #177E5E pelo `colors` acima. Gráficos regem-se por 3:1,    │
      // │ que o original cumpre com folga.                               │
      // └──────────────────────────────────────────────────────────────┘
      //
      // No escuro nada disto chega: `globals.css` remapeia `.text-brand`
      // e `.dark\:text-brand` para o verde-menta próprio do tema.
      textColor: {
        // Os outros quatro degraus vêm de `MARCA` — só o DEFAULT muda. Dar
        // aqui um valor solto substituía a família inteira e apagava
        // `text-brand-dark`, `-deep`, `-light` e `-mint` do CSS gerado.
        brand: { ...MARCA, DEFAULT: "#147455" },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Escala de elevação coerente (sombras quentes, não cinzentas frias).
        //
        // ┌──────────────────────────────────────────────────────────────┐
        // │ O ANEL DEIXOU DE SER A ARESTA E PASSOU A SER O CONTORNO       │
        // │                                                              │
        // │ O primeiro layer (`0 0 0 1px`) nasceu a fazer o trabalho da   │
        // │ borda: com `border-stone-100` à cor do papel, era ele quem    │
        // │ dava aos cartões brancos alguma aresta sobre o `cream`. Agora │
        // │ que a borda é mesmo uma borda (ver `borderColor` acima), ter  │
        // │ os dois à mesma força desenhava uma linha de 2 px em todos os │
        // │ cartões — mais pesada do que o resto do sistema.               │
        // │                                                              │
        // │ O anel baixa para 0,04 e passa a ser o que devia ter sido: a  │
        // │ pista de RESERVA para as superfícies elevadas que não trazem  │
        // │ borda nenhuma (sozinho ainda dá 1,08:1 sobre o papel). Quem   │
        // │ tem borda ganha o anel como um halo, não como uma segunda     │
        // │ linha.                                                        │
        // │                                                              │
        // │ Em troca, a sombra AMBIENTE sobe — é ela que faz um cartão    │
        // │ pairar em vez de estar colado, e num tema claro é a única     │
        // │ pista de altura que existe (no escuro, a superfície mais      │
        // │ clara também levanta o cartão; no claro não há esse degrau).  │
        // │ Continua contida: 0,18 num desfoque largo e recuado lê-se     │
        // │ como profundidade, não como relevo.                           │
        // └──────────────────────────────────────────────────────────────┘
        //
        // Tudo isto é quente (rgba(28,25,23)) e vale só para o claro: o
        // `globals.css` substitui `shadow-card`, `shadow-lift` e
        // `shadow-soft` inteiras na camada `.dark`.
        // Em camadas, e não numa só: uma sombra real tem um contacto
        // curto e escuro junto à aresta e um halo largo e claro por baixo.
        // Uma camada só tem de escolher entre os dois e acaba a não ser
        // nenhum — era o que havia, e por isso os cartões estavam colados
        // ao papel em vez de pousados nele. Agora que o papel é mais fundo
        // (ver `cream`), a sombra tem chão onde cair.
        soft: "0 1px 2px rgba(28,25,23,0.05), 0 6px 14px -4px rgba(28,25,23,0.07), 0 16px 36px -12px rgba(28,25,23,0.14)",
        card: "0 0 0 1px rgba(28,25,23,0.05), 0 1px 2px rgba(28,25,23,0.08), 0 4px 10px -2px rgba(28,25,23,0.08), 0 18px 32px -12px rgba(28,25,23,0.16)",
        lift: "0 0 0 1px rgba(28,25,23,0.06), 0 2px 4px -1px rgba(28,25,23,0.10), 0 8px 16px -4px rgba(28,25,23,0.12), 0 26px 44px -14px rgba(28,25,23,0.24)",
        float: "0 30px 60px -24px rgba(15,110,86,0.28)",
        glow: "0 0 0 1px rgba(29,158,117,0.12), 0 20px 50px -20px rgba(29,158,117,0.30)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
