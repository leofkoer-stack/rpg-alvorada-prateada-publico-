"use client";
import { frente } from "@/frentes";
import type { Ctx } from "@/frentes/tipos";
import { Secao } from "./ui";
import { Checklist, Relogios, Ferramentas, Tabelas, LogView } from "./ficha";
import { PainelCulto } from "./frentes/culto";
import { PainelRadio } from "./frentes/radio";
import { PainelForja } from "./frentes/forja";
import { PainelCaldeirao } from "./frentes/caldeirao";
import { PainelSubmundo } from "./frentes/submundo";

export const estiloFrente = (id: string): React.CSSProperties => {
  const c = frente(id).cores;
  return { ["--cor" as any]: c.destaque, ["--fundo" as any]: c.fundo, ["--det" as any]: c.detalhe };
};

/** A frente inteira: checklist, painel próprio, relógios, ferramentas, tabelas e log. */
export function FrenteCompleta({
  id,
  estado,
  ctx,
  editavel,
  economiaDraetyr,
  log,
  pedidos,
}: {
  id: string;
  estado: any;
  ctx: Ctx;
  editavel: boolean;
  economiaDraetyr: number | null;
  log?: any[];
  pedidos?: any[];
}) {
  const cfg = frente(id);
  const props = { cfg, estado, ctx, editavel };
  const semana = ctx.campanha?.semana ?? 1;
  return (
    <div style={estiloFrente(id)}>
      <Secao titulo={`Turno da semana ${semana}`} emoji="✅" aberta={false}>
        <Checklist cfg={cfg} estado={estado} editavel={editavel} />
      </Secao>
      {id === "culto" && <PainelCulto {...props} />}
      {id === "radio" && <PainelRadio {...props} />}
      {id === "forja" && <PainelForja {...props} economiaDraetyr={economiaDraetyr} />}
      {id === "caldeirao" && <PainelCaldeirao {...props} economiaDraetyr={economiaDraetyr} semana={semana} />}
      {id === "submundo" && <PainelSubmundo {...props} />}
      {cfg.relogios.length > 0 && (
        <Secao titulo="Relógios" emoji="⏰">
          <Relogios cfg={cfg} estado={estado} editavel={editavel} />
        </Secao>
      )}
      {pedidos && pedidos.length > 0 && (
        <Secao titulo="Pedidos na forja do Trazix" emoji="⚒️">
          {pedidos.map((p: any) => (
            <div key={p.id} className="cartao-claro">
              <b>{p.pedido}</b> · {p.status} · 🔨 {p.jornadas_feitas ?? 0}/{p.jornadas_total ?? "?"} · prazo {p.prazo ?? "a confirmar"}
              {p.nota && <div className="text-sm opacity-80">{p.nota}</div>}
            </div>
          ))}
        </Secao>
      )}
      {(estado.efeitos ?? []).length > 0 && (
        <Secao titulo="Efeitos ativos" emoji="⏳">
          {estado.efeitos.map((e: any, i: number) => (
            <div key={i} className="cartao-claro">
              {e.texto} {e.ate_semana ? `(até a semana ${e.ate_semana})` : ""}
            </div>
          ))}
        </Secao>
      )}
      {(estado.notas ?? []).length > 0 && (
        <Secao titulo="Notas" emoji="📝" aberta={false}>
          <ul className="grid gap-1">
            {estado.notas.map((n: string, i: number) => (
              <li key={i} className="cartao-claro text-sm">
                {n}
              </li>
            ))}
          </ul>
        </Secao>
      )}
      {editavel && (
        <Secao titulo="Ferramentas" emoji="🧰" aberta={false}>
          <Ferramentas cfg={cfg} estado={estado} />
        </Secao>
      )}
      <Secao titulo="Tabelas e regras" emoji="📚" aberta={false}>
        <Tabelas cfg={cfg} />
      </Secao>
      {log && (
        <Secao titulo="Log da frente" emoji="📜" aberta={false}>
          <LogView log={log} />
        </Secao>
      )}
    </div>
  );
}
