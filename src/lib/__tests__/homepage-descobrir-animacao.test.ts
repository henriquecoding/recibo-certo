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

const SRC = join(__dirname, "..", "..");
const RAIZ = join(SRC, "..");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

const PALCO = ler("components", "descobrir", "PalcoDescobrir.tsx");
const ATORES = ler("components", "descobrir", "atores.tsx");
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
    expect(DUR.viagem).toBeGreaterThanOrEqual(680);
    expect(DUR.viagemLonga).toBeLessThanOrEqual(820);
    expect(ATORES).toContain("requestAnimationFrame");
    expect(ATORES).toContain("paradoRef.current");
    expect(ATORES).toContain("no.style.transform");
    expect(ATORES).toContain("no.style.opacity");
    expect(ATORES).not.toContain("no.style.top");
    expect(ATORES).not.toContain("no.style.left");

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
    expect(PAGINA).toContain("openGraph: {");
    expect(PAGINA).toContain("twitter: {");
    expect(PAGINA).toContain('url: "/?foco=descobrir"');
    expect(PAGINA).toContain("const socialTitle = `${title} | ReciboCerto`");
    expect(PAGINA).toContain("title: { absolute: socialTitle }");
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
