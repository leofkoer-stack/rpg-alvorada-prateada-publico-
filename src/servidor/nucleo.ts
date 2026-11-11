import { estadosIniciais, campanhaInicial } from "@/frentes/seed";
import { FRENTES } from "@/frentes";
import type { Banco, EventoLog } from "@/semana/aplicar";
import type { Pendente } from "@/semana/fechar";
import { store } from "./store";
import { Conflito, type Carregado } from "./tipos";

/** Cria o estado da semana 1 a partir de dados/estado-inicial.json, se o banco estiver vazio. */
export async function garantirSeed(): Promise<Carregado> {
  const s = store();
  const c = await s.carregar();
  if (c) return c;
  const frentes = estadosIniciais();
  const campanha = campanhaInicial();
  campanha.ultimos_estagios = Object.fromEntries(
    FRENTES.filter((f) => f.id !== "guilda").map((f) => [f.id, f.estagio(frentes[f.id], { frentes, campanha })]),
  );
  for (const f of FRENTES) if (f.estagioCalculado && f.id !== "guilda") frentes[f.id].estagio = campanha.ultimos_estagios[f.id];
  await s.salvar({ campanha: { dados: campanha, versao: 0 }, frentes: Object.fromEntries(Object.entries(frentes).map(([k, v]) => [k, { estado: v, versao: 0 }])) });
  await s.registrar([{ autor: "sistema", semana: campanha.semana, frente: "cidade", tipo: "seed", motivo: "Estado inicial da semana 1 carregado" }]);
  return (await s.carregar())!;
}

export interface Mutacao<T = unknown> {
  banco: Banco;
  eventos?: EventoLog[];
  pendentes?: Pendente[];
  resposta?: T;
}

/**
 * Lê, aplica e grava com controle de versão (evita escrita concorrente).
 * Só grava as frentes que mudaram. Tenta de novo até 3 vezes em conflito.
 */
export async function mutar<T>(fn: (b: Banco) => Mutacao<T> | Promise<Mutacao<T>>): Promise<T | undefined> {
  const s = store();
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const c = await garantirSeed();
    const antes: Banco = { campanha: c.campanha, frentes: c.frentes };
    const r = await fn(JSON.parse(JSON.stringify(antes)));
    const frentesMudadas: Record<string, { estado: any; versao: number }> = {};
    for (const [id, e] of Object.entries(r.banco.frentes))
      if (JSON.stringify(e) !== JSON.stringify(c.frentes[id])) frentesMudadas[id] = { estado: e, versao: c.versoes[id] ?? 0 };
    const campMudou = JSON.stringify(r.banco.campanha) !== JSON.stringify(c.campanha);
    try {
      await s.salvar({ campanha: campMudou ? { dados: r.banco.campanha, versao: c.versaoCampanha } : undefined, frentes: frentesMudadas });
    } catch (e) {
      if (e instanceof Conflito && tentativa < 2) continue;
      throw e;
    }
    await s.registrar(r.eventos ?? []);
    await s.criarPendentes(r.pendentes ?? []);
    return r.resposta;
  }
}
