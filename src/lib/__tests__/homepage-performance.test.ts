import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import descobrir from "@/generated/homepage/descobrir.json";
import empresa from "@/generated/homepage/empresa.json";
import preco from "@/generated/homepage/preco.json";
import recibos from "@/generated/homepage/recibos.json";
import salario from "@/generated/homepage/salario.json";
import {
  FOCOS_HOMEPAGE,
  ROTA_POR_FOCO,
  focoDaRotaHomepage,
  type FocoHomepage,
} from "@/lib/foco-homepage";
import { resolverPrazoSSAtual } from "@/components/foco/recibos/PrazoSSAtual";
import { curvaCSS } from "@/components/palco/motion-lite";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { APP_VERSION } from "@/lib/version";
import { CATALOGO } from "@/lib/analytics/eventos";
import { CONSENT_VERSION } from "@/lib/cookie-consent";
import { proxy } from "@/proxy";

const SRC = join(__dirname, "..", "..");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

const ENTRADAS: Record<
  FocoHomepage,
  { ficheiro: string[]; componente: string; snapshot: string }
> = {
  descobrir: {
    ficheiro: ["app", "page.tsx"],
    componente: "HomepageDescobrir",
    snapshot: "descobrir.json",
  },
  preco: {
    ficheiro: ["app", "inicio", "preco", "page.tsx"],
    componente: "HomepagePreco",
    snapshot: "preco.json",
  },
  recibos: {
    ficheiro: ["app", "inicio", "recibos", "page.tsx"],
    componente: "HomepageRecibos",
    snapshot: "recibos.json",
  },
  empresa: {
    ficheiro: ["app", "inicio", "empresa", "page.tsx"],
    componente: "HomepageEmpresa",
    snapshot: "empresa.json",
  },
  salario: {
    ficheiro: ["app", "inicio", "salario", "page.tsx"],
    componente: "HomepageSalario",
    snapshot: "salario.json",
  },
};

describe("homepage: entradas estáticas", () => {
  it("cada rota importa exatamente o próprio palco e o próprio snapshot", () => {
    const componentes = Object.values(ENTRADAS).map((entrada) => entrada.componente);

    for (const [foco, entrada] of Object.entries(ENTRADAS)) {
      const fonte = ler(...entrada.ficheiro);
      expect(fonte, `${foco} deixou de reprovar acesso dinâmico`).toContain(
        'export const dynamic = "error"',
      );
      expect(fonte, `${foco} sem ${entrada.componente}`).toContain(entrada.componente);
      expect(fonte, `${foco} sem snapshot próprio`).toContain(
        `@/generated/homepage/${entrada.snapshot}`,
      );
      for (const outro of componentes.filter((nome) => nome !== entrada.componente)) {
        expect(fonte, `${foco} importou o palco ${outro}`).not.toContain(outro);
      }
    }
  });

  it("a raiz não volta a decidir o foco por query ou dynamic import", () => {
    const fonte = ler("app", "page.tsx");
    expect(fonte).not.toContain("searchParams");
    expect(fonte).not.toContain("next/dynamic");
    expect(fonte).not.toContain("normalizarFocoHomepage");
  });

  it("o mapa das cinco rotas é bijetivo e aceita barra final", () => {
    expect(new Set(Object.values(ROTA_POR_FOCO)).size).toBe(FOCOS_HOMEPAGE.length);
    for (const foco of FOCOS_HOMEPAGE) {
      const rota = ROTA_POR_FOCO[foco];
      expect(focoDaRotaHomepage(rota)).toBe(foco);
      expect(focoDaRotaHomepage(rota === "/" ? rota : `${rota}/`)).toBe(foco);
    }
    expect(focoDaRotaHomepage("/ferramentas/calcular-preco")).toBeNull();
  });
});

describe("homepage: snapshots fiscais", () => {
  const snapshots = [descobrir, preco, recibos, empresa, salario];

  it("todos correspondem à release e à mesma revisão dos motores", () => {
    const hashes = new Set<string>();
    for (const snapshot of snapshots) {
      expect(snapshot._meta.schema).toBe(1);
      expect(snapshot._meta.appVersion).toBe(APP_VERSION);
      expect(snapshot._meta.fiscalYear).toBe(FISCAL_YEAR);
      expect(snapshot._meta.engineHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      hashes.add(snapshot._meta.engineHash);
    }
    expect(hashes.size).toBe(1);
  });

  it("resolve o prazo SS no calendário da visita, inclusive além do snapshot", () => {
    expect(
      resolverPrazoSSAtual(recibos.dados.prazosSS, new Date(2026, 0, 19, 12)),
    ).toEqual({ iso: "2026-01-20", rotulo: "20 de janeiro", dias: 1 });
    expect(
      resolverPrazoSSAtual(recibos.dados.prazosSS, new Date(2026, 0, 21, 12)),
    ).toEqual({ iso: "2026-02-20", rotulo: "20 de fevereiro", dias: 30 });
    expect(resolverPrazoSSAtual([], new Date(2034, 11, 21, 12))).toEqual({
      iso: "2035-01-20",
      rotulo: "20 de janeiro",
      dias: 30,
    });
  });
});

describe("homepage: compatibilidade e intenção", () => {
  it("redireciona URLs legados uma vez, remove só foco e preserva campanha", () => {
    for (const foco of FOCOS_HOMEPAGE) {
      const resposta = proxy(
        new NextRequest(`https://www.recibocerto.pt/?foco=${foco}&utm_source=teste`),
      );
      const destino = new URL(resposta.headers.get("location")!);
      expect(resposta.status).toBe(307);
      expect(destino.pathname).toBe(ROTA_POR_FOCO[foco]);
      expect(destino.searchParams.get("foco")).toBeNull();
      expect(destino.searchParams.get("utm_source")).toBe("teste");
    }
  });

  it("mantém instrumentação sem PII e o contrato de prefetch limitado", () => {
    expect(CATALOGO.focus_switch_ack.origem).toBe("cliente");
    expect(CATALOGO.focus_switch_ready.origem).toBe("cliente");

    const fonte = ler("components", "foco", "ControladorPrefetchFocos.tsx");
    expect(fonte).toContain("router.prefetch");
    expect(fonte).toContain("MAX_ESPECULATIVOS = 2");
    expect(fonte).toContain('effectiveType === "slow-2g"');
    expect(fonte).toContain('effectiveType === "2g"');
    expect(fonte).toContain("saveData");
    expect(fonte).toContain('item.origem !== "idle"');
    expect(fonte).toContain('marcar("rc:foco:controller-ready"');
    expect(fonte).toContain('marcar("rc:foco:pointerdown"');
    expect(fonte).toContain('marcar("rc:foco:ack-painted"');
    expect(fonte).toContain('marcar("rc:foco:content-commit"');
    expect(fonte).toContain('marcar("rc:foco:prefetch-end"');
    expect(fonte).toContain("`rc:foco:prefetch-ready:${foco}`");
    expect(fonte).toContain(
      'performance.clearMarks(`rc:foco:prefetch-ready:${item.foco}`)',
    );
    expect(fonte).toContain('marcar("rc:foco:navigation-start"');
    expect(fonte).toContain('marcar("rc:foco:rsc-end"');
    expect(fonte).toContain('document.addEventListener("keydown", aoTeclarFoco, true)');
    expect(fonte).toContain('marcar("rc:foco:keyboard-ready"');

    const ligacao = ler("components", "foco", "LinkFocoIntencao.tsx");
    expect(ligacao).toContain("`rc:foco:link-ready:${foco}`");
    expect(ligacao).toContain('evento.key === "Enter"');
    expect(ligacao).toContain("evento.preventDefault()");
    expect(ligacao).toContain('iniciar(foco, "teclado")');
    expect(ligacao).toContain("router.push(ROTA_POR_FOCO[foco], { scroll: false })");
    expect(fonte).toContain("performance.now() - navegacaoAtual.inicio < 1_000");
    expect(fonte).toContain("__rcNavegacaoPendente");
    expect(fonte).toContain("lerNavegacaoPendente()");
    expect(fonte).not.toContain("let navegacaoPendente");

    const regua = ler("components", "foco", "ReguaPerguntasHero.tsx");
    const bussola = ler("components", "foco", "HeroBussola.tsx");
    expect(regua).toContain("data-foco-destino={item.id}");
    expect(bussola).toContain("data-foco-destino={foco.id}");
  });

  it("não inicializa Supabase nem subscrição pesada para anónimo público", () => {
    const auth = ler("lib", "supabase", "auth.tsx");
    expect(auth).toContain("haEvidenciaDeSessao");
    expect(auth).toContain("rotaExigeAuth(pathname)");
    expect(auth).toContain("void ativarAuth()");

    const subscricao = ler("lib", "stripe", "subscription.tsx");
    expect(subscricao).toContain('lazy(() => import("./subscription-runtime"))');
    expect(subscricao).toContain("if (!user) return fallback");

    const layout = ler("app", "layout.tsx");
    expect(layout).not.toContain('from "@/components/ui/motion/MotionProvider"');
  });
});

describe("homepage: animação, dados de campo e budgets", () => {
  it("mantém um único relógio por palco e suspende trabalho invisível", () => {
    const frame = ler("components", "palco", "frame.ts");
    const palco = ler("components", "palco", "usePalco.ts");
    expect(frame.match(/requestAnimationFrame\(/g)).toHaveLength(1);
    expect(frame).toContain('document.addEventListener("visibilitychange"');
    expect(frame).toContain("new IntersectionObserver");
    expect(frame).toContain('no.toggleAttribute("data-palco-suspenso"');
    expect(frame).toContain('performance.mark("rc:foco:first-animation-frame"');
    expect(frame).toContain("ultimo.current === null ? 0");
    // Sair de um foco pára o relógio do palco que fica para trás, e faz-lo
    // sem passar por estado: um `setParado(true)` custava um render inteiro
    // dentro da janela da troca. Vive no relógio — e não no `usePalco` —
    // porque `PalcoDescobrir` e `HeroPreco` têm máquina própria e assim
    // ficavam de fora, que era o caso antes.
    expect(frame).toContain('window.addEventListener("rc:foco:navigation-start"');
    expect(frame).toContain("abandonado.current = true");
    expect(frame).toContain("!abandonado.current");
    expect(palco).not.toContain('window.addEventListener("rc:foco:navigation-start"');
    expect(palco).toContain("sessionStorage.getItem(chave)");
    expect(palco).toContain("sessionStorage.setItem(chave, \"1\")");
    expect(palco).toContain("autoplayIgnorado || !montado || feito(beat)");
  });

  it("não deixa nenhuma cena arrancar dentro da tarefa que faz o commit da troca", () => {
    const arranque = ler("components", "palco", "arranque.ts");
    // A terceira licença. Sem ela, numa troca o palco de destino monta já
    // dentro do ecrã e logo a seguir há um instante ocioso: as duas
    // primeiras licenças passam e a cena arranca em cima da montagem.
    expect(arranque).toContain('window.addEventListener("rc:foco:content-commit"');
    expect(arranque).toContain("__rcNavegacaoPendente");
    expect(arranque).toContain("LIMITE_TROCA_MS");
    expect(arranque).toContain("quandoATrocaAssentar");

    // Os dois palcos com máquina de estados própria — os de `/` e de
    // `/inicio/preco` — têm de passar pela mesma disciplina. Estavam de fora.
    for (const [pasta, ficheiro] of [
      ["descobrir", "PalcoDescobrir.tsx"],
      ["preco", "HeroPreco.tsx"],
    ] as const) {
      const fonte = ler("components", pasta, ficheiro);
      expect(fonte).toContain('from "@/components/palco/arranque"');
      expect(fonte).toContain("useArranque(palcoRef");
      expect(fonte).toContain("if (!podeArrancar) return;");
    }
  });

  it("não deixa o cabeçalho do palco mudar de tamanho a cada ato", () => {
    const legenda = ler("components", "palco", "legenda.tsx");
    // A legenda do ato quebra em duas linhas ou em uma conforme o texto, e
    // os controlos passam de um botão («Rever») para dois. As duas coisas
    // mudavam a altura do cabeçalho e faziam a página saltar 44 px a ~2,5 s
    // da carga: 0,08 de CLS contra um budget de 0,049. Reserva-se o pior
    // caso em vez de o adivinhar com um número.
    expect(legenda).toContain('aria-hidden className="invisible block"');
    expect(legenda).toContain("candidata.length > maior.length");

    for (const [pasta, ficheiro] of [
      ["palco", "MolduraPalco.tsx"],
      ["descobrir", "PalcoDescobrir.tsx"],
    ] as const) {
      const fonte = ler("components", pasta, ficheiro);
      expect(fonte).toContain("LegendaDoAto");
      expect(fonte).toContain("LEGENDAS_DE_ESTADO");
      // O lugar do botão de pausa fica quando a cena acaba; o botão é que sai.
      expect(fonte).toContain('className="invisible inline-flex min-h-[36px]');
      // «Rever» e «Recomeçar» ocupam o mesmo lugar.
      expect(fonte).toContain('<span aria-hidden className="invisible col-start-1 row-start-1">');
    }
  });

  it("não dá por preparada uma rota que a navegação anterior pode ter arrefecido", () => {
    const controlador = ler("components", "foco", "ControladorPrefetchFocos.tsx");
    // O agendador do Next descarta prefetches de ligações que saem do
    // viewport, e isso não passa por `onInvalidate`. Uma crença sem prazo
    // punha `preparado: true` na telemetria e mandava a troca pagar o RSC
    // inteiro — que em 4G estrangulado é a diferença medida em §3.3.
    expect(controlador).toContain("preparados.delete(foco)");
    expect(controlador).toContain("performance.clearMarks(`rc:foco:prefetch-ready:${foco}`)");
    expect(controlador).toContain("inicioPrefetch.current.clear()");
    expect(controlador).toContain('type ViaPreparacao = "rede" | "silencio"');
    expect(controlador).toContain("marcar(`rc:foco:prefetch-ready:${foco}`, { foco, via })");
  });

  it("mede long task e TBT contra o piso da própria corrida, e mantém a meta à vista", () => {
    const benchmark = readFileSync(
      join(process.cwd(), "scripts", "medir-desempenho.mjs"),
      "utf8",
    );
    const gate = readFileSync(
      join(process.cwd(), "scripts", "verificar-chunks-homepage.mjs"),
      "utf8",
    );
    // Os budgets absolutos estavam abaixo do custo do próprio framework:
    // `/termos`, sem palco nem corpo editorial, já faz 274 ms de long task
    // e 676 ms de TBT a 6× de CPU. O gate passa a medir a DIFERENÇA para
    // esse piso, medido na mesma corrida; a meta fica como aviso.
    expect(benchmark).toContain('const ROTA_PISO = "/termos"');
    expect(benchmark).toContain("MARGEM_SOBRE_PISO");
    expect(benchmark).toContain("META_ABSOLUTA");
    expect(benchmark).toContain('foco === "piso"');
    expect(benchmark).toContain("Acima da meta absoluta do relatório");

    // O pacote `noModule` são 110 KB que nenhum browser com módulos ES
    // pede. Contá-los no budget punha este gate a discordar do gate de
    // runtime, que mede o que o browser realmente descarregou.
    expect(gate).toContain("nomodule");
    expect(gate).toContain("legados.add(chunk)");
    expect(gate).toContain("jsLegado");
  });

  it("não deixa a homepage chamar a API durante a hidratação nem durante a troca", () => {
    const contador = ler("components", "ContadorVitalicio.tsx");
    // O cartão de planos está nas cinco leituras e vive muito abaixo da
    // dobra. Pedir à montagem punha um `fetch` dentro do pico de hidratação
    // de cada rota e dentro da tarefa que faz o commit de cada troca.
    expect(contador).toContain('usePerto<HTMLDivElement>("400px 0px")');
    expect(contador).toContain("if (!perto) return;");
    expect(contador).toContain("}, [perto]);");
  });

  it("mantém conteúdo editorial no servidor e adia layout abaixo da dobra", () => {
    const reveal = ler("components", "ui", "Reveal.tsx");
    const precos = ler("components", "Precos.tsx");
    const css = ler("app", "globals.css");

    expect(reveal).not.toContain('"use client"');
    expect(reveal).not.toContain("motion/react");
    expect(reveal).toContain("rc-view-reveal");
    expect(precos).not.toContain('"use client"');
    expect(precos).not.toContain("motion/react");
    expect(precos).toContain("rc-home-deferred--xlarge");
    expect(css).toContain("content-visibility: auto");
    expect(css).toContain("contain-intrinsic-size: auto var(--rc-home-intrinsic");
    expect(css).toContain("[data-homepage-foco] .rc-home-deferred");
    // A reserva tem de mudar com a largura: o mesmo texto numa coluna de
    // 390 px ocupa o dobro da altura que ocupa em três colunas. Um valor
    // único estava certo para desktop e curto para telemóvel, e como `auto`
    // só se lembra DEPOIS da primeira renderização, o erro aparecia na
    // troca fria — CLS 0,08 p50 contra um budget de 0,049.
    expect(css).toContain("@media (min-width: 640px)");
    expect(css).toContain("@media (min-width: 1024px)");
    for (const tipo of ["compact", "medium", "large", "xlarge"]) {
      const ocorrencias = css.split(`.rc-home-deferred--${tipo} {`).length - 1;
      expect(ocorrencias).toBeGreaterThanOrEqual(3);
    }
  });

  it("mantém os palcos leves sem perder transições, presença ou redução de movimento", () => {
    const palcos = [
      ["components", "descobrir", "PalcoDescobrir.tsx"],
      ["components", "descobrir", "LaboratorioDescobrir.tsx"],
      ["components", "preco", "HeroPreco.tsx"],
      ["components", "preco", "LaboratorioPreco.tsx"],
      ["components", "foco", "recibos", "PalcoRecibos.tsx"],
      ["components", "foco", "empresa", "PalcoEmpresa.tsx"],
      ["components", "foco", "salario", "PalcoSalario.tsx"],
    ];
    for (const caminho of palcos) {
      const fonte = ler(...caminho);
      expect(fonte, caminho.join("/")).not.toContain('from "motion/react"');
      expect(fonte, caminho.join("/")).toContain(
        "@/components/palco/motion-lite",
      );
    }

    const leve = ler("components", "palco", "motion-lite.tsx");
    expect(leve).toContain("style.transition = `all");
    expect(leve).toContain('mode !== "popLayout"');
    expect(leve).toContain('mode === "wait"');
    expect(leve).toContain("presenca.bloquearEntrada");
    expect(leve).toContain('matchMedia("(prefers-reduced-motion: reduce)")');

    const heroPreco = ler("components", "preco", "HeroPreco.tsx");
    const palcoPartilhado = ler("components", "simulador", "palco.tsx");
    expect(heroPreco).toContain("palco-controles");
    expect(palcoPartilhado).toContain('from "motion/react"');
  });

  // ┌─────────────────────────────────────────────────────────────────────┐
  // │ ISTO NÃO LÊ CÓDIGO-FONTE: CHAMA A FUNÇÃO                            │
  // │                                                                     │
  // │ O teste acima dava verde com `/inicio/preco` MORTA. `ease:          │
  // │ "easeInOut"` — um nome do Motion, não um valor CSS — chegava cru a  │
  // │ `Element.animate()`, que atira `TypeError`; atirado num efeito de   │
  // │ layout durante a hidratação, levava a rota inteira para o           │
  // │ `global-error`. Nenhuma asserção sobre o TEXTO do adaptador podia   │
  // │ ver isso, porque o defeito estava no VALOR que ele devolvia.        │
  // └─────────────────────────────────────────────────────────────────────┘
  it("traduz as curvas com nome do Motion para valores que o CSS aceita", () => {
    // `<easing-function>` do CSS: palavra-chave, `cubic-bezier()`,
    // `steps()` ou `linear()`. Mais nada. É o que `Element.animate()` e a
    // shorthand `transition` sabem ler.
    const ACEITE =
      /^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|cubic-bezier\(.+\)|steps\(.+\)|linear\(.+\))$/;

    const nomesDoMotion = [
      "linear",
      "easeIn",
      "easeOut",
      "easeInOut",
      "circIn",
      "circOut",
      "circInOut",
      "backIn",
      "backOut",
      "backInOut",
      "anticipate",
    ];
    for (const nome of nomesDoMotion) {
      expect(curvaCSS({ ease: nome }), nome).toMatch(ACEITE);
    }

    // O que já é CSS passa intacto; uma curva da marca sai como bézier.
    expect(curvaCSS({ ease: "ease-in-out" })).toBe("ease-in-out");
    expect(curvaCSS({ ease: [0.16, 1, 0.3, 1] })).toBe("cubic-bezier(0.16,1,0.3,1)");

    // E o que NÃO se sabe traduzir nunca chega cru ao browser — cai na
    // curva da marca em vez de derrubar a rota.
    for (const invalida of [
      "easeInOutQuint",
      "spring",
      "",
      "cubic-bezier(",
      "javascript:alert(1)",
    ]) {
      expect(curvaCSS({ ease: invalida }), invalida).toMatch(ACEITE);
    }
    expect(curvaCSS({ ease: (t: number) => t })).toMatch(ACEITE);
    expect(curvaCSS(undefined)).toMatch(ACEITE);
    expect(curvaCSS({ type: "spring", damping: 20 })).toMatch(ACEITE);
  });

  it("não deixa uma animação recusada pelo browser derrubar a rota", () => {
    const leve = ler("components", "palco", "motion-lite.tsx");
    // As duas chamadas ao WAAPI correm no commit da hidratação, acima de
    // qualquer limite de erro do palco. Passam pelo guarda, e o guarda
    // devolve `null` em vez de propagar.
    expect(leve).not.toMatch(/no\.current\.animate\(/);
    expect(leve.match(/animar\(no\.current,/g)).toHaveLength(2);
    expect(leve.match(/animacao\?\.cancel\(\)/g)).toHaveLength(2);
  });

  it("carrega a folha completa só por intenção e leva Motion no mesmo chunk", () => {
    const nav = ler("components", "Nav.tsx");
    const marca = ler("components", "ChromeMobileMarca.tsx");
    const fronteira = ler(
      "components",
      "navegacao",
      "MenuCompletoIntencao.tsx",
    );

    for (const fonte of [nav, marca]) {
      expect(fonte).toContain("dynamic(");
      expect(fonte).toContain('import("@/components/navegacao/MenuCompletoIntencao")');
      expect(fonte).toContain("prepararMenuCompleto");
      expect(fonte).not.toContain(
        'import MenuCompleto from "@/components/navegacao/MenuCompleto"',
      );
    }
    expect(fronteira).toContain("<MotionProvider>");
    expect(fronteira).toContain("<MenuCompleto {...props} />");
  });

  it("o postbuild mede scripts servidos e inspeciona o runtime de Motion", () => {
    const gate = ler("..", "scripts", "verificar-chunks-homepage.mjs");
    expect(gate).toContain("function chunksDoDocumento(html)");
    expect(gate).toContain("chunksDoDocumento(htmlTexto)");
    expect(gate).toContain("jsManifesto");
    expect(gate).toContain('"MotionConfigContext"');
    expect(gate).toContain('"PresenceContext"');
    expect(gate).toContain("chunksComRuntimeMotion(chunksTermos)");
  });

  it("protege a fronteira estrutural do layout raiz no prebuild", () => {
    const layout = ler("app", "layout.tsx");
    const gate = ler("..", "scripts", "verificar-layout-raiz.mjs");
    const pacote = ler("..", "package.json");

    expect(layout).not.toContain("motion/react");
    expect(layout).not.toContain("@supabase/supabase-js");
    expect(gate).toContain("PROVIDERS_PERMITIDOS");
    expect(gate).toContain("IMPORTS_PROIBIDOS");
    expect(pacote).toContain("node scripts/verificar-layout-raiz.mjs");
  });

  it("recupera saídas CSS sem reintroduzir Motion no chrome global", () => {
    const avisos = ler("components", "ui", "Avisos.tsx");
    const confirmar = ler("components", "ui", "Confirmar.tsx");
    const css = ler("app", "globals.css");

    expect(avisos).toContain("rc-aviso-saida");
    expect(avisos).toContain("aSair: true");
    expect(confirmar).toContain("rc-overlay-saida");
    expect(confirmar).toContain("rc-dialogo-saida");
    expect(css).toContain("@keyframes rc-aviso-saida");
    expect(css).toContain("@keyframes rc-dialogo-saida");
    expect(avisos).not.toContain("motion/react");
    expect(confirmar).not.toContain("motion/react");
  });

  it("só carrega Speed Insights após opt-in e não envia URL privada", () => {
    const medicao = ler("components", "Medicao.tsx");
    expect(medicao).toContain('import("@vercel/speed-insights/next")');
    expect(medicao).toContain("if (!estatisticaPermitida) return null");
    expect(medicao).toContain("lerConsentimento()?.estatistica !== true");
    expect(medicao).toContain("ROTAS_DE_CAMPO.has(url.pathname)");
    expect(medicao).toContain('url.search = ""');
    expect(medicao).toContain('url.hash = ""');
    expect(medicao).toContain("route: url.pathname");
    expect(CONSENT_VERSION).toBe(2);
  });

  it("protege a matriz real, a amostra e a dispersão no CI", () => {
    const benchmark = ler("..", "scripts", "medir-desempenho.mjs");
    const workflow = ler("..", ".github", "workflows", "testes-e-build.yml");
    const esperaDestino = benchmark.indexOf(
      'await principal.first().waitFor({ state: "visible"',
    );
    const exigeDestinoUnico = benchmark.indexOf(
      "if ((await principal.count()) !== 1)",
    );
    expect(benchmark).toContain("REPETICOES < 10");
    expect(benchmark).toContain("export const CONSENT_VERSION = (\\d+);");
    expect(benchmark).toContain("chromium, firefox, webkit");
    expect(esperaDestino).toBeGreaterThan(-1);
    expect(esperaDestino).toBeLessThan(exigeDestinoUnico);
    expect(benchmark).toContain("p50: arredondar(p50)");
    expect(benchmark).toContain("p75: arredondar(p75)");
    expect(benchmark).toContain("p95: arredondar(p95)");
    expect(benchmark).toContain("dispersao: arredondar(p95 - p50)");
    expect(benchmark).toContain("contexto.setOffline(true)");
    expect(benchmark).toContain('offline: repeticao === 0 && browserNome === "chromium"');
    expect(benchmark).not.toContain("pagina.waitForURL(destino");
    expect(benchmark).toContain("getEntriesByName(`rc:foco:link-ready:${destino}`)");
    expect(benchmark).toContain('getEntriesByName("rc:foco:keyboard-ready")');
    expect(benchmark).toContain("{ timeout: 6_000 }");
    expect(benchmark).toContain("`rc:foco:prefetch-ready:${foco}`");
    expect(benchmark).not.toContain("catch(() => pagina.waitForTimeout(2_500))");
    expect(benchmark).toContain('type: "long-animation-frame"');
    expect(benchmark).toContain('entrada.name.startsWith("rc:overlay:load:")');
    // «Preparado» promete que o DESTINO não custa rede — não que o browser
    // fique calado. Somar tudo num número fazia o gate falhar por causa da
    // especulação legítima da página de destino e do ícone, e convidava a
    // desligá-la para passar. O destino é uma exigência de zero; o resto é
    // um budget explícito, e uma chamada à nossa API durante a troca falha.
    expect(benchmark).toContain('modo === "preparado" && metricas.bytesDoDestino > 0');
    expect(benchmark).toContain("metricas.apiNaTroca.length > 0");
    expect(benchmark).toContain("bytesAlheios");
    expect(benchmark).toContain("validarMovimentoReduzido");
    expect(benchmark).toContain("validarCacheCDN");
    expect(workflow).toContain("homepage-performance:");
    expect(workflow).toContain("RC_REPETICOES: 10");
    expect(workflow).toContain("npx playwright install --with-deps ${{ matrix.browser }}");
    expect(workflow).toContain("npm run homepage:visual");
    expect(workflow).toContain("tests/visual/homepage");
  });

  it("define rollout 10 → 50 → 100 sem duplicar a homepage", () => {
    const rollout = ler("..", "docs", "rollout-homepage.md");
    expect(rollout).toContain("vercel rolling-release configure --enable");
    expect(rollout).toContain("--stage=10 --stage=50");
    expect(rollout).toContain("vercel rolling-release start");
    expect(rollout).toContain("vercel rolling-release complete");
    expect(rollout).toContain("vercel rolling-release abort");
    expect(rollout).not.toContain("NEXT_PUBLIC_HOME_FOCOS_V2=true");
  });

  it("mantém os E2E no contrato de consentimento em vigor", () => {
    for (const script of [
      "verificar-descobrir-negocio.mjs",
      "verificar-negocio-empresa.mjs",
    ]) {
      expect(ler("..", "scripts", script)).toContain(
        `versao: ${CONSENT_VERSION}`,
      );
    }
  });
});
