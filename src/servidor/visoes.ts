import { FRENTES, frente } from "@/frentes";
import { gravar } from "@/motor/caminho";
import type { Obj } from "@/motor/tipos";
import { store } from "./store";
import { garantirSeed } from "./nucleo";
import type { Acesso } from "./tipos";

/** Tira os campos que o Mestre ocultou (D3). */
export function semOcultos(estado: Obj): Obj {
  let e = { ...estado };
  for (const c of estado.ocultos ?? []) e = gravar(e, c, "🔒 oculto");
  return e;
}

/** Resumo público de Draetyr: as 7 frentes, o estágio e os projetos. */
export function resumoPublico(cidade: Obj): Obj {
  const c = semOcultos(cidade);
  return {
    frentes: c.frentes,
    estagio: c.estagio,
    governo: c.governo,
    pjs_onde: c.pjs_onde,
    projetos: Array.isArray(c.projetos) ? c.projetos.map((p: any) => ({ nome: p.nome, status: p.status, semanas_restantes: p.semanas_restantes })) : c.projetos,
    relogios: c.relogios,
  };
}

/** O que cada papel enxerga. */
export async function visao(a: Acesso) {
  const s = store();
  const c = await garantirSeed();
  const campanha = c.campanha;
  if (a.papel === "mestre") {
    return {
      papel: "mestre",
      nome: a.nome,
      campanha,
      frentes: c.frentes,
      pendentes: await s.pendentes("pendente"),
      decididos: (await s.pendentes()).filter((p) => p.status !== "pendente").slice(-30).reverse(),
      log: await s.log({ limite: 150 }),
      temSnapshotAnterior: !!(await s.lerSnapshot(campanha.semana - 1)),
    };
  }
  if (a.papel === "jogador" && a.frente) {
    const meus = (await s.pendentes()).filter((p) => p.origem === a.frente).slice(-20).reverse();
    // pedidos entre frentes: os da forja feitos para esta frente
    const pedidos = (c.frentes.forja?.fila ?? []).filter((p: any) => p.para === a.frente).map((p: any) => semOcultos({ ...p, ocultos: [] }));
    return {
      papel: "jogador",
      nome: a.nome,
      frenteId: a.frente,
      campanha: { semana: campanha.semana, estado: campanha.estado, turno_pronto: !!campanha.turno_pronto?.[a.frente], alertas: (campanha.alertas ?? []).filter((x: any) => x.frente === a.frente && !x.resolvido) },
      frente: semOcultos(c.frentes[a.frente]),
      draetyr: resumoPublico(c.frentes.cidade),
      economiaDraetyr: c.frentes.cidade.ocultos?.includes("frentes.economia") ? null : c.frentes.cidade.frentes.economia.nivel,
      radioEstagio: c.frentes.radio?.estagio ?? 0,
      pedidos,
      meusPendentes: meus,
      log: await s.log({ frente: a.frente, limite: 100 }),
    };
  }
  if (a.papel === "admin") {
    const acessos = (await s.acessos()).map(({ hash: _h, ...r }) => r);
    const bonus = Object.fromEntries(
      FRENTES.filter((f) => f.papelDono === "jogador").map((f) => {
        const e = c.frentes[f.id];
        const chave = Object.keys(e).find((k) => k.startsWith("bonus_"));
        return [f.id, { chave, valor: chave ? e[chave] : null, lideres: f.id === "culto" ? e.lideres : undefined }];
      }),
    );
    return { papel: "admin", nome: a.nome, acessos, bonus, frentes: FRENTES.map((f) => ({ id: f.id, nome: f.nome, papelDono: f.papelDono, dono: f.dono })) };
  }
  return null;
}
export { frente };
