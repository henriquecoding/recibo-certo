# A pasta `supabase/`

O que é cada coisa, o que corre quando, e o que não se deve tocar.

Escrito depois de uma auditoria completa contra a base de produção. Os
números aqui não são estimativas — foram contados.

---

## O mapa

```
supabase/
  config.toml          a CLI aponta ao projeto certo · LER antes de `db push`
  README.md            este ficheiro
  migrations/          71 ficheiros · a história do esquema, por ordem
  bundle/              1 ficheiro GERADO · a plataforma inteira, para colar
  tests/               15 ficheiros · a suíte de RLS, contra PostgreSQL a sério
  tests/manuais/       1 ficheiro · o que o arreio não consegue correr
```

---

## `migrations/` — a história, e porque tem dois formatos

Há duas convenções de nome, e **não é desleixo**: é a data em que o projeto
mudou de método.

| Formato | Quantas | O que são |
|---|---|---|
| `001_` … `053_` | 53 | Sequenciais. A aplicação base (001–041) e o arranque da plataforma de contabilistas (042–053). |
| `20260802_`, `20260813_` | 2 | Documentos emitidos e planos operacionais. Aplicação **base**, não plataforma. |
| `20260814…` em diante | 17 | A plataforma depois de agosto, com carimbo de data. |

**Ordenam-se corretamente por texto** — `0` vem antes de `2`, por isso as
sequenciais correm primeiro e as datadas por data. Isso é a ordem
cronológica real, e é a ordem por que têm de ser aplicadas.

### ⚠️ Não renomear migrações já aplicadas

Duas razões, e a segunda é a que morde:

1. **15 ficheiros de teste** referem migrações pelo caminho exato
   (`supabase/migrations/048_storage_endurecido.sql` e afins).
2. O registo da base guarda a *versão*, não o conteúdo. Renomear um
   ficheiro aplicado faz a CLI achar que é uma migração nova.

### Uma armadilha de ordem, já paga

`20260816120000_correcoes_painel_contabilista` recria
`resumo_clientes_do_contabilista` **com** `email_cliente`, e
`20260816150000_fronteira_de_contacto` é que a tira. Se a segunda corresse
primeiro — como corria quando se chamava `054_` — o contacto do cliente
voltava ao alcance do contabilista, em silêncio.

Por isso a fronteira tem carimbo de data e não número: para cair **depois**.

---

## O registo de migrações não bate com esta pasta

Facto, medido:

- **52** migrações do repositório não estão em
  `supabase_migrations.schema_migrations` — foram aplicadas antes de haver
  registo, ou pelo editor de SQL.
- **13** estão registadas com carimbos diferentes dos nomes dos ficheiros.
- **5** entradas do registo não têm ficheiro correspondente. Todas
  verificadas: são hotfixes que o repositório depois absorveu.

<details>
<summary>As 5 entradas sem ficheiro, e onde o conteúdo delas vive hoje</summary>

| Registo | Onde está no repositório |
|---|---|
| `create_auditorias_recibo` + `drop_auditorias_recibo` | Criada e apagada no mesmo dia. Não deixou nada. |
| `intervalo_aceita_vitalicio` | `033_concessoes_vitalicias_e_manuais.sql` — tem as duas constraints, conferidas contra a base. |
| `agendador_dos_avisos_extensoes` | `053_agendador_dos_avisos.sql` — cria as extensões, guardado por `pg_available_extensions`. |
| `restaurar_contrato_publico_com_regra_corrente` | `20260816170000_recebimentos_no_contrato_publico.sql` — recria a view com a mesma regra e mais uma coluna. |

</details>

**Consequência prática:** `supabase db push` tentaria reaplicar tudo. Ver
`config.toml`.

**O que fazer em vez disso:**

- alteração nova → ficheiro em `migrations/` + aplicar pelo painel;
- base nova de raiz → 001–041 e depois o `bundle/`.

---

## `bundle/` — gerado, não editar

`plataforma-contabilistas.sql` junta as **28** migrações da plataforma
(042 em diante) num ficheiro para colar no editor de SQL.

```bash
npm run migracoes:juntar         # regenerar
npm run migracoes:check          # falhar se estiver desatualizado
```

Assume as migrações **001–041 já aplicadas**: precisa de `profiles`,
`is_admin()`, `admin_auditoria` e `set_atualizado_em`.

> Durante um tempo o ficheiro anunciava-se como «todas as migrações da
> plataforma» e trazia 12 de 28 — o filtro só apanhava nomes numerados.
> Quem o colasse ficava sem a conversa segura, sem o LinkedIn, sem o
> contrato público, sem a fidelidade v2, sem os pagamentos e sem a sala.

Verificado: aplica limpo numa base vazia, e **duas vezes seguidas** sem
erro.

---

## `tests/` — RLS contra PostgreSQL a sério

```bash
npm run rls:check
```

Sobe um PostgreSQL descartável, imita o mínimo do Supabase
(`00-arreio-supabase.sql`), aplica as migrações **duas vezes** (para provar
idempotência) e exerce as políticas com cinco identidades.

Ler uma política não prova nada. Estas correm-se.

### O que o arreio aplica, e o que não

Aplica as numeradas 042–053 e duas datadas
(`fronteira_de_contacto`, `sala_de_acompanhamento`), que os testes 13 e 14
exercem.

**Não aplica as restantes datadas.** Tentou-se: elas aplicam-se sem erro,
mas mudam comportamento que os testes 02, 03, 04 e 12 afirmam contra o
esquema de 042–053 — a fidelidade passa a nascer inativa, o motivo de
recusa de `concluir_consulta` muda de nome, e uma proposta passa a exigir
leitura do contrato. Pô-las a correr exige atualizar esses quatro
ficheiros.

Fica por fazer **de olhos abertos**, e está escrito no próprio arreio.

### `tests/manuais/`

O que o arreio não consegue correr por precisar do esquema pré-042. Cada
ficheiro diz no cabeçalho como se corre.

---

## Verificar que isto continua verdade

```bash
npm run supabase:check      # o repositório cria tudo o que a base tem?
npm run rls:check           # as políticas fazem o que dizem?
npm run migracoes:check     # o bundle está em dia?
```

O primeiro é o que impede esta pasta de voltar a divergir da realidade.
Sem `SUPABASE_DB_URL` verifica só o que consegue offline e **diz** que o
resto ficou por verificar — não dá um visto verde a quem não olhou.

### O estado na última auditoria

- **216** objetos da aplicação em produção (tabelas, views e funções, sem
  contar as das extensões).
- **216** têm origem numa migração deste repositório. **Zero órfãos.**
- O bundle recria **175** — a diferença são os 41 da aplicação base, que
  ele assume aplicados e não traz.
