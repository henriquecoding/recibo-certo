// ─────────────────────────────────────────────────────────────────────
//  /v/<referência> — a página que confirma que um documento é autêntico
//  ---------------------------------------------------------------------
//  É a alternativa à assinatura digital, e é melhor do que ela para o que este
//  produto precisa. Um certificado qualificado obriga a gerir chaves num
//  ambiente efémero, e a faixa verde do Acrobat diz apenas «este ficheiro não
//  foi alterado desde que a Recibo Certo o assinou» — não diz «os números estão
//  certos». Vender selo por exatidão é prometer o que não se cumpre.
//
//  Esta página responde à pergunta que a pessoa tem mesmo: «isto foi mesmo
//  emitido por vocês?». Sem sessão, sem instalar nada, no telemóvel de quem
//  recebe o documento.
//
//  E não expõe nada: confirma a existência da referência e mostra o digest a
//  que corresponde. Quem tem o documento compara; quem não tem, não fica a
//  saber nada sobre ele.
// ─────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { consultarEmissao } from "@/lib/documentos/emissao";
import { referenciaValida } from "@/lib/export/referencia";
import { dataExtenso } from "@/lib/export/dinheiro";
import { Check, ShieldCheck, Warning } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = {
  vencimento: "Relatório de vencimento",
  irs: "Simulação de IRS",
  recibos: "Mapa de recibos",
  cenarios: "Cenários guardados",
  auditoria: "Auditoria de recibo",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ referencia: string }>;
}): Promise<Metadata> {
  const { referencia } = await params;
  return {
    title: `Verificar documento ${referencia} · Recibo Certo`,
    description: "Confirma que um documento do Recibo Certo foi mesmo emitido por nós.",
    robots: { index: false, follow: false },
  };
}

function Cartao({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-8">
      {children}
    </div>
  );
}

export default async function VerificarDocumento({
  params,
}: {
  params: Promise<{ referencia: string }>;
}) {
  const { referencia } = await params;
  const normalizada = decodeURIComponent(referencia).toUpperCase().trim();

  // Validar o formato ANTES de ir à base de dados: poupa a consulta e não
  // deixa a página ser usada para sondar o formato das referências.
  const formatoOk = referenciaValida(normalizada);
  const emissao = formatoOk ? await consultarEmissao(normalizada) : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <div className="mb-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-light px-3 py-1 text-[11px] font-semibold text-brand-dark dark:bg-brand/10 dark:text-brand-light">
          <ShieldCheck size={12} /> Verificação de documento
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-stone-900 dark:text-white sm:text-3xl">
          {emissao ? "Documento autêntico" : "Não encontrámos esta referência"}
        </h1>
      </div>

      <Cartao>
        {emissao ? (
          <>
            <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-light/60 p-4 dark:bg-brand/10">
              <Check size={18} className="mt-0.5 flex-none text-brand" />
              <p className="text-sm leading-relaxed text-brand-dark dark:text-brand-light">
                A referência <strong>{emissao.referencia}</strong> corresponde a um documento emitido
                pelo Recibo Certo.
              </p>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-stone-100 pb-3 dark:border-stone-800">
                <dt className="text-stone-500 dark:text-stone-400">Tipo de documento</dt>
                <dd className="font-semibold text-stone-800 dark:text-stone-100">
                  {TIPOS[emissao.tipo] ?? emissao.tipo}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-stone-100 pb-3 dark:border-stone-800">
                <dt className="text-stone-500 dark:text-stone-400">Emitido em</dt>
                <dd className="font-semibold text-stone-800 dark:text-stone-100">
                  {dataExtenso(emissao.emitidoEm)}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-stone-100 pb-3 dark:border-stone-800">
                <dt className="text-stone-500 dark:text-stone-400">Motor de cálculo</dt>
                <dd className="font-semibold text-stone-800 dark:text-stone-100">{emissao.motor}</dd>
              </div>
              <div className="border-b border-stone-100 pb-3 dark:border-stone-800">
                <dt className="text-stone-500 dark:text-stone-400">Impressão digital dos dados</dt>
                <dd className="mt-1 break-all font-mono text-[11px] leading-relaxed text-stone-700 dark:text-stone-300">
                  {emissao.digest}
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
              Compara esta impressão digital com a que está impressa no documento. Se forem iguais,
              o documento que tens em mãos é exatamente o que foi emitido com esta referência.
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
              Esta página <strong>não</strong> mostra o conteúdo do documento nem quem o pediu, e a
              confirmação não certifica o apuramento fiscal — certifica a emissão.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-2xl border border-alert-border bg-alert-bg p-4">
              <Warning size={18} className="mt-0.5 flex-none text-alert-text" />
              <div className="text-sm leading-relaxed text-alert-text">
                <p className="font-semibold">
                  {formatoOk
                    ? "Não há nenhum documento com esta referência."
                    : "Esta referência não tem o formato certo."}
                </p>
                <p className="mt-1 text-alert-text/85">
                  {formatoOk
                    ? "Confirma que copiaste a referência completa do documento. Documentos emitidos antes de agosto de 2026 não têm registo de verificação."
                    : "As referências têm a forma RC-2026-VNC-XXXXXX e nunca usam as letras I e O nem os algarismos 0 e 1 — precisamente para não se confundirem ao ler em voz alta."}
                </p>
              </div>
            </div>
            <p className="mt-5 break-all text-[12px] text-stone-500 dark:text-stone-400">
              Referência consultada: <span className="font-mono">{normalizada}</span>
            </p>
          </>
        )}
      </Cartao>

      <p className="mt-6 text-center text-xs text-stone-400">
        <Link href="/" className="font-semibold text-brand-dark underline dark:text-brand-light">
          Recibo Certo
        </Link>{" "}
        · copiloto fiscal para trabalhadores em Portugal
      </p>
    </main>
  );
}
