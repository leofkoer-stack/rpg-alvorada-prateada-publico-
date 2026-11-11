import regras from "@dados/regras-cidade.json";
import type { Regras } from "@/motor/tipos";
import type { FrenteConfig, FechamentoFrente } from "./tipos";
import { tab, num } from "./util";

const R = regras as unknown as Regras;

/** Bônus do rank pela tabela `rk` ("prata" → +5). */
export function bonusRank(rank: string | null | undefined): number | null {
  if (!rank) return null;
  const l = tab(R, "rk").linhas.find((x) => x[0].toLowerCase().includes(rank.toLowerCase()));
  return l ? num(l[2]) : null;
}
export const RANKS = tab(R, "rk").linhas.map((l) => l[0].replace(/^\S+\s/, ""));

export const guilda: FrenteConfig = {
  id: "guilda",
  nome: "Guilda Alvorada Prateada",
  emoji: "🛡️",
  dono: "Lucca",
  papelDono: "mestre",
  regras: R,
  cores: { destaque: "#2c5a7a", fundo: "#17283a", detalhe: "#a8873f" },
  estagioCalculado: true,
  campos: [
    { caminho: "cofre_pl", rotulo: "Cofre (PL)", emoji: "💎", tipo: "contador" },
    { caminho: "cofre_pl_disponivel", rotulo: "PL disponível para uso", emoji: "🔓", tipo: "contador" },
    { caminho: "cofre_po", rotulo: "Caixa da guilda (PO)", emoji: "🪙", tipo: "contador" },
  ],
  relogios: [],
  cartao: [],
  rolaveis: [
    { tabela: "alc", rotulo: "Alcance (d6)" },
    { tabela: "mp", rotulo: "Patamar (d20 + Notoriedade)", mod: (_e, ctx) => ctx.frentes.cidade?.frentes?.notoriedade?.nivel ?? 0, modRotulo: "Notoriedade" },
    { tabela: "tipo", rotulo: "Tipo (d12)" },
    { tabela: "det", rotulo: "Detalhe (d8)" },
    { tabela: "ach", rotulo: "Achado (d6)" },
    { tabela: "rev", rotulo: "Revés (d8)" },
  ],
  consulta: ["staff", "rk", "inst"],
  tabelaResultado: "res",
  estagio: () => 0,
  nomeEstagio: () => "",
  limiteAcoes: () => 0,
  fecharPrazos: (e, _ctx, semanaNova): FechamentoFrente => {
    const mudancas: string[] = [];
    const alertas: string[] = [];
    const elenco = (e.elenco ?? []).map((g: any) => {
      if (g.estado === "ferido" && g.ferido_ate != null && semanaNova >= g.ferido_ate) {
        mudancas.push(`${g.grupo} se recuperou e está livre`);
        return { ...g, estado: "livre", ferido_ate: null };
      }
      return g;
    });
    const instalacoes = (e.instalacoes ?? []).map((i: any) => {
      if (i.status !== "ativo" || i.semanas_restantes == null) return i;
      const s = i.semanas_restantes - 1;
      if (s <= 0) {
        alertas.push(`🏗️ Instalação pronta: ${i.nome}`);
        return { ...i, semanas_restantes: 0, status: "concluido" };
      }
      mudancas.push(`Instalação ${i.nome}: faltam ${s} semana(s)`);
      return { ...i, semanas_restantes: s };
    });
    return { estado: { ...e, elenco, instalacoes, bonus_proxima_missao: e.bonus_proxima_missao ?? [] }, mudancas, alertas };
  },
};
