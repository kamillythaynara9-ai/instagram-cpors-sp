# Central de Posts CPOR/SP: instruções para o Claude

Este repositório é o sistema de posts do Instagram do CPOR/SP (@cporsp_exercito), feito para a Thaynara (agência Seeds).
O site (Vercel) grava pedidos em `data/` e arquivos em `uploads/`. O Claude produz os posts gravando JSON em `data/posts/`.
O site lê tudo direto do GitHub: basta fazer commit e push em `main`.

## Fila de trabalho

1. `git pull` em `main`.
2. Procure:
   - `data/pedidos/*.json` com `"status": "novo"`
   - `data/eventos/*.json` com `"gerarPosts": true` e `"status": "novo"`
   - `data/posts/*.json` com algum item em `ajustes` com `"feito": false`
   - `data/ensinamentos/*.json` com `"status": "novo"` (algo que a equipe quer ensinar: aplique no padrão, marque `"aprendido"` e preencha `"resposta"`)
3. Antes de produzir, marque o pedido/evento como `"status": "producao"` e faça push (evita trabalho duplicado).
4. Produza os posts (abaixo), marque o pedido/evento como `"status": "feito"` e preencha `"respostaClaude"` com uma frase sobre o que foi criado.
   Para ajustes: aplique, marque `"feito": true`, preencha `"resposta"` e mude o status do post para `"rascunho"`.
5. **Aprenda** (obrigatório a cada item da fila): atualize `data/padrao/padrao-cpor-sp.json` com o que o pedido, o ajuste, o ensinamento ou o descarte revelou sobre o que a equipe gosta ou não gosta, sobre o Exército e sobre o CPOR/SP. Edite a regra existente em vez de empilhar; o que ainda é dúvida vai em "A confirmar com vocês". Leia esse padrão antes de produzir qualquer post: ele vale mais que as regras gerais abaixo quando houver conflito.
6. Commit com prefixo `[claude]` e push. Depois avise a Thaynara no chat do projeto (curto, em português, horários de Brasília).

## Pauta semanal (segunda, 8h)

A rotina de segunda gera `data/pauta/semana-AAAA-MM-DD.json` (data = a segunda-feira):
`{ id, semana, titulo: "Semana de 12 a 17/10", resumo, ideias: [{ id, titulo, formato: carrossel|poster, tema, dia, ideia, porque, confirmar?, status: "sugerida" }] }`.
- 4 a 6 ideias **diferentes da rotina**: informativos, rotina do CPOR/SP, história, armas, como entrar, curiosidades. Nada de eventos do calendário (já viram posts) e nada de "dia de algo" que não esteja no calendário.
- Antes, revise a semana anterior: ideias com `"quero"` (viraram pedido) e `"nao"` (com `motivo`), ensinamentos e as edições manuais que a equipe fez nos posts (`git log --since="8 days ago" --author-date-order -p -- data/posts` nos commits `[site]`). Atualize o padrão com isso e use para escolher as novas ideias.
- Não repita ideias já sugeridas; varie os temas. Fato que não está confirmado vai em `confirmar`.
- "Quero esse post" no site cria um pedido normal (com `origemPauta`), que entra na fila.

## Padrão aprendido

`data/padrao/padrao-cpor-sp.json` (`secoes: [{titulo, itens[]}]`) aparece na aba Padrão do site. É a memória do que a equipe ensinou; mantenha curto, claro e atual.

## Arquivos enviados

- Fotos: caminhos em `fotos` (ex.: `uploads/pedidos/<id>/01-nome.jpg`), já comprimidas em JPEG até 2600 px.
- Vídeos grandes chegam em partes: `video.mp4.part000`, `.part001`… mais `video.mp4.partes.json`. Junte com `cat video.mp4.part* > video.mp4`.
- **Toda imagem tirada de vídeo deve ter a qualidade melhorada sem alterar o conteúdo** (super-resolução, ex.: OpenCV `dnn_superres` EDSR x2). Salve o resultado em `media/<id-do-pedido>/`.
  Use `python3 ferramentas/frame_hq.py <video> <segundo> <y0 do recorte 720x900> <saida.jpg> <EDSR_x2.pb>`: escolhe o quadro mais nítido (até 2 quadros do momento), tira ruído com os vizinhos, EDSR x2, clareia só se escuro.
- Imagens que você cria/trata vão em `media/`. Use nomes novos em vez de sobrescrever (o site faz cache por 1 dia).

## Formato de um post (`data/posts/<id>.json`)

```json
{
  "id": "inscricoes-2027-aviso",          // [a-z0-9-], igual ao nome do arquivo
  "titulo": "Inscrições 2027: aviso",
  "tipo": "carrossel",                    // carrossel | poster
  "status": "rascunho",                   // ideia | rascunho | ajuste | aprovado | postado
  "ordem": 7,                             // posição no feed (maior = primeiro); use o maior atual + 1
  "data": "2026-11-03",                   // data sugerida de publicação ou null
  "origem": { "tipo": "pedido", "id": "<id do pedido ou evento>" },
  "legenda": "…",
  "slides": [ { "modelo": "capa", "selo": "…", "titulo": "…", "foto": "uploads/…" } ],
  "ajustes": [],
  "criadoEm": "ISO", "atualizadoEm": "ISO"
}
```

Use `"status": "rascunho"` para o que foi pedido e `"status": "ideia"` para sugestões extras (quando `maisIdeias` é true).

### Modelos de slide (`public/modelos.js`)

| modelo | uso | campos |
|---|---|---|
| `capa` | primeira página com foto | selo, sobretitulo, titulo (prata), destaque (dourado), texto, foto |
| `foto` | fotos internas do carrossel, legenda fina com pino (estilo PCI) | selo, titulo, texto, foto |
| `info` | informativo em tópicos | selo, sobretitulo, titulo, destaque, itens[], texto, foto (topo) |
| `aviso` | pôster / convite; itens como "Rótulo: valor" viram caixas | selo, sobretitulo, titulo, destaque, itens[], texto, foto |
| `numero` | número grande em destaque (ex.: "265" corredores) | selo, sobretitulo, destaque (o número), titulo, texto, foto |
| `fechamento` | último slide com brasão | titulo (grito/agradecimento), texto, sobretitulo (padrão @cporsp_exercito), foto |

Campos opcionais em qualquer slide: `posicao` (object-position da foto, ex. `"50% 20%"`), `rodape` (texto do canto inferior direito; vazio = numeração).
Use `\n` para quebrar linha em títulos. Para criar um modelo novo, adicione em `MODELOS` e `R` em `public/modelos.js` (isso gera deploy).

## Regras de design e conteúdo (da Thaynara)

- Foco: carrosséis e pôsteres **informativos**. Não criar posts de "dia de algo" por iniciativa própria; datas só quando ela marcar no calendário.
- Nada de símbolos militares desenhados à mão (SVG): use fotos reais ou o brasão do CPOR/SP.
- Títulos nunca em branco puro: prata ou dourado metalizado com textura leve e sombra suave (classes `metal` e `ouro`). Texto de apoio em off-white quente (#E6E0D0).
- Manter a identidade: brasão no canto superior direito, selo dourado, rodapé "CPOR/SP · ESCOLA DE LÍDERES", fundo verde-oliva quase preto, Montserrat + Oswald.
- Evento: pense em mais de um post (aviso antes, post do dia, cobertura depois). Data comemorativa: algumas opções de arte para o dia.
- Legenda (voz do CPOR/SP):

```
[emoji-selo] [Título curto]

[1ª frase: o que aconteceu/vai acontecer, com quem e onde.]
[2ª frase: detalhe ou informação útil.]

[Grito da arma quando couber]

CPOR/SP - Escola de Líderes
#CPORSP #ExércitoBrasileiro #[tema] #[arma ou OM]
```
