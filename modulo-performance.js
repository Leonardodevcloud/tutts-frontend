// ================================================================
// MÓDULO PERFORMANCE DIÁRIA - Tutts v1.1
// Arquivo: modulo-performance.js
// Calcula SLA de entregas concluídas via RPA (Playwright)
// ================================================================

(function () {
  'use strict';

  const { useState, useEffect, useCallback, useRef } = React;
  const h = React.createElement;

  // ── Helpers de data/hora ──────────────────────────────────────
  function hoje() {
    return new Date().toISOString().slice(0, 10);
  }
  function fmtData(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }
  function fmtDT(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }
  function fmtMin(min) {
    if (min == null) return '—';
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${min}m`;
  }

  // ── Cores de SLA ─────────────────────────────────────────────
  function corPct(pct) {
    if (pct >= 90) return { text: 'text-green-600', bg: 'bg-green-50', bar: '#22c55e' };
    if (pct >= 75) return { text: 'text-yellow-600', bg: 'bg-yellow-50', bar: '#eab308' };
    return { text: 'text-red-600', bg: 'bg-red-50', bar: '#ef4444' };
  }

  // ── Badge status job ──────────────────────────────────────────
  const JOB_STATUS = {
    pendente:   { label: 'Aguardando', cls: 'bg-yellow-100 text-yellow-800' },
    executando: { label: 'Executando', cls: 'bg-blue-100 text-blue-700' },
    concluido:  { label: 'Concluído',  cls: 'bg-green-100 text-green-700' },
    erro:       { label: 'Erro',       cls: 'bg-red-100 text-red-700' },
  };

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: KPI Card
  // ════════════════════════════════════════════════════════════
  function KpiCard({ icon, label, value, sub, cor = 'purple' }) {
    const cores = {
      purple: { bg: 'bg-purple-50', ring: 'border-purple-200', text: 'text-purple-700', val: 'text-purple-900' },
      green:  { bg: 'bg-green-50',  ring: 'border-green-200',  text: 'text-green-700',  val: 'text-green-900' },
      red:    { bg: 'bg-red-50',    ring: 'border-red-200',    text: 'text-red-600',    val: 'text-red-800' },
      gray:   { bg: 'bg-gray-50',   ring: 'border-gray-200',   text: 'text-gray-500',   val: 'text-gray-700' },
    };
    const c = cores[cor] || cores.purple;
    return h('div', { className: `${c.bg} border ${c.ring} rounded-xl p-4 flex flex-col gap-1` },
      h('div', { className: 'flex items-center gap-2' },
        h('span', { className: 'text-xl' }, icon),
        h('span', { className: `text-xs font-semibold uppercase tracking-wide ${c.text}` }, label),
      ),
      h('p', { className: `text-3xl font-black ${c.val}` }, value),
      sub && h('p', { className: `text-xs ${c.text}` }, sub),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Barra de progresso SLA
  // ════════════════════════════════════════════════════════════
  function BarraSla({ pct, no_prazo, fora_prazo, sem_dados, total }) {
    const c = corPct(pct);
    const pctFora = total > 0 ? ((fora_prazo / total) * 100) : 0;
    const pctSem  = total > 0 ? ((sem_dados  / total) * 100) : 0;

    return h('div', { className: 'bg-white border rounded-xl p-5 shadow-sm' },
      h('div', { className: 'flex items-center justify-between mb-3' },
        h('span', { className: 'text-sm font-bold text-gray-700' }, '📊 SLA Geral'),
        h('span', { className: `text-2xl font-black ${c.text}` }, `${pct}%`),
      ),
      // Barra segmentada
      h('div', { className: 'w-full h-5 rounded-full overflow-hidden bg-gray-100 flex' },
        h('div', { style: { width: `${pct}%`, background: '#22c55e', transition: 'width .5s' } }),
        h('div', { style: { width: `${pctFora}%`, background: '#ef4444', transition: 'width .5s' } }),
        h('div', { style: { width: `${pctSem}%`, background: '#d1d5db', transition: 'width .5s' } }),
      ),
      h('div', { className: 'flex gap-4 mt-3 text-xs' },
        h('span', { className: 'text-green-600 font-semibold' }, `✓ ${no_prazo} no prazo`),
        h('span', { className: 'text-red-500 font-semibold' },   `✗ ${fora_prazo} fora`),
        h('span', { className: 'text-gray-400' },                `⬜ ${sem_dados} sem dados`),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Tabela por cliente
  // ════════════════════════════════════════════════════════════
  function TabelaClientes({ clientes }) {
    if (!clientes || !clientes.length) return null;

    return h('div', { className: 'bg-white border rounded-xl shadow-sm overflow-hidden' },
      h('div', { className: 'px-5 py-3 border-b bg-gray-50' },
        h('h3', { className: 'text-sm font-bold text-gray-700 uppercase tracking-wide' },
          '🏢 Performance por Cliente'
        ),
      ),
      h('div', { className: 'overflow-x-auto' },
        h('table', { className: 'w-full text-sm' },
          h('thead', {},
            h('tr', { className: 'bg-gray-50 text-xs uppercase text-gray-500' },
              h('th', { className: 'text-left px-4 py-2' }, 'Cliente'),
              h('th', { className: 'text-center px-3 py-2' }, 'Total'),
              h('th', { className: 'text-center px-3 py-2' }, 'No Prazo'),
              h('th', { className: 'text-center px-3 py-2' }, 'Fora'),
              h('th', { className: 'text-center px-3 py-2' }, 'Sem Dados'),
              h('th', { className: 'text-center px-3 py-2' }, 'SLA'),
              h('th', { className: 'px-3 py-2' }, ''),
            ),
          ),
          h('tbody', {},
            clientes.map((c, i) => {
              const cor = corPct(c.pct_no_prazo);
              return h('tr', { key: i, className: 'border-t hover:bg-gray-50 transition-colors' },
                h('td', { className: 'px-4 py-2.5' },
                  h('div', { className: 'font-medium text-gray-800 text-xs' },
                    c.cod_cliente ? `${c.cod_cliente} — ` : '',
                    h('span', { className: 'text-gray-600' }, c.nome_cliente || '—'),
                  ),
                ),
                h('td', { className: 'text-center px-3 py-2.5 font-bold text-gray-700' }, c.total),
                h('td', { className: 'text-center px-3 py-2.5 font-semibold text-green-600' }, c.no_prazo),
                h('td', { className: 'text-center px-3 py-2.5 font-semibold text-red-500' }, c.fora_prazo),
                h('td', { className: 'text-center px-3 py-2.5 text-gray-400' }, c.sem_dados),
                h('td', { className: 'text-center px-3 py-2.5' },
                  h('span', { className: `font-black text-sm ${cor.text}` }, `${c.pct_no_prazo}%`),
                ),
                h('td', { className: 'px-3 py-2.5 w-24' },
                  h('div', { className: 'w-full h-2 bg-gray-100 rounded-full overflow-hidden' },
                    h('div', {
                      className: 'h-full rounded-full transition-all',
                      style: { width: `${c.pct_no_prazo}%`, background: cor.bar },
                    }),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Tabela de OS detalhada
  // ════════════════════════════════════════════════════════════
  function TabelaOS({ registros, visivel, onToggle }) {
    const [filtro, setFiltro] = useState('todos');
    const [busca,  setBusca]  = useState('');

    if (!registros || !registros.length) return null;

    const lista = registros.filter(r => {
      if (filtro === 'no_prazo'   && r.sla_no_prazo !== true)  return false;
      if (filtro === 'fora_prazo' && r.sla_no_prazo !== false) return false;
      if (filtro === 'sem_dados'  && !r.sem_dados)             return false;
      if (busca) {
        const b = busca.toLowerCase();
        return (r.os?.toLowerCase().includes(b) ||
                r.cliente_txt?.toLowerCase().includes(b) ||
                r.profissional?.toLowerCase().includes(b));
      }
      return true;
    });

    return h('div', { className: 'bg-white border rounded-xl shadow-sm overflow-hidden' },
      // Header clicável
      h('div', {
        className: 'px-5 py-3 border-b bg-gray-50 flex items-center justify-between cursor-pointer select-none',
        onClick: onToggle,
      },
        h('h3', { className: 'text-sm font-bold text-gray-700 uppercase tracking-wide' },
          `📋 Detalhamento por OS (${registros.length})`
        ),
        h('span', { className: 'text-gray-400 text-xs' }, visivel ? '▲ Recolher' : '▼ Expandir'),
      ),

      visivel && h('div', {},
        // Filtros
        h('div', { className: 'px-4 py-3 border-b flex flex-wrap gap-2 items-center' },
          // Chips de filtro
          ['todos', 'no_prazo', 'fora_prazo', 'sem_dados'].map(f => {
            const labels = { todos: 'Todos', no_prazo: '✓ No Prazo', fora_prazo: '✗ Fora', sem_dados: '⬜ Sem Dados' };
            const ativo = filtro === f;
            return h('button', {
              key: f,
              onClick: () => setFiltro(f),
              className: `px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                ativo
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
              }`,
            }, labels[f]);
          }),
          // Busca
          h('input', {
            type: 'text',
            placeholder: 'Buscar OS, cliente, profissional...',
            value: busca,
            onChange: e => setBusca(e.target.value),
            className: 'ml-auto border rounded-lg px-3 py-1 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-purple-400',
          }),
          h('span', { className: 'text-xs text-gray-400' }, `${lista.length} registros`),
        ),

        // Tabela
        h('div', { className: 'overflow-x-auto max-h-96 overflow-y-auto' },
          h('table', { className: 'w-full text-xs' },
            h('thead', { className: 'sticky top-0 bg-gray-50 z-10' },
              h('tr', { className: 'text-left text-gray-500 uppercase' },
                ['OS', 'Cliente', 'Profissional', 'KM', 'Prazo', 'Duração', 'Delta', 'SLA'].map(col =>
                  h('th', { key: col, className: 'px-3 py-2 font-semibold whitespace-nowrap' }, col)
                ),
              ),
            ),
            h('tbody', {},
              lista.map((r, i) => {
                const statusCls = r.sem_dados
                  ? 'bg-gray-50 text-gray-400'
                  : r.sla_no_prazo
                    ? 'text-green-700'
                    : 'text-red-600';

                return h('tr', { key: i, className: 'border-t hover:bg-purple-50 transition-colors' },
                  h('td', { className: 'px-3 py-2 font-mono font-semibold text-purple-700' }, r.os),
                  h('td', { className: 'px-3 py-2 max-w-xs truncate text-gray-700' },
                    r.cod_cliente ? `${r.cod_cliente} — ` : '',
                    r.nome_cliente || '—',
                  ),
                  h('td', { className: 'px-3 py-2 text-gray-600 max-w-xs truncate' }, r.profissional || '—'),
                  h('td', { className: 'px-3 py-2 text-right text-gray-600' },
                    r.km != null ? `${r.km.toFixed(1)} km` : '—'
                  ),
                  h('td', { className: 'px-3 py-2 text-right text-gray-600' }, fmtMin(r.prazo_min)),
                  h('td', { className: 'px-3 py-2 text-right text-gray-600' }, fmtMin(r.duracao_min)),
                  h('td', { className: `px-3 py-2 text-right font-semibold ${statusCls}` },
                    r.sem_dados ? '—' : (r.sla_no_prazo ? `+${fmtMin(r.delta_min)}` : `-${fmtMin(r.delta_min)}`)
                  ),
                  h('td', { className: 'px-3 py-2' },
                    r.sem_dados
                      ? h('span', { className: 'text-gray-400' }, '—')
                      : h('span', {
                          className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            r.sla_no_prazo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`,
                        }, r.sla_no_prazo ? '✓ No prazo' : '✗ Fora'),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Painel de controle (filtros)
  // ════════════════════════════════════════════════════════════
  function PainelFiltros({ filtros, setFiltros, onExecutar, loading, jobStatus, API_URL, fetchAuth }) {
    const [clientes, setClientes] = useState([]);
    const [centrosCusto, setCentrosCusto] = useState([]);
    const [buscaCliente, setBuscaCliente] = useState('');
    const [dropAberto, setDropAberto] = useState(false);
    const [ccLoading, setCcLoading] = useState(false);
    const dropRef = useRef(null);

    // Carregar lista de clientes com máscaras ao montar
    useEffect(() => {
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/clientes-por-regiao`);
          const data = await r.json();
          if (Array.isArray(data)) setClientes(data);
        } catch (e) { console.error('Erro ao carregar clientes:', e); }
      })();
    }, [API_URL, fetchAuth]);

    // Carregar centros de custo quando seleciona cliente
    useEffect(() => {
      if (!filtros.codCliente) { setCentrosCusto([]); return; }
      (async () => {
        setCcLoading(true);
        try {
          const r = await fetchAuth(`${API_URL}/bi/centros-custo/${filtros.codCliente}`);
          const data = await r.json();
          if (Array.isArray(data)) setCentrosCusto(data);
          else setCentrosCusto([]);
        } catch (e) { setCentrosCusto([]); }
        setCcLoading(false);
      })();
    }, [filtros.codCliente, API_URL, fetchAuth]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
      const handler = (e) => {
        if (dropRef.current && !dropRef.current.contains(e.target)) setDropAberto(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Filtro de clientes pela busca
    const clientesFiltrados = buscaCliente.length > 0
      ? clientes.filter(c =>
          String(c.cod_cliente).includes(buscaCliente) ||
          (c.nome_display || '').toLowerCase().includes(buscaCliente.toLowerCase())
        )
      : clientes;

    // Cliente selecionado atualmente
    const clienteSel = clientes.find(c => String(c.cod_cliente) === String(filtros.codCliente));

    return h('div', { className: 'bg-white border rounded-xl shadow-sm p-5' },
      h('div', { className: 'flex flex-wrap gap-4 items-end' },

        // Data inicial
        h('div', { className: 'flex flex-col gap-1' },
          h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Data Inicial'),
          h('input', {
            type: 'date',
            value: filtros.dataInicio,
            onChange: e => setFiltros(f => ({ ...f, dataInicio: e.target.value })),
            className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
          }),
        ),

        // Data final
        h('div', { className: 'flex flex-col gap-1' },
          h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Data Final'),
          h('input', {
            type: 'date',
            value: filtros.dataFim,
            onChange: e => setFiltros(f => ({ ...f, dataFim: e.target.value })),
            className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
          }),
        ),

        // ── CLIENTE (searchable dropdown com máscaras) ──
        h('div', { className: 'flex flex-col gap-1 relative', ref: dropRef, style: { minWidth: '280px' } },
          h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Cliente'),
          // Input de busca / display
          h('div', { className: 'relative' },
            h('input', {
              type: 'text',
              placeholder: clientes.length > 0 ? 'Buscar cliente...' : 'Carregando...',
              value: dropAberto ? buscaCliente : (clienteSel ? `${clienteSel.cod_cliente} — ${clienteSel.nome_display}` : buscaCliente),
              onFocus: () => { setDropAberto(true); setBuscaCliente(''); },
              onChange: e => { setBuscaCliente(e.target.value); setDropAberto(true); },
              className: 'border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-400 pr-8',
            }),
            // Botão limpar
            filtros.codCliente && h('button', {
              onClick: (e) => {
                e.stopPropagation();
                setFiltros(f => ({ ...f, codCliente: '', centroCusto: '' }));
                setBuscaCliente('');
                setCentrosCusto([]);
              },
              className: 'absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-sm',
              title: 'Limpar'
            }, '✕'),
          ),
          // Dropdown
          dropAberto && h('div', {
            className: 'absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50',
          },
            clientesFiltrados.length === 0
              ? h('div', { className: 'px-4 py-3 text-sm text-gray-400 text-center' },
                  clientes.length === 0 ? 'Carregando clientes...' : 'Nenhum cliente encontrado'
                )
              : clientesFiltrados.slice(0, 50).map(c =>
                  h('div', {
                    key: c.cod_cliente,
                    onClick: () => {
                      setFiltros(f => ({ ...f, codCliente: String(c.cod_cliente), centroCusto: '' }));
                      setBuscaCliente('');
                      setDropAberto(false);
                    },
                    className: `px-4 py-2.5 cursor-pointer hover:bg-purple-50 flex items-center gap-2 text-sm ${
                      String(filtros.codCliente) === String(c.cod_cliente) ? 'bg-purple-50 font-semibold' : ''
                    }`,
                  },
                    h('span', { className: 'text-xs font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded min-w-[42px] text-center' }, c.cod_cliente),
                    h('span', { className: 'text-gray-700 truncate' }, c.nome_display),
                    c.mascara && c.mascara !== c.nome_original && h('span', { className: 'text-xs text-gray-400 ml-auto' }, '(máscara)'),
                  )
                ),
          ),
        ),

        // ── CENTRO DE CUSTO (dropdown dinâmico) ──
        h('div', { className: 'flex flex-col gap-1', style: { minWidth: '200px' } },
          h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Centro de Custo'),
          !filtros.codCliente
            ? h('select', {
                disabled: true,
                className: 'border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed',
              }, h('option', {}, 'Selecione um cliente'))
            : ccLoading
              ? h('div', { className: 'border rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50' }, '⏳ Carregando...')
              : h('select', {
                  value: filtros.centroCusto,
                  onChange: e => setFiltros(f => ({ ...f, centroCusto: e.target.value })),
                  className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
                },
                  h('option', { value: '' }, centrosCusto.length > 0 ? 'Todos os centros' : 'Sem centros de custo'),
                  ...centrosCusto.map(cc =>
                    h('option', { key: cc.centro_custo, value: cc.centro_custo },
                      `${cc.centro_custo} (${cc.total_entregas} ent.)`
                    )
                  ),
                ),
        ),

        // Botão executar
        h('button', {
          onClick: onExecutar,
          disabled: loading,
          className: `ml-auto flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            loading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
          }`,
        },
          loading
            ? h('span', { className: 'animate-spin' }, '⏳')
            : h('span', {}, '🔍'),
          loading ? 'Executando...' : 'Buscar Performance',
        ),
      ),

      // Status do job atual
      jobStatus && h('div', { className: `mt-3 flex items-center gap-2 text-xs ${
        jobStatus === 'executando' ? 'text-blue-600' :
        jobStatus === 'concluido'  ? 'text-green-600' :
        jobStatus === 'erro'       ? 'text-red-500' :
        'text-yellow-600'
      }` },
        jobStatus === 'executando' && h('span', { className: 'animate-pulse' }, '●'),
        h('span', {}, {
          pendente:   '⏳ Job na fila — será processado em breve...',
          executando: '🤖 Playwright em execução — buscando dados no sistema...',
          concluido:  '✅ Concluído com sucesso',
          erro:       '❌ Erro na execução — veja o histórico de jobs',
        }[jobStatus] || ''),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Histórico de jobs
  // ════════════════════════════════════════════════════════════
  function TabJobs({ API_URL, fetchAuth, showToast }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const r = await fetchAuth(`${API_URL}/performance/jobs`);
        const d = await r.json();
        setJobs(d.jobs || []);
      } catch { showToast('Erro ao carregar jobs', 'error'); }
      finally { setLoading(false); }
    }, [API_URL, fetchAuth, showToast]);

    useEffect(() => { carregar(); }, []);

    if (loading) return h('div', { className: 'flex justify-center py-12' },
      h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full' }),
    );

    return h('div', { className: 'space-y-3' },
      h('div', { className: 'flex items-center justify-between' },
        h('h3', { className: 'text-sm font-bold text-gray-700' }, '🗂️ Histórico de Execuções'),
        h('button', {
          onClick: carregar,
          className: 'text-xs text-purple-600 hover:underline',
        }, '↺ Atualizar'),
      ),
      h('div', { className: 'bg-white border rounded-xl overflow-hidden shadow-sm' },
        h('table', { className: 'w-full text-xs' },
          h('thead', {},
            h('tr', { className: 'bg-gray-50 text-gray-500 uppercase text-left' },
              ['#', 'Período', 'Cliente', 'Status', 'Total OS', 'Origem', 'Iniciado', 'Duração'].map(c =>
                h('th', { key: c, className: 'px-3 py-2 font-semibold' }, c)
              ),
            ),
          ),
          h('tbody', {},
            jobs.length === 0
              ? h('tr', {},
                  h('td', { colSpan: 8, className: 'text-center py-8 text-gray-400' }, 'Nenhum job executado ainda'),
                )
              : jobs.map(j => {
                  const st = JOB_STATUS[j.status] || { label: j.status, cls: 'bg-gray-100 text-gray-600' };
                  const duracao = j.concluido_em && j.iniciado_em
                    ? Math.round((new Date(j.concluido_em) - new Date(j.iniciado_em)) / 1000)
                    : null;
                  return h('tr', { key: j.id, className: 'border-t hover:bg-gray-50' },
                    h('td', { className: 'px-3 py-2 text-gray-400 font-mono' }, `#${j.id}`),
                    h('td', { className: 'px-3 py-2 font-medium text-gray-700' },
                      fmtData(j.data_inicio) + (j.data_inicio !== j.data_fim ? ` → ${fmtData(j.data_fim)}` : ''),
                    ),
                    h('td', { className: 'px-3 py-2 text-gray-600' }, j.cod_cliente || 'Todos'),
                    h('td', { className: 'px-3 py-2' },
                      h('span', { className: `px-2 py-0.5 rounded-full font-semibold ${st.cls}` }, st.label),
                    ),
                    h('td', { className: 'px-3 py-2 text-center font-bold text-gray-700' }, j.total_os ?? '—'),
                    h('td', { className: 'px-3 py-2 text-gray-500 capitalize' }, j.origem),
                    h('td', { className: 'px-3 py-2 text-gray-500' }, fmtDT(j.iniciado_em)),
                    h('td', { className: 'px-3 py-2 text-gray-500' },
                      duracao != null ? `${duracao}s` : '—'
                    ),
                    // Erro
                    j.erro && h('td', { className: 'px-3 py-2 text-red-500 max-w-xs truncate' },
                      h('span', { title: j.erro }, '⚠️ ' + j.erro.slice(0, 40)),
                    ),
                  );
                }),
          ),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE PRINCIPAL
  // ════════════════════════════════════════════════════════════
  function ModuloPerformanceDiaria({ initialProps }) {
    // Usar initialProps para capturar as props na montagem
    const { API_URL, fetchAuth, showToast } = initialProps;

    const [aba, setAba]         = useState('dashboard');
    const [filtros, setFiltros] = useState({
      dataInicio:  hoje(),
      dataFim:     hoje(),
      codCliente:  '',
      centroCusto: '',
    });
    const [snapshot,    setSnapshot]    = useState(null);
    const [loading,     setLoading]     = useState(false);
    const [jobAtual,    setJobAtual]    = useState(null);   // { id, status }
    const [osExpanded,  setOsExpanded]  = useState(false);
    const pollingRef = useRef(null);

    // Carrega snapshot ao montar (dados do dia, sem filtro de cliente)
    const carregarSnapshot = useCallback(async (params = {}) => {
      try {
        const qs = new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([, v]) => v))
        ).toString();
        const r = await fetchAuth(`${API_URL}/performance/snapshot${qs ? '?' + qs : ''}`);
        const d = await r.json();
        setSnapshot(d);
      } catch (err) {
        console.error('Erro ao carregar snapshot:', err);
      }
    }, [API_URL, fetchAuth]);

    useEffect(() => {
      carregarSnapshot({ data_inicio: hoje(), data_fim: hoje() });
    }, [carregarSnapshot]);

    // Polling enquanto job está executando
    const iniciarPolling = useCallback((jobId) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetchAuth(`${API_URL}/performance/jobs/${jobId}`);
          const d = await r.json();
          const st = d.job?.status;
          setJobAtual(j => ({ ...j, status: st }));
          if (st === 'concluido' || st === 'erro') {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setLoading(false);
            if (st === 'concluido') {
              showToast('Performance atualizada com sucesso! ✅', 'success');
              await carregarSnapshot({
                data_inicio:  filtros.dataInicio,
                data_fim:     filtros.dataFim,
                cod_cliente:  filtros.codCliente || undefined,
                centro_custo: filtros.centroCusto || undefined,
              });
            } else {
              showToast('Erro na execução. Veja o histórico de jobs.', 'error');
            }
          }
        } catch {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setLoading(false);
        }
      }, 5000);  // verifica a cada 5s
    }, [API_URL, fetchAuth, filtros, carregarSnapshot, showToast]);

    useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

    // Dispara execução
    const onExecutar = useCallback(async () => {
      if (!filtros.dataInicio || !filtros.dataFim) {
        showToast('Informe o período', 'error'); return;
      }
      setLoading(true);
      setJobAtual(null);
      try {
        const r = await fetchAuth(`${API_URL}/performance/executar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data_inicio:  filtros.dataInicio,
            data_fim:     filtros.dataFim,
            cod_cliente:  filtros.codCliente  ? parseInt(filtros.codCliente)  : undefined,
            centro_custo: filtros.centroCusto || undefined,
          }),
        });
        const d = await r.json();
        if (!r.ok) { showToast(d.error || 'Erro ao criar job', 'error'); setLoading(false); return; }
        setJobAtual({ id: d.job_id, status: 'pendente' });
        iniciarPolling(d.job_id);
        showToast(d.ja_existia ? 'Job já em andamento, acompanhando...' : 'Job criado! Executando...', 'info');
      } catch { showToast('Erro de conexão', 'error'); setLoading(false); }
    }, [filtros, API_URL, fetchAuth, iniciarPolling, showToast]);

    const snap = snapshot?.snapshot;
    const porCliente = snapshot?.por_cliente || [];
    const registros  = snapshot?.registros   || [];

    // ── Render ────────────────────────────────────────────────
    return h('div', { className: 'min-h-screen bg-gray-50' },

      // Cabeçalho
      h('div', { className: 'bg-gradient-to-r from-purple-700 to-purple-900 text-white px-6 py-5' },
        h('div', { className: 'max-w-7xl mx-auto flex items-center justify-between' },
          h('div', {},
            h('h1', { className: 'text-xl font-black' }, '📈 Performance Diária'),
            h('p', { className: 'text-purple-200 text-sm mt-0.5' },
              'SLA de entregas concluídas — atualização automática a cada 5 min'
            ),
          ),
          // Abas
          h('div', { className: 'flex gap-2' },
            [
              { id: 'dashboard', label: '📊 Dashboard' },
              { id: 'jobs',      label: '🗂️ Jobs' },
            ].map(tab => h('button', {
              key: tab.id,
              onClick: () => setAba(tab.id),
              className: `px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                aba === tab.id
                  ? 'bg-white text-purple-800'
                  : 'text-purple-200 hover:bg-purple-600'
              }`,
            }, tab.label)),
          ),
        ),
      ),

      // Conteúdo
      h('div', { className: 'max-w-7xl mx-auto px-4 py-6 space-y-5' },

        // Painel de filtros (sempre visível)
        h(PainelFiltros, {
          filtros, setFiltros,
          onExecutar,
          loading,
          jobStatus: jobAtual?.status,
          API_URL, fetchAuth,
        }),

        // ── ABA DASHBOARD ───────────────────────────────────
        aba === 'dashboard' && h('div', { className: 'space-y-5' },

          // Sem dados ainda
          !snap && !loading && h('div', {
            className: 'bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center',
          },
            h('p', { className: 'text-4xl mb-3' }, '🔍'),
            h('p', { className: 'text-gray-600 font-semibold' }, 'Nenhum dado para o período selecionado'),
            h('p', { className: 'text-gray-400 text-sm mt-1' }, 'Clique em "Buscar Performance" para executar'),
          ),

          // KPIs
          snap && h('div', {},
            // Info do snapshot
            h('p', { className: 'text-xs text-gray-400 mb-3' },
              `Última atualização: ${fmtDT(snap.criado_em)} — ` +
              `Período: ${fmtData(snap.data_inicio)}` +
              (snap.data_inicio !== snap.data_fim ? ` → ${fmtData(snap.data_fim)}` : '')
            ),
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-5' },
              h(KpiCard, { icon: '📦', label: 'Total OS', value: snap.total_os, cor: 'purple' }),
              h(KpiCard, {
                icon: '✅', label: 'No Prazo', value: snap.no_prazo, cor: 'green',
                sub: snap.pct_no_prazo != null ? `${snap.pct_no_prazo}% do total analisado` : undefined,
              }),
              h(KpiCard, { icon: '❌', label: 'Fora do Prazo', value: snap.fora_prazo, cor: 'red' }),
              h(KpiCard, { icon: '⬜', label: 'Sem Dados', value: snap.sem_dados, cor: 'gray' }),
            ),
            h(BarraSla, {
              pct:        snap.pct_no_prazo ?? 0,
              no_prazo:   snap.no_prazo,
              fora_prazo: snap.fora_prazo,
              sem_dados:  snap.sem_dados,
              total:      snap.total_os,
            }),
          ),

          // Tabela por cliente
          snap && porCliente.length > 0 && h(TabelaClientes, { clientes: porCliente }),

          // Tabela de OS
          snap && registros.length > 0 && h(TabelaOS, {
            registros,
            visivel: osExpanded,
            onToggle: () => setOsExpanded(v => !v),
          }),
        ),

        // ── ABA JOBS ─────────────────────────────────────────
        aba === 'jobs' && h(TabJobs, { API_URL, fetchAuth, showToast }),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // WRAPPER (padrão idêntico ao modulo-agente.js)
  // Monta via ReactDOM.render uma única vez, props voláteis
  // acessadas via ref para evitar re-render desnecessário.
  // ════════════════════════════════════════════════════════════
  window.__perfVolatileRef = { current: {} };

  window.ModuloPerformanceComponent = function ModuloPerformanceWrapper(props) {
    const containerRef = useRef(null);
    const mountedRef   = useRef(false);

    // Atualizar props voláteis sem causar re-render
    useEffect(() => {
      if (window.__perfVolatileRef) {
        window.__perfVolatileRef.current = {
          isLoading:  props.isLoading || props.n,
          lastUpdate: props.lastUpdate || props.E,
          onRefresh:  props.onRefresh,
        };
      }
    });

    useEffect(() => {
      if (mountedRef.current || !containerRef.current) return;
      mountedRef.current = true;

      // Montar o módulo real uma única vez
      ReactDOM.render(
        h(ModuloPerformanceDiaria, { initialProps: props }),
        containerRef.current
      );

      return () => {
        // Limpar quando o módulo é realmente desmontado (navegar para outro módulo)
        if (containerRef.current) {
          ReactDOM.unmountComponentAtNode(containerRef.current);
        }
        mountedRef.current = false;
      };
    }, []);

    return h('div', {
      ref: containerRef,
      className: 'performance-portal-root',
      style: { minHeight: '100vh' },
    });
  };

  console.log('✅ Módulo Performance Diária carregado — BUILD 2026-03-12');
})();
