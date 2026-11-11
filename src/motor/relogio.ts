import type { Relogio } from "./tipos";

export function moverRelogio(r: Relogio, delta: number): Relogio {
  return { ...r, valor: Math.max(0, Math.min(r.tamanho, r.valor + delta)) };
}
export const relogioCheio = (r: Relogio) => r.valor >= r.tamanho;
export const zerarRelogio = (r: Relogio): Relogio => ({ ...r, valor: 0 });
