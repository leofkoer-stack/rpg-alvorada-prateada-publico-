import type { Obj } from "@/motor/tipos";
import type { EventoLog } from "@/semana/aplicar";
import type { Pendente } from "@/semana/fechar";

export type Papel = "mestre" | "jogador" | "admin";

export interface Acesso {
  id: string;
  hash: string;
  papel: Papel;
  frente: string | null;
  nome: string;
  criado_em: string;
  revogado: boolean;
}

export interface EventoSalvo extends EventoLog {
  id: number;
  criado_em: string;
}

export interface Carregado {
  campanha: Obj;
  versaoCampanha: number;
  frentes: Record<string, Obj>;
  versoes: Record<string, number>;
}

export class Conflito extends Error {
  constructor() {
    super("Alguém salvou ao mesmo tempo. Tente de novo.");
  }
}

export interface Store {
  carregar(): Promise<Carregado | null>;
  /** grava campanha e frentes mudadas; falha com Conflito se a versão não bater */
  salvar(c: { campanha?: { dados: Obj; versao: number }; frentes: Record<string, { estado: Obj; versao: number }> }): Promise<void>;
  registrar(eventos: EventoLog[]): Promise<void>;
  log(f: { frente?: string; limite?: number }): Promise<EventoSalvo[]>;
  pendentes(status?: Pendente["status"]): Promise<Pendente[]>;
  criarPendentes(p: Pendente[]): Promise<void>;
  atualizarPendente(p: Pendente): Promise<void>;
  salvarSnapshot(semana: number, banco: Obj): Promise<void>;
  lerSnapshot(semana: number): Promise<Obj | null>;
  apagarSnapshot(semana: number): Promise<void>;
  acessos(): Promise<Acesso[]>;
  acessoPorHash(hash: string): Promise<Acesso | null>;
  criarAcesso(a: Acesso): Promise<void>;
  revogarAcesso(id: string): Promise<void>;
  /** importação de backup: troca tudo (menos os acessos) */
  substituirTudo(d: { campanha: Obj; frentes: Record<string, Obj>; pendentes: Pendente[]; snapshots: Record<string, Obj> }): Promise<void>;
  exportarTudo(): Promise<{ campanha: Obj; frentes: Record<string, Obj>; pendentes: Pendente[]; snapshots: Record<string, Obj>; log: EventoSalvo[] }>;
}
