"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O PAINEL DE VERIFICAÇÃO — o que o contabilista vê sobre o seu selo
//  ---------------------------------------------------------------------
//  Havia um cadeado e uma frase: «Aparece como informado. A verificação é
//  feita pela administração.» Verdadeiro e inútil — não dizia o que fazer
//  para deixar de ser assim, nem que a verificação tem prazo.
//
//  Este painel responde às quatro perguntas por ordem:
//
//     em que estado estou?  ·  como se chega ao seguinte?
//     quanto tempo dura?    ·  o que acontece quando acabar?
//
//  Toda a decisão vem de `lerVerificacao`. O componente não decide nada —
//  se decidisse, o painel do contabilista e o perfil público podiam dizer
//  coisas diferentes sobre o mesmo selo no mesmo dia.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Check, Clock, ExternalLink, Lock, ShieldCheck, Warning } from "@/components/ui/Icons";
import {
  DIAS_DE_AVISO, PERFIS_METODO, REGISTO_PUBLICO, SCAP_OCC,
  diagnosticarNumeroOCC, lerVerificacao,
  type EstadoVerificacao, type RegistoVerificacao,
} from "@/lib/contabilistas/verificacao";

export interface PainelVerificacaoProps {
  /** O número que está no rascunho do editor — não o que está gravado. */
  numero: string;
  registo: RegistoVerificacao;
  /** Chamado quando a pessoa pede verificação. */
  aoPedir: () => Promise<void> | void;
  /** O pedido ainda não foi gravado — não se pede sobre um rascunho sujo. */
  porGuardar: boolean;
}

const TOM: Record<EstadoVerificacao, "brand" | "alert" | "neutral" | "danger"> = {
  sem_numero: "neutral",
  informado: "neutral",
  em_analise: "alert",
  verificado: "brand",
  a_reconfirmar: "alert",
  recusado: "danger",
};

export default function PainelVerificacao({
  numero, registo, aoPedir, porGuardar,
}: PainelVerificacaoProps) {
  const [ocupado, setOcupado] = useState(false);

  const leitura = useMemo(
    () => lerVerificacao({ numeroAtual: numero, registo }),
    [numero, registo]
  );
  const diagnostico = useMemo(() => diagnosticarNumeroOCC(numero), [numero]);

  const podePedir =
    leitura.proximoPasso?.id === "pedir_verificacao" ||
    leitura.proximoPasso?.id === "renovar";

  async function pedir() {
    setOcupado(true);
    try { await aoPedir(); } finally { setOcupado(false); }
  }

  const Icone = leitura.selo ? ShieldCheck : leitura.estado === "recusado" ? Warning : Lock;

  return (
    <section
      aria-labelledby="verificacao-titulo"
      className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Icone
            size={18}
            aria-hidden
            className={`mt-0.5 shrink-0 ${leitura.selo ? "text-brand" : "text-stone-400"}`}
          />
          <div className="min-w-0">
            <h3 id="verificacao-titulo" className="text-sm font-semibold text-ink">
              Inscrição na Ordem
            </h3>
            <p className="mt-0.5 text-sm text-stone-600">{leitura.rotulo}</p>
          </div>
        </div>
        <Badge tone={TOM[leitura.estado]}>
          {leitura.selo ? "Verificado" : leitura.estado === "em_analise" ? "Em análise" : "Por confirmar"}
        </Badge>
      </div>

      {leitura.detalhe && (
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          {leitura.detalhe}
        </p>
      )}

      {/* O aviso de formato é do editor, não da verificação: apanha o NIF
          colado no campo errado antes de alguém perder um dia à espera de
          uma confirmação que nunca podia acontecer. */}
      {diagnostico.aviso && (
        <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-alert-bg px-3 py-2 text-sm text-alert-text">
          <Warning size={14} className="mt-0.5 shrink-0" aria-hidden />
          {diagnostico.aviso}
        </p>
      )}

      {/* O prazo. É a parte que ninguém espera e a que evita a surpresa de
          o selo desaparecer sem aviso. */}
      {leitura.selo && leitura.diasAteCaducar !== null && (
        <p
          className={`mt-3 flex items-center gap-1.5 text-sm ${
            leitura.aExpirar ? "text-alert-text" : "text-stone-500"
          }`}
        >
          <Clock size={14} aria-hidden />
          {leitura.aExpirar
            ? `A verificação termina dentro de ${leitura.diasAteCaducar} ${leitura.diasAteCaducar === 1 ? "dia" : "dias"}.`
            : `Válida por mais ${leitura.diasAteCaducar} dias. Avisamos-te ${DIAS_DE_AVISO} dias antes do fim.`}
        </p>
      )}

      {/* Como se chega ao estado seguinte. Três vias, com o que cada uma
          prova — e nenhuma promete o que ainda não existe. */}
      {!leitura.selo && leitura.estado !== "sem_numero" && (
        <ul className="mt-4 space-y-2 border-t border-stone-100 pt-4">
          {(["scap", "registo_publico"] as const).map((m) => (
            <li key={m} className="flex items-start gap-2 text-sm">
              <Check size={14} className="mt-1 shrink-0 text-stone-400" aria-hidden />
              <span className="text-stone-600">
                <strong className="font-medium text-stone-700">
                  {PERFIS_METODO[m].rotulo}
                </strong>{" "}
                — {PERFIS_METODO[m].descricao} Vale {PERFIS_METODO[m].validadeDias} dias.
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {podePedir && (
          <Button
            size="sm"
            onClick={() => void pedir()}
            disabled={ocupado || porGuardar || diagnostico.plausibilidade !== "plausivel"}
          >
            {ocupado ? "A enviar…" : leitura.proximoPasso?.rotulo}
          </Button>
        )}
        <a
          href={REGISTO_PUBLICO.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-stone-500 underline underline-offset-2 hover:text-stone-700 dark:hover:text-stone-200"
        >
          Ver o registo público da Ordem
          <ExternalLink size={13} aria-hidden />
        </a>
      </div>

      {porGuardar && podePedir && (
        <p className="mt-2 text-xs text-stone-500">
          Guarda o perfil primeiro — a verificação é feita sobre o número gravado.
        </p>
      )}

      {/* A via automática, dita como está: existe, é oficial, e ainda não
          está ligada. Prometer «em breve» seria inventar uma data. */}
      <p className="mt-3 border-t border-stone-100 pt-3 text-xs leading-relaxed text-stone-500">
        A Ordem aderiu ao{" "}
        <a
          href={SCAP_OCC.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Sistema de Certificação de Atributos Profissionais
        </a>
        , que permite confirmar a inscrição com a Chave Móvel Digital sem
        intermediários. Ligá-lo depende de um protocolo com a AMA — até lá, a
        confirmação é feita por uma pessoa, contra o registo público.
      </p>
    </section>
  );
}
