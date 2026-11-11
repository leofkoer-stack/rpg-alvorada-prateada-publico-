"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Op } from "@/motor/ops";

interface Ctx {
  token: string;
  dados: any;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  acao: (acao: string, dados?: any) => Promise<any>;
  aviso: string | null;
  setAviso: (s: string | null) => void;
}
const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(C);
  if (!c) throw new Error("sem contexto");
  return c;
};

/** Busca o estado e atualiza a cada 15 segundos. */
export function Provedor({ token, children }: { token: string; children: React.ReactNode }) {
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const ocupado = useRef(false);

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch("/api/estado", { headers: { "x-token": token }, cache: "no-store" });
      const j = await r.json();
      if (!r.ok) setErro(j.erro ?? "Erro");
      else {
        setErro(null);
        setDados(j);
      }
    } catch {
      setErro("Sem conexão. Tentando de novo…");
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    recarregar();
    const t = setInterval(() => {
      if (!ocupado.current && document.visibilityState === "visible") recarregar();
    }, 15000);
    return () => clearInterval(t);
  }, [recarregar]);

  const acao = useCallback(
    async (acao: string, d?: any) => {
      ocupado.current = true;
      try {
        const r = await fetch("/api/acao", { method: "POST", headers: { "x-token": token, "content-type": "application/json" }, body: JSON.stringify({ acao, dados: d ?? {} }) });
        const j = await r.json();
        if (!r.ok) {
          setAviso(`⚠️ ${j.erro ?? "Erro"}`);
          throw new Error(j.erro);
        }
        await recarregar();
        return j;
      } finally {
        ocupado.current = false;
      }
    },
    [token, recarregar],
  );

  return <C.Provider value={{ token, dados, carregando, erro, recarregar, acao, aviso, setAviso }}>{children}</C.Provider>;
}

/** Atalhos para uma frente. */
export function useFrenteAcoes(frente: string) {
  const { acao } = useApp();
  return {
    ops: (ops: Op[], motivo: string, rolagem?: any) => acao("ops", { frente, ops, motivo, rolagem }),
    rolarTabela: (tabela: string, extra?: { fisico?: number | null; modificadorExtra?: number; motivo?: string }) =>
      acao("rolar", { frente, tipo: "tabela", tabela, ...extra }),
    rolarTeste: (p: { bonus: number; cd: number; modo?: string; extras?: string[]; fisico?: number | null; rotulo?: string; tabelaResultado?: string; motivo?: string }) =>
      acao("rolar", { frente, tipo: "teste", ...p }),
    rolarLivre: (expressao: string, motivo?: string) => acao("rolar", { frente, tipo: "livre", expressao, motivo }),
    nota: (texto: string) => acao("nota", { frente, texto }),
    ligacao: (id: string, escolha?: string) => acao("ligacao", { id, escolha }),
  };
}

export function Aviso() {
  const { aviso, setAviso, erro } = useApp();
  useEffect(() => {
    if (aviso) {
      const t = setTimeout(() => setAviso(null), 6000);
      return () => clearTimeout(t);
    }
  }, [aviso, setAviso]);
  const txt = aviso ?? erro;
  if (!txt) return null;
  return (
    <div className="fixed bottom-3 left-1/2 z-50 w-[92%] max-w-lg -translate-x-1/2 rounded-xl border-2 border-yellow-400 bg-black/90 p-3 text-center font-bold" onClick={() => setAviso(null)}>
      {txt}
    </div>
  );
}
