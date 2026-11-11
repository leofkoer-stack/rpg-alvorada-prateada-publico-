import { FRENTES, frente } from "@/frentes";
import type { CampoSpec, Ctx, RelogioSpec } from "@/frentes/tipos";
import { casa, ler } from "@/motor/caminho";
import type { LimitesCampo } from "@/motor/ops";
import type { Obj } from "@/motor/tipos";

export function specDoCampo(frenteId: string, caminho: string): CampoSpec | undefined {
  return frente(frenteId).campos.find((c) => casa(c.caminho, caminho));
}
export function specDoRelogio(frenteId: string, caminho: string): RelogioSpec | undefined {
  return frente(frenteId).relogios.find((r) => casa(r.caminho, caminho));
}

/** Limites efetivos do campo (min, max e teto dinâmico). */
export function limitesDoCampo(frenteId: string, caminho: string, estado: Obj, ctx: Ctx): LimitesCampo {
  const s = specDoCampo(frenteId, caminho);
  if (!s) return {};
  const teto = s.teto ? s.teto(estado, ctx) : null;
  const max = s.tipo === "medida" ? (s.max ?? 5) : s.max;
  return { min: s.min ?? (s.tipo === "medida" ? 0 : undefined), max, teto };
}

/** Expande curingas: "sinal_por_zona.*" → todos os caminhos reais no estado. */
export function expandir(padrao: string, estado: Obj): string[] {
  const partes = padrao.split(".");
  let caminhos = [""];
  for (const p of partes) {
    const prox: string[] = [];
    for (const c of caminhos) {
      if (p === "*") {
        const alvo = ler(estado, c);
        if (alvo && typeof alvo === "object") for (const k of Object.keys(alvo)) prox.push(c ? `${c}.${k}` : k);
      } else prox.push(c ? `${c}.${p}` : p);
    }
    caminhos = prox;
  }
  return caminhos.filter((c) => ler(estado, c) !== undefined);
}

export const todasAsFrentes = () => FRENTES.map((f) => f.id);
