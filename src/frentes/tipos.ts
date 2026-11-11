import type { Obj, Regras } from "@/motor/tipos";

export type FrenteId = string;

/** Contexto que a configuração recebe: todos os estados + campanha. */
export interface Ctx {
  frentes: Record<FrenteId, Obj>;
  campanha: Obj;
}

export interface CampoSpec {
  /** caminho no estado; aceita curinga: "sinal_por_zona.*" */
  caminho: string;
  rotulo: string;
  emoji?: string;
  tipo: "medida" | "escala" | "contador" | "texto";
  min?: number;
  max?: number;
  /** nome do nível (para medida/escala) */
  nomeNivel?: (n: number) => string;
  /** teto dinâmico que trava a subida */
  teto?: (estado: Obj, ctx: Ctx) => number | null;
  /** relógios que andam quando a medida sobe de nível (tabela rel) */
  aoSubir?: { frente?: FrenteId; relogio: string; delta: number; motivo: string; deNivel?: number }[];
  /** ordem de conversão no fechamento (menor primeiro) */
  ordem?: number;
}

export interface RelogioSpec {
  caminho: string; // "relogios.pressao" ou "rastros.*"
  rotulo: string;
  emoji?: string;
  /** índice da linha na tabela `rel` (colunas Avança/Recua/Cheio) */
  linhaRel?: number;
  /** texto quando cheio, se não vier da tabela */
  cheio?: string;
}

export interface Rolavel {
  tabela: string;
  /** dado, quando a tabela não diz (ex.: Maré pública: "d20") */
  dado?: string;
  rotulo?: string;
  /** modificador somado antes da consulta (ex.: d20 + Renome) */
  mod?: (estado: Obj, ctx: Ctx) => number;
  modRotulo?: string;
}

export interface Cores {
  destaque: string;
  fundo: string;
  detalhe: string;
}

export interface FechamentoFrente {
  estado: Obj;
  mudancas: string[];
  alertas: string[];
  /** marcas lançadas por este passo (vão para a semana seguinte) */
}

export interface FrenteConfig {
  id: FrenteId;
  nome: string;
  emoji: string;
  dono: string; // pessoa
  personagem?: string;
  papelDono: "mestre" | "jogador";
  regras: Regras;
  cores: Cores;
  campos: CampoSpec[];
  relogios: RelogioSpec[];
  /** caminhos das 2 ou 3 medidas principais no cartão do Mestre */
  cartao: string[];
  rolaveis: Rolavel[];
  /** tabelas só de consulta (com link para o PDF) */
  consulta: string[];
  /** id da tabela de resultado de teste */
  tabelaResultado?: string;
  estagio: (estado: Obj, ctx: Ctx) => number;
  nomeEstagio: (estagio: number) => string;
  limiteAcoes: (estado: Obj, ctx: Ctx) => number;
  /** relógios que andam quando o estágio sobe */
  aoSubirEstagio?: { relogio: string; delta: number; motivo: string }[];
  /** o estágio é calculado (cidade, culto) ou escolhido pelo dono (campo "estagio") */
  estagioCalculado: boolean;
  /** passo 3 do fechamento: prazos, projetos, validades e ferimentos */
  fecharPrazos?: (estado: Obj, ctx: Ctx, semanaNova: number) => FechamentoFrente;
  /** resumo público (D3); só a cidade publica */
  bonus?: (estado: Obj) => Record<string, number | null>;
}
