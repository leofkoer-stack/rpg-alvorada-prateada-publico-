import type { Obj } from "./tipos";

/** Lê "a.b.0.c" num objeto. */
export function ler(o: Obj, caminho: string): any {
  if (!caminho) return o;
  return caminho.split(".").reduce((acc: any, k) => (acc == null ? undefined : acc[k]), o);
}

/** Grava num clone raso do caminho (imutável). Cria objetos intermediários. */
export function gravar<T extends Obj>(o: T, caminho: string, valor: any): T {
  const partes = caminho.split(".");
  const raiz: any = Array.isArray(o) ? [...o] : { ...o };
  let atual = raiz;
  for (let i = 0; i < partes.length - 1; i++) {
    const k = partes[i];
    const prox = atual[k];
    atual[k] = Array.isArray(prox) ? [...prox] : prox && typeof prox === "object" ? { ...prox } : /^\d+$/.test(partes[i + 1]) ? [] : {};
    atual = atual[k];
  }
  atual[partes[partes.length - 1]] = valor;
  return raiz;
}

export const clonar = <T>(o: T): T => JSON.parse(JSON.stringify(o));

/** Casa um caminho com um padrão com curinga: "sinal_por_zona.*" casa "sinal_por_zona.draetyr". */
export function casa(padrao: string, caminho: string): boolean {
  const a = padrao.split(".");
  const b = caminho.split(".");
  if (a.length !== b.length) return false;
  return a.every((p, i) => p === "*" || p === b[i]);
}
