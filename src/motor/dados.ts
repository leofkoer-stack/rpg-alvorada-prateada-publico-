import type { Rng } from "./tipos";

export const rngPadrao: Rng = () => {
  // crypto quando houver; Math.random como reserva
  const c = (globalThis as any).crypto;
  if (c?.getRandomValues) {
    const a = new Uint32Array(1);
    c.getRandomValues(a);
    return a[0] / 2 ** 32;
  }
  return Math.random();
};

export function rolarDado(lados: number, rng: Rng = rngPadrao): number {
  return Math.floor(rng() * lados) + 1;
}

/** Converte número escrito no estilo brasileiro ("2.000", "1,5", "−3"). */
export function numeroBR(txt: string): number {
  const t = txt.trim().replace(/[−–]/g, "-").replace(/\s/g, "");
  if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
  return Number(t.replace(",", "."));
}

export interface RolagemExpr {
  expressao: string;
  dados: { lados: number; valor: number }[];
  modificador: number;
  multiplicador: number;
  total: number;
}

/**
 * Rola expressões como "XdY+Z", "d20", "1d4 + 1", "2d6 × 100", "2d6 × 2.000 PO".
 * Retorna null se a expressão não for entendida.
 */
export function rolarExpressao(expr: string, rng: Rng = rngPadrao): RolagemExpr | null {
  const limpa = expr.replace(/PO|PL/gi, "").replace(/[−–]/g, "-").trim();
  const m = limpa.match(/^(\d*)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*(?:[×x*]\s*([\d.,]+))?\s*(?:([+-])\s*(\d+))?$/i);
  if (!m) return null;
  const qtd = m[1] ? Number(m[1]) : 1;
  const lados = Number(m[2]);
  if (qtd < 1 || qtd > 100 || lados < 2 || lados > 1000) return null;
  const dados = Array.from({ length: qtd }, () => ({ lados, valor: rolarDado(lados, rng) }));
  let mod = 0;
  if (m[3]) mod += (m[3] === "-" ? -1 : 1) * Number(m[4]);
  if (m[6]) mod += (m[6] === "-" ? -1 : 1) * Number(m[7]);
  const mult = m[5] ? numeroBR(m[5]) : 1;
  const soma = dados.reduce((s, d) => s + d.valor, 0);
  // "XdY + Z" soma antes; "XdY × N" multiplica a soma dos dados.
  const total = m[5] ? (soma + (m[3] ? mod : 0)) * mult + (m[6] ? (m[6] === "-" ? -1 : 1) * Number(m[7]) : 0) : soma + mod;
  return { expressao: expr.trim(), dados, modificador: mod, multiplicador: mult, total };
}
