"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CABEÇALHO DA SALA — o lado do cliente
//  ---------------------------------------------------------------------
//  Quem é, em que estado está, e o que se pode fazer a seguir. Por esta
//  ordem, porque é a ordem por que se lê.
//
//  A linha de credenciais («Contabilista certificada · IRS e trabalhadores
//  independentes · Lisboa») é montada a partir do que ESTÁ verificado, e
//  não de um texto escrito à mão. A distinção entre «OCC verificada» e
//  «OCC informada» vem de `estadoOcc` e existe desde a §124: um número
//  escrito no formulário é informado; verificado exige que alguém o tenha
//  confirmado junto da Ordem. Escrever «certificada» sobre um número
//  informado seria a plataforma a garantir uma coisa que não confirmou.
//
//  O selo de proteção diz o que é verdade hoje, e não o que era verdade
//  antes: o vínculo continua a não guardar contacto nenhum, mas o canal
//  deixou de ser fechado. Os contactos existem no caso, e chegam cá se — e
//  enquanto — o cliente os partilhar. Ver `20260818210000_fim_da_mediacao`.
//
//  E no fim entram os canais diretos DO CONTABILISTA, que é o outro
//  sentido e a outra decisão: email, telefone e site saíram do perfil
//  público em `20260820165708` e passaram a abrir-se aqui, com a
//  aceitação. Quem decide se este bloco aparece é a base de dados.
// ═══════════════════════════════════════════════════════════════════════

import type { Contabilista } from "@/lib/contabilistas/tipos";
import type { EstadoVinculo } from "@/lib/contabilistas/tipos";
import { estadoOcc } from "@/lib/contabilistas/diretorio";
import { ROTULO_VINCULO } from "@/lib/contabilistas/vinculo";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ContactosDoContabilista from "./ContactosDoContabilista";
import { primeiroNome } from "@/components/contabilistas/hub";
import { ShieldCheck } from "@/components/ui/Icons";

/**
 * As credenciais numa linha, separadas por ponto médio.
 *
 * Só entra o que existe. Uma linha com «· ·» a meio, por um campo vazio,
 * é pior do que uma linha mais curta.
 */
export function linhaDeCredenciais(cc: Contabilista): string {
  const occ = estadoOcc({ occ: cc.occ, occVerificado: cc.occVerificado });
  const local = [cc.concelho, cc.distrito].filter(Boolean)[0] ?? null;

  return [
    cc.tituloProfissional?.trim() || (occ.tom === "verificada" ? "Contabilista certificado" : "Contabilista"),
    cc.especialidades.slice(0, 2).join(" e ") || null,
    local,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function CabecalhoRelacao({
  cc,
  estadoVinculo,
  podeMarcar,
  aoMarcar,
}: {
  cc: Contabilista;
  estadoVinculo: EstadoVinculo;
  podeMarcar: boolean;
  aoMarcar: () => void;
}) {
  const ativo = estadoVinculo === "ativo";

  return (
    <header className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
          O meu contabilista
        </p>

        <p className="inline-flex items-center gap-1.5 rounded-lg bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-dark">
          <ShieldCheck size={13} aria-hidden />
          Conversa só entre vocês
        </p>
      </div>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">{cc.nome}</h1>
            <Badge tone={ativo ? "brand" : estadoVinculo === "terminado" ? "neutral" : "alert"}>
              {ativo ? "Acompanhamento ativo" : ROTULO_VINCULO[estadoVinculo]}
            </Badge>
          </div>

          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            {linhaDeCredenciais(cc)}
          </p>
        </div>

        {podeMarcar && (
          <Button className="w-full shrink-0 sm:w-auto" onClick={aoMarcar}>
            Marcar consulta
          </Button>
        )}
      </div>

      {/* O que se ganha ao ser aceite. Quem não tem vínculo vivo não vê
          bloco nenhum — e não é este componente que o decide: a RPC
          `contactos_do_contabilista` não devolve nada, e sem dados não há
          nada para desenhar. */}
      <ContactosDoContabilista contabilistaId={cc.userId} nome={primeiroNome(cc.nome)} />
    </header>
  );
}
