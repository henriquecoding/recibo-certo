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
import CabecalhoRelacao, { linhaDeCredenciais } from "@/components/contabilistas/sala/CabecalhoRelacao";
import ResumoRelacao from "@/components/contabilistas/sala/ResumoRelacao";
import {
  AcoesDisponiveis, ContextoSemRuido, IdentidadeDoCliente, NotaDaPlataforma,
} from "@/components/contabilistas/sala/PainelDoContabilista";
import type { Contabilista } from "@/lib/contabilistas/tipos";
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


// ═══════════════════════════════════════════════════════════════════════
//  A estrutura da sala, elemento a elemento
//  ---------------------------------------------------------------------
//  Estes testes existem porque a estrutura É a especificação, e não uma
//  sugestão de arranjo. Um elemento que desaparece num refactor não parte
//  build nenhum — só deixa a sala a dizer menos do que devia.
// ═══════════════════════════════════════════════════════════════════════

function contabilista(over: Partial<Contabilista> = {}): Contabilista {
  return {
    userId: "cc", slug: "ines-duarte", nome: "Inês Duarte",
    occ: "12345", bio: "", distrito: "Lisboa", concelho: "Lisboa",
    especialidades: ["IRS", "Trabalhadores independentes"],
    modalidades: ["online"], emailContacto: null, telefone: null, website: null,
    tituloProfissional: null, apresentacaoCurta: null, idiomas: ["pt"],
    anosExperiencia: null, respostaMediaHoras: null,
    occVerificado: true, occMetodo: "registo_publico", occVerificadoEm: null,
    occValidoAte: null, perfilBlocos: [], perfilTermos: [], cobertura: null,
    linkedinLigado: false, estado: "aprovado",
    aceitaNovosClientes: true, precoConsultaCents: 5000, duracaoConsultaMin: 45,
    fidelidadeMeta: 5, fidelidadeDescontoPct: 20, fidelidadeAtiva: true,
    recebePagamentos: true,
    criadoEm: "2025-01-01T00:00:00Z",
    ...over,
  };
}

describe("CabecalhoRelacao — o lado do cliente", () => {
  it("mostra quem é, o estado e o selo da conversa", () => {
    const html = renderToStaticMarkup(
      <CabecalhoRelacao cc={contabilista()} estadoVinculo="ativo" podeMarcar aoMarcar={() => {}} />,
    );
    expect(html).toContain("O meu contabilista");
    expect(html).toContain("Inês Duarte");
    expect(html).toContain("Acompanhamento ativo");
    // O selo mudou com a fronteira de contacto: prometia que nada saía da
    // plataforma, e isso deixou de ser verdade. O que continua a ser é que
    // a conversa não tem terceiros a lê-la.
    expect(html).toContain("Conversa só entre vocês");
    expect(html).toContain("Marcar consulta");
  });

  it("só chama «certificado» a quem tem OCC verificada", () => {
    // Um número escrito no formulário é informado; verificado exige que
    // alguém o tenha confirmado junto da Ordem (§124). A plataforma não
    // pode garantir o que não confirmou.
    expect(linhaDeCredenciais(contabilista())).toContain("Contabilista certificado");
    expect(linhaDeCredenciais(contabilista({ occVerificado: false })))
      .not.toContain("certificado");
  });

  it("monta a linha só com o que existe, sem pontos a meio", () => {
    const linha = linhaDeCredenciais(
      contabilista({ especialidades: [], concelho: null, distrito: null, occVerificado: false }),
    );
    expect(linha).toBe("Contabilista");
    expect(linha).not.toContain("·");
  });

  it("não oferece marcar consulta quando o vínculo não está ativo", () => {
    const html = renderToStaticMarkup(
      <CabecalhoRelacao
        cc={contabilista()} estadoVinculo="pendente" podeMarcar={false} aoMarcar={() => {}}
      />,
    );
    expect(html).not.toContain("Marcar consulta");
  });
});

describe("ResumoRelacao", () => {
  it("mostra os três factos da relação", () => {
    const html = renderToStaticMarkup(
      <ResumoRelacao
        proximaConsulta="2026-08-20T15:30:00Z"
        porPagarCents={0}
        fidelidade={{ carimbos: 3, meta: 5 }}
      />,
    );
    expect(html).toContain("Próxima consulta");
    expect(html).toContain("Por pagar");
    expect(html).toContain("Fidelidade");
    expect(html).toContain("3 de 5 consultas");
  });

  it("escreve «0,00 €» em vez de um traço", () => {
    // Um traço obriga a pessoa a decidir se quer dizer «nada» ou «ainda
    // não sabemos», que é a dúvida que este produto vende resolver.
    const html = renderToStaticMarkup(
      <ResumoRelacao proximaConsulta={null} porPagarCents={0} fidelidade={null} />,
    );
    expect(html).toContain("0,00");
    expect(html).toContain("Por marcar");
  });

  it("pinta o que está por pagar de aviso", () => {
    const html = renderToStaticMarkup(
      <ResumoRelacao proximaConsulta={null} porPagarCents={4500} fidelidade={null} />,
    );
    expect(html).toContain("alert-text");
    expect(html).toContain("45,00");
  });

  it("esconde a fidelidade quando não há cartão", () => {
    const html = renderToStaticMarkup(
      <ResumoRelacao proximaConsulta={null} porPagarCents={0} fidelidade={null} />,
    );
    expect(html).not.toContain("Fidelidade");
  });
});

describe("O painel do contabilista", () => {
  it("nomeia o cliente sem nenhum contacto à vista", () => {
    const html = renderToStaticMarkup(
      <IdentidadeDoCliente tratamento="Miguel A." vinculoConfirmado desde="março de 2026" />,
    );
    expect(html).toContain("Cliente");
    expect(html).toContain("Miguel A.");
    expect(html).toContain("Contactos protegidos");
    expect(html).not.toMatch(/@|telem[oó]vel|mailto/i);
  });

  it("não promete verificação de identidade que a plataforma não faz", () => {
    // O que está confirmado é o VÍNCULO — as duas partes disseram que sim.
    // Escrever «identidade verificada» sobre isto seria garantir uma coisa
    // que ninguém confirmou, e é o género de frase em que se confia para
    // tomar decisões.
    const html = renderToStaticMarkup(
      <IdentidadeDoCliente tratamento="Miguel A." vinculoConfirmado desde="março de 2026" />,
    );
    expect(html).toContain("Vínculo confirmado");
    expect(html).not.toContain("Identidade verificada");
  });

  it("diz o que se pode fazer E o que não existe", () => {
    const html = renderToStaticMarkup(
      <AcoesDisponiveis acoes={["Mensagem", "pedir documento", "consulta"]} />,
    );
    expect(html).toContain("Ações disponíveis");
    expect(html).toContain("Mensagem · pedir documento · consulta");
    expect(html).toContain("Sem email · sem telemóvel · sem WhatsApp");
  });

  it("dá contexto com datas, e diz quando não há", () => {
    const cheio = renderToStaticMarkup(
      <ContextoSemRuido
        proximaConsulta="2026-08-20T15:30:00Z"
        ultimaPartilha={{ titulo: "Simulação de IRS", quando: "2026-08-14T09:00:00Z" }}
        fidelidade={{ carimbos: 3, meta: 5 }}
      />,
    );
    expect(cheio).toContain("Contexto sem ruído");
    expect(cheio).toContain("Simulação de IRS");
    expect(cheio).toContain("3 de 5 · regra original preservada");

    const vazio = renderToStaticMarkup(
      <ContextoSemRuido proximaConsulta={null} ultimaPartilha={null} fidelidade={null} />,
    );
    expect(vazio).toContain("Nenhuma marcada");
    expect(vazio).toContain("Ainda não enviou nada");
    expect(vazio).toContain("Sem cartão aberto");
  });

  it("fecha com a única afirmação que a plataforma faz sobre si própria", () => {
    const html = renderToStaticMarkup(<NotaDaPlataforma />);
    expect(html).toContain("A plataforma não fala por vocês.");
    expect(html).toContain("o histórico íntegro e o próximo passo claro");
  });
});

describe("TimelineRelacao — as ações de cada acontecimento", () => {
  const ev = (over: Partial<EventoTimeline> = {}): EventoTimeline => ({
    tipo: "mensagem", referenciaId: "m1", quando: "2026-08-16T09:00:00Z",
    autorId: "ela", titulo: null, corpo: "Bom dia.", estado: null, meta: {},
    ...over,
  });

  it("dá «Responder» ao cliente num pedido aberto, e não ao contabilista", () => {
    const pedidoAberto = ev({ tipo: "pedido", referenciaId: "p1", estado: "aberto", titulo: "Comprovativo" });

    const cliente = renderToStaticMarkup(
      <TimelineRelacao eventos={[pedidoAberto]} meuId="eu" nomeDoOutro="Inês" papel="cliente" aoAgir={() => {}} />,
    );
    expect(cliente).toContain("Responder");

    const cc = renderToStaticMarkup(
      <TimelineRelacao eventos={[pedidoAberto]} meuId="eu" nomeDoOutro="Miguel" papel="contabilista" aoAgir={() => {}} />,
    );
    expect(cc).toContain("Ver pedido");
    expect(cc).not.toContain(">Responder<");
  });

  it("não põe ação nenhuma numa mensagem", () => {
    const html = renderToStaticMarkup(
      <TimelineRelacao eventos={[ev()]} meuId="eu" nomeDoOutro="Inês" aoAgir={() => {}} />,
    );
    expect(html).not.toContain("<button");
  });

  it("não põe ação num pedido já fechado nem numa partilha revogada", () => {
    const html = renderToStaticMarkup(
      <TimelineRelacao
        eventos={[
          ev({ tipo: "pedido", referenciaId: "p2", estado: "concluido", titulo: "Feito", corpo: null }),
          ev({ tipo: "partilha", referenciaId: "s1", estado: "revogada", titulo: "IRS", corpo: null }),
        ]}
        meuId="eu" nomeDoOutro="Inês" aoAgir={() => {}}
      />,
    );
    expect(html).not.toContain("<button");
  });

  it("não oferece abrir uma consulta que já passou", () => {
    const html = renderToStaticMarkup(
      <TimelineRelacao
        eventos={[ev({
          tipo: "consulta", referenciaId: "c1", estado: "confirmado", corpo: null,
          meta: { inicio: "2020-01-01T10:00:00Z", localOuLigacao: "https://exemplo.pt/sala" },
        })]}
        meuId="eu" nomeDoOutro="Inês" aoAgir={() => {}}
      />,
    );
    expect(html).not.toContain("<button");
  });

  it("sem `aoAgir` não desenha botão nenhum", () => {
    const html = renderToStaticMarkup(
      <TimelineRelacao
        eventos={[ev({ tipo: "pedido", referenciaId: "p3", estado: "aberto", titulo: "X" })]}
        meuId="eu" nomeDoOutro="Inês" papel="cliente"
      />,
    );
    expect(html).not.toContain("<button");
  });
});
