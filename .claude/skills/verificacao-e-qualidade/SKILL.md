---
name: verificacao-e-qualidade
description: Protocolo de verificação e qualidade do ReciboCerto. Usar ANTES de declarar qualquer alteração concluída — build, type-check, auditoria de segurança, smoke em runtime e checklist final.
---

# Verificação e qualidade — ReciboCerto

Nunca dizer "deve funcionar". Verificar com evidência. Nada está concluído sem isto.

## 1. Build + type-check + integridade fiscal
```
npm run build
```
Corre o TypeScript (strict) e, ao importar `fiscal-data.ts`, executa
`assertFiscalDataIntegrity()` — se os dados fiscais ficarem inconsistentes, o build
falha (é a rede de segurança). Tem de passar limpo.

## 2. Segurança de dependências
```
npm audit --audit-level=high
```
Tem de dar **0 vulnerabilidades high+**. Para corrigir, atualizar para a versão
corrigida e validar com build — **nunca** `npm audit fix --force` às cegas (já
tentou fazer downgrade do Next para uma major antiga). Para forçar uma transitiva,
usar `overrides` no `package.json` (precedente: `postcss`). O CI corre isto
(`.github/workflows/security-audit.yml`).

## 3. Monitor fiscal (quando mexes em dados)
```
npm run fiscal:check
```

## 4. Smoke em runtime
- Libertar a porta: matar processos `node` pendentes (a porta 3000 fica ocupada entre execuções).
- `npm run start` (produção) e confirmar HTTP 200 nas rotas tocadas; ou usar a
  ferramenta de preview.
- Validar conteúdo/valores reais (ex.: a soma bate certo) e, quando possível,
  interagir (mudar inputs, alternar tema) e confirmar reatividade.
- Se o screenshot do preview expirar (animações infinitas/transições), verificar
  por DOM via `eval` (ler texto, classes, ausência de overlay de erro do Next).
  Limpar `node` e `server*.log` no fim.

## 5. Checklist final (gate)
- [ ] Requisito resolvido; casos-limite e estados (vazio/erro/carregamento) tratados
- [ ] Modo claro intacto; dark mode coerente; responsivo (mobile→desktop)
- [ ] Acessibilidade (foco, teclado, contraste, `aria-*`, reduced-motion)
- [ ] **Sem emojis**; pt-PT; sem dados fiscais inventados/desatualizados
- [ ] `npm run build` ✓ · `npm audit` 0 high ✓ · runtime ✓
- [ ] Diff focado, sem mudanças fora do âmbito; riscos residuais comunicados honestamente

## Honestidade
Reportar o que foi verificado e o que fica por verificar. Não exagerar confiança
nem declarar conclusão prematura. Mudanças grandes: planear e validar antes.
