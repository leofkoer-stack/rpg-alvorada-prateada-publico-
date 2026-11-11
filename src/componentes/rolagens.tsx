"use client";
import { useState } from "react";
import type { FrenteConfig } from "@/frentes/tipos";
import { dadoDaTabela } from "@/motor/tabelas";
import { useFrenteAcoes } from "./contexto";
import { CampoFisico, ResultadoRolagem, TabelaView } from "./ui";

/** Botão "Rolar" para uma tabela de dado (5.5). */
export function RolarTabela({ cfg, tabela, rotulo, modExtra, onResultado, compacto }: { cfg: FrenteConfig; tabela: string; rotulo?: string; modExtra?: number; onResultado?: (r: any) => void; compacto?: boolean }) {
  const t = cfg.regras.tabelas[tabela];
  const { rolarTabela } = useFrenteAcoes(cfg.id);
  const [fis, setFis] = useState("");
  const [r, setR] = useState<any>(null);
  const [ocupado, setOcupado] = useState(false);
  if (!t) return null;
  const rv = cfg.rolaveis.find((x) => x.tabela === tabela);
  const info = dadoDaTabela(t);
  const dado = rv?.dado ?? (info ? `${info.qtd > 1 ? info.qtd : ""}d${info.lados}` : "");
  return (
    <div className={compacto ? "" : "cartao-claro"}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="btn"
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true);
            try {
              const res = await rolarTabela(tabela, { fisico: fis ? Number(fis) : null, modificadorExtra: modExtra });
              setR(res);
              setFis("");
              onResultado?.(res);
            } finally {
              setOcupado(false);
            }
          }}
        >
          🎲 {rotulo ?? rv?.rotulo ?? t.titulo}
        </button>
        <span className="text-sm opacity-80">
          {dado}
          {rv?.modRotulo ? ` + ${rv.modRotulo}` : ""}
        </span>
        <CampoFisico valor={fis} setValor={setFis} />
      </div>
      <ResultadoRolagem r={r} />
      <details className="mt-1">
        <summary className="text-sm">ver tabela</summary>
        <TabelaView t={t} destaque={r?.rolagem?.indice} />
      </details>
    </div>
  );
}

/** Teste genérico: d20 + bônus (+ extras) vs CD, com vantagem/desvantagem. */
export function TesteBox({
  cfg,
  rotulo = "Teste",
  bonusInicial = 0,
  cdInicial = 10,
  extrasIniciais = "",
  modoInicial = "normal",
  tabelaResultado,
  travado,
  onResultado,
  motivo,
}: {
  cfg: FrenteConfig;
  rotulo?: string;
  bonusInicial?: number;
  cdInicial?: number;
  extrasIniciais?: string;
  modoInicial?: string;
  tabelaResultado?: string;
  travado?: boolean;
  onResultado?: (r: any) => void;
  motivo?: string;
}) {
  const { rolarTeste } = useFrenteAcoes(cfg.id);
  const [bonus, setBonus] = useState(String(bonusInicial));
  const [cd, setCd] = useState(String(cdInicial));
  const [modo, setModo] = useState(modoInicial);
  const [extras, setExtras] = useState(extrasIniciais);
  const [fis, setFis] = useState("");
  const [r, setR] = useState<any>(null);
  const [ocupado, setOcupado] = useState(false);
  const B = travado ? bonusInicial : Number(bonus) || 0;
  const CD = travado ? cdInicial : Number(cd) || 10;
  return (
    <div className="cartao-claro">
      <div className="font-bold">🎯 {rotulo}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <label>
          bônus <input className="entrada w-16" inputMode="numeric" value={travado ? String(bonusInicial) : bonus} disabled={travado} onChange={(e) => setBonus(e.target.value)} />
        </label>
        <label>
          CD <input className="entrada w-16" inputMode="numeric" value={travado ? String(cdInicial) : cd} disabled={travado} onChange={(e) => setCd(e.target.value)} />
        </label>
        <select className="entrada" value={modo} onChange={(e) => setModo(e.target.value)}>
          <option value="normal">normal</option>
          <option value="vantagem">vantagem</option>
          <option value="desvantagem">desvantagem</option>
        </select>
        <label>
          dados extras <input className="entrada w-20" placeholder="d4" value={extras} onChange={(e) => setExtras(e.target.value)} />
        </label>
        <CampoFisico valor={fis} setValor={setFis} rotulo="d20 na mesa:" />
      </div>
      <button
        className="btn mt-2"
        disabled={ocupado}
        onClick={async () => {
          setOcupado(true);
          try {
            const res = await rolarTeste({
              bonus: B,
              cd: CD,
              modo,
              extras: extras.split(/[ ,]+/).filter((x) => /^1?d\d+$/i.test(x)),
              fisico: fis ? Number(fis) : null,
              rotulo,
              tabelaResultado: tabelaResultado ?? cfg.tabelaResultado,
              motivo,
            });
            setR(res);
            setFis("");
            onResultado?.(res);
          } finally {
            setOcupado(false);
          }
        }}
      >
        🎲 Rolar teste
      </button>
      <ResultadoRolagem r={r} />
    </div>
  );
}

export function DadoLivre({ cfg }: { cfg: FrenteConfig }) {
  const { rolarLivre } = useFrenteAcoes(cfg.id);
  const [ex, setEx] = useState("1d20");
  const [r, setR] = useState<any>(null);
  return (
    <div className="cartao-claro">
      <div className="font-bold">🎲 Dado livre</div>
      <div className="mt-2 flex gap-2">
        <input className="entrada w-36" value={ex} onChange={(e) => setEx(e.target.value)} placeholder="2d6+3" />
        <button className="btn" onClick={async () => setR(await rolarLivre(ex))}>
          Rolar
        </button>
      </div>
      <ResultadoRolagem r={r} />
    </div>
  );
}
