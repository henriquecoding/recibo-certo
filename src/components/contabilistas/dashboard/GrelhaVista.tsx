"use client";

/**
 * A grelha em modo NORMAL.
 *
 * É deliberadamente burra e leve (§12.10, §12.11): não instala ouvintes de
 * pointer, não calcula zonas de queda, não corre motor de colisões, não
 * monta a biblioteca. Um contabilista que só quer ver o painel não paga
 * nada da maquinaria de edição — essa vive em `GrelhaEdicao`, que só é
 * carregada ao clicar «Personalizar painel».
 *
 * A posição vem do layout guardado e é aplicada com CSS Grid:
 * `grid-column: col / span colSpan`. Não há tradução para pixels em sítio
 * nenhum, e é por isso que o painel reaparece igual em qualquer largura.
 *
 * Cada módulo carrega o seu domínio quando entra no viewport (§12.7), com
 * uma margem para o dado chegar pouco antes de se ver o cartão.
 */

import { useEffect, useRef } from "react";
import { MODULOS } from "@/lib/contabilistas/dashboard/modulos";
import type { WorkspaceLayoutV2, WorkspaceWidgetInstance } from "@/lib/contabilistas/dashboard/tipos";
import MolduraModulo, { CorpoACarregar, CorpoErro } from "./MolduraModulo";
import CorpoDoModulo from "./widgets";
import type { Broker } from "./broker";
import styles from "./painel-modular.module.css";

export default function GrelhaVista({
  layout, broker, href,
}: {
  layout: WorkspaceLayoutV2;
  broker: Broker;
  href: (destino: string) => string;
}) {
  const visiveis = layout.items.filter((i) => !i.hidden);

  return (
    <div className={styles.grelha}>
      {visiveis.map((item) => (
        <Celula key={item.instanceId} item={item} broker={broker} href={href} />
      ))}
    </div>
  );
}

function Celula({
  item, broker, href,
}: {
  item: WorkspaceWidgetInstance;
  broker: Broker;
  href: (destino: string) => string;
}) {
  const def = MODULOS[item.type];
  const caixa = useRef<HTMLDivElement>(null);
  const pedido = useRef(false);

  // Módulos críticos pedem o domínio de imediato; os outros esperam por
  // ficar perto do viewport. `hidden` nunca chega aqui — a grelha
  // filtra-o antes, e por isso um módulo oculto não dispara leitura.
  useEffect(() => {
    if (pedido.current) return;

    if (def.prioridade === "critical") {
      pedido.current = true;
      void broker.pedirVarios(def.dominios);
      return;
    }

    const el = caixa.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      pedido.current = true;
      void broker.pedirVarios(def.dominios);
      return;
    }

    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting) && !pedido.current) {
          pedido.current = true;
          void broker.pedirVarios(def.dominios);
          obs.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [broker, def.dominios, def.prioridade]);

  const estados = def.dominios.map((d) => broker.estado(d));
  const erro = estados.find((e) => e.estado === "erro");
  const aCarregar = estados.some((e) => e.estado === "a-carregar");

  return (
    <div
      ref={caixa}
      className={`${styles.celula} ${classeMovel(item)}`}
      style={{
        gridColumn: `${item.desktop.col} / span ${item.desktop.colSpan}`,
        gridRow: `${item.desktop.row} / span ${item.desktop.rowSpan}`,
        order: item.mobile?.order ?? 0,
      }}
    >
      <MolduraModulo type={item.type} tag={item.tag} placement={item.desktop} edicao={false}>
        {erro && erro.estado === "erro" ? (
          <CorpoErro
            texto={erro.mensagem}
            onRepetir={() => {
              pedido.current = true;
              void broker.revalidar(def.dominios);
            }}
          />
        ) : aCarregar ? (
          <CorpoACarregar linhas={item.desktop.rowSpan >= 5 ? 4 : 3} />
        ) : (
          <CorpoDoModulo
            type={item.type}
            colSpan={item.desktop.colSpan}
            rowSpan={item.desktop.rowSpan}
            broker={broker}
            href={href}
          />
        )}
      </MolduraModulo>
    </div>
  );
}

/** No telemóvel a altura vem do tamanho semântico, não do `rowSpan`. */
function classeMovel(item: WorkspaceWidgetInstance): string {
  const size = item.mobile?.size ?? "M";
  return size === "L" ? styles.celulaL : size === "S" ? styles.celulaS : styles.celulaM;
}
