# 🚀 Deploy do Painel de Draetyr

Tudo é **gratuito**. São **3 serviços**: **GitHub** (o código), **Supabase** (o banco) e **Vercel** (o site).
Faça **um passo por vez**.

---

## Passo 1 · Supabase (o banco)
1. Entre em **supabase.com** e faça login com o **GitHub**.
2. Clique em **New project**. Nome: `draetyr`. Escolha uma **senha** e a região **South America (São Paulo)**.
3. Espere o projeto ficar pronto (uns 2 minutos).
4. No menu da esquerda, abra **SQL Editor**.
5. Copie **todo** o arquivo `supabase/schema.sql`, cole e clique em **Run**.
6. Abra **Project Settings → API** e anote:
   - **Project URL** (é o `SUPABASE_URL`);
   - a chave **service_role** (é o `SUPABASE_SERVICE_ROLE_KEY`). ⚠️ **Nunca** mostre essa chave para ninguém.

## Passo 2 · Vercel (o site)
1. Entre em **vercel.com** e faça login com o **GitHub**.
2. Clique em **Add New → Project** e escolha o repositório `rpg-alvorada-prateada-publico-`.
3. Em **Environment Variables**, adicione:
   - `SUPABASE_URL` = o Project URL;
   - `SUPABASE_SERVICE_ROLE_KEY` = a chave service_role.
4. Clique em **Deploy**. No fim, a Vercel mostra o endereço do site (ex.: `https://draetyr.vercel.app`).

## Passo 3 · O primeiro link de admin
O primeiro link nasce no computador, uma vez só.
1. Num terminal, dentro da pasta do projeto:
   ```
   npm install
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SITE_URL=https://draetyr.vercel.app npm run criar-admin -- "Leonardo"
   ```
2. O terminal mostra o **link de admin**. Guarde: ele **não aparece de novo**.
3. Abra o link. Na tela de admin, gere os links do **Mestre**, dos **5 jogadores** e o **admin do Lucca**.
4. Cada link vem com a mensagem pronta para o **WhatsApp**.

## Rodar no próprio computador (sem conta nenhuma)
```
npm install
npm run criar-admin -- "Leonardo"
npm run dev
```
Abra o link que aparecer. O banco fica em `.data/db.json`.

## Comandos úteis
| Comando | O que faz |
|---|---|
| `npm test` | Roda os **testes automáticos** do motor |
| `npm run simular` | Roda **uma semana inteira** de teste e gera `docs/simulacao-semana-1.md` |
| `npm run criar-admin -- "Nome"` | Cria um **link de admin** |
