/**
 * modulo-bi-financeiro.js — BI_FINANCEIRO_V1
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

  // ── gráficos ────────────────────────────────────────────────────
  function rotulosDias(dias, larg) {
    var passo = dias.length > 45 ? 7 : 1;
    return h('div', { style: { minWidth: larg, display: 'flex', gap: dias.length > 45 ? 1 : 4, marginTop: 4 } },
      dias.map(function (d, i) {
        return h('span', { key: d.data, style: { flex: 1, textAlign: 'center', fontSize: 10, color: dow(d.data) === 0 ? '#b91c1c' : CINZA, whiteSpace: 'nowrap', overflow: 'visible' } }, i % passo === 0 ? (dias.length > 31 ? ddmm(d.data) : d.data.slice(8, 10)) : '');
      }));
  }

  function GraficoTicketDia(props) {
    var dias = props.dias, ideal = props.ideal;
    var comDado = dias.filter(function (d) { return d.entregas > 0; });
    var max = Math.max.apply(null, comDado.map(function (d) { return d.ticket; }).concat([ideal, 0.01])) * 1.12;
    var rot = dias.length <= 45; var larg = dias.length * (rot ? 28 : 8);
    return h('section', { style: S.card, 'aria-label': 'Ticket médio por dia' },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
        h('h2', { style: S.h2 }, 'Ticket médio por dia'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: CINZA } },
          h('span', { style: S.legenda }, h('span', { style: S.quad(ROXO) }), 'Ticket médio'),
          h('span', { style: S.legenda }, h('span', { style: { width: 14, borderTop: '2px dashed ' + LARANJA } }), 'Ticket ideal ' + brl(ideal)),
          h('span', { style: S.legenda }, h('span', { style: S.quad(LILAS) }), 'Abaixo do ideal'))),
      h('div', { style: { overflowX: 'auto' } },
        h('div', { style: { minWidth: larg, position: 'relative', height: 230, display: 'flex', alignItems: 'flex-end', gap: rot ? 4 : 1, borderBottom: '1px solid ' + BORDA } },
          h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: (ideal / max * 100).toFixed(1) + '%', borderTop: '2px dashed ' + LARANJA, pointerEvents: 'none' } }),
          dias.map(function (d) {
            var tem = d.entregas > 0;
            return h('div', { key: d.data, title: ddmm(d.data) + ': ' + (tem ? brl(d.ticket) + ' · ' + int(d.entregas) + ' entregas' : 'sem entregas'), style: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 3, minWidth: 0 } },
              tem && rot && h('span', { style: { fontSize: 10, fontWeight: 600, color: ROXO_ESC } }, dec(d.ticket)),
              tem && h('div', { style: { width: '100%', height: Math.max(0, d.ticket / max * 100).toFixed(1) + '%', background: d.ticket >= ideal ? ROXO : LILAS, borderRadius: '4px 4px 0 0' } }));
          })),
        rotulosDias(dias, larg)));
  }

  function GraficoEntregasMeta(props) {
    var dias = props.dias, temMeta = props.temMeta;
    var max = Math.max.apply(null, dias.map(function (d) { return Math.max(d.entregas, d.meta || 0); }).concat([1])) * 1.15;
    var rot = dias.length <= 45; var larg = dias.length * (rot ? 28 : 8);
    var somaMeta = 0, real = 0, bateu = 0, comMeta = 0;
    dias.forEach(function (d) { real += d.entregas; if (d.meta != null) { somaMeta += d.meta; if (d.meta > 0) { comMeta++; if (d.entregas >= d.meta) bateu++; } } });
    var resumo = temMeta
      ? 'Meta do período: ' + int(somaMeta) + ' · realizado ' + int(real) + (somaMeta ? ' (' + pct(real / somaMeta * 100) + ')' : '') + ' · bateu a meta em ' + bateu + ' de ' + comMeta + ' dias'
      : 'Sem meta cadastrada. Defina em Metas e parâmetros.';
    return h('section', { style: S.card, 'aria-label': 'Entregas x meta' },
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
            return h('div', { key: d.data, title: ddmm(d.data) + ': ' + int(d.entregas) + ' entregas' + (d.meta != null ? ' · meta ' + int(d.meta) : ''), style: { flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 3, minWidth: 0 } },
              d.entregas > 0 && rot && h('span', { style: { fontSize: 10, fontWeight: 600, color: ROXO_ESC } }, int(d.entregas)),
              d.entregas > 0 && h('div', { style: { width: '100%', height: (d.entregas / max * 100).toFixed(1) + '%', background: cor, borderRadius: '4px 4px 0 0' } }),
              temMeta && d.meta > 0 && h('div', { style: { position: 'absolute', left: -1, right: -1, bottom: (d.meta / max * 100).toFixed(1) + '%', borderTop: '3px solid ' + LARANJA } }));
          })),
        rotulosDias(dias, larg)));
  }

  function GraficoSemanal(props) {
    var sem = props.semanas || [];
    var vals = sem.filter(function (s) { return s.entregas > 0; }).map(function (s) { return s.ticket; });
    var mn = vals.length ? Math.min.apply(null, vals) : 0, mx = vals.length ? Math.max.apply(null, vals) : 1;
    if (mx - mn < 0.01) { mn -= 1; mx += 1; }
    var n = sem.length;
    var pts = sem.map(function (s, i) {
      return { s: s, x: n > 1 ? 3 + i * 94 / (n - 1) : 50, y: s.entregas > 0 ? 100 - ((s.ticket - mn) / (mx - mn) * 55 + 22) : null };
    });
    var linha = pts.filter(function (p) { return p.y != null; }).map(function (p) { return p.x.toFixed(2) + ',' + p.y.toFixed(2); }).join(' ');
    return h('section', { style: S.card, 'aria-label': 'Ticket médio semanal' },
      h('div', null, h('h2', { style: S.h2 }, 'Ticket médio semanal'), h('p', { style: S.sub }, 'Últimas 12 semanas até o fim do período (semana começa na segunda)')),
      h('div', { style: { overflowX: 'auto' } },
        h('div', { style: { minWidth: 460 } },
          h('div', { style: { position: 'relative', height: 190 } },
            h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' } },
              h('polyline', { points: linha, fill: 'none', stroke: ROXO, strokeWidth: 2, strokeDasharray: '1 3', strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' })),
            pts.filter(function (p) { return p.y != null; }).map(function (p) {
              return h('div', { key: p.s.inicio, title: 'Semana de ' + ddmm(p.s.inicio) + ': ' + brl(p.s.ticket) + ' · ' + int(p.s.entregas) + ' entregas', style: { position: 'absolute', left: p.x + '%', top: p.y + '%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 } },
                h('span', { style: { fontSize: 10, fontWeight: 700, color: '#fff', background: ROXO_E, borderRadius: 5, padding: '1px 5px', marginTop: -22, whiteSpace: 'nowrap' } }, dec(p.s.ticket)),
                h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: ROXO, border: '2px solid #fff' } }));
            })),
          h('div', { style: { position: 'relative', height: 16 } },
            pts.map(function (p) { return h('span', { key: p.s.inicio, style: { position: 'absolute', left: p.x + '%', transform: 'translateX(-50%)', fontSize: 10, color: CINZA, whiteSpace: 'nowrap' } }, ddmm(p.s.inicio)); })))));
  }

  function GraficoOscilacao(props) {
    var dias = (props.dias || []).filter(function (d) { return d.entregas > 0; });
    var osc = [];
    for (var i = 1; i < dias.length; i++) osc.push({ data: dias[i].data, d: dias[i].ticket - dias[i - 1].ticket });
    var maxAbs = Math.max.apply(null, osc.map(function (o) { return Math.abs(o.d); }).concat([0.01]));
    var larg = Math.max(460, osc.length * 18);
    var mostra = osc.length <= 45;
    return h('section', { style: S.card, 'aria-label': 'Oscilação do ticket médio' },
      h('div', null, h('h2', { style: S.h2 }, 'Oscilação do ticket médio'), h('p', { style: S.sub }, 'Variação em R$ contra o dia anterior com entregas')),
      osc.length === 0 ? h('p', { style: { margin: 0, color: CINZA, fontSize: 12, padding: '30px 0', textAlign: 'center' } }, 'Precisa de pelo menos 2 dias com entregas.') :
      h('div', { style: { overflowX: 'auto' } },
        h('div', { style: { minWidth: larg } },
          h('div', { style: { height: 190, display: 'flex', gap: 3, position: 'relative' } },
            h('div', { style: { position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px solid #d1d5db' } }),
            osc.map(function (o) {
              var pos = o.d > 0 ? (o.d / maxAbs * 82).toFixed(1) : 0, neg = o.d < 0 ? (-o.d / maxAbs * 82).toFixed(1) : 0;
              return h('div', { key: o.data, title: ddmm(o.data) + ': ' + (o.d >= 0 ? '+' : '−') + brl(Math.abs(o.d)), style: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 } },
                h('div', { style: { height: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' } },
                  mostra && o.d > 0.3 && h('span', { style: { fontSize: 9, color: '#15803d', fontWeight: 600 } }, '+' + dec(o.d)),
                  h('div', { style: { width: '100%', height: pos + '%', background: '#16a34a', borderRadius: '3px 3px 0 0' } })),
                h('div', { style: { height: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' } },
                  h('div', { style: { width: '100%', height: neg + '%', background: '#dc2626', borderRadius: '0 0 3px 3px' } }),
                  mostra && o.d < -0.3 && h('span', { style: { fontSize: 9, color: '#b91c1c', fontWeight: 600 } }, '−' + dec(-o.d))));
            })),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: CINZA, marginTop: 4 } },
            h('span', null, ddmm(osc[0].data)), osc.length > 2 && h('span', null, ddmm(osc[Math.floor(osc.length / 2)].data)), h('span', null, ddmm(osc[osc.length - 1].data))))));
  }

  function GraficoMargem(props) {
    var dias = (props.dias || []).filter(function (d) { return d.bruto > 0; });
    var teto = props.teto;
    var vals = dias.map(function (d) { return d.margem; }).concat([teto]);
    var mn = Math.floor(Math.min.apply(null, vals) - 3), mx = Math.ceil(Math.max.apply(null, vals) + 3);
    var y = function (v) { return 100 - ((v - mn) / (mx - mn) * 84 + 8); };
    var n = dias.length;
    var pts = dias.map(function (d, i) { return { d: d, x: n > 1 ? 1 + i * 98 / (n - 1) : 50, y: y(d.margem) }; });
    var acima = dias.filter(function (d) { return d.margem >= teto; }).length;
    return h('section', { style: S.card, 'aria-label': 'Margem de repasse por dia' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 } },
        h('div', null, h('h2', { style: S.h2 }, 'Margem de repasse por dia'), h('p', { style: S.sub }, '(repasse + mín. garantido) ÷ bruto · quanto menor, melhor')),
        h('span', { style: Object.assign({}, S.legenda, { fontSize: 12, color: CINZA, whiteSpace: 'nowrap' }) }, h('span', { style: { width: 14, borderTop: '2px dashed ' + LARANJA } }), 'Teto ' + pct(teto))),
      n === 0 ? h('p', { style: { margin: 0, color: CINZA, fontSize: 12, padding: '30px 0', textAlign: 'center' } }, 'Sem faturamento no período.') :
      h(React.Fragment, null,
        h('div', { style: { position: 'relative', height: 190 } },
          h('div', { style: { position: 'absolute', left: 0, right: 0, top: y(teto).toFixed(2) + '%', borderTop: '2px dashed ' + LARANJA } }),
          h('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true', style: { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' } },
            h('polyline', { points: pts.map(function (p) { return p.x.toFixed(2) + ',' + p.y.toFixed(2); }).join(' '), fill: 'none', stroke: ROXO, strokeWidth: 2, strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' })),
          pts.map(function (p) {
            return h('span', { key: p.d.data, title: ddmm(p.d.data) + ': ' + pct(p.d.margem), style: { position: 'absolute', left: p.x + '%', top: p.y + '%', width: 7, height: 7, margin: '-3.5px 0 0 -3.5px', borderRadius: '50%', background: p.d.margem >= teto ? '#d97706' : ROXO } });
          })),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: CINZA } },
          h('span', null, ddmm(dias[0].data)), n > 2 && h('span', null, ddmm(dias[Math.floor(n / 2)].data)), h('span', null, ddmm(dias[n - 1].data))),
        h('p', { style: { margin: 0, fontSize: 12, color: '#374151' } }, acima ? acima + ' dia(s) acima do teto no período.' : 'Nenhum dia acima do teto no período.')));
  }

  function PorVeiculo(props) {
    var vs = props.veiculos || []; var tot = props.totalBruto || 0;
    var maxB = Math.max.apply(null, vs.map(function (v) { return v.bruto; }).concat([0.01]));
    return h('section', { style: Object.assign({}, S.card, { gap: 12 }), 'aria-label': 'Por veículo' },
      h('div', null, h('h2', { style: S.h2 }, 'Por veículo'), h('p', { style: S.sub }, 'Participação no valor bruto do período')),
      vs.length === 0 && h('p', { style: { margin: 0, color: CINZA, fontSize: 12 } }, 'Sem dados no período.'),
      vs.map(function (v) {
        return h('div', { key: v.nome, style: { display: 'flex', flexDirection: 'column', gap: 5 } },
          h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, fontSize: 12 } },
            h('span', { style: { fontWeight: 600, color: '#111827' } }, v.nome),
            h('span', { style: { color: CINZA } }, int(v.entregas) + ' entregas · ticket ', h('b', { style: { color: '#111827' } }, brl(v.ticket)), ' · margem ', h('b', { style: { color: '#111827' } }, pct(v.margem)))),
          h('div', { style: { height: 10, background: '#f3e8fb', borderRadius: 99, overflow: 'hidden' } }, h('div', { style: { height: '100%', width: (v.bruto / maxB * 100).toFixed(1) + '%', background: ROXO, borderRadius: 99 } })),
          h('span', { style: { fontSize: 11, color: CINZA } }, brl(v.bruto) + ' · ' + pct(tot ? v.bruto / tot * 100 : 0) + ' do bruto'));
      }));
  }

  // ── tabela por cliente ──────────────────────────────────────────
  var COLS = 'minmax(330px,2.8fr) repeat(8,minmax(112px,1fr))';
  function mgStyle(m, teto) {
    return m >= teto ? { fontWeight: 700, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '1px 6px' } : { color: '#111827' };
  }
  function celulas(x, totEnt, teto, pad) {
    var c = function (txt, st) { return h('span', { role: 'cell', style: Object.assign({ padding: pad, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }, st || {}) }, txt); };
    return [
      c(int(x.entregas), { key: 'e' }), c(pct(totEnt ? x.entregas / totEnt * 100 : 0), { key: 'p', color: CINZA }),
      c(brl(x.bruto), { key: 'b' }), c(brl(x.repasse), { key: 'r' }), c(x.garantido ? brl(x.garantido) : '—', { key: 'g', color: CINZA }),
      c(brl(x.liquido), { key: 'l', fontWeight: 600, color: x.liquido < 0 ? '#b91c1c' : '#111827' }), c(brl(x.ticket), { key: 't' }),
      h('span', { key: 'm', role: 'cell', style: { padding: pad, textAlign: 'right' } }, h('span', { style: mgStyle(x.margem, teto) }, pct(x.margem)))
    ].map(function (el, i) { return React.cloneElement(el, { key: i }); });
  }

  var ORDENS = [['bruto', 'Maior bruto'], ['entregas', 'Mais entregas'], ['margem_asc', 'Menor margem'], ['margem_desc', 'Maior margem'], ['liquido', 'Maior líquido'], ['liquido_asc', 'Menor líquido']];

  function TabelaClientes(props) {
    var dados = props.dados, teto = props.teto;
    var _a = useState(''), busca = _a[0], setBusca = _a[1];
    var _b = useState('bruto'), ordem = _b[0], setOrdem = _b[1];
    var _c = useState({}), abertos = _c[0], setAbertos = _c[1];
    var totEnt = dados.totais.entregas;
    var lista = useMemo(function () {
      var b = busca.trim().toLowerCase();
      var l = dados.clientes.filter(function (c) { return !b || c.cod.indexOf(b) >= 0 || String(c.nome).toLowerCase().indexOf(b) >= 0; });
      var f = { bruto: function (a, z) { return z.bruto - a.bruto; }, entregas: function (a, z) { return z.entregas - a.entregas; },
        margem_asc: function (a, z) { return a.margem - z.margem; }, margem_desc: function (a, z) { return z.margem - a.margem; },
        liquido: function (a, z) { return z.liquido - a.liquido; }, liquido_asc: function (a, z) { return a.liquido - z.liquido; } }[ordem];
      return l.slice().sort(f);
    }, [dados, busca, ordem]);
    function estaAberto(c) { return abertos[c.cod] !== undefined ? abertos[c.cod] : c.agrupamento === 'separado'; }
    var t = dados.totais;
    return h('section', { style: Object.assign({}, S.card, { gap: 12 }), 'aria-label': 'Resumo por cliente' },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 } },
        h('div', null, h('h2', { style: S.h2 }, 'Resumo por cliente'), h('p', { style: S.sub }, 'Nome com a máscara do BI · abra o cliente para ver os centros de custo')),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, border: '1px solid ' + BORDA, borderRadius: 8, padding: '0 10px', color: CINZA, background: '#fff' } },
            ico('search', 14), h('input', { type: 'text', value: busca, onChange: function (e) { setBusca(e.target.value); }, placeholder: 'Código ou nome', 'aria-label': 'Buscar cliente', style: { border: 0, outline: 0, fontSize: 13, width: 150, fontFamily: 'inherit' } })),
          h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: CINZA } }, 'Ordenar',
            h('select', { value: ordem, onChange: function (e) { setOrdem(e.target.value); }, style: Object.assign({}, S.inp, { height: 36, width: 'auto' }) },
              ORDENS.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); }))))),
      h('div', { style: { overflowX: 'auto', border: '1px solid #f3f4f6', borderRadius: 10 } },
        h('div', { role: 'table', 'aria-label': 'Resumo por cliente', style: { minWidth: 1240, fontSize: 13 } },
          h('div', { role: 'row', style: { display: 'grid', gridTemplateColumns: COLS, background: '#faf5ff', borderBottom: '1px solid #e9d5f9', fontSize: 11, fontWeight: 700, color: ROXO_E, textTransform: 'uppercase', letterSpacing: '.03em' } },
            ['Cliente', 'Entregas', '% entregas', 'Valor bruto', 'Repasse', 'Mín. garantido', 'Líquido', 'Ticket médio', 'Margem'].map(function (c, i) {
              return h('span', { key: c, role: 'columnheader', style: { padding: '10px 12px', textAlign: i ? 'right' : 'left' } }, c);
            })),
          lista.length === 0 && h('div', { style: { padding: 24, textAlign: 'center', color: CINZA } }, 'Nenhum cliente encontrado.'),
          lista.map(function (c) {
            var temCc = c.ccs && c.ccs.length > 0; var ab = temCc && estaAberto(c);
            var chip = c.agrupamento === 'consolidado' ? h('span', { style: { fontSize: 10, fontWeight: 600, color: CINZA, background: '#f3f4f6', borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap', flex: 'none' } }, 'CCs consolidados')
              : c.agrupamento === 'separado' ? h('span', { style: { fontSize: 10, fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap', flex: 'none' } }, 'CC separado') : null;
            return h(React.Fragment, { key: c.cod },
              h('div', { role: 'row', style: { display: 'grid', gridTemplateColumns: COLS, borderBottom: '1px solid #f3f4f6', alignItems: 'center', background: c.liquido < 0 ? '#fef2f2' : '#fff' } },
                h('span', { role: 'cell', style: { padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } },
                  temCc ? h('button', { type: 'button', onClick: function () { var n = {}; n[c.cod] = !ab; setAbertos(Object.assign({}, abertos, n)); }, 'aria-expanded': ab, 'aria-label': (ab ? 'Fechar' : 'Abrir') + ' centros de custo de ' + c.nome,
                    style: { width: 28, height: 28, flex: 'none', border: '1px solid ' + BORDA, borderRadius: 7, background: '#fff', color: ROXO_E, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 } }, chevron(ab))
                    : h('span', { style: { width: 28, flex: 'none' } }),
                  h('span', { style: { fontSize: 11, fontWeight: 700, color: ROXO_E, background: '#f3e8fb', borderRadius: 6, padding: '2px 6px', flex: 'none' } }, c.cod),
                  h('span', { title: c.nome, style: { fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, c.nome),
                  chip),
                celulas(c, totEnt, teto, '10px 12px')),
              ab && c.ccs.map(function (cc) {
                return h('div', { key: c.cod + '|' + cc.nome, role: 'row', style: { display: 'grid', gridTemplateColumns: COLS, borderBottom: '1px solid #f3f4f6', alignItems: 'center', background: '#fcfaff', fontSize: 12, color: '#374151' } },
                  h('span', { role: 'cell', style: { padding: '8px 12px 8px 82px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } },
                    h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: '#c4a5e0', flex: 'none' } }),
                    h('span', { style: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, title: cc.nome }, cc.nome)),
                  celulas(cc, totEnt, teto, '8px 12px'));
              }));
          }),
          h('div', { role: 'row', style: { display: 'grid', gridTemplateColumns: COLS, background: ROXO_ESC, color: '#fff', fontWeight: 700 } },
            h('span', { role: 'cell', style: { padding: '12px 12px 12px 48px' } }, 'Total · ' + dados.clientes.length + ' clientes'),
            [int(t.entregas), '100,0%', brl(t.bruto), brl(t.repasse), brl(t.garantido), brl(t.liquido), brl(t.ticket), pct(t.margem)].map(function (v, i) {
              return h('span', { key: i, role: 'cell', style: { padding: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } }, v);
            })))),
      h('p', { style: { margin: 0, fontSize: 12, color: CINZA } }, 'Linha em vermelho: o cliente não cobre repasse + mínimo garantido no período. Margem com fundo âmbar passou do teto (' + pct(teto) + ').'));
  }

  // ── KPIs ────────────────────────────────────────────────────────
  function Kpis(props) {
    var t = props.dados.totais, a = props.dados.anterior, gAp = props.dados.garantido_aplicado;
    function var_(at, an) { return an ? (at - an) / Math.abs(an) * 100 : null; }
    function chip(v, bomSeSobe, pp) {
      if (v === null || !isFinite(v)) return null;
      var sobe = v > 0.05, desce = v < -0.05;
      var bom = (sobe && bomSeSobe) || (desce && !bomSeSobe);
      var txt = (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (pp ? ' p.p.' : '%');
      var cor = !sobe && !desce ? { color: CINZA, background: '#f3f4f6' } : bom ? { color: '#15803d', background: '#f0fdf4' } : { color: '#b91c1c', background: '#fef2f2' };
      return h('span', { title: 'Comparado ao período anterior', style: Object.assign({ fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '2px 7px', whiteSpace: 'nowrap' }, cor) }, txt);
    }
    var cards = [
      { l: 'Entregas', v: int(t.entregas), s: 'pontos de entrega (coleta não conta)', d: chip(var_(t.entregas, a.entregas), true) },
      { l: 'Valor bruto', v: brl(t.bruto), s: 'cobrado dos clientes', d: chip(var_(t.bruto, a.bruto), true) },
      { l: 'Valor repasse', v: brl(t.repasse), s: gAp ? 'Mín. garantido: ' + brl(t.garantido) : 'garantido não entra com filtro de CC/veículo', d: chip(var_(t.repasse, a.repasse), false) },
      { l: 'Líquido', v: brl(t.liquido), s: 'bruto − repasse − mín. garantido', d: chip(var_(t.liquido, a.liquido), true) },
      { l: 'Ticket médio', v: brl(t.ticket), s: '(bruto − repasse) ÷ entregas', d: chip(var_(t.ticket, a.ticket), true) },
      { l: 'Margem de repasse', v: pct(t.margem), s: '(repasse + garantido) ÷ bruto', d: a.bruto ? chip(t.margem - a.margem, false, true) : null },
    ];
    return h('section', { 'aria-label': 'Indicadores', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 } },
      cards.map(function (c) {
        return h('div', { key: c.l, style: { background: '#fff', border: '1px solid ' + BORDA, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } }, h('span', { style: { fontSize: 12, fontWeight: 600, color: CINZA } }, c.l), c.d),
          h('span', { style: { fontFamily: 'Sora,Inter,sans-serif', fontSize: 'clamp(17px, 4.4vw, 22px)', fontWeight: 700, color: c.l === 'Líquido' && t.liquido < 0 ? '#b91c1c' : ROXO_ESC, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, c.v),
          h('span', { style: { fontSize: 11, color: CINZA } }, c.s));
      }));
  }

  // ── modal Metas e parâmetros ────────────────────────────────────
  function ModalConfig(props) {
    var api = props.api, toast = props.toast, clientesOp = props.clientes || [];
    var _a = useState(null), cfg = _a[0], setCfg = _a[1];
    var _b = useState({ seg_sex: '', sabado: '', domingo: '', vigente_desde: '' }), geral = _b[0], setGeral = _b[1];
    var _c = useState({ ticket: '', teto: '' }), ref_ = _c[0], setRef = _c[1];
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
      setRef({ ticket: dec(j.params.ticket_ideal), teto: Number(j.params.teto_margem).toLocaleString(L, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) });
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
      var gv = [num(geral.seg_sex), num(geral.sabado), num(geral.domingo)];
      var temGeral = gv.some(function (v) { return v !== null; });
      if (temGeral && gv.some(function (v) { return v === null || v < 0; })) { setErro('Preencha a meta geral de seg a sex, sábado e domingo (pode ser 0).'); return; }
      setSalvando(true);
      var ps = [api('/params', { method: 'PUT', body: { ticket_ideal: ti, teto_margem: tm } })];
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
                h('label', { style: S.lbl }, 'Teto da margem de repasse (%)', h('input', { type: 'text', inputMode: 'decimal', value: ref_.teto, onChange: function (e) { setRef(Object.assign({}, ref_, { teto: e.target.value })); }, style: S.inp }), h('span', { style: { fontWeight: 400, color: CINZA } }, 'Acima disso a margem fica em âmbar')))),
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
    var cab = ['Código', 'Cliente', 'Centro de custo', 'Agrupamento', 'Entregas', '% entregas', 'Valor bruto', 'Repasse', 'Mín. garantido', 'Líquido', 'Ticket médio', 'Margem %'];
    var tot = dados.totais.entregas || 0;
    var ag = { consolidado: 'CCs consolidados', separado: 'CC separado', padrao: '' };
    var linhas = [];
    var r2 = function (v) { return Math.round(Number(v || 0) * 100) / 100; };
    dados.clientes.forEach(function (c) {
      linhas.push([c.cod, c.nome, '', ag[c.agrupamento] || '', c.entregas, r2(tot ? c.entregas / tot * 100 : 0), r2(c.bruto), r2(c.repasse), r2(c.garantido), r2(c.liquido), r2(c.ticket), r2(c.margem)]);
      (c.ccs || []).forEach(function (cc) { linhas.push([c.cod, c.nome, cc.nome, '', cc.entregas, r2(tot ? cc.entregas / tot * 100 : 0), r2(cc.bruto), r2(cc.repasse), r2(cc.garantido), r2(cc.liquido), r2(cc.ticket), r2(cc.margem)]); });
    });
    var t = dados.totais;
    linhas.push(['', 'TOTAL', '', '', t.entregas, 100, r2(t.bruto), r2(t.repasse), r2(t.garantido), r2(t.liquido), r2(t.ticket), r2(t.margem)]);
    var nome = 'bi-financeiro_' + f.ini + '_a_' + f.fim;
    try {
      if (window.XLSX && window.XLSX.utils) {
        var ws = window.XLSX.utils.aoa_to_sheet([cab].concat(linhas));
        ws['!cols'] = [8, 34, 26, 16, 10, 10, 14, 14, 14, 14, 12, 10].map(function (w) { return { wch: w }; });
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
        h(GraficoTicketDia, { dias: dados.dias, ideal: dados.params.ticket_ideal }),
        h(GraficoEntregasMeta, { dias: dados.dias, temMeta: dados.tem_meta }),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 16 } },
          h(GraficoSemanal, { semanas: dados.semanas }),
          h(GraficoOscilacao, { dias: dados.dias }),
          h(GraficoMargem, { dias: dados.dias, teto: dados.params.teto_margem }),
          h(PorVeiculo, { veiculos: dados.veiculos, totalBruto: dados.totais.bruto })),
        h(TabelaClientes, { dados: dados, teto: dados.params.teto_margem })),

      modal && h(ModalConfig, { api: api, toast: toast, clientes: op.clientes, onFechar: function () { setModal(false); }, onSalvo: function () { setRecarga(function (n) { return n + 1; }); } }));
  }

  window.ModuloBiFinanceiroComponent = ModuloBiFinanceiro;
})();
