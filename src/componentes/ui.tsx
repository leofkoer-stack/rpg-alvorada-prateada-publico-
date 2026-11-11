"use client";
import { useState } from "react";
import type { Tabela } from "@/motor/tipos";
import { ROTULO_CLASSE } from "@/motor/teste";

export function Selo({ children }: { children: React.ReactNode }) {
  return <span className="selo">{children}</span>;
}
export const ADefinir = () => <span className="selo">a definir</span>;
export const Proposta = () => <span className="selo">proposta</span>;

export function Secao({ titulo, emoji, children, extra, aberta = true }: { titulo: string; emoji?: string; children: React.ReactNode; extra?: React.ReactNode; aberta?: boolean }) {
  const [a, setA] = useState(aberta);
  return (
    <section className="cartao mt-4">
      <div className="flex items-center justify-between gap-2">
        <button className="text-left text-xl font-bold" style={{ fontFamily: "var(--font-serif)" }} onClick={() => setA(!a)}>
          {emoji} {titulo} <span className="text-base detalhe">{a ? "▾" : "▸"}</span>
        </button>
        {extra}
      </div>
      {a && <div className="mt-3">{children}</div>}
    </section>
  );
}

export function VerRegra({ titulo = "ver regra", children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <details className="mt-2">
      <summary>📖 {titulo}</summary>
      <div className="mt-2 text-sm opacity-90">{children}</div>
    </details>
  );
}

/** Barra de nível 0–max + 4 bolinhas de marcas. */
export function Medida({
  rotulo,
  emoji,
  valor,
  max = 5,
  nomeNivel,
  teto,
  editavel,
  onMarcas,
  oculto,
  onOcultar,
}: {
  rotulo: string;
  emoji?: string;
  valor: { nivel: number; marcas: number } | string | null | undefined;
  max?: number;
  nomeNivel?: string;
  teto?: number | null;
  editavel?: boolean;
  onMarcas?: (d: number) => void;
  oculto?: boolean;
  onOcultar?: () => void;
}) {
  if (typeof valor === "string") return <Linha rotulo={rotulo} emoji={emoji}>{valor}</Linha>;
  const v = valor ?? { nivel: 0, marcas: 0 };
  return (
    <div className="cartao-claro">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold">
          {emoji} {rotulo} <span className="text-2xl">{v.nivel}</span>
          {teto != null && teto < max && <span className="ml-2 text-xs detalhe">teto {teto}</span>}
        </div>
        {onOcultar && (
          <button className="btn-mini" title={oculto ? "Mostrar aos jogadores" : "Ocultar dos jogadores"} onClick={onOcultar}>
            {oculto ? "🙈" : "👁️"}
          </button>
        )}
      </div>
      {nomeNivel && <div className="text-sm detalhe">{nomeNivel}</div>}
      <div className="mt-1 flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <div key={i} className="h-3 flex-1 rounded" style={{ background: i < v.nivel ? "var(--cor)" : teto != null && i >= teto ? "#ffffff08" : "#ffffff22", outline: i < v.nivel ? "1px solid #ffffff55" : undefined }} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1" aria-label={`${v.marcas} marcas`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="inline-block h-4 w-4 rounded-full border-2" style={{ borderColor: "var(--det)", background: i < v.marcas ? "var(--det)" : "transparent" }} />
          ))}
          <span className={`ml-2 text-sm ${v.marcas < 0 ? "text-red-300 font-bold" : "opacity-80"}`}>
            {v.marcas} marca{Math.abs(v.marcas) === 1 ? "" : "s"}
          </span>
        </div>
        {editavel && onMarcas && (
          <div className="flex gap-1">
            <button className="btn btn-mini btn-sec" onClick={() => onMarcas(-1)}>−</button>
            <button className="btn btn-mini" onClick={() => onMarcas(1)}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Linha({ rotulo, emoji, children }: { rotulo: string; emoji?: string; children: React.ReactNode }) {
  return (
    <div className="cartao-claro flex items-center justify-between gap-2">
      <span className="font-bold">
        {emoji} {rotulo}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/** Escala fora do 0–5 (Fé, Reputação…) ou contador. null = "a definir". */
export function Numero({
  rotulo,
  emoji,
  valor,
  min,
  max,
  nome,
  editavel,
  onDelta,
  onDefinir,
  passo = 1,
  sufixo,
}: {
  rotulo: string;
  emoji?: string;
  valor: number | null | undefined | string;
  min?: number;
  max?: number;
  nome?: string;
  editavel?: boolean;
  onDelta?: (d: number) => void;
  onDefinir?: (v: number) => void;
  passo?: number;
  sufixo?: string;
}) {
  const [ed, setEd] = useState(false);
  const [txt, setTxt] = useState("");
  if (typeof valor === "string") return <Linha rotulo={rotulo} emoji={emoji}>{valor}</Linha>;
  const vazio = valor == null;
  return (
    <div className="cartao-claro">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">
          {emoji} {rotulo}
        </span>
        <span className="text-2xl font-extrabold">
          {vazio ? <ADefinir /> : `${valor.toLocaleString("pt-BR")}${sufixo ?? ""}`}
          {max != null && !vazio && <span className="text-sm opacity-60"> /{max}</span>}
        </span>
      </div>
      {nome && <div className="text-sm detalhe">{nome}</div>}
      {max != null && min != null && !vazio && (
        <div className="mt-1 h-2 rounded bg-white/10">
          <div className="h-2 rounded" style={{ width: `${((valor - min) / (max - min)) * 100}%`, background: "var(--cor)" }} />
        </div>
      )}
      {editavel && (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-1">
          {ed ? (
            <>
              <input className="entrada w-28" inputMode="numeric" value={txt} onChange={(e) => setTxt(e.target.value)} autoFocus />
              <button
                className="btn btn-mini"
                onClick={() => {
                  const n = Number(txt.replace(",", "."));
                  if (!Number.isNaN(n)) onDefinir?.(n);
                  setEd(false);
                }}
              >
                OK
              </button>
            </>
          ) : (
            <>
              {onDefinir && (
                <button className="btn btn-mini btn-sec" onClick={() => { setTxt(vazio ? "" : String(valor)); setEd(true); }}>
                  ✏️
                </button>
              )}
              {!vazio && onDelta && (
                <>
                  <button className="btn btn-mini btn-sec" onClick={() => onDelta(-passo)}>−{passo === 1 ? "" : passo}</button>
                  <button className="btn btn-mini" onClick={() => onDelta(passo)}>+{passo === 1 ? "" : passo}</button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Relógio em círculo segmentado. */
export function Relogio({
  rotulo,
  emoji,
  valor,
  tamanho,
  editavel,
  onDelta,
  cheioTexto,
  pequeno,
}: {
  rotulo: string;
  emoji?: string;
  valor: number;
  tamanho: number;
  editavel?: boolean;
  onDelta?: (d: number) => void;
  cheioTexto?: string;
  pequeno?: boolean;
}) {
  const cheio = valor >= tamanho;
  const r = pequeno ? 22 : 34;
  const c = r + 6;
  const segs = Array.from({ length: tamanho }, (_, i) => {
    const a0 = (i / tamanho) * 2 * Math.PI - Math.PI / 2 + 0.06;
    const a1 = ((i + 1) / tamanho) * 2 * Math.PI - Math.PI / 2 - 0.06;
    const p = (a: number) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`;
    return <path key={i} d={`M ${c} ${c} L ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)} Z`} fill={i < valor ? (cheio ? "#e04848" : "var(--det)") : "#ffffff1a"} stroke="#000" strokeWidth={1} />;
  });
  return (
    <div className={`cartao-claro flex items-center gap-3 ${cheio ? "ring-4 ring-red-500" : ""}`}>
      <svg width={c * 2} height={c * 2} aria-label={`${valor} de ${tamanho}`}>
        {segs}
      </svg>
      <div className="flex-1">
        <div className="font-bold">
          {emoji} {rotulo}
        </div>
        <div className="text-lg">
          <b>{valor}</b>/{tamanho} {cheio && <span className="font-extrabold text-red-300">CHEIO!</span>}
        </div>
        {cheio && cheioTexto && <div className="text-sm text-red-200">{cheioTexto}</div>}
        {editavel && onDelta && (
          <div className="mt-1 flex gap-1">
            <button className="btn btn-mini btn-sec" onClick={() => onDelta(-1)}>−1</button>
            <button className="btn btn-mini" onClick={() => onDelta(1)}>+1</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Mostra uma tabela, destacando uma linha. */
export function TabelaView({ t, destaque }: { t: Tabela; destaque?: number | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="tab">
        <thead>
          <tr>{t.colunas.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {t.linhas.map((l, i) => (
            <tr key={i} className={destaque === i ? "destaque" : ""}>
              {l.map((c, j) => <td key={j}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultadoRolagem({ r }: { r: any }) {
  if (!r) return null;
  const ro = r.rolagem ?? r;
  if (ro.classe) {
    return (
      <div className="cartao-claro mt-2 border-2" style={{ borderColor: "var(--det)" }}>
        <div className="text-lg">
          🎯 d20 <b>{ro.d20.join(" / ")}</b>
          {ro.modo !== "normal" && <span className="text-sm"> ({ro.modo})</span>} + {ro.bonus}
          {ro.extras?.map((e: any, i: number) => <span key={i}> + {e.dado}:{e.valor}</span>)} = <b className="text-2xl">{ro.total}</b> vs CD {ro.cd}
        </div>
        <div className="text-xl font-extrabold">{ROTULO_CLASSE[ro.classe as keyof typeof ROTULO_CLASSE]}</div>
        {ro.linha && <div className="detalhe">{ro.linha[1]}</div>}
      </div>
    );
  }
  if (ro.tabela) {
    return (
      <div className="cartao-claro mt-2 border-2" style={{ borderColor: "var(--det)" }}>
        <div>
          🎲 {ro.dados.join(" + ")}
          {ro.modificador ? ` ${ro.modificador > 0 ? "+" : "−"} ${Math.abs(ro.modificador)}` : ""} = <b className="text-2xl">{ro.total}</b>
        </div>
        {ro.linha ? <div className="font-bold">{ro.linha.slice(1).join(" · ") || ro.linha[0]}</div> : <div>Sem linha para esse valor.</div>}
      </div>
    );
  }
  if (ro.expressao) {
    return (
      <div className="cartao-claro mt-2">
        🎲 {ro.expressao}: [{ro.dados.map((d: any) => d.valor).join(", ")}] = <b className="text-2xl">{ro.total}</b>
      </div>
    );
  }
  return null;
}

/** Campo para digitar a rolagem física (D2). */
export function CampoFisico({ valor, setValor, rotulo = "rolei na mesa:" }: { valor: string; setValor: (s: string) => void; rotulo?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      {rotulo}
      <input className="entrada w-20" inputMode="numeric" placeholder="—" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d]/g, ""))} />
    </label>
  );
}
