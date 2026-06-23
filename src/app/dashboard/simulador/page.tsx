"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { m, AnimatePresence } from "motion/react";
import { simularDeclaracaoIRS } from "@/lib/fiscal";
import {
  MODULOS,
  moduloMeta,
  construirDeclaracaoInput,
  validarDeclaracao,
  calcularCompletude,
  ganhoImobiliario,
  resumoMobiliario,
  resumoCripto,
  diasDetencao,
  coeficienteDesvalorizacao,
  resumoEstrangeiros,
  entradaEstrangeiroVazia,
  resumoPrediais,
  propriedadeVazia,
  dependenteVazio,
  ascendenteVazio,
  validarNIF,
  idadeNoAnoFiscal,
  dependenteAte3,
  TIPOS_RENDIMENTO_ESTRANGEIRO,
  PAISES_FREQUENTES,
  META_RESIDENCIA,
  META_ESTADO_CIVIL,
  type RendimentoId,
  type EstadoDeclaracao,
  type OperacaoAtivo,
  type EntradaEstrangeiro,
  type TipoRendimentoEstrangeiro,
  type PropriedadeArrendada,
  titularBVazio,
  type Contribuinte,
  type Dependente,
  type AscendenteDetalhe,
  type ResidenciaFiscal,
  type EstadoCivil,
  type RendimentosTitularB,
} from "@/lib/irs-guiado";
import {
  fontesDeArmazenamento,
  type FonteImportacao,
  type PatchImportacao,
} from "@/lib/store/importacao-irs";
import DatePicker from "@/components/ui/DatePicker";
import {
  ATIVIDADES,
  efeitoFiscal,
  IRS_JOVEM,
  IAS,
  SS_TAXA,
  SS_COEFICIENTE,
  DIVIDENDOS_TAXA,
  MAIS_VALIAS_MOBILIARIAS_TAXA,
  CRIPTO_TAXA_CURTO_PRAZO,
  CRIPTO_ISENCAO_DIAS,
  MAIS_VALIAS_IMOBILIARIO_INCLUSAO,
  CATEGORIA_F,
  META_DURACAO,
  DEDUCAO_ESPECIFICA_DEPENDENTE,
  DEDUCAO_SAUDE,
  DEDUCAO_EDUCACAO,
  DEDUCAO_DESP_GERAIS,
  DEDUCAO_RENDAS,
  type Atividade,
  type DuracaoArrendamento,
  type TipoAtividade,
} from "@/lib/fiscal-data";
import { useRecibos } from "@/lib/store/recibos";
import { fmt, pct } from "@/lib/format";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import InfoTip from "@/components/ui/InfoTip";
import ProHint from "@/components/ui/ProHint";
import PartnerSpot from "@/components/dashboard/PartnerSpot";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { exportarDeclaracaoIRS, exportarDeclaracaoCSV } from "@/lib/export-irs";
import { DistribuicaoRendimento, DistribuicaoFiscal } from "@/components/simulador/Graficos";
import EditorOperacoes from "@/components/simulador/EditorOperacoes";
import {
  DEDUCAO_PPR,
  DEDUCAO_DONATIVOS,
  DEDUCAO_ASCENDENTE,
  DEDUCAO_LARES,
  DEDUCAO_PENSAO_ALIMENTOS,
  DONATIVOS_MAJORACOES,
  COEF_DESVALORIZACAO_MOEDA,
  type TipoDonativo,
} from "@/lib/fiscal-data";
import {
  Briefcase, User, Invoice, Coin, ChartProjection, Globe, Home, Building, Plane,
  Check, Warning, ArrowRight, ArrowLeft, ChevronDown, Export, Trash, Plus,
  Settings, Receipt, Sparkle, Close,
} from "@/components/ui/Icons";
import {
  Campo, SeletorCartoes, Checkbox, Interruptor, Explicador, Linha,
  CartaoValidacao, CabecalhoModulo, campoCls, rotuloCls,
} from "@/components/simulador/ui";

const ICONES: Record<string, (p: { size?: number; className?: string }) => ReactNode> = {
  Briefcase, User, Invoice, Coin, ChartProjection, Globe, Home, Building, Plane,
  Settings, Receipt,
};

const n = (s: string) => parseFloat((s || "").replace(",", ".")) || 0;

function tempoRelativo(ts: number, agora: number): string {
  const s = Math.max(0, Math.floor((agora - ts) / 1000));
  if (s < 60) return "agora mesmo";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return `há ${h} h`;
}

const ATIVIDADE_DEFAULT =
  ATIVIDADES.find((a) => a.label.includes("Programador")) ?? ATIVIDADES[0];

const PASSOS = ["Agregado", "Rendimentos", "Deduções", "Revisão"] as const;
const SNAP_KEY = "recibocerto:sim-irs:v1";

export default function SimuladorPage() {
  const { recibos, carregado, resumo } = useRecibos();

  // ── Navegação ──────────────────────────────────────────────────────────────
  const [passo, setPasso] = useState(0);

  // ── Etapa 1 — agregado ──────────────────────────────────────────────────────
  const [contribuinte, setContribuinte] = useState<Contribuinte>({
    nome: "", nif: "", nascimento: "", residencia: "continente", estadoCivil: "solteiro",
  });
  const [conjunta, setConjunta] = useState(false);
  // Sujeito passivo B (cônjuge / unido de facto) — rendimentos próprios.
  const [spb, setSpb] = useState<RendimentosTitularB>(titularBVazio());
  const [atividadeB, setAtividadeB] = useState<Atividade>(ATIVIDADE_DEFAULT);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  // Importação de dados de outros simuladores.
  const [importAberto, setImportAberto] = useState(false);
  const [ascendentes, setAscendentes] = useState<AscendenteDetalhe[]>([]);
  const [deficiencia, setDeficiencia] = useState(false);
  const [ifici, setIfici] = useState(false);

  // ── Etapa 2 — rendimentos ───────────────────────────────────────────────────
  const [ativos, setAtivos] = useState<RendimentoId[]>(["independente"]);

  // Salários / pensões
  const [salEntidade, setSalEntidade] = useState("");
  const [salBruto, setSalBruto] = useState("");
  const [salRet, setSalRet] = useState("");
  const [salSS, setSalSS] = useState("");
  const [pensTipo, setPensTipo] = useState<"velhice" | "invalidez" | "sobrevivencia" | "alimentos">("velhice");
  const [pensBruto, setPensBruto] = useState("");
  const [pensRet, setPensRet] = useState("");

  // Independente
  const [atividade, setAtividade] = useState<Atividade>(ATIVIDADE_DEFAULT);
  const [indBruto, setIndBruto] = useState("25000");
  const [indRegime, setIndRegime] = useState<"simplificado" | "organizada">("simplificado");
  const [indDespesas, setIndDespesas] = useState("");
  const [indRet, setIndRet] = useState("");
  const [indAno, setIndAno] = useState(3);
  const [indJovem, setIndJovem] = useState(0);
  const [indIsencaoSS, setIndIsencaoSS] = useState(false);
  const [indAcumula, setIndAcumula] = useState(false);

  // Capitais
  const [dividendos, setDividendos] = useState("");
  const [juros, setJuros] = useState("");
  const [certificados, setCertificados] = useState("");
  const [depositos, setDepositos] = useState("");
  const [capRet, setCapRet] = useState("");
  const [capEnglobar, setCapEnglobar] = useState(false);

  // Investimentos (detalhe por operação)
  const [opsInv, setOpsInv] = useState<OperacaoAtivo[]>([]);
  const [invEnglobar, setInvEnglobar] = useState(false);

  // Cripto (detalhe por operação)
  const [opsCripto, setOpsCripto] = useState<OperacaoAtivo[]>([]);
  const [criptoEnglobar, setCriptoEnglobar] = useState(false);

  // Imóveis (rendas — Anexo F, várias propriedades)
  const [propriedades, setPropriedades] = useState<PropriedadeArrendada[]>([]);
  const [rendaHab, setRendaHab] = useState(true);
  const [rendaDuracao, setRendaDuracao] = useState<DuracaoArrendamento>("curto");
  const [rendaRet, setRendaRet] = useState("");
  const [rendaEnglobar, setRendaEnglobar] = useState(false);

  // Venda de imóveis (despesas decompostas)
  const [vendaRealizacao, setVendaRealizacao] = useState("");
  const [vendaAquisicao, setVendaAquisicao] = useState("");
  const [vendaImt, setVendaImt] = useState("");
  const [vendaEscritura, setVendaEscritura] = useState("");
  const [vendaObras, setVendaObras] = useState("");
  const [vendaComissao, setVendaComissao] = useState("");
  const [vendaDataAq, setVendaDataAq] = useState("");
  const [vendaDataVenda, setVendaDataVenda] = useState("");
  const [vendaReinveste, setVendaReinveste] = useState(false);
  const [vendaReinvestido, setVendaReinvestido] = useState("");

  // Estrangeiros (Anexo J — várias entradas por país)
  const [estEntradas, setEstEntradas] = useState<EntradaEstrangeiro[]>([]);

  // ── Etapa 3 — deduções ──────────────────────────────────────────────────────
  const [saude, setSaude] = useState("");
  const [educacao, setEducacao] = useState("");
  const [gerais, setGerais] = useState("");
  const [rendasDed, setRendasDed] = useState("");
  const [lares, setLares] = useState("");
  const [pensaoAlimentos, setPensaoAlimentos] = useState("");
  const [pprValor, setPprValor] = useState("");
  const [pprIdade, setPprIdade] = useState<"ate35" | "de35a50" | "mais50">("de35a50");
  const [donativoValor, setDonativoValor] = useState("");
  const [donativoTipo, setDonativoTipo] = useState<TipoDonativo>("geral");
  const [pagamentosPorConta, setPagamentosPorConta] = useState("");

  // ── Persistência (localStorage) ─────────────────────────────────────────────
  const [hidratado, setHidratado] = useState(false);
  const [ultimaGravacao, setUltimaGravacao] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const tinhaSnapshot = useRef(false);

  // Relógio leve para o indicador "guardado há X" (atualiza a cada 30 s).
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const montarSnapshot = () => ({
    contribuinte, conjunta, spb, atividadeB: atividadeB.label, dependentes, ascendentes, deficiencia, ifici, ativos,
    salEntidade, salBruto, salRet, salSS, pensTipo, pensBruto, pensRet,
    atividade: atividade.label, indBruto, indRegime, indDespesas, indRet, indAno, indJovem, indIsencaoSS, indAcumula,
    dividendos, juros, certificados, depositos, capRet, capEnglobar,
    opsInv, invEnglobar, opsCripto, criptoEnglobar,
    propriedades, rendaHab, rendaDuracao, rendaRet, rendaEnglobar,
    vendaRealizacao, vendaAquisicao, vendaImt, vendaEscritura, vendaObras, vendaComissao, vendaDataAq, vendaDataVenda, vendaReinveste, vendaReinvestido,
    estEntradas,
    saude, educacao, gerais, rendasDed, lares, pensaoAlimentos, pprValor, pprIdade, donativoValor, donativoTipo, pagamentosPorConta,
  });

  // String do snapshot — muda sempre que algum campo muda; aciona a gravação.
  const estadoSerializado = JSON.stringify(montarSnapshot());

  // Carrega o snapshot guardado (uma vez, no cliente).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SNAP_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<ReturnType<typeof montarSnapshot>>;
        tinhaSnapshot.current = true;
        const set = <T,>(v: T | undefined, fn: (x: T) => void) => { if (v !== undefined) fn(v); };
        set(s.contribuinte, setContribuinte); set(s.conjunta, setConjunta);
        set(s.spb, setSpb);
        if (s.atividadeB) setAtividadeB(ATIVIDADES.find((a) => a.label === s.atividadeB) ?? ATIVIDADE_DEFAULT);
        set(s.dependentes, setDependentes); set(s.ascendentes, setAscendentes); set(s.deficiencia, setDeficiencia);
        set(s.ifici, setIfici); set(s.ativos, setAtivos);
        set(s.salEntidade, setSalEntidade); set(s.salBruto, setSalBruto); set(s.salRet, setSalRet); set(s.salSS, setSalSS);
        set(s.pensTipo, setPensTipo); set(s.pensBruto, setPensBruto); set(s.pensRet, setPensRet);
        if (s.atividade) setAtividade(ATIVIDADES.find((a) => a.label === s.atividade) ?? ATIVIDADE_DEFAULT);
        set(s.indBruto, setIndBruto); set(s.indRegime, setIndRegime); set(s.indDespesas, setIndDespesas);
        set(s.indRet, setIndRet); set(s.indAno, setIndAno); set(s.indJovem, setIndJovem);
        set(s.indIsencaoSS, setIndIsencaoSS); set(s.indAcumula, setIndAcumula);
        set(s.dividendos, setDividendos); set(s.juros, setJuros); set(s.certificados, setCertificados); set(s.depositos, setDepositos); set(s.capRet, setCapRet); set(s.capEnglobar, setCapEnglobar);
        set(s.opsInv, setOpsInv); set(s.invEnglobar, setInvEnglobar); set(s.opsCripto, setOpsCripto); set(s.criptoEnglobar, setCriptoEnglobar);
        set(s.lares, setLares); set(s.pensaoAlimentos, setPensaoAlimentos);
        set(s.propriedades, setPropriedades); set(s.rendaHab, setRendaHab);
        set(s.rendaDuracao, setRendaDuracao); set(s.rendaRet, setRendaRet); set(s.rendaEnglobar, setRendaEnglobar);
        set(s.vendaRealizacao, setVendaRealizacao); set(s.vendaAquisicao, setVendaAquisicao);
        set(s.vendaImt, setVendaImt); set(s.vendaEscritura, setVendaEscritura); set(s.vendaObras, setVendaObras); set(s.vendaComissao, setVendaComissao);
        set(s.vendaDataAq, setVendaDataAq); set(s.vendaDataVenda, setVendaDataVenda); set(s.vendaReinveste, setVendaReinveste); set(s.vendaReinvestido, setVendaReinvestido);
        set(s.estEntradas, setEstEntradas);
        set(s.saude, setSaude); set(s.educacao, setEducacao); set(s.gerais, setGerais); set(s.rendasDed, setRendasDed);
        set(s.pprValor, setPprValor); set(s.pprIdade, setPprIdade); set(s.donativoValor, setDonativoValor);
        set(s.donativoTipo, setDonativoTipo); set(s.pagamentosPorConta, setPagamentosPorConta);
      }
    } catch {
      /* ignora snapshot corrompido */
    }
    setHidratado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pré-preenchimento com recibos registados (cat. B) — só se não houver snapshot.
  useEffect(() => {
    if (hidratado && !tinhaSnapshot.current && carregado && recibos.length > 0) {
      setIndBruto(String(Math.round(resumo.bruto)));
      setIndRet(String(Math.round(resumo.retencao)));
    }
  }, [hidratado, carregado, recibos.length, resumo.bruto, resumo.retencao]);

  const ef = efeitoFiscal(atividade);
  const efB = efeitoFiscal(atividadeB);
  const resInv = useMemo(() => resumoMobiliario(opsInv), [opsInv]);
  const resCripto = useMemo(() => resumoCripto(opsCripto), [opsCripto]);

  // Coeficiente de desvalorização da moeda para a venda de imóvel (≥ 24 meses).
  const diasImovel = diasDetencao(vendaDataAq, vendaDataVenda);
  const anoAqImovel = vendaDataAq ? Number(vendaDataAq.slice(0, 4)) : 0;
  const coefImovelRaw = anoAqImovel ? coeficienteDesvalorizacao(anoAqImovel) : null;
  const coefImovelAplicavel = diasImovel !== null && diasImovel >= 730 && coefImovelRaw !== null && coefImovelRaw > 1;
  const coefImovel = coefImovelAplicavel ? (coefImovelRaw as number) : 1;

  // Guarda automaticamente o estado (após hidratação).
  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(SNAP_KEY, JSON.stringify(montarSnapshot()));
      setUltimaGravacao(Date.now());
    } catch {
      /* localStorage indisponível */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidratado, estadoSerializado]);

  const limparTudo = () => {
    if (typeof window !== "undefined" && !window.confirm("Recomeçar apaga todos os dados desta simulação neste dispositivo. Queres continuar?")) {
      return;
    }
    try {
      localStorage.removeItem(SNAP_KEY);
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") window.location.reload();
  };

  const montarCabecalho = () => ({
    nome: contribuinte.nome,
    nif: contribuinte.nif,
    residencia: META_RESIDENCIA[contribuinte.residencia],
    estadoCivil: META_ESTADO_CIVIL[contribuinte.estadoCivil],
    tributacao: conjunta ? "Conjunta (quociente conjugal)" : "Individual",
    dependentes: dependentes.map((d, i) => {
      const idade = idadeNoAnoFiscal(d.nascimento);
      return `${d.nome.trim() || `Dependente ${i + 1}`}${idade === null ? "" : ` (${dependenteAte3(d) ? "≤ 3 anos" : `${idade} anos`})`}`;
    }),
    ascendentes: ascendentes.filter((a) => a.comunhao && a.rendimentoBaixo).length,
  });

  // ── Estado normalizado ──────────────────────────────────────────────────────
  const estado: EstadoDeclaracao = useMemo(
    () => ({
      contribuinte,
      conjunta,
      titularB: conjunta
        ? {
            ...spb,
            indTipo: atividadeB.tipo as TipoAtividade,
            indCoefOverride: efB.coef,
            indRegra15Override: efB.regra15,
          }
        : undefined,
      dependentes,
      ascendentes,
      deficiencia,
      ifici,
      ativos,
      salarios: { bruto: n(salBruto), retencoes: n(salRet) },
      pensoes: { bruto: n(pensBruto), retencoes: n(pensRet) },
      independente: {
        bruto: n(indBruto),
        tipo: atividade.tipo as TipoAtividade,
        coefOverride: ef.coef,
        aplicaRegra15Override: ef.regra15,
        regime: indRegime,
        despesas: n(indDespesas),
        retencoes: n(indRet),
        anoAtividade: indAno,
        irsJovemAno: indJovem,
        isencaoSSPrimeiroAno: indIsencaoSS,
        acumulaEmprego: indAcumula,
      },
      capitais: { dividendos: n(dividendos), juros: n(juros) + n(certificados) + n(depositos), retencoes: n(capRet), englobar: capEnglobar },
      investimentos: { saldo: Math.max(0, resInv.saldo), algumCurtoPrazo: resInv.algumCurtoPrazo, englobar: invEnglobar },
      cripto: { curto: Math.max(0, resCripto.curto), longo: resCripto.longo, englobar: criptoEnglobar },
      imoveis: {
        propriedades,
        habitacao: rendaHab,
        duracao: rendaDuracao,
        retencoes: n(rendaRet),
        englobar: rendaEnglobar,
      },
      imoveisVenda: {
        valorRealizacao: n(vendaRealizacao),
        valorAquisicao: n(vendaAquisicao),
        despesas: n(vendaImt) + n(vendaEscritura) + n(vendaObras) + n(vendaComissao),
        coeficiente: coefImovel,
        reinvesteHPP: vendaReinveste,
        valorReinvestido: n(vendaReinvestido),
      },
      estrangeiros: { entradas: estEntradas },
      deducoes: { saude: n(saude), educacao: n(educacao), gerais: n(gerais), rendas: n(rendasDed), lares: n(lares) },
      pensaoAlimentos: n(pensaoAlimentos),
      ppr: { valor: n(pprValor), escalaoIdade: pprIdade },
      donativos: { valor: n(donativoValor), tipo: donativoTipo },
      pagamentosPorConta: n(pagamentosPorConta),
    }),
    [
      contribuinte, conjunta, spb, atividadeB, efB.coef, efB.regra15, dependentes, ascendentes, deficiencia, ifici, ativos,
      salBruto, salRet, pensBruto, pensRet,
      atividade, ef.coef, ef.regra15, indBruto, indRegime, indDespesas, indRet, indAno, indJovem, indIsencaoSS, indAcumula,
      dividendos, juros, certificados, depositos, capRet, capEnglobar,
      resInv, invEnglobar,
      resCripto, criptoEnglobar,
      propriedades, rendaHab, rendaDuracao, rendaRet, rendaEnglobar,
      vendaRealizacao, vendaAquisicao, vendaImt, vendaEscritura, vendaObras, vendaComissao, coefImovel, vendaReinveste, vendaReinvestido,
      estEntradas,
      saude, educacao, gerais, rendasDed, lares, pensaoAlimentos, pprValor, pprIdade, donativoValor, donativoTipo, pagamentosPorConta,
    ]
  );

  const resultado = useMemo(() => simularDeclaracaoIRS(construirDeclaracaoInput(estado)), [estado]);
  const validacoes = useMemo(
    () => validarDeclaracao(estado, resultado.rendimentoColetavel),
    [estado, resultado.rendimentoColetavel]
  );
  const completude = useMemo(() => calcularCompletude(estado), [estado]);

  const erros = validacoes.filter((v) => v.nivel === "erro");
  const avisos = validacoes.filter((v) => v.nivel === "aviso");
  const oportunidades = validacoes.filter((v) => v.nivel === "oportunidade");

  const reembolso = resultado.saldo >= 0;

  const toggleAtivo = (id: RendimentoId) =>
    setAtivos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const ativo = (id: RendimentoId) => ativos.includes(id);

  // ── Importação de outros simuladores ────────────────────────────────────────
  const [fontesImport, setFontesImport] = useState<FonteImportacao[]>([]);

  const abrirImport = () => {
    const lista: FonteImportacao[] = [];
    if (carregado && recibos.length > 0 && resumo.bruto > 0) {
      lista.push({
        id: "recibos",
        titulo: "Recibos verdes registados",
        descricao: `${recibos.length} recibo(s) que registaste este ano.`,
        icone: "Receipt",
        detalhes: [
          `Faturação ${fmt(resumo.bruto)}`,
          ...(resumo.retencao > 0 ? [`Retenções ${fmt(resumo.retencao)}`] : []),
        ],
        patch: { ativar: ["independente"], indBruto: Math.round(resumo.bruto), indRet: Math.round(resumo.retencao) },
      });
    }
    lista.push(...fontesDeArmazenamento());
    setFontesImport(lista);
    setImportAberto(true);
  };

  const aplicarPatch = (p: PatchImportacao) => {
    if (p.ativar) setAtivos((prev) => Array.from(new Set([...prev, ...p.ativar!])));
    if (p.conjunta !== undefined) setConjunta(p.conjunta);
    if (p.deficiencia !== undefined) setDeficiencia(p.deficiencia);
    if (p.ifici !== undefined) setIfici(p.ifici);
    if (p.atividadeTipo) { const a = ATIVIDADES.find((x) => x.tipo === p.atividadeTipo); if (a) setAtividade(a); }
    if (p.indBruto !== undefined) setIndBruto(String(p.indBruto));
    if (p.indRet !== undefined) setIndRet(String(p.indRet));
    if (p.indRegime) setIndRegime(p.indRegime);
    if (p.indAno !== undefined) setIndAno(p.indAno);
    if (p.indJovem !== undefined) setIndJovem(p.indJovem);
    if (p.indDespesas !== undefined) setIndDespesas(String(p.indDespesas));
    if (p.indIsencaoSS !== undefined) setIndIsencaoSS(p.indIsencaoSS);
    if (p.indAcumula !== undefined) setIndAcumula(p.indAcumula);
    if (p.salBruto !== undefined) setSalBruto(String(p.salBruto));
    if (p.salRet !== undefined) setSalRet(String(p.salRet));
    if (p.salEntidade) setSalEntidade(p.salEntidade);
    if (p.dividendos !== undefined) setDividendos(String(p.dividendos));
    if (p.saude !== undefined) setSaude(String(p.saude));
    if (p.educacao !== undefined) setEducacao(String(p.educacao));
    if (p.gerais !== undefined) setGerais(String(p.gerais));
    if (p.rendasDed !== undefined) setRendasDed(String(p.rendasDed));
    if (p.dependentesCount && p.dependentesCount > 0) {
      setDependentes((prev) =>
        prev.length >= p.dependentesCount!
          ? prev
          : [...prev, ...Array.from({ length: p.dependentesCount! - prev.length }, () => dependenteVazio())]
      );
    }
  };

  const importarFontes = (selecionadas: FonteImportacao[]) => {
    selecionadas.forEach((f) => aplicarPatch(f.patch));
    setImportAberto(false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Cabeçalho */}
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="eyebrow mb-2 text-brand">Preparação e simulação · IRS 2026</div>
          <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">Simulador de IRS guiado</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Passo a passo pela tua realidade fiscal — sem te perderes em anexos. Cada campo explica-se, cada valor tem
            memória de cálculo e o sistema avisa-te do que possa faltar. No fim, sais com a tranquilidade de não te
            teres esquecido de nada.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirImport}
          className="group inline-flex flex-shrink-0 items-center gap-2 self-start rounded-xl border border-brand/30 bg-brand-light px-4 py-2.5 text-sm font-semibold text-brand-dark shadow-card transition-all hover:border-brand hover:shadow-lift"
        >
          <Sparkle size={16} className="transition-transform group-hover:scale-110" />
          Importar dados
        </button>
      </header>

      {/* Indicador de passos + completude */}
      <Stepper passo={passo} onIr={setPasso} pontuacao={completude.pontuacao} />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        {/* Coluna principal */}
        <div className="min-w-0 space-y-5">
          <m.div
            key={passo}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
          {passo === 0 && (
            <PassoAgregado
              {...{
                contribuinte, setContribuinte, conjunta, setConjunta,
                spb, setSpb, atividadeB, setAtividadeB, efB,
                dependentes, setDependentes, ascendentes, setAscendentes,
                deficiencia, setDeficiencia, ifici, setIfici, jovemAtivo: indJovem > 0,
              }}
            />
          )}

          {passo === 1 && (
            <>
              <Triagem ativos={ativos} onToggle={toggleAtivo} />

              {ativos.length === 0 && (
                <p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-800/40">
                  Seleciona acima as origens dos teus rendimentos para abrir os módulos correspondentes.
                </p>
              )}

              {ativo("salarios") && (
                <ModuloCard id="salarios">
                  <div>
                    <label htmlFor="sal-entidade" className={`mb-1.5 block ${rotuloCls}`}>Entidade empregadora (opcional)</label>
                    <input id="sal-entidade" value={salEntidade} onChange={(e) => setSalEntidade(e.target.value)} placeholder="Nome da entidade" className={campoCls} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Campo id="sal-bruto" label="Rendimento bruto (€)" value={salBruto} onChange={setSalBruto} step={500} />
                    <Campo id="sal-ret" label="Retenções de IRS (€)" value={salRet} onChange={setSalRet} step={100} />
                    <Campo id="sal-ss" label="Desconto Seg. Social (€)" value={salSS} onChange={setSalSS} step={100}
                      tooltip="Contribuição do trabalhador para a Segurança Social (11%), retida pela entidade. Informativa — não altera o IRS." />
                  </div>
                  {n(salBruto) > 0 && n(salSS) === 0 && (
                    <p className="rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                      Estimativa do desconto de Segurança Social a 11%: {fmt(n(salBruto) * 0.11)}.
                    </p>
                  )}
                  <Explicador titulo="Como é tributado o trabalho dependente?">
                    Ao rendimento bruto subtrai-se uma dedução específica de {fmt(DEDUCAO_ESPECIFICA_DEPENDENTE.value)} (8,54 × IAS, Art. 25.º CIRS).
                    O valor restante junta-se aos outros rendimentos e é tributado pelas taxas progressivas. As retenções feitas
                    pela entidade empregadora são adiantamentos: comparam-se no fim com o IRS apurado. Se tiveste mais do que uma
                    entidade, soma os rendimentos e as retenções.
                  </Explicador>
                </ModuloCard>
              )}

              {ativo("pensoes") && (
                <ModuloCard id="pensoes">
                  <div>
                    <label htmlFor="pens-tipo" className={`mb-1.5 block ${rotuloCls}`}>Tipo de pensão</label>
                    <select id="pens-tipo" value={pensTipo} onChange={(e) => setPensTipo(e.target.value as typeof pensTipo)} className={campoCls}>
                      <option value="velhice">Velhice / reforma</option>
                      <option value="invalidez">Invalidez</option>
                      <option value="sobrevivencia">Sobrevivência</option>
                      <option value="alimentos">Pensão de alimentos</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Campo id="pens-bruto" label="Pensões brutas anuais (€)" value={pensBruto} onChange={setPensBruto} step={500} />
                    <Campo id="pens-ret" label="Retenções de IRS (€)" value={pensRet} onChange={setPensRet} step={100} />
                  </div>
                  {pensTipo === "alimentos" && (
                    <p className="rounded-xl border border-brand/20 bg-brand-light/50 px-3 py-2 text-xs text-brand-dark">
                      As pensões de alimentos têm tributação autónoma a 20% (Art. 72.º CIRS). Esta simulação engloba-as como pensão — confirma o enquadramento com o teu contabilista.
                    </p>
                  )}
                </ModuloCard>
              )}

              {ativo("independente") && (
                <ModuloCard id="independente">
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className={rotuloCls}>Tipo de atividade</span>
                      <InfoTip>Tabela do Art. 151.º (Portaria 1011/2001). Determina o coeficiente do regime simplificado e a retenção na fonte.</InfoTip>
                    </div>
                    <ActivityCombobox value={atividade} onChange={setAtividade} />
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-brand-light px-2.5 py-1 font-semibold text-brand-dark">Coef. {pct(ef.coef)}</span>
                      <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">Ret. {pct(ef.retencao)}</span>
                    </div>
                    {ef.nota && <p className="mt-2 text-xs leading-relaxed text-stone-400">{ef.nota}</p>}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Campo id="ind-bruto" label="Faturação anual (€)" value={indBruto} onChange={setIndBruto} step={500} />
                    <Campo id="ind-ret" label="Retenções pagas (€)" value={indRet} onChange={setIndRet} step={100} />
                  </div>
                  <SeletorCartoes
                    label="Regime de contabilidade"
                    tooltip="Simplificado: coeficiente sobre o rendimento (presume despesas). Organizada: lucro real (receitas − despesas). Obrigatória acima de €200 000."
                    opcoes={[
                      { id: "simplificado" as const, label: "Simplificado", sub: `Coef. ${pct(ef.coef)}` },
                      { id: "organizada" as const, label: "Contab. organizada", sub: "Receitas − despesas" },
                    ]}
                    valor={indRegime}
                    onChange={setIndRegime}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <label htmlFor="ind-despesas" className={rotuloCls}>{indRegime === "organizada" ? "Despesas reais (€)" : "Despesas justificadas (€)"}</label>
                        <InfoTip>{indRegime === "organizada" ? "Despesas documentadas que reduzem diretamente o lucro tributável." : "Faturas com NIF. Reduzem o acréscimo da regra dos 15% do regime simplificado."}</InfoTip>
                      </div>
                      <input id="ind-despesas" type="number" inputMode="decimal" min={0} step={100} value={indDespesas} onChange={(e) => setIndDespesas(e.target.value)} placeholder="0" className={campoCls} />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <label htmlFor="ind-ano" className={rotuloCls}>Ano de atividade</label>
                        <InfoTip>1.º ano: coeficiente reduzido 50%. 2.º ano: 25%. A partir do 3.º, integral (Art. 31.º n.º 10 CIRS).</InfoTip>
                      </div>
                      <select id="ind-ano" value={indAno} onChange={(e) => setIndAno(Number(e.target.value))} className={campoCls}>
                        <option value={1}>1.º ano (−50%)</option>
                        <option value={2}>2.º ano (−25%)</option>
                        <option value={3}>3.º ano ou seguinte</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <label htmlFor="ind-jovem" className={rotuloCls}>IRS Jovem</label>
                      <InfoTip>Até {IRS_JOVEM.idadeMax.value} anos. Isenção 100% (1.º), 75% (2.º–4.º), 50% (5.º–7.º), 25% (8.º–10.º). Teto 55×IAS = {fmt(Math.round(55 * IAS.value))}. Art. 12.º-B CIRS.</InfoTip>
                    </div>
                    <select id="ind-jovem" value={indJovem} onChange={(e) => setIndJovem(Number(e.target.value))} className={campoCls}>
                      <option value={0}>Não aplicável</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((ano) => (
                        <option key={ano} value={ano}>{`${ano}.º ano — isenção ${pct(IRS_JOVEM.isencaoPorAno.value[ano])}`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Segurança Social (Anexo SS) */}
                  <div className="space-y-2 rounded-2xl border border-stone-100 bg-stone-50/70 p-3 dark:border-stone-700 dark:bg-stone-800/40">
                    <div className="flex items-center gap-1.5">
                      <span className={rotuloCls}>Segurança Social</span>
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-dark dark:bg-stone-700 dark:text-brand">Anexo SS</span>
                      <InfoTip>Contribuição de {pct(SS_TAXA.value)} sobre {pct(SS_COEFICIENTE.servicos.value)} do rendimento relevante (serviços). Há isenções no 1.º ano e por acumulação com trabalho dependente que já cobre a SS.</InfoTip>
                    </div>
                    <Checkbox checked={indIsencaoSS} onChange={setIndIsencaoSS} label="1.º ano de atividade — isenção de SS"
                      sub="Isenção automática nos primeiros 12 meses (Art. 157.º Código Contributivo), se não tiveste atividade independente nos últimos 3 anos." />
                    <Checkbox checked={indAcumula} onChange={setIndAcumula} label="Acumulação com trabalho dependente"
                      sub={`Isento de SS se o emprego cobre ≥ 1×IAS (${fmt(IAS.value)}/mês) e o rendimento médio como independente é < 4×IAS.`} />
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs dark:bg-stone-900">
                      <span className="text-stone-500 dark:text-stone-400">Contribuição anual estimada</span>
                      <span className="font-semibold tabular-nums text-stone-700 dark:text-stone-200">{resultado.ssAnual > 0 ? fmt(resultado.ssAnual) : "Isento"}</span>
                    </div>
                  </div>
                </ModuloCard>
              )}

              {ativo("capitais") && (
                <ModuloCard id="capitais">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Campo id="dividendos" label="Dividendos (€)" value={dividendos} onChange={setDividendos} step={100}
                      tooltip="Lucros distribuídos por ações/participações. No englobamento contam só a 50% (Art. 40.º-A)." />
                    <Campo id="juros" label="Juros (€)" value={juros} onChange={setJuros} step={100}
                      tooltip="Juros de obrigações e outros rendimentos de capitais." />
                    <Campo id="certificados" label="Certificados (€)" value={certificados} onChange={setCertificados} step={100}
                      tooltip="Juros de Certificados de Aforro e do Tesouro." />
                    <Campo id="depositos" label="Depósitos (€)" value={depositos} onChange={setDepositos} step={100}
                      tooltip="Juros de depósitos a prazo." />
                  </div>
                  <Campo id="cap-ret" label="Retenções na fonte (€)" value={capRet} onChange={setCapRet} step={50} />
                  <Interruptor
                    on={capEnglobar}
                    onChange={setCapEnglobar}
                    label="Optar pelo englobamento"
                    tooltip={`Por defeito, taxa liberatória de ${pct(DIVIDENDOS_TAXA.value)}. Com englobamento, os dividendos contam só a 50% (Art. 40.º-A) e somam aos restantes rendimentos às taxas progressivas — pode compensar com rendimento baixo.`}
                  />
                </ModuloCard>
              )}

              {ativo("investimentos") && (
                <ModuloCard id="investimentos">
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Regista cada venda. Calculamos o saldo anual (mais-valias menos menos-valias) e o período de detenção de cada operação.
                  </p>
                  <EditorOperacoes ops={opsInv} setOps={setOpsInv} tipo="mobiliario" />
                  {opsInv.length > 0 && (
                    <ResumoMaisValias
                      saldo={resInv.saldo}
                      nota={resInv.algumCurtoPrazo ? "Há operações de curto prazo (< 365 dias): se o teu rendimento atingir o último escalão, o englobamento é obrigatório (Art. 72.º n.º 18)." : undefined}
                    />
                  )}
                  <Interruptor on={invEnglobar} onChange={setInvEnglobar} label="Optar pelo englobamento"
                    tooltip={`Por defeito, taxa de ${pct(MAIS_VALIAS_MOBILIARIAS_TAXA.value)}. O englobamento pode compensar quando a tua taxa marginal é inferior.`} />
                </ModuloCard>
              )}

              {ativo("cripto") && (
                <ModuloCard id="cripto">
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Regista cada venda de criptoativos. Os detidos {CRIPTO_ISENCAO_DIAS.value} dias ou mais ficam automaticamente isentos (Art. 10.º n.º 19).
                  </p>
                  <EditorOperacoes ops={opsCripto} setOps={setOpsCripto} tipo="cripto" />
                  {opsCripto.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      <ResumoMini titulo="Curto prazo (tributável)" valor={Math.max(0, resCripto.curto)} sub={`a ${pct(CRIPTO_TAXA_CURTO_PRAZO.value)}`} alerta />
                      <ResumoMini titulo="Longo prazo (isento)" valor={resCripto.longo} sub={`≥ ${CRIPTO_ISENCAO_DIAS.value} dias`} />
                    </div>
                  )}
                  <Interruptor on={criptoEnglobar} onChange={setCriptoEnglobar} label="Englobar os ganhos de curto prazo"
                    tooltip="Opção pelas taxas progressivas em vez dos 28%." />
                </ModuloCard>
              )}

              {ativo("imoveis") && (
                <ModuloCard id="imoveis">
                  <p className="text-sm text-stone-500 dark:text-stone-400">Adiciona cada imóvel arrendado. A renda é considerada na proporção da tua percentagem de propriedade.</p>
                  <EditorPropriedades propriedades={propriedades} setPropriedades={setPropriedades} />
                  {propriedades.length > 0 && (() => {
                    const r = resumoPrediais(propriedades);
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        <ResumoMini titulo="Rendas (tua quota)" valor={r.renda} />
                        <ResumoMini titulo="Despesas dedutíveis" valor={r.despesas} />
                      </div>
                    );
                  })()}
                  <SeletorCartoes
                    label="Tipo de arrendamento"
                    opcoes={[
                      { id: true, label: "Habitação", sub: pct(CATEGORIA_F.taxaHabitacao.value) },
                      { id: false, label: "Não habitacional", sub: pct(CATEGORIA_F.taxaNaoHabitacao.value) },
                    ]}
                    valor={rendaHab}
                    onChange={setRendaHab}
                  />
                  {rendaHab && (
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <label htmlFor="renda-duracao" className={rotuloCls}>Duração do contrato</label>
                        <InfoTip>Contratos habitacionais comunicados à AT mais longos reduzem a taxa (Art. 72.º).</InfoTip>
                      </div>
                      <select id="renda-duracao" value={rendaDuracao} onChange={(e) => setRendaDuracao(e.target.value as DuracaoArrendamento)} className={campoCls}>
                        {(Object.keys(META_DURACAO) as DuracaoArrendamento[]).map((d) => (
                          <option key={d} value={d}>{`${META_DURACAO[d].label} — ${META_DURACAO[d].sub}`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Campo id="renda-ret" label="Retenções já pagas (€)" value={rendaRet} onChange={setRendaRet} step={100} />
                  </div>
                  <Interruptor on={rendaEnglobar} onChange={setRendaEnglobar} label="Optar pelo englobamento"
                    tooltip="Em vez da taxa autónoma, somar as rendas líquidas aos restantes rendimentos às taxas progressivas." />
                </ModuloCard>
              )}

              {ativo("imoveisVenda") && (
                <ModuloCard id="imoveisVenda">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Campo id="venda-realizacao" label="Valor de venda (€)" value={vendaRealizacao} onChange={setVendaRealizacao} step={1000} />
                    <Campo id="venda-aquisicao" label="Valor de aquisição (€)" value={vendaAquisicao} onChange={setVendaAquisicao} step={1000} />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className={rotuloCls}>Encargos e despesas dedutíveis</span>
                      <InfoTip>Acrescem ao custo e reduzem a mais-valia: IMT e Imposto do Selo na compra, escritura e registos, obras de valorização (últimos 12 anos) e a comissão da imobiliária na venda (Art. 51.º CIRS).</InfoTip>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Campo id="venda-imt" label="IMT + Selo (€)" value={vendaImt} onChange={setVendaImt} step={100} />
                      <Campo id="venda-escritura" label="Escritura/registos (€)" value={vendaEscritura} onChange={setVendaEscritura} step={50} />
                      <Campo id="venda-obras" label="Obras (€)" value={vendaObras} onChange={setVendaObras} step={500} />
                      <Campo id="venda-comissao" label="Comissão (€)" value={vendaComissao} onChange={setVendaComissao} step={100} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className={rotuloCls}>Datas (opcional)</span>
                      <InfoTip>Servem para saber há quanto tempo detiveste o imóvel. Se for mais de 24 meses, o valor de aquisição é corrigido por um coeficiente de desvalorização monetária oficial (Portaria anual) — aumentando o custo e reduzindo a mais-valia.</InfoTip>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <DatePicker ariaLabel="Data de aquisição" value={vendaDataAq} onChange={setVendaDataAq} />
                      <DatePicker ariaLabel="Data de venda" value={vendaDataVenda} onChange={setVendaDataVenda} />
                    </div>
                  </div>
                  {coefImovel > 1 && (
                    <div className="rounded-xl border border-brand/20 bg-brand-light/50 px-3 py-2 text-xs text-brand-dark">
                      Valor de aquisição corrigido: {fmt(n(vendaAquisicao))} × {coefImovel.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} (coef. {anoAqImovel}) ={" "}
                      <strong>{fmt(n(vendaAquisicao) * coefImovel)}</strong> — coeficiente de desvalorização da moeda (Art. 50.º CIRS).
                    </div>
                  )}
                  <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-800/40">
                    <span className="text-stone-500 dark:text-stone-400">Mais-valia apurada: </span>
                    <span className="font-semibold text-stone-800 dark:text-stone-100">{fmt(ganhoImobiliario(estado.imoveisVenda))}</span>
                    <span className="text-stone-400"> · só {pct(MAIS_VALIAS_IMOBILIARIO_INCLUSAO.value)} é tributado (Art. 43.º n.º 2)</span>
                  </div>
                  {(() => {
                    if (diasImovel === null) return null;
                    const meses = Math.floor(diasImovel / 30);
                    if (meses < 24) {
                      return <p className="rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">Detido há cerca de {meses} meses — abaixo de 24 meses não há correção monetária do valor de aquisição.</p>;
                    }
                    if (coefImovelRaw === null) {
                      return <p className="rounded-xl border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">Detido há cerca de {meses} meses, mas o coeficiente do ano {anoAqImovel} não está na nossa tabela ({COEF_DESVALORIZACAO_MOEDA.value.anoTabela}). Introduz o valor de aquisição já corrigido para maior precisão.</p>;
                    }
                    return <p className="rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">Detido há cerca de {meses} meses. Aplicámos a tabela de coeficientes de {COEF_DESVALORIZACAO_MOEDA.value.anoTabela} (Portaria 382/2025); assim que a tabela de 2026 for publicada, a ReciboCerto atualiza automaticamente.</p>;
                  })()}
                  <Checkbox checked={vendaReinveste} onChange={setVendaReinveste} label="Era habitação própria e vou reinvestir noutra HPP"
                    sub="O reinvestimento (sem crédito) até 36 meses após a venda exclui a mais-valia da tributação, na proporção do valor reinvestido (Art. 10.º n.º 5)." />
                  {vendaReinveste && (
                    <Campo id="venda-reinvestido" label="Valor a reinvestir (€)" value={vendaReinvestido} onChange={setVendaReinvestido} step={1000} />
                  )}
                </ModuloCard>
              )}

              {ativo("estrangeiros") && (
                <ModuloCard id="estrangeiros">
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Declara cada rendimento por país e tipo. Indica os valores em euros (converte pela taxa de câmbio de referência do dia do recebimento).
                  </p>
                  <EditorEstrangeiros entradas={estEntradas} setEntradas={setEstEntradas} />
                  {estEntradas.length > 0 && (() => {
                    const r = resumoEstrangeiros(estEntradas);
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        <ResumoMini titulo="Rendimento estrangeiro" valor={r.rendimento} sub="englobado em Portugal" />
                        <ResumoMini titulo="Imposto pago lá fora" valor={r.impostoPago} sub="dá direito a crédito" />
                      </div>
                    );
                  })()}
                  <Explicador titulo="Como funciona o crédito por dupla tributação?">
                    Como residente fiscal em Portugal, declaras o rendimento mundial. Para não pagares imposto duas vezes
                    sobre o mesmo rendimento, Portugal concede um crédito igual ao menor de dois valores: o imposto que pagaste
                    no país de origem, ou a parte da coleta portuguesa proporcional a esse rendimento (Art. 81.º CIRS).
                    As convenções para evitar a dupla tributação podem limitar a taxa cobrada na fonte.
                  </Explicador>
                </ModuloCard>
              )}
            </>
          )}

          {passo === 2 && (
            <PassoDeducoes
              {...{
                saude, setSaude, educacao, setEducacao, gerais, setGerais, rendasDed, setRendasDed,
                lares, setLares, pensaoAlimentos, setPensaoAlimentos,
                pprValor, setPprValor, pprIdade, setPprIdade, donativoValor, setDonativoValor, donativoTipo, setDonativoTipo,
                pagamentosPorConta, setPagamentosPorConta,
              }}
            />
          )}

          {passo === 3 && (
            <PassoRevisao
              estado={estado}
              resultado={resultado}
              erros={erros}
              avisos={avisos}
              oportunidades={oportunidades}
              completude={completude}
              onExportar={() => exportarDeclaracaoIRS(resultado, montarCabecalho())}
              onExportarCSV={() => exportarDeclaracaoCSV(resultado, montarCabecalho())}
              onLimpar={limparTudo}
              gravadoLabel={ultimaGravacao ? `Guardado ${tempoRelativo(ultimaGravacao, agora)} neste dispositivo` : "Guardado automaticamente neste dispositivo"}
            />
          )}
          </m.div>

          {/* Navegação */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPasso((p) => Math.max(0, p - 1))}
              disabled={passo === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:border-stone-300 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300"
            >
              <ArrowLeft size={14} /> Anterior
            </button>
            {passo < PASSOS.length - 1 ? (
              <button
                type="button"
                onClick={() => setPasso((p) => Math.min(PASSOS.length - 1, p + 1))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-dark"
              >
                Seguinte <ArrowRight size={14} />
              </button>
            ) : (
              <span className="text-xs text-stone-400">Revisão concluída</span>
            )}
          </div>
        </div>

        {/* Coluna de resultado (sempre visível) */}
        <div className="lg:sticky lg:top-6">
          <ResumoLateral resultado={resultado} reembolso={reembolso} completude={completude} nErros={erros.length} />
        </div>
      </div>

      <ProHint id="guardar-cenario-irs" icon={<ChartProjection size={18} />} cta="Conhecer o Pro" className="mt-6">
        Gostavas de guardar esta declaração simulada e compará-la com outros cenários ao longo do ano? Isso faz parte do Pro.
      </ProHint>
      <div className="mt-4"><PartnerSpot context="simulador" /></div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-alert-border bg-alert-bg p-4">
        <Warning size={14} className="mt-0.5 flex-shrink-0 text-alert-text" />
        <p className="text-xs leading-relaxed text-alert-text">
          Estimativa com base na legislação em vigor para 2026. O IRS e a Segurança Social são adiantamentos/estimativas —
          o apuramento final depende da declaração Modelo 3. Benefícios fiscais como PPR e donativos, ascendentes e regimes
          especiais não estão todos modelados. Não substitui aconselhamento de contabilista certificado.
        </p>
      </div>

      <ModalImportacao
        aberto={importAberto}
        fontes={fontesImport}
        onFechar={() => setImportAberto(false)}
        onImportar={importarFontes}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-componentes
// ═══════════════════════════════════════════════════════════════════════════

function Stepper({ passo, onIr, pontuacao }: { passo: number; onIr: (p: number) => void; pontuacao: number }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-3 shadow-card dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-center gap-1 overflow-x-auto">
        {PASSOS.map((label, i) => {
          const active = i === passo;
          const done = i < passo;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onIr(i)}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                active ? "bg-brand text-white" : done ? "text-brand-dark hover:bg-brand-light dark:text-brand" : "text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
              }`}
            >
              <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${active ? "bg-white/25" : done ? "bg-brand text-white" : "bg-stone-100 dark:bg-stone-800"}`}>
                {done ? <Check size={10} /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-2 px-1">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${pontuacao}%` }} />
        </div>
        <span className="text-[11px] font-semibold tabular-nums text-stone-500 dark:text-stone-400">{pontuacao}%</span>
      </div>
    </div>
  );
}

function ModuloCard({ id, children }: { id: RendimentoId; children: ReactNode }) {
  const meta = moduloMeta(id);
  const Icon = ICONES[meta.icone];
  return (
    <section className="space-y-4 rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
      <CabecalhoModulo titulo={meta.titulo} anexo={meta.anexo} anexoNome={meta.anexoNome} explicacao={meta.explicacao} icon={Icon ? <Icon size={18} /> : undefined} />
      {children}
    </section>
  );
}

function ComparadorCenarios({ estado }: { estado: EstadoDeclaracao }) {
  const base = construirDeclaracaoInput(estado);
  const temCapital = ["capitais", "investimentos", "cripto", "imoveis"].some((id) => estado.ativos.includes(id as RendimentoId));

  const comEnglobamento = (input: ReturnType<typeof construirDeclaracaoInput>, englobar: boolean) => ({
    ...input,
    capitais: input.capitais ? { ...input.capitais, englobar } : undefined,
    investimentos: input.investimentos ? { ...input.investimentos, englobar } : undefined,
    cripto: input.cripto ? { ...input.cripto, englobar } : undefined,
    prediais: input.prediais ? { ...input.prediais, englobar } : undefined,
  });

  const individual = simularDeclaracaoIRS({ ...base, conjunta: false });
  const conjunta = simularDeclaracaoIRS({ ...base, conjunta: true });
  const autonoma = simularDeclaracaoIRS(comEnglobamento(base, false));
  const englobado = simularDeclaracaoIRS(comEnglobamento(base, true));

  return (
    <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Comparar cenários</h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">A mesma declaração, lado a lado. Indicamos qual paga menos imposto — a opção continua a ser tua.</p>

      <div className="mt-4 space-y-4">
        <ParCenarios
          titulo="Tributação"
          nota="Só aplicável a casados ou unidos de facto."
          a={{ rotulo: "Individual", irs: individual.irsTotal, saldo: individual.saldo }}
          b={{ rotulo: "Conjunta", irs: conjunta.irsTotal, saldo: conjunta.saldo }}
        />
        {temCapital && (
          <ParCenarios
            titulo="Rendimentos de capital e mais-valias"
            nota="Taxa autónoma (28%) vs. englobamento às taxas progressivas."
            a={{ rotulo: "Tributação autónoma", irs: autonoma.irsTotal, saldo: autonoma.saldo }}
            b={{ rotulo: "Englobamento", irs: englobado.irsTotal, saldo: englobado.saldo }}
          />
        )}
      </div>
    </section>
  );
}

function ParCenarios({
  titulo,
  nota,
  a,
  b,
}: {
  titulo: string;
  nota: string;
  a: { rotulo: string; irs: number; saldo: number };
  b: { rotulo: string; irs: number; saldo: number };
}) {
  const aMelhor = a.irs <= b.irs;
  const diferenca = Math.abs(a.irs - b.irs);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{titulo}</span>
        <span className="text-[11px] text-stone-400">{nota}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[{ ...a, melhor: aMelhor }, { ...b, melhor: !aMelhor }].map((c, i) => (
          <div key={i} className={`rounded-xl border p-3 ${c.melhor ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/40"}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-medium ${c.melhor ? "text-brand-dark" : "text-stone-500 dark:text-stone-400"}`}>{c.rotulo}</span>
              {c.melhor && diferenca >= 1 && <span className="rounded bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-white">melhor</span>}
            </div>
            <div className={`mt-1 text-base font-semibold tabular-nums ${c.melhor ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{fmt(c.irs)}</div>
            <div className="text-[10px] text-stone-400">IRS · {c.saldo >= 0 ? "reembolso" : "a pagar"} {fmt(Math.abs(c.saldo))}</div>
          </div>
        ))}
      </div>
      {diferenca >= 1 && (
        <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          Diferença de {fmt(diferenca)} a favor de «{aMelhor ? a.rotulo : b.rotulo}».
        </p>
      )}
    </div>
  );
}

function ResumoMaisValias({ saldo, nota }: { saldo: number; nota?: string }) {
  const positivo = saldo >= 0;
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 dark:border-stone-700 dark:bg-stone-800/40">
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-500 dark:text-stone-400">{positivo ? "Saldo de mais-valias" : "Saldo (menos-valia)"}</span>
        <span className={`text-sm font-semibold tabular-nums ${positivo ? "text-brand-dark dark:text-brand" : "text-alert-text"}`}>{fmt(saldo)}</span>
      </div>
      {!positivo && <p className="mt-1 text-[11px] text-stone-400">Saldo negativo: não há imposto este ano; a menos-valia pode ser reportada nos 5 anos seguintes (Art. 55.º CIRS).</p>}
      {nota && <p className="mt-1 text-[11px] text-alert-text">{nota}</p>}
    </div>
  );
}

function ResumoMini({ titulo, valor, sub, alerta = false }: { titulo: string; valor: number; sub?: string; alerta?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${alerta && valor > 0 ? "border-alert-border bg-alert-bg" : "border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/40"}`}>
      <div className={`text-[11px] font-medium ${alerta && valor > 0 ? "text-alert-text" : "text-stone-500 dark:text-stone-400"}`}>{titulo}</div>
      <div className={`text-sm font-semibold tabular-nums ${alerta && valor > 0 ? "text-alert-text" : "text-stone-800 dark:text-stone-100"}`}>{fmt(valor)}</div>
      {sub && <div className="text-[10px] text-stone-400">{sub}</div>}
    </div>
  );
}

function EditorPropriedades({ propriedades, setPropriedades }: { propriedades: PropriedadeArrendada[]; setPropriedades: (p: PropriedadeArrendada[]) => void }) {
  const upd = (id: string, campo: keyof PropriedadeArrendada, valor: string) =>
    setPropriedades(
      propriedades.map((p) =>
        p.id === id
          ? { ...p, [campo]: campo === "artigo" || campo === "localizacao" ? valor : parseFloat(valor.replace(",", ".")) || 0 }
          : p
      )
    );
  return (
    <div className="space-y-3">
      {propriedades.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-xs text-stone-400 dark:border-stone-700 dark:bg-stone-800/40">
          Sem imóveis. Adiciona cada imóvel arrendado.
        </p>
      )}
      {propriedades.map((p, i) => (
        <div key={p.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/40">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Imóvel {i + 1}</span>
            <button type="button" onClick={() => setPropriedades(propriedades.filter((x) => x.id !== p.id))} aria-label="Remover" className="flex-shrink-0 text-stone-400 transition-colors hover:text-red-500"><Trash size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Artigo matricial</label>
              <input value={p.artigo} onChange={(e) => upd(p.id, "artigo", e.target.value)} placeholder="ex.: U-1234" className={campoCls} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Localização</label>
              <input value={p.localizacao} onChange={(e) => upd(p.id, "localizacao", e.target.value)} placeholder="Concelho" className={campoCls} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">% propriedade</label>
              <input type="number" min={0} max={100} step={5} value={p.percentagem} onChange={(e) => upd(p.id, "percentagem", e.target.value)} className={campoCls} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Rendas anuais (€)</label>
              <input type="number" inputMode="decimal" min={0} step={500} value={p.renda || ""} onChange={(e) => upd(p.id, "renda", e.target.value)} placeholder="0" className={campoCls} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Despesas dedutíveis (€)</label>
              <input type="number" inputMode="decimal" min={0} step={100} value={p.despesas || ""} onChange={(e) => upd(p.id, "despesas", e.target.value)} placeholder="0" className={campoCls} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setPropriedades([...propriedades, propriedadeVazia()])} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:border-brand hover:text-brand dark:border-stone-600 dark:text-stone-400">
        <Plus size={13} /> Adicionar imóvel
      </button>
    </div>
  );
}

function EditorEstrangeiros({ entradas, setEntradas }: { entradas: EntradaEstrangeiro[]; setEntradas: (e: EntradaEstrangeiro[]) => void }) {
  const atualizar = (id: string, campo: keyof EntradaEstrangeiro, valor: string) =>
    setEntradas(
      entradas.map((e) =>
        e.id === id
          ? { ...e, [campo]: campo === "rendimento" || campo === "impostoPago" ? parseFloat(valor.replace(",", ".")) || 0 : valor }
          : e
      )
    );
  return (
    <div className="space-y-3">
      <datalist id="paises-frequentes">
        {PAISES_FREQUENTES.map((p) => <option key={p} value={p} />)}
      </datalist>
      {entradas.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-center text-xs text-stone-400 dark:border-stone-700 dark:bg-stone-800/40">
          Sem rendimentos estrangeiros. Adiciona um por cada país/tipo.
        </p>
      )}
      {entradas.map((e, i) => (
        <div key={e.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/40">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Rendimento {i + 1}</span>
            <button type="button" onClick={() => setEntradas(entradas.filter((x) => x.id !== e.id))} aria-label="Remover" className="flex-shrink-0 text-stone-400 transition-colors hover:text-red-500">
              <Trash size={15} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">País</label>
              <input list="paises-frequentes" value={e.pais} onChange={(ev) => atualizar(e.id, "pais", ev.target.value)} placeholder="ex.: Alemanha" className={campoCls} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Tipo</label>
              <select value={e.tipo} onChange={(ev) => atualizar(e.id, "tipo", ev.target.value as TipoRendimentoEstrangeiro)} className={campoCls}>
                {(Object.keys(TIPOS_RENDIMENTO_ESTRANGEIRO) as TipoRendimentoEstrangeiro[]).map((k) => (
                  <option key={k} value={k}>{TIPOS_RENDIMENTO_ESTRANGEIRO[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Rendimento (€)</label>
              <input type="number" inputMode="decimal" min={0} step={100} value={e.rendimento || ""} onChange={(ev) => atualizar(e.id, "rendimento", ev.target.value)} placeholder="0" className={campoCls} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Imposto pago (€)</label>
              <input type="number" inputMode="decimal" min={0} step={50} value={e.impostoPago || ""} onChange={(ev) => atualizar(e.id, "impostoPago", ev.target.value)} placeholder="0" className={campoCls} />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setEntradas([...entradas, entradaEstrangeiroVazia()])}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:border-brand hover:text-brand dark:border-stone-600 dark:text-stone-400"
      >
        <Plus size={13} /> Adicionar rendimento estrangeiro
      </button>
    </div>
  );
}

function Triagem({ ativos, onToggle }: { ativos: RendimentoId[]; onToggle: (id: RendimentoId) => void }) {
  return (
    <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Como obtiveste rendimentos?</h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Seleciona tudo o que se aplica. Abrimos só os módulos que precisas.</p>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {MODULOS.map((m) => {
          const active = ativos.includes(m.id);
          const Icon = ICONES[m.icone];
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(m.id)}
              className={`flex flex-col gap-1.5 rounded-2xl border p-3 text-left transition-all ${
                active ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? "bg-brand text-white" : "bg-white text-stone-400 dark:bg-stone-800"}`}>
                  {Icon && <Icon size={16} />}
                </span>
                <span className={`flex h-4 w-4 items-center justify-center rounded-md border ${active ? "border-brand bg-brand text-white" : "border-stone-300 text-transparent dark:border-stone-600"}`}>
                  <Check size={10} />
                </span>
              </div>
              <div className={`text-sm font-semibold ${active ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{m.titulo}</div>
              <div className={`text-[11px] leading-tight ${active ? "text-brand" : "text-stone-400"}`}>{m.sub}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PassoAgregado(props: {
  contribuinte: Contribuinte; setContribuinte: (c: Contribuinte) => void;
  conjunta: boolean; setConjunta: (v: boolean) => void;
  spb: RendimentosTitularB; setSpb: (s: RendimentosTitularB) => void;
  atividadeB: Atividade; setAtividadeB: (a: Atividade) => void;
  efB: ReturnType<typeof efeitoFiscal>;
  dependentes: Dependente[]; setDependentes: (d: Dependente[]) => void;
  ascendentes: AscendenteDetalhe[]; setAscendentes: (a: AscendenteDetalhe[]) => void;
  deficiencia: boolean; setDeficiencia: (v: boolean) => void;
  ifici: boolean; setIfici: (v: boolean) => void;
  jovemAtivo: boolean;
}) {
  const {
    contribuinte, setContribuinte, conjunta, setConjunta, dependentes, setDependentes,
    spb, setSpb, atividadeB, setAtividadeB, efB,
    ascendentes, setAscendentes, deficiencia, setDeficiencia, ifici, setIfici, jovemAtivo,
  } = props;
  const c = contribuinte;
  const upd = (campo: keyof Contribuinte, valor: string) => setContribuinte({ ...c, [campo]: valor });
  const nifMau = !validarNIF(c.nif);
  const ascQualif = ascendentes.filter((a) => a.comunhao && a.rendimentoBaixo).length;

  return (
    <div className="space-y-5">
      {/* Identificação */}
      <section className="space-y-4 rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Identificação</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Dados do sujeito passivo. Determinam a estrutura da declaração.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="c-nome" className={`mb-1.5 block ${rotuloCls}`}>Nome</label>
            <input id="c-nome" value={c.nome} onChange={(e) => upd("nome", e.target.value)} placeholder="Nome completo" className={campoCls} />
          </div>
          <div>
            <label htmlFor="c-nif" className={`mb-1.5 block ${rotuloCls}`}>NIF</label>
            <input id="c-nif" inputMode="numeric" value={c.nif} onChange={(e) => upd("nif", e.target.value)} placeholder="9 dígitos" className={`${campoCls} ${nifMau ? "border-red-400 focus:ring-red-400" : ""}`} />
            {nifMau && <p className="mt-1 text-[11px] text-red-500">NIF inválido (9 dígitos com dígito de controlo).</p>}
          </div>
          <div>
            <label htmlFor="c-nasc" className={`mb-1.5 block ${rotuloCls}`}>Data de nascimento</label>
            <DatePicker id="c-nasc" value={c.nascimento} onChange={(v) => upd("nascimento", v)} ariaLabel="Data de nascimento" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="c-res" className={rotuloCls}>Residência fiscal</label>
              <InfoTip>Residentes nas Regiões Autónomas têm escalões próprios. Esta simulação usa os escalões do Continente; para Madeira/Açores o resultado é aproximado.</InfoTip>
            </div>
            <select id="c-res" value={c.residencia} onChange={(e) => upd("residencia", e.target.value as ResidenciaFiscal)} className={campoCls}>
              {(Object.keys(META_RESIDENCIA) as ResidenciaFiscal[]).map((k) => (
                <option key={k} value={k}>{META_RESIDENCIA[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-civil" className={`mb-1.5 block ${rotuloCls}`}>Estado civil</label>
            <select id="c-civil" value={c.estadoCivil} onChange={(e) => upd("estadoCivil", e.target.value as EstadoCivil)} className={campoCls}>
              {(Object.keys(META_ESTADO_CIVIL) as EstadoCivil[]).map((k) => (
                <option key={k} value={k}>{META_ESTADO_CIVIL[k]}</option>
              ))}
            </select>
          </div>
        </div>
        <SeletorCartoes
          label="Tipo de tributação"
          tooltip="Conjunta (casado / unido de facto): divide o rendimento coletável por 2, aplica os escalões e multiplica por 2 (quociente conjugal, Art. 69.º). Individual: cada um declara o seu."
          opcoes={[
            { id: false, label: "Individual", sub: "Declaração separada" },
            { id: true, label: "Conjunta", sub: "Quociente conjugal" },
          ]}
          valor={conjunta}
          onChange={setConjunta}
        />
        <div>
          <Checkbox checked={deficiencia} onChange={setDeficiencia} label="Sujeito passivo com deficiência ≥ 60%"
            sub="Art. 56.º-A: exclui 15% dos rendimentos da categoria B (máx €2 500). Art. 87.º: deduz 4×IAS à coleta. Exige atestado médico." />
        </div>
        <div>
          <Checkbox checked={ifici} onChange={setIfici} label="IFICI / NHR 2.0 — taxa única de 20%"
            sub="Substitui o NHR. Aplica 20% aos rendimentos elegíveis. Exige estatuto da AT e não ter sido residente nos últimos 5 anos. Incompatível com IRS Jovem." />
          {ifici && jovemAtivo && (
            <div className="mt-2 rounded-xl border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">
              IFICI e IRS Jovem são incompatíveis. Desativa um dos dois (o IRS Jovem está no módulo de trabalho independente).
            </div>
          )}
        </div>
      </section>

      {/* Sujeito passivo B (tributação conjunta) */}
      <AnimatePresence initial={false}>
        {conjunta && (
          <m.div
            key="spb"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <SujeitoPassivoB
              spb={spb}
              setSpb={setSpb}
              atividade={atividadeB}
              setAtividade={setAtividadeB}
              ef={efB}
              estadoCivil={c.estadoCivil}
            />
          </m.div>
        )}
      </AnimatePresence>

      {/* Dependentes */}
      <section className="space-y-3 rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-display text-base font-semibold text-stone-800 dark:text-stone-100">Dependentes</h3>
          <InfoTip>Cada dependente: &gt; 3 anos vale €600 (1.º/2.º) ou €900 (3.º+); ≤ 3 anos vale €726; com deficiência +2,5×IAS. A guarda partilhada reparte a dedução (Art. 78.º-A CIRS). A idade é apurada pela data de nascimento.</InfoTip>
        </div>
        {dependentes.length === 0 && <p className="text-xs text-stone-400">Sem dependentes. Adiciona se tiveres filhos ou outros dependentes a cargo.</p>}
        {dependentes.map((d, i) => (
          <PessoaEditor
            key={d.id}
            titulo={`Dependente ${i + 1}`}
            nome={d.nome}
            nif={d.nif}
            onNome={(v) => setDependentes(dependentes.map((x) => (x.id === d.id ? { ...x, nome: v } : x)))}
            onNif={(v) => setDependentes(dependentes.map((x) => (x.id === d.id ? { ...x, nif: v } : x)))}
            onRemover={() => setDependentes(dependentes.filter((x) => x.id !== d.id))}
            badge={(() => { const idade = idadeNoAnoFiscal(d.nascimento); return idade === null ? undefined : dependenteAte3(d) ? "≤ 3 anos" : `${idade} anos`; })()}
          >
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Data de nascimento</label>
              <DatePicker
                value={d.nascimento}
                ariaLabel={`Data de nascimento do dependente ${i + 1}`}
                onChange={(v) => setDependentes(dependentes.map((x) => (x.id === d.id ? { ...x, nascimento: v } : x)))}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Guarda (%)</label>
              <input type="number" min={0} max={100} step={50} value={d.guarda} onChange={(e) => setDependentes(dependentes.map((x) => (x.id === d.id ? { ...x, guarda: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } : x)))} className={campoCls} />
            </div>
            <div className="col-span-2">
              <Checkbox checked={d.deficiente} onChange={(v) => setDependentes(dependentes.map((x) => (x.id === d.id ? { ...x, deficiente: v } : x)))} label="Com deficiência ≥ 60%" />
            </div>
          </PessoaEditor>
        ))}
        <BotaoAdicionar onClick={() => setDependentes([...dependentes, dependenteVazio()])} texto="Adicionar dependente" />
      </section>

      {/* Ascendentes */}
      <section className="space-y-3 rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-display text-base font-semibold text-stone-800 dark:text-stone-100">Ascendentes a cargo</h3>
          <InfoTip>Ascendentes em comunhão de habitação com rendimento não superior à pensão mínima: {fmt(DEDUCAO_ASCENDENTE.value)} cada (ou 635 € se existir só um). Art. 78.º-A CIRS.</InfoTip>
        </div>
        {ascendentes.length === 0 && <p className="text-xs text-stone-400">Sem ascendentes a cargo.</p>}
        {ascendentes.map((a, i) => (
          <PessoaEditor
            key={a.id}
            titulo={`Ascendente ${i + 1}`}
            nome={a.nome}
            nif={a.nif}
            onNome={(v) => setAscendentes(ascendentes.map((x) => (x.id === a.id ? { ...x, nome: v } : x)))}
            onNif={(v) => setAscendentes(ascendentes.map((x) => (x.id === a.id ? { ...x, nif: v } : x)))}
            onRemover={() => setAscendentes(ascendentes.filter((x) => x.id !== a.id))}
          >
            <div className="col-span-2 space-y-2">
              <Checkbox checked={a.comunhao} onChange={(v) => setAscendentes(ascendentes.map((x) => (x.id === a.id ? { ...x, comunhao: v } : x)))} label="Vive em comunhão de habitação" />
              <Checkbox checked={a.rendimentoBaixo} onChange={(v) => setAscendentes(ascendentes.map((x) => (x.id === a.id ? { ...x, rendimentoBaixo: v } : x)))} label="Rendimento ≤ pensão mínima do regime geral" />
            </div>
          </PessoaEditor>
        ))}
        <BotaoAdicionar onClick={() => setAscendentes([...ascendentes, ascendenteVazio()])} texto="Adicionar ascendente" />
      </section>

      {/* Visão do agregado */}
      <div className="rounded-2xl border border-stone-100 bg-stone-50/70 p-4 dark:border-stone-700 dark:bg-stone-800/40">
        <div className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-stone-400">O teu agregado</div>
        <div className="flex flex-wrap gap-2">
          <CartaoAgregado icon={<User size={15} />} titulo={c.nome.trim() || (conjunta ? "Casal" : "Titular")} sub={conjunta ? "Tributação conjunta" : "Tributação individual"} destaque />
          {dependentes.map((d, i) => {
            const idade = idadeNoAnoFiscal(d.nascimento);
            return <CartaoAgregado key={d.id} icon={<User size={15} />} titulo={d.nome.trim() || `Dep. ${i + 1}`} sub={idade === null ? "dependente" : dependenteAte3(d) ? "≤ 3 anos" : `${idade} anos`} />;
          })}
          {ascQualif > 0 && <CartaoAgregado icon={<User size={15} />} titulo={`${ascQualif} ascend.`} sub="com dedução" />}
        </div>
      </div>
    </div>
  );
}

function PessoaEditor({
  titulo, nome, nif, onNome, onNif, onRemover, badge, children,
}: {
  titulo: string; nome: string; nif: string;
  onNome: (v: string) => void; onNif: (v: string) => void; onRemover: () => void;
  badge?: string; children: ReactNode;
}) {
  const nifMau = !validarNIF(nif);
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/40">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{titulo}</span>
          {badge && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500 dark:bg-stone-700 dark:text-stone-300">{badge}</span>}
        </div>
        <button type="button" onClick={onRemover} aria-label="Remover" className="flex-shrink-0 text-stone-400 transition-colors hover:text-red-500"><Trash size={15} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">Nome</label>
          <input value={nome} onChange={(e) => onNome(e.target.value)} placeholder="Nome" className={campoCls} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-stone-400">NIF</label>
          <input inputMode="numeric" value={nif} onChange={(e) => onNif(e.target.value)} placeholder="9 dígitos" className={`${campoCls} ${nifMau ? "border-red-400 focus:ring-red-400" : ""}`} />
        </div>
        {children}
      </div>
    </div>
  );
}

function BotaoAdicionar({ onClick, texto }: { onClick: () => void; texto: string }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:border-brand hover:text-brand dark:border-stone-600 dark:text-stone-400">
      <Plus size={13} /> {texto}
    </button>
  );
}

function CartaoAgregado({ icon, titulo, sub, destaque = false }: { icon: ReactNode; titulo: string; sub: string; destaque?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${destaque ? "border-brand bg-brand-light" : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900"}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${destaque ? "bg-brand text-white" : "bg-stone-100 text-stone-400 dark:bg-stone-800"}`}>{icon}</span>
      <div>
        <div className={`text-sm font-semibold ${destaque ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{titulo}</div>
        <div className={`text-[11px] ${destaque ? "text-brand" : "text-stone-400"}`}>{sub}</div>
      </div>
    </div>
  );
}

function SujeitoPassivoB({
  spb,
  setSpb,
  atividade,
  setAtividade,
  ef,
  estadoCivil,
}: {
  spb: RendimentosTitularB;
  setSpb: (s: RendimentosTitularB) => void;
  atividade: Atividade;
  setAtividade: (a: Atividade) => void;
  ef: ReturnType<typeof efeitoFiscal>;
  estadoCivil: EstadoCivil;
}) {
  const upd = (patch: Partial<RendimentosTitularB>) => setSpb({ ...spb, ...patch });
  const updC = (patch: Partial<Contribuinte>) => setSpb({ ...spb, contribuinte: { ...spb.contribuinte, ...patch } });
  const nifMau = !validarNIF(spb.contribuinte.nif);
  const elegivel = estadoCivil === "casado" || estadoCivil === "uniao";
  const num = (v: number) => (v ? String(v) : "");

  return (
    <section className="space-y-4 rounded-4xl border border-brand/25 bg-brand-light/40 p-5 shadow-card dark:border-brand/20 dark:bg-brand/5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <User size={18} />
          </span>
          <h3 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Sujeito passivo B</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
          <span className="font-semibold text-brand-dark dark:text-brand">Cônjuge</span>
          <InfoTip label="Sujeito passivo B">Na tributação conjunta agregam-se os rendimentos dos dois sujeitos passivos e aplica-se o quociente conjugal (Art. 69.º CIRS). A dedução específica do trabalho e o coeficiente/IRS Jovem da categoria B são apurados por pessoa.</InfoTip>
        </span>
      </div>

      {!elegivel && (
        <div className="rounded-xl border border-alert-border bg-alert-bg px-3 py-2 text-xs text-alert-text">
          A tributação conjunta destina-se a casados ou unidos de facto. Ajusta o estado civil acima se necessário.
        </div>
      )}

      <p className="text-sm text-stone-600 dark:text-stone-300">Identificação e rendimentos próprios do cônjuge. Preenche apenas o que se aplica.</p>

      {/* Identificação */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="spb-nome" className={`mb-1.5 block ${rotuloCls}`}>Nome</label>
          <input id="spb-nome" value={spb.contribuinte.nome} onChange={(e) => updC({ nome: e.target.value })} placeholder="Nome completo" className={campoCls} />
        </div>
        <div>
          <label htmlFor="spb-nif" className={`mb-1.5 block ${rotuloCls}`}>NIF</label>
          <input id="spb-nif" inputMode="numeric" value={spb.contribuinte.nif} onChange={(e) => updC({ nif: e.target.value })} placeholder="9 dígitos" className={`${campoCls} ${nifMau ? "border-red-400 focus:ring-red-400" : ""}`} />
          {nifMau && <p className="mt-1 text-[11px] text-red-500">NIF inválido.</p>}
        </div>
        <div>
          <label htmlFor="spb-nasc" className={`mb-1.5 block ${rotuloCls}`}>Data de nascimento</label>
          <DatePicker id="spb-nasc" value={spb.contribuinte.nascimento} onChange={(v) => updC({ nascimento: v })} ariaLabel="Data de nascimento do sujeito passivo B" />
        </div>
      </div>

      {/* Trabalho dependente */}
      <div className="space-y-3 rounded-2xl border border-stone-100 bg-white/70 p-4 dark:border-stone-700 dark:bg-stone-900/40">
        <div className="flex items-center gap-1.5">
          <Briefcase size={15} className="text-stone-400" />
          <span className={rotuloCls}>Trabalho dependente (Anexo A)</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo id="spb-sal-bruto" label="Salário bruto anual (€)" value={num(spb.salBruto)} onChange={(v) => upd({ salBruto: n(v) })} step={500} />
          <Campo id="spb-sal-ret" label="Retenções de IRS (€)" value={num(spb.salRet)} onChange={(v) => upd({ salRet: n(v) })} step={100} />
        </div>
      </div>

      {/* Trabalho independente */}
      <div className="space-y-3 rounded-2xl border border-stone-100 bg-white/70 p-4 dark:border-stone-700 dark:bg-stone-900/40">
        <div className="flex items-center gap-1.5">
          <Invoice size={15} className="text-stone-400" />
          <span className={rotuloCls}>Trabalho independente (Anexo B)</span>
        </div>
        <ActivityCombobox value={atividade} onChange={setAtividade} />
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg bg-brand-light px-2.5 py-1 font-semibold text-brand-dark">Coef. {pct(ef.coef)}</span>
          <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">Ret. {pct(ef.retencao)}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo id="spb-ind-bruto" label="Faturação anual (€)" value={num(spb.indBruto)} onChange={(v) => upd({ indBruto: n(v) })} step={500} />
          <Campo id="spb-ind-ret" label="Retenções pagas (€)" value={num(spb.indRet)} onChange={(v) => upd({ indRet: n(v) })} step={100} />
        </div>
        <SeletorCartoes
          label="Regime de contabilidade"
          opcoes={[
            { id: "simplificado" as const, label: "Simplificado", sub: `Coef. ${pct(ef.coef)}` },
            { id: "organizada" as const, label: "Contab. organizada", sub: "Receitas − despesas" },
          ]}
          valor={spb.indRegime}
          onChange={(v) => upd({ indRegime: v })}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="spb-ind-despesas" className={`mb-1.5 block ${rotuloCls}`}>{spb.indRegime === "organizada" ? "Despesas reais (€)" : "Despesas justificadas (€)"}</label>
            <input id="spb-ind-despesas" type="number" inputMode="decimal" min={0} step={100} value={num(spb.indDespesas)} onChange={(e) => upd({ indDespesas: n(e.target.value) })} placeholder="0" className={campoCls} />
          </div>
          <div>
            <label htmlFor="spb-ind-ano" className={`mb-1.5 block ${rotuloCls}`}>Ano de atividade</label>
            <select id="spb-ind-ano" value={spb.indAno} onChange={(e) => upd({ indAno: Number(e.target.value) })} className={campoCls}>
              <option value={1}>1.º ano (−50%)</option>
              <option value={2}>2.º ano (−25%)</option>
              <option value={3}>3.º ano ou seguinte</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="spb-ind-jovem" className={`mb-1.5 block ${rotuloCls}`}>IRS Jovem</label>
          <select id="spb-ind-jovem" value={spb.indJovem} onChange={(e) => upd({ indJovem: Number(e.target.value) })} className={campoCls}>
            <option value={0}>Não aplicável</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((ano) => (
              <option key={ano} value={ano}>{`${ano}.º ano — isenção ${pct(IRS_JOVEM.isencaoPorAno.value[ano])}`}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Checkbox checked={spb.indIsencaoSS} onChange={(v) => upd({ indIsencaoSS: v })} label="1.º ano de atividade — isenção de SS" />
          <Checkbox checked={spb.indAcumula} onChange={(v) => upd({ indAcumula: v })} label="Acumulação com trabalho dependente" />
        </div>
      </div>

      {/* Pensões */}
      <div className="space-y-3 rounded-2xl border border-stone-100 bg-white/70 p-4 dark:border-stone-700 dark:bg-stone-900/40">
        <div className="flex items-center gap-1.5">
          <User size={15} className="text-stone-400" />
          <span className={rotuloCls}>Pensões (Anexo A)</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo id="spb-pens-bruto" label="Pensões brutas anuais (€)" value={num(spb.pensBruto)} onChange={(v) => upd({ pensBruto: n(v) })} step={500} />
          <Campo id="spb-pens-ret" label="Retenções de IRS (€)" value={num(spb.pensRet)} onChange={(v) => upd({ pensRet: n(v) })} step={100} />
        </div>
      </div>

      <Checkbox checked={spb.deficiencia} onChange={(v) => upd({ deficiencia: v })} label="Sujeito passivo B com deficiência ≥ 60%"
        sub="Exclui 15% dos rendimentos da categoria B (máx €2 500). Exige atestado médico (Art. 56.º-A CIRS)." />
    </section>
  );
}

function ModalImportacao({
  aberto,
  fontes,
  onFechar,
  onImportar,
}: {
  aberto: boolean;
  fontes: FonteImportacao[];
  onFechar: () => void;
  onImportar: (selecionadas: FonteImportacao[]) => void;
}) {
  const [selecao, setSelecao] = useState<Record<string, boolean>>({});

  // Por defeito, todas as fontes disponíveis ficam selecionadas ao abrir.
  useEffect(() => {
    if (aberto) {
      const inicial: Record<string, boolean> = {};
      fontes.forEach((f) => { inicial[f.id] = true; });
      setSelecao(inicial);
    }
  }, [aberto, fontes]);

  const escolhidas = fontes.filter((f) => selecao[f.id]);

  return (
    <AnimatePresence>
      {aberto && (
        <m.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-900/40 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onFechar}
        >
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Importar dados de outros simuladores"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-4xl border border-stone-200 bg-white shadow-float dark:border-stone-700 dark:bg-stone-900 sm:rounded-4xl"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 p-5 dark:border-stone-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15">
                  <Sparkle size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Importar dados</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Reutiliza o que já preencheste noutros simuladores.</p>
                </div>
              </div>
              <button type="button" onClick={onFechar} aria-label="Fechar" className="flex-shrink-0 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800">
                <Close size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-5">
              {fontes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center dark:border-stone-700 dark:bg-stone-800/40">
                  <Sparkle size={22} className="mx-auto mb-2 text-stone-300" />
                  <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Ainda não há dados para importar</p>
                  <p className="mt-1 text-xs text-stone-400">
                    Usa a calculadora de recibos verdes, o simulador de vencimento ou o de abrir empresa — os teus dados ficam disponíveis aqui.
                  </p>
                </div>
              )}
              {fontes.map((f) => {
                const Icon = ICONES[f.icone] ?? Receipt;
                const sel = !!selecao[f.id];
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => setSelecao((s) => ({ ...s, [f.id]: !s[f.id] }))}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                      sel ? "border-brand bg-brand-light" : "border-stone-200 bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800/40"
                    }`}
                  >
                    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${sel ? "bg-brand text-white" : "bg-white text-stone-400 dark:bg-stone-800"}`}>
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold ${sel ? "text-brand-dark" : "text-stone-700 dark:text-stone-200"}`}>{f.titulo}</div>
                      <div className={`text-[11px] leading-snug ${sel ? "text-brand" : "text-stone-400"}`}>{f.descricao}</div>
                      {f.detalhes.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {f.detalhes.map((d, i) => (
                            <span key={i} className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${sel ? "bg-white/70 text-brand-dark dark:bg-stone-900/40" : "bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-300"}`}>{d}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${sel ? "border-brand bg-brand text-white" : "border-stone-300 text-transparent dark:border-stone-600"}`}>
                      <Check size={12} />
                    </span>
                  </button>
                );
              })}
            </div>

            {fontes.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-stone-100 p-5 dark:border-stone-800">
                <button type="button" onClick={onFechar} className="rounded-xl px-3 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:text-stone-700 dark:text-stone-400">
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={escolhidas.length === 0}
                  onClick={() => onImportar(escolhidas)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-dark disabled:opacity-40"
                >
                  <Sparkle size={15} /> Preencher {escolhidas.length > 0 ? `(${escolhidas.length})` : ""}
                </button>
              </div>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function PassoDeducoes(props: {
  saude: string; setSaude: (v: string) => void;
  educacao: string; setEducacao: (v: string) => void;
  gerais: string; setGerais: (v: string) => void;
  rendasDed: string; setRendasDed: (v: string) => void;
  lares: string; setLares: (v: string) => void;
  pensaoAlimentos: string; setPensaoAlimentos: (v: string) => void;
  pprValor: string; setPprValor: (v: string) => void;
  pprIdade: "ate35" | "de35a50" | "mais50"; setPprIdade: (v: "ate35" | "de35a50" | "mais50") => void;
  donativoValor: string; setDonativoValor: (v: string) => void;
  donativoTipo: TipoDonativo; setDonativoTipo: (v: TipoDonativo) => void;
  pagamentosPorConta: string; setPagamentosPorConta: (v: string) => void;
}) {
  const {
    saude, setSaude, educacao, setEducacao, gerais, setGerais, rendasDed, setRendasDed,
    lares, setLares, pensaoAlimentos, setPensaoAlimentos,
    pprValor, setPprValor, pprIdade, setPprIdade, donativoValor, setDonativoValor, donativoTipo, setDonativoTipo,
    pagamentosPorConta, setPagamentosPorConta,
  } = props;
  const pprLimite = DEDUCAO_PPR.value[pprIdade];
  const pprBeneficio = Math.min(n(pprValor) * DEDUCAO_PPR.value.taxa, pprLimite);
  const opcaoDonativo = DONATIVOS_MAJORACOES.value[donativoTipo];
  const donativoBeneficio = n(donativoValor) * opcaoDonativo.fator * DEDUCAO_DONATIVOS.value.taxa;
  const campos = [
    { id: "saude", label: "Saúde (€)", v: saude, set: setSaude, nota: `${pct(DEDUCAO_SAUDE.value.taxa)} → máx ${fmt(DEDUCAO_SAUDE.value.limite)}` },
    { id: "educacao", label: "Educação (€)", v: educacao, set: setEducacao, nota: `${pct(DEDUCAO_EDUCACAO.value.taxa)} → máx ${fmt(DEDUCAO_EDUCACAO.value.limite)}` },
    { id: "gerais", label: "Despesas gerais (€)", v: gerais, set: setGerais, nota: `${pct(DEDUCAO_DESP_GERAIS.value.taxa)} → máx ${fmt(DEDUCAO_DESP_GERAIS.value.limite)}` },
    { id: "rendas-ded", label: "Rendas habitação (€)", v: rendasDed, set: setRendasDed, nota: `${pct(DEDUCAO_RENDAS.value.taxa)} → máx ${fmt(DEDUCAO_RENDAS.value.limite)}` },
    { id: "lares", label: "Lares (€)", v: lares, set: setLares, nota: `${pct(DEDUCAO_LARES.value.taxa)} → máx ${fmt(DEDUCAO_LARES.value.limite)}` },
  ];
  return (
    <>
      <section className="space-y-4 rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Despesas e deduções</h2>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            <span className="font-semibold text-brand-dark dark:text-brand">Anexo H</span><span aria-hidden>·</span><span>Deduções à coleta</span>
            <InfoTip label="O que é o Anexo H">As deduções à coleta reduzem o imposto a pagar (não o rendimento). Estão sujeitas a um limite global em função do rendimento (Art. 78.º n.º 7 CIRS). Muitas são pré-preenchidas pela AT a partir do e-fatura.</InfoTip>
          </span>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400">Indica os valores anuais. Aplicamos a percentagem dedutível e o respetivo limite legal.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {campos.map((f) => (
            <div key={f.id}>
              <label htmlFor={f.id} className={`mb-1 block ${rotuloCls}`}>{f.label}</label>
              <div className="mb-1 text-[10px] text-stone-400">{f.nota}</div>
              <input id={f.id} type="number" inputMode="decimal" min={0} step={50} value={f.v} onChange={(e) => f.set(e.target.value)} placeholder="0" className={campoCls} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo id="pensao-alimentos" label="Pensões de alimentos pagas (€)" value={pensaoAlimentos} onChange={setPensaoAlimentos} step={100}
            tooltip={`Importâncias pagas por decisão judicial. Deduz ${pct(DEDUCAO_PENSAO_ALIMENTOS.value)} à coleta, sem limite e fora do limite global (Art. 83.º-A CIRS).`} />
          <Campo id="ppc" label="Pagamentos por conta já feitos (€)" value={pagamentosPorConta} onChange={setPagamentosPorConta} step={100}
            tooltip="Adiantamentos de IRS pagos ao longo do ano pelos trabalhadores independentes (Art. 102.º CIRS). Abatem ao imposto final, tal como as retenções." />
        </div>
        {n(pensaoAlimentos) > 0 && (
          <p className="rounded-xl bg-brand-light px-3 py-2 text-xs text-brand-dark">
            Benefício de pensões de alimentos: {fmt(n(pensaoAlimentos) * DEDUCAO_PENSAO_ALIMENTOS.value)} ({pct(DEDUCAO_PENSAO_ALIMENTOS.value)}, sem limite)
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="font-display text-base font-semibold text-stone-800 dark:text-stone-100">Benefícios fiscais</h3>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            <span className="font-semibold text-brand-dark dark:text-brand">Anexo H</span><span aria-hidden>·</span><span>EBF</span>
          </span>
        </div>

        {/* PPR */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo id="ppr-valor" label="PPR aplicado no ano (€)" value={pprValor} onChange={setPprValor} step={100}
            tooltip="Plano poupança-reforma. Deduz 20% do valor aplicado à coleta, com limite por idade (Art. 21.º EBF)." />
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="ppr-idade" className={rotuloCls}>Idade a 1 de janeiro</label>
              <InfoTip>O limite da dedução do PPR depende da idade: {fmt(DEDUCAO_PPR.value.ate35)} (&lt; 35), {fmt(DEDUCAO_PPR.value.de35a50)} (35–50), {fmt(DEDUCAO_PPR.value.mais50)} (&gt; 50).</InfoTip>
            </div>
            <select id="ppr-idade" value={pprIdade} onChange={(e) => setPprIdade(e.target.value as "ate35" | "de35a50" | "mais50")} className={campoCls}>
              <option value="ate35">Menos de 35 anos — máx {fmt(DEDUCAO_PPR.value.ate35)}</option>
              <option value="de35a50">35 a 50 anos — máx {fmt(DEDUCAO_PPR.value.de35a50)}</option>
              <option value="mais50">Mais de 50 anos — máx {fmt(DEDUCAO_PPR.value.mais50)}</option>
            </select>
          </div>
        </div>
        {n(pprValor) > 0 && (
          <p className="rounded-xl bg-brand-light px-3 py-2 text-xs text-brand-dark">
            Benefício PPR estimado: {fmt(pprBeneficio)} {n(pprValor) * DEDUCAO_PPR.value.taxa > pprLimite ? `(limitado ao teto de ${fmt(pprLimite)})` : ""}
          </p>
        )}

        {/* Donativos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo id="donativos" label="Donativos (€)" value={donativoValor} onChange={setDonativoValor} step={50}
            tooltip="Estatuto do Mecenato (Art. 62.º/63.º EBF): deduz 25% sobre o valor majorado, até 15% da coleta (sem limite para donativos ao Estado)." />
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="donativo-tipo" className={rotuloCls}>Tipo de entidade</label>
              <InfoTip>A majoração depende do fim do donativo: social/religioso conta a 130%, cultural/ambiental/infância a 140%. Donativos ao Estado não têm o limite de 15% da coleta (Art. 62.º EBF).</InfoTip>
            </div>
            <select id="donativo-tipo" value={donativoTipo} onChange={(e) => setDonativoTipo(e.target.value as TipoDonativo)} className={campoCls}>
              {(Object.keys(DONATIVOS_MAJORACOES.value) as TipoDonativo[]).map((k) => (
                <option key={k} value={k}>{DONATIVOS_MAJORACOES.value[k].label}</option>
              ))}
            </select>
          </div>
        </div>
        {n(donativoValor) > 0 && (
          <p className="rounded-xl bg-brand-light px-3 py-2 text-xs text-brand-dark">
            Benefício estimado: {fmt(donativoBeneficio)} ({pct(DEDUCAO_DONATIVOS.value.taxa)}{opcaoDonativo.fator > 1 ? ` sobre +${pct(opcaoDonativo.fator - 1)} majorado` : ""})
            {opcaoDonativo.semLimite ? " · sem limite de coleta" : ` · limitado a ${pct(DEDUCAO_DONATIVOS.value.limiteColeta)} da coleta`}
          </p>
        )}

        <p className="text-[11px] leading-relaxed text-stone-400">
          PPR e donativos contam para o limite global das deduções à coleta (Art. 78.º n.º 7). A dedução por ascendentes é
          definida na etapa do agregado.
        </p>
      </section>
    </>
  );
}

function PassoRevisao({
  estado,
  resultado,
  erros,
  avisos,
  oportunidades,
  completude,
  onExportar,
  onExportarCSV,
  onLimpar,
  gravadoLabel,
}: {
  estado: EstadoDeclaracao;
  resultado: ReturnType<typeof simularDeclaracaoIRS>;
  erros: ReturnType<typeof validarDeclaracao>;
  avisos: ReturnType<typeof validarDeclaracao>;
  oportunidades: ReturnType<typeof validarDeclaracao>;
  completude: ReturnType<typeof calcularCompletude>;
  onExportar: () => void;
  onExportarCSV: () => void;
  onLimpar: () => void;
  gravadoLabel: string;
}) {
  return (
    <>
      {/* Ações */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onExportar}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-dark"
        >
          <Export size={16} /> Exportar / imprimir
        </button>
        <button
          type="button"
          onClick={onExportarCSV}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:border-brand hover:text-brand dark:border-stone-700 dark:text-stone-300"
        >
          <Export size={15} /> CSV
        </button>
        <button
          type="button"
          onClick={onLimpar}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-500 transition-colors hover:border-red-300 hover:text-red-600 dark:border-stone-700 dark:text-stone-400"
        >
          <Trash size={15} /> Recomeçar
        </button>
        <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
          <Check size={12} className="text-brand" /> {gravadoLabel}
        </span>
      </div>

      {/* Completude */}
      <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Completude da declaração</h2>
        <div className="mt-3 space-y-2">
          <EstadoLinha titulo="Identificação e agregado" estado="concluido" />
          {completude.modulos.map((m) => (
            <EstadoLinha key={m.id} titulo={m.titulo} estado={m.estado} />
          ))}
        </div>
      </section>

      {/* Validação */}
      {(erros.length > 0 || avisos.length > 0 || oportunidades.length > 0) && (
        <section className="space-y-2.5">
          {[...erros, ...avisos, ...oportunidades].map((v) => (
            <CartaoValidacao key={v.id} nivel={v.nivel} titulo={v.titulo} detalhe={v.detalhe} anexo={v.anexo} />
          ))}
        </section>
      )}

      {/* Revisão por categoria */}
      <section className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Revisão dos rendimentos</h2>
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between border-b border-stone-200/60 py-2 dark:border-stone-700/60">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">Tipo de tributação</span>
            <span className="text-sm text-stone-500 dark:text-stone-400">{estado.conjunta ? "Conjunta (quociente conjugal)" : "Individual"}</span>
          </div>
          {resultado.componentes.length === 0 && (
            <p className="py-2 text-sm text-stone-400">Ainda não introduziste rendimentos.</p>
          )}
          {resultado.componentes.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-stone-200/60 py-2 last:border-0 dark:border-stone-700/60">
              <div>
                <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{c.rotulo}</span>
                <div className="text-[11px] text-stone-400">
                  {c.anexo} · {c.englobado > 0 ? `${fmt(c.englobado)} englobado` : c.impostoAutonomo > 0 ? `${fmt(c.impostoAutonomo)} de imposto autónomo` : "isento"}
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums text-stone-700 dark:text-stone-300">{fmt(c.bruto)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Comparador de cenários */}
      {resultado.rendimentoGlobal > 0 && <ComparadorCenarios estado={estado} />}

      {/* Visualizações executivas */}
      {resultado.rendimentoGlobal > 0 && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
            <h3 className="mb-4 font-display text-base font-semibold text-stone-800 dark:text-stone-100">Origem dos rendimentos</h3>
            <ErrorBoundary etiqueta="o gráfico de rendimentos">
              <DistribuicaoRendimento componentes={resultado.componentes} />
            </ErrorBoundary>
          </div>
          <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6">
            <h3 className="mb-4 font-display text-base font-semibold text-stone-800 dark:text-stone-100">Para onde vai o teu dinheiro</h3>
            <ErrorBoundary etiqueta="o gráfico fiscal">
              <DistribuicaoFiscal rendimentoGlobal={resultado.rendimentoGlobal} irsTotal={resultado.irsTotal} ssAnual={resultado.ssAnual} />
            </ErrorBoundary>
          </div>
        </section>
      )}

      {/* Memória de cálculo */}
      <MemoriaCalculo memoria={resultado.memoria} />
    </>
  );
}

function EstadoLinha({ titulo, estado }: { titulo: string; estado: "nao-iniciado" | "em-preenchimento" | "concluido" }) {
  const meta = {
    concluido: { cor: "text-brand", icon: <Check size={12} className="text-brand" />, label: "Concluído" },
    "em-preenchimento": { cor: "text-alert-text", icon: <ChevronDown size={12} className="text-alert-text" />, label: "Em preenchimento" },
    "nao-iniciado": { cor: "text-stone-400", icon: <span className="block h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-600" />, label: "Não iniciado" },
  }[estado];
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-600 dark:text-stone-300">{titulo}</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${meta.cor}`}>{meta.icon}{meta.label}</span>
    </div>
  );
}

function MemoriaCalculo({ memoria }: { memoria: ReturnType<typeof simularDeclaracaoIRS>["memoria"] }) {
  const [open, setOpen] = useState(true);
  if (memoria.length === 0) return null;
  return (
    <section className="rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-700 dark:bg-stone-900">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 p-5 text-left sm:p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">Memória de cálculo</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">Cada valor, a fórmula e a base legal.</p>
        </div>
        <ChevronDown size={18} className={`flex-shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-1 px-5 pb-5 sm:px-6 sm:pb-6">
          {memoria.map((l, i) => (
            <div key={i} className="flex items-start justify-between gap-3 border-b border-stone-200/60 py-2 last:border-0 dark:border-stone-700/60">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {l.anexo && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-dark dark:bg-stone-800 dark:text-brand">{l.anexo}</span>}
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{l.rotulo}</span>
                </div>
                {l.formula && <div className="mt-0.5 text-[11px] text-stone-400">{l.formula}</div>}
                {l.baseLegal && <div className="text-[11px] italic text-stone-400">{l.baseLegal}</div>}
              </div>
              <span className={`flex-shrink-0 text-sm font-semibold tabular-nums ${l.valor < 0 ? "text-brand" : "text-stone-700 dark:text-stone-300"}`}>
                {l.valor < 0 ? "− " : ""}{fmt(Math.abs(l.valor))}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ResumoLateral({
  resultado,
  reembolso,
  completude,
  nErros,
}: {
  resultado: ReturnType<typeof simularDeclaracaoIRS>;
  reembolso: boolean;
  completude: ReturnType<typeof calcularCompletude>;
  nErros: number;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-4xl border border-stone-200 bg-cream p-6 shadow-card dark:border-stone-700 dark:bg-stone-900">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {reembolso ? "Reembolso estimado" : "Imposto a pagar estimado"}
        </div>
        <div className={`mb-4 font-display text-4xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}>
          <AnimatedNumber value={Math.abs(resultado.saldo)} />
        </div>
        <div className="space-y-1">
          <Linha label="Rendimento global" value={resultado.rendimentoGlobal} />
          <Linha label="Rendimento coletável" value={resultado.rendimentoColetavel} note="Base do englobamento" />
          <Linha label="Coleta (englobamento)" value={resultado.coletaEnglobamento} />
          {resultado.impostoAutonomo > 0 && <Linha label="Tributação autónoma" value={resultado.impostoAutonomo} sinal="+" />}
          {resultado.deducoesColeta > 0 && <Linha label="Deduções à coleta" value={resultado.deducoesColeta} sinal="−" />}
          {resultado.creditoDuplaTributacao > 0 && <Linha label="Crédito dupla tributação" value={resultado.creditoDuplaTributacao} sinal="−" />}
          <Linha label="IRS total estimado" value={resultado.irsTotal} forte note={`Taxa efetiva ${pct(resultado.taxaEfetiva)}`} />
          {resultado.retencoesTotais + resultado.pagamentosPorConta > 0 && (
            <Linha label="Retenções + pag. por conta" value={resultado.retencoesTotais + resultado.pagamentosPorConta} sinal="−" />
          )}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl border-2 border-brand bg-white p-3 dark:bg-stone-800">
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">{reembolso ? "A receber" : "A pagar"}</span>
          <span className={`font-display text-xl font-semibold ${reembolso ? "text-brand" : "text-alert-text"}`}>
            <AnimatedNumber value={Math.abs(resultado.saldo)} />
          </span>
        </div>
        {resultado.ssAnual > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-100 px-3 py-2 text-xs dark:bg-stone-800">
            <span className="text-stone-500 dark:text-stone-400">Segurança Social (cat. B)</span>
            <span className="font-semibold tabular-nums text-stone-700 dark:text-stone-300">{fmt(resultado.ssAnual)}</span>
          </div>
        )}
      </div>

      {nErros > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <Warning size={13} className="mt-0.5 flex-shrink-0" />
          <span>{nErros} {nErros === 1 ? "erro crítico" : "erros críticos"} a corrigir — vê a etapa de revisão.</span>
        </div>
      )}

      <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-700 dark:bg-stone-900">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Completude</span>
          <span className="text-sm font-bold tabular-nums text-brand">{completude.pontuacao}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${completude.pontuacao}%` }} />
        </div>
      </div>
    </div>
  );
}
