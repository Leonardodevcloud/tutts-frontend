// ══════════════════════════════════════════════════
// Módulo: Análise Gerencial Semanal
// Arquivo: modulo-gerencial.js
// ══════════════════════════════════════════════════
(function() {
  'use strict';
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useCallback = React.useCallback, useMemo = React.useMemo;

  // ═══ FORMATAÇÃO BR ═══
  function fmtN(n) { if (n == null) return '-'; return Number(n).toLocaleString('pt-BR'); }
  function fmtD(n, dec) { if (n == null) return '-'; return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: dec || 2, maximumFractionDigits: dec || 2 }); }
  function fmtR(n) { if (n == null) return '-'; return 'R$ ' + fmtD(n); }
  function fmtP(n) { if (n == null) return '-'; return fmtD(n) + '%'; }
  function corVar(v) { if (v == null) return '#94a3b8'; return v >= 0 ? '#10b981' : '#ef4444'; }
  function setaVar(v) { if (v == null) return '—'; return (v >= 0 ? '↑ ' : '↓ ') + fmtD(Math.abs(v)); }
  function ppVar(v) { if (v == null) return h('span', { style: { color: '#94a3b8' } }, '—'); return h('span', { style: { color: corVar(v), fontWeight: 700 } }, (v >= 0 ? '+' : '') + fmtD(v) + ' pp'); }

  // ═══ COMPONENTES UI ═══

  function KpiCard(p) {
    return h('div', { style: {
      background: 'white', borderRadius: 12, padding: '20px 24px',
      borderLeft: '4px solid ' + (p.cor || '#7c3aed'),
      boxShadow: '0 1px 3px rgba(0,0,0,.06)', flex: 1, minWidth: 140,
    }},
      h('div', { style: { fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 } }, p.label),
      h('div', { style: { fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1.1 } }, p.valor),
      p.sub ? h('div', { style: { fontSize: 12, color: p.subCor || '#94a3b8', marginTop: 4, fontWeight: 600 } }, p.sub) : null
    );
  }

  function SlaTable(p) {
    var rows = p.rows || [];
    var total = { entregas: 0, no_prazo: 0, fora_prazo: 0, tempo_sum: 0, tempo_count: 0 };
    rows.forEach(function(r) {
      total.entregas += r.entregas; total.no_prazo += r.no_prazo; total.fora_prazo += r.fora_prazo;
      if (r.tempo_medio > 0) { total.tempo_sum += r.tempo_medio * r.entregas; total.tempo_count += r.entregas; }
    });
    total.prazo_pct = total.entregas > 0 ? Math.round(total.no_prazo / total.entregas * 10000) / 100 : 0;
    total.tempo_medio = total.tempo_count > 0 ? Math.round(total.tempo_sum / total.tempo_count * 10) / 10 : 0;

    if (!rows.length) return h('div', { style: { color: '#94a3b8', padding: 20, textAlign: 'center' } }, 'Sem dados para esta semana');

    return h('div', { style: { overflowX: 'auto' } },
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 } },
        h('thead', null,
          h('tr', { style: { background: '#f8fafc' } },
            ['Cliente', 'Entregas', 'No Prazo', '% Prazo', 'Fora', '% Fora', 'T. Médio', 'Var. pp'].map(function(c, i) {
              return h('th', { key: i, style: { padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0' } }, c);
            })
          )
        ),
        h('tbody', null,
          rows.map(function(r, i) {
            var prazoCor = r.prazo_pct >= 90 ? '#10b981' : r.prazo_pct >= 75 ? '#f59e0b' : '#ef4444';
            var foraPct = r.entregas > 0 ? Math.round((r.entregas - r.no_prazo) / r.entregas * 10000) / 100 : 0;
            return h('tr', { key: i, style: { background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f1f5f9' } },
              h('td', { style: { padding: '10px 12px', fontWeight: 600, color: '#1e293b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.nome || r.concat),
              h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700 } }, fmtN(r.entregas)),
              h('td', { style: { padding: '10px 12px', textAlign: 'right', color: '#10b981', fontWeight: 600 } }, fmtN(r.no_prazo)),
              h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: prazoCor } }, fmtP(r.prazo_pct)),
              h('td', { style: { padding: '10px 12px', textAlign: 'right', color: '#ef4444', fontWeight: 600 } }, fmtN(r.fora_prazo)),
              h('td', { style: { padding: '10px 12px', textAlign: 'right', color: '#ef4444' } }, fmtP(foraPct)),
              h('td', { style: { padding: '10px 12px', textAlign: 'right' } }, r.tempo_medio > 0 ? fmtD(r.tempo_medio, 0) + ' min' : '—'),
              h('td', { style: { padding: '10px 12px', textAlign: 'right' } }, ppVar(r.var_pp))
            );
          }),
          // Linha TOTAL
          h('tr', { style: { background: 'rgba(124,58,237,.06)', borderTop: '2px solid #7c3aed' } },
            h('td', { style: { padding: '10px 12px', fontWeight: 800, color: '#7c3aed' } }, 'TOTAL'),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 800 } }, fmtN(total.entregas)),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#10b981' } }, fmtN(total.no_prazo)),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: total.prazo_pct >= 85 ? '#10b981' : '#f59e0b' } }, fmtP(total.prazo_pct)),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#ef4444' } }, fmtN(total.fora_prazo)),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', color: '#ef4444' } }, fmtP(total.entregas > 0 ? Math.round(total.fora_prazo / total.entregas * 10000) / 100 : 0)),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700 } }, total.tempo_medio > 0 ? fmtD(total.tempo_medio, 0) + ' min' : '—'),
            h('td', { style: { padding: '10px 12px', textAlign: 'right' } }, '—')
          )
        )
      )
    );
  }

  function CompTable(p) {
    var semLabels = p.semanas || [];
    var rows = p.clientes || [];
    var isMoney = p.tipo === 'ticket';
    var fmt = isMoney ? fmtR : fmtN;

    if (!rows.length) return h('div', { style: { color: '#94a3b8', padding: 20, textAlign: 'center' } }, 'Sem dados');

    return h('div', { style: { overflowX: 'auto' } },
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 } },
        h('thead', null,
          h('tr', { style: { background: '#f8fafc' } },
            [h('th', { key: 'cl', style: { padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0' } }, 'Cliente')].concat(
              semLabels.map(function(s, i) { return h('th', { key: 's' + i, style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0' } }, s); }),
              [h('th', { key: 'var', style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0' } }, 'Var. %')]
            )
          )
        ),
        h('tbody', null,
          rows.slice(0, 30).map(function(r, i) {
            return h('tr', { key: i, style: { background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f1f5f9' } },
              h('td', { style: { padding: '10px 12px', fontWeight: 600, color: '#1e293b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.nome || r.concat),
              r.semanas.map(function(v, j) {
                return h('td', { key: j, style: { padding: '10px 12px', textAlign: 'right', color: v != null ? '#1e293b' : '#cbd5e1' } }, v != null ? fmt(v) : '—');
              }),
              h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: corVar(r.variacao) } },
                r.variacao != null ? setaVar(r.variacao) + '%' : '—'
              )
            );
          })
        )
      )
    );
  }

  function GarantidoTable(p) {
    var rows = p.rows || [];
    if (!rows.length) return h('div', { style: { color: '#94a3b8', padding: 20, textAlign: 'center' } }, 'Sem dados de mínimo garantido');

    var total = { neg: 0, prod: 0, comp: 0, fat: 0, saldo: 0 };
    rows.forEach(function(r) { total.neg += r.negociado; total.prod += r.produzido; total.comp += r.complemento; total.fat += r.fat_liquido; total.saldo += r.saldo; });

    return h('div', { style: { overflowX: 'auto' } },
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 13 } },
        h('thead', null,
          h('tr', { style: { background: '#f8fafc' } },
            ['Cliente', 'Negociado', 'Produzido', 'Complemento', 'Fat. Líquido', 'Saldo'].map(function(c, i) {
              return h('th', { key: i, style: { padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 700, color: '#475569', borderBottom: '2px solid #e2e8f0' } }, c);
            })
          )
        ),
        h('tbody', null,
          rows.map(function(r, i) {
            return h('tr', { key: i, style: { background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #f1f5f9' } },
              h('td', { style: { padding: '10px 12px', fontWeight: 600, color: '#1e293b' } }, 'Cliente ' + r.cod_cliente),
              h('td', { style: { padding: '10px 12px', textAlign: 'right' } }, fmtR(r.negociado)),
              h('td', { style: { padding: '10px 12px', textAlign: 'right' } }, fmtR(r.produzido)),
              h('td', { style: { padding: '10px 12px', textAlign: 'right', color: r.complemento > 0 ? '#f59e0b' : '#64748b' } }, fmtR(r.complemento)),
              h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 600 } }, fmtR(r.fat_liquido)),
              h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: r.saldo >= 0 ? '#10b981' : '#ef4444' } }, fmtR(r.saldo))
            );
          }),
          h('tr', { style: { background: 'rgba(124,58,237,.06)', borderTop: '2px solid #7c3aed' } },
            h('td', { style: { padding: '10px 12px', fontWeight: 800, color: '#7c3aed' } }, 'TOTAL'),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700 } }, fmtR(total.neg)),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700 } }, fmtR(total.prod)),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' } }, fmtR(total.comp)),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 700 } }, fmtR(total.fat)),
            h('td', { style: { padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: total.saldo >= 0 ? '#10b981' : '#ef4444' } }, fmtR(total.saldo))
          )
        )
      )
    );
  }

  function SecaoTitulo(p) {
    return h('div', { style: { marginTop: 32, marginBottom: 16 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 } },
        h('span', { style: { fontSize: 20 } }, p.icone || '📊'),
        h('h2', { style: { fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0 } }, p.titulo)
      ),
      p.sub ? h('p', { style: { fontSize: 13, color: '#64748b', margin: 0 } }, p.sub) : null
    );
  }

  // ═══ COMPONENTE PRINCIPAL ═══
  window.ModuloGerencialComponent = function(props) {
    var usuario = props.usuario, apiUrl = props.API_URL, getToken = props.getToken;
    var HeaderCompacto = props.HeaderCompacto, Toast = props.Toast, LoadingOverlay = props.LoadingOverlay;
    var Ee = props.Ee, socialProfile = props.socialProfile, ul = props.ul, o = props.o, he = props.he, navegarSidebar = props.navegarSidebar;
    var isLoadingGlobal = props.n, toastData = props.i, isLoading = props.f, lastUpdate = props.E;

    var _s = useState([]), semanas = _s[0], setSemanas = _s[1];
    var _sel = useState(null), selSemana = _sel[0], setSelSemana = _sel[1];
    var _d = useState(null), dados = _d[0], setDados = _d[1];
    var _l = useState(false), loading = _l[0], setLoading = _l[1];
    var _ls = useState(true), loadingSem = _ls[0], setLoadingSem = _ls[1];

    var fetchApi = useCallback(async function(endpoint) {
      var token = getToken();
      var res = await fetch(apiUrl + endpoint, { headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, credentials: 'include' });
      return res.json();
    }, [apiUrl, getToken]);

    useEffect(function() {
      setLoadingSem(true);
      fetchApi('/gerencial/semanas').then(function(res) {
        if (res.success && res.semanas && res.semanas.length > 0) {
          setSemanas(res.semanas);
          setSelSemana(res.semanas[0]);
        }
        setLoadingSem(false);
      }).catch(function() { setLoadingSem(false); });
    }, [fetchApi]);

    useEffect(function() {
      if (!selSemana) return;
      setLoading(true); setDados(null);
      fetchApi('/gerencial/dados?data_inicio=' + selSemana.data_inicio + '&data_fim=' + selSemana.data_fim)
        .then(function(res) { if (res.success) setDados(res); setLoading(false); })
        .catch(function() { setLoading(false); });
    }, [selSemana, fetchApi]);

    var d = dados || {};
    var k = d.kpis || {};

    return h('div', { className: 'min-h-screen bg-gray-50' },
      toastData && h(Toast, toastData),
      isLoadingGlobal && h(LoadingOverlay),
      h(HeaderCompacto, { usuario: usuario, moduloAtivo: Ee, socialProfile: socialProfile, isLoading: isLoading, lastUpdate: lastUpdate, onRefresh: ul, onLogout: function() { o(null); }, onGoHome: function() { he('home'); }, onNavigate: navegarSidebar }),

      h('div', { className: 'max-w-7xl mx-auto p-4 md:p-6' },

        // Toolbar: título + seletor de semana
        h('div', { className: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6' },
          h('div', null,
            h('h1', { className: 'text-xl font-bold text-gray-900' }, '📊 Análise Gerencial Semanal'),
            h('p', { className: 'text-sm text-gray-500 mt-1' }, 'Relatório consolidado de operações')
          ),
          h('select', {
            value: selSemana ? selSemana.data_inicio : '',
            onChange: function(e) {
              var found = semanas.find(function(s) { return s.data_inicio === e.target.value; });
              if (found) setSelSemana(found);
            },
            className: 'px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer',
            style: { minWidth: 220 }
          },
            loadingSem ? h('option', null, 'Carregando...') :
            semanas.map(function(s) {
              return h('option', { key: s.data_inicio, value: s.data_inicio },
                s.label + ' (' + fmtN(s.entregas) + ' ent.)'
              );
            })
          )
        ),

        // Loading
        loading ? h('div', { className: 'flex flex-col items-center justify-center py-20' },
          h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mb-4' }),
          h('p', { className: 'text-gray-500 text-sm' }, 'Processando dados da semana...')
        ) : !dados ? h('div', { className: 'text-center py-20 text-gray-400' }, 'Selecione uma semana') :

        h('div', null,

        // ═══ SEÇÃO 1: KPI Cards ═══
        h(SecaoTitulo, { icone: '📈', titulo: 'KPIs da Semana', sub: d.semana ? d.semana.label : '' }),
        h('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-2' },
          h(KpiCard, { label: 'Entregas', valor: fmtN(k.entregas), cor: '#7c3aed', sub: k.var_entregas != null ? setaVar(k.var_entregas) + '% vs ant.' : null, subCor: corVar(k.var_entregas) }),
          h(KpiCard, { label: 'No Prazo', valor: fmtP(k.prazo_pct), cor: k.prazo_pct >= 85 ? '#10b981' : '#f59e0b', sub: k.var_prazo_pp != null ? (k.var_prazo_pp >= 0 ? '+' : '') + fmtD(k.var_prazo_pp) + ' pp' : null, subCor: corVar(k.var_prazo_pp) }),
          h(KpiCard, { label: 'Faturamento', valor: fmtR(k.faturamento), cor: '#3b82f6', sub: k.var_faturamento != null ? setaVar(k.var_faturamento) + '% vs ant.' : null, subCor: corVar(k.var_faturamento) }),
          h(KpiCard, { label: 'Ticket Médio', valor: fmtR(k.ticket_medio), cor: '#06b6d4' }),
          h(KpiCard, { label: 'OS', valor: fmtN(k.os_count), cor: '#8b5cf6' }),
          h(KpiCard, { label: 'Entregadores', valor: fmtN(k.entregadores), cor: '#a855f7' })
        ),

        // ═══ SEÇÃO 2: SLA Comollati 767 ═══
        h(SecaoTitulo, { icone: '🏢', titulo: 'SLA Comollati (767)', sub: 'SLA fixo de 2 horas — todas as filiais' }),
        h('div', { className: 'bg-white rounded-xl overflow-hidden shadow-sm' },
          h(SlaTable, { rows: d.sla_767 || [] })
        ),

        // ═══ SEÇÃO 3: SLA Porto Seco ═══
        h(SecaoTitulo, { icone: '🚚', titulo: 'SLA Porto Seco', sub: 'SLA padrão por distância' }),
        h('div', { className: 'bg-white rounded-xl overflow-hidden shadow-sm' },
          h(SlaTable, { rows: d.sla_porto_seco || [] })
        ),

        // ═══ SEÇÃO 4: SLA Outros Monitorados ═══
        h(SecaoTitulo, { icone: '📋', titulo: 'SLA Outros Monitorados', sub: 'Clientes com acompanhamento especial' }),
        h('div', { className: 'bg-white rounded-xl overflow-hidden shadow-sm' },
          h(SlaTable, { rows: d.sla_outros || [] })
        ),

        // ═══ SEÇÃO 5: Ticket Médio Semanal ═══
        h(SecaoTitulo, { icone: '💰', titulo: 'Ticket Médio Líquido por Cliente', sub: 'Comparativo 4 semanas (Fat. Líquido / Entregas)' }),
        h('div', { className: 'bg-white rounded-xl overflow-hidden shadow-sm' },
          h(CompTable, { semanas: (d.ticket_medio || {}).semanas, clientes: (d.ticket_medio || {}).clientes, tipo: 'ticket' })
        ),

        // ═══ SEÇÃO 6: Variação de Demanda ═══
        h(SecaoTitulo, { icone: '📦', titulo: 'Variação de Demanda por Cliente', sub: 'Entregas por cliente — 4 semanas' }),
        h('div', { className: 'bg-white rounded-xl overflow-hidden shadow-sm' },
          h(CompTable, { semanas: (d.demanda || {}).semanas, clientes: (d.demanda || {}).clientes, tipo: 'demanda' })
        ),

        // ═══ SEÇÃO 7: Mínimo Garantido ═══
        h(SecaoTitulo, { icone: '🎯', titulo: 'Mínimo Garantido', sub: 'Apenas profissionais que RODARAM' }),
        h('div', { className: 'bg-white rounded-xl overflow-hidden shadow-sm' },
          h(GarantidoTable, { rows: d.garantido || [] })
        ),

        // Footer
        h('div', { className: 'text-center mt-8 text-xs text-gray-400 pb-4' },
          'Relatório gerado em ' + new Date().toLocaleString('pt-BR') + ' · Central Tutts'
        )
      )
      )
    );
  };

  console.log('✅ Módulo Análise Gerencial Semanal carregado');
})();
