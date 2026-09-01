#!/usr/bin/env node
/**
 * A SEDE DE CADA UM DOS 308 CONCELHOS — o ponto que faltava
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE É PRECISO UM PONTO, E PORQUE É A SEDE                         │
 * │                                                                     │
 * │ «Onde vais operar» tinha cinco controlos e três deles não mudavam   │
 * │ nada. Medido no motor, com tudo o resto fixo:                        │
 * │                                                                     │
 * │   alcance   concelho = região = nacional (idênticos); só «online»   │
 * │             mudava alguma coisa — 1 valor em 4                       │
 * │   raio      10, 25, 40 e 80 km davam o mesmo resultado, exceto      │
 * │             10 km em território rural — 1 valor em 4                 │
 * │                                                                     │
 * │ A causa não era a interface: era o motor não ter geografia nenhuma  │
 * │ com que responder. Sabia a que REGIÃO pertence cada concelho e não  │
 * │ sabia ONDE ele fica. Sem coordenadas, um raio de 25 km não pode ser │
 * │ nada — nem sequer uma pergunta.                                      │
 * │                                                                     │
 * │ Escolhe-se a SEDE do concelho e não o centro geométrico. Quem       │
 * │ trabalha num concelho parte da vila, não do meio do polígono; e o   │
 * │ centro do polígono mente com clareza em casos reais — a relação     │
 * │ administrativa do Funchal inclui as Ilhas Selvagens, e o centro da  │
 * │ sua caixa envolvente cai 148 km a sul da cidade, no mar.            │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ── PORQUE DUAS FONTES E NÃO UMA ──────────────────────────────────────
 * Um ponto errado não dá erro: dá um raio que apanha os concelhos
 * errados e uma conta que parece boa. Por isso nenhum ponto entra sem
 * ser confirmado por uma leitura independente:
 *
 *   1. Nominatim (`featureType=settlement`) devolve a localidade-sede.
 *   2. Overpass devolve as relações administrativas de nível 7 — os
 *      concelhos — com a caixa envolvente de cada uma.
 *
 * O ponto de (1) só é aceite se cair DENTRO da caixa de (2) do mesmo
 * nome (ou, em segunda via, a menos de `TOLERANCIA_KM` do centro dela).
 * É isso que resolve os homónimos sem uma linha de exceção escrita à
 * mão: há duas Calhetas e duas Lagoas, e a caixa de cada uma só contém
 * a sua.
 *
 * Se faltar UM concelho, o ficheiro não é escrito. Meia geografia daria
 * raios que funcionam em parte do país e falham calados na outra.
 *
 * Uso:
 *   node scripts/gen-concelhos-geo.mjs           reescreve o instantâneo
 *   node scripts/gen-concelhos-geo.mjs --check   falha se divergir
 *
 * Fontes: OpenStreetMap, via Nominatim e Overpass. © contribuidores do
 * OpenStreetMap, ODbL 1.0 — https://www.openstreetmap.org/copyright
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const DESTINO = join(RAIZ, "src", "lib", "negocio", "market", "bulk", "dados", "concelhos-geo.json");
const CONCELHOS_TS = join(RAIZ, "src", "lib", "negocio", "market", "concelhos.ts");

const AGENTE = "Recibo Certo/1.0 (https://www.recibocerto.pt)";
/**
 * O Overpass público serve por slots e devolve 429/503 quando não há
 * nenhum livre. Não é falha da consulta — é fila. Tentam-se os espelhos
 * por ordem, com espera entre voltas.
 */
const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/**
 * Quão longe pode a sede ficar do centro da relação administrativa.
 *
 * Não é uma margem de erro: as duas leituras medem coisas diferentes e é
 * NORMAL diferirem — em Idanha-a-Nova, o maior concelho do país, a vila
 * fica 12 km do centro da caixa. Sessenta quilómetros chega para os
 * concelhos grandes do Alentejo e continua muito abaixo da distância
 * entre dois homónimos (Lagoa do Algarve e Lagoa dos Açores estão a
 * 1 500 km um do outro), que é o que isto tem de separar.
 */
const TOLERANCIA_KM = 60;

/**
 * Os nomes que o INE e o OpenStreetMap escrevem de maneira diferente.
 *
 * Uma tabela de UM: a Praia da Vitória é «Vila da Praia da Vitória» nos
 * códigos territoriais e «Praia da Vitória» no mapa. É a única em 308, e
 * fica escrita à vista em vez de ser resolvida por uma correspondência
 * aproximada — que resolveria esta e inventaria outras.
 */
const ALIAS_OSM = new Map([["Vila da Praia da Vitória", "Praia da Vitória"]]);

/** Pausa entre pedidos ao Nominatim — a política de uso pede 1/s. */
const INTERVALO_MS = 1100;

const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Os 308, lidos do ficheiro que já é gerado do INE ───────────────────

function lerConcelhos() {
  const fonte = readFileSync(CONCELHOS_TS, "utf8");
  const encontrados = [...fonte.matchAll(
    /\{ codigo: "([^"]+)", nome: "([^"]+)", regiao: "([^"]+)" \}/g,
  )].map(([, codigo, nome, regiao]) => ({ codigo, nome, regiao }));
  if (encontrados.length !== 308) {
    throw new Error(`Esperava 308 concelhos em concelhos.ts, li ${encontrados.length}.`);
  }
  return encontrados;
}

/** O nome sem o qualificador que o INE usa para desempatar homónimos. */
const nomeParaProcura = (nome) => nome.replace(/\s*\(R\.A\.[AM]\.\)\s*$/, "").trim();

const semAcentos = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

/** Distância em quilómetros entre dois pontos, pela fórmula do semiverseno. */
function haversineKm(a, b) {
  const R = 6371;
  const rad = (graus) => (graus * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ── Referência: as relações administrativas de nível 7 ─────────────────

const CONSULTA_OVERPASS = `[out:json][timeout:240];
area["ISO3166-1"="PT"][admin_level=2];
relation["admin_level"="7"]["boundary"="administrative"](area);
out tags bb;`;

/**
 * Os concelhos como o OpenStreetMap os tem, agrupados por nome.
 *
 * Vem mais do que 308: a consulta por área apanha municípios espanhóis
 * encostados à fronteira. Não se filtram aqui — ficam e nunca são
 * escolhidos, porque nenhum tem o nome de um concelho português.
 */
async function referenciaOverpass() {
  const consulta = `?data=${encodeURIComponent(CONSULTA_OVERPASS)}`;
  let ultimo = "";
  let elements = null;
  for (let volta = 0; volta < 3 && elements === null; volta += 1) {
    for (const servidor of OVERPASS) {
      try {
        const resposta = await fetch(servidor + consulta, { headers: { "User-Agent": AGENTE } });
        if (!resposta.ok) {
          ultimo = `${new URL(servidor).host} respondeu ${resposta.status}`;
          continue;
        }
        ({ elements } = await resposta.json());
        break;
      } catch (erro) {
        ultimo = `${new URL(servidor).host}: ${erro instanceof Error ? erro.message : String(erro)}`;
      }
    }
    if (elements === null && volta < 2) {
      process.stderr.write(`  ${ultimo} — nova tentativa daqui a 30 s…\n`);
      await espera(30_000);
    }
  }
  if (elements === null) throw new Error(`Overpass indisponível (${ultimo}).`);
  const porNome = new Map();
  for (const elemento of elements ?? []) {
    const nome = elemento?.tags?.name;
    const caixa = elemento?.bounds;
    if (!nome || !caixa) continue;
    const chave = semAcentos(nome);
    if (!porNome.has(chave)) porNome.set(chave, []);
    porNome.get(chave).push({
      minLat: caixa.minlat,
      maxLat: caixa.maxlat,
      minLng: caixa.minlon,
      maxLng: caixa.maxlon,
      lat: (caixa.minlat + caixa.maxlat) / 2,
      lng: (caixa.minlon + caixa.maxlon) / 2,
    });
  }
  return porNome;
}

// ── A sede, pelo Nominatim ─────────────────────────────────────────────

async function sedesCandidatas(nome) {
  const parametros = new URLSearchParams({
    q: nome,
    countrycodes: "pt",
    format: "jsonv2",
    limit: "10",
    featureType: "settlement",
    "accept-language": "pt-PT",
  });
  const resposta = await fetch(`${NOMINATIM}?${parametros}`, {
    headers: { "User-Agent": AGENTE, Accept: "application/json" },
  });
  if (!resposta.ok) throw new Error(`Nominatim respondeu ${resposta.status} para «${nome}».`);
  const dados = await resposta.json();
  return dados.map((item) => ({
    lat: Number.parseFloat(item.lat),
    lng: Number.parseFloat(item.lon),
    tipo: item.addresstype ?? "",
    nome: String(item.display_name ?? ""),
  }));
}

/**
 * A sede confirmada por duas leituras, ou nada.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE A CAIXA E NÃO A DISTÂNCIA AO CENTRO                           │
 * │                                                                     │
 * │ A primeira versão exigia que a localidade ficasse a menos de 60 km  │
 * │ do CENTRO da caixa envolvente. Falhou em dois casos, e um deles     │
 * │ explica a regra: a relação administrativa do Funchal inclui as      │
 * │ Ilhas Selvagens, 250 km a sul, e o centro da caixa cai no mar — a   │
 * │ 148 km da cidade. O ponto certo foi recusado por uma referência     │
 * │ errada.                                                              │
 * │                                                                     │
 * │ Estar DENTRO da caixa não sofre disso e continua a separar os       │
 * │ homónimos, que é o que isto tem de fazer: a caixa de Lagoa do       │
 * │ Algarve não contém Lagoa dos Açores, nem por perto. A distância ao  │
 * │ centro fica como segunda via, para uma localidade que caia          │
 * │ ligeiramente fora da caixa da sua própria relação.                   │
 * └─────────────────────────────────────────────────────────────────────┘
 */
function confirmar(candidatas, referencias) {
  let melhor = null;
  for (const candidata of candidatas) {
    if (!Number.isFinite(candidata.lat) || !Number.isFinite(candidata.lng)) continue;
    for (const referencia of referencias) {
      const dentro =
        candidata.lat >= referencia.minLat &&
        candidata.lat <= referencia.maxLat &&
        candidata.lng >= referencia.minLng &&
        candidata.lng <= referencia.maxLng;
      const distancia = haversineKm(candidata, referencia);
      if (!dentro && distancia > TOLERANCIA_KM) continue;
      // Dentro da caixa ganha sempre a uma que só passe pela distância.
      const nota = dentro ? distancia : distancia + 1e6;
      if (melhor === null || nota < melhor.nota) {
        melhor = { ponto: candidata, distancia, dentro, nota };
      }
    }
  }
  return melhor;
}

// ── O documento ────────────────────────────────────────────────────────

async function compor() {
  const concelhos = lerConcelhos();
  process.stderr.write("A ler as relações administrativas do OpenStreetMap…\n");
  const referencias = await referenciaOverpass();
  process.stderr.write(`  ${referencias.size} nomes distintos.\n`);

  const pontos = [];
  const semConfirmacao = [];
  let feitos = 0;

  for (const concelho of concelhos) {
    const procura = ALIAS_OSM.get(concelho.nome) ?? nomeParaProcura(concelho.nome);
    const candidatas = await sedesCandidatas(procura);
    const referenciasDoNome = referencias.get(semAcentos(procura)) ?? [];
    const confirmada = confirmar(candidatas, referenciasDoNome);

    if (!confirmada) {
      semConfirmacao.push(`${concelho.nome} (${concelho.codigo})`);
    } else {
      pontos.push({
        codigo: concelho.codigo,
        lat: Math.round(confirmada.ponto.lat * 1e5) / 1e5,
        lng: Math.round(confirmada.ponto.lng * 1e5) / 1e5,
      });
    }

    feitos += 1;
    if (feitos % 25 === 0) process.stderr.write(`  ${feitos}/308…\n`);
    await espera(INTERVALO_MS);
  }

  if (semConfirmacao.length > 0) {
    throw new Error(
      `${semConfirmacao.length} concelhos sem sede confirmada por duas fontes:\n  ` +
        `${semConfirmacao.join("\n  ")}\n` +
        "O ficheiro NÃO foi escrito: meia geografia daria raios certos em parte do país e errados na outra.",
    );
  }

  pontos.sort((esquerda, direita) => esquerda.codigo.localeCompare(direita.codigo));

  const documento = {
    schemaVersion: 1,
    id: "concelhos-geo",
    geradoEm: new Date().toISOString(),
    ponto: "sede",
    metodo:
      "Localidade-sede do Nominatim (featureType=settlement), aceite só quando cai dentro da " +
      "caixa envolvente da relação administrativa de nível 7 do mesmo nome (Overpass), ou a menos de " +
      `${TOLERANCIA_KM} km do centro dessa caixa.`,
    fonte: "OpenStreetMap — Nominatim e Overpass",
    licenca: "ODbL 1.0",
    licencaUrl: "https://www.openstreetmap.org/copyright",
    toleranciaKm: TOLERANCIA_KM,
    concelhos: pontos,
    contentHash: "",
  };

  // O hash cobre os dados e não o carimbo de quando o job correu — sem
  // isto, cada corrida escrevia um ficheiro novo só para dizer que a
  // geografia de Portugal continua no mesmo sítio.
  const semCarimbo = JSON.stringify(documento, (chave, valor) =>
    chave === "geradoEm" || chave === "contentHash" ? undefined : valor,
  );
  documento.contentHash = `sha256:${createHash("sha256").update(semCarimbo).digest("hex")}`;
  return documento;
}

const conferir = process.argv.includes("--check");

compor()
  .then((documento) => {
    const serializado = `${JSON.stringify(documento, null, 2)}\n`;
    if (conferir) {
      let atual;
      try {
        atual = JSON.parse(readFileSync(DESTINO, "utf8"));
      } catch {
        console.error("✗ concelhos-geo.json não existe. Corre `npm run concelhos:geo`.");
        process.exit(1);
      }
      if (atual.contentHash !== documento.contentHash) {
        console.error(
          `✗ concelhos-geo.json desatualizado.\n  no repositório: ${atual.contentHash}\n  no OSM agora:   ${documento.contentHash}`,
        );
        process.exit(1);
      }
      console.log(`✓ concelhos-geo.json em dia — ${documento.concelhos.length} sedes.`);
      return;
    }
    writeFileSync(DESTINO, serializado, "utf8");
    console.log(`✓ ${documento.concelhos.length} sedes escritas em concelhos-geo.json.`);
  })
  .catch((erro) => {
    console.error(`✗ ${erro.message}`);
    process.exit(1);
  });
