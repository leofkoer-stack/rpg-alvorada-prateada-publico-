import fs from "node:fs";
import path from "node:path";

/** Serve os PDFs de referência (só os da pasta, pelo nome). */
export async function GET(_req: Request, { params }: { params: Promise<{ arquivo: string }> }) {
  const { arquivo } = await params;
  const nome = path.basename(decodeURIComponent(arquivo));
  if (!nome.endsWith(".pdf")) return new Response("Não encontrado", { status: 404 });
  const p = path.join(process.cwd(), "referencia", nome);
  if (!fs.existsSync(p)) return new Response("Não encontrado", { status: 404 });
  return new Response(fs.readFileSync(p), { headers: { "content-type": "application/pdf", "cache-control": "public, max-age=3600" } });
}
