/* LOCACAO_MOTOS_V1: módulo Locação de Motos (Central) — painel/frota, pré-cadastros,
   motos + vistorias, contratos + parcelas, configurações. Padrão clean (Sora 24, faixa de
   KPIs, cards brancos borda #e5e7eb, tabelas cabeçalho #f9fafb). Contrato de API:
   /api/locacao-motos (admin). */
(function () {
  'use strict';
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useCallback = React.useCallback, useMemo = React.useMemo, useRef = React.useRef;

  // ───────────────────────── helpers ─────────────────────────
  var SORA = 'Sora, Inter, sans-serif';
  var MONO = 'ui-monospace, Menlo, monospace';
  var TAB = { fontVariantNumeric: 'tabular-nums' };
  var ROXO = '#770fa8', ROXO_ESC = '#5d0b85';
  var DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var DIAS_LONGO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var DIA_VENC = [[1, 'Segunda-feira'], [2, 'Terça-feira'], [3, 'Quarta-feira'], [4, 'Quinta-feira'], [5, 'Sexta-feira'], [6, 'Sábado']];
  var DIA_PLURAL = { 1: 'às segundas', 2: 'às terças', 3: 'às quartas', 4: 'às quintas', 5: 'às sextas', 6: 'aos sábados' };
  var TIPOS_VIST = [['retirada', 'Retirada'], ['revisao', 'Revisão'], ['periodica', 'Periódica'], ['devolucao', 'Devolução']];
  var POSICOES = [['frente', 'Frente'], ['traseira', 'Traseira'], ['lateral_esq', 'Lateral esq.'], ['lateral_dir', 'Lateral dir.'], ['painel', 'Painel'], ['pneus', 'Pneus']];
  var DOCS = { cnh_frente: 'CNH · frente', cnh_verso: 'CNH · verso', selfie_cnh: 'Selfie com a CNH', comprovante: 'Comprovante de residência' };

  function ico(nome, size, extra) {
    return h('svg', { className: 'ico', style: Object.assign({ width: size || 16, height: size || 16, fontSize: size || 16, flex: 'none' }, extra || {}), 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));
  }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function fR(v) { if (v == null || v === '') return '—'; return 'R$ ' + num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fN(v) { return v == null ? '—' : num(v).toLocaleString('pt-BR'); }
  function parseData(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s));
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(s); return isNaN(d) ? null : d;
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fD(s) { var d = parseData(s); return d ? p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() : '—'; }
  function fDC(s) { var d = parseData(s); return d ? p2(d.getDate()) + '/' + p2(d.getMonth() + 1) : '—'; }
  function fDS(s, curto) { var d = parseData(s); return d ? (curto ? fDC(d) : fD(d)) + ' (' + DIAS[d.getDay()] + ')' : '—'; }
  function fDH(s) { var d = parseData(s); return d ? fD(d) + ' às ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) : '—'; }
  function fDHc(s) { var d = parseData(s); return d ? fDC(d) + ' · ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) : '—'; }
  function iso(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function hojeISO() { return iso(new Date()); }
  function iniciais(nome) { var p = String(nome || '').trim().split(/\s+/); return ((p[0] || '')[0] || '').toUpperCase() + ((p.length > 1 ? p[p.length - 1][0] : '') || '').toUpperCase(); }
  function soDig(s) { return String(s || '').replace(/\D/g, ''); }
  function fTel(s) { var d = soDig(s); if (d.length > 11 && d.slice(0, 2) === '55') d = d.slice(2); if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7); if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6); return s || '—'; }

  function copiar(txt, toast) {
    var ok = function () { toast && toast('Copiado', 'success'); };
    try {
      if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(txt).then(ok, function () { fallback(); }); return; }
    } catch (e) { /* segue */ }
    fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast && toast('Não deu para copiar. Selecione e copie à mão.', 'error'); }
      document.body.removeChild(ta);
    }
  }

  // Reduz a foto para no máximo 1280px (jpeg 0.8). PDF passa direto como dataURL.
  function lerArquivo(file, max, q) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('Sem arquivo'));
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('Não foi possível ler o arquivo')); };
      fr.onload = function () {
        var url = fr.result;
        if (!/^image\//.test(file.type)) return resolve(url);
        var img = new Image();
        img.onload = function () {
          var M = max || 1280, w = img.naturalWidth, hh = img.naturalHeight, k = Math.min(1, M / Math.max(w, hh));
          var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(hh * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          try { resolve(c.toDataURL('image/jpeg', q || 0.8)); } catch (e) { resolve(url); }
        };
        img.onerror = function () { resolve(url); };
        img.src = url;
      };
      fr.readAsDataURL(file);
    });
  }

  // Pílulas: tons 50/800 + ponto 600
  var TONS = {
    verde: ['#f0fdf4', '#166534', '#16a34a'], ambar: ['#fffbeb', '#92400e', '#d97706'], vermelho: ['#fef2f2', '#991b1b', '#dc2626'],
    azul: ['#eff6ff', '#1e40af', '#2563eb'], roxo: ['#f3e8fb', '#5d0b85', '#770fa8'], cinza: ['#f3f4f6', '#374151', '#6b7280'], cinzaClaro: ['#f3f4f6', '#374151', '#9ca3af']
  };
  function Pill(txt, tom, semPonto) {
    var T = TONS[tom] || TONS.cinza;
    return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', background: T[0], color: T[1] } },
      semPonto ? null : h('span', { 'aria-hidden': 'true', style: { width: 6, height: 6, borderRadius: 99, background: T[2], flex: 'none' } }), txt);
  }
  var TOM_MOTO = { disponivel: 'cinza', manutencao: 'cinzaClaro', reservada: 'azul', alugada: 'verde', em_retomada: 'vermelho', transferencia_liberada: 'roxo' };
  var TOM_SIT = { aguardando_assinatura: 'azul', em_dia: 'verde', atrasada: 'ambar', em_retomada: 'vermelho', quitado: 'roxo', encerrado: 'cinza', recusado: 'vermelho', cancelado: 'cinzaClaro' };
  var TOM_PARC = { a_vencer: 'cinzaClaro', vence_hoje: 'azul', atrasada: 'vermelho', paga: 'verde', cancelada: 'cinzaClaro' };
  var TOM_PRE = { novo: 'azul', em_analise: 'roxo', aguardando_documentos: 'ambar', aprovado: 'verde', contrato_criado: 'verde', reprovado: 'vermelho' };
  var ROT_PRE = { novo: 'Novo', em_analise: 'Em análise', aguardando_documentos: 'Docs pendentes', aprovado: 'Aprovado', contrato_criado: 'Contrato criado', reprovado: 'Reprovado' };
  var TOM_VIST = { aguardando: 'ambar', aprovada: 'verde', com_avaria: 'vermelho' };
  var ROT_VIST = { aguardando: 'Aguardando aprovação', aprovada: 'Aprovada', com_avaria: 'Com avaria' };
  var ROT_MOTO = { disponivel: 'Disponível', manutencao: 'Manutenção', reservada: 'Reservada · aguardando assinatura', alugada: 'Alugada', em_retomada: 'Em retomada', transferencia_liberada: 'Transferência liberada' };

  function pillMoto(m) {
    if (m.status === 'alugada' && m.situacao === 'atrasada') return Pill(m.situacao_label || ('Atrasada ' + (m.dias_atraso || 0) + 'd'), 'ambar');
    if (m.status === 'alugada') return Pill('Alugada · em dia', 'verde');
    return Pill(m.status_label || ROT_MOTO[m.status] || m.status, TOM_MOTO[m.status] || 'cinza');
  }
  function pillSit(c) { return Pill(c.situacao_label || c.situacao, TOM_SIT[c.situacao] || 'cinza'); }
  function pillParc(p) { return Pill(p.status_label || p.status, TOM_PARC[p.status] || 'cinza'); }

  // ───────── componentes de UI ─────────
  var CARD = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14 };
  function Card(props) {
    return h('section', { style: Object.assign({}, CARD, props.pad === false ? { overflow: 'hidden' } : { padding: 16 }, props.style || {}), 'aria-label': props.label || null }, props.children);
  }
  function CardHead(titulo, direita, sub) {
    return h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
      h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', marginRight: 8 } }, titulo),
      sub ? h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, sub) : null,
      h('div', { style: { flex: 1 } }),
      direita || null);
  }
  function Btn(props) {
    var v = props.variant || 'sec';
    var base = { height: props.small ? 32 : 40, padding: props.small ? '0 11px' : '0 14px', borderRadius: 10, fontWeight: 600, fontSize: props.small ? 12.5 : 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap', cursor: props.disabled ? 'not-allowed' : 'pointer', opacity: props.disabled ? 0.55 : 1, border: '1px solid transparent' };
    var st = {
      pri: { background: ROXO, color: '#ffffff' },
      sec: { background: '#ffffff', color: '#374151', borderColor: '#e5e7eb' },
      perigo: { background: '#ffffff', color: '#991b1b', borderColor: '#fecaca' },
      perigoCheio: { background: '#dc2626', color: '#ffffff' },
      verde: { background: '#16a34a', color: '#ffffff' },
      link: { background: 'transparent', color: ROXO, height: 'auto', padding: 0 }
    }[v];
    return h('button', { key: props.key, type: props.type || 'button', onClick: props.disabled ? null : props.onClick, disabled: props.disabled, title: props.title || null, 'aria-label': props.ariaLabel || null, style: Object.assign(base, st, props.style || {}), className: v === 'pri' ? 'hover:opacity-90' : (v === 'link' ? 'hover:underline' : 'hover:bg-gray-50') },
      props.icon ? ico(props.icon, props.small ? 14 : 15) : null, props.children);
  }
  function Spinner(txt) {
    return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px', color: '#6b7280', fontSize: 13 } },
      h('div', { className: 'animate-spin', style: { width: 28, height: 28, borderRadius: 99, border: '3px solid #e9d5f9', borderTopColor: ROXO, marginBottom: 10 } }), txt || 'Carregando...');
  }
  function Vazio(titulo, sub, acao) {
    return h('div', { style: { textAlign: 'center', padding: '40px 16px', color: '#6b7280' } },
      h('div', { style: { fontSize: 14, fontWeight: 600, color: '#374151' } }, titulo),
      sub ? h('div', { style: { fontSize: 13, marginTop: 4 } }, sub) : null,
      acao ? h('div', { style: { marginTop: 12 } }, acao) : null);
  }
  function Erro(msg, onRetry) {
    return h('div', { role: 'alert', style: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', color: '#991b1b' } },
      ico('alert', 18, { marginTop: 1 }),
      h('div', { style: { flex: 1 } }, h('div', { style: { fontWeight: 600, fontSize: 14 } }, 'Não foi possível carregar'), h('div', { style: { fontSize: 13, marginTop: 2 } }, msg)),
      onRetry ? Btn({ small: true, onClick: onRetry, icon: 'refresh', children: 'Tentar de novo' }) : null);
  }
  function Field(props) {
    return h('label', { style: Object.assign({ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }, props.style || {}) },
      h('span', { style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, props.label, props.req ? h('span', { style: { color: ROXO } }, ' *') : null, props.opt ? h('span', { style: { color: '#9ca3af', fontWeight: 500 } }, ' · opcional') : null),
      props.children,
      props.hint ? h('span', { style: { fontSize: 11.5, color: props.hintCor || '#6b7280' } }, props.hint) : null);
  }
  var INPUT = { height: 40, padding: '0 12px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13.5, background: '#ffffff', color: '#111827', width: '100%', minWidth: 0, fontFamily: 'inherit' };
  var INPUT_CLS = 'focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-700';
  function Input(props) {
    return h('input', Object.assign({}, props, { className: INPUT_CLS, style: Object.assign({}, INPUT, props.style || {}) }));
  }
  function Select(props, opts) {
    return h('select', Object.assign({}, props, { className: INPUT_CLS, style: Object.assign({}, INPUT, props.style || {}) }), opts);
  }
  function TextArea(props) {
    return h('textarea', Object.assign({}, props, { className: INPUT_CLS, style: Object.assign({}, INPUT, { height: 'auto', padding: '10px 12px', lineHeight: 1.45, resize: 'vertical' }, props.style || {}) }));
  }
  function Segmented(opcoes, valor, onChange, nome) {
    return h('div', { role: 'radiogroup', 'aria-label': nome || null, style: { display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#ffffff' } },
      opcoes.map(function (o, i) {
        var on = valor === o[0];
        return h('button', { key: String(o[0]), type: 'button', role: 'radio', 'aria-checked': on, onClick: function () { onChange(o[0]); },
          style: { height: 38, padding: '0 14px', fontSize: 13, borderLeft: i ? '1px solid #e5e7eb' : 0, background: on ? '#faf7fd' : '#ffffff', color: on ? ROXO_ESC : '#6b7280', fontWeight: on ? 700 : 500, cursor: 'pointer' } }, o[1]);
      }));
  }
  function Chips(lista, valor, onChange) {
    return lista.map(function (c) {
      var on = valor === c.id;
      return h('button', { key: c.id, type: 'button', onClick: function () { onChange(c.id); }, 'aria-pressed': on,
        style: { height: 30, padding: '0 10px', borderRadius: 99, fontSize: 12.5, cursor: 'pointer', border: '1px solid ' + (on ? '#e9d5f9' : '#e5e7eb'), background: on ? '#faf7fd' : '#ffffff', color: on ? ROXO_ESC : '#374151', fontWeight: on ? 600 : 500 } },
        c.t, c.n != null ? h('b', { style: { marginLeft: 5 } }, c.n) : null);
    });
  }
  function KpiStrip(itens) {
    return h('section', { 'aria-label': 'Indicadores', className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5', style: Object.assign({}, CARD, { overflow: 'hidden' }) },
      itens.map(function (k, i) {
        return h('div', { key: i, style: { padding: '14px 18px', borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', marginBottom: -1 } },
          h('div', { style: { fontSize: 12, color: '#6b7280' } }, k.r),
          h('div', { style: Object.assign({ fontFamily: SORA, fontSize: 24, fontWeight: 700, color: k.cor || '#111827', lineHeight: 1.3 }, TAB) }, k.v),
          h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, k.s || ' '));
      }));
  }
  function Busca(valor, onChange, ph) {
    return h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 10px', border: '1px solid #e5e7eb', borderRadius: 10, color: '#9ca3af', minWidth: 220, flex: '0 1 280px', background: '#ffffff' } },
      ico('search', 14),
      h('input', { type: 'search', 'aria-label': 'Buscar', placeholder: ph, value: valor, onChange: function (e) { onChange(e.target.value); }, style: { border: 0, outline: 0, flex: 1, minWidth: 0, font: 'inherit', fontSize: 13, background: 'transparent', color: '#111827' } }));
  }
  var TH = { padding: '10px 12px', fontWeight: 600, fontSize: 12, color: '#6b7280', background: '#f9fafb', textAlign: 'left', whiteSpace: 'nowrap' };
  var TD = { padding: '12px', fontSize: 13, color: '#111827', verticalAlign: 'middle', whiteSpace: 'nowrap' };
  function Tabela(cols, linhas) {
    return h('div', { style: { overflowX: 'auto' } },
      h('table', { style: Object.assign({ width: '100%', borderCollapse: 'collapse' }, TAB) },
        h('thead', null, h('tr', null, cols.map(function (c, i) { return h('th', { key: i, style: Object.assign({}, TH, c.right ? { textAlign: 'right' } : {}, i === 0 ? { paddingLeft: 16 } : {}, c.w ? { width: c.w } : {}) }, c.t); }))),
        h('tbody', null, linhas)));
  }
  function Linha(key, celulas, onClick, extra) {
    return h('tr', { key: key, onClick: onClick || null, className: 'hover:bg-purple-50', style: Object.assign({ borderTop: '1px solid #f3f4f6', cursor: onClick ? 'pointer' : 'default' }, extra || {}) },
      celulas.map(function (c, i) {
        var cel = c && c.td ? c : { v: c };
        return h('td', { key: i, style: Object.assign({}, TD, i === 0 ? { paddingLeft: 16 } : {}, cel.right ? { textAlign: 'right', whiteSpace: 'nowrap' } : {}, cel.st || {}) }, cel.v);
      }));
  }
  function Modal(props) {
    useEffect(function () {
      var fn = function (e) { if (e.key === 'Escape' && props.onClose) props.onClose(); };
      document.addEventListener('keydown', fn);
      return function () { document.removeEventListener('keydown', fn); };
    }, [props.onClose]);
    return h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': props.titulo, onMouseDown: function (e) { if (e.target === e.currentTarget && props.onClose) props.onClose(); },
      style: { position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '6vh 16px 16px', overflowY: 'auto' } },
      h('div', { style: Object.assign({}, CARD, { width: '100%', maxWidth: props.largura || 560, boxShadow: '0 20px 50px -20px rgba(17,24,39,.35)' }) },
        h('div', { style: { padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 } },
          h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 17, fontWeight: 700, flex: 1 } }, props.titulo),
          h('button', { type: 'button', onClick: props.onClose, 'aria-label': 'Fechar', className: 'hover:bg-gray-100', style: { width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#6b7280', cursor: 'pointer' } }, ico('x', 16))),
        h('div', { style: { padding: 20 } }, props.children),
        props.rodape ? h('div', { style: { padding: '12px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' } }, props.rodape) : null));
  }
  function Aviso(tom, titulo, texto, icone) {
    var T = TONS[tom] || TONS.cinza, borda = { vermelho: '#fecaca', ambar: '#fde68a', azul: '#bfdbfe', verde: '#bbf7d0', roxo: '#e9d5f9', cinza: '#e5e7eb' }[tom] || '#e5e7eb';
    return h('div', { role: tom === 'vermelho' ? 'alert' : null, style: { background: T[0], border: '1px solid ' + borda, borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', color: T[1], fontSize: 13 } },
      ico(icone || (tom === 'vermelho' ? 'ban' : tom === 'ambar' ? 'alert' : 'info'), 16, { marginTop: 1 }),
      h('div', { style: { minWidth: 0 } }, titulo ? h('div', { style: { fontWeight: 600 } }, titulo) : null, texto ? h('div', { style: { marginTop: titulo ? 2 : 0, lineHeight: 1.45 } }, texto) : null));
  }
  function Thumb(src, label, onClick, tam) {
    return h('button', { type: 'button', onClick: onClick || null, title: label, 'aria-label': label ? 'Abrir ' + label : 'Abrir foto',
      style: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch', cursor: onClick ? 'zoom-in' : 'default', background: 'transparent', padding: 0, border: 0, minWidth: 0 } },
      h('div', { style: { aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb', background: src ? '#f3f4f6' : '#faf7fd', display: 'grid', placeItems: 'center', color: '#9ca3af', height: tam || 'auto' } },
        src ? h('img', { src: src, alt: label || '', loading: 'lazy', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } }) : ico('image', 18)),
      label ? h('span', { style: { fontSize: 11.5, color: '#374151', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, label) : null);
  }
  function Lightbox(props) {
    return h(Modal, { titulo: props.titulo || 'Foto', onClose: props.onClose, largura: 900 },
      props.src ? (/^data:application\/pdf/.test(props.src)
        ? h('iframe', { src: props.src, title: props.titulo || 'Documento', style: { width: '100%', height: '70vh', border: 0, borderRadius: 10 } })
        : h('img', { src: props.src, alt: props.titulo || '', style: { width: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: 10, background: '#111827' } }))
        : Spinner('Abrindo...'),
      props.legenda ? h('div', { style: { fontSize: 12.5, color: '#6b7280', marginTop: 8 } }, props.legenda) : null);
  }

  // ───────────────────────── Painel / Frota ─────────────────────────
  /* LOCACAO_ILUSTRACAO_V1: desenho da moto por tipo, na cor cadastrada (quando não há foto de vistoria) */
  var MotoArte = (function () {
    var CORES = [[/vermelh|vinho|bord/, '#c81e1e'], [/pret|black|grafit/, '#2b2f36'], [/branc|perol/, '#f3f4f6'], [/prat|cinz|chumbo/, '#a1a7b0'],
      [/azul/, '#1d4ed8'], [/amarel|dourad/, '#eab308'], [/verde/, '#15803d'], [/laranj/, '#f67602'], [/rox|lil/, '#770fa8'], [/marrom|bege/, '#92400e']];
    function corHex(cor) { var t = String(cor || '').toLowerCase(); for (var i = 0; i < CORES.length; i++) if (CORES[i][0].test(t)) return CORES[i][1]; return '#9ca3af'; }
    function escuro(hex, f) { f = f || 0.72; var h = hex.replace('#', ''); var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      function p(x) { var v = Math.round(x * f).toString(16); return v.length < 2 ? '0' + v : v; } return '#' + p(r) + p(g) + p(b); }
    function roda(cx, cy, r) {
      var s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#1f2937" stroke-width="' + (r * 0.34).toFixed(1) + '"/>' +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.62).toFixed(1) + '" fill="none" stroke="#9ca3af" stroke-width="1.6"/>';
      [[1, 0], [-0.5, 0.866], [-0.5, -0.866]].forEach(function (v) { s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r * 0.6 * v[0]).toFixed(1) + '" y2="' + (cy + r * 0.6 * v[1]).toFixed(1) + '" stroke="#9ca3af" stroke-width="1.3"/>'; });
      return s + '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#6b7280"/>';
    }
    var T = {
    street: function (c, d) { return `<ellipse cx="100" cy="118" rx="78" ry="5" fill="#111827" opacity=".08"/><line x1="48" y1="92" x2="100" y2="80" stroke="#4b5563" stroke-width="6" stroke-linecap="round"/>${roda(48,92,24)}${roda(154,92,24)}<path d="M154 92 L140 40" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/><path d="M132 66 C140 60 160 62 170 72" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M100 84 L66 84 C58 84 56 78 62 76 L104 74 Z" fill="#6b7280"/><rect x="90" y="60" width="34" height="24" rx="5" fill="#9ca3af"/><path d="M96 62 L128 46" stroke="#4b5563" stroke-width="4" stroke-linecap="round"/><path d="M36 56 L62 50 L66 64 L42 66 Z" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><path d="M56 52 C72 46 94 48 102 52 L100 60 L58 61 Z" fill="#0b0d10"/><path d="M88 52 C94 38 124 36 136 46 L130 60 L92 62 Z" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><path d="M98 48 C106 42 120 42 128 46" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/><path d="M92 62 L128 60 L124 66 L96 67 Z" fill="${d}"/><line x1="126" y1="30" x2="146" y2="27" stroke="#374151" stroke-width="4" stroke-linecap="round"/><line x1="138" y1="34" x2="140" y2="28" stroke="#374151" stroke-width="3"/><ellipse cx="146" cy="44" rx="5.5" ry="7" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.5"/><rect x="30" y="52" width="9" height="5" rx="2" fill="#dc2626" opacity=".85"/>`; },
    cub: function (c, d) { return `<ellipse cx="100" cy="118" rx="74" ry="5" fill="#111827" opacity=".08"/><line x1="52" y1="96" x2="92" y2="86" stroke="#4b5563" stroke-width="6" stroke-linecap="round"/>${roda(52,96,20)}${roda(150,96,20)}<path d="M150 96 L134 38" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/><path d="M132 76 C138 70 156 72 164 80" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><rect x="80" y="76" width="26" height="16" rx="4" fill="#9ca3af"/><path d="M38 66 C40 48 70 46 94 52 L98 78 L52 82 C42 82 37 76 38 66 Z" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><path d="M44 52 C60 42 88 44 96 48 L94 55 L46 57 Z" fill="#0b0d10"/><path d="M96 80 C104 82 112 80 116 74 L128 46 C130 40 136 40 136 46 L126 84 C124 88 118 90 110 90 L96 90 Z" fill="${d}"/><path d="M118 40 C128 40 134 46 134 54 L126 86 L114 86 C120 66 120 54 112 46 Z" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><path d="M50 60 C62 54 80 54 90 58" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/><rect x="120" y="26" width="24" height="9" rx="4" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><line x1="116" y1="29" x2="148" y2="28" stroke="#374151" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="144" cy="31" rx="4.5" ry="4" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.5"/><rect x="30" y="62" width="8" height="5" rx="2" fill="#dc2626" opacity=".85"/>`; },
    scooter: function (c, d) { return `<ellipse cx="100" cy="118" rx="76" ry="5" fill="#111827" opacity=".08"/>${roda(54,98,18)}${roda(150,98,18)}<path d="M150 98 L138 44" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/><path d="M134 80 C140 74 156 76 162 84" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><rect x="56" y="86" width="40" height="10" rx="4" fill="#6b7280"/><path d="M34 72 C34 52 60 46 90 50 L100 80 L46 88 C38 88 34 82 34 72 Z" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><path d="M44 52 C62 42 90 44 100 50 L98 57 L46 59 Z" fill="#0b0d10"/><path d="M98 82 L126 82 L126 88 L98 90 Z" fill="${d}"/><path d="M112 44 C128 40 140 48 142 60 L134 86 L118 86 C124 68 122 56 112 44 Z" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><path d="M120 32 L140 30 L144 40 C136 44 126 44 118 42 Z" fill="#cbd5e1" stroke="#9ca3af" stroke-width="1"/><path d="M44 66 C58 58 78 58 92 62" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/><line x1="114" y1="40" x2="146" y2="38" stroke="#374151" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="141" cy="56" rx="4" ry="5" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.5"/><rect x="28" y="66" width="8" height="5" rx="2" fill="#dc2626" opacity=".85"/>`; },
    trail: function (c, d) { return `<ellipse cx="100" cy="118" rx="80" ry="5" fill="#111827" opacity=".08"/><line x1="46" y1="90" x2="100" y2="74" stroke="#4b5563" stroke-width="6" stroke-linecap="round"/>${roda(46,90,25)}${roda(158,88,27)}<path d="M158 88 L140 30" stroke="#6b7280" stroke-width="5.5" stroke-linecap="round"/><path d="M138 50 C148 42 166 44 172 52 L166 56 C160 50 150 50 144 54 Z" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><rect x="88" y="56" width="32" height="24" rx="5" fill="#9ca3af"/><path d="M118 72 C110 80 84 78 70 70" fill="none" stroke="#6b7280" stroke-width="5" stroke-linecap="round"/><path d="M30 44 L62 42 L64 54 L40 56 Z" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><path d="M50 44 C70 38 100 38 112 42 L110 49 L52 50 Z" fill="#0b0d10"/><path d="M92 44 C98 30 124 28 134 38 L128 56 L96 58 Z" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><path d="M108 46 L130 40 L124 62 L106 60 Z" fill="${d}"/><path d="M100 40 C106 34 120 33 128 37" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/><path d="M136 26 L150 24 L152 40 L140 42 Z" fill="${c}" stroke="#111827" stroke-opacity=".22" stroke-width="1"/><line x1="122" y1="20" x2="146" y2="18" stroke="#374151" stroke-width="4" stroke-linecap="round"/><ellipse cx="148" cy="33" rx="4" ry="5.5" fill="#f3f4f6" stroke="#6b7280" stroke-width="1.5"/><rect x="24" y="42" width="8" height="5" rx="2" fill="#dc2626" opacity=".85"/>`; }
    };
    function tipoPorModelo(modelo) {
      var m = String(modelo || '').toLowerCase();
      if (/\b(biz|pop|crypton|c100|dream|web|jet|traxx)\b/.test(m)) return 'cub';
      if (/\b(pcx|elite|nmax|n-max|lead|burgman|neo|fluo|xmax|adv|citycom|scooter)\b/.test(m)) return 'scooter';
      if (/\b(bros|xre|lander|crosser|xtz|tenere|nxr|tornado|falcon|dr|klx|crf|trail)\b/.test(m)) return 'trail';
      return 'street';
    }
    function svg(tipo, cor) {
      var c = corHex(cor), d = escuro(c);
      var f = T[tipo] || T.street;
      return '<svg viewBox="0 0 200 124" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ilustração da moto" style="display:block">' + f(c, d) + '</svg>';
    }
    return { svg: svg, corHex: corHex, tipoPorModelo: tipoPorModelo, TIPOS: [['street', 'Street'], ['cub', 'Cub'], ['scooter', 'Scooter'], ['trail', 'Trail']] };
  })();

  /* Imagem da moto: foto (thumb/foto da vistoria) ou ilustração do tipo na cor */
  function MotoImg(p) {
    var w = p.w || 64, hh = p.h || Math.round(w * 0.62), r = p.r != null ? p.r : 8;
    var base = { width: p.fluid ? '100%' : w, height: hh, borderRadius: r, flex: 'none', overflow: 'hidden', display: 'block' };
    if (p.src) return h('img', { src: p.src, alt: 'Foto da moto', style: Object.assign({ objectFit: 'cover', background: '#e5e7eb' }, base) });
    return h('div', { role: 'img', 'aria-label': 'Ilustração da moto', style: Object.assign({ background: 'linear-gradient(180deg,#faf7fd,#f3e8fb)', padding: Math.max(2, Math.round(hh * 0.06)), boxSizing: 'border-box' }, base),
      dangerouslySetInnerHTML: { __html: MotoArte.svg(p.tipo || MotoArte.tipoPorModelo(p.modelo), p.cor) } });
  }
  function celulaMoto(m) {
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
      h(MotoImg, { src: m.capa_thumb, tipo: m.tipo, modelo: m.modelo, cor: m.cor, w: 64, h: 42 }),
      h('div', null, h('div', { style: { fontWeight: 600 } }, m.modelo), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, [m.ano, m.cor].filter(Boolean).join(' · '))));
  }

  function PainelView(props) {
    var api = props.api, nav = props.nav;
    var _f = useState('todas'), filtro = _f[0], setFiltro = _f[1];
    var _q = useState(''), q = _q[0], setQ = _q[1];
    var d = props.painel, k = (d && d.kpis) || {};
    if (props.erro) return Erro(props.erro, props.recarregar);
    if (!d) return Spinner('Carregando a frota...');
    var frota = d.frota || [];
    var conta = { todas: frota.length, alugadas: 0, atraso: 0, disp: 0, vist: 0 };
    frota.forEach(function (m) {
      if (m.status === 'alugada' || m.status === 'em_retomada') conta.alugadas++;
      if (m.situacao === 'atrasada' || m.status === 'em_retomada') conta.atraso++;
      if (m.status === 'disponivel') conta.disp++;
      if (m.vistoria_pendente) conta.vist++;
    });
    var qq = q.trim().toLowerCase();
    var lista = frota.filter(function (m) {
      if (filtro === 'alugadas' && !(m.status === 'alugada' || m.status === 'em_retomada')) return false;
      if (filtro === 'atraso' && !(m.situacao === 'atrasada' || m.status === 'em_retomada')) return false;
      if (filtro === 'disp' && m.status !== 'disponivel') return false;
      if (filtro === 'vist' && !m.vistoria_pendente) return false;
      if (!qq) return true;
      return [m.placa, m.modelo, m.cliente_nome].join(' ').toLowerCase().indexOf(qq) >= 0;
    });
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },
      KpiStrip([
        { r: 'Motos alugadas', v: fN(k.alugadas), s: (k.reservadas || 0) + ' reservada' + (k.reservadas === 1 ? '' : 's') + ' aguardando assinatura' },
        { r: 'Disponíveis', v: fN(k.disponiveis), s: (k.manutencao || 0) + ' em manutenção' },
        { r: 'Em atraso', v: fN(k.em_atraso), s: (k.em_retomada || 0) + ' em retomada', cor: k.em_atraso ? '#991b1b' : null },
        { r: 'A receber na semana', v: fR(k.a_receber_semana), s: (k.parcelas_semana || 0) + ' parcela' + (k.parcelas_semana === 1 ? '' : 's') + ' até ' + fDC(new Date(Date.now() + 6 * 864e5)) },
        { r: 'Pré-cadastros novos', v: fN(k.precadastros_novos), s: 'aguardando revisão', cor: k.precadastros_novos ? ROXO_ESC : null }
      ]),
      h(HojeCard, { api: api, toast: props.toast, nav: nav, aoMudar: props.recarregar }), // LOCACAO_V2
      h(InadimplenciaCard, { api: api }), // LOCACAO_V2
      h(Card, { pad: false },
        h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
          h('h2', { style: { margin: '0 8px 0 0', fontSize: 15, fontWeight: 700 } }, 'Frota'),
          Chips([{ id: 'todas', t: 'Todas', n: conta.todas }, { id: 'alugadas', t: 'Alugadas', n: conta.alugadas }, { id: 'atraso', t: 'Em atraso', n: conta.atraso }, { id: 'disp', t: 'Disponíveis', n: conta.disp }, { id: 'vist', t: 'Vistoria pendente', n: conta.vist }], filtro, setFiltro),
          h('div', { style: { flex: 1 } }),
          Busca(q, setQ, 'Placa, modelo ou cliente')),
        frota.length === 0 ? Vazio('Nenhuma moto cadastrada', 'Cadastre a primeira moto para começar a locação.', Btn({ variant: 'pri', icon: 'plus', onClick: function () { nav({ tela: 'moto', id: null }); }, children: 'Cadastrar moto' })) :
        lista.length === 0 ? Vazio('Nenhuma moto neste filtro', 'Troque o filtro ou limpe a busca.') :
        Tabela([{ t: 'Moto' }, { t: 'Placa' }, { t: 'Locatário' }, { t: 'Parcela', right: true }, { t: 'Próx. vencimento' }, { t: 'Pagas' }, { t: 'Vistoria' }, { t: 'Status' }, { t: '' }],
          lista.map(function (m) {
            var pct = m.semanas ? Math.min(100, Math.round(100 * num(m.parcelas_pagas) / num(m.semanas))) : 0;
            var abrir = m.contrato_id ? function () { nav({ tela: 'contrato', id: m.contrato_id }); } : function () { nav({ tela: 'moto', id: m.moto_id }); };
            return Linha(m.moto_id, [
              { td: 1, v: celulaMoto(m) },
              { td: 1, v: m.placa, st: { fontFamily: MONO, fontSize: 12.5 } },
              { td: 1, v: m.cliente_nome ? h('div', null, m.cliente_nome, h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, m.cliente_tipo === 'tutts' ? 'Motoboy Tutts' : m.cliente_tipo === 'externo' ? 'Externo' : (m.cliente_tipo || ''))) : h('span', { style: { color: '#9ca3af' } }, '—') },
              { td: 1, v: m.valor_semanal ? fR(m.valor_semanal) : '—', right: true },
              { td: 1, v: m.proximo_vencimento ? fDS(m.proximo_vencimento, true) : '—' },
              { td: 1, st: { minWidth: 110 }, v: m.semanas && m.situacao !== 'aguardando_assinatura' ? h('div', null, h('div', { style: { fontSize: 12, color: '#374151' } }, fN(m.parcelas_pagas) + ' de ' + fN(m.semanas)),
                h('div', { style: { height: 4, background: '#f3f4f6', borderRadius: 99, marginTop: 4, overflow: 'hidden' } }, h('div', { style: { height: '100%', width: pct + '%', background: ROXO } }))) : h('span', { style: { color: '#9ca3af' } }, '—') },
              { td: 1, v: m.vistoria_label || '—', st: { fontSize: 12, color: m.vistoria_pendente ? '#92400e' : '#374151', fontWeight: m.vistoria_pendente ? 600 : 400 } },
              { td: 1, v: pillMoto(m) },
              { td: 1, right: true, v: h('button', { type: 'button', onClick: function (e) { e.stopPropagation(); abrir(); }, className: 'hover:underline', style: { color: ROXO, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', fontSize: 13 } }, m.contrato_id ? (m.situacao === 'aguardando_assinatura' ? 'Ver contrato' : 'Pagamentos') : 'Ver moto') }
            ], abrir);
          }))));
  }

  // ───────────────────────── Convite ─────────────────────────
  function ConviteModal(props) {
    var api = props.api, toast = props.toast;
    var _n = useState(''), nome = _n[0], setNome = _n[1];
    var _w = useState(''), wpp = _w[0], setWpp = _w[1];
    var _c = useState(null), conv = _c[0], setConv = _c[1];
    var _s = useState(false), salvando = _s[0], setSalvando = _s[1];
    var _l = useState(null), lista = _l[0], setLista = _l[1];
    var carregar = useCallback(function () {
      api('/convites').then(function (r) { setLista(r.convites || []); }).catch(function () { setLista([]); });
    }, [api]);
    useEffect(carregar, [carregar]);
    var gerar = function (enviar) {
      setSalvando(true);
      api('/convites', { method: 'POST', body: { nome_ref: nome.trim() || null, whatsapp: soDig(wpp) || null, enviar_whatsapp: !!enviar } })
        .then(function (r) {
          setConv(r.convite); carregar();
          if (enviar) {
            if (r.whatsapp && r.whatsapp.enviado) toast('Link enviado no WhatsApp', 'success');
            else abrirWa(r.convite);
          } else toast('Link gerado', 'success');
        })
        .catch(function (e) { toast(e.message, 'error'); })
        .then(function () { setSalvando(false); });
    };
    var msgWa = function (c) { return 'Olá' + (nome ? ', ' + nome.split(' ')[0] : '') + '! Para pedir a locação da moto Tutts, preencha seu cadastro neste link (vale 7 dias, uso único): ' + c.url; };
    var abrirWa = function (c) {
      var d = soDig(wpp || (c && c.whatsapp)); if (d && d.length <= 11) d = '55' + d;
      window.open('https://wa.me/' + (d || '') + '?text=' + encodeURIComponent(msgWa(c)), '_blank', 'noopener');
    };
    var cancelar = function (c) {
      api('/convites/' + c.id + '/cancelar', { method: 'POST' }).then(function () { toast('Convite cancelado', 'success'); carregar(); }).catch(function (e) { toast(e.message, 'error'); });
    };
    var TOM_CONV = { aberto: 'azul', usado: 'verde', expirado: 'cinza', cancelado: 'cinzaClaro' };
    var ROT_CONV = { aberto: 'Aberto', usado: 'Usado', expirado: 'Expirado', cancelado: 'Cancelado' };
    return h(Modal, { titulo: 'Gerar link de convite', onClose: props.onClose, largura: 600 },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
          h(Field, { label: 'Nome do entregador', opt: true }, Input({ value: nome, onChange: function (e) { setNome(e.target.value); }, placeholder: 'Ex.: Lucas Souza' })),
          h(Field, { label: 'WhatsApp', opt: true }, Input({ value: wpp, inputMode: 'tel', onChange: function (e) { setWpp(e.target.value); }, placeholder: '(71) 98123-4567' }))),
        conv ? h('div', { style: { background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: ROXO_ESC } }, 'Link gerado · válido por 7 dias'),
          h('div', { style: { display: 'flex', gap: 8 } },
            Input({ readOnly: true, value: conv.url, onFocus: function (e) { e.target.select(); }, style: { fontFamily: MONO, fontSize: 12.5, background: '#ffffff' }, 'aria-label': 'Link do convite' }),
            Btn({ icon: 'copy', onClick: function () { copiar(conv.url, toast); }, children: 'Copiar' })),
          Btn({ variant: 'verde', icon: 'message', onClick: function () { abrirWa(conv); }, children: 'Enviar no WhatsApp' }),
          h('div', { style: { fontSize: 12, color: '#6b7280', lineHeight: 1.45 } }, 'Link único, expira em ', h('b', { style: { color: '#374151' } }, fDH(conv.expira_em)), '. Ao abrir, o entregador preenche o pré-cadastro e aceita o termo LGPD.'))
          : h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            Btn({ variant: 'pri', icon: 'link', onClick: function () { gerar(false); }, disabled: salvando, children: salvando ? 'Gerando...' : 'Gerar link' }),
            soDig(wpp).length >= 10 ? Btn({ variant: 'verde', icon: 'message', onClick: function () { gerar(true); }, disabled: salvando, children: 'Gerar e enviar no WhatsApp' }) : null),
        h('div', null,
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4 } }, 'Convites recentes'),
          lista == null ? Spinner() : lista.length === 0 ? h('div', { style: { fontSize: 13, color: '#9ca3af', padding: '8px 0' } }, 'Nenhum convite gerado ainda.') :
          lista.slice(0, 6).map(function (c) {
            var quando = 'gerado ' + fDC(c.criado_em) + (c.status === 'usado' ? ' · preenchido ' + fDHc(c.usado_em) : c.status === 'expirado' ? ' · expirou ' + fDC(c.expira_em) : c.status === 'aberto' ? ' · expira ' + fDC(c.expira_em) : '');
            return h('div', { key: c.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #f3f4f6' } },
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 13, fontWeight: 600 } }, (c.nome_ref || 'Sem nome') + (c.whatsapp && !c.nome_ref ? ' · ' + fTel(c.whatsapp) : ''), c.tipo === 'documentos' ? h('span', { style: { fontWeight: 400, color: '#6b7280' } }, ' · documentos') : null),
                h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, quando)),
              c.status === 'aberto' ? Btn({ variant: 'link', small: true, onClick: function () { copiar(c.url, toast); }, children: 'Copiar' }) : null,
              c.status === 'aberto' ? Btn({ variant: 'link', small: true, style: { color: '#991b1b' }, onClick: function () { cancelar(c); }, children: 'Cancelar' }) : null,
              Pill(ROT_CONV[c.status] || c.status, TOM_CONV[c.status] || 'cinza', true));
          }))));
  }

  // ───────────────────────── Pré-cadastros ─────────────────────────
  function PrecadastrosView(props) {
    var api = props.api, toast = props.toast, nav = props.nav;
    var _f = useState('todos'), filtro = _f[0], setFiltro = _f[1];
    var _l = useState(null), dados = _l[0], setDados = _l[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _s = useState(props.selecionar || null), sel = _s[0], setSel = _s[1];
    var carregar = useCallback(function () {
      setErro(null);
      api('/precadastros').then(function (r) {
        setDados(r);
        var l = r.precadastros || [];
        setSel(function (atual) {
          if (atual) return atual;
          var prim = l.find(function (p) { return p.status === 'novo' || p.status === 'em_analise'; }) || l[0];
          return prim ? prim.id : null;
        });
      }).catch(function (e) { setErro(e.message); });
    }, [api]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!dados) return Spinner('Carregando pré-cadastros...');
    var lista = dados.precadastros || [];
    var fin = { aprovado: 1, contrato_criado: 1, reprovado: 1 };
    var cnt = function (fn) { return lista.filter(fn).length; };
    var filtrada = lista.filter(function (p) {
      if (filtro === 'novo') return p.status === 'novo';
      if (filtro === 'em_analise') return p.status === 'em_analise';
      if (filtro === 'docs') return p.status === 'aguardando_documentos';
      if (filtro === 'fin') return !!fin[p.status];
      return true;
    });
    return h('div', { className: 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_520px] items-start' },
      h(Card, { pad: false },
        h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8 } },
          Chips([
            { id: 'todos', t: 'Todos', n: lista.length },
            { id: 'novo', t: 'Novos', n: cnt(function (p) { return p.status === 'novo'; }) },
            { id: 'em_analise', t: 'Em análise', n: cnt(function (p) { return p.status === 'em_analise'; }) },
            { id: 'docs', t: 'Docs pendentes', n: cnt(function (p) { return p.status === 'aguardando_documentos'; }) },
            { id: 'fin', t: 'Finalizados', n: cnt(function (p) { return !!fin[p.status]; }) }
          ], filtro, setFiltro)),
        lista.length === 0 ? Vazio('Nenhum pré-cadastro ainda', 'Gere um link de convite e envie ao entregador.', Btn({ variant: 'pri', icon: 'link', onClick: props.abrirConvite, children: 'Gerar link de convite' })) :
        filtrada.length === 0 ? Vazio('Nada neste filtro') :
        Tabela([{ t: 'Entregador' }, { t: 'Enviado em' }, { t: 'Alertas' }, { t: 'Status' }],
          filtrada.map(function (p) {
            var bloq = (p.alertas || []).filter(function (a) { return a.nivel === 'bloqueia'; }).length;
            var av = (p.alertas || []).length - bloq;
            var txtAl = bloq || av ? [bloq ? bloq + ' bloqueio' + (bloq > 1 ? 's' : '') : null, av ? av + ' aviso' + (av > 1 ? 's' : '') : null].filter(Boolean).join(' · ') : '—';
            var on = sel === p.id;
            return Linha(p.id, [
              { td: 1, v: h('div', null, h('div', { style: { fontWeight: 600 } }, p.nome), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, [p.cpf_mascarado ? 'CPF ' + p.cpf_mascarado : null, p.whatsapp ? fTel(p.whatsapp) : null].filter(Boolean).join(' · '))) },
              { td: 1, v: fDHc(p.criado_em), st: { whiteSpace: 'nowrap', color: '#374151' } },
              { td: 1, v: txtAl, st: { fontSize: 12, color: bloq ? '#991b1b' : av ? '#92400e' : '#9ca3af', fontWeight: bloq || av ? 600 : 400 } },
              { td: 1, v: Pill(p.status_label || ROT_PRE[p.status] || p.status, TOM_PRE[p.status] || 'cinza') }
            ], function () { setSel(p.id); }, on ? { background: '#faf7fd', boxShadow: 'inset 3px 0 0 ' + ROXO } : null);
          }))),
      sel ? h(RevisaoPrecadastro, { key: sel, id: sel, api: api, toast: toast, nav: nav, aoMudar: function () { carregar(); props.recarregarPainel && props.recarregarPainel(); } })
        : h(Card, null, Vazio('Selecione um pré-cadastro', 'A revisão aparece aqui.')));
  }

  var PRE_AVISADOS = {};
  function RevisaoPrecadastro(props) {
    var api = props.api, toast = props.toast;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _t = useState(null), tipo = _t[0], setTipo = _t[1];
    var _v = useState(''), dia = _v[0], setDia = _v[1];
    var _c = useState(''), cod = _c[0], setCod = _c[1];
    var _b = useState(false), salvando = _b[0], setSalvando = _b[1];
    var _m = useState(null), modal = _m[0], setModal = _m[1];
    var _ft = useState(null), foto = _ft[0], setFoto = _ft[1];
    var carregar = useCallback(function () {
      setErro(null);
      api('/precadastros/' + props.id).then(function (r) {
        setD(r);
        var p = r.precadastro || {};
        if (props.aoMudar && p.status === 'em_analise' && !PRE_AVISADOS[props.id]) { PRE_AVISADOS[props.id] = 1; props.aoMudar(); } /* abrir muda Novo -> Em análise: atualiza lista e badge */
        if (p.entregador_tutts) { setTipo(function (t) { return t || 'tutts'; }); setCod(function (c) { return c || p.cod_profissional || ''; }); }
      }).catch(function (e) { setErro(e.message); });
    }, [api, props.id]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d) return h(Card, null, Spinner('Abrindo cadastro...'));
    var p = d.precadastro || {}, alertas = d.alertas || [], docs = d.documentos || [];
    var bloqueia = alertas.some(function (a) { return a.nivel === 'bloqueia'; });
    var emRevisao = { novo: 1, em_analise: 1, aguardando_documentos: 1 }[p.status];
    var faltaCampo = !tipo || !dia || (tipo === 'tutts' && !String(cod).trim());
    var podeAprovar = emRevisao && d.pode_aprovar !== false && !bloqueia && !faltaCampo;
    var acao = function (url, body, msg) {
      setSalvando(true);
      return api(url, { method: 'POST', body: body || {} })
        .then(function (r) { toast(msg, 'success'); setModal(null); carregar(); props.aoMudar && props.aoMudar(); return r; })
        .catch(function (e) { toast(e.message, 'error'); throw e; })
        .then(function (r) { setSalvando(false); return r; }, function () { setSalvando(false); });
    };
    var aprovar = function () {
      acao('/precadastros/' + p.id + '/aprovar', { tipo: tipo, dia_vencimento: Number(dia), cod_profissional: tipo === 'tutts' ? String(cod).trim() : null }, 'Cadastro aprovado. Já dá para criar o contrato.');
    };
    var abrirDoc = function (doc) {
      setFoto({ titulo: DOCS[doc.tipo] || doc.tipo, src: null });
      api('/precadastros/' + p.id + '/documentos/' + doc.id).then(function (r) { setFoto({ titulo: DOCS[doc.tipo] || doc.tipo, src: r.foto, legenda: 'Enviado em ' + fDH(doc.enviado_em) }); })
        .catch(function (e) { setFoto(null); toast(e.message, 'error'); });
    };
    var end = [p.logradouro, p.numero, p.complemento].filter(Boolean).join(', ') + (p.bairro ? ' · ' + p.bairro : '') + (p.cidade ? ' · ' + p.cidade + (p.uf ? '/' + p.uf : '') : '') + (p.cep ? ' · CEP ' + p.cep : '');
    var dados = [
      ['CPF', p.cpf], ['RG', p.rg], ['Nascimento', p.data_nascimento ? fD(p.data_nascimento) : null], ['WhatsApp', fTel(p.whatsapp)],
      ['E-mail', p.email], ['Nacionalidade', p.nacionalidade], ['Estado civil', p.estado_civil], ['Profissão', p.profissao],
      ['CNH', p.cnh_numero ? p.cnh_numero + ' · cat. ' + (p.cnh_categoria || '—') : null], ['Validade CNH', p.cnh_validade ? fD(p.cnh_validade) : null],
      ['EAR', p.cnh_ear == null ? null : p.cnh_ear ? 'Sim' : 'Não'], ['Entregador Tutts', p.entregador_tutts ? 'Sim' + (p.cod_profissional ? ' · cód. ' + p.cod_profissional : '') : 'Não'],
      ['Endereço', end, true]
    ];
    var docsPorTipo = {}; docs.forEach(function (x) { docsPorTipo[x.tipo] = x; });
    return h(Card, { pad: false, style: { position: 'sticky', top: 84 } },
      h('div', { style: { padding: '14px 18px', borderBottom: '1px solid #f3f4f6' } },
        h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Pré-cadastro #PC-' + String(p.id).padStart(4, '0') + ' · via link · ' + fDH(p.criado_em)),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' } },
          h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 19, fontWeight: 700 } }, p.nome),
          Pill(p.status_label || ROT_PRE[p.status] || p.status, TOM_PRE[p.status] || 'cinza'))),
      h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 16 } },
        alertas.length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, alertas.map(function (a, i) {
          return h('div', { key: i }, Aviso(a.nivel === 'bloqueia' ? 'vermelho' : 'ambar', a.texto, a.nivel === 'bloqueia' ? 'Bloqueia a aprovação.' : null));
        })) : null,
        p.status === 'reprovado' ? Aviso('vermelho', 'Reprovado', p.motivo_reprovacao || '—') : null,
        h('div', null,
          h('div', { style: { fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' } }, 'Dados pessoais'),
          h('div', { className: 'grid grid-cols-2', style: { columnGap: 16, rowGap: 8 } }, dados.filter(function (x) { return x[1]; }).map(function (x) {
            return h('div', { key: x[0], style: { gridColumn: x[2] ? '1 / -1' : null, minWidth: 0 } },
              h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, x[0]),
              h('div', { style: { fontSize: 13, color: '#111827', overflowWrap: 'anywhere' } }, x[1]));
          }))),
        h('div', null,
          h('div', { style: { fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' } }, 'Documentos enviados'),
          h('div', { className: 'grid grid-cols-4', style: { gap: 8 } }, Object.keys(DOCS).map(function (t) {
            var doc = docsPorTipo[t];
            return doc ? h('div', { key: t }, Thumb(doc.thumb, DOCS[t], function () { abrirDoc(doc); }))
              : h('div', { key: t, style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                h('div', { style: { aspectRatio: '4 / 3', borderRadius: 10, border: '1.5px dashed #e5e7eb', display: 'grid', placeItems: 'center', color: '#9ca3af', fontSize: 11 } }, 'Não enviado'),
                h('span', { style: { fontSize: 11.5, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, DOCS[t]));
          }))),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: '#374151', background: '#f9fafb', borderRadius: 10, padding: '10px 12px' } },
          ico('shield', 15, { color: p.aceite_lgpd_em ? '#16a34a' : '#9ca3af', marginTop: 1 }),
          p.aceite_lgpd_em ? h('span', null, h('b', null, 'Termo LGPD aceito'), ' · versão ' + (p.termo_versao || '—') + ' · ' + fD(p.aceite_lgpd_em) + ' ' + new Date(p.aceite_lgpd_em).toLocaleTimeString('pt-BR') + (p.aceite_lgpd_ip ? ' · IP ' + p.aceite_lgpd_ip : ''))
            : h('span', null, 'Aceite LGPD não registrado')),
        emRevisao ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #f3f4f6', paddingTop: 14 } },
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2', style: { gap: 12 } },
            h(Field, { label: 'Tipo de cliente', req: true, hint: tipo === 'tutts' ? 'Parcela abatida do repasse; o que faltar vai por PIX' : tipo === 'externo' ? 'Externo paga 100% via PIX' : null },
              Segmented([['tutts', 'Motoboy Tutts'], ['externo', 'Externo']], tipo, setTipo, 'Tipo de cliente')),
            h(Field, { label: 'Dia de vencimento', req: true },
              Select({ value: dia, onChange: function (e) { setDia(e.target.value); } }, [h('option', { key: '', value: '' }, 'Escolha o dia')].concat(DIA_VENC.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); }))))),
          tipo === 'tutts' ? h(Field, { label: 'Código do profissional na Central', req: true, hint: 'Usado para abater a parcela do repasse' }, Input({ value: cod, onChange: function (e) { setCod(e.target.value); }, inputMode: 'numeric', placeholder: 'Ex.: 4821', style: { maxWidth: 200 } })) : null,
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
            Btn({ variant: 'perigo', onClick: function () { setModal('reprovar'); }, disabled: salvando, children: 'Reprovar…' }),
            Btn({ onClick: function () { setModal('docs'); }, disabled: salvando, icon: 'upload', children: 'Pedir documentos' }),
            Btn({ variant: 'pri', icon: 'check', onClick: aprovar, disabled: !podeAprovar || salvando, title: bloqueia ? 'Resolva os alertas que bloqueiam a aprovação' : faltaCampo ? 'Defina tipo de cliente e dia de vencimento' : null, children: salvando ? 'Salvando...' : 'Aprovar cadastro' })),
          bloqueia ? h('div', { style: { fontSize: 12, color: '#991b1b', textAlign: 'right' } }, 'A aprovação fica bloqueada enquanto houver alerta vermelho.') : null)
          : p.status === 'aprovado' ? h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f3f4f6', paddingTop: 14 } },
            Btn({ variant: 'pri', icon: 'filetext', onClick: function () { props.nav({ tela: 'novoContrato', cliente_id: d.cliente_id }); }, children: 'Criar contrato' }))
          : null),
      modal === 'reprovar' ? h(MotivoModal, { titulo: 'Reprovar cadastro', label: 'Motivo da reprovação', hint: 'O motivo é enviado ao entregador pelo WhatsApp.', botao: 'Reprovar cadastro', perigo: true, obrigatorio: true,
        onClose: function () { setModal(null); }, onConfirm: function (m) { return acao('/precadastros/' + p.id + '/reprovar', { motivo: m }, 'Cadastro reprovado'); } }) : null,
      modal === 'docs' ? h(PedirDocsModal, { p: p, api: api, toast: toast, onClose: function () { setModal(null); }, aoEnviar: function () { carregar(); props.aoMudar && props.aoMudar(); } }) : null,
      foto ? h(Lightbox, { titulo: foto.titulo, src: foto.src, legenda: foto.legenda, onClose: function () { setFoto(null); } }) : null);
  }

  function MotivoModal(props) {
    var _m = useState(props.inicial || ''), m = _m[0], setM = _m[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    var ok = !props.obrigatorio || m.trim().length >= 3;
    return h(Modal, { titulo: props.titulo, onClose: props.onClose, largura: 520,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }),
        Btn({ key: 'o', variant: props.perigo ? 'perigoCheio' : 'pri', disabled: !ok || s, onClick: function () { setS(true); Promise.resolve(props.onConfirm(m.trim())).catch(function () {}).then(function () { setS(false); }); }, children: s ? 'Salvando...' : props.botao })] },
      props.texto ? h('p', { style: { margin: '0 0 12px', fontSize: 13.5, color: '#374151', lineHeight: 1.5 } }, props.texto) : null,
      h(Field, { label: props.label, req: props.obrigatorio, opt: !props.obrigatorio, hint: props.hint }, TextArea({ rows: 4, value: m, onChange: function (e) { setM(e.target.value); }, autoFocus: true })));
  }

  function PedirDocsModal(props) {
    var _m = useState(''), m = _m[0], setM = _m[1];
    var _r = useState(null), r = _r[0], setR = _r[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    var enviar = function () {
      setS(true);
      props.api('/precadastros/' + props.p.id + '/pedir-documentos', { method: 'POST', body: { mensagem: m.trim() || null } })
        .then(function (x) { setR(x); props.toast(x.whatsapp && x.whatsapp.enviado ? 'Link de documentos enviado no WhatsApp' : 'Link gerado', 'success'); props.aoEnviar && props.aoEnviar(); })
        .catch(function (e) { props.toast(e.message, 'error'); }).then(function () { setS(false); });
    };
    var waUrl = r ? 'https://wa.me/' + (function () { var d = soDig(props.p.whatsapp); return d.length <= 11 ? '55' + d : d; })() + '?text=' + encodeURIComponent('Olá, ' + String(props.p.nome || '').split(' ')[0] + '! Precisamos de mais documentos para o seu cadastro de locação. Envie por este link: ' + r.url + (m.trim() ? '\n' + m.trim() : '')) : null;
    return h(Modal, { titulo: 'Pedir documentos', onClose: props.onClose, largura: 540,
      rodape: r ? [Btn({ key: 'f', onClick: props.onClose, children: 'Fechar' })] : [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }), Btn({ key: 'e', variant: 'pri', icon: 'upload', disabled: s, onClick: enviar, children: s ? 'Gerando...' : 'Gerar link só de documentos' })] },
      r ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        Aviso(r.whatsapp && r.whatsapp.enviado ? 'verde' : 'azul', r.whatsapp && r.whatsapp.enviado ? 'Link enviado no WhatsApp do entregador' : 'Link gerado', 'O status mudou para Docs pendentes. O link serve só para enviar fotos.'),
        h('div', { style: { display: 'flex', gap: 8 } }, Input({ readOnly: true, value: r.url, style: { fontFamily: MONO, fontSize: 12.5 }, 'aria-label': 'Link de documentos' }), Btn({ icon: 'copy', onClick: function () { copiar(r.url, props.toast); }, children: 'Copiar' })),
        !(r.whatsapp && r.whatsapp.enviado) ? Btn({ variant: 'verde', icon: 'message', onClick: function () { window.open(waUrl, '_blank', 'noopener'); }, children: 'Enviar no WhatsApp' }) : null)
        : h(Field, { label: 'O que falta', opt: true, hint: 'Vai junto com o link no WhatsApp. Ex.: comprovante de residência atualizado.' }, TextArea({ rows: 3, value: m, onChange: function (e) { setM(e.target.value); } })));
  }

  // ───────────────────────── Motos ─────────────────────────
  function MotosView(props) {
    var api = props.api, nav = props.nav;
    var _d = useState(null), lista = _d[0], setLista = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _q = useState(''), q = _q[0], setQ = _q[1];
    var _f = useState('todas'), filtro = _f[0], setFiltro = _f[1];
    var carregar = useCallback(function () { setErro(null); api('/motos').then(function (r) { setLista(r.motos || []); }).catch(function (e) { setErro(e.message); }); }, [api]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!lista) return Spinner('Carregando motos...');
    var qq = q.trim().toLowerCase();
    var cnt = function (s) { return lista.filter(function (m) { return m.status === s; }).length; };
    var fl = lista.filter(function (m) {
      if (filtro !== 'todas' && m.status !== filtro) return false;
      return !qq || [m.placa, m.modelo, m.cliente_nome, m.cor].join(' ').toLowerCase().indexOf(qq) >= 0;
    });
    return h(Card, { pad: false },
      h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
        h('h2', { style: { margin: '0 8px 0 0', fontSize: 15, fontWeight: 700 } }, 'Motos'),
        Chips([{ id: 'todas', t: 'Todas', n: lista.length }, { id: 'disponivel', t: 'Disponíveis', n: cnt('disponivel') }, { id: 'alugada', t: 'Alugadas', n: cnt('alugada') }, { id: 'reservada', t: 'Reservadas', n: cnt('reservada') }, { id: 'em_retomada', t: 'Em retomada', n: cnt('em_retomada') }, { id: 'manutencao', t: 'Manutenção', n: cnt('manutencao') }], filtro, setFiltro),
        h('div', { style: { flex: 1 } }),
        Busca(q, setQ, 'Placa, modelo ou locatário')),
      lista.length === 0 ? Vazio('Nenhuma moto cadastrada', null, Btn({ variant: 'pri', icon: 'plus', onClick: function () { nav({ tela: 'moto', id: null }); }, children: 'Cadastrar moto' })) :
      fl.length === 0 ? Vazio('Nenhuma moto neste filtro') :
      Tabela([{ t: 'Moto' }, { t: 'Placa' }, { t: 'Hodômetro', right: true }, { t: 'Seguro' }, { t: 'Rastreador' }, { t: 'Locatário' }, { t: 'Status' }],
        fl.map(function (m) {
          var sn = function (b) { return b ? h('span', { style: { color: '#166534', fontWeight: 600 } }, 'Sim') : h('span', { style: { color: '#991b1b', fontWeight: 600 } }, 'Não'); };
          return Linha(m.id, [
            { td: 1, v: celulaMoto(m) },
            { td: 1, v: m.placa, st: { fontFamily: MONO, fontSize: 12.5 } },
            { td: 1, v: m.hodometro != null ? fN(m.hodometro) + ' km' : '—', right: true },
            { td: 1, v: sn(m.tem_seguro) }, { td: 1, v: sn(m.tem_rastreador) },
            { td: 1, v: m.cliente_nome || h('span', { style: { color: '#9ca3af' } }, '—') },
            { td: 1, v: Pill(m.status_label || ROT_MOTO[m.status] || m.status, TOM_MOTO[m.status] || 'cinza') }
          ], function () { nav({ tela: 'moto', id: m.id }); });
        })));
  }

  var MOTO_VAZIA = { modelo: '', ano: '', cor: '', placa: '', chassi: '', renavam: '', valor_aquisicao: '', valor_documentacao: '', hodometro: '', tem_seguro: null, tem_rastreador: null, status_manual: 'disponivel', tipo: '' };
  function placaTipo(p) { var s = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(s)) return 'Mercosul'; if (/^[A-Z]{3}\d{4}$/.test(s)) return 'Padrão antigo'; return s ? 'Formato inválido' : null; }
  function moedaParse(v) { if (v === '' || v == null) return null; var s = String(v).replace(/[^\d,.-]/g, ''); if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); var n = parseFloat(s); return isFinite(n) ? n : null; }

  function MotoDetalhe(props) {
    var api = props.api, toast = props.toast, nav = props.nav, novo = !props.id;
    var _d = useState(novo ? { moto: Object.assign({}, MOTO_VAZIA), arquivos: [], vistorias: [] } : null), d = _d[0], setD = _d[1];
    var _f = useState(novo ? Object.assign({}, MOTO_VAZIA) : null), form = _f[0], setForm = _f[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _s = useState(false), salvando = _s[0], setSalvando = _s[1];
    var _tv = useState('todas'), fTipo = _tv[0], setFTipo = _tv[1];
    var _mv = useState(null), modal = _mv[0], setModal = _mv[1];
    var _ft = useState(null), foto = _ft[0], setFoto = _ft[1];
    var _cp = useState(null), capaFoto = _cp[0], setCapaFoto = _cp[1];
    // LOCACAO_V2: abas Vistorias · Ocorrências · Avisos, comparar e nova ocorrência
    var _ab = useState(props.secao === 'ocorrencias' || props.secao === 'avisos' ? props.secao : 'vistorias'), aba = _ab[0], setAba = _ab[1];
    var _cmp = useState(false), comparar = _cmp[0], setComparar = _cmp[1];
    var _no = useState(null), novaOc = _no[0], setNovaOc = _no[1];
    useEffect(function () {
      if (props.secao !== 'documentos' || !d) return;
      setTimeout(function () { var el = document.getElementById('loc-docs-moto'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
    }, [!!d]);
    useEffect(function () {
      if (novo || !d || !d.capa) { setCapaFoto(null); return; }
      api('/motos/' + props.id + '/capa').then(function (r) { setCapaFoto(r.foto || null); }).catch(function () { setCapaFoto(null); });
    }, [d && d.capa && d.capa.foto_id]);
    var carregar = useCallback(function () {
      if (novo) return;
      setErro(null);
      api('/motos/' + props.id).then(function (r) {
        setD(r);
        var m = r.moto || {};
        setForm({ modelo: m.modelo || '', ano: m.ano || '', cor: m.cor || '', placa: m.placa || '', chassi: m.chassi || '', renavam: m.renavam || '',
          valor_aquisicao: m.valor_aquisicao != null ? String(m.valor_aquisicao).replace('.', ',') : '', valor_documentacao: m.valor_documentacao != null ? String(m.valor_documentacao).replace('.', ',') : '',
          hodometro: m.hodometro != null ? String(m.hodometro) : '', tem_seguro: m.tem_seguro, tem_rastreador: m.tem_rastreador, status_manual: m.status_manual || 'disponivel', tipo: m.tipo_definido ? m.tipo : '' });
      }).catch(function (e) { setErro(e.message); });
    }, [api, props.id, novo]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d || !form) return Spinner('Abrindo moto...');
    var m = d.moto || {}, vist = d.vistorias || [], ct = d.contrato_atual;
    var set = function (k, v) { setForm(function (f) { var n = Object.assign({}, f); n[k] = v; return n; }); };
    var tipoPlaca = placaTipo(form.placa);
    var faltas = [];
    if (!form.modelo.trim()) faltas.push('modelo');
    if (!form.placa.trim() || tipoPlaca === 'Formato inválido') faltas.push('placa');
    if (form.tem_seguro == null) faltas.push('seguro');
    if (form.tem_rastreador == null) faltas.push('rastreador');
    var travadoContrato = !novo && m.status && m.status !== 'disponivel' && m.status !== 'manutencao';
    var salvar = function () {
      if (faltas.length) { toast('Preencha: ' + faltas.join(', '), 'error'); return; }
      setSalvando(true);
      var body = { modelo: form.modelo.trim(), ano: String(form.ano || '').trim() || null, cor: form.cor.trim() || null, placa: form.placa.toUpperCase().replace(/[^A-Z0-9]/g, ''), chassi: form.chassi.trim() || null, renavam: soDig(form.renavam) || null,
        valor_aquisicao: moedaParse(form.valor_aquisicao), valor_documentacao: moedaParse(form.valor_documentacao), hodometro: form.hodometro === '' ? null : parseInt(soDig(form.hodometro), 10), tem_seguro: form.tem_seguro, tem_rastreador: form.tem_rastreador, status_manual: form.status_manual, tipo: form.tipo || MotoArte.tipoPorModelo(form.modelo) };
      api(novo ? '/motos' : '/motos/' + props.id, { method: novo ? 'POST' : 'PUT', body: body })
        .then(function (r) {
          toast(novo ? 'Moto cadastrada' : 'Alterações salvas', 'success');
          props.aoMudar && props.aoMudar();
          var nid = novo ? (r.id || (r.moto && r.moto.id)) : null;
          if (novo && nid) nav({ tela: 'moto', id: nid }, true); else if (novo) nav({ tela: 'lista', tab: 'motos' }); else carregar();
        })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalvando(false); });
    };
    var custo = num(moedaParse(form.valor_aquisicao)) + num(moedaParse(form.valor_documentacao));
    var tipoEf = form.tipo || MotoArte.tipoPorModelo(form.modelo);
    var temCapa = !novo && d.capa;
    var capaCard = h(Card, { pad: false },
      h('div', { style: { padding: 12 } }, h(MotoImg, temCapa ? { src: capaFoto || d.capa.thumb, fluid: true, h: 230, r: 10 } : { tipo: tipoEf, cor: form.cor, fluid: true, h: 230, r: 10 })),
      h('div', { style: { padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 } },
        h('div', { style: { fontWeight: 700, fontSize: 15 } }, (form.modelo || 'Modelo da moto') + (form.cor ? ' · ' + String(form.cor).toLowerCase() : '')),
        h('div', null, temCapa ? Pill('Foto real · vistoria de ' + String(d.capa.vistoria_tipo === 'revisao' ? 'revisão' : d.capa.vistoria_tipo === 'periodica' ? 'periódica' : d.capa.vistoria_tipo === 'devolucao' ? 'devolução' : 'retirada') + ' ' + fDC(d.capa.data), 'verde')
          : Pill('Ilustração · sem foto de vistoria', 'roxo')),
        h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, temCapa ? 'Atualiza sozinha a cada nova vistoria aprovada.' : 'A foto de frente da vistoria de retirada vira a capa assim que for aprovada.')));
    var abrirFotoVist = function (v, posicao) {
      setFoto({ titulo: (v.tipo_label || v.tipo) + ' · ' + (POSICOES.find(function (x) { return x[0] === posicao; }) || [0, posicao])[1], src: null });
      api('/vistorias/' + v.id).then(function (r) {
        var f = ((r.vistoria && r.vistoria.fotos) || []).find(function (x) { return x.posicao === posicao; });
        setFoto({ titulo: (v.tipo_label || v.tipo) + ' · ' + (POSICOES.find(function (x) { return x[0] === posicao; }) || [0, posicao])[1], src: f ? f.foto : null, legenda: f && f.capturada_em ? 'Capturada em ' + fDH(f.capturada_em) + (f.lat ? ' · ' + Number(f.lat).toFixed(5) + ', ' + Number(f.lng).toFixed(5) : '') : null });
      }).catch(function (e) { setFoto(null); toast(e.message, 'error'); });
    };
    var acaoVist = function (url, body, msg) {
      return api(url, { method: 'POST', body: body || {} }).then(function () { toast(msg, 'success'); setModal(null); carregar(); props.aoMudar && props.aoMudar(); }).catch(function (e) { toast(e.message, 'error'); throw e; });
    };
    var contaTipo = function (t) { return vist.filter(function (v) { return v.tipo === t; }).length; };
    var vistF = vist.filter(function (v) { return fTipo === 'todas' || v.tipo === fTipo; });

    var campo = function (k, label, extra) {
      extra = extra || {};
      return h(Field, { key: k, label: label, req: extra.req, hint: extra.hint, hintCor: extra.hintCor, style: extra.span ? { gridColumn: '1 / -1' } : null },
        Input({ value: form[k], onChange: function (e) { set(k, e.target.value); }, placeholder: extra.ph || '', inputMode: extra.mode || null, style: extra.mono ? { fontFamily: MONO } : null }));
    };
    var simNao = function (k, label) {
      return h(Field, { label: label, req: true, hint: form[k] == null ? 'Obrigatório marcar Sim ou Não' : null, hintCor: '#92400e' }, Segmented([[true, 'Sim'], [false, 'Não']], form[k], function (v) { set(k, v); }, label));
    };
    var formCard = h(Card, { pad: false },
      CardHead('Cadastro da moto', h('span', { style: { fontSize: 12, color: '#6b7280' } }, '* obrigatório')),
      h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { className: 'grid grid-cols-2', style: { gap: 12 } },
          campo('modelo', 'Marca / modelo', { req: true, span: true, ph: 'Ex.: Honda CG 160 Start' }),
          campo('ano', 'Ano/modelo', { ph: '2024/2024' }), campo('cor', 'Cor', { ph: 'Vermelha' }),
          campo('placa', 'Placa', { req: true, mono: true, ph: 'ABC1D23', hint: tipoPlaca, hintCor: tipoPlaca === 'Formato inválido' ? '#991b1b' : '#6b7280' }),
          campo('renavam', 'Renavam', { mono: true, mode: 'numeric' }),
          campo('chassi', 'Chassi', { mono: true, span: true }),
          campo('valor_aquisicao', 'Valor de aquisição', { ph: 'R$ 0,00', mode: 'decimal' }),
          campo('valor_documentacao', 'Documentação', { ph: 'R$ 0,00', mode: 'decimal', hint: 'Despachante + vistoria' }),
          campo('hodometro', 'Hodômetro (km)', { mode: 'numeric' }),
          h('div', { key: 'custo', style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 } }, h('span', { style: { fontSize: 11.5, color: '#6b7280' } }, 'Custo total da moto'), h('span', { style: Object.assign({ fontWeight: 700, fontSize: 15 }, TAB) }, fR(custo)))),
        h('div', { className: 'grid grid-cols-2', style: { gap: 12 } }, simNao('tem_seguro', 'Tem seguro?'), simNao('tem_rastreador', 'Tem rastreador?')),
        h(Field, { label: 'Tipo de moto', hint: form.tipo ? 'Usado no desenho enquanto não há foto de vistoria.' : 'Marcado pelo modelo digitado. Dá para trocar.' },
          Segmented(MotoArte.TIPOS, tipoEf, function (v) { set('tipo', v); }, 'Tipo de moto')),
        travadoContrato ? h(Field, { label: 'Status', req: true }, h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, pillMoto(ct ? Object.assign({}, m, { situacao: ct.situacao, situacao_label: ct.situacao_label, dias_atraso: ct.dias_atraso }) : m), h('span', { style: { fontSize: 12, color: '#6b7280' } }, 'automático pelo contrato')))
          : h(Field, { label: 'Status', req: true, hint: 'Só dá para mudar à mão entre Disponível e Manutenção, quando não há contrato.' }, Segmented([['disponivel', 'Disponível'], ['manutencao', 'Manutenção']], form.status_manual, function (v) { set('status_manual', v); }, 'Status')),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
          Btn({ onClick: function () { if (novo) nav({ tela: 'lista', tab: 'motos' }); else carregar(); }, children: novo ? 'Cancelar' : 'Descartar' }),
          Btn({ variant: 'pri', icon: 'save', onClick: salvar, disabled: salvando, children: salvando ? 'Salvando...' : novo ? 'Cadastrar moto' : 'Salvar alterações' }))));

    if (novo) return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      voltar(function () { nav({ tela: 'lista', tab: 'motos' }); }, 'Motos'),
      h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 20, fontWeight: 700 } }, 'Cadastrar moto'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' } },
        h('div', { style: { flex: '1 1 520px', maxWidth: 640, minWidth: 0 } }, formCard),
        h('div', { style: { flex: '1 1 320px', maxWidth: 460, minWidth: 0, position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 8 } },
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '.04em', textTransform: 'uppercase' } }, 'Prévia'), capaCard)));

    var novaOcModal = novaOc ? h(NovaOcorrenciaModal, { api: api, toast: toast, moto: m, contrato: ct, preset: novaOc, onClose: function () { setNovaOc(null); }, onSalvo: function () { setNovaOc(null); setComparar(false); setAba('ocorrencias'); carregar(); props.aoMudar && props.aoMudar(); } }) : null; // LOCACAO_V2
    if (comparar) return h(React.Fragment, null, h(CompararVistorias, { api: api, toast: toast, moto: m, vistorias: vist, voltar: function () { setComparar(false); carregar(); }, aoMudar: props.aoMudar, onApontar: function (pre) { setNovaOc(pre); } }), novaOcModal); // LOCACAO_V2
    var ocs = d.ocorrencias || [], avs = d.avisos || [];
    var avAbertos = avs.filter(function (a) { return a.status !== 'resolvido'; }).length;
    var abaBtn = function (id, t, n) { var on = aba === id; return h('button', { key: id, type: 'button', role: 'tab', 'aria-selected': on, onClick: function () { setAba(id); }, style: { padding: '10px 12px', marginBottom: -1, fontSize: 13.5, cursor: 'pointer', color: on ? ROXO_ESC : '#6b7280', fontWeight: on ? 600 : 500, borderBottom: '2px solid ' + (on ? ROXO : 'transparent'), display: 'inline-flex', gap: 6, alignItems: 'center' } }, t, n ? h('span', { style: { background: id === 'avisos' ? '#fffbeb' : '#f3f4f6', color: id === 'avisos' ? '#92400e' : '#374151', fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '1px 7px' } }, n) : null); };
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      voltar(function () { nav({ tela: 'lista', tab: props.de || 'motos' }); }, props.de === 'painel' ? 'Frota' : 'Motos'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' } },
        h('div', null,
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 22, fontWeight: 700 } }, m.modelo + ' · ', h('span', { style: { fontFamily: MONO, fontSize: 19 } }, m.placa)),
            pillMoto(Object.assign({}, m, ct ? { situacao: ct.situacao, situacao_label: ct.situacao_label, dias_atraso: ct.dias_atraso } : {}))),
          h('div', { style: { fontSize: 13, color: '#6b7280', marginTop: 3 } }, [m.ano, m.cor ? String(m.cor).toLowerCase() : null, m.criado_em ? 'cadastrada em ' + fD(m.criado_em) : null, 'custo total ' + fR(m.custo_total != null ? m.custo_total : custo)].filter(Boolean).join(' · '))),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, // LOCACAO_V2
          Btn({ icon: 'plus', onClick: function () { setNovaOc({}); }, children: 'Nova ocorrência' }),
          Btn({ variant: 'pri', icon: 'camera', onClick: function () { setModal({ tipo: 'nova' }); }, children: 'Registrar vistoria (equipe)' }))),
      h('div', { className: 'grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)] items-start' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, formCard, h(ArquivosMoto, { moto: m, arquivos: d.arquivos || [], api: api, toast: toast, aoMudar: carregar }),
          h('div', { id: 'loc-docs-moto', style: { scrollMarginTop: 80 } }, h(DocumentosMoto, { moto: m, documentos: d.documentos || [], api: api, toast: toast, aoMudar: carregar }))), // LOCACAO_V2
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          capaCard,
          ct ? h(Card, null,
            h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' } },
              h('div', { style: { width: 38, height: 38, borderRadius: 99, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flex: 'none' } }, iniciais(ct.cliente_nome)),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Locatário atual'),
                h('div', { style: { fontWeight: 700, fontSize: 14 } }, ct.cliente_nome, h('span', { style: { fontWeight: 400, color: '#6b7280' } }, ' · ' + (ct.cliente_tipo === 'tutts' ? 'Motoboy Tutts' : 'Externo') + (ct.cod_profissional ? ' · cód. ' + ct.cod_profissional : ''))),
                h('div', { style: Object.assign({ fontSize: 12.5, color: '#374151', marginTop: 2 }, TAB) }, [fR(ct.valor_semanal) + '/semana', ct.dia_vencimento ? 'vence ' + DIA_PLURAL[ct.dia_vencimento] : null, ct.semanas ? fN(ct.parcelas_pagas) + ' de ' + fN(ct.semanas) + ' pagas' : null, ct.proximo_vencimento ? 'próxima ' + fDS(ct.proximo_vencimento, true) : null].filter(Boolean).join(' · '))),
              Btn({ small: true, onClick: function () { nav({ tela: 'contrato', id: ct.id || ct.contrato_id }); }, children: 'Ver contrato' }))) : null,
          d.vistoria_pendente ? Aviso('ambar', d.vistoria_pendente.label || ('Vistoria pendente até ' + fDS(d.vistoria_pendente.prazo, true)), null, 'clock') : null,
          h('div', { role: 'tablist', 'aria-label': 'Histórico da moto', style: { display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb' } }, abaBtn('vistorias', 'Vistorias', vist.length), abaBtn('ocorrencias', 'Ocorrências', ocs.length), abaBtn('avisos', 'Avisos', avAbertos)), // LOCACAO_V2
          aba === 'ocorrencias' ? h(OcorrenciasPanel, { api: api, toast: toast, ocorrencias: ocs, resumo: d.ocorrencias_resumo, onNova: function () { setNovaOc({}); }, aoMudar: function () { carregar(); props.aoMudar && props.aoMudar(); } }) : null,
          aba === 'avisos' ? h(AvisosPanel, { api: api, toast: toast, avisos: avs, aoMudar: carregar }) : null,
          aba !== 'vistorias' ? null : h(Card, { pad: false },
            h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
              h('h2', { style: { margin: '0 8px 0 0', fontSize: 15, fontWeight: 700 } }, 'Vistorias'),
              Chips([{ id: 'todas', t: 'Todas', n: vist.length }].concat(TIPOS_VIST.map(function (t) { return { id: t[0], t: t[1], n: contaTipo(t[0]) }; })), fTipo, setFTipo),
              h('div', { style: { flex: 1 } }),
              vist.length >= 2 ? Btn({ small: true, icon: 'eye', onClick: function () { setComparar(true); }, children: 'Comparar vistorias' }) : null), // LOCACAO_V2
            h('div', { style: { padding: 16 } },
              vistF.length === 0 ? Vazio('Nenhuma vistoria registrada', 'A retirada é registrada pelo locatário no portal ou pela equipe.') :
              vistF.map(function (v, i) {
                var aberta = v.status === 'aguardando';
                return h('div', { key: v.id, style: Object.assign({ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', gap: 10, paddingBottom: 16 }, aberta ? { background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: 12, padding: 14, marginBottom: 16 } : {}) },
                  h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
                    h('span', { style: { width: 10, height: 10, borderRadius: 99, marginTop: 5, background: TONS[TOM_VIST[v.status] || 'cinza'][2], boxShadow: aberta ? '0 0 0 4px #fef3c7' : 'none' } }),
                    !aberta && i < vistF.length - 1 ? h('span', { style: { flex: 1, width: 2, background: '#f3f4f6', marginTop: 4 } }) : null),
                  h('div', { style: { minWidth: 0 } },
                    h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 } },
                      h('span', { style: { fontWeight: 700, fontSize: 14 } }, v.tipo_label || v.tipo),
                      h('span', { style: { color: '#6b7280', fontSize: 13 } }, '· ' + fDHc(v.criado_em)),
                      Pill(v.status_label || ROT_VIST[v.status], TOM_VIST[v.status] || 'cinza')),
                    h('div', { style: Object.assign({ fontSize: 12.5, color: '#6b7280', margin: '2px 0 8px' }, TAB) }, (v.km != null ? fN(v.km) + ' km' : 'km não informado') + ' · registrada por ' + (v.origem === 'portal' ? 'locatário via portal' : (v.registrado_por_nome || 'equipe'))),
                    h('div', { className: 'grid grid-cols-3 sm:grid-cols-6', style: { gap: 8 } }, POSICOES.map(function (pz) {
                      var f = (v.fotos || []).find(function (x) { return x.posicao === pz[0]; });
                      return h('div', { key: pz[0] }, Thumb(f && f.thumb, pz[1], f ? function () { abrirFotoVist(v, pz[0]); } : null));
                    })),
                    v.observacoes ? h('div', { style: { marginTop: 8, fontSize: 12.5, color: v.avaria ? '#991b1b' : '#374151', background: v.avaria ? '#fef2f2' : '#f9fafb', borderRadius: 8, padding: '8px 10px' } }, v.avaria ? h('b', null, 'Avaria: ') : null, v.observacoes) : null,
                    aberta ? h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                      Btn({ variant: 'pri', small: true, icon: 'check', onClick: function () { acaoVist('/vistorias/' + v.id + '/aprovar', {}, 'Vistoria aprovada'); }, children: 'Aprovar vistoria' }),
                      Btn({ variant: 'perigo', small: true, icon: 'alert', onClick: function () { setModal({ tipo: 'avaria', v: v }); }, children: 'Apontar avaria' })) : null));
              }))))),
      modal && modal.tipo === 'nova' ? h(NovaVistoriaModal, { api: api, toast: toast, moto: m, onClose: function () { setModal(null); }, aoSalvar: function () { setModal(null); carregar(); props.aoMudar && props.aoMudar(); } }) : null,
      modal && modal.tipo === 'avaria' ? h(MotivoModal, { titulo: 'Apontar avaria', label: 'Descreva a avaria', hint: 'Fica registrada na vistoria e no histórico da moto.', botao: 'Registrar avaria', perigo: true, obrigatorio: true,
        onClose: function () { setModal(null); }, onConfirm: function (txt) { return acaoVist('/vistorias/' + modal.v.id + '/avaria', { descricao: txt }, 'Avaria registrada'); } }) : null,
      novaOcModal, // LOCACAO_V2
      foto ? h(Lightbox, { titulo: foto.titulo, src: foto.src, legenda: foto.legenda, onClose: function () { setFoto(null); } }) : null);
  }

  function voltar(fn, txt) {
    return h('button', { type: 'button', onClick: fn, className: 'hover:underline', style: { alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, color: ROXO, fontWeight: 600, fontSize: 13, cursor: 'pointer' } }, ico('arrowleft', 14), txt);
  }

  function ArquivosMoto(props) {
    var api = props.api, toast = props.toast;
    var _s = useState(false), env = _s[0], setEnv = _s[1];
    var _f = useState(null), foto = _f[0], setFoto = _f[1];
    var ref = useRef(null);
    var enviar = function (files) {
      var arr = Array.prototype.slice.call(files || []); if (!arr.length) return;
      setEnv(true);
      arr.reduce(function (pr, file) {
        return pr.then(function () { return lerArquivo(file, 1600, 0.82).then(function (url) { return api('/motos/' + props.moto.id + '/arquivos', { method: 'POST', body: { nome: file.name, conteudo: url } }); }); });
      }, Promise.resolve()).then(function () { toast(arr.length > 1 ? arr.length + ' arquivos enviados' : 'Arquivo enviado', 'success'); props.aoMudar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setEnv(false); if (ref.current) ref.current.value = ''; });
    };
    var abrir = function (a) {
      setFoto({ titulo: a.nome, src: null });
      api('/motos/' + props.moto.id + '/arquivos/' + a.id).then(function (r) { setFoto({ titulo: r.nome || a.nome, src: r.conteudo }); }).catch(function (e) { setFoto(null); toast(e.message, 'error'); });
    };
    var remover = function (a) {
      if (!window.confirm('Remover "' + a.nome + '"?')) return;
      api('/motos/' + props.moto.id + '/arquivos/' + a.id, { method: 'DELETE' }).then(function () { toast('Arquivo removido', 'success'); props.aoMudar(); }).catch(function (e) { toast(e.message, 'error'); });
    };
    return h(Card, { pad: false },
      CardHead('Fotos e laudo', h('label', { style: { cursor: 'pointer' } },
        h('input', { ref: ref, type: 'file', multiple: true, accept: 'image/*,application/pdf', style: { display: 'none' }, onChange: function (e) { enviar(e.target.files); } }),
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, color: ROXO, fontWeight: 600, fontSize: 13 } }, ico('upload', 14), env ? 'Enviando...' : 'Adicionar'))),
      h('div', { style: { padding: 16 } },
        props.arquivos.length === 0 ? h('div', { style: { fontSize: 13, color: '#9ca3af' } }, 'Nenhum arquivo. Envie fotos da moto ou o laudo de vistoria (PDF).') :
        h('div', { className: 'grid grid-cols-3', style: { gap: 8 } }, props.arquivos.map(function (a) {
          return h('div', { key: a.id, style: { position: 'relative' } },
            /pdf/.test(a.mime || '') ? h('button', { type: 'button', onClick: function () { abrir(a); }, style: { width: '100%', aspectRatio: '4 / 3', borderRadius: 10, border: '1px solid #e5e7eb', background: '#faf7fd', color: ROXO_ESC, display: 'grid', placeItems: 'center', cursor: 'pointer' }, title: a.nome }, ico('filetext', 22))
              : Thumb(a.thumb, null, function () { abrir(a); }),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 } },
              h('span', { style: { fontSize: 11.5, color: '#374151', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, title: a.nome }, a.nome),
              h('button', { type: 'button', onClick: function () { remover(a); }, 'aria-label': 'Remover ' + a.nome, title: 'Remover', style: { color: '#9ca3af', cursor: 'pointer' }, className: 'hover:text-red-700' }, ico('trash', 13))));
        }))),
      foto ? h(Lightbox, { titulo: foto.titulo, src: foto.src, onClose: function () { setFoto(null); } }) : null);
  }

  function NovaVistoriaModal(props) {
    var api = props.api, toast = props.toast;
    var _t = useState(props.tipo || 'revisao'), tipo = _t[0], setTipo = _t[1];
    var _f = useState({}), fotos = _f[0], setFotos = _f[1];
    var _k = useState(''), km = _k[0], setKm = _k[1];
    var _a = useState(false), avaria = _a[0], setAvaria = _a[1];
    var _o = useState(''), obs = _o[0], setObs = _o[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    var n = Object.keys(fotos).length;
    var pegar = function (pos, file) {
      if (!file) return;
      lerArquivo(file, 1280, 0.8).then(function (url) { setFotos(function (f) { var x = Object.assign({}, f); x[pos] = url; return x; }); }).catch(function (e) { toast(e.message, 'error'); });
    };
    var salvar = function () {
      setS(true);
      api('/vistorias', { method: 'POST', body: { moto_id: props.moto.id, tipo: tipo, km: km === '' ? null : parseInt(soDig(km), 10), avaria: avaria, observacoes: obs.trim() || null,
        fotos: POSICOES.filter(function (p) { return fotos[p[0]]; }).map(function (p) { return { posicao: p[0], foto: fotos[p[0]] }; }) } })
        .then(function () { toast('Vistoria registrada', 'success'); props.aoSalvar(); }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setS(false); });
    };
    var ok = n === 6 && km !== '' && (!avaria || obs.trim());
    return h(Modal, { titulo: 'Registrar vistoria (equipe)', onClose: props.onClose, largura: 640,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Cancelar' }), Btn({ key: 's', variant: 'pri', icon: 'check', disabled: !ok || s, onClick: salvar, children: s ? 'Enviando...' : 'Registrar vistoria (' + n + ' de 6 fotos)' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { fontSize: 13, color: '#6b7280' } }, props.moto.modelo + ' · ', h('span', { style: { fontFamily: MONO, color: '#374151' } }, props.moto.placa)),
        h(Field, { label: 'Tipo de vistoria', req: true }, Segmented(TIPOS_VIST, tipo, setTipo, 'Tipo de vistoria')),
        h(Field, { label: 'Fotos da moto', req: true, hint: n + ' de 6 fotos' },
          h('div', { className: 'grid grid-cols-3', style: { gap: 8 } }, POSICOES.map(function (p) {
            var f = fotos[p[0]];
            return h('label', { key: p[0], style: { cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 } },
              h('input', { type: 'file', accept: 'image/*', style: { display: 'none' }, onChange: function (e) { pegar(p[0], e.target.files && e.target.files[0]); e.target.value = ''; } }),
              h('div', { style: { aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden', border: f ? '1px solid #bbf7d0' : '1.5px dashed #d8b4f0', background: f ? '#f3f4f6' : '#faf7fd', color: ROXO, display: 'grid', placeItems: 'center' } },
                f ? h('img', { src: f, alt: p[1], style: { width: '100%', height: '100%', objectFit: 'cover' } }) : h('span', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 } }, ico('camera', 20), 'Adicionar')),
              h('span', { style: { fontSize: 12, fontWeight: 600, color: f ? '#374151' : ROXO } }, p[1]));
          }))),
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-2', style: { gap: 12 } },
          h(Field, { label: 'Quilometragem atual', req: true }, Input({ value: km, inputMode: 'numeric', onChange: function (e) { setKm(soDig(e.target.value)); }, placeholder: 'km' })),
          h(Field, { label: 'Alguma avaria?', req: true }, Segmented([[false, 'Não'], [true, 'Sim']], avaria, setAvaria, 'Avaria'))),
        h(Field, { label: 'Observações', opt: !avaria, req: avaria, hint: avaria ? 'Descreva a avaria' : null }, TextArea({ rows: 3, value: obs, onChange: function (e) { setObs(e.target.value); } }))));
  }

  // Vistoria completa (aba Vistorias)
  function VistoriaModal(props) {
    var api = props.api, toast = props.toast;
    var _d = useState(null), v = _d[0], setV = _d[1];
    var _m = useState(false), avaria = _m[0], setAvaria = _m[1];
    var _z = useState(null), zoom = _z[0], setZoom = _z[1];
    useEffect(function () { api('/vistorias/' + props.id).then(function (r) { setV(r.vistoria); }).catch(function (e) { toast(e.message, 'error'); props.onClose(); }); }, [props.id]);
    var acao = function (url, body, msg) { return api(url, { method: 'POST', body: body || {} }).then(function () { toast(msg, 'success'); props.aoMudar && props.aoMudar(); props.onClose(); }).catch(function (e) { toast(e.message, 'error'); throw e; }); };
    if (avaria) return h(MotivoModal, { titulo: 'Apontar avaria', label: 'Descreva a avaria', botao: 'Registrar avaria', perigo: true, obrigatorio: true, onClose: function () { setAvaria(false); }, onConfirm: function (t) { return acao('/vistorias/' + props.id + '/avaria', { descricao: t }, 'Avaria registrada'); } });
    if (zoom) return h(Lightbox, { titulo: zoom.t, src: zoom.src, legenda: zoom.l, onClose: function () { setZoom(null); } });
    return h(Modal, { titulo: v ? (v.tipo_label || v.tipo) + ' · ' + (v.placa || '') : 'Vistoria', onClose: props.onClose, largura: 820,
      rodape: v && v.status === 'aguardando' ? [Btn({ key: 'a', variant: 'perigo', icon: 'alert', onClick: function () { setAvaria(true); }, children: 'Apontar avaria' }), Btn({ key: 'b', variant: 'pri', icon: 'check', onClick: function () { acao('/vistorias/' + props.id + '/aprovar', {}, 'Vistoria aprovada'); }, children: 'Aprovar vistoria' })] : null },
      !v ? Spinner('Abrindo vistoria...') : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 13, color: '#374151' } },
          Pill(v.status_label || ROT_VIST[v.status], TOM_VIST[v.status] || 'cinza'),
          h('span', null, [v.modelo, v.cliente_nome, v.km != null ? fN(v.km) + ' km' : null, fDH(v.criado_em), v.origem === 'portal' ? 'enviada pelo locatário' : 'registrada pela equipe'].filter(Boolean).join(' · '))),
        v.observacoes ? Aviso(v.avaria ? 'vermelho' : 'cinza', v.avaria ? 'Avaria informada' : 'Observações', v.observacoes) : null,
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-3', style: { gap: 10 } }, (v.fotos || []).map(function (f) {
          var lab = (POSICOES.find(function (x) { return x[0] === f.posicao; }) || [0, f.posicao])[1];
          var leg = (f.capturada_em ? 'Capturada em ' + fDH(f.capturada_em) : '') + (f.lat ? ' · ' + Number(f.lat).toFixed(5) + ', ' + Number(f.lng).toFixed(5) : '');
          return h('div', { key: f.id || f.posicao }, Thumb(f.foto || f.thumb, lab + (f.capturada_em ? ' · ' + fDHc(f.capturada_em) : ''), function () { setZoom({ t: lab, src: f.foto || f.thumb, l: leg }); }));
        }))));
  }

  // ───────────────────────── Contratos ─────────────────────────
  function ContratosView(props) {
    var api = props.api, nav = props.nav;
    var _d = useState(null), lista = _d[0], setLista = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _f = useState('todos'), filtro = _f[0], setFiltro = _f[1];
    var _q = useState(''), q = _q[0], setQ = _q[1];
    var carregar = useCallback(function () { setErro(null); api('/contratos').then(function (r) { setLista(r.contratos || []); }).catch(function (e) { setErro(e.message); }); }, [api]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!lista) return Spinner('Carregando contratos...');
    var cnt = function (s) { return lista.filter(function (c) { return c.situacao === s; }).length; };
    var qq = q.trim().toLowerCase();
    var fl = lista.filter(function (c) {
      if (filtro === 'encerrados') { if (!{ encerrado: 1, recusado: 1, cancelado: 1 }[c.situacao]) return false; }
      else if (filtro !== 'todos' && c.situacao !== filtro) return false;
      return !qq || [c.numero, c.cliente_nome, c.placa, c.moto_modelo].join(' ').toLowerCase().indexOf(qq) >= 0;
    });
    return h(Card, { pad: false },
      h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
        h('h2', { style: { margin: '0 8px 0 0', fontSize: 15, fontWeight: 700 } }, 'Contratos'),
        Chips([{ id: 'todos', t: 'Todos', n: lista.length }, { id: 'aguardando_assinatura', t: 'Aguardando assinatura', n: cnt('aguardando_assinatura') }, { id: 'em_dia', t: 'Em dia', n: cnt('em_dia') }, { id: 'atrasada', t: 'Em atraso', n: cnt('atrasada') }, { id: 'em_retomada', t: 'Em retomada', n: cnt('em_retomada') }, { id: 'quitado', t: 'Quitados', n: cnt('quitado') }, { id: 'encerrados', t: 'Encerrados', n: cnt('encerrado') + cnt('recusado') + cnt('cancelado') }], filtro, setFiltro),
        h('div', { style: { flex: 1 } }),
        Busca(q, setQ, 'Nº, cliente ou placa')),
      lista.length === 0 ? Vazio('Nenhum contrato ainda', 'Aprove um pré-cadastro e cadastre uma moto para criar o primeiro.', Btn({ variant: 'pri', icon: 'plus', onClick: function () { nav({ tela: 'novoContrato' }); }, children: 'Novo contrato' })) :
      fl.length === 0 ? Vazio('Nenhum contrato neste filtro') :
      Tabela([{ t: 'Contrato' }, { t: 'Locatário' }, { t: 'Moto' }, { t: 'Parcela', right: true }, { t: 'Pagas' }, { t: 'Saldo devedor', right: true }, { t: 'Próx. vencimento' }, { t: 'Situação' }],
        fl.map(function (c) {
          return Linha(c.id, [
            { td: 1, v: h('div', null, h('div', { style: { fontWeight: 600, fontFamily: MONO, fontSize: 12.5 } }, c.numero), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, fD(c.criado_em))) },
            { td: 1, v: h('div', null, c.cliente_nome, h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, c.cliente_tipo === 'tutts' ? 'Motoboy Tutts' : 'Externo')) },
            { td: 1, v: h('div', null, c.moto_modelo, h('div', { style: { fontSize: 11.5, color: '#6b7280', fontFamily: MONO } }, c.placa)) },
            { td: 1, v: fR(c.valor_semanal), right: true },
            { td: 1, v: fN(c.parcelas_pagas) + ' de ' + fN(c.semanas), st: { whiteSpace: 'nowrap' } },
            { td: 1, v: fR(c.saldo_devedor), right: true },
            { td: 1, v: c.proximo_vencimento ? fDS(c.proximo_vencimento, true) : '—' },
            { td: 1, v: pillSit(c) }
          ], function () { nav({ tela: 'contrato', id: c.id }); });
        })));
  }

  function primeiroVenc(inicioISO, dia) {
    var d = parseData(inicioISO); if (!d || !dia) return null;
    var delta = (Number(dia) - d.getDay() + 7) % 7; d.setDate(d.getDate() + delta); return d;
  }
  function addDias(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }

  function NovoContratoView(props) {
    var api = props.api, toast = props.toast, nav = props.nav;
    var _c = useState(null), clientes = _c[0], setClientes = _c[1];
    var _m = useState(null), motos = _m[0], setMotos = _m[1];
    var _cfg = useState(null), cfg = _cfg[0], setCfg = _cfg[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _cl = useState(props.cliente_id ? String(props.cliente_id) : ''), cliId = _cl[0], setCliId = _cl[1];
    var _mo = useState(''), motoId = _mo[0], setMotoId = _mo[1];
    var _v = useState(''), valor = _v[0], setValor = _v[1];
    var _n = useState('104'), semanas = _n[0], setSemanas = _n[1];
    var _i = useState(''), inicio = _i[0], setInicio = _i[1];
    var _sim = useState(null), sim = _sim[0], setSim = _sim[1];
    var _s = useState(false), salvando = _s[0], setSalvando = _s[1];
    var carregar = useCallback(function () {
      setErro(null);
      Promise.all([api('/clientes?sem_contrato=1'), api('/motos'), api('/config').catch(function () { return null; })]).then(function (r) {
        setClientes(r[0].clientes || []); setMotos((r[1].motos || []).filter(function (m) { return m.status === 'disponivel'; })); setCfg(r[2]);
      }).catch(function (e) { setErro(e.message); });
    }, [api]);
    useEffect(carregar, [carregar]);
    var cli = (clientes || []).find(function (c) { return String(c.id) === cliId; });
    var moto = (motos || []).find(function (m) { return String(m.id) === motoId; });
    var vNum = moedaParse(valor), nSem = parseInt(semanas, 10);
    var completo = cli && moto && vNum > 0 && nSem > 0 && inicio;
    useEffect(function () {
      if (!cli || !(vNum > 0) || !(nSem > 0) || !inicio) { setSim(null); return; }
      var t = setTimeout(function () {
        api('/contratos/simular', { method: 'POST', body: { cliente_id: cli.id, dia_vencimento: cli.dia_vencimento, valor_semanal: vNum, semanas: nSem, data_inicio: inicio } })
          .then(setSim).catch(function () { setSim(null); });
      }, 300);
      return function () { clearTimeout(t); };
    }, [cliId, valor, semanas, inicio, clientes]);
    if (erro) return Erro(erro, carregar);
    if (!clientes || !motos) return Spinner('Carregando clientes e motos...');
    // Prévia local (o backend é a fonte da verdade no resumo)
    var pv = cli && inicio ? primeiroVenc(inicio, cli.dia_vencimento) : null;
    var prim = sim ? parseData(sim.primeiro_vencimento) : pv;
    var ult = sim ? parseData(sim.ultimo_vencimento) : (pv && nSem > 0 ? addDias(pv, 7 * (nSem - 1)) : null);
    var total = sim ? sim.total : (vNum > 0 && nSem > 0 ? Math.round(vNum * nSem * 100) / 100 : null);
    var previa = [];
    if (prim && vNum > 0 && nSem > 0) {
      var idx = nSem <= 5 ? Array.from({ length: nSem }, function (_, i) { return i; }) : [0, 1, 2, -1, nSem - 1];
      idx.forEach(function (i) {
        if (i < 0) previa.push({ n: '…' });
        else previa.push({ n: String(i + 1), d: fDS(addDias(prim, 7 * i)), v: fR(vNum), a: fR(vNum * (i + 1)), ult: i === nSem - 1 });
      });
    }
    var juros = cfg ? cfg.juros_dia_pct : null, diasRet = cfg ? cfg.dias_retomada : null;
    var inicioD = parseData(inicio);
    var gerar = function () {
      setSalvando(true);
      api('/contratos', { method: 'POST', body: { cliente_id: cli.id, moto_id: moto.id, valor_semanal: vNum, semanas: nSem, data_inicio: inicio } })
        .then(function (r) {
          toast(r.autentique && r.autentique.enviado ? 'Contrato gerado e enviado ao Autentique' : 'Contrato gerado' + (r.autentique && r.autentique.motivo ? ' · Autentique: ' + r.autentique.motivo : ''), r.autentique && r.autentique.enviado === false ? 'error' : 'success');
          props.aoMudar && props.aoMudar();
          nav({ tela: 'contrato', id: r.contrato_id }, true);
        }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalvando(false); });
    };
    var tabelaPrevia = previa.length ? Tabela([{ t: 'Nº' }, { t: 'Vencimento' }, { t: 'Valor', right: true }, { t: 'Acumulado', right: true }],
      previa.map(function (p, i) { return Linha(i, [{ td: 1, v: p.n, st: p.n === '…' ? { color: '#9ca3af' } : null }, { td: 1, v: p.d || '' }, { td: 1, v: p.v || '', right: true }, { td: 1, v: p.a || '', right: true, st: p.ult ? { fontWeight: 600 } : null }]); }))
      : h('div', { style: { padding: 16, fontSize: 13, color: '#9ca3af' } }, 'Escolha o cliente, o valor, as semanas e a data de início para ver as parcelas.');
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      voltar(function () { nav({ tela: 'lista', tab: 'contratos' }); }, 'Contratos'),
      h('div', null,
        h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 22, fontWeight: 700 } }, 'Novo contrato'),
        h('p', { style: { margin: '4px 0 0', color: '#6b7280', fontSize: 13.5 } }, 'Plano Conquista · locação com reserva de domínio. O sistema não precifica: o valor semanal é sempre digitado.')),
      h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] items-start' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          h(Card, { pad: false }, CardHead('Cliente e moto'),
            h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2', style: { gap: 12 } },
                h(Field, { label: 'Cliente aprovado', req: true, hint: cli ? [cli.tipo_label || (cli.tipo === 'tutts' ? 'Motoboy Tutts' : 'Externo'), cli.cpf_mascarado ? 'CPF ' + cli.cpf_mascarado : null, 'vence ' + (DIA_PLURAL[cli.dia_vencimento] || cli.dia_label || '')].filter(Boolean).join(' · ') : (clientes.length ? null : 'Nenhum cliente aprovado sem contrato') },
                  Select({ value: cliId, onChange: function (e) { setCliId(e.target.value); } }, [h('option', { key: '', value: '' }, clientes.length ? 'Escolha o cliente' : 'Sem clientes disponíveis')].concat(clientes.map(function (c) { return h('option', { key: c.id, value: String(c.id) }, c.nome + ' · ' + (c.tipo === 'tutts' ? 'Tutts' : 'Externo')); })))),
                h(Field, { label: 'Moto disponível', req: true, hint: moto ? [moto.ano, moto.cor, moto.tem_seguro && moto.tem_rastreador ? 'seguro e rastreador ok' : 'confira seguro/rastreador'].filter(Boolean).join(' · ') : (motos.length ? null : 'Nenhuma moto disponível') },
                  Select({ value: motoId, onChange: function (e) { setMotoId(e.target.value); } }, [h('option', { key: '', value: '' }, motos.length ? 'Escolha a moto' : 'Sem motos disponíveis')].concat(motos.map(function (m) { return h('option', { key: m.id, value: String(m.id) }, m.placa + ' · ' + m.modelo); }))))),
              moto ? h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', border: '1px solid #e9d5f9', background: '#faf7fd', borderRadius: 12, padding: 10 } },
                h(MotoImg, { src: moto.capa_thumb, tipo: moto.tipo, modelo: moto.modelo, cor: moto.cor, w: 120, h: 76 }),
                h('div', null, h('div', { style: { fontWeight: 600 } }, moto.modelo), h('div', { style: { fontSize: 12, color: '#6b7280' } }, [h('span', { key: 'p', style: { fontFamily: MONO } }, moto.placa), ' · ', [moto.ano, moto.cor].filter(Boolean).join(' · ')]))) : null,
              h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Só aparecem clientes aprovados sem contrato ativo e motos com status Disponível. Motos em Manutenção ficam de fora.'))),
          h(Card, { pad: false }, CardHead('Condições'),
            h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4', style: { gap: 12 } },
                h(Field, { label: 'Valor semanal', req: true, hint: 'Digitado pelo time' }, Input({ value: valor, inputMode: 'decimal', placeholder: 'R$ 0,00', onChange: function (e) { setValor(e.target.value); } })),
                h(Field, { label: 'Nº de semanas', req: true, hint: nSem > 0 ? '≈ ' + (nSem >= 52 ? (Math.round(nSem / 52 * 10) / 10).toString().replace('.', ',') + ' ano' + (nSem >= 104 ? 's' : '') : nSem + ' semanas') : null }, Input({ value: semanas, inputMode: 'numeric', onChange: function (e) { setSemanas(soDig(e.target.value)); } })),
                h(Field, { label: 'Data de início', req: true, hint: inicioD ? DIAS_LONGO[inicioD.getDay()] : null }, Input({ type: 'date', value: inicio, onChange: function (e) { setInicio(e.target.value); } })),
                h(Field, { label: 'Dia de vencimento', hint: 'Vem do cadastro do cliente' }, Input({ readOnly: true, value: cli ? (DIA_VENC.find(function (x) { return x[0] === Number(cli.dia_vencimento); }) || [0, ''])[1].replace('-feira', '') : '—', style: { background: '#f9fafb', color: '#374151' } }))),
              h('div', { style: { background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#374151', display: 'flex', gap: 10 } },
                ico('key', 16, { color: ROXO, marginTop: 1 }),
                h('div', null, h('b', { style: { color: ROXO_ESC } }, 'Plano Conquista'), h('div', { style: { marginTop: 2 } }, 'A moto é transferida ao entregador na quitação da última parcela (status vira Transferência liberada).'))))),
          h(Card, { pad: false }, CardHead('Prévia das parcelas', null, nSem > 0 ? nSem + ' parcelas · geradas só depois da assinatura' : null), tabelaPrevia)),
        h('div', { style: { position: 'sticky', top: 84 } },
          h(Card, { pad: false }, CardHead('Resumo'),
            h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
              h('div', null,
                h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Total do contrato'),
                h('div', { style: Object.assign({ fontFamily: SORA, fontSize: 28, fontWeight: 700 }, TAB) }, total != null ? fR(total) : '—'),
                h('div', { style: Object.assign({ fontSize: 12.5, color: '#6b7280' }, TAB) }, nSem > 0 && vNum > 0 ? nSem + ' × ' + fR(vNum) : '')),
              h('div', null, [
                ['1º vencimento', prim ? fDS(prim) : '—'], ['Último vencimento', ult ? fDS(ult) : '—'], ['Parcelas', nSem > 0 ? nSem + ' semanais' : '—'],
                ['Juros por atraso', juros != null ? String(juros).replace('.', ',') + '% ao dia' : '—'], ['Retomada', diasRet != null ? 'após ' + diasRet + ' dias de atraso' : '—'], ['Cobrança', cli && cli.tipo === 'tutts' ? 'Repasse + PIX' : 'PIX + WhatsApp']
              ].map(function (r) { return h('div', { key: r[0], style: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 } }, h('span', { style: { color: '#6b7280' } }, r[0]), h('span', { style: Object.assign({ fontWeight: 600, textAlign: 'right' }, TAB) }, r[1])); })),
              Aviso('ambar', 'Vistoria de retirada obrigatória', 'Antes da entrega da moto. O locatário confirma as fotos pelo portal.', 'camera'),
              Btn({ variant: 'pri', icon: 'filetext', onClick: gerar, disabled: !completo || salvando, style: { width: '100%', height: 44 }, children: salvando ? 'Gerando contrato...' : 'Gerar contrato e enviar ao Autentique' }),
              h('div', { style: { fontSize: 12, color: '#6b7280', lineHeight: 1.5 } }, 'O contrato fica ', h('b', null, 'Aguardando assinatura'), ' e a moto, ', h('b', null, 'Reservada'), '. Quando o Autentique devolver assinado, o contrato vira Ativo e as parcelas são geradas.'))))));
  }

  function abrirPdf(api, url, toast) {
    var w = window.open('', '_blank');
    api(url, { raw: true }).then(function (res) { return res.blob(); }).then(function (b) {
      var u = URL.createObjectURL(b);
      if (w) w.location.href = u; else window.open(u, '_blank');
      setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
    }).catch(function (e) { if (w) w.close(); toast(e.message, 'error'); });
  }

  function ContratoDetalhe(props) {
    var api = props.api, toast = props.toast, nav = props.nav;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _f = useState('todas'), filtro = _f[0], setFiltro = _f[1];
    var _t = useState(false), todas = _t[0], setTodas = _t[1];
    var _m = useState(null), modal = _m[0], setModal = _m[1];
    var _b = useState(null), ocupado = _b[0], setOcupado = _b[1];
    var carregar = useCallback(function () {
      setErro(null);
      api('/contratos/' + props.id).then(setD).catch(function (e) { setErro(e.message); });
    }, [api, props.id]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d) return Spinner('Abrindo contrato...');
    var c = d.contrato || {}, cli = d.cliente || {}, mo = d.moto || {}, k = d.indicadores || {}, parcelas = d.parcelas || [], logs = d.logs || [];
    var acao = function (chave, url, body, msg) {
      setOcupado(chave);
      return api(url, { method: 'POST', body: body || {} })
        .then(function (r) { toast(msg, 'success'); setModal(null); carregar(); props.aoMudar && props.aoMudar(); return r; })
        .catch(function (e) { toast(e.message, 'error'); throw e; })
        .then(function (r) { setOcupado(null); return r; }, function () { setOcupado(null); });
    };
    var cobrar = function (p) {
      setOcupado('p' + p.id);
      api('/parcelas/' + p.id + '/cobrar', { method: 'POST', body: {} }).then(function (r) {
        toast(r.whatsapp && r.whatsapp.enviado ? 'Cobrança enviada no WhatsApp' : 'PIX gerado' + (r.whatsapp && r.whatsapp.motivo ? ' (WhatsApp: ' + r.whatsapp.motivo + ')' : ''), 'success');
        if (r.pix_copia_cola && !(r.whatsapp && r.whatsapp.enviado)) copiar(r.pix_copia_cola, toast);
        carregar();
      }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setOcupado(null); });
    };
    var aberta = { a_vencer: 1, vence_hoje: 1, atrasada: 1 };
    var proxIdx = parcelas.findIndex(function (p) { return aberta[p.status]; });
    var cnt = function (fn) { return parcelas.filter(fn).length; };
    var fl = parcelas.filter(function (p) {
      if (filtro === 'atrasadas') return p.status === 'atrasada';
      if (filtro === 'avencer') return p.status === 'a_vencer' || p.status === 'vence_hoje';
      if (filtro === 'pagas') return p.status === 'paga';
      return true;
    });
    var janela = fl;
    if (filtro === 'todas' && !todas && parcelas.length > 8) {
      var ini = Math.max(0, (proxIdx < 0 ? parcelas.length : proxIdx) - 4);
      ini = Math.min(ini, parcelas.length - 8);
      janela = parcelas.slice(ini, ini + 8);
    }
    var primeiraCobravel = parcelas.find(function (p) { return p.status === 'atrasada' || p.status === 'vence_hoje'; });
    var sit = c.situacao;
    var assinando = sit === 'aguardando_assinatura';
    var ativo = sit === 'em_dia' || sit === 'atrasada';
    var faltamRet = c.dias_retomada != null && c.dias_atraso != null ? c.dias_retomada - c.dias_atraso : null;
    var tipoLabel = cli.tipo === 'tutts' ? 'Motoboy Tutts' : 'Externo';
    var subPartes = ['Contrato ' + c.numero, tipoLabel, mo.modelo];

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      voltar(function () { nav({ tela: 'lista', tab: props.de || 'contratos' }); }, props.de === 'painel' ? 'Frota' : 'Contratos'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' } },
        h('div', { style: { minWidth: 0, flex: '1 1 520px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 22, fontWeight: 700 } }, cli.nome || '—'), pillSit(c)),
          h('div', { style: { fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 1.6 } },
            subPartes.join(' · ') + ' ', h('span', { style: { fontFamily: MONO, color: '#374151' } }, mo.placa),
            cli.dia_vencimento ? ' · vence ' + DIA_PLURAL[cli.dia_vencimento] : '',
            c.assinado_em ? (c.assinatura_manual_motivo ? ' · assinatura confirmada manualmente em ' : ' · assinado no Autentique em ') + fD(c.assinado_em) : '',
            c.tem_pdf_assinado ? h('span', null, ' · ', h('button', { type: 'button', className: 'hover:underline', onClick: function () { abrirPdf(api, '/contratos/' + c.id + '/pdf?assinado=1', toast); }, style: { color: ROXO, fontWeight: 600, cursor: 'pointer' } }, 'PDF assinado'))
              : c.tem_pdf ? h('span', null, ' · ', h('button', { type: 'button', className: 'hover:underline', onClick: function () { abrirPdf(api, '/contratos/' + c.id + '/pdf', toast); }, style: { color: ROXO, fontWeight: 600, cursor: 'pointer' } }, 'PDF do contrato')) : null)),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          Btn({ icon: 'camera', onClick: function () { nav({ tela: 'moto', id: mo.id }); }, children: 'Vistorias da moto' }),
          h(AcessoPortalBtn, { api: api, toast: toast, cliente: cli }),
          primeiraCobravel ? Btn({ variant: 'pri', icon: 'message', disabled: ocupado === 'p' + primeiraCobravel.id, onClick: function () { cobrar(primeiraCobravel); }, children: 'Reenviar cobrança' }) : null)),

      assinando ? h('div', { style: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' } },
        ico('clock', 18, { color: '#2563eb', marginTop: 1 }),
        h('div', { style: { flex: 1, minWidth: 240, color: '#1e40af', fontSize: 13.5 } },
          h('div', { style: { fontWeight: 700 } }, 'Aguardando assinatura no Autentique'),
          h('div', { style: { marginTop: 2 } }, 'As parcelas só são criadas quando o documento volta assinado. A moto fica Reservada até lá.' + (c.autentique_doc_id ? ' Documento ' + c.autentique_doc_id + '.' : ' O contrato ainda não foi enviado ao Autentique.'))),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          c.autentique_doc_id ? Btn({ small: true, icon: 'refresh', disabled: !!ocupado, onClick: function () { acao('consultar', '/contratos/' + c.id + '/consultar-assinatura', {}, 'Status consultado'); }, children: ocupado === 'consultar' ? 'Consultando...' : 'Consultar assinatura' }) : null,
          Btn({ small: true, icon: 'upload', disabled: !!ocupado, onClick: function () { acao('reenviar', '/contratos/' + c.id + '/reenviar-assinatura', {}, 'Enviado ao Autentique'); }, children: c.autentique_doc_id ? 'Reenviar' : 'Enviar ao Autentique' }),
          Btn({ small: true, icon: 'check', disabled: !!ocupado, onClick: function () { setModal('assinado'); }, children: 'Marcar como assinado' }),
          Btn({ small: true, variant: 'perigo', disabled: !!ocupado, onClick: function () { setModal('cancelar'); }, children: 'Cancelar contrato' }))) : null,

      assinando ? null : KpiStrip([
        { r: 'Parcelas pagas', v: fN(k.pagas) + '/' + fN(k.total_parcelas), s: k.total_parcelas ? Math.round(100 * num(k.pagas) / num(k.total_parcelas)) + '% do contrato' : '' },
        { r: 'Saldo devedor', v: fR(k.saldo_devedor), s: (num(k.total_parcelas) - num(k.pagas)) + ' parcelas restantes' },
        { r: 'Parcela', v: fR(k.parcela), s: 'semanal · ' + (DIA_PLURAL[cli.dia_vencimento] || '') },
        { r: 'Em atraso', v: fR(k.atrasado_valor), s: num(k.atrasadas_qtd) ? k.atrasadas_qtd + ' parcela' + (k.atrasadas_qtd > 1 ? 's' : '') + ' · juros ' + fR(k.juros_acumulados) : 'nenhuma parcela vencida', cor: num(k.atrasadas_qtd) ? '#991b1b' : null },
        { r: 'Próx. vencimento', v: k.proximo_vencimento ? fDC(k.proximo_vencimento) : '—', s: k.proximo_vencimento ? DIAS_LONGO[parseData(k.proximo_vencimento).getDay()] + (function () { var pp = parcelas.find(function (x) { return x.vencimento === k.proximo_vencimento; }); return pp ? ' · parcela ' + pp.numero : ''; })() : '' }
      ]),

      h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start' },
        h(Card, { pad: false },
          h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
            h('h2', { style: { margin: '0 8px 0 0', fontSize: 15, fontWeight: 700 } }, 'Parcelas'),
            Chips([{ id: 'todas', t: 'Todas', n: parcelas.length }, { id: 'atrasadas', t: 'Atrasadas', n: cnt(function (p) { return p.status === 'atrasada'; }) }, { id: 'avencer', t: 'A vencer', n: cnt(function (p) { return p.status === 'a_vencer' || p.status === 'vence_hoje'; }) }, { id: 'pagas', t: 'Pagas', n: cnt(function (p) { return p.status === 'paga'; }) }], filtro, setFiltro)),
          parcelas.length === 0 ? Vazio(assinando ? 'As parcelas aparecem depois da assinatura' : 'Sem parcelas', assinando ? 'Quando o Autentique devolver o contrato assinado, as ' + c.semanas + ' parcelas são criadas.' : null) :
          janela.length === 0 ? Vazio('Nenhuma parcela neste filtro') :
          Tabela([{ t: 'Nº' }, { t: 'Vencimento' }, { t: 'Valor', right: true }, { t: 'Juros', right: true }, { t: 'Total', right: true }, { t: 'Status' }, { t: 'Forma' }, { t: '' }],
            janela.map(function (p) {
              var aberto = !!aberta[p.status];
              var forma = p.status === 'paga' ? (p.forma_label || p.forma || '—') + (p.pago_em ? ' · ' + fDC(p.pago_em) : '') : (num(p.valor_abatido_repasse) > 0 ? 'Repasse ' + fR(p.valor_abatido_repasse) + ' · falta ' + fR(p.saldo) : (p.cobranca_enviada_em ? 'Cobrado ' + fDC(p.cobranca_enviada_em) : '—'));
              return Linha(p.id, [
                { td: 1, v: p.numero },
                { td: 1, v: fDS(p.vencimento), st: { whiteSpace: 'nowrap' } },
                { td: 1, v: num(p.valor_extras) > 0 ? h('span', { title: (p.extras || []).map(function (x) { return x.descricao + ' ' + fR(x.valor); }).join(' · ') }, fR(p.valor), h('div', { style: { fontSize: 11.5, color: ROXO_ESC, fontWeight: 600 } }, '+ ' + fR(p.valor_extras) + ' extras')) : fR(p.valor), right: true }, // LOCACAO_V2: extras
                { td: 1, v: num(p.juros) > 0 ? fR(p.juros) : '—', right: true, st: num(p.juros) > 0 ? { color: '#991b1b', fontWeight: 600 } : { color: '#9ca3af' } },
                { td: 1, v: fR(p.total), right: true, st: { fontWeight: 600 } },
                { td: 1, v: pillParc(p) },
                { td: 1, v: forma, st: { fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' } },
                { td: 1, right: true, st: { whiteSpace: 'nowrap' }, v: aberto ? h('span', { style: { display: 'inline-flex', gap: 10 } },
                  h('button', { type: 'button', disabled: ocupado === 'p' + p.id, onClick: function () { cobrar(p); }, className: 'hover:underline', style: { color: ROXO, fontWeight: 600, cursor: 'pointer', fontSize: 12.5 } }, ocupado === 'p' + p.id ? 'Enviando...' : (p.status === 'a_vencer' && !p.cobranca_enviada_em ? 'Cobrar' : 'Reenviar')),
                  p.pix_copia_cola ? h('button', { type: 'button', onClick: function () { copiar(p.pix_copia_cola, toast); }, className: 'hover:underline', style: { color: ROXO, fontWeight: 600, cursor: 'pointer', fontSize: 12.5 } }, 'Copiar PIX') : null,
                  h('button', { type: 'button', onClick: function () { setModal({ baixa: p }); }, className: 'hover:underline', style: { color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 12.5 } }, 'Baixa'))
                  : p.status === 'paga' ? h('button', { type: 'button', onClick: function () { setModal({ recibo: p }); }, className: 'hover:underline', style: { color: ROXO, fontWeight: 600, cursor: 'pointer', fontSize: 12.5 } }, 'Recibo') : null }
              ], null, p.status === 'atrasada' ? { background: '#fffafa' } : null);
            })),
          filtro === 'todas' && parcelas.length > 8 ? h('div', { style: { padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6b7280' } },
            h('span', null, todas ? 'Mostrando todas as ' + parcelas.length + ' parcelas' : 'Mostrando ' + janela.length + ' de ' + parcelas.length + ' parcelas'),
            Btn({ variant: 'link', small: true, onClick: function () { setTodas(!todas); }, children: todas ? 'Mostrar menos' : 'Ver todas' })) : null),

        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          h(Card, { pad: false }, CardHead('Ações do contrato'),
            h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 } },
              sit === 'atrasada' && faltamRet != null ? h('div', { style: { fontSize: 12.5, color: '#92400e', lineHeight: 1.5 } }, 'Com ' + c.dias_retomada + ' dias de atraso o sistema aciona a retomada sozinho. ' + (faltamRet > 0 ? 'Falta' + (faltamRet > 1 ? 'm ' : ' ') + faltamRet + ' dia' + (faltamRet > 1 ? 's' : '') + ' para esse limite.' : 'O limite já foi atingido.')) : null,
              c.bloqueio_sinalizado_em ? h('div', { style: { fontSize: 12.5, color: '#991b1b' } }, 'Bloqueio sinalizado no rastreador em ' + fDH(c.bloqueio_sinalizado_em) + '.') : null,
              sit === 'em_retomada' ? Aviso('vermelho', 'Em retomada' + (c.retomada_em ? ' desde ' + fD(c.retomada_em) : ''), 'Quando a moto voltar, registre a devolução. Se o locatário pagar antes, o contrato volta a Em dia.') : null,
              sit === 'quitado' ? Aviso('roxo', 'Contrato quitado' + (c.quitado_em ? ' em ' + fD(c.quitado_em) : ''), 'A moto está liberada para transferência ao locatário.', 'key') : null,
              ativo ? Btn({ variant: 'perigo', icon: 'alert', disabled: !!ocupado, onClick: function () { setModal('retomada'); }, style: { width: '100%' }, children: 'Iniciar retomada' }) : null,
              ativo || sit === 'em_retomada' ? Btn({ variant: 'perigo', icon: 'arrowleft', disabled: !!ocupado, onClick: function () { setModal('devolucao'); }, style: { width: '100%' }, children: 'Registrar moto devolvida' }) : null,
              ativo || sit === 'em_retomada' ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Depois da devolução, registre a vistoria de devolução em Vistorias da moto.') : null,
              sit === 'quitado' && mo.status === 'transferencia_liberada' ? Btn({ variant: 'pri', icon: 'check', disabled: !!ocupado, onClick: function () { if (window.confirm('Confirmar que a transferência da moto foi concluída?')) acao('transf', '/contratos/' + c.id + '/transferencia-concluida', {}, 'Transferência registrada'); }, style: { width: '100%' }, children: 'Transferência concluída' }) : null,
              !ativo && sit !== 'em_retomada' && sit !== 'quitado' && !assinando ? h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Nenhuma ação disponível para este contrato.') : null,
              assinando ? h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'As ações de cobrança e retomada liberam depois da assinatura.') : null)),
          h(Card, { pad: false }, CardHead('Histórico'),
            h('div', { style: { padding: '12px 16px', maxHeight: 420, overflowY: 'auto' } },
              logs.length === 0 ? h('div', { style: { fontSize: 13, color: '#9ca3af' } }, 'Sem registros.') :
              logs.map(function (l, i) {
                return h('div', { key: l.id || i, style: { display: 'grid', gridTemplateColumns: '8px 1fr', gap: 10, padding: '7px 0' } },
                  h('span', { style: { width: 8, height: 8, borderRadius: 99, marginTop: 6, background: /retomada|atras|recus|cancel/i.test(l.acao) ? '#dc2626' : /pag|baixa|quit|assin/i.test(l.acao) ? '#16a34a' : '#9ca3af' } }),
                  h('div', { style: { minWidth: 0 } },
                    h('div', { style: { fontSize: 13, color: '#111827' } }, l.detalhe || l.acao),
                    h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, fDHc(l.criado_em) + ' · ' + (l.usuario_nome || 'sistema'))));
              }))))),

      modal === 'retomada' ? h(MotivoModal, { titulo: 'Iniciar retomada', label: 'Motivo', hint: 'Contrato e moto vão para Em retomada e uma ocorrência é aberta.', botao: 'Iniciar retomada', perigo: true,
        texto: 'Use quando precisar retomar antes do limite automático de ' + c.dias_retomada + ' dias.', onClose: function () { setModal(null); }, onConfirm: function (m) { return acao('ret', '/contratos/' + c.id + '/iniciar-retomada', { motivo: m || null }, 'Retomada iniciada'); } }) : null,
      modal === 'devolucao' ? h(MotivoModal, { titulo: 'Registrar moto devolvida', label: 'Observação', botao: 'Registrar devolução', perigo: true,
        texto: 'O contrato é encerrado e a moto volta para Disponível. A vistoria de devolução fica pendente para a equipe.', onClose: function () { setModal(null); }, onConfirm: function (m) { return acao('dev', '/contratos/' + c.id + '/registrar-devolucao', { observacao: m || null }, 'Devolução registrada'); } }) : null,
      modal === 'assinado' ? h(MotivoModal, { titulo: 'Marcar como assinado', label: 'Motivo', obrigatorio: true, botao: 'Marcar como assinado', hint: 'Fica no histórico. Use só se o Autentique não devolveu o status.',
        texto: 'As ' + c.semanas + ' parcelas serão criadas a partir do 1º vencimento e o contrato vira Ativo.', onClose: function () { setModal(null); }, onConfirm: function (m) { return acao('ass', '/contratos/' + c.id + '/marcar-assinado', { motivo: m }, 'Contrato ativado'); } }) : null,
      modal === 'cancelar' ? h(MotivoModal, { titulo: 'Cancelar contrato', label: 'Motivo', obrigatorio: true, botao: 'Cancelar contrato', perigo: true,
        texto: 'Só contratos aguardando assinatura podem ser cancelados. A moto volta para Disponível.', onClose: function () { setModal(null); }, onConfirm: function (m) { return acao('canc', '/contratos/' + c.id + '/cancelar', { motivo: m }, 'Contrato cancelado'); } }) : null,
      modal && modal.baixa ? h(BaixaModal, { p: modal.baixa, onClose: function () { setModal(null); }, onConfirm: function (b) { return acao('baixa', '/parcelas/' + modal.baixa.id + '/baixa-manual', b, 'Baixa registrada'); } }) : null,
      modal && modal.recibo ? h(Modal, { titulo: 'Recibo · parcela ' + modal.recibo.numero, onClose: function () { setModal(null); }, largura: 440 },
        h('div', null, [
          ['Locatário', cli.nome], ['Contrato', c.numero], ['Moto', mo.modelo + ' · ' + mo.placa], ['Vencimento', fDS(modal.recibo.vencimento)], ['Valor', fR(modal.recibo.valor)],
          ['Juros', num(modal.recibo.juros) > 0 ? fR(modal.recibo.juros) : '—'], ['Abatido do repasse', num(modal.recibo.valor_abatido_repasse) > 0 ? fR(modal.recibo.valor_abatido_repasse) : '—'], ['Total pago', fR(modal.recibo.total)],
          ['Pago em', fDH(modal.recibo.pago_em)], ['Forma', modal.recibo.forma_label || modal.recibo.forma || '—']
        ].map(function (r) { return h('div', { key: r[0], style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 } }, h('span', { style: { color: '#6b7280' } }, r[0]), h('b', { style: TAB }, r[1])); }))) : null);
  }

  function BaixaModal(props) {
    var _d = useState(hojeISO()), data = _d[0], setData = _d[1];
    var _o = useState(''), obs = _o[0], setObs = _o[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    var p = props.p;
    return h(Modal, { titulo: 'Baixa manual · parcela ' + p.numero, onClose: props.onClose, largura: 480,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }), Btn({ key: 'o', variant: 'pri', icon: 'check', disabled: s || obs.trim().length < 3, onClick: function () { setS(true); Promise.resolve(props.onConfirm({ data_pagamento: data, observacao: obs.trim() })).catch(function () {}).then(function () { setS(false); }); }, children: s ? 'Salvando...' : 'Registrar baixa' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { fontSize: 13.5, color: '#374151' } }, 'Total a quitar: ', h('b', { style: TAB }, fR(p.saldo != null ? num(p.saldo) + num(p.juros) : p.total)), num(p.juros) > 0 ? h('span', { style: { color: '#991b1b' } }, ' (inclui juros ' + fR(p.juros) + ')') : null),
        h(Field, { label: 'Data do pagamento', req: true }, Input({ type: 'date', value: data, max: hojeISO(), onChange: function (e) { setData(e.target.value); } })),
        h(Field, { label: 'Observação', req: true, hint: 'Ex.: PIX recebido na conta da empresa, comprovante no WhatsApp. Fica no log.' }, TextArea({ rows: 3, value: obs, onChange: function (e) { setObs(e.target.value); } }))));
  }

  function AcessoPortalBtn(props) {
    var _s = useState(false), s = _s[0], setS = _s[1];
    var _r = useState(null), r = _r[0], setR = _r[1];
    if (!props.cliente || !props.cliente.id) return null;
    var enviar = function () {
      setS(true);
      props.api('/clientes/' + props.cliente.id + '/acesso-portal', { method: 'POST', body: {} })
        .then(function (x) { if (x.enviado) props.toast('Código de 1º acesso enviado no WhatsApp', 'success'); else setR(x); })
        .catch(function (e) { props.toast(e.message, 'error'); }).then(function () { setS(false); });
    };
    var url = (window.location.origin || '') + '/moto';
    return h(React.Fragment, null,
      Btn({ icon: 'key', disabled: s, onClick: enviar, title: 'Envia ao locatário o código para criar a senha do portal', children: s ? 'Enviando...' : (props.cliente.tem_acesso_portal ? 'Reenviar acesso ao portal' : 'Acesso ao portal') }),
      r ? h(Modal, { titulo: 'Acesso ao portal do locatário', onClose: function () { setR(null); }, largura: 460 },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5, color: '#374151' } },
          Aviso('ambar', 'O WhatsApp não enviou', 'Passe o código ao locatário por outro canal. Ele vale por pouco tempo.'),
          h('div', { style: { textAlign: 'center', fontFamily: SORA, fontSize: 30, fontWeight: 700, letterSpacing: '.3em', color: ROXO_ESC } }, r.codigo || '—'),
          h('div', null, 'O locatário entra em ', h('b', null, url), ', informa o CPF e esse código, cria a senha e dá ciência do termo LGPD.'),
          Btn({ icon: 'copy', onClick: function () { copiar('Acesse ' + url + ' com seu CPF e o código ' + r.codigo + ' para criar sua senha.', props.toast); }, children: 'Copiar mensagem' }))) : null);
  }

  // ───────────────────────── Vistorias ─────────────────────────
  function VistoriasView(props) {
    var api = props.api, toast = props.toast, nav = props.nav;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _f = useState('aguardando'), filtro = _f[0], setFiltro = _f[1];
    var _v = useState(null), aberta = _v[0], setAberta = _v[1];
    var carregar = useCallback(function () {
      setErro(null);
      api('/vistorias' + (filtro === 'todas' ? '' : '?status=' + filtro)).then(setD).catch(function (e) { setErro(e.message); });
    }, [api, filtro]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    var vs = (d && d.vistorias) || [], prazos = (d && d.pendentes_prazo) || [];
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      prazos.length ? h(Card, { pad: false }, CardHead('Vistorias com prazo', null, 'o locatário precisa enviar pelo portal'),
        Tabela([{ t: 'Moto' }, { t: 'Placa' }, { t: 'Locatário' }, { t: 'Tipo' }, { t: 'Prazo' }, { t: '' }],
          prazos.map(function (p, i) {
            var vencida = parseData(p.prazo) && parseData(p.prazo) < parseData(hojeISO());
            return Linha(i, [p.modelo, { td: 1, v: p.placa, st: { fontFamily: MONO, fontSize: 12.5 } }, p.cliente_nome || '—', (TIPOS_VIST.find(function (t) { return t[0] === p.tipo; }) || [0, p.tipo])[1],
              { td: 1, v: p.label || fDS(p.prazo, true), st: { color: vencida ? '#991b1b' : '#92400e', fontWeight: 600 } },
              { td: 1, right: true, v: h('button', { type: 'button', className: 'hover:underline', onClick: function (e) { e.stopPropagation(); nav({ tela: 'moto', id: p.moto_id }); }, style: { color: ROXO, fontWeight: 600, cursor: 'pointer' } }, 'Ver moto') }],
              function () { nav({ tela: 'moto', id: p.moto_id }); });
          }))) : null,
      h(Card, { pad: false },
        h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
          h('h2', { style: { margin: '0 8px 0 0', fontSize: 15, fontWeight: 700 } }, 'Vistorias'),
          Chips([{ id: 'aguardando', t: 'Aguardando aprovação' }, { id: 'com_avaria', t: 'Com avaria' }, { id: 'aprovada', t: 'Aprovadas' }, { id: 'todas', t: 'Todas' }], filtro, setFiltro)),
        !d ? Spinner('Carregando vistorias...') :
        vs.length === 0 ? Vazio(filtro === 'aguardando' ? 'Nenhuma vistoria aguardando aprovação' : 'Nenhuma vistoria neste filtro', filtro === 'aguardando' ? 'Quando o locatário enviar as fotos pelo portal, elas aparecem aqui.' : null) :
        Tabela([{ t: 'Moto' }, { t: 'Locatário' }, { t: 'Tipo' }, { t: 'Enviada' }, { t: 'Km', right: true }, { t: 'Fotos', right: true }, { t: 'Avaria' }, { t: 'Status' }, { t: '' }],
          vs.map(function (v) {
            return Linha(v.id, [
              { td: 1, v: h('div', null, h('div', { style: { fontWeight: 600 } }, v.modelo), h('div', { style: { fontSize: 11.5, color: '#6b7280', fontFamily: MONO } }, v.placa)) },
              v.cliente_nome || '—', v.tipo_label || v.tipo,
              { td: 1, v: h('div', null, fDHc(v.criado_em), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, v.origem === 'portal' ? 'pelo portal' : 'pela equipe')) },
              { td: 1, v: v.km != null ? fN(v.km) : '—', right: true }, { td: 1, v: fN(v.qtd_fotos), right: true },
              { td: 1, v: v.avaria ? h('span', { style: { color: '#991b1b', fontWeight: 600 } }, 'Sim') : 'Não' },
              { td: 1, v: Pill(v.status_label || ROT_VIST[v.status], TOM_VIST[v.status] || 'cinza') },
              { td: 1, right: true, v: h('button', { type: 'button', className: 'hover:underline', onClick: function (e) { e.stopPropagation(); setAberta(v.id); }, style: { color: ROXO, fontWeight: 600, cursor: 'pointer' } }, v.status === 'aguardando' ? 'Revisar' : 'Ver fotos') }
            ], function () { setAberta(v.id); });
          }))),
      aberta ? h(VistoriaModal, { id: aberta, api: api, toast: toast, onClose: function () { setAberta(null); }, aoMudar: function () { carregar(); props.recarregarPainel && props.recarregarPainel(); } }) : null);
  }

  // ───────────────────────── Configurações ─────────────────────────
  function ConfigView(props) {
    var api = props.api, toast = props.toast;
    var _c = useState(null), cfg = _c[0], setCfg = _c[1];
    var _i = useState(null), integ = _i[0], setInteg = _i[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _s = useState(false), salvando = _s[0], setSalvando = _s[1];
    var taRef = useRef(null);
    var _sc = useState('juros'), secao = _sc[0], setSecao = _sc[1]; // LOCACAO_V2
    var carregar = useCallback(function () {
      setErro(null);
      api('/config').then(function (r) { setCfg(r); }).catch(function (e) { setErro(e.message); });
      api('/integracoes').then(setInteg).catch(function () { setInteg({}); });
    }, [api]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!cfg) return Spinner('Carregando configurações...');
    var set = function (k, v) { setCfg(function (c) { var n = Object.assign({}, c); n[k] = v; return n; }); };
    var salvar = function () {
      setSalvando(true);
      var body = { juros_dia_pct: moedaParse(cfg.juros_dia_pct), dias_retomada: parseInt(cfg.dias_retomada, 10), validade_convite_dias: parseInt(cfg.validade_convite_dias, 10), vistoria_periodica_dias: parseInt(cfg.vistoria_periodica_dias, 10),
        modelo_contrato: cfg.modelo_contrato, termo_lgpd: cfg.termo_lgpd, termo_lgpd_versao: String(cfg.termo_lgpd_versao || '').trim() };
      body.regua = Object.assign({}, REGUA_PADRAO, cfg.regua || {}); // LOCACAO_V2
      api('/config', { method: 'PUT', body: body }).then(function (r) { if (r && typeof r === 'object' && r.juros_dia_pct != null) setCfg(function (c) { return Object.assign({}, c, r); }); toast('Configurações salvas', 'success'); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalvando(false); });
    };
    var inserirVar = function (v) {
      var ta = taRef.current, txt = '{{' + v + '}}', atual = cfg.modelo_contrato || '';
      if (ta && typeof ta.selectionStart === 'number') {
        var a = ta.selectionStart, b = ta.selectionEnd;
        set('modelo_contrato', atual.slice(0, a) + txt + atual.slice(b));
        setTimeout(function () { try { ta.focus(); ta.selectionStart = ta.selectionEnd = a + txt.length; } catch (e) { /* ok */ } }, 0);
      } else set('modelo_contrato', atual + txt);
    };
    var it = integ || {};
    var statusInt = function (ok, nome, desc) {
      return h('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderTop: '1px solid #f3f4f6' } },
        h('span', { style: { width: 8, height: 8, borderRadius: 99, marginTop: 6, background: integ == null ? '#d1d5db' : ok ? '#16a34a' : '#d97706', flex: 'none' } }),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontSize: 13, fontWeight: 600 } }, nome, h('span', { style: { fontWeight: 500, color: integ == null ? '#9ca3af' : ok ? '#166534' : '#92400e' } }, integ == null ? ' · verificando' : ok ? ' · configurado' : ' · não configurado')),
          h('div', { style: { fontSize: 12, color: '#6b7280' } }, desc)));
    };
    // LOCACAO_V2: seções + régua de cobrança
    var SEC = [{ id: 'juros', t: 'Juros e prazos' }, { id: 'regua', t: 'Régua de cobrança' }, { id: 'modelo', t: 'Modelo de contrato' }, { id: 'termo', t: 'Termo LGPD' }, { id: 'integ', t: 'Integrações' }];
    var vis = function (id) { return secao === id ? null : { display: 'none' }; };
    var barraSalvar = h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
      Btn({ onClick: carregar, children: 'Descartar' }),
      Btn({ variant: 'pri', icon: 'save', disabled: salvando, onClick: salvar, children: salvando ? 'Salvando...' : 'Salvar configurações' }));
    var chipsSec = h('div', { role: 'tablist', 'aria-label': 'Seções das configurações', style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, Chips(SEC, secao, setSecao));
    if (secao === 'regua') return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, chipsSec, h(ReguaCobranca, { cfg: cfg, set: set, api: api }), barraSalvar);
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, chipsSec,
     h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start' },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: vis('juros') }, h(Card, { pad: false }, CardHead('Cobrança e prazos'),
          h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4', style: { gap: 12 } },
              h(Field, { label: 'Juros por dia de atraso (%)', req: true, hint: 'Sem teto' }, Input({ value: cfg.juros_dia_pct != null ? String(cfg.juros_dia_pct).replace('.', ',') : '', inputMode: 'decimal', onChange: function (e) { set('juros_dia_pct', e.target.value); } })),
              h(Field, { label: 'Retomada após (dias)', req: true }, Input({ value: cfg.dias_retomada != null ? String(cfg.dias_retomada) : '', inputMode: 'numeric', onChange: function (e) { set('dias_retomada', soDig(e.target.value)); } })),
              h(Field, { label: 'Validade do convite (dias)', req: true }, Input({ value: cfg.validade_convite_dias != null ? String(cfg.validade_convite_dias) : '', inputMode: 'numeric', onChange: function (e) { set('validade_convite_dias', soDig(e.target.value)); } })),
              h(Field, { label: 'Vistoria periódica (dias)', req: true }, Input({ value: cfg.vistoria_periodica_dias != null ? String(cfg.vistoria_periodica_dias) : '', inputMode: 'numeric', onChange: function (e) { set('vistoria_periodica_dias', soDig(e.target.value)); } }))),
            Aviso('ambar', 'Mudanças valem só para contratos novos', 'Contratos já gerados mantêm o % de juros e os dias de retomada da época. Juros de 2% ao dia sem teto podem ser contestados como abusivos: valide com o jurídico.')))),
        h('div', { style: vis('modelo') }, h(Card, { pad: false }, CardHead('Modelo de contrato · Plano Conquista'),
          h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 } },
            h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Clique numa variável para inserir no ponto do cursor. O sistema troca pelos dados do cliente, da moto e das parcelas ao gerar o PDF.'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, (cfg.variaveis_modelo || []).map(function (v) {
              var nome = typeof v === 'string' ? v : v.nome || v.chave;
              return h('button', { key: nome, type: 'button', onClick: function () { inserirVar(nome); }, title: typeof v === 'object' && v.descricao ? v.descricao : null,
                style: { fontFamily: MONO, fontSize: 11.5, padding: '3px 8px', borderRadius: 6, background: '#faf7fd', border: '1px solid #e9d5f9', color: ROXO_ESC, cursor: 'pointer' } }, '{{' + nome + '}}');
            })),
            h('label', { htmlFor: 'loc-modelo', className: 'sr-only' }, 'Modelo de contrato'),
            h('textarea', { id: 'loc-modelo', ref: taRef, rows: 18, value: cfg.modelo_contrato || '', onChange: function (e) { set('modelo_contrato', e.target.value); }, className: INPUT_CLS,
              style: Object.assign({}, INPUT, { height: 'auto', padding: 12, fontFamily: MONO, fontSize: 12.5, lineHeight: 1.55, resize: 'vertical' }) })))),
        h('div', { style: vis('termo') }, h(Card, { pad: false }, CardHead('Termo de privacidade (LGPD)'),
          h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 } },
            h(Field, { label: 'Versão do termo', req: true, hint: 'Mude a versão quando alterar o texto: os locatários precisam dar ciência de novo no portal.' }, Input({ value: cfg.termo_lgpd_versao || '', onChange: function (e) { set('termo_lgpd_versao', e.target.value); }, style: { maxWidth: 160 } })),
            h(Field, { label: 'Texto do termo', req: true }, TextArea({ rows: 10, value: cfg.termo_lgpd || '', onChange: function (e) { set('termo_lgpd', e.target.value); } }))))),
        secao === 'integ' ? h('div', { style: { fontSize: 13, color: '#6b7280' } }, 'As integrações são configuradas por variáveis de ambiente no servidor. O status aparece ao lado.') : null,
        secao === 'integ' ? null : barraSalvar),
      h('div', { style: { position: 'sticky', top: 84 } },
        h(Card, { pad: false }, CardHead('Integrações'),
          h('div', { style: { padding: '4px 16px 12px' } },
            statusInt(it.autentique, 'Autentique', 'Assinatura do contrato e retorno do documento assinado.'),
            statusInt(it.stark, 'Stark Bank', 'PIX da parcela no vencimento e baixa automática pelo webhook.'),
            statusInt(it.whatsapp, 'WhatsApp', 'Convites, cobranças, recibos e código do portal.'),
            it.webhook_autentique_url ? h('div', { style: { marginTop: 8 } },
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 } }, 'Webhook do Autentique'),
              h('div', { style: { display: 'flex', gap: 6 } }, Input({ readOnly: true, value: it.webhook_autentique_url, style: { fontFamily: MONO, fontSize: 11.5, height: 34 }, 'aria-label': 'URL do webhook do Autentique' }), Btn({ small: true, icon: 'copy', ariaLabel: 'Copiar URL do webhook', onClick: function () { copiar(it.webhook_autentique_url, toast); } }))) : null)))));
  }

  // ═════════════════════════ LOCACAO_V2: novas funções do time ═════════════════════════
  var URG_COR = { urgente: '#dc2626', atencao: '#d97706', rotina: '#2563eb' };
  var GRUPO_ICO = { atrasados: 'alert', vencem_hoje: 'clock', vistorias: 'camera', assinatura: 'pencil', precadastros: 'user', documentos: 'filetext', avisos: 'message' };
  var TIPO_OCOR = [['manutencao', 'Manutenção', 'wrench', 'roxo'], ['multa', 'Multa', 'tag', 'ambar'], ['sinistro', 'Sinistro', 'alert', 'vermelho'], ['roubo', 'Roubo ou furto', 'shield', 'vermelho'], ['outro', 'Outro', 'help', 'cinza']];
  var TOM_OCOR_ST = { aberta: 'ambar', resolvida: 'verde', cobrada: 'azul', paga: 'verde' };
  var TOM_AVISO = { aberto: 'ambar', em_atendimento: 'azul', resolvido: 'verde' };
  var TIPO_DOC = [['licenciamento', 'Licenciamento'], ['ipva', 'IPVA'], ['seguro', 'Seguro'], ['outro', 'Outro']];
  var TOM_DOC = { ok: 'verde', vence_em_breve: 'ambar', vencido: 'vermelho', pendente: 'cinza' };
  function tipoOcor(t) { return TIPO_OCOR.find(function (x) { return x[0] === t; }) || TIPO_OCOR[4]; }
  function useDebounce(valor, ms) {
    var _v = useState(valor), v = _v[0], setV = _v[1];
    useEffect(function () { var t = setTimeout(function () { setV(valor); }, ms || 300); return function () { clearTimeout(t); }; }, [JSON.stringify(valor)]);
    return v;
  }
  function Toggle(on, onChange, label) {
    return h('button', { type: 'button', role: 'switch', 'aria-checked': !!on, 'aria-label': label, onClick: function (e) { e.stopPropagation(); onChange(!on); },
      style: { width: 38, height: 22, borderRadius: 99, background: on ? ROXO : '#d1d5db', position: 'relative', flex: 'none', cursor: 'pointer', transition: 'background .15s' } },
      h('span', { style: { position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: 99, background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' } }));
  }

  // ───────── Fila "Hoje" ─────────
  function HojeCard(props) {
    var api = props.api, toast = props.toast, nav = props.nav;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _b = useState(null), ocupado = _b[0], setOcupado = _b[1];
    var _a = useState(null), aviso = _a[0], setAviso = _a[1];
    var carregar = useCallback(function () { setErro(null); api('/hoje').then(setD).catch(function (e) { setErro(e.message); }); }, [api]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d) return h(Card, null, Spinner('Montando a fila de hoje...'));
    var grupos = d.grupos || [], tot = d.totais || {};
    var nItens = grupos.reduce(function (s, g) { return s + (g.itens || []).length; }, 0);
    var post = function (url, msg, id) {
      setOcupado(id);
      api(url, { method: 'POST', body: {} }).then(function (r) {
        var w = r && r.whatsapp;
        toast(msg + (w && w.enviado === false ? ' (WhatsApp não enviado)' : ''), 'success');
        carregar(); props.aoMudar && props.aoMudar();
      }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setOcupado(null); });
    };
    var executar = function (it) {
      var a = it.acao || {};
      if (a.tipo === 'cobrar' || a.tipo === 'reenviar_cobranca') return post('/parcelas/' + a.parcela_id + '/cobrar', 'Cobrança enviada', it.id);
      if (a.tipo === 'reenviar_assinatura') return post('/contratos/' + a.contrato_id + '/reenviar-assinatura', 'Contrato reenviado ao Autentique', it.id);
      if (a.tipo === 'avisar_locatario') return post('/clientes/' + a.cliente_id + '/avisar-cnh', 'Aviso enviado ao locatário', it.id);
      if (a.tipo === 'revisar_vistoria') return a.moto_id ? nav({ tela: 'moto', id: a.moto_id, secao: 'vistorias' }) : nav({ tela: 'lista', tab: 'vistorias' });
      if (a.tipo === 'revisar_precadastro') return nav({ tela: 'lista', tab: 'precadastros', sel: a.precadastro_id });
      if (a.tipo === 'registrar_renovacao') return nav({ tela: 'moto', id: a.moto_id, secao: 'documentos' });
      if (a.tipo === 'ver_aviso') return setAviso(a.aviso_id);
      if (a.contrato_id) return nav({ tela: 'contrato', id: a.contrato_id });
      if (a.moto_id) return nav({ tela: 'moto', id: a.moto_id });
    };
    var icoAcao = { cobrar: 'message', reenviar_cobranca: 'message', reenviar_assinatura: 'arrowright', avisar_locatario: 'message', revisar_vistoria: 'camera', revisar_precadastro: 'user', registrar_renovacao: 'filetext', ver_aviso: 'eye' };
    var nGr = grupos.filter(function (g) { return (g.itens || []).length; });
    var tag = function (t, n, cor) { return n ? h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, background: cor[0], color: cor[1] } }, h('span', { style: { width: 6, height: 6, borderRadius: 99, background: cor[2] } }), t + ' ' + n) : null; };
    var hojeTxt = (function () { var x = new Date(); return DIAS_LONGO[x.getDay()] + ', ' + fDC(x); })();
    return h(Card, { pad: false, label: 'Hoje' },
      h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
        h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 700 } }, 'Hoje'),
        h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, hojeTxt + ' · ' + (nItens ? nItens + ' ' + (nItens === 1 ? 'item pede' : 'itens pedem') + ' ação' : 'nada pendente')),
        h('div', { style: { flex: 1 } }),
        tag('Urgente', tot.urgente, ['#fef2f2', '#991b1b', '#dc2626']), tag('Atenção', tot.atencao, ['#fffbeb', '#92400e', '#d97706']), tag('Rotina', tot.rotina, ['#eff6ff', '#1e40af', '#2563eb']),
        Btn({ small: true, icon: 'refresh', ariaLabel: 'Atualizar a fila', onClick: carregar })),
      nGr.length === 0 ? h('div', { style: { padding: '22px 16px', textAlign: 'center', color: '#166534', fontSize: 13.5 } }, h('b', null, 'Tudo em dia. '), 'Nenhuma cobrança, vistoria ou assinatura pendente.') :
      h('div', { className: 'grid grid-cols-1 lg:grid-cols-2' }, nGr.map(function (g, gi) {
        return h('div', { key: g.id, style: { padding: '12px 16px', borderTop: gi > 1 ? '1px solid #f3f4f6' : (gi === 1 ? '1px solid #f3f4f6' : 0), borderLeft: '1px solid #f3f4f6', marginLeft: -1 }, className: gi === 1 ? 'lg:!border-t-0' : '' },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } }, ico(GRUPO_ICO[g.id] || 'list', 15, { color: '#6b7280' }), h('b', { style: { fontSize: 13.5 } }, g.titulo),
            h('span', { style: { fontSize: 11, fontWeight: 700, background: '#f3f4f6', color: '#374151', borderRadius: 99, padding: '1px 7px' } }, (g.itens || []).length)),
          (g.itens || []).map(function (it, ii) {
            var a = it.acao || {};
            var pri = it.urgencia === 'urgente' && ii === 0 && (a.tipo === 'cobrar' || a.tipo === 'reenviar_cobranca');
            return h('div', { key: it.id || ii, style: { display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderTop: '1px solid #f3f4f6' } },
              h('span', { 'aria-hidden': 'true', style: { width: 8, height: 8, borderRadius: 99, background: URG_COR[it.urgencia] || '#9ca3af', flex: 'none' } }),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontWeight: 600, fontSize: 13, color: '#111827' } }, it.titulo),
                it.detalhe ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, it.detalhe) : null),
              a.label ? Btn({ small: true, variant: pri ? 'pri' : 'sec', icon: icoAcao[a.tipo] || null, disabled: ocupado === it.id, onClick: function () { executar(it); }, children: ocupado === it.id ? 'Enviando...' : a.label }) : null);
          }));
      })),
      h('div', { style: { padding: '9px 16px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', fontSize: 12, color: '#6b7280' } }, 'Grupo sem pendência some da lista. A fila é atualizada a cada ação.'),
      aviso ? h(AvisoModal, { id: aviso, api: api, toast: toast, onClose: function () { setAviso(null); }, onSalvo: function () { setAviso(null); carregar(); } }) : null);
  }

  // ───────── Inadimplência · 12 semanas ─────────
  function InadimplenciaCard(props) {
    var api = props.api;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var carregar = useCallback(function () { setErro(null); api('/inadimplencia?semanas=12').then(setD).catch(function (e) { setErro(e.message); }); }, [api]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d) return h(Card, null, Spinner('Calculando inadimplência...'));
    var sem = d.semanas || [], at = d.atual || {};
    var W = 760, H = 210, L = 58, R = 16, T = 18, B = 30;
    var maxV = Math.max(300, sem.reduce(function (m, s) { return Math.max(m, num(s.valor_aberto)); }, 0));
    var passo = maxV <= 900 ? 300 : maxV <= 3000 ? 1000 : maxV <= 9000 ? 3000 : Math.ceil(maxV / 3 / 1000) * 1000;
    var topo = Math.ceil(maxV / passo) * passo;
    var maxP = Math.max(25, sem.reduce(function (m, s) { return Math.max(m, num(s.pct_atraso)); }, 0));
    var n = sem.length || 1, slot = (W - L - R) / n, bw = Math.min(32, slot * 0.56);
    var y = function (v) { return T + (H - T - B) * (1 - v / topo); };
    var yp = function (v) { return T + (H - T - B) * (1 - v / (maxP * 1.15)); };
    var cx = function (i) { return L + slot * i + slot / 2; };
    var grade = []; for (var g = 0; g <= topo; g += passo) grade.push(g);
    var linha = sem.map(function (s, i) { return (i ? 'L' : 'M') + cx(i).toFixed(1) + ' ' + yp(num(s.pct_atraso)).toFixed(1); }).join(' ');
    var delta = d.pct_4_semanas != null ? num(at.pct_atraso) - num(d.pct_4_semanas) : null;
    var ret = d.retomadas || [];
    var fK = function (v) { return 'R$ ' + (v >= 1000 ? (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : num(v).toLocaleString('pt-BR')); };
    return h(Card, { pad: false, label: 'Inadimplência' },
      h('div', { style: { padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' } },
        h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 700 } }, 'Inadimplência · últimas ' + (sem.length || 12) + ' semanas'),
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' } }, h('span', { style: { width: 10, height: 10, borderRadius: 2, background: '#d8b4f0' } }), 'Valor em aberto'),
        h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' } }, h('span', { style: { width: 14, height: 2, background: '#f67602' } }), '% dos contratos em atraso')),
      h('div', { className: 'grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px]' },
        h('div', { style: { padding: '0 8px 12px 8px', overflowX: 'auto' } },
          sem.length === 0 ? Vazio('Sem histórico ainda', 'O gráfico aparece quando houver contratos ativos.') :
          h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Valor em aberto e percentual de contratos em atraso por semana', style: { display: 'block', minWidth: 520 } },
            grade.map(function (v) { return h('g', { key: v }, h('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: '#f3f4f6' }), h('text', { x: L - 8, y: y(v) + 4, textAnchor: 'end', fontSize: 10.5, fill: '#9ca3af' }, fK(v))); }),
            sem.map(function (s, i) {
              var v = num(s.valor_aberto), ult = i === sem.length - 1;
              return h('g', { key: i },
                h('rect', { x: cx(i) - bw / 2, y: y(v), width: bw, height: Math.max(0, y(0) - y(v)), rx: 3, fill: ult ? ROXO : '#d8b4f0' }, h('title', null, fD(s.fim) + ' · ' + fR(v) + ' em aberto · ' + num(s.pct_atraso).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '% em atraso (' + (s.contratos_atraso || 0) + ' de ' + (s.contratos_ativos || 0) + ')')),
                h('text', { x: cx(i), y: H - 10, textAnchor: 'middle', fontSize: 10.5, fill: '#9ca3af' }, fDC(s.fim)));
            }),
            h('path', { d: linha, fill: 'none', stroke: '#f67602', strokeWidth: 2 }),
            sem.map(function (s, i) { return h('circle', { key: 'p' + i, cx: cx(i), cy: yp(num(s.pct_atraso)), r: 3.5, fill: '#fff', stroke: '#f67602', strokeWidth: 2 }); }),
            sem.length ? h('text', { x: cx(sem.length - 1), y: yp(num(sem[sem.length - 1].pct_atraso)) - 9, textAnchor: 'middle', fontSize: 11, fontWeight: 700, fill: '#c2410c' }, Math.round(num(sem[sem.length - 1].pct_atraso)) + '%') : null)),
        h('div', { style: { padding: '4px 16px 16px', borderLeft: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 12 } },
          h('div', null, h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Contratos em atraso hoje'),
            h('div', { style: Object.assign({ fontFamily: SORA, fontSize: 26, fontWeight: 700, color: num(at.pct_atraso) > 0 ? '#991b1b' : '#166534' }, TAB) }, Math.round(num(at.pct_atraso)) + '%'),
            h('div', { style: { fontSize: 12, color: '#6b7280' } }, (at.contratos_atraso || 0) + ' de ' + (at.contratos_ativos || 0),
              delta != null ? h('div', null, 'há 4 semanas: ' + Math.round(num(d.pct_4_semanas)) + '% ', h('b', { style: { color: delta <= 0 ? '#166534' : '#991b1b' } }, (delta <= 0 ? '▼ ' : '▲ ') + Math.abs(Math.round(delta)) + ' p.p.')) : null)),
          h('div', null, h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Em aberto (vencido)'), h('div', { style: Object.assign({ fontFamily: SORA, fontSize: 20, fontWeight: 700 }, TAB) }, fR(at.valor_aberto)), num(at.juros) > 0 ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'com juros ' + fR(at.juros)) : null),
          h('div', null, h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Retomadas no período'), h('div', { style: Object.assign({ fontFamily: SORA, fontSize: 20, fontWeight: 700 }, TAB) }, ret.length),
            ret.slice(0, 3).map(function (x, i) { return h('div', { key: i, style: { fontSize: 12, color: '#6b7280' } }, x.cliente_nome + ' · ' + fDC(x.data)); })))));
  }

  // ───────── Documentos da moto ─────────
  function DocumentosMoto(props) {
    var api = props.api, toast = props.toast, docs = props.documentos || [];
    var _m = useState(null), modal = _m[0], setModal = _m[1];
    var _f = useState(null), foto = _f[0], setFoto = _f[1];
    var ver = function (dc) {
      setFoto({ titulo: dc.tipo_label || dc.tipo, src: null });
      api('/motos/' + props.moto.id + '/documentos/' + dc.id + '/arquivo').then(function (r) { setFoto({ titulo: r.nome || dc.tipo_label, src: r.conteudo }); }).catch(function (e) { setFoto(null); toast(e.message, 'error'); });
    };
    var excluir = function (dc) {
      if (!window.confirm('Excluir ' + (dc.tipo_label || 'documento') + (dc.referencia ? ' ' + dc.referencia : '') + '?')) return;
      api('/motos/' + props.moto.id + '/documentos/' + dc.id, { method: 'DELETE' }).then(function () { toast('Documento excluído', 'success'); props.aoMudar(); }).catch(function (e) { toast(e.message, 'error'); });
    };
    return h(Card, { pad: false, label: 'Documentos da moto' },
      CardHead('Documentos da moto', Btn({ variant: 'link', icon: 'upload', onClick: function () { setModal({}); }, children: 'Enviar' })),
      docs.length === 0 ? h('div', { style: { padding: 16, fontSize: 13, color: '#6b7280' } }, 'Nenhum documento. Registre licenciamento, IPVA e seguro para a Central avisar antes de vencer.') :
      docs.map(function (dc) {
        var sub = [dc.referencia, dc.pago ? (dc.vencimento ? 'pago · vence ' + fD(dc.vencimento) : 'pago') : dc.vencimento ? 'vence ' + fD(dc.vencimento) : null, dc.observacao].filter(Boolean).join(' · ');
        return h('div', { key: dc.id, style: { display: 'flex', gap: 12, alignItems: 'center', padding: '11px 16px', borderTop: '1px solid #f3f4f6' } },
          h('span', { style: { width: 34, height: 34, borderRadius: 9, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', flex: 'none' } }, ico('filetext', 16)),
          h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 } },
            h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 } }, h('span', { style: { fontWeight: 600, fontSize: 13.5 } }, dc.tipo_label || dc.tipo), Pill(dc.situacao_label || dc.situacao, TOM_DOC[dc.situacao] || 'cinza')),
            h('div', { style: { fontSize: 12, color: '#6b7280' } }, sub || '—')),
          h('span', { style: { display: 'inline-flex', gap: 10, alignItems: 'center', flex: 'none' } },
            dc.tem_arquivo ? h('button', { type: 'button', className: 'hover:underline', onClick: function () { ver(dc); }, style: { color: ROXO, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' } }, 'Ver') : null,
            h('button', { type: 'button', className: 'hover:underline', onClick: function () { setModal({ doc: dc }); }, style: { color: '#374151', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' } }, 'Editar'),
            h('button', { type: 'button', 'aria-label': 'Excluir documento', onClick: function () { excluir(dc); }, style: { color: '#9ca3af', cursor: 'pointer' } }, ico('trash', 14))));
      }),
      h('div', { style: { padding: '10px 16px', background: '#fffbeb', borderTop: '1px solid #fde68a', fontSize: 12, color: '#92400e' } }, 'A Central avisa 30 dias antes de vencer licenciamento, IPVA, seguro e a CNH do locatário.'),
      modal ? h(DocMotoModal, { moto: props.moto, doc: modal.doc, api: api, toast: toast, onClose: function () { setModal(null); }, onSalvo: function () { setModal(null); props.aoMudar(); } }) : null,
      foto ? h(Lightbox, { titulo: foto.titulo, src: foto.src, onClose: function () { setFoto(null); } }) : null);
  }
  function DocMotoModal(props) {
    var dc = props.doc || {};
    var _f = useState({ tipo: dc.tipo || 'licenciamento', referencia: dc.referencia || String(new Date().getFullYear()), vencimento: dc.vencimento ? String(dc.vencimento).slice(0, 10) : '', pago: !!dc.pago, observacao: dc.observacao || '' }), f = _f[0], setF = _f[1];
    var _a = useState(null), arq = _a[0], setArq = _a[1];
    var _s = useState(false), salv = _s[0], setSalv = _s[1];
    var set = function (k, v) { setF(function (x) { var n = Object.assign({}, x); n[k] = v; return n; }); };
    var salvar = function () {
      setSalv(true);
      var body = Object.assign({}, f, { vencimento: f.vencimento || null });
      if (arq) { body.arquivo = arq.conteudo; body.nome_arquivo = arq.nome; }
      props.api(dc.id ? '/motos/' + props.moto.id + '/documentos/' + dc.id : '/motos/' + props.moto.id + '/documentos', { method: dc.id ? 'PUT' : 'POST', body: body })
        .then(function () { props.toast('Documento salvo', 'success'); props.onSalvo(); }).catch(function (e) { props.toast(e.message, 'error'); }).then(function () { setSalv(false); });
    };
    return h(Modal, { titulo: dc.id ? 'Editar documento' : 'Documento da moto', onClose: props.onClose, largura: 520,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Cancelar' }), Btn({ key: 's', variant: 'pri', icon: 'save', disabled: salv, onClick: salvar, children: salv ? 'Salvando...' : 'Salvar documento' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Field, { label: 'Tipo', req: true }, Segmented(TIPO_DOC, f.tipo, function (v) { set('tipo', v); }, 'Tipo de documento')),
        h('div', { className: 'grid grid-cols-2', style: { gap: 12 } },
          h(Field, { label: f.tipo === 'seguro' ? 'Seguradora / apólice' : 'Referência', hint: f.tipo === 'seguro' ? null : 'Ex.: 2026' }, Input({ value: f.referencia, onChange: function (e) { set('referencia', e.target.value); } })),
          h(Field, { label: 'Vencimento', opt: true }, Input({ type: 'date', value: f.vencimento, onChange: function (e) { set('vencimento', e.target.value); } }))),
        h('label', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer' } }, h('input', { type: 'checkbox', checked: f.pago, onChange: function (e) { set('pago', e.target.checked); }, style: { width: 18, height: 18, accentColor: ROXO } }), f.tipo === 'seguro' ? 'Apólice vigente / paga' : 'Já está pago'),
        h(Field, { label: 'Observação', opt: true }, Input({ value: f.observacao, onChange: function (e) { set('observacao', e.target.value); } })),
        h(Field, { label: 'Arquivo', opt: true, hint: dc.tem_arquivo && !arq ? 'Já existe um arquivo. Envie outro para substituir.' : 'Foto ou PDF do documento' },
          h('input', { type: 'file', accept: 'image/*,application/pdf', onChange: function (e) { var fl = e.target.files && e.target.files[0]; if (!fl) return; lerArquivo(fl, 1600, 0.82).then(function (u) { setArq({ nome: fl.name, conteudo: u }); }).catch(function (er) { props.toast(er.message, 'error'); }); }, style: { fontSize: 13 } }))));
  }

  // ───────── Ocorrências ─────────
  function OcorrenciasPanel(props) {
    var api = props.api, toast = props.toast, lista = props.ocorrencias || [], rs = props.resumo || {};
    var _f = useState('todas'), f = _f[0], setF = _f[1];
    var _l = useState(null), foto = _l[0], setFoto = _l[1];
    var _b = useState(null), ocup = _b[0], setOcup = _b[1];
    var fl = lista.filter(function (o) { return f === 'todas' || o.tipo === f; });
    var abrirAnexo = function (o, a) {
      setFoto({ titulo: a.nome, src: null });
      api('/ocorrencias/' + o.id + '/anexos/' + a.id).then(function (r) { setFoto({ titulo: r.nome || a.nome, src: r.conteudo }); }).catch(function (e) { setFoto(null); toast(e.message, 'error'); });
    };
    var resolver = function (o) {
      setOcup(o.id);
      api('/ocorrencias/' + o.id + '/resolver', { method: 'POST', body: {} }).then(function () { toast('Ocorrência resolvida', 'success'); props.aoMudar(); }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setOcup(null); });
    };
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      h('section', { className: 'grid grid-cols-1 sm:grid-cols-3', style: Object.assign({}, CARD, { overflow: 'hidden' }) }, [
        { r: 'Manutenção no ano', v: fR(rs.custo_ano), s: 'pago pela Tutts' },
        { r: 'Cobrado do locatário', v: fR(rs.cobrado_locatario), s: 'multas, sinistros e outros' },
        { r: 'Em aberto', v: fR(rs.em_aberto), s: 'ainda não pago pelo locatário', cor: num(rs.em_aberto) > 0 ? '#92400e' : null }
      ].map(function (k, i) { return h('div', { key: i, style: { padding: '12px 16px', borderRight: '1px solid #f3f4f6' } }, h('div', { style: { fontSize: 12, color: '#6b7280' } }, k.r), h('div', { style: Object.assign({ fontFamily: SORA, fontSize: 20, fontWeight: 700, color: k.cor || '#111827' }, TAB) }, k.v), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, k.s)); })),
      h(Card, { pad: false },
        h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
          h('h2', { style: { margin: '0 8px 0 0', fontSize: 15, fontWeight: 700 } }, 'Ocorrências'),
          Chips([{ id: 'todas', t: 'Todas', n: lista.length }].concat(TIPO_OCOR.slice(0, 4).map(function (t) { return { id: t[0], t: t[1].replace(' ou furto', '/furto'), n: lista.filter(function (o) { return o.tipo === t[0]; }).length }; })), f, setF)),
        fl.length === 0 ? Vazio('Nenhuma ocorrência', 'Manutenções, multas e sinistros desta moto aparecem aqui.', Btn({ variant: 'pri', icon: 'plus', onClick: props.onNova, children: 'Nova ocorrência' })) :
        fl.map(function (o) {
          var t = tipoOcor(o.tipo), T = TONS[t[3]] || TONS.cinza;
          return h('div', { key: o.id, style: { display: 'flex', gap: 14, padding: '14px 16px', borderTop: '1px solid #f3f4f6', alignItems: 'flex-start' } },
            h('span', { style: { width: 38, height: 38, borderRadius: 10, background: T[0], color: T[2], display: 'grid', placeItems: 'center', flex: 'none' } }, ico(t[2], 17)),
            h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 } },
              h('div', { style: { fontSize: 13.5 } }, h('b', null, o.tipo_label || t[1]), o.descricao ? h('span', { style: { color: '#374151' } }, ' · ' + o.descricao) : null),
              h('div', { style: { fontSize: 12, color: '#6b7280' } }, [fD(o.data), o.cliente_nome, o.criado_por_nome ? 'por ' + o.criado_por_nome : null].filter(Boolean).join(' · ')),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' } },
                o.quem_paga === 'locatario' ? h('span', { style: { fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#f3e8fb', color: ROXO_ESC } }, 'Cobrar do locatário') : h('span', { style: { fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#f3f4f6', color: '#374151' } }, 'Paga pela Tutts'),
                (o.anexos || []).map(function (a) { return h('button', { key: a.id, type: 'button', onClick: function () { abrirAnexo(o, a); }, className: 'hover:underline', style: { color: ROXO, fontWeight: 600, fontSize: 12.5, display: 'inline-flex', gap: 4, alignItems: 'center', cursor: 'pointer' } }, ico('link', 12), a.nome); })),
              o.cobranca_label ? h('div', { style: { fontSize: 12.5, color: '#374151', background: '#f9fafb', borderRadius: 8, padding: '7px 10px' } }, o.cobranca_label) : null),
            h('div', { style: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: 'none' } },
              h('b', { style: Object.assign({ fontSize: 15 }, TAB) }, fR(o.valor)),
              Pill(o.status_label || o.status, TOM_OCOR_ST[o.status] || 'cinza'),
              o.status === 'aberta' ? Btn({ small: true, icon: 'check', disabled: ocup === o.id, onClick: function () { resolver(o); }, children: ocup === o.id ? 'Salvando...' : 'Resolver' }) : null));
        })),
      foto ? h(Lightbox, { titulo: foto.titulo, src: foto.src, onClose: function () { setFoto(null); } }) : null);
  }

  function NovaOcorrenciaModal(props) {
    var api = props.api, toast = props.toast, m = props.moto || {}, ct = props.contrato;
    var pre = props.preset || {};
    var temContrato = !!(ct && (ct.situacao === 'em_dia' || ct.situacao === 'atrasada' || ct.situacao === 'em_retomada' || ct.status === 'ativo' || ct.status === 'em_retomada'));
    var _f = useState({ tipo: pre.tipo || 'manutencao', data: hojeISO(), valor: '', descricao: pre.descricao || '', quem_paga: pre.quem_paga || (temContrato && pre.tipo && pre.tipo !== 'manutencao' ? 'locatario' : 'tutts'), forma_cobranca: 'proxima_parcela', parcelas_n: 3 }), f = _f[0], setF = _f[1];
    var _a = useState([]), anexos = _a[0], setAnexos = _a[1];
    var _s = useState(null), sim = _s[0], setSim = _s[1];
    var _b = useState(false), salv = _b[0], setSalv = _b[1];
    var set = function (k, v) { setF(function (x) { var n = Object.assign({}, x); n[k] = v; if (k === 'tipo') n.quem_paga = temContrato && v !== 'manutencao' ? 'locatario' : 'tutts'; return n; }); };
    var valor = moedaParse(f.valor);
    var simKey = useDebounce({ v: valor, q: f.quem_paga, fc: f.forma_cobranca, n: f.parcelas_n }, 350);
    useEffect(function () {
      setSim(null);
      if (!(simKey.v > 0) || simKey.q !== 'locatario') return;
      api('/ocorrencias/simular', { method: 'POST', body: { moto_id: m.id, valor: simKey.v, quem_paga: simKey.q, forma_cobranca: simKey.fc, parcelas_n: simKey.fc === 'dividir' ? simKey.n : null } }).then(setSim).catch(function (e) { setSim({ possivel: false, motivo: e.message }); });
    }, [JSON.stringify(simKey)]);
    var addAnexo = function (files) {
      Array.prototype.slice.call(files || []).slice(0, 6).forEach(function (fl) {
        lerArquivo(fl, 1600, 0.82).then(function (u) { setAnexos(function (x) { return x.concat([{ nome: fl.name, conteudo: u }]); }); }).catch(function (e) { toast(e.message, 'error'); });
      });
    };
    var ok = f.tipo && f.data && valor > 0 && f.descricao.trim().length >= 3 && (f.quem_paga !== 'locatario' || (temContrato && (!sim || sim.possivel !== false)));
    var salvar = function () {
      setSalv(true);
      api('/motos/' + m.id + '/ocorrencias', { method: 'POST', body: { tipo: f.tipo, data: f.data, descricao: f.descricao.trim(), valor: valor, quem_paga: f.quem_paga,
        forma_cobranca: f.quem_paga === 'locatario' ? f.forma_cobranca : null, parcelas_n: f.quem_paga === 'locatario' && f.forma_cobranca === 'dividir' ? f.parcelas_n : null, anexos: anexos } })
        .then(function (r) {
          toast('Ocorrência registrada' + (r && r.cobranca_label ? ' · ' + r.cobranca_label : ''), 'success');
          if (r && r.pix_copia_cola) copiar(r.pix_copia_cola, toast);
          props.onSalvo(r);
        }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalv(false); });
    };
    var proxTxt = ct && ct.proximo_vencimento ? fDS(ct.proximo_vencimento, true) : null;
    var opcao = function (id, titulo, sub, extra) {
      var on = f.forma_cobranca === id;
      return h('div', { key: id, role: 'radio', 'aria-checked': on, tabIndex: 0, onClick: function () { set('forma_cobranca', id); }, onKeyDown: function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); set('forma_cobranca', id); } },
        style: { display: 'flex', gap: 12, alignItems: 'center', padding: '11px 14px', borderRadius: 12, border: on ? '1.5px solid ' + ROXO : '1px solid #e5e7eb', boxShadow: on ? '0 0 0 3px #f3e8fb' : 'none', cursor: 'pointer', background: '#fff' } },
        h('span', { 'aria-hidden': 'true', style: { width: 18, height: 18, borderRadius: 99, border: '2px solid ' + (on ? ROXO : '#d1d5db'), display: 'grid', placeItems: 'center', flex: 'none' } }, on ? h('span', { style: { width: 8, height: 8, borderRadius: 99, background: ROXO } }) : null),
        h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontWeight: 600, fontSize: 13.5 } }, titulo), h('div', { style: { fontSize: 12, color: '#6b7280' } }, sub)),
        extra || null);
    };
    return h(Modal, { titulo: 'Nova ocorrência', onClose: props.onClose, largura: 640,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Cancelar' }), Btn({ key: 's', variant: 'pri', icon: 'check', disabled: !ok || salv, onClick: salvar, children: salv ? 'Registrando...' : 'Registrar ocorrência' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { fontSize: 12.5, color: '#6b7280', marginTop: -8 } }, [m.modelo, m.placa, ct && ct.cliente_nome].filter(Boolean).join(' · ')),
        h(Field, { label: 'Tipo', req: true }, h('div', { style: { overflowX: 'auto' } }, Segmented(TIPO_OCOR.map(function (t) { return [t[0], t[1]]; }), f.tipo, function (v) { set('tipo', v); }, 'Tipo de ocorrência'))),
        h('div', { className: 'grid grid-cols-2', style: { gap: 12 } },
          h(Field, { label: 'Data', req: true }, Input({ type: 'date', value: f.data, max: hojeISO(), onChange: function (e) { set('data', e.target.value); } })),
          h(Field, { label: 'Valor', req: true }, Input({ value: f.valor, inputMode: 'decimal', placeholder: 'R$ 0,00', onChange: function (e) { set('valor', e.target.value); } }))),
        h(Field, { label: 'Descrição', req: true }, Input({ value: f.descricao, placeholder: f.tipo === 'multa' ? 'Ex.: Radar · 67 km/h em via de 60 · Av. Paralela' : f.tipo === 'manutencao' ? 'Ex.: Troca do pneu traseiro + câmara' : 'O que aconteceu', onChange: function (e) { set('descricao', e.target.value); } })),
        h(Field, { label: 'Anexos', opt: true },
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
            anexos.map(function (a, i) { return h('span', { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12.5 } }, ico('filetext', 13), a.nome,
              h('button', { type: 'button', 'aria-label': 'Remover ' + a.nome, onClick: function () { setAnexos(function (x) { return x.filter(function (_, j) { return j !== i; }); }); }, style: { color: '#9ca3af', cursor: 'pointer' } }, ico('x', 12))); }),
            h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 8, border: '1px dashed #d8b4f0', color: ROXO_ESC, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' } },
              h('input', { type: 'file', multiple: true, accept: 'image/*,application/pdf', className: 'sr-only', onChange: function (e) { addAnexo(e.target.files); e.target.value = ''; } }), ico('plus', 13), 'Nota fiscal, auto de infração ou fotos'))),
        h(Field, { label: 'Quem paga?', req: true, hint: temContrato ? null : 'Sem contrato ativo nesta moto: só dá para registrar como custo da Tutts.' },
          h('div', null, Segmented([['tutts', 'Tutts'], ['locatario', 'Locatário']], f.quem_paga, function (v) { if (v === 'locatario' && !temContrato) return; set('quem_paga', v); }, 'Quem paga'))),
        f.quem_paga === 'locatario' ? h('div', { role: 'radiogroup', 'aria-label': 'Como cobrar', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          h('span', { style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, 'Como cobrar'),
          opcao('proxima_parcela', 'Junto da próxima parcela', proxTxt ? 'vence ' + proxTxt : 'na próxima parcela em aberto'),
          opcao('dividir', 'Dividir em parcelas', valor > 0 ? 'em ' + f.parcelas_n + '× de ' + fR(valor / f.parcelas_n) + ' a partir da próxima parcela' : 'escolha em quantas parcelas',
            f.forma_cobranca === 'dividir' ? h('select', { value: f.parcelas_n, onClick: function (e) { e.stopPropagation(); }, onChange: function (e) { set('parcelas_n', +e.target.value); }, 'aria-label': 'Número de parcelas', className: INPUT_CLS, style: Object.assign({}, INPUT, { width: 82, height: 34 }) },
              [2, 3, 4, 5, 6, 8, 10, 12].map(function (n) { return h('option', { key: n, value: n }, n + '×'); })) : null),
          opcao('pix_avulso', 'PIX avulso agora', 'envia o PIX por WhatsApp hoje')) : null,
        f.quem_paga === 'locatario' && valor > 0 ? (sim && sim.possivel === false ? Aviso('vermelho', 'Não dá para cobrar assim', sim.motivo) :
          h('div', { style: { background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: 12, padding: '12px 14px', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 } },
            !sim ? h('span', { style: { color: '#6b7280' } }, 'Calculando...') : h(React.Fragment, null,
              h('b', { style: { color: '#111827' } }, sim.texto || 'Cobrança simulada'),
              (sim.linhas || []).length > 1 ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } }, sim.linhas.map(function (l) { return h('div', { key: l.numero, style: Object.assign({ fontSize: 12.5, color: '#374151' }, TAB) }, 'Parcela ' + l.numero + ' · ' + fDS(l.vencimento, true) + ': ' + fR(l.valor_atual) + ' → ', h('b', { style: { color: ROXO_ESC } }, fR(l.valor_novo))); })) : null,
              h('span', { style: { fontSize: 12, color: '#6b7280' } }, (ct && ct.cliente_tipo === 'tutts' ? 'Motoboy Tutts: entra no abatimento do repasse; o que faltar vai por PIX. ' : '') + 'A ocorrência aparece no extrato do locatário com os anexos.')))) : null));
  }

  // ───────── Avisos de problema ─────────
  function AvisosPanel(props) {
    var lista = props.avisos || [];
    var _a = useState(null), aviso = _a[0], setAviso = _a[1];
    return h(Card, { pad: false },
      CardHead('Avisos do locatário', null, lista.length ? lista.filter(function (a) { return a.status !== 'resolvido'; }).length + ' em aberto' : null),
      lista.length === 0 ? Vazio('Nenhum aviso', 'Quando o locatário avisar um problema pela Central, ele aparece aqui.') :
      lista.map(function (a) {
        return h('div', { key: a.id, style: { display: 'flex', gap: 12, padding: '12px 16px', borderTop: '1px solid #f3f4f6', alignItems: 'flex-start' } },
          h('span', { style: { width: 36, height: 36, borderRadius: 10, background: a.urgencia === 'parada' ? '#fef2f2' : '#fffbeb', color: a.urgencia === 'parada' ? '#dc2626' : '#d97706', display: 'grid', placeItems: 'center', flex: 'none' } }, ico('alert', 16)),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', null, h('b', null, a.tipo_label || a.tipo), a.urgencia === 'parada' ? h('span', { style: { color: '#991b1b', fontWeight: 600, fontSize: 12.5 } }, ' · moto parada') : h('span', { style: { color: '#6b7280', fontSize: 12.5 } }, ' · consegue rodar')),
            h('div', { style: { fontSize: 12.5, color: '#374151' } }, a.descricao),
            h('div', { style: { fontSize: 12, color: '#6b7280' } }, [fDHc(a.criado_em), a.cliente_nome, a.qtd_fotos ? a.qtd_fotos + ' foto' + (a.qtd_fotos === 1 ? '' : 's') : null].filter(Boolean).join(' · ')),
            a.resposta ? h('div', { style: { marginTop: 6, background: '#faf7fd', borderRadius: 8, padding: '7px 10px', fontSize: 12.5 } }, h('b', { style: { color: ROXO_ESC } }, 'Resposta: '), a.resposta) : null),
          h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 } }, Pill(a.status_label || a.status, TOM_AVISO[a.status] || 'cinza'), Btn({ small: true, onClick: function () { setAviso(a.id); }, children: a.status === 'resolvido' ? 'Ver' : 'Responder' })));
      }),
      aviso ? h(AvisoModal, { id: aviso, api: props.api, toast: props.toast, onClose: function () { setAviso(null); }, onSalvo: function () { setAviso(null); props.aoMudar && props.aoMudar(); } }) : null);
  }
  function AvisoModal(props) {
    var _d = useState(null), a = _d[0], setA = _d[1];
    var _r = useState(''), resp = _r[0], setResp = _r[1];
    var _s = useState('em_atendimento'), st = _s[0], setSt = _s[1];
    var _b = useState(false), salv = _b[0], setSalv = _b[1];
    var _f = useState(null), foto = _f[0], setFoto = _f[1];
    useEffect(function () { props.api('/avisos/' + props.id).then(function (r) { var x = r.aviso || r; setA(x); setResp(x.resposta || ''); setSt(x.status === 'resolvido' ? 'resolvido' : 'em_atendimento'); }).catch(function (e) { props.toast(e.message, 'error'); props.onClose(); }); }, [props.id]);
    var salvar = function () {
      setSalv(true);
      props.api('/avisos/' + props.id + '/responder', { method: 'POST', body: { resposta: resp.trim(), status: st } })
        .then(function (r) { props.toast('Resposta enviada' + (r && r.whatsapp && r.whatsapp.enviado === false ? ' (WhatsApp não enviado)' : ''), 'success'); props.onSalvo(); })
        .catch(function (e) { props.toast(e.message, 'error'); }).then(function () { setSalv(false); });
    };
    return h(Modal, { titulo: a ? 'Aviso · ' + (a.tipo_label || a.tipo) : 'Aviso', onClose: props.onClose, largura: 600,
      rodape: a ? [Btn({ key: 'c', onClick: props.onClose, children: 'Fechar' }), Btn({ key: 's', variant: 'pri', icon: 'message', disabled: salv || resp.trim().length < 2, onClick: salvar, children: salv ? 'Enviando...' : 'Responder ao locatário' })] : null },
      !a ? Spinner('Abrindo aviso...') : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } }, Pill(a.status_label || a.status, TOM_AVISO[a.status] || 'cinza'), a.urgencia === 'parada' ? Pill('Moto parada', 'vermelho') : Pill('Consegue rodar', 'cinza'),
          h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, [a.cliente_nome, a.placa, fDH(a.criado_em)].filter(Boolean).join(' · '))),
        h('div', { style: { fontSize: 13.5, color: '#111827', background: '#f9fafb', borderRadius: 10, padding: '10px 12px' } }, a.descricao),
        (a.fotos || []).length ? h('div', { className: 'grid grid-cols-4', style: { gap: 8 } }, a.fotos.map(function (fo, i) { return h('div', { key: fo.id || i }, Thumb(fo.foto, 'Foto ' + (i + 1), function () { setFoto({ titulo: 'Foto ' + (i + 1), src: fo.foto }); })); })) : null,
        a.lat != null && a.lng != null ? h('a', { href: 'https://www.google.com/maps?q=' + a.lat + ',' + a.lng, target: '_blank', rel: 'noopener noreferrer', style: { display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, fontWeight: 600, color: ROXO } }, ico('pin', 14), 'Ver localização no mapa (' + Number(a.lat).toFixed(5) + ', ' + Number(a.lng).toFixed(5) + ')') : null,
        a.cliente_whatsapp ? h('a', { href: 'https://wa.me/' + soDig(a.cliente_whatsapp), target: '_blank', rel: 'noopener noreferrer', style: { display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#166534' } }, ico('message', 14), 'Chamar no WhatsApp · ' + fTel(a.cliente_whatsapp)) : null,
        h(Field, { label: 'Resposta para o locatário', req: true, hint: 'Aparece na Central do locatário e vai por WhatsApp.' }, TextArea({ rows: 3, value: resp, onChange: function (e) { setResp(e.target.value); }, placeholder: 'Ex.: o mecânico parceiro passa aí até 15h. Mantenha o celular ligado.' })),
        h(Field, { label: 'Situação' }, Segmented([['em_atendimento', 'Em atendimento'], ['resolvido', 'Resolvido']], st, setSt, 'Situação do aviso'))),
      foto ? h(Lightbox, { titulo: foto.titulo, src: foto.src, onClose: function () { setFoto(null); } }) : null);
  }

  // ───────── Comparar vistorias ─────────
  function CompararVistorias(props) {
    var api = props.api, toast = props.toast, m = props.moto || {}, vs = (props.vistorias || []).slice().sort(function (a, b) { return String(a.criado_em).localeCompare(String(b.criado_em)); });
    var padraoA = (vs.find(function (v) { return v.tipo === 'retirada'; }) || vs[0] || {}).id;
    var padraoB = (vs.length > 1 ? vs[vs.length - 1] : {}).id;
    if (padraoA === padraoB && vs.length > 1) padraoA = vs[vs.length - 2].id;
    var _a = useState(padraoA), aId = _a[0], setAId = _a[1];
    var _b = useState(padraoB), bId = _b[0], setBId = _b[1];
    var _va = useState(null), A = _va[0], setA = _va[1];
    var _vb = useState(null), B = _vb[0], setB = _vb[1];
    var _d = useState({}), dif = _d[0], setDif = _d[1];
    var _s = useState(false), salv = _s[0], setSalv = _s[1];
    var _f = useState(null), foto = _f[0], setFoto = _f[1];
    useEffect(function () { setA(null); if (aId) api('/vistorias/' + aId).then(function (r) { setA(r.vistoria); }).catch(function (e) { toast(e.message, 'error'); }); }, [aId]);
    useEffect(function () { setB(null); setDif({}); if (bId) api('/vistorias/' + bId).then(function (r) { setB(r.vistoria); }).catch(function (e) { toast(e.message, 'error'); }); }, [bId]);
    var rot = function (v) { return (v.tipo_label || v.tipo) + ' · ' + fDC(v.criado_em); };
    var sel = function (val, set, exc) {
      return Select({ value: val || '', onChange: function (e) { set(+e.target.value); }, 'aria-label': 'Vistoria', style: { width: 'auto', minWidth: 0, flex: '1 1 150px' } }, vs.map(function (v) { return h('option', { key: v.id, value: v.id, disabled: v.id === exc }, rot(v)); }));
    };
    var fotoDe = function (v, pos) { return ((v && v.fotos) || []).find(function (x) { return x.posicao === pos; }); };
    var marcadas = POSICOES.filter(function (p) { return dif[p[0]] != null; });
    var km = A && B && A.km != null && B.km != null ? B.km - A.km : null;
    var nFotos = POSICOES.filter(function (p) { return fotoDe(A, p[0]) && fotoDe(B, p[0]); }).length;
    var descr = marcadas.map(function (p) { return p[1] + (dif[p[0]] ? ': ' + dif[p[0]] : ''); }).join('; ');
    var apontar = function () {
      setSalv(true);
      api('/vistorias/' + B.id + '/avaria', { method: 'POST', body: { descricao: 'Comparação com ' + rot(A) + ' · ' + descr } })
        .then(function () { toast('Avaria registrada na vistoria', 'success'); props.aoMudar && props.aoMudar(); props.onApontar({ tipo: 'sinistro', quem_paga: 'locatario', descricao: 'Avaria na ' + String(B.tipo_label || B.tipo).toLowerCase() + ' de ' + fDC(B.criado_em) + ': ' + descr }); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalv(false); });
    };
    var aprovar = function () {
      setSalv(true);
      api('/vistorias/' + B.id + '/aprovar', { method: 'POST', body: {} }).then(function () { toast('Vistoria aprovada sem avaria', 'success'); props.aoMudar && props.aoMudar(); props.voltar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalv(false); });
    };
    var cab = function (v) { return v ? h('div', null, h('div', { style: { fontWeight: 700, fontSize: 13 } }, (v.tipo_label || v.tipo) + ' · ' + fD(v.criado_em)), h('div', { style: { fontSize: 12, color: '#6b7280' } }, [v.km != null ? fN(v.km) + ' km' : null, v.origem === 'portal' ? 'locatário via Central' : 'registrada pela equipe' + (v.registrado_por_nome ? ' (' + v.registrado_por_nome + ')' : '')].filter(Boolean).join(' · '))) : Spinner(''); };
    var img = function (f, marc) {
      return h('button', { type: 'button', onClick: f ? function () { setFoto({ titulo: 'Foto', src: f.foto }); } : null, style: { position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', background: '#f3f4f6', border: marc ? '2px solid #dc2626' : '1px solid #e5e7eb', boxShadow: marc ? '0 0 0 3px #fecaca' : 'none', cursor: f ? 'zoom-in' : 'default', display: 'grid', placeItems: 'center', color: '#9ca3af', padding: 0 } },
        f ? h('img', { src: f.foto || f.thumb, alt: '', loading: 'lazy', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' } }) : h('span', { style: { fontSize: 12 } }, 'Sem foto'),
        f && f.capturada_em ? h('span', { style: { position: 'absolute', left: 8, bottom: 8, background: 'rgba(17,24,39,.65)', color: '#fff', fontSize: 11, padding: '2px 7px', borderRadius: 99 } }, fDHc(f.capturada_em)) : null);
    };
    if (vs.length < 2) return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, voltar(props.voltar, m.modelo + ' · ' + m.placa), Vazio('É preciso ter duas vistorias', 'Registre a vistoria de retirada e a de devolução (ou revisão) para comparar foto a foto.'));
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      voltar(props.voltar, m.modelo + ' · ' + m.placa),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' } },
        h('div', null, h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 22, fontWeight: 700 } }, 'Comparar vistorias'), h('p', { style: { margin: '3px 0 0', fontSize: 13, color: '#6b7280' } }, 'Foto a foto, na mesma posição. Marque onde há diferença.')),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flex: '0 1 420px', minWidth: 0 } }, sel(aId, setAId, bId), h('button', { type: 'button', 'aria-label': 'Inverter', onClick: function () { var x = aId; setAId(bId); setBId(x); }, style: { width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#6b7280', cursor: 'pointer' } }, ico('shuffle', 16)), sel(bId, setBId, aId))),
      h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] items-start' },
        h(Card, { pad: false },
          h('div', { className: 'grid grid-cols-2 md:grid-cols-[170px_1fr_1fr]', style: { gap: 12, padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280', fontWeight: 600 } }, h('div', { className: 'hidden md:block' }, 'Posição'), cab(A), cab(B)),
          POSICOES.map(function (p) {
            var marc = dif[p[0]] != null;
            return h('div', { key: p[0], className: 'grid grid-cols-2 md:grid-cols-[170px_1fr_1fr]', style: { gap: 12, padding: '12px 16px', borderTop: '1px solid #f3f4f6', alignItems: 'center', background: marc ? '#fef2f2' : '#fff' } },
              h('div', { className: 'col-span-2 md:col-span-1', style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                h('b', { style: { fontSize: 13 } }, p[1]),
                marc ? h('input', { value: dif[p[0]], autoFocus: true, placeholder: 'O que mudou?', onChange: function (e) { var v = e.target.value; setDif(function (x) { var n = Object.assign({}, x); n[p[0]] = v; return n; }); }, className: INPUT_CLS, style: Object.assign({}, INPUT, { height: 32, fontSize: 12.5, borderColor: '#fecaca' }) }) : h('span', { style: { fontSize: 12, color: '#166534' } }, 'Sem diferença'),
                h('button', { type: 'button', onClick: function () { setDif(function (x) { var n = Object.assign({}, x); if (marc) delete n[p[0]]; else n[p[0]] = ''; return n; }); }, className: 'hover:underline', style: { alignSelf: 'flex-start', fontSize: 12, fontWeight: 600, color: marc ? '#6b7280' : '#991b1b', cursor: 'pointer' } }, marc ? 'Desmarcar' : 'Marcar diferença')),
              img(fotoDe(A, p[0]), false), img(fotoDe(B, p[0]), marc));
          })),
        h('div', { style: { position: 'sticky', top: 84 } },
          h(Card, null,
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              h('b', { style: { fontSize: 15 } }, 'Resumo'),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13 } }, h('span', { style: { color: '#6b7280' } }, 'Fotos comparadas'), h('b', null, nFotos + ' de 6')),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13 } }, h('span', { style: { color: '#6b7280' } }, 'Km rodados'), h('b', { style: TAB }, km != null ? fN(km) + ' km' : '—')),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13 } }, h('span', { style: { color: '#6b7280' } }, 'Avarias novas'), h('b', { style: { color: marcadas.length ? '#991b1b' : '#166534' } }, marcadas.length)),
              marcadas.length ? h('div', { style: { background: '#fef2f2', color: '#991b1b', borderRadius: 10, padding: '8px 10px', fontSize: 12.5 } }, marcadas.map(function (p) { return h('div', { key: p[0] }, h('b', null, p[1] + ' '), dif[p[0]] ? '· ' + dif[p[0]] : ''); })) : null,
              B ? Btn({ variant: 'perigoCheio', icon: 'alert', disabled: !marcadas.length || salv, onClick: apontar, children: 'Apontar avaria e cobrar' }) : null,
              B && B.status === 'aguardando' ? Btn({ icon: 'check', disabled: !!marcadas.length || salv, onClick: aprovar, children: 'Aprovar ' + String(B.tipo_label || 'vistoria').toLowerCase() + ' sem avaria' }) : null,
              h('div', { style: { fontSize: 12, color: '#6b7280' } }, '"Apontar avaria e cobrar" registra a avaria na vistoria e abre a Nova ocorrência já preenchida.'))))),
      foto ? h(Lightbox, { titulo: foto.titulo, src: foto.src, onClose: function () { setFoto(null); } }) : null);
  }

  // ───────── Régua de cobrança (Configurações) ─────────
  var REGUA_PADRAO = {
    d_menos1: { ativo: true, hora: '07:00', mensagem: 'Lembrete: amanhã vence a parcela {{parcela}} da sua moto ({{valor}}). O PIX já está disponível:\n{{pix}}' },
    d0: { ativo: true, hora: '07:00', mensagem: 'Sua parcela {{parcela}} vence hoje ({{vencimento}}). Valor: {{valor}}.\nPIX copia e cola:\n{{pix}}' },
    d1: { ativo: true, hora: '07:00', mensagem: 'A parcela {{parcela}} está em atraso há {{dias_atraso}} dia(s). Juros: {{juros}}. Valor atualizado: {{valor}}.\nPIX:\n{{pix}}' },
    retomada: { ativo: true }
  };
  var VARS_EXEMPLO = { nome: 'José', parcela: '14/104', valor: 'R$ 263,00', vencimento: 'seg, 26/10', pix: '00020126580014br.gov.bcb.pix0136a1f4…6304B2C1', dias_atraso: '2', juros: 'R$ 10,52', contrato: 'LM-2026-0001' };
  function ReguaCobranca(props) {
    var cfg = props.cfg, regua = Object.assign({}, REGUA_PADRAO, cfg.regua || {});
    var _e = useState('d_menos1'), etapa = _e[0], setEtapa = _e[1];
    var _p = useState(null), previa = _p[0], setPrevia = _p[1];
    var taRef = useRef(null);
    var setEt = function (k, campo, v) { var n = Object.assign({}, regua); n[k] = Object.assign({}, n[k] || {}); n[k][campo] = v; props.set('regua', n); };
    var vars = cfg.variaveis_regua || ['nome', 'parcela', 'valor', 'vencimento', 'pix', 'dias_atraso', 'juros', 'contrato'];
    var ET = [
      ['d_menos1', 'D-1', 'Lembrete na véspera', 'Envia o PIX um dia antes. Motoboy Tutts recebe o aviso de abatimento no repasse.', true],
      ['d0', 'D0', 'PIX + cobrança no vencimento', 'Emite o PIX no Stark e envia. Baixa automática pelo webhook.'],
      ['d1', 'D+1', 'Atraso: juros + bloqueio + reenvio', 'Juros de ' + String(cfg.juros_dia_pct != null ? cfg.juros_dia_pct : 2).replace('.', ',') + '% ao dia sobre o saldo em aberto. Bloqueio sinalizado no rastreador.'],
      ['retomada', 'D+' + (cfg.dias_retomada || 3), 'Retomada automática', 'Contrato e moto vão para Em retomada e uma ocorrência é aberta.']
    ];
    var atual = regua[etapa] || {};
    var msg = atual.mensagem || '';
    var dMsg = useDebounce(msg, 450);
    useEffect(function () {
      setPrevia(null);
      if (etapa === 'retomada' || !dMsg) return;
      props.api('/config/regua/previa', { method: 'POST', body: { mensagem: dMsg } }).then(function (r) { setPrevia(r && r.texto); }).catch(function () { setPrevia(null); });
    }, [dMsg, etapa]);
    var local = String(msg).replace(/\{\{\s*([a-z_]+)\s*\}\}/g, function (all, k) { return VARS_EXEMPLO[k] != null ? VARS_EXEMPLO[k] : all; });
    var inserir = function (v) {
      var ta = taRef.current, txt = '{{' + v + '}}';
      if (ta && typeof ta.selectionStart === 'number') { var a = ta.selectionStart, b = ta.selectionEnd; setEt(etapa, 'mensagem', msg.slice(0, a) + txt + msg.slice(b)); setTimeout(function () { try { ta.focus(); ta.selectionStart = ta.selectionEnd = a + txt.length; } catch (e) { /* ok */ } }, 0); }
      else setEt(etapa, 'mensagem', msg + txt);
    };
    var horas = []; for (var hh = 6; hh <= 21; hh++) horas.push(p2(hh) + ':00');
    var etAtual = ET.find(function (x) { return x[0] === etapa; });
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      h(Card, null,
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 } }, h('b', { style: { fontSize: 15 } }, 'Régua de cobrança'), h('span', { style: { fontSize: 13, color: '#6b7280' } }, 'O que o sistema faz sozinho em cada momento da parcela. Clique numa etapa para editar a mensagem.')),
        h('div', { className: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4', style: { gap: 14, position: 'relative' } }, ET.map(function (e, i) {
          var on = etapa === e[0], cfgE = regua[e[0]] || {};
          return h('div', { key: e[0], style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            h('div', { style: { display: 'flex', alignItems: 'center' } },
              h('span', { style: { width: 44, height: 44, borderRadius: 99, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12.5, flex: 'none', background: on ? ROXO : '#fff', color: on ? '#fff' : ROXO_ESC, border: on ? '0' : '1.5px solid #d8b4f0', boxShadow: on ? '0 0 0 4px #f3e8fb' : 'none' } }, e[1]),
              i < ET.length - 1 ? h('span', { className: 'hidden xl:block', style: { flex: 1, height: 2, background: '#e9d5f9', marginLeft: 8 } }) : null),
            h('div', { role: 'button', tabIndex: 0, onClick: function () { setEtapa(e[0]); }, onKeyDown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setEtapa(e[0]); } },
              style: { border: on ? '1.5px solid ' + ROXO : '1px solid #e5e7eb', background: on ? '#faf7fd' : '#fff', borderRadius: 12, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, flex: 1, opacity: cfgE.ativo === false ? 0.6 : 1 } },
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'space-between' } }, h('b', { style: { fontSize: 13.5 } }, e[2]), Toggle(cfgE.ativo !== false, function (v) { setEt(e[0], 'ativo', v); }, 'Ativar ' + e[2])),
              e[4] ? h('span', { style: { alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 700, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '0 6px' } }, 'NOVO') : null,
              h('span', { style: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.4 } }, e[3]),
              e[0] !== 'retomada' ? h('span', { style: { fontSize: 12.5, color: '#374151', display: 'inline-flex', gap: 6, alignItems: 'center' } }, ico('clock', 13), (cfgE.hora || '07:00') + ' · ', ico('message', 13), 'WhatsApp') : h('span', { style: { fontSize: 12.5, color: '#374151' } }, 'Após ' + (cfg.dias_retomada || 3) + ' dias de atraso')));
        }))),
      h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] items-start' },
        h(Card, null,
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } }, h('b', { style: { fontSize: 15 } }, etAtual[1] + ' · ' + etAtual[2]), Pill(atual.ativo === false ? 'Desligada' : 'Ativa', atual.ativo === false ? 'cinza' : 'verde')),
            etapa === 'retomada' ? Aviso('ambar', 'Sem mensagem própria', 'Ao atingir ' + (cfg.dias_retomada || 3) + ' dias de atraso, o contrato e a moto entram em retomada e o locatário recebe o aviso padrão. O número de dias fica em Juros e prazos.') :
            h(React.Fragment, null,
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3', style: { gap: 12 } },
                h(Field, { label: 'Horário de envio' }, Select({ value: atual.hora || '07:00', onChange: function (ev) { setEt(etapa, 'hora', ev.target.value); } }, horas.map(function (x) { return h('option', { key: x, value: x }, x); }))),
                h(Field, { label: 'Canal' }, Input({ readOnly: true, value: 'WhatsApp', style: { background: '#f9fafb' } })),
                h(Field, { label: 'Enviar para' }, Input({ readOnly: true, value: 'Todos os contratos ativos', style: { background: '#f9fafb' } }))),
              h(Field, { label: 'Mensagem' }, h('textarea', { ref: taRef, rows: 6, value: msg, onChange: function (ev) { setEt(etapa, 'mensagem', ev.target.value); }, className: INPUT_CLS, style: Object.assign({}, INPUT, { height: 'auto', padding: 12, lineHeight: 1.5, resize: 'vertical' }) })),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } }, h('span', { style: { fontSize: 12, color: '#6b7280' } }, 'Inserir variável:'),
                vars.map(function (v) { return h('button', { key: v, type: 'button', onClick: function () { inserir(v); }, style: { fontFamily: MONO, fontSize: 11.5, padding: '3px 8px', borderRadius: 6, background: '#faf7fd', border: '1px solid #e9d5f9', color: ROXO_ESC, cursor: 'pointer' } }, '{{' + v + '}}'); }))),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5, color: '#6b7280', background: '#f9fafb', borderRadius: 10, padding: '10px 12px' } }, ico('lock', 14, { marginTop: 2 }), h('span', null, 'Juros (' + String(cfg.juros_dia_pct != null ? cfg.juros_dia_pct : 2).replace('.', ',') + '% ao dia) e dias para retomada (' + (cfg.dias_retomada || 3) + ') ficam em ', h('b', null, 'Juros e prazos'), '. Mudanças valem só para contratos novos.')))),
        etapa === 'retomada' ? null : h('div', { style: { background: '#e7ded4', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 84 } },
          h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, fontWeight: 600, color: '#374151' } }, ico('message', 14, { color: '#16a34a' }), 'Prévia · como o locatário recebe'),
          h('div', { style: { background: '#fff', borderRadius: '4px 12px 12px 12px', padding: '10px 12px', fontSize: 13.5, color: '#111827', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', boxShadow: '0 1px 1px rgba(0,0,0,.08)' } },
            previa || local || h('span', { style: { color: '#9ca3af' } }, 'Escreva a mensagem ao lado.'),
            h('div', { style: { textAlign: 'right', fontSize: 10.5, color: '#9ca3af', marginTop: 4 } }, atual.hora || '07:00')),
          h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, previa ? 'Variáveis preenchidas com uma parcela real.' : 'Variáveis preenchidas com dados de exemplo.'))));
  }


  // ───────────────────────── Componente principal ─────────────────────────
  var ABAS = [['painel', 'Painel / Frota', 'chart'], ['precadastros', 'Pré-cadastros', 'users'], ['motos', 'Motos', 'bike'], ['contratos', 'Contratos', 'filetext'], ['vistorias', 'Vistorias', 'camera'], ['config', 'Configurações', 'settings']];
  var SUBTITULO = {
    painel: 'Do convite ao entregador até a quitação · pré-cadastro, contrato no Autentique e cobrança semanal automática',
    precadastros: 'Entregadores que preencheram o link de convite · revise documentos, defina tipo de cliente e dia de vencimento',
    motos: 'Cadastro da frota, fotos e laudos · status automático pelo contrato',
    contratos: 'Contratos Plano Conquista · assinatura, parcelas, atrasos e retomada',
    vistorias: 'Fotos da moto na retirada, nas revisões e na devolução',
    config: 'Juros, retomada, convites, modelo de contrato e termo LGPD'
  };

  window.ModuloLocacaoComponent = function (props) {
    var usuario = props.usuario, apiUrl = props.API_URL || window.API_URL;
    var HeaderCompacto = props.HeaderCompacto, Toast = props.Toast, LoadingOverlay = props.LoadingOverlay;
    var Ee = props.Ee, he = props.he, o = props.o;
    var toastFn = props.showToast || function (m) { try { console.log(m); } catch (e) { /* ok */ } };
    var fetchAuthFn = props.fetchAuth || window.fetchAuth;

    var _v = useState(function () {
      try { var s = sessionStorage.getItem('tutts_locacao_aba'); if (s && ABAS.some(function (a) { return a[0] === s; })) return { tela: 'lista', tab: s }; } catch (e) { /* ok */ }
      return { tela: 'lista', tab: 'painel' };
    }), view = _v[0], setView = _v[1];
    var _p = useState(null), painel = _p[0], setPainel = _p[1];
    var _pe = useState(null), painelErro = _pe[0], setPainelErro = _pe[1];
    var _cv = useState(false), convite = _cv[0], setConvite = _cv[1];

    var api = useCallback(function (path, opts) {
      opts = opts || {};
      var init = { method: opts.method || 'GET' };
      if (opts.body !== undefined && init.method !== 'GET') init.body = JSON.stringify(opts.body);
      var url = apiUrl + '/locacao-motos' + path;
      var p = fetchAuthFn ? fetchAuthFn(url, init) : fetch(url, Object.assign(init, { headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (props.getToken ? props.getToken() : '') }, credentials: 'include' }));
      return p.then(function (res) {
        if (opts.raw) { if (!res.ok) return res.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.error || j.erro || ('Erro ' + res.status)); }); return res; }
        return res.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : {}; } catch (e) { j = null; }
          if (!res.ok) throw new Error((j && (j.error || j.erro || j.message)) || ('Erro ' + res.status + ' ao falar com o servidor'));
          if (j == null) throw new Error('Resposta inválida do servidor');
          return j;
        });
      }, function () { throw new Error('Sem conexão com o servidor. Confira a internet e tente de novo.'); });
    }, [apiUrl, fetchAuthFn]);

    var carregarPainel = useCallback(function () {
      setPainelErro(null);
      api('/painel').then(setPainel).catch(function (e) { setPainelErro(e.message); });
    }, [api]);
    useEffect(carregarPainel, [carregarPainel]);

    var nav = useCallback(function (v) {
      setView(function (atual) {
        var n = Object.assign({}, v);
        if (n.tela === 'lista') { try { sessionStorage.setItem('tutts_locacao_aba', n.tab); } catch (e) { /* ok */ } }
        else n.de = atual.tela === 'lista' ? atual.tab : atual.de;
        return n;
      });
      try { window.scrollTo({ top: 0 }); } catch (e) { /* ok */ }
    }, []);

    var k = (painel && painel.kpis) || {};
    var abaAtiva = view.tela === 'lista' ? view.tab : ({ moto: 'motos', contrato: 'contratos', novoContrato: 'contratos' }[view.tela] || view.de || 'painel');
    var badge = { precadastros: k.precadastros_novos, vistorias: k.vistorias_pendentes };
    var comum = { api: api, toast: toastFn, nav: nav, aoMudar: carregarPainel, recarregarPainel: carregarPainel };

    var conteudo;
    if (view.tela === 'moto') conteudo = h(MotoDetalhe, Object.assign({ key: 'm' + (view.id || 'novo') + (view.secao || ''), id: view.id, de: view.de, secao: view.secao }, comum)); // LOCACAO_V2: secao
    else if (view.tela === 'contrato') conteudo = h(ContratoDetalhe, Object.assign({ key: 'c' + view.id, id: view.id, de: view.de }, comum));
    else if (view.tela === 'novoContrato') conteudo = h(NovoContratoView, Object.assign({ key: 'nc' + (view.cliente_id || ''), cliente_id: view.cliente_id }, comum));
    else if (view.tab === 'precadastros') conteudo = h(PrecadastrosView, Object.assign({ key: 'pc' + (view.sel || ''), selecionar: view.sel || null, abrirConvite: function () { setConvite(true); } }, comum)); // LOCACAO_V2: sel
    else if (view.tab === 'motos') conteudo = h(MotosView, comum);
    else if (view.tab === 'contratos') conteudo = h(ContratosView, comum);
    else if (view.tab === 'vistorias') conteudo = h(VistoriasView, comum);
    else if (view.tab === 'config') conteudo = h(ConfigView, comum);
    else conteudo = h(PainelView, Object.assign({ painel: painel, erro: painelErro, recarregar: carregarPainel }, comum));

    var emLista = view.tela === 'lista';
    var tituloPag = { painel: 'Locação de motos', precadastros: 'Pré-cadastros', motos: 'Motos', contratos: 'Contratos', vistorias: 'Vistorias', config: 'Configurações' }[view.tab];
    var botoesTopo = emLista && view.tab === 'painel' ? [
      Btn({ key: 'cv', icon: 'link', onClick: function () { setConvite(true); }, children: 'Gerar link de convite' }),
      Btn({ key: 'mo', icon: 'plus', onClick: function () { nav({ tela: 'moto', id: null }); }, children: 'Cadastrar moto' }),
      Btn({ key: 'nc', variant: 'pri', icon: 'plus', onClick: function () { nav({ tela: 'novoContrato' }); }, children: 'Novo contrato' })
    ] : emLista && view.tab === 'precadastros' ? [Btn({ key: 'cv', icon: 'link', onClick: function () { setConvite(true); }, children: 'Gerar link de convite' })]
      : emLista && view.tab === 'motos' ? [Btn({ key: 'mo', variant: 'pri', icon: 'plus', onClick: function () { nav({ tela: 'moto', id: null }); }, children: 'Cadastrar moto' })]
      : emLista && view.tab === 'contratos' ? [Btn({ key: 'nc', variant: 'pri', icon: 'plus', onClick: function () { nav({ tela: 'novoContrato' }); }, children: 'Novo contrato' })] : null;

    return h('div', { className: 'min-h-screen', style: { background: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif', color: '#111827' } },
      props.i ? h(Toast, props.i) : null,
      props.n && LoadingOverlay ? h(LoadingOverlay) : null,
      HeaderCompacto ? h(HeaderCompacto, { usuario: usuario, moduloAtivo: Ee, socialProfile: props.socialProfile, isLoading: props.f, lastUpdate: props.E, onRefresh: props.ul, onLogout: function () { o && o(null); }, onGoHome: function () { he && he('home'); }, onNavigate: props.navegarSidebar }) : null,
      h('div', { className: 'max-w-7xl mx-auto px-4 py-6 sm:px-6', style: { display: 'flex', flexDirection: 'column', gap: 18 } },
        emLista ? h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 } },
          h('div', { style: { minWidth: 0 } },
            h('h1', { style: { margin: 0, fontFamily: SORA, fontSize: 24, fontWeight: 700, lineHeight: 1.25 } }, tituloPag),
            h('p', { style: { margin: '4px 0 0', color: '#6b7280', fontSize: 13.5 } }, SUBTITULO[view.tab])),
          botoesTopo ? h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, botoesTopo) : null) : null,
        h('div', { role: 'tablist', 'aria-label': 'Seções da locação', style: { display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', overflowX: 'auto', order: emLista ? 0 : -1 } },
          ABAS.map(function (a) {
            var on = abaAtiva === a[0];
            var b = badge[a[0]];
            return h('button', { key: a[0], type: 'button', role: 'tab', 'aria-selected': on, onClick: function () { nav({ tela: 'lista', tab: a[0] }); },
              style: { padding: '11px 12px', marginBottom: -1, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontSize: 13.5, cursor: 'pointer', color: on ? ROXO_ESC : '#6b7280', fontWeight: on ? 600 : 500, borderBottom: '2px solid ' + (on ? ROXO : 'transparent') } },
              ico(a[2], 15), a[1],
              b ? h('span', { style: { background: a[0] === 'vistorias' ? '#fffbeb' : '#f3e8fb', color: a[0] === 'vistorias' ? '#92400e' : ROXO_ESC, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '1px 7px' } }, b) : null);
          })),
        conteudo),
      convite ? h(ConviteModal, { api: api, toast: toastFn, onClose: function () { setConvite(false); carregarPainel(); } }) : null);
  };
})();
