"use client";

// ═══════════════════════════════════════════════════════════════════════
//  LEVAR ISTO A UM CONTABILISTA — a porta que os Guias nunca tiveram
//  ---------------------------------------------------------------------
//  O segundo destino de um Guia. Não é um link que a pessoa manda: é um
//  documento de trabalho — a projeção versionada do guia que ela leu, mais
//  o que ela respondeu e marcou — que segue com consentimento, fica preso
//  à VERSÃO LIDA, e do outro lado tem uma consola onde se extrai e se pede.
//
//  ⚠️ RECEBE DADOS, NÃO IMPORTA CATÁLOGOS. A `ProjecaoDeGuia` chega por
//  props, já feita no servidor. Importar `projecao.servidor.ts` aqui
//  traria `catalogo.ts` + `conteudo.ts` + `dados-motor.ts` — meio
//  megabyte — para desenhar uma folha que a maior parte das visitas nem
//  abre. É a regra de `atalhos.servidor.ts`, e `dossie:fronteira`
//  verifica-a.
//
//  ⚠️ A FOLHA ENTRA POR `next/dynamic`, dentro de um `ErrorBoundary`. Este
//  ficheiro é só o botão: leve, servido em 169 páginas. O que é pesado —
//  composição, formatos, camada de dados — só chega quando alguém carrega.
//
//  ⚠️ NÃO VERIFICA O PLANO, e não pode passar a verificar. Ver
//  `PARTILHA_NUNCA_EXIGE_PLUS` em `contabilistas/vinculo.ts`.
// ═══════════════════════════════════════════════════════════════════════

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { registar } from "@/lib/analytics/cliente";
import Button from "@/components/ui/Button";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { ArrowRight, Briefcase } from "@/components/ui/Icons";
import type { ProjecaoDeGuia } from "@/lib/guias/dossie";

const FolhaDossie = dynamic(() => import("./FolhaDossie"), { ssr: false });

interface Props {
  projecao: ProjecaoDeGuia;
  /**
   * `principal` desenha o cartão que LIDERA a secção final; `secundaria`
   * desenha um cartão QUIETO, por baixo de outra ação.
   *
   * A diferença entre os dois é deliberada e tem uma regra por trás: nunca
   * duas ações do mesmo peso no fim de uma página, porque é a forma
   * garantida de ninguém clicar em nenhuma. O primário é tinto de marca,
   * com `h2` e botão cheio — o mesmo porte do cartão da FIZ, porque quando
   * lidera tem de liderar. O secundário não tem fundo de marca, o título é
   * `h3`, e o botão é de contorno.
   *
   * ⚠️ O que o secundário NÃO pode voltar a ser é uma linha de texto
   * sublinhada. Era o que estava, e desaparecia debaixo de um cartão
   * amarelo com um botão cheio: a segunda opção existia no HTML e não
   * existia no ecrã. Ser mais leve não é ser invisível.
   */
  variante: "principal" | "secundaria";
  /** O motivo da rota, em pt-PT. §13.2: o motivo é visível. */
  motivo?: string;
  /** A rota que o guia escolheu — vai na medição, nunca no ecrã. */
  rota?: "contabilista" | "fiz";
}

/**
 * O que o dossiê deste guia traz, em números.
 *
 * Contagens, não promessas: são as secções que a projeção produziu, e a
 * pessoa vê-as uma a uma antes de escolher o que segue. É isto que
 * distingue «preparamos um dossiê» — que não quer dizer nada — de uma
 * oferta concreta.
 */
function inventario(p: ProjecaoDeGuia): string[] {
  const partes: string[] = [];
  if (p.sinais.fontes > 0) {
    partes.push(`${p.sinais.fontes} ${p.sinais.fontes === 1 ? "fonte oficial" : "fontes oficiais"}`);
  }
  if (p.sinais.elementos > 0) {
    partes.push(`${p.sinais.elementos} ${p.sinais.elementos === 1 ? "elemento a reunir" : "elementos a reunir"}`);
  }
  if (p.sinais.afirmacoesPorRever > 0) {
    partes.push(
      `${p.sinais.afirmacoesPorRever} ${p.sinais.afirmacoesPorRever === 1 ? "ponto que exige" : "pontos que exigem"} revisão`,
    );
  }
  return partes;
}

/** Os números, como fichas. Legíveis de relance, sem ler a frase toda. */
function Fichas({ itens }: { itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {itens.map((t) => (
        <li
          key={t}
          className="rounded-lg bg-white/70 px-2 py-1 texto-mini font-medium text-stone-600 dark:bg-white/10 dark:text-stone-300"
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

export default function DossieDoGuia({ projecao, variante, motivo, rota = "contabilista" }: Props) {
  const [aberto, setAberto] = useState(false);
  const { user } = useAuth();

  const abrir = useCallback(() => {
    setAberto(true);
    registar("guide_dossier_start", {
      guide_id: projecao.guia.slug,
      route: rota,
      user_state: user ? "autenticado" : "anonimo",
    });
  }, [projecao.guia.slug, rota, user]);

  const fichas = inventario(projecao);

  return (
    <>
      {variante === "principal" ? (
        // O mesmo porte do cartão da FIZ — tinta de marca, eyebrow, `h2` e
        // botão cheio. Quando esta é a rota escolhida, é esta que lidera.
        <section
          aria-labelledby={`dossie-${projecao.guia.slug}`}
          className="mt-8 overflow-hidden rounded-4xl border border-brand/25 bg-brand-light shadow-card"
        >
          <div className="p-5 sm:p-6">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-dark">
                Próximo passo
              </span>
              <span aria-hidden className="text-brand/40">·</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-dark">
                <Briefcase size={13} aria-hidden />
                Contabilista certificado
              </span>
            </div>

            <h2
              id={`dossie-${projecao.guia.slug}`}
              className="font-display text-xl font-semibold text-ink"
            >
              Levar este caso a um contabilista
            </h2>

            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              Preparamos o dossiê deste guia — o que ele responde, a base legal com artigo e
              ligação, os elementos a reunir e o que depende do teu caso. Vês tudo e escolhes
              o que segue.
            </p>

            {motivo && (
              <p className="mt-3 rounded-2xl bg-white/70 px-3 py-2 text-xs leading-relaxed text-stone-700 dark:bg-white/10 dark:text-stone-200">
                {motivo}
              </p>
            )}

            <Fichas itens={fichas} />

            <div className="mt-4">
              <Button onClick={abrir}>
                <span className="inline-flex items-center gap-2">
                  Preparar o dossiê <ArrowRight size={16} aria-hidden />
                </span>
              </Button>
            </div>

            <p className="mt-3 texto-mini leading-relaxed text-stone-500 dark:text-stone-400">
              Não custa nada e não precisas de plano nenhum. Podes levar o ficheiro sem sequer
              criar conta.
            </p>
          </div>
        </section>
      ) : (
        // Quieto, mas não invisível: cartão sem tinta de marca, `h3`, e um
        // botão de contorno. Continua a ser lido de relance — que é o que
        // uma linha sublinhada debaixo de um cartão cheio nunca foi.
        <section
          aria-labelledby={`dossie-alt-${projecao.guia.slug}`}
          className="mt-4 rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Ou, se o caso pedir julgamento
          </p>

          <h3
            id={`dossie-alt-${projecao.guia.slug}`}
            className="mt-1 flex items-center gap-2 font-display text-base font-semibold text-ink sm:text-lg"
          >
            <Briefcase size={16} className="shrink-0 text-brand" aria-hidden />
            Levar este caso a um contabilista
          </h3>

          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Preparamos o dossiê deste guia — com a base legal, os elementos a reunir e o que
            depende da tua situação — e escolhes o que segue e para quem.
          </p>

          <Fichas itens={fichas} />

          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={abrir}>
              <span className="inline-flex items-center gap-2">
                Preparar o dossiê <ArrowRight size={15} aria-hidden />
              </span>
            </Button>
          </div>

          <p className="mt-3 texto-mini leading-relaxed text-stone-500 dark:text-stone-400">
            Gratuito, sem plano e sem conta obrigatória.
          </p>
        </section>
      )}

      {aberto && (
        <ErrorBoundary etiqueta="a folha do dossiê">
          <FolhaDossie projecao={projecao} onFechar={() => setAberto(false)} />
        </ErrorBoundary>
      )}
    </>
  );
}
