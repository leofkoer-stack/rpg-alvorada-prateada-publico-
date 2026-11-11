import { describe, it, expect } from "vitest";
import { dadoDaTabela, conferirCobertura } from "@/motor/tabelas";
import { FRENTES } from "@/frentes";
import type { Regras } from "@/motor/tipos";
import cidade from "@dados/regras-cidade.json";
import culto from "@dados/regras-culto.json";
import radio from "@dados/regras-radio.json";
import forja from "@dados/regras-forja.json";
import caldeirao from "@dados/regras-caldeirao.json";
import submundo from "@dados/regras-submundo.json";

const todas = [cidade, culto, radio, forja, caldeirao, submundo] as unknown as Regras[];

describe("cobertura das tabelas de dado", () => {
  for (const r of todas) {
    for (const [id, t] of Object.entries(r.tabelas)) {
      const info = dadoDaTabela(t);
      if (!info) continue;
      it(`${r.frente}.${id} (${info.qtd}d${info.lados}${info.modificador ? " + " + info.modificador : ""}) cobre todas as faces`, () => {
        expect(conferirCobertura(t, info)).toEqual([]);
      });
    }
  }
  it("Maré pública (d20 + Reputação − Revelação) cobre de −15 a 25", () => {
    const t = (culto as any).tabelas.mar;
    const info = { coluna: 0, qtd: 1, lados: 20, modificador: "Reputação − Revelação" };
    expect(conferirCobertura(t, info, { abaixo: 16, acima: 5 })).toEqual([]);
  });
  it("Humor (d6 ± 1) cobre de 0 a 7", () => {
    const t = (culto as any).tabelas.hum;
    expect(conferirCobertura(t, dadoDaTabela(t)!, { abaixo: 1, acima: 1 })).toEqual([]);
  });
  it("toda tabela rolável das frentes existe e tem dado", () => {
    for (const f of FRENTES)
      for (const rv of f.rolaveis) {
        const t = f.regras.tabelas[rv.tabela];
        expect(t, `${f.id}.${rv.tabela}`).toBeTruthy();
        expect(rv.dado || dadoDaTabela(t), `${f.id}.${rv.tabela}`).toBeTruthy();
      }
  });
  it("conta pelo menos as tabelas d100 com 100 linhas", () => {
    expect((cidade as any).tabelas.d100.linhas.length).toBe(100);
    expect((culto as any).tabelas.d100.linhas.length).toBe(100);
  });
});
