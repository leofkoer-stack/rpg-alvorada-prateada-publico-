import type { Tabela } from "./tipos";
import { lerFaixa } from "./tabelas";

/** Nível (1–5) de Fiéis, Raízes ou Tesouro pela tabela `niv`. Coluna: 1 Fiéis, 2 Raízes, 3 Tesouro. */
export function nivelCulto(niv: Tabela, coluna: 1 | 2 | 3, valor: number): number {
  for (const l of niv.linhas) {
    const f = lerFaixa(l[coluna]);
    if (f && valor >= f.min && valor <= f.max) return Number(l[0]);
  }
  // abaixo da 1ª faixa conta como nível 1 (a tabela começa no 1)
  return 1;
}

/** Estágio = (2×Fiéis + 3×Raízes + 1×Tesouro) ÷ 6, para baixo, mínimo 1. */
export function estagioCulto(nFieis: number, nRaizes: number, nTesouro: number): number {
  return Math.max(1, Math.floor((2 * nFieis + 3 * nRaizes + nTesouro) / 6));
}

export function somaRaizes(raizes: Record<string, number>): number {
  return Object.values(raizes ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
}

export interface LinhaEstagioCulto {
  coro: string;
  escala: number;
  obras: number;
  renda: number;
  manutencao: number;
  comunhaoMax: number;
  revelacaoMin: number;
  lideresRegionais: number;
  captacao: number;
}
export function dadosEstagioCulto(est: Tabela, estagio: number): LinhaEstagioCulto {
  const l = est.linhas[Math.max(1, Math.min(5, estagio)) - 1];
  const n = (s: string) => Number(s.replace(/[+×−]/g, (c) => (c === "−" ? "-" : "")));
  return {
    coro: l[1],
    escala: n(l[2]),
    obras: n(l[3]),
    renda: n(l[4]),
    manutencao: n(l[5]),
    comunhaoMax: n(l[6]),
    revelacaoMin: n(l[7]),
    lideresRegionais: n(l[8]),
    captacao: n(l[9]),
  };
}

/** Humor dos fiéis: d6, +1 com Fé 7+, −1 com Fé 3 ou menos. */
export const modHumor = (fe: number) => (fe >= 7 ? 1 : fe <= 3 ? -1 : 0);

/** Teste de Lealdade: d20 ≤ Lealdade + Comunhão. Falha por 10+ abre Cisma. */
export function testeLealdade(d20: number, lealdade: number, comunhao: number) {
  const alvo = lealdade + comunhao;
  const passou = d20 <= alvo;
  return { alvo, passou, falhaPor10: !passou && d20 - alvo >= 10 };
}

/** Cisma: quando Fé ≤ 2 ou um líder falhou Lealdade por 10+. Teste d20 + Fé + Comunhão vs CD 10 + Estágio. */
export const cdCisma = (estagio: number) => 10 + estagio;
export const precisaCisma = (fe: number, lealdadeFalhaPor10: boolean) => fe <= 2 || lealdadeFalhaPor10;

/** Comunhão pode subir? Custa o Propósito da tabela `com`, exige a Provação do grau e respeita o máximo do estágio. */
export function podeSubirComunhao(com: Tabela, grau: number, proposito: number, provacoes: string[], comunhaoMax: number) {
  const prox = grau + 1;
  if (prox > 5 || prox > comunhaoMax) return { pode: false, motivo: "Máximo do estágio", custo: 0 };
  const custo = Number(com.linhas[prox - 1][1]);
  if (proposito < custo) return { pode: false, motivo: `Precisa de Propósito ${custo}`, custo };
  if (!provacoes.includes(String(prox))) return { pode: false, motivo: `Falta a Provação do grau ${prox}`, custo };
  return { pode: true, motivo: "", custo };
}
