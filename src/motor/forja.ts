/** Jornadas do Miguelito pela trilha: níveis 0–1 → 2, 2–3 → 3, 4–5 → 4. */
export const jornadasMiguelito = (trilha: number) => (trilha >= 4 ? 4 : trilha >= 2 ? 3 : 2);

export interface EntradaJornadas {
  trazixEmDraetyr: boolean;
  miguelitoPresente: boolean;
  trilha: number;
  funcionariosForja: number;
  exBandidos: number;
  invocacaoAjudante: boolean;
  oozeDeGuarda: boolean;
}

/** Soma as jornadas da semana. Ex-bandidos só valem no balcão. */
export function jornadasDaSemana(e: EntradaJornadas) {
  const trazix = e.trazixEmDraetyr ? 5 : 0;
  const miguelito = e.miguelitoPresente ? jornadasMiguelito(e.trilha) : 0;
  const forja = Math.max(0, e.funcionariosForja);
  const invocacao = e.invocacaoAjudante && !e.oozeDeGuarda ? 1 : 0;
  const balcaoSo = Math.max(0, e.exBandidos);
  const geral = trazix + miguelito + forja + invocacao;
  return { trazix, miguelito, forja, invocacao, balcaoSo, geral, total: geral + balcaoSo };
}

/** Pedidos por semana: 1 com Renome 0–1; 2 com Renome 2–3; 3 com Renome 4+. */
export const pedidosPorSemana = (renome: number) => (renome >= 4 ? 3 : renome >= 2 ? 2 : 1);

/** PO por jornada no balcão: 64 com o Miguelito, 32 sem. */
export const poPorJornadaBalcao = (miguelito: boolean) => (miguelito ? 64 : 32);

/** Limite de venda do balcão: 100 × (Economia + 1) + 50 × Renome (+50 por funcionário de balcão). */
export const limiteBalcao = (economia: number, renome: number, funcionariosBalcao = 0) =>
  100 * (economia + 1) + 50 * renome + 50 * funcionariosBalcao;

/**
 * Venda do balcão: o que passa do limite vai para o estoque;
 * com Economia ≤ 1, metade das vendas vira escambo.
 */
export function vendaBalcao(jornadasBalcao: number, miguelito: boolean, economia: number, renome: number, funcionariosBalcao = 0) {
  const producao = jornadasBalcao * poPorJornadaBalcao(miguelito);
  const limite = limiteBalcao(economia, renome, funcionariosBalcao);
  const vendido = Math.min(producao, limite);
  const estoque = producao - vendido;
  const escambo = economia <= 1 ? Math.floor(vendido / 2) : 0;
  return { producao, limite, vendido, estoque, po: vendido - escambo, escambo };
}

/** CD do caderno: Entender e Desmontar 10 + 2 × círculo; Reconstruir 12 + 2 × círculo. */
export function cdCaderno(passo: number, circulo: number): number | null {
  if (passo <= 0) return null; // Observar: sem teste
  return passo === 3 ? 12 + 2 * circulo : 10 + 2 * circulo;
}
/** Círculo 6+ só desmonta com o Teto cheio. */
export const podeDesmontar = (circulo: number, tetoCheio: boolean) => circulo < 6 || tetoCheio;

/** Prazo do pedido: d4 + ★ semanas. */
export const prazoPedido = (d4: number, estrelas: number) => d4 + estrelas;
