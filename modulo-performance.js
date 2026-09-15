/* DEEMOJI_V1 */
// ================================================================
// MÓDULO PERFORMANCE DIÁRIA - Tutts v3.0 (DERIVADO DO BI)
// Arquivo: modulo-performance.js
// ----------------------------------------------------------------
// MUDANÇA v3.0: o SLA não é mais capturado cliente-a-cliente via RPA.
// Agora é DERIVADO de bi_entregas (mesma base e regra de prazo do BI).
// - Escopos: Cliente avulso OU Região herdada do BI (bi_regioes).
// - "Forçar Atualização" → dispara o import do BI (puxa planilha → BI).
// 4 abas: Dashboard · Busca · Configurações · Importações
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
  function fmtMin(min) {
    if (min == null || isNaN(min)) return '—';
    const m = Math.abs(Math.round(min));
    return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`;
  }
  function corPct(pct) {
    if (pct >= 90) return { text: 'text-green-600', bg: 'bg-green-50', bar: '#22c55e', ring: 'border-green-400' };
    if (pct >= 75) return { text: 'text-yellow-600', bg: 'bg-yellow-50', bar: '#eab308', ring: 'border-yellow-400' };
    return { text: 'text-red-600', bg: 'bg-red-50', bar: '#ef4444', ring: 'border-red-400' };
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Card de escopo (cliente ou região) no Dashboard
  // ════════════════════════════════════════════════════════════
  function ClienteCard({ card, onClick }) {
    const snap = card.snapshot || { total_os: 0, no_prazo: 0, fora_prazo: 0, sem_dados: 0, pct_no_prazo: 0 };
    const pct = parseFloat(snap.pct_no_prazo || 0);
    const c = corPct(pct);
    const total = snap.total_os || 0;
    const isRegiao = card.tipo === 'regiao';

    return h('div', {
      onClick,
      className: `bg-white border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden ${total > 0 ? '' : 'opacity-60'}`,
    },
      h('div', { className: 'h-1.5', style: { background: total > 0 ? c.bar : '#d1d5db' } }),
      h('div', { className: 'p-4' },
        // Nome + tipo/escopo
        h('div', { className: 'mb-3' },
          h('div', { className: 'flex items-center gap-2' },
            h('p', { className: 'text-sm font-bold text-gray-900 truncate flex-1' }, card.nome_display),
            isRegiao
              ? h('span', { className: 'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 inline-flex items-center gap-1' },
                  h('svg', { className: 'ico', style: { width: 12, height: 12 }, 'aria-hidden': 'true' }, h('use', { href: '#i-map' })), 'Região')
              : h('span', { className: 'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500' }, 'Cliente'),
          ),
          isRegiao
            ? h('p', { className: 'text-xs text-purple-600 font-medium' }, `${card.qtd_itens} cliente${card.qtd_itens === 1 ? '' : 's'}/CC`)
            : (card.centro_custo
                ? h('p', { className: 'text-xs text-purple-600 font-medium truncate' }, card.centro_custo)
                : h('p', { className: 'text-xs text-gray-400' }, 'Todos os centros')),
        ),

        total > 0
          ? h('div', {},
              h('div', { className: 'flex items-end justify-between mb-3' },
                h('span', { className: `text-3xl font-black ${c.text}` }, `${pct}%`),
                h('span', { className: 'text-xs text-gray-400' }, `${total} OS`),
              ),
              h('div', { className: 'w-full h-2 rounded-full overflow-hidden bg-gray-100 flex mb-3' },
                h('div', { style: { width: `${(snap.no_prazo / total) * 100}%`, background: '#22c55e' } }),
                h('div', { style: { width: `${(snap.fora_prazo / total) * 100}%`, background: '#ef4444' } }),
                h('div', { style: { width: `${(snap.sem_dados / total) * 100}%`, background: '#d1d5db' } }),
              ),
              h('div', { className: 'flex justify-between text-xs' },
                h('span', { className: 'text-green-600 font-semibold' }, `${snap.no_prazo}`),
                h('span', { className: 'text-red-500 font-semibold' }, `${snap.fora_prazo}`),
                h('span', { className: 'text-gray-400' }, `${snap.sem_dados}`),
              ),
            )
          : h('div', { className: 'text-center py-4' },
              h('p', { className: 'text-gray-400 text-sm' }, 'Sem dados no período'),
              h('p', { className: 'text-xs text-gray-300' }, 'Importe o BI ou ajuste as datas'),
            ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE: Detalhe do escopo (OS individuais, vindas de bi_entregas)
  // ════════════════════════════════════════════════════════════
  function DetalheCliente({ card, periodo, API_URL, fetchAuth, onVoltar }) {
    const [filtro, setFiltro] = useState('todos');
    const [busca, setBusca] = useState('');
    const [dados, setDados] = useState({ registros: [], por_cliente: [], titulo: card.nome_display });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let vivo = true;
      (async () => {
        setLoading(true);
        try {
          const qs = new URLSearchParams({ data_inicio: periodo.inicio, data_fim: periodo.fim });
          if (card.config?.id) qs.set('config_id', card.config.id);
          else if (card.regiao_id) qs.set('regiao_id', card.regiao_id);
          else if (card.cod_cliente != null) {
            qs.set('cod_cliente', card.cod_cliente);
            if (card.centro_custo) qs.set('centro_custo', card.centro_custo);
          }
          const r = await fetchAuth(`${API_URL}/performance/detalhe?${qs.toString()}`);
          const d = await r.json();
          if (vivo) setDados({ registros: d.registros || [], por_cliente: d.por_cliente || [], titulo: d.titulo || card.nome_display });
        } catch (e) { console.error(e); }
        if (vivo) setLoading(false);
      })();
      return () => { vivo = false; };
    }, [card, periodo, API_URL, fetchAuth]);

    const registros = dados.registros;
    const snap = card.snapshot || { total_os: 0, no_prazo: 0, fora_prazo: 0, sem_dados: 0, pct_no_prazo: 0 };
    const pct = parseFloat(snap.pct_no_prazo || 0);
    const c = corPct(pct);

    const filtrados = registros.filter(r => {
      if (filtro === 'no_prazo'   && r.dentro_prazo !== true)  return false;
      if (filtro === 'fora_prazo' && r.dentro_prazo !== false) return false;
      if (filtro === 'sem_dados'  && r.dentro_prazo != null)   return false;
      if (busca) {
        const s = busca.toLowerCase();
        const alvo = `${r.os || ''} ${r.nome_fantasia || ''} ${r.nome_cliente || ''} ${r.nome_prof || ''}`.toLowerCase();
        if (!alvo.includes(s)) return false;
      }
      return true;
    });

    const isRegiao = card.tipo === 'regiao';

    return h('div', { className: 'space-y-4' },
      // Voltar + Header
      h('div', { className: 'flex items-center gap-4' },
        h('button', { onClick: onVoltar, className: 'p-2 hover:bg-gray-100 rounded-lg text-sm font-semibold text-gray-600' }, '← Voltar'),
        h('div', { className: 'flex-1' },
          h('h2', { className: 'text-lg font-bold text-gray-900' }, dados.titulo),
          isRegiao
            ? h('p', { className: 'text-sm text-purple-600' }, `Região · ${card.qtd_itens} cliente${card.qtd_itens === 1 ? '' : 's'}/CC · ${fmtData(periodo.inicio)} → ${fmtData(periodo.fim)}`)
            : (card.centro_custo && h('p', { className: 'text-sm text-purple-600' }, card.centro_custo)),
        ),
        h('div', { className: 'text-right' },
          h('span', { className: `text-3xl font-black ${c.text}` }, `${pct}%`),
          h('p', { className: 'text-xs text-gray-400' }, `${snap.total_os} OS`),
        ),
      ),

      // KPIs
      h('div', { className: 'grid grid-cols-4 gap-3' },
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
      h('div', { className: 'bg-white border rounded-xl p-4' },
        h('div', { className: 'flex items-center justify-between mb-2' },
          h('span', { className: 'text-sm font-bold text-gray-700' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-chart' })), 'SLA Geral')),
          h('span', { className: `text-xl font-black ${c.text}` }, `${pct}%`),
        ),
        h('div', { className: 'w-full h-4 rounded-full overflow-hidden bg-gray-100 flex' },
          snap.total_os > 0 && h('div', { style: { width: `${(snap.no_prazo / snap.total_os) * 100}%`, background: '#22c55e' } }),
          snap.total_os > 0 && h('div', { style: { width: `${(snap.fora_prazo / snap.total_os) * 100}%`, background: '#ef4444' } }),
          snap.total_os > 0 && h('div', { style: { width: `${(snap.sem_dados / snap.total_os) * 100}%`, background: '#d1d5db' } }),
        ),
      ),

      // Breakdown por cliente (só faz sentido quando é região com vários clientes)
      isRegiao && dados.por_cliente.length > 1 && h('div', { className: 'bg-white border rounded-xl shadow-sm overflow-hidden' },
        h('div', { className: 'px-4 py-3 border-b' },
          h('h3', { className: 'text-sm font-bold text-gray-700 uppercase' }, 'Por cliente na região'),
        ),
        h('div', { className: 'divide-y' },
          ...dados.por_cliente.map((cl, i) => {
            const cc = corPct(cl.pct_no_prazo);
            return h('div', { key: i, className: 'px-4 py-2.5 flex items-center gap-3' },
              h('span', { className: 'text-xs font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded' }, cl.cod_cliente),
              h('span', { className: 'flex-1 text-sm text-gray-700 truncate' }, cl.nome_cliente),
              h('span', { className: 'text-xs text-gray-400' }, `${cl.total} OS`),
              h('div', { className: 'w-24 h-2 rounded-full overflow-hidden bg-gray-100 flex' },
                cl.total > 0 && h('div', { style: { width: `${(cl.no_prazo / cl.total) * 100}%`, background: '#22c55e' } }),
                cl.total > 0 && h('div', { style: { width: `${(cl.fora_prazo / cl.total) * 100}%`, background: '#ef4444' } }),
                cl.total > 0 && h('div', { style: { width: `${(cl.sem_dados / cl.total) * 100}%`, background: '#d1d5db' } }),
              ),
              h('span', { className: `text-sm font-black w-14 text-right ${cc.text}` }, `${cl.pct_no_prazo}%`),
            );
          }),
        ),
      ),

      // Tabela de OS
      h('div', { className: 'bg-white border rounded-xl shadow-sm overflow-hidden' },
        h('div', { className: 'px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2' },
          h('h3', { className: 'text-sm font-bold text-gray-700 uppercase' }, `Detalhamento por OS (${registros.length})`),
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
            const labels = { todos: 'Todos', no_prazo: 'No Prazo', fora_prazo: 'Fora', sem_dados: 'Sem Dados' };
            const ativo = filtro === f;
            return h('button', {
              key: f, onClick: () => setFiltro(f),
              className: `px-3 py-1 rounded-full text-xs font-semibold transition-all ${ativo ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
            }, labels[f]);
          }),
        ),
        loading
          ? h('div', { className: 'text-center py-10 text-gray-400 text-sm' }, 'Carregando OS...')
          : h('div', { className: 'overflow-x-auto', style: { maxHeight: '500px', overflowY: 'auto' } },
              h('table', { className: 'w-full text-sm' },
                h('thead', {},
                  h('tr', { className: 'bg-gray-50 text-xs uppercase text-gray-500 sticky top-0' },
                    h('th', { className: 'text-left px-3 py-2' }, 'OS'),
                    h('th', { className: 'text-left px-3 py-2' }, 'Cliente'),
                    h('th', { className: 'text-left px-3 py-2' }, 'Profissional'),
                    h('th', { className: 'text-center px-3 py-2' }, 'KM'),
                    h('th', { className: 'text-center px-3 py-2' }, 'Prazo'),
                    h('th', { className: 'text-center px-3 py-2' }, 'Execução'),
                    h('th', { className: 'text-center px-3 py-2' }, 'SLA'),
                  ),
                ),
                h('tbody', {},
                  ...filtrados.slice(0, 500).map((r, i) => {
                    const semDados = r.dentro_prazo == null;
                    const slaClass = semDados ? 'text-gray-400' : r.dentro_prazo ? 'text-green-600' : 'text-red-600';
                    const slaLabel = semDados
                      ? '—'
                      : r.dentro_prazo
                        ? h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16, color: '#16a34a' }, 'aria-hidden': 'true' }, h('use', { href: '#i-check' })), 'No prazo')
                        : h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-x' })), 'Fora');
                    return h('tr', { key: i, className: `border-t hover:bg-gray-50 ${r.dentro_prazo === false ? 'bg-red-50/30' : ''}` },
                      h('td', { className: 'px-3 py-2 font-mono text-purple-700 text-xs' }, r.os),
                      h('td', { className: 'px-3 py-2 text-gray-600 text-xs max-w-[200px] truncate' }, r.nome_fantasia || r.nome_cliente || ''),
                      h('td', { className: 'px-3 py-2 text-gray-500 text-xs' }, r.nome_prof || '—'),
                      h('td', { className: 'px-3 py-2 text-center text-xs' }, r.distancia ? `${parseFloat(r.distancia).toFixed(1)} km` : '—'),
                      h('td', { className: 'px-3 py-2 text-center text-xs' }, fmtMin(r.prazo_minutos)),
                      h('td', { className: 'px-3 py-2 text-center text-xs' }, fmtMin(r.tempo_execucao_minutos)),
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
  // ABA: Dashboard (cards por escopo configurado)
  // ════════════════════════════════════════════════════════════
  function TabDashboard({ API_URL, fetchAuth, showToast }) {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState({ inicio: hoje(), fim: hoje() });
    const [detalhe, setDetalhe] = useState(null);
    const [importId, setImportId] = useState(null);
    const [importEtapa, setImportEtapa] = useState('');
    const [ultima, setUltima] = useState(null);
    const pollingRef = useRef(null);

    const carregar = useCallback(async () => {
      try {
        const r = await fetchAuth(`${API_URL}/performance/dashboard?data_inicio=${periodo.inicio}&data_fim=${periodo.fim}`);
        const d = await r.json();
        setCards(d.cards || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    }, [API_URL, fetchAuth, periodo]);

    const carregarUltima = useCallback(async () => {
      try {
        const r = await fetchAuth(`${API_URL}/performance/ultima-importacao`);
        const d = await r.json();
        setUltima(d.ultima || null);
      } catch (e) { /* silencioso */ }
    }, [API_URL, fetchAuth]);

    useEffect(() => { setLoading(true); carregar(); }, [carregar]);
    useEffect(() => { carregarUltima(); }, [carregarUltima]);

    // ── POLLING do import forçado ──
    useEffect(() => {
      if (!importId) {
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        return;
      }
      if (pollingRef.current) return;
      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetchAuth(`${API_URL}/performance/import-status/${importId}`);
          const d = await r.json();
          const imp = d.import;
          if (!imp) return;
          setImportEtapa(imp.etapa_atual || imp.status || '');
          if (imp.status === 'sucesso' || imp.status === 'falhou') {
            clearInterval(pollingRef.current); pollingRef.current = null;
            setImportId(null);
            setImportEtapa('');
            if (imp.status === 'sucesso') {
              showToast(`✅ Importação concluída — ${imp.linhas_inseridas || 0} OS atualizadas`, 'success');
              carregar();
              carregarUltima();
            } else {
              showToast(`❌ Importação falhou: ${(imp.erro || 'erro desconhecido').slice(0, 120)}`, 'error');
            }
          }
        } catch (e) { /* ignora erro de polling */ }
      }, 5000);
      return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
    }, [importId, API_URL, fetchAuth, carregar, carregarUltima, showToast]);

    useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

    // Botão "Forçar Atualização" → dispara import do BI
    const forcarImport = async () => {
      try {
        showToast('🚀 Puxando planilha e alimentando o BI...', 'info');
        const r = await fetchAuth(`${API_URL}/performance/forcar-import`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),  // default D-1
        });
        const d = await r.json();
        if (d.import_id) {
          setImportId(d.import_id);
          setImportEtapa(d.status || 'pendente');
          if (d.ja_existia) showToast('Já havia uma importação em andamento — acompanhando...', 'info');
        } else {
          showToast(d.error || 'Não foi possível iniciar a importação', 'error');
        }
      } catch (e) { showToast('Erro de conexão', 'error'); }
    };

    if (detalhe) return h(DetalheCliente, { card: detalhe, periodo, API_URL, fetchAuth, onVoltar: () => { setDetalhe(null); carregar(); } });

    const importando = !!importId;

    return h('div', { className: 'space-y-5', style: { position: 'relative' } },
      h('style', {}, `
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes argosWave { 0%, 100% { height: 5px; } 50% { height: 52px; } }
        @keyframes argosSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `),

      // ── OVERLAY ARGOS (durante import) ──
      importando && h('div', {
        style: {
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99999,
          background: 'rgba(15, 14, 26, 0.88)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '36px',
        }
      },
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
        h('div', { style: { textAlign: 'center', animation: 'argosSlideUp .6s ease-out both' } },
          h('div', { style: { fontSize: '12px', color: '#7C3AED', letterSpacing: '4px', marginBottom: '10px' } }, 'ARGOS INTELLIGENCE'),
          h('div', { style: { fontSize: '20px', fontWeight: 500, color: '#e2e0f0' } }, 'Importando base do sistema externo'),
          h('div', { style: { fontSize: '14px', color: '#6b6890', marginTop: '10px' } },
            `Puxando planilha → alimentando o BI${importEtapa ? ' · ' + importEtapa : ''}`),
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
        h('button', { onClick: carregar, className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700' },
          h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-refresh' })), 'Recarregar')),
        h('button', { onClick: forcarImport, disabled: importando,
          className: `px-4 py-2 rounded-lg text-sm font-semibold ${importando ? 'bg-gray-200 text-gray-400' : 'bg-green-600 hover:bg-green-700 text-white'}` },
          importando ? 'Importando...' : 'Forçar Atualização'),
        // Info
        h('div', { className: 'flex flex-col gap-0.5 ml-2' },
          h('span', { className: 'text-xs text-gray-400' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-clock' })), 'Import automático do BI: 12h diário')),
          ultima && h('span', { className: 'text-xs text-gray-400' },
            h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-chart' })), 'Última base: '),
            `${fmtData(ultima.data_referencia)} · importada ${fmtDT(ultima.finalizado_em)}`),
        ),
      ),

      // Cards
      loading
        ? h('div', { className: 'text-center py-10' }, h('span', { className: 'text-gray-400' }, h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-clock' })), 'Carregando...')))
        : cards.length === 0
          ? h('div', { className: 'bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center' },
              h('p', { className: 'text-4xl mb-3' }, h('svg', { className: 'ico', style: { width: 38, height: 38 }, 'aria-hidden': 'true' }, h('use', { href: '#i-settings' }))),
              h('p', { className: 'text-gray-600 font-semibold' }, 'Nenhum escopo configurado'),
              h('p', { className: 'text-gray-400 text-sm mt-1' }, 'Vá na aba "Configurações" para adicionar um cliente ou herdar uma região do BI'),
            )
          : h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' },
              ...cards.map((card, i) => h(ClienteCard, { key: i, card, onClick: () => setDetalhe(card) })),
            ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Busca (consulta ad-hoc por cliente/região + período)
  // ════════════════════════════════════════════════════════════
  function TabBusca({ API_URL, fetchAuth, showToast }) {
    const [modo, setModo] = useState('cliente'); // 'cliente' | 'regiao'
    const [clientes, setClientes] = useState([]);
    const [regioes, setRegioes] = useState([]);
    const [centrosCusto, setCentrosCusto] = useState([]);
    const [filtros, setFiltros] = useState({ codCliente: '', centroCusto: '', regiaoId: '', inicio: hoje(), fim: hoje() });
    const [buscaCliente, setBuscaCliente] = useState('');
    const [dropAberto, setDropAberto] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const dropRef = useRef(null);

    useEffect(() => {
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/clientes-por-regiao`);
          const d = await r.json();
          if (Array.isArray(d)) setClientes(d);
        } catch (e) {}
        try {
          const r = await fetchAuth(`${API_URL}/performance/regioes`);
          const d = await r.json();
          setRegioes(d.regioes || []);
        } catch (e) {}
      })();
    }, [API_URL, fetchAuth]);

    useEffect(() => {
      if (!filtros.codCliente) { setCentrosCusto([]); return; }
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/centros-custo/${filtros.codCliente}`);
          const d = await r.json();
          setCentrosCusto(Array.isArray(d) ? d : []);
        } catch (e) { setCentrosCusto([]); }
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

    const buscar = async () => {
      const qs = new URLSearchParams({ data_inicio: filtros.inicio, data_fim: filtros.fim });
      let titulo = '';
      let tipo = modo;
      if (modo === 'regiao') {
        if (!filtros.regiaoId) { showToast('Selecione uma região', 'error'); return; }
        qs.set('regiao_id', filtros.regiaoId);
        titulo = (regioes.find(r => String(r.id) === String(filtros.regiaoId)) || {}).nome || 'Região';
      } else {
        if (!filtros.codCliente) { showToast('Selecione um cliente', 'error'); return; }
        qs.set('cod_cliente', filtros.codCliente);
        if (filtros.centroCusto) qs.set('centro_custo', filtros.centroCusto);
        titulo = clienteSel?.nome_display || `Cliente ${filtros.codCliente}`;
      }
      setLoading(true);
      try {
        const r = await fetchAuth(`${API_URL}/performance/detalhe?${qs.toString()}`);
        const d = await r.json();
        // Monta um "card" compatível com DetalheCliente calculando o snapshot a partir dos registros
        const regs = d.registros || [];
        const total = regs.length;
        const no = regs.filter(x => x.dentro_prazo === true).length;
        const fora = regs.filter(x => x.dentro_prazo === false).length;
        const sem = regs.filter(x => x.dentro_prazo == null).length;
        const analisados = total - sem;
        const pct = analisados > 0 ? parseFloat(((no / analisados) * 100).toFixed(2)) : 0;
        setResultado({
          titulo: d.titulo || titulo,
          registros: regs,
          por_cliente: d.por_cliente || [],
          tipo,
          qtd_itens: modo === 'regiao' ? ((regioes.find(r => String(r.id) === String(filtros.regiaoId)) || {}).qtd_itens || 0) : 1,
          centro_custo: filtros.centroCusto || null,
          snapshot: { total_os: total, no_prazo: no, fora_prazo: fora, sem_dados: sem, pct_no_prazo: pct },
        });
      } catch (e) { showToast('Erro na busca', 'error'); }
      setLoading(false);
    };

    // Reusa a renderização de detalhe (mas com dados já em memória)
    if (resultado) {
      const snap = resultado.snapshot;
      const pct = parseFloat(snap.pct_no_prazo || 0);
      const c = corPct(pct);
      const filtrados = resultado.registros;
      return h('div', { className: 'space-y-4' },
        h('div', { className: 'flex items-center gap-4' },
          h('button', { onClick: () => setResultado(null), className: 'p-2 hover:bg-gray-100 rounded-lg text-sm font-semibold text-gray-600' }, '← Nova busca'),
          h('div', { className: 'flex-1' },
            h('h2', { className: 'text-lg font-bold text-gray-900' }, resultado.titulo),
            h('p', { className: 'text-sm text-purple-600' }, `${fmtData(filtros.inicio)} → ${fmtData(filtros.fim)}`),
          ),
          h('div', { className: 'text-right' },
            h('span', { className: `text-3xl font-black ${c.text}` }, `${pct}%`),
            h('p', { className: 'text-xs text-gray-400' }, `${snap.total_os} OS`),
          ),
        ),
        h('div', { className: 'grid grid-cols-4 gap-3' },
          h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3 text-center' }, h('p', { className: 'text-2xl font-black text-purple-900' }, snap.total_os), h('p', { className: 'text-xs text-purple-600 font-semibold uppercase' }, 'Total OS')),
          h('div', { className: 'bg-green-50 border border-green-200 rounded-xl p-3 text-center' }, h('p', { className: 'text-2xl font-black text-green-700' }, snap.no_prazo), h('p', { className: 'text-xs text-green-600 font-semibold uppercase' }, 'No Prazo')),
          h('div', { className: 'bg-red-50 border border-red-200 rounded-xl p-3 text-center' }, h('p', { className: 'text-2xl font-black text-red-700' }, snap.fora_prazo), h('p', { className: 'text-xs text-red-600 font-semibold uppercase' }, 'Fora')),
          h('div', { className: 'bg-gray-50 border border-gray-200 rounded-xl p-3 text-center' }, h('p', { className: 'text-2xl font-black text-gray-600' }, snap.sem_dados), h('p', { className: 'text-xs text-gray-500 font-semibold uppercase' }, 'Sem Dados')),
        ),
        h('div', { className: 'bg-white border rounded-xl shadow-sm overflow-hidden' },
          h('div', { className: 'px-4 py-3 border-b' }, h('h3', { className: 'text-sm font-bold text-gray-700 uppercase' }, `Detalhamento por OS (${filtrados.length})`)),
          h('div', { className: 'overflow-x-auto', style: { maxHeight: '520px', overflowY: 'auto' } },
            h('table', { className: 'w-full text-sm' },
              h('thead', {}, h('tr', { className: 'bg-gray-50 text-xs uppercase text-gray-500 sticky top-0' },
                h('th', { className: 'text-left px-3 py-2' }, 'OS'),
                h('th', { className: 'text-left px-3 py-2' }, 'Cliente'),
                h('th', { className: 'text-left px-3 py-2' }, 'Profissional'),
                h('th', { className: 'text-center px-3 py-2' }, 'KM'),
                h('th', { className: 'text-center px-3 py-2' }, 'Prazo'),
                h('th', { className: 'text-center px-3 py-2' }, 'Execução'),
                h('th', { className: 'text-center px-3 py-2' }, 'SLA'),
              )),
              h('tbody', {}, ...filtrados.slice(0, 500).map((r, i) => {
                const semDados = r.dentro_prazo == null;
                const slaClass = semDados ? 'text-gray-400' : r.dentro_prazo ? 'text-green-600' : 'text-red-600';
                const slaLabel = semDados ? '—' : r.dentro_prazo
                  ? h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16, color: '#16a34a' }, 'aria-hidden': 'true' }, h('use', { href: '#i-check' })), 'No prazo')
                  : h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-x' })), 'Fora');
                return h('tr', { key: i, className: `border-t hover:bg-gray-50 ${r.dentro_prazo === false ? 'bg-red-50/30' : ''}` },
                  h('td', { className: 'px-3 py-2 font-mono text-purple-700 text-xs' }, r.os),
                  h('td', { className: 'px-3 py-2 text-gray-600 text-xs max-w-[200px] truncate' }, r.nome_fantasia || r.nome_cliente || ''),
                  h('td', { className: 'px-3 py-2 text-gray-500 text-xs' }, r.nome_prof || '—'),
                  h('td', { className: 'px-3 py-2 text-center text-xs' }, r.distancia ? `${parseFloat(r.distancia).toFixed(1)} km` : '—'),
                  h('td', { className: 'px-3 py-2 text-center text-xs' }, fmtMin(r.prazo_minutos)),
                  h('td', { className: 'px-3 py-2 text-center text-xs' }, fmtMin(r.tempo_execucao_minutos)),
                  h('td', { className: `px-3 py-2 text-center text-xs font-bold ${slaClass}` }, slaLabel),
                );
              })),
            ),
          ),
        ),
      );
    }

    return h('div', { className: 'space-y-5' },
      h('div', { className: 'bg-white border rounded-xl shadow-sm p-5' },
        h('div', { className: 'flex gap-2 mb-4' },
          ['cliente', 'regiao'].map(m => h('button', {
            key: m, onClick: () => setModo(m),
            className: `px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${modo === m ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
          }, m === 'cliente' ? 'Por Cliente' : 'Por Região')),
        ),
        h('div', { className: 'flex flex-wrap gap-4 items-end' },
          modo === 'cliente'
            ? h('div', { className: 'flex flex-col gap-1 relative', ref: dropRef, style: { minWidth: '300px' } },
                h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Cliente'),
                h('div', { className: 'relative' },
                  h('input', { type: 'text', placeholder: 'Buscar cliente...',
                    value: dropAberto ? buscaCliente : (clienteSel ? `${clienteSel.cod_cliente} — ${clienteSel.nome_display}` : buscaCliente),
                    onFocus: () => { setDropAberto(true); setBuscaCliente(''); },
                    onChange: e => { setBuscaCliente(e.target.value); setDropAberto(true); },
                    className: 'border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-400',
                  }),
                ),
                dropAberto && h('div', { className: 'absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50' },
                  clientesFiltrados.slice(0, 50).map(c =>
                    h('div', { key: c.cod_cliente, onClick: () => { setFiltros(f => ({ ...f, codCliente: String(c.cod_cliente), centroCusto: '' })); setBuscaCliente(''); setDropAberto(false); },
                      className: 'px-4 py-2 cursor-pointer hover:bg-purple-50 flex items-center gap-2 text-sm' },
                      h('span', { className: 'text-xs font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded' }, c.cod_cliente),
                      h('span', { className: 'truncate' }, c.nome_display),
                    ),
                  ),
                ),
              )
            : h('div', { className: 'flex flex-col gap-1', style: { minWidth: '300px' } },
                h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Região (do BI)'),
                h('select', { value: filtros.regiaoId, onChange: e => setFiltros(f => ({ ...f, regiaoId: e.target.value })),
                  className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
                  h('option', { value: '' }, 'Selecione...'),
                  ...regioes.map(r => h('option', { key: r.id, value: r.id }, `${r.nome} (${r.qtd_itens})`)),
                ),
              ),

          modo === 'cliente' && filtros.codCliente && h('div', { className: 'flex flex-col gap-1', style: { minWidth: '220px' } },
            h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Centro de Custo'),
            h('select', { value: filtros.centroCusto, onChange: e => setFiltros(f => ({ ...f, centroCusto: e.target.value })),
              className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
              h('option', { value: '' }, 'Todos'),
              ...centrosCusto.map((cc, i) => h('option', { key: i, value: cc.centro_custo }, cc.centro_custo)),
            ),
          ),

          h('div', { className: 'flex flex-col gap-1' },
            h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Data Inicial'),
            h('input', { type: 'date', value: filtros.inicio, onChange: e => setFiltros(f => ({ ...f, inicio: e.target.value })),
              className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' }),
          ),
          h('div', { className: 'flex flex-col gap-1' },
            h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Data Final'),
            h('input', { type: 'date', value: filtros.fim, onChange: e => setFiltros(f => ({ ...f, fim: e.target.value })),
              className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' }),
          ),
          h('button', { onClick: buscar, disabled: loading,
            className: `px-5 py-2 rounded-lg text-sm font-semibold ${loading ? 'bg-gray-200 text-gray-400' : 'bg-purple-600 hover:bg-purple-700 text-white'}` },
            loading ? 'Buscando...' : 'Buscar'),
        ),
      ),
      h('div', { className: 'bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-700' },
        h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-chart' })),
          'O SLA vem direto da base do BI (bi_entregas) — mesma regra de prazo por faixa configurada no BI.'),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Configurações (cadastro de escopo: cliente OU região)
  // ════════════════════════════════════════════════════════════
  function TabConfig({ API_URL, fetchAuth, showToast }) {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modo, setModo] = useState('cliente'); // 'cliente' | 'regiao'
    const [clientes, setClientes] = useState([]);
    const [regioes, setRegioes] = useState([]);
    const [centrosCusto, setCentrosCusto] = useState([]);
    const [form, setForm] = useState({ codCliente: '', centroCusto: '', regiaoId: '' });
    const [buscaCliente, setBuscaCliente] = useState('');
    const [dropAberto, setDropAberto] = useState(false);
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
          const d = await r.json();
          if (Array.isArray(d)) setClientes(d);
        } catch (e) {}
        try {
          const r = await fetchAuth(`${API_URL}/performance/regioes`);
          const d = await r.json();
          setRegioes(d.regioes || []);
        } catch (e) {}
      })();
    }, [API_URL, fetchAuth]);

    useEffect(() => {
      if (!form.codCliente) { setCentrosCusto([]); return; }
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/centros-custo/${form.codCliente}`);
          const d = await r.json();
          setCentrosCusto(Array.isArray(d) ? d : []);
        } catch (e) { setCentrosCusto([]); }
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
      try {
        let body;
        if (modo === 'regiao') {
          if (!form.regiaoId) { showToast('Selecione uma região', 'error'); return; }
          body = { tipo: 'regiao', regiao_id: parseInt(form.regiaoId, 10) };
        } else {
          if (!form.codCliente) { showToast('Selecione um cliente', 'error'); return; }
          body = { tipo: 'cliente', cod_cliente: parseInt(form.codCliente, 10), centro_custo: form.centroCusto || null, nome_display: clienteSel?.nome_display || null };
        }
        const r = await fetchAuth(`${API_URL}/performance/config`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const d = await r.json();
        if (d.success) { showToast('✅ Adicionado!', 'success'); setForm({ codCliente: '', centroCusto: '', regiaoId: '' }); setBuscaCliente(''); carregar(); }
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
        h('h3', { className: 'text-sm font-bold text-gray-700 uppercase mb-4' },
          h('span', { className: 'inline-flex items-center gap-1.5' }, h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-plus' })), 'Adicionar escopo ao monitoramento')),
        h('div', { className: 'flex gap-2 mb-4' },
          ['cliente', 'regiao'].map(m => h('button', {
            key: m, onClick: () => { setModo(m); setForm({ codCliente: '', centroCusto: '', regiaoId: '' }); },
            className: `px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${modo === m ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
          }, m === 'cliente' ? 'Cliente avulso' : 'Herdar região do BI')),
        ),
        h('div', { className: 'flex flex-wrap gap-4 items-end' },
          modo === 'cliente'
            ? [
                h('div', { key: 'cli', className: 'flex flex-col gap-1 relative', ref: dropRef, style: { minWidth: '300px' } },
                  h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Cliente'),
                  h('div', { className: 'relative' },
                    h('input', { type: 'text', placeholder: 'Buscar cliente...',
                      value: dropAberto ? buscaCliente : (clienteSel ? `${clienteSel.cod_cliente} — ${clienteSel.nome_display}` : buscaCliente),
                      onFocus: () => { setDropAberto(true); setBuscaCliente(''); },
                      onChange: e => { setBuscaCliente(e.target.value); setDropAberto(true); },
                      className: 'border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-400 pr-8',
                    }),
                    form.codCliente && h('button', { onClick: () => { setForm(f => ({ ...f, codCliente: '', centroCusto: '' })); setBuscaCliente(''); },
                      className: 'absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 text-sm' },
                      h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-x' }))),
                  ),
                  dropAberto && h('div', { className: 'absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto z-50' },
                    clientesFiltrados.slice(0, 50).map(c =>
                      h('div', { key: c.cod_cliente, onClick: () => { setForm(f => ({ ...f, codCliente: String(c.cod_cliente), centroCusto: '' })); setBuscaCliente(''); setDropAberto(false); },
                        className: 'px-4 py-2 cursor-pointer hover:bg-purple-50 flex items-center gap-2 text-sm' },
                        h('span', { className: 'text-xs font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded' }, c.cod_cliente),
                        h('span', { className: 'truncate' }, c.nome_display),
                      ),
                    ),
                  ),
                ),
                form.codCliente && h('div', { key: 'cc', className: 'flex flex-col gap-1', style: { minWidth: '220px' } },
                  h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Centro de Custo'),
                  h('select', { value: form.centroCusto, onChange: e => setForm(f => ({ ...f, centroCusto: e.target.value })),
                    className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
                    h('option', { value: '' }, 'Todos'),
                    ...centrosCusto.map((cc, i) => h('option', { key: i, value: cc.centro_custo }, cc.centro_custo)),
                  ),
                ),
              ]
            : h('div', { className: 'flex flex-col gap-1', style: { minWidth: '340px' } },
                h('label', { className: 'text-xs font-semibold text-gray-600 uppercase' }, 'Região (do BI)'),
                h('select', { value: form.regiaoId, onChange: e => setForm(f => ({ ...f, regiaoId: e.target.value })),
                  className: 'border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400' },
                  h('option', { value: '' }, 'Selecione uma região...'),
                  ...regioes.map(r => h('option', { key: r.id, value: r.id }, `${r.nome} — ${r.qtd_itens} cliente(s)/CC`)),
                ),
              ),

          h('button', { onClick: adicionar, className: 'px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700' }, 'Adicionar'),
        ),
        modo === 'regiao' && h('p', { className: 'text-xs text-gray-400 mt-3' },
          'A região é herdada do BI. Se você editar os clientes/CC dela lá, o Performance acompanha automaticamente.'),
      ),

      // Lista
      h('div', { className: 'bg-white border rounded-xl shadow-sm overflow-hidden' },
        h('div', { className: 'px-4 py-3 border-b' }, h('h3', { className: 'text-sm font-bold text-gray-700 uppercase' }, `Escopos monitorados (${configs.length})`)),
        loading
          ? h('div', { className: 'text-center py-8 text-gray-400 text-sm' }, 'Carregando...')
          : configs.length === 0
            ? h('div', { className: 'text-center py-8 text-gray-400 text-sm' }, 'Nenhum escopo cadastrado ainda')
            : h('div', { className: 'divide-y' },
                ...configs.map(cfg => h('div', { key: cfg.id, className: 'px-4 py-3 flex items-center gap-3' },
                  cfg.tipo === 'regiao'
                    ? h('span', { className: 'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700' }, 'Região')
                    : h('span', { className: 'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500' }, 'Cliente'),
                  h('div', { className: 'flex-1' },
                    h('p', { className: 'text-sm font-semibold text-gray-800' }, cfg.nome_display),
                    h('p', { className: 'text-xs text-gray-400' },
                      cfg.tipo === 'regiao'
                        ? `${cfg.qtd_itens} cliente(s)/CC`
                        : (cfg.centro_custo ? cfg.centro_custo : 'Todos os centros')),
                  ),
                  h('button', { onClick: () => remover(cfg.id), className: 'text-gray-400 hover:text-red-500 p-1.5' },
                    h('svg', { className: 'ico', style: { width: 16, height: 16 }, 'aria-hidden': 'true' }, h('use', { href: '#i-trash' }))),
                )),
              ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // ABA: Importações (status/força do import BI)
  // ════════════════════════════════════════════════════════════
  function TabJobs({ API_URL, fetchAuth, showToast }) {
    const [ultima, setUltima] = useState(null);
    const [importId, setImportId] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const pollingRef = useRef(null);

    const carregar = useCallback(async () => {
      try {
        const r = await fetchAuth(`${API_URL}/performance/ultima-importacao`);
        const d = await r.json();
        setUltima(d.ultima || null);
      } catch (e) {}
      setLoading(false);
    }, [API_URL, fetchAuth]);

    useEffect(() => { carregar(); }, [carregar]);

    useEffect(() => {
      if (!importId) { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } return; }
      if (pollingRef.current) return;
      pollingRef.current = setInterval(async () => {
        try {
          const r = await fetchAuth(`${API_URL}/performance/import-status/${importId}`);
          const d = await r.json();
          if (d.import) {
            setStatus(d.import);
            if (d.import.status === 'sucesso' || d.import.status === 'falhou') {
              clearInterval(pollingRef.current); pollingRef.current = null;
              setImportId(null);
              if (d.import.status === 'sucesso') { showToast('✅ Importação concluída', 'success'); carregar(); }
              else showToast(`❌ Falhou: ${(d.import.erro || '').slice(0, 120)}`, 'error');
            }
          }
        } catch (e) {}
      }, 5000);
      return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
    }, [importId, API_URL, fetchAuth, carregar, showToast]);

    useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

    const forcar = async () => {
      try {
        showToast('🚀 Enfileirando importação...', 'info');
        const r = await fetchAuth(`${API_URL}/performance/forcar-import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        const d = await r.json();
        if (d.import_id) { setImportId(d.import_id); setStatus({ status: d.status, data_referencia: d.data_referencia }); }
        else showToast(d.error || 'Erro', 'error');
      } catch (e) { showToast('Erro de conexão', 'error'); }
    };

    const importando = !!importId;

    return h('div', { className: 'space-y-5' },
      h('div', { className: 'bg-white border rounded-xl shadow-sm p-5' },
        h('h3', { className: 'text-sm font-bold text-gray-700 uppercase mb-4' }, 'Importação da base (BI)'),
        h('p', { className: 'text-sm text-gray-500 mb-4' },
          'O Performance Diária reflete a base do BI (bi_entregas). A base é importada automaticamente às 12h. Use o botão abaixo para forçar uma importação agora (puxa a planilha do sistema externo → alimenta o BI).'),
        h('button', { onClick: forcar, disabled: importando,
          className: `px-5 py-2.5 rounded-lg text-sm font-semibold ${importando ? 'bg-gray-200 text-gray-400' : 'bg-green-600 hover:bg-green-700 text-white'}` },
          importando ? 'Importando...' : 'Forçar importação agora'),
        importando && status && h('div', { className: 'mt-4 flex items-center gap-3 text-sm text-purple-600' },
          h('div', { className: 'inline-block w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full', style: { animation: 'spin 1s linear infinite' } }),
          h('span', {}, `${status.etapa_atual || status.status || 'processando'}${status.progresso ? ` · ${status.progresso}%` : ''}`),
        ),
        h('style', {}, `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`),
      ),

      loading
        ? h('div', { className: 'text-center py-8 text-gray-400 text-sm' }, 'Carregando...')
        : h('div', { className: 'bg-white border rounded-xl shadow-sm p-5' },
            h('h3', { className: 'text-sm font-bold text-gray-700 uppercase mb-3' }, 'Última importação concluída'),
            ultima
              ? h('div', { className: 'grid grid-cols-3 gap-4' },
                  h('div', {}, h('p', { className: 'text-xs text-gray-400 uppercase' }, 'Data referência'), h('p', { className: 'text-lg font-bold text-gray-800' }, fmtData(ultima.data_referencia))),
                  h('div', {}, h('p', { className: 'text-xs text-gray-400 uppercase' }, 'Importada em'), h('p', { className: 'text-lg font-bold text-gray-800' }, fmtDT(ultima.finalizado_em))),
                  h('div', {}, h('p', { className: 'text-xs text-gray-400 uppercase' }, 'Linhas inseridas'), h('p', { className: 'text-lg font-bold text-gray-800' }, ultima.linhas_inseridas ?? '—')),
                )
              : h('p', { className: 'text-sm text-gray-400' }, 'Nenhuma importação concluída ainda'),
          ),
    );
  }

  // ════════════════════════════════════════════════════════════
  // COMPONENTE PRINCIPAL
  // ════════════════════════════════════════════════════════════
  function ModuloPerformanceDiaria({ initialProps }) {
    const { API_URL, fetchAuth, showToast, perfTab } = initialProps;
    const aba = perfTab || 'dashboard';

    return h('div', { className: 'space-y-5' },
      aba === 'dashboard' && h(TabDashboard, { API_URL, fetchAuth, showToast }),
      aba === 'busca' && h(TabBusca, { API_URL, fetchAuth, showToast }),
      aba === 'config' && h(TabConfig, { API_URL, fetchAuth, showToast }),
      aba === 'jobs' && h(TabJobs, { API_URL, fetchAuth, showToast }),
    );
  }

  // ════════════════════════════════════════════════════════════
  // EXPORT
  // ════════════════════════════════════════════════════════════
  window.ModuloPerformanceComponent = function ModuloPerformanceWrapper(props) {
    const containerRef = useRef(null);
    const propsRef = useRef(props);

    useEffect(() => { propsRef.current = props; });

    useEffect(() => {
      if (!containerRef.current) return;
      ReactDOM.render(h(ModuloPerformanceDiaria, { initialProps: props }), containerRef.current);
    }, [props.perfTab]);

    useEffect(() => {
      if (!containerRef.current) return;
      ReactDOM.render(h(ModuloPerformanceDiaria, { initialProps: props }), containerRef.current);
      return () => { if (containerRef.current) ReactDOM.unmountComponentAtNode(containerRef.current); };
    }, []);

    return h('div', { ref: containerRef });
  };

  console.log('✅ Módulo Performance Diária v3.0 (derivado do BI) carregado');
})();
