"use client";
import { frente } from "@/frentes";
import { Provedor, useApp, Aviso } from "./contexto";
import { FrenteCompleta, estiloFrente } from "./frente-completa";
import { DraetyrHoje } from "./draetyr-hoje";

export function PaginaJogador({ token }: { token: string }) {
  return (
    <Provedor token={token}>
      <Conteudo />
      <Aviso />
    </Provedor>
  );
}

function Conteudo() {
  const { dados, carregando, erro, acao } = useApp();
  if (carregando) return <main className="p-6 text-xl">Carregando…</main>;
  if (!dados) return <main className="p-6 text-xl">⚠️ {erro}</main>;
  if (dados.papel !== "jogador") return <main className="p-6 text-xl">Este link não é de jogador.</main>;
  const cfg = frente(dados.frenteId);
  const ctx = { frentes: { [cfg.id]: dados.frente, cidade: { frentes: dados.draetyr.frentes }, radio: { estagio: dados.radioEstagio } }, campanha: dados.campanha };
  const pronto = dados.campanha.turno_pronto;
  return (
    <main className="mx-auto max-w-3xl p-3 pb-24" style={{ ...estiloFrente(cfg.id), background: "var(--fundo)", minHeight: "100vh" }}>
      <header className="cartao" style={{ background: "var(--cor)" }}>
        <div className="text-sm font-bold uppercase tracking-wider">Semana {dados.campanha.semana} · {dados.campanha.estado}</div>
        <h1 className="text-3xl font-bold">
          {cfg.emoji} {cfg.nome}
        </h1>
        <div>
          <b>{cfg.personagem}</b> · {dados.nome}
        </div>
      </header>

      {dados.campanha.alertas?.length > 0 && (
        <section className="cartao mt-3 border-red-500">
          {dados.campanha.alertas.map((a: any) => (
            <div key={a.id} className="font-bold text-red-200">
              🚨 {a.texto}
            </div>
          ))}
        </section>
      )}

      <FrenteCompleta id={cfg.id} estado={dados.frente} ctx={ctx} editavel={!pronto} economiaDraetyr={dados.economiaDraetyr} log={dados.log} pedidos={dados.pedidos} />
      {pronto && <div className="cartao mt-3 text-center">Turno marcado como pronto. Para mexer de novo, reabra o turno.</div>}

      {dados.meusPendentes?.length > 0 && (
        <section className="cartao mt-4">
          <h2 className="text-xl font-bold">📨 Enviados ao Mestre</h2>
          {dados.meusPendentes.map((p: any) => (
            <div key={p.id} className="cartao-claro mt-1 text-sm">
              {p.status === "pendente" ? "⏳" : p.status === "aprovado" ? "✅" : "❌"} {p.texto} {p.motivo_decisao && <span className="opacity-70">· {p.motivo_decisao}</span>}
            </div>
          ))}
        </section>
      )}

      <DraetyrHoje d={dados.draetyr} />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-white/20 bg-black/85 p-3">
        <div className="mx-auto max-w-3xl">
          <button className="btn w-full text-lg" style={{ background: pronto ? "#2e7d32" : "var(--cor)" }} onClick={() => acao("turno_pronto", { pronto: !pronto })}>
            {pronto ? "✔ Turno pronto (toque para reabrir)" : "Marcar turno pronto"}
          </button>
        </div>
      </div>
    </main>
  );
}
