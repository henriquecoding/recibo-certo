/**
 * Dimensionamento de mercado bottom-up.
 *
 * A página anterior anunciava "TAM 1,3 M · SAM ~400 K · SOM ~50 K". São
 * CONTAGENS de entidades, não valor de mercado — e um investidor precisa das
 * duas coisas: quantos clientes potenciais existem e quanta receita anual isso
 * representa a um preço concreto.
 *
 * Aqui parte-se do que se sabe: um universo elegível com fonte pública, o
 * preço real do produto hoje, e duas taxas explicadas. Cada número da página
 * sai desta função — não há um único valor de mercado escrito à mão.
 */

export interface EntradaMercado {
  /** Universo elegível, em pessoas ou entidades. Precisa de fonte e data. */
  clientesElegiveis: number;
  /** Receita média mensal por conta, em euros. Hoje é o preço do Plus. */
  arpaMensalEur: number;
  /** Fatia realisticamente servível pelo produto atual. */
  fatiaServivel: number;
  /** Fatia dessa que se ambiciona conquistar em 5 anos. */
  fatiaAlcancavel5a: number;
}

export interface ResultadoMercado {
  tamClientes: number;
  tamArr: number;
  samClientes: number;
  samArr: number;
  somClientes: number;
  somArr: number;
}

export function marketSizing(entrada: EntradaMercado): ResultadoMercado {
  const anual = entrada.arpaMensalEur * 12;

  const tamClientes = entrada.clientesElegiveis;
  const samClientes = Math.floor(tamClientes * entrada.fatiaServivel);
  const somClientes = Math.floor(samClientes * entrada.fatiaAlcancavel5a);

  return {
    tamClientes,
    tamArr: tamClientes * anual,
    samClientes,
    samArr: samClientes * anual,
    somClientes,
    somArr: somClientes * anual,
  };
}

/**
 * Análise de sensibilidade: o mesmo cálculo com o preço a variar.
 *
 * Um único número de mercado é uma opinião disfarçada de facto. Três cenários
 * mostram o que muda quando o pressuposto muda — e o pressuposto que mais pesa
 * aqui é o preço, não o universo.
 */
export function sensibilidadePreco(
  entrada: EntradaMercado,
  precos: number[],
): { arpaMensalEur: number; resultado: ResultadoMercado }[] {
  return precos.map((arpaMensalEur) => ({
    arpaMensalEur,
    resultado: marketSizing({ ...entrada, arpaMensalEur }),
  }));
}
