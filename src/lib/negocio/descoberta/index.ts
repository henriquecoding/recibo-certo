// O contrato público do Opportunity Discovery Engine. Um só ponto de
// entrada: quem consome não precisa de saber em que ficheiro vive cada
// etapa, e mudar a arrumação interna não parte a interface.
export * from "./proveniencia";
export * from "./contexto/tipos";
export * from "./contexto/adequacao-declarada";
export * from "./contexto/perguntas";
export * from "./contexto/profundidade";
export * from "./conhecimento/tipos";
export * from "./conhecimento/grafo";
export * from "./conhecimento/adequacao-ativos";
export * from "./conhecimento/seeds";
export * from "./motor/tipos";
export * from "./motor/gerador";
export * from "./motor/restricoes";
export * from "./motor/viabilidade";
export * from "./motor/regulacao";
export * from "./motor/procura";
export * from "./motor/risco";
export * from "./motor/fit";
export * from "./motor/scoring";
export * from "./motor/confianca";
export * from "./motor/stress";
export * from "./motor/diversidade";
export * from "./motor/explicacao";
export * from "./motor/validacao";
export * from "./motor/planeador";
export * from "./motor/pipeline";
export * from "./motor/whatif";
export * from "./sessao/tipos";
export * from "./sessao/aprendizagem";
export * from "./historico/instantaneos";
