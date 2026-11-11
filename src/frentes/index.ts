import type { FrenteConfig, FrenteId } from "./tipos";
import { cidade } from "./cidade";
import { guilda } from "./guilda";
import { culto } from "./culto";
import { radio } from "./radio";
import { forja } from "./forja";
import { caldeirao } from "./caldeirao";
import { submundo } from "./submundo";

/**
 * Registro das frentes. Para a 7ª frente (Hrasvelge):
 * 1) dados/regras-<frente>.json; 2) src/frentes/<frente>.ts; 3) uma linha aqui;
 * 4) o estado inicial dela em dados/estado-inicial.json.
 */
export const FRENTES: FrenteConfig[] = [cidade, guilda, culto, radio, submundo, caldeirao, forja];
export const FRENTES_JOGADORES = FRENTES.filter((f) => f.papelDono === "jogador");
export const frente = (id: FrenteId): FrenteConfig => {
  const f = FRENTES.find((x) => x.id === id);
  if (!f) throw new Error(`Frente desconhecida: ${id}`);
  return f;
};
export type { FrenteConfig, FrenteId };
