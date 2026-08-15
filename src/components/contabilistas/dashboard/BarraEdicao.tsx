"use client";

/**
 * A barra «Modo de edição ativo» — referência A.
 *
 * Estrutura da imagem, da esquerda para a direita:
 *
 *   ⋮⋮  Modo de edição ativo
 *       Personalize o seu painel arrastando, redimensionando e organizando
 *       os módulos.
 *                        [A grelha está ativa] [Alinhar ▾] [Arrumar módulos]
 *
 * ⚠️ Uma divergência deliberada face à imagem, e é de linguagem: a imagem
 * escreve «Sugestão de layout ✨». Nada aqui sugere nem gera — é uma
 * reorganização DETERMINÍSTICA por prioridade do registry (críticos em
 * cima, diferidos em baixo, compactar). Chamar-lhe «sugestão» prometia
 * inteligência que não existe, e a palavra faria a pessoa esperar um
 * layout pensado em vez de um layout arrumado. Tem pré-visualização pelo
 * Desfazer, que continua a valer para esta ação como para qualquer outra.
 */

import { useEffect, useRef, useState } from "react";
import { GripHorizontal, Sparkle, ChevronDown, Check } from "@/components/ui/Icons";
import styles from "./barra-edicao.module.css";

export default function BarraEdicao({
  grelhaVisivel, onAlternarGrelha, onCompactar, onAlinharEsquerda, onArrumar,
}: {
  grelhaVisivel: boolean;
  onAlternarGrelha: () => void;
  onCompactar: () => void;
  onAlinharEsquerda: () => void;
  onArrumar: () => void;
}) {
  return (
    <div className={styles.barra} role="status">
      <span className={styles.icone} aria-hidden>
        <GripHorizontal size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={styles.titulo}>Modo de edição ativo</span>
        <span className={styles.sub}>
          Personalize o seu painel arrastando, redimensionando e organizando os módulos.
        </span>
      </span>

      <span className={styles.acoes}>
        <button
          type="button"
          onClick={onAlternarGrelha}
          aria-pressed={grelhaVisivel}
          className={`${styles.acao} ${grelhaVisivel ? styles.acaoAtiva : ""} focus-marca`}
        >
          {grelhaVisivel && <Check size={12} aria-hidden />}
          {grelhaVisivel ? "A grelha está ativa" : "Mostrar a grelha"}
        </button>

        <MenuAlinhar onCompactar={onCompactar} onAlinharEsquerda={onAlinharEsquerda} />

        <button type="button" onClick={onArrumar} className={`${styles.acao} focus-marca`}>
          <Sparkle size={12} aria-hidden />
          Arrumar módulos
        </button>
      </span>
    </div>
  );
}

function MenuAlinhar({
  onCompactar, onAlinharEsquerda,
}: {
  onCompactar: () => void;
  onAlinharEsquerda: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    }
    function tecla(e: KeyboardEvent) { if (e.key === "Escape") setAberto(false); }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className={`${styles.acao} focus-marca`}
      >
        Alinhar <ChevronDown size={12} aria-hidden />
      </button>
      {aberto && (
        <div role="menu" className={styles.menu}>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setAberto(false); onCompactar(); }}
            className={styles.menuItem}
          >
            Subir tudo o que puder subir
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setAberto(false); onAlinharEsquerda(); }}
            className={styles.menuItem}
          >
            Alinhar à esquerda
          </button>
        </div>
      )}
    </div>
  );
}
