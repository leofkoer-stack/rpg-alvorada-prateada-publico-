import regras from "@dados/regras-cidade.json";
import type { Regras } from "@/motor/tipos";
import type { FrenteConfig, FechamentoFrente } from "./tipos";
import { estagioCidade, limiteAcoesCidade, tetosDoGoverno, type Governo, FRENTES_CIDADE } from "@/motor/cidade";
import { nomeEstagioTabela, tab } from "./util";

const R = regras as unknown as Regras;
const lv = tab(R, "lv");

export const ROTULOS_CIDADE: Record<string, { rotulo: string; emoji: string; col: number }> = {
  populacao: { rotulo: "População", emoji: "👥", col: 1 },
  economia: { rotulo: "Economia", emoji: "💰", col: 2 },
  rotas: { rotulo: "Rotas", emoji: "🛣️", col: 3 },
  influencia: { rotulo: "Influência", emoji: "🏛️", col: 4 },
  notoriedade: { rotulo: "Notoriedade", emoji: "📣", col: 5 },
  seguranca: { rotulo: "Segurança", emoji: "🛡️", col: 6 },
  moral: { rotulo: "Moral", emoji: "❤️", col: 7 },
};

/**
 * Efeitos dos projetos, transcritos da tabela `proj` (colunas "Ao concluir" e "Depois").
 * `viaLigacao`: a conclusão vem de uma ligação (seção 8), que já traz as marcas.
 */
export const PROJETOS: Record<
  string,
  {
    efeitos: { alvo: string; marcas?: number; niveis?: number }[];
    periodico?: { alvo: string; marcas: number };
    manutencaoExtra?: number;
    liberaRotas4?: boolean;
    viaLigacao?: boolean;
  }
> = {
  "Torre de rádio e gravadora": { efeitos: [{ alvo: "cidade.notoriedade", marcas: 2 }], viaLigacao: true },
  "Restaurante Caldeirão Trovejante": { efeitos: [{ alvo: "cidade.moral", marcas: 2 }], periodico: { alvo: "cidade.moral", marcas: 1 }, viaLigacao: true },
  Banco: { efeitos: [{ alvo: "cidade.economia", marcas: 2 }] },
  "Rodas e Engrenagens e indústria": { efeitos: [{ alvo: "cidade.economia", marcas: 2 }], viaLigacao: true },
  "Véu Rubro e mariposas": { efeitos: [{ alvo: "cidade.notoriedade", marcas: 2 }], periodico: { alvo: "cidade.notoriedade", marcas: 1 } },
  "Reativar o Coliseu": { efeitos: [{ alvo: "cidade.notoriedade", niveis: 1 }] },
  "Reabrir a biblioteca ao público": { efeitos: [{ alvo: "cidade.notoriedade", niveis: 1 }] },
  "Reativar o porto": { efeitos: [{ alvo: "cidade.rotas", marcas: 2 }], periodico: { alvo: "cidade.economia", marcas: 1 }, liberaRotas4: true },
  "Moradias num bairro vazio": { efeitos: [{ alvo: "cidade.populacao", marcas: 2 }] },
  "Guarda da cidade": { efeitos: [{ alvo: "cidade.seguranca", marcas: 2 }], manutencaoExtra: 100 },
  "Mercado central": { efeitos: [{ alvo: "cidade.economia", marcas: 1 }, { alvo: "cidade.moral", marcas: 1 }], periodico: { alvo: "cidade.economia", marcas: 1 } },
};

const portoConcluido = (e: any) => (e.projetos ?? []).some((p: any) => p.nome === "Reativar o porto" && p.status === "concluido");

export const cidade: FrenteConfig = {
  id: "cidade",
  nome: "Draetyr",
  emoji: "🏙️",
  dono: "Lucca",
  papelDono: "mestre",
  regras: R,
  cores: { destaque: "#2c5a7a", fundo: "#17283a", detalhe: "#a8873f" },
  estagioCalculado: true,
  campos: [
    ...FRENTES_CIDADE.map((k) => ({
      caminho: `frentes.${k}`,
      rotulo: ROTULOS_CIDADE[k].rotulo,
      emoji: ROTULOS_CIDADE[k].emoji,
      tipo: "medida" as const,
      nomeNivel: (n: number) => lv.linhas[n]?.[ROTULOS_CIDADE[k].col] ?? "—",
      teto: (e: any) => {
        if (k === "influencia") return tetosDoGoverno(e.governo as Governo).influencia ?? null;
        // "Reativar o porto: libera Rotas 4+" (tabela proj)
        if (k === "rotas") return portoConcluido(e) ? null : 3;
        return null;
      },
      aoSubir:
        k === "notoriedade"
          ? [{ relogio: "relogios.atencao_do_inferno", delta: 1, motivo: "Notoriedade subiu de nível" }]
          : k === "populacao" || k === "economia"
            ? [{ relogio: "relogios.oposicao", delta: 1, motivo: `${ROTULOS_CIDADE[k].rotulo} subiu de nível` }]
            : undefined,
    })),
    { caminho: "cofre_po", rotulo: "Cofre da cidade (PO)", emoji: "🪙", tipo: "contador" },
  ],
  relogios: [
    { caminho: "relogios.atencao_do_inferno", rotulo: "Atenção do Inferno", emoji: "🔥", linhaRel: 0 },
    { caminho: "relogios.oposicao", rotulo: "Oposição", emoji: "🗡️", linhaRel: 1 },
    { caminho: "relogios.desconfianca_da_capital", rotulo: "Desconfiança da capital", emoji: "👑", linhaRel: 2 },
  ],
  cartao: ["frentes.populacao", "frentes.economia"],
  rolaveis: [
    { tabela: "d100", rotulo: "Evento da semana" },
    { tabela: "alc", rotulo: "Alcance da missão" },
    { tabela: "mp", rotulo: "Patamar da missão", mod: (_e, ctx) => ctx.frentes.cidade?.frentes?.notoriedade?.nivel ?? 0, modRotulo: "Notoriedade" },
    { tabela: "tipo", rotulo: "Tipo de missão" },
    { tabela: "det", rotulo: "Detalhe da missão" },
    { tabela: "ach", rotulo: "Achado" },
    { tabela: "rev", rotulo: "Revés" },
  ],
  consulta: ["hoje"],
  tabelaResultado: "resa",
  estagio: (e) => estagioCidade(e.frentes),
  nomeEstagio: (n) => nomeEstagioTabela(tab(R, "est"), n),
  limiteAcoes: (e) => limiteAcoesCidade(tab(R, "est"), estagioCidade(e.frentes), !!e.pjs_em_draetyr),
  fecharPrazos: (e, _ctx, semanaNova): FechamentoFrente => {
    const mudancas: string[] = [];
    const alertas: string[] = [];
    const projetos = (e.projetos ?? []).map((p: any) => {
      if (p.status !== "ativo" || p.semanas_restantes == null) return p;
      const s = p.semanas_restantes - 1;
      if (s <= 0) {
        mudancas.push(`Projeto concluído: ${p.nome}`);
        alertas.push(`🏗️ Projeto concluído: ${p.nome}. Os efeitos foram para a caixa de entrada.`);
        return { ...p, semanas_restantes: 0, status: "concluido", concluido_semana: semanaNova - 1, efeitos_pendentes: true };
      }
      mudancas.push(`Projeto ${p.nome}: faltam ${s} semana(s)`);
      return { ...p, semanas_restantes: s };
    });
    return { estado: { ...e, projetos, acoes_semana: [], evento_semana: null }, mudancas, alertas };
  },
};
