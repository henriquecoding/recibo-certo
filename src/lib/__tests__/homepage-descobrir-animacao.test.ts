import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ATOS_DESCOBRIR,
  DUR,
  ULTIMO_ATO_DESCOBRIR,
  arco,
  bezier,
} from "@/components/descobrir/coreografia";
import { FOCOS } from "@/components/foco/focos";
import { metadataDoFoco } from "@/lib/foco/metadata";
import { ROTA_POR_FOCO } from "@/lib/foco-homepage";

const SRC = join(__dirname, "..", "..");
const RAIZ = join(SRC, "..");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

const PALCO = ler("components", "descobrir", "PalcoDescobrir.tsx");
const ATORES_DESTA_CENA = ler("components", "descobrir", "atores.tsx");
// A mecânica da ficha mudou de casa: vive em `components/palco/`, partilhada
// com o palco do preço. O que fica em `descobrir/atores.tsx` é a paleta
// semântica desta cena — que é a única coisa que não é partilhável.
const ATORES = ler("components", "palco", "atores.tsx");
const RELOGIO_DE_CENA = ler("components", "palco", "frame.ts");
const HERO = ler("components", "descobrir", "HeroDescobrir.tsx");
const PAGINA = ler("app", "page.tsx");
const ROTEIRO = readFileSync(
  join(RAIZ, "docs", "design", "roteiro-animacao-descobrir.md"),
  "utf8",
);

describe("homepage Descobrir: coreografia", () => {
  it("implementa os quatro actos do roteiro numa linha temporal finita", () => {
    expect(ATOS_DESCOBRIR.map(({ id, duracao }) => [id, duracao])).toEqual([
      ["contexto", 3000],
      ["fronteiras", 3200],
      ["evidencia", 3500],
      ["hipotese", 4100],
    ]);
    expect(ULTIMO_ATO_DESCOBRIR).toBe(3);

    for (const ato of ATOS_DESCOBRIR) {
      expect(ato.beats.map((beat) => beat.em)).toEqual(
        [...ato.beats].map((beat) => beat.em).sort((a, b) => a - b),
      );
      expect(ato.beats.at(-1)?.em).toBeLessThan(ato.duracao);
      for (const beat of ato.beats) expect(ROTEIRO).toContain(`\`${beat.id}\``);
    }

    expect(PALCO).not.toContain("setInterval");
    expect(PALCO).not.toContain("animate-ping");
    expect(PALCO).toContain("setFinalizado(true)");
    expect(PALCO).toContain("setParado(true)");
  });

  it("faz cada ficha chegar por um arco medido e anima só compositor-friendly", () => {
    // ⚠️ A escala de durações passou a ser PARTILHADA
    // (`components/palco/curvas.ts`), depois de estar duplicada byte a byte
    // nos dois palcos. Uma escala partilhada não pode ter um número único a
    // servir duas distâncias: a mesma duração numa distância maior é
    // velocidade maior, e é a velocidade que o olho lê.
    //
    // Por isso o que se verifica aqui é o degrau que ESTA cena usa — a mesa
    // é larga e as fichas atravessam zonas inteiras —, e não o nome
    // genérico `viagem`, que agora pertence a percursos curtos.
    expect(DUR.viagemAmpla).toBeGreaterThanOrEqual(680);
    expect(DUR.viagemAmpla).toBeLessThanOrEqual(820);
    expect(DUR.viagemLonga).toBeLessThanOrEqual(820);
    expect(PALCO).toContain("duracao ?? DUR.viagemAmpla");
    expect(RELOGIO_DE_CENA.match(/requestAnimationFrame\(/g)).toHaveLength(1);
    expect(RELOGIO_DE_CENA).toContain('document.addEventListener("visibilitychange"');
    expect(RELOGIO_DE_CENA).toContain("IntersectionObserver");
    expect(ATORES).not.toMatch(/requestAnimationFrame\(/);
    expect(ATORES).toContain("relogioDeCena.inscrever");
    expect(ATORES).toContain("no.style.transform");
    expect(ATORES).toContain("no.style.opacity");
    expect(ATORES).not.toContain("no.style.top");
    expect(ATORES).not.toContain("no.style.left");
    // E a paleta desta cena continua a ser desta cena: `fronteira` é areia
    // aqui e o IVA é areia no preço. Unificá-las seria unificar duas coisas
    // que só por acaso se parecem.
    expect(ATORES_DESTA_CENA).toContain("fronteira:");
    expect(ATORES_DESTA_CENA).toContain("fonte:");

    expect(arco({ x: 0, y: 0 }, { x: 100, y: 0 })).toEqual({ x: 50, y: 16 });
    const curva = bezier([0.65, 0, 0.35, 1]);
    expect(curva(0)).toBe(0);
    expect(curva(0.5)).toBeCloseTo(0.5, 4);
    expect(curva(1)).toBe(1);
  });

  it("mantém a experiência completa sem autoplay e sem anúncios repetidos", () => {
    expect(PALCO).toContain("useState(ULTIMO_ATO_DESCOBRIR)");
    expect(PALCO).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(PALCO).toContain('<ol className="sr-only">');
    expect(PALCO).toContain(
      '<p className="sr-only" aria-live="polite">{anuncioManual}</p>',
    );
    expect(PALCO).not.toMatch(/aria-live[^>]*>\{ATOS_DESCOBRIR/);
    expect(PALCO).toContain("min-h-[258px]");
    expect(PALCO).not.toContain("line-clamp-2 text-[8px]");
    expect(PALCO).toContain('<AnimatePresence mode="popLayout" initial={false}>');
    expect(HERO).not.toContain("setInterval");
  });

  it("define metadata social própria para a porta editorial", () => {
    expect(PAGINA).toContain('export const metadata = metadataDoFoco("descobrir")');
    expect(PAGINA).toContain('export const dynamic = "error"');
    for (const foco of FOCOS) {
      expect(foco.titulo.length, `${foco.id} sem título`).toBeGreaterThan(10);
      expect(foco.descricao.length, `${foco.id} sem descrição`).toBeGreaterThan(40);
      expect(metadataDoFoco(foco.id)).toMatchObject({
        alternates: { canonical: "/" },
        openGraph: { url: ROTA_POR_FOCO[foco.id] },
        twitter: { card: "summary_large_image" },
      });
    }
  });

  it("documenta referências, limites e a regra causal antes do código", () => {
    for (const referencia of [
      "stripe.com/radar",
      "linear.app/",
      "carbondesignsystem.com",
      "motion.dev",
      "web.dev",
      "w3.org/WAI/WCAG22",
    ]) {
      expect(ROTEIRO).toContain(referencia);
    }
    expect(ROTEIRO).toContain("Nada muda sem uma causa visível");
    expect(ROTEIRO).toContain("loop automático");
  });
});
