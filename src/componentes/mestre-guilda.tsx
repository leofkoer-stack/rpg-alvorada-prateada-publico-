"use client";
import { useState } from "react";
import { frente } from "@/frentes";
import { bonusRank, RANKS } from "@/frentes/guilda";
import { ROTULOS_CIDADE } from "@/frentes/cidade";
import { lerCustoPrazo } from "@/motor/cidade";
import { ROTULO_CLASSE } from "@/motor/teste";
import { useFrenteAcoes } from "./contexto";
import { TabelaView, ADefinir } from "./ui";
import { RolarTabela, TesteBox } from "./rolagens";
import { ListaEditavel } from "./listas";

const frenteDaMissao = (txt: string) => Object.entries(ROTULOS_CIDADE).find(([, r]) => txt?.includes(r.rotulo))?.[0];
const idxRank = (r: string | null | undefined) => (r ? RANKS.findIndex((x) => x.toLowerCase().startsWith(r.toLowerCase().slice(0, 4))) : -1);
/** Instalação que combina com o tipo da missão dá sede +2 (tabela inst). */
const sedeCombina = (inst: string, tipo: string) =>
  (inst.startsWith("Arsenal") && /Caça a monstro|Proteção/.test(tipo)) || (inst.startsWith("Sala de mapas") && /Exploração|Investigação/.test(tipo));

export function PainelGuilda({ guilda, cidade, semana }: { guilda: any; cidade: any; semana: number }) {
  const C = frente("guilda");
  const T = C.regras.tabelas;
  const { ops, rolarTabela, rolarLivre } = useFrenteAcoes("guilda");
  const oc = useFrenteAcoes("cidade");
  const not = cidade.frentes.notoriedade.nivel;
  const eco = cidade.frentes.economia.nivel;
  const E = cidade.estagio ?? 0;
  const dadoQuadro = frente("cidade").regras.tabelas.est.linhas[E][3];
  const [inst, setInst] = useState(T.inst.linhas[0][0]);
  const [res, setRes] = useState<Record<string, any>>({});
  const [apoio, setApoio] = useState<Record<string, boolean>>({});

  async function gerarMissao() {
    const alc = await rolarTabela("alc");
    let alcance = alc.rolagem.linha?.[1];
    let mult = 1;
    if (alc.rolagem.total === 6) {
      if (not >= 3) mult = 2;
      else alcance = "Regional (missão de ouro só com Notoriedade 3+)";
    }
    const mp = await rolarTabela("mp");
    const tipo = (await rolarTabela("tipo")).rolagem.linha ?? [];
    const det = (await rolarTabela("det")).rolagem.linha?.[1] ?? "";
    let cd = Number(mp.rolagem.linha?.[2]) || 12;
    if (/CD \+2/.test(det)) cd += 2;
    if (/×1,5/.test(det)) mult *= 1.5;
    const local = String(alcance).startsWith("Local");
    await ops(
      [
        {
          op: "lista_add",
          caminho: "quadro",
          item: {
            id: `m${Date.now().toString(36)}`,
            estado: "aberta",
            alcance,
            patamar: mp.rolagem.linha?.[0],
            cd,
            recompensa: mp.rolagem.linha?.[3],
            mult,
            tipo: tipo[1],
            frente: tipo[2],
            detalhe: det,
            especie: local && eco <= 1,
          },
        },
      ],
      `Missão nova: ${tipo[1]} (${mp.rolagem.linha?.[0]}, CD ${cd})`,
    );
  }

  async function aplicarMissao(m: any, i: number, classe: string, grupoIdx: number) {
    const g = guilda.elenco[grupoIdx];
    const k = frenteDaMissao(m.frente);
    const o: any[] = [{ op: "lista_set", caminho: "quadro", indice: i, item: { ...m, estado: "resolvida", resultado: classe, grupo: g?.grupo } }];
    let valor = 0;
    const ganha = ["sucesso", "sucesso5", "nat20", "falha"].includes(classe);
    if (ganha && !m.especie) {
      const r = await rolarLivre(String(m.recompensa).replace(/PO/, ""), `Recompensa: ${m.tipo}`);
      valor = Math.round(r.rolagem.total * (m.mult ?? 1) * (classe === "falha" ? 0.5 : 1));
    }
    if (classe === "sucesso5" || classe === "nat20") {
      const a = await rolarTabela("ach");
      if (a.rolagem.total <= 3) valor = Math.round(valor * 1.5);
      if (a.rolagem.total === 6) await oc.ops([{ op: "marcas", caminho: "frentes.rotas", delta: 1 }], "Achado: +1 marca em Rotas (contato novo)");
    }
    const taxa = Math.round((valor * (guilda.taxa_percentual ?? 20)) / 100);
    if (taxa) o.push({ op: "contador", caminho: "cofre_po", delta: taxa });
    if (g && (classe === "falha" || classe === "falha5")) {
      const sem = classe === "falha" ? 1 : 2;
      o.push({ op: "lista_set", caminho: "elenco", indice: grupoIdx, item: { ...g, estado: "ferido", ferido_ate: semana + sem } });
    }
    if (guilda.bonus_proxima_missao?.length) o.push({ op: "definir", caminho: "bonus_proxima_missao", valor: [] });
    await ops(o, `Missão ${m.tipo}: ${ROTULO_CLASSE[classe as keyof typeof ROTULO_CLASSE]} · recompensa ${valor} PO (taxa ${taxa} PO para a guilda)`);
    if (k) {
      const marcas = classe === "sucesso5" || classe === "nat20" ? 2 : classe === "sucesso" ? 1 : classe === "falha5" ? -1 : 0;
      if (marcas) await oc.ops([{ op: "marcas", caminho: `frentes.${k}`, delta: marcas }], `Missão ${m.tipo}: ${marcas > 0 ? "+" : ""}${marcas} marca(s) em ${ROTULOS_CIDADE[k].rotulo}`);
    }
    if (classe === "nat1") await rolarTabela("rev");
  }

  return (
    <div className="grid gap-3">
      <div className="cartao-claro text-sm">
        ⚖️ <b>Regra fixa:</b> morte de NPC <b>nunca</b> vem de rolagem.
      </div>

      <h3 className="text-lg font-bold">👥 Elenco</h3>
      <ListaEditavel
        itens={guilda.elenco ?? []}
        caminho="elenco"
        editavel
        ops={ops}
        rotuloNovo="Novo grupo"
        novoPadrao={{ estado: "livre" }}
        campos={[
          { chave: "grupo", rotulo: "Grupo" },
          { chave: "membros", rotulo: "Membros" },
          { chave: "rank", rotulo: "Rank", tipo: "select", opcoes: RANKS.map((r) => r.toLowerCase()) },
          { chave: "estado", rotulo: "Estado", tipo: "select", opcoes: ["livre", "em missão", "ferido", "fora até uma cena"] },
          { chave: "ferido_ate", rotulo: "Ferido até a semana", tipo: "numero" },
          { chave: "nota", rotulo: "Nota" },
        ]}
        render={(g) => (
          <div>
            <b>{g.grupo}</b> · {g.rank ? <b>{g.rank}</b> : <ADefinir />} {bonusRank(g.rank) != null && `(+${bonusRank(g.rank)})`} · <span className="selo">{g.estado}{g.ferido_ate ? ` até sem. ${g.ferido_ate}` : ""}</span>
            <div className="text-xs opacity-80">{g.membros}</div>
          </div>
        )}
      />
      <details>
        <summary className="text-sm">equipe e ranks</summary>
        <TabelaView t={T.staff} />
        <TabelaView t={T.rk} />
      </details>

      <h3 className="text-lg font-bold">🏛️ Instalações</h3>
      {(guilda.instalacoes ?? []).map((x: any, i: number) => (
        <div key={i} className="cartao-claro">
          <b>{x.nome}</b> · <span className="selo">{x.status}</span> {x.status !== "concluido" && `faltam ${x.semanas_restantes} sem.`}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <select className="entrada" value={inst} onChange={(e) => setInst(e.target.value)}>
          {T.inst.linhas.map((l) => (
            <option key={l[0]}>{l[0]}</option>
          ))}
        </select>
        <button
          className="btn"
          onClick={() => {
            const l = T.inst.linhas.find((x) => x[0] === inst)!;
            const { custo, semanas } = lerCustoPrazo(l[1]);
            const o: any[] = [{ op: "lista_add", caminho: "instalacoes", item: { nome: inst, custo, semanas_restantes: semanas, status: "ativo", efeito: l[2] } }];
            if (custo && guilda.cofre_po != null) o.push({ op: "contador", caminho: "cofre_po", delta: -custo });
            ops(o, `Instalação começada: ${inst}`);
          }}
        >
          Construir
        </button>
      </div>

      <h3 className="text-lg font-bold">📋 Quadro de missões</h3>
      <div className="text-sm">
        Missões por semana no Estágio {E}: <b>{dadoQuadro}</b> · Notoriedade {not} · Economia {eco} {eco <= 1 && "(missão local paga em espécie, favor ou terra)"}
        {guilda.bonus_proxima_missao?.length > 0 && <div>🍲⚒️ Bônus na próxima missão: {guilda.bonus_proxima_missao.map((b: any) => `+${b.bonus} (${b.origem})`).join(", ")}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={() => rolarLivre(dadoQuadro.replace(/\s/g, ""), "Missões no quadro desta semana")}>
          🎲 Quantas missões ({dadoQuadro})
        </button>
        <button className="btn" onClick={gerarMissao}>
          ➕ Gerar uma missão
        </button>
      </div>
      {(guilda.quadro ?? []).map((m: any, i: number) => {
        if (m.estado === "a_gerar")
          return (
            <div key={m.id ?? i} className="cartao-claro">
              📨 Missão vinda de uma frente: {m.origem}
              <button className="btn btn-mini ml-2" onClick={() => ops([{ op: "lista_del", caminho: "quadro", indice: i }], "Missão a gerar removida")}>
                Já gerei
              </button>
            </div>
          );
        const gi = res[m.id]?.grupo ?? 0;
        const g = guilda.elenco?.[gi];
        const rb = bonusRank(g?.rank) ?? 0;
        const sede = (guilda.instalacoes ?? []).some((x: any) => x.status === "concluido" && sedeCombina(x.nome, m.tipo ?? "")) ? 2 : 0;
        const extra = (guilda.bonus_proxima_missao ?? []).reduce((s: number, b: any) => s + (b.bonus ?? 0), 0);
        const ir = idxRank(g?.rank);
        const im = idxRank(String(m.patamar).replace(/^\S+\s/, ""));
        const abaixo = ir >= 0 && im >= 0 && im < ir;
        const doisAcima = ir >= 0 && im >= 0 && im - ir >= 2;
        return (
          <div key={m.id ?? i} className="cartao-claro">
            <b>{m.tipo}</b> · {m.patamar} · CD <b>{m.cd}</b> · {m.alcance} · {m.recompensa}
            {m.mult && m.mult !== 1 ? ` ×${m.mult}` : ""} · {m.frente} {m.especie && <span className="selo">paga em espécie</span>}
            <div className="text-sm detalhe">{m.detalhe}</div>
            <span className="selo">{m.estado}</span> {m.resultado && `· ${ROTULO_CLASSE[m.resultado as keyof typeof ROTULO_CLASSE]} · ${m.grupo}`}
            {m.estado !== "resolvida" && (
              <div className="mt-2 grid gap-2">
                <select className="entrada" value={gi} onChange={(e) => setRes({ ...res, [m.id]: { grupo: Number(e.target.value) } })}>
                  {(guilda.elenco ?? []).map((x: any, j: number) => (
                    <option key={j} value={j}>
                      {x.grupo} ({x.rank ?? "rank a definir"}) · {x.estado}
                    </option>
                  ))}
                </select>
                {g?.pjs ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm">Missão dos PJs: não rola. Marque o resultado:</span>
                    <button className="btn btn-mini" onClick={() => aplicarMissao(m, i, "sucesso", gi)}>Sucesso</button>
                    <button className="btn btn-mini" onClick={() => aplicarMissao(m, i, "sucesso5", gi)}>Sucesso por 5+</button>
                  </div>
                ) : (
                  <>
                    {doisAcima && <div className="text-red-300">⚠️ Dois ranks acima: só os PJs podem pegar.</div>}
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="h-5 w-5" checked={!!apoio[m.id]} onChange={(e) => setApoio({ ...apoio, [m.id]: e.target.checked })} /> apoio (+2)
                    </label>
                    <div className="text-sm">
                      d20 + rank {rb} + sede {sede} + apoio {apoio[m.id] ? 2 : 0} {extra ? `+ bônus ${extra}` : ""} vs CD {m.cd} {abaixo && "· vantagem (abaixo do rank)"}
                    </div>
                    <TesteBox
                      key={`${gi}${apoio[m.id]}${sede}`}
                      cfg={C}
                      rotulo={`Missão: ${m.tipo}`}
                      bonusInicial={rb + sede + (apoio[m.id] ? 2 : 0) + extra}
                      cdInicial={m.cd}
                      modoInicial={abaixo ? "vantagem" : "normal"}
                      tabelaResultado="res"
                      onResultado={(r) => setRes({ ...res, [m.id]: { grupo: gi, classe: r.rolagem.classe } })}
                    />
                    {res[m.id]?.classe && (
                      <button className="btn" onClick={() => aplicarMissao(m, i, res[m.id].classe, gi)}>
                        Aplicar resultado
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      <details>
        <summary className="text-sm">tabelas das missões</summary>
        {["alc", "mp", "tipo", "det", "res", "ach", "rev"].map((t) => (
          <TabelaView key={t} t={T[t]} />
        ))}
      </details>
      <div className="grid gap-2 sm:grid-cols-2">
        <RolarTabela cfg={C} tabela="ach" />
        <RolarTabela cfg={C} tabela="rev" />
      </div>
    </div>
  );
}
