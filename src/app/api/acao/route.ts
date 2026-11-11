import { NextResponse } from "next/server";
import { store } from "@/servidor/store";
import { validarToken } from "@/servidor/tokens";
import { executar, Proibido, Invalido } from "@/servidor/acoes";
import { Conflito } from "@/servidor/tipos";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = await validarToken(store(), req.headers.get("x-token"));
  if (!a) return NextResponse.json({ erro: "Link inválido ou revogado." }, { status: 401 });
  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  try {
    const r = await executar(a, String(corpo.acao ?? ""), corpo.dados ?? {});
    return NextResponse.json(r ?? { ok: true });
  } catch (e: any) {
    if (e instanceof Proibido) return NextResponse.json({ erro: e.message }, { status: 403 });
    if (e instanceof Invalido) return NextResponse.json({ erro: e.message }, { status: 400 });
    if (e instanceof Conflito) return NextResponse.json({ erro: e.message }, { status: 409 });
    // nunca devolve detalhes (nem token) na resposta de erro
    console.error("Erro na ação", corpo?.acao, e?.message);
    return NextResponse.json({ erro: "Algo deu errado. Tente de novo." }, { status: 500 });
  }
}
