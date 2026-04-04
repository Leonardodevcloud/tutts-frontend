// ================================================================
// MÓDULO PERFORMANCE DIÁRIA - Tutts v2.0
// Arquivo: modulo-performance.js
// 4 abas: Dashboard · Busca · Configurações · Jobs
// HeaderCompacto vem do app.js (padrão dos demais módulos)
// ================================================================

(function () {
  'use strict';

  const { useState, useEffect, useCallback, useRef } = React;
  const h = React.createElement;

  // ── Helpers ─────────────────────────────────────────────
  function hoje() { return new Date().toISOString().slice(0, 10); }
  function fmtData(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  }
  function fmtDT(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function corPct(pct, codCliente) {
    // Cliente 767 (Comollati): SLA contratual 95%
    if (codCliente == 767) {
      if (pct >= 95) return { text: 'text-green-600', bg: 'bg-green-50', bar: '#22c55e', ring: 'border-green-400' };
      return { text: 'text-yellow-600', bg: 'bg-yellow-50', bar: '#eab308', ring: 'border-yellow-400' };
    }
    if (pct >= 90) return { text: 'text-green-600', bg: 'bg-green-50', bar: '#22c55e', ring: 'border-green-400' };
    if (pct >= 75) return { text: 'text-yellow-600', bg: 'bg-yellow-50', bar: '#eab308', ring: 'border-yellow-400' };
    return { text: 'text-red-600', bg: 'bg-red-50', bar: '#ef4444', ring: 'border-red-400' };
  }
  const JOB_STATUS = {
    pendente:   { label: 'Aguardando', cls: 'bg-yellow-100 text-yellow-800' },
    executando: { label: 'Executando', cls: 'bg-blue-100 text-blue-700' },
    concluido:  { label: 'Concluído',  cls: 'bg-green-100 text-green-700' },
    erro:       { label: 'Erro',       cls: 'bg-red-100 text-red-700' },
  };

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Card de cliente no Dashboard
  // ════════════════════════════════════════════════════════════
  function ClienteCard({ card, onClick, processando }) {
    const snap = card.snapshot;
    const pct = snap ? parseFloat(snap.pct_no_prazo || 0) : 0;
    const c = corPct(pct, card.cod_cliente);
    const total = snap ? snap.total_os : 0;

    return h('div', {
      onClick,
      className: `bg-white border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden ${snap ? '' : 'opacity-60'} ${processando ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`,
    },
      // Barra de cor no topo (animada se processando)
      processando
        ? h('div', { className: 'h-1.5 overflow-hidden bg-gray-200' },
            h('div', { style: { width: '40%', height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)', animation: 'shimmer 1.5s infinite', borderRadius: '4px' } })
          )
        : h('div', { className: 'h-1.5', style: { background: snap ? c.bar : '#d1d5db' } }),
      h('div', { className: 'p-4' },
        // Nome + CC + status
        h('div', { className: 'mb-3' },
          h('div', { className: 'flex items-center gap-2' },
            h('p', { className: 'text-sm font-bold text-gray-900 truncate flex-1' }, card.nome_display),
            processando && h('span', { className: 'flex items-center gap-1 text-xs text-purple-600 font-semibold animate-pulse' }, '⏳'),
          ),
          card.centro_custo
            ? h('p', { className: 'text-xs text-purple-600 font-medium truncate' }, card.centro_custo)
            : h('p', { className: 'text-xs text-gray-400' }, 'Todos os centros'),
        ),

        processando && !snap
          ? h('div', { className: 'text-center py-4' },
              h('div', { className: 'inline-block w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full', style: { animation: 'spin 1s linear infinite', borderWidth: '3px' } }),
              h('p', { className: 'text-xs text-purple-500 mt-2 font-medium' }, 'Processando...'),
            )
          : snap ? h('div', {},
              h('div', { className: 'flex items-end justify-between mb-3' },
                h('span', { className: `text-3xl font-black ${c.text} ${processando ? 'opacity-60' : ''}` }, `${pct}%`),
                h('span', { className: 'text-xs text-gray-400' }, `${total} OS`),
              ),
              h('div', { className: 'w-full h-2 rounded-full overflow-hidden bg-gray-100 flex mb-3' },
                total > 0 && h('div', { style: { width: `${(snap.no_prazo / total) * 100}%`, background: '#22c55e' } }),
                total > 0 && h('div', { style: { width: `${(snap.fora_prazo / total) * 100}%`, background: '#ef4444' } }),
                total > 0 && h('div', { style: { width: `${(snap.sem_dados / total) * 100}%`, background: '#d1d5db' } }),
              ),
              h('div', { className: 'flex justify-between text-xs' },
                h('span', { className: 'text-green-600 font-semibold' }, `✓ ${snap.no_prazo}`),
                h('span', { className: 'text-red-500 font-semibold' }, `✗ ${snap.fora_prazo}`),
                h('span', { className: 'text-gray-400' }, `⬜ ${snap.sem_dados}`),
              ),
              processando && h('p', { className: 'text-xs text-purple-500 mt-2 text-center animate-pulse font-medium' }, '🔄 Atualizando...'),
            )
          : h('div', { className: 'text-center py-4' },
              h('p', { className: 'text-gray-400 text-sm' }, 'Sem dados'),
              h('p', { className: 'text-xs text-gray-300' }, 'Execute a busca'),
            ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Detalhe do cliente (registros)
  // ════════════════════════════════════════════════════════════
  function DetalheCliente({ card, onVoltar }) {
    const [filtro, setFiltro] = useState('todos');
    const [busca, setBusca] = useState('');
    const registros = card.registros || [];

    const filtrados = registros.filter(r => {
      if (filtro === 'no_prazo'   && r.sla_no_prazo !== true)  return false;
      if (filtro === 'fora_prazo' && r.sla_no_prazo !== false) return false;
      if (filtro === 'sem_dados'  && !r.sem_dados)             return false;
      if (busca) {
        const s = busca.toLowerCase();
        if (!((r.os || '').toLowerCase().includes(s) || (r.cliente_txt || '').toLowerCase().includes(s) || (r.profissional || '').toLowerCase().includes(s))) return false;
      }
      return true;
    });

    const snap = card.snapshot;
    const pct = snap ? parseFloat(snap.pct_no_prazo || 0) : 0;
    const c = corPct(pct, card.cod_cliente);

    return h('div', { className: 'space-y-4' },
      // Voltar + Header
      h('div', { className: 'flex items-center gap-4' },
        h('button', { onClick: onVoltar, className: 'p-2 hover:bg-gray-100 rounded-lg' }, '← Voltar'),
        h('div', { className: 'flex-1' },
          h('h2', { className: 'text-lg font-bold text-gray-900' }, card.nome_display),
          card.centro_custo && h('p', { className: 'text-sm text-purple-600' }, card.centro_custo),
        ),
        snap && h('div', { className: `text-right` },
          h('span', { className: `text-3xl font-black ${c.text}` }, `${pct}%`),
          h('p', { className: 'text-xs text-gray-400' }, `${snap.total_os} OS · ${fmtDT(snap.criado_em)}`),
        ),
      ),

      // KPIs
      snap && h('div', { className: 'grid grid-cols-4 gap-3' },
        h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3 text-center' },
          h('p', { className: 'text-2xl font-black text-purple-900' }, snap.total_os),
          h('p', { className: 'text-xs text-purple-600 font-semibold uppercase' }, 'Total OS'),
        ),
        h('div', { className: 'bg-green-50 border border-green-200 rounded-xl p-3 text-center' },
          h('p', { className: 'text-2xl font-black text-green-700' }, snap.no_prazo),
          h('p', { className: 'text-xs text-green-600 font-semibold uppercase' }, 'No Prazo'),
        ),
        h('div', { className: 'bg-red-50 border border-red-200 rounded-xl p-3 text-center' },
          h('p', { className: 'text-2xl font-black text-red-700' }, snap.fora_prazo),
          h('p', { className: 'text-xs text-red-600 font-semibold uppercase' }, 'Fora'),
        ),
        h('div', { className: 'bg-gray-50 border border-gray-200 rounded-xl p-3 text-center' },
          h('p', { className: 'text-2xl font-black text-gray-600' }, snap.sem_dados),
          h('p', { className: 'text-xs text-gray-500 font-semibold uppercase' }, 'Sem Dados'),
        ),
      ),

      // Barra SLA
      snap && h('div', { className: 'bg-white border rounded-xl p-4' },
        h('div', { className: 'flex items-center justify-between mb-2' },
          h('span', { className: 'text-sm font-bold text-gray-700' }, '📊 SLA Geral'),
          h('span', { className: `text-xl font-black ${c.text}` }, `${pct}%`),
        ),
        h('div', { className: 'w-full h-4 rounded-full overflow-hidden bg-gray-100 flex' },
          snap.total_os > 0 && h('div', { style: { width: `${(snap.no_prazo / snap.total_os) * 100}%`, background: '#22c55e' } }),
          snap.total_os > 0 && h('div', { style: { width: `${(snap.fora_prazo / snap.total_os) * 100}%`, background: '#ef4444' } }),
          snap.total_os > 0 && h('div', { style: { width: `${(snap.sem_dados / snap.total_os) * 100}%`, background: '#d1d5db' } }),
        ),
      ),

      // Tabela de OS
      h('div', { className: 'bg-white border rounded-xl shadow-sm overflow-hidden' },
        h('div', { className: 'px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2' },
          h('h3', { className: 'text-sm font-bold text-gray-700 uppercase' }, `📋 Detalhamento por OS (${registros.length})`),
          h('div', { className: 'flex items-center gap-2' },
            h('input', {
              type: 'text', placeholder: 'Buscar OS, cliente, profissional...', value: busca,
              onChange: e => setBusca(e.target.value),
              className: 'border rounded-lg px-3 py-1.5 text-xs w-52 focus:ring-2 focus:ring-purple-400 focus:outline-none',
            }),
            h('span', { className: 'text-xs text-gray-400' }, `${filtrados.length} registros`),
          ),
        ),
        // Chips filtro
        h('div', { className: 'px-4 py-2 flex gap-2 border-b' },
          ['todos', 'no_prazo', 'fora_prazo', 'sem_dados'].map(f => {
            const labels = { todos: 'Todos', no_prazo: '✓ No Prazo', fora_prazo: '✗ Fora', sem_dados: '⬜ Sem Dados' };
            const ativo = filtro === f;
            return h('button', {
              key: f, onClick: () => setFiltro(f),
              className: `px-3 py-1 rounded-full text-xs font-semibold transition-all ${ativo ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
            }, labels[f]);
          }),
        ),
        // Tabela
        h('div', { className: 'overflow-x-auto', style: { maxHeight: '500px', overflowY: 'auto' } },
          h('table', { className: 'w-full text-sm' },
            h('thead', {},
              h('tr', { className: 'bg-gray-50 text-xs uppercase text-gray-500 sticky top-0' },
                h('th', { className: 'text-left px-3 py-2' }, 'OS'),
                h('th', { className: 'text-left px-3 py-2' }, 'Cliente'),
                h('th', { className: 'text-left px-3 py-2' }, 'Profissional'),
                h('th', { className: 'text-center px-3 py-2' }, 'KM'),
                h('th', { className: 'text-center px-3 py-2' }, 'Prazo'),
                h('th', { className: 'text-center px-3 py-2' }, 'Duração'),
                h('th', { className: 'text-center px-3 py-2' }, 'Delta'),
                h('th', { className: 'text-center px-3 py-2' }, 'SLA'),
              ),
            ),
            h('tbody', {},
              ...filtrados.slice(0, 200).map((r, i) => {
                const slaClass = r.sem_dados ? 'text-gray-400' : r.sla_no_prazo ? 'text-green-600' : 'text-red-600';
                const slaLabel = r.sem_dados ? '—' : r.sla_no_prazo ? '✓ No prazo' : '✗ Fora';
                return h('tr', { key: i, className: `border-t hover:bg-gray-50 ${r.sla_no_prazo === false ? 'bg-red-50/30' : ''}` },
                  h('td', { className: 'px-3 py-2 font-mono text-purple-700 text-xs' }, r.os),
                  h('td', { className: 'px-3 py-2 text-gray-600 text-xs max-w-[200px] truncate' }, r.nome_cliente || r.cliente_txt || ''),
                  h('td', { className: 'px-3 py-2 text-gray-500 text-xs' }, r.profissional || '—'),
                  h('td', { className: 'px-3 py-2 text-center text-xs' }, r.km ? `${r.km} km` : '—'),
                  h('td', { className: 'px-3 py-2 text-center text-xs' }, r.prazo_min ? `${Math.floor(r.prazo_min / 60)}h${String(r.prazo_min % 60).padStart(2, '0')}m` : '—'),
                  h('td', { className: 'px-3 py-2 text-center text-xs' }, r.duracao_min ? `${Math.floor(r.duracao_min / 60)}h${String(r.duracao_min % 60).padStart(2, '0')}m` : '—'),
                  h('td', { className: `px-3 py-2 text-center text-xs font-semibold ${slaClass}` }, r.delta_min != null ? `${r.sla_no_prazo ? '+' : '-'}${r.delta_min}m` : '—'),
                  h('td', { className: `px-3 py-2 text-center text-xs font-bold ${slaClass}` }, slaLabel),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Dashboard (cards por cliente configurado)
  // ════════════════════════════════════════════════════════════
  function TabDashboard({ API_URL, fetchAuth, showToast }) {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState({ inicio: hoje(), fim: hoje() });
    const [detalhe, setDetalhe] = useState(null);
    const [jobsAtivos, setJobsAtivos] = useState({}); // { "cod_cc": jobId }
    const pollingRef = useRef(null);

    const carregar = useCallback(async () => {
      try {
        const r = await fetchAuth(`${API_URL}/performance/dashboard?data_inicio=${periodo.inicio}&data_fim=${periodo.fim}`);
        const d = await r.json();
        setCards(d.cards || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [API_URL, fetchAuth, periodo]);

    useEffect(() => { setLoading(true); carregar(); }, [carregar]);

    // ── POLLING: verifica jobs ativos e atualiza dashboard ao concluir ──
    useEffect(() => {
      const ativos = Object.keys(jobsAtivos);
      if (ativos.length === 0) {
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        return;
      }
      if (pollingRef.current) return; // já tem polling rodando

      pollingRef.current = setInterval(async () => {
        let algumConcluiu = false;
        const novosAtivos = { ...jobsAtivos };

        for (const [key, jobId] of Object.entries(novosAtivos)) {
          try {
            const r = await fetchAuth(`${API_URL}/performance/jobs/${jobId}`);
            const d = await r.json();
            const st = d.job?.status;
            if (st === 'concluido' || st === 'erro') {
              delete novosAtivos[key];
              algumConcluiu = true;
              if (st === 'concluido') console.log(`✅ Job #${jobId} concluído (${key})`);
            }
          } catch (e) { /* ignora erro de polling */ }
        }

        if (algumConcluiu || Object.keys(novosAtivos).length !== Object.keys(jobsAtivos).length) {
          setJobsAtivos(novosAtivos);
          if (algumConcluiu) {
            showToast('✅ Dados atualizados!', 'success');
            carregar(); // refresh imediato
          }
        }
      }, 5000);

      return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
    }, [jobsAtivos, API_URL, fetchAuth, carregar, showToast]);

    // Limpar polling ao desmontar
    useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

    // Executar busca para um card
    const executarCard = async (card) => {
      const key = `${card.cod_cliente}_${card.centro_custo || ''}`;
      try {
        const r = await fetchAuth(`${API_URL}/performance/executar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data_inicio: periodo.inicio,
            data_fim: periodo.fim,
            cod_cliente: card.cod_cliente,
            centro_custo: card.centro_custo || undefined,
          }),
        });
        const d = await r.json();
        const jobId = d.job_id;
        if (jobId) {
          setJobsAtivos(prev => ({ ...prev, [key]: jobId }));
        }
        return d;
      } catch (e) { return null; }
    };

    // Executar todos (com ou sem toast)
    const executarTodosInterno = async (comToast = true) => {
      if (comToast) showToast(`🚀 Criando jobs para ${cards.length} clientes...`, 'info');
      // Usar cards atuais ou buscar configs se cards vazio
      let alvo = cards;
      if (alvo.length === 0) {
        try {
          const r = await fetchAuth(`${API_URL}/performance/config`);
          const d = await r.json();
          alvo = (d.configs || []).map(c => ({ cod_cliente: c.cod_cliente, centro_custo: c.centro_custo, nome_display: c.nome_display }));
        } catch (e) { return; }
      }
      for (const card of alvo) {
        await executarCard(card);
      }
      if (comToast) showToast('Jobs criados! Atualizando automaticamente...', 'success');
    };

    if (detalhe) return h(DetalheCliente, { card: detalhe, onVoltar: () => { setDetalhe(null); carregar(); } });

    const totalAtivos = Object.keys(jobsAtivos).length;

    return h('div', { className: 'space-y-5', style: { position: 'relative' } },
      // CSS keyframes para animações
      h('style', {}, `
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes argosWave { 0%, 100% { height: 5px; } 50% { height: 52px; } }
        @keyframes argosSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `),

      // ── OVERLAY ARGOS ──
      totalAtivos > 0 && h('div', {
        style: {
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999,
          background: 'rgba(15, 14, 26, 0.88)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '36px',
        }
      },
        // Wave bars
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', height: '64px' },
          ref: (el) => {
            if (el && el.childNodes.length === 0) {
              for (let i = 0; i < 36; i++) {
                const bar = document.createElement('div');
                bar.style.cssText = 'width:4px;background:#7C3AED;border-radius:3px;animation:argosWave 1.2s ease-in-out infinite;animation-delay:' + (i * 0.06) + 's';
                el.appendChild(bar);
              }
            }
          }
        }),
        // Texto
        h('div', { style: { textAlign: 'center', animation: 'argosSlideUp .6s ease-out both' } },
          h('div', { style: { fontSize: '12px', color: '#7C3AED', letterSpacing: '4px', marginBottom: '10px' } }, 'ARGOS INTELLIGENCE'),
          h('div', { style: { fontSize: '20px', fontWeight: 500, color: '#e2e0f0' } }, 'Processando dados operacionais'),
          h('div', { style: { fontSize: '14px', color: '#6b6890', marginTop: '10px' } },
            `Aguarde enquanto analiso o desempenho de ${totalAtivos} cliente${totalAtivos > 1 ? 's' : ''}`),
        ),
      ),

      // Filtro de data + ações
      h('div', { className: 'bg-white border rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-4' },
        h('div', { className: 'flex flex-col gap-1' },
          h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Data Inicial'),
          h('input', { type: 'date', value: periodo.inicio, onChange: e => setPeriodo(p => ({ ...p, inicio: e.target.value })),
            className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' }),
        ),
        h('div', { className: 'flex flex-col gap-1' },
          h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Data Final'),
          h('input', { type: 'date', value: periodo.fim, onChange: e => setPeriodo(p => ({ ...p, fim: e.target.value })),
            className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' }),
        ),
        h('button', { onClick: carregar, className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700' }, '🔄 Recarregar'),
        cards.length > 0 && h('button', { onClick: () => executarTodosInterno(true), disabled: totalAtivos > 0,
          className: `px-4 py-2 rounded-lg text-sm font-semibold ${totalAtivos > 0 ? 'bg-gray-200 text-gray-400' : 'bg-green-600 hover:bg-green-700 text-white'}` },
          totalAtivos > 0 ? `⏳ Processando (${totalAtivos})...` : `🚀 Forçar Atualização`),
        // Info cron + última atualização
        h('div', { className: 'flex flex-col gap-0.5 ml-2' },
          h('span', { className: 'text-xs text-gray-400' }, '⏰ Atualização automática: 1h (8h-19h)'),
          cards.length > 0 && cards[0].snapshot && h('span', { className: 'text-xs text-gray-400' },
            '📊 Última: ', fmtDT(cards.reduce((latest, c) => {
              if (!c.snapshot) return latest;
              return !latest || new Date(c.snapshot.criado_em) > new Date(latest) ? c.snapshot.criado_em : latest;
            }, null))
          ),
        ),
      ),

      // Cards
      loading
        ? h('div', { className: 'text-center py-10' }, h('span', { className: 'text-gray-400' }, '⏳ Carregando...'))
        : cards.length === 0
          ? h('div', { className: 'bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center' },
              h('p', { className: 'text-4xl mb-3' }, '⚙️'),
              h('p', { className: 'text-gray-600 font-semibold' }, 'Nenhum cliente configurado'),
              h('p', { className: 'text-gray-400 text-sm mt-1' }, 'Vá na aba "Configurações" para adicionar clientes ao monitoramento'),
            )
          : h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' },
              ...cards.map((card, i) => {
                const key = `${card.cod_cliente}_${card.centro_custo || ''}`;
                return h(ClienteCard, {
                  key: i, card,
                  processando: !!jobsAtivos[key],
                  onClick: () => setDetalhe(card),
                });
              })
            ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Busca (funcionalidade original)
  // ════════════════════════════════════════════════════════════
  function TabBusca({ API_URL, fetchAuth, showToast }) {
    const [filtros, setFiltros] = useState({ dataInicio: hoje(), dataFim: hoje(), codCliente: '', centroCusto: '' });
    const [snapshot, setSnapshot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [jobAtual, setJobAtual] = useState(null);
    const [detalhe, setDetalhe] = useState(null);
    const pollingRef = useRef(null);

    // Client dropdown state
    const [clientes, setClientes] = useState([]);
    const [centrosCusto, setCentrosCusto] = useState([]);
    const [buscaCliente, setBuscaCliente] = useState('');
    const [dropAberto, setDropAberto] = useState(false);
    const [ccLoading, setCcLoading] = useState(false);
    const dropRef = useRef(null);

    useEffect(() => {
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/clientes-por-regiao`);
          const data = await r.json();
          if (Array.isArray(data)) setClientes(data);
        } catch (e) {}
      })();
    }, [API_URL, fetchAuth]);

    useEffect(() => {
      if (!filtros.codCliente) { setCentrosCusto([]); return; }
      (async () => {
        setCcLoading(true);
        try {
          const r = await fetchAuth(`${API_URL}/bi/centros-custo/${filtros.codCliente}`);
          const data = await r.json();
          if (Array.isArray(data)) setCentrosCusto(data);
        } catch (e) { setCentrosCusto([]); }
        setCcLoading(false);
      })();
    }, [filtros.codCliente, API_URL, fetchAuth]);

    useEffect(() => {
      const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropAberto(false); };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    const clientesFiltrados = buscaCliente.length > 0
      ? clientes.filter(c => String(c.cod_cliente).includes(buscaCliente) || (c.nome_display || '').toLowerCase().includes(buscaCliente.toLowerCase()))
      : clientes;
    const clienteSel = clientes.find(c => String(c.cod_cliente) === String(filtros.codCliente));

    const carregarSnapshot = useCallback(async (params = {}) => {
      try {
        const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
        const r = await fetchAuth(`${API_URL}/performance/snapshot${qs ? '?' + qs : ''}`);
        setSnapshot(await r.json());
      } catch (err) { console.error(err); }
    }, [API_URL, fetchAuth]);

    useEffect(() => { carregarSnapshot({ data_inicio: hoje(), data_fim: hoje() }); }, [carregarSnapshot]);

    const iniciarPolling = useCallback((jobId) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetchAuth(`${API_URL}/performance/jobs/${jobId}`);
          const d = await r.json();
          const st = d.job?.status;
          setJobAtual(j => ({ ...j, status: st }));
          if (st === 'concluido' || st === 'erro') {
            clearInterval(pollingRef.current); pollingRef.current = null; setLoading(false);
            if (st === 'concluido') { showToast('✅ Performance atualizada!', 'success'); await carregarSnapshot({ data_inicio: filtros.dataInicio, data_fim: filtros.dataFim, cod_cliente: filtros.codCliente || undefined, centro_custo: filtros.centroCusto || undefined }); }
            else showToast('Erro na execução.', 'error');
          }
        } catch { clearInterval(pollingRef.current); pollingRef.current = null; setLoading(false); }
      }, 5000);
    }, [API_URL, fetchAuth, filtros, carregarSnapshot, showToast]);

    useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

    const onExecutar = async () => {
      if (!filtros.dataInicio || !filtros.dataFim) { showToast('Informe o período', 'error'); return; }
      setLoading(true); setJobAtual(null);
      try {
        const r = await fetchAuth(`${API_URL}/performance/executar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data_inicio: filtros.dataInicio, data_fim: filtros.dataFim, cod_cliente: filtros.codCliente ? parseInt(filtros.codCliente) : undefined, centro_custo: filtros.centroCusto || undefined }),
        });
        const d = await r.json();
        if (!r.ok) { showToast(d.error || 'Erro', 'error'); setLoading(false); return; }
        setJobAtual({ id: d.job_id, status: 'pendente' }); iniciarPolling(d.job_id);
        showToast(d.ja_existia ? 'Job em andamento...' : 'Job criado!', 'info');
      } catch { showToast('Erro de conexão', 'error'); setLoading(false); }
    };

    const snap = snapshot?.snapshot;
    const porCliente = snapshot?.por_cliente || [];
    const registros = snapshot?.registros || [];

    if (detalhe) {
      return h(DetalheCliente, { card: { ...detalhe, registros: registros.filter(r => String(r.cod_cliente) === String(detalhe.cod_cliente)) }, onVoltar: () => setDetalhe(null) });
    }

    return h('div', { className: 'space-y-5' },
      // Filtros
      h('div', { className: 'bg-white border rounded-xl shadow-sm p-5' },
        h('div', { className: 'flex flex-wrap gap-4 items-end' },
          h('div', { className: 'flex flex-col gap-1' },
            h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Data Inicial'),
            h('input', { type: 'date', value: filtros.dataInicio, onChange: e => setFiltros(f => ({ ...f, dataInicio: e.target.value })),
              className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' }),
          ),
          h('div', { className: 'flex flex-col gap-1' },
            h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Data Final'),
            h('input', { type: 'date', value: filtros.dataFim, onChange: e => setFiltros(f => ({ ...f, dataFim: e.target.value })),
              className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' }),
          ),
          // Cliente dropdown
          h('div', { className: 'flex flex-col gap-1 relative', ref: dropRef, style: { minWidth: '280px' } },
            h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Cliente'),
            h('div', { className: 'relative' },
              h('input', { type: 'text', placeholder: 'Buscar cliente...',
                value: dropAberto ? buscaCliente : (clienteSel ? `${clienteSel.cod_cliente} — ${clienteSel.nome_display}` : buscaCliente),
                onFocus: () => { setDropAberto(true); setBuscaCliente(''); },
                onChange: e => { setBuscaCliente(e.target.value); setDropAberto(true); },
                className: 'border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-400 pr-8',
              }),
              filtros.codCliente && h('button', { onClick: (e) => { e.stopPropagation(); setFiltros(f => ({ ...f, codCliente: '', centroCusto: '' })); setBuscaCliente(''); },
                className: 'absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-sm' }, '✕'),
            ),
            dropAberto && h('div', { className: 'absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50' },
              clientesFiltrados.length === 0
                ? h('div', { className: 'px-4 py-3 text-sm text-gray-400 text-center' }, 'Nenhum encontrado')
                : clientesFiltrados.slice(0, 50).map(c =>
                    h('div', { key: c.cod_cliente, onClick: () => { setFiltros(f => ({ ...f, codCliente: String(c.cod_cliente), centroCusto: '' })); setBuscaCliente(''); setDropAberto(false); },
                      className: `px-4 py-2 cursor-pointer hover:bg-purple-50 flex items-center gap-2 text-sm ${String(filtros.codCliente) === String(c.cod_cliente) ? 'bg-purple-50 font-semibold' : ''}`,
                    },
                      h('span', { className: 'text-xs font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded' }, c.cod_cliente),
                      h('span', { className: 'text-gray-700 truncate' }, c.nome_display),
                    )
                  ),
            ),
          ),
          // CC dropdown
          h('div', { className: 'flex flex-col gap-1', style: { minWidth: '200px' } },
            h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Centro de Custo'),
            !filtros.codCliente
              ? h('select', { disabled: true, className: 'border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400' }, h('option', {}, 'Selecione um cliente'))
              : ccLoading
                ? h('div', { className: 'border rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50' }, '⏳')
                : h('select', { value: filtros.centroCusto, onChange: e => setFiltros(f => ({ ...f, centroCusto: e.target.value })),
                    className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
                    h('option', { value: '' }, 'Todos os centros'),
                    ...centrosCusto.map(cc => h('option', { key: cc.centro_custo, value: cc.centro_custo }, cc.centro_custo)),
                  ),
          ),
          h('button', { onClick: onExecutar, disabled: loading,
            className: `ml-auto px-5 py-2 rounded-lg text-sm font-semibold ${loading ? 'bg-gray-200 text-gray-400' : 'bg-purple-600 hover:bg-purple-700 text-white'}` },
            loading ? '⏳ Executando...' : '🔍 Buscar Performance'),
        ),
        jobAtual && h('div', { className: `mt-3 text-xs ${jobAtual.status === 'executando' ? 'text-blue-600' : jobAtual.status === 'concluido' ? 'text-green-600' : 'text-yellow-600'}` },
          jobAtual.status === 'executando' ? '🤖 Playwright em execução...' : jobAtual.status === 'pendente' ? '⏳ Na fila...' : ''),
      ),

      // Resultados
      snap && h('div', { className: 'space-y-4' },
        h('p', { className: 'text-xs text-gray-400' }, `Atualização: ${fmtDT(snap.criado_em)} — Período: ${fmtData(snap.data_inicio)}${snap.data_inicio !== snap.data_fim ? ` → ${fmtData(snap.data_fim)}` : ''}`),
        h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
          h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-4 text-center' }, h('p', { className: 'text-3xl font-black text-purple-900' }, snap.total_os), h('p', { className: 'text-xs text-purple-600 font-semibold uppercase' }, 'Total OS')),
          h('div', { className: 'bg-green-50 border border-green-200 rounded-xl p-4 text-center' }, h('p', { className: 'text-3xl font-black text-green-700' }, snap.no_prazo), h('p', { className: 'text-xs text-green-600 font-semibold uppercase' }, 'No Prazo')),
          h('div', { className: 'bg-red-50 border border-red-200 rounded-xl p-4 text-center' }, h('p', { className: 'text-3xl font-black text-red-700' }, snap.fora_prazo), h('p', { className: 'text-xs text-red-600 font-semibold uppercase' }, 'Fora')),
          h('div', { className: 'bg-gray-50 border border-gray-200 rounded-xl p-4 text-center' }, h('p', { className: 'text-3xl font-black text-gray-600' }, snap.sem_dados), h('p', { className: 'text-xs text-gray-500 font-semibold uppercase' }, 'Sem Dados')),
        ),
        // Por cliente
        porCliente.length > 0 && h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' },
          ...porCliente.map((c, i) => h(ClienteCard, { key: i, card: { nome_display: c.nome_cliente || `Cliente ${c.cod_cliente}`, cod_cliente: c.cod_cliente, snapshot: { total_os: c.total, no_prazo: c.no_prazo, fora_prazo: c.fora_prazo, sem_dados: c.sem_dados, pct_no_prazo: c.pct_no_prazo }, registros: registros.filter(r => r.cod_cliente === c.cod_cliente) }, onClick: () => setDetalhe({ ...c, nome_display: c.nome_cliente, snapshot: { total_os: c.total, no_prazo: c.no_prazo, fora_prazo: c.fora_prazo, sem_dados: c.sem_dados, pct_no_prazo: c.pct_no_prazo } }) })),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Configurações
  // ════════════════════════════════════════════════════════════
  function TabConfig({ API_URL, fetchAuth, showToast }) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clientes, setClientes] = useState([]);
    const [centrosCusto, setCentrosCusto] = useState([]);
    const [form, setForm] = useState({ codCliente: '', centroCusto: '' });
    const [buscaCliente, setBuscaCliente] = useState('');
    const [dropAberto, setDropAberto] = useState(false);
    const [ccLoading, setCcLoading] = useState(false);
    const dropRef = useRef(null);

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const r = await fetchAuth(`${API_URL}/performance/config`);
        const d = await r.json();
        setConfigs(d.configs || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [API_URL, fetchAuth]);

    useEffect(() => { carregar(); }, [carregar]);

    useEffect(() => {
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/clientes-por-regiao`);
          const data = await r.json();
          if (Array.isArray(data)) setClientes(data);
        } catch (e) {}
      })();
    }, [API_URL, fetchAuth]);

    useEffect(() => {
      if (!form.codCliente) { setCentrosCusto([]); return; }
      (async () => {
        setCcLoading(true);
        try {
          const r = await fetchAuth(`${API_URL}/bi/centros-custo/${form.codCliente}`);
          const data = await r.json();
          setCentrosCusto(Array.isArray(data) ? data : []);
        } catch (e) { setCentrosCusto([]); }
        setCcLoading(false);
      })();
    }, [form.codCliente, API_URL, fetchAuth]);

    useEffect(() => {
      const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropAberto(false); };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    const clientesFiltrados = buscaCliente.length > 0
      ? clientes.filter(c => String(c.cod_cliente).includes(buscaCliente) || (c.nome_display || '').toLowerCase().includes(buscaCliente.toLowerCase()))
      : clientes;
    const clienteSel = clientes.find(c => String(c.cod_cliente) === String(form.codCliente));

    const adicionar = async () => {
      if (!form.codCliente) { showToast('Selecione um cliente', 'error'); return; }
      try {
        const nome = clienteSel?.nome_display || `Cliente ${form.codCliente}`;
        const r = await fetchAuth(`${API_URL}/performance/config`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cod_cliente: parseInt(form.codCliente), nome_display: nome, centro_custo: form.centroCusto || null }),
        });
        const d = await r.json();
        if (d.success) { showToast('✅ Adicionado!', 'success'); setForm({ codCliente: '', centroCusto: '' }); setBuscaCliente(''); carregar(); }
        else showToast(d.error || 'Erro', 'error');
      } catch (e) { showToast('Erro de conexão', 'error'); }
    };

    const remover = async (id) => {
      try {
        await fetchAuth(`${API_URL}/performance/config/${id}`, { method: 'DELETE' });
        showToast('Removido', 'success');
        carregar();
      } catch (e) { showToast('Erro', 'error'); }
    };

    return h('div', { className: 'space-y-5' },
      // Adicionar
      h('div', { className: 'bg-white border rounded-xl shadow-sm p-5' },
        h('h3', { className: 'text-sm font-bold text-gray-700 uppercase mb-4' }, '➕ Adicionar Cliente ao Monitoramento'),
        h('div', { className: 'flex flex-wrap gap-4 items-end' },
          // Cliente dropdown
          h('div', { className: 'flex flex-col gap-1 relative', ref: dropRef, style: { minWidth: '300px' } },
            h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Cliente'),
            h('div', { className: 'relative' },
              h('input', { type: 'text', placeholder: 'Buscar cliente...',
                value: dropAberto ? buscaCliente : (clienteSel ? `${clienteSel.cod_cliente} — ${clienteSel.nome_display}` : buscaCliente),
                onFocus: () => { setDropAberto(true); setBuscaCliente(''); },
                onChange: e => { setBuscaCliente(e.target.value); setDropAberto(true); },
                className: 'border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-400 pr-8',
              }),
              form.codCliente && h('button', { onClick: () => { setForm({ codCliente: '', centroCusto: '' }); setBuscaCliente(''); },
                className: 'absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-sm' }, '✕'),
            ),
            dropAberto && h('div', { className: 'absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50' },
              clientesFiltrados.slice(0, 50).map(c =>
                h('div', { key: c.cod_cliente, onClick: () => { setForm(f => ({ ...f, codCliente: String(c.cod_cliente), centroCusto: '' })); setBuscaCliente(''); setDropAberto(false); },
                  className: `px-4 py-2 cursor-pointer hover:bg-purple-50 flex items-center gap-2 text-sm` },
                  h('span', { className: 'text-xs font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded' }, c.cod_cliente),
                  h('span', { className: 'truncate' }, c.nome_display),
                )
              ),
            ),
          ),
          // CC
          h('div', { className: 'flex flex-col gap-1', style: { minWidth: '200px' } },
            h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Centro de Custo'),
            !form.codCliente
              ? h('select', { disabled: true, className: 'border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400' }, h('option', {}, 'Selecione cliente'))
              : ccLoading
                ? h('div', { className: 'border rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50' }, '⏳')
                : h('select', { value: form.centroCusto, onChange: e => setForm(f => ({ ...f, centroCusto: e.target.value })),
                    className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
                    h('option', { value: '' }, 'Todos os centros'),
                    ...centrosCusto.map(cc => h('option', { key: cc.centro_custo, value: cc.centro_custo }, cc.centro_custo)),
                  ),
          ),
          h('button', { onClick: adicionar, className: 'px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700' }, '➕ Adicionar'),
        ),
      ),

      // Lista
      h('div', { className: 'bg-white border rounded-xl shadow-sm overflow-hidden' },
        h('div', { className: 'px-5 py-3 border-b bg-gray-50' },
          h('h3', { className: 'text-sm font-bold text-gray-700 uppercase' }, `📋 Clientes Monitorados (${configs.length})`),
        ),
        loading ? h('div', { className: 'p-6 text-center text-gray-400' }, '⏳ Carregando...')
        : configs.length === 0
          ? h('div', { className: 'p-6 text-center text-gray-400' }, 'Nenhum cliente configurado')
          : h('div', { className: 'divide-y' },
              ...configs.map(cfg =>
                h('div', { key: cfg.id, className: 'flex items-center gap-4 px-5 py-3 hover:bg-gray-50' },
                  h('div', { className: 'flex-1 min-w-0' },
                    h('p', { className: 'text-sm font-semibold text-gray-900' }, cfg.mascara || cfg.nome_display || `Cliente ${cfg.cod_cliente}`),
                    h('p', { className: 'text-xs text-gray-500' }, `Cód: ${cfg.cod_cliente}${cfg.centro_custo ? ` · CC: ${cfg.centro_custo}` : ' · Todos os centros'}`),
                  ),
                  h('button', { onClick: () => remover(cfg.id), className: 'px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-semibold' }, '🗑️ Remover'),
                )
              ),
            ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Jobs
  // ════════════════════════════════════════════════════════════
  function TabJobs({ API_URL, fetchAuth }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/performance/jobs`);
          const d = await r.json();
          setJobs(d.jobs || []);
        } catch (e) {}
        setLoading(false);
      })();
    }, [API_URL, fetchAuth]);

    return h('div', { className: 'bg-white border rounded-xl shadow-sm overflow-hidden' },
      h('div', { className: 'px-5 py-3 border-b bg-gray-50' },
        h('h3', { className: 'text-sm font-bold text-gray-700 uppercase' }, '🗂️ Histórico de Jobs'),
      ),
      loading ? h('div', { className: 'p-6 text-center text-gray-400' }, '⏳')
      : h('div', { className: 'overflow-x-auto' },
          h('table', { className: 'w-full text-sm' },
            h('thead', {}, h('tr', { className: 'bg-gray-50 text-xs uppercase text-gray-500' },
              h('th', { className: 'px-3 py-2 text-left' }, 'ID'),
              h('th', { className: 'px-3 py-2' }, 'Status'),
              h('th', { className: 'px-3 py-2' }, 'Período'),
              h('th', { className: 'px-3 py-2' }, 'Cliente'),
              h('th', { className: 'px-3 py-2' }, 'CC'),
              h('th', { className: 'px-3 py-2' }, 'OS'),
              h('th', { className: 'px-3 py-2' }, 'Origem'),
              h('th', { className: 'px-3 py-2' }, 'Início'),
              h('th', { className: 'px-3 py-2' }, 'Fim'),
            )),
            h('tbody', {},
              ...jobs.map(j => {
                const st = JOB_STATUS[j.status] || { label: j.status, cls: 'bg-gray-100' };
                return h('tr', { key: j.id, className: 'border-t hover:bg-gray-50' },
                  h('td', { className: 'px-3 py-2 font-mono text-xs text-gray-500' }, `#${j.id}`),
                  h('td', { className: 'px-3 py-2 text-center' }, h('span', { className: `px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}` }, st.label)),
                  h('td', { className: 'px-3 py-2 text-xs' }, `${fmtData(j.data_inicio)} → ${fmtData(j.data_fim)}`),
                  h('td', { className: 'px-3 py-2 text-xs text-gray-600' }, j.cod_cliente || 'Todos'),
                  h('td', { className: 'px-3 py-2 text-xs text-gray-500' }, j.centro_custo || '—'),
                  h('td', { className: 'px-3 py-2 text-center text-xs font-semibold' }, j.total_os || '—'),
                  h('td', { className: 'px-3 py-2 text-xs' }, j.origem),
                  h('td', { className: 'px-3 py-2 text-xs text-gray-400' }, fmtDT(j.iniciado_em)),
                  h('td', { className: 'px-3 py-2 text-xs text-gray-400' }, fmtDT(j.concluido_em)),
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
    const { API_URL, fetchAuth, showToast, perfTab } = initialProps;

    // perfTab vem do app.js via props
    const aba = perfTab || 'dashboard';

    return h('div', { className: 'space-y-5' },
      aba === 'dashboard' && h(TabDashboard, { API_URL, fetchAuth, showToast }),
      aba === 'busca' && h(TabBusca, { API_URL, fetchAuth, showToast }),
      aba === 'config' && h(TabConfig, { API_URL, fetchAuth, showToast }),
      aba === 'jobs' && h(TabJobs, { API_URL, fetchAuth }),
    );
  }

  // ════════════════════════════════════════════════════════════
  // EXPORT
  // ════════════════════════════════════════════════════════════
  window.ModuloPerformanceComponent = function ModuloPerformanceWrapper(props) {
    const containerRef = useRef(null);
    const propsRef = useRef(props);

    // Atualizar props ref quando mudam (principalmente perfTab)
    useEffect(() => { propsRef.current = props; });

    // Re-render quando perfTab muda
    useEffect(() => {
      if (!containerRef.current) return;
      ReactDOM.render(
        h(ModuloPerformanceDiaria, { initialProps: props }),
        containerRef.current
      );
    }, [props.perfTab]);

    // Mount
    useEffect(() => {
      if (!containerRef.current) return;
      ReactDOM.render(
        h(ModuloPerformanceDiaria, { initialProps: props }),
        containerRef.current
      );
      return () => {
        if (containerRef.current) ReactDOM.unmountComponentAtNode(containerRef.current);
      };
    }, []);

    return h('div', { ref: containerRef });
  };

  console.log('✅ Módulo Performance Diária v2.0 carregado');
})();
