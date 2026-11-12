"use client";
import { useState } from "react";
import { FRENTES_JOGADORES, frente } from "@/frentes";
import { Provedor, useApp, Aviso } from "./contexto";
import { Secao } from "./ui";

export function PaginaAdmin({ token }: { token: string }) {
  return (
    <Provedor token={token}>
      <Conteudo />
      <Aviso />
    </Provedor>
  );
}

const DICA_LINK = `\n\n📱 *Como guardar:*\n1. Abra o link no *navegador* (Chrome ou Safari).\n2. Toque nos *três pontinhos* (ou em *Compartilhar*, no iPhone).\n3. Toque em *Adicionar à tela inicial*.\nVira um ícone, como um aplicativo.\n\n🔒 *Não passe o link para ninguém*: quem tem o link entra como você. Se perder, me avise que eu gero outro.`;

function textoZap(nome: string, papel: string, frenteId: string | null, link: string) {
  if (papel === "mestre") return `🏙️ *Painel de Draetyr*\nOi, ${nome}! Este é o seu link do *painel do Mestre*:\n${link}${DICA_LINK}`;
  if (papel === "admin") return `🔧 *Painel de Draetyr · admin*\n${nome}, este é o seu link de *admin* (gera e revoga os links do grupo):\n${link}${DICA_LINK}`;
  const f = frente(frenteId!);
  return `${f.emoji} *Painel de Draetyr*\nOi, ${nome}! Este é o link da sua frente: *${f.nome}* (${f.personagem}).\n${link}\n\n✅ Toda semana: faça o turno e toque em *Turno pronto*.${DICA_LINK}`;
}

function Conteudo() {
  const { dados, carregando, erro, acao } = useApp();
  const [papel, setPapel] = useState("jogador");
  const [frenteId, setFrenteId] = useState(FRENTES_JOGADORES[0].id);
  const [nome, setNome] = useState("");
  const [novo, setNovo] = useState<{ texto: string; link: string } | null>(null);
  const [imp, setImp] = useState<File | null>(null);
  if (carregando) return <main className="p-6 text-xl">Carregando…</main>;
  if (!dados) return <main className="p-6 text-xl">⚠️ {erro}</main>;
  if (dados.papel !== "admin") return <main className="p-6 text-xl">Este link não é de admin.</main>;

  const sugerido = papel === "jogador" ? frente(frenteId).dono : papel === "mestre" ? "Lucca" : "";

  return (
    <main className="mx-auto max-w-3xl p-3 pb-16">
      <h1 className="text-3xl font-bold">🔧 Admin · Painel de Draetyr</h1>
      <div>Olá, {dados.nome}.</div>

      <Secao titulo="Gerar link" emoji="🔗">
        <div className="grid gap-2 sm:grid-cols-3">
          <select className="entrada" value={papel} onChange={(e) => setPapel(e.target.value)}>
            <option value="jogador">Jogador</option>
            <option value="mestre">Mestre</option>
            <option value="admin">Admin</option>
          </select>
          {papel === "jogador" && (
            <select className="entrada" value={frenteId} onChange={(e) => setFrenteId(e.target.value)}>
              {FRENTES_JOGADORES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.nome} · {f.dono}
                </option>
              ))}
            </select>
          )}
          <input className="entrada" placeholder={sugerido || "nome"} value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <button
          className="btn mt-2"
          onClick={async () => {
            const n = nome || sugerido || "Sem nome";
            if (!confirm(`Gerar um link de ${papel} para ${n}?`)) return;
            const r = await acao("criar_link", { papel, frente: papel === "jogador" ? frenteId : null, nome: n });
            const link = `${window.location.origin}${r.caminho}`;
            setNovo({ link, texto: textoZap(n, papel, papel === "jogador" ? frenteId : null, link) });
            setNome("");
          }}
        >
          Gerar
        </button>
        {novo && (
          <div className="cartao-claro mt-2">
            <div className="text-sm font-bold text-yellow-200">⚠️ Este link aparece só agora. Copie e mande.</div>
            <textarea className="entrada mt-1 w-full" rows={6} readOnly value={novo.texto} />
            <div className="mt-1 flex flex-wrap gap-2">
              <button className="btn" onClick={() => navigator.clipboard.writeText(novo.texto)}>
                📋 Copiar mensagem
              </button>
              <a className="btn btn-sec" href={`https://wa.me/?text=${encodeURIComponent(novo.texto)}`} target="_blank" rel="noreferrer">
                💬 Abrir no WhatsApp
              </a>
              <button className="btn btn-sec" onClick={() => setNovo(null)}>
                Fechar
              </button>
            </div>
          </div>
        )}
      </Secao>

      <Secao titulo="Links ativos" emoji="🗝️">
        <div className="grid gap-1">
          {dados.acessos.map((a: any) => (
            <div key={a.id} className={`cartao-claro flex items-center justify-between gap-2 ${a.revogado ? "opacity-40" : ""}`}>
              <span>
                <b>{a.nome}</b> · {a.papel} {a.frente ? `· ${frente(a.frente).emoji} ${frente(a.frente).nome}` : ""} {a.revogado && "· revogado"}
                <div className="text-xs opacity-70">criado em {new Date(a.criado_em).toLocaleDateString("pt-BR")}</div>
              </span>
              {!a.revogado && (
                <button className="btn btn-mini btn-sec" onClick={() => confirm(`Revogar o link de ${a.nome}? Quem tiver esse link perde o acesso.`) && acao("revogar", { id: a.id })}>
                  Revogar
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 text-sm opacity-80">O link completo não fica guardado (só o hash). Perdeu? Revogue e gere outro.</div>
      </Secao>

      <Secao titulo="Bônus dos personagens" emoji="🎯">
        {FRENTES_JOGADORES.map((f) => {
          const b = dados.bonus[f.id];
          if (f.id === "culto") {
            return (
              <div key={f.id} className="cartao-claro mt-1">
                <b>
                  {f.emoji} {f.personagem}
                </b>
                {(b.lideres ?? []).map((l: any, i: number) => (
                  <label key={i} className="mt-1 flex items-center gap-2 text-sm">
                    {l.nome}:
                    {typeof l.bonus === "object" && l.bonus ? (
                      Object.entries(l.bonus).map(([k, v]) => <Bonus key={k} rotulo={k} valor={v as number} onSalvar={(n) => acao("ops", { frente: "culto", ops: [{ op: "definir", caminho: `lideres.${i}.bonus.${k}`, valor: n }], motivo: `Bônus ${l.nome} ${k} = ${n}` })} />)
                    ) : typeof l.bonus === "string" ? (
                      <span className="opacity-80">{l.bonus}</span>
                    ) : (
                      <Bonus rotulo="bônus" valor={l.bonus} onSalvar={(n) => acao("ops", { frente: "culto", ops: [{ op: "definir", caminho: `lideres.${i}.bonus`, valor: n }], motivo: `Bônus ${l.nome} = ${n}` })} />
                    )}
                  </label>
                ))}
              </div>
            );
          }
          if (!b?.chave) return null;
          const v = b.valor ?? {};
          const plano = Object.entries(v).filter(([, x]) => typeof x === "number" || x == null);
          const aninhado = Object.entries(v).filter(([, x]) => x && typeof x === "object" && !Array.isArray(x));
          return (
            <div key={f.id} className="cartao-claro mt-1">
              <b>
                {f.emoji} {f.personagem}
              </b>
              <div className="flex flex-wrap gap-2">
                {plano.map(([k, x]) => (
                  <Bonus key={k} rotulo={k} valor={x as number} onSalvar={(n) => acao("ops", { frente: f.id, ops: [{ op: "definir", caminho: `${b.chave}.${k}`, valor: n }], motivo: `Bônus ${k} = ${n}` })} />
                ))}
                {aninhado.map(([k, o]) =>
                  Object.entries(o as any).map(([k2, x]) => (
                    <Bonus key={k + k2} rotulo={`${k2}`} valor={x as number} onSalvar={(n) => acao("ops", { frente: f.id, ops: [{ op: "definir", caminho: `${b.chave}.${k}.${k2}`, valor: n }], motivo: `Bônus ${k2} = ${n}` })} />
                  )),
                )}
              </div>
            </div>
          );
        })}
      </Secao>

      <Secao titulo="Backup" emoji="💾">
        <button
          className="btn"
          onClick={async () => {
            const d = await acao("exportar");
            const blob = new Blob([JSON.stringify(d, null, 1)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `draetyr-semana-${d.campanha?.semana ?? "x"}.json`;
            a.click();
          }}
        >
          ⬇️ Exportar tudo (JSON)
        </button>
        <div className="mt-3">
          <input type="file" accept="application/json" onChange={(e) => setImp(e.target.files?.[0] ?? null)} />
          <button
            className="btn btn-sec mt-2"
            disabled={!imp}
            onClick={async () => {
              if (!imp || !confirm("Importar o backup? O estado atual será SUBSTITUÍDO (os links continuam).")) return;
              const d = JSON.parse(await imp.text());
              await acao("importar", { dados: d });
              alert("Backup importado.");
            }}
          >
            ⬆️ Importar backup
          </button>
        </div>
      </Secao>
    </main>
  );
}

function Bonus({ rotulo, valor, onSalvar }: { rotulo: string; valor: number | null; onSalvar: (n: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-sm">
      {rotulo}
      <input
        className="entrada w-16"
        inputMode="numeric"
        defaultValue={valor ?? ""}
        placeholder="?"
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (e.target.value !== "" && !Number.isNaN(n) && n !== valor) onSalvar(n);
        }}
      />
    </label>
  );
}
