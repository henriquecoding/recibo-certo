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
import { useRouter } from "next/navigation";
import { MODULOS } from "@/lib/contabilistas/dashboard/modulos";
import type { WorkspaceLayoutV2, WorkspaceWidgetInstance } from "@/lib/contabilistas/dashboard/tipos";
import MolduraModulo, { CorpoACarregar, CorpoErro, type AcaoDoMenu } from "./MolduraModulo";
import CorpoDoModulo from "./widgets";
import { estiloDaCelula } from "./celula";
import { usarDominios } from "./broker";
import type { Broker } from "./broker";
import type { DominioDados } from "@/lib/contabilistas/dashboard/modulos";
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
  const router = useRouter();

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

  // ⚠️ Sem esta subscrição, a moldura lia o broker durante o render e
  // dependia de a raiz do painel a voltar a renderizar. A raiz deixou de
  // ter subscrição global — cada módulo reage ao que consome.
  usarDominios(broker, def.dominios);
  const estados = def.dominios.map((d) => broker.estado(d));
  const erro = estados.find((e) => e.estado === "erro");
  const aCarregar = estados.some((e) => e.estado === "a-carregar");

  // O menu `•••` do modo normal. `MolduraModulo` sempre o documentou (§9.1)
  // e a grelha nunca lhe passou ações, por isso ele nunca existia. As duas
  // que fazem sentido aqui são as que não mexem no painel: reler os dados
  // deste cartão, e abrir a superfície completa por trás dele.
  const acoes: AcaoDoMenu[] = [
    {
      rotulo: "Atualizar este módulo",
      onSelect: () => {
        pedido.current = true;
        void broker.revalidar(def.dominios);
      },
    },
    ...(def.rota
      ? [{ rotulo: `Abrir ${def.titulo.toLowerCase()}`, onSelect: () => router.push(href(def.rota!)) }]
      : []),
  ];

  return (
    <div
      ref={caixa}
      className={`${styles.celula} ${classeMovel(item)}`}
      style={estiloDaCelula(item)}
    >
      <MolduraModulo
        type={item.type}
        tag={item.tag}
        placement={item.desktop}
        edicao={false}
        frescura={frescuraDe(broker, def.dominios)}
        acoes={acoes}
      >
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
            config={item.config}
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


/**
 * O que dizer sobre a idade dos dados deste módulo — ou nada.
 *
 * ⚠️ Devolve `undefined` no caso normal, e é isso o mais importante aqui.
 * O painel não anuncia frescura enquanto os dados estão dentro do prazo:
 * 24 módulos a dizer «há 1 min» é ruído, e ruído ensina a não ler.
 *
 * Fala em duas situações: quando alguma coisa está a ser relida com o
 * resultado anterior ainda no ecrã, e quando passou do TTL do domínio.
 */
function frescuraDe(broker: Broker, dominios: readonly DominioDados[]): string | undefined {
  let aRevalidar = false;
  let maisAntigo: number | null = null;

  for (const d of dominios) {
    const e = broker.estado(d);
    if (e.estado !== "pronto") continue;
    if (e.aRevalidar) aRevalidar = true;
    if (broker.velho(d)) {
      maisAntigo = maisAntigo === null ? e.atualizadoEm : Math.min(maisAntigo, e.atualizadoEm);
    }
  }

  if (aRevalidar) return "a atualizar…";
  if (maisAntigo === null) return undefined;

  const min = Math.floor((Date.now() - maisAntigo) / 60_000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const horas = Math.floor(min / 60);
  return horas < 24 ? `há ${horas} h` : "há mais de um dia";
}
