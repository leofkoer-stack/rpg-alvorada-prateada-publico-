import type { Rng, Tabela } from "./tipos";
import { rolarDado, rngPadrao } from "./dados";

export type Classe = "nat20" | "nat1" | "sucesso5" | "sucesso" | "falha" | "falha5";
export type Modo = "normal" | "vantagem" | "desvantagem";

export const ROTULO_CLASSE: Record<Classe, string> = {
  nat20: "20 natural",
  nat1: "1 natural",
  sucesso5: "Sucesso por 5+",
  sucesso: "Sucesso",
  falha: "Falha",
  falha5: "Falha por 5+",
};

/** Classifica sempre nesta ordem: 20 nat, 1 nat, sucesso 5+, sucesso, falha, falha 5+. */
export function classificar(natural: number, total: number, cd: number): Classe {
  if (natural === 20) return "nat20";
  if (natural === 1) return "nat1";
  if (total >= cd + 5) return "sucesso5";
  if (total >= cd) return "sucesso";
  if (total <= cd - 5) return "falha5";
  return "falha";
}

export interface ResultadoTeste {
  d20: number[];
  natural: number;
  modo: Modo;
  bonus: number;
  extras: { dado: string; valor: number }[];
  total: number;
  cd: number;
  classe: Classe;
  fisico: boolean;
}

/**
 * d20 + bônus (+ dados extras) vs CD, com vantagem ou desvantagem.
 * `fisico` permite digitar o d20 rolado na mesa (D2).
 */
export function rolarTeste(o: {
  bonus: number;
  cd: number;
  modo?: Modo;
  extras?: string[]; // ex.: ["d4"] (dado de Coro)
  d20Fisico?: number;
  extrasFisicos?: number[];
  rng?: Rng;
}): ResultadoTeste {
  const rng = o.rng ?? rngPadrao;
  const modo = o.modo ?? "normal";
  let d20: number[];
  if (o.d20Fisico != null) d20 = [o.d20Fisico];
  else d20 = modo === "normal" ? [rolarDado(20, rng)] : [rolarDado(20, rng), rolarDado(20, rng)];
  const natural = d20.length === 1 ? d20[0] : modo === "vantagem" ? Math.max(...d20) : Math.min(...d20);
  const extras = (o.extras ?? []).map((dado, i) => {
    const lados = Number(dado.replace(/^1?d/i, ""));
    const valor = o.extrasFisicos?.[i] ?? rolarDado(lados, rng);
    return { dado, valor };
  });
  const total = natural + o.bonus + extras.reduce((s, e) => s + e.valor, 0);
  return { d20, natural, modo, bonus: o.bonus, extras, total, cd: o.cd, classe: classificar(natural, total, o.cd), fisico: o.d20Fisico != null };
}

/** Acha, na tabela de resultado da frente, a linha da classe. */
export function linhaDoResultado(t: Tabela, classe: Classe): string[] | null {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const achar = (pred: (c: string) => boolean) => t.linhas.find((l) => pred(norm(l[0]))) ?? null;
  switch (classe) {
    case "nat20":
      return achar((c) => c.startsWith("20 natural"));
    case "nat1":
      return achar((c) => c.startsWith("1 natural"));
    case "sucesso5":
      return achar((c) => c.startsWith("sucesso por 5"));
    case "sucesso":
      return achar((c) => c === "sucesso");
    case "falha5":
      return achar((c) => c.startsWith("falha por 5"));
    case "falha":
      return achar((c) => c === "falha" || c.startsWith("falha por até"));
  }
}

/** CD por ★: ★ 10 · ★★ 13 · ★★★ 16 · ★★★★ 19 · ★★★★★ 22. */
export function cdPorEstrelas(estrelas: number): number {
  return 10 + 3 * (Math.max(1, Math.min(5, estrelas)) - 1);
}

/** Conta as ★ de um texto ("★★★ (proposta)" → 3). */
export function contarEstrelas(txt: string | number | null | undefined): number | null {
  if (txt == null) return null;
  if (typeof txt === "number") return txt;
  const n = (txt.match(/★/g) ?? []).length;
  return n || null;
}
