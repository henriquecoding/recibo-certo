"use client";

// ─────────────────────────────────────────────────────────────────────────
//  A SIDEBAR — nove destinos à vista, o resto a um clique.
//
//  Antes: 27 destinos em cinco grupos, todos abertos, com scroll próprio no
//  meio e cabeçalhos a 10 px. Ver `lib/dashboard/navegacao.ts` para o
//  porquê da estrutura; aqui trata-se apenas de a desenhar.
//
//  O que este ficheiro garante:
//   · a ordem NUNCA muda por comportamento — memória espacial é uma
//     funcionalidade, e reordenar por uso destrói-a (§8.3.1);
//   · o estado aberto/fechado de cada grupo recolhível vive no dispositivo
//     e mais nada;
//   · se a rota ativa estiver num grupo fechado, o grupo abre — nenhuma
//     página do produto pode ficar sem o seu destino aceso.
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Logo } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import BotaoNovidades from "@/components/novidades/BotaoNovidades";
import SinoNotificacoes from "@/components/contabilistas/SinoNotificacoes";
import AccountBox from "@/components/dashboard/AccountBox";
import { BuscaTrigger } from "@/components/busca/BuscaTrigger";
import LinkNav from "@/components/dashboard/LinkNav";
import SidebarGrupo from "@/components/dashboard/SidebarGrupo";
import {
  GRUPOS_DASHBOARD,
  ITENS_CONTA,
  ITENS_EXPLORAR,
  grupoAAbrir,
  itemAtivoDashboard,
  type SeccaoDashboard,
} from "@/lib/dashboard/navegacao";

const CHAVE_GRUPOS = "recibocerto:painel-grupos-abertos";

/** Só o estado aberto/fechado. Nunca o que a pessoa fez ou onde esteve. */
function lerAbertos(): SeccaoDashboard[] {
  try {
    const bruto = localStorage.getItem(CHAVE_GRUPOS);
    if (!bruto) return [];
    const lido = JSON.parse(bruto) as unknown;
    return Array.isArray(lido) ? (lido.filter((x) => typeof x === "string") as SeccaoDashboard[]) : [];
  } catch {
    return [];
  }
}

export default function Sidebar({ pathname }: { pathname: string }) {
  const ativo = useMemo(() => itemAtivoDashboard(pathname), [pathname]);
  const forcado = useMemo(() => grupoAAbrir(pathname), [pathname]);
  const [abertos, setAbertos] = useState<SeccaoDashboard[]>([]);

  useEffect(() => {
    setAbertos(lerAbertos());
  }, []);

  const alternar = useCallback((id: SeccaoDashboard) => {
    setAbertos((atuais) => {
      const novos = atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id];
      try {
        localStorage.setItem(CHAVE_GRUPOS, JSON.stringify(novos));
      } catch {
        /* janela privada: o grupo volta ao estado inicial na próxima visita */
      }
      return novos;
    });
  }, []);

  return (
    <aside
      aria-label="Navegação do painel"
      className="sticky top-0 hidden h-screen flex-col border-r border-stone-100 bg-white lg:flex dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex-shrink-0 border-b border-stone-100 px-6 py-5 dark:border-stone-800">
        <Link href="/" aria-label="Recibo Certo — início">
          <Logo />
        </Link>
      </div>

      <div className="flex-shrink-0 px-3 pt-3">
        <BuscaTrigger />
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 pt-4 pb-2">
        {GRUPOS_DASHBOARD.map((grupo) => {
          const lista = (
            <ul className="flex flex-col gap-0.5">
              {grupo.itens.map((item) => (
                <li key={item.id}>
                  <LinkNav
                    item={item}
                    ativo={ativo?.id === item.id}
                    variante={grupo.recolhivel ? "secundario" : "principal"}
                  />
                </li>
              ))}
            </ul>
          );

          if (!grupo.recolhivel) {
            return (
              <div key={grupo.id} className="mb-3">
                <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {grupo.titulo}
                </p>
                {lista}
              </div>
            );
          }

          return (
            <SidebarGrupo
              key={grupo.id}
              id={grupo.id}
              titulo={grupo.titulo}
              nota={grupo.nota}
              aberto={abertos.includes(grupo.id) || forcado === grupo.id}
              alternar={() => alternar(grupo.id)}
            >
              {lista}
            </SidebarGrupo>
          );
        })}

        {/* Explorar — o que era navegação persistente e passou a ser
            destino ocasional. Guias, Quiz e as páginas públicas deixam de
            competir com trabalho recorrente por espaço permanente. */}
        <div className="mt-1 border-t border-stone-100 pt-3 dark:border-stone-800">
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Explorar
          </p>
          <ul className="flex flex-col gap-0.5">
            {ITENS_EXPLORAR.map((item) => (
              <li key={item.id}>
                <LinkNav item={item} ativo={false} variante="secundario" />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="flex-shrink-0 space-y-3 border-t border-stone-100 px-3 py-4 dark:border-stone-800">
        <ul className="flex flex-col gap-0.5">
          {ITENS_CONTA.map((item) => (
            <li key={item.id}>
              <LinkNav item={item} ativo={ativo?.id === item.id} variante="secundario" />
            </li>
          ))}
        </ul>
        <AccountBox />
        <div className="flex items-center justify-between px-1">
          <Link
            href="/"
            className="flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800/60"
          >
            <ArrowLeft size={12} />
            Voltar ao site
          </Link>
          <SinoNotificacoes />
          {/* Ao lado do tema, como em todo o resto do produto — ver
              `novidades/BotaoNovidades.tsx` e a regra 10 do CLAUDE.md. */}
          <BotaoNovidades />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
