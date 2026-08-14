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

describe("RC-CASO-UI-001 · o painel do contabilista não pede contactos", () => {
  // A garantia mora na base de dados, e um `select` aqui não traria nada.
  // Mas um ecrã que TENTA mostrar um telefone é um ecrã escrito por quem
  // não percebeu o modelo — e o próximo a mexer-lhe percebe ainda menos.
  it("não lê a tabela dos contactos", () => {
    const fonte = ler(PAINEL_CC);
    // Sem os comentários: o cabeçalho do ficheiro explica por que razão
    // não há contactos aqui, e procurar o nome encontrava a explicação.
    const codigo = semComentarios(fonte);
    expect(codigo).not.toContain("obterContactos");
    expect(codigo).not.toContain("caso_contactos");
  });

  it("mostra o nome e o NIF, que são o que ele precisa", () => {
    const fonte = ler(PAINEL_CC);
    expect(fonte).toContain("nomeCompleto");
    expect(fonte).toContain("c.nif");
  });

  it("diz porque é que não há contactos, em vez de os omitir em silêncio", () => {
    const fonte = ler(PAINEL_CC);
    expect(fonte).toMatch(/contactos ficam[\s\S]{0,40}connosco/i);
  });

  it("só a triagem mostra contactos, e a pedido", () => {
    const fonte = ler(TRIAGEM);
    expect(fonte).toContain("obterContactos");
    // Não carregados com a página: um hábito de os ter sempre à vista é o
    // que transforma uma captura de ecrã num problema.
    expect(fonte).toContain("Mostrar contactos");
    expect(fonte).not.toMatch(/useEffect\([^)]*obterContactos/);
  });
});

describe("RC-CASO-UI-002 · a decisão está fechada até se ler", () => {
  const fonte = ler(LEITOR);

  it("os três botões dependem da mesma condição", () => {
    // `pronto` = chegou ao fim E confirmou.
    expect(fonte).toContain("const pronto = chegouAoFim && confirmou;");
    const decisoes = fonte.match(/disabled=\{!pronto/g) ?? [];
    expect(decisoes.length, "aceitar, pedir desconto e recusar").toBeGreaterThanOrEqual(3);
  });

  it("a caixa de confirmação não se marca antes de se chegar ao fim", () => {
    expect(fonte).toMatch(/checked=\{confirmou\}\s*\n\s*disabled=\{!chegouAoFim\}/);
  });

  it("o fim do documento também se alcança por teclado", () => {
    // Um marcador que só se ativa a olhar seria uma barreira para quem
    // navega com Tab ou com leitor de ecrã.
    expect(fonte).toContain("onFocus={() => void marcarFim()}");
    expect(fonte).toMatch(/ref=\{fim\}\s*\n\s*tabIndex=\{0\}/);
  });

  it("diz o que falta, em vez de mostrar um botão morto", () => {
    expect(fonte).toContain("Os botões abrem quando chegares ao fim do documento acima.");
    expect(fonte).toContain("Falta marcar a confirmação.");
  });

  it("a barra de progresso anuncia-se a quem não a vê", () => {
    expect(fonte).toContain('role="progressbar"');
    expect(fonte).toContain("aria-valuenow={progresso}");
  });
});

describe("RC-CASO-UI-003 · o que segue e o que não segue é dito antes", () => {
  it("o formulário avisa antes do primeiro campo, e não no fim", () => {
    const fonte = ler(FORMULARIO);
    const aviso = fonte.indexOf("Não recebe o teu");
    const primeiroCampo = fonte.indexOf("setArea(a.id)");
    expect(aviso).toBeGreaterThan(0);
    expect(aviso, "o aviso tem de vir antes dos campos").toBeLessThan(primeiroCampo);
  });

  it("os contactos estão visualmente separados do resto", () => {
    const fonte = ler(FORMULARIO);
    expect(fonte).toContain("Fica connosco");
    expect(fonte).toContain("O contabilista nunca chega a isto");
  });

  it("a conversa não se chama chat, e diz que é lida", () => {
    const fonte = ler(DETALHE);
    expect(fonte.toLowerCase()).not.toContain(">chat<");
    expect(fonte).toContain("passa por nós antes de seguir");
    expect(fonte).toContain("Submeter para revisão");
  });

  it("uma mensagem redigida é dita a quem a escreveu", () => {
    const fonte = ler(DETALHE);
    expect(fonte).toContain("Encaminhámos esta mensagem com um ajuste");
  });
});

describe("RC-CASO-UI-004 · mobile-first e sem emojis", () => {
  const ecrans = [PAINEL_CC, LEITOR, FORMULARIO, TRIAGEM, DETALHE,
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

  it("os botões de ação ocupam a largura toda no telemóvel", () => {
    for (const f of [LEITOR, PAINEL_CC, TRIAGEM]) {
      const fonte = ler(f);
      expect(fonte, `${f} sem botões de largura total`).toContain("w-full sm:w-auto");
    }
  });

  it("as filas de botões empilham antes de alinhar", () => {
    for (const f of [LEITOR, PAINEL_CC, TRIAGEM, FORMULARIO]) {
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

  it("o que ainda não seguiu diz-se, em vez de parecer entregue", () => {
    const fonte = ler(FICHEIROS);
    expect(fonte).toContain("Por rever");
    // O texto do JSX quebra por onde a linha acaba: comparar com o
    // espaçamento colapsado, senão o teste falha por causa de uma mudança
    // de linha que não muda nada.
    expect(fonte.replace(/\s+/g, " ")).toMatch(/pode ter os teus contactos lá dentro/i);
  });

  it("a triagem obriga a olhar antes de libertar", () => {
    const fonte = ler(TRIAGEM);
    expect(fonte).toContain("libertarDocumento");
    expect(fonte.replace(/\s+/g, " ")).toMatch(/Abre cada um antes de o libertar/);
    // E dá para voltar atrás: libertar por engano tem de ter desfazer.
    expect(fonte).toContain("Libertado — retirar");
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
