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
3. Antes de produzir, marque o pedido/evento como `"status": "producao"` e faça push (evita trabalho duplicado).
4. Produza os posts (abaixo), marque o pedido/evento como `"status": "feito"` e preencha `"respostaClaude"` com uma frase sobre o que foi criado.
   Para ajustes: aplique, marque `"feito": true`, preencha `"resposta"` e mude o status do post para `"rascunho"`.
5. Commit com prefixo `[claude]` e push. Depois avise a Thaynara no chat do projeto (curto, em português).

## Arquivos enviados

- Fotos: caminhos em `fotos` (ex.: `uploads/pedidos/<id>/01-nome.jpg`), já comprimidas em JPEG até 2600 px.
- Vídeos grandes chegam em partes: `video.mp4.part000`, `.part001`… mais `video.mp4.partes.json`. Junte com `cat video.mp4.part* > video.mp4`.
- **Toda imagem tirada de vídeo deve ter a qualidade melhorada sem alterar o conteúdo** (super-resolução, ex.: OpenCV `dnn_superres` EDSR x2). Salve o resultado em `media/<id-do-pedido>/`.
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
