import regras from "@dados/regras-radio.json";
import type { Regras } from "@/motor/tipos";
import type { FrenteConfig, FechamentoFrente } from "./tipos";
import { tetoRadio } from "@/motor/radio";
import { nomeEstagioTabela, tab, num } from "./util";

const R = regras as unknown as Regras;
const inf = tab(R, "inf");
const PODERES: Record<string, number> = { guildas: 1, nobreza: 2, clero: 3, povo: 4 };

export const radio: FrenteConfig = {
  id: "radio",
  nome: "Rádio e gravadora",
  emoji: "📻",
  dono: "Leonardo",
  personagem: "Mandy",
  papelDono: "jogador",
  regras: R,
  cores: { destaque: "#1f7a7a", fundo: "#103a3e", detalhe: "#b08a3e" },
  estagioCalculado: false,
  campos: [
    { caminho: "estagio", rotulo: "Estágio", emoji: "📶", tipo: "escala", min: 0, max: 5 },
    {
      caminho: "sinal_por_zona.*",
      rotulo: "Sinal",
      emoji: "📡",
      tipo: "medida",
      max: 3,
      ordem: 0,
      nomeNivel: (n) => tab(R, "sinal").linhas[n]?.[0].split("·")[1]?.trim() ?? "",
    },
    {
      caminho: "audiencia",
      rotulo: "Audiência",
      emoji: "👂",
      tipo: "medida",
      ordem: 1,
      teto: (e) => tetoRadio(e.sinal_por_zona),
      aoSubir: [{ relogio: "relogios.pressao", delta: 1, motivo: "Audiência subiu de nível" }],
    },
    ...Object.entries(PODERES).map(([p, col]) => ({
      caminho: `influencia.${p}`,
      rotulo: inf.colunas[col],
      emoji: ({ guildas: "⚖️", nobreza: "👑", clero: "⛪", povo: "🧑‍🤝‍🧑" } as any)[p],
      tipo: "medida" as const,
      ordem: 1,
      teto: (e: any) => tetoRadio(e.sinal_por_zona),
      nomeNivel: (n: number) => (n === 0 ? "—" : inf.linhas[n - 1]?.[col] ?? ""),
    })),
    {
      caminho: "integridade",
      rotulo: "Integridade",
      emoji: "🧭",
      tipo: "escala",
      min: 0,
      max: 10,
      nomeNivel: (n) =>
        tab(R, "integ").linhas.find((l) => {
          const m = l[0].match(/(\d+)\s*a\s*(\d+)/);
          return m ? n >= num(m[1]) && n <= num(m[2]) : num(l[0]) === n;
        })?.[1] ?? "",
    },
    { caminho: "caixa_po", rotulo: "Caixa (PO)", emoji: "🪙", tipo: "contador" },
  ],
  relogios: [
    { caminho: "relogios.pressao", rotulo: "Pressão", emoji: "🔥", linhaRel: 0 },
    { caminho: "relogios.bardos", rotulo: "Bardos", emoji: "🎻", linhaRel: 1 },
  ],
  aoSubirEstagio: [{ relogio: "relogios.bardos", delta: 1, motivo: "Estágio da rádio subiu" }],
  cartao: ["audiencia", "integridade"],
  rolaveis: [
    { tabela: "d6c", rotulo: "Continente" },
    { tabela: "d8z", rotulo: "Zona de Lykh" },
    { tabela: "pautas", rotulo: "Pauta" },
    { tabela: "disp", rotulo: "Disposição da fonte" },
    { tabela: "traz", rotulo: "O que a fonte traz" },
    { tabela: "desd", rotulo: "Desdobramento" },
    { tabela: "bast", rotulo: "Bastidores" },
  ],
  consulta: ["mus", "mtier", "contr", "fita", "cont", "zon", "ini"],
  tabelaResultado: "conv",
  estagio: (e) => e.estagio ?? 0,
  nomeEstagio: (n) => nomeEstagioTabela(tab(R, "fases"), n),
  limiteAcoes: (e) => num(tab(R, "fases").linhas[e.estagio ?? 0][2]),
  fecharPrazos: (e, _ctx, semanaNova): FechamentoFrente => {
    const mudancas: string[] = [];
    const alertas: string[] = [];
    const contratos = (e.contratos ?? [])
      .map((c: any) => ({ ...c, semanas_restantes: (c.semanas_restantes ?? 0) - 1 }))
      .filter((c: any) => {
        if (c.semanas_restantes <= 0) {
          mudancas.push(`Contrato de patrocínio encerrado: ${c.nome}`);
          return false;
        }
        return true;
      });
    const grade = Object.fromEntries(Object.keys(e.grade ?? {}).map((k) => [k, false]));
    return { estado: { ...e, contratos, grade, pautas_semana: [], especiais_semana: [], _semana: semanaNova }, mudancas, alertas };
  },
};
