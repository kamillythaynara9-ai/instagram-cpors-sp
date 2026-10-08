// Serve uma imagem guardada no repositório (uploads/ ou media/).
import { exigeLogin, lerArquivo, falha } from './_lib/github.js';

const TIPOS = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', mov: 'video/quicktime' };

export default async function handler(req, res) {
  if (!exigeLogin(req, res)) return;
  try {
    const p = String(req.query.p || '');
    if (!/^(uploads|media)\/[A-Za-z0-9/._-]+$/.test(p) || p.includes('..')) return res.status(400).end();
    const r = await lerArquivo(p);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', TIPOS[p.split('.').pop().toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(buf);
  } catch (e) {
    if (e.status === 404) return res.status(404).end();
    falha(res, e);
  }
}
