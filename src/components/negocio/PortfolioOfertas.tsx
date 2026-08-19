"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ATO 4 — O portefólio
//  ---------------------------------------------------------------------
//  «Os meus preços» já mostrava uma lista de ofertas e somava o lucro. O
//  que faltava era a relação entre elas: quanto cada uma pesa, quanto
//  cada uma contribui, e o que acontece se uma cair.
//
//  ── UMA VISUALIZAÇÃO, NÃO SEIS ─────────────────────────────────────
//  P0 do §13: receita por oferta, porque é a que responde à pergunta que
//  muda decisões — «de onde vem mesmo o meu dinheiro?». As barras são
//  horizontais de propósito: em 360 px, um gráfico de barras verticais
//  com três rótulos ilegíveis é pior do que uma lista.
// ═══════════════════════════════════════════════════════════════════════

import { fmt, pct } from "@/lib/format";
import { Plus, ShoppingBag } from "@/components/ui/Icons";
import type {
  DiagnosticoConcentracao,
  ResultadoOfertaNegocio,
  VolumeOferta,
} from "@/lib/negocio/tipos";
import { Barra, BotaoSecundario, Cartao, Vazio } from "./atomos";
import OfertaCard from "./OfertaCard";

export default function PortfolioOfertas({
  ofertas,
  concentracao,
  receitaTotal,
  aoAdicionar,
  aoEditarPreco,
  aoRemover,
  aoMudarVolume,
  aoMudarCapacidade,
  aoRenomear,
}: {
  ofertas: ResultadoOfertaNegocio[];
  concentracao: DiagnosticoConcentracao;
  receitaTotal: number;
  aoAdicionar: () => void;
  aoEditarPreco: (id: string) => void;
  aoRemover: (id: string) => void;
  aoMudarVolume: (id: string, v: VolumeOferta) => void;
  aoMudarCapacidade: (id: string, maximoMes: number | null) => void;
  aoRenomear: (id: string, nome: string) => void;
}) {
  if (ofertas.length === 0) {
    return (
      <Cartao id="portfolio">
        <Vazio
          icone={<ShoppingBag size={18} />}
          titulo="Ainda não há nada para vender"
          texto="Um negócio começa por uma oferta: um produto, um serviço, o teu tempo. Define a primeira e o preço sai daí."
          acao={
            <BotaoSecundario onClick={aoAdicionar}>
              <Plus size={14} />
              Definir a primeira oferta
            </BotaoSecundario>
          }
        />
      </Cartao>
    );
  }

  const ativas = ofertas.filter((o) => o.mensal.receitaSemIVA > 0);

  return (
    <div className="space-y-3" id="portfolio">
      <Cartao
        titulo="O teu negócio"
        descricao={`${ofertas.length} ${ofertas.length === 1 ? "oferta" : "ofertas"} · ${fmt(
          receitaTotal,
        )} por mês, sem IVA`}
        acao={
          <BotaoSecundario onClick={aoAdicionar}>
            <Plus size={14} />
            Adicionar
          </BotaoSecundario>
        }
      >
        {/* ── De onde vem o dinheiro ──────────────────────────────── */}
        {ativas.length > 0 ? (
          <>
            <h4 className="sr-only">Receita por oferta</h4>
            <ul className="space-y-2.5">
              {ativas.map((o) => (
                <li key={o.oferta.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-xs font-medium text-stone-700 dark:text-stone-200">
                      {o.oferta.nome}
                    </span>
                    <span className="flex-shrink-0 text-xs tabular-nums text-stone-500 dark:text-stone-400">
                      {fmt(o.mensal.receitaSemIVA)} · {pct(o.peso)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <Barra
                      fracao={o.peso}
                      rotuloAcessivel={`${o.oferta.nome}: ${fmt(o.mensal.receitaSemIVA)} por mês, ${pct(
                        o.peso,
                      )} da receita`}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-3 border-t border-stone-100 pt-3 text-xs leading-relaxed text-stone-600 dark:border-stone-800 dark:text-stone-300">
              {concentracao.mensagem}
            </p>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            As ofertas estão definidas mas ainda não têm volume. Abre uma e diz quantas contas vender por mês — é daí
            que sai a receita.
          </p>
        )}
      </Cartao>

      {ofertas.map((o) => (
        <OfertaCard
          key={o.oferta.id}
          resultado={o}
          aoEditarPreco={() => aoEditarPreco(o.oferta.id)}
          aoRemover={() => aoRemover(o.oferta.id)}
          aoMudarVolume={(v) => aoMudarVolume(o.oferta.id, v)}
          aoMudarCapacidade={(m) => aoMudarCapacidade(o.oferta.id, m)}
          aoRenomear={(n) => aoRenomear(o.oferta.id, n)}
        />
      ))}
    </div>
  );
}
