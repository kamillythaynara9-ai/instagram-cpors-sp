// Lista, salva e apaga itens de data/<colecao>/<id>.json
import { exigeLogin, listarColecao, commit, falha } from './_lib/github.js';
import { avisarClaude } from './_lib/claude.js';

const COLECOES = ['posts', 'pedidos', 'eventos', 'pauta', 'ensinamentos', 'padrao'];
const idValido = (id) => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{2,80}$/.test(id);

export default async function handler(req, res) {
  if (!exigeLogin(req, res)) return;
  try {
    const col = req.query.col || req.body?.col;
    if (!COLECOES.includes(col)) return res.status(400).json({ erro: 'coleção inválida' });

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await listarColecao(col));
    }

    if (req.method === 'POST') {
      const itens = req.body.itens || [req.body.item];
      const agora = new Date().toISOString();
      for (const it of itens) {
        if (!it || !idValido(it.id)) return res.status(400).json({ erro: 'id inválido' });
        it.criadoEm = it.criadoEm || agora;
        it.atualizadoEm = agora;
      }
      const msg = req.body.mensagem || `${col}: ${itens.map((i) => i.id).join(', ')}`;
      await commit(itens.map((i) => ({ path: `data/${col}/${i.id}.json`, text: JSON.stringify(i, null, 2) + '\n' })), `[site] ${msg}`);
      // pedido novo, evento para gerar posts ou ajuste pendente: chama o Claude na hora
      const paraClaude = itens.filter((i) =>
        (col === 'pedidos' && i.status === 'novo') ||
        (col === 'eventos' && i.gerarPosts && i.status === 'novo') ||
        (col === 'ensinamentos' && i.status === 'novo') ||
        (col === 'posts' && (i.ajustes || []).some((a) => !a.feito && Date.now() - Date.parse(a.quando) < 5 * 60 * 1000)));
      if (paraClaude.length) await avisarClaude(`Novidade na Central de Posts (${col}): ${paraClaude.map((i) => `"${i.titulo || i.texto?.slice(0, 60) || ''}" (${i.id})`).join(', ')}. Confira a fila agora.`);
      return res.json({ ok: true, itens });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!idValido(id)) return res.status(400).json({ erro: 'id inválido' });
      await commit([{ path: `data/${col}/${id}.json`, delete: true }], `[site] apagar ${col}/${id}`);
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (e) { falha(res, e); }
}
