/**
 * Versão do motor patronal.
 *
 * Substitui `policy-2026.ts`, que misturava a versão do motor com as regras
 * mutáveis das medidas do IEFP e com uma data de política que a interface
 * importava diretamente. As regras vivem agora no release; o que fica em
 * código é o número de versão do algoritmo (relatório, §14.2).
 */
export const EMPLOYMENT_OFFER_ENGINE_VERSION = "employment-offer-2.0.0";
