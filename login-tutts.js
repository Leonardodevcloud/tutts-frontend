/* LOGIN_V2 */
// ============================================================
// LOGIN TUTTS v2 — fundo "mapa vivo" + formulário com reações
// window.LoginTutts = { Fundo, Form }
//   Fundo: canvas com malha de ruas, pins, entregadores em rota; clique cria pedido.
//   Form:  campos com ícone, olho na senha, Caps Lock, lembrar código, ripple,
//          barra de progresso no botão, tremor + mensagem em erro, chip de saúde da API.
// Padrão: Vanilla JS + React via CDN (sem JSX). Não altera a lógica de login (ql) do app.js.
// ============================================================
(function () {
  const h = React.createElement;
  const { useState, useEffect, useRef } = React;

  const CSS = `
  .tl-cena{position:relative;min-height:100vh;background:#f6f4fb;overflow:hidden;font-family:inherit}
  .tl-malha{position:absolute;inset:-20%;background:conic-gradient(from 0deg at 50% 50%,#ece4fa,#fde7d2,#e9d8fb,#f3ecff,#ffe9d6,#ece4fa);animation:tlGira 40s linear infinite;opacity:.7;filter:blur(40px);pointer-events:none}
  @keyframes tlGira{to{transform:rotate(360deg)}}
  .tl-aura{position:absolute;border-radius:50%;filter:blur(90px);opacity:.75;pointer-events:none;transition:transform .6s ease-out}
  .tl-aura.a{width:720px;height:720px;background:#c9b0f2;left:-220px;top:-200px}
  .tl-aura.b{width:620px;height:620px;background:#ffd0a3;right:-180px;bottom:-200px}
  .tl-mapa{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  .tl-topo{position:absolute;top:0;left:0;right:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:18px 24px;pointer-events:none}
  .tl-topo *{pointer-events:auto}
  .tl-marca{font-size:13px;font-weight:700;color:#5b5670;letter-spacing:.02em}
  .tl-status{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#5b5670;background:#fff;border:1px solid #e7e3f0;border-radius:999px;padding:7px 12px}
  .tl-status i{width:8px;height:8px;border-radius:50%;background:#059669;display:inline-block;animation:tlPisca 1.8s ease-in-out infinite}
  .tl-status.fora i{background:#f59e0b}
  @keyframes tlPisca{50%{opacity:.3}}
  .tl-fx{position:fixed;inset:0;pointer-events:none;z-index:40}
  .tl-onda{position:absolute;width:12px;height:12px;border-radius:50%;border:2px solid rgba(124,58,237,.55);transform:translate(-50%,-50%);animation:tlOnda .9s ease-out forwards}
  @keyframes tlOnda{to{width:220px;height:220px;opacity:0;border-width:1px}}
  .tl-card{position:relative;z-index:2;will-change:transform}
  .tl-card.treme{animation:tlTreme .4s}
  @keyframes tlTreme{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-7px)}40%,60%{transform:translateX(7px)}}
  .tl-brilho{position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),rgba(124,58,237,.10),transparent 45%);opacity:0;transition:opacity .3s}
  .tl-card:hover .tl-brilho{opacity:1}
  .tl-campo{position:relative}
  .tl-campo .tl-ico{position:absolute;left:15px;top:16px;width:18px;height:18px;color:#8b86a0;pointer-events:none;transition:color .2s}
  .tl-campo:focus-within .tl-ico{color:#7c3aed}
  .tl-inp{width:100%;height:50px;border:1.5px solid #e7e3f0;border-radius:14px;padding:0 46px 0 44px;font:inherit;font-size:15px;background:#fff;color:#17102a;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}
  .tl-inp::placeholder{color:#8b86a0}
  .tl-inp:focus{outline:none;border-color:#7c3aed;animation:tlFoco .5s ease-out;box-shadow:0 0 0 4px rgba(124,58,237,.12)}
  @keyframes tlFoco{0%{box-shadow:0 0 0 0 rgba(124,58,237,.35)}100%{box-shadow:0 0 0 4px rgba(124,58,237,.12)}}
  .tl-inp.err{border-color:#dc2626;box-shadow:0 0 0 4px rgba(220,38,38,.12)}
  .tl-inp:disabled{opacity:.6}
  .tl-eye,.tl-ok{position:absolute;right:6px;top:5px;width:40px;height:40px;border:0;background:none;border-radius:10px;color:#8b86a0;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .tl-eye:hover{background:#f1e9fb;color:#5d0b85}
  .tl-ok{color:#059669;pointer-events:none;opacity:0;transform:scale(.6);transition:all .25s}
  .tl-ok.show{opacity:1;transform:scale(1)}
  .tl-ok.show svg path{stroke-dasharray:30;stroke-dashoffset:30;animation:tlDesenha .4s ease-out forwards}
  @keyframes tlDesenha{to{stroke-dashoffset:0}}
  .tl-dica{display:flex;align-items:center;gap:6px;font-size:12px;color:#b45309;min-height:16px;margin-top:6px}
  .tl-linha{display:flex;justify-content:space-between;align-items:center;font-size:13px}
  .tl-check{display:flex;align-items:center;gap:8px;color:#5b5670;cursor:pointer}
  .tl-check input{width:16px;height:16px;accent-color:#5d0b85}
  .tl-btn{position:relative;overflow:hidden;width:100%;height:50px;border:0;border-radius:14px;background:#5d0b85;color:#fff;font:inherit;font-weight:700;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 12px 24px -12px rgba(93,11,133,.7);transition:transform .15s,background .2s}
  .tl-btn:hover{background:#4a0969;transform:translateY(-1px)}
  .tl-btn:active{transform:scale(.99)}
  .tl-btn:disabled{cursor:progress;transform:none}
  .tl-btn .tl-prog{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(255,255,255,.22);transition:width .4s ease}
  .tl-btn > span,.tl-btn > svg{position:relative}
  .tl-btn .tl-ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,.45);transform:scale(0);animation:tlRipple .6s linear;pointer-events:none}
  @keyframes tlRipple{to{transform:scale(4);opacity:0}}
  .tl-spin{animation:tlSpin 1s linear infinite}
  @keyframes tlSpin{to{transform:rotate(360deg)}}
  .tl-alerta{display:flex;gap:10px;align-items:flex-start;border-radius:12px;padding:10px 12px;font-size:13px;line-height:1.4;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;animation:tlEntra .3s both}
  .tl-alerta.info{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
  @keyframes tlEntra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .tl-links{display:flex;justify-content:space-between;font-size:13px}
  .tl-links button{background:none;border:0;padding:0;font:inherit;font-weight:700;color:#7c3aed;cursor:pointer}
  .tl-links button:hover{color:#5d0b85}
  .tl-links button.sec{color:#5b5670;font-weight:600}
  @media (prefers-reduced-motion:reduce){.tl-malha,.tl-status i{animation:none}}
  `;

  function injetarCss() {
    if (document.getElementById('tl-css')) return;
    const s = document.createElement('style'); s.id = 'tl-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  const ico = (path, extra) => h('svg', Object.assign({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, width: 18, height: 18 }, extra || {}), path);

  // ─────────────────────────────────────────────────────────────
  // FUNDO: mapa vivo (canvas)
  // ─────────────────────────────────────────────────────────────
  function Fundo({ apiUrl }) {
    injetarCss();
    const cvRef = useRef(null), auraA = useRef(null), auraB = useRef(null), fxRef = useRef(null);
    const [saude, setSaude] = useState('ok');

    useEffect(() => {
      // saúde da API (chip)
      let vivo = true;
      const checar = async () => { try { const r = await fetch(`${apiUrl || window.API_URL || ''}/health`, { cache: 'no-store' }); if (vivo) setSaude(r.ok ? 'ok' : 'fora'); } catch (_) { if (vivo) setSaude('fora'); } };
      checar(); const it = setInterval(checar, 60000);
      return () => { vivo = false; clearInterval(it); };
    }, [apiUrl]);

    useEffect(() => {
      const cv = cvRef.current; if (!cv) return;
      const ctx = cv.getContext('2d');
      const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let W, H, ruas = [], pins = [], motos = [], mouse = { x: -9999, y: -9999 }, tempo = 0, raf = 0, vivo = true;
      const DPR = Math.min(2, devicePixelRatio || 1);
      const rnd = (a, b) => a + Math.random() * (b - a);
      function gerar() {
        W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ruas = []; const passo = 58;
        for (let k = -H * 1.5; k < W * 1.5; k += passo) ruas.push({ tipo: 'v', k, g: Math.round(k / passo) % 4 === 0 });
        for (let k = -W * 0.6; k < H * 1.6; k += passo) ruas.push({ tipo: 'h', k, g: Math.round(k / passo) % 3 === 0 });
        ruas.av = [[[-50, H * .7], [W * .25, H * .55], [W * .6, H * .75], [W + 50, H * .4]], [[-50, H * .25], [W * .3, H * .35], [W * .7, H * .15], [W + 50, H * .3]], [[W * .15, -50], [W * .2, H * .4], [W * .45, H * .6], [W * .5, H + 50]]];
        ruas.ang = -0.18;
        pins = Array.from({ length: W < 640 ? 6 : 9 }, () => ({ x: rnd(W * .05, W * .95), y: rnd(H * .1, H * .9), f: Math.random() * Math.PI * 2, entregue: false }));
        motos = Array.from({ length: W < 640 ? 3 : 5 }, () => novaMoto());
      }
      function novaMoto(from) { const a = from || pins[Math.floor(Math.random() * pins.length)]; let b = pins[Math.floor(Math.random() * pins.length)]; if (a === b) b = pins[(pins.indexOf(a) + 1) % pins.length]; const canto = Math.random() < .5 ? { x: a.x, y: b.y } : { x: b.x, y: a.y }; /* sempre em L */ return { p: [a, canto, b], t: 0, v: rnd(.0025, .0045), trilha: [], alvo: b }; }
      function posMoto(m) { const t = m.t, [a, c, b] = m.p, d1 = Math.hypot(c.x - a.x, c.y - a.y), d2 = Math.hypot(b.x - c.x, b.y - c.y), tot = d1 + d2 || 1, s = t * tot; if (s < d1) { const k = s / (d1 || 1); return { x: a.x + (c.x - a.x) * k, y: a.y + (c.y - a.y) * k }; } const k = (s - d1) / (d2 || 1); return { x: c.x + (b.x - c.x) * k, y: c.y + (b.y - c.y) * k }; }
      gerar();
      const onResize = () => gerar();
      const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; if (reduz || matchMedia('(hover:none)').matches) return; const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5; if (auraA.current) auraA.current.style.transform = `translate(${nx * -40}px,${ny * -30}px)`; if (auraB.current) auraB.current.style.transform = `translate(${nx * 50}px,${ny * 40}px)`; };
      const onDown = (e) => {
        // onda em qualquer clique
        const fx = fxRef.current; if (fx && !reduz) { const o = document.createElement('span'); o.className = 'tl-onda'; o.style.left = e.clientX + 'px'; o.style.top = e.clientY + 'px'; fx.appendChild(o); setTimeout(() => o.remove(), 900); }
        if (e.target.closest('.tl-card,.tl-topo,button,a,input,label')) return;
        const pin = { x: e.clientX, y: e.clientY, f: 0, entregue: false, novo: 1 }; pins.push(pin); if (pins.length > 14) pins.shift();
        const m = novaMoto(pins[Math.floor(Math.random() * (pins.length - 1))]); m.p[2] = pin; m.alvo = pin; m.p[1] = { x: m.p[0].x, y: pin.y }; motos.push(m); if (motos.length > 8) motos.shift();
      };
      addEventListener('resize', onResize); addEventListener('pointermove', onMove); addEventListener('pointerdown', onDown);
      function desenha() {
        if (!vivo) return; tempo += 1 / 60; ctx.clearRect(0, 0, W, H);
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ruas.ang); ctx.translate(-W / 2, -H / 2);
        for (const r of ruas) { ctx.strokeStyle = r.g ? 'rgba(124,58,237,.16)' : 'rgba(124,58,237,.07)'; ctx.lineWidth = r.g ? 2.2 : 1; ctx.beginPath(); if (r.tipo === 'v') { ctx.moveTo(r.k, -H); ctx.lineTo(r.k, H * 2); } else { ctx.moveTo(-W, r.k); ctx.lineTo(W * 2, r.k); } ctx.stroke(); }
        ctx.restore();
        for (const c of ruas.av) { ctx.strokeStyle = 'rgba(124,58,237,.18)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); ctx.bezierCurveTo(c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1]); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -tempo * 30; ctx.stroke(); ctx.setLineDash([]); }
        if (mouse.x > 0) { const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 260); g.addColorStop(0, 'rgba(124,58,237,.10)'); g.addColorStop(1, 'rgba(124,58,237,0)'); ctx.fillStyle = g; ctx.fillRect(mouse.x - 260, mouse.y - 260, 520, 520); }
        for (const m of motos) {
          const [a, c, b] = m.p; ctx.strokeStyle = 'rgba(246,118,2,.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -tempo * 40; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
          m.t += m.v; const q = posMoto(m); m.trilha.push(q); if (m.trilha.length > 22) m.trilha.shift();
          for (let i = 0; i < m.trilha.length; i++) { const k = i / m.trilha.length; ctx.fillStyle = `rgba(246,118,2,${k * .5})`; ctx.beginPath(); ctx.arc(m.trilha[i].x, m.trilha[i].y, 1.5 + k * 3, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = '#f67602'; ctx.shadowColor = 'rgba(246,118,2,.8)'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(q.x, q.y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, 2, 0, Math.PI * 2); ctx.fill();
          if (m.t >= 1) { m.alvo.entregue = true; m.alvo.f = 0; Object.assign(m, novaMoto(m.alvo)); }
        }
        for (const p of pins) {
          p.f += .03; const pulso = (Math.sin(p.f) + 1) / 2; const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y); const l = dm < 260 ? 1 - dm / 260 : 0;
          ctx.strokeStyle = p.entregue ? `rgba(5,150,105,${.5 - pulso * .4})` : `rgba(124,58,237,${.5 - pulso * .4})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + pulso * 16, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = p.entregue ? '#059669' : '#5d0b85'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y - 10, 7 + l * 2, Math.PI * .8, Math.PI * 2.2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y - 10, 2.6, 0, Math.PI * 2); ctx.fill();
          if (p.novo) { p.novo *= .9; ctx.strokeStyle = `rgba(246,118,2,${p.novo})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 40 * (1 - p.novo), 0, Math.PI * 2); ctx.stroke(); if (p.novo < .02) p.novo = 0; }
        }
        if (!reduz) raf = requestAnimationFrame(desenha);
      }
      desenha();
      return () => { vivo = false; cancelAnimationFrame(raf); removeEventListener('resize', onResize); removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown); };
    }, []);

    return h(React.Fragment, null,
      h('div', { className: 'tl-malha', 'aria-hidden': 'true' }),
      h('div', { className: 'tl-aura a', ref: auraA, 'aria-hidden': 'true' }),
      h('div', { className: 'tl-aura b', ref: auraB, 'aria-hidden': 'true' }),
      h('canvas', { className: 'tl-mapa', ref: cvRef, 'aria-hidden': 'true' }),
      h('div', { className: 'tl-fx', ref: fxRef, 'aria-hidden': 'true' }),
      h('div', { className: 'tl-topo' },
        h('span', { className: 'tl-marca' }, 'Central Tutts'),
        h('span', { className: 'tl-status' + (saude === 'fora' ? ' fora' : ''), title: 'Saúde da API' }, h('i'), saude === 'fora' ? 'Instabilidade na API' : 'Sistemas operando')));
  }

  // ─────────────────────────────────────────────────────────────
  // FORM: campos e reações (a autenticação continua sendo a do app.js)
  // ─────────────────────────────────────────────────────────────
  function Form({ cod, senha, onCod, onSenha, loading, erro, onEntrar, onCriar, onEsqueci }) {
    injetarCss();
    const [ver, setVer] = useState(false), [caps, setCaps] = useState(false), [lembrar, setLembrar] = useState(true), [lento, setLento] = useState(false);
    const senhaRef = useRef(null), btnRef = useRef(null), progRef = useRef(null), lentoT = useRef(null), eraLoading = useRef(false);

    // lembrar código
    useEffect(() => { try { const s = localStorage.getItem('tutts_login_cod'); if (s && !cod) { onCod(s); setTimeout(() => senhaRef.current && senhaRef.current.focus(), 300); } } catch (_) {} }, []); // eslint-disable-line
    useEffect(() => { try { if (lembrar && cod) localStorage.setItem('tutts_login_cod', cod); if (!lembrar) localStorage.removeItem('tutts_login_cod'); } catch (_) {} }, [lembrar, cod]);

    // barra de progresso + aviso de lentidão + tremor no erro
    useEffect(() => {
      const prog = progRef.current; if (!prog) return;
      if (loading) {
        prog.style.width = '15%'; setTimeout(() => prog.style.width = '55%', 250); setTimeout(() => prog.style.width = '80%', 900);
        lentoT.current = setTimeout(() => setLento(true), 4000);
      } else {
        clearTimeout(lentoT.current); setLento(false);
        prog.style.width = '100%'; setTimeout(() => { prog.style.transition = 'none'; prog.style.width = '0'; prog.offsetHeight; prog.style.transition = ''; }, 350);
      }
      eraLoading.current = loading;
    }, [loading]);
    useEffect(() => { if (erro) { const card = btnRef.current && btnRef.current.closest('.tl-card'); if (card) { card.classList.remove('treme'); card.offsetHeight; card.classList.add('treme'); card.addEventListener('animationend', () => card.classList.remove('treme'), { once: true }); } if (navigator.vibrate) navigator.vibrate(40); if (senhaRef.current) { senhaRef.current.focus(); } } }, [erro]);

    const ripple = (e) => { const b = e.currentTarget, r = b.getBoundingClientRect(), d = Math.max(r.width, r.height); const s = document.createElement('span'); s.className = 'tl-ripple'; s.style.width = s.style.height = d + 'px'; s.style.left = (e.clientX - r.left - d / 2) + 'px'; s.style.top = (e.clientY - r.top - d / 2) + 'px'; b.appendChild(s); setTimeout(() => s.remove(), 600); };
    const capsCheck = (e) => setCaps(!!(e.getModifierState && e.getModifierState('CapsLock')));
    const submit = (e) => { e.preventDefault(); if (loading) return; onEntrar(); };

    return h('form', { onSubmit: submit, noValidate: true, autoComplete: 'on', style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      erro && h('div', { className: 'tl-alerta', role: 'alert' }, ico(h('g', null, h('circle', { cx: 12, cy: 12, r: 9 }), h('path', { d: 'M15 9l-6 6m0-6 6 6' }))), h('div', null, h('b', null, 'Código ou senha não conferem.'), ' Confira e tente de novo.')),
      lento && !erro && h('div', { className: 'tl-alerta info' }, ico(h('g', null, h('circle', { cx: 12, cy: 12, r: 9 }), h('path', { d: 'M12 8h.01M11 12h1v4h1' }))), h('div', null, 'A rede está lenta, mas estamos tentando…')),
      h('div', { className: 'tl-campo' },
        h('svg', { className: 'tl-ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('circle', { cx: 12, cy: 8, r: 4 }), h('path', { d: 'M4 21a8 8 0 0 1 16 0' })),
        h('label', { htmlFor: 'tl-cod', style: { position: 'absolute', left: -9999 } }, 'Código profissional'),
        h('input', { id: 'tl-cod', className: 'tl-inp', type: 'text', placeholder: 'Código profissional', autoComplete: 'username', autoCapitalize: 'none', spellCheck: false, value: cod || '', disabled: loading, onChange: (e) => onCod(e.target.value) }),
        h('span', { className: 'tl-ok' + ((cod || '').trim().length >= 3 ? ' show' : ''), 'aria-hidden': 'true' }, ico(h('path', { d: 'M20 6 9 17l-5-5' }), { strokeWidth: 2.5 }))),
      h('div', null,
        h('div', { className: 'tl-campo' },
          h('svg', { className: 'tl-ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }, h('rect', { x: 4, y: 10, width: 16, height: 11, rx: 2 }), h('path', { d: 'M8 10V7a4 4 0 0 1 8 0v3' })),
          h('label', { htmlFor: 'tl-senha', style: { position: 'absolute', left: -9999 } }, 'Senha'),
          h('input', { id: 'tl-senha', ref: senhaRef, className: 'tl-inp' + (erro ? ' err' : ''), type: ver ? 'text' : 'password', placeholder: 'Senha', autoComplete: 'current-password', value: senha || '', disabled: loading, onChange: (e) => onSenha(e.target.value), onKeyDown: capsCheck, onKeyUp: capsCheck, onBlur: () => setCaps(false) }),
          h('button', { type: 'button', className: 'tl-eye', 'aria-label': ver ? 'Ocultar senha' : 'Mostrar senha', 'aria-pressed': ver, onClick: () => { setVer(!ver); senhaRef.current && senhaRef.current.focus(); } },
            ver ? ico(h('path', { d: 'M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1' }))
                : ico(h('g', null, h('path', { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z' }), h('circle', { cx: 12, cy: 12, r: 3 }))))),
        h('div', { className: 'tl-dica', style: { visibility: caps ? 'visible' : 'hidden' } }, ico(h('g', null, h('path', { d: 'M12 9v4m0 4h.01' }), h('circle', { cx: 12, cy: 12, r: 9 })), { width: 14, height: 14 }), 'Caps Lock está ativado')),
      h('div', { className: 'tl-linha' },
        h('label', { className: 'tl-check' }, h('input', { type: 'checkbox', checked: lembrar, onChange: (e) => setLembrar(e.target.checked) }), 'Lembrar código'),
        h('button', { type: 'button', onClick: onEsqueci, style: { background: 'none', border: 0, padding: 0, font: 'inherit', fontWeight: 600, color: erro ? '#f67602' : '#7c3aed', cursor: 'pointer' } }, 'Esqueci minha senha')),
      h('button', { type: 'submit', className: 'tl-btn', ref: btnRef, disabled: loading, onPointerDown: ripple },
        h('span', { className: 'tl-prog', ref: progRef }),
        loading ? h(React.Fragment, null, ico(h('path', { d: 'M21 12a9 9 0 1 1-6.2-8.56' }), { className: 'tl-spin', strokeWidth: 2.5 }), h('span', null, 'Validando acesso…'))
                : h(React.Fragment, null, h('span', null, 'Entrar'), ico(h('path', { d: 'M5 12h14m-6-6 6 6-6 6' }), { strokeWidth: 2.5 }))),
      h('p', { style: { margin: '4px 0 0', textAlign: 'center', fontSize: 13, color: '#5b5670' } }, 'Ainda não tem conta? ', h('button', { type: 'button', onClick: onCriar, style: { background: 'none', border: 0, padding: 0, font: 'inherit', fontWeight: 700, color: '#7c3aed', cursor: 'pointer' } }, 'Criar nova conta')));
  }

  // Inclinação 3D do cartão + brilho seguindo o mouse (aplica em qualquer .tl-card)
  function Card({ children, className, style }) {
    injetarCss();
    const ref = useRef(null);
    useEffect(() => {
      const el = ref.current; if (!el) return; const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover:none)').matches; if (reduz) return;
      let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, vivo = true;
      const brilho = el.querySelector('.tl-brilho');
      const mv = (e) => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; if (brilho) { const r = el.getBoundingClientRect(); brilho.style.setProperty('--mx', (e.clientX - r.left) + 'px'); brilho.style.setProperty('--my', (e.clientY - r.top) + 'px'); } };
      const tick = () => { if (!vivo) return; cx += (tx - cx) * .08; cy += (ty - cy) * .08; if (!el.classList.contains('treme')) el.style.transform = `perspective(1100px) rotateY(${cx * 4}deg) rotateX(${-cy * 4}deg)`; raf = requestAnimationFrame(tick); };
      addEventListener('pointermove', mv); tick();
      return () => { vivo = false; cancelAnimationFrame(raf); removeEventListener('pointermove', mv); };
    }, []);
    return h('div', { ref, className: 'tl-card ' + (className || ''), style }, h('div', { className: 'tl-brilho', 'aria-hidden': 'true' }), children);
  }

  window.LoginTutts = { Fundo, Form, Card };
})();
