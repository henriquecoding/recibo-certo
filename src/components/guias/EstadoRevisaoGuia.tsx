import { ShieldCheck, Warning, Clock, Scale } from "@/components/ui/Icons";
import { confiancaDoGuia } from "@/lib/guias";

// ─────────────────────────────────────────────────────────────────────────
//  Confiança visível (ponto 9.4 da auditoria).
//
//  Substitui o selo genérico "Sempre atualizado" por informação verificável:
//  quando foi revisto, a que período se aplica, quantas fontes oficiais
//  sustentam o conteúdo e se há alguma alteração por confirmar.
//
//  Só promete o que o pipeline consegue garantir.
// ─────────────────────────────────────────────────────────────────────────

const dataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });

export default function EstadoRevisaoGuia({ slug }: { slug: string }) {
  const c = confiancaDoGuia(slug);
  if (!c) return null;

  const periodo = c.aplicavelAte
    ? `Aplicável a ${new Date(c.aplicavelDe).getFullYear()}`
    : `Aplicável desde ${dataLonga(c.aplicavelDe)}`;

  const emRevisao = c.estado === "em_revisao" || c.estado === "alteracao_detetada";

  return (
    <div
      className={`mb-8 rounded-3xl border px-4 py-3 sm:px-5 ${
        emRevisao
          ? "border-alert-border bg-alert-bg"
          : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className={`inline-flex items-center gap-1.5 font-semibold ${emRevisao ? "text-alert-text" : "text-brand-dark"}`}>
          {emRevisao ? <Warning size={13} /> : <ShieldCheck size={13} />}
          {c.estado === "revisto" && "Revisto"}
          {c.estado === "alteracao_detetada" && "Em revisão"}
          {c.estado === "em_revisao" && "Em revisão"}
          {c.estado === "arquivado" && "Arquivado"}
        </span>

        <span className="inline-flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
          <Clock size={12} />
          {dataLonga(c.revistoEm)}
        </span>

        <span className="text-stone-500 dark:text-stone-400">{periodo}</span>

        <span className="inline-flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
          <Scale size={12} />
          {c.numeroFontesOficiais} {c.numeroFontesOficiais === 1 ? "fonte oficial" : "fontes oficiais"}
        </span>
      </div>

      {emRevisao && (
        <p className="mt-2 text-xs leading-relaxed text-alert-text">
          {c.afirmacoesPorRever > 0
            ? "Este guia contém matéria que depende do caso concreto e exige revisão especializada. Confirma com um contabilista antes de agir."
            : "Foi detetada uma alteração numa fonte oficial. Confirma antes de agir."}
        </p>
      )}
    </div>
  );
}
