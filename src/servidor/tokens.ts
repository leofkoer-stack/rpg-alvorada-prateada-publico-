import crypto from "node:crypto";
import type { Acesso, Papel, Store } from "./tipos";

export const novoToken = () => crypto.randomBytes(32).toString("base64url");
export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export async function validarToken(s: Store, token: string | null | undefined): Promise<Acesso | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  return s.acessoPorHash(hashToken(token));
}

export async function criarLink(s: Store, papel: Papel, nome: string, frente: string | null) {
  const token = novoToken();
  const a: Acesso = { id: crypto.randomUUID(), hash: hashToken(token), papel, frente, nome, criado_em: new Date().toISOString(), revogado: false };
  await s.criarAcesso(a);
  const prefixo = papel === "mestre" ? "m" : papel === "admin" ? "a" : "j";
  return { acesso: a, caminho: `/${prefixo}/${token}` };
}
