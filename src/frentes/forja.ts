import regras from "@dados/regras-forja.json";
import type { Regras } from "@/motor/tipos";
import type { FrenteConfig, FechamentoFrente } from "./tipos";
import { nomeEstagioTabela, tab, num } from "./util";

const R = regras as unknown as Regras;
const estado3 = (t: string) => (n: number) => tab(R, t).linhas[n]?.[1] ?? "";

export const forja: FrenteConfig = {
  id: "forja",
  nome: "Forja Rodas e Engrenagens",
  emoji: "⚒️",
  dono: "Bertran",
  personagem: "Trazix",
  papelDono: "jogador",
  regras: R,
  cores: { destaque: "#b8431e", fundo: "#24272b", detalhe: "#b88a2a" },
  estagioCalculado: false,
  campos: [
    { caminho: "estagio", rotulo: "Estágio", emoji: "🏭", tipo: "escala", min: 0, max: 5 },
    {
      caminho: "renome",
      rotulo: "Renome",
      emoji: "📯",
      tipo: "medida",
      nomeNivel: estado3("ren"),
      aoSubir: [{ relogio: "relogios.cobica", delta: 1, motivo: "Renome subiu de nível" }],
    },
    { caminho: "palavra", rotulo: "Palavra", emoji: "🤝", tipo: "medida", nomeNivel: estado3("pal") },
    { caminho: "miguelito", rotulo: "Trilha do Miguelito", emoji: "🧒", tipo: "medida", nomeNivel: (n) => tab(R, "trilha").linhas[n]?.[0].split("·")[1]?.trim() ?? "" },
    { caminho: "caixa_po", rotulo: "Caixa (PO)", emoji: "🪙", tipo: "contador" },
    { caminho: "estoque_po", rotulo: "Estoque do balcão (PO)", emoji: "📦", tipo: "contador", min: 0 },
    { caminho: "materiais.comuns", rotulo: "Lotes comuns", emoji: "🪨", tipo: "contador", min: 0 },
    { caminho: "materiais.raros", rotulo: "Lotes raros", emoji: "💠", tipo: "contador", min: 0 },
    { caminho: "materiais.lendarios", rotulo: "Lotes lendários", emoji: "🌟", tipo: "contador", min: 0 },
  ],
  relogios: [
    { caminho: "relogios.faisca", rotulo: "Faísca", emoji: "💥", linhaRel: 0 },
    { caminho: "relogios.esquema", rotulo: "O Esquema", emoji: "🧩", linhaRel: 1 },
    { caminho: "relogios.cobica", rotulo: "Cobiça", emoji: "🕵️", linhaRel: 2 },
    { caminho: "relogios.teto", rotulo: "O Teto", emoji: "🐉", cheio: "O Teto está cheio: fenômenos de círculo 6+ já podem ser desmontados." },
  ],
  cartao: ["renome", "palavra"],
  rolaveis: [
    { tabela: "pat", rotulo: "Patamar do pedido", mod: (e) => e.renome?.nivel ?? 0, modRotulo: "Renome" },
    { tabela: "cli", rotulo: "Cliente" },
    { tabela: "peca", rotulo: "Peça" },
    { tabela: "alem", rotulo: "Pedido além" },
    { tabela: "ev", rotulo: "Evento da forja" },
    { tabela: "quem", rotulo: "Quem aparece" },
  ],
  consulta: ["quem", "func", "mat", "obter", "trilha", "vistos", "teto", "tiers", "entrega"],
  tabelaResultado: "res",
  estagio: (e) => e.estagio ?? 0,
  nomeEstagio: (n) => nomeEstagioTabela(tab(R, "est"), n),
  limiteAcoes: (e) => num(tab(R, "est").linhas[e.estagio ?? 0][2]),
  fecharPrazos: (e, _ctx, semanaNova): FechamentoFrente => {
    const mudancas: string[] = [];
    const alertas: string[] = [];
    let palavraMarcas = 0;
    const fila = (e.fila ?? []).map((p: any) => {
      if (p.status === "entregue" || p.prazo == null) return p;
      const prazo = p.prazo - 1;
      const atraso = prazo < 0 ? -prazo : 0;
      if (atraso > 0) {
        // Palavra 3+: 1 semana de atraso sem perder marca (tabela pal)
        const perdoa = (e.palavra?.nivel ?? 0) >= 3 && atraso === 1;
        if (!perdoa) {
          palavraMarcas -= 1;
          mudancas.push(`Pedido atrasado (${p.pedido}): −1 marca de Palavra`);
        } else mudancas.push(`Pedido atrasado (${p.pedido}): Palavra 3 segura 1 semana`);
        alertas.push(`⏰ Pedido atrasado: ${p.pedido} (${atraso} semana(s))`);
      }
      return { ...p, prazo };
    });
    const palavra = { ...(e.palavra ?? { nivel: 0, marcas: 0 }), marcas: (e.palavra?.marcas ?? 0) + palavraMarcas };
    return { estado: { ...e, fila, palavra, semanal: {}, _semana: semanaNova }, mudancas, alertas };
  },
};
