// ═══════════════════════════════════════════════════════════════════════
//  Os ecrãs novos, renderizados a sério
//  ---------------------------------------------------------------------
//  `renderToStaticMarkup`, como a suíte da sala já faz. Prova markup, e
//  não interação — mas markup é exactamente o que interessa aqui: que o
//  perfil público não publique um bloco bloqueado pelo guardião, que o
//  painel de verificação não escreva «verificado» sobre um selo caído, e
//  que o editor mostre a razão em vez de recusar em silêncio.
//
//  O que isto NÃO prova, e é honesto dizê-lo: nada do que acontece depois
//  de a página hidratar. Escrever num campo e ver o achado aparecer exige
//  um browser com sessão, que a suíte não tem.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BlocosDoPerfil from "@/components/contabilistas/BlocosDoPerfil";
import PainelVerificacao from "@/components/contabilistas/PainelVerificacao";
import EditorAreas from "@/components/contabilistas/EditorAreas";
import EditorCobertura from "@/components/contabilistas/EditorCobertura";
import EditorBlocos from "@/components/contabilistas/EditorBlocos";
import { COBERTURA_VAZIA } from "@/lib/contabilistas/personalizacao/cobertura";
import {
  PERFIS_METODO, REGISTO_VAZIO, confirmar, validadeAPartirDe,
} from "@/lib/contabilistas/verificacao";
import type { Bloco } from "@/lib/contabilistas/personalizacao/blocos";

// ─── O perfil público ──────────────────────────────────────────────────

describe("BlocosDoPerfil", () => {
  const bom = {
    id: "b1", tipo: "texto", titulo: "Como trabalho",
    itens: [{ principal: "Explico as contas com calma.", secundario: null }],
  };

  it("mostra o que a pessoa compôs", () => {
    const html = renderToStaticMarkup(<BlocosDoPerfil bruto={[bom]} />);
    expect(html).toContain("Como trabalho");
    expect(html).toContain("Explico as contas com calma.");
  });

  it("numera o percurso, porque a ordem é a informação", () => {
    const html = renderToStaticMarkup(
      <BlocosDoPerfil bruto={[{
        id: "p", tipo: "percurso", titulo: "Como corre",
        itens: [
          { principal: "Contas-me a situação.", secundario: null },
          { principal: "Digo-te o que reservar.", secundario: null },
        ],
      }]} />
    );
    expect(html).toContain("<ol");
    expect(html).toContain("Contas-me a situação.");
  });

  it("NÃO publica um bloco travado pelo guardião", () => {
    const html = renderToStaticMarkup(
      <BlocosDoPerfil bruto={[bom, {
        id: "mau", tipo: "texto", titulo: "Promessa",
        itens: [{ principal: "Garanto o reembolso do IRS.", secundario: null }],
      }]} />
    );
    expect(html).toContain("Como trabalho");
    expect(html).not.toContain("Garanto o reembolso");
  });

  it("não publica um bloco a meio, e não estoira com lixo", () => {
    expect(renderToStaticMarkup(
      <BlocosDoPerfil bruto={[{ id: "x", tipo: "texto", titulo: "Vazio", itens: [] }]} />
    )).toBe("");
    expect(renderToStaticMarkup(<BlocosDoPerfil bruto={"nada disto"} />)).toBe("");
    expect(renderToStaticMarkup(<BlocosDoPerfil bruto={null} />)).toBe("");
  });

  it("escapa marcação em vez de a interpretar", () => {
    const html = renderToStaticMarkup(
      <BlocosDoPerfil bruto={[{
        id: "b", tipo: "lista", titulo: "O que trato",
        itens: [{ principal: "<b>IRS</b>", secundario: null }],
      }]} />
    );
    expect(html).not.toContain("<b>IRS</b>");
    expect(html).toContain("&lt;b&gt;IRS&lt;/b&gt;");
  });
});

// ─── O painel de verificação ───────────────────────────────────────────

describe("PainelVerificacao", () => {
  const nada = async () => {};

  it("um número escrito pelo próprio nunca aparece como verificado", () => {
    const html = renderToStaticMarkup(
      <PainelVerificacao numero="12345" registo={REGISTO_VAZIO} aoPedir={nada} porGuardar={false} />
    );
    expect(html).toContain("Nº de inscrição informado");
    expect(html).toContain("Pedir verificação");
    // O estado é «Por confirmar», e não «Verificado». Os rótulos dos
    // métodos aparecem na lista do que ainda se PODE fazer — é um menu de
    // caminhos, não uma afirmação sobre esta pessoa.
    expect(html).toContain(">Por confirmar<");
    expect(html).not.toContain(">Verificado<");
  });

  it("com selo válido diz como foi confirmado e quanto tempo falta", () => {
    const { registo } = confirmar(REGISTO_VAZIO, {
      metodo: "registo_publico", numero: "12345", por: "admin",
    });
    const html = renderToStaticMarkup(
      <PainelVerificacao numero="12345" registo={registo} aoPedir={nada} porGuardar={false} />
    );
    expect(html).toContain(PERFIS_METODO.registo_publico.rotulo);
    expect(html).toContain("Válida por mais");
  });

  it("passado o prazo deixa de dizer verificado e oferece renovar", () => {
    const { registo } = confirmar(REGISTO_VAZIO, {
      metodo: "registo_publico", numero: "12345", por: "admin",
      agora: new Date(Date.now() - 200 * 86_400_000),
    });
    const html = renderToStaticMarkup(
      <PainelVerificacao numero="12345" registo={registo} aoPedir={nada} porGuardar={false} />
    );
    expect(html).toContain("por reconfirmar");
    expect(html).toContain("Pedir nova verificação");
  });

  it("avisa quando o NIF foi colado no campo do número de membro", () => {
    const html = renderToStaticMarkup(
      <PainelVerificacao numero="501442600" registo={REGISTO_VAZIO} aoPedir={nada} porGuardar={false} />
    );
    expect(html).toContain("NIF");
  });

  it("diz que o SCAP ainda não está ligado, em vez de o prometer", () => {
    const html = renderToStaticMarkup(
      <PainelVerificacao numero="12345" registo={REGISTO_VAZIO} aoPedir={nada} porGuardar={false} />
    );
    expect(html).toContain("protocolo com a AMA");
    expect(html).not.toMatch(/em breve/i);
  });

  it("a validade mostrada é a que o motor calculou", () => {
    const agora = new Date();
    const { registo } = confirmar(REGISTO_VAZIO, {
      metodo: "scap", numero: "12345", por: "scap", agora,
    });
    expect(registo.validoAte).toBe(validadeAPartirDe(agora, PERFIS_METODO.scap.validadeDias));
  });
});

// ─── Os editores ───────────────────────────────────────────────────────

describe("EditorAreas", () => {
  it("mostra o eixo e assinala a área que vem de um termo próprio", () => {
    const html = renderToStaticMarkup(
      <EditorAreas
        areas={["IRS"]}
        termos={[{ texto: "Nómadas digitais", area: "Clientes internacionais" }]}
        aoMudarAreas={() => {}}
        aoMudarTermos={() => {}}
      />
    );
    expect(html).toContain("Recibos verdes");
    expect(html).toContain("Nómadas digitais");
    expect(html).toContain("Clientes internacionais");
    // A frase que explica a magia. Sem ela, ninguém percebe porque é que
    // aparece num filtro que não marcou. Uma só área implícita fala no
    // singular — a concordância é copy, e copy mal feita lê-se como erro.
    expect(html).toContain("vem dos teus termos e já conta no filtro");
  });
});

describe("EditorCobertura", () => {
  it("mostra a frase que vai sair no perfil", () => {
    const html = renderToStaticMarkup(
      <EditorCobertura
        cobertura={{ ...COBERTURA_VAZIA, distrito: "Porto", concelho: "Matosinhos" }}
        modalidades={["presencial", "online"]}
        aoMudar={() => {}}
      />
    );
    expect(html).toContain("No perfil vai aparecer");
    expect(html).toContain("Matosinhos, Porto");
  });

  it("recusa «todo o país» a quem só atende presencialmente", () => {
    const html = renderToStaticMarkup(
      <EditorCobertura
        cobertura={{ ...COBERTURA_VAZIA, modo: "pais" }}
        modalidades={["presencial"]}
        aoMudar={() => {}}
      />
    );
    expect(html).toContain("precisa de atendimento online");
  });
});

describe("EditorBlocos", () => {
  const mau: Bloco = {
    id: "b", tipo: "texto", titulo: "Sobre mim",
    itens: [{ principal: "Sou o melhor contabilista de Lisboa.", secundario: null }],
  };

  it("explica o achado do guardião em vez de recusar em silêncio", () => {
    const html = renderToStaticMarkup(<EditorBlocos blocos={[mau]} aoMudar={() => {}} />);
    expect(html).toContain("não aparece no perfil público");
    expect(html).toContain("diretório não tem avaliações");
    // O achado cita o que a pessoa escreveu, para ela se reconhecer nele.
    expect(html).toContain("o melhor");
  });

  it("oferece os tipos que ainda faltam", () => {
    const html = renderToStaticMarkup(<EditorBlocos blocos={[]} aoMudar={() => {}} />);
    expect(html).toContain("Perguntas frequentes");
    expect(html).toContain("Percurso");
    expect(html).toContain("Acrescentar secção");
  });
});
