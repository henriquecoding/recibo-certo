// O cartão do Twitter/X reutiliza a mesma imagem do Open Graph. A configuração
// de rota tem de ser declarada localmente (não pode ser re-exportada); só a
// função de render é reutilizada.
import OpengraphImage from "./opengraph-image";

export const runtime = "nodejs";
export const alt = "ReciboCerto — Calculadora de Recibos Verdes, Salário Líquido e Simulador de Empresa 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OpengraphImage;
