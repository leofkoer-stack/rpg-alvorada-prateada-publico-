/**
 * Simulação: roda uma semana completa com as 6 frentes, pelas mesmas ações do servidor,
 * num banco separado (.data/simulacao.json), e escreve o antes e o depois em docs/simulacao-semana-1.md.
 * Uso: npm run simular
 */
import fs from "node:fs";
import path from "node:path";
import { StoreArquivo } from "../src/servidor/store-arquivo";
import { usarStore, store } from "../src/servidor/store";
import { executar } from "../src/servidor/acoes";
import { garantirSeed } from "../src/servidor/nucleo";
import { FRENTES, frente } from "../src/frentes";
import { ROTULO_CLASSE } from "../src/motor/teste";
import type { Acesso } from "../src/servidor/tipos";

const arq = path.join(process.cwd(), ".data", "simulacao.json");
if (fs.existsSync(arq)) fs.rmSync(arq);
usarStore(new StoreArquivo(arq));

const ac = (papel: Acesso["papel"], nome: string, f: string | null = null): Acesso => ({ id: nome, hash: nome, papel, frente: f, nome, criado_em: "", revogado: false });
const M = ac("mestre", "Lucca");
const J = {
  culto: ac("jogador", "Pedro", "culto"),
  radio: ac("jogador", "Leonardo", "radio"),
  forja: ac("jogador", "Bertran", "forja"),
  caldeirao: ac("jogador", "Fábio", "caldeirao"),
  submundo: ac("jogador", "Kaio", "submundo"),
};
const linhas: string[] = [];
const L = (s = "") => linhas.push(s);
const cls = (r: any) => ROTULO_CLASSE[r.rolagem.classe as keyof typeof ROTULO_CLASSE];

function resumo(fr: Record<string, any>) {
  const c = fr.cidade;
  const med = (m: any) => (m ? `${m.nivel} (${m.marcas}m)` : "—");
  const rel = (r: any) => (r ? `${r.valor}/${r.tamanho}` : "—");
  return {
    "🏙️ Cidade": `Estágio ${c.estagio} · Pop ${med(c.frentes.populacao)} · Eco ${med(c.frentes.economia)} · Rotas ${med(c.frentes.rotas)} · Infl ${med(c.frentes.influencia)} · Not ${med(c.frentes.notoriedade)} · Seg ${med(c.frentes.seguranca)} · Moral ${med(c.frentes.moral)} · Cofre ${c.cofre_po ?? "a definir"} PO · Inferno ${rel(c.relogios.atencao_do_inferno)} · Oposição ${rel(c.relogios.oposicao)} · Capital ${rel(c.relogios.desconfianca_da_capital)}`,
    "🛡️ Guilda": `${fr.guilda.cofre_pl} PL · caixa ${fr.guilda.cofre_po ?? "a definir"} PO · quadro ${fr.guilda.quadro.length}`,
    "🩸 Culto": `Estágio ${fr.culto.estagio} · Fiéis ${fr.culto.fieis} · Tesouro ${fr.culto.tesouro_recursos} · Fé ${fr.culto.fe} · Revelação ${fr.culto.revelacao} · Propósito ${fr.culto.proposito}`,
    "📻 Rádio": `Estágio ${fr.radio.estagio} · Audiência ${med(fr.radio.audiencia)} · Povo ${med(fr.radio.influencia.povo)} · Integridade ${fr.radio.integridade} · Portfólio ${fr.radio.portfolio.length} · Pressão ${rel(fr.radio.relogios.pressao)}`,
    "⚒️ Forja": `Estágio ${fr.forja.estagio} · Renome ${med(fr.forja.renome)} · Palavra ${med(fr.forja.palavra)} · Caixa ${fr.forja.caixa_po ?? "a definir"} · ECLIPSE ${fr.forja.fila[0].jornadas_feitas}/${fr.forja.fila[0].jornadas_total} · Cobiça ${rel(fr.forja.relogios.cobica)}`,
    "🍲 Caldeirão": `Estágio ${fr.caldeirao.estagio} · Pertencimento ${med(fr.caldeirao.pertencimento)} · Fama ${med(fr.caldeirao.fama)} · Caixa ${fr.caldeirao.caixa_po ?? "a definir"} · Frescas ${fr.caldeirao.despensa.frescas} · Fome ${rel(fr.caldeirao.relogios.fome)}`,
    "🗡️ Submundo": `Respeito ${med(fr.submundo.respeito)} · Rede Draetyr ${med(fr.submundo.rede_por_zona.draetyr)} · Bolsa ${fr.submundo.bolsa_po ?? "a definir"} · Exposição ${rel(fr.submundo.relogios.exposicao)} · Caçadores ${rel(fr.submundo.relogios.cacadores)}`,
  };
}

async function main() {
  const antes = (await garantirSeed()).frentes;
  const A = resumo(antes);
  L("# Simulação · semana 1 completa");
  L();
  L("Banco separado (`.data/simulacao.json`). Rolagens feitas pelo app; os números mudam a cada execução.");
  L();
  L("## O que cada um fez");

  // ---- Mestre: cofres e uma ação da cidade ----
  await executar(M, "ops", { frente: "cidade", ops: [{ op: "definir", caminho: "cofre_po", valor: 1000 }], motivo: "Mestre define o cofre (simulação)" });
  await executar(M, "ops", { frente: "guilda", ops: [{ op: "definir", caminho: "cofre_po", valor: 500 }], motivo: "Mestre define o caixa da guilda (simulação)" });
  let r = await executar(M, "rolar", { frente: "cidade", tipo: "teste", bonus: 5, cd: 10, rotulo: "Atrair moradores (Alberon)", tabelaResultado: "resa" });
  const mPop = ["sucesso5", "nat20"].includes(r.rolagem.classe) ? 2 : r.rolagem.classe === "sucesso" ? 1 : r.rolagem.classe === "falha5" ? -1 : 0;
  await executar(M, "ops", { frente: "cidade", ops: [{ op: "contador", caminho: "cofre_po", delta: -100 }, ...(mPop ? [{ op: "marcas", caminho: "frentes.populacao", delta: mPop }] : []), { op: "lista_add", caminho: "acoes_semana", item: { acao: "Atrair moradores", quem: "Alberon", classe: r.rolagem.classe } }], motivo: "Ação da cidade" });
  L(`- **Mestre**: cofre 1.000 PO; Alberon tentou *Atrair moradores* (d20 ${r.rolagem.natural} + 5 = ${r.rolagem.total} vs CD 10): **${cls(r)}** → População ${mPop >= 0 ? "+" : ""}${mPop} marca(s), −100 PO.`);
  r = await executar(M, "rolar", { frente: "cidade", tipo: "tabela", tabela: "d100" });
  L(`- **Mestre**: evento da semana d100 = ${r.rolagem.total}: *${r.rolagem.linha[2]}* (${r.rolagem.linha[3]}).`);

  // ---- Culto ----
  r = await executar(J.culto, "rolar", { frente: "culto", tipo: "tabela", tabela: "hum" });
  L(`- **Pedro (Culto)**: humor d6 = ${r.rolagem.total}: ${r.rolagem.linha?.[1]}.`);
  r = await executar(J.culto, "rolar", { frente: "culto", tipo: "teste", bonus: 5 + 1, cd: 12, extras: ["d4"], rotulo: "Obra Acolher (Anão Solitário)" });
  const novosFieis = ["sucesso", "sucesso5", "nat20"].includes(r.rolagem.classe) ? 3 : 0;
  await executar(J.culto, "ops", { frente: "culto", ops: [{ op: "contador", caminho: "fieis", delta: novosFieis }, { op: "lista_add", caminho: "semanal.obras", item: { lider: "Anão Solitário", obra: "Acolher" } }], motivo: "Obra Acolher" });
  L(`- **Pedro (Culto)**: Obra *Acolher* com o Anão (d20 + 5 + Comunhão 1 + Coro d4 = ${r.rolagem.total} vs CD 12): **${cls(r)}** → +${novosFieis} fiéis (número de exemplo; a tática real vem da tabela de captação).`);
  await executar(J.culto, "turno_pronto", { pronto: true });

  // ---- Rádio ----
  r = await executar(J.radio, "rolar", { frente: "radio", tipo: "teste", bonus: 9, cd: 12, rotulo: "Acesso (Chico, ★★)" });
  L(`- **Leonardo (Rádio)**: acesso ao Chico ★★ (Persuasão +9 = ${r.rolagem.total} vs CD 12): **${cls(r)}**.`);
  r = await executar(J.radio, "rolar", { frente: "radio", tipo: "teste", bonus: 7, cd: 13, rotulo: "Conversa (Chico)", tabelaResultado: "conv" });
  const cc = r.rolagem.classe;
  const est = cc === "sucesso5" || cc === "nat20" ? 3 : cc === "sucesso" ? 2 : 1;
  await executar(J.radio, "ops", { frente: "radio", ops: [{ op: "lista_add", caminho: "portfolio", item: { tipo: "entrevista", titulo: "Entrevista com Chico", fonte: "Chico", estrelas: est, zona: "Svenya", poder: "guildas", uso: "Arquivo" } }, ...["manha", "meio_dia", "tarde", "noite", "madrugada"].map((k) => ({ op: "definir", caminho: `grade.${k}`, valor: true })), { op: "marcas", caminho: "audiencia", delta: 1 }], motivo: "Entrevista gravada e grade completa" });
  L(`- **Leonardo (Rádio)**: conversa (Intuição +7 = ${r.rolagem.total} vs CD 13): **${cls(r)}** · ${r.rolagem.linha?.[1]}. Gravação ${"★".repeat(est)} no portfólio, grade completa, Audiência +1 marca.`);
  await executar(J.radio, "ligacao", { id: "radio-grade-completa" });
  L(`- **Leonardo (Rádio)**: 🔗 *Grade completa* → caixa de entrada do Mestre.`);
  await executar(J.radio, "turno_pronto", { pronto: true });

  // ---- Forja ----
  await executar(J.forja, "ops", { frente: "forja", ops: [{ op: "definir", caminho: "caixa_po", valor: 200 }, { op: "contador", caminho: "fila.0.jornadas_feitas", delta: 2 }, { op: "marcas", caminho: "renome", delta: 4 }], motivo: "Miguelito: 2 jornadas na ECLIPSE; +4 marcas de Renome (exemplo)" });
  r = await executar(J.forja, "rolar", { frente: "forja", tipo: "teste", bonus: 14, cd: 16, rotulo: "Teste da forja" });
  if (r.rolagem.classe === "nat20") await executar(J.forja, "ops", { frente: "forja", ops: [{ op: "marcas", caminho: "renome", delta: 2 }], motivo: "Obra-prima: +2 marcas em Renome" });
  if (r.rolagem.classe === "falha5") await executar(J.forja, "ops", { frente: "forja", ops: [{ op: "relogio", caminho: "relogios.faisca", delta: 1 }], motivo: "Falha por 5+: Faísca +1" });
  L(`- **Bertran (Forja)**: Trazix fora; Miguelito faz 2 jornadas na ECLIPSE. Teste da forja (+13 +1 Miguelito = ${r.rolagem.total} vs CD 16): **${cls(r)}** · ${r.rolagem.linha?.[1]}. Renome +4 marcas (de exemplo, para mostrar a subida).`);
  await executar(J.forja, "turno_pronto", { pronto: true });

  // ---- Caldeirão ----
  await executar(J.caldeirao, "ops", { frente: "caldeirao", ops: [{ op: "definir", caminho: "caixa_po", valor: 50 }, { op: "definir", caminho: "fundos.0.cuidado_semana", valor: true }, { op: "definir", caminho: "fundos.1.cuidado_semana", valor: true }, { op: "lista_add", caminho: "despensa.comuns", item: { qtd: 10, validade_semana: 4 } }], motivo: "Cuidou do curral e dos aquários; entrou lote de 10 comuns" });
  await executar(J.caldeirao, "ops", { frente: "caldeirao", ops: [{ op: "definir", caminho: "despensa.comuns", valor: [{ qtd: 5, validade_semana: 4 }] }, { op: "marcas", caminho: "pertencimento", delta: 1 }, { op: "relogio", caminho: "relogios.fome", delta: -1 }], motivo: "Mesa para todos: 5 porções, +1 Pertencimento, Fome −1" });
  L(`- **Fábio (Caldeirão)**: cuidou do curral e dos aquários; entrou 10 porções comuns; serviu a *Mesa para todos* (Pertencimento +1, Fome −1).`);
  await executar(J.caldeirao, "ligacao", { id: "caldeirao-mesa-refugiados" });
  L(`- **Fábio (Caldeirão)**: 🔗 *Mesa para todos com refugiados* → caixa de entrada.`);
  await executar(J.caldeirao, "turno_pronto", { pronto: true });

  // ---- Submundo ----
  await executar(J.submundo, "ops", { frente: "submundo", ops: [{ op: "definir", caminho: "bolsa_po", valor: 100 }, { op: "definir", caminho: "bonus_felnun.pericias_proficientes", valor: ["Furtividade", "Percepção"] }], motivo: "Primeira abertura (simulação)" });
  r = await executar(J.submundo, "rolar", { frente: "submundo", tipo: "teste", bonus: 9, cd: 13, rotulo: "Apagar rastros (Furtividade)" });
  if (["sucesso", "sucesso5", "nat20"].includes(r.rolagem.classe)) await executar(J.submundo, "ops", { frente: "submundo", ops: [{ op: "relogio", caminho: "relogios.exposicao", delta: -1 }], motivo: "Apagar rastros: Exposição −1" });
  L(`- **Kaio (Submundo)**: *Apagar rastros* (Furtividade +9 = ${r.rolagem.total} vs CD 13): **${cls(r)}**.`);
  await executar(J.submundo, "ligacao", { id: "submundo-contrabando" });
  L(`- **Kaio (Submundo)**: 🔗 *Contrabando que passa por Draetyr* → caixa de entrada.`);
  await executar(J.submundo, "turno_pronto", { pronto: true });

  // ---- Mestre: caixa de entrada ----
  const pend = await store().pendentes("pendente");
  L();
  L("## Caixa de entrada do Mestre");
  for (const p of pend) {
    await executar(M, "decidir", { id: p.id, aprovar: true });
    L(`- ✅ Aprovado: ${p.texto}`);
  }

  // ---- Fechar ----
  const f = await executar(M, "fechar", { semana: 1 });
  L();
  L("## Fechamento da semana 1");
  f.passos.forEach((p: any, i: number) => {
    L(`**${i + 1}. ${p.titulo}**`);
    (p.itens.length ? p.itens : ["nada muda"]).forEach((t: string) => L(`- ${t}`));
    L();
  });
  const depois = (await store().carregar())!.frentes;
  const D = resumo(depois);
  L("## Antes × depois");
  L();
  for (const k of Object.keys(A)) {
    L(`### ${k}`);
    L(`- **Antes:** ${(A as any)[k]}`);
    L(`- **Depois:** ${(D as any)[k]}`);
    L();
  }
  const novos = await store().pendentes("pendente");
  L(`Semana aberta agora: **${(await store().carregar())!.campanha.semana}** · efeitos pendentes novos: ${novos.length}`);
  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync("docs/simulacao-semana-1.md", linhas.join("\n") + "\n");
  process.stdout.write(linhas.join("\n") + "\n");
  void FRENTES;
  void frente;
}
main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + "\n");
  process.exit(1);
});
