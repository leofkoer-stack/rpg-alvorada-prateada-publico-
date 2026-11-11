"use client";
import { useState } from "react";
import type { Ctx, FrenteConfig } from "@/frentes/tipos";
import { niveisCulto, dadosDoEstagio, estagioDoCulto } from "@/frentes/culto";
import { somaRaizes, podeSubirComunhao, testeLealdade, cdCisma } from "@/motor/culto";
import { useFrenteAcoes } from "../contexto";
import { Secao, TabelaView, Linha, ADefinir, Proposta } from "../ui";
import { Ficha, GradeZonas } from "../ficha";
import { RolarTabela, TesteBox } from "../rolagens";
import { ListaEditavel } from "../listas";

const bonusTexto = (b: any) => (b == null ? null : typeof b === "object" ? Object.entries(b).map(([k, v]) => `${k} +${v}`).join(" · ") : String(b));

export function PainelCulto({ cfg, estado, ctx, editavel }: { cfg: FrenteConfig; estado: any; ctx: Ctx; editavel: boolean }) {
  const { ops, rolarLivre } = useFrenteAcoes(cfg.id);
  const T = cfg.regras.tabelas;
  const n = niveisCulto(estado);
  const E = estagioDoCulto(estado);
  const d = dadosDoEstagio(estado);
  const [lider, setLider] = useState(0);
  const [obra, setObra] = useState(T.obras.linhas[0][0]);
  const [pericia, setPericia] = useState("");
  const [cdBase, setCdBase] = useState("12");
  const [leal, setLeal] = useState<any>(null);
  const lideres: any[] = estado.lideres ?? [];
  const L = lideres[lider];
  const bonusObj = L?.bonus && typeof L.bonus === "object" ? L.bonus : null;
  const bonusNum = bonusObj ? (bonusObj[pericia] ?? 0) : typeof L?.bonus === "number" ? L.bonus : 0;
  const obrasFeitas: any[] = estado.semanal?.obras ?? [];
  const liderJaFez = obrasFeitas.some((o) => o.lider === L?.nome);
  const sub = podeSubirComunhao(T.com, estado.comunhao ?? 1, estado.proposito ?? 0, estado.provacoes_cumpridas ?? [], d.comunhaoMax);
  const simonVant = !!estado.semanal?.simon_vantagem;

  return (
    <>
      <Secao titulo="Estágio do culto" emoji="🩸">
        <div className="cartao-claro">
          <div className="text-2xl font-extrabold">
            {E} · {cfg.nomeEstagio(E)}
          </div>
          <div className="text-sm">
            (2 × Fiéis <b>{n.fieis}</b> + 3 × Raízes <b>{n.raizes}</b> + Tesouro <b>{n.tesouro}</b>) ÷ 6, mínimo 1
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
            <span>🎲 Coro <b>{d.coro}</b></span>
            <span>📈 Escala da CD <b>+{d.escala}</b></span>
            <span>⛪ Obras/sem <b>{d.obras}</b></span>
            <span>💰 Renda <b>+{d.renda}</b></span>
            <span>🧾 Manut. <b>{d.manutencao}</b></span>
            <span>🫂 Comunhão máx <b>{d.comunhaoMax}</b></span>
            <span>👁️ Revelação mín <b>{d.revelacaoMin}</b></span>
            <span>🧭 Líderes regionais <b>{d.lideresRegionais}</b></span>
            <span>🙏 Captação <b>×{d.captacao}</b></span>
          </div>
          <details className="mt-1">
            <summary className="text-sm">ver tabelas de nível e estágio</summary>
            <TabelaView t={T.niv} />
            <TabelaView t={T.est} destaque={E - 1} />
          </details>
        </div>
        {editavel && (
          <button
            className="btn mt-2"
            onClick={() => {
              const tes = (estado.tesouro_recursos ?? 0) + d.renda;
              if (tes >= d.manutencao)
                return ops([{ op: "contador", caminho: "tesouro_recursos", delta: d.renda - d.manutencao }], `Renda +${d.renda} e manutenção −${d.manutencao} Recursos`);
              return ops([{ op: "contador", caminho: "tesouro_recursos", delta: d.renda }, { op: "escala", caminho: "fe", delta: -1 }], `Renda +${d.renda}; sem pagar a manutenção (${d.manutencao}): Fé −1`);
            }}
          >
            💰 Receber renda e pagar manutenção
          </button>
        )}
      </Secao>

      <Secao titulo="Medidas" emoji="📊">
        <Ficha cfg={cfg} estado={estado} ctx={ctx} editavel={editavel} mestre={false} />
        <div className="mt-2 text-sm opacity-80">1 Recurso = 50 PO <Proposta /> (a avaliar)</div>
      </Secao>

      <Secao titulo={`Raízes · soma ${somaRaizes(estado.raizes_por_zona)}`} emoji="🌱" aberta={false}>
        <GradeZonas cfg={cfg} padrao="raizes_por_zona.*" estado={estado} ctx={ctx} editavel={editavel} />
        <details className="mt-2">
          <summary className="text-sm">ver tabela de Raízes</summary>
          <TabelaView t={T.raiz} />
        </details>
      </Secao>

      <Secao titulo="Comunhão e Provações" emoji="🫂" aberta={false}>
        <Linha rotulo="Comunhão" emoji="🫂">
          grau <b>{estado.comunhao}</b> · Propósito <b>{estado.proposito}</b>
        </Linha>
        {editavel && (
          <button
            className="btn mt-2"
            disabled={!sub.pode}
            onClick={() => ops([{ op: "escala", caminho: "comunhao", delta: 1 }, { op: "contador", caminho: "proposito", delta: -sub.custo }], `Comunhão sobe para ${(estado.comunhao ?? 1) + 1} (−${sub.custo} Propósito)`)}
          >
            ⬆️ Subir Comunhão {sub.pode ? `(custa ${sub.custo})` : `· ${sub.motivo}`}
          </button>
        )}
        <div className="mt-2 grid gap-1">
          {T.prov.linhas.map((l) => {
            const feita = (estado.provacoes_cumpridas ?? []).includes(l[0]);
            return (
              <label key={l[0]} className="cartao-claro flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-6 w-6"
                  disabled={!editavel}
                  checked={feita}
                  onChange={(e) =>
                    ops(
                      [{ op: "definir", caminho: "provacoes_cumpridas", valor: e.target.checked ? [...(estado.provacoes_cumpridas ?? []), l[0]] : (estado.provacoes_cumpridas ?? []).filter((x: string) => x !== l[0]) }],
                      `Provação ${l[0]} ${e.target.checked ? "cumprida" : "desmarcada"}`,
                    )
                  }
                />
                <span>
                  <b>Grau {l[0]} · {l[1]}</b> — {l[2]} <span className="detalhe">Recompensa: {l[3]}</span>
                </span>
              </label>
            );
          })}
        </div>
        <details className="mt-2">
          <summary className="text-sm">ver tabela de Comunhão</summary>
          <TabelaView t={T.com} destaque={(estado.comunhao ?? 1) - 1} />
        </details>
      </Secao>

      <Secao titulo="Líderes" emoji="🧑‍🤝‍🧑">
        <ListaEditavel
          itens={lideres}
          caminho="lideres"
          editavel={editavel}
          ops={ops}
          rotuloNovo="Novo líder"
          campos={[
            { chave: "nome", rotulo: "Nome" },
            { chave: "bonus", rotulo: "Bônus (número)", tipo: "numero" },
            { chave: "lealdade", rotulo: "Lealdade", tipo: "numero" },
            { chave: "nota", rotulo: "Nota" },
          ]}
          render={(it) => (
            <div>
              <b className="text-lg">{it.nome}</b> {it.proposta && <Proposta />}
              <div className="text-sm">
                Bônus: {bonusTexto(it.bonus) ?? <ADefinir />} · Lealdade: {it.lealdade ?? <ADefinir />}
                {it.vidas != null && (
                  <>
                    {" "}
                    · ❤️‍🩹 Vidas <b>{it.vidas}</b>/{it.vidas_max}
                  </>
                )}
              </div>
              {it.nota && <div className="text-xs opacity-80">{it.nota}</div>}
            </div>
          )}
          acoesItem={(it, i) =>
            editavel ? (
              <>
                {it.lealdade != null && (
                  <button
                    className="btn btn-mini"
                    onClick={async () => {
                      const r = await rolarLivre("1d20", `Teste de Lealdade de ${it.nome}`);
                      const t = testeLealdade(r.rolagem.total, it.lealdade, estado.comunhao ?? 1);
                      setLeal({ nome: it.nome, d20: r.rolagem.total, ...t });
                      const o: any[] = [];
                      if (t.falhaPor10) o.push({ op: "definir", caminho: "semanal.lealdade_falha10", valor: true });
                      if (!t.passou) o.push({ op: "contador", caminho: "semanal.obras_perdidas", delta: 1 });
                      if (o.length) await ops(o, `${it.nome} falhou a Lealdade (${r.rolagem.total} > ${t.alvo})${t.falhaPor10 ? ": falha por 10+, Cisma" : ": menos uma Obra"}`);
                    }}
                  >
                    🎲 Lealdade
                  </button>
                )}
                <button className="btn btn-mini btn-sec" onClick={() => ops([{ op: "escala", caminho: `lideres.${i}.lealdade`, delta: -1 }], `Lealdade de ${it.nome} −1`)}>Leal −1</button>
                <button className="btn btn-mini btn-sec" onClick={() => ops([{ op: "escala", caminho: `lideres.${i}.lealdade`, delta: 1 }], `Lealdade de ${it.nome} +1`)}>Leal +1</button>
                {it.vidas != null && (
                  <button className="btn btn-mini btn-sec" onClick={() => ops([{ op: "escala", caminho: `lideres.${i}.vidas`, delta: -1 }], `${it.nome} morreu e voltou: −1 vida`)}>
                    −1 vida
                  </button>
                )}
              </>
            ) : null
          }
        />
        {leal && (
          <div className="cartao-claro mt-2 border-2" style={{ borderColor: "var(--det)" }}>
            {leal.nome}: d20 <b>{leal.d20}</b> ≤ {leal.alvo}? <b>{leal.passou ? "Mantém a linha ✔" : leal.falhaPor10 ? "Falha por 10+: Cisma!" : "Falha: menos uma Obra"}</b>
          </div>
        )}
      </Secao>

      <Secao titulo={`Obras · ${obrasFeitas.length}/${Math.max(0, d.obras - (estado.semanal?.obras_perdidas ?? 0))} nesta semana`} emoji="⛪">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm">
            Obra
            <select className="entrada w-full" value={obra} onChange={(e) => setObra(e.target.value)}>
              {T.obras.linhas.map((l) => (
                <option key={l[0]}>{l[0]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Líder
            <select className="entrada w-full" value={lider} onChange={(e) => setLider(Number(e.target.value))}>
              {lideres.map((l, i) => (
                <option key={i} value={i}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>
          {bonusObj && (
            <label className="text-sm">
              Perícia
              <select className="entrada w-full" value={pericia} onChange={(e) => setPericia(e.target.value)}>
                <option value="">—</option>
                {Object.keys(bonusObj).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm">
            CD base (antes da Escala)
            <input className="entrada w-full" inputMode="numeric" value={cdBase} onChange={(e) => setCdBase(e.target.value)} />
          </label>
        </div>
        <div className="mt-1 text-sm">
          {T.obras.linhas.find((l) => l[0] === obra)?.[1]} · bônus do líder <b>{bonusNum}</b> + Comunhão <b>{estado.comunhao}</b> + Coro <b>{d.coro}</b> vs CD <b>{(Number(cdBase) || 0) + d.escala}</b>
          {liderJaFez && <div className="text-red-300">⚠️ {L?.nome} já liderou uma Obra nesta semana.</div>}
        </div>
        <details className="text-sm">
          <summary>vantagem e desvantagem</summary>
          <TabelaView t={T.van} />
        </details>
        <TesteBox
          key={`${lider}-${pericia}-${cdBase}-${obra}`}
          cfg={cfg}
          rotulo={`Obra: ${obra} (${L?.nome ?? "?"})`}
          bonusInicial={bonusNum + (estado.comunhao ?? 1)}
          cdInicial={(Number(cdBase) || 0) + d.escala}
          extrasIniciais={d.coro}
          modoInicial={L?.nome === "Simon" && !simonVant ? "vantagem" : "normal"}
          onResultado={(r) => {
            const o: any[] = [{ op: "lista_add", caminho: "semanal.obras", item: { lider: L?.nome, obra, classe: r.rolagem.classe } }];
            if (r.rolagem.modo === "vantagem" && L?.nome === "Simon") o.push({ op: "definir", caminho: "semanal.simon_vantagem", valor: true });
            ops(o, `Obra ${obra} com ${L?.nome}`);
          }}
        />
        <div className="mt-1 text-xs opacity-80">Com o Simon presente, 1 Obra com vantagem. 1 natural numa Obra: role a Complicação.</div>
      </Secao>

      <Secao titulo="Passos da semana" emoji="🎲">
        <div className="grid gap-2">
          <RolarTabela cfg={cfg} tabela="hum" />
          <RolarTabela cfg={cfg} tabela="d100" />
          <RolarTabela cfg={cfg} tabela="d20" />
          <RolarTabela cfg={cfg} tabela="mar" />
          <div className="cartao-claro">
            <div className="font-bold">⚠️ Cisma</div>
            <div className="text-sm">
              Quando: Fé ≤ 2 ({estado.fe}) ou Lealdade falhada por 10+ ({estado.semanal?.lealdade_falha10 ? "sim" : "não"}). Teste: d20 + Fé + Comunhão vs CD {cdCisma(E)}. Falha: role o d8.
            </div>
            <TesteBox cfg={cfg} rotulo="Teste de Cisma" bonusInicial={(estado.fe ?? 0) + (estado.comunhao ?? 1)} cdInicial={cdCisma(E)} travado />
            <div className="mt-2">
              <RolarTabela cfg={cfg} tabela="d8" compacto />
            </div>
          </div>
          <RolarTabela cfg={cfg} tabela="d10" />
        </div>
      </Secao>

      <Secao titulo="Projetos e itens" emoji="🏗️" aberta={false}>
        <ListaEditavel
          itens={estado.projetos ?? []}
          caminho="projetos"
          editavel={editavel}
          ops={ops}
          rotuloNovo="Começar projeto"
          novoPadrao={{ status: "ativo" }}
          campos={[
            { chave: "nome", rotulo: "Projeto", tipo: "select", opcoes: T.proj.linhas.map((l) => l[0]) },
            { chave: "semanas_restantes", rotulo: "Semanas restantes", tipo: "numero" },
            { chave: "status", rotulo: "Status", tipo: "select", opcoes: ["ativo", "concluido"] },
          ]}
        />
        <div className="mt-2" />
        <ListaEditavel itens={estado.itens ?? []} caminho="itens" editavel={editavel} ops={ops} rotuloNovo="Novo item" campos={[{ chave: "nome", rotulo: "Item", tipo: "select", opcoes: T.iten.linhas.map((l) => l[0]) }, { chave: "qtd", rotulo: "Quantidade", tipo: "numero" }]} />
      </Secao>
    </>
  );
}
