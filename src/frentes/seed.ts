import inicial from "@dados/estado-inicial.json";
import zonasJson from "@dados/zonas.json";
import regrasForja from "@dados/regras-forja.json";
import regrasRadio from "@dados/regras-radio.json";
import { bonusRank } from "./guilda";
import { contarEstrelas } from "@/motor/teste";
import type { Obj } from "@/motor/tipos";

export const ZONAS: { id: string; nome: string; onde: string; poder_dominante: string | null }[] = (zonasJson as any).zonas;

const medida = (n: number | null | undefined) => ({ nivel: n ?? 0, marcas: 0 });
let seq = 0;
export const novoId = (p = "x") => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Estado da campanha (semana, turnos, contadores de periódicos, alertas). */
export function campanhaInicial(): Obj {
  return {
    semana: (inicial as any).semana ?? 1,
    estado: "aberta",
    turno_pronto: {},
    config: { bordas: { zerarNoMinimo: true, marcasMaxNoTopo: 4 } },
    periodicos: {},
    disparados: {},
    ultimos_estagios: {},
    alertas: [],
  };
}

/**
 * Converte o estado-inicial.json na forma usada pelo app.
 * Valores null continuam null ("a definir"); "proposta": true é preservado.
 */
export function estadosIniciais(): Record<string, Obj> {
  const I: any = JSON.parse(JSON.stringify(inicial));
  const base = { ocultos: [], notas: [], efeitos: [], semanal: {} };

  const cidade = {
    ...base,
    ...I.cidade,
    projetos: [],
    acoes_semana: [],
    evento_semana: null,
  };
  delete cidade.projetos_disponiveis;

  const g = I.guilda;
  const guilda = {
    ...base,
    cofre_pl: g.cofre.valor,
    cofre_pl_disponivel: null, // "a confirmar": o Mestre preenche
    cofre_po: null,
    taxa_percentual: g.taxa_percentual,
    manutencao_po_semana: g.manutencao_po_semana,
    instalacoes: g.instalacoes,
    equipe: g.equipe,
    elenco: g.elenco.map((e: any) => ({
      ...e,
      id: novoId("g"),
      pjs: e.grupo === "Grupo dos PJs",
      bonus: bonusRank(e.rank),
      estado: "livre",
      ferido_ate: null,
    })),
    quadro: g.quadro,
    bonus_proxima_missao: [],
  };

  const c = I.culto;
  const culto = {
    ...base,
    ...c,
    raizes_por_zona: Object.fromEntries(ZONAS.map((z) => [z.id, c.raizes_por_zona?.[z.id] ?? 0])),
  };

  const r = I.radio;
  const ini = (regrasRadio as any).tabelas.ini.linhas as string[][];
  const radio = {
    ...base,
    ...r,
    sinal_por_zona: Object.fromEntries(ZONAS.map((z) => [z.id, medida(r.sinal_por_zona?.[z.id])])),
    fontes: ini.map((l) => ({ id: novoId("f"), nome: l[0], quem: l[1], estrelas: contarEstrelas(l[2]), origem: l[3], estado: l[4] })),
    grade: { manha: false, meio_dia: false, tarde: false, noite: false, madrugada: false },
    pautas_semana: [],
    especiais_semana: [],
    contratos: [],
    desdobramentos: [],
  };
  delete radio.fontes_iniciais;

  const s = I.submundo;
  const submundo = {
    ...base,
    ...s,
    rede_por_zona: Object.fromEntries(ZONAS.map((z) => [z.id, medida(s.rede_por_zona?.[z.id])])),
    contatos: s.contatos.map((x: any) => ({ id: novoId("c"), ...x })),
    rastros: s.rastros.map((x: any) => ({ id: novoId("r"), ...x })),
    quadro: [],
    sussurros: [],
  };

  const k = I.caldeirao;
  const caldeirao = {
    ...base,
    ...k,
    despensa: { frescas: k.despensa.frescas ?? 0, comuns: k.despensa.comuns ? [{ qtd: k.despensa.comuns, validade_semana: I.semana + 3 }] : [], raras: k.despensa.raras ?? 0, ervas: 0, nota: k.despensa.nota },
    fundos: k.fundos.map((f: any) => ({ ...f, cuidado_semana: false, dobro_semana: false, semanas_sem_cuidado: 0 })),
  };

  const f = I.forja;
  const vistos = (regrasForja as any).tabelas.vistos.linhas as string[][];
  const para: Record<string, string> = { "ECLIPSE e SOLARIS": "submundo", "Pedras transmissoras e aparelhos da rádio": "radio" };
  const forja = {
    ...base,
    ...f,
    fila: f.fila.map((p: any) => ({ id: novoId("p"), status: "aberto", jornadas_feitas: 0, ...p, para: para[p.pedido] ?? null })),
    caderno: {
      avancos: f.caderno.avancos,
      fenomenos: vistos.map((l) => ({ id: novoId("fe"), nome: l[0], onde: l[1], circulo: null, passo: 0 })),
    },
    jornadas: {
      trazix_em_draetyr: false, // o Trazix está em Lavenya
      miguelito_presente: true,
      funcionarios_forja: 0,
      funcionarios_balcao: 0,
      ex_bandidos: null,
      invocacao_ajudante: false,
      ooze_de_guarda: true,
      distribuicao: {},
      balcao: 0,
    },
  };

  return { cidade, guilda, culto, radio, submundo, caldeirao, forja };
}
