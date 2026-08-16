"use client";

// ═══════════════════════════════════════════════════════════════════════
//  FIDELIDADE — REFERÊNCIA B
//  ---------------------------------------------------------------------
//  Os quatro separadores da imagem, nesta ordem:
//
//    [Regras e cartão] [Consultas e descontos] [Cupões emitidos] [Histórico]
//
//  e a coluna da direita com a pré-visualização do cartão, «Como funciona
//  para o cliente», o resumo da regra atual e o acesso ao histórico.
//
//  ── O MODELO, decidido e sem ambiguidade
//
//  Carimbos, com o desconto dado NO FIM e para UMA única utilização. A
//  referência B escrevia, em quatro sítios, «usa as 5 consultas com 10% de
//  desconto» — desconto contínuo. Não é esse o modelo: custava cinco vezes
//  mais ao contabilista, esvaziava o separador «Cupões emitidos» e
//  eliminava o estado «benefício pendente», que é a razão de ser da
//  versionagem das regras. A copy desta página diz o modelo verdadeiro.
//
//  ── AS REGRAS SÃO IMUTÁVEIS
//
//  Guardar não edita: PUBLICA uma versão nova. Quem tem cartão a meio
//  mantém a promessa com que começou, e a interface diz quantos são antes
//  de deixar publicar. Republicar o mesmo não cria versão.
//
//  ── O PREÇO
//
//  «Valor sugerido», não preço universal. O valor real é definido em cada
//  consulta ao concluí-la. Um só controlo, e não os dois da imagem
//  («Ativar cobrança manual» + «Cobrar por cada consulta?»), que faziam
//  quase a mesma coisa e cuja diferença não era legível.
//
//  ── O QUE NÃO ESTÁ AQUI, e é deliberado
//
//  · «Cupões e ofertas» com códigos promocionais partilháveis é um domínio
//    NOVO — tabela própria, regras de acumulação com a fidelidade, e uma
//    decisão sobre se um cupão promocional carimba o cartão. Fica como
//    frente separada em vez de meio-implementado.
//  · O seletor de firma («Domingues & Associados») não existe: o modelo é
//    um-contabilista-uma-conta e não há tabela de organizações. Inventar o
//    seletor prometia uma funcionalidade que a RLS não suporta.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usarFicha } from "@/components/contabilistas/usarFicha";
import { usarPainel } from "@/components/contabilistas/usarPainel";
import CabecalhoPainel from "@/components/contabilistas/CabecalhoPainel";
import EsqueletoPainel from "@/components/contabilistas/EsqueletoPainel";
import AcoesDoPainel, { TituloDoPainel } from "@/components/contabilistas/AcoesDoPainel";
import {
  cartoesAbertos, meusCupoes, meusClientes, usarCupao,
  type CartaoAberto, type CupaoLido,
} from "@/lib/contabilistas/fonte/dados";
import {
  historicoDeRegras, impactoDaRegraNova, publicarRegra, regraCorrente,
  type ImpactoDaRegra, type RegraLida,
} from "@/lib/contabilistas/fonte/fidelidade-v2";
import { copyPublicaFidelidade } from "@/lib/contabilistas/fidelidade/estados";
import { eurosDeCents, progresso } from "@/lib/contabilistas/fidelidade";
import { tratamentoDoCliente, type Vinculo } from "@/lib/contabilistas/tipos";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar } from "@/components/ui/Confirmar";
import { Check, Eye, Gift, Info, Lock, Warning } from "@/components/ui/Icons";

const META_MIN = 3;
const META_MAX = 12;
const DESCONTO_MIN = 10;
const DESCONTO_MAX = 50;

type Separador = "regras" | "consultas" | "cupoes" | "historico";

const SEPARADORES: { id: Separador; rotulo: string }[] = [
  { id: "regras", rotulo: "Regras e cartão" },
  { id: "consultas", rotulo: "Consultas e descontos" },
  { id: "cupoes", rotulo: "Cupões emitidos" },
  { id: "historico", rotulo: "Histórico de alterações" },
];

export default function FidelidadePage() {
  const { ficha, userId, aCarregar } = usarFicha();
  const painel = usarPainel();
  const avisos = useAvisos();
  const confirmar = useConfirmar();

  const [aba, setAba] = useState<Separador>("regras");
  const [regra, setRegra] = useState<RegraLida | null>(null);
  const [historico, setHistorico] = useState<RegraLida[]>([]);
  const [impacto, setImpacto] = useState<ImpactoDaRegra | null>(null);
  const [cartoes, setCartoes] = useState<CartaoAberto[]>([]);
  const [cupoes, setCupoes] = useState<CupaoLido[]>([]);
  const [clientes, setClientes] = useState<Vinculo[]>([]);
  const [carregado, setCarregado] = useState(false);

  // O rascunho. Publicar é uma operação deliberada — nada se grava por tecla.
  const [meta, setMeta] = useState(5);
  const [desconto, setDesconto] = useState(10);
  const [ativa, setAtiva] = useState(false);
  const [exigePagamento, setExigePagamento] = useState(true);
  const [aGuardar, setAGuardar] = useState(false);

  const quem = userId ?? ficha?.userId ?? "";

  const carregar = useCallback(async () => {
    const [r, h, i, c, cu, cl] = await Promise.all([
      regraCorrente(quem),
      historicoDeRegras(quem),
      impactoDaRegraNova(),
      cartoesAbertos(quem),
      meusCupoes({ contabilistaId: quem }),
      meusClientes(quem),
    ]);
    setRegra(r);
    setHistorico(h);
    setImpacto(i);
    setCartoes(c);
    setCupoes(cu);
    setClientes(cl);
    if (r) {
      setMeta(r.meta);
      setDesconto(r.descontoPct);
      setAtiva(r.ativa);
      setExigePagamento(r.exigePagamento);
    }
    setCarregado(true);
  }, [quem]);

  useEffect(() => {
    if (!ficha) return;
    void carregar().catch(() => setCarregado(true));
  }, [ficha, carregar]);

  if (aCarregar || !ficha || !carregado) return <EsqueletoPainel forma="duasColunas" />;

  const rascunho: RegraLida = {
    id: regra?.id ?? "rascunho",
    versao: (regra?.versao ?? 0) + 1,
    meta, descontoPct: desconto, ativa, exigePagamento,
    validadeDias: regra?.validadeDias ?? 365,
    publicadaEm: "", substituidaEm: null,
  };
  const mudou =
    !regra || regra.meta !== meta || regra.descontoPct !== desconto ||
    regra.ativa !== ativa || regra.exigePagamento !== exigePagamento;

  const nomeDe = (clienteId: string) => {
    const v = clientes.find((c) => c.clienteId === clienteId);
    return v ? tratamentoDoCliente(v) : "Cliente";
  };

  async function publicar() {
    if (!mudou) return;

    // Desligar um cartão que estava ligado interrompe uma promessa já
    // feita a quem tem carimbos a meio. Não é proibido — é deliberado.
    if (regra?.ativa && !ativa) {
      const ok = await confirmar({
        titulo: "Desligar o cartão de fidelidade?",
        descricao: "Deixa de nascer cartão novo a partir da próxima consulta elegível.",
        consequencias: [
          `${impacto?.cartoesEmCurso ?? 0} cartões em curso continuam válidos até ao fim.`,
          `${impacto?.beneficiosPendentes ?? 0} benefícios por usar continuam a poder ser usados.`,
        ],
        confirmar: "Desligar",
        tom: "perigo",
      });
      if (!ok) return;
    }

    setAGuardar(true);
    const r = await publicarRegra({ meta, descontoPct: desconto, ativa, exigePagamento });
    setAGuardar(false);

    if (!r.ok) {
      avisos.erro("Não foi possível publicar a regra.", { detalhe: r.motivo });
      return;
    }
    if (r.inalterada) {
      avisos.sucesso("Nada mudou — a regra continua na versão " + r.versao + ".");
      return;
    }
    await carregar();
    avisos.sucesso(`Regra publicada como versão ${r.versao}.`, {
      detalhe: "Aplica-se a cartões que nascerem de agora em diante.",
    });
  }

  return (
    <div className="space-y-5">
      <TituloDoPainel>Fidelidade</TituloDoPainel>

      <AcoesDoPainel>
        <Link href={`/contabilistas/${ficha.slug}`} target="_blank">
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 hover:border-brand/35 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
            <Eye size={14} aria-hidden /> Ver como cliente
          </span>
        </Link>
        <Button onClick={publicar} disabled={!mudou || aGuardar}>
          <Check size={14} aria-hidden /> {aGuardar ? "A publicar…" : "Guardar alterações"}
        </Button>
      </AcoesDoPainel>

      <CabecalhoPainel
        titulo="Fidelidade"
        descricao="Define quantos serviços fecham um cartão e que desconto o cliente recebe no fim. Uma regra publicada não muda os cartões que já começaram."
      />

      {/* Separadores — os quatro da referência B. */}
      <div role="tablist" aria-label="Separadores da fidelidade" className="flex flex-wrap gap-1">
        {SEPARADORES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={aba === s.id}
            onClick={() => setAba(s.id)}
            className={`focus-marca min-h-9 rounded-xl px-3 text-sm font-semibold transition-colors ${
              aba === s.id
                ? "bg-white text-brand-dark shadow-card dark:bg-stone-900 dark:text-brand-mint"
                : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          {aba === "regras" && (
            <RegrasECartao
              meta={meta} setMeta={setMeta}
              desconto={desconto} setDesconto={setDesconto}
              ativa={ativa} setAtiva={setAtiva}
              exigePagamento={exigePagamento} setExigePagamento={setExigePagamento}
              precoSugeridoCents={ficha.precoConsultaCents}
              impacto={impacto}
              mudou={mudou}
            />
          )}
          {aba === "consultas" && (
            <ConsultasEDescontos cartoes={cartoes} nomeDe={nomeDe} regra={regra} />
          )}
          {aba === "cupoes" && (
            <CupoesEmitidos
              cupoes={cupoes} nomeDe={nomeDe}
              onUsar={async (codigo) => {
                const ok = await confirmar({
                  titulo: "Dar este benefício por usado?",
                  descricao: "Marca o desconto como aplicado nesta consulta.",
                  consequencias: ["Um benefício usado não volta a estar disponível."],
                  confirmar: "Dar por usado",
                  tom: "perigo",
                });
                if (!ok) return;
                const r = await usarCupao(codigo);
                if (r.erro) { avisos.erro("Não foi possível.", { detalhe: r.erro }); return; }
                await carregar();
                avisos.sucesso("Benefício aplicado.");
              }}
            />
          )}
          {aba === "historico" && <HistoricoDeRegras historico={historico} />}
        </div>

        {/* A coluna da direita, sempre presente — é o que a imagem mostra. */}
        <div className="space-y-4">
          <PreVisualizacaoDoCartao rascunho={rascunho} mudou={mudou} />
          <ComoFuncionaParaOCliente rascunho={rascunho} />
          <ResumoDaRegra regra={regra} rascunho={rascunho} mudou={mudou} impacto={impacto} />
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* 1 · Regras e cartão                                                 */
/* ================================================================== */

function RegrasECartao({
  meta, setMeta, desconto, setDesconto, ativa, setAtiva,
  exigePagamento, setExigePagamento, precoSugeridoCents, impacto, mudou,
}: {
  meta: number; setMeta: (n: number) => void;
  desconto: number; setDesconto: (n: number) => void;
  ativa: boolean; setAtiva: (b: boolean) => void;
  exigePagamento: boolean; setExigePagamento: (b: boolean) => void;
  precoSugeridoCents: number;
  impacto: ImpactoDaRegra | null;
  mudou: boolean;
}) {
  return (
    <>
      <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800">
        <h2 className="font-display text-lg text-ink">Regra do cartão</h2>
        <p className="mt-1 text-sm text-stone-500">
          Define o cartão que os clientes recebem a partir de agora.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Passo
            rotulo="Serviços para completar o cartão"
            valor={meta} min={META_MIN} max={META_MAX}
            onChange={setMeta}
            nota={`De ${META_MIN} a ${META_MAX} serviços elegíveis.`}
          />
          <Passo
            rotulo="Desconto ao completar"
            valor={desconto} min={DESCONTO_MIN} max={DESCONTO_MAX} sufixo="%"
            onChange={setDesconto}
            nota={`De ${DESCONTO_MIN}% a ${DESCONTO_MAX}%, sobre o preço real da consulta.`}
          />
        </div>

        <div className="mt-4 space-y-2.5 border-t border-stone-100 pt-4 dark:border-stone-800">
          <Interruptor
            ligado={ativa} onChange={setAtiva}
            titulo="Cartão de fidelidade ativo"
            texto="Desligado, deixa de nascer cartão novo. Os que já existem continuam válidos."
          />
          <Interruptor
            ligado={exigePagamento} onChange={setExigePagamento}
            titulo="Só consultas pagas carimbam"
            texto="Uma primeira conversa gratuita é legítima, mas não deve encher o cartão."
          />
        </div>
      </section>

      {/* O preço: valor SUGERIDO, e um só controlo. */}
      <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800">
        <h2 className="font-display text-lg text-ink">Preço da consulta</h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-display text-2xl text-ink tabular-nums">
            {precoSugeridoCents > 0 ? eurosDeCents(precoSugeridoCents) : "Sem valor sugerido"}
          </p>
          <Badge tone="neutral">Valor sugerido</Badge>
        </div>
        <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-stone-500">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          O valor real é definido em cada consulta, ao concluí-la — é sobre esse valor que
          o desconto incide. Este número serve como referência no perfil, e altera-se no
          bloco «Consultas e honorário» do perfil.
        </p>
      </section>

      {/* Quem a regra nova NÃO afeta. É a pergunta antes de publicar. */}
      {impacto && (
        <section className="rounded-4xl border border-alert-border bg-alert-bg p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg text-alert-text">
            <Lock size={16} aria-hidden /> As alterações não mexem no que já começou
          </h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <Numero n={impacto.cartoesEmCurso} rotulo="cartões em curso mantêm a regra antiga" />
            <Numero n={impacto.beneficiosPendentes} rotulo="benefícios por usar continuam válidos" />
            <Numero n={impacto.clientesSemCiclo} rotulo="clientes entram na regra nova" />
          </dl>
          {mudou && (
            <p className="mt-3 text-sm leading-relaxed text-alert-text">
              Ao guardar, publicas uma <strong>versão nova</strong>. A anterior fecha-se e
              fica no histórico — não é apagada, porque os cartões que nasceram com ela
              continuam a apontar-lhe.
            </p>
          )}
        </section>
      )}
    </>
  );
}

function Passo({
  rotulo, valor, min, max, onChange, nota, sufixo = "",
}: {
  rotulo: string; valor: number; min: number; max: number;
  onChange: (n: number) => void; nota: string; sufixo?: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{rotulo}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, valor - 1))}
          disabled={valor <= min}
          aria-label={`Diminuir ${rotulo}`}
          className="focus-marca flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-lg text-stone-600 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
        >
          −
        </button>
        <output className="min-w-[3.5rem] text-center font-display text-xl text-ink tabular-nums">
          {valor}{sufixo}
        </output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, valor + 1))}
          disabled={valor >= max}
          aria-label={`Aumentar ${rotulo}`}
          className="focus-marca flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 text-lg text-stone-600 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
        >
          +
        </button>
      </div>
      <p className="mt-1.5 text-xs text-stone-400">{nota}</p>
    </div>
  );
}

function Interruptor({
  ligado, onChange, titulo, texto,
}: {
  ligado: boolean; onChange: (b: boolean) => void; titulo: string; texto: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        onClick={() => onChange(!ligado)}
        className={`focus-marca relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          ligado ? "bg-brand" : "bg-stone-300 dark:bg-stone-600"
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            ligado ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{titulo}</span>
        <span className="block text-xs leading-relaxed text-stone-500">{texto}</span>
      </span>
    </div>
  );
}

function Numero({ n, rotulo }: { n: number; rotulo: string }) {
  return (
    <div>
      <dt className="font-display text-2xl text-alert-text tabular-nums">{n}</dt>
      <dd className="text-xs leading-relaxed text-alert-text/85">{rotulo}</dd>
    </div>
  );
}

/* ================================================================== */
/* 2 · Consultas e descontos                                           */
/* ================================================================== */

function ConsultasEDescontos({
  cartoes, nomeDe, regra,
}: {
  cartoes: CartaoAberto[]; nomeDe: (id: string) => string; regra: RegraLida | null;
}) {
  if (cartoes.length === 0) {
    return (
      <section className="rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card dark:border-stone-800">
        <Gift size={22} className="mx-auto text-stone-300" aria-hidden />
        <p className="mt-3 text-sm text-stone-500">
          Nenhum cartão em curso. O próximo serviço elegível abre um ciclo.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800">
      <h2 className="font-display text-lg text-ink">Cartões em curso</h2>
      <p className="mt-1 text-sm text-stone-500">
        Cada cartão mantém a regra com que nasceu. O desconto entra na consulta em que o
        cliente usar o benefício, uma única vez.
      </p>
      <ul className="mt-4 space-y-3">
        {cartoes.map((c) => {
          const p = progresso(c.carimbos, c.meta);
          return (
            <li key={c.clienteId} className="rounded-2xl bg-cream/70 p-3.5 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-semibold text-ink">{nomeDe(c.clienteId)}</p>
                <p className="text-xs text-stone-500 tabular-nums">
                  {c.carimbos} de {c.meta} · {c.descontoPct}% ao completar
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200/70 dark:bg-stone-700">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(p.fracao * 100)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-stone-400">
                {p.completo
                  ? "Completo — o benefício está por usar."
                  : `Faltam ${p.faltam} ${p.faltam === 1 ? "serviço" : "serviços"}.`}
                {regra && c.descontoPct !== regra.descontoPct && (
                  <> Regra antiga: mantém {c.descontoPct}% e não os {regra.descontoPct}% atuais.</>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ================================================================== */
/* 3 · Cupões emitidos                                                 */
/* ================================================================== */

function CupoesEmitidos({
  cupoes, nomeDe, onUsar,
}: {
  cupoes: CupaoLido[]; nomeDe: (id: string) => string;
  onUsar: (codigo: string) => Promise<void>;
}) {
  if (cupoes.length === 0) {
    return (
      <section className="rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card dark:border-stone-800">
        <Gift size={22} className="mx-auto text-stone-300" aria-hidden />
        <p className="mt-3 text-sm text-stone-500">
          Ainda não emitiste benefícios. Um cartão completo emite um, para uma consulta.
        </p>
      </section>
    );
  }

  return (
    <>
    <ValidarPorCodigo onUsar={onUsar} />
    <section className="mt-4 rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800">
      <h2 className="font-display text-lg text-ink">Benefícios emitidos</h2>
      <p className="mt-1 text-sm text-stone-500">
        Cada um vale por uma consulta. Enquanto estiver por usar, o cliente não começa
        cartão novo.
      </p>
      <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
        {cupoes.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{nomeDe(c.clienteId)}</span>
              <span className="block font-mono text-xs text-stone-400">{c.codigo}</span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-brand-dark tabular-nums dark:text-brand-mint">
              {c.percentagem}%
            </span>
            <Badge tone={c.estado === "disponivel" ? "brand" : c.estado === "usado" ? "neutral" : "alert"}>
              {c.estado === "disponivel" ? "Por usar" : c.estado === "usado" ? "Usado" : "Expirado"}
            </Badge>
            {c.estado === "disponivel" && (
              <button
                type="button"
                onClick={() => void onUsar(c.codigo)}
                className="focus-marca shrink-0 rounded-xl border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:border-brand/35 dark:border-stone-700 dark:text-stone-200"
              >
                Dar por usado
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
    </>
  );
}

/**
 * Validar um benefício pelo CÓDIGO que o cliente mostra.
 *
 * ⚠️ Validar E GASTAR são a mesma operação: a rota marca-o como usado no
 * mesmo pedido em que o valida. Enquanto o botão dizia só «Validar», a
 * interface prometia uma verificação e fazia uma escrita irreversível — o
 * rótulo tem de dizer as duas coisas.
 *
 * Este fluxo existia antes desta página ser redesenhada e não podia
 * desaparecer: é o caminho real quando o cliente chega com um código e o
 * contabilista não sabe de que cliente é.
 */
function ValidarPorCodigo({ onUsar }: { onUsar: (codigo: string) => Promise<void> }) {
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800">
      <h2 className="font-display text-lg text-ink">Validar um benefício</h2>
      <p className="mt-1 text-sm text-stone-500">
        O cliente mostra o código. Validar dá o benefício por{" "}
        <strong className="font-semibold text-ink">gasto</strong> no mesmo instante — não
        há passo de confirmação depois, e um benefício gasto não volta.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="RC-XXXX-XXXX"
          aria-label="Código do benefício"
          className="min-h-10 min-w-0 flex-1 rounded-xl border border-stone-200 px-3 font-mono text-sm dark:border-stone-700"
        />
        <Button
          onClick={async () => {
            if (!codigo.trim() || ocupado) return;
            setOcupado(true);
            await onUsar(codigo.trim());
            setOcupado(false);
            setCodigo("");
          }}
          disabled={!codigo.trim() || ocupado}
        >
          {ocupado ? "A validar…" : "Validar e dar por usado"}
        </Button>
      </div>
    </section>
  );
}

/* ================================================================== */
/* 4 · Histórico de alterações                                         */
/* ================================================================== */

function HistoricoDeRegras({ historico }: { historico: RegraLida[] }) {
  if (historico.length === 0) {
    return (
      <section className="rounded-4xl border border-stone-200 bg-white p-6 text-center shadow-card dark:border-stone-800">
        <p className="text-sm text-stone-500">Ainda não publicaste nenhuma regra.</p>
      </section>
    );
  }

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card sm:p-6 dark:border-stone-800">
      <h2 className="font-display text-lg text-ink">Histórico de alterações</h2>
      <p className="mt-1 text-sm text-stone-500">
        Cada versão fica registada. Nenhuma é apagada — os cartões que nasceram com ela
        continuam a apontar-lhe.
      </p>
      <ol className="mt-4 space-y-2.5">
        {historico.map((r) => (
          <li
            key={r.id}
            className={`rounded-2xl border p-3.5 ${
              r.substituidaEm === null
                ? "border-brand/30 bg-brand-light/40 dark:border-brand/25 dark:bg-brand/10"
                : "border-stone-200 bg-cream/70 dark:border-stone-800 dark:bg-white/[0.03]"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-semibold text-ink">
                Versão {r.versao}
                {r.substituidaEm === null && <> · <span className="text-brand-dark dark:text-brand-mint">em vigor</span></>}
              </p>
              <p className="text-xs text-stone-400 tabular-nums">{data(r.publicadaEm)}</p>
            </div>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
              {r.meta} serviços · {r.descontoPct}% ao completar ·{" "}
              {r.exigePagamento ? "só consultas pagas" : "qualquer consulta"} ·{" "}
              {r.ativa ? "ativa" : "inativa"}
            </p>
            {r.substituidaEm && (
              <p className="mt-0.5 text-xs text-stone-400">Substituída em {data(r.substituidaEm)}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ================================================================== */
/* A coluna da direita                                                 */
/* ================================================================== */

function PreVisualizacaoDoCartao({ rascunho, mudou }: { rascunho: RegraLida; mudou: boolean }) {
  // Dois carimbos, como a referência mostra: um cartão a meio lê-se melhor
  // do que um vazio, e mostra o que o cliente vai ver a caminho do prémio.
  const feitos = Math.min(2, rascunho.meta);

  return (
    <section className="overflow-hidden rounded-4xl border border-brand-deep/20 bg-gradient-to-br from-brand-deep via-brand-dark to-brand-deep p-5 text-white shadow-lift">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-white/60">
          Cartão de fidelidade
        </p>
        {mudou && (
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.625rem] font-semibold">
            Pré-visualização
          </span>
        )}
      </div>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-3xl leading-none tabular-nums">{rascunho.descontoPct}%</span>
        <span className="text-sm text-white/70">ao completar</span>
      </p>

      <ol className="mt-4 flex flex-wrap gap-1.5" aria-label={`${feitos} de ${rascunho.meta} serviços`}>
        {Array.from({ length: rascunho.meta }, (_, i) => (
          <li
            key={i}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
              i < feitos ? "bg-brand-mint text-brand-deep" : "border border-white/25 text-white/55"
            }`}
          >
            {i < feitos ? <Check size={14} aria-hidden /> : i + 1}
          </li>
        ))}
      </ol>

      <p className="mt-3.5 text-xs leading-relaxed text-white/70">
        {copyPublicaFidelidade(rascunho) ??
          "Cartão desligado — o cliente não vê promessa nenhuma."}
      </p>
    </section>
  );
}

/**
 * «Como funciona para o cliente» — os quatro passos da referência B, com o
 * modelo CERTO: o desconto é no fim e para uma consulta.
 */
function ComoFuncionaParaOCliente({ rascunho }: { rascunho: RegraLida }) {
  const passos = [
    `Conclui ${rascunho.meta} serviços elegíveis${rascunho.exigePagamento ? " e pagos" : ""}.`,
    "Ao completar o cartão, recebe um benefício.",
    `Usa o benefício numa consulta: ${rascunho.descontoPct}% sobre o preço real dessa consulta.`,
    "Depois de usar, começa um cartão novo com a regra em vigor nessa altura.",
  ];

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-800">
      <h2 className="font-display text-base text-ink">Como funciona para o cliente</h2>
      <ol className="mt-3 space-y-2.5">
        {passos.map((p, i) => (
          <li key={p} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-light text-[0.625rem] font-bold text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
              {i + 1}
            </span>
            <span className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">{p}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-start gap-2 border-t border-stone-100 pt-3 text-xs leading-relaxed text-stone-500 dark:border-stone-800">
        <Warning size={13} className="mt-0.5 shrink-0" aria-hidden />
        O benefício é um acordo entre ti e o cliente. O Recibo Certo regista-o e mostra-o;
        não cobra a consulta nem processa o pagamento.
      </p>
    </section>
  );
}

function ResumoDaRegra({
  regra, rascunho, mudou, impacto,
}: {
  regra: RegraLida | null; rascunho: RegraLida; mudou: boolean; impacto: ImpactoDaRegra | null;
}) {
  const linhas: [string, string][] = [
    ["Aplica-se a", "Cartões que nascerem de agora"],
    ["Serviços para completar", `${rascunho.meta}`],
    ["Desconto", `${rascunho.descontoPct}%`],
    ["Incide sobre", "O preço real da consulta"],
    ["Utilizações", "Uma"],
    ["Carimbam", rascunho.exigePagamento ? "Só consultas pagas" : "Qualquer consulta"],
    ["Cartões em curso afetados", `${impacto?.cartoesEmCurso ?? 0} mantêm a regra antiga`],
    ["Versão em vigor", regra ? `${regra.versao}` : "nenhuma"],
  ];

  return (
    <section className="rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-800">
      <h2 className="font-display text-base text-ink">
        {mudou ? "Resumo do que vais publicar" : "Resumo da regra atual"}
      </h2>
      <dl className="mt-3 space-y-1.5 text-xs">
        {linhas.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3">
            <dt className="text-stone-500">{k}</dt>
            <dd className="shrink-0 text-right font-medium text-stone-800 dark:text-stone-200">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function data(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
}
