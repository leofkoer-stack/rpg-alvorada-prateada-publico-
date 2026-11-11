import { PaginaJogador } from "@/componentes/pagina-jogador";

export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PaginaJogador token={token} />;
}
