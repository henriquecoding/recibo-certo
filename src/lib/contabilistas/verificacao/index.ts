// A porta única do motor de verificação. Quem precisa de verificar um
// contabilista importa daqui e não dos ficheiros internos — assim há um
// só sítio onde ver tudo o que este motor sabe fazer.

export * from "./fontes";
export * from "./identificadores";
export * from "./motor";
export * from "./registo-publico";
export {
  SCAP_HOSTS, configSCAP, scapEstaLigado, listarFornecedores, encontrarOrdem,
  pedirAtributos, obterAtributos, numeroNoAtributo, EXPLICACAO_SCAP,
  type AmbienteSCAP, type ConfigSCAP, type TipoDocumento, type SubAtributo,
  type AtributoCertificado, type FornecedorAtributos, type ResultadoSCAP,
  type PedidoAtributos,
} from "./scap";
