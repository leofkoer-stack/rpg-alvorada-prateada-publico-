import regras from "@dados/regras-caldeirao.json";
import type { Regras } from "@/motor/tipos";
import type { FrenteConfig, FechamentoFrente } from "./tipos";
import { nomeEstagioTabela, tab, num } from "./util";

const R = regras as unknown as Regras;
const estado3 = (t: string) => (n: number) => tab(R, t).linhas[n]?.[1] ?? "";

export const caldeirao: FrenteConfig = {
  id: "caldeirao",
  nome: "Caldeirão Trovejante",
  emoji: "🍲",
  dono: "Fábio",
  personagem: "Chopp",
  papelDono: "jogador",
  regras: R,
  cores: { destaque: "#a4511d", fundo: "#2a1d12", detalhe: "#3d6c8f" },
  estagioCalculado: false,
  campos: [
    { caminho: "estagio", rotulo: "Estágio", emoji: "🏠", tipo: "escala", min: 0, max: 5 },
    { caminho: "pertencimento", rotulo: "Pertencimento", emoji: "🫶", tipo: "medida", nomeNivel: estado3("pert") },
    { caminho: "fama", rotulo: "Fama", emoji: "⭐", tipo: "medida", nomeNivel: estado3("fama") },
    { caminho: "caixa_po", rotulo: "Caixa (PO)", emoji: "🪙", tipo: "contador" },
    { caminho: "despensa.frescas", rotulo: "Porções frescas", emoji: "🥩", tipo: "contador", min: 0 },
    { caminho: "despensa.raras", rotulo: "Porções raras", emoji: "💎", tipo: "contador", min: 0 },
    { caminho: "despensa.ervas", rotulo: "Porções de ervas", emoji: "🌿", tipo: "contador", min: 0 },
  ],
  relogios: [
    { caminho: "relogios.paladar", rotulo: "Paladar", emoji: "👅", linhaRel: 0 },
    { caminho: "relogios.fome", rotulo: "Fome", emoji: "🥣", linhaRel: 1 },
  ],
  cartao: ["pertencimento", "fama"],
  rolaveis: [
    { tabela: "ev", rotulo: "Evento do salão" },
    { tabela: "quem", rotulo: "Quem aparece" },
  ],
  consulta: ["salao", "ingr", "obter", "quem", "tipos", "fluxo", "func"],
  tabelaResultado: "res",
  estagio: (e) => e.estagio ?? 0,
  nomeEstagio: (n) => nomeEstagioTabela(tab(R, "est"), n),
  limiteAcoes: (e) => num(tab(R, "est").linhas[e.estagio ?? 0][2]),
  fecharPrazos: (e, _ctx, semanaNova): FechamentoFrente => {
    const mudancas: string[] = [];
    const alertas: string[] = [];
    const d = { ...(e.despensa ?? {}) };
    // frescas duram 1 semana
    if ((d.frescas ?? 0) > 0) mudancas.push(`${d.frescas} porções frescas estragaram`);
    d.frescas = 0;
    // comuns duram 4 semanas (por lote)
    const lotes = (d.comuns ?? []).filter((l: any) => {
      if (l.validade_semana != null && semanaNova > l.validade_semana) {
        mudancas.push(`${l.qtd} porções comuns venceram`);
        return false;
      }
      return true;
    });
    d.comuns = lotes;
    // fundos produzem para a semana nova, só se alguém cuidou
    const fundos = (e.fundos ?? []).map((f: any) => {
      if (f.cuidado_semana) {
        const qtd = (f.producao_porcoes ?? 0) * (f.dobro_semana ? 2 : 1);
        const tipo = f.tipo === "ervas" ? "ervas" : "frescas";
        d[tipo] = (d[tipo] ?? 0) + qtd;
        mudancas.push(`${f.nome}: +${qtd} porções ${tipo}`);
        return { ...f, cuidado_semana: false, dobro_semana: false, semanas_sem_cuidado: 0 };
      }
      const s = (f.semanas_sem_cuidado ?? 0) + 1;
      if (s >= 2) alertas.push(`🐖 ${f.nome}: 2 semanas sem cuidado. Dispara o evento 3 do salão.`);
      return { ...f, semanas_sem_cuidado: s };
    });
    // equipe: sem pagamento, sai em 2 semanas
    const equipe = (e.equipe ?? [])
      .map((p: any) => (p.pago_semana ? { ...p, pago_semana: false, semanas_sem_pagar: 0 } : { ...p, semanas_sem_pagar: (p.semanas_sem_pagar ?? 0) + 1 }))
      .filter((p: any) => {
        if (p.semanas_sem_pagar >= 2) {
          alertas.push(`👋 ${p.nome} saiu da equipe (2 semanas sem pagamento).`);
          return false;
        }
        if (p.semanas_sem_pagar === 1) mudancas.push(`${p.nome} ficou 1 semana sem pagamento`);
        return true;
      });
    return { estado: { ...e, despensa: d, fundos, equipe, semanal: {}, _semana: semanaNova }, mudancas, alertas };
  },
};
