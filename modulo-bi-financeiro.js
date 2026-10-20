/**
 * modulo-bi-financeiro.js — BI_FINANCEIRO_V1 + BI_FINANCEIRO_V2
 * V2: gráficos interativos (tooltip rico no hover/foco/toque, destaque da coluna,
 *     animação de entrada), veículo clicável vira filtro, tabela de clientes cabe
 *     inteira (colunas fluidas, cabeçalho ordenável, sombra quando rola).
 * ─────────────────────────────────────────────────────────────────────────
 * Aba "BI Financeiro" do módulo Financeiro: faturamento, repasse, mínimo
 * garantido e margem a partir das entregas do BI.
 *
 * Backend: /api/financial/bi-financeiro (painel, filtros, params, metas,
 * garantido/sincronizar). Regras de cálculo ficam no backend.
 *
 * Expõe window.ModuloBiFinanceiroComponent({ API_URL, fetchAuth, ja }).
 */
(function () {
  'use strict';

  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useMemo = React.useMemo, useCallback = React.useCallback;

  var ROXO = '#770fa8', ROXO_E = '#5d0b85', ROXO_ESC = '#3a1556', LILAS = '#d8c3ea', LARANJA = '#f67602';
  var CINZA = '#6b7280', BORDA = '#e5e7eb';
  var BASE = '/financial/bi-financeiro';
  var LS_KEY = 'bifin_filtros_v1';

  // ── formatadores ────────────────────────────────────────────────
  var L = 'pt-BR';
  function brl(v) { v = Number(v || 0); return (v < 0 ? '-R$ ' : 'R$ ') + Math.abs(v).toLocaleString(L, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function int(v) { return Math.round(Number(v || 0)).toLocaleString(L); }
  function dec(v) { return Number(v || 0).toLocaleString(L, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(v) { return Number(v || 0).toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }
  function ddmm(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
  function ddmmaaaa(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDias(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); }
  function dow(iso) { return new Date(iso + 'T12:00:00').getDay(); }
  function segundaDe(iso) { var w = dow(iso); return addDias(iso, w === 0 ? -6 : 1 - w); }
  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    var s = String(v).trim();
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    var n = Number(s); return isFinite(n) ? n : null;
  }
  function dataHora(v) {
    if (!v) return null;
    var d = new Date(v); if (isNaN(d.getTime())) return null;
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' às ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function periodoDoPreset(id) {
    var hoje = new Date(); var t = ymd(hoje);
    if (id === 'hoje') return [t, t];
    if (id === '7d') return [addDias(t, -6), t];
    if (id === 'mes') return [t.slice(0, 8) + '01', t];
    if (id === 'mes_passado') {
      var d = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return [ymd(new Date(d.getFullYear(), d.getMonth(), 1)), ymd(d)];
    }
    if (id === '90d') return [addDias(t, -89), t];
    if (id === 'ano') return [t.slice(0, 4) + '-01-01', t];
    return null;
  }
  var PRESETS = [['hoje', 'Hoje'], ['7d', '7 dias'], ['mes', 'Este mês'], ['mes_passado', 'Mês passado'], ['90d', '90 dias'], ['ano', 'Este ano'], ['custom', 'Personalizado']];

  function filtrosIniciais() {
    var p = periodoDoPreset('mes');
    var base = { preset: 'mes', ini: p[0], fim: p[1], semana: '', veiculos: [], clientes: [], ccs: [], agrupar: true };
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (s && typeof s === 'object') {
        var f = Object.assign({}, base, s);
        if (f.preset !== 'custom') { var pp = periodoDoPreset(f.preset); if (pp) { f.ini = pp[0]; f.fim = pp[1]; } }
        ['veiculos', 'clientes', 'ccs'].forEach(function (k) { if (!Array.isArray(f[k])) f[k] = []; });
        return f;
      }
    } catch (_) { /* sem storage */ }
    return base;
  }

  // ── ícones ──────────────────────────────────────────────────────
  function ico(nome, px, extra) {
    return h('svg', { className: 'ico', 'aria-hidden': 'true', style: Object.assign({ width: px || 14, height: px || 14, flex: 'none' }, extra || {}) }, h('use', { href: '#i-' + nome }));
  }
  function chevron(aberto) {
    return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', style: { transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' } }, h('path', { d: 'm9 18 6-6-6-6' }));
  }

  // ── estilos ─────────────────────────────────────────────────────
  var S = {
    card: { background: '#fff', border: '1px solid ' + BORDA, borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 },
    h2: { margin: 0, fontFamily: 'Sora,Inter,sans-serif', fontSize: 15, color: ROXO_ESC },
    sub: { margin: '2px 0 0', fontSize: 12, color: CINZA },
    btn: { height: 40, padding: '0 14px', borderRadius: 10, background: '#fff', color: '#374151', border: '1px solid ' + BORDA, fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' },
    btnP: { height: 40, padding: '0 14px', borderRadius: 10, background: ROXO, color: '#fff', border: 0, fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' },
    lbl: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 0 },
    inp: { height: 38, border: '1px solid ' + BORDA, borderRadius: 8, padding: '0 10px', fontSize: 13, color: '#111827', background: '#fff', boxSizing: 'border-box', width: '100%', fontFamily: 'inherit' },
    legenda: { display: 'inline-flex', alignItems: 'center', gap: 6 },
    quad: function (c) { return { width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block' }; },
  };

  // ── MultiSelect (botão + painel com busca e checkboxes) ─────────
  function MultiSelect(props) {
    var _a = useState(false), aberto = _a[0], setAberto = _a[1];
    var _b = useState(''), busca = _b[0], setBusca = _b[1];
    var ref = useRef(null); var btnRef = useRef(null);
    useEffect(function () {
      if (!aberto) return undefined;
      function fora(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
      function esc(e) { if (e.key === 'Escape') { setAberto(false); if (btnRef.current) btnRef.current.focus(); } }
      document.addEventListener('mousedown', fora); document.addEventListener('keydown', esc);
      return function () { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
    }, [aberto]);
    var vals = props.valores || [];
    var ops = props.opcoes || [];
    var b = busca.trim().toLowerCase();
    var vis = b ? ops.filter(function (o) { return o.label.toLowerCase().indexOf(b) >= 0; }) : ops;
    var resumo = vals.length === 0 ? props.vazio : vals.length === 1 ? ((ops.find(function (o) { return o.valor === vals[0]; }) || {}).label || '1 selecionado') : vals.length + ' selecionados';
    function toggle(v) { props.onChange(vals.indexOf(v) >= 0 ? vals.filter(function (x) { return x !== v; }) : vals.concat([v])); }
    return h('div', { ref: ref, style: { position: 'relative', minWidth: 0 } },
      h('span', { id: props.id + '-l', style: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 } }, props.label),
      h('button', {
        ref: btnRef, type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': aberto, 'aria-labelledby': props.id + '-l', disabled: props.desabilitado,
        onClick: function () { setAberto(!aberto); },
        style: Object.assign({}, S.inp, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: props.desabilitado ? 'not-allowed' : 'pointer', textAlign: 'left', color: props.desabilitado ? '#9ca3af' : '#111827', background: props.desabilitado ? '#f9fafb' : '#fff' })
      }, h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, resumo),
        h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': 'true', style: { flex: 'none' } }, h('path', { d: 'm6 9 6 6 6-6' }))),
      aberto && h('div', { style: { position: 'absolute', zIndex: 30, top: '100%', left: 0, marginTop: 4, width: 'max(100%, 300px)', maxWidth: '86vw', background: '#fff', border: '1px solid ' + BORDA, borderRadius: 10, boxShadow: '0 12px 30px rgba(17,24,39,.15)', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 } },
        props.buscavel && h('input', { type: 'text', autoFocus: true, value: busca, onChange: function (e) { setBusca(e.target.value); }, placeholder: 'Buscar…', 'aria-label': 'Buscar em ' + props.label, style: Object.assign({}, S.inp, { height: 34 }) }),
        h('div', { role: 'listbox', 'aria-multiselectable': 'true', style: { maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
          vis.length === 0 && h('span', { style: { padding: 10, color: CINZA, fontSize: 12 } }, 'Nada encontrado'),
          vis.map(function (o) {
            var on = vals.indexOf(o.valor) >= 0;
            return h('label', { key: o.valor, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: on ? '#faf5ff' : 'transparent', fontWeight: 400, color: '#111827' } },
              h('input', { type: 'checkbox', checked: on, onChange: function () { toggle(o.valor); }, style: { accentColor: ROXO, width: 16, height: 16, flex: 'none' } }),
              h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, o.label),
              o.extra && h('span', { style: { marginLeft: 'auto', fontSize: 11, color: CINZA, flex: 'none' } }, o.extra));
          })),
        vals.length > 0 && h('button', { type: 'button', onClick: function () { props.onChange([]); }, style: { alignSelf: 'flex-start', border: 0, background: 'none', color: ROXO, fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: '4px 6px' } }, 'Limpar seleção')));
  }

  // ── BI_FINANCEIRO_V2: CSS (animação de entrada, hover, foco) ────
  function garantirCss() {
    if (typeof document === 'undefined' || document.getElementById('bifin-css-v2')) return;
    var st = document.createElement('style'); st.id = 'bifin-css-v2';
    st.textContent = [
      '@keyframes bifinGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}',
      '@keyframes bifinFade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}',
      '.bifin-grow{transform-origin:bottom center;animation:bifinGrow .4s cubic-bezier(.2,.7,.2,1) both}',
      '.bifin-grow-top{transform-origin:top center;animation:bifinGrow .4s cubic-bezier(.2,.7,.2,1) both}',
      '.bifin-tip{animation:bifinFade .12s ease-out both}',
      '.bifin-anim{transition:opacity .15s ease,height .15s ease,background-color .15s ease,width .15s ease}',
      '.bifin-foco:focus{outline:none}',
      '.bifin-foco:focus-visible{outline:2px solid #770fa8;outline-offset:1px;border-radius:6px}',
      '.bifin-row{transition:background-color .15s ease}',
      '.bifin-row:hover{background:#faf7fd !important}',
      '.bifin-row-neg:hover{background:#fde8e8 !important}',
      '.bifin-veic{transition:background-color .15s ease,border-color .15s ease}',
      '.bifin-veic:hover{background:#faf7fd}',
      '.bifin-th{transition:color .15s ease}',
      '.bifin-th:hover{color:#3a1556}',
      '.bifin-kpi{transition:border-color .15s ease,box-shadow .15s ease}',
      '.bifin-kpi:hover{border-color:#d8c3ea;box-shadow:0 4px 14px rgba(119,15,168,.08)}',
      '@keyframes bifinGrowX{from{transform:scaleX(0)}to{transform:scaleX(1)}}',
      '.bifin-grow-x{transform-origin:left center;animation:bifinGrowX .45s cubic-bezier(.2,.7,.2,1) both}',
      '@keyframes bifinRing{0%{box-shadow:0 0 0 3px rgba(119,15,168,.45)}100%{box-shadow:0 0 0 3px rgba(119,15,168,0)}}',
      '.bifin-flash{animation:bifinRing 1.8s ease-out}',
      '@keyframes bifinRowFlash{0%,35%{background-color:#ead9f8}100%{background-color:transparent}}',
      '.bifin-flash-row{animation:bifinRowFlash 1.9s ease-out}',
      '.bifin-listra{background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.6) 0 3px,rgba(255,255,255,0) 3px 7px)}',
      '@media (prefers-reduced-motion: reduce){.bifin-grow,.bifin-grow-top,.bifin-grow-x,.bifin-tip{animation:none}.bifin-anim,.bifin-veic,.bifin-row,.bifin-kpi,.bifin-th{transition:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ── BI_FINANCEIRO_V2: tooltip compartilhado ─────────────────────
  // Mouse: segue o cursor. Toque: abre no tap (tap fora fecha). Teclado: abre no foco.
  function useTip() {
    var ref = useRef(null);
    var ultimo = useRef('');
    var _t = useState(null), tip = _t[0], setTip = _t[1];
    var aberto = !!tip;
    useEffect(function () {
      if (!aberto) return undefined;
      function fora(e) { if (ref.current && !ref.current.contains(e.target)) setTip(null); }
      function esc(e) { if (e.key === 'Escape') setTip(null); }
      document.addEventListener('pointerdown', fora); document.addEventListener('keydown', esc);
      return function () { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', esc); };
    }, [aberto]);
    function posDe(e) {
      if (e && e.abs) return { x: e.x, y: e.y };
      var r = ref.current ? ref.current.getBoundingClientRect() : { left: 0, top: 0 };
      if (e && typeof e.clientX === 'number' && e.type !== 'focus' && (e.clientX !== 0 || e.clientY !== 0)) return { x: e.clientX - r.left, y: e.clientY - r.top };
      var el = e && (e.currentTarget || e.target);
      if (el && el.getBoundingClientRect) { var t = el.getBoundingClientRect(); return { x: t.left + t.width / 2 - r.left, y: t.top + Math.min(40, t.height / 3) - r.top }; }
      return { x: 0, y: 0 };
    }
    function show(e, id, conteudo) { var p = posDe(e); setTip({ id: id, conteudo: conteudo, x: p.x, y: p.y, abaixo: !!(e && e.abaixo), lado: !!(e && e.lado), xL: e && e.xL, xR: e && e.xR }); }
    // posição fixa a partir de um retângulo (ponto do gráfico, card): {abs, x, y}
    function relRect(r, fx, fy) { var sr = ref.current ? ref.current.getBoundingClientRect() : { left: 0, top: 0 }; return { abs: true, x: r.left - sr.left + r.width * fx, y: r.top - sr.top + r.height * fy }; }
    function hide() { setTip(null); }
    return {
      ref: ref, tip: tip, ativo: tip ? tip.id : null, show: show, hide: hide, ultimo: ultimo, relRect: relRect,
      // props prontas para um alvo de hover (coluna, ponto, card)
      alvo: function (id, fn, posFn) {
        function mostra(e) { show(posFn ? posFn(e) : e, id, fn()); }
        return {
          onPointerDown: function (e) { ultimo.current = e.pointerType || 'mouse'; },
          onPointerEnter: function (e) { if (e.pointerType === 'mouse') mostra(e); },
          onPointerMove: function (e) { if (e.pointerType === 'mouse' && (!posFn || !tip || tip.id !== id)) mostra(e); },
          onPointerLeave: function (e) { if (e.pointerType === 'mouse') hide(); },
          onClick: function (e) {
            var tipo = ultimo.current; ultimo.current = '';
            if (tipo === 'mouse') return;
            if (tip && tip.id === id && tipo) hide(); else mostra(e);
          },
          onFocus: function (e) { if (!ultimo.current) mostra(e); },
          onBlur: function () { hide(); }
        };
      }
    };
  }

  function TipBox(props) {
    var el = useRef(null);
    var _p = useState(null), xy = _p[0], setXy = _p[1];
    var tip = props.tip;
    React.useLayoutEffect(function () {
      if (!tip || !el.current || !props.box.current) return;
      var W = props.box.current.clientWidth, H = props.box.current.clientHeight;
      var w = el.current.offsetWidth, hh = el.current.offsetHeight;
      var l = tip.x + 14;
      if (l + w > W - 4) l = tip.x - 14 - w;
      if (l < 4) l = Math.max(4, Math.min(W - w - 4, tip.x - w / 2));
      var t = tip.abaixo ? tip.y + 8 : tip.y - hh - 12;
      if (!tip.abaixo && t < 4) t = tip.y + 18;
      if (t + hh > H + 40) t = Math.max(4, H - hh);
      if (tip.lado) { // ao lado do ponto, centralizado na altura dele (não cobre o ponto)
        var xr = tip.xR != null ? tip.xR : tip.x, xl = tip.xL != null ? tip.xL : tip.x;
        l = xr + (tip.xR != null ? 6 : 16); if (l + w > W - 4) l = xl - (tip.xL != null ? 6 : 16) - w;
        t = Math.max(4, Math.min(H - hh - 4, tip.y - hh / 2));
      }
      setXy({ l: l, t: t });
    }, [tip && tip.x, tip && tip.y, tip && tip.id]);
    if (!tip) return null;
    return h('div', {
      ref: el, role: 'tooltip', className: 'bifin-tip',
      style: { position: 'absolute', left: xy ? xy.l : tip.x, top: xy ? xy.t : tip.y, visibility: xy ? 'visible' : 'hidden', zIndex: 25, pointerEvents: 'none',
        background: '#fff', border: '1px solid ' + BORDA, borderRadius: 10, boxShadow: '0 12px 28px rgba(17,24,39,.16)', padding: '10px 12px', fontSize: 12, lineHeight: 1.35,
        minWidth: 200, maxWidth: 280, color: '#111827', fontFamily: 'Inter,system-ui,sans-serif', textAlign: 'left' }
    }, tip.conteudo);
  }

  var DS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var VERDE = '#15803d', VERMELHO = '#b91c1c', AMBAR = '#92400e';
  function sinal(v, fmt) { return (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v)); }
  function pp(v) { return Math.abs(v).toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' p.p.'; }
  function linhaTip(l, v, st) {
    return h('div', { key: l, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '2px 0' } },
      h('span', { style: { color: CINZA, whiteSpace: 'nowrap' } }, l),
      h('span', { style: Object.assign({ fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }, st || {}) }, v));
  }
  function miniDif(txt, cor) { return h('span', { style: { color: cor, fontWeight: 600, fontSize: 11, marginLeft: 6 } }, txt); }
  function pill(txt, bom) {
    return h('span', { style: { display: 'inline-block', fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 8px', color: bom ? VERDE : VERMELHO, background: bom ? '#f0fdf4' : '#fef2f2' } }, txt);
  }
  function caixaTip(titulo, sub, linhas, rodape) {
    return h('div', null,
      h('div', { style: { fontWeight: 700, color: ROXO_ESC, fontSize: 12.5 } }, titulo),
      sub && h('div', { style: { fontSize: 11, color: CINZA, marginTop: 1 } }, sub),
      h('div', { style: { borderTop: '1px solid #f3f4f6', marginTop: 6, paddingTop: 5 } }, linhas),
      rodape && h('div', { style: { marginTop: 7 } }, rodape));
  }
  function diaLongo(iso) { return DS[dow(iso)] + ', ' + ddmmaaaa(iso); }
  function linhasFin(d, ideal, teto) {
    var l = [
      linhaTip('Valor bruto', brl(d.bruto)),
      linhaTip('Repasse', brl(d.repasse)),
      linhaTip('Mín. garantido', d.garantido ? brl(d.garantido) : '—', d.garantido ? null : { color: CINZA, fontWeight: 400 }),
      linhaTip('Líquido', brl(d.liquido), { color: d.liquido < 0 ? VERMELHO : '#111827' }),
    ];
    var tk = [brl(d.ticket)];
    if (ideal != null && d.entregas > 0) tk.push(miniDif(sinal(d.ticket - ideal, brl) + ' vs ideal', d.ticket >= ideal ? VERDE : VERMELHO));
    l.push(linhaTip('Ticket médio', tk));
    l.push(linhaTip('Margem', d.bruto ? pct(d.margem) : '—', teto != null && d.bruto && d.margem >= teto ? { color: AMBAR } : null));
    return l;
  }
  function conteudoDia(d, o) {
    var sem = !d.entregas && !d.bruto;
    var linhas = [linhaTip('Entregas', int(d.entregas))];
    var rodape = null;
    if (o.meta) {
      if (d.meta != null) {
        linhas.push(linhaTip('Meta', int(d.meta)));
        if (d.meta > 0) {
          var p = d.entregas / d.meta * 100;
          linhas.push(linhaTip('% da meta', pct(p), { color: p >= 100 ? VERDE : VERMELHO }));
          rodape = pill(p >= 100 ? 'Bateu a meta' : 'Não bateu a meta (faltaram ' + int(d.meta - d.entregas) + ')', p >= 100);
        }
      } else linhas.push(linhaTip('Meta', 'sem meta', { color: CINZA, fontWeight: 400 }));
    }
    if (sem) return caixaTip(diaLongo(d.data), null, linhas, h('span', { style: { color: CINZA } }, 'Sem entregas neste dia.'));
    return caixaTip(diaLongo(d.data), null, linhas.concat(linhasFin(d, o.ideal, o.teto)), rodape);
  }
  function navegarSetas(e) {
    var k = e.key; if (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End') return;
    var cols = Array.prototype.slice.call(e.currentTarget.parentNode.querySelectorAll('[data-col]'));
    var i = cols.indexOf(e.currentTarget);
    var j = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : k === 'Home' ? 0 : cols.length - 1;
    if (j >= 0 && j < cols.length && j !== i) { e.preventDefault(); cols[j].focus(); if (cols[j].scrollIntoView) cols[j].scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }

  // ── gráficos ────────────────────────────────────────────────────
  function rotulosDias(dias, larg, ativo) {
    var passo = dias.length > 45 ? 7 : 1;
    return h('div', { style: { minWidth: larg, display: 'flex', gap: dias.length > 45 ? 1 : 4, marginTop: 4 } },
      dias.map(function (d, i) {
        var on = ativo === d.data;
        return h('span', { key: d.data, style: { flex: 1, textAlign: 'center', fontSize: 10, color: on ? ROXO_ESC : dow(d.data) === 0 ? '#b91c1c' : CINZA, fontWeight: on ? 700 : 400, whiteSpace: 'nowrap', overflow: 'visible' } },
          on && dias.length > 45 ? ddmm(d.data) : i % passo === 0 ? (dias.length > 31 ? ddmm(d.data) : d.data.slice(8, 10)) : '');
      }));
  }

  function colunaDia(T, d, extraStyle, filhos, aria, fn) {
    var on = T.ativo === d.data;
    return h('div', Object.assign({
      key: d.data, 'data-col': '1', tabIndex: 0, role: 'img', 'aria-label': aria, className: 'bifin-foco bifin-anim', onKeyDown: navegarSetas,
      style: Object.assign({ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 3, minWidth: 0, borderRadius: 6,
        background: on ? 'rgba(119,15,168,.07)' : 'transparent', cursor: 'default', touchAction: 'pan-x pan-y' }, extraStyle || {})
    }, T.alvo(d.data, fn)), filhos);
  }

  function GraficoTicketDia(props) {
    var dias = props.dias, ideal = props.ideal, teto = props.teto;
    var T = useTip();
    var comDado = dias.filter(function (d) { return d.entregas > 0; });
    var max = Math.max.apply(null, comDado.map(function (d) { return d.ticket; }).concat([ideal, 0.01])) * 1.12;
    var rot = dias.length <= 45; var larg = dias.length * (rot ? 28 : 8);
    return h('section', { ref: T.ref, style: Object.assign({}, S.card, { position: 'relative' }), 'aria-label': 'Ticket médio por dia' },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
        h('h2', { style: S.h2 }, 'Ticket médio por dia'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: CINZA } },
          h('span', { style: S.legenda }, h('span', { style: S.quad(ROXO) }), 'Ticket médio'),
          h('span', { style: S.legenda }, h('span', { style: { width: 14, borderTop: '2px dashed ' + LARANJA } }), 'Ticket ideal ' + brl(ideal)),
          h('span', { style: S.legenda }, h('span', { style: S.quad(LILAS) }), 'Abaixo do ideal'))),
      h('div', { style: { overflowX: 'auto' } },
        h('div', { style: { minWidth: larg, position: 'relative', height: 230, display: 'flex', alignItems: 'flex-end', gap: rot ? 4 : 1, borderBottom: '1px solid ' + BORDA } },
          h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: (ideal / max * 100).toFixed(1) + '%', borderTop: '2px dashed ' + LARANJA, pointerEvents: 'none', zIndex: 1 } }),
          dias.map(function (d) {
            var tem = d.entregas > 0; var dim = T.ativo && T.ativo !== d.data;
            return colunaDia(T, d, null, [
              tem && rot && h('span', { key: 'v', className: 'bifin-anim', style: { fontSize: 10, fontWeight: 600, color: ROXO_ESC, opacity: dim ? 0.45 : 1 } }, dec(d.ticket)),
              tem && h('div', { key: 'b', className: 'bifin-anim' + (props.animar ? ' bifin-grow' : ''), style: { width: '100%', height: Math.max(0, d.ticket / max * 100).toFixed(1) + '%', background: d.ticket >= ideal ? ROXO : LILAS, borderRadius: '4px 4px 0 0', opacity: dim ? 0.45 : 1 } })
            ], ddmmaaaa(d.data) + ': ' + (tem ? 'ticket ' + brl(d.ticket) + ', ' + int(d.entregas) + ' entregas' : 'sem entregas'),
            function () { return conteudoDia(d, { ideal: ideal, teto: teto }); });
          })),
        rotulosDias(dias, larg, T.ativo)),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  function GraficoEntregasMeta(props) {
    var dias = props.dias, temMeta = props.temMeta;
    var T = useTip();
    var max = Math.max.apply(null, dias.map(function (d) { return Math.max(d.entregas, d.meta || 0); }).concat([1])) * 1.15;
    var rot = dias.length <= 45; var larg = dias.length * (rot ? 28 : 8);
    var somaMeta = 0, real = 0, bateu = 0, comMeta = 0;
    dias.forEach(function (d) { real += d.entregas; if (d.meta != null) { somaMeta += d.meta; if (d.meta > 0) { comMeta++; if (d.entregas >= d.meta) bateu++; } } });
    var resumo = temMeta
      ? 'Meta do período: ' + int(somaMeta) + ' · realizado ' + int(real) + (somaMeta ? ' (' + pct(real / somaMeta * 100) + ')' : '') + ' · bateu a meta em ' + bateu + ' de ' + comMeta + ' dias'
      : 'Sem meta cadastrada. Defina em Metas e parâmetros.';
    return h('section', { ref: T.ref, style: Object.assign({}, S.card, { position: 'relative' }), 'aria-label': 'Entregas x meta' },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
        h('div', null, h('h2', { style: S.h2 }, 'Entregas x meta'), h('p', { style: S.sub }, resumo)),
        temMeta && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: CINZA } },
          h('span', { style: S.legenda }, h('span', { style: S.quad(ROXO) }), 'Bateu a meta'),
          h('span', { style: S.legenda }, h('span', { style: S.quad(LILAS) }), 'Abaixo da meta'),
          h('span', { style: S.legenda }, h('span', { style: { width: 14, borderTop: '3px solid ' + LARANJA } }), 'Meta do dia'))),
      h('div', { style: { overflowX: 'auto' } },
        h('div', { style: { minWidth: larg, height: 210, display: 'flex', alignItems: 'flex-end', gap: rot ? 4 : 1, borderBottom: '1px solid ' + BORDA } },
          dias.map(function (d) {
            var cor = !temMeta || d.meta == null || d.entregas >= d.meta ? ROXO : LILAS;
            var dim = T.ativo && T.ativo !== d.data;
            return colunaDia(T, d, { position: 'relative' }, [
              d.entregas > 0 && rot && h('span', { key: 'v', className: 'bifin-anim', style: { fontSize: 10, fontWeight: 600, color: ROXO_ESC, opacity: dim ? 0.45 : 1 } }, int(d.entregas)),
              d.entregas > 0 && h('div', { key: 'b', className: 'bifin-anim' + (props.animar ? ' bifin-grow' : ''), style: { width: '100%', height: (d.entregas / max * 100).toFixed(1) + '%', background: cor, borderRadius: '4px 4px 0 0', opacity: dim ? 0.45 : 1 } }),
              temMeta && d.meta > 0 && h('div', { key: 'm', className: 'bifin-anim', style: { position: 'absolute', left: -1, right: -1, bottom: (d.meta / max * 100).toFixed(1) + '%', borderTop: '3px solid ' + LARANJA, opacity: dim ? 0.45 : 1, pointerEvents: 'none' } })
            ], ddmmaaaa(d.data) + ': ' + int(d.entregas) + ' entregas' + (d.meta != null ? ', meta ' + int(d.meta) : ''),
            function () { return conteudoDia(d, { meta: temMeta, ideal: props.ideal, teto: props.teto }); });
          })),
        rotulosDias(dias, larg, T.ativo)),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  function GraficoSemanal(props) {
    var sem = props.semanas || [];
    var T = useTip();
    var vals = sem.filter(function (s) { return s.entregas > 0; }).map(function (s) { return s.ticket; });
    var mn = vals.length ? Math.min.apply(null, vals) : 0, mx = vals.length ? Math.max.apply(null, vals) : 1;
    if (mx - mn < 0.01) { mn -= 1; mx += 1; }
    var n = sem.length;
    var pts = sem.map(function (s, i) {
      return { s: s, i: i, x: n > 1 ? 3 + i * 94 / (n - 1) : 50, y: s.entregas > 0 ? 100 - ((s.ticket - mn) / (mx - mn) * 55 + 22) : null };
    });
    var meia = n > 1 ? 47 / (n - 1) : 50;
    var linha = pts.filter(function (p) { return p.y != null; }).map(function (p) { return p.x.toFixed(2) + ',' + p.y.toFixed(2); }).join(' ');
    var ativoP = pts.find(function (p) { return p.s.inicio === T.ativo; });
    function conteudo(p) {
      var s = p.s, ant = p.i > 0 ? sem[p.i - 1] : null;
      var titulo = 'Semana ' + ddmm(s.inicio) + ' a ' + ddmm(addDias(s.inicio, 6));
      if (!s.entregas) return caixaTip(titulo, null, [linhaTip('Entregas', '0')], h('span', { style: { color: CINZA } }, 'Sem entregas nesta semana.'));
      var linhas = [linhaTip('Entregas', int(s.entregas)), linhaTip('Valor bruto', brl(s.bruto)), linhaTip('Líquido', brl(s.liquido), { color: s.liquido < 0 ? VERMELHO : '#111827' }), linhaTip('Ticket médio', brl(s.ticket))];
      var rod = null;
      if (ant && ant.entregas > 0) {
        var dv = s.ticket - ant.ticket, dp = ant.ticket ? dv / Math.abs(ant.ticket) * 100 : 0;
        var cor = dv >= 0 ? VERDE : VERMELHO;
        linhas.push(linhaTip('vs semana anterior', [sinal(dv, brl), miniDif('(' + sinal(dp, function (x) { return x.toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }) + ')', cor)], { color: cor }));
        linhas.push(linhaTip('Entregas vs anterior', sinal(s.entregas - ant.entregas, int), { color: s.entregas >= ant.entregas ? VERDE : VERMELHO }));
      } else rod = h('span', { style: { color: CINZA, fontSize: 11 } }, 'Sem semana anterior para comparar.');
      return caixaTip(titulo, null, linhas, rod);
    }
    return h('section', { ref: T.ref, style: Object.assign({}, S.card, { position: 'relative' }), 'aria-label': 'Ticket médio semanal' },
      h('div', null, h('h2', { style: S.h2 }, 'Ticket médio semanal'), h('p', { style: S.sub }, 'Últimas 12 semanas até o fim do período (semana começa na segunda)')),
      h('div', { style: { overflowX: 'auto' } },
        h('div', { style: { minWidth: 460 } },
          h('div', { style: { position: 'relative', height: 190 } },
            h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' } },
              h('polyline', { points: linha, fill: 'none', stroke: ROXO, strokeWidth: 2, strokeDasharray: '1 3', strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' })),
            ativoP && h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 0, bottom: 0, left: ativoP.x + '%', borderLeft: '1px dashed rgba(119,15,168,.45)', pointerEvents: 'none' } }),
            pts.filter(function (p) { return p.y != null; }).map(function (p) {
              var on = T.ativo === p.s.inicio, dim = T.ativo && !on;
              return h('div', { key: p.s.inicio, 'aria-hidden': 'true', className: 'bifin-anim', style: { position: 'absolute', left: p.x + '%', top: p.y + '%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pointerEvents: 'none', opacity: dim ? 0.5 : 1, zIndex: on ? 2 : 1 } },
                h('span', { style: { fontSize: 10, fontWeight: 700, color: '#fff', background: on ? ROXO_ESC : ROXO_E, borderRadius: 5, padding: '1px 5px', marginTop: -22, whiteSpace: 'nowrap' } }, dec(p.s.ticket)),
                h('span', { className: 'bifin-anim', style: { width: on ? 12 : 8, height: on ? 12 : 8, borderRadius: '50%', background: ROXO, border: '2px solid #fff', boxShadow: on ? '0 0 0 3px rgba(119,15,168,.2)' : 'none' } }));
            }),
            pts.map(function (p) {
              return h('div', Object.assign({
                key: 'z' + p.s.inicio, 'data-col': '1', tabIndex: 0, role: 'img', className: 'bifin-foco', onKeyDown: navegarSetas,
                'aria-label': 'Semana de ' + ddmm(p.s.inicio) + ': ' + (p.s.entregas ? 'ticket ' + brl(p.s.ticket) + ', ' + int(p.s.entregas) + ' entregas' : 'sem entregas'),
                style: { position: 'absolute', top: 0, bottom: 0, left: (p.x - meia) + '%', width: (2 * meia) + '%', zIndex: 3, cursor: 'default' }
              }, T.alvo(p.s.inicio, function () { return conteudo(p); }, function (e) {
                var r = e.currentTarget.parentNode.getBoundingClientRect();
                var o = T.relRect(r, p.x / 100, (p.y != null ? p.y : 60) / 100); o.lado = true; return o;
              })));
            })),
          h('div', { style: { position: 'relative', height: 16 } },
            pts.map(function (p) { var on = T.ativo === p.s.inicio; return h('span', { key: p.s.inicio, style: { position: 'absolute', left: p.x + '%', transform: 'translateX(-50%)', fontSize: 10, color: on ? ROXO_ESC : CINZA, fontWeight: on ? 700 : 400, whiteSpace: 'nowrap' } }, ddmm(p.s.inicio)); })))),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  function GraficoOscilacao(props) {
    var T = useTip();
    var dias = (props.dias || []).filter(function (d) { return d.entregas > 0; });
    var osc = [];
    for (var i = 1; i < dias.length; i++) osc.push({ data: dias[i].data, d: dias[i].ticket - dias[i - 1].ticket, hoje: dias[i], ant: dias[i - 1] });
    var maxAbs = Math.max.apply(null, osc.map(function (o) { return Math.abs(o.d); }).concat([0.01]));
    var larg = Math.max(460, osc.length * 18);
    var mostra = osc.length <= 45;
    function conteudo(o) {
      var dp = o.ant.ticket ? o.d / Math.abs(o.ant.ticket) * 100 : 0, cor = o.d >= 0 ? VERDE : VERMELHO;
      return caixaTip(diaLongo(o.data), null, [
        linhaTip('Ticket do dia', brl(o.hoje.ticket)),
        linhaTip('Dia anterior (' + ddmm(o.ant.data) + ')', brl(o.ant.ticket)),
        linhaTip('Variação', sinal(o.d, brl), { color: cor }),
        linhaTip('Variação %', sinal(dp, function (x) { return x.toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }), { color: cor }),
        linhaTip('Entregas', int(o.hoje.entregas) + ' (antes ' + int(o.ant.entregas) + ')')
      ]);
    }
    return h('section', { ref: T.ref, style: Object.assign({}, S.card, { position: 'relative' }), 'aria-label': 'Oscilação do ticket médio' },
      h('div', null, h('h2', { style: S.h2 }, 'Oscilação do ticket médio'), h('p', { style: S.sub }, 'Variação em R$ contra o dia anterior com entregas')),
      osc.length === 0 ? h('p', { style: { margin: 0, color: CINZA, fontSize: 12, padding: '30px 0', textAlign: 'center' } }, 'Precisa de pelo menos 2 dias com entregas.') :
      h('div', { style: { overflowX: 'auto' } },
        h('div', { style: { minWidth: larg } },
          h('div', { style: { height: 190, display: 'flex', gap: 3, position: 'relative' } },
            h('div', { style: { position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px solid #d1d5db', pointerEvents: 'none' } }),
            osc.map(function (o) {
              var pos = o.d > 0 ? (o.d / maxAbs * 82).toFixed(1) : 0, neg = o.d < 0 ? (-o.d / maxAbs * 82).toFixed(1) : 0;
              var on = T.ativo === o.data, dim = T.ativo && !on;
              return h('div', Object.assign({
                key: o.data, 'data-col': '1', tabIndex: 0, role: 'img', className: 'bifin-foco bifin-anim', onKeyDown: navegarSetas,
                'aria-label': ddmmaaaa(o.data) + ': variação ' + sinal(o.d, brl),
                style: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, borderRadius: 6, background: on ? 'rgba(119,15,168,.07)' : 'transparent', cursor: 'default' }
              }, T.alvo(o.data, function () { return conteudo(o); })),
                h('div', { style: { height: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' } },
                  mostra && o.d > 0.3 && h('span', { style: { fontSize: 9, color: VERDE, fontWeight: 600, opacity: dim ? 0.45 : 1 } }, '+' + dec(o.d)),
                  h('div', { className: 'bifin-anim' + (props.animar ? ' bifin-grow' : ''), style: { width: '100%', height: pos + '%', background: '#16a34a', borderRadius: '3px 3px 0 0', opacity: dim ? 0.45 : 1 } })),
                h('div', { style: { height: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' } },
                  h('div', { className: 'bifin-anim' + (props.animar ? ' bifin-grow-top' : ''), style: { width: '100%', height: neg + '%', background: '#dc2626', borderRadius: '0 0 3px 3px', opacity: dim ? 0.45 : 1 } }),
                  mostra && o.d < -0.3 && h('span', { style: { fontSize: 9, color: VERMELHO, fontWeight: 600, opacity: dim ? 0.45 : 1 } }, '−' + dec(-o.d))));
            })),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: CINZA, marginTop: 4 } },
            h('span', null, ddmm(osc[0].data)), osc.length > 2 && h('span', null, ddmm(osc[Math.floor(osc.length / 2)].data)), h('span', null, ddmm(osc[osc.length - 1].data))))),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  function GraficoMargem(props) {
    var T = useTip();
    var area = useRef(null);
    var dias = (props.dias || []).filter(function (d) { return d.bruto > 0; });
    var teto = props.teto;
    var vals = dias.map(function (d) { return d.margem; }).concat([teto]);
    var mn = Math.floor(Math.min.apply(null, vals) - 3), mx = Math.ceil(Math.max.apply(null, vals) + 3);
    var y = function (v) { return 100 - ((v - mn) / (mx - mn) * 84 + 8); };
    var n = dias.length;
    var pts = dias.map(function (d, i) { return { d: d, i: i, x: n > 1 ? 1 + i * 98 / (n - 1) : 50, y: y(d.margem) }; });
    var acima = dias.filter(function (d) { return d.margem >= teto; }).length;
    var idxAtivo = -1; pts.forEach(function (p) { if (p.d.data === T.ativo) idxAtivo = p.i; });
    var ativoP = idxAtivo >= 0 ? pts[idxAtivo] : null;
    function conteudo(d) {
      var dist = d.margem - teto;
      return caixaTip(diaLongo(d.data), null, [
        linhaTip('Margem', pct(d.margem), d.margem >= teto ? { color: AMBAR } : null),
        linhaTip('Repasse', brl(d.repasse)),
        linhaTip('Mín. garantido', d.garantido ? brl(d.garantido) : '—', d.garantido ? null : { color: CINZA, fontWeight: 400 }),
        linhaTip('Valor bruto', brl(d.bruto)),
        linhaTip('Ticket médio', brl(d.ticket))
      ], pill(dist >= 0 ? pp(dist) + ' acima do teto' : pp(dist) + ' abaixo do teto', dist < 0));
    }
    function mostrar(i) {
      var p = pts[i]; if (!p || !area.current || !T.ref.current) return;
      var ar = area.current.getBoundingClientRect(), sr = T.ref.current.getBoundingClientRect();
      T.show({ abs: true, x: ar.left - sr.left + p.x / 100 * ar.width, y: ar.top - sr.top + p.y / 100 * ar.height }, p.d.data, conteudo(p.d));
    }
    function maisPerto(e) {
      var ar = area.current.getBoundingClientRect(); var fx = (e.clientX - ar.left) / ar.width * 100;
      var best = 0, dm = 1e9; pts.forEach(function (p) { var dd = Math.abs(p.x - fx); if (dd < dm) { dm = dd; best = p.i; } }); return best;
    }
    return h('section', { ref: T.ref, style: Object.assign({}, S.card, { position: 'relative' }), 'aria-label': 'Margem de repasse por dia' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
        h('div', null, h('h2', { style: S.h2 }, 'Margem de repasse por dia'), h('p', { style: S.sub }, '(repasse + mín. garantido) ÷ bruto · quanto menor, melhor')),
        h('span', { style: Object.assign({}, S.legenda, { fontSize: 12, color: CINZA, whiteSpace: 'nowrap' }) }, h('span', { style: { width: 14, borderTop: '2px dashed ' + LARANJA } }), 'Teto ' + pct(teto))),
      n === 0 ? h('p', { style: { margin: 0, color: CINZA, fontSize: 12, padding: '30px 0', textAlign: 'center' } }, 'Sem faturamento no período.') :
      h(React.Fragment, null,
        h('div', {
          ref: area, tabIndex: 0, role: 'img', className: 'bifin-foco',
          'aria-label': 'Margem de repasse por dia. Use as setas para percorrer os dias.' + (ativoP ? ' ' + ddmmaaaa(ativoP.d.data) + ': ' + pct(ativoP.d.margem) : ''),
          style: { position: 'relative', height: 190, cursor: 'crosshair', touchAction: 'pan-y' },
          onPointerDown: function (e) { T.ultimo.current = e.pointerType || 'mouse'; },
          onPointerMove: function (e) { if (e.pointerType === 'mouse') mostrar(maisPerto(e)); },
          onPointerLeave: function (e) { if (e.pointerType === 'mouse') T.hide(); },
          onClick: function (e) { var tipo = T.ultimo.current; T.ultimo.current = ''; if (tipo !== 'mouse') mostrar(maisPerto(e)); },
          onFocus: function () { if (!T.ultimo.current) mostrar(idxAtivo >= 0 ? idxAtivo : n - 1); },
          onBlur: function () { T.hide(); },
          onKeyDown: function (e) {
            var i = idxAtivo >= 0 ? idxAtivo : n - 1;
            var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
            if (j === null) return; e.preventDefault(); mostrar(Math.max(0, Math.min(n - 1, j)));
          }
        },
          h('div', { style: { position: 'absolute', left: 0, right: 0, top: y(teto).toFixed(2) + '%', borderTop: '2px dashed ' + LARANJA, pointerEvents: 'none' } }),
          ativoP && h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 0, bottom: 0, left: ativoP.x + '%', borderLeft: '1px solid rgba(119,15,168,.35)', pointerEvents: 'none' } }),
          h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' } },
            h('polyline', { points: pts.map(function (p) { return p.x.toFixed(2) + ',' + p.y.toFixed(2); }).join(' '), fill: 'none', stroke: ROXO, strokeWidth: 2, strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' })),
          pts.map(function (p) {
            var on = idxAtivo === p.i, s = on ? 12 : 7;
            return h('span', { key: p.d.data, 'aria-hidden': 'true', className: 'bifin-anim', style: { position: 'absolute', left: p.x + '%', top: p.y + '%', width: s, height: s, margin: (-s / 2) + 'px 0 0 ' + (-s / 2) + 'px', borderRadius: '50%', background: p.d.margem >= teto ? '#d97706' : ROXO, border: on ? '2px solid #fff' : 0, boxShadow: on ? '0 0 0 3px rgba(119,15,168,.25)' : 'none', boxSizing: 'border-box', pointerEvents: 'none' } });
          })),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: CINZA } },
          h('span', null, ddmm(dias[0].data)), n > 2 && h('span', null, ddmm(dias[Math.floor(n / 2)].data)), h('span', null, ddmm(dias[n - 1].data))),
        h('p', { style: { margin: 0, fontSize: 12, color: '#374151' } }, acima ? acima + ' dia(s) acima do teto no período.' : 'Nenhum dia acima do teto no período.')),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  function PorVeiculo(props) {
    var T = useTip();
    var vs = props.veiculos || []; var tot = props.totalBruto || 0; var totE = props.totalEntregas || 0;
    var sel = props.selecionados || [];
    var maxB = Math.max.apply(null, vs.map(function (v) { return v.bruto; }).concat([0.01]));
    function conteudo(v) {
      return caixaTip(v.nome, sel.indexOf(v.nome) >= 0 ? 'Filtro ativo · clique para tirar' : 'Clique para filtrar este veículo', [
        linhaTip('Entregas', int(v.entregas)),
        linhaTip('% das entregas', pct(totE ? v.entregas / totE * 100 : 0)),
        linhaTip('Valor bruto', brl(v.bruto)),
        linhaTip('Repasse', brl(v.repasse)),
        linhaTip('Líquido', brl(v.liquido), { color: v.liquido < 0 ? VERMELHO : '#111827' }),
        linhaTip('Ticket médio', brl(v.ticket)),
        linhaTip('Margem', pct(v.margem), props.teto != null && v.margem >= props.teto ? { color: AMBAR } : null)
      ]);
    }
    return h('section', { ref: T.ref, style: Object.assign({}, S.card, { gap: 8, position: 'relative' }), 'aria-label': 'Por veículo' },
      h('div', null, h('h2', { style: S.h2 }, 'Por veículo'), h('p', { style: S.sub }, 'Participação no valor bruto do período · clique para filtrar')),
      vs.length === 0 && h('p', { style: { margin: 0, color: CINZA, fontSize: 12 } }, 'Sem dados no período.'),
      vs.map(function (v) {
        var on = sel.indexOf(v.nome) >= 0; var hov = T.ativo === v.nome;
        return h('button', {
          key: v.nome, type: 'button', 'aria-pressed': on, className: 'bifin-veic bifin-foco',
          'aria-label': v.nome + ': ' + brl(v.bruto) + ', ' + int(v.entregas) + ' entregas. ' + (on ? 'Filtro ativo, clique para tirar.' : 'Clique para filtrar.'),
          onPointerDown: function (e) { T.ultimo.current = e.pointerType || 'mouse'; },
          onPointerEnter: function (e) { if (e.pointerType === 'mouse') T.show(e, v.nome, conteudo(v)); },
          onPointerMove: function (e) { if (e.pointerType === 'mouse') T.show(e, v.nome, conteudo(v)); },
          onPointerLeave: function (e) { if (e.pointerType === 'mouse') T.hide(); },
          onFocus: function (e) { if (!T.ultimo.current) T.show(e, v.nome, conteudo(v)); },
          onBlur: function () { T.hide(); },
          onClick: function () { T.ultimo.current = ''; if (props.onToggle) props.onToggle(v.nome); },
          style: { display: 'flex', flexDirection: 'column', gap: 5, width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', padding: '7px 8px', margin: '0 -8px', boxSizing: 'content-box',
            borderRadius: 10, border: '1px solid ' + (on ? '#d8c3ea' : 'transparent'), background: on ? '#faf5ff' : hov ? '#faf7fd' : 'transparent' }
        },
          h('span', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, fontSize: 12 } },
            h('span', { style: { fontWeight: 600, color: '#111827', display: 'inline-flex', alignItems: 'center', gap: 6 } }, v.nome,
              on && h('span', { style: { fontSize: 10, fontWeight: 700, color: ROXO_E, background: '#f3e8fb', borderRadius: 99, padding: '1px 7px' } }, 'Filtrando')),
            h('span', { style: { color: CINZA } }, int(v.entregas) + ' entregas · ticket ', h('b', { style: { color: '#111827' } }, brl(v.ticket)), ' · margem ', h('b', { style: { color: '#111827' } }, pct(v.margem)))),
          h('span', { style: { display: 'block', height: 10, background: '#f3e8fb', borderRadius: 99, overflow: 'hidden' } },
            h('span', { className: 'bifin-anim', style: { display: 'block', height: '100%', width: (v.bruto / maxB * 100).toFixed(1) + '%', background: hov || on ? ROXO_E : ROXO, borderRadius: 99 } })),
          h('span', { style: { fontSize: 11, color: CINZA } }, brl(v.bruto) + ' · ' + pct(tot ? v.bruto / tot * 100 : 0) + ' do bruto'));
      }),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  // ── BI_FINANCEIRO_V2: análises (pontos de atenção, projeção, mudanças, ABC, km, dia da semana, evolução) ──
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var DS_L = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  function mesCurto(iso) { return MESES[Number(iso.slice(5, 7)) - 1] + '/' + iso.slice(2, 4); }
  function mesLongo(iso) { return MESES_L[Number(iso.slice(5, 7)) - 1]; }
  function mesAnterior(iso) { var y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)) - 1; if (m === 0) { y--; m = 12; } return y + '-' + String(m).padStart(2, '0') + '-01'; }
  function brl0(v) { v = Number(v || 0); return (v < 0 ? '-R$ ' : 'R$ ') + Math.round(Math.abs(v)).toLocaleString(L); }
  function brlK(v) {
    v = Number(v || 0); var a = Math.abs(v), s = v < 0 ? '-' : '';
    if (a >= 1e6) return s + 'R$ ' + (a / 1e6).toLocaleString(L, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mi';
    if (a >= 1e4) return s + 'R$ ' + Math.round(a / 1e3).toLocaleString(L) + ' mil';
    return s + 'R$ ' + Math.round(a).toLocaleString(L);
  }
  function pctSinal(v) { return sinal(v, function (x) { return x.toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }); }
  function reduzMov() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } }
  function rolarPara(el, classe) {
    if (!el) return;
    el.scrollIntoView({ behavior: reduzMov() ? 'auto' : 'smooth', block: 'center' });
    var c = classe || 'bifin-flash';
    el.classList.remove(c); void el.offsetWidth; el.classList.add(c);
    setTimeout(function () { el.classList.remove(c); }, 2000);
  }
  function codBadge(cod) { return h('span', { style: { fontSize: 11, fontWeight: 700, color: ROXO_E, background: '#f3e8fb', borderRadius: 6, padding: '2px 6px', flex: 'none', fontVariantNumeric: 'tabular-nums' } }, cod); }
  var ABC_COR = { A: { bg: ROXO_E, fg: '#fff' }, B: { bg: '#a36bd1', fg: '#fff' }, C: { bg: '#e9d5f9', fg: ROXO_ESC } };
  function abcBadge(k) { var c = ABC_COR[k] || ABC_COR.C; return h('span', { title: 'Curva ABC: classe ' + k, style: { fontSize: 10, fontWeight: 800, color: c.fg, background: c.bg, borderRadius: 5, width: 18, height: 18, display: 'inline-grid', placeItems: 'center', flex: 'none' } }, k); }
  function tituloBloco(t, sub, dir) {
    return h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
      h('div', { style: { minWidth: 0 } }, h('h2', { style: S.h2 }, t), sub && h('p', { style: S.sub }, sub)), dir || null);
  }

  // A · Pontos de atenção
  var NIVEL = {
    alto: { borda: '#fecaca', fundo: '#fef2f2', cor: VERMELHO, icone: 'alert' },
    medio: { borda: '#fde68a', fundo: '#fffbeb', cor: AMBAR, icone: 'alert' },
    info: { borda: '#dbeafe', fundo: '#eff6ff', cor: '#1d4ed8', icone: 'info' }
  };
  function PontosAtencao(props) {
    var al = props.alertas || [];
    if (!al.length) {
      return h('section', { 'aria-label': 'Pontos de atenção', style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, color: VERDE, fontWeight: 600 } },
        ico('check', 16), 'Nada fora do normal no período.');
    }
    return h('section', { 'aria-label': 'Pontos de atenção', style: Object.assign({}, S.card, { gap: 12 }) },
      tituloBloco('Pontos de atenção', null, h('span', { style: { fontSize: 12, color: CINZA } },
        'Gerado a partir do período e dos filtros · ' + (props.total > al.length ? 'mostrando ' + al.length + ' de ' + props.total : al.length + (al.length === 1 ? ' ponto' : ' pontos')))),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,250px),1fr))', gap: 10 } },
        al.map(function (a, i) {
          var n = NIVEL[a.nivel] || NIVEL.info;
          var acao = a.tipo === 'faixa_km' ? ['Ver faixas de km', props.onFaixas] : a.tipo === 'concentracao' ? ['Ver curva ABC', props.onAbc] : a.cod ? ['Ver cliente', function () { props.onCliente(a.cod); }] : null;
          return h('div', { key: i, style: { border: '1px solid ' + n.borda, background: n.fundo, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 } },
            h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: n.cor, textTransform: 'uppercase', letterSpacing: '.04em' } }, ico(n.icone, 13), a.titulo),
            h('span', { style: { fontWeight: 600, color: '#111827', display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 } }, a.cod && a.tipo !== 'concentracao' ? codBadge(a.cod) : null, h('span', { style: { minWidth: 0, overflowWrap: 'anywhere' } }, a.nome)),
            h('span', { style: { color: '#374151', lineHeight: 1.4 } }, a.texto),
            acao && h('button', { type: 'button', onClick: acao[1], className: 'bifin-foco', style: { alignSelf: 'flex-start', border: 0, background: 'none', padding: '2px 0', color: ROXO, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 'auto' } }, acao[0], ico('arrowright', 12)));
        })));
  }

  // B · Projeção do mês
  function Projecao(props) {
    var p = props.p; var T = useTip();
    var ant = p.mes_anterior; var mAnt = mesAnterior(p.mes_inicio);
    var itens = [
      { k: 'entregas', l: 'Entregas', fmt: int, meta: p.meta_mes },
      { k: 'bruto', l: 'Valor bruto', fmt: brl0 },
      { k: 'liquido', l: 'Líquido', fmt: brl0 }
    ];
    function conteudo(it) {
      var r = p.realizado[it.k], pr = p.projetado[it.k];
      var l = [linhaTip('Realizado até ' + ddmm(p.ate), it.fmt(r)), linhaTip('Projeção para o mês', it.fmt(pr), { color: ROXO_ESC }), linhaTip('Falta rodar', it.fmt(pr - r))];
      if (it.meta) l.push(linhaTip('Meta do mês', it.fmt(it.meta)), linhaTip('Projeção x meta', pct(pr / it.meta * 100), { color: pr >= it.meta ? VERDE : VERMELHO }));
      if (ant) l.push(linhaTip(MESES_L[Number(mAnt.slice(5, 7)) - 1] + ' fechado', it.fmt(ant[it.k])));
      return caixaTip(it.l + ' · ' + mesLongo(p.mes_inicio), p.pct_decorrido.toLocaleString(L, { maximumFractionDigits: 1 }) + '% do mês já passou', l);
    }
    return h('section', { ref: T.ref, 'aria-label': 'Projeção do mês', style: Object.assign({}, S.card, { gap: 14, position: 'relative' }) },
      tituloBloco('Projeção de ' + mesLongo(p.mes_inicio), p.dias_uteis_passados + ' de ' + p.dias_uteis_total + ' dias úteis já rodados · dados até ' + ddmm(p.ate) + ' · projeção pelo ritmo de cada tipo de dia',
        ant ? h('span', { style: { fontSize: 12, color: CINZA } }, 'Comparação: ' + mesLongo(mAnt) + ' fechado') : null),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 12 } },
        itens.map(function (it) {
          var r = Math.max(0, p.realizado[it.k]), pr = Math.max(0, p.projetado[it.k]), a = ant ? Math.max(0, ant[it.k]) : 0;
          var esc = Math.max(pr, it.meta || 0, a, r, 1) * 1.04;
          var wR = r / esc * 100, wP = Math.max(0, pr - r) / esc * 100;
          var on = T.ativo === it.k;
          var linhaInfo;
          if (it.meta) {
            var pm = pr / it.meta * 100;
            linhaInfo = h('span', null, 'Meta do mês ' + int(it.meta) + ' · projeção ', h('b', { style: { color: pm >= 100 ? VERDE : VERMELHO } }, pct(pm) + ' da meta'), ant ? ' · ' + MESES[Number(mAnt.slice(5, 7)) - 1] + ': ' + int(ant.entregas) : '');
          } else if (ant && ant[it.k]) {
            var dv = (p.projetado[it.k] - ant[it.k]) / Math.abs(ant[it.k]) * 100;
            linhaInfo = h('span', null, 'vs ' + mesLongo(mAnt) + ' ', h('b', { style: { color: dv >= 0 ? VERDE : VERMELHO } }, pctSinal(dv)), ' (' + it.fmt(ant[it.k]) + ')', it.k === 'liquido' ? ' · margem projetada ' + pct(p.projetado.margem) : '');
          } else linhaInfo = h('span', null, it.k === 'liquido' ? 'Margem projetada ' + pct(p.projetado.margem) : 'Sem mês anterior para comparar');
          return h('div', Object.assign({ key: it.k, tabIndex: 0, className: 'bifin-kpi bifin-foco', 'aria-label': it.l + ': projeção ' + it.fmt(p.projetado[it.k]) + ', realizado ' + it.fmt(p.realizado[it.k]),
            style: { border: '1px solid ' + (on ? '#d8c3ea' : '#f3f4f6'), borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, cursor: 'default' } },
            T.alvo(it.k, function () { return conteudo(it); })),
            h('span', { style: { fontSize: 12, fontWeight: 600, color: CINZA } }, it.l),
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } },
              h('span', { style: { fontFamily: 'Sora,Inter,sans-serif', fontSize: 20, fontWeight: 700, color: p.projetado[it.k] < 0 ? VERMELHO : ROXO_ESC, fontVariantNumeric: 'tabular-nums' } }, it.fmt(p.projetado[it.k])),
              h('span', { style: { fontSize: 12, color: CINZA } }, 'projetado · realizado ' + it.fmt(p.realizado[it.k]))),
            h('div', { style: { position: 'relative', height: 12, borderRadius: 99, background: '#f3e8fb' } },
              h('div', { style: { position: 'absolute', inset: 0, borderRadius: 99, overflow: 'hidden' } },
                h('div', { className: 'bifin-anim', style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: wR.toFixed(1) + '%', background: ROXO } }),
                h('div', { className: 'bifin-anim bifin-listra', style: { position: 'absolute', left: wR.toFixed(1) + '%', top: 0, bottom: 0, width: wP.toFixed(1) + '%', backgroundColor: '#c9a6e6' } })),
              it.meta ? h('div', { title: 'Meta do mês', style: { position: 'absolute', top: -4, bottom: -4, left: (it.meta / esc * 100).toFixed(1) + '%', borderLeft: '2px solid ' + LARANJA } }) : null,
              !it.meta && a ? h('div', { title: mesLongo(mAnt) + ' fechado', style: { position: 'absolute', top: -4, bottom: -4, left: (a / esc * 100).toFixed(1) + '%', borderLeft: '2px dashed #9ca3af' } }) : null),
            h('span', { style: { fontSize: 12, color: '#374151' } }, linhaInfo));
        })),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: CINZA } },
        h('span', { style: S.legenda }, h('span', { style: S.quad(ROXO) }), 'Realizado'),
        h('span', { style: S.legenda }, h('span', { className: 'bifin-listra', style: Object.assign(S.quad('#c9a6e6'), {}) }), 'Projeção'),
        p.meta_mes ? h('span', { style: S.legenda }, h('span', { style: { height: 10, borderLeft: '2px solid ' + LARANJA } }), 'Meta') : null,
        ant ? h('span', { style: S.legenda }, h('span', { style: { height: 10, borderLeft: '2px dashed #9ca3af' } }), mesLongo(mAnt) + ' fechado') : null),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  // C1 · Quem mais mudou
  function QuemMudou(props) {
    var m = props.m || { altas: [], quedas: [] }; var T = useTip();
    var per = props.periodo;
    function conteudo(x) {
      return caixaTip(x.cod + ' · ' + x.nome, per ? 'Contra ' + ddmm(per.inicio) + ' a ' + ddmm(per.fim) : null, [
        linhaTip('Líquido agora', brl(x.liquido), { color: x.liquido < 0 ? VERMELHO : '#111827' }),
        linhaTip('Líquido antes', brl(x.anterior_liquido)),
        linhaTip('Diferença', sinal(x.delta_liquido, brl), { color: x.delta_liquido >= 0 ? VERDE : VERMELHO }),
        linhaTip('Variação', x.delta_liquido_pct == null ? '—' : pctSinal(x.delta_liquido_pct), { color: x.delta_liquido >= 0 ? VERDE : VERMELHO })
      ], x.parou ? h('span', { style: { fontSize: 11, color: CINZA } }, 'Não rodou no período atual.') : h('span', { style: { fontSize: 11, color: CINZA } }, 'Clique para ver na tabela.'));
    }
    function lista(arr, bom) {
      arr = arr.filter(function (x) { return Math.abs(x.delta_liquido) >= 1; });
      if (!arr.length) return h('span', { style: { fontSize: 12, color: CINZA } }, bom ? 'Nenhum cliente subiu.' : 'Nenhum cliente caiu.');
      return arr.map(function (x) {
        var id = (bom ? 'a' : 'q') + x.cod; var on = T.ativo === id;
        var conteudoLinha = [
          h('span', { key: 'n', style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 } }, codBadge(x.cod),
            h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } }, x.nome),
            x.parou && h('span', { style: { fontSize: 10, fontWeight: 700, color: VERMELHO, background: '#fef2f2', borderRadius: 99, padding: '1px 7px', flex: 'none' } }, 'Parou')),
          h('span', { key: 'v', style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 'none' } },
            h('span', { style: { color: bom ? VERDE : VERMELHO, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } }, sinal(x.delta_liquido, brl0)),
            x.delta_liquido_pct != null && h('span', { style: { fontSize: 10.5, color: CINZA, fontVariantNumeric: 'tabular-nums' } }, pctSinal(x.delta_liquido_pct)))
        ];
        var base = { key: x.cod, className: 'bifin-veic bifin-foco', 'aria-label': x.nome + ': ' + sinal(x.delta_liquido, brl) + ' de líquido',
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', font: 'inherit', color: '#111827', padding: '6px 8px', margin: '0 -8px', boxSizing: 'content-box', border: 0, borderRadius: 8, background: on ? '#faf7fd' : 'transparent', cursor: x.parou ? 'default' : 'pointer' } };
        var ev = T.alvo(id, function () { return conteudo(x); });
        if (x.parou) return h('div', Object.assign(base, { tabIndex: 0 }, ev), conteudoLinha);
        return h('button', Object.assign(base, { type: 'button' }, ev, { onClick: function () { T.ultimo.current = ''; T.hide(); props.onCliente(x.cod); } }), conteudoLinha);
      });
    }
    return h('section', { ref: T.ref, 'aria-label': 'Quem mais mudou', style: Object.assign({}, S.card, { gap: 12, position: 'relative' }) },
      tituloBloco('Quem mais mudou', per ? 'Líquido contra o período anterior (' + ddmm(per.inicio) + ' a ' + ddmm(per.fim) + ')' : 'Líquido contra o período anterior'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: '12px 22px' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: VERDE, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 } }, ico('trendup', 13), 'Maiores altas'), lista(m.altas || [], true)),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
          h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: VERMELHO, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 } }, ico('trenddown', 13), 'Maiores quedas'), lista(m.quedas || [], false))),
      h('p', { style: { margin: 'auto 0 0', fontSize: 12, color: CINZA } },
        (m.novos || 0) + (m.novos === 1 ? ' cliente novo' : ' clientes novos') + ' no período · ' + (m.parados || 0) + (m.parados === 1 ? ' parou' : ' pararam') + ' de rodar. Os novos aparecem marcados na tabela.'),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  // C2 · Curva ABC
  function CurvaAbc(props) {
    var a = props.abc; var T = useTip(); var cls = props.clientes || [];
    if (!a || !a.liquido_positivo) {
      return h('section', { id: 'bifin-abc', 'aria-label': 'Curva ABC', style: S.card }, tituloBloco('Curva ABC do líquido', 'Quanto do resultado depende de poucos clientes'),
        h('p', { style: { margin: 0, color: CINZA, fontSize: 12, padding: '24px 0', textAlign: 'center' } }, 'Sem líquido positivo no período.'));
    }
    var DESC = { A: 'até 80% do líquido', B: 'de 80% a 95% do líquido', C: 'os últimos 5% (e quem ficou no zero ou negativo)' };
    var segs = ['A', 'B', 'C'].map(function (k) { return { k: k, d: a[k], w: Math.max(a[k].n ? 5 : 0, a[k].pct) }; }).filter(function (s) { return s.d.n > 0; });
    var somaW = segs.reduce(function (s, x) { return s + x.w; }, 0) || 1;
    function conteudo(s) {
      var nomes = cls.filter(function (c) { return c.abc === s.k; }).slice().sort(function (x, y) { return y.liquido - x.liquido; });
      return caixaTip('Classe ' + s.k + ' · ' + s.d.n + (s.d.n === 1 ? ' cliente' : ' clientes'), DESC[s.k], [
        linhaTip('Líquido da classe', brl(s.d.liquido)),
        linhaTip('% do líquido', pct(s.d.pct))
      ], nomes.length ? h('div', { style: { fontSize: 11, color: '#374151', lineHeight: 1.5, borderTop: '1px solid #f3f4f6', paddingTop: 5 } },
        nomes.slice(0, 6).map(function (c) { return h('div', { key: c.cod, style: { display: 'flex', justifyContent: 'space-between', gap: 10 } }, h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c.cod + ' · ' + c.nome), h('span', { style: { color: CINZA, flex: 'none', fontVariantNumeric: 'tabular-nums' } }, brl0(c.liquido))); }),
        nomes.length > 6 ? h('div', { style: { color: CINZA } }, '+ ' + (nomes.length - 6) + ' cliente(s)') : null) : null);
    }
    return h('section', { id: 'bifin-abc', ref: T.ref, 'aria-label': 'Curva ABC do líquido', style: Object.assign({}, S.card, { gap: 14, position: 'relative' }) },
      tituloBloco('Curva ABC do líquido', 'Quanto do resultado depende de poucos clientes'),
      h('div', { style: { display: 'flex', height: 38, borderRadius: 10, overflow: 'hidden', gap: 2 } },
        segs.map(function (s) {
          var c = ABC_COR[s.k]; var on = T.ativo === s.k, dim = T.ativo && !on;
          var txt = s.k === 'A' ? 'A · ' + s.d.n + (s.d.n === 1 ? ' cliente' : ' clientes') + ' · ' + pct(s.d.pct) : s.w / somaW > 0.09 ? s.k + ' · ' + s.d.n : s.k;
          return h('div', Object.assign({ key: s.k, tabIndex: 0, role: 'img', className: 'bifin-foco bifin-anim', 'aria-label': 'Classe ' + s.k + ': ' + s.d.n + ' clientes, ' + pct(s.d.pct) + ' do líquido',
            style: { flex: s.w + ' 1 0', minWidth: 28, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: s.k === 'A' ? 'flex-start' : 'center', padding: s.k === 'A' ? '0 12px' : 0, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', opacity: dim ? 0.55 : 1, cursor: 'default' } },
            T.alvo(s.k, function () { return conteudo(s); })), txt);
        })),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 } },
        [
          ['Maior cliente', a.top1 ? pct(a.top1.pct) : '—', a.top1 ? 'do líquido (' + a.top1.nome + ')' : ''],
          ['Top 5', pct(a.top5_pct), 'do líquido'],
          ['Classe C', a.C.n + (a.C.n === 1 ? ' cliente' : ' clientes'), 'somam ' + pct(a.C.pct) + ' do líquido']
        ].map(function (x) {
          return h('div', { key: x[0], style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
            h('span', { style: { fontSize: 12, color: CINZA } }, x[0]),
            h('span', { style: { fontFamily: 'Sora,Inter,sans-serif', fontSize: 17, fontWeight: 700, color: ROXO_ESC, whiteSpace: 'nowrap' } }, x[1]),
            h('span', { style: { fontSize: 11, color: CINZA, overflowWrap: 'anywhere' } }, x[2]));
        })),
      h('p', { style: { margin: 'auto 0 0', fontSize: 12, color: CINZA } }, 'A letra A/B/C também aparece ao lado do cliente na tabela.'),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  // C3 · Margem por faixa de distância
  function FaixasKm(props) {
    var fx = props.faixas || []; var teto = props.teto; var T = useTip();
    var cols = '78px minmax(110px,1fr) 64px 80px 80px 66px';
    var totE = fx.reduce(function (s, x) { return s + x.entregas; }, 0);
    function conteudo(x) {
      if (!x.entregas) return caixaTip(x.label, null, [linhaTip('Entregas', '0')], h('span', { style: { color: CINZA } }, 'Nenhuma entrega nessa faixa.'));
      return caixaTip(x.label, int(x.entregas) + ' entregas · ' + pct(totE ? x.entregas / totE * 100 : 0) + ' do total', [
        linhaTip('Cobrado por entrega', brl(x.cobrado_entrega)),
        linhaTip('Repasse por entrega', brl(x.repasse_entrega)),
        linhaTip('Ticket médio', brl(x.ticket)),
        linhaTip('Valor bruto', brl(x.bruto)),
        linhaTip('Líquido', brl(x.liquido), { color: x.liquido < 0 ? VERMELHO : '#111827' }),
        linhaTip('Margem', pct(x.margem), x.margem >= teto ? { color: AMBAR } : null)
      ], pill(x.margem >= teto ? pp(x.margem - teto) + ' acima do teto' : pp(teto - x.margem) + ' abaixo do teto', x.margem < teto));
    }
    var th = { fontSize: 10.5, fontWeight: 700, color: ROXO_E, textTransform: 'uppercase', letterSpacing: '.03em', padding: '6px 0' };
    return h('section', { id: 'bifin-faixas', ref: T.ref, 'aria-label': 'Margem por faixa de distância', style: Object.assign({}, S.card, { position: 'relative' }) },
      tituloBloco('Margem por faixa de distância', 'Por entrega, pela distância do BI · mostra onde o preço não cobre o repasse',
        h('span', { style: Object.assign({}, S.legenda, { fontSize: 12, color: CINZA, whiteSpace: 'nowrap' }) }, h('span', { style: { width: 14, borderTop: '2px dashed ' + LARANJA } }), 'Teto ' + pct(teto))),
      h('div', { style: { overflowX: 'auto' } },
        h('div', { role: 'table', 'aria-label': 'Faixas de distância', style: { minWidth: 470, fontSize: 12 } },
          h('div', { role: 'row', style: { display: 'grid', gridTemplateColumns: cols, alignItems: 'center' } },
            h('span', { role: 'columnheader', style: th }, 'Faixa'), h('span', { role: 'columnheader', style: Object.assign({}, th, { padding: '6px 8px' }) }, 'Margem'),
            h('span', { role: 'columnheader', style: Object.assign({}, th, { textAlign: 'right' }) }, 'Entregas'), h('span', { role: 'columnheader', style: Object.assign({}, th, { textAlign: 'right' }) }, 'Cobrado'),
            h('span', { role: 'columnheader', style: Object.assign({}, th, { textAlign: 'right' }) }, 'Repasse'), h('span', { role: 'columnheader', style: Object.assign({}, th, { textAlign: 'right' }) }, 'Ticket')),
          fx.map(function (x) {
            var on = T.ativo === x.label, dim = T.ativo && !on, alto = x.entregas > 0 && x.margem >= teto, vazio = !x.entregas;
            var cor = alto ? '#d97706' : ROXO;
            var num_ = function (v) { return h('span', { role: 'cell', style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: vazio ? '#9ca3af' : '#111827' } }, v); };
            return h('div', Object.assign({ key: x.label, role: 'row', tabIndex: 0, className: 'bifin-foco bifin-anim', 'aria-label': x.label + ': ' + (vazio ? 'sem entregas' : 'margem ' + pct(x.margem) + ', ' + int(x.entregas) + ' entregas'),
              style: { display: 'grid', gridTemplateColumns: cols, alignItems: 'center', borderTop: '1px solid #f3f4f6', borderRadius: 8, background: on ? '#faf7fd' : 'transparent', opacity: dim ? 0.6 : 1, cursor: 'default' } },
              T.alvo(x.label, function () { return conteudo(x); })),
              h('span', { role: 'cell', style: { padding: '9px 0', fontWeight: 600, color: alto ? AMBAR : vazio ? '#9ca3af' : '#111827', whiteSpace: 'nowrap' } }, x.label),
              h('span', { role: 'cell', style: { padding: '0 8px', position: 'relative', display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { position: 'relative', flex: 1, height: 12, borderRadius: 4, background: '#f3f4f6' } },
                  !vazio && h('span', { className: 'bifin-anim' + (props.animar ? ' bifin-grow-x' : ''), style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.min(100, x.margem).toFixed(1) + '%', background: cor, borderRadius: 4 } }),
                  h('span', { style: { position: 'absolute', top: -4, bottom: -4, left: Math.min(100, teto) + '%', borderLeft: '2px dashed ' + LARANJA } })),
                h('span', { style: { width: 42, textAlign: 'right', fontSize: 11, fontWeight: 600, color: alto ? AMBAR : vazio ? '#9ca3af' : '#374151', fontVariantNumeric: 'tabular-nums' } }, vazio ? '—' : pct(x.margem))),
              num_(vazio ? '0' : int(x.entregas)), num_(vazio ? '—' : brl(x.cobrado_entrega)), num_(vazio ? '—' : brl(x.repasse_entrega)), num_(vazio ? '—' : brl(x.ticket)));
          }))),
      h('p', { style: { margin: 'auto 0 0', fontSize: 12, color: CINZA } }, 'Cobrado e repasse médios por entrega. Faixas configuráveis em Metas e parâmetros.'),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  // C4 · Por dia da semana
  function DiaSemana(props) {
    var ds = props.dias || []; var teto = props.teto; var T = useTip();
    var mx = Math.max.apply(null, ds.map(function (d) { return d.entregas_media; }).concat([1]));
    function conteudo(d) {
      return caixaTip(DS_L[d.dow], d.dias + (d.dias === 1 ? ' dia' : ' dias') + ' no período', [
        linhaTip('Entregas por dia', int(d.entregas_media)),
        linhaTip('Entregas no total', int(d.entregas)),
        linhaTip('Bruto por dia', brl(d.bruto_medio)),
        linhaTip('Líquido por dia', brl(d.liquido_medio), { color: d.liquido_medio < 0 ? VERMELHO : '#111827' }),
        linhaTip('Ticket médio', d.entregas ? brl(d.ticket) : '—'),
        linhaTip('Margem', d.bruto_medio ? pct(d.margem) : '—', d.bruto_medio && d.margem >= teto ? { color: AMBAR } : null)
      ]);
    }
    return h('section', { ref: T.ref, 'aria-label': 'Por dia da semana', style: Object.assign({}, S.card, { position: 'relative' }) },
      tituloBloco('Por dia da semana', 'Média por dia no período · mostra onde o fim de semana pesa'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(68px,1fr))', gap: 6 } },
        ds.map(function (d) {
          var alto = d.bruto_medio > 0 && d.margem >= teto; var on = T.ativo === String(d.dow), dim = T.ativo && !on;
          var a = 0.06 + 0.3 * (d.entregas_media / mx);
          return h('div', Object.assign({ key: d.dow, tabIndex: 0, role: 'img', className: 'bifin-foco bifin-anim', 'aria-label': DS_L[d.dow] + ': ' + int(d.entregas_media) + ' entregas por dia, ticket ' + brl(d.ticket) + ', margem ' + pct(d.margem),
            style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderRadius: 10, padding: '10px 4px', textAlign: 'center', cursor: 'default', minWidth: 0,
              background: alto ? '#fffbeb' : 'rgba(119,15,168,' + a.toFixed(3) + ')', border: '1px solid ' + (alto ? '#fde68a' : on ? '#c4a5e0' : 'transparent'), opacity: dim ? 0.6 : 1,
              boxShadow: on ? '0 4px 12px rgba(119,15,168,.12)' : 'none' } },
            T.alvo(String(d.dow), function () { return conteudo(d); })),
            h('span', { style: { fontWeight: 700, color: alto ? AMBAR : ROXO_ESC } }, d.label),
            h('span', { style: { fontSize: 12, fontVariantNumeric: 'tabular-nums' } }, int(d.entregas_media) + ' ent.'),
            h('span', { style: { fontSize: 12, fontVariantNumeric: 'tabular-nums' } }, d.entregas ? brl(d.ticket) : '—'),
            h('span', { style: { fontSize: 11, fontWeight: alto ? 700 : 400, color: alto ? AMBAR : CINZA, fontVariantNumeric: 'tabular-nums' } }, d.bruto_medio ? pct(d.margem) : '—'));
        })),
      h('p', { style: { margin: 'auto 0 0', fontSize: 12, color: CINZA } }, 'Cor mais forte = mais entregas por dia. Linha de baixo: margem de repasse (âmbar acima do teto).'),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  // D · Evolução mensal
  function Evolucao(props) {
    var T = useTip(); var meses = props.meses;
    var rolo = useRef(null);
    useEffect(function () { var el = rolo.current; if (el) el.scrollLeft = el.scrollWidth; }, [meses]); // no celular começa nos meses recentes
    var corpo;
    if (!meses) {
      corpo = props.erro ? h('p', { style: { margin: 0, color: CINZA, fontSize: 12, padding: '30px 0', textAlign: 'center' } }, 'Não foi possível carregar a evolução: ' + props.erro)
        : h('div', { 'aria-label': 'Carregando evolução mensal', style: { height: 250, display: 'flex', alignItems: 'flex-end', gap: 14, padding: '0 6px' } },
          [40, 46, 42, 50, 55, 57, 60, 62, 66, 68, 70, 64].map(function (v, i) { return h('div', { key: i, style: { flex: 1, height: v + '%', borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg,#f3f4f6,#faf7fd)' } }); }));
    } else {
      var ref = function (m) { return m.projetado ? m.projetado : m; };
      var mx = Math.max.apply(null, meses.map(function (m) { return Math.max(ref(m).bruto, 0); }).concat([1]));
      var comB = meses.filter(function (m) { return m.bruto > 0; });
      var mgs = comB.map(function (m) { return m.margem; });
      var mn = mgs.length ? Math.floor(Math.min.apply(null, mgs) - 2) : 0, mxM = mgs.length ? Math.ceil(Math.max.apply(null, mgs) + 2) : 100;
      if (mxM - mn < 4) { mn -= 2; mxM += 2; }
      var yM = function (v) { return 6 + (1 - (v - mn) / (mxM - mn)) * 20; };
      var n = meses.length;
      var pts = meses.map(function (m, i) { return { m: m, i: i, x: (i + 0.5) / n * 100, y: m.bruto > 0 ? yM(m.margem) : null }; });
      var linha = pts.filter(function (p) { return p.y != null; }).map(function (p) { return p.x.toFixed(2) + ',' + p.y.toFixed(2); }).join(' ');
      var BAR = 70; // % da altura reservada às barras
      var conteudo = function (m) {
        var l = [linhaTip('Entregas', int(m.entregas)), linhaTip('Valor bruto', brl(m.bruto)), linhaTip('Repasse', brl(m.repasse)),
          linhaTip('Mín. garantido', m.garantido ? brl(m.garantido) : '—', m.garantido ? null : { color: CINZA, fontWeight: 400 }),
          linhaTip('Líquido', brl(m.liquido), { color: m.liquido < 0 ? VERMELHO : '#111827' }), linhaTip('Ticket médio', brl(m.ticket)),
          linhaTip('Margem', m.bruto ? pct(m.margem) : '—', props.teto != null && m.bruto && m.margem >= props.teto ? { color: AMBAR } : null)];
        var rod = null;
        if (m.projetado) {
          rod = h('div', { style: { borderTop: '1px dashed #e9d5f9', paddingTop: 6 } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: ROXO_E, marginBottom: 2 } }, 'Projeção para o mês fechado'),
            linhaTip('Entregas', int(m.projetado.entregas)), linhaTip('Valor bruto', brl(m.projetado.bruto)),
            linhaTip('Líquido', brl(m.projetado.liquido)), linhaTip('Margem', pct(m.projetado.margem)));
        }
        return caixaTip(MESES_L[Number(m.mes.slice(5, 7)) - 1] + ' de ' + m.mes.slice(0, 4), m.projetado ? 'Mês em andamento · realizado até agora' : null, l, rod);
      };
      var barra = function (valor, proj, cor, corProj, anim) {
        var alt = Math.max(0, (proj != null ? Math.max(proj, valor) : valor)) / mx * BAR;
        var inner = proj != null && proj > 0 ? Math.max(0, valor) / Math.max(proj, valor) * 100 : 100;
        return h('div', { className: 'bifin-anim' + (anim ? ' bifin-grow' : ''), style: { flex: '0 1 26px', minWidth: 6, height: alt.toFixed(2) + '%', position: 'relative', borderRadius: '4px 4px 0 0', overflow: 'hidden', background: proj != null ? corProj : cor } },
          proj != null && h('div', { className: 'bifin-listra', style: { position: 'absolute', inset: 0 } }),
          proj != null && h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: inner.toFixed(1) + '%', background: cor } }));
      };
      corpo = h('div', { ref: rolo, style: { overflowX: 'auto' } },
        h('div', { style: { minWidth: 620 } },
          h('div', { style: { position: 'relative', height: 250, borderBottom: '1px solid ' + BORDA } },
            h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 2 } },
              h('polyline', { points: linha, fill: 'none', stroke: LARANJA, strokeWidth: 2, strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' })),
            pts.filter(function (p) { return p.y != null; }).map(function (p) {
              var on = T.ativo === p.m.mes, dim = T.ativo && !on;
              return h('div', { key: 'm' + p.m.mes, 'aria-hidden': 'true', className: 'bifin-anim', style: { position: 'absolute', left: p.x + '%', top: p.y + '%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', zIndex: 3, opacity: dim ? 0.5 : 1 } },
                h('span', { style: { fontSize: 10, fontWeight: 700, color: '#c2410c', marginTop: -26, whiteSpace: 'nowrap', background: 'rgba(255,255,255,.85)', borderRadius: 4, padding: '0 3px' } }, pct(p.m.margem)),
                h('span', { className: 'bifin-anim', style: { width: on ? 11 : 7, height: on ? 11 : 7, borderRadius: '50%', background: LARANJA, border: '2px solid #fff', boxShadow: on ? '0 0 0 3px rgba(246,118,2,.22)' : 'none', marginTop: 4 } }));
            }),
            h('div', { style: { position: 'absolute', inset: 0, display: 'flex' } },
              pts.map(function (p) {
                var m = p.m; var on = T.ativo === m.mes, dim = T.ativo && !on;
                return h('div', Object.assign({ key: m.mes, 'data-col': '1', tabIndex: 0, role: 'img', className: 'bifin-foco bifin-anim', onKeyDown: navegarSetas,
                  'aria-label': mesCurto(m.mes) + ': bruto ' + brl(m.bruto) + ', líquido ' + brl(m.liquido) + ', margem ' + pct(m.margem),
                  style: { flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, padding: '0 4px', boxSizing: 'border-box', borderRadius: 8, background: on ? 'rgba(119,15,168,.06)' : 'transparent', opacity: dim ? 0.5 : 1, cursor: 'default', minWidth: 0 } },
                  T.alvo(m.mes, function () { return conteudo(m); }, function (e) {
                    var r = e.currentTarget.getBoundingClientRect(); var o = T.relRect(r, 0.5, 0.42); var a = T.relRect(r, 0, 0), z = T.relRect(r, 1, 0);
                    o.lado = true; o.xL = a.x; o.xR = z.x; return o;
                  })),
                  barra(m.bruto, m.projetado ? m.projetado.bruto : null, LILAS, '#ece0f6', props.animar),
                  barra(m.liquido, m.projetado ? m.projetado.liquido : null, ROXO, '#c9a6e6', props.animar));
              }))),
          h('div', { style: { display: 'flex', marginTop: 5 } },
            meses.map(function (m) { var on = T.ativo === m.mes; return h('span', { key: m.mes, style: { flex: 1, textAlign: 'center', fontSize: 10.5, color: m.projetado ? ROXO_E : on ? ROXO_ESC : CINZA, fontWeight: m.projetado || on ? 700 : 400, whiteSpace: 'nowrap' } }, mesCurto(m.mes) + (m.projetado ? '*' : '')); }))));
    }
    var temProj = meses && meses.some(function (m) { return m.projetado; });
    return h('section', { ref: T.ref, 'aria-label': 'Evolução mensal', style: Object.assign({}, S.card, { position: 'relative' }) },
      tituloBloco('Evolução mensal', 'Últimos 12 meses com os mesmos filtros' + (temProj ? ' · * mês em andamento, com a projeção listrada' : ''),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: CINZA } },
          h('span', { style: S.legenda }, h('span', { style: S.quad(LILAS) }), 'Bruto'),
          h('span', { style: S.legenda }, h('span', { style: S.quad(ROXO) }), 'Líquido'),
          h('span', { style: S.legenda }, h('span', { style: { width: 14, borderTop: '2px solid ' + LARANJA } }), 'Margem'),
          temProj && h('span', { style: S.legenda }, h('span', { className: 'bifin-listra', style: S.quad('#c9a6e6') }), 'Projeção'))),
      corpo,
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  // ── tabela por cliente ──────────────────────────────────────────
  // BI_FINANCEIRO_V2: colunas fluidas (cabe tudo a partir de ~1000px), cabeçalho ordenável, sombra quando rola.
  // 10 colunas: cliente, entregas, %, bruto, repasse, garantido, líquido, Δ líquido, ticket, margem
  var COLS = 'minmax(190px,2.2fr) minmax(64px,.75fr) minmax(58px,.62fr) minmax(98px,1.15fr) minmax(98px,1.15fr) minmax(94px,1.08fr) minmax(98px,1.15fr) minmax(86px,.95fr) minmax(76px,.85fr) minmax(70px,.8fr)';
  var TAB_MIN = 1000;
  function mgStyle(m, teto) {
    return m >= teto ? { fontWeight: 700, color: AMBAR, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '1px 6px' } : { color: '#111827' };
  }
  function celulas(x, totEnt, teto, pad, delta) {
    var c = function (txt, st) { return h('span', { role: 'cell', style: Object.assign({ padding: pad, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }, st || {}) }, txt); };
    var gp = x.bruto ? x.garantido / x.bruto * 100 : 0;
    var gar = x.garantido
      ? h('span', { role: 'cell', style: { padding: pad, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.25 } },
        h('span', { style: { color: '#374151' } }, brl(x.garantido)),
        h('span', { style: { fontSize: 10.5, color: gp >= 8 ? AMBAR : CINZA, fontWeight: gp >= 8 ? 700 : 400 } }, pct(gp) + ' do bruto'))
      : c('—', { color: CINZA });
    return [
      c(int(x.entregas)), c(pct(totEnt ? x.entregas / totEnt * 100 : 0), { color: CINZA }),
      c(brl(x.bruto)), c(brl(x.repasse)), gar,
      c(brl(x.liquido), { fontWeight: 600, color: x.liquido < 0 ? VERMELHO : '#111827' }),
      delta || c('—', { color: '#9ca3af' }),
      c(brl(x.ticket)),
      h('span', { role: 'cell', style: { padding: pad, textAlign: 'right', whiteSpace: 'nowrap' } }, h('span', { style: mgStyle(x.margem, teto) }, pct(x.margem)))
    ].map(function (el, i) { return React.cloneElement(el, { key: i }); });
  }

  var ORDENS = [['bruto', 'desc', 'Maior bruto'], ['entregas', 'desc', 'Mais entregas'], ['margem', 'asc', 'Menor margem'], ['margem', 'desc', 'Maior margem'], ['liquido', 'desc', 'Maior líquido'], ['liquido', 'asc', 'Menor líquido'], ['ticket', 'desc', 'Maior ticket'], ['ticket', 'asc', 'Menor ticket'], ['delta_liquido', 'desc', 'Mais subiu (líquido)'], ['delta_liquido', 'asc', 'Mais caiu (líquido)']];
  var COLUNAS = [['Cliente', 'nome'], ['Entregas', 'entregas'], ['% entregas', 'entregas'], ['Valor bruto', 'bruto'], ['Repasse', 'repasse'], ['Mín. garantido', 'garantido'], ['Líquido', 'liquido'], ['Δ líquido', 'delta_liquido'], ['Ticket médio', 'ticket'], ['Margem', 'margem']];

  function TabelaClientes(props) {
    var dados = props.dados, teto = props.teto;
    var _a = useState(''), busca = _a[0], setBusca = _a[1];
    var _b = useState({ campo: 'bruto', dir: 'desc' }), ordem = _b[0], setOrdem = _b[1];
    var _c = useState({}), abertos = _c[0], setAbertos = _c[1];
    var _d = useState({ esq: false, dir: false }), sombra = _d[0], setSombra = _d[1];
    var rolagem = useRef(null);
    var T = useTip();
    var totEnt = dados.totais.entregas;
    // BI_FINANCEIRO_V2: "Ver cliente" (pontos de atenção / quem mais mudou) → limpa a busca, abre, rola e destaca
    useEffect(function () {
      var fc = props.foco; if (!fc || !fc.cod) return undefined;
      setBusca('');
      setAbertos(function (o) { var n = {}; n[fc.cod] = true; return Object.assign({}, o, n); });
      var t = setTimeout(function () {
        var el = T.ref.current && T.ref.current.querySelector('[data-cod="' + fc.cod + '"]');
        if (el) rolarPara(el, 'bifin-flash-row');
      }, 60);
      return function () { clearTimeout(t); };
    }, [props.foco && props.foco.n]);
    function deltaCell(c) {
      if (c.novo) return h('span', { role: 'cell', style: { padding: '10px 8px', textAlign: 'right', color: '#9ca3af', whiteSpace: 'nowrap' } }, '—');
      var d = c.delta_liquido || 0; if (Math.abs(d) < 0.5) d = 0; var cor = d > 0 ? VERDE : d < 0 ? VERMELHO : CINZA;
      var per = dados.periodo && dados.periodo.anterior;
      return h('span', Object.assign({ role: 'cell', tabIndex: 0, className: 'bifin-foco', 'aria-label': 'Variação do líquido: ' + sinal(d, brl),
        style: { padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.25, cursor: 'default', fontVariantNumeric: 'tabular-nums' } },
        T.alvo('d' + c.cod, function () {
          return caixaTip(c.cod + ' · ' + c.nome, per ? 'Contra ' + ddmm(per.inicio) + ' a ' + ddmm(per.fim) : null, [
            linhaTip('Líquido agora', brl(c.liquido), { color: c.liquido < 0 ? VERMELHO : '#111827' }),
            linhaTip('Líquido antes', brl(c.anterior_liquido)),
            linhaTip('Diferença', sinal(d, brl), { color: cor }),
            linhaTip('Variação', c.delta_liquido_pct == null ? '—' : pctSinal(c.delta_liquido_pct), { color: cor })]);
        })),
        h('span', { style: { color: cor, fontWeight: 600 } }, d ? sinal(d, brl0) : 'R$ 0'),
        c.delta_liquido_pct != null && h('span', { style: { fontSize: 10.5, color: CINZA } }, pctSinal(c.delta_liquido_pct)));
    }
    var lista = useMemo(function () {
      var b = busca.trim().toLowerCase();
      var l = dados.clientes.filter(function (c) { return !b || c.cod.indexOf(b) >= 0 || String(c.nome).toLowerCase().indexOf(b) >= 0; });
      var k = ordem.campo, s = ordem.dir === 'asc' ? 1 : -1;
      return l.slice().sort(function (a, z) {
        if (k === 'nome') return s * String(a.nome).localeCompare(String(z.nome), 'pt-BR');
        return s * ((a[k] || 0) - (z[k] || 0)) || (z.bruto - a.bruto);
      });
    }, [dados, busca, ordem.campo, ordem.dir]);
    var medir = useCallback(function () {
      var el = rolagem.current; if (!el) return;
      var esq = el.scrollLeft > 2, dir = el.scrollWidth - el.clientWidth - el.scrollLeft > 2;
      setSombra(function (o) { return o.esq === esq && o.dir === dir ? o : { esq: esq, dir: dir }; });
    }, []);
    useEffect(function () {
      medir();
      var ro = typeof ResizeObserver !== 'undefined' && rolagem.current ? new ResizeObserver(medir) : null;
      if (ro) ro.observe(rolagem.current); else window.addEventListener('resize', medir);
      return function () { if (ro) ro.disconnect(); else window.removeEventListener('resize', medir); };
    }, [medir, lista.length]);
    function estaAberto(c) { return abertos[c.cod] !== undefined ? abertos[c.cod] : c.agrupamento === 'separado'; }
    function ordenarPor(campo) {
      setOrdem(function (o) { return o.campo === campo ? { campo: campo, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { campo: campo, dir: campo === 'nome' ? 'asc' : 'desc' }; });
    }
    var valorSel = ''; ORDENS.forEach(function (o) { if (o[0] === ordem.campo && o[1] === ordem.dir) valorSel = o[0] + '|' + o[1]; });
    var t = dados.totais;
    var pad = '10px 8px';
    return h('section', { ref: T.ref, style: Object.assign({}, S.card, { gap: 12, position: 'relative' }), 'aria-label': 'Resumo por cliente' },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 } },
        h('div', null, h('h2', { style: S.h2 }, 'Resumo por cliente'), h('p', { style: S.sub }, 'Nome com a máscara do BI · abra o cliente para ver os centros de custo · clique no título da coluna para ordenar')),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, border: '1px solid ' + BORDA, borderRadius: 8, padding: '0 10px', color: CINZA, background: '#fff' } },
            ico('search', 14), h('input', { type: 'text', value: busca, onChange: function (e) { setBusca(e.target.value); }, placeholder: 'Código ou nome', 'aria-label': 'Buscar cliente', style: { border: 0, outline: 0, fontSize: 13, width: 150, fontFamily: 'inherit' } })),
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: CINZA } }, 'Ordenar',
            h('select', { value: valorSel, onChange: function (e) { var p = e.target.value.split('|'); if (p[0]) setOrdem({ campo: p[0], dir: p[1] }); }, style: Object.assign({}, S.inp, { height: 36, width: 'auto' }) },
              !valorSel && h('option', { value: '' }, 'Pela coluna'),
              ORDENS.map(function (o) { return h('option', { key: o[0] + o[1], value: o[0] + '|' + o[1] }, o[2]); }))))),
      h('div', { style: { position: 'relative' } },
        h('div', { ref: rolagem, onScroll: medir, style: { overflowX: 'auto', border: '1px solid #f3f4f6', borderRadius: 10 } },
          h('div', { role: 'table', 'aria-label': 'Resumo por cliente', style: { minWidth: TAB_MIN, fontSize: 12.5 } },
            h('div', { role: 'row', style: { display: 'grid', gridTemplateColumns: COLS, background: '#faf5ff', borderBottom: '1px solid #e9d5f9', fontSize: 10.5, fontWeight: 700, color: ROXO_E, textTransform: 'uppercase', letterSpacing: '.03em' } },
              COLUNAS.map(function (c, i) {
                var on = ordem.campo === c[1] && (i !== 2);
                var seta = on ? (ordem.dir === 'asc' ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6') : 'm7 15 5 5 5-5M7 9l5-5 5 5';
                return h('span', { key: c[0], role: 'columnheader', 'aria-sort': on ? (ordem.dir === 'asc' ? 'ascending' : 'descending') : 'none', style: { display: 'flex', alignItems: 'stretch', justifyContent: i ? 'flex-end' : 'flex-start' } },
                  h('button', { type: 'button', className: 'bifin-th bifin-foco', onClick: function () { ordenarPor(c[1]); }, title: 'Ordenar por ' + c[0].toLowerCase(),
                    style: { display: 'inline-flex', alignItems: 'center', justifyContent: i ? 'flex-end' : 'flex-start', gap: 4, width: '100%', padding: i ? '9px 8px' : '9px 8px 9px 12px', border: 0, background: 'transparent', font: 'inherit', color: on ? ROXO_ESC : 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', cursor: 'pointer', textAlign: i ? 'right' : 'left', lineHeight: 1.25, whiteSpace: 'normal' } },
                    h('span', null, c[0]),
                    h('svg', { width: 11, height: 11, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', style: { flex: 'none', opacity: on ? 1 : 0.35 } }, h('path', { d: seta }))));
              })),
            lista.length === 0 && h('div', { style: { padding: 24, textAlign: 'center', color: CINZA } }, 'Nenhum cliente encontrado.'),
            lista.map(function (c) {
              var temCc = c.ccs && c.ccs.length > 0; var ab = temCc && estaAberto(c);
              var chip = c.agrupamento === 'consolidado' ? h('span', { style: { fontSize: 10, fontWeight: 600, color: CINZA, background: '#f3f4f6', borderRadius: 99, padding: '1px 7px', whiteSpace: 'nowrap', flex: 'none' } }, 'CCs consolidados')
                : c.agrupamento === 'separado' ? h('span', { style: { fontSize: 10, fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', borderRadius: 99, padding: '1px 7px', whiteSpace: 'nowrap', flex: 'none' } }, 'CC separado') : null;
              var neg = c.liquido < 0;
              return h(React.Fragment, { key: c.cod },
                h('div', { role: 'row', 'data-cod': c.cod, className: neg ? 'bifin-row-neg' : 'bifin-row', style: { display: 'grid', gridTemplateColumns: COLS, borderBottom: '1px solid #f3f4f6', alignItems: 'center', background: neg ? '#fef2f2' : '#fff' } },
                  h('span', { role: 'cell', style: { padding: '6px 8px 6px 10px', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 } },
                    temCc ? h('button', { type: 'button', onClick: function () { var n = {}; n[c.cod] = !ab; setAbertos(Object.assign({}, abertos, n)); }, 'aria-expanded': ab, 'aria-label': (ab ? 'Fechar' : 'Abrir') + ' centros de custo de ' + c.nome,
                      style: { width: 28, height: 28, flex: 'none', border: '1px solid ' + BORDA, borderRadius: 7, background: '#fff', color: ROXO_E, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 } }, chevron(ab))
                      : h('span', { style: { width: 28, flex: 'none' } }),
                    c.abc && abcBadge(c.abc),
                    h('span', { style: { fontSize: 11, fontWeight: 700, color: ROXO_E, background: '#f3e8fb', borderRadius: 6, padding: '2px 6px', flex: 'none' } }, c.cod),
                    h('span', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 6px', minWidth: 0, flex: 1 } },
                      h('span', { title: c.nome, style: { fontWeight: 600, color: '#111827', lineHeight: 1.3, overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, c.nome),
                      c.novo && h('span', { style: { fontSize: 10, fontWeight: 700, color: VERDE, background: '#f0fdf4', borderRadius: 99, padding: '1px 7px', whiteSpace: 'nowrap', flex: 'none' } }, 'Novo'),
                      chip)),
                  celulas(c, totEnt, teto, pad, deltaCell(c))),
                ab && c.ccs.map(function (cc) {
                  return h('div', { key: c.cod + '|' + cc.nome, role: 'row', className: 'bifin-row', style: { display: 'grid', gridTemplateColumns: COLS, borderBottom: '1px solid #f3f4f6', alignItems: 'center', background: '#fcfaff', fontSize: 12, color: '#374151' } },
                    h('span', { role: 'cell', style: { padding: '8px 8px 8px ' + (c.abc ? 92 : 68) + 'px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } },
                      h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: '#c4a5e0', flex: 'none' } }),
                      h('span', { title: cc.nome, style: { lineHeight: 1.3, overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, cc.nome)),
                    celulas(cc, totEnt, teto, '8px 8px'));
                }));
            }),
            h('div', { role: 'row', style: { display: 'grid', gridTemplateColumns: COLS, background: ROXO_ESC, color: '#fff', fontWeight: 700 } },
              h('span', { role: 'cell', style: { padding: '12px 8px 12px 48px' } }, 'Total · ' + dados.clientes.length + ' clientes'),
              [int(t.entregas), '100,0%', brl(t.bruto), brl(t.repasse), brl(t.garantido), brl(t.liquido), (dados.anterior && (dados.anterior.entregas || dados.anterior.bruto)) ? sinal(t.liquido - dados.anterior.liquido, brl0) : '—', brl(t.ticket), pct(t.margem)].map(function (v, i) {
                return h('span', { key: i, role: 'cell', style: { padding: '12px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } }, v);
              })))),
        sombra.esq && h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 1, bottom: 1, left: 1, width: 28, pointerEvents: 'none', borderRadius: '10px 0 0 10px', background: 'linear-gradient(90deg, rgba(17,24,39,.14), rgba(17,24,39,0))' } }),
        sombra.dir && h('div', { 'aria-hidden': 'true', style: { position: 'absolute', top: 1, bottom: 1, right: 1, width: 28, pointerEvents: 'none', borderRadius: '0 10px 10px 0', background: 'linear-gradient(270deg, rgba(17,24,39,.14), rgba(17,24,39,0))' } })),
      sombra.dir && h('p', { style: { margin: 0, fontSize: 11, color: ROXO_E, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 } }, 'Arraste para o lado para ver todas as colunas',
        h('svg', { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d: 'M5 12h14M13 6l6 6-6 6' }))),
      h('p', { style: { margin: 0, fontSize: 12, color: CINZA } }, 'Linha em vermelho: o cliente não cobre repasse + mínimo garantido no período. Margem com fundo âmbar passou do teto (' + pct(teto) + '). A/B/C: curva ABC do líquido. Δ líquido: contra o período anterior.'),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  // ── KPIs ────────────────────────────────────────────────────────
  function Kpis(props) {
    var T = useTip();
    var t = props.dados.totais, a = props.dados.anterior, gAp = props.dados.garantido_aplicado;
    var per = props.dados.periodo && props.dados.periodo.anterior;
    function var_(at, an) { return an ? (at - an) / Math.abs(an) * 100 : null; }
    function chip(v, bomSeSobe, ppp) {
      if (v === null || !isFinite(v)) return null;
      var sobe = v > 0.05, desce = v < -0.05;
      var bom = (sobe && bomSeSobe) || (desce && !bomSeSobe);
      var txt = (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (ppp ? ' p.p.' : '%');
      var cor = !sobe && !desce ? { color: CINZA, background: '#f3f4f6' } : bom ? { color: VERDE, background: '#f0fdf4' } : { color: VERMELHO, background: '#fef2f2' };
      return h('span', { style: Object.assign({ fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 7px', whiteSpace: 'nowrap' }, cor) }, txt);
    }
    var cards = [
      { k: 'entregas', l: 'Entregas', v: int(t.entregas), s: 'pontos de entrega (coleta não conta)', d: chip(var_(t.entregas, a.entregas), true), fmt: int, bom: true },
      { k: 'bruto', l: 'Valor bruto', v: brl(t.bruto), s: 'cobrado dos clientes', d: chip(var_(t.bruto, a.bruto), true), fmt: brl, bom: true },
      { k: 'repasse', l: 'Valor repasse', v: brl(t.repasse), s: gAp ? 'Mín. garantido: ' + brl(t.garantido) : 'garantido não entra com filtro de CC/veículo', d: chip(var_(t.repasse, a.repasse), false), fmt: brl, bom: false },
      { k: 'liquido', l: 'Líquido', v: brl(t.liquido), s: 'bruto − repasse − mín. garantido', d: chip(var_(t.liquido, a.liquido), true), fmt: brl, bom: true },
      { k: 'ticket', l: 'Ticket médio', v: brl(t.ticket), s: '(bruto − repasse) ÷ entregas', d: chip(var_(t.ticket, a.ticket), true), fmt: brl, bom: true },
      { k: 'margem', l: 'Margem de repasse', v: pct(t.margem), s: '(repasse + garantido) ÷ bruto', d: a.bruto ? chip(t.margem - a.margem, false, true) : null, fmt: pct, bom: false, pp: true },
    ];
    function conteudo(c) {
      var at = t[c.k], an = a[c.k], dif = at - an;
      var temAnt = a.entregas > 0 || a.bruto > 0;
      var cor = Math.abs(dif) < 1e-9 ? CINZA : ((dif > 0) === c.bom ? VERDE : VERMELHO);
      var linhas = [linhaTip('Agora', c.fmt(at)), linhaTip('Período anterior', temAnt ? c.fmt(an) : 'sem dados', temAnt ? null : { color: CINZA, fontWeight: 400 })];
      if (temAnt) {
        linhas.push(linhaTip('Diferença', c.pp ? sinal(dif, function (x) { return pp(x); }) : sinal(dif, c.fmt), { color: cor }));
        if (!c.pp && an) linhas.push(linhaTip('Variação', sinal(dif / Math.abs(an) * 100, function (x) { return x.toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }), { color: cor }));
      }
      if (c.k === 'repasse' && gAp) linhas.push(linhaTip('Mín. garantido', brl(t.garantido) + ' (antes ' + brl(a.garantido) + ')'));
      return caixaTip(c.l, per ? 'Comparado a ' + ddmm(per.inicio) + ' a ' + ddmm(per.fim) : 'Comparado ao período anterior', linhas,
        c.bom === false ? h('span', { style: { fontSize: 11, color: CINZA } }, 'Aqui, subir é ruim.') : null);
    }
    return h('section', { ref: T.ref, 'aria-label': 'Indicadores', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, position: 'relative' } },
      cards.map(function (c) {
        return h('div', Object.assign({
          key: c.l, tabIndex: 0, className: 'bifin-kpi bifin-foco', 'aria-label': c.l + ': ' + c.v + (per ? '. Período anterior ' + ddmm(per.inicio) + ' a ' + ddmm(per.fim) + ': ' + c.fmt(a[c.k]) : ''),
          style: { background: '#fff', border: '1px solid ' + (T.ativo === c.k ? '#d8c3ea' : BORDA), borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, cursor: 'default' }
        }, T.alvo(c.k, function () { return conteudo(c); }, function (e) { var r = T.relRect(e.currentTarget.getBoundingClientRect(), 0, 1); r.x += 16; r.abaixo = true; return r; })),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } }, h('span', { style: { fontSize: 12, fontWeight: 600, color: CINZA } }, c.l), c.d),
          h('span', { style: { fontFamily: 'Sora,Inter,sans-serif', fontSize: 'clamp(17px, 4.4vw, 22px)', fontWeight: 700, color: c.l === 'Líquido' && t.liquido < 0 ? VERMELHO : ROXO_ESC, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, c.v),
          h('span', { style: { fontSize: 11, color: CINZA } }, c.s));
      }),
      h(TipBox, { key: T.tip ? T.tip.id : '-', tip: T.tip, box: T.ref }));
  }

  // ── modal Metas e parâmetros ────────────────────────────────────
  function ModalConfig(props) {
    var api = props.api, toast = props.toast, clientesOp = props.clientes || [];
    var _a = useState(null), cfg = _a[0], setCfg = _a[1];
    var _b = useState({ seg_sex: '', sabado: '', domingo: '', vigente_desde: '' }), geral = _b[0], setGeral = _b[1];
    var _c = useState({ ticket: '', teto: '', faixas: '' }), ref_ = _c[0], setRef = _c[1];
    var _d = useState({ cod: '', seg_sex: '', sabado: '', domingo: '' }), nova = _d[0], setNova = _d[1];
    var _e = useState(null), confirmaDel = _e[0], setConfirmaDel = _e[1];
    var _f = useState(false), salvando = _f[0], setSalvando = _f[1];
    var _g = useState(false), sincronizando = _g[0], setSinc = _g[1];
    var _h = useState(''), erro = _h[0], setErro = _h[1];
    var caixa = useRef(null);

    function aplicar(j) {
      setCfg(j);
      var g = (j.metas || []).find(function (m) { return m.cod_cliente === '*'; }) || {};
      setGeral({ seg_sex: g.seg_sex != null ? String(g.seg_sex) : '', sabado: g.sabado != null ? String(g.sabado) : '', domingo: g.domingo != null ? String(g.domingo) : '', vigente_desde: g.vigente_desde || '' });
      setRef({ ticket: dec(j.params.ticket_ideal), teto: Number(j.params.teto_margem).toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        faixas: String(j.params.faixas_km || '3,6,10,15,20').split(',').map(function (x) { return String(x).replace('.', ','); }).join(', ') });
    }
    useEffect(function () {
      api('/params').then(aplicar).catch(function (e) { setErro(e.message); });
    }, []);

    // foco: entra no diálogo, Tab circula, Esc fecha
    useEffect(function () {
      var anterior = document.activeElement;
      var el = caixa.current; if (el) { var f = el.querySelector('button,input,select'); if (f) f.focus(); }
      function tecla(e) {
        if (e.key === 'Escape') { e.preventDefault(); props.onFechar(); return; }
        if (e.key !== 'Tab' || !caixa.current) return;
        var foc = Array.prototype.filter.call(caixa.current.querySelectorAll('button,input,select,a[href]'), function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!foc.length) return;
        var pri = foc[0], ult = foc[foc.length - 1];
        if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); } else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
      }
      document.addEventListener('keydown', tecla);
      return function () { document.removeEventListener('keydown', tecla); if (anterior && anterior.focus) anterior.focus(); };
    }, []);

    function salvar() {
      setErro('');
      var ti = num(ref_.ticket), tm = num(ref_.teto);
      if (ti === null || ti < 0) { setErro('Ticket ideal inválido. Use um valor como 6,00.'); return; }
      if (tm === null || tm <= 0 || tm > 200) { setErro('Teto da margem inválido. Use um valor como 80,0.'); return; }
      // BI_FINANCEIRO_V2: faixas de km ("3, 6, 10, 15, 20"; aceita vírgula decimal com espaço/; como separador)
      var fxTxt = String(ref_.faixas || '').trim();
      var partes = fxTxt ? fxTxt.split(/[\s;]+/).map(function (x) { return x.replace(/,$/, ''); }).filter(Boolean) : [];
      if (partes.length === 1 && partes[0].indexOf(',') >= 0) partes = partes[0].split(',');
      var fx = partes.map(function (x) { return num(x); });
      if (fxTxt && (fx.some(function (v) { return v === null || v <= 0; }) || fx.length > 8 || fx.some(function (v, i) { return i > 0 && v <= fx[i - 1]; }))) { setErro('Faixas de distância inválidas. Use números crescentes separados por vírgula e espaço, ex.: 3, 6, 10, 15, 20.'); return; }
      var gv = [num(geral.seg_sex), num(geral.sabado), num(geral.domingo)];
      var temGeral = gv.some(function (v) { return v !== null; });
      if (temGeral && gv.some(function (v) { return v === null || v < 0; })) { setErro('Preencha a meta geral de seg a sex, sábado e domingo (pode ser 0).'); return; }
      setSalvando(true);
      var corpoP = { ticket_ideal: ti, teto_margem: tm };
      if (fx.length) corpoP.faixas_km = fx.join(',');
      var ps = [api('/params', { method: 'PUT', body: corpoP })];
      if (temGeral) ps.push(api('/metas', { method: 'PUT', body: { cod_cliente: '*', seg_sex: gv[0], sabado: gv[1], domingo: gv[2], vigente_desde: geral.vigente_desde || null } }));
      Promise.all(ps).then(function () { toast('Parâmetros salvos', 'success'); props.onSalvo(); props.onFechar(); })
        .catch(function (e) { setErro(e.message); }).finally(function () { setSalvando(false); });
    }
    function addMeta() {
      setErro('');
      var v = [num(nova.seg_sex), num(nova.sabado), num(nova.domingo)];
      if (!nova.cod) { setErro('Escolha o cliente da meta.'); return; }
      if (v.some(function (x) { return x === null || x < 0; })) { setErro('Preencha a meta do cliente de seg a sex, sábado e domingo (pode ser 0).'); return; }
      api('/metas', { method: 'PUT', body: { cod_cliente: nova.cod, seg_sex: v[0], sabado: v[1], domingo: v[2] } })
        .then(function (j) { setCfg(Object.assign({}, cfg, { metas: j.metas.map(function (m) { var c = clientesOp.find(function (x) { return x.cod === m.cod_cliente; }); var old = (cfg.metas || []).find(function (x) { return x.cod_cliente === m.cod_cliente; }); return Object.assign({}, m, { nome: m.cod_cliente === '*' ? 'Geral' : (c ? c.nome : old ? old.nome : 'Cliente ' + m.cod_cliente) }); }) })); setNova({ cod: '', seg_sex: '', sabado: '', domingo: '' }); props.onSalvo(); })
        .catch(function (e) { setErro(e.message); });
    }
    function delMeta(cod) {
      api('/metas/' + encodeURIComponent(cod), { method: 'DELETE' })
        .then(function () { setCfg(Object.assign({}, cfg, { metas: cfg.metas.filter(function (m) { return m.cod_cliente !== cod; }) })); setConfirmaDel(null); props.onSalvo(); })
        .catch(function (e) { setErro(e.message); });
    }
    function sincronizar() {
      setSinc(true);
      api('/garantido/sincronizar', { method: 'POST', body: {} })
        .then(function (j) { toast('Garantido atualizado: ' + j.linhas + ' linha(s) da planilha', 'success'); setCfg(Object.assign({}, cfg, { garantido_sincronizado_em: new Date().toISOString() })); props.onSalvo(); })
        .catch(function (e) { toast(e.message, 'error'); }).finally(function () { setSinc(false); });
    }

    var metasCli = cfg ? (cfg.metas || []).filter(function (m) { return m.cod_cliente !== '*'; }) : [];
    var codsComMeta = metasCli.map(function (m) { return m.cod_cliente; });
    var inpN = function (val, set, label, extra) { return h('label', { style: S.lbl }, label, h('input', Object.assign({ type: 'text', inputMode: 'numeric', value: val, onChange: function (e) { set(e.target.value); }, style: S.inp }, extra || {}))); };
    var colsMeta = 'minmax(0,2.2fr) minmax(56px,1fr) minmax(56px,1fr) minmax(56px,1fr) 44px';
    var chipCod = function (x, azul) { return h('span', { key: x.cod, title: x.nome, style: { fontSize: 12, color: azul ? '#1d4ed8' : '#374151', background: azul ? '#eff6ff' : '#f3f4f6', borderRadius: 99, padding: '3px 9px', whiteSpace: 'nowrap' } }, x.cod + ' · ' + x.nome); };

    return h('div', { style: { position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }, onMouseDown: function (e) { if (e.target === e.currentTarget) props.onFechar(); } },
      h('div', { ref: caixa, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bifin-cfg-t', style: { background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(17,24,39,.25)', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 700, maxHeight: 'calc(100vh - 32px)', overflow: 'hidden', fontSize: 13, color: '#111827' } },
        h('div', { style: { padding: '18px 22px', borderBottom: '1px solid ' + BORDA, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 } },
          h('div', null, h('h2', { id: 'bifin-cfg-t', style: { margin: 0, fontFamily: 'Sora,Inter,sans-serif', fontSize: 18, color: ROXO_ESC } }, 'Metas e parâmetros'), h('p', { style: { margin: '3px 0 0', color: CINZA } }, 'Valem para os gráficos e alertas do BI Financeiro')),
          h('button', { type: 'button', onClick: props.onFechar, 'aria-label': 'Fechar', style: { width: 36, height: 36, borderRadius: 9, border: '1px solid ' + BORDA, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#374151', cursor: 'pointer', flex: 'none' } }, ico('x', 16))),
        h('div', { style: { padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 22, overflowY: 'auto', flex: 1 } },
          !cfg ? h('p', { style: { color: CINZA, margin: 0 } }, erro || 'Carregando…') : h(React.Fragment, null,
            h('section', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              h('h3', { style: { margin: 0, fontSize: 14 } }, 'Meta de entregas por dia'),
              h('p', { style: { margin: 0, color: CINZA, fontSize: 12 } }, 'A meta geral vale para o total. Se você filtrar um cliente que tem meta própria, o gráfico usa a dele.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 } },
                inpN(geral.seg_sex, function (v) { setGeral(Object.assign({}, geral, { seg_sex: v })); }, 'Seg a sex'),
                inpN(geral.sabado, function (v) { setGeral(Object.assign({}, geral, { sabado: v })); }, 'Sábado'),
                inpN(geral.domingo, function (v) { setGeral(Object.assign({}, geral, { domingo: v })); }, 'Domingo'),
                h('label', { style: S.lbl }, 'Vale a partir de', h('input', { type: 'date', value: geral.vigente_desde, onChange: function (e) { setGeral(Object.assign({}, geral, { vigente_desde: e.target.value })); }, style: S.inp }))),
              h('div', { style: { border: '1px solid ' + BORDA, borderRadius: 10, overflowX: 'auto' } },
                h('div', { style: { minWidth: 460 } },
                  h('div', { style: { display: 'grid', gridTemplateColumns: colsMeta, background: '#faf5ff', fontSize: 11, fontWeight: 700, color: ROXO_E, textTransform: 'uppercase', letterSpacing: '.03em' } },
                    h('span', { style: { padding: '9px 12px' } }, 'Meta por cliente'), h('span', { style: { padding: '9px 12px', textAlign: 'right' } }, 'Seg–sex'), h('span', { style: { padding: '9px 12px', textAlign: 'right' } }, 'Sáb'), h('span', { style: { padding: '9px 12px', textAlign: 'right' } }, 'Dom'), h('span')),
                  metasCli.length === 0 && h('div', { style: { padding: '10px 12px', color: CINZA, borderTop: '1px solid #f3f4f6' } }, 'Nenhum cliente com meta própria.'),
                  metasCli.map(function (m) {
                    return h('div', { key: m.cod_cliente, style: { display: 'grid', gridTemplateColumns: colsMeta, alignItems: 'center', borderTop: '1px solid #f3f4f6' } },
                      h('span', { style: { padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 } }, h('span', { style: { fontSize: 11, fontWeight: 700, color: ROXO_E, background: '#f3e8fb', borderRadius: 6, padding: '2px 6px', flex: 'none' } }, m.cod_cliente), h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, m.nome)),
                      confirmaDel === m.cod_cliente
                        ? h('span', { style: { gridColumn: '2 / span 4', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, padding: '4px 8px' } }, h('span', { style: { fontSize: 12, color: '#374151' } }, 'Remover a meta?'),
                          h('button', { type: 'button', onClick: function () { delMeta(m.cod_cliente); }, style: { height: 30, padding: '0 10px', borderRadius: 8, border: 0, background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' } }, 'Remover meta'),
                          h('button', { type: 'button', onClick: function () { setConfirmaDel(null); }, style: { height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid ' + BORDA, background: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' } }, 'Manter'))
                        : h(React.Fragment, null,
                          h('span', { style: { padding: '8px 12px', textAlign: 'right' } }, int(m.seg_sex)), h('span', { style: { padding: '8px 12px', textAlign: 'right' } }, int(m.sabado)), h('span', { style: { padding: '8px 12px', textAlign: 'right' } }, int(m.domingo)),
                          h('button', { type: 'button', onClick: function () { setConfirmaDel(m.cod_cliente); }, 'aria-label': 'Remover meta do cliente ' + m.cod_cliente, style: { width: 32, height: 32, border: 0, background: 'none', color: '#9ca3af', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ico('trash', 15))));
                  }),
                  h('div', { style: { display: 'grid', gridTemplateColumns: colsMeta, alignItems: 'end', gap: 0, borderTop: '1px solid #f3f4f6', background: '#fcfaff' } },
                    h('label', { style: { padding: '8px 6px 8px 12px', fontSize: 0 } }, h('span', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, 'Cliente da nova meta'),
                      h('select', { value: nova.cod, onChange: function (e) { setNova(Object.assign({}, nova, { cod: e.target.value })); }, style: Object.assign({}, S.inp, { height: 34 }) },
                        h('option', { value: '' }, 'Adicionar cliente…'),
                        clientesOp.filter(function (c) { return codsComMeta.indexOf(c.cod) < 0; }).map(function (c) { return h('option', { key: c.cod, value: c.cod }, c.cod + ' · ' + c.nome); }))),
                    ['seg_sex', 'sabado', 'domingo'].map(function (k, i) {
                      return h('label', { key: k, style: { padding: '8px 4px', fontSize: 0 } }, h('span', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, ['Seg a sex', 'Sábado', 'Domingo'][i]),
                        h('input', { type: 'text', inputMode: 'numeric', value: nova[k], placeholder: '0', onChange: function (e) { var n = {}; n[k] = e.target.value; setNova(Object.assign({}, nova, n)); }, style: Object.assign({}, S.inp, { height: 34, textAlign: 'right' }) }));
                    }),
                    h('span', { style: { padding: '8px 6px 8px 0', display: 'flex', justifyContent: 'center' } },
                      h('button', { type: 'button', onClick: addMeta, 'aria-label': 'Adicionar meta do cliente', style: { width: 34, height: 34, borderRadius: 8, border: '1px solid #c4a5e0', background: '#fff', color: ROXO, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ico('plus', 15))))))),
            h('section', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              h('h3', { style: { margin: 0, fontSize: 14 } }, 'Referências'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 } },
                h('label', { style: S.lbl }, 'Ticket ideal (R$ por entrega)', h('input', { type: 'text', inputMode: 'decimal', value: ref_.ticket, onChange: function (e) { setRef(Object.assign({}, ref_, { ticket: e.target.value })); }, style: S.inp }), h('span', { style: { fontWeight: 400, color: CINZA } }, 'Linha laranja do gráfico de ticket')),
                h('label', { style: S.lbl }, 'Teto da margem de repasse (%)', h('input', { type: 'text', inputMode: 'decimal', value: ref_.teto, onChange: function (e) { setRef(Object.assign({}, ref_, { teto: e.target.value })); }, style: S.inp }), h('span', { style: { fontWeight: 400, color: CINZA } }, 'Acima disso a margem fica em âmbar')),
                h('label', { style: Object.assign({}, S.lbl, { gridColumn: '1 / -1' }) }, 'Faixas de distância (km)', h('input', { type: 'text', value: ref_.faixas, placeholder: '3, 6, 10, 15, 20', onChange: function (e) { setRef(Object.assign({}, ref_, { faixas: e.target.value })); }, style: S.inp }),
                  h('span', { style: { fontWeight: 400, color: CINZA } }, 'Limites das faixas do bloco "Margem por faixa de distância". Ex.: 3, 6, 10, 15, 20 cria 0–3, 3–6, 6–10, 10–15, 15–20 e 20+ km.')))),
            h('section', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 } }, h('h3', { style: { margin: 0, fontSize: 14 } }, 'Agrupamento de centros de custo'), h('span', { style: { fontSize: 11, fontWeight: 600, color: ROXO_E, background: '#f3e8fb', borderRadius: 99, padding: '3px 9px' } }, 'Mesma regra do Gerencial')),
              h('p', { style: { margin: 0, color: CINZA, fontSize: 12 } }, 'Com "Agrupar CCs como no Gerencial" ligado, o BI segue a mesma regra do Gerencial. Desligado, todo cliente com CC abre na tabela.'),
              h('div', { style: { border: '1px solid ' + BORDA, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
                h('span', { style: { fontSize: 12, fontWeight: 700, color: '#374151' } }, 'CCs consolidados · uma linha por cliente'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, (cfg.agrupamento.consolidados || []).map(function (x) { return chipCod(x, false); }))),
              h('div', { style: { border: '1px solid ' + BORDA, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
                h('span', { style: { fontSize: 12, fontWeight: 700, color: '#374151' } }, 'CC separado · cada CC aberto por padrão'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, (cfg.agrupamento.separados || []).map(function (x) { return chipCod(x, true); }))),
              h('p', { style: { margin: 0, fontSize: 12, color: CINZA } }, 'Os outros clientes mostram o total e abrem os CCs ao clicar. CC com menos de 1% das entregas do cliente entra no CC principal, igual ao Gerencial.')),
            h('section', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              h('h3', { style: { margin: 0, fontSize: 14 } }, 'Mínimo garantido'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 } },
                h('p', { style: { margin: 0, color: CINZA, fontSize: 12 } }, 'Vem da planilha do garantido e atualiza sozinho a cada 6 horas. ' + (cfg.garantido_sincronizado_em ? 'Última atualização: ' + dataHora(cfg.garantido_sincronizado_em) + '.' : 'Ainda não foi atualizado.')),
                h('button', { type: 'button', onClick: sincronizar, disabled: sincronizando, style: Object.assign({}, S.btn, { height: 36, fontSize: 12 }) }, ico('refresh', 14), sincronizando ? 'Atualizando…' : 'Atualizar garantido agora'))))),
        erro && cfg && h('p', { role: 'alert', style: { margin: 0, padding: '10px 22px', background: '#fef2f2', color: '#b91c1c', fontSize: 12, borderTop: '1px solid #fecaca' } }, erro),
        h('div', { style: { padding: '14px 22px', borderTop: '1px solid ' + BORDA, display: 'flex', justifyContent: 'flex-end', gap: 8 } },
          h('button', { type: 'button', onClick: props.onFechar, style: S.btn }, 'Cancelar'),
          h('button', { type: 'button', onClick: salvar, disabled: !cfg || salvando, style: Object.assign({}, S.btnP, { opacity: !cfg || salvando ? 0.7 : 1 }) }, salvando ? 'Salvando…' : 'Salvar parâmetros'))));
  }

  // ── skeleton / estados ──────────────────────────────────────────
  function bloco(alt) { return h('div', { style: { height: alt, borderRadius: 14, background: 'linear-gradient(90deg,#f3f4f6,#faf7fd,#f3f4f6)', border: '1px solid ' + BORDA } }); }

  // ── exportação ──────────────────────────────────────────────────
  function exportar(dados, f, toast) {
    var cab = ['Código', 'Cliente', 'Centro de custo', 'Agrupamento', 'ABC', 'Novo', 'Entregas', '% entregas', 'Valor bruto', 'Repasse', 'Mín. garantido', 'Garantido % bruto', 'Líquido', 'Líquido anterior', 'Δ líquido', 'Δ líquido %', 'Ticket médio', 'Margem %'];
    var tot = dados.totais.entregas || 0;
    var ag = { consolidado: 'CCs consolidados', separado: 'CC separado', padrao: '' };
    var linhas = [];
    var r2 = function (v) { return Math.round(Number(v || 0) * 100) / 100; };
    dados.clientes.forEach(function (c) {
      linhas.push([c.cod, c.nome, '', ag[c.agrupamento] || '', c.abc || '', c.novo ? 'Sim' : '', c.entregas, r2(tot ? c.entregas / tot * 100 : 0), r2(c.bruto), r2(c.repasse), r2(c.garantido), r2(c.garantido_pct), r2(c.liquido),
        c.novo ? '' : r2(c.anterior_liquido), c.novo ? '' : r2(c.delta_liquido), c.delta_liquido_pct == null ? '' : r2(c.delta_liquido_pct), r2(c.ticket), r2(c.margem)]);
      (c.ccs || []).forEach(function (cc) { linhas.push([c.cod, c.nome, cc.nome, '', '', '', cc.entregas, r2(tot ? cc.entregas / tot * 100 : 0), r2(cc.bruto), r2(cc.repasse), r2(cc.garantido), '', r2(cc.liquido), '', '', '', r2(cc.ticket), r2(cc.margem)]); });
    });
    var t = dados.totais, an = dados.anterior || {};
    linhas.push(['', 'TOTAL', '', '', '', '', t.entregas, 100, r2(t.bruto), r2(t.repasse), r2(t.garantido), r2(t.bruto ? t.garantido / t.bruto * 100 : 0), r2(t.liquido), r2(an.liquido), r2(t.liquido - (an.liquido || 0)), an.liquido ? r2((t.liquido - an.liquido) / Math.abs(an.liquido) * 100) : '', r2(t.ticket), r2(t.margem)]);
    var nome = 'bi-financeiro_' + f.ini + '_a_' + f.fim;
    try {
      if (window.XLSX && window.XLSX.utils) {
        var ws = window.XLSX.utils.aoa_to_sheet([cab].concat(linhas));
        ws['!cols'] = [8, 34, 26, 16, 5, 6, 10, 10, 14, 14, 14, 10, 14, 14, 14, 10, 12, 10].map(function (w) { return { wch: w }; });
        var wb = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb, ws, 'Resumo por cliente');
        window.XLSX.writeFile(wb, nome + '.xlsx');
        return;
      }
      var esc = function (v) { var s = typeof v === 'number' ? String(v).replace('.', ',') : String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
      var csv = '﻿' + [cab].concat(linhas).map(function (l) { return l.map(esc).join(';'); }).join('\r\n');
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) { toast('Não foi possível exportar: ' + e.message, 'error'); }
  }

  // ── componente principal ────────────────────────────────────────
  function ModuloBiFinanceiro(props) {
    var API_URL = props.API_URL, fetchAuth = props.fetchAuth;
    var toast = useCallback(function (m, t) { if (typeof props.ja === 'function') props.ja(m, t || 'success'); }, [props.ja]);
    var _a = useState(filtrosIniciais), f = _a[0], setF = _a[1];
    var _b = useState({ clientes: [], veiculos: [] }), op = _b[0], setOp = _b[1];
    var _c = useState(null), dados = _c[0], setDados = _c[1];
    var _d = useState(false), carregando = _d[0], setCarregando = _d[1];
    var _e = useState(''), erro = _e[0], setErro = _e[1];
    var _g = useState(false), modal = _g[0], setModal = _g[1];
    var _h = useState(0), recarga = _h[0], setRecarga = _h[1];
    var _an = useState(true), animar = _an[0], setAnimar = _an[1]; // BI_FINANCEIRO_V2: anima só a 1ª carga
    var _fo = useState(null), foco = _fo[0], setFoco = _fo[1];
    var _ev = useState({ meses: null, erro: '' }), evo = _ev[0], setEvo = _ev[1];
    var evoSeq = useRef(0);
    useEffect(function () { garantirCss(); }, []);
    useEffect(function () { if (!dados || !animar) return undefined; var t = setTimeout(function () { setAnimar(false); }, 700); return function () { clearTimeout(t); }; }, [!!dados]);
    var seq = useRef(0);

    var api = useCallback(function (rota, o) {
      o = o || {};
      var opts = { method: o.method || 'GET', headers: { 'Content-Type': 'application/json' } };
      if (o.body !== undefined) opts.body = JSON.stringify(o.body);
      return fetchAuth(API_URL + BASE + rota, opts).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.error || ('Erro ' + r.status));
          return j;
        });
      });
    }, [API_URL, fetchAuth]);

    useEffect(function () { try { localStorage.setItem(LS_KEY, JSON.stringify(f)); } catch (_) { /* sem storage */ } }, [f]);

    // semanas (seg–dom) dentro do período
    var semanas = useMemo(function () {
      var out = []; if (!f.ini || !f.fim || f.ini > f.fim) return out;
      for (var s = segundaDe(f.ini); s <= f.fim && out.length < 60; s = addDias(s, 7)) {
        var a = s < f.ini ? f.ini : s; var b = addDias(s, 6) > f.fim ? f.fim : addDias(s, 6);
        out.push({ valor: s, label: ddmm(a) + ' a ' + ddmm(b), ini: a, fim: b });
      }
      return out;
    }, [f.ini, f.fim]);
    var semanaSel = semanas.find(function (s) { return s.valor === f.semana; });
    var qIni = semanaSel ? semanaSel.ini : f.ini, qFim = semanaSel ? semanaSel.fim : f.fim;
    var periodoInvalido = !qIni || !qFim || qIni > qFim ? 'A data inicial precisa ser antes da final.'
      : (Date.parse(qFim) - Date.parse(qIni)) / 86400000 > 400 ? 'O período máximo é de 400 dias. Diminua o intervalo.' : '';

    useEffect(function () {
      if (!f.ini || !f.fim || f.ini > f.fim || (Date.parse(f.fim) - Date.parse(f.ini)) / 86400000 > 400) return;
      api('/filtros?data_inicio=' + f.ini + '&data_fim=' + f.fim).then(setOp).catch(function () { /* filtros ficam como estão */ });
    }, [f.ini, f.fim, api]);

    useEffect(function () {
      if (periodoInvalido) return;
      var meu = ++seq.current;
      setCarregando(true); setErro('');
      var q = 'data_inicio=' + qIni + '&data_fim=' + qFim + '&agrupar=' + (f.agrupar ? 1 : 0);
      if (f.clientes.length) q += '&clientes=' + encodeURIComponent(f.clientes.join(','));
      if (f.ccs.length) q += '&ccs=' + encodeURIComponent(f.ccs.join(','));
      if (f.veiculos.length) q += '&categorias=' + encodeURIComponent(f.veiculos.join(','));
      api('/painel?' + q).then(function (j) { if (meu === seq.current) setDados(j); })
        .catch(function (e) { if (meu === seq.current) { setErro(e.message); toast(e.message, 'error'); } })
        .finally(function () { if (meu === seq.current) setCarregando(false); });
    }, [qIni, qFim, f.agrupar, f.clientes.join(','), f.ccs.join(','), f.veiculos.join(','), recarga, api]);

    // BI_FINANCEIRO_V2: evolução mensal (carrega depois do painel; não depende do início do período)
    var temDados = !!dados;
    useEffect(function () {
      if (periodoInvalido || !temDados) return;
      var meu = ++evoSeq.current;
      setEvo(function (o) { return { meses: o.meses, erro: '', carregando: true }; });
      var q = 'data_fim=' + qFim;
      if (f.clientes.length) q += '&clientes=' + encodeURIComponent(f.clientes.join(','));
      if (f.ccs.length) q += '&ccs=' + encodeURIComponent(f.ccs.join(','));
      if (f.veiculos.length) q += '&categorias=' + encodeURIComponent(f.veiculos.join(','));
      api('/evolucao?' + q).then(function (j) { if (meu === evoSeq.current) setEvo({ meses: j.meses || [], erro: '' }); })
        .catch(function (e) { if (meu === evoSeq.current) setEvo({ meses: null, erro: e.message }); });
    }, [temDados, qFim, f.clientes.join(','), f.ccs.join(','), f.veiculos.join(','), recarga, api]);
    function verCliente(cod) { setFoco({ cod: cod, n: Date.now() }); }
    function verBloco(id) { var el = document.getElementById(id); if (el) rolarPara(el); }

    function set(p) { setF(function (o) { return Object.assign({}, o, p); }); }
    function escolherPreset(id) {
      if (id === 'custom') { set({ preset: 'custom' }); return; }
      var p = periodoDoPreset(id); set({ preset: id, ini: p[0], fim: p[1], semana: '' });
    }

    var opClientes = op.clientes.map(function (c) { return { valor: c.cod, label: c.cod + ' · ' + c.nome, extra: int(c.entregas) }; });
    var ccsDisp = [];
    op.clientes.forEach(function (c) {
      if (f.clientes.length && f.clientes.indexOf(c.cod) < 0) return;
      c.ccs.forEach(function (cc) { ccsDisp.push({ valor: cc.valor, label: (f.clientes.length === 1 ? '' : c.cod + ' · ') + cc.nome, extra: int(cc.entregas) }); });
    });
    var opVeic = op.veiculos.map(function (v) { return { valor: v, label: v }; });

    var chipAt = { height: 32, padding: '0 12px', borderRadius: 99, border: '1px solid ' + ROXO, background: ROXO, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' };
    var chipN = { height: 32, padding: '0 12px', borderRadius: 99, border: '1px solid ' + BORDA, background: '#fff', color: '#374151', fontWeight: 500, fontSize: 12, cursor: 'pointer' };
    var atualizado = dados && dataHora(dados.atualizado_em);
    var vazio = dados && dados.totais.entregas === 0 && dados.totais.bruto === 0;
    var nFiltros = f.clientes.length + f.ccs.length + f.veiculos.length + (f.semana ? 1 : 0);

    return h('div', { style: { color: '#111827', fontFamily: 'Inter,system-ui,sans-serif', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 16 } },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 } },
        h('div', { style: { minWidth: 0 } },
          h('h1', { className: 'fin-page-t', style: { margin: 0, fontFamily: 'Sora,Inter,sans-serif', fontSize: 24 } }, 'BI Financeiro'),
          h('p', { style: { margin: '4px 0 0', color: CINZA } }, 'Faturamento, repasse e margem a partir das entregas do BI' + (atualizado ? ' · dados até a importação de ' + atualizado : ''),
            carregando && dados && h('span', { 'aria-live': 'polite', style: { marginLeft: 8, color: ROXO, fontWeight: 600 } }, 'Atualizando…'))),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
          h('button', { type: 'button', onClick: function () { setModal(true); }, style: S.btn }, ico('settings', 14), 'Metas e parâmetros'),
          h('button', { type: 'button', disabled: !dados || vazio, onClick: function () { exportar(dados, { ini: qIni, fim: qFim }, toast); }, style: Object.assign({}, S.btnP, { opacity: !dados || vazio ? 0.6 : 1 }) }, ico('download', 14), 'Exportar Excel'))),

      h('section', { 'aria-label': 'Filtros', style: { background: '#fff', border: '1px solid ' + BORDA, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 } },
          h('span', { style: { fontSize: 12, fontWeight: 600, color: '#374151', marginRight: 4 } }, 'Período'),
          PRESETS.map(function (p) { return h('button', { key: p[0], type: 'button', 'aria-pressed': f.preset === p[0], onClick: function () { escolherPreset(p[0]); }, style: f.preset === p[0] ? chipAt : chipN }, p[1]); }),
          h('span', { style: { flex: 1 } }),
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: CINZA } }, 'De',
            h('input', { type: 'date', value: f.ini, max: f.fim, onChange: function (e) { if (e.target.value) set({ preset: 'custom', ini: e.target.value, semana: '' }); }, style: Object.assign({}, S.inp, { height: 34, width: 150 }) })),
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: CINZA } }, 'até',
            h('input', { type: 'date', value: f.fim, min: f.ini, onChange: function (e) { if (e.target.value) set({ preset: 'custom', fim: e.target.value, semana: '' }); }, style: Object.assign({}, S.inp, { height: 34, width: 150 }) }))),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10, alignItems: 'end' } },
          h('label', { style: S.lbl }, 'Semana',
            h('select', { value: f.semana, onChange: function (e) { set({ semana: e.target.value }); }, style: S.inp },
              h('option', { value: '' }, 'Todas as semanas'),
              semanas.map(function (s) { return h('option', { key: s.valor, value: s.valor }, s.label); }))),
          h(MultiSelect, { id: 'bifin-veic', label: 'Veículo', vazio: 'Todos os veículos' + (opVeic.length ? ' (' + opVeic.length + ')' : ''), opcoes: opVeic, valores: f.veiculos, onChange: function (v) { set({ veiculos: v }); } }),
          h(MultiSelect, { id: 'bifin-cli', label: 'Cliente', vazio: 'Todos os clientes' + (opClientes.length ? ' (' + opClientes.length + ')' : ''), opcoes: opClientes, valores: f.clientes, buscavel: true,
            onChange: function (v) { set({ clientes: v, ccs: f.ccs.filter(function (cc) { return !v.length || v.indexOf(cc.split('|')[0]) >= 0; }) }); } }),
          h(MultiSelect, { id: 'bifin-cc', label: 'Centro de custo', vazio: 'Todos os centros de custo', opcoes: ccsDisp, valores: f.ccs, buscavel: true, onChange: function (v) { set({ ccs: v }); } }),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', height: 38, padding: '0 10px', border: '1px solid #e9d5f9', background: '#faf5ff', borderRadius: 8, cursor: 'pointer', boxSizing: 'border-box' } },
            h('input', { type: 'checkbox', checked: f.agrupar, onChange: function (e) { set({ agrupar: e.target.checked }); }, style: { accentColor: ROXO, width: 16, height: 16 } }), 'Agrupar CCs como no Gerencial')),
        periodoInvalido && h('p', { role: 'alert', style: { margin: 0, fontSize: 12, color: '#b91c1c', fontWeight: 600 } }, periodoInvalido),
        nFiltros > 0 && h('div', null, h('button', { type: 'button', onClick: function () { set({ clientes: [], ccs: [], veiculos: [], semana: '' }); }, style: { border: 0, background: 'none', color: ROXO, fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: 0 } }, 'Limpar filtros (' + nFiltros + ')'))),

      !dados && carregando && h(React.Fragment, null,
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 } }, [1, 2, 3, 4, 5, 6].map(function (i) { return h('div', { key: i }, bloco(96)); })),
        bloco(300), bloco(280)),

      !dados && !carregando && erro && h('div', { style: Object.assign({}, S.card, { alignItems: 'center', padding: 32, textAlign: 'center' }) },
        h('span', { style: { color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 } }, ico('alert', 16), 'Não foi possível carregar o BI Financeiro'),
        h('p', { style: { margin: 0, color: CINZA } }, erro),
        h('button', { type: 'button', onClick: function () { setRecarga(recarga + 1); }, style: S.btn }, ico('refresh', 14), 'Tentar de novo')),

      dados && vazio && h('div', { style: Object.assign({}, S.card, { alignItems: 'center', padding: 32, textAlign: 'center' }) },
        h('span', { style: { color: ROXO, display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, background: '#faf5ff' } }, ico('chart', 20)),
        h('h2', { style: S.h2 }, 'Sem entregas nesse período'),
        h('p', { style: { margin: 0, color: CINZA } }, 'Mude o período ou limpe os filtros. Os dados chegam com a importação do BI.'),
        nFiltros > 0 && h('button', { type: 'button', onClick: function () { set({ clientes: [], ccs: [], veiculos: [], semana: '' }); }, style: S.btn }, 'Limpar filtros')),

      dados && !vazio && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16, opacity: carregando ? 0.6 : 1, transition: 'opacity .15s' } },
        h(Kpis, { dados: dados }),
        h(PontosAtencao, { alertas: dados.alertas, total: dados.alertas_total, onCliente: verCliente, onFaixas: function () { verBloco('bifin-faixas'); }, onAbc: function () { verBloco('bifin-abc'); } }),
        dados.projecao && h(Projecao, { p: dados.projecao }),
        h(GraficoTicketDia, { dias: dados.dias, ideal: dados.params.ticket_ideal, teto: dados.params.teto_margem, animar: animar }),
        h(GraficoEntregasMeta, { dias: dados.dias, temMeta: dados.tem_meta, ideal: dados.params.ticket_ideal, teto: dados.params.teto_margem, animar: animar }),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16 } },
          h(GraficoSemanal, { semanas: dados.semanas }),
          h(GraficoOscilacao, { dias: dados.dias, animar: animar })),
        h(Evolucao, { meses: evo.meses, erro: evo.erro, teto: dados.params.teto_margem, animar: animar }),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16 } },
          h(GraficoMargem, { dias: dados.dias, teto: dados.params.teto_margem }),
          h(PorVeiculo, { veiculos: dados.veiculos, totalBruto: dados.totais.bruto, totalEntregas: dados.totais.entregas, teto: dados.params.teto_margem, selecionados: f.veiculos,
            onToggle: function (nome) { set({ veiculos: f.veiculos.indexOf(nome) >= 0 ? f.veiculos.filter(function (x) { return x !== nome; }) : f.veiculos.concat([nome]) }); } })),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16 } },
          h(QuemMudou, { m: dados.mudancas, periodo: dados.periodo && dados.periodo.anterior, onCliente: verCliente }),
          h(CurvaAbc, { abc: dados.abc, clientes: dados.clientes }),
          h(FaixasKm, { faixas: dados.faixas_km, teto: dados.params.teto_margem, animar: animar }),
          h(DiaSemana, { dias: dados.dias_semana, teto: dados.params.teto_margem })),
        h(TabelaClientes, { dados: dados, teto: dados.params.teto_margem, foco: foco })),

      modal && h(ModalConfig, { api: api, toast: toast, clientes: op.clientes, onFechar: function () { setModal(false); }, onSalvo: function () { setRecarga(function (n) { return n + 1; }); } }));
  }

  window.ModuloBiFinanceiroComponent = ModuloBiFinanceiro;
})();
