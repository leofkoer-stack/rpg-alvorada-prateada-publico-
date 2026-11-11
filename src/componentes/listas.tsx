"use client";
import { useState } from "react";
import type { Op } from "@/motor/ops";

export interface CampoLista {
  chave: string;
  rotulo: string;
  tipo?: "texto" | "numero" | "select" | "check";
  opcoes?: string[];
  largura?: string;
}

/** Lista editável genérica (receitas, contatos, portfólio…). Cada mudança vira uma Op. */
export function ListaEditavel({
  itens,
  campos,
  caminho,
  editavel,
  ops,
  rotuloNovo = "Adicionar",
  novoPadrao = {},
  render,
  acoesItem,
}: {
  itens: any[];
  campos: CampoLista[];
  caminho: string;
  editavel: boolean;
  ops: (o: Op[], motivo: string) => Promise<any>;
  rotuloNovo?: string;
  novoPadrao?: any;
  render?: (it: any, i: number) => React.ReactNode;
  acoesItem?: (it: any, i: number) => React.ReactNode;
}) {
  const [novo, setNovo] = useState<any>(null);
  const [ed, setEd] = useState<number | null>(null);
  const [rasc, setRasc] = useState<any>({});
  const form = (v: any, set: (x: any) => void) => (
    <div className="grid gap-2 sm:grid-cols-2">
      {campos.map((c) => (
        <label key={c.chave} className="text-sm">
          {c.rotulo}
          {c.tipo === "select" ? (
            <select className="entrada w-full" value={v[c.chave] ?? ""} onChange={(e) => set({ ...v, [c.chave]: e.target.value })}>
              <option value="">—</option>
              {c.opcoes!.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : c.tipo === "check" ? (
            <input type="checkbox" className="ml-2 h-6 w-6" checked={!!v[c.chave]} onChange={(e) => set({ ...v, [c.chave]: e.target.checked })} />
          ) : v[c.chave] && typeof v[c.chave] === "object" ? (
            <input className="entrada w-full opacity-70" disabled value={Object.entries(v[c.chave]).map(([k, x]) => `${k} ${x}`).join(" · ")} />
          ) : (
            <input
              className="entrada w-full"
              inputMode={c.tipo === "numero" ? "numeric" : undefined}
              value={v[c.chave] ?? ""}
              onChange={(e) => set({ ...v, [c.chave]: c.tipo === "numero" ? (e.target.value === "" ? null : Number(e.target.value.replace(",", "."))) : e.target.value })}
            />
          )}
        </label>
      ))}
    </div>
  );
  return (
    <div className="grid gap-2">
      {itens.map((it, i) => (
        <div key={it.id ?? i} className="cartao-claro">
          {ed === i ? (
            <>
              {form(rasc, setRasc)}
              <div className="mt-2 flex gap-2">
                <button className="btn btn-mini" onClick={async () => { await ops([{ op: "lista_set", caminho, indice: i, item: rasc }], `Editado: ${rasc.nome ?? rasc.titulo ?? rasc.pedido ?? ""}`); setEd(null); }}>
                  Salvar
                </button>
                <button className="btn btn-mini btn-sec" onClick={() => setEd(null)}>Cancelar</button>
                <button className="btn btn-mini btn-sec ml-auto" onClick={async () => { if (confirm("Apagar este item?")) { await ops([{ op: "lista_del", caminho, indice: i }], `Removido: ${it.nome ?? it.titulo ?? it.pedido ?? ""}`); setEd(null); } }}>
                  🗑️ Apagar
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                {render ? render(it, i) : campos.map((c) => (
                  <span key={c.chave} className="mr-3">
                    <span className="text-xs opacity-70">{c.rotulo}:</span> {it[c.chave] == null || it[c.chave] === "" ? <span className="selo">a definir</span> : <b>{typeof it[c.chave] === "object" ? Object.entries(it[c.chave]).map(([k, x]) => `${k} ${x}`).join(" · ") : String(it[c.chave] === true ? "sim" : it[c.chave] === false ? "não" : it[c.chave])}</b>}
                  </span>
                ))}
                {it.proposta && <span className="selo ml-1">proposta</span>}
                {acoesItem && <div className="mt-2 flex flex-wrap gap-1">{acoesItem(it, i)}</div>}
              </div>
              {editavel && (
                <button className="btn btn-mini btn-sec" onClick={() => { setRasc({ ...it }); setEd(i); }}>
                  ✏️
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      {!itens.length && <div className="opacity-70">Nada ainda.</div>}
      {editavel &&
        (novo ? (
          <div className="cartao-claro">
            {form(novo, setNovo)}
            <div className="mt-2 flex gap-2">
              <button className="btn btn-mini" onClick={async () => { await ops([{ op: "lista_add", caminho, item: { id: `i${Date.now().toString(36)}`, ...novo } }], `Novo: ${novo.nome ?? novo.titulo ?? novo.pedido ?? ""}`); setNovo(null); }}>
                Salvar
              </button>
              <button className="btn btn-mini btn-sec" onClick={() => setNovo(null)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-sec" onClick={() => setNovo({ ...novoPadrao })}>
            ➕ {rotuloNovo}
          </button>
        ))}
    </div>
  );
}
