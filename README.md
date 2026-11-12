# TupiniMesa

Planejamento alimentar da família: residência, estoque, receitas e o cardápio da semana — web e Android, com os mesmos dados nos dois.

Expo SDK 55 / React Native / TypeScript. Visual "caderno de receitas": papel claro, títulos serifados, faixa colorida por refeição, ilhós de latão e o cadarço laranja do regador do Granjeando Talentos; o Tupinicode assina em pixel no rodapé.

## O que faz

- **Casa** — registro da residência (nome, pessoas) e sincronização por código de convite.
- **Estoque** — itens com quantidade, unidade (un, g, kg, ml, L), local e aviso de "acabando".
- **Receitas** — ingredientes tirados do estoque com a quantidade de cada um, categorias (café, almoço, lanche, janta) e modo de preparo, que pode ser **ditado por voz**.
- **Cardápio** — quadro da semana: uma coluna por dia, dividida nas quatro refeições. Cada receita vira um card solto, que você arrasta para onde quiser; os cards do dia ficam ligados por um cadarço que balança e assenta. Um card só fica numa refeição da sua categoria.
- **Comido** — o círculo no canto do card marca a refeição como comida e tira os ingredientes do estoque; desmarcar devolve. O dia mostra `2/4 comidos`.
- **Lista de compras** — no Estoque, o que falta para tudo que está planejado de hoje em diante.

## Rodar

Requer Node 22.18+.

```bash
npm install
npm run web        # navegador, com recarga automática
npm run check      # tipos + lint + testes
```

Build web de produção: `npm run export:web` e depois `npm run preview` (http://127.0.0.1:4173).

### Android

O ditado por voz usa um módulo nativo, então **não roda no Expo Go** — precisa de um build:

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli build -p android --profile preview      # gera um APK instalável
```

`development` gera um APK de desenvolvimento (com recarga pelo `npx expo start`). No Expo Go o app abre, mas sem o botão de ditar.

## Sincronização (Supabase)

Sem configuração o app funciona normalmente, só que os dados ficam apenas no aparelho. Para sincronizar:

1. Crie um projeto gratuito em <https://supabase.com>.
2. **SQL Editor → New query**: cole todo o `supabase/schema.sql` e execute.
3. **Authentication → Sign In / Providers**: ative **Allow anonymous sign-ins**.
4. **Project Settings → API**: copie a *Project URL* e a chave *anon public*.
5. `cp .env.example .env` e preencha as duas variáveis. Reinicie com `npx expo start --clear`.
   Para o APK: `npx eas-cli env:create` com as mesmas duas variáveis (o `.env` não sobe para o build).
6. No app, aba **Casa → Compartilhar esta residência**. Aparece um código de 8 letras.
7. Nos outros aparelhos: **Entrar com código**.

Como funciona: cada mudança é salva primeiro no aparelho e enviada em seguida; offline, fica na fila e sobe sozinha. Os outros aparelhos recebem em tempo real (e conferem a cada 45 s e ao voltar para o app). Se dois aparelhos mexem no mesmo registro, vale a edição mais recente. Quem tem o código de convite tem acesso à casa — trate-o como uma senha.

## Estrutura

```
app/                  rotas (expo-router): Cardápio, Receitas, Estoque, Casa
src/board/            quadro: geometria (layout.ts), cadarço (rope.ts), Board.tsx
src/domain/           modelo, datas e contas de estoque — sem dependência de UI
src/data/             store local, ações, motor de sync e adaptador Supabase
src/features/         editores e folhas (receita, estoque, card, onboarding)
src/services/voice.ts ditado por voz (Web Speech API / expo-speech-recognition)
supabase/schema.sql   tabelas, regras de acesso e funções do servidor
tests/                testes de domínio, sync e quadro (node --test)
```

## O que foi verificado e o que não foi

Verificado nesta entrega: tipos, lint, 11 testes (estoque, sync entre dois aparelhos simulados, geometria do quadro, física do cadarço), bundle web e bundle Android, e uso real no Chrome (arrastar entre dias, recusa por categoria, marcar comido, baixa de estoque, lista de compras, layout de celular).

Ainda **não** verificado, por depender de conta ou aparelho:

- Sincronização contra um projeto Supabase real (o motor foi testado com um servidor simulado que segue as mesmas regras do `schema.sql`).
- App instalado num Android (gestos de toque, permissão de microfone, ditado).
- Ditado por voz falando de verdade no navegador.
