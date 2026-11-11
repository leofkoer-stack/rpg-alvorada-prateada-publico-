/** Serviço: d20 + cozinha + equipe (+1 por pessoa de Cozinha ou Salão, máximo +3). */
export const bonusEquipeServico = (equipe: { funcao?: string }[]) =>
  Math.min(3, (equipe ?? []).filter((p) => /cozinha|sal[aã]o/i.test(p.funcao ?? "")).length);

/** Receita base do estágio ("60 PO" → 60). */
export function receitaBaseCaldeirao(linhaEst: string[]): number {
  const m = (linhaEst[3] ?? "").match(/[\d.]+/);
  return m ? Number(m[0].replace(/\./g, "")) : 0;
}

/**
 * Multiplicador do resultado do serviço × cardápio.
 * A tabela `res` só dá número para sucesso por 5+ (×1,5), sucesso (normal) e falha (×0,5).
 * Para falha por 5+, 20 natural e 1 natural ela não fala da receita: devolve null (o dono digita).
 */
export function multiplicadorServico(classe: string, cardapio: "Simples" | "Caprichado" | "Ousado"): number | null {
  const card = cardapio === "Ousado" ? 2 : cardapio === "Caprichado" ? 1.5 : 1;
  const res = classe === "sucesso5" ? 1.5 : classe === "sucesso" ? 1 : classe === "falha" ? 0.5 : null;
  return res == null ? null : card * res;
}

/** Mesa para todos: 5 porções; metade com Pertencimento 2+. */
export const custoMesaParaTodos = (pertencimento: number) => (pertencimento >= 2 ? 2.5 : 5);

/** Validade das porções em semanas (raras: até o Mestre dizer → null). */
export const VALIDADE = { frescas: 1, comuns: 4, raras: null as number | null };
