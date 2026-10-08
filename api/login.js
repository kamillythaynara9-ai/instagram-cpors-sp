import { autorizado, senhaConfere, cookieLogin } from './_lib/github.js';

export default function handler(req, res) {
  if (req.method === 'POST') {
    if (!senhaConfere(req.body?.senha)) return res.status(401).json({ erro: 'Senha incorreta' });
    res.setHeader('Set-Cookie', cookieLogin());
    return res.json({ ok: true });
  }
  res.json({ ok: autorizado(req), temSenha: !!process.env.APP_SENHA });
}
