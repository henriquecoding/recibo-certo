"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O MEU CONTABILISTA — o hub do cliente
//  ---------------------------------------------------------------------
//  A versão anterior era uma pilha de cartões brancos iguais: ficha,
//  cartão, cupões, consultas, envios — todos com o mesmo peso, todos com a
//  mesma moldura, e a ação destrutiva («terminar acompanhamento») ao lado
//  da ação principal, com o mesmo tamanho. Quem abria isto não tinha como
//  saber onde olhar primeiro.
//
//  A página passa a responder por ordem às perguntas de quem chega:
//
//    1. QUEM É?          ficha com monograma, estado e as ações que valem.
//    2. QUANDO É?        a próxima consulta em destaque, ou o convite a marcar.
//    3. COMO VAMOS?      três números que existem — consultas, carimbos, envios.
//    4. O QUE GANHEI?    cartão de fidelidade e cupões, desenhados como cupões.
//    5. O QUE JÁ FOI?    histórico e envios, recolhidos até serem pedidos.
//    6. E SE QUISER SAIR? em baixo, separado, em tom de argila.
//
//  ⚠️ Nada nesta página verifica o plano. Ligar-se, enviar simulações e
//  marcar consultas são gratuitos — ver `PARTILHA_NUNCA_EXIGE_PLUS`,
//  coberto por teste.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import {
  cancelarConsulta, listarAgendamentos, listarPartilhas, meuCartao, meuVinculo,
  meusCupoes, revogarPartilha, terminarVinculo, type CartaoLido, type CupaoLido,
} from "@/lib/contabilistas/dados";
import type { Agendamento, Contabilista, Partilha, Vinculo } from "@/lib/contabilistas/tipos";
import { diaLocal, horaLocal, rotularDia } from "@/lib/contabilistas/agenda";
import CartaoFidelidade from "@/components/contabilistas/CartaoFidelidade";
import EstadoVazio from "@/components/contabilistas/EstadoVazio";
import {
  Cupoes, Envios, Ficha, Historico, Numeros, ProximaConsulta, SemContabilista,
  ZonaTerminar, primeiroNome,
} from "@/components/contabilistas/hub";
import Button from "@/components/ui/Button";
import { useAvisos } from "@/components/ui/Avisos";
import { useConfirmar } from "@/components/ui/Confirmar";
import { Briefcase, Warning } from "@/components/ui/Icons";

export default function MeuContabilistaPage() {
  const { user, carregado, abrirModal, disponivel } = useAuth();
  const avisos = useAvisos();
  const confirmar = useConfirmar();
  const [vinculo, setVinculo] = useState<(Vinculo & { contabilista: Contabilista | null }) | null>(null);
  const [cartao, setCartao] = useState<CartaoLido | null>(null);
  const [cupoes, setCupoes] = useState<CupaoLido[]>([]);
  const [consultas, setConsultas] = useState<Agendamento[]>([]);
  const [partilhas, setPartilhas] = useState<Partilha[]>([]);
  const [aLer, setALer] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!user) { setALer(false); return; }
    setALer(true);
    try {
      const v = await meuVinculo(user.id);
      setVinculo(v);
      if (v?.contabilista) {
        const [c, cu, ag, pa] = await Promise.all([
          meuCartao(user.id, v.contabilistaId),
          meusCupoes({ clienteId: user.id }),
          listarAgendamentos({ clienteId: user.id }),
          listarPartilhas({ clienteId: user.id }),
        ]);
        setCartao(c); setCupoes(cu); setConsultas(ag); setPartilhas(pa);
      }
    } catch (e) { setErro((e as Error).message); }
    finally { setALer(false); }
  }, [user]);

  useEffect(() => { if (carregado) void carregar(); }, [carregado, carregar]);

  const agora = Date.now();
  const { proxima, passadas } = useMemo(() => {
    const futuras = consultas
      .filter((a) => new Date(a.inicio).getTime() >= agora && (a.estado === "pedido" || a.estado === "confirmado"))
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
    const resto = consultas
      .filter((a) => !futuras.includes(a))
      .sort((a, b) => b.inicio.localeCompare(a.inicio));
    return { proxima: futuras[0] ?? null, passadas: [...futuras.slice(1), ...resto] };
  }, [consultas, agora]);

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(codigo);
      avisos.sucesso("Código copiado.", { detalhe: "Apresenta-o na próxima consulta." });
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Sem área de transferência o código continua à vista — o que falha é
      // a comodidade, não o acesso ao desconto.
      avisos.info("Não deu para copiar.", { detalhe: `Aponta o código: ${codigo}` });
    }
  }

  /** Terminar corta o acesso a tudo o que já foi enviado. Pergunta-se. */
  async function terminar() {
    if (!vinculo) return;
    const nome = vinculo.contabilista?.nome ?? "o contabilista";
    const ok = await confirmar({
      titulo: `Terminar o acompanhamento com ${nome}?`,
      descricao: "Podes voltar a ligar-te mais tarde, aqui ou pelo diretório.",
      consequencias: [
        "Deixa de conseguir abrir tudo o que já lhe enviaste.",
        "As consultas marcadas que ainda não aconteceram são canceladas.",
        "O teu histórico e os teus dados continuam contigo, intactos.",
      ],
      confirmar: "Terminar acompanhamento",
      tom: "perigo",
    });
    if (!ok) return;

    setOcupado(vinculo.id);
    const { erro: e } = await terminarVinculo(vinculo.id);
    setOcupado(null);
    if (e) { avisos.erro(e); return; }
    avisos.sucesso("Acompanhamento terminado.", { detalhe: `${nome} deixou de ter acesso ao que enviaste.` });
    await carregar();
  }

  async function revogar(p: Partilha) {
    const ok = await confirmar({
      titulo: "Revogar o acesso a este envio?",
      descricao: `«${p.titulo}» deixa de abrir do lado do contabilista.`,
      consequencias: ["Continua a ver que houve um envio, mas não o conteúdo.", "Podes voltar a enviar quando quiseres."],
      confirmar: "Revogar acesso",
      tom: "perigo",
    });
    if (!ok) return;

    setOcupado(p.id);
    const { erro: e } = await revogarPartilha(p.id);
    setOcupado(null);
    if (e) { avisos.erro(e); return; }
    avisos.sucesso("Acesso revogado.");
    await carregar();
  }

  async function cancelar(a: Agendamento) {
    const ok = await confirmar({
      titulo: "Cancelar esta consulta?",
      descricao: `${rotularDia(diaLocal(new Date(a.inicio)))}, às ${horaLocal(new Date(a.inicio))}.`,
      consequencias: ["O horário volta a ficar livre.", "Não conta para o cartão de fidelidade."],
      confirmar: "Cancelar consulta",
      cancelar: "Manter",
      tom: "perigo",
    });
    if (!ok) return;

    setOcupado(a.id);
    const { erro: e } = await cancelarConsulta(a.id);
    setOcupado(null);
    if (e) { avisos.erro(e); return; }
    avisos.sucesso("Consulta cancelada.");
    await carregar();
  }

  // Sem nuvem configurada não há nada para esperar — e perguntá-lo antes do
  // carregamento evita um erro de hidratação: `disponivel` vem da
  // configuração e vale igual dos dois lados; `carregado` muda num efeito
  // que pode correr antes de este pedaço hidratar.
  if (!disponivel) {
    return (
      <Envolvente>
        <p className="rounded-2xl bg-alert-bg px-4 py-3 text-sm text-alert-text">
          Esta área precisa da conta na nuvem, que ainda não está configurada.
        </p>
      </Envolvente>
    );
  }

  if (!carregado || aLer) return <Esqueleto />;

  if (!user) {
    return (
      <Envolvente>
        <EstadoVazio
          Icon={Briefcase}
          titulo="Entra na tua conta"
          descricao="Para te ligares a um contabilista precisas de sessão iniciada. A conta é gratuita."
          acao={<Button onClick={() => abrirModal("criar")}>Criar conta</Button>}
        />
      </Envolvente>
    );
  }

  // A verificação é sobre o par inteiro para o TypeScript poder estreitar
  // `vinculo` a seguir — `vinculo?.contabilista` não lhe diz nada sobre
  // `vinculo` em si.
  if (!vinculo || !vinculo.contabilista) return <SemContabilista Envolvente={Envolvente} />;

  const cc = vinculo.contabilista;
  const ativo = vinculo.estado === "ativo";
  const disponiveis = cupoes.filter((c) => c.estado === "disponivel");
  const realizadas = consultas.filter((a) => a.estado === "realizada").length;
  const enviosAtivos = partilhas.filter((p) => p.estado !== "revogada").length;

  return (
    <Envolvente>
      {erro && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      <Ficha cc={cc} vinculo={vinculo} ativo={ativo} />

      {ativo && (
        <ProximaConsulta
          consulta={proxima}
          slug={cc.slug}
          ocupado={ocupado}
          onCancelar={cancelar}
        />
      )}

      {ativo && (realizadas > 0 || enviosAtivos > 0 || cartao) && (
        <Numeros
          realizadas={realizadas}
          carimbos={cartao?.carimbos ?? 0}
          meta={cartao?.meta ?? 0}
          envios={enviosAtivos}
          mostraCartao={Boolean(cartao) && cc.fidelidadeAtiva}
        />
      )}

      {cartao && cc.fidelidadeAtiva && (
        <CartaoFidelidade
          carimbos={cartao.carimbos}
          meta={cartao.meta}
          descontoPct={cartao.descontoPct}
          precoBaseCents={cartao.precoBaseCents}
          titulo={`As tuas consultas com ${primeiroNome(cc.nome)}`}
        />
      )}

      {disponiveis.length > 0 && (
        <Cupoes lista={disponiveis} copiado={copiado} onCopiar={copiar} />
      )}

      {passadas.length > 0 && <Historico lista={passadas} />}

      <Envios
        lista={partilhas}
        nome={primeiroNome(cc.nome)}
        ocupado={ocupado}
        onRevogar={revogar}
      />

      <ZonaTerminar nome={primeiroNome(cc.nome)} ocupado={ocupado === vinculo.id} onTerminar={terminar} />
    </Envolvente>
  );
}

// ─── Moldura e esqueleto ───────────────────────────────────────────────

function Envolvente({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">A minha conta</p>
        <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">O meu contabilista</h1>
      </header>
      {children}
    </div>
  );
}

/** Com a forma do que vem: ficha, próxima consulta, números, secções. */
function Esqueleto() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
        <div className="h-10 w-56 animate-pulse rounded-xl bg-stone-100" />
      </div>
      <div className="h-44 animate-pulse rounded-4xl bg-stone-100" />
      <div className="h-32 animate-pulse rounded-4xl bg-stone-100" />
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-stone-100" />)}
      </div>
      <div className="h-48 animate-pulse rounded-4xl bg-stone-100" />
    </div>
  );
}

