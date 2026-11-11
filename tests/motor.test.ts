import { describe, it, expect } from "vitest";
import { fecharMedida } from "@/motor/marcas";
import { estagioCidade, tetosDoGoverno, aplicarTrocaDeGoverno, limiteAcoesCidade, cdAcaoCidade, custoPorNivel, rendaBase, manutencaoObra, escalarTexto } from "@/motor/cidade";
import { estagioCulto, nivelCulto, podeSubirComunhao, testeLealdade, modHumor } from "@/motor/culto";
import { tetoRadio, pautasPorSemana } from "@/motor/radio";
import { classificar, linhaDoResultado, rolarTeste, cdPorEstrelas } from "@/motor/teste";
import { lerFaixa, consultar, rolarTabela } from "@/motor/tabelas";
import { jornadasDaSemana, jornadasMiguelito, vendaBalcao, pedidosPorSemana, cdCaderno, podeDesmontar } from "@/motor/forja";
import { rolarExpressao } from "@/motor/dados";
import regrasCidade from "@dados/regras-cidade.json";
import regrasCulto from "@dados/regras-culto.json";
import type { Regras } from "@/motor/tipos";

const RC = regrasCidade as unknown as Regras;
const RU = regrasCulto as unknown as Regras;
const rngFixo = (...vals: number[]) => {
  let i = 0;
  // valor de dado v em dN: (v-1)/N + pequeno
  return () => vals[i++ % vals.length];
};

describe("marcas e níveis (5.1)", () => {
  it("4 marcas sobem 1 nível e zeram (excesso se perde)", () => {
    expect(fecharMedida({ nivel: 1, marcas: 4 }).depois).toEqual({ nivel: 2, marcas: 0 });
    expect(fecharMedida({ nivel: 1, marcas: 7 }).depois).toEqual({ nivel: 2, marcas: 0 });
  });
  it("menos de 4 marcas não mexe", () => {
    expect(fecharMedida({ nivel: 2, marcas: 3 }).depois).toEqual({ nivel: 2, marcas: 3 });
  });
  it("marcas negativas descem 1 nível e ficam com 3", () => {
    expect(fecharMedida({ nivel: 2, marcas: -1 }).depois).toEqual({ nivel: 1, marcas: 3 });
    expect(fecharMedida({ nivel: 2, marcas: -5 }).depois).toEqual({ nivel: 1, marcas: 3 });
  });
  it("borda: nível 0 com marcas negativas fica 0 com 0", () => {
    expect(fecharMedida({ nivel: 0, marcas: -2 }).depois).toEqual({ nivel: 0, marcas: 0 });
  });
  it("borda: no nível 5 as marcas param em 4", () => {
    expect(fecharMedida({ nivel: 5, marcas: 6 }).depois).toEqual({ nivel: 5, marcas: 4 });
  });
  it("bordas editáveis pelo Mestre", () => {
    const b = { zerarNoMinimo: false, marcasMaxNoTopo: 2 };
    expect(fecharMedida({ nivel: 0, marcas: -2 }, { bordas: b }).depois).toEqual({ nivel: 0, marcas: -2 });
    expect(fecharMedida({ nivel: 5, marcas: 6 }, { bordas: b }).depois).toEqual({ nivel: 5, marcas: 2 });
  });
  it("teto trava a subida", () => {
    const r = fecharMedida({ nivel: 2, marcas: 4 }, { teto: 2 });
    expect(r.depois).toEqual({ nivel: 2, marcas: 4 });
    expect(r.travadoPeloTeto).toBe(true);
  });
  it("escala 0–3 (Sinal, Rede)", () => {
    expect(fecharMedida({ nivel: 3, marcas: 5 }, { max: 3 }).depois).toEqual({ nivel: 3, marcas: 4 });
  });
});

describe("estágio da cidade", () => {
  const f = (p: number, e: number, r = 0, i = 0, n = 0, s = 0, m = 0) => ({
    populacao: { nivel: p }, economia: { nivel: e }, rotas: { nivel: r }, influencia: { nivel: i }, notoriedade: { nivel: n }, seguranca: { nivel: s }, moral: { nivel: m },
  });
  it("fórmula ÷ 9 para baixo", () => {
    expect(estagioCidade(f(1, 1, 1, 1, 1, 1, 1))).toBe(1); // 9/9
    expect(estagioCidade(f(2, 2, 2, 2, 2, 2, 1))).toBe(1); // 17/9
    expect(estagioCidade(f(2, 2, 2, 2, 2, 2, 2))).toBe(2); // 18/9
    expect(estagioCidade(f(5, 5, 5, 5, 5, 5, 5))).toBe(5);
  });
  it("Abandonada: População OU Economia em 0 → 0", () => {
    expect(estagioCidade(f(0, 5, 5, 5, 5, 5, 5))).toBe(0);
    expect(estagioCidade(f(5, 0, 5, 5, 5, 5, 5))).toBe(0);
  });
  it("estado inicial dá Estágio 0", () => {
    expect(estagioCidade(f(0, 0, 1, 0, 0, 1, 1))).toBe(0);
  });
  it("ações: as do estágio; sem PJs uma a menos, mínimo 1", () => {
    const est = RC.tabelas.est;
    expect(limiteAcoesCidade(est, 0, true)).toBe(2);
    expect(limiteAcoesCidade(est, 0, false)).toBe(1);
    expect(limiteAcoesCidade(est, 3, false)).toBe(2);
    expect(limiteAcoesCidade(est, 5, true)).toBe(4);
  });
  it("CD e custo das ações", () => {
    expect(cdAcaoCidade(0)).toBe(10);
    expect(cdAcaoCidade(5)).toBe(20);
    expect(custoPorNivel("100 × (nível + 1) PO", 2)).toBe(300);
    expect(custoPorNivel("—", 2)).toBe(0);
    expect(rendaBase(RC.tabelas.est, 2)).toBe(200);
    expect(rendaBase(RC.tabelas.est, 4)).toBe(1500);
  });
  it("manutenção por obra", () => {
    expect(manutencaoObra(3000)).toBe(10);
    expect(manutencaoObra(8000)).toBe(50);
    expect(manutencaoObra(50000)).toBe(200);
  });
  it("escala × (E + 1)", () => {
    expect(escalarTexto("−1 marca em Moral, ou 100 × (E + 1) PO em lenha.", 2)).toContain("300 PO");
  });
});

describe("travas do governo", () => {
  const base = () => ({ populacao: { nivel: 1, marcas: 0 }, economia: { nivel: 1, marcas: 0 }, rotas: { nivel: 2, marcas: 0 }, influencia: { nivel: 3, marcas: 0 } });
  it("regime especial: Influência ≤ 2", () => {
    expect(tetosDoGoverno("regime_especial").influencia).toBe(2);
    expect(aplicarTrocaDeGoverno(base(), "regime_especial").frentes.influencia.nivel).toBe(2);
  });
  it("isolamento: Influência ≤ 1 e −1 nível em Rotas", () => {
    const r = aplicarTrocaDeGoverno(base(), "isolamento").frentes;
    expect(r.influencia.nivel).toBe(1);
    expect(r.rotas.nivel).toBe(1);
  });
  it("lorde aliado: +1 nível em Influência ao chegar", () => {
    expect(aplicarTrocaDeGoverno(base(), "lorde_aliado").frentes.influencia.nivel).toBe(4);
  });
  it("lorde neutro/hostil: sem teto", () => {
    expect(tetosDoGoverno("lorde_neutro")).toEqual({});
    expect(tetosDoGoverno("lorde_hostil")).toEqual({});
  });
});

describe("estágio do culto", () => {
  it("fórmula ÷ 6 para baixo, mínimo 1", () => {
    expect(estagioCulto(3, 2, 4)).toBe(2); // exemplo do PDF: 16/6 = 2,6
    expect(estagioCulto(1, 1, 1)).toBe(1);
    expect(estagioCulto(5, 5, 5)).toBe(5);
    expect(estagioCulto(0, 0, 0)).toBe(1); // mínimo 1
  });
  it("níveis pela tabela niv (Raízes = soma)", () => {
    const niv = RU.tabelas.niv;
    expect(nivelCulto(niv, 1, 1)).toBe(1);
    expect(nivelCulto(niv, 1, 61)).toBe(3);
    expect(nivelCulto(niv, 1, 500)).toBe(5);
    expect(nivelCulto(niv, 2, 3)).toBe(2);
    expect(nivelCulto(niv, 3, 2)).toBe(1);
  });
  it("Comunhão: custo, provação e máximo", () => {
    const com = RU.tabelas.com;
    expect(podeSubirComunhao(com, 1, 5, ["2"], 2).pode).toBe(true);
    expect(podeSubirComunhao(com, 1, 4, ["2"], 2).pode).toBe(false);
    expect(podeSubirComunhao(com, 1, 5, [], 2).pode).toBe(false);
    expect(podeSubirComunhao(com, 2, 10, ["3"], 2).pode).toBe(false);
  });
  it("Lealdade e humor", () => {
    expect(testeLealdade(15, 18, 1).passou).toBe(true);
    expect(testeLealdade(20, 9, 1).falhaPor10).toBe(true);
    expect(modHumor(7)).toBe(1);
    expect(modHumor(3)).toBe(-1);
    expect(modHumor(5)).toBe(0);
  });
});

describe("teto da rádio", () => {
  it("1 + zonas com Sinal 2 ou mais, máximo 5", () => {
    expect(tetoRadio({})).toBe(1);
    expect(tetoRadio({ a: { nivel: 1 }, b: { nivel: 2 } })).toBe(2);
    expect(tetoRadio({ a: { nivel: 3 }, b: { nivel: 2 } })).toBe(3);
    expect(tetoRadio({ a: { nivel: 2 }, b: { nivel: 2 }, c: { nivel: 2 }, d: { nivel: 3 }, e: { nivel: 3 }, f: { nivel: 2 } })).toBe(5);
    expect(pautasPorSemana({ a: { nivel: 2 } })).toBe(2);
  });
});

describe("classificação do teste", () => {
  it("ordem: 20 nat, 1 nat, 5+, sucesso, falha, falha 5+", () => {
    expect(classificar(20, 5, 30)).toBe("nat20");
    expect(classificar(1, 40, 10)).toBe("nat1");
    expect(classificar(12, 20, 15)).toBe("sucesso5");
    expect(classificar(12, 15, 15)).toBe("sucesso");
    expect(classificar(12, 14, 15)).toBe("falha");
    expect(classificar(5, 10, 15)).toBe("falha5");
    expect(classificar(5, 11, 15)).toBe("falha");
  });
  it("vantagem, desvantagem e dado de Coro", () => {
    const r = rolarTeste({ bonus: 3, cd: 10, modo: "vantagem", d20Fisico: undefined, rng: rngFixo(0.1, 0.9) });
    expect(r.d20.length).toBe(2);
    expect(r.natural).toBe(Math.max(...r.d20));
    const d = rolarTeste({ bonus: 0, cd: 10, modo: "desvantagem", rng: rngFixo(0.1, 0.9) });
    expect(d.natural).toBe(Math.min(...d.d20));
    const c = rolarTeste({ bonus: 2, cd: 10, extras: ["d4"], d20Fisico: 10, extrasFisicos: [3] });
    expect(c.total).toBe(15);
    expect(c.classe).toBe("sucesso5");
  });
  it("acha a linha de resultado de cada frente", () => {
    expect(linhaDoResultado(RC.tabelas.resa, "sucesso5")?.[1]).toBe("+2 marcas");
    expect(linhaDoResultado(RC.tabelas.res, "falha")?.[0]).toBe("Falha por até 4");
    expect(linhaDoResultado(RC.tabelas.res, "nat1")?.[1]).toContain("Revés");
  });
  it("CD por ★", () => {
    expect([1, 2, 3, 4, 5].map(cdPorEstrelas)).toEqual([10, 13, 16, 19, 22]);
  });
});

describe("parser de faixas (5.5)", () => {
  it.each([
    ["7", 7, 7],
    ["1–9", 1, 9],
    ["25+", 25, Infinity],
    ["10 ou menos", -Infinity, 10],
    ["11 a 16", 11, 16],
    ["24 ou mais", 24, Infinity],
    ["−5 a −4", -5, -4],
    ["1 ou menos", -Infinity, 1],
    ["Renome 0–1", 0, 1],
  ])("%s", (c, a, b) => {
    expect(lerFaixa(c)).toEqual({ min: a, max: b });
  });
  it("d20 + Notoriedade soma o modificador antes de consultar", () => {
    const r = rolarTabela("mp", RC.tabelas.mp, { valorFisico: 15, modificador: 3 });
    expect(r.total).toBe(18);
    expect(r.linha?.[0]).toContain("Ouro");
    expect(consultar(RC.tabelas.mp, 9, 1)?.linha[0]).toContain("Bronze");
  });
  it("expressões de dado livre", () => {
    const r = rolarExpressao("2d6+3", rngFixo(0, 0.99))!;
    expect(r.dados.map((d) => d.valor)).toEqual([1, 6]);
    expect(r.total).toBe(10);
    expect(rolarExpressao("2d6 × 100 PO", rngFixo(0, 0))!.total).toBe(200);
    expect(rolarExpressao("1d4 + 1", rngFixo(0.99))!.total).toBe(5);
    expect(rolarExpressao("banana")).toBeNull();
  });
});

describe("jornadas da forja", () => {
  it("Miguelito pela trilha: 2 / 3 / 4", () => {
    expect([0, 1, 2, 3, 4, 5].map(jornadasMiguelito)).toEqual([2, 2, 3, 3, 4, 4]);
  });
  it("soma: Trazix 5, Miguelito, funcionários, invocação sem Ooze de guarda", () => {
    const j = jornadasDaSemana({ trazixEmDraetyr: true, miguelitoPresente: true, trilha: 1, funcionariosForja: 2, exBandidos: 3, invocacaoAjudante: true, oozeDeGuarda: false });
    expect(j.geral).toBe(5 + 2 + 2 + 1);
    expect(j.balcaoSo).toBe(3);
    expect(j.total).toBe(13);
  });
  it("invocação não conta com o Ooze de guarda; Trazix fora não conta", () => {
    const j = jornadasDaSemana({ trazixEmDraetyr: false, miguelitoPresente: true, trilha: 0, funcionariosForja: 0, exBandidos: 0, invocacaoAjudante: true, oozeDeGuarda: true });
    expect(j.total).toBe(2);
  });
  it("balcão: limite, estoque e escambo", () => {
    const v = vendaBalcao(5, true, 0, 1); // 320 produzidos; limite 100 + 50 = 150
    expect(v.vendido).toBe(150);
    expect(v.estoque).toBe(170);
    expect(v.escambo).toBe(75);
    expect(vendaBalcao(1, false, 2, 0).po).toBe(32);
  });
  it("pedidos por semana e caderno", () => {
    expect([0, 1, 2, 3, 4, 5].map(pedidosPorSemana)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(cdCaderno(1, 3)).toBe(16);
    expect(cdCaderno(3, 3)).toBe(18);
    expect(podeDesmontar(6, false)).toBe(false);
    expect(podeDesmontar(6, true)).toBe(true);
  });
});
