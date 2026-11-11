"use client";
import { frente } from "@/frentes";
import { ROTULOS_CIDADE } from "@/frentes/cidade";
import { Relogio } from "./ui";

const GOVERNO: Record<string, string> = {
  regime_especial: "Regime especial",
  lorde_aliado: "Lorde aliado",
  lorde_neutro: "Lorde neutro",
  lorde_hostil: "Lorde hostil",
  isolamento: "Isolamento",
};

/** Resumo público de Draetyr (D3). */
export function DraetyrHoje({ d }: { d: any }) {
  const cfg = frente("cidade");
  const lv = cfg.regras.tabelas.lv;
  const c = cfg.cores;
  return (
    <section className="cartao mt-4" style={{ ["--cor" as any]: c.destaque, ["--fundo" as any]: c.fundo, ["--det" as any]: c.detalhe, background: c.fundo }}>
      <h2 className="text-xl font-bold">🏙️ Draetyr hoje</h2>
      <div className="mt-1">
        Estágio <b className="text-xl">{d.estagio}</b> · {cfg.nomeEstagio(d.estagio ?? 0)} · {GOVERNO[d.governo] ?? d.governo} {d.pjs_onde && <>· PJs em <b>{d.pjs_onde}</b></>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-4">
        {Object.entries(ROTULOS_CIDADE).map(([k, r]) => {
          const v = d.frentes?.[k];
          return (
            <div key={k} className="cartao-claro text-sm">
              {r.emoji} <b>{r.rotulo}</b>
              <div className="text-lg font-extrabold">{typeof v === "object" ? v.nivel : v}</div>
              {typeof v === "object" && <div className="text-xs detalhe">{lv.linhas[v.nivel]?.[r.col]}</div>}
            </div>
          );
        })}
      </div>
      {d.relogios && typeof d.relogios === "object" && (
        <div className="mt-2 grid gap-1 sm:grid-cols-3">
          {cfg.relogios.map((r) => {
            const v = d.relogios[r.caminho.split(".")[1]];
            return v && typeof v === "object" ? <Relogio key={r.caminho} rotulo={r.rotulo} emoji={r.emoji} valor={v.valor} tamanho={v.tamanho} pequeno /> : null;
          })}
        </div>
      )}
      {Array.isArray(d.projetos) && d.projetos.length > 0 && (
        <div className="mt-2 text-sm">
          🏗️ <b>Projetos:</b> {d.projetos.map((p: any) => `${p.nome} (${p.status === "concluido" ? "concluído" : `${p.semanas_restantes ?? "?"} sem.`})`).join(" · ")}
        </div>
      )}
    </section>
  );
}
