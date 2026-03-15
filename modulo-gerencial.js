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
  function corV(v) { return v == null ? '#94a3b8' : v >= 0 ? '#10b981' : '#ef4444'; }
  function setaV(v) { return v == null ? '\u2014' : (v >= 0 ? '\u2191 ' : '\u2193 ') + fD(Math.abs(v)); }
  function ppV(v) { if (v == null) return h('span', { style: { color: '#94a3b8' } }, '\u2014'); return h('span', { style: { color: corV(v), fontWeight: 700 } }, (v >= 0 ? '+' : '') + fD(v) + ' pp'); }

  // ═══ KPI Card ═══
  function KpiCard(p) {
    return h('div', { className: 'bg-white rounded-xl shadow-sm p-4', style: { borderLeft: '4px solid ' + (p.cor || '#7c3aed') } },
      h('div', { className: 'text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2' }, p.label),
      h('div', { className: 'text-2xl font-extrabold text-gray-900' }, p.valor),
      p.sub ? h('div', { className: 'text-xs mt-1 font-semibold', style: { color: p.subCor || '#94a3b8' } }, p.sub) : null
    );
  }

  // ═══ SLA Table ═══
  function SlaTable(p) {
    var rows = p.rows || [];
    if (!rows.length) return h('div', { className: 'text-gray-400 text-center py-8 text-sm' }, p.empty || 'Sem dados. Configure os clientes na aba Configurações.');
    var tot = { e: 0, np: 0, fp: 0, ts: 0, tc: 0 };
    rows.forEach(function(r) { tot.e += r.entregas; tot.np += r.no_prazo; tot.fp += r.fora_prazo; if (r.tempo_medio > 0) { tot.ts += r.tempo_medio * r.entregas; tot.tc += r.entregas; } });
    var TH = function(t, a) { return h('th', { className: 'px-3 py-2 text-' + (a||'right') + ' text-xs font-bold text-gray-500 border-b-2 border-gray-200' }, t); };
    var TD = function(v, s) { return h('td', { className: 'px-3 py-2 text-right text-sm', style: s || {} }, v); };
    return h('div', { className: 'overflow-x-auto' },
      h('table', { className: 'w-full border-collapse text-sm' },
        h('thead', null, h('tr', { className: 'bg-gray-50' }, TH('Cliente','left'), TH('Entregas'), TH('No Prazo'), TH('% Prazo'), TH('Fora'), TH('% Fora'), TH('T. Médio'), TH('Var. pp'))),
        h('tbody', null,
          rows.map(function(r, i) {
            var pc = r.prazo_pct >= 90 ? '#10b981' : r.prazo_pct >= 75 ? '#f59e0b' : '#ef4444';
            var fp = r.entregas > 0 ? fP(r2(r.fora_prazo / r.entregas * 100)) : '0%';
            return h('tr', { key: i, className: i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50' },
              h('td', { className: 'px-3 py-2 font-semibold text-gray-900 text-sm max-w-[200px] truncate' }, r.nome || r.concat),
              TD(fN(r.entregas), { fontWeight: 700 }), TD(fN(r.no_prazo), { color: '#10b981' }),
              TD(fP(r.prazo_pct), { fontWeight: 700, color: pc }), TD(fN(r.fora_prazo), { color: '#ef4444' }),
              TD(fp, { color: '#ef4444' }), TD(r.tempo_medio > 0 ? fD(r.tempo_medio, 0) + ' min' : '\u2014'),
              h('td', { className: 'px-3 py-2 text-right' }, ppV(r.var_pp))
            );
          }),
          h('tr', { className: 'border-t-2 border-purple-500', style: { background: 'rgba(124,58,237,.04)' } },
            h('td', { className: 'px-3 py-2 font-extrabold text-purple-700' }, 'TOTAL'),
            TD(fN(tot.e), { fontWeight: 800 }), TD(fN(tot.np), { fontWeight: 700, color: '#10b981' }),
            TD(fP(tot.e > 0 ? r2(tot.np/tot.e*100) : 0), { fontWeight: 800, color: tot.np/tot.e >= .85 ? '#10b981' : '#f59e0b' }),
            TD(fN(tot.fp), { fontWeight: 700, color: '#ef4444' }),
            TD(fP(tot.e > 0 ? r2(tot.fp/tot.e*100) : 0), { color: '#ef4444' }),
            TD(tot.tc > 0 ? fD(tot.ts/tot.tc, 0) + ' min' : '\u2014', { fontWeight: 700 }),
            TD('\u2014')
          )
        )
      )
    );
  }

  // ═══ Comp Table (Ticket / Demanda) ═══
  function CompTable(p) {
    var sl = p.semanas || [], rows = (p.clientes || []).slice(0, 30);
    var fmt = p.tipo === 'ticket' ? fR : fN;
    if (!rows.length) return h('div', { className: 'text-gray-400 text-center py-8 text-sm' }, 'Sem dados');
    return h('div', { className: 'overflow-x-auto' },
      h('table', { className: 'w-full border-collapse text-sm' },
        h('thead', null, h('tr', { className: 'bg-gray-50' },
          h('th', { className: 'px-3 py-2 text-left text-xs font-bold text-gray-500 border-b-2 border-gray-200' }, 'Cliente'),
          sl.map(function(s, i) { return h('th', { key: i, className: 'px-3 py-2 text-right text-xs font-bold text-gray-500 border-b-2 border-gray-200' }, s); }),
          h('th', { className: 'px-3 py-2 text-right text-xs font-bold text-gray-500 border-b-2 border-gray-200' }, 'Var. %')
        )),
        h('tbody', null, rows.map(function(r, i) {
          return h('tr', { key: i, className: i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50' },
            h('td', { className: 'px-3 py-2 font-semibold text-gray-900 max-w-[200px] truncate' }, r.nome),
            r.semanas.map(function(v, j) { return h('td', { key: j, className: 'px-3 py-2 text-right', style: { color: v != null ? '#1e293b' : '#cbd5e1' } }, v != null ? fmt(v) : '\u2014'); }),
            h('td', { className: 'px-3 py-2 text-right font-bold', style: { color: corV(r.variacao) } }, r.variacao != null ? setaV(r.variacao) + '%' : '\u2014')
          );
        }))
      )
    );
  }

  // ═══ Garantido Table ═══
  function GarantidoTable(p) {
    var rows = p.rows || [];
    if (!rows.length) return h('div', { className: 'text-gray-400 text-center py-8 text-sm' }, 'Sem dados');
    var tot = { n: 0, p: 0, c: 0, f: 0, s: 0 };
    rows.forEach(function(r) { tot.n += r.negociado; tot.p += r.produzido; tot.c += r.complemento; tot.f += r.fat_liquido; tot.s += r.saldo; });
    return h('div', { className: 'overflow-x-auto' },
      h('table', { className: 'w-full border-collapse text-sm' },
        h('thead', null, h('tr', { className: 'bg-gray-50' },
          ['Cliente','Negociado','Produzido','Complemento','Fat. Líquido','Saldo'].map(function(c, i) {
            return h('th', { key: i, className: 'px-3 py-2 text-' + (i===0?'left':'right') + ' text-xs font-bold text-gray-500 border-b-2 border-gray-200' }, c);
          })
        )),
        h('tbody', null,
          rows.map(function(r, i) {
            return h('tr', { key: i, className: i%2===0 ? 'bg-white' : 'bg-gray-50/50' },
              h('td', { className: 'px-3 py-2 font-semibold text-gray-900' }, r.nome || ('Cliente ' + r.cod_cliente)),
              h('td', { className: 'px-3 py-2 text-right' }, fR(r.negociado)),
              h('td', { className: 'px-3 py-2 text-right' }, fR(r.produzido)),
              h('td', { className: 'px-3 py-2 text-right', style: { color: r.complemento > 0 ? '#f59e0b' : '#64748b' } }, fR(r.complemento)),
              h('td', { className: 'px-3 py-2 text-right font-semibold' }, fR(r.fat_liquido)),
              h('td', { className: 'px-3 py-2 text-right font-bold', style: { color: r.saldo >= 0 ? '#10b981' : '#ef4444' } }, fR(r.saldo))
            );
          }),
          h('tr', { className: 'border-t-2 border-purple-500', style: { background: 'rgba(124,58,237,.04)' } },
            h('td', { className: 'px-3 py-2 font-extrabold text-purple-700' }, 'TOTAL'),
            h('td', { className: 'px-3 py-2 text-right font-bold' }, fR(tot.n)),
            h('td', { className: 'px-3 py-2 text-right font-bold' }, fR(tot.p)),
            h('td', { className: 'px-3 py-2 text-right font-bold', style: { color: '#f59e0b' } }, fR(tot.c)),
            h('td', { className: 'px-3 py-2 text-right font-bold' }, fR(tot.f)),
            h('td', { className: 'px-3 py-2 text-right font-extrabold', style: { color: tot.s >= 0 ? '#10b981' : '#ef4444' } }, fR(tot.s))
          )
        )
      )
    );
  }

  function Secao(p) {
    return h('div', { className: 'mt-8 mb-4' },
      h('div', { className: 'flex items-center gap-2 mb-1' }, h('span', { className: 'text-xl' }, p.icone || '📊'), h('h2', { className: 'text-lg font-extrabold text-gray-900' }, p.titulo)),
      p.sub ? h('p', { className: 'text-xs text-gray-500' }, p.sub) : null
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

    if (loading) return h('div', { className: 'text-center py-12 text-gray-400' }, 'Carregando...');

    // ── Collapsible Group Card ──
    function GrupoCard(titulo, icone, items, isOpen, toggle) {
      return h('div', { className: 'bg-white rounded-xl shadow-sm mb-4 overflow-hidden' },
        // Header clicável
        h('div', {
          onClick: toggle,
          className: 'flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors',
        },
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-lg' }, icone),
            h('h3', { className: 'font-bold text-gray-900' }, titulo),
            h('span', { className: 'text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold' }, items.length)
          ),
          h('span', { className: 'text-gray-400 text-lg transition-transform ' + (isOpen ? 'rotate-180' : '') }, '▾')
        ),
        // Conteúdo expansível
        isOpen ? h('div', { className: 'border-t border-gray-100 px-5 pb-4' },
          items.length === 0 ?
            h('p', { className: 'text-gray-400 text-sm py-3 text-center' }, 'Nenhum cliente configurado. Use o seletor acima para adicionar.') :
            h('div', { className: 'divide-y divide-gray-100' },
              items.map(function(item) {
                return h('div', { key: item.id, className: 'flex items-center justify-between py-3' },
                  h('div', { className: 'flex items-center gap-3 min-w-0' },
                    h('div', { className: 'w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0' }, item.cod_cliente),
                    h('div', { className: 'min-w-0' },
                      h('div', { className: 'font-semibold text-gray-800 text-sm truncate' }, item.nome_display || ('Cliente ' + item.cod_cliente)),
                      item.centro_custo ? h('div', { className: 'text-xs text-gray-400' }, 'CC: ' + item.centro_custo) : null
                    )
                  ),
                  h('button', {
                    onClick: function() { remover(item.id); },
                    className: 'text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full w-7 h-7 flex items-center justify-center transition-colors flex-shrink-0',
                  }, '✕')
                );
              })
            )
        ) : null
      );
    }

    return h('div', null,

      // ── Seletor de Grupo + Adicionar ──
      h('div', { className: 'bg-white rounded-xl shadow-sm p-5 mb-6' },
        h('div', { className: 'flex items-center justify-between mb-4' },
          h('h3', { className: 'font-bold text-gray-900' }, '⚙️ Configurar Grupos de SLA'),
          h('div', { className: 'flex bg-gray-100 rounded-lg p-0.5' },
            h('button', {
              onClick: function() { setGrupo('porto_seco'); },
              className: 'px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ' + (grupo === 'porto_seco' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'),
            }, '🚚 Porto Seco'),
            h('button', {
              onClick: function() { setGrupo('outros'); },
              className: 'px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ' + (grupo === 'outros' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'),
            }, '📋 Outros')
          )
        ),

        // Busca
        h('div', { className: 'relative mb-3' },
          h('span', { className: 'absolute left-3 top-2.5 text-gray-400 text-sm' }, '🔍'),
          h('input', {
            type: 'text', placeholder: 'Buscar cliente por código ou nome...',
            value: search, onChange: function(e) { setSearch(e.target.value); },
            className: 'w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent',
          })
        ),

        // Lista de clientes com checkboxes
        h('div', { className: 'border border-gray-200 rounded-lg max-h-80 overflow-y-auto' },
          filtrados.length === 0 ?
            h('div', { className: 'text-center py-6 text-gray-400 text-sm' }, 'Nenhum cliente encontrado') :
            filtrados.slice(0, 80).map(function(cl) {
              var cod = cl.cod_cliente;
              var nome = cl.mascara || cl.nome;
              var temCC = cl.centros.length > 0;
              var isExp = expanded[cod];
              // Check: cliente inteiro (sem CC) está configurado?
              var clienteSemCC = isConfigured(cod, '');
              // Ou algum CC está configurado?
              var algumCCConfigurado = cl.centros.some(function(cc) { return isConfigured(cod, cc); });
              var isChecked = clienteSemCC || algumCCConfigurado;

              return h('div', { key: cod, className: 'border-b border-gray-100 last:border-b-0' },
                // Linha do cliente
                h('div', { className: 'flex items-center px-4 py-2.5 hover:bg-gray-50 transition-colors' },
                  // Checkbox do cliente (sem CC)
                  !temCC ? h('input', {
                    type: 'checkbox',
                    checked: clienteSemCC,
                    onChange: function() { toggleItem(cod, '', nome); },
                    className: 'w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 mr-3 cursor-pointer',
                  }) : h('div', { className: 'w-4 mr-3' }),
                  // Info
                  h('div', {
                    className: 'flex-1 min-w-0 cursor-pointer',
                    onClick: temCC ? function() { toggleExpand(cod); } : function() { toggleItem(cod, '', nome); },
                  },
                    h('div', { className: 'flex items-center gap-2' },
                      h('span', { className: 'text-xs font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded' }, cod),
                      h('span', { className: 'font-medium text-gray-800 text-sm truncate' }, nome),
                      isChecked ? h('span', { className: 'text-xs text-green-600' }, '✓') : null
                    )
                  ),
                  // Expand arrow se tem CC
                  temCC ? h('button', {
                    onClick: function() { toggleExpand(cod); },
                    className: 'text-gray-400 hover:text-gray-600 px-2 py-1 text-xs',
                  }, (cl.centros.length) + ' CC ' + (isExp ? '▴' : '▾')) : null
                ),
                // Centros de custo expandidos
                isExp && temCC ? h('div', { className: 'bg-gray-50/50 pl-11 pr-4 pb-2' },
                  // Opção "Todos (sem CC específico)"
                  h('label', { className: 'flex items-center gap-2 py-1.5 cursor-pointer hover:bg-white rounded px-2 -ml-2' },
                    h('input', {
                      type: 'checkbox', checked: clienteSemCC,
                      onChange: function() { toggleItem(cod, '', nome); },
                      className: 'w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer',
                    }),
                    h('span', { className: 'text-xs text-gray-600' }, 'Todos (geral)')
                  ),
                  cl.centros.map(function(cc) {
                    var ccChecked = isConfigured(cod, cc);
                    return h('label', { key: cc, className: 'flex items-center gap-2 py-1.5 cursor-pointer hover:bg-white rounded px-2 -ml-2' },
                      h('input', {
                        type: 'checkbox', checked: ccChecked,
                        onChange: function() { toggleItem(cod, cc, nome); },
                        className: 'w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer',
                      }),
                      h('span', { className: 'text-xs text-gray-700 font-medium' }, cc)
                    );
                  })
                ) : null
              );
            })
        ),
        // Contador
        h('div', { className: 'mt-2 text-xs text-gray-400 text-right' },
          grupo === 'porto_seco' ? psItems.length + ' clientes no Porto Seco' : outItems.length + ' clientes em Outros Monitorados'
        )
      ),

      // ── Cards expansíveis dos grupos ──
      GrupoCard('SLA Porto Seco', '🚚', psItems, openPS, function() { setOpenPS(!openPS); }),
      GrupoCard('SLA Outros Monitorados', '📋', outItems, openOut, function() { setOpenOut(!openOut); })
    );
  }

  // ═══ COMPONENTE PRINCIPAL ═══
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

    return h('div', { className: 'min-h-screen bg-gray-50' },
      toastData && h(Toast, toastData),
      isLoadingGlobal && h(LoadingOverlay),
      h(HeaderCompacto, { usuario: usuario, moduloAtivo: Ee, socialProfile: socialProfile, isLoading: isLoading, lastUpdate: lastUpdate, onRefresh: ul, onLogout: function() { o(null); }, onGoHome: function() { he('home'); }, onNavigate: navegarSidebar }),

      h('div', { className: 'max-w-7xl mx-auto p-4 md:p-6' },

        // Toolbar
        h('div', { className: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4' },
          h('div', null,
            h('h1', { className: 'text-xl font-bold text-gray-900' }, '📊 Análise Gerencial Semanal'),
            h('p', { className: 'text-sm text-gray-500 mt-0.5' }, 'Relatório consolidado de operações')
          ),
          h('div', { className: 'flex items-center gap-3' },
            // Tabs
            h('div', { className: 'flex bg-white border border-gray-200 rounded-lg overflow-hidden' },
              h('button', { onClick: function() { setTab('relatorio'); }, className: 'px-4 py-2 text-sm font-semibold ' + (tab === 'relatorio' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50') }, '📈 Relatório'),
              h('button', { onClick: function() { setTab('config'); }, className: 'px-4 py-2 text-sm font-semibold ' + (tab === 'config' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50') }, '⚙️ Config')
            ),
            // Semana selector (só no relatório)
            tab === 'relatorio' ? h('select', {
              value: selSemana ? selSemana.data_inicio : '',
              onChange: function(e) { var f = semanas.find(function(s) { return s.data_inicio === e.target.value; }); if (f) setSelSemana(f); },
              className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white', style: { minWidth: 200 }
            }, semanas.map(function(s) { return h('option', { key: s.data_inicio, value: s.data_inicio }, s.label + ' (' + fN(s.entregas) + ')'); })) : null
          )
        ),

        // Tab Config
        tab === 'config' ? h(ConfigView, { fetchApi: fetchApi }) :

        // Tab Relatório
        loading ? h('div', { className: 'flex flex-col items-center py-20' },
          h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mb-4' }),
          h('p', { className: 'text-gray-500 text-sm' }, 'Carregando dados...')
        ) :
        erro ? h('div', { className: 'bg-red-50 border border-red-200 rounded-xl p-6 text-center' },
          h('p', { className: 'text-red-600 font-medium' }, erro)
        ) :
        !dados ? h('div', { className: 'text-center py-20 text-gray-400' }, 'Selecione uma semana') :

        h('div', null,
          // KPIs
          h(Secao, { icone: '📈', titulo: 'KPIs da Semana', sub: d.semana ? d.semana.label : '' }),
          h('div', { className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3' },
            h(KpiCard, { label: 'Entregas', valor: fN(k.entregas), cor: '#7c3aed', sub: k.var_entregas != null ? setaV(k.var_entregas) + '%' : null, subCor: corV(k.var_entregas) }),
            h(KpiCard, { label: 'No Prazo', valor: fP(k.prazo_pct), cor: k.prazo_pct >= 85 ? '#10b981' : '#f59e0b', sub: k.var_prazo_pp != null ? (k.var_prazo_pp >= 0 ? '+' : '') + fD(k.var_prazo_pp) + ' pp' : null, subCor: corV(k.var_prazo_pp) }),
            h(KpiCard, { label: 'Faturamento', valor: fR(k.faturamento), cor: '#3b82f6', sub: k.var_faturamento != null ? setaV(k.var_faturamento) + '%' : null, subCor: corV(k.var_faturamento) }),
            h(KpiCard, { label: 'Ticket Médio', valor: fR(k.ticket_medio), cor: '#06b6d4' }),
            h(KpiCard, { label: 'OS', valor: fN(k.os_count), cor: '#8b5cf6' }),
            h(KpiCard, { label: 'Entregadores', valor: fN(k.entregadores), cor: '#a855f7' })
          ),
          // SLA 767
          h(Secao, { icone: '🏢', titulo: 'SLA Comollati (767)', sub: 'SLA fixo de 2 horas' }),
          h('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' }, h(SlaTable, { rows: d.sla_767 || [], empty: 'Sem dados do cliente 767 nesta semana' })),
          // Porto Seco
          h(Secao, { icone: '🚚', titulo: 'SLA Porto Seco', sub: (d.config_count || {}).porto_seco + ' clientes configurados' }),
          h('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' }, h(SlaTable, { rows: d.sla_porto_seco || [] })),
          // Outros
          h(Secao, { icone: '📋', titulo: 'SLA Outros Monitorados', sub: (d.config_count || {}).outros + ' clientes configurados' }),
          h('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' }, h(SlaTable, { rows: d.sla_outros || [] })),
          // Ticket
          h(Secao, { icone: '💰', titulo: 'Ticket Médio Líquido por Cliente', sub: 'Comparativo 4 semanas' }),
          h('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' }, h(CompTable, { semanas: (d.ticket_medio||{}).semanas, clientes: (d.ticket_medio||{}).clientes, tipo: 'ticket' })),
          // Demanda
          h(Secao, { icone: '📦', titulo: 'Variação de Demanda', sub: 'Entregas por cliente — 4 semanas' }),
          h('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' }, h(CompTable, { semanas: (d.demanda||{}).semanas, clientes: (d.demanda||{}).clientes, tipo: 'demanda' })),
          // Garantido
          h(Secao, { icone: '🎯', titulo: 'Mínimo Garantido' }),
          h('div', { className: 'bg-white rounded-xl shadow-sm overflow-hidden' }, h(GarantidoTable, { rows: d.garantido || [] })),
          // Footer
          h('div', { className: 'text-center mt-8 text-xs text-gray-400 pb-4' }, 'Gerado em ' + new Date().toLocaleString('pt-BR') + ' · Central Tutts')
        )
      )
    );
  };

  function r2(n) { return Math.round(n * 100) / 100; }
  console.log('✅ Módulo Análise Gerencial Semanal v2 carregado');
})();
