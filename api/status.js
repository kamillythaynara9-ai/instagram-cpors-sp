// Diagnóstico da configuração (não mostra segredos).
import { avisarClaude } from './_lib/claude.js';
import { OWNER, REPO, BRANCH, gh, listarColecao } from './_lib/github.js';

export default async function handler(req, res) {
  const r = {
    repositorio: `${OWNER}/${REPO}`,
    branch: BRANCH,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN ? 'configurado' : 'FALTANDO',
    APP_SENHA: process.env.APP_SENHA ? 'configurada' : 'não configurada (site aberto sem senha)',
    aviso_ao_claude: process.env.CLAUDE_ROUTINE_TOKEN ? 'configurado' : 'não configurado (Claude confere de hora em hora)',
  };
  const tk = process.env.CLAUDE_ROUTINE_TOKEN || '';
  if (tk) r.token_do_claude = `começa com ${tk.trim().slice(0, 13)}…, ${tk.trim().length} caracteres${tk !== tk.trim() ? ', tinha espaço/quebra de linha (já ignorado)' : ''}`;
  if (tk && req.query && req.query.testar !== undefined) {
    const t = await avisarClaude('Teste do /api/status: confira a fila da Central de Posts agora.');
    r.teste_do_aviso = t.ok ? 'ok, o Claude foi avisado' : `FALHOU: ${t.status || ''} ${t.resposta || t.erro || ''}`.trim();
  }
  if (process.env.GITHUB_TOKEN) {
    try { const repo = await gh(`/repos/${OWNER}/${REPO}`); r.acesso_ao_repo = `ok (${repo.private ? 'privado' : 'público'})`; }
    catch (e) { r.acesso_ao_repo = `ERRO: ${e.message}`; }
    try { r.posts_encontrados = (await listarColecao('posts')).length; }
    catch (e) { r.leitura_dos_dados = `ERRO: ${e.message}`; }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json(r);
}
