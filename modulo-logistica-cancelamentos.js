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
 * HUB_ABAS_V1: visual no padrão clean (cabeçalho, filtros em card, tabela, pílulas).
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

  // HUB_ABAS_V1: pílula suave (fundo 50 + texto 800 + ponto 6px 600)
  const TOM = {
    roxo: ['#faf7fd', '#5d0b85', '#770fa8'], ambar: ['#fffbeb', '#92400e', '#d97706'], azul: ['#eff6ff', '#1e40af', '#2563eb'],
    verde: ['#f0fdf4', '#166534', '#16a34a'], vermelho: ['#fef2f2', '#991b1b', '#dc2626'], cinza: ['#f3f4f6', '#374151', '#9ca3af'],
  };
  const Pilula = (tom, texto, extra) => {
    const t = TOM[tom] || TOM.cinza;
    return h('span', Object.assign({ className: 'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap', style: { background: t[0], color: t[1] } }, extra || {}),
      h('span', { 'aria-hidden': 'true', style: { width: 6, height: 6, borderRadius: 99, background: t[2], flexShrink: 0 } }), texto);
  };

  // Origem -> rótulo + cor. Uma cor por origem, nada além disso.
  const ORIGENS = {
    central:     { rot: 'Central',     tom: 'roxo' },
    loja:        { rot: 'Loja',        tom: 'ambar' },
    solicitacao: { rot: 'Solicitação', tom: 'azul' },
  };
  const ESCOPOS = {
    ambos:   'Cancelar na central e na Mapp (Hub + Painel + Mapp)',
    central: 'Cancelar só na central (Hub + Painel; a OS volta pra fila da Mapp)',
    tutts:   'Corrida fora do Hub: cancelada direto na Mapp/Tutts',
    proprio: 'Moto própria: só saiu do painel (Mapp não é cancelada por API)',
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
  // RESULTADO_CLARO_V2: o que aconteceu em CADA sistema, em texto, sem ambiguidade.
  //   Hub    = provedor (99/Uber): a corrida do entregador parceiro foi cancelada?
  //   Painel = Central Tutts (esta tela): a corrida foi encerrada aqui?
  //   Mapp   = sistema Tutts/Mapp: a OS foi CANCELADA la, ou ficou EM ABERTO
  //            (reaberta na fila esperando motoboy)?
  // "Reaberta" nao e cancelada — por isso a palavra nao aparece mais como resultado.
  function resultadoSistemas(c) {
    const hub = c.escopo === 'tutts'
      ? { sis: 'Hub', estado: 'na', rot: 'não passou pelo Hub', msg: 'Corrida fora do Hub (motoboy Tutts)' }
      : c.escopo === 'proprio'
        ? { sis: 'Hub', estado: 'na', rot: 'moto própria', msg: 'Sem corrida em provedor' }
        : c.provider_cancelado === false
          ? { sis: 'Hub', estado: 'nao', rot: 'NÃO cancelou no ' + provNome(c.provider_code), msg: c.provider_msg || 'O provedor não confirmou o cancelamento' }
          : { sis: 'Hub', estado: 'ok', rot: 'cancelada no ' + provNome(c.provider_code), msg: c.provider_msg || 'Provedor confirmou' };
    const painel = { sis: 'Painel', estado: 'ok', rot: 'cancelada na Central', msg: 'Registrada aqui como cancelada' };
    let mapp;
    if (c.tutts_cancelado === true) mapp = { sis: 'Mapp', estado: 'ok', rot: 'cancelada na Mapp', msg: 'Tutts confirmou o cancelamento da OS' };
    else if (c.escopo === 'central') mapp = { sis: 'Mapp', estado: 'aberta', rot: 'EM ABERTO na Mapp', msg: 'Escopo "só na central": a OS foi reaberta na fila da Mapp e segue esperando motoboy' };
    else if (c.escopo === 'proprio') mapp = { sis: 'Mapp', estado: 'aberta', rot: 'EM ABERTO na Mapp', msg: 'Moto própria: só saiu do painel. Cancele na Mapp manualmente' };
    else if (c.tutts_cancelado === false) mapp = { sis: 'Mapp', estado: 'nao', rot: 'NÃO cancelou na Mapp', msg: 'Tutts recusou: ' + (c.tutts_msg || 'erro') + (c.mapp_reaberta ? ' — a OS ficou reaberta na fila' : '') };
    else mapp = { sis: 'Mapp', estado: 'na', rot: 'sem retorno da Mapp', msg: c.tutts_msg || 'Sem OS vinculada ou sem resposta' };
    return [hub, painel, mapp];
  }
  const EST_CLS = {
    ok:     { txt: 'text-green-800', dot: 'bg-green-600', ic: '✓' },
    nao:    { txt: 'text-red-800',   dot: 'bg-red-600',   ic: '✕' },
    aberta: { txt: 'text-amber-800', dot: 'bg-amber-600', ic: '!' },
    na:     { txt: 'text-gray-500',  dot: 'bg-gray-300',  ic: '–' },
  };
  function Resultado({ c }) {
    return h('div', { className: 'flex flex-col gap-0.5 whitespace-nowrap' },
      resultadoSistemas(c).map(r => {
        const e = EST_CLS[r.estado];
        return h('div', { key: r.sis, title: r.msg, className: 'flex items-center gap-1.5 text-[11.5px] ' + e.txt },
          h('span', { className: 'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + e.dot }),
          h('span', { className: 'font-semibold w-[44px] text-gray-500' }, r.sis),
          h('span', { className: r.estado === 'na' ? 'font-normal' : 'font-semibold' }, r.rot));
      }));
  }
  const resultadoTexto = (c) => resultadoSistemas(c).map(r => r.sis + ': ' + r.rot).join(' · ');

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
      const cab = ['Data/hora', 'OS', 'Cliente', 'Origem', 'Quem cancelou', 'Motivo', 'Estado da corrida', 'Provedor', 'Entregador', 'Escopo', 'Hub', 'Painel', 'Mapp', 'Obs provedor', 'Obs Tutts', 'Coleta', 'Entrega'];
      const linhas = itens.map(c => [
        fmtDT(c.criado_em), c.codigo_os || '', c.cliente_nome || '', (ORIGENS[c.origem] || {}).rot || c.origem,
        c.cancelado_por_nome || '', c.motivo || '', statusRot(c.status_antes), provNome(c.provider_code), c.entregador_nome || '',
        ESCOPOS[c.escopo] || c.escopo || '', ...resultadoSistemas(c).map(r => r.rot),
        c.provider_msg || '', c.tutts_msg || '', c.endereco_coleta || '', c.endereco_entrega || '',
      ].map(csvEscape).join(';'));
      const blob = new Blob(['﻿' + [cab.join(';')].concat(linhas).join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cancelamentos-hub-${de}-a-${ate}.csv`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    };

    // HUB_ABAS_V1: origem como segmentado (ativo branco sobre cinza), com contagem
    const chipOrigem = (id, rot, n) => h('button', {
      key: id || 'todas', type: 'button',
      onClick: () => setOrigem(id),
      'aria-pressed': origem === id,
      className: 'px-3 py-[7px] rounded-lg text-[13px] whitespace-nowrap '
        + (origem === id ? 'bg-white text-gray-900 font-semibold' : 'text-gray-500 hover:text-gray-800'),
    }, rot, n != null && h('span', { className: 'ml-1.5 text-gray-400 font-normal', style: { fontVariantNumeric: 'tabular-nums' } }, n));
    const CTL = 'h-[38px] px-3 border border-gray-200 rounded-[10px] bg-white text-[13px] text-gray-800 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100';

    return h('div', { className: 'max-w-7xl mx-auto px-4 py-5 md:px-6 md:py-6 space-y-4' },
      // Cabeçalho — HUB_ABAS_V1
      h('div', { className: 'flex items-end justify-between gap-3 flex-wrap' },
        h('div', null,
          h('h1', { className: 'text-2xl font-bold text-gray-900', style: { fontFamily: 'Sora, Inter, sans-serif', letterSpacing: '-0.01em' } }, 'Cancelamentos'),
          h('p', { className: 'text-[13px] text-gray-500 mt-1' },
            (r.total != null ? `${r.total} no período · ` : ''),
            'todo cancelamento de corrida, com motivo e quem cancelou — Central, loja ou cliente.'),
        ),
        h('div', { className: 'flex items-center gap-2' },
          h('button', { type: 'button', onClick: carregar, title: 'Atualizar', 'aria-label': 'Atualizar', className: 'w-10 h-10 grid place-items-center border border-gray-200 bg-white rounded-[10px] hover:bg-gray-50 text-gray-700' }, Ico('refresh')),
          h('button', { type: 'button', onClick: exportarCSV, className: 'h-10 px-4 inline-flex items-center gap-1.5 text-sm font-semibold border border-gray-200 bg-white rounded-[10px] hover:bg-gray-50 text-gray-700' }, Ico('download', 16), 'Exportar CSV'),
        ),
      ),

      // Filtros
      h('div', { className: 'bg-white rounded-[14px] border border-gray-200 p-2.5 flex flex-wrap items-center gap-2' },
        h('label', { className: 'flex items-center gap-2 h-[38px] px-3 border border-gray-200 rounded-[10px] text-gray-400 focus-within:border-purple-400', style: { flex: '1 1 260px', minWidth: 0 } },
          Ico('search'),
          h('input', {
            type: 'search', value: busca, 'aria-label': 'Buscar cancelamento',
            onChange: ev => setBusca(ev.target.value),
            onKeyDown: ev => { if (ev.key === 'Enter') setBuscaAplicada(busca.trim()); },
            placeholder: 'OS, cliente, motivo ou quem cancelou',
            className: 'flex-1 min-w-0 border-0 outline-none bg-transparent text-[13px] text-gray-900',
          })),
        h('button', { type: 'button', onClick: () => setBuscaAplicada(busca.trim()), className: 'h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50' }, 'Buscar'),
        h('div', { role: 'group', 'aria-label': 'Origem', className: 'inline-flex bg-gray-100 rounded-[10px] p-[3px] overflow-x-auto max-w-full' },
          chipOrigem('', 'Todas', r.total),
          chipOrigem('central', 'Central', r.central),
          chipOrigem('loja', 'Loja', r.loja),
          chipOrigem('solicitacao', 'Solicitação', r.solicitacao),
        ),
        h('div', { className: 'inline-flex items-center gap-1.5' },
          h('label', { className: 'text-xs text-gray-500', htmlFor: 'canc-de' }, 'De'),
          h('input', { id: 'canc-de', type: 'date', value: de, onChange: ev => setDe(ev.target.value), className: CTL }),
          h('label', { className: 'text-xs text-gray-500', htmlFor: 'canc-ate' }, 'até'),
          h('input', { id: 'canc-ate', type: 'date', value: ate, onChange: ev => setAte(ev.target.value), className: CTL })),
      ),

      // Estado
      erro && h('div', { role: 'alert', className: 'bg-red-50 border border-red-200 text-red-800 rounded-[14px] px-4 py-3 text-sm flex items-center justify-between gap-3' },
        h('span', null, erro), h('button', { type: 'button', onClick: carregar, className: 'text-sm font-semibold underline' }, 'Tentar de novo')),

      loading
        ? h('div', { className: 'bg-white rounded-[14px] border border-gray-200 overflow-hidden' },
            [0, 1, 2, 3, 4].map(i => h('div', { key: i, className: 'px-4 py-3 border-t first:border-t-0 border-gray-100 flex gap-3 animate-pulse' },
              h('div', { className: 'h-3 w-20 bg-gray-100 rounded' }), h('div', { className: 'h-3 w-16 bg-gray-100 rounded' }), h('div', { className: 'h-3 w-40 bg-gray-100 rounded' }), h('div', { className: 'h-3 flex-1 bg-gray-100 rounded' }))))
        : !erro && itens.length === 0
          ? h('div', { className: 'bg-white rounded-[14px] border border-gray-200 py-14 px-6 text-center' },
              h('div', { className: 'text-gray-700 font-semibold' }, buscaAplicada || origem ? 'Nenhum cancelamento com esses filtros' : 'Nenhum cancelamento no período'),
              h('div', { className: 'text-[13px] text-gray-500 mt-1' }, buscaAplicada || origem ? 'Limpe a busca ou troque a origem.' : 'Quando uma corrida for cancelada, ela aparece aqui com motivo e autor.'),
              (buscaAplicada || origem) && h('button', { type: 'button', onClick: () => { setBusca(''); setBuscaAplicada(''); setOrigem(''); }, className: 'mt-4 h-10 px-4 rounded-[10px] border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50' }, 'Limpar filtros'))
          : h('div', { className: 'bg-white rounded-[14px] border border-gray-200 overflow-hidden' },
              h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-[13px] min-w-[1180px]' },
                  h('thead', null,
                    h('tr', { className: 'bg-gray-50 text-xs font-semibold text-gray-500 text-left' },
                      ['Quando', 'OS', 'Cliente', 'Origem', 'Quem cancelou', 'Motivo', 'Estava em', 'Entregador', 'Onde foi cancelada'].map(t =>
                        h('th', { key: t, className: 'px-3 py-2.5 whitespace-nowrap' }, t)))),
                  h('tbody', null,
                    itens.map(c => {
                      const o = ORIGENS[c.origem] || { rot: c.origem, tom: 'cinza' };
                      const exp = aberto === c.id;
                      return h(React.Fragment, { key: c.id },
                        h('tr', {
                          className: 'border-t border-gray-100 align-top cursor-pointer ' + (exp ? '' : 'hover:bg-gray-50'),
                          style: exp ? { background: '#faf7fd' } : null,
                          tabIndex: 0, 'aria-expanded': exp,
                          onKeyDown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setAberto(exp ? null : c.id); } },
                          onClick: () => setAberto(exp ? null : c.id),
                          title: exp ? 'Recolher' : 'Ver endereços e detalhes',
                        },
                          h('td', { className: 'px-3 py-2.5 whitespace-nowrap text-gray-700 text-xs', style: { fontVariantNumeric: 'tabular-nums' } }, fmtDT(c.criado_em)),
                          h('td', { className: 'px-3 py-2.5 whitespace-nowrap font-semibold text-gray-900', style: { fontVariantNumeric: 'tabular-nums' } }, c.codigo_os ? String(c.codigo_os) : '—',
                            h('div', { className: 'text-[11px] font-normal text-gray-500' }, provNome(c.provider_code))),
                          h('td', { className: 'px-3 py-2.5 text-gray-800 max-w-[200px] truncate' , title: c.cliente_nome || '' }, c.cliente_nome || '—'),
                          h('td', { className: 'px-3 py-2.5 whitespace-nowrap' }, Pilula(o.tom, o.rot)),
                          h('td', { className: 'px-3 py-2.5 text-gray-700 max-w-[160px] truncate', title: c.cancelado_por_nome || '' }, c.cancelado_por_nome || '—'),
                          h('td', { className: 'px-3 py-2.5 text-gray-700 min-w-[220px] max-w-[320px]' }, h('div', { className: exp ? '' : 'line-clamp-2' }, c.motivo || '—')),
                          h('td', { className: 'px-3 py-2.5 whitespace-nowrap' }, Pilula('cinza', statusRot(c.status_antes))),
                          h('td', { className: 'px-3 py-2.5 text-gray-700 text-xs max-w-[140px] truncate', title: c.entregador_nome || '' }, c.entregador_nome || '—'),
                          h('td', { className: 'px-3 py-2.5' }, h(Resultado, { c })),
                        ),
                        exp && h('tr', { style: { background: '#faf7fd' } },
                          h('td', { colSpan: 9, className: 'px-3 pb-3 pt-0' },
                            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4 text-[12.5px] text-gray-700 border-t border-gray-200 pt-3' },
                              h('div', null, h('div', { className: 'text-xs font-semibold text-gray-500 mb-0.5' }, 'Coleta'), c.endereco_coleta || '—'),
                              h('div', null, h('div', { className: 'text-xs font-semibold text-gray-500 mb-0.5' }, 'Entrega'), c.endereco_entrega || '—'),
                              h('div', null,
                                h('div', { className: 'text-xs font-semibold text-gray-500 mb-0.5' }, 'Como foi cancelada'),
                                h('div', null, ESCOPOS[c.escopo] || c.escopo || '—'),
                                c.provider_msg && h('div', { className: 'mt-1 text-red-800' }, 'Provedor: ', c.provider_msg),
                                c.tutts_msg && h('div', { className: 'mt-1 text-red-800' }, 'Tutts: ', c.tutts_msg),
                                h('div', { className: 'mt-1 text-gray-500' }, 'Registro #', c.id, c.delivery_id ? ' · entrega ' + c.delivery_id : '', c.solicitacao_id ? ' · solicitação ' + c.solicitacao_id : ''),
                              ),
                            ))),
                      );
                    }),
                  ),
                ),
              ),
              h('div', { className: 'px-3 py-2.5 border-t border-gray-100 text-[11.5px] text-gray-500 flex items-center justify-between flex-wrap gap-2' },
                h('span', null, itens.length + ' registro' + (itens.length === 1 ? '' : 's') + (dados.resumo && dados.resumo.total > itens.length ? ' de ' + dados.resumo.total + ' (refine o período)' : '')),
                h('span', { className: 'flex items-center gap-3 flex-wrap' },
                  h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-1.5 h-1.5 rounded-full bg-green-600' }), 'cancelada'),
                  h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-1.5 h-1.5 rounded-full bg-amber-600' }), 'em aberto (esperando motoboy)'),
                  h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-1.5 h-1.5 rounded-full bg-red-600' }), 'não cancelou'),
                  h('span', null, '· clique na linha pra ver detalhes')),
              ),
            ),
    );
  }

  window.ModuloLogisticaCancelamentos = ModuloLogisticaCancelamentos;
})();
