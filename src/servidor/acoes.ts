import { FRENTES, frente } from "@/frentes";
import { aplicarNoBanco, type Banco, type EventoLog } from "@/semana/aplicar";
import { fecharSemana, opsDoPendente, type Pendente } from "@/semana/fechar";
import { ligacao } from "@/semana/ligacoes";
import type { Op } from "@/motor/ops";
import { rolarTabela } from "@/motor/tabelas";
import { rolarTeste, linhaDoResultado, ROTULO_CLASSE, type Modo } from "@/motor/teste";
import { rolarExpressao } from "@/motor/dados";
import { aplicarTrocaDeGoverno, type Governo } from "@/motor/cidade";
import { ler } from "@/motor/caminho";
import { store } from "./store";
import { garantirSeed, mutar } from "./nucleo";
import { criarLink } from "./tokens";
import type { Acesso } from "./tipos";

export class Proibido extends Error {}
export class Invalido extends Error {}

const ehMestre = (a: Acesso) => a.papel === "mestre";
const ehAdmin = (a: Acesso) => a.papel === "admin";

/** Um jogador só escreve na própria frente. Mestre e admin escrevem em qualquer uma. */
function podeEscrever(a: Acesso, frenteId: string) {
  if (ehMestre(a) || ehAdmin(a)) return true;
  return a.papel === "jogador" && a.frente === frenteId;
}
function exigir(cond: boolean, msg = "Sem permissão para isso.") {
  if (!cond) throw new Proibido(msg);
}
const autor = (a: Acesso) => a.nome;

let seq = 0;
const novoId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

function aplicarOps(b: Banco, a: Acesso, frenteId: string, ops: Op[], motivo: string, rolagem?: any) {
  const eventos: EventoLog[] = [];
  for (const op of ops) {
    if ("caminho" in op && op.caminho.split(".")[0] === "ocultos") exigir(ehMestre(a), "Só o Mestre oculta campos.");
    const r = aplicarNoBanco(b, frenteId, op, autor(a), motivo, rolagem);
    b = r.banco;
    eventos.push(r.evento);
  }
  return { banco: b, eventos };
}

function rolar(b: Banco, a: Acesso, p: any) {
  const frenteId: string = p.frente;
  const cfg = frente(frenteId);
  if (p.tipo === "tabela") {
    const t = cfg.regras.tabelas[p.tabela];
    if (!t) throw new Invalido("Tabela não existe.");
    const rv = cfg.rolaveis.find((r) => r.tabela === p.tabela);
    const modConfig = rv?.mod ? rv.mod(b.frentes[frenteId], { frentes: b.frentes, campanha: b.campanha }) : 0;
    const mod = modConfig + (Number(p.modificadorExtra) || 0);
    let r;
    if (rv?.dado) {
      const lados = Number(rv.dado.replace(/^1?d/, ""));
      const t2 = { ...t, colunas: [`d${lados}`, ...t.colunas.slice(1)] };
      r = rolarTabela(p.tabela, t2, { modificador: mod, valorFisico: p.fisico ?? undefined });
    } else r = rolarTabela(p.tabela, t, { modificador: mod, valorFisico: p.fisico ?? undefined });
    const resumo = r.linha ? r.linha.slice(1).join(" · ") : "sem linha";
    return { rolagem: { ...r, titulo: t.titulo, fisico: p.fisico != null }, motivo: `🎲 ${t.titulo}: ${r.total} → ${resumo}` };
  }
  if (p.tipo === "teste") {
    const r = rolarTeste({ bonus: Number(p.bonus) || 0, cd: Number(p.cd) || 10, modo: (p.modo as Modo) ?? "normal", extras: p.extras ?? [], d20Fisico: p.fisico ?? undefined });
    const tabId = p.tabelaResultado ?? cfg.tabelaResultado;
    const linha = tabId ? linhaDoResultado(cfg.regras.tabelas[tabId], r.classe) : null;
    return { rolagem: { ...r, linha, rotulo: p.rotulo ?? "Teste" }, motivo: `🎯 ${p.rotulo ?? "Teste"}: ${r.total} vs CD ${r.cd} → ${ROTULO_CLASSE[r.classe]}${linha ? ` · ${linha[1]}` : ""}` };
  }
  if (p.tipo === "livre") {
    const r = rolarExpressao(String(p.expressao ?? ""));
    if (!r) throw new Invalido("Expressão não entendida. Use XdY+Z, por exemplo 2d6+3.");
    return { rolagem: r, motivo: `🎲 ${r.expressao} = ${r.total}` };
  }
  throw new Invalido("Tipo de rolagem desconhecido.");
}

/** Executa uma ação vinda da tela. Toda escrita passa por aqui. */
export async function executar(a: Acesso, acao: string, p: any): Promise<any> {
  const s = store();
  switch (acao) {
    case "ops": {
      exigir(podeEscrever(a, p.frente));
      const ops: Op[] = p.ops ?? [];
      if (!ops.length) throw new Invalido("Nenhuma operação.");
      return mutar((b) => {
        const r = aplicarOps(b, a, p.frente, ops, String(p.motivo ?? "").slice(0, 500) || "Ajuste", p.rolagem);
        return { banco: r.banco, eventos: r.eventos, resposta: { ok: true } };
      });
    }
    case "rolar": {
      exigir(podeEscrever(a, p.frente));
      return mutar((b) => {
        const r = rolar(b, a, p);
        const ev: EventoLog = { autor: autor(a), semana: b.campanha.semana, frente: p.frente, tipo: "rolagem", rolagem: r.rolagem, motivo: p.motivo ? `${r.motivo} · ${p.motivo}` : r.motivo };
        return { banco: b, eventos: [ev], resposta: r };
      });
    }
    case "nota": {
      exigir(podeEscrever(a, p.frente));
      return mutar((b) => ({
        banco: b,
        eventos: [{ autor: autor(a), semana: b.campanha.semana, frente: p.frente, tipo: "nota", motivo: String(p.texto ?? "").slice(0, 2000) }],
        resposta: { ok: true },
      }));
    }
    case "turno_pronto": {
      exigir(a.papel === "jogador" || ehMestre(a));
      const f = a.papel === "jogador" ? a.frente! : p.frente;
      return mutar((b) => {
        b.campanha.turno_pronto = { ...(b.campanha.turno_pronto ?? {}), [f]: !!p.pronto };
        return { banco: b, eventos: [{ autor: autor(a), semana: b.campanha.semana, frente: f, tipo: "turno_pronto", depois: !!p.pronto, motivo: p.pronto ? "Turno pronto ✔" : "Turno reaberto" }], resposta: { ok: true } };
      });
    }
    case "ligacao": {
      const l = ligacao(p.id);
      if (!l) throw new Invalido("Ligação não existe.");
      exigir(podeEscrever(a, l.origem), "Essa ligação é de outra frente.");
      if (l.escolha && !l.escolha.includes(p.escolha)) throw new Invalido("Escolha o alvo.");
      return mutar((b) => {
        const usadas = ler(b.frentes[l.origem], `semanal.ligacoes.${l.id}`) ?? 0;
        if (l.limite && usadas >= 1) throw new Invalido(`Limite: ${l.limite}.`);
        const fr = b.frentes[l.origem];
        b.frentes[l.origem] = { ...fr, semanal: { ...(fr.semanal ?? {}), ligacoes: { ...(fr.semanal?.ligacoes ?? {}), [l.id]: usadas + 1 } } };
        const pend: Pendente = { id: novoId("p"), semana: b.campanha.semana, origem: l.origem, ligacao_id: l.id, texto: `${l.gatilho}: ${l.texto}`, efeitos: l.efeitos, escolha: p.escolha ?? null, status: "pendente", criado_por: autor(a) };
        return {
          banco: b,
          pendentes: [pend],
          eventos: [{ autor: autor(a), semana: b.campanha.semana, frente: l.origem, tipo: "ligacao", motivo: `🔗 ${l.gatilho} → caixa de entrada do Mestre${p.escolha ? ` (${p.escolha})` : ""}` }],
          resposta: pend,
        };
      });
    }
    case "decidir": {
      exigir(ehMestre(a));
      const todos = await s.pendentes("pendente");
      const pend = todos.find((x) => x.id === p.id);
      if (!pend) throw new Invalido("Esse efeito já foi decidido.");
      await mutar((b) => {
        let banco = b;
        const eventos: EventoLog[] = [];
        if (p.aprovar) {
          for (const o of opsDoPendente(pend, b.frentes)) {
            const r = aplicarNoBanco(banco, o.frente, o.op, autor(a), `✅ ${pend.texto} · ${o.descricao}`);
            banco = r.banco;
            eventos.push(r.evento);
          }
        } else eventos.push({ autor: autor(a), semana: b.campanha.semana, frente: pend.origem, tipo: "pendente_recusado", motivo: `❌ Recusado: ${pend.texto}${p.motivo ? ` · ${p.motivo}` : ""}` });
        return { banco, eventos };
      });
      await s.atualizarPendente({ ...pend, status: p.aprovar ? "aprovado" : "recusado", decidido_por: autor(a), motivo_decisao: p.motivo ?? null });
      return { ok: true };
    }
    case "previa": {
      exigir(ehMestre(a));
      const c = await garantirSeed();
      const r = fecharSemana({ campanha: c.campanha, frentes: c.frentes }, autor(a));
      return { passos: r.passos, pendentes: r.pendentes.map((x) => x.texto), alertas: r.alertasNovos.map((x) => x.texto) };
    }
    case "fechar": {
      exigir(ehMestre(a));
      let semanaFechada = 0;
      const r = await mutar((b) => {
        if (b.campanha.semana !== Number(p.semana)) throw new Invalido("A semana mudou. Recarregue a página.");
        const f = fecharSemana(b, autor(a));
        semanaFechada = b.campanha.semana;
        f.eventos.push({ autor: autor(a), semana: semanaFechada, frente: "cidade", tipo: "fechamento", motivo: `🔒 Semana ${semanaFechada} fechada` });
        return { banco: f.banco, eventos: f.eventos, pendentes: f.pendentes, resposta: f };
      });
      if (r) await s.salvarSnapshot(semanaFechada, r.snapshot);
      return r ? { passos: r.passos } : null;
    }
    case "reabrir": {
      exigir(ehMestre(a));
      const c = await garantirSeed();
      const ultima = c.campanha.semana - 1;
      const snap = await s.lerSnapshot(ultima);
      if (!snap) throw new Invalido("Não há snapshot da última semana.");
      await mutar(() => ({
        banco: snap as Banco,
        eventos: [{ autor: autor(a), semana: ultima, frente: "cidade", tipo: "reabertura", motivo: `🔓 Semana ${ultima} reaberta (voltou ao snapshot)` }],
      }));
      await s.apagarSnapshot(ultima);
      // efeitos criados pelo fechamento desfeito saem da caixa de entrada
      for (const pend of await s.pendentes("pendente"))
        if (pend.semana === ultima && pend.do_fechamento)
          await s.atualizarPendente({ ...pend, status: "recusado", decidido_por: autor(a), motivo_decisao: "Semana reaberta" });
      return { ok: true, semana: ultima };
    }
    case "resolver_alerta": {
      exigir(ehMestre(a));
      return mutar((b) => {
        const al = (b.campanha.alertas ?? []).find((x: any) => x.id === p.id);
        if (!al) throw new Invalido("Alerta não existe.");
        b.campanha.alertas = b.campanha.alertas.map((x: any) => (x.id === p.id ? { ...x, resolvido: true } : x));
        let banco = b;
        const eventos: EventoLog[] = [{ autor: autor(a), semana: b.campanha.semana, frente: al.frente, tipo: "alerta_resolvido", motivo: `Crise resolvida: ${al.texto}${p.nota ? ` · ${p.nota}` : ""}` }];
        if (p.zerar && al.caminho) {
          const r = aplicarNoBanco(banco, al.frente, { op: "relogio_zerar", caminho: al.caminho }, autor(a), "Relógio zerado após a crise");
          banco = r.banco;
          eventos.push(r.evento);
        }
        return { banco, eventos, resposta: { ok: true } };
      });
    }
    case "governo": {
      exigir(ehMestre(a));
      return mutar((b) => {
        const antes = b.frentes.cidade.governo;
        const r = aplicarTrocaDeGoverno(b.frentes.cidade.frentes, p.governo as Governo);
        b.frentes.cidade = { ...b.frentes.cidade, governo: p.governo, frentes: r.frentes };
        return {
          banco: b,
          eventos: [{ autor: autor(a), semana: b.campanha.semana, frente: "cidade", tipo: "governo", caminho: "governo", antes, depois: p.governo, motivo: ["Governo trocado", ...r.mudancas].join(" · ") }],
          resposta: { ok: true },
        };
      });
    }
    case "config": {
      exigir(ehMestre(a));
      return mutar((b) => {
        b.campanha.config = { ...(b.campanha.config ?? {}), ...p.config };
        return { banco: b, eventos: [{ autor: autor(a), semana: b.campanha.semana, frente: "cidade", tipo: "config", depois: p.config, motivo: "Configuração (bordas) alterada" }], resposta: { ok: true } };
      });
    }
    // ---------- admin ----------
    case "criar_link": {
      exigir(ehAdmin(a));
      if (!["mestre", "jogador", "admin"].includes(p.papel)) throw new Invalido("Papel inválido.");
      if (p.papel === "jogador" && !FRENTES.some((f) => f.id === p.frente && f.papelDono === "jogador")) throw new Invalido("Escolha a frente.");
      const r = await criarLink(s, p.papel, String(p.nome ?? "").slice(0, 60) || "Sem nome", p.papel === "jogador" ? p.frente : null);
      return { caminho: r.caminho, id: r.acesso.id };
    }
    case "revogar": {
      exigir(ehAdmin(a));
      await s.revogarAcesso(p.id);
      return { ok: true };
    }
    case "exportar": {
      exigir(ehAdmin(a));
      return s.exportarTudo();
    }
    case "importar": {
      exigir(ehAdmin(a));
      const d = p.dados;
      if (!d?.campanha || !d?.frentes) throw new Invalido("Arquivo de backup inválido.");
      await s.substituirTudo(d);
      await s.registrar([{ autor: autor(a), semana: d.campanha.semana, frente: "cidade", tipo: "importacao", motivo: "Backup importado" }]);
      return { ok: true };
    }
  }
  throw new Invalido("Ação desconhecida.");
}
