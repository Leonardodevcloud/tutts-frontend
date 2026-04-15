// ==================== MÓDULO SUCESSO DO CLIENTE ====================
// Arquivo: modulo-cs.js
// Self-contained: gerencia próprio estado e fetch
// UI inspirada no CRM WhatsApp: clean, sidebar + content
// v2: Filtros estilo BI (cliente com máscara + centro de custo) .
// ================================================================

(function() {
  'use strict';

  const { useState, useEffect, useCallback, useRef, useMemo } = React;
  const h = React.createElement;

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'clientes', label: 'Clientes', icon: '🏢' },
    { id: 'interacoes', label: 'Interações', icon: '📝' },
    { id: 'ocorrencias', label: 'Ocorrências', icon: '🚨' },
    { id: 'agenda', label: 'Agenda', icon: '📅' },
    { id: 'emails', label: 'Emails', icon: '📧' },
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
  function formatCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
  function formatDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString('pt-BR'); }
  function formatDateTime(d) { if (!d) return '-'; return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  function diasAtras(d) {
    if (!d) return null;
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Hoje'; if (diff === 1) return 'Ontem'; return diff + 'd atrás';
  }

  function Badge({ text, cor = '#6B7280', className = '' }) {
    return h('span', { className: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ' + className, style: { backgroundColor: cor + '20', color: cor } }, text);
  }
  function HealthRing({ score, size = 60 }) {
    const cor = getHealthCor(score), radius = (size - 8) / 2, circ = 2 * Math.PI * radius, prog = ((score || 0) / 100) * circ;
    return h('div', { className: 'relative inline-flex items-center justify-center', style: { width: size, height: size } },
      h('svg', { width: size, height: size, className: 'transform -rotate-90' },
        h('circle', { cx: size/2, cy: size/2, r: radius, fill: 'none', stroke: '#E5E7EB', strokeWidth: 4 }),
        h('circle', { cx: size/2, cy: size/2, r: radius, fill: 'none', stroke: 'currentColor', strokeWidth: 4, strokeDasharray: circ, strokeDashoffset: circ - prog, strokeLinecap: 'round', className: cor.text, style: { transition: 'stroke-dashoffset 0.8s ease' } })
      ),
      h('span', { className: 'absolute text-sm font-bold ' + cor.text }, score || 0)
    );
  }
  function KpiCard({ titulo, valor, subtitulo, icone, cor = 'blue' }) {
    const cores = { blue: 'bg-blue-50 text-blue-600 border-blue-100', green: 'bg-emerald-50 text-emerald-600 border-emerald-100', amber: 'bg-amber-50 text-amber-600 border-amber-100', red: 'bg-red-50 text-red-600 border-red-100', purple: 'bg-purple-50 text-purple-600 border-purple-100', gray: 'bg-gray-50 text-gray-600 border-gray-100' };
    return h('div', { className: 'rounded-xl border p-3 ' + (cores[cor] || cores.gray) },
      h('div', { className: 'flex items-center gap-2 mb-1' }, icone && h('span', { className: 'text-lg' }, icone), h('span', { className: 'text-xs font-medium opacity-70 truncate' }, titulo)),
      h('p', { className: 'text-xl font-bold' }, valor), subtitulo && h('p', { className: 'text-xs opacity-60 mt-0.5' }, subtitulo)
    );
  }
  function Modal({ aberto, fechar, titulo, largura = 'max-w-2xl', children }) {
    if (!aberto) return null;
    return h('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4', onClick: e => { if (e.target === e.currentTarget) fechar(); } },
      h('div', { className: 'bg-white rounded-2xl shadow-2xl w-full ' + largura + ' max-h-[90vh] overflow-y-auto' },
        h('div', { className: 'flex items-center justify-between p-5 border-b border-gray-100' }, h('h3', { className: 'text-lg font-bold text-gray-900' }, titulo), h('button', { onClick: fechar, className: 'p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600' }, '✕')),
        h('div', { className: 'p-5' }, children)
      )
    );
  }
  function EmptyState({ icone = '📭', titulo, descricao, acao }) {
    return h('div', { className: 'flex flex-col items-center justify-center py-16 text-center' },
      h('span', { className: 'text-5xl mb-4' }, icone), h('h3', { className: 'text-lg font-semibold text-gray-900 mb-2' }, titulo),
      descricao && h('p', { className: 'text-sm text-gray-500 max-w-md' }, descricao), acao && h('div', { className: 'mt-4' }, acao)
    );
  }
  function Skeleton({ linhas = 3 }) {
    return h('div', { className: 'animate-pulse space-y-3' },
      ...Array(linhas).fill(null).map(function(_, i) { return h('div', { key: i, className: 'h-4 bg-gray-200 rounded-lg', style: { width: (65 + Math.random() * 35) + '%' } }); })
    );
  }

  // ══════════════════════════════════════════════════
  // RAIO-X LOADING OVERLAY (animação de escaneamento)
  // ══════════════════════════════════════════════════
  var RAIO_X_MSGS = [
    { t: 'Coletando dados operacionais...', icon: '\uD83D\uDCCA', sub: 'Analisando entregas e m\u00e9tricas' },
    { t: 'Calculando benchmark da base...', icon: '\uD83D\uDCC8', sub: 'Comparando com todos os clientes' },
    { t: 'Processando faixas de hor\u00e1rio...', icon: '\u23F0', sub: 'Mapeando padr\u00f5es operacionais' },
    { t: 'Analisando profissionais...', icon: '\uD83D\uDEF5', sub: 'Avaliando desempenho por motoboy' },
    { t: 'Geocodificando mapa de calor...', icon: '\uD83D\uDDFA', sub: 'Mapeando pontos de entrega' },
    { t: 'Intelig\u00eancia artificial gerando...', icon: '\uD83E\uDDE0', sub: 'Gemini analisando os dados' },
    { t: 'Montando gr\u00e1ficos e relat\u00f3rio...', icon: '\uD83D\uDCDD', sub: 'Injetando visualiza\u00e7\u00f5es SVG' },
    { t: 'Finalizando an\u00e1lise completa...', icon: '\u2728', sub: 'Quase pronto!' }
  ];

  function RaioXLoadingOverlay() {
    var _m = useState(0), msgIdx = _m[0], setMsgIdx = _m[1];
    var _f = useState(false), fadeOut = _f[0], setFadeOut = _f[1];
    var containerRef = useRef(null);

    useEffect(function() {
      var interval = setInterval(function() {
        setFadeOut(true);
        setTimeout(function() {
          setMsgIdx(function(prev) { return (prev + 1) % RAIO_X_MSGS.length; });
          setFadeOut(false);
        }, 300);
      }, 3000);
      return function() { clearInterval(interval); };
    }, []);

    // Injetar CSS animations no head (1 vez)
    useEffect(function() {
      var id = 'raio-x-anim-css';
      if (document.getElementById(id)) return;
      var style = document.createElement('style');
      style.id = id;
      style.textContent = [
        '@keyframes rxSpin{to{transform:rotate(360deg)}}',
        '@keyframes rxSpinR{to{transform:rotate(-360deg)}}',
        '@keyframes rxScan{0%{transform:translateY(-50px);opacity:0}30%{opacity:1}70%{opacity:1}100%{transform:translateY(50px);opacity:0}}',
        '@keyframes rxFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
        '@keyframes rxDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}',
        '@keyframes rxBar{0%{width:0}30%{width:45%}60%{width:70%}80%{width:85%}100%{width:95%}}',
        '@keyframes rxParticle{0%{opacity:0;transform:translateY(15px) scale(0)}20%{opacity:.6;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-35px) scale(0)}}'
      ].join('\n');
      document.head.appendChild(style);
    }, []);

    // Partículas
    useEffect(function() {
      var el = containerRef.current;
      if (!el) return;
      var pBox = el.querySelector('.rx-particles');
      if (!pBox) return;
      var interval = setInterval(function() {
        var p = document.createElement('div');
        p.style.cssText = 'position:absolute;width:3px;height:3px;border-radius:50%;opacity:0;left:' + (25 + Math.random() * 90) + 'px;top:' + (25 + Math.random() * 90) + 'px;background:' + (Math.random() > 0.5 ? '#a78bfa' : '#7c3aed') + ';animation:rxParticle ' + (1.5 + Math.random()) + 's ease forwards';
        pBox.appendChild(p);
        setTimeout(function() { p.remove(); }, 2500);
      }, 300);
      return function() { clearInterval(interval); };
    }, []);

    var msg = RAIO_X_MSGS[msgIdx];

    return h('div', {
      ref: containerRef,
      className: 'bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 overflow-hidden',
      style: { padding: '48px 24px' }
    },
      h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' } },

        // Orbe com anéis
        h('div', { style: { position: 'relative', width: '140px', height: '140px' } },
          // Anel 1
          h('div', { style: { position: 'absolute', inset: '0', borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#7c3aed', borderRightColor: '#7c3aed', animation: 'rxSpin 2s linear infinite' } }),
          // Anel 2
          h('div', { style: { position: 'absolute', inset: '12px', borderRadius: '50%', border: '2px solid transparent', borderBottomColor: '#a78bfa', borderLeftColor: '#a78bfa', animation: 'rxSpinR 2.8s linear infinite' } }),
          // Anel 3
          h('div', { style: { position: 'absolute', inset: '24px', borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#c4b5fd', borderRightColor: '#c4b5fd', animation: 'rxSpin 3.6s linear infinite' } }),
          // Core
          h('div', { style: { position: 'absolute', inset: '34px', borderRadius: '50%', background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
            h('span', { style: { fontSize: '28px', animation: 'rxFloat 2s ease-in-out infinite' } }, msg.icon)
          ),
          // Scan line
          h('div', { style: { position: 'absolute', left: '34px', right: '34px', height: '2px', top: '50%', background: 'linear-gradient(90deg, transparent, #7c3aed, transparent)', animation: 'rxScan 2s ease-in-out infinite', borderRadius: '1px' } }),
          // Particles container
          h('div', { className: 'rx-particles', style: { position: 'absolute', inset: '0', pointerEvents: 'none' } })
        ),

        // Dots
        h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
          h('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', animation: 'rxDot 1.2s ease infinite' } }),
          h('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', animation: 'rxDot 1.2s ease .2s infinite' } }),
          h('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', animation: 'rxDot 1.2s ease .4s infinite' } }),
          h('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', animation: 'rxDot 1.2s ease .6s infinite' } })
        ),

        // Mensagem principal
        h('div', {
          style: { fontSize: '14px', fontWeight: '500', color: '#7c3aed', textAlign: 'center', minHeight: '22px', transition: 'opacity 0.3s ease, transform 0.3s ease', opacity: fadeOut ? 0 : 1, transform: fadeOut ? 'translateY(-6px)' : 'translateY(0)' }
        }, msg.t),

        // Barra de progresso
        h('div', { style: { width: '220px', height: '3px', background: 'rgba(124,58,237,0.1)', borderRadius: '2px', overflow: 'hidden' } },
          h('div', { style: { height: '100%', background: '#7c3aed', borderRadius: '2px', animation: 'rxBar 20s ease-out forwards' } })
        ),

        // Sub texto
        h('div', {
          style: { fontSize: '12px', color: '#8b8b9e', textAlign: 'center', transition: 'opacity 0.3s ease', opacity: fadeOut ? 0 : 1 }
        }, msg.sub)
      )
    );
  }

  // ══════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════
  function DashboardView({ fetchApi }) {
    var _s = useState(null), data = _s[0], setData = _s[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _p = useState(function() {
      var now = new Date();
      return { inicio: now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01', fim: now.toISOString().split('T')[0] };
    }), periodo = _p[0], setPeriodo = _p[1];

    var carregar = useCallback(async function() {
      setLoading(true);
      try { var res = await fetchApi('/cs/dashboard?data_inicio=' + periodo.inicio + '&data_fim=' + periodo.fim); if (res.success) setData(res); } catch (e) { console.error(e); }
      setLoading(false);
    }, [fetchApi, periodo]);
    useEffect(function() { carregar(); }, [carregar]);

    if (loading) return h('div', { className: 'p-6 space-y-6' }, h(Skeleton, { linhas: 8 }));
    if (!data) return h(EmptyState, { titulo: 'Erro ao carregar dashboard' });

    var kc = (data.kpis || {}).clientes || {}, ki = (data.kpis || {}).interacoes || {}, ko = (data.kpis || {}).ocorrencias || {}, kop = (data.kpis || {}).operacao || {};
    var clientes_risco = data.clientes_risco || [], interacoes_recentes = data.interacoes_recentes || [], distribuicao_health = data.distribuicao_health || [];

    return h('div', { className: 'space-y-6' },
      h('div', { className: 'flex flex-wrap items-center gap-3' },
        h('input', { type: 'date', value: periodo.inicio, onChange: function(e) { setPeriodo(function(p) { return Object.assign({}, p, { inicio: e.target.value }); }); }, className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
        h('span', { className: 'text-gray-400' }, 'até'),
        h('input', { type: 'date', value: periodo.fim, onChange: function(e) { setPeriodo(function(p) { return Object.assign({}, p, { fim: e.target.value }); }); }, className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm' }),
        h('button', { onClick: carregar, className: 'px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700' }, '🔄 Atualizar')
      ),
      h('div', null, h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3' }, '👥 Carteira de Clientes'),
        h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
          h(KpiCard, { titulo: 'Total de Clientes', valor: kc.total_clientes || 0, icone: '🏢', cor: 'blue' }),
          h(KpiCard, { titulo: 'Ativos', valor: kc.ativos || 0, icone: '✅', cor: 'green' }),
          h(KpiCard, { titulo: 'Em Risco', valor: kc.em_risco || 0, icone: '⚠️', cor: 'amber' }),
          h(KpiCard, { titulo: 'Health Score Médio', valor: (kc.health_score_medio || 0) + '/100', icone: '💚', cor: parseFloat(kc.health_score_medio) >= 60 ? 'green' : 'amber' })
        )
      ),
      h('div', null, h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3' }, '📦 Operação (BI)'),
        h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-4' },
          h(KpiCard, { titulo: 'Entregas', valor: parseInt(kop.total_entregas || 0).toLocaleString('pt-BR'), icone: '🚚', cor: 'blue' }),
          h(KpiCard, { titulo: 'Taxa de Prazo', valor: (kop.taxa_prazo_global || 0) + '%', icone: '⏱️', cor: parseFloat(kop.taxa_prazo_global) >= 85 ? 'green' : 'amber' }),
          h(KpiCard, { titulo: 'Faturamento', valor: formatCurrency(kop.faturamento_total), icone: '💰', cor: 'green' }),
          h(KpiCard, { titulo: 'Clientes Ativos BI', valor: kop.clientes_ativos_bi || 0, icone: '📊', cor: 'purple' }),
          h(KpiCard, { titulo: 'Tempo Médio', valor: (kop.tempo_medio_entrega || 0) + ' min', icone: '🕐', cor: 'gray' })
        )
      ),
      // Distribuição + Risco
      h('div', { className: 'grid md:grid-cols-2 gap-6' },
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
          h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4' }, '💚 Distribuição Health Score'),
          distribuicao_health.length > 0 ? h('div', { className: 'space-y-3' }, ...distribuicao_health.map(function(f, i) {
            return h('div', { key: i, className: 'flex items-center gap-3' },
              h('div', { className: 'w-3 h-3 rounded-full flex-shrink-0', style: { backgroundColor: f.cor } }),
              h('span', { className: 'text-sm text-gray-700 flex-1' }, f.faixa),
              h('span', { className: 'text-sm font-bold text-gray-900' }, f.quantidade),
              h('div', { className: 'w-24 h-2 bg-gray-100 rounded-full overflow-hidden' }, h('div', { className: 'h-full rounded-full', style: { width: Math.min(100, (parseInt(f.quantidade) / Math.max(1, parseInt(kc.total_clientes))) * 100) + '%', backgroundColor: f.cor } }))
            );
          })) : h('p', { className: 'text-gray-400 text-sm' }, 'Sem dados')
        ),
        h('div', { className: 'bg-white rounded-xl border border-red-100 p-5' },
          h('h3', { className: 'text-sm font-semibold text-red-500 uppercase tracking-wider mb-4' }, '⚠️ Clientes em Risco'),
          clientes_risco.length > 0 ? h('div', { className: 'space-y-3' }, ...clientes_risco.map(function(cli, i) {
            return h('div', { key: i, className: 'flex items-center gap-3 p-3 bg-red-50/50 rounded-lg' },
              h(HealthRing, { score: cli.health_score, size: 44 }),
              h('div', { className: 'flex-1 min-w-0' }, h('p', { className: 'text-sm font-medium text-gray-900 truncate' }, cli.nome_fantasia || 'Cliente ' + cli.cod_cliente), h('p', { className: 'text-xs text-gray-500' }, (cli.total_entregas_30d || 0) + ' ent · ' + (cli.taxa_prazo_30d || 0) + '% prazo')),
              h(Badge, { text: cli.status, cor: cli.status === 'em_risco' ? '#F59E0B' : '#EF4444' })
            );
          })) : h('p', { className: 'text-gray-400 text-sm text-center py-4' }, '🎉 Nenhum cliente em risco!')
        )
      ),
      // Interações recentes
      h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
        h('h3', { className: 'text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4' }, '🕐 Interações Recentes'),
        interacoes_recentes.length > 0 ? h('div', { className: 'divide-y divide-gray-100' }, ...interacoes_recentes.map(function(int, i) {
          return h('div', { key: i, className: 'flex items-center gap-3 py-3' },
            h('span', { className: 'text-lg' }, int.tipo === 'visita' ? '📍' : int.tipo === 'reuniao' ? '👥' : int.tipo === 'ligacao' ? '📞' : int.tipo === 'whatsapp' ? '💬' : '📝'),
            h('div', { className: 'flex-1 min-w-0' }, h('p', { className: 'text-sm font-medium text-gray-900 truncate' }, int.titulo), h('p', { className: 'text-xs text-gray-500' }, (int.nome_fantasia || 'Cliente') + ' · ' + (int.criado_por_nome || ''))),
            h('span', { className: 'text-xs text-gray-400 whitespace-nowrap' }, diasAtras(int.data_interacao))
          );
        })) : h('p', { className: 'text-gray-400 text-sm text-center py-4' }, 'Sem interações')
      )
    );
  }

  // ══════════════════════════════════════════════════
  // CLIENTES (v2 — filtros estilo BI com máscara + CC)
  // ══════════════════════════════════════════════════
  function ClientesView({ fetchApi, onSelectCliente }) {
    var _c = useState([]), clientes = _c[0], setClientes = _c[1];
    var _lo = useState(true), loading = _lo[0], setLoading = _lo[1];
    var _sy = useState(false), syncing = _sy[0], setSyncing = _sy[1];
    var _fd = useState(null), filtrosData = _fd[0], setFiltrosData = _fd[1];
    var _fl = useState(true), filtrosLoading = _fl[0], setFiltrosLoading = _fl[1];
    var _fc = useState(''), filtroCliente = _fc[0], setFiltroCliente = _fc[1];
    var _fcc = useState(''), filtroCentroCusto = _fcc[0], setFiltroCentroCusto = _fcc[1];
    var _fs = useState(''), filtroStatus = _fs[0], setFiltroStatus = _fs[1];
    var _bc = useState(''), buscaCliente = _bc[0], setBuscaCliente = _bc[1];
    var _do = useState(false), dropAberto = _do[0], setDropAberto = _do[1];
    var dropRef = useRef(null);

    // Carregar filtros (1 vez)
    useEffect(function() {
      (async function() {
        setFiltrosLoading(true);
        try { var res = await fetchApi('/cs/clientes/filtros'); if (res.success) setFiltrosData(res); } catch (e) { console.error(e); }
        setFiltrosLoading(false);
      })();
    }, [fetchApi]);

    // Fechar dropdown ao clicar fora
    useEffect(function() {
      var handler = function(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setDropAberto(false); };
      document.addEventListener('mousedown', handler);
      return function() { document.removeEventListener('mousedown', handler); };
    }, []);

    var getMascara = useCallback(function(cod) {
      if (!filtrosData || !filtrosData.mascaras) return null;
      return filtrosData.mascaras[String(cod)] || null;
    }, [filtrosData]);

    var getNome = useCallback(function(cod, fallback) {
      var m = getMascara(cod);
      return m || (fallback && fallback.trim()) || ('Cliente ' + cod);
    }, [getMascara]);

    var centrosCusto = useMemo(function() {
      if (!filtroCliente || !filtrosData || !filtrosData.cliente_centros) return [];
      return filtrosData.cliente_centros[String(filtroCliente)] || [];
    }, [filtroCliente, filtrosData]);

    var clientesFiltrados = useMemo(function() {
      if (!filtrosData || !filtrosData.clientes) return [];
      var lista = filtrosData.clientes;
      if (!buscaCliente) return lista;
      var termo = buscaCliente.toLowerCase();
      return lista.filter(function(c) {
        var cod = String(c.cod_cliente);
        var nome = (getMascara(c.cod_cliente) || c.nome_fantasia || c.nome_cliente || '').toLowerCase();
        return cod.includes(termo) || nome.includes(termo);
      });
    }, [filtrosData, buscaCliente, getMascara]);

    var carregar = useCallback(async function() {
      setLoading(true);
      try {
        var params = new URLSearchParams({ limit: '200' });
        if (filtroCliente) params.set('cod_cliente', filtroCliente);
        if (filtroCentroCusto) params.set('centro_custo', filtroCentroCusto);
        if (filtroStatus) params.set('status', filtroStatus);
        var res = await fetchApi('/cs/clientes?' + params);
        if (res.success) setClientes(res.clientes || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [fetchApi, filtroCliente, filtroCentroCusto, filtroStatus]);

    useEffect(function() { carregar(); }, [carregar]);

    var selCliente = function(cod) {
      setFiltroCliente(cod ? String(cod) : '');
      setFiltroCentroCusto('');
      setBuscaCliente('');
      setDropAberto(false);
    };

    var syncBi = async function() {
      setSyncing(true);
      try { var res = await fetchApi('/cs/clientes/sync-bi', { method: 'POST' }); if (res.success) { alert('✅ ' + res.importados + ' clientes sincronizados!'); carregar(); } } catch (e) { alert('Erro'); }
      setSyncing(false);
    };

    var filtroLabel = filtroCliente ? getNome(filtroCliente, (filtrosData && filtrosData.clientes || []).find(function(c) { return String(c.cod_cliente) === String(filtroCliente); })?.nome_fantasia) : null;

    return h('div', { className: 'space-y-4' },

      // ═══ BARRA DE FILTROS ═══
      h('div', { className: 'bg-white rounded-xl border border-gray-200 p-4 space-y-3' },
        // Chips ativos
        h('div', { className: 'flex items-center gap-2 flex-wrap min-h-[28px]' },
          h('span', { className: 'text-sm font-semibold text-gray-700' }, '🔍 Filtros'),
          filtroLabel && h('span', { className: 'inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium cursor-pointer hover:bg-purple-200', onClick: function() { selCliente(''); } }, '🏢 ' + filtroCliente + ' - ' + filtroLabel, h('span', { className: 'ml-1 opacity-60' }, '✕')),
          filtroCentroCusto && h('span', { className: 'inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium cursor-pointer hover:bg-blue-200', onClick: function() { setFiltroCentroCusto(''); } }, '📁 ' + filtroCentroCusto, h('span', { className: 'ml-1 opacity-60' }, '✕')),
          filtroStatus && h('span', { className: 'inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium cursor-pointer hover:bg-amber-200', onClick: function() { setFiltroStatus(''); } }, filtroStatus, h('span', { className: 'ml-1 opacity-60' }, '✕')),
          (filtroCliente || filtroCentroCusto || filtroStatus) && h('button', { className: 'text-xs text-gray-400 hover:text-red-500 ml-auto', onClick: function() { setFiltroCliente(''); setFiltroCentroCusto(''); setFiltroStatus(''); } }, '🗑️ Limpar filtros')
        ),

        // Campos
        h('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-3' },
          // 1. Cliente (searchable dropdown)
          h('div', { className: 'md:col-span-2 relative', ref: dropRef },
            h('label', { className: 'block text-xs font-medium text-gray-500 mb-1' }, '🏢 Cliente'),
            h('div', { className: 'relative' },
              h('input', {
                type: 'text',
                placeholder: filtroCliente ? (filtroCliente + ' - ' + filtroLabel) : 'Todos os clientes...',
                value: dropAberto ? buscaCliente : (filtroCliente ? (filtroCliente + ' - ' + filtroLabel) : ''),
                onChange: function(e) { setBuscaCliente(e.target.value); setDropAberto(true); },
                onFocus: function() { setDropAberto(true); },
                className: 'w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-8 ' + (filtroCliente ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200')
              }),
              h('span', { className: 'absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none' }, dropAberto ? '▲' : '▼')
            ),
            dropAberto && h('div', { className: 'absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto' },
              h('div', { className: 'px-3 py-2.5 text-sm cursor-pointer hover:bg-purple-50 ' + (!filtroCliente ? 'bg-purple-50 font-semibold text-purple-700' : 'text-gray-700'), onClick: function() { selCliente(''); } }, 'Todos os clientes'),
              filtrosLoading ? h('div', { className: 'px-3 py-4 text-sm text-gray-400 text-center' }, '⏳ Carregando...') :
              clientesFiltrados.length === 0 ? h('div', { className: 'px-3 py-4 text-sm text-gray-400 text-center' }, 'Nenhum resultado') :
              clientesFiltrados.map(function(c) {
                var cod = String(c.cod_cliente), nome = getNome(c.cod_cliente, c.nome_fantasia || c.nome_cliente);
                var cs = filtrosData.cs_status[cod];
                var temCC = filtrosData.cliente_centros[cod] && filtrosData.cliente_centros[cod].length > 0;
                var sel = cod === String(filtroCliente);
                return h('div', { key: cod, className: 'px-3 py-2.5 cursor-pointer hover:bg-purple-50 flex items-center gap-2 ' + (sel ? 'bg-purple-50' : ''), onClick: function() { selCliente(cod); } },
                  cs && h('div', { className: 'w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold flex-shrink-0', style: { borderColor: (cs.health_score || 0) >= 70 ? '#10B981' : (cs.health_score || 0) >= 40 ? '#F59E0B' : '#EF4444', color: (cs.health_score || 0) >= 70 ? '#10B981' : (cs.health_score || 0) >= 40 ? '#F59E0B' : '#EF4444' } }, cs.health_score || 0),
                  h('div', { className: 'flex-1 min-w-0' },
                    h('p', { className: 'text-sm truncate ' + (sel ? 'font-semibold text-purple-700' : 'text-gray-800') }, cod + ' - ' + nome),
                    h('p', { className: 'text-[10px] text-gray-400' }, (c.total_entregas || 0) + ' entregas' + (temCC ? ' · ' + filtrosData.cliente_centros[cod].length + ' CC' : ''))
                  ),
                  sel && h('span', { className: 'text-purple-600 text-xs' }, '✓')
                );
              })
            )
          ),

          // 2. Centro de Custo
          h('div', null,
            h('label', { className: 'block text-xs font-medium text-gray-500 mb-1' }, '📁 Centro de Custo'),
            h('select', {
              value: filtroCentroCusto,
              onChange: function(e) { setFiltroCentroCusto(e.target.value); },
              disabled: !filtroCliente || centrosCusto.length === 0,
              className: 'w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 ' + (!filtroCliente ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : filtroCentroCusto ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200')
            },
              h('option', { value: '' }, filtroCliente ? (centrosCusto.length === 0 ? 'Sem centros de custo' : 'Todos (' + centrosCusto.length + ' centros)') : 'Selecione um cliente'),
              centrosCusto.map(function(cc) { return h('option', { key: cc, value: cc }, cc); })
            )
          ),

          // 3. Status
          h('div', null,
            h('label', { className: 'block text-xs font-medium text-gray-500 mb-1' }, '📊 Status'),
            h('select', { value: filtroStatus, onChange: function(e) { setFiltroStatus(e.target.value); }, className: 'w-full px-3 py-2.5 border rounded-lg text-sm ' + (filtroStatus ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200') },
              h('option', { value: '' }, 'Todos os status'),
              h('option', { value: 'ativo' }, '✅ Ativo'),
              h('option', { value: 'em_risco' }, '⚠️ Em Risco'),
              h('option', { value: 'inativo' }, '🔴 Inativo'),
              h('option', { value: 'churned' }, '⚫ Churned')
            )
          )
        )
      ),

      // Toolbar
      h('div', { className: 'flex items-center justify-between' },
        h('p', { className: 'text-sm text-gray-500' }, loading ? '⏳ Carregando...' : clientes.length + ' cliente' + (clientes.length !== 1 ? 's' : '') + ' encontrado' + (clientes.length !== 1 ? 's' : '')),
        h('button', { onClick: syncBi, disabled: syncing, className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5' }, syncing ? '⏳ Sincronizando...' : '📥 Sync BI')
      ),

      // Lista (grid 2 colunas em desktop)
      loading ? h(Skeleton, { linhas: 6 }) :
      clientes.length === 0 ? h(EmptyState, { titulo: 'Nenhum cliente encontrado', descricao: filtroCliente ? 'Este cliente não foi sincronizado. Clique em "Sync BI".' : 'Clique em "Sync BI" para importar.', icone: '🏢' }) :
      h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-3' },
        ...clientes.map(function(cli) {
          var cod = cli.cod_cliente, nome = getNome(cod, cli.nome_fantasia);
          var temCC = filtrosData && filtrosData.cliente_centros[String(cod)] && filtrosData.cliente_centros[String(cod)].length > 0;
          return h('div', { key: cod, onClick: function() { onSelectCliente(cod, filtroCentroCusto || null); }, className: 'bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer group' },
            h('div', { className: 'flex items-center gap-3' },
              h(HealthRing, { score: cli.health_score, size: 48 }),
              h('div', { className: 'flex-1 min-w-0' },
                h('div', { className: 'flex items-center gap-2 mb-0.5' },
                  h('h4', { className: 'font-semibold text-gray-900 truncate group-hover:text-purple-700 transition-colors' }, nome),
                  h('span', { className: 'text-xs text-gray-400 flex-shrink-0' }, '#' + cod)
                ),
                h('div', { className: 'flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500' },
                  h('span', null, '🚚 ' + parseInt(cli.total_entregas_30d || 0).toLocaleString('pt-BR')),
                  h('span', { className: parseFloat(cli.taxa_prazo_30d) >= 90 ? 'text-emerald-600 font-medium' : parseFloat(cli.taxa_prazo_30d) < 80 ? 'text-red-600 font-medium' : '' }, '⏱️ ' + (cli.taxa_prazo_30d || 0) + '%'),
                  h('span', null, '💰 ' + formatCurrency(cli.valor_total_30d)),
                  temCC && h('span', { className: 'text-blue-500' }, '📁 ' + filtrosData.cliente_centros[String(cod)].length + ' CC'),
                  cli.ocorrencias_abertas > 0 && h('span', { className: 'text-red-500 font-medium' }, '🚨 ' + cli.ocorrencias_abertas)
                )
              ),
              h('div', { className: 'flex flex-col items-end gap-1 flex-shrink-0' },
                h(Badge, { text: cli.status || 'ativo', cor: cli.status === 'ativo' ? '#10B981' : cli.status === 'em_risco' ? '#F59E0B' : cli.status === 'inativo' ? '#EF4444' : '#6B7280' }),
                cli.ultima_entrega && h('span', { className: 'text-[10px] text-gray-400' }, diasAtras(cli.ultima_entrega))
              )
            )
          );
        })
      )
    );
  }

  // ══════════════════════════════════════════════════
  // DETALHE DO CLIENTE (com centro de custo + Raio-X)
  // ══════════════════════════════════════════════════
  function ClienteDetalheView({ codCliente, centroCustoInicial, fetchApi, apiUrl, getToken, onVoltar }) {
    var _d = useState(null), data = _d[0], setData = _d[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _rl = useState(false), raioXLoading = _rl[0], setRaioXLoading = _rl[1];
    var _rr = useState(null), raioXResult = _rr[0], setRaioXResult = _rr[1];
    var _re = useState(false), raioXEditando = _re[0], setRaioXEditando = _re[1];
    var _rs = useState(false), raioXSalvando = _rs[0], setRaioXSalvando = _rs[1];
    var _rev = useState(false), raioXEnviandoEmail = _rev[0], setRaioXEnviandoEmail = _rev[1];
    var _sem = useState(false), showEmailModal = _sem[0], setShowEmailModal = _sem[1];
    var _emf = useState({ para: '', cc: '', assunto: '' }), emailForm = _emf[0], setEmailForm = _emf[1];
    var _ems = useState(null), emailStatus = _ems[0], setEmailStatus = _ems[1];
    var _emi = useState(''), emailMessageId = _emi[0], setEmailMessageId = _emi[1];
    var _eme = useState(''), emailError = _eme[0], setEmailError = _eme[1];
    // Relatório Cliente (derivado do raio-x interno)
    var _rcr = useState(null), raioXClienteResult = _rcr[0], setRaioXClienteResult = _rcr[1];
    var _rcg = useState(false), raioXClienteGerando = _rcg[0], setRaioXClienteGerando = _rcg[1];
    // Tab ativa quando há os dois relatórios: 'interno' | 'cliente'
    var _rxt = useState('interno'), raioXTab = _rxt[0], setRaioXTab = _rxt[1];
    var raioXEditRef = useRef(null);
    var _si = useState(false), showNovaInteracao = _si[0], setShowNovaInteracao = _si[1];
    var _so = useState(false), showNovaOcorrencia = _so[0], setShowNovaOcorrencia = _so[1];
    var _if = useState({ tipo: 'ligacao', titulo: '', descricao: '', resultado: '', proxima_acao: '', centro_custo: '' }), interacaoForm = _if[0], setInteracaoForm = _if[1];
    var _of = useState({ tipo: 'problema_entrega', titulo: '', descricao: '', severidade: 'media', centro_custo: '' }), ocorrenciaForm = _of[0], setOcorrenciaForm = _of[1];
    var _cs = useState(centroCustoInicial || ''), centroSel = _cs[0], setCentroSel = _cs[1];
    var _cat = useState([]), categoriasSel = _cat[0], setCategoriasSel = _cat[1];
    var _cats = useState([]), categoriasDisp = _cats[0], setCategoriasDisp = _cats[1];
    var _catDrop = useState(false), catDropAberto = _catDrop[0], setCatDropAberto = _catDrop[1];
    var _pr = useState(function() {
      var now = new Date();
      return { inicio: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0], fim: now.toISOString().split('T')[0] };
    }), periodo = _pr[0], setPeriodo = _pr[1];

    // Carregar categorias disponíveis para o cliente
    useEffect(function() {
      (async function() {
        try {
          var res = await fetchApi('/bi/filtros-iniciais');
          if (res.categorias && res.categorias.length > 0) setCategoriasDisp(res.categorias);
        } catch (e) { console.warn('Categorias não disponíveis:', e.message); }
      })();
    }, [fetchApi]);

    var carregar = useCallback(async function() {
      setLoading(true);
      try {
        var params = new URLSearchParams();
        if (centroSel) params.set('centro_custo', centroSel);
        if (periodo.inicio) params.set('data_inicio', periodo.inicio);
        if (periodo.fim) params.set('data_fim', periodo.fim);
        if (categoriasSel && categoriasSel.length > 0) params.set('categorias', categoriasSel.join(','));
        var qs = params.toString() ? '?' + params : '';
        var res = await fetchApi('/cs/clientes/' + codCliente + qs);
        if (res.success) setData(res);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [fetchApi, codCliente, centroSel, periodo, categoriasSel]);
    useEffect(function() { carregar(); }, [carregar]);

    var gerarRaioX = async function() {
      setRaioXLoading(true);
      try {
        var body = { cod_cliente: codCliente, data_inicio: periodo.inicio, data_fim: periodo.fim };
        if (centroSel) body.centro_custo = centroSel;
        if (categoriasSel && categoriasSel.length > 0) body.categorias = categoriasSel;
        console.log('🔬 Raio-X body:', JSON.stringify(body));
        var res = await fetchApi('/cs/raio-x', { method: 'POST', body: JSON.stringify(body) });
        if (res.success) setRaioXResult(res.raio_x); else alert('Erro: ' + (res.error || 'Falha'));
      } catch (e) { alert('Erro ao gerar Raio-X'); console.error(e); }
      setRaioXLoading(false);
    };
    var salvarInteracao = async function() {
      try {
        var res = await fetchApi('/cs/interacoes', { method: 'POST', body: JSON.stringify(Object.assign({}, interacaoForm, { cod_cliente: codCliente })) });
        if (res.success) { setShowNovaInteracao(false); setInteracaoForm({ tipo: 'ligacao', titulo: '', descricao: '', resultado: '', proxima_acao: '', centro_custo: '' }); carregar(); }
      } catch (e) { alert('Erro ao salvar'); }
    };
    var salvarOcorrencia = async function() {
      try {
        var res = await fetchApi('/cs/ocorrencias', { method: 'POST', body: JSON.stringify(Object.assign({}, ocorrenciaForm, { cod_cliente: codCliente })) });
        if (res.success) { setShowNovaOcorrencia(false); setOcorrenciaForm({ tipo: 'problema_entrega', titulo: '', descricao: '', severidade: 'media', centro_custo: '' }); carregar(); }
      } catch (e) { alert('Erro ao salvar'); }
    };

    var toggleEditarRaioX = function() {
      if (raioXEditando) {
        // Cancelar edição
        setRaioXEditando(false);
      } else {
        setRaioXEditando(true);
      }
    };

    // Quando entra em modo edição, popula o ref com o HTML renderizado
    useEffect(function() {
      if (raioXEditando && raioXEditRef.current && raioXResult) {
        raioXEditRef.current.innerHTML = renderMarkdown(raioXResult.analise);
        // Focar no elemento
        raioXEditRef.current.focus();
      }
    }, [raioXEditando]);

    var salvarEdicaoRaioX = async function() {
      if (!raioXResult || !raioXResult.id || !raioXEditRef.current) return;
      setRaioXSalvando(true);
      try {
        var novoTexto = raioXEditRef.current.innerHTML;
        var res = await fetchApi('/cs/raio-x/' + raioXResult.id, {
          method: 'PUT',
          body: JSON.stringify({ analise_texto: novoTexto })
        });
        if (res.success) {
          setRaioXResult(Object.assign({}, raioXResult, { analise: novoTexto }));
          setRaioXEditando(false);
          alert('✅ Relatório salvo com sucesso!');
        } else {
          alert('Erro: ' + (res.error || 'Falha ao salvar'));
        }
      } catch (e) { alert('Erro ao salvar edição'); console.error(e); }
      setRaioXSalvando(false);
    };

    // Gera a Versão Cliente a partir do raio-x interno atual
    var gerarRaioXCliente = async function() {
      if (!raioXResult || !raioXResult.id) {
        alert('⚠️ Gere e salve o Raio-X interno antes de criar a versão cliente');
        return;
      }
      setRaioXClienteGerando(true);
      try {
        var res = await fetchApi('/cs/raio-x/cliente', {
          method: 'POST',
          body: JSON.stringify({ raio_x_id: raioXResult.id })
        });
        if (res.success && res.raio_x_cliente) {
          setRaioXClienteResult(res.raio_x_cliente);
          setRaioXTab('cliente');
        } else {
          alert('❌ Erro ao gerar versão cliente:\n\n' + (res.error || 'Falha desconhecida'));
        }
      } catch (e) {
        console.error(e);
        alert('❌ Erro ao gerar versão cliente:\n\n' + (e.message || 'Falha de rede'));
      }
      setRaioXClienteGerando(false);
    };

    // Abre o modal de envio de email (só a partir da versão cliente)
    var abrirModalEmail = function() {
      if (!raioXClienteResult || !raioXClienteResult.id) {
        alert('⚠️ Gere a versão cliente do relatório antes de enviar por email');
        return;
      }
      var emailSugerido = (data.ficha && (data.ficha.email_contato || data.ficha.email)) || '';
      var nomeCliente = (data.ficha && (data.ficha.mascara || data.ficha.nome_fantasia || data.ficha.nome)) || 'Cliente';
      var fmt = function(iso) {
        if (!iso) return '';
        var partes = String(iso).split('-');
        return partes.length === 3 ? (partes[2] + '/' + partes[1] + '/' + partes[0]) : iso;
      };
      var assuntoPadrao = 'Relatório Operacional - ' + nomeCliente + ' (' + fmt(periodo.inicio) + ' a ' + fmt(periodo.fim) + ')';
      setEmailForm({ para: emailSugerido, cc: '', assunto: assuntoPadrao });
      setEmailStatus(null);
      setEmailMessageId('');
      setEmailError('');
      setShowEmailModal(true);
    };

    var fecharModalEmail = function() {
      if (emailStatus === 'sending') return;
      setShowEmailModal(false);
      setTimeout(function() {
        setEmailStatus(null);
        setEmailMessageId('');
        setEmailError('');
      }, 300);
    };

    var enviarEmailRaioX = async function() {
      var para = (emailForm.para || '').trim();
      if (!para) { setEmailError('Informe o email do destinatário'); setEmailStatus('error'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) { setEmailError('Email do destinatário inválido'); setEmailStatus('error'); return; }
      var cc = (emailForm.cc || '').trim();
      if (cc) {
        var ccList = cc.split(/[;,]/).map(function(e) { return e.trim(); }).filter(Boolean);
        var ccInvalido = ccList.find(function(e) { return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); });
        if (ccInvalido) { setEmailError('CC inválido: ' + ccInvalido); setEmailStatus('error'); return; }
      }
      var assunto = (emailForm.assunto || '').trim();

      setEmailError('');
      setEmailStatus('sending');
      setRaioXEnviandoEmail(true);
      try {
        // IMPORTANTE: envia usando o ID do relatório CLIENTE, não do interno
        var body = { raio_x_id: raioXClienteResult.id, para: para };
        if (cc) body.cc = cc;
        if (assunto) body.assunto = assunto;
        var res = await fetchApi('/cs/raio-x/enviar-email', {
          method: 'POST',
          body: JSON.stringify(body)
        });
        if (res.success) {
          setEmailMessageId(res.messageId || '');
          setEmailStatus('success');
          setRaioXEnviandoEmail(false);
          setTimeout(function() {
            setShowEmailModal(false);
            setTimeout(function() {
              setEmailStatus(null);
              setEmailMessageId('');
            }, 300);
          }, 2200);
        } else {
          setEmailError(res.error || 'Falha desconhecida ao enviar');
          setEmailStatus('error');
          setRaioXEnviandoEmail(false);
        }
      } catch (e) {
        console.error(e);
        setEmailError((e && e.message) || 'Falha de rede');
        setEmailStatus('error');
        setRaioXEnviandoEmail(false);
      }
    };

    if (loading) return h('div', { className: 'p-6' }, h(Skeleton, { linhas: 10 }));
    if (!data) return h(EmptyState, { titulo: 'Cliente não encontrado' });

    var ficha = data.ficha, m = data.metricas_bi || {}, diag = data.diagnostico || {}, interacoes = data.interacoes || [], ocorrencias = data.ocorrencias || [], raio_x_historico = data.raio_x_historico || [], centrosDisp = data.centros_custo || [];
    var cor = getHealthCor(diag.health_score);

    return h('div', { className: 'space-y-6' },
      // Header
      h('div', { className: 'flex items-center gap-4' },
        h('button', { onClick: onVoltar, className: 'p-2 hover:bg-gray-100 rounded-lg' }, '← Voltar'),
        h('div', { className: 'flex-1' },
          h('h2', { className: 'text-xl font-bold text-gray-900' }, ficha.mascara || ficha.nome_fantasia || 'Cliente ' + codCliente),
          h('p', { className: 'text-sm text-gray-500' }, 'Cód: ' + codCliente + ' · ' + (ficha.segmento || 'Autopeças'))
        ),
        h(HealthRing, { score: diag.health_score, size: 64 }),
        h('div', { className: 'text-right' },
          h('p', { className: 'text-lg font-bold ' + cor.text }, getHealthLabel(diag.health_score)),
          h('p', { className: 'text-xs text-gray-400' }, diag.dias_sem_entrega < 999 ? diag.dias_sem_entrega + 'd sem entrega' : 'Sem entregas')
        )
      ),

      // Filtros: Período + Centro de Custo
      h('div', { className: 'bg-white rounded-xl border border-gray-200 p-4' },
        h('div', { className: 'flex flex-wrap items-center gap-3' },
          h('span', { className: 'text-sm font-semibold text-gray-700' }, '🔍 Filtros'),
          // Período
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-xs text-gray-500' }, '📅'),
            h('input', { type: 'date', value: periodo.inicio, onChange: function(e) { setPeriodo(function(p) { return Object.assign({}, p, { inicio: e.target.value }); }); }, className: 'px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500' }),
            h('span', { className: 'text-gray-400 text-xs' }, 'até'),
            h('input', { type: 'date', value: periodo.fim, onChange: function(e) { setPeriodo(function(p) { return Object.assign({}, p, { fim: e.target.value }); }); }, className: 'px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500' })
          ),
          // Centro de Custo (se houver)
          centrosDisp.length > 0 && h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-xs text-gray-500' }, '📁'),
            h('select', { value: centroSel, onChange: function(e) { setCentroSel(e.target.value); }, className: 'px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500' },
              h('option', { value: '' }, 'Todos os centros de custo'),
              centrosDisp.map(function(cc) { return h('option', { key: cc.centro_custo, value: cc.centro_custo }, cc.centro_custo); })
            ),
            centroSel && h('button', { onClick: function() { setCentroSel(''); }, className: 'text-xs text-gray-400 hover:text-red-500' }, '✕')
          ),
          // Categoria / Veículo (multi-select checkboxes)
          categoriasDisp.length > 0 && h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-xs text-gray-500' }, '🏷️'),
            h('div', { className: 'relative' },
              h('button', {
                onClick: function() { setCatDropAberto(function(v) { return !v; }); },
                className: 'px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 flex items-center gap-1 min-w-[160px]'
              }, categoriasSel.length > 0 ? categoriasSel.length + ' categoria' + (categoriasSel.length > 1 ? 's' : '') : 'Todas as categorias', h('span', { className: 'ml-auto text-gray-400 text-xs' }, catDropAberto ? '▲' : '▼')),
              catDropAberto && h('div', {
                style: { position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: '4px', width: '240px', maxHeight: '220px', overflowY: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '6px 0' }
              },
                categoriasDisp.map(function(cat) {
                  var checked = categoriasSel.indexOf(cat) !== -1;
                  return h('label', { key: cat, className: 'flex items-center gap-2 px-3 py-1.5 hover:bg-purple-50 cursor-pointer text-sm', style: { display: 'flex' } },
                    h('input', {
                      type: 'checkbox',
                      checked: checked,
                      onChange: function() {
                        setCategoriasSel(function(prev) {
                          return checked ? prev.filter(function(c) { return c !== cat; }) : prev.concat([cat]);
                        });
                      },
                      className: 'accent-purple-600'
                    }),
                    h('span', { className: checked ? 'text-purple-700 font-medium' : 'text-gray-700' }, cat)
                  );
                })
              )
            ),
            categoriasSel.length > 0 && h('button', { onClick: function() { setCategoriasSel([]); }, className: 'text-xs text-gray-400 hover:text-red-500' }, '✕')
          ),
          // Chips
          periodo.inicio && h('span', { className: 'text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full' }, formatDate(periodo.inicio) + ' a ' + formatDate(periodo.fim)),
          centroSel && h('span', { className: 'text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full' }, '📁 ' + centroSel),
          categoriasSel.length > 0 && categoriasSel.map(function(cat) {
            return h('span', { key: cat, className: 'text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full cursor-pointer hover:bg-yellow-200', onClick: function() { setCategoriasSel(function(p) { return p.filter(function(c) { return c !== cat; }); }); } }, '🏷️ ' + cat + ' ✕');
          })
        )
      ),

      // KPIs
      h('div', { className: 'grid grid-cols-2 md:grid-cols-6 gap-3' },
        h(KpiCard, { titulo: 'Entregas', valor: parseInt(m.total_entregas || 0).toLocaleString(), icone: '🚚', cor: 'blue' }),
        h(KpiCard, { titulo: 'Taxa Prazo', valor: (m.taxa_prazo || 0) + '%', icone: '⏱️', cor: parseFloat(m.taxa_prazo) >= 85 ? 'green' : 'amber' }),
        h(KpiCard, { titulo: 'Faturamento', valor: formatCurrency(m.valor_total), icone: '💰', cor: 'green' }),
        h(KpiCard, { titulo: 'Tempo Médio', valor: (m.tempo_medio || 0) + 'min', icone: '🕐', cor: 'gray' }),
        h(KpiCard, { titulo: 'Profissionais', valor: m.profissionais_unicos || 0, icone: '🏍️', cor: 'purple' }),
        h(KpiCard, { titulo: 'Retornos', valor: m.total_retornos || 0, icone: '🔄', cor: parseInt(m.total_retornos) > 5 ? 'red' : 'gray' })
      ),

      // Ações
      h('div', { className: 'flex flex-wrap gap-2' },
        h('button', { onClick: function() { setShowNovaInteracao(true); }, className: 'px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700' }, '📝 Nova Interação'),
        h('button', { onClick: function() { setShowNovaOcorrencia(true); }, className: 'px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700' }, '🚨 Nova Ocorrência'),
        h('div', { className: 'flex-1' }),
        !raioXLoading && h('button', { onClick: gerarRaioX, className: 'px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-bold hover:from-purple-700 hover:to-indigo-700 shadow-lg' }, '🔬 Raio-X IA')
      ),

      // Raio-X Loading Animation
      raioXLoading && h(RaioXLoadingOverlay),

      // Raio-X result
      raioXResult && h('div', { className: 'bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6 shadow-inner' },
        h('div', { className: 'flex items-center gap-2 mb-4 flex-wrap' },
          h('span', { className: 'text-2xl' }, '🔬'), h('h3', { className: 'text-lg font-bold text-indigo-900' }, 'Raio-X Inteligente'),
          // Botão Editar / Cancelar
          raioXResult.id && h('button', {
            className: 'ml-2 px-4 py-1.5 rounded-lg text-xs font-bold shadow-md ' + (raioXEditando ? 'bg-gray-500 text-white' : 'bg-amber-500 text-white hover:bg-amber-600'),
            onClick: toggleEditarRaioX
          }, raioXEditando ? '✕ Cancelar Edição' : '✏️ Editar Relatório'),
          // Botão Salvar (só aparece em modo edição)
          raioXEditando && raioXResult.id && h('button', {
            className: 'px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-emerald-700 disabled:opacity-50',
            onClick: salvarEdicaoRaioX,
            disabled: raioXSalvando
          }, raioXSalvando ? '⏳ Salvando...' : '💾 Salvar Alterações'),
          // Botão Baixar PDF Relatório (texto editável — reflete edições) — PRINCIPAL
          raioXResult.id && h('button', { className: 'ml-2 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-md', onClick: function() {
            var token = getToken(), url = apiUrl + '/cs/raio-x/pdf-texto/' + raioXResult.id;
            fetch(url, { headers: { Authorization: 'Bearer ' + token }, credentials: 'include' })
              .then(function(r) { if (!r.ok) throw new Error('Erro'); return r.blob(); })
              .then(function(blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'RaioX_Relatorio_' + codCliente + '.pdf'; a.click(); URL.revokeObjectURL(a.href); })
              .catch(function(e) { alert('Erro: ' + e.message); });
          } }, '📝 Baixar PDF'),
          // Botão Baixar PDF Apresentação (slides visuais — dados brutos) — SECUNDÁRIO
          raioXResult.id && h('button', { className: 'ml-1 px-3 py-1.5 border border-purple-300 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-50', onClick: function() {
            var token = getToken(), url = apiUrl + '/cs/raio-x/pdf/' + raioXResult.id;
            fetch(url, { headers: { Authorization: 'Bearer ' + token }, credentials: 'include' })
              .then(function(r) { if (!r.ok) throw new Error('Erro'); return r.blob(); })
              .then(function(blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'RaioX_Apresentacao_' + codCliente + '.pdf'; a.click(); URL.revokeObjectURL(a.href); })
              .catch(function(e) { alert('Erro: ' + e.message); });
          } }, '📊 Apresentação'),
          // Botão Gerar Versão Cliente (novo)
          raioXResult.id && h('button', {
            className: 'ml-1 px-3 py-1.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white rounded-lg text-xs font-bold shadow-md hover:from-fuchsia-700 hover:to-pink-700 disabled:opacity-50',
            onClick: gerarRaioXCliente,
            disabled: raioXClienteGerando,
            title: 'Gera um relatório voltado ao cliente, com textos corporativos e visual polido'
          }, raioXClienteGerando ? '⏳ Gerando...' : (raioXClienteResult ? '🔄 Regerar Cliente' : '👔 Gerar Versão Cliente')),
          // Botão Enviar por Email (só habilitado quando existe versão cliente)
          raioXResult.id && h('button', {
            className: 'ml-1 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs font-bold shadow-md hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed',
            onClick: abrirModalEmail,
            disabled: raioXEnviandoEmail || !raioXClienteResult,
            title: raioXClienteResult ? 'Enviar relatório cliente por email' : 'Gere a versão cliente primeiro'
          }, raioXEnviandoEmail ? '⏳ Enviando...' : '📧 Enviar por Email'),
          h('span', { className: 'text-xs text-indigo-400 ml-auto' }, 'Gerado ' + formatDateTime(raioXResult.gerado_em) + ' · ' + raioXResult.tokens + ' tokens')
        ),
        // Tabs: Interno ↔ Cliente (só aparecem se ambos existem)
        raioXClienteResult && h('div', { className: 'mb-3 inline-flex rounded-lg border border-gray-200 bg-white p-1' },
          h('button', {
            onClick: function() { setRaioXTab('interno'); },
            className: 'px-4 py-1.5 rounded-md text-xs font-bold transition ' + (raioXTab === 'interno' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700')
          }, '🔬 Interno'),
          h('button', {
            onClick: function() { setRaioXTab('cliente'); },
            className: 'px-4 py-1.5 rounded-md text-xs font-bold transition ' + (raioXTab === 'cliente' ? 'bg-fuchsia-600 text-white shadow' : 'text-gray-500 hover:text-gray-700')
          }, '👔 Versão Cliente'),
          h('span', { className: 'text-xs text-gray-400 px-3 flex items-center' }, raioXTab === 'cliente' ? (raioXClienteResult.tokens + ' tokens · gerado ' + formatDateTime(raioXClienteResult.gerado_em)) : '')
        ),
        // Aviso de modo edição
        raioXEditando && h('div', { className: 'mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2' },
          h('span', { className: 'text-amber-600 text-sm' }, '✏️'),
          h('span', { className: 'text-amber-800 text-sm font-medium' }, 'Modo de edição ativo — edite o texto abaixo e clique em "Salvar Alterações".')
        ),
        // Conteúdo: tab interno renderiza o raio-x interno normal; tab cliente renderiza o HTML do relatório cliente
        raioXTab === 'cliente' && raioXClienteResult
          ? h('div', {
              className: 'max-w-none border border-gray-200 rounded-lg overflow-hidden bg-white',
              style: { minHeight: '400px' },
              dangerouslySetInnerHTML: { __html: raioXClienteResult.html || '<div style="padding:40px;text-align:center;color:#94a3b8">Relatório cliente sem conteúdo</div>' }
            })
          : raioXEditando
            ? h('div', {
                ref: raioXEditRef,
                className: 'prose prose-sm prose-indigo max-w-none outline-none ring-2 ring-amber-300 rounded-lg p-3 bg-white min-h-[200px]',
                contentEditable: 'true',
                suppressContentEditableWarning: true
              })
            : h('div', {
                className: 'prose prose-sm prose-indigo max-w-none',
                dangerouslySetInnerHTML: { __html: renderMarkdown(raioXResult.analise) }
              })
      ),

      // Interações + Ocorrências
      h('div', { className: 'grid md:grid-cols-2 gap-6' },
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
          h('h3', { className: 'font-semibold text-gray-700 mb-4' }, '📝 Últimas Interações'),
          interacoes.length > 0 ? h('div', { className: 'space-y-3' }, ...interacoes.map(function(int, i) {
            return h('div', { key: i, className: 'flex gap-3 p-3 bg-gray-50 rounded-lg' },
              h('span', { className: 'text-lg mt-0.5' }, int.tipo === 'visita' ? '📍' : int.tipo === 'reuniao' ? '👥' : int.tipo === 'ligacao' ? '📞' : int.tipo === 'whatsapp' ? '💬' : int.tipo === 'pos_venda' ? '✅' : '📝'),
              h('div', { className: 'flex-1 min-w-0' }, h('p', { className: 'text-sm font-medium text-gray-900' }, int.titulo), int.descricao && h('p', { className: 'text-xs text-gray-500 mt-1 line-clamp-2' }, int.descricao), h('p', { className: 'text-xs text-gray-400 mt-1' }, formatDateTime(int.data_interacao) + ' · ' + (int.criado_por_nome || '')))
            );
          })) : h('p', { className: 'text-sm text-gray-400 text-center py-4' }, 'Nenhuma interação')
        ),
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
          h('h3', { className: 'font-semibold text-gray-700 mb-4' }, '🚨 Ocorrências Abertas'),
          ocorrencias.length > 0 ? h('div', { className: 'space-y-3' }, ...ocorrencias.map(function(oc, i) {
            return h('div', { key: i, className: 'flex gap-3 p-3 rounded-lg ' + (oc.severidade === 'critica' ? 'bg-red-50' : oc.severidade === 'alta' ? 'bg-orange-50' : 'bg-amber-50') },
              h('span', { className: 'text-lg mt-0.5' }, oc.severidade === 'critica' ? '🔴' : oc.severidade === 'alta' ? '🟠' : '🟡'),
              h('div', { className: 'flex-1 min-w-0' }, h('p', { className: 'text-sm font-medium text-gray-900' }, oc.titulo), h('div', { className: 'flex items-center gap-2 mt-1' }, h(Badge, { text: oc.tipo, cor: '#6B7280' }), h(Badge, { text: oc.severidade, cor: oc.severidade === 'critica' ? '#EF4444' : '#F97316' }), h(Badge, { text: oc.status, cor: '#3B82F6' })), h('p', { className: 'text-xs text-gray-400 mt-1' }, formatDateTime(oc.data_abertura)))
            );
          })) : h('p', { className: 'text-sm text-gray-400 text-center py-4' }, '✅ Nenhuma ocorrência!')
        )
      ),

      // Histórico Raio-X
      raio_x_historico.length > 0 && h('div', { className: 'bg-white rounded-xl border border-gray-200 p-5' },
        h('h3', { className: 'font-semibold text-gray-700 mb-4' }, '📋 Histórico de Raio-X'),
        h('div', { className: 'space-y-2' }, ...raio_x_historico.map(function(rx, i) {
          return h('div', { key: i, className: 'flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-indigo-50', onClick: async function() {
            try { var res = await fetchApi('/cs/raio-x/' + rx.id); if (res.success) setRaioXResult({ id: rx.id, analise: res.raio_x.analise_texto, gerado_em: res.raio_x.created_at, tokens: res.raio_x.tokens_utilizados }); } catch (e) { console.error(e); }
          } },
            h(HealthRing, { score: rx.score_saude, size: 36 }),
            h('div', { className: 'flex-1' }, h('p', { className: 'text-sm font-medium text-gray-900' }, formatDate(rx.data_inicio) + ' a ' + formatDate(rx.data_fim)), h('p', { className: 'text-xs text-gray-500' }, rx.tipo_analise + ' · ' + (rx.gerado_por_nome || 'Sistema'))),
            h('span', { className: 'text-xs text-gray-400' }, formatDateTime(rx.created_at))
          );
        }))
      ),

      // Modais
      h(Modal, { aberto: showNovaInteracao, fechar: function() { setShowNovaInteracao(false); }, titulo: '📝 Nova Interação' },
        h('div', { className: 'space-y-4' },
          h('div', { className: 'grid grid-cols-2 gap-4' },
            h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Tipo'), h('select', { value: interacaoForm.tipo, onChange: function(e) { setInteracaoForm(function(f) { return Object.assign({}, f, { tipo: e.target.value }); }); }, className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' }, h('option', { value: 'visita' }, '📍 Visita'), h('option', { value: 'reuniao' }, '👥 Reunião'), h('option', { value: 'ligacao' }, '📞 Ligação'), h('option', { value: 'pos_venda' }, '✅ Pós-Venda'), h('option', { value: 'whatsapp' }, '💬 WhatsApp'), h('option', { value: 'email' }, '📧 E-mail'), h('option', { value: 'anotacao' }, '📝 Anotação'))),
            h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '📁 Centro de Custo'), h('select', { value: interacaoForm.centro_custo, onChange: function(e) { setInteracaoForm(function(f) { return Object.assign({}, f, { centro_custo: e.target.value }); }); }, className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' }, h('option', { value: '' }, 'Todos os centros'), centrosDisp.map(function(cc) { return h('option', { key: cc.centro_custo, value: cc.centro_custo }, cc.centro_custo); })))
          ),
          h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Título *'), h('input', { type: 'text', value: interacaoForm.titulo, onChange: function(e) { setInteracaoForm(function(f) { return Object.assign({}, f, { titulo: e.target.value }); }); }, placeholder: 'Ex: Reunião de alinhamento', className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' })),
          h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Descrição'), h('textarea', { value: interacaoForm.descricao, onChange: function(e) { setInteracaoForm(function(f) { return Object.assign({}, f, { descricao: e.target.value }); }); }, rows: 3, className: 'w-full px-3 py-2 border border-gray-200 rounded-lg resize-none' })),
          h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Resultado'), h('input', { type: 'text', value: interacaoForm.resultado, onChange: function(e) { setInteracaoForm(function(f) { return Object.assign({}, f, { resultado: e.target.value }); }); }, className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' })),
          h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Próxima Ação'), h('input', { type: 'text', value: interacaoForm.proxima_acao, onChange: function(e) { setInteracaoForm(function(f) { return Object.assign({}, f, { proxima_acao: e.target.value }); }); }, className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' })),
          h('button', { onClick: salvarInteracao, disabled: !interacaoForm.titulo, className: 'w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50' }, '💾 Salvar')
        )
      ),
      h(Modal, { aberto: showNovaOcorrencia, fechar: function() { setShowNovaOcorrencia(false); }, titulo: '🚨 Nova Ocorrência' },
        h('div', { className: 'space-y-4' },
          h('div', { className: 'grid grid-cols-3 gap-4' },
            h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Tipo'), h('select', { value: ocorrenciaForm.tipo, onChange: function(e) { setOcorrenciaForm(function(f) { return Object.assign({}, f, { tipo: e.target.value }); }); }, className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' }, h('option', { value: 'reclamacao' }, 'Reclamação'), h('option', { value: 'problema_entrega' }, 'Problema Entrega'), h('option', { value: 'atraso' }, 'Atraso'), h('option', { value: 'financeiro' }, 'Financeiro'), h('option', { value: 'operacional' }, 'Operacional'), h('option', { value: 'sugestao' }, 'Sugestão'), h('option', { value: 'elogio' }, 'Elogio'))),
            h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Severidade'), h('select', { value: ocorrenciaForm.severidade, onChange: function(e) { setOcorrenciaForm(function(f) { return Object.assign({}, f, { severidade: e.target.value }); }); }, className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' }, h('option', { value: 'baixa' }, '🟢 Baixa'), h('option', { value: 'media' }, '🟡 Média'), h('option', { value: 'alta' }, '🟠 Alta'), h('option', { value: 'critica' }, '🔴 Crítica'))),
            h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '📁 Centro de Custo'), h('select', { value: ocorrenciaForm.centro_custo, onChange: function(e) { setOcorrenciaForm(function(f) { return Object.assign({}, f, { centro_custo: e.target.value }); }); }, className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' }, h('option', { value: '' }, 'Todos os centros'), centrosDisp.map(function(cc) { return h('option', { key: cc.centro_custo, value: cc.centro_custo }, cc.centro_custo); })))
          ),
          h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Título *'), h('input', { type: 'text', value: ocorrenciaForm.titulo, onChange: function(e) { setOcorrenciaForm(function(f) { return Object.assign({}, f, { titulo: e.target.value }); }); }, className: 'w-full px-3 py-2 border border-gray-200 rounded-lg' })),
          h('div', null, h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Descrição'), h('textarea', { value: ocorrenciaForm.descricao, onChange: function(e) { setOcorrenciaForm(function(f) { return Object.assign({}, f, { descricao: e.target.value }); }); }, rows: 3, className: 'w-full px-3 py-2 border border-gray-200 rounded-lg resize-none' })),
          h('button', { onClick: salvarOcorrencia, disabled: !ocorrenciaForm.titulo, className: 'w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50' }, '💾 Registrar')
        )
      ),
      // Modal de Envio de Email do Raio-X Cliente (form + animações sending/success)
      h(Modal, { aberto: showEmailModal, fechar: fecharModalEmail, titulo: emailStatus === 'success' ? '✅ Enviado!' : emailStatus === 'sending' ? '📤 Enviando...' : '📧 Enviar Relatório por Email', largura: 'max-w-xl' },
        emailStatus === 'sending' ?
          h('div', { className: 'flex flex-col items-center py-10' },
            h('div', { className: 'relative w-24 h-24' },
              h('div', { className: 'absolute inset-0 rounded-full border-4 border-emerald-100' }),
              h('div', { className: 'absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin' }),
              h('div', { className: 'absolute inset-0 flex items-center justify-center' },
                h('span', { className: 'text-4xl animate-pulse' }, '📧')
              )
            ),
            h('p', { className: 'mt-6 text-lg font-bold text-gray-700' }, 'Enviando email...'),
            h('p', { className: 'text-sm text-gray-400 mt-1' }, 'Processando gráficos e enviando via Resend')
          )
        : emailStatus === 'success' ?
          h('div', { className: 'flex flex-col items-center py-10' },
            h('div', { className: 'relative w-24 h-24' },
              h('div', { className: 'absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping' }),
              h('div', { className: 'relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg' },
                h('svg', { width: '48', height: '48', viewBox: '0 0 24 24', fill: 'none', stroke: 'white', strokeWidth: '4', strokeLinecap: 'round', strokeLinejoin: 'round' },
                  h('polyline', { points: '20 6 9 17 4 12' })
                )
              )
            ),
            h('p', { className: 'mt-6 text-xl font-bold text-emerald-600' }, 'Email enviado com sucesso!'),
            h('p', { className: 'text-sm text-gray-500 mt-2' }, 'Para: ', h('span', { className: 'font-semibold text-gray-700' }, emailForm.para)),
            emailMessageId && h('p', { className: 'text-xs text-gray-400 mt-3 font-mono bg-gray-50 px-3 py-1 rounded' }, 'ID: ' + emailMessageId.substring(0, 24) + '...')
          )
        :
          h('div', { className: 'space-y-4' },
            emailStatus === 'error' && emailError && h('div', { className: 'p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2' },
              h('span', { className: 'text-red-500 text-lg leading-none' }, '⚠️'),
              h('div', { className: 'flex-1' },
                h('p', { className: 'text-sm font-semibold text-red-800' }, 'Falha ao enviar'),
                h('p', { className: 'text-xs text-red-600 mt-0.5' }, emailError)
              )
            ),
            h('div', null,
              h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Destinatário *'),
              h('input', {
                type: 'email',
                value: emailForm.para,
                onChange: function(e) { setEmailForm(function(f) { return Object.assign({}, f, { para: e.target.value }); }); },
                placeholder: 'cliente@empresa.com.br',
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
              })
            ),
            h('div', null,
              h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'CC (opcional)'),
              h('input', {
                type: 'text',
                value: emailForm.cc,
                onChange: function(e) { setEmailForm(function(f) { return Object.assign({}, f, { cc: e.target.value }); }); },
                placeholder: 'Separe múltiplos emails com vírgula',
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
              }),
              h('p', { className: 'text-xs text-gray-400 mt-1' }, 'Ex: gestor@empresa.com, financeiro@empresa.com')
            ),
            h('div', null,
              h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Assunto'),
              h('input', {
                type: 'text',
                value: emailForm.assunto,
                onChange: function(e) { setEmailForm(function(f) { return Object.assign({}, f, { assunto: e.target.value }); }); },
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
              })
            ),
            h('div', { className: 'flex items-center gap-2 pt-2' },
              h('button', {
                onClick: fecharModalEmail,
                className: 'flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200'
              }, 'Cancelar'),
              h('button', {
                onClick: enviarEmailRaioX,
                disabled: !emailForm.para,
                className: 'flex-[2] py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50'
              }, '📧 Enviar Email')
            )
          )
      )
    );
  }

  // ══════════════════════════════════════════════════
  // INTERAÇÕES
  // ══════════════════════════════════════════════════
  function InteracoesView({ fetchApi }) {
    var _i = useState([]), interacoes = _i[0], setInteracoes = _i[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _f = useState(''), filtroTipo = _f[0], setFiltroTipo = _f[1];
    useEffect(function() { (async function() { setLoading(true); try { var p = new URLSearchParams({ limit: '50' }); if (filtroTipo) p.set('tipo', filtroTipo); var r = await fetchApi('/cs/interacoes?' + p); if (r.success) setInteracoes(r.interacoes || []); } catch (e) { console.error(e); } setLoading(false); })(); }, [fetchApi, filtroTipo]);
    return h('div', { className: 'space-y-4' },
      h('div', { className: 'flex items-center gap-3' }, h('h3', { className: 'text-lg font-bold text-gray-900' }, 'Todas as Interações'),
        h('select', { value: filtroTipo, onChange: function(e) { setFiltroTipo(e.target.value); }, className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white ml-auto' }, h('option', { value: '' }, 'Todos os tipos'), h('option', { value: 'visita' }, '📍 Visitas'), h('option', { value: 'reuniao' }, '👥 Reuniões'), h('option', { value: 'ligacao' }, '📞 Ligações'), h('option', { value: 'pos_venda' }, '✅ Pós-Venda'), h('option', { value: 'whatsapp' }, '💬 WhatsApp'))
      ),
      loading ? h(Skeleton, { linhas: 5 }) : interacoes.length === 0 ? h(EmptyState, { titulo: 'Nenhuma interação', icone: '📝' }) :
      h('div', { className: 'space-y-2' }, ...interacoes.map(function(int, i) {
        return h('div', { key: i, className: 'bg-white rounded-xl border border-gray-200 p-4 flex gap-4 items-start' },
          h('span', { className: 'text-2xl' }, int.tipo === 'visita' ? '📍' : int.tipo === 'reuniao' ? '👥' : int.tipo === 'ligacao' ? '📞' : int.tipo === 'whatsapp' ? '💬' : int.tipo === 'pos_venda' ? '✅' : '📝'),
          h('div', { className: 'flex-1 min-w-0' },
            h('div', { className: 'flex items-center gap-2 mb-1' }, h('h4', { className: 'font-semibold text-gray-900' }, int.titulo), h(Badge, { text: int.tipo, cor: '#6366F1' })),
            h('p', { className: 'text-sm text-gray-600 mb-1' }, int.nome_fantasia || 'Cliente ' + int.cod_cliente),
            int.descricao && h('p', { className: 'text-sm text-gray-500 line-clamp-2' }, int.descricao),
            int.resultado && h('p', { className: 'text-xs text-emerald-600 mt-1' }, '✅ ' + int.resultado),
            int.proxima_acao && h('p', { className: 'text-xs text-blue-600 mt-1' }, '📅 Próxima: ' + int.proxima_acao)
          ),
          h('div', { className: 'text-right whitespace-nowrap' }, h('p', { className: 'text-xs text-gray-400' }, formatDateTime(int.data_interacao)), h('p', { className: 'text-xs text-gray-400' }, int.criado_por_nome))
        );
      }))
    );
  }

  // ══════════════════════════════════════════════════
  // OCORRÊNCIAS
  // ══════════════════════════════════════════════════
  function OcorrenciasView({ fetchApi }) {
    var _o = useState([]), ocorrencias = _o[0], setOcorrencias = _o[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _f = useState(''), filtroStatus = _f[0], setFiltroStatus = _f[1];
    var carregar = useCallback(async function() { setLoading(true); try { var p = new URLSearchParams({ limit: '50' }); if (filtroStatus) p.set('status', filtroStatus); var r = await fetchApi('/cs/ocorrencias?' + p); if (r.success) setOcorrencias(r.ocorrencias || []); } catch (e) { console.error(e); } setLoading(false); }, [fetchApi, filtroStatus]);
    useEffect(function() { carregar(); }, [carregar]);
    var atualizarSt = async function(id, st) { try { await fetchApi('/cs/ocorrencias/' + id, { method: 'PUT', body: JSON.stringify({ status: st }) }); carregar(); } catch (e) { console.error(e); } };

    return h('div', { className: 'space-y-4' },
      h('div', { className: 'flex items-center gap-3' }, h('h3', { className: 'text-lg font-bold text-gray-900' }, 'Gestão de Ocorrências'),
        h('select', { value: filtroStatus, onChange: function(e) { setFiltroStatus(e.target.value); }, className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white ml-auto' }, h('option', { value: '' }, 'Todos'), h('option', { value: 'aberta' }, '🔵 Abertas'), h('option', { value: 'em_andamento' }, '🟡 Em Andamento'), h('option', { value: 'resolvida' }, '🟢 Resolvidas'), h('option', { value: 'fechada' }, '⚫ Fechadas'))
      ),
      loading ? h(Skeleton, { linhas: 5 }) : ocorrencias.length === 0 ? h(EmptyState, { titulo: 'Nenhuma ocorrência', icone: '✅', descricao: 'Tudo limpo!' }) :
      h('div', { className: 'space-y-2' }, ...ocorrencias.map(function(oc, i) {
        return h('div', { key: i, className: 'bg-white rounded-xl border p-4 ' + (oc.severidade === 'critica' ? 'border-red-300' : oc.severidade === 'alta' ? 'border-orange-200' : 'border-gray-200') },
          h('div', { className: 'flex items-start gap-3' },
            h('span', { className: 'text-2xl' }, oc.severidade === 'critica' ? '🔴' : oc.severidade === 'alta' ? '🟠' : oc.severidade === 'media' ? '🟡' : '🟢'),
            h('div', { className: 'flex-1 min-w-0' },
              h('div', { className: 'flex items-center gap-2 mb-1 flex-wrap' }, h('h4', { className: 'font-semibold text-gray-900' }, oc.titulo), h(Badge, { text: oc.tipo, cor: '#6B7280' }), h(Badge, { text: oc.severidade, cor: oc.severidade === 'critica' ? '#EF4444' : '#F97316' }), h(Badge, { text: oc.status, cor: oc.status === 'aberta' ? '#3B82F6' : oc.status === 'resolvida' ? '#10B981' : '#F59E0B' })),
              h('p', { className: 'text-sm text-gray-600' }, oc.nome_fantasia || 'Cliente ' + oc.cod_cliente),
              oc.descricao && h('p', { className: 'text-sm text-gray-500 mt-1' }, oc.descricao),
              h('div', { className: 'flex items-center gap-2 mt-2' },
                oc.status === 'aberta' && h('button', { onClick: function() { atualizarSt(oc.id, 'em_andamento'); }, className: 'text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200' }, '▶ Iniciar'),
                (oc.status === 'aberta' || oc.status === 'em_andamento') && h('button', { onClick: function() { atualizarSt(oc.id, 'resolvida'); }, className: 'text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200' }, '✅ Resolver')
              )
            ),
            h('span', { className: 'text-xs text-gray-400 whitespace-nowrap' }, formatDateTime(oc.data_abertura))
          )
        );
      }))
    );
  }

  // ══════════════════════════════════════════════════
  // AGENDA
  // ══════════════════════════════════════════════════
  function AgendaView({ fetchApi }) {
    var _a = useState([]), agenda = _a[0], setAgenda = _a[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    useEffect(function() { (async function() { setLoading(true); try { var r = await fetchApi('/cs/interacoes/agenda?dias=30'); if (r.success) setAgenda(r.agenda || []); } catch (e) { console.error(e); } setLoading(false); })(); }, [fetchApi]);
    return h('div', { className: 'space-y-4' },
      h('h3', { className: 'text-lg font-bold text-gray-900' }, '📅 Próximas Ações Agendadas (30 dias)'),
      loading ? h(Skeleton, { linhas: 5 }) : agenda.length === 0 ? h(EmptyState, { titulo: 'Nenhuma ação agendada', icone: '📅', descricao: 'Registre interações com próximas ações.' }) :
      h('div', { className: 'space-y-2' }, ...agenda.map(function(a, i) {
        return h('div', { key: i, className: 'bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4' },
          h('div', { className: 'text-center min-w-[60px]' }, h('p', { className: 'text-2xl font-bold text-blue-600' }, new Date(a.data_proxima_acao).getDate()), h('p', { className: 'text-xs text-gray-500' }, new Date(a.data_proxima_acao).toLocaleDateString('pt-BR', { month: 'short' }))),
          h('div', { className: 'flex-1 min-w-0' }, h('p', { className: 'font-medium text-gray-900' }, a.proxima_acao), h('p', { className: 'text-sm text-gray-500' }, (a.nome_fantasia || 'Cliente') + ' · Ref: ' + a.titulo), h('p', { className: 'text-xs text-gray-400' }, 'Original: ' + formatDateTime(a.data_interacao))),
          h(Badge, { text: diasAtras(a.data_proxima_acao) || formatDate(a.data_proxima_acao), cor: new Date(a.data_proxima_acao) < new Date() ? '#EF4444' : '#3B82F6' })
        );
      }))
    );
  }

  // ══════════════════════════════════════════════════
  // Markdown → HTML
  // ══════════════════════════════════════════════════
  function renderMarkdown(text) {
    if (!text) return '';
    // Se o texto já é HTML (salvo após edição), retornar direto sem reprocessar
    // Detecta pela presença de tags HTML típicas do relatório renderizado
    if (text.indexOf('<h2 class=') !== -1 || text.indexOf('<strong class="font-semibold') !== -1 || text.indexOf('<h3 class=') !== -1) {
      return text;
    }
    var htmlBlocks = [];
    var processed = text.replace(/<div style="margin:16px 0;background:#f8fafc[^"]*"[^>]*>[\s\S]*?<\/div>\n\n/g, function(match) {
      var idx = htmlBlocks.length; htmlBlocks.push(match); return '\n%%GRAFICO_' + idx + '%%\n';
    });
    processed = processed
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-indigo-800 mt-6 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-indigo-900 mt-6 mb-2">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-gray-700 mb-1">• $1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-sm text-gray-700 mb-1">$1</li>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-indigo-600 underline hover:text-indigo-800">$1</a>')
      .replace(/(https?:\/\/[^\s<]+)/g, function(url) {
        var decoded = url.replace(/&amp;/g, '&');
        if (decoded.indexOf('mapa-calor') !== -1) {
          return '<a href="' + decoded + '" target="_blank" rel="noopener" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;padding:8px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;margin:8px 0">🗺️ Abrir Mapa de Calor Interativo</a>';
        }
        return '<a href="' + decoded + '" target="_blank" rel="noopener" class="text-indigo-600 underline hover:text-indigo-800">' + decoded.substring(0, 60) + '...</a>';
      })
      .replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
    htmlBlocks.forEach(function(block, idx) { processed = processed.replace('%%GRAFICO_' + idx + '%%', block); });
    return processed;
  }

  // ══════════════════════════════════════════════════
  // EMAILS ENVIADOS — listagem + detalhe + timeline + iframe
  // Consome /cs/emails-enviados (lista, detalhe, html)
  // Eventos chegam via webhook /cs/webhook/resend (público)
  // ══════════════════════════════════════════════════

  var STATUS_BADGE = {
    sent:           { label: 'Enviado',   bg: '#E5E7EB', fg: '#374151' },
    scheduled:      { label: 'Agendado',  bg: '#EDE9FE', fg: '#5B21B6' },
    delivered:      { label: 'Entregue',  bg: '#DBEAFE', fg: '#1E3A8A' },
    delivery_delayed:{ label: 'Atrasado', bg: '#FEF3C7', fg: '#78350F' },
    opened:         { label: 'Aberto',    bg: '#DCFCE7', fg: '#14532D' },
    clicked:        { label: 'Clicado',   bg: '#EEEDFE', fg: '#26215C' },
    bounced:        { label: 'Bounce',    bg: '#FEE2E2', fg: '#7F1D1D' },
    failed:         { label: 'Falhou',    bg: '#FEE2E2', fg: '#7F1D1D' },
    complained:     { label: 'Spam',      bg: '#FEE2E2', fg: '#7F1D1D' },
    suppressed:     { label: 'Suprimido', bg: '#FEE2E2', fg: '#7F1D1D' },
  };

  var EVENTO_COR = {
    'email.sent':              '#10B981',
    'email.delivered':         '#10B981',
    'email.delivery_delayed':  '#F59E0B',
    'email.opened':            '#3B82F6',
    'email.clicked':           '#7c3aed',
    'email.bounced':           '#EF4444',
    'email.failed':            '#EF4444',
    'email.complained':        '#EF4444',
    'email.suppressed':        '#EF4444',
    'email.scheduled':         '#8B5CF6',
  };

  var EVENTO_LABEL = {
    'email.sent':              'Aceito pelo Resend',
    'email.delivered':         'Entregue ao servidor',
    'email.delivery_delayed':  'Entrega atrasada',
    'email.opened':            'Email aberto',
    'email.clicked':           'Link clicado',
    'email.bounced':           'Bounce',
    'email.failed':            'Falha no envio',
    'email.complained':        'Marcado como spam',
    'email.suppressed':        'Suprimido (lista)',
    'email.scheduled':         'Agendado',
  };

  function EmailsView({ fetchApi, apiUrl, getToken }) {
    var _list = useState([]),       lista = _list[0],       setLista = _list[1];
    var _stat = useState({}),       stats = _stat[0],       setStats = _stat[1];
    var _ld = useState(true),       loading = _ld[0],       setLoading = _ld[1];
    var _sel = useState(null),      selecionado = _sel[0],  setSelecionado = _sel[1];
    var _dt = useState(null),       detalhe = _dt[0],       setDetalhe = _dt[1];
    var _dtl = useState(false),     detLoading = _dtl[0],   setDetLoading = _dtl[1];
    var _modal = useState(null),    htmlModal = _modal[0],  setHtmlModal = _modal[1];
    var _mhtml = useState(''),      htmlContent = _mhtml[0], setHtmlContent = _mhtml[1];
    var _mloading = useState(false),htmlLoading = _mloading[0], setHtmlLoading = _mloading[1];

    // Carrega o HTML do email via fetch autenticado (não dá pra usar
    // iframe src diretamente porque iframe não manda Authorization header)
    useEffect(function() {
      if (!htmlModal) { setHtmlContent(''); return; }
      setHtmlLoading(true); setHtmlContent('');
      var token = getToken();
      fetch(apiUrl + '/cs/emails-enviados/' + htmlModal + '/html', {
        headers: { 'Authorization': 'Bearer ' + token },
        credentials: 'include'
      })
        .then(function(r) { return r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)); })
        .then(function(html) { setHtmlContent(html); })
        .catch(function(e) { setHtmlContent('<div style="padding:24px;font-family:sans-serif;color:#dc2626">Erro ao carregar HTML: ' + e.message + '</div>'); })
        .finally(function() { setHtmlLoading(false); });
    }, [htmlModal, apiUrl, getToken]);
    var _filtros = useState({ status: '', tipo: '', dias: 30 }),
        filtros = _filtros[0], setFiltros = _filtros[1];
    var _auto = useState(false),    autoRefresh = _auto[0], setAutoRefresh = _auto[1];

    var carregarLista = useCallback(async function() {
      try {
        var qs = 'dias=' + (filtros.dias || 30);
        if (filtros.status) qs += '&status=' + encodeURIComponent(filtros.status);
        if (filtros.tipo)   qs += '&tipo='   + encodeURIComponent(filtros.tipo);
        var r = await fetchApi('/cs/emails-enviados?' + qs);
        if (r.success) {
          setLista(r.data || []);
          setStats(r.estatisticas || {});
        }
      } catch (e) { console.error('Erro lista emails:', e); }
      setLoading(false);
    }, [fetchApi, filtros]);

    var carregarDetalhe = useCallback(async function(id) {
      setDetLoading(true);
      try {
        var r = await fetchApi('/cs/emails-enviados/' + id);
        if (r.success) setDetalhe({ email: r.email, eventos: r.eventos || [] });
      } catch (e) { console.error('Erro detalhe:', e); }
      setDetLoading(false);
    }, [fetchApi]);

    useEffect(function() { carregarLista(); }, [carregarLista]);
    useEffect(function() { if (selecionado) carregarDetalhe(selecionado); else setDetalhe(null); }, [selecionado, carregarDetalhe]);

    // Auto-refresh: polling de 30s quando habilitado
    useEffect(function() {
      if (!autoRefresh) return;
      var iv = setInterval(function() {
        carregarLista();
        if (selecionado) carregarDetalhe(selecionado);
      }, 30000);
      return function() { clearInterval(iv); };
    }, [autoRefresh, carregarLista, carregarDetalhe, selecionado]);

    var pct = function(num, den) {
      if (!den || den === 0) return '0%';
      return ((num / den) * 100).toFixed(1) + '%';
    };

    var emails = lista || [];

    return h('div', { className: 'space-y-4' },
      // ─── Header com filtros e auto-refresh ───
      h('div', { className: 'flex flex-wrap items-center justify-between gap-3' },
        h('div', null,
          h('h3', { className: 'text-lg font-bold text-gray-900' }, '📧 Emails Enviados'),
          h('p', { className: 'text-xs text-gray-500' }, 'Rastreamento em tempo real via webhook Resend')
        ),
        h('div', { className: 'flex items-center gap-2 text-sm' },
          h('select', {
            value: filtros.dias,
            onChange: function(e) { setFiltros(Object.assign({}, filtros, { dias: parseInt(e.target.value, 10) })); },
            className: 'px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white'
          },
            h('option', { value: 7 }, 'Últimos 7 dias'),
            h('option', { value: 30 }, 'Últimos 30 dias'),
            h('option', { value: 90 }, 'Últimos 90 dias'),
            h('option', { value: 365 }, 'Último ano')
          ),
          h('select', {
            value: filtros.status,
            onChange: function(e) { setFiltros(Object.assign({}, filtros, { status: e.target.value })); },
            className: 'px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white'
          },
            h('option', { value: '' }, 'Todos status'),
            h('option', { value: 'sent' }, 'Enviado'),
            h('option', { value: 'delivered' }, 'Entregue'),
            h('option', { value: 'opened' }, 'Aberto'),
            h('option', { value: 'clicked' }, 'Clicado'),
            h('option', { value: 'bounced' }, 'Bounce'),
            h('option', { value: 'complained' }, 'Spam')
          ),
          h('select', {
            value: filtros.tipo,
            onChange: function(e) { setFiltros(Object.assign({}, filtros, { tipo: e.target.value })); },
            className: 'px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white'
          },
            h('option', { value: '' }, 'Todos tipos'),
            h('option', { value: 'raio_x_cliente' }, 'Raio-X Cliente'),
            h('option', { value: 'raio_x_interno' }, 'Raio-X Interno')
          ),
          h('label', { className: 'flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer ml-2' },
            h('input', {
              type: 'checkbox',
              checked: autoRefresh,
              onChange: function(e) { setAutoRefresh(e.target.checked); },
              className: 'rounded'
            }),
            'Auto 30s'
          ),
          h('button', {
            onClick: function() { carregarLista(); if (selecionado) carregarDetalhe(selecionado); },
            className: 'px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50'
          }, '↻ Atualizar')
        )
      ),

      // ─── Métricas agregadas ───
      h('div', { className: 'grid grid-cols-2 md:grid-cols-5 gap-3' },
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3' },
          h('p', { className: 'text-xs text-gray-500' }, 'Enviados'),
          h('p', { className: 'text-2xl font-bold text-gray-900' }, stats.enviados || 0)
        ),
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3' },
          h('p', { className: 'text-xs text-gray-500' }, 'Entregues'),
          h('p', { className: 'text-2xl font-bold text-gray-900' },
            (stats.entregues || 0),
            h('span', { className: 'text-xs text-emerald-600 font-normal ml-1' }, pct(stats.entregues, stats.enviados))
          )
        ),
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3' },
          h('p', { className: 'text-xs text-gray-500' }, 'Abertos'),
          h('p', { className: 'text-2xl font-bold text-gray-900' },
            (stats.abertos || 0),
            h('span', { className: 'text-xs text-blue-600 font-normal ml-1' }, pct(stats.abertos, stats.entregues))
          )
        ),
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3' },
          h('p', { className: 'text-xs text-gray-500' }, 'Cliques'),
          h('p', { className: 'text-2xl font-bold text-gray-900' },
            (stats.clicados || 0),
            h('span', { className: 'text-xs text-purple-600 font-normal ml-1' }, pct(stats.clicados, stats.abertos))
          )
        ),
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3' },
          h('p', { className: 'text-xs text-gray-500' }, 'Bounces / Spam'),
          h('p', { className: 'text-2xl font-bold ' + ((stats.bounces || 0) > 0 ? 'text-red-600' : 'text-gray-900') }, stats.bounces || 0)
        )
      ),

      // ─── Master-detail layout ───
      loading ? h(Skeleton, { linhas: 6 }) :
      emails.length === 0 ? h(EmptyState, { icone: '📭', titulo: 'Nenhum email enviado no período', descricao: 'Envie um Raio-X pra ver o histórico aqui.' }) :
      h('div', { className: 'grid grid-cols-1 lg:grid-cols-5 gap-4' },
        // ─── Lista (esquerda, 2/5) ───
        h('div', { className: 'lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden' },
          h('div', { className: 'px-4 py-2.5 border-b border-gray-100 flex justify-between items-center' },
            h('span', { className: 'text-sm font-medium text-gray-700' }, emails.length + ' email' + (emails.length !== 1 ? 's' : '')),
            h('span', { className: 'text-xs text-gray-400' }, 'Mais recentes ↓')
          ),
          h('div', { className: 'divide-y divide-gray-100 max-h-[640px] overflow-y-auto' },
            ...emails.map(function(em) {
              var ativo = selecionado === em.id;
              var bd = STATUS_BADGE[em.status_atual] || STATUS_BADGE.sent;
              var paraStr = Array.isArray(em.para) ? em.para[0] : em.para;
              return h('div', {
                key: em.id,
                onClick: function() { setSelecionado(em.id); },
                className: 'px-4 py-3 cursor-pointer transition ' + (ativo ? 'bg-purple-50 border-l-4 border-purple-600' : 'border-l-4 border-transparent hover:bg-gray-50')
              },
                h('div', { className: 'flex justify-between items-start gap-2' },
                  h('div', { className: 'min-w-0 flex-1' },
                    h('p', { className: 'text-sm font-medium text-gray-900 truncate' }, em.nome_cliente || paraStr || '—'),
                    h('p', { className: 'text-xs text-gray-500 truncate mt-0.5' }, em.assunto || '—')
                  ),
                  h('div', { className: 'flex flex-col items-end gap-1 shrink-0' },
                    h('span', {
                      className: 'text-[10px] px-2 py-0.5 rounded-full font-medium',
                      style: { background: bd.bg, color: bd.fg }
                    }, bd.label),
                    h('span', { className: 'text-[10px] text-gray-400' }, diasAtras(em.created_at) || formatDate(em.created_at))
                  )
                ),
                h('div', { className: 'flex gap-1.5 mt-2 items-center flex-wrap' },
                  em.tipo === 'raio_x_cliente' ?
                    h('span', { className: 'text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded' }, 'cliente') :
                    h('span', { className: 'text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded' }, 'interno'),
                  (em.total_aberturas || 0) > 0 && h('span', { className: 'text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 rounded' }, em.total_aberturas + '× ↺'),
                  (em.total_cliques || 0) > 0 && h('span', { className: 'text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600 rounded' }, em.total_cliques + '× 🖱')
                ),
                em.bounce_msg && h('p', { className: 'text-[11px] text-red-600 mt-1 truncate' }, em.bounce_msg)
              );
            })
          )
        ),

        // ─── Detalhe (direita, 3/5) ───
        h('div', { className: 'lg:col-span-3' },
          !selecionado ? h('div', { className: 'bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm' },
            '👈 Selecione um email pra ver o detalhe e a linha do tempo'
          ) :
          detLoading ? h(Skeleton, { linhas: 8 }) :
          !detalhe ? null :
          h('div', { className: 'bg-white rounded-xl border border-gray-200 divide-y divide-gray-100' },
            // Header detalhe
            h('div', { className: 'px-4 py-3 flex justify-between items-start gap-3' },
              h('div', { className: 'min-w-0 flex-1' },
                h('p', { className: 'text-base font-bold text-gray-900' }, detalhe.email.nome_cliente || '—'),
                h('p', { className: 'text-sm text-gray-600 mt-0.5' }, detalhe.email.assunto),
                h('p', { className: 'text-xs text-gray-400 mt-0.5' },
                  formatDate(detalhe.email.data_inicio) + ' a ' + formatDate(detalhe.email.data_fim)
                )
              ),
              h('button', {
                onClick: function() { setHtmlModal(detalhe.email.id); },
                className: 'px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 shrink-0',
                style: { background: '#7c3aed' }
              }, 'Ver relatório ↗')
            ),

            // Metadados
            h('div', { className: 'px-4 py-3 grid grid-cols-2 gap-y-1.5 text-xs' },
              h('span', { className: 'text-gray-500' }, 'Para'),
              h('span', { className: 'text-right text-gray-800 truncate' }, (detalhe.email.para || []).join(', ') || '—'),
              detalhe.email.cc && detalhe.email.cc.length > 0 && h('span', { className: 'text-gray-500' }, 'Cc'),
              detalhe.email.cc && detalhe.email.cc.length > 0 && h('span', { className: 'text-right text-gray-800 truncate' }, detalhe.email.cc.join(', ')),
              h('span', { className: 'text-gray-500' }, 'Resend ID'),
              h('span', { className: 'text-right font-mono text-gray-400 truncate' }, detalhe.email.resend_email_id || '—'),
              h('span', { className: 'text-gray-500' }, 'Enviado por'),
              h('span', { className: 'text-right text-gray-800' }, detalhe.email.enviado_por_nome || '—'),
              h('span', { className: 'text-gray-500' }, 'Aberturas / Cliques'),
              h('span', { className: 'text-right text-gray-800' }, (detalhe.email.total_aberturas || 0) + ' aberturas · ' + (detalhe.email.total_cliques || 0) + ' cliques')
            ),

            // Tags
            detalhe.email.tags && detalhe.email.tags.length > 0 && h('div', { className: 'px-4 py-3' },
              h('div', { className: 'flex flex-wrap gap-1.5' },
                ...detalhe.email.tags.map(function(t, i) {
                  return h('span', {
                    key: i,
                    className: 'text-[10px] px-2 py-1 bg-purple-50 text-purple-900 rounded font-mono'
                  },
                    h('span', { style: { color: '#7F77DD' } }, t.name + ':'),
                    t.value
                  );
                })
              )
            ),

            // Timeline de eventos
            h('div', { className: 'px-4 py-4' },
              h('p', { className: 'text-xs font-medium text-gray-500 mb-3' }, 'Linha do tempo · ' + (detalhe.eventos || []).length + ' evento' + ((detalhe.eventos || []).length !== 1 ? 's' : '')),
              (detalhe.eventos || []).length === 0 ? h('p', { className: 'text-xs text-gray-400 italic' }, 'Nenhum evento webhook recebido ainda. Verifique se o webhook do Resend está configurado.') :
              h('div', { className: 'relative pl-5' },
                h('div', { className: 'absolute left-1 top-1 bottom-1 w-px bg-gray-200' }),
                ...(detalhe.eventos || []).map(function(ev, i) {
                  var cor = EVENTO_COR[ev.tipo] || '#9CA3AF';
                  var label = EVENTO_LABEL[ev.tipo] || ev.tipo;
                  var payload = ev.payload || {};
                  var detExtra = '';
                  if (ev.tipo === 'email.opened' || ev.tipo === 'email.clicked') {
                    if (ev.user_agent) {
                      var ua = ev.user_agent.toLowerCase();
                      var dev = ua.indexOf('mobile') !== -1 ? 'mobile' : 'desktop';
                      var cli = ua.indexOf('gmail') !== -1 ? 'Gmail' :
                                ua.indexOf('outlook') !== -1 ? 'Outlook' :
                                ua.indexOf('thunderbird') !== -1 ? 'Thunderbird' :
                                ua.indexOf('apple') !== -1 ? 'Apple Mail' : 'cliente';
                      detExtra = cli + ' ' + dev;
                    }
                  } else if (ev.tipo === 'email.bounced' && payload.data && payload.data.bounce) {
                    detExtra = (payload.data.bounce.subType || '') + ' — ' + (payload.data.bounce.message || '');
                  }
                  return h('div', { key: ev.id, className: 'relative mb-3' },
                    h('div', {
                      className: 'absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white',
                      style: { background: cor }
                    }),
                    h('div', { className: 'flex justify-between items-start gap-2' },
                      h('div', { className: 'min-w-0 flex-1' },
                        h('p', { className: 'text-xs font-medium text-gray-800' }, label),
                        detExtra && h('p', { className: 'text-[11px] text-gray-500 mt-0.5 truncate' }, detExtra),
                        ev.link_clicado && h('p', { className: 'text-[11px] text-purple-600 mt-0.5 font-mono truncate' }, '→ ' + ev.link_clicado)
                      ),
                      h('span', { className: 'text-[11px] text-gray-400 whitespace-nowrap shrink-0' }, formatDateTime(ev.evento_em))
                    )
                  );
                })
              )
            )
          )
        )
      ),

      // ─── Modal HTML do email ───
      htmlModal && h('div', {
        className: 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4',
        onClick: function() { setHtmlModal(null); }
      },
        h('div', {
          className: 'bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden',
          onClick: function(e) { e.stopPropagation(); }
        },
          h('div', { className: 'px-4 py-3 border-b border-gray-200 flex justify-between items-center' },
            h('p', { className: 'text-sm font-medium text-gray-900' }, '📧 Visualização do email enviado'),
            h('button', {
              onClick: function() { setHtmlModal(null); },
              className: 'text-gray-400 hover:text-gray-600 text-xl leading-none'
            }, '×')
          ),
          htmlLoading
            ? h('div', { className: 'flex-1 flex items-center justify-center text-sm text-gray-400' }, 'Carregando relatório...')
            : h('iframe', {
                srcDoc: htmlContent,
                className: 'flex-1 w-full',
                style: { minHeight: '600px', border: 'none', background: '#f1f5f9' },
                sandbox: 'allow-same-origin'
              })
        )
      )
    );
  }

  // ══════════════════════════════════════════════════
  // COMPONENTE PRINCIPAL
  // ══════════════════════════════════════════════════
  window.ModuloCsComponent = function(props) {
    var usuario = props.usuario, estado = props.estado, setEstado = props.setEstado, apiUrl = props.API_URL, getToken = props.getToken;
    var HeaderCompacto = props.HeaderCompacto, Toast = props.Toast, LoadingOverlay = props.LoadingOverlay;
    var Ee = props.Ee, socialProfile = props.socialProfile, ul = props.ul, o = props.o, he = props.he, navegarSidebar = props.navegarSidebar;
    var isLoadingGlobal = props.n, toastData = props.i, isLoading = props.f, lastUpdate = props.E;

    var _t = useState('dashboard'), activeTab = _t[0], setActiveTab = _t[1];
    var _cd = useState(null), clienteDetalhe = _cd[0], setClienteDetalhe = _cd[1];

    var fetchApi = useCallback(async function(endpoint, options) {
      options = options || {};
      var token = getToken(), url = apiUrl + endpoint;
      var res = await fetch(url, Object.assign({}, options, { headers: Object.assign({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, options.headers || {}), credentials: 'include' }));
      return res.json();
    }, [apiUrl, getToken]);

    var handleTabChange = function(tabId) { setActiveTab(tabId); setClienteDetalhe(null); setEstado(Object.assign({}, estado, { csTab: tabId })); };
    var handleSelectCliente = function(cod, centroCusto) { setClienteDetalhe({ cod: cod, centroCusto: centroCusto || null }); };

    var renderContent = function() {
      if (clienteDetalhe) return h(ClienteDetalheView, { codCliente: clienteDetalhe.cod, centroCustoInicial: clienteDetalhe.centroCusto, fetchApi: fetchApi, apiUrl: apiUrl, getToken: getToken, onVoltar: function() { setClienteDetalhe(null); } });
      switch (activeTab) {
        case 'dashboard': return h(DashboardView, { fetchApi: fetchApi });
        case 'clientes': return h(ClientesView, { fetchApi: fetchApi, onSelectCliente: handleSelectCliente });
        case 'interacoes': return h(InteracoesView, { fetchApi: fetchApi });
        case 'ocorrencias': return h(OcorrenciasView, { fetchApi: fetchApi });
        case 'agenda': return h(AgendaView, { fetchApi: fetchApi });
        case 'emails': return h(EmailsView, { fetchApi: fetchApi, apiUrl: apiUrl, getToken: getToken });
        default: return h(DashboardView, { fetchApi: fetchApi });
      }
    };

    return h('div', { className: 'min-h-screen bg-gray-50' },
      toastData && h(Toast, toastData),
      isLoadingGlobal && h(LoadingOverlay),
      h(HeaderCompacto, { usuario: usuario, moduloAtivo: Ee, abaAtiva: activeTab, socialProfile: socialProfile, isLoading: isLoading, lastUpdate: lastUpdate, onRefresh: ul, onLogout: function() { o(null); }, onGoHome: function() { he('home'); }, onNavigate: navegarSidebar, onChangeTab: handleTabChange }),
      h('div', { className: 'max-w-7xl mx-auto p-4 md:p-6' },
        clienteDetalhe && h('div', { className: 'mb-4' },
          h('nav', { className: 'text-sm text-gray-500' },
            h('span', { className: 'cursor-pointer hover:text-blue-600', onClick: function() { setClienteDetalhe(null); setActiveTab('clientes'); } }, 'Clientes'),
            ' → ',
            h('span', { className: 'text-gray-900 font-medium' }, 'Cliente #' + clienteDetalhe.cod)
          )
        ),
        renderContent()
      )
    );
  };

  console.log('✅ Módulo Sucesso do Cliente v3 carregado (legendas + edição + logo + datas)');
})();
