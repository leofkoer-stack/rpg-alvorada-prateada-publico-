import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { store } from "@/servidor/store";
import { criarLink } from "@/servidor/tokens";
import { garantirSeed } from "@/servidor/nucleo";

export const dynamic = "force-dynamic";

/**
 * Cria o PRIMEIRO link de admin pelo navegador (sem terminal).
 * Só funciona se: (1) a variável SENHA_INICIAL existir no servidor,
 * (2) a senha digitada for igual, e (3) ainda não existir nenhum admin ativo.
 */
export async function POST(req: Request) {
  const senhaServidor = process.env.SENHA_INICIAL ?? "";
  if (senhaServidor.length < 8) return NextResponse.json({ erro: "A senha inicial não foi configurada no servidor (variável SENHA_INICIAL, com 8 caracteres ou mais)." }, { status: 400 });
  let corpo: any = {};
  try {
    corpo = await req.json();
  } catch {}
  const senha = String(corpo.senha ?? "");
  const a = crypto.createHash("sha256").update(senha).digest();
  const b = crypto.createHash("sha256").update(senhaServidor).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    await new Promise((r) => setTimeout(r, 1500));
    return NextResponse.json({ erro: "Senha errada." }, { status: 403 });
  }
  const s = store();
  await garantirSeed();
  if ((await s.acessos()).some((x) => x.papel === "admin" && !x.revogado))
    return NextResponse.json({ erro: "O primeiro admin já foi criado. Peça um link novo a quem já é admin." }, { status: 409 });
  const r = await criarLink(s, "admin", String(corpo.nome ?? "").slice(0, 60) || "Admin", null);
  return NextResponse.json({ caminho: r.caminho });
}
