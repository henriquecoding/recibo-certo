```

## 17.4–17.8 — continuidade preservada

Esta parte complementa os presets e a Central de Privacidade com requisitos de uso quotidiano:

- configurações de privacidade ficam locais por defeito; sincronizá-las exige escolha explícita e versões desconhecidas devem falhar para a opção mais restritiva;
- o modo Privado/Máximo pode oferecer um cofre local cifrado, com chave mantida apenas durante a sessão desbloqueada, separação por conta e aviso claro de recuperação;
- partilhas com contabilista usam seleção recursiva, preview exato, prazo curto configurável, acesso/download controlados, revogação efetiva, nova partilha para alterações e reautenticação nas ações sensíveis;
- não prometer impedir screenshots ou cópias feitas legitimamente por quem recebeu acesso;
- sessões podem ter auto-lock, modo de ecrã partilhado, mascaramento de valores, gestão/revogação de dispositivos, reautenticação e bloqueio imediato;
- navegação externa e mapas devem mostrar o destino, usar allowlist, reduzir dados em URLs/logs e permitir utilização pontual sem histórico por defeito;
- manter um histórico local de egress sem payload, contendo apenas momento, categoria, destino, expiração e versão da política.

Os requisitos acima também foram incorporados em `../HANDOFF-CLAUDE.md` para que façam parte dos gates de implementação.
