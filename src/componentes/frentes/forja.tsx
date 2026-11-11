"use client";
import { useState } from "react";
import type { Ctx, FrenteConfig } from "@/frentes/tipos";
import { jornadasDaSemana, vendaBalcao, pedidosPorSemana, cdCaderno, podeDesmontar, prazoPedido } from "@/motor/forja";
import { contarEstrelas, cdPorEstrelas } from "@/motor/teste";
import { relogioCheio } from "@/motor/relogio";
import { useFrenteAcoes } from "../contexto";
import { Secao, TabelaView, Linha, ADefinir, Proposta } from "../ui";
import { Ficha, Estagio } from "../ficha";
import { RolarTabela, TesteBox } from "../rolagens";
import { ListaEditavel } from "../listas";

const PASSOS = ["👁️ Observar", "🧠 Entender", "🔩 Desmontar", "⚙️ Reconstruir", "✨ Avanço"];

export function PainelForja({ cfg, estado, ctx, editavel, economiaDraetyr }: { cfg: FrenteConfig; estado: any; ctx: Ctx; editavel: boolean; economiaDraetyr: number | null }) {
  const { ops, rolarTabela, rolarLivre } = useFrenteAcoes(cfg.id);
  const T = cfg.regras.tabelas;
  const J = estado.jornadas ?? {};
  const B = estado.bonus_trazix ?? {};
  const renome = estado.renome?.nivel ?? 0;
  const j = jornadasDaSemana({
    trazixEmDraetyr: !!J.trazix_em_draetyr,
    miguelitoPresente: !!J.miguelito_presente,
    trilha: estado.miguelito?.nivel ?? 0,
    funcionariosForja: J.funcionarios_forja ?? 0,
    exBandidos: J.ex_bandidos ?? 0,
    invocacaoAjudante: !!J.invocacao_ajudante,
    oozeDeGuarda: !!J.ooze_de_guarda,
  });
  const usadas = estado.semanal?.jornadas_usadas ?? 0;
  const ajuste = estado.semanal?.ajuste_jornadas ?? 0;
  const fila: any[] = estado.fila ?? [];
  const abertos = fila.filter((p) => p.status !== "entregue" && p.status !== "recusado");
  const maiorEstrela = Math.max(0, ...abertos.filter((p) => (estado.semanal?.trabalhados ?? []).includes(p.id)).map((p) => contarEstrelas(p.estrelas) ?? 0));
  const surto = !!estado.semanal?.surto;
  const [balcao, setBalcao] = useState("0");
  const eco = economiaDraetyr ?? 0;
  const venda = vendaBalcao(Number(balcao) || 0, !!J.miguelito_presente, eco, renome, J.funcionarios_balcao ?? 0);
  const tetoCheio = relogioCheio(estado.relogios?.teto ?? { valor: 0, tamanho: 8 });

  const setJ = (k: string, v: any) => ops([{ op: "definir", caminho: `jornadas.${k}`, valor: v }], `Jornadas: ${k} = ${v}`);

  async function gerarPedidos() {
    const n = pedidosPorSemana(renome);
    for (let i = 0; i < n; i++) {
      const pat = await rolarTabela("pat");
      const est = contarEstrelas(pat.rolagem.linha?.[1]) ?? 1;
      const cli = (await rolarTabela("cli")).rolagem.linha?.[1];
      const peca = (await rolarTabela("peca")).rolagem.linha?.[1];
      const alem = (await rolarTabela("alem")).rolagem.linha?.[1];
      let origem = "Draetyr";
      if (renome === 2) origem = (await rolarLivre("1d8", "Origem do pedido (zona de Lykh)")).rolagem.total + " (d8, zona de Lykh)";
      if (renome >= 3) origem = (await rolarLivre("1d6", "Origem do pedido (continente)")).rolagem.total + " (d6, continente)";
      const d4 = (await rolarLivre("1d4", "Prazo do pedido")).rolagem.total;
      const t = T.tiers.linhas[est - 1];
      await ops(
        [
          {
            op: "lista_add",
            caminho: "fila",
            item: { id: `p${Date.now().toString(36)}${i}`, status: "proposto", pedido: peca, cliente: cli, estrelas: est, jornadas_feitas: 0, jornadas_total: Number(t[3]), materiais: t[4], prazo: prazoPedido(d4, est), valor: null, valor_ref: t[5], sinal_pago: false, alem, origem },
          },
        ],
        `Pedido novo: ${peca} para ${cli} (${"★".repeat(est)})`,
      );
    }
  }

  return (
    <>
      <Secao titulo="Estágio" emoji="🏭">
        <Estagio cfg={cfg} estado={estado} ctx={ctx} editavel={editavel} tabela="est" />
      </Secao>

      <Secao titulo="Medidas e materiais" emoji="📊">
        <Ficha cfg={cfg} estado={estado} ctx={ctx} editavel={editavel} mestre={false} />
      </Secao>

      <Secao titulo={`Jornadas · ${usadas}/${j.geral + ajuste} + ${j.balcaoSo} só balcão`} emoji="🔨">
        <div className="grid gap-1 text-sm">
          {[
            ["trazix_em_draetyr", `🐉 Trazix em Draetyr (+5)`],
            ["miguelito_presente", `🧒 Miguelito na oficina (+${j.miguelito || "2 a 4"})`],
            ["invocacao_ajudante", "👾 Invocação ajudante (+1)"],
            ["ooze_de_guarda", "🛡️ Ooze blindado de guarda"],
          ].map(([k, rot]) => (
            <label key={k} className="cartao-claro flex items-center gap-2">
              <input type="checkbox" className="h-6 w-6" disabled={!editavel} checked={!!J[k]} onChange={(e) => setJ(k, e.target.checked)} /> {rot}
            </label>
          ))}
          {[
            ["funcionarios_forja", "👷 Funcionários de Forja"],
            ["funcionarios_balcao", "🏪 Funcionários de Balcão (+50 PO no limite)"],
            ["ex_bandidos", "⛓️ Ex-bandidos (só balcão)"],
          ].map(([k, rot]) => (
            <label key={k} className="cartao-claro flex items-center justify-between gap-2">
              {rot}
              {J[k] == null ? <ADefinir /> : null}
              <input className="entrada w-20" inputMode="numeric" disabled={!editavel} value={J[k] ?? ""} onChange={(e) => setJ(k, e.target.value === "" ? null : Number(e.target.value))} />
            </label>
          ))}
        </div>
        <Linha rotulo="Total da semana" emoji="🧮">
          <b className="text-xl">{j.geral + ajuste}</b> + {j.balcaoSo} só balcão {ajuste ? `(teste da forja: ${ajuste > 0 ? "+" : ""}${ajuste})` : ""}
        </Linha>
        <div className="mt-1 text-xs opacity-80">Miguelito: 2 jornadas (trilha 0–1), 3 (2–3), 4 (4–5). Sem o Trazix, pedidos acima do ★ da trilha param.</div>
      </Secao>

      <Secao titulo={`Fila de pedidos · ${abertos.length}`} emoji="📋">
        {editavel && (
          <button className="btn" onClick={gerarPedidos}>
            🎲 Pedidos da semana ({pedidosPorSemana(renome)})
          </button>
        )}
        <div className="mt-2">
          <ListaEditavel
            itens={fila}
            caminho="fila"
            editavel={editavel}
            ops={ops}
            rotuloNovo="Pedido à mão"
            novoPadrao={{ status: "aberto", jornadas_feitas: 0 }}
            campos={[
              { chave: "pedido", rotulo: "Peça / pedido" },
              { chave: "cliente", rotulo: "Cliente" },
              { chave: "estrelas", rotulo: "★", tipo: "numero" },
              { chave: "jornadas_feitas", rotulo: "Jornadas feitas", tipo: "numero" },
              { chave: "jornadas_total", rotulo: "Jornadas total", tipo: "numero" },
              { chave: "materiais", rotulo: "Materiais" },
              { chave: "prazo", rotulo: "Prazo (semanas)", tipo: "numero" },
              { chave: "valor", rotulo: "Valor (PO)", tipo: "numero" },
              { chave: "sinal_pago", rotulo: "Sinal pago", tipo: "check" },
              { chave: "para", rotulo: "Para a frente", tipo: "select", opcoes: ["submundo", "radio", "caldeirao", "culto"] },
              { chave: "status", rotulo: "Status", tipo: "select", opcoes: ["proposto", "aberto", "pronto", "entregue", "recusado"] },
            ]}
            render={(p) => {
              const est = contarEstrelas(p.estrelas);
              return (
                <div>
                  <b>{p.pedido}</b> · {p.cliente} · {est ? "★".repeat(est) : <ADefinir />} {p.proposta && <Proposta />}
                  <span className="selo ml-1">{p.status}</span>
                  <div className="text-sm">
                    🔨 {p.jornadas_feitas ?? 0}/{p.jornadas_total ?? "?"} · ⏳ prazo {p.prazo ?? "—"} · 💰 {p.valor ?? p.valor_ref ?? "—"} {p.sinal_pago ? "· sinal pago" : ""} {p.para ? `· para ${p.para}` : ""}
                  </div>
                  {p.materiais && <div className="text-xs opacity-80">Materiais: {p.materiais}</div>}
                  {p.alem && <div className="text-xs detalhe">Pede além: {p.alem}</div>}
                  {p.nota && <div className="text-xs opacity-80">{p.nota}</div>}
                  {est && <div className="text-xs">CD {cdPorEstrelas(est)}</div>}
                </div>
              );
            }}
            acoesItem={(p, i) => {
              const est = contarEstrelas(p.estrelas);
              return editavel && p.status !== "entregue" && p.status !== "recusado" ? (
                <>
                  {p.status === "proposto" && (
                    <>
                      <button className="btn btn-mini" onClick={() => ops([{ op: "definir", caminho: `fila.${i}.status`, valor: "aberto" }, ...((estado.palavra?.nivel ?? 0) >= 2 ? [{ op: "definir" as const, caminho: `fila.${i}.sinal_pago`, valor: true }] : [])], `Pedido aceito: ${p.pedido}${(estado.palavra?.nivel ?? 0) >= 2 ? " (metade adiantada, Palavra 2+)" : ""}`)}>
                        Aceitar
                      </button>
                      <button className="btn btn-mini btn-sec" onClick={() => ops([{ op: "definir", caminho: `fila.${i}.status`, valor: "recusado" }], `Pedido recusado: ${p.pedido}`)}>
                        Recusar
                      </button>
                    </>
                  )}
                  {p.status !== "proposto" && (
                    <>
                      {[1, 3].map((n) => (
                        <button
                          key={n}
                          className="btn btn-mini"
                          onClick={() =>
                            ops(
                              [
                                { op: "contador", caminho: `fila.${i}.jornadas_feitas`, delta: n },
                                { op: "contador", caminho: "semanal.jornadas_usadas", delta: n },
                                { op: "definir", caminho: "semanal.trabalhados", valor: Array.from(new Set([...(estado.semanal?.trabalhados ?? []), p.id])) },
                              ],
                              `+${n} jornada(s) em ${p.pedido}`,
                            )
                          }
                        >
                          +{n} 🔨
                        </button>
                      ))}
                      {T.entrega.linhas.map((l) => (
                        <button
                          key={l[0]}
                          className="btn btn-mini btn-sec"
                          onClick={() => {
                            const o: any[] = [{ op: "definir", caminho: `fila.${i}.status`, valor: l[0] === "Desistir" ? "recusado" : "entregue" }];
                            if (l[0] === "No prazo") {
                              o.push({ op: "marcas", caminho: "palavra", delta: 1 });
                              if ((est ?? 0) >= 3) o.push({ op: "marcas", caminho: "renome", delta: 1 });
                            }
                            if (l[0].startsWith("Adiantado")) o.push({ op: "marcas", caminho: "palavra", delta: 2 });
                            if (l[0] === "Desistir") o.push({ op: "marcas", caminho: "palavra", delta: -2 });
                            if (l[0] === "No prazo" || l[0].startsWith("Adiantado")) {
                              if (p.valor) o.push({ op: "contador", caminho: "caixa_po", delta: p.sinal_pago ? Math.ceil(p.valor / 2) : p.valor });
                              if ((est ?? 0) >= 4) o.push({ op: "relogio", caminho: "relogios.cobica", delta: 1 });
                            }
                            ops(o, `Entrega de ${p.pedido}: ${l[0]} (${l[1]})`);
                          }}
                        >
                          {l[0]}
                        </button>
                      ))}
                    </>
                  )}
                </>
              ) : null;
            }}
          />
        </div>
        <div className="mt-1 text-xs opacity-80">Atraso: o fechamento da semana tira 1 marca de Palavra por semana. Entregas para outra zona, ECLIPSE, pedras e utensílios: use as ligações abaixo.</div>
        <details className="mt-1">
          <summary className="text-sm">ver tabelas de pedidos</summary>
          <TabelaView t={T.tiers} />
          <TabelaView t={T.entrega} />
          <TabelaView t={T.orig} />
        </details>
      </Secao>

      <Secao titulo="Teste da forja (1 por semana)" emoji="🔥">
        <div className="text-sm">
          Forja +{B.Forja ?? 13} {J.miguelito_presente ? "+1 Miguelito" : ""} {surto ? "+5 Surto" : ""} vs CD do maior ★ trabalhado ({maiorEstrela ? "★".repeat(maiorEstrela) : "nenhum ainda"})
        </div>
        {editavel && (
          <label className="mt-1 flex items-center gap-2">
            <input type="checkbox" className="h-6 w-6" checked={surto} onChange={(e) => ops([{ op: "definir", caminho: "semanal.surto", valor: e.target.checked }], e.target.checked ? "💡 Surto de Genialidade (+5)" : "Surto desmarcado")} />
            💡 Surto de Genialidade (+5, 1 vez por semana)
          </label>
        )}
        <TesteBox
          key={`${maiorEstrela}${surto}${J.miguelito_presente}`}
          cfg={cfg}
          rotulo="Teste da forja"
          bonusInicial={(B.Forja ?? 13) + (J.miguelito_presente ? 1 : 0) + (surto ? 5 : 0)}
          cdInicial={maiorEstrela ? cdPorEstrelas(maiorEstrela) : 10}
          onResultado={(r) => {
            const c = r.rolagem.classe;
            const o: any[] = [{ op: "definir", caminho: "semanal.teste_forja", valor: c }];
            if (c === "sucesso5") o.push({ op: "definir", caminho: "semanal.ajuste_jornadas", valor: 3 });
            if (c === "falha") o.push({ op: "definir", caminho: "semanal.ajuste_jornadas", valor: -3 });
            if (c === "falha5") o.push({ op: "relogio", caminho: "relogios.faisca", delta: 1 });
            if (c === "nat20") o.push({ op: "marcas", caminho: "renome", delta: 2 });
            ops(o, `Teste da forja: ${c}`);
          }}
        />
        <div className="mt-1 text-xs opacity-80">1 natural: role o evento da forja de 1 a 6 (d6). Falha por 5+: você escolhe de qual pedido perde os materiais.</div>
      </Secao>

      <Secao titulo="Balcão" emoji="🏪">
        <label className="flex items-center gap-2">
          Jornadas no balcão <input className="entrada w-20" inputMode="numeric" value={balcao} onChange={(e) => setBalcao(e.target.value)} />
        </label>
        <div className="mt-2 grid gap-1 text-sm">
          <span>
            Produz <b>{venda.producao} PO</b> ({J.miguelito_presente ? "64" : "32"} PO por jornada)
          </span>
          <span>
            Limite de venda: <b>{venda.limite} PO</b> (100 × (Economia {economiaDraetyr ?? "?"} + 1) + 50 × Renome {renome})
          </span>
          <span>
            Vende <b>{venda.vendido} PO</b> · vai para o estoque <b>{venda.estoque} PO</b>
          </span>
          {venda.escambo > 0 && (
            <span>
              ⚖️ Escambo (Economia ≤ 1): <b>{venda.escambo} PO</b> em lotes, comida, trabalho ou favor
            </span>
          )}
        </div>
        {editavel && (
          <button
            className="btn mt-2"
            disabled={!Number(balcao) || estado.caixa_po == null}
            onClick={() =>
              ops(
                [
                  { op: "contador", caminho: "caixa_po", delta: venda.po },
                  { op: "contador", caminho: "estoque_po", delta: venda.estoque },
                  { op: "contador", caminho: "semanal.jornadas_usadas", delta: Number(balcao) || 0 },
                ],
                `Balcão: ${balcao} jornada(s), ${venda.po} PO no caixa, ${venda.escambo} em escambo, ${venda.estoque} ao estoque`,
              ).then(() => setBalcao("0"))
            }
          >
            Lançar vendas
          </button>
        )}
        {estado.caixa_po == null && <div className="text-sm">Defina o caixa (✏️) para lançar.</div>}
      </Secao>

      <Secao titulo={`Caderno de fenômenos · ${(estado.caderno?.avancos ?? []).length} Avanço(s)`} emoji="📓" aberta={false}>
        <div className="grid gap-2">
          {(estado.caderno?.fenomenos ?? []).map((f: any, i: number) => {
            const cd = f.circulo != null ? cdCaderno(f.passo, f.circulo) : null;
            const bloq = f.passo === 2 && f.circulo != null && !podeDesmontar(f.circulo, tetoCheio);
            const pericia = f.passo === 1 ? ["Arcanismo", B.Arcanismo] : f.passo === 2 ? ["Investigação", B["Investigação"]] : ["Forja", B.Forja];
            return (
              <div key={f.id ?? i} className="cartao-claro">
                <b>{f.nome}</b> <span className="text-xs opacity-70">{f.onde}</span>
                <div className="text-sm">
                  Passo: <b>{PASSOS[f.passo ?? 0]}</b> · círculo {f.circulo ?? <ADefinir />}
                </div>
                {editavel && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <input className="entrada w-20" inputMode="numeric" placeholder="círculo" defaultValue={f.circulo ?? ""} onBlur={(e) => e.target.value !== String(f.circulo ?? "") && ops([{ op: "definir", caminho: `caderno.fenomenos.${i}.circulo`, valor: e.target.value === "" ? null : Number(e.target.value) }], `Círculo de ${f.nome}`)} />
                    {f.passo < 4 && (
                      <button className="btn btn-mini" disabled={bloq} onClick={() => ops([{ op: "definir", caminho: `caderno.fenomenos.${i}.passo`, valor: f.passo + 1 }, ...(f.passo + 1 === 4 ? [{ op: "lista_add" as const, caminho: "caderno.avancos", item: f.nome }] : [])], `${f.nome}: ${PASSOS[f.passo + 1]}`)}>
                        Avançar passo
                      </button>
                    )}
                  </div>
                )}
                {bloq && <div className="text-sm text-red-300">Círculo 6+: só desmonta com o Teto cheio.</div>}
                {cd && f.passo >= 1 && f.passo <= 3 && !bloq && <TesteBox cfg={cfg} rotulo={`${PASSOS[f.passo]} · ${pericia[0]}`} bonusInicial={Number(pericia[1]) || 0} cdInicial={cd} tabelaResultado="__nenhuma" />}
              </div>
            );
          })}
        </div>
        <details className="mt-2">
          <summary className="text-sm">ver método e o Teto</summary>
          <TabelaView t={T.met} />
          <TabelaView t={T.teto} />
        </details>
      </Secao>

      <Secao titulo="Equipe" emoji="👷" aberta={false}>
        <ListaEditavel
          itens={estado.equipe ?? []}
          caminho="equipe"
          editavel={editavel}
          ops={ops}
          rotuloNovo="Contratar"
          campos={[
            { chave: "nome", rotulo: "Nome" },
            { chave: "funcao", rotulo: "Função", tipo: "select", opcoes: ["aprendiz", ...T.func.linhas.map((l) => l[0].replace(/^\S+\s/, "").toLowerCase())] },
            { chave: "quantos", rotulo: "Quantos", tipo: "numero" },
          ]}
        />
        <div className="mt-1 text-sm">Guarda: {estado.guarda}</div>
      </Secao>

      <Secao titulo="Evento da forja" emoji="🎲" aberta={false}>
        <RolarTabela cfg={cfg} tabela="ev" />
      </Secao>
    </>
  );
}
