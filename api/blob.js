// Recebe um pedaço de arquivo (base64, até ~3 MB) e guarda como blob no GitHub, sem commit ainda.
import { exigeLogin, criarBlob, falha } from './_lib/github.js';

export default async function handler(req, res) {
  if (!exigeLogin(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const b64 = req.body?.b64;
    if (!b64 || typeof b64 !== 'string') return res.status(400).json({ erro: 'arquivo vazio' });
    res.json({ sha: await criarBlob(b64) });
  } catch (e) { falha(res, e); }
}
