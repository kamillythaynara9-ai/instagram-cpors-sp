// Versão atual dos dados (último commit em main). O site consulta a cada poucos segundos para atualizar ao vivo.
import { OWNER, REPO, BRANCH, gh, exigeLogin, falha } from './_lib/github.js';

export default async function handler(req, res) {
  if (!exigeLogin(req, res)) return;
  try {
    const r = await gh(`/repos/${OWNER}/${REPO}/commits/${BRANCH}`, { raw: true, headers: { Accept: 'application/vnd.github.sha' } });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ v: (await r.text()).trim() });
  } catch (e) { falha(res, e); }
}
