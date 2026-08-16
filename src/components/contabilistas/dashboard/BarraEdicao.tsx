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

import { GripHorizontal, Sparkle, ChevronDown, Check } from "@/components/ui/Icons";
import MenuFlutuante from "./MenuFlutuante";
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
        {/* Duas explicações, porque são dois gestos diferentes. No
            telemóvel não se arrasta nem se redimensiona — a grelha é uma
            lista — e prometer isso mandava a pessoa tentar uma coisa que
            não acontece. */}
        <span className={`${styles.sub} hidden sm:block`}>
          Personalize o seu painel arrastando, redimensionando e organizando os módulos.
        </span>
        <span className={`${styles.sub} sm:hidden`}>
          Toque em «Organizar» para mudar a ordem, o tamanho e o que aparece.
        </span>
      </span>

      {/* Grelha, alinhar e arrumar escrevem em coordenadas de grelha, que
          abaixo dos 640px ninguém lê. Escondem-se em vez de aceitarem o
          toque e não fazerem nada. */}
      <span className={`${styles.acoes} hidden sm:flex`}>
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

/** O mesmo `MenuFlutuante` do módulo — tinha a mesma avaria de recorte. */
function MenuAlinhar({
  onCompactar, onAlinharEsquerda,
}: {
  onCompactar: () => void;
  onAlinharEsquerda: () => void;
}) {
  return (
    <MenuFlutuante
      etiqueta="Alinhar módulos"
      className={styles.menu}
      alinhar="esquerda"
      gatilho={(p) => (
        <button {...p} type="button" className={`${styles.acao} focus-marca`}>
          Alinhar <ChevronDown size={12} aria-hidden />
        </button>
      )}
    >
      {(fechar) => (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={() => { fechar(); onCompactar(); }}
            className={styles.menuItem}
          >
            Subir tudo o que puder subir
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { fechar(); onAlinharEsquerda(); }}
            className={styles.menuItem}
          >
            Alinhar à esquerda
          </button>
        </>
      )}
    </MenuFlutuante>
  );
}
