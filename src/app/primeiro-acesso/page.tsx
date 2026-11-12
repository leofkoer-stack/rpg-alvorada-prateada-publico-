"use client";
import { useState } from "react";

export default function PrimeiroAcesso() {
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("Leonardo");
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  return (
    <main className="mx-auto max-w-lg p-5">
      <h1 className="text-3xl font-bold">🔑 Primeiro acesso</h1>
      <p className="mt-2">
        Crie o <b>primeiro link de admin</b>. Isso só funciona <b>uma vez</b>.
      </p>
      {!link ? (
        <div className="cartao mt-4 grid gap-3">
          <label>
            Seu nome
            <input className="entrada mt-1 w-full" value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <label>
            Senha inicial (a mesma da Vercel)
            <input className="entrada mt-1 w-full" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          <button
            className="btn"
            onClick={async () => {
              setErro(null);
              const r = await fetch("/api/primeiro-acesso", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ senha, nome }) });
              const j = await r.json();
              if (!r.ok) setErro(j.erro ?? "Erro");
              else setLink(`${window.location.origin}${j.caminho}`);
            }}
          >
            Criar meu link de admin
          </button>
          {erro && <div className="font-bold text-yellow-300">⚠️ {erro}</div>}
        </div>
      ) : (
        <div className="cartao mt-4 grid gap-3">
          <div className="font-bold text-yellow-200">⚠️ Este link aparece só agora. Salve antes de sair desta página.</div>
          <textarea className="entrada w-full" rows={3} readOnly value={link} />
          <button className="btn" onClick={() => navigator.clipboard.writeText(link)}>
            📋 Copiar link
          </button>
          <a className="btn btn-sec" href={link}>
            Abrir o painel de admin
          </a>
        </div>
      )}
    </main>
  );
}
