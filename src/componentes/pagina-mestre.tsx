"use client";
import { useState } from "react";
import { FRENTES_JOGADORES, frente } from "@/frentes";
import { GOVERNOS } from "@/motor/cidade";
import { ler } from "@/motor/caminho";
import { Provedor, useApp, Aviso, useFrenteAcoes } from "./contexto";
import { Ficha, Relogios, LogView, Ferramentas, Tabelas } from "./ficha";
import { Relogio, Secao, Medida, Numero } from "./ui";
import { FrenteCompleta, estiloFrente } from "./frente-completa";
import { AcoesCidade, Cofres, Projetos, EventoSemana } from "./mestre-cidade";
import { PainelGuilda } from "./mestre-guilda";

const NOME_GOV: Record<string, string> = { regime_especial: "Regime especial", lorde_aliado: "Lorde aliado", lorde_neutro: "Lorde neutro", lorde_hostil: "Lorde hostil", isolamento: "Isolamento" };

export function PaginaMestre({ token }: { token: string }) {
  return (
    <Provedor token={token}>
      <Conteudo />
      <Aviso />
    </Provedor>
  );
}

function Conteudo() {
  const { dados, carregando, erro, acao } = useApp();
  const [aba, setAba] = useState("acoes");
  const [aberta, setAberta] = useState<string | null>(null);
  const [previa, setPrevia] = useState<any>(null);
  if (carregando) return <main className="p-6 text-xl">Carregando…</main>;
  if (!dados) return <main className="p-6 text-xl">⚠️ {erro}</main>;
  if (dados.papel !== "mestre") return <main className="p-6 text-xl">Este link não é do Mestre.</main>;
  const { campanha, frentes } = dados;
  const cidade = frentes.cidade;
  const guilda = frentes.guilda;
  const ctx = { frentes, campanha };
  const C = frente("cidade");
  const alertas = (campanha.alertas ?? []).filter((a: any) => !a.resolvido);

  if (aberta) {
    return (
      <main className="mx-auto max-w-3xl p-3 pb-20" style={{ ...estiloFrente(aberta), background: "var(--fundo)", minHeight: "100vh" }}>
        <button className="btn btn-sec" onClick={() => setAberta(null)}>
          ← Voltar ao painel
        </button>
        <h1 className="mt-2 text-3xl font-bold">
          {frente(aberta).emoji} {frente(aberta).nome}
        </h1>
        <div className="text-sm">Você edita como Mestre. 👁️ oculta um campo dos jogadores.</div>
        <Secao titulo="Ocultar campos" emoji="🙈" aberta={false}>
          <Ficha cfg={frente(aberta)} estado={frentes[aberta]} ctx={ctx} editavel mestre />
        </Secao>
        <FrenteCompleta id={aberta} estado={frentes[aberta]} ctx={ctx} editavel economiaDraetyr={cidade.frentes.economia.nivel} log={dados.log.filter((e: any) => e.frente === aberta)} pedidos={(frentes.forja?.fila ?? []).filter((p: any) => p.para === aberta)} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-3 pb-24" style={{ ...estiloFrente("cidade"), background: "var(--fundo)", minHeight: "100vh" }}>
      {/* 1. Topo */}
      <header className="cartao" style={{ background: "var(--cor)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-bold">🏙️ Painel de Draetyr</h1>
          <div className="text-lg">
            Semana <b className="text-2xl">{campanha.semana}</b> · {campanha.estado}
          </div>
        </div>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <div>
            Estágio <b className="text-2xl">{cidade.estagio}</b> · {C.nomeEstagio(cidade.estagio ?? 0)}
          </div>
          <label className="flex items-center gap-2">
            👑 Governo
            <select className="entrada" value={cidade.governo} onChange={(e) => confirm(`Trocar o governo para ${NOME_GOV[e.target.value]}? As travas são aplicadas na hora.`) && acao("governo", { governo: e.target.value })}>
              {GOVERNOS.map((g) => (
                <option key={g.id} value={g.id}>
                  {NOME_GOV[g.id]}
                </option>
              ))}
            </select>
          </label>
          <div>
            🪙 Cidade: <b>{cidade.cofre_po == null ? "a definir" : `${cidade.cofre_po.toLocaleString("pt-BR")} PO`}</b> · 🛡️ Guilda: <b>{guilda.cofre_pl?.toLocaleString("pt-BR")} PL</b>
            {guilda.cofre_po != null && ` + ${guilda.cofre_po} PO`}
          </div>
          <PjsOnde cidade={cidade} />
        </div>
        <div className="mt-1 text-sm">{C.regras.tabelas.gov.linhas[GOVERNOS.find((g) => g.id === cidade.governo)?.linha ?? 0][2]}</div>
      </header>

      {alertas.length > 0 && (
        <Secao titulo={`Crises · ${alertas.length}`} emoji="🚨">
          {alertas.map((a: any) => (
            <div key={a.id} className="cartao-claro mt-1 border-2 border-red-500">
              <div className="font-bold">{a.texto}</div>
              <div className="mt-1 flex gap-2">
                {a.caminho && (
                  <button className="btn btn-mini" onClick={() => acao("resolver_alerta", { id: a.id, zerar: true })}>
                    Resolvida · zerar relógio
                  </button>
                )}
                <button className="btn btn-mini btn-sec" onClick={() => acao("resolver_alerta", { id: a.id, zerar: false })}>
                  Resolvida
                </button>
              </div>
            </div>
          ))}
        </Secao>
      )}

      {/* 4. Caixa de entrada */}
      <CaixaEntrada pendentes={dados.pendentes} decididos={dados.decididos} />

      {/* 2. As 7 frentes */}
      <Secao titulo="As 7 frentes de Draetyr" emoji="🧭">
        <Ficha cfg={C} estado={cidade} ctx={ctx} editavel mestre />
      </Secao>

      {/* 3. Relógios */}
      <Secao titulo="Relógios da cidade" emoji="⏰">
        <Relogios cfg={C} estado={cidade} editavel />
      </Secao>

      {/* 5. Cartões dos jogadores */}
      <Secao titulo="Frentes dos jogadores" emoji="🎭">
        <div className="grid gap-2 sm:grid-cols-2">
          {FRENTES_JOGADORES.map((f) => (
            <CartaoFrente key={f.id} id={f.id} estado={frentes[f.id]} ctx={ctx} pronto={!!campanha.turno_pronto?.[f.id]} alertas={alertas.filter((a: any) => a.frente === f.id)} onAbrir={() => setAberta(f.id)} />
          ))}
        </div>
      </Secao>

      {/* 6. Abas */}
      <nav className="sticky top-0 z-30 mt-4 flex gap-1 overflow-x-auto bg-black/80 p-1">
        {[
          ["acoes", "⚙️ Ações"],
          ["projetos", "🏗️ Projetos"],
          ["guilda", "🛡️ Guilda"],
          ["evento", "🎲 Evento d100"],
          ["ferramentas", "🧰 Ferramentas"],
          ["historico", "📜 Histórico"],
          ["config", "🔧 Config"],
        ].map(([id, rot]) => (
          <button key={id} className={`btn btn-mini shrink-0 whitespace-nowrap ${aba === id ? "" : "btn-sec"}`} onClick={() => setAba(id)}>
            {rot}
          </button>
        ))}
      </nav>
      <section className="cartao mt-2">
        {aba === "acoes" && (
          <>
            <Cofres cidade={cidade} guilda={guilda} />
            <div className="mt-3" />
            <AcoesCidade cidade={cidade} ctx={ctx} />
          </>
        )}
        {aba === "projetos" && <Projetos cidade={cidade} />}
        {aba === "guilda" && (
          <>
            <Ficha cfg={frente("guilda")} estado={guilda} ctx={ctx} editavel mestre={false} />
            <div className="mt-3" />
            <PainelGuilda guilda={guilda} cidade={cidade} semana={campanha.semana} />
          </>
        )}
        {aba === "evento" && <EventoSemana cidade={cidade} />}
        {aba === "ferramentas" && <FerramentasMestre frentes={frentes} />}
        {aba === "historico" && <LogView log={dados.log} />}
        {aba === "config" && <Config campanha={campanha} />}
      </section>

      {/* 7. Fechar semana */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-white/20 bg-black/90 p-3">
        <div className="mx-auto flex max-w-5xl gap-2">
          <button className="btn flex-1 text-lg" onClick={async () => setPrevia(await acao("previa"))}>
            🔒 Fechar semana {campanha.semana}
          </button>
          {dados.temSnapshotAnterior && (
            <button className="btn btn-sec" onClick={() => confirm(`Reabrir a semana ${campanha.semana - 1}? Tudo volta ao snapshot do fechamento e o que foi feito na semana ${campanha.semana} se perde.`) && acao("reabrir")}>
              ↩️ Reabrir
            </button>
          )}
        </div>
      </div>

      {previa && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-3">
          <div className="cartao mx-auto max-w-2xl" style={{ background: "var(--fundo)" }}>
            <h2 className="text-2xl font-bold">Prévia do fechamento da semana {campanha.semana}</h2>
            <div className="mt-1 text-sm">
              Turnos prontos: {FRENTES_JOGADORES.map((f) => `${f.emoji} ${campanha.turno_pronto?.[f.id] ? "✔" : "…"}`).join("  ")}
            </div>
            {previa.passos.map((p: any, i: number) => (
              <div key={i} className="mt-2">
                <div className="font-bold">
                  {i + 1}. {p.titulo}
                </div>
                <ul className="ml-4 text-sm">
                  {p.itens.length ? p.itens.map((t: string, j: number) => <li key={j}>{t}</li>) : <li className="opacity-60">nada muda</li>}
                </ul>
              </div>
            ))}
            {previa.pendentes.length > 0 && (
              <div className="mt-2">
                <b>📨 Vão para a caixa de entrada:</b>
                <ul className="ml-4 text-sm">{previa.pendentes.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                className="btn flex-1"
                onClick={async () => {
                  await acao("fechar", { semana: campanha.semana });
                  setPrevia(null);
                }}
              >
                ✔ Confirmar e fechar
              </button>
              <button className="btn btn-sec" onClick={() => setPrevia(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function PjsOnde({ cidade }: { cidade: any }) {
  const { ops } = useFrenteAcoes("cidade");
  return (
    <div className="flex flex-wrap items-center gap-2">
      📍 PJs:
      <input className="entrada w-32" defaultValue={cidade.pjs_onde ?? ""} onBlur={(e) => e.target.value !== (cidade.pjs_onde ?? "") && ops([{ op: "definir", caminho: "pjs_onde", valor: e.target.value }], `PJs em ${e.target.value}`)} />
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={!!cidade.pjs_em_draetyr} onChange={(e) => ops([{ op: "definir", caminho: "pjs_em_draetyr", valor: e.target.checked }], e.target.checked ? "PJs em Draetyr" : "PJs fora de Draetyr")} />
        em Draetyr
      </label>
    </div>
  );
}

function CartaoFrente({ id, estado, ctx, pronto, alertas, onAbrir }: { id: string; estado: any; ctx: any; pronto: boolean; alertas: any[]; onAbrir: () => void }) {
  const cfg = frente(id);
  const E = cfg.estagio(estado, ctx);
  return (
    <button className="cartao text-left" style={{ ...estiloFrente(id), background: cfg.cores.fundo }} onClick={onAbrir}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">
          {cfg.emoji} {cfg.nome}
        </h3>
        {pronto ? <span className="selo" style={{ borderColor: "#4caf50", color: "#8f8" }}>turno pronto ✔</span> : <span className="text-sm opacity-60">em andamento</span>}
      </div>
      <div className="text-sm">
        {cfg.personagem} · {cfg.dono} · Estágio <b>{E}</b> {cfg.nomeEstagio(E)}
      </div>
      <div className="mt-2 grid gap-1">
        {cfg.cartao.map((c) => {
          const s = cfg.campos.find((x) => x.caminho === c)!;
          const v = ler(estado, c);
          return s.tipo === "medida" ? (
            <Medida key={c} rotulo={s.rotulo} emoji={s.emoji} valor={v} nomeNivel={v ? s.nomeNivel?.(v.nivel) : undefined} />
          ) : (
            <Numero key={c} rotulo={s.rotulo} emoji={s.emoji} valor={v} min={s.min} max={s.max} />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {cfg.relogios
          .filter((r) => !r.caminho.includes("*"))
          .map((r) => {
            const v = ler(estado, r.caminho);
            return v ? (
              <span key={r.caminho} className={`selo ${v.valor >= v.tamanho ? "!border-red-500 !text-red-300" : ""}`}>
                {r.emoji} {v.valor}/{v.tamanho}
              </span>
            ) : null;
          })}
      </div>
      {alertas.map((a) => (
        <div key={a.id} className="mt-1 text-sm font-bold text-red-300">
          🚨 {a.texto}
        </div>
      ))}
    </button>
  );
}

function CaixaEntrada({ pendentes, decididos }: { pendentes: any[]; decididos: any[] }) {
  const { acao } = useApp();
  const [motivo, setMotivo] = useState<Record<string, string>>({});
  return (
    <Secao titulo={`Caixa de entrada · ${pendentes.length}`} emoji="📨">
      {!pendentes.length && <div className="opacity-70">Nenhum efeito pendente.</div>}
      <div className="grid gap-2">
        {pendentes.map((p) => {
          const o = p.origem in { cidade: 1, guilda: 1 } ? null : frente(p.origem);
          return (
            <div key={p.id} className="cartao-claro" style={o ? estiloFrente(o.id) : undefined}>
              <div className="text-xs opacity-70">
                Semana {p.semana} · {o ? `${o.emoji} ${o.nome}` : p.origem} · por {p.criado_por}
              </div>
              <div className="font-bold">{p.texto}</div>
              {p.escolha && <div className="text-sm">Escolha: {p.escolha}</div>}
              <input className="entrada mt-1 w-full" placeholder="motivo (opcional)" value={motivo[p.id] ?? ""} onChange={(e) => setMotivo({ ...motivo, [p.id]: e.target.value })} />
              <div className="mt-1 flex gap-2">
                <button className="btn btn-mini" onClick={() => acao("decidir", { id: p.id, aprovar: true, motivo: motivo[p.id] })}>
                  ✅ Aprovar
                </button>
                <button className="btn btn-mini btn-sec" onClick={() => acao("decidir", { id: p.id, aprovar: false, motivo: motivo[p.id] })}>
                  ❌ Recusar
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {decididos?.length > 0 && (
        <details className="mt-2">
          <summary className="text-sm">decididos recentes</summary>
          {decididos.map((p) => (
            <div key={p.id} className="text-sm">
              {p.status === "aprovado" ? "✅" : "❌"} {p.texto} {p.motivo_decisao && `· ${p.motivo_decisao}`}
            </div>
          ))}
        </details>
      )}
    </Secao>
  );
}

function FerramentasMestre({ frentes }: { frentes: any }) {
  const [f, setF] = useState("cidade");
  const lista = ["cidade", "guilda", ...FRENTES_JOGADORES.map((x) => x.id)];
  return (
    <div style={estiloFrente(f)}>
      <select className="entrada mb-2" value={f} onChange={(e) => setF(e.target.value)}>
        {lista.map((id) => (
          <option key={id} value={id}>
            {frente(id).emoji} {frente(id).nome}
          </option>
        ))}
      </select>
      <Ferramentas key={f} cfg={frente(f)} estado={frentes[f]} />
      <div className="mt-3">
        <Tabelas cfg={frente(f)} />
      </div>
    </div>
  );
}

function Config({ campanha }: { campanha: any }) {
  const { acao } = useApp();
  const b = campanha.config?.bordas ?? { zerarNoMinimo: true, marcasMaxNoTopo: 4 };
  return (
    <div className="grid gap-2">
      <h3 className="text-lg font-bold">Bordas das marcas</h3>
      <label className="flex items-center gap-2">
        <input type="checkbox" className="h-6 w-6" checked={b.zerarNoMinimo} onChange={(e) => acao("config", { config: { bordas: { ...b, zerarNoMinimo: e.target.checked } } })} />
        No nível 0 com marcas negativas, fica 0 com 0 marcas
      </label>
      <label className="flex items-center gap-2">
        No nível 5, as marcas param em
        <input className="entrada w-16" inputMode="numeric" defaultValue={b.marcasMaxNoTopo} onBlur={(e) => acao("config", { config: { bordas: { ...b, marcasMaxNoTopo: Number(e.target.value) || 4 } } })} />
      </label>
      <div className="text-sm opacity-80">Os relógios andam sozinhos quando a tabela manda (ex.: Notoriedade sobe → Atenção do Inferno +1).</div>
    </div>
  );
}

export { Relogio };
