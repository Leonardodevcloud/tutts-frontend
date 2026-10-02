/**
 * modulo-logistica-cancelamentos.js — CANCEL_HISTORICO_V1
 * ─────────────────────────────────────────────────────────────────────────
 * Aba "Cancelamentos" do Hub Logístico (admin). Histórico de TODO cancelamento
 * de corrida, seja ele feito pela Central, pela loja (painel.html) ou pelo
 * cliente do portal de solicitação (solicitacao.html):
 *   • filtros: período, origem (chips), busca por OS / cliente / motivo / quem
 *   • KPIs do período: total e quebra por origem
 *   • tabela com OS, cliente, origem, quem cancelou, motivo, estado em que a
 *     corrida estava, entregador e o resultado em cada sistema (provedor / Mapp / Tutts)
 *   • exportação CSV do que está na tela
 *
 * Dados: GET /logistics/cancelamentos?de&ate&origem&busca
 *
 * Expõe window.ModuloLogisticaCancelamentos. Props: { API_URL, fetchAuth, showToast }.
 */
(function () {
  'use strict';
  const h = React.createElement;
  const { useState, useEffect, useMemo, useCallback } = React;

  const TZ = 'America/Sao_Paulo';
  const Ico = (nome, sz) => h('svg', { className: 'ico', style: sz ? { width: sz, height: sz } : null, 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));

  function hojeISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function diasAtrasISO(n) {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDT(v) {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '—';
    try {
      return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(d).replace(',', '');
    } catch (_) { return '—'; }
  }

  // Origem -> rótulo + cor. Uma cor por origem, nada além disso.
  const ORIGENS = {
    central:     { rot: 'Central',     cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    loja:        { rot: 'Loja',        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    solicitacao: { rot: 'Solicitação', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  };
  const ESCOPOS = {
    ambos:   'Painel + Mapp/Tutts',
    central: 'Só painel (OS reaberta na Mapp)',
    tutts:   'Direto na Tutts (fora do Hub)',
    proprio: 'Moto própria (só painel)',
  };
  const PROV = { noventanove: '99', '99': '99', uber: 'Uber', proprio: 'Moto própria', tutts: 'Tutts' };
  const provNome = (p) => PROV[String(p || '').toLowerCase()] || (p || '—');

  // Status canônico -> texto curto do estado em que a corrida estava.
  const STATUS_ROT = {
    PENDING: 'Aguardando', QUOTED: 'Cotando', DISPATCHED: 'Procurando entregador',
    COURIER_ASSIGNED: 'Entregador atribuído', PICKUP_EN_ROUTE: 'A caminho da coleta', ARRIVED_PICKUP: 'Na coleta',
    PICKED_UP: 'Coletou', DROPOFF_EN_ROUTE: 'Em rota', ARRIVED_DROPOFF: 'Na entrega',
    RETURNING: 'Devolvendo', MOTO_PROPRIA: 'Moto própria',
    pendente: 'Pendente', enviado: 'Enviada', aceito: 'Aceita', em_andamento: 'Em andamento',
  };
  const statusRot = (s) => STATUS_ROT[s] || (s ? String(s).replace(/_/g, ' ').toLowerCase() : '—');

  // Resultado por sistema: um ponto por sistema, sem texto repetido.
  function Resultado({ c }) {
    const itens = [];
    if (c.escopo === 'tutts') {
      itens.push({ k: 'Tutts', ok: c.tutts_cancelado, msg: c.tutts_msg });
    } else if (c.escopo === 'proprio') {
      itens.push({ k: 'Painel', ok: true });
    } else {
      itens.push({ k: 'Provedor', ok: c.provider_cancelado, msg: c.provider_msg });
      itens.push({ k: 'Mapp', ok: c.mapp_reaberta, msg: c.mapp_reaberta ? 'OS reaberta' : null });
      if (c.escopo === 'ambos') itens.push({ k: 'Tutts', ok: c.tutts_cancelado, msg: c.tutts_msg });
    }
    return h('div', { className: 'flex flex-wrap gap-1' },
      itens.map(it => h('span', {
        key: it.k,
        title: it.msg || (it.ok === true ? 'OK' : it.ok === false ? 'Não confirmou' : 'Sem retorno'),
        className: 'inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded border '
          + (it.ok === true ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : it.ok === false ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-gray-50 text-gray-500 border-gray-200'),
      },
        h('span', { className: 'w-1.5 h-1.5 rounded-full ' + (it.ok === true ? 'bg-emerald-500' : it.ok === false ? 'bg-red-500' : 'bg-gray-400') }),
        it.k)),
    );
  }

  function csvEscape(v) {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function ModuloLogisticaCancelamentos({ API_URL, fetchAuth, showToast }) {
    const [de, setDe] = useState(diasAtrasISO(30));
    const [ate, setAte] = useState(hojeISO());
    const [origem, setOrigem] = useState('');
    const [busca, setBusca] = useState('');
    const [buscaAplicada, setBuscaAplicada] = useState('');
    const [dados, setDados] = useState({ itens: [], resumo: { total: 0, central: 0, loja: 0, solicitacao: 0 } });
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [aberto, setAberto] = useState(null); // id da linha expandida (endereços)

    const carregar = useCallback(async () => {
      setLoading(true); setErro(null);
      try {
        const qs = [];
        if (de) qs.push('de=' + encodeURIComponent(de));
        if (ate) qs.push('ate=' + encodeURIComponent(ate));
        if (origem) qs.push('origem=' + encodeURIComponent(origem));
        if (buscaAplicada) qs.push('busca=' + encodeURIComponent(buscaAplicada));
        qs.push('limite=1000');
        const res = await fetchAuth(`${API_URL}/logistics/cancelamentos?${qs.join('&')}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Erro ao carregar');
        setDados({ itens: json.itens || [], resumo: json.resumo || { total: 0, central: 0, loja: 0, solicitacao: 0 } });
      } catch (e) {
        setErro(e.message || 'Não foi possível carregar o histórico.');
      } finally { setLoading(false); }
    }, [API_URL, fetchAuth, de, ate, origem, buscaAplicada]);

    useEffect(() => { carregar(); }, [carregar]);

    const itens = dados.itens;
    const r = dados.resumo || {};

    const exportarCSV = () => {
      if (!itens.length) { showToast && showToast('Nada pra exportar com os filtros atuais', 'warning'); return; }
      const cab = ['Data/hora', 'OS', 'Cliente', 'Origem', 'Quem cancelou', 'Motivo', 'Estado da corrida', 'Provedor', 'Entregador', 'Escopo', 'Provedor cancelou', 'Mapp reaberta', 'Tutts cancelou', 'Obs provedor', 'Obs Tutts', 'Coleta', 'Entrega'];
      const simNao = (v) => v === true ? 'sim' : v === false ? 'não' : '';
      const linhas = itens.map(c => [
        fmtDT(c.criado_em), c.codigo_os || '', c.cliente_nome || '', (ORIGENS[c.origem] || {}).rot || c.origem,
        c.cancelado_por_nome || '', c.motivo || '', statusRot(c.status_antes), provNome(c.provider_code), c.entregador_nome || '',
        ESCOPOS[c.escopo] || c.escopo || '', simNao(c.provider_cancelado), simNao(c.mapp_reaberta), simNao(c.tutts_cancelado),
        c.provider_msg || '', c.tutts_msg || '', c.endereco_coleta || '', c.endereco_entrega || '',
      ].map(csvEscape).join(';'));
      const blob = new Blob(['﻿' + [cab.join(';')].concat(linhas).join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cancelamentos-hub-${de}-a-${ate}.csv`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    };

    const chipOrigem = (id, rot, n) => h('button', {
      key: id || 'todas', type: 'button',
      onClick: () => setOrigem(id),
      'aria-pressed': origem === id,
      className: 'text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors '
        + (origem === id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'),
    }, rot, n != null && h('span', { className: 'ml-1.5 opacity-70 font-normal' }, n));

    return h('div', { className: 'max-w-7xl mx-auto p-4 space-y-4' },
      // Cabeçalho
      h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
        h('div', null,
          h('h2', { className: 'text-2xl font-bold text-gray-800 flex items-center gap-2' }, Ico('ban'), 'Cancelamentos'),
          h('p', { className: 'text-sm text-gray-500 mt-0.5' }, 'Todo cancelamento de corrida, com motivo e quem cancelou — Central, loja ou cliente.'),
        ),
        h('div', { className: 'flex items-center gap-2' },
          h('button', { type: 'button', onClick: carregar, title: 'Atualizar', 'aria-label': 'Atualizar', className: 'w-9 h-9 inline-flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600' }, Ico('refresh')),
          h('button', { type: 'button', onClick: exportarCSV, className: 'inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700' }, Ico('download', 16), 'Exportar CSV'),
        ),
      ),

      // Filtros
      h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-end gap-3' },
        h('label', { className: 'text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex flex-col gap-1' }, 'De',
          h('input', { type: 'date', value: de, onChange: ev => setDe(ev.target.value), className: 'text-sm font-normal normal-case tracking-normal border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 focus:border-purple-400 focus:outline-none' })),
        h('label', { className: 'text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex flex-col gap-1' }, 'Até',
          h('input', { type: 'date', value: ate, onChange: ev => setAte(ev.target.value), className: 'text-sm font-normal normal-case tracking-normal border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 focus:border-purple-400 focus:outline-none' })),
        h('div', { className: 'flex items-center gap-1.5 flex-wrap' },
          chipOrigem('', 'Todas', r.total),
          chipOrigem('central', 'Central', r.central),
          chipOrigem('loja', 'Loja', r.loja),
          chipOrigem('solicitacao', 'Solicitação', r.solicitacao),
        ),
        h('label', { className: 'text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex flex-col gap-1 flex-1 min-w-[220px]' }, 'Buscar',
          h('div', { className: 'flex gap-1.5' },
            h('input', {
              type: 'search', value: busca,
              onChange: ev => setBusca(ev.target.value),
              onKeyDown: ev => { if (ev.key === 'Enter') setBuscaAplicada(busca.trim()); },
              placeholder: 'OS, cliente, motivo ou quem cancelou',
              className: 'flex-1 text-sm font-normal normal-case tracking-normal border border-gray-200 rounded-lg px-3 py-1.5 focus:border-purple-400 focus:outline-none',
            }),
            h('button', { type: 'button', onClick: () => setBuscaAplicada(busca.trim()), className: 'text-sm font-semibold px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 normal-case tracking-normal' }, 'Buscar'),
          )),
      ),

      // Estado
      erro && h('div', { role: 'alert', className: 'bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3' },
        h('span', null, erro), h('button', { type: 'button', onClick: carregar, className: 'text-sm font-semibold underline' }, 'Tentar de novo')),

      loading
        ? h('div', { className: 'bg-white rounded-xl border border-gray-200 overflow-hidden' },
            [0, 1, 2, 3, 4].map(i => h('div', { key: i, className: 'px-4 py-3 border-t first:border-t-0 border-gray-100 flex gap-3 animate-pulse' },
              h('div', { className: 'h-3 w-20 bg-gray-100 rounded' }), h('div', { className: 'h-3 w-16 bg-gray-100 rounded' }), h('div', { className: 'h-3 w-40 bg-gray-100 rounded' }), h('div', { className: 'h-3 flex-1 bg-gray-100 rounded' }))))
        : !erro && itens.length === 0
          ? h('div', { className: 'bg-white rounded-xl border border-gray-200 py-14 text-center' },
              h('div', { className: 'text-gray-700 font-semibold' }, buscaAplicada || origem ? 'Nenhum cancelamento com esses filtros' : 'Nenhum cancelamento no período'),
              h('div', { className: 'text-sm text-gray-400 mt-1' }, buscaAplicada || origem ? 'Limpe a busca ou troque a origem.' : 'Quando uma corrida for cancelada, ela aparece aqui com motivo e autor.'),
              (buscaAplicada || origem) && h('button', { type: 'button', onClick: () => { setBusca(''); setBuscaAplicada(''); setOrigem(''); }, className: 'mt-3 text-sm font-semibold text-purple-700 hover:underline' }, 'Limpar filtros'))
          : h('div', { className: 'bg-white rounded-xl border border-gray-200 overflow-hidden' },
              h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-sm min-w-[1040px]' },
                  h('thead', null,
                    h('tr', { className: 'bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-left' },
                      ['Quando', 'OS', 'Cliente', 'Origem', 'Quem cancelou', 'Motivo', 'Estava em', 'Entregador', 'Resultado'].map(t =>
                        h('th', { key: t, className: 'px-3 py-2.5 whitespace-nowrap' }, t)))),
                  h('tbody', null,
                    itens.map(c => {
                      const o = ORIGENS[c.origem] || { rot: c.origem, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
                      const exp = aberto === c.id;
                      return h(React.Fragment, { key: c.id },
                        h('tr', {
                          className: 'border-t border-gray-100 hover:bg-gray-50 align-top cursor-pointer',
                          onClick: () => setAberto(exp ? null : c.id),
                          title: exp ? 'Recolher' : 'Ver endereços e detalhes',
                        },
                          h('td', { className: 'px-3 py-2.5 whitespace-nowrap text-gray-600 text-xs' }, fmtDT(c.criado_em)),
                          h('td', { className: 'px-3 py-2.5 whitespace-nowrap font-bold text-gray-800' }, c.codigo_os ? String(c.codigo_os) : '—',
                            h('div', { className: 'text-[10.5px] font-normal text-gray-400' }, provNome(c.provider_code))),
                          h('td', { className: 'px-3 py-2.5 text-gray-800 max-w-[200px] truncate' , title: c.cliente_nome || '' }, c.cliente_nome || '—'),
                          h('td', { className: 'px-3 py-2.5 whitespace-nowrap' }, h('span', { className: 'inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ' + o.cls }, o.rot)),
                          h('td', { className: 'px-3 py-2.5 text-gray-700 max-w-[160px] truncate', title: c.cancelado_por_nome || '' }, c.cancelado_por_nome || '—'),
                          h('td', { className: 'px-3 py-2.5 text-gray-700 max-w-[320px]' }, h('div', { className: exp ? '' : 'line-clamp-2' }, c.motivo || '—')),
                          h('td', { className: 'px-3 py-2.5 whitespace-nowrap text-gray-600 text-xs' }, statusRot(c.status_antes)),
                          h('td', { className: 'px-3 py-2.5 text-gray-600 text-xs max-w-[140px] truncate', title: c.entregador_nome || '' }, c.entregador_nome || '—'),
                          h('td', { className: 'px-3 py-2.5' }, h(Resultado, { c })),
                        ),
                        exp && h('tr', { className: 'bg-gray-50/70' },
                          h('td', { colSpan: 9, className: 'px-3 pb-3 pt-0' },
                            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600 border-t border-dashed border-gray-200 pt-3' },
                              h('div', null, h('div', { className: 'text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5' }, 'Coleta'), c.endereco_coleta || '—'),
                              h('div', null, h('div', { className: 'text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5' }, 'Entrega'), c.endereco_entrega || '—'),
                              h('div', null,
                                h('div', { className: 'text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5' }, 'Como foi cancelada'),
                                h('div', null, ESCOPOS[c.escopo] || c.escopo || '—'),
                                c.provider_msg && h('div', { className: 'mt-1 text-red-700' }, 'Provedor: ', c.provider_msg),
                                c.tutts_msg && h('div', { className: 'mt-1 text-red-700' }, 'Tutts: ', c.tutts_msg),
                                h('div', { className: 'mt-1 text-gray-400' }, 'Registro #', c.id, c.delivery_id ? ' · entrega ' + c.delivery_id : '', c.solicitacao_id ? ' · solicitação ' + c.solicitacao_id : ''),
                              ),
                            ))),
                      );
                    }),
                  ),
                ),
              ),
              h('div', { className: 'px-3 py-2 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between' },
                h('span', null, itens.length + ' registro' + (itens.length === 1 ? '' : 's') + (dados.resumo && dados.resumo.total > itens.length ? ' de ' + dados.resumo.total + ' (refine o período)' : '')),
                h('span', null, 'Clique numa linha pra ver endereços e detalhes'),
              ),
            ),
    );
  }

  window.ModuloLogisticaCancelamentos = ModuloLogisticaCancelamentos;
})();
