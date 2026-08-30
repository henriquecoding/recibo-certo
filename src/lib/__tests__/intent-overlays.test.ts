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
    expect(LOADERS).toContain("VERSAO_STORAGE_KEY");
  });

  it("não perde a primeira ação enquanto o import dinâmico chega", () => {
    expect(LOADERS).toContain("<BuscaOverlay abrirInicialmente />");
    expect(LOADERS).toContain("<CookieConsent abrirInicialmente={abrirInicialmente} />");
    expect(LOADERS).toContain("<FeedbackModal pedidoInicial={pedidoInicial} />");
  });
});
