/* RH_NPS_V1: módulo RH (Central) — Painel NPS, Líderes e equipe, Espaço sensível e Configuração.
   Contrato de API: /api/rh/* (ver tutts-backend src/modules/rh). Padrão clean (Sora títulos, cards
   brancos borda #e5e7eb, roxo #770fa8, laranja #f67602 só como destaque). */
(function () {
  'use strict';
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useCallback = React.useCallback, useMemo = React.useMemo;

  // ───────────────────────── tokens / helpers ─────────────────────────
  var SORA = 'Sora, Inter, sans-serif';
  var ROXO = '#770fa8', ROXO_ESC = '#5d0b85', ROXO_FUNDO = '#3a1556', LILAS = '#f3e8fb', LILAS_BORDA = '#d8c3ea', LILAS_FUNDO = '#faf5ff', LARANJA = '#f67602';
  var BORDA = '#e5e7eb', BORDA2 = '#f3f4f6', CINZA = '#6b7280', CINZA2 = '#4b5563', TEXTO = '#111827', TEXTO2 = '#374151';
  var TAB = { fontVariantNumeric: 'tabular-nums' };
  var ABAS = [['nps', 'Painel NPS', 'chart'], ['pessoas', 'Líderes e equipe', 'users'], ['sensivel', 'Espaço sensível', 'shield'], ['config', 'Configuração', 'settings']];
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var SIT = { aberto: ['Aberto', 'verde'], agendado: ['Agendado', 'azul'], encerrado: ['Encerrado', 'cinza'], prazo: ['Prazo encerrado', 'ambar'] };
  var TIPOS = [['grupo', 'Grupo'], ['nota10', 'Nota 0–10'], ['multipla', 'Várias opções'], ['unica', 'Uma opção'], ['texto', 'Texto'], ['pessoas', 'Pessoas'], ['sensivel', 'Sensível']];
  var TIPO_ROT = {}; TIPOS.forEach(function (t) { TIPO_ROT[t[0]] = t[1]; });
  var AVAL = [['lider', 'Líder'], ['equipe', 'Equipe'], ['setor', 'Setor'], ['nao', 'Não avaliado']];

  function ico(nome, size, extra) {
    return h('svg', { className: 'ico', style: Object.assign({ width: size || 16, height: size || 16, flex: 'none' }, extra || {}), 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fD(s) { if (!s) return '—'; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s); }
  function fDH(s) { if (!s) return ''; var d = new Date(s); return isNaN(d) ? '' : p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + ' às ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function sinal(n) { return n == null ? '—' : (n > 0 ? '+' : '') + n; }
  function iniciais(nome) { var p = String(nome || '').trim().split(/\s+/); return (((p[0] || '')[0] || '') + ((p.length > 1 ? p[p.length - 1][0] : '') || '')).toUpperCase(); }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function copiar(txt, toast, msg) {
    var ok = function () { toast && toast(msg || 'Copiado', 'success'); };
    try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(txt).then(ok, fallback); return; } } catch (e) { /* segue */ }
    fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast && toast('Não deu para copiar. Selecione e copie à mão.', 'error'); }
      document.body.removeChild(ta);
    }
  }
  function linkNps(c) { return (window.location && window.location.origin ? window.location.origin : 'https://www.centraltutts.online') + '/nps/' + c.token; }

  // estilos globais pequenos (hover das barras, foco)
  if (typeof document !== 'undefined' && !document.getElementById('rh-estilos')) {
    var st = document.createElement('style'); st.id = 'rh-estilos';
    st.textContent = '.rh-bar{transition:filter .15s ease,opacity .15s ease}.rh-bar:hover{filter:brightness(1.12)}' +
      '.rh-linha:hover{background:#faf5ff}.rh-btn:focus-visible,.rh-tab:focus-visible{outline:2px solid #770fa8;outline-offset:2px}' +
      '.rh-btn-sec:hover{background:#f9fafb}.rh-btn-pri:hover{background:#5d0b85}' +
      '@keyframes rhspin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion: reduce){.rh-bar{transition:none}}';
    document.head.appendChild(st);
  }

  var TONS = { verde: ['#ecfdf5', '#065f46'], ambar: ['#fffbeb', '#92400e'], vermelho: ['#fef2f2', '#991b1b'], azul: ['#eff6ff', '#1e40af'], roxo: [LILAS, ROXO_ESC], cinza: ['#f3f4f6', TEXTO2], laranja: ['#fff7ed', '#9a3412'] };
  function Pill(txt, tom, extra) {
    var T = TONS[tom] || TONS.cinza;
    return h('span', { style: Object.assign({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', background: T[0], color: T[1] }, extra || {}) }, txt);
  }
  function Btn(p) {
    var v = p.variant || 'sec';
    var base = { height: p.small ? 34 : 40, padding: p.small ? '0 11px' : '0 14px', borderRadius: 10, fontWeight: 600, fontSize: p.small ? 12.5 : 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
      cursor: p.disabled ? 'not-allowed' : 'pointer', opacity: p.disabled ? 0.55 : 1, border: '1px solid transparent', fontFamily: 'inherit' };
    var s = { pri: { background: ROXO, color: '#fff' }, sec: { background: '#fff', color: TEXTO2, borderColor: BORDA }, perigo: { background: '#fff', color: '#991b1b', borderColor: '#fecaca' },
      claro: { background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.35)' }, link: { background: 'transparent', color: ROXO, height: 'auto', padding: 0 } }[v];
    return h('button', { key: p.key, type: p.type || 'button', onClick: p.disabled ? null : p.onClick, disabled: p.disabled, title: p.title || null, 'aria-label': p.ariaLabel || null,
      className: 'rh-btn ' + (v === 'pri' ? 'rh-btn-pri' : v === 'sec' ? 'rh-btn-sec' : ''), style: Object.assign(base, s, p.style || {}) },
      p.loading ? h('span', { 'aria-hidden': 'true', style: { width: 14, height: 14, borderRadius: 99, border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'rhspin .8s linear infinite' } }) : (p.icon ? ico(p.icon, p.small ? 14 : 15) : null),
      p.children);
  }
  var CARD = { background: '#fff', border: '1px solid ' + BORDA, borderRadius: 16 };
  function Card(p) {
    return h('section', { 'aria-label': p.label || null, style: Object.assign({}, CARD, { padding: p.pad == null ? '18px 20px' : p.pad, display: 'flex', flexDirection: 'column', gap: p.gap == null ? 12 : p.gap, minWidth: 0 }, p.style || {}) }, p.children);
  }
  function Titulo(txt, sub, direita) {
    return h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 } },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
        h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 700, color: TEXTO } }, txt),
        sub ? h('span', { style: { fontSize: 12, color: CINZA } }, sub) : null),
      direita || null);
  }
  function Carregando(txt) {
    return h('div', { role: 'status', style: { padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: CINZA } },
      h('span', { 'aria-hidden': 'true', style: { width: 18, height: 18, borderRadius: 99, border: '2px solid #e9d5f9', borderTopColor: ROXO, animation: 'rhspin .8s linear infinite' } }), txt || 'Carregando…');
  }
  function Vazio(icone, titulo, txt, acao) {
    return h('div', { style: Object.assign({}, CARD, { padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }) },
      h('span', { style: { width: 48, height: 48, borderRadius: 14, background: LILAS, color: ROXO_ESC, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, ico(icone, 22)),
      h('b', { style: { fontSize: 15 } }, titulo),
      txt ? h('span', { style: { color: CINZA, maxWidth: 460, lineHeight: 1.5 } }, txt) : null,
      acao || null);
  }
  function Erro(msg, tentar) {
    return h('div', { role: 'alert', style: Object.assign({}, CARD, { padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', borderColor: '#fecaca', flexWrap: 'wrap' }) },
      ico('alert', 20, { color: '#991b1b' }),
      h('div', { style: { flex: 1, minWidth: 200 } }, h('b', null, 'Não deu para carregar'), h('div', { style: { fontSize: 12.5, color: CINZA2 } }, msg)),
      tentar ? Btn({ variant: 'pri', icon: 'refresh', onClick: tentar, children: 'Tentar de novo' }) : null);
  }

  // Modal/slide-over simples
  function Modal(p) {
    useEffect(function () {
      var esc = function (e) { if (e.key === 'Escape' && p.onClose) p.onClose(); };
      document.addEventListener('keydown', esc);
      return function () { document.removeEventListener('keydown', esc); };
    }, []);
    return h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': p.titulo, style: { position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '5vh 12px', background: 'rgba(17,24,39,.45)', overflowY: 'auto' },
      onMouseDown: function (e) { if (e.target === e.currentTarget && p.onClose) p.onClose(); } },
      h('div', { style: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: p.largura || 560, boxShadow: '0 24px 60px rgba(17,24,39,.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' } },
        h('div', { style: { padding: '16px 20px', borderBottom: '1px solid ' + BORDA2, display: 'flex', alignItems: 'flex-start', gap: 12 } },
          h('div', { style: { flex: 1, minWidth: 0 } }, h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 17 } }, p.titulo), p.sub ? h('div', { style: { fontSize: 12.5, color: CINZA, marginTop: 3 } }, p.sub) : null),
          h('button', { type: 'button', 'aria-label': 'Fechar', onClick: p.onClose, className: 'rh-btn', style: { width: 36, height: 36, borderRadius: 9, border: '1px solid ' + BORDA, background: '#fff', color: TEXTO2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' } }, ico('x', 16))),
        h('div', { style: { padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 } }, p.children),
        p.rodape ? h('div', { style: { padding: '12px 20px', borderTop: '1px solid ' + BORDA2, display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' } }, p.rodape) : null));
  }

  // Campo com label visível
  function Campo(label, ctrl, ajuda) {
    return h('label', { style: { display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, fontSize: 12, fontWeight: 600, color: TEXTO2 } }, label, ctrl,
      ajuda ? h('span', { style: { fontSize: 11.5, fontWeight: 400, color: CINZA } }, ajuda) : null);
  }
  var INP = { height: 40, border: '1px solid ' + BORDA, borderRadius: 10, padding: '0 11px', fontSize: 13.5, fontFamily: 'inherit', background: '#fff', color: TEXTO, width: '100%', boxSizing: 'border-box', minWidth: 0 };
  function Inp(p) { return h('input', Object.assign({}, p, { style: Object.assign({}, INP, p.style || {}) })); }
  function Sel(p, opcoes) { return h('select', Object.assign({}, p, { style: Object.assign({}, INP, { paddingRight: 6 }, p.style || {}) }), opcoes.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })); }

  // ───────────────────────── tooltip das barras ─────────────────────────
  var TipCtx = React.createContext(null);
  function TipProvider(p) {
    var s = useState(null), tip = s[0], setTip = s[1];
    var api = useMemo(function () {
      return function (txt) {
        return {
          onMouseEnter: function (e) { setTip({ txt: txt, x: e.clientX, y: e.clientY }); },
          onMouseMove: function (e) { setTip({ txt: txt, x: e.clientX, y: e.clientY }); },
          onMouseLeave: function () { setTip(null); },
          onFocus: function (e) { var r = e.currentTarget.getBoundingClientRect(); setTip({ txt: txt, x: r.left + r.width / 2, y: r.top }); },
          onBlur: function () { setTip(null); },
          tabIndex: 0, 'aria-label': txt
        };
      };
    }, []);
    return h(TipCtx.Provider, { value: api }, p.children,
      tip ? h('div', { role: 'tooltip', style: { position: 'fixed', left: Math.min(tip.x + 12, (window.innerWidth || 800) - 230), top: Math.max(8, tip.y - 44), zIndex: 90, maxWidth: 220, pointerEvents: 'none',
        background: '#111827', color: '#fff', fontSize: 12, fontWeight: 500, lineHeight: 1.4, padding: '7px 10px', borderRadius: 8, boxShadow: '0 8px 20px rgba(0,0,0,.18)' } }, tip.txt) : null);
  }
  function useTip() { return React.useContext(TipCtx) || function () { return {}; }; }

  // ───────────────────────── gráficos ─────────────────────────
  function BarrasH(p) {
    var tip = useTip();
    var itens = p.itens.slice();
    if (p.ordenar !== false) itens.sort(function (a, b) { return b.n - a.n; });
    var max = Math.max.apply(null, [1].concat(itens.map(function (i) { return i.n; })));
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      itens.map(function (it, i) {
        var pct = Math.round((it.n / max) * 100);
        return h('div', { key: it.id || i, style: { display: 'grid', gridTemplateColumns: 'minmax(90px, 38%) 1fr 64px', gap: 10, alignItems: 'center' } },
          h('span', { style: { fontSize: 13, color: TEXTO2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: it.label }, it.label),
          h('div', { style: { height: 12, borderRadius: 99, background: BORDA2, overflow: 'hidden' } },
            h('div', Object.assign({ className: 'rh-bar', style: { width: Math.max(it.n ? 3 : 0, pct) + '%', height: '100%', borderRadius: 99, background: p.cor || ROXO, cursor: 'default', outline: 'none' } },
              tip(it.label + ': ' + plural(it.n, 'pessoa', 'pessoas') + (it.pct != null ? ' (' + it.pct + '%)' : ''))))),
          h('span', { style: Object.assign({ textAlign: 'right', fontSize: 12.5 }, TAB) }, h('b', null, it.n), it.pct != null ? h('span', { style: { color: CINZA } }, ' · ' + it.pct + '%') : null));
      }));
  }
  var CORES_ESCALA = { 2: ['#fbbf8a', ROXO], 3: [LARANJA, '#e5e7eb', ROXO], 4: [LARANJA, '#fbbf8a', '#c4a5e0', ROXO], 5: [LARANJA, '#fbbf8a', '#e5e7eb', '#c4a5e0', ROXO] };
  var TXT_ESCALA = { '#f67602': '#fff', '#fbbf8a': '#4a1d00', '#e5e7eb': TEXTO2, '#c4a5e0': '#2e0a42', '#770fa8': '#fff' };
  function coresEscala(n) { if (CORES_ESCALA[n]) return CORES_ESCALA[n]; var out = []; for (var i = 0; i < n; i++) out.push(i < n / 2 ? '#fbbf8a' : ROXO); return out; }
  function Empilhada(p) {
    var tip = useTip();
    var cores = coresEscala(p.opcoes.length);
    var total = p.opcoes.reduce(function (a, o) { return a + o.n; }, 0) || 1;
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      h('div', { style: { display: 'flex', height: 26, borderRadius: 8, overflow: 'hidden', gap: 2, background: BORDA2 } },
        p.opcoes.map(function (o, i) {
          if (!o.n) return null;
          return h('div', Object.assign({ key: o.id, className: 'rh-bar', style: { flex: o.n, background: cores[i], color: TXT_ESCALA[cores[i]] || '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minWidth: 0, outline: 'none' } },
            tip(o.label + ': ' + plural(o.n, 'resposta', 'respostas') + ' (' + o.pct + '%)')), Math.round(o.n / total * 100) >= 8 ? o.pct + '%' : '');
        })),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px 14px' } },
        p.opcoes.map(function (o, i) {
          return h('span', { key: o.id, style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: CINZA2, maxWidth: '100%' } },
            h('span', { 'aria-hidden': 'true', style: { width: 10, height: 10, borderRadius: 3, background: cores[i], flex: 'none', border: cores[i] === '#e5e7eb' ? '1px solid #d1d5db' : 'none' } }),
            h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis' } }, o.label + ' · ' + o.n));
        })));
  }
  function Distribuicao(p) {
    var tip = useTip();
    var max = Math.max.apply(null, [1].concat(p.dist));
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
      h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 4, height: p.altura || 70 } },
        p.dist.map(function (n, nota) {
          var cor = nota >= 9 ? ROXO : nota >= 7 ? '#c4a5e0' : LARANJA;
          return h('div', Object.assign({ key: nota, className: 'rh-bar', style: { flex: 1, height: Math.max(n ? 6 : 2, Math.round((n / max) * 100)) + '%', background: n ? cor : BORDA, borderRadius: '4px 4px 0 0', outline: 'none' } },
            tip('Nota ' + nota + ': ' + plural(n, 'pessoa', 'pessoas'))));
        })),
      h('div', { style: { display: 'flex', gap: 4 } }, p.dist.map(function (n, nota) { return h('span', { key: nota, style: Object.assign({ flex: 1, textAlign: 'center', fontSize: 10.5, color: CINZA }, TAB) }, nota); })));
  }

  // ───────────────────────── componente principal ─────────────────────────
  window.ModuloRhComponent = function (props) {
    var usuario = props.usuario, apiUrl = props.API_URL || window.API_URL;
    var HeaderCompacto = props.HeaderCompacto, Toast = props.Toast, LoadingOverlay = props.LoadingOverlay;
    var toast = props.showToast || function (m) { try { console.log(m); } catch (e) { /* ok */ } };
    var fetchAuthFn = props.fetchAuth || window.fetchAuth;

    var api = useCallback(function (path, opts) {
      opts = opts || {};
      var init = { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } };
      if (opts.body !== undefined && init.method !== 'GET') init.body = JSON.stringify(opts.body);
      var p = fetchAuthFn ? fetchAuthFn(apiUrl + '/rh' + path, init) : fetch(apiUrl + '/rh' + path, init);
      return p.then(function (res) {
        return res.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : {}; } catch (e) { j = null; }
          if (!res.ok) throw new Error((j && (j.error || j.erro || j.message)) || ('Erro ' + res.status + ' ao falar com o servidor'));
          if (j == null) throw new Error('Resposta inválida do servidor');
          return j;
        });
      }, function () { throw new Error('Sem conexão com o servidor. Confira a internet e tente de novo.'); });
    }, [apiUrl, fetchAuthFn]);

    var sC = useState(null), ciclos = sC[0], setCiclos = sC[1];
    var sA = useState([]), abas = sA[0], setAbas = sA[1];
    var sE = useState(null), erroBase = sE[0], setErroBase = sE[1];
    var sCid = useState(null), cicloId = sCid[0], setCicloId = sCid[1];
    var sT = useState(function () { try { return sessionStorage.getItem('tutts_rh_aba') || 'nps'; } catch (e) { return 'nps'; } }), tab = sT[0], setTab = sT[1];

    var carregarCiclos = useCallback(function (manter) {
      setErroBase(null);
      return api('/ciclos').then(function (r) {
        var lista = r.ciclos || [];
        setCiclos(lista);
        setAbas(r.abas || []);
        setCicloId(function (atual) {
          var alvo = manter != null ? manter : atual;
          if (alvo != null && lista.some(function (c) { return c.id === alvo; })) return alvo;
          var aberto = lista.find(function (c) { return c.situacao === 'aberto'; });
          return lista.length ? (aberto || lista[0]).id : null;
        });
        return lista;
      }).catch(function (e) { setErroBase(e.message); setCiclos([]); });
    }, [api]);
    useEffect(function () { carregarCiclos(); }, [carregarCiclos]);

    var abasVisiveis = ABAS.filter(function (a) { return abas.indexOf(a[0]) >= 0; });
    var abaAtiva = abasVisiveis.some(function (a) { return a[0] === tab; }) ? tab : (abasVisiveis[0] ? abasVisiveis[0][0] : null);
    var irAba = function (a) { setTab(a); try { sessionStorage.setItem('tutts_rh_aba', a); } catch (e) { /* ok */ } try { window.scrollTo({ top: 0 }); } catch (e) { /* ok */ } };
    var podeConfig = abas.indexOf('config') >= 0;
    var ciclo = (ciclos || []).find(function (c) { return c.id === cicloId; }) || null;
    var comum = { api: api, toast: toast, ciclo: ciclo, ciclos: ciclos || [], recarregarCiclos: carregarCiclos, podeConfig: podeConfig, irAba: irAba, setCicloId: setCicloId };

    var conteudo;
    if (ciclos === null) conteudo = Carregando('Carregando o RH…');
    else if (erroBase) conteudo = Erro(erroBase, function () { setCiclos(null); carregarCiclos(); });
    else if (!abaAtiva) conteudo = Vazio('lock', 'Sem abas liberadas', 'Peça para o master liberar as abas do RH em Configurações › Permissões.');
    else if (abaAtiva === 'config') conteudo = h(ConfigView, comum);
    else if (!ciclos.length) conteudo = Vazio('calendar', 'Nenhum ciclo de NPS ainda', podeConfig ? 'Crie o primeiro ciclo na Configuração: você define as datas e as respostas esperadas, e a Central gera o link anônimo.' : 'Quando o RH criar o primeiro ciclo, os resultados aparecem aqui.',
      podeConfig ? Btn({ variant: 'pri', icon: 'plus', onClick: function () { irAba('config'); }, children: 'Criar primeiro ciclo' }) : null);
    else if (abaAtiva === 'pessoas') conteudo = h(PessoasView, Object.assign({ key: 'p' + cicloId }, comum));
    else if (abaAtiva === 'sensivel') conteudo = h(SensivelView, Object.assign({ key: 's' + cicloId }, comum));
    else conteudo = h(PainelView, Object.assign({ key: 'n' + cicloId }, comum));

    var sitC = ciclo ? (SIT[ciclo.situacao] || [ciclo.situacao, 'cinza']) : null;
    var mostrarSeletor = abaAtiva && abaAtiva !== 'config' && ciclos && ciclos.length > 0;

    return h('div', { className: 'min-h-screen', style: { background: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif', color: TEXTO, fontSize: 13 } },
      props.i && Toast ? h(Toast, props.i) : null,
      props.n && LoadingOverlay ? h(LoadingOverlay) : null,
      HeaderCompacto ? h(HeaderCompacto, { usuario: usuario, moduloAtivo: props.Ee, socialProfile: props.socialProfile, isLoading: props.f, lastUpdate: props.E, onRefresh: props.ul,
        onLogout: function () { props.o && props.o(null); }, onGoHome: function () { props.he && props.he('home'); }, onNavigate: props.navegarSidebar }) : null,
      h(TipProvider, null,
        h('div', { className: 'max-w-7xl mx-auto', style: { maxWidth: 1280, margin: '0 auto', padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', gap: 18, boxSizing: 'border-box' } },
          h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14 } },
            h('div', { style: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
                h('h1', { style: { margin: 0, fontFamily: SORA, fontSize: 24, fontWeight: 700, lineHeight: 1.25 } }, abaAtiva === 'config' ? 'Configuração do RH' : (ciclo ? 'NPS · ' + ciclo.nome : 'RH')),
                mostrarSeletor && sitC ? Pill(sitC[0] + (ciclo.situacao === 'aberto' ? ' até ' + fD(ciclo.fecha_em) : ''), sitC[1]) : null),
              h('span', { style: { color: CINZA, fontSize: 13 } }, abaAtiva === 'config'
                ? 'Ciclos, grupos, colaboradores e perguntas do formulário anônimo'
                : 'Respostas anônimas · grupos só aparecem com ' + ((ciclo && ciclo.minimo_grupo) || 5) + '+ respostas e os resultados abrem quando o ciclo encerra')),
            mostrarSeletor ? h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' } },
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: CINZA2, fontWeight: 600 } }, 'Ciclo',
                Sel({ value: cicloId || '', onChange: function (e) { setCicloId(Number(e.target.value)); }, style: { minWidth: 190 } },
                  ciclos.map(function (c) { return [c.id, c.nome + (c.situacao === 'aberto' ? ' · aberto' : c.situacao === 'agendado' ? ' · agendado' : '')]; }))),
              ciclo && ciclo.situacao === 'aberto' && ciclo.token ? Btn({ icon: 'link', onClick: function () { copiar(linkNps(ciclo), toast, 'Link do formulário copiado'); }, children: 'Copiar link do formulário' }) : null) : null),
          abasVisiveis.length ? h('div', { role: 'tablist', 'aria-label': 'Seções do RH', style: { display: 'flex', gap: 4, borderBottom: '1px solid ' + BORDA, overflowX: 'auto' } },
            abasVisiveis.map(function (a) {
              var on = abaAtiva === a[0];
              return h('button', { key: a[0], type: 'button', role: 'tab', 'aria-selected': on, className: 'rh-tab', onClick: function () { irAba(a[0]); },
                style: { padding: '11px 12px', marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontSize: 13.5, cursor: 'pointer', background: 'none', border: 0, fontFamily: 'inherit',
                  color: on ? ROXO_ESC : CINZA, fontWeight: on ? 600 : 500, borderBottom: '2px solid ' + (on ? ROXO : 'transparent') } }, ico(a[2], 15), a[1]);
            })) : null,
          conteudo)));
  };

  // ───────────────────────── aba Painel NPS ─────────────────────────
  function PainelView(p) {
    var api = p.api, toast = p.toast, ciclo = p.ciclo;
    var s = useState(null), painel = s[0], setPainel = s[1];
    var sE = useState(null), erro = sE[0], setErro = sE[1];
    var sG = useState(false), gerando = sG[0], setGerando = sG[1];
    var sX = useState(null), textos = sX[0], setTextos = sX[1];
    var sEnc = useState(false), encerrando = sEnc[0], setEncerrando = sEnc[1];

    var carregar = useCallback(function () {
      if (!ciclo) return;
      setErro(null);
      api('/nps/' + ciclo.id + '/painel').then(setPainel).catch(function (e) { setErro(e.message); });
    }, [api, ciclo && ciclo.id]);
    useEffect(carregar, [carregar]);

    if (!ciclo) return null;
    if (erro) return Erro(erro, carregar);
    if (!painel) return Carregando('Montando o painel…');

    var ad = painel.adesao;
    var encerrar = function () {
      if (!window.confirm('Encerrar o ciclo "' + ciclo.nome + '"?\n\nO link para de aceitar respostas e os resultados abrem. Dá para reabrir depois, se precisar.')) return;
      setEncerrando(true);
      api('/config/ciclos/' + ciclo.id + '/encerrar', { method: 'POST', body: {} })
        .then(function () { toast('Ciclo encerrado. Resultados liberados.', 'success'); return p.recarregarCiclos(ciclo.id); })
        .then(carregar).catch(function (e) { toast(e.message, 'error'); }).then(function () { setEncerrando(false); });
    };
    var adesaoCard = h(Card, { label: 'Adesão', gap: 10 },
      h('span', { style: { fontSize: 12, color: CINZA, fontWeight: 600 } }, 'Adesão'),
      h('span', null, h('b', { style: Object.assign({ fontFamily: SORA, fontSize: 28 }, TAB) }, ad.respostas), h('span', { style: { color: CINZA } }, ' de ' + (ad.esperadas || '—') + ' esperadas')),
      h('div', { style: { height: 8, borderRadius: 99, background: LILAS, overflow: 'hidden' } }, h('div', { style: { width: (ad.pct || 0) + '%', height: '100%', background: ROXO, borderRadius: 99 } })),
      h('span', { style: { fontSize: 12, color: TEXTO2, lineHeight: 1.5 } },
        (ad.pct != null ? ad.pct + '%' : '') + (ad.esperadas > ad.respostas ? ' · faltam ' + (ad.esperadas - ad.respostas) : '') +
        (ad.grupos.length ? ' · ' + ad.grupos.map(function (g) { return g.nome + ' ' + g.respostas + (g.membros ? '/' + g.membros : ''); }).join(' · ') : '') +
        (ad.sem_grupo ? ' · ' + ad.sem_grupo + ' sem grupo' : '')));

    if (!painel.liberado) {
      var aberto = painel.motivo === 'aberto';
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 } },
          adesaoCard,
          h(Card, { gap: 10, style: { background: LILAS_FUNDO, borderColor: LILAS_BORDA } },
            h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } }, h('span', { style: { color: ROXO_ESC } }, ico('lock', 18)),
              h('b', { style: { fontSize: 14, color: ROXO_ESC } }, aberto ? (ciclo.situacao === 'agendado' ? 'Ciclo agendado' : 'Resultados fechados até o ciclo encerrar') : 'Poucas respostas para mostrar')),
            h('span', { style: { color: TEXTO2, lineHeight: 1.55 } }, aberto
              ? (ciclo.situacao === 'agendado' ? 'O formulário abre em ' + fD(ciclo.abre_em) + '. Os resultados aparecem quando o ciclo encerrar.' : 'Os resultados abrem quando o ciclo encerrar — assim ninguém compara o painel antes e depois de alguém responder.')
              : 'O ciclo teve ' + plural(ad.respostas, 'resposta', 'respostas') + '. Abaixo de ' + painel.ciclo.minimo_grupo + ' os resultados ficam fechados para proteger o anonimato.'),
            aberto && p.podeConfig && ciclo.situacao !== 'agendado' ? h('div', null, Btn({ variant: 'pri', icon: 'check', loading: encerrando, disabled: encerrando, onClick: encerrar, children: 'Encerrar ciclo e ver resultados' })) : null)),
        ad.grupos.length ? h(Card, { label: 'Adesão por grupo' }, Titulo('Quem já respondeu, por grupo', 'só a contagem — o conteúdo das respostas continua fechado'),
          h(BarrasH, { ordenar: false, itens: ad.grupos.map(function (g) { return { id: g.id, label: g.nome + (g.membros ? ' (' + g.membros + ' pessoas)' : ''), n: g.respostas, pct: g.membros ? Math.min(100, Math.round(g.respostas / g.membros * 100)) : null }; })
            .concat(ad.sem_grupo ? [{ id: 'nd', label: 'Prefiro não dizer', n: ad.sem_grupo }] : []) })) : null);
    }

    var ps = painel.perguntas || [];
    var e = painel.enps;
    var ant = painel.enps_anterior;
    var pEnps = ps.find(function (q) { return q.tipo === 'nota10' && q.enps; });
    var escalas = ps.filter(function (q) { return q.escala; });
    var pior = escalas.slice().sort(function (a, b) { return a.bomPct - b.bomPct; })[0];
    var vf = ps.find(function (q) { return q.id === 'valores_facil'; }), vd = ps.find(function (q) { return q.id === 'valores_dificil'; });
    var temValores = vf && vd && vf.tipo === 'multipla' && vd.tipo === 'multipla';
    var raiox = painel.raiox;

    var gerar = function () {
      setGerando(true);
      api('/nps/' + ciclo.id + '/raiox', { method: 'POST', body: {} })
        .then(function (r) { setPainel(function (pp) { return Object.assign({}, pp, { raiox: r }); }); toast('Raio-x gerado', 'success'); })
        .catch(function (er) { toast(er.message, 'error'); }).then(function () { setGerando(false); });
    };
    var abrirTextos = function (q) {
      setTextos({ q: q, lista: null });
      api('/nps/' + ciclo.id + '/textos/' + encodeURIComponent(q.id)).then(function (r) { setTextos({ q: q, lista: r.textos || [] }); })
        .catch(function (er) { toast(er.message, 'error'); setTextos(null); });
    };

    // KPIs
    var kpis = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 } },
      adesaoCard,
      e ? h(Card, { label: 'eNPS', gap: 8 },
        h('span', { style: { fontSize: 12, color: CINZA, fontWeight: 600 } }, 'eNPS'),
        h('span', { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } },
          h('b', { style: Object.assign({ fontFamily: SORA, fontSize: 28, color: ROXO_ESC }, TAB) }, sinal(e.enps)),
          ant && ant.id !== ciclo.id ? h('span', { style: { fontSize: 12, fontWeight: 600, color: e.enps - ant.enps >= 0 ? '#065f46' : '#9a3412' } }, sinal(e.enps - ant.enps) + ' vs ' + ant.nome) : null),
        h(SplitBar, { e: e }),
        h('span', { style: { fontSize: 12, color: TEXTO2 } }, 'Promotores ' + Math.round(e.promotores / e.n * 100) + '% · Neutros ' + Math.round(e.neutros / e.n * 100) + '% · Detratores ' + Math.round(e.detratores / e.n * 100) + '%')) : null,
      pEnps && pEnps.resumo ? h(Card, { label: 'Nota média', gap: 8 },
        h('span', { style: { fontSize: 12, color: CINZA, fontWeight: 600 } }, 'Nota para a Tutts'),
        h('span', null, h('b', { style: Object.assign({ fontFamily: SORA, fontSize: 28 }, TAB) }, String(pEnps.resumo.media).replace('.', ',')), h('span', { style: { color: CINZA } }, ' de 10')),
        h(Distribuicao, { dist: pEnps.dist, altura: 44 })) : null,
      pior ? h(Card, { label: 'Menor índice', gap: 8 },
        h('span', { style: { fontSize: 12, color: CINZA, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: pior.texto }, pior.texto),
        h('span', null, h('b', { style: Object.assign({ fontFamily: SORA, fontSize: 28 }, TAB) }, pior.bomPct + '%'), h('span', { style: { color: CINZA } }, ' positivo')),
        h('div', { style: { height: 8, borderRadius: 99, background: BORDA2, overflow: 'hidden' } }, h('div', { style: { width: pior.bomPct + '%', height: '100%', background: ROXO, borderRadius: 99 } })),
        h('span', { style: { fontSize: 12, color: '#9a3412', fontWeight: 600 } }, 'menor índice do ciclo')) : null);

    // Raio-x
    var raioxCard = h('section', { 'aria-label': 'Raio-x do sentimento', style: { background: 'linear-gradient(120deg,' + ROXO_FUNDO + ',' + ROXO_ESC + ')', color: '#fff', borderRadius: 18, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: '1 1 260px' } },
          h('span', { style: { fontSize: 12, color: '#e9d5f9', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 } }, ico('sparkles', 14), 'Raio-x do sentimento · Gemini'),
          h('b', { style: { fontFamily: SORA, fontSize: 20, lineHeight: 1.3 } }, raiox ? raiox.titulo : 'Peça para a IA ler o ciclo')),
        h('div', { style: { display: 'flex', gap: 12, alignItems: 'center' } },
          raiox ? h('span', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } }, h('b', { style: Object.assign({ fontFamily: SORA, fontSize: 26 }, TAB) }, raiox.indice), h('span', { style: { fontSize: 11, color: '#e9d5f9' } }, 'índice de clima / 100')) : null,
          Btn({ variant: raiox ? 'claro' : 'sec', icon: 'sparkles', loading: gerando, disabled: gerando, onClick: gerar, children: gerando ? 'Lendo as respostas…' : raiox ? 'Gerar de novo' : 'Gerar raio-x' }))),
      raiox ? h(React.Fragment, null,
        raiox.resumo ? h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#f5edfb', maxWidth: 980 } }, raiox.resumo) : null,
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
          [['O que sustenta o clima', raiox.sustenta, '#e9d5f9'], ['Pontos de atenção', raiox.atencao, '#fbd3b0'], ['Sugestão de ação', raiox.acoes, '#e9d5f9']].map(function (b) {
            return h('div', { key: b[0], style: { background: 'rgba(255,255,255,.1)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 } },
              h('b', { style: { fontSize: 12, color: b[2] } }, b[0]),
              (b[1] || []).length ? (b[1] || []).map(function (t, i) { return h('span', { key: i, style: { lineHeight: 1.45 } }, t); }) : h('span', { style: { color: '#e9d5f9' } }, '—'));
          })),
        h('span', { style: { fontSize: 11.5, color: '#e9d5f9' } }, (raiox.desatualizado ? 'Chegaram respostas depois deste raio-x — gere de novo. · ' : '') +
          (raiox.gerado_em ? 'Gerado ' + fDH(raiox.gerado_em) + (raiox.gerado_por ? ' por ' + raiox.gerado_por : '') + '. ' : '') +
          'A IA lê os números e os textos abertos, sem grupo e sem as avaliações de pessoas. Ela reescreve tudo para não revelar o jeito de escrever de ninguém.'))
        : h('span', { style: { color: '#e9d5f9', lineHeight: 1.5 } }, 'A IA lê os números e as respostas abertas do ciclo e devolve o diagnóstico, o que sustenta o clima, os pontos de atenção e sugestões de ação.'));

    // gráficos por pergunta
    var blocos = [];
    if (temValores) blocos.push(h(Card, { key: 'valores', label: 'Valores da Tutts' }, Titulo('Valores da Tutts', vf.respondentes + ' responderam'), h(Valores, { f: vf, d: vd })));
    ps.forEach(function (q) {
      if (q.tipo === 'nota10' && q.enps) return;
      if (temValores && (q === vf || q === vd)) return;
      if (q.tipo === 'texto') return;
      var corpo;
      if (q.tipo === 'nota10') corpo = h(Distribuicao, { dist: q.dist || [] });
      else if (q.tipo === 'unica' && q.escala) corpo = h(Empilhada, { opcoes: q.opcoes || [] });
      else if (q.opcoes) corpo = h(BarrasH, { itens: (q.opcoes || []).map(function (o) { return { id: o.id, label: o.label, n: o.n, pct: o.pct }; }), ordenar: q.tipo === 'multipla' });
      else return;
      blocos.push(h(Card, { key: q.id, label: q.texto },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' } },
          h('h2', { style: { margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.4 } }, q.texto),
          q.escala ? h('span', { style: { fontSize: 12, fontWeight: 700, color: ROXO_ESC, whiteSpace: 'nowrap' } }, q.bomPct + '% positivo') : h('span', { style: { fontSize: 12, color: CINZA, whiteSpace: 'nowrap' } }, plural(q.respondentes, 'resposta', 'respostas'))),
        corpo));
    });

    var temas = (raiox && raiox.temas) || [];
    var abertas = ps.filter(function (q) { return q.tipo === 'texto'; });

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      kpis, raioxCard,
      blocos.length ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16 } }, blocos) : null,
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16 } },
        h(Card, { label: 'Evolução do eNPS' }, Titulo('Evolução do eNPS', 'ciclos com resultado liberado'), h(Evolucao, { lista: painel.evolucao || [], atual: ciclo.id })),
        h(Card, { label: 'Por grupo' }, Titulo('Por grupo'),
          h('div', { style: { overflowX: 'auto' } },
            h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 320 } },
              h('thead', null, h('tr', null, ['Grupo', 'Respostas', 'eNPS', 'Nota'].map(function (t) { return h('th', { key: t, style: { textAlign: t === 'Grupo' ? 'left' : 'right', fontSize: 11.5, color: CINZA, fontWeight: 700, padding: '6px 8px', borderBottom: '1px solid ' + BORDA } }, t); }))),
              h('tbody', null, (painel.grupos || []).map(function (g) {
                return h('tr', { key: g.id, className: 'rh-linha' },
                  h('td', { style: { padding: '9px 8px', fontWeight: 600, borderBottom: '1px solid ' + BORDA2 } }, g.nome),
                  h('td', { style: Object.assign({ padding: '9px 8px', textAlign: 'right', borderBottom: '1px solid ' + BORDA2 }, TAB) }, g.respostas + (g.membros ? ' de ' + g.membros : '')),
                  g.oculto ? h('td', { colSpan: 2, style: { padding: '9px 8px', textAlign: 'right', color: CINZA, borderBottom: '1px solid ' + BORDA2 } }, h('span', { style: { display: 'inline-flex', gap: 6, alignItems: 'center' } }, ico('lock', 13), 'menos de ' + painel.ciclo.minimo_grupo + ' respostas'))
                    : h(React.Fragment, null,
                      h('td', { style: Object.assign({ padding: '9px 8px', textAlign: 'right', fontWeight: 700, color: ROXO_ESC, borderBottom: '1px solid ' + BORDA2 }, TAB) }, sinal(g.enps)),
                      h('td', { style: Object.assign({ padding: '9px 8px', textAlign: 'right', borderBottom: '1px solid ' + BORDA2 }, TAB) }, g.media != null ? String(g.media).replace('.', ',') : '—')));
              })))),
          h('div', { style: { background: '#f9fafb', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: TEXTO2 } }, ico('lock', 14),
            'Grupos com menos de ' + painel.ciclo.minimo_grupo + ' respostas entram só no total da empresa.'),
          raiox && raiox.starbem ? h('div', { style: { background: LILAS_FUNDO, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 } },
            h('span', { style: { fontSize: 11, fontWeight: 700, color: ROXO_ESC } }, 'Starbem · resumo da IA'), h('span', null, raiox.starbem)) : null)),
      abertas.length ? h(Card, { label: 'Respostas abertas' },
        Titulo('Respostas abertas', 'temas agrupados pela IA · as respostas saem em ordem aleatória'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, abertas.map(function (q) {
          var tq = temas.filter(function (t) { return t.pergunta === q.id; });
          return h('div', { key: q.id, style: { display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12, borderBottom: '1px solid ' + BORDA2 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' } },
              h('b', { style: { fontSize: 13.5, lineHeight: 1.4, flex: '1 1 240px' } }, q.texto),
              Btn({ small: true, icon: 'shuffle', disabled: !q.respondentes, onClick: function () { abrirTextos(q); }, children: 'Ver ' + plural(q.respondentes, 'resposta', 'respostas') })),
            tq.length ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 10 } }, tq.map(function (t, i) {
              return h('div', { key: i, style: { background: LILAS_FUNDO, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 5 } },
                h('span', { style: { fontSize: 11, fontWeight: 700, color: ROXO_ESC } }, 'Tema · ' + plural(t.mencoes || 0, 'menção', 'menções')),
                h('b', null, t.titulo), h('span', { style: { color: CINZA2, lineHeight: 1.45 } }, t.sintese));
            })) : h('span', { style: { fontSize: 12, color: CINZA } }, raiox ? 'A IA não destacou temas nesta pergunta.' : 'Gere o raio-x para ver os temas desta pergunta.'));
        })),
        painel.sensivel_n ? h('span', { style: { fontSize: 12, color: CINZA2, display: 'inline-flex', alignItems: 'center', gap: 6 } }, ico('shield', 14),
          plural(painel.sensivel_n, 'relato', 'relatos') + ' no espaço sensível — ficam só na aba Espaço sensível.') : null) : null,
      textos ? h(Modal, { titulo: textos.q.texto, sub: 'Em ordem aleatória, a cada vez que abre', largura: 640, onClose: function () { setTextos(null); } },
        textos.lista === null ? Carregando('Embaralhando as respostas…') :
          textos.lista.length ? textos.lista.map(function (t, i) { return h('div', { key: i, style: { background: '#f9fafb', border: '1px solid ' + BORDA2, borderRadius: 12, padding: '12px 14px', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, t); })
            : h('span', { style: { color: CINZA } }, 'Nenhuma resposta nesta pergunta.')) : null);
  }

  function SplitBar(p) {
    var tip = useTip(), e = p.e;
    var partes = [[e.promotores, ROXO, 'Promotores (9–10)'], [e.neutros, '#d8c3ea', 'Neutros (7–8)'], [e.detratores, LARANJA, 'Detratores (0–6)']];
    return h('div', { style: { display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', gap: 2 } },
      partes.map(function (x) { return x[0] ? h('div', Object.assign({ key: x[2], className: 'rh-bar', style: { flex: x[0], background: x[1], outline: 'none' } }, tip(x[2] + ': ' + plural(x[0], 'pessoa', 'pessoas')))) : null; }));
  }
  function Valores(p) {
    var tip = useTip();
    var f = p.f, d = p.d;
    var linhas = (f.opcoes || []).map(function (o) { var od = (d.opcoes || []).find(function (x) { return x.id === o.id; }) || { n: 0, pct: 0 }; return { id: o.id, label: o.label, fac: o.n, facPct: o.pct, dif: od.n, difPct: od.pct }; });
    var max = Math.max.apply(null, [1].concat(linhas.map(function (l) { return Math.max(l.fac, l.dif); })));
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      h('div', { style: { display: 'flex', gap: 14, fontSize: 11.5, color: CINZA2, justifyContent: 'flex-end', flexWrap: 'wrap' } },
        h('span', { style: { display: 'inline-flex', gap: 5, alignItems: 'center' } }, h('span', { style: { width: 10, height: 10, borderRadius: 3, background: LARANJA } }), 'difícil seguir'),
        h('span', { style: { display: 'inline-flex', gap: 5, alignItems: 'center' } }, h('span', { style: { width: 10, height: 10, borderRadius: 3, background: ROXO } }), 'fácil seguir')),
      linhas.map(function (l) {
        return h('div', { key: l.id, style: { display: 'grid', gridTemplateColumns: 'minmax(80px, 26%) 1fr 1fr', gap: 8, alignItems: 'center' } },
          h('span', { style: { fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: l.label }, l.label),
          h('div', { style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 } },
            h('span', { style: Object.assign({ fontSize: 11.5, color: CINZA }, TAB) }, l.dif),
            h('div', Object.assign({ className: 'rh-bar', style: { width: Math.round(l.dif / max * 100) + '%', minWidth: l.dif ? 4 : 0, height: 14, borderRadius: '4px 0 0 4px', background: LARANJA, outline: 'none' } }, tip(l.label + ': ' + l.dif + ' sentem dificuldade (' + l.difPct + '%)')))),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
            h('div', Object.assign({ className: 'rh-bar', style: { width: Math.round(l.fac / max * 100) + '%', minWidth: l.fac ? 4 : 0, height: 14, borderRadius: '0 4px 4px 0', background: ROXO, outline: 'none' } }, tip(l.label + ': ' + l.fac + ' sentem facilidade (' + l.facPct + '%)'))),
            h('span', { style: Object.assign({ fontSize: 11.5, color: CINZA }, TAB) }, l.fac)));
      }));
  }
  function Evolucao(p) {
    var tip = useTip();
    if (!p.lista.length) return h('span', { style: { color: CINZA } }, 'A evolução aparece a partir do segundo ciclo encerrado.');
    var vals = p.lista.map(function (x) { return x.enps; });
    var max = Math.max.apply(null, vals.map(Math.abs).concat([10]));
    var temNeg = vals.some(function (v) { return v < 0; });
    var mes = function (x) { var m = /^(\d{4})-(\d{2})/.exec(x.abre_em || ''); return m ? MES_CURTO[Number(m[2]) - 1] : x.nome; };
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      h('div', { style: { height: 150, display: 'flex', alignItems: temNeg ? 'center' : 'flex-end', gap: 10, borderBottom: temNeg ? 'none' : '1px solid ' + BORDA, paddingBottom: 2 } },
        p.lista.map(function (x) {
          var atual = x.id === p.atual;
          var alt = Math.max(4, Math.round(Math.abs(x.enps) / max * (temNeg ? 60 : 118)));
          return h('div', { key: x.id, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: temNeg ? 'center' : 'flex-end', height: '100%', gap: 4, minWidth: 0 } },
            h('span', { style: Object.assign({ fontSize: 11, fontWeight: 700, color: TEXTO2 }, TAB) }, sinal(x.enps)),
            h('div', Object.assign({ className: 'rh-bar', style: { width: '100%', maxWidth: 56, height: alt, borderRadius: x.enps < 0 ? '0 0 6px 6px' : '6px 6px 0 0', background: x.enps < 0 ? LARANJA : atual ? ROXO : LILAS_BORDA, outline: 'none' } },
              tip(x.nome + ': eNPS ' + sinal(x.enps) + ' · nota ' + String(x.media).replace('.', ',') + ' · ' + plural(x.respostas, 'resposta', 'respostas')))));
        })),
      h('div', { style: { display: 'flex', gap: 10 } }, p.lista.map(function (x) { return h('span', { key: x.id, style: { flex: 1, textAlign: 'center', fontSize: 11, color: x.id === p.atual ? ROXO_ESC : CINZA, fontWeight: x.id === p.atual ? 700 : 400 } }, mes(x)); })));
  }

  // ───────────────────────── aba Líderes e equipe ─────────────────────────
  var TOM_IA = { positivo: ['Tom positivo', 'verde'], misto: ['Tom misto', 'roxo'], atencao: ['Pede atenção', 'laranja'] };
  function PessoasView(p) {
    var api = p.api, toast = p.toast, ciclo = p.ciclo;
    var s = useState(null), dados = s[0], setDados = s[1];
    var sE = useState(null), erro = sE[0], setErro = sE[1];
    var sF = useState('todos'), filtro = sF[0], setFiltro = sF[1];
    var sG = useState(null), gerando = sG[0], setGerando = sG[1];
    var carregar = useCallback(function () { setErro(null); api('/pessoas/' + ciclo.id).then(setDados).catch(function (e) { setErro(e.message); }); }, [api, ciclo.id]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!dados) return Carregando('Buscando os resumos…');
    if (!dados.liberado) return Vazio('lock', 'Resultados fechados até o ciclo encerrar', 'Os resumos de líderes e equipe só aparecem depois que o ciclo encerrar, e só para quem recebeu ' + (dados.minimo_pessoa || 3) + ' avaliações ou mais.',
      p.podeConfig ? Btn({ icon: 'settings', onClick: function () { p.irAba('config'); }, children: 'Ir para a Configuração' }) : null);
    var lista = dados.pessoas || [];
    var cont = { todos: lista.length, lider: 0, equipe: 0, setor: 0 };
    lista.forEach(function (x) { if (cont[x.avaliacao] != null) cont[x.avaliacao]++; });
    var vis = lista.filter(function (x) { return filtro === 'todos' || x.avaliacao === filtro; });
    var pendentes = lista.filter(function (x) { return x.suficiente && (!x.resumo || x.resumo.desatualizado); }).length;
    var gerar = function (id) {
      setGerando(id || 'todos');
      api('/pessoas/' + ciclo.id + '/gerar', { method: 'POST', body: id ? { colaborador_id: id } : {} })
        .then(function (r) {
          setDados(function (d) { return Object.assign({}, d, { pessoas: r.pessoas }); });
          if (r.falhas && r.falhas.length) toast('A IA não respondeu para: ' + r.falhas.join(', ') + '. Tente de novo.', 'error');
          else toast(r.gerados ? plural(r.gerados, 'resumo gerado', 'resumos gerados') : 'Nada novo para resumir', r.gerados ? 'success' : 'info');
        }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setGerando(null); });
    };
    var papel = { lider: 'Líder', equipe: 'Equipe', setor: 'Setor' };
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 } },
        h('div', { role: 'group', 'aria-label': 'Filtrar', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          [['todos', 'Todos'], ['lider', 'Líderes'], ['equipe', 'Equipe'], ['setor', 'Setores']].map(function (f) {
            var on = filtro === f[0];
            return h('button', { key: f[0], type: 'button', 'aria-pressed': on, className: 'rh-btn', onClick: function () { setFiltro(f[0]); },
              style: { height: 36, padding: '0 13px', borderRadius: 99, border: '1px solid ' + (on ? ROXO : BORDA), background: on ? LILAS : '#fff', color: on ? ROXO_ESC : TEXTO2, fontWeight: on ? 600 : 500, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' } }, f[1] + ' · ' + cont[f[0]]);
          })),
        Btn({ variant: 'pri', icon: 'sparkles', loading: gerando === 'todos', disabled: !!gerando || !pendentes, onClick: function () { gerar(null); }, title: pendentes ? '' : 'Todos os resumos estão em dia',
          children: gerando === 'todos' ? 'Gerando resumos…' : pendentes ? 'Gerar resumos da IA (' + pendentes + ')' : 'Resumos em dia' })),
      h('div', { style: { fontSize: 12.5, color: CINZA, display: 'flex', gap: 6, alignItems: 'center' } }, ico('shield', 14),
        'Só resumo da IA, com ' + (dados.minimo_pessoa || 3) + '+ avaliações. O texto original nunca aparece aqui.'),
      vis.length ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 14 } }, vis.map(function (x) {
        var r = x.resumo, tom = r && TOM_IA[r.tom];
        return h(Card, { key: x.id, label: x.nome, pad: '16px 18px' },
          h('div', { style: { display: 'flex', gap: 12, alignItems: 'center' } },
            h('span', { style: { width: 40, height: 40, borderRadius: '50%', background: '#ede4f6', color: ROXO_ESC, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' } }, iniciais(x.nome)),
            h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 } },
              h('b', { style: { fontSize: 14 } }, x.nome),
              h('span', { style: { fontSize: 12, color: CINZA } }, (papel[x.avaliacao] || '') + (x.cargo && x.cargo !== 'Setor' ? ' · ' + x.cargo : ''))),
            Pill(plural(x.avaliacoes, 'avaliação', 'avaliações'), 'cinza')),
          !x.suficiente ? h('div', { style: { background: '#f9fafb', borderRadius: 10, padding: 12, display: 'flex', gap: 8, alignItems: 'center', color: CINZA2 } }, ico('lock', 14),
            x.avaliacoes ? 'Aguardando ' + (dados.minimo_pessoa || 3) + ' avaliações para mostrar o resumo.' : 'Ninguém avaliou neste ciclo.')
            : r ? h(React.Fragment, null,
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 } },
                h('div', { style: { background: LILAS_FUNDO, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 } }, h('span', { style: { fontSize: 11, fontWeight: 700, color: ROXO_ESC } }, 'O que funciona'), h('span', { style: { color: TEXTO2, lineHeight: 1.45 } }, r.funciona)),
                h('div', { style: { background: '#fff7ed', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 } }, h('span', { style: { fontSize: 11, fontWeight: 700, color: '#9a3412' } }, 'Pode evoluir'), h('span', { style: { color: TEXTO2, lineHeight: 1.45 } }, r.evoluir))),
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
                tom ? Pill(tom[0], tom[1]) : null,
                (r.tags || []).map(function (t) { return h('span', { key: t, style: { fontSize: 11, padding: '4px 9px', borderRadius: 99, background: '#f3f4f6', color: TEXTO2 } }, t); }),
                h('span', { style: { flex: 1 } }),
                r.desatualizado ? Pill('chegaram avaliações novas', 'ambar') : null,
                Btn({ small: true, variant: 'link', icon: 'refresh', disabled: !!gerando, onClick: function () { gerar(x.id); }, children: gerando === x.id ? 'Gerando…' : 'Gerar de novo' })))
              : h('div', { style: { background: LILAS_FUNDO, borderRadius: 10, padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' } },
                h('span', { style: { color: TEXTO2 } }, 'Pronto para resumir.'),
                Btn({ small: true, variant: 'pri', icon: 'sparkles', loading: gerando === x.id, disabled: !!gerando, onClick: function () { gerar(x.id); }, children: 'Gerar resumo' })));
      })) : Vazio('users', 'Ninguém neste filtro', 'Troque o filtro para ver as outras pessoas.', Btn({ onClick: function () { setFiltro('todos'); }, children: 'Ver todos' })));
  }

  // ───────────────────────── aba Espaço sensível ─────────────────────────
  function SensivelView(p) {
    var api = p.api, ciclo = p.ciclo;
    var s = useState(null), dados = s[0], setDados = s[1];
    var sE = useState(null), erro = sE[0], setErro = sE[1];
    var carregar = useCallback(function () { setErro(null); api('/sensivel/' + ciclo.id).then(setDados).catch(function (e) { setErro(e.message); }); }, [api, ciclo.id]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!dados) return Carregando('Abrindo o espaço sensível…');
    if (!dados.liberado) return Vazio('lock', dados.total ? plural(dados.total, 'relato recebido', 'relatos recebidos') : 'Nenhum relato até agora',
      'Os relatos abrem quando o ciclo encerrar, junto com o resto do NPS. Cada abertura fica registrada na auditoria.');
    if (!dados.textos.length) return Vazio('shield', 'Nenhum relato neste ciclo', 'Ninguém usou o espaço sensível em ' + ciclo.nome + '.');
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      h('div', { style: { background: LILAS_FUNDO, border: '1px solid ' + LILAS_BORDA, borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', color: TEXTO2, lineHeight: 1.5 } },
        h('span', { style: { color: ROXO_ESC, marginTop: 2 } }, ico('shield', 16)),
        h('span', null, h('b', null, plural(dados.total, 'relato', 'relatos') + ' · ordem aleatória. '), 'Esses textos não têm ligação com o resto das respostas, nem grupo, nem data. Trate com cuidado e só com quem precisa saber. Esta leitura ficou registrada na auditoria.')),
      dados.textos.map(function (t, i) {
        return h(Card, { key: i, pad: '14px 16px', gap: 6 },
          h('span', { style: { fontSize: 11, fontWeight: 700, color: CINZA } }, 'Relato ' + (i + 1)),
          h('div', { style: { lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14 } }, t));
      }));
  }

  // ───────────────────────── aba Configuração ─────────────────────────
  function ConfigView(p) {
    var api = p.api, toast = p.toast;
    var s = useState(null), cfg = s[0], setCfg = s[1];
    var sE = useState(null), erro = sE[0], setErro = sE[1];
    var carregar = useCallback(function () { setErro(null); return api('/config').then(setCfg).catch(function (e) { setErro(e.message); }); }, [api]);
    useEffect(function () { carregar(); }, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!cfg) return Carregando('Carregando a configuração…');
    var comum = { api: api, toast: toast, cfg: cfg, recarregar: carregar, ciclos: p.ciclos, recarregarCiclos: p.recarregarCiclos, setCicloId: p.setCicloId, irAba: p.irAba };
    return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' } },
      h('div', { style: { flex: '1 1 360px', maxWidth: 460, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 } },
        h(CiclosConfig, comum), h(GruposConfig, comum)),
      h('div', { style: { flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 } },
        h(ColaboradoresConfig, comum), h(PerguntasConfig, comum)));
  }

  function proximoCiclo(sugeridas) {
    var d = new Date();
    var fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { nome: MESES[d.getMonth()] + ' ' + d.getFullYear(), abre_em: iso(d), fecha_em: iso(fim), esperadas: sugeridas || 0, minimo_grupo: 5, minimo_pessoa: 3 };
  }
  function CiclosConfig(p) {
    var api = p.api, toast = p.toast;
    var s = useState(null), form = s[0], setForm = s[1]; // {id?, ...}
    var sB = useState(null), busy = sB[0], setBusy = sB[1];
    var ciclos = p.ciclos || [];
    var acao = function (id, caminho, metodo, msg, confirmar) {
      if (confirmar && !window.confirm(confirmar)) return;
      setBusy(id + caminho);
      api('/config/ciclos/' + id + caminho, { method: metodo || 'POST', body: {} })
        .then(function () { toast(msg, 'success'); return p.recarregarCiclos(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setBusy(null); });
    };
    var salvar = function () {
      var f = form;
      setBusy('form');
      var body = { nome: f.nome, abre_em: f.abre_em, fecha_em: f.fecha_em, esperadas: Number(f.esperadas), minimo_grupo: Number(f.minimo_grupo), minimo_pessoa: Number(f.minimo_pessoa) };
      (f.id ? api('/config/ciclos/' + f.id, { method: 'PUT', body: body }) : api('/config/ciclos', { method: 'POST', body: body }))
        .then(function (r) { toast(f.id ? 'Ciclo salvo' : 'Ciclo criado. Copie o link e mande pro time.', 'success'); setForm(null); return p.recarregarCiclos(r.ciclo && r.ciclo.id); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setBusy(null); });
    };
    var msgWhats = function (c) {
      return 'Oi, pessoal! O NPS de ' + c.nome + ' está no ar. É anônimo de verdade: não pede login, nome nem e-mail, e leva uns 6 minutos.\n\nResponda até ' + fD(c.fecha_em) + ': ' + linkNps(c) + '\n\nObrigado por ajudar a construir um lugar melhor para todo mundo!';
    };
    var set = function (k) { return function (e) { var v = e.target.value; setForm(function (f) { var n = Object.assign({}, f); n[k] = v; return n; }); }; };
    return h(Card, { label: 'Ciclos' },
      Titulo('Ciclos de NPS', 'um link anônimo por ciclo', Btn({ small: true, variant: 'pri', icon: 'plus', onClick: function () { setForm(proximoCiclo(p.cfg.esperadas_sugeridas)); }, children: 'Novo ciclo' })),
      ciclos.length ? ciclos.map(function (c) {
        var sit = SIT[c.situacao] || [c.situacao, 'cinza'];
        return h('div', { key: c.id, style: { border: '1px solid ' + (c.situacao === 'aberto' ? LILAS_BORDA : BORDA), background: c.situacao === 'aberto' ? LILAS_FUNDO : '#fff', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
            h('b', { style: { fontSize: 14 } }, c.nome), Pill(sit[0], sit[1])),
          h('span', { style: { fontSize: 12, color: CINZA2 } }, fD(c.abre_em) + ' a ' + fD(c.fecha_em) + ' · ' + (c.respostas || 0) + ' de ' + c.esperadas + ' respostas · mínimo ' + c.minimo_grupo + ' por grupo, ' + c.minimo_pessoa + ' por pessoa'),
          c.situacao === 'aberto' || c.situacao === 'agendado' ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            h('span', { style: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, wordBreak: 'break-all', background: '#fff', border: '1px solid ' + BORDA2, borderRadius: 8, padding: '6px 8px' } }, linkNps(c)),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              Btn({ small: true, variant: 'pri', icon: 'copy', onClick: function () { copiar(linkNps(c), toast, 'Link copiado'); }, children: 'Copiar link' }),
              Btn({ small: true, icon: 'message', onClick: function () { copiar(msgWhats(c), toast, 'Mensagem copiada. É só colar no WhatsApp.'); }, children: 'Mensagem pro WhatsApp' }))) : null,
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            Btn({ small: true, icon: 'pencil', onClick: function () { setForm({ id: c.id, nome: c.nome, abre_em: c.abre_em, fecha_em: c.fecha_em, esperadas: c.esperadas, minimo_grupo: c.minimo_grupo, minimo_pessoa: c.minimo_pessoa, respostas: c.respostas }); }, children: 'Editar' }),
            c.status === 'aberto' ? Btn({ small: true, icon: 'check', loading: busy === c.id + '/encerrar', disabled: !!busy, onClick: function () { acao(c.id, '/encerrar', 'POST', 'Ciclo encerrado. Resultados liberados.', 'Encerrar "' + c.nome + '"? O link para de aceitar respostas e os resultados abrem.'); }, children: 'Encerrar' })
              : Btn({ small: true, icon: 'refresh', loading: busy === c.id + '/reabrir', disabled: !!busy, onClick: function () { acao(c.id, '/reabrir', 'POST', 'Ciclo reaberto. Os resultados voltam a ficar fechados.', 'Reabrir "' + c.nome + '"? O link volta a aceitar respostas e os resultados ficam fechados até encerrar de novo.'); }, children: 'Reabrir' }),
            c.status === 'aberto' ? Btn({ small: true, icon: 'link', disabled: !!busy, onClick: function () { acao(c.id, '/novo-link', 'POST', 'Link novo gerado. O antigo parou de funcionar.', 'Gerar um link novo? O link antigo para de funcionar na hora.'); }, children: 'Novo link' }) : null,
            !c.respostas ? Btn({ small: true, variant: 'perigo', icon: 'trash', disabled: !!busy, onClick: function () { acao(c.id, '', 'DELETE', 'Ciclo excluído', 'Excluir o ciclo "' + c.nome + '"? Ele ainda não tem respostas.'); }, children: 'Excluir' }) : null));
      }) : h('div', { style: { color: CINZA, fontSize: 13, background: '#f9fafb', borderRadius: 10, padding: 14 } }, 'Nenhum ciclo ainda. Crie o primeiro: a Central gera o link anônimo para você mandar pro time.'),
      form ? h(Modal, { titulo: form.id ? 'Editar ciclo' : 'Novo ciclo', sub: form.id && form.respostas ? 'Com respostas já recebidas, os mínimos de anonimato só podem subir.' : 'As perguntas e a lista de pessoas do modelo atual vão para este ciclo.',
        onClose: function () { setForm(null); },
        rodape: [Btn({ key: 'c', onClick: function () { setForm(null); }, children: 'Cancelar' }), Btn({ key: 's', variant: 'pri', icon: 'save', loading: busy === 'form', disabled: busy === 'form', onClick: salvar, children: form.id ? 'Salvar ciclo' : 'Criar ciclo' })] },
        Campo('Nome', Inp({ value: form.nome, onChange: set('nome'), placeholder: 'Ex.: Outubro 2026' })),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 } },
          Campo('Abre em', Inp({ type: 'date', value: form.abre_em, onChange: set('abre_em') })),
          Campo('Fecha em', Inp({ type: 'date', value: form.fecha_em, onChange: set('fecha_em') }))),
        Campo('Respostas esperadas', Inp({ type: 'number', min: 0, value: form.esperadas, onChange: set('esperadas') }), 'Sugestão: ' + p.cfg.esperadas_sugeridas + ' colaboradores ativos. Ajuste por férias ou afastamento.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 } },
          Campo('Mínimo por grupo', Inp({ type: 'number', min: 3, max: 50, value: form.minimo_grupo, onChange: set('minimo_grupo') }), 'Abaixo disso o grupo entra só no total'),
          Campo('Mínimo por pessoa', Inp({ type: 'number', min: 2, max: 50, value: form.minimo_pessoa, onChange: set('minimo_pessoa') }), 'Avaliações para abrir o resumo'))) : null);
  }

  function GruposConfig(p) {
    var api = p.api, toast = p.toast, grupos = p.cfg.grupos || [];
    var s = useState(''), novo = s[0], setNovo = s[1];
    var sR = useState(null), ren = sR[0], setRen = sR[1];
    var sB = useState(false), busy = sB[0], setBusy = sB[1];
    var run = function (pr, msg) { setBusy(true); return pr.then(function () { toast(msg, 'success'); return p.recarregar(); }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setBusy(false); }); };
    var ativos = grupos.filter(function (g) { return g.ativo; }), inativos = grupos.filter(function (g) { return !g.ativo; });
    return h(Card, { label: 'Grupos do formulário' },
      Titulo('Grupos do formulário', 'é o que a pessoa marca. Grupo pequeno fica fácil de identificar quem respondeu.'),
      ativos.map(function (g) {
        var pequeno = g.membros < 5;
        var editando = ren && ren.id === g.id;
        return h('div', { key: g.id, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid ' + (pequeno ? '#fde68a' : BORDA), background: pequeno ? '#fffbeb' : '#fff', borderRadius: 12, flexWrap: 'wrap', minHeight: 44 } },
          editando ? Inp({ value: ren.nome, autoFocus: true, onChange: function (e) { setRen({ id: g.id, nome: e.target.value }); }, style: { flex: '1 1 160px', height: 36 }, 'aria-label': 'Nome do grupo' })
            : h('span', { style: { flex: '1 1 160px', minWidth: 0 } }, h('b', null, g.nome), h('span', { style: { color: CINZA } }, ' · ' + plural(g.membros, 'pessoa', 'pessoas'))),
          !editando ? (pequeno ? Pill('junte com outro grupo', 'ambar') : Pill('seguro', 'verde')) : null,
          editando ? h(React.Fragment, null,
            Btn({ small: true, variant: 'pri', disabled: busy, onClick: function () { run(api('/config/grupos/' + g.id, { method: 'PUT', body: { nome: ren.nome } }), 'Grupo renomeado').then(function () { setRen(null); }); }, children: 'Salvar' }),
            Btn({ small: true, onClick: function () { setRen(null); }, children: 'Cancelar' }))
            : h(React.Fragment, null,
              Btn({ small: true, variant: 'link', icon: 'pencil', onClick: function () { setRen({ id: g.id, nome: g.nome }); }, ariaLabel: 'Renomear ' + g.nome, children: 'Renomear' }),
              Btn({ small: true, variant: 'link', icon: 'archive', disabled: busy, onClick: function () { if (window.confirm('Desativar o grupo "' + g.nome + '"? Quem está nele fica sem grupo e ele some do formulário.')) run(api('/config/grupos/' + g.id, { method: 'PUT', body: { ativo: false } }), 'Grupo desativado'); }, ariaLabel: 'Desativar ' + g.nome, children: 'Desativar', style: { color: CINZA2 } })));
      }),
      inativos.length ? h('details', null, h('summary', { style: { cursor: 'pointer', fontSize: 12.5, color: CINZA2 } }, plural(inativos.length, 'grupo desativado', 'grupos desativados')),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 } }, inativos.map(function (g) {
          return h('div', { key: g.id, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 10px', background: '#f9fafb', borderRadius: 10 } }, h('span', { style: { color: CINZA2 } }, g.nome),
            Btn({ small: true, variant: 'link', icon: 'refresh', disabled: busy, onClick: function () { run(api('/config/grupos/' + g.id, { method: 'PUT', body: { ativo: true } }), 'Grupo reativado'); }, children: 'Reativar' }));
        }))) : null,
      h('form', { onSubmit: function (e) { e.preventDefault(); if (!novo.trim()) return; run(api('/config/grupos', { method: 'POST', body: { nome: novo } }), 'Grupo criado').then(function () { setNovo(''); }); }, style: { display: 'flex', gap: 8 } },
        Inp({ value: novo, onChange: function (e) { setNovo(e.target.value); }, placeholder: 'Nome do novo grupo', 'aria-label': 'Nome do novo grupo', style: { flex: 1 } }),
        Btn({ type: 'submit', icon: 'plus', disabled: busy || !novo.trim(), children: 'Criar grupo' })));
  }

  function ColaboradoresConfig(p) {
    var api = p.api, toast = p.toast, cfg = p.cfg;
    var lista = cfg.colaboradores || [];
    var grupos = (cfg.grupos || []).filter(function (g) { return g.ativo; });
    var s = useState(null), form = s[0], setForm = s[1];
    var sB = useState(null), busy = sB[0], setBusy = sB[1];
    var sQ = useState(''), busca = sQ[0], setBusca = sQ[1];
    var sI = useState(false), verInativos = sI[0], setVerInativos = sI[1];
    var ativos = lista.filter(function (c) { return c.ativo; });
    var atualizar = function (c, campos, msg) {
      setBusy(c.id);
      api('/config/colaboradores/' + c.id, { method: 'PUT', body: campos })
        .then(function () { if (msg) toast(msg, 'success'); return p.recarregar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setBusy(null); });
    };
    var salvarForm = function () {
      setBusy('form');
      var body = { nome: form.nome, cargo: form.cargo, grupo_id: form.grupo_id ? Number(form.grupo_id) : null, avaliacao: form.avaliacao };
      (form.id ? api('/config/colaboradores/' + form.id, { method: 'PUT', body: body }) : api('/config/colaboradores', { method: 'POST', body: body }))
        .then(function () { toast(form.id ? 'Colaborador salvo' : 'Colaborador adicionado', 'success'); setForm(null); return p.recarregar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setBusy(null); });
    };
    var excluir = function (c) {
      if (!window.confirm('Excluir "' + c.nome + '"? Se a pessoa já foi avaliada em algum ciclo, ela só é desativada para não perder o histórico.')) return;
      setBusy(c.id);
      api('/config/colaboradores/' + c.id, { method: 'DELETE' })
        .then(function (r) { toast(r.desativado ? c.nome + ' já tinha avaliações, então foi desativado(a) em vez de excluído(a).' : c.nome + ' excluído(a)', 'success'); setForm(null); return p.recarregar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setBusy(null); });
    };
    var q = busca.trim().toLowerCase();
    var vis = lista.filter(function (c) { return (verInativos || c.ativo) && (!q || (c.nome + ' ' + (c.cargo || '')).toLowerCase().indexOf(q) >= 0); });
    var gOpts = [['', 'Sem grupo']].concat(grupos.map(function (g) { return [g.id, g.nome]; }));
    var th = function (t, w) { return h('th', { key: t, style: { textAlign: 'left', fontSize: 11.5, color: CINZA, fontWeight: 700, padding: '8px 8px', borderBottom: '1px solid ' + BORDA, whiteSpace: 'nowrap', width: w || null } }, t); };
    var td = { padding: '6px 8px', borderBottom: '1px solid ' + BORDA2, verticalAlign: 'middle' };
    return h(Card, { label: 'Colaboradores' },
      Titulo('Colaboradores', ativos.length + ' ativos · quem aparece para ser avaliado no formulário', Btn({ small: true, variant: 'pri', icon: 'plus', onClick: function () { setForm({ nome: '', cargo: '', grupo_id: grupos[0] ? grupos[0].id : '', avaliacao: 'equipe' }); }, children: 'Adicionar colaborador' })),
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' } },
        Inp({ type: 'search', value: busca, onChange: function (e) { setBusca(e.target.value); }, placeholder: 'Buscar por nome ou cargo', 'aria-label': 'Buscar colaborador', style: { flex: '1 1 200px' } }),
        h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: CINZA2, minHeight: 40 } },
          h('input', { type: 'checkbox', checked: verInativos, onChange: function (e) { setVerInativos(e.target.checked); }, style: { accentColor: ROXO, width: 16, height: 16 } }), 'Mostrar inativos')),
      h('div', { style: { overflowX: 'auto', margin: '0 -4px' } },
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 } },
          h('thead', null, h('tr', null, th('Nome'), th('Cargo'), th('Grupo', 170), th('No formulário', 150), th('Ativo', 60), th('', 50))),
          h('tbody', null, vis.map(function (c) {
            return h('tr', { key: c.id, className: 'rh-linha', style: { opacity: c.ativo ? 1 : 0.6 } },
              h('td', { style: Object.assign({}, td, { fontWeight: 600 }) }, c.nome),
              h('td', { style: Object.assign({}, td, { color: TEXTO2 }) }, c.cargo || '—'),
              h('td', { style: td }, c.avaliacao === 'setor' ? h('span', { style: { color: CINZA, fontSize: 12 } }, 'não conta (setor)')
                : Sel({ value: c.grupo_id || '', disabled: busy === c.id, 'aria-label': 'Grupo de ' + c.nome, onChange: function (e) { atualizar(c, { grupo_id: e.target.value ? Number(e.target.value) : null }, 'Grupo atualizado'); }, style: { height: 36 } }, gOpts)),
              h('td', { style: td }, Sel({ value: c.avaliacao, disabled: busy === c.id, 'aria-label': 'Como ' + c.nome + ' aparece no formulário', onChange: function (e) { atualizar(c, { avaliacao: e.target.value }, 'Atualizado'); }, style: { height: 36 } }, AVAL)),
              h('td', { style: td }, h('button', { type: 'button', role: 'switch', 'aria-checked': c.ativo, 'aria-label': (c.ativo ? 'Desativar ' : 'Ativar ') + c.nome, disabled: busy === c.id, onClick: function () { atualizar(c, { ativo: !c.ativo }, c.ativo ? c.nome + ' desativado(a)' : c.nome + ' ativado(a)'); },
                className: 'rh-btn', style: { border: 0, background: 'transparent', padding: 0, cursor: 'pointer', minHeight: 40, display: 'flex', alignItems: 'center' } },
                h('span', { 'aria-hidden': 'true', style: { width: 36, height: 20, borderRadius: 99, position: 'relative', background: c.ativo ? ROXO : '#d1d5db', transition: 'background .15s' } },
                  h('span', { style: { position: 'absolute', top: 3, left: c.ativo ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .15s' } })))),
              h('td', { style: td }, h('button', { type: 'button', 'aria-label': 'Editar ' + c.nome, title: 'Editar', className: 'rh-btn rh-btn-sec', onClick: function () { setForm({ id: c.id, nome: c.nome, cargo: c.cargo || '', grupo_id: c.grupo_id || '', avaliacao: c.avaliacao }); },
                style: { width: 36, height: 36, borderRadius: 9, border: '1px solid ' + BORDA, background: '#fff', color: TEXTO2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, ico('pencil', 15))));
          })))),
      !vis.length ? h('div', { style: { color: CINZA, textAlign: 'center', padding: 14 } }, q ? 'Ninguém com essa busca.' : 'Nenhum colaborador ainda. Adicione quem vai aparecer no formulário.') : null,
      h('span', { style: { fontSize: 11.5, color: CINZA, lineHeight: 1.5 } }, 'Líder e Equipe aparecem para serem avaliados e contam na adesão. Setor aparece para ser avaliado mas não conta. "Não avaliado" conta na adesão e não aparece na lista. Mudanças valem para ciclos que ainda não têm respostas.'),
      form ? h(Modal, { titulo: form.id ? 'Editar colaborador' : 'Adicionar colaborador', onClose: function () { setForm(null); },
        rodape: [form.id ? Btn({ key: 'x', variant: 'perigo', icon: 'trash', disabled: busy === form.id, onClick: function () { excluir(form); }, style: { marginRight: 'auto' }, children: 'Excluir' }) : null,
          Btn({ key: 'c', onClick: function () { setForm(null); }, children: 'Cancelar' }),
          Btn({ key: 's', variant: 'pri', icon: 'save', loading: busy === 'form', disabled: busy === 'form' || !form.nome.trim(), onClick: salvarForm, children: form.id ? 'Salvar' : 'Adicionar' })] },
        Campo('Nome', Inp({ value: form.nome, autoFocus: true, onChange: function (e) { var v = e.target.value; setForm(function (f) { return Object.assign({}, f, { nome: v }); }); } })),
        Campo('Cargo', Inp({ value: form.cargo, onChange: function (e) { var v = e.target.value; setForm(function (f) { return Object.assign({}, f, { cargo: v }); }); }, placeholder: 'Ex.: Monitoramento' })),
        Campo('Como aparece no formulário', Sel({ value: form.avaliacao, onChange: function (e) { var v = e.target.value; setForm(function (f) { return Object.assign({}, f, { avaliacao: v }); }); } }, AVAL)),
        form.avaliacao !== 'setor' ? Campo('Grupo', Sel({ value: form.grupo_id || '', onChange: function (e) { var v = e.target.value; setForm(function (f) { return Object.assign({}, f, { grupo_id: v }); }); } }, gOpts)) : null) : null);
  }

  // perguntas
  function opcoesParaTexto(ops) { return (ops || []).map(function (o) { return o.label + (o.desc ? ' — ' + o.desc : ''); }).join('\n'); }
  function textoParaOpcoes(txt, antigas) {
    return String(txt || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var i = l.indexOf(' — '); if (i < 0) i = l.indexOf(' - ');
      var label = i >= 0 ? l.slice(0, i).trim() : l, desc = i >= 0 ? l.slice(i + 3).trim() : '';
      var velha = (antigas || []).find(function (o) { return o.label === label; });
      var o = { label: label }; if (velha) o.id = velha.id; if (desc) o.desc = desc;
      return o;
    });
  }
  function PerguntasConfig(p) {
    var api = p.api, toast = p.toast;
    var base = p.cfg.modelo || { secoes: [], perguntas: [] };
    var s = useState(function () { return JSON.parse(JSON.stringify(base)); }), modelo = s[0], setModelo = s[1];
    var sEd = useState(null), ed = sEd[0], setEd = sEd[1]; // {idx, p, opcoesTxt}
    var sB = useState(false), busy = sB[0], setBusy = sB[1];
    useEffect(function () { setModelo(JSON.parse(JSON.stringify(p.cfg.modelo || { secoes: [], perguntas: [] }))); }, [p.cfg.modelo]);
    var sujo = JSON.stringify(modelo) !== JSON.stringify(base);
    var mover = function (i, d) { setModelo(function (m) { var n = JSON.parse(JSON.stringify(m)); var j = i + d; if (j < 0 || j >= n.perguntas.length) return m; var t = n.perguntas[i]; n.perguntas[i] = n.perguntas[j]; n.perguntas[j] = t; return n; }); };
    var remover = function (i) { var q = modelo.perguntas[i]; if (!window.confirm('Remover a pergunta "' + q.texto.slice(0, 80) + '"?')) return; setModelo(function (m) { var n = JSON.parse(JSON.stringify(m)); n.perguntas.splice(i, 1); return n; }); };
    var abrir = function (i) {
      var q = i == null ? { tipo: 'unica', texto: '', secao: (modelo.secoes[0] || {}).id || 's1', obrigatoria: true, opcoes: [] } : JSON.parse(JSON.stringify(modelo.perguntas[i]));
      setEd({ idx: i, q: q, opcoesTxt: opcoesParaTexto(q.opcoes), novaSecao: '' });
    };
    var aplicarEd = function () {
      var q = Object.assign({}, ed.q);
      if (!String(q.texto || '').trim()) { toast('Escreva o texto da pergunta.', 'error'); return; }
      var sec = modelo.secoes.slice();
      if (q.secao === '__nova') {
        if (!ed.novaSecao.trim()) { toast('Dê um nome para a nova etapa.', 'error'); return; }
        var nid = 's' + (Date.now() % 100000); sec.push({ id: nid, titulo: ed.novaSecao.trim() }); q.secao = nid;
      }
      if (q.tipo === 'unica' || q.tipo === 'multipla') {
        q.opcoes = textoParaOpcoes(ed.opcoesTxt, ed.q.opcoes);
        if (q.opcoes.length < 2) { toast('Coloque pelo menos 2 opções, uma por linha.', 'error'); return; }
      } else delete q.opcoes;
      if (q.tipo !== 'unica') delete q.escala;
      if (q.tipo !== 'nota10') delete q.enps;
      setModelo(function (m) { var n = JSON.parse(JSON.stringify(m)); n.secoes = sec; if (ed.idx == null) n.perguntas.push(q); else n.perguntas[ed.idx] = q; return n; });
      setEd(null);
    };
    var salvar = function () {
      setBusy(true);
      api('/config/modelo', { method: 'PUT', body: { modelo: modelo } })
        .then(function (r) { toast('Perguntas salvas. ' + (r.ciclos_atualizados ? 'Já valem para ' + plural(r.ciclos_atualizados, 'ciclo sem respostas', 'ciclos sem respostas') + '.' : 'Valem para os próximos ciclos (e ciclos sem respostas).'), 'success'); return p.recarregar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setBusy(false); });
    };
    var restaurar = function () {
      if (!window.confirm('Restaurar o modelo padrão (igual ao formulário original)? Suas mudanças nas perguntas se perdem. Ciclos com respostas não mudam.')) return;
      setBusy(true);
      api('/config/modelo/restaurar', { method: 'POST', body: {} }).then(function () { toast('Modelo padrão restaurado', 'success'); return p.recarregar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setBusy(false); });
    };
    var porSecao = modelo.secoes.map(function (sc) { return { sc: sc, itens: modelo.perguntas.map(function (q, i) { return { q: q, i: i }; }).filter(function (x) { return x.q.secao === sc.id; }) }; });
    var orfas = modelo.perguntas.map(function (q, i) { return { q: q, i: i }; }).filter(function (x) { return !modelo.secoes.some(function (sc) { return sc.id === x.q.secao; }); });
    if (orfas.length) porSecao.push({ sc: { id: '?', titulo: 'Sem etapa' }, itens: orfas });
    var setQ = function (k, v) { setEd(function (e) { var n = Object.assign({}, e); n.q = Object.assign({}, e.q); n.q[k] = v; return n; }); };
    return h(Card, { label: 'Perguntas do formulário' },
      Titulo('Perguntas do formulário', 'Mudanças valem para os próximos ciclos e para ciclos que ainda não têm respostas',
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          Btn({ small: true, icon: 'refresh', disabled: busy, onClick: restaurar, children: 'Restaurar padrão' }),
          Btn({ small: true, icon: 'plus', onClick: function () { abrir(null); }, children: 'Nova pergunta' }))),
      porSecao.map(function (bloco, bi) {
        return h('div', { key: bloco.sc.id, style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          h('span', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: CINZA, textTransform: 'uppercase', marginTop: bi ? 6 : 0 } }, 'Etapa ' + (bi + 1) + ' · ' + bloco.sc.titulo),
          bloco.itens.map(function (x) {
            var q = x.q, i = x.i;
            return h('div', { key: q.id || i, className: 'rh-linha', style: { display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', border: '1px solid ' + BORDA2, borderRadius: 12, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 11, fontWeight: 700, color: ROXO_ESC, background: LILAS, borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap' } }, (TIPO_ROT[q.tipo] || q.tipo) + (q.escala ? ' · escala' : '') + (q.enps ? ' · eNPS' : '')),
              h('span', { style: { flex: '1 1 220px', minWidth: 0, lineHeight: 1.4 } }, q.texto,
                !q.obrigatoria ? h('span', { style: { color: CINZA, fontSize: 12 } }, ' · opcional') : null,
                q.mostrarSe ? h('span', { style: { color: CINZA, fontSize: 12 } }, ' · só se "' + q.mostrarSe.pergunta + '" = ' + q.mostrarSe.valor) : null),
              h('div', { style: { display: 'flex', gap: 2 } },
                [['arrowdown', 'Subir', -1, { transform: 'rotate(180deg)' }], ['arrowdown', 'Descer', 1, null]].map(function (b) {
                  return h('button', { key: b[1], type: 'button', 'aria-label': b[1] + ' pergunta', title: b[1], className: 'rh-btn rh-btn-sec', onClick: function () { mover(i, b[2]); }, disabled: (b[2] < 0 && i === 0) || (b[2] > 0 && i === modelo.perguntas.length - 1),
                    style: { width: 34, height: 34, borderRadius: 8, border: '1px solid ' + BORDA, background: '#fff', color: TEXTO2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, ico(b[0], 14, b[3]));
                }),
                h('button', { type: 'button', 'aria-label': 'Editar pergunta', title: 'Editar', className: 'rh-btn rh-btn-sec', onClick: function () { abrir(i); }, style: { width: 34, height: 34, borderRadius: 8, border: '1px solid ' + BORDA, background: '#fff', color: TEXTO2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, ico('pencil', 14)),
                h('button', { type: 'button', 'aria-label': 'Remover pergunta', title: 'Remover', className: 'rh-btn rh-btn-sec', onClick: function () { remover(i); }, style: { width: 34, height: 34, borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, ico('trash', 14))));
          }));
      }),
      sujo ? h('div', { style: { position: 'sticky', bottom: 8, background: ROXO_FUNDO, color: '#fff', borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', boxShadow: '0 -6px 24px rgba(58,21,86,.18)' } },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, h('span', { style: { width: 8, height: 8, borderRadius: 99, background: LARANJA } }), h('b', null, 'Perguntas alteradas, ainda não salvas')),
        h('div', { style: { display: 'flex', gap: 8 } },
          Btn({ small: true, variant: 'claro', onClick: function () { setModelo(JSON.parse(JSON.stringify(base))); }, children: 'Descartar' }),
          Btn({ small: true, icon: 'save', loading: busy, disabled: busy, onClick: salvar, style: { background: '#fff', color: ROXO_ESC, borderColor: '#fff' }, children: 'Salvar perguntas' }))) : null,
      ed ? h(Modal, { titulo: ed.idx == null ? 'Nova pergunta' : 'Editar pergunta', largura: 620, onClose: function () { setEd(null); },
        rodape: [Btn({ key: 'c', onClick: function () { setEd(null); }, children: 'Cancelar' }), Btn({ key: 'a', variant: 'pri', icon: 'check', onClick: aplicarEd, children: 'Aplicar' })] },
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
          Campo('Tipo', Sel({ value: ed.q.tipo, onChange: function (e) { setQ('tipo', e.target.value); } }, TIPOS)),
          Campo('Etapa', Sel({ value: ed.q.secao, onChange: function (e) { setQ('secao', e.target.value); } }, modelo.secoes.map(function (sc, i) { return [sc.id, (i + 1) + ' · ' + sc.titulo]; }).concat([['__nova', '+ Nova etapa']])))),
        ed.q.secao === '__nova' ? Campo('Nome da nova etapa', Inp({ value: ed.novaSecao, onChange: function (e) { var v = e.target.value; setEd(function (x) { return Object.assign({}, x, { novaSecao: v }); }); } })) : null,
        Campo('Pergunta', h('textarea', { value: ed.q.texto, rows: 3, onChange: function (e) { setQ('texto', e.target.value); }, style: Object.assign({}, INP, { height: 'auto', padding: '9px 11px', resize: 'vertical', lineHeight: 1.45 }) })),
        Campo('Texto de ajuda (opcional)', Inp({ value: ed.q.ajuda || '', onChange: function (e) { setQ('ajuda', e.target.value); } })),
        ed.q.tipo === 'unica' || ed.q.tipo === 'multipla' ? Campo('Opções, uma por linha', h('textarea', { value: ed.opcoesTxt, rows: 6, onChange: function (e) { var v = e.target.value; setEd(function (x) { return Object.assign({}, x, { opcoesTxt: v }); }); },
          style: Object.assign({}, INP, { height: 'auto', padding: '9px 11px', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }) }), 'Para descrição use "Opção — descrição". Em escala, da pior para a melhor.') : null,
        ed.q.tipo === 'pessoas' ? h('span', { style: { fontSize: 12, color: CINZA } }, 'A lista de pessoas vem da tabela de colaboradores. Cada pessoa marcada recebe um campo de texto.') : null,
        ed.q.tipo === 'sensivel' ? h('span', { style: { fontSize: 12, color: CINZA } }, 'A resposta vai separada, só para quem tem a aba Espaço sensível.') : null,
        h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap' } },
          h('label', { style: { display: 'inline-flex', gap: 8, alignItems: 'center', minHeight: 40, fontSize: 13 } }, h('input', { type: 'checkbox', checked: !!ed.q.obrigatoria, onChange: function (e) { setQ('obrigatoria', e.target.checked); }, style: { accentColor: ROXO, width: 18, height: 18 } }), 'Obrigatória'),
          ed.q.tipo === 'unica' ? h('label', { style: { display: 'inline-flex', gap: 8, alignItems: 'center', minHeight: 40, fontSize: 13 } }, h('input', { type: 'checkbox', checked: !!ed.q.escala, onChange: function (e) { setQ('escala', e.target.checked); }, style: { accentColor: ROXO, width: 18, height: 18 } }), 'É uma escala (gráfico de % positivo)') : null,
          ed.q.tipo === 'nota10' ? h('label', { style: { display: 'inline-flex', gap: 8, alignItems: 'center', minHeight: 40, fontSize: 13 } }, h('input', { type: 'checkbox', checked: !!ed.q.enps, onChange: function (e) { setQ('enps', e.target.checked); }, style: { accentColor: ROXO, width: 18, height: 18 } }), 'Usar no eNPS') : null)) : null);
  }
})();
