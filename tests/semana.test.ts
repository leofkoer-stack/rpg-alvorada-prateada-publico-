import { describe, it, expect } from "vitest";
import { estadosIniciais, campanhaInicial } from "@/frentes/seed";
import { fecharSemana, opsDoPendente } from "@/semana/fechar";
import { aplicarNoBanco, type Banco } from "@/semana/aplicar";
import { efeitoParaOps, lerEscolha, avaliarCondicao } from "@/semana/ligacoes";

const novo = (): Banco => ({ campanha: campanhaInicial(), frentes: estadosIniciais() });

describe("seed", () => {
  it("carrega as 7 frentes e preserva null como 'a definir'", () => {
    const b = novo();
    expect(Object.keys(b.frentes).sort()).toEqual(["caldeirao", "cidade", "culto", "forja", "guilda", "radio", "submundo"]);
    expect(b.frentes.cidade.cofre_po).toBeNull();
    expect(b.frentes.guilda.cofre_pl).toBe(12000);
    expect(b.frentes.guilda.cofre_pl_disponivel).toBeNull();
    expect(b.frentes.submundo.rede_por_zona.draetyr).toEqual({ nivel: 2, marcas: 0 });
    expect(Object.keys(b.frentes.radio.sinal_por_zona).length).toBe(13);
    expect(b.frentes.forja.proposta).toBe(true);
  });
});

describe("periódicos", () => {
  it("dispara a cada 4 semanas enquanto a condição vale e zera quando deixa de valer", () => {
    let b = novo();
    b.frentes.caldeirao.pertencimento = { nivel: 3, marcas: 0 };
    let pend: any[] = [];
    for (let i = 0; i < 3; i++) {
      const r = fecharSemana(b);
      b = r.banco;
      pend = pend.concat(r.pendentes.filter((p) => p.ligacao_id === "caldeirao-pertencimento-3"));
    }
    expect(pend.length).toBe(0);
    expect(b.campanha.periodicos["caldeirao-pertencimento-3"]).toBe(3);
    // condição cai: contador zera
    b.frentes.caldeirao.pertencimento = { nivel: 2, marcas: 0 };
    b = fecharSemana(b).banco;
    expect(b.campanha.periodicos["caldeirao-pertencimento-3"]).toBe(0);
    // volta a valer: precisa de 4 semanas inteiras
    b.frentes.caldeirao.pertencimento = { nivel: 3, marcas: 0 };
    for (let i = 0; i < 4; i++) {
      const r = fecharSemana(b);
      b = r.banco;
      pend = pend.concat(r.pendentes.filter((p) => p.ligacao_id === "caldeirao-pertencimento-3"));
    }
    expect(pend.length).toBe(1);
    expect(b.campanha.periodicos["caldeirao-pertencimento-3"]).toBe(0);
  });
  it("lorde hostil tira 1 marca de Economia a cada 4 semanas", () => {
    let b = novo();
    b.frentes.cidade.governo = "lorde_hostil";
    b.frentes.cidade.frentes.economia = { nivel: 2, marcas: 2 };
    for (let i = 0; i < 4; i++) b = fecharSemana(b).banco;
    expect(b.frentes.cidade.frentes.economia).toEqual({ nivel: 2, marcas: 1 });
  });
  it("condições", () => {
    const b = novo();
    expect(avaliarCondicao("forja.renome>=3", b.frentes)).toBe(false);
    b.frentes.forja.renome.nivel = 3;
    expect(avaliarCondicao("forja.renome>=3", b.frentes)).toBe(true);
  });
});

describe("fechamento da semana", () => {
  it("converte marcas, respeita o teto do governo e anda os relógios da tabela rel", () => {
    let b = novo();
    b.frentes.cidade.frentes.influencia = { nivel: 2, marcas: 5 }; // regime especial: teto 2
    b.frentes.cidade.frentes.notoriedade = { nivel: 0, marcas: 4 };
    const r = fecharSemana(b);
    expect(r.banco.frentes.cidade.frentes.influencia).toEqual({ nivel: 2, marcas: 4 });
    expect(r.banco.frentes.cidade.frentes.notoriedade).toEqual({ nivel: 1, marcas: 0 });
    expect(r.banco.frentes.cidade.relogios.atencao_do_inferno.valor).toBe(1);
    expect(r.banco.campanha.semana).toBe(2);
    expect(r.snapshot.campanha.semana).toBe(1);
  });
  it("teto da rádio: Audiência presa sem Torre", () => {
    const b = novo();
    b.frentes.radio.audiencia = { nivel: 1, marcas: 4 };
    expect(fecharSemana(b).banco.frentes.radio.audiencia).toEqual({ nivel: 1, marcas: 4 });
    b.frentes.radio.sinal_por_zona.draetyr = { nivel: 2, marcas: 0 };
    expect(fecharSemana(b).banco.frentes.radio.audiencia).toEqual({ nivel: 2, marcas: 0 });
  });
  it("relógio cheio gera alerta e dispara a ligação automática", () => {
    const b = novo();
    b.frentes.radio.relogios.pressao.valor = 6;
    const r = fecharSemana(b);
    expect(r.alertasNovos.some((a) => a.chave === "cheio:radio:relogios.pressao")).toBe(true);
    expect(r.pendentes.some((p) => p.ligacao_id === "radio-pressao-cheia")).toBe(true);
    // não repete enquanto o alerta não for resolvido
    const r2 = fecharSemana(r.banco);
    expect(r2.pendentes.some((p) => p.ligacao_id === "radio-pressao-cheia")).toBe(false);
  });
  it("estágio do Caldeirão 2 dispara 'portas abertas' uma vez", () => {
    let b = novo();
    b.frentes.caldeirao.estagio = 2;
    const r = fecharSemana(b);
    expect(r.pendentes.filter((p) => p.ligacao_id === "caldeirao-portas-abertas").length).toBe(1);
    expect(fecharSemana(r.banco).pendentes.filter((p) => p.ligacao_id === "caldeirao-portas-abertas").length).toBe(0);
  });
  it("prazos da forja andam e o atraso tira marca de Palavra", () => {
    const b = novo();
    b.frentes.forja.fila[0].prazo = 0;
    const r = fecharSemana(b);
    expect(r.banco.frentes.forja.fila[0].prazo).toBe(-1);
    expect(r.banco.frentes.forja.palavra.marcas).toBe(-1);
  });
  it("frescas estragam e os fundos cuidados produzem", () => {
    const b = novo();
    b.frentes.caldeirao.despensa.frescas = 5;
    b.frentes.caldeirao.fundos[0].cuidado_semana = true;
    const r = fecharSemana(b);
    expect(r.banco.frentes.caldeirao.despensa.frescas).toBe(4);
  });
  it("aprovar um pendente aplica as marcas na cidade", () => {
    let b = novo();
    const ops = efeitoParaOps({ alvo: "cidade.notoriedade", marcas: 1 }, null, b.frentes, "Grade completa");
    for (const o of ops) b = aplicarNoBanco(b, o.frente, o.op, "Mestre", o.descricao).banco;
    expect(b.frentes.cidade.frentes.notoriedade.marcas).toBe(1);
  });
  it("escolha do jogador", () => {
    expect(lerEscolha("forja.relogio.cobica −2")).toEqual({ alvo: "forja.relogio.cobica", delta: -2 });
    expect(lerEscolha("cidade.moral (se for para os refugiados)")).toEqual({ alvo: "cidade.moral", delta: null });
    let b = novo();
    const p = { efeitos: [{ alvo: "escolha" }], escolha: "forja.relogio.cobica −2", texto: "x" } as any;
    for (const o of opsDoPendente(p, b.frentes)) b = aplicarNoBanco(b, o.frente, o.op, "Mestre", o.descricao).banco;
    expect(b.frentes.forja.relogios.cobica.valor).toBe(0);
  });
});
