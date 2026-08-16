// ═══════════════════════════════════════════════════════════════════════
//  Os componentes da sala, renderizados a sério
//  ---------------------------------------------------------------------
//  `renderToStaticMarkup` e não uma biblioteca de testes de interface: o
//  React já cá está, e o que interessa provar aqui é markup — que o cartão
//  do cliente não traz os botões do contabilista, que um prazo passado se
//  pinta de aviso, que a linha do tempo diz «Tu» a quem escreveu.
//
//  O que isto NÃO prova, e é honesto dizê-lo: nada sobre o que acontece
//  depois de a página hidratar. Um estado que só muda ao clicar não passa
//  por aqui — para isso é preciso um browser e uma base de dados com
//  sessão, que a suíte não tem.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BlocoProximoPasso from "@/components/contabilistas/sala/BlocoProximoPasso";
import CartaoPedido from "@/components/contabilistas/sala/CartaoPedido";
import TimelineRelacao from "@/components/contabilistas/sala/TimelineRelacao";
import type { ProximoPasso } from "@/lib/contabilistas/sala/proximo-passo";
import type { EventoTimeline, PedidoCliente } from "@/lib/contabilistas/sala/tipos";

const AGORA = new Date("2026-08-16T10:00:00Z");

function pedido(over: Partial<PedidoCliente> = {}): PedidoCliente {
  return {
    id: "p1", vinculoId: "v1", criadoPor: "cc", tipo: "documento",
    titulo: "Comprovativo de retenções", descricao: "De julho, se tiveres.",
    prazo: null, obrigatorio: true, estado: "aberto",
    respostaTexto: null, respostaMensagemId: null,
    respondidoEm: null, concluidoEm: null,
    criadoEm: "2026-08-14T09:00:00Z",
    ...over,
  };
}

const passo = (over: Partial<ProximoPasso> = {}): ProximoPasso => ({
  chave: "pedido_aberto", titulo: "Enviar comprovativo", detalhe: "É para amanhã.",
  cta: "Responder", destino: "pedido:p1", tom: "acao", outras: 0,
  ...over,
});

describe("BlocoProximoPasso", () => {
  it("mostra o título, o detalhe e o botão", () => {
    const html = renderToStaticMarkup(<BlocoProximoPasso passo={passo()} />);
    expect(html).toContain("Enviar comprovativo");
    expect(html).toContain("É para amanhã.");
    expect(html).toContain("Responder");
    expect(html).toContain("Próximo passo");
  });

  it("pinta o atraso de aviso, e não de marca", () => {
    const html = renderToStaticMarkup(
      <BlocoProximoPasso passo={passo({ tom: "atraso", detalhe: "Era para ontem." })} />,
    );
    expect(html).toContain("alert-bg");
    expect(html).toContain("Passou do prazo");
    expect(html).not.toContain("brand-light");
  });

  it("não põe botão nenhum quando não há nada a carregar", () => {
    const html = renderToStaticMarkup(
      <BlocoProximoPasso passo={passo({ tom: "espera", cta: null, destino: null })} />,
    );
    expect(html).not.toContain("<button");
    expect(html).toContain("Em curso");
  });

  it("anuncia as mudanças a quem usa leitor de ecrã", () => {
    // O bloco muda sozinho quando chega uma mensagem ou um pedido é
    // respondido. Mudar em silêncio é mudar às escondidas.
    const html = renderToStaticMarkup(<BlocoProximoPasso passo={passo()} />);
    expect(html).toContain('aria-live="polite"');
  });

  it("conta as outras pendências sem as enumerar", () => {
    const html = renderToStaticMarkup(<BlocoProximoPasso passo={passo({ outras: 3 })} />);
    expect(html).toContain("mais 3 coisas");
  });
});

describe("CartaoPedido", () => {
  it("dá ao cliente o verbo do tipo de pedido", () => {
    const html = renderToStaticMarkup(
      <CartaoPedido pedido={pedido({ tipo: "documento" })} papel="cliente" agora={AGORA} />,
    );
    expect(html).toContain("Enviar ficheiro");
    // E nunca os botões do outro lado.
    expect(html).not.toContain("Dar por tratado");
  });

  it("dá ao contabilista os botões de fechar, e não os de responder", () => {
    const html = renderToStaticMarkup(
      <CartaoPedido pedido={pedido()} papel="contabilista" agora={AGORA} />,
    );
    expect(html).toContain("Dar por tratado");
    expect(html).toContain("Já não é preciso");
    expect(html).not.toContain("Enviar ficheiro");
  });

  it("só oferece «Estou a ver» depois de haver resposta", () => {
    const semResposta = renderToStaticMarkup(
      <CartaoPedido pedido={pedido()} papel="contabilista" agora={AGORA} />,
    );
    expect(semResposta).not.toContain("Estou a ver");

    const comResposta = renderToStaticMarkup(
      <CartaoPedido
        pedido={pedido({ estado: "respondido", respostaTexto: "Aqui vai." })}
        papel="contabilista"
        agora={AGORA}
      />,
    );
    expect(comResposta).toContain("Estou a ver");
    expect(comResposta).toContain("Aqui vai.");
  });

  it("marca o prazo passado como aviso", () => {
    const html = renderToStaticMarkup(
      <CartaoPedido pedido={pedido({ prazo: "2026-08-13" })} papel="cliente" agora={AGORA} />,
    );
    expect(html).toContain("Estava para há 3 dias.");
    expect(html).toContain("alert-bg");
  });

  it("diz «É para amanhã» em vez de contar dias", () => {
    const html = renderToStaticMarkup(
      <CartaoPedido pedido={pedido({ prazo: "2026-08-17" })} papel="cliente" agora={AGORA} />,
    );
    expect(html).toContain("É para amanhã.");
  });

  it("um pedido fechado não oferece ação nenhuma ao cliente", () => {
    const html = renderToStaticMarkup(
      <CartaoPedido
        pedido={pedido({ estado: "concluido", concluidoEm: "2026-08-15T10:00:00Z" })}
        papel="cliente"
        agora={AGORA}
      />,
    );
    expect(html).toContain("Tratado");
    expect(html).not.toContain("<button");
  });

  it("marca o que é opcional como opcional", () => {
    const html = renderToStaticMarkup(
      <CartaoPedido pedido={pedido({ obrigatorio: false })} papel="cliente" agora={AGORA} />,
    );
    expect(html).toContain("opcional");
  });
});

describe("TimelineRelacao", () => {
  const evento = (over: Partial<EventoTimeline> = {}): EventoTimeline => ({
    tipo: "mensagem", referenciaId: "m1", quando: "2026-08-16T09:00:00Z",
    autorId: "eu", titulo: null, corpo: "Bom dia.", estado: null, meta: {},
    ...over,
  });

  it("conta o mesmo facto do lado de quem lê", () => {
    const meu = renderToStaticMarkup(
      <TimelineRelacao eventos={[evento()]} meuId="eu" nomeDoOutro="Inês" />,
    );
    expect(meu).toContain("Tu escreveste");

    const dele = renderToStaticMarkup(
      <TimelineRelacao eventos={[evento({ autorId: "ela" })]} meuId="eu" nomeDoOutro="Inês" />,
    );
    expect(dele).toContain("Inês escreveu");
  });

  it("traduz o estado de uma consulta em vez de o mostrar cru", () => {
    const html = renderToStaticMarkup(
      <TimelineRelacao
        eventos={[evento({
          tipo: "consulta", referenciaId: "c1", autorId: null, estado: "cancelado_cliente",
          corpo: null, meta: { inicio: "2026-08-20T15:30:00Z" },
        })]}
        meuId="eu"
        nomeDoOutro="Inês"
      />,
    );
    expect(html).toContain("Cancelada pelo cliente");
    expect(html).not.toContain("cancelado_cliente");
  });

  it("mostra o valor de um pagamento em euros, não em cêntimos", () => {
    const html = renderToStaticMarkup(
      <TimelineRelacao
        eventos={[evento({
          tipo: "pagamento", referenciaId: "g1", autorId: null, estado: "pago",
          titulo: "Consulta", corpo: null, meta: { liquidoCents: 4500 },
        })]}
        meuId="eu"
        nomeDoOutro="Inês"
      />,
    );
    expect(html).toContain("45,00");
    expect(html).not.toContain("4500");
  });

  it("diz quantos ficheiros vieram com a mensagem", () => {
    const html = renderToStaticMarkup(
      <TimelineRelacao
        eventos={[evento({ meta: { anexos: 2, lida: false } })]}
        meuId="eu"
        nomeDoOutro="Inês"
      />,
    );
    expect(html).toContain("com 2 ficheiros");
  });

  it("o vazio dá sensação de ordem, não de ausência", () => {
    const html = renderToStaticMarkup(
      <TimelineRelacao eventos={[]} meuId="eu" nomeDoOutro="Inês" />,
    );
    expect(html).toContain("Ainda não aconteceu nada");
    expect(html).toContain("aparece aqui, por ordem");
  });

  it("o fio que liga os pontos é decorativo", () => {
    // Para quem lê com os olhos transforma cartões numa história; para um
    // leitor de ecrã seria ruído — a ordem já está na lista.
    const html = renderToStaticMarkup(
      <TimelineRelacao eventos={[evento()]} meuId="eu" nomeDoOutro="Inês" />,
    );
    expect(html).toMatch(/aria-hidden="true"[^>]*class="absolute bottom-3/);
    expect(html).toContain("<ol");
  });
});
