import { aplicarOp, type Op } from "@/motor/ops";
import type { Obj } from "@/motor/tipos";
import { limitesDoCampo } from "./campos";

export interface Banco {
  campanha: Obj;
  frentes: Record<string, Obj>;
}

export interface EventoLog {
  autor: string;
  semana: number;
  frente: string;
  tipo: string;
  caminho?: string;
  antes?: any;
  depois?: any;
  rolagem?: any;
  motivo: string;
}

/** Aplica uma Op numa frente do banco (imutável) e devolve o evento de log. */
export function aplicarNoBanco(b: Banco, frenteId: string, op: Op, autor: string, motivo: string, rolagem?: any): { banco: Banco; evento: EventoLog } {
  const estado = b.frentes[frenteId];
  if (!estado) throw new Error(`Frente ${frenteId} não existe`);
  const caminho = "caminho" in op ? op.caminho : undefined;
  const lim = caminho ? limitesDoCampo(frenteId, caminho, estado, { frentes: b.frentes, campanha: b.campanha }) : {};
  const r = aplicarOp(estado, op, lim);
  return {
    banco: { ...b, frentes: { ...b.frentes, [frenteId]: r.estado } },
    evento: { autor, semana: b.campanha.semana, frente: frenteId, tipo: op.op, caminho, antes: r.antes, depois: r.depois, rolagem, motivo },
  };
}
