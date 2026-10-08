// Central de Posts do CPOR/SP
// Dados em data/<colecao>/<id>.json no GitHub (via /api). Claude lê os pedidos e grava os posts no mesmo lugar.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const fmtData = (iso) => { if (!iso) return ''; const [a, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
  const fmtCurta = (iso) => { if (!iso) return ''; const [, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}`; };
  const fmtHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const slug = (s) => String(s || 'item').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
  const novoId = (s) => `${slug(s)}-${Date.now().toString(36)}`;

  const src = (p) => !p ? '' : /^(https?:|\/|data:|blob:)/.test(p) ? p : `/api/arquivo?p=${encodeURIComponent(p)}`;
  Modelos.usarFonte(src);

  const ST_POST = { ideia: 'Ideia', rascunho: 'Para revisar', ajuste: 'Ajuste pedido', aprovado: 'Aprovado', postado: 'Postado' };
  const ST_PED = { novo: 'Aguardando Claude', producao: 'Em produção', feito: 'Pronto' };
  const TIPOS_EV = { evento: 'Evento', atividade: 'Atividade / instrução', data: 'Data comemorativa', aviso: 'Aviso / informativo', outro: 'Outro' };
  const FORMATOS = { claude: 'Claude decide', carrossel: 'Carrossel', poster: 'Pôster (imagem única)', ambos: 'Carrossel e pôster' };

  const S = { posts: [], pedidos: [], eventos: [], arquivos: null, filtro: 'todos', mes: null, diaSel: null, aberto: null, idx: 0, editando: false, carregado: false };

  // ---------------- API ----------------
  async function chamar(url, opts = {}) {
    const r = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    if (r.status === 401) { telaLogin(); throw new Error('Faça login'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || `Erro ${r.status}`);
    return j;
  }
  const api = {
    listar: (col) => chamar(`/api/data?col=${col}`),
    salvar: (col, itens, mensagem) => chamar('/api/data', { method: 'POST', body: JSON.stringify({ col, itens: [].concat(itens), mensagem }) }),
    apagar: (col, id) => chamar(`/api/data?col=${col}&id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };

  function toast(msg, ms = 3200) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), ms);
  }

  async function carregar(silencioso) {
    try {
      const [posts, pedidos, eventos] = await Promise.all(['posts', 'pedidos', 'eventos'].map(api.listar));
      S.posts = posts; S.pedidos = pedidos; S.eventos = eventos; S.carregado = true;
      if (!S.editando) rota();
    } catch (e) { if (!silencioso && e.message !== 'Faça login') $('#view').innerHTML = `<div class="vazio">Não consegui carregar os dados: ${esc(e.message)}</div>`; }
  }

  async function salvarItem(col, item, msg) {
    const r = await api.salvar(col, item, msg);
    const lista = S[col];
    for (const it of r.itens) { const k = lista.findIndex((x) => x.id === it.id); if (k >= 0) lista[k] = it; else lista.push(it); }
    return r.itens[0];
  }

  // ---------------- escala dos slides ----------------
  function slideBox(slide, i, t, extra = '') { return `<div class="escala" ${extra}>${Modelos.render(slide || {}, i, t)}</div>`; }
  function ajustarEscalas(root = document) { $$('.escala', root).forEach((e) => { const sl = e.firstElementChild; if (sl && e.clientWidth) sl.style.transform = `scale(${e.clientWidth / 1080})`; }); }
  new ResizeObserver(() => ajustarEscalas()).observe(document.body);

  // ---------------- roteamento ----------------
  function rota() {
    const v = (location.hash || '#feed').slice(1);
    $$('#abas a').forEach((a) => a.classList.toggle('on', a.dataset.v === v));
    if (!S.carregado) { $('#view').innerHTML = '<div class="carregando">Carregando…</div>'; return; }
    ({ feed: telaFeed, pedido: telaPedido, calendario: telaCalendario, pedidos: telaPedidos }[v] || telaFeed)();
    ajustarEscalas();
  }
  window.addEventListener('hashchange', () => { if (!S.editando) rota(); });

  // ---------------- login ----------------
  function telaLogin() {
    $('#abas').hidden = true;
    $('#view').innerHTML = `<div class="login"><img src="/assets/brasao.png" alt=""><h1>Central de Posts</h1><p class="dica">CPOR/SP · Escola de Líderes</p>
      <form id="flogin"><input type="password" id="senha" placeholder="Senha" autocomplete="current-password" required><button class="bt pri">Entrar</button><div id="lerro" class="dica"></div></form></div>`;
    $('#flogin').onsubmit = async (ev) => {
      ev.preventDefault();
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: $('#senha').value }) });
      if (!r.ok) { $('#lerro').textContent = 'Senha incorreta.'; return; }
      $('#abas').hidden = false; carregar();
    };
  }

  // ---------------- FEED ----------------
  const ordenados = () => [...S.posts].sort((a, b) => (b.ordem ?? 0) - (a.ordem ?? 0) || String(b.criadoEm).localeCompare(String(a.criadoEm)));

  function telaFeed() {
    const todos = ordenados();
    const cont = (st) => S.posts.filter((p) => p.status === st).length;
    const lista = S.filtro === 'todos' ? todos : todos.filter((p) => p.status === S.filtro);
    const pend = S.pedidos.filter((p) => p.status !== 'feito').length + S.eventos.filter((e) => e.gerarPosts && e.status !== 'feito').length;
    const icoCarrossel = `<svg class="cel-ico" viewBox="0 0 24 24" fill="#ECE6D6"><path d="M7 3h11a3 3 0 0 1 3 3v11a1 1 0 0 1-2 0V6a1 1 0 0 0-1-1H7a1 1 0 0 1 0-2zm-3 4h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/></svg>`;
    $('#view').innerHTML = `
      <section class="perfil">
        <div class="perfil-foto"><img src="/assets/brasao.png" alt="Brasão do CPOR/SP"></div>
        <div class="perfil-info">
          <h1>cporsp_exercito</h1>
          <div class="nums"><span><b>${S.posts.length}</b> posts</span><span><b>${cont('aprovado')}</b> aprovados</span><span><b>${cont('rascunho') + cont('ideia')}</b> para revisar</span><span><b>${pend}</b> pedidos na fila</span></div>
          <div class="bio"><b>CPOR/SP · Escola de Líderes</b><br>Centro de Preparação de Oficiais da Reserva de São Paulo</div>
        </div>
      </section>
      <div class="filtros">${[['todos', 'Todos'], ...Object.entries(ST_POST)].map(([k, n]) => `<button data-f="${k}" class="${S.filtro === k ? 'on' : ''}">${n}${k !== 'todos' ? ` · ${cont(k)}` : ''}</button>`).join('')}</div>
      ${lista.length ? `<div class="grade-feed">${lista.map((p) => `
        <button class="cel" data-id="${esc(p.id)}" aria-label="${esc(p.titulo)}">
          ${slideBox(p.slides?.[0], 0, p.slides?.length || 1)}
          ${(p.slides?.length || 0) > 1 ? icoCarrossel : ''}
          <span class="st st-${p.status} cel-st">${ST_POST[p.status] || p.status}</span>
          ${p.data ? `<span class="cel-data">${fmtCurta(p.data)}</span>` : ''}
          <span class="cel-hover">${esc(p.titulo)}</span>
        </button>`).join('')}</div>`
        : `<div class="vazio">${S.posts.length ? 'Nenhum post com esse status.' : 'Ainda não há posts. Faça um pedido ou marque algo no calendário.'}</div>`}`;
    $$('.filtros button').forEach((b) => (b.onclick = () => { S.filtro = b.dataset.f; telaFeed(); ajustarEscalas(); }));
    $$('.cel').forEach((c) => (c.onclick = () => abrirPost(c.dataset.id)));
  }

  // ---------------- MODAL DO POST ----------------
  function abrirPost(id, idx = 0) {
    const p = S.posts.find((x) => x.id === id); if (!p) return;
    S.aberto = clone(p); S.idx = idx; S.editando = false;
    if (!Array.isArray(S.aberto.slides) || !S.aberto.slides.length) S.aberto.slides = [{ modelo: 'capa', titulo: p.titulo }];
    desenharModal();
  }
  function fecharModal() { S.aberto = null; S.editando = false; $('#modal').hidden = true; $('#modal').innerHTML = ''; document.body.style.overflow = ''; rota(); }

  function desenharModal() {
    const p = S.aberto, t = p.slides.length; S.idx = Math.min(S.idx, t - 1);
    const m = $('#modal'); m.hidden = false; document.body.style.overflow = 'hidden';
    m.innerHTML = `<div class="mcaixa" role="dialog" aria-modal="true">
      <div class="mesq">
        <button class="fechar fechar-cel" data-a="fechar" aria-label="Fechar">×</button>
        <div class="visor">${t > 1 ? `<button class="seta e" data-a="ant" aria-label="Anterior">‹</button><button class="seta d" data-a="prox" aria-label="Próximo">›</button>` : ''}<div id="visor">${slideBox(p.slides[S.idx], S.idx, t)}</div></div>
        ${t > 1 ? `<div class="pontos">${p.slides.map((_, i) => `<button data-i="${i}" class="${i === S.idx ? 'on' : ''}" aria-label="Slide ${i + 1}"></button>`).join('')}</div>` : ''}
      </div>
      <div class="mdir">
        <div class="mcab"><img src="/assets/brasao.png" alt=""><div class="tt"><b>${esc(p.titulo)}</b><small>${t > 1 ? `Carrossel · ${t} slides` : 'Post único'}${p.data ? ` · ${fmtData(p.data)}` : ''}</small></div><button class="fechar" data-a="fechar" aria-label="Fechar">×</button></div>
        <div class="mcorpo" id="mcorpo"></div>
      </div></div>`;
    m.onclick = (ev) => { if (ev.target === m) fecharModal(); };
    $$('[data-a]', m).forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'fechar') return fecharModal();
      S.idx = (S.idx + (a === 'prox' ? 1 : -1) + t) % t; desenharModal();
    }));
    $$('.pontos button', m).forEach((b) => (b.onclick = () => { S.idx = +b.dataset.i; desenharModal(); }));
    S.editando ? corpoEdicao() : corpoVer();
    ajustarEscalas(m);
  }
  function redesenharVisor() { $('#visor').innerHTML = slideBox(S.aberto.slides[S.idx], S.idx, S.aberto.slides.length); ajustarEscalas($('#modal')); }

  function corpoVer() {
    const p = S.aberto, orig = origemDe(p);
    $('#mcorpo').innerHTML = `
      <div class="acoes"><span class="st st-${p.status}">${ST_POST[p.status] || p.status}</span>${orig ? `<span class="dica">Origem: ${esc(orig)}</span>` : ''}</div>
      <div class="acoes">
        <button class="bt pri" id="bBaixar">Baixar ${p.slides.length > 1 ? 'tudo (.zip)' : 'imagem'}</button>
        ${p.slides.length > 1 ? `<button class="bt" id="bBaixar1">Baixar este slide</button>` : ''}
        <button class="bt" id="bEditar">Editar</button>
      </div>
      <div class="secao"><div class="rot">Legenda</div>
        <div class="legenda">${esc(p.legenda || 'Sem legenda ainda.')}</div>
        ${p.legenda ? `<div><button class="bt mini" id="bCopiar">Copiar legenda</button></div>` : ''}</div>
      <div class="secao"><div class="rot">Status e data</div>
        <div class="grade2">
          <label class="campo"><span>Status</span><select id="vStatus">${Object.entries(ST_POST).map(([k, n]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="campo"><span>Data de publicação</span><input type="date" id="vData" value="${esc(p.data || '')}"></label>
        </div>
        <div class="acoes"><button class="bt mini" id="bEsq">← Mover no feed</button><button class="bt mini" id="bDir">Mover no feed →</button></div>
      </div>
      <div class="secao"><div class="rot">Pedir ajuste ao Claude</div>
        <textarea id="tAjuste" placeholder="Ex.: no slide ${S.idx + 1}, troque a foto por uma da tropa em forma e deixe o título mais curto."></textarea>
        <label class="check"><input type="checkbox" id="cSlide" checked><span>É sobre o slide ${S.idx + 1}</span></label>
        <div><button class="bt" id="bAjuste">Enviar pedido de ajuste</button></div>
        ${(p.ajustes || []).length ? `<div class="lista">${p.ajustes.slice().reverse().map((a) => `<div class="ajuste ${a.feito ? 'feito' : ''}">${a.slide ? `<b>Slide ${a.slide}:</b> ` : ''}${esc(a.texto)}<small>${fmtHora(a.quando)} · ${a.feito ? 'feito' + (a.resposta ? ` · ${esc(a.resposta)}` : '') : 'aguardando Claude'}</small></div>`).join('')}</div>` : ''}
      </div>
      <div class="secao"><div class="acoes"><button class="bt mini" id="bDuplicar">Duplicar</button><button class="bt mini perigo" id="bApagar">Excluir post</button></div></div>`;

    $('#bEditar').onclick = () => { S.editando = true; desenharModal(); };
    $('#bBaixar').onclick = (ev) => baixar(p, null, ev.currentTarget);
    if ($('#bBaixar1')) $('#bBaixar1').onclick = (ev) => baixar(p, S.idx, ev.currentTarget);
    if ($('#bCopiar')) $('#bCopiar').onclick = () => copiar(p.legenda);
    $('#vStatus').onchange = async (e) => { p.status = e.target.value; await salvarAberto('status'); };
    $('#vData').onchange = async (e) => { p.data = e.target.value || null; await salvarAberto('data'); };
    $('#bEsq').onclick = () => mover(-1);
    $('#bDir').onclick = () => mover(1);
    $('#bAjuste').onclick = async () => {
      const txt = $('#tAjuste').value.trim(); if (!txt) return toast('Escreva o que quer mudar.');
      p.ajustes = p.ajustes || [];
      p.ajustes.push({ quando: new Date().toISOString(), texto: txt, slide: $('#cSlide').checked ? S.idx + 1 : null, feito: false });
      p.status = 'ajuste';
      await salvarAberto('pedido de ajuste', 'Pedido enviado. O Claude confere a fila a cada hora.');
      corpoVer();
    };
    $('#bDuplicar').onclick = async () => {
      const n = clone(p); n.id = novoId(p.titulo); n.titulo = p.titulo + ' (cópia)'; n.status = 'rascunho'; n.ajustes = []; n.ordem = maxOrdem() + 1; delete n.criadoEm;
      await salvarItem('posts', n, `duplicar ${p.id}`); toast('Post duplicado.'); abrirPost(n.id);
    };
    confirmar($('#bApagar'), 'Confirmar exclusão', async () => { await api.apagar('posts', p.id); S.posts = S.posts.filter((x) => x.id !== p.id); toast('Post excluído.'); fecharModal(); });
  }

  function origemDe(p) {
    if (!p.origem) return '';
    const l = p.origem.tipo === 'evento' ? S.eventos : S.pedidos;
    const o = l.find((x) => x.id === p.origem.id);
    return o ? `${p.origem.tipo === 'evento' ? 'calendário' : 'pedido'} "${o.titulo}"` : '';
  }

  async function salvarAberto(oque, msgOk) {
    try { const r = await salvarItem('posts', S.aberto, `${oque}: ${S.aberto.id}`); S.aberto = clone(r); toast(msgOk || 'Salvo.'); }
    catch (e) { toast('Erro ao salvar: ' + e.message, 6000); }
  }
  const maxOrdem = () => S.posts.reduce((m, p) => Math.max(m, p.ordem ?? 0), 0);
  async function mover(dir) {
    const l = ordenados(); const k = l.findIndex((x) => x.id === S.aberto.id); const j = k + dir;
    if (j < 0 || j >= l.length) return toast('Já está na ponta do feed.');
    const a = clone(l[k]), b = clone(l[j]);
    let oa = a.ordem ?? 0, ob = b.ordem ?? 0; if (oa === ob) { ob = oa + (dir < 0 ? 1 : -1); }
    a.ordem = ob; b.ordem = oa;
    try { await api.salvar('posts', [a, b], `reordenar feed`); Object.assign(S.posts.find((x) => x.id === a.id), a); Object.assign(S.posts.find((x) => x.id === b.id), b); S.aberto.ordem = a.ordem; toast('Posição alterada.'); }
    catch (e) { toast('Erro: ' + e.message); }
  }

  function confirmar(btn, texto, fn) {
    const orig = btn.textContent; let arm = false;
    btn.onclick = async () => {
      if (!arm) { arm = true; btn.textContent = texto; btn.classList.add('conf'); setTimeout(() => { arm = false; btn.textContent = orig; btn.classList.remove('conf'); }, 4000); return; }
      btn.disabled = true; try { await fn(); } catch (e) { toast('Erro: ' + e.message); btn.disabled = false; }
    };
  }

  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); toast('Legenda copiada.'); }
    catch { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Legenda copiada.'); } catch { toast('Não consegui copiar; selecione o texto.'); } ta.remove(); }
  }

  // ---------------- EDIÇÃO MANUAL ----------------
  function corpoEdicao() {
    const p = S.aberto, s = p.slides[S.idx], campos = (Modelos.MODELOS[s.modelo] || Modelos.MODELOS.foto).campos;
    const fotos = fotosDisponiveis(p);
    const valItens = Array.isArray(s.itens) ? s.itens.join('\n') : (s.itens || '');
    $('#mcorpo').innerHTML = `
      <div class="acoes"><button class="bt pri" id="eSalvar">Salvar alterações</button><button class="bt" id="eCancelar">Cancelar</button></div>
      <div class="secao"><div class="rot">Slides</div>
        <div class="slides-mini">${p.slides.map((x, i) => `<button data-i="${i}" class="${i === S.idx ? 'on' : ''}">${slideBox(x, i, p.slides.length)}</button>`).join('')}</div>
        <div class="acoes"><button class="bt mini" id="sEsq">← Mover</button><button class="bt mini" id="sDir">Mover →</button><button class="bt mini" id="sNovo">+ Novo slide</button><button class="bt mini" id="sDup">Duplicar slide</button><button class="bt mini perigo" id="sDel" ${p.slides.length < 2 ? 'disabled' : ''}>Remover slide</button></div>
      </div>
      <div class="secao"><div class="rot">Slide ${S.idx + 1}</div>
        <label class="campo"><span>Modelo</span><select id="eModelo">${Object.entries(Modelos.MODELOS).map(([k, v]) => `<option value="${k}" ${s.modelo === k ? 'selected' : ''}>${v.nome}</option>`).join('')}</select></label>
        ${campos.filter((c) => c !== 'foto').map((c) => {
          const multi = ['titulo', 'destaque', 'texto', 'itens', 'sobretitulo'].includes(c);
          const v = c === 'itens' ? valItens : (s[c] || '');
          return `<label class="campo"><span>${Modelos.CAMPOS[c]}</span>${multi ? `<textarea data-c="${c}" rows="${c === 'texto' || c === 'itens' ? 4 : 2}">${esc(v)}</textarea>` : `<input type="text" data-c="${c}" value="${esc(v)}">`}</label>`;
        }).join('')}
        <label class="campo"><span>Texto do canto inferior direito <em>(vazio = numeração automática)</em></span><input type="text" data-c="rodape" value="${esc(s.rodape || '')}"></label>
        ${campos.includes('foto') ? `
        <div class="campo"><span>Foto</span>
          <div class="fotos-esc">${['', ...fotos].map((f) => `<button data-f="${esc(f)}" class="${(s.foto || '') === f ? 'on' : ''}" title="${esc(f || 'Sem foto')}">${f ? `<img src="${esc(src(f))}" loading="lazy" alt="">` : '<span class="dica">sem foto</span>'}</button>`).join('')}</div>
          <div class="acoes"><label class="bt mini">Enviar outra foto<input type="file" accept="image/*" id="eUp" hidden></label>
          <select id="ePos" style="width:auto">${[['50% 50%', 'Enquadrar: centro'], ['50% 20%', 'Enquadrar: topo'], ['50% 80%', 'Enquadrar: base'], ['25% 50%', 'Enquadrar: esquerda'], ['75% 50%', 'Enquadrar: direita']].map(([v, n]) => `<option value="${v}" ${(s.posicao || '50% 50%') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        </div>` : ''}
      </div>
      <div class="secao"><div class="rot">Post</div>
        <label class="campo"><span>Nome do post</span><input type="text" id="eTitulo" value="${esc(p.titulo)}"></label>
        <label class="campo"><span>Legenda</span><textarea id="eLegenda" rows="8">${esc(p.legenda || '')}</textarea></label>
      </div>`;

    const c = $('#mcorpo');
    let tm; const viva = () => { clearTimeout(tm); tm = setTimeout(() => { redesenharVisor(); const mini = $(`.slides-mini button[data-i="${S.idx}"]`); if (mini) { mini.innerHTML = slideBox(s, S.idx, p.slides.length); ajustarEscalas(mini); } }, 180); };
    $$('[data-c]', c).forEach((el) => (el.oninput = () => {
      const k = el.dataset.c;
      if (k === 'itens') s.itens = el.value.split('\n'); else s[k] = el.value;
      viva();
    }));
    $('#eModelo').onchange = (e) => { s.modelo = e.target.value; desenharModal(); };
    $$('.slides-mini button', c).forEach((b) => (b.onclick = () => { S.idx = +b.dataset.i; desenharModal(); }));
    $$('.fotos-esc button', c).forEach((b) => (b.onclick = () => { s.foto = b.dataset.f || null; $$('.fotos-esc button', c).forEach((x) => x.classList.toggle('on', x === b)); redesenharVisor(); }));
    if ($('#ePos')) $('#ePos').onchange = (e) => { s.posicao = e.target.value; redesenharVisor(); };
    if ($('#eUp')) $('#eUp').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      toast('Enviando foto…', 20000);
      try { const [path] = await enviarArquivos([f], `uploads/edicao/${p.id}`); s.foto = path; S.arquivos = null; p.fotosExtras = [...(p.fotosExtras || []), path]; toast('Foto enviada.'); desenharModal(); }
      catch (er) { toast('Erro no envio: ' + er.message, 6000); }
    };
    $('#eTitulo').oninput = (e) => (p.titulo = e.target.value);
    $('#eLegenda').oninput = (e) => (p.legenda = e.target.value);
    const mexer = (d) => { const j = S.idx + d; if (j < 0 || j >= p.slides.length) return; [p.slides[S.idx], p.slides[j]] = [p.slides[j], p.slides[S.idx]]; S.idx = j; desenharModal(); };
    $('#sEsq').onclick = () => mexer(-1);
    $('#sDir').onclick = () => mexer(1);
    $('#sNovo').onclick = () => { p.slides.splice(S.idx + 1, 0, { modelo: 'foto', selo: s.selo || '', texto: 'Novo slide' }); S.idx++; desenharModal(); };
    $('#sDup').onclick = () => { p.slides.splice(S.idx + 1, 0, clone(s)); S.idx++; desenharModal(); };
    $('#sDel').onclick = () => { if (p.slides.length < 2) return; p.slides.splice(S.idx, 1); S.idx = Math.max(0, S.idx - 1); desenharModal(); };
    $('#eCancelar').onclick = () => { const id = p.id, i = S.idx; abrirPost(id, i); };
    $('#eSalvar').onclick = async (ev) => {
      ev.currentTarget.disabled = true;
      p.slides.forEach((x) => { if (Array.isArray(x.itens)) x.itens = x.itens.map((y) => y.trim()).filter(Boolean); });
      if (p.status === 'ideia') p.status = 'rascunho';
      await salvarAberto('edição manual', 'Alterações salvas.');
      S.editando = false; desenharModal();
    };
    if (S.arquivos === null) carregarArquivos().then(() => { if (S.editando && S.aberto === p) { const pos = $('.mdir')?.scrollTop; corpoEdicao(); if (pos) $('.mdir').scrollTop = pos; } });
  }

  async function carregarArquivos() { try { S.arquivos = (await chamar('/api/arquivos')).map((a) => a.path); } catch { S.arquivos = []; } }
  function fotosDisponiveis(p) {
    const set = new Set();
    p.slides.forEach((x) => x.foto && set.add(x.foto));
    (p.fotosExtras || []).forEach((f) => set.add(f));
    const o = p.origem && (p.origem.tipo === 'evento' ? S.eventos : S.pedidos).find((x) => x.id === p.origem.id);
    (o?.fotos || []).forEach((f) => set.add(f));
    (S.arquivos || []).forEach((f) => set.add(f));
    return [...set];
  }

  // ---------------- DOWNLOAD ----------------
  async function imagemDoSlide(p, i) {
    const palco = $('#palco');
    palco.innerHTML = Modelos.render(p.slides[i], i, p.slides.length);
    const node = palco.firstElementChild;
    await Promise.all($$('img', node).map((im) => im.complete ? 0 : new Promise((ok) => { im.onload = im.onerror = ok; })));
    await document.fonts.ready;
    const opts = { width: 1080, height: 1350, pixelRatio: 1, quality: 0.95, backgroundColor: '#0d110b' };
    await htmlToImage.toJpeg(node, opts); // 1ª passada carrega fontes e imagens no Safari
    return htmlToImage.toBlob(node, { ...opts, type: 'image/jpeg' });
  }
  function salvarArquivo(blob, nome) {
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function baixar(p, so, btn) {
    const txt = btn.textContent; btn.disabled = true;
    try {
      const nome = slug(p.titulo);
      if (so !== null || p.slides.length === 1) {
        const i = so ?? 0; btn.textContent = 'Gerando…';
        salvarArquivo(await imagemDoSlide(p, i), `${nome}${p.slides.length > 1 ? '-' + pad(i + 1) : ''}.jpg`);
      } else {
        const zip = new JSZip();
        for (let i = 0; i < p.slides.length; i++) { btn.textContent = `Gerando ${i + 1}/${p.slides.length}…`; zip.file(`${nome}-${pad(i + 1)}.jpg`, await imagemDoSlide(p, i)); }
        if (p.legenda) zip.file(`${nome}-legenda.txt`, p.legenda);
        salvarArquivo(await zip.generateAsync({ type: 'blob' }), `${nome}.zip`);
      }
    } catch (e) { toast('Erro ao gerar a imagem: ' + e.message, 6000); }
    $('#palco').innerHTML = ''; btn.textContent = txt; btn.disabled = false;
  }

  // ---------------- UPLOAD ----------------
  const paraB64 = (blob) => new Promise((ok, err) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = err; r.readAsDataURL(blob); });
  async function comprimir(file) {
    if (!/^image\/(jpeg|png|webp|heic|heif)/.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) return file;
    try {
      const bmp = await createImageBitmap(file);
      const max = 2600, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (k === 1 && file.size < 2.5e6 && file.type === 'image/jpeg') return file;
      const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      return await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.92));
    } catch { return file; }
  }
  const PEDACO = 2.4 * 1024 * 1024;
  // envia arquivos para uploads/<pasta>/; devolve os caminhos
  async function enviarArquivos(files, pasta, progresso = () => {}) {
    const lista = [];
    for (let n = 0; n < files.length; n++) {
      const f = files[n], ehImg = f.type.startsWith('image/');
      const blob = ehImg ? await comprimir(f) : f;
      const ext = ehImg ? 'jpg' : (f.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${pasta}/${pad(n + 1)}-${slug(f.name.replace(/\.[^.]+$/, ''))}.${ext}`;
      const partes = [];
      const total = Math.max(1, Math.ceil(blob.size / PEDACO));
      for (let k = 0; k < total; k++) {
        const b64 = await paraB64(blob.slice(k * PEDACO, (k + 1) * PEDACO));
        const r = await chamar('/api/blob', { method: 'POST', body: JSON.stringify({ b64 }) });
        partes.push(r.sha); progresso(n, (k + 1) / total);
      }
      lista.push({ path, partes, nome: f.name, tipo: f.type, tamanho: f.size });
    }
    if (lista.length) await chamar('/api/enviar', { method: 'POST', body: JSON.stringify({ arquivos: lista }) });
    return lista.map((a) => a.path);
  }

  // componente de seleção de arquivos com prévia
  function seletor(el, aceita, rotulo) {
    const st = { files: [] };
    el.innerHTML = `<label class="soltar"><input type="file" multiple accept="${aceita}"><b>${rotulo}</b><span class="dica">Clique ou arraste aqui</span></label><div class="previas"></div>`;
    const inp = $('input', el), zona = $('.soltar', el), prev = $('.previas', el);
    const desenhar = () => {
      prev.innerHTML = st.files.map((f, i) => `<div class="previa" data-i="${i}">${f.type.startsWith('image/') ? `<img src="${URL.createObjectURL(f)}" alt="">` : `<span>${esc(f.name)}<br>${(f.size / 1048576).toFixed(1)} MB</span>`}<button type="button" data-x="${i}" aria-label="Remover">×</button><div class="barra" style="width:0"></div></div>`).join('');
      $$('[data-x]', prev).forEach((b) => (b.onclick = () => { st.files.splice(+b.dataset.x, 1); desenhar(); }));
    };
    const add = (fl) => { st.files.push(...[...fl]); desenhar(); };
    inp.onchange = () => { add(inp.files); inp.value = ''; };
    zona.ondragover = (e) => { e.preventDefault(); zona.classList.add('sobre'); };
    zona.ondragleave = () => zona.classList.remove('sobre');
    zona.ondrop = (e) => { e.preventDefault(); zona.classList.remove('sobre'); add(e.dataTransfer.files); };
    st.progresso = (i, f) => { const b = $(`.previa[data-i="${i}"] .barra`, prev); if (b) b.style.width = Math.round(f * 100) + '%'; };
    return st;
  }

  // ---------------- NOVO PEDIDO ----------------
  function telaPedido() {
    $('#view').innerHTML = `
      <div class="cabeca"><span class="rot">Novo pedido</span><h1>O que vamos postar?</h1><p>Conte o assunto e o que você quer. Fotos, vídeos e legenda são opcionais: se faltar algo, eu crio. O Claude confere a fila a cada hora e os posts aparecem no feed para você revisar.</p></div>
      <form class="form" id="fPed">
        <label class="campo"><span>Assunto</span><input type="text" name="titulo" required placeholder="Ex.: Inscrições para o CPOR 2027"></label>
        <label class="campo"><span>O que você quer no post</span><textarea name="descricao" rows="6" required placeholder="Explique a ideia, as informações que precisam aparecer, o tom e para quem é. Ex.: avisar que as inscrições abrem dia 3/11, quem pode se inscrever, documentos e o link."></textarea></label>
        <div class="grade3">
          <label class="campo"><span>Formato</span><select name="formato">${Object.entries(FORMATOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="campo"><span>Quantos posts sobre o assunto</span><input type="number" name="quantidade" min="1" max="12" value="1"></label>
          <label class="campo"><span>Data de publicação <em>(opcional)</em></span><input type="date" name="data"></label>
        </div>
        <div class="campo"><span>Fotos <em>(opcional)</em></span><div id="selFotos"></div></div>
        <div class="campo"><span>Vídeos <em>(opcional, eu tiro os melhores quadros e melhoro a qualidade)</em></span><div id="selVideos"></div></div>
        <label class="campo"><span>Links <em>(opcional: Drive, site, inscrição…)</em></span><input type="text" name="links" placeholder="Cole um ou mais links"></label>
        <label class="campo"><span>Legenda <em>(opcional: se ficar vazia, eu escrevo)</em></span><textarea name="legenda" rows="4"></textarea></label>
        <label class="campo"><span>Observações <em>(opcional)</em></span><textarea name="obs" rows="3" placeholder="Algo que não pode faltar, nomes, autoridades, cores…"></textarea></label>
        <label class="check"><input type="checkbox" name="ideias" checked><span><b>Me dê mais ideias</b><br><span class="dica">Além do que pedi, sugira outros posts sobre o mesmo assunto (aparecem no feed como "Ideia").</span></span></label>
        <div class="acoes"><button class="bt pri" id="bEnviarPed">Enviar pedido</button><span class="dica" id="pedMsg"></span></div>
      </form>`;
    const sf = seletor($('#selFotos'), 'image/*', 'Adicionar fotos');
    const sv = seletor($('#selVideos'), 'video/*', 'Adicionar vídeos');
    $('#fPed').onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target), b = $('#bEnviarPed'), msg = $('#pedMsg');
      b.disabled = true;
      try {
        const id = novoId(fd.get('titulo'));
        msg.textContent = sf.files.length || sv.files.length ? 'Enviando arquivos…' : 'Salvando…';
        const fotos = sf.files.length ? await enviarArquivos(sf.files, `uploads/pedidos/${id}`, sf.progresso) : [];
        const videos = sv.files.length ? await enviarArquivos(sv.files, `uploads/pedidos/${id}/videos`, sv.progresso) : [];
        msg.textContent = 'Salvando…';
        await salvarItem('pedidos', {
          id, titulo: fd.get('titulo').trim(), descricao: fd.get('descricao').trim(), formato: fd.get('formato'),
          quantidade: Math.max(1, +fd.get('quantidade') || 1), data: fd.get('data') || null, fotos, videos,
          links: fd.get('links').trim(), legenda: fd.get('legenda').trim(), obs: fd.get('obs').trim(),
          maisIdeias: !!fd.get('ideias'), status: 'novo',
        }, `novo pedido: ${fd.get('titulo')}`);
        toast('Pedido enviado! O Claude confere a fila a cada hora.', 5000);
        location.hash = '#pedidos';
      } catch (e) { msg.textContent = 'Erro: ' + e.message; b.disabled = false; }
    };
  }

  // ---------------- CALENDÁRIO ----------------
  function telaCalendario() {
    if (!S.mes) { const d = new Date(); S.mes = new Date(d.getFullYear(), d.getMonth(), 1); }
    const ano = S.mes.getFullYear(), mes = S.mes.getMonth();
    const ini = new Date(ano, mes, 1 - new Date(ano, mes, 1).getDay());
    const dias = Array.from({ length: 42 }, (_, i) => new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + i));
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const hoje = hojeISO();
    const nomeMes = S.mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());
    $('#view').innerHTML = `
      <div class="cabeca"><span class="rot">Calendário</span><h1>O que vai acontecer?</h1><p>Toque num dia e conte o que vai acontecer. Se for um evento, eu crio o aviso antes, o post do dia e a cobertura depois; se for uma data, crio opções de arte para aquele dia.</p></div>
      <div class="cal-topo"><h2>${nomeMes}</h2><button class="bt mini" id="mAnt">‹</button><button class="bt mini" id="mHoje">Hoje</button><button class="bt mini" id="mProx">›</button></div>
      <div class="cal">${['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => `<div class="cal-sem">${d}</div>`).join('')}
        ${dias.map((d) => {
          const k = iso(d), evs = S.eventos.filter((e) => e.data === k), ps = S.posts.filter((p) => p.data === k);
          return `<button class="dia ${d.getMonth() !== mes ? 'fora' : ''} ${k === hoje ? 'hoje' : ''} ${k === S.diaSel ? 'sel' : ''}" data-d="${k}">
            <span class="dia-n">${d.getDate()}</span>
            ${evs.map((e) => `<span class="ev" title="${esc(e.titulo)}">${esc(e.titulo)}</span>`).join('')}
            ${ps.length ? `<span class="mini-posts">${ps.map((p) => `<span class="${p.status}" title="${esc(p.titulo)}"></span>`).join('')}</span>` : ''}
          </button>`;
        }).join('')}</div>
      <div id="calLado"></div>`;
    $('#mAnt').onclick = () => { S.mes = new Date(ano, mes - 1, 1); telaCalendario(); };
    $('#mProx').onclick = () => { S.mes = new Date(ano, mes + 1, 1); telaCalendario(); };
    $('#mHoje').onclick = () => { const d = new Date(); S.mes = new Date(d.getFullYear(), d.getMonth(), 1); S.diaSel = hoje; telaCalendario(); };
    $$('.dia').forEach((b) => (b.onclick = () => { S.diaSel = b.dataset.d; telaCalendario(); $('#calLado').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    if (S.diaSel) ladoDia(S.diaSel);
  }

  function ladoDia(dia) {
    const evs = S.eventos.filter((e) => e.data === dia), ps = S.posts.filter((p) => p.data === dia);
    $('#calLado').innerHTML = `<div class="cal-lado">
      <div class="lista">
        <h2>${fmtData(dia)}</h2>
        ${evs.length ? evs.map((e) => cartaoEvento(e)).join('') : '<p class="dica">Nada marcado neste dia.</p>'}
        ${ps.length ? `<div class="rot">Posts para este dia</div><div class="miniaturas">${ps.map((p) => `<div data-post="${esc(p.id)}" title="${esc(p.titulo)}">${slideBox(p.slides?.[0], 0, p.slides?.length || 1)}</div>`).join('')}</div>` : ''}
      </div>
      <form class="cartao form" id="fEv">
        <div class="rot">Marcar neste dia</div>
        <label class="campo"><span>O que vai acontecer</span><input type="text" name="titulo" required placeholder="Ex.: Formatura de fim de ano"></label>
        <div class="grade2">
          <label class="campo"><span>Tipo</span><select name="tipo">${Object.entries(TIPOS_EV).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="campo"><span>Horário <em>(opcional)</em></span><input type="time" name="horario"></label>
        </div>
        <label class="campo"><span>Local <em>(opcional)</em></span><input type="text" name="local"></label>
        <label class="campo"><span>Detalhes</span><textarea name="descricao" rows="4" placeholder="Quem participa, o que vai ter, se é aberto ao público, o que precisa ser divulgado…"></textarea></label>
        <div class="campo"><span>Fotos <em>(opcional)</em></span><div id="selEv"></div></div>
        <label class="check"><input type="checkbox" name="gerar" checked><span><b>Criar posts automaticamente</b><br><span class="dica">Eu avalio o que faz sentido: aviso antes, post do dia, cobertura, informativo…</span></span></label>
        <div class="acoes"><button class="bt pri" id="bEv">Salvar no calendário</button><span class="dica" id="evMsg"></span></div>
      </form></div>`;
    ajustarEscalas($('#calLado'));
    $$('[data-post]').forEach((d) => (d.onclick = () => abrirPost(d.dataset.post)));
    $$('[data-apagar-ev]').forEach((b) => confirmar(b, 'Confirmar', async () => { await api.apagar('eventos', b.dataset.apagarEv); S.eventos = S.eventos.filter((e) => e.id !== b.dataset.apagarEv); telaCalendario(); }));
    const se = seletor($('#selEv'), 'image/*,video/*', 'Adicionar fotos ou vídeos');
    $('#fEv').onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target), b = $('#bEv'), msg = $('#evMsg'); b.disabled = true;
      try {
        const id = novoId(fd.get('titulo'));
        const fotos = []; const videos = [];
        if (se.files.length) {
          msg.textContent = 'Enviando arquivos…';
          const imgs = se.files.filter((f) => f.type.startsWith('image/')), vids = se.files.filter((f) => !f.type.startsWith('image/'));
          if (imgs.length) fotos.push(...await enviarArquivos(imgs, `uploads/eventos/${id}`));
          if (vids.length) videos.push(...await enviarArquivos(vids, `uploads/eventos/${id}/videos`));
        }
        await salvarItem('eventos', {
          id, data: dia, titulo: fd.get('titulo').trim(), tipo: fd.get('tipo'), horario: fd.get('horario') || null,
          local: fd.get('local').trim(), descricao: fd.get('descricao').trim(), fotos, videos,
          gerarPosts: !!fd.get('gerar'), status: fd.get('gerar') ? 'novo' : 'feito',
        }, `calendário ${dia}: ${fd.get('titulo')}`);
        toast(fd.get('gerar') ? 'Salvo! O Claude vai criar os posts.' : 'Salvo no calendário.', 4500);
        telaCalendario();
      } catch (e) { msg.textContent = 'Erro: ' + e.message; b.disabled = false; }
    };
  }

  function cartaoEvento(e) {
    const ps = S.posts.filter((p) => p.origem?.tipo === 'evento' && p.origem.id === e.id);
    return `<div class="item">
      <div class="item-topo"><h3>${esc(e.titulo)}</h3>${e.gerarPosts ? `<span class="st st-${e.status}">${ST_PED[e.status] || e.status}</span>` : ''}</div>
      <div class="meta"><span>${TIPOS_EV[e.tipo] || e.tipo}</span>${e.horario ? `<span>${esc(e.horario)}</span>` : ''}${e.local ? `<span>${esc(e.local)}</span>` : ''}${e.fotos?.length ? `<span>${e.fotos.length} foto(s)</span>` : ''}</div>
      ${e.descricao ? `<p>${esc(e.descricao)}</p>` : ''}
      ${e.respostaClaude ? `<p><b>Claude:</b> ${esc(e.respostaClaude)}</p>` : ''}
      ${ps.length ? `<div class="miniaturas">${ps.map((p) => `<div data-post="${esc(p.id)}" title="${esc(p.titulo)}">${slideBox(p.slides?.[0], 0, p.slides?.length || 1)}</div>`).join('')}</div>` : ''}
      <div><button class="bt mini perigo" data-apagar-ev="${esc(e.id)}">Excluir</button></div>
    </div>`;
  }

  // ---------------- LISTA DE PEDIDOS ----------------
  function telaPedidos() {
    const itens = [
      ...S.pedidos.map((p) => ({ ...p, _tipo: 'pedido' })),
      ...S.eventos.filter((e) => e.gerarPosts).map((e) => ({ ...e, _tipo: 'evento' })),
    ].sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
    $('#view').innerHTML = `
      <div class="cabeca"><span class="rot">Pedidos</span><h1>Fila de produção</h1><p>Tudo o que você pediu, pelo formulário ou pelo calendário. Quando o Claude termina, o pedido fica como "Pronto" e os posts aparecem aqui e no feed.</p></div>
      <div class="acoes" style="margin-bottom:16px"><a class="bt pri" href="#pedido">+ Novo pedido</a><a class="bt" href="#calendario">Abrir calendário</a></div>
      ${itens.length ? `<div class="lista">${itens.map((p) => {
        const ps = S.posts.filter((x) => x.origem?.id === p.id);
        return `<div class="item">
          <div class="item-topo"><h3>${esc(p.titulo)}</h3><span class="st st-${p.status}">${ST_PED[p.status] || p.status}</span></div>
          <div class="meta"><span>${p._tipo === 'evento' ? `Calendário · ${fmtData(p.data)}` : 'Pedido'}</span><span>enviado ${fmtHora(p.criadoEm)}</span>${p.formato ? `<span>${FORMATOS[p.formato] || p.formato}</span>` : ''}${p.quantidade ? `<span>${p.quantidade} post(s)</span>` : ''}${p.fotos?.length ? `<span>${p.fotos.length} foto(s)</span>` : ''}${p.videos?.length ? `<span>${p.videos.length} vídeo(s)</span>` : ''}${p.data && p._tipo === 'pedido' ? `<span>publicar ${fmtData(p.data)}</span>` : ''}</div>
          ${p.descricao ? `<p>${esc(p.descricao)}</p>` : ''}
          ${p.respostaClaude ? `<p><b>Claude:</b> ${esc(p.respostaClaude)}</p>` : ''}
          ${ps.length ? `<div class="miniaturas">${ps.map((x) => `<div data-post="${esc(x.id)}" title="${esc(x.titulo)}">${slideBox(x.slides?.[0], 0, x.slides?.length || 1)}</div>`).join('')}</div>` : ''}
          <div><button class="bt mini perigo" data-apagar="${p._tipo === 'evento' ? 'eventos' : 'pedidos'}:${esc(p.id)}">Excluir pedido</button></div>
        </div>`;
      }).join('')}</div>` : '<div class="vazio">Nenhum pedido ainda.</div>'}`;
    $$('[data-post]').forEach((d) => (d.onclick = () => abrirPost(d.dataset.post)));
    $$('[data-apagar]').forEach((b) => confirmar(b, 'Confirmar exclusão', async () => {
      const [col, id] = b.dataset.apagar.split(':'); await api.apagar(col, id); S[col] = S[col].filter((x) => x.id !== id); telaPedidos(); ajustarEscalas();
    }));
  }

  // ---------------- início ----------------
  document.addEventListener('keydown', (e) => {
    if (!S.aberto) return;
    if (e.key === 'Escape' && !S.editando) return fecharModal();
    if (!S.editando && S.aberto.slides.length > 1 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const t = S.aberto.slides.length; S.idx = (S.idx + (e.key === 'ArrowRight' ? 1 : -1) + t) % t; desenharModal(); }
  });
  // atualiza sozinho para mostrar o que o Claude produziu
  setInterval(() => { const v = (location.hash || '#feed').slice(1); if (document.visibilityState === 'visible' && !S.aberto && (v === 'feed' || v === 'pedidos')) carregar(true); }, 90000);

  rota();
  carregar();
})();
