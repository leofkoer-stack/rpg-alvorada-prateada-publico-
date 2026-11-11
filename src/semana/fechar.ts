import { FRENTES, frente } from "@/frentes";
import { PROJETOS } from "@/frentes/cidade";
import type { Ctx } from "@/frentes/tipos";
import { fecharMedida, BORDAS_PADRAO, type Bordas } from "@/motor/marcas";
import { ler, gravar, clonar } from "@/motor/caminho";
import { relogioCheio, moverRelogio } from "@/motor/relogio";
import type { Obj } from "@/motor/tipos";
import { expandir } from "./campos";
import { LIGACOES, avaliarCondicao, efeitoParaOps, type Efeito } from "./ligacoes";
import type { Banco, EventoLog } from "./aplicar";

export interface Pendente {
  id: string;
  semana: number;
  origem: string;
  ligacao_id: string | null;
  texto: string;
  efeitos: Efeito[];
  escolha: string | null;
  status: "pendente" | "aprovado" | "recusado";
  criado_por: string;
  decidido_por?: string | null;
  motivo_decisao?: string | null;
  /** criado pelo fechamento da semana (sai se a semana for reaberta) */
  do_fechamento?: boolean;
}

export interface Alerta {
  id: string;
  chave: string;
  frente: string;
  caminho?: string;
  texto: string;
  semana: number;
  resolvido: boolean;
}

export interface ResultadoFechamento {
  banco: Banco;
  snapshot: Banco;
  eventos: EventoLog[];
  pendentes: Pendente[];
  alertasNovos: Alerta[];
  /** resumo legível, por passo */
  passos: { titulo: string; itens: string[] }[];
}

let n = 0;
const id = (p: string) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;

/**
 * Fecha a semana, nesta ordem (seção 6):
 * 1 marcas → níveis (com tetos); 2 estágios; 3 prazos/projetos/validades/ferimentos;
 * 4 periódicos; 5 alertas de relógio cheio; 6 snapshot; 7 abre a semana N+1.
 */
export function fecharSemana(entrada: Banco, autor = "Mestre"): ResultadoFechamento {
  const snapshot = clonar(entrada);
  let frentes: Record<string, Obj> = clonar(entrada.frentes);
  const campanha: Obj = clonar(entrada.campanha);
  const semana: number = campanha.semana;
  const semanaNova = semana + 1;
  const bordas: Bordas = campanha.config?.bordas ?? BORDAS_PADRAO;
  const eventos: EventoLog[] = [];
  const pendentes: Pendente[] = [];
  const alertasNovos: Alerta[] = [];
  const passos: ResultadoFechamento["passos"] = [];
  const ctx = (): Ctx => ({ frentes, campanha });
  const log = (frenteId: string, tipo: string, motivo: string, caminho?: string, antes?: any, depois?: any) =>
    eventos.push({ autor: "fechamento", semana, frente: frenteId, tipo, caminho, antes, depois, motivo });
  const pendente = (origem: string, ligacao_id: string | null, texto: string, efeitos: Efeito[], escolha: string | null = null) =>
    pendentes.push({ id: id("p"), semana, origem, ligacao_id, texto, efeitos, escolha, status: "pendente", criado_por: autor, do_fechamento: true });

  // ---------- 1. marcas → níveis ----------
  const p1: string[] = [];
  for (const cfg of FRENTES) {
    const campos = cfg.campos.filter((c) => c.tipo === "medida").sort((a, b) => (a.ordem ?? 5) - (b.ordem ?? 5));
    for (const c of campos) {
      for (const cam of expandir(c.caminho, frentes[cfg.id] ?? {})) {
        const est = frentes[cfg.id];
        const m = ler(est, cam);
        if (!m || typeof m.nivel !== "number") continue;
        const teto = c.teto ? c.teto(est, ctx()) : null;
        const conv = fecharMedida(m, { min: c.min ?? 0, max: c.max ?? 5, teto, bordas });
        if (conv.depois.nivel !== m.nivel || conv.depois.marcas !== m.marcas) {
          frentes = { ...frentes, [cfg.id]: gravar(est, cam, conv.depois) };
          const nome = `${cfg.emoji} ${c.rotulo}${cam.includes(".") && c.caminho.includes("*") ? ` (${cam.split(".").pop()})` : ""}`;
          const txt = conv.subiu
            ? `${nome} subiu para ${conv.depois.nivel}`
            : conv.desceu
              ? `${nome} desceu para ${conv.depois.nivel} (3 marcas)`
              : conv.travadoPeloTeto
                ? `${nome} travado pelo teto (${teto})`
                : `${nome}: marcas ajustadas (${m.marcas} → ${conv.depois.marcas})`;
          p1.push(txt);
          log(cfg.id, "fechamento_marcas", txt, cam, m, conv.depois);
          if (conv.subiu && c.aoSubir) {
            for (const a of c.aoSubir) {
              if (a.deNivel != null && m.nivel !== a.deNivel) continue;
              const alvoF = a.frente ?? cfg.id;
              const r0 = ler(frentes[alvoF], a.relogio);
              if (!r0) continue;
              const r1 = moverRelogio(r0, a.delta);
              frentes = { ...frentes, [alvoF]: gravar(frentes[alvoF], a.relogio, r1) };
              p1.push(`   ↳ ${a.motivo}: relógio ${a.relogio.split(".").pop()} +${a.delta}`);
              log(alvoF, "relogio", a.motivo, a.relogio, r0, r1);
            }
          }
        }
      }
    }
  }
  passos.push({ titulo: "Marcas viram níveis", itens: p1 });

  // ---------- 2. estágios ----------
  const p2: string[] = [];
  const ultimos = campanha.ultimos_estagios ?? {};
  for (const cfg of FRENTES) {
    if (cfg.id === "guilda") continue;
    const e = cfg.estagio(frentes[cfg.id], ctx());
    const antes = ultimos[cfg.id];
    if (cfg.estagioCalculado) frentes = { ...frentes, [cfg.id]: { ...frentes[cfg.id], estagio: e } };
    if (antes != null && e !== antes) {
      p2.push(`${cfg.emoji} ${cfg.nome}: Estágio ${antes} → ${e} (${cfg.nomeEstagio(e)})`);
      log(cfg.id, "estagio", `Estágio ${antes} → ${e}`, "estagio", antes, e);
      if (e > antes && cfg.aoSubirEstagio) {
        for (const a of cfg.aoSubirEstagio) {
          const r0 = ler(frentes[cfg.id], a.relogio);
          if (!r0) continue;
          const r1 = moverRelogio(r0, a.delta);
          frentes = { ...frentes, [cfg.id]: gravar(frentes[cfg.id], a.relogio, r1) };
          p2.push(`   ↳ ${a.motivo}: ${a.relogio.split(".").pop()} +${a.delta}`);
          log(cfg.id, "relogio", a.motivo, a.relogio, r0, r1);
        }
      }
    } else if (antes == null) p2.push(`${cfg.emoji} ${cfg.nome}: Estágio ${e} (${cfg.nomeEstagio(e)})`);
    ultimos[cfg.id] = e;
  }
  campanha.ultimos_estagios = ultimos;
  // ligações automáticas por estágio
  for (const l of LIGACOES.filter((x) => x.automatico_ao?.startsWith("estagio:"))) {
    const m = l.automatico_ao!.match(/^estagio:(\w+)>=(\d+)$/);
    if (!m || campanha.disparados?.[l.id]) continue;
    if ((ultimos[m[1]] ?? 0) >= Number(m[2])) {
      pendente(l.origem, l.id, `${l.gatilho}: ${l.texto}`, l.efeitos);
      campanha.disparados = { ...campanha.disparados, [l.id]: semana };
      p2.push(`🔗 Ligação automática: ${l.gatilho} → caixa de entrada`);
    }
  }
  passos.push({ titulo: "Estágios recalculados", itens: p2 });

  // ---------- 3. prazos, projetos, validades, ferimentos ----------
  const p3: string[] = [];
  const alertasTexto: { frente: string; texto: string }[] = [];
  for (const cfg of FRENTES) {
    if (!cfg.fecharPrazos) continue;
    const r = cfg.fecharPrazos(frentes[cfg.id], ctx(), semanaNova);
    frentes = { ...frentes, [cfg.id]: r.estado };
    r.mudancas.forEach((t) => {
      p3.push(`${cfg.emoji} ${t}`);
      log(cfg.id, "prazo", t);
    });
    r.alertas.forEach((t) => alertasTexto.push({ frente: cfg.id, texto: t }));
  }
  // efeitos temporários de todas as frentes
  for (const cfg of FRENTES) {
    const efs = (frentes[cfg.id].efeitos ?? []).filter((x: any) => {
      if (x.ate_semana != null && semanaNova > x.ate_semana) {
        p3.push(`${cfg.emoji} Acabou: ${x.texto}`);
        return false;
      }
      return true;
    });
    frentes = { ...frentes, [cfg.id]: { ...frentes[cfg.id], efeitos: efs } };
  }
  // projetos da cidade concluídos pelo prazo → efeitos na caixa de entrada
  frentes.cidade = {
    ...frentes.cidade,
    projetos: (frentes.cidade.projetos ?? []).map((p: any) => {
      if (!p.efeitos_pendentes) return p;
      const def = PROJETOS[p.nome];
      if (def && !p.via_ligacao) pendente("cidade", null, `Projeto concluído: ${p.nome}`, def.efeitos);
      return { ...p, efeitos_pendentes: false };
    }),
  };
  passos.push({ titulo: "Prazos, projetos, validades e ferimentos", itens: p3 });

  // ---------- 4. periódicos ----------
  const p4: string[] = [];
  const per = { ...(campanha.periodicos ?? {}) };
  const contar = (chave: string, vale: boolean, cada: number, disparar: () => void, rotulo: string) => {
    if (!vale) {
      if (per[chave]) p4.push(`${rotulo}: condição deixou de valer, contador zerado`);
      per[chave] = 0;
      return;
    }
    per[chave] = (per[chave] ?? 0) + 1;
    if (per[chave] >= cada) {
      per[chave] = 0;
      disparar();
      p4.push(`${rotulo}: disparou (a cada ${cada} semanas)`);
    } else p4.push(`${rotulo}: ${per[chave]}/${cada} semanas`);
  };
  for (const l of LIGACOES) {
    if (l.periodico)
      contar(l.id, avaliarCondicao(l.periodico.condicao, frentes), l.periodico.a_cada_semanas, () => pendente(l.origem, l.id, `${l.gatilho}: ${l.texto}`, l.efeitos), `🔗 ${l.gatilho}`);
    if (l.periodico_depois && campanha.disparados?.[l.id]) {
      const pd = l.periodico_depois;
      contar(`${l.id}:depois`, true, pd.a_cada_semanas, () => pendente(l.origem, l.id, `${l.gatilho} (depois): ${l.texto}`, pd.efeitos), `🔗 ${l.gatilho} (depois)`);
    }
  }
  for (const p of frentes.cidade.projetos ?? []) {
    const def = PROJETOS[p.nome];
    if (p.status === "concluido" && def?.periodico)
      contar(`proj:${p.nome}`, true, 4, () => pendente("cidade", null, `Projeto ${p.nome} (depois)`, [{ alvo: def.periodico!.alvo, marcas: def.periodico!.marcas }]), `🏗️ ${p.nome}`);
  }
  // lorde hostil: −1 marca em Economia a cada 4 semanas (trava do governo, aplicada direto)
  contar(
    "gov:lorde_hostil",
    frentes.cidade.governo === "lorde_hostil",
    4,
    () => {
      const antes = frentes.cidade.frentes.economia;
      const depois = { ...antes, marcas: antes.marcas - 1 };
      frentes.cidade = gravar(frentes.cidade, "frentes.economia", depois);
      log("cidade", "marcas", "Lorde hostil: −1 marca em Economia", "frentes.economia", antes, depois);
    },
    "👑 Lorde hostil",
  );
  campanha.periodicos = per;
  passos.push({ titulo: "Efeitos periódicos", itens: p4.filter((x) => !x.endsWith("0/4 semanas")) });

  // ---------- 5. alertas de relógio cheio ----------
  const p5: string[] = [];
  const abertos = new Set((campanha.alertas ?? []).filter((a: Alerta) => !a.resolvido).map((a: Alerta) => a.chave));
  const novoAlerta = (frenteId: string, chave: string, texto: string, caminho?: string) => {
    if (abertos.has(chave)) return false;
    const a: Alerta = { id: id("a"), chave, frente: frenteId, caminho, texto, semana, resolvido: false };
    alertasNovos.push(a);
    abertos.add(chave);
    p5.push(texto);
    return true;
  };
  for (const cfg of FRENTES) {
    for (const rs of cfg.relogios) {
      for (const cam of expandir(rs.caminho, frentes[cfg.id] ?? {})) {
        const r = ler(frentes[cfg.id], cam);
        if (!r || !relogioCheio(r)) continue;
        const cheio = rs.cheio ?? (rs.linhaRel != null ? cfg.regras.tabelas.rel?.linhas[rs.linhaRel]?.[3] : "") ?? "";
        const nome = r.nome ?? rs.rotulo;
        const criado = novoAlerta(cfg.id, `cheio:${cfg.id}:${cam}`, `${rs.emoji ?? "⏰"} ${cfg.nome} · ${nome} cheio: ${cheio}`, cam);
        if (criado) {
          for (const l of LIGACOES.filter((x) => x.automatico_ao === `relogio_cheio:${cfg.id}.${cam.replace(/^relogios\./, "")}`)) {
            pendente(l.origem, l.id, `${l.gatilho}: ${l.texto}`, l.efeitos);
            p5.push(`   ↳ 🔗 ${l.gatilho} → caixa de entrada`);
          }
        }
      }
    }
  }
  for (const t of alertasTexto) novoAlerta(t.frente, `txt:${t.frente}:${semana}:${t.texto}`, t.texto);
  campanha.alertas = [...(campanha.alertas ?? []), ...alertasNovos];
  passos.push({ titulo: "Alertas", itens: p5 });

  // ---------- 6. snapshot (estado antes do fechamento, para reabrir) ----------
  passos.push({ titulo: "Snapshot", itens: [`Semana ${semana} guardada`] });

  // ---------- 7. abre a semana N+1 ----------
  campanha.semana = semanaNova;
  campanha.estado = "aberta";
  campanha.turno_pronto = {};
  passos.push({ titulo: "Nova semana", itens: [`Semana ${semanaNova} aberta`] });

  return { banco: { campanha, frentes }, snapshot, eventos, pendentes, alertasNovos, passos };
}

/** Aprova um pendente: aplica os efeitos. */
export function opsDoPendente(p: Pendente, frentes: Record<string, Obj>) {
  return p.efeitos.flatMap((e) => efeitoParaOps(e, p.escolha, frentes, p.texto));
}

export { frente };
