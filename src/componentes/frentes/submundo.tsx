"use client";
import { useState } from "react";
import type { Ctx, FrenteConfig } from "@/frentes/tipos";
import { rolarExpressao } from "@/motor/dados";
import { contarEstrelas } from "@/motor/teste";
import { useFrenteAcoes } from "../contexto";
import { Secao, TabelaView, Proposta } from "../ui";
import { Ficha, GradeZonas, Ligacoes } from "../ficha";
import { RolarTabela, TesteBox } from "../rolagens";
import { ListaEditavel } from "../listas";
import { ZONAS } from "@/frentes/seed";

const PERICIAS: [string, string][] = [
  ["Acrobacia", "DES"], ["Arcanismo", "INT"], ["Atletismo", "FOR"], ["Atuação", "CAR"], ["Enganação", "CAR"], ["Furtividade", "DES"],
  ["História", "INT"], ["Intimidação", "CAR"], ["Intuição", "SAB"], ["Investigação", "INT"], ["Lidar com Animais", "SAB"], ["Medicina", "SAB"],
  ["Natureza", "INT"], ["Percepção", "SAB"], ["Persuasão", "CAR"], ["Prestidigitação", "DES"], ["Religião", "INT"], ["Sobrevivência", "SAB"],
];

/** Respeito trava o nível: 0 → ★, 1 → ★★, 2 → ★★★, 5 → ★★★★★ (tabela resp). 3 e 4: proposta ★★★★. */
const maxEstrelasResp = (r: number) => [1, 2, 3, 4, 4, 5][Math.max(0, Math.min(5, r))];

export function PainelSubmundo({ cfg, estado, ctx, editavel }: { cfg: FrenteConfig; estado: any; ctx: Ctx; editavel: boolean }) {
  const { ops, rolarTabela, rolarLivre } = useFrenteAcoes(cfg.id);
  const T = cfg.regras.tabelas;
  const resp = estado.respeito?.nivel ?? 0;
  const bf = estado.bonus_felnun ?? {};
  const prof: string[] | null = bf.pericias_proficientes;
  const [sel, setSel] = useState<string[]>([]);
  const zonasCel = ZONAS.filter((z) => (estado.rede_por_zona?.[z.id]?.nivel ?? 0) >= 2).length;
  const bonusPericia = (p: string) => {
    const at = PERICIAS.find((x) => x[0] === p)?.[1];
    const base = at ? bf.atributos?.[at] : undefined;
    if (base == null) return null;
    return base + (prof?.includes(p) ? bf.proficiencia ?? 0 : 0);
  };

  async function gerarQuadro() {
    const n = 1 + zonasCel;
    for (let i = 0; i < n; i++) {
      const t = (await rolarTabela("trab")).rolagem.linha ?? [];
      const pt = await rolarTabela("pt");
      let est = contarEstrelas(pt.rolagem.linha?.[0]) ?? 1;
      const trava = maxEstrelasResp(resp);
      if (est > trava) est = trava;
      const f = (await rolarLivre("1d6", "Paga em favor? (1–2)")).rolagem.total;
      const linhaNivel = T.pt.linhas[est - 1];
      await ops(
        [{ op: "lista_add", caminho: "quadro", item: { id: `t${Date.now().toString(36)}${i}`, trabalho: t[1], pericia: t[2], exp: Number(String(t[3]).replace("+", "")) || 0, estrelas: est, cd: Number(linhaNivel[2]), pagamento: linhaNivel[3], favor: f <= 2, estado: "aberto" } }],
        `Trabalho no quadro: ${t[1]} (${"★".repeat(est)})${f <= 2 ? ", paga em 1 favor" : ""}`,
      );
    }
  }

  return (
    <>
      {prof == null && editavel && (
        <Secao titulo="Primeira abertura: perícias proficientes" emoji="✍️">
          <div className="grid grid-cols-2 gap-1 text-sm">
            {PERICIAS.map(([p, a]) => (
              <label key={p} className="flex items-center gap-2">
                <input type="checkbox" className="h-5 w-5" checked={sel.includes(p)} onChange={(e) => setSel(e.target.checked ? [...sel, p] : sel.filter((x) => x !== p))} />
                {p} <span className="opacity-60">({a})</span>
              </label>
            ))}
          </div>
          <button className="btn mt-2" disabled={!sel.length} onClick={() => ops([{ op: "definir", caminho: "bonus_felnun.pericias_proficientes", valor: sel }], `Perícias proficientes: ${sel.join(", ")}`)}>
            Salvar perícias
          </button>
        </Secao>
      )}

      <Secao titulo="Respeito, favores e bolsa" emoji="🎩">
        <div className="cartao-claro mb-2 text-sm">
          Trabalhos até <b>{"★".repeat(maxEstrelasResp(resp))}</b> {resp === 3 || resp === 4 ? <Proposta /> : null} · {T.resp.linhas[resp]?.[1]}
        </div>
        <Ficha cfg={cfg} estado={estado} ctx={ctx} editavel={editavel} mestre={false} />
        <details className="mt-2">
          <summary className="text-sm">o que os favores compram</summary>
          <TabelaView t={T.fav} />
        </details>
      </Secao>

      <Secao titulo="Rede por zona" emoji="🕸️" aberta={false}>
        <GradeZonas cfg={cfg} padrao="rede_por_zona.*" estado={estado} ctx={ctx} editavel={editavel} />
        <details className="mt-2">
          <summary className="text-sm">ver tabela de Rede</summary>
          <TabelaView t={T.rede} />
        </details>
      </Secao>

      <Secao titulo={`Contatos · ${(estado.contatos ?? []).length}`} emoji="🤝">
        <ListaEditavel
          itens={estado.contatos ?? []}
          caminho="contatos"
          editavel={editavel}
          ops={ops}
          rotuloNovo="Novo contato"
          novoPadrao={{ confianca: 1, nivel: 1 }}
          campos={[
            { chave: "nome", rotulo: "Nome" },
            { chave: "nivel", rotulo: "Nível ★ (1–5)", tipo: "numero" },
            { chave: "confianca", rotulo: "Confiança (1–3)", tipo: "numero" },
            { chave: "base", rotulo: "Base" },
            { chave: "estado", rotulo: "Estado" },
          ]}
          render={(c) => (
            <div>
              <b>{c.nome}</b> · {"★".repeat(c.nivel ?? 0)} {T.tier.linhas[(c.nivel ?? 1) - 1]?.[0].replace(/★+\s/, "")} · bônus {T.tier.linhas[(c.nivel ?? 1) - 1]?.[3]} · 🤞 {c.confianca}/3
              <div className="text-sm">
                {c.base ?? <span className="selo">base a definir</span>} · <span className="detalhe">{c.estado}</span>
              </div>
            </div>
          )}
          acoesItem={(c, i) =>
            editavel ? (
              <>
                <button className="btn btn-mini btn-sec" onClick={() => ops([{ op: "escala", caminho: `contatos.${i}.confianca`, delta: -1 }], `Confiança de ${c.nome} −1`)}>−1 confiança</button>
                <button className="btn btn-mini" onClick={() => ops([{ op: "escala", caminho: `contatos.${i}.confianca`, delta: 1 }], `Confiança de ${c.nome} +1`)}>+1 confiança</button>
              </>
            ) : null
          }
        />
      </Secao>

      <Secao titulo={`Quadro de trabalhos (${1 + zonasCel} por semana)`} emoji="📜">
        {editavel && (
          <button className="btn" onClick={gerarQuadro}>
            🎲 Rolar o quadro
          </button>
        )}
        <div className="mt-2 grid gap-2">
          {(estado.quadro ?? []).map((t: any, i: number) => (
            <Trabalho key={t.id ?? i} t={t} i={i} cfg={cfg} estado={estado} editavel={editavel} bonusPericia={bonusPericia} />
          ))}
        </div>
        <div className="mt-2 cartao-claro text-sm">
          ⚖️ <b>Regra fixa:</b> num contrato de morte, <b>quem decide é o Kaio</b>.
        </div>
      </Secao>

      <Secao titulo="Sussurros" emoji="🕯️" aberta={false}>
        <RolarTabela
          cfg={cfg}
          tabela="sus"
          onResultado={(r) => editavel && ops([{ op: "lista_add", caminho: "sussurros", item: { texto: r.rolagem.linha?.[1], semana: ctx.campanha.semana } }], `Sussurro: ${r.rolagem.linha?.[1]}`)}
        />
        <ul className="mt-2 grid gap-1 text-sm">
          {(estado.sussurros ?? []).map((s: any, i: number) => (
            <li key={i} className="cartao-claro">
              {s.texto} {s.semana ? <span className="opacity-60">(semana {s.semana})</span> : null}
            </li>
          ))}
        </ul>
        <details className="mt-2">
          <summary className="text-sm">usos do sussurro</summary>
          <TabelaView t={T.uso} />
        </details>
      </Secao>

      <Secao titulo="A noite e ligações" emoji="🌙" aberta={false}>
        <RolarTabela cfg={cfg} tabela="noite" />
        <div className="mt-2">
          <Ligacoes cfg={cfg} estado={estado} editavel={editavel} />
        </div>
        <details className="mt-2">
          <summary className="text-sm">ver ações do submundo</summary>
          <TabelaView t={T.acoes} />
        </details>
        <div className="mt-2 text-sm">
          Bônus do Felnun: DES +{bf.atributos?.DES} · SAB +{bf.atributos?.SAB} · proficiência +{bf.proficiencia}
        </div>
      </Secao>
    </>
  );
}

function Trabalho({ t, i, cfg, estado, editavel, bonusPericia }: { t: any; i: number; cfg: FrenteConfig; estado: any; editavel: boolean; bonusPericia: (p: string) => number | null }) {
  const { ops, rolarLivre } = useFrenteAcoes(cfg.id);
  const [res, setRes] = useState<any>(null);
  const b = bonusPericia(t.pericia);
  const cd = (t.cd ?? 10) + (t.exp ?? 0);
  const aplicar = async () => {
    const c = res.classe;
    const ganha = ["sucesso", "sucesso5", "nat20"].includes(c);
    const o: any[] = [{ op: "definir", caminho: `quadro.${i}.estado`, valor: "resolvido" }];
    const pag = ganha && !t.favor && rolarExpressao(String(t.pagamento ?? "")) ? (await rolarLivre(String(t.pagamento), `Pagamento: ${t.trabalho}`)).rolagem.total : 0;
    const pagar = () => (t.favor ? o.push({ op: "contador", caminho: "favores.a_receber", delta: 1 }) : o.push({ op: "contador", caminho: "bolsa_po", delta: pag }));
    if (c === "sucesso5" || c === "nat20") {
      pagar();
      o.push({ op: "contador", caminho: "favores.a_receber", delta: 1 }, { op: "marcas", caminho: "respeito", delta: 1 });
    }
    if (c === "sucesso") {
      pagar();
      if ((t.estrelas ?? 1) >= 3) o.push({ op: "marcas", caminho: "respeito", delta: 1 });
    }
    if (c === "falha") o.push({ op: "relogio", caminho: "relogios.exposicao", delta: 1 });
    if (c === "falha5") o.push({ op: "relogio", caminho: "relogios.exposicao", delta: 2 });
    return ops(o, `Trabalho ${t.trabalho}: ${c}${["sucesso", "sucesso5", "nat20"].includes(c) ? (t.favor ? " · pago em 1 favor" : ` · pagamento ${pag} PO (${t.pagamento})`) : ""}`);
  };
  return (
    <div className="cartao-claro">
      <b>{t.trabalho}</b> · {"★".repeat(t.estrelas ?? 1)} · {t.pericia} · Exp. +{t.exp} · CD {cd} · {t.favor ? "paga 1 favor" : t.pagamento} <span className="selo">{t.estado}</span>
      {/morte/i.test(t.trabalho ?? "") && <div className="text-sm text-yellow-200">⚖️ Contrato de morte: quem decide é o Kaio.</div>}
      {editavel && t.estado === "aberto" && (
        <div className="mt-1 flex gap-1">
          <button className="btn btn-mini" onClick={() => ops([{ op: "definir", caminho: `quadro.${i}.estado`, valor: "aceito" }], `Aceitou: ${t.trabalho}`)}>Aceitar</button>
          <button className="btn btn-mini btn-sec" onClick={() => ops([{ op: "lista_del", caminho: "quadro", indice: i }], `Recusou: ${t.trabalho}`)}>Recusar</button>
        </div>
      )}
      {editavel && t.estado === "aceito" && (
        <>
          <TesteBox cfg={cfg} rotulo={`Resolver: ${t.pericia}`} bonusInicial={b ?? 0} cdInicial={cd} onResultado={(r) => setRes(r.rolagem)} />
          {b == null && <div className="text-xs">Digite o bônus da perícia ({t.pericia}).</div>}
          {res && (
            <div className="mt-1 flex flex-wrap gap-2">
              <button className="btn" onClick={() => aplicar().then(() => setRes(null))}>
                Aplicar resultado
              </button>
              {res.classe === "nat1" && <RolarTabela cfg={cfg} tabela="rev" compacto />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
