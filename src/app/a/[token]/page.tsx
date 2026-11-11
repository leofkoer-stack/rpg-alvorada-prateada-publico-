import { PaginaAdmin } from "@/componentes/pagina-admin";

export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PaginaAdmin token={token} />;
}
