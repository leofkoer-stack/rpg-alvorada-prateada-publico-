# 🏙️ Painel de Draetyr

Web app de **gestão semanal (downtime)** da campanha **Alvorada Prateada** (D&D 5e).

- 🎩 **Mestre** (`/m/<link>`): a cidade de **Draetyr**, a **guilda**, a **caixa de entrada** e o **fechamento da semana**.
- 🎭 **Jogadores** (`/j/<link>`): cada um cuida da **própria frente** (Culto, Rádio, Forja, Caldeirão, Submundo).
- 🔧 **Admin** (`/a/<link>`): gera e revoga **links**, edita **bônus**, faz **backup**.

## Como está organizado
| Pasta | O que tem |
|---|---|
| `dados/` | As **regras** (JSON), o **estado inicial**, as **ligações** e as **zonas** |
| `referencia/` | Os **6 PDFs** das mecânicas |
| `src/motor/` | O **motor de regras** (marcas, testes, tabelas, relógios), sem tela |
| `src/frentes/` | Um **arquivo de configuração por frente** |
| `src/semana/` | **Fechamento da semana**, ligações e periódicos |
| `src/servidor/` | **Banco** (arquivo local ou Supabase), **links** e permissões |
| `src/componentes/` | As **telas** |
| `tests/` | **Testes automáticos** |
| `supabase/schema.sql` | As tabelas do banco |

## 7ª frente (Hrasvelge)
1. `dados/regras-hrasvelge.json`
2. `src/frentes/hrasvelge.ts` (copie uma frente parecida)
3. Uma linha em `src/frentes/index.ts`
4. O estado dela em `dados/estado-inicial.json` (entra sozinho no banco)

## Deploy
Veja **`docs/DEPLOY.md`**.
