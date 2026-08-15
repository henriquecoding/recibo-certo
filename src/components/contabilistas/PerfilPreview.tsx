"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A PRÉ-VISUALIZAÇÃO — o resultado, não um segundo formulário
//  ---------------------------------------------------------------------
//  A mudança que o redesign faz ao perfil não é trocar inputs: é passar de
//  «formulário longo» para «editor + resultado» (§121.2). Esta é a metade
//  do resultado.
//
//  Deriva do RASCUNHO, nunca da base de dados (§134). Zero pedidos de rede
//  por tecla — o que se escreve à esquerda aparece aqui no mesmo frame. O
//  botão «Ver perfil público» abre a rota real, que é onde se confere; isto
//  é onde se edita.
//
//  ⚠️ O que esta peça NÃO pode mostrar, e é a razão de ter uma lista em vez
//  de receber a ficha inteira: comissão, XP, patamar ou créditos (§138).
//  Isso é uma relação entre a plataforma e o profissional, e o cliente não
//  tem nada a ver com ela.
// ═══════════════════════════════════════════════════════════════════════

import {
  ROTULO_ACAO, acaoDoPerfilPublico, acaoEstaDisponivel, copyResposta,
  nomesDosIdiomas, sinaisDeConfianca, type Contexto, type FichaDePerfil,
} from "@/lib/contabilistas/perfil";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Check, Clock, Globe, MapPin, ShieldCheck, User,
} from "@/components/ui/Icons";

export default function PerfilPreview({
  ficha,
  contexto,
}: {
  ficha: FichaDePerfil;
  /** Quem está a ver. No editor é sempre o cenário de um visitante novo. */
  contexto?: Contexto;
}) {
  const ctx: Contexto = contexto ?? {
    autenticado: true,
    estadoVinculo: null,
    aceitaNovosClientes: ficha.aceitaNovosClientes,
  };
  const acao = acaoDoPerfilPublico(ctx);
  const idiomas = nomesDosIdiomas(ficha.idiomas);
  const resposta = copyResposta(ficha.respostaMediaHoras);
  const sinais = sinaisDeConfianca(ficha).filter((s) => s.presente);

  const lugar = [ficha.concelho?.trim(), ficha.distrito].filter(Boolean).join(", ");
  const atendimento = ficha.modalidades.includes("presencial") && ficha.modalidades.includes("online")
    ? "Atendimento presencial e online"
    : ficha.modalidades.includes("presencial")
      ? "Atendimento presencial"
      : ficha.modalidades.includes("online")
        ? "Atendimento online"
        : null;

  return (
    <div className="space-y-4">
      <section
        aria-label="Pré-visualização do perfil público"
        className="overflow-hidden rounded-4xl border border-stone-200 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900"
      >
        {/* A faixa do hero. Dá ao cartão a profundidade que o §150 pede sem
            o transformar num telemóvel falso dentro da página. */}
        <div className="h-20 bg-gradient-to-br from-brand-deep via-brand-dark to-brand" aria-hidden />

        <div className="px-5 pb-5">
          <span className="-mt-9 mb-3 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-brand-light text-brand-dark shadow-card dark:border-stone-900 dark:bg-brand/20 dark:text-brand-mint">
            <User size={26} aria-hidden />
          </span>

          <h3 className="font-display text-xl text-ink dark:text-stone-100">
            {ficha.nome.trim() || "O teu nome"}
          </h3>
          {ficha.tituloProfissional?.trim() && (
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{ficha.tituloProfissional}</p>
          )}

          {/* Informado ≠ verificado. O rótulo é o que a §124 permite dizer. */}
          {ficha.occ?.trim() && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-categoria-areia-bg px-2 py-0.5 text-[0.6875rem] font-semibold text-categoria-areia-text">
              Nº OCC {ficha.occ}
              <span className="font-normal opacity-70">
                · {ficha.occVerificado ? "Verificado" : "Informado"}
              </span>
            </span>
          )}

          {(ficha.apresentacaoCurta?.trim() || ficha.bio.trim()) && (
            <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {ficha.apresentacaoCurta?.trim() || ficha.bio.trim()}
            </p>
          )}

          {(lugar || atendimento) && (
            <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
              <MapPin size={13} className="shrink-0" aria-hidden />
              {[lugar, atendimento].filter(Boolean).join(" · ")}
            </p>
          )}

          {ficha.especialidades.length > 0 && (
            <>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Áreas de trabalho
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {ficha.especialidades.slice(0, 6).map((e) => (
                  <li
                    key={e}
                    className="rounded-lg bg-brand-light px-2.5 py-1 text-xs font-medium text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
                  >
                    {e}
                  </li>
                ))}
                {ficha.especialidades.length > 6 && (
                  <li className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    +{ficha.especialidades.length - 6}
                  </li>
                )}
              </ul>
            </>
          )}

          <dl className="mt-4 space-y-2 border-t border-stone-100 pt-4 text-sm dark:border-stone-800">
            {resposta && (
              <Linha Icon={Clock} rotulo="Resposta">{resposta.replace("Responde normalmente em ", "")}</Linha>
            )}
            <Linha Icon={Check} rotulo="Aceita novos clientes">
              {ficha.aceitaNovosClientes ? "Sim" : "Sem vagas"}
            </Linha>
            {idiomas.length > 0 && (
              <Linha Icon={Globe} rotulo="Idiomas">{idiomas.join(", ")}</Linha>
            )}
            {ficha.anosExperiencia !== null && (
              <Linha Icon={ShieldCheck} rotulo="Experiência declarada">
                {ficha.anosExperiencia} {ficha.anosExperiencia === 1 ? "ano" : "anos"}
              </Linha>
            )}
          </dl>

          {/* Uma ação, a que faz sentido. Não se oferece o que se vai
              recusar a seguir num modal (§136). */}
          <div className="mt-4">
            <Button
              size="sm"
              className="w-full"
              disabled={!acaoEstaDisponivel(acao)}
              // A pré-visualização não escreve nada: é um espelho.
              onClick={() => {}}
            >
              {ROTULO_ACAO[acao]}
            </Button>
          </div>
        </div>
      </section>

      {sinais.length > 0 && (
        <section
          aria-labelledby="sinais-titulo"
          className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900"
        >
          <h3 id="sinais-titulo" className="font-display text-lg text-ink dark:text-stone-100">
            Sinais de confiança
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Só o que se consegue provar. Sem estrelas, sem «mais procurado».
          </p>
          <ul className="mt-3 space-y-2">
            {sinais.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                <Check size={15} className="shrink-0 text-brand" aria-hidden />
                {s.rotulo}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Linha({
  Icon, rotulo, children,
}: {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex min-w-0 items-center gap-2 text-stone-500 dark:text-stone-400">
        <Icon size={14} className="shrink-0" aria-hidden />
        <span className="truncate">{rotulo}</span>
      </dt>
      <dd className="shrink-0 font-medium text-stone-800 dark:text-stone-200">{children}</dd>
    </div>
  );
}

/** O tipo do contexto sai daqui para quem monte a pré-visualização real. */
export type { Contexto };
