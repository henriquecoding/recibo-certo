"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ZONA DE RISCO — escolher exatamente o que sai, e o que fica
//  ---------------------------------------------------------------------
//  Antes eram seis botões fixos. Depois passou a ser o catálogo da nuvem,
//  com o número à frente de cada linha vindo do inventário. A auditoria de
//  02/09/2026 encontrou quatro coisas por corrigir, e as duas primeiras
//  são de perder dados:
//
//  1. APAGAR UMA COISA ESVAZIAVA O APARELHO INTEIRO. Qualquer apagamento
//     na nuvem chamava `esvaziarCofre`, que remove os dezoito domínios do
//     cofre. Escolher «Comentários que deixaste» levava à frente o estúdio
//     de negócio, os preços guardados, as hipóteses de mercado e o perfil
//     de descoberta — nada disso está na nuvem, nada disso tinha sido
//     escolhido — e a resposta dizia «1 registo apagado». Agora só sai o
//     domínio local que É a mesma coisa que o conjunto escolhido, e a
//     lista está em `DOMINIOS_POR_CONJUNTO`.
//
//  2. QUEM NÃO TEM CONTA NÃO VIA ZONA DE RISCO NENHUMA. O componente
//     começava por `if (!user) return null`. As calculadoras, o estúdio de
//     negócio e o motor de descoberta funcionam sem sessão, e é onde estão
//     os dados mais sensíveis que este produto guarda — e não havia por
//     onde os apagar. A secção do aparelho aparece sempre; a da nuvem e a
//     da conta só a quem tem sessão.
//
//  3. MOSTRAVA A TODA A GENTE O QUE SÓ VALE PARA CONTABILISTAS. «O que
//     fica, e porquê» listava «Progressão e comissão» e «Recebimentos e
//     conta Stripe» a quem nunca tinha sido contabilista. O campo `soSe`
//     existia no catálogo desde o início e não era lido por ninguém.
//
//  4. A FRASE DE CONFIRMAÇÃO MENTIA. Escolher uma coisa pedia para
//     escrever «apagar todos os dados». Passou a ser «apagar o que
//     escolhi», e a caixa mostra a lista do que vai sair — porque escrever
//     uma frase sem ver o que ela abrange não é confirmar.
//
//  A confirmação continua a ser escrita à mão, e o campo SÓ ACEITA a frase
//  pedida. Não é teatro: o que se pretende é que ninguém apague nada sem
//  ler, e ler é o que acontece quando se tem de copiar. A caixa «preencher
//  por mim» existe para quem já leu; fica desmarcada por omissão, porque a
//  omissão tem de ser a que obriga a parar.
//
//  Vermelho pastel e separada do resto: uma secção que apaga coisas não
//  pode parecer-se com uma que as guarda.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/client";
import { Warning, Check, Spinner, Trash, Download, Laptop, Cloud } from "@/components/ui/Icons";
import { confirmacaoValida, recortarAoPrefixo, alvoPorId, type DefinicaoAlvo } from "@/lib/conta/apagar";
import { CONJUNTOS, GRUPOS, type Conjunto } from "@/lib/conta/catalogo";
import {
  CONJUNTOS_LOCAIS, GRUPOS_LOCAIS, contarLocal, apagarDominiosLocais,
  dominiosDosConjuntos, type ConjuntoLocal,
} from "@/lib/conta/catalogo-local";
import { chaveNoCofre, DOMINIOS, type Dominio } from "@/lib/store/cofre";
import { lerChave } from "@/lib/store/persistencia";

type Estado =
  | { tipo: "parado" }
  | { tipo: "a-apagar" }
  | { tipo: "feito"; resumo: string }
  | { tipo: "erro"; msg: string };

/** O inventário do aparelho: quantos registos por domínio, ou `null`. */
type InventarioLocal = Partial<Record<Dominio, number | null>>;

const ALVO_SELECAO = alvoPorId("selecao")!;
const ALVO_CONTA = alvoPorId("conta")!;

export default function ZonaDeRisco() {
  const { user, carregado, sair } = useAuth();
  const [inventario, setInventario] = useState<Record<string, number> | null>(null);
  const [inventarioFalhou, setInventarioFalhou] = useState(false);
  const [local, setLocal] = useState<InventarioLocal | null>(null);
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [escolhidosLocais, setEscolhidosLocais] = useState<Set<Dominio>>(new Set());
  const [aConfirmar, setAConfirmar] = useState<"conjuntos" | "conta" | null>(null);
  const [texto, setTexto] = useState("");
  const [auto, setAuto] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });
  const [aExportar, setAExportar] = useState(false);

  /**
   * Já montou neste browser?
   *
   * ⚠️ NÃO trocar por `carregado` do `useAuth`. Isto foi um `if (!carregado)
   * return null`, e dava erro de hidratação #418 nesta página: `carregado`
   * vive num provider que hidrata ANTES desta secção, e com hidratação
   * seletiva já era `true` quando o React chegou aqui — o servidor tinha
   * escrito nada, o cliente escrevia a secção inteira, e a árvore era
   * deitada fora e refeita. Uma flag do próprio componente não pode
   * divergir: o efeito que a liga só corre depois de este nó montar.
   */
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);

  // ── O inventário da nuvem ────────────────────────────────────────
  // Sem ele a lista aparece na mesma, mas sem os números — e passa a
  // dizê-lo, em vez de fingir que os leu. Antes, uma falha de rede era
  // indistinguível de «não tens nada».
  useEffect(() => {
    if (!user) return;
    let vivo = true;
    (async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        const token = data.session?.access_token;
        if (!token) { if (vivo) setInventarioFalhou(true); return; }
        const res = await fetch("/api/conta/apagar", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json()) as { inventario?: Record<string, number> };
        if (!vivo) return;
        if (json.inventario) setInventario(json.inventario);
        else setInventarioFalhou(true);
      } catch {
        if (vivo) setInventarioFalhou(true);
      }
    })();
    return () => { vivo = false; };
  }, [user]);

  // ── O inventário do aparelho ─────────────────────────────────────
  // Só depois de montar: `localStorage` não existe no servidor, e um
  // número diferente entre o HTML e o cliente parte a hidratação.
  const relerLocal = useCallback(() => {
    const r: InventarioLocal = {};
    for (const c of CONJUNTOS_LOCAIS) r[c.id] = contarLocal(c, user?.id);
    setLocal(r);
  }, [user]);

  useEffect(() => { relerLocal(); }, [relerLocal]);

  // ── Que papéis é que esta pessoa tem ─────────────────────────────
  //
  // `soSe` estava no catálogo e ninguém o lia. Deduz-se do inventário e
  // não de uma pergunta a mais: se nenhum conjunto de um papel tem nada,
  // a pessoa não tem esse papel e as linhas dele não lhe dizem respeito.
  const papeis = useMemo(() => {
    const tem = (papel: NonNullable<Conjunto["soSe"]>) =>
      CONJUNTOS.some((c) => c.soSe === papel && (inventario?.[c.id] ?? 0) > 0);
    return {
      contabilista: tem("contabilista"),
      "cliente-de-contabilista": tem("cliente-de-contabilista"),
    } as Record<NonNullable<Conjunto["soSe"]>, boolean>;
  }, [inventario]);

  /** Uma linha só aparece a quem ela pode dizer respeito. */
  const doPapel = useCallback(
    (c: Conjunto) => !c.soSe || papeis[c.soSe] || (inventario?.[c.id] ?? 0) > 0,
    [papeis, inventario],
  );

  const temAlgo = useCallback(
    (c: Conjunto) => inventario === null || (inventario[c.id] ?? 0) > 0,
    [inventario],
  );

  /** Os grupos com alguma coisa dentro. Um grupo vazio não se mostra. */
  const grupos = useMemo(
    () =>
      GRUPOS.map((g) => ({
        ...g,
        conjuntos: CONJUNTOS.filter((c) => c.grupo === g.id && !c.retido && doPapel(c)),
      })).filter((g) => g.conjuntos.some(temAlgo)),
    [temAlgo, doPapel],
  );

  /**
   * O que não se apaga a pedido — e só a quem o tem mesmo.
   *
   * Era `CONJUNTOS.filter(c => c.retido)`, sem filtro nenhum: uma pessoa
   * com dois recibos e um comentário lia que os recebimentos dela em
   * Stripe ficavam retidos por lei. Nunca tinha havido recebimento nenhum.
   */
  const retidos = useMemo(
    () => CONJUNTOS.filter((c) => c.retido && (inventario?.[c.id] ?? 0) > 0),
    [inventario],
  );

  const gruposLocais = useMemo(
    () =>
      GRUPOS_LOCAIS.map((g) => ({
        ...g,
        conjuntos: CONJUNTOS_LOCAIS.filter(
          (c) => c.grupo === g.id && (local === null || local[c.id] !== 0),
        ),
      })).filter((g) => g.conjuntos.length > 0),
    [local],
  );

  const temLocal = useMemo(
    () => gruposLocais.some((g) => g.conjuntos.length > 0),
    [gruposLocais],
  );

  const alternar = useCallback((id: string) => {
    setEscolhidos((antes) => {
      const novo = new Set(antes);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  }, []);

  const alternarLocal = useCallback((id: Dominio) => {
    setEscolhidosLocais((antes) => {
      const novo = new Set(antes);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  }, []);

  const fechar = useCallback(() => {
    setAConfirmar(null);
    setTexto("");
    setAuto(false);
  }, []);

  const limpar = useCallback(() => {
    setEscolhidos(new Set());
    setEscolhidosLocais(new Set());
  }, []);

  // ── Descarregar antes de apagar ──────────────────────────────────
  // A frase «exporta antes o que quiseres guardar» está no topo desta
  // secção desde que ela existe, e não havia para onde exportar.
  const descarregarLocal = useCallback(() => {
    const dados: Record<string, unknown> = {};
    for (const c of CONJUNTOS_LOCAIS) {
      const bruto = lerChave(chaveNoCofre(c.id, user?.id)) ?? lerChave(DOMINIOS[c.id]);
      if (bruto === null) continue;
      try { dados[c.id] = JSON.parse(bruto) as unknown; }
      // Guardado à mesma, em bruto: um dado que não se lê é um dado que a
      // pessoa tem na mesma, e um export que o cala é um export que mente.
      catch { dados[c.id] = bruto; }
    }
    baixar(
      `recibo-certo-neste-dispositivo-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(
        {
          formato: "recibo-certo/dados-do-dispositivo",
          versaoFormato: 1,
          geradoEm: new Date().toISOString(),
          aviso: "Isto é o que está guardado neste browser. Não passou por servidor nenhum para ser gerado.",
          dados,
        },
        null,
        2,
      ),
    );
  }, [user]);

  const descarregarNuvem = useCallback(async () => {
    setAExportar(true);
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setEstado({ tipo: "erro", msg: "A sessão expirou. Entra outra vez." });
        return;
      }
      const res = await fetch("/api/conta/exportar", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setEstado({ tipo: "erro", msg: "Não foi possível preparar o ficheiro. Tenta daqui a pouco." });
        return;
      }
      baixar(
        `recibo-certo-os-meus-dados-${new Date().toISOString().slice(0, 10)}.json`,
        await res.text(),
      );
    } catch {
      setEstado({ tipo: "erro", msg: "Não foi possível contactar o servidor." });
    } finally {
      setAExportar(false);
    }
  }, []);

  // ── Apagar ───────────────────────────────────────────────────────
  const apagar = useCallback(
    async (modo: "conjuntos" | "conta") => {
      setEstado({ tipo: "a-apagar" });
      const ids = modo === "conta" ? [] : [...escolhidos];
      const locais = modo === "conta"
        ? CONJUNTOS_LOCAIS.map((c) => c.id)
        : [...new Set([...escolhidosLocais, ...dominiosDosConjuntos(ids)])];

      // Sem nada na nuvem, isto é só o aparelho — e o aparelho não precisa
      // de rede, de sessão nem de servidor para ser limpo.
      if (modo === "conjuntos" && ids.length === 0) {
        apagarDominiosLocais(locais, user?.id);
        setEstado({
          tipo: "feito",
          resumo: locais.length === 1
            ? "Apagado deste dispositivo."
            : `${locais.length} conjuntos apagados deste dispositivo.`,
        });
        fechar();
        limpar();
        setTimeout(() => window.location.reload(), 1600);
        return;
      }

      try {
        const { data } = await getSupabase().auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setEstado({ tipo: "erro", msg: "A sessão expirou. Entra outra vez." });
          return;
        }
        const res = await fetch("/api/conta/apagar", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(
            modo === "conta"
              ? { alvo: "conta", confirmacao: texto }
              : { conjuntos: ids, confirmacao: texto },
          ),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setEstado({ tipo: "erro", msg: json?.erro ?? "Não foi possível apagar." });
          return;
        }

        if (modo === "conta") {
          // A conta sai: aqui, sim, o cofre inteiro vai atrás dela.
          apagarDominiosLocais(CONJUNTOS_LOCAIS.map((c) => c.id), user?.id);
          await sair();
          window.location.href = "/";
          return;
        }

        // ⚠️ SÓ os domínios que correspondem ao que foi escolhido. Isto era
        // `esvaziarCofre`, e levava tudo.
        apagarDominiosLocais(locais, user?.id);

        // O número de linhas, e não «feito»: quem apaga quer saber quanto.
        const linhas = Object.values((json?.linhas ?? {}) as Record<string, number>)
          .reduce((a, b) => a + b, 0);
        setEstado({
          tipo: "feito",
          resumo: linhas === 1 ? "Um registo apagado." : `${linhas} registos apagados.`,
        });
        fechar();
        limpar();
        // O resto da aplicação lê estes dados em memória; recarregar é a
        // forma honesta de garantir que ninguém fica a ver o que já não há.
        setTimeout(() => window.location.reload(), 1600);
      } catch {
        setEstado({ tipo: "erro", msg: "Não foi possível contactar o servidor." });
      }
    },
    [escolhidos, escolhidosLocais, texto, fechar, limpar, sair, user],
  );

  // Nada do que vem a seguir se pode decidir no servidor: a lista do
  // aparelho lê o `localStorage` e a da nuvem depende de quem está com
  // sessão. Até montar, esta secção é só a moldura — que é exatamente o
  // que o servidor escreveu.
  const visivel = montado && carregado;

  const alvo: DefinicaoAlvo = aConfirmar === "conta" ? ALVO_CONTA : ALVO_SELECAO;
  const pronto = confirmacaoValida(alvo, texto);
  const nEscolhidos = escolhidos.size + escolhidosLocais.size;

  /** O que vai sair, por extenso. Confirmar sem ver a lista não é confirmar. */
  const aSair = [
    ...[...escolhidos].map((id) => CONJUNTOS.find((c) => c.id === id)?.titulo ?? id),
    ...[...escolhidosLocais].map(
      (id) => `${CONJUNTOS_LOCAIS.find((c) => c.id === id)?.titulo ?? id} (neste dispositivo)`,
    ),
  ];

  return (
    <section
      aria-labelledby="zona-risco"
      // ┌───────────────────────────────────────────────────────────────┐
      // │ A ÚNICA SUPERFÍCIE ESCURA FORA DA ESCALA — e a legenda pagava  │
      // │                                                               │
      // │ `dark:bg-clay-bg/20` dava #43423D: um cartão bem mais claro    │
      // │ do que o #292524 contra o qual TODA a escala de cinzentos foi  │
      // │ calibrada (ver o bloco do `.dark .text-stone-400` em           │
      // │ globals.css). A legenda `text-stone-500` caía a 4,12:1 — e a   │
      // │ `dark:text-stone-400` que a acompanha, se algum dia ganhasse a │
      // │ especificidade, daria 3,23:1.                                  │
      // │                                                               │
      // │ Era esta a única `dark:bg-clay-bg/*` do projeto, contra 783    │
      // │ usos do par `text-stone-500 dark:text-stone-400`: o desvio     │
      // │ estava na superfície, não no texto. A 0,08 a superfície volta  │
      // │ a #282924 — dentro da escala — e passa a 5,97:1 com o tom que  │
      // │ de facto pinta e 4,68:1 com o outro. O calor da argila         │
      // │ mantém-se; o modo claro (`/40`) não é tocado.                  │
      // └───────────────────────────────────────────────────────────────┘
      className="mt-6 overflow-hidden rounded-4xl border border-clay-border bg-clay-bg/40 dark:bg-clay-bg/[0.08]"
    >
      <div className="border-b border-clay-border px-5 py-4 sm:px-6">
        <h2 id="zona-risco" className="flex items-center gap-2 text-sm font-bold text-clay-text">
          <Warning size={15} /> Zona de risco
        </h2>
        {/* Sem `/80`: o `clay-text` está calibrado para dar EXATAMENTE o
            mínimo AA sobre esta superfície (4,75:1). Diluí-lo a 80 % baixa-o
            para 3,30:1 — a opacidade não é decoração quando o token já está
            no limite. O peso visual vem do tamanho e do `font-bold` do h2. */}
        <p className="mt-1 text-xs leading-relaxed text-clay-text">
          Escolhe exatamente o que queres apagar. Tudo o que está aqui é imediato e não tem forma
          de voltar atrás — descarrega antes o que quiseres guardar.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {visivel && temLocal ? (
            <button
              type="button"
              onClick={descarregarLocal}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-clay-border bg-white px-3 py-2 text-xs font-semibold text-clay-text transition-colors hover:bg-clay-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-text dark:bg-stone-900"
            >
              <Download size={13} /> Descarregar o deste dispositivo
            </button>
          ) : null}
          {visivel && user ? (
            <button
              type="button"
              onClick={descarregarNuvem}
              disabled={aExportar}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-clay-border bg-white px-3 py-2 text-xs font-semibold text-clay-text transition-colors hover:bg-clay-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-text disabled:opacity-50 dark:bg-stone-900"
            >
              {aExportar ? <Spinner size={13} /> : <Download size={13} />}
              {aExportar ? "A preparar…" : "Descarregar o da minha conta"}
            </button>
          ) : null}
        </div>
      </div>

      {!visivel ? (
        <p className="px-5 py-6 text-xs leading-relaxed text-stone-500 sm:px-6 dark:text-stone-400">
          A ver o que tens guardado…
        </p>
      ) : (
      <>
      {estado.tipo === "feito" ? (
        <p role="status" className="mx-5 mt-4 flex items-center gap-2 rounded-2xl bg-brand-light px-4 py-2.5 text-xs font-semibold text-brand-dark sm:mx-6">
          <Check size={13} /> {estado.resumo}
        </p>
      ) : null}
      {estado.tipo === "erro" ? (
        <p role="alert" className="mx-5 mt-4 flex items-start gap-2 rounded-2xl bg-alert-bg px-4 py-2.5 text-xs leading-relaxed text-alert-text sm:mx-6">
          <Warning size={13} className="mt-0.5 flex-shrink-0" /> {estado.msg}
        </p>
      ) : null}

      {/* ── O aparelho. Primeiro, porque é o que existe para toda a gente
             e o único que existe para quem não tem conta. ────────────── */}
      <div className="divide-y divide-clay-border/60">
        <div className="px-5 py-4 sm:px-6">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-clay-text">
            <Laptop size={13} /> Neste dispositivo
          </h3>
          <p className="texto-mini mt-0.5 text-stone-500 dark:text-stone-400">
            O que nunca saiu daqui. Não passa por servidor nenhum, e apagá-lo não precisa de
            sessão iniciada.
          </p>

          {!temLocal ? (
            <p className="mt-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Não há nada guardado neste dispositivo.
            </p>
          ) : (
            gruposLocais.map((g) => (
              <fieldset key={g.id} className="mt-4">
                <legend className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                  {g.titulo}
                </legend>
                <p className="texto-mini mt-0.5 text-stone-500 dark:text-stone-400">{g.descricao}</p>
                <ul className="mt-2 space-y-1">
                  {g.conjuntos.map((c) => (
                    <Linha
                      key={c.id}
                      titulo={c.titulo}
                      descricao={c.descricao}
                      quantos={local?.[c.id]}
                      unico={c.contar === "presenca"}
                      marcado={escolhidosLocais.has(c.id)}
                      aoAlternar={() => alternarLocal(c.id)}
                    />
                  ))}
                </ul>
              </fieldset>
            ))
          )}
        </div>

        {/* ── A nuvem ────────────────────────────────────────────────── */}
        {user ? (
          <>
            {inventarioFalhou ? (
              <p className="px-5 py-4 text-xs leading-relaxed text-stone-500 sm:px-6 dark:text-stone-400">
                Não foi possível ler o que tens guardado na conta. A lista abaixo mostra tudo o que
                pode existir, sem os números — nada foi apagado, e podes tentar outra vez a
                recarregar a página.
              </p>
            ) : null}

            {grupos.length === 0 && inventario !== null ? (
              <p className="px-5 py-4 text-xs leading-relaxed text-stone-500 sm:px-6 dark:text-stone-400">
                Não tens nada guardado na tua conta. O que houver está só neste dispositivo.
              </p>
            ) : null}

            {grupos.map((g) => (
              <fieldset key={g.id} className="px-5 py-4 sm:px-6">
                <legend className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-clay-text">
                  <Cloud size={13} /> {g.titulo}
                </legend>
                <p className="texto-mini mt-0.5 text-stone-500 dark:text-stone-400">{g.descricao}</p>

                <ul className="mt-3 space-y-1">
                  {g.conjuntos.map((c) => {
                    const quantos = inventario?.[c.id];
                    // ⚠️ O inventário devolve uma chave por conjunto que a
                    // base de dados sabe apagar. Uma chave em falta não é
                    // «tens zero» — é «este servidor ainda não conhece
                    // isto», e acontece na janela entre publicar a
                    // aplicação e aplicar a migração. Deixar escolher aqui
                    // era prometer um apagamento que não ia acontecer, que
                    // é exatamente o defeito que esta entrega corrige.
                    const conhecido = inventario === null || quantos !== undefined;
                    return (
                      <Linha
                        key={c.id}
                        titulo={c.titulo}
                        descricao={c.descricao}
                        quantos={quantos}
                        indisponivel={!conhecido}
                        marcado={escolhidos.has(c.id)}
                        aoAlternar={() => alternar(c.id)}
                      />
                    );
                  })}
                </ul>
              </fieldset>
            ))}
          </>
        ) : (
          <p className="px-5 py-4 text-xs leading-relaxed text-stone-500 sm:px-6 dark:text-stone-400">
            Não tens sessão iniciada, por isso não há nada teu na nuvem para apagar aqui — só o
            que está neste dispositivo, em cima.
          </p>
        )}
      </div>

      {/* O que não se apaga a pedido, e porquê. Dizê-lo é parte de ser
          honesto — mas só a quem isto diz respeito. */}
      {retidos.length > 0 ? (
        <div className="border-t border-clay-border/60 px-5 py-4 sm:px-6">
          <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            O que fica, e porquê
          </h3>
          <ul className="mt-2 space-y-1.5">
            {retidos.map((c) => (
              <li key={c.id} className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                <strong className="font-semibold text-stone-700 dark:text-stone-300">{c.titulo}</strong>
                {" — "}{c.retido}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Apagar o escolhido */}
      <div className="border-t border-clay-border bg-white/60 px-5 py-4 sm:px-6 dark:bg-stone-900/40">
        {aConfirmar === "conjuntos" ? (
          <Confirmacao
            alvo={ALVO_SELECAO}
            aSair={aSair}
            texto={texto}
            setTexto={setTexto}
            auto={auto}
            setAuto={setAuto}
            pronto={pronto}
            aApagar={estado.tipo === "a-apagar"}
            onCancelar={fechar}
            onApagar={() => apagar("conjuntos")}
            acao={`Apagar ${nEscolhidos === 1 ? "1 conjunto" : `${nEscolhidos} conjuntos`}`}
          />
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={nEscolhidos === 0}
              onClick={() => { setAConfirmar("conjuntos"); setTexto(""); setAuto(false); setEstado({ tipo: "parado" }); }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-clay-text px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              <Trash size={14} />
              {nEscolhidos === 0
                ? "Escolhe o que apagar"
                : `Apagar ${nEscolhidos === 1 ? "1 conjunto" : `${nEscolhidos} conjuntos`}`}
            </button>
            {nEscolhidos > 0 ? (
              <button
                type="button"
                onClick={limpar}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-stone-500 underline-offset-2 transition-colors hover:text-stone-800 hover:underline dark:text-stone-400 dark:hover:text-stone-100"
              >
                Limpar a seleção
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* A conta. Outra ordem de grandeza, e por isso outro sítio. */}
      {user ? (
        <div className="border-t-2 border-clay-border px-5 py-4 sm:px-6">
          <h3 className="text-sm font-semibold text-clay-text">Apagar a conta definitivamente</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
            Apaga tudo o que está em cima — na conta e neste dispositivo —, os ficheiros que
            enviaste e a própria conta. Cancelamos a subscrição por ti: não continuas a ser
            cobrado. Perdes o acesso imediatamente e não há forma de reverter.
          </p>

          {aConfirmar === "conta" ? (
            <div className="mt-3">
              <Confirmacao
                alvo={ALVO_CONTA}
                aSair={[]}
                texto={texto}
                setTexto={setTexto}
                auto={auto}
                setAuto={setAuto}
                pronto={pronto}
                aApagar={estado.tipo === "a-apagar"}
                onCancelar={fechar}
                onApagar={() => apagar("conta")}
                acao="Apagar a conta"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setAConfirmar("conta"); setTexto(""); setAuto(false); setEstado({ tipo: "parado" }); }}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-clay-border bg-white px-5 py-3 text-sm font-semibold text-clay-text transition-colors hover:bg-clay-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-text sm:w-auto dark:bg-stone-900"
            >
              <Trash size={14} /> Apagar a conta
            </button>
          )}
        </div>
      ) : null}
      </>
      )}
    </section>
  );
}

/**
 * Uma linha da lista.
 *
 * O alvo de toque é a etiqueta inteira e não a caixa de 16px: a 360px, uma
 * caixa de 16px é um alvo que se falha. `py-2.5` mais o corpo do texto dá
 * mais de 44px de altura em qualquer dos casos.
 */
function Linha(p: {
  titulo: string;
  descricao: string;
  quantos: number | null | undefined;
  /** Domínios de presença contam-se em «guardado», não em registos. */
  unico?: boolean;
  /** O servidor não conhece este conjunto — não se promete apagá-lo. */
  indisponivel?: boolean;
  marcado: boolean;
  aoAlternar: () => void;
}) {
  const contagem = p.indisponivel
    ? "indisponível de momento"
    : p.quantos === undefined ? null
    : p.quantos === null ? "não se consegue ler"
    : p.unico ? "guardado"
    : p.quantos === 1 ? "1 registo"
    : `${p.quantos} registos`;

  return (
    <li>
      <label
        className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
          p.indisponivel
            ? "opacity-50"
            : "cursor-pointer hover:bg-white/70 dark:hover:bg-stone-900/50"
        }`}
      >
        <input
          type="checkbox"
          disabled={p.indisponivel}
          checked={p.marcado}
          onChange={p.aoAlternar}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-stone-300 text-clay-text focus:ring-clay-text disabled:cursor-not-allowed"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {p.titulo}
            </span>
            {contagem ? (
              <span className="texto-mini tabular-nums text-stone-500 dark:text-stone-400">
                {contagem}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {p.descricao}
            {p.indisponivel ? (
              <>
                {" "}
                <strong className="font-semibold text-clay-text">
                  Ainda não dá para apagar isto por aqui — e preferimos dizê-lo a fingir que
                  apagámos.
                </strong>
              </>
            ) : null}
          </span>
        </span>
      </label>
    </li>
  );
}

function Confirmacao(p: {
  alvo: DefinicaoAlvo;
  /** O que vai sair, por extenso. Vazio quando é a conta inteira. */
  aSair: string[];
  texto: string;
  setTexto: (s: string) => void;
  auto: boolean;
  setAuto: (b: boolean) => void;
  pronto: boolean;
  aApagar: boolean;
  acao: string;
  onCancelar: () => void;
  onApagar: () => void;
}) {
  return (
    <div className="rounded-2xl border border-clay-border bg-white p-4 dark:bg-stone-900">
      {/* Escrever a frase sem ver o que ela abrange não é confirmar. */}
      {p.aSair.length > 0 ? (
        <>
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
            Vai sair {p.aSair.length === 1 ? "isto" : "isto tudo"}:
          </p>
          <ul className="mt-1.5 space-y-0.5 border-l-2 border-clay-border pl-3">
            {p.aSair.map((t) => (
              <li key={t} className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                {t}
              </li>
            ))}
          </ul>
          <hr className="my-3 border-stone-100 dark:border-stone-800" />
        </>
      ) : null}

      <label
        htmlFor={`conf-${p.alvo.id}`}
        className="block text-xs leading-relaxed text-stone-600 dark:text-stone-300"
      >
        Para confirmar, escreve{" "}
        <strong className="select-all font-mono text-clay-text">{p.alvo.confirmacao}</strong>
      </label>

      <input
        id={`conf-${p.alvo.id}`}
        type="text"
        value={p.texto}
        autoComplete="off"
        spellCheck={false}
        placeholder={p.alvo.confirmacao}
        aria-describedby={`ajuda-${p.alvo.id}`}
        // Só entra o que corresponde à frase. Uma tecla errada não produz
        // erro nenhum — simplesmente não entra.
        onChange={(e) => p.setTexto(recortarAoPrefixo(p.alvo, e.target.value))}
        // Enter confirma quando a frase está completa. Sem isto, a única
        // forma de acabar era largar o teclado e ir procurar o botão.
        onKeyDown={(e) => {
          if (e.key === "Enter" && p.pronto && !p.aApagar) { e.preventDefault(); p.onApagar(); }
        }}
        className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[16px] text-stone-800 placeholder:text-stone-300 focus:border-clay-text focus:outline-none focus:ring-2 focus:ring-clay-text/25 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      />
      <p id={`ajuda-${p.alvo.id}`} className="texto-mini mt-1.5 text-stone-500 dark:text-stone-400">
        O campo só aceita esta frase — não é possível escrever outra coisa.
      </p>

      <label className="mt-3 flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={p.auto}
          onChange={(e) => {
            p.setAuto(e.target.checked);
            p.setTexto(e.target.checked ? p.alvo.confirmacao : "");
          }}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-stone-300 text-clay-text focus:ring-clay-text"
        />
        <span className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          Preencher a confirmação por mim — já li o que vai ser apagado.
        </span>
      </label>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!p.pronto || p.aApagar}
          onClick={p.onApagar}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-clay-text px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {p.aApagar ? <><Spinner size={14} /> A apagar…</> : <><Trash size={14} /> {p.acao}</>}
        </button>
        <button
          type="button"
          onClick={p.onCancelar}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/** Um ficheiro para o disco, sem passar por servidor nenhum. */
function baixar(nome: string, conteudo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  // Sem isto, o Blob fica em memória até a página sair.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
