import regras from "@dados/regras-culto.json";
import type { Regras } from "@/motor/tipos";
import type { FrenteConfig, FechamentoFrente } from "./tipos";
import { estagioCulto, nivelCulto, somaRaizes, dadosEstagioCulto, modHumor } from "@/motor/culto";
import { nomeEstagioTabela, tab } from "./util";

const R = regras as unknown as Regras;

export function niveisCulto(e: any) {
  const niv = tab(R, "niv");
  return {
    fieis: nivelCulto(niv, 1, Number(e.fieis) || 0),
    raizes: nivelCulto(niv, 2, somaRaizes(e.raizes_por_zona)),
    tesouro: nivelCulto(niv, 3, Number(e.tesouro_recursos) || 0),
  };
}
export const estagioDoCulto = (e: any) => {
  const n = niveisCulto(e);
  return estagioCulto(n.fieis, n.raizes, n.tesouro);
};
export const dadosDoEstagio = (e: any) => dadosEstagioCulto(tab(R, "est"), estagioDoCulto(e));

const faixa = (t: string, v: number) => {
  const l = tab(R, t).linhas.find((x) => {
    const m = x[0].replace(/[−–]/g, "-").match(/(-?\+?\d+)\s*a\s*(-?\+?\d+)/);
    return m ? v >= Number(m[1]) && v <= Number(m[2]) : Number(x[0].replace(/[−]/g, "-")) === v;
  });
  return l ? l[1] : "";
};

export const culto: FrenteConfig = {
  id: "culto",
  nome: "Culto do Simon",
  emoji: "🩸",
  dono: "Pedro",
  personagem: "Simon",
  papelDono: "jogador",
  regras: R,
  cores: { destaque: "#7a1426", fundo: "#3b0d17", detalhe: "#a9833a" },
  estagioCalculado: true,
  campos: [
    { caminho: "fieis", rotulo: "Fiéis", emoji: "🙏", tipo: "contador", min: 0 },
    { caminho: "tesouro_recursos", rotulo: "Tesouro (Recursos)", emoji: "💰", tipo: "contador", min: 0 },
    { caminho: "raizes_por_zona.*", rotulo: "Raiz", emoji: "🌱", tipo: "escala", min: 0, max: 5 },
    { caminho: "fe", rotulo: "Fé", emoji: "🔥", tipo: "escala", min: 0, max: 10 },
    { caminho: "comunhao", rotulo: "Comunhão", emoji: "🫂", tipo: "escala", min: 1, max: 5 },
    { caminho: "proposito", rotulo: "Propósito", emoji: "✨", tipo: "contador", min: 0 },
    { caminho: "reputacao", rotulo: "Reputação", emoji: "📜", tipo: "escala", min: -5, max: 5, nomeNivel: (n) => faixa("rep", n) },
    { caminho: "revelacao", rotulo: "Revelação", emoji: "👁️", tipo: "escala", min: 0, max: 10, nomeNivel: (n) => faixa("rev", n) },
    {
      caminho: "flagelados_relacao",
      rotulo: "Flagelados",
      emoji: "⛓️",
      tipo: "escala",
      min: -3,
      max: 3,
      nomeNivel: (n) => tab(R, "rel").linhas.find((l) => Number(l[0].replace("−", "-").replace("+", "")) === n)?.[1] ?? "",
    },
    { caminho: "lideres.*.lealdade", rotulo: "Lealdade", emoji: "🤝", tipo: "escala", min: 0, max: 30 },
    { caminho: "lideres.*.vidas", rotulo: "Vidas", emoji: "❤️‍🩹", tipo: "escala", min: 0, max: 12 },
  ],
  relogios: [],
  cartao: ["fe", "revelacao", "fieis"],
  rolaveis: [
    { tabela: "hum", rotulo: "Humor dos fiéis", mod: (e) => modHumor(e.fe ?? 0), modRotulo: "Fé" },
    { tabela: "d100", rotulo: "Evento da semana" },
    { tabela: "d20", rotulo: "Complicação" },
    { tabela: "mar", rotulo: "Maré pública", dado: "d20", mod: (e) => (e.reputacao ?? 0) - (e.revelacao ?? 0), modRotulo: "Reputação − Revelação" },
    { tabela: "d8", rotulo: "Cisma" },
    { tabela: "d10", rotulo: "Flagelados" },
    { tabela: "d12", rotulo: "Sinal" },
    { tabela: "g6", rotulo: "Gerador de líder" },
  ],
  consulta: ["cap", "art", "fon", "proj", "prod", "iten", "ama_uso", "ama_fic", "g6", "enc", "alc", "cd", "raiz", "leal", "prop", "exs"],
  estagio: (e) => estagioDoCulto(e),
  nomeEstagio: (n) => nomeEstagioTabela(tab(R, "est"), n),
  limiteAcoes: (e) => dadosDoEstagio(e).obras,
  aoSubirEstagio: [],
  fecharPrazos: (e, _ctx, semanaNova): FechamentoFrente => {
    const mudancas: string[] = [];
    const alertas: string[] = [];
    const d = dadosDoEstagio(e);
    let revelacao = e.revelacao ?? 0;
    if (revelacao < d.revelacaoMin) {
      mudancas.push(`Revelação sobe para o mínimo do estágio (${d.revelacaoMin})`);
      revelacao = d.revelacaoMin;
    }
    let comunhao = e.comunhao ?? 1;
    if (comunhao > d.comunhaoMax) {
      mudancas.push(`Comunhão limitada ao máximo do estágio (${d.comunhaoMax})`);
      comunhao = d.comunhaoMax;
    }
    const projetos = (e.projetos ?? []).map((p: any) => {
      if (p.status !== "ativo" || p.semanas_restantes == null) return p;
      const s = p.semanas_restantes - 1;
      if (s <= 0) {
        alertas.push(`🏗️ Projeto do culto pronto: ${p.nome}`);
        return { ...p, semanas_restantes: 0, status: "concluido" };
      }
      return { ...p, semanas_restantes: s };
    });
    if ((e.fe ?? 5) <= 2 || e.semanal?.lealdade_falha10) alertas.push("⚠️ Cisma: teste na próxima semana (Fé ≤ 2 ou Lealdade falhada por 10+).");
    return { estado: { ...e, revelacao, comunhao, projetos, semanal: {}, _semana: semanaNova }, mudancas, alertas };
  },
};
