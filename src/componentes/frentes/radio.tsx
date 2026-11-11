"use client";
import { useState } from "react";
import type { Ctx, FrenteConfig } from "@/frentes/tipos";
import { tetoRadio, zonasComTorre, pautasPorSemana, somaAcervo, receitaRadio, manutencaoRadio } from "@/motor/radio";
import { contarEstrelas } from "@/motor/teste";
import { useFrenteAcoes } from "../contexto";
import { Secao, TabelaView, Linha } from "../ui";
import { Ficha, GradeZonas, Estagio, Ligacoes } from "../ficha";
import { RolarTabela, TesteBox } from "../rolagens";
import { ListaEditavel } from "../listas";
import { ZONAS } from "@/frentes/seed";

const PODERES = ["guildas", "nobreza", "clero", "povo"];
const nomePoder = (p: string) => ({ guildas: "Guildas", nobreza: "Nobreza", clero: "Clero", povo: "Povo" } as any)[p?.toLowerCase()] ?? p;
const FAIXAS: [string, string][] = [
  ["manha", "🌅 Manhã"],
  ["meio_dia", "☀️ Meio-dia"],
  ["tarde", "🌇 Tarde"],
  ["noite", "🌙 Noite"],
  ["madrugada", "🌌 Madrugada"],
];

export function PainelRadio({ cfg, estado, ctx, editavel }: { cfg: FrenteConfig; estado: any; ctx: Ctx; editavel: boolean }) {
  const { ops, rolarTabela, rolarTeste } = useFrenteAcoes(cfg.id);
  const T = cfg.regras.tabelas;
  const B = estado.bonus_mandy ?? {};
  const teto = tetoRadio(estado.sinal_por_zona);
  const acervo = somaAcervo(estado.portfolio);
  const nivelAcervo = [...T.acervo.linhas].reverse().find((l) => acervo >= Number(l[1].replace(/\D/g, "")))?.[0] ?? "0";
  const grade = estado.grade ?? {};
  const gradeCompleta = FAIXAS.every(([k]) => grade[k]);
  const progMax = (() => {
    const p = T.fases.linhas[estado.estagio ?? 0]?.[3] ?? "—";
    const m = p.match(/\+\s*(\d+)/);
    return m ? Number(m[1]) : 0;
  })();

  // ----- entrevista -----
  const [ent, setEnt] = useState<any>({ passo: 0 });
  const fonte = ent.fonte;
  const estrelas = fonte?.estrelas ?? 1;
  const tier = T.tier.linhas[Math.max(0, Math.min(4, estrelas - 1))];
  const poder = (fonte?.poder ?? "").toLowerCase();
  const infPoder = estado.influencia?.[poder]?.nivel ?? 0;

  async function gerarPautas() {
    const n = pautasPorSemana(estado.sinal_por_zona);
    for (let i = 0; i < n; i++) {
      const c = await rolarTabela("d6c");
      let zona = c.rolagem.linha?.[1];
      if (c.rolagem.total === 1) zona = (await rolarTabela("d8z")).rolagem.linha?.[1];
      const p = await rolarTabela("pautas");
      const l = p.rolagem.linha ?? [];
      await ops([{ op: "lista_add", caminho: "pautas_semana", item: { zona, pauta: l[1], poder: l[2], fonte: l[3] } }], `Pauta: ${l[1]} (${zona})`);
    }
  }

  return (
    <>
      <Secao titulo="Estágio" emoji="📶">
        <Estagio cfg={cfg} estado={estado} ctx={ctx} editavel={editavel} tabela="fases" />
      </Secao>

      <Secao titulo="Audiência e Influência" emoji="👂">
        <div className="cartao-claro mb-2">
          🗼 Teto agora: <b className="text-xl">{teto}</b> (1 + {zonasComTorre(estado.sinal_por_zona)} zona(s) com Torre ou Estúdio)
        </div>
        <Ficha cfg={cfg} estado={estado} ctx={ctx} editavel={editavel} mestre={false} />
        <details className="mt-2">
          <summary className="text-sm">ver tabela de Influência e Integridade</summary>
          <TabelaView t={T.inf} />
          <TabelaView t={T.integ} />
        </details>
      </Secao>

      <Secao titulo="Sinal por zona" emoji="📡" aberta={false}>
        <GradeZonas cfg={cfg} padrao="sinal_por_zona.*" estado={estado} ctx={ctx} editavel={editavel} />
        <details className="mt-2">
          <summary className="text-sm">ver tabela de Sinal</summary>
          <TabelaView t={T.sinal} />
        </details>
      </Secao>

      <Secao titulo="Caixa" emoji="🪙" aberta={false}>
        <Linha rotulo="Receita" emoji="➕">{receitaRadio(estado.estagio ?? 0, estado.audiencia?.nivel ?? 0)} PO {(estado.estagio ?? 0) < 3 && "(só no Estágio 3+)"}</Linha>
        <Linha rotulo="Manutenção" emoji="➖">{manutencaoRadio(estado.sinal_por_zona)} PO</Linha>
        {editavel && (
          <button
            className="btn mt-2"
            disabled={estado.caixa_po == null}
            onClick={() => {
              const v = receitaRadio(estado.estagio ?? 0, estado.audiencia?.nivel ?? 0) - manutencaoRadio(estado.sinal_por_zona);
              ops([{ op: "contador", caminho: "caixa_po", delta: v }], `Caixa da semana: ${v >= 0 ? "+" : ""}${v} PO`);
            }}
          >
            Lançar receita e manutenção
          </button>
        )}
        {estado.caixa_po == null && <div className="text-sm">Defina o caixa na ficha antes (✏️).</div>}
      </Secao>

      <Secao titulo={`Pautas da semana (${pautasPorSemana(estado.sinal_por_zona)})`} emoji="📰">
        {editavel && (
          <button className="btn" onClick={gerarPautas}>
            🎲 Rolar as pautas
          </button>
        )}
        <div className="mt-2 grid gap-1">
          {(estado.pautas_semana ?? []).map((p: any, i: number) => (
            <div key={i} className="cartao-claro">
              {p.pauta ? (
                <>
                  <b>{p.pauta}</b> · {p.zona} · poder <b>{p.poder}</b> · fonte {p.fonte}
                </>
              ) : (
                <>📨 Pauta extra: {p.origem}</>
              )}
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Entrevista" emoji="🎙️">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm">
            Fonte
            <select
              className="entrada w-full"
              value={fonte?.nome ?? ""}
              onChange={(e) => {
                const f = (estado.fontes ?? []).find((x: any) => x.nome === e.target.value);
                setEnt({ passo: 0, fonte: f ? { ...f } : { nome: "", estrelas: 1, poder: "" } });
              }}
            >
              <option value="">escolha…</option>
              {(estado.fontes ?? []).map((f: any) => (
                <option key={f.id ?? f.nome}>{f.nome}</option>
              ))}
              <option value="__nova">— fonte nova —</option>
            </select>
          </label>
          {fonte && (
            <>
              <label className="text-sm">
                ★ da fonte
                <input className="entrada w-full" inputMode="numeric" value={fonte.estrelas ?? ""} onChange={(e) => setEnt({ ...ent, fonte: { ...fonte, estrelas: Number(e.target.value) || 1 } })} />
              </label>
              <label className="text-sm">
                Poder da fonte
                <select className="entrada w-full" value={poder} onChange={(e) => setEnt({ ...ent, fonte: { ...fonte, poder: e.target.value } })}>
                  <option value="">—</option>
                  {PODERES.map((p) => (
                    <option key={p} value={p}>
                      {nomePoder(p)}
                    </option>
                  ))}
                </select>
              </label>
              {fonte.nome === "__nova" || fonte.nome === "" ? (
                <label className="text-sm">
                  Nome
                  <input className="entrada w-full" onChange={(e) => setEnt({ ...ent, fonte: { ...fonte, nomeNovo: e.target.value } })} />
                </label>
              ) : null}
            </>
          )}
        </div>
        {fonte && (
          <div className="mt-2 grid gap-2">
            <div className="text-sm">
              1️⃣ <b>Acesso</b>: Persuasão +{B["Persuasão"] ?? 0} vs CD {tier[2]} {infPoder >= estrelas && poder ? "· com vantagem (Influência ≥ ★)" : ""}
            </div>
            <TesteBox
              key={`a${estrelas}${poder}`}
              cfg={cfg}
              rotulo="Acesso"
              bonusInicial={B["Persuasão"] ?? 0}
              cdInicial={Number(tier[2]) || 22}
              modoInicial={infPoder >= estrelas && poder ? "vantagem" : "normal"}
              tabelaResultado="__nenhuma"
              onResultado={(r) => setEnt({ ...ent, acesso: r.rolagem, passo: 1 })}
            />
            {ent.passo >= 1 && (
              <RolarTabela cfg={cfg} tabela="disp" rotulo="2️⃣ Disposição (d6)" onResultado={(r) => setEnt({ ...ent, disp: r.rolagem, passo: 2 })} />
            )}
            {ent.passo >= 2 && (
              <>
                <div className="text-sm">
                  3️⃣ <b>Conversa</b>: Intuição +{B["Intuição"] ?? 0} vs CD {tier[3]} {ent.disp?.linha?.[2]} = <b>{Number(tier[3]) + Number(String(ent.disp?.linha?.[2] ?? "0").replace("−", "-").replace("+", ""))}</b>
                </div>
                <TesteBox
                  key={`c${ent.disp?.total}`}
                  cfg={cfg}
                  rotulo="Conversa"
                  bonusInicial={B["Intuição"] ?? 0}
                  cdInicial={Number(tier[3]) + Number(String(ent.disp?.linha?.[2] ?? "0").replace("−", "-").replace("+", ""))}
                  tabelaResultado="conv"
                  onResultado={(r) => setEnt({ ...ent, conv: r.rolagem, passo: 3 })}
                />
              </>
            )}
            {ent.passo >= 3 && (
              <>
                <RolarTabela cfg={cfg} tabela="traz" rotulo="4️⃣ O que a fonte traz (d8)" />
                {["sucesso5", "nat20"].includes(ent.conv?.classe) && <RolarTabela cfg={cfg} tabela="desd" rotulo="Desdobramento (d10)" />}
                {editavel && (
                  <button
                    className="btn"
                    onClick={async () => {
                      const c = ent.conv.classe;
                      const est = c === "sucesso5" || c === "nat20" ? estrelas + 1 : c === "sucesso" ? estrelas : c === "falha" ? Math.max(1, estrelas - 1) : estrelas;
                      const o: any[] = [];
                      if (c !== "falha5")
                        o.push({ op: "lista_add", caminho: "portfolio", item: { id: `g${Date.now().toString(36)}`, tipo: "entrevista", titulo: `Entrevista com ${fonte.nomeNovo || fonte.nome}`, fonte: fonte.nomeNovo || fonte.nome, estrelas: Math.min(5, est), zona: "", poder, uso: "Arquivo" } });
                      if (c === "falha5" && poder) o.push({ op: "marcas", caminho: `influencia.${poder}`, delta: -1 });
                      if (c === "nat1") o.push({ op: "relogio", caminho: "relogios.pressao", delta: 1 });
                      if (o.length) await ops(o, `Entrevista com ${fonte.nomeNovo || fonte.nome}: ${c}`);
                      setEnt({ passo: 0 });
                    }}
                  >
                    💾 Salvar o resultado
                  </button>
                )}
              </>
            )}
          </div>
        )}
        <details className="mt-2">
          <summary className="text-sm">ver tabelas da entrevista</summary>
          <TabelaView t={T.tier} />
          <TabelaView t={T.conv} />
        </details>
      </Secao>

      <Secao titulo={`Portfólio · Acervo ${acervo} ★ (nível ${nivelAcervo})`} emoji="🎞️" aberta={false}>
        <ListaEditavel
          itens={estado.portfolio ?? []}
          caminho="portfolio"
          editavel={editavel}
          ops={ops}
          rotuloNovo="Nova gravação"
          campos={[
            { chave: "tipo", rotulo: "Tipo", tipo: "select", opcoes: ["entrevista", "eco", "música"] },
            { chave: "titulo", rotulo: "Título" },
            { chave: "fonte", rotulo: "Fonte" },
            { chave: "estrelas", rotulo: "★", tipo: "numero" },
            { chave: "zona", rotulo: "Zona", tipo: "select", opcoes: ZONAS.map((z) => z.nome) },
            { chave: "poder", rotulo: "Poder", tipo: "select", opcoes: PODERES },
            { chave: "uso", rotulo: "Uso", tipo: "select", opcoes: T.uso.linhas.map((l) => l[0]) },
          ]}
          render={(g) => (
            <div>
              <b>{g.titulo || "(sem título)"}</b> · {"★".repeat(g.estrelas ?? 0)} · {g.tipo} · {g.fonte} · {g.zona} · {nomePoder(g.poder)} · <span className="detalhe">{g.uso}</span>
            </div>
          )}
        />
        <details className="mt-2">
          <summary className="text-sm">ver Acervo e usos</summary>
          <TabelaView t={T.acervo} />
          <TabelaView t={T.uso} />
        </details>
      </Secao>

      <Secao titulo="Fontes" emoji="🗣️" aberta={false}>
        <ListaEditavel
          itens={estado.fontes ?? []}
          caminho="fontes"
          editavel={editavel}
          ops={ops}
          rotuloNovo="Nova fonte"
          campos={[
            { chave: "nome", rotulo: "Nome" },
            { chave: "quem", rotulo: "Quem é" },
            { chave: "estrelas", rotulo: "★", tipo: "numero" },
            { chave: "poder", rotulo: "Poder", tipo: "select", opcoes: PODERES },
            { chave: "estado", rotulo: "Estado" },
          ]}
          render={(f) => (
            <div>
              <b>{f.nome}</b> {"★".repeat(contarEstrelas(f.estrelas) ?? 0)} · {f.quem} · <span className="detalhe">{f.estado}</span>
            </div>
          )}
        />
      </Secao>

      <Secao titulo={`Programação ${gradeCompleta ? "· grade completa ✔" : ""}`} emoji="📻">
        <div className="grid gap-1">
          {FAIXAS.map(([k, rot], i) => (
            <label key={k} className="cartao-claro flex items-center gap-2">
              <input type="checkbox" className="h-6 w-6" disabled={!editavel} checked={!!grade[k]} onChange={(e) => ops([{ op: "definir", caminho: `grade.${k}`, valor: e.target.checked }], `Grade: ${rot} ${e.target.checked ? "✔" : "✘"}`)} />
              <b>{rot}</b> · {T.grade.linhas[i][1]} — <span className="text-sm">{T.grade.linhas[i][2]}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 font-bold">
          Especiais desta semana: {(estado.especiais_semana ?? []).length}/{progMax}
        </div>
        <div className="mt-1 grid gap-1">
          {T.prog.linhas.map((l) => (
            <div key={l[0]} className="cartao-claro flex items-center justify-between gap-2">
              <span>
                <b>{l[0]}</b> · precisa: {l[1]} · <span className="detalhe">{l[2]}</span>
              </span>
              {editavel && (
                <button className="btn btn-mini" disabled={(estado.especiais_semana ?? []).length >= progMax} onClick={() => ops([{ op: "lista_add", caminho: "especiais_semana", item: l[0] }], `Especial no ar: ${l[0]} (${l[2]})`)}>
                  No ar
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 text-xs opacity-80">Os efeitos do especial você lança com as ferramentas (marcas e relógios).</div>
      </Secao>

      <Secao titulo="Relógios e bastidores" emoji="⏰">
        <RolarTabela cfg={cfg} tabela="bast" />
      </Secao>

      <Secao titulo="Ligações com a cidade" emoji="🔗" aberta={false}>
        <Ligacoes cfg={cfg} estado={estado} editavel={editavel} bloqueadas={gradeCompleta ? [] : ["radio-grade-completa"]} />
        {!gradeCompleta && <div className="mt-1 text-sm">A ligação “Grade completa” só vale com as 5 faixas marcadas.</div>}
      </Secao>

      <Secao titulo="Outras ações" emoji="🎻" aberta={false}>
        <div className="grid gap-2">
          {T.acoes.linhas.map((l) => (
            <div key={l[0]} className="cartao-claro">
              <b>{l[0]}</b> · {l[1]} → <span className="detalhe">{l[2]}</span>
            </div>
          ))}
          <TesteBox cfg={cfg} rotulo="Gravar música (Atuação)" bonusInicial={B["Atuação"] ?? 0} cdInicial={10} tabelaResultado="__nenhuma" />
          <TesteBox cfg={cfg} rotulo="Abrir Sinal (Persuasão ou Investigação)" bonusInicial={B["Persuasão"] ?? 0} cdInicial={10} tabelaResultado="__nenhuma" />
          <TesteBox cfg={cfg} rotulo="Distribuir aparelhos (Persuasão)" bonusInicial={B["Persuasão"] ?? 0} cdInicial={10} tabelaResultado="__nenhuma" />
        </div>
        <div className="mt-1 text-xs opacity-80">CDs: Gravar música = CD do músico (tabela de músicos); Abrir Sinal = 10 + 2 × Sinal da zona; Distribuir = 10 + 2 × Influência no poder.</div>
        <details className="mt-1">
          <summary className="text-sm">Bônus da Mandy</summary>
          Persuasão +{B["Persuasão"]} · Intuição +{B["Intuição"]} · Atuação +{B["Atuação"]}
        </details>
      </Secao>
    </>
  );
}
