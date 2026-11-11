import type { Tabela, Rng } from "./tipos";
import { numeroBR, rolarDado, rngPadrao } from "./dados";

export interface Faixa {
  min: number;
  max: number;
}

/**
 * Lê a faixa de uma célula: "7", "1–9", "25+", "10 ou menos", "11 a 16",
 * "24 ou mais", "−5 a −4", "1 ou menos", "+1", "Renome 0–1".
 */
export function lerFaixa(celula: string): Faixa | null {
  let t = celula.replace(/[−–—]/g, "-").replace(/\s+/g, " ").trim();
  t = t.replace(/^[A-Za-zÀ-ú ]+(?=[-+]?\d)/, "").trim(); // "Renome 0–1" -> "0-1"
  const n = "([-+]?\\d+)";
  let m: RegExpMatchArray | null;
  if ((m = t.match(new RegExp(`^${n}$`)))) return { min: Number(m[1]), max: Number(m[1]) };
  if ((m = t.match(new RegExp(`^${n} ?- ?${n}$`)))) return { min: Number(m[1]), max: Number(m[2]) };
  if ((m = t.match(new RegExp(`^${n} a ${n}$`)))) return { min: Number(m[1]), max: Number(m[2]) };
  if ((m = t.match(new RegExp(`^${n} ?\\+$`)))) return { min: Number(m[1]), max: Infinity };
  if ((m = t.match(new RegExp(`^${n} ou mais$`)))) return { min: Number(m[1]), max: Infinity };
  if ((m = t.match(new RegExp(`^${n} ou menos$`)))) return { min: -Infinity, max: Number(m[1]) };
  return null;
}

export interface InfoDado {
  coluna: number;
  qtd: number;
  lados: number;
  /** texto do modificador, ex.: "Renome" em "d20 + Renome" */
  modificador?: string;
}

/** Descobre se a tabela é rolável e com qual dado. */
export function dadoDaTabela(t: Tabela): InfoDado | null {
  for (let i = 0; i < t.colunas.length; i++) {
    const m = t.colunas[i].match(/^(\d*)d(\d+)\s*(?:\+\s*(.+))?$/i);
    if (m) return { coluna: i, qtd: m[1] ? Number(m[1]) : 1, lados: Number(m[2]), modificador: m[3]?.trim() };
  }
  const mt = t.titulo.match(/\((\d*)d(\d+)(?:\s*\+\s*([^)]+))?\)/i);
  if (mt) return { coluna: 0, qtd: mt[1] ? Number(mt[1]) : 1, lados: Number(mt[2]), modificador: mt[3]?.trim() };
  return null;
}

/** Acha a linha cuja faixa (na coluna dada) contém o valor. */
export function consultar(t: Tabela, valor: number, coluna = 0): { indice: number; linha: string[] } | null {
  for (let i = 0; i < t.linhas.length; i++) {
    const f = lerFaixa(t.linhas[i][coluna] ?? "");
    if (f && valor >= f.min && valor <= f.max) return { indice: i, linha: t.linhas[i] };
  }
  return null;
}

export interface RolagemTabela {
  tabela: string;
  dados: number[];
  modificador: number;
  total: number;
  indice: number | null;
  linha: string[] | null;
}

export function rolarTabela(
  id: string,
  t: Tabela,
  opcoes: { modificador?: number; valorFisico?: number; rng?: Rng } = {},
): RolagemTabela {
  const info = dadoDaTabela(t);
  if (!info) throw new Error(`A tabela ${id} não tem dado.`);
  const rng = opcoes.rng ?? rngPadrao;
  const dados =
    opcoes.valorFisico != null
      ? [opcoes.valorFisico]
      : Array.from({ length: info.qtd }, () => rolarDado(info.lados, rng));
  const mod = opcoes.modificador ?? 0;
  const total = dados.reduce((a, b) => a + b, 0) + mod;
  const r = consultar(t, total, info.coluna);
  return { tabela: id, dados, modificador: mod, total, indice: r?.indice ?? null, linha: r?.linha ?? null };
}

export interface ProblemaCobertura {
  tipo: "buraco" | "sobreposicao" | "faixa_ilegivel";
  valor?: number;
  celula?: string;
}

/**
 * Confere se a tabela cobre todas as faces do dado (de qtd a qtd×lados),
 * sem buracos e sem sobreposição. Com modificador, também cobre os extremos
 * (faixa aberta "ou menos"/"ou mais"/"+").
 */
export function conferirCobertura(
  t: Tabela,
  info = dadoDaTabela(t),
  margem: { abaixo: number; acima: number } = { abaixo: 0, acima: info?.modificador ? 15 : 0 },
): ProblemaCobertura[] {
  if (!info) return [];
  const faixas: Faixa[] = [];
  const problemas: ProblemaCobertura[] = [];
  for (const l of t.linhas) {
    const f = lerFaixa(l[info.coluna] ?? "");
    if (!f) problemas.push({ tipo: "faixa_ilegivel", celula: l[info.coluna] });
    else faixas.push(f);
  }
  const min = info.qtd - margem.abaixo;
  const max = info.qtd * info.lados + margem.acima;
  for (let v = min; v <= max; v++) {
    const n = faixas.filter((f) => v >= f.min && v <= f.max).length;
    if (n === 0) problemas.push({ tipo: "buraco", valor: v });
    if (n > 1) problemas.push({ tipo: "sobreposicao", valor: v });
  }
  return problemas;
}

export { numeroBR, rolarDado };
