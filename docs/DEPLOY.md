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
   - `SUPABASE_SERVICE_ROLE_KEY` = a chave secreta (`sb_secret_...` ou service_role);
   - `SENHA_INICIAL` = uma senha que **você inventa** (8 letras ou mais). Serve só para criar o primeiro link.
4. Clique em **Deploy**. No fim, a Vercel mostra o endereço do site (ex.: `https://draetyr.vercel.app`).

## Passo 3 · O primeiro link de admin (pelo celular)
1. Abra **`https://SEU-SITE.vercel.app/primeiro-acesso`**.
2. Digite seu **nome** e a **SENHA_INICIAL** que você colocou na Vercel.
3. Toque em **Criar meu link de admin** e **salve o link**. Ele **não aparece de novo**.
4. Abra o link. Na tela de admin, gere os links do **Mestre**, dos **5 jogadores** e o **admin do Lucca**.
5. Cada link vem com a mensagem pronta para o **WhatsApp**.

Essa página só funciona **uma vez**: depois que existe um admin, ela recusa.

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
