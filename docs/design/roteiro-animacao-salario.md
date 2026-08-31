# Roteiro de animação — «A conferência» (`/?foco=salario`)

> Fonte de verdade da coreografia deste palco. `components/foco/salario/coreografia.ts`
> guarda os tempos; `PalcoSalario.tsx` executa-os.
>
> A gramática de movimento é a de `roteiro-animacao-preco.md` §1.

---

## 0. O que este palco tem para dizer

> **O teu recibo pode estar errado, e dá para saber.**

O verbo é **conferir**. Este foco mostrava a mesma cascata de deduções do recibo
verde com outro número — e não é isso que a ferramenta faz de único. O que ela
tem e mais nenhuma tem é a **auditoria**: confrontar o recibo real com o que
devia ser.

Uma cascata de deduções não diz isso. **Duas colunas encostadas dizem-no sem uma
palavra** — e nenhum outro palco do site põe duas versões da mesma coisa lado a
lado.

### 0.1 A regra do destino comum, ao contrário

Em todos os outros palcos, o que se move em conjunto **agrupa-se**. Aqui o
agrupamento serve para **excluir**: as linhas que batem acendem todas ao mesmo
tempo, e a que não bate vê-se por **não** ter acendido com elas.

É a Lei do Destino Comum usada como pinça em vez de como cola. Por isso este ato
recebe o silêncio mais longo do site.

### 0.2 O erro encenado é real, e sai do motor

A entidade aplicou a tabela de retenção **sem o dependente declarado**. É o tipo
de engano que ninguém apanha a olho — não dá erro nenhum, dá um número plausível
— e que só se vê pondo as duas contas lado a lado.

As duas colunas saem do mesmo `calcularVencimento`, com a única diferença a ser
o dependente. Inventar a linha errada à mão seria encenar uma auditoria em vez de
a fazer.

---

## 1. A linha temporal

### ATO 1 — O RECIBO CHEGA · 2 600 ms

| ms | Cue | Movimento |
|---|---|---|
| 0 | `papel` | A coluna «No recibo» acende |
| 340 | `bruto` | O vencimento base |
| 640 | `linha1` | Segurança Social |
| 800 | `linha2` | Retenção de IRS |
| 960 | `linha3` | Subsídios |
| 1700 | `liquidoRecibo` | O líquido que a pessoa recebeu, a contar |

As três linhas entram a `PASSO.irmao`: são partes de um mesmo documento e têm de
se ler como um bloco, não como quatro avisos.

### ATO 2 — A CONTA REFAZ-SE · 3 000 ms

> Intenção: mostrar que a conta é pública e determinística.

| ms | Cue | Movimento |
|---|---|---|
| 0 | `abreColuna` | A coluna «Devia ser» abre, vazia |
| 380 | `calcSS` | 11% sobre o bruto |
| 540 | `calcIRS` | A retenção pela tabela certa |
| 700 | `calcSub` | Os subsídios |
| 1800 | `liquidoMotor` | O líquido recalculado, a contar |
| 2400 | `prontoParaConferir` | As duas colunas ficam prontas a comparar |

### ATO 3 — CONFRONTAR · 3 000 ms

> Intenção: a linha errada não é apontada. É deixada de fora.

| ms | Cue | Movimento |
|---|---|---|
| 0 | `encosta` | As duas colunas encostam-se |
| 620 | `bate1` | Vencimento base: verde |
| 710 | `bate2` | Segurança Social: verde |
| 800 | `bate3` | Subsídios: verde |
| — | — | **SILÊNCIO · 380 ms** (`PASSO.outro`) |
| 1600 | `falha` | A retenção de IRS: cruz, em barro |
| 2100 | `marcaFalha` | A linha inteira ganha fundo de barro |

**As três que batem acendem a `PASSO.uno` (90 ms)** para se lerem como *uma*
confirmação, e não como três.

**O silêncio de 380 ms é o beat de que tudo depende.** Sem ele, a linha errada
seria só mais uma a acender; com ele, é a única que ficou de fora.

### ATO 4 — EXPLICAR · 3 000 ms

| ms | Cue | Movimento |
|---|---|---|
| 0 | `abreExplicacao` | A caixa da explicação abre |
| 460 | `motivo` | Porquê: a tabela de quem não tem dependentes |
| 1300 | `anual` | A diferença ao fim de catorze meses, a contar |
| 2200 | `resolve` | O que acontece a retido a mais e a retido a menos |

---

## 2. O que este palco proíbe

- **Apontar a linha errada com uma seta.** Ela vê-se por não ter acendido com
  as outras. Uma seta faria o trabalho que o silêncio já faz, e pior.
- **Acender a linha errada ao mesmo tempo que as certas.** Aí passa a ser mais
  uma linha e o palco perde o argumento.
- **Inventar a diferença.** As duas colunas saem do mesmo motor. Escrever a
  linha errada à mão seria encenar uma auditoria em vez de a fazer.
- **Uma só coluna.** O confronto é a estrutura; sem ele isto volta a ser a
  cascata de deduções do recibo verde com outro número.
