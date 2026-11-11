import type { Obj } from "./tipos";
import { ler, gravar } from "./caminho";
import { escala } from "./marcas";
import { moverRelogio } from "./relogio";

/** Uma operação genérica numa frente. Toda escrita do app vira uma destas. */
export type Op =
  | { op: "marcas"; caminho: string; delta: number }
  | { op: "nivel"; caminho: string; delta: number }
  | { op: "escala"; caminho: string; delta: number }
  | { op: "relogio"; caminho: string; delta: number }
  | { op: "relogio_zerar"; caminho: string }
  | { op: "contador"; caminho: string; delta: number }
  | { op: "definir"; caminho: string; valor: any }
  | { op: "lista_add"; caminho: string; item: any }
  | { op: "lista_set"; caminho: string; indice: number; item: any }
  | { op: "lista_del"; caminho: string; indice: number }
  | { op: "nota"; texto: string };

export interface LimitesCampo {
  min?: number;
  max?: number;
  teto?: number | null;
}

export interface ResultadoOp {
  estado: Obj;
  antes: any;
  depois: any;
}

/** Aplica uma operação. `limites` vem da configuração da frente para aquele caminho. */
export function aplicarOp(estado: Obj, o: Op, limites: LimitesCampo = {}): ResultadoOp {
  if (o.op === "nota") {
    const notas = [...(estado.notas ?? []), o.texto];
    return { estado: { ...estado, notas }, antes: null, depois: o.texto };
  }
  const antes = ler(estado, o.caminho);
  let depois: any;
  switch (o.op) {
    case "marcas": {
      const m = antes ?? { nivel: 0, marcas: 0 };
      depois = { nivel: m.nivel, marcas: m.marcas + o.delta };
      break;
    }
    case "nivel": {
      const m = antes ?? { nivel: 0, marcas: 0 };
      const max = Math.min(limites.max ?? 5, o.delta > 0 ? (limites.teto ?? 99) : 99);
      depois = { nivel: Math.max(limites.min ?? 0, Math.min(max, m.nivel + o.delta)), marcas: m.marcas };
      break;
    }
    case "escala":
      depois = escala(Number(antes ?? 0), o.delta, limites.min ?? -Infinity, limites.max ?? Infinity);
      break;
    case "relogio":
      depois = moverRelogio(antes ?? { valor: 0, tamanho: 6 }, o.delta);
      break;
    case "relogio_zerar":
      depois = { ...(antes ?? { tamanho: 6 }), valor: 0 };
      break;
    case "contador": {
      const v = Number(antes ?? 0) + o.delta;
      depois = limites.min != null ? Math.max(limites.min, v) : v;
      break;
    }
    case "definir":
      depois = o.valor;
      break;
    case "lista_add":
      depois = [...(antes ?? []), o.item];
      break;
    case "lista_set":
      depois = (antes ?? []).map((x: any, i: number) => (i === o.indice ? o.item : x));
      break;
    case "lista_del":
      depois = (antes ?? []).filter((_: any, i: number) => i !== o.indice);
      break;
  }
  return { estado: gravar(estado, o.caminho, depois), antes, depois };
}
