// Acesso ao repositório no GitHub (os dados do sistema ficam versionados no próprio repo).
import crypto from 'node:crypto';

const TOKEN = process.env.GITHUB_TOKEN;
export const OWNER = process.env.GH_OWNER || process.env.VERCEL_GIT_REPO_OWNER || 'kamillythaynara9-ai';
export const REPO = process.env.GH_REPO || process.env.VERCEL_GIT_REPO_SLUG || 'instagram-cpors-sp';
export const BRANCH = process.env.GH_BRANCH || 'main';

export async function gh(path, opts = {}) {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'cpor-central-de-posts',
    ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.headers || {}),
  };
  const r = await fetch('https://api.github.com' + path, { method: opts.method || 'GET', body: opts.body, headers });
  if (!r.ok) {
    const t = await r.text();
    const e = new Error(`GitHub ${r.status}: ${t.slice(0, 300)}`);
    e.status = r.status;
    throw e;
  }
  if (opts.raw) return r;
  return r.status === 204 ? null : r.json();
}

export async function gql(query, variables) {
  const r = await gh('/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) });
  if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 300));
  return r.data;
}

const base = () => `/repos/${OWNER}/${REPO}`;

// Cria um commit com vários arquivos de uma vez. Cada item: {path, text} | {path, sha} | {path, delete:true}
export async function commit(files, message) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const ref = await gh(`${base()}/git/ref/heads/${BRANCH}`);
    const head = ref.object.sha;
    const atual = await gh(`${base()}/git/commits/${head}`);
    const tree = await gh(`${base()}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: atual.tree.sha,
        tree: files.map((f) =>
          f.delete ? { path: f.path, mode: '100644', type: 'blob', sha: null }
          : f.sha ? { path: f.path, mode: '100644', type: 'blob', sha: f.sha }
          : { path: f.path, mode: '100644', type: 'blob', content: f.text }),
      }),
    });
    const novo = await gh(`${base()}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
    });
    try {
      await gh(`${base()}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: novo.sha, force: false }) });
      return novo.sha;
    } catch (e) {
      if (e.status !== 422) throw e; // outro commit entrou no meio: tenta de novo em cima dele
    }
  }
  throw new Error('Não consegui salvar (conflito). Tente de novo.');
}

export async function listarColecao(col) {
  const d = await gql(
    `query($o:String!,$r:String!,$e:String!){repository(owner:$o,name:$r){object(expression:$e){... on Tree{entries{name object{... on Blob{text}}}}}}}`,
    { o: OWNER, r: REPO, e: `${BRANCH}:data/${col}` });
  const entries = d.repository?.object?.entries || [];
  const itens = [];
  for (const en of entries) {
    if (!en.name.endsWith('.json') || !en.object?.text) continue;
    try { itens.push(JSON.parse(en.object.text)); } catch { /* arquivo inválido: ignora */ }
  }
  return itens;
}

export async function criarBlob(b64) {
  const r = await gh(`${base()}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: b64, encoding: 'base64' }) });
  return r.sha;
}

export async function lerArquivo(path) {
  const enc = path.split('/').map(encodeURIComponent).join('/');
  return gh(`${base()}/contents/${enc}?ref=${BRANCH}`, { raw: true, headers: { Accept: 'application/vnd.github.raw' } });
}

export async function arvore() {
  const r = await gh(`${base()}/git/trees/${BRANCH}?recursive=1`);
  return r.tree || [];
}

// ---------- senha de acesso ----------
const assinatura = () => crypto.createHash('sha256').update('cpor:' + (process.env.APP_SENHA || '')).digest('hex').slice(0, 40);

export function autorizado(req) {
  if (!process.env.APP_SENHA) return true;
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)cpor=([a-f0-9]+)/);
  return !!m && m[1] === assinatura();
}

export function senhaConfere(s) {
  const a = Buffer.from(String(s || ''));
  const b = Buffer.from(process.env.APP_SENHA || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const cookieLogin = () => `cpor=${assinatura()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 180}`;

export function exigeLogin(req, res) {
  if (!TOKEN || !OWNER || !REPO) {
    res.status(500).json({ erro: 'Configuração incompleta na Vercel: falta GITHUB_TOKEN (ou o repositório não foi detectado).' });
    return false;
  }
  if (autorizado(req)) return true;
  res.status(401).json({ erro: 'senha' });
  return false;
}

export function falha(res, e) {
  console.error(e);
  res.status(e.status && e.status < 500 ? 400 : 500).json({ erro: e.message || String(e) });
}
