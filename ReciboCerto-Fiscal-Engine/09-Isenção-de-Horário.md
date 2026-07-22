# 09 — Isenção de horário

## Base legal

Artigos 218.º e 265.º do Código do Trabalho; artigo 2.º do CIRS; artigo 46.º do Código Contributivo.

## Regra do motor

A linha `schedule_exemption` recebe o montante já determinado pelo contrato/IRCT. É remuneração pecuniária sujeita a IRS e SS e integra a bolsa mensal normal.

## Por que o motor não calcula o mínimo automaticamente

O artigo 265.º depende da modalidade, IRCT e possível renúncia em funções de administração/direção. O nome da rubrica não revela estes factos. Um futuro calculador do direito mínimo deve pedir modalidade, IRCT aplicável, remuneração-base e estatuto funcional antes de gerar a linha.

## Algoritmo atual

```text
if documentedAmount absent: needs_input at builder
cash = documentedAmount
IRS base = documentedAmount
SS base = documentedAmount
bucket = normal_monthly
```

## Casos especiais

Isenção de horário não elimina limites de descanso nem transforma automaticamente todo trabalho adicional em não pago. Diferenças entre montante contratual e mínimo laboral pertencem à auditoria laboral, não à retenção fiscal.

## Testes

Montante zero explícito, linha positiva, combinação com horas extra, administrador com renúncia documentada e IRCT ausente.

## Fonte oficial

[Código do Trabalho consolidado](https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475).
