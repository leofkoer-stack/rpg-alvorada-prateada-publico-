import fs from "node:fs";
import path from "node:path";
import type { Obj } from "@/motor/tipos";
import type { EventoLog } from "@/semana/aplicar";
import type { Pendente } from "@/semana/fechar";
import { Conflito, type Acesso, type Carregado, type EventoSalvo, type Store } from "./tipos";

interface Db {
  campanha: { dados: Obj; versao: number } | null;
  frentes: Record<string, { estado: Obj; versao: number }>;
  log: EventoSalvo[];
  pendentes: Pendente[];
  snapshots: Record<string, Obj>;
  acessos: Acesso[];
}

/** Banco em arquivo JSON (.data/db.json), para rodar local sem conta nenhuma. */
export class StoreArquivo implements Store {
  constructor(private arquivo = path.join(process.cwd(), ".data", "db.json")) {}
  private ler(): Db {
    if (!fs.existsSync(this.arquivo)) return { campanha: null, frentes: {}, log: [], pendentes: [], snapshots: {}, acessos: [] };
    return JSON.parse(fs.readFileSync(this.arquivo, "utf8"));
  }
  private gravar(db: Db) {
    fs.mkdirSync(path.dirname(this.arquivo), { recursive: true });
    const tmp = this.arquivo + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, this.arquivo);
  }
  async carregar(): Promise<Carregado | null> {
    const db = this.ler();
    if (!db.campanha) return null;
    return {
      campanha: db.campanha.dados,
      versaoCampanha: db.campanha.versao,
      frentes: Object.fromEntries(Object.entries(db.frentes).map(([k, v]) => [k, v.estado])),
      versoes: Object.fromEntries(Object.entries(db.frentes).map(([k, v]) => [k, v.versao])),
    };
  }
  async salvar(c: Parameters<Store["salvar"]>[0]) {
    const db = this.ler();
    if (c.campanha) {
      if (db.campanha && db.campanha.versao !== c.campanha.versao) throw new Conflito();
      db.campanha = { dados: c.campanha.dados, versao: c.campanha.versao + 1 };
    }
    for (const [id, f] of Object.entries(c.frentes)) {
      const atual = db.frentes[id];
      if (atual && atual.versao !== f.versao) throw new Conflito();
      db.frentes[id] = { estado: f.estado, versao: f.versao + 1 };
    }
    this.gravar(db);
  }
  async registrar(eventos: EventoLog[]) {
    if (!eventos.length) return;
    const db = this.ler();
    let id = db.log.length ? db.log[db.log.length - 1].id : 0;
    const agora = new Date().toISOString();
    for (const e of eventos) db.log.push({ ...e, id: ++id, criado_em: agora });
    this.gravar(db);
  }
  async log(f: { frente?: string; limite?: number }) {
    const db = this.ler();
    const l = f.frente ? db.log.filter((e) => e.frente === f.frente) : db.log;
    return l.slice(-(f.limite ?? 200)).reverse();
  }
  async pendentes(status?: Pendente["status"]) {
    const db = this.ler();
    return status ? db.pendentes.filter((p) => p.status === status) : db.pendentes;
  }
  async criarPendentes(p: Pendente[]) {
    if (!p.length) return;
    const db = this.ler();
    db.pendentes.push(...p);
    this.gravar(db);
  }
  async atualizarPendente(p: Pendente) {
    const db = this.ler();
    db.pendentes = db.pendentes.map((x) => (x.id === p.id ? p : x));
    this.gravar(db);
  }
  async salvarSnapshot(semana: number, banco: Obj) {
    const db = this.ler();
    db.snapshots[String(semana)] = banco;
    this.gravar(db);
  }
  async lerSnapshot(semana: number) {
    return this.ler().snapshots[String(semana)] ?? null;
  }
  async apagarSnapshot(semana: number) {
    const db = this.ler();
    delete db.snapshots[String(semana)];
    this.gravar(db);
  }
  async acessos() {
    return this.ler().acessos;
  }
  async acessoPorHash(hash: string) {
    return this.ler().acessos.find((a) => a.hash === hash && !a.revogado) ?? null;
  }
  async criarAcesso(a: Acesso) {
    const db = this.ler();
    db.acessos.push(a);
    this.gravar(db);
  }
  async revogarAcesso(id: string) {
    const db = this.ler();
    db.acessos = db.acessos.map((a) => (a.id === id ? { ...a, revogado: true } : a));
    this.gravar(db);
  }
  async substituirTudo(d: Parameters<Store["substituirTudo"]>[0]) {
    const db = this.ler();
    db.campanha = { dados: d.campanha, versao: (db.campanha?.versao ?? 0) + 1 };
    db.frentes = Object.fromEntries(Object.entries(d.frentes).map(([k, v]) => [k, { estado: v, versao: (db.frentes[k]?.versao ?? 0) + 1 }]));
    db.pendentes = d.pendentes ?? [];
    db.snapshots = d.snapshots ?? {};
    this.gravar(db);
  }
  async exportarTudo() {
    const db = this.ler();
    return {
      campanha: db.campanha?.dados ?? {},
      frentes: Object.fromEntries(Object.entries(db.frentes).map(([k, v]) => [k, v.estado])),
      pendentes: db.pendentes,
      snapshots: db.snapshots,
      log: db.log,
    };
  }
}
