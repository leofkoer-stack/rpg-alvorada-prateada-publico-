import type { Obj, Tabela } from "./tipos";
import { numeroBR } from "./dados";

export const FRENTES_CIDADE = ["populacao", "economia", "rotas", "influencia", "notoriedade", "seguranca", "moral"] as const;
export type FrenteCidade = (typeof FRENTES_CIDADE)[number];

/**
 * Estágio = (2×População + 2×Economia + Rotas + Influência + Notoriedade + Segurança + Moral) ÷ 9,
 * para baixo. Com População ou Economia em 0, a cidade é Abandonada (0).
 */
export function estagioCidade(f: Record<string, { nivel: number }>): number {
  const n = (k: string) => f[k]?.nivel ?? 0;
  if (n("populacao") === 0 || n("economia") === 0) return 0;
  const soma = 2 * n("populacao") + 2 * n("economia") + n("rotas") + n("influencia") + n("notoriedade") + n("seguranca") + n("moral");
  return Math.floor(soma / 9);
}

export type Governo = "regime_especial" | "lorde_aliado" | "lorde_neutro" | "lorde_hostil" | "isolamento";
export const GOVERNOS: { id: Governo; linha: number }[] = [
  { id: "regime_especial", linha: 0 },
  { id: "lorde_aliado", linha: 1 },
  { id: "lorde_neutro", linha: 2 },
  { id: "lorde_hostil", linha: 3 },
  { id: "isolamento", linha: 4 },
];

/** Travas do governo: tetos de nível nas frentes da cidade. */
export function tetosDoGoverno(g: Governo): Partial<Record<FrenteCidade, number>> {
  if (g === "regime_especial") return { influencia: 2 };
  if (g === "isolamento") return { influencia: 1 };
  return {};
}

/**
 * Efeitos únicos ao trocar de governo: lorde aliado +1 nível em Influência ao chegar;
 * isolamento −1 nível em Rotas ao começar. Depois, aplica as travas (Influência).
 */
export function aplicarTrocaDeGoverno(frentes: Obj, novo: Governo): { frentes: Obj; mudancas: string[] } {
  const f = JSON.parse(JSON.stringify(frentes));
  const mud: string[] = [];
  if (novo === "lorde_aliado") {
    f.influencia.nivel = Math.min(5, f.influencia.nivel + 1);
    mud.push("Lorde aliado chegou: Influência +1 nível");
  }
  if (novo === "isolamento") {
    f.rotas.nivel = Math.max(0, f.rotas.nivel - 1);
    mud.push("Isolamento: Rotas −1 nível");
  }
  const tetos = tetosDoGoverno(novo);
  for (const [k, t] of Object.entries(tetos)) {
    if (f[k].nivel > (t as number)) {
      f[k].nivel = t;
      mud.push(`Trava do governo: ${k} limitado a ${t}`);
    }
  }
  return { frentes: f, mudancas: mud };
}

/** Linha da tabela `est` da cidade para o estágio. */
export function linhaEstagio(est: Tabela, estagio: number): string[] {
  return est.linhas[Math.max(0, Math.min(est.linhas.length - 1, estagio))];
}

/** Ações por semana: as do estágio; sem PJs em Draetyr, uma a menos (mínimo 1). */
export function limiteAcoesCidade(est: Tabela, estagio: number, pjsEmDraetyr: boolean): number {
  const base = Number(linhaEstagio(est, estagio)[1]);
  return pjsEmDraetyr ? base : Math.max(1, base - 1);
}

export const cdAcaoCidade = (nivelAtual: number) => 10 + 2 * nivelAtual;

/** "100 × (nível + 1) PO" com nível → número; "—" → 0; outro texto → null. */
export function custoPorNivel(texto: string, nivel: number): number | null {
  const t = texto.trim();
  if (t === "—" || t === "-") return 0;
  const m = t.match(/^([\d.]+)\s*×\s*\(\s*nível\s*\+\s*1\s*\)/);
  if (m) return numeroBR(m[1]) * (nivel + 1);
  return null;
}

/** Aplica escala "× (E + 1)" num texto: devolve o multiplicador. */
export const fatorE = (E: number) => E + 1;

/** Troca "N × (E + 1)" por valores no texto, para mostrar na tela. */
export function escalarTexto(texto: string, E: number): string {
  return texto.replace(/([\d.]+)\s*×\s*\(E\s*\+\s*1\)/g, (_, n) => (numeroBR(n) * (E + 1)).toLocaleString("pt-BR"));
}

/** Renda base do cofre pelo estágio ("200 PO" → 200). */
export function rendaBase(est: Tabela, estagio: number): number {
  const t = linhaEstagio(est, estagio)[2];
  const m = t.match(/[\d.]+/);
  return m ? numeroBR(m[0]) : 0;
}

/** Manutenção por obra: até 5.000 PO paga 10; até 20.000 paga 50; acima, 200. */
export function manutencaoObra(custo: number | null | undefined): number {
  if (!custo) return 0;
  if (custo <= 5000) return 10;
  if (custo <= 20000) return 50;
  return 200;
}

/** Lê "50.000 PO · 12 sem." → {custo, semanas}. */
export function lerCustoPrazo(t: string): { custo: number | null; semanas: number | null } {
  const c = t.match(/([\d.]+)\s*PO/);
  const s = t.match(/(\d+)\s*sem/);
  return { custo: c ? numeroBR(c[1]) : null, semanas: s ? Number(s[1]) : null };
}
