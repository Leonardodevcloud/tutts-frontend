/* METAS_BONUS_V1 */
/* METAS_BONUS_V2: base por todos os clientes / clientes escolhidos; origem de cada métrica */
// ============================================================
// METAS E BONIFICAÇÃO DO TIME INTERNO — FRONTEND v1
// Aba "Metas" do Meu Painel (master configura, fecha e paga) e
// aba "Minha meta" (cada um vê só a própria apuração).
// Vanilla JS + React via CDN (sem JSX).
// Expõe window.PainelMetasMaster e window.PainelMinhaMeta.
// ============================================================

(function () {
  'use strict';
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef, useCallback = React.useCallback;

  // ─── cores / tipografia ───
  var C = { roxo: '#770fa8', roxoEsc: '#5d0b85', roxoTxt: '#3a1556', lilas: '#f3e8fb', lilasBorda: '#e9d5f9', lilasFundo: '#faf5ff', lilasMed: '#c4a5e0',
    cinza: '#6b7280', cinzaEsc: '#374151', borda: '#e5e7eb', bordaLeve: '#f3f4f6', fundo: '#f9fafb',
    ambar: '#92400e', ambarFundo: '#fffbeb', ambarBorda: '#fde68a', verm: '#b91c1c', vermFundo: '#fef2f2', vermBorda: '#fca5a5', verde: '#15803d', azul: '#1d4ed8', azulFundo: '#eff6ff' };
  var SORA = 'Sora, Inter, system-ui, sans-serif';
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var MESES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  // ─── helpers ───
  function ico(nome, px, extra) { return h('svg', { className: 'ico', style: Object.assign({ width: px || 16, height: px || 16, flex: 'none' }, extra || {}), 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome })); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function compHoje() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
  function compMais(c, n) { var p = c.split('-').map(Number); var d = new Date(p[0], p[1] - 1 + n, 1); return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }
  function compNome(c) { var p = String(c).split('-').map(Number); return MESES[p[1] - 1] + ' ' + p[0]; }
  function compCurto(c) { var p = String(c).split('-').map(Number); return MESES_C[p[1] - 1] + '/' + String(p[0]).slice(2); }
  function num2(v, d) { if (v == null || isNaN(v)) return '—'; var dd = d == null ? 2 : d; return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dd, maximumFractionDigits: dd }); }
  function brl(v) { return v == null ? '—' : 'R$ ' + num2(v); }
  function pct(v) { if (v == null || isNaN(v)) return '—'; var r = Math.round(v * 100) / 100; return (Math.abs(r - Math.round(r)) < 0.005 ? String(Math.round(r)) : num2(r)) + '%'; }
  function inteiro(v) { return v == null ? '—' : Number(v).toLocaleString('pt-BR'); }
  function iniciais(nome) { return String(nome || '?').trim().split(/\s+/).slice(0, 2).map(function (p) { return p[0]; }).join('').toUpperCase(); }
  function fmtDataHora(iso) { if (!iso) return '—'; var d = new Date(iso); return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function numBR(s) { if (s == null) return null; var t = String(s).trim(); if (!t) return null; if (/,\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); var n = Number(t); return isFinite(n) ? n : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function unidadeTxt(u, v) { return u === 'pct' ? pct(v) : u === 'min' ? num2(v, 1) + ' min' : (inteiro(v) + (Number(v) === 1 ? ' dia' : ' dias')); }
  var ORIGEM = { bi: ['BI', C.roxoEsc, C.lilas], painel: ['Meu Painel', C.azul, C.azulFundo], manual: ['Manual', C.ambar, C.ambarFundo] };

  // estilo do "pill" do múltiplo
  function pillMult(meta) {
    var base = { fontSize: 12, fontWeight: 700, borderRadius: 99, padding: '1px 9px', whiteSpace: 'nowrap', display: 'inline-block' };
    if (meta.desconsiderada) return Object.assign(base, { color: '#9ca3af', background: C.bordaLeve, textDecoration: 'line-through' });
    if (meta.pendente || meta.multiplo == null) return Object.assign(base, { color: C.verm, background: C.vermFundo, border: '1px dashed ' + C.vermBorda });
    return Object.assign(base, estiloPorMult(meta.multiplo));
  }
  function estiloPorMult(m) {
    if (m >= 120) return { color: '#fff', background: C.roxoEsc };
    if (m >= 90) return { color: C.roxoEsc, background: C.lilas };
    if (m >= 50) return { color: C.ambar, background: C.ambarFundo, border: '1px solid ' + C.ambarBorda };
    return { color: C.verm, background: C.vermFundo, border: '1px solid ' + C.vermBorda };
  }
  function corFaixa(mult) { return mult >= 120 ? '#c4a5e0' : mult >= 100 ? '#e9d5f9' : mult >= 50 ? '#fde68a' : '#fecaca'; }
  function nomeCurto(id, nome) { return { clientes_prof: 'Clientes/prof.', digisac: 'Digisac', comolatti: 'Comolatti', porto_seco: 'Porto Seco', comando: 'Comando' }[id] || nome; }

  function useApi(api, fetchAuth) {
    return useCallback(async function (rota, opts) {
      var o = opts || {};
      var r = await (fetchAuth || window.fetchAuth || fetch)(api + rota, Object.assign({}, o, { headers: Object.assign({ 'Content-Type': 'application/json' }, o.headers || {}), body: o.body != null ? JSON.stringify(o.body) : undefined }));
      var d = null; try { d = await r.json(); } catch (_) { d = {}; }
      if (!r.ok || d.success === false) { var e = new Error((d && d.error) || ('Erro ' + r.status)); e.status = r.status; throw e; }
      return d;
    }, [api, fetchAuth]);
  }

  // ─── UI básicos ───
  var S = {
    card: { background: '#fff', border: '1px solid ' + C.borda, borderRadius: 14 },
    btn: { height: 40, padding: '0 14px', borderRadius: 10, background: '#fff', color: C.cinzaEsc, border: '1px solid ' + C.borda, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontFamily: 'inherit' },
    btnP: { height: 40, padding: '0 14px', borderRadius: 10, background: C.roxo, color: '#fff', border: 0, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontFamily: 'inherit' },
    btnS: { height: 30, padding: '0 10px', borderRadius: 8, background: '#fff', color: C.cinzaEsc, border: '1px solid ' + C.borda, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
    inp: { height: 40, border: '1px solid ' + C.borda, borderRadius: 9, padding: '0 10px', fontSize: 13, fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box', color: '#111827' },
    lbl: { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 600, color: C.cinzaEsc },
    sub: { fontSize: 12, color: C.cinza },
    chip: function (on) { return { height: 30, padding: '0 10px', borderRadius: 99, border: on ? 0 : '1px solid ' + C.borda, background: on ? C.roxoEsc : '#fff', color: on ? '#fff' : C.cinzaEsc, fontSize: 12, fontWeight: on ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit' }; },
    origem: function (o) { var x = ORIGEM[o] || ORIGEM.bi; return { fontSize: 10, fontWeight: 700, color: x[1], background: x[2], borderRadius: 99, padding: '1px 7px', whiteSpace: 'nowrap' }; },
  };
  function Btn(p) { return h('button', Object.assign({ type: 'button' }, p, { style: Object.assign({}, p.primario ? S.btnP : p.pequeno ? S.btnS : S.btn, p.disabled ? { opacity: 0.55, cursor: 'not-allowed' } : {}, p.style || {}), primario: undefined, pequeno: undefined })); }
  function Carregando() { return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 }, 'aria-busy': 'true' }, [0, 1, 2].map(function (i) { return h('div', { key: i, style: { height: i ? 64 : 96, borderRadius: 14, background: 'linear-gradient(90deg,#f3f4f6,#faf5ff,#f3f4f6)', backgroundSize: '200% 100%', animation: 'metasSk 1.2s linear infinite' } }); })); }
  function Avatar(p) { var s = p.size || 34; if (p.foto) return h('img', { src: p.foto, alt: '', style: { width: s, height: s, borderRadius: '50%', objectFit: 'cover', flex: 'none' } }); return h('span', { 'aria-hidden': 'true', style: { width: s, height: s, borderRadius: '50%', background: C.lilas, color: C.roxoEsc, fontWeight: 700, display: 'grid', placeItems: 'center', flex: 'none', fontSize: Math.round(s * 0.38) } }, iniciais(p.nome)); }
  function StatusPill(p) {
    var m = { aberto: ['Aberto', C.ambar, C.ambarFundo, C.ambarBorda], fechado: ['Fechado', C.roxoEsc, C.lilas, C.lilasBorda], pago: ['Pago', C.verde, '#f0fdf4', '#bbf7d0'] }[p.status || 'aberto'];
    return h('span', { style: { fontSize: 11, fontWeight: 700, color: m[1], background: m[2], border: '1px solid ' + m[3], borderRadius: 99, padding: '1px 8px' } }, m[0]);
  }
  function SeletorMes(p) {
    var max = compHoje();
    return h('div', { style: { display: 'flex', alignItems: 'center', border: '1px solid ' + C.borda, background: '#fff', borderRadius: 10, height: 40 } },
      h('button', { type: 'button', 'aria-label': 'Mês anterior', onClick: function () { p.onChange(compMais(p.comp, -1)); }, style: { width: 36, height: 38, border: 0, background: 'none', cursor: 'pointer', color: C.cinzaEsc, display: 'grid', placeItems: 'center' } }, ico('arrowleft', 15)),
      h('span', { style: { padding: '0 6px', fontWeight: 600, whiteSpace: 'nowrap' } }, compNome(p.comp)),
      p.status && h(StatusPill, { status: p.status }),
      h('button', { type: 'button', 'aria-label': 'Próximo mês', disabled: p.comp >= max, onClick: function () { p.onChange(compMais(p.comp, 1)); }, style: { width: 36, height: 38, border: 0, background: 'none', cursor: p.comp >= max ? 'default' : 'pointer', color: p.comp >= max ? '#d1d5db' : C.cinzaEsc, display: 'grid', placeItems: 'center' } }, ico('arrowright', 15)));
  }

  // ─── diálogo / drawer com foco preso ───
  var PILHA = []; // overlays abertos: só o de cima responde ao Esc / Tab
  function usePrenderFoco(ref, ativo, onFechar) {
    var cb = useRef(onFechar); cb.current = onFechar;
    useEffect(function () {
      if (!ativo || !ref.current) return undefined;
      var anterior = document.activeElement;
      var el = ref.current;
      PILHA.push(el);
      var foc = function () { return Array.prototype.slice.call(el.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')).filter(function (x) { return x.offsetParent !== null; }); };
      var t = setTimeout(function () { if (!el.contains(document.activeElement)) { var f = foc(); if (f[0]) f[0].focus(); } }, 30);
      var onKey = function (e) {
        if (PILHA[PILHA.length - 1] !== el) return;
        if (e.key === 'Escape') { e.preventDefault(); cb.current && cb.current(); return; }
        if (e.key !== 'Tab') return;
        var f = foc(); if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (!el.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? z : a).focus(); }
        else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      };
      document.addEventListener('keydown', onKey);
      return function () { clearTimeout(t); document.removeEventListener('keydown', onKey); var i = PILHA.indexOf(el); if (i >= 0) PILHA.splice(i, 1); if (anterior && anterior.focus && document.contains(anterior)) try { anterior.focus(); } catch (_) {} };
    }, [ativo]);
  }
  function useLargura(min) {
    var mq = '(min-width: ' + min + 'px)';
    var [ok, setOk] = useState(function () { return !window.matchMedia || window.matchMedia(mq).matches; });
    useEffect(function () { if (!window.matchMedia) return undefined; var m = window.matchMedia(mq); var f = function () { setOk(m.matches); }; f(); m.addEventListener ? m.addEventListener('change', f) : m.addListener(f); return function () { m.removeEventListener ? m.removeEventListener('change', f) : m.removeListener(f); }; }, [mq]);
    return ok;
  }
  function Drawer(p) {
    var ref = useRef(null);
    usePrenderFoco(ref, true, p.onFechar);
    return h('div', { style: { position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end' } },
      h('div', { onClick: p.onFechar, style: { position: 'absolute', inset: 0, background: 'rgba(17,24,39,.35)' } }),
      h('div', { ref: ref, role: 'dialog', 'aria-modal': 'true', 'aria-label': p.titulo, style: { position: 'relative', width: 'min(620px, 100vw)', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(17,24,39,.12)', animation: 'metasIn .18s ease-out' } },
        h('div', { style: { padding: '16px 20px', borderBottom: '1px solid ' + C.bordaLeve, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 } },
          h('div', { style: { minWidth: 0 } }, h('div', { style: { fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: C.cinza, textTransform: 'uppercase' } }, p.sobretitulo), h('h2', { style: { margin: '2px 0 0', fontFamily: SORA, fontSize: 20, color: C.roxoTxt } }, p.titulo)),
          h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' } }, p.acoes || null,
            h('button', { type: 'button', 'aria-label': 'Fechar', onClick: p.onFechar, style: { width: 36, height: 36, borderRadius: 9, border: '1px solid ' + C.borda, background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.cinzaEsc } }, ico('x', 16)))),
        h('div', { style: { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 } }, p.children),
        p.rodape && h('div', { style: { padding: '12px 20px', borderTop: '1px solid ' + C.bordaLeve, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }, p.rodape)));
  }
  function Confirmar(p) {
    var ref = useRef(null);
    usePrenderFoco(ref, true, p.onCancelar);
    return h('div', { style: { position: 'fixed', inset: 0, zIndex: 70, display: 'grid', placeItems: 'center', padding: 16 } },
      h('div', { onClick: p.onCancelar, style: { position: 'absolute', inset: 0, background: 'rgba(17,24,39,.45)' } }),
      h('div', { ref: ref, role: 'alertdialog', 'aria-modal': 'true', 'aria-label': p.titulo, style: { position: 'relative', background: '#fff', borderRadius: 16, width: 'min(460px, 100%)', boxShadow: '0 20px 50px rgba(17,24,39,.25)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 } },
        h('h3', { style: { margin: 0, fontFamily: SORA, fontSize: 17, color: C.roxoTxt } }, p.titulo),
        h('div', { style: { color: C.cinzaEsc, lineHeight: 1.55 } }, p.texto),
        p.erro && h('div', { role: 'alert', style: { color: C.verm, background: C.vermFundo, borderRadius: 9, padding: '8px 10px', fontSize: 12 } }, p.erro),
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
          h(Btn, { onClick: p.onCancelar }, 'Voltar'),
          h(Btn, { primario: true, disabled: p.ocupado, onClick: p.onConfirmar, style: p.perigo ? { background: '#dc2626' } : null }, p.ocupado ? 'Aguarde…' : p.botao))));
  }

  // ─── resumo imprimível (PDF pelo navegador) ───
  function textoResumo(f, comp) {
    var l = ['Metas e bonificação · ' + compNome(comp), f.nome + (f.cargo ? ' · ' + f.cargo : ''), ''];
    l.push('Base: ' + (f.base.valor != null ? f.base.texto + ' (' + f.base.detalhe + ')' : 'sem bonificação'));
    l.push('Atingimento médio: ' + pct(f.atingimento) + ' · ' + f.consideradas + ' de ' + f.total_metas + ' metas consideradas');
    l.push('Total a receber: ' + (f.total != null ? brl(f.total) : '—'));
    l.push('');
    f.metas.forEach(function (m) {
      var sit = m.desconsiderada ? 'desconsiderada' : m.pendente ? 'pendente' : m.multiplo_txt;
      l.push('• ' + m.nome + ': ' + (m.detalhe || '') + ' → ' + sit + (m.valor != null ? ' = ' + brl(m.valor) : ''));
      (m.itens || []).forEach(function (i) { l.push('    - ' + i.nome + ': ' + (i.detalhe || '') + (i.multiplo != null ? ' → ' + pct(i.multiplo) : '')); });
    });
    l.push(''); l.push('Como foi calculado: ' + f.como_calculado);
    return l.join('\n');
  }
  function imprimirResumo(f, comp, status) {
    var w = window.open('', '_blank');
    if (!w) return false;
    var blocos = f.metas.map(function (m) {
      var sit = m.desconsiderada ? 'Desconsiderada' : m.pendente ? 'Pendente' : m.multiplo_txt;
      var itens = (m.itens || []).map(function (i) { return '<tr><td>' + esc(i.nome) + '</td><td>' + esc(i.detalhe || '') + '</td><td class="r">' + (i.multiplo != null ? pct(i.multiplo) : '—') + '</td></tr>'; }).join('');
      return '<div class="meta"><div class="mh"><b>' + esc(m.nome) + '</b><span class="pill">' + esc(sit) + '</span></div><div class="det">' + esc(m.detalhe || '') + '</div>'
        + (m.valor != null ? '<div class="conta">' + brl(f.parcela) + ' × ' + esc(m.multiplo_txt) + ' = <b>' + brl(m.valor) + '</b></div>' : '')
        + (itens ? '<table>' + itens + '</table>' : '') + '</div>';
    }).join('');
    var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Resumo · ' + esc(f.nome) + ' · ' + esc(compNome(comp)) + '</title><style>'
      + 'body{font-family:Inter,Arial,sans-serif;color:#111827;margin:32px;font-size:12.5px}h1{font-size:20px;margin:0;color:#3a1556}.s{color:#6b7280;margin:2px 0 16px}'
      + '.k{display:flex;gap:10px;margin-bottom:14px}.k div{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px}.k span{display:block;color:#6b7280;font-size:11px}.k b{font-size:16px}'
      + '.meta{border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;margin-bottom:8px;page-break-inside:avoid}.mh{display:flex;justify-content:space-between}.pill{font-weight:700;color:#5d0b85}'
      + '.det{color:#374151;margin-top:4px}.conta{margin-top:4px}table{width:100%;border-collapse:collapse;margin-top:6px;font-size:11.5px}td{border-top:1px solid #f3f4f6;padding:3px 4px}.r{text-align:right;font-weight:700}'
      + '.calc{background:#f9fafb;border-radius:10px;padding:10px 12px;margin-top:10px;line-height:1.55}.rod{margin-top:18px;color:#9ca3af;font-size:10.5px}</style></head><body>'
      + '<h1>' + esc(f.nome) + '</h1><div class="s">' + esc(f.cargo || '') + ' · Metas e bonificação · ' + esc(compNome(comp)) + ' · ' + (status === 'aberto' ? 'prévia (competência aberta)' : status === 'pago' ? 'competência paga' : 'competência fechada') + '</div>'
      + '<div class="k"><div><span>Base da bonificação</span><b>' + (f.base.valor != null ? brl(f.base.valor) : 'Sem bonificação') + '</b><span>' + esc(f.base.detalhe) + '</span></div>'
      + '<div><span>Atingimento médio</span><b>' + pct(f.atingimento) + '</b><span>' + f.consideradas + ' de ' + f.total_metas + ' metas consideradas</span></div>'
      + '<div><span>Total a receber</span><b>' + (f.total != null ? brl(f.total) : '—') + '</b><span>' + (f.parcela != null ? brl(f.parcela) + ' por meta' : '') + '</span></div></div>'
      + blocos + '<div class="calc"><b>Como foi calculado</b><br>' + esc(f.como_calculado) + '</div><div class="rod">Central Tutts · gerado em ' + new Date().toLocaleString('pt-BR') + '</div>'
      + '<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>';
    w.document.open(); w.document.write(html); w.document.close();
    return true;
  }
  function copiar(txt, showToast) {
    var ok = function () { showToast && showToast('Texto copiado', 'success'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { showToast && showToast('Não deu para copiar', 'error'); });
    else { var t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (_) {} document.body.removeChild(t); }
  }

  // ─── barra de faixas (uma meta de valor único) ───
  function BarraFaixas(p) {
    var m = p.meta; var fx = m.faixas || []; var lims = fx.filter(function (b) { return b.lim != null; }).map(function (b) { return Number(b.lim); });
    if (!lims.length || m.resultado == null) return null;
    var lo, hi;
    if (m.direcao === 'maior') { var mn = Math.min.apply(null, lims), mx = Math.max.apply(null, lims); var sp = Math.max(mx - mn, 5); lo = Math.max(0, mn - sp * 0.4); hi = m.unidade === 'pct' ? Math.min(100, mx + sp * 0.4) : mx + sp * 0.4; if (hi <= mx) hi = mx + 1; }
    else { lo = 0; hi = Math.max.apply(null, lims) * 1.3 || 1; }
    var v = Math.max(lo, Math.min(hi, Number(m.resultado)));
    var pos = function (x) { return ((x - lo) / (hi - lo)) * 100; };
    // segmentos do pior para o melhor, na ordem do eixo
    var segs = [];
    if (m.direcao === 'maior') {
      var asc = fx.slice().reverse(); var ini = lo;
      asc.forEach(function (b, i) { var fim = i < asc.length - 1 ? Number(asc[i + 1].lim) : hi; segs.push({ de: ini, ate: fim, mult: b.mult }); ini = fim; });
    } else {
      var ini2 = lo;
      fx.forEach(function (b) { var fim = b.lim == null ? hi : Number(b.lim); segs.push({ de: ini2, ate: fim, mult: b.mult }); ini2 = fim; });
    }
    var grad = segs.filter(function (s) { return s.ate > s.de; }).map(function (s) { return corFaixa(s.mult) + ' ' + pos(s.de).toFixed(2) + '% ' + pos(s.ate).toFixed(2) + '%'; }).join(',');
    var marcas = []; lims.filter(function (l) { return l > lo && l < hi; }).sort(function (a, b) { return a - b; }).forEach(function (l) { if (!marcas.length || pos(l) - pos(marcas[marcas.length - 1]) >= 7) marcas.push(l); });
    return h('div', { 'aria-hidden': 'true', style: { display: 'flex', flexDirection: 'column', gap: 4 } },
      h('div', { style: { position: 'relative', height: 10, borderRadius: 99, background: 'linear-gradient(90deg,' + grad + ')' } },
        h('span', { style: { position: 'absolute', left: 'calc(' + pos(v).toFixed(2) + '% - 2px)', top: -4, width: 4, height: 18, borderRadius: 2, background: '#111827' } })),
      h('div', { style: { position: 'relative', height: 12, fontSize: 10, color: C.cinza } }, marcas.map(function (l) { return h('span', { key: l, style: { position: 'absolute', left: pos(l) + '%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' } }, num2(l, Number.isInteger(l) ? 0 : 1) + (m.unidade === 'pct' ? '%' : '')); })));
  }
  function textoDica(m) {
    var d = m.dicas; if (!d || !d.proxima) return null;
    var falta = m.unidade === 'pct' ? num2(d.proxima.falta, 1) + ' p.p.' : m.unidade === 'min' ? num2(d.proxima.falta, 1) + ' min' : inteiro(d.proxima.falta) + ' dia(s)';
    var acao = m.unidade === 'min' ? 'Mais ' + falta + ' mais rápido e vai para ' : 'Faltam ' + falta + ' para subir para ';
    return h('span', null, acao, h('b', null, d.proxima.mult + '%'), d.proxima.ganho != null ? ' (+' + brl(d.proxima.ganho) + ')' : '');
  }
  function piorQueda(itens) {
    var pior = null;
    (itens || []).forEach(function (i) { if (i.dicas && i.dicas.queda && (!pior || i.dicas.queda.folga < pior.dicas.queda.folga)) pior = i; });
    return pior;
  }

  // ════════════════════════════════════════════════════════════
  // MASTER
  // ════════════════════════════════════════════════════════════
  function PainelMetasMaster(props) {
    var api = props.api || props.apiUrl || window.API_URL || '';
    var call = useApi(api, props.fetchAuth);
    var toast = props.showToast || function () {};
    var [comp, setComp] = useState(compHoje());
    var [dados, setDados] = useState(null), [loading, setLoading] = useState(true), [erro, setErro] = useState(null);
    var [aba, setAba] = useState('func');
    var [drawer, setDrawer] = useState(null); // {tipo, fid}
    var [conf, setConf] = useState(null);
    var [atualizando, setAtualizando] = useState(false);
    var largo = useLargura(900);

    var carregar = useCallback(async function (atualizar) {
      if (atualizar) setAtualizando(true); else setLoading(true);
      setErro(null);
      try { setDados(await call('/painel/metas?competencia=' + comp + (atualizar ? '&atualizar=1' : ''))); } catch (e) { setErro(e.message); } finally { setLoading(false); setAtualizando(false); }
    }, [call, comp]);
    useEffect(function () { carregar(false); }, [carregar]);

    var exportar = async function () {
      try {
        var r = await (props.fetchAuth || window.fetchAuth || fetch)(api + '/painel/metas/exportar?competencia=' + comp);
        if (!r.ok) throw new Error('Falha ao exportar');
        var b = await r.blob(); var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = 'metas-' + comp + '.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
      } catch (e) { toast(e.message, 'error'); }
    };
    var acaoComp = function (tipo) {
      setConf({ tipo: tipo, titulo: tipo === 'fechar' ? 'Fechar ' + compNome(comp) + '?' : 'Marcar ' + compNome(comp) + ' como pago?',
        texto: tipo === 'fechar' ? 'Os valores do BI ficam congelados e nada mais pode ser editado nesta competência. Total: ' + brl(dados.kpis.total) + '.' : 'Confirma que a bonificação de ' + brl(dados.kpis.total) + ' foi paga? Depois disso fica só para consulta.',
        botao: tipo === 'fechar' ? 'Fechar mês' : 'Marcar como pago' });
    };
    var confirmar = async function () {
      setConf(Object.assign({}, conf, { ocupado: true, erro: null }));
      try { await call('/painel/metas/' + conf.tipo, { method: 'POST', body: { competencia: comp } }); toast(conf.tipo === 'fechar' ? 'Mês fechado' : 'Competência marcada como paga', 'success'); setConf(null); carregar(false); } catch (e) { setConf(Object.assign({}, conf, { ocupado: false, erro: e.message })); }
    };

    var func = dados && dados.funcionarios ? dados.funcionarios : [];
    var fSel = drawer && drawer.fid ? func.find(function (f) { return f.funcionario_id === drawer.fid; }) : null;
    var editavel = dados && dados.status === 'aberto';

    var cab = h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 } },
      h('div', null,
        h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 22, color: '#111827' } }, 'Metas e bonificação'),
        h('p', { style: { margin: '4px 0 0', color: C.cinza, fontSize: 13 } }, 'Base dividida entre as metas de cada um e multiplicada pela faixa atingida. Os números do BI atualizam até fechar o mês.')),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
        h(SeletorMes, { comp: comp, status: dados ? dados.status : null, onChange: function (c) { setComp(c); } }),
        dados && dados.status === 'aberto' && h(Btn, { onClick: function () { carregar(true); }, disabled: atualizando, title: 'Busca de novo os números do BI e do Digisac' }, ico('refresh', 14), atualizando ? 'Atualizando…' : 'Atualizar dados'),
        h(Btn, { onClick: exportar, disabled: !dados }, ico('download', 14), 'Exportar'),
        dados && dados.status === 'aberto' && h(Btn, { primario: !!dados.pode_fechar, disabled: !dados.pode_fechar, title: dados.motivo_bloqueio || 'Congela os valores do mês', onClick: function () { acaoComp('fechar'); } }, ico('lock', 14), dados.pode_fechar ? 'Fechar mês' : 'Fechar mês · ' + (dados.motivo_bloqueio || '')),
        dados && dados.status === 'fechado' && h(Btn, { primario: true, onClick: function () { acaoComp('pagar'); } }, ico('check', 14), 'Marcar como pago')));

    var abas = h('div', { role: 'tablist', 'aria-label': 'Visão', style: { display: 'inline-flex', alignSelf: 'flex-start', background: C.bordaLeve, borderRadius: 10, padding: 3, gap: 2, flexWrap: 'wrap' } },
      [['func', 'Funcionários'], ['faixas', 'Métricas e faixas'], ['hist', 'Histórico']].map(function (a) {
        var on = aba === a[0];
        return h('button', { key: a[0], type: 'button', role: 'tab', 'aria-selected': on, onClick: function () { setAba(a[0]); }, style: { height: 34, padding: '0 14px', border: 0, borderRadius: 8, background: on ? '#fff' : 'transparent', color: on ? C.roxoEsc : C.cinza, fontWeight: 600, cursor: 'pointer', boxShadow: on ? '0 1px 2px rgba(0,0,0,.06)' : 'none', fontFamily: 'inherit', fontSize: 13 } }, a[1]);
      }));

    var corpo;
    if (loading && !dados) corpo = h(Carregando);
    else if (erro && !dados) corpo = h('div', { role: 'alert', style: Object.assign({}, S.card, { padding: 20, color: C.verm, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }) }, erro, h(Btn, { onClick: function () { carregar(false); } }, 'Tentar de novo'));
    else if (aba === 'faixas') corpo = h(AbaFaixas, { call: call, comp: comp, toast: toast, editavel: true, onSalvou: function () { carregar(false); } });
    else if (aba === 'hist') corpo = h(AbaHistorico, { call: call, comp: comp });
    else corpo = h(React.Fragment, null,
      h(Kpis, { dados: dados, onPendente: function (fid) { setDrawer({ tipo: 'resumo', fid: fid }); } }),
      h(TabelaFuncionarios, { func: func, editavel: editavel, largo: largo, onResumo: function (fid) { setDrawer({ tipo: 'resumo', fid: fid }); }, onConfig: function (fid) { setDrawer({ tipo: 'config', fid: fid }); }, onNovo: function () { setDrawer({ tipo: 'config', fid: null }); } }),
      dados && dados.congelado && h('p', { style: { margin: 0, fontSize: 12, color: C.cinza } }, 'Competência ' + (dados.status === 'pago' ? 'paga' : 'fechada') + ' em ' + fmtDataHora(dados.status === 'pago' ? dados.pago_em : dados.fechado_em) + ' por ' + ((dados.status === 'pago' ? dados.pago_por : dados.fechado_por) || '—') + ': valores congelados, só consulta e exportação.'));

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16, color: '#111827', fontSize: 13 } },
      h('style', null, '@keyframes metasSk{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes metasIn{from{transform:translateX(24px);opacity:.6}to{transform:none;opacity:1}}@media (prefers-reduced-motion: reduce){[style*="metasIn"],[style*="metasSk"]{animation:none!important}}'),
      cab, abas, corpo,
      drawer && drawer.tipo === 'resumo' && fSel && h(DrawerResumo, { f: fSel, comp: comp, status: dados.status, editavel: editavel, call: call, toast: toast, onFechar: function () { setDrawer(null); }, onMudou: function () { carregar(false); }, onConfig: function () { setDrawer({ tipo: 'config', fid: fSel.funcionario_id }); } }),
      drawer && drawer.tipo === 'config' && h(DrawerConfig, { f: fSel, comp: comp, call: call, toast: toast, funcionarios: func, onFechar: function () { setDrawer(null); }, onSalvou: function () { setDrawer(null); carregar(false); } }),
      conf && h(Confirmar, { titulo: conf.titulo, texto: conf.texto, botao: conf.botao, ocupado: conf.ocupado, erro: conf.erro, onCancelar: function () { setConf(null); }, onConfirmar: confirmar }));
  }

  function Kpis(p) {
    var d = p.dados; if (!d) return null; var k = d.kpis;
    var delta = d.anterior && d.anterior.atingimento_medio != null && k.atingimento_medio != null ? k.atingimento_medio - d.anterior.atingimento_medio : null;
    var card = function (titulo, valor, sub, estilo, extra) { return h('div', { style: Object.assign({}, S.card, { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }, estilo || {}) }, h('span', { style: { fontSize: 12, fontWeight: 600, color: estilo && estilo.color ? estilo.color : C.cinza } }, titulo), h('span', { style: { fontFamily: SORA, fontSize: 22, fontWeight: 700, color: estilo && estilo.color ? estilo.color : C.roxoTxt } }, valor), sub, extra || null); };
    var pend = k.pendentes_lista || [];
    return h('section', { 'aria-label': 'Indicadores', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 } },
      card('Total de bonificação do mês', brl(k.total), h('span', { style: { fontSize: 11, color: C.cinza } }, d.status === 'aberto' ? 'prévia · soma de quem recebe' : 'congelado no fechamento'), { background: C.lilasFundo, borderColor: C.lilasBorda }),
      card('Funcionários com bonificação', k.com_bonus + ' de ' + k.funcionarios, h('span', { style: { fontSize: 11, color: C.cinza } }, 'todos têm metas acompanhadas')),
      card('Atingimento médio', pct(k.atingimento_medio), h('span', { style: { fontSize: 11, fontWeight: 600, color: delta == null ? C.cinza : delta >= 0 ? C.verde : C.verm } }, delta == null ? 'sem comparação' : (delta >= 0 ? '+' : '−') + num2(Math.abs(delta), 1) + ' p.p. vs ' + compNome(compMais(d.competencia, -1)).toLowerCase())),
      pend.length
        ? card('Pendências', String(pend.length), null, { background: C.ambarFundo, borderColor: C.ambarBorda, color: C.ambar },
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } }, pend.slice(0, 3).map(function (x, i) { return h('button', { key: i, type: 'button', onClick: function () { p.onPendente(x.funcionario_id); }, style: { border: 0, background: 'none', padding: 0, textAlign: 'left', color: C.ambar, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' } }, x.nome + ' · ' + x.meta + ' · ', h('b', { style: { textDecoration: 'underline' } }, 'lançar agora')); }), pend.length > 3 && h('span', { style: { fontSize: 11, color: C.ambar } }, '+ ' + (pend.length - 3))))
        : card('Pendências', '0', h('span', { style: { fontSize: 11, color: C.cinza } }, k.desconsideradas ? k.desconsideradas + ' meta(s) desconsiderada(s) no mês' : 'nenhuma meta sem resultado')));
  }

  function chipMeta(m, key) {
    var lbl = nomeCurto(m.id, m.nome) + ' · ' + (m.desconsiderada ? 'desconsiderada' : m.pendente ? 'pendente' : m.multiplo_txt);
    var st = Object.assign(pillMult(m), { fontSize: 11, fontWeight: 600, padding: '2px 9px' });
    return h('span', { key: key, style: st, title: m.detalhe || '' }, lbl, m.origem === 'painel' && !m.desconsiderada ? h('span', { style: { fontWeight: 500, color: C.cinza, marginLeft: 4 } }, 'auto') : m.origem === 'manual' ? h('span', { style: { fontWeight: 500, marginLeft: 4 } }, 'manual') : null);
  }
  var COLS = 'minmax(190px,1.3fr) minmax(280px,2.4fr) 100px minmax(170px,1.15fr) 110px 196px';
  function TabelaFuncionarios(p) {
    if (!p.func.length) return h('div', { style: Object.assign({}, S.card, { padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderStyle: 'dashed', borderColor: C.lilasMed }) },
      h('span', { style: { width: 48, height: 48, borderRadius: 14, background: C.lilas, color: C.roxo, display: 'grid', placeItems: 'center' } }, ico('target', 22)),
      h('b', { style: { fontSize: 15 } }, 'Ninguém com metas ainda'),
      h('span', { style: { color: C.cinza, maxWidth: 420 } }, 'Adicione o primeiro funcionário: escolha o usuário da Central, as metas e a base da bonificação.'),
      p.editavel && h(Btn, { primario: true, onClick: p.onNovo }, ico('plus', 14), 'Adicionar funcionário'));
    var cel = { padding: '12px 14px' };
    var rodapeTab = h('div', { style: { padding: '12px 14px', borderTop: '1px solid ' + C.bordaLeve, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' } },
      h('span', { style: { fontSize: 12, color: C.cinza } }, 'Etiqueta: roxo forte 120–150% · roxo 90–110% · âmbar 50–89% · vermelho 0% ou pendente · cinza riscado = desconsiderada no mês'),
      p.editavel && h(Btn, { onClick: p.onNovo, style: { borderStyle: 'dashed', borderColor: C.lilasMed, color: C.roxoEsc } }, ico('plus', 14), 'Adicionar funcionário'));
    if (!p.largo) return h('section', { 'aria-label': 'Funcionários', style: Object.assign({}, S.card, { overflow: 'hidden' }) },
      h('ul', { style: { listStyle: 'none', margin: 0, padding: 0 } }, p.func.map(function (f, idx) {
        return h('li', { key: f.funcionario_id, style: { padding: '14px', borderTop: idx ? '1px solid ' + C.bordaLeve : 0, display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } }, h(Avatar, { nome: f.nome, foto: f.foto }),
            h('span', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { display: 'block' } }, f.nome), h('span', { style: { display: 'block', fontSize: 12, color: C.cinza } }, (f.cargo || '—') + ' · ' + (f.base.valor != null ? 'base ' + brl(f.base.valor) : 'sem bonificação'))),
            h('span', { style: { textAlign: 'right' } }, h('b', { style: { display: 'block', fontFamily: SORA, fontSize: 15 } }, f.total == null ? pct(f.atingimento) : brl(f.total)), h('span', { style: { fontSize: 11, color: C.cinza } }, f.total == null ? 'atingimento' : pct(f.atingimento)))),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, f.metas.map(function (m, i) { return chipMeta(m, i); })),
          h('div', { style: { display: 'grid', gridTemplateColumns: p.editavel ? '1fr 1fr' : '1fr', gap: 8 } },
            h(Btn, { primario: true, style: { justifyContent: 'center', height: 44 }, onClick: function () { p.onResumo(f.funcionario_id); }, 'aria-label': 'Resumo de ' + f.nome }, 'Resumo'),
            p.editavel && h(Btn, { style: { justifyContent: 'center', height: 44 }, onClick: function () { p.onConfig(f.funcionario_id); }, 'aria-label': 'Configurar ' + f.nome }, 'Configurar')));
      })), rodapeTab);
    return h('section', { 'aria-label': 'Funcionários', style: Object.assign({}, S.card, { overflow: 'hidden' }) },
      h('div', { style: { overflowX: 'auto' } },
        h('div', { role: 'table', 'aria-label': 'Funcionários e metas', style: { minWidth: 980 } },
          h('div', { role: 'row', style: { display: 'grid', gridTemplateColumns: COLS, background: C.lilasFundo, borderBottom: '1px solid ' + C.lilasBorda, fontSize: 11, fontWeight: 700, color: C.roxoEsc, textTransform: 'uppercase', letterSpacing: '.03em' } },
            ['Funcionário', 'Metas e múltiplo atingido', 'Atingimento', 'Base da bonificação', 'A receber', ''].map(function (t, i) { return h('span', { key: i, role: 'columnheader', style: { position: 'relative', padding: '10px 14px', textAlign: i === 2 || i === 4 ? 'right' : 'left' } }, t || h('span', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } }, 'Ações')); })),
          p.func.map(function (f, idx) {
            return h('div', { key: f.funcionario_id, role: 'row', className: 'metas-linha', style: { display: 'grid', gridTemplateColumns: COLS, borderBottom: idx < p.func.length - 1 ? '1px solid ' + C.bordaLeve : 0, alignItems: 'center' } },
              h('span', { role: 'cell', style: Object.assign({}, cel, { display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }) }, h(Avatar, { nome: f.nome, foto: f.foto }), h('span', { style: { minWidth: 0 } }, h('b', { style: { display: 'block' } }, f.nome), h('span', { style: { display: 'block', fontSize: 12, color: C.cinza } }, f.cargo || '—'))),
              h('span', { role: 'cell', style: Object.assign({}, cel, { display: 'flex', flexWrap: 'wrap', gap: 6 }) }, f.metas.length ? f.metas.map(function (m, i) { return chipMeta(m, i); }) : h('span', { style: { color: C.cinza } }, 'sem metas')),
              h('span', { role: 'cell', style: Object.assign({}, cel, { textAlign: 'right', fontWeight: 700, color: C.roxoTxt }) }, pct(f.atingimento)),
              h('span', { role: 'cell', style: cel }, h('b', null, f.base.valor != null ? brl(f.base.valor) : 'Sem bonificação'), h('span', { style: { display: 'block', fontSize: 12, color: C.cinza } }, f.base.detalhe)),
              h('span', { role: 'cell', style: Object.assign({}, cel, { textAlign: 'right', fontWeight: 700, color: f.total == null ? C.cinza : '#111827' }) }, f.total == null ? '—' : brl(f.total)),
              h('span', { role: 'cell', style: Object.assign({}, cel, { display: 'flex', gap: 6, justifyContent: 'flex-end' }) },
                h(Btn, { primario: true, style: { height: 34, padding: '0 12px' }, onClick: function () { p.onResumo(f.funcionario_id); }, 'aria-label': 'Resumo de ' + f.nome }, 'Resumo'),
                p.editavel && h(Btn, { style: { height: 34, padding: '0 12px' }, onClick: function () { p.onConfig(f.funcionario_id); }, 'aria-label': 'Configurar ' + f.nome }, 'Configurar')));
          }))),
      rodapeTab,
      h('style', null, '.metas-linha:hover{background:#fcfaff}'));
  }

  // ─── Resumo do funcionário ───
  function DrawerResumo(p) {
    var f = p.f;
    var [ocupado, setOcupado] = useState(null);
    var [manual, setManual] = useState(null); // metrica em edição
    var [valManual, setValManual] = useState('');
    var [abertos, setAbertos] = useState({});
    var [logs, setLogs] = useState(null);
    useEffect(function () { p.call('/painel/metas/logs?competencia=' + p.comp).then(function (d) { setLogs((d.logs || []).filter(function (l) { return String(l.entidade_id || '').split(':')[0] === String(f.funcionario_id); }).slice(0, 8)); }).catch(function () { setLogs([]); }); }, [p.comp, f.funcionario_id]);
    var ajustar = async function (metrica, body) {
      setOcupado(metrica);
      try { await p.call('/painel/metas/ajuste', { method: 'PUT', body: Object.assign({ competencia: p.comp, funcionario_id: f.funcionario_id, metrica: metrica }, body) }); setManual(null); p.onMudou(); }
      catch (e) { p.toast(e.message, 'error'); } finally { setOcupado(null); }
    };
    var stat = function (t, v, s, destaque) { return h('div', { style: { background: destaque ? C.lilasFundo : C.fundo, border: destaque ? '1px solid ' + C.lilasBorda : 0, borderRadius: 12, padding: '10px 12px', minWidth: 0 } }, h('span', { style: { fontSize: 11, color: C.cinza } }, t), h('div', { style: { fontFamily: SORA, fontSize: 18, fontWeight: 700, color: destaque ? C.roxoEsc : '#111827' } }, v), h('span', { style: { fontSize: 11, color: C.cinza } }, s)); };
    var acoes = [h(Btn, { key: 'c', pequeno: true, style: { height: 36 }, onClick: function () { copiar(textoResumo(f, p.comp), p.toast); } }, ico('copy', 13), 'Copiar texto'),
      h(Btn, { key: 'p', primario: true, style: { height: 36 }, onClick: function () { if (!imprimirResumo(f, p.comp, p.status)) p.toast('Libere os pop-ups para baixar o PDF', 'error'); } }, ico('download', 13), 'Baixar PDF')];
    return h(Drawer, { titulo: f.nome, sobretitulo: 'Resumo · ' + compNome(p.comp).toLowerCase() + (f.cargo ? ' · ' + f.cargo : ''), onFechar: p.onFechar, acoes: acoes,
      rodape: p.editavel ? [h('span', { key: 's', style: { fontSize: 12, color: C.cinza } }, p.status === 'aberto' ? 'Prévia: os números do BI atualizam até o fechamento.' : ''), h(Btn, { key: 'b', onClick: p.onConfig }, ico('settings', 14), 'Configurar')] : null },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 } },
        stat('Base da bonificação', f.base.valor != null ? brl(f.base.valor) : 'Sem bonificação', f.base.detalhe),
        stat('Atingimento médio', pct(f.atingimento), f.consideradas + ' de ' + f.total_metas + ' metas consideradas'),
        stat('Total a receber', f.total != null ? brl(f.total) : '—', f.parcela != null ? brl(f.parcela) + ' por meta' : 'metas só acompanhadas', true)),
      !f.metas.length && h('div', { style: { color: C.cinza } }, 'Nenhuma meta configurada para este funcionário.'),
      f.metas.map(function (m) {
        var cinza = m.desconsiderada;
        var lista = m.itens || [];
        var aberto = abertos[m.id];
        var visiveis = aberto ? lista : lista.slice(0, 6);
        return h('section', { key: m.id, 'aria-label': m.nome, style: { border: '1px solid ' + (m.pendente && !cinza ? C.vermBorda : C.borda), borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: cinza ? '#fafafa' : '#fff' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
            h('span', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, h('b', { style: { color: cinza ? C.cinza : '#111827' } }, m.nome), m.origem && h('span', { style: S.origem(m.origem) }, ORIGEM[m.origem] ? ORIGEM[m.origem][0] : 'BI')),
            h('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              h('span', { style: pillMult(m) }, m.desconsiderada ? '—' : m.pendente ? 'pendente' : m.multiplo_txt),
              p.editavel && h(Btn, { pequeno: true, disabled: ocupado === m.id, onClick: function () { ajustar(m.id, { desconsiderada: !m.desconsiderada }); }, style: m.desconsiderada ? { borderColor: C.lilasMed, color: C.roxoEsc } : null }, m.desconsiderada ? 'Considerar' : 'Desconsiderar'))),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', color: cinza ? C.cinza : C.cinzaEsc } },
            h('span', null, m.detalhe || ''),
            m.valor != null && h('span', { style: { fontWeight: 600 } }, brl(f.parcela) + ' × ' + m.multiplo_txt + ' = ' + brl(m.valor))),
          cinza && h('span', { style: { fontSize: 12, color: C.cinza } }, 'Desconsiderada no mês: fora da divisão da base.'),
          m.pendente && !cinza && h('span', { style: { fontSize: 12, color: C.verm } }, 'Pendente: fica fora da prévia e trava o fechamento até ter resultado ou ser desconsiderada.'),
          !cinza && !m.pendente && m.dicas && m.dicas.proxima && h('span', { style: { fontSize: 12, color: C.cinza } }, textoDica(m)),
          m.id === 'digisac' && p.editavel && (manual === m.id
            ? h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' } },
              h('label', { style: S.lbl }, 'Tempo médio do 1º atendimento (min)', h('input', { type: 'text', inputMode: 'decimal', autoFocus: true, value: valManual, onChange: function (e) { setValManual(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') ajustar('digisac', { valor_manual: numBR(valManual) }); }, style: Object.assign({}, S.inp, { width: 140 }) })),
              h(Btn, { primario: true, disabled: numBR(valManual) == null || ocupado === m.id, onClick: function () { ajustar('digisac', { valor_manual: numBR(valManual) }); } }, 'Salvar'),
              h(Btn, { onClick: function () { setManual(null); } }, 'Cancelar'))
            : h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
              h('button', { type: 'button', onClick: function () { setManual(m.id); setValManual(m.resultado != null ? num2(m.resultado, 1) : ''); }, style: { border: 0, background: 'none', padding: 0, color: C.roxo, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' } }, m.pendente ? 'Lançar à mão' : 'Ajustar à mão'),
              m.origem === 'manual' && h('button', { type: 'button', onClick: function () { ajustar('digisac', { valor_manual: null }); }, style: { border: 0, background: 'none', padding: 0, color: C.cinza, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' } }, 'Voltar para a importação'))),
          lista.length > 0 && h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: '5px 12px', fontSize: 12, alignItems: 'center', color: cinza ? C.cinza : C.cinzaEsc } },
            visiveis.map(function (i) {
              return [h('span', { key: i.chave + 'n', style: { color: i.sem_dados ? '#9ca3af' : 'inherit' } }, i.nome),
                h('span', { key: i.chave + 'd', style: { color: C.cinza } }, i.detalhe || ''),
                h('span', { key: i.chave + 'm', style: i.sem_dados ? { color: '#9ca3af' } : Object.assign({ fontWeight: 700, borderRadius: 99, padding: '0 8px', fontSize: 12 }, estiloPorMult(i.multiplo)) }, i.sem_dados ? '—' : pct(i.multiplo))];
            }),
            lista.length > 6 && h('button', { type: 'button', onClick: function () { var n = {}; n[m.id] = !aberto; setAbertos(Object.assign({}, abertos, n)); }, style: { gridColumn: '1 / -1', justifySelf: 'start', border: 0, background: 'none', padding: 0, color: C.roxo, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' } }, aberto ? 'Mostrar menos' : 'Ver todos (' + lista.length + ')')));
      }),
      h('section', { 'aria-label': 'Como foi calculado', style: { background: C.fundo, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 } },
        h('b', null, 'Como foi calculado'), h('span', { style: { color: C.cinzaEsc, lineHeight: 1.55 } }, f.como_calculado),
        h('span', { style: { fontSize: 12, color: C.cinza } }, 'Esse texto vai no PDF e no "Copiar texto".')),
      logs && logs.length > 0 && h('section', { 'aria-label': 'Histórico', style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        h('b', { style: { fontSize: 11, color: C.cinza, textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Histórico da competência'),
        logs.map(function (l) { return h('span', { key: l.id, style: { fontSize: 12, color: C.cinzaEsc } }, fmtDataHora(l.criado_em) + ' · ' + (l.usuario || '—') + ' · ' + (l.descricao || l.acao)); })));
  }

  // ─── Configurar funcionário ───
  /* METAS_BONUS_V2: escolher clientes da base (mesma regra do Gerencial: consolidado = CCs juntos; os demais inteiros ou por CC) */
  function PickerClientes(p) {
    var sel = p.selecionados; var b = (p.busca || '').trim().toLowerCase();
    var tem = function (k) { return sel.indexOf(k) >= 0; };
    var alternar = function (k, filhos) {
      if (tem(k)) { p.onChange(sel.filter(function (x) { return x !== k; })); return; }
      var n = sel.concat([k]);
      if (filhos) n = n.filter(function (x) { return filhos.indexOf(x) < 0; }); // cliente inteiro já inclui os CCs
      p.onChange(n);
    };
    var lista = p.clientes.filter(function (c) { if (!b) return true; return c.nome.toLowerCase().indexOf(b) >= 0 || String(c.cod_cliente).indexOf(b) >= 0 || (c.ccs || []).some(function (x) { return x.nome.toLowerCase().indexOf(b) >= 0; }); });
    var linha = function (chave, rotulo, cod, ent, opts) {
      var o = opts || {};
      var on = tem(chave) || !!o.incluido;
      return h('div', { key: chave, style: { display: 'flex', alignItems: 'center', gap: 8, padding: o.filho ? '6px 10px 6px 42px' : '8px 10px', borderTop: '1px solid ' + C.bordaLeve, background: o.filho ? C.lilasFundo : '#fff', opacity: o.incluido ? 0.55 : 1 } },
        o.expandir ? h('button', { type: 'button', onClick: o.expandir, 'aria-expanded': !!o.aberto, 'aria-label': (o.aberto ? 'Fechar' : 'Abrir') + ' centros de custo de ' + rotulo, style: { width: 24, height: 24, border: 0, borderRadius: 6, background: 'none', color: C.roxoEsc, cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none', padding: 0 } }, ico('arrowright', 14, { transform: o.aberto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' })) : (!o.filho && h('span', { style: { width: 24, flex: 'none' } })),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: o.incluido ? 'default' : 'pointer' } },
          h('input', { type: 'checkbox', checked: on, disabled: !!o.incluido, onChange: function () { alternar(chave, o.filhos); }, style: { accentColor: C.roxo, width: 16, height: 16, flex: 'none', margin: 0 } }),
          cod != null && h('span', { style: { fontSize: 11, fontWeight: 700, color: C.roxoEsc, background: C.lilas, borderRadius: 6, padding: '1px 6px', flex: 'none' } }, cod),
          h('span', { style: { fontWeight: o.filho ? 500 : 600, color: '#111827', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: rotulo }, rotulo),
          o.tag && h('span', { style: { fontSize: 10, fontWeight: 600, color: C.cinza, background: '#f3f4f6', borderRadius: 99, padding: '1px 8px', flex: 'none', whiteSpace: 'nowrap' } }, o.tag)),
        h('span', { style: { fontSize: 12, color: C.cinza, whiteSpace: 'nowrap', flex: 'none', fontVariantNumeric: 'tabular-nums' } }, inteiro(ent || 0)));
    };
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      sel.length > 0 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, sel.map(function (k) {
        var c = p.mapa[k]; var nome = c ? c.nome : k;
        return h('span', { key: k, style: { display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, padding: '0 3px 0 10px', borderRadius: 99, background: C.roxoEsc, color: '#fff', fontSize: 12, fontWeight: 600, maxWidth: '100%' } }, h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, nome),
          h('button', { type: 'button', 'aria-label': 'Tirar ' + nome, onClick: function () { p.onChange(sel.filter(function (x) { return x !== k; })); }, style: { width: 22, height: 22, border: 0, borderRadius: 99, background: 'rgba(255,255,255,.18)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0, flex: 'none' } }, ico('x', 12)));
      })),
      h('input', { type: 'search', value: p.busca, placeholder: 'Buscar por nome ou código', 'aria-label': 'Buscar cliente', onChange: function (e) { p.setBusca(e.target.value); }, style: Object.assign({}, S.inp, { height: 36 }) }),
      h('div', { role: 'group', 'aria-label': 'Clientes', style: { border: '1px solid ' + C.borda, borderRadius: 10, maxHeight: 300, overflowY: 'auto' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 10px', fontSize: 11, fontWeight: 700, color: C.roxoEsc, textTransform: 'uppercase', background: C.lilasFundo, position: 'sticky', top: 0, zIndex: 1 } }, h('span', null, 'Cliente'), h('span', null, 'Entregas no mês')),
        lista.length === 0 && h('div', { style: { padding: 12, color: C.cinza, fontSize: 12 } }, 'Nenhum cliente encontrado.'),
        lista.map(function (c) {
          var ccs = c.ccs || []; var aberto = !!p.abertos[c.chave] || (!!b && ccs.some(function (x) { return x.nome.toLowerCase().indexOf(b) >= 0; }));
          var inteiroOn = tem(c.chave);
          var filhos = ccs.map(function (x) { return x.chave; });
          var nSelFilhos = filhos.filter(tem).length;
          return h(React.Fragment, { key: c.chave },
            linha(c.chave, c.nome, c.cod_cliente, c.entregas_mes, { tag: c.consolidado ? 'CCs juntos' : (ccs.length ? (nSelFilhos ? nSelFilhos + ' de ' + ccs.length + ' CCs' : ccs.length + ' CCs') : null), filhos: filhos, expandir: ccs.length ? function () { var n = {}; n[c.chave] = !aberto; p.setAbertos(Object.assign({}, p.abertos, n)); } : null, aberto: aberto }),
            aberto && ccs.map(function (x) { return linha(x.chave, x.centro_custo, null, x.entregas_mes, { filho: true, incluido: inteiroOn }); }));
        })),
      h('span', { style: { fontSize: 12, color: C.cinza } }, 'Mesma regra do Gerencial: cliente consolidado (ex.: Comando) entra com os CCs juntos; os outros entram inteiros ou só com os CCs marcados.'));
  }

  function DrawerConfig(p) {
    var novo = !p.f;
    var cfg0 = p.f ? p.f.config : null;
    var [op, setOp] = useState(null), [erroOp, setErroOp] = useState(null);
    var [form, setForm] = useState({ user_id: '', cargo: cfg0 ? (cfg0.cargo || '') : '', metricas: cfg0 ? cfg0.metricas.slice() : [], lojas: cfg0 ? cfg0.lojas.slice() : [], filiais: cfg0 ? cfg0.filiais.slice() : [],
      recebe_bonus: cfg0 ? cfg0.recebe_bonus : true, tipo_base: cfg0 ? cfg0.tipo_base : 'fixo', valor_fixo: cfg0 && cfg0.valor_fixo != null ? num2(cfg0.valor_fixo) : '', regiao_id: cfg0 ? cfg0.regiao_id : null, aliquota: cfg0 && cfg0.aliquota != null ? String(cfg0.aliquota).replace('.', ',') : '0,02',
      /* METAS_BONUS_V2 */ base_escopo: cfg0 && cfg0.base_escopo ? cfg0.base_escopo : 'regiao', base_clientes: cfg0 && cfg0.base_clientes ? cfg0.base_clientes.slice() : [] });
    var [busca, setBusca] = useState('');
    var [buscaCli, setBuscaCli] = useState(''), [abertosCli, setAbertosCli] = useState({});
    var [salvando, setSalvando] = useState(false), [erro, setErro] = useState(null);
    var [confRemover, setConfRemover] = useState(null);
    useEffect(function () { p.call('/painel/metas/opcoes?competencia=' + p.comp).then(setOp).catch(function (e) { setErroOp(e.message); }); }, [p.comp]);
    var set = function (k, v) { var n = Object.assign({}, form); n[k] = v; setForm(n); };
    var toggle = function (k, v) { var arr = form[k].indexOf(v) >= 0 ? form[k].filter(function (x) { return x !== v; }) : form[k].concat([v]); set(k, arr); };
    var userAlvo = op ? op.usuarios.find(function (u) { return String(u.id) === String(novo ? form.user_id : p.f.user_id); }) : null;
    var reg = op && form.regiao_id ? op.regioes.find(function (r) { return r.id === form.regiao_id; }) : null;
    var aliq = numBR(form.aliquota);
    /* METAS_BONUS_V2: entregas da base conforme o escopo (região, todos os clientes, clientes escolhidos) */
    var mapaCli = {};
    if (op && op.clientes) op.clientes.forEach(function (c) { mapaCli[c.chave] = c; (c.ccs || []).forEach(function (x) { mapaCli[x.chave] = Object.assign({ pai: c.chave }, x); }); });
    var inteirosSel = {}; form.base_clientes.forEach(function (k) { if (/\|$/.test(k)) inteirosSel[k] = true; });
    var entregasBase = null; var escopoTxt = '';
    if (op) {
      if (form.base_escopo === 'todos') { entregasBase = op.entregas_total_mes || 0; escopoTxt = 'todos os clientes'; }
      else if (form.base_escopo === 'clientes') {
        entregasBase = form.base_clientes.length ? form.base_clientes.reduce(function (s2, k) { var c = mapaCli[k]; if (!c) return s2; if (c.pai && inteirosSel[c.pai]) return s2; return s2 + (c.entregas_mes || 0); }, 0) : null;
        escopoTxt = form.base_clientes.length === 1 ? (mapaCli[form.base_clientes[0]] ? mapaCli[form.base_clientes[0]].nome : '1 cliente') : form.base_clientes.length + ' clientes';
      } else if (reg) { entregasBase = reg.entregas_mes; escopoTxt = reg.nome; }
    }
    var previa = form.recebe_bonus ? (form.tipo_base === 'regiao' ? (entregasBase != null && aliq != null ? Math.round(entregasBase * aliq * 100) / 100 : null) : numBR(form.valor_fixo)) : null;
    var copiarDe = function (fid) {
      var o = p.funcionarios.find(function (x) { return String(x.funcionario_id) === String(fid); }); if (!o) return;
      var c = o.config;
      setForm(Object.assign({}, form, { metricas: c.metricas.slice(), lojas: c.lojas.slice(), filiais: c.filiais.slice(), recebe_bonus: c.recebe_bonus, tipo_base: c.tipo_base, valor_fixo: c.valor_fixo != null ? num2(c.valor_fixo) : '', regiao_id: c.regiao_id, aliquota: c.aliquota != null ? String(c.aliquota).replace('.', ',') : form.aliquota, cargo: form.cargo || c.cargo || '',
        base_escopo: c.base_escopo || 'regiao', base_clientes: (c.base_clientes || []).slice() }));
    };
    var salvar = async function () {
      setErro(null);
      if (novo && !form.user_id) { setErro('Escolha o usuário da Central'); return; }
      var body = { cargo: form.cargo, metricas: form.metricas, lojas: form.metricas.indexOf('clientes_prof') >= 0 ? form.lojas : [], filiais: form.metricas.indexOf('comolatti') >= 0 ? form.filiais : [], recebe_bonus: form.recebe_bonus, tipo_base: form.tipo_base,
        valor_fixo: form.tipo_base === 'fixo' ? numBR(form.valor_fixo) : undefined, regiao_id: form.tipo_base === 'regiao' && form.base_escopo === 'regiao' ? form.regiao_id : undefined, aliquota: form.tipo_base === 'regiao' ? aliq : undefined,
        base_escopo: form.tipo_base === 'regiao' ? form.base_escopo : undefined, base_clientes: form.tipo_base === 'regiao' ? (form.base_escopo === 'clientes' ? form.base_clientes : []) : undefined };
      setSalvando(true);
      try {
        if (novo) await p.call('/painel/metas/funcionarios', { method: 'POST', body: Object.assign({ user_id: Number(form.user_id) }, body) });
        else await p.call('/painel/metas/funcionarios/' + p.f.funcionario_id, { method: 'PUT', body: body });
        p.toast(novo ? 'Funcionário adicionado' : 'Configuração salva', 'success'); p.onSalvou();
      } catch (e) { setErro(e.message); } finally { setSalvando(false); }
    };
    var remover = async function () {
      setConfRemover(Object.assign({}, confRemover, { ocupado: true }));
      try { await p.call('/painel/metas/funcionarios/' + p.f.funcionario_id, { method: 'DELETE' }); p.toast('Funcionário removido das metas', 'success'); p.onSalvou(); } catch (e) { setConfRemover({ erro: e.message }); }
    };
    var tem = function (id) { return form.metricas.indexOf(id) >= 0; };
    var lojasVis = op ? op.lojas.filter(function (l) { return !busca || l.nome.toLowerCase().indexOf(busca.toLowerCase()) >= 0; }) : [];
    var secao = function (titulo, direita, filhos) { return h('section', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }, h('b', null, titulo), direita || null), filhos); };
    var linkBtn = function (txt, fn) { return h('button', { type: 'button', onClick: fn, style: { border: 0, background: 'none', padding: 0, color: C.roxo, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' } }, txt); };

    var corpo;
    if (erroOp) corpo = h('div', { role: 'alert', style: { color: C.verm } }, erroOp);
    else if (!op) corpo = h(Carregando);
    else {
      var livres = op.usuarios.filter(function (u) { return !u.funcionario_id; });
      corpo = [
        h('div', { key: 'u', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 } },
          novo
            ? h('label', { style: S.lbl }, 'Usuário da Central', h('select', { value: form.user_id, onChange: function (e) { set('user_id', e.target.value); }, style: S.inp }, h('option', { value: '' }, livres.length ? 'Escolha…' : 'Todos já têm metas'), livres.map(function (u) { return h('option', { key: u.id, value: u.id }, u.nome + (u.cod_profissional ? ' · cód. ' + u.cod_profissional : '')); })), h('span', { style: { fontWeight: 400, color: C.cinza } }, 'Só ele vê a própria meta no Meu Painel'))
            : h('div', { style: S.lbl }, 'Usuário da Central', h('span', { style: { height: 40, display: 'flex', alignItems: 'center', fontWeight: 600, color: '#111827', fontSize: 13 } }, p.f.nome)),
          h('label', { style: S.lbl }, 'Cargo', h('input', { type: 'text', value: form.cargo, placeholder: 'Ex.: Supervisor', onChange: function (e) { set('cargo', e.target.value); }, style: S.inp }))),
        p.funcionarios.filter(function (x) { return !p.f || x.funcionario_id !== p.f.funcionario_id; }).length > 0 && h('label', { key: 'cp', style: Object.assign({}, S.lbl, { maxWidth: 320 }) }, 'Copiar metas de outro funcionário',
          h('select', { value: '', onChange: function (e) { if (e.target.value) copiarDe(e.target.value); }, style: S.inp }, h('option', { value: '' }, 'Escolha para copiar…'), p.funcionarios.filter(function (x) { return !p.f || x.funcionario_id !== p.f.funcionario_id; }).map(function (x) { return h('option', { key: x.funcionario_id, value: x.funcionario_id }, x.nome); }))),
        secao('Metas', null, h('div', { key: 'm', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 8 } }, op.metricas.map(function (m) {
          var on = tem(m.id);
          var desc = m.id === 'digisac' ? (userAlvo && userAlvo.vinculo_digisac ? 'Puxa sozinho das importações do Meu Painel · vínculo: ' + userAlvo.vinculo_digisac : 'Sem vínculo do Digisac no Meu Painel: vai ficar pendente até lançar à mão') : m.descricao;
          return h('label', { key: m.id, style: { display: 'flex', gap: 10, alignItems: 'flex-start', border: '1px solid ' + (on ? C.lilasMed : C.borda), background: on ? C.lilasFundo : '#fff', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', gridColumn: m.id === 'digisac' ? '1 / -1' : 'auto' } },
            h('input', { type: 'checkbox', checked: on, onChange: function () { toggle('metricas', m.id); }, style: { accentColor: C.roxo, width: 16, height: 16, marginTop: 2, flex: 'none' } }),
            h('span', null, h('b', null, m.nome), h('span', { style: { display: 'block', fontSize: 12, color: m.id === 'digisac' && !(userAlvo && userAlvo.vinculo_digisac) ? C.ambar : C.cinza } }, desc)));
        }))),
        tem('clientes_prof') && secao('Lojas deste funcionário', h('span', { style: { display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: C.cinza } }, form.lojas.length + ' de ' + op.lojas.length, linkBtn('Todas', function () { set('lojas', op.lojas.map(function (l) { return l.chave; })); }), linkBtn('Nenhuma', function () { set('lojas', []); })),
          [op.lojas.length > 8 && h('input', { key: 'b', type: 'search', value: busca, placeholder: 'Buscar loja', 'aria-label': 'Buscar loja', onChange: function (e) { setBusca(e.target.value); }, style: Object.assign({}, S.inp, { height: 36 }) }),
            h('div', { key: 'c', style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, lojasVis.map(function (l) { var on = form.lojas.indexOf(l.chave) >= 0; return h('button', { key: l.chave, type: 'button', 'aria-pressed': on, onClick: function () { toggle('lojas', l.chave); }, style: S.chip(on) }, l.nome + (l.minimo != null ? ' · mín. ' + l.minimo : '')); }), !op.lojas.length && h('span', { style: { color: C.cinza } }, 'Nenhuma loja com mínimo cadastrado na Disponibilidade do BI.')),
            h('span', { key: 's', style: { fontSize: 12, color: C.cinza } }, 'Lojas e mínimos vêm da Disponibilidade do BI (cliente inteiro ou por centro de custo, com a máscara).')]),
        tem('comolatti') && secao('Filiais do Grupo Comolatti', h('span', { style: { display: 'flex', gap: 10, alignItems: 'center' } }, linkBtn('Todas', function () { set('filiais', op.filiais.map(function (f) { return f.chave; })); }), linkBtn('Nenhuma', function () { set('filiais', []); })),
          [h('div', { key: 'c', style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, op.filiais.map(function (f) { var on = form.filiais.indexOf(f.chave) >= 0; return h('button', { key: f.chave, type: 'button', 'aria-pressed': on, onClick: function () { toggle('filiais', f.chave); }, style: S.chip(on) }, f.nome); }),
            form.filiais.filter(function (k) { return !op.filiais.some(function (f) { return f.chave === k; }); }).map(function (k) { return h('button', { key: 'x' + k, type: 'button', 'aria-pressed': true, onClick: function () { toggle('filiais', k); }, style: S.chip(true), title: 'Sem entregas nos últimos 120 dias' }, k); })),
          h('span', { key: 's', style: { fontSize: 12, color: C.cinza } }, 'Filiais = centros de custo do cliente 767 no BI, cada um com o seu nome.')]),
        h('section', { key: 'b', style: { border: '1px solid ' + C.borda, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 } },
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' } },
            h('input', { type: 'checkbox', role: 'switch', checked: form.recebe_bonus, onChange: function (e) { set('recebe_bonus', e.target.checked); }, style: { position: 'absolute', opacity: 0, width: 1, height: 1 } }),
            h('span', { 'aria-hidden': 'true', style: { width: 40, height: 24, borderRadius: 99, background: form.recebe_bonus ? C.roxo : '#d1d5db', position: 'relative', flex: 'none', transition: 'background .15s' } }, h('span', { style: { position: 'absolute', top: 3, left: form.recebe_bonus ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s' } })),
            h('span', null, h('b', null, 'Recebe bonificação'), h('span', { style: { display: 'block', fontSize: 12, color: C.cinza } }, 'Desligado: as metas são só acompanhadas, sem valor a receber'))),
          form.recebe_bonus && h('div', { role: 'radiogroup', 'aria-label': 'Base da bonificação', style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 } },
            [['fixo', 'Valor fixo', 'Informar o valor'], ['regiao', 'Por entregas', 'Entregas × alíquota']].map(function (o) { var on = form.tipo_base === o[0]; return h('button', { key: o[0], type: 'button', role: 'radio', 'aria-checked': on, onClick: function () { set('tipo_base', o[0]); }, style: { textAlign: 'left', border: on ? '2px solid ' + C.roxo : '1px solid ' + C.borda, borderRadius: 10, padding: on ? '9px 11px' : '10px 12px', background: on ? C.lilasFundo : '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 } }, h('b', null, o[1]), h('span', { style: { display: 'block', fontSize: 12, color: C.cinza } }, o[2])); })),
          form.recebe_bonus && form.tipo_base === 'fixo' && h('label', { style: Object.assign({}, S.lbl, { maxWidth: 200 }) }, 'Valor da bonificação (R$)', h('input', { type: 'text', inputMode: 'decimal', value: form.valor_fixo, placeholder: '200,00', onChange: function (e) { set('valor_fixo', e.target.value); }, style: S.inp })),
          form.recebe_bonus && form.tipo_base === 'regiao' && [
            h('div', { key: 'esc', role: 'radiogroup', 'aria-label': 'De quais entregas', style: { display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3, gap: 2 } },
              [['regiao', 'Uma região'], ['todos', 'Todos os clientes'], ['clientes', 'Clientes escolhidos']].map(function (o) { var on = form.base_escopo === o[0]; return h('button', { key: o[0], type: 'button', role: 'radio', 'aria-checked': on, onClick: function () { set('base_escopo', o[0]); }, style: { flex: 1, minHeight: 32, padding: '6px 8px', lineHeight: 1.2, border: 0, borderRadius: 8, background: on ? '#fff' : 'transparent', color: on ? C.roxoEsc : C.cinza, fontWeight: 600, cursor: 'pointer', boxShadow: on ? '0 1px 2px rgba(0,0,0,.08)' : 'none', fontFamily: 'inherit', fontSize: 12 } }, o[1]); })),
            form.base_escopo === 'regiao' && h('div', { key: 'r', style: { display: 'flex', flexDirection: 'column', gap: 6 } }, h('span', { style: { fontSize: 12, fontWeight: 600, color: C.cinzaEsc } }, 'Região (regiões do BI)'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, op.regioes.map(function (r) { var on = form.regiao_id === r.id; return h('button', { key: r.id, type: 'button', 'aria-pressed': on, onClick: function () { set('regiao_id', r.id); }, style: S.chip(on) }, r.nome, h('span', { style: { opacity: 0.75, marginLeft: 6, fontWeight: 400 } }, inteiro(r.entregas_mes))); }), !op.regioes.length && h('span', { style: { color: C.cinza } }, 'Nenhuma região cadastrada no BI.'))),
            form.base_escopo === 'todos' && h('span', { key: 't', style: { fontSize: 12, color: C.cinzaEsc } }, 'Todas as entregas do mês, de todos os clientes: ', h('b', null, inteiro(op.entregas_total_mes || 0)), ' em ' + compNome(p.comp).toLowerCase() + '.'),
            form.base_escopo === 'clientes' && h(PickerClientes, { key: 'cl', clientes: op.clientes || [], selecionados: form.base_clientes, busca: buscaCli, setBusca: setBuscaCli, abertos: abertosCli, setAbertos: setAbertosCli, mapa: mapaCli, onChange: function (v) { set('base_clientes', v); } }),
            h('label', { key: 'a', style: Object.assign({}, S.lbl, { maxWidth: 200 }) }, 'Alíquota por entrega (R$)', h('input', { type: 'text', inputMode: 'decimal', value: form.aliquota, onChange: function (e) { set('aliquota', e.target.value); }, style: S.inp }))],
          form.recebe_bonus && h('div', { style: { background: C.lilasFundo, borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } },
            h('span', { style: { color: C.cinzaEsc } }, form.tipo_base === 'regiao' ? (entregasBase != null ? inteiro(entregasBase) + ' entregas em ' + compNome(p.comp).toLowerCase() + ' (' + escopoTxt + ') × ' + (form.aliquota || '—') : form.base_escopo === 'clientes' ? 'Escolha os clientes' : 'Escolha a região') : 'Valor fixo por mês'),
            h('b', { style: { fontFamily: SORA, fontSize: 16, color: C.roxoEsc, whiteSpace: 'nowrap', flex: 'none' } }, previa != null ? brl(previa) : '—'))),
        erro && h('div', { key: 'e', role: 'alert', style: { color: C.verm, background: C.vermFundo, borderRadius: 9, padding: '8px 10px', fontSize: 12 } }, erro),
      ];
    }
    return h(Drawer, { titulo: novo ? 'Adicionar funcionário' : p.f.nome, sobretitulo: 'Configurar metas e bonificação', onFechar: p.onFechar,
      rodape: [
        !novo ? h('button', { key: 'r', type: 'button', onClick: function () { setConfRemover({}); }, style: { border: 0, background: 'none', color: '#dc2626', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 13 } }, ico('trash', 14), 'Remover das metas') : h('span', { key: 'r', style: { fontSize: 12, color: C.cinza } }, 'Vale a partir de ' + compNome(p.comp).toLowerCase()),
        h('span', { key: 'b', style: { display: 'flex', gap: 8 } }, h(Btn, { onClick: p.onFechar }, 'Cancelar'), h(Btn, { primario: true, disabled: salvando || !op, onClick: salvar }, salvando ? 'Salvando…' : 'Salvar'))] },
      corpo,
      confRemover && h(Confirmar, { titulo: 'Remover ' + (p.f ? p.f.nome : '') + ' das metas?', texto: 'Ele sai da competência aberta e deixa de ver a meta. Os meses fechados continuam com o histórico.', botao: 'Remover', perigo: true, ocupado: confRemover.ocupado, erro: confRemover.erro, onCancelar: function () { setConfRemover(null); }, onConfirmar: remover }));
  }

  // ─── Métricas e faixas ───
  function AbaFaixas(p) {
    var [d, setD] = useState(null), [erro, setErro] = useState(null), [edit, setEdit] = useState(null), [linhas, setLinhas] = useState([]), [erroEd, setErroEd] = useState(null), [salvando, setSalvando] = useState(false);
    /* METAS_BONUS_V2: de onde vem cada métrica (cliente do Comando / Comolatti editável) */
    var [orig, setOrig] = useState(null), [clis, setClis] = useState(null), [buscaO, setBuscaO] = useState(''), [erroO, setErroO] = useState(null), [salvandoO, setSalvandoO] = useState(false);
    var abrirOrigem = function (m) {
      setOrig({ id: m.id, cod: m.origem && m.origem.cod_cliente, limite: m.origem && m.origem.limite_min != null ? String(m.origem.limite_min) : '' }); setErroO(null); setBuscaO('');
      if (!clis) p.call('/painel/metas/opcoes?competencia=' + p.comp).then(function (o) { setClis(o.clientes || []); }).catch(function (e) { setErroO(e.message); });
    };
    var salvarOrigem = async function () {
      setSalvandoO(true); setErroO(null);
      try {
        var params = { cod_cliente: orig.cod };
        if (orig.id === 'comolatti') params.limite_min = numBR(orig.limite);
        await p.call('/painel/metas/metricas/' + orig.id, { method: 'PUT', body: { params: params } });
        setOrig(null); p.toast('Origem da meta salva', 'success'); carregar(); p.onSalvou && p.onSalvou();
      } catch (e) { setErroO(e.message); } finally { setSalvandoO(false); }
    };
    var linhaOrigem = function (m) {
      var o = m.origem; if (!o) return null;
      var box = { background: '#fff', border: '1px dashed ' + C.lilasBorda, borderRadius: 9, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: C.cinzaEsc };
      var tit = h('span', { style: { fontSize: 11, fontWeight: 700, color: C.roxoEsc, textTransform: 'uppercase', letterSpacing: '.03em' } }, 'De onde vem');
      if (o.tipo === 'cliente') {
        if (orig && orig.id === m.id) {
          var bb = buscaO.trim().toLowerCase();
          var opts = (clis || []).filter(function (c) { return !bb || c.nome.toLowerCase().indexOf(bb) >= 0 || String(c.cod_cliente).indexOf(bb) >= 0; }).slice(0, 60);
          return h('div', { style: Object.assign({}, box, { border: '1px solid ' + C.lilasMed }) }, tit,
            h('input', { type: 'search', autoFocus: true, value: buscaO, placeholder: 'Buscar por nome ou código', 'aria-label': 'Buscar cliente', onChange: function (e) { setBuscaO(e.target.value); }, style: Object.assign({}, S.inp, { height: 34 }) }),
            !clis && !erroO && h('span', { style: { color: C.cinza } }, 'Carregando clientes…'),
            clis && h('div', { role: 'listbox', 'aria-label': 'Clientes', style: { maxHeight: 180, overflowY: 'auto', border: '1px solid ' + C.borda, borderRadius: 8 } }, opts.map(function (c) {
              var on = Number(orig.cod) === Number(c.cod_cliente);
              return h('button', { key: c.chave, type: 'button', role: 'option', 'aria-selected': on, onClick: function () { setOrig(Object.assign({}, orig, { cod: c.cod_cliente })); }, style: { display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '7px 10px', border: 0, borderTop: '1px solid ' + C.bordaLeve, background: on ? C.lilas : '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, textAlign: 'left', color: '#111827' } },
                h('span', { style: { fontSize: 11, fontWeight: 700, color: C.roxoEsc, background: on ? '#fff' : C.lilas, borderRadius: 6, padding: '1px 6px' } }, c.cod_cliente), h('span', { style: { flex: 1, fontWeight: on ? 700 : 500 } }, c.nome), on ? ico('check', 14, { color: C.roxo }) : h('span', { style: { color: C.cinza } }, inteiro(c.entregas_mes)));
            }), opts.length === 0 && h('div', { style: { padding: 10, color: C.cinza } }, 'Nenhum cliente encontrado.')),
            m.id === 'comolatti' && h('label', { style: Object.assign({}, S.lbl, { maxWidth: 200 }) }, 'Limite (minutos)', h('input', { type: 'text', inputMode: 'numeric', value: orig.limite, onChange: function (e) { setOrig(Object.assign({}, orig, { limite: e.target.value })); }, style: Object.assign({}, S.inp, { height: 34 }) })),
            erroO && h('div', { role: 'alert', style: { color: C.verm } }, erroO),
            h('span', { style: { color: C.cinza } }, 'Vale para a competência aberta; meses fechados não mudam.'),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 6 } }, h(Btn, { pequeno: true, onClick: function () { setOrig(null); } }, 'Cancelar'), h(Btn, { pequeno: true, primario: true, disabled: salvandoO || !orig.cod, onClick: salvarOrigem }, salvandoO ? 'Salvando…' : 'Salvar origem')));
        }
        return h('div', { style: box }, tit,
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
            h('span', null, 'Cliente ', h('b', { style: { color: '#111827' } }, o.nome), ' (' + o.cod_cliente + ')' + (m.id === 'comolatti' ? ' · cada CC é uma filial · até ' + (o.limite_min || 120) + ' min' : ' · todos os CCs juntos')),
            p.editavel && h('button', { type: 'button', onClick: function () { abrirOrigem(m); }, style: { border: 0, background: 'none', padding: '2px 0', color: C.roxo, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' } }, 'Trocar')));
      }
      if (o.tipo === 'grupo_gerencial') return h('div', { style: box }, tit, h('span', null, 'Clientes do grupo Porto Seco no Gerencial:'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } }, (o.clientes || []).length ? o.clientes.map(function (c, i) { return h('span', { key: i, style: { fontSize: 11, background: C.lilas, color: C.roxoEsc, borderRadius: 99, padding: '2px 8px', fontWeight: 600 } }, c); }) : h('span', { style: { color: C.ambar } }, 'Nenhum cliente no grupo')),
        h('span', { style: { color: C.cinza } }, 'Muda em Gerencial › Configuração.'));
      if (o.tipo === 'disponibilidade') return h('div', { style: box }, tit, h('span', null, 'Lojas com mínimo de entregadores cadastrado na Disponibilidade do BI (cliente inteiro ou por CC). As lojas de cada pessoa são escolhidas no Configurar.'));
      if (o.tipo === 'painel') return h('div', { style: box }, tit, h('span', null, 'Importações do Digisac no Meu Painel, pelo vínculo de cada pessoa (aba Vínculos).'));
      return null;
    };
    var carregar = function () { p.call('/painel/metas/metricas?competencia=' + p.comp).then(setD).catch(function (e) { setErro(e.message); }); };
    useEffect(carregar, [p.comp]);
    if (erro) return h('div', { role: 'alert', style: { color: C.verm } }, erro);
    if (!d) return h(Carregando);
    var abrir = function (m) { setEdit(m.id); setErroEd(null); setLinhas(m.faixas.map(function (f) { return { lim: f.lim == null ? '' : String(f.lim).replace('.', ','), mult: String(f.mult) }; })); };
    var salvar = async function (m) {
      setSalvando(true); setErroEd(null);
      try { await p.call('/painel/metas/metricas/' + m.id, { method: 'PUT', body: { faixas: linhas.map(function (l, i) { return { lim: i === linhas.length - 1 ? null : numBR(l.lim), mult: numBR(l.mult) }; }) } }); setEdit(null); p.toast('Faixas salvas', 'success'); carregar(); p.onSalvou && p.onSalvou(); }
      catch (e) { setErroEd(e.message); } finally { setSalvando(false); }
    };
    var u = function (m) { return m.unidade === 'pct' ? '%' : m.unidade === 'min' ? ' min' : ' dias'; };
    var rotulo = function (m, i) {
      var f = m.faixas[i];
      if (f.lim == null) { var ant = m.faixas[i - 1]; return m.direcao === 'maior' ? 'Menos de ' + num2(ant.lim, Number.isInteger(ant.lim) ? 0 : 1) + u(m) : 'Mais de ' + num2(ant.lim, Number.isInteger(ant.lim) ? 0 : 1) + u(m); }
      var ac = num2(f.lim, Number.isInteger(f.lim) ? 0 : 1) + u(m);
      if (m.direcao === 'maior') { if (i === 0) return ac + ' ou mais'; var sup = m.faixas[i - 1].lim; return ac + ' a ' + num2(sup - 0.01, 2) + u(m); }
      if (i === 0) return 'Até ' + ac; return 'Acima de ' + num2(m.faixas[i - 1].lim, Number.isInteger(m.faixas[i - 1].lim) ? 0 : 1) + ' até ' + ac;
    };
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      h('p', { style: { margin: 0, color: C.cinza } }, 'O valor exato do limite cai na faixa de cima (75,00% → 75%; 2 dias → 120%; 3,0 min → 100%). Mudança vale para a competência aberta; mês fechado não muda.'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 14 } }, d.metricas.map(function (m) {
        var em = edit === m.id;
        return h('section', { key: m.id, 'aria-label': m.nome, style: Object.assign({}, S.card, { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, border: em ? '2px solid ' + C.roxo : S.card.border }) },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' } }, h('div', null, h('b', { style: { fontSize: 14 } }, m.nome), h('div', { style: { fontSize: 12, color: C.cinza } }, m.descricao + (!m.origem && m.id === 'comando' && m.params && m.params.cod_cliente ? ' (' + m.params.cod_cliente + ')' : '') + (!m.origem && m.porto_seco_clientes != null ? ' · ' + m.porto_seco_clientes + ' itens no grupo' : ''))), h('span', { style: S.origem(m.fonte === 'painel' ? 'painel' : 'bi') }, m.fonte === 'painel' ? 'Meu Painel' : 'BI')),
          linhaOrigem(m),
          h('div', { style: { background: C.fundo, borderRadius: 9, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', gap: 8 } }, h('span', { style: { color: C.cinza } }, 'Resultado de ' + compNome(d.competencia).toLowerCase()), h('b', null, m.resultado ? pct(m.resultado.valor) + ' → ' + pct(m.resultado.multiplo) : m.tipo === 'lojas' ? 'por loja' : m.tipo === 'filiais' ? 'por filial' : m.fonte === 'painel' ? 'por funcionário' : '—')),
          em
            ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 6, fontSize: 11, fontWeight: 700, color: C.roxoEsc, textTransform: 'uppercase' } }, h('span', null, m.direcao === 'maior' ? 'A partir de' : 'Até'), h('span', null, 'Múltiplo %'), h('span', null)),
              linhas.map(function (l, i) {
                var ultimo = i === linhas.length - 1;
                return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 6, alignItems: 'center' } },
                  ultimo ? h('span', { style: { fontSize: 12, color: C.cinza } }, 'resto') : h('input', { type: 'text', inputMode: 'decimal', 'aria-label': 'Limite da faixa ' + (i + 1), value: l.lim, onChange: function (e) { var n = linhas.slice(); n[i] = Object.assign({}, l, { lim: e.target.value }); setLinhas(n); }, style: Object.assign({}, S.inp, { height: 32 }) }),
                  h('input', { type: 'text', inputMode: 'decimal', 'aria-label': 'Múltiplo da faixa ' + (i + 1), value: l.mult, onChange: function (e) { var n = linhas.slice(); n[i] = Object.assign({}, l, { mult: e.target.value }); setLinhas(n); }, style: Object.assign({}, S.inp, { height: 32 }) }),
                  !ultimo && linhas.length > 2 ? h('button', { type: 'button', 'aria-label': 'Remover faixa ' + (i + 1), onClick: function () { setLinhas(linhas.filter(function (_, j) { return j !== i; })); }, style: { width: 32, height: 32, border: 0, background: 'none', color: '#9ca3af', cursor: 'pointer', display: 'grid', placeItems: 'center' } }, ico('trash', 14)) : h('span', null));
              }),
              linhas.length < 8 && h('button', { type: 'button', onClick: function () { var n = linhas.slice(); n.splice(n.length - 1, 0, { lim: '', mult: '' }); setLinhas(n); }, style: { alignSelf: 'flex-start', border: 0, background: 'none', color: C.roxo, fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' } }, '+ Adicionar faixa'),
              erroEd && h('div', { role: 'alert', style: { color: C.verm, fontSize: 12 } }, erroEd),
              h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 6 } }, h(Btn, { pequeno: true, onClick: function () { setEdit(null); } }, 'Cancelar'), h(Btn, { pequeno: true, primario: true, disabled: salvando, style: { height: 30 }, onClick: function () { salvar(m); } }, salvando ? 'Salvando…' : 'Salvar faixas')))
            : h('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px', fontSize: 12 } }, m.faixas.map(function (f, i) {
              var atual = m.resultado && Number(m.resultado.multiplo) === Number(f.mult);
              return [h('span', { key: 'l' + i, style: atual ? { background: C.lilasFundo, borderRadius: 4, padding: '0 4px' } : null }, rotulo(m, i)), h('b', { key: 'm' + i, style: { color: f.mult >= 100 ? C.roxoEsc : f.mult >= 50 ? C.ambar : C.verm } }, f.mult + '%')];
            })),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderTop: '1px solid ' + C.bordaLeve, paddingTop: 8 } },
            h('span', { style: { fontSize: 12, color: C.cinza } }, m.aplicada_a.length ? m.aplicada_a.join(', ') : 'Ninguém com esta meta'),
            !em && p.editavel && h(Btn, { pequeno: true, onClick: function () { abrir(m); } }, 'Editar faixas')));
      })));
  }

  function AbaHistorico(p) {
    var [logs, setLogs] = useState(null), [erro, setErro] = useState(null);
    useEffect(function () { p.call('/painel/metas/logs?competencia=' + p.comp).then(function (d) { setLogs(d.logs || []); }).catch(function (e) { setErro(e.message); }); }, [p.comp]);
    if (erro) return h('div', { role: 'alert', style: { color: C.verm } }, erro);
    if (!logs) return h(Carregando);
    if (!logs.length) return h('div', { style: Object.assign({}, S.card, { padding: 24, color: C.cinza, textAlign: 'center' }) }, 'Nada registrado nesta competência.');
    var curto = function (v) { if (v == null) return ''; var s = String(v); return s.length > 140 ? s.slice(0, 140) + '…' : s; };
    return h('section', { 'aria-label': 'Histórico', style: Object.assign({}, S.card, { overflow: 'hidden' }) },
      logs.map(function (l, i) {
        return h('div', { key: l.id, style: { display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', gap: 12, padding: '10px 14px', borderTop: i ? '1px solid ' + C.bordaLeve : 0 } },
          h('span', { style: { fontSize: 12, color: C.cinza } }, fmtDataHora(l.criado_em)),
          h('span', { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } }, h('span', null, h('b', null, l.usuario || '—'), ' · ', l.descricao || l.acao),
            (l.valor_anterior != null || l.valor_novo != null) && h('span', { style: { fontSize: 12, color: C.cinza, overflowWrap: 'anywhere' } }, curto(l.valor_anterior) + (l.valor_anterior != null ? ' → ' : '') + curto(l.valor_novo))));
      }));
  }

  // ════════════════════════════════════════════════════════════
  // FUNCIONÁRIO · MINHA META
  // ════════════════════════════════════════════════════════════
  function PainelMinhaMeta(props) {
    var api = props.api || props.apiUrl || window.API_URL || '';
    var call = useApi(api, props.fetchAuth);
    var toast = props.showToast || function () {};
    var [comp, setComp] = useState(compHoje());
    var [d, setD] = useState(null), [loading, setLoading] = useState(true), [erro, setErro] = useState(null);
    var [tip, setTip] = useState(null);
    var carregar = useCallback(async function () { setLoading(true); setErro(null); try { setD(await call('/painel/minha-meta?competencia=' + comp)); } catch (e) { setErro(e.message); } finally { setLoading(false); } }, [call, comp]);
    useEffect(function () { carregar(); }, [carregar]);

    var topo = h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 } },
      h('div', null, h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 22 } }, 'Minha meta'),
        h('p', { style: { margin: '4px 0 0', color: C.cinza, fontSize: 13 } }, d && d.configurado ? compNome(comp) + ' · ' + (d.status === 'aberto' ? 'prévia, atualizada ' + fmtDataHora(d.atualizado_em) + ' com os dados do BI' : d.status === 'pago' ? 'paga' : 'fechada') + '. Só você vê esta tela.' : 'Só você vê esta tela.')),
      h(SeletorMes, { comp: comp, onChange: setComp }));
    var estilo = h('style', null, '@keyframes metasSk{0%{background-position:200% 0}100%{background-position:-200% 0}}');
    if (loading && !d) return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } }, estilo, topo, h(Carregando));
    if (erro) return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } }, topo, h('div', { role: 'alert', style: Object.assign({}, S.card, { padding: 20, color: C.verm, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }) }, erro, h(Btn, { onClick: carregar }, 'Tentar de novo')));
    if (!d.configurado) return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } }, topo,
      h('div', { style: Object.assign({}, S.card, { padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderStyle: 'dashed', borderColor: C.lilasMed }) },
        h('span', { style: { width: 52, height: 52, borderRadius: 14, background: C.lilas, color: C.roxo, display: 'grid', placeItems: 'center' } }, ico('target', 24)),
        h('b', { style: { fontSize: 16 } }, 'Você ainda não tem metas configuradas'),
        h('span', { style: { color: C.cinza, maxWidth: 420 } }, 'Quando o seu gestor configurar as suas metas, elas aparecem aqui com o quanto você vai receber no mês.')));
    var eu = d.eu;
    if (!eu) return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } }, topo, h('div', { style: Object.assign({}, S.card, { padding: 24, color: C.cinza, textAlign: 'center' }) }, 'Você não tinha metas em ' + compNome(comp).toLowerCase() + '.'));
    var fechadoOuPago = d.status !== 'aberto';
    var ating = eu.atingimento || 0;
    var R = 50, circ = 2 * Math.PI * R, prog = Math.max(0, Math.min(150, ating)) / 150 * circ;
    var ant = d.anterior;
    var diffTot = ant && ant.total != null && eu.total != null ? eu.total - ant.total : null;
    var diffAt = ant && ant.atingimento != null && eu.atingimento != null ? eu.atingimento - ant.atingimento : null;
    var hero = h('section', { 'aria-label': 'Resumo do mês', style: { background: 'linear-gradient(120deg,#3a1556,#5d0b85)', color: '#fff', borderRadius: 16, padding: '20px 22px', display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'center' } },
      h('div', { style: { position: 'relative', width: 120, height: 120, flex: 'none' } },
        h('svg', { width: 120, height: 120, viewBox: '0 0 120 120', role: 'img', 'aria-label': 'Atingimento de ' + pct(eu.atingimento) },
          h('circle', { cx: 60, cy: 60, r: R, fill: 'none', stroke: 'rgba(255,255,255,.18)', strokeWidth: 12 }),
          h('circle', { cx: 60, cy: 60, r: R, fill: 'none', stroke: '#f6a14a', strokeWidth: 12, strokeLinecap: 'round', strokeDasharray: prog + ' ' + circ, transform: 'rotate(-90 60 60)' })),
        h('div', { style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' } }, h('span', null, h('b', { style: { fontFamily: SORA, fontSize: 22 } }, eu.atingimento != null ? Math.round(eu.atingimento) + '%' : '—'), h('span', { style: { display: 'block', fontSize: 11, color: '#e9d5f9' } }, 'atingimento')))),
      h('div', { style: { flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 } },
        h('span', { style: { color: '#e9d5f9' } }, eu.total == null ? 'Suas metas são acompanhadas (sem bonificação)' : d.status === 'pago' ? 'Você recebeu' : fechadoOuPago ? 'Valor fechado do mês' : 'Você vai receber, se o mês fechar assim'),
        h('span', { style: { fontFamily: SORA, fontSize: 34, fontWeight: 800 } }, eu.total == null ? pct(eu.atingimento) : brl(eu.total)),
        h('span', { style: { color: '#e9d5f9' } }, eu.base.valor != null ? 'de uma base de ' + brl(eu.base.valor) + (eu.parcela != null ? ' · ' + brl(eu.parcela) + ' por meta · ' + eu.consideradas + (eu.consideradas === 1 ? ' meta' : ' metas') : '') : eu.consideradas + ' de ' + eu.total_metas + ' metas com resultado')),
      ant && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 200px', maxWidth: 280 } },
        h('div', { style: { background: 'rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 12px' } }, h('span', { style: { fontSize: 12, color: '#e9d5f9' } }, ant.competencia_nome.charAt(0).toUpperCase() + ant.competencia_nome.slice(1) + (ant.status === 'pago' ? ' (pago)' : ant.status === 'fechado' ? ' (fechado)' : ' (prévia)')), h('div', { style: { fontWeight: 700 } }, (ant.total != null ? brl(ant.total) + ' · ' : '') + pct(ant.atingimento))),
        (diffTot != null || diffAt != null) && h('div', { style: { background: 'rgba(255,255,255,.1)', borderRadius: 12, padding: '10px 12px' } }, h('span', { style: { fontSize: 12, color: '#e9d5f9' } }, fechadoOuPago ? 'Contra o mês anterior' : 'Até agora, contra o mês anterior'), h('div', { style: { fontWeight: 700 } }, [diffTot != null ? (diffTot >= 0 ? '+' : '−') + brl(Math.abs(diffTot)) : null, diffAt != null ? (diffAt >= 0 ? '+' : '−') + num2(Math.abs(diffAt), 1) + ' p.p.' : null].filter(Boolean).join(' · ')))));

    var cards = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 } }, eu.metas.map(function (m) {
      var multi = m.itens && m.itens.length;
      var pior = multi ? piorQueda(m.itens.filter(function (i) { return !i.sem_dados; })) : null;
      return h('section', { key: m.id, 'aria-label': m.nome, style: Object.assign({}, S.card, { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: m.desconsiderada ? '#fafafa' : '#fff' }) },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } }, h('b', { style: { fontSize: 14, color: m.desconsiderada ? C.cinza : '#111827' } }, m.nome), h('span', { style: pillMult(m) }, m.desconsiderada ? 'fora do mês' : m.pendente ? 'pendente' : m.multiplo_txt)),
        m.desconsiderada ? h('span', { style: { color: C.cinza } }, 'Essa meta foi desconsiderada neste mês: ela saiu da divisão e as outras dividem a sua base.')
          : m.pendente ? h('span', { style: { color: C.verm } }, m.id === 'digisac' ? 'Ainda sem o tempo do Digisac deste mês. Assim que for importado, a meta entra na conta.' : (m.detalhe || 'Sem resultado ainda'))
            : !multi ? [
              h('div', { key: 'v' }, h('span', { style: { fontFamily: SORA, fontSize: 22, fontWeight: 700 } }, unidadeTxt(m.unidade, m.resultado)), h('span', { style: { color: C.cinza } }, ' ' + (m.id === 'digisac' ? 'de 1º atendimento médio' : 'das entregas no prazo'))),
              h(BarraFaixas, { key: 'b', meta: m }),
              m.dicas && m.dicas.proxima ? h('span', { key: 'd', style: { background: C.lilasFundo, borderRadius: 9, padding: '8px 10px', color: C.cinzaEsc } }, textoDica(m)) : h('span', { key: 'd', style: { background: C.lilasFundo, borderRadius: 9, padding: '8px 10px', color: C.roxoEsc, fontWeight: 600 } }, 'Você está na faixa máxima'),
              h('span', { key: 'det', style: { fontSize: 12, color: C.cinza } }, m.detalhe || '')]
              : [
                h('span', { key: 'det', style: { color: C.cinza } }, m.detalhe),
                h('div', { key: 'l', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: '6px 10px', alignItems: 'center' } }, m.itens.map(function (i) {
                  return [h('span', { key: i.chave + 'n', style: { color: i.sem_dados ? '#9ca3af' : '#111827' } }, i.nome),
                    h('span', { key: i.chave + 'd', style: { fontSize: 12, color: C.cinza } }, i.sem_dados ? 'sem dados' : (m.id === 'clientes_prof' ? i.resultado + (i.resultado === 1 ? ' dia abaixo' : ' dias abaixo') : num2(i.resultado, 1) + '% em 2h')),
                    h('b', { key: i.chave + 'm', style: i.sem_dados ? { color: '#9ca3af', fontSize: 12 } : Object.assign({ fontSize: 12, borderRadius: 99, padding: '0 8px' }, estiloPorMult(i.multiplo)) }, i.sem_dados ? '—' : pct(i.multiplo))];
                })),
                pior && h('span', { key: 'q', style: { background: C.ambarFundo, borderRadius: 9, padding: '8px 10px', color: C.cinzaEsc } }, 'Atenção em ', h('b', null, pior.nome), m.id === 'clientes_prof' ? ': mais ' + pior.dicas.queda.folga + (pior.dicas.queda.folga === 1 ? ' dia abaixo' : ' dias abaixo') + ' e cai para ' + pior.dicas.queda.mult + '%' : pior.dicas.queda.folga < 0.05 ? ': está no limite, qualquer queda leva para ' + pior.dicas.queda.mult + '%' : ': a ' + num2(pior.dicas.queda.folga, 1) + ' p.p. de cair para ' + pior.dicas.queda.mult + '%')],
        m.valor != null && h('span', { style: { fontSize: 12, color: C.cinza } }, (fechadoOuPago ? 'Valeu ' : 'Vale ') + brl(m.valor) + (fechadoOuPago ? '' : ' agora') + ' (' + brl(eu.parcela) + ' × ' + m.multiplo_txt + ')'));
    }));

    var hist = d.historico || [];
    var maxH = Math.max(120, Math.max.apply(null, hist.map(function (x) { return x.atingimento || 0; })));
    var grafico = h('section', { 'aria-label': 'Últimos meses', style: Object.assign({}, S.card, { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }) },
      h('b', { style: { fontSize: 14 } }, 'Últimos meses'),
      h('div', { style: { height: 140, display: 'flex', alignItems: 'flex-end', gap: 10 } }, hist.map(function (x, i) {
        var atual = x.competencia === comp; var vazio = x.atingimento == null;
        var hgt = vazio ? 4 : Math.max(4, x.atingimento / maxH * 100);
        var bg = vazio ? C.bordaLeve : atual && x.status === 'aberto' ? 'repeating-linear-gradient(45deg,#770fa8 0 5px,#a36bd1 5px 10px)' : atual ? C.roxo : '#d8c3ea';
        var info = compNome(x.competencia) + ': ' + (vazio ? 'sem metas' : pct(x.atingimento) + (x.total != null ? ' · ' + brl(x.total) : '') + (x.status === 'aberto' ? ' (prévia)' : x.status === 'pago' ? ' (pago)' : ' (fechado)'));
        return h('button', { key: x.competencia, type: 'button', 'aria-label': info, onMouseEnter: function () { setTip({ i: i, t: info }); }, onMouseLeave: function () { setTip(null); }, onFocus: function () { setTip({ i: i, t: info }); }, onBlur: function () { setTip(null); }, onClick: function () { if (x.competencia !== comp) setComp(x.competencia); },
          style: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4, border: 0, background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', position: 'relative' } },
          h('span', { style: { fontSize: 11, color: atual ? C.roxoEsc : C.cinza, fontWeight: atual ? 700 : 400 } }, vazio ? '' : Math.round(x.atingimento) + '%'),
          h('span', { style: { width: '100%', height: hgt + '%', background: bg, borderRadius: '6px 6px 0 0', transition: 'height .3s' } }),
          h('span', { style: { fontSize: 11, color: atual ? C.roxoEsc : C.cinza, fontWeight: atual ? 700 : 400 } }, compCurto(x.competencia) + (atual && x.status === 'aberto' ? '*' : '')),
          tip && tip.i === i && h('span', { role: 'tooltip', style: { position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#111827', color: '#fff', fontSize: 11, padding: '5px 8px', borderRadius: 7, whiteSpace: 'nowrap', zIndex: 2, marginBottom: 4 } }, tip.t));
      })),
      h('span', { style: { fontSize: 12, color: C.cinza } }, 'Atingimento médio por mês · * prévia. Toque numa barra para abrir o mês.'));

    var como = h('section', { 'aria-label': 'Como é calculado', style: Object.assign({}, S.card, { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }) },
      h('b', { style: { fontSize: 14 } }, 'Como é calculado'),
      h('span', { style: { color: C.cinzaEsc, lineHeight: 1.6 } }, eu.como_calculado),
      h('span', { style: { fontSize: 12, color: C.cinza } }, 'Cada meta paga a parte dela vezes a faixa atingida (0%, 50%, 75%, 100%, 120% ou 150%). Os números do BI atualizam até o fechamento; depois de fechado, o valor não muda.'),
      h(Btn, { style: { alignSelf: 'flex-start' }, onClick: function () { if (!imprimirResumo(eu, comp, d.status)) toast('Libere os pop-ups para baixar o resumo', 'error'); } }, ico('download', 14), 'Baixar meu resumo do mês'));

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16, color: '#111827', fontSize: 13 } }, estilo, topo, hero, cards,
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 } }, grafico, como));
  }

  window.PainelMetasMaster = PainelMetasMaster;
  window.PainelMinhaMeta = PainelMinhaMeta;
  window.MetasBonus = { textoResumo: textoResumo };
})();
