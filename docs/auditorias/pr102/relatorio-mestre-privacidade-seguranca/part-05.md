5. SBOM, Dependabot/Renovate, secret scanning, CodeQL/SAST, DAST e revisão de dependências.
6. Métricas sem conteúdo: falhas RLS, orphan objects, purge lag, audit gaps, sessões AAL1 em ações AAL2.

---

## 15. Critérios objetivos de aceitação

### 15.1 Modo local e importação PDF

- Com browser limpo e nível Máximo, importar/aplicar/simular não produz pedidos de rede além dos assets pré-carregados indispensáveis; teste Playwright interceta e falha qualquer egress não allowlisted.
- O PDF original nunca aparece em request body, logs, IndexedDB, Cache Storage, localStorage ou Supabase.
- Guardar apresenta destino explícito; cancelar deixa zero persistência.
- O teste inclui PDF multipágina, erro, cancelamento e navegação para trás.

### 15.2 Isolamento e troca de conta

- Semear dados A; logout; login B; B não lê, migra, sincroniza nem elimina A sem fluxo explícito autenticado.
- As chaves locais são account/vault-scoped; caches/filas também.
- Conta suspensa perde acesso no pedido seguinte, mesmo com token anterior.
- Admin de produto recebe zero colunas fiscais em SQL/API; teste com role real.

### 15.3 Eliminação e retenção

- Manifesto lista 100% das tabelas, buckets, chaves, caches, filas, vendors e backups aplicáveis.
- Job de eliminação é reiniciado após falha em cada passo e converge para zero objetos/linhas não excetuados.
- Não existe cobrança ativa órfã.
- `oldest_remaining` fica abaixo do SLA; alerta testado.
- Restauro de backup reaplica tombstones.

### 15.4 Partilhas e anexos

- Todas as colunas imutáveis recusam UPDATE por cliente, contabilista e API normal.
- Preview recursivo é byte-equivalent/canonicamente equivalente ao payload guardado.
- Partilha expirada/revogada ou vínculo suspenso não pode ser lido/downloaded.
- Upload sem slot, grande, MIME falso, assinatura inválida, sexto ficheiro ou objeto fora do prefixo é recusado.
- Orphan scanner encontra e remove o objeto artificial de teste.

### 15.5 Browser/analytics/terceiros

- CSP sem `unsafe-eval`, com nonce/hash e relatório de violações sem PII; scanner confirma headers em todas as rotas.
- XSS regression suite não consegue alcançar sinks conhecidos.
- Cada evento analytics rejeita propriedade não declarada, JSON aninhado, montante, NIF e URL livre.
- Vendor registry e egress inventory correspondem a todos os hostnames do bundle/código/config.
- Política gerada/revista a partir do mesmo inventário.

---

## 16. Proposta de arquitetura: política como código

O problema recorrente é haver regras em copy, stores, componentes, migrations e rotas sem uma fonte comum. Criar quatro artefactos versionados:

1. **Data Catalog:** dataset, campos, sensibilidade, sujeito, finalidade, destinos permitidos.
2. **Egress Registry:** ação, categorias, destinatário, endpoint, retenção, consentimento/necessidade.
3. **Retention Manifest:** TTL por destino, job, exceção, dono e métrica.
4. **Access Matrix:** papel × recurso × estado × comando, compilada em testes RLS/API.

Exemplo conceptual:

```ts
const DATASETS = {
  payrollReceipt: {
    sensitivity: "financial",
    defaultScope: "device",
    allowedScopes: ["memory", "session", "device", "cloud"],
    egress: ["serverPdf", "emailReport", "accountantShare"],
    localRetentionDays: 30,
    cloudRetentionDays: null,
  },
  fiscalProfile: {
    sensitivity: "financial+family",
    defaultScope: "memory",
    allowedScopes: ["memory", "device", "cloud"],
    egress: ["accountantShare", "fiz"],
  },
} as const;
```

Um `DataEgressGuard` deve ser a única porta para dados sensíveis saírem do browser/servidor:

```ts
await egress.request({
  action: "serverPdf",
  dataset: "payrollReceipt",
  fields: selectedFields,
  destination: "documentCompositor",
  policyVersion: settings.version,
  interactionId,
});
```

O guard valida preset, consentimento/necessidade, schema, destino, sessão/AAL, retenção e mostra confirmação quando exigida. Uma regra ESLint/dependency-cruiser impede importadores/simuladores de chamarem `fetch`, Supabase, email ou vendors diretamente. No servidor, a rota repete a decisão; nunca confiar no flag do cliente.

---

## 17. Funções adicionais para navegação e utilização mais seguras — configuráveis pela pessoa

Esta secção responde ao requisito de permitir que cada pessoa escolha “o quanto quer que seja seguro”, sem transformar segurança essencial numa opção perigosa. A forma correta não é um slider abstrato de 0 a 100: são presets explicáveis que configuram controlos reais. **TLS, RLS, validação server-side, CSP, isolamento, logs sem conteúdo, updates e proteção antiabuso são obrigatórios em todos os níveis e nunca podem ser desligados.**

### 17.1 Central de Privacidade e Segurança

Um ecrã único deve responder, para cada categoria:

| Pergunta | Informação/controlo |
|---|---|
| O que existe? | datasets, número de registos, tamanho aproximado e última alteração |
| Onde está? | memória, sessão, este dispositivo, cloud, contabilista/terceiro |
| Porque existe? | ação/finalidade e policy version |
| O que aguarda envio? | fila offline, destino, tentativa, expiração, cancelar |
| O que saiu recentemente? | recibo de egress sem payload: quando, categoria, destino, ação |
| Quando desaparece? | prazo e próxima purga; opção de reduzir |
| Quem tem acesso normal? | pessoa, contabilista específico, destinatário; estado/expiração |
| O que posso fazer? | exportar, mover, cifrar, revogar, eliminar por dataset ou tudo |

O inventário deve ser calculado das fontes reais e não de uma lista escrita à mão.

### 17.2 Presets propostos

| Controlo | Equilibrado — recomendado | Privado | Máximo | Personalizado |
|---|---|---|---|---|
| Receitas/cenários | dispositivo; cloud só se escolhida | dispositivo cifrado | só memória por defeito | por dataset |
| Perfil fiscal/draft IRS | memória + autosave local visível | dispositivo cifrado, TTL 7 dias | memória; perder ao fechar | âmbito + TTL |
| Sincronização | manual/visível | desligada por defeito | bloqueada até ação única | on/off por dataset/rede |
| Analytics | pedido opt-in | desligado | desligado e sem ID | opt-in |
| Exportação PDF | servidor com aviso | local quando possível; servidor one-shot | local apenas, salvo override com step-up | por ação |
| Email/FIZ/mapa externo | confirmação just-in-time | bloqueado por defeito | bloqueado; desbloqueio one-shot | allowlist |
| Partilha contabilista | campos escolhidos, 30 dias | 7 dias, download off | uso único/curto, AAL2 | prazo/permissões |
| Bloqueio de ecrã | 15 min | 5 min | 1 min/ao perder foco | 1–60 min |
| MFA/step-up | ações críticas | login novo + ações críticas | sempre para cloud/partilha/export/delete | matriz |
| Ocultar montantes | ao pedir | ao perder foco | sempre até revelar | toggles |
| Retenção local | manual/90 dias sugeridos | 30 dias | ao fechar/24 h | dias por dataset |

O preset escolhido deve apresentar um resumo concreto (“PDF original: memória; perfil fiscal: cifra local, 7 dias; analytics: off; partilhas: 7 dias”), não uma medalha vaga “100% seguro”.

### 17.3 Modelo de configuração

```ts
type StorageScope = "memory" | "session" | "device" | "cloud";
type PrivacyPreset = "balanced" | "private" | "maximum" | "custom";

interface PrivacySettingsV2 {
  version: 2;
  preset: PrivacyPreset;
  storage: {
    receipts: StorageScope;
    scenarios: StorageScope;
    fiscalProfile: StorageScope;
    irsDraft: StorageScope;
    deadlines: StorageScope;
  };
  sync: {
    enabled: boolean;
    offlineQueue: "off" | "encrypted";
    allowMeteredNetwork: boolean;
  };
  egress: {
    serverPdf: "allow" | "confirm" | "deny";
    emailReports: "allow" | "confirm" | "deny";
    accountantShares: "allow" | "confirm" | "deny";
    fiz: "allow" | "confirm" | "deny";
    externalMaps: "allow" | "confirm" | "deny";
  };
  telemetry: { productAnalytics: boolean };
  retention: {
    deviceDays: number | null;
    cloudDays: number | null;
    conversationDays: number | null;
    downloadsDays: number | null;
  };
  session: {
    autoLockMinutes: number;
    reauthForExport: boolean;
    reauthForDelete: boolean;
    requireAal2ForSensitiveActions: boolean;
  };
  display: {
    hideValuesOnBlur: boolean;
    privacyScreenByDefault: boolean;
    keepRecentSearches: boolean;
  };
}
