import { PaginaMestre } from "@/componentes/pagina-mestre";

export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PaginaMestre token={token} />;
}
