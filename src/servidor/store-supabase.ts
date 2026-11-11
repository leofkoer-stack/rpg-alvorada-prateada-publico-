import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Obj } from "@/motor/tipos";
import type { EventoLog } from "@/semana/aplicar";
import type { Pendente } from "@/semana/fechar";
import { Conflito, type Acesso, type Carregado, type EventoSalvo, type Store } from "./tipos";

/**
 * Banco no Supabase (Postgres). Usa a chave de serviço, só no servidor.
 * As tabelas estão em supabase/schema.sql (RLS ligado, sem políticas: o navegador não acessa nada direto).
 */
export class StoreSupabase implements Store {
  private db: SupabaseClient;
  constructor(url: string, chave: string) {
    this.db = createClient(url, chave, { auth: { persistSession: false } });
  }
  private ok<T>(r: { data: T; error: any }): T {
    if (r.error) throw new Error(`Banco: ${r.error.message}`);
    return r.data;
  }
  async carregar(): Promise<Carregado | null> {
    const c = this.ok(await this.db.from("campanha").select("*").eq("id", 1).maybeSingle()) as any;
    if (!c) return null;
    const fs = this.ok(await this.db.from("frente").select("id, estado, versao")) as any[];
    return {
      campanha: c.dados,
      versaoCampanha: c.versao,
      frentes: Object.fromEntries(fs.map((f) => [f.id, f.estado])),
      versoes: Object.fromEntries(fs.map((f) => [f.id, f.versao])),
    };
  }
  async salvar(c: Parameters<Store["salvar"]>[0]) {
    // Escrita condicional pela versão: se outra pessoa salvou antes, nada é gravado.
    if (c.campanha) {
      const d = c.campanha.dados;
      const linha = { semana: d.semana, estado_semana: d.estado, dados: d, versao: c.campanha.versao + 1 };
      const existe = this.ok(await this.db.from("campanha").select("versao").eq("id", 1).maybeSingle()) as any;
      if (!existe) this.ok(await this.db.from("campanha").insert({ id: 1, ...linha }));
      else {
        const r = this.ok(await this.db.from("campanha").update(linha).eq("id", 1).eq("versao", c.campanha.versao).select("id")) as any[];
        if (!r.length) throw new Conflito();
      }
    }
    for (const [id, f] of Object.entries(c.frentes)) {
      const existe = this.ok(await this.db.from("frente").select("versao").eq("id", id).maybeSingle()) as any;
      if (!existe) {
        this.ok(await this.db.from("frente").insert({ id, estado: f.estado, versao: f.versao + 1 }));
        continue;
      }
      const r = this.ok(await this.db.from("frente").update({ estado: f.estado, versao: f.versao + 1 }).eq("id", id).eq("versao", f.versao).select("id")) as any[];
      if (!r.length) throw new Conflito();
    }
  }
  async registrar(eventos: EventoLog[]) {
    if (eventos.length) this.ok(await this.db.from("evento_log").insert(eventos));
  }
  async log(f: { frente?: string; limite?: number }) {
    let q = this.db.from("evento_log").select("*").order("id", { ascending: false }).limit(f.limite ?? 200);
    if (f.frente) q = q.eq("frente", f.frente);
    return this.ok(await q) as EventoSalvo[];
  }
  async pendentes(status?: Pendente["status"]) {
    let q = this.db.from("efeito_pendente").select("dados").order("criado_em", { ascending: true });
    if (status) q = q.eq("status", status);
    return (this.ok(await q) as any[]).map((r) => r.dados);
  }
  async criarPendentes(p: Pendente[]) {
    if (p.length) this.ok(await this.db.from("efeito_pendente").insert(p.map((x) => ({ id: x.id, status: x.status, dados: x }))));
  }
  async atualizarPendente(p: Pendente) {
    this.ok(await this.db.from("efeito_pendente").update({ status: p.status, decidido_por: p.decidido_por ?? null, dados: p }).eq("id", p.id));
  }
  async salvarSnapshot(semana: number, banco: Obj) {
    this.ok(await this.db.from("snapshot_semana").upsert({ semana, estado: banco }));
  }
  async lerSnapshot(semana: number) {
    const r = this.ok(await this.db.from("snapshot_semana").select("estado").eq("semana", semana).maybeSingle()) as any;
    return r?.estado ?? null;
  }
  async apagarSnapshot(semana: number) {
    this.ok(await this.db.from("snapshot_semana").delete().eq("semana", semana));
  }
  async acessos() {
    return this.ok(await this.db.from("acesso").select("*").order("criado_em")) as Acesso[];
  }
  async acessoPorHash(hash: string) {
    return (this.ok(await this.db.from("acesso").select("*").eq("hash", hash).eq("revogado", false).maybeSingle()) as Acesso) ?? null;
  }
  async criarAcesso(a: Acesso) {
    this.ok(await this.db.from("acesso").insert(a));
  }
  async revogarAcesso(id: string) {
    this.ok(await this.db.from("acesso").update({ revogado: true }).eq("id", id));
  }
  async substituirTudo(d: Parameters<Store["substituirTudo"]>[0]) {
    const atual = await this.carregar();
    this.ok(await this.db.from("campanha").upsert({ id: 1, semana: d.campanha.semana, estado_semana: d.campanha.estado, dados: d.campanha, versao: (atual?.versaoCampanha ?? 0) + 1 }));
    for (const [id, estado] of Object.entries(d.frentes))
      this.ok(await this.db.from("frente").upsert({ id, estado, versao: (atual?.versoes[id] ?? 0) + 1 }));
    this.ok(await this.db.from("efeito_pendente").delete().neq("id", ""));
    await this.criarPendentes(d.pendentes ?? []);
    this.ok(await this.db.from("snapshot_semana").delete().gte("semana", 0));
    for (const [s, e] of Object.entries(d.snapshots ?? {})) await this.salvarSnapshot(Number(s), e);
  }
  async exportarTudo() {
    const c = await this.carregar();
    const snaps = this.ok(await this.db.from("snapshot_semana").select("semana, estado")) as any[];
    return {
      campanha: c?.campanha ?? {},
      frentes: c?.frentes ?? {},
      pendentes: await this.pendentes(),
      snapshots: Object.fromEntries(snaps.map((s) => [String(s.semana), s.estado])),
      log: await this.log({ limite: 100000 }),
    };
  }
}
