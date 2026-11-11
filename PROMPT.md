# Painel de Draetyr — prompt para o Claude Code

## 1. Missão

Construa um **web app de gestão semanal (downtime)** para uma mesa de D&D 5e, a campanha **Alvorada Prateada**.

- O **Mestre** gerencia, num **painel central**, a cidade de **Draetyr** e a guilda **Alvorada Prateada**. Ele vê todas as frentes.
- Cada **jogador** abre o **próprio link** e gerencia a sua frente, que é o negócio do personagem dele.
- Tudo anda em **semanas de jogo**. O Mestre fecha a semana, e o app aplica as regras e guarda o histórico.

**Quem pediu (Leonardo) não é programador.** Fale com ele em português do Brasil, em tom casual e direto. Use mensagens curtas, títulos curtos e palavras-chave em **negrito**, porque ele tem dislexia. Faça todas as perguntas **de uma vez**, numa mensagem só e em múltipla escolha. Explique a instalação e o deploy **um passo por vez**. **Peça confirmação** antes de criar contas, publicar ou apagar qualquer coisa.

## 2. O que vem neste pacote

| Arquivo | O que é |
|---|---|
| `PROMPT.md` | Este documento: escopo, regras do motor e recorte de cada frente |
| `dados/regras-<frente>.json` | **Todas as tabelas** de cada mecânica, limpas: `titulo`, `colunas`, `linhas`, mais `semana` (os passos da semana). Cidade e culto trazem o `d100` numerado de 1 a 100 |
| `dados/estado-inicial.json` | O estado da **semana 1** de todas as frentes |
| `dados/ligacoes.json` | Os **efeitos de uma frente em outra**, já estruturados |
| `dados/zonas.json` | As **13 zonas** do mundo, usadas por várias frentes |
| `referencia/*.pdf` | Os 6 documentos completos das mecânicas |

**Fonte da verdade:** as tabelas vêm dos JSON. O texto das regras vem deste prompt e dos PDFs. Se o prompt e o PDF divergirem, **pare e pergunte**. **Não invente regra nem cânone**: o que faltar vira campo editável ou pergunta.

## 3. Quem usa

| Papel | Pessoa | Personagem | Frente | JSON |
|---|---|---|---|---|
| Mestre | Lucca | — | Cidade de Draetyr + guilda | `regras-cidade.json` |
| Jogador | Pedro | Simon | 🩸 Culto | `regras-culto.json` |
| Jogador | Leonardo | Mandy | 📻 Rádio e gravadora | `regras-radio.json` |
| Jogador | Bertran | Trazix | ⚒️ Forja Rodas e Engrenagens | `regras-forja.json` |
| Jogador | Fábio | Chopp | 🍲 Caldeirão Trovejante | `regras-caldeirao.json` |
| Jogador | Kaio | Felnun | 🗡️ Contatos do submundo | `regras-submundo.json` |

- **Hrasvelge (Davi)** fica de fora por enquanto. O sistema deve aceitar uma **7ª frente** depois sem retrabalho, só com um JSON novo e um arquivo de configuração.
- **Admin:** Leonardo e o Mestre geram e revogam links.

## 4. Decisões padrão

Use estas decisões, a menos que o Leonardo troque alguma antes de você começar.

| # | Decisão | Padrão | Alternativa |
|---|---|---|---|
| D1 | Acesso | **Link secreto por pessoa** (token longo na URL, guardado com hash no banco), sem login | Login por e-mail (link mágico) |
| D2 | Dados | **O app rola** e registra no log; também dá para **digitar uma rolagem física** | Só dados físicos |
| D3 | Visibilidade | O jogador vê **a própria frente inteira** e um **resumo público de Draetyr** (7 frentes, estágio, projetos). O Mestre vê tudo e pode **ocultar** qualquer campo | Todos veem tudo |
| D4 | Semana | Jogadores fazem o turno e marcam **"turno pronto"**. **Só o Mestre fecha a semana** | Fechamento automático em data fixa |
| D5 | Efeitos na cidade | Viram **pendentes** na caixa de entrada do Mestre, que **aprova ou recusa** | Aplicação automática |
| D6 | Ordem | Jogadores agem **em paralelo**; o Mestre resolve a cidade por último | Ordem fixa |
| D7 | Stack | **Next.js (App Router) + TypeScript + Tailwind**, **Supabase** (Postgres) e deploy na **Vercel**, tudo em plano gratuito | Outra stack gratuita, se você justificar |

## 5. O motor comum

Todas as frentes usam a mesma gramática. Implemente uma vez e configure cada frente.

### 5.1 Medida com marcas (nível 0 a 5)
- Ações, eventos e efeitos dão ou tiram **marcas** durante a semana.
- No **fechamento da semana**:
  - **4 marcas ou mais**: sobe 1 nível e as marcas **zeram** (o excesso se perde);
  - **marcas abaixo de 0**: desce 1 nível e fica com **3 marcas**.
- Bordas, que são padrão do app e o Mestre pode editar:
  - no nível 0 com marcas negativas, fica 0 com 0 marcas;
  - no nível 5, as marcas param em 4.
- **Tetos** de algumas frentes (ver o recorte) travam a subida.

### 5.2 Escalas e contadores
- **Escalas fora do 0–5:**
  - Fé e Revelação vão de 0 a 10;
  - Reputação vai de −5 a +5;
  - relação com os Flagelados vai de −3 a +3;
  - Integridade vai de 0 a 10;
  - Sinal e Rede vão de 0 a 3 por zona;
  - confiança de contato vai de 1 a 3.
- **Contadores livres:** PO, PL, Recursos, fiéis, porções, lotes, jornadas, favores e estoque. Cada um tem histórico.

### 5.3 Relógio
- Tem **tamanho N**: 6 por padrão; o Teto da forja tem 8; os rastros do submundo têm 4, 6 ou 8.
- **Avança** e **recua**.
- **Cheio** gera um **alerta de crise** com o texto da coluna "Cheio" do JSON. O Mestre resolve e zera.
- Um relógio cheio pode disparar uma ligação (`automatico_ao` em `ligacoes.json`).

### 5.4 Teste
- `d20 + bônus (+ dados extras, como o dado de Coro do culto) vs CD`, com **vantagem ou desvantagem**.
- Classifique o resultado sempre nesta ordem:
  1. **20 natural**;
  2. **1 natural**;
  3. **sucesso por 5+**;
  4. **sucesso**;
  5. **falha**;
  6. **falha por 5+**.
- Cada frente tem a sua tabela de resultado no JSON.
- **CD por ★:** ★ 10 · ★★ 13 · ★★★ 16 · ★★★★ 19 · ★★★★★ 22.
- **E = Estágio da frente.** Valores escritos como `× (E + 1)` escalam com o estágio.

### 5.5 Tabelas roláveis
- Qualquer tabela de dado do JSON vira um **botão "Rolar"**.
- O parser precisa aceitar estes formatos na 1ª coluna:
  - `7`;
  - `1–9`;
  - `25+`;
  - `10 ou menos`;
  - `11 a 16`;
  - `24 ou mais`;
  - `−5 a −4`;
  - `1 ou menos`.
- Alguns sorteios **somam um modificador** antes da consulta: `d20 + Renome`, `d20 + Notoriedade`, `d20 + Respeito`.
- Escreva um **teste automático** que confira se cada tabela cobre todas as faces do dado.

### 5.6 Log e histórico
- Toda mudança é um **evento** com:
  - autor;
  - semana;
  - frente;
  - tipo;
  - antes e depois;
  - rolagem;
  - motivo em texto.
- Guarde um **snapshot** de todo o estado no fechamento de cada semana. O Mestre pode **reabrir a última semana**, voltando ao snapshot.

### 5.7 Ferramentas genéricas
Estas ferramentas ficam sempre disponíveis, para o que o painel não automatiza:
- lançar ± marcas;
- avançar ou recuar um relógio;
- ajustar um contador;
- rolar um teste livre;
- rolar dado livre (`XdY+Z`);
- rolar qualquer tabela;
- anotar.

## 6. O ciclo da semana

1. **Semana aberta.** Cada frente mostra o **checklist** com os passos de `semana` do JSON. Cada passo tem botões de rolagem e ações.
2. **Jogadores** fazem o turno e marcam **"turno pronto"**. O Mestre vê quem já marcou.
3. **Mestre** resolve a cidade e a guilda e decide a **caixa de entrada** de efeitos pendentes.
4. **Fechar semana:** o app faz, nesta ordem:
   1. converte as **marcas em níveis** (5.1), respeitando os tetos;
   2. recalcula os **estágios**;
   3. anda **prazos, projetos, validades e semanas de ferimento**;
   4. dispara **efeitos periódicos** ("a cada 4 semanas"; ver 8);
   5. gera os **alertas** de relógio cheio;
   6. salva o **snapshot**;
   7. abre a **semana N + 1**.

## 7. O recorte de cada frente

O recorte separa duas coisas:
- **No painel** é o que o app guarda, mostra e automatiza.
- **Consulta** é o que fica no PDF: o jogador lê e aplica com as ferramentas genéricas, e a tela tem um link para o PDF.

### 7.1 🏙️ Draetyr, a cidade (Mestre)

**No painel**
- **7 frentes:** 👥 População, 💰 Economia, 🛣️ Rotas, 🏛️ Influência, 📣 Notoriedade, 🛡️ Segurança, ❤️ Moral.
  - Cada uma tem nível e marcas.
  - O nome do nível vem da tabela `lv`.
- **Estágio da cidade:**
  - fórmula: `(2×População + 2×Economia + Rotas + Influência + Notoriedade + Segurança + Moral) ÷ 9`, arredondando para baixo;
  - **regra de Abandonada:** com População **ou** Economia em 0, o Estágio é 0;
  - a tabela `est` dá ações por semana, renda base, quantas missões vão ao quadro e a marca do estágio. No Estágio 3+, as marcas dos eventos valem 1 a mais.
- **Governo** (tabela `gov`), com as travas aplicadas:
  - **regime especial**: Influência ≤ 2;
  - **isolamento**: Influência ≤ 1 e −1 nível em Rotas ao começar;
  - **lorde hostil**: −1 marca em Economia a cada 4 semanas;
  - **lorde aliado**: +1 nível em Influência ao chegar.
- **Cofre da cidade (PO):**
  - entra a renda base, os aportes e os eventos;
  - sai o custo das ações, das obras e da manutenção. Manutenção por obra: pequena até 5.000 PO paga 10 PO; média até 20.000 PO paga 50 PO; grande paga 200 PO. Sem pagar: Moral −1 marca.
- **Relógios:** 🔥 Atenção do Inferno, 🗡️ Oposição, 👑 Desconfiança da capital (tabela `rel`).
- **Ações da cidade** (tabela `acoes`):
  - escolha a ação, a frente e quem conduz (um PJ com o bônus digitado, ou o **Alberon +5** quando os PJs estão fora);
  - o teste é `d20 + bônus vs CD 10 + 2 × nível atual da frente`;
  - o custo sai do cofre;
  - o resultado vem da tabela `resa`;
  - o limite de ações é o do estágio. Sem PJs em Draetyr: **uma ação a menos**, no mínimo 1.
- **Projetos** (tabela `proj`):
  - catálogo e projetos ativos, com semanas restantes;
  - os projetos "do jogador" são concluídos pelas ligações (seção 8).
- **Evento da semana:** `d100` (tabela `d100`), com escala `× (E + 1)`.

**Consulta:** textos completos dos eventos e notas do PDF.

### 7.2 🛡️ Guilda Alvorada Prateada (Mestre)

**No painel**
- **Cofre:**
  - **12.000 PL**; quanto pode ser usado está a confirmar;
  - **taxa de 20%** de toda recompensa vai para o cofre da guilda;
  - **manutenção** de 50 PO por semana.
- **Elenco** (tabela `ele`):
  - cada grupo tem rank, com o **bônus do rank** da tabela `rk`;
  - estado: livre, em missão, ferido até a semana X, ou fora até uma cena.
- **Equipe:** tabela `staff`.
- **Instalações** (tabela `inst`): são projetos da guilda. Quando o tipo da missão combina, dão **sede +2** automaticamente.
- **Quadro de missões:**
  - o número de missões é o dado do estágio da cidade;
  - **gerar uma missão:**
    - **alcance d6** (`alc`): o 6 é continental, a "missão de ouro", e só vale com Notoriedade 3+; senão, conta como regional;
    - **patamar** `d20 + Notoriedade` (`mp`) dá a CD e a recompensa;
    - **tipo d12** (`tipo`) já diz a frente da cidade ligada;
    - **detalhe d8** (`det`).
  - Com Economia 0–1, a missão local paga em espécie, favor ou terra.
- **Resolver:**
  - o teste é `d20 + rank + sede (+2) + apoio (+2) vs CD`;
  - missão **abaixo do rank** tem vantagem; **dois ranks acima**, só os PJs podem pegar;
  - o resultado vem de `res`, com **achado d6** (`ach`) e **revés d8** (`rev`);
  - as marcas vão para a frente da missão.
- **Missões dos PJs** não rolam: o Mestre só marca "sucesso" ou "sucesso por 5+".
- **Regra fixa:** morte de NPC **nunca** vem de rolagem.

### 7.3 🩸 Culto do Simon (Pedro)

**No painel**
- **Fiéis:** contagem. **Raízes:** 0 a 5 em cada zona. **Tesouro:** em Recursos (1 Recurso = 50 PO, a avaliar).
  - Cada um vira um nível pela tabela `niv`. Para as Raízes, conta a **soma** das zonas.
- **Estágio:**
  - fórmula: `(2×nível de Fiéis + 3×nível de Raízes + 1×nível de Tesouro) ÷ 6`, arredondando para baixo, com **mínimo 1**;
  - a tabela `est` dá o dado de Coro, a Escala da CD, as Obras por semana, a renda, a manutenção, a Comunhão máxima, a Revelação mínima, os líderes regionais e a Captação.
- **Medidas:**
  - **Fé** de 0 a 10;
  - **Comunhão** de 1 a 5, mais **Propósito**, com os limiares da tabela `com`; Provações em `prov`;
  - **Reputação** de −5 a +5;
  - **Revelação** de 0 a 10;
  - **Flagelados** de −3 a +3 (tabela `rel`).
- **Líderes** (tabela `lid`):
  - cada um tem **Lealdade**. O teste de Lealdade é `d20 ≤ Lealdade + Comunhão`;
  - a **Amálgama** tem **12 vidas**, é única e não pode ser replicada.
- **Teste de Obra:**
  - `d20 + bônus do líder + Comunhão + dado de Coro vs CD + Escala`;
  - **uma Obra por líder**; com o Simon presente, 1 Obra com vantagem;
  - vantagem e desvantagem na tabela `van`; as Obras estão em `obras`.
- **Passos da semana:**
  - **humor d6** (`hum`): +1 com Fé 7+ e −1 com Fé 3 ou menos;
  - **evento** `d100`;
  - **complicação** `d20` no 1 natural;
  - **Maré pública** `d20 + Reputação − Revelação` (tabela `mar`);
  - **Cisma** `d8` quando a Fé está em 2 ou menos.

**Consulta:** as táticas de captação (`cap`), Articular (`art`), as fontes de renda (`fon`), os projetos do culto, os itens, os usos da Amálgama e o gerador de líder regional.

**Ligações:** o culto não tem efeitos automáticos na cidade. O Mestre lança à mão quando quiser.

### 7.4 📻 Rádio e gravadora (Leonardo · Mandy)

**No painel**
- **Estágio:** de 0 a 5. Na tabela `fases`, cada estágio tem as suas ações por semana e o requisito para chegar ali.
- **Audiência:** de 0 a 5, com marcas.
- **Influência nos 4 poderes:** Guildas, Nobreza, Clero e Povo, de 0 a 5 com marcas (tabela `inf`).
- **Sinal por zona:** de 0 a 3 (tabela `sinal`).
- **Teto:** Audiência e cada Influência ficam ≤ `1 + zonas com Sinal 2 ou mais`, com máximo 5.
- **Integridade:** de 0 a 10, com o estado da tabela `integ`.
- **Portfólio:** cada gravação tem:
  - tipo: entrevista, eco ou música;
  - título;
  - fonte;
  - ★;
  - zona;
  - poder;
  - uso, pela tabela `uso`.
- **Acervo:** é a soma das ★ do portfólio e vira um nível pela tabela `acervo`. Fontes iniciais em `ini`.
- **Pautas da semana:**
  - chegam `1 + 1 por zona com Torre`;
  - para cada uma: `d6` para o continente, `d8` para a zona de Lykh e `d20` para a pauta (`pautas`).
- **Entrevista:**
  1. **acesso**: Persuasão contra a CD de acesso da ★ (`tier`), com vantagem se a Influência no poder da fonte for ≥ ★;
  2. **disposição** `d6` (`disp`);
  3. **conversa**: `d20 + Intuição vs CD da conversa + disposição` (resultado em `conv`);
  4. depois: o que a fonte traz `d8` (`traz`) e o **desdobramento d10** (`desd`).
- **Grade normal** (`grade`): é um checklist. Com a grade completa, dispara a ligação para a cidade.
- **Especiais:** tabela `prog`.
- **Relógios:** 🔥 Pressão e 🎻 Bardos. **Bastidores:** `d12`.
- **Caixa:**
  - no Estágio 3+, entram `Audiência × 100 PO`;
  - a manutenção é de 50 PO por torre e 25 PO por estúdio.
- **Bônus da Mandy:** Persuasão +9, Intuição +7, Atuação +9.

**Consulta:** música e acordos com bardos (`mus`, `mtier`, `contr`) e as fitas.

### 7.5 ⚒️ Forja Rodas e Engrenagens (Bertran · Trazix)

**No painel**
- **Estágio:** de 0 a 5 (`est`), com ações por semana e equipe máxima.
- **Renome**, **Palavra** e a **trilha do Miguelito**, cada uma de 0 a 5 com marcas (`ren`, `pal`, `trilha`).
- **Jornadas da semana** (`jorn`), somadas pelo app:
  - Trazix em Draetyr: 5;
  - Miguelito: 2 a 4, pela trilha;
  - +1 por funcionário de forja;
  - +1 por ex-bandido, só no balcão;
  - +1 da invocação ajudante, só se o Ooze não estiver de guarda.
- **Fila de pedidos.** Cada pedido tem:
  - cliente;
  - peça;
  - ★;
  - jornadas feitas e total (`tiers`);
  - materiais;
  - prazo em semanas;
  - valor;
  - sinal pago.
  - **Gerar pedidos:**
    - chegam 1, 2 ou 3 por semana, conforme o Renome;
    - `d20 + Renome` dá o patamar (`pat`);
    - `d20` dá o cliente (`cli`), `d12` a peça (`peca`) e `d8` o pedido além (`alem`);
    - a origem vem de `orig` e das zonas;
    - o prazo é `d4 + ★` semanas.
- **Teste da forja**, uma vez por semana:
  - `d20 + Forja (+13) (+1 com o Miguelito) vs CD do maior ★ trabalhado`;
  - resultado em `res`;
  - **Surto de Genialidade**: +5, uma vez por semana.
- **Entrega** (`entrega`):
  - mexe na Palavra e no Renome;
  - atraso: −1 marca de Palavra por semana;
  - com Palavra 2+, metade do valor é paga adiantada.
- **Balcão:**
  - **64 PO por jornada** com o Miguelito, ou 32 PO sem ele;
  - vende até `100 × (Economia de Draetyr + 1) + 50 × Renome` por semana, e o resto vai para o estoque;
  - **escambo**: metade das vendas, enquanto a Economia estiver ≤ 1.
- **Materiais** em lotes (comuns, raros, lendários), pela tabela `mat`.
- **Caderno de fenômenos:**
  - cada fenômeno anda 4 passos: Observar → Entender → Desmontar → Reconstruir (`met`), com CD `10 + 2 × círculo`; Reconstruir é `12 + 2 × círculo`;
  - no 4º passo vira um **Avanço**;
  - círculo 6+ só desmonta com o **Teto cheio**.
- **Relógios:**
  - 💥 Faísca, 🧩 O Esquema e 🕵️ Cobiça, de 6 segmentos;
  - 🐉 O Teto, de **8**, com os gatilhos de `teto`.
- **Eventos:** `d20` (`ev`).
- **Bônus do Trazix:** Forja +13, Arcanismo +9, Investigação +9.

**Consulta:** quem aparece para trabalhar (`quem`) e a regra das funções.

### 7.6 🍲 Caldeirão Trovejante (Fábio · Chopp)

**No painel**
- **Estágio:** de 0 a 5 (`est`), com receita base e requisitos.
- **Pertencimento** e **Fama**, de 0 a 5 com marcas (`pert`, `fama`).
- **Livro de receitas:** cada receita tem nome, tipo (`tipos`) e ★.
  - Criar uma receita: `d20 + cozinha vs CD 10 + 3 × ★`.
  - Pratos do Fluxo em `fluxo`.
- **Despensa** em porções, cada tipo com a sua validade:
  - **frescas** duram 1 semana;
  - **comuns** duram 4 semanas;
  - **raras** duram até o Mestre dizer.
- **Fundos** (`fundos`): produzem toda semana só se alguém cuidar. Sem cuidado por 2 semanas, dispara o evento 3.
- **Equipe:**
  - funções em `func`;
  - pagamento de **5 PO** ou **2 porções** por semana;
  - sem pagamento, a pessoa sai em 2 semanas.
- **Serviço semanal:**
  - `d20 + cozinha (+9) + equipe (+1 por pessoa de Cozinha ou Salão, até +3) vs CD do cardápio` (`card`: 10, 15 ou 20);
  - o resultado (`res`) multiplica a receita base;
  - **escambo**: metade da receita, enquanto a Economia de Draetyr estiver ≤ 1.
- **Mesa para todos:** gasta 5 porções (metade com Pertencimento 2+). Dá +1 marca em Pertencimento e Fome −1.
- **Relógios:** 👅 Paladar e 🥣 Fome. **Salão:** `d20` (`ev`).

**Consulta:** o salão (`salao`), os ingredientes por continente (`ingr`, `obter`) e quem aparece (`quem`).

### 7.7 🗡️ Contatos do submundo (Kaio · Felnun)

**No painel**
- **Respeito:** de 0 a 5 (`resp`). Ele trava o nível dos trabalhos e as ações por semana.
- **Rede por zona:** de 0 a 3 (`rede`), com o custo para abrir.
- **Contatos.** Cada um tem:
  - nível ★, de Rato a Garra (`tier`);
  - confiança de 1 a 3;
  - base;
  - estado.
- **Favores:** a receber e devidos (`fav`). **Bolsa:** em PO.
- **Quadro de trabalhos:**
  - chegam `1 + zonas com Célula ou Ninho`;
  - para cada um: `d20` dá o tipo (`trab`) e `d20 + Respeito` dá o nível (`pt`), travado pelo Respeito;
  - no `1d6`, um resultado de 1 ou 2 faz o trabalho pagar em **1 favor**.
- **Resolver:**
  - `d20 + perícia vs CD do nível + Exposição do tipo`;
  - resultado em `res`, revés `d8` (`rev`).
- **Sussurros:** `d12` (`sus`). **Rastros:** são relógios próprios (`ras`).
- **Relógios:** 👁️ Exposição e 🩸 Caçadores. **A noite:** `d12` (`noite`).
- **Regra fixa:** num contrato de morte, **quem decide é o Kaio**.
- **Bônus:** DES +5, SAB +3, proficiência +4. As perícias proficientes, o Kaio marca na primeira abertura.

**Consulta:** quem é o contato (`quem`), o que ele quer e o jeito dele (`quer`, `jeito`), e os usos do sussurro.

## 8. Efeitos cruzados

- Leia `dados/ligacoes.json`. Cada ligação tem `gatilho`, `efeitos` e, às vezes, um destes campos:
  - `automatico_ao`: dispara com um relógio cheio ou com um estágio alcançado;
  - `periodico`: a cada N semanas, enquanto a condição valer;
  - `escolha`: o jogador escolhe o alvo;
  - `limite`: quantas vezes vale por semana.
- O gatilho aparece como **botão** na ação da frente de origem. Quando disparado, cria um **efeito pendente** na caixa de entrada do Mestre (D5).
- Os **periódicos** guardam um contador de semanas por ligação. O contador **zera** se a condição deixar de valer.
- Os **pedidos entre frentes** aparecem nos dois painéis, com o mesmo estado. Exemplos:
  - as pistolas ECLIPSE e SOLARIS, da forja para o Felnun;
  - as pedras transmissoras da rádio, da forja para a Mandy;
  - os utensílios encantados, da forja para o Chopp.

## 9. Telas

### 9.1 Painel central do Mestre (`/m/<token>`)
1. **Topo:**
   - semana atual e estado (aberta ou fechando);
   - Estágio de Draetyr;
   - governo;
   - cofres da cidade e da guilda;
   - onde estão os PJs.
2. **As 7 frentes:** grade com barra de nível 0–5, 4 bolinhas de marcas e o nome do nível.
3. **Relógios da cidade:** em círculo segmentado, com destaque quando estão cheios.
4. **Caixa de entrada:** efeitos pendentes, com aprovar ou recusar e o motivo.
5. **Cartões das 5 frentes dos jogadores:**
   - estágio;
   - 2 ou 3 medidas principais;
   - relógios;
   - alerta de relógio cheio;
   - "turno pronto ✔".
   - Um toque abre a frente completa em modo leitura, e o Mestre pode editar.
6. **Abas:** Ações da cidade · Projetos · Guilda (elenco + quadro + resolver) · Evento d100 · Histórico.
7. **Botão "Fechar semana":** mostra uma prévia do que vai mudar antes de confirmar.

### 9.2 Frente do jogador (`/j/<token>`)
- Ficha da frente (seção 7), turno da semana em checklist, ações com rolagem e tabelas da frente.
- Log da frente.
- Cartão **"Draetyr hoje"**, com o resumo público (D3).
- Botão **"Turno pronto"**.

### 9.3 Admin (`/a/<token>`)
- Gerar, copiar e revogar links. O texto vai pronto para mandar no WhatsApp.
- Editar os **bônus** dos personagens.
- **Exportar e importar** todo o estado em JSON (backup).

### 9.4 Visual
- **Mobile first:** os jogadores usam o celular.
- **Leitura fácil:**
  - fonte grande;
  - alto contraste;
  - títulos curtos;
  - palavras-chave em negrito;
  - o emoji de cada medida;
  - nenhuma parede de texto. Texto longo de regra fica num "ver regra" recolhido.
- **Paleta por frente**, igual aos PDFs:

| Frente | Cor de destaque | Fundo escuro | Detalhe |
|---|---|---|---|
| Cidade | `#2c5a7a` | `#17283a` | `#a8873f` |
| Culto | `#7a1426` | `#3b0d17` | `#a9833a` |
| Rádio | `#1f7a7a` | `#103a3e` | `#b08a3e` |
| Submundo | `#2f5f95` | `#14171c` | `#a8853a` |
| Caldeirão | `#a4511d` | `#2a1d12` | `#3d6c8f` |
| Forja | `#b8431e` | `#24272b` | `#b88a2a` |

- Fontes: **Lora** nos títulos e **Inter** no texto.

## 10. Dados (sugestão)

- `campanha`: semana atual e estado da semana.
- `frente`: `id`, dono, `estado` (jsonb) e `versao`, para evitar escrita concorrente.
- `evento_log`: append-only.
- `efeito_pendente`: com status e quem decidiu.
- `snapshot_semana`: com o estado completo.
- `acesso`: hash do token, papel e frente.
- As regras ficam nos JSON de `dados/`, versionadas no repositório.
- **Toda escrita** passa por rotas de servidor que validam o token e o papel: um jogador **nunca** escreve na frente de outro.
- Atualização da tela: realtime do Supabase, ou um refresh a cada 15 segundos. Use o que for mais simples.

## 11. Ordem de trabalho

1. Leia tudo. **Mande ao Leonardo todas as dúvidas numa mensagem só**, em múltipla escolha.
2. Proponha a **arquitetura em 10 linhas** e espere o OK.
3. **Motor + testes automáticos:**
   - marcas e níveis, com as bordas;
   - Estágio da cidade, com a regra de Abandonada;
   - Estágio do culto, com mínimo 1;
   - teto da rádio;
   - travas do governo;
   - classificação do teste;
   - cobertura de cada tabela de dado;
   - jornadas da forja;
   - periódicos.
4. **Painel do Mestre** rodando local, com `estado-inicial.json` como seed.
5. **Frentes dos jogadores.**
6. **Caixa de entrada, fechamento da semana e snapshot.**
7. **Deploy guiado** (GitHub → Supabase → Vercel), um passo por vez.
8. **Simulação:** rode uma semana completa com as 6 frentes e mostre ao Leonardo o antes e o depois.

## 12. Não faça

- Não invente regra, número ou cânone.
  - Valor `null` no estado inicial é **"a definir"**: o dono preenche na primeira abertura.
  - `"proposta": true` aparece na tela com um selo **"proposta"**.
- Não exponha tokens em log, URL de erro ou console.
- Não use serviço pago, nem crie conta sem confirmação.
- Não implemente a frente da Hrasvelge. Deixe só o encaixe pronto.
