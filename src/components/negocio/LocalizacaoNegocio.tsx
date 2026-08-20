"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ONDE É QUE O NEGÓCIO ACONTECE — perguntado uma vez (§59)
//  ---------------------------------------------------------------------
//  A região decide mais do que parece: salário mínimo regional, tabelas
//  de retenção de IRS, taxas de IVA, IRC das autónomas, derrama
//  municipal, benefícios de interior e o preçário de contabilidade.
//
//  Estava enterrada num campo do bloco fiscal, e por isso cada motor
//  voltava a pedi-la — o simulador de empresa pergunta a localização, o
//  de IVA a região, o comparador a residência fiscal. É a mesma resposta
//  três vezes, e três oportunidades de divergirem.
//
//  ── DUAS PERGUNTAS, NÃO UMA ────────────────────────────────────────
//  A região é obrigatória para as contas; o município é opcional e só
//  interessa para a derrama e para os benefícios de interior. Juntá-las
//  numa pergunta só obrigaria quem está no continente a escolher um
//  município para poder avançar — e um município escolhido por
//  obrigação é pior do que nenhum (§111).
// ═══════════════════════════════════════════════════════════════════════

import { META_REGIAO, type Regiao } from "@/lib/fiscal-data";
import { LOCALIZACOES_CONHECIDAS } from "@/lib/negocio/localizacao";
import type { LocalizacaoNegocio as Localizacao } from "@/lib/negocio/tipos";
import { Cartao } from "./atomos";

const REGIOES: Regiao[] = ["continente", "madeira", "acores"];

export default function LocalizacaoNegocioEditor({
  localizacao,
  aoMudar,
}: {
  localizacao: Localizacao | undefined;
  aoMudar: (l: Localizacao) => void;
}) {
  const regiao = localizacao?.regiao ?? "continente";
  const declarada = localizacao?.origem === "utilizador";
  // O município só se pergunta no continente: nas autónomas a região já
  // determina os parâmetros fiscais, e a derrama municipal não é o eixo.
  const pedeMunicipio = regiao === "continente";
  const municipios = LOCALIZACOES_CONHECIDAS.filter(
    (l) => l.regiaoId !== "madeira" && l.regiaoId !== "acores",
  );

  return (
    <Cartao
      titulo="Onde é que o negócio acontece"
      descricao="Perguntamos uma vez — decide salário mínimo, IRS, IVA, IRC e derrama em tudo o que se segue"
      id="localizacao"
    >
      <fieldset>
        <legend className="text-xs font-semibold text-stone-700 dark:text-stone-200">Região</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {REGIOES.map((r) => {
            const ativo = declarada && regiao === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={ativo}
                onClick={() =>
                  aoMudar({
                    regiao: r,
                    // Mudar de região invalida o município anterior: um
                    // município do continente não existe na Madeira.
                    municipio: r === regiao ? localizacao?.municipio : undefined,
                    regiaoIncentivoId: r === regiao ? localizacao?.regiaoIncentivoId : undefined,
                    origem: "utilizador",
                  })
                }
                className={`min-h-[44px] rounded-2xl border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  ativo
                    ? "border-brand bg-brand-light/60 dark:bg-brand/10"
                    : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-600"
                }`}
              >
                <span
                  className={`block text-sm font-semibold ${
                    ativo ? "text-brand-deep dark:text-brand-mint" : "text-stone-800 dark:text-stone-100"
                  }`}
                >
                  {META_REGIAO[r]}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {pedeMunicipio ? (
        <div className="mt-3">
          <label
            htmlFor="localizacao-municipio"
            className="block text-xs font-semibold text-stone-700 dark:text-stone-200"
          >
            Zona, se já souberes
          </label>
          <p
            id="localizacao-municipio-desc"
            className="mt-0.5 text-[11px] leading-snug text-stone-500 dark:text-stone-400"
          >
            A derrama é municipal e há benefícios de IRC próprios do interior. Sem esta resposta não aplicamos nenhum
            dos dois — em vez de escolher um município por ti.
          </p>
          <select
            id="localizacao-municipio"
            aria-describedby="localizacao-municipio-desc"
            value={localizacao?.regiaoIncentivoId ?? ""}
            onChange={(e) => {
              const id = e.target.value;
              const escolhida = municipios.find((m) => m.regiaoId === id);
              aoMudar({
                regiao,
                municipio: escolhida?.nome,
                regiaoIncentivoId: escolhida?.regiaoId,
                origem: "utilizador",
              });
            }}
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          >
            <option value="">Ainda não sei</option>
            {municipios.map((m) => (
              <option key={m.regiaoId + m.nome} value={m.regiaoId}>
                {m.nome} · {m.selo}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!declarada ? (
        <p className="mt-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          Estamos a assumir Continente. Se for outra região, as contas mudam — o salário mínimo, o IRS, o IVA e o IRC
          são todos diferentes nas autónomas.
        </p>
      ) : null}
    </Cartao>
  );
}
