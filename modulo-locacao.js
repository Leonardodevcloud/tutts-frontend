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

  // LOCACAO_ASSINATURA_V1: links de assinatura do Autentique (locatário e Tutts), copiar e mandar no WhatsApp
  function LinksAssinatura(props) {
    var c = props.c, api = props.api, toast = props.toast;
    var st = useState(Array.isArray(c.autentique_links) ? c.autentique_links : []), links = st[0], setLinks = st[1];
    var stC = useState(false), carregando = stC[0], setCarregando = stC[1];
    var stE = useState(false), enviando = stE[0], setEnviando = stE[1];
    var buscar = function () {
      setCarregando(true);
      api('/contratos/' + c.id + '/links-assinatura').then(function (r) { setLinks((r && r.links) || []); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setCarregando(false); });
    };
    useEffect(function () { if (c.autentique_doc_id && !links.length) buscar(); }, [c.id, c.autentique_doc_id]);
    if (!c.autentique_doc_id) return null;
    var enviar = function () {
      setEnviando(true);
      api('/contratos/' + c.id + '/enviar-link-assinatura', { method: 'POST', body: {} })
        .then(function (r) { if (r && r.enviado) toast('Link enviado no WhatsApp do locatário', 'success'); else toast('WhatsApp não enviado' + (r && r.motivo ? ': ' + r.motivo : '') + '. Copie o link e mande você.', 'error'); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setEnviando(false); });
    };
    return h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 } },
      links.length ? links.map(function (l, i) {
        return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '6px 10px' } },
          h('span', { style: { fontWeight: 700, color: '#1e3a8a', minWidth: 76 } }, l.papel_label || 'Assinante'),
          h('span', { style: { color: '#374151', fontSize: 12.5 } }, l.nome || l.email || ''),
          l.assinado ? h('span', { style: { fontSize: 11.5, fontWeight: 600, color: '#166534', background: '#f0fdf4', borderRadius: 99, padding: '1px 8px' } }, 'Assinou') : null,
          h('a', { href: l.link, target: '_blank', rel: 'noopener', style: { color: ROXO, fontSize: 12.5, fontWeight: 600, marginLeft: 'auto', wordBreak: 'break-all' } }, l.link),
          Btn({ small: true, icon: 'copy', onClick: function () { copiar(l.link, toast); }, children: 'Copiar' }),
          l.papel === 'locatario' && !l.assinado ? Btn({ small: true, icon: 'message', disabled: enviando, onClick: enviar, children: enviando ? 'Enviando...' : 'Enviar no WhatsApp' }) : null);
      }) : h('div', { style: { fontSize: 12.5, color: '#1e40af' } }, carregando ? 'Buscando os links de assinatura...' : 'Links de assinatura ainda não disponíveis. ',
        carregando ? null : h('button', { type: 'button', onClick: buscar, style: { color: ROXO, fontWeight: 600, background: 'none', border: 0, cursor: 'pointer', padding: 0 } }, 'Buscar de novo')));
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
  var TOM_SIT = { aguardando_assinatura: 'azul', em_dia: 'verde', atrasada: 'ambar', em_retomada: 'vermelho', quitado: 'roxo', encerrado: 'cinza', recusado: 'vermelho', cancelado: 'cinzaClaro', suspenso: 'azul' }; // LOCACAO_V3: suspenso
  var TOM_PARC = { a_vencer: 'cinzaClaro', vence_hoje: 'azul', atrasada: 'vermelho', paga: 'verde', cancelada: 'cinzaClaro', suspensa: 'cinzaClaro' }; // LOCACAO_V3: suspensa
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
  function pillSit(c) { if (c.situacao === 'aguardando_assinatura' && c.etapa === 'vistoria') return Pill('Aguardando vistoria de entrega', 'ambar'); /* LOCACAO_FLUXO_V1 */ return Pill(c.situacao_label || c.situacao, TOM_SIT[c.situacao] || 'cinza'); }
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
    return h('label', { onMouseEnter: props.onMouseEnter, onMouseLeave: props.onMouseLeave, style: Object.assign({ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }, props.style || {}) },
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
              { td: 1, v: m.cliente_nome ? h('div', null, m.cliente_nome, h('div', { style: { marginTop: 3 } }, TagTipo(m.cliente_tipo))) : h('span', { style: { color: '#9ca3af' } }, '—') }, // LOCACAO_V4
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
          setConv(r.convite); carregar(); try { window.dispatchEvent(new Event('locacao:convites')); } catch (_) {} /* LOCACAO_CONVITES_LISTA_V1 */
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
      api('/convites/' + c.id + '/cancelar', { method: 'POST' }).then(function () { toast('Convite cancelado', 'success'); carregar(); try { window.dispatchEvent(new Event('locacao:convites')); } catch (_) {} }).catch(function (e) { toast(e.message, 'error'); });
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

  // ───────────────────────── LOCACAO_V4: Motoboy Tutts × Externo ─────────────────────────
  var TAG_TIPO = { tutts: ['Motoboy Tutts', '#f3e8fb', '#5d0b85'], externo: ['Externo', '#eff6ff', '#1e40af'], tutts_confirmar: ['Externo?', '#fffbeb', '#92400e'] };
  function tipoKey(t) { var s = String(t || '').toLowerCase(); if (s === 'tutts' || s.indexOf('motoboy') >= 0) return 'tutts'; if (s === 'tutts_confirmar' || s.indexOf('?') >= 0) return 'tutts_confirmar'; return s ? 'externo' : null; }
  function TagTipo(tipo, label) {
    var k = tipoKey(tipo); if (!k) return null;
    var t = TAG_TIPO[k];
    return h('span', { style: { display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', background: t[1], color: t[2] } }, label || t[0]);
  }
  var EST_CIVIL = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'];

  /* LOCACAO_VENC_MENSAL_V1: vencimento semanal (dia da semana) ou mensal (dia 1..28).
     props: per, dia (semana), diaMes, onPer, onDia, onDiaMes, grade (grade de dias no mensal), vazioSemana (texto da opção vazia) */
  function VencPicker(props) {
    var mensal = props.per === 'mensal';
    var dm = parseInt(props.diaMes, 10);
    var grade = props.grade ? h('div', { role: 'radiogroup', 'aria-label': 'Dia do mês', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 6 } },
      Array.from({ length: 28 }, function (_, i) {
        var n = i + 1, on = dm === n;
        return h('button', { key: n, type: 'button', role: 'radio', 'aria-checked': on, 'aria-label': 'Dia ' + n, onClick: function () { props.onDiaMes(String(n)); },
          style: Object.assign({ height: 36, borderRadius: 8, fontSize: 12.5, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }, on ? { border: '1.5px solid ' + ROXO, background: '#f3e8fb', color: ROXO_ESC, fontWeight: 700 } : { border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151' }) }, p2(n));
      })) : null;
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 } },
      Segmented([['semanal', 'Semanal'], ['mensal', 'Mensal']], mensal ? 'mensal' : 'semanal', props.onPer, 'Periodicidade do vencimento'),
      mensal
        ? (grade || Select({ value: props.diaMes || '', 'aria-label': 'Dia do mês', onChange: function (e) { props.onDiaMes(e.target.value); } }, [h('option', { key: '', value: '' }, 'Escolha o dia do mês')].concat(Array.from({ length: 28 }, function (_, i) { return h('option', { key: i + 1, value: String(i + 1) }, 'Todo dia ' + p2(i + 1)); }))))
        : Select({ value: props.dia || '', 'aria-label': 'Dia da semana', onChange: function (e) { props.onDia(e.target.value); } }, (props.vazioSemana ? [h('option', { key: '', value: '' }, props.vazioSemana)] : []).concat(DIA_VENC.map(function (o) { return h('option', { key: o[0], value: String(o[0]) }, o[1]); }))),
      mensal ? h('span', { style: { fontSize: 12, color: dm ? '#374151' : '#6b7280' } }, dm ? h('b', null, 'Todo dia ' + p2(dm) + ' de cada mês. ') : 'Escolha o dia. ', 'Do 1 ao 28 (todo mês tem esses dias).') : null);
  }

  /* LOCACAO_ACESSO_EXTERNO_V1: tipo do locatário (pode mudar) e como ele entra na Central */
  function LocatarioAcessoBox(props) {
    var api = props.api, toast = props.toast, ac = props.acesso || {};
    var _m = useState(false), mudando = _m[0], setMudando = _m[1];
    var _c = useState(props.codSugerido || ''), cod = _c[0], setCod = _c[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    var _r = useState(null), r = _r[0], setR = _r[1];
    var tutts = props.tipo === 'tutts';
    var mudar = function (tipo) {
      if (tipo === 'externo' && !window.confirm('Mudar ' + props.nome + ' para Externo?\n\nO login dele vira o CPF (com senha própria) e o desconto no repasse (Anexo III), se houver, é desligado.')) return;
      setS(true);
      api('/clientes/' + props.clienteId + '/tipo', { method: 'PUT', body: { tipo: tipo, cod_profissional: tipo === 'tutts' ? String(cod).trim() : null } })
        .then(function (x) { toast(x.sem_mudanca ? 'Nada mudou' : 'Agora é ' + (tipo === 'tutts' ? 'Motoboy Tutts · entra com o código ' + x.login : 'Externo · entra com o CPF') + (x.desconto_desligado ? ' · desconto no repasse desligado' : ''), 'success'); setMudando(false); props.aoMudar && props.aoMudar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setS(false); });
    };
    var enviarAcesso = function () {
      setS(true);
      api('/clientes/' + props.clienteId + '/acesso-portal', { method: 'POST', body: {} })
        .then(function (x) { setR(x); if (x.enviado) toast('Link de criar senha enviado no WhatsApp', 'success'); props.aoMudar && props.aoMudar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setS(false); });
    };
    var msg = r && r.link_senha ? 'Olá, ' + String(props.nome || '').split(' ')[0] + '! Crie sua senha da Central Tutts neste link (vale 48h): ' + r.link_senha + ' · Depois entre em ' + (r.link || '') + ' com seu CPF (só números) e a senha.' : '';
    var waDig = soDig(props.whatsapp); if (waDig && waDig.length <= 11) waDig = '55' + waDig;
    return h('div', { style: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
        h('b', { style: { fontSize: 13.5 } }, 'Locatário'), TagTipo(props.tipo),
        h('span', { style: { flex: 1 } }),
        !mudando ? Btn({ small: true, variant: 'link', disabled: s, onClick: function () { if (tutts) mudar('externo'); else setMudando(true); }, children: tutts ? 'Mudar para Externo' : 'Mudar para Motoboy Tutts' }) : null),
      h('div', { style: { fontSize: 12.5, color: '#374151', lineHeight: 1.5 } },
        'Entra na Central com ', h('b', null, tutts ? 'o código ' + (ac.login || '—') + ' e a senha de sempre' : 'o CPF ' + (ac.login || '') + ' (só números) e senha própria'),
        tutts ? '. A moto aparece no card “Minha moto”.' : h('span', { style: { color: ac.tem_senha ? '#166534' : '#92400e' } }, ac.tem_senha ? ' · senha já criada.' : ' · ainda não criou a senha.')),
      mudando ? h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: 10, padding: 10 } },
        h(Field, { label: 'Código do profissional na Central', req: true, style: { flex: '1 1 180px' } }, Input({ value: cod, inputMode: 'numeric', placeholder: 'Ex.: 4821', onChange: function (e) { setCod(e.target.value); } })),
        Btn({ variant: 'pri', small: true, disabled: s || !String(cod).trim(), onClick: function () { mudar('tutts'); }, children: s ? 'Salvando...' : 'Salvar' }),
        Btn({ small: true, onClick: function () { setMudando(false); }, children: 'Cancelar' }),
        h('div', { style: { flexBasis: '100%', fontSize: 11.5, color: '#6b7280' } }, 'Ele passa a entrar com o código e a senha que já usa na Central. O login com CPF deixa de mostrar a moto.')) : null,
      !tutts ? h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
        Btn({ small: true, icon: 'key', disabled: s, onClick: enviarAcesso, children: s ? 'Enviando...' : ac.tem_senha ? 'Enviar link de nova senha' : 'Enviar link para criar a senha' }),
        h('span', { style: { fontSize: 11.5, color: '#6b7280' } }, 'Vai no WhatsApp com o CPF e um código já preenchidos (vale 48h).')) : null,
      r && r.link_senha ? h('div', { style: { background: r.enviado ? '#f0fdf4' : '#fffbeb', border: '1px solid ' + (r.enviado ? '#bbf7d0' : '#fde68a'), borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 } },
        h('span', { style: { color: r.enviado ? '#166534' : '#92400e', fontWeight: 600 } }, r.enviado ? 'Enviado no WhatsApp. Se ele não recebeu, mande por aqui:' : 'O WhatsApp não enviou. Mande por aqui:'),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } }, Input({ readOnly: true, value: r.link_senha, onFocus: function (e) { e.target.select(); }, style: { fontFamily: MONO, fontSize: 12 }, 'aria-label': 'Link para criar a senha' }), h('span', { style: { fontSize: 12, whiteSpace: 'nowrap' } }, 'código ', h('b', { style: TAB }, r.codigo || '—'))),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          Btn({ small: true, icon: 'copy', onClick: function () { copiar(msg, toast); }, children: 'Copiar mensagem' }),
          Btn({ small: true, variant: 'verde', icon: 'message', onClick: function () { window.open('https://wa.me/' + (waDig || '') + '?text=' + encodeURIComponent(msg), '_blank', 'noopener'); }, children: 'Abrir no WhatsApp' }))) : null);
  }

  /* Busca o motoboy que já está na Central e cria o pré-cadastro com o cadastro dele */
  function CentralModal(props) {
    var api = props.api, toast = props.toast;
    var _q = useState(''), q = _q[0], setQ = _q[1];
    var _r = useState(null), res = _r[0], setRes = _r[1];
    var _b = useState(false), buscando = _b[0], setBuscando = _b[1];
    var _s = useState(null), sel = _s[0], setSel = _s[1];
    var _d = useState(null), det = _d[0], setDet = _d[1];
    var _de = useState(null), detErro = _de[0], setDetErro = _de[1];
    var _c = useState(''), cpf = _c[0], setCpf = _c[1];
    var _w = useState(''), wpp = _w[0], setWpp = _w[1];
    var _v = useState('1'), dia = _v[0], setDia = _v[1];
    var _vp = useState('semanal'), perV = _vp[0], setPerV = _vp[1]; /* LOCACAO_VENC_MENSAL_V1 */
    var _vm = useState(''), diaMes = _vm[0], setDiaMes = _vm[1];
    var _sv = useState(false), salvando = _sv[0], setSalvando = _sv[1];
    var _ok = useState(null), feito = _ok[0], setFeito = _ok[1];
    var qd = useDebounce(q.trim(), 300);
    useEffect(function () {
      if (qd.length < 2) { setRes(null); return; }
      var vivo = true; setBuscando(true);
      api('/central/motoboys?q=' + encodeURIComponent(qd)).then(function (r) { if (!vivo) return; setRes(r.motoboys || []); if (!sel && r.motoboys && r.motoboys.length === 1) setSel(r.motoboys[0].cod_profissional); })
        .catch(function (e) { if (vivo) { setRes([]); toast(e.message, 'error'); } }).then(function () { if (vivo) setBuscando(false); });
      return function () { vivo = false; };
    }, [qd]);
    useEffect(function () {
      if (!sel) { setDet(null); return; }
      setDet(null); setDetErro(null); setCpf(''); setWpp(''); setFeito(null);
      api('/central/motoboys/' + encodeURIComponent(sel)).then(setDet).catch(function (e) { setDetErro(e.message); });
    }, [sel]);
    var criar = function (modo) {
      if (det && !det.tem_cpf && soDig(cpf).length !== 11) { toast('Informe o CPF do motoboy (11 dígitos)', 'error'); return; }
      if (perV === 'mensal' && !diaMes) { toast('Escolha o dia do mês do vencimento', 'error'); return; } /* LOCACAO_VENC_MENSAL_V1 */
      setSalvando(true);
      api('/central/motoboys/' + encodeURIComponent(det.cod_profissional) + '/precadastro', { method: 'POST', body: { modo: modo, periodicidade: perV, dia_mes: perV === 'mensal' ? Number(diaMes) : null, dia_vencimento: perV === 'mensal' ? null : (Number(dia) || null), cpf: det.tem_cpf ? undefined : soDig(cpf), whatsapp: soDig(wpp) || undefined } })
        .then(function (r) {
          if (modo === 'manual') { toast('Pré-cadastro criado. Complete os dados.', 'success'); props.onCriado(r.precadastro_id, 'manual'); return; }
          if (r.whatsapp && r.whatsapp.enviado) { toast('Link de complemento enviado no WhatsApp', 'success'); props.onCriado(r.precadastro_id, 'link'); return; }
          setFeito(r); toast('Pré-cadastro criado · envie o link ao motoboy', 'success');
        })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalvando(false); });
    };
    var waLink = function (url) { var d = soDig(wpp || (det && det.whatsapp)); if (d && d.length <= 11) d = '55' + d; return 'https://wa.me/' + (d || '') + '?text=' + encodeURIComponent('Olá, ' + String((det && det.nome) || '').split(' ')[0] + '! Para fazer o contrato da moto, complete só a CNH, o RG e o endereço neste link: ' + url); };
    var item = function (m) {
      var on = sel === m.cod_profissional;
      var tom = m.situacao === 'disponivel' ? ['#f0fdf4', '#166534'] : m.situacao === 'em_cadastro' ? ['#fffbeb', '#92400e'] : ['#f3f4f6', '#6b7280'];
      return h('button', { key: m.cod_profissional, type: 'button', onClick: function () { setSel(m.cod_profissional); }, 'aria-pressed': on,
        style: { textAlign: 'left', display: 'flex', gap: 10, alignItems: 'center', padding: 10, borderRadius: 12, width: '100%', cursor: 'pointer', border: on ? '1.5px solid ' + ROXO : '1px solid #e5e7eb', background: on ? '#faf7fd' : '#ffffff' } },
        h('span', { style: { width: 36, height: 36, borderRadius: 99, background: '#f3e8fb', color: ROXO_ESC, fontWeight: 700, fontSize: 12.5, display: 'grid', placeItems: 'center', flex: 'none' } }, iniciais(m.nome)),
        h('span', { style: { flex: 1, minWidth: 0 } },
          h('span', { style: { display: 'block', fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, m.nome),
          h('span', { style: { display: 'block', fontSize: 11.5, color: '#6b7280' } }, 'Cód. ' + m.cod_profissional + ' · ' + (m.cpf_mascarado ? 'CPF ' + m.cpf_mascarado : 'sem CPF no financeiro'))),
        h('span', { style: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap', background: tom[0], color: tom[1] } }, m.situacao_label || m.situacao));
    };
    var detalhe;
    if (!sel) detalhe = Vazio('Busque o motoboy', 'Por nome, código ou CPF. Ele usa o mesmo login de sempre na Central.');
    else if (detErro) detalhe = Erro(detErro);
    else if (!det) detalhe = Spinner('Abrindo cadastro na Central...');
    else if (feito) detalhe = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      Aviso('azul', 'Pré-cadastro criado', 'O WhatsApp não saiu automaticamente' + (feito.whatsapp && feito.whatsapp.motivo ? ' (' + feito.whatsapp.motivo + ')' : '') + '. Copie o link ou abra o WhatsApp para enviar.'),
      h('div', { style: { display: 'flex', gap: 8 } }, Input({ readOnly: true, value: feito.url || '', onFocus: function (e) { e.target.select(); }, style: { fontFamily: MONO, fontSize: 12.5 }, 'aria-label': 'Link de complemento' }), Btn({ icon: 'copy', onClick: function () { copiar(feito.url, toast); }, children: 'Copiar' })),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        Btn({ variant: 'verde', icon: 'message', onClick: function () { window.open(waLink(feito.url), '_blank', 'noopener'); }, children: 'Enviar no WhatsApp' }),
        Btn({ onClick: function () { props.onCriado(feito.precadastro_id, 'link'); }, children: 'Abrir pré-cadastro' })));
    else {
      var bloqueado = det.situacao === 'ja_tem_moto' || det.situacao === 'em_cadastro' || det.situacao === 'aprovado';
      detalhe = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
          det.foto_thumb ? h('img', { src: det.foto_thumb, alt: '', style: { width: 52, height: 52, borderRadius: 99, objectFit: 'cover', flex: 'none' } })
            : h('span', { style: { width: 52, height: 52, borderRadius: 99, background: '#e9d5f9', color: ROXO_ESC, fontWeight: 800, fontSize: 18, display: 'grid', placeItems: 'center', flex: 'none' } }, iniciais(det.nome)),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontFamily: SORA, fontSize: 17, fontWeight: 700 } }, det.nome),
            h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Código ' + det.cod_profissional + ' · ' + (det.situacao_label || '') + (det.cadastrado_em ? ' · na Central desde ' + fD(det.cadastrado_em) : ''))),
          TagTipo('tutts')),
        det.situacao === 'ja_tem_moto' ? Aviso('cinza', 'Este motoboy já tem moto em contrato', 'Não dá para abrir outro pré-cadastro enquanto o contrato atual estiver em andamento.') : null,
        det.situacao === 'em_cadastro' ? Aviso('ambar', 'Já existe um pré-cadastro aberto', null) : null,
        det.situacao === 'aprovado' ? Aviso('verde', 'Já aprovado na locação', 'Falta só criar o contrato.') : null,
        h('div', { style: { border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' } },
          h('div', { style: { padding: '8px 12px', background: '#f0fdf4', color: '#166534', fontSize: 12, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' } }, ico('check', 14), 'Já temos na Central'),
          h('div', { style: { padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px 16px' } }, (det.tem || []).map(function (x) {
            return h('div', { key: x.k, style: { flex: '1 1 45%', minWidth: 160 } }, h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, x.k), h('div', { style: { fontSize: 13, fontWeight: 500 } }, x.v));
          }))),
        !bloqueado ? h('div', { style: { border: '1px solid #fde68a', borderRadius: 12, overflow: 'hidden' } },
          h('div', { style: { padding: '8px 12px', background: '#fffbeb', color: '#92400e', fontSize: 12, fontWeight: 600 } }, 'Falta para o contrato · ele completa por um link curto'),
          h('div', { style: { padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 } }, (det.falta || []).map(function (f) {
            return h('span', { key: f, style: { fontSize: 12, padding: '4px 10px', borderRadius: 99, background: '#ffffff', border: '1px solid #fde68a', color: '#92400e' } }, f);
          }))) : null,
        !bloqueado ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12 } },
          !det.tem_cpf ? h(Field, { label: 'CPF', req: true, hint: 'Não há CPF nos dados financeiros', style: { flex: '1 1 180px' } }, Input({ value: cpf, inputMode: 'numeric', placeholder: '000.000.000-00', onChange: function (e) { setCpf(e.target.value); } })) : null,
          !det.whatsapp ? h(Field, { label: 'WhatsApp', req: true, hint: 'Sem WhatsApp na Central', style: { flex: '1 1 180px' } }, Input({ value: wpp, inputMode: 'tel', placeholder: '(71) 98123-4567', onChange: function (e) { setWpp(e.target.value); } })) : null,
          h('div', { role: 'group', 'aria-label': 'Vencimento das parcelas', style: { flex: '1 1 100%', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 } }, /* LOCACAO_VENC_MENSAL_V1 */
            h('span', { style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, 'Vencimento das parcelas'),
            h(VencPicker, { per: perV, dia: dia, diaMes: diaMes, grade: true, onPer: setPerV, onDia: setDia, onDiaMes: setDiaMes }),
            h('span', { style: { fontSize: 11.5, color: '#6b7280' } }, 'Desconto no repasse fica opcional (Anexo III), definido no contrato. No contrato dá para trocar.'))) : null,
        det.repasse_medio && det.repasse_medio.valor > 0 ? h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Repasse médio das últimas 4 semanas: ', h('b', { style: { color: '#111827' } }, fR(det.repasse_medio.valor)), ' por semana') : null,
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 12 } },
          det.situacao === 'em_cadastro' && det.precadastro_id ? Btn({ variant: 'pri', onClick: function () { props.onCriado(det.precadastro_id, 'abrir'); }, children: 'Abrir pré-cadastro' }) : null,
          det.situacao === 'aprovado' && det.cliente_id ? Btn({ variant: 'pri', icon: 'filetext', onClick: function () { props.onNovoContrato(det.cliente_id); }, children: 'Criar contrato' }) : null,
          !bloqueado ? Btn({ icon: 'pencil', disabled: salvando, onClick: function () { criar('manual'); }, children: 'Preencher eu mesmo' }) : null,
          h('div', { style: { flex: 1 } }),
          !bloqueado ? Btn({ variant: 'pri', icon: 'message', disabled: salvando, onClick: function () { criar('link'); }, children: salvando ? 'Salvando...' : 'Enviar link de complemento no WhatsApp' }) : null));
    }
    return h(Modal, { titulo: 'Motoboy da Central', onClose: props.onClose, largura: 920 },
      h('p', { style: { margin: '0 0 14px', fontSize: 13, color: '#6b7280' } }, 'Ele usa o mesmo login de sempre. A parte da moto aparece no app dele depois do contrato.'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' } },
        h('div', { style: { flex: '1 1 300px', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 8 } },
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 10px', border: '1.5px solid ' + ROXO, borderRadius: 10, color: '#6b7280' } },
            ico('search', 15),
            h('input', { type: 'search', autoFocus: true, 'aria-label': 'Buscar motoboy', placeholder: 'Nome, código ou CPF', value: q, onChange: function (e) { setQ(e.target.value); }, style: { border: 0, outline: 0, flex: 1, minWidth: 0, font: 'inherit', fontSize: 13.5, background: 'transparent', color: '#111827' } })),
          h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, q.trim().length < 2 ? 'Digite pelo menos 2 letras' : buscando ? 'Buscando...' : (res ? res.length : 0) + ' resultado' + (res && res.length === 1 ? '' : 's')),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 440, overflowY: 'auto' } }, (res || []).map(item)),
          res && !res.length && !buscando ? h('div', { style: { fontSize: 12.5, color: '#9ca3af', padding: '6px 2px' } }, 'Nenhum motoboy com esse nome ou código. Pessoa de fora? Use o link de convite.') : null),
        h('div', { style: { flex: '2 1 420px', minWidth: 0 } }, detalhe)));
  }

  /* Equipe edita/completa os dados do pré-cadastro (motoboy da Central ou qualquer pré-cadastro aberto) */
  function EditarPrecadastroModal(props) {
    var api = props.api, toast = props.toast, p = props.p;
    var origCentral = p.origem === 'central';
    var ini = {};
    ['nome', 'whatsapp', 'email', 'nacionalidade', 'estado_civil', 'profissao', 'rg', 'rg_orgao', 'cnh_numero', 'cnh_categoria', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'].forEach(function (k) { ini[k] = p[k] == null ? '' : String(p[k]); });
    if (ini.whatsapp) ini.whatsapp = fTel(ini.whatsapp);
    ini.cnh_validade = p.cnh_validade ? String(p.cnh_validade).slice(0, 10) : '';
    ini.data_nascimento = p.data_nascimento ? String(p.data_nascimento).slice(0, 10) : '';
    ini.cnh_ear = typeof p.cnh_ear === 'boolean' ? p.cnh_ear : null;
    ini.dia_vencimento = p.dia_vencimento ? String(p.dia_vencimento) : '';
    ini.venc_periodicidade = p.venc_periodicidade === 'mensal' ? 'mensal' : 'semanal'; /* LOCACAO_VENC_MENSAL_V1 */
    ini.venc_dia_mes = p.venc_dia_mes ? String(p.venc_dia_mes) : '';
    if (!ini.nacionalidade) ini.nacionalidade = 'Brasileira';
    var _f = useState(ini), f = _f[0], setF = _f[1];
    var _d = useState({}), novos = _d[0], setNovos = _d[1];
    var _s = useState(false), salvando = _s[0], setSalvando = _s[1];
    var set = function (k, v) { setF(function (x) { var n = Object.assign({}, x); n[k] = v; return n; }); };
    useEffect(function () {
      var c = soDig(f.cep); if (c.length !== 8) return;
      var vivo = true;
      fetch('https://viacep.com.br/ws/' + c + '/json/').then(function (r) { return r.json(); }).then(function (j) {
        if (!vivo || !j || j.erro) return;
        setF(function (x) { return Object.assign({}, x, { logradouro: x.logradouro || j.logradouro || '', bairro: x.bairro || j.bairro || '', cidade: x.cidade || j.localidade || '', uf: x.uf || j.uf || '' }); });
      }).catch(function () {});
      return function () { vivo = false; };
    }, [f.cep]);
    var temDoc = props.docsPorTipo || {};
    var pegar = function (tipo, file) { lerArquivo(file, 1600, 0.82).then(function (u) { setNovos(function (x) { var n = Object.assign({}, x); n[tipo] = u; return n; }); }).catch(function (e) { toast(e.message, 'error'); }); };
    var salvar = function () {
      setSalvando(true);
      var dados = Object.assign({}, f, { cep: soDig(f.cep) || null, uf: String(f.uf || '').toUpperCase(), cnh_validade: f.cnh_validade || null, data_nascimento: f.data_nascimento || null, dia_vencimento: f.venc_periodicidade !== 'mensal' && f.dia_vencimento ? Number(f.dia_vencimento) : null, whatsapp: soDig(f.whatsapp) || null,
        venc_periodicidade: f.venc_periodicidade, venc_dia_mes: f.venc_periodicidade === 'mensal' && f.venc_dia_mes ? Number(f.venc_dia_mes) : null }); /* LOCACAO_VENC_MENSAL_V1 */
      if (origCentral) delete dados.nome;
      Object.keys(dados).forEach(function (k) { if (dados[k] === '') dados[k] = null; });
      if (dados.cnh_ear == null) delete dados.cnh_ear;
      var documentos = Object.keys(novos).map(function (t) { return { tipo: t, foto: novos[t] }; });
      api('/precadastros/' + p.id, { method: 'PUT', body: { dados: dados, documentos: documentos.length ? documentos : undefined } })
        .then(function (r) {
          var falt = (r.faltam || []).map(function (x) { return x.label; });
          toast(falt.length ? 'Dados salvos · ainda falta: ' + falt.join(', ') : 'Dados salvos · pronto para aprovar', 'success');
          props.onSalvo && props.onSalvo();
        }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalvando(false); });
    };
    var cel = function (label, k, extra) { extra = extra || {}; return h(Field, { key: k, label: label, opt: extra.opt, hint: extra.hint, style: { flex: extra.flex || '1 1 200px' } }, Input(Object.assign({ value: f[k] == null ? '' : f[k], onChange: function (e) { set(k, extra.mask ? extra.mask(e.target.value) : e.target.value); } }, extra.attrs || {}))); };
    var linha = function () { return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12 } }, Array.prototype.slice.call(arguments)); };
    var sec = function (t) { return h('div', { style: { fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '.04em', marginTop: 4 } }, t); };
    return h(Modal, { titulo: 'Dados de ' + String(p.nome || '').split(' ')[0], onClose: props.onClose, largura: 760,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }), Btn({ key: 's', variant: 'pri', icon: 'save', disabled: salvando, onClick: salvar, children: salvando ? 'Salvando...' : 'Salvar dados' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        origCentral ? Aviso('roxo', 'Veio da Central · cód. ' + (p.cod_profissional || '—'), 'Nome e CPF vêm do cadastro de entregador e não mudam aqui.') : null,
        sec('Pessoal'),
        linha(origCentral ? h(Field, { key: 'n', label: 'Nome', style: { flex: '2 1 260px' } }, Input({ value: p.nome || '', readOnly: true, style: { background: '#f9fafb' } })) : cel('Nome completo', 'nome', { flex: '2 1 260px' }),
          h(Field, { key: 'cpf', label: 'CPF', style: { flex: '1 1 160px' } }, Input({ value: p.cpf || '', readOnly: true, style: { background: '#f9fafb' } }))),
        linha(cel('WhatsApp', 'whatsapp', { attrs: { inputMode: 'tel' } }), cel('E-mail', 'email', { opt: true, attrs: { type: 'email' } }), cel('Nascimento', 'data_nascimento', { opt: true, attrs: { type: 'date' } })),
        linha(cel('RG', 'rg'), cel('Órgão', 'rg_orgao', { opt: true, flex: '0 1 120px', attrs: { placeholder: 'SSP/BA' } }),
          h(Field, { key: 'ec', label: 'Estado civil', style: { flex: '1 1 160px' } }, Select({ value: f.estado_civil, onChange: function (e) { set('estado_civil', e.target.value); } }, [h('option', { key: '', value: '' }, 'Escolha')].concat(EST_CIVIL.map(function (o) { return h('option', { key: o, value: o }, o); }))))),
        linha(cel('Nacionalidade', 'nacionalidade'), cel('Profissão', 'profissao'),
          h(Field, { key: 'dv', label: 'Vencimento', opt: true, style: { flex: '1 1 220px' } }, h(VencPicker, { per: f.venc_periodicidade, dia: f.dia_vencimento, diaMes: f.venc_dia_mes, vazioSemana: 'Definir na aprovação', /* LOCACAO_VENC_MENSAL_V1 */
            onPer: function (v) { set('venc_periodicidade', v); }, onDia: function (v) { set('dia_vencimento', v); }, onDiaMes: function (v) { set('venc_dia_mes', v); } }))),
        sec('Habilitação'),
        linha(cel('Nº da CNH', 'cnh_numero', { attrs: { inputMode: 'numeric' }, mask: function (v) { return soDig(v).slice(0, 11); } }),
          h(Field, { key: 'cat', label: 'Categoria', style: { flex: '0 1 120px' } }, Select({ value: f.cnh_categoria, onChange: function (e) { set('cnh_categoria', e.target.value); } }, ['', 'A', 'AB', 'AC', 'AD', 'AE'].map(function (o) { return h('option', { key: o, value: o }, o || 'Escolha'); }))),
          cel('Validade', 'cnh_validade', { attrs: { type: 'date' } }),
          h(Field, { key: 'ear', label: 'EAR na CNH', style: { flex: '0 1 160px' } }, Segmented([[true, 'Sim'], [false, 'Não']], f.cnh_ear, function (v) { set('cnh_ear', v); }, 'EAR'))),
        sec('Endereço'),
        linha(cel('CEP', 'cep', { flex: '0 1 140px', attrs: { inputMode: 'numeric' } }), cel('Rua', 'logradouro', { flex: '2 1 260px' }), cel('Número', 'numero', { flex: '0 1 100px' })),
        linha(cel('Complemento', 'complemento', { opt: true }), cel('Bairro', 'bairro'), cel('Cidade', 'cidade'), cel('UF', 'uf', { flex: '0 1 70px', mask: function (v) { return v.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase(); } })),
        sec('Documentos'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10 } }, Object.keys(DOCS).map(function (t) {
          var ok = novos[t] || temDoc[t];
          return h('label', { key: t, style: { flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center', height: 92, borderRadius: 12, cursor: 'pointer', textAlign: 'center', fontSize: 12.5, fontWeight: 600, padding: 8,
            border: ok ? '1px solid #bbf7d0' : '1.5px dashed #d8b4f0', background: ok ? '#f0fdf4' : '#faf7fd', color: ok ? '#166534' : ROXO_ESC } },
            h('input', { type: 'file', className: 'sr-only', accept: t === 'comprovante' ? 'image/*,application/pdf' : 'image/*', capture: t === 'selfie_cnh' ? 'user' : undefined, onChange: function (e) { var fl = e.target.files && e.target.files[0]; e.target.value = ''; if (fl) pegar(t, fl); } }),
            ico(ok ? 'check' : 'upload', 18), DOCS[t] + (novos[t] ? ' · nova' : temDoc[t] ? ' · enviada' : ''), t === 'selfie_cnh' ? h('span', { style: { fontWeight: 400, color: '#6b7280', fontSize: 11 } }, 'CNH ao lado do rosto') : null); // LOCACAO_FLUXO_V1: obrigatória
        }))));
  }

  // ───────────────────────── Pré-cadastros ─────────────────────────
  function PrecadastrosView(props) {
    var api = props.api, toast = props.toast, nav = props.nav;
    var _f = useState('todos'), filtro = _f[0], setFiltro = _f[1];
    var _l = useState(null), dados = _l[0], setDados = _l[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _s = useState(props.selecionar || null), sel = _s[0], setSel = _s[1];
    var _o = useState('todas'), orig = _o[0], setOrig = _o[1]; // LOCACAO_V4: origem
    var _xp = useState(null), excluirPre = _xp[0], setExcluirPre = _xp[1]; // LOCACAO_PRECAD_EXCLUIR_V1
    var _cv = useState([]), convites = _cv[0], setConvites = _cv[1]; /* LOCACAO_CONVITES_LISTA_V1: links enviados que ainda não viraram pré-cadastro */
    var carregarConvites = useCallback(function () { api('/convites').then(function (r) { setConvites(r.convites || []); }).catch(function () {}); }, [api]);
    useEffect(function () {
      carregarConvites();
      var f = function () { carregarConvites(); };
      window.addEventListener('locacao:convites', f);
      return function () { window.removeEventListener('locacao:convites', f); };
    }, [carregarConvites]);
    var _bs = useState(null), base = _bs[0], setBase = _bs[1]; // LOCACAO_REMODEL_V1: clientes aprovados + contratos
    var carregar = useCallback(function () {
      setErro(null);
      Promise.all([api('/clientes').catch(function () { return { clientes: [] }; }), api('/contratos').catch(function () { return { contratos: [] }; })])
        .then(function (r) { setBase({ clientes: r[0].clientes || [], contratos: r[1].contratos || [] }); });
      api('/precadastros').then(function (r) {
        setDados(r);
        var l = r.precadastros || [];
        setSel(function (atual) {
          if (atual) return atual;
          var prim = l.find(function (p) { return p.status === 'novo' || p.status === 'em_analise'; });
          return prim ? prim.id : null;
        });
      }).catch(function (e) { setErro(e.message); });
    }, [api]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!dados || !base) return Spinner('Carregando cadastros...');
    var lista = dados.precadastros || [];
    var fin = { aprovado: 1, contrato_criado: 1, reprovado: 1 };
    var cnt = function (fn) { return lista.filter(fn).length; };
    var tipoDe = function (p) { return p.tipo_sugerido || (p.entregador_tutts ? 'tutts_confirmar' : 'externo'); };
    var abertos = convites.filter(function (c) { return c.status === 'aberto'; }); /* LOCACAO_CONVITES_LISTA_V1 */
    var cancelarConv = function (c) {
      if (!window.confirm('Cancelar o link de ' + (c.nome_ref || 'convite sem nome') + '? Ele para de funcionar.')) return;
      api('/convites/' + c.id + '/cancelar', { method: 'POST' }).then(function () { toast('Link cancelado', 'success'); carregarConvites(); }).catch(function (e) { toast(e.message, 'error'); });
    };
    var waConv = function (c) {
      var d = soDig(c.whatsapp); if (d && d.length <= 11) d = '55' + d;
      var msg = 'Olá' + (c.nome_ref ? ', ' + String(c.nome_ref).split(' ')[0] : '') + '! Para pedir a locação da moto Tutts, preencha seu cadastro neste link (uso único): ' + c.url;
      window.open('https://wa.me/' + (d || '') + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    };
    var secaoLinks = abertos.length && (filtro === 'todos' || filtro === 'links') && orig !== 'tutts' ? h('div', { style: { borderBottom: filtro === 'links' ? 0 : '1px solid #f3f4f6' } },
      h('div', { style: { padding: '10px 16px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
        h('span', { style: { color: '#1d4ed8', display: 'inline-flex' } }, ico('link', 15)),
        h('b', { style: { fontSize: 13 } }, 'Link enviado · aguardando preencher'),
        h('span', { style: { fontSize: 12, color: '#6b7280' } }, 'Aparecem como pré-cadastro quando a pessoa enviar o formulário')),
      abertos.map(function (c) {
        var dias = Math.ceil((new Date(c.expira_em) - new Date()) / 86400000);
        return h('div', { key: 'cv' + c.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap' } },
          h('div', { style: { flex: '1 1 200px', minWidth: 0 } },
            h('div', { style: { fontWeight: 600, fontSize: 13.5 } }, c.nome_ref || 'Sem nome'),
            h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, [c.whatsapp ? fTel(c.whatsapp) : null, 'gerado ' + fDC(c.criado_em) + (c.criado_por_nome ? ' por ' + c.criado_por_nome : ''), 'expira ' + fDC(c.expira_em) + (dias <= 2 ? ' (' + (dias <= 0 ? 'hoje' : dias === 1 ? 'amanhã' : 'em 2 dias') + ')' : '')].filter(Boolean).join(' · '))),
          Btn({ variant: 'link', small: true, onClick: function () { copiar(c.url, toast); }, children: 'Copiar' }),
          Btn({ variant: 'link', small: true, onClick: function () { waConv(c); }, children: 'WhatsApp' }),
          Btn({ variant: 'link', small: true, style: { color: '#991b1b' }, onClick: function () { cancelarConv(c); }, children: 'Cancelar' }),
          Pill('Aguardando', 'azul', true));
      })) : null;
    /* LOCACAO_REMODEL_V1: uma linha por pessoa — pré-cadastro em revisão ou cliente aprovado (com ou sem contrato) */
    var VIVOS = { aguardando_assinatura: 1, ativo: 1, em_retomada: 1, suspenso: 1 };
    var kPorCli = {};
    base.contratos.forEach(function (k) { if (k.cliente_id && k.status !== 'cancelado' && k.status !== 'recusado') (kPorCli[k.cliente_id] = kPorCli[k.cliente_id] || []).push(k); });
    var preDeCli = {};
    base.clientes.forEach(function (c) { if (c.precadastro_id) preDeCli[c.precadastro_id] = c; });
    var pessoas = [];
    base.clientes.forEach(function (c) {
      var ks = kPorCli[c.id] || [];
      var atual = ks.find(function (k) { return VIVOS[k.status]; }) || null;
      var tipoR = atual ? 'contrato' : ks.length ? 'ex' : 'aprovado';
      pessoas.push({ chave: 'c' + c.id, tipoR: tipoR, nome: c.nome, tipo: c.tipo, sub: (c.cod_profissional && c.tipo === 'tutts' ? 'cód. ' + c.cod_profissional : 'CPF ' + c.cpf_mascarado) + (c.whatsapp ? ' · ' + fTel(c.whatsapp) : ''),
        cliente: c, contrato: atual || ks[0] || null, pre: null, quando: c.criado_em });
    });
    lista.forEach(function (p) {
      if (preDeCli[p.id]) return; // já virou cliente: a linha é a do cliente
      if ((p.status === 'aprovado' || p.status === 'contrato_criado') && p.status_label === 'Locatário excluído') return;
      pessoas.push({ chave: 'p' + p.id, tipoR: p.status === 'reprovado' ? 'reprovado' : 'pre', nome: p.nome, tipo: tipoDe(p), pre: p, cliente: null, contrato: null, quando: p.criado_em,
        sub: p.origem === 'central' ? 'da Central · cód. ' + (p.cod_profissional || '—') : [p.cpf_mascarado ? 'CPF ' + p.cpf_mascarado : null, p.whatsapp ? fTel(p.whatsapp) : null].filter(Boolean).join(' · ') });
    });
    var ORD = { pre: 0, aprovado: 1, contrato: 2, ex: 3, reprovado: 4 };
    pessoas.sort(function (a, b) { return ORD[a.tipoR] - ORD[b.tipoR] || String(b.quando || '').localeCompare(String(a.quando || '')); });
    var deOrigem = function (x) { return orig === 'todas' || (orig === 'tutts' ? x.tipo === 'tutts' : x.tipo !== 'tutts'); };
    var FIL = { todos: function () { return true; }, revisar: function (x) { return x.tipoR === 'pre'; }, aprovados: function (x) { return x.tipoR === 'aprovado'; },
      contrato: function (x) { return x.tipoR === 'contrato'; }, ex: function (x) { return x.tipoR === 'ex'; }, reprovados: function (x) { return x.tipoR === 'reprovado'; }, links: function () { return false; } };
    if (!FIL[filtro]) filtro = 'todos';
    var cntP = function (id) { return pessoas.filter(function (x) { return deOrigem(x) && FIL[id](x); }).length; };
    var filtrada = pessoas.filter(function (x) { return deOrigem(x) && FIL[filtro](x); });
    var aguardAss = pessoas.filter(function (x) { return x.tipoR === 'contrato' && x.contrato.status === 'aguardando_assinatura'; }).length;
    var docsPend = pessoas.filter(function (x) { return x.pre && x.pre.status === 'aguardando_documentos'; }).length;
    var barras = function (n, cor) { return h('span', { 'aria-hidden': 'true', style: { display: 'inline-flex', gap: 3, flex: 'none' } }, [0, 1, 2].map(function (i) { return h('span', { key: i, style: { width: 22, height: 4, borderRadius: 99, background: i < n ? cor : '#e5e7eb' } }); })); };
    var etapaDe = function (x) {
      if (x.tipoR === 'pre') {
        var p = x.pre, falt = p.faltam || [];
        var bloq = (p.alertas || []).filter(function (a) { return a.nivel === 'bloqueia'; }).length;
        var txt = (p.status_label || ROT_PRE[p.status] || p.status) + (falt.length ? ' · faltam ' + falt.length + ' ite' + (falt.length > 1 ? 'ns' : 'm') : bloq ? ' · ' + bloq + ' bloqueio' + (bloq > 1 ? 's' : '') : '');
        return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, barras(1, ROXO), h('span', { style: { fontSize: 12.5, fontWeight: 600, color: falt.length || bloq ? '#92400e' : '#374151' } }, txt));
      }
      if (x.tipoR === 'reprovado') return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, barras(1, '#dc2626'), h('span', { style: { fontSize: 12.5, fontWeight: 600, color: '#991b1b' } }, 'Reprovado'));
      if (x.tipoR === 'aprovado') return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, barras(2, ROXO), h('span', { style: { fontSize: 12.5, fontWeight: 600, color: '#166534' } }, 'Aprovado · sem contrato'));
      if (x.tipoR === 'ex') return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, barras(3, '#9ca3af'), h('span', { style: { fontSize: 12.5, fontWeight: 600, color: '#6b7280' } }, 'Ex-locatário · ' + String(x.contrato.situacao_label || x.contrato.status).toLowerCase()));
      var k = x.contrato;
      return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, barras(3, k.status === 'aguardando_assinatura' ? '#a855f7' : ROXO), h('span', { style: { fontSize: 12.5, fontWeight: 600, color: k.status === 'aguardando_assinatura' ? '#1e40af' : '#374151' } }, k.status === 'aguardando_assinatura' ? 'Contrato · aguardando assinatura' : 'Contrato ativo'));
    };
    var abrir = function (x) {
      if (x.pre) return setSel(x.pre.id);
      if (x.contrato) return nav({ tela: 'contrato', id: x.contrato.id });
      if (x.cliente && x.cliente.precadastro_id) return setSel(x.cliente.precadastro_id);
      nav({ tela: 'novoContrato', cliente_id: x.cliente.id });
    };
    var acaoBtn = function (x) {
      var b = function (txt, pri, fn) { return Btn({ small: true, variant: pri ? 'pri' : 'sec', onClick: function (e) { e.stopPropagation(); fn(); }, children: txt }); };
      if (x.tipoR === 'pre' || x.tipoR === 'reprovado') return b(x.tipoR === 'pre' ? 'Revisar' : 'Ver', false, function () { setSel(x.pre.id); });
      if (x.tipoR === 'aprovado') return b('Criar contrato', true, function () { nav({ tela: 'novoContrato', cliente_id: x.cliente.id }); });
      return b('Abrir perfil', false, function () { nav({ tela: 'contrato', id: x.contrato.id }); });
    };
    var finDe = function (x) {
      if (x.tipoR !== 'contrato' && x.tipoR !== 'ex') return h('span', { style: { color: '#9ca3af' } }, '—');
      var k = x.contrato;
      if (k.status === 'aguardando_assinatura') return h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, 'começa após assinar');
      return h('button', { type: 'button', onClick: function (e) { e.stopPropagation(); nav({ tela: 'financeiro', id: k.id }); }, title: 'Abrir o financeiro', style: { background: 'none', border: 0, padding: 0, cursor: 'pointer' } },
        Pill(k.situacao === 'em_dia' ? 'Em dia · ' + k.parcelas_pagas + ' de ' + k.semanas : (k.situacao_label || k.situacao), TOM_SIT[k.situacao] || 'cinza'));
    };
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      KpiStrip([
        { r: 'Para revisar', v: fN(cntP('revisar')), s: docsPend ? docsPend + ' com documentos pendentes' : 'pré-cadastros abertos', cor: cntP('revisar') ? ROXO_ESC : null },
        { r: 'Aprovados sem contrato', v: fN(cntP('aprovados')), s: 'prontos para receber moto' },
        { r: 'Com contrato', v: fN(cntP('contrato')), s: aguardAss ? aguardAss + ' aguardando assinatura' : 'em andamento' },
        { r: 'Ex-locatários', v: fN(cntP('ex')), s: 'quitado, encerrado ou devolvido' },
        { r: 'Links aguardando', v: fN(abertos.length), s: 'convite enviado, sem formulário' }
      ]),
    h('div', { className: 'grid gap-4 items-start' + (sel ? ' xl:grid-cols-[minmax(0,1fr)_520px]' : '') },
      h('div', { style: { minWidth: 0 } }, h(Card, { pad: false },
        h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8 } },
          Chips([
            { id: 'todos', t: 'Todos', n: cntP('todos') },
            { id: 'revisar', t: 'Para revisar', n: cntP('revisar') },
            { id: 'aprovados', t: 'Aprovados sem contrato', n: cntP('aprovados') },
            { id: 'contrato', t: 'Com contrato', n: cntP('contrato') },
            { id: 'ex', t: 'Ex-locatários', n: cntP('ex') },
            { id: 'reprovados', t: 'Reprovados', n: cntP('reprovados') }
          ].concat(abertos.length ? [{ id: 'links', t: 'Links aguardando', n: abertos.length }] : []), filtro, setFiltro),
          h('div', { style: { flex: 1 } }),
          Chips([{ id: 'todas', t: 'Todas as origens' }, { id: 'tutts', t: 'Motoboy Tutts', n: pessoas.filter(function (x) { return x.tipo === 'tutts'; }).length }, { id: 'externo', t: 'Externo', n: pessoas.filter(function (x) { return x.tipo !== 'tutts'; }).length }], orig, setOrig)),
        secaoLinks,
        filtro === 'links' ? null :
        pessoas.length === 0 ? (abertos.length ? null : Vazio('Nenhum cadastro ainda', 'Motoboy que já está na Central: busque e aproveite o cadastro. Pessoa de fora: gere o link de convite.',
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' } }, Btn({ icon: 'link', onClick: props.abrirConvite, children: 'Pessoa de fora · gerar link' }), props.abrirCentral ? Btn({ variant: 'pri', icon: 'users', onClick: props.abrirCentral, children: 'Motoboy da Central' }) : null))) :
        filtrada.length === 0 ? (secaoLinks ? null : Vazio('Nada neste filtro')) :
        Tabela([{ t: 'Pessoa' }, { t: 'Tipo' }, { t: 'Etapa' }, { t: 'Contrato · moto' }, { t: 'Financeiro' }, { t: '' }],
          filtrada.map(function (x) {
            var on = x.pre && sel === x.pre.id;
            return Linha(x.chave, [
              { td: 1, v: h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontWeight: 600 } }, x.nome), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, x.sub)),
                x.pre ? h('button', { type: 'button', className: 'loc-pre-lixo', title: 'Excluir pré-cadastro', 'aria-label': 'Excluir pré-cadastro de ' + x.nome, /* LOCACAO_PRECAD_EXCLUIR_V1 */
                  onClick: function (e) { e.stopPropagation(); setExcluirPre(x.pre); }, onKeyDown: function (e) { e.stopPropagation(); },
                  style: { width: 32, height: 32, borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: '#b91c1c', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' } }, ico('trash', 15)) : null) },
              { td: 1, v: TagTipo(x.tipo, x.pre ? x.pre.tipo_label : null) },
              { td: 1, v: etapaDe(x), st: { whiteSpace: 'nowrap' } },
              { td: 1, v: x.contrato ? h('div', null, h('div', { style: { fontFamily: MONO, fontSize: 12.5 } }, x.contrato.numero), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, (x.contrato.moto_modelo || '') + ' · ' + (x.contrato.placa || ''))) : h('span', { style: { color: '#9ca3af' } }, '—') },
              { td: 1, v: finDe(x) },
              { td: 1, right: true, v: acaoBtn(x) }
            ], function () { abrir(x); }, on ? { background: '#faf7fd', boxShadow: 'inset 3px 0 0 ' + ROXO } : null);
          })),
        filtrada.length ? h('div', { style: { padding: '10px 16px', borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280' } }, 'As três barrinhas são o caminho da pessoa: pré-cadastro → aprovado → contrato.') : null)),
      sel ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 } }, h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, Btn({ variant: 'link', small: true, icon: 'x', onClick: function () { setSel(null); }, children: 'Fechar revisão' })), h(RevisaoPrecadastro, { key: sel, id: sel, api: api, toast: toast, nav: nav, item: lista.find(function (x) { return x.id === sel; }) || null, editar: props.editar && sel === props.selecionar, aoMudar: function () { carregar(); props.recarregarPainel && props.recarregarPainel(); },
          aoExcluir: function () { setSel(null); carregar(); props.recarregarPainel && props.recarregarPainel(); } /* LOCACAO_PRECAD_EXCLUIR_V1 */ }))
        : null),
      h('style', null, '.loc-pre-lixo{opacity:0;transition:opacity .15s,background .15s}tr:hover .loc-pre-lixo,.loc-pre-lixo:focus-visible{opacity:1}.loc-pre-lixo:hover{background:#fef2f2!important;border-color:#fecaca!important}.loc-pre-lixo:focus-visible{outline:2px solid #b91c1c;outline-offset:1px}@media (hover:none),(pointer:coarse),(max-width:1023px){.loc-pre-lixo{opacity:1}}'),
      excluirPre ? h(ExcluirPrecadastroModal, { api: api, toast: toast, item: { id: excluirPre.id, nome: excluirPre.nome, doc: excluirPre.cpf_mascarado ? 'CPF ' + excluirPre.cpf_mascarado : (excluirPre.cod_profissional ? 'cód. ' + excluirPre.cod_profissional : null) },
        aprovado: excluirPre.status === 'aprovado' || excluirPre.status === 'contrato_criado', tipo: tipoDe(excluirPre),
        onClose: function () { setExcluirPre(null); },
        onFeito: function () { var id = excluirPre.id; setExcluirPre(null); if (sel === id) setSel(null); carregar(); props.recarregarPainel && props.recarregarPainel(); } }) : null);
  }

  var PRE_AVISADOS = {};
  function RevisaoPrecadastro(props) {
    var api = props.api, toast = props.toast;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _t = useState(null), tipo = _t[0], setTipo = _t[1];
    var _v = useState(''), dia = _v[0], setDia = _v[1];
    var _pa2 = useState('semanal'), perA = _pa2[0], setPerA = _pa2[1]; /* LOCACAO_VENC_MENSAL_V1 */
    var _dma = useState(''), diaMesA = _dma[0], setDiaMesA = _dma[1];
    var _c = useState(''), cod = _c[0], setCod = _c[1];
    var _b = useState(false), salvando = _b[0], setSalvando = _b[1];
    var _m = useState(null), modal = _m[0], setModal = _m[1];
    var _ft = useState(null), foto = _ft[0], setFoto = _ft[1];
    var _ed = useState(!!props.editar), editando = _ed[0], setEditando = _ed[1]; // LOCACAO_V4
    var carregar = useCallback(function () {
      setErro(null);
      api('/precadastros/' + props.id).then(function (r) {
        setD(r);
        var p = r.precadastro || {};
        if (props.aoMudar && p.status === 'em_analise' && !PRE_AVISADOS[props.id]) { PRE_AVISADOS[props.id] = 1; props.aoMudar(); } /* abrir muda Novo -> Em análise: atualiza lista e badge */
        if (p.entregador_tutts) { setTipo(function (t) { return t || 'tutts'; }); setCod(function (c) { return c || p.cod_profissional || ''; }); }
        if (p.origem === 'central') { setTipo('tutts'); setCod(p.cod_profissional || ''); } // LOCACAO_V4: veio da Central = sempre Motoboy Tutts
        if (p.dia_vencimento) setDia(function (dv) { return dv || String(p.dia_vencimento); });
        if (p.venc_periodicidade === 'mensal') { setPerA('mensal'); if (p.venc_dia_mes) setDiaMesA(function (x) { return x || String(p.venc_dia_mes); }); } /* LOCACAO_VENC_MENSAL_V1 */
      }).catch(function (e) { setErro(e.message); });
    }, [api, props.id]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d) return h(Card, null, Spinner('Abrindo cadastro...'));
    var p = d.precadastro || {}, alertas = (d.alertas || []).filter(function (a) { return !(p.origem === 'central' && /Documentos incompletos|Nenhum documento/.test(a.texto || '')); }), docs = d.documentos || []; // LOCACAO_V4: selfie com CNH é opcional para quem veio da Central
    var bloqueia = alertas.some(function (a) { return a.nivel === 'bloqueia'; });
    var emRevisao = { novo: 1, em_analise: 1, aguardando_documentos: 1 }[p.status];
    var faltaCampo = !tipo || (perA === 'mensal' ? !diaMesA : !dia) || (tipo === 'tutts' && !String(cod).trim());
    var podeAprovar = emRevisao && d.pode_aprovar !== false && !bloqueia && !faltaCampo;
    var btnExcluirPre = function () { /* LOCACAO_PRECAD_EXCLUIR_V1 */
      return Btn({ key: 'xpre', variant: 'link', icon: 'trash', onClick: function () { setModal('excluir'); }, disabled: salvando, style: { color: '#b91c1c', marginRight: 'auto', padding: '0 4px' }, children: 'Excluir pré-cadastro' });
    };
    var acao = function (url, body, msg) {
      setSalvando(true);
      return api(url, { method: 'POST', body: body || {} })
        .then(function (r) { toast(msg, 'success'); setModal(null); carregar(); props.aoMudar && props.aoMudar(); return r; })
        .catch(function (e) { toast(e.message, 'error'); throw e; })
        .then(function (r) { setSalvando(false); return r; }, function () { setSalvando(false); });
    };
    var aprovar = function () {
      acao('/precadastros/' + p.id + '/aprovar', { tipo: tipo, periodicidade: perA, dia_vencimento: perA === 'mensal' ? null : Number(dia), dia_mes: perA === 'mensal' ? Number(diaMesA) : null, cod_profissional: tipo === 'tutts' ? String(cod).trim() : null }, 'Cadastro aprovado. Já dá para criar o contrato.');
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
    var central = p.origem === 'central'; // LOCACAO_V4
    var tipoSug = p.tipo_sugerido || (central ? 'tutts' : p.entregador_tutts ? 'tutts_confirmar' : 'externo');
    var faltamP = (p.faltam || []).map(function (x) { return typeof x === 'string' ? x : x.label; });
    var item = props.item || {};
    var reenviar = function () {
      setSalvando(true);
      api('/precadastros/' + p.id + '/reenviar-complemento', { method: 'POST', body: {} })
        .then(function (r) {
          if (r.whatsapp && r.whatsapp.enviado) toast('Link de complemento reenviado no WhatsApp', 'success');
          else { toast('Link gerado · WhatsApp não saiu, copiamos o link', 'success'); if (r.url) copiar(r.url, null); }
          carregar(); props.aoMudar && props.aoMudar();
        }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalvando(false); });
    };
    return h(Card, { pad: false, style: { position: 'sticky', top: 84 } },
      h('div', { style: { padding: '14px 18px', borderBottom: '1px solid #f3f4f6' } },
        h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Pré-cadastro #PC-' + String(p.id).padStart(4, '0') + (central ? ' · veio da Central · cód. ' + (p.cod_profissional || '—') : ' · via link') + ' · ' + fDH(p.criado_em)),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' } },
          h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 19, fontWeight: 700 } }, p.nome),
          TagTipo(tipoSug),
          d.cliente_excluido ? Pill('Locatário excluído', 'cinza') /* LOCACAO_CRLV_V1 */ : Pill(p.status_label || ROT_PRE[p.status] || p.status, TOM_PRE[p.status] || 'cinza'))),
      h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 16 } },
        emRevisao && faltamP.length ? h('div', { style: { border: '1px solid #fde68a', borderRadius: 12, overflow: 'hidden' } },
          h('div', { style: { padding: '8px 12px', background: '#fffbeb', color: '#92400e', fontSize: 12.5, fontWeight: 600 } },
            central ? (p.complemento_enviado_em ? 'Aguardando o motoboy completar · link enviado ' + fDHc(p.complemento_enviado_em) : 'Faltam dados para o contrato') : 'Pendências do cadastro'),
          h('div', { style: { padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 } }, faltamP.map(function (x) {
            return h('span', { key: x, style: { fontSize: 12, padding: '3px 9px', borderRadius: 99, background: '#ffffff', border: '1px solid #fde68a', color: '#92400e' } }, x);
          })),
          h('div', { style: { padding: '0 12px 10px', display: 'flex', gap: 8, flexWrap: 'wrap' } },
            Btn({ small: true, icon: 'pencil', onClick: function () { setEditando(true); }, children: 'Preencher dados' }),
            central ? Btn({ small: true, icon: 'message', disabled: salvando, onClick: reenviar, children: p.complemento_enviado_em ? 'Reenviar link' : 'Enviar link de complemento' }) : null)) : null,
        !central && p.entregador_tutts ? Aviso(item.cod_confere === false ? 'ambar' : 'azul', 'Disse que é entregador Tutts' + (p.cod_profissional ? ' · cód. ' + p.cod_profissional : ''),
          item.cod_confere === true ? 'O código confere com um motoboy da Central. Aprove como Motoboy Tutts para vincular ao login dele.' : item.cod_confere === false ? 'Esse código não foi encontrado na Central. Confira antes de aprovar como Motoboy Tutts.' : 'Confira o código antes de aprovar como Motoboy Tutts.') : null,
        p.repasse_medio && p.repasse_medio.valor > 0 ? h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Repasse médio das últimas 4 semanas: ', h('b', { style: { color: '#111827' } }, fR(p.repasse_medio.valor)), ' por semana') : null,
        alertas.length && !(central && faltamP.length) ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, alertas.map(function (a, i) { // LOCACAO_V4: no motoboy da Central com dados faltando, o quadro de faltas substitui os alertas
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
            : h('span', null, central ? 'Aceite LGPD vem no link de complemento (ou na ciência dentro do app)' : 'Aceite LGPD não registrado')),
        d.cliente_id && d.cliente_acesso ? h(LocatarioAcessoBox, { api: api, toast: toast, clienteId: d.cliente_id, tipo: d.cliente_tipo, acesso: d.cliente_acesso, nome: p.nome, whatsapp: p.whatsapp, codSugerido: p.cod_profissional, /* LOCACAO_ACESSO_EXTERNO_V1 */
          aoMudar: function () { carregar(); props.aoMudar && props.aoMudar(); } }) : null,
        emRevisao ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid #f3f4f6', paddingTop: 14 } },
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2', style: { gap: 12 } },
            central ? h(Field, { label: 'Tipo de cliente', hint: 'Veio da Central: sempre Motoboy Tutts, no mesmo login' }, h('div', { style: { height: 38, display: 'flex', alignItems: 'center' } }, TagTipo('tutts'))) // LOCACAO_V4
              : h(Field, { label: 'Tipo de cliente', req: true, hint: tipo === 'tutts' ? 'Usa o login da Central · desconto no repasse só com Anexo III' : tipo === 'externo' ? 'Login com CPF · paga Pix, boleto ou cartão' : null },
              Segmented([['tutts', 'Motoboy Tutts'], ['externo', 'Externo']], tipo, setTipo, 'Tipo de cliente')),
            h(Field, { label: 'Vencimento', req: true },
              h(VencPicker, { per: perA, dia: dia, diaMes: diaMesA, vazioSemana: 'Escolha o dia', onPer: setPerA, onDia: setDia, onDiaMes: setDiaMesA }))), /* LOCACAO_VENC_MENSAL_V1 */
          tipo === 'tutts' ? h(Field, { label: 'Código do profissional na Central', req: true, hint: central ? 'Login dele na Central' : 'Vincula ao login dele na Central' }, Input({ value: cod, readOnly: central, onChange: function (e) { setCod(e.target.value); }, inputMode: 'numeric', placeholder: 'Ex.: 4821', style: Object.assign({ maxWidth: 200 }, central ? { background: '#f9fafb' } : {}) })) : null,
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' } },
            btnExcluirPre(), /* LOCACAO_PRECAD_EXCLUIR_V1 */
            Btn({ variant: 'perigo', onClick: function () { setModal('reprovar'); }, disabled: salvando, children: 'Reprovar…' }),
            Btn({ onClick: function () { setEditando(true); }, disabled: salvando, icon: 'pencil', children: 'Editar dados' }), // LOCACAO_V4
            central ? null : Btn({ onClick: function () { setModal('docs'); }, disabled: salvando, icon: 'upload', children: 'Pedir documentos' }),
            Btn({ variant: 'pri', icon: 'check', onClick: aprovar, disabled: !podeAprovar || salvando, title: bloqueia ? 'Resolva os alertas que bloqueiam a aprovação' : faltaCampo ? 'Defina tipo de cliente e dia de vencimento' : null, children: salvando ? 'Salvando...' : 'Aprovar cadastro' })),
          bloqueia ? h('div', { style: { fontSize: 12, color: '#991b1b', textAlign: 'right' } }, 'A aprovação fica bloqueada enquanto houver alerta vermelho.') : null,
          /* LOCACAO_PRECAD_CONTRATO_V1: contrato já assinado fora da Central não espera os documentos */
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', border: '1px dashed #d8b4f0', background: '#faf7fd', borderRadius: 12, padding: '10px 12px' } },
            h('div', { style: { flex: '1 1 240px', minWidth: 0, fontSize: 12.5, color: '#374151', lineHeight: 1.45 } }, h('b', { style: { color: ROXO_ESC } }, 'Já assinou o contrato fora da Central? '), 'Importe o PDF assinado agora: o cadastro vira locatário sem esperar os documentos, e o contrato entra Ativo.'),
            Btn({ icon: 'upload', disabled: salvando, onClick: function () {
              if (!window.confirm('Aprovar ' + p.nome + ' para importar o contrato já assinado?\n\nO cadastro vira locatário sem a conferência dos documentos (o contrato assinado vale como documento). Fica registrado no histórico.')) return;
              setSalvando(true);
              api('/precadastros/' + p.id + '/aprovar-para-importar', { method: 'POST', body: {} }).then(function (r) {
                props.aoMudar && props.aoMudar();
                props.nav({ tela: 'novoContrato', cliente_id: r.cliente_id, importar: true });
              }).catch(function (e) { toast(e.message, 'error'); setSalvando(false); });
            }, children: 'Importar contrato assinado' })))
          : p.status === 'aprovado' && d.cliente_excluido ? h('div', { style: { borderTop: '1px solid #f3f4f6', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 } }, Aviso('cinza', 'Locatário excluído', 'Esse cadastro não está mais na locação. O histórico de contratos, se tiver, continua guardado.'), h('div', null, btnExcluirPre())) /* LOCACAO_CRLV_V1 */
          : p.status === 'aprovado' ? h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f3f4f6', paddingTop: 14, flexWrap: 'wrap', alignItems: 'center' } },
            btnExcluirPre(), /* LOCACAO_PRECAD_EXCLUIR_V1: substitui o "Excluir locatário" */
            Btn({ variant: 'pri', icon: 'filetext', onClick: function () { props.nav({ tela: 'novoContrato', cliente_id: d.cliente_id }); }, children: 'Criar contrato' }))
          : h('div', { style: { display: 'flex', borderTop: '1px solid #f3f4f6', paddingTop: 14 } }, btnExcluirPre())),
      modal === 'excluir' ? h(ExcluirPrecadastroModal, { api: api, toast: toast, /* LOCACAO_PRECAD_EXCLUIR_V1 */
        item: { id: p.id, nome: p.nome, doc: p.cpf ? 'CPF ' + p.cpf : (p.cod_profissional ? 'cód. ' + p.cod_profissional : null) },
        aprovado: !!d.cliente_id || p.status === 'aprovado' || p.status === 'contrato_criado', tipo: d.cliente_tipo || (p.origem === 'central' ? 'tutts' : tipo),
        onClose: function () { setModal(null); },
        onFeito: function () { setModal(null); if (props.aoExcluir) props.aoExcluir(); else props.aoMudar && props.aoMudar(); } }) : null,
      modal === 'reprovar' ? h(MotivoModal, { titulo: 'Reprovar cadastro', label: 'Motivo da reprovação', hint: 'O motivo é enviado ao entregador pelo WhatsApp.', botao: 'Reprovar cadastro', perigo: true, obrigatorio: true,
        onClose: function () { setModal(null); }, onConfirm: function (m) { return acao('/precadastros/' + p.id + '/reprovar', { motivo: m }, 'Cadastro reprovado'); } }) : null,
      modal === 'docs' ? h(PedirDocsModal, { p: p, api: api, toast: toast, onClose: function () { setModal(null); }, aoEnviar: function () { carregar(); props.aoMudar && props.aoMudar(); } }) : null,
      foto ? h(Lightbox, { titulo: foto.titulo, src: foto.src, legenda: foto.legenda, onClose: function () { setFoto(null); } }) : null,
      editando && emRevisao ? h(EditarPrecadastroModal, { p: p, api: api, toast: toast, docsPorTipo: docsPorTipo, onClose: function () { setEditando(false); }, onSalvo: function () { setEditando(false); carregar(); props.aoMudar && props.aoMudar(); } }) : null);
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

  // ───────────────────────── LOCACAO_CRLV_V1: importar o CRLV-e (PDF) ─────────────────────────
  /* Lê o CRLV-e no navegador (pdf.js), acha cada campo pelo rótulo (valor logo abaixo/ao lado) e valida.
     window.LocacaoCRLV.parse(itens) é puro: itens = [{ str, x, y, w, h, page }] com y medido do topo da página. */
  var CRLV = (function () {
    var PDFJS_VER = '3.11.174';
    var PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VER + '/pdf.min.js';
    var PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VER + '/pdf.worker.min.js';
    var _carregando = null;
    function carregarPdfJs() {
      if (window.pdfjsLib && window.pdfjsLib.getDocument) return Promise.resolve(window.pdfjsLib);
      if (_carregando) return _carregando;
      _carregando = new Promise(function (ok, falha) {
        var s = document.createElement('script');
        s.src = PDFJS_URL; s.async = true; s.crossOrigin = 'anonymous';
        s.onload = function () {
          if (!window.pdfjsLib) { _carregando = null; falha(new Error('Leitor de PDF não carregou')); return; }
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
          ok(window.pdfjsLib);
        };
        s.onerror = function () { _carregando = null; falha(new Error('Não deu para carregar o leitor de PDF. Confira a internet e tente de novo.')); };
        document.head.appendChild(s);
      });
      return _carregando;
    }
    function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[:：]/g, ' ').replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim(); }
    var ROTULOS = {
      renavam: ['CODIGO RENAVAM', 'RENAVAM', 'COD RENAVAM'],
      placa: ['PLACA'],
      exercicio: ['EXERCICIO'],
      ano_fab: ['ANO FABRICACAO', 'ANO DE FABRICACAO', 'ANO FAB'],
      ano_mod: ['ANO MODELO', 'ANO MOD'],
      numero_crv: ['NUMERO DO CRV', 'N DO CRV', 'NUMERO CRV', 'N° DO CRV', 'Nº DO CRV'],
      marca_modelo: ['MARCA / MODELO / VERSAO', 'MARCA / MODELO', 'MARCA / MODELO / VERSAO DO VEICULO'],
      especie: ['ESPECIE / TIPO'],
      chassi: ['CHASSI', 'CHASSI / VIN'],
      cor: ['COR PREDOMINANTE', 'COR'],
      combustivel: ['COMBUSTIVEL'],
      potencia: ['POTENCIA / CILINDRADA', 'POT / CIL', 'CILINDRADA'],
      motor: ['MOTOR', 'NUMERO DO MOTOR', 'N DO MOTOR'],
      nome: ['NOME', 'NOME DO PROPRIETARIO', 'PROPRIETARIO'],
      doc: ['CPF / CNPJ', 'CPF / CNPJ DO PROPRIETARIO'],
      local: ['LOCAL'],
    };
    var OUTROS = ['CATEGORIA', 'CAPACIDADE', 'PESO BRUTO TOTAL', 'CMT', 'EIXOS', 'LOTACAO', 'CARROCERIA', 'DATA', 'PLACA ANTERIOR / UF', 'CODIGO DE SEGURANCA DO CLA', 'CAT',
      'OBSERVACOES DO VEICULO', 'MENSAGENS SENATRAN', 'CERTIFICADO DE REGISTRO E LICENCIAMENTO DE VEICULO', 'CERTIFICADO DE REGISTRO E LICENCIAMENTO DE VEICULO - DIGITAL', 'ASSINATURA', 'VALIDO EM TODO O TERRITORIO NACIONAL'];
    var TODOS = {};
    Object.keys(ROTULOS).forEach(function (k) { ROTULOS[k].forEach(function (r) { TODOS[norm(r)] = k; }); });
    OUTROS.forEach(function (r) { TODOS[norm(r)] = TODOS[norm(r)] || '_'; });
    function ehRotulo(t) { return Object.prototype.hasOwnProperty.call(TODOS, t); }

    /* junta pedaços na mesma linha e colados (pdf.js às vezes quebra uma palavra em vários itens) */
    function blocos(itens) {
      var it = (itens || []).filter(function (i) { return String(i.str || '').trim(); }).map(function (i) { return { str: String(i.str), x: +i.x || 0, y: +i.y || 0, w: +i.w || 0, h: +i.h || 8, page: i.page || 1 }; });
      it.sort(function (a, b) { return a.page - b.page || a.y - b.y || a.x - b.x; });
      var out = [];
      it.forEach(function (i) {
        var u = out[out.length - 1];
        var tol = Math.max(1.5, Math.min(u ? u.h : i.h, i.h) * 0.35);
        if (u && u.page === i.page && Math.abs(u.y - i.y) <= tol && i.x - (u.x + u.w) <= Math.max(3, i.h * 0.45) && i.x - (u.x + u.w) > -i.h) {
          var gap = i.x - (u.x + u.w);
          u.str += (gap > i.h * 0.15 && !/\s$/.test(u.str) ? ' ' : '') + i.str;
          u.w = Math.max(u.x + u.w, i.x + i.w) - u.x; u.h = Math.max(u.h, i.h);
        } else out.push(Object.assign({}, i));
      });
      out.forEach(function (b) { b.n = norm(b.str); b.rotulo = ehRotulo(b.n); });
      return out;
    }
    function candidatos(rot, bs) {
      var abaixo = [], lado = [];
      bs.forEach(function (b) {
        if (b === rot || b.page !== rot.page || b.rotulo) return;
        var dy = b.y - rot.y;
        if (dy > rot.h * 0.4 && dy < Math.max(34, rot.h * 4.2) && b.x >= rot.x - 8 && b.x < rot.x + Math.max(rot.w, 70)) abaixo.push({ b: b, d: dy * 3 + Math.abs(b.x - rot.x) });
        else if (Math.abs(dy) <= rot.h * 0.5 && b.x > rot.x + rot.w - 1 && b.x - (rot.x + rot.w) < 160) lado.push({ b: b, d: 200 + (b.x - rot.x - rot.w) });
      });
      return abaixo.concat(lado).sort(function (a, c) { return a.d - c.d; }).map(function (c) { return c.b; });
    }
    function titulo(s) { return String(s || '').toLowerCase().replace(/(^|[\s\/(-])([a-zà-ú])/g, function (m, a, l) { return a + l.toUpperCase(); }); }
    function renavamOk(r) {
      if (!/^\d{11}$/.test(r)) return false;
      var base = r.slice(0, 10).split('').reverse(), pesos = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3], s = 0;
      for (var i = 0; i < 10; i++) s += Number(base[i]) * pesos[i];
      var dv = (s * 10) % 11; if (dv === 10) dv = 0;
      return dv === Number(r[10]);
    }
    var PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
    var VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
    /* cada campo: limpa → { valor, conferir, hint } ou null se não serve */
    var VAL = {
      placa: function (s) { var v = norm(s).replace(/[^A-Z0-9]/g, ''); return PLACA.test(v) ? { valor: v } : null; },
      renavam: function (s) {
        var cru = norm(s).replace(/[\s.\-]/g, '');
        if (!/^[0-9OIL]{8,11}$/.test(cru) || !/\d{6}/.test(cru)) return null;
        var troca = /[OIL]/.test(cru);
        var v = cru.replace(/O/g, '0').replace(/[IL]/g, '1');
        while (v.length < 11) v = '0' + v;
        var ok = renavamOk(v);
        return { valor: v, conferir: troca || !ok, hint: troca ? 'Tinha letra no meio dos números. Confira no documento.' : !ok ? 'O dígito verificador não bateu. Confira no documento.' : 'Dígito verificador ok' };
      },
      chassi: function (s) {
        var v = norm(s).replace(/[^A-Z0-9]/g, '');
        if (v.length < 15 || v.length > 18 || !/\d/.test(v) || !/[A-Z]/.test(v)) return null;
        if (VIN.test(v)) return { valor: v, hint: '17 caracteres · formato válido' };
        return { valor: v, conferir: true, hint: v.length !== 17 ? 'Tem ' + v.length + ' caracteres (o normal é 17). Confira.' : 'Tem letra I, O ou Q, que não existe em chassi. Pode ser 1 ou 0.' };
      },
      motor: function (s) {
        var v = norm(s).replace(/[\s*.\-]/g, '');
        if (v.length < 4 || v.length > 24 || !/\d/.test(v) || !/^[A-Z0-9]+$/.test(v)) return null;
        var susp = /\d[OIQ]|[OIQ]\d{2}/.test(v.replace(/^[A-Z]+/, ''));
        return { valor: v, conferir: susp, hint: susp ? 'Tem a letra "O" ou "I" no meio dos números. Pode ser zero ou um.' : null };
      },
      marca_modelo: function (s) { var v = String(s).replace(/\s+/g, ' ').trim(); return /[A-Za-z]{2}/.test(v) && v.length >= 3 && !ehRotulo(norm(v)) ? { valor: v.toUpperCase() } : null; },
      ano: function (s) { var m = /\b(19[5-9]\d|20\d\d)\b/.exec(String(s)); return m ? { valor: m[1] } : null; },
      cor: function (s) { var v = norm(s); return /^[A-Z ]{3,20}$/.test(v) ? { valor: titulo(v) } : null; },
      texto: function (s) { var v = String(s).replace(/\s+/g, ' ').trim(); return v && /[A-Za-zÀ-ú]/.test(v) && !ehRotulo(norm(v)) ? { valor: v } : null; },
      combustivel: function (s) { var v = norm(s); return /[A-Z]{3}/.test(v) && v.length <= 40 ? { valor: titulo(v) } : null; },
      potencia: function (s) {
        var v = norm(s).replace(/\s/g, '');
        var m = /\/0*(\d{2,4})$/.exec(v) || /^0*(\d{2,4})(CC)?$/.exec(v);
        return m ? { valor: m[1] } : null;
      },
      doc: function (s) { var v = String(s).replace(/\D/g, ''); return v.length === 11 || v.length === 14 ? { valor: v } : null; },
      digitos: function (s) { var v = String(s).replace(/\D/g, ''); return v.length >= 6 && v.length <= 14 ? { valor: v } : null; },
    };
    var CAMPO_VAL = { placa: 'placa', renavam: 'renavam', chassi: 'chassi', motor: 'motor', marca_modelo: 'marca_modelo', ano_fab: 'ano', ano_mod: 'ano', exercicio: 'ano', cor: 'cor',
      combustivel: 'combustivel', potencia: 'potencia', nome: 'texto', doc: 'doc', local: 'texto', especie: 'texto', numero_crv: 'digitos' };
    function rect(b) { return { page: b.page, x: b.x, y: b.y, w: b.w, h: b.h }; }
    function uniao(a, b) { if (!a) return b; if (!b || a.page !== b.page) return a; var x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { page: a.page, x: x, y: y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }; }

    function parse(itens) {
      var bs = blocos(itens);
      var textoTotal = bs.map(function (b) { return b.str; }).join(' ');
      var achados = {};
      Object.keys(CAMPO_VAL).forEach(function (k) {
        var nomes = (ROTULOS[k] || ROTULOS[k.replace(/_(fab|mod)$/, '')] || []).map(norm);
        if (k === 'ano_fab') nomes = ROTULOS.ano_fab.map(norm);
        if (k === 'ano_mod') nomes = ROTULOS.ano_mod.map(norm);
        var rots = bs.filter(function (b) { return nomes.indexOf(b.n) >= 0; });
        for (var i = 0; i < rots.length && !achados[k]; i++) {
          var cs = candidatos(rots[i], bs);
          for (var j = 0; j < cs.length; j++) {
            var r = VAL[CAMPO_VAL[k]](cs[j].str);
            if (r) { achados[k] = Object.assign({ rect: rect(cs[j]), rotulo: rect(rots[i]) }, r); break; }
          }
        }
      });
      // reserva por padrão no texto todo, quando o rótulo não apareceu
      var porTexto = function (k, re, val) {
        if (achados[k]) return;
        for (var i = 0; i < bs.length; i++) {
          if (bs[i].rotulo) continue;
          var m = re.exec(bs[i].str.toUpperCase().replace(/[\s.\-]/g, ''));
          if (m) { var r = val(m[0]); if (r) { achados[k] = Object.assign({ rect: rect(bs[i]), porPadrao: true }, r); return; } }
        }
      };
      porTexto('chassi', /[A-HJ-NPR-Z0-9]{17}/, VAL.chassi);
      porTexto('placa', /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, VAL.placa);
      if (!achados.renavam) {
        for (var i = 0; i < bs.length && !achados.renavam; i++) {
          var mm = /\b\d{11}\b/.exec(bs[i].str.replace(/[\s.\-]/g, ' '));
          if (mm && renavamOk(mm[0])) achados.renavam = { valor: mm[0], rect: rect(bs[i]), porPadrao: true, hint: 'Dígito verificador ok' };
        }
      }
      var A = achados;
      var campos = {};
      var put = function (k, v, rc, extra) { if (v) campos[k] = Object.assign({ valor: v, rect: rc || null, conferir: false, hint: null }, extra || {}); };
      if (A.marca_modelo) put('modelo', A.marca_modelo.valor, A.marca_modelo.rect);
      if (A.ano_fab || A.ano_mod) {
        var fab = (A.ano_fab || A.ano_mod).valor, mod = (A.ano_mod || A.ano_fab).valor;
        put('ano', fab + '/' + mod, uniao(A.ano_fab && A.ano_fab.rect, A.ano_mod && A.ano_mod.rect), !(A.ano_fab && A.ano_mod) ? { conferir: true, hint: 'Só achamos um dos anos. Confira.' } : (Number(mod) < Number(fab) || Number(mod) - Number(fab) > 1 ? { conferir: true, hint: 'Ano modelo e fabricação estranhos. Confira.' } : null));
      }
      if (A.cor) put('cor', A.cor.valor, A.cor.rect);
      if (A.placa) put('placa', A.placa.valor, A.placa.rect);
      if (A.renavam) put('renavam', A.renavam.valor, A.renavam.rect, { conferir: !!A.renavam.conferir, hint: A.renavam.hint });
      if (A.chassi) put('chassi', A.chassi.valor, A.chassi.rect, { conferir: !!A.chassi.conferir, hint: A.chassi.hint });
      if (A.motor) put('numero_motor', A.motor.valor, A.motor.rect, { conferir: !!A.motor.conferir, hint: A.motor.hint });
      var extras = {
        combustivel: A.combustivel ? A.combustivel.valor : null, cilindrada: A.potencia ? A.potencia.valor : null, exercicio: A.exercicio ? A.exercicio.valor : null,
        especie: A.especie ? A.especie.valor : null, proprietario_nome: A.nome ? A.nome.valor : null, proprietario_doc: A.doc ? A.doc.valor : null,
        local: A.local ? A.local.valor : null, numero_crv: A.numero_crv ? A.numero_crv.valor : null,
      };
      var rectsExtras = {};
      [['combustivel', 'combustivel'], ['cilindrada', 'potencia'], ['exercicio', 'exercicio'], ['proprietario_nome', 'nome'], ['proprietario_doc', 'doc']].forEach(function (p) { if (A[p[1]]) rectsExtras[p[0]] = A[p[1]].rect; });
      var marca = A.marca_modelo ? titulo(String(A.marca_modelo.valor).split('/')[0].trim()) : null;
      return { campos: campos, extras: extras, rectsExtras: rectsExtras, marca: marca, semTexto: textoTotal.replace(/\s/g, '').length < 40,
        pareceCrlv: /RENAVAM|LICENCIAMENTO|CHASSI/.test(norm(textoTotal)), total: Object.keys(campos).length,
        conferir: Object.keys(campos).filter(function (k) { return campos[k].conferir; }).length };
    }

    /* PDF → itens com posição (pt, origem no topo) + o documento aberto do pdf.js */
    function lerArquivo(file, opts) {
      opts = opts || {}; /* LOCACAO_IMPORTAR_LEITURA_V1: maxPaginas (desenho) e maxTexto (leitura) */
      var maxPag = opts.maxPaginas || 4, maxTxt = opts.maxTexto || maxPag;
      return Promise.all([carregarPdfJs(), file.arrayBuffer()]).then(function (r) {
        var lib = r[0];
        return lib.getDocument({ data: new Uint8Array(r[1]) }).promise.then(function (pdf) {
          var paginas = [], itens = [];
          var seq = Promise.resolve();
          for (var p = 1; p <= Math.min(pdf.numPages, maxPag); p++) (function (pn) {
            seq = seq.then(function () {
              return pdf.getPage(pn).then(function (page) {
                var vp = page.getViewport({ scale: 1 });
                paginas.push({ w: vp.width, h: vp.height });
                if (pn > maxTxt) return;
                return page.getTextContent().then(function (tc) {
                  tc.items.forEach(function (it) {
                    if (!it.str) return;
                    var t = lib.Util.transform(vp.transform, it.transform);
                    var fh = Math.hypot(t[2], t[3]) || it.height || 8;
                    itens.push({ str: it.str, x: t[4], y: t[5] - fh, w: it.width * (vp.scale || 1), h: fh, page: pn });
                  });
                });
              });
            });
          })(p);
          return seq.then(function () { return { pdf: pdf, paginas: paginas, itens: itens, numPages: pdf.numPages }; });
        });
      });
    }
    return { parse: parse, blocos: blocos, lerArquivo: lerArquivo, carregarPdfJs: carregarPdfJs, renavamOk: renavamOk, norm: norm, titulo: titulo };
  })();
  window.LocacaoCRLV = CRLV;

  // ───────────────────────── LOCACAO_IMPORTAR_LEITURA_V1: ler o contrato assinado (PDF) ─────────────────────────
  /* Lê o Demonstrativo (Quadro-Resumo) do contrato gerado pela Central: tabela de 2 colunas (rótulo | valor),
     checkboxes ☒/☐. window.LocacaoContratoLeitor.parse(itens) é puro: itens = [{ str, x, y, w, h, page }]. */
  var LEITOR = (function () {
    function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); }
    var SECOES = ['LOCADORA', 'LOCATARIO', 'PLANO E PRAZO', 'MOTOCICLETA', 'VALORES'];
    var ROT = {
      base: 'BASE DE RETIRADA E DEVOLUCAO', nome: 'NOME COMPLETO', cpf_rg: 'CPF / RG', plano: 'PLANO CONTRATADO', prazo: 'PRAZO DA LOCACAO',
      manutencao: 'MANUTENCAO', area: 'AREA DE CIRCULACAO PERMITIDA', marca: 'MARCA / MODELO / ANO / COR', placa: 'PLACA / CHASSI / RENAVAM',
      km: 'QUILOMETRAGEM NA ENTREGA', valor: 'VALOR DA PARCELA DA LOCACAO', venc: 'VENCIMENTO', caucao: 'CAUCAO', formas: 'FORMA DE PAGAMENTO',
      opcao: 'VALOR DE EXERCICIO DA OPCAO DE'
    };
    var DIAS = { SEGUNDA: 1, TERCA: 2, QUARTA: 3, QUINTA: 4, SEXTA: 5, SABADO: 6 };
    function uniao(a, b) {
      if (!a) return b || null; if (!b) return a; if (a.page !== b.page) return a;
      var x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
      return { page: a.page, x: x, y: y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
    }
    function rectDe(its) { return its.reduce(function (r, i) { return uniao(r, { page: i.page, x: i.x - 2, y: i.y - 3, w: i.w + 4, h: i.h + 6 }); }, null); }
    /* itens → linhas (mesma página e mesma altura), em ordem de leitura */
    function linhas(itens) {
      var ls = [];
      itens.filter(function (i) { return i.str && i.str.trim(); }).slice().sort(function (a, b) { return a.page - b.page || a.y - b.y || a.x - b.x; }).forEach(function (i) {
        var l = ls.length ? ls[ls.length - 1] : null;
        if (l && l.page === i.page && Math.abs(l.y - i.y) <= 2.5) l.its.push(i); else ls.push({ page: i.page, y: i.y, its: [i] });
      });
      ls.forEach(function (l) { l.its.sort(function (a, b) { return a.x - b.x; }); });
      return ls;
    }
    /* acha as colunas da tabela (x do rótulo e x do valor) pela linha "Prazo da locação" / "Nome completo" */
    function colunas(ls) {
      var cands = ls.filter(function (l) { var t = norm(l.its[0].str); return t.indexOf('PRAZO DA LOCACAO') === 0 || t.indexOf('NOME COMPLETO') === 0 || t.indexOf('PLACA / CHASSI') === 0; });
      for (var i = 0; i < cands.length; i++) {
        var l = cands[i], x0 = l.its[0].x, fim = x0 + l.its[0].w;
        var v = l.its.find(function (it) { return it.x > fim + 4; });
        if (v) return { xr: x0, xv: v.x };
      }
      return null;
    }
    function texto(its) { return its.map(function (i) { return i.str; }).join(' ').replace(/\s+/g, ' ').trim(); }
    /* monta as linhas da tabela: { rotulo, valor, rect } */
    function tabela(ls, col) {
      var rows = [], atual = null;
      ls.forEach(function (l) {
        var rot = l.its.filter(function (i) { return i.x < col.xv - 3 && i.x >= col.xr - 6; });
        var val = l.its.filter(function (i) { return i.x >= col.xv - 3; });
        var fora = l.its.filter(function (i) { return i.x < col.xr - 6; });
        if (fora.length) { atual = null; return; }
        if (rot.length && !val.length && SECOES.indexOf(norm(texto(rot))) >= 0) { atual = null; return; }
        if (rot.length && val.length) { atual = { rotulo: texto(rot), valor: texto(val), rect: rectDe(l.its), its: l.its.slice() }; rows.push(atual); return; }
        if (atual && (rot.length || val.length) && l.page === atual.rect.page && l.y - (atual.rect.y + atual.rect.h) < 10) {
          if (rot.length) atual.rotulo += ' ' + texto(rot);
          if (val.length) atual.valor += ' ' + texto(val);
          atual.rect = uniao(atual.rect, rectDe(l.its)); atual.its = atual.its.concat(l.its);
          return;
        }
        atual = null;
      });
      return rows;
    }
    var MARC = '☒', DESM = '☐';
    /* qual opção está marcada: retorna o índice da opção (na ordem dada) com ☒ antes dela, ou -1 se nenhuma / -2 sem caixas */
    function marcada(valor, opcoes) {
      var v = String(valor || '');
      if (v.indexOf(MARC) < 0 && v.indexOf(DESM) < 0) return -2;
      var nv = norm(v), achou = -1;
      opcoes.forEach(function (o, i) {
        var m = new RegExp('([' + MARC + DESM + '])\\s*' + norm(o)).exec(nv);
        if (m && m[1] === MARC && achou === -1) achou = i;
      });
      return achou;
    }
    function moeda(s) { var m = /R\$\s*([\d.]+,\d{2})/.exec(String(s || '')); return m ? m[1] : null; }
    function isoDe(br) { var m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(String(br || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : null; }

    function parse(itens) {
      itens = itens || [];
      var textoTotal = itens.map(function (i) { return i.str; }).join(' ');
      var semTexto = textoTotal.replace(/\s/g, '').length < 60;
      var out = { campos: {}, id: {}, semTexto: semTexto, pareceContrato: /QUADRO-RESUMO|DEMONSTRATIVO DE CONTRATO/.test(norm(textoTotal)), total: 0, conferir: 0, numero: null };
      var mN = /Contrato n[ºo°]\s*([A-Z0-9][A-Z0-9\-\/.]*)/i.exec(textoTotal); if (mN) out.numero = mN[1];
      if (semTexto) return out;
      var ls = linhas(itens), col = colunas(ls);
      if (!col) return out;
      var rows = tabela(ls, col);
      var acha = function (rot) { return rows.find(function (r) { return norm(r.rotulo).indexOf(rot) === 0; }) || null; };
      var C = out.campos;
      var put = function (k, valor, r, extra) { if (valor == null || valor === '') return; C[k] = Object.assign({ valor: valor, rect: r ? r.rect : null, conferir: false, hint: null, origem: r ? r.valor : null }, extra || {}); };
      var r;
      // identificação
      if ((r = acha(ROT.nome))) out.id.nome = { valor: r.valor, rect: r.rect };
      if ((r = acha(ROT.cpf_rg))) { var mc = /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/.exec(r.valor); if (mc) out.id.cpf = { valor: mc[1].replace(/\D/g, ''), rect: r.rect }; }
      if ((r = acha(ROT.placa))) {
        var pp = r.valor.split('/').map(function (x) { return x.trim(); });
        out.id.placa = { valor: String(pp[0] || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), rect: r.rect };
        if (pp[1] && !/_{3,}/.test(pp[1])) out.id.chassi = { valor: pp[1].toUpperCase().replace(/[^A-Z0-9]/g, ''), rect: r.rect };
      }
      if ((r = acha(ROT.marca))) out.id.modelo = { valor: r.valor, rect: r.rect };
      // plano
      if ((r = acha(ROT.plano))) {
        var ip = marcada(r.valor, ['TUTTS ALUGUEL', 'PLANO CONQUISTA']);
        if (ip >= 0) put('plano', ip === 0 ? 'aluguel' : 'conquista', r);
        else put('plano', /CONQUISTA/.test(norm(r.valor)) && !/ALUGUEL/.test(norm(r.valor)) ? 'conquista' : 'conquista', r, { conferir: true, hint: 'Não deu para ver qual plano está marcado. Confira no PDF.' });
      }
      // prazo + periodicidade + início
      var perPrazo = null;
      if ((r = acha(ROT.prazo))) {
        var mq = /^\s*(\d{1,3})/.exec(r.valor);
        var ipp = marcada(r.valor, ['MESES', 'SEMANAS']);
        if (ipp >= 0) perPrazo = ipp === 0 ? 'mensal' : 'semanal';
        if (mq) put('prazo', mq[1], r);
        var ini = /IN[IÍ]CIO\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i.exec(r.valor);
        if (ini) put('inicio', isoDe(ini[1]), r);
      }
      // valor + periodicidade da parcela
      var perValor = null;
      if ((r = acha(ROT.valor))) {
        var vv = moeda(r.valor); if (vv) put('valor', vv, r);
        var ipv = marcada(r.valor, ['SEMANA', 'MES']);
        if (ipv >= 0) perValor = ipv === 0 ? 'semanal' : 'mensal';
      }
      // vencimento
      var perVenc = null;
      if ((r = acha(ROT.venc))) {
        var nv = norm(r.valor), md = /TODO DIA (\d{1,2})/.exec(nv), ms = /AS (SEGUNDA|TERCA|QUARTA|QUINTA|SEXTA|SABADO)/.exec(nv);
        if (md && +md[1] >= 1 && +md[1] <= 28) { perVenc = 'mensal'; put('dia_mes', String(+md[1]), r); }
        else if (ms) { perVenc = 'semanal'; put('dia_semana', String(DIAS[ms[1]]), r); }
      }
      var pers = [perPrazo, perValor, perVenc].filter(Boolean);
      if (pers.length) {
        var per = pers[0], todosIguais = pers.every(function (p) { return p === per; });
        var rp = acha(ROT.valor) || acha(ROT.prazo);
        put('periodicidade', per, rp, todosIguais ? null : { conferir: true, hint: 'Prazo, parcela e vencimento não batem na periodicidade. Confira.' });
      }
      // caução
      if ((r = acha(ROT.caucao))) {
        if (/ISENTO/.test(norm(r.valor))) put('caucao_isento', true, r);
        else { var cv = moeda(r.valor); if (cv) { put('caucao_isento', false, r); put('caucao', cv, r); } }
      }
      // base, área, manutenção, km
      if ((r = acha(ROT.base)) && r.valor && !/^_+$/.test(r.valor)) put('base', r.valor, r);
      if ((r = acha(ROT.area))) {
        var ma = /RAIO DE\s*(\d{1,4})\s*KM DO MUNICIPIO DE\s*(.+)$/i.exec(norm(r.valor));
        if (ma) { put('area_km', ma[1], r); var mun = /munic[ií]pio de\s*(.+)$/i.exec(r.valor); put('area_mun', mun ? mun[1].trim() : ma[2], r); }
      }
      if ((r = acha(ROT.manutencao))) {
        var im = marcada(r.valor, ['PREVENTIVA INCLUSA', 'INTEGRALMENTE']);
        if (im >= 0) put('manutencao', im === 0 ? 'inclusa' : 'locatario', r);
      }
      if ((r = acha(ROT.km))) { var mk = /([\d.]+)\s*KM/i.exec(r.valor); if (mk && /\d/.test(mk[1])) put('km', mk[1].replace(/\D/g, ''), r); }
      // pagamento
      if ((r = acha(ROT.formas))) {
        var fv = r.valor;
        if (marcada(fv, ['PIX']) !== -2) {
          put('pix', marcada(fv, ['PIX']) === 0, r); put('boleto', marcada(fv, ['BOLETO']) === 0, r);
          put('cartao', marcada(fv, ['CARTAO RECORRENTE', 'CARTÃO RECORRENTE']) >= 0, r); put('desconto', marcada(fv, ['DESCONTO EM REPASSES']) === 0, r);
        }
      }
      // opção de compra
      if ((r = acha(ROT.opcao))) { var ov = moeda(r.valor); if (ov) put('opcao', ov, r); }
      out.total = Object.keys(C).length;
      out.conferir = Object.keys(C).filter(function (k) { return C[k].conferir; }).length;
      return out;
    }
    return { parse: parse, norm: norm, marcada: marcada };
  })();
  window.LocacaoContratoLeitor = LEITOR;

  /* visualizador do PDF: páginas em canvas + retângulos dos campos lidos */
  function VisorPdf(props) {
    var _z = useState(1), zoom = _z[0], setZoom = _z[1];
    var _l = useState(0), largura = _l[0], setLargura = _l[1];
    var caixa = useRef(null), canvases = useRef({}), ativoRef = useRef(null);
    var pdf = props.pdf, paginas = props.paginas || [];
    useEffect(function () {
      var el = caixa.current; if (!el) return;
      var medir = function () { setLargura(el.clientWidth); };
      medir();
      var ro = window.ResizeObserver ? new ResizeObserver(medir) : null;
      if (ro) ro.observe(el); else window.addEventListener('resize', medir);
      return function () { if (ro) ro.disconnect(); else window.removeEventListener('resize', medir); };
    }, []);
    var escalaDe = function (pg) { var base = Math.max(200, (largura || 460) - 32); return (base / (pg.w || 595)) * zoom; };
    useEffect(function () {
      if (!pdf || !largura) return;
      var cancel = false;
      paginas.forEach(function (pg, i) {
        pdf.getPage(i + 1).then(function (page) {
          if (cancel) return;
          var c = canvases.current[i]; if (!c) return;
          var esc = escalaDe(pg), dpr = Math.min(2, window.devicePixelRatio || 1);
          var vp = page.getViewport({ scale: esc * dpr });
          c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
          c.style.width = Math.floor(vp.width / dpr) + 'px'; c.style.height = Math.floor(vp.height / dpr) + 'px';
          page.render({ canvasContext: c.getContext('2d'), viewport: vp });
        });
      });
      return function () { cancel = true; };
    }, [pdf, largura, zoom, paginas.length]);
    useEffect(function () {
      if (props.ativo && ativoRef.current && ativoRef.current.scrollIntoView) ativoRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [props.ativo]);
    var abrir = function () { if (props.arquivo) { var u = URL.createObjectURL(props.arquivo); window.open(u, '_blank', 'noopener'); setTimeout(function () { URL.revokeObjectURL(u); }, 60000); } };
    var bz = { width: 32, height: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#ffffff', color: '#374151', display: 'grid', placeItems: 'center', cursor: 'pointer' };
    var kb = function (n) { return n > 1024 * 1024 ? (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };
    return h(Card, { pad: false, label: 'Documento importado' },
      h('div', { style: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 } },
        h('span', { style: { width: 30, height: 30, borderRadius: 8, background: '#fef2f2', color: '#b91c1c', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, flex: 'none' } }, 'PDF'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { title: props.nome, style: { fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, props.nome),
          h('div', { style: { fontSize: 11, color: '#6b7280' } }, (props.numPages || paginas.length) + (paginas.length === 1 ? ' página' : ' páginas') + (props.tamanho ? ' · ' + kb(props.tamanho) : ''))),
        h('button', { type: 'button', 'aria-label': 'Diminuir zoom', onClick: function () { setZoom(function (z) { return Math.max(0.5, Math.round((z - 0.25) * 100) / 100); }); }, style: bz }, ico('minus', 14)),
        h('span', { style: Object.assign({ fontSize: 12, color: '#374151', width: 42, textAlign: 'center' }, TAB) }, Math.round(zoom * 100) + '%'),
        h('button', { type: 'button', 'aria-label': 'Aumentar zoom', onClick: function () { setZoom(function (z) { return Math.min(3, Math.round((z + 0.25) * 100) / 100); }); }, style: bz }, ico('plus', 14)),
        h('button', { type: 'button', 'aria-label': 'Abrir o PDF em nova aba', title: 'Abrir em nova aba', onClick: abrir, style: bz }, ico('link', 14))),
      h('div', { ref: caixa, style: { background: '#eef0f3', padding: 16, maxHeight: props.altura || '78vh', overflow: 'auto' } },
        !pdf ? h('div', { style: { padding: 30 } }, Spinner('Abrindo o PDF...')) :
        paginas.map(function (pg, i) {
          var esc = escalaDe(pg);
          return h('div', { key: i, style: { position: 'relative', width: Math.floor(pg.w * esc), height: Math.floor(pg.h * esc), margin: '0 auto 12px', background: '#ffffff', boxShadow: '0 2px 10px rgba(17,24,39,.12)' } },
            h('canvas', { ref: function (el) { canvases.current[i] = el; }, 'aria-label': 'Página ' + (i + 1) + ' do documento', style: { display: 'block' } }),
            (props.marcas || []).filter(function (mk) { return mk.rect && mk.rect.page === i + 1; }).map(function (mk) {
              var on = props.ativo === mk.k, pad = 1.5;
              var cor = mk.conferir ? '#f59e0b' : ROXO;
              return h('div', { key: mk.k, ref: on ? ativoRef : null, title: mk.titulo, style: { position: 'absolute', left: (mk.rect.x - pad) * esc, top: (mk.rect.y - pad) * esc, width: (mk.rect.w + pad * 2) * esc, height: (mk.rect.h + pad * 2) * esc,
                border: (on ? 3 : 2) + 'px solid ' + cor, background: mk.conferir ? 'rgba(245,158,11,' + (on ? '.22' : '.1') + ')' : 'rgba(119,15,168,' + (on ? '.18' : '.07') + ')', borderRadius: 3,
                boxShadow: on ? '0 0 0 4px ' + (mk.conferir ? 'rgba(245,158,11,.25)' : 'rgba(119,15,168,.2)') : 'none', transition: 'all .15s', pointerEvents: 'none' } });
            }));
        })),
      h('div', { style: { padding: '10px 12px', borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 8 } },
        h('span', { style: { width: 12, height: 12, border: '2px solid ' + ROXO, borderRadius: 3, flex: 'none' } }),
        props.semTexto ? 'Esse PDF não tem texto: preencha olhando o documento.' : props.rodape || 'De onde veio cada campo. Passe o mouse num campo do cadastro para ver o trecho no documento.'));
  }

  /* confirmação de exclusão (moto ou locatário) com o motivo do bloqueio quando há contrato */
  function ExcluirModal(props) {
    var _s = useState(false), s = _s[0], setS = _s[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var confirmar = function () {
      setS(true); setErro(null);
      props.api(props.url, { method: 'DELETE' }).then(function (r) { setS(false); props.onFeito(r); })
        .catch(function (e) { setS(false); setErro(e.message || 'Não deu para excluir'); });
    };
    return h(Modal, { titulo: props.titulo, onClose: props.onClose, largura: 520,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }), Btn({ key: 'o', variant: 'perigoCheio', icon: 'trash', disabled: s || !!erro, onClick: confirmar, children: s ? 'Excluindo...' : props.botao })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5, color: '#374151', lineHeight: 1.5 } },
        h('div', { style: { background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 10, padding: '10px 12px', fontWeight: 600, color: '#111827' } }, props.nome),
        h('ul', { style: { margin: 0, paddingLeft: 18, listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: 4 } }, (props.regras || []).map(function (t, i) { return h('li', { key: i }, t); })),
        erro ? Aviso('vermelho', 'Não dá para excluir agora', erro, 'alert') : null));
  }

  /* LOCACAO_PRECAD_EXCLUIR_V1: excluir pré-cadastro (qualquer status); se já virou locatário, exclui o locatário junto */
  function ExcluirPrecadastroModal(props) {
    var it = props.item || {};
    var aprovado = !!props.aprovado;
    var regras = aprovado ? [
      'Apaga o pré-cadastro e os documentos enviados.',
      'Ele já virou locatário: o locatário sai da locação junto.',
      'Com contratos encerrados: o histórico fica guardado.',
      props.tipo === 'tutts' ? 'Motoboy da Central: o login dele na Central continua.' : 'Pessoa de fora: o login dela na Central (CPF) é removido.',
      'Com contrato em andamento não dá: encerre o contrato antes.'
    ] : [
      'Apaga o pré-cadastro e os documentos enviados.',
      'O link de cadastro dessa pessoa deixa de funcionar.',
      'Não dá para desfazer. Se precisar, gere um convite novo.'
    ];
    return h(ExcluirModal, { api: props.api, url: '/precadastros/' + it.id, titulo: 'Excluir pré-cadastro', botao: 'Excluir pré-cadastro',
      nome: [it.nome || 'Pré-cadastro #' + it.id, it.doc].filter(Boolean).join(' · '), regras: regras, onClose: props.onClose,
      onFeito: function (r) {
        var cli = r && r.cliente;
        var msg = r && r.modo === 'arquivado' ? 'Pré-cadastro excluído · histórico do locatário mantido' : cli ? 'Pré-cadastro e locatário excluídos' : 'Pré-cadastro excluído';
        if (cli && cli.login_removido) msg += ' · login removido';
        props.toast(msg, 'success'); props.onFeito && props.onFeito(r);
      } });
  }

  var MOTO_VAZIA = { modelo: '', ano: '', cor: '', placa: '', chassi: '', renavam: '', valor_aquisicao: '', valor_documentacao: '', hodometro: '', tem_seguro: null, tem_rastreador: null, status_manual: 'disponivel', tipo: '', condicao: '', numero_motor: '' }; // LOCACAO_V3: condicao + nº motor
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
    var _lc = useState(false), lancar = _lc[0], setLancar = _lc[1]; // LOCACAO_V3: lançar cobrança do tarifário
    /* LOCACAO_CRLV_V1: importar CRLV-e, placa repetida, excluir moto */
    var _imp = useState(null), imp = _imp[0], setImp = _imp[1];
    var _fo = useState(null), foco = _fo[0], setFoco = _fo[1];
    var _ex = useState(false), excluir = _ex[0], setExcluir = _ex[1];
    var _pd = useState(null), placaDup = _pd[0], setPlacaDup = _pd[1];
    var _ar = useState(false), arrastando = _ar[0], setArrastando = _ar[1];
    var arqRef = useRef(null);
    var placaAtual = form ? String(form.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    useEffect(function () {
      if (placaAtual.length < 7) { setPlacaDup(null); return; }
      var t = setTimeout(function () {
        api('/motos-placa?placa=' + encodeURIComponent(placaAtual) + (novo ? '' : '&ignorar=' + props.id)).then(function (r) { setPlacaDup(r && r.existe ? r.moto : null); }).catch(function () { setPlacaDup(null); });
      }, 450);
      return function () { clearTimeout(t); };
    }, [placaAtual]);
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
          hodometro: m.hodometro != null ? String(m.hodometro) : '', tem_seguro: m.tem_seguro, tem_rastreador: m.tem_rastreador, status_manual: m.status_manual || 'disponivel', tipo: m.tipo_definido ? m.tipo : '', condicao: m.condicao || '', numero_motor: m.numero_motor || '' }); // LOCACAO_V3
      }).catch(function (e) { setErro(e.message); });
    }, [api, props.id, novo]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d || !form) return Spinner('Abrindo moto...');
    var m = d.moto || {}, vist = d.vistorias || [], ct = d.contrato_atual;
    var set = function (k, v) { setForm(function (f) { var n = Object.assign({}, f); n[k] = v; return n; }); };
    /* LOCACAO_CRLV_V1: importar o documento */
    var CAMPOS_CRLV = ['modelo', 'ano', 'cor', 'placa', 'renavam', 'chassi', 'numero_motor'];
    var ROT_CRLV = { modelo: 'Marca / modelo', ano: 'Ano/modelo', cor: 'Cor', placa: 'Placa', renavam: 'Renavam', chassi: 'Chassi', numero_motor: 'Nº do motor' };
    var normCmp = function (k, v) { v = String(v == null ? '' : v).toUpperCase(); return /^(placa|renavam|chassi|numero_motor)$/.test(k) ? v.replace(/[^A-Z0-9]/g, '') : CRLV.norm(v); };
    var impOk = imp && imp.fase === 'pronto' ? imp : null;
    var importar = function (file) {
      if (!file) return;
      if (!/pdf/i.test(file.type || '') && !/\.pdf$/i.test(file.name || '')) { toast('Escolha o CRLV-e em PDF', 'error'); return; }
      if (file.size > 8 * 1024 * 1024) { toast('PDF acima de 8 MB. Use o arquivo baixado do app.', 'error'); return; }
      var antes = imp && imp.antes ? imp.antes : Object.assign({}, form);
      setImp({ fase: 'lendo', nome: file.name, tamanho: file.size, antes: antes });
      var dataUrl = new Promise(function (ok, falha) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { falha(new Error('Não deu para ler o arquivo')); }; fr.readAsDataURL(file); });
      Promise.all([CRLV.lerArquivo(file), dataUrl]).then(function (r) {
        var lido = r[0], res = CRLV.parse(lido.itens);
        var nf = Object.assign({}, antes), aplicados = {}, conflitos = {};
        CAMPOS_CRLV.forEach(function (k) {
          var c = res.campos[k]; if (!c) return;
          if (!String(antes[k] == null ? '' : antes[k]).trim()) { nf[k] = c.valor; aplicados[k] = true; }
          else if (normCmp(k, antes[k]) === normCmp(k, c.valor)) aplicados[k] = true;
          else conflitos[k] = c.valor;
        });
        setForm(nf);
        setImp({ fase: 'pronto', nome: file.name, tamanho: file.size, arquivo: file, dataUrl: r[1], pdf: lido.pdf, paginas: lido.paginas, numPages: lido.numPages, res: res, aplicados: aplicados, conflitos: conflitos, antes: antes });
      }).catch(function (e) { setImp(null); toast(e && e.message ? e.message : 'Não deu para abrir o PDF', 'error'); });
    };
    var escolherArquivo = function () { if (arqRef.current) { arqRef.current.value = ''; arqRef.current.click(); } };
    var desfazerImp = function () { if (imp && imp.antes) setForm(imp.antes); setImp(null); setFoco(null); };
    var usarDoc = function (ks) {
      setForm(function (f) { var n = Object.assign({}, f); ks.forEach(function (k) { n[k] = imp.conflitos[k]; }); return n; });
      setImp(function (x) { var c = Object.assign({}, x.conflitos), a = Object.assign({}, x.aplicados); ks.forEach(function (k) { delete c[k]; a[k] = true; }); return Object.assign({}, x, { conflitos: c, aplicados: a }); });
    };
    var manterAtual = function (k) { setImp(function (x) { var c = Object.assign({}, x.conflitos); delete c[k]; return Object.assign({}, x, { conflitos: c }); }); };
    var inputArquivo = h('input', { key: 'arq', ref: arqRef, type: 'file', accept: 'application/pdf,.pdf', 'aria-label': 'Escolher o CRLV-e em PDF', style: { display: 'none' }, onChange: function (e) { importar(e.target.files && e.target.files[0]); } });
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
        valor_aquisicao: moedaParse(form.valor_aquisicao), valor_documentacao: moedaParse(form.valor_documentacao), hodometro: form.hodometro === '' ? null : parseInt(soDig(form.hodometro), 10), tem_seguro: form.tem_seguro, tem_rastreador: form.tem_rastreador, status_manual: form.status_manual, tipo: form.tipo || MotoArte.tipoPorModelo(form.modelo),
        condicao: form.condicao || null, numero_motor: String(form.numero_motor || '').trim().toUpperCase() || null }; // LOCACAO_V3
      if (impOk && impOk.res) { /* LOCACAO_CRLV_V1 */
        var ex = impOk.res.extras || {};
        if (Object.keys(ex).some(function (k) { return ex[k]; })) body.crlv_dados = ex;
        if (impOk.res.marca) body.marca = impOk.res.marca;
      }
      var docImp = impOk && impOk.dataUrl ? impOk : null;
      api(novo ? '/motos' : '/motos/' + props.id, { method: novo ? 'POST' : 'PUT', body: body })
        .then(function (r) {
          var nid = novo ? (r.id || (r.moto && r.moto.id)) : props.id;
          if (!docImp || !nid) return { r: r, nid: nid, doc: null };
          var exer = (docImp.res && docImp.res.extras && docImp.res.extras.exercicio) || '';
          return api('/motos/' + nid + '/documentos', { method: 'POST', body: { tipo: 'licenciamento', referencia: ('CRLV-e ' + exer).trim(), arquivo: docImp.dataUrl, nome_arquivo: docImp.nome } })
            .then(function () { return { r: r, nid: nid, doc: 'ok' }; }, function (e) { return { r: r, nid: nid, doc: e.message || 'erro' }; });
        })
        .then(function (x) {
          var r = x.r, nid = novo ? x.nid : null;
          if (x.doc === 'ok') toast((novo ? 'Moto cadastrada' : 'Alterações salvas') + ' · CRLV-e salvo em Documentos', 'success');
          else if (x.doc) toast((novo ? 'Moto cadastrada' : 'Alterações salvas') + ', mas o PDF não foi anexado: ' + x.doc + '. Anexe em Documentos da moto.', 'error');
          else toast(novo ? 'Moto cadastrada' : 'Alterações salvas', 'success');
          setImp(null); setFoco(null);
          props.aoMudar && props.aoMudar();
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
      setFoto({ titulo: (v.tipo_label || v.tipo) + ' · ' + posLabel(posicao), src: null }); // LOCACAO_V3
      api('/vistorias/' + v.id).then(function (r) {
        var f = ((r.vistoria && r.vistoria.fotos) || []).find(function (x) { return x.posicao === posicao; });
        setFoto({ titulo: (v.tipo_label || v.tipo) + ' · ' + posLabel(posicao), src: f ? f.foto : null, legenda: f && f.capturada_em ? 'Capturada em ' + fDH(f.capturada_em) + (f.lat ? ' · ' + Number(f.lat).toFixed(5) + ', ' + Number(f.lng).toFixed(5) : '') : null });
      }).catch(function (e) { setFoto(null); toast(e.message, 'error'); });
    };
    var acaoVist = function (url, body, msg) {
      return api(url, { method: 'POST', body: body || {} }).then(function () { toast(msg, 'success'); setModal(null); carregar(); props.aoMudar && props.aoMudar(); }).catch(function (e) { toast(e.message, 'error'); throw e; });
    };
    var contaTipo = function (t) { return vist.filter(function (v) { return v.tipo === t; }).length; };
    var vistF = vist.filter(function (v) { return fTipo === 'todas' || v.tipo === fTipo; });

    var tagMini = function (txt, ambar) { return h('span', { style: { fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '1px 7px', color: ambar ? '#92400e' : ROXO_ESC, background: ambar ? '#fffbeb' : '#f3e8fb', border: '1px solid ' + (ambar ? '#fde68a' : '#f3e8fb') } }, txt); };
    var campo = function (k, label, extra) {
      extra = extra || {};
      var ci = impOk && impOk.res.campos[k] ? impOk.res.campos[k] : null; /* LOCACAO_CRLV_V1 */
      var doDoc = !!(ci && impOk.aplicados[k] && normCmp(k, form[k]) === normCmp(k, ci.valor));
      var conferir = doDoc && ci.conferir;
      var conflito = impOk && impOk.conflitos[k] != null ? impOk.conflitos[k] : null;
      var hint = conferir ? ci.hint : extra.hint || (doDoc && ci.hint ? ci.hint : null);
      var hintCor = conferir ? '#92400e' : extra.hint ? extra.hintCor : (doDoc && ci.hint ? '#15803d' : extra.hintCor);
      var st = Object.assign({}, extra.mono ? { fontFamily: MONO } : {}, conferir || conflito ? { borderColor: '#f59e0b', background: '#fffbeb' } : doDoc ? { borderColor: '#c4a5e0', background: '#fcfaff' } : {});
      var lbl = doDoc || conflito ? h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } }, label, conferir ? tagMini('Conferir', true) : doDoc ? tagMini('CRLV') : tagMini('Diferente do documento', true)) : label;
      var foca = ci ? function () { setFoco(k); } : null, solta = ci ? function () { setFoco(function (f) { return f === k ? null : f; }); } : null;
      return h('div', { key: k, style: Object.assign({ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }, extra.span ? { gridColumn: '1 / -1' } : {}), onMouseEnter: foca, onMouseLeave: solta },
        h(Field, { label: lbl, req: extra.req, hint: hint, hintCor: hintCor },
          Input({ value: form[k], onChange: function (e) { set(k, e.target.value); }, onFocus: foca, onBlur: solta, placeholder: extra.ph || '', inputMode: extra.mode || null, style: st })),
        conflito != null ? h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: 10, padding: '8px 10px', fontSize: 12.5 } },
          h('span', { style: { flex: '1 1 160px', minWidth: 0, overflowWrap: 'anywhere' } }, 'No documento: ', h('b', { style: extra.mono ? { fontFamily: MONO } : null }, conflito)),
          Btn({ small: true, variant: 'pri', onClick: function () { usarDoc([k]); }, children: 'Usar do documento' }),
          Btn({ small: true, onClick: function () { manterAtual(k); }, children: 'Manter o atual' })) : null,
        k === 'placa' && placaDup ? h('div', { role: 'alert', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 10px', fontSize: 12.5, color: '#374151' } },
          h('span', { style: { flex: '1 1 160px' } }, h('b', { style: { color: '#991b1b' } }, 'Essa placa já está cadastrada'), ' na moto "' + [placaDup.modelo, placaDup.cor].filter(Boolean).join(' · ') + '".'),
          Btn({ small: true, variant: 'link', onClick: function () { nav({ tela: 'moto', id: placaDup.id }); }, children: 'Abrir essa moto' })) : null);
    };
    var simNao = function (k, label) {
      return h(Field, { label: label, req: true, hint: form[k] == null ? 'Obrigatório marcar Sim ou Não' : null, hintCor: '#92400e' }, Segmented([[true, 'Sim'], [false, 'Não']], form[k], function (v) { set(k, v); }, label));
    };
    /* LOCACAO_CRLV_V1: área de importação, faixa de resultado e dados extras do documento */
    var nPre = impOk ? CAMPOS_CRLV.filter(function (k) { return impOk.aplicados[k]; }).length : 0;
    var nConferir = impOk ? CAMPOS_CRLV.filter(function (k) { var c = impOk.res.campos[k]; return impOk.aplicados[k] && c && c.conferir && normCmp(k, form[k]) === normCmp(k, c.valor); }).length : 0;
    var conflitosK = impOk ? Object.keys(impOk.conflitos) : [];
    var exerc = impOk && impOk.res.extras.exercicio;
    var soltar = { onDragOver: function (e) { e.preventDefault(); if (!arrastando) setArrastando(true); }, onDragLeave: function () { setArrastando(false); },
      onDrop: function (e) { e.preventDefault(); setArrastando(false); importar(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); } };
    var icoBox = function (nome, bg, cor, tam) { return h('span', { style: { width: tam || 40, height: tam || 40, borderRadius: 11, background: bg, color: cor, display: 'grid', placeItems: 'center', flex: 'none' } }, ico(nome, 18)); };
    var acoesImp = [Btn({ key: 't', small: true, icon: 'upload', onClick: escolherArquivo, children: 'Trocar arquivo' }), Btn({ key: 'd', small: true, variant: 'link', onClick: desfazerImp, style: { color: '#6b7280', padding: '0 6px' }, children: 'Desfazer importação' })];
    var areaImport = !imp ? (novo
      ? h('div', Object.assign({ key: 'imp' }, soltar),
          h('button', { type: 'button', onClick: escolherArquivo, className: 'hover:bg-purple-50', style: { width: '100%', textAlign: 'left', border: '2px dashed ' + (arrastando ? ROXO : '#c4a5e0'), background: arrastando ? '#f3e8fb' : '#fcfaff', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', cursor: 'pointer' } },
            icoBox('filetext', '#f3e8fb', ROXO),
            h('span', { style: { flex: '1 1 260px', minWidth: 0 } },
              h('b', { style: { display: 'block', fontSize: 14, color: '#111827' } }, 'Preencher com o documento da moto'),
              h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Solte aqui o CRLV-e em PDF ou clique para escolher. A gente lê placa, Renavam, chassi, motor, marca/modelo, ano e cor.')),
            h('span', { style: { height: 38, padding: '0 14px', borderRadius: 10, background: ROXO, color: '#ffffff', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8, flex: 'none' } }, ico('upload', 15), 'Escolher PDF')))
      : h('div', Object.assign({ key: 'imp' }, soltar), h('button', { type: 'button', onClick: escolherArquivo, className: 'hover:bg-purple-50', style: { width: '100%', textAlign: 'left', border: '1.5px dashed ' + (arrastando ? ROXO : '#d8c3ea'), background: arrastando ? '#f3e8fb' : '#ffffff', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#374151', fontSize: 12.5 } },
          icoBox('filetext', '#f3e8fb', ROXO, 30), h('span', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { color: ROXO_ESC } }, 'Conferir com o documento da moto'), h('span', { style: { display: 'block', color: '#6b7280' } }, 'Solte o CRLV-e em PDF: mostra o que está diferente do cadastro.')))))
      : imp.fase === 'lendo' ? h('div', { key: 'imp', role: 'status', style: Object.assign({}, CARD, { padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }) },
          h('span', { style: { width: 40, height: 40, borderRadius: 11, background: '#fef2f2', color: '#b91c1c', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, flex: 'none' } }, 'PDF'),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, imp.nome), h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Lendo o documento…'),
            h('div', { style: { height: 6, borderRadius: 99, background: '#f3e8fb', marginTop: 8, overflow: 'hidden' } }, h('div', { className: 'animate-pulse', style: { width: '62%', height: '100%', background: ROXO, borderRadius: 99 } }))))
      : impOk.res.semTexto || !impOk.res.total ? h('div', { key: 'imp', role: 'alert', style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' } },
          icoBox('alert', '#fde68a', '#92400e', 32),
          h('div', { style: { flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 } },
            h('b', { style: { color: '#92400e' } }, impOk.res.semTexto ? 'Não deu para ler este PDF' : 'Não achamos os campos do CRLV nesse PDF'),
            h('span', { style: { color: '#374151' } }, impOk.res.semTexto ? 'Ele parece uma foto do documento, sem texto dentro. Preencha os campos olhando o documento ao lado: ele fica salvo junto da moto.' : 'Confira se é o CRLV-e. Dá para preencher à mão olhando o documento ao lado: ele fica salvo junto da moto.'),
            impOk.res.semTexto ? h('span', { style: { color: '#6b7280', fontSize: 12 } }, 'Dica: o CRLV-e baixado direto do app (não o print) sempre tem texto.') : null),
          h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } }, acoesImp))
      : h('div', { key: 'imp', role: 'status', style: { background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
          icoBox('check', ROXO, '#ffffff', 32),
          h('div', { style: { flex: '1 1 260px', minWidth: 0, fontSize: 13 } },
            h('b', null, 'Lemos o CRLV-e' + (exerc ? ' de ' + exerc : '')),
            h('div', { style: { color: '#374151' } }, nPre + (nPre === 1 ? ' campo preenchido' : ' campos preenchidos'),
              nConferir ? h('span', { style: { color: '#92400e', fontWeight: 600 } }, ' · ' + nConferir + ' para conferir') : null,
              conflitosK.length ? h('span', { style: { color: '#92400e', fontWeight: 600 } }, ' · ' + conflitosK.length + (conflitosK.length === 1 ? ' diferente do cadastro' : ' diferentes do cadastro')) : null,
              ' · o PDF fica salvo em Documentos da moto como Licenciamento' + (exerc ? ' ' + exerc : ''))),
          h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } },
            conflitosK.length > 1 ? Btn({ small: true, variant: 'pri', onClick: function () { usarDoc(conflitosK); }, children: 'Usar o documento em todos' }) : null, acoesImp));
    var fmtDoc = function (d) { d = String(d || ''); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : d; };
    var ext = impOk ? impOk.res.extras : (m.crlv_dados || null);
    var extrasCard = ext && (ext.combustivel || ext.cilindrada || ext.exercicio || ext.proprietario_nome) ? h('div', { key: 'ext', style: { display: 'flex', flexDirection: 'column', gap: 6 } },
      h('div', { style: { border: '1px solid #f3f4f6', background: '#f9fafb', borderRadius: 10, padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px 14px', fontSize: 12 } },
        [['Combustível', ext.combustivel, 'combustivel'], ['Cilindrada', ext.cilindrada ? ext.cilindrada + ' cc' : null, 'cilindrada'], ['Exercício do licenciamento', ext.exercicio, 'exercicio'],
          ['Proprietário no documento', ext.proprietario_nome ? ext.proprietario_nome + (ext.proprietario_doc ? ' · ' + fmtDoc(ext.proprietario_doc) : '') : null, 'proprietario_nome']].filter(function (x) { return x[1]; }).map(function (x) {
          var rx = impOk && impOk.res.rectsExtras[x[2]];
          return h('div', { key: x[0], style: { minWidth: 0, gridColumn: x[2] === 'proprietario_nome' ? '1 / -1' : null }, onMouseEnter: rx ? function () { setFoco('x_' + x[2]); } : null, onMouseLeave: rx ? function () { setFoco(null); } : null },
            h('span', { style: { color: '#6b7280' } }, x[0]), h('div', { style: { fontWeight: 600, color: '#111827', overflowWrap: 'anywhere' } }, x[1]));
        })),
      h('span', { style: { fontSize: 11.5, color: '#6b7280' } }, impOk ? 'Ficam guardados junto da moto quando você salvar.' : 'Do CRLV-e importado' + (ext.importado_em ? ' em ' + fD(ext.importado_em) : '') + '.')) : null;
    var formCard = h(Card, { pad: false },
      CardHead('Cadastro da moto', h('span', { style: { fontSize: 12, color: '#6b7280' } }, impOk && nPre ? h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, h('span', { style: { width: 8, height: 8, borderRadius: 99, background: ROXO } }), 'veio do documento · ') : null, '* obrigatório')),
      h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 } },
        !novo ? areaImport : null,
        h('div', { className: 'grid grid-cols-2', style: { gap: 12 } },
          campo('modelo', 'Marca / modelo', { req: true, span: true, ph: 'Ex.: Honda CG 160 Start' }),
          campo('ano', 'Ano/modelo', { ph: '2024/2024' }), campo('cor', 'Cor', { ph: 'Vermelha' }),
          campo('placa', 'Placa', { req: true, mono: true, ph: 'ABC1D23', hint: tipoPlaca, hintCor: tipoPlaca === 'Formato inválido' ? '#991b1b' : '#6b7280' }),
          campo('renavam', 'Renavam', { mono: true, mode: 'numeric' }),
          campo('chassi', 'Chassi', { mono: true, span: true }),
          campo('numero_motor', 'Nº do motor', { mono: true }), // LOCACAO_V3
          h(Field, { key: 'cond', label: 'Condição', hint: 'Seminova ou usada exige avarias no Anexo IV' }, Segmented(CONDICAO, form.condicao || null, function (v) { set('condicao', v); }, 'Condição')),
          campo('valor_aquisicao', 'Valor de aquisição', { ph: 'R$ 0,00', mode: 'decimal' }),
          campo('valor_documentacao', 'Documentação', { ph: 'R$ 0,00', mode: 'decimal', hint: 'Despachante + vistoria' }),
          campo('hodometro', 'Hodômetro (km)', { mode: 'numeric' }),
          h('div', { key: 'custo', style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 } }, h('span', { style: { fontSize: 11.5, color: '#6b7280' } }, 'Custo total da moto'), h('span', { style: Object.assign({ fontWeight: 700, fontSize: 15 }, TAB) }, fR(custo)))),
        extrasCard, /* LOCACAO_CRLV_V1 */
        h('div', { className: 'grid grid-cols-2', style: { gap: 12 } }, simNao('tem_seguro', 'Tem seguro?'), simNao('tem_rastreador', 'Tem rastreador?')),
        h(Field, { label: 'Tipo de moto', hint: form.tipo ? 'Usado no desenho enquanto não há foto de vistoria.' : 'Marcado pelo modelo digitado. Dá para trocar.' },
          Segmented(MotoArte.TIPOS, tipoEf, function (v) { set('tipo', v); }, 'Tipo de moto')),
        travadoContrato ? h(Field, { label: 'Status', req: true }, h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, pillMoto(ct ? Object.assign({}, m, { situacao: ct.situacao, situacao_label: ct.situacao_label, dias_atraso: ct.dias_atraso }) : m), h('span', { style: { fontSize: 12, color: '#6b7280' } }, 'automático pelo contrato')))
          : h(Field, { label: 'Status', req: true, hint: 'Só dá para mudar à mão entre Disponível e Manutenção, quando não há contrato.' }, Segmented([['disponivel', 'Disponível'], ['manutencao', 'Manutenção']], form.status_manual, function (v) { set('status_manual', v); }, 'Status')),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' } },
          !novo ? Btn({ variant: 'link', icon: 'trash', onClick: function () { setExcluir(true); }, style: { color: '#b91c1c', marginRight: 'auto', padding: '0 4px' }, children: 'Excluir moto' }) : null, /* LOCACAO_CRLV_V1 */
          Btn({ onClick: function () { setImp(null); if (novo) nav({ tela: 'lista', tab: 'motos' }); else carregar(); }, children: novo ? 'Cancelar' : 'Descartar' }),
          Btn({ variant: 'pri', icon: 'save', onClick: salvar, disabled: salvando, children: salvando ? 'Salvando...' : novo ? 'Cadastrar moto' : 'Salvar alterações' }))));

    /* LOCACAO_CRLV_V1: documento ao lado, abaixo do desenho */
    var marcas = impOk ? CAMPOS_CRLV.filter(function (k) { return impOk.res.campos[k] && impOk.res.campos[k].rect; }).map(function (k) {
      var c = impOk.res.campos[k]; return { k: k, rect: c.rect, conferir: !!c.conferir || impOk.conflitos[k] != null, titulo: ROT_CRLV[k] + ': ' + c.valor };
    }).concat(Object.keys(impOk.res.rectsExtras || {}).map(function (k) { return { k: 'x_' + k, rect: impOk.res.rectsExtras[k], titulo: k }; })) : [];
    var visor = impOk && impOk.pdf ? h(VisorPdf, { key: 'visor', pdf: impOk.pdf, paginas: impOk.paginas, numPages: impOk.numPages, nome: impOk.nome, tamanho: impOk.tamanho, arquivo: impOk.arquivo, marcas: marcas, ativo: foco, semTexto: impOk.res.semTexto || !impOk.res.total }) : null;
    var modalExcluir = excluir ? h(ExcluirModal, { api: api, url: '/motos/' + props.id, titulo: 'Excluir moto', botao: 'Excluir moto', nome: (m.modelo || 'Moto') + ' · ' + (m.placa || ''),
      regras: ['Sem histórico nenhum: a moto é apagada.', 'Com histórico (contratos encerrados, vistorias, ocorrências): ela sai da frota e das listas, e o histórico fica guardado. A placa fica livre para um cadastro novo.', 'Com contrato em andamento não dá: encerre o contrato antes.'],
      onClose: function () { setExcluir(false); },
      onFeito: function (r) { setExcluir(false); toast(r && r.modo === 'arquivada' ? 'Moto removida da frota · histórico mantido' : 'Moto excluída', 'success'); props.aoMudar && props.aoMudar(); nav({ tela: 'lista', tab: 'motos' }); } }) : null;

    if (novo) return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      inputArquivo,
      voltar(function () { nav({ tela: 'lista', tab: 'motos' }); }, 'Motos'),
      h('div', null, h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 20, fontWeight: 700 } }, 'Cadastrar moto'),
        impOk && impOk.res.total ? h('p', { style: { margin: '4px 0 0', fontSize: 13, color: '#6b7280' } }, 'Os campos foram preenchidos com o documento. Confira e salve.') : null),
      areaImport,
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' } },
        h('div', { style: { flex: '999 1 520px', maxWidth: visor ? 'none' : 640, minWidth: 0 } }, formCard),
        h('div', { style: Object.assign({ flex: visor ? '1 1 420px' : '1 1 320px', maxWidth: visor ? 560 : 460, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }, visor ? {} : { position: 'sticky', top: 80 }) },
          visor ? null : h('div', { style: { fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: '.04em', textTransform: 'uppercase' } }, 'Prévia'), capaCard, visor)));

    var novaOcModal = novaOc ? h(NovaOcorrenciaModal, { api: api, toast: toast, moto: m, contrato: ct, preset: novaOc, onClose: function () { setNovaOc(null); }, onSalvo: function () { setNovaOc(null); setComparar(false); setAba('ocorrencias'); carregar(); props.aoMudar && props.aoMudar(); } }) : null; // LOCACAO_V2
    if (comparar) return h(React.Fragment, null, h(CompararVistorias, { api: api, toast: toast, moto: m, vistorias: vist, voltar: function () { setComparar(false); carregar(); }, aoMudar: props.aoMudar, onApontar: function (pre) { setNovaOc(pre); } }), novaOcModal); // LOCACAO_V2
    var ocs = d.ocorrencias || [], avs = d.avisos || [];
    var ctAtivo = !!(ct && (ct.situacao === 'em_dia' || ct.situacao === 'atrasada' || ct.situacao === 'em_retomada' || ct.situacao === 'suspenso' || ct.status === 'ativo')); // LOCACAO_V3
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
          ctAtivo ? Btn({ icon: 'tag', onClick: function () { setLancar(true); }, children: 'Lançar cobrança' }) : null, // LOCACAO_V3
          Btn({ icon: 'plus', onClick: function () { setNovaOc({}); }, children: 'Nova ocorrência' }),
          Btn({ variant: 'pri', icon: 'camera', onClick: function () { setModal({ tipo: 'nova' }); }, children: 'Registrar vistoria (Anexo IV)' }))),
      h('div', { className: 'grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)] items-start' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, formCard, h(ArquivosMoto, { moto: m, arquivos: d.arquivos || [], api: api, toast: toast, aoMudar: carregar }),
          h('div', { id: 'loc-docs-moto', style: { scrollMarginTop: 80 } }, h(DocumentosMoto, { moto: m, documentos: d.documentos || [], api: api, toast: toast, aoMudar: carregar }))), // LOCACAO_V2
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          capaCard,
          visor, /* LOCACAO_CRLV_V1 */
          ct ? h(Card, null,
            h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' } },
              h('div', { style: { width: 38, height: 38, borderRadius: 99, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flex: 'none' } }, iniciais(ct.cliente_nome)),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Locatário atual'),
                h('div', { style: { fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }, ct.cliente_nome, TagTipo(ct.cliente_tipo), ct.cod_profissional ? h('span', { style: { fontWeight: 400, color: '#6b7280' } }, 'cód. ' + ct.cod_profissional) : null), // LOCACAO_V4
                h('div', { style: Object.assign({ fontSize: 12.5, color: '#374151', marginTop: 2 }, TAB) }, [fR(ct.valor_parcela != null ? ct.valor_parcela : ct.valor_semanal) + (ct.periodicidade === 'mensal' ? '/mês' : '/semana'), ct.vencimento_label ? 'vence ' + ct.vencimento_label : ct.dia_vencimento ? 'vence ' + DIA_PLURAL[ct.dia_vencimento] : null, (ct.prazo_qtd || ct.semanas) ? fN(ct.parcelas_pagas) + ' de ' + fN(ct.prazo_qtd || ct.semanas) + ' pagas' : null, ct.plano_label || null, ct.proximo_vencimento ? 'próxima ' + fDS(ct.proximo_vencimento, true) : null].filter(Boolean).join(' · '))),
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
              vist.length >= 2 ? Btn({ small: true, icon: 'eye', onClick: function () { setComparar(true); }, children: 'Comparar vistorias' }) : null, // LOCACAO_V2
              ctAtivo ? Btn({ small: true, icon: 'calendar', onClick: function () { setModal({ tipo: 'agendar' }); }, children: 'Agendar mensal' }) : null, // LOCACAO_V3
              ctAtivo ? Btn({ small: true, variant: 'perigo', onClick: function () { setModal({ tipo: 'naoCompareceu' }); }, children: 'Não compareceu' }) : null),
            d.vistoria_agendada ? h('div', { style: { padding: '9px 16px', background: '#faf7fd', borderBottom: '1px solid #f3f4f6', fontSize: 12.5, color: ROXO_ESC } }, ico('calendar', 13), ' Vistoria mensal na Base agendada para ' + fDH(d.vistoria_agendada.data_hora) + (d.vistoria_agendada.local ? ' · ' + d.vistoria_agendada.local : '') + ' (Cl. 9.4.1) · não comparecimento: R$ 100,00') : null,
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
                    h('div', { className: 'grid grid-cols-3 sm:grid-cols-6', style: { gap: 8 } }, posicoesDaVistoria(v).map(function (pos) { // LOCACAO_V3: 8 posições do Anexo IV
                      var f = (v.fotos || []).find(function (x) { return x.posicao === pos; });
                      return h('div', { key: pos }, Thumb(f && f.thumb, POS_LABEL[pos] || pos, f ? function () { abrirFotoVist(v, pos); } : null));
                    })),
                    (v.checklist && v.checklist.length) || v.combustivel ? h('div', { style: { fontSize: 12, color: '#6b7280', marginTop: 6 } }, [v.combustivel ? 'combustível ' + v.combustivel : null, v.checklist && v.checklist.length ? v.checklist.filter(function (x) { return x.situacao !== 'avaria'; }).length + ' OK · ' + v.checklist.filter(function (x) { return x.situacao === 'avaria'; }).length + ' com avaria' : null, v.avarias && v.avarias.length ? v.avarias.length + ' avaria' + (v.avarias.length === 1 ? '' : 's') + ' pré-existente' + (v.avarias.length === 1 ? '' : 's') : v.sem_avarias ? 'sem avarias pré-existentes' : null].filter(Boolean).join(' · ')) : null,
                    h('div', { style: { marginTop: 8 } }, h(AcoesAnexoIV, { api: api, toast: toast, v: v, aoMudar: carregar })),
                    v.observacoes ? h('div', { style: { marginTop: 8, fontSize: 12.5, color: v.avaria ? '#991b1b' : '#374151', background: v.avaria ? '#fef2f2' : '#f9fafb', borderRadius: 8, padding: '8px 10px' } }, v.avaria ? h('b', null, 'Avaria: ') : null, v.observacoes) : null,
                    aberta ? h('div', { style: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } },
                      Btn({ variant: 'pri', small: true, icon: 'check', onClick: function () { acaoVist('/vistorias/' + v.id + '/aprovar', {}, 'Vistoria aprovada'); }, children: 'Aprovar vistoria' }),
                      Btn({ variant: 'perigo', small: true, icon: 'alert', onClick: function () { setModal({ tipo: 'avaria', v: v }); }, children: 'Apontar avaria' })) : null));
              }))))),
      modal && modal.tipo === 'nova' ? h(VistoriaAnexoIVModal, { api: api, toast: toast, moto: m, contrato: ct, tipo: (d.vistoria_pendente && d.vistoria_pendente.tipo) || (ct && ct.status === 'aguardando_assinatura' ? 'retirada' : undefined), onClose: function () { setModal(null); }, aoSalvar: function () { setModal(null); setAba('vistorias'); carregar(); props.aoMudar && props.aoMudar(); } }) : null, // LOCACAO_V3: Termo Anexo IV
      modal && modal.tipo === 'agendar' ? h(AgendarVistoriaModal, { onClose: function () { setModal(null); }, onConfirm: function (b) { return acaoVist('/vistorias/agendar', { moto_id: m.id, data_hora: b.data_hora }, 'Vistoria agendada · locatário avisado'); } }) : null,
      modal && modal.tipo === 'naoCompareceu' ? h(MotivoModal, { titulo: 'Não compareceu à vistoria mensal', label: 'Observação', botao: 'Lançar tarifa de R$ 100,00', perigo: true,
        texto: 'Lança a tarifa do Anexo I “Não comparecimento à vistoria mensal na Base” (Cl. 9.4.1) na próxima parcela' + (d.vistoria_agendada ? ', referente ao agendamento de ' + fDH(d.vistoria_agendada.data_hora) : '') + '.', onClose: function () { setModal(null); }, onConfirm: function (t) { return acaoVist('/vistorias/nao-compareceu', { moto_id: m.id, data: d.vistoria_agendada ? String(d.vistoria_agendada.data_hora).slice(0, 10) : hojeISO(), observacao: t || null }, 'Tarifa lançada'); } }) : null,
      lancar ? h(LancarCobrancaModal, { api: api, toast: toast, moto: m, contrato: ct, onClose: function () { setLancar(false); }, onSalvo: function () { setLancar(false); setAba('ocorrencias'); carregar(); props.aoMudar && props.aoMudar(); } }) : null,
      modal && modal.tipo === 'avaria' ? h(MotivoModal, { titulo: 'Apontar avaria', label: 'Descreva a avaria', hint: 'Fica registrada na vistoria e no histórico da moto.', botao: 'Registrar avaria', perigo: true, obrigatorio: true,
        onClose: function () { setModal(null); }, onConfirm: function (txt) { return acaoVist('/vistorias/' + modal.v.id + '/avaria', { descricao: txt }, 'Avaria registrada'); } }) : null,
      novaOcModal, // LOCACAO_V2
      inputArquivo, modalExcluir, /* LOCACAO_CRLV_V1 */
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
        h(VistoriaV3Info, { v: v }), // LOCACAO_V3
        h('div', null, h(AcoesAnexoIV, { api: api, toast: toast, v: Object.assign({ id: props.id }, v), aoMudar: props.aoMudar })),
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-4', style: { gap: 10 } }, (v.fotos || []).map(function (f) {
          var lab = posLabel(f.posicao);
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
        Chips([{ id: 'todos', t: 'Todos', n: lista.length }, { id: 'aguardando_assinatura', t: 'Aguardando assinatura', n: cnt('aguardando_assinatura') }, { id: 'em_dia', t: 'Em dia', n: cnt('em_dia') }, { id: 'atrasada', t: 'Em atraso', n: cnt('atrasada') }, { id: 'em_retomada', t: 'Em retomada', n: cnt('em_retomada') }, { id: 'suspenso', t: 'Suspensos', n: cnt('suspenso') }, { id: 'quitado', t: 'Quitados', n: cnt('quitado') }, { id: 'encerrados', t: 'Encerrados', n: cnt('encerrado') + cnt('recusado') + cnt('cancelado') }], filtro, setFiltro),
        h('div', { style: { flex: 1 } }),
        Busca(q, setQ, 'Nº, cliente ou placa')),
      lista.length === 0 ? Vazio('Nenhum contrato ainda', 'Aprove um pré-cadastro e cadastre uma moto para criar o primeiro.', Btn({ variant: 'pri', icon: 'plus', onClick: function () { nav({ tela: 'novoContrato' }); }, children: 'Novo contrato' })) :
      fl.length === 0 ? Vazio('Nenhum contrato neste filtro') :
      Tabela([{ t: 'Contrato' }, { t: 'Locatário' }, { t: 'Moto' }, { t: 'Parcela', right: true }, { t: 'Pagas' }, { t: 'Saldo devedor', right: true }, { t: 'Próx. vencimento' }, { t: 'Situação' }],
        fl.map(function (c) {
          return Linha(c.id, [
            { td: 1, v: h('div', null, h('div', { style: { fontWeight: 600, fontFamily: MONO, fontSize: 12.5 } }, c.numero), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, fD(c.criado_em))) },
            { td: 1, v: h('div', null, c.cliente_nome, h('div', { style: { marginTop: 3 } }, TagTipo(c.cliente_tipo))) }, // LOCACAO_V4
            { td: 1, v: h('div', null, c.moto_modelo, h('div', { style: { fontSize: 11.5, color: '#6b7280', fontFamily: MONO } }, c.placa)) },
            { td: 1, v: h('div', null, fR(c.valor_parcela != null ? c.valor_parcela : c.valor_semanal), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, (c.periodicidade === 'mensal' ? 'mensal' : 'semanal') + (c.plano_label ? ' · ' + c.plano_label : ''))), right: true }, // LOCACAO_V3
            { td: 1, v: fN(c.parcelas_pagas) + ' de ' + fN(c.prazo_qtd || c.semanas), st: { whiteSpace: 'nowrap' } },
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

  // LOCACAO_V3: Novo contrato montado a partir do Demonstrativo real (Tutts Aluguel / Plano Conquista) + importar contrato já assinado
  function NovoContratoView(props) {
    var api = props.api, toast = props.toast, nav = props.nav;
    var _c = useState(null), clientes = _c[0], setClientes = _c[1];
    var _m = useState(null), motos = _m[0], setMotos = _m[1];
    var _cfg = useState(null), cfg = _cfg[0], setCfg = _cfg[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _cl = useState(props.cliente_id ? String(props.cliente_id) : ''), cliId = _cl[0], setCliId = _cl[1];
    var _mo = useState(''), motoId = _mo[0], setMotoId = _mo[1];
    var _f = useState({ plano: 'conquista', periodicidade: 'mensal', prazo: '24', dia_semana: '', dia_mes: '', valor: '', inicio: '', caucao_isento: true, caucao: '', base: '', area_km: '', area_mun: '', manutencao: 'locatario',
      pix: true, boleto: false, cartao: false, desconto: false, opcao: '10,00', km: '' }), f = _f[0], setF = _f[1];
    var _imp = useState(!!props.importar), importar = _imp[0], setImportar = _imp[1];
    var _pdf = useState(null), pdf = _pdf[0], setPdf = _pdf[1];
    var _pa = useState(''), pagasAte = _pa[0], setPagasAte = _pa[1];
    /* LOCACAO_IMPORTAR_LEITURA_V1: leitura do PDF assinado + prévia grande */
    var _lt = useState(null), leitura = _lt[0], setLeitura = _lt[1];
    var _ln = useState(false), lendo = _ln[0], setLendo = _ln[1];
    var _fc = useState(null), foco = _fc[0], setFoco = _fc[1];
    var _ab = useState('contrato'), abaPrev = _ab[0], setAbaPrev = _ab[1];
    var _tm = useState([]), todasMotos = _tm[0], setTodasMotos = _tm[1];
    var _arr = useState(false), arrastando = _arr[0], setArrastando = _arr[1];
    var kmPdf = useRef(null);
    var arqContrato = useRef(null);
    var _sim = useState(null), sim = _sim[0], setSim = _sim[1];
    var _rm = useState(null), repMedio = _rm[0], setRepMedio = _rm[1]; // LOCACAO_V4
    var _s = useState(false), salvando = _s[0], setSalvando = _s[1];
    var set = function (k, v) { setF(function (x) { var n = Object.assign({}, x); n[k] = v; if (k === 'plano' && v === 'conquista') n.manutencao = 'locatario'; return n; }); };
    var carregar = useCallback(function () {
      setErro(null);
      Promise.all([api('/clientes?sem_contrato=1'), api('/motos'), api('/config').catch(function () { return {}; })]).then(function (r) {
        setClientes(r[0].clientes || []); setMotos((r[1].motos || []).filter(function (m) { return m.status === 'disponivel'; })); setTodasMotos(r[1].motos || []); setCfg(r[2] || {});
        var loc = (r[2] && r[2].locadora) || {}, bases = (r[2] && r[2].bases) || [];
        var bp = bases.find(function (b) { return b.padrao; }) || bases[0];
        setF(function (x) { return Object.assign({}, x, { base: x.base || (bp ? String(bp.id != null ? bp.id : 0) : ''), area_km: x.area_km || String(loc.area_raio_km || 100), area_mun: x.area_mun || loc.area_municipio || 'Salvador/BA' }); });
      }).catch(function (e) { setErro(e.message); });
    }, [api]);
    useEffect(carregar, [carregar]);
    var cli = (clientes || []).find(function (c) { return String(c.id) === cliId; });
    var moto = (motos || []).find(function (m) { return String(m.id) === motoId; });
    useEffect(function () {
      if (cli && !leitura) { /* LOCACAO_VENC_MENSAL_V1: o vencimento escolhido no cadastro vira o padrão do contrato */
        if (cli.venc_periodicidade === 'mensal') { set('periodicidade', 'mensal'); if (cli.venc_dia_mes) set('dia_mes', String(cli.venc_dia_mes)); }
        else if (cli.venc_periodicidade === 'semanal' && cli.dia_vencimento) { set('periodicidade', 'semanal'); set('dia_semana', String(cli.dia_vencimento)); setF(function (x) { return x.prazo === '24' ? Object.assign({}, x, { prazo: '104' }) : x; }); }
      }
      if (cli && !f.dia_semana && cli.dia_vencimento) set('dia_semana', String(cli.dia_vencimento)); if (cli && cli.tipo !== 'tutts' && f.desconto) set('desconto', false); }, [cliId, clientes]);
    useEffect(function () { if (moto && kmPdf.current == null) set('km', moto.hodometro != null ? String(moto.hodometro) : ''); }, [motoId]); /* LOCACAO_IMPORTAR_LEITURA_V1: km do contrato manda */
    useEffect(function () { setRepMedio(null); if (cli && cli.tipo === 'tutts') api('/clientes/' + cli.id + '/repasse-medio').then(setRepMedio).catch(function () { setRepMedio(null); }); }, [cliId, clientes]); // LOCACAO_V4
    useEffect(function () { var d = parseData(f.inicio); if (d && !f.dia_mes) set('dia_mes', String(Math.min(28, d.getDate()))); }, [f.inicio]);
    var bases = (cfg && cfg.bases) || [];
    var baseSel = bases.find(function (b, i) { return String(b.id != null ? b.id : i) === f.base; });
    var mensal = f.periodicidade === 'mensal';
    var vNum = moedaParse(f.valor), nPr = parseInt(f.prazo, 10), dia = mensal ? parseInt(f.dia_mes, 10) : parseInt(f.dia_semana, 10);
    var formas = ['pix', 'boleto', 'cartao'].filter(function (k) { return f[k]; });
    var caucaoN = f.caucao_isento ? 0 : moedaParse(f.caucao);
    var body = function () {
      return { cliente_id: cli && cli.id, moto_id: moto && moto.id, plano: f.plano, periodicidade: f.periodicidade, prazo_qtd: nPr, dia_vencimento: mensal ? null : dia, dia_mes: mensal ? dia : null, valor_parcela: vNum, data_inicio: f.inicio,
        caucao_valor: caucaoN || 0, manutencao: f.plano === 'conquista' ? 'locatario' : f.manutencao, area_raio_km: parseInt(f.area_km, 10) || null, area_municipio: f.area_mun.trim() || null,
        base_retirada: baseSel ? [baseSel.nome, baseSel.endereco].filter(Boolean).join(' · ') : null, base_id: baseSel && baseSel.id != null ? baseSel.id : null,
        formas_pagamento: formas, autoriza_desconto_repasse: !!(f.desconto && cli && cli.tipo === 'tutts'), valor_opcao_compra: f.plano === 'conquista' ? moedaParse(f.opcao) : null, km_entrega: f.km === '' ? null : parseInt(soDig(f.km), 10) };
    };
    var basico = cli && vNum > 0 && nPr > 0 && f.inicio && dia > 0;
    var completo = basico && moto && formas.length && (f.caucao_isento || caucaoN > 0) && (f.plano !== 'conquista' || moedaParse(f.opcao) > 0) && (!importar || pdf);
    var simKey = useDebounce(basico ? JSON.stringify(body()) : '', 350);
    useEffect(function () {
      if (!simKey) { setSim(null); return; }
      api('/contratos/simular', { method: 'POST', body: JSON.parse(simKey) }).then(setSim).catch(function () { setSim(null); });
    }, [simKey]);
    if (erro) return Erro(erro, carregar);
    if (!clientes || !motos || !cfg) return Spinner('Carregando clientes e motos...');
    // prévia local (o backend é a fonte da verdade)
    var ini = parseData(f.inicio), prim = null, ult = null, term = null;
    if (ini && dia > 0 && nPr > 0) {
      if (mensal) { prim = new Date(ini.getFullYear(), ini.getMonth(), dia); if (prim < ini) prim = addMeses(prim, 1); ult = addMeses(prim, nPr - 1); term = addDias(addMeses(ini, nPr), -1); }
      else { prim = primeiroVenc(f.inicio, dia); ult = addDias(prim, 7 * (nPr - 1)); term = addDias(ini, 7 * nPr - 1); }
    }
    if (sim) { prim = parseData(sim.primeiro_vencimento) || prim; ult = parseData(sim.ultimo_vencimento) || ult; term = parseData(sim.termino) || term; }
    var total = sim && sim.total != null ? sim.total : (vNum > 0 && nPr > 0 ? Math.round(vNum * nPr * 100) / 100 : null);
    var vencLabel = sim && sim.vencimento_label ? sim.vencimento_label : mensal ? (dia > 0 ? 'todo dia ' + p2(dia) : '—') : (DIA_PLURAL[dia] || '—');
    var reaj = sim ? !!sim.reajuste : (mensal ? nPr > 12 : nPr > 52);
    var enc = Object.assign({ multa_pct: 2, juros_mes_pct: 1, dias_rescisao: 7 }, cfg.encargos || {});
    var docs = (sim && sim.documentos) || [
      { id: 'contrato', titulo: 'Contrato + Demonstrativo (Quadro-Resumo)', incluso: true }, { id: 'anexo_i', titulo: 'Anexo I · Tarifário', incluso: true },
      { id: 'anexo_ii', titulo: 'Anexo II · Opção de Compra', incluso: f.plano === 'conquista' }, { id: 'anexo_iii', titulo: 'Anexo III · Autorização de desconto', incluso: !!(f.desconto && cli && cli.tipo === 'tutts') },
      { id: 'anexo_iv', titulo: 'Anexo IV · Termo de vistoria e fotos', incluso: false, sub: 'gerado da vistoria de entrega' }];
    var gerar = function () {
      setSalvando(true);
      var b = body();
      var req = importar ? api('/contratos/importar', { method: 'POST', body: Object.assign(b, { pdf_assinado: pdf && pdf.conteudo, parcelas_pagas_ate: pagasAte || null }) }) : api('/contratos', { method: 'POST', body: b });
      req.then(function (r) {
        if (importar) toast('Contrato importado · ' + (r.parcelas_pagas ? r.parcelas_pagas + ' parcela' + (r.parcelas_pagas === 1 ? '' : 's') + ' marcada' + (r.parcelas_pagas === 1 ? '' : 's') + ' como paga' + (r.parcelas_pagas === 1 ? '' : 's') : 'parcelas geradas'), 'success');
        else if (r.etapa === 'vistoria') toast('Contrato criado · próximo passo: vistoria de entrega na Base (a assinatura sai depois dela)', 'success'); // LOCACAO_FLUXO_V1
        else toast(r.autentique && r.autentique.enviado ? 'Contrato gerado e enviado ao Autentique' : 'Contrato gerado' + (r.autentique && r.autentique.motivo ? ' · Autentique: ' + r.autentique.motivo : ''), r.autentique && r.autentique.enviado === false ? 'error' : 'success');
        props.aoMudar && props.aoMudar();
        nav({ tela: 'contrato', id: r.contrato_id }, true);
      }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalvando(false); });
    };
    var linha = function (a, b) { return h('div', { key: a, style: { display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 } }, h('span', { style: { color: '#6b7280' } }, a), h('span', { style: Object.assign({ fontWeight: 600, textAlign: 'right' }, TAB) }, b)); };
    var cliInfo = cli ? [
      [cli.nacionalidade, cli.estado_civil, cli.profissao, cli.cpf_mascarado ? 'CPF ' + cli.cpf_mascarado : null, cli.rg ? 'RG ' + cli.rg + (cli.rg_orgao ? ' ' + cli.rg_orgao : '') : null].filter(Boolean).join(' · '),
      [cli.cnh_numero ? 'CNH ' + cli.cnh_numero : null, cli.cnh_categoria ? 'cat. ' + cli.cnh_categoria : null, cli.cnh_validade ? 'válida até ' + fD(cli.cnh_validade) : null, cli.cnh_ear === false ? 'sem EAR' : cli.cnh_ear ? 'com EAR' : null, cli.whatsapp ? fTel(cli.whatsapp) : null, cli.email].filter(Boolean).join(' · ')
    ].filter(Boolean) : [];
    var prazoHint = ini && term ? 'início ' + fDC(ini) + ' · término ' + fD(term) : (mensal ? 'meses' : 'semanas');
    // ───── LOCACAO_IMPORTAR_LEITURA_V1: lê o contrato assinado e preenche o formulário ─────
    var fCPFm = function (d) { d = String(d || ''); return d.length === 11 ? d.slice(0, 3) + '.' + d.slice(3, 6) + '.' + d.slice(6, 9) + '-' + d.slice(9) : d; };
    var nmz = function (x) { return String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); };
    var STATUS_MOTO = { disponivel: 'disponível', reservada: 'reservada', alugada: 'alugada', manutencao: 'em manutenção', em_retomada: 'em retomada' };
    var aplicarLeitura = function (res, doc) {
      var C = res.campos, patch = {}, extra = {};
      ['plano', 'periodicidade', 'prazo', 'inicio', 'valor', 'dia_mes', 'dia_semana', 'caucao', 'area_km', 'area_mun', 'manutencao', 'km', 'opcao'].forEach(function (k) { if (C[k]) patch[k] = String(C[k].valor); });
      ['caucao_isento', 'pix', 'boleto', 'cartao', 'desconto'].forEach(function (k) { if (C[k]) patch[k] = !!C[k].valor; });
      if (patch.plano === 'conquista') patch.manutencao = 'locatario';
      // base: casa pelo nome cadastrado
      var baseAntes = f.base;
      if (C.base) {
        var bv = LEITOR.norm(C.base.valor);
        var bx = bases.map(function (b, i) { return { id: String(b.id != null ? b.id : i), nome: LEITOR.norm(b.nome || ''), full: LEITOR.norm([b.nome, b.endereco].filter(Boolean).join(' · ')) }; });
        var exata = bx.find(function (b) { return b.full === bv || (b.nome && b.nome === bv); });
        var parecida = exata || bx.find(function (b) { return b.nome && (bv.indexOf(b.nome) === 0 || b.nome.indexOf(bv.split(' · ')[0]) === 0); });
        if (parecida) { patch.base = parecida.id; if (!exata) extra.base = { hint: 'No PDF: “' + C.base.valor + '”. Escolhemos a base mais parecida.' }; }
        else extra.base = { hint: 'A base do PDF (“' + C.base.valor + '”) não está cadastrada. Escolha uma.', semPar: true };
      }
      kmPdf.current = patch.km != null ? patch.km : null;
      // moto: placa ou chassi do contrato
      var placa = res.id.placa && res.id.placa.valor, chassi = res.id.chassi && res.id.chassi.valor, motoInfo = null;
      var mAll = (placa || chassi) ? (todasMotos || []).find(function (m) { return (placa && nmz(m.placa) === placa) || (chassi && m.chassi && nmz(m.chassi) === chassi); }) : null;
      if (mAll) {
        var disp = (motos || []).find(function (m) { return m.id === mAll.id; });
        motoInfo = { id: mAll.id, ok: !!disp, rotulo: [mAll.modelo, mAll.placa].filter(Boolean).join(' · '), status: STATUS_MOTO[mAll.status] || mAll.status };
        if (disp) setMotoId(String(mAll.id));
        if (patch.km && mAll.hodometro != null && Number(patch.km) !== Number(mAll.hodometro)) extra.km = { hint: 'A moto está com ' + fN(mAll.hodometro) + ' km no cadastro.' };
      } else if (placa) motoInfo = { ok: false, naoAchada: true, rotulo: 'Placa ' + placa + (res.id.modelo ? ' · ' + res.id.modelo.valor : '') };
      setLeitura(Object.assign({}, doc, { res: res, aplicados: patch, extra: extra, baseAntes: baseAntes, motoInfo: motoInfo, cliInfo: res.id.cpf ? { buscando: true } : null }));
      setF(function (x) { return Object.assign({}, x, patch); });
      setAbaPrev('contrato');
      // locatário: CPF do contrato
      var cpfL = res.id.cpf && res.id.cpf.valor;
      if (cpfL) api('/contratos/importar/identificar', { method: 'POST', body: { cpf: cpfL } }).then(function (r) {
        var info;
        if (r.cliente) {
          var naLista = (clientes || []).find(function (c) { return c.id === r.cliente.id; });
          info = { id: r.cliente.id, nome: r.cliente.nome, ok: !!naLista && !r.cliente.em_contrato, emContrato: !!r.cliente.em_contrato, cod: r.cliente.cod_profissional };
          if (info.ok) setCliId(String(r.cliente.id));
        } else info = { ok: false, naoAchado: true, pre: r.precadastro || null };
        setLeitura(function (l) { return l ? Object.assign({}, l, { cliInfo: info }) : l; });
      }).catch(function () { setLeitura(function (l) { return l ? Object.assign({}, l, { cliInfo: { ok: false, erro: true } }) : l; }); });
      var nLidos = Object.keys(C).length;
      if (res.semTexto) toast('O PDF não tem texto (parece escaneado). Preencha olhando a prévia.', 'error');
      else if (!nLidos) toast('Não achamos o Quadro-Resumo nesse PDF. Preencha olhando a prévia.', 'error');
      else toast('Lemos o contrato · ' + nLidos + ' campos preenchidos', 'success');
    };
    var lerContrato = function (fl) {
      if (!fl) return;
      if (!/pdf/i.test(fl.type || '') && !/\.pdf$/i.test(fl.name || '')) { toast('Envie o contrato em PDF', 'error'); return; }
      if (fl.size > 15 * 1024 * 1024) { toast('PDF acima de 15 MB', 'error'); return; }
      setLendo(true); setFoco(null);
      var dataUrl = lerArquivo(fl).then(function (u) { return String(u).replace(/^data:[^;,]*;base64,/, 'data:application/pdf;base64,'); });
      Promise.all([CRLV.lerArquivo(fl, { maxPaginas: 40, maxTexto: 4 }), dataUrl]).then(function (r) {
        var lido = r[0];
        setPdf({ nome: fl.name, conteudo: r[1] });
        aplicarLeitura(LEITOR.parse(lido.itens), { pdf: lido.pdf, paginas: lido.paginas, numPages: lido.numPages, nome: fl.name, tamanho: fl.size, arquivo: fl });
      }).catch(function (e) { toast((e && e.message) || 'Não deu para ler o PDF', 'error'); }).then(function () { setLendo(false); });
    };
    var inputContrato = h('input', { key: 'arqc', ref: arqContrato, type: 'file', accept: 'application/pdf,.pdf', 'aria-label': 'Escolher o contrato assinado em PDF', style: { display: 'none' },
      onChange: function (e) { var fl = e.target.files && e.target.files[0]; e.target.value = ''; lerContrato(fl); } });
    var escolherContrato = function () { if (arqContrato.current) arqContrato.current.click(); };
    var LC = leitura ? leitura.res.campos : {};
    var UI_CAMPO = { venc: LC.dia_mes ? 'dia_mes' : 'dia_semana', formas: 'pix' };
    /* estado de um campo vindo do PDF: null | 'lido' | 'conferir' */
    var estado = function (k) {
      if (!leitura) return null;
      var ck = UI_CAMPO[k] || k, ex = leitura.extra[k], ap = leitura.aplicados;
      if (k === 'base' && ex) return f.base === (ap.base != null ? ap.base : leitura.baseAntes) ? 'conferir' : null;
      if (k === 'venc') { var dk = f.periodicidade === 'mensal' ? 'dia_mes' : 'dia_semana'; if (ap[dk] == null || String(f[dk]) !== String(ap[dk]) || f.periodicidade !== ap.periodicidade) return null; return LC.periodicidade && LC.periodicidade.conferir ? 'conferir' : 'lido'; }
      if (k === 'formas') return ['pix', 'boleto', 'cartao', 'desconto'].every(function (x) { return ap[x] == null || f[x] === ap[x]; }) && ap.pix != null ? 'lido' : null;
      if (k === 'caucao_isento') { if (ap.caucao_isento == null || f.caucao_isento !== ap.caucao_isento) return null; return 'lido'; }
      if (ap[ck] == null || String(f[ck]) !== String(ap[ck])) return null;
      return (LC[ck] && LC[ck].conferir) || ex ? 'conferir' : 'lido';
    };
    var tagMiniC = function (txt, ambar) { return h('span', { style: { fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '1px 7px', color: ambar ? '#92400e' : ROXO_ESC, background: ambar ? '#fffbeb' : '#f3e8fb', border: '1px solid ' + (ambar ? '#fde68a' : '#f3e8fb') } }, txt); };
    var tg = function (k, label) { var e = estado(k); return e ? h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } }, label, tagMiniC(e === 'conferir' ? 'Conferir' : 'do contrato', e === 'conferir')) : label; };
    var hn = function (k, padrao) {
      var e = estado(k); if (e !== 'conferir') return padrao;
      var ck = UI_CAMPO[k] || k, ex = leitura.extra[k];
      return (ex && ex.hint) || (LC[ck] && LC[ck].hint) || (LC.periodicidade && LC.periodicidade.hint) || padrao;
    };
    var hc = function (k, padrao) { return estado(k) === 'conferir' ? '#92400e' : padrao; };
    var st = function (k, base) { var e = estado(k); return Object.assign({}, base || {}, e === 'conferir' ? { borderColor: '#f59e0b', background: '#fffbeb' } : e === 'lido' ? { borderColor: '#c4a5e0', background: '#fcfaff' } : {}); };
    var hv = function (k) { return leitura ? { onMouseEnter: function () { setFoco(k); }, onMouseLeave: function () { setFoco(function (x) { return x === k ? null : x; }); } } : {}; };
    /* marcas na prévia: uma por linha do Quadro-Resumo */
    var chaveRect = function (r) { return r ? r.page + '_' + Math.round(r.y) : null; };
    var marcasC = [], vistos = {};
    if (leitura) {
      var addM = function (k, r, conf, titulo) { var ch = chaveRect(r); if (!ch) return; if (vistos[ch]) { if (conf) vistos[ch].conferir = true; return; } vistos[ch] = { k: ch, rect: r, conferir: !!conf, titulo: titulo }; marcasC.push(vistos[ch]); };
      Object.keys(LC).forEach(function (k) { addM(k, LC[k].rect, LC[k].conferir || !!leitura.extra[k], LC[k].origem || ''); });
      ['cpf', 'nome', 'placa'].forEach(function (k) { var x = leitura.res.id[k]; if (x) addM(k, x.rect, false, x.valor); });
      if (leitura.extra.base && LC.base) vistos[chaveRect(LC.base.rect)].conferir = true;
      if (leitura.extra.km && LC.km) vistos[chaveRect(LC.km.rect)].conferir = true;
    }
    var rectDoFoco = function () {
      if (!leitura || !foco) return null;
      if (foco === 'cliente') return leitura.res.id.cpf ? chaveRect(leitura.res.id.cpf.rect) : null;
      if (foco === 'moto') return leitura.res.id.placa ? chaveRect(leitura.res.id.placa.rect) : null;
      var ck = UI_CAMPO[foco] || foco; return LC[ck] ? chaveRect(LC[ck].rect) : null;
    };
    var nLidosC = leitura ? Object.keys(LC).length : 0;
    var nConfC = leitura ? ['plano', 'periodicidade', 'prazo', 'inicio', 'valor', 'venc', 'caucao_isento', 'base', 'area_km', 'manutencao', 'km', 'opcao'].filter(function (k) { return estado(k) === 'conferir'; }).length : 0;
    var cliDif = leitura && leitura.cliInfo && leitura.cliInfo.id && cli && cli.id !== leitura.cliInfo.id;
    var motoDif = leitura && leitura.motoInfo && leitura.motoInfo.id && moto && moto.id !== leitura.motoInfo.id;
    var caixaInfo = function (tom, titulo, texto) {
      var cores = tom === 'ok' ? ['#bbf7d0', '#f0fdf4', '#166534'] : tom === 'erro' ? ['#fecaca', '#fef2f2', '#991b1b'] : ['#fde68a', '#fffbeb', '#92400e'];
      return h('div', { style: { border: '1px solid ' + cores[0], background: cores[1], borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12.5 } },
        h('b', { style: { color: '#111827', fontSize: 13 } }, titulo), h('span', { style: { color: cores[2] } }, texto));
    };
    var conferenciaCliMoto = leitura ? h('div', { className: 'grid grid-cols-1 md:grid-cols-2', style: { gap: 12 } },
      h('div', Object.assign({ style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 } }, hv('cliente')),
        h('span', { style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, 'Locatário no contrato'),
        !leitura.res.id.cpf ? caixaInfo('aviso', 'CPF não encontrado no PDF', 'Escolha o locatário abaixo olhando a prévia.')
          : !leitura.cliInfo || leitura.cliInfo.buscando ? caixaInfo('aviso', (leitura.res.id.nome && leitura.res.id.nome.valor) || 'Locatário', 'Procurando o CPF no cadastro...')
          : leitura.cliInfo.ok ? caixaInfo(cliDif ? 'aviso' : 'ok', leitura.cliInfo.nome, cliDif ? 'O locatário escolhido abaixo é outro. Confira.' : 'CPF ' + fCPFm(leitura.res.id.cpf.valor) + ' · achado no cadastro' + (leitura.cliInfo.cod ? ' (cód. ' + leitura.cliInfo.cod + ')' : ''))
          : leitura.cliInfo.emContrato ? caixaInfo('erro', leitura.cliInfo.nome, 'Já tem um contrato em andamento. Não dá para importar outro.')
          : leitura.cliInfo.naoAchado && leitura.cliInfo.pre && ['novo', 'em_analise', 'aguardando_documentos'].indexOf(leitura.cliInfo.pre.status) >= 0 ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, /* LOCACAO_PRECAD_CONTRATO_V1 */
              caixaInfo('aviso', leitura.cliInfo.pre.nome, 'Tem pré-cadastro ainda não aprovado. Dá para usar ele: vira locatário sem esperar os documentos.'),
              Btn({ small: true, variant: 'pri', icon: 'check', disabled: !!leitura.cliInfo.usando, onClick: function () {
                var pre = leitura.cliInfo.pre;
                setLeitura(function (l) { return Object.assign({}, l, { cliInfo: Object.assign({}, l.cliInfo, { usando: true }) }); });
                api('/precadastros/' + pre.id + '/aprovar-para-importar', { method: 'POST', body: {} }).then(function (r) {
                  return api('/clientes?sem_contrato=1').then(function (rc) {
                    setClientes(rc.clientes || []); setCliId(String(r.cliente_id));
                    var c2 = (rc.clientes || []).find(function (c) { return c.id === r.cliente_id; }) || {};
                    setLeitura(function (l) { return Object.assign({}, l, { cliInfo: { id: r.cliente_id, nome: c2.nome || pre.nome, ok: true, cod: c2.cod_profissional } }); });
                    toast('Pré-cadastro aprovado para importar', 'success');
                  });
                }).catch(function (e) { toast(e.message, 'error'); setLeitura(function (l) { return Object.assign({}, l, { cliInfo: Object.assign({}, l.cliInfo, { usando: false }) }); }); });
              }, children: leitura.cliInfo.usando ? 'Aprovando...' : 'Usar este pré-cadastro' }))
          : leitura.cliInfo.naoAchado ? caixaInfo('erro', (leitura.res.id.nome && leitura.res.id.nome.valor) || 'CPF ' + fCPFm(leitura.res.id.cpf.valor), leitura.cliInfo.pre ? 'Tem pré-cadastro (' + (leitura.cliInfo.pre.status || 'em análise') + '). Aprove antes de importar.' : 'Esse CPF não tem cadastro. Faça o pré-cadastro (Motoboy da Central ou link) e volte aqui.')
          : caixaInfo('aviso', 'Não deu para conferir o CPF', 'Escolha o locatário abaixo.')),
      h('div', Object.assign({ style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 } }, hv('moto')),
        h('span', { style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, 'Moto no contrato'),
        !leitura.motoInfo ? caixaInfo('aviso', 'Placa não encontrada no PDF', 'Escolha a moto abaixo olhando a prévia.')
          : leitura.motoInfo.ok ? caixaInfo(motoDif ? 'aviso' : 'ok', leitura.motoInfo.rotulo, motoDif ? 'A moto escolhida abaixo é outra. Confira.' : 'Placa e chassi batem com a frota · disponível')
          : leitura.motoInfo.naoAchada ? caixaInfo('erro', leitura.motoInfo.rotulo, 'Essa placa não está na frota. Cadastre a moto antes de importar.')
          : caixaInfo('erro', leitura.motoInfo.rotulo, 'A moto está ' + leitura.motoInfo.status + '. Só dá para importar com a moto disponível.'))) : null;
    var faixaLeitura = leitura ? h('div', { style: { background: '#ffffff', border: '1px solid #e9d5f9', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
      h('span', { style: { width: 36, height: 36, borderRadius: 10, background: nLidosC ? '#f3e8fb' : '#fffbeb', color: nLidosC ? ROXO : '#b45309', display: 'grid', placeItems: 'center', flex: 'none' } }, ico(nLidosC ? 'check' : 'alert', 18)),
      h('div', { style: { flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 } },
        h('b', { style: { color: '#3a1556' } }, nLidosC ? 'Lemos o contrato' + (leitura.res.numero ? ' ' + leitura.res.numero : '') : leitura.res.semTexto ? 'Esse PDF não tem texto' : 'Não achamos o Quadro-Resumo nesse PDF'),
        h('span', { style: { fontSize: 12.5, color: '#4b5563' } }, nLidosC ? h(React.Fragment, null, nLidosC + ' campos preenchidos a partir do PDF', nConfC ? h(React.Fragment, null, ' · ', h('b', { style: { color: '#b45309' } }, nConfC + ' para conferir'), ' (em laranja aqui e na página)') : ' · passe o mouse num campo para ver de onde ele veio')
          : leitura.res.semTexto ? 'Parece uma foto do documento. Preencha os campos olhando a prévia ao lado.' : 'Ele pode ser de outro modelo. Preencha os campos olhando a prévia ao lado.')),
      Btn({ icon: 'upload', onClick: escolherContrato, disabled: lendo, children: lendo ? 'Lendo...' : 'Trocar PDF' }),
      Btn({ variant: 'pri', icon: 'check', onClick: gerar, disabled: !completo || salvando, title: completo ? null : 'Faltam campos obrigatórios', children: salvando ? 'Importando...' : 'Importar contrato' })) : null; /* LOCACAO_IMPORTAR_BOTAO_V2 */
    var dropzone = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      h('button', { type: 'button', onClick: escolherContrato, disabled: lendo,
        onDragOver: function (e) { e.preventDefault(); if (!arrastando) setArrastando(true); }, onDragLeave: function () { setArrastando(false); },
        onDrop: function (e) { e.preventDefault(); setArrastando(false); var fl = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; lerContrato(fl); },
        style: { border: '2px dashed ' + (arrastando ? ROXO : '#d8b4f0'), background: arrastando ? '#faf7fd' : '#ffffff', borderRadius: 18, padding: '52px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, cursor: lendo ? 'wait' : 'pointer', textAlign: 'center', fontFamily: 'inherit' } },
        lendo ? Spinner('Lendo o contrato...') : h(React.Fragment, null,
          h('span', { style: { width: 56, height: 56, borderRadius: 16, background: '#f3e8fb', color: ROXO, display: 'grid', placeItems: 'center' } }, ico('upload', 26)),
          h('b', { style: { fontFamily: SORA, fontSize: 18, color: '#3a1556' } }, 'Solte aqui o contrato assinado em PDF'),
          h('span', { style: { fontSize: 13.5, color: '#4b5563', maxWidth: 620, lineHeight: 1.5 } }, 'A gente lê o Quadro-Resumo e já preenche: locatário, moto, plano, prazo, valor e vencimento da parcela, caução, base, área de circulação, manutenção, pagamento e opção de compra. Você confere tudo ao lado do documento antes de importar.'),
          h('span', { style: { height: 42, padding: '0 18px', borderRadius: 10, background: ROXO, color: '#ffffff', fontWeight: 600, display: 'inline-flex', alignItems: 'center' } }, 'Escolher PDF'))),
      h('div', { className: 'grid grid-cols-1 md:grid-cols-3', style: { gap: 12 } },
        [['1 · Lê o PDF', 'No seu navegador, como o CRLV-e da moto. O arquivo só sobe quando você importar.'], ['2 · Confere lado a lado', 'Prévia grande do contrato, com o lugar de cada campo marcado na página.'], ['3 · Importa', 'O contrato entra Ativo, com o PDF salvo para a equipe e para o locatário.']].map(function (x) {
          return h('div', { key: x[0], style: { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 } }, h('b', { style: { fontSize: 13 } }, x[0]), h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, x[1]));
        })),
      h('span', { style: { fontSize: 12, color: '#6b7280', textAlign: 'center' } }, 'PDF escaneado (foto, sem texto) também entra: aí os campos ficam em branco para você preencher olhando a prévia.'));
    var resumoCard = h(Card, { pad: false }, CardHead('Resumo do Demonstrativo'),
            h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
              h('div', null,
                h('div', { style: Object.assign({ fontFamily: SORA, fontSize: 26, fontWeight: 700 }, TAB) }, vNum > 0 ? fR(vNum) : '—', h('span', { style: { fontSize: 14, fontWeight: 500, color: '#6b7280' } }, ' / ' + (mensal ? 'mês' : 'semana'))),
                h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'vence ' + vencLabel)),
              h('div', null, [
                ['Plano', (f.plano === 'conquista' ? 'Plano Conquista' : 'Tutts Aluguel') + (nPr > 0 ? ' · ' + nPr + (mensal ? ' meses' : ' semanas') : '')],
                ['Início / término', ini ? fD(ini) + ' → ' + (term ? fD(term) : '—') : '—'],
                ['Parcelas', nPr > 0 && vNum > 0 ? nPr + ' × ' + fR(vNum) : '—'],
                ['1º vencimento', prim ? fD(prim) : '—'], ['Último vencimento', ult ? fD(ult) : '—'],
                ['Total do contrato', total != null ? fR(total) : '—'],
                reaj ? ['Reajuste', 'IPCA a cada 12 meses (Cl. 5.7)'] : null,
                ['Atraso', 'multa ' + pctTxt(enc.multa_pct, 2) + '% + juros ' + pctTxt(enc.juros_mes_pct, 2) + '% a.m. + IPCA · recolhimento após ' + (enc.dias_rescisao || 7) + ' dias'],
                ['Caução', f.caucao_isento ? 'Isento' : fR(caucaoN)],
                f.plano === 'conquista' ? ['Opção de compra', fR(moedaParse(f.opcao)) + ' + IPCA ao fim do prazo'] : ['Renovação', 'automática por igual período']
              ].filter(Boolean).map(function (r) { return linha(r[0], r[1]); }))),
            h('div', { style: { padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: '#6b7280', letterSpacing: '.04em', textTransform: 'uppercase' } }, importar ? 'Documentos' : 'Documentos para assinatura'),
              docs.map(function (dc) { return h('div', { key: dc.id, style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: dc.incluso ? '#111827' : '#9ca3af' } }, h('span', { style: { color: dc.incluso ? '#16a34a' : '#d1d5db' } }, ico(dc.incluso ? 'check' : 'circle', 14)), h('span', { style: { flex: 1 } }, dc.titulo), dc.sub ? h('span', { style: { fontSize: 11.5 } }, dc.sub) : null); }),
              Btn({ variant: 'pri', icon: importar ? 'upload' : 'filetext', onClick: gerar, disabled: !completo || salvando, style: { width: '100%', height: 44 }, children: salvando ? (importar ? 'Importando...' : 'Gerando contrato...') : importar ? 'Importar contrato assinado' : 'Gerar contrato e enviar ao Autentique' }),
              importar ? null : Btn({ icon: 'eye', disabled: !basico || !moto, onClick: function () { abrirPdfPost(api, '/contratos/previa-pdf', body(), toast); }, style: { width: '100%' }, children: 'Pré-visualizar PDF' }),
              h('div', { style: { fontSize: 12, color: '#6b7280', lineHeight: 1.5 } }, importar ? 'O contrato fica Ativo na hora e a moto, Alugada.' : h(React.Fragment, null, 'A moto fica ', h('b', null, 'Reservada'), ' até a assinatura. As parcelas só nascem quando o Autentique devolver o contrato assinado.'))));
    var colPrevia = h('div', { style: { position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, Segmented([['contrato', 'Contrato'], ['resumo', 'Resumo']], abaPrev, setAbaPrev, 'Prévia')),
      abaPrev === 'resumo' || !leitura ? resumoCard
        : h(VisorPdf, { key: 'visorc', pdf: leitura.pdf, paginas: leitura.paginas, numPages: leitura.numPages, nome: leitura.nome, tamanho: leitura.tamanho, arquivo: leitura.arquivo, marcas: marcasC, ativo: rectDoFoco(), semTexto: leitura.res.semTexto || !nLidosC, altura: '80vh',
            rodape: leitura.res.semTexto || !nLidosC ? null : 'Roxo: lido do contrato · laranja: conferir. Passe o mouse num campo para ver o trecho.' }));
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      voltar(function () { nav({ tela: 'lista', tab: 'contratos' }); }, 'Contratos'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' } },
        h('div', null,
          h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 22, fontWeight: 700 } }, importar ? 'Importar contrato já assinado' : 'Novo contrato'),
          h('p', { style: { margin: '4px 0 0', color: '#6b7280', fontSize: 13.5 } }, importar ? 'Para contratos assinados fora da Central: comece pelo PDF, a gente preenche o resto e as parcelas já pagas entram como pagas.' : 'Montado a partir do Demonstrativo de Contrato (Quadro-Resumo) · Tutts Aluguel ou Plano Conquista')),
        Segmented([[false, 'Novo contrato'], [true, 'Importar já assinado']], importar, function (v) { setImportar(v); if (!v) { setLeitura(null); setPdf(null); kmPdf.current = null; setFoco(null); } }, 'Modo')),
      importar ? inputContrato : null, /* LOCACAO_IMPORTAR_LEITURA_V1 */
      importar && leitura ? h('div', { style: { position: 'sticky', bottom: 12, zIndex: 20, order: 99, display: 'flex', justifyContent: 'flex-end' } }, /* LOCACAO_IMPORTAR_BOTAO_V2: sempre à vista */
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#ffffff', border: '1px solid #e9d5f9', borderRadius: 14, padding: '10px 12px', boxShadow: '0 8px 24px rgba(58,21,86,.16)' } },
          h('span', { style: { fontSize: 12.5, color: completo ? '#166534' : '#92400e' } }, completo ? 'Tudo preenchido. Confira e importe.' : 'Faltam campos obrigatórios: ' + [!cli ? 'locatário' : null, !moto ? 'moto' : null, !(vNum > 0) ? 'valor' : null, !(nPr > 0) ? 'prazo' : null, !f.inicio ? 'início' : null, !(dia > 0) ? 'vencimento' : null, !formas.length ? 'pagamento' : null, !(f.caucao_isento || caucaoN > 0) ? 'caução' : null, f.plano === 'conquista' && !(moedaParse(f.opcao) > 0) ? 'opção de compra' : null].filter(Boolean).join(', ')),
          Btn({ variant: 'pri', icon: 'upload', onClick: gerar, disabled: !completo || salvando, style: { height: 42 }, children: salvando ? 'Importando...' : 'Importar contrato assinado' }))) : null,
      importar && !leitura ? dropzone :
      h('div', { className: 'grid gap-4 items-start ' + (importar ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]' : 'lg:grid-cols-[minmax(0,1fr)_380px]') },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 } },
          importar ? faixaLeitura : null,
          h(Card, { pad: false }, CardHead('Locatário e moto'),
            h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
              importar ? conferenciaCliMoto : null,
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2', style: { gap: 12 } },
                h(Field, { label: 'Locatário aprovado', req: true, hint: clientes.length ? null : 'Nenhum cliente aprovado sem contrato' },
                  Select({ value: cliId, onChange: function (e) { setCliId(e.target.value); } }, [h('option', { key: '', value: '' }, clientes.length ? 'Escolha o locatário' : 'Sem clientes disponíveis')].concat(clientes.map(function (c) { return h('option', { key: c.id, value: String(c.id) }, c.nome + ' · ' + (c.tipo === 'tutts' ? 'Tutts' : 'Externo')); })))),
                h(Field, { label: 'Moto disponível', req: true, hint: motos.length ? null : 'Nenhuma moto disponível' },
                  Select({ value: motoId, onChange: function (e) { setMotoId(e.target.value); } }, [h('option', { key: '', value: '' }, motos.length ? 'Escolha a moto' : 'Sem motos disponíveis')].concat(motos.map(function (m) { return h('option', { key: m.id, value: String(m.id) }, m.placa + ' · ' + m.modelo); }))))),
              cli ? h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 } },
                h('div', { style: { width: 38, height: 38, borderRadius: 99, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flex: 'none' } }, iniciais(cli.nome)),
                h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { style: { fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }, cli.nome, TagTipo(cli.tipo), cli.tipo === 'tutts' && cli.cod_profissional ? h('span', { style: { fontWeight: 400, color: '#6b7280' } }, 'cód. ' + cli.cod_profissional) : null), // LOCACAO_V4
                  cliInfo.map(function (l, i) { return h('div', { key: i, style: { fontSize: 12.5, color: '#6b7280', marginTop: 2 } }, l); }),
                  cli.alertas && cli.alertas.length ? h('div', { style: { marginTop: 6 } }, cli.alertas.map(function (a, i) { return h('div', { key: i, style: { fontSize: 12, color: '#92400e' } }, typeof a === 'string' ? a : a.texto || a.mensagem); })) : null)) : null,
              moto ? h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', border: '1px solid #e9d5f9', background: '#faf7fd', borderRadius: 12, padding: 10, flexWrap: 'wrap' } },
                h(MotoImg, { src: moto.capa_thumb, tipo: moto.tipo, modelo: moto.modelo, cor: moto.cor, w: 120, h: 76 }),
                h('div', { style: { flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 3 } },
                  h('div', { style: { fontWeight: 600 } }, [moto.modelo, moto.ano, moto.cor].filter(Boolean).join(' · ')),
                  h('div', { style: { fontSize: 12, color: '#6b7280', fontFamily: MONO } }, ['Placa ' + moto.placa, moto.chassi ? 'Chassi ' + moto.chassi : null, moto.renavam ? 'RENAVAM ' + moto.renavam : null, moto.numero_motor ? 'Motor ' + moto.numero_motor : null].filter(Boolean).join(' · ')),
                  h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Condição: ', h('b', { style: { color: '#374151' } }, (CONDICAO.find(function (x) { return x[0] === moto.condicao; }) || [0, 'não informada'])[1]), moto.condicao ? '' : ' · informe no cadastro da moto', moto.numero_motor ? '' : ' · sem nº do motor no cadastro')),
                h(Field, Object.assign({ label: tg('km', 'Km na entrega'), hint: hn('km', 'conforme a vistoria'), hintCor: hc('km'), style: { width: estado('km') === 'conferir' ? 220 : 150 } }, hv('km')), Input({ value: f.km, inputMode: 'numeric', onChange: function (e) { set('km', soDig(e.target.value)); }, style: st('km') }))) : null)),
          h(Card, { pad: false }, CardHead(tg('plano', 'Plano')),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2', role: 'radiogroup', 'aria-label': 'Plano', style: { padding: 16, gap: 10 } },
              Radio(f.plano === 'aluguel', 'Tutts Aluguel', 'Locação pura, sem opção de compra. Renova sozinha por igual período (Cl. 13).', function () { set('plano', 'aluguel'); }),
              Radio(f.plano === 'conquista', 'Plano Conquista', 'Locação com opção de compra ao fim do prazo, cumprido integralmente e tudo pago. Manutenção por conta do locatário.', function () { set('plano', 'conquista'); }, null, h('span', { style: { fontSize: 11, fontWeight: 600, color: ROXO_ESC, background: '#f3e8fb', borderRadius: 6, padding: '0 6px' } }, 'Anexo II')))),
          h(Card, { pad: false }, CardHead('Prazo e valores'),
            h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3', style: { gap: 12 } },
                h(Field, Object.assign({ label: tg('periodicidade', 'Periodicidade'), req: true, hint: hn('periodicidade', null), hintCor: hc('periodicidade') }, hv('periodicidade')), Segmented([['semanal', 'Semanal'], ['mensal', 'Mensal']], f.periodicidade, function (v) { set('periodicidade', v); if (v === 'semanal' && f.prazo === '24') set('prazo', '104'); if (v === 'mensal' && f.prazo === '104') set('prazo', '24'); }, 'Periodicidade')),
                h(Field, Object.assign({ label: tg('prazo', 'Prazo'), req: true, hint: hn('prazo', prazoHint), hintCor: hc('prazo') }, hv('prazo')), h('div', { style: { position: 'relative' } }, Input({ value: f.prazo, inputMode: 'numeric', onChange: function (e) { set('prazo', soDig(e.target.value)); }, style: st('prazo', { paddingRight: 74 }) }), h('span', { style: { position: 'absolute', right: 12, top: 11, fontSize: 13, color: '#6b7280' } }, mensal ? 'meses' : 'semanas'))),
                h(Field, Object.assign({ label: tg('venc', 'Vencimento'), req: true, hint: hn('venc', mensal ? 'Dia do mês (1 a 28)' + (cli && cli.venc_periodicidade === 'mensal' && cli.venc_dia_mes ? ' · cadastro: dia ' + p2(cli.venc_dia_mes) : '') : 'Dia da semana' + (cli && cli.dia_vencimento ? ' · cadastro: ' + (DIA_VENC.find(function (x) { return x[0] === Number(cli.dia_vencimento); }) || [0, ''])[1] : '')), hintCor: hc('venc') }, hv('venc')),
                  mensal ? Select({ value: f.dia_mes, style: st('venc'), onChange: function (e) { set('dia_mes', e.target.value); } }, [h('option', { key: '', value: '' }, 'Escolha o dia')].concat(Array.from({ length: 28 }, function (_, i) { return h('option', { key: i + 1, value: String(i + 1) }, 'Todo dia ' + p2(i + 1)); })))
                    : Select({ value: f.dia_semana, style: st('venc'), onChange: function (e) { set('dia_semana', e.target.value); } }, [h('option', { key: '', value: '' }, 'Escolha o dia')].concat(DIA_VENC.map(function (d) { return h('option', { key: d[0], value: String(d[0]) }, d[1]); })))),
                h(Field, Object.assign({ label: tg('valor', 'Valor da parcela'), req: true, hint: hn('valor', vNum > 0 ? fR(vNum) + ' / ' + (mensal ? 'mês' : 'semana') : 'Digitado pelo time'), hintCor: hc('valor') }, hv('valor')), Input({ value: f.valor, inputMode: 'decimal', placeholder: 'R$ 0,00', onChange: function (e) { set('valor', e.target.value); }, style: st('valor') })),
                h(Field, Object.assign({ label: tg('inicio', 'Data de início (retirada)'), req: true, hint: hn('inicio', ini ? DIAS_LONGO[ini.getDay()] : null), hintCor: hc('inicio') }, hv('inicio')), Input({ type: 'date', value: f.inicio, onChange: function (e) { set('inicio', e.target.value); }, style: st('inicio') })),
                h(Field, Object.assign({ label: tg('caucao_isento', 'Caução'), hint: f.caucao_isento ? 'Débitos do encerramento seriam abatidos da caução (Cl. 15.2)' : null }, hv('caucao_isento')),
                  h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } }, Segmented([[true, 'Isento'], [false, 'Valor']], f.caucao_isento, function (v) { set('caucao_isento', v); }, 'Caução'),
                    f.caucao_isento ? null : Input({ value: f.caucao, inputMode: 'decimal', placeholder: 'R$ 0,00', 'aria-label': 'Valor da caução', onChange: function (e) { set('caucao', e.target.value); }, style: { flex: 1 } })))),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3', style: { gap: 12 } },
                h(Field, Object.assign({ label: tg('base', 'Base de retirada'), hint: hn('base', bases.length ? null : 'Cadastre em Configurações › Locadora e bases'), hintCor: hc('base') }, hv('base')), Select({ value: f.base, style: st('base'), onChange: function (e) { set('base', e.target.value); } }, [h('option', { key: '', value: '' }, bases.length ? 'Escolha a base' : 'Sem bases')].concat(bases.map(function (b, i) { return h('option', { key: i, value: String(b.id != null ? b.id : i) }, b.nome || b.endereco); })))),
                h(Field, Object.assign({ label: tg('area_km', 'Área de circulação'), hint: 'raio a partir do município' }, hv('area_km')), h('div', { style: { display: 'flex', gap: 6 } }, Input({ value: f.area_km, inputMode: 'numeric', 'aria-label': 'Raio em km', onChange: function (e) { set('area_km', soDig(e.target.value)); }, style: st('area_km', { width: 80 }) }), h('span', { style: { alignSelf: 'center', fontSize: 13, color: '#6b7280' } }, 'km de'), Input({ value: f.area_mun, 'aria-label': 'Município', onChange: function (e) { set('area_mun', e.target.value); }, style: st('area_mun') }))),
                h(Field, Object.assign({ label: tg('manutencao', 'Manutenção'), hint: f.plano === 'conquista' ? 'Obrigatório no Conquista' : null }, hv('manutencao')), Segmented([['inclusa', 'Inclusa (Base)'], ['locatario', 'Locatário']], f.plano === 'conquista' ? 'locatario' : f.manutencao, function (v) { if (f.plano !== 'conquista') set('manutencao', v); }, 'Manutenção'))),
              f.plano === 'conquista' ? h(Field, Object.assign({ label: tg('opcao', 'Valor de exercício da opção de compra'), req: true, hint: 'Corrigido pelo IPCA da assinatura até o pagamento (Anexo II, Cl. 3)' }, hv('opcao')), h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } }, Input({ value: f.opcao, inputMode: 'decimal', onChange: function (e) { set('opcao', e.target.value); }, style: st('opcao', { maxWidth: 160 }) }), h('span', { style: { fontSize: 13, color: '#6b7280' } }, '+ IPCA'))) : null)),
          h(Card, { pad: false }, CardHead(tg('formas', 'Pagamento')),
            h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
              h('div', { style: { display: 'flex', gap: 18, flexWrap: 'wrap' } }, Check(f.pix, function (v) { set('pix', v); }, 'Pix'), Check(f.boleto, function (v) { set('boleto', v); }, 'Boleto'), Check(f.cartao, function (v) { set('cartao', v); }, 'Cartão recorrente')),
              formas.length ? null : h('div', { style: { fontSize: 12, color: '#991b1b' } }, 'Marque ao menos uma forma de pagamento.'),
              cli && cli.tipo !== 'tutts' ? h('div', { style: { border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 12, padding: 12, fontSize: 13, color: '#6b7280', lineHeight: 1.45, display: 'flex', gap: 10, alignItems: 'flex-start' } }, // LOCACAO_V4: externo
                h('div', { style: { flex: 1 } }, h('b', { style: { color: '#374151' } }, 'Sem desconto no repasse. '), 'Ele não faz entregas pela Tutts, então paga só por Pix, boleto ou cartão. Para liberar o desconto, primeiro ele precisa virar motoboy da Central.'), TagTipo('externo'))
              : h('div', { style: { border: '1px solid ' + (f.desconto ? ROXO : '#e5e7eb'), background: f.desconto ? '#faf7fd' : '#fff', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6, opacity: cli ? 1 : 0.6 } },
                h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } }, Toggle(f.desconto, function (v) { if (cli && cli.tipo === 'tutts') set('desconto', v); }, 'Descontar as parcelas do repasse'), h('b', { style: { fontSize: 13.5 } }, 'Descontar as parcelas do repasse'), h('span', { style: { fontSize: 11, fontWeight: 600, color: '#374151', background: '#f3f4f6', borderRadius: 6, padding: '0 6px' } }, 'Anexo III · facultativo'), h('div', { style: { flex: 1 } }), cli ? TagTipo('tutts', 'Motoboy Tutts' + (cli.cod_profissional ? ' · cód. ' + cli.cod_profissional : '')) : null),
                h('div', { style: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.45 } }, 'As parcelas vencidas saem do repasse de quarta-feira. Se o repasse não cobrir, o resto vai por Pix no vencimento. Ele pode revogar a qualquer momento pelo app, sem efeito na locação (Cl. 5.11).'),
                cli ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, repMedio && repMedio.valor > 0 ? h('span', null, 'Repasse médio das últimas 4 semanas: ', h('b', { style: { color: '#111827' } }, fR(repMedio.valor)), vNum > 0 ? ' · parcela ' + fR(vNum) + (mensal ? ' por mês' : '') : '') : 'Sem repasses nas últimas 4 semanas.')
                  : h('div', { style: { fontSize: 12, color: '#374151' } }, 'Disponível só para motoboy Tutts.')))),
          importar ? h(Card, { pad: false }, CardHead('Contrato já assinado'), /* LOCACAO_IMPORTAR_LEITURA_V1: o PDF entra lá em cima */
            h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' } },
                h(Field, { label: 'Parcelas pagas até', opt: true, hint: 'As parcelas com vencimento até esta data entram como pagas (baixa “importado”).', style: { flex: '1 1 240px' } }, Input({ type: 'date', value: pagasAte, max: hojeISO(), onChange: function (e) { setPagasAte(e.target.value); } })),
                h('div', { style: { flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 6 } },
                  Btn({ variant: 'pri', icon: 'upload', onClick: gerar, disabled: !completo || salvando || (leitura && leitura.cliInfo && (leitura.cliInfo.emContrato)), style: { width: '100%', height: 46 }, children: salvando ? 'Importando...' : 'Importar contrato assinado' }),
                  !completo ? h('span', { style: { fontSize: 11.5, color: '#6b7280' } }, 'Faltam campos obrigatórios (locatário, moto, valor, prazo, início, vencimento, pagamento).') : null)),
              Aviso('azul', null, 'O contrato entra direto como Ativo, sem passar pelo Autentique. O PDF fica salvo para a equipe e para o locatário. Registre depois a vistoria de entrega (Anexo IV) na moto, se ela ainda não estiver no sistema.'))) : null),
        importar ? colPrevia : h('div', { style: { position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 14 } }, resumoCard)));
  }

  function abrirPdf(api, url, toast) {
    var w = window.open('', '_blank');
    api(url, { raw: true }).then(function (res) { return res.blob(); }).then(function (b) {
      var u = URL.createObjectURL(b);
      if (w) w.location.href = u; else window.open(u, '_blank');
      setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
    }).catch(function (e) { if (w) w.close(); toast(e.message, 'error'); });
  }

  // ───────────────────────── AUTENTIQUE_POSICOES_V2: posicionar assinaturas no PDF ─────────────────────────
  /* Prévia do contrato com as caixas de assinatura/rubrica de cada signatário. Arrasta, redimensiona, adiciona,
     repete em todas as páginas. x/y/w/h em % da página (topo-esquerda), igual ao que vai para o Autentique. */
  var POS_COR = { locatario: '#f67602', tutts: '#5d0b85' };
  var POS_FUNDO = { locatario: 'rgba(246,118,2,.10)', tutts: 'rgba(93,11,133,.10)' };
  var POS_EL = { SIGNATURE: 'Assinatura', INITIALS: 'Rubrica' };
  function posR2(v) { return Math.round(Number(v) * 100) / 100; }
  function posNovoId() { return 'manual-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }

  function PosicionarAssinaturas(props) {
    var api = props.api, toast = props.toast, cid = props.contrato.id;
    var _d = useState(null), dados = _d[0], setDados = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _pg = useState(null), paginas = _pg[0], setPaginas = _pg[1]; // [{ src, ratio }]
    var _it = useState([]), itens = _it[0], setItens = _it[1];
    var _s = useState(null), sel = _s[0], setSel = _s[1];
    var _p = useState(1), pag = _p[0], setPag = _p[1];
    var _z = useState(1), zoom = _z[0], setZoom = _z[1];
    var _o = useState(null), ocupado = _o[0], setOcupado = _o[1];
    var _m = useState(false), mexeu = _m[0], setMexeu = _m[1];
    var _w = useState(window.innerWidth), larg = _w[0], setLarg = _w[1];
    var folhaRef = useRef(null), arrasto = useRef(null);

    var carregar = useCallback(function () {
      setErro(null); setDados(null); setPaginas(null);
      api('/contratos/' + cid + '/posicoes-assinatura').then(function (d) {
        setDados(d); setItens(d.itens || []); setSel(null); setMexeu(false);
        // o GET acima regenera o PDF quando está aguardando assinatura; só então baixa o arquivo
        return Promise.all([window.LocacaoCRLV.carregarPdfJs(), api('/contratos/' + cid + '/pdf', { raw: true }).then(function (r) { return r.arrayBuffer(); })]);
      }).then(function (r) {
        var lib = r[0];
        return lib.getDocument({ data: new Uint8Array(r[1]) }).promise.then(function (doc) {
          var out = [], seq = Promise.resolve();
          for (var i = 1; i <= doc.numPages; i++) (function (n) {
            seq = seq.then(function () {
              return doc.getPage(n).then(function (p) {
                var v0 = p.getViewport({ scale: 1 }), vp = p.getViewport({ scale: 1100 / v0.width });
                var cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
                return p.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise.then(function () {
                  out.push({ src: cv.toDataURL('image/png'), ratio: vp.height / vp.width });
                });
              });
            });
          })(i);
          return seq.then(function () { setPaginas(out); setPag(function (x) { return Math.min(x, out.length) || 1; }); });
        });
      }).catch(function (e) { setErro(e.message || 'Não deu para abrir o contrato'); });
    }, [api, cid]);
    useEffect(carregar, [carregar]);
    useEffect(function () {
      var fn = function () { setLarg(window.innerWidth); };
      window.addEventListener('resize', fn);
      return function () { window.removeEventListener('resize', fn); };
    }, []);

    var B = (dados && dados.bases) || { SIGNATURE: { w: 20, h: 5 }, INITIALS: { w: 8, h: 3 } };
    var nPag = paginas ? paginas.length : (dados ? dados.paginas : 0);
    var item = sel ? itens.find(function (x) { return x.id === sel; }) : null;

    var mudar = function (fn) { setItens(function (lst) { return fn(lst); }); setMexeu(true); };
    var limitar = function (it) {
      var b = B[it.element], w = Math.max(b.w * 0.5, Math.min(b.w * 4, Number(it.w) || b.w)), hh = posR2(w * b.h / b.w);
      return Object.assign({}, it, { w: posR2(w), h: hh, x: posR2(Math.max(0, Math.min(100 - w, Number(it.x) || 0))), y: posR2(Math.max(0, Math.min(100 - hh, Number(it.y) || 0))) });
    };
    var atualizar = function (id, campos) { mudar(function (lst) { return lst.map(function (x) { return x.id === id ? limitar(Object.assign({}, x, campos)) : x; }); }); };
    var adicionar = function (quem, element) {
      var b = B[element];
      var novo = limitar({ id: posNovoId(), origem: 'manual', quem: quem, element: element, z: pag, x: 50 - b.w / 2, y: 50 - b.h / 2, w: b.w, h: b.h });
      mudar(function (lst) { return lst.concat([novo]); }); setSel(novo.id);
    };
    var remover = function (id) { mudar(function (lst) { return lst.filter(function (x) { return x.id !== id; }); }); setSel(null); };
    var repetir = function (it) {
      var novos = [];
      for (var z = 1; z <= nPag; z++) {
        if (z === it.z) continue;
        var ja = itens.some(function (x) { return x.z === z && x.quem === it.quem && x.element === it.element && Math.abs(x.x - it.x) < 2 && Math.abs(x.y - it.y) < 2; });
        if (!ja) novos.push(Object.assign({}, it, { id: posNovoId() + z, origem: 'manual', z: z }));
      }
      if (!novos.length) { toast('Já tem uma igual em todas as páginas', 'info'); return; }
      mudar(function (lst) { return lst.concat(novos); });
      toast('Repetida em mais ' + novos.length + ' página' + (novos.length > 1 ? 's' : ''), 'success');
    };
    var rubricaEmTodas = function (quem) {
      if (!nPag) return false;
      for (var z = 1; z <= nPag; z++) if (!itens.some(function (x) { return x.z === z && x.quem === quem && x.element === 'INITIALS'; })) return false;
      return true;
    };
    var alternarRubricas = function (quem, ligar) {
      if (!ligar) {
        mudar(function (lst) { return lst.filter(function (x) { return !(x.quem === quem && x.element === 'INITIALS'); }); });
        if (item && item.quem === quem && item.element === 'INITIALS') setSel(null);
        return;
      }
      var auto = (dados && dados.auto) || [], b = B.INITIALS;
      var novos = [];
      for (var z = 1; z <= nPag; z++) {
        if (itens.some(function (x) { return x.z === z && x.quem === quem && x.element === 'INITIALS'; })) continue;
        var ref = auto.find(function (x) { return x.z === z && x.quem === quem && x.element === 'INITIALS'; });
        var outro = (auto.concat(itens)).find(function (x) { return x.z === z && x.quem !== quem && x.element === 'INITIALS'; });
        var base = ref ? Object.assign({}, ref)
          : outro ? { x: outro.x + (quem === 'tutts' ? -14 : 14), y: outro.y, w: outro.w }
          : { x: quem === 'tutts' ? 74 : 88, y: 93, w: b.w };
        novos.push(limitar(Object.assign(base, { id: (ref ? ref.id : posNovoId() + z), origem: ref ? ref.origem : 'manual', quem: quem, element: 'INITIALS', z: z })));
      }
      mudar(function (lst) { return lst.concat(novos); });
    };

    // arrastar / redimensionar
    var iniciar = function (e, it, modo) {
      e.preventDefault(); e.stopPropagation(); setSel(it.id);
      var r = folhaRef.current && folhaRef.current.getBoundingClientRect();
      if (!r) return;
      arrasto.current = { id: it.id, modo: modo, x0: e.clientX, y0: e.clientY, it: it, rw: r.width, rh: r.height };
      var mover = function (ev) {
        var a = arrasto.current; if (!a) return;
        var dx = (ev.clientX - a.x0) / a.rw * 100, dy = (ev.clientY - a.y0) / a.rh * 100;
        if (a.modo === 'mover') atualizar(a.id, { x: a.it.x + dx, y: a.it.y + dy });
        else atualizar(a.id, { w: a.it.w + dx });
      };
      var soltar = function () { arrasto.current = null; window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); };
      window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
    };
    // teclado: setas movem (Shift = passo maior), Delete remove
    useEffect(function () {
      var fn = function (e) {
        if (!item || /INPUT|SELECT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
        var p = e.shiftKey ? 2 : 0.25, m = { ArrowLeft: [-p, 0], ArrowRight: [p, 0], ArrowUp: [0, -p], ArrowDown: [0, p] }[e.key];
        if (m) { e.preventDefault(); atualizar(item.id, { x: item.x + m[0], y: item.y + m[1] }); }
        else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remover(item.id); }
      };
      document.addEventListener('keydown', fn);
      return function () { document.removeEventListener('keydown', fn); };
    });

    var fechar = function () {
      if (mexeu && !window.confirm('Sair sem salvar os ajustes das assinaturas?')) return;
      props.onClose();
    };
    useEffect(function () {
      var fn = function (e) { if (e.key === 'Escape') fechar(); };
      document.addEventListener('keydown', fn);
      return function () { document.removeEventListener('keydown', fn); };
    });

    var validar = function () {
      if (!itens.some(function (x) { return x.quem === 'locatario' && x.element === 'SIGNATURE'; })) { toast('Coloque pelo menos uma assinatura do locatário', 'error'); return false; }
      return true;
    };
    var limpos = function () { return itens.map(function (x) { return { id: x.id, origem: x.origem || null, quem: x.quem, element: x.element, z: x.z, x: x.x, y: x.y, w: x.w, h: x.h }; }); };
    var salvarContrato = function () { return api('/contratos/' + cid + '/posicoes-assinatura', { method: 'PUT', body: { itens: limpos() } }); };
    var rodar = function (chave, fn, msg, depois) {
      setOcupado(chave);
      return fn().then(function (r) { if (msg) toast(msg, 'success'); setMexeu(false); if (depois) depois(r); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setOcupado(null); });
    };
    var salvarEste = function () { if (validar()) rodar('salvar', salvarContrato, 'Posições salvas para este contrato', function () { props.aoMudar && props.aoMudar(); }); };
    var salvarPadrao = function () {
      if (!validar()) return;
      rodar('padrao', function () {
        return salvarContrato().then(function () {
          return api('/contratos/' + cid + '/posicoes-assinatura/padrao', { method: 'PUT', body: { itens: limpos(), rubrica_todas: { locatario: rubricaEmTodas('locatario'), tutts: rubricaEmTodas('tutts') } } });
        });
      }, 'Padrão salvo: os próximos contratos já saem assim', function () { props.aoMudar && props.aoMudar(); });
    };
    var salvarEnviar = function () {
      if (!validar()) return;
      rodar('enviar', function () {
        return salvarContrato().then(function () { return api('/contratos/' + cid + '/reenviar-assinatura', { method: 'POST', body: {} }); });
      }, 'Enviado ao Autentique com as assinaturas posicionadas', function () { props.aoEnviar ? props.aoEnviar() : props.onClose(); });
    };
    var voltarAuto = function () {
      if (!window.confirm('Descartar os ajustes deste contrato e voltar para as posições automáticas?')) return;
      rodar('auto', function () { return api('/contratos/' + cid + '/posicoes-assinatura', { method: 'PUT', body: { automatico: true } }); }, 'Voltou para as posições automáticas', function () { carregar(); props.aoMudar && props.aoMudar(); });
    };

    // ── peças visuais ──
    var caixa = function (it, mini) {
      var cor = POS_COR[it.quem], on = !mini && it.id === sel;
      var st = { position: 'absolute', left: it.x + '%', top: it.y + '%', width: it.w + '%', height: it.h + '%', boxSizing: 'border-box', borderRadius: mini ? 1 : 4,
        background: POS_FUNDO[it.quem], border: (mini ? 1 : on ? 2 : 1.5) + 'px ' + (on || mini ? 'solid ' : 'dashed ') + cor };
      if (mini) return h('div', { key: it.id, style: st });
      return h('div', { key: it.id, role: 'button', tabIndex: 0, 'aria-label': POS_EL[it.element] + ' de ' + (it.quem === 'tutts' ? 'Tutts' : 'locatário'),
        onPointerDown: function (e) { iniciar(e, it, 'mover'); },
        style: Object.assign(st, { cursor: 'move', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible', zIndex: on ? 3 : 2, boxShadow: on ? '0 0 0 3px ' + POS_FUNDO[it.quem] : 'none' }) },
        h('span', { style: { fontSize: Math.max(9, 11 * zoom), fontWeight: 700, color: cor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 4px', pointerEvents: 'none', userSelect: 'none' } },
          it.element === 'INITIALS' ? 'Rubrica' : 'Assinatura · ' + (it.quem === 'tutts' ? 'Tutts' : 'Locatário')),
        on ? h('div', { onPointerDown: function (e) { iniciar(e, it, 'tamanho'); }, title: 'Arraste para mudar o tamanho',
          style: { position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, borderRadius: 3, background: '#fff', border: '2px solid ' + cor, cursor: 'nwse-resize', touchAction: 'none' } }) : null);
    };
    var cartaoSig = function (quem, nome, papel) {
      var cor = POS_COR[quem], doQuem = itens.filter(function (x) { return x.quem === quem; });
      var nA = doQuem.filter(function (x) { return x.element === 'SIGNATURE'; }).length, nR = doQuem.length - nA;
      var todas = rubricaEmTodas(quem);
      return h('div', { style: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' } },
        h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
          h('div', { style: { width: 10, height: 10, borderRadius: 99, background: cor, flex: 'none' } }),
          h('div', { style: { minWidth: 0, flex: 1 } },
            h('div', { style: { fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, nome),
            h('div', { style: { fontSize: 12, color: '#6b7280' } }, papel + ' · ' + nA + ' assinatura' + (nA === 1 ? '' : 's') + ' · ' + nR + ' rubrica' + (nR === 1 ? '' : 's')))),
        h('div', { style: { display: 'flex', gap: 6, marginTop: 10 } },
          Btn({ small: true, icon: 'plus', onClick: function () { adicionar(quem, 'SIGNATURE'); }, children: 'Assinatura', style: { flex: 1 } }),
          Btn({ small: true, icon: 'plus', onClick: function () { adicionar(quem, 'INITIALS'); }, children: 'Rubrica', style: { flex: 1 } })),
        h('label', { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, marginTop: 10, cursor: 'pointer', color: '#374151' } },
          h('input', { type: 'checkbox', checked: todas, onChange: function (e) { alternarRubricas(quem, e.target.checked); }, style: { width: 16, height: 16, accentColor: cor } }),
          'Rubrica em todas as páginas'));
    };
    var campo = function (rot, valor, onChange, extra) {
      return h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: '#6b7280', fontWeight: 600, minWidth: 0 } }, rot,
        h('input', Object.assign({ type: 'number', value: valor, onChange: function (e) { var v = parseFloat(e.target.value); if (isFinite(v)) onChange(v); },
          style: { height: 34, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 8px', fontSize: 13, color: '#111827', width: '100%', boxSizing: 'border-box' } }, extra || {})));
    };

    var estreito = larg < 1000;
    var pagAtual = paginas && paginas[pag - 1];
    var larguraFolha = Math.round(680 * zoom);
    var noPag = itens.filter(function (x) { return x.z === pag; });
    var sig = (dados && dados.signatarios) || {};

    var corpo;
    if (erro) corpo = h('div', { style: { padding: 24, maxWidth: 520, margin: '40px auto' } }, Aviso('vermelho', 'Não deu para abrir o contrato', erro), h('div', { style: { marginTop: 12 } }, Btn({ icon: 'refresh', onClick: carregar, children: 'Tentar de novo' })));
    else if (!dados || !paginas) corpo = Spinner('Montando a prévia do contrato...');
    else corpo = h('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: estreito ? 'column' : 'row', overflow: estreito ? 'auto' : 'hidden' } },
      // painel esquerdo
      h('div', { style: { width: estreito ? 'auto' : 300, flex: 'none', borderRight: estreito ? 0 : '1px solid #e5e7eb', borderBottom: estreito ? '1px solid #e5e7eb' : 0, padding: 16, overflowY: estreito ? 'visible' : 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: '#fafafa' } },
        dados.salvo_descartado ? Aviso('ambar', 'O contrato mudou', 'O ajuste anterior não batia mais com o PDF (páginas ou linhas diferentes) e foi trocado pelas posições automáticas. Confira antes de enviar.') : null,
        h('div', { style: { fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '.04em', textTransform: 'uppercase' } }, 'Signatários'),
        cartaoSig('locatario', sig.locatario || 'Locatário', 'Locatário'),
        cartaoSig('tutts', sig.tutts || 'Tutts', 'Tutts'),
        h('div', { style: { fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 4 } }, 'Selecionado'),
        item ? h('div', { style: { border: '1px solid ' + POS_COR[item.quem], borderRadius: 12, padding: 12, background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { style: { fontWeight: 700, fontSize: 13.5, color: POS_COR[item.quem] } }, POS_EL[item.element] + ' · ' + (item.quem === 'tutts' ? 'Tutts' : 'Locatário')),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
            campo('X (%)', item.x, function (v) { atualizar(item.id, { x: v }); }, { step: 0.25, min: 0, max: 100 }),
            campo('Y (%)', item.y, function (v) { atualizar(item.id, { y: v }); }, { step: 0.25, min: 0, max: 100 }),
            campo('Tamanho (%)', Math.round(item.w / B[item.element].w * 100), function (v) { atualizar(item.id, { w: B[item.element].w * v / 100 }); }, { step: 5, min: 50, max: 400 }),
            h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: '#6b7280', fontWeight: 600 } }, 'Página',
              h('select', { value: item.z, onChange: function (e) { var z = parseInt(e.target.value, 10); atualizar(item.id, { z: z }); setPag(z); },
                style: { height: 34, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 6px', fontSize: 13, background: '#fff' } },
                Array.from({ length: nPag }, function (_, i) { return h('option', { key: i, value: i + 1 }, i + 1 + ' de ' + nPag); })))),
          Btn({ small: true, icon: 'filetext', onClick: function () { repetir(item); }, children: 'Repetir em todas as páginas' }),
          Btn({ small: true, variant: 'perigo', icon: 'trash', onClick: function () { remover(item.id); }, children: 'Remover' }),
          h('div', { style: { fontSize: 11.5, color: '#9ca3af', lineHeight: 1.45 } }, 'Setas movem a caixa (Shift = passo maior). Delete remove.'))
          : h('div', { style: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.5, border: '1px dashed #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' } }, 'Clique numa caixa na página para ajustar posição, tamanho e página. Arraste para mover; puxe o canto para mudar o tamanho.')),
      // miniaturas
      estreito ? null : h('div', { style: { width: 112, flex: 'none', borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' } },
        paginas.map(function (p, i) {
          var z = i + 1, on = z === pag, qtd = itens.filter(function (x) { return x.z === z; }).length;
          return h('button', { key: z, type: 'button', onClick: function () { setPag(z); setSel(null); }, 'aria-label': 'Ir para a página ' + z, style: { background: 'transparent', border: 0, padding: 0, cursor: 'pointer', textAlign: 'center' } },
            h('div', { style: { position: 'relative', width: '100%', aspectRatio: '1 / ' + p.ratio, borderRadius: 4, overflow: 'hidden', border: '2px solid ' + (on ? ROXO : '#e5e7eb'), background: '#fff' } },
              h('img', { src: p.src, alt: '', style: { width: '100%', height: '100%', display: 'block' } }),
              itens.filter(function (x) { return x.z === z; }).map(function (x) { return caixa(x, true); })),
            h('div', { style: { fontSize: 11.5, marginTop: 4, color: on ? ROXO : '#6b7280', fontWeight: on ? 700 : 500 } }, z + (qtd ? ' · ' + qtd : '')));
        })),
      // página
      h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#f3f4f6' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexWrap: 'wrap' } },
          Btn({ small: true, disabled: pag <= 1, onClick: function () { setPag(pag - 1); setSel(null); }, ariaLabel: 'Página anterior', children: '‹' }),
          h('span', { style: { fontSize: 13, fontWeight: 600, minWidth: 92, textAlign: 'center' } }, 'Página ' + pag + ' de ' + nPag),
          Btn({ small: true, disabled: pag >= nPag, onClick: function () { setPag(pag + 1); setSel(null); }, ariaLabel: 'Próxima página', children: '›' }),
          h('span', { style: { fontSize: 12, color: '#6b7280', marginLeft: 6 } }, noPag.length ? noPag.length + ' caixa' + (noPag.length > 1 ? 's' : '') + ' nesta página' : 'Nenhuma assinatura nesta página'),
          h('div', { style: { flex: 1 } }),
          Btn({ small: true, icon: 'minus', disabled: zoom <= 0.6, onClick: function () { setZoom(Math.max(0.6, posR2(zoom - 0.2))); }, ariaLabel: 'Diminuir zoom' }),
          h('span', { style: { fontSize: 12.5, minWidth: 44, textAlign: 'center', fontWeight: 600 } }, Math.round(zoom * 100) + '%'),
          Btn({ small: true, icon: 'plus', disabled: zoom >= 2.4, onClick: function () { setZoom(Math.min(2.4, posR2(zoom + 0.2))); }, ariaLabel: 'Aumentar zoom' })),
        h('div', { onPointerDown: function (e) { if (e.target === e.currentTarget) setSel(null); }, style: { flex: 1, overflow: 'auto', padding: 24, minHeight: estreito ? 520 : 0 } },
          pagAtual ? h('div', { ref: folhaRef, onPointerDown: function (e) { if (e.target.tagName === 'IMG') setSel(null); },
            style: { position: 'relative', width: larguraFolha, maxWidth: estreito ? '100%' : 'none', aspectRatio: '1 / ' + pagAtual.ratio, margin: '0 auto', background: '#fff', boxShadow: '0 4px 20px -6px rgba(17,24,39,.25)' } },
            h('img', { src: pagAtual.src, alt: 'Página ' + pag + ' do contrato', draggable: false, style: { width: '100%', height: '100%', display: 'block', userSelect: 'none' } }),
            noPag.map(function (x) { return caixa(x, false); })) : null)));

    var statusTxt = !dados ? '' : mexeu ? 'Ajustes não salvos' : dados.ajustado ? 'Ajustado manualmente' + (dados.salvo_em ? ' em ' + fDHc(dados.salvo_em) : '') + (dados.salvo_por ? ' por ' + dados.salvo_por : '') : 'Posições automáticas' + (dados.padrao ? ' (com o padrão salvo)' : '');
    var pronto = !!(dados && paginas);
    return h('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Posicionar assinaturas', style: { position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(17,24,39,.45)', display: 'flex', padding: estreito ? 0 : 20 } },
      h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: estreito ? 0 : 16, overflow: 'hidden', boxShadow: '0 20px 50px -20px rgba(17,24,39,.35)' } },
        h('div', { style: { padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12 } },
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 17, fontWeight: 700 } }, 'Posicionar assinaturas'),
            h('div', { style: { fontSize: 12.5, color: '#6b7280', marginTop: 2 } }, 'Contrato ' + (props.contrato.numero || cid) + (statusTxt ? ' · ' + statusTxt : ''))),
          h('button', { type: 'button', onClick: fechar, 'aria-label': 'Fechar', className: 'hover:bg-gray-100', style: { width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', color: '#6b7280', cursor: 'pointer' } }, ico('x', 17))),
        corpo,
        h('div', { style: { padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
          Btn({ small: estreito, variant: 'link', disabled: !pronto || !!ocupado || (!dados.ajustado && !mexeu), onClick: voltarAuto, children: ocupado === 'auto' ? 'Voltando...' : 'Voltar para as posições automáticas' }),
          h('div', { style: { flex: 1 } }),
          Btn({ small: estreito, disabled: !pronto || !!ocupado, onClick: salvarPadrao, title: 'Os próximos contratos já saem com esse ajuste', children: ocupado === 'padrao' ? 'Salvando...' : 'Salvar como padrão' }),
          Btn({ small: estreito, disabled: !pronto || !!ocupado, onClick: salvarEste, children: ocupado === 'salvar' ? 'Salvando...' : 'Salvar para este contrato' }),
          Btn({ small: estreito, variant: 'pri', icon: 'upload', disabled: !pronto || !!ocupado, onClick: salvarEnviar, children: ocupado === 'enviar' ? 'Enviando...' : 'Salvar e enviar para assinatura' }))));
  }

  // ───────────────────────── LOCACAO_REMODEL_V1: aba Financeiro ─────────────────────────
  /* Visão geral da semana + financeiro de cada contrato (parcelas, cobrança, baixa, antecipação, extrato).
     O perfil do contrato (ContratoDetalhe) não mostra mais parcelas: só uma faixa que leva para cá. */
  var ACOES_FIN = { pagamento: 1, baixa_manual: 1, cobranca_enviada: 1, nao_enviado: 1, pix_emitido: 1, pix_erro: 1, cobranca_avulsa: 1, cobranca_avulsa_paga: 1, atrasada: 1, abatida_repasse: 1, abatida_parcial: 1, abatimento_estornado: 1, bloqueio_sinalizado: 1, cobranca_tarifario: 1, antecipacao: 1, em_dia: 1 };
  var DIAS_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  function normTxt(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function semanaLabel(ini, fim) { return fDC(ini) + ' a ' + fDC(fim); }
  function addDiasISO(iso, n) { var d = parseData(iso); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function baixarCSV(nome, linhas) {
    var csv = linhas.map(function (l) { return l.map(function (v) { var t = v == null ? '' : String(v); return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }).join(';'); }).join('\n');
    var url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function cobrancaTxt(uc) {
    if (!uc) return '—';
    var t = { cobranca_enviada: 'WhatsApp enviado', pix_emitido: 'PIX emitido', bloqueio_sinalizado: 'Bloqueio sinalizado', nao_enviado: 'Não enviada' }[uc.acao] || uc.acao;
    return t + ' · ' + fDC(uc.em);
  }
  // cobra várias parcelas uma por vez e devolve o resumo
  function cobrarVarias(api, ids) {
    var ok = 0, falha = [];
    return ids.reduce(function (pr, id) {
      return pr.then(function () {
        return api('/parcelas/' + id + '/cobrar', { method: 'POST', body: {} }).then(function (r) { if (r.whatsapp && r.whatsapp.enviado) ok++; else falha.push((r.whatsapp && r.whatsapp.motivo) || 'WhatsApp não enviado'); })
          .catch(function (e) { falha.push(e.message); });
      });
    }, Promise.resolve()).then(function () { return { ok: ok, falha: falha }; });
  }

  function FinanceiroView(props) {
    var api = props.api, toast = props.toast, nav = props.nav;
    var _i = useState(null), inicio = _i[0], setInicio = _i[1];
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _f = useState('pendentes'), filtro = _f[0], setFiltro = _f[1];
    var _q = useState(''), q = _q[0], setQ = _q[1];
    var _s = useState({}), sel = _s[0], setSel = _s[1];
    var _m = useState(null), modal = _m[0], setModal = _m[1];
    var _o = useState(null), ocupado = _o[0], setOcupado = _o[1];
    var carregar = useCallback(function () {
      setErro(null);
      api('/financeiro' + (inicio ? '?inicio=' + inicio : '')).then(function (r) { setD(r); setSel({}); }).catch(function (e) { setErro(e.message); });
    }, [api, inicio]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d) return Spinner('Carregando o financeiro...');
    var k = d.kpis || {}, sem = d.semana || {}, linhas = d.linhas || [];
    var pend = function (l) { return !!l.parcela && (l.atrasadas_qtd > 0 || l.parcela.vencimento <= sem.fim) && !(l.pagou_semana && l.parcela.vencimento > sem.fim); };
    var cnt = function (fn) { return linhas.filter(fn).length; };
    var FILTROS = {
      pendentes: pend,
      atraso: function (l) { return l.atrasadas_qtd > 0; },
      hoje: function (l) { return l.parcela && l.parcela.status === 'vence_hoje'; },
      pagaram: function (l) { return l.pagou_semana; },
      todos: function () { return true; }
    };
    var busca = normTxt(q);
    var vis = linhas.filter(FILTROS[filtro]).filter(function (l) { return !busca || normTxt(l.cliente_nome + ' ' + l.numero + ' ' + l.placa).indexOf(busca) >= 0; });
    var selIds = Object.keys(sel).filter(function (x) { return sel[x]; });
    var selLinhas = linhas.filter(function (l) { return sel[l.contrato_id] && l.parcela; });
    var atrasados = linhas.filter(function (l) { return l.atrasadas_qtd > 0 && l.parcela; });
    var cobrarLista = function (lst, chave) {
      if (!lst.length) return;
      if (!window.confirm('Cobrar no WhatsApp ' + lst.length + ' locatário' + (lst.length > 1 ? 's' : '') + '? Cada um recebe o PIX da parcela da vez.')) return;
      setOcupado(chave);
      cobrarVarias(api, lst.map(function (l) { return l.parcela.id; })).then(function (r) {
        toast(r.ok + ' cobrança' + (r.ok === 1 ? '' : 's') + ' enviada' + (r.ok === 1 ? '' : 's') + (r.falha.length ? ' · ' + r.falha.length + ' sem WhatsApp' : ''), r.falha.length && !r.ok ? 'error' : 'success');
        carregar(); props.aoMudar && props.aoMudar();
      }).then(function () { setOcupado(null); });
    };
    var exportar = function () {
      baixarCSV('financeiro-locacao-' + sem.inicio + '.csv', [['Locatário', 'Contrato', 'Placa', 'Situação', 'Parcela', 'Vencimento', 'Valor', 'Encargos', 'Pagas', 'Último pagamento', 'Saldo devedor']].concat(linhas.map(function (l) {
        var p = l.parcela || {};
        return [l.cliente_nome, l.numero, l.placa, l.situacao_label, p.numero ? p.numero + '/' + l.total_parcelas : '', p.vencimento || '', p.saldo != null ? String(p.saldo).replace('.', ',') : '', p.juros ? String(p.juros).replace('.', ',') : '', l.parcelas_pagas + '/' + l.total_parcelas,
          l.ultimo_pagamento ? fDC(l.ultimo_pagamento.em) + ' ' + (l.ultimo_pagamento.forma_label || '') : '', String(l.saldo_devedor).replace('.', ',')];
      })));
    };
    var maxCx = Math.max.apply(null, (d.caixa || []).map(function (c) { return Math.max(c.recebido, c.previsto); }).concat([1]));
    var lk = function (txt, fn, cor, dis) { return h('button', { type: 'button', disabled: dis, onClick: function (e) { e.stopPropagation(); fn(); }, className: 'hover:underline', style: { color: cor || ROXO, fontWeight: 600, cursor: 'pointer', fontSize: 12.5, background: 'none', border: 0, padding: 0 } }, txt); };
    var cobrarUm = function (l) {
      setOcupado('c' + l.contrato_id);
      api('/parcelas/' + l.parcela.id + '/cobrar', { method: 'POST', body: {} }).then(function (r) {
        toast(r.whatsapp && r.whatsapp.enviado ? 'Cobrança enviada no WhatsApp' : 'PIX gerado' + (r.whatsapp && r.whatsapp.motivo ? ' (WhatsApp: ' + r.whatsapp.motivo + ')' : ''), 'success');
        if (r.pix_copia_cola && !(r.whatsapp && r.whatsapp.enviado)) copiar(r.pix_copia_cola, toast);
        carregar();
      }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setOcupado(null); });
    };
    var todosMarcados = vis.length > 0 && vis.every(function (l) { return sel[l.contrato_id]; });
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
        h('div', { style: { display: 'inline-flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', overflow: 'hidden' } },
          h('button', { type: 'button', 'aria-label': 'Semana anterior', onClick: function () { setD(null); setInicio(addDiasISO(sem.inicio, -7)); }, className: 'hover:bg-gray-50', style: { width: 36, height: 38, cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#374151' } }, ico('arrowleft', 15)),
          h('span', { style: { fontSize: 13, fontWeight: 600, padding: '0 10px', whiteSpace: 'nowrap' } }, 'Semana ' + semanaLabel(sem.inicio, sem.fim)),
          h('button', { type: 'button', 'aria-label': 'Próxima semana', onClick: function () { setD(null); setInicio(addDiasISO(sem.inicio, 7)); }, className: 'hover:bg-gray-50', style: { width: 36, height: 38, cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#374151' } }, ico('arrowright', 15))),
        inicio ? Btn({ variant: 'link', small: true, onClick: function () { setD(null); setInicio(null); }, children: 'Voltar para esta semana' }) : null,
        h('div', { style: { flex: 1 } }),
        Btn({ icon: 'download', onClick: exportar, children: 'Exportar planilha' }),
        Btn({ variant: 'pri', icon: 'message', disabled: !atrasados.length || !!ocupado, onClick: function () { cobrarLista(atrasados, 'atrasados'); }, children: ocupado === 'atrasados' ? 'Cobrando...' : 'Cobrar atrasados (' + atrasados.length + ')' })),
      KpiStrip([
        { r: 'Recebido na semana', v: fR(k.recebido), s: k.recebido_qtd + ' pagamento' + (k.recebido_qtd === 1 ? '' : 's') + (k.recebido_repasse ? ' · ' + k.recebido_repasse + ' por repasse' : ''), cor: '#166534' },
        { r: 'Falta receber na semana', v: fR(k.falta), s: k.falta_qtd + ' parcela' + (k.falta_qtd === 1 ? '' : 's') + ' até ' + fDC(sem.fim) },
        { r: 'Vence hoje', v: fR(k.vence_hoje), s: k.vence_hoje_qtd ? k.vence_hoje_qtd + ' parcela' + (k.vence_hoje_qtd > 1 ? 's' : '') + (k.vence_hoje_pix ? ' · ' + k.vence_hoje_pix + ' com PIX enviado' : '') : 'nenhuma' },
        { r: 'Em atraso', v: fR(k.atraso), s: k.atraso_contratos ? k.atraso_contratos + ' contrato' + (k.atraso_contratos > 1 ? 's' : '') + ' · encargos ' + fR(k.atraso_encargos) : 'ninguém atrasado', cor: k.atraso > 0 ? '#991b1b' : null },
        { r: 'Inadimplência', v: (k.inadimplencia_pct || 0) + '%', s: k.atraso_contratos + ' de ' + k.ativos + ' contratos ativos' }
      ]),
      h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start' },
        h(Card, { pad: false, label: 'Locatários' },
          h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
            Chips([
              { id: 'pendentes', t: 'Pendentes', n: cnt(pend) },
              { id: 'atraso', t: 'Em atraso', n: cnt(FILTROS.atraso) },
              { id: 'hoje', t: 'Vence hoje', n: cnt(FILTROS.hoje) },
              { id: 'pagaram', t: 'Pagaram na semana', n: cnt(FILTROS.pagaram) },
              { id: 'todos', t: 'Todos os contratos', n: linhas.length }
            ], filtro, function (v) { setFiltro(v); setSel({}); }),
            h('div', { style: { flex: 1 } }),
            h('div', { style: { minWidth: 220 } }, Busca(q, setQ, 'Nome, contrato ou placa'))),
          vis.length === 0 ? Vazio(filtro === 'pendentes' ? 'Ninguém pendente nesta semana' : 'Nada neste filtro', filtro === 'pendentes' ? 'Quem pagou some da lista. Veja em Pagaram na semana.' : null) :
          Tabela([{ t: h('input', { type: 'checkbox', 'aria-label': 'Selecionar todos', checked: todosMarcados, onChange: function (e) { var n = {}; if (e.target.checked) vis.forEach(function (l) { if (l.parcela) n[l.contrato_id] = true; }); setSel(n); }, style: { accentColor: ROXO, width: 16, height: 16 } }), w: 36 },
            { t: 'Locatário' }, { t: 'Parcela' }, { t: 'Valor', right: true }, { t: 'Situação' }, { t: 'Cobrança' }, { t: 'Último pagamento' }, { t: '' }],
            vis.map(function (l) {
              var p = l.parcela;
              return Linha(l.contrato_id, [
                { td: 1, v: p ? h('input', { type: 'checkbox', 'aria-label': 'Selecionar ' + l.cliente_nome, checked: !!sel[l.contrato_id], onClick: function (e) { e.stopPropagation(); }, onChange: function (e) { var n = Object.assign({}, sel); n[l.contrato_id] = e.target.checked; setSel(n); }, style: { accentColor: ROXO, width: 16, height: 16 } }) : null },
                { td: 1, v: h('div', null, h('div', { style: { fontWeight: 600 } }, l.cliente_nome), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, l.numero + ' · ' + l.placa)) },
                { td: 1, v: p ? h('div', null, p.numero + ' de ' + l.total_parcelas, h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, (p.status === 'atrasada' ? 'venceu ' : p.status === 'vence_hoje' ? 'vence hoje ' : 'vence ') + fDS(p.vencimento, true))) : h('span', { style: { color: '#9ca3af' } }, '—'), st: { whiteSpace: 'nowrap' } },
                { td: 1, right: true, v: p ? h('div', null, h('b', null, fR(p.saldo)), num(p.juros) > 0 ? h('div', { style: { fontSize: 11.5, color: '#991b1b' } }, '+ ' + fR(p.juros) + ' encargos') : num(p.abatido) > 0 ? h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, fR(p.abatido) + ' do repasse') : null) : '—' },
                { td: 1, v: l.atrasadas_qtd > 1 ? Pill(l.atrasadas_qtd + ' atrasadas · ' + l.dias_atraso + 'd', 'vermelho') : p ? pillParc(p) : pillSit(l) },
                { td: 1, v: cobrancaTxt(l.ultima_cobranca), st: { fontSize: 12.5, color: '#374151', whiteSpace: 'nowrap' } },
                { td: 1, v: l.ultimo_pagamento ? fDC(l.ultimo_pagamento.em) + ' · ' + (l.ultimo_pagamento.forma_label || '') : h('span', { style: { color: '#9ca3af' } }, 'nenhum'), st: { fontSize: 12.5, whiteSpace: 'nowrap' } },
                { td: 1, right: true, v: p ? h('span', { style: { display: 'inline-flex', gap: 10 } },
                  lk(ocupado === 'c' + l.contrato_id ? 'Enviando...' : (p.cobranca_enviada_em ? 'Reenviar' : 'Cobrar'), function () { cobrarUm(l); }, null, !!ocupado),
                  lk('Baixa', function () { setModal({ baixa: p, contrato_id: l.contrato_id }); }, '#374151')) : null }
              ], function () { nav({ tela: 'financeiro', id: l.contrato_id }); }, p && p.status === 'atrasada' ? { background: '#fffafa' } : null);
            })),
          selLinhas.length ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '12px 16px', background: '#faf7fd', borderTop: '1px solid #e9d5f9' } },
            h('b', { style: { fontSize: 13, color: ROXO_ESC } }, selLinhas.length + ' selecionado' + (selLinhas.length > 1 ? 's' : '') + ' · ' + fR(selLinhas.reduce(function (s, l) { return s + num(l.parcela.saldo); }, 0))),
            Btn({ small: true, variant: 'pri', icon: 'message', disabled: !!ocupado, onClick: function () { cobrarLista(selLinhas, 'sel'); }, children: ocupado === 'sel' ? 'Cobrando...' : 'Cobrar no WhatsApp' }),
            Btn({ small: true, icon: 'check', disabled: !!ocupado, onClick: function () { setModal({ lote: selLinhas.map(function (l) { return Object.assign({}, l.parcela, { rotulo: l.cliente_nome + ' · parcela ' + l.parcela.numero }); }) }); }, children: 'Registrar baixa' }),
            h('div', { style: { flex: 1 } }),
            Btn({ variant: 'link', small: true, onClick: function () { setSel({}); }, children: 'Limpar seleção' })) :
            h('div', { style: { padding: '10px 16px', borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#6b7280' } }, 'Clique no nome para abrir o financeiro da pessoa. Marque vários para cobrar ou dar baixa de uma vez.')),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          h(Card, { pad: false, label: 'Caixa da semana' }, CardHead('Caixa da semana', null, 'recebido / previsto'),
            h('div', { style: { display: 'flex', gap: 6, alignItems: 'flex-end', padding: '16px 16px 8px', height: 150, boxSizing: 'border-box' } },
              (d.caixa || []).map(function (c) {
                var hp = Math.max(6, Math.round(100 * c.previsto / maxCx)), hr = Math.round(100 * Math.min(c.recebido, Math.max(c.previsto, c.recebido)) / maxCx);
                var dia = parseData(c.dia), ehHoje = c.dia === sem.hoje;
                return h('div', { key: c.dia, title: fDC(c.dia) + ': recebido ' + fR(c.recebido) + ' · previsto ' + fR(c.previsto), style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontSize: 11.5, color: ehHoje ? ROXO_ESC : '#6b7280', fontWeight: ehHoje ? 700 : 500 } },
                  h('div', { style: { width: 22, height: Math.max(hp, hr), borderRadius: '5px 5px 0 0', background: '#f3f4f6', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' } },
                    hr ? h('div', { style: { height: hr, background: c.recebido >= c.previsto ? ROXO : '#f59e0b' } }) : null),
                  DIAS_CURTO[dia.getDay()]);
              })),
            h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', padding: '0 16px 14px', fontSize: 11.5, color: '#374151' } },
              [[ROXO, 'recebido'], ['#f3f4f6', 'previsto'], ['#f59e0b', 'parcial']].map(function (x) { return h('span', { key: x[1], style: { display: 'inline-flex', gap: 5, alignItems: 'center' } }, h('span', { style: { width: 10, height: 10, borderRadius: 3, background: x[0], border: '1px solid #e5e7eb' } }), x[1]); }))),
          h(Card, { pad: false, label: 'Cobranças avulsas abertas' }, CardHead('Cobranças avulsas abertas', h('b', { style: { fontSize: 13 } }, (d.avulsas_abertas || []).length)),
            (d.avulsas_abertas || []).length ? (d.avulsas_abertas || []).slice(0, 8).map(function (a) {
              return h('button', { key: a.id, type: 'button', onClick: function () { nav({ tela: 'financeiro', id: a.contrato_id }); }, className: 'hover:bg-purple-50', style: { width: '100%', textAlign: 'left', display: 'flex', gap: 10, padding: '10px 16px', borderTop: '1px solid #f3f4f6', cursor: 'pointer', background: 'transparent' } },
                h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontSize: 13, fontWeight: 600 } }, a.cliente_nome), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, ({ antecipacao: 'Antecipação', ocorrencia: 'Ocorrência', encerramento: 'Encerramento', opcao_compra: 'Opção de compra' }[a.tipo] || a.tipo) + ' · ' + fDC(a.criado_em))),
                h('b', { style: Object.assign({ fontSize: 13 }, TAB) }, fR(a.valor)));
            }) : h('div', { style: { padding: '12px 16px', fontSize: 12.5, color: '#6b7280' } }, 'Multas, ocorrências e antecipações aparecem aqui até serem pagas.')),
          h(Card, { pad: false, label: 'Cobrança automática' }, CardHead('Cobrança automática'),
            h('div', { style: { padding: '12px 16px', fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 } }, 'O PIX sai sozinho no vencimento e a régua avisa no WhatsApp nos dias configurados. ',
              h('button', { type: 'button', onClick: function () { nav({ tela: 'lista', tab: 'config' }); }, className: 'hover:underline', style: { color: ROXO, fontWeight: 600, cursor: 'pointer' } }, 'Ajustar a régua em Configurações'))))),
      modal && modal.baixa ? h(BaixaModal, { p: modal.baixa, onClose: function () { setModal(null); },
        onConfirm: function (b) { return api('/parcelas/' + modal.baixa.id + '/baixa-manual', { method: 'POST', body: b }).then(function () { toast('Baixa registrada', 'success'); setModal(null); carregar(); props.aoMudar && props.aoMudar(); }).catch(function (e) { toast(e.message, 'error'); throw e; }); } }) : null,
      modal && modal.lote ? h(BaixaLoteModal, { api: api, toast: toast, parcelas: modal.lote, onClose: function () { setModal(null); }, onFeito: function () { setModal(null); carregar(); props.aoMudar && props.aoMudar(); } }) : null);
  }

  /* Baixa de várias parcelas de uma vez (mesma data e observação) */
  function BaixaLoteModal(props) {
    var ps = props.parcelas || [];
    var _d = useState(hojeISO()), data = _d[0], setData = _d[1];
    var _o = useState(''), obs = _o[0], setObs = _o[1];
    var _x = useState(false), semEnc = _x[0], setSemEnc = _x[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    var enc = ps.reduce(function (t, p) { return t + num(p.juros); }, 0);
    var total = ps.reduce(function (t, p) { return t + num(p.saldo != null ? p.saldo : p.total); }, 0);
    var confirmar = function () {
      setS(true);
      var ok = 0, falha = [];
      ps.reduce(function (pr, p) {
        return pr.then(function () {
          return props.api('/parcelas/' + p.id + '/baixa-manual', { method: 'POST', body: { data_pagamento: data, observacao: obs.trim(), dispensar_encargos: semEnc } })
            .then(function () { ok++; }).catch(function (e) { falha.push((p.rotulo || 'parcela ' + p.numero) + ': ' + e.message); });
        });
      }, Promise.resolve()).then(function () {
        setS(false);
        if (falha.length) props.toast(ok + ' baixada' + (ok === 1 ? '' : 's') + ' · falhou: ' + falha.join(' · '), 'error');
        else props.toast(ok + ' parcela' + (ok === 1 ? '' : 's') + ' baixada' + (ok === 1 ? '' : 's'), 'success');
        props.onFeito();
      });
    };
    return h(Modal, { titulo: 'Registrar baixa · ' + ps.length + ' parcela' + (ps.length > 1 ? 's' : ''), onClose: props.onClose, largura: 520,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }), Btn({ key: 'o', variant: 'pri', icon: 'check', disabled: s || obs.trim().length < 3, onClick: confirmar, children: s ? 'Baixando...' : 'Registrar baixa de ' + fR(semEnc ? total - enc : total) })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { border: '1px solid #e5e7eb', borderRadius: 12, maxHeight: 220, overflowY: 'auto' } },
          ps.map(function (p, i) {
            return h('div', { key: p.id, style: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderTop: i ? '1px solid #f3f4f6' : 0, fontSize: 13 } },
              h('span', null, p.rotulo || 'Parcela ' + p.numero + ' · ' + fDC(p.vencimento)), h('b', { style: TAB }, fR(semEnc ? num(p.saldo) - num(p.juros) : p.saldo)));
          })),
        enc > 0 ? Check(semEnc, setSemEnc, 'Dispensar os encargos (' + fR(enc) + ')', 'Baixa só do valor das parcelas. Fica no histórico com o seu nome.') : null,
        h(Field, { label: 'Data do pagamento', req: true }, Input({ type: 'date', value: data, max: hojeISO(), onChange: function (e) { setData(e.target.value); } })),
        h(Field, { label: 'Observação', req: true, hint: 'Vale para todas. Ex.: PIX recebido na conta da empresa.' }, TextArea({ rows: 3, value: obs, onChange: function (e) { setObs(e.target.value); } }))));
  }

  /* Antecipação pela equipe: parcelas escolhidas, desconto opcional, PIX no WhatsApp ou baixa direta */
  function AnteciparModal(props) {
    var api = props.api, toast = props.toast, ps = props.parcelas || [];
    var _d = useState(''), desc = _d[0], setDesc = _d[1];
    var _m = useState('pix'), modo = _m[0], setModo = _m[1];
    var _o = useState(''), obs = _o[0], setObs = _o[1];
    var _dt = useState(hojeISO()), data = _dt[0], setData = _dt[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    var _r = useState(null), res = _r[0], setRes = _r[1];
    var bruto = ps.reduce(function (t, p) { return t + num(p.saldo); }, 0);
    var dv = Math.max(0, num(String(desc).replace(/\./g, '').replace(',', '.')));
    var total = Math.max(0, bruto - dv);
    var invalido = dv >= bruto || (modo === 'baixa' && obs.trim().length < 3);
    var confirmar = function () {
      setS(true);
      api('/contratos/' + props.contrato.id + '/antecipar', { method: 'POST', body: { parcela_ids: ps.map(function (p) { return p.id; }), desconto: dv, modo: modo, observacao: obs.trim(), data_pagamento: data } })
        .then(function (r) {
          if (r.modo === 'baixa') { toast('Antecipação baixada · ' + r.numeros.length + ' parcela' + (r.numeros.length > 1 ? 's' : ''), 'success'); props.onFeito(); return; }
          setRes(r);
          toast(r.pix_copia_cola ? (r.whatsapp && r.whatsapp.enviado ? 'PIX enviado no WhatsApp' : 'PIX gerado') : 'Cobrança criada, mas o PIX não saiu' + (r.pix_erro ? ': ' + r.pix_erro : ''), r.pix_copia_cola ? 'success' : 'error');
        }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setS(false); });
    };
    if (res) return h(Modal, { titulo: 'Antecipação criada', onClose: props.onFeito, largura: 480, rodape: [Btn({ key: 'f', variant: 'pri', onClick: props.onFeito, children: 'Fechar' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 } },
        h('div', null, 'Parcelas ', h('b', null, res.numeros.join(', ')), ' · ', h('b', { style: TAB }, fR(res.valor)), res.desconto ? ' (desconto de ' + fR(res.desconto) + ')' : ''),
        res.whatsapp ? Aviso(res.whatsapp.enviado ? 'verde' : 'ambar', res.whatsapp.enviado ? 'PIX enviado no WhatsApp do locatário' : 'WhatsApp não enviado', res.whatsapp.enviado ? null : (res.whatsapp.motivo || 'Copie o PIX e mande você.')) : null,
        res.pix_copia_cola ? h('div', { style: { display: 'flex', gap: 8 } }, h('input', { readOnly: true, value: res.pix_copia_cola, 'aria-label': 'PIX copia e cola', style: { flex: 1, minWidth: 0, height: 38, border: '1px solid #e5e7eb', borderRadius: 10, padding: '0 10px', fontSize: 12, fontFamily: MONO } }), Btn({ icon: 'copy', onClick: function () { copiar(res.pix_copia_cola, toast); }, children: 'Copiar' })) : null,
        h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Quando o PIX cair, as parcelas são baixadas sozinhas.')));
    var opcao = function (id, titulo, sub) {
      var on = modo === id;
      return h('button', { type: 'button', role: 'radio', 'aria-checked': on, onClick: function () { setModo(id); },
        style: { textAlign: 'left', display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 12, cursor: 'pointer', background: on ? '#faf7fd' : '#fff', border: (on ? 2 : 1) + 'px solid ' + (on ? ROXO : '#e5e7eb') } },
        h('span', { style: { width: 16, height: 16, borderRadius: 99, border: '2px solid ' + (on ? ROXO : '#d1d5db'), display: 'grid', placeItems: 'center', marginTop: 2, flex: 'none' } }, on ? h('span', { style: { width: 8, height: 8, borderRadius: 99, background: ROXO } }) : null),
        h('div', null, h('b', { style: { fontSize: 13.5 } }, titulo), h('div', { style: { fontSize: 12, color: '#6b7280', marginTop: 2 } }, sub)));
    };
    return h(Modal, { titulo: 'Antecipar parcelas', onClose: props.onClose, largura: 520,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }), Btn({ key: 'o', variant: 'pri', icon: modo === 'pix' ? 'message' : 'check', disabled: s || invalido, onClick: confirmar, children: s ? 'Salvando...' : (modo === 'pix' ? 'Gerar PIX de ' : 'Dar baixa de ') + fR(total) })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { border: '1px solid #e5e7eb', borderRadius: 12, padding: '4px 12px' } },
          ps.map(function (p) { return h('div', { key: p.id, style: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 } }, h('span', null, 'Parcela ' + p.numero + ' · ' + fDS(p.vencimento, true)), h('b', { style: TAB }, fR(p.saldo))); }),
          dv > 0 ? h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13, color: '#166534' } }, h('span', null, 'Desconto'), h('b', { style: TAB }, '− ' + fR(dv))) : null,
          h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 15 } }, h('b', null, 'Total'), h('b', { style: TAB }, fR(total)))),
        h(Field, { label: 'Desconto (opcional)', hint: dv >= bruto ? 'O desconto não pode passar do valor das parcelas.' : 'Em reais. Fica no histórico e é dividido entre as parcelas.' }, Input({ inputMode: 'decimal', placeholder: '0,00', value: desc, onChange: function (e) { setDesc(e.target.value.replace(/[^\d,.]/g, '')); } })),
        h('div', { role: 'radiogroup', 'aria-label': 'Como vai receber', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          opcao('pix', 'Gerar PIX e mandar no WhatsApp', 'As parcelas são baixadas sozinhas quando o PIX cair.'),
          opcao('baixa', 'Já recebi, dar baixa agora', 'Pagou por fora (dinheiro ou PIX na conta da empresa).')),
        modo === 'baixa' ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          h(Field, { label: 'Data do pagamento', req: true }, Input({ type: 'date', value: data, max: hojeISO(), onChange: function (e) { setData(e.target.value); } })),
          h(Field, { label: 'Observação', req: true, hint: 'Como recebeu. Fica no histórico.' }, TextArea({ rows: 2, value: obs, onChange: function (e) { setObs(e.target.value); } }))) : null));
  }

  /* Financeiro de um contrato: parcelas, cobrança, baixa, antecipação, extrato e desconto em repasses */
  function FinanceiroContrato(props) {
    var api = props.api, toast = props.toast, nav = props.nav;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _av = useState([]), avs = _av[0], setAvs = _av[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _f = useState('abertas'), filtro = _f[0], setFiltro = _f[1];
    var _t = useState(false), todas = _t[0], setTodas = _t[1];
    var _s = useState({}), sel = _s[0], setSel = _s[1];
    var _m = useState(null), modal = _m[0], setModal = _m[1];
    var _o = useState(null), ocupado = _o[0], setOcupado = _o[1];
    var _x = useState(false), extratoTodo = _x[0], setExtratoTodo = _x[1];
    var carregar = useCallback(function () {
      setErro(null);
      api('/contratos/' + props.id).then(function (r) { setD(r); setSel({}); }).catch(function (e) { setErro(e.message); });
      api('/contratos/' + props.id + '/cobrancas-avulsas').then(function (r) { setAvs(r.cobrancas || []); }).catch(function () { setAvs([]); });
    }, [api, props.id]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d) return Spinner('Abrindo o financeiro...');
    var c = d.contrato || {}, cli = d.cliente || {}, mo = d.moto || {}, k = d.indicadores || {}, parcelas = d.parcelas || [], logs = d.logs || [];
    var aberta = { a_vencer: 1, vence_hoje: 1, atrasada: 1 };
    var ativo = c.situacao === 'em_dia' || c.situacao === 'atrasada';
    var mudou = function () { carregar(); props.aoMudar && props.aoMudar(); };
    var abertas = parcelas.filter(function (p) { return aberta[p.status]; });
    var pagas = parcelas.filter(function (p) { return p.status === 'paga'; });
    var cnt = function (fn) { return parcelas.filter(fn).length; };
    var fl = parcelas.filter(function (p) {
      if (filtro === 'abertas') return !!aberta[p.status];
      if (filtro === 'atrasadas') return p.status === 'atrasada';
      if (filtro === 'pagas') return p.status === 'paga';
      return true;
    });
    if (filtro === 'pagas') fl = fl.slice().reverse();
    var janela = todas || fl.length <= 10 ? fl : fl.slice(0, 10);
    var selPs = parcelas.filter(function (p) { return sel[p.id] && aberta[p.status]; });
    var primeiraCobravel = parcelas.find(function (p) { return p.status === 'atrasada' || p.status === 'vence_hoje'; }) || abertas[0];
    var pagoTotal = pagas.reduce(function (s, p) { return s + num(p.total); }, 0);
    var cobrar = function (p) {
      setOcupado('p' + p.id);
      api('/parcelas/' + p.id + '/cobrar', { method: 'POST', body: {} }).then(function (r) {
        toast(r.whatsapp && r.whatsapp.enviado ? 'Cobrança enviada no WhatsApp' : 'PIX gerado' + (r.whatsapp && r.whatsapp.motivo ? ' (WhatsApp: ' + r.whatsapp.motivo + ')' : ''), 'success');
        if (r.pix_copia_cola && !(r.whatsapp && r.whatsapp.enviado)) copiar(r.pix_copia_cola, toast);
        carregar();
      }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setOcupado(null); });
    };
    var mudarDesconto = function (v) {
      if (!v && !window.confirm('Revogar a autorização de desconto em repasses (Anexo III)? As próximas parcelas passam a ser cobradas só por Pix.')) return;
      setOcupado('desc');
      api('/contratos/' + c.id + '/desconto-repasse', { method: 'POST', body: { autorizar: v } }).then(function () { toast(v ? 'Desconto em repasses autorizado' : 'Autorização revogada', 'success'); mudou(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setOcupado(null); });
    };
    var antecipaveis = abertas.filter(function (p) { return p.status === 'a_vencer'; });
    var abrirAntecipar = function (lista) {
      var ps = (lista && lista.length ? lista : antecipaveis.slice(0, 1));
      if (!ps.length) { toast('Não há parcelas a vencer para antecipar', 'error'); return; }
      setModal({ antecipar: ps });
    };
    var vencLabel = c.vencimento_label || (cli.dia_vencimento ? DIA_PLURAL[cli.dia_vencimento] : '');
    var extrato = [];
    logs.forEach(function (l) { if (ACOES_FIN[l.acao]) extrato.push({ id: 'l' + l.id, t: l.detalhe || l.acao, em: l.criado_em, por: l.usuario_nome, cor: /pag|baixa|abatid|antecip/.test(l.acao) ? '#16a34a' : /atras|bloq|erro|nao_env/.test(l.acao) ? '#dc2626' : '#9ca3af' }); });
    var extratoVis = extratoTodo ? extrato : extrato.slice(0, 8);
    var lk = function (txt, fn, cor, dis) { return h('button', { type: 'button', disabled: dis, onClick: fn, className: 'hover:underline', style: { color: cor || ROXO, fontWeight: 600, cursor: 'pointer', fontSize: 12.5, background: 'none', border: 0, padding: 0 } }, txt); };
    var marcarTodas = function (on) { var n = {}; if (on) janela.forEach(function (p) { if (aberta[p.status]) n[p.id] = true; }); setSel(n); };
    var todasMarcadas = janela.some(function (p) { return aberta[p.status]; }) && janela.every(function (p) { return !aberta[p.status] || sel[p.id]; });
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      voltar(function () { props.de === 'contratos' ? nav({ tela: 'contrato', id: c.id }) : nav({ tela: 'lista', tab: 'financeiro' }); }, props.de === 'contratos' ? 'Perfil do contrato' : 'Financeiro'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' } },
        h(MotoImg, { src: mo.capa_thumb, tipo: mo.tipo, modelo: mo.modelo, cor: mo.cor, w: 64, h: 46, r: 10 }),
        h('div', { style: { flex: '1 1 420px', minWidth: 0 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } }, h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 22, fontWeight: 700 } }, cli.nome || '—'), pillSit(c)),
          h('div', { style: { fontSize: 13, color: '#6b7280', marginTop: 3 } }, c.numero + ' · ' + (mo.modelo || '') + ' ', h('span', { style: { fontFamily: MONO, color: '#374151' } }, mo.placa), ' · ' + fR(c.valor_parcela != null ? c.valor_parcela : c.valor_semanal) + (c.periodicidade === 'mensal' ? ' por mês' : ' por semana') + (vencLabel ? ', ' + vencLabel : '') + ' · ',
            h('button', { type: 'button', onClick: function () { nav({ tela: 'contrato', id: c.id }); }, className: 'hover:underline', style: { color: ROXO, fontWeight: 600, cursor: 'pointer' } }, 'perfil e contrato'))),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          ativo || c.situacao === 'em_retomada' || c.situacao === 'suspenso' ? Btn({ icon: 'tag', onClick: function () { setModal('cobranca'); }, children: 'Lançar cobrança avulsa' }) : null,
          ativo && antecipaveis.length ? Btn({ icon: 'zap', onClick: function () { abrirAntecipar(selPs.filter(function (p) { return p.status === 'a_vencer'; })); }, children: 'Antecipar parcelas' }) : null,
          abertas.length ? Btn({ icon: 'check', onClick: function () { if (selPs.length > 1) setModal({ lote: selPs }); else setModal({ baixa: selPs[0] || primeiraCobravel }); }, children: 'Registrar baixa' }) : null,
          primeiraCobravel ? Btn({ variant: 'pri', icon: 'message', disabled: ocupado === 'p' + primeiraCobravel.id, onClick: function () { cobrar(primeiraCobravel); }, children: 'Cobrar no WhatsApp' }) : null)),
      KpiStrip([
        { r: 'Em atraso', v: fR(k.atrasado_valor), s: num(k.atrasadas_qtd) ? k.atrasadas_qtd + ' parcela' + (k.atrasadas_qtd > 1 ? 's' : '') + ' · ' + (c.dias_atraso || 0) + ' dias' + (c.bloqueio_sinalizado_em ? ' · bloqueio sinalizado' : '') : 'nenhuma parcela vencida', cor: num(k.atrasadas_qtd) ? '#991b1b' : null },
        { r: 'Próximo vencimento', v: k.proximo_vencimento ? fDC(k.proximo_vencimento) : '—', s: (function () { var pp = parcelas.find(function (x) { return x.vencimento === k.proximo_vencimento; }); return pp ? 'parcela ' + pp.numero + ' · ' + fR(pp.total) : ''; })() },
        { r: 'Pago até agora', v: fR(pagoTotal), s: fN(k.pagas) + ' de ' + fN(k.total_parcelas) + ' parcelas' },
        { r: 'Saldo devedor', v: fR(k.saldo_devedor), s: (num(k.total_parcelas) - num(k.pagas)) + ' parcelas restantes' },
        { r: 'Forma de pagamento', v: c.autoriza_desconto_repasse ? 'Repasse + PIX' : 'PIX', s: c.autoriza_desconto_repasse ? 'desconto em repasses autorizado' : 'desconto em repasses: não autorizado' }
      ]),
      h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start' },
        h(Card, { pad: false, label: 'Parcelas' },
          h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
            h('h2', { style: { margin: '0 6px 0 0', fontSize: 15, fontWeight: 700 } }, 'Parcelas'),
            Chips([{ id: 'abertas', t: 'Em aberto', n: abertas.length }, { id: 'atrasadas', t: 'Atrasadas', n: cnt(function (p) { return p.status === 'atrasada'; }) }, { id: 'pagas', t: 'Pagas', n: pagas.length }, { id: 'todas', t: 'Todas', n: parcelas.length }], filtro, function (v) { setFiltro(v); setTodas(false); setSel({}); })),
          parcelas.length === 0 ? Vazio(c.situacao === 'aguardando_assinatura' ? 'As parcelas aparecem depois da assinatura' : 'Sem parcelas') :
          janela.length === 0 ? Vazio('Nenhuma parcela neste filtro') :
          Tabela([{ t: h('input', { type: 'checkbox', 'aria-label': 'Selecionar todas', checked: todasMarcadas, onChange: function (e) { marcarTodas(e.target.checked); }, style: { accentColor: ROXO, width: 16, height: 16 } }), w: 36 },
            { t: 'Nº' }, { t: 'Vencimento' }, { t: 'Valor', right: true }, { t: 'Encargos', right: true }, { t: 'Total', right: true }, { t: 'Status' }, { t: 'Pagamento / cobrança' }, { t: '' }],
            janela.map(function (p) {
              var ab = !!aberta[p.status];
              var info = p.status === 'paga' ? (p.forma_label || p.forma || '—') + (p.pago_em ? ' · ' + fDC(p.pago_em) : '') + (num(p.encargos_dispensados) > 0 ? ' · encargos dispensados' : '') + (num(p.desconto_concedido) > 0 ? ' · desconto ' + fR(p.desconto_concedido) : '')
                : (num(p.valor_abatido_repasse) > 0 ? 'Repasse ' + fR(p.valor_abatido_repasse) + ' · falta ' + fR(p.saldo) : (p.cobranca_enviada_em ? 'Cobrado ' + fDC(p.cobranca_enviada_em) : '—'));
              return Linha(p.id, [
                { td: 1, v: ab ? h('input', { type: 'checkbox', 'aria-label': 'Selecionar parcela ' + p.numero, checked: !!sel[p.id], onChange: function (e) { var n = Object.assign({}, sel); n[p.id] = e.target.checked; setSel(n); }, style: { accentColor: ROXO, width: 16, height: 16 } }) : null },
                { td: 1, v: p.numero },
                { td: 1, v: fDS(p.vencimento), st: { whiteSpace: 'nowrap' } },
                { td: 1, right: true, v: num(p.valor_extras) > 0 ? h('span', { title: (p.extras || []).map(function (x) { return x.descricao + ' ' + fR(x.valor); }).join(' · ') }, fR(p.valor), h('div', { style: { fontSize: 11.5, color: ROXO_ESC, fontWeight: 600 } }, '+ ' + fR(p.valor_extras) + ' extras')) : fR(p.valor) },
                { td: 1, right: true, v: num(p.juros) > 0 ? h('span', { style: { color: '#991b1b', fontWeight: 600 } }, fR(p.juros), p.encargos ? h('div', { style: { fontSize: 11, color: '#6b7280', fontWeight: 500 } }, 'multa ' + fR(p.encargos.multa) + ' · juros ' + fR(p.encargos.juros) + ' · IPCA ' + fR(p.encargos.correcao)) : null) : h('span', { style: { color: '#9ca3af' } }, '—') },
                { td: 1, right: true, v: fR(p.total), st: { fontWeight: 600 } },
                { td: 1, v: pillParc(p) },
                { td: 1, v: info, st: { fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' } },
                { td: 1, right: true, st: { whiteSpace: 'nowrap' }, v: ab ? h('span', { style: { display: 'inline-flex', gap: 10 } },
                  lk(ocupado === 'p' + p.id ? 'Enviando...' : (p.cobranca_enviada_em ? 'Reenviar' : 'Cobrar'), function () { cobrar(p); }, null, !!ocupado),
                  p.pix_copia_cola ? lk('Copiar PIX', function () { copiar(p.pix_copia_cola, toast); }) : null,
                  lk('Baixa', function () { setModal({ baixa: p }); }, '#374151'))
                  : p.status === 'paga' ? lk('Recibo', function () { setModal({ recibo: p }); }) : null }
              ], null, p.status === 'atrasada' ? { background: '#fffafa' } : sel[p.id] ? { background: '#faf7fd' } : null);
            })),
          selPs.length ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: '12px 16px', background: '#faf7fd', borderTop: '1px solid #e9d5f9' } },
            h('b', { style: { fontSize: 13, color: ROXO_ESC } }, selPs.length + ' parcela' + (selPs.length > 1 ? 's' : '') + ' · ' + fR(selPs.reduce(function (s, p) { return s + num(p.saldo); }, 0))),
            ativo && selPs.every(function (p) { return p.status === 'a_vencer'; }) ? Btn({ small: true, variant: 'pri', icon: 'zap', onClick: function () { abrirAntecipar(selPs); }, children: 'Antecipar com PIX' }) : null,
            Btn({ small: true, icon: 'check', onClick: function () { setModal(selPs.length > 1 ? { lote: selPs } : { baixa: selPs[0] }); }, children: selPs.length > 1 ? 'Registrar baixa das ' + selPs.length : 'Registrar baixa' }),
            h('div', { style: { flex: 1 } }), Btn({ variant: 'link', small: true, onClick: function () { setSel({}); }, children: 'Limpar seleção' }))
            : fl.length > 10 ? h('div', { style: { padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6b7280' } },
              h('span', null, todas ? 'Mostrando todas as ' + fl.length : 'Mostrando 10 de ' + fl.length), Btn({ variant: 'link', small: true, onClick: function () { setTodas(!todas); }, children: todas ? 'Mostrar menos' : 'Ver todas' })) : null),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          h(Card, { pad: false, label: 'Extrato' }, CardHead('Extrato', null, 'pagamentos e cobranças'),
            extrato.length === 0 ? h('div', { style: { padding: '12px 16px', fontSize: 13, color: '#9ca3af' } }, 'Sem movimentação ainda.') :
            h('div', { style: { padding: '6px 16px 10px' } }, extratoVis.map(function (l) {
              return h('div', { key: l.id, style: { display: 'grid', gridTemplateColumns: '8px 1fr', gap: 10, padding: '7px 0', borderTop: '1px solid #f9fafb' } },
                h('span', { style: { width: 8, height: 8, borderRadius: 99, marginTop: 6, background: l.cor } }),
                h('div', { style: { minWidth: 0 } }, h('div', { style: { fontSize: 13 } }, l.t), h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, fDHc(l.em) + ' · ' + (l.por || 'sistema'))));
            }), extrato.length > 8 ? Btn({ variant: 'link', small: true, onClick: function () { setExtratoTodo(!extratoTodo); }, children: extratoTodo ? 'Mostrar menos' : 'Ver extrato completo (' + extrato.length + ')' }) : null)),
          cli.tipo === 'tutts' && (ativo || c.situacao === 'suspenso') ? h(Card, { pad: false, label: 'Desconto em repasses' }, CardHead('Desconto em repasses', Pill(c.autoriza_desconto_repasse ? 'Autorizado' : 'Desligado', c.autoriza_desconto_repasse ? 'verde' : 'cinza', true)),
            h('div', { style: { padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' } },
              Toggle(!!c.autoriza_desconto_repasse, function (v) { if (ocupado !== 'desc') mudarDesconto(v); }, 'Desconto em repasses'),
              h('div', { style: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.45 } }, 'Autorizado pelo Anexo III, a parcela é abatida do repasse semanal do motoboy antes do PIX. O locatário também pode autorizar pelo app.'))) : null,
          h(Card, { pad: false, label: 'Cobranças avulsas' }, CardHead('Cobranças avulsas', ativo || c.situacao === 'em_retomada' || c.situacao === 'suspenso' ? Btn({ variant: 'link', small: true, onClick: function () { setModal('cobranca'); }, children: '+ Lançar' }) : null),
            avs.length === 0 ? h('div', { style: { padding: '12px 16px', fontSize: 12.5, color: '#6b7280' } }, 'Nenhuma cobrança avulsa.') :
            avs.slice(0, 8).map(function (a) {
              var tom = a.status === 'paga' ? 'verde' : a.status === 'aberta' ? 'ambar' : 'cinza';
              return h('div', { key: a.id, style: { display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', borderTop: '1px solid #f3f4f6' } },
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { style: { fontSize: 13, fontWeight: 600 } }, ({ antecipacao: 'Antecipação', ocorrencia: 'Ocorrência', encerramento: 'Encerramento', opcao_compra: 'Opção de compra' }[a.tipo] || a.tipo) + (a.parcela_ids && a.parcela_ids.length ? ' · ' + a.parcela_ids.length + ' parcela' + (a.parcela_ids.length > 1 ? 's' : '') : '')),
                  h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, fDC(a.criado_em) + (a.desconto ? ' · desconto ' + fR(a.desconto) : '') + (a.pago_em ? ' · paga ' + fDC(a.pago_em) : ''))),
                h('b', { style: Object.assign({ fontSize: 13 }, TAB) }, fR(a.valor)),
                a.pix_copia_cola ? lk('Copiar PIX', function () { copiar(a.pix_copia_cola, toast); }) : Pill(a.status === 'paga' ? 'Paga' : a.status === 'aberta' ? 'Aberta' : 'Cancelada', tom, true));
            })))),
      modal && modal.baixa ? h(BaixaModal, { p: modal.baixa, onClose: function () { setModal(null); },
        onConfirm: function (b) { return api('/parcelas/' + modal.baixa.id + '/baixa-manual', { method: 'POST', body: b }).then(function () { toast('Baixa registrada', 'success'); setModal(null); mudou(); }).catch(function (e) { toast(e.message, 'error'); throw e; }); } }) : null,
      modal && modal.lote ? h(BaixaLoteModal, { api: api, toast: toast, parcelas: modal.lote, onClose: function () { setModal(null); }, onFeito: function () { setModal(null); mudou(); } }) : null,
      modal && modal.antecipar ? h(AnteciparModal, { api: api, toast: toast, contrato: c, parcelas: modal.antecipar, onClose: function () { setModal(null); }, onFeito: function () { setModal(null); mudou(); } }) : null,
      modal === 'cobranca' ? h(LancarCobrancaModal, { api: api, toast: toast, moto: mo, contrato: Object.assign({}, c, { cliente_nome: cli.nome }), cliente: cli, onClose: function () { setModal(null); }, onSalvo: function () { setModal(null); mudou(); } }) : null,
      modal && modal.recibo ? h(Modal, { titulo: 'Recibo · parcela ' + modal.recibo.numero, onClose: function () { setModal(null); }, largura: 440 },
        h('div', null, [
          ['Locatário', cli.nome], ['Contrato', c.numero], ['Moto', mo.modelo + ' · ' + mo.placa], ['Vencimento', fDS(modal.recibo.vencimento)], ['Valor', fR(modal.recibo.valor)],
          ['Encargos', num(modal.recibo.juros) > 0 ? fR(modal.recibo.juros) : (num(modal.recibo.encargos_dispensados) > 0 ? 'dispensados (' + fR(modal.recibo.encargos_dispensados) + ')' : '—')],
          ['Desconto', num(modal.recibo.desconto_concedido) > 0 ? fR(modal.recibo.desconto_concedido) : '—'],
          ['Abatido do repasse', num(modal.recibo.valor_abatido_repasse) > 0 ? fR(modal.recibo.valor_abatido_repasse) : '—'], ['Total pago', fR(modal.recibo.total)],
          ['Pago em', fDH(modal.recibo.pago_em)], ['Forma', modal.recibo.forma_label || modal.recibo.forma || '—'], ['Baixa por', modal.recibo.baixa_por_nome || '—']
        ].map(function (r) { return h('div', { key: r[0], style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 } }, h('span', { style: { color: '#6b7280' } }, r[0]), h('b', { style: TAB }, r[1])); }))) : null);
  }

  // ───────── LOCACAO_REMODEL_V1: peças do perfil do locatário (aba Contratos) ─────────
  var DOC_ROT = { cnh_frente: 'CNH frente', cnh_verso: 'CNH verso', selfie: 'Selfie com CNH', selfie_cnh: 'Selfie com CNH', comprovante: 'Comprovante de residência', comprovante_residencia: 'Comprovante de residência' };
  function linhaKV(rot, val, key) {
    return h('div', { key: key || rot, style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 16px', borderTop: '1px solid #f3f4f6', fontSize: 13 } },
      h('span', { style: { color: '#6b7280', flex: 'none' } }, rot), h('b', { style: { textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' } }, val == null || val === '' ? '—' : val));
  }

  function ContratoResumoCard(props) {
    var api = props.api, toast = props.toast, c = props.c || {}, k = props.k || {}, parcelas = props.parcelas || [];
    var assinado = !!c.assinado_em || c.importado;
    var pill = c.importado ? Pill('Importado', 'cinza', true) : c.assinado_em ? Pill('Assinado', 'verde', true) : c.situacao === 'aguardando_assinatura' ? Pill('Aguardando assinatura', 'azul', true) : pillSit(c);
    var ini = parseData(c.data_inicio), fim = parseData(c.termino || c.ultimo_vencimento), agora = new Date();
    var frac = ini && fim && fim > ini ? Math.max(0, Math.min(1, (agora - ini) / (fim - ini))) : 0;
    var semanaAtual = ini ? Math.max(1, Math.ceil((agora - ini) / (7 * 864e5))) : null;
    var atrasado = num(k.atrasadas_qtd) > 0;
    var prox = parcelas.find(function (x) { return x.vencimento === k.proximo_vencimento; });
    var temFin = parcelas.length > 0;
    return h(Card, { pad: false, label: 'Contrato' },
      CardHead('Contrato ' + c.numero + (c.plano_label ? ' · ' + c.plano_label : ''), pill),
      h('div', { style: { padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', borderBottom: '1px solid #f3f4f6' } },
        h('span', { style: { color: assinado ? '#16a34a' : '#2563eb', display: 'inline-flex' } }, ico(assinado ? 'check' : 'clock', 17)),
        h('div', { style: { flex: '1 1 240px', fontSize: 13, color: '#374151' } },
          c.importado ? 'Importado: assinado fora da Central.' : c.assinado_em ? h('span', null, (c.assinatura_manual_motivo ? 'Assinatura confirmada manualmente em ' : 'Assinado no Autentique em '), h('b', null, fDH(c.assinado_em))) : 'Ainda não assinado. Acompanhe a assinatura no quadro acima.'),
        c.tem_pdf_assinado ? Btn({ small: true, icon: 'filetext', onClick: function () { abrirPdf(api, '/contratos/' + c.id + '/pdf?assinado=1', toast); }, children: 'PDF assinado' })
          : c.tem_pdf ? Btn({ small: true, icon: 'filetext', onClick: function () { abrirPdf(api, '/contratos/' + c.id + '/pdf', toast); }, children: 'PDF do contrato' }) : null,
        c.vistoria_entrega && c.vistoria_entrega.id ? Btn({ small: true, icon: 'camera', onClick: function () { abrirPdf(api, '/vistorias/' + c.vistoria_entrega.id + '/anexo-iv.pdf', toast); }, children: 'Anexo IV (entrega)' }) : null),
      ini && fim ? h('div', { style: { padding: '12px 16px' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 6, gap: 8, flexWrap: 'wrap' } },
          h('span', null, frac >= 1 ? 'Prazo concluído' : agora < ini ? 'Começa em ' + fD(ini) : (c.periodicidade === 'mensal' ? 'Mês ' + Math.max(1, Math.ceil(frac * (c.prazo_qtd || 1))) + ' de ' + (c.prazo_qtd || '—') : 'Semana ' + semanaAtual + ' de ' + (c.prazo_qtd || c.semanas || '—'))),
          h('span', null, fD(ini) + ' → ' + fD(fim))),
        h('div', { style: { height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' } }, h('div', { style: { width: Math.round(frac * 100) + '%', height: '100%', background: ROXO } }))) : null,
      temFin ? h('button', { type: 'button', onClick: props.abrirFinanceiro, className: 'hover:opacity-90',
        style: { width: '100%', textAlign: 'left', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: '12px 16px', cursor: 'pointer', border: 0, borderTop: '1px solid ' + (atrasado ? '#fecaca' : '#e9d5f9'), background: atrasado ? '#fef2f2' : '#faf7fd', color: '#111827' } },
        h('span', { style: { fontSize: 13 } }, atrasado ? h('b', { style: { color: '#991b1b' } }, fR(k.atrasado_valor) + ' em atraso') : h('b', { style: { color: '#166534' } }, 'Em dia'), atrasado ? ' · ' + k.atrasadas_qtd + ' parcela' + (k.atrasadas_qtd > 1 ? 's' : '') : ''),
        prox ? h('span', { style: { fontSize: 13, color: '#374151' } }, 'Próxima ' + fDC(prox.vencimento) + ' · ' + fR(prox.total)) : null,
        h('span', { style: { fontSize: 13, color: '#374151' } }, 'Pagas ' + fN(k.pagas) + ' de ' + fN(k.total_parcelas)),
        h('span', { style: { flex: 1 } }),
        h('span', { style: { fontSize: 13, fontWeight: 700, color: ROXO } }, 'Ver no Financeiro →')) : null);
  }

  function MotoResumoCard(props) {
    var mo = props.mo || {}, c = props.c || {};
    var chip = function (ok, txt, key) { return h('span', { key: key || txt, style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid ' + (ok ? '#e5e7eb' : '#fde68a'), background: ok ? '#fff' : '#fffbeb', borderRadius: 10, fontSize: 12.5, fontWeight: 600, color: ok ? '#374151' : '#92400e' } }, ok ? h('span', { style: { color: '#16a34a', display: 'inline-flex' } }, ico('check', 13)) : ico('alert', 13), txt); };
    var campo = function (r, v, mono) { return h('div', { key: r }, h('div', { style: { fontSize: 12, color: '#6b7280' } }, r), h('div', { style: { fontSize: 13.5, fontWeight: 600, marginTop: 2, fontFamily: mono ? MONO : null } }, v || '—')); };
    return h(Card, { pad: false, label: 'Moto' },
      CardHead('Moto', Btn({ small: true, onClick: props.abrirMoto, children: 'Abrir moto' })),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16 } },
        h(MotoImg, { src: mo.capa_thumb, tipo: mo.tipo, modelo: mo.modelo, cor: mo.cor, w: 160, h: 108, r: 12 }),
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-3', style: { flex: '1 1 260px', gap: 12 } },
          campo('Modelo', mo.modelo), campo('Placa', mo.placa, true), campo('Ano · cor', [mo.ano, mo.cor].filter(Boolean).join(' · ')),
          campo('Chassi', mo.chassi, true), campo('Renavam', mo.renavam, true), campo('Situação', ROT_MOTO[mo.status] || mo.status))),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px 16px' } },
        chip(!!mo.tem_seguro, mo.tem_seguro ? 'Seguro' : 'Sem seguro'), chip(!!mo.tem_rastreador, mo.tem_rastreador ? 'Rastreador' : 'Sem rastreador'),
        c.bloqueio_sinalizado_em ? chip(false, 'Bloqueio sinalizado ' + fDC(c.bloqueio_sinalizado_em), 'bl') : null,
        c.vistoria_entrega ? chip(true, 'Vistoria de entrega ' + fDC(c.vistoria_entrega.criado_em), 've') : null));
  }

  function DadosLocatarioCard(props) {
    var api = props.api, toast = props.toast, cli = props.cli || {}, pf = props.perfil || {};
    var _f = useState(null), foto = _f[0], setFoto = _f[1];
    var abrirDoc = function (doc) {
      setFoto({ titulo: DOC_ROT[doc.tipo] || doc.tipo, src: null });
      api('/precadastros/' + pf.precadastro_id + '/documentos/' + doc.id).then(function (r) { setFoto({ titulo: DOC_ROT[doc.tipo] || doc.tipo, src: r.foto }); })
        .catch(function (e) { setFoto(null); toast(e.message, 'error'); });
    };
    var cnh = pf.cnh;
    return h(Card, { pad: false, label: 'Dados e documentos' },
      CardHead('Dados e documentos'),
      linhaKV('CPF', cli.cpf), linhaKV('WhatsApp', cli.whatsapp ? fTel(cli.whatsapp) : null), cli.email ? linhaKV('E-mail', cli.email) : null,
      linhaKV('CNH', cnh ? cnh.numero + ' · cat. ' + (cnh.categoria || '—') + (cnh.ear ? ' · EAR' : '') : null),
      cnh && cnh.validade ? linhaKV('Validade da CNH', fD(cnh.validade)) : null,
      pf.endereco ? linhaKV('Endereço', pf.endereco) : null,
      linhaKV('Aceite LGPD', pf.aceite_lgpd_em ? fDC(pf.aceite_lgpd_em) : null),
      linhaKV('App do locatário', cli.portal_ativado ? 'ativo' + (pf.ultimo_acesso_app ? ' · último acesso ' + fDHc(pf.ultimo_acesso_app) : '') : cli.tem_acesso_portal ? 'convite enviado, sem senha ainda' : 'sem acesso'),
      (pf.documentos || []).length ? h('div', { className: 'grid grid-cols-2', style: { gap: 8, padding: '12px 16px 16px', borderTop: '1px solid #f3f4f6' } },
        pf.documentos.map(function (doc) {
          return h('button', { key: doc.id, type: 'button', onClick: function () { abrirDoc(doc); }, className: 'hover:bg-gray-50',
            style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: '#fff', textAlign: 'left' } },
            h('span', { style: { color: '#16a34a', display: 'inline-flex' } }, ico('check', 13)), DOC_ROT[doc.tipo] || doc.tipo);
        })) : null,
      foto ? h(Lightbox, { titulo: foto.titulo, src: foto.src, onClose: function () { setFoto(null); } }) : null);
  }

  function OutrosContratosCard(props) {
    var lst = props.lista || [];
    if (!lst.length) return null;
    return h(Card, { pad: false, label: 'Contratos anteriores' }, CardHead('Outros contratos', null, lst.length + ''),
      lst.map(function (o) {
        return h('button', { key: o.id, type: 'button', onClick: function () { props.nav({ tela: 'contrato', id: o.id }); }, className: 'hover:bg-purple-50',
          style: { width: '100%', display: 'flex', gap: 12, alignItems: 'center', padding: '10px 16px', borderTop: '1px solid #f3f4f6', background: 'transparent', cursor: 'pointer', textAlign: 'left' } },
          h('span', { style: { fontFamily: MONO, fontSize: 12.5, fontWeight: 700 } }, o.numero),
          h('span', { style: { flex: 1, fontSize: 12.5, color: '#6b7280' } }, (o.moto || '') + ' · ' + (o.placa || '') + ' · ' + fDC(o.criado_em) + (o.fim ? ' → ' + fDC(o.fim) : '')),
          Pill(o.status_label || o.status, TOM_SIT[o.status] || 'cinza', true));
      }));
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
    var logsPerfil = logs.filter(function (l) { return !ACOES_FIN[l.acao]; }); // LOCACAO_REMODEL_V1: pagamentos e cobranças ficam no extrato do Financeiro
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
    var emVistoria = assinando && c.etapa === 'vistoria'; // LOCACAO_FLUXO_V1: assinatura só depois da vistoria de entrega
    var ativo = sit === 'em_dia' || sit === 'atrasada';
    var retV3 = c.encargos && c.encargos.modelo === 'v3'; /* LOCACAO_V3: rescisão com atraso de MAIS de N dias (14.2 a) */
    var faltamRet = c.dias_retomada != null && c.dias_atraso != null ? c.dias_retomada + (retV3 ? 1 : 0) - c.dias_atraso : null;
    var tipoLabel = cli.tipo === 'tutts' ? 'Motoboy Tutts' : 'Externo';
    var subPartes = ['Contrato ' + c.numero, c.plano_label, cli.cod_profissional && tipoKey(cli.tipo) === 'tutts' ? 'cód. ' + cli.cod_profissional : null, mo.modelo].filter(Boolean); // LOCACAO_V3 · LOCACAO_V4: tipo vira etiqueta
    var suspenso = sit === 'suspenso';
    var vencLabel = c.vencimento_label || (cli.dia_vencimento ? DIA_PLURAL[cli.dia_vencimento] : '');
    var nParc = c.prazo_qtd || c.semanas;
    var mudarDesconto = function (v) {
      if (!v && !window.confirm('Revogar a autorização de desconto em repasses (Anexo III)? As próximas parcelas passam a ser cobradas só por Pix.')) return;
      acao('desc', '/contratos/' + c.id + '/desconto-repasse', { autorizar: v }, v ? 'Desconto em repasses autorizado' : 'Autorização revogada').catch(function () {});
    };

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      voltar(function () { nav({ tela: 'lista', tab: props.de || 'contratos' }); }, props.de === 'painel' ? 'Frota' : 'Contratos'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', justifyContent: 'space-between' } },
        h('div', { style: { minWidth: 0, flex: '1 1 520px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
            h('span', { 'aria-hidden': 'true', style: { width: 44, height: 44, borderRadius: 99, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', fontFamily: SORA, fontWeight: 700, fontSize: 16, flex: 'none' } }, iniciais(cli.nome)), // LOCACAO_REMODEL_V1
            h('h2', { style: { margin: 0, fontFamily: SORA, fontSize: 22, fontWeight: 700 } }, cli.nome || '—'), TagTipo(cli.tipo || tipoLabel), pillSit(c)), // LOCACAO_V4
          h('div', { style: { fontSize: 13, color: '#6b7280', marginTop: 3, lineHeight: 1.6 } },
            subPartes.join(' · ') + ' ', h('span', { style: { fontFamily: MONO, color: '#374151' } }, mo.placa),
            vencLabel ? ' · vence ' + vencLabel : '',
            c.importado ? ' · importado (assinado fora da Central)' : c.assinado_em ? (c.assinatura_manual_motivo ? ' · assinatura confirmada manualmente em ' : ' · assinado no Autentique em ') + fD(c.assinado_em) : '',
            c.tem_pdf_assinado ? h('span', null, ' · ', h('button', { type: 'button', className: 'hover:underline', onClick: function () { abrirPdf(api, '/contratos/' + c.id + '/pdf?assinado=1', toast); }, style: { color: ROXO, fontWeight: 600, cursor: 'pointer' } }, 'PDF assinado'))
              : c.tem_pdf ? h('span', null, ' · ', h('button', { type: 'button', className: 'hover:underline', onClick: function () { abrirPdf(api, '/contratos/' + c.id + '/pdf', toast); }, style: { color: ROXO, fontWeight: 600, cursor: 'pointer' } }, 'PDF do contrato')) : null)),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          Btn({ icon: 'camera', onClick: function () { nav({ tela: 'moto', id: mo.id }); }, children: 'Vistorias da moto' }),
          h(AcessoPortalBtn, { api: api, toast: toast, cliente: cli }),
          parcelas.length ? Btn({ variant: 'pri', icon: 'wallet', onClick: function () { nav({ tela: 'financeiro', id: c.id }); }, children: 'Abrir financeiro' }) : null)), // LOCACAO_REMODEL_V1: cobrança e baixa ficam no Financeiro

      assinando ? h(EtapasLiberacao, { c: c, ocupado: ocupado, onPosicionar: function () { setModal('posicoes'); }, onVistoria: function () { setModal('vistoriaEntrega'); }, onCancelar: function () { setModal('cancelar'); } }) : null, // LOCACAO_FLUXO_V1
      assinando && !emVistoria ? h('div', { style: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' } },
        ico('clock', 18, { color: '#2563eb', marginTop: 1 }),
        h('div', { style: { flex: 1, minWidth: 240, color: '#1e40af', fontSize: 13.5 } },
          (function () { /* LOCACAO_ASSINATURA_V2: assinatura pelo app + linha do tempo */
            var lnks = c.autentique_links || [];
            var locL = lnks.find(function (l) { return l.papel === 'locatario'; });
            var peloApp = !!(locL && !locL.email) || (!lnks.length && !!c.assinatura_linha);
            return h(React.Fragment, null,
              h('div', { style: { fontWeight: 700 } }, !c.autentique_doc_id ? 'Confira as assinaturas antes de enviar' : peloApp ? 'Assinatura pelo app da Central' : 'Aguardando assinatura no Autentique'), // AUTENTIQUE_CONFERIR_V1
              h('div', { style: { marginTop: 2 } }, (peloApp ? 'O locatário assina pelo app (cartão "Seu contrato está pronto"); o Autentique não manda e-mail para ele. ' : '')
                + 'As parcelas só são criadas quando o documento volta assinado. A moto fica Reservada até lá.' + (c.autentique_doc_id ? '' : ' O contrato ainda não foi enviado: abra Posicionar e enviar, confira as caixas de cada um e envie.')),
              c.autentique_doc_id && (c.assinatura_linha || []).length ? h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 } },
                c.assinatura_linha.filter(function (st) { return !st.nao_se_aplica; }).map(function (st) {
                  var feito = !!st.em;
                  return h('div', { key: st.id, style: { flex: '1 1 150px', minWidth: 140, padding: '8px 10px', borderRadius: 10, background: feito ? '#f0fdf4' : '#fff', border: '1px solid ' + (feito ? '#bbf7d0' : '#e5e7eb') } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: feito ? '#166534' : '#1e40af' } }, feito ? ico('check', 13) : ico('clock', 13), st.label),
                    h('div', { style: { fontSize: 11.5, color: '#6b7280', marginTop: 2 } }, feito ? (st.id === 'tutts' && st.auto ? 'automático pela API · ' : '') + fDHc(st.em) : 'aguardando'));
                })) : null);
          })(),
          h(LinksAssinatura, { key: (c.autentique_doc_id || '') + (c.autentique_enviado_em || ''), c: c, api: api, toast: toast })), // LOCACAO_ASSINATURA_V1
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          c.autentique_doc_id ? Btn({ small: true, icon: 'refresh', disabled: !!ocupado, onClick: function () { acao('consultar', '/contratos/' + c.id + '/consultar-assinatura', {}, 'Status consultado'); }, children: ocupado === 'consultar' ? 'Consultando...' : 'Consultar assinatura' }) : null,
          c.autentique_doc_id ? Btn({ small: true, icon: 'message', disabled: !!ocupado, onClick: function () { /* LOCACAO_ASSINATURA_V2 */
            setOcupado('aviso');
            api('/contratos/' + c.id + '/enviar-link-assinatura', { method: 'POST', body: {} })
              .then(function (r) { if (r && r.enviado) toast('Aviso enviado no WhatsApp do locatário', 'success'); else toast('WhatsApp não enviado' + (r && r.motivo ? ': ' + r.motivo : '') + '. Copie o link e mande você.', 'error'); carregar(); })
              .catch(function (e) { toast(e.message, 'error'); }).then(function () { setOcupado(null); });
          }, children: ocupado === 'aviso' ? 'Enviando...' : 'Reenviar aviso no WhatsApp' }) : null,
          Btn({ small: true, variant: c.autentique_doc_id ? 'sec' : 'pri', icon: 'pencil', disabled: !!ocupado, onClick: function () { setModal('posicoes'); }, children: c.autentique_doc_id ? 'Posicionar assinaturas' : 'Posicionar e enviar' }), // AUTENTIQUE_POSICOES_V2 · AUTENTIQUE_CONFERIR_V1
          c.autentique_doc_id ? Btn({ small: true, icon: 'upload', disabled: !!ocupado, onClick: function () { acao('reenviar', '/contratos/' + c.id + '/reenviar-assinatura', {}, 'Enviado ao Autentique'); }, children: 'Reenviar ao Autentique' }) : null,
          Btn({ small: true, icon: 'check', disabled: !!ocupado, onClick: function () { setModal('assinado'); }, children: 'Marcar como assinado' }),
          Btn({ small: true, variant: 'perigo', disabled: !!ocupado, onClick: function () { setModal('cancelar'); }, children: 'Cancelar contrato' }))) : null,

      suspenso ? Aviso('azul', c.situacao_label || 'Contrato suspenso', (c.suspensao && c.suspensao.motivo === 'congelamento' ? 'Congelamento por liberalidade (Cl. 12): ' : 'Furto ou roubo sem culpa (Cl. 6.6.1): ') + 'as parcelas estão suspensas' + (c.suspensao && c.suspensao.desde ? ' desde ' + fD(c.suspensao.desde) : '') + (c.suspensao && c.suspensao.ate ? ' até ' + fD(c.suspensao.ate) : '') + '. Ao reativar, o prazo é prorrogado pelo período parado.', 'clock') : null, // LOCACAO_V3
      c.plano === 'conquista' && !assinando ? h(OpcaoCompraCard, { api: api, toast: toast, contrato: c, k: k, aoMudar: function () { carregar(); props.aoMudar && props.aoMudar(); } }) : null,
      h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start' },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 } }, /* LOCACAO_REMODEL_V1: perfil — parcelas foram para o Financeiro */
          h(ContratoResumoCard, { api: api, toast: toast, c: c, k: k, parcelas: parcelas, abrirFinanceiro: function () { nav({ tela: 'financeiro', id: c.id }); } }),
          h(MotoResumoCard, { mo: mo, c: c, abrirMoto: function () { nav({ tela: 'moto', id: mo.id }); } }),
          assinando ? null : h(DemonstrativoCard, { contrato: c, cliente: cli }), // LOCACAO_V3 · LOCACAO_REMODEL_V1: na coluna do contrato
          h(OutrosContratosCard, { lista: (d.perfil && d.perfil.outros_contratos) || [], nav: nav })),

        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          h(Card, { pad: false }, CardHead('Ações do contrato'),
            h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 } },
              sit === 'atrasada' && faltamRet != null ? h('div', { style: { fontSize: 12.5, color: '#92400e', lineHeight: 1.5 } }, (retV3 ? 'Com mais de ' + c.dias_retomada + ' dias de atraso o contrato é rescindido e a moto entra em recolhimento (cl. 14.2). ' : 'Com ' + c.dias_retomada + ' dias de atraso o sistema aciona a retomada sozinho. ') + (faltamRet > 0 ? 'Falta' + (faltamRet > 1 ? 'm ' : ' ') + faltamRet + ' dia' + (faltamRet > 1 ? 's' : '') + ' para esse limite.' : 'O limite já foi atingido.')) : null,
              c.bloqueio_sinalizado_em ? h('div', { style: { fontSize: 12.5, color: '#991b1b' } }, 'Bloqueio sinalizado no rastreador em ' + fDH(c.bloqueio_sinalizado_em) + '.') : null,
              sit === 'em_retomada' ? Aviso('vermelho', 'Em retomada' + (c.retomada_em ? ' desde ' + fD(c.retomada_em) : ''), 'Quando a moto voltar, registre a devolução. Se o locatário pagar antes, o contrato volta a Em dia.') : null,
              sit === 'quitado' ? Aviso('roxo', 'Contrato quitado' + (c.quitado_em ? ' em ' + fD(c.quitado_em) : ''), 'A moto está liberada para transferência ao locatário.', 'key') : null,
              ativo ? Btn({ variant: 'perigo', icon: 'alert', disabled: !!ocupado, onClick: function () { setModal('retomada'); }, style: { width: '100%' }, children: 'Iniciar retomada' }) : null,
              ativo || sit === 'em_retomada' ? Btn({ variant: 'perigo', icon: 'arrowleft', disabled: !!ocupado, onClick: function () { setModal('devolucao'); }, style: { width: '100%' }, children: 'Registrar moto devolvida' }) : null,
              ativo || sit === 'em_retomada' ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Depois da devolução, registre a vistoria de devolução em Vistorias da moto.') : null,
              sit === 'quitado' && mo.status === 'transferencia_liberada' ? Btn({ variant: 'pri', icon: 'check', disabled: !!ocupado, onClick: function () { if (window.confirm('Confirmar que a transferência da moto foi concluída?')) acao('transf', '/contratos/' + c.id + '/transferencia-concluida', {}, 'Transferência registrada'); }, style: { width: '100%' }, children: 'Transferência concluída' }) : null,
              // LOCACAO_V3: encerrar/suspender, reativar, reajuste e Anexo III
              ativo || sit === 'em_retomada' ? Btn({ variant: 'perigo', icon: 'ban', disabled: !!ocupado, onClick: function () { setModal('encerrar'); }, style: { width: '100%' }, children: 'Encerrar ou suspender' }) : null,
              suspenso ? Btn({ variant: 'pri', icon: 'refresh', disabled: !!ocupado, onClick: function () { setModal('reativar'); }, style: { width: '100%' }, children: c.suspensao && c.suspensao.motivo === 'congelamento' ? 'Encerrar congelamento' : 'Moto recuperada · reativar' }) : null,
              suspenso && (!c.suspensao || c.suspensao.motivo !== 'congelamento') ? Btn({ variant: 'perigo', disabled: !!ocupado, onClick: function () { if (window.confirm('Encerrar o contrato por furto/roubo sem recuperação? Não há cobrança adicional (Cl. 6.6.1).')) acao('furto', '/contratos/' + c.id + '/encerrar', { motivo: 'furto_nao_recuperado', taxa_cancelamento: 0 }, 'Contrato encerrado').catch(function () {}); }, style: { width: '100%' }, children: 'Encerrar · não recuperada em 30 dias' }) : null,
              (ativo || suspenso) && c.reajuste_proximo ? h('div', { style: { fontSize: 12.5, color: '#374151', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: 10 } }, h('span', null, 'Reajuste IPCA em ', h('b', null, fD(c.reajuste_proximo))), Btn({ small: true, disabled: !!ocupado, onClick: function () { setModal('reajuste'); }, children: 'Aplicar' })) : null,
              (ativo || suspenso) && parcelas.length ? h('div', { style: { fontSize: 12.5, color: '#6b7280', borderTop: '1px solid #f3f4f6', paddingTop: 10 } }, 'Cobrança, baixa, antecipação e desconto em repasses ficam no ', h('button', { type: 'button', onClick: function () { nav({ tela: 'financeiro', id: c.id }); }, className: 'hover:underline', style: { color: ROXO, fontWeight: 600, cursor: 'pointer' } }, 'Financeiro'), '.') : null, // LOCACAO_REMODEL_V1
              !ativo && sit !== 'em_retomada' && sit !== 'quitado' && !assinando && !suspenso ? h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Nenhuma ação disponível para este contrato.') : null,
              assinando ? h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'As ações de cobrança e retomada liberam depois da assinatura.') : null)),
          h(DadosLocatarioCard, { api: api, toast: toast, cli: cli, perfil: d.perfil || {} }), // LOCACAO_REMODEL_V1
          h(Card, { pad: false }, CardHead('Histórico', null, 'contrato, moto e cadastro'),
            h('div', { style: { padding: '12px 16px', maxHeight: 420, overflowY: 'auto' } },
              logsPerfil.length === 0 ? h('div', { style: { fontSize: 13, color: '#9ca3af' } }, 'Sem registros.') :
              logsPerfil.map(function (l, i) {
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
      modal === 'vistoriaEntrega' ? h(VistoriaAnexoIVModal, { api: api, toast: toast, moto: mo, contrato: c, tipo: 'retirada', onClose: function () { setModal(null); }, aoSalvar: function (r) { setModal(r && r.assinatura && r.assinatura.conferir ? 'posicoes' : null); carregar(); props.aoMudar && props.aoMudar(); } }) : null, // LOCACAO_FLUXO_V1 · AUTENTIQUE_CONFERIR_V1: já abre Posicionar assinaturas
      modal === 'posicoes' ? h(PosicionarAssinaturas, { api: api, toast: toast, contrato: c, onClose: function () { setModal(null); }, aoMudar: carregar, aoEnviar: function () { setModal(null); carregar(); props.aoMudar && props.aoMudar(); } }) : null, // AUTENTIQUE_POSICOES_V2
      modal === 'assinado' ? h(MotivoModal, { titulo: 'Marcar como assinado', label: 'Motivo', obrigatorio: true, botao: 'Marcar como assinado', hint: 'Fica no histórico. Use só se o Autentique não devolveu o status.',
        texto: 'As ' + nParc + ' parcelas serão criadas a partir do 1º vencimento e o contrato vira Ativo.', onClose: function () { setModal(null); }, onConfirm: function (m) { return acao('ass', '/contratos/' + c.id + '/marcar-assinado', { motivo: m }, 'Contrato ativado'); } }) : null,
      modal === 'cancelar' ? h(MotivoModal, { titulo: 'Cancelar contrato', label: 'Motivo', obrigatorio: true, botao: 'Cancelar contrato', perigo: true,
        texto: 'Só contratos aguardando assinatura podem ser cancelados. A moto volta para Disponível.', onClose: function () { setModal(null); }, onConfirm: function (m) { return acao('canc', '/contratos/' + c.id + '/cancelar', { motivo: m }, 'Contrato cancelado'); } }) : null,
      modal === 'cobranca' ? h(LancarCobrancaModal, { api: api, toast: toast, moto: mo, contrato: Object.assign({}, c, { cliente_nome: cli.nome }), cliente: cli, onClose: function () { setModal(null); }, onSalvo: function () { setModal(null); carregar(); props.aoMudar && props.aoMudar(); } }) : null, // LOCACAO_V3
      modal === 'encerrar' ? h(EncerrarModal, { api: api, toast: toast, contrato: c, cliente: cli, moto: mo, k: k, onClose: function () { setModal(null); }, onSalvo: function () { setModal(null); carregar(); props.aoMudar && props.aoMudar(); } }) : null,
      modal === 'reativar' ? h(ReativarModal, { contrato: c, onClose: function () { setModal(null); }, onConfirm: function (b) { return acao('reat', '/contratos/' + c.id + '/reativar', b, 'Contrato reativado · prazo prorrogado'); } }) : null,
      modal === 'reajuste' ? h(ReajusteModal, { contrato: c, onClose: function () { setModal(null); }, onConfirm: function (b) { return acao('reaj', '/contratos/' + c.id + '/reajuste', b, 'Reajuste aplicado'); } }) : null,
      modal && modal.baixa ? h(BaixaModal, { p: modal.baixa, onClose: function () { setModal(null); }, onConfirm: function (b) { return acao('baixa', '/parcelas/' + modal.baixa.id + '/baixa-manual', b, 'Baixa registrada'); } }) : null,
      modal && modal.recibo ? h(Modal, { titulo: 'Recibo · parcela ' + modal.recibo.numero, onClose: function () { setModal(null); }, largura: 440 },
        h('div', null, [
          ['Locatário', cli.nome], ['Contrato', c.numero], ['Moto', mo.modelo + ' · ' + mo.placa], ['Vencimento', fDS(modal.recibo.vencimento)], ['Valor', fR(modal.recibo.valor)],
          ['Juros', num(modal.recibo.juros) > 0 ? fR(modal.recibo.juros) : '—'], ['Abatido do repasse', num(modal.recibo.valor_abatido_repasse) > 0 ? fR(modal.recibo.valor_abatido_repasse) : '—'], ['Total pago', fR(modal.recibo.total)],
          ['Pago em', fDH(modal.recibo.pago_em)], ['Forma', modal.recibo.forma_label || modal.recibo.forma || '—']
        ].map(function (r) { return h('div', { key: r[0], style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 } }, h('span', { style: { color: '#6b7280' } }, r[0]), h('b', { style: TAB }, r[1])); }))) : null);
  }

  function BaixaModal(props) { /* BAIXA_SEM_JUROS_V1: escolhe baixar com ou sem os encargos */
    var _d = useState(hojeISO()), data = _d[0], setData = _d[1];
    var _o = useState(''), obs = _o[0], setObs = _o[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    var _x = useState(false), semEnc = _x[0], setSemEnc = _x[1];
    var p = props.p;
    var enc = num(p.juros), total = p.saldo != null ? num(p.saldo) : num(p.total), principal = Math.max(0, total - enc);
    var e = p.encargos || null;
    var detalhe = e ? [e.multa ? 'multa ' + fR(e.multa) : null, e.juros ? 'juros ' + fR(e.juros) : null, e.correcao ? 'correção ' + fR(e.correcao) : null].filter(Boolean).join(' · ') : 'juros ' + fR(enc);
    var podeConfirmar = !s && obs.trim().length >= 3 && (!semEnc || obs.trim().length >= 3);
    var confirmar = function () {
      setS(true);
      Promise.resolve(props.onConfirm({ data_pagamento: data, observacao: obs.trim(), dispensar_encargos: semEnc })).catch(function () {}).then(function () { setS(false); });
    };
    var opcao = function (on, titulo, valor, sub, onClick) {
      return h('button', { type: 'button', role: 'radio', 'aria-checked': on, onClick: onClick,
        style: { textAlign: 'left', display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: 12, cursor: 'pointer', background: on ? '#faf7fd' : '#fff', border: (on ? 2 : 1) + 'px solid ' + (on ? ROXO : '#e5e7eb') } },
        h('span', { style: { width: 16, height: 16, borderRadius: 99, border: '2px solid ' + (on ? ROXO : '#d1d5db'), display: 'grid', placeItems: 'center', marginTop: 2, flex: 'none' } }, on ? h('span', { style: { width: 8, height: 8, borderRadius: 99, background: ROXO } }) : null),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 8 } }, h('b', { style: { fontSize: 13.5 } }, titulo), h('b', { style: Object.assign({ fontSize: 14 }, TAB) }, fR(valor))),
          h('div', { style: { fontSize: 12, color: '#6b7280', marginTop: 2 } }, sub)));
    };
    return h(Modal, { titulo: 'Baixa manual · parcela ' + p.numero, onClose: props.onClose, largura: 500,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }), Btn({ key: 'o', variant: 'pri', icon: 'check', disabled: !podeConfirmar, onClick: confirmar, children: s ? 'Salvando...' : 'Registrar baixa de ' + fR(semEnc ? principal : total) })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        enc > 0 ? h('div', { role: 'radiogroup', 'aria-label': 'Valor da baixa', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          opcao(!semEnc, 'Com encargos', total, 'Parcela ' + fR(principal) + ' + ' + detalhe + (p.dias_atraso ? ' (' + p.dias_atraso + ' dias de atraso)' : ''), function () { setSemEnc(false); }),
          opcao(semEnc, 'Sem encargos', principal, 'Dispensa ' + fR(enc) + ' de encargos. Fica registrado no histórico com o seu nome.', function () { setSemEnc(true); }))
          : h('div', { style: { fontSize: 13.5, color: '#374151' } }, 'Total a quitar: ', h('b', { style: TAB }, fR(total))),
        enc > 0 ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Os encargos são recalculados pela data do pagamento. Se o pagamento foi antes de hoje, o valor final pode ser menor.') : null,
        h(Field, { label: 'Data do pagamento', req: true }, Input({ type: 'date', value: data, max: hojeISO(), onChange: function (ev) { setData(ev.target.value); } })),
        h(Field, { label: 'Observação', req: true, hint: semEnc ? 'Diga por que os encargos foram dispensados. Ex.: atraso combinado, PIX caiu no fim de semana.' : 'Ex.: PIX recebido na conta da empresa, comprovante no WhatsApp. Fica no log.' }, TextArea({ rows: 3, value: obs, onChange: function (ev) { setObs(ev.target.value); } }))));
  }
  function AcessoPortalBtn(props) {
    var _s = useState(false), s = _s[0], setS = _s[1];
    var _r = useState(null), r = _r[0], setR = _r[1];
    if (!props.cliente || !props.cliente.id) return null;
    var enviar = function () {
      setS(true);
      props.api('/clientes/' + props.cliente.id + '/acesso-portal', { method: 'POST', body: {} })
        .then(function (x) { if (x.enviado) props.toast('Link de criar senha enviado no WhatsApp', 'success'); else if (x.codigo || x.link_senha) setR(x); else props.toast('Motoboy Tutts entra com o código e a senha de sempre', 'success'); })
        .catch(function (e) { props.toast(e.message, 'error'); }).then(function () { setS(false); });
    };
    var url = (window.location.origin || '') + '/moto';
    return h(React.Fragment, null,
      Btn({ icon: 'key', disabled: s, onClick: enviar, title: 'Envia ao locatário o código para criar a senha do portal', children: s ? 'Enviando...' : (props.cliente.tem_acesso_portal ? 'Reenviar acesso ao portal' : 'Acesso ao portal') }),
      r ? h(Modal, { titulo: 'Acesso ao portal do locatário', onClose: function () { setR(null); }, largura: 460 },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5, color: '#374151' } },
          Aviso('ambar', 'O WhatsApp não enviou', 'Passe o código ao locatário por outro canal. Ele vale por pouco tempo.'),
          h('div', { style: { textAlign: 'center', fontFamily: SORA, fontSize: 30, fontWeight: 700, letterSpacing: '.3em', color: ROXO_ESC } }, r.codigo || '—'),
          h('div', null, 'O locatário abre o link abaixo, cria a senha e depois entra na Central com o CPF (só números) e essa senha.'), /* LOCACAO_ACESSO_EXTERNO_V1 */
          r.link_senha ? Input({ readOnly: true, value: r.link_senha, onFocus: function (e) { e.target.select(); }, style: { fontFamily: MONO, fontSize: 12 }, 'aria-label': 'Link para criar a senha' }) : null,
          Btn({ icon: 'copy', onClick: function () { copiar('Crie sua senha da Central Tutts neste link (vale 48h): ' + (r.link_senha || url) + ' · Depois entre com seu CPF (só números) e a senha.', props.toast); }, children: 'Copiar mensagem' }))) : null);
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
      // LOCACAO_V3: encargos (multa + juros a.m. + IPCA), locadora e bases
      var enc = Object.assign({ multa_pct: 2, juros_mes_pct: 1, dias_rescisao: cfg.dias_retomada || 7, correcao_ipca: true }, cfg.encargos || {});
      body.encargos = { multa_pct: moedaParse(enc.multa_pct), juros_mes_pct: moedaParse(enc.juros_mes_pct), dias_rescisao: parseInt(enc.dias_rescisao, 10), correcao_ipca: enc.correcao_ipca !== false };
      if (body.encargos.dias_rescisao > 0) body.dias_retomada = body.encargos.dias_rescisao;
      if (cfg.dias_desbloqueio != null && cfg.dias_desbloqueio !== '') body.dias_desbloqueio = parseInt(cfg.dias_desbloqueio, 10);
      /* LOCACAO_REGRAS_BLOQUEIO_V1 */
      if (cfg.dias_bloqueio != null && cfg.dias_bloqueio !== '') body.encargos.dias_bloqueio = parseInt(cfg.dias_bloqueio, 10);
      if (cfg.vistoria_regras) { body.encargos.vistoria_aviso_horas = parseInt(cfg.vistoria_regras.aviso_horas, 10); body.encargos.vistoria_faltas_bloqueio = parseInt(cfg.vistoria_regras.faltas_bloqueio, 10); }
      if (cfg.locadora) body.locadora = Object.assign({}, cfg.locadora, { area_raio_km: parseInt(cfg.locadora.area_raio_km, 10) || null });
      if (cfg.bases) body.bases = cfg.bases.filter(function (b) { return String(b.nome || b.endereco || '').trim(); });
      if (cfg.assinatura) body.assinatura = { modo: cfg.assinatura.modo === 'email' ? 'email' : 'app', tutts_auto: cfg.assinatura.tutts_auto !== false, vistoria_antes: cfg.assinatura.vistoria_antes !== false, conferir_posicoes: cfg.assinatura.conferir_posicoes !== false }; // LOCACAO_ASSINATURA_V2 · LOCACAO_FLUXO_V1 · AUTENTIQUE_CONFERIR_V1
      api('/config', { method: 'PUT', body: body }).then(function (r) { if (r && typeof r === 'object' && (r.juros_dia_pct != null || r.encargos)) setCfg(function (c) { return Object.assign({}, c, r); }); toast('Configurações salvas', 'success'); })
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
    var SEC = [{ id: 'juros', t: 'Encargos e retomada' }, { id: 'regua', t: 'Régua de cobrança' }, { id: 'tarifario', t: 'Tarifário (Anexo I)' }, { id: 'locadora', t: 'Locadora e bases' }, { id: 'ipca', t: 'Índices IPCA' }, { id: 'assinatura', t: 'Assinatura' }, { id: 'modelo', t: 'Modelo de contrato' }, { id: 'termo', t: 'Termo LGPD' }, { id: 'integ', t: 'Integrações' }]; // LOCACAO_V3
    var vis = function (id) { return secao === id ? null : { display: 'none' }; };
    var barraSalvar = h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
      Btn({ onClick: carregar, children: 'Descartar' }),
      Btn({ variant: 'pri', icon: 'save', disabled: salvando, onClick: salvar, children: salvando ? 'Salvando...' : 'Salvar configurações' }));
    var chipsSec = h('div', { role: 'tablist', 'aria-label': 'Seções das configurações', style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, Chips(SEC, secao, setSecao));
    if (secao === 'regua') return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, chipsSec, h(ReguaCobranca, { cfg: cfg, set: set, api: api }), barraSalvar);
    if (secao === 'tarifario') return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, chipsSec, h(TarifarioConfig, { api: api, toast: toast })); // LOCACAO_V3
    if (secao === 'ipca') return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, chipsSec, h(IpcaConfig, { api: api, toast: toast }));
    if (secao === 'locadora') return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 } }, chipsSec, h(LocadoraCard, { cfg: cfg, set: set }), barraSalvar);
    if (secao === 'assinatura') return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 } }, chipsSec, h(AssinaturaCard, { cfg: cfg, set: set }), barraSalvar); // LOCACAO_ASSINATURA_V2
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } }, chipsSec,
     h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start' },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: vis('juros') }, h(EncargosCard, { cfg: cfg, set: set, api: api, toast: toast })), // LOCACAO_V3: multa 2% + juros 1% a.m. + IPCA (substitui juros ao dia)
        h('div', { style: vis('modelo') }, h(Card, { pad: false }, CardHead('Modelo de contrato · Tutts Aluguel / Plano Conquista'),
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
            h(TestarPixBox, { api: api }), // LOCACAO_FLUXO_V1
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
      if (a.tipo === 'reenviar_assinatura') return nav({ tela: 'contrato', id: a.contrato_id }); // LOCACAO_REMODEL_V1: envia pela tela, depois de conferir as posições
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
              h('div', { style: { fontSize: 13.5, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } }, h('b', null, o.evento || o.tipo_label || t[1]), o.descricao ? h('span', { style: { color: '#374151' } }, '· ' + o.descricao) : null, o.tarifa_codigo ? Pill('Tarifário', 'roxo', true) : null, TagCl(o.clausula)), // LOCACAO_V3
              o.detalhes && (o.detalhes.ait || o.detalhes.local) ? h('div', { style: { fontSize: 12, color: '#374151' } }, [o.detalhes.ait ? 'AIT ' + o.detalhes.ait : null, o.detalhes.data_infracao ? fDH(o.detalhes.data_infracao) : null, o.detalhes.local].filter(Boolean).join(' · ')) : null,
              (o.itens || []).length > 1 ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, o.itens.map(function (it) { return it.descricao + ' ' + fR(it.valor); }).join(' + ')) : null,
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
    // LOCACAO_V3: posições do Anexo IV (8) + legado (pneus), só as que existem em alguma das duas
    var POSC = POS_V3.map(function (p) { return [p[0], p[1].replace(/^\d+\.\s*/, '')]; }).concat([['pneus', 'Pneus'], ['extra', 'Extra']]).filter(function (p) { return fotoDe(A, p[0]) || fotoDe(B, p[0]); });
    if (!POSC.length) POSC = POSICOES;
    var marcadas = POSC.filter(function (p) { return dif[p[0]] != null; });
    var km = A && B && A.km != null && B.km != null ? B.km - A.km : null;
    var nFotos = POSC.filter(function (p) { return fotoDe(A, p[0]) && fotoDe(B, p[0]); }).length;
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
          POSC.map(function (p) {
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



  // ═════════════════════════ LOCACAO_V3: contrato real (Tarifário, Demonstrativo, Anexo IV) ═════════════════════════
  var CHECKLIST_PADRAO = ['Pintura / carenagens / tanque', 'Farol, lanterna, setas e luz de placa', 'Retrovisores (2)', 'Pneus (dianteiro / traseiro)', 'Freios (dianteiro / traseiro)', 'Kit relação (corrente, coroa, pinhão)', 'Painel, hodômetro e buzina', 'Escapamento e filtro de ar originais', 'Placa e lacre', 'Rastreador / bloqueador (lacre)', 'Bancos, rabeta e para-lamas', 'Chave principal / chave reserva', 'Antena corta-pipa / protetor de motor'];
  var POS_V3 = [['frente', '1. Frente', true], ['traseira', '2. Traseira', true], ['lateral_esq', '3. Lateral esquerda', true], ['lateral_dir', '4. Lateral direita', true], ['painel', '5. Painel e hodômetro', true], ['motor_chassi', '6. Motor e nº do chassi', true], ['avaria1', '7. Avaria (detalhe)', false], ['avaria2', '8. Avaria (detalhe)', false]];
  var POS_LABEL = { frente: 'Frente', traseira: 'Traseira', lateral_esq: 'Lateral esq.', lateral_dir: 'Lateral dir.', painel: 'Painel', motor_chassi: 'Motor/chassi', avaria1: 'Avaria 1', avaria2: 'Avaria 2', pneus: 'Pneus', extra: 'Extra' };
  var COMBUST = [['reserva', 'Reserva'], ['1/4', '1/4'], ['1/2', '1/2'], ['3/4', '3/4'], ['cheio', 'Cheio']];
  var CONDICAO = [['0km', '0 km'], ['seminova', 'Seminova'], ['usada', 'Usada']];
  var TIPO_CALC = [['fixo', 'Valor fixo'], ['fixo_km', 'Fixo + por km'], ['percentual', '% sobre valor informado'], ['custo', 'Custo efetivo / valor informado'], ['custo_mais_fixo', 'Fixo + custo efetivo'], ['por_dia', 'Por dia'], ['calculado', 'Calculado']];
  var GRUPOS_TAR = ['Trânsito', 'Uso e conduta', 'Socorro e recolhimento', 'Documentos', 'Danos e manutenção', 'Encerramento'];
  function posLabel(p) { var x = POS_V3.find(function (z) { return z[0] === p; }); return x ? x[1] : (POS_LABEL[p] || p); }
  function itensChecklist(cfg) {
    var l = cfg && cfg.checklist_itens;
    if (!l || !l.length) return CHECKLIST_PADRAO;
    return l.map(function (x) { return typeof x === 'string' ? x : (x.item || x.nome || x.titulo || ''); }).filter(Boolean);
  }
  function posicoesDaVistoria(v) {
    var fotos = v.fotos || [];
    var tem = function (p) { return fotos.some(function (f) { return f.posicao === p; }); };
    var base = tem('pneus') && !tem('motor_chassi') ? ['frente', 'traseira', 'lateral_esq', 'lateral_dir', 'painel', 'pneus'] : POS_V3.slice(0, 6).map(function (x) { return x[0]; });
    fotos.forEach(function (f) { if (base.indexOf(f.posicao) < 0) base.push(f.posicao); });
    return base;
  }
  function pctTxt(v, casas) { return num(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas == null ? 4 : casas }); }
  function abrirPdfPost(api, url, body, toast) {
    var w = window.open('', '_blank');
    api(url, { method: 'POST', body: body || {}, raw: true }).then(function (res) { return res.blob(); }).then(function (b) {
      var u = URL.createObjectURL(b);
      if (w) w.location.href = u; else window.open(u, '_blank');
      setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
    }).catch(function (e) { if (w) w.close(); toast(e.message, 'error'); });
  }
  function addMeses(d, n) { var x = new Date(d.getTime()); var dia = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + n); var ult = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(dia, ult)); return x; }
  function Radio(on, titulo, sub, onClick, extra, tag) {
    return h('div', { role: 'radio', 'aria-checked': on, tabIndex: 0, onClick: onClick, onKeyDown: function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onClick(); } },
      style: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '11px 14px', borderRadius: 12, border: on ? '1.5px solid ' + ROXO : '1px solid #e5e7eb', boxShadow: on ? '0 0 0 3px #f3e8fb' : 'none', cursor: 'pointer', background: on ? '#faf7fd' : '#fff' } },
      h('span', { 'aria-hidden': 'true', style: { width: 18, height: 18, borderRadius: 99, border: '2px solid ' + (on ? ROXO : '#d1d5db'), display: 'grid', placeItems: 'center', flex: 'none', marginTop: 1 } }, on ? h('span', { style: { width: 8, height: 8, borderRadius: 99, background: ROXO } }) : null),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontWeight: 600, fontSize: 13.5, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } }, titulo, tag || null), sub ? h('div', { style: { fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 } }, sub) : null),
      extra || null);
  }
  function Check(on, onChange, label, sub) {
    return h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13 } },
      h('input', { type: 'checkbox', checked: !!on, onChange: function (e) { onChange(e.target.checked); }, style: { width: 18, height: 18, accentColor: ROXO, marginTop: 1, flex: 'none' } }),
      h('span', null, h('span', { style: { fontWeight: 600, color: '#111827' } }, label), sub ? h('span', { style: { display: 'block', fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.45 } }, sub) : null));
  }
  function LinhaValor(a, b, forte, cor) {
    return h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 } },
      h('span', { style: { color: forte ? '#111827' : '#6b7280', fontWeight: forte ? 700 : 400 } }, a), h('span', { style: Object.assign({ fontWeight: forte ? 700 : 600, textAlign: 'right', color: cor || '#111827' }, TAB) }, b));
  }
  function TagCl(t) { return t ? h('span', { style: { fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 6, background: '#f3f4f6', color: '#374151', whiteSpace: 'nowrap' } }, /^cl/i.test(t) ? t : 'Cl. ' + t) : null; }

  // ───────── Configurações · Encargos ─────────
  function EncargosCard(props) {
    var cfg = props.cfg, set = props.set;
    var enc = Object.assign({ multa_pct: 2, juros_mes_pct: 1, dias_rescisao: cfg.dias_retomada || 7, correcao_ipca: true }, cfg.encargos || {});
    var setE = function (k, v) { var n = Object.assign({}, enc); n[k] = v; set('encargos', n); };
    var m = num(moedaParse(enc.multa_pct)), j = num(moedaParse(enc.juros_mes_pct));
    var ipcaUlt = cfg.ipca_ultimo || null;
    var exM = 1300 * m / 100, exJ = 1300 * j / 100 / 30 * 10, exI = enc.correcao_ipca && ipcaUlt ? 1300 * num(ipcaUlt.pct) / 100 * 10 / 30 : 0;
    var campoNum = function (k, label, hint, suf) {
      return h(Field, { label: label, req: true, hint: hint }, h('div', { style: { position: 'relative' } }, Input({ value: enc[k] != null ? String(enc[k]).replace('.', ',') : '', inputMode: 'decimal', onChange: function (e) { setE(k, e.target.value); }, style: { paddingRight: 46 } }), h('span', { style: { position: 'absolute', right: 12, top: 11, fontSize: 13, color: '#6b7280' } }, suf)));
    };
    return h(Card, { pad: false }, CardHead('Encargos de atraso e retomada', TagCl('5.10 i')),
      h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { className: 'grid grid-cols-1 md:grid-cols-3', style: { gap: 12 } },
          campoNum('multa_pct', 'Multa moratória', 'Uma vez, sobre a parcela vencida', '%'),
          campoNum('juros_mes_pct', 'Juros de mora', 'ao mês, pro rata die · ' + pctTxt(j / 30) + '% ao dia', '% a.m.'),
          h(Field, { label: 'Correção pelo IPCA', hint: ipcaUlt ? 'Último índice lançado: ' + ipcaUlt.competencia + ' · ' + pctTxt(ipcaUlt.pct, 2) + '%' : 'Índices lançados à mão em “Índices IPCA”' },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, height: 40 } }, Toggle(enc.correcao_ipca !== false, function (v) { setE('correcao_ipca', v); }, 'Corrigir pelo IPCA'), h('span', { style: { fontSize: 13 } }, enc.correcao_ipca !== false ? 'Aplicar' : 'Não aplicar')))),
        h('div', { style: { background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: 12, padding: '10px 12px', fontSize: 12.5, color: '#374151', lineHeight: 1.5 } },
          h('b', { style: { color: ROXO_ESC } }, 'Exemplo · '), 'parcela de R$ 1.300,00 paga com 10 dias de atraso: multa ' + fR(exM) + ' + juros ' + fR(exJ) + (exI ? ' + IPCA ' + fR(exI) : '') + ' = ', h('b', null, fR(1300 + exM + exJ + exI))),
        /* LOCACAO_REGRAS_BLOQUEIO_V1: bloqueio (14.4 a) antes da rescisão (14.2 a) */
        h('div', { className: 'grid grid-cols-2 md:grid-cols-4', style: { gap: 12 } },
          h(Field, { label: 'Bloqueio no rastreador após', req: true, hint: 'dias de atraso · Cl. 14.4 a · 0 = não bloqueia' }, Input({ value: cfg.dias_bloqueio != null ? String(cfg.dias_bloqueio) : '3', inputMode: 'numeric', onChange: function (e) { set('dias_bloqueio', soDig(e.target.value)); } })),
          h(Field, { label: 'Rescisão e recolhimento após', req: true, hint: 'dias de atraso · Cl. 14.2 a' }, Input({ value: enc.dias_rescisao != null ? String(enc.dias_rescisao) : '', inputMode: 'numeric', onChange: function (e) { setE('dias_rescisao', soDig(e.target.value)); } })),
          h(Field, { label: 'Desbloqueio após pagamento', hint: 'dias úteis · Cl. 14.6' }, Input({ value: cfg.dias_desbloqueio != null ? String(cfg.dias_desbloqueio) : '2', inputMode: 'numeric', onChange: function (e) { set('dias_desbloqueio', soDig(e.target.value)); } })),
          h(Field, { label: 'Validade do convite (dias)', req: true }, Input({ value: cfg.validade_convite_dias != null ? String(cfg.validade_convite_dias) : '', inputMode: 'numeric', onChange: function (e) { set('validade_convite_dias', soDig(e.target.value)); } }))),
        (function () {
          var nb = parseInt(cfg.dias_bloqueio != null ? cfg.dias_bloqueio : 3, 10), nr = parseInt(enc.dias_rescisao, 10);
          var txt = nb === 0 ? 'Sem bloqueio automático por atraso: a moto só é recolhida na rescisão, com mais de ' + (nr || '—') + ' dias.'
            : 'Linha do tempo do atraso: dia 1 cobra multa e juros · dia ' + nb + ' bloqueio sinalizado no rastreador · mais de ' + (nr || '—') + ' dias, rescisão e recolhimento.';
          return h('div', { style: { fontSize: 12.5, color: nb > nr ? '#991b1b' : '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px' } }, nb > nr ? 'O bloqueio precisa vir antes da rescisão.' : txt);
        })(),
        h('div', { style: { borderTop: '1px solid #f3f4f6', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, h('b', { style: { fontSize: 13.5 } }, 'Vistoria mensal na Base'), TagCl('9.4.1')),
          h('div', { className: 'grid grid-cols-2 md:grid-cols-4', style: { gap: 12 } },
            h(Field, { label: 'Intervalo (dias)', req: true, hint: 'entre uma vistoria e outra' }, Input({ value: cfg.vistoria_periodica_dias != null ? String(cfg.vistoria_periodica_dias) : '', inputMode: 'numeric', onChange: function (e) { set('vistoria_periodica_dias', soDig(e.target.value)); } })),
            h(Field, { label: 'Agendar com antecedência', req: true, hint: 'horas de aviso ao locatário' }, h('div', { style: { position: 'relative' } }, Input({ value: cfg.vistoria_regras && cfg.vistoria_regras.aviso_horas != null ? String(cfg.vistoria_regras.aviso_horas) : '48', inputMode: 'numeric', onChange: function (e) { set('vistoria_regras', Object.assign({}, cfg.vistoria_regras || {}, { aviso_horas: soDig(e.target.value) })); }, style: { paddingRight: 40 } }), h('span', { style: { position: 'absolute', right: 12, top: 11, fontSize: 13, color: '#6b7280' } }, 'h'))),
            h(Field, { label: 'Bloqueio após faltas seguidas', req: true, hint: '0 = não bloqueia' }, Input({ value: cfg.vistoria_regras && cfg.vistoria_regras.faltas_bloqueio != null ? String(cfg.vistoria_regras.faltas_bloqueio) : '2', inputMode: 'numeric', onChange: function (e) { set('vistoria_regras', Object.assign({}, cfg.vistoria_regras || {}, { faltas_bloqueio: soDig(e.target.value) })); } })),
            h(Field, { label: 'Multa por falta', hint: 'valor do Tarifário (Anexo I)' }, h('div', { style: { height: 40, display: 'flex', alignItems: 'center', fontSize: 13.5, fontWeight: 600 } }, cfg.vistoria_regras && cfg.vistoria_regras.multa != null ? fR(cfg.vistoria_regras.multa) : 'R$ 100,00')))),
        Aviso('cinza', null, 'O bloqueio remoto só é efetivado com a moto parada ou desligada (Cl. 14.5). Mudanças aqui valem para os próximos contratos e para a rotina diária; os contratos já assinados mantêm os encargos de quando foram assinados.', 'lock'),
        cfg.legado && cfg.legado.qtd > 0 ? h('div', { role: 'alert', style: { border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
          h('b', { style: { color: '#991b1b', fontSize: 13.5 } }, cfg.legado.qtd + (cfg.legado.qtd === 1 ? ' contrato em andamento ainda cobra' : ' contratos em andamento ainda cobram') + ' juros ao dia (modelo antigo)'),
          h('span', { style: { fontSize: 12.5, color: '#374151', lineHeight: 1.45 } }, 'Juros de ' + pctTxt(Math.max.apply(null, cfg.legado.contratos.map(function (k) { return k.juros_dia_pct || 0; })), 2) + '% ao dia chegam a dezenas de % ao mês. Para pessoa física a multa por atraso é limitada a 2% (CDC, art. 52, §1º) e esse encargo tende a ser derrubado. Passe esses contratos para multa ' + pctTxt(m, 2) + '% + juros ' + pctTxt(j, 2) + '% a.m.' + (enc.correcao_ipca !== false ? ' + IPCA' : '') + ': vale para o que está em aberto, parcelas pagas não mudam.'),
          h('span', { style: { fontSize: 12, color: '#6b7280' } }, cfg.legado.contratos.slice(0, 8).map(function (k) { return (k.numero || '#' + k.id) + ' · ' + k.nome + ' (' + pctTxt(k.juros_dia_pct, 2) + '%/dia)'; }).join(' · ') + (cfg.legado.qtd > 8 ? ' · e mais ' + (cfg.legado.qtd - 8) : '')),
          h('div', null, Btn({ variant: 'pri', small: true, onClick: function () {
            if (!window.confirm('Trocar os encargos de ' + cfg.legado.qtd + ' contrato(s) do modelo antigo (juros ao dia) para multa + juros ao mês?\n\nVale para as parcelas em aberto. Fica registrado no histórico de cada contrato.')) return;
            props.api('/contratos/migrar-legado', { method: 'POST', body: {} }).then(function (r) { props.toast((r.migrados || 0) + ' contrato(s) passaram para multa + juros ao mês', 'success'); set('legado', { qtd: 0, contratos: [] }); })
              .catch(function (e) { props.toast(e.message, 'error'); });
          }, children: 'Passar para multa + juros ao mês' }))) : null));
  }

  // ───────── Configurações · Locadora e bases ─────────
  // LOCACAO_ASSINATURA_V2: como o locatário assina e se a Tutts assina sozinha pela API
  function AssinaturaCard(props) {
    var cfg = props.cfg, a = Object.assign({ modo: 'app', tutts_auto: true, vistoria_antes: true, conferir_posicoes: true }, cfg.assinatura || {}); // LOCACAO_FLUXO_V1: + vistoria_antes · AUTENTIQUE_CONFERIR_V1: + conferir_posicoes
    var setA = function (k, v) { var n = Object.assign({}, a); n[k] = v; props.set('assinatura', n); };
    var opc = function (val, titulo, desc) {
      var sel = a.modo === val;
      return h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, cursor: 'pointer', border: '1.5px solid ' + (sel ? ROXO : '#e5e7eb'), background: sel ? '#faf7fd' : '#fff' } },
        h('input', { type: 'radio', name: 'loc-assin-modo', checked: sel, onChange: function () { setA('modo', val); }, style: { accentColor: ROXO, marginTop: 3 } }),
        h('div', null, h('div', { style: { fontWeight: 700, fontSize: 13.5 } }, titulo), h('div', { style: { fontSize: 12.5, color: '#6b7280', marginTop: 2 } }, desc)));
    };
    return h(Card, { pad: false }, CardHead('Assinatura do contrato · Autentique'),
      h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
        h('div', { style: { fontSize: 12.5, fontWeight: 600, color: '#374151' } }, 'Como o locatário assina'),
        opc('app', 'Pelo app da Central (recomendado)', 'O Autentique não manda e-mail. O link fica no cartão "Seu contrato está pronto" do app e a Tutts avisa no WhatsApp.'),
        opc('email', 'Autentique manda por e-mail', 'O locatário recebe o convite do Autentique no e-mail do cadastro (ou WhatsApp, se não tiver e-mail).'),
        h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: 12, borderTop: '1px solid #f3f4f6', cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: a.tutts_auto !== false, onChange: function (e) { setA('tutts_auto', e.target.checked); }, style: { accentColor: ROXO, width: 16, height: 16, marginTop: 2 } }),
          h('div', null, h('div', { style: { fontWeight: 700, fontSize: 13.5 } }, 'Tutts assina automaticamente'),
            h('div', { style: { fontSize: 12.5, color: '#6b7280', marginTop: 2 } }, a.dono_email ? 'Assina pela conta dona da chave da API: ' + a.dono_email + '.' : 'Autentique não configurado (AUTENTIQUE_TOKEN): a conta que assina pela Tutts aparece aqui depois de configurar.'))),
        h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: 12, borderTop: '1px solid #f3f4f6', cursor: 'pointer' } }, // LOCACAO_FLUXO_V1
          h('input', { type: 'checkbox', checked: a.vistoria_antes !== false, onChange: function (e) { setA('vistoria_antes', e.target.checked); }, style: { accentColor: ROXO, width: 16, height: 16, marginTop: 2 } }),
          h('div', null, h('div', { style: { fontWeight: 700, fontSize: 13.5 } }, 'Exigir vistoria de entrega antes da assinatura (recomendado)'),
            h('div', { style: { fontSize: 12.5, color: '#6b7280', marginTop: 2 } }, 'O contrato só vai para o Autentique depois da vistoria de entrega na Base, e o PDF já sai com o Anexo IV e as fotos. Desmarcado, o contrato é enviado logo ao ser criado.'))),
        h('label', { style: { display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: 12, borderTop: '1px solid #f3f4f6', cursor: 'pointer' } }, // AUTENTIQUE_CONFERIR_V1
          h('input', { type: 'checkbox', checked: a.conferir_posicoes !== false, onChange: function (e) { setA('conferir_posicoes', e.target.checked); }, style: { accentColor: ROXO, width: 16, height: 16, marginTop: 2 } }),
          h('div', null, h('div', { style: { fontWeight: 700, fontSize: 13.5 } }, 'Conferir a posição das assinaturas antes de enviar (recomendado)'),
            h('div', { style: { fontSize: 12.5, color: '#6b7280', marginTop: 2 } }, 'O contrato fica pronto e espera você abrir Posicionar e enviar. Desmarcado, vai direto ao Autentique com as posições automáticas (e o padrão salvo).'))),
        h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Vale para os próximos envios. Contratos já enviados seguem como foram.')));
  }

  // LOCACAO_FLUXO_V1: teste do PIX (Stark) — cria uma cobrança de R$ 1,00 e cancela em seguida
  function TestarPixBox(props) {
    var _r = useState(null), r = _r[0], setR = _r[1];
    var _o = useState(false), ocup = _o[0], setOcup = _o[1];
    var testar = function () {
      setOcup(true); setR(null);
      props.api('/integracoes/testar-pix', { method: 'POST', body: {} }).then(setR).catch(function (e) { setR({ ok: false, erro: e.message }); }).then(function () { setOcup(false); });
    };
    return h('div', { style: { padding: '8px 0 10px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 8 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        h('div', { style: { flex: 1, fontSize: 12, color: '#6b7280', lineHeight: 1.4 } }, 'Cria uma cobrança PIX de R$ 1,00 e cancela em seguida. Mostra o erro exato do Stark se não der.'),
        Btn({ small: true, disabled: ocup, onClick: testar, children: ocup ? 'Testando...' : 'Testar PIX' })),
      r ? h('div', { role: 'status', style: { fontSize: 12.5, lineHeight: 1.45, borderRadius: 10, padding: '8px 10px', background: r.ok ? '#f0fdf4' : '#fef2f2', border: '1px solid ' + (r.ok ? '#bbf7d0' : '#fecaca'), color: r.ok ? '#166534' : '#991b1b', wordBreak: 'break-word' } },
        r.ok ? (r.mensagem || 'PIX criado e cancelado com sucesso.') : /não configurado/i.test(r.erro || '') ? r.erro + ' · defina as variáveis no Railway.' : h(React.Fragment, null, 'Stark respondeu: ', h('b', null, '"' + (r.erro || 'erro desconhecido') + '"'),
          /permission|invoice/i.test(r.erro || '') ? ' · habilite recebimentos (Invoice) no projeto da API.' : /configurado/i.test(r.erro || '') ? ' · defina as variáveis no Railway.' : '')) : null);
  }

  function LocadoraCard(props) {
    var cfg = props.cfg, set = props.set;
    var loc = Object.assign({ razao_social: '', nome_fantasia: '', cnpj: '', endereco: '', cidade_foro: '', area_raio_km: 100, area_municipio: '' }, cfg.locadora || {});
    var bases = cfg.bases || [];
    var setL = function (k, v) { var n = Object.assign({}, loc); n[k] = v; set('locadora', n); };
    var setB = function (i, k, v) { var n = bases.map(function (b) { return Object.assign({}, b); }); n[i][k] = v; if (k === 'padrao' && v) n.forEach(function (b, j) { if (j !== i) b.padrao = false; }); set('bases', n); };
    var campo = function (k, label, extra) { extra = extra || {}; return h(Field, { key: k, label: label, req: extra.req, hint: extra.hint, style: extra.span ? { gridColumn: '1 / -1' } : null }, Input({ value: loc[k] != null ? String(loc[k]) : '', onChange: function (e) { setL(k, extra.dig ? soDig(e.target.value) : e.target.value); }, inputMode: extra.dig ? 'numeric' : null, style: extra.mono ? { fontFamily: MONO } : null })); };
    return h(Card, { pad: false }, CardHead('Dados da locadora e bases', null, 'impressos no Demonstrativo do contrato'),
      h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { className: 'grid grid-cols-1 md:grid-cols-2', style: { gap: 12 } },
          campo('razao_social', 'Razão social', { req: true, span: true }), campo('nome_fantasia', 'Nome fantasia'), campo('cnpj', 'CNPJ', { req: true, mono: true, hint: 'Proprietária da moto no DETRAN' }),
          campo('endereco', 'Endereço da filial', { span: true }), campo('cidade_foro', 'Foro', { hint: 'Cidade/UF' }),
          h('div', { className: 'grid grid-cols-2', style: { gap: 8 } }, campo('area_raio_km', 'Área padrão (km)', { dig: true, hint: 'raio do município' }), campo('area_municipio', 'Município'))),
        h('div', null,
          h('div', { style: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 } }, 'Bases de retirada e devolução'),
          bases.length === 0 ? h('div', { style: { fontSize: 13, color: '#9ca3af', padding: '6px 0' } }, 'Nenhuma base. Adicione a base onde a moto é retirada e devolvida.') : null,
          bases.map(function (b, i) {
            return h('div', { key: i, style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: i ? '1px solid #f3f4f6' : 0 } },
              Input({ value: b.nome || '', placeholder: 'Ex.: Base Cabula', 'aria-label': 'Nome da base', onChange: function (e) { setB(i, 'nome', e.target.value); }, style: { flex: '0 1 200px' } }),
              Input({ value: b.endereco || '', placeholder: 'Rua, número, bairro, cidade/UF', 'aria-label': 'Endereço da base', onChange: function (e) { setB(i, 'endereco', e.target.value); }, style: { flex: '1 1 280px' } }),
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                h('label', { style: { display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' } }, h('input', { type: 'radio', name: 'loc-base-padrao', checked: !!b.padrao || (bases.length === 1), onChange: function () { setB(i, 'padrao', true); }, style: { accentColor: ROXO } }), 'Padrão'),
                h('button', { type: 'button', 'aria-label': 'Remover base', onClick: function () { set('bases', bases.filter(function (_, j) { return j !== i; })); }, style: { color: '#9ca3af', cursor: 'pointer' }, className: 'hover:text-red-700' }, ico('trash', 14))));
          }),
          Btn({ variant: 'link', icon: 'plus', onClick: function () { set('bases', bases.concat([{ id: null, nome: '', endereco: '', padrao: bases.length === 0 }])); }, style: { marginTop: 8 }, children: 'Adicionar base' }))));
  }

  // ───────── Configurações · Tarifário (Anexo I) ─────────
  function TarifarioConfig(props) {
    var api = props.api, toast = props.toast;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var _s = useState(false), salv = _s[0], setSalv = _s[1];
    var _m = useState(false), mudou = _m[0], setMudou = _m[1];
    var carregar = useCallback(function () { setErro(null); setMudou(false); api('/tarifario').then(function (r) { setD({ itens: (r.itens || []).map(function (x) { return Object.assign({}, x); }), vigencia_desde: r.vigencia_desde ? String(r.vigencia_desde).slice(0, 10) : '', aviso_dias: r.aviso_dias || 30 }); }).catch(function (e) { setErro(e.message); }); }, [api]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d) return h(Card, null, Spinner('Carregando tarifário...'));
    var setIt = function (i, k, v) { setD(function (x) { var n = Object.assign({}, x); n.itens = x.itens.slice(); n.itens[i] = Object.assign({}, n.itens[i]); n.itens[i][k] = v; return n; }); setMudou(true); };
    var minVig = iso(addDias(new Date(), d.aviso_dias || 30));
    var salvar = function () {
      setSalv(true);
      var itens = d.itens.map(function (x, i) { return Object.assign({}, x, { valor: moedaParse(x.valor), valor_km: moedaParse(x.valor_km), pct: moedaParse(x.pct), ordem: i + 1 }); });
      api('/tarifario', { method: 'PUT', body: { itens: itens, vigencia_desde: d.vigencia_desde || null } })
        .then(function (r) { toast('Tarifário salvo' + (r && r.avisados ? ' · aviso enviado a ' + r.avisados + ' locatário' + (r.avisados === 1 ? '' : 's') : ''), 'success'); carregar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalv(false); });
    };
    var inpV = function (i, k, ph, w) { var x = d.itens[i]; return Input({ value: x[k] != null ? String(x[k]).replace('.', ',') : '', inputMode: 'decimal', placeholder: ph, 'aria-label': ph, onChange: function (e) { setIt(i, k, e.target.value); }, style: { height: 34, width: w || 96 } }); };
    var celValor = function (x, i) {
      var t = x.tipo_calculo;
      var desc = Input({ value: x.descricao || '', placeholder: 'texto no Anexo I', 'aria-label': 'Texto no Anexo I', onChange: function (e) { setIt(i, 'descricao', e.target.value); }, style: { height: 34, minWidth: 160 } });
      if (t === 'fixo' || t === 'por_dia') return h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } }, h('span', { style: { fontSize: 12, color: '#6b7280' } }, 'R$'), inpV(i, 'valor', 'Valor'), t === 'por_dia' ? h('span', { style: { fontSize: 12, color: '#6b7280' } }, '/ dia') : null);
      if (t === 'fixo_km') return h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } }, h('span', { style: { fontSize: 12, color: '#6b7280' } }, 'R$'), inpV(i, 'valor', 'Valor fixo', 84), h('span', { style: { fontSize: 12, color: '#6b7280' } }, '+ R$'), inpV(i, 'valor_km', 'Por km', 70), h('span', { style: { fontSize: 12, color: '#6b7280' } }, '/km'));
      if (t === 'percentual') return h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } }, inpV(i, 'pct', '%', 70), h('span', { style: { fontSize: 12, color: '#6b7280' } }, '%'));
      if (t === 'custo_mais_fixo') return h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' } }, h('span', { style: { fontSize: 12, color: '#6b7280' } }, 'R$'), inpV(i, 'valor', 'Valor fixo', 84), h('span', { style: { fontSize: 12, color: '#6b7280' } }, '+ custo'));
      return desc;
    };
    var grupos = [];
    d.itens.forEach(function (x, i) { var g = x.grupo || 'Outros'; var gr = grupos.find(function (z) { return z.g === g; }); if (!gr) { gr = { g: g, l: [] }; grupos.push(gr); } gr.l.push(i); });
    var linhas = [];
    grupos.forEach(function (gr) {
      linhas.push(h('tr', { key: 'g' + gr.g }, h('td', { colSpan: 5, style: { padding: '10px 16px 6px', fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '.05em', textTransform: 'uppercase', background: '#fcfcfd', borderTop: '1px solid #f3f4f6' } }, gr.g)));
      gr.l.forEach(function (i) {
        var x = d.itens[i];
        linhas.push(h('tr', { key: 'i' + (x.id || x.codigo || i) + '-' + i, style: { borderTop: '1px solid #f3f4f6', opacity: x.ativo === false ? 0.55 : 1 } },
          h('td', { style: Object.assign({}, TD, { paddingLeft: 16, whiteSpace: 'normal', minWidth: 220 }) },
            Input({ value: x.evento || '', 'aria-label': 'Evento', onChange: function (e) { setIt(i, 'evento', e.target.value); }, style: { height: 34, fontWeight: 600 } }),
            x.codigo ? h('div', { style: { fontSize: 11, color: '#9ca3af', fontFamily: MONO, marginTop: 3 } }, x.codigo) : null,
            (x.tipo_calculo !== 'custo' && x.tipo_calculo !== 'calculado') ? h('div', { style: { marginTop: 4 } }, Input({ value: x.descricao || '', placeholder: 'observação no Anexo I (opcional)', 'aria-label': 'Observação', onChange: function (e) { setIt(i, 'descricao', e.target.value); }, style: { height: 30, fontSize: 12 } })) : null),
          h('td', { style: TD }, Input({ value: x.clausula || '', 'aria-label': 'Cláusula', placeholder: '5.10 x', onChange: function (e) { setIt(i, 'clausula', e.target.value); }, style: { height: 34, width: 110 } })),
          h('td', { style: TD }, Select({ value: x.tipo_calculo || 'fixo', 'aria-label': 'Tipo de cálculo', onChange: function (e) { setIt(i, 'tipo_calculo', e.target.value); }, style: { height: 34, width: 190 } }, TIPO_CALC.map(function (t) { return h('option', { key: t[0], value: t[0] }, t[1]); }))),
          h('td', { style: TD }, celValor(x, i)),
          h('td', { style: Object.assign({}, TD, { textAlign: 'right', paddingRight: 16 }) }, h('div', { style: { display: 'inline-flex', gap: 10, alignItems: 'center' } }, Toggle(x.ativo !== false, function (v) { setIt(i, 'ativo', v); }, 'Ativar ' + (x.evento || 'evento')),
            !x.id ? h('button', { type: 'button', 'aria-label': 'Remover evento', onClick: function () { setD(function (z) { var n = Object.assign({}, z); n.itens = z.itens.filter(function (_, j) { return j !== i; }); return n; }); }, style: { color: '#9ca3af', cursor: 'pointer' } }, ico('trash', 14)) : null))));
      });
    });
    return h(Card, { pad: false },
      h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' } },
        h('div', { style: { marginRight: 'auto' } }, h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 700 } }, 'Tarifário (Anexo I)'), h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Valores por ocorrência · usados no “Lançar cobrança” e impressos no Anexo I do contrato')),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#374151' } }, 'Vigência a partir de', Input({ type: 'date', value: d.vigencia_desde || '', min: mudou ? minVig : null, onChange: function (e) { setD(function (x) { return Object.assign({}, x, { vigencia_desde: e.target.value }); }); setMudou(true); }, style: { height: 34, width: 160 } })),
        Btn({ small: true, onClick: carregar, disabled: salv, children: 'Descartar' }),
        Btn({ small: true, variant: 'pri', icon: 'save', disabled: salv || !mudou, onClick: salvar, children: salv ? 'Salvando...' : 'Salvar tarifário' })),
      h('div', { style: { padding: '12px 16px 0' } }, Aviso('ambar', null, 'Mudanças no tarifário valem para os contratos ativos só depois de ' + (d.aviso_dias || 30) + ' dias de aviso ao locatário (Cl. 17.11). Ao salvar, a Central avisa por WhatsApp e no app e mostra a data de vigência. Durante o aviso, o locatário pode encerrar sem Taxa de Cancelamento.', 'info')),
      h('div', { style: { overflowX: 'auto', marginTop: 12 } },
        h('table', { style: Object.assign({ width: '100%', borderCollapse: 'collapse' }, TAB) },
          h('thead', null, h('tr', null, [['Evento', 16], ['Cláusula'], ['Tipo de cálculo'], ['Valor'], ['Ativo']].map(function (c, i) { return h('th', { key: i, style: Object.assign({}, TH, i === 0 ? { paddingLeft: 16 } : {}, i === 4 ? { textAlign: 'right', paddingRight: 16 } : {}) }, c[0]); }))),
          h('tbody', null, linhas))),
      h('div', { style: { padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 } },
        Btn({ variant: 'link', icon: 'plus', onClick: function () { setD(function (x) { return Object.assign({}, x, { itens: x.itens.concat([{ id: null, codigo: null, evento: '', grupo: 'Uso e conduta', clausula: '', tipo_calculo: 'fixo', valor: '', ativo: true }]) }); }); setMudou(true); }, children: 'Adicionar evento' }),
        h('span', { style: { fontSize: 12, color: '#6b7280' } }, 'Eventos novos entram no grupo “Uso e conduta”. Os que vêm do contrato não podem ser removidos, só desativados.')));
  }

  // ───────── Configurações · Índices IPCA ─────────
  function IpcaConfig(props) {
    var api = props.api, toast = props.toast;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _e = useState(null), erro = _e[0], setErro = _e[1];
    var hoje = new Date(), ant = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    var _c = useState(ant.getFullYear() + '-' + p2(ant.getMonth() + 1)), comp = _c[0], setComp = _c[1];
    var _p = useState(''), pct = _p[0], setPct = _p[1];
    var _s = useState(false), salv = _s[0], setSalv = _s[1];
    var carregar = useCallback(function () { setErro(null); api('/ipca').then(setD).catch(function (e) { setErro(e.message); }); }, [api]);
    useEffect(carregar, [carregar]);
    if (erro) return Erro(erro, carregar);
    if (!d) return h(Card, null, Spinner('Carregando índices...'));
    var lista = (d.indices || []).slice().sort(function (a, b) { return a.competencia < b.competencia ? 1 : -1; });
    var nomeMes = function (c) { var p = String(c).split('-'); var M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return (M[+p[1] - 1] || p[1]) + '/' + p[0]; };
    var pctN = moedaParse(pct);
    var salvar = function () {
      setSalv(true);
      api('/ipca', { method: 'PUT', body: { competencia: comp, pct: pctN } }).then(function () { toast('IPCA de ' + nomeMes(comp) + ' salvo', 'success'); setPct(''); carregar(); }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalv(false); });
    };
    var remover = function (c) {
      if (!window.confirm('Remover o IPCA de ' + nomeMes(c) + '?')) return;
      api('/ipca/' + c, { method: 'DELETE' }).then(function () { toast('Índice removido', 'success'); carregar(); }).catch(function (e) { toast(e.message, 'error'); });
    };
    return h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start' },
      h(Card, { pad: false }, CardHead('Índices IPCA', null, 'lançados à mão pelo time · usados na correção de atrasos, no reajuste anual e na opção de compra'),
        lista.length === 0 ? Vazio('Nenhum índice lançado', 'Lance o IPCA mensal divulgado pelo IBGE. Sem índice, a correção fica zerada.') :
        Tabela([{ t: 'Competência' }, { t: 'IPCA do mês', right: true }, { t: '' }], lista.map(function (x) {
          return Linha(x.competencia, [nomeMes(x.competencia), { td: 1, v: pctTxt(x.pct, 2) + '%', right: true },
            { td: 1, right: true, v: h('button', { type: 'button', 'aria-label': 'Remover ' + nomeMes(x.competencia), onClick: function () { remover(x.competencia); }, style: { color: '#9ca3af', cursor: 'pointer' }, className: 'hover:text-red-700' }, ico('trash', 14)) }]);
        }))),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h(Card, null,
          h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'IPCA acumulado em 12 meses'),
          h('div', { style: Object.assign({ fontFamily: SORA, fontSize: 26, fontWeight: 700 }, TAB) }, d.acumulado_12m != null ? pctTxt(d.acumulado_12m, 2) + '%' : '—'),
          h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Sugerido no reajuste anual dos contratos com mais de 12 meses (Cl. 5.7).')),
        h(Card, { pad: false }, CardHead('Lançar índice'),
          h('div', { style: { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } },
            h(Field, { label: 'Competência', req: true }, Input({ type: 'month', value: comp, onChange: function (e) { setComp(e.target.value); } })),
            h(Field, { label: 'IPCA do mês (%)', req: true, hint: 'Ex.: 0,48 · pode ser negativo' }, Input({ value: pct, inputMode: 'decimal', onChange: function (e) { setPct(e.target.value); } })),
            Btn({ variant: 'pri', icon: 'save', disabled: salv || !comp || pctN == null, onClick: salvar, children: salv ? 'Salvando...' : (lista.some(function (x) { return x.competencia === comp; }) ? 'Atualizar índice' : 'Salvar índice') })))));
  }

  // ───────── Lançar cobrança do tarifário ─────────
  var CAMPOS_TARIFA = {
    multa_transito: ['valor_multa', 'ait', 'data_infracao', 'local', 'condutor'], nic: ['valor_multa', 'ait'], recolhimento: ['km_excedente'], area_excedida: ['dias'],
    apreensao: ['valor_custo'], chave_miolo: ['valor_custo', 'mao_obra'], despachante: ['valor_custo'], pecas_servicos: ['valor_custo', 'mao_obra'], danos: ['valor_custo'], retencao_fipe: ['valor'], taxa_cancelamento: ['encerrar']
  };
  function camposDaTarifa(t) {
    if (!t) return [];
    if (CAMPOS_TARIFA[t.codigo]) return CAMPOS_TARIFA[t.codigo];
    return { fixo_km: ['km_excedente'], por_dia: ['dias'], custo: ['valor_custo'], custo_mais_fixo: ['valor_custo'], percentual: ['valor'], calculado: ['encerrar'] }[t.tipo_calculo] || [];
  }
  function valorTarifaLabel(t) {
    if (!t) return '';
    var tc = t.tipo_calculo;
    if (tc === 'fixo') return fR(t.valor);
    if (tc === 'por_dia') return fR(t.valor) + ' / dia';
    if (tc === 'fixo_km') return fR(t.valor) + ' + ' + fR(t.valor_km) + '/km';
    if (tc === 'percentual') return pctTxt(t.pct, 2) + '%';
    if (tc === 'custo_mais_fixo') return fR(t.valor) + ' + custo';
    return t.descricao || 'valor apurado';
  }
  function LancarCobrancaModal(props) {
    var api = props.api, toast = props.toast, m = props.moto || {}, ct = props.contrato || {};
    var _t = useState(null), tar = _t[0], setTar = _t[1];
    var _q = useState(''), q = _q[0], setQ = _q[1];
    var _sel = useState(props.codigo || null), cod = _sel[0], setCod = _sel[1];
    var _d = useState({ valor_multa: '', ait: '', data_infracao: '', local: '', km_excedente: '', dias: '1', valor_custo: '', mao_obra: '', valor: '' }), dados = _d[0], setDados = _d[1];
    var _dt = useState(hojeISO()), data = _dt[0], setData = _dt[1];
    var _ds = useState(''), desc = _ds[0], setDesc = _ds[1];
    var _fc = useState('proxima_parcela'), forma = _fc[0], setForma = _fc[1];
    var _pn = useState(3), pn = _pn[0], setPn = _pn[1];
    var _ic = useState(true), indicar = _ic[0], setIndicar = _ic[1];
    var _a = useState([]), anexos = _a[0], setAnexos = _a[1];
    var _s = useState(null), sim = _s[0], setSim = _s[1];
    var _b = useState(false), salv = _b[0], setSalv = _b[1];
    useEffect(function () { api('/tarifario').then(function (r) { setTar((r.itens || []).filter(function (x) { return x.ativo !== false; })); }).catch(function (e) { toast(e.message, 'error'); setTar([]); }); }, []);
    var t = (tar || []).find(function (x) { return x.codigo === cod || String(x.id) === String(cod); });
    var campos = camposDaTarifa(t);
    var setDd = function (k, v) { setDados(function (x) { var n = Object.assign({}, x); n[k] = v; return n; }); };
    var dadosBody = function () {
      var b = {};
      campos.forEach(function (k) {
        if (k === 'condutor' || k === 'encerrar') return;
        var v = dados[k];
        if (k === 'ait' || k === 'local' || k === 'data_infracao') { if (v) b[k] = v; return; }
        if (k === 'km_excedente' || k === 'dias') { b[k] = v === '' ? null : parseInt(soDig(v), 10); return; }
        b[k] = moedaParse(v);
      });
      return b;
    };
    var faltaDado = campos.some(function (k) { if (k === 'condutor' || k === 'local' || k === 'data_infracao' || k === 'mao_obra') return false; if (k === 'encerrar') return true; if (k === 'ait') return !String(dados.ait || '').trim(); if (k === 'km_excedente') return dados.km_excedente === ''; if (k === 'dias') return !(parseInt(dados.dias, 10) > 0); return !(moedaParse(dados[k]) > 0); });
    var simKey = useDebounce({ c: t && t.codigo, d: dadosBody(), f: forma, n: pn, ok: !!t && !faltaDado }, 350);
    useEffect(function () {
      setSim(null);
      if (!simKey.ok) return;
      api('/cobrancas/simular', { method: 'POST', body: { moto_id: m.id, contrato_id: ct.id || ct.contrato_id || null, tarifa_codigo: simKey.c, dados: simKey.d, forma_cobranca: simKey.f, parcelas_n: simKey.f === 'dividir' ? simKey.n : null } })
        .then(setSim).catch(function (e) { setSim({ possivel: false, motivo: e.message }); });
    }, [JSON.stringify(simKey)]);
    var addAnexo = function (files) {
      Array.prototype.slice.call(files || []).slice(0, 6).forEach(function (fl) {
        lerArquivo(fl, 1600, 0.82).then(function (u) { setAnexos(function (x) { return x.concat([{ nome: fl.name, conteudo: u, tam: fl.size }]); }); }).catch(function (e) { toast(e.message, 'error'); });
      });
    };
    var ok = t && !faltaDado && sim && sim.possivel !== false && data;
    var salvar = function () {
      setSalv(true);
      var dd = dadosBody();
      api('/motos/' + m.id + '/cobrancas', { method: 'POST', body: { tarifa_codigo: t.codigo, dados: dd, data: data, descricao: desc.trim() || null, forma_cobranca: forma, parcelas_n: forma === 'dividir' ? pn : null, indicar_condutor: campos.indexOf('condutor') >= 0 ? indicar : false, anexos: anexos.map(function (a) { return { nome: a.nome, conteudo: a.conteudo }; }) } })
        .then(function (r) { toast('Cobrança lançada' + (r && r.cobranca_label ? ' · ' + r.cobranca_label : ''), 'success'); if (r && r.pix_copia_cola) copiar(r.pix_copia_cola, toast); props.onSalvo && props.onSalvo(r); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalv(false); });
    };
    var qq = q.trim().toLowerCase();
    var grupos = [];
    (tar || []).forEach(function (x) { if (qq && [x.evento, x.grupo, x.codigo, x.clausula].join(' ').toLowerCase().indexOf(qq) < 0) return; var g = x.grupo || 'Outros'; var gr = grupos.find(function (z) { return z.g === g; }); if (!gr) { gr = { g: g, l: [] }; grupos.push(gr); } gr.l.push(x); });
    var campoTxt = function (k, label, extra) {
      extra = extra || {};
      return h(Field, { key: k, label: label, req: extra.req, opt: extra.opt, hint: extra.hint }, Input({ value: dados[k], type: extra.type || 'text', inputMode: extra.mode || null, placeholder: extra.ph || '', onChange: function (e) { setDd(k, extra.dig ? soDig(e.target.value) : e.target.value); }, style: extra.mono ? { fontFamily: MONO } : null }));
    };
    var cli = props.cliente || {};
    var nomeCli = cli.nome || ct.cliente_nome || '';
    var total = sim ? sim.total : null;
    var ln = (sim && sim.linhas) || [];
    return h(Modal, { titulo: 'Lançar cobrança', onClose: props.onClose, largura: 760,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Cancelar' }), Btn({ key: 's', variant: 'pri', icon: 'check', disabled: !ok || salv, onClick: salvar, children: salv ? 'Lançando...' : total != null ? 'Lançar cobrança de ' + fR(total) : 'Lançar cobrança' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { fontSize: 12.5, color: '#6b7280', marginTop: -8 } }, 'Eventos do Tarifário (Anexo I) e cobranças previstas no contrato'),
        nomeCli ? h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px' } },
          h('div', { style: { width: 36, height: 36, borderRadius: 99, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12.5, flex: 'none' } }, iniciais(nomeCli)),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontWeight: 700, fontSize: 13.5 } }, nomeCli), h('div', { style: { fontSize: 12, color: '#6b7280' } }, [ct.numero ? 'Contrato ' + ct.numero : null, ct.plano_label, m.modelo, m.placa].filter(Boolean).join(' · '))),
          ct.situacao ? pillSit(ct) : null) : null,
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, h('span', { style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, 'Evento do tarifário', h('span', { style: { color: ROXO } }, ' *')),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            h('div', { style: { display: 'flex' } }, Busca(q, setQ, 'Buscar evento (ex.: recolhimento, mau uso, despachante)')),
            !tar ? Spinner('Carregando tarifário...') : grupos.length === 0 ? h('div', { style: { fontSize: 13, color: '#9ca3af' } }, 'Nenhum evento encontrado.') :
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' } }, grupos.map(function (gr) {
              return h('div', { key: gr.g, style: { display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 11.5, fontWeight: 700, color: '#6b7280', minWidth: 132 } }, gr.g),
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 } }, gr.l.map(function (x) {
                  var on = t && x.codigo === t.codigo;
                  return h('button', { key: x.codigo || x.id, type: 'button', 'aria-pressed': on, onClick: function () { setCod(x.codigo || String(x.id)); }, title: valorTarifaLabel(x),
                    style: { height: 30, padding: '0 10px', borderRadius: 99, fontSize: 12.5, cursor: 'pointer', border: '1px solid ' + (on ? ROXO : '#e5e7eb'), background: on ? '#faf7fd' : '#fff', color: on ? ROXO_ESC : '#374151', fontWeight: on ? 700 : 500 } }, x.evento);
                })));
            })))),
        t ? h('div', { style: { border: '1px solid #e9d5f9', background: '#fcfaff', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 } },
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } }, h('b', { style: { fontSize: 14 } }, t.evento), TagCl(t.clausula), h('span', { style: { fontSize: 12.5, color: '#6b7280', marginLeft: 'auto' } }, valorTarifaLabel(t))),
          campos.indexOf('encerrar') >= 0 ? Aviso('azul', 'Use “Encerrar ou suspender” no contrato', 'A Taxa de Cancelamento é calculada no encerramento: até 20% das parcelas remanescentes, limitada a 3 meses ou 13 semanas (Cl. 5.10 a).') :
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2', style: { gap: 12 } },
            campos.indexOf('valor_multa') >= 0 ? campoTxt('valor_multa', t.codigo === 'nic' ? 'Valor da multa NIC' : 'Valor da multa', { req: true, mode: 'decimal', ph: 'R$ 0,00' }) : null,
            campos.indexOf('ait') >= 0 ? campoTxt('ait', 'Nº do auto de infração (AIT)', { req: true, mono: true }) : null,
            campos.indexOf('data_infracao') >= 0 ? campoTxt('data_infracao', 'Data e hora da infração', { opt: true, type: 'datetime-local' }) : null,
            campos.indexOf('local') >= 0 ? campoTxt('local', 'Local', { opt: true, ph: 'Ex.: Av. Paralela, Salvador' }) : null,
            campos.indexOf('km_excedente') >= 0 ? campoTxt('km_excedente', 'Km excedente', { req: true, mode: 'numeric', dig: true, hint: 'Além do raio da área de circulação · 0 se dentro' }) : null,
            campos.indexOf('dias') >= 0 ? campoTxt('dias', 'Dias fora da área', { req: true, mode: 'numeric', dig: true }) : null,
            campos.indexOf('valor_custo') >= 0 ? campoTxt('valor_custo', t.codigo === 'apreensao' ? 'Custos de liberação' : t.codigo === 'danos' ? 'Orçamento / franquia' : 'Custo efetivo', { req: true, mode: 'decimal', ph: 'R$ 0,00' }) : null,
            campos.indexOf('mao_obra') >= 0 ? campoTxt('mao_obra', 'Mão de obra', { opt: true, mode: 'decimal', ph: 'R$ 0,00' }) : null,
            campos.indexOf('valor') >= 0 ? campoTxt('valor', t.codigo === 'retencao_fipe' ? 'Valor FIPE da moto' : 'Valor base', { req: true, mode: 'decimal', ph: 'R$ 0,00' }) : null,
            h(Field, { label: 'Data do evento', req: true }, Input({ type: 'date', value: data, max: hojeISO(), onChange: function (e) { setData(e.target.value); } })),
            h(Field, { label: 'Observação', opt: true }, Input({ value: desc, placeholder: 'Aparece para o locatário', onChange: function (e) { setDesc(e.target.value); } }))),
          sim && (sim.itens || []).length ? h('div', null,
            sim.itens.map(function (it, i) { return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderTop: i ? '1px solid #f3f4f6' : 0, fontSize: 13 } }, h('span', { style: { color: '#374151' } }, it.descricao, it.clausula ? h('span', { style: { color: '#9ca3af' } }, ' (Cl. ' + String(it.clausula).replace(/^cl\.?\s*/i, '') + ')') : null), h('span', { style: Object.assign({ fontWeight: 600 }, TAB) }, fR(it.valor))); }),
            LinhaValor('Total a cobrar', fR(sim.total), true, ROXO_ESC)) : null,
          campos.indexOf('condutor') >= 0 ? Check(indicar, setIndicar, 'Indicar o locatário como condutor (Cl. 10.1 e 10.2)', 'A Central gera a indicação com o contrato, o Demonstrativo e o termo de vistoria como prova. Sem indicação, cabe a multa NIC (Cl. 10.7).') : null) : null,
        t && campos.indexOf('encerrar') < 0 ? h('div', { role: 'radiogroup', 'aria-label': 'Como cobrar', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          h('span', { style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, 'Como cobrar'),
          Radio(forma === 'proxima_parcela', 'Na parcela seguinte', ln.length === 1 ? 'Parcela ' + ln[0].numero + ' · vence ' + fDC(ln[0].vencimento) + ' passa de ' + fR(ln[0].valor_atual) + ' para ' + fR(ln[0].valor_novo) : 'na próxima parcela em aberto', function () { setForma('proxima_parcela'); }, null, t.codigo === 'multa_transito' ? h('span', { style: { fontSize: 11, fontWeight: 600, color: ROXO_ESC, background: '#f3e8fb', borderRadius: 6, padding: '0 6px' } }, 'padrão · Cl. 10.4') : null),
          Radio(forma === 'pix_avulso', 'PIX avulso agora', t.codigo === 'multa_transito' ? 'Multa de valor elevado pode ter prazo menor (Cl. 10.4)' : 'envia o PIX por WhatsApp hoje', function () { setForma('pix_avulso'); }),
          Radio(forma === 'dividir', 'Dividir em parcelas', 'Só por liberalidade da Tutts', function () { setForma('dividir'); },
            forma === 'dividir' ? h('select', { value: pn, onClick: function (e) { e.stopPropagation(); }, onChange: function (e) { setPn(+e.target.value); }, 'aria-label': 'Número de parcelas', className: INPUT_CLS, style: Object.assign({}, INPUT, { width: 82, height: 34 }) }, [2, 3, 4, 5, 6, 8, 10, 12].map(function (n) { return h('option', { key: n, value: n }, n + '×'); })) : null),
          forma === 'dividir' && ln.length > 1 ? h('div', { style: { fontSize: 12.5, color: '#374151', paddingLeft: 30 } }, ln.map(function (l) { return h('div', { key: l.numero, style: TAB }, 'Parcela ' + l.numero + ' · ' + fDS(l.vencimento, true) + ': ' + fR(l.valor_atual) + ' → ', h('b', { style: { color: ROXO_ESC } }, fR(l.valor_novo))); })) : null) : null,
        sim && sim.possivel === false ? Aviso('vermelho', 'Não dá para cobrar assim', sim.motivo) : null,
        t && campos.indexOf('encerrar') < 0 ? h(Field, { label: 'Documentos', opt: true },
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
            anexos.map(function (a, i) { return h('span', { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12.5 } }, ico('filetext', 13), a.nome, a.tam ? h('span', { style: { color: '#9ca3af' } }, '· ' + Math.max(1, Math.round(a.tam / 1024)) + ' KB') : null,
              h('button', { type: 'button', 'aria-label': 'Remover ' + a.nome, onClick: function () { setAnexos(function (x) { return x.filter(function (_, j) { return j !== i; }); }); }, style: { color: '#9ca3af', cursor: 'pointer' } }, ico('x', 12))); }),
            h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 8, border: '1px dashed #d8b4f0', color: ROXO_ESC, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' } },
              h('input', { type: 'file', multiple: true, accept: 'image/*,application/pdf', className: 'sr-only', onChange: function (e) { addAnexo(e.target.files); e.target.value = ''; } }), ico('plus', 13), t.codigo === 'multa_transito' || t.codigo === 'nic' ? 'Anexar auto de infração' : 'Anexar nota, orçamento ou fotos'))) : null,
        sim && sim.possivel !== false && sim.preview ? h('div', { style: { background: '#f9fafb', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 } },
          h('div', { style: { fontSize: 11.5, fontWeight: 700, color: '#6b7280', letterSpacing: '.05em', textTransform: 'uppercase' } }, 'Como o locatário vai ver no app'),
          h('div', { style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 10, justifyContent: 'space-between' } },
            h('div', { style: { minWidth: 0 } }, h('div', { style: { fontWeight: 600, fontSize: 13.5 } }, sim.preview.titulo), sim.preview.subtitulo ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, sim.preview.subtitulo) : null,
              sim.preview.clausulas ? h('div', { style: { fontSize: 12, color: ROXO_ESC, marginTop: 2 } }, 'Contrato · ' + sim.preview.clausulas + (anexos.length ? ' · ver documento' : '')) : null),
            h('div', { style: { textAlign: 'right', flex: 'none' } }, h('b', { style: TAB }, fR(sim.total)), sim.texto ? h('div', { style: { fontSize: 11.5, color: '#6b7280', maxWidth: 160 } }, sim.texto) : null)),
          h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'O locatário é avisado por WhatsApp e no app.')) : null));
  }

  // ───────── Encerrar ou suspender contrato ─────────
  var MOTIVOS_ENC = [
    ['devolucao_antecipada', 'Devolução antecipada pelo locatário', 'Encerramento antes do prazo · aplica Taxa de Cancelamento (Cl. 6.2 e 14.1)'],
    ['rescisao', 'Rescisão por descumprimento', 'Atraso > 7 dias, mau uso, fora da área, CNH vencida… (Cl. 14.2)'],
    ['furto_sem_culpa', 'Furto ou roubo sem culpa do locatário', 'Suspende as parcelas desde o evento. Recuperada: volta a cobrar e prorroga o prazo. Sem recuperação em 30 dias: encerra sem cobrança (Cl. 6.6.1)', true],
    ['congelamento', 'Congelamento', 'Por liberalidade, até 90 dias, não retroativo e fora do prazo do contrato (Cl. 12)', true],
    ['fim_prazo', 'Fim do prazo', 'Tutts Aluguel renova sozinho · Conquista vai para a opção de compra']
  ];
  var SUBMOT_RESC = [['atraso', 'Atraso > 7 dias'], ['mau_uso', 'Mau uso'], ['fora_area', 'Fora da área'], ['cnh', 'CNH suspensa/vencida'], ['outro', 'Outro']];
  function EncerrarModal(props) {
    var api = props.api, toast = props.toast, c = props.contrato || {}, cli = props.cliente || {}, mo = props.moto || {};
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _m = useState(c.dias_atraso > 7 ? 'rescisao' : 'devolucao_antecipada'), mot = _m[0], setMot = _m[1];
    var _sm = useState('atraso'), sub = _sm[0], setSub = _sm[1];
    var _t = useState(''), taxa = _t[0], setTaxa = _t[1];
    var _de = useState(hojeISO()), desde = _de[0], setDesde = _de[1];
    var _at = useState(iso(addDias(new Date(), 30))), ate = _at[0], setAte = _at[1];
    var _o = useState(''), obs = _o[0], setObs = _o[1];
    var _s = useState(false), salv = _s[0], setSalv = _s[1];
    useEffect(function () { api('/contratos/' + c.id + '/encerramento').then(function (r) { setD(r); setTaxa(r.taxa_sugerida != null ? String(r.taxa_sugerida).replace('.', ',') : ''); }).catch(function (e) { toast(e.message, 'error'); setD({}); }); }, [c.id]);
    var M = MOTIVOS_ENC.find(function (x) { return x[0] === mot; });
    var suspende = !!M[3];
    var comTaxa = mot === 'devolucao_antecipada' || mot === 'rescisao';
    var limite = d ? num(d.limite_meses_valor) : 0;
    var taxaN = comTaxa ? num(moedaParse(taxa)) : 0;
    var taxaInvalida = comTaxa && d && limite > 0 && taxaN > limite + 0.005;
    var debitos = (d && d.debitos) || [];
    var debTot = d ? num(d.debitos_total != null ? d.debitos_total : debitos.reduce(function (s, x) { return s + num(x.valor); }, 0)) : 0;
    var total = debTot + taxaN;
    var diasCong = Math.round((parseData(ate) - parseData(desde)) / 864e5);
    var congInvalido = mot === 'congelamento' && (!(diasCong > 0) || diasCong > 90 || parseData(desde) < parseData(hojeISO()));
    var periodo = c.periodicidade === 'mensal' ? '3 meses' : '13 semanas';
    var salvar = function () {
      setSalv(true);
      var req = suspende
        ? api('/contratos/' + c.id + '/suspender', { method: 'POST', body: { motivo: mot, desde: desde, ate: mot === 'congelamento' ? ate : null, observacao: obs.trim() || null } })
        : api('/contratos/' + c.id + '/encerrar', { method: 'POST', body: { motivo: mot, submotivo: mot === 'rescisao' ? sub : null, taxa_cancelamento: comTaxa ? taxaN : 0, observacao: obs.trim() || null } });
      req.then(function (r) {
        toast(suspende ? (mot === 'congelamento' ? 'Contrato congelado' : 'Parcelas suspensas') : 'Contrato encerrado' + (r && r.cobranca ? ' · cobrança de ' + fR(r.cobranca.valor) + ' enviada' : ''), 'success');
        if (r && r.cobranca && r.cobranca.pix_copia_cola) copiar(r.cobranca.pix_copia_cola, toast);
        props.onSalvo && props.onSalvo(r);
      }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalv(false); });
    };
    var botao = suspende ? (mot === 'congelamento' ? 'Congelar contrato' : 'Suspender parcelas') : mot === 'fim_prazo' ? 'Encerrar no fim do prazo' + (total > 0 ? ' e cobrar ' + fR(total) : '') : (mot === 'rescisao' ? 'Rescindir' : 'Encerrar') + (total > 0 ? ' e cobrar ' + fR(total) : '');
    return h(Modal, { titulo: 'Encerrar ou suspender contrato', onClose: props.onClose, largura: 760,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Cancelar' }), Btn({ key: 's', variant: suspende ? 'pri' : 'perigoCheio', disabled: !d || salv || taxaInvalida || congInvalido || (mot === 'rescisao' && sub === 'outro' && obs.trim().length < 3), onClick: salvar, children: salv ? 'Salvando...' : botao })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px' } },
          h('div', { style: { width: 36, height: 36, borderRadius: 99, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12.5, flex: 'none' } }, iniciais(cli.nome)),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontWeight: 700, fontSize: 13.5 } }, cli.nome), h('div', { style: { fontSize: 12, color: '#6b7280' } }, [c.numero, c.plano_label ? c.plano_label + (c.prazo_qtd ? ' ' + c.prazo_qtd + (c.periodicidade === 'mensal' ? ' meses' : ' semanas') : '') : null, mo.placa, props.k ? fN(props.k.pagas) + ' de ' + fN(props.k.total_parcelas) + ' parcelas' : null].filter(Boolean).join(' · '))),
          pillSit(c)),
        h('div', { role: 'radiogroup', 'aria-label': 'Motivo', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          h('span', { style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, 'Motivo'),
          MOTIVOS_ENC.map(function (x) { return h(React.Fragment, { key: x[0] }, Radio(mot === x[0], x[1], x[2], function () { setMot(x[0]); }, null, x[3] ? h('span', { style: { fontSize: 11, fontWeight: 600, color: '#1e40af', background: '#eff6ff', borderRadius: 6, padding: '0 6px' } }, 'suspende') : null)); })),
        mot === 'rescisao' ? h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } }, Chips(SUBMOT_RESC.map(function (s) { return { id: s[0], t: s[1] }; }), sub, setSub)) : null,
        suspende ? h('div', { className: 'grid grid-cols-1 sm:grid-cols-2', style: { gap: 12 } },
          h(Field, { label: mot === 'congelamento' ? 'Congelar a partir de' : 'Data do furto/roubo', req: true, hint: mot === 'congelamento' ? 'Não retroativo' : 'As parcelas ficam suspensas desde esta data' }, Input({ type: 'date', value: desde, min: mot === 'congelamento' ? hojeISO() : null, max: mot === 'congelamento' ? null : hojeISO(), onChange: function (e) { setDesde(e.target.value); } })),
          mot === 'congelamento' ? h(Field, { label: 'Congelado até', req: true, hint: diasCong > 0 ? diasCong + ' dias' + (diasCong > 90 ? ' · máximo 90' : '') : 'Escolha uma data depois do início', hintCor: diasCong > 90 ? '#991b1b' : null }, Input({ type: 'date', value: ate, min: desde, onChange: function (e) { setAte(e.target.value); } }))
            : Aviso('azul', null, 'Registre o B.O. como ocorrência. Sem B.O. cabe a tarifa de omissão (Cl. 5.10 p). Se a moto não for recuperada em 30 dias, encerre como “furto não recuperado”, sem cobrança adicional.')) : null,
        !d ? Spinner('Calculando encerramento...') : suspende ? null : h(React.Fragment, null,
          comTaxa ? h('div', { style: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 } },
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } }, h('b', { style: { fontSize: 14 } }, 'Taxa de Cancelamento'), TagCl('5.10 a')),
            h('div', { style: Object.assign({ fontSize: 12.5, color: '#374151', lineHeight: 1.6 }, TAB) }, fN(d.remanescentes) + ' parcelas remanescentes = ' + fR(d.valor_remanescente) + ' · 20% = ' + fR(d.taxa_20) + ' → limitada a ' + periodo + ' de locação = ', h('b', null, fR(d.limite_meses_valor))),
            h(Field, { label: 'Valor a cobrar (até ' + fR(limite) + ')', hint: taxaInvalida ? 'Não pode passar do limite' : 'Pode reduzir; não pode passar do limite', hintCor: taxaInvalida ? '#991b1b' : null }, Input({ value: taxa, inputMode: 'decimal', onChange: function (e) { setTaxa(e.target.value); }, style: { maxWidth: 200 } }))) : null,
          h('div', { style: { display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 } }, h('b', null, 'Caução'), h('span', { style: { color: '#6b7280' } }, num(d.caucao) > 0 ? fR(d.caucao) + ' · os débitos são abatidos da caução (Cl. 15.2)' : 'Isento')),
          h('div', null,
            h('div', { style: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 } }, 'Débitos pendentes'),
            debitos.length === 0 && !taxaN ? h('div', { style: { fontSize: 13, color: '#166534' } }, 'Nenhum débito em aberto.') : null,
            debitos.map(function (x, i) { return h('div', { key: i, style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 } }, h('span', { style: { color: '#374151' } }, x.descricao), h('span', { style: Object.assign({ fontWeight: 600 }, TAB) }, fR(x.valor))); }),
            taxaN > 0 ? LinhaValor('Taxa de Cancelamento', fR(taxaN)) : null,
            LinhaValor('Total a cobrar', fR(total), true, total > 0 ? '#991b1b' : null)),
          c.plano === 'conquista' && mot !== 'fim_prazo' ? Aviso('ambar', null, 'Plano Conquista: o encerramento antes do prazo extingue a opção de compra. O locatário não adquire a moto e os valores pagos não são restituídos (Cl. 6.3 e Anexo II, 2.5).') : null,
          mot !== 'fim_prazo' ? h('div', { style: { fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 } }, 'A moto é bloqueada (só com ela parada) e o recolhimento é agendado. O extrato final sai em até 45 dias úteis (Cl. 15.1). Sem pagamento em 7 dias da comunicação, o débito pode ir a protesto e negativação (Cl. 15.5).') : null),
        h(Field, { label: 'Observação', opt: !(mot === 'rescisao' && sub === 'outro'), req: mot === 'rescisao' && sub === 'outro', hint: 'Fica no histórico do contrato.' }, TextArea({ rows: 2, value: obs, onChange: function (e) { setObs(e.target.value); } })),
        h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'O locatário recebe o extrato no app e por WhatsApp.')));
  }

  function ReativarModal(props) {
    var c = props.contrato || {}, sp = c.suspensao || {};
    var _d = useState(hojeISO()), data = _d[0], setData = _d[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    return h(Modal, { titulo: 'Reativar contrato', onClose: props.onClose, largura: 480,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }), Btn({ key: 'o', variant: 'pri', icon: 'check', disabled: s || !data, onClick: function () { setS(true); Promise.resolve(props.onConfirm({ data: data })).catch(function () {}).then(function () { setS(false); }); }, children: s ? 'Salvando...' : 'Reativar contrato' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5, color: '#374151' } },
        h('div', null, sp.motivo === 'congelamento' ? 'Congelado' : 'Suspenso por furto/roubo sem culpa', sp.desde ? ' desde ' + fD(sp.desde) : '', sp.ate ? ' até ' + fD(sp.ate) : '', '.'),
        h(Field, { label: sp.motivo === 'congelamento' ? 'Volta a cobrar em' : 'Moto recuperada em', req: true }, Input({ type: 'date', value: data, min: sp.desde ? String(sp.desde).slice(0, 10) : null, onChange: function (e) { setData(e.target.value); } })),
        Aviso('azul', null, 'As parcelas suspensas voltam a vencer a partir dessa data e o prazo do contrato é prorrogado pelo período parado.')));
  }

  function ReajusteModal(props) {
    var c = props.contrato || {};
    var _p = useState(c.reajuste_sugerido_pct != null ? String(c.reajuste_sugerido_pct).replace('.', ',') : ''), pct = _p[0], setPct = _p[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    var pn = moedaParse(pct), vp = num(c.valor_parcela || c.valor_semanal);
    return h(Modal, { titulo: 'Reajuste anual pelo IPCA', onClose: props.onClose, largura: 480,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }), Btn({ key: 'o', variant: 'pri', icon: 'check', disabled: s || pn == null, onClick: function () { setS(true); Promise.resolve(props.onConfirm({ pct: pn })).catch(function () {}).then(function () { setS(false); }); }, children: s ? 'Aplicando...' : 'Aplicar reajuste' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13.5, color: '#374151' } },
        h('div', null, 'Contratos com mais de 12 meses são reajustados pelo IPCA acumulado a cada 12 meses (Cl. 5.7).' + (c.reajuste_proximo ? ' Data do reajuste: ' + fD(c.reajuste_proximo) + '.' : '')),
        h(Field, { label: 'IPCA acumulado (%)', req: true, hint: c.reajuste_sugerido_pct != null ? 'Sugerido pelos índices lançados: ' + pctTxt(c.reajuste_sugerido_pct, 2) + '%' : 'Lance os índices em Configurações › Índices IPCA' }, Input({ value: pct, inputMode: 'decimal', onChange: function (e) { setPct(e.target.value); }, style: { maxWidth: 160 } })),
        pn != null ? LinhaValor('Parcela passa de ' + fR(vp) + ' para', fR(Math.round(vp * (1 + pn / 100) * 100) / 100), true, ROXO_ESC) : null,
        h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Vale para as parcelas que vencem a partir da data do reajuste. O locatário é avisado no app e por WhatsApp.')));
  }

  // ───────── Demonstrativo (resumo do contrato) ─────────
  function DemonstrativoCard(props) {
    var c = props.contrato || {}, cli = props.cliente || {};
    var per = c.periodicidade === 'mensal' ? 'mês' : 'semana';
    var formas = (c.formas_pagamento || []).map(function (f) { return { pix: 'Pix', boleto: 'Boleto', cartao: 'Cartão recorrente' }[f] || f; });
    if (c.autoriza_desconto_repasse) formas.push('desconto em repasses');
    var linhas = [
      ['Plano', c.plano_label || (c.plano === 'aluguel' ? 'Tutts Aluguel' : 'Plano Conquista')],
      ['Prazo', c.prazo_qtd ? c.prazo_qtd + (c.periodicidade === 'mensal' ? ' meses' : ' semanas') : (c.semanas ? c.semanas + ' semanas' : '—')],
      ['Início / término', (c.data_inicio ? fD(c.data_inicio) : '—') + ' → ' + (c.termino ? fD(c.termino) : '—')],
      ['Parcela', fR(c.valor_parcela != null ? c.valor_parcela : c.valor_semanal) + ' / ' + per],
      ['Vencimento', c.vencimento_label || (cli.dia_vencimento ? DIA_PLURAL[cli.dia_vencimento] : '—')],
      ['Caução', num(c.caucao_valor) > 0 ? fR(c.caucao_valor) : 'Isento'],
      ['Manutenção', c.manutencao === 'locatario' ? 'Por conta do locatário' : c.manutencao === 'inclusa' ? 'Inclusa (Base Tutts)' : '—'],
      ['Área de circulação', c.area_raio_km ? c.area_raio_km + ' km de ' + (c.area_municipio || '—') : '—'],
      ['Base', c.base_retirada || '—'],
      ['Pagamento', formas.length ? formas.join(', ') : '—'],
      ['Atraso', c.encargos && c.encargos.modelo === 'legado' ? pctTxt(c.encargos.juros_dia_pct, 2) + '% ao dia (modelo antigo)' : c.encargos ? 'multa ' + pctTxt(c.encargos.multa_pct, 2) + '% + juros ' + pctTxt(c.encargos.juros_mes_pct, 2) + '% a.m. + IPCA' : '—'],
      c.plano === 'conquista' ? ['Opção de compra', c.valor_opcao_compra != null ? fR(c.valor_opcao_compra) + ' + IPCA' : '—'] : null,
      c.reajuste_proximo ? ['Próximo reajuste', fD(c.reajuste_proximo) + ' · IPCA'] : null
    ].filter(Boolean);
    return h(Card, { pad: false }, CardHead('Demonstrativo', c.importado ? Pill('Importado', 'cinza', true) : null, 'quadro-resumo'),
      h('div', { style: { padding: '4px 16px 12px' } }, linhas.map(function (r, i) { return h('div', { key: r[0], style: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderTop: i ? '1px solid #f3f4f6' : 0, fontSize: 12.5 } }, h('span', { style: { color: '#6b7280' } }, r[0]), h('span', { style: Object.assign({ fontWeight: 600, textAlign: 'right' }, TAB) }, r[1])); })));
  }

  // ───────── Opção de compra (Plano Conquista) ─────────
  var ETAPAS_OPCAO = [
    ['notificado_em', 'Notificação', 'até 30 dias antes do fim'], ['manifestado_em', 'Manifestação do locatário', 'em até 15 dias da notificação'], ['pago_em', 'Pagamento do valor de exercício', 'valor + IPCA'],
    ['vistoria_final_em', 'Vistoria final na Base', 'estado da moto e danos pendentes'], ['atpv_em', 'ATPV-e assinada', 'em até 15 dias úteis do pagamento'], ['transferencia_em', 'Transferência no DETRAN', 'locatário conclui em 30 dias']
  ];
  function OpcaoCompraCard(props) {
    var api = props.api, toast = props.toast, c = props.contrato || {}, op = c.opcao || {}, k = props.k || {};
    var _b = useState(null), ocup = _b[0], setOcup = _b[1];
    var _x = useState(false), aberto = _x[0], setAberto = _x[1];
    var cond = op.condicoes || {};
    var post = function (acao, msg, conf) {
      if (conf && !window.confirm(conf)) return;
      setOcup(acao);
      api('/contratos/' + c.id + '/opcao/' + acao, { method: 'POST', body: {} }).then(function (r) {
        toast(msg + (r && r.valor ? ' · ' + fR(r.valor) : ''), 'success');
        if (r && r.pix_copia_cola) copiar(r.pix_copia_cola, toast);
        props.aoMudar && props.aoMudar();
      }).catch(function (e) { toast(e.message, 'error'); }).then(function () { setOcup(null); });
    };
    var iniciada = !!(op.notificado_em || op.manifestado_em);
    var extinta = op.status === 'extinta';
    var feitas = ETAPAS_OPCAO.filter(function (e) { return !!op[e[0]]; }).length;
    var atual = ETAPAS_OPCAO.findIndex(function (e) { return !op[e[0]]; });
    var condL = [
      [cond.prazo_cumprido, 'Prazo do Plano Conquista cumprido integralmente', c.prazo_qtd ? (k.pagas != null ? fN(k.pagas) : '—') + ' de ' + c.prazo_qtd + (c.periodicidade === 'mensal' ? ' meses' : ' semanas') : null],
      [cond.parcelas_pagas, 'Todas as parcelas da locação pagas', k.total_parcelas ? fN(k.pagas) + ' de ' + fN(k.total_parcelas) : null],
      [cond.sem_debitos, 'Sem débitos de multas, taxas, manutenções ou danos', k.atrasado_valor != null ? fR(k.atrasado_valor) + ' em aberto' : null],
      [!!op.manifestado_em, 'Locatário manifestou interesse no prazo', op.manifestado_em ? fD(op.manifestado_em) : 'aguardando'],
      [!!op.pago_em, 'Valor de exercício pago', op.pago_em ? fD(op.pago_em) : op.pix_copia_cola ? 'aguardando PIX' : '—']
    ];
    var resumo = extinta ? 'Opção extinta · encerramento antes do prazo (Cl. 6.3)' : op.transferencia_em ? 'Transferência concluída em ' + fD(op.transferencia_em) : iniciada ? feitas + ' de 6 etapas · ' + (op.status_label || 'em andamento') : 'Libera no fim do prazo, com tudo pago · notificação até 30 dias antes' + (c.termino ? ' de ' + fD(c.termino) : '');
    var mostrar = aberto || iniciada;
    return h(Card, { pad: false },
      h('div', { style: { padding: '12px 16px', borderBottom: mostrar ? '1px solid #f3f4f6' : 0, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' } },
        h('span', { style: { width: 30, height: 30, borderRadius: 8, background: '#f3e8fb', color: ROXO_ESC, display: 'grid', placeItems: 'center', flex: 'none' } }, ico('key', 15)),
        h('div', { style: { marginRight: 'auto', minWidth: 0 } }, h('h2', { style: { margin: 0, fontSize: 15, fontWeight: 700 } }, 'Opção de compra · Anexo II'), h('div', { style: { fontSize: 12.5, color: extinta ? '#991b1b' : '#6b7280' } }, resumo)),
        op.valor_corrigido != null || c.valor_opcao_compra != null ? h('div', { style: { textAlign: 'right' } }, h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, 'Valor de exercício'), h('b', { style: TAB }, fR(op.valor_corrigido != null ? op.valor_corrigido : c.valor_opcao_compra)), op.valor_corrigido == null ? h('span', { style: { fontSize: 11.5, color: '#6b7280' } }, ' + IPCA') : null) : null,
        iniciada ? null : Btn({ small: true, variant: 'link', onClick: function () { setAberto(!aberto); }, children: aberto ? 'Fechar' : 'Ver etapas' })),
      mostrar && !extinta ? h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]', style: { padding: 16 } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          h('div', { className: 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6', style: { gap: 8 } }, ETAPAS_OPCAO.map(function (e, i) {
            var feito = !!op[e[0]], cur = i === atual;
            return h('div', { key: e[0], style: { border: '1px solid ' + (cur ? ROXO : feito ? '#bbf7d0' : '#e5e7eb'), background: cur ? '#faf7fd' : feito ? '#f0fdf4' : '#fff', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 4 } },
              h('span', { style: { width: 22, height: 22, borderRadius: 99, display: 'grid', placeItems: 'center', fontSize: 11.5, fontWeight: 700, background: feito ? '#16a34a' : cur ? ROXO : '#f3f4f6', color: feito || cur ? '#fff' : '#6b7280' } }, feito ? ico('check', 12) : i + 1),
              h('b', { style: { fontSize: 12.5, lineHeight: 1.3 } }, e[1]), h('span', { style: { fontSize: 11.5, color: '#6b7280' } }, e[2]),
              h('span', { style: { fontSize: 12, fontWeight: 600, color: feito ? '#166534' : cur ? ROXO_ESC : '#9ca3af' } }, feito ? fD(op[e[0]]) : cur && e[0] === 'pago_em' && op.pix_copia_cola ? 'aguardando PIX' : '—'));
          })),
          h('div', null,
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 } }, h('b', { style: { fontSize: 13.5 } }, 'Condições para exercer a opção'), TagCl('Anexo II · 2.1')),
            condL.map(function (x, i) {
              return h('div', { key: i, style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 } },
                h('span', { style: { width: 18, height: 18, borderRadius: 99, display: 'grid', placeItems: 'center', background: x[0] ? '#16a34a' : '#f3f4f6', color: x[0] ? '#fff' : '#9ca3af', flex: 'none', marginTop: 1 } }, x[0] ? ico('check', 11) : ico('clock', 11)),
                h('div', { style: { flex: 1 } }, h('div', { style: { fontWeight: 600 } }, x[1]), x[2] ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, x[2]) : null));
            }),
            h('div', { style: { fontSize: 12, color: '#6b7280', marginTop: 6 } }, 'Havendo qualquer pendência, a opção não pode ser exercida até a regularização (Anexo II, 2.2). Custos de vistoria, documentos, transferência e despachante por conta do locatário.'))),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          op.pix_copia_cola && !op.pago_em ? h('div', { style: { background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: 12, padding: '10px 12px', fontSize: 12.5 } }, h('b', null, 'PIX de ' + fR(op.valor_corrigido) + ' enviado'), h('div', { style: { color: '#6b7280' } }, 'aguardando pagamento'), Btn({ small: true, variant: 'link', icon: 'copy', onClick: function () { copiar(op.pix_copia_cola, toast); }, children: 'Copiar PIX' })) : null,
          Btn({ disabled: !!ocup || !!op.manifestado_em, onClick: function () { post('notificar', 'Notificação enviada ao locatário'); }, style: { width: '100%' }, icon: 'message', children: op.notificado_em ? 'Reenviar notificação' : 'Notificar locatário' }),
          !op.manifestado_em ? Btn({ disabled: !!ocup || !op.notificado_em, onClick: function () { post('manifestar', 'Manifestação registrada', 'Registrar que o locatário manifestou interesse em comprar a moto?'); }, style: { width: '100%' }, icon: 'check', children: 'Registrar manifestação' }) : null,
          Btn({ variant: op.manifestado_em && !op.pago_em ? 'pri' : 'sec', disabled: !!ocup || !op.manifestado_em || !!op.pago_em, onClick: function () { post('gerar-pix', 'PIX do valor de exercício gerado'); }, style: { width: '100%' }, icon: 'card', children: 'Gerar PIX do valor de exercício' }),
          Btn({ disabled: !!ocup || !op.pago_em || !!op.atpv_em, onClick: function () { post('atpv', 'ATPV-e registrada', 'Confirmar que a ATPV-e foi assinada pela Tutts?'); }, style: { width: '100%' }, icon: 'pencil', children: 'Registrar ATPV-e assinada' }),
          Btn({ variant: op.atpv_em && !op.transferencia_em ? 'pri' : 'sec', disabled: !!ocup || !op.atpv_em || !!op.transferencia_em, onClick: function () { post('transferencia', 'Transferência concluída', 'Confirmar que a transferência no DETRAN foi concluída?'); }, style: { width: '100%' }, icon: 'key', children: 'Concluir transferência' }),
          h('div', { style: { fontSize: 11.5, color: '#6b7280', lineHeight: 1.45 } }, 'Se o locatário não concluir a transferência em 30 dias, pode ser cobrada taxa igual à parcela pelo período (Anexo II, 4.3), ou ele deixa a moto na Base sem custo.'))) : null);
  }

  // ───────── Vistoria · Termo Anexo IV (equipe) ─────────
  // ───────── LOCACAO_FLUXO_V1: etapas até liberar a moto (criado → vistoria de entrega → assinatura → liberada) ─────────
  function svgMini(d, sw) { return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: sw || 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, d.map(function (x, i) { return h(x[0], Object.assign({ key: i }, x[1])); })); }
  var MINI_OK = [['path', { d: 'm5 12 5 5 9-10' }]];
  var MINI_LOCK = [['rect', { x: 4, y: 11, width: 16, height: 10, rx: 2 }], ['path', { d: 'M8 11V7a4 4 0 0 1 8 0v4' }]];
  function EtapasLiberacao(props) {
    var c = props.c || {};
    var lista = c.etapas && c.etapas.length ? c.etapas : [
      { id: 'criado', label: 'Contrato criado', em: c.criado_em, estado: 'ok' },
      { id: 'vistoria', label: 'Vistoria de entrega na Base', estado: c.etapa === 'vistoria' ? 'atual' : 'ok' },
      { id: 'assinatura', label: 'Assinatura', estado: c.etapa === 'vistoria' ? 'bloq' : 'atual' },
      { id: 'liberada', label: 'Moto liberada', estado: 'bloq' }];
    var DESC = {
      criado: function (st) { return st.em ? fDHc(st.em) + (st.por ? ' · por ' + String(st.por).split(' ')[0] : '') : 'Contrato gerado na Central.'; },
      vistoria: function (st) { return st.estado === 'atual' ? 'Anexo IV: 6 fotos, km, combustível, checklist e avarias, com o locatário presente.' : st.dispensada ? 'Não exigida para este contrato.' : (st.em ? 'Registrada em ' + fDHc(st.em) + '. O PDF leva o Anexo IV com as fotos.' : 'Registrada.'); },
      assinatura: function (st) { return st.estado === 'bloq' ? 'Depois da vistoria você confere onde vão as assinaturas e envia. O PDF já leva o Anexo IV com as fotos.' : st.estado === 'atual' ? (c.autentique_doc_id ? 'Enviada ao Autentique. Acompanhe abaixo quem já assinou.' : 'Contrato pronto. Confira onde vão as assinaturas e envie ao Autentique.') : 'Assinado em ' + fDC(st.em) + '.'; }, // AUTENTIQUE_CONFERIR_V1
      liberada: function () { return 'Contrato ativo, parcelas geradas.'; }
    };
    var emVist = c.etapa === 'vistoria';
    return h(Card, { style: { display: 'flex', flexDirection: 'column', gap: 12 }, label: 'Etapas até liberar a moto' },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
        h('div', { style: { fontWeight: 700, fontSize: 14, flex: 1 } }, 'Até liberar a moto'),
        emVist ? Btn({ small: true, variant: 'perigo', disabled: !!props.ocupado, onClick: props.onCancelar, children: 'Cancelar contrato' }) : null),
      h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4', style: { gap: 10 } },
        lista.map(function (st, i) {
          var ok = st.estado === 'ok', atual = st.estado === 'atual';
          return h('div', { key: st.id, style: { borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, border: atual ? '2px solid ' + ROXO : '1px solid ' + (ok ? '#bbf7d0' : '#e5e7eb'), background: atual ? '#faf7fd' : ok ? '#f0fdf4' : '#fff' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { width: 26, height: 26, borderRadius: 99, flex: 'none', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, color: '#fff', background: ok ? '#22c55e' : atual ? ROXO : '#d1d5db' } }, ok ? svgMini(MINI_OK, 2.6) : atual ? String(i + 1) : svgMini(MINI_LOCK)),
              h('b', { style: { color: ok ? '#166534' : atual ? ROXO_ESC : '#9ca3af', fontSize: 13.5 } }, st.label)),
            h('div', { style: { fontSize: 12, color: '#6b7280', lineHeight: 1.45 } }, (DESC[st.id] || function () { return ''; })(st)),
            st.id === 'vistoria' && atual ? Btn({ variant: 'pri', icon: 'camera', disabled: !!props.ocupado, onClick: props.onVistoria, style: { marginTop: 4, width: '100%' }, children: 'Registrar vistoria de entrega' }) : null,
            st.id === 'assinatura' && atual && !c.autentique_doc_id && props.onPosicionar ? Btn({ variant: 'pri', icon: 'pencil', disabled: !!props.ocupado, onClick: props.onPosicionar, style: { marginTop: 4, width: '100%' }, children: 'Posicionar e enviar' }) : null); // AUTENTIQUE_CONFERIR_V1
        })),
      emVist ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'O locatário vê no app "Próximo passo: vistoria de entrega na Base" com o endereço. Se a vistoria apontar avaria pré-existente, ela entra no Anexo IV e fica registrada para a devolução.') : null);
  }

  // LOCACAO_FLUXO_V1: depois da vistoria de entrega o contrato sai para assinatura — avisa o resultado
  function toastVistoriaAssinatura(toast, r) {
    var a = r && r.assinatura;
    if (!a) return toast('Vistoria registrada · Termo Anexo IV pronto', 'success');
    if (a.conferir) return toast('Vistoria registrada · confira a posição das assinaturas e envie ao Autentique', 'success'); // AUTENTIQUE_CONFERIR_V1
    if (a.enviado) return toast('Vistoria registrada · contrato com o Anexo IV enviado para assinatura' + (a.whatsapp && a.whatsapp.enviado ? ' · locatário avisado no WhatsApp' : ''), 'success');
    toast('Vistoria registrada, mas a assinatura não saiu' + (a.motivo ? ': ' + a.motivo : '') + '. Use "Enviar ao Autentique" no contrato.', 'error');
  }

  function VistoriaAnexoIVModal(props) {
    var api = props.api, toast = props.toast, mo = props.moto || {}, ct = props.contrato;
    var _cfg = useState(null), cfg = _cfg[0], setCfg = _cfg[1];
    useEffect(function () { api('/config').then(setCfg).catch(function () { setCfg({}); }); }, []);
    var itens = itensChecklist(cfg);
    var _t = useState(props.tipo || (ct ? 'devolucao' : 'retirada')), tipo = _t[0], setTipo = _t[1];
    var _k = useState(mo.hodometro != null ? String(mo.hodometro) : ''), km = _k[0], setKm = _k[1];
    var _c = useState(null), comb = _c[0], setComb = _c[1];
    var _ck = useState({}), ck = _ck[0], setCk = _ck[1];
    var _av = useState([]), avarias = _av[0], setAvarias = _av[1];
    var _sa = useState(false), semAv = _sa[0], setSemAv = _sa[1];
    var _f = useState({}), fotos = _f[0], setFotos = _f[1];
    var _dc = useState(false), decl = _dc[0], setDecl = _dc[1];
    var _s = useState(false), salv = _s[0], setSalv = _s[1];
    var pegar = function (pos, file) { if (!file) return; var quando = new Date().toISOString(); lerArquivo(file, 1280, 0.8).then(function (u) { setFotos(function (f) { var x = Object.assign({}, f); x[pos] = { foto: u, capturada_em: quando }; return x; }); }).catch(function (e) { toast(e.message, 'error'); }); };
    var setItem = function (i, campo, v) { setCk(function (x) { var n = Object.assign({}, x); n[i] = Object.assign({ situacao: null, obs: '' }, n[i] || {}); n[i][campo] = v; return n; }); };
    var nOk = itens.filter(function (_, i) { return ck[i] && ck[i].situacao === 'ok'; }).length;
    var nAv = itens.filter(function (_, i) { return ck[i] && ck[i].situacao === 'avaria'; }).length;
    var obrig = POS_V3.filter(function (p) { return p[2]; });
    var faltamFotos = obrig.filter(function (p) { return !fotos[p[0]]; });
    var avOk = avarias.filter(function (a) { return String(a.descricao || '').trim(); });
    var precisaAv = mo.condicao !== '0km';
    var checklistOk = nOk + nAv === itens.length && itens.every(function (_, i) { return !(ck[i] && ck[i].situacao === 'avaria') || String(ck[i].obs || '').trim().length > 1; });
    var faltas = [];
    if (faltamFotos.length) faltas.push(faltamFotos.length === 1 ? '1 foto obrigatória (' + faltamFotos[0][1].split('.')[0] + ')' : faltamFotos.length + ' fotos obrigatórias (' + faltamFotos.map(function (p) { return p[1].split('.')[0]; }).join(', ') + ')');
    if (km === '') faltas.push('quilometragem');
    if (!comb) faltas.push('combustível');
    if (!checklistOk) faltas.push('checklist completo (avaria pede observação)');
    if (precisaAv && !semAv && !avOk.length) faltas.push('avarias pré-existentes ou “não foram identificadas”');
    if (!decl) faltas.push('declaração do locatário');
    var salvar = function () {
      setSalv(true);
      var checklist = itens.map(function (it, i) { var x = ck[i] || {}; return { item: it, situacao: x.situacao || 'ok', obs: String(x.obs || '').trim() || null }; });
      var temAvaria = nAv > 0 || avOk.length > 0;
      var resumoObs = [checklist.filter(function (x) { return x.situacao === 'avaria'; }).map(function (x) { return x.item + ': ' + (x.obs || 'avaria'); }).join('; '), avOk.map(function (a) { return (a.local ? a.local + ' · ' : '') + a.descricao; }).join('; ')].filter(Boolean).join(' · ');
      api('/vistorias', { method: 'POST', body: { moto_id: mo.id, tipo: tipo, km: parseInt(soDig(km), 10), combustivel: comb, checklist: checklist,
        avarias: semAv ? [] : avOk.map(function (a) { return { local: a.local || null, descricao: a.descricao.trim(), foto: a.foto || null }; }), sem_avarias: !!semAv && !avOk.length, declaracao_aceita: !!decl,
        avaria: temAvaria, observacoes: resumoObs || null,
        fotos: POS_V3.filter(function (p) { return fotos[p[0]]; }).map(function (p) { return { posicao: p[0], foto: fotos[p[0]].foto, capturada_em: fotos[p[0]].capturada_em }; }) } })
        .then(function (r) { toastVistoriaAssinatura(toast, r); props.aoSalvar && props.aoSalvar(r); }) // LOCACAO_FLUXO_V1
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setSalv(false); }); // AUTENTIQUE_CONFERIR_V1: o catch estava preso no comentário
    };
    var secao = function (n, titulo, direita, corpo, sub) {
      return h('section', { style: { border: '1px solid #e5e7eb', borderRadius: 12 } },
        h('div', { style: { padding: '10px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }, h('b', { style: { fontSize: 14 } }, n + '. ' + titulo), sub ? h('span', { style: { fontSize: 12, color: '#6b7280' } }, sub) : null, h('div', { style: { flex: 1 } }), direita || null),
        h('div', { style: { padding: 14 } }, corpo));
    };
    var tiposV = [['retirada', 'Entrega'], ['devolucao', 'Devolução'], ['periodica', 'Mensal na Base'], ['revisao', 'Revisão']];
    return h(Modal, { titulo: 'Termo de vistoria · Anexo IV', onClose: props.onClose, largura: 1040,
      rodape: [h('span', { key: 'f', style: { fontSize: 12.5, color: faltas.length ? '#92400e' : '#166534', marginRight: 'auto', alignSelf: 'center', maxWidth: 560 } }, faltas.length ? 'Falta: ' + faltas.join(' · ') + '.' : 'Tudo certo para gerar o termo.'),
        Btn({ key: 'c', onClick: props.onClose, children: 'Cancelar' }), Btn({ key: 's', variant: 'pri', icon: 'check', disabled: faltas.length > 0 || salv, onClick: salvar, children: salv ? 'Registrando...' : 'Registrar vistoria e gerar termo' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
          h('div', { style: { fontSize: 13, color: '#6b7280', flex: 1, minWidth: 220 } }, [ct && ct.numero ? 'Contrato ' + ct.numero : null, ct && ct.cliente_nome, ct && ct.plano_label].filter(Boolean).join(' · ') || 'Sem contrato ativo'),
          Segmented(tiposV, tipo, setTipo, 'Tipo de vistoria')),
        secao(1, 'Identificação da moto e da vistoria', null,
          h('div', { className: 'grid grid-cols-1 md:grid-cols-3', style: { gap: 12 } },
            h('div', null, h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Marca / modelo / placa'), h('div', { style: { fontWeight: 600, fontSize: 13.5 } }, [mo.modelo, mo.ano, mo.cor].filter(Boolean).join(' '), ' · ', h('span', { style: { fontFamily: MONO } }, mo.placa))),
            h('div', null, h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Chassi / motor'), h('div', { style: { fontFamily: MONO, fontSize: 12.5 } }, (mo.chassi || '—') + ' / ' + (mo.numero_motor || '—'))),
            h('div', null, h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Condição'), h('div', { style: { fontWeight: 600, fontSize: 13.5 } }, (CONDICAO.find(function (x) { return x[0] === mo.condicao; }) || [0, 'não informada'])[1])),
            h(Field, { label: 'Quilometragem', req: true }, Input({ value: km, inputMode: 'numeric', onChange: function (e) { setKm(soDig(e.target.value)); }, placeholder: 'km' })),
            h(Field, { label: 'Combustível', req: true, style: { gridColumn: 'span 2' } }, h('div', { style: { overflowX: 'auto' } }, Segmented(COMBUST, comb, setComb, 'Combustível'))))),
        secao(2, 'Checklist de itens', h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, nOk + ' OK · ' + nAv + ' com avaria' + (nOk + nAv < itens.length ? ' · ' + (itens.length - nOk - nAv) + ' sem marcar' : '')),
          h('div', null,
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 6 } }, Btn({ small: true, variant: 'link', onClick: function () { var n = {}; itens.forEach(function (_, i) { n[i] = Object.assign({ obs: '' }, ck[i] || {}, { situacao: (ck[i] && ck[i].situacao) || 'ok' }); }); setCk(n); }, children: 'Marcar os demais como OK' })),
            itens.map(function (it, i) {
              var x = ck[i] || {};
              return h('div', { key: i, style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '7px 0', borderTop: i ? '1px solid #f3f4f6' : 0 } },
                h('span', { style: { fontSize: 13, fontWeight: 500, flex: '1 1 240px', minWidth: 0 } }, it),
                h('div', { style: { flex: 'none' } }, Segmented([['ok', 'OK'], ['avaria', 'Avaria']], x.situacao || null, function (v) { setItem(i, 'situacao', v); }, it)),
                h('div', { style: { flex: '1 1 240px', minWidth: 0 } }, Input({ value: x.obs || '', placeholder: x.situacao === 'avaria' ? 'Descreva a avaria (obrigatório)' : 'Observações', 'aria-label': 'Observações · ' + it, onChange: function (e) { setItem(i, 'obs', e.target.value); }, style: Object.assign({ height: 34 }, x.situacao === 'avaria' && !String(x.obs || '').trim() ? { borderColor: '#fde68a' } : {}) })));
            }))),
        secao(3, 'Avarias, marcas de uso e condições pré-existentes', null,
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            h('div', { style: { fontSize: 12.5, color: '#6b7280' } }, precisaAv ? 'Obrigatório para moto seminova ou usada. O locatário não responde pelo que está registrado aqui (Cl. 1.2.2).' : 'Moto 0 km: registre só se houver alguma marca.'),
            Check(semAv, function (v) { setSemAv(v); if (v) setAvarias([]); }, 'Não foram identificadas avarias'),
            semAv ? null : h('div', null,
              avarias.map(function (a, i) {
                var setA = function (k, v) { setAvarias(function (l) { var n = l.slice(); n[i] = Object.assign({}, n[i]); n[i][k] = v; return n; }); };
                return h('div', { key: i, style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '6px 0', borderTop: i ? '1px solid #f3f4f6' : 0 } },
                  h('b', { style: { fontSize: 13, color: '#6b7280', width: 20 } }, i + 1),
                  Input({ value: a.local || '', placeholder: 'Local da moto', 'aria-label': 'Local da avaria ' + (i + 1), onChange: function (e) { setA('local', e.target.value); }, style: { height: 34, flex: '0 1 200px' } }),
                  Input({ value: a.descricao || '', placeholder: 'Descrição da avaria / condição', 'aria-label': 'Descrição da avaria ' + (i + 1), onChange: function (e) { setA('descricao', e.target.value); }, style: { height: 34, flex: '1 1 260px' } }),
                  Select({ value: a.foto || '', 'aria-label': 'Foto da avaria ' + (i + 1), onChange: function (e) { setA('foto', e.target.value); }, style: { height: 34, width: 120, flex: 'none' } }, [h('option', { key: '', value: '' }, 'Sem foto'), h('option', { key: '7', value: 'avaria1' }, 'Foto 7'), h('option', { key: '8', value: 'avaria2' }, 'Foto 8')]),
                  h('button', { type: 'button', 'aria-label': 'Remover avaria ' + (i + 1), onClick: function () { setAvarias(function (l) { return l.filter(function (_, j) { return j !== i; }); }); }, style: { color: '#9ca3af', cursor: 'pointer' } }, ico('trash', 14)));
              }),
              Btn({ variant: 'link', icon: 'plus', onClick: function () { setAvarias(function (l) { return l.concat([{ local: '', descricao: '', foto: l.length === 0 ? 'avaria1' : l.length === 1 ? 'avaria2' : '' }]); }); }, style: { marginTop: 6 }, children: 'Adicionar avaria' })))),
        secao(4, 'Registro fotográfico', h('span', { style: { fontSize: 12.5, color: '#6b7280' } }, Object.keys(fotos).length + ' de 8 · fotos com data e hora'),
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4', style: { gap: 10 } }, POS_V3.map(function (p) {
            var f = fotos[p[0]];
            return h('label', { key: p[0], style: { cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 } },
              h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' }, onChange: function (e) { pegar(p[0], e.target.files && e.target.files[0]); e.target.value = ''; } }),
              h('div', { style: { position: 'relative', aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden', border: f ? '1px solid #bbf7d0' : p[2] ? '1.5px dashed #d8b4f0' : '1.5px dashed #e5e7eb', background: f ? '#f3f4f6' : p[2] ? '#faf7fd' : '#fafafa', color: p[2] ? ROXO : '#9ca3af', display: 'grid', placeItems: 'center' } },
                f ? h('img', { src: f.foto, alt: p[1], style: { width: '100%', height: '100%', objectFit: 'cover' } }) : h('span', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 } }, ico('camera', 20), p[2] ? 'Tirar foto' : 'Opcional'),
                f ? h('span', { style: { position: 'absolute', left: 6, bottom: 6, fontSize: 10.5, color: '#fff', background: 'rgba(17,24,39,.6)', borderRadius: 4, padding: '1px 5px' } }, fDHc(f.capturada_em)) : null),
              h('span', { style: { fontSize: 12, fontWeight: 600, color: f ? '#374151' : p[2] ? ROXO : '#6b7280' } }, p[1]));
          }))),
        h('section', { style: { border: '1px solid #e9d5f9', background: '#faf7fd', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 } },
          h('b', { style: { fontSize: 14 } }, 'Declaração do locatário'),
          h('div', { style: { fontSize: 13, color: '#374151', lineHeight: 1.55 } }, 'Declaro que vistoriei pessoalmente a moto, que todas as avarias e condições existentes foram registradas acima e nas fotos, e que a recebo ', h('b', null, 'NO ESTADO EM QUE SE ENCONTRA'), '. Comprometo-me a devolvê-la no mesmo estado, ressalvado o desgaste natural do uso regular. Qualquer avaria não registrada neste Termo será considerada ocorrida durante a locação (Cl. 1.2.1 e 1.2.2).'),
          Check(decl, setDecl, 'O locatário leu e está de acordo com a declaração', 'A assinatura é feita no Autentique, junto com a TUTTS, depois de gerar o termo.'))));
  }

  // Resumo do Anexo IV (checklist, combustível, avarias) para os modais de vistoria
  function VistoriaV3Info(props) {
    var v = props.v || {};
    var ck = v.checklist || [], av = v.avarias || [];
    if (!ck.length && !av.length && !v.combustivel) return null;
    var nAv = ck.filter(function (x) { return x.situacao === 'avaria'; }).length;
    return h('div', { style: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12.5, color: '#374151' } },
        v.combustivel ? h('span', null, h('b', null, 'Combustível: '), (COMBUST.find(function (x) { return x[0] === v.combustivel; }) || [0, v.combustivel])[1]) : null,
        ck.length ? h('span', null, h('b', null, 'Checklist: '), (ck.length - nAv) + ' OK · ' + nAv + ' com avaria') : null,
        v.declaracao_aceita ? h('span', { style: { color: '#166534' } }, '· declaração aceita') : null),
      ck.filter(function (x) { return x.situacao === 'avaria' || x.obs; }).map(function (x, i) { return h('div', { key: 'c' + i, style: { fontSize: 12.5, color: x.situacao === 'avaria' ? '#991b1b' : '#374151' } }, h('b', null, x.item + ': '), x.obs || (x.situacao === 'avaria' ? 'avaria' : '')); }),
      av.length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } }, h('b', { style: { fontSize: 12.5 } }, 'Avarias pré-existentes'), av.map(function (a, i) { return h('div', { key: 'a' + i, style: { fontSize: 12.5, color: '#374151' } }, (i + 1) + '. ' + [a.local, a.descricao].filter(Boolean).join(' · ') + (a.foto ? ' (foto ' + (a.foto === 'avaria2' ? 8 : a.foto === 'avaria1' ? 7 : a.foto) + ')' : '')); })) : (v.sem_avarias ? h('div', { style: { fontSize: 12.5, color: '#166534' } }, 'Não foram identificadas avarias pré-existentes.') : null));
  }
  function AcoesAnexoIV(props) {
    var api = props.api, toast = props.toast, v = props.v || {};
    var _s = useState(false), env = _s[0], setEnv = _s[1];
    var enviar = function () {
      setEnv(true);
      api('/vistorias/' + v.id + '/enviar-assinatura', { method: 'POST', body: {} }).then(function (r) { toast(r && r.enviado ? 'Termo enviado ao Autentique' : 'Não enviado' + (r && r.motivo ? ': ' + r.motivo : ''), r && r.enviado ? 'success' : 'error'); props.aoMudar && props.aoMudar(); })
        .catch(function (e) { toast(e.message, 'error'); }).then(function () { setEnv(false); });
    };
    var assinavel = v.tipo === 'retirada' || v.tipo === 'devolucao';
    return h('span', { style: { display: 'inline-flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' } },
      h('button', { type: 'button', className: 'hover:underline', onClick: function () { abrirPdf(api, '/vistorias/' + v.id + '/anexo-iv.pdf', toast); }, style: { color: ROXO, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', gap: 4, alignItems: 'center' } }, ico('filetext', 13), 'Anexo IV (PDF)'),
      assinavel ? (v.assinatura_status === 'assinado' || v.assinado_em ? h('span', { style: { fontSize: 12.5, color: '#166534', fontWeight: 600 } }, 'Termo assinado' + (v.assinado_em ? ' · ' + fDC(v.assinado_em) : ''))
        : h('button', { type: 'button', className: 'hover:underline', disabled: env, onClick: enviar, style: { color: '#374151', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', gap: 4, alignItems: 'center' } }, ico('pencil', 13), env ? 'Enviando...' : (v.autentique_doc_id ? 'Reenviar para assinatura' : 'Enviar para assinatura'))) : null);
  }

  function AgendarVistoriaModal(props) {
    var amanha = addDias(new Date(), 2);
    var _d = useState(iso(amanha) + 'T09:00'), dt = _d[0], setDt = _d[1];
    var _s = useState(false), s = _s[0], setS = _s[1];
    var mn = new Date(Date.now() + 48 * 3600e3);
    var minTxt = iso(mn) + 'T' + p2(mn.getHours()) + ':' + p2(mn.getMinutes());
    var cedo = dt && dt < minTxt;
    return h(Modal, { titulo: 'Agendar vistoria mensal na Base', onClose: props.onClose, largura: 480,
      rodape: [Btn({ key: 'c', onClick: props.onClose, children: 'Voltar' }), Btn({ key: 'o', variant: 'pri', icon: 'calendar', disabled: s || !dt, onClick: function () { setS(true); Promise.resolve(props.onConfirm({ data_hora: dt })).catch(function () {}).then(function () { setS(false); }); }, children: s ? 'Agendando...' : 'Agendar e avisar locatário' })] },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Field, { label: 'Data e hora', req: true, hint: cedo ? 'O contrato pede aviso com 48 horas de antecedência (Cl. 9.4.1).' : 'O locatário recebe o aviso no app e por WhatsApp.', hintCor: cedo ? '#92400e' : null }, Input({ type: 'datetime-local', value: dt, onChange: function (e) { setDt(e.target.value); } })),
        Aviso('cinza', null, 'Não comparecimento sem justificativa: tarifa de R$ 100,00 (Cl. 9.4.1 · 5.10 s), lançada pelo botão “Não compareceu”.')));
  }


  // ───────────────────────── Componente principal ─────────────────────────
  var ABAS = [['painel', 'Painel / Frota', 'chart'], ['cadastros', 'Cadastros', 'users'], ['contratos', 'Contratos', 'filetext'], ['financeiro', 'Financeiro', 'wallet'], ['motos', 'Motos', 'bike'], ['vistorias', 'Vistorias', 'camera'], ['config', 'Configurações', 'settings']]; // LOCACAO_REMODEL_V1
  var SUBTITULO = {
    painel: 'Do convite ao entregador até a quitação · pré-cadastro, contrato no Autentique e cobrança automática',
    cadastros: 'Todo mundo que pediu ou tem moto: do pré-cadastro ao contrato. Clique na pessoa para abrir o perfil.', // LOCACAO_REMODEL_V1
    financeiro: 'Quem pagou, quem falta, cobrança, baixa e antecipação de todos os contratos', // LOCACAO_REMODEL_V1
    motos: 'Cadastro da frota, fotos e laudos · status automático pelo contrato',
    contratos: 'Tutts Aluguel e Plano Conquista · perfil do locatário, assinatura, moto, encerramento e opção de compra',
    vistorias: 'Fotos da moto na retirada, nas revisões e na devolução',
    config: 'Encargos, régua, tarifário (Anexo I), locadora, IPCA, modelo de contrato e termo LGPD'
  };

  window.ModuloLocacaoComponent = function (props) {
    var usuario = props.usuario, apiUrl = props.API_URL || window.API_URL;
    var HeaderCompacto = props.HeaderCompacto, Toast = props.Toast, LoadingOverlay = props.LoadingOverlay;
    var Ee = props.Ee, he = props.he, o = props.o;
    var toastFn = props.showToast || function (m) { try { console.log(m); } catch (e) { /* ok */ } };
    var fetchAuthFn = props.fetchAuth || window.fetchAuth;

    var _v = useState(function () {
      try { var s = sessionStorage.getItem('tutts_locacao_aba'); if (s === 'precadastros') s = 'cadastros'; if (s && ABAS.some(function (a) { return a[0] === s; })) return { tela: 'lista', tab: s }; } catch (e) { /* ok */ }
      return { tela: 'lista', tab: 'painel' };
    }), view = _v[0], setView = _v[1];
    var _p = useState(null), painel = _p[0], setPainel = _p[1];
    var _pe = useState(null), painelErro = _pe[0], setPainelErro = _pe[1];
    var _cv = useState(false), convite = _cv[0], setConvite = _cv[1];
    var _cm = useState(false), centralModal = _cm[0], setCentralModal = _cm[1]; // LOCACAO_V4

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
        if (n.tab === 'precadastros') n.tab = 'cadastros'; // LOCACAO_REMODEL_V1
        if (n.tela === 'lista') { try { sessionStorage.setItem('tutts_locacao_aba', n.tab); } catch (e) { /* ok */ } }
        else n.de = atual.tela === 'lista' ? atual.tab : atual.de;
        return n;
      });
      try { window.scrollTo({ top: 0 }); } catch (e) { /* ok */ }
    }, []);

    var k = (painel && painel.kpis) || {};
    var abaAtiva = view.tela === 'lista' ? view.tab : ({ moto: 'motos', contrato: 'contratos', novoContrato: 'contratos', financeiro: 'financeiro' }[view.tela] || view.de || 'painel');
    var badge = { cadastros: k.precadastros_novos, vistorias: k.vistorias_pendentes, financeiro: k.em_atraso }; // LOCACAO_REMODEL_V1
    var comum = { api: api, toast: toastFn, nav: nav, aoMudar: carregarPainel, recarregarPainel: carregarPainel };

    var conteudo;
    if (view.tela === 'moto') conteudo = h(MotoDetalhe, Object.assign({ key: 'm' + (view.id || 'novo') + (view.secao || ''), id: view.id, de: view.de, secao: view.secao }, comum)); // LOCACAO_V2: secao
    else if (view.tela === 'contrato') conteudo = h(ContratoDetalhe, Object.assign({ key: 'c' + view.id, id: view.id, de: view.de }, comum));
    else if (view.tela === 'financeiro') conteudo = h(FinanceiroContrato, Object.assign({ key: 'f' + view.id, id: view.id, de: view.de }, comum)); // LOCACAO_REMODEL_V1
    else if (view.tela === 'novoContrato') conteudo = h(NovoContratoView, Object.assign({ key: 'nc' + (view.cliente_id || '') + (view.importar ? 'i' : ''), cliente_id: view.cliente_id, importar: !!view.importar }, comum)); // LOCACAO_V3: importar
    else if (view.tab === 'cadastros') conteudo = h(PrecadastrosView, Object.assign({ key: 'pc' + (view.sel || '') + (view.editar ? 'e' : ''), selecionar: view.sel || null, editar: !!view.editar, abrirConvite: function () { setConvite(true); }, abrirCentral: function () { setCentralModal(true); } }, comum)); // LOCACAO_V2: sel · LOCACAO_V4: editar/central
    else if (view.tab === 'motos') conteudo = h(MotosView, comum);
    else if (view.tab === 'contratos') conteudo = h(ContratosView, comum);
    else if (view.tab === 'financeiro') conteudo = h(FinanceiroView, comum); // LOCACAO_REMODEL_V1
    else if (view.tab === 'vistorias') conteudo = h(VistoriasView, comum);
    else if (view.tab === 'config') conteudo = h(ConfigView, comum);
    else conteudo = h(PainelView, Object.assign({ painel: painel, erro: painelErro, recarregar: carregarPainel }, comum));

    var emLista = view.tela === 'lista';
    var tituloPag = { painel: 'Locação de motos', cadastros: 'Cadastros', motos: 'Motos', contratos: 'Contratos', financeiro: 'Financeiro', vistorias: 'Vistorias', config: 'Configurações' }[view.tab];
    var botoesTopo = emLista && view.tab === 'painel' ? [
      Btn({ key: 'cv', icon: 'link', onClick: function () { setConvite(true); }, children: 'Gerar link de convite' }),
      Btn({ key: 'mo', icon: 'plus', onClick: function () { nav({ tela: 'moto', id: null }); }, children: 'Cadastrar moto' }),
      Btn({ key: 'nc', variant: 'pri', icon: 'plus', onClick: function () { nav({ tela: 'novoContrato' }); }, children: 'Novo contrato' })
    ] : emLista && view.tab === 'cadastros' ? [Btn({ key: 'cv', icon: 'link', onClick: function () { setConvite(true); }, children: 'Pessoa de fora · gerar link' }), Btn({ key: 'mc', variant: 'pri', icon: 'users', onClick: function () { setCentralModal(true); }, children: 'Motoboy da Central' })] // LOCACAO_V4
      : emLista && view.tab === 'motos' ? [Btn({ key: 'mo', variant: 'pri', icon: 'plus', onClick: function () { nav({ tela: 'moto', id: null }); }, children: 'Cadastrar moto' })]
      : emLista && view.tab === 'contratos' ? [Btn({ key: 'imp', icon: 'upload', onClick: function () { nav({ tela: 'novoContrato', importar: true }); }, children: 'Importar contrato assinado' }), Btn({ key: 'nc', variant: 'pri', icon: 'plus', onClick: function () { nav({ tela: 'novoContrato' }); }, children: 'Novo contrato' })] : null; // LOCACAO_V3

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
              b ? h('span', { style: { background: a[0] === 'vistorias' ? '#fffbeb' : a[0] === 'financeiro' ? '#fee2e2' : '#f3e8fb', color: a[0] === 'vistorias' ? '#92400e' : a[0] === 'financeiro' ? '#991b1b' : ROXO_ESC, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '1px 7px' } }, b) : null);
          })),
        conteudo),
      convite ? h(ConviteModal, { api: api, toast: toastFn, onClose: function () { setConvite(false); carregarPainel(); } }) : null,
      centralModal ? h(CentralModal, { api: api, toast: toastFn, onClose: function () { setCentralModal(false); }, // LOCACAO_V4
        onCriado: function (id, modo) { setCentralModal(false); carregarPainel(); nav({ tela: 'lista', tab: 'cadastros', sel: id, editar: modo === 'manual' }); },
        onNovoContrato: function (cid) { setCentralModal(false); nav({ tela: 'novoContrato', cliente_id: cid }); } }) : null);
  };
})();
