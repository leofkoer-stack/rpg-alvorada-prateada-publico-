// Tipos básicos do motor. O estado de cada frente é um objeto JSON livre:
// a forma de cada campo é descrita pela configuração da frente (src/frentes).
export type Obj = Record<string, any>;

export interface Tabela {
  titulo: string;
  colunas: string[];
  linhas: string[][];
}

export interface Regras {
  frente: string;
  nome: string;
  dono: string;
  pdf: string;
  semana: string[];
  tabelas: Record<string, Tabela>;
  [extra: string]: any;
}

export interface Medida {
  nivel: number;
  marcas: number;
}

export interface Relogio {
  valor: number;
  tamanho: number;
}

export type Rng = () => number;
