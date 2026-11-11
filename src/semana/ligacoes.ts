import ligacoesJson from "@dados/ligacoes.json";
import { FRENTES_CIDADE } from "@/motor/cidade";
import type { Op } from "@/motor/ops";
import type { Obj } from "@/motor/tipos";
import { ler } from "@/motor/caminho";
import { specDoCampo } from "./campos";

export interface Efeito {
  alvo: string;
  marcas?: number;
  niveis?: number;
  valor?: number;
  bonus?: number;
  acao?: string;
  projeto?: string;
  texto?: string;
}
export interface Ligacao {
  id: string;
  origem: string;
  gatilho: string;
  efeitos: Efeito[];
  texto: string;
  automatico_ao?: string;
  periodico?: { a_cada_semanas: number; condicao: string };
  periodico_depois?: { a_cada_semanas: number; efeitos: Efeito[] };
  escolha?: string[];
  limite?: string;
}

export const LIGACOES: Ligacao[] = (ligacoesJson as any).ligacoes;
export const ligacao = (id: string) => LIGACOES.find((l) => l.id === id);

/** "cidade.moral (se for para os refugiados)" → {alvo:"cidade.moral"}; "forja.relogio.cobica −2" → valor −2 */
export function lerEscolha(txt: string): { alvo: string; delta: number | null } {
  const limpo = txt.replace(/\(.*?\)/g, "").trim();
  const m = limpo.match(/^(\S+)\s*([+\-−]\s*\d+)?$/);
  if (!m) return { alvo: limpo, delta: null };
  return { alvo: m[1], delta: m[2] ? Number(m[2].replace(/[−\s]/g, (c) => (c === "−" ? "-" : ""))) : null };
}

export interface OpAlvo {
  frente: string;
  op: Op;
  descricao: string;
}

/** Converte um alvo "cidade.notoriedade" num caminho dentro da frente. */
export function caminhoDoAlvo(alvo: string): { frente: string; caminho: string } {
  const [f, ...resto] = alvo.split(".");
  let caminho = resto.join(".");
  if (f === "cidade" && (FRENTES_CIDADE as readonly string[]).includes(caminho)) caminho = `frentes.${caminho}`;
  if (caminho.startsWith("relogio.")) caminho = `relogios.${caminho.slice(8)}`;
  return { frente: f, caminho };
}

/**
 * Transforma um efeito de ligação em operações.
 * `estados` serve para efeitos que dependem do valor atual (liberar estágio).
 */
export function efeitoParaOps(e: Efeito, escolha: string | null, estados: Record<string, Obj>, origemTexto: string): OpAlvo[] {
  if (e.alvo === "escolha") {
    if (!escolha) return [];
    const { alvo, delta } = lerEscolha(escolha);
    return efeitoParaOps({ alvo, marcas: e.marcas ?? undefined, valor: delta ?? undefined }, null, estados, origemTexto);
  }
  const { frente, caminho } = caminhoDoAlvo(e.alvo);
  const out: OpAlvo[] = [];
  if (e.acao === "nota") return [{ frente, op: { op: "nota", texto: e.texto ?? origemTexto }, descricao: e.texto ?? origemTexto }];
  if (e.acao === "concluir" && e.projeto) {
    const lista: any[] = estados.cidade?.projetos ?? [];
    const i = lista.findIndex((p) => p.nome === e.projeto);
    const item = { ...(lista[i] ?? { nome: e.projeto, semanas_restantes: 0 }), status: "concluido", via_ligacao: true };
    out.push({
      frente: "cidade",
      op: i >= 0 ? { op: "lista_set", caminho: "projetos", indice: i, item } : { op: "lista_add", caminho: "projetos", item },
      descricao: `Projeto concluído: ${e.projeto}`,
    });
    return out;
  }
  if (e.acao === "nova_missao") return [{ frente: "guilda", op: { op: "lista_add", caminho: "quadro", item: { id: `m${Date.now().toString(36)}`, estado: "a_gerar", origem: origemTexto } }, descricao: "Missão nova no quadro da guilda" }];
  if (e.acao === "nova_pauta") return [{ frente: "radio", op: { op: "lista_add", caminho: "pautas_semana", item: { origem: origemTexto, pauta: null } }, descricao: "Pauta nova para a rádio" }];
  if (e.acao === "liberar_estagio_1") {
    const atual = estados.radio?.estagio ?? 0;
    return [{ frente: "radio", op: { op: "definir", caminho: "estagio", valor: Math.max(1, atual) }, descricao: "Rádio: Estágio 1 liberado" }];
  }
  if (e.bonus != null && e.alvo === "guilda.missao")
    return [{ frente: "guilda", op: { op: "lista_add", caminho: "bonus_proxima_missao", item: { bonus: e.bonus, origem: origemTexto } }, descricao: `+${e.bonus} na próxima missão da guilda` }];

  if (caminho.startsWith("relogios.")) {
    const d = e.valor ?? e.marcas ?? 0;
    return [{ frente, op: { op: "relogio", caminho, delta: d }, descricao: `${caminho.slice(9)} ${d > 0 ? "+" : ""}${d}` }];
  }
  const spec = specDoCampo(frente, caminho);
  if (e.niveis != null) return [{ frente, op: { op: "nivel", caminho, delta: e.niveis }, descricao: `${caminho} ${e.niveis > 0 ? "+" : ""}${e.niveis} nível` }];
  const d = e.marcas ?? e.valor ?? 0;
  if (spec?.tipo === "medida") return [{ frente, op: { op: "marcas", caminho, delta: d }, descricao: `${spec.rotulo}: ${d > 0 ? "+" : ""}${d} marca(s)` }];
  if (spec?.tipo === "escala") return [{ frente, op: { op: "escala", caminho, delta: d }, descricao: `${spec.rotulo} ${d > 0 ? "+" : ""}${d}` }];
  if (ler(estados[frente] ?? {}, caminho) && typeof ler(estados[frente], caminho) === "object" && "valor" in ler(estados[frente], caminho))
    return [{ frente, op: { op: "relogio", caminho, delta: d }, descricao: `${caminho} ${d}` }];
  return [{ frente, op: { op: "contador", caminho, delta: d }, descricao: `${spec?.rotulo ?? caminho}: ${d > 0 ? "+" : ""}${d}` }];
}

/** Avalia "caldeirao.pertencimento>=3" (medida usa o nível). */
export function avaliarCondicao(cond: string, estados: Record<string, Obj>): boolean {
  const m = cond.match(/^(\w+)\.([\w.]+)\s*(>=|<=|==|>|<)\s*(-?\d+)$/);
  if (!m) return false;
  const v0 = ler(estados[m[1]] ?? {}, m[2]);
  const v = typeof v0 === "object" && v0 ? (v0.nivel ?? v0.valor) : Number(v0);
  const n = Number(m[4]);
  return m[3] === ">=" ? v >= n : m[3] === "<=" ? v <= n : m[3] === ">" ? v > n : m[3] === "<" ? v < n : v === n;
}
