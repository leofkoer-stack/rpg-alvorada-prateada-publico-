"use client";
import { useState } from "react";
import type { CampoSpec, Ctx, FrenteConfig } from "@/frentes/tipos";
import { casa, ler } from "@/motor/caminho";
import { dadoDaTabela } from "@/motor/tabelas";
import { ZONAS } from "@/frentes/seed";
import { LIGACOES } from "@/semana/ligacoes";
import type { Op } from "@/motor/ops";
import { useApp, useFrenteAcoes } from "./contexto";
import { Medida, Numero, Relogio, Secao, TabelaView, ADefinir } from "./ui";
import { RolarTabela, TesteBox, DadoLivre } from "./rolagens";

const nomeZona = (id: string) => ZONAS.find((z) => z.id === id)?.nome ?? id;

export function expandirCampo(c: CampoSpec, estado: any): string[] {
  if (!c.caminho.includes("*")) return ler(estado, c.caminho) === undefined ? [] : [c.caminho];
  const partes = c.caminho.split(".");
  const i = partes.indexOf("*");
  const pre = partes.slice(0, i).join(".");
  const pos = partes.slice(i + 1).join(".");
  const base = ler(estado, pre);
  if (!base || typeof base !== "object") return [];
  return Object.keys(base)
    .map((k) => [pre, k, pos].filter(Boolean).join("."))
    .filter((p) => ler(estado, p) !== undefined && ler(estado, p) !== null && typeof ler(estado, p) !== "string");
}

/** Ficha da frente montada pela configuração: medidas, escalas, contadores e relógios. */
export function Ficha({ cfg, estado, ctx, editavel, mestre, pular = [] }: { cfg: FrenteConfig; estado: any; ctx: Ctx; editavel: boolean; mestre: boolean; pular?: string[] }) {
  const { ops } = useFrenteAcoes(cfg.id);
  const ocultos: string[] = estado.ocultos ?? [];
  const toggle = (cam: string) =>
    ops([{ op: "definir", caminho: "ocultos", valor: ocultos.includes(cam) ? ocultos.filter((x) => x !== cam) : [...ocultos, cam] }], `${ocultos.includes(cam) ? "Mostrar" : "Ocultar"} ${cam}`);
  const campos = cfg.campos.filter((c) => !c.caminho.includes("*") && c.caminho !== "estagio" && !pular.includes(c.caminho));
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {campos.map((c) => {
        const v = ler(estado, c.caminho);
        if (v === undefined) return null;
        const oc = mestre ? { oculto: ocultos.includes(c.caminho), onOcultar: () => toggle(c.caminho) } : {};
        if (c.tipo === "medida")
          return (
            <Medida
              key={c.caminho}
              rotulo={c.rotulo}
              emoji={c.emoji}
              valor={v}
              max={c.max ?? 5}
              nomeNivel={typeof v === "object" ? c.nomeNivel?.(v.nivel) : undefined}
              teto={c.teto?.(estado, ctx)}
              editavel={editavel}
              onMarcas={(d) => ops([{ op: "marcas", caminho: c.caminho, delta: d }], `${c.rotulo}: ${d > 0 ? "+" : ""}${d} marca`)}
              {...oc}
            />
          );
        return (
          <div key={c.caminho} className="relative">
            <Numero
              rotulo={c.rotulo}
              emoji={c.emoji}
              valor={v}
              min={c.tipo === "escala" ? c.min : undefined}
              max={c.tipo === "escala" ? c.max : undefined}
              nome={typeof v === "number" ? c.nomeNivel?.(v) : undefined}
              editavel={editavel}
              onDelta={(d) => ops([{ op: c.tipo === "escala" ? "escala" : "contador", caminho: c.caminho, delta: d }], `${c.rotulo} ${d > 0 ? "+" : ""}${d}`)}
              onDefinir={(n) => ops([{ op: "definir", caminho: c.caminho, valor: n }], `${c.rotulo} = ${n}`)}
            />
            {mestre && (
              <button className="btn-mini absolute right-2 top-2" onClick={() => toggle(c.caminho)}>
                {ocultos.includes(c.caminho) ? "🙈" : "👁️"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Grade por zona (Sinal, Rede: medida 0–3; Raízes: 0–5). */
export function GradeZonas({ cfg, padrao, estado, ctx, editavel, mostrarZeros = false }: { cfg: FrenteConfig; padrao: string; estado: any; ctx: Ctx; editavel: boolean; mostrarZeros?: boolean }) {
  const { ops } = useFrenteAcoes(cfg.id);
  const [todos, setTodos] = useState(mostrarZeros);
  const c = cfg.campos.find((x) => x.caminho === padrao)!;
  const base = padrao.replace(".*", "");
  const mapa = ler(estado, base) ?? {};
  const linhas = ZONAS.filter((z) => {
    const v = mapa[z.id];
    const n = typeof v === "object" ? v?.nivel || v?.marcas : v;
    return todos || n;
  });
  const teto = c.teto?.(estado, ctx);
  return (
    <div>
      <div className="grid gap-1">
        {linhas.map((z) => {
          const v = mapa[z.id];
          const cam = `${base}.${z.id}`;
          const med = typeof v === "object";
          return (
            <div key={z.id} className="cartao-claro flex items-center justify-between gap-2">
              <div>
                <b>{z.nome}</b> <span className="text-xs opacity-70">{z.onde}</span>
                <div className="text-sm detalhe">
                  {c.emoji} {c.rotulo} <b className="text-lg">{med ? v.nivel : v}</b>
                  {med && ` · ${c.nomeNivel?.(v.nivel) ?? ""} · ${v.marcas} marca(s)`}
                </div>
              </div>
              {editavel && (
                <div className="flex gap-1">
                  <button className="btn btn-mini btn-sec" onClick={() => ops([{ op: med ? "marcas" : "escala", caminho: cam, delta: -1 } as Op], `${c.rotulo} ${z.nome} −1${med ? " marca" : ""}`)}>−</button>
                  <button className="btn btn-mini" onClick={() => ops([{ op: med ? "marcas" : "escala", caminho: cam, delta: 1 } as Op], `${c.rotulo} ${z.nome} +1${med ? " marca" : ""}`)}>+</button>
                </div>
              )}
            </div>
          );
        })}
        {!linhas.length && <div className="opacity-70">Nenhuma zona aberta ainda.</div>}
      </div>
      {teto != null && <div className="mt-1 text-sm detalhe">Teto de nível agora: {teto}</div>}
      <button className="btn btn-sec btn-mini mt-2" onClick={() => setTodos(!todos)}>
        {todos ? "Só as abertas" : "Ver as 13 zonas"}
      </button>
    </div>
  );
}

export function Relogios({ cfg, estado, editavel }: { cfg: FrenteConfig; estado: any; editavel: boolean }) {
  const { ops } = useFrenteAcoes(cfg.id);
  const out: React.ReactNode[] = [];
  for (const rs of cfg.relogios) {
    if (rs.caminho.includes("*")) {
      const base = rs.caminho.replace(".*", "");
      (ler(estado, base) ?? []).forEach((r: any, i: number) =>
        out.push(
          <Relogio key={`${base}.${i}`} rotulo={r.nome} emoji={rs.emoji} valor={r.valor} tamanho={r.tamanho} pequeno editavel={editavel} cheioTexto={rs.cheio} onDelta={(d) => ops([{ op: "relogio", caminho: `${base}.${i}`, delta: d }], `${r.nome} ${d > 0 ? "+" : ""}${d}`)} />,
        ),
      );
      continue;
    }
    const r = ler(estado, rs.caminho);
    if (!r) continue;
    const cheio = rs.cheio ?? (rs.linhaRel != null ? cfg.regras.tabelas.rel?.linhas[rs.linhaRel]?.[3] : undefined);
    const linha = rs.linhaRel != null ? cfg.regras.tabelas.rel?.linhas[rs.linhaRel] : null;
    out.push(
      <div key={rs.caminho}>
        <Relogio rotulo={rs.rotulo} emoji={rs.emoji} valor={r.valor} tamanho={r.tamanho} editavel={editavel} cheioTexto={cheio} onDelta={(d) => ops([{ op: "relogio", caminho: rs.caminho, delta: d }], `${rs.rotulo} ${d > 0 ? "+" : ""}${d}`)} />
        {linha && (
          <details className="ml-2 text-sm">
            <summary>quando anda</summary>
            <div>
              ⬆️ <b>Avança:</b> {linha[1]}
            </div>
            <div>
              ⬇️ <b>Recua:</b> {linha[2]}
            </div>
          </details>
        )}
      </div>,
    );
  }
  return <div className="grid gap-2 sm:grid-cols-2">{out}</div>;
}

/** Checklist da semana (passos de `semana` do JSON). */
export function Checklist({ cfg, estado, editavel, extras }: { cfg: FrenteConfig; estado: any; editavel: boolean; extras?: Record<number, React.ReactNode> }) {
  const { ops } = useFrenteAcoes(cfg.id);
  const feitos: boolean[] = estado.semanal?.checklist ?? [];
  return (
    <ol className="grid gap-2">
      {cfg.regras.semana.map((p, i) => {
        const [titulo, ...resto] = p.split(":");
        return (
          <li key={i} className="cartao-claro">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-6 w-6 accent-[var(--det)]"
                disabled={!editavel}
                checked={!!feitos[i]}
                onChange={(e) => ops([{ op: "definir", caminho: `semanal.checklist.${i}`, valor: e.target.checked }], `Checklist: ${titulo} ${e.target.checked ? "✔" : "✘"}`)}
              />
              <span>
                <b>
                  {i + 1}. {titulo}
                </b>
                {resto.length ? `:${resto.join(":")}` : ""}
              </span>
            </label>
            {extras?.[i] && <div className="mt-2">{extras[i]}</div>}
          </li>
        );
      })}
    </ol>
  );
}

/** Botões das ligações que saem desta frente (seção 8). */
export function Ligacoes({ cfg, estado, editavel, bloqueadas = [] }: { cfg: FrenteConfig; estado: any; editavel: boolean; bloqueadas?: string[] }) {
  const { ligacao } = useFrenteAcoes(cfg.id);
  const [esc, setEsc] = useState<Record<string, string>>({});
  const lista = LIGACOES.filter((l) => l.origem === cfg.id && !l.automatico_ao && !l.periodico);
  if (!lista.length) return <div className="opacity-80">Esta frente não tem efeitos automáticos na cidade. O Mestre lança à mão.</div>;
  return (
    <div className="grid gap-2">
      {lista.map((l) => {
        const usadas = estado.semanal?.ligacoes?.[l.id] ?? 0;
        return (
          <div key={l.id} className="cartao-claro">
            <div className="font-bold">🔗 {l.gatilho}</div>
            <div className="text-sm detalhe">{l.texto}</div>
            {l.limite && <div className="text-xs">Limite: {l.limite}{usadas ? " · já usada" : ""}</div>}
            {l.escolha && (
              <select className="entrada mt-1" value={esc[l.id] ?? ""} onChange={(e) => setEsc({ ...esc, [l.id]: e.target.value })}>
                <option value="">escolha o alvo…</option>
                {l.escolha.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            )}
            {editavel && (
              <button className="btn btn-mini mt-2" disabled={bloqueadas.includes(l.id) || (!!l.limite && usadas >= 1) || (!!l.escolha && !esc[l.id])} onClick={() => ligacao(l.id, esc[l.id])}>
                Enviar ao Mestre
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Ferramentas genéricas (5.7). */
export function Ferramentas({ cfg, estado }: { cfg: FrenteConfig; estado: any }) {
  const { ops, nota } = useFrenteAcoes(cfg.id);
  const [motivo, setMotivo] = useState("");
  const [campo, setCampo] = useState("");
  const [relogio, setRelogio] = useState("");
  const [delta, setDelta] = useState("1");
  const [tab, setTab] = useState("");
  const [txt, setTxt] = useState("");
  const medidas: { cam: string; rot: string; tipo: string }[] = [];
  for (const c of cfg.campos)
    for (const cam of expandirCampo(c, estado)) {
      const pai = ler(estado, cam.split(".").slice(0, 2).join("."));
      const sub = c.caminho.includes("*") ? ` · ${pai?.nome ?? nomeZona(cam.split(".")[1])}` : "";
      medidas.push({ cam, rot: `${c.emoji ?? ""} ${c.rotulo}${sub}`, tipo: c.tipo });
    }
  const relogios: { cam: string; rot: string }[] = [];
  for (const r of cfg.relogios) {
    if (r.caminho.includes("*")) (ler(estado, r.caminho.replace(".*", "")) ?? []).forEach((x: any, i: number) => relogios.push({ cam: `${r.caminho.replace(".*", "")}.${i}`, rot: `${r.emoji} ${x.nome}` }));
    else if (ler(estado, r.caminho)) relogios.push({ cam: r.caminho, rot: `${r.emoji} ${r.rotulo}` });
  }
  const tabelas = Object.entries(cfg.regras.tabelas).filter(([, t]) => dadoDaTabela(t) || cfg.rolaveis.some((r) => r.dado));
  const sel = medidas.find((m) => m.cam === campo);
  const d = Number(delta) || 0;
  return (
    <div className="grid gap-3">
      <input className="entrada" placeholder="motivo (vai para o log)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <div className="cartao-claro">
        <div className="font-bold">➕ Marcas · escalas · contadores</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <select className="entrada" value={campo} onChange={(e) => setCampo(e.target.value)}>
            <option value="">escolha…</option>
            {medidas.map((m) => (
              <option key={m.cam} value={m.cam}>
                {m.rot}
              </option>
            ))}
          </select>
          <input className="entrada w-20" inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value)} />
          <button
            className="btn"
            disabled={!sel || !d}
            onClick={() => sel && ops([{ op: sel.tipo === "medida" ? "marcas" : sel.tipo === "escala" ? "escala" : "contador", caminho: sel.cam, delta: d } as Op], motivo || `${sel.rot} ${d > 0 ? "+" : ""}${d}`)}
          >
            Lançar
          </button>
        </div>
        {sel?.tipo === "medida" && <div className="text-xs opacity-70">Em medidas o número é de marcas.</div>}
      </div>
      {relogios.length > 0 && (
        <div className="cartao-claro">
          <div className="font-bold">⏰ Relógio</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <select className="entrada" value={relogio} onChange={(e) => setRelogio(e.target.value)}>
              <option value="">escolha…</option>
              {relogios.map((m) => (
                <option key={m.cam} value={m.cam}>
                  {m.rot}
                </option>
              ))}
            </select>
            <button className="btn btn-sec" disabled={!relogio} onClick={() => ops([{ op: "relogio", caminho: relogio, delta: -1 }], motivo || "Relógio −1")}>
              Recuar
            </button>
            <button className="btn" disabled={!relogio} onClick={() => ops([{ op: "relogio", caminho: relogio, delta: 1 }], motivo || "Relógio +1")}>
              Avançar
            </button>
          </div>
        </div>
      )}
      <TesteBox cfg={cfg} rotulo="Teste livre" motivo={motivo} />
      <DadoLivre cfg={cfg} />
      <div className="cartao-claro">
        <div className="font-bold">📜 Rolar qualquer tabela</div>
        <select className="entrada mt-2 w-full" value={tab} onChange={(e) => setTab(e.target.value)}>
          <option value="">escolha…</option>
          {tabelas.map(([id, t]) => (
            <option key={id} value={id}>
              {t.titulo}
            </option>
          ))}
        </select>
        {tab && <div className="mt-2"><RolarTabela key={tab} cfg={cfg} tabela={tab} compacto /></div>}
      </div>
      <div className="cartao-claro">
        <div className="font-bold">📝 Anotar</div>
        <textarea className="entrada mt-2 w-full" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} />
        <button className="btn mt-2" disabled={!txt.trim()} onClick={async () => { await nota(txt); setTxt(""); }}>
          Salvar nota
        </button>
      </div>
    </div>
  );
}

/** Todas as tabelas da frente, recolhidas, com link para o PDF. */
export function Tabelas({ cfg }: { cfg: FrenteConfig }) {
  const pdf = cfg.regras.pdf.split("/").pop()!;
  return (
    <div className="grid gap-2">
      <a className="btn btn-sec" href={`/referencia/${encodeURIComponent(pdf)}`} target="_blank" rel="noreferrer">
        📄 Abrir o PDF completo
      </a>
      {Object.entries(cfg.regras.tabelas).map(([id, t]) => (
        <details key={id} className="cartao-claro">
          <summary>
            {t.titulo} {cfg.consulta.includes(id) && <span className="selo ml-1">consulta</span>}
          </summary>
          <div className="mt-2">
            <TabelaView t={t} />
          </div>
        </details>
      ))}
    </div>
  );
}

export function LogView({ log }: { log: any[] }) {
  if (!log?.length) return <div className="opacity-70">Nada ainda.</div>;
  return (
    <ul className="grid gap-1 text-sm">
      {log.map((e) => (
        <li key={e.id} className="cartao-claro">
          <div className="flex justify-between gap-2 text-xs opacity-70">
            <span>
              Semana {e.semana} · <b>{e.autor}</b> · {e.frente}
            </span>
            <span>{new Date(e.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div>{e.motivo}</div>
          {e.antes !== undefined && e.antes !== null && typeof e.antes !== "object" && (
            <div className="text-xs detalhe">
              {String(e.antes)} → {String(e.depois)}
            </div>
          )}
          {e.antes && typeof e.antes === "object" && "nivel" in e.antes && (
            <div className="text-xs detalhe">
              nível {e.antes.nivel}·{e.antes.marcas}m → {e.depois?.nivel}·{e.depois?.marcas}m
            </div>
          )}
          {e.antes && typeof e.antes === "object" && "valor" in e.antes && (
            <div className="text-xs detalhe">
              {e.antes.valor}/{e.antes.tamanho} → {e.depois?.valor}/{e.depois?.tamanho}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Cabeçalho de estágio: mostra a linha da tabela; nas frentes de estágio escolhido, permite subir/descer. */
export function Estagio({ cfg, estado, ctx, editavel, tabela }: { cfg: FrenteConfig; estado: any; ctx: Ctx; editavel: boolean; tabela: string }) {
  const { ops } = useFrenteAcoes(cfg.id);
  const e = cfg.estagio(estado, ctx);
  const t = cfg.regras.tabelas[tabela];
  const idx = t.linhas.findIndex((l) => l[0].startsWith(`${e} ·`) || l[0] === String(e));
  return (
    <div className="cartao-claro">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm detalhe">Estágio</div>
          <div className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-serif)" }}>
            {e} · {cfg.nomeEstagio(e)}
          </div>
          <div className="text-sm">
            <b>{cfg.limiteAcoes(estado, ctx)}</b> {cfg.id === "culto" ? "Obras" : "ações"} por semana
          </div>
        </div>
        {editavel && !cfg.estagioCalculado && (
          <div className="flex gap-1">
            <button className="btn btn-mini btn-sec" disabled={e <= 0} onClick={() => ops([{ op: "escala", caminho: "estagio", delta: -1 }], "Estágio −1")}>−</button>
            <button className="btn btn-mini" disabled={e >= 5} onClick={() => ops([{ op: "escala", caminho: "estagio", delta: 1 }], "Estágio +1")}>+</button>
          </div>
        )}
      </div>
      {!cfg.estagioCalculado && t.linhas[idx + 1] && (
        <div className="mt-1 text-sm">
          ➡️ Próximo: <b>{t.linhas[idx + 1][0]}</b> · precisa de: {t.linhas[idx + 1][t.colunas.length - 1]}
        </div>
      )}
      <details className="mt-1">
        <summary className="text-sm">ver tabela de estágios</summary>
        <TabelaView t={t} destaque={idx} />
      </details>
    </div>
  );
}

export const ValorOuDefinir = ({ v, sufixo = "" }: { v: any; sufixo?: string }) => (v == null ? <ADefinir /> : <b>{typeof v === "number" ? v.toLocaleString("pt-BR") : String(v)}{sufixo}</b>);

export { Secao };
export function useCtx(): Ctx | null {
  const { dados } = useApp();
  if (!dados) return null;
  return { frentes: dados.frentes ?? {}, campanha: dados.campanha ?? {} };
}
export { casa };
