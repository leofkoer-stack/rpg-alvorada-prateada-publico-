/**
 * Cria o PRIMEIRO link de admin (para o Leonardo ou o Mestre).
 * Uso: npm run criar-admin -- "Leonardo"   (com SITE_URL=https://seu-site.vercel.app para o link completo)
 * O link aparece uma vez só, aqui no terminal. Guarde-o: o banco guarda só o hash.
 */
import { store } from "../src/servidor/store";
import { criarLink } from "../src/servidor/tokens";
import { garantirSeed } from "../src/servidor/nucleo";

async function main() {
  const nome = process.argv[2] || "Admin";
  await garantirSeed();
  const r = await criarLink(store(), "admin", nome, null);
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  process.stdout.write(`\nLink de admin para ${nome}:\n${base}${r.caminho}\n\nAbra esse link para gerar os links do Mestre e dos jogadores.\n`);
}
main().catch((e) => {
  process.stderr.write(`Erro: ${e.message}\n`);
  process.exit(1);
});
