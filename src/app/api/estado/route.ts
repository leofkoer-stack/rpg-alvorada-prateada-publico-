import { NextResponse } from "next/server";
import { store } from "@/servidor/store";
import { validarToken } from "@/servidor/tokens";
import { visao } from "@/servidor/visoes";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await validarToken(store(), req.headers.get("x-token"));
  if (!a) return NextResponse.json({ erro: "Link inválido ou revogado." }, { status: 401 });
  return NextResponse.json(await visao(a));
}
