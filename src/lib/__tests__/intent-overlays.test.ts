import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

const LOADERS = ler("components", "ui", "IntentOverlays.tsx");
const LAYOUT = ler("app", "layout.tsx");

describe("overlays por intenção", () => {
  it("um primeiro toque genérico não monta funcionalidades sem relação", () => {
    expect(LOADERS).not.toContain('addEventListener("pointerdown"');
    expect(LOADERS).not.toContain('addEventListener("touchstart"');
    expect(LOADERS).not.toContain("DeferredOverlays");
    expect(LAYOUT).toContain("<IntentOverlays />");
    expect(LAYOUT).not.toContain("DeferredOverlays");
  });

  it("cada chunk tem o seu próprio gatilho", () => {
    expect(LOADERS).toContain("function AuthIntentLoader");
    expect(LOADERS).toContain("function SearchIntentLoader");
    expect(LOADERS).toContain("function CookieIntentLoader");
    expect(LOADERS).toContain("function FeedbackIntentLoader");
    expect(LOADERS).toContain("function NewsIntentLoader");

    expect(LOADERS).toContain("modalAberto ? <AuthModal /> : null");
    expect(LOADERS).toContain("EVENTO_BUSCA_ABRIR");
    expect(LOADERS).toContain("ABRIR_PREFERENCIAS_EVENT");
    expect(LOADERS).toContain("EVENTO_ABRIR_FEEDBACK");
    // Novidades deixou de ser a abertura automática: passou a ter um evento
    // como toda a gente (regra 10 do CLAUDE.md).
    expect(LOADERS).toContain("EVENTO_ABRIR_NOVIDADES");
  });

  it("não perde a primeira ação enquanto o import dinâmico chega", () => {
    expect(LOADERS).toContain("<BuscaOverlay abrirInicialmente />");
    expect(LOADERS).toContain("<CookieConsent abrirInicialmente={abrirInicialmente} />");
    expect(LOADERS).toContain("<FeedbackModal pedidoInicial={pedidoInicial} />");
    expect(LOADERS).toContain("<NovidadesModal abrirInicialmente />");
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  A REGRA DE CEDÊNCIA — a que deixava a pesquisa muda
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ `menu` E `busca` VALEM O MESMO — DE PROPÓSITO                        │
//  │                                                                     │
//  │ Nenhum manda no outro: são as duas coisas que a pessoa pede com um   │
//  │ gesto, e não há razão para uma ser mais importante. Só que a regra   │
//  │ era «ganha quem valer MAIS», e com prioridades iguais isso quer      │
//  │ dizer «ganha quem chegou primeiro, para sempre»: com a folha do      │
//  │ menu na vaga, o `⌘K` e a barra de pesquisa não faziam nada. Sem      │
//  │ erro. Sem nada no ecrã que o explicasse.                             │
//  │                                                                     │
//  │ Entre iguais decide o gesto mais RECENTE — e só o pedido novo, não   │
//  │ a reinscrição de quem já estava à espera; senão os dois roubavam-se  │
//  │ a vaga em ciclo, que é pior do que o defeito que isto corrige.       │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import { PRIORIDADE, decidirVaga } from "@/components/overlays/CoordenadorOverlays";

const gesto = { modal: true, iniciadoPeloUtilizador: true, novoPedido: true };
const reinscricao = { ...gesto, novoPedido: false };
const automatico = { modal: true, iniciadoPeloUtilizador: false, novoPedido: true };

describe("coordenador:cedencia", () => {
  it("a vaga livre é de quem a pedir", () => {
    expect(decidirVaga(null, "busca", gesto)).toBe("busca");
    expect(decidirVaga(null, "novidades", automatico)).toBe("novidades");
  });

  it("um gesto ganha a quem vale o MESMO — é o defeito que calava a pesquisa", () => {
    expect(PRIORIDADE.menu).toBe(PRIORIDADE.busca);
    expect(decidirVaga("menu", "busca", gesto)).toBe("busca");
    expect(decidirVaga("busca", "menu", gesto)).toBe("menu");
  });

  it("mas só o pedido NOVO desempata — a reinscrição espera", () => {
    // Sem isto, cada roubo mudava o dono, cada mudança fazia o outro
    // reinscrever-se, e os dois trocavam a vaga sem fim.
    expect(decidirVaga("menu", "busca", reinscricao)).toBe("menu");
    expect(decidirVaga("busca", "menu", reinscricao)).toBe("busca");
  });

  it("um gesto ganha a um automático", () => {
    expect(decidirVaga("novidades", "busca", gesto)).toBe("busca");
  });

  it("um automático nunca empurra ninguém, valha o que valer", () => {
    expect(decidirVaga("busca", "novidades", automatico)).toBe("busca");
    expect(decidirVaga("novidades", "novidades", automatico)).toBe("novidades");
  });

  it("o consentimento e a confirmação continuam intocáveis", () => {
    expect(decidirVaga("cookies", "busca", gesto)).toBe("cookies");
    expect(decidirVaga("cookies", "menu", gesto)).toBe("cookies");
    expect(decidirVaga("confirmacao", "busca", gesto)).toBe("confirmacao");
    // E o consentimento continua a poder empurrar o resto.
    expect(decidirVaga("busca", "cookies", gesto)).toBe("cookies");
  });
});

describe("coordenador:quem-perde-arruma-se", () => {
  const COORD = ler("components", "overlays", "CoordenadorOverlays.tsx");

  it("o `useOverlay` avisa quem perde a vaga sem deixar de a querer", () => {
    expect(COORD).toContain("aoPerderVaga");
  });

  it("e as superfícies que um gesto pode empurrar usam esse aviso", () => {
    // Sem isto ficavam invisíveis a querer abrir — e reapareciam sozinhas
    // quando a vaga libertasse, sem ninguém as ter pedido.
    expect(ler("components", "navegacao", "MenuCompleto.tsx")).toMatch(/useOverlay\("menu"[\s\S]*?aoFechar\)/);
    expect(ler("components", "busca", "BuscaGlobal.tsx")).toMatch(/useOverlay\("busca"[\s\S]*?fechar\)/);
    expect(ler("components", "busca", "PainelPesquisa.tsx")).toMatch(/useOverlay\("busca"[\s\S]*?aoFechar\)/);
    // O painel de novidades passou a ser pedido por um gesto — e, como todos
    // os outros, pode perder a vaga para um gesto com mais prioridade.
    expect(ler("components", "ui", "NovidadesModal.tsx")).toMatch(/useOverlay\(\s*"novidades",[\s\S]*?fechar,\s*\)/);
  });
});
