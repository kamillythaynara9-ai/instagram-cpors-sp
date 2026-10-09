// Modelos de slide do CPOR/SP (1080 x 1350, formato 4:5 do feed).
// Cada slide é um objeto JSON; o mesmo modelo serve para a prévia, a edição e o download.
(function () {
  const W = 1080, H = 1350;

  const MODELOS = {
    capa:       { nome: 'Capa com foto',        campos: ['selo', 'sobretitulo', 'titulo', 'destaque', 'texto', 'foto'] },
    foto:       { nome: 'Foto com legenda',     campos: ['selo', 'titulo', 'texto', 'foto'] },
    info:       { nome: 'Informativo (tópicos)', campos: ['selo', 'sobretitulo', 'titulo', 'destaque', 'itens', 'texto', 'foto'] },
    aviso:      { nome: 'Pôster / aviso',       campos: ['selo', 'sobretitulo', 'titulo', 'destaque', 'itens', 'texto', 'foto'] },
    numero:     { nome: 'Número em destaque',   campos: ['selo', 'sobretitulo', 'destaque', 'titulo', 'texto', 'foto'] },
    fechamento: { nome: 'Fechamento',           campos: ['titulo', 'texto', 'sobretitulo', 'foto'] },
  };

  const CAMPOS = {
    selo: 'Selo (canto superior)',
    sobretitulo: 'Linha acima do título',
    titulo: 'Título (prata)',
    destaque: 'Destaque (dourado)',
    texto: 'Texto',
    itens: 'Tópicos (um por linha; no pôster use "Rótulo: valor")',
    foto: 'Foto',
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const br = (s) => esc(s).replace(/\n/g, '<br>');
  const pad = (n) => String(n).padStart(2, '0');

  // tamanho do título pelo comprimento da maior linha
  function fit(txt, max, min, largura = 920, fator = 0.74) {
    const L = Math.max(1, ...String(txt || '').split('\n').map((l) => l.trim().length));
    return Math.max(min, Math.min(max, Math.floor(largura / (L * fator))));
  }

  let srcDe = (p) => p;

  const foto = (s, extra = '') => s.foto ? `<img class="sl-foto" src="${esc(srcDe(s.foto))}" style="object-position:${esc(s.posicao || '50% 50%')};${extra}" alt="">` : '';
  const selo = (s) => s.selo ? `<div class="sl-selo">${esc(s.selo)}</div>` : '';
  const brasao = () => `<img class="sl-brasao" src="/assets/brasao.png" alt="">`;
  const rodape = (s, i, t, seta) => {
    const dir = s.rodape ? esc(s.rodape) : (t > 1 ? `${pad(i + 1)} / ${pad(t)}${seta ? '&nbsp;&nbsp;→' : ''}` : '');
    return `<div class="sl-rodape"><span>CPOR/SP · ESCOLA DE LÍDERES</span><span class="sl-pg">${dir}</span></div>`;
  };
  const sobre = (s) => s.sobretitulo ? `<div class="sl-sobre">${br(s.sobretitulo)}</div>` : '';
  const titulo = (s, max, min, larg) => s.titulo ? `<div class="metal sl-tit" style="font-size:${fit(s.titulo, max, min, larg)}px">${br(s.titulo)}</div>` : '';
  const destaque = (s, max, min, larg) => s.destaque ? `<div class="ouro sl-tit" style="font-size:${fit(s.destaque, max, min, larg)}px">${br(s.destaque)}</div>` : '';
  const texto = (s, cls = '') => s.texto ? `<div class="sl-txt ${cls}">${br(s.texto)}</div>` : '';
  const itensDe = (s) => (Array.isArray(s.itens) ? s.itens : String(s.itens || '').split('\n')).map((x) => String(x).trim()).filter(Boolean);

  const R = {
    capa(s, i, t) {
      return `${foto(s)}
      <div class="sl-cobre" style="background:linear-gradient(180deg,rgba(13,17,11,.55) 0%,rgba(13,17,11,0) 18%,rgba(13,17,11,0) 38%,rgba(13,17,11,.8) 62%,#0d110b 100%)"></div>
      <div class="sl-cordao" style="top:700px"></div>
      ${selo(s)}${brasao()}
      <div class="sl-bloco" style="left:80px;right:80px;bottom:190px;align-items:flex-start;text-align:left">
        ${sobre(s)}${titulo(s, 150, 60)}${destaque(s, 132, 54)}${s.texto ? `<div class="sl-linha"></div>` : ''}${texto(s)}
      </div>${rodape(s, i, t, true)}`;
    },

    foto(s, i, t) {
      const prog = t > 1 ? `<div class="sl-barra"></div><div class="sl-barra on" style="width:${Math.round(W * (i + 1) / t)}px"></div>` : '';
      return `${foto(s)}
      <div class="sl-cobre" style="background:linear-gradient(180deg,rgba(13,17,11,.5) 0%,rgba(13,17,11,0) 16%,rgba(13,17,11,0) 56%,rgba(13,17,11,.9) 86%,rgba(13,17,11,.96) 100%)"></div>
      ${selo(s)}${brasao()}
      <div class="sl-bloco" style="left:80px;right:80px;bottom:170px;align-items:center;text-align:center;gap:22px">
        <div class="sl-pino"><i></i><b></b></div>
        ${titulo(s, 92, 46)}${texto(s, 'sl-fino')}
        <div class="sl-traco"></div>
      </div>${prog}${rodape(s, i, t)}`;
    },

    info(s, i, t) {
      const it = itensDe(s);
      const fs = it.length > 4 ? 32 : 36;
      const lista = it.length ? `<div class="sl-itens">${it.map((x, k) => `<div class="sl-item" style="font-size:${fs}px"><span class="sl-num">${pad(k + 1)}</span><span>${br(x)}</span></div>`).join('')}</div>` : '';
      const topo = s.foto ? 500 : 300;
      return `${s.foto ? foto(s, 'height:700px;-webkit-mask-image:linear-gradient(180deg,#000 35%,transparent 100%);mask-image:linear-gradient(180deg,#000 35%,transparent 100%)') : ''}
      <div class="sl-cobre" style="background:linear-gradient(180deg,rgba(13,17,11,.55) 0%,rgba(13,17,11,0) 20%)"></div>
      <div class="sl-cordao" style="top:${topo - 60}px;opacity:.22"></div>
      ${selo(s)}${brasao()}
      <div class="sl-bloco" style="left:80px;right:80px;top:${topo}px;align-items:flex-start;text-align:left;gap:16px">
        ${sobre(s)}${titulo(s, 104, 50)}${destaque(s, 88, 42)}
        <div class="sl-linha"></div>
        ${lista}${texto(s)}
      </div>${rodape(s, i, t)}`;
    },

    aviso(s, i, t) {
      const it = itensDe(s).map((x) => { const k = x.indexOf(':'); return k > 0 ? [x.slice(0, k).trim(), x.slice(k + 1).trim()] : ['', x]; });
      const caixas = it.length ? `<div class="sl-caixas" style="grid-template-columns:${it.length > 1 ? '1fr 1fr' : '1fr'}">${it.map(([r, v]) => `<div class="sl-caixa">${r ? `<small>${esc(r)}</small>` : ''}<b>${br(v)}</b></div>`).join('')}</div>` : '';
      return `${foto(s)}
      <div class="sl-cobre" style="background:${s.foto ? 'linear-gradient(180deg,rgba(11,14,9,.55) 0%,rgba(11,14,9,.2) 22%,rgba(11,14,9,.35) 55%,rgba(11,14,9,.92) 100%)' : 'linear-gradient(180deg,rgba(11,14,9,.4),rgba(11,14,9,.95))'}"></div>
      <div class="sl-cordao" style="top:380px"></div>
      ${selo(s)}${brasao()}
      <div class="sl-bloco" style="left:80px;right:80px;top:270px;bottom:160px;align-items:center;justify-content:center;text-align:center;gap:22px">
        ${sobre(s)}${titulo(s, 170, 64)}${destaque(s, 116, 50)}${caixas}${texto(s)}
      </div>${rodape(s, i, t)}`;
    },

    numero(s, i, t) {
      return `${foto(s, 'opacity:.38')}
      <div class="sl-cobre" style="background:linear-gradient(90deg,#0d110b 0%,rgba(13,17,11,.75) 55%,rgba(13,17,11,.35) 100%)"></div>
      <div class="sl-cordao" style="top:560px;opacity:.3"></div>
      ${selo(s)}${brasao()}
      <div class="sl-bloco" style="left:80px;right:80px;top:280px;bottom:170px;align-items:flex-start;justify-content:center;text-align:left;gap:10px">
        ${sobre(s)}
        ${s.destaque ? `<div class="ouro sl-tit" style="font-size:${fit(s.destaque, 320, 110, 920, 0.66)}px;line-height:.9">${br(s.destaque)}</div>` : ''}
        ${titulo(s, 96, 46)}
        ${s.texto ? `<div class="sl-linha"></div>` : ''}${texto(s)}
      </div>${rodape(s, i, t)}`;
    },

    fechamento(s, i, t) {
      return `${foto(s, 'opacity:.28')}
      <div class="sl-cobre" style="background:radial-gradient(ellipse at 50% 45%,rgba(13,17,11,.4) 0%,rgba(13,17,11,.92) 75%)"></div>
      <div class="sl-cordao" style="top:900px;opacity:.3"></div>
      <div class="sl-bloco" style="left:90px;right:90px;top:150px;bottom:170px;align-items:center;justify-content:center;text-align:center;gap:30px">
        <img src="/assets/brasao.png" alt="" style="width:250px;height:250px;border-radius:50%;box-shadow:0 10px 40px rgba(0,0,0,.6)">
        ${s.titulo ? `<div class="ouro sl-tit" style="font-size:${fit(s.titulo, 120, 54)}px">${br(s.titulo)}</div>` : ''}
        ${texto(s)}
        <div class="sl-sobre">${br(s.sobretitulo || '@cporsp_exercito')}</div>
      </div>${rodape(s, i, t)}`;
    },
  };

  function render(s, i = 0, t = 1) {
    const m = R[s.modelo] ? s.modelo : 'foto';
    return `<div class="sl sl-m-${m}">${R[m](s || {}, i, t)}</div>`;
  }

  const css = `
  .sl{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#0d110b;font-family:Montserrat,Arial,sans-serif;color:#E6E0D0;text-align:left;line-height:1.2}
  .sl *{box-sizing:border-box}
  .sl-foto{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;display:block;max-width:none}
  .sl-cobre{position:absolute;inset:0}
  .sl-cordao{position:absolute;left:-180px;width:1500px;height:60px;border-radius:40px;background:linear-gradient(90deg,rgba(122,92,30,0) 0%,#C8A24B 30%,#F1D58A 50%,#C8A24B 70%,rgba(122,92,30,0) 100%);transform:rotate(-7deg);filter:blur(26px);opacity:.42}
  .sl-selo{position:absolute;left:80px;top:104px;border:2px solid #C8A24B;padding:12px 22px;font-family:Oswald,'Arial Narrow',sans-serif;font-weight:500;font-size:26px;letter-spacing:6px;color:#F1D58A;background:rgba(13,17,11,.45);text-transform:uppercase;line-height:1.3}
  .sl-brasao{position:absolute;right:80px;top:92px;width:136px;height:136px;border-radius:50%}
  .sl-bloco{position:absolute;display:flex;flex-direction:column}
  .sl-sobre{font-family:Oswald,'Arial Narrow',sans-serif;font-weight:500;font-size:28px;letter-spacing:6px;color:#F1D58A;text-transform:uppercase;text-shadow:0 2px 10px rgba(0,0,0,.6);line-height:1.35}
  .sl-tit{font-weight:900;text-transform:uppercase;line-height:.98;letter-spacing:2px;padding:4px 0}
  .sl-txt{font-weight:300;font-size:36px;line-height:1.45;letter-spacing:1.5px;color:#E6E0D0;text-shadow:0 3px 16px rgba(0,0,0,.6);max-width:900px}
  .sl-fino{font-size:40px;letter-spacing:4px;line-height:1.4;max-width:860px}
  .sl-linha{width:120px;height:2px;background:#C8A24B;margin:6px 0}
  .sl-bloco[style*="center"] .sl-linha{align-self:center}
  .sl-traco{width:420px;height:1px;background:rgba(230,224,208,.6)}
  .sl-pino{display:flex;flex-direction:column;align-items:center}
  .sl-pino i{width:16px;height:16px;border-radius:8px;border:2px solid #E6E0D0}
  .sl-pino b{width:2px;height:56px;background:#E6E0D0}
  .sl-barra{position:absolute;left:0;bottom:0;width:${W}px;height:8px;background:rgba(230,224,208,.12)}
  .sl-barra.on{background:#C8A24B}
  .sl-rodape{position:absolute;left:80px;right:80px;bottom:64px;display:flex;align-items:center;justify-content:space-between;font-weight:400;font-size:26px;letter-spacing:7px;color:rgba(230,224,208,.85)}
  .sl-pg{font-family:Oswald,'Arial Narrow',sans-serif;font-weight:500;font-size:28px;letter-spacing:4px;color:#F1D58A}
  .sl-itens{display:flex;flex-direction:column;gap:0;width:100%}
  .sl-item{display:flex;gap:28px;align-items:baseline;padding:20px 0;border-bottom:1px solid rgba(200,162,75,.35);font-weight:400;line-height:1.35;color:#E6E0D0}
  .sl-num{font-family:Oswald,'Arial Narrow',sans-serif;font-weight:600;font-size:44px;color:#E2BF67;min-width:64px;line-height:1}
  .sl-caixas{display:grid;gap:18px;width:100%;margin:8px 0}
  .sl-caixa{border:1px solid rgba(200,162,75,.65);background:rgba(13,17,11,.55);padding:22px 26px;display:flex;flex-direction:column;gap:8px;text-align:center}
  .sl-caixa small{font-family:Oswald,'Arial Narrow',sans-serif;font-weight:500;font-size:24px;letter-spacing:5px;color:#F1D58A;text-transform:uppercase}
  .sl-caixa b{font-weight:800;font-size:40px;letter-spacing:1px;color:#E6E0D0;text-transform:uppercase;line-height:1.15}
  .metal{background-image:repeating-linear-gradient(100deg,rgba(255,255,255,.10) 0px,rgba(255,255,255,.10) 1px,rgba(0,0,0,.06) 2px,rgba(0,0,0,0) 4px),radial-gradient(circle at 30% 30%,rgba(255,255,255,.18) 0,rgba(255,255,255,0) 40%),linear-gradient(180deg,#F3EFE4 0%,#DCD6C6 46%,#9E998B 54%,#CFC9B9 78%,#EDE8DA 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;filter:drop-shadow(0 5px 18px rgba(0,0,0,.6)) drop-shadow(0 2px 3px rgba(0,0,0,.5))}
  .ouro{background-image:repeating-linear-gradient(100deg,rgba(255,255,255,.10) 0px,rgba(255,255,255,.10) 1px,rgba(0,0,0,.07) 2px,rgba(0,0,0,0) 4px),linear-gradient(180deg,#FBE7A6 0%,#E2BF67 44%,#9C7426 54%,#D3AE57 80%,#F4DB92 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;filter:drop-shadow(0 5px 18px rgba(0,0,0,.6)) drop-shadow(0 2px 3px rgba(0,0,0,.5))}
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  window.Modelos = { MODELOS, CAMPOS, render, W, H, usarFonte(fn) { srcDe = fn; } };
})();
