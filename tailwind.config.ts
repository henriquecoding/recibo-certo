import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1D9E75",
          dark: "#0F6E56",
          deep: "#0A4A39",
          light: "#E1F5EE",
          mint: "#9FE1CB",
        },
        cream: "#F5F4F0",
        sand: "#EDEAE2",
        ink: "#1A1A17",
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
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Escala de elevação coerente (sombras quentes, não cinzentas frias).
        // O primeiro layer é um hairline ring (`0 0 0 1px`) que dá aos cartões
        // brancos uma aresta nítida sobre o fundo cream no modo claro — a borda
        // `stone-100` quase iguala o cream e não chega para separar. É quente
        // (rgba(28,25,23)), por isso fica invisível no dark, que já separa pela
        // superfície mais clara + border próprio.
        soft: "0 10px 40px -12px rgba(28, 25, 23, 0.12)",
        card: "0 0 0 1px rgba(28,25,23,0.05), 0 1px 2px rgba(28,25,23,0.05), 0 14px 32px -16px rgba(28,25,23,0.14)",
        lift: "0 0 0 1px rgba(28,25,23,0.06), 0 2px 6px rgba(28,25,23,0.06), 0 24px 46px -18px rgba(28,25,23,0.20)",
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
