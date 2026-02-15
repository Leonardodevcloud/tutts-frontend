// ==================== MÓDULO SUCESSO DO CLIENTE ====================
// Arquivo: modulo-cs.js
// Self-contained: gerencia próprio estado e fetch
// UI inspirada no CRM WhatsApp: clean, sidebar + content
// ================================================================

(function() {
  'use strict';

  const { useState, useEffect, useCallback, useRef, useMemo } = React;

  // ── Helper: React.createElement shortcut ──
  const h = React.createElement;

  // ── Constantes ──
  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'clientes', label: 'Clientes', icon: '🏢' },
    { id: 'interacoes', label: 'Interações', icon: '📝' },
    { id: 'ocorrencias', label: 'Ocorrências', icon: '🚨' },
    { id: 'agenda', label: 'Agenda', icon: '📅' },
  ];

  const CORES_HEALTH = {
    excelente: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500', border: 'border-emerald-200' },
    bom: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500', border: 'border-blue-200' },
    atencao: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500', border: 'border-amber-200' },
    critico: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500', border: 'border-orange-200' },
    urgente: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500', border: 'border-red-200' },
  };

  function getHealthCor(score) {
    if (score >= 80) return CORES_HEALTH.excelente;
    if (score >= 60) return CORES_HEALTH.bom;
    if (score >= 40) return CORES_HEALTH.atencao;
    if (score >= 20) return CORES_HEALTH.critico;
    return CORES_HEALTH.urgente;
  }

  function getHealthLabel(score) {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Atenção';
    if (score >= 20) return 'Crítico';
    return 'Urgente';
  }

  function formatCurrency(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  }

  function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR');
  }

  function formatDateTime(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function diasAtras(d) {
    if (!d) return null;
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    return `${diff}d atrás`;
  }

  // ── Componente: Pill/Badge ──
  function Badge({ text, cor = '#6B7280', className = '' }) {
    return h('span', {
      className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`,
      style: { backgroundColor: cor + '20', color: cor }
    }, text);
  }

  // ── Componente: Health Score Ring ──
  function HealthRing({ score, size = 60 }) {
    const cor = getHealthCor(score);
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = ((score || 0) / 100) * circumference;

    return h('div', { className: 'relative inline-flex items-center justify-center', style: { width: size, height: size } },
      h('svg', { width: size, height: size, className: 'transform -rotate-90' },
        h('circle', { cx: size/2, cy: size/2, r: radius, fill: 'none', stroke: '#E5E7EB', strokeWidth: 4 }),
        h('circle', { cx: size/2, cy: size/2, r: radius, fill: 'none', stroke: 'currentColor',
          strokeWidth: 4, strokeDasharray: circumference, strokeDashoffset: circumference - progress,
          strokeLinecap: 'round', className: cor.text, style: { transition: 'stroke-dashoffset 0.8s ease' }
        })
      ),
      h('span', { className: `absolute text-sm font-bold ${cor.text}` }, score || 0)
    );
  }

  // ── Componente: Card KPI ──
  function KpiCard({ titulo, valor, subtitulo, icone, cor = 'blue', trend }) {
    const cores = {
      blue: 'bg-blue-50 text-blue-600 border-blue-100',
      green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      amber: 'bg-amber-50 text-amber-600 border-amber-100',
      red: 'bg-red-50 text-red-600 border-red-100',
      purple: 'bg-purple-50 text-purple-600 border-purple-100',
      gray: 'bg-gray-50 text-gray-600 border-gray-100',
    };
    return h('div', { className: `bg-white rounded-xl border ${cores[cor]?.split(' ')[2] || 'border-gray-200'} p-4 hover:shadow-md transition-shadow` },
      h('div', { className: 'flex items-start justify-between mb-2' },
        h('span', { className: 'text-2xl' }, icone),
        trend !== undefined && h('span', {
          className: `text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`
        }, `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}%`)
      ),
      h('p', { className: 'text-2xl font-bold text-gray-900' }, valor),
      h('p', { className: 'text-sm text-gray-500 mt-1' }, titulo),
      subtitulo && h('p', { className: 'text-xs text-gray-400 mt-0.5' }, subtitulo)
    );
  }

  // ── Componente: Modal ──
  function Modal({ aberto, fechar, titulo, largura = 'max-w-2xl', children }) {
    if (!aberto) return null;
    return h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-4', onClick: fechar },
      h('div', { className: 'fixed inset-0 bg-black/50 backdrop-blur-sm' }),
      h('div', {
        className: `relative bg-white rounded-2xl shadow-2xl w-full ${largura} max-h-[90vh] flex flex-col`,
        onClick: e => e.stopPropagation()
      },
        h('div', { className: 'flex items-center justify-between p-5 border-b border-gray-100' },
          h('h3', { className: 'text-lg font-bold text-gray-900' }, titulo),
          h('button', { onClick: fechar, className: 'p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600' }, '✕')
        ),
        h('div', { className: 'p-5 overflow-y-auto flex-1' }, children)
      )
    );
  }

  // ── Componente: Empty State ──
  function EmptyState({ icone = '📭', titulo, descricao, acao }) {
    return h('div', { className: 'flex flex-col items-center justify-center py-16 text-center' },
      h('span', { className: 'text-5xl mb-4' }, icone),
      h('h3', { className: 'text-lg font-semibold text-gray-700 mb-2' }, titulo),
      descricao && h('p', { className: 'text-gray-500 mb-4 max-w-md' }, descricao),
      acao
    );
  }

  // ── Componente: Skeleton Loader ──
  function Skeleton({ linhas = 3 }) {
    return h('div', { className: 'animate-pulse space-y-3' },
      ...Array.from({ length: linhas }, (_, i) =>
        h('div', { key: i, className: `h-4 bg-gray-200 rounded ${i === linhas - 1 ? 'w-2/3' : 'w-full'}` })
      )
    );
  }

  // ══════════════════════════════════════════════════
  // SUB-TELA: DASHBOARD
  // ══════════════════════════════════════════════════
  function DashboardView({ fetchApi }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState(() => {
      const now = new Date();
      return {
        inicio: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        fim: now.toISOString().split('T')[0],
      };
    });

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchApi(`/cs/dashboard?data_inicio=${periodo.inicio}&data_fim=${periodo.fim}`);
        if (res.success) setData(res);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [fetchApi, periodo]);

    useEffect(() => { carregar(); }, [carregar]);

    const confirmarChurn = async (cod, nome) => {
      if (!confirm(`Confirmar churn de "${nome || cod}"? O status será alterado para "churned".`)) return;
      try {
        await fetchApi(`/cs/clientes/${cod}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'churned' }),
        });
        carregar();
      } catch (e) { alert('Erro ao confirmar churn'); }
    };

    if (loading) return h('div', { className: 'p-6 space-y-6' }, h(Skeleton, { linhas: 8 }));
    if (!data) return h(EmptyState, { titulo: 'Erro ao carregar dashboard' });

    const { kpis, clientes_risco, churned_confirmados, possiveis_churn, interacoes_recentes, distribuicao_health } = data;
    const kc = kpis.clientes || {};
    const ki = kpis.interacoes || {};
    const ko = kpis.ocorrencias || {};
    const kop = kpis.operacao || {};

    return h('div', { className: 'space-y-6' },
      // Filtro de período
      h('div', { className: 'flex flex-wrap items-center gap-3' },
        h('input', { type: 'date', value: periodo.inicio, onChange: e => setPeriodo(p => ({ ...p, inicio: e.target.value })),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent' }),
        h('span', { className: 'text-gray-400' }, 'até'),
        h('input', { type: 'date', value: periodo.fim, onChange: e => setPeriodo(p => ({ ...p, fim: e.target.value })),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent' }),
        h('button', { onClick: carregar, className: 'px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors' }, '🔄 Atualizar')
      ),

      // KPIs Clientes
      h('div', null,
        h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3' }, '👥 Carteira de Clientes'),
        h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-4' },
          h(KpiCard, { titulo: 'Total de Clientes', valor: kc.total_clientes || 0, icone: '🏢', cor: 'blue' }),
          h(KpiCard, { titulo: 'Ativos', valor: kc.ativos || 0, icone: '✅', cor: 'green' }),
          h(KpiCard, { titulo: 'Em Risco', valor: kc.em_risco || 0, icone: '⚠️', cor: 'amber' }),
          h(KpiCard, { titulo: 'Churned', valor: kc.churned || 0, icone: '💀', cor: parseInt(kc.churned) > 0 ? 'red' : 'gray' }),
          h(KpiCard, { titulo: 'Health Score Médio', valor: `${kc.health_score_medio || 0}/100`, icone: '💚', cor: parseFloat(kc.health_score_medio) >= 60 ? 'green' : 'amber' })
        )
      ),

      // KPIs Operação (BI)
      h('div', null,
        h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3' }, '📦 Operação (BI)'),
        h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-4' },
          h(KpiCard, { titulo: 'Entregas', valor: parseInt(kop.total_entregas || 0).toLocaleString('pt-BR'), icone: '🚚', cor: 'blue' }),
          h(KpiCard, { titulo: 'Taxa de Prazo', valor: `${kop.taxa_prazo_global || 0}%`, icone: '⏱️', cor: parseFloat(kop.taxa_prazo_global) >= 85 ? 'green' : 'amber' }),
          h(KpiCard, { titulo: 'Faturamento', valor: formatCurrency(kop.faturamento_total), icone: '💰', cor: 'green' }),
          h(KpiCard, { titulo: 'Clientes Ativos BI', valor: kop.clientes_ativos_bi || 0, icone: '📊', cor: 'purple' }),
          h(KpiCard, { titulo: 'Tempo Médio', valor: `${kop.tempo_medio_entrega || 0} min`, icone: '🕐', cor: 'gray' })
        )
      ),

      // KPIs Interações + Ocorrências
      h('div', { className: 'grid md:grid-cols-2 gap-6' },
        // Interações
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
          h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4' }, '📝 Interações no Período'),
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', { className: 'text-center p-3 bg-gray-50 rounded-lg' },
              h('p', { className: 'text-2xl font-bold text-gray-900' }, ki.total_interacoes || 0),
              h('p', { className: 'text-xs text-gray-500' }, 'Total')
            ),
            h('div', { className: 'text-center p-3 bg-gray-50 rounded-lg' },
              h('p', { className: 'text-2xl font-bold text-blue-600' }, ki.clientes_contatados || 0),
              h('p', { className: 'text-xs text-gray-500' }, 'Clientes Contatados')
            ),
            h('div', { className: 'text-center p-3 bg-blue-50 rounded-lg' },
              h('p', { className: 'text-2xl font-bold text-blue-700' }, ki.visitas || 0),
              h('p', { className: 'text-xs text-gray-500' }, 'Visitas')
            ),
            h('div', { className: 'text-center p-3 bg-purple-50 rounded-lg' },
              h('p', { className: 'text-2xl font-bold text-purple-700' }, ki.reunioes || 0),
              h('p', { className: 'text-xs text-gray-500' }, 'Reuniões')
            )
          )
        ),

        // Ocorrências
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
          h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4' }, '🚨 Ocorrências'),
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', { className: 'text-center p-3 bg-red-50 rounded-lg' },
              h('p', { className: 'text-2xl font-bold text-red-600' }, ko.abertas || 0),
              h('p', { className: 'text-xs text-gray-500' }, 'Abertas')
            ),
            h('div', { className: 'text-center p-3 bg-orange-50 rounded-lg' },
              h('p', { className: 'text-2xl font-bold text-orange-600' }, ko.criticas || 0),
              h('p', { className: 'text-xs text-gray-500' }, 'Críticas')
            ),
            h('div', { className: 'text-center p-3 bg-emerald-50 rounded-lg' },
              h('p', { className: 'text-2xl font-bold text-emerald-600' }, ko.resolvidas_periodo || 0),
              h('p', { className: 'text-xs text-gray-500' }, 'Resolvidas')
            ),
            h('div', { className: 'text-center p-3 bg-gray-50 rounded-lg' },
              h('p', { className: 'text-2xl font-bold text-gray-700' }, ko.tempo_medio_resolucao_horas ? `${ko.tempo_medio_resolucao_horas}h` : '-'),
              h('p', { className: 'text-xs text-gray-500' }, 'T. Médio Resolução')
            )
          )
        )
      ),

      // Distribuição Health Score + Clientes em Risco
      h('div', { className: 'grid md:grid-cols-2 gap-6' },
        // Health Score Distribution
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
          h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4' }, '💚 Distribuição Health Score'),
          distribuicao_health && distribuicao_health.length > 0
            ? h('div', { className: 'space-y-3' },
                ...distribuicao_health.map((faixa, i) =>
                  h('div', { key: i, className: 'flex items-center gap-3' },
                    h('div', { className: 'w-3 h-3 rounded-full flex-shrink-0', style: { backgroundColor: faixa.cor } }),
                    h('span', { className: 'text-sm text-gray-700 flex-1' }, faixa.faixa),
                    h('span', { className: 'text-sm font-bold text-gray-900' }, faixa.quantidade),
                    h('div', { className: 'w-24 h-2 bg-gray-100 rounded-full overflow-hidden' },
                      h('div', { className: 'h-full rounded-full transition-all', style: { width: `${Math.min(100, (parseInt(faixa.quantidade) / Math.max(1, parseInt(kc.total_clientes))) * 100)}%`, backgroundColor: faixa.cor } })
                    )
                  )
                )
              )
            : h('p', { className: 'text-gray-400 text-sm' }, 'Nenhum dado disponível')
        ),

        // Clientes em Risco
        h('div', { className: 'bg-white rounded-xl border border-red-100 p-5' },
          h('h3', { className: 'text-sm font-semibold text-red-500 uppercase tracking-wider mb-4' }, '⚠️ Clientes em Risco'),
          clientes_risco && clientes_risco.length > 0
            ? h('div', { className: 'space-y-3' },
                ...clientes_risco.map((cli, i) =>
                  h('div', { key: i, className: 'flex items-center gap-3 p-3 bg-red-50/50 rounded-lg' },
                    h(HealthRing, { score: cli.health_score, size: 44 }),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('p', { className: 'text-sm font-medium text-gray-900 truncate' }, cli.nome_fantasia || `Cliente ${cli.cod_cliente}`),
                      h('p', { className: 'text-xs text-gray-500' }, `${cli.total_entregas_30d || 0} entregas · ${cli.taxa_prazo_30d || 0}% prazo · ${cli.ocorrencias_abertas || 0} ocorrências`)
                    ),
                    h(Badge, { text: cli.status, cor: cli.status === 'em_risco' ? '#F59E0B' : '#EF4444' })
                  )
                )
              )
            : h('p', { className: 'text-gray-400 text-sm text-center py-4' }, '🎉 Nenhum cliente em risco!')
        )
      ),

      // Possível Churn + Churned Confirmado
      h('div', { className: 'grid md:grid-cols-2 gap-6' },
        // Possível Churn
        h('div', { className: 'bg-white rounded-xl border border-orange-200 p-5' },
          h('div', { className: 'flex items-center gap-2 mb-4' },
            h('span', { className: 'text-lg' }, '📉'),
            h('h3', { className: 'text-sm font-semibold text-orange-600 uppercase tracking-wider' }, 'Possível Churn'),
            possiveis_churn && possiveis_churn.length > 0 && h('span', { className: 'ml-auto bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full' }, possiveis_churn.length)
          ),
          possiveis_churn && possiveis_churn.length > 0
            ? h('div', { className: 'space-y-2 max-h-72 overflow-y-auto' },
                ...possiveis_churn.map((cli, i) =>
                  h('div', { key: i, className: 'flex items-center gap-3 p-3 rounded-lg bg-orange-50/70 border border-orange-100' },
                    h(HealthRing, { score: cli.health_score, size: 40 }),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('p', { className: 'text-sm font-medium text-gray-900 truncate' }, cli.nome_fantasia || `Cliente ${cli.cod_cliente}`),
                      h('div', { className: 'flex flex-wrap items-center gap-2 mt-1' },
                        cli.motivo_alerta === 'sem_solicitacao_7d'
                          ? h('span', { className: 'text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium' },
                              `${cli.dias_desde_ultima_semana}d sem solicitar`)
                          : null,
                        (cli.motivo_alerta === 'queda_abrupta' || cli.motivo_alerta === 'queda_moderada')
                          ? h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${
                              cli.motivo_alerta === 'queda_abrupta' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }` }, `${cli.oscilacao_pct}% volume`)
                          : null,
                        cli.media_anterior > 0 && h('span', { className: 'text-xs text-gray-500' },
                          `${cli.media_anterior} → ${cli.media_recente} ent/sem`)
                      )
                    ),
                    h(Badge, {
                      text: cli.motivo_alerta === 'sem_solicitacao_7d' ? 'inativo' : 'oscilação',
                      cor: cli.motivo_alerta === 'sem_solicitacao_7d' ? '#EF4444' : '#F97316'
                    }),
                    h('button', { 
                      onClick: (e) => { e.stopPropagation(); confirmarChurn(cli.cod_cliente, cli.nome_fantasia); },
                      title: 'Confirmar Churn',
                      className: 'ml-1 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0'
                    }, '💀')
                  )
                )
              )
            : h('p', { className: 'text-gray-400 text-sm text-center py-4' }, '✅ Nenhum sinal de churn detectado')
        ),

        // Churned Confirmado
        h('div', { className: 'bg-white rounded-xl border border-gray-300 p-5' },
          h('div', { className: 'flex items-center gap-2 mb-4' },
            h('span', { className: 'text-lg' }, '💀'),
            h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider' }, 'Churned Confirmado (>30d)'),
            churned_confirmados && churned_confirmados.length > 0 && h('span', { className: 'ml-auto bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full' }, churned_confirmados.length)
          ),
          churned_confirmados && churned_confirmados.length > 0
            ? h('div', { className: 'space-y-2 max-h-72 overflow-y-auto' },
                ...churned_confirmados.map((cli, i) =>
                  h('div', { key: i, className: 'flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200' },
                    h('div', { className: 'w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm font-bold flex-shrink-0' }, '—'),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('p', { className: 'text-sm font-medium text-gray-600 truncate' }, cli.nome_fantasia || `Cliente ${cli.cod_cliente}`),
                      h('p', { className: 'text-xs text-gray-400 mt-0.5' },
                        `${cli.dias_sem_entrega}d sem solicitar · ${parseInt(cli.total_entregas_historico || 0).toLocaleString('pt-BR')} entregas no histórico · ${formatCurrency(cli.valor_total_historico)}`)
                    ),
                    cli.ultima_entrega && h('span', { className: 'text-xs text-gray-400 whitespace-nowrap' }, `Última: ${formatDate(cli.ultima_entrega)}`)
                  )
                )
              )
            : h('p', { className: 'text-gray-400 text-sm text-center py-4' }, 'Nenhum cliente em churn')
        )
      ),

      // Interações Recentes
      h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
        h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4' }, '🕐 Interações Recentes'),
        interacoes_recentes && interacoes_recentes.length > 0
          ? h('div', { className: 'divide-y divide-gray-100' },
              ...interacoes_recentes.map((int, i) =>
                h('div', { key: i, className: 'flex items-center gap-3 py-3' },
                  h('span', { className: 'text-lg' }, int.tipo === 'visita' ? '📍' : int.tipo === 'reuniao' ? '👥' : int.tipo === 'ligacao' ? '📞' : int.tipo === 'whatsapp' ? '💬' : '📝'),
                  h('div', { className: 'flex-1 min-w-0' },
                    h('p', { className: 'text-sm font-medium text-gray-900 truncate' }, int.titulo),
                    h('p', { className: 'text-xs text-gray-500' }, `${int.nome_fantasia || 'Cliente'} · por ${int.criado_por_nome || 'Sistema'}`)
                  ),
                  h('span', { className: 'text-xs text-gray-400 whitespace-nowrap' }, diasAtras(int.data_interacao))
                )
              )
            )
          : h('p', { className: 'text-gray-400 text-sm text-center py-4' }, 'Nenhuma interação registrada')
      )
    );
  }

  // ══════════════════════════════════════════════════
  // SUB-TELA: LISTA DE CLIENTES
  // ══════════════════════════════════════════════════
  function ClientesView({ fetchApi, onSelectCliente }) {
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [syncing, setSyncing] = useState(false);

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (search) params.set('search', search);
        if (filtroStatus) params.set('status', filtroStatus);
        const res = await fetchApi(`/cs/clientes?${params}`);
        if (res.success) setClientes(res.clientes || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [fetchApi, search, filtroStatus]);

    useEffect(() => { carregar(); }, [carregar]);

    const syncBi = async () => {
      setSyncing(true);
      try {
        const res = await fetchApi('/cs/clientes/sync-bi', { method: 'POST' });
        if (res.success) {
          alert(`✅ ${res.importados} novos clientes importados do BI!`);
          carregar();
        }
      } catch (e) { alert('Erro ao sincronizar'); }
      setSyncing(false);
    };

    return h('div', { className: 'space-y-4' },
      // Toolbar
      h('div', { className: 'flex flex-wrap items-center gap-3' },
        h('div', { className: 'flex-1 min-w-[200px]' },
          h('input', {
            type: 'text', placeholder: '🔍 Buscar cliente (nome, código, CNPJ)...',
            value: search, onChange: e => setSearch(e.target.value),
            className: 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          })
        ),
        h('select', {
          value: filtroStatus, onChange: e => setFiltroStatus(e.target.value),
          className: 'px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white'
        },
          h('option', { value: '' }, 'Todos os status'),
          h('option', { value: 'ativo' }, '✅ Ativo'),
          h('option', { value: 'em_risco' }, '⚠️ Em Risco'),
          h('option', { value: 'inativo' }, '🔴 Inativo'),
          h('option', { value: 'churned' }, '⚫ Churned')
        ),
        h('button', { onClick: syncBi, disabled: syncing, className: 'px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50' },
          syncing ? '⏳ Sincronizando...' : '📥 Sync BI'
        )
      ),

      // Contador
      h('p', { className: 'text-sm text-gray-500' }, `${clientes.length} clientes encontrados`),

      // Lista
      loading
        ? h(Skeleton, { linhas: 6 })
        : clientes.length === 0
          ? h(EmptyState, { titulo: 'Nenhum cliente encontrado', descricao: 'Clique em "Sync BI" para importar clientes das entregas.' })
          : h('div', { className: 'space-y-2' },
              ...clientes.map(cli =>
                h('div', {
                  key: cli.cod_cliente,
                  onClick: () => onSelectCliente(cli.cod_cliente),
                  className: 'bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer'
                },
                  h('div', { className: 'flex items-center gap-4' },
                    h(HealthRing, { score: cli.health_score, size: 52 }),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'flex items-center gap-2 mb-1' },
                        h('h4', { className: 'font-semibold text-gray-900 truncate' }, cli.nome_fantasia || `Cliente ${cli.cod_cliente}`),
                        h('span', { className: 'text-xs text-gray-400' }, `#${cli.cod_cliente}`)
                      ),
                      h('div', { className: 'flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500' },
                        h('span', null, `🚚 ${cli.total_entregas_30d || 0} entregas/30d`),
                        h('span', null, `⏱️ ${cli.taxa_prazo_30d || 0}% prazo`),
                        h('span', null, `💰 ${formatCurrency(cli.valor_total_30d)}`),
                        parseFloat(cli.taxa_retorno_30d) > 5
                          ? h('span', { className: 'text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full' }, `🔄 ${cli.taxa_retorno_30d}% retorno`)
                          : parseFloat(cli.taxa_retorno_30d) > 3
                            ? h('span', { className: 'text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full' }, `🔄 ${cli.taxa_retorno_30d}% retorno`)
                            : parseInt(cli.total_retornos_30d) > 0
                              ? h('span', null, `🔄 ${cli.total_retornos_30d} retornos`)
                              : null,
                        cli.ocorrencias_abertas > 0 && h('span', { className: 'text-red-500 font-medium' }, `🚨 ${cli.ocorrencias_abertas} ocorrências`),
                        cli.ultima_interacao && h('span', null, `📝 Última interação: ${diasAtras(cli.ultima_interacao)}`),
                        parseInt(cli.qtd_centros_custo) > 1 && h('span', { className: 'text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-full' }, 
                          `📋 ${cli.qtd_centros_custo} centros de custo`)
                      )
                    ),
                    h('div', { className: 'flex flex-col items-end gap-1' },
                      h(Badge, {
                        text: cli.status || 'ativo',
                        cor: cli.status === 'ativo' ? '#10B981' : cli.status === 'em_risco' ? '#F59E0B' : cli.status === 'inativo' ? '#EF4444' : '#6B7280'
                      }),
                      cli.ultima_entrega && h('span', { className: 'text-xs text-gray-400' }, `Última entrega: ${diasAtras(cli.ultima_entrega)}`)
                    )
                  )
                )
              )
            )
    );
  }

  // ══════════════════════════════════════════════════
  // SUB-TELA: DETALHE DO CLIENTE (com Raio-X)
  // ══════════════════════════════════════════════════
  function ClienteDetalheView({ codCliente, fetchApi, apiUrl, getToken, onVoltar }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [raioXLoading, setRaioXLoading] = useState(false);
    const [raioXResult, setRaioXResult] = useState(null);
    const [showNovaInteracao, setShowNovaInteracao] = useState(false);
    const [showNovaOcorrencia, setShowNovaOcorrencia] = useState(false);
    const [interacaoForm, setInteracaoForm] = useState({ tipo: 'ligacao', titulo: '', descricao: '', resultado: '', proxima_acao: '' });
    const [ocorrenciaForm, setOcorrenciaForm] = useState({ tipo: 'problema_entrega', titulo: '', descricao: '', severidade: 'media' });
    const [periodoRaioX, setPeriodoRaioX] = useState(() => {
      const now = new Date();
      return {
        inicio: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
        fim: now.toISOString().split('T')[0],
      };
    });

    const carregar = useCallback(async (filtroInicio, filtroFim) => {
      setLoading(true);
      try {
        let url = `/cs/clientes/${codCliente}`;
        if (filtroInicio && filtroFim) url += `?data_inicio=${filtroInicio}&data_fim=${filtroFim}`;
        const res = await fetchApi(url);
        if (res.success) setData(res);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [fetchApi, codCliente]);

    // Carregar uma vez ao abrir (sem filtro = histórico completo)
    useEffect(() => { carregar(); }, [carregar]);

    const filtrarPeriodo = () => { carregar(periodoRaioX.inicio, periodoRaioX.fim); };

    const gerarRaioX = async () => {
      setRaioXLoading(true);
      try {
        const res = await fetchApi('/cs/raio-x', {
          method: 'POST',
          body: JSON.stringify({ cod_cliente: codCliente, data_inicio: periodoRaioX.inicio, data_fim: periodoRaioX.fim }),
        });
        if (res.success) setRaioXResult(res.raio_x);
        else alert('Erro: ' + (res.error || 'Falha ao gerar'));
      } catch (e) { alert('Erro ao gerar Raio-X: ' + (e.message || e)); console.error(e); }
      setRaioXLoading(false);
    };

    const abrirMapaCalor = () => {
      const url = `${apiUrl}/cs/mapa-calor/${codCliente}?data_inicio=${periodoRaioX.inicio}&data_fim=${periodoRaioX.fim}`;
      // Abrir popup com loading enquanto backend processa
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mapa de Calor</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;color:white}
.spinner{width:60px;height:60px;border:4px solid rgba(255,255,255,0.2);border-top:4px solid #a78bfa;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:24px}
@keyframes spin{to{transform:rotate(360deg)}}
h2{font-size:20px;font-weight:700;margin-bottom:8px}p{font-size:14px;opacity:0.7;max-width:400px;text-align:center;line-height:1.6}
.dots::after{content:'';animation:dots 1.5s infinite}@keyframes dots{0%{content:''}33%{content:'.'}66%{content:'..'}100%{content:'...'}}
</style></head><body><div class="spinner"></div><h2>🗺️ Preparando seu Mapa de Calor</h2>
<p>Estamos geocodificando os endereços da operação<span class="dots"></span></p>
<p style="margin-top:12px;font-size:12px;opacity:0.5">Na primeira vez pode levar alguns segundos. Acessos futuros serão instantâneos.</p>
</body></html>`);
        w.document.close();
        // Redirecionar para URL real
        w.location.href = url;
      }
    };

    const gerarPdfRaioX = () => {
      if (!raioXResult) return;
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Raio-X — ${data?.cliente?.nome_fantasia || 'Cliente'}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',sans-serif;padding:40px 50px;color:#1e293b;font-size:13px;line-height:1.7}
  h1{font-size:22px;color:#4f46e5;margin-bottom:4px}
  h2{font-size:16px;color:#4f46e5;margin-top:28px;margin-bottom:8px;border-bottom:2px solid #e0e7ff;padding-bottom:4px}
  h3{font-size:14px;color:#6366f1;margin-top:20px;margin-bottom:6px}
  strong{color:#1e293b}
  li{margin-left:20px;margin-bottom:4px}
  a{color:#4f46e5;text-decoration:underline}
  .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #6366f1;padding-bottom:16px;margin-bottom:24px}
  .header .score{font-size:36px;font-weight:800;color:#6366f1}
  .header .info{font-size:12px;color:#94a3b8}
  @media print{body{padding:20px 30px}a[href]:after{content:none}}
</style></head><body>
<div class="header">
  <div><h1>🔬 Raio-X Operacional</h1><p>${data?.cliente?.nome_fantasia || ''}</p><p class="info">Período: ${periodoRaioX.inicio} a ${periodoRaioX.fim} · Gerado em ${new Date(raioXResult.gerado_em).toLocaleDateString('pt-BR')}</p></div>
  <div class="score">${raioXResult.health_score}</div>
</div>
${renderMarkdown(raioXResult.analise)}
<script>setTimeout(function(){window.print()},500)</script>
</body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
    };

    const salvarInteracao = async () => {
      try {
        const res = await fetchApi('/cs/interacoes', {
          method: 'POST',
          body: JSON.stringify({ ...interacaoForm, cod_cliente: codCliente }),
        });
        if (res.success) {
          setShowNovaInteracao(false);
          setInteracaoForm({ tipo: 'ligacao', titulo: '', descricao: '', resultado: '', proxima_acao: '' });
          carregar();
        }
      } catch (e) { alert('Erro ao salvar interação'); }
    };

    const salvarOcorrencia = async () => {
      try {
        const res = await fetchApi('/cs/ocorrencias', {
          method: 'POST',
          body: JSON.stringify({ ...ocorrenciaForm, cod_cliente: codCliente }),
        });
        if (res.success) {
          setShowNovaOcorrencia(false);
          setOcorrenciaForm({ tipo: 'problema_entrega', titulo: '', descricao: '', severidade: 'media' });
          carregar();
        }
      } catch (e) { alert('Erro ao salvar ocorrência'); }
    };

    if (loading) return h('div', { className: 'p-6' }, h(Skeleton, { linhas: 10 }));
    if (!data) return h(EmptyState, { titulo: 'Cliente não encontrado' });

    const { ficha, metricas_bi: m, diagnostico: diag, interacoes, ocorrencias, evolucao_semanal, raio_x_historico } = data;
    const cor = getHealthCor(diag.health_score);

    return h('div', { className: 'space-y-6' },
      // Header com voltar
      h('div', { className: 'flex items-center gap-4' },
        h('button', { onClick: onVoltar, className: 'p-2 hover:bg-gray-100 rounded-lg transition-colors' }, '← Voltar'),
        h('div', { className: 'flex-1' },
          h('h2', { className: 'text-xl font-bold text-gray-900' }, ficha.nome_fantasia || `Cliente ${codCliente}`),
          h('p', { className: 'text-sm text-gray-500' }, `Cód: ${codCliente} · ${ficha.cidade || ''} ${ficha.estado ? '- ' + ficha.estado : ''} · ${ficha.segmento || 'Autopeças'}`)
        ),
        h(HealthRing, { score: diag.health_score, size: 64 }),
        h('div', { className: 'text-right' },
          h('p', { className: `text-lg font-bold ${cor.text}` }, getHealthLabel(diag.health_score)),
          h('p', { className: 'text-xs text-gray-400' }, diag.dias_sem_entrega < 999 ? `${diag.dias_sem_entrega}d sem entrega` : 'Sem entregas')
        )
      ),

      // KPIs Rápidos
      h('div', { className: 'grid grid-cols-2 md:grid-cols-7 gap-3' },
        h(KpiCard, { titulo: 'Entregas', valor: parseInt(m.total_entregas || 0).toLocaleString(), icone: '🚚', cor: 'blue' }),
        h(KpiCard, { titulo: 'Taxa Prazo', valor: `${m.taxa_prazo || 0}%`, icone: '⏱️', cor: parseFloat(m.taxa_prazo) >= 85 ? 'green' : 'amber' }),
        h(KpiCard, { titulo: 'Faturamento', valor: formatCurrency(m.valor_total), icone: '💰', cor: 'green' }),
        h(KpiCard, { titulo: 'Tempo Médio', valor: `${m.tempo_medio || 0}min`, icone: '🕐', cor: 'gray' }),
        h(KpiCard, { titulo: 'Profissionais', valor: m.profissionais_unicos || 0, icone: '🏍️', cor: 'purple' }),
        h(KpiCard, { titulo: 'Retornos', valor: `${m.total_retornos || 0}`, icone: '🔄', cor: parseFloat(m.taxa_retorno || 0) > 5 ? 'red' : parseFloat(m.taxa_retorno || 0) > 3 ? 'amber' : 'gray' }),
        h(KpiCard, { titulo: 'Taxa Retorno', valor: `${m.taxa_retorno || 0}%`, icone: '⚠️', cor: parseFloat(m.taxa_retorno || 0) > 5 ? 'red' : parseFloat(m.taxa_retorno || 0) > 3 ? 'amber' : 'green' })
      ),

      // Centros de Custo (quando existem)
      data.centros_custo && data.centros_custo.length > 1 && h('div', { className: 'flex flex-wrap items-center gap-2 px-1' },
        h('span', { className: 'text-xs font-semibold text-gray-500 uppercase tracking-wider' }, '📋 Centros de Custo:'),
        ...data.centros_custo.map((cc, i) =>
          h('span', { key: i, className: 'inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100' },
            cc.centro_custo,
            h('span', { className: 'text-indigo-400' }, `(${parseInt(cc.total_entregas).toLocaleString()})`)
          )
        )
      ),

      // Alertas automáticos
      diag.alertas && diag.alertas.length > 0 && h('div', { className: 'space-y-2' },
        ...diag.alertas.map((alerta, i) =>
          h('div', {
            key: i,
            className: `flex items-center gap-3 px-4 py-3 rounded-xl border ${
              alerta.tipo === 'critico' ? 'bg-red-50 border-red-200 text-red-800' :
              alerta.tipo === 'alto' ? 'bg-orange-50 border-orange-200 text-orange-800' :
              'bg-amber-50 border-amber-200 text-amber-800'
            }`
          },
            h('span', { className: 'text-lg' }, alerta.icone),
            h('span', { className: 'text-sm font-medium flex-1' }, alerta.msg)
          )
        )
      ),

      // Ações Rápidas
      h('div', { className: 'flex flex-wrap gap-2' },
        h('button', { onClick: () => setShowNovaInteracao(true), className: 'px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700' }, '📝 Nova Interação'),
        h('button', { onClick: () => setShowNovaOcorrencia(true), className: 'px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700' }, '🚨 Nova Ocorrência'),
        h('div', { className: 'flex-1' }),
        h('input', { type: 'date', value: periodoRaioX.inicio, onChange: e => setPeriodoRaioX(p => ({ ...p, inicio: e.target.value })),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
        h('input', { type: 'date', value: periodoRaioX.fim, onChange: e => setPeriodoRaioX(p => ({ ...p, fim: e.target.value })),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
        h('button', { onClick: filtrarPeriodo,
          className: 'px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800' },
          '🔍 Filtrar'
        ),
        h('button', { onClick: gerarRaioX, disabled: raioXLoading,
          className: 'px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-bold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg' },
          raioXLoading ? '🔬 Gerando análise...' : '🔬 Gerar Raio-X IA'
        ),
        h('button', { onClick: abrirMapaCalor,
          className: 'px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-bold hover:from-emerald-600 hover:to-teal-700 shadow-lg' },
          '🗺️ Mapa de Calor'
        )
      ),

      // Raio-X IA (quando gerado)
      raioXResult && h('div', { className: 'bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6 shadow-inner' },
        h('div', { className: 'flex items-center gap-2 mb-4 flex-wrap' },
          h('span', { className: 'text-2xl' }, '🔬'),
          h('h3', { className: 'text-lg font-bold text-indigo-900' }, 'Raio-X Inteligente'),
          h('span', { className: 'text-xs text-indigo-400 ml-auto' }, `Gerado em ${formatDateTime(raioXResult.gerado_em)} · ${raioXResult.tokens} tokens`),
          h('button', { onClick: gerarPdfRaioX,
            className: 'ml-2 px-4 py-1.5 bg-white border border-indigo-300 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-50 shadow-sm' },
            '📄 Gerar PDF'
          )
        ),
        h('div', {
          className: 'prose prose-sm prose-indigo max-w-none',
          dangerouslySetInnerHTML: { __html: renderMarkdown(raioXResult.analise) }
        })
      ),

      // Timeline Interações + Ocorrências
      h('div', { className: 'grid md:grid-cols-2 gap-6' },
        // Interações
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
          h('h3', { className: 'font-semibold text-gray-700 mb-4' }, '📝 Últimas Interações'),
          interacoes && interacoes.length > 0
            ? h('div', { className: 'space-y-3' }, ...interacoes.map((int, i) =>
                h('div', { key: i, className: 'flex gap-3 p-3 bg-gray-50 rounded-lg' },
                  h('span', { className: 'text-lg mt-0.5' }, int.tipo === 'visita' ? '📍' : int.tipo === 'reuniao' ? '👥' : int.tipo === 'ligacao' ? '📞' : int.tipo === 'whatsapp' ? '💬' : int.tipo === 'pos_venda' ? '✅' : '📝'),
                  h('div', { className: 'flex-1 min-w-0' },
                    h('p', { className: 'text-sm font-medium text-gray-900' }, int.titulo),
                    int.descricao && h('p', { className: 'text-xs text-gray-500 mt-1 line-clamp-2' }, int.descricao),
                    h('p', { className: 'text-xs text-gray-400 mt-1' }, `${formatDateTime(int.data_interacao)} · ${int.criado_por_nome || ''}`)
                  )
                )
              ))
            : h('p', { className: 'text-sm text-gray-400 text-center py-4' }, 'Nenhuma interação registrada')
        ),

        // Ocorrências
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
          h('h3', { className: 'font-semibold text-gray-700 mb-4' }, '🚨 Ocorrências Abertas'),
          ocorrencias && ocorrencias.length > 0
            ? h('div', { className: 'space-y-3' }, ...ocorrencias.map((oc, i) =>
                h('div', { key: i, className: `flex gap-3 p-3 rounded-lg ${oc.severidade === 'critica' ? 'bg-red-50' : oc.severidade === 'alta' ? 'bg-orange-50' : 'bg-amber-50'}` },
                  h('span', { className: 'text-lg mt-0.5' }, oc.severidade === 'critica' ? '🔴' : oc.severidade === 'alta' ? '🟠' : '🟡'),
                  h('div', { className: 'flex-1 min-w-0' },
                    h('p', { className: 'text-sm font-medium text-gray-900' }, oc.titulo),
                    h('div', { className: 'flex items-center gap-2 mt-1' },
                      h(Badge, { text: oc.tipo, cor: '#6B7280' }),
                      h(Badge, { text: oc.severidade, cor: oc.severidade === 'critica' ? '#EF4444' : oc.severidade === 'alta' ? '#F97316' : '#F59E0B' }),
                      h(Badge, { text: oc.status, cor: '#3B82F6' })
                    ),
                    h('p', { className: 'text-xs text-gray-400 mt-1' }, formatDateTime(oc.data_abertura))
                  )
                )
              ))
            : h('p', { className: 'text-sm text-gray-400 text-center py-4' }, '✅ Nenhuma ocorrência aberta!')
        )
      ),

      // Histórico Raio-X
      raio_x_historico && raio_x_historico.length > 0 && h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
        h('h3', { className: 'font-semibold text-gray-700 mb-4' }, '📋 Histórico de Raio-X'),
        h('div', { className: 'space-y-2' }, ...raio_x_historico.map((rx, i) =>
          h('div', { key: i, className: 'flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-indigo-50',
            onClick: async () => {
              try {
                const res = await fetchApi(`/cs/raio-x/${rx.id}`);
                if (res.success) setRaioXResult({ analise: res.raio_x.analise_texto, gerado_em: res.raio_x.created_at, tokens: res.raio_x.tokens_utilizados });
              } catch (e) { console.error(e); }
            }
          },
            h(HealthRing, { score: rx.score_saude, size: 36 }),
            h('div', { className: 'flex-1' },
              h('p', { className: 'text-sm font-medium text-gray-900' }, `${formatDate(rx.data_inicio)} a ${formatDate(rx.data_fim)}`),
              h('p', { className: 'text-xs text-gray-500' }, `${rx.tipo_analise} · por ${rx.gerado_por_nome || 'Sistema'}`)
            ),
            h('span', { className: 'text-xs text-gray-400' }, formatDateTime(rx.created_at))
          )
        ))
      ),

      // Modal Nova Interação
      h(Modal, { aberto: showNovaInteracao, fechar: () => setShowNovaInteracao(false), titulo: '📝 Nova Interação' },
        h('div', { className: 'space-y-4' },
          h('div', null,
            h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Tipo'),
            h('select', { value: interacaoForm.tipo, onChange: e => setInteracaoForm(f => ({ ...f, tipo: e.target.value })),
              className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' },
              h('option', { value: 'visita' }, '📍 Visita Presencial'),
              h('option', { value: 'reuniao' }, '👥 Reunião'),
              h('option', { value: 'ligacao' }, '📞 Ligação'),
              h('option', { value: 'pos_venda' }, '✅ Pós-Venda'),
              h('option', { value: 'whatsapp' }, '💬 WhatsApp'),
              h('option', { value: 'email' }, '📧 E-mail'),
              h('option', { value: 'anotacao' }, '📝 Anotação')
            )
          ),
          h('div', null,
            h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Título *'),
            h('input', { type: 'text', value: interacaoForm.titulo, onChange: e => setInteracaoForm(f => ({ ...f, titulo: e.target.value })),
              placeholder: 'Ex: Reunião de alinhamento mensal',
              className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' })
          ),
          h('div', null,
            h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Descrição'),
            h('textarea', { value: interacaoForm.descricao, onChange: e => setInteracaoForm(f => ({ ...f, descricao: e.target.value })),
              rows: 3, placeholder: 'Detalhes da interação...',
              className: 'w-full px-3 py-2 border border-gray-200 rounded-lg resize-none' })
          ),
          h('div', null,
            h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Resultado'),
            h('input', { type: 'text', value: interacaoForm.resultado, onChange: e => setInteracaoForm(f => ({ ...f, resultado: e.target.value })),
              placeholder: 'Ex: Cliente satisfeito, solicitou aumento de frota',
              className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' })
          ),
          h('div', null,
            h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Próxima Ação'),
            h('input', { type: 'text', value: interacaoForm.proxima_acao, onChange: e => setInteracaoForm(f => ({ ...f, proxima_acao: e.target.value })),
              placeholder: 'Ex: Enviar proposta comercial até sexta',
              className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' })
          ),
          h('button', { onClick: salvarInteracao, disabled: !interacaoForm.titulo,
            className: 'w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50' }, '💾 Salvar Interação')
        )
      ),

      // Modal Nova Ocorrência
      h(Modal, { aberto: showNovaOcorrencia, fechar: () => setShowNovaOcorrencia(false), titulo: '🚨 Nova Ocorrência' },
        h('div', { className: 'space-y-4' },
          h('div', { className: 'grid grid-cols-2 gap-4' },
            h('div', null,
              h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Tipo'),
              h('select', { value: ocorrenciaForm.tipo, onChange: e => setOcorrenciaForm(f => ({ ...f, tipo: e.target.value })),
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' },
                h('option', { value: 'reclamacao' }, 'Reclamação'),
                h('option', { value: 'problema_entrega' }, 'Problema na Entrega'),
                h('option', { value: 'atraso' }, 'Atraso Recorrente'),
                h('option', { value: 'financeiro' }, 'Problema Financeiro'),
                h('option', { value: 'operacional' }, 'Problema Operacional'),
                h('option', { value: 'sugestao' }, 'Sugestão'),
                h('option', { value: 'elogio' }, 'Elogio')
              )
            ),
            h('div', null,
              h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Severidade'),
              h('select', { value: ocorrenciaForm.severidade, onChange: e => setOcorrenciaForm(f => ({ ...f, severidade: e.target.value })),
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' },
                h('option', { value: 'baixa' }, '🟢 Baixa'),
                h('option', { value: 'media' }, '🟡 Média'),
                h('option', { value: 'alta' }, '🟠 Alta'),
                h('option', { value: 'critica' }, '🔴 Crítica')
              )
            )
          ),
          h('div', null,
            h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Título *'),
            h('input', { type: 'text', value: ocorrenciaForm.titulo, onChange: e => setOcorrenciaForm(f => ({ ...f, titulo: e.target.value })),
              placeholder: 'Ex: Entregas atrasadas na região sul',
              className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' })
          ),
          h('div', null,
            h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Descrição'),
            h('textarea', { value: ocorrenciaForm.descricao, onChange: e => setOcorrenciaForm(f => ({ ...f, descricao: e.target.value })),
              rows: 3, placeholder: 'Descreva a ocorrência em detalhes...',
              className: 'w-full px-3 py-2 border border-gray-200 rounded-lg resize-none' })
          ),
          h('button', { onClick: salvarOcorrencia, disabled: !ocorrenciaForm.titulo,
            className: 'w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50' }, '💾 Registrar Ocorrência')
        )
      )
    );
  }

  // ══════════════════════════════════════════════════
  // SUB-TELA: INTERAÇÕES (visão geral)
  // ══════════════════════════════════════════════════
  function InteracoesView({ fetchApi }) {
    const [interacoes, setInteracoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroTipo, setFiltroTipo] = useState('');

    useEffect(() => {
      (async () => {
        setLoading(true);
        try {
          const params = new URLSearchParams({ limit: '50' });
          if (filtroTipo) params.set('tipo', filtroTipo);
          const res = await fetchApi(`/cs/interacoes?${params}`);
          if (res.success) setInteracoes(res.interacoes || []);
        } catch (e) { console.error(e); }
        setLoading(false);
      })();
    }, [fetchApi, filtroTipo]);

    return h('div', { className: 'space-y-4' },
      h('div', { className: 'flex items-center gap-3' },
        h('h3', { className: 'text-lg font-bold text-gray-900' }, 'Todas as Interações'),
        h('select', { value: filtroTipo, onChange: e => setFiltroTipo(e.target.value),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white ml-auto' },
          h('option', { value: '' }, 'Todos os tipos'),
          h('option', { value: 'visita' }, '📍 Visitas'),
          h('option', { value: 'reuniao' }, '👥 Reuniões'),
          h('option', { value: 'ligacao' }, '📞 Ligações'),
          h('option', { value: 'pos_venda' }, '✅ Pós-Venda'),
          h('option', { value: 'whatsapp' }, '💬 WhatsApp')
        )
      ),
      loading ? h(Skeleton, { linhas: 5 }) :
      interacoes.length === 0 ? h(EmptyState, { titulo: 'Nenhuma interação encontrada', icone: '📝' }) :
      h('div', { className: 'space-y-2' },
        ...interacoes.map((int, i) =>
          h('div', { key: i, className: 'bg-white rounded-xl border border-gray-200 p-4 flex gap-4 items-start' },
            h('span', { className: 'text-2xl' }, int.tipo === 'visita' ? '📍' : int.tipo === 'reuniao' ? '👥' : int.tipo === 'ligacao' ? '📞' : int.tipo === 'whatsapp' ? '💬' : int.tipo === 'pos_venda' ? '✅' : '📝'),
            h('div', { className: 'flex-1 min-w-0' },
              h('div', { className: 'flex items-center gap-2 mb-1' },
                h('h4', { className: 'font-semibold text-gray-900' }, int.titulo),
                h(Badge, { text: int.tipo, cor: '#6366F1' })
              ),
              h('p', { className: 'text-sm text-gray-600 mb-1' }, int.nome_fantasia || `Cliente ${int.cod_cliente}`),
              int.descricao && h('p', { className: 'text-sm text-gray-500 line-clamp-2' }, int.descricao),
              int.resultado && h('p', { className: 'text-xs text-emerald-600 mt-1' }, `✅ ${int.resultado}`),
              int.proxima_acao && h('p', { className: 'text-xs text-blue-600 mt-1' }, `📅 Próxima: ${int.proxima_acao}`)
            ),
            h('div', { className: 'text-right whitespace-nowrap' },
              h('p', { className: 'text-xs text-gray-400' }, formatDateTime(int.data_interacao)),
              h('p', { className: 'text-xs text-gray-400' }, int.criado_por_nome)
            )
          )
        )
      )
    );
  }

  // ══════════════════════════════════════════════════
  // SUB-TELA: OCORRÊNCIAS (visão geral)
  // ══════════════════════════════════════════════════
  function OcorrenciasView({ fetchApi }) {
    const [ocorrencias, setOcorrencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('');

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '50' });
        if (filtroStatus) params.set('status', filtroStatus);
        const res = await fetchApi(`/cs/ocorrencias?${params}`);
        if (res.success) setOcorrencias(res.ocorrencias || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [fetchApi, filtroStatus]);

    useEffect(() => { carregar(); }, [carregar]);

    const atualizarStatus = async (id, novoStatus) => {
      try {
        await fetchApi(`/cs/ocorrencias/${id}`, { method: 'PUT', body: JSON.stringify({ status: novoStatus }) });
        carregar();
      } catch (e) { console.error(e); }
    };

    return h('div', { className: 'space-y-4' },
      h('div', { className: 'flex items-center gap-3' },
        h('h3', { className: 'text-lg font-bold text-gray-900' }, 'Gestão de Ocorrências'),
        h('select', { value: filtroStatus, onChange: e => setFiltroStatus(e.target.value),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white ml-auto' },
          h('option', { value: '' }, 'Todos os status'),
          h('option', { value: 'aberta' }, '🔵 Abertas'),
          h('option', { value: 'em_andamento' }, '🟡 Em Andamento'),
          h('option', { value: 'resolvida' }, '🟢 Resolvidas'),
          h('option', { value: 'fechada' }, '⚫ Fechadas')
        )
      ),
      loading ? h(Skeleton, { linhas: 5 }) :
      ocorrencias.length === 0 ? h(EmptyState, { titulo: 'Nenhuma ocorrência', icone: '✅', descricao: 'Tudo limpo por aqui!' }) :
      h('div', { className: 'space-y-2' },
        ...ocorrencias.map((oc, i) =>
          h('div', { key: i, className: `bg-white rounded-xl border p-4 ${oc.severidade === 'critica' ? 'border-red-300' : oc.severidade === 'alta' ? 'border-orange-200' : 'border-gray-200'}` },
            h('div', { className: 'flex items-start gap-3' },
              h('span', { className: 'text-2xl' }, oc.severidade === 'critica' ? '🔴' : oc.severidade === 'alta' ? '🟠' : oc.severidade === 'media' ? '🟡' : '🟢'),
              h('div', { className: 'flex-1 min-w-0' },
                h('div', { className: 'flex items-center gap-2 mb-1 flex-wrap' },
                  h('h4', { className: 'font-semibold text-gray-900' }, oc.titulo),
                  h(Badge, { text: oc.tipo, cor: '#6B7280' }),
                  h(Badge, { text: oc.severidade, cor: oc.severidade === 'critica' ? '#EF4444' : oc.severidade === 'alta' ? '#F97316' : '#F59E0B' }),
                  h(Badge, { text: oc.status, cor: oc.status === 'aberta' ? '#3B82F6' : oc.status === 'resolvida' ? '#10B981' : '#F59E0B' })
                ),
                h('p', { className: 'text-sm text-gray-600' }, oc.nome_fantasia || `Cliente ${oc.cod_cliente}`),
                oc.descricao && h('p', { className: 'text-sm text-gray-500 mt-1' }, oc.descricao),
                h('div', { className: 'flex items-center gap-2 mt-2' },
                  oc.status === 'aberta' && h('button', { onClick: () => atualizarStatus(oc.id, 'em_andamento'), className: 'text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200' }, '▶ Iniciar'),
                  (oc.status === 'aberta' || oc.status === 'em_andamento') && h('button', { onClick: () => atualizarStatus(oc.id, 'resolvida'), className: 'text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200' }, '✅ Resolver')
                )
              ),
              h('span', { className: 'text-xs text-gray-400 whitespace-nowrap' }, formatDateTime(oc.data_abertura))
            )
          )
        )
      )
    );
  }

  // ══════════════════════════════════════════════════
  // SUB-TELA: AGENDA
  // ══════════════════════════════════════════════════
  function AgendaView({ fetchApi }) {
    const [agenda, setAgenda] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      (async () => {
        setLoading(true);
        try {
          const res = await fetchApi('/cs/interacoes/agenda?dias=30');
          if (res.success) setAgenda(res.agenda || []);
        } catch (e) { console.error(e); }
        setLoading(false);
      })();
    }, [fetchApi]);

    return h('div', { className: 'space-y-4' },
      h('h3', { className: 'text-lg font-bold text-gray-900' }, '📅 Próximas Ações Agendadas (30 dias)'),
      loading ? h(Skeleton, { linhas: 5 }) :
      agenda.length === 0 ? h(EmptyState, { titulo: 'Nenhuma ação agendada', icone: '📅', descricao: 'Registre interações com próximas ações para vê-las aqui.' }) :
      h('div', { className: 'space-y-2' },
        ...agenda.map((a, i) =>
          h('div', { key: i, className: 'bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4' },
            h('div', { className: 'text-center min-w-[60px]' },
              h('p', { className: 'text-2xl font-bold text-blue-600' }, new Date(a.data_proxima_acao).getDate()),
              h('p', { className: 'text-xs text-gray-500' }, new Date(a.data_proxima_acao).toLocaleDateString('pt-BR', { month: 'short' }))
            ),
            h('div', { className: 'flex-1 min-w-0' },
              h('p', { className: 'font-medium text-gray-900' }, a.proxima_acao),
              h('p', { className: 'text-sm text-gray-500' }, `${a.nome_fantasia || 'Cliente'} · Ref: ${a.titulo}`),
              h('p', { className: 'text-xs text-gray-400' }, `Interação original: ${formatDateTime(a.data_interacao)}`)
            ),
            h(Badge, { text: diasAtras(a.data_proxima_acao) || formatDate(a.data_proxima_acao), cor: new Date(a.data_proxima_acao) < new Date() ? '#EF4444' : '#3B82F6' })
          )
        )
      )
    );
  }

  // ══════════════════════════════════════════════════
  // Markdown simples → HTML
  // ══════════════════════════════════════════════════
  function renderMarkdown(text) {
    if (!text) return '';
    // Primeiro, extrair e proteger URLs antes do escape HTML
    const urlPlaceholders = [];
    let processed = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
      const idx = urlPlaceholders.length;
      urlPlaceholders.push({ label, url });
      return `__URL_PLACEHOLDER_${idx}__`;
    });
    // Links soltos (URLs puras)
    processed = processed.replace(/(https?:\/\/[^\s<>\[\]()]+)/g, (match) => {
      const idx = urlPlaceholders.length;
      urlPlaceholders.push({ label: 'Abrir link', url: match });
      return `__URL_PLACEHOLDER_${idx}__`;
    });
    // Agora escape HTML
    processed = processed
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-indigo-800 mt-6 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-indigo-900 mt-6 mb-2">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-gray-700 mb-1">• $1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm text-gray-700 mb-1">$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    // Restaurar URLs como botões estilizados
    urlPlaceholders.forEach((u, i) => {
      const isMapLink = u.url.includes('mapa-calor');
      const btnClass = isMapLink
        ? 'display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#10b981,#059669);color:white;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;margin:12px 0;box-shadow:0 4px 12px rgba(16,185,129,0.3)'
        : 'color:#4f46e5;text-decoration:underline;font-weight:600';
      const label = isMapLink ? '🗺️ Abrir Mapa de Calor Interativo' : u.label;
      processed = processed.replace(`__URL_PLACEHOLDER_${i}__`,
        `<a href="${u.url}" target="_blank" rel="noopener" style="${btnClass}">${label}</a>`
      );
    });
    return processed;
  }

  // ══════════════════════════════════════════════════
  // COMPONENTE PRINCIPAL
  // ══════════════════════════════════════════════════
  window.ModuloCsComponent = function(props) {
    const {
      usuario, estado, setEstado, API_URL: apiUrl, getToken, fetchAuth,
      HeaderCompacto, Toast, LoadingOverlay,
      Ee, socialProfile, ul, o, he, navegarSidebar, showToast,
      // Flags de loading/toast do parent
      n: isLoadingGlobal, i: toastData, f: isLoading, E: lastUpdate,
    } = props;

    const [activeTab, setActiveTab] = useState('dashboard');
    const [clienteDetalhe, setClienteDetalhe] = useState(null);

    // Fetch wrapper que usa a autenticação existente
    const fetchApi = useCallback(async (endpoint, options = {}) => {
      const token = getToken();
      const url = `${apiUrl}${endpoint}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(options.headers || {}),
        },
        credentials: 'include',
      });
      return res.json();
    }, [apiUrl, getToken]);

    // Navegar para tab
    const handleTabChange = (tabId) => {
      setActiveTab(tabId);
      setClienteDetalhe(null);
      setEstado({ ...estado, csTab: tabId });
    };

    // Abrir detalhe do cliente
    const handleSelectCliente = (cod) => {
      setClienteDetalhe(cod);
    };

    // Renderizar conteúdo ativo
    const renderContent = () => {
      // Se tiver cliente selecionado, mostra detalhe
      if (clienteDetalhe) {
        return h(ClienteDetalheView, { codCliente: clienteDetalhe, fetchApi, apiUrl, getToken, onVoltar: () => setClienteDetalhe(null) });
      }

      switch (activeTab) {
        case 'dashboard': return h(DashboardView, { fetchApi });
        case 'clientes': return h(ClientesView, { fetchApi, onSelectCliente: handleSelectCliente });
        case 'interacoes': return h(InteracoesView, { fetchApi });
        case 'ocorrencias': return h(OcorrenciasView, { fetchApi });
        case 'agenda': return h(AgendaView, { fetchApi });
        default: return h(DashboardView, { fetchApi });
      }
    };

    return h('div', { className: 'min-h-screen bg-gray-50' },
      // Toast
      toastData && h(Toast, toastData),
      isLoadingGlobal && h(LoadingOverlay),

      // Header com navegação
      h(HeaderCompacto, {
        usuario: usuario,
        moduloAtivo: Ee,
        abaAtiva: activeTab,
        socialProfile: socialProfile,
        isLoading: isLoading,
        lastUpdate: lastUpdate,
        onRefresh: ul,
        onLogout: () => o(null),
        onGoHome: () => he('home'),
        onNavigate: navegarSidebar,
        onChangeTab: handleTabChange,
      }),

      // Conteúdo
      h('div', { className: 'max-w-7xl mx-auto p-4 md:p-6' },
        // Breadcrumb quando em detalhe
        clienteDetalhe && h('div', { className: 'mb-4' },
          h('nav', { className: 'text-sm text-gray-500' },
            h('span', { className: 'cursor-pointer hover:text-blue-600', onClick: () => { setClienteDetalhe(null); setActiveTab('clientes'); } }, 'Clientes'),
            ' → ',
            h('span', { className: 'text-gray-900 font-medium' }, `Cliente #${clienteDetalhe}`)
          )
        ),

        // Conteúdo ativo
        renderContent()
      )
    );
  };

  console.log('✅ Módulo Sucesso do Cliente carregado');
})();
