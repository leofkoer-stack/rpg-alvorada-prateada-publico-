"use client";
import { useState } from "react";
import { frente } from "@/frentes";
import { PROJETOS, ROTULOS_CIDADE } from "@/frentes/cidade";
import { cdAcaoCidade, custoPorNivel, escalarTexto, lerCustoPrazo, limiteAcoesCidade, manutencaoObra, rendaBase } from "@/motor/cidade";
import { linhaDoResultado, ROTULO_CLASSE } from "@/motor/teste";
import { useFrenteAcoes } from "./contexto";
import { TabelaView, ADefinir, Linha } from "./ui";
import { RolarTabela, TesteBox } from "./rolagens";

const cfg = () => frente("cidade");

/** Ações da cidade (tabela acoes): condutor, CD 10 + 2 × nível, custo do cofre, resultado `resa`. */
export function AcoesCidade({ cidade, ctx }: { cidade: any; ctx: any }) {
  const C = cfg();
  const T = C.regras.tabelas;
  const { ops } = useFrenteAcoes("cidade");
  const [acao, setAcao] = useState(T.acoes.linhas[0][0]);
  const [quem, setQuem] = useState("Alberon");
  const [bonus, setBonus] = useState("5");
  const [res, setRes] = useState<any>(null);
  const [proj, setProj] = useState(T.proj.linhas[5][0]);
  const E = cidade.estagio ?? 0;
  const limite = limiteAcoesCidade(T.est, E, !!cidade.pjs_em_draetyr);
  const feitas: any[] = cidade.acoes_semana ?? [];
  const L = T.acoes.linhas.find((l) => l[0] === acao)!;
  const chave = Object.entries(ROTULOS_CIDADE).find(([, r]) => L[1].includes(r.rotulo))?.[0];
  const nivel = chave ? cidade.frentes[chave].nivel : 0;
  const custo = custoPorNivel(L[3], nivel);
  const cd = cdAcaoCidade(nivel);
  const g = cidade.governo;
  const concl = (n: string) => (cidade.projetos ?? []).some((p: any) => p.nome === n && p.status === "concluido");
  const vant =
    (acao === "Articular" && (g === "lorde_aliado" || concl("Reabrir a biblioteca ao público"))) ||
    (acao === "Divulgar" && concl("Torre de rádio e gravadora")) ||
    (acao === "Organizar o comércio" && concl("Banco")) ||
    (acao === "Organizar a defesa" && concl("Guarda da cidade"));
  const desv = acao === "Articular" && g === "lorde_hostil";
  const jaConduziu = feitas.some((f) => f.quem === quem);

  const aplicar = () => {
    const c = res.classe as string;
    const o: any[] = [{ op: "lista_add", caminho: "acoes_semana", item: { acao, quem, classe: c } }];
    if (custo) o.push({ op: "contador", caminho: "cofre_po", delta: -custo });
    if (chave) {
      const m = c === "sucesso5" || c === "nat20" ? 2 : c === "sucesso" ? 1 : c === "falha5" ? -1 : 0;
      if (m) o.push({ op: "marcas", caminho: `frentes.${chave}`, delta: m });
    }
    if (c === "nat20" && custo) o.push({ op: "contador", caminho: "cofre_po", delta: custo });
    if (acao === "Articular" && c === "falha5") o.push({ op: "relogio", caminho: "relogios.desconfianca_da_capital", delta: 1 });
    if (acao === "Articular" && c === "sucesso5") o.push({ op: "relogio", caminho: "relogios.desconfianca_da_capital", delta: -1 });
    if (acao === "Organizar a defesa" && c === "sucesso5") o.push({ op: "relogio", caminho: "relogios.oposicao", delta: -1 });
    return ops(o, `Ação da cidade: ${acao} (${quem}) → ${ROTULO_CLASSE[c as keyof typeof ROTULO_CLASSE]}`);
  };

  return (
    <div className="grid gap-2">
      <div className="cartao-claro">
        Ações nesta semana: <b>{feitas.length}</b>/<b>{limite}</b> {!cidade.pjs_em_draetyr && "(sem PJs em Draetyr: uma a menos)"}
        <ul className="text-sm">
          {feitas.map((f, i) => (
            <li key={i}>
              • {f.acao} · {f.quem} · {ROTULO_CLASSE[f.classe as keyof typeof ROTULO_CLASSE] ?? f.classe}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm">
          Ação
          <select className="entrada w-full" value={acao} onChange={(e) => { setAcao(e.target.value); setRes(null); }}>
            {T.acoes.linhas.filter((l) => l[0] !== "Começar uma obra").map((l) => (
              <option key={l[0]}>{l[0]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Quem conduz
          <input className="entrada w-full" value={quem} onChange={(e) => setQuem(e.target.value)} />
        </label>
        <label className="text-sm">
          Bônus da perícia
          <input className="entrada w-full" inputMode="numeric" value={bonus} onChange={(e) => setBonus(e.target.value)} />
        </label>
      </div>
      <div className="text-sm">
        {L[1]} · perícia: {L[2]} · nível atual <b>{nivel}</b> · CD <b>{cd}</b> · custo <b>{custo ?? L[3]} PO</b>
        {vant && <b> · com vantagem</b>}
        {desv && <b> · com desvantagem</b>}
        {jaConduziu && <div className="text-red-300">⚠️ {quem} já conduziu uma ação nesta semana.</div>}
        {feitas.length >= limite && <div className="text-red-300">⚠️ Limite de ações da semana atingido.</div>}
        {custo != null && cidade.cofre_po != null && cidade.cofre_po < custo && <div className="text-red-300">⚠️ O cofre não tem {custo} PO.</div>}
      </div>
      <TesteBox key={acao + quem + bonus + cd + vant + desv} cfg={C} rotulo={`${acao} (${quem})`} bonusInicial={Number(bonus) || 0} cdInicial={cd} modoInicial={vant ? "vantagem" : desv ? "desvantagem" : "normal"} tabelaResultado="resa" onResultado={(r) => setRes(r.rolagem)} />
      {res && (
        <button className="btn" onClick={() => aplicar().then(() => setRes(null))}>
          Aplicar: {ROTULO_CLASSE[res.classe as keyof typeof ROTULO_CLASSE]} · {linhaDoResultado(T.resa, res.classe)?.[1]}
        </button>
      )}
      {res?.classe === "nat1" && <div className="text-sm">1 natural: avance um relógio de ameaça (você escolhe) na seção de relógios.</div>}

      <div className="cartao-claro mt-2">
        <b>🏗️ Começar uma obra</b> (sem teste; o custo sai do cofre)
        <div className="mt-1 flex flex-wrap gap-2">
          <select className="entrada" value={proj} onChange={(e) => setProj(e.target.value)}>
            {T.proj.linhas.map((l) => (
              <option key={l[0]}>{l[0]}</option>
            ))}
          </select>
          <button
            className="btn"
            onClick={() => {
              const l = T.proj.linhas.find((x) => x[0] === proj)!;
              const { custo: c, semanas } = lerCustoPrazo(l[2]);
              const o: any[] = [{ op: "lista_add", caminho: "projetos", item: { nome: proj, custo: c, semanas_restantes: semanas, status: "ativo", tipo: semanas ? "obra" : l[2] } }];
              if (c) o.push({ op: "contador", caminho: "cofre_po", delta: -c });
              ops(o, `Obra começada: ${proj}${c ? ` (−${c.toLocaleString("pt-BR")} PO)` : ` (${l[2]})`}`);
            }}
          >
            Começar
          </button>
        </div>
      </div>
      <details>
        <summary className="text-sm">ver tabelas de ações e resultado</summary>
        <TabelaView t={T.acoes} />
        <TabelaView t={T.resa} />
      </details>
    </div>
  );
}

export function Cofres({ cidade, guilda }: { cidade: any; guilda: any }) {
  const C = cfg();
  const { ops } = useFrenteAcoes("cidade");
  const og = useFrenteAcoes("guilda");
  const E = cidade.estagio ?? 0;
  const renda = rendaBase(C.regras.tabelas.est, E);
  const obras = (cidade.projetos ?? []).filter((p: any) => p.status === "concluido");
  const manut = obras.reduce((s: number, p: any) => s + manutencaoObra(p.custo) + (PROJETOS[p.nome]?.manutencaoExtra ?? 0), 0);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="cartao-claro">
        <b>🪙 Cofre da cidade</b>: {cidade.cofre_po == null ? <ADefinir /> : <b>{cidade.cofre_po.toLocaleString("pt-BR")} PO</b>}
        <div className="text-sm">
          Renda base do Estágio {E}: <b>{renda} PO</b> · manutenção das obras: <b>{manut} PO</b>
        </div>
        <button
          className="btn mt-2"
          disabled={cidade.cofre_po == null}
          onClick={() => {
            const saldo = (cidade.cofre_po ?? 0) + renda;
            if (saldo >= manut) return ops([{ op: "contador", caminho: "cofre_po", delta: renda - manut }], `Cofre: renda +${renda}, manutenção −${manut} PO`);
            return ops([{ op: "contador", caminho: "cofre_po", delta: renda }, { op: "marcas", caminho: "frentes.moral", delta: -1 }], `Cofre: renda +${renda}; sem pagar a manutenção (${manut} PO): Moral −1 marca`);
          }}
        >
          Receber renda e pagar manutenção
        </button>
      </div>
      <div className="cartao-claro">
        <b>🛡️ Guilda</b>: 💎 {guilda.cofre_pl?.toLocaleString("pt-BR")} PL · disponível {guilda.cofre_pl_disponivel == null ? <ADefinir /> : `${guilda.cofre_pl_disponivel.toLocaleString("pt-BR")} PL`} · 🪙 {guilda.cofre_po == null ? <ADefinir /> : `${guilda.cofre_po} PO`}
        <div className="text-sm">
          Taxa de <b>{guilda.taxa_percentual}%</b> das recompensas · manutenção <b>{guilda.manutencao_po_semana} PO</b>/semana
        </div>
        <button className="btn mt-2" disabled={guilda.cofre_po == null} onClick={() => og.ops([{ op: "contador", caminho: "cofre_po", delta: -guilda.manutencao_po_semana }], `Guilda: manutenção −${guilda.manutencao_po_semana} PO`)}>
          Pagar manutenção da guilda
        </button>
      </div>
    </div>
  );
}

export function Projetos({ cidade }: { cidade: any }) {
  const C = cfg();
  const T = C.regras.tabelas;
  const { ops } = useFrenteAcoes("cidade");
  const lista: any[] = cidade.projetos ?? [];
  return (
    <div className="grid gap-2">
      {lista.map((p, i) => (
        <div key={i} className="cartao-claro">
          <b>{p.nome}</b> · <span className="selo">{p.status === "concluido" ? "concluído" : "ativo"}</span> {p.semanas_restantes != null && p.status !== "concluido" && `· faltam ${p.semanas_restantes} semana(s)`}
          {p.custo ? ` · ${p.custo.toLocaleString("pt-BR")} PO (manutenção ${manutencaoObra(p.custo) + (PROJETOS[p.nome]?.manutencaoExtra ?? 0)} PO/sem.)` : ""}
          {p.status !== "concluido" && (
            <button
              className="btn btn-mini ml-2"
              onClick={() => {
                const def = PROJETOS[p.nome];
                const o: any[] = [{ op: "lista_set", caminho: "projetos", indice: i, item: { ...p, status: "concluido", semanas_restantes: 0 } }];
                for (const e of def?.efeitos ?? []) {
                  const k = e.alvo.split(".")[1];
                  if (e.marcas) o.push({ op: "marcas", caminho: `frentes.${k}`, delta: e.marcas });
                  if (e.niveis) o.push({ op: "nivel", caminho: `frentes.${k}`, delta: e.niveis });
                }
                ops(o, `Projeto concluído à mão: ${p.nome}`);
              }}
            >
              Concluir agora
            </button>
          )}
        </div>
      ))}
      {!lista.length && <div className="opacity-70">Nenhum projeto ainda. Comece uma obra na aba Ações.</div>}
      <details>
        <summary className="text-sm">catálogo de projetos</summary>
        <TabelaView t={T.proj} />
      </details>
      <div className="text-xs opacity-80">Os projetos “do jogador” são concluídos pelas ligações das frentes (seção 8).</div>
    </div>
  );
}

export function EventoSemana({ cidade }: { cidade: any }) {
  const C = cfg();
  const [r, setR] = useState<any>(null);
  const E = cidade.estagio ?? 0;
  return (
    <div className="grid gap-2">
      <RolarTabela cfg={C} tabela="d100" onResultado={setR} />
      {r?.rolagem?.linha && (
        <div className="cartao-claro">
          <div className="text-lg font-bold">
            {r.rolagem.linha[1]} · {r.rolagem.linha[2]}
          </div>
          <div>{escalarTexto(r.rolagem.linha[3], E)}</div>
          {E >= 3 && <div className="text-sm detalhe">Estágio 3+: ganhos e perdas de marcas deste evento valem 1 marca a mais.</div>}
          <div className="text-xs opacity-80">Aplique os efeitos com as ferramentas (marcas, relógios, cofre).</div>
        </div>
      )}
    </div>
  );
}

export { Linha };
