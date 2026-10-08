// Acorda o Claude na hora (rotina do Claude Code com gatilho por API).
// Configure na Vercel: CLAUDE_ROUTINE_TOKEN (gerado em claude.ai/code/routines). CLAUDE_ROUTINE_URL é opcional.
const URL_PADRAO = 'https://api.anthropic.com/v1/claude_code/routines/trig_011i3JhL3MwQm4pyFovquu5p/fire';
export async function avisarClaude(texto) {
  const url = process.env.CLAUDE_ROUTINE_URL || URL_PADRAO, token = (process.env.CLAUDE_ROUTINE_TOKEN || '').trim().replace(/^Bearer\s+/i, '');
  if (!url || !token) return { ok: false, erro: 'sem token' };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': process.env.CLAUDE_ROUTINE_BETA || 'experimental-cc-routine-2026-04-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texto }),
    });
    const corpo = (await r.text()).slice(0, 300);
    if (!r.ok) console.error('aviso ao Claude falhou', r.status, corpo);
    return { ok: r.ok, status: r.status, resposta: corpo };
  } catch (e) { console.error('aviso ao Claude falhou', e); return { ok: false, erro: String(e.message || e) }; }
}
