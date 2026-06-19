"use client";

// Barreira de erro reutilizável. Isola secções pesadas (ex.: mapas Leaflet) para
// que uma falha em runtime no cliente NÃO faça a página inteira ficar em branco —
// mostra um aviso discreto e o resto da página continua a funcionar.

import { Component, type ReactNode } from "react";
import { Warning } from "@/components/ui/Icons";

interface Props {
  children: ReactNode;
  /** Fallback opcional; por defeito mostra um aviso compacto. */
  fallback?: ReactNode;
  /** Rótulo do que falhou (para a mensagem por defeito). */
  etiqueta?: string;
}
interface State {
  falhou: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { falhou: false };

  static getDerivedStateFromError(): State {
    return { falhou: true };
  }

  componentDidCatch(erro: unknown) {
    if (typeof console !== "undefined") console.error("[ErrorBoundary]", this.props.etiqueta ?? "", erro);
  }

  render() {
    if (this.state.falhou) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-start gap-2.5 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/50">
          <Warning size={15} className="mt-0.5 flex-shrink-0 text-stone-400" />
          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Não foi possível mostrar {this.props.etiqueta ?? "esta secção"} agora. Tenta recarregar a página — o resto
            continua a funcionar.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
