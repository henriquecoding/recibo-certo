import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/** Sem comentários de linha nem de bloco JSX — só o que corre. */
const semComentarios = (fonte: string) =>
  fonte
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const PAINEL_CC = "src/app/contabilista/casos/page.tsx";
const LEITOR = "src/components/casos/LeitorDeProposta.tsx";
const FORMULARIO = "src/app/dashboard/casos/novo/page.tsx";
const TRIAGEM = "src/app/admin/casos/page.tsx";
const DETALHE = "src/app/dashboard/casos/[id]/page.tsx";
const CONVERSA = "src/components/casos/ConversaDoCaso.tsx";
const CONTACTOS = "src/components/casos/Contactos.tsx";

describe("RC-CASO-UI-001 · o contabilista fala com a pessoa, e a plataforma sai do meio", () => {
  // Estes testes eram o contrário: provavam que o painel NÃO alcançava os
  // contactos e que a conversa passava por revisão. Continuam a existir
  // porque a promessa continua a ser estrutural — o que mudou foi qual é.
  it("mostra o nome e o NIF, que são o que ele precisa para trabalhar", () => {
    const fonte = ler(PAINEL_CC);
    expect(fonte).toContain("nomeCompleto");
    expect(fonte).toContain("c.nif");
  });

  it("os contactos aparecem quando o cliente os partilha, e dizem-no", () => {
    const fonte = ler(PAINEL_CC);
    expect(fonte).toContain("ContactosDoCliente");

    const contactos = ler(CONTACTOS);
    // Sem partilha, o componente não finge que não há ninguém: explica.
    expect(contactos).toMatch(/não está a partilhar os contactos/i);
    // E diz de quem foi a decisão, para não parecer um dado que a
    // plataforma vendeu.
    expect(contactos).toMatch(/foi esta pessoa que decidiu partilhar/i);
  });

  it("o cliente liga e desliga a partilha, com o efeito dito", () => {
    const contactos = ler(CONTACTOS);
    expect(contactos).toContain("definirPartilhaDeContactos");
    expect(contactos).toContain('role="switch"');
    expect(contactos).toContain("aria-checked");
  });

  it("⚠️ a administração não tem por onde ler uma conversa", () => {
    // O ecrã da administração não pode nomear a tabela das mensagens nem
    // qualquer forma de as listar. A garantia real está na política da
    // migração `20260818210000` — isto apanha o ecrã que a tentasse
    // contornar antes de alguém o escrever por distração.
    const codigo = semComentarios(ler(TRIAGEM));
    expect(codigo).not.toContain("listarMensagensDoCaso");
    expect(codigo).not.toContain("caso_mensagens");
    expect(codigo).not.toContain("reverMensagem");
    expect(codigo).not.toContain("filaDeRevisao");
    // A situação escrita pela pessoa também não se abre aqui.
    expect(codigo).not.toContain("c.situacao");
  });

  it("a única coisa que a administração lê é o que lhe foi entregue", () => {
    const fonte = ler(TRIAGEM);
    expect(fonte).toContain("filaDeDenuncias");
    expect(fonte).toMatch(/só esta mensagem/i);
  });

  it("denunciar diz, antes de acontecer, o que vai passar a ser lido", () => {
    const conversa = ler(CONVERSA);
    expect(conversa).toContain("denunciarMensagem");
    expect(conversa.replace(/\s+/g, " "))
      .toMatch(/esta mensagem<\/strong> — e só esta — passa a poder ser\s*lida/i);
  });
});

describe("RC-CASO-UI-002 · a decisão está fechada até se ler", () => {
  const fonte = ler(LEITOR);

  it("os três botões dependem da mesma condição", () => {
    // `pronto` = chegou ao fim do texto E, havendo contrato, leu-o E confirmou.
    expect(fonte).toContain("const pronto = chegouAoFim && !faltaOContrato && confirmou;");
    const decisoes = fonte.match(/disabled=\{!pronto/g) ?? [];
    expect(decisoes.length, "aceitar, pedir desconto e recusar").toBeGreaterThanOrEqual(3);
  });

  it("a caixa de confirmação não se marca antes de se chegar ao fim", () => {
    expect(fonte).toMatch(/checked=\{confirmou\}\s*\n\s*disabled=\{!chegouAoFim \|\| faltaOContrato\}/);
  });

  it("o fim do documento também se alcança por teclado", () => {
    // Um marcador que só se ativa a olhar seria uma barreira para quem
    // navega com Tab ou com leitor de ecrã.
    expect(fonte).toContain("onFocus={() => void marcarFim()}");
    expect(fonte).toMatch(/ref=\{fim\}\s*\n\s*tabIndex=\{0\}/);
  });

  it("diz o que falta, em vez de mostrar um botão morto", () => {
    expect(fonte).toContain("Os botões abrem quando chegares ao fim do texto acima.");
    expect(fonte).toContain("Falta chegar à última página do contrato em anexo.");
    expect(fonte).toContain("Falta marcar a confirmação.");
  });

  it("a barra de progresso anuncia-se a quem não a vê", () => {
    expect(fonte).toContain('role="progressbar"');
    expect(fonte).toContain("aria-valuenow={progresso}");
  });
});

describe("RC-CASO-UI-006 · o contrato lê-se antes de se decidir", () => {
  const leitor = ler(LEITOR);
  const documento = ler("src/components/casos/LeitorDeDocumento.tsx");
  const painel = ler(PAINEL_CC);
  const migracao = ler("supabase/migrations/20260816090000_contrato_da_proposta.sql");

  it("o contabilista anexa o contrato no mesmo gesto em que envia a proposta", () => {
    expect(painel).toContain("Contrato ou documento a anexar");
    expect(painel).toContain('enviarFicheiro("proposta", id, contrato, { eContrato: true })');
    // O envio do ficheiro é parte da mesma ação, e não um passo seguinte
    // que se pode esquecer.
    expect(painel).toContain("Enviar proposta com contrato");
  });

  it("uma proposta que promete contrato e o perde não é dada por enviada", () => {
    expect(painel).toContain("A proposta seguiu, mas o contrato não");
  });

  it("o contrato abre-se dentro da página, e não como transferência solta", () => {
    expect(leitor).toContain("LeitorDeDocumento");
    expect(leitor).toContain("ssr: false");
    expect(leitor).toContain("ErrorBoundary");
    expect(documento).toContain("pdfjs-dist");
    expect(documento).toContain("/pdf.worker.min.mjs");
  });

  it("chegar ao fim conta a rolar e conta por teclado", () => {
    expect(documento).toContain("IntersectionObserver");
    expect(documento).toContain("numero === paginas.length");
    expect(documento).toContain("onFocus={marcarFim}");
    // Um contrato de uma página está inteiro no ecrã: exigir um gesto sem
    // destino seria uma armadilha.
    expect(documento).toContain("if (medidas.length === 1) marcarFim();");
  });

  it("o que não é PDF diz o que consegue provar, em vez de fingir", () => {
    expect(documento).toContain("sem-visualizador");
    expect(documento).toMatch(/só tu sabes que o leste/i);
  });

  it("a garantia está na base de dados, e não no botão", () => {
    expect(migracao).toContain("contrato_lido_em");
    expect(migracao).toContain("public.proposta_tem_contrato");
    // As duas escritas que decidem alguma coisa exigem a mesma condição.
    const condicoes = migracao.match(
      /NOT public\.proposta_tem_contrato\(p\.id\) OR p\.contrato_lido_em IS NOT NULL/g,
    ) ?? [];
    expect(condicoes.length, "confirmar_leitura e decidir_proposta").toBeGreaterThanOrEqual(2);
    expect(migracao).toContain("'contrato_por_ler'");
  });

  it("propostas sem contrato continuam a decidir-se como antes", () => {
    // A condição é sempre verdadeira quando não há anexo de contrato — e é
    // por isso que ela começa por `NOT ... tem_contrato`.
    expect(migracao).toMatch(/NOT public\.proposta_tem_contrato/);
    expect(leitor).toContain("const faltaOContrato = Boolean(contrato) && !contratoLido;");
  });
});

describe("RC-CASO-UI-003 · o que acontece aos dados é dito antes", () => {
  it("o formulário avisa antes do primeiro campo, e não no fim", () => {
    const fonte = ler(FORMULARIO);
    const aviso = fonte.indexOf("ninguém do Recibo Certo a lê");
    const primeiroCampo = fonte.indexOf("setArea(a.id)");
    expect(aviso).toBeGreaterThan(0);
    expect(aviso, "o aviso tem de vir antes dos campos").toBeLessThan(primeiroCampo);
  });

  it("os contactos estão separados, e a partilha é uma caixa que nasce por marcar", () => {
    const fonte = ler(FORMULARIO);
    expect(fonte).toContain("Como te contactam");

    // ⚠️ ISTO PEDIA A FRASE ERRADA, e por isso guardava o defeito.
    //
    // Exigia «podes desligar essa partilha» — a promessa de que a ficha
    // já ia a caminho e a pessoa a podia travar DEPOIS. Era essa a
    // implementação: `partilha_contactos` nascia `true` e não havia caixa
    // nenhuma neste formulário, ao contrário do que a migração dizia.
    //
    // O que se guarda agora é o oposto: a escolha existe, está aqui, e
    // nasce por marcar.
    const nu = fonte.replace(/\s+/g, " ");
    expect(nu).toMatch(/Partilhar estes contactos com quem eu escolher/i);
    expect(nu).toMatch(/só seguem se disseres que sim/i);
    expect(fonte, "a caixa tem de nascer desmarcada").toContain(
      "useState(false);",
    );
    expect(fonte).toContain('id="partilhar-contactos"');
    expect(fonte, "a escolha tem de chegar ao servidor").toContain("partilharContactos,");
  });

  it("a conversa deixou de prometer revisão — porque deixou de a haver", () => {
    const detalhe = semComentarios(ler(DETALHE));
    const conversa = semComentarios(ler(CONVERSA));
    for (const [nome, fonte] of [["detalhe", detalhe], ["conversa", conversa]] as const) {
      expect(fonte, `${nome} ainda promete revisão`).not.toContain("passa por nós antes de seguir");
      expect(fonte, `${nome} ainda submete`).not.toContain("Submeter para revisão");
      expect(fonte, `${nome} ainda redige`).not.toContain("Encaminhámos esta mensagem com um ajuste");
    }
  });

  it("a conversa diz de quem é, sem exagerar no que promete", () => {
    const conversa = ler(CONVERSA).replace(/\s+/g, " ");
    expect(conversa).toMatch(/Esta conversa é entre vocês os dois/i);
    // A ressalva importa: sem ela, «ninguém lê» seria falso no instante em
    // que alguém denuncia uma mensagem.
    expect(conversa).toMatch(/só\s*chega até nós uma mensagem que um de vocês nos entregue/i);
  });

  it("uma mensagem parada na revisão antiga não fica em silêncio", () => {
    // Quem a escreveu tem de saber que nunca chegou — senão fica à espera
    // de resposta a uma pergunta que o outro lado não leu.
    const conversa = ler(CONVERSA).replace(/\s+/g, " ");
    expect(conversa).toMatch(/ficou parada na revisão que existia antes/i);
  });
});

describe("RC-CASO-UI-004 · mobile-first e sem emojis", () => {
  const ecrans = [PAINEL_CC, LEITOR, FORMULARIO, TRIAGEM, DETALHE, CONVERSA, CONTACTOS,
                  "src/app/dashboard/casos/page.tsx"];

  it("nenhum emoji — só ícones SVG", () => {
    for (const f of ecrans) {
      const fonte = ler(f);
      // Fora dos comentários: `⚠️` marca, no código-fonte, o que já foi
      // possível fazer e deixou de ser. Não chega ao ecrã de ninguém.
      expect(semComentarios(fonte), `${f} tem emoji`)
        .not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });

  it("as grelhas empilham no telemóvel", () => {
    for (const f of ecrans) {
      const fonte = ler(f);
      // Só as SEM prefixo contam: `sm:grid-cols-2` é o que se quer — o
      // `\b` de uma versão anterior deste teste casava depois dos dois
      // pontos e dava por errado exatamente o que estava certo.
      for (const m of fonte.matchAll(/(^|[\s"])grid-cols-(\d)/g)) {
        expect(m[2], `${f} assume várias colunas no telemóvel`).toBe("1");
      }
    }
  });

  // A TRIAGEM sai desta lista, e não por descuido: deixou de ter botões
  // de ação. Aprovar, devolver, recusar e encaminhar desapareceram com a
  // mediação, e o que lá ficou são separadores e listas. Um teste que
  // exigisse `w-full sm:w-auto` num ecrã sem botões obrigava a inventar
  // um só para o calar. O que continua a valer para ele — empilhar,
  // não estourar a largura — é verificado pelas grelhas e pelo `flex-wrap`.
  it("os botões de ação ocupam a largura toda no telemóvel", () => {
    for (const f of [LEITOR, PAINEL_CC]) {
      const fonte = ler(f);
      expect(fonte, `${f} sem botões de largura total`).toContain("w-full sm:w-auto");
    }
  });

  it("as filas de botões empilham antes de alinhar", () => {
    for (const f of [LEITOR, PAINEL_CC, FORMULARIO]) {
      const fonte = ler(f);
      // A ordem das classes varia; o que não pode variar é a base ser
      // empilhada e o `sm:` ser quem alinha.
      const filas = [...fonte.matchAll(/className="([^"]*\bsm:flex-row\b[^"]*)"/g)];
      expect(filas.length, `${f} não tem filas de botões`).toBeGreaterThan(0);
      for (const [, classes] of filas) {
        expect(classes, `${f}: «${classes}» alinha sem empilhar primeiro`).toContain("flex-col");
      }
    }
  });
});

describe("RC-CASO-UI-005 · anexos, revisão e tempo real", () => {
  const FICHEIROS = "src/components/casos/Ficheiros.tsx";

  it("descarregar passa sempre pela rota que reconfirma", () => {
    // Um URL assinado sobreviveria ao acesso que o produziu.
    const fonte = ler(FICHEIROS);
    expect(fonte).toContain("urlDoFicheiro");
    expect(semComentarios(fonte)).not.toContain("createSignedUrl");
  });

  it("o ficheiro descarrega, não abre num separador", () => {
    // Um separador servido do nosso domínio partilha a origem com a sessão.
    const fonte = ler(FICHEIROS);
    expect(fonte).toContain("a.download = nome");
    expect(semComentarios(fonte)).not.toContain("window.open");
  });

  it("o endereço temporário é revogado — não fica em memória para sempre", () => {
    expect(ler(FICHEIROS)).toContain("URL.revokeObjectURL");
  });

  it("o que foi retirado diz-se, em vez de parecer entregue", () => {
    const fonte = ler(FICHEIROS);
    expect(fonte).toContain("Entregue");
    expect(fonte).toContain("Retirado");
    // O texto do JSX quebra por onde a linha acaba: comparar com o
    // espaçamento colapsado, senão o teste falha por causa de uma mudança
    // de linha que não muda nada.
    expect(fonte.replace(/\s+/g, " ")).toMatch(/deixaram de estar ao alcance/i);
  });

  it("⚠️ um documento anexado não fica preso à espera de ninguém", () => {
    // A avaria que esta migração teve de reparar: `libertado_em` nascia
    // nulo e só a triagem o preenchia. Sem triagem, o documento ficava
    // invisível para sempre — sem erro, com o cliente convencido de que
    // tinha enviado a fatura.
    const migracao = ler("supabase/migrations/20260818210000_fim_da_mediacao.sql");
    expect(migracao).toMatch(/tipo_mime, libertado_em\)/);
    expect(migracao).toMatch(/SET libertado_em = coalesce\(libertado_em, now\(\)\)/);
    // E a triagem que o prendia deixou de existir.
    expect(migracao).toContain("DROP FUNCTION IF EXISTS public.libertar_documento");
  });

  it("quem anexou pode retirar, e é só ele", () => {
    const migracao = ler("supabase/migrations/20260818210000_fim_da_mediacao.sql");
    expect(migracao).toContain("public.retirar_documento_do_caso");
    expect(migracao).toMatch(/NOT public\.dono_do_caso\(v_caso, u\)/);
    expect(ler("src/lib/contabilistas/casos.ts")).toContain("retirarDocumentoDoCaso");
  });

  it("o contabilista não liberta nem anexa documentos ao caso", () => {
    const codigo = semComentarios(ler(PAINEL_CC));
    expect(codigo).not.toContain("libertarDocumento");
    expect(codigo.replace(/\s+/g, " "))
      .toMatch(/contexto="caso".{0,180}podeAnexar=\{false\}/);
  });

  it("a conversa mediada atualiza-se sozinha, e o canal fecha-se", () => {
    const fonte = ler(DETALHE);
    expect(fonte).toContain("escutarCaso");
    // Um canal por montagem que nunca fecha esgota as ligações do plano.
    expect(fonte).toMatch(/return escutarCaso\(/);
  });
});
