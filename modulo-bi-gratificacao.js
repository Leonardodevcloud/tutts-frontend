/* GRATIFICACAO_GARANTIDO_V1
 * ============================================================================
 * modulo-bi-gratificacao.js — pagamento do mínimo garantido (gratificação na Mapp)
 *
 *  Na tela do Garantido: coluna Pagamento, faixa da rodada, painel lateral de decisão,
 *  pendências, configuração e a sub-aba "Histórico de pagamentos".
 *
 * GRATIFICACAO_GARANTIDO_V2 (aprovado 27/10): o pagamento fica DENTRO da tela do Garantido (BIGarantidoV2.js).
 * Exporta window.BIGrat com os blocos (React UMD). Usa window.fetchAuth / window.API_URL.
 * ============================================================================ */
(function () {
  'use strict';

  var SORA = 'Sora, Inter, sans-serif';
  var TOM = {
    roxo: { bg: '#faf7fd', fg: '#5d0b85', bd: '#e9d5f9' },
    verde: { bg: '#f0fdf4', fg: '#166534', bd: '#bbf7d0' },
    ambar: { bg: '#fffbeb', fg: '#92400e', bd: '#fde68a' },
    vermelho: { bg: '#fef2f2', fg: '#991b1b', bd: '#fecaca' },
    azul: { bg: '#eff6ff', fg: '#1e40af', bd: '#bfdbfe' },
    cinza: { bg: '#f3f4f6', fg: '#374151', bd: '#e5e7eb' },
  };
  var ST = {
    pendente: { tom: 'ambar', label: 'Pendente' },
    a_lancar: { tom: 'roxo', label: 'Aprovado · aguardando' },
    lancando: { tom: 'azul', label: 'Enviando' },
    lancado: { tom: 'verde', label: 'Lançado' },
    falhou: { tom: 'vermelho', label: 'Mapp recusou' },
    incerto: { tom: 'vermelho', label: 'Conferir na Mapp' },
    recusado: { tom: 'cinza', label: 'Recusado' },
    externo: { tom: 'cinza', label: 'Pago fora do sistema' },
  };
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  var e = function () { return React.createElement.apply(React, arguments); };
  function fmtBRL(v) { return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtDia(s) { if (!s) return '—'; var p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1]; }
  function diaSemana(s) { return DIAS[new Date(String(s).slice(0, 10) + 'T12:00:00').getDay()]; }
  function fmtHora(ts) { if (!ts) return ''; var d = new Date(ts); return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function fmtDataHora(ts) { if (!ts) return ''; var d = new Date(ts); return isNaN(d) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  function pct(v) { return v == null ? '—' : Math.round(Number(v)) + '%'; }
  function hojeISO() { var d = new Date(Date.now() - 3 * 3600e3); return d.toISOString().slice(0, 10); }
  function ontemISO() { var d = new Date(Date.now() - 3 * 3600e3); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }

  function ico(nome, size, extra) {
    return e('svg', { className: 'ico', 'aria-hidden': 'true', style: Object.assign({ width: size || 16, height: size || 16, flexShrink: 0 }, extra || {}) }, e('use', { href: '#i-' + nome }));
  }
  function pill(tomKey, texto, extra) {
    var t = TOM[tomKey] || TOM.cinza;
    return e('span', { style: Object.assign({ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '3px 10px', background: t.bg, color: t.fg, border: '1px solid ' + t.bd, whiteSpace: 'nowrap' }, extra || {}) }, texto);
  }
  function pillStatus(s) { var x = ST[s] || { tom: 'cinza', label: s }; return pill(x.tom, x.label); }

  var card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16 };
  var btnPri = { height: 40, padding: '0 16px', border: 'none', borderRadius: 10, background: '#770fa8', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' };
  var btnSec = { height: 40, padding: '0 14px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', color: '#374151', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' };
  var btnRoxoSec = Object.assign({}, btnSec, { border: '1px solid #d8b4f0', color: '#5d0b85', fontWeight: 600 });
  var inp = { height: 38, border: '1px solid #d1d5db', borderRadius: 9, padding: '0 10px', fontSize: 13, background: '#fff', fontFamily: 'inherit', color: '#111827', boxSizing: 'border-box' };
  var lbl = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#4b5563', fontWeight: 500 };
  function desab(st, off) { return off ? Object.assign({}, st, { opacity: 0.55, cursor: 'not-allowed' }) : st; }

  function api(path, opts) {
    var f = window.fetchAuth || fetch;
    var o = Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {});
    return f((window.API_URL || '') + path, o).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || ('Erro ' + r.status));
        return j;
      });
    });
  }

  function Aviso(props) {
    if (!props.aviso) return null;
    var t = TOM[props.aviso.tipo === 'erro' ? 'vermelho' : props.aviso.tipo === 'ok' ? 'verde' : 'ambar'];
    return e('div', { role: props.aviso.tipo === 'erro' ? 'alert' : 'status', style: { background: t.bg, border: '1px solid ' + t.bd, color: t.fg, borderRadius: 12, padding: '10px 14px', fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' } },
      e('span', null, props.aviso.texto),
      e('button', { type: 'button', 'aria-label': 'Fechar aviso', onClick: props.onFechar, style: { border: 'none', background: 'transparent', color: t.fg, cursor: 'pointer', width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ico('x', 14)));
  }

  function Modal(props) {
    React.useEffect(function () {
      function esc(ev) { if (ev.key === 'Escape' && props.onFechar) props.onFechar(); }
      document.addEventListener('keydown', esc);
      return function () { document.removeEventListener('keydown', esc); };
    }, []);
    return e('div', { style: { position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }, onMouseDown: function (ev) { if (ev.target === ev.currentTarget && props.onFechar) props.onFechar(); } },
      e('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': props.titulo, style: Object.assign({}, card, { width: '100%', maxWidth: props.largura || 560, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 20px 50px rgba(0,0,0,.18)' }) },
        e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 } },
          e('b', { style: { fontFamily: SORA, fontSize: 16, color: '#3a1556' } }, props.titulo),
          e('button', { type: 'button', 'aria-label': 'Fechar', onClick: props.onFechar, style: { border: 'none', background: '#f3f4f6', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#374151' } }, ico('x', 15))),
        props.children));
  }

  // ───────────────────────── Rodada do dia ─────────────────────────
  function etapasDaRodada(r) {
    var et = (r && r.etapas) || {};
    var atual = r ? r.etapa : null;
    var ordem = ['planilha', 'bi', 'calcular', 'lancar'];
    var idxAtual = ordem.indexOf(atual === 'fim' ? 'fim' : atual);
    function estado(k) {
      var i = ordem.indexOf(k);
      if (r.status === 'concluida') return et[k] && et[k].ok === false ? 'falhou' : 'ok';
      if (et[k] && et[k].ok) return 'ok';
      if (atual === 'fim') return 'ok';
      if (i === idxAtual) return r.status === 'falhou' ? 'falhou' : 'esperando';
      return i < idxAtual ? 'ok' : 'futuro';
    }
    var p = et.planilha || {}, b = et.bi || {}, c = et.calcular || {}, l = et.lancar || {};
    return [
      { k: 'planilha', titulo: 'Planilha do garantido', estado: estado('planilha'),
        det: p.ok ? (p.motoboys + ' motoboys com mínimo em ' + fmtDia(r.data) + (p.sem_codigo ? ' · ' + p.sem_codigo + ' sem código' : '')) : (p.msg || 'Esperando a planilha') },
      { k: 'bi', titulo: b.pulado ? 'BI (simulação)' : 'BI reimportado', estado: estado('bi'),
        det: b.pulado ? b.msg : b.ok ? ('Importação forçada de ' + fmtDia(r.data) + ' concluída' + (b.finalizado_em ? ' ' + fmtHora(b.finalizado_em) : '')) : b.import_id ? ('Importação #' + b.import_id + ' · ' + (b.status || 'na fila') + (b.msg ? ' · ' + b.msg : '')) : 'Ainda não começou' },
      { k: 'calcular', titulo: 'Regras aplicadas', estado: estado('calcular'),
        det: c.ok ? ((c.a_lancar || 0) + ' com direito · ' + (c.pendente || 0) + ' para decisão · ' + (c.acima || 0) + ' acima do mínimo' + (c.ja_decididos ? ' · ' + c.ja_decididos + ' já decididos antes' : '')) : 'Depois do BI' },
      { k: 'lancar', titulo: 'Créditos na Mapp', estado: estado('lancar'),
        det: l.pulado ? 'Lançamento automático desligado: aprovados aguardando' : l.ok || l.lancados != null ? ((l.lancados || 0) + ' lançados · ' + (l.falhas || 0) + ' recusados · ' + (l.incertos || 0) + ' a conferir') : 'Depois das regras' },
    ];
  }

  function IconeEtapa(estado) {
    var cfg = { ok: ['#047857', 'check'], esperando: ['#b45309', 'clock'], falhou: ['#b91c1c', 'x'], futuro: ['#9ca3af', 'circle'] }[estado] || ['#9ca3af', 'circle'];
    return e('span', { style: { width: 20, height: 20, borderRadius: 999, background: estado === 'futuro' ? '#f3f4f6' : cfg[0], color: estado === 'futuro' ? cfg[0] : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } }, ico(cfg[1], 11));
  }

  // ───────────────────────── Tabela de créditos ─────────────────────────
  function exportarCSV(lista) {
    var cab = ['Dia', 'Cód. motoboy', 'Motoboy', 'Cliente', 'Negociado', 'Produzido', '% produção', 'Gratificação', 'Origem', 'Quem', 'Situação', 'Caixa Mapp', 'Justificativa'];
    var linhas = lista.map(function (c) {
      return [fmtDia(c.data), c.cod_prof, c.nome_prof, c.cod_cliente, c.valor_negociado, c.valor_produzido, Math.round(c.pct || 0),
        c.valor_lancado != null ? c.valor_lancado : c.valor_calculado, c.origem === 'manual' ? 'Manual' : 'Automático', c.decidido_por_nome || '',
        (ST[c.status] || {}).label || c.status, c.mapp_id_caixa || '', (c.justificativa || '').replace(/\s+/g, ' ')];
    });
    var csv = [cab].concat(linhas).map(function (l) { return l.map(function (v) { var s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';'); }).join('\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gratificacoes.csv'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function quemFez(c) {
    if (c.status === 'pendente') return (window.__GRAT_MOTIVOS || {})[c.motivo] || 'Barrado por regra';
    if (c.status === 'externo') return c.decidido_por ? (c.decidido_por_nome || '—') + (c.decidido_em ? ' · ' + fmtDataHora(c.decidido_em) : '') : 'Marcado como lançado na Análise';
    if (c.origem === 'manual' || c.decidido_por_nome) return (c.decidido_por_nome || '—') + (c.decidido_em ? ' · ' + fmtDataHora(c.decidido_em) : '');
    if (c.status === 'incerto' || c.status === 'falhou') return c.mapp_mensagem || 'Rodada automática';
    return 'Rodada automática' + (c.lancado_em ? ' · ' + fmtHora(c.lancado_em) : '');
  }

  function TabelaCreditos(props) {
    var d = props.dados, f = props.filtros, setF = props.setFiltros;
    function campo(k) { return function (ev) { var v = ev.target.value; setF(function (o) { var n = Object.assign({}, o); n[k] = v; return n; }); }; }
    var th = { padding: '10px 8px', fontWeight: 600, textAlign: 'left', fontSize: 11.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' };
    var td = { padding: '11px 8px', borderTop: '1px solid #f3f4f6', verticalAlign: 'top' };
    return e('section', { 'aria-label': 'Créditos de gratificação', style: Object.assign({}, card, { display: 'flex', flexDirection: 'column' }) },
      e('form', { onSubmit: function (ev) { ev.preventDefault(); props.onFiltrar(); }, style: { padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', borderBottom: '1px solid #f3f4f6' } },
        e('label', { style: lbl }, 'De', e('input', { type: 'date', value: f.data_inicio || d.periodo.data_inicio, onChange: campo('data_inicio'), style: Object.assign({}, inp, { width: 150 }) })),
        e('label', { style: lbl }, 'Até', e('input', { type: 'date', value: f.data_fim || d.periodo.data_fim, onChange: campo('data_fim'), style: Object.assign({}, inp, { width: 150 }) })),
        e('label', { style: lbl }, 'Origem', e('select', { value: f.origem, onChange: campo('origem'), style: inp },
          e('option', { value: '' }, 'Todas'), e('option', { value: 'automatico' }, 'Automático'), e('option', { value: 'manual' }, 'Manual'))),
        e('label', { style: lbl }, 'Situação', e('select', { value: f.status, onChange: campo('status'), style: inp },
          e('option', { value: '' }, 'Todas'),
          Object.keys(ST).map(function (k) { return e('option', { key: k, value: k }, ST[k].label); }))),
        e('label', { style: Object.assign({}, lbl, { flex: 1, minWidth: 200 }) }, 'Buscar',
          e('input', { type: 'search', value: f.busca, onChange: campo('busca'), placeholder: 'Nome, código do motoboy ou cliente', style: inp })),
        e('button', { type: 'submit', style: Object.assign({}, btnPri, { height: 38 }) }, ico('filter', 14), 'Filtrar'),
        e('button', { type: 'button', style: Object.assign({}, btnSec, { height: 38 }), onClick: function () { exportarCSV(d.creditos); } }, ico('download', 14), 'Exportar CSV')),
      d.creditos.length === 0
        ? e('div', { style: { padding: 40, textAlign: 'center', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' } },
          e('b', { style: { color: '#111827' } }, 'Nenhuma gratificação nesse período'),
          e('span', null, 'Mude o período ou os filtros. As rodadas gravam aqui todo motoboy que ficou abaixo do mínimo.'))
        : e('div', { style: { overflowX: 'auto' } },
          e('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 1080, fontSize: 13 } },
            e('thead', null, e('tr', null,
              e('th', { style: Object.assign({}, th, { paddingLeft: 16 }) }, 'Dia'), e('th', { style: th }, 'Motoboy'), e('th', { style: th }, 'Cliente'),
              e('th', { style: Object.assign({}, th, { textAlign: 'right' }) }, 'Negociado'), e('th', { style: Object.assign({}, th, { textAlign: 'right' }) }, 'Produzido'),
              e('th', { style: Object.assign({}, th, { textAlign: 'right' }) }, 'Gratificação'), e('th', { style: th }, 'Origem'), e('th', { style: th }, 'Situação'),
              e('th', { style: Object.assign({}, th, { paddingRight: 16 }) }, 'Caixa Mapp'))),
            e('tbody', null, d.creditos.map(function (c) {
              return e('tr', { key: c.id, tabIndex: 0, onClick: function () { props.onAbrir(c.id); }, onKeyDown: function (ev) { if (ev.key === 'Enter') props.onAbrir(c.id); }, style: { cursor: 'pointer' }, 'aria-label': 'Abrir gratificação de ' + c.nome_prof },
                e('td', { style: Object.assign({}, td, { paddingLeft: 16, whiteSpace: 'nowrap' }) }, fmtDia(c.data)),
                e('td', { style: td }, e('div', { style: { display: 'flex', flexDirection: 'column' } }, e('b', { style: { fontWeight: 600 } }, c.nome_prof), e('span', { style: { fontSize: 12, color: '#6b7280' } }, 'cód. ' + c.cod_prof))),
                e('td', { style: td }, c.cod_cliente || '—'),
                e('td', { style: Object.assign({}, td, { textAlign: 'right', fontVariantNumeric: 'tabular-nums' }) }, fmtBRL(c.valor_negociado)),
                e('td', { style: Object.assign({}, td, { textAlign: 'right', fontVariantNumeric: 'tabular-nums' }) }, fmtBRL(c.valor_produzido), e('span', { style: { display: 'block', fontSize: 11.5, color: '#6b7280' } }, pct(c.pct))),
                e('td', { style: Object.assign({}, td, { textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }) }, fmtBRL(c.valor_lancado != null ? c.valor_lancado : c.valor_calculado)),
                e('td', { style: td }, e('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
                  e('span', { style: { fontWeight: 500 } }, c.origem === 'manual' ? 'Manual' : 'Automático'),
                  e('span', { style: { fontSize: 12, color: '#6b7280', maxWidth: 240 } }, quemFez(c)))),
                e('td', { style: td }, pillStatus(c.status)),
                e('td', { style: Object.assign({}, td, { paddingRight: 16, fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#4b5563' }) }, c.mapp_id_caixa || '—'));
            })))),
      e('div', { style: { padding: '12px 16px', fontSize: 12, color: '#6b7280', borderTop: '1px solid #f3f4f6' } },
        'Descrição enviada à Mapp em todo crédito: “Gratificação (código do cliente)”. Vencimento = o dia analisado.'));
  }

  // ───────────────────────── Detalhe + decisão ─────────────────────────
  function Detalhe(props) {
    var s1 = React.useState(null), c = s1[0], setC = s1[1];
    var s2 = React.useState(''), just = s2[0], setJust = s2[1];
    var s3 = React.useState(false), outroValor = s3[0], setOutroValor = s3[1];
    var s4 = React.useState(''), valor = s4[0], setValor = s4[1];
    var s5 = React.useState(''), idCaixa = s5[0], setIdCaixa = s5[1];
    var s6 = React.useState(false), enviando = s6[0], setEnviando = s6[1];
    var s7 = React.useState(null), msg = s7[0], setMsg = s7[1];
    var s8 = React.useState(null), erroCarga = s8[0], setErroCarga = s8[1];

    var carregar = React.useCallback(function () {
      setErroCarga(null);
      api('/bi/gratificacao/creditos/' + props.id).then(function (x) {
        ['valor_negociado', 'valor_produzido', 'valor_calculado', 'valor_lancado', 'pct_producao'].forEach(function (k) { if (x[k] != null) x[k] = Number(x[k]); });
        setC(x);
      }).catch(function (er) { setErroCarga(er.message); });
    }, [props.id]);
    React.useEffect(function () { setC(null); setJust(''); setOutroValor(false); setValor(''); setIdCaixa(''); setMsg(null); carregar(); }, [props.id]);

    if (erroCarga) return e('div', { role: 'alert', style: { color: '#991b1b', padding: 16 } }, erroCarga);
    if (!c) return e('div', { style: { padding: 32, color: '#6b7280', textAlign: 'center' } }, 'Carregando…');

    function agir(path, body, okTexto) {
      setEnviando(true); setMsg(null);
      api('/bi/gratificacao/creditos/' + c.id + '/' + path, { method: 'POST', body: JSON.stringify(body) })
        .then(function (r) {
          var res = r && r.resultado;
          if (res === 'sucesso') setMsg({ tipo: 'ok', texto: 'Lançado na Mapp · caixa ' + (r.id_caixa || '—') });
          else if (res === 'erro') setMsg({ tipo: 'erro', texto: 'A Mapp recusou: ' + r.mensagem + '. Nada foi creditado.' });
          else if (res === 'incerto') setMsg({ tipo: 'erro', texto: 'Sem confirmação da Mapp (' + r.mensagem + '). Confira no caixa antes de qualquer coisa.' });
          else setMsg({ tipo: 'ok', texto: okTexto });
          carregar(); if (props.onMudou) props.onMudou();
        })
        .catch(function (er) { setMsg({ tipo: 'erro', texto: er.message }); })
        .then(function () { setEnviando(false); });
    }

    var decidivel = ['pendente', 'falhou', 'a_lancar'].indexOf(c.status) >= 0;
    var valorFinal = outroValor && valor ? Number(String(valor).replace(',', '.')) : c.valor_calculado;
    var precisaJust = c.status === 'pendente' || (outroValor && valorFinal !== c.valor_calculado);
    var justOk = !precisaJust || just.trim().length >= 5;
    var resp = c.mapp_resposta || {};
    var corr = c.corridas || [];

    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      e('div', { style: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 } },
        e('div', { style: { display: 'flex', flexDirection: 'column', gap: 3 } },
          e('b', { style: { fontFamily: SORA, fontSize: 18, color: '#3a1556' } }, c.nome_prof),
          e('span', { style: { color: '#6b7280' } }, 'cód. ' + c.cod_prof + ' · cliente ' + (c.cod_cliente || '—') + ' · ' + diaSemana(c.data) + ', ' + fmtDia(c.data))),
        e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 } },
          pillStatus(c.status),
          c.status === 'pendente' && c.motivo_texto && e('span', { style: { fontSize: 12, color: '#92400e' } }, c.motivo_texto))),
      e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 } },
        [['Negociado', fmtBRL(c.valor_negociado), null], ['Produzido', fmtBRL(c.valor_produzido) + ' · ' + pct(c.pct_producao), Number(c.pct_producao) < 50 ? '#b91c1c' : null],
          [c.valor_lancado != null ? 'Gratificação lançada' : 'Gratificação calculada', fmtBRL(c.valor_lancado != null ? c.valor_lancado : c.valor_calculado), '#5d0b85']].map(function (x, i) {
          return e('div', { key: i, style: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 2 } },
            e('span', { style: { fontSize: 12, color: '#6b7280' } }, x[0]), e('b', { style: { fontSize: 17, color: x[2] || '#111827' } }, x[1]));
        })),
      (c.checks || []).length > 0 && e('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        e('b', { style: { fontSize: 13 } }, 'Checagens'),
        e('ul', { style: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 } },
          c.checks.map(function (k, i) {
            return e('li', { key: i, style: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, background: '#fcfcfd', border: '1px solid #f3f4f6' } },
              e('span', { 'aria-label': k.ok ? 'passou' : 'não passou', role: 'img', style: { flexShrink: 0, width: 20, height: 20, borderRadius: 999, background: k.ok ? '#ecfdf5' : '#fef2f2', color: k.ok ? '#047857' : '#b91c1c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ico(k.ok ? 'check' : 'x', 11)),
              e('span', { style: { display: 'flex', flexDirection: 'column', gap: 1 } }, e('span', { style: { fontWeight: 500 } }, k.titulo), k.detalhe && e('span', { style: { fontSize: 12, color: '#6b7280' } }, k.detalhe)));
          }))),
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        e('b', { style: { fontSize: 13 } }, 'Corridas do dia (' + corr.length + ')'),
        corr.length === 0 ? e('span', { style: { fontSize: 12.5, color: '#6b7280' } }, 'Nenhuma corrida desse motoboy no BI nesse dia.')
          : e('div', { style: { overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 } },
            e('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 480, fontSize: 12.5 } },
              e('thead', null, e('tr', { style: { textAlign: 'left', color: '#6b7280', fontSize: 11.5 } },
                e('th', { style: { padding: '8px 12px', fontWeight: 600 } }, 'OS'), e('th', { style: { padding: 8, fontWeight: 600 } }, 'Finalizada'),
                e('th', { style: { padding: 8, fontWeight: 600 } }, 'Ocorrência'), e('th', { style: { padding: '8px 12px', fontWeight: 600, textAlign: 'right' } }, 'Valor prof.'))),
              e('tbody', null, corr.map(function (o) {
                var ins = o.ocorrencia && /cliente fechado|clienteaus|cliente ausente|loja fechada|produto incorreto|retorno/i.test(o.ocorrencia);
                return e('tr', { key: o.os, style: { borderTop: '1px solid #f3f4f6' } },
                  e('td', { style: { padding: '8px 12px' } }, String(o.os)),
                  e('td', { style: { padding: 8 } }, o.aberta ? pill('vermelho', 'Em aberto') : fmtHora(o.finalizado)),
                  e('td', { style: { padding: 8 } }, o.ocorrencia ? (ins ? pill('azul', 'Insucesso · ' + o.ocorrencia) : o.ocorrencia) : '—'),
                  e('td', { style: { padding: '8px 12px', textAlign: 'right' } }, fmtBRL(o.valor_prof)));
              }))))),
      (c.decidido_por_nome || c.justificativa || c.mapp_id_caixa || resp.mensagem) && e('div', { style: { background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: '#374151' } },
        c.decidido_por_nome && e('span', null, e('b', null, 'Decisão: '), c.decidido_por_nome + (c.decidido_em ? ' · ' + fmtDataHora(c.decidido_em) : '')),
        c.justificativa && e('span', null, e('b', null, 'Justificativa: '), c.justificativa),
        c.mapp_id_caixa && e('span', null, e('b', null, 'Caixa na Mapp: '), c.mapp_id_caixa + (c.mapp_ambiente === 'homologacao' ? ' (homologação)' : '') + (c.lancado_em ? ' · ' + fmtDataHora(c.lancado_em) : '')),
        resp.mensagem && c.status !== 'lancado' && e('span', null, e('b', null, 'Resposta da Mapp: '), resp.mensagem)),
      msg && e(Aviso, { aviso: msg, onFechar: function () { setMsg(null); } }),

      props.podeDecidir && decidivel && e('div', { style: { borderTop: '1px solid #f3f4f6', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 } },
        outroValor && e('label', { style: Object.assign({}, lbl, { fontSize: 13, color: '#111827' }) }, 'Valor a lançar (até ' + fmtBRL(c.valor_negociado) + ')',
          e('input', { type: 'text', inputMode: 'decimal', value: valor, onChange: function (ev) { setValor(ev.target.value); }, placeholder: String(c.valor_calculado).replace('.', ','), style: Object.assign({}, inp, { width: 180, height: 42 }) })),
        e('label', { style: Object.assign({}, lbl, { fontSize: 13, color: '#111827' }) }, precisaJust ? 'Justificativa (obrigatória)' : 'Justificativa (opcional para lançar; obrigatória para recusar ou pago fora)',
          e('textarea', { rows: 2, value: just, onChange: function (ev) { setJust(ev.target.value); }, placeholder: 'Ex.: chuva forte à tarde, operação reduziu as rotas do cliente', style: Object.assign({}, inp, { height: 'auto', padding: 10, resize: 'vertical' }) })),
        e('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
          e('button', { type: 'button', disabled: enviando || just.trim().length < 5, style: desab(btnSec, enviando || just.trim().length < 5), title: 'Ex.: pago por PIX direto. Conta como recebido e trava o retorno do dia.', onClick: function () { agir('pago-fora', { justificativa: just }, 'Marcado como pago fora do sistema'); } }, 'Pago fora do sistema'),
          e('button', { type: 'button', disabled: enviando || just.trim().length < 5, style: desab(btnSec, enviando || just.trim().length < 5), onClick: function () { agir('recusar', { justificativa: just }, 'Gratificação recusada'); } }, 'Recusar gratificação'),
          !outroValor && e('button', { type: 'button', disabled: enviando, style: btnRoxoSec, onClick: function () { setOutroValor(true); } }, 'Liberar outro valor'),
          e('button', { type: 'button', disabled: enviando || !justOk || !(valorFinal > 0), style: desab(btnPri, enviando || !justOk || !(valorFinal > 0)),
            onClick: function () { agir('lancar', { justificativa: just, valor: outroValor && valor ? valor : undefined }); } },
          enviando ? 'Enviando…' : 'Lançar ' + fmtBRL(valorFinal) + ' na Mapp')),
        e('span', { style: { fontSize: 12, color: '#6b7280' } }, 'Antes de lançar o sistema reconfere no BI e trava o dia desse motoboy: se outra pessoa já lançou, o botão é bloqueado.')),

      props.podeDecidir && c.status === 'incerto' && e('div', { style: { borderTop: '1px solid #f3f4f6', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 } },
        e('div', { role: 'alert', style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.5 } },
          'A Mapp não confirmou esse crédito. Abra o caixa do motoboy na Mapp e veja se caiu “Gratificação (' + (c.cod_cliente || '') + ')” de ' + fmtDia(c.data) + '. O sistema não reenvia sozinho para não pagar duas vezes.'),
        e('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' } },
          e('label', { style: lbl }, 'Nº do caixa na Mapp (se caiu)', e('input', { type: 'text', inputMode: 'numeric', value: idCaixa, onChange: function (ev) { setIdCaixa(ev.target.value.replace(/\D/g, '')); }, style: Object.assign({}, inp, { width: 180, height: 42 }) })),
          e('label', { style: Object.assign({}, lbl, { flex: 1, minWidth: 220 }) }, 'O que você conferiu', e('input', { type: 'text', value: just, onChange: function (ev) { setJust(ev.target.value); }, placeholder: 'Ex.: conferi no caixa do motoboy às 15h', style: Object.assign({}, inp, { height: 42 }) }))),
        e('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
          e('button', { type: 'button', disabled: enviando || just.trim().length < 5, style: desab(btnSec, enviando || just.trim().length < 5), onClick: function () { agir('resolver', { acao: 'nao_lancado', justificativa: just }, 'Voltou para pendente: pode lançar de novo'); } }, 'Não caiu — voltar para pendente'),
          e('button', { type: 'button', disabled: enviando || just.trim().length < 5 || !idCaixa, style: desab(btnPri, enviando || just.trim().length < 5 || !idCaixa), onClick: function () { agir('resolver', { acao: 'lancado', id_caixa: idCaixa, justificativa: just }, 'Marcado como lançado'); } }, 'Caiu na Mapp'))));
  }

  // ───────────────────────── Pendências ─────────────────────────
  function Pendencias(props) {
    var s1 = React.useState(null), lista = s1[0], setLista = s1[1];
    var s2 = React.useState(null), sel = s2[0], setSel = s2[1];
    var s3 = React.useState(null), erro = s3[0], setErro = s3[1];
    var carregar = React.useCallback(function () {
      api('/bi/gratificacao/pendencias').then(function (l) {
        setLista(l);
        // mantém o item aberto mesmo depois de decidido (a mensagem de resultado continua visível)
        setSel(function (atual) { return atual || (l[0] ? l[0].id : null); });
      }).catch(function (er) { setErro(er.message); });
    }, []);
    React.useEffect(function () { carregar(); }, []);
    if (erro) return e('div', { role: 'alert', style: { color: '#991b1b' } }, erro);
    if (!lista) return e('div', { style: { padding: 32, color: '#6b7280', textAlign: 'center' } }, 'Carregando…');
    var avisados = props.dados.avisados || [];
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      e('span', { style: { fontSize: 12.5, color: '#4b5563' } }, avisados.length
        ? 'Aviso no WhatsApp para ' + avisados.length + (avisados.length === 1 ? ' pessoa' : ' pessoas') + ' com a permissão “Liberar gratificação do garantido”'
        : 'Ninguém recebe o aviso ainda: dê a permissão “Liberar gratificação do garantido” em Configurações › Permissões ADM.'),
      lista.length === 0
        ? e('div', { style: Object.assign({}, card, { padding: 40, textAlign: 'center', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }) },
          e('b', { style: { color: '#111827', fontSize: 15 } }, 'Nada para decidir'),
          e('span', null, 'Quando uma regra barrar alguém, ou a Mapp não confirmar um crédito, aparece aqui.'))
        : e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' } },
          e('div', { style: { flex: '1 1 340px', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 } },
            lista.map(function (p) {
              var ativo = p.id === sel;
              var mot = p.status === 'pendente' ? (p.motivo_texto || 'Pendente') + (p.motivo === 'producao_baixa' ? ' (' + pct(p.pct) + ')' : '') : (ST[p.status] || {}).label;
              return e('button', { key: p.id, type: 'button', onClick: function () { setSel(p.id); }, 'aria-pressed': ativo,
                style: { textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, background: '#fff', border: ativo ? '2px solid #770fa8' : '1px solid #e5e7eb', color: '#111827' } },
                e('span', { style: { display: 'flex', justifyContent: 'space-between', gap: 8, width: '100%' } }, e('b', { style: { fontSize: 14 } }, p.nome_prof), e('b', { style: { fontSize: 14 } }, fmtBRL(p.valor_calculado))),
                e('span', { style: { fontSize: 12, color: '#6b7280' } }, 'cód. ' + p.cod_prof + ' · cliente ' + (p.cod_cliente || '—') + ' · ' + fmtDia(p.data)),
                pill(p.status === 'pendente' ? 'ambar' : 'vermelho', mot, { alignSelf: 'flex-start' }));
            })),
          e('section', { 'aria-label': 'Detalhe da pendência', style: Object.assign({}, card, { flex: '999 1 520px', minWidth: 0, padding: 20 }) },
            sel ? e(Detalhe, { id: sel, podeDecidir: props.dados.pode_decidir, onMudou: function () { carregar(); props.onMudou(); } }) : null)));
  }

  // ───────────────────────── Configuração ─────────────────────────
  var REGRAS = [
    ['Planilha do garantido carregada para o dia', 'Sem a planilha, a rodada não roda (confere de novo no intervalo abaixo).'],
    ['BI do dia reimportado agora', 'Força a importação do dia analisado e espera terminar antes de calcular.'],
    ['Sem produção = não lança', 'Nenhuma entrega finalizada no dia.'],
    ['Produção abaixo do mínimo = não lança', 'Percentual configurável abaixo.'],
    ['Corrida em aberto = não lança', 'Qualquer OS do motoboy no dia sem finalização no BI.'],
    ['Insucesso com pedido de retorno = não lança', 'Insucesso sem pedido segue normal; pedido depois do crédito é barrado para o motoboy.'],
    ['“Não rodou” na planilha ou reprovado na Análise', 'Respeita a marcação manual da aba Garantido; “Lançado” lá conta como já pago.'],
    ['Motoboy ativo na Central', 'Cadastro desativado vai para decisão.'],
    ['Um crédito por motoboy por dia', 'Trava no banco antes de chamar a Mapp. Botão e rodada nunca lançam duas vezes.'],
    ['Resposta incerta da Mapp = para tudo', 'Timeout ou erro de rede: o crédito fica “conferir na Mapp”, sem reenviar sozinho.'],
  ];

  function Switch(props) {
    return e('button', { type: 'button', role: 'switch', 'aria-checked': !!props.on, 'aria-label': props.label, disabled: props.disabled, onClick: props.onClick,
      style: { flex: 'none', width: 46, height: 28, border: 'none', borderRadius: 999, background: props.on ? '#770fa8' : '#d1d5db', position: 'relative', cursor: props.disabled ? 'not-allowed' : 'pointer', opacity: props.disabled ? 0.6 : 1 } },
      e('span', { style: { position: 'absolute', top: 3, left: props.on ? 21 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', transition: 'left .15s' } }));
  }

  function Config(props) {
    var d = props.dados;
    var s1 = React.useState(Object.assign({}, d.config, { producao_min_pct: String(d.config.producao_min_pct).replace('.', ',') })), f = s1[0], setF = s1[1];
    var s2 = React.useState(false), salvando = s2[0], setSalvando = s2[1];
    var s3 = React.useState(null), msg = s3[0], setMsg = s3[1];
    var pode = d.pode_decidir;
    function set(k, v) { setF(function (o) { var n = Object.assign({}, o); n[k] = v; return n; }); }
    function salvar() {
      setSalvando(true); setMsg(null);
      api('/bi/gratificacao/config', { method: 'PUT', body: JSON.stringify({ ativo: f.ativo, horario: f.horario, espera_ate: f.espera_ate, intervalo_min: Number(f.intervalo_min), ambiente: f.ambiente, producao_min_pct: f.producao_min_pct }) })
        .then(function (c) { setF(Object.assign({}, c, { producao_min_pct: String(c.producao_min_pct).replace('.', ',') })); setMsg({ tipo: 'ok', texto: 'Configuração salva' }); props.onMudou(); })
        .catch(function (er) { setMsg({ tipo: 'erro', texto: er.message }); })
        .then(function () { setSalvando(false); });
    }
    var tokenOk = f.ambiente === 'homologacao' ? d.config.token_homologacao : d.config.token_producao;
    var sec = Object.assign({}, card, { padding: 18, display: 'flex', flexDirection: 'column', gap: 14 });
    var h = { fontFamily: SORA, fontSize: 15, color: '#3a1556' };
    var grid3 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 };
    var lblG = Object.assign({}, lbl, { fontSize: 13, color: '#111827', gap: 5 });
    var dica = { fontSize: 12, color: '#6b7280', fontWeight: 400 };
    var inpG = Object.assign({}, inp, { height: 42 });
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      !pode && e(Aviso, { aviso: { tipo: 'info', texto: 'Só quem tem a permissão “Liberar gratificação do garantido” pode mudar a configuração.' } }),
      e('section', { style: sec },
        e('b', { style: h }, 'Rodada automática'),
        e('div', { style: grid3 },
          e('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 } },
            e('span', { style: { display: 'flex', flexDirection: 'column', gap: 2 } }, e('b', null, 'Lançamento automático'), e('span', { style: dica }, f.ativo ? 'Ligado: lança os aprovados na Mapp' : 'Desligado: só calcula e lista')),
            e(Switch, { on: f.ativo, label: 'Lançamento automático', disabled: !pode, onClick: function () { set('ativo', !f.ativo); } })),
          e('label', { style: lblG }, 'Horário da rodada', e('input', { type: 'time', value: f.horario, disabled: !pode, onChange: function (ev) { set('horario', ev.target.value); }, style: inpG }), e('span', { style: dica }, 'Analisa sempre o dia anterior')),
          e('label', { style: lblG }, 'Ambiente da Mapp', e('select', { value: f.ambiente, disabled: !pode, onChange: function (ev) { set('ambiente', ev.target.value); }, style: inpG },
            e('option', { value: 'producao' }, 'Produção · tutts.com.br'), e('option', { value: 'homologacao' }, 'Homologação · mototaxionline.com')),
          e('span', { style: Object.assign({}, dica, { color: tokenOk ? '#047857' : '#b91c1c' }) }, tokenOk ? 'Token configurado no Railway' : 'Token não configurado no Railway (' + (f.ambiente === 'homologacao' ? 'MAPP_CREDITO_TOKEN_HOMOLOG' : 'MAPP_CREDITO_TOKEN') + ')'))),
        e('div', { style: grid3 },
          e('label', { style: lblG }, 'Esperar o BI até', e('input', { type: 'time', value: f.espera_ate, disabled: !pode, onChange: function (ev) { set('espera_ate', ev.target.value); }, style: inpG }), e('span', { style: dica }, 'Se a importação não fechar até lá, a rodada não lança e avisa')),
          e('label', { style: lblG }, 'Conferir a planilha de novo a cada', e('select', { value: String(f.intervalo_min), disabled: !pode, onChange: function (ev) { set('intervalo_min', ev.target.value); }, style: inpG },
            e('option', { value: '15' }, '15 minutos'), e('option', { value: '30' }, '30 minutos'), e('option', { value: '60' }, '1 hora')),
          e('span', { style: dica }, 'Enquanto a planilha do dia não tiver linhas')),
          e('label', { style: lblG }, 'Produção mínima', e('input', { type: 'text', inputMode: 'decimal', value: f.producao_min_pct, disabled: !pode, onChange: function (ev) { set('producao_min_pct', ev.target.value); }, style: inpG }), e('span', { style: dica }, '% do negociado; abaixo disso vai para decisão')))),
      e('section', { style: sec },
        e('b', { style: h }, 'Regras — qualquer uma que falhar manda para Pendências'),
        e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 } },
          REGRAS.map(function (r, i) {
            return e('div', { key: i, style: { display: 'flex', gap: 10, alignItems: 'flex-start', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 } },
              e('span', { style: { flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: '#770fa8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, ico('check', 12)),
              e('span', { style: { display: 'flex', flexDirection: 'column', gap: 2 } }, e('b', { style: { fontWeight: 600 } }, r[0]), e('span', { style: { fontSize: 12, color: '#6b7280', lineHeight: 1.45 } }, r[1])));
          }))),
      e('section', { style: sec },
        e('b', { style: h }, 'Quem é avisado e decide'),
        e('span', { style: { color: '#4b5563', lineHeight: 1.5 } }, 'Recebem o aviso no WhatsApp todos com a permissão ', e('b', null, 'Liberar gratificação do garantido'), ' (Configurações › Permissões ADM). Só eles veem os botões de lançar e recusar.'),
        e('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          (d.avisados || []).length ? d.avisados.map(function (a, i) { return e('span', { key: i, style: { border: '1px solid #e5e7eb', borderRadius: 999, padding: '6px 12px' } }, a.nome + (a.fone ? ' · ' + a.fone : ' · sem WhatsApp')); })
            : e('span', { style: { color: '#92400e' } }, 'Ninguém com a permissão ainda.'))),
      msg && e(Aviso, { aviso: msg, onFechar: function () { setMsg(null); } }),
      pode && e('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
        e('button', { type: 'button', disabled: salvando, style: desab(btnPri, salvando), onClick: salvar }, ico('save', 15), salvando ? 'Salvando…' : 'Salvar configuração')));
  }

  // ───────────────────────── Modais de rodada ─────────────────────────
  function ModalRodar(props) {
    var s1 = React.useState(ontemISO()), data = s1[0], setData = s1[1];
    var s2 = React.useState(false), env = s2[0], setEnv = s2[1];
    var s3 = React.useState(null), erro = s3[0], setErro = s3[1];
    var ativo = props.config.ativo;
    return e(Modal, { titulo: 'Rodar a gratificação agora', onFechar: props.onFechar },
      e('label', { style: Object.assign({}, lbl, { fontSize: 13, color: '#111827' }) }, 'Dia analisado',
        e('input', { type: 'date', value: data, max: ontemISO(), onChange: function (ev) { setData(ev.target.value); }, style: Object.assign({}, inp, { height: 42, width: 200 }) })),
      e('p', { style: { margin: 0, color: '#4b5563', lineHeight: 1.5 } }, ativo
        ? 'Reimporta o BI de ' + fmtDia(data) + ', aplica as regras e lança os aprovados na Mapp. Quem já recebeu ou já foi decidido nesse dia não é tocado.'
        : 'Reimporta o BI de ' + fmtDia(data) + ' e aplica as regras. Como o lançamento automático está desligado, os aprovados ficam aguardando o botão “Lançar aprovados”.'),
      erro && e(Aviso, { aviso: { tipo: 'erro', texto: erro }, onFechar: function () { setErro(null); } }),
      e('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' } },
        e('button', { type: 'button', style: btnSec, onClick: props.onFechar }, 'Cancelar'),
        e('button', { type: 'button', disabled: env || !data, style: desab(btnPri, env || !data), onClick: function () {
          setEnv(true); setErro(null);
          api('/bi/gratificacao/rodadas', { method: 'POST', body: JSON.stringify({ data: data }) })
            .then(function () { props.onOk('Rodada de ' + fmtDia(data) + ' iniciada. As etapas aparecem no quadro da rodada.'); })
            .catch(function (er) { setErro(er.message); setEnv(false); });
        } }, ico('play', 15), env ? 'Iniciando…' : 'Rodar ' + fmtDia(data))));
  }

  function ModalSimular(props) {
    var s1 = React.useState(ontemISO()), data = s1[0], setData = s1[1];
    var s2 = React.useState(false), env = s2[0], setEnv = s2[1];
    var s3 = React.useState(null), erro = s3[0], setErro = s3[1];
    var s4 = React.useState(null), res = s4[0], setRes = s4[1];
    var vivo = React.useRef(true);
    React.useEffect(function () { return function () { vivo.current = false; }; }, []);
    function simular() {
      setEnv(true); setErro(null); setRes(null);
      api('/bi/gratificacao/rodadas', { method: 'POST', body: JSON.stringify({ data: data, simulacao: true }) }).then(function (r) {
        var tent = 0;
        (function poll() {
          if (!vivo.current) return;
          api('/bi/gratificacao/rodadas/' + r.id).then(function (x) {
            if (x.status === 'concluida') { setRes(x.resumo); setEnv(false); }
            else if (x.status === 'falhou') { setErro(x.erro || 'A simulação não terminou'); setEnv(false); }
            else if (++tent > 40) { setErro('A simulação está demorando. Tente de novo em instantes.'); setEnv(false); }
            else setTimeout(poll, 1500);
          }).catch(function (er) { setErro(er.message); setEnv(false); });
        })();
      }).catch(function (er) { setErro(er.message); setEnv(false); });
    }
    var th = { padding: '8px', fontWeight: 600, textAlign: 'left', fontSize: 11.5, color: '#6b7280' };
    var td = { padding: '8px', borderTop: '1px solid #f3f4f6' };
    return e(Modal, { titulo: 'Simular a gratificação de um dia', onFechar: props.onFechar, largura: 820 },
      e('div', { style: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' } },
        e('label', { style: Object.assign({}, lbl, { fontSize: 13, color: '#111827' }) }, 'Dia', e('input', { type: 'date', value: data, max: ontemISO(), onChange: function (ev) { setData(ev.target.value); }, style: Object.assign({}, inp, { height: 42, width: 200 }) })),
        e('button', { type: 'button', disabled: env || !data, style: desab(btnPri, env || !data), onClick: simular }, ico('search', 15), env ? 'Simulando…' : 'Simular')),
      e('span', { style: { fontSize: 12.5, color: '#6b7280' } }, 'A simulação usa o BI como está agora, não reimporta e não lança nada na Mapp.'),
      erro && e(Aviso, { aviso: { tipo: 'erro', texto: erro }, onFechar: function () { setErro(null); } }),
      res && e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        e('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          pill('roxo', (res.a_lancar || 0) + ' lançariam · ' + fmtBRL(res.total_a_lancar)), pill('ambar', (res.pendente || 0) + ' para decisão'),
          pill('cinza', (res.acima || 0) + ' acima do mínimo'), res.externo ? pill('cinza', res.externo + ' já lançados na Análise') : null,
          res.recusado ? pill('cinza', res.recusado + ' reprovados na Análise') : null, res.ja_decididos ? pill('verde', res.ja_decididos + ' já lançados ou decididos') : null, res.sem_codigo ? pill('cinza', res.sem_codigo + ' sem código na planilha') : null),
        (res.lista || []).length > 0 && e('div', { style: { overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12, maxHeight: 420, overflowY: 'auto' } },
          e('table', { style: { width: '100%', borderCollapse: 'collapse', minWidth: 640, fontSize: 12.5 } },
            e('thead', null, e('tr', null, e('th', { style: th }, 'Motoboy'), e('th', { style: th }, 'Cliente'), e('th', { style: Object.assign({}, th, { textAlign: 'right' }) }, 'Produção'),
              e('th', { style: Object.assign({}, th, { textAlign: 'right' }) }, 'Gratificação'), e('th', { style: th }, 'Resultado'))),
            e('tbody', null, res.lista.map(function (l, i) {
              var r = l.decisao === 'a_lancar' ? pill('roxo', 'Lançaria')
                : l.decisao === 'pendente' ? pill('ambar', l.motivo_texto || 'Decisão')
                : l.decisao === 'ja_decidido' ? pill((ST[l.status_atual] || ST.recusado).tom, 'Já ' + ((ST[l.status_atual] || {}).label || l.status_atual).toLowerCase() + (l.id_caixa ? ' · caixa ' + l.id_caixa : ''))
                : l.decisao === 'externo' ? pill('cinza', 'Marcado como lançado na Análise') : pill('cinza', 'Reprovado na Análise');
              return e('tr', { key: i },
                e('td', { style: td }, e('b', { style: { fontWeight: 600 } }, l.nome), e('span', { style: { display: 'block', fontSize: 11.5, color: '#6b7280' } }, 'cód. ' + l.cod_prof)),
                e('td', { style: td }, l.cod_cliente),
                e('td', { style: Object.assign({}, td, { textAlign: 'right' }) }, l.valor_produzido == null ? fmtBRL(l.valor_negociado) + ' negociado' : fmtBRL(l.valor_produzido) + ' de ' + fmtBRL(l.valor_negociado), l.pct != null && e('span', { style: { display: 'block', fontSize: 11.5, color: '#6b7280' } }, pct(l.pct))),
                e('td', { style: Object.assign({}, td, { textAlign: 'right', fontWeight: 600 }) }, fmtBRL(l.valor)),
                e('td', { style: td }, r));
            }))))));
  }

  function ModalLancarAprovados(props) {
    var s1 = React.useState(false), env = s1[0], setEnv = s1[1];
    var s2 = React.useState(null), res = s2[0], setRes = s2[1];
    var s3 = React.useState(null), erro = s3[0], setErro = s3[1];
    var k = React.useState(props.kpis)[0]; // retrato de quando abriu (a lista recarrega depois de lançar)
    return e(Modal, { titulo: 'Lançar aprovados na Mapp', onFechar: props.onFechar },
      e('p', { style: { margin: 0, color: '#4b5563', lineHeight: 1.5 } }, k.a_lancar + (k.a_lancar === 1 ? ' gratificação passou' : ' gratificações passaram') + ' em todas as regras e ' + (k.a_lancar === 1 ? 'está' : 'estão') + ' aguardando (' + fmtBRL(k.valor_a_lancar) + '). Cada uma é lançada uma única vez; se a Mapp recusar o token, o envio para na hora.'),
      res && e(Aviso, { aviso: { tipo: res.msg || res.falhas || res.incertos ? 'erro' : 'ok', texto: res.lancados + (res.lancados === 1 ? ' lançada (' : ' lançadas (') + fmtBRL(res.valor) + ')' + (res.falhas ? ' · ' + res.falhas + ' recusadas pela Mapp' : '') + (res.incertos ? ' · ' + res.incertos + ' a conferir' : '') + (res.msg ? ' · ' + res.msg : '') }, onFechar: function () { setRes(null); } }),
      erro && e(Aviso, { aviso: { tipo: 'erro', texto: erro }, onFechar: function () { setErro(null); } }),
      e('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
        e('button', { type: 'button', style: btnSec, onClick: props.onFechar }, res ? 'Fechar' : 'Cancelar'),
        !res && e('button', { type: 'button', disabled: env, style: desab(btnPri, env), onClick: function () {
          setEnv(true);
          api('/bi/gratificacao/lancar-aprovados', { method: 'POST', body: '{}' }).then(function (r) { setRes(r); props.onMudou(); })
            .catch(function (er) { setErro(er.message); }).then(function () { setEnv(false); });
        } }, env ? 'Lançando…' : 'Lançar ' + fmtBRL(k.valor_a_lancar))));
  }

  // ───────────────────────── V2: blocos usados dentro da tela do Garantido ─────────────────────────
  // BIGarantidoV2.js monta: chip do automático + "Configurar pagamento", faixa da rodada, KPIs extras,
  // filtro "Pagamento", coluna Pagamento (CelulaPagamento), painel lateral (Drawer) e a sub-aba Histórico.

  function usePagamento(ini, fim) {
    var s1 = React.useState(null), dados = s1[0], setDados = s1[1];
    var s2 = React.useState(null), erro = s2[0], setErro = s2[1];
    var recarregar = React.useCallback(function () {
      var q = [];
      if (ini) q.push('data_inicio=' + ini);
      if (fim) q.push('data_fim=' + fim);
      return api('/bi/gratificacao/painel' + (q.length ? '?' + q.join('&') : '')).then(function (d) {
        window.__GRAT_MOTIVOS = d.motivos || {};
        setDados(d); setErro(null);
      }).catch(function (er) { setErro(er.message); });
    }, [ini, fim]);
    React.useEffect(function () { recarregar(); }, [recarregar]);
    var andando = !!(dados && dados.rodada && dados.rodada.status === 'aguardando');
    React.useEffect(function () {
      if (!andando) return undefined;
      var t = setInterval(recarregar, 8000);
      return function () { clearInterval(t); };
    }, [andando, recarregar]);
    var mapa = React.useMemo(function () {
      var m = {};
      ((dados && dados.creditos) || []).forEach(function (c) { m[Number(c.cod_prof) + '_' + c.data] = c; });
      return m;
    }, [dados]);
    return { dados: dados, erro: erro, recarregar: recarregar, mapa: mapa };
  }

  /** Situação de pagamento de uma linha do garantido. grupo: decidir | lancado | aguardando | recusado | sem */
  function classificar(row, pag, statusMap) {
    var cod = Number(row.cod_prof);
    var c = pag && pag.mapa ? pag.mapa[cod + '_' + row.data] : null;
    var dados = pag && pag.dados;
    var pode = !!(dados && dados.pode_decidir);
    var mot = window.__GRAT_MOTIVOS || {};
    if (c) {
      var quem = c.decidido_por_nome || '';
      switch (c.status) {
        case 'pendente': return { grupo: 'decidir', tom: 'ambar', label: 'Para decidir', sub: (mot[c.motivo] || 'Barrado por regra') + (c.motivo === 'producao_baixa' && c.pct != null ? ' (' + Math.round(c.pct) + '%)' : ''), acao: { texto: pode ? 'Decidir' : 'Ver', pri: pode, id: c.id } };
        case 'incerto': return { grupo: 'decidir', tom: 'vermelho', label: 'Conferir na Mapp', sub: 'Mapp não confirmou · não reenviado', acao: { texto: pode ? 'Conferir' : 'Ver', id: c.id } };
        case 'falhou': return { grupo: 'decidir', tom: 'vermelho', label: 'Mapp recusou', sub: c.mapp_mensagem || 'Nada foi creditado', acao: { texto: pode ? 'Decidir' : 'Ver', pri: pode, id: c.id } };
        case 'a_lancar': return { grupo: 'aguardando', tom: 'roxo', label: 'Aprovado · aguardando', sub: dados && dados.config && dados.config.ativo ? 'Passou nas regras · sai na rodada' : 'Passou nas regras · sai no “Lançar aprovados”', acao: { texto: 'Ver', id: c.id } };
        case 'lancando': return { grupo: 'aguardando', tom: 'azul', label: 'Enviando', sub: 'Lançando na Mapp agora', acao: null };
        case 'lancado': return { grupo: 'lancado', tom: 'verde', label: 'Lançado na Mapp', sub: (c.origem === 'manual' ? 'Manual · ' + (quem || '—') : 'Automático' + (c.lancado_em ? ' · ' + fmtHora(c.lancado_em) : '')) + (c.mapp_id_caixa ? ' · caixa ' + c.mapp_id_caixa : ''), acao: { texto: 'Ver', id: c.id, discreto: true } };
        case 'externo': return { grupo: 'lancado', tom: 'cinza', label: 'Pago fora do sistema', sub: quem ? quem + (c.justificativa ? ' · “' + c.justificativa + '”' : '') : 'Marcado como lançado na Análise', acao: { texto: 'Ver', id: c.id, discreto: true } };
        case 'recusado': return { grupo: 'recusado', tom: 'cinza', label: 'Recusado', sub: (quem || '—') + (c.justificativa ? ' · “' + c.justificativa + '”' : ''), acao: { texto: 'Ver', id: c.id, discreto: true } };
        default: return { grupo: 'aguardando', tom: 'cinza', label: c.status, sub: '', acao: { texto: 'Ver', id: c.id } };
      }
    }
    if (!(Number(row.complemento) > 0)) return { grupo: 'sem', tom: 'cinza', label: 'Sem complemento', sub: 'Produziu acima do mínimo', acao: null };
    var gs = statusMap ? statusMap[row.cod_prof + '_' + row.data + '_' + row.cod_cliente_garantido] : null;
    if (gs && gs.status === 'lancado') return { grupo: 'lancado', tom: 'cinza', label: 'Pago fora do sistema', sub: 'Marcado na Análise' + (gs.alterado_por ? ' · ' + gs.alterado_por : ''), acao: null };
    if (gs && gs.status === 'reprovado') return { grupo: 'recusado', tom: 'cinza', label: 'Reprovado', sub: gs.motivo_reprovado || 'Reprovado na Análise', acao: null };
    if (String(row.data) >= hojeISO()) return { grupo: 'aguardando', tom: 'cinza', label: 'Dia em andamento', sub: 'Entra na rodada de amanhã', acao: null };
    if (!cod) return { grupo: 'aguardando', tom: 'cinza', label: 'Sem código', sub: 'Planilha sem código do motoboy', acao: null };
    return { grupo: 'aguardando', tom: 'cinza', label: 'Aguardando rodada', sub: 'Ainda não passou pela rodada', acao: pode ? { texto: 'Lançar', preparar: true } : null };
  }

  function CelulaPagamento(props) {
    var info = props.info;
    var s1 = React.useState(false), ocupado = s1[0], setOcupado = s1[1];
    var btn = null;
    if (info.acao) {
      var st = info.acao.pri ? Object.assign({}, btnPri, { height: 34, padding: '0 12px', fontSize: 12.5 })
        : info.acao.discreto ? { height: 30, padding: '0 10px', border: 'none', borderRadius: 8, background: 'transparent', color: '#6b7280', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }
          : Object.assign({}, btnSec, { height: 34, padding: '0 12px', fontSize: 12.5 });
      btn = e('button', { type: 'button', disabled: ocupado, style: desab(st, ocupado), onClick: function () {
        if (info.acao.preparar) {
          setOcupado(true);
          api('/bi/gratificacao/preparar', { method: 'POST', body: JSON.stringify({ cod_prof: Number(props.row.cod_prof), data: props.row.data }) })
            .then(function (r) { props.onAbrir(r.id); props.onMudou && props.onMudou(); })
            .catch(function (er) { if (props.onErro) props.onErro(er.message); })
            .then(function () { setOcupado(false); });
        } else props.onAbrir(info.acao.id);
      } }, ocupado ? 'Abrindo…' : info.acao.texto);
    }
    return e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 280 } },
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start', minWidth: 0 } },
        pill(info.tom, info.label),
        info.sub && e('span', { title: info.sub, style: { fontSize: 11.5, color: '#6b7280', maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, info.sub)),
      btn);
  }

  function ChipAuto(props) {
    var d = props.dados; if (!d) return null;
    var c = d.config;
    return e('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
      e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '5px 12px', background: c.ativo ? '#f0fdf4' : '#f3f4f6', color: c.ativo ? '#166534' : '#374151', border: '1px solid ' + (c.ativo ? '#bbf7d0' : '#e5e7eb') } },
        e('span', { 'aria-hidden': 'true', style: { width: 7, height: 7, borderRadius: 999, background: c.ativo ? '#16a34a' : '#9ca3af' } }),
        c.ativo ? 'Lançamento automático ligado · todo dia ' + c.horario : 'Lançamento automático desligado'),
      e('button', { type: 'button', style: btnSec, onClick: props.onConfig }, ico('settings', 15), 'Configurar pagamento'));
  }

  function etapaCurta(r) {
    var et = r.etapas || {};
    return etapasDaRodada(r).map(function (s) {
      var curto = s.k === 'planilha' ? (et.planilha && et.planilha.ok ? 'Planilha · ' + et.planilha.motoboys + ' motoboys' : 'Planilha')
        : s.k === 'bi' ? (et.bi && et.bi.pulado ? 'BI atual (simulação)' : et.bi && et.bi.ok ? 'BI reimportado' + (et.bi.finalizado_em ? ' ' + fmtHora(et.bi.finalizado_em) : '') : 'BI reimportando')
          : s.k === 'calcular' ? 'Regras aplicadas'
            : (et.lancar && et.lancar.pulado ? 'Aprovados aguardando' : (et.lancar && et.lancar.lancados != null ? et.lancar.lancados + ' lançados na Mapp' : 'Créditos na Mapp'));
      return { k: s.k, estado: s.estado, texto: curto, det: s.det };
    });
  }

  function Faixa(props) {
    var d = props.dados; if (!d) return null;
    var r = d.rodada, k = d.kpis, pode = d.pode_decidir;
    var nPend = (k.pendentes || 0) + (k.incertos || 0) + (k.falhas || 0);
    var chip = !r ? null : r.status === 'aguardando' ? pill('ambar', 'Em andamento' + (r.proxima_tentativa_em ? ' · confere de novo ' + fmtHora(r.proxima_tentativa_em) : ''))
      : r.status === 'concluida' ? pill('verde', 'Rodada concluída ' + fmtHora(r.finalizada_em) + ' · ' + (r.origem === 'cron' ? 'automática' : 'manual'))
        : pill('vermelho', 'Não lançou');
    var avisados = (d.avisados || []).map(function (a) { return a.nome; });
    return e(React.Fragment, null,
      e('section', { 'aria-label': 'Rodada de pagamento', style: Object.assign({}, card, { padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }) },
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
            e('b', { style: { fontFamily: SORA, color: '#3a1556', fontSize: 14 } }, r ? 'Pagamento de ' + fmtDia(r.data) : 'Pagamento do garantido'),
            chip,
            r ? etapaCurta(r).map(function (s) {
              return e('span', { key: s.k, title: s.det, style: { display: 'inline-flex', alignItems: 'center', gap: 6, color: s.estado === 'futuro' ? '#9ca3af' : '#374151', fontSize: 12.5 } }, IconeEtapa(s.estado), s.texto);
            }) : e('span', { style: { color: '#6b7280' } }, d.config.ativo ? 'A primeira rodada roda às ' + d.config.horario + ' (dia anterior).' : 'Nenhuma rodada ainda. Rode um dia ou ligue o automático.')),
          pode && e('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            e('button', { type: 'button', style: Object.assign({}, btnSec, { height: 38 }), onClick: function () { props.setModal('simular'); } }, ico('search', 14), 'Simular outra data'),
            e('button', { type: 'button', disabled: !!(r && r.status === 'aguardando'), style: desab(Object.assign({}, btnPri, { height: 38 }), !!(r && r.status === 'aguardando')), onClick: function () { props.setModal('rodar'); } }, ico('play', 14), 'Rodar agora'))),
        r && r.status === 'falhou' && r.erro && e('div', { role: 'alert', style: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '8px 12px', fontSize: 12.5 } }, r.erro)),
      nPend > 0 && e('div', { role: 'status', style: { background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: '#92400e' } },
        e('span', null,
          e('b', null, (k.pendentes || 0) + (k.pendentes === 1 ? ' aguardando decisão' : ' aguardando decisão')),
          k.incertos ? ' · ' + k.incertos + ' a conferir na Mapp' : '', k.falhas ? ' · ' + k.falhas + ' recusados pela Mapp' : '',
          avisados.length ? ' · aviso no WhatsApp para ' + avisados.join(', ') : ''),
        e('button', { type: 'button', style: { height: 36, padding: '0 14px', border: '1px solid #f59e0b', borderRadius: 10, background: '#fff', color: '#92400e', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }, onClick: function () { props.setModal('pendencias'); } }, 'Abrir pendências')),
      !d.config.ativo && k.a_lancar > 0 && e('div', { style: { background: '#faf7fd', border: '1px solid #e9d5f9', borderRadius: 14, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
        e('span', { style: { color: '#3a1556' } }, e('b', null, k.a_lancar + (k.a_lancar === 1 ? ' aprovado aguardando lançamento' : ' aprovados aguardando lançamento')), ' · ' + fmtBRL(k.valor_a_lancar)),
        pode && e('button', { type: 'button', style: btnPri, onClick: function () { props.setModal('aprovados'); } }, 'Lançar aprovados')));
  }

  /** KPIs extras do período (sobre os créditos já gravados). */
  function resumoPeriodo(d) {
    var out = { lancado: 0, nLancado: 0, auto: 0, manual: 0, decidir: 0, nDecidir: 0, incertos: 0 };
    ((d && d.creditos) || []).forEach(function (c) {
      if (c.status === 'lancado') { out.lancado += Number(c.valor_lancado != null ? c.valor_lancado : c.valor_calculado) || 0; out.nLancado++; if (c.origem === 'manual') out.manual++; else out.auto++; }
      if (c.status === 'pendente' || c.status === 'incerto' || c.status === 'falhou') { out.decidir += Number(c.valor_calculado) || 0; out.nDecidir++; if (c.status === 'incerto') out.incertos++; }
    });
    return out;
  }

  function Drawer(props) {
    React.useEffect(function () {
      function esc(ev) { if (ev.key === 'Escape') props.onFechar(); }
      document.addEventListener('keydown', esc);
      return function () { document.removeEventListener('keydown', esc); };
    }, []);
    return e('div', { style: { position: 'fixed', inset: 0, zIndex: 60 } },
      e('div', { style: { position: 'absolute', inset: 0, background: 'rgba(17,24,39,.45)' }, onMouseDown: props.onFechar }),
      e('aside', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Pagamento do garantido', style: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 600, background: '#fff', boxShadow: '-20px 0 50px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column' } },
        e('div', { style: { padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          e('b', { style: { fontFamily: SORA, fontSize: 14, color: '#6b7280' } }, 'Pagamento do garantido'),
          e('button', { type: 'button', 'aria-label': 'Fechar', onClick: props.onFechar, style: { border: 'none', background: '#f3f4f6', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#374151' } }, ico('x', 15))),
        e('div', { style: { flex: 1, overflowY: 'auto', padding: '18px 22px 24px' } },
          e(Detalhe, { id: props.id, podeDecidir: props.podeDecidir, onMudou: props.onMudou }))));
  }

  /** Todos os modais/painéis do pagamento, controlados pela tela do Garantido. */
  function Modais(props) {
    var m = props.modal, d = props.dados, fechar = function () { props.setModal(null); };
    if (!m || !d) return null;
    if (m === 'rodar') return e(ModalRodar, { config: d.config, onFechar: fechar, onOk: function () { fechar(); setTimeout(props.recarregar, 600); } });
    if (m === 'simular') return e(ModalSimular, { onFechar: fechar });
    if (m === 'aprovados') return e(ModalLancarAprovados, { kpis: d.kpis, onFechar: fechar, onMudou: props.recarregar });
    if (m === 'pendencias') return e(Modal, { titulo: 'Pendências de pagamento', largura: 1180, onFechar: fechar }, e(Pendencias, { dados: d, onMudou: props.recarregar }));
    if (m === 'config') return e(Modal, { titulo: 'Configurar pagamento do garantido', largura: 1180, onFechar: fechar }, e(Config, { dados: d, onMudou: props.recarregar }));
    if (m && m.drawer) return e(Drawer, { id: m.drawer, podeDecidir: d.pode_decidir, onFechar: fechar, onMudou: props.recarregar });
    return null;
  }

  /** Sub-aba "Histórico de pagamentos": todos os créditos, automático x manual, quem fez. */
  function Historico() {
    var s1 = React.useState(null), dados = s1[0], setDados = s1[1];
    var s2 = React.useState(null), erro = s2[0], setErro = s2[1];
    var s3 = React.useState({ data_inicio: '', data_fim: '', origem: '', status: '', busca: '' }), filtros = s3[0], setFiltros = s3[1];
    var s4 = React.useState(null), det = s4[0], setDet = s4[1];
    var ref = React.useRef(filtros); ref.current = filtros;
    var carregar = React.useCallback(function () {
      var f = ref.current; var q = [];
      Object.keys(f).forEach(function (k) { if (f[k]) q.push(k + '=' + encodeURIComponent(f[k])); });
      return api('/bi/gratificacao/painel' + (q.length ? '?' + q.join('&') : '')).then(function (d) { window.__GRAT_MOTIVOS = d.motivos || {}; setDados(d); setErro(null); })
        .catch(function (er) { setErro(er.message); });
    }, []);
    React.useEffect(function () { carregar(); }, []);
    if (erro && !dados) return e('div', { role: 'alert', style: { padding: 24, color: '#991b1b' } }, erro);
    if (!dados) return e('div', { style: { padding: 40, textAlign: 'center', color: '#6b7280' } }, 'Carregando histórico…');
    var k = dados.kpis;
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, padding: 16 } },
      e('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        pill('verde', (k.lancados || 0) + ' lançados · ' + fmtBRL(k.valor_lancado)), pill('cinza', (k.lancados_auto || 0) + ' automáticos · ' + (k.lancados_manual || 0) + ' manuais'),
        k.retornos_barrados ? pill('azul', k.retornos_barrados + ' retornos barrados') : null),
      e(TabelaCreditos, { dados: dados, filtros: filtros, setFiltros: setFiltros, onFiltrar: carregar, onAbrir: setDet }),
      det && e(Drawer, { id: det, podeDecidir: dados.pode_decidir, onFechar: function () { setDet(null); }, onMudou: carregar }));
  }

  window.BIGrat = {
    usePagamento: usePagamento, classificar: classificar, CelulaPagamento: CelulaPagamento, ChipAuto: ChipAuto,
    Faixa: Faixa, Modais: Modais, Historico: Historico, resumoPeriodo: resumoPeriodo, fmtBRL: fmtBRL, pill: pill,
  };
})();
