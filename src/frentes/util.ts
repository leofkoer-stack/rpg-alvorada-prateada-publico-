import type { Regras, Tabela } from "@/motor/tipos";

export const nomeLinha = (t: Tabela, n: number, col = 1) => {
  const l = t.linhas.find((x) => x[0].split(" ")[0] === String(n)) ?? t.linhas[n];
  return l ? (l[col] ?? l[0]) : "—";
};
/** "2 · Casa aberta" → "Casa aberta" */
export const nomeEstagioTabela = (t: Tabela, n: number) => {
  const l = t.linhas.find((x) => x[0].startsWith(`${n} ·`));
  return l ? l[0].split("·")[1]?.trim() ?? l[0] : `Estágio ${n}`;
};
export const tab = (r: Regras, id: string) => {
  const t = r.tabelas[id];
  if (!t) throw new Error(`Tabela ${id} não existe em ${r.frente}`);
  return t;
};
export const num = (s: string) => Number(String(s).replace(/[^\d-]/g, "")) || 0;
