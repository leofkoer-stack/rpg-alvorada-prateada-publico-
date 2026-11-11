import type { Medida } from "./tipos";

/** Bordas padrão; o Mestre pode editar (campanha.config.bordas). */
export interface Bordas {
  /** no nível mínimo com marcas negativas: fica no mínimo com 0 marcas */
  zerarNoMinimo: boolean;
  /** no nível máximo (ou no teto), as marcas param neste número */
  marcasMaxNoTopo: number;
}
export const BORDAS_PADRAO: Bordas = { zerarNoMinimo: true, marcasMaxNoTopo: 4 };

export interface OpcoesMedida {
  min?: number;
  max?: number;
  /** teto que trava a subida (ex.: governo, teto da rádio) */
  teto?: number | null;
  bordas?: Bordas;
}

export interface Conversao {
  antes: Medida;
  depois: Medida;
  subiu: boolean;
  desceu: boolean;
  travadoPeloTeto: boolean;
}

/**
 * Fechamento da semana para uma medida com marcas (5.1):
 * - 4 marcas ou mais: sobe 1 nível e as marcas zeram (o excesso se perde);
 * - marcas abaixo de 0: desce 1 nível e fica com 3 marcas;
 * - bordas: no mínimo com marcas negativas fica no mínimo com 0; no topo as marcas param em 4;
 * - teto trava a subida.
 */
export function fecharMedida(m: Medida, o: OpcoesMedida = {}): Conversao {
  const min = o.min ?? 0;
  const max = o.max ?? 5;
  const bordas = o.bordas ?? BORDAS_PADRAO;
  const limite = Math.min(max, o.teto ?? max);
  const antes = { ...m };
  let { nivel, marcas } = m;
  let subiu = false;
  let desceu = false;
  let travado = false;
  if (marcas >= 4) {
    if (nivel < limite) {
      nivel += 1;
      marcas = 0;
      subiu = true;
    } else {
      marcas = Math.min(marcas, bordas.marcasMaxNoTopo);
      travado = nivel < max;
    }
  } else if (marcas < 0) {
    if (nivel > min) {
      nivel -= 1;
      marcas = 3;
      desceu = true;
    } else if (bordas.zerarNoMinimo) {
      nivel = min;
      marcas = 0;
    }
  }
  return { antes, depois: { nivel, marcas }, subiu, desceu, travadoPeloTeto: travado };
}

export function somarMarcas(m: Medida, delta: number): Medida {
  return { nivel: m.nivel, marcas: m.marcas + delta };
}

/** Ajuste direto de nível (ex.: "+1 nível em Influência"), preso aos limites. */
export function somarNivel(m: Medida, delta: number, o: OpcoesMedida = {}): Medida {
  const min = o.min ?? 0;
  const max = Math.min(o.max ?? 5, delta > 0 ? (o.teto ?? 5) : 5);
  return { nivel: Math.max(min, Math.min(max, m.nivel + delta)), marcas: m.marcas };
}

export function escala(valor: number, delta: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, valor + delta));
}
