/** Zonas que contam como Torre: Sinal 2 ou mais (Estúdio local também tem torre). */
export function zonasComTorre(sinal: Record<string, { nivel: number } | number>): number {
  return Object.values(sinal ?? {}).filter((s) => (typeof s === "number" ? s : s?.nivel ?? 0) >= 2).length;
}
/** Teto: Audiência e cada Influência ≤ 1 + zonas com Sinal 2+, máximo 5. */
export const tetoRadio = (sinal: Record<string, any>) => Math.min(5, 1 + zonasComTorre(sinal));
/** Pautas por semana: 1 + 1 por zona com Torre. */
export const pautasPorSemana = (sinal: Record<string, any>) => 1 + zonasComTorre(sinal);
/** Acervo: soma das ★ do portfólio. */
export const somaAcervo = (portfolio: { estrelas?: number | null }[]) => (portfolio ?? []).reduce((s, g) => s + (Number(g.estrelas) || 0), 0);
/** Caixa: Estágio 3+ recebe Audiência × 100 PO. */
export const receitaRadio = (estagio: number, audiencia: number) => (estagio >= 3 ? audiencia * 100 : 0);
/** Manutenção: 50 PO por torre e 25 PO por estúdio. */
export function manutencaoRadio(sinal: Record<string, any>): number {
  let total = 0;
  for (const s of Object.values(sinal ?? {})) {
    const n = typeof s === "number" ? s : s?.nivel ?? 0;
    if (n >= 2) total += 50;
    if (n >= 3) total += 25;
  }
  return total;
}
