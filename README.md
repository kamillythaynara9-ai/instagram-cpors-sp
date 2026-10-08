# Central de Posts · CPOR/SP

Sistema para pedir, revisar, editar e baixar os posts do Instagram do CPOR/SP (@cporsp_exercito).

- **Feed**: os posts organizados como no Instagram. Clique num post para ver os slides, baixar as imagens (JPG ou .zip), copiar a legenda, mudar status e data, editar à mão ou pedir ajuste ao Claude.
- **Novo pedido**: assunto, o que você quer, fotos e vídeos (opcionais), legenda (opcional), formato e quantos posts.
- **Calendário**: marque o que vai acontecer em cada dia. Com "Criar posts automaticamente" marcado, o Claude cria as artes daquele dia (aviso antes, post do dia, cobertura, informativo…).
- **Pedidos**: a fila de produção e o que já ficou pronto.

O Claude é avisado na hora quando você envia algo (e confere a fila de hora em hora como reserva). O site se atualiza sozinho, ao vivo.

## Como colocar no ar (uma vez só)

1. **Deixe o repositório privado** (recomendado, porque as fotos dos alunos ficam aqui): GitHub → este repositório → Settings → General → Danger Zone → Change visibility → Private.
2. **Crie um token do GitHub** para o site conseguir salvar:
   GitHub → foto do perfil → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
   - Repository access: **Only select repositories** → `instagram-cpors-sp`
   - Permissions → Repository permissions → **Contents: Read and write**
   - Expiração: a maior que aparecer (anote para renovar).
   - Copie o token gerado.
3. **Vercel**: Add New → Project → importe `instagram-cpors-sp` → Framework Preset: **Other**.
   Em **Environment Variables**, adicione:
   - `GITHUB_TOKEN` = o token do passo 2
   - `APP_SENHA` = a senha que você quer usar para entrar no site
   Clique em **Deploy**.
4. Abra o link que a Vercel mostrar e entre com a senha.

5. **Para o Claude receber na hora** o que você enviar: abra [claude.ai/code/routines](https://claude.ai/code/routines), entre na rotina **"Central de Posts CPOR/SP: conferir fila"**, clique em **Add another trigger → API**, salve e gere o token. Na Vercel, crie a variável `CLAUDE_ROUTINE_TOKEN` com esse token e faça **Redeploy**. Sem ele, o Claude confere a fila de hora em hora.

Para conferir se está tudo certo, abra `/api/status` no seu link da Vercel.

Se o token expirar, gere outro igual e troque o `GITHUB_TOKEN` em Vercel → Project → Settings → Environment Variables (depois clique em Redeploy).

## Onde ficam as coisas

| Pasta | O que é |
|---|---|
| `public/` | o site (feed, formulários, calendário, modelos de arte) |
| `api/` | as funções que salvam e leem do GitHub |
| `data/pedidos`, `data/eventos`, `data/posts` | um arquivo JSON por pedido, evento e post |
| `uploads/` | fotos e vídeos enviados pelo site |
| `media/` | imagens tratadas pelo Claude (frames melhorados etc.) |

Mudanças só em `data/`, `uploads/` e `media/` não geram novo deploy na Vercel; o site lê esses dados direto do GitHub.
