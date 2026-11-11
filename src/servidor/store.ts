import { StoreArquivo } from "./store-arquivo";
import { StoreSupabase } from "./store-supabase";
import type { Store } from "./tipos";

let unico: Store | null = null;

/** Supabase quando há SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY; senão, arquivo local (.data/db.json). */
export function store(): Store {
  if (unico) return unico;
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  unico = url && chave ? new StoreSupabase(url, chave) : new StoreArquivo();
  return unico;
}
export function usarStore(s: Store) {
  unico = s;
}
