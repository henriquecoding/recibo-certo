"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { EVENTO_BUSCA_ABRIR, haLancadorAncorado } from "@/components/busca/motor";
import {
  EVENTO_ABRIR_FEEDBACK,
  type DetalheFeedback,
} from "@/components/feedback/abrir";
import {
  ABRIR_PREFERENCIAS_EVENT,
  lerConsentimento,
} from "@/lib/cookie-consent";
import { useAuth } from "@/lib/supabase/auth";
import { APP_VERSION, VERSAO_STORAGE_KEY } from "@/lib/version";

const marcarCarregamento = (id: string) => {
  if (typeof performance === "undefined") return;
  const nome = `rc:overlay:load:${id}`;
  try {
    performance.mark(nome, { detail: { overlay: id } });
  } catch {
    performance.mark(nome);
  }
};

// Cada superfície traz o runtime de animação no MESMO gesto que a pede.
// O root deixa de referenciar Motion e páginas de texto não pagam pelo
// runtime apenas para manter cinco modais fechados.
const AuthModal = dynamic(async () => {
  marcarCarregamento("auth");
  const [{ default: Modal }, { default: MotionProvider }] = await Promise.all([
    import("@/components/ui/AuthModal"),
    import("@/components/ui/motion/MotionProvider"),
  ]);
  return function AuthModalComMovimento() {
    return <MotionProvider><Modal /></MotionProvider>;
  };
}, { ssr: false });

const BuscaOverlay = dynamic(async () => {
  marcarCarregamento("busca");
  const [{ default: Overlay }, { default: MotionProvider }] = await Promise.all([
    import("@/components/busca/BuscaGlobal"),
    import("@/components/ui/motion/MotionProvider"),
  ]);
  return function BuscaComMovimento(props: { abrirInicialmente?: boolean }) {
    return <MotionProvider><Overlay {...props} /></MotionProvider>;
  };
}, { ssr: false });

const CookieConsent = dynamic(async () => {
  marcarCarregamento("cookies");
  const [{ default: Consentimento }, { default: MotionProvider }] = await Promise.all([
    import("@/components/ui/CookieConsent"),
    import("@/components/ui/motion/MotionProvider"),
  ]);
  return function CookiesComMovimento(props: { abrirInicialmente?: boolean }) {
    return <MotionProvider><Consentimento {...props} /></MotionProvider>;
  };
}, { ssr: false });

const FeedbackModal = dynamic(async () => {
  marcarCarregamento("feedback");
  const [{ default: Modal }, { default: MotionProvider }] = await Promise.all([
    import("@/components/feedback/FeedbackModal"),
    import("@/components/ui/motion/MotionProvider"),
  ]);
  return function FeedbackComMovimento(props: { pedidoInicial: DetalheFeedback }) {
    return <MotionProvider><Modal {...props} /></MotionProvider>;
  };
}, { ssr: false });

const NovidadesModal = dynamic(async () => {
  marcarCarregamento("novidades");
  const [{ default: Modal }, { default: MotionProvider }] = await Promise.all([
    import("@/components/ui/NovidadesModal"),
    import("@/components/ui/motion/MotionProvider"),
  ]);
  return function NovidadesComMovimento() {
    return <MotionProvider><Modal /></MotionProvider>;
  };
}, { ssr: false });

/** Auth só atravessa a fronteira dinâmica depois de a pessoa pedir conta. */
function AuthIntentLoader() {
  const { modalAberto } = useAuth();
  return modalAberto ? <AuthModal /> : null;
}

/**
 * O diálogo global de pesquisa é fallback para superfícies sem lançador
 * ancorado. O listener é minúsculo; índice, motor e diálogo só entram depois
 * do botão/evento/atalho correto.
 */
function SearchIntentLoader() {
  const [pedidoInicial, setPedidoInicial] = useState(false);

  useEffect(() => {
    if (pedidoInicial) return;

    const pedir = () => {
      if (!haLancadorAncorado()) setPedidoInicial(true);
    };
    const aoAtalho = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") pedir();
    };

    window.addEventListener(EVENTO_BUSCA_ABRIR, pedir);
    window.addEventListener("keydown", aoAtalho);
    return () => {
      window.removeEventListener(EVENTO_BUSCA_ABRIR, pedir);
      window.removeEventListener("keydown", aoAtalho);
    };
  }, [pedidoInicial]);

  return pedidoInicial ? <BuscaOverlay abrirInicialmente /> : null;
}

/**
 * O consentimento decide sozinho quando precisa de UI. Uma preferência já
 * guardada não baixa o chunk; o link «Preferências de cookies» continua a
 * conseguir montá-lo e abri-lo no primeiro gesto.
 */
function CookieIntentLoader() {
  const [montar, setMontar] = useState(false);
  const [abrirInicialmente, setAbrirInicialmente] = useState(false);

  useEffect(() => {
    if (!lerConsentimento()) setMontar(true);

    const abrir = () => {
      setAbrirInicialmente(true);
      setMontar(true);
    };
    window.addEventListener(ABRIR_PREFERENCIAS_EVENT, abrir);
    return () => window.removeEventListener(ABRIR_PREFERENCIAS_EVENT, abrir);
  }, []);

  return montar ? <CookieConsent abrirInicialmente={abrirInicialmente} /> : null;
}

/** Feedback preserva o detalhe do primeiro evento enquanto o chunk chega. */
function FeedbackIntentLoader() {
  const [pedidoInicial, setPedidoInicial] = useState<DetalheFeedback | null>(null);

  useEffect(() => {
    if (pedidoInicial) return;
    const abrir = (event: Event) => {
      const detalhe = (event as CustomEvent<DetalheFeedback>).detail ?? {};
      setPedidoInicial(detalhe);
    };
    window.addEventListener(EVENTO_ABRIR_FEEDBACK, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_FEEDBACK, abrir);
  }, [pedidoInicial]);

  return pedidoInicial ? <FeedbackModal pedidoInicial={pedidoInicial} /> : null;
}

/**
 * Novidades é a única abertura automática. Mesmo assim, só o loader leve
 * consulta a versão; o modal e o índice entram em idle e apenas quando há
 * efetivamente uma versão por mostrar.
 */
function NewsIntentLoader() {
  const [montar, setMontar] = useState(false);

  useEffect(() => {
    let precisa = false;
    try {
      precisa = localStorage.getItem(VERSAO_STORAGE_KEY) !== APP_VERSION;
    } catch {
      precisa = true;
    }
    if (!precisa) return;

    let cancelado = false;
    let id: number;
    const ric = (window as unknown as {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    }).requestIdleCallback;
    id = ric
      ? ric(() => !cancelado && setMontar(true), { timeout: 2500 })
      : window.setTimeout(() => !cancelado && setMontar(true), 1200);

    return () => {
      cancelado = true;
      const cic = (window as unknown as {
        cancelIdleCallback?: (handle: number) => void;
      }).cancelIdleCallback;
      if (ric && cic) cic(id);
      else clearTimeout(id);
    };
  }, []);

  return montar ? <NovidadesModal /> : null;
}

/**
 * Apenas coordenadores leves vivem sempre na árvore. Nenhum evento genérico
 * (`pointerdown`, `touchstart`, `keydown`) monta funcionalidades sem relação
 * com a ação pedida.
 */
export default function IntentOverlays() {
  return (
    <>
      <AuthIntentLoader />
      <SearchIntentLoader />
      <CookieIntentLoader />
      <FeedbackIntentLoader />
      <NewsIntentLoader />
    </>
  );
}
