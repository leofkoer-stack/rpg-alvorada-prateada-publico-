import regras from "@dados/regras-submundo.json";
import type { Regras } from "@/motor/tipos";
import type { FrenteConfig, FechamentoFrente } from "./tipos";
import { tab, num } from "./util";

const R = regras as unknown as Regras;

export const submundo: FrenteConfig = {
  id: "submundo",
  nome: "Contatos do submundo",
  emoji: "🗡️",
  dono: "Kaio",
  personagem: "Felnun",
  papelDono: "jogador",
  regras: R,
  cores: { destaque: "#2f5f95", fundo: "#14171c", detalhe: "#a8853a" },
  estagioCalculado: true,
  campos: [
    {
      caminho: "respeito",
      rotulo: "Respeito",
      emoji: "🎩",
      tipo: "medida",
      nomeNivel: (n) => tab(R, "resp").linhas[n]?.[0].split("·")[1]?.trim() ?? "",
      aoSubir: [{ relogio: "relogios.cacadores", delta: 1, motivo: "Respeito subiu de nível" }],
    },
    {
      caminho: "rede_por_zona.*",
      rotulo: "Rede",
      emoji: "🕸️",
      tipo: "medida",
      max: 3,
      // Ninho (Rede 3) exige Respeito 3 (tabela rede)
      teto: (e) => ((e.respeito?.nivel ?? 0) >= 3 ? null : 2),
      nomeNivel: (n) => tab(R, "rede").linhas[n]?.[0].split("·")[1]?.trim() ?? "",
      aoSubir: [{ relogio: "relogios.cacadores", delta: 1, motivo: "Rede numa zona nova", deNivel: 0 }],
    },
    { caminho: "contatos.*.confianca", rotulo: "Confiança", emoji: "🤞", tipo: "escala", min: 1, max: 3 },
    { caminho: "favores.a_receber", rotulo: "Favores a receber", emoji: "🎁", tipo: "contador", min: 0 },
    { caminho: "favores.devidos", rotulo: "Favores devidos", emoji: "🧾", tipo: "contador", min: 0 },
    { caminho: "bolsa_po", rotulo: "Bolsa (PO)", emoji: "👛", tipo: "contador" },
  ],
  relogios: [
    { caminho: "relogios.exposicao", rotulo: "Exposição", emoji: "👁️", linhaRel: 0 },
    { caminho: "relogios.cacadores", rotulo: "Caçadores", emoji: "🩸", linhaRel: 1 },
    { caminho: "rastros.*", rotulo: "Rastro", emoji: "🔎", cheio: "Rastro completo: o Mestre leva a resposta para a mesa." },
  ],
  cartao: ["respeito"],
  rolaveis: [
    { tabela: "trab", rotulo: "Tipo de trabalho" },
    { tabela: "pt", rotulo: "Nível do trabalho", mod: (e) => e.respeito?.nivel ?? 0, modRotulo: "Respeito" },
    { tabela: "rev", rotulo: "Revés" },
    { tabela: "sus", rotulo: "Sussurro" },
    { tabela: "noite", rotulo: "A noite" },
    { tabela: "manda", rotulo: "Quem manda nas sombras" },
    { tabela: "quem", rotulo: "Quem é o contato" },
    { tabela: "quer", rotulo: "O que o contato quer" },
    { tabela: "jeito", rotulo: "Jeito do contato" },
  ],
  consulta: ["quem", "quer", "jeito", "uso", "fav", "tier", "zon", "ras"],
  tabelaResultado: "res",
  estagio: (e) => e.respeito?.nivel ?? 0,
  nomeEstagio: (n) => tab(R, "resp").linhas[n]?.[0].split("·")[1]?.trim() ?? "",
  limiteAcoes: (e) => num(tab(R, "resp").linhas[e.respeito?.nivel ?? 0][2]),
  fecharPrazos: (e, _ctx, semanaNova): FechamentoFrente => ({
    estado: { ...e, quadro: (e.quadro ?? []).filter((t: any) => t.estado === "aceito"), semanal: {}, _semana: semanaNova },
    mudancas: [],
    alertas: [],
  }),
};
