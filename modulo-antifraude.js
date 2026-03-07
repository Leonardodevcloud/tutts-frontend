// ==================== MÓDULO ANTI-FRAUDE ====================
// Arquivo: modulo-antifraude.js
// Admin-only: Dashboard, Alertas, Configurações, Varredura
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useCallback, useRef } = React;
  const h = React.createElement;

  // ── Helpers ──
  function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  const TIPO_LABELS = {
    nf_duplicada_motoboy: { label: 'NF Duplicada (Motoboy)', icon: '🏍️', cor: 'bg-red-100 text-red-700' },
    nf_duplicada_cliente: { label: 'NF Duplicada (Cliente)', icon: '🏢', cor: 'bg-orange-100 text-orange-700' },
    nf_mesmo_dia: { label: 'NF Repetida no Dia', icon: '📅', cor: 'bg-yellow-100 text-yellow-700' },
    motoboy_reincidente: { label: 'Motoboy Reincidente', icon: '⚠️', cor: 'bg-red-100 text-red-800' },
    cliente_reincidente: { label: 'Cliente Reincidente', icon: '⚠️', cor: 'bg-orange-100 text-orange-800' },
  };

  const SEV_LABELS = {
    alta: { label: 'Alta', cor: 'bg-red-500 text-white' },
    media: { label: 'Média', cor: 'bg-yellow-400 text-yellow-900' },
    baixa: { label: 'Baixa', cor: 'bg-blue-100 text-blue-700' },
  };

  const STATUS_LABELS = {
    pendente: { label: 'Pendente', cor: 'bg-yellow-100 text-yellow-800' },
    analisado: { label: 'Analisado', cor: 'bg-blue-100 text-blue-700' },
    confirmado_fraude: { label: 'Fraude Confirmada', cor: 'bg-red-100 text-red-700' },
    falso_positivo: { label: 'Falso Positivo', cor: 'bg-green-100 text-green-700' },
  };

  function Badge({ text, className }) {
    return h('span', { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}` }, text);
  }

  // ── ABA: Dashboard ──
  function TabDashboard({ API_URL, fetchAuth, showToast }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/antifraude/dashboard`);
        setData(await res.json());
      } catch { showToast('Erro ao carregar dashboard', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar(); }, []);

    if (loading || !data) return h('div', { className: 'flex items-center justify-center py-16' },
      h('div', { className: 'animate-spin w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full' })
    );

    return h('div', { className: 'max-w-7xl mx-auto p-4 space-y-6' },

      // KPIs
      h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
        [
          { label: 'Total Alertas', value: data.total_alertas, icon: '🚨', bg: 'bg-red-50', tc: 'text-red-600' },
          { label: 'Pendentes', value: data.alertas_pendentes, icon: '⏳', bg: 'bg-yellow-50', tc: 'text-yellow-600' },
          { label: 'Última Varredura', value: data.ultima_varredura ? fmtDT(data.ultima_varredura.finalizado_em) : 'Nunca', icon: '🔍', bg: 'bg-blue-50', tc: 'text-blue-600', small: true },
          { label: 'OSs Analisadas', value: data.ultima_varredura?.os_analisadas || 0, icon: '📊', bg: 'bg-purple-50', tc: 'text-purple-600' },
        ].map(k => h('div', { key: k.label, className: `${k.bg} rounded-xl border border-gray-100 shadow-sm p-4` },
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('span', { className: 'text-xl' }, k.icon),
            h('span', { className: 'text-xs font-semibold text-gray-500 uppercase' }, k.label)
          ),
          h('p', { className: `${k.small ? 'text-sm' : 'text-3xl'} font-bold ${k.tc}` }, k.value)
        ))
      ),

      // Alertas por tipo
      data.por_tipo.length > 0 && h('div', { className: 'bg-white rounded-xl border shadow-sm p-5' },
        h('h3', { className: 'text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide' }, '📊 Alertas por Tipo'),
        h('div', { className: 'space-y-2' },
          data.por_tipo.map(t => {
            const info = TIPO_LABELS[t.tipo] || { label: t.tipo, icon: '❓', cor: 'bg-gray-100 text-gray-600' };
            const pct = data.total_alertas > 0 ? (parseInt(t.total) / data.total_alertas) * 100 : 0;
            return h('div', { key: t.tipo, className: 'flex items-center gap-3' },
              h('span', { className: 'w-5 text-center' }, info.icon),
              h('span', { className: 'w-44 text-xs font-medium text-gray-700 flex-shrink-0' }, info.label),
              h('div', { className: 'flex-1 h-6 bg-gray-100 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-red-400 rounded-full', style: { width: Math.max(pct, 2) + '%' } })
              ),
              h('span', { className: 'w-10 text-right text-sm font-bold text-gray-700' }, t.total)
            );
          })
        )
      ),

      // Top Motoboys + Top Clientes
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
        // Motoboys
        h('div', { className: 'bg-white rounded-xl border shadow-sm overflow-hidden' },
          h('div', { className: 'p-4 border-b bg-red-50' },
            h('h3', { className: 'text-sm font-bold text-red-700 uppercase tracking-wide' }, '🏍️ Motoboys com mais alertas')
          ),
          data.top_motoboys.length === 0
            ? h('div', { className: 'p-6 text-center text-gray-400 text-sm' }, '✅ Nenhum alerta de motoboy')
            : h('div', { className: 'divide-y divide-gray-100' },
                data.top_motoboys.map((m, i) => h('div', { key: i, className: 'flex items-center justify-between px-4 py-3 hover:bg-gray-50' },
                  h('div', { className: 'flex items-center gap-3' },
                    h('span', { className: `w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}` }, i + 1),
                    h('div', null,
                      h('p', { className: 'text-sm font-semibold text-gray-800' }, m.profissional_nome || '—'),
                      h('p', { className: 'text-xs text-gray-400 font-mono' }, 'Cód: ' + (m.profissional_cod || '—'))
                    )
                  ),
                  h('span', { className: 'text-lg font-bold text-red-600' }, m.total_alertas)
                ))
              )
        ),
        // Clientes
        h('div', { className: 'bg-white rounded-xl border shadow-sm overflow-hidden' },
          h('div', { className: 'p-4 border-b bg-orange-50' },
            h('h3', { className: 'text-sm font-bold text-orange-700 uppercase tracking-wide' }, '🏢 Clientes com mais alertas')
          ),
          data.top_clientes.length === 0
            ? h('div', { className: 'p-6 text-center text-gray-400 text-sm' }, '✅ Nenhum alerta de cliente')
            : h('div', { className: 'divide-y divide-gray-100' },
                data.top_clientes.map((c, i) => h('div', { key: i, className: 'flex items-center justify-between px-4 py-3 hover:bg-gray-50' },
                  h('div', { className: 'flex items-center gap-3' },
                    h('span', { className: `w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}` }, i + 1),
                    h('p', { className: 'text-sm font-semibold text-gray-800' }, c.solicitante_nome || '—')
                  ),
                  h('span', { className: 'text-lg font-bold text-orange-600' }, c.total_alertas)
                ))
              )
        )
      ),

      // Varreduras recentes
      h('div', { className: 'bg-white rounded-xl border shadow-sm overflow-hidden' },
        h('div', { className: 'p-4 border-b bg-gray-50 flex items-center justify-between' },
          h('h3', { className: 'text-sm font-bold text-gray-700 uppercase tracking-wide' }, '🔄 Varreduras Recentes'),
          h('button', { onClick: carregar, className: 'text-xs px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold' }, '🔄 Atualizar')
        ),
        data.varreduras_recentes.length === 0
          ? h('div', { className: 'p-6 text-center text-gray-400 text-sm' }, 'Nenhuma varredura executada')
          : h('div', { className: 'divide-y divide-gray-100' },
              data.varreduras_recentes.map(v => h('div', { key: v.id, className: 'flex items-center justify-between px-4 py-3' },
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-lg' }, v.status === 'concluido' ? '✅' : v.status === 'executando' ? '⏳' : '❌'),
                  h('div', null,
                    h('p', { className: 'text-sm font-medium text-gray-800' }, '#' + v.id + ' — ' + (v.tipo === 'cron' ? 'Automática' : 'Manual')),
                    h('p', { className: 'text-xs text-gray-400' }, fmtDT(v.iniciado_em) + (v.iniciado_por ? ' por ' + v.iniciado_por : ''))
                  )
                ),
                h('div', { className: 'text-right text-xs text-gray-500' },
                  h('p', null, (v.os_analisadas || 0) + ' OSs'),
                  h('p', { className: v.alertas_gerados > 0 ? 'font-bold text-red-600' : '' }, (v.alertas_gerados || 0) + ' alertas')
                )
              ))
            )
      )
    );
  }

  // ── ABA: Alertas ──
  function TabAlertas({ API_URL, fetchAuth, showToast }) {
    const [dados, setDados] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [filtros, setFiltros] = useState({ tipo: '', severidade: '', status: '', profissional: '' });
    const [modalAlerta, setModalAlerta] = useState(null);
    const [novoStatus, setNovoStatus] = useState('');
    const [observacao, setObservacao] = useState('');
    const PER_PAGE = 20;

    const carregar = useCallback(async (pg = 1, f) => {
      const filtrosAtivos = f || filtros;
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: pg, per_page: PER_PAGE });
        if (filtrosAtivos.tipo) params.set('tipo', filtrosAtivos.tipo);
        if (filtrosAtivos.severidade) params.set('severidade', filtrosAtivos.severidade);
        if (filtrosAtivos.status) params.set('status', filtrosAtivos.status);
        if (filtrosAtivos.profissional) params.set('profissional', filtrosAtivos.profissional);

        const res = await fetchAuth(`${API_URL}/antifraude/alertas?${params}`);
        const data = await res.json();
        setDados(data.alertas || []);
        setTotal(data.total || 0);
        setPage(pg);
      } catch { showToast('Erro ao carregar alertas', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar(); }, []);

    const totalPaginas = Math.ceil(total / PER_PAGE);

    const atualizarStatus = async () => {
      if (!modalAlerta || !novoStatus) return;
      try {
        const res = await fetchAuth(`${API_URL}/antifraude/alertas/${modalAlerta.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: novoStatus, observacao_analise: observacao }),
        });
        if (res.ok) {
          showToast('Alerta atualizado!', 'success');
          setModalAlerta(null);
          setNovoStatus('');
          setObservacao('');
          carregar(page, filtros);
        }
      } catch { showToast('Erro ao atualizar', 'error'); }
    };

    return h('div', { className: 'max-w-7xl mx-auto p-4 space-y-4' },

      // Filtros
      h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-3' },
        h('select', { value: filtros.tipo, onChange: e => setFiltros(f => ({ ...f, tipo: e.target.value })), className: 'rounded-xl border border-gray-200 px-3 py-2 text-sm' },
          h('option', { value: '' }, 'Todos os tipos'),
          Object.entries(TIPO_LABELS).map(([k, v]) => h('option', { key: k, value: k }, v.label))
        ),
        h('select', { value: filtros.severidade, onChange: e => setFiltros(f => ({ ...f, severidade: e.target.value })), className: 'rounded-xl border border-gray-200 px-3 py-2 text-sm' },
          h('option', { value: '' }, 'Todas severidades'),
          h('option', { value: 'alta' }, '🔴 Alta'),
          h('option', { value: 'media' }, '🟡 Média')
        ),
        h('select', { value: filtros.status, onChange: e => setFiltros(f => ({ ...f, status: e.target.value })), className: 'rounded-xl border border-gray-200 px-3 py-2 text-sm' },
          h('option', { value: '' }, 'Todos status'),
          Object.entries(STATUS_LABELS).map(([k, v]) => h('option', { key: k, value: k }, v.label))
        ),
        h('input', { value: filtros.profissional, onChange: e => setFiltros(f => ({ ...f, profissional: e.target.value })), placeholder: 'Buscar motoboy/cliente...', className: 'rounded-xl border border-gray-200 px-3 py-2 text-sm' }),
        h('button', { onClick: () => carregar(1, filtros), className: 'rounded-xl text-sm font-semibold text-white py-2 bg-red-600 hover:bg-red-700' }, '🔍 Filtrar')
      ),

      // Total
      h('p', { className: 'text-xs text-gray-400' }, total + ' alerta(s) encontrado(s)'),

      // Loading
      loading && h('div', { className: 'flex items-center justify-center py-12 gap-3 text-gray-400' },
        h('div', { className: 'w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin' }),
        'Carregando...'
      ),

      // Cards de alertas
      !loading && h('div', { className: 'space-y-3' },
        dados.length === 0 && h('div', { className: 'text-center py-16 text-gray-400' }, '✅ Nenhum alerta encontrado'),
        dados.map(a => {
          const tipoInfo = TIPO_LABELS[a.tipo] || { label: a.tipo, icon: '❓', cor: 'bg-gray-100 text-gray-600' };
          const sevInfo = SEV_LABELS[a.severidade] || SEV_LABELS.media;
          const statusInfo = STATUS_LABELS[a.status] || STATUS_LABELS.pendente;

          return h('div', { key: a.id, className: 'bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition' },
            h('div', { className: 'p-4' },
              // Header
              h('div', { className: 'flex items-start justify-between mb-2' },
                h('div', { className: 'flex items-center gap-2 flex-wrap' },
                  h(Badge, { text: sevInfo.label, className: sevInfo.cor }),
                  h(Badge, { text: tipoInfo.icon + ' ' + tipoInfo.label, className: tipoInfo.cor }),
                  h(Badge, { text: statusInfo.label, className: statusInfo.cor })
                ),
                h('span', { className: 'text-xs text-gray-400 flex-shrink-0' }, fmtDT(a.created_at))
              ),
              // Título
              h('h4', { className: 'font-semibold text-gray-900 mb-1' }, a.titulo),
              // Descrição
              h('p', { className: 'text-sm text-gray-600 mb-3' }, a.descricao),
              // OSs envolvidas
              a.os_codigos && a.os_codigos.length > 0 && h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
                h('span', { className: 'text-xs font-semibold text-gray-500' }, 'OSs:'),
                a.os_codigos.map(os => h('span', { key: os, className: 'text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono' }, os))
              ),
              // Análise (se já analisado)
              a.analisado_por && h('div', { className: 'mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700' },
                h('strong', null, 'Analisado por: '), a.analisado_por, ' em ', fmtDT(a.analisado_em),
                a.observacao_analise && h('p', { className: 'mt-1 text-blue-600' }, a.observacao_analise)
              ),
              // Ações
              h('div', { className: 'flex gap-2 mt-3' },
                a.status === 'pendente' && h('button', {
                  onClick: () => { setModalAlerta(a); setNovoStatus('analisado'); setObservacao(''); },
                  className: 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700',
                }, '🔍 Analisar'),
                a.status !== 'confirmado_fraude' && h('button', {
                  onClick: () => { setModalAlerta(a); setNovoStatus('confirmado_fraude'); setObservacao(''); },
                  className: 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700',
                }, '🚨 Confirmar Fraude'),
                a.status !== 'falso_positivo' && h('button', {
                  onClick: () => { setModalAlerta(a); setNovoStatus('falso_positivo'); setObservacao(''); },
                  className: 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700',
                }, '✅ Falso Positivo')
              )
            )
          );
        })
      ),

      // Paginação
      totalPaginas > 1 && h('div', { className: 'flex items-center justify-center gap-2 mt-5' },
        h('button', { onClick: () => carregar(page - 1, filtros), disabled: page <= 1, className: 'px-3 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50' }, '← Anterior'),
        h('span', { className: 'text-sm text-gray-500' }, page + ' / ' + totalPaginas),
        h('button', { onClick: () => carregar(page + 1, filtros), disabled: page >= totalPaginas, className: 'px-3 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-50' }, 'Próxima →')
      ),

      // Modal de análise
      modalAlerta && h('div', { className: 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4', onClick: () => setModalAlerta(null) },
        h('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-md p-6', onClick: e => e.stopPropagation() },
          h('h3', { className: 'text-lg font-bold mb-4' },
            novoStatus === 'confirmado_fraude' ? '🚨 Confirmar Fraude' :
            novoStatus === 'falso_positivo' ? '✅ Marcar como Falso Positivo' :
            '🔍 Analisar Alerta'
          ),
          h('p', { className: 'text-sm text-gray-600 mb-4' }, modalAlerta.titulo),
          h('textarea', {
            value: observacao, onChange: e => setObservacao(e.target.value),
            placeholder: 'Observação (opcional)...',
            className: 'w-full px-3 py-2 border rounded-lg text-sm mb-4', rows: 3,
          }),
          h('div', { className: 'flex gap-2' },
            h('button', { onClick: () => setModalAlerta(null), className: 'flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200' }, 'Cancelar'),
            h('button', { onClick: atualizarStatus, className: 'flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700' }, 'Confirmar')
          )
        )
      )
    );
  }

  // ── ABA: Varredura ──
  function TabVarredura({ API_URL, fetchAuth, showToast }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [relatorio, setRelatorio] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const pollRef = useRef(null);

    const buscarStatus = useCallback(async () => {
      try {
        const res = await fetchAuth(`${API_URL}/antifraude/varredura/status`);
        const data = await res.json();
        setStatus(data);
        if (data && data.status === 'executando') {
          if (!pollRef.current) {
            pollRef.current = setInterval(buscarStatus, 3000);
          }
        } else {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch {}
    }, [fetchAuth, API_URL]);

    useEffect(() => { buscarStatus(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

    const iniciarVarredura = async () => {
      setLoading(true);
      try {
        const body = {};
        if (dataInicio && dataFim) { body.data_inicio = dataInicio; body.data_fim = dataFim; }
        const res = await fetchAuth(`${API_URL}/antifraude/varredura`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.status === 409) {
          showToast('Já existe uma varredura em execução', 'error');
        } else {
          showToast('🔍 Varredura iniciada!', 'success');
          setTimeout(buscarStatus, 1000);
          pollRef.current = setInterval(buscarStatus, 3000);
        }
      } catch { showToast('Erro ao iniciar varredura', 'error'); }
      finally { setLoading(false); }
    };

    const gerarRelatorio = async () => {
      try {
        const res = await fetchAuth(`${API_URL}/antifraude/relatorio`);
        const data = await res.json();
        setRelatorio(data.texto || 'Nenhum dado');
      } catch { showToast('Erro ao gerar relatório', 'error'); }
    };

    const copiarRelatorio = () => {
      navigator.clipboard.writeText(relatorio);
      showToast('📋 Relatório copiado!', 'success');
    };

    const executando = status && status.status === 'executando';

    return h('div', { className: 'max-w-3xl mx-auto p-4 space-y-6' },

      // Card principal
      h('div', { className: 'bg-white rounded-2xl border shadow-sm p-6 text-center' },
        h('div', { className: 'w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-red-50' },
          h('span', { className: 'text-4xl' }, executando ? '⏳' : '🛡️')
        ),
        h('h2', { className: 'text-xl font-bold text-gray-900 mb-2' }, 'Varredura Anti-Fraude'),
        h('p', { className: 'text-sm text-gray-500 mb-4 max-w-md mx-auto' },
          executando
            ? 'Analisando dados da bi_entregas...'
            : 'Analisa os dados do BI (importados via Excel) e detecta NFs/pedidos duplicados, padrões de fraude por motoboy e cliente.'
        ),
        // Seletor de período
        !executando && h('div', { className: 'flex items-center justify-center gap-3 mb-4 flex-wrap' },
          h('div', { className: 'flex items-center gap-2' },
            h('label', { className: 'text-xs font-semibold text-gray-600' }, 'De:'),
            h('input', {
              type: 'date', value: dataInicio,
              onChange: e => setDataInicio(e.target.value),
              className: 'px-3 py-1.5 border rounded-lg text-sm',
            })
          ),
          h('div', { className: 'flex items-center gap-2' },
            h('label', { className: 'text-xs font-semibold text-gray-600' }, 'Até:'),
            h('input', {
              type: 'date', value: dataFim,
              onChange: e => setDataFim(e.target.value),
              className: 'px-3 py-1.5 border rounded-lg text-sm',
            })
          ),
          h('span', { className: 'text-xs text-gray-400' }, dataInicio && dataFim ? '' : '(vazio = usa janela padrão das configs)')
        ),
        // Progresso em tempo real
        executando && status && status.detalhes && h('div', { className: 'mb-4 p-3 bg-purple-50 rounded-xl border border-purple-200 max-w-md mx-auto' },
          h('div', { className: 'flex items-center gap-2 mb-1' },
            h('div', { className: 'w-3 h-3 bg-purple-500 rounded-full animate-pulse' }),
            h('span', { className: 'text-xs font-semibold text-purple-700' }, 'Progresso')
          ),
          h('p', { className: 'text-sm text-purple-800 font-medium' }, status.detalhes),
          status.os_analisadas > 0 && h('p', { className: 'text-xs text-purple-600 mt-1' }, '📊 ' + status.os_analisadas + ' OS(s) analisadas')
        ),
        h('button', {
          onClick: iniciarVarredura,
          disabled: loading || executando,
          className: 'px-8 py-3 rounded-xl font-semibold text-white text-lg transition ' +
            (executando ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'),
        }, executando
            ? h('span', { className: 'flex items-center gap-2 justify-center' },
                h('span', { className: 'animate-spin' }, '⏳'), 'Analisando...')
            : '🚀 Executar Varredura'
        ),
        h('p', { className: 'text-xs text-gray-400 mt-3' }, '💡 A varredura também roda automaticamente a cada upload no módulo BI')
      ),

      // Status da última varredura
      status && h('div', { className: 'bg-white rounded-xl border shadow-sm p-5' },
        h('h3', { className: 'text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide' }, '📋 Última Varredura'),
        h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4 text-sm' },
          h('div', null, h('p', { className: 'text-gray-400 text-xs' }, 'Status'), h('p', { className: 'font-semibold' }, status.status === 'concluido' ? '✅ Concluída' : status.status === 'executando' ? '⏳ Executando' : '❌ Erro')),
          h('div', null, h('p', { className: 'text-gray-400 text-xs' }, 'Tipo'), h('p', { className: 'font-semibold' }, status.tipo === 'cron' ? 'Automática' : 'Manual')),
          h('div', null, h('p', { className: 'text-gray-400 text-xs' }, 'OSs Analisadas'), h('p', { className: 'font-semibold' }, status.os_analisadas || 0)),
          h('div', null, h('p', { className: 'text-gray-400 text-xs' }, 'Alertas Gerados'), h('p', { className: 'font-bold text-red-600' }, status.alertas_gerados || 0)),
        ),
        h('div', { className: 'mt-3 text-xs text-gray-400' },
          'Início: ', fmtDT(status.iniciado_em),
          status.finalizado_em ? ' — Fim: ' + fmtDT(status.finalizado_em) : '',
          status.iniciado_por ? ' — Por: ' + status.iniciado_por : ''
        ),
        status.erro && h('div', { className: 'mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-600' }, status.erro)
      ),

      // Relatório WhatsApp
      h('div', { className: 'bg-white rounded-xl border shadow-sm p-5' },
        h('div', { className: 'flex items-center justify-between mb-3' },
          h('h3', { className: 'text-sm font-bold text-gray-700 uppercase tracking-wide' }, '📱 Relatório para WhatsApp'),
          h('button', { onClick: gerarRelatorio, className: 'text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold' }, '📝 Gerar')
        ),
        relatorio && h('div', null,
          h('pre', { className: 'bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap font-sans mb-3 max-h-96 overflow-y-auto border' }, relatorio),
          h('button', { onClick: copiarRelatorio, className: 'px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 text-sm' }, '📋 Copiar Relatório')
        )
      )
    );
  }

  // ── ABA: Configurações ──
  function TabConfig({ API_URL, fetchAuth, showToast }) {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      (async () => {
        try {
          const res = await fetchAuth(`${API_URL}/antifraude/config`);
          setConfig(await res.json());
        } catch {}
        setLoading(false);
      })();
    }, []);

    const salvar = async () => {
      setSaving(true);
      try {
        const body = {};
        Object.entries(config).forEach(([k, v]) => { body[k] = v.valor; });
        const res = await fetchAuth(`${API_URL}/antifraude/config`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) showToast('✅ Configurações salvas!', 'success');
      } catch { showToast('Erro ao salvar', 'error'); }
      finally { setSaving(false); }
    };

    const updateVal = (chave, valor) => {
      setConfig(prev => ({ ...prev, [chave]: { ...prev[chave], valor } }));
    };

    if (loading || !config) return h('div', { className: 'flex items-center justify-center py-16' },
      h('div', { className: 'animate-spin w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full' })
    );

    const campos = [
      { chave: 'janela_dias', label: 'Janela de tempo (dias)', tipo: 'number', desc: 'Período para considerar duplicatas suspeitas' },
      { chave: 'cron_ativo', label: 'Varredura automática (cron)', tipo: 'toggle', desc: 'Ativar/desativar varredura periódica' },
      { chave: 'cron_intervalo_min', label: 'Intervalo do cron (minutos)', tipo: 'number', desc: 'A cada quantos minutos o agente varre automaticamente' },
      { chave: 'max_paginas_concluidos', label: 'Páginas de concluídos por varredura', tipo: 'number', desc: 'Quantas páginas de OSs concluídas analisar por execução' },
      { chave: 'threshold_reincidente', label: 'Threshold reincidente', tipo: 'number', desc: 'Qtd de duplicatas para marcar motoboy/cliente como reincidente' },
    ];

    return h('div', { className: 'max-w-2xl mx-auto p-4 space-y-4' },
      h('div', { className: 'bg-white rounded-2xl border shadow-sm p-6' },
        h('h2', { className: 'text-lg font-bold text-gray-900 mb-6 flex items-center gap-2' }, '⚙️ Configurações Anti-Fraude'),
        h('div', { className: 'space-y-5' },
          campos.map(c => {
            const val = config[c.chave]?.valor || '';
            return h('div', { key: c.chave, className: 'flex items-center justify-between gap-4 py-3 border-b border-gray-100 last:border-0' },
              h('div', { className: 'flex-1' },
                h('p', { className: 'text-sm font-semibold text-gray-800' }, c.label),
                h('p', { className: 'text-xs text-gray-400' }, c.desc)
              ),
              c.tipo === 'toggle'
                ? h('button', {
                    onClick: () => updateVal(c.chave, val === 'true' ? 'false' : 'true'),
                    className: 'relative w-12 h-6 rounded-full transition ' + (val === 'true' ? 'bg-green-500' : 'bg-gray-300'),
                  },
                    h('div', { className: 'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ' + (val === 'true' ? 'left-6' : 'left-0.5') })
                  )
                : h('input', {
                    type: 'number', value: val,
                    onChange: e => updateVal(c.chave, e.target.value),
                    className: 'w-24 px-3 py-1.5 border rounded-lg text-sm text-center font-semibold',
                  })
            );
          })
        ),
        h('button', {
          onClick: salvar, disabled: saving,
          className: 'mt-6 w-full py-3 bg-red-600 text-white rounded-xl font-bold text-lg hover:bg-red-700 disabled:opacity-50',
        }, saving ? 'Salvando...' : '💾 Salvar Configurações')
      )
    );
  }

  // ── Componente raiz ──
  function ModuloAntiFraudeInterno({ initialProps }) {
    const propsRef = useRef(initialProps);
    const { usuario, API_URL, fetchAuth, HeaderCompacto, showToast, he, onLogout, socialProfile, onNavigate } = propsRef.current;

    const [aba, setAba] = useState('dashboard');

    const ABAS = [
      { id: 'dashboard', label: '📊 Dashboard' },
      { id: 'alertas', label: '🚨 Alertas' },
      { id: 'varredura', label: '🔍 Varredura' },
      { id: 'config', label: '⚙️ Config' },
    ];

    return h('div', { className: 'min-h-screen bg-gray-50 flex flex-col' },

      HeaderCompacto && h(HeaderCompacto, {
        usuario,
        moduloAtivo: 'antifraude',
        abaAtiva: aba,
        onGoHome: () => he && he('home'),
        onNavigate: onNavigate || ((m) => he && he(m)),
        onLogout: onLogout || (() => {}),
        onChangeTab: setAba,
        socialProfile,
      }),

      // Sub-tabs
      h('div', { className: 'bg-white border-b border-gray-200 shadow-sm sticky top-[52px] z-20' },
        h('div', { className: 'max-w-7xl mx-auto px-4 flex' },
          ABAS.map(a => h('button', {
            key: a.id,
            onClick: () => setAba(a.id),
            className: 'py-3 px-5 text-sm font-semibold border-b-2 transition ' + (
              aba === a.id
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            ),
          }, a.label))
        )
      ),

      // Conteúdo
      h('div', { className: 'flex-1' },
        h('div', { style: { display: aba === 'dashboard' ? 'block' : 'none' } },
          h(TabDashboard, { API_URL, fetchAuth, showToast })
        ),
        h('div', { style: { display: aba === 'alertas' ? 'block' : 'none' } },
          h(TabAlertas, { API_URL, fetchAuth, showToast })
        ),
        h('div', { style: { display: aba === 'varredura' ? 'block' : 'none' } },
          h(TabVarredura, { API_URL, fetchAuth, showToast })
        ),
        h('div', { style: { display: aba === 'config' ? 'block' : 'none' } },
          h(TabConfig, { API_URL, fetchAuth, showToast })
        )
      )
    );
  }

  // Wrapper externo (mesmo padrão do modulo-agente)
  window.ModuloAntiFraudeComponent = function ModuloAntiFraudeWrapper(props) {
    const containerRef = useRef(null);
    const mountedRef = useRef(false);

    useEffect(() => {
      if (mountedRef.current || !containerRef.current) return;
      mountedRef.current = true;
      ReactDOM.render(h(ModuloAntiFraudeInterno, { initialProps: props }), containerRef.current);
      return () => {
        if (containerRef.current) ReactDOM.unmountComponentAtNode(containerRef.current);
        mountedRef.current = false;
      };
    }, []);

    return h('div', { ref: containerRef, className: 'antifraude-portal-root', style: { minHeight: '100vh' } });
  };

  console.log('✅ Módulo Anti-Fraude carregado');
})();
