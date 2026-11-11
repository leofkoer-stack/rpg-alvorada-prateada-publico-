"use client";
import { useState } from "react";
import type { Ctx, FrenteConfig } from "@/frentes/tipos";
import { bonusEquipeServico, receitaBaseCaldeirao, multiplicadorServico, custoMesaParaTodos } from "@/motor/caldeirao";
import { useFrenteAcoes } from "../contexto";
import { Secao, TabelaView, Linha, Proposta } from "../ui";
import { Ficha, Estagio, Ligacoes } from "../ficha";
import { RolarTabela, TesteBox } from "../rolagens";
import { ListaEditavel } from "../listas";

export function PainelCaldeirao({ cfg, estado, ctx, editavel, economiaDraetyr, semana }: { cfg: FrenteConfig; estado: any; ctx: Ctx; editavel: boolean; economiaDraetyr: number | null; semana: number }) {
  const { ops } = useFrenteAcoes(cfg.id);
  const T = cfg.regras.tabelas;
  const B = estado.bonus_chopp ?? {};
  const E = estado.estagio ?? 0;
  const [card, setCard] = useState<"Simples" | "Caprichado" | "Ousado">("Simples");
  const [serv, setServ] = useState<any>(null);
  const [receitaManual, setReceitaManual] = useState("");
  const [lote, setLote] = useState("");
  const [gasto, setGasto] = useState("");
  const [nova, setNova] = useState<any>({ nome: "", tipo: T.tipos.linhas[0][0], estrelas: 1 });
  const eqB = bonusEquipeServico(estado.equipe);
  const linhaCard = T.card.linhas.find((l) => l[0] === card)!;
  const base = receitaBaseCaldeirao(T.est.linhas[E]);
  const d = estado.despensa ?? {};
  const comuns = (d.comuns ?? []).reduce((s: number, l: any) => s + (l.qtd ?? 0), 0);
  const fama4 = (estado.fama?.nivel ?? 0) >= 4;

  const calcReceita = (classe: string) => {
    const m = multiplicadorServico(classe, card);
    if (m == null) return null;
    let v = base * m * (fama4 ? 1.5 : 1);
    return Math.round(v);
  };

  /** Gasta porções: frescas primeiro, depois os lotes comuns mais antigos. */
  const gastarOps = (qtd: number) => {
    const o: any[] = [];
    let resto = qtd;
    const fr = Math.min(d.frescas ?? 0, resto);
    if (fr) o.push({ op: "contador", caminho: "despensa.frescas", delta: -fr });
    resto -= fr;
    const lotes = [...(d.comuns ?? [])].sort((a: any, b: any) => (a.validade_semana ?? 0) - (b.validade_semana ?? 0)).map((l: any) => ({ ...l }));
    for (const l of lotes) {
      const t = Math.min(l.qtd, resto);
      l.qtd -= t;
      resto -= t;
    }
    o.push({ op: "definir", caminho: "despensa.comuns", valor: lotes.filter((l: any) => l.qtd > 0) });
    return { ops: o, faltou: resto };
  };

  return (
    <>
      <Secao titulo="Estágio" emoji="🏠">
        <Estagio cfg={cfg} estado={estado} ctx={ctx} editavel={editavel} tabela="est" />
        {estado.proposta && <div className="mt-1"><Proposta /> Mecânica em rascunho, aguarda o Mestre.</div>}
      </Secao>

      <Secao titulo="Medidas e despensa" emoji="📊">
        <Ficha cfg={cfg} estado={estado} ctx={ctx} editavel={editavel} mestre={false} />
        <div className="cartao-claro mt-2">
          <b>🍞 Porções comuns: {comuns}</b> (duram 4 semanas)
          <ul className="text-sm">
            {(d.comuns ?? []).map((l: any, i: number) => (
              <li key={i}>
                {l.qtd} porções · vencem depois da semana {l.validade_semana}
              </li>
            ))}
          </ul>
          {editavel && (
            <div className="mt-2 flex flex-wrap gap-2">
              <input className="entrada w-20" inputMode="numeric" placeholder="qtd" value={lote} onChange={(e) => setLote(e.target.value)} />
              <button className="btn btn-mini" disabled={!Number(lote)} onClick={() => ops([{ op: "lista_add", caminho: "despensa.comuns", item: { qtd: Number(lote), validade_semana: semana + 3 } }], `+${lote} porções comuns`).then(() => setLote(""))}>
                Entrar lote
              </button>
              <input className="entrada w-20" inputMode="decimal" placeholder="gastar" value={gasto} onChange={(e) => setGasto(e.target.value)} />
              <button
                className="btn btn-mini btn-sec"
                disabled={!Number(gasto)}
                onClick={() => {
                  const g = gastarOps(Number(gasto.replace(",", ".")));
                  ops(g.ops, `Gastou ${gasto} porções${g.faltou ? ` (faltaram ${g.faltou})` : ""}`).then(() => setGasto(""));
                }}
              >
                Gastar (frescas → comuns)
              </button>
            </div>
          )}
          {d.nota && <div className="mt-1 text-xs opacity-80">{d.nota}</div>}
        </div>
      </Secao>

      <Secao titulo="Fundos" emoji="🐖">
        <div className="grid gap-1">
          {(estado.fundos ?? []).map((f: any, i: number) => (
            <div key={i} className="cartao-claro">
              <b>{f.nome}</b> · +{f.producao_porcoes} {f.tipo} por semana {f.semanas_sem_cuidado ? <span className="text-red-300">· {f.semanas_sem_cuidado} semana(s) sem cuidado</span> : ""}
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-1">
                  <input type="checkbox" className="h-6 w-6" disabled={!editavel} checked={!!f.cuidado_semana} onChange={(e) => ops([{ op: "definir", caminho: `fundos.${i}.cuidado_semana`, valor: e.target.checked }], `${f.nome}: cuidado ${e.target.checked ? "✔" : "✘"}`)} />
                  alguém cuidou
                </label>
                <label className="flex items-center gap-1">
                  <input type="checkbox" className="h-6 w-6" disabled={!editavel} checked={!!f.dobro_semana} onChange={(e) => ops([{ op: "definir", caminho: `fundos.${i}.dobro_semana`, valor: e.target.checked }], `${f.nome}: produção em dobro ${e.target.checked ? "✔" : "✘"}`)} />
                  dobro (Cuidar dos fundos)
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 text-xs opacity-80">A produção entra no fechamento. Sem cuidado por 2 semanas, dispara o evento 3.</div>
      </Secao>

      <Secao titulo="Equipe" emoji="👨‍🍳" aberta={false}>
        <ListaEditavel
          itens={estado.equipe ?? []}
          caminho="equipe"
          editavel={editavel}
          ops={ops}
          rotuloNovo="Contratar"
          campos={[
            { chave: "nome", rotulo: "Nome" },
            { chave: "funcao", rotulo: "Função", tipo: "select", opcoes: T.func.linhas.map((l) => l[0].replace(/^\S+\s/, "")) },
          ]}
          render={(p) => (
            <div>
              <b>{p.nome}</b> · {p.funcao} · {p.pago_semana ? "✅ pago" : <span className="text-red-300">sem pagamento{p.semanas_sem_pagar ? ` há ${p.semanas_sem_pagar} semana` : ""}</span>}
            </div>
          )}
          acoesItem={(p, i) =>
            editavel && !p.pago_semana ? (
              <>
                <button className="btn btn-mini" onClick={() => ops([{ op: "definir", caminho: `equipe.${i}.pago_semana`, valor: true }, { op: "contador", caminho: "caixa_po", delta: -5 }], `Pagou ${p.nome}: 5 PO`)}>
                  Pagar 5 PO
                </button>
                <button className="btn btn-mini btn-sec" onClick={() => { const g = gastarOps(2); ops([{ op: "definir", caminho: `equipe.${i}.pago_semana`, valor: true }, ...g.ops], `Pagou ${p.nome}: 2 porções`); }}>
                  Pagar 2 porções
                </button>
              </>
            ) : null
          }
        />
      </Secao>

      <Secao titulo={`Livro de receitas · ${(estado.receitas ?? []).length}`} emoji="📖" aberta={false}>
        <ListaEditavel
          itens={estado.receitas ?? []}
          caminho="receitas"
          editavel={editavel}
          ops={ops}
          rotuloNovo="Receita à mão"
          campos={[
            { chave: "nome", rotulo: "Nome" },
            { chave: "tipo", rotulo: "Tipo", tipo: "select", opcoes: T.tipos.linhas.map((l) => l[0]) },
            { chave: "estrelas", rotulo: "★", tipo: "numero" },
          ]}
          render={(r) => (
            <div>
              <b>{r.nome}</b> · {r.tipo} · {"★".repeat(r.estrelas ?? 0)}
            </div>
          )}
        />
        {editavel && (
          <div className="cartao-claro mt-2">
            <b>Criar receita</b>: Cozinha +{B.Cozinha ?? 0} vs CD 10 + 3 × ★
            <div className="mt-1 flex flex-wrap gap-2">
              <input className="entrada" placeholder="nome" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
              <select className="entrada" value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>
                {T.tipos.linhas.map((l) => (
                  <option key={l[0]}>{l[0]}</option>
                ))}
              </select>
              <input className="entrada w-16" inputMode="numeric" value={nova.estrelas} onChange={(e) => setNova({ ...nova, estrelas: Number(e.target.value) || 1 })} />
            </div>
            <TesteBox
              key={nova.estrelas}
              cfg={cfg}
              rotulo={`Criar receita ${"★".repeat(nova.estrelas)}`}
              bonusInicial={B.Cozinha ?? 0}
              cdInicial={10 + 3 * nova.estrelas}
              tabelaResultado="__nenhuma"
              onResultado={(r) => {
                if (["sucesso", "sucesso5", "nat20"].includes(r.rolagem.classe) && nova.nome)
                  ops([{ op: "lista_add", caminho: "receitas", item: { id: `r${Date.now().toString(36)}`, ...nova } }], `Receita nova: ${nova.nome}`);
              }}
            />
          </div>
        )}
      </Secao>

      <Secao titulo="Serviço da semana" emoji="🍽️">
        <div className="flex flex-wrap items-center gap-2">
          <select className="entrada" value={card} onChange={(e) => setCard(e.target.value as any)}>
            {T.card.linhas.map((l) => (
              <option key={l[0]}>{l[0]}</option>
            ))}
          </select>
          <span className="text-sm">
            CD <b>{linhaCard[1]}</b> · consome {linhaCard[2].replace("Estágio", `Estágio (${5 * E})`)} · receita {linhaCard[3]}
          </span>
        </div>
        <TesteBox
          key={card + eqB}
          cfg={cfg}
          rotulo={`Serviço ${card}`}
          bonusInicial={(B.Cozinha ?? 0) + eqB}
          cdInicial={Number(linhaCard[1])}
          onResultado={(r) => setServ(r.rolagem)}
        />
        <div className="mt-1 text-sm">
          Cozinha +{B.Cozinha ?? 0} + equipe +{eqB} · receita base {base} PO {fama4 && "· Fama 4: ×1,5"}
        </div>
        {serv && editavel && (
          <div className="cartao-claro mt-2">
            {(() => {
              const v = calcReceita(serv.classe) ?? (receitaManual === "" ? null : Number(receitaManual));
              const escambo = (economiaDraetyr ?? 0) <= 1 && v != null ? Math.floor(v / 2) : 0;
              const o: any[] = [];
              const c = serv.classe;
              if (c === "sucesso5") o.push({ op: "marcas", caminho: "pertencimento", delta: 1 }, { op: "marcas", caminho: "fama", delta: 1 });
              if (c === "sucesso") {
                o.push({ op: "marcas", caminho: "pertencimento", delta: 1 });
                if (card !== "Simples") o.push({ op: "marcas", caminho: "fama", delta: 1 });
              }
              if (c === "falha5") o.push({ op: "marcas", caminho: "fama", delta: -1 });
              if (v != null) o.push({ op: "contador", caminho: "caixa_po", delta: v - escambo });
              return (
                <>
                  {calcReceita(serv.classe) == null && (
                    <label className="block text-sm">
                      A tabela não dá a receita para este resultado. Digite: <input className="entrada w-24" inputMode="numeric" value={receitaManual} onChange={(e) => setReceitaManual(e.target.value)} />
                    </label>
                  )}
                  <div>
                    Receita: <b>{v ?? "?"} PO</b> {escambo ? `· escambo (Economia ≤ 1): ${escambo} PO em espécie` : ""}
                  </div>
                  <button className="btn mt-2" disabled={estado.caixa_po == null} onClick={() => ops(o, `Serviço ${card}: ${c}, receita ${v ?? 0} PO`).then(() => setServ(null))}>
                    Aplicar resultado
                  </button>
                  {estado.caixa_po == null && <div className="text-sm">Defina o caixa (✏️) antes.</div>}
                  <div className="text-xs opacity-80">Falha por 5+: metade das porções se perde (use “Gastar”). 20 natural: um prato ganha +1 ★ (edite a receita).</div>
                </>
              );
            })()}
          </div>
        )}
      </Secao>

      <Secao titulo="Mesa para todos" emoji="🫕">
        <Linha rotulo="Custo" emoji="🍲">
          {custoMesaParaTodos(estado.pertencimento?.nivel ?? 0)} porções
        </Linha>
        {editavel && (
          <button
            className="btn mt-2"
            onClick={() => {
              const g = gastarOps(custoMesaParaTodos(estado.pertencimento?.nivel ?? 0));
              ops([...g.ops, { op: "marcas", caminho: "pertencimento", delta: 1 }, { op: "relogio", caminho: "relogios.fome", delta: -1 }], `Mesa para todos: +1 marca em Pertencimento, Fome −1${g.faltou ? ` (faltaram ${g.faltou} porções)` : ""}`);
            }}
          >
            🫕 Servir a Mesa para todos
          </button>
        )}
      </Secao>

      <Secao titulo="Salão e ligações" emoji="🎲" aberta={false}>
        <RolarTabela cfg={cfg} tabela="ev" />
        <div className="mt-2">
          <Ligacoes cfg={cfg} estado={estado} editavel={editavel} />
        </div>
        <details className="mt-2">
          <summary className="text-sm">ver ações do Caldeirão</summary>
          <TabelaView t={T.acoes} />
        </details>
      </Secao>
    </>
  );
}
