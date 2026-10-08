// Lista as imagens disponíveis (fotos enviadas e frames tratados) para escolher na edição.
import { exigeLogin, arvore, falha } from './_lib/github.js';

export default async function handler(req, res) {
  if (!exigeLogin(req, res)) return;
  try {
    const t = await arvore();
    const imgs = t.filter((x) => x.type === 'blob' && /^(uploads|media)\//.test(x.path) && /\.(jpe?g|png|webp)$/i.test(x.path))
      .map((x) => ({ path: x.path, tamanho: x.size }));
    res.setHeader('Cache-Control', 'no-store');
    res.json(imgs);
  } catch (e) { falha(res, e); }
}
