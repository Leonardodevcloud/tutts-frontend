/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DEEMOJI_V1 */
/* GERENCIAL_CLEAN_V1: redesign clean do módulo Análise Gerencial — cabeçalho Sora 24px,
   abas sublinhadas, faixa única de KPIs, tabelas no padrão (cabeçalho #f9fafb, linhas
   border-top #f3f4f6, números tabular-nums à direita), variações com ícone do sprite em
   verde/vermelho 800, gráficos SVG na paleta, cards brancos sem sombra/borda colorida.
   Chamadas de API, estados, handlers, ordenação e regras de cálculo intactos. */
// ══════════════════════════════════════════════════
// Módulo: Análise Gerencial Semanal v2 (com Config)
// ══════════════════════════════════════════════════
(function() {
  'use strict';
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useCallback = React.useCallback;

  // Formatação BR
  function fN(n) { return n == null ? '-' : Number(n).toLocaleString('pt-BR'); }
  function fD(n, d) { return n == null ? '-' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d||2, maximumFractionDigits: d||2 }); }
  function fR(n) { return n == null ? '-' : 'R$ ' + fD(n); }
  function fP(n) { return n == null ? '-' : fD(n) + '%'; }
  function corV(v) { return v == null ? '#9ca3af' : v >= 0 ? '#166534' : '#991b1b'; }
  function setaV(v) { return v == null ? '—' : (v >= 0 ? '↑ ' : '↓ ') + fD(Math.abs(v)); }

  // ═══ GERENCIAL_CLEAN_V1: helpers visuais ═══
  var SORA = 'Sora, Inter, sans-serif';
  var TAB = { fontVariantNumeric: 'tabular-nums' };
  var CARD = 'bg-white border border-gray-200 rounded-[14px]';
  function ico(nome, size, extra) {
    return h('svg', { className: 'ico', style: Object.assign({ width: size || 16, height: size || 16, flex: 'none' }, extra || {}), 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));
  }
  // Variação: ícone trendup/trenddown + valor com sinal, verde/vermelho tom 800.
  // invertido = cair é bom (ex.: tempo médio).
  function Var(v, sufixo, invertido, casas) {
    if (v == null) return h('span', { style: { color: '#9ca3af' } }, '—');
    var bom = invertido ? v <= 0 : v >= 0;
    var cor = bom ? '#166534' : '#991b1b';
    return h('span', { style: Object.assign({ display: 'inline-flex', alignItems: 'center', gap: 4, color: cor, fontWeight: 600, whiteSpace: 'nowrap' }, TAB) },
      ico(v >= 0 ? 'trendup' : 'trenddown', 14),
      (v >= 0 ? '+' : '−') + fD(Math.abs(v), casas) + (sufixo || '')
    );
  }
  function ppV(v) { return Var(v, ' pp'); }
  // % no prazo: tom 800 da família (verde ≥ 90, âmbar ≥ 75, vermelho abaixo)
  function corPrazo(p) { return p >= 90 ? '#166534' : p >= 75 ? '#92400e' : '#991b1b'; }
  function thStyle(align, extra) {
    return Object.assign({ textAlign: align || 'right', fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f9fafb', padding: '10px 12px', whiteSpace: 'nowrap' }, extra || {});
  }
  function TH(label, align, key, extra) { return h('th', { key: key, style: thStyle(align, extra) }, label); }
  var TD_CLS = 'px-3 py-2.5 text-right whitespace-nowrap';
  var ROW_ST = { borderTop: '1px solid #f3f4f6' };
  var TOTAL_ST = { borderTop: '1px solid #e5e7eb', background: '#f9fafb' };
  function Pilula(txt, tom, title) {
    var T = { verde: ['#f0fdf4', '#166534', '#16a34a'], ambar: ['#fffbeb', '#92400e', '#d97706'], vermelho: ['#fef2f2', '#991b1b', '#dc2626'], roxo: ['#faf7fd', '#5d0b85', '#770fa8'], cinza: ['#f3f4f6', '#374151', '#9ca3af'] }[tom] || ['#f3f4f6', '#374151', '#9ca3af'];
    return h('span', { title: title || null, style: { display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '2px 9px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', background: T[0], color: T[1] } },
      h('span', { 'aria-hidden': 'true', style: { width: 6, height: 6, borderRadius: 999, background: T[2], flex: 'none' } }), txt);
  }
  function Vazio(txt, cor) {
    return h('div', { className: 'text-center py-10 px-4 text-sm', style: { color: cor || '#6b7280' } }, txt);
  }
  // Faixa única de KPIs: um card, células divididas por linhas #f3f4f6
  function FaixaKpi(p) {
    return h('section', { className: CARD + ' overflow-hidden' },
      h('div', { className: 'grid ' + (p.cols || 'grid-cols-2 md:grid-cols-3'), style: { gap: 1, background: '#f3f4f6' } }, p.children));
  }
  function KpiCelula(p) {
    return h('div', { className: 'px-4 py-3.5 md:px-5 md:py-4', style: { background: '#ffffff', minWidth: 0 }, title: p.tip || null },
      h('div', { style: { fontSize: 12, color: '#6b7280' } }, p.label),
      h('div', { style: Object.assign({ fontFamily: SORA, fontSize: 'clamp(18px, 4.6vw, 24px)', fontWeight: 700, color: '#111827', lineHeight: 1.25, margin: '4px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, TAB) }, p.valor),
      h('div', { style: { fontSize: 11.5, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 17 } }, p.sub || null)
    );
  }

  // ═══ Hook de ordenação ═══
  function useSort(defaultKey, defaultDir) {
    var _st = useState({ key: defaultKey || null, dir: defaultDir || 'desc' }), sort = _st[0], setSort = _st[1];
    var toggle = function(key) {
      setSort(function(prev) {
        if (prev.key === key) return { key: key, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
        return { key: key, dir: 'desc' };
      });
    };
    return [sort, toggle];
  }

  function SortTH(label, sortKey, currentSort, onSort, align) {
    var isActive = currentSort.key === sortKey;
    var arrow = isActive ? (currentSort.dir === 'desc' ? ' ↓' : ' ↑') : '';
    return h('th', {
      key: sortKey,
      onClick: function() { onSort(sortKey); },
      'aria-sort': isActive ? (currentSort.dir === 'desc' ? 'descending' : 'ascending') : 'none',
      className: 'cursor-pointer select-none hover:bg-gray-100 transition-colors',
      style: thStyle(align || 'right', isActive ? { color: '#5d0b85' } : null),
    }, label + arrow);
  }

  function sortRows(rows, sort, getVal) {
    if (!sort.key) return rows;
    var sorted = rows.slice().sort(function(a, b) {
      var va = getVal(a, sort.key), vb = getVal(b, sort.key);
      if (va == null) return 1; if (vb == null) return -1;
      if (typeof va === 'string') return va.localeCompare(vb);
      return va - vb;
    });
    return sort.dir === 'desc' ? sorted.reverse() : sorted;
  }

  // ═══ SLA Table ═══
  function SlaTable(p) {
    var rows = p.rows || [];
    var _sort = useSort('entregas', 'desc'), sort = _sort[0], toggleSort = _sort[1];

    if (!rows.length) return Vazio(p.empty || 'Sem dados. Configure os clientes na aba Configurações.');

    var tot = { e: 0, np: 0, fp: 0, ts: 0, tc: 0 };
    rows.forEach(function(r) { tot.e += r.entregas; tot.np += r.no_prazo; tot.fp += r.fora_prazo; if (r.tempo_medio > 0) { tot.ts += r.tempo_medio * r.entregas; tot.tc += r.entregas; } });

    var sorted = sortRows(rows, sort, function(r, k) {
      if (k === 'nome') return parseInt(r.cod_cliente) || parseInt((r.nome || '').match(/^\d+/)) || 0;
      if (k === 'entregas') return r.entregas;
      if (k === 'no_prazo') return r.no_prazo;
      if (k === 'prazo_pct') return r.prazo_pct;
      if (k === 'fora_prazo') return r.fora_prazo;
      if (k === 'fora_pct') return r.entregas > 0 ? r.fora_prazo / r.entregas : 0;
      if (k === 'tempo_medio') return r.tempo_medio || 0;
      if (k === 'var_pp') return r.var_pp != null ? r.var_pp : -999;
      return 0;
    });

    var TD = function(v, s) { return h('td', { className: TD_CLS, style: Object.assign({}, TAB, { color: '#374151' }, s || {}) }, v); };
    var totPct = tot.e > 0 ? r2(tot.np / tot.e * 100) : 0;
    return h('div', { className: 'overflow-x-auto' },
      h('table', { className: 'w-full border-collapse', style: { fontSize: 13 } },
        h('thead', null, h('tr', null,
          SortTH('Cliente', 'nome', sort, toggleSort, 'left'),
          SortTH('Entregas', 'entregas', sort, toggleSort),
          SortTH('No prazo', 'no_prazo', sort, toggleSort),
          SortTH('% Prazo', 'prazo_pct', sort, toggleSort),
          SortTH('Fora', 'fora_prazo', sort, toggleSort),
          SortTH('% Fora', 'fora_pct', sort, toggleSort),
          SortTH('T. médio', 'tempo_medio', sort, toggleSort),
          SortTH('Var. pp', 'var_pp', sort, toggleSort)
        )),
        h('tbody', null,
          sorted.map(function(r, i) {
            var fp = r.entregas > 0 ? fP(r2(r.fora_prazo / r.entregas * 100)) : '0%';
            return h('tr', { key: i, className: 'hover:bg-gray-50', style: ROW_ST },
              h('td', { className: 'px-3 py-2.5 font-medium text-gray-900 max-w-[240px] truncate', title: r.nome || r.concat }, r.nome || r.concat),
              TD(fN(r.entregas), { fontWeight: 600, color: '#111827' }), TD(fN(r.no_prazo)),
              TD(fP(r.prazo_pct), { fontWeight: 600, color: corPrazo(r.prazo_pct) }), TD(fN(r.fora_prazo)),
              TD(fp), TD(r.tempo_medio > 0 ? fD(r.tempo_medio, 0) + ' min' : '—'),
              h('td', { className: TD_CLS }, ppV(r.var_pp))
            );
          }),
          h('tr', { style: TOTAL_ST },
            h('td', { className: 'px-3 py-2.5 font-semibold text-gray-900' }, 'Total'),
            TD(fN(tot.e), { fontWeight: 700, color: '#111827' }), TD(fN(tot.np), { fontWeight: 600 }),
            TD(fP(totPct), { fontWeight: 700, color: tot.np / tot.e >= .85 ? '#166534' : '#92400e' }),
            TD(fN(tot.fp), { fontWeight: 600 }),
            TD(fP(tot.e > 0 ? r2(tot.fp/tot.e*100) : 0), { fontWeight: 600 }),
            TD(tot.tc > 0 ? fD(tot.ts/tot.tc, 0) + ' min' : '—', { fontWeight: 600 }),
            TD('—', { color: '#9ca3af' })
          )
        )
      )
    );
  }

  // ═══ Comp Table (Ticket / Demanda) ═══
  function CompTable(p) {
    var sl = p.semanas || [], allRows = p.clientes || [];
    var demandaRows = p.demandaClientes || null; // Para calcular ticket médio ponderado
    var fmt = p.tipo === 'ticket' ? fR : fN;
    var _sort = useSort('variacao', 'desc'), sort = _sort[0], toggleSort = _sort[1];

    if (!allRows.length) return Vazio('Sem dados');

    var sorted = sortRows(allRows, sort, function(r, k) {
      if (k === 'nome') return parseInt((r.nome || '').match(/^\d+/)) || 0;
      if (k === 'variacao') return r.variacao != null ? r.variacao : -9999;
      // sem0..sem3
      var semIdx = parseInt(k.replace('sem', ''));
      if (!isNaN(semIdx) && r.semanas[semIdx] != null) return r.semanas[semIdx];
      return 0;
    }).slice(0, 100);

    // Calcular totais por semana
    var totSemanas = sl.map(function(_, i) {
      if (p.tipo === 'ticket' && demandaRows) {
        // Ticket médio ponderado: SUM(ticket * entregas) / SUM(entregas)
        var somaFat = 0, somaEnt = 0;
        allRows.forEach(function(r) {
          var ticket = r.semanas[i];
          // Encontrar entregas deste cliente na mesma semana
          var demR = demandaRows.find(function(d) { return d.concat === r.concat; });
          var ent = demR ? (demR.semanas[i] || 0) : 0;
          if (ticket != null && ent > 0) {
            somaFat += ticket * ent;
            somaEnt += ent;
          }
        });
        return somaEnt > 0 ? r2(somaFat / somaEnt) : null;
      } else {
        // Demanda: soma simples
        var soma = 0, temDado = false;
        allRows.forEach(function(r) {
          if (r.semanas[i] != null) { soma += r.semanas[i]; temDado = true; }
        });
        return temDado ? soma : null;
      }
    });
    // Variação do total
    var li = totSemanas.length - 1;
    var totVar = null;
    if (li >= 1 && totSemanas[li] != null && totSemanas[li-1] != null && totSemanas[li-1] > 0) {
      totVar = r2((totSemanas[li] - totSemanas[li-1]) / totSemanas[li-1] * 100);
    }

    return h('div', { className: 'overflow-x-auto' },
      h('table', { className: 'w-full border-collapse', style: { fontSize: 13 } },
        h('thead', null, h('tr', null,
          SortTH('Cliente', 'nome', sort, toggleSort, 'left'),
          sl.map(function(s, i) { return SortTH(s, 'sem' + i, sort, toggleSort); }),
          SortTH('Var. %', 'variacao', sort, toggleSort)
        )),
        h('tbody', null,
          sorted.map(function(r, i) {
            return h('tr', { key: i, className: 'hover:bg-gray-50', style: ROW_ST },
              h('td', { className: 'px-3 py-2.5 font-medium text-gray-900 max-w-[240px] truncate', title: r.nome }, r.nome),
              r.semanas.map(function(v, j) {
                var ult = j === r.semanas.length - 1;
                return h('td', { key: j, className: TD_CLS, style: Object.assign({}, TAB, { color: v != null ? (ult ? '#111827' : '#374151') : '#d1d5db', fontWeight: ult ? 600 : 400 }) }, v != null ? fmt(v) : '—');
              }),
              h('td', { className: TD_CLS }, Var(r.variacao, '%'))
            );
          }),
          // Linha TOTAL
          h('tr', { style: TOTAL_ST },
            h('td', { className: 'px-3 py-2.5 font-semibold text-gray-900' }, 'Total'),
            totSemanas.map(function(v, j) {
              return h('td', { key: j, className: TD_CLS, style: Object.assign({}, TAB, { fontWeight: 700, color: v != null ? '#111827' : '#d1d5db' }) }, v != null ? fmt(v) : '—');
            }),
            h('td', { className: TD_CLS }, Var(totVar, '%'))
          )
        )
      )
    );
  }

  // ═══ Evolução Semanal por Loja (Item #3) ═══
  // Cores das séries só da paleta: principal roxo, comparações azul/âmbar, depois tons das mesmas famílias.
  var CORES_SERIE = ['#770fa8', '#2563eb', '#d97706', '#c084e6', '#1e40af', '#92400e', '#5d0b85', '#6b7280', '#166534', '#991b1b'];
  function EvolucaoChart(p) {
    var evolData = p.data; // { semanas: ['03/03',...], lojas: [{nome, entregas:[], prazo_pct:[], tempo_medio:[], entregadores:[]}] }
    // GERENCIAL_CLEAN_V1: hooks antes do retorno antecipado (ordem estável de hooks)
    var _metric = useState('prazo_pct'), metric = _metric[0], setMetric = _metric[1];
    var _expanded = useState(false), expanded = _expanded[0], setExpanded = _expanded[1];
    if (!evolData || !evolData.lojas || evolData.lojas.length === 0) return null;
    var semanas = evolData.semanas || [];
    var lojas = evolData.lojas || [];

    if (!expanded) {
      return h('div', { className: 'px-3 py-2.5', style: { borderTop: '1px solid #f3f4f6' } },
        h('button', {
          onClick: function() { setExpanded(true); },
          className: 'inline-flex items-center gap-1.5 text-[13px] font-semibold rounded-lg px-2 py-1 hover:bg-purple-50 transition-colors',
          style: { color: '#770fa8' }
        }, ico('chart', 15), 'Ver evolução semanal por loja (' + lojas.length + ' lojas, ' + semanas.length + ' semanas)')
      );
    }

    var cores = CORES_SERIE;
    var metricLabels = { entregas: 'Entregas', prazo_pct: 'No Prazo %', tempo_medio: 'Tempo Médio (min)', entregadores: 'Entregadores' };

    // Calcular min/max para escala
    var allVals = [];
    lojas.forEach(function(l) { (l[metric] || []).forEach(function(v) { if (v > 0) allVals.push(v); }); });
    var maxV = Math.max.apply(null, allVals.concat([1]));
    var minV = metric === 'prazo_pct' ? Math.max(0, Math.min.apply(null, allVals.concat([100])) - 5) : 0;
    var range = maxV - minV || 1;

    var W = 600, H = 200, padL = 50, padR = 20, padT = 10, padB = 30;
    var chartW = W - padL - padR, chartH = H - padT - padB;
    var stepX = semanas.length > 1 ? chartW / (semanas.length - 1) : chartW;

    function yPos(v) { return padT + chartH - ((v - minV) / range) * chartH; }

    return h('div', { className: 'p-4', style: { borderTop: '1px solid #f3f4f6' } },
      h('div', { className: 'flex flex-wrap items-center justify-between gap-3 mb-3' },
        h('div', { className: 'flex items-center gap-2' },
          h('span', { style: { fontSize: 14, fontWeight: 600, color: '#111827' } }, 'Evolução semanal por loja'),
          h('button', { onClick: function() { setExpanded(false); }, 'aria-label': 'Fechar evolução semanal', title: 'Fechar', className: 'w-7 h-7 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700' }, ico('x', 15))
        ),
        // Metric toggle (segmentado)
        h('div', { className: 'inline-flex flex-wrap rounded-[10px] p-0.5', style: { background: '#f3f4f6' } },
          Object.keys(metricLabels).map(function(m) {
            var on = metric === m;
            return h('button', {
              key: m,
              onClick: function() { setMetric(m); },
              'aria-pressed': on,
              className: 'px-2.5 py-1 text-xs rounded-lg transition-colors',
              style: on ? { background: '#ffffff', color: '#5d0b85', fontWeight: 600, boxShadow: 'inset 0 0 0 1px #e5e7eb' } : { color: '#6b7280', fontWeight: 500 }
            }, metricLabels[m]);
          })
        )
      ),
      // SVG Chart
      h('svg', { width: '100%', viewBox: '0 0 ' + W + ' ' + H, style: { maxHeight: 240 }, role: 'img', 'aria-label': 'Evolução semanal — ' + metricLabels[metric] },
        // Grid lines
        [0, 0.25, 0.5, 0.75, 1].map(function(pct, i) {
          var y = padT + chartH * (1 - pct);
          var val = minV + range * pct;
          return h('g', { key: i },
            h('line', { x1: padL, y1: y, x2: W - padR, y2: y, stroke: '#f3f4f6', strokeWidth: 1 }),
            h('text', { x: padL - 6, y: y + 3, textAnchor: 'end', fontSize: 9, fill: '#6b7280' }, metric === 'prazo_pct' ? fD(val, 0) + '%' : fN(Math.round(val)))
          );
        }),
        // X labels
        semanas.map(function(s, i) {
          return h('text', { key: i, x: padL + i * stepX, y: H - 6, textAnchor: 'middle', fontSize: 9, fill: '#6b7280' }, s);
        }),
        // Lines per loja
        lojas.map(function(loja, li) {
          var vals = loja[metric] || [];
          var cor = cores[li % cores.length];
          var points = vals.map(function(v, i) { return (padL + i * stepX) + ',' + yPos(v || 0); }).join(' ');
          return h('g', { key: li },
            h('polyline', { points: points, fill: 'none', stroke: cor, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
            vals.map(function(v, i) {
              return h('circle', { key: i, cx: padL + i * stepX, cy: yPos(v || 0), r: 3, fill: cor, stroke: 'white', strokeWidth: 1.5 },
                h('title', null, loja.nome + ' · ' + (semanas[i] || '') + ': ' + (metric === 'prazo_pct' ? fP(v) : fN(v))));
            })
          );
        })
      ),
      // Legend
      h('div', { className: 'flex flex-wrap gap-x-4 gap-y-1.5 mt-2' },
        lojas.map(function(loja, li) {
          return h('div', { key: li, className: 'flex items-center gap-1.5 text-xs' },
            h('span', { 'aria-hidden': 'true', style: { width: 8, height: 8, borderRadius: 999, background: cores[li % cores.length], flex: 'none' } }),
            h('span', { className: 'truncate', style: { maxWidth: 160, color: '#374151' } }, loja.nome)
          );
        })
      )
    );
  }

  // ═══ Garantido Table ═══
  function GarantidoTable(p) {
    var rows = (p.rows || []).filter(function(r) { return r.produzido > 0 || r.complemento > 0; });
    var _sort = useSort('negociado', 'desc'), sort = _sort[0], toggleSort = _sort[1];

    if (!rows.length) return Vazio('Sem dados');

    var tot = { n: 0, p: 0, c: 0, f: 0, s: 0 };
    rows.forEach(function(r) { tot.n += r.negociado; tot.p += r.produzido; tot.c += r.complemento; tot.f += r.fat_liquido; tot.s += r.saldo; });

    var sorted = sortRows(rows, sort, function(r, k) {
      if (k === 'nome') return parseInt((r.nome || '').match(/^\d+/)) || 0;
      if (k === 'negociado') return r.negociado;
      if (k === 'produzido') return r.produzido;
      if (k === 'complemento') return r.complemento;
      if (k === 'fat_liquido') return r.fat_liquido;
      if (k === 'saldo') return r.saldo;
      return 0;
    });

    var TD = function(v, s) { return h('td', { className: TD_CLS, style: Object.assign({}, TAB, { color: '#374151' }, s || {}) }, v); };
    return h('div', { className: 'overflow-x-auto' },
      h('table', { className: 'w-full border-collapse', style: { fontSize: 13 } },
        h('thead', null, h('tr', null,
          SortTH('Cliente', 'nome', sort, toggleSort, 'left'),
          SortTH('Negociado', 'negociado', sort, toggleSort),
          SortTH('Produzido', 'produzido', sort, toggleSort),
          SortTH('Complemento', 'complemento', sort, toggleSort),
          SortTH('Fat. líquido', 'fat_liquido', sort, toggleSort),
          SortTH('Saldo', 'saldo', sort, toggleSort)
        )),
        h('tbody', null,
          sorted.map(function(r, i) {
            return h('tr', { key: i, className: 'hover:bg-gray-50', style: ROW_ST },
              h('td', { className: 'px-3 py-2.5 font-medium text-gray-900' }, r.nome || ('Cliente ' + r.cod_cliente)),
              TD(fR(r.negociado)),
              TD(fR(r.produzido)),
              TD(fR(r.complemento), { color: r.complemento > 0 ? '#92400e' : '#6b7280', fontWeight: r.complemento > 0 ? 600 : 400 }),
              TD(fR(r.fat_liquido), { fontWeight: 600, color: '#111827' }),
              TD(fR(r.saldo), { fontWeight: 700, color: r.saldo >= 0 ? '#166534' : '#991b1b' })
            );
          }),
          h('tr', { style: TOTAL_ST },
            h('td', { className: 'px-3 py-2.5 font-semibold text-gray-900' }, 'Total'),
            TD(fR(tot.n), { fontWeight: 600 }),
            TD(fR(tot.p), { fontWeight: 600 }),
            TD(fR(tot.c), { fontWeight: 600, color: '#92400e' }),
            TD(fR(tot.f), { fontWeight: 700, color: '#111827' }),
            TD(fR(tot.s), { fontWeight: 700, color: tot.s >= 0 ? '#166534' : '#991b1b' })
          )
        )
      )
    );
  }

  // Cabeçalho de seção do relatório (âncora do menu lateral)
  function Secao(p) {
    return h('div', { id: p.id || null, className: (p.primeira ? 'mt-0' : 'mt-8') + ' mb-3 scroll-mt-24' },
      h('h2', { style: { fontFamily: SORA, fontSize: 18, fontWeight: 600, color: '#111827', lineHeight: 1.35 } }, p.titulo),
      p.sub ? h('p', { style: { fontSize: 13, color: '#6b7280', marginTop: 2 } }, p.sub) : null
    );
  }

  // ═══ CONFIG VIEW ═══
  function ConfigView(p) {
    var fetchApi = p.fetchApi;
    var _cl = useState([]), clientes = _cl[0], setClientes = _cl[1];
    var _cfg = useState([]), config = _cfg[0], setConfig = _cfg[1];
    var _grupo = useState('porto_seco'), grupo = _grupo[0], setGrupo = _grupo[1];
    var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];
    var _search = useState(''), search = _search[0], setSearch = _search[1];
    var _expanded = useState({}), expanded = _expanded[0], setExpanded = _expanded[1];
    var _openPS = useState(true), openPS = _openPS[0], setOpenPS = _openPS[1];
    var _openOut = useState(true), openOut = _openOut[0], setOpenOut = _openOut[1];
    var _adding = useState(false), adding = _adding[0], setAdding = _adding[1];

    var carregar = useCallback(function() {
      setLoading(true);
      Promise.all([fetchApi('/gerencial/clientes-disponiveis'), fetchApi('/gerencial/config')])
        .then(function(r) {
          if (r[0].success) setClientes(r[0].clientes || []);
          if (r[1].success) setConfig(r[1].grupos || []);
          setLoading(false);
        }).catch(function() { setLoading(false); });
    }, [fetchApi]);

    useEffect(function() { carregar(); }, [carregar]);

    var psItems = config.filter(function(c) { return c.grupo === 'porto_seco'; });
    var outItems = config.filter(function(c) { return c.grupo === 'outros'; });

    // Checar se um cliente+cc já está no grupo atual
    function isConfigured(cod, cc) {
      return config.some(function(c) { return c.grupo === grupo && c.cod_cliente === cod && (c.centro_custo || '') === (cc || ''); });
    }

    function getConfigId(cod, cc) {
      var found = config.find(function(c) { return c.grupo === grupo && c.cod_cliente === cod && (c.centro_custo || '') === (cc || ''); });
      return found ? found.id : null;
    }

    var toggleExpand = function(cod) {
      setExpanded(function(prev) { var n = Object.assign({}, prev); n[cod] = !n[cod]; return n; });
    };

    var toggleItem = function(cod, cc, nome) {
      var configId = getConfigId(cod, cc);
      if (configId) {
        fetchApi('/gerencial/config/' + configId, { method: 'DELETE' }).then(function() { carregar(); });
      } else {
        var displayName = nome + (cc ? ' - ' + cc : '');
        fetchApi('/gerencial/config', {
          method: 'POST',
          body: JSON.stringify({ grupo: grupo, cod_cliente: parseInt(cod), centro_custo: cc || '', nome_display: displayName }),
        }).then(function() { carregar(); });
      }
    };

    var remover = function(id) {
      fetchApi('/gerencial/config/' + id, { method: 'DELETE' }).then(function() { carregar(); });
    };

    var filtrados = clientes.filter(function(c) {
      if (!search) return true;
      var s = search.toLowerCase();
      return String(c.cod_cliente).indexOf(s) !== -1 || (c.nome || '').toLowerCase().indexOf(s) !== -1 || (c.mascara || '').toLowerCase().indexOf(s) !== -1;
    });

    if (loading) return h('div', { className: CARD }, Vazio('Carregando configurações...'));

    var codTag = function(cod) {
      return h('span', { style: Object.assign({ fontSize: 12, fontWeight: 600, color: '#374151', background: '#f3f4f6', borderRadius: 6, padding: '1px 6px', flex: 'none' }, TAB) }, cod);
    };
    var chk = { width: 16, height: 16, accentColor: '#770fa8', cursor: 'pointer', flex: 'none' };

    // ── Collapsible Group Card ──
    function GrupoCard(titulo, icone, items, isOpen, toggle) {
      return h('div', { className: CARD + ' mb-4 overflow-hidden' },
        // Header clicável
        h('button', {
          type: 'button',
          onClick: toggle,
          'aria-expanded': isOpen,
          className: 'w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors',
        },
          h('div', { className: 'flex items-center gap-2' },
            h('h3', { style: { fontSize: 15, fontWeight: 600, color: '#111827' } }, titulo),
            h('span', { style: Object.assign({ fontSize: 12, fontWeight: 600, color: '#374151', background: '#f3f4f6', borderRadius: 999, padding: '1px 8px' }, TAB) }, items.length)
          ),
          ico('arrowdown', 16, { color: '#6b7280', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' })
        ),
        // Conteúdo expansível
        isOpen ? h('div', { style: { borderTop: '1px solid #f3f4f6' } },
          items.length === 0 ?
            Vazio('Nenhum cliente configurado. Marque clientes na lista acima para adicionar.') :
            h('div', null,
              items.map(function(item, idx) {
                return h('div', { key: item.id, className: 'flex items-center justify-between gap-3 px-5 py-2.5', style: idx ? ROW_ST : null },
                  h('div', { className: 'flex items-center gap-3 min-w-0' },
                    codTag(item.cod_cliente),
                    h('div', { className: 'min-w-0' },
                      h('div', { className: 'text-sm font-medium text-gray-900 truncate' }, item.cod_cliente + ' - ' + (item.nome_display || ('Cliente ' + item.cod_cliente))),
                      item.centro_custo ? h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'CC: ' + item.centro_custo) : null
                    )
                  ),
                  h('button', {
                    onClick: function() { remover(item.id); },
                    'aria-label': 'Remover ' + (item.nome_display || item.cod_cliente) + ' do grupo',
                    title: 'Remover do grupo',
                    className: 'w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-800 transition-colors flex-shrink-0',
                  }, ico('x', 16))
                );
              })
            )
        ) : null
      );
    }

    var segBtn = function(id, label, icone) {
      var on = grupo === id;
      return h('button', {
        onClick: function() { setGrupo(id); },
        'aria-pressed': on,
        className: 'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] rounded-lg transition-colors',
        style: on ? { background: '#ffffff', color: '#5d0b85', fontWeight: 600, boxShadow: 'inset 0 0 0 1px #e5e7eb' } : { color: '#6b7280', fontWeight: 500 },
      }, ico(icone, 15), label);
    };

    return h('div', null,

      // ── Seletor de Grupo + Adicionar ──
      h('div', { className: CARD + ' p-5 mb-4' },
        h('div', { className: 'flex flex-wrap items-start justify-between gap-3 mb-4' },
          h('div', null,
            h('h3', { style: { fontSize: 15, fontWeight: 600, color: '#111827' } }, 'Configurar grupos de SLA'),
            h('p', { style: { fontSize: 13, color: '#6b7280', marginTop: 2 } }, 'Marque os clientes (ou centros de custo) que entram em cada grupo do relatório.')
          ),
          h('div', { className: 'inline-flex rounded-[10px] p-0.5', style: { background: '#f3f4f6' } },
            segBtn('porto_seco', 'Porto Seco', 'truck'),
            segBtn('outros', 'Outros', 'clipboard')
          )
        ),

        // Busca
        h('label', { htmlFor: 'ger-busca-cliente', className: 'sr-only' }, 'Buscar cliente'),
        h('div', { className: 'relative mb-3' },
          h('span', { className: 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 flex' }, ico('search', 16)),
          h('input', {
            id: 'ger-busca-cliente',
            type: 'text', placeholder: 'Buscar cliente por código ou nome...',
            value: search, onChange: function(e) { setSearch(e.target.value); },
            className: 'w-full pl-9 pr-4 border border-gray-200 rounded-[10px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-700',
            style: { height: 38 },
          })
        ),

        // Lista de clientes com checkboxes
        h('div', { className: 'border border-gray-200 rounded-[10px] max-h-80 overflow-y-auto' },
          filtrados.length === 0 ?
            Vazio('Nenhum cliente encontrado') :
            filtrados.slice(0, 200).map(function(cl, idx) {
              var cod = cl.cod_cliente;
              var nome = cl.mascara || cl.nome;
              var temCC = cl.centros.length > 0;
              var isExp = expanded[cod];
              // Check: cliente inteiro (sem CC) está configurado?
              var clienteSemCC = isConfigured(cod, '');
              // Ou algum CC está configurado?
              var algumCCConfigurado = cl.centros.some(function(cc) { return isConfigured(cod, cc); });
              var isChecked = clienteSemCC || algumCCConfigurado;

              return h('div', { key: cod, style: idx ? ROW_ST : null },
                // Linha do cliente
                h('div', { className: 'flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors' },
                  // Checkbox do cliente (sem CC)
                  !temCC ? h('input', {
                    type: 'checkbox',
                    checked: clienteSemCC,
                    'aria-label': 'Incluir ' + nome,
                    onChange: function() { toggleItem(cod, '', nome); },
                    style: chk,
                  }) : h('div', { style: { width: 16, flex: 'none' } }),
                  // Info
                  h('div', {
                    className: 'flex-1 min-w-0 cursor-pointer',
                    onClick: temCC ? function() { toggleExpand(cod); } : function() { toggleItem(cod, '', nome); },
                  },
                    h('div', { className: 'flex items-center gap-2 min-w-0' },
                      codTag(cod),
                      h('span', { className: 'text-sm text-gray-900 truncate' }, nome),
                      isChecked ? ico('check', 15, { color: '#16a34a' }) : null
                    )
                  ),
                  // Expand arrow se tem CC
                  temCC ? h('button', {
                    onClick: function() { toggleExpand(cod); },
                    'aria-expanded': !!isExp,
                    className: 'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100',
                  }, (cl.centros.length) + ' CC', ico('arrowdown', 13, { transform: isExp ? 'rotate(180deg)' : 'none' })) : null
                ),
                // Centros de custo expandidos
                isExp && temCC ? h('div', { className: 'pl-11 pr-4 pb-2', style: { background: '#f9fafb' } },
                  // Opção "Todos (sem CC específico)"
                  h('label', { className: 'flex items-center gap-2 py-1.5 cursor-pointer rounded px-2 -ml-2 hover:bg-white' },
                    h('input', {
                      type: 'checkbox', checked: clienteSemCC,
                      onChange: function() { toggleItem(cod, '', nome); },
                      style: chk,
                    }),
                    h('span', { className: 'text-[13px] text-gray-600' }, 'Todos (geral)')
                  ),
                  cl.centros.map(function(cc) {
                    var ccChecked = isConfigured(cod, cc);
                    return h('label', { key: cc, className: 'flex items-center gap-2 py-1.5 cursor-pointer rounded px-2 -ml-2 hover:bg-white' },
                      h('input', {
                        type: 'checkbox', checked: ccChecked,
                        onChange: function() { toggleItem(cod, cc, nome); },
                        style: chk,
                      }),
                      h('span', { className: 'text-[13px] text-gray-800 font-medium' }, cc)
                    );
                  })
                ) : null
              );
            })
        ),
        // Contador
        h('div', { className: 'mt-2 text-right', style: { fontSize: 12, color: '#6b7280' } },
          grupo === 'porto_seco' ? psItems.length + ' clientes no Porto Seco' : outItems.length + ' clientes em Outros Monitorados'
        )
      ),

      // ── Cards expansíveis dos grupos ──
      GrupoCard('SLA Porto Seco', '', psItems, openPS, function() { setOpenPS(!openPS); }),
      GrupoCard('SLA Outros Monitorados', '', outItems, openOut, function() { setOpenOut(!openOut); })
    );
  }

  // ═══ COMPONENTE PRINCIPAL ═══
  // DINAMICA_FRONT_V1: secao "Dinamica aplicada" (incentivo ao profissional na semana).
  function SecaoDinamica(props) {
    var fetchApi = props.fetchApi, sel = props.selSemana;
    var _d = useState(null), dyn = _d[0], setDyn = _d[1];
    var _l = useState(false), load = _l[0], setLoad = _l[1];
    useEffect(function() {
      if (!sel) { setDyn(null); return; }
      setLoad(true);
      fetchApi('/gerencial/dinamica?data_inicio=' + sel.data_inicio + '&data_fim=' + sel.data_fim)
        .then(function(j) { setDyn(j); setLoad(false); })
        .catch(function() { setDyn(null); setLoad(false); });
    }, [sel ? sel.data_inicio : null, fetchApi]);

    var fmt = function(v) { return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var t = (dyn && dyn.totais) || {};
    var lista = (dyn && dyn.clientes) || [];
    var maxInc = lista.reduce(function(m, c) { return Math.max(m, c.incentivo || 0); }, 0) || 1;
    var pctTxt = function(p) { return (p != null) ? (String(p).replace('.', ',') + '%') : '-'; };

    var header = h(Secao, { id: 'sec-dinamica', titulo: 'Dinâmica aplicada', sub: 'Incentivo pago ao profissional na semana' });

    if (load) return h('div', null, header, h('div', { className: CARD }, Vazio('Carregando...')));
    if (lista.length === 0) return h('div', null, header, h('div', { className: CARD }, Vazio('Nenhum cliente com dinâmica aplicada nesta semana')));

    return h('div', null,
      header,
      h('div', { className: 'mb-3' },
        h(FaixaKpi, { cols: 'grid-cols-2 md:grid-cols-4' },
          h(KpiCelula, { key: 'a', label: 'Total investido em incentivo', valor: fmt(t.incentivo) }),
          h(KpiCelula, { key: 'b', label: 'Clientes com dinâmica', valor: String(t.clientes || 0) }),
          h(KpiCelula, { key: 'c', label: 'OS com incentivo', valor: String(t.os_incent || 0) }),
          h(KpiCelula, { key: 'd', label: '% sobre faturamento', valor: pctTxt(t.pct), sub: 'do faturamento líquido', tip: 'Total do incentivo dividido pelo faturamento liquido da semana (valor menos valor_prof, somado por OS sem inflar multi-ponto), vezes 100.' })
        )
      ),
      h('div', { className: CARD + ' overflow-hidden overflow-x-auto' },
        h('table', { className: 'w-full border-collapse', style: { fontSize: 13 } },
          h('thead', null, h('tr', null,
            TH('Cliente', 'left', 'c'), TH('OS c/ incentivo', 'right', 'o'), TH('Adicional cliente', 'right', 'a'), TH('Valor do incentivo', 'right', 'v'), TH('Total do incentivo', 'right', 't'), TH('% do fat.', 'right', 'p')
          )),
          h('tbody', null, lista.map(function(c) {
            var valorInc = (c.os_incent > 0) ? (c.incentivo / c.os_incent) : 0;
            var tipPct = 'Incentivo do cliente dividido pelo faturamento liquido do cliente na semana, vezes 100.';
            return h('tr', { key: c.cod_cliente + '|' + (c.centro_custo || ''), className: 'hover:bg-gray-50', style: ROW_ST },
              h('td', { className: 'px-3 py-2.5' }, h('span', { className: 'font-medium text-gray-900' }, c.nome), h('span', { className: 'ml-1.5', style: Object.assign({ fontSize: 12, color: '#6b7280' }, TAB) }, c.cod_cliente)),
              h('td', { className: TD_CLS, style: Object.assign({ color: '#374151' }, TAB) }, String(c.os_incent || 0)),
              h('td', { className: TD_CLS, style: Object.assign({ color: '#6b7280' }, TAB) }, fmt(c.adic_cliente)),
              h('td', { className: TD_CLS, style: Object.assign({ color: '#374151' }, TAB) }, fmt(valorInc)),
              h('td', { className: TD_CLS, style: Object.assign({ color: '#111827', fontWeight: 700 }, TAB) }, fmt(c.incentivo)),
              h('td', { className: TD_CLS }, Pilula(pctTxt(c.pct), (c.pct || 0) >= 3.5 ? 'ambar' : 'verde', tipPct))
            );
          }))
        )
      )
    );
  }

  // ═══ MENU LATERAL DE SEÇÕES (MENU_SECOES_V1) ═══
  var SECOES = [
    { id: 'sec-kpis',      rotulo: 'KPIs da semana' },
    { id: 'sec-767',       rotulo: 'SLA Comollati (767)' },
    { id: 'sec-porto',     rotulo: 'SLA Porto Seco' },
    { id: 'sec-outros',    rotulo: 'SLA Outros Monitorados' },
    { id: 'sec-ticket',    rotulo: 'Ticket médio líquido' },
    { id: 'sec-demanda',   rotulo: 'Variação de demanda' },
    { id: 'sec-garantido', rotulo: 'Mínimo garantido' },
    { id: 'sec-dinamica',  rotulo: 'Dinâmica aplicada' },
    { id: 'sec-ativacao',  rotulo: 'Setor de ativação' }
  ];

  function MenuSecoes(p) {
    var _a = useState(SECOES[0].id), ativa = _a[0], setAtiva = _a[1];

    useEffect(function() {
      function aoRolar() {
        var melhor = null, menorDist = Infinity;
        SECOES.forEach(function(s) {
          var el = document.getElementById(s.id);
          if (!el) return;
          var d = Math.abs(el.getBoundingClientRect().top - 96);
          if (d < menorDist) { menorDist = d; melhor = s.id; }
        });
        if (melhor) setAtiva(melhor);
      }
      aoRolar();
      window.addEventListener('scroll', aoRolar, { passive: true });
      window.addEventListener('resize', aoRolar);
      return function() {
        window.removeEventListener('scroll', aoRolar);
        window.removeEventListener('resize', aoRolar);
      };
    }, []);

    function irPara(e, id) {
      e.preventDefault();
      var el = document.getElementById(id);
      if (!el) return;
      var topo = el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop) - 84;
      window.scrollTo({ top: topo, behavior: 'smooth' });
      setAtiva(id);
    }

    // MENU_STICKY_V2: o HeaderCompacto e sticky top-0 e ocupa ~66px, entao o
    // menu gruda em 82px (logo abaixo dele) e ganha altura maxima com rolagem
    // propria — assim o card inteiro fica visivel em qualquer ponto da pagina.
    // GERENCIAL_CLEAN_V1: abaixo de lg o menu vira uma fileira de pílulas com
    // rolagem horizontal (antes ocupava a primeira tela inteira no celular).
    return h('nav', {
      'aria-label': 'Secoes do relatorio',
      className: 'w-full lg:w-56 flex-shrink-0 flex flex-col gap-3 ' +
        'lg:sticky lg:top-[82px] lg:max-h-[calc(100vh-98px)] lg:overflow-y-auto lg:pb-1'
    },
      // Celular/tablet: pílulas roláveis
      h('div', { className: 'lg:hidden flex gap-2 overflow-x-auto pb-1 -mx-4 px-4', style: { scrollbarWidth: 'none' } },
        SECOES.map(function(s) {
          var on = ativa === s.id;
          return h('a', {
            key: s.id,
            href: '#' + s.id,
            onClick: function(e) { irPara(e, s.id); },
            className: 'no-underline whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] flex-none',
            style: on ? { background: '#f3e8fb', color: '#5d0b85', fontWeight: 600, border: '1px solid #e9d5f9' } : { background: '#ffffff', color: '#374151', fontWeight: 500, border: '1px solid #e5e7eb' }
          }, s.rotulo);
        })
      ),
      // Desktop: lista vertical
      h('div', { className: 'hidden lg:block ' + CARD + ' p-2' },
        h('div', { className: 'px-2.5 pt-1.5 pb-2', style: { fontSize: 12, fontWeight: 600, color: '#6b7280' } }, 'Seções do relatório'),
        h('div', { className: 'flex flex-col gap-0.5' },
          SECOES.map(function(s) {
            var on = ativa === s.id;
            return h('a', {
              key: s.id,
              href: '#' + s.id,
              onClick: function(e) { irPara(e, s.id); },
              'aria-current': on ? 'true' : null,
              className: 'flex items-center gap-2.5 px-2.5 py-2 rounded-lg no-underline transition-colors ' + (on ? '' : 'hover:bg-gray-50'),
              style: on ? { background: '#faf7fd' } : null
            },
              h('span', { 'aria-hidden': 'true', className: 'w-[3px] h-[16px] flex-shrink-0 rounded-full', style: { background: on ? '#770fa8' : 'transparent' } }),
              h('span', { className: 'flex-1 text-[13px]', style: on ? { color: '#5d0b85', fontWeight: 600 } : { color: '#374151', fontWeight: 400 } }, s.rotulo)
            );
          })
        )
      ),
      p.semana ? h('div', { className: 'hidden lg:flex ' + CARD + ' px-4 py-3 flex-col gap-1' },
        h('div', { style: { fontSize: 12, color: '#6b7280' } }, 'Semana'),
        h('div', { style: { fontSize: 14, fontWeight: 600, color: '#111827' } }, p.semana.label),
        h('div', { style: Object.assign({ fontSize: 12, color: '#6b7280' }, TAB) }, fN(p.semana.entregas) + ' entregas')
      ) : null
    );
  }

  // ═══ SETOR DE ATIVAÇÃO (GERENCIAL_ATIVACAO_V1) ═══
  // Comparativo entre semanas dos indicadores do setor de ativação.
  // Mesmas regras do analytics do CRM, exceto alocação — que aqui conta pelo
  // created_at (quando o operador fez), não pela data prevista da operação.
  function SecaoAtivacao(props) {
    var fetchApi = props.fetchApi, sel = props.selSemana;
    var _d = useState(null), dt = _d[0], setDt = _d[1];
    var _l = useState(false), load = _l[0], setLoad = _l[1];
    var _e = useState(null), err = _e[0], setErr = _e[1];

    useEffect(function() {
      if (!sel) { setDt(null); return; }
      setLoad(true); setErr(null);
      fetchApi('/gerencial/ativacao?data_inicio=' + sel.data_inicio + '&data_fim=' + sel.data_fim + '&semanas=4')
        .then(function(j) { setDt(j); setLoad(false); })
        .catch(function(e) { setErr(e.message); setDt(null); setLoad(false); });
    }, [sel ? sel.data_inicio : null, fetchApi]);

    var header = h(Secao, {
      id: 'sec-ativacao',
      titulo: 'Setor de ativação',
      sub: 'Comparativo das últimas 4 semanas — cadastros, ativações, alocações e tag TP'
    });

    if (load) return h('div', null, header, h('div', { className: CARD }, Vazio('Carregando...')));
    if (err) return h('div', null, header, h('div', { className: CARD }, Vazio('Erro ao carregar: ' + err, '#991b1b')));
    if (!dt || !dt.semanas) return h('div', null, header, h('div', { className: CARD }, Vazio('Sem dados')));

    var sems = dt.semanas || [];
    var ult = sems.length - 1;

    function variacao(vals) {
      if (ult < 1) return null;
      var a = vals[ult], b = vals[ult - 1];
      if (a == null || b == null || b === 0) return null;
      return r2((a - b) / b * 100);
    }
    var pctTxt = function(v) { return v == null ? '—' : fD(v, 1) + '%'; };
    // A última coluna (semana corrente) fica levemente destacada
    var BG_ULT = '#faf7fd';

    var cabecalho = function(primeira) {
      return h('thead', null, h('tr', null,
        TH(primeira, 'left', 'h0'),
        sems.map(function(s, i) { return TH(s.label, 'right', 'h' + (i + 1), i === ult ? { color: '#5d0b85', background: '#f3e8fb' } : null); }),
        TH('Var.', 'right', 'hv')
      ));
    };
    var celVar = function(v, invertido) {
      return h('td', { className: 'px-3 py-2.5 text-right whitespace-nowrap', style: { fontSize: 13 } }, Var(v, '%', invertido));
    };

    // PCT_VISUAL_V2: so numero e percentual. Sem barra de progresso — o peso
    // vem do tamanho e da cor do percentual, nao de um elemento a mais.
    function celulaNum(chave, valor, pct, cor, ehUltima, sufixo) {
      return h('td', { key: chave, className: 'px-3 py-2.5 text-right whitespace-nowrap', style: ehUltima ? { background: BG_ULT } : null },
        h('div', { style: Object.assign({ fontSize: 15, fontWeight: 600, color: '#111827', lineHeight: 1.3 }, TAB) },
          valor == null ? '—' : fN(valor),
          sufixo ? h('span', { className: 'ml-1', style: { fontSize: 12, fontWeight: 500, color: '#6b7280' } }, sufixo) : null
        ),
        h('div', { style: Object.assign({ fontSize: 12, fontWeight: 600, color: cor, lineHeight: 1.3, marginTop: 1 }, TAB) }, pctTxt(pct))
      );
    }
    var celSimples = function(j, conteudo, extra) {
      return h('td', { key: j, className: 'px-3 py-2.5 text-right whitespace-nowrap', style: Object.assign({ fontSize: 15, fontWeight: 600, color: '#111827' }, TAB, j === ult ? { background: BG_ULT } : null, extra || {}) }, conteudo);
    };
    var rotulo = function(txt, sub, extra) {
      return h('td', { className: 'px-3 py-2.5' },
        h('div', { className: 'flex items-center gap-2 flex-wrap' }, h('span', { style: { fontWeight: 600, color: '#111827', fontSize: 13 } }, txt), extra || null),
        sub ? h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, sub) : null
      );
    };

    // ── Tabela 1: resumo ──
    var linhasPct = [
      { rot: 'Qtd. ativos',   sub: '% sobre os cadastros da semana', bloco: dt.ativos,   cor: '#5d0b85' },
      { rot: 'Qtd. alocados', sub: '% sobre os cadastros da semana', bloco: dt.alocados, cor: '#1e40af' }
    ];

    var tabelaResumo = h('div', { className: CARD + ' overflow-hidden overflow-x-auto' },
      h('table', { className: 'w-full border-collapse', style: { fontSize: 13 } },
        cabecalho('Indicador'),
        h('tbody', null,
          // Cadastros — base de todos os percentuais
          h('tr', { key: 'cad', style: ROW_ST },
            rotulo('Qtd. cadastros novos', 'base dos percentuais abaixo'),
            dt.cadastros.valores.map(function(v, j) { return celSimples(j, fN(v)); }),
            celVar(variacao(dt.cadastros.valores), false)
          ),
          // Ativos e alocados — número + %
          linhasPct.map(function(l) {
            return h('tr', { key: l.rot, style: ROW_ST },
              rotulo(l.rot, l.sub),
              l.bloco.valores.map(function(v, j) {
                return celulaNum(j, v, l.bloco.pcts[j], l.cor, j === ult, null);
              }),
              celVar(variacao(l.bloco.valores), false)
            );
          }),
          // TP
          h('tr', { key: 'tp', style: ROW_ST },
            rotulo('Qtd. leads com tag TP', null, dt.tp.disponivel ? null :
              Pilula('Planilha indisponível', 'ambar', 'Planilha TP indisponivel no momento' + (dt.tp.erro ? ' (' + dt.tp.erro + ')' : ''))),
            dt.tp.valores.map(function(v, j) { return celSimples(j, fN(v)); }),
            celVar(variacao(dt.tp.valores), false)
          ),
          // Tempo médio — cair é bom, cor invertida
          h('tr', { key: 'tm', style: ROW_ST },
            rotulo('Tempo médio de ativação', 'do cadastro até a ativação — menor é melhor'),
            dt.tempo_medio.valores.map(function(v, j) {
              return celSimples(j, [
                v == null ? '—' : fD(v, 1),
                v == null ? null : h('span', { key: 's', className: 'ml-1', style: { fontSize: 12, fontWeight: 500, color: '#6b7280' } }, 'dias')
              ]);
            }),
            celVar(variacao(dt.tempo_medio.valores), true)
          )
        )
      )
    );

    // ── Tabelas 2 e 3: quebra por operador ──
    function tabelaOperador(titulo, subtitulo, bloco, cor) {
      var ops = bloco.operadores || [];
      return h('div', { className: CARD + ' overflow-hidden mt-4' },
        h('div', { className: 'px-4 py-3' },
          h('h3', { style: { fontSize: 15, fontWeight: 600, color: '#111827' } }, titulo),
          h('p', { style: { fontSize: 12, color: '#6b7280', marginTop: 1 } }, subtitulo)
        ),
        ops.length === 0
          ? h('div', { style: { borderTop: '1px solid #f3f4f6' } }, Vazio('Nenhum registro no período'))
          : h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full border-collapse', style: { fontSize: 13 } },
              cabecalho('Operador'),
              h('tbody', null,
                ops.map(function(o) {
                  return h('tr', { key: o.operador, className: 'hover:bg-gray-50', style: ROW_ST },
                    h('td', { className: 'px-3 py-2.5 font-medium text-gray-900' }, o.operador),
                    o.valores.map(function(v, j) {
                      return celulaNum(j, v, o.pcts[j], cor, j === ult, null);
                    }),
                    celVar(variacao(o.valores), false)
                  );
                }),
                h('tr', { style: TOTAL_ST },
                  h('td', { className: 'px-3 py-2.5 font-semibold text-gray-900' }, 'Total'),
                  bloco.valores.map(function(v, j) {
                    return celulaNum(j, v, bloco.pcts[j], cor, false, null);
                  }),
                  celVar(variacao(bloco.valores), false)
                )
              )
            ))
      );
    }

    return h('div', null,
      header,
      tabelaResumo,
      tabelaOperador('Ativações por operador', 'Percentual sobre os cadastros novos da mesma semana', dt.ativos, '#5d0b85'),
      tabelaOperador('Alocações por operador', 'Percentual sobre os cadastros novos da mesma semana', dt.alocados, '#1e40af'),
      h('div', { className: 'mt-3 leading-relaxed', style: { fontSize: 12, color: '#6b7280' } },
        'Cadastros: leads com data de cadastro na semana. Ativos: leads com status ativo e data de ativacao na semana, atribuidos a quem ativou. ',
        'Alocados: alocacoes pela data em que foram feitas (created_at), atribuidas a quem alocou — nao pela data prevista da operacao, ',
        'que fica meses a frente e trazia de volta operadores antigos. Por isso um operador pode alocar mais do que ativou. ',
        'Tag TP: leads da planilha TP com data na semana, deduplicados por telefone. ',
        'Tempo medio: media de dias entre cadastro e ativacao dos leads ativados na semana. ',
        'A ultima coluna e a semana corrente, ainda em curso — comparar o parcial dela com semanas fechadas sempre da queda.'
      )
    );
  }

  window.ModuloGerencialComponent = function(props) {
    var usuario = props.usuario, apiUrl = props.API_URL, getToken = props.getToken;
    var HeaderCompacto = props.HeaderCompacto, Toast = props.Toast, LoadingOverlay = props.LoadingOverlay;
    var Ee = props.Ee, socialProfile = props.socialProfile, ul = props.ul, o = props.o, he = props.he, navegarSidebar = props.navegarSidebar;
    var isLoadingGlobal = props.n, toastData = props.i, isLoading = props.f, lastUpdate = props.E;

    var _tab = useState('relatorio'), tab = _tab[0], setTab = _tab[1];
    var _s = useState([]), semanas = _s[0], setSemanas = _s[1];
    var _sel = useState(null), selSemana = _sel[0], setSelSemana = _sel[1];
    var _d = useState(null), dados = _d[0], setDados = _d[1];
    var _l = useState(false), loading = _l[0], setLoading = _l[1];
    var _err = useState(null), erro = _err[0], setErro = _err[1];

    var fetchApi = useCallback(async function(endpoint, options) {
      options = options || {};
      var token = getToken();
      var res = await fetch(apiUrl + endpoint, Object.assign({}, options, { headers: Object.assign({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, options.headers || {}), credentials: 'include' }));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }, [apiUrl, getToken]);

    useEffect(function() {
      fetchApi('/gerencial/semanas').then(function(res) {
        if (res.success && res.semanas && res.semanas.length > 0) { setSemanas(res.semanas); setSelSemana(res.semanas[0]); }
      }).catch(function(e) { setErro('Erro semanas: ' + e.message); });
    }, [fetchApi]);

    useEffect(function() {
      if (!selSemana || tab !== 'relatorio') return;
      setLoading(true); setDados(null); setErro(null);
      fetchApi('/gerencial/dados?data_inicio=' + selSemana.data_inicio + '&data_fim=' + selSemana.data_fim)
        .then(function(res) { if (res.success) setDados(res); else setErro(res.error); setLoading(false); })
        .catch(function(e) { setErro('Erro: ' + e.message); setLoading(false); });
    }, [selSemana, fetchApi, tab]);

    var d = dados || {}, k = d.kpis || {};

    // GERENCIAL_CLEAN_V1: subtítulo com contexto (semana + entregas)
    var subtitulo = tab === 'config'
      ? 'Clientes que compõem os grupos de SLA do relatório'
      : (selSemana ? 'Semana ' + selSemana.label + ' · ' + fN(selSemana.entregas) + ' entregas' : 'Relatório semanal consolidado de operações');

    var abaBtn = function(id, label, icone) {
      var on = tab === id;
      return h('button', {
        onClick: function() { setTab(id); },
        role: 'tab', 'aria-selected': on,
        className: 'inline-flex items-center gap-1.5 px-1 py-2.5 text-sm transition-colors',
        style: { color: on ? '#5d0b85' : '#6b7280', fontWeight: on ? 600 : 500, borderBottom: '2px solid ' + (on ? '#770fa8' : 'transparent'), marginBottom: -1 }
      }, ico(icone, 15), label);
    };

    var sec = function(id, titulo, sub) { return h(Secao, { id: id, titulo: titulo, sub: sub }); };

    return h('div', { className: 'min-h-screen', style: { background: '#f9fafb' } },
      toastData && h(Toast, toastData),
      isLoadingGlobal && h(LoadingOverlay),
      h(HeaderCompacto, { usuario: usuario, moduloAtivo: Ee, socialProfile: socialProfile, isLoading: isLoading, lastUpdate: lastUpdate, onRefresh: ul, onLogout: function() { o(null); }, onGoHome: function() { he('home'); }, onNavigate: navegarSidebar }),

      h('div', { className: 'max-w-7xl mx-auto p-4 md:p-6' },

        // Cabeçalho de página
        h('div', { className: 'flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-3' },
          h('div', { className: 'min-w-0' },
            h('h1', { style: { fontFamily: SORA, fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1.25 } }, 'Análise Gerencial'),
            h('p', { style: Object.assign({ fontSize: 14, color: '#6b7280', marginTop: 2 }, TAB) }, subtitulo)
          ),
          // Semana selector (só no relatório)
          tab === 'relatorio' && semanas.length > 0 ? h('div', { className: 'w-full sm:w-auto' },
            h('label', { htmlFor: 'ger-semana', className: 'block mb-1', style: { fontSize: 12, fontWeight: 600, color: '#374151' } }, 'Semana'),
            h('select', {
              id: 'ger-semana',
              value: selSemana ? selSemana.data_inicio : '',
              onChange: function(e) { var f = semanas.find(function(s) { return s.data_inicio === e.target.value; }); if (f) setSelSemana(f); },
              disabled: semanas.length === 0,
              className: 'w-full sm:w-auto px-3 border border-gray-200 rounded-[10px] text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-700',
              style: { height: 38, minWidth: 0, maxWidth: '100%' }
            }, semanas.map(function(s) { return h('option', { key: s.data_inicio, value: s.data_inicio }, s.label + ' (' + fN(s.entregas) + ')'); }))
          ) : null
        ),

        // Abas internas
        h('div', { role: 'tablist', className: 'flex gap-5 mb-5', style: { borderBottom: '1px solid #e5e7eb' } },
          abaBtn('relatorio', 'Relatório', 'chart'),
          abaBtn('config', 'Configurações', 'settings')
        ),

        // Tab Config
        tab === 'config' ? h(ConfigView, { fetchApi: fetchApi }) :

        // Tab Relatório
        loading ? h('div', { className: CARD + ' flex flex-col items-center py-16' },
          h('div', { className: 'animate-spin w-8 h-8 rounded-full mb-3', style: { border: '3px solid #e9d5f9', borderTopColor: '#770fa8' } }),
          h('p', { style: { fontSize: 14, color: '#6b7280' } }, 'Carregando dados da semana...')
        ) :
        erro ? h('div', { className: 'rounded-[14px] px-5 py-4 flex items-start gap-3', role: 'alert', style: { background: '#fef2f2', border: '1px solid #fecaca' } },
          ico('alert', 18, { color: '#dc2626', marginTop: 1 }),
          h('div', null,
            h('p', { style: { fontSize: 14, fontWeight: 600, color: '#991b1b' } }, 'Não foi possível carregar o relatório'),
            h('p', { style: { fontSize: 13, color: '#991b1b', marginTop: 2 } }, erro)
          )
        ) :
        !dados ? h('div', { className: CARD }, Vazio(semanas.length === 0 ? 'Nenhuma semana com dados disponível ainda.' : 'Selecione uma semana')) :

        h('div', { className: 'flex flex-col lg:flex-row gap-5 items-start' },
          h(MenuSecoes, { semana: selSemana }),
          h('div', { className: 'flex-1 min-w-0 w-full' },
          // KPIs — faixa única
          h(Secao, { id: 'sec-kpis', primeira: true, titulo: 'KPIs da semana', sub: d.semana ? d.semana.label + ' · comparado à semana anterior' : '' }),
          h(FaixaKpi, { cols: 'grid-cols-2 md:grid-cols-3' },
            h(KpiCelula, { key: 'e', label: 'Entregas', valor: fN(k.entregas), sub: k.var_entregas != null ? Var(k.var_entregas, '%') : 'sem comparação' }),
            h(KpiCelula, { key: 'p', label: 'No prazo', valor: fP(k.prazo_pct), sub: k.var_prazo_pp != null ? Var(k.var_prazo_pp, ' pp') : 'sem comparação' }),
            h(KpiCelula, { key: 'f', label: 'Faturamento', valor: fR(k.faturamento), sub: k.var_faturamento != null ? Var(k.var_faturamento, '%') : 'sem comparação' }),
            h(KpiCelula, { key: 't', label: 'Ticket médio', valor: fR(k.ticket_medio) }),
            h(KpiCelula, { key: 'o', label: 'OS', valor: fN(k.os_count) }),
            h(KpiCelula, { key: 'g', label: 'Entregadores', valor: fN(k.entregadores) })
          ),
          // SLA 767
          sec('sec-767', 'SLA Comollati (767)', 'SLA fixo de 2 horas'),
          h('div', { className: CARD + ' overflow-hidden' },
            h(SlaTable, { rows: d.sla_767 || [], empty: 'Sem dados do cliente 767 nesta semana' }),
            (d.evolucao_semanal || {})[767] ? h(EvolucaoChart, { data: d.evolucao_semanal[767] }) : null
          ),
          // Porto Seco
          sec('sec-porto', 'SLA Porto Seco', (d.config_count || {}).porto_seco + ' clientes configurados'),
          h('div', { className: CARD + ' overflow-hidden' },
            h(SlaTable, { rows: d.sla_porto_seco || [] }),
            // Porto Seco: evolução consolidada de todos os clientes
            (function() {
              var ev = d.evolucao_semanal || {};
              var psClientes = (d.sla_porto_seco || []).map(function(r) { return parseInt(r.concat); });
              // Juntar todas as lojas dos clientes Porto Seco num único gráfico
              var allLojas = [], allSemanas = [];
              psClientes.forEach(function(cod) { if (ev[cod]) { ev[cod].lojas.forEach(function(l) { allLojas.push(l); }); if (ev[cod].semanas.length > allSemanas.length) allSemanas = ev[cod].semanas; } });
              return allLojas.length > 0 ? h(EvolucaoChart, { data: { semanas: allSemanas, lojas: allLojas } }) : null;
            })()
          ),
          // Outros
          sec('sec-outros', 'SLA Outros Monitorados', (d.config_count || {}).outros + ' clientes configurados'),
          h('div', { className: CARD + ' overflow-hidden' },
            h(SlaTable, { rows: d.sla_outros || [] }),
            // Outros: evolução individual por cliente
            (function() {
              var ev = d.evolucao_semanal || {};
              var outClientes = (d.sla_outros || []).map(function(r) { return parseInt(r.concat); });
              return outClientes.map(function(cod) { return ev[cod] ? h(EvolucaoChart, { key: cod, data: ev[cod] }) : null; });
            })()
          ),
          // Ticket
          sec('sec-ticket', 'Ticket médio líquido por cliente', 'Comparativo 4 semanas'),
          h('div', { className: CARD + ' overflow-hidden' }, h(CompTable, { semanas: (d.ticket_medio||{}).semanas, clientes: (d.ticket_medio||{}).clientes, tipo: 'ticket', demandaClientes: (d.demanda||{}).clientes })),
          // Demanda
          sec('sec-demanda', 'Variação de demanda', 'Entregas por cliente — 4 semanas'),
          h('div', { className: CARD + ' overflow-hidden' }, h(CompTable, { semanas: (d.demanda||{}).semanas, clientes: (d.demanda||{}).clientes, tipo: 'demanda' })),
          // Garantido
          sec('sec-garantido', 'Mínimo garantido', null),
          h('div', { className: CARD + ' overflow-hidden' }, h(GarantidoTable, { rows: d.garantido || [] })),
          // Dinamica aplicada (DINAMICA_FRONT_V1)
          h(SecaoDinamica, { fetchApi: fetchApi, selSemana: selSemana }),
          // Setor de Ativacao (GERENCIAL_ATIVACAO_V1)
          h(SecaoAtivacao, { fetchApi: fetchApi, selSemana: selSemana }),
          // Footer
          h('div', { className: 'text-center mt-8 pb-4', style: { fontSize: 12, color: '#9ca3af' } }, 'Gerado em ' + new Date().toLocaleString('pt-BR') + ' · Central Tutts')
          )
        )
      )
    );
  };

  function r2(n) { return Math.round(n * 100) / 100; }
  console.log('✅ Módulo Análise Gerencial Semanal v2 carregado');
})();
