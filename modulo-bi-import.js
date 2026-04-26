/**
 * modulo-bi-import.js
 * Componente React Vanilla — sub-aba "Automático (RPA)" do módulo BI / Upload.
 *
 * Tela admin com:
 *  - Botão "Importar agora" (POST /agent/bi-import)
 *  - Polling do job ativo (GET /agent/bi-import/status/:id)
 *  - Tabela histórico (GET /agent/bi-import/historico)
 *
 * Exporta como: window.BiImportAutoTab
 */

(function () {
  'use strict';

  const { useState, useEffect, useCallback, useRef } = React;
  const h = React.createElement;

  function BiImportAutoTab({ API_URL, fetchAuth, showToast }) {
    const [dados, setDados]       = useState([]);
    const [total, setTotal]       = useState(0);
    const [loading, setLoading]   = useState(false);
    const [filtros, setFiltros]   = useState({ status: '', origem: '', data_referencia: '' });
    const [page, setPage]         = useState(1);
    const PER_PAGE = 30;

    const [enviando, setEnviando] = useState(false);
    const [jobAtivo, setJobAtivo] = useState(null);
    const [dataManual, setDataManual] = useState('');

    const filtrosRef = useRef(filtros);
    filtrosRef.current = filtros;
    const pollingRef  = useRef(null);

    const showToastFn = showToast || ((msg) => alert(msg));

    function pararPolling() {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    }
    useEffect(() => () => pararPolling(), []);

    const carregar = useCallback(async (pg = 1, f) => {
      const filtrosAtivos = f || filtrosRef.current;
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: pg, per_page: PER_PAGE });
        if (filtrosAtivos.status)          params.set('status',          filtrosAtivos.status);
        if (filtrosAtivos.origem)          params.set('origem',          filtrosAtivos.origem);
        if (filtrosAtivos.data_referencia) params.set('data_referencia', filtrosAtivos.data_referencia);
        const res  = await fetchAuth(`${API_URL}/agent/bi-import/historico?${params}`);
        const data = await res.json();
        setDados(data.registros || []);
        setTotal(data.total || 0);
        setPage(pg);
      } catch {
        showToastFn('Erro ao carregar histórico de imports', 'error');
      } finally {
        setLoading(false);
      }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar(); }, []);

    const totalPaginas = Math.ceil(total / PER_PAGE);
    const aplicarFiltros = () => carregar(1, filtros);
    const handleFiltro = (e) => {
      const { name, value } = e.target;
      setFiltros(f => ({ ...f, [name]: value }));
    };
    const limparFiltros = () => {
      const v = { status: '', origem: '', data_referencia: '' };
      setFiltros(v);
      carregar(1, v);
    };

    async function handleImportar() {
      setEnviando(true);
      try {
        const body = dataManual ? { data_referencia: dataManual } : {};
        const res = await fetchAuth(`${API_URL}/agent/bi-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (!res.ok) {
          const msg = data.erros ? data.erros.join(' ') : (data.erro || 'Erro ao enfileirar.');
          showToastFn(msg, 'error');
          setEnviando(false);
          return;
        }

        showToastFn('Importação enfileirada! Acompanhando...', 'success');
        setJobAtivo({ id: data.id, status: 'pendente', etapa_atual: 'iniciando', progresso: 0 });
        iniciarPolling(data.id);
        carregar(1, filtros);
      } catch {
        showToastFn('Falha de conexão.', 'error');
        setEnviando(false);
      }
    }

    function iniciarPolling(id) {
      pararPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetchAuth(`${API_URL}/agent/bi-import/status/${id}`);
          if (!r.ok) return;
          const d = await r.json();
          setJobAtivo(d);
          if (d.status === 'sucesso' || d.status === 'falhou') {
            pararPolling();
            setEnviando(false);
            if (d.status === 'sucesso') {
              showToastFn(`Import concluído: ${d.linhas_inseridas || 0} linhas inseridas, ${d.linhas_ignoradas || 0} ignoradas.`, 'success');
            } else {
              showToastFn(`Import falhou: ${(d.erro || 'Erro desconhecido').slice(0, 100)}`, 'error');
            }
            carregar(page, filtros);
            setTimeout(() => setJobAtivo(null), 8000);
          }
        } catch { /* ignora */ }
      }, 5000);
    }

    const labelStatus = {
      sucesso: '✅ Sucesso',
      falhou: '❌ Falhou',
      processando: '⏳ Processando',
      pendente: '⏸️ Pendente',
    };
    const corStatus = {
      sucesso:     'bg-green-100 text-green-800 border-green-300',
      falhou:      'bg-red-100 text-red-800 border-red-300',
      processando: 'bg-blue-100 text-blue-800 border-blue-300',
      pendente:    'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    const labelEtapa = {
      iniciando: 'Iniciando...',
      login: 'Fazendo login...',
      navegando: 'Navegando pra exportação...',
      configurando_filtros: 'Configurando filtros...',
      buscando: 'Buscando dados...',
      gerando_excel: 'Gerando Excel BI...',
      baixando: 'Baixando arquivo...',
      processando_planilha: 'Processando planilha...',
      enviando_bi: 'Enviando pro BI...',
      concluido: 'Concluído!',
    };

    const fmtData = (s) => {
      if (!s) return '—';
      const d = new Date(s);
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    };
    const fmtDataRef = (s) => {
      if (!s) return '—';
      const str = typeof s === 'string' ? s.slice(0, 10) : new Date(s).toISOString().slice(0, 10);
      const [a, m, d] = str.split('-');
      return `${d}/${m}/${a}`;
    };

    return h('div', { className: 'space-y-6' },

      // Card "Importar agora"
      h('div', { className: 'bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 p-5 rounded-r-lg' },
        h('div', { className: 'mb-3' },
          h('h3', { className: 'text-lg font-bold text-purple-900' }, '🤖 Importação Automática (RPA)'),
          h('p', { className: 'text-sm text-purple-700' },
            'O sistema baixa a planilha do Tutts/expresso, aplica o tratamento e sobe pro BI. ',
            h('strong', null, 'Cron diário às 10h (TZ Bahia)'), ' processa D-1 automaticamente.'
          )
        ),
        h('div', { className: 'flex items-end gap-3 flex-wrap' },
          h('div', { className: 'flex-1 min-w-[200px]' },
            h('label', { className: 'block text-xs font-semibold text-purple-900 mb-1' }, '▶️ Importar manualmente — escolha a data:'),
            h('input', {
              type: 'date',
              value: dataManual,
              onChange: (e) => setDataManual(e.target.value),
              disabled: enviando,
              className: 'px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white',
            }),
            h('p', { className: 'text-xs text-purple-600 mt-1' }, 'Vazio = ontem (D-1)')
          ),
          h('button', {
            onClick: handleImportar,
            disabled: enviando,
            className: 'px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md',
          }, enviando ? '⏳ Processando...' : '🚀 Importar agora')
        ),

        // Progresso ao vivo
        jobAtivo && h('div', { className: 'mt-4 p-3 bg-white rounded-lg border border-purple-200' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('div', null,
              h('span', { className: 'text-sm font-bold text-gray-800' }, `Job #${jobAtivo.id}`),
              h('span', {
                className: `ml-2 inline-block px-2 py-0.5 rounded text-xs font-semibold border ${corStatus[jobAtivo.status] || 'bg-gray-100'}`,
              }, labelStatus[jobAtivo.status] || jobAtivo.status)
            ),
            h('span', { className: 'text-xs text-gray-500' }, `${jobAtivo.progresso || 0}%`)
          ),
          h('div', { className: 'h-2 bg-gray-200 rounded-full overflow-hidden mb-2' },
            h('div', {
              className: 'h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500',
              style: { width: `${jobAtivo.progresso || 0}%` },
            })
          ),
          h('p', { className: 'text-xs text-purple-700 font-semibold' },
            labelEtapa[jobAtivo.etapa_atual] || jobAtivo.etapa_atual || ''
          ),
          jobAtivo.status === 'sucesso' && h('p', { className: 'text-xs text-green-700 mt-1' },
            `✓ ${jobAtivo.linhas_inseridas || 0} inseridas, ${jobAtivo.linhas_ignoradas || 0} ignoradas (de ${jobAtivo.total_linhas || 0} totais)`
          ),
          jobAtivo.status === 'falhou' && h('p', { className: 'text-xs text-red-700 mt-1' },
            `⚠️ ${jobAtivo.erro || 'Erro desconhecido'}`
          )
        )
      ),

      // Cabeçalho histórico + atualizar
      h('div', { className: 'flex justify-between items-center' },
        h('h3', { className: 'text-lg font-bold text-gray-800' }, `📋 Histórico de Importações Automáticas (${total})`),
        h('button', {
          onClick: () => carregar(page, filtros),
          disabled: loading,
          className: 'px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-semibold disabled:opacity-50',
        }, loading ? 'Carregando...' : '🔄 Atualizar')
      ),

      // Filtros
      h('div', { className: 'bg-white p-4 rounded-xl shadow-sm border border-gray-200' },
        h('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-3' },
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1' }, 'Status'),
            h('select', {
              name: 'status',
              value: filtros.status,
              onChange: handleFiltro,
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm',
            },
              h('option', { value: '' }, 'Todos'),
              h('option', { value: 'pendente' }, 'Pendente'),
              h('option', { value: 'processando' }, 'Processando'),
              h('option', { value: 'sucesso' }, 'Sucesso'),
              h('option', { value: 'falhou' }, 'Falhou')
            )
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1' }, 'Origem'),
            h('select', {
              name: 'origem',
              value: filtros.origem,
              onChange: handleFiltro,
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm',
            },
              h('option', { value: '' }, 'Todas'),
              h('option', { value: 'cron' }, '🤖 Cron (10h)'),
              h('option', { value: 'manual' }, '👤 Manual')
            )
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1' }, 'Data referência'),
            h('input', {
              type: 'date', name: 'data_referencia', value: filtros.data_referencia, onChange: handleFiltro,
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm',
            })
          ),
          h('div', { className: 'flex items-end gap-2' },
            h('button', {
              onClick: aplicarFiltros,
              className: 'flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700',
            }, 'Filtrar'),
            h('button', {
              onClick: limparFiltros,
              className: 'px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300',
            }, 'Limpar')
          )
        )
      ),

      // Tabela
      h('div', { className: 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' },
        loading && dados.length === 0
          ? h('div', { className: 'p-10 text-center text-gray-500' }, 'Carregando...')
          : dados.length === 0
            ? h('div', { className: 'p-10 text-center text-gray-500' },
                h('p', { className: 'text-4xl mb-2' }, '📭'),
                h('p', null, 'Nenhuma importação automática ainda.')
              )
            : h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'w-full text-sm' },
                  h('thead', { className: 'bg-gray-50 border-b border-gray-200' },
                    h('tr', null,
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'ID'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Data Ref.'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Origem'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Status'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Linhas'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Solicitado por'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Criado'),
                      h('th', { className: 'text-left px-3 py-2 font-semibold text-gray-600' }, 'Detalhe')
                    )
                  ),
                  h('tbody', null,
                    dados.map(r => h('tr', {
                      key: r.id,
                      className: 'border-b border-gray-100 hover:bg-gray-50',
                    },
                      h('td', { className: 'px-3 py-2 font-mono text-xs text-gray-500' }, `#${r.id}`),
                      h('td', { className: 'px-3 py-2 font-bold' }, fmtDataRef(r.data_referencia)),
                      h('td', { className: 'px-3 py-2 text-xs' },
                        r.origem === 'cron'
                          ? h('span', { className: 'px-2 py-1 bg-purple-100 text-purple-700 rounded' }, '🤖 Cron')
                          : h('span', { className: 'px-2 py-1 bg-blue-100 text-blue-700 rounded' }, '👤 Manual')
                      ),
                      h('td', { className: 'px-3 py-2' },
                        h('span', {
                          className: `inline-block px-2 py-1 rounded-lg text-xs font-semibold border ${corStatus[r.status] || 'bg-gray-100 border-gray-300'}`,
                        }, labelStatus[r.status] || r.status)
                      ),
                      h('td', { className: 'px-3 py-2 text-xs' },
                        r.status === 'sucesso'
                          ? h('div', null,
                              h('div', { className: 'font-semibold text-green-700' }, `${r.linhas_inseridas || 0} novas`),
                              h('div', { className: 'text-gray-500' }, `${r.linhas_ignoradas || 0} ignoradas / ${r.total_linhas || 0} total`)
                            )
                          : (r.total_linhas ? `${r.total_linhas} totais` : '—')
                      ),
                      h('td', { className: 'px-3 py-2 text-xs text-gray-600' }, r.usuario_nome || '—'),
                      h('td', { className: 'px-3 py-2 text-xs text-gray-600' }, fmtData(r.criado_em)),
                      h('td', { className: 'px-3 py-2 text-xs' },
                        r.status === 'falhou' && r.erro && h('div', { className: 'text-red-600 max-w-md break-words' }, '⚠️ ', r.erro),
                        r.status === 'processando' && h('span', { className: 'text-blue-600' },
                          r.etapa_atual ? `${labelEtapa[r.etapa_atual] || r.etapa_atual} (${r.progresso || 0}%)` : 'Em andamento...'
                        )
                      )
                    ))
                  )
                )
              )
      ),

      // Paginação
      totalPaginas > 1 && h('div', { className: 'flex justify-center items-center gap-2' },
        h('button', {
          onClick: () => carregar(page - 1, filtros),
          disabled: page <= 1 || loading,
          className: 'px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50',
        }, '← Anterior'),
        h('span', { className: 'text-sm text-gray-600' }, `Página ${page} de ${totalPaginas}`),
        h('button', {
          onClick: () => carregar(page + 1, filtros),
          disabled: page >= totalPaginas || loading,
          className: 'px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50',
        }, 'Próxima →')
      )
    );
  }

  // Expor globalmente
  window.BiImportAutoTab = BiImportAutoTab;
})();
