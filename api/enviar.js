// Junta os blobs enviados em arquivos dentro de uploads/ e faz um único commit.
// files: [{path, partes:[sha...], nome, tipo, tamanho}]
import { exigeLogin, commit, falha } from './_lib/github.js';

const caminhoOk = (p) => typeof p === 'string' && /^uploads\/[a-z0-9][a-z0-9/._-]{3,160}$/.test(p) && !p.includes('..');

export default async function handler(req, res) {
  if (!exigeLogin(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const arquivos = req.body?.arquivos || [];
    const mudancas = [];
    for (const a of arquivos) {
      if (!caminhoOk(a.path) || !Array.isArray(a.partes) || !a.partes.length) return res.status(400).json({ erro: 'arquivo inválido' });
      if (a.partes.length === 1) {
        mudancas.push({ path: a.path, sha: a.partes[0] });
      } else {
        // arquivos grandes (vídeos) ficam em partes: video.mp4.part000, .part001... + um índice
        a.partes.forEach((sha, i) => mudancas.push({ path: `${a.path}.part${String(i).padStart(3, '0')}`, sha }));
        mudancas.push({ path: `${a.path}.partes.json`, text: JSON.stringify({ nome: a.nome, tipo: a.tipo, tamanho: a.tamanho, partes: a.partes.length }, null, 2) + '\n' });
      }
    }
    if (!mudancas.length) return res.json({ ok: true });
    await commit(mudancas, `[site] upload: ${arquivos.map((a) => a.path.split('/').pop()).join(', ')}`);
    res.json({ ok: true });
  } catch (e) { falha(res, e); }
}
