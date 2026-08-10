import { describe, expect, it } from "vitest";
import { CATEGORIAS, FERRAMENTAS, GUIAS, categoriaPorContexto } from "@/lib/busca";
import { ICONES } from "@/components/busca/partes";
import { NAV_AMBITOS, NAV_APRENDER, NAV_FERRAMENTAS, ambitoAtivo } from "@/components/nav-config";

// ─────────────────────────────────────────────────────────────────────
// O cabeçalho e a pesquisa apoiam-se em ligações que NENHUM compilador
// verifica: um id de ferramenta escrito à mão, um nome de ícone, um
// prefixo de rota. Todas falham da mesma maneira — em silêncio, com um
// `?? fallback` ou um `.filter()` a apagar o engano — e o que se vê é a
// interface ligeiramente errada, não um erro.
//
// Estes testes transformam cada uma dessas ligações numa reprovação.
// ─────────────────────────────────────────────────────────────────────

describe("busca:icones", () => {
  it("todo o ícone declarado no índice existe no mapa do painel", () => {
    const usados = [...new Set([...FERRAMENTAS, ...GUIAS].map((i) => i.icone))];
    const emFalta = usados.filter((nome) => !(nome in ICONES));

    // Sem isto, dez dos treze nomes caíam no ícone por omissão e a grelha de
    // atalhos aparecia com seis calculadoras iguais. Não dava erro nenhum.
    expect(emFalta, `ícones sem correspondência: ${emFalta.join(", ")}`).toEqual([]);
  });

  it("o mapa não guarda ícones que já ninguém usa", () => {
    const usados = new Set([...FERRAMENTAS, ...GUIAS].map((i) => i.icone));
    const orfaos = Object.keys(ICONES).filter((nome) => !usados.has(nome));
    expect(orfaos, `ícones a mais no mapa: ${orfaos.join(", ")}`).toEqual([]);
  });
});

describe("busca:atalhos", () => {
  it("todos os ids dos acessos rápidos resolvem para uma ferramenta", () => {
    // Espelha `MAIS_UTILIZADOS` em `motor.ts`. É a única cópia consciente:
    // importá-la obrigaria o motor (um módulo de cliente, com hooks) a ser
    // carregado por um teste de dados.
    const ids = ["f-comparar", "f-irs", "f-rv", "f-empresa", "f-venc", "f-simplificado"];
    const perdidos = ids.filter((id) => !FERRAMENTAS.some((f) => f.id === id));
    expect(perdidos, `ids inexistentes: ${perdidos.join(", ")}`).toEqual([]);
  });

  it("as sugestões do painel apontam para ferramentas reais", () => {
    const ids = ["f-auditoria", "f-classificar", "f-quiz"];
    const perdidos = ids.filter((id) => !FERRAMENTAS.some((f) => f.id === id));
    expect(perdidos, `ids inexistentes: ${perdidos.join(", ")}`).toEqual([]);
  });
});

describe("cabecalho:ambitos", () => {
  it("cada âmbito acende na rota para onde aponta", () => {
    // A regra que isto protege: clicar num âmbito tem de o deixar aceso na
    // página de destino. Um prefixo mal escrito dá um cabeçalho que nunca
    // marca onde se está — e ninguém repara logo.
    for (const ambito of NAV_AMBITOS) {
      if (ambito.prefixos.length === 0) continue;
      const destino = ambito.href.split("#")[0];
      const acende = ambito.prefixos.some((p) => destino.startsWith(p));
      expect(acende, `«${ambito.label}» aponta para ${destino} e não acende lá`).toBe(true);
    }
  });

  it("nenhum âmbito rouba a rota de outro", () => {
    // Dois itens acesos ao mesmo tempo é pior do que nenhum: deixa de haver
    // indicador de onde se está. `/ferramentas/classificar-atividade` começa
    // por `/ferramentas`, portanto a ordem da lista importa — o mais
    // específico tem de vir primeiro.
    //
    // Isto chama a MESMA função que o cabeçalho executa. Uma regra parecida
    // escrita aqui dentro passaria a verde enquanto o componente decidia de
    // outra maneira, que foi exactamente o que aconteceu antes de esta função
    // existir: o teste aprovava, e a interface acendia dois itens.
    for (const ambito of NAV_AMBITOS) {
      const destino = ambito.href.split("#")[0];
      if (destino === "/") continue;
      expect(ambitoAtivo(destino)?.label, `${destino} devia acender «${ambito.label}»`).toBe(ambito.label);
    }
  });

  it("uma sub-rota profunda acende o âmbito mais específico, e só esse", () => {
    expect(ambitoAtivo("/ferramentas/classificar-atividade")).toBeNull();
    expect(ambitoAtivo("/ferramentas/simulador-irs")).toBeNull();
    expect(ambitoAtivo("/guias/iva-trimestral")?.label).toBe("Guias");
    expect(ambitoAtivo("/quiz-fiscal/iva")?.label).toBe("Quiz");
  });

  it("uma rota sem âmbito não acende nada", () => {
    // Meio caminho é o pior estado: um item aceso numa página a que ele não
    // pertence diz à pessoa que está noutro sítio.
    expect(ambitoAtivo("/privacidade")).toBeNull();
    expect(ambitoAtivo("/dashboard")).toBeNull();
    // `/precos-especiais` não é `/precos`: um prefixo tem de casar no
    // separador, senão qualquer rota que comece pelas mesmas letras acende.
    expect(ambitoAtivo("/precos-especiais")).toBeNull();
  });

  it("o âmbito da barra segue a rota de cada destino", () => {
    // O rótulo por cima e o corpus por baixo têm de concordar. Se `/guias`
    // acende «Guias» mas a barra pesquisa ferramentas, o cabeçalho promete
    // uma coisa e entrega outra.
    expect(categoriaPorContexto("/guias")).toBe("guias");
    expect(categoriaPorContexto("/ferramentas/classificar-atividade")).toBe("atividades");
    expect(categoriaPorContexto("/")).toBe("ferramentas");
  });

  it("cada categoria da pesquisa tem texto de sugestão", () => {
    // A barra fechada mostra este texto. Uma categoria sem ele deixaria a
    // barra muda, que é o mesmo que não dizer o que procura.
    for (const c of CATEGORIAS) {
      expect(c.placeholder.trim().length, `categoria «${c.id}» sem placeholder`).toBeGreaterThan(0);
      expect(c.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("cabecalho:recursos", () => {
  it("nenhum destino do antigo menu se perdeu", () => {
    // O mega-dropdown «Recursos Fiscais» saiu da barra e passou para o painel
    // de pesquisa. Isto garante que a mudança foi de SÍTIO e não de conteúdo:
    // os nove destinos continuam todos declarados.
    const destinos = [...NAV_FERRAMENTAS, ...NAV_APRENDER];
    expect(destinos.length).toBeGreaterThanOrEqual(9);
    for (const item of destinos) {
      expect(item.href.startsWith("/"), `${item.label} não tem rota absoluta`).toBe(true);
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.desc.trim().length).toBeGreaterThan(0);
    }
  });
});
