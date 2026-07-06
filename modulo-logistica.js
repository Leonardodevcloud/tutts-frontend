// ==================== MÓDULO UBER DIRECT ====================
// Arquivo: modulo-uber.js
// Admin: Dashboard, Tracking em tempo real, Entregas, Configuração
// Hub Logístico — despacho multi-provedor (Uber Direct + 99) via Central Tutts
// ============================================================

(function () {
  'use strict';

  const { useState, useEffect, useCallback, useRef, useMemo } = React;
  const h = React.createElement;

  // ── Helpers ──
  function fmtDT(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }

  // 🆕 2026-06: badge do codigo (coleta/entrega) da 99/Uber.
  // - codigo presente: mostra destacado e copia ao clicar.
  // - codigo ausente: mostra "aguardando" (a 99 gera apos o despacho, via poller;
  //   se a verificacao estiver desligada no provedor, fica sem codigo mesmo).
  function CodigoBadge(label, codigo) {
    if (codigo) {
      return h('div', {
        onClick: () => { try { navigator.clipboard.writeText(String(codigo)); } catch (_) {} },
        title: 'Clique para copiar',
        className: 'mt-1.5 inline-flex items-center gap-1.5 cursor-pointer bg-purple-50 border border-purple-200 rounded-lg px-2 py-1'
      },
        h('span', { className: 'text-[10px] uppercase tracking-wider text-purple-500 font-semibold' }, label),
        h('span', { className: 'text-sm font-bold tracking-widest text-purple-800' }, String(codigo)),
        h('span', { className: 'text-[10px] text-purple-400' }, '📋')
      );
    }
    return h('div', { className: 'mt-1.5 inline-flex items-center gap-1 text-[11px] text-gray-400' },
      h('span', null, label + ': '),
      h('span', { className: 'italic' }, 'aguardando provedor')
    );
  }

  // Labels de status. Duas famílias de chave:
  //  - LEGADAS (snake_case): formato antigo da Uber (enviado_uber, pickup...).
  //  - CANÔNICAS (UPPER): o enum do hub multi-provider (DISPATCHED, PICKED_UP...).
  // O Badge tenta as duas — assim Uber e 99Entrega exibem o MESMO texto em
  // português, independente de qual provider mandou o status.
  const STATUS_LABELS = {
    // ── Família legada (Uber) ──
    aguardando_cotacao:    { label: 'Aguardando cotação',  cor: 'bg-gray-100 text-gray-700' },
    cotacao_recebida:      { label: 'Cotação OK',           cor: 'bg-blue-100 text-blue-700' },
    enviado_uber:          { label: 'Enviado ao provedor',      cor: 'bg-purple-100 text-purple-700' },
    entregador_atribuido:  { label: 'Entregador atribuído', cor: 'bg-indigo-100 text-indigo-700' },
    pickup:                { label: 'A caminho da coleta',  cor: 'bg-amber-100 text-amber-700' },
    pickup_complete:       { label: 'Coletou',              cor: 'bg-amber-200 text-amber-800' },
    dropoff:               { label: 'A caminho da entrega', cor: 'bg-orange-100 text-orange-700' },
    delivered:             { label: 'Entregue',             cor: 'bg-green-100 text-green-700' },
    canceled:              { label: 'Cancelado',            cor: 'bg-red-100 text-red-700' },
    cancelado:             { label: 'Cancelado',            cor: 'bg-red-100 text-red-700' },
    fallback_fila:         { label: 'Fallback p/ fila',     cor: 'bg-yellow-100 text-yellow-800' },
    erro:                  { label: 'Erro',                 cor: 'bg-red-200 text-red-900' },
    // ── Família canônica (hub multi-provider — CanonicalStatus) ──
    PENDING:               { label: 'Pendente',                cor: 'bg-gray-100 text-gray-700' },
    QUOTED:                { label: 'Cotação OK',              cor: 'bg-blue-100 text-blue-700' },
    DISPATCHED:            { label: 'Procurando entregador',   cor: 'bg-purple-100 text-purple-700' },
    COURIER_ASSIGNED:      { label: 'Entregador atribuído',    cor: 'bg-indigo-100 text-indigo-700' },
    PICKUP_EN_ROUTE:       { label: 'A caminho da coleta',     cor: 'bg-amber-100 text-amber-700' },
    ARRIVED_PICKUP:        { label: 'Na coleta',              cor: 'bg-amber-100 text-amber-700' },
    PICKED_UP:             { label: 'Coletou',                cor: 'bg-amber-200 text-amber-800' },
    DROPOFF_EN_ROUTE:      { label: 'A caminho da entrega',    cor: 'bg-orange-100 text-orange-700' },
    ARRIVED_DROPOFF:       { label: 'Na entrega',             cor: 'bg-orange-100 text-orange-700' },
    DELIVERED:             { label: 'Entregue',                cor: 'bg-green-100 text-green-700' },
    CANCELED:              { label: 'Cancelado',               cor: 'bg-red-100 text-red-700' },
    RETURNED:              { label: 'Devolvido',               cor: 'bg-red-100 text-red-700' },
    FAILED:                { label: 'Falha',                   cor: 'bg-red-200 text-red-900' },
    FALLBACK_QUEUE:        { label: 'Fallback p/ fila',        cor: 'bg-yellow-100 text-yellow-800' },
  };

  // Tradução de status NATIVO da 99Entrega → label PT-BR (rede de segurança:
  // se por algum motivo só o status_native chegar, ainda exibe em português).
  const STATUS_NATIVE_99 = {
    finding:           'Procurando entregador',
    waiting:           'Entregador atribuído',
    delivering:        'Em entrega',
    completed:         'Entregue',
    canceled:          'Cancelado',
    closed:            'Encerrado',
    sendback:          'Em devolução',
    sendbackcompleted: 'Devolução concluída',
  };

  // Resolve o melhor label PT-BR a partir do registro de entrega.
  // Prioridade: status canônico → status legado → tradução do nativo 99 → cru.
  function resolverStatus(e) {
    const canon = e && e.status_canonico;
    if (canon && STATUS_LABELS[canon]) return STATUS_LABELS[canon];

    const legado = e && e.status_uber;
    if (legado && STATUS_LABELS[legado]) return STATUS_LABELS[legado];

    const nat99 = STATUS_NATIVE_99[String(legado || '').toLowerCase()];
    if (nat99) return { label: nat99, cor: 'bg-gray-100 text-gray-700' };

    return { label: legado || '—', cor: 'bg-gray-100 text-gray-700' };
  }

  // true quando a entrega ainda esta PROCURANDO entregador (nenhum motoboy
  // valido associado). Evita mostrar motoboy/faixa de coleta com dados
  // antigos quando a corrida volta a buscar (ex.: motoboy cancelou).
  function estaProcurando(e) {
    const c = String((e && e.status_canonico) || '').toUpperCase();
    if (['PENDING', 'QUOTED', 'DISPATCHED'].includes(c)) return true;
    const n = String((e && e.status_uber) || '').toLowerCase();
    if (!c && ['finding', 'pending', 'created'].includes(n)) return true;
    return false;
  }

  // Status oferecidos no dropdown de filtro — só os canônicos, na ordem do
  // ciclo de vida da entrega.
  const STATUS_FILTRO_OPCOES = [
    'PENDING', 'QUOTED', 'DISPATCHED', 'COURIER_ASSIGNED',
    'PICKUP_EN_ROUTE', 'ARRIVED_PICKUP', 'PICKED_UP',
    'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF', 'DELIVERED',
    'CANCELED', 'RETURNED', 'FAILED', 'FALLBACK_QUEUE',
  ];

  function Badge({ status, entrega }) {
    // Aceita tanto Badge({entrega}) (preferido — usa status canônico) quanto
    // Badge({status}) (compat — string solta).
    const s = entrega
      ? resolverStatus(entrega)
      : (STATUS_LABELS[status] || { label: status, cor: 'bg-gray-100 text-gray-700' });
    return h('span', { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cor}` }, s.label);
  }

  // ════════════════════════════════════════════════════════
  // ABA 1: DASHBOARD - métricas
  // ════════════════════════════════════════════════════════
  function TabDashboard({ API_URL, fetchAuth, showToast }) {
    const [data, setData] = useState(null);
    const [sla, setSla] = useState(null);
    const [margemData, setMargemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [margemLoading, setMargemLoading] = useState(false);
    const [periodo, setPeriodo] = useState('7d');           // 1d | 7d | 30d | custom

    const hojeBRT   = () => dataLocalBRT(new Date());
    const diasAtras = (nd) => dataLocalBRT(new Date(Date.now() - nd * 86400000));
    const [deCustom, setDeCustom]   = useState(diasAtras(7));
    const [ateCustom, setAteCustom] = useState(hojeBRT());

    const range = periodo === 'custom' ? { de: deCustom, ate: ateCustom }
      : periodo === '1d'  ? { de: hojeBRT(),    ate: hojeBRT() }
      : periodo === '30d' ? { de: diasAtras(29), ate: hojeBRT() }
      :                     { de: diasAtras(6),  ate: hojeBRT() };
    const de = range.de, ate = range.ate;

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dashboard/metricas?data_inicio=${de}&data_fim=${ate}`);
        const json = await res.json();
        setData(json.metricas || {});
        setSla(json.sla || null);
      } catch { showToast('Erro ao carregar métricas', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL, de, ate]);

    const carregarMargem = useCallback(async () => {
      setMargemLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dashboard/margem-clientes?periodo=custom&inicio=${de}&fim=${ate}`);
        const json = await res.json();
        if (json.success) setMargemData(json);
        else showToast(json.error || 'Erro ao carregar margem', 'error');
      } catch { showToast('Erro de rede ao carregar margem', 'error'); }
      finally { setMargemLoading(false); }
    }, [fetchAuth, API_URL, de, ate]);

    useEffect(() => { carregar(); }, [carregar]);
    useEffect(() => { carregarMargem(); }, [carregarMargem]);

    if (loading || !data) return h('div', { className: 'flex items-center justify-center py-16' },
      h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full' })
    );

    const ni = (x) => parseInt(x || 0, 10);
    const fmtMin = (m) => {
      const v = parseFloat(m);
      if (m == null || m === '' || isNaN(v)) return '—';
      const r = Math.round(v);
      return r < 60 ? r + ' min' : Math.floor(r / 60) + 'h' + (r % 60 ? ' ' + (r % 60) + 'min' : '');
    };

    const total = ni(data.total), entregues = ni(data.entregues), emand = ni(data.em_andamento), cancel = ni(data.cancelados);
    const tLoc = data.t_localizacao_min, tCol = data.t_coleta_min, tRota = data.t_rota_min, tTot = data.t_total_min;
    const somaEst = Math.max(1, (parseFloat(tLoc) || 0) + (parseFloat(tCol) || 0) + (parseFloat(tRota) || 0));
    const pctNP = (sla && sla.pct_no_prazo != null) ? sla.pct_no_prazo : null;

    const pills = [['1d', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'], ['custom', 'Período']];

    return h('div', { className: 'max-w-7xl mx-auto p-4 space-y-4' },
      // HEADER
      h('div', { className: 'flex items-center justify-between flex-wrap gap-3' },
        h('div', null,
          h('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Dashboard do Hub'),
          h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'Operação, tempo e SLA'),
        ),
        h('div', { className: 'flex items-center gap-2 flex-wrap' },
          h('div', { className: 'inline-flex bg-gray-100 rounded-lg p-0.5' },
            pills.map(([p, lbl]) => h('button', { key: p, onClick: () => setPeriodo(p),
              className: `px-3 py-1.5 text-xs font-semibold rounded-md ${periodo === p ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}` }, lbl)),
          ),
          periodo === 'custom' && h('div', { className: 'flex items-center gap-1' },
            h('input', { type: 'date', value: deCustom, onChange: e => setDeCustom(e.target.value), className: 'px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700' }),
            h('span', { className: 'text-gray-400 text-xs' }, 'até'),
            h('input', { type: 'date', value: ateCustom, onChange: e => setAteCustom(e.target.value), className: 'px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700' }),
          ),
          h('button', { onClick: () => { carregar(); carregarMargem(); }, className: 'px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700' }, '⟳ Atualizar'),
        ),
      ),

      // KPIs
      h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
        [
          { lbl: 'Total de entregas', val: total, ico: '📦', chip: 'bg-purple-50 text-purple-600', foot: null },
          { lbl: 'Entregues', val: entregues, ico: '✅', chip: 'bg-green-50 text-green-600', foot: total ? `${(entregues / total * 100).toFixed(0)}% do total` : null },
          { lbl: 'Em andamento', val: emand, ico: '🛵', chip: 'bg-blue-50 text-blue-600', foot: `${ni(data.and_procurando)} buscando · ${ni(data.and_coletar)} p/ coletar · ${ni(data.and_rota)} em rota` },
          { lbl: 'Cancelados', val: cancel, ico: '✖', chip: 'bg-red-50 text-red-600', foot: total ? `${(cancel / total * 100).toFixed(0)}% · ${ni(data.fallback)} fallback` : null },
        ].map(k => h('div', { key: k.lbl, className: 'bg-white rounded-2xl border border-gray-200 shadow-sm p-4' },
          h('div', { className: `w-9 h-9 rounded-lg flex items-center justify-center text-lg mb-3 ${k.chip}` }, k.ico),
          h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-gray-400' }, k.lbl),
          h('div', { className: 'text-3xl font-extrabold text-gray-800 mt-1 leading-none' }, k.val),
          k.foot && h('div', { className: 'text-[11px] text-gray-500 mt-2' }, k.foot),
        )),
      ),

      // TEMPO + SLA
      h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-3' },
        h('div', { className: 'lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5' },
          h('div', { className: 'flex items-center gap-2 mb-1' },
            h('h3', { className: 'text-base font-bold text-gray-800' }, '⏱️ Desempenho de tempo'),
            h('span', { className: 'ml-auto text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full' }, `média · ${ni(data.n_trilha)} c/ trilha`),
          ),
          h('p', { className: 'text-xs text-gray-500 mb-4' }, 'Tempo médio de cada estágio, da criação à entrega (inclui em andamento).'),
          h('div', { className: 'flex h-9 rounded-xl overflow-hidden mb-4' },
            h('div', { className: 'flex items-center justify-center text-white text-[11px] font-bold', style: { width: `${(parseFloat(tLoc) || 0) / somaEst * 100}%`, background: 'linear-gradient(180deg,#a78bfa,#8b5cf6)', minWidth: '44px' } }, fmtMin(tLoc)),
            h('div', { className: 'flex items-center justify-center text-white text-[11px] font-bold', style: { width: `${(parseFloat(tCol) || 0) / somaEst * 100}%`, background: 'linear-gradient(180deg,#f6a94a,#f5921e)', minWidth: '44px' } }, fmtMin(tCol)),
            h('div', { className: 'flex items-center justify-center text-white text-[11px] font-bold', style: { width: `${(parseFloat(tRota) || 0) / somaEst * 100}%`, background: 'linear-gradient(180deg,#34c77b,#15a05a)', minWidth: '44px' } }, fmtMin(tRota)),
          ),
          h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
            [
              { c: '#8b5cf6', l: 'Localização', v: fmtMin(tLoc), d: 'criação → entregador' },
              { c: '#f5921e', l: 'Coleta', v: fmtMin(tCol), d: 'atribuição → coleta' },
              { c: '#15a05a', l: 'Entrega', v: fmtMin(tRota), d: 'coleta → entrega' },
            ].map(t => h('div', { key: t.l, className: 'border border-gray-200 rounded-xl p-3' },
              h('div', { className: 'text-[9px] font-bold uppercase tracking-wide text-gray-400' },
                h('span', { className: 'inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle', style: { background: t.c } }), t.l),
              h('div', { className: 'text-lg font-extrabold text-gray-800 mt-0.5' }, t.v),
              h('div', { className: 'text-[10px] text-gray-400' }, t.d),
            )).concat([
              h('div', { key: 'total', className: 'border rounded-xl p-3', style: { background: '#faf7ff', borderColor: '#e9defd' } },
                h('div', { className: 'text-[9px] font-bold uppercase tracking-wide text-purple-600' }, 'Tempo total'),
                h('div', { className: 'text-lg font-extrabold text-purple-700 mt-0.5' }, fmtMin(tTot)),
                h('div', { className: 'text-[10px] text-purple-400' }, 'criação → entrega'),
              ),
            ]),
          ),
        ),
        (function () {
          const pct = pctNP != null ? pctNP : 0;
          const R = 54, CIRC = 2 * Math.PI * R;
          const off = CIRC * (1 - pct / 100);
          return h('div', { className: 'bg-white rounded-2xl border border-gray-200 shadow-sm p-5' },
            h('h3', { className: 'text-base font-bold text-gray-800 mb-1' }, '🎯 SLA / Prazo'),
            h('p', { className: 'text-xs text-gray-500 mb-3' }, `No prazo da distância · ${sla ? sla.total_avaliado : 0} entregas avaliadas.`),
            h('div', { className: 'flex flex-col items-center' },
              h('div', { className: 'relative', style: { width: '140px', height: '140px' } },
                h('svg', { width: 140, height: 140, viewBox: '0 0 140 140' },
                  h('circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: '#fdecec', strokeWidth: 14 }),
                  pctNP != null && h('circle', { cx: 70, cy: 70, r: R, fill: 'none', stroke: '#15a05a', strokeWidth: 14, strokeLinecap: 'round', strokeDasharray: CIRC, strokeDashoffset: off, transform: 'rotate(-90 70 70)' }),
                ),
                h('div', { className: 'absolute inset-0 flex flex-col items-center justify-center' },
                  h('div', { className: 'text-2xl font-extrabold text-green-600' }, pctNP != null ? `${pctNP.toFixed(0)}%` : '—'),
                  h('div', { className: 'text-[9px] font-bold uppercase tracking-wide text-gray-400' }, 'no prazo'),
                ),
              ),
              h('div', { className: 'grid grid-cols-2 gap-2 w-full mt-3' },
                h('div', { className: 'border border-gray-200 rounded-xl p-2.5' }, h('div', { className: 'text-[9px] font-bold uppercase text-gray-400' }, 'No prazo'), h('div', { className: 'text-lg font-extrabold text-gray-800' }, sla ? sla.no_prazo : 0)),
                h('div', { className: 'border border-gray-200 rounded-xl p-2.5' }, h('div', { className: 'text-[9px] font-bold uppercase text-gray-400' }, 'Fora do prazo'), h('div', { className: 'text-lg font-extrabold text-red-600' }, sla ? sla.fora : 0)),
                h('div', { className: 'border border-gray-200 rounded-xl p-2.5' }, h('div', { className: 'text-[9px] font-bold uppercase text-gray-400' }, 'Atraso médio'), h('div', { className: 'text-lg font-extrabold text-amber-600' }, (sla && sla.fora) ? '+' + fmtMin(sla.atraso_medio_min) : '—')),
                h('div', { className: 'border border-gray-200 rounded-xl p-2.5' }, h('div', { className: 'text-[9px] font-bold uppercase text-gray-400' }, 'ETA prov.'), h('div', { className: 'text-lg font-extrabold text-gray-800' }, `${Math.round(parseFloat(data.eta_medio || 0))} min`)),
              ),
            ),
          );
        })(),
      ),

      // FINANCEIRO
      h('div', { className: 'bg-white rounded-2xl border border-gray-200 shadow-sm grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100' },
        [
          { l: 'Receita (cliente)', v: fmtMoney(parseFloat(data.receita_total || 0)), c: 'text-gray-800' },
          { l: 'Custo provedores', v: fmtMoney(parseFloat(data.custo_total_uber || 0)), c: 'text-gray-800' },
          { l: 'Margem total', v: (parseFloat(data.margem_total || 0) >= 0 ? '+ ' : '− ') + fmtMoney(Math.abs(parseFloat(data.margem_total || 0))), c: parseFloat(data.margem_total || 0) >= 0 ? 'text-green-600' : 'text-red-600' },
          { l: 'Valor médio', v: fmtMoney(parseFloat(data.valor_medio_uber || 0)), c: 'text-gray-800' },
        ].map(f => h('div', { key: f.l, className: 'p-4' },
          h('div', { className: 'text-[10px] font-bold uppercase tracking-wide text-gray-400' }, f.l),
          h('div', { className: `text-xl font-extrabold mt-1 ${f.c}` }, f.v),
        )),
      ),

      // MARGEM POR CLIENTE
      h('div', { className: 'bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4' },
        h('div', null,
          h('h3', { className: 'text-base font-bold text-gray-800' }, '💼 Margem por cliente'),
          h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'Quanto cada cliente rende quando despachado pelo hub. Margem = valor cliente − custo do provedor.'),
        ),
        margemLoading
          ? h('div', { className: 'text-center py-10' }, h('div', { className: 'animate-spin w-7 h-7 border-4 border-purple-500 border-t-transparent rounded-full mx-auto' }))
          : (!margemData || !margemData.por_cliente || margemData.por_cliente.length === 0)
            ? h('div', { className: 'text-center py-10 text-gray-400' }, h('p', { className: 'font-semibold' }, 'Nenhuma entrega no período'))
            : h('div', null,
                (margemData.por_dia && margemData.por_dia.length > 0) && (function () {
                  const porDia = margemData.por_dia;
                  const maxAbs = Math.max(1, ...porDia.map(d => Math.abs(parseFloat(d.margem || 0))));
                  return h('div', { className: 'mb-4' },
                    h('div', { className: 'text-xs text-gray-500 mb-2' }, `Margem por dia (${porDia.length} dia${porDia.length !== 1 ? 's' : ''})`),
                    h('div', { className: 'flex items-end gap-1 h-24 border-b border-gray-200' },
                      porDia.map((d, i) => {
                        const v = parseFloat(d.margem || 0), pos = v >= 0, pc = (Math.abs(v) / maxAbs) * 100;
                        return h('div', { key: i, className: 'flex-1 flex flex-col justify-end', title: `${new Date(d.dia).toLocaleDateString('pt-BR')}: ${pos ? '+' : '−'} ${fmtMoney(Math.abs(v))}` },
                          h('div', { className: `w-full rounded-t ${pos ? 'bg-green-400' : 'bg-red-400'}`, style: { height: `${Math.max(2, pc)}%` } }));
                      }),
                    ),
                  );
                })(),
                h('div', { className: 'overflow-x-auto' },
                  h('table', { className: 'w-full text-sm' },
                    h('thead', { className: 'text-[10px] uppercase text-gray-400 border-b border-gray-200' },
                      h('tr', null,
                        h('th', { className: 'px-2 py-2 text-left' }, 'Cliente'),
                        h('th', { className: 'px-2 py-2 text-right' }, 'Qtd'),
                        h('th', { className: 'px-2 py-2 text-right' }, 'Receita'),
                        h('th', { className: 'px-2 py-2 text-right' }, 'Custo'),
                        h('th', { className: 'px-2 py-2 text-right' }, 'Margem'),
                        h('th', { className: 'px-2 py-2 text-right' }, 'Méd. coleta'),
                        h('th', { className: 'px-2 py-2 text-right' }, 'No prazo'),
                        h('th', { className: 'px-2 py-2 text-right' }, '% Cancel.'),
                      )),
                    h('tbody', null,
                      margemData.por_cliente.map((c, i) => {
                        const m = parseFloat(c.margem_total || 0), pos = m >= 0, np = c.pct_no_prazo;
                        return h('tr', { key: i, className: `border-b border-gray-50 hover:bg-gray-50 ${m < 0 ? 'bg-red-50/40' : ''}` },
                          h('td', { className: 'px-2 py-2' }, h('div', { className: 'font-semibold text-gray-800' }, c.cliente), !c.regra_id && h('div', { className: 'text-[10px] text-gray-400' }, 'Sem regra')),
                          h('td', { className: 'px-2 py-2 text-right text-gray-700' }, c.qtd),
                          h('td', { className: 'px-2 py-2 text-right text-gray-700' }, fmtMoney(parseFloat(c.receita_total || 0))),
                          h('td', { className: 'px-2 py-2 text-right text-gray-700' }, fmtMoney(parseFloat(c.custo_uber_total || 0))),
                          h('td', { className: `px-2 py-2 text-right font-semibold ${pos ? 'text-green-700' : 'text-red-700'}` }, `${pos ? '+' : '−'} ${fmtMoney(Math.abs(m))}`),
                          h('td', { className: 'px-2 py-2 text-right text-gray-600' }, fmtMin(c.medio_coleta_min)),
                          h('td', { className: 'px-2 py-2 text-right' }, np == null
                            ? h('span', { className: 'text-gray-300' }, '—')
                            : h('span', { className: `inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${np >= 80 ? 'bg-green-50 text-green-700' : np >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}` }, `${np.toFixed(0)}%`)),
                          h('td', { className: 'px-2 py-2 text-right text-gray-600' }, `${parseFloat(c.taxa_cancelamento || 0).toFixed(0)}%`),
                        );
                      })
                    ),
                  ),
                ),
              ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA 2: TRACKING - mapa em tempo real via WebSocket
  // ════════════════════════════════════════════════════════
  function TabTracking({ API_URL, fetchAuth, showToast, token }) {
    const [ativas, setAtivas] = useState([]);
    const [selecionada, setSelecionada] = useState(null);
    const [posicaoAtual, setPosicaoAtual] = useState(null);
    const wsRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [mapsPronto, setMapsPronto] = useState(!!(window.google && window.google.maps));

    // Carrega o Google Maps JS dinamicamente (chave vem do backend via /logistics/maps-key).
    // O index.html do app principal NAO injeta o Maps — sem isto o mapa de tracking fica
    // em branco mesmo com posicao chegando. Mesmo padrao do solicitacao.html.
    useEffect(() => {
      if (window.google && window.google.maps) { setMapsPronto(true); return; }
      const jaInjetado = document.querySelector('script[data-tutts-maps-loader]');
      if (jaInjetado) { jaInjetado.addEventListener('load', () => setMapsPronto(true)); return; }
      (async () => {
        try {
          const resp = await fetchAuth(`${API_URL}/logistics/maps-key`);
          if (!resp.ok) { console.error('Falha ao obter chave do Google Maps:', resp.status); return; }
          const { key } = await resp.json();
          if (!key) return;
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geometry&v=weekly`;
          script.async = true; script.defer = true;
          script.setAttribute('data-tutts-maps-loader', '1');
          script.onload = () => setMapsPronto(true);
          script.onerror = () => console.error('Erro ao carregar Google Maps JS — verifique a chave');
          document.head.appendChild(script);
        } catch (err) { console.error('Erro no loader do Google Maps:', err); }
      })();
    }, []);

    const carregarAtivas = useCallback(async () => {
      try {
        const res = await fetchAuth(`${API_URL}/logistics/tracking/ativas`);
        const json = await res.json();
        setAtivas(json.entregas || []);
      } catch { showToast('Erro ao carregar entregas ativas', 'error'); }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregarAtivas(); const i = setInterval(carregarAtivas, 30000); return () => clearInterval(i); }, []);

    // Conectar WebSocket
    useEffect(() => {
      const wsUrl = API_URL.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws/uber-tracking';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'AUTH', token }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'UBER_LOCATION_UPDATE' && selecionada && msg.data.codigoOS == selecionada.codigo_os) {
            setPosicaoAtual({ lat: msg.data.latitude, lng: msg.data.longitude, at: msg.timestamp });
          }
        } catch {}
      };

      return () => { ws.close(); };
    }, [token, selecionada]);

    // Subscribe na OS selecionada
    useEffect(() => {
      if (selecionada && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'SUBSCRIBE', codigoOS: selecionada.codigo_os }));
      }
    }, [selecionada]);

    // Inicializar Google Maps quando OS é selecionada
    useEffect(() => {
      if (!selecionada || !window.google?.maps) return;
      const center = posicaoAtual
        ? { lat: parseFloat(posicaoAtual.lat), lng: parseFloat(posicaoAtual.lng) }
        : { lat: parseFloat(selecionada.latitude_coleta || -12.97), lng: parseFloat(selecionada.longitude_coleta || -38.50) };

      const mapEl = document.getElementById('uber-map');
      if (!mapEl) return;

      mapRef.current = new google.maps.Map(mapEl, { center, zoom: 14, disableDefaultUI: false });

      // Marcadores fixos
      if (selecionada.latitude_coleta && selecionada.longitude_coleta) {
        new google.maps.Marker({
          position: { lat: parseFloat(selecionada.latitude_coleta), lng: parseFloat(selecionada.longitude_coleta) },
          map: mapRef.current, label: 'C', title: 'Coleta',
        });
      }
      if (selecionada.latitude_entrega && selecionada.longitude_entrega) {
        new google.maps.Marker({
          position: { lat: parseFloat(selecionada.latitude_entrega), lng: parseFloat(selecionada.longitude_entrega) },
          map: mapRef.current, label: 'E', title: 'Entrega',
        });
      }
    }, [selecionada, mapsPronto]);

    // Atualizar marcador do entregador
    useEffect(() => {
      if (!posicaoAtual || !mapRef.current) return;
      const pos = { lat: parseFloat(posicaoAtual.lat), lng: parseFloat(posicaoAtual.lng) };
      if (markerRef.current) {
        markerRef.current.setPosition(pos);
      } else {
        markerRef.current = new google.maps.Marker({
          position: pos, map: mapRef.current,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#7c3aed', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          title: 'Entregador',
        });
      }
      mapRef.current.panTo(pos);
    }, [posicaoAtual]);

    return h('div', { className: 'max-w-7xl mx-auto p-4' },
      h('h2', { className: 'text-2xl font-bold text-gray-800 mb-4' }, '🛵 Tracking em tempo real'),
      h('div', { className: 'grid grid-cols-1 lg:grid-cols-3 gap-4' },
        // Lista
        h('div', { className: 'lg:col-span-1 bg-white rounded-xl border shadow-sm p-3 max-h-[600px] overflow-y-auto' },
          h('div', { className: 'text-xs font-semibold text-gray-500 uppercase mb-2' }, `${ativas.length} entrega(s) ativas`),
          ativas.length === 0
            ? h('p', { className: 'text-sm text-gray-400 text-center py-8' }, 'Nenhuma entrega em andamento')
            : ativas.map(e => h('div', {
                key: e.id,
                onClick: () => { setSelecionada(e); setPosicaoAtual(e.ultima_posicao ? { lat: e.ultima_posicao.lat, lng: e.ultima_posicao.lng } : null); },
                className: `p-3 rounded-lg border cursor-pointer mb-2 ${selecionada?.id === e.id ? 'bg-purple-50 border-purple-400' : 'border-gray-100 hover:bg-gray-50'}`
              },
                h('div', { className: 'flex items-center justify-between mb-1 gap-2' },
                  h('span', { className: 'flex items-center gap-1.5 min-w-0' },
                    h(ProviderLogo, { code: (e.provider_code || e.provider || null), size: 18 }),
                    h('span', { className: 'text-sm font-bold cursor-pointer', title: 'Clique para copiar a OS', onClick: (ev) => { ev.stopPropagation(); copiarTextoOS(e.codigo_os, showToast); } }, `OS ${e.codigo_os}`)
                  ),
                  h('div', { className: 'flex items-center gap-1.5' },
                    h(Badge, { entrega: e }),
                    e.tracking_url && h('a', {
                      href: e.tracking_url,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      onClick: (ev) => ev.stopPropagation(),
                      title: 'Abrir tracking oficial do provedor',
                      className: 'text-purple-600 hover:text-purple-800 text-base',
                    }, '🔗'),
                  ),
                ),
                e.entregador_nome && h('p', { className: 'text-xs text-gray-600' }, `🛵 ${e.entregador_nome}`),
                h('p', { className: 'text-xs text-gray-400 truncate' }, e.endereco_entrega)
              ))
        ),
        // Mapa + detalhes
        h('div', { className: 'lg:col-span-2 space-y-3' },
          selecionada ? [
            h('div', { key: 'info', className: 'bg-white rounded-xl border shadow-sm p-4' },
              // Header com OS + botão tracking oficial
              h('div', { className: 'flex items-start justify-between gap-3 mb-3' },
                h('div', { className: 'flex items-center gap-3 min-w-0' },
                  // Foto do entregador
                  selecionada.entregador_foto
                    ? h('img', {
                        src: selecionada.entregador_foto,
                        alt: selecionada.entregador_nome || 'Entregador',
                        className: 'w-12 h-12 rounded-full object-cover bg-purple-100 flex-shrink-0',
                        onError: (ev) => { ev.target.style.display = 'none'; },
                      })
                    : null,
                  h('div', { className: 'min-w-0' },
                    h('h3', { className: 'font-bold text-gray-800' }, `OS ${selecionada.codigo_os}`),
                    h(Badge, { entrega: selecionada })
                  )
                ),
                // Botão tracking oficial do provedor
                selecionada.tracking_url && h('a', {
                  href: selecionada.tracking_url,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'flex items-center gap-1.5 text-xs px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex-shrink-0',
                  title: 'Abrir página oficial de rastreio da entrega em nova aba',
                }, '🔗 Tracking'),
              ),

              // Dados do entregador
              selecionada.entregador_nome && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 pt-3 border-t border-gray-100' },
                h('div', null, h('strong', null, 'Entregador: '), selecionada.entregador_nome,
                  selecionada.entregador_rating && h('span', { className: 'ml-2 text-gray-500' }, `★ ${selecionada.entregador_rating}`)),
                h('div', null, h('strong', null, 'Telefone: '), fmtTelefoneBR(selecionada.entregador_telefone)),
                h('div', null, h('strong', null, 'Veículo: '), selecionada.entregador_veiculo || '—'),
                h('div', null, h('strong', null, 'Placa: '), selecionada.entregador_placa || '—')
              ),

              // Última posição (se houver)
              posicaoAtual && h('div', { className: 'text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100 font-mono' },
                `📍 ${parseFloat(posicaoAtual.lat).toFixed(5)}, ${parseFloat(posicaoAtual.lng).toFixed(5)}`,
                posicaoAtual.at && h('span', { className: 'ml-2' }, `· ${fmtDT(posicaoAtual.at)}`)
              )
            ),
            h('div', { key: 'map', id: 'uber-map', className: 'w-full h-[500px] rounded-xl border shadow-sm bg-gray-100' })
          ] : h('div', { className: 'bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center' },
            h('p', { className: 'text-gray-400' }, '👈 Selecione uma entrega para acompanhar')
          )
        )
      )
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA 3: ENTREGAS - listagem com filtros
  // ════════════════════════════════════════════════════════
  // Helpers locais usados pelos cards
  function fmtTelefoneBR(tel) {
    if (!tel) return '—';
    const digits = String(tel).replace(/\D/g, '');
    // E.164 com DDI Brasil (55) + DDD (2) + 9 dígitos
    if (digits.length === 13 && digits.startsWith('55')) {
      return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 11) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    return tel;
  }

  function iniciaisDoNome(nome) {
    if (!nome) return '?';
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  function calcularDuracao(inicio, fim) {
    if (!inicio || !fim) return null;
    const ms = new Date(fim) - new Date(inicio);
    if (ms < 0) return null;
    const min = Math.floor(ms / 60000);
    const seg = Math.floor((ms % 60000) / 1000);
    if (min === 0) return `${seg}s`;
    return `${min}m${String(seg).padStart(2, '0')}s`;
  }

  function truncMeio(s, ini = 12, fim = 4) {
    if (!s) return '—';
    if (s.length <= ini + fim + 1) return s;
    return `${s.slice(0, ini)}…${s.slice(-fim)}`;
  }

  // Detecta se é dispositivo móvel pra adaptar comportamento do "Ligar"
  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  }

  // Card individual de entrega — extraído pra ficar legível
  // 🆕 2026-05 Hub — rótulo + ícone do provedor de uma entrega.
  // O registro pode trazer provider_code (logistics_deliveries) ou não
  // (uber_entregas legado). Sem o campo, assume 'uber' — é o que há na
  // tabela legada hoje. Quando a leitura migrar pra logistics_deliveries
  // (Fase 6), o provider real já aparece sem mudar nada aqui.
  // Copia o numero da OS pro clipboard (com fallback) e avisa via toast.
  function copiarTextoOS(codigo, showToast) {
    const txt = String(codigo == null ? '' : codigo);
    const ok = function () { if (showToast) showToast('OS ' + txt + ' copiada', 'success'); };
    const fail = function () { if (showToast) showToast('Nao foi possivel copiar', 'error'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(ok, fail);
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta); ok();
      } catch (e) { fail(); }
    }
  }

  function provedorInfo(entrega) {
    const code = (entrega && (entrega.provider_code || entrega.provider)) || null;
    if (code === 'noventanove' || code === '99') return { code: 'noventanove', nome: '99Entrega', tipo: '99', icone: '🛵' };
    if (code === 'uber') return { code: 'uber', nome: 'Uber Direct', tipo: 'uber', icone: '🛵' };
    return { code: code, nome: code || 'Sem provedor', tipo: 'na', icone: '📦' };
  }

  // ──────────────────────────────────────────────────────────
  // ProviderLogo — logo oficial redondo do provedor logístico.
  // SVGs embutidos inline (sem arquivo externo → sem risco de 404).
  //  - uber: app icon oficial, círculo preto, wordmark branco.
  //  - 99Entrega: ícone oficial (Preto.svg) recortado em círculo via CSS.
  // Provider desconhecido → fallback com a inicial num círculo cinza.
  // ──────────────────────────────────────────────────────────
  const PROVIDER_SVGS = {
    uber:
      '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="30" cy="30" r="30" fill="black"/>' +
      '<path d="M14.3206 35.4962C16.3593 35.4962 17.9356 33.9227 17.9356 31.5943V22.5322H20.1422V37.2163H17.9566V35.8527C16.9688 36.8805 15.6028 37.4678 14.0682 37.4678C10.9151 37.4678 8.49786 35.1814 8.49786 31.7216V22.5346H10.7045V31.5943C10.7045 33.9647 12.2598 35.4962 14.3199 35.4962" fill="white"/>' +
      '<path d="M21.7828 22.5324H23.9056V27.8815C24.4007 27.3754 24.9925 26.9735 25.6459 26.6997C26.2993 26.4258 27.0012 26.2855 27.7099 26.287C30.863 26.287 33.343 28.7834 33.343 31.888C33.343 34.9717 30.863 37.4677 27.7099 37.4677C26.9978 37.4696 26.2925 37.3296 25.6353 37.0559C24.9781 36.7821 24.3823 36.3802 23.8828 35.8736V37.2155H21.7797L21.7828 22.5324ZM27.563 35.601C29.5811 35.601 31.2415 33.9436 31.2415 31.888C31.2415 29.8112 29.5811 28.175 27.563 28.175C25.524 28.175 23.8635 29.8112 23.8635 31.888C23.8635 33.9436 25.503 35.601 27.563 35.601Z" fill="white"/>' +
      '<path d="M39.6917 26.3083C42.7813 26.3083 45.0517 28.6786 45.0517 31.8673V32.5596H36.3297C36.6241 34.3006 38.0743 35.6013 39.881 35.6013C41.1222 35.6013 42.1724 35.0975 42.9709 34.0278L44.5055 35.1605C43.4333 36.5871 41.8359 37.4469 39.881 37.4469C36.6652 37.4469 34.1848 35.0556 34.1848 31.8673C34.1848 28.8466 36.56 26.3083 39.692 26.3083H39.6917ZM36.3707 30.8815H42.9078C42.5506 29.245 41.2263 28.1543 39.65 28.1543C38.0736 28.1543 36.7493 29.245 36.3707 30.8815Z" fill="white"/>' +
      '<path d="M50.7474 28.4061C49.36 28.4061 48.3511 29.4759 48.3511 31.133V37.2164H46.228V26.5181H48.3311V27.8408C48.8566 26.9806 49.7185 26.4352 50.8956 26.4352H51.6311V28.4072L50.7474 28.4061Z" fill="white"/>' +
      '</svg>',
    noventanove:
      '<svg viewBox="0 0 209 209" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M0 46.4444C0 20.7939 20.7939 0 46.4444 0H162.556C188.206 0 209 20.7939 209 46.4444V162.556C209 188.206 188.206 209 162.556 209H46.4444C20.7939 209 0 188.206 0 162.556V46.4444Z" fill="#212121"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M68.3442 55.1528C79.373 55.1528 89.1552 60.5957 95.2622 68.9939C99.1792 74.3808 101.576 80.9841 101.855 88.1472V89.3804C101.855 96.36 99.8283 102.865 96.3157 108.275L67.5618 153.086C67.2567 153.561 66.7381 153.847 66.1817 153.847H43.3702C42.2719 153.847 41.613 152.602 42.2148 151.663L60.7855 122.723C45.9202 119.221 34.8334 105.627 34.8334 89.3804L34.8643 88.1472C35.1118 81.0028 37.498 74.4152 41.3972 69.0364C47.502 60.6143 57.2972 55.1528 68.3442 55.1528ZM68.3442 100.691C72.3576 100.691 75.909 98.7126 78.1455 95.6683L79.081 94.2104C80.0497 92.4185 80.6038 90.3607 80.6029 88.1472C80.5912 81.2422 75.1079 75.6479 68.3442 75.6479C61.5805 75.6479 56.0977 81.2422 56.0846 88.1692C56.0846 95.0851 61.5735 100.691 68.3442 100.691Z" fill="#F1F1F1"/>' +
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M167.573 68.9939C161.467 60.5957 151.685 55.1528 140.656 55.1528C129.609 55.1528 119.813 60.6143 113.709 69.0364C109.81 74.4152 107.423 81.0028 107.175 88.1472L107.145 89.3804C107.145 105.627 118.232 119.221 133.097 122.723L114.526 151.663C113.924 152.602 114.583 153.847 115.681 153.847H138.493C139.049 153.847 139.568 153.561 139.873 153.086L168.627 108.275C172.14 102.865 174.167 96.36 174.167 89.3804V88.1472C173.887 80.9841 171.49 74.3808 167.573 68.9939ZM140.656 100.691C144.669 100.691 148.221 98.7126 150.457 95.6683L151.392 94.2104C152.361 92.4185 152.915 90.3607 152.914 88.1472C152.903 81.2422 147.419 75.6479 140.656 75.6479C133.892 75.6479 128.409 81.2422 128.396 88.1692C128.396 95.0852 133.885 100.691 140.656 100.691Z" fill="#F1F1F1"/>' +
      '</svg>',
  };

  function ProviderLogo({ code, size = 22 }) {
    const c = (code === '99') ? 'noventanove' : code;
    const svg = PROVIDER_SVGS[c];
    const base = {
      width: size, height: size,
      borderRadius: '50%',
      flexShrink: 0,
      display: 'inline-block',
      verticalAlign: 'middle',
    };
    if (svg) {
      // O SVG da 99 é um quadrado de cantos arredondados; overflow:hidden +
      // borderRadius 50% recorta num círculo perfeito. O da Uber já é círculo.
      return h('span', {
        style: { ...base, overflow: 'hidden', lineHeight: 0 },
        dangerouslySetInnerHTML: { __html: svg },
        title: c === 'uber' ? 'Uber Direct' : c === 'noventanove' ? '99Entrega' : code,
      });
    }
    // Fallback — provider sem logo: círculo cinza com a inicial.
    return h('span', {
      style: {
        ...base,
        background: '#e5e7eb',
        color: '#4b5563',
        fontSize: size * 0.5,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: `${size}px`,
      },
    }, String(code || '?').charAt(0).toUpperCase());
  }

  // SeloProvider — selo de TEXTO colorido pra diferenciar o provedor num relance.
  //  uber → preto/branco (marca Uber) · 99 → amarelo (marca 99) · sem provider → cinza neutro.
  // Acompanha o ProviderLogo; nunca assume 'uber' por omissão (fallback neutro).
  function SeloProvider({ code }) {
    const c = (code === '99') ? 'noventanove' : code;
    let texto, estilo, title;
    if (c === 'uber') {
      texto = 'Uber'; title = 'Uber Direct';
      estilo = { background: '#111827', color: '#ffffff' };
    } else if (c === 'noventanove') {
      texto = '99'; title = '99Entrega';
      estilo = { background: '#FAC775', color: '#412402' };
    } else {
      texto = 'sem provedor'; title = 'Sem provedor identificado';
      estilo = { background: '#f3f4f6', color: '#6b7280', border: '0.5px solid #d1d5db' };
    }
    return h('span', {
      title,
      style: {
        fontSize: '10px', fontWeight: 600, padding: '1px 7px',
        borderRadius: '999px', whiteSpace: 'nowrap', lineHeight: '16px',
        flexShrink: 0, ...estilo,
      },
    }, texto);
  }

  function CardEntrega({ entrega, onCancelar, onVerTracking, onVerDetalhes, onRedespachar, showToast }) {
    const e = entrega;

    const valorUber           = parseFloat(e.valor_uber || e.valor_provider || 0);
    const valorHub            = parseFloat(e.valor_servico || 0);   // preço calculado pelo hub (km)
    const margemHub           = Math.round((valorHub - valorUber) * 100) / 100;
    const margemHubPct        = valorUber > 0 ? Math.round((margemHub / valorUber) * 1000) / 10 : null;
    const margemPos           = margemHub >= 0;
    // Valores originais (audit — usados só se precisar)
    const valorClienteOriginal = parseFloat(e.valor_servico_mapp_original || e.valor_servico || 0);
    const valorProfOriginal    = parseFloat(e.valor_profissional_mapp_original || e.valor_profissional || 0);

    const prov           = provedorInfo(e);

    const TERMINAIS_CANON = ['DELIVERED', 'CANCELED', 'RETURNED', 'FAILED', 'FALLBACK_QUEUE'];
    const TERMINAIS_NATIVE = ['delivered', 'cancelado', 'canceled', 'entregue', 'finalizado', 'concluido', 'fallback_fila'];
    const podeCancelar = !TERMINAIS_CANON.includes(e.status_canonico)
      && !TERMINAIS_NATIVE.includes(e.status_uber);
    const temEntregador = !!e.entregador_nome && !estaProcurando(e);

    const duracao = calcularDuracao(e.created_at, e.finalizado_at);

    async function copiarTel() {
      if (!e.entregador_telefone) {
        showToast?.('Sem telefone do entregador', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(e.entregador_telefone);
        showToast?.('Telefone copiado: ' + e.entregador_telefone, 'success');
      } catch (err) {
        // Fallback pra browsers/contextos sem clipboard API
        const ta = document.createElement('textarea');
        ta.value = e.entregador_telefone;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast?.('Telefone copiado', 'success'); }
        catch { showToast?.('Não foi possível copiar', 'error'); }
        document.body.removeChild(ta);
      }
    }

    function ligar() {
      if (!e.entregador_telefone) {
        showToast?.('Sem telefone do entregador', 'error');
        return;
      }
      // Em mobile abre o discador. Em desktop, copia o número (porque tel: raramente funciona)
      if (isMobile()) {
        window.location.href = `tel:${e.entregador_telefone}`;
      } else {
        copiarTel();
        showToast?.('Desktop: número copiado, ligue do seu celular', 'info');
      }
    }

    return h('div', {
      className: 'bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 space-y-4',
    },

      // ── Cabeçalho ──
      h('div', { className: 'flex items-start justify-between gap-3 pb-3 border-b border-gray-100' },
        h('div', { className: 'flex flex-col gap-1 min-w-0 flex-1' },
          h('div', { className: 'flex items-center gap-3 flex-wrap' },
            h('span', { className: 'text-lg md:text-xl font-bold text-gray-800 cursor-pointer', title: 'Clique para copiar a OS', onClick: (ev) => { ev.stopPropagation(); copiarTextoOS(e.codigo_os, showToast); } }, `OS ${e.codigo_os}`),
            h(Badge, { entrega: e }),
            h('span', {
              className: 'inline-flex items-center gap-1.5',
              title: 'Provedor que despachou esta entrega',
            },
              h(ProviderLogo, { code: prov.code, size: 18 })
            ),
          ),
          // Nome do cliente vindo da regra que casou (ou "Manual" se foi despacho manual)
          h('div', { className: 'text-xs text-gray-500' },
            'Cliente: ',
            h('span', { className: 'font-semibold text-gray-700' },
              e.cliente_nome_regra || 'Manual / sem regra')
          ),
        ),
        h('div', { className: 'flex gap-2 flex-shrink-0 flex-wrap justify-end' },
          onVerTracking && h('button', {
            onClick: () => onVerTracking(e),
            disabled: !(e.rastreio_token || e.tracking_url),
            title: e.rastreio_token ? 'Abrir rastreio Tutts' : (e.tracking_url ? 'Abrir rastreio no provedor' : 'Rastreio ainda nao disponivel'),
            className: `text-xs px-3 py-1.5 border rounded-lg ${
              (e.rastreio_token || e.tracking_url)
                ? 'border-gray-200 hover:bg-gray-50 text-gray-700'
                : 'border-gray-100 text-gray-300 cursor-not-allowed'
            }`,
          }, 'Tracking'),
          // Badge de código de coleta — visível no card para acesso rápido
          e.pickup_code && h('span', {
            title: `Código de coleta: ${e.pickup_code}`,
            className: 'text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded font-mono font-semibold cursor-default border border-amber-200',
            onClick: () => navigator.clipboard?.writeText(e.pickup_code),
          }, `🔑 ${e.pickup_code}`),
          onVerDetalhes && h('button', {
            onClick: () => onVerDetalhes(e),
            className: 'text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700',
          }, 'Detalhes'),
          podeCancelar && onRedespachar && h('button', {
            onClick: () => onRedespachar(e),
            title: 'Cancelar e redespachar com novo endereço de entrega',
            className: 'text-xs px-3 py-1.5 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50',
          }, 'Editar endereço'),
          podeCancelar && h('button', {
            onClick: () => onCancelar(e),
            className: 'text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50',
          }, 'Cancelar'),
        )
      ),

      // ── Endereços lado a lado ──
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
        h('div', null,
          h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' }, '📦 Coleta'),
          h('div', { className: 'text-sm text-gray-800 leading-relaxed break-words' }, e.endereco_coleta || '—'),
          CodigoBadge('Código de coleta', e.pickup_code)
        ),
        h('div', null,
          h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' }, '📍 Entrega'),
          h('div', { className: 'text-sm text-gray-800 leading-relaxed break-words' }, e.endereco_entrega || '—'),
          CodigoBadge('Código de entrega', e.dropoff_code)
        ),
      ),

      // ── 3 cards operacionais: custo provedor / preço hub / margem ──
      h('div', { className: 'grid grid-cols-3 gap-2' },
        h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
          h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Custo do provedor'),
          h('div', { className: 'text-base font-semibold text-gray-800' }, fmtMoney(valorUber)),
          e.distancia_km && h('div', {
              className: 'text-[10px] mt-0.5 ' + (e.distancia_origem === 'haversine' ? 'text-amber-500' : 'text-gray-400'),
              title: e.distancia_origem === 'haversine'
                ? 'Distância estimada em linha reta (o provedor não retornou a rota)'
                : e.distancia_origem === 'provider'
                  ? 'Distância da rota retornada pelo provedor'
                  : ''
            },
            `📏 ${parseFloat(e.distancia_km).toFixed(1)} km` +
            (e.distancia_origem === 'haversine' ? ' · estimado (linha reta)'
              : e.distancia_origem === 'provider' ? ' · do provedor'
              : ''))
        ),
        h('div', { className: 'bg-purple-50 rounded-lg px-3 py-2.5' },
          h('div', { className: 'text-[11px] text-purple-600 mb-0.5' }, 'Valor pela regra (km)'),
          h('div', { className: 'text-base font-semibold text-purple-800' }, fmtMoney(valorHub))
        ),
        h('div', { className: `rounded-lg px-3 py-2.5 ${margemPos ? 'bg-green-50' : 'bg-red-50'}` },
          h('div', { className: `text-[11px] mb-0.5 ${margemPos ? 'text-green-700' : 'text-red-700'}` }, 'Margem'),
          h('div', { className: `text-base font-semibold ${margemPos ? 'text-green-800' : 'text-red-800'}` },
            `${margemPos ? '+ ' : '− '}${fmtMoney(Math.abs(margemHub))}`),
          margemHubPct !== null && h('div', { className: `text-[10px] mt-0.5 ${margemPos ? 'text-green-600' : 'text-red-600'}` },
            `${margemPos ? '+' : ''}${margemHubPct.toFixed(1)}%`)
        ),
      ),

      // ── Bloco do entregador ──
      temEntregador
        ? h('div', { className: 'flex items-center gap-3 p-3 bg-gray-50 rounded-lg' },
            // Avatar
            // Avatar — foto real do entregador se vier, senão iniciais
            e.entregador_foto
              ? h('img', {
                  src: e.entregador_foto,
                  alt: e.entregador_nome,
                  className: 'w-11 h-11 rounded-full object-cover flex-shrink-0 bg-purple-100',
                  onError: (ev) => {
                    // Se a URL expirou ou falhou, esconde a img e o div abaixo aparece
                    ev.target.style.display = 'none';
                    const fallback = ev.target.nextSibling;
                    if (fallback) fallback.style.display = 'flex';
                  },
                })
              : null,
            h('div', {
              className: 'w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center font-semibold text-sm text-purple-700 flex-shrink-0',
              style: e.entregador_foto ? { display: 'none' } : {},
            }, iniciaisDoNome(e.entregador_nome)),

            // Info
            h('div', { className: 'flex-1 min-w-0' },
              h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('span', { className: 'text-sm font-semibold text-gray-800' }, e.entregador_nome),
                e.entregador_rating && h('span', { className: 'text-xs text-gray-600' }, `★ ${e.entregador_rating}`),
                e.id_motoboy_mapp && h('span', { className: 'text-[11px] text-gray-400' }, `· id Mapp ${e.id_motoboy_mapp}`),
              ),
              h('div', { className: 'text-xs text-gray-600 mt-0.5 break-words' },
                [
                  fmtTelefoneBR(e.entregador_telefone),
                  e.entregador_veiculo,
                  e.entregador_placa,
                ].filter(Boolean).join(' · ') || '—'
              ),
            ),

            // Ações
            e.entregador_telefone && h('div', { className: 'flex gap-1.5 flex-shrink-0' },
              h('button', {
                onClick: copiarTel,
                title: 'Copiar telefone',
                className: 'text-[11px] px-2.5 py-1.5 border border-gray-200 rounded-md hover:bg-white text-gray-700',
              }, 'Copiar'),
              h('button', {
                onClick: ligar,
                title: 'Ligar pro entregador',
                className: 'text-[11px] px-2.5 py-1.5 border border-gray-200 rounded-md hover:bg-white text-gray-700',
              }, 'Ligar'),
            ),
          )
        : h('div', { className: 'p-3 bg-gray-50 rounded-lg text-xs text-gray-400 italic text-center' },
            // Sem dados do entregador. A mensagem depende do status: se a
            // entrega já avançou (provider não expôs o courier — comum em
            // sandbox), não faz sentido dizer "aguardando atribuição".
            (function () {
              const st = e.status_canonico;
              if (st === 'DELIVERED')   return 'Entrega concluída.';
              if (st === 'CANCELED' || st === 'FAILED' || st === 'RETURNED')
                return 'Entrega encerrada sem entregador vinculado.';
              if (['COURIER_ASSIGNED','PICKUP_EN_ROUTE','ARRIVED_PICKUP',
                   'PICKED_UP','DROPOFF_EN_ROUTE','ARRIVED_DROPOFF'].includes(st))
                return 'Em andamento — dados do entregador não informados pelo provedor.';
              return 'Aguardando atribuição de entregador...';
            })()
          ),

      // ── Rodapé com timestamps ──
      h('div', { className: 'flex items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex-wrap' },
        h('span', null,
          'Despachada ', fmtDT(e.created_at),
          e.finalizado_at ? ` · Finalizada ${fmtDT(e.finalizado_at)}` : '',
          duracao ? ` · Duração ${duracao}` : '',
        ),
      ),
    );
  }

  // Data local (YYYY-MM-DD) de um timestamp, no fuso de Brasília.
  function dataLocalBRT(ts) {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  }

  // ════════════════════════════════════════════════════════
  // TEMPO / TRILHA — indicador de coleta nos cards + trilha no detalhe
  // ════════════════════════════════════════════════════════
  const SLA_COLETA_MIN = 15;  // limite global despacho→coleta (min). Acima disso = atrasado.
  const SLA_LOCALIZAR_MIN = 10;  // limite (min) p/ localizar entregador (estágio 1).

  // Tabela "Prazo Padrão" (faixas km → minutos) carregada de GET /bi/prazo-padrao.
  // Cache em escopo de módulo, compartilhada por todos os cards.
  let _prazoFaixas = null;
  function setPrazoFaixas(fx) { _prazoFaixas = Array.isArray(fx) ? fx : null; }
  // Prazo total (min) para uma distância, conforme a tabela; fallback na fórmula.
  function prazoPorKm(km) {
    if (km == null || isNaN(km)) return null;
    const fx = _prazoFaixas;
    if (Array.isArray(fx) && fx.length) {
      for (const f of fx) {
        const lo = Number(f.km_min) || 0;
        const hi = (f.km_max == null || f.km_max === '') ? Infinity : Number(f.km_max);
        if (km >= lo && km < hi) return Number(f.prazo_minutos) || null;
      }
      const ult = fx[fx.length - 1];
      if (ult && Number(ult.prazo_minutos)) return Number(ult.prazo_minutos);
    }
    return 60 + Math.max(0, Math.ceil((km - 10) / 5)) * 15;
  }

  function _tsValido(x) { const t = x ? new Date(x).getTime() : NaN; return isNaN(t) ? null : t; }
  function _minsEntre(a, b) {
    const d1 = _tsValido(a), d2 = _tsValido(b);
    if (d1 == null || d2 == null) return null;
    return Math.max(0, Math.round((d2 - d1) / 60000));
  }
  function _fmtHora(ts) {
    try { return new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch (_) { return '—'; }
  }
  function _fmtDur(min) {
    if (min == null) return null;
    if (min < 60) return min + ' min';
    const hh = Math.floor(min / 60), mm = min % 60;
    return hh + 'h' + (mm ? ' ' + mm + 'min' : '');
  }
  function _clsFaixa(min) {
    if (min == null) return 'bg-gray-50 text-gray-500';
    if (min > SLA_COLETA_MIN) return 'bg-red-50 text-red-700';
    if (min >= SLA_COLETA_MIN - 5) return 'bg-amber-50 text-amber-700';
    return 'bg-green-50 text-green-700';
  }

  // Indicador de tempo do card. Retorna { label, texto, cls } ou null.
  function indicadorTempo(e) {
    const st = e && e.status_canonico;
    if (['CANCELED', 'FAILED', 'FALLBACK_QUEUE'].includes(st)) return null;

    const km      = e.distancia_km != null ? parseFloat(e.distancia_km) : null;
    const prazo   = prazoPorKm(km);                       // SLA total (min) por distância
    const metaTxt = prazo != null ? ' / ' + _fmtDur(prazo) : '';

    // ENTREGUE → tempo total (desde a criação) vs SLA da tabela
    if (st === 'DELIVERED') {
      const fim = _tsValido(e.entregue_at) || _tsValido(e.finalizado_at);
      const tot = fim != null ? _minsEntre(e.created_at, fim) : null;
      if (tot == null) return { label: 'entregue', texto: '✓ concluída', cls: 'bg-gray-50 text-gray-500' };
      const dentro = (prazo != null) ? tot <= prazo : null;
      const cls = dentro == null ? 'bg-gray-50 text-gray-500' : (dentro ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700');
      const suf = dentro == null ? '' : (dentro ? ' · no prazo' : ' · fora do prazo');
      return { label: 'tempo total', texto: '✓ ' + (_fmtDur(tot) || '—') + metaTxt + suf, cls };
    }
    if (st === 'RETURNED') {
      return { label: 'devolução', texto: '↩ devolvido', cls: 'bg-amber-50 text-amber-700' };
    }

    // cor por (decorrido, limite) com faixa curta de atenção (3 min antes)
    const _corLim = (mm, lim) => {
      if (lim == null || mm == null) return 'bg-green-50 text-green-700';
      if (mm > lim) return 'bg-red-50 text-red-700';
      if (mm >= lim - 3) return 'bg-amber-50 text-amber-700';
      return 'bg-green-50 text-green-700';
    };

    // EM ROTA (já coletou) → tempo desde a criação vs SLA por distância
    const emRota = ['PICKED_UP', 'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF'].includes(st) || !!e.coletado_at;
    if (emRota) {
      const m = _minsEntre(e.created_at, Date.now());
      const atrasado = prazo != null && m != null && m > prazo;
      const perto    = prazo != null && m != null && m >= prazo - 10 && m <= prazo;
      const cls = atrasado ? 'bg-red-50 text-red-700' : (perto ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700');
      return { label: 'em rota de entrega', texto: '🛵 ' + (m != null ? _fmtDur(m) : '—') + metaTxt + (atrasado ? ' · atrasado' : ''), cls };
    }

    // ESTÁGIO 2 — entregador atribuído → coleta: limite desde a ATRIBUIÇÃO
    const atribuido = !estaProcurando(e) && (!!e.entregador_nome || ['COURIER_ASSIGNED', 'PICKUP_EN_ROUTE', 'ARRIVED_PICKUP'].includes(st));
    if (atribuido) {
      const base = _tsValido(e.atribuido_at) || _tsValido(e.created_at);
      const m = _minsEntre(base, Date.now());
      const atrasado = m != null && m > SLA_COLETA_MIN;
      return { label: 'aguardando coleta', texto: '⏱ ' + (m != null ? _fmtDur(m) : '—') + ' / ' + _fmtDur(SLA_COLETA_MIN) + (atrasado ? ' · atrasado' : ''), cls: _corLim(m, SLA_COLETA_MIN) };
    }

    // ESTÁGIO 1 — procurando entregador: limite desde a CRIAÇÃO
    const mLoc = _minsEntre(e.created_at, Date.now());
    const atrasadoLoc = mLoc != null && mLoc > SLA_LOCALIZAR_MIN;
    return { label: 'aguardando entregador', texto: '⏱ ' + (mLoc != null ? _fmtDur(mLoc) : '—') + ' / ' + _fmtDur(SLA_LOCALIZAR_MIN) + (atrasadoLoc ? ' · atrasado' : ''), cls: _corLim(mLoc, SLA_LOCALIZAR_MIN) };
  }
  // Extrai o payload de um evento (JSONB pode vir como objeto ou string).
  function _payloadEvt(w) {
    let p = w && w.payload;
    if (typeof p === 'string') { try { p = JSON.parse(p); } catch (_) { p = null; } }
    return p || null;
  }

  // Trilha da entrega: Criação → Coleta → (Devolução) → Entrega, com duração
  // por estágio, trocas de entregador (payload.reatribuicao) e devolução.
  function TrilhaEntrega({ entrega: e, webhooks }) {
    const evs = Array.isArray(webhooks) ? webhooks : [];
    const primeiroEvento = (canon) => {
      const arr = evs.filter(w => String(w.status_canonico || '').toUpperCase() === canon)
                     .map(w => _tsValido(w.created_at)).filter(x => x != null);
      return arr.length ? Math.min.apply(null, arr) : null;
    };
    const trocas = evs.map(w => {
      const p = _payloadEvt(w);
      if (!p || p.reatribuicao !== true) return null;
      return { ts: _tsValido(w.created_at), idAnterior: p.id_anterior };
    }).filter(x => x && x.ts != null);

    const tCriacao = _tsValido(e.created_at);
    const tColeta  = _tsValido(e.coletado_at) || primeiroEvento('PICKED_UP');
    const tRetorno = primeiroEvento('RETURNED');
    const tEntrega = _tsValido(e.entregue_at) || primeiroEvento('DELIVERED')
                   || (e.status_canonico === 'DELIVERED' ? _tsValido(e.finalizado_at) : null);
    const houveDevol = tRetorno != null || e.status_canonico === 'RETURNED';

    const marcos = [];
    if (tCriacao != null) marcos.push({ k: 'criacao', titulo: 'Criação / Despacho', ts: tCriacao, node: 'done' });
    if (tColeta  != null) marcos.push({ k: 'coleta',  titulo: 'Coleta',             ts: tColeta,  node: 'done' });
    if (tRetorno != null) marcos.push({ k: 'devol',   titulo: 'Devolução iniciada', ts: tRetorno, node: 'warn', nota: 'Item retornando ao remetente (sendback)' });
    if (tEntrega != null) marcos.push({ k: 'entrega', titulo: houveDevol ? 'Devolução concluída' : 'Entrega', ts: tEntrega, node: 'done' });
    marcos.sort((a, b) => a.ts - b.ts);
    if (marcos.length === 0) return null;

    const totalMin = marcos.length >= 2 ? Math.round((marcos[marcos.length - 1].ts - marcos[0].ts) / 60000) : null;

    return h('div', { className: 'pt-3 border-t border-gray-100' },
      h('div', { className: 'text-xs uppercase tracking-wider text-purple-700 font-semibold mb-3' }, '🧭 Trilha da entrega'),
      h('div', { className: 'pl-1' },
        marcos.map((m, i) => {
          const prox = marcos[i + 1];
          const durMin = prox ? Math.round((prox.ts - m.ts) / 60000) : null;
          const trocasAqui = trocas.filter(t => t.ts >= m.ts && (!prox || t.ts < prox.ts));
          const dotCls = m.node === 'warn' ? 'border-amber-500 bg-amber-500' : 'border-purple-600 bg-purple-600';
          const durLate = m.k === 'criacao' && durMin != null && durMin > SLA_COLETA_MIN;
          return h('div', { key: i, className: 'flex gap-3' },
            h('div', { className: 'flex flex-col items-center flex-shrink-0' },
              h('span', { className: `w-3 h-3 rounded-full border-2 ${dotCls}` }),
              prox && h('span', { className: 'w-0.5 flex-1 bg-gray-200 my-1', style: { minHeight: '22px' } }),
            ),
            h('div', { className: 'flex-1 pb-3' },
              h('div', { className: 'text-[13px] font-bold text-gray-800' }, m.titulo),
              h('div', { className: 'text-[11px] text-gray-400 mt-0.5' }, _fmtHora(m.ts)),
              m.nota && h('div', { className: 'text-[11px] text-amber-700 bg-amber-50 rounded-md px-2 py-1 mt-1 inline-block' }, '↩ ' + m.nota),
              trocasAqui.map((t, j) => h('div', { key: 'tr' + j, className: 'text-[11px] text-purple-700 bg-purple-50 rounded-md px-2 py-1 mt-1' },
                '🔄 Troca de entregador · ' + _fmtHora(t.ts) + (t.idAnterior ? ' — anterior #' + t.idAnterior : ''))),
              durMin != null && h('div', { className: `text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded ${durLate ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}` },
                (m.k === 'criacao' ? (_fmtDur(durMin) + ' até a coleta') : (_fmtDur(durMin) + ' até ' + prox.titulo.toLowerCase())) + (durLate ? ' · acima do SLA' : '')),
            ),
          );
        }),
      ),
      totalMin != null && h('div', { className: 'flex justify-between items-center pt-2 mt-1 border-t border-gray-100 text-[12px] font-bold text-gray-700' },
        h('span', null, 'Tempo total'), h('span', null, _fmtDur(totalMin) || '—')),
    );
  }

  // ════════════════════════════════════════════════════════
  // KANBAN — visão por status (reusa helpers e a mesma lógica do CardEntrega)
  // ════════════════════════════════════════════════════════
  const KANBAN_COLS = [
    { id: 'aguard',   nome: 'Aguardando entregador', dot: 'bg-purple-500', cnt: 'bg-purple-500' },
    { id: 'coleta',   nome: 'Aguardando coleta',     dot: 'bg-blue-500',   cnt: 'bg-blue-500' },
    { id: 'coletou',  nome: 'Coletou',               dot: 'bg-amber-500',  cnt: 'bg-amber-500' },
    { id: 'entregue', nome: 'Entregue',              dot: 'bg-green-500',  cnt: 'bg-green-500' },
    { id: 'devol',    nome: 'Devolução',             dot: 'bg-orange-500', cnt: 'bg-orange-500' },
    { id: 'cancel',   nome: 'Cancelado',             dot: 'bg-gray-400',   cnt: 'bg-gray-400' },
    { id: 'falha',    nome: 'Falhas',                dot: 'bg-red-500',    cnt: 'bg-red-500' },
  ];

  // Mapeia uma entrega pra uma das 7 colunas, a partir do status canônico
  // (com rede de segurança no status nativo/legado).
  function colunaDoStatus(e) {
    const c = String((e && e.status_canonico) || '').toUpperCase();
    const n = String((e && e.status_uber) || '').toLowerCase();
    if (c === 'DELIVERED' || ['delivered', 'entregue', 'completed', 'finalizado', 'concluido'].includes(n)) return 'entregue';
    if (c === 'RETURNED' || ['sendback', 'sendbackcompleted', 'devolucao', 'devolvido'].includes(n)) return 'devol';
    if (c === 'CANCELED' || ['canceled', 'cancelado'].includes(n)) return 'cancel';
    if (c === 'FAILED' || c === 'FALLBACK_QUEUE' || ['erro', 'fallback_fila'].includes(n)) return 'falha';
    if (['PICKED_UP', 'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF'].includes(c) || ['pickup_complete', 'dropoff'].includes(n)) return 'coletou';
    if (['COURIER_ASSIGNED', 'PICKUP_EN_ROUTE', 'ARRIVED_PICKUP'].includes(c) || ['entregador_atribuido', 'pickup', 'waiting'].includes(n)) return 'coleta';
    return 'aguard';
  }

  // Card compacto do Kanban — MESMA informação do CardEntrega, em compartimentos.
  function CardKanban({ entrega, coluna, onCancelar, onVerTracking, onVerDetalhes, onRedespachar, onReportar, onChat, unread, ehFrequente, showToast }) {
    const e = entrega;
    const freq = !!(ehFrequente && e.entregador_telefone && ehFrequente(e.entregador_telefone));
    const valorUber    = parseFloat(e.valor_uber || e.valor_provider || 0);
    const valorHub     = parseFloat(e.valor_servico || 0);
    const margemHub    = Math.round((valorHub - valorUber) * 100) / 100;
    const margemHubPct = valorUber > 0 ? Math.round((margemHub / valorUber) * 1000) / 10 : null;
    const margemPos    = margemHub >= 0;
    const temCusto     = valorUber > 0;
    const prov         = provedorInfo(e);
    const eh99         = ['noventanove','99'].includes(String(e.provider_code || e.provider || '').toLowerCase());
    const ind          = indicadorTempo(e);

    const TERMINAIS_CANON  = ['DELIVERED', 'CANCELED', 'RETURNED', 'FAILED', 'FALLBACK_QUEUE'];
    const TERMINAIS_NATIVE = ['delivered', 'cancelado', 'canceled', 'entregue', 'finalizado', 'concluido', 'fallback_fila'];
    const podeCancelar  = !TERMINAIS_CANON.includes(e.status_canonico) && !TERMINAIS_NATIVE.includes(e.status_uber);
    const temEntregador = !!e.entregador_nome && !estaProcurando(e);

    function copiarTel() {
      if (!e.entregador_telefone) { showToast && showToast('Sem telefone do entregador', 'error'); return; }
      try { navigator.clipboard.writeText(e.entregador_telefone); showToast && showToast('Telefone copiado', 'success'); }
      catch (_) { showToast && showToast('Não foi possível copiar', 'error'); }
    }
    function ligar() {
      if (!e.entregador_telefone) { showToast && showToast('Sem telefone do entregador', 'error'); return; }
      if (isMobile()) { window.location.href = `tel:${e.entregador_telefone}`; }
      else { copiarTel(); showToast && showToast('Desktop: número copiado, ligue do seu celular', 'info'); }
    }
    function msgSemEntregador() {
      const st = e.status_canonico;
      if (st === 'DELIVERED') return 'Entrega concluída.';
      if (st === 'CANCELED' || st === 'FAILED' || st === 'RETURNED' || st === 'FALLBACK_QUEUE') return 'Encerrada sem entregador.';
      if (['COURIER_ASSIGNED', 'PICKUP_EN_ROUTE', 'ARRIVED_PICKUP', 'PICKED_UP', 'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF'].includes(st))
        return 'Em andamento — entregador não informado.';
      return 'Aguardando atribuição…';
    }

    return h('div', { className: `bg-white rounded-xl shadow-sm overflow-hidden ${freq ? 'border-2 border-amber-300' : 'border border-gray-200'}` },
      // faixa "Parceiro frequente" no topo (Opcao A)
      freq && h('div', { className: 'flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-[11px] font-bold' },
        h('span', null, '👑'),
        h('span', null, 'Parceiro frequente'),
      ),
      // cabeçalho
      h('div', { className: 'flex items-center gap-2 px-3 pt-3 pb-2' },
        h('span', { className: 'text-sm font-bold text-gray-800 cursor-pointer', title: 'Clique para copiar a OS', onClick: (ev) => { ev.stopPropagation(); copiarTextoOS(e.codigo_os, showToast); } }, `OS ${e.codigo_os}`),
        h(Badge, { entrega: e }),
        h('span', { className: 'ml-auto inline-flex items-center gap-1.5 flex-shrink-0' },
          h(ProviderLogo, { code: prov.code, size: 15 })),
      ),
      // cliente
      h('div', { className: 'px-3 pb-2 text-[11px] text-gray-500 font-semibold border-b border-gray-100' },
        'Cliente: ', e.cliente_nome_regra || 'Manual / sem regra'),
      // faixa de tempo — indicador de coleta / atrasado
      ind && h('div', { className: `flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 ${ind.cls}` },
        h('span', { className: 'text-[9px] uppercase tracking-wider font-semibold opacity-70' }, ind.label),
        h('span', { className: 'ml-auto text-[11px] font-bold' }, ind.texto),
      ),
      // rota
      h('div', { className: 'px-3 py-2.5 border-b border-gray-100 space-y-1.5' },
        h('div', { className: 'flex gap-2' },
          h('span', { className: 'w-2 h-2 rounded-full bg-amber-500 mt-1 flex-shrink-0' }),
          h('div', { className: 'min-w-0 flex-1' },
            h('div', { className: 'text-[9px] font-bold uppercase tracking-wider text-gray-400' }, 'Coleta'),
            h('div', { className: 'text-xs text-gray-800 leading-snug break-words' }, e.endereco_coleta || '—'),
            CodigoBadge('Código de coleta', e.pickup_code),
          )),
        h('div', { className: 'flex gap-2' },
          h('span', { className: 'w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0' }),
          h('div', { className: 'min-w-0 flex-1' },
            h('div', { className: 'text-[9px] font-bold uppercase tracking-wider text-gray-400' }, 'Entrega'),
            h('div', { className: 'text-xs text-gray-800 leading-snug break-words' }, e.endereco_entrega || '—'),
            CodigoBadge('Código de entrega', e.dropoff_code),
          )),
      ),
      // financeiro (custo / valor / margem)
      h('div', { className: 'grid grid-cols-3 border-b border-gray-100 bg-gray-50' },
        h('div', { className: 'px-2.5 py-2 border-r border-gray-100' },
          h('div', { className: 'text-[9px] uppercase tracking-wide text-gray-400 font-semibold' }, 'Custo prov.'),
          h('div', { className: 'text-xs font-bold text-gray-800 mt-0.5' }, temCusto ? fmtMoney(valorUber) : '—'),
          temCusto && e.distancia_km && h('div', { className: 'text-[9px] text-gray-400 mt-0.5' }, `🏍️ ${parseFloat(e.distancia_km).toFixed(1)} km`),
        ),
        h('div', { className: 'px-2.5 py-2 border-r border-gray-100' },
          h('div', { className: 'text-[9px] uppercase tracking-wide text-gray-400 font-semibold' }, 'Valor regra'),
          h('div', { className: 'text-xs font-bold text-gray-800 mt-0.5' }, fmtMoney(valorHub)),
          h('div', { className: 'text-[9px] text-gray-400 mt-0.5' }, 'por km'),
        ),
        h('div', { className: 'px-2.5 py-2' },
          h('div', { className: 'text-[9px] uppercase tracking-wide text-gray-400 font-semibold' }, 'Margem'),
          temCusto
            ? h('div', { className: `text-xs font-bold mt-0.5 ${margemPos ? 'text-green-700' : 'text-red-600'}` }, `${margemPos ? '+ ' : '− '}${fmtMoney(Math.abs(margemHub))}`)
            : h('div', { className: 'text-xs font-bold text-gray-300 mt-0.5' }, '—'),
          (temCusto && margemHubPct !== null) && h('div', { className: `text-[9px] mt-0.5 ${margemPos ? 'text-green-600' : 'text-red-500'}` }, `${margemPos ? '+' : ''}${margemHubPct.toFixed(1)}%`),
        ),
      ),
      // entregador
      temEntregador
        ? h('div', { className: 'flex items-center gap-2 px-3 py-2.5 border-b border-gray-100' },
            e.entregador_foto
              ? h('img', { src: e.entregador_foto, alt: e.entregador_nome, className: 'w-7 h-7 rounded-full object-cover flex-shrink-0 bg-purple-100',
                  onError: (ev) => { ev.target.style.display = 'none'; const fb = ev.target.nextSibling; if (fb) fb.style.display = 'flex'; } })
              : null,
            h('div', { className: 'w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center font-bold text-[10px] text-purple-700 flex-shrink-0', style: e.entregador_foto ? { display: 'none' } : {} }, iniciaisDoNome(e.entregador_nome)),
            h('div', { className: 'flex-1 min-w-0' },
              h('div', { className: 'text-xs font-semibold text-gray-800 truncate' }, e.entregador_nome),
              h('div', { className: 'text-[10px] text-gray-400 truncate' }, fmtTelefoneBR(e.entregador_telefone) || '—'),
            ),
            h('div', { className: 'flex gap-1 flex-shrink-0' },
              onReportar && h('button', { onClick: () => onReportar(e), title: 'Reportar ocorrencia / bloquear', className: 'text-[10px] px-2 py-1 bg-red-50 rounded-md text-red-600 hover:bg-red-100' }, '⚠️'),
              e.entregador_telefone && h('button', { onClick: copiarTel, className: 'text-[10px] px-2 py-1 bg-gray-100 rounded-md text-gray-600 hover:bg-gray-200' }, 'Copiar'),
            ),
          )
        : h('div', { className: `px-3 py-2 border-b border-gray-100 text-[11px] text-center ${(coluna.id === 'falha' || coluna.id === 'cancel') ? 'text-red-600 bg-red-50' : 'text-gray-400 italic'}` },
            msgSemEntregador()),
      // rodapé (hora despachada)
      h('div', { className: 'px-3 pt-2 pb-1 text-[10px] text-gray-400' },
        '🕐 Despachada ', fmtDT(e.created_at)),
      // ações
      h('div', { className: 'flex gap-1.5 px-2.5 pb-2.5 pt-1' },
        (eh99 && onChat) && h('button', {
          onClick: () => onChat(e),
          title: 'Abrir chat com o motoboy (99)',
          className: 'relative flex-1 text-[11px] font-semibold py-1.5 rounded-lg border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100',
        }, '\ud83d\udcac Chat',
          (unread > 0) && h('span', { className: 'absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center', style: { background: '#f67602' } }, unread > 9 ? '9+' : String(unread))
        ),
        h('button', {
          onClick: () => onVerTracking && onVerTracking(e),
          disabled: !(e.rastreio_token || e.tracking_url),
          className: `flex-1 text-[11px] font-semibold py-1.5 rounded-lg border ${(e.rastreio_token || e.tracking_url) ? 'border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100' : 'border-gray-100 text-gray-300 cursor-not-allowed'}`,
        }, 'Tracking'),
        h('button', { onClick: () => onVerDetalhes && onVerDetalhes(e), className: 'flex-1 text-[11px] font-semibold py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50' }, 'Detalhes'),
        podeCancelar && onRedespachar && h('button', { onClick: () => onRedespachar(e), className: 'flex-1 text-[11px] font-semibold py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50' }, 'Editar'),
        podeCancelar && onCancelar && h('button', { onClick: () => onCancelar(e), className: 'flex-1 text-[11px] font-semibold py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50' }, 'Cancelar'),
      ),
    );
  }

  // Quadro Kanban — agrupa as entregas filtradas nas 7 colunas.
  function KanbanEntregas({ entregas, onCancelar, onVerTracking, onVerDetalhes, onRedespachar, onReportar, onChat, unreadMap, ehFrequente, showToast }) {
    // Arrastar pra rolar o quadro na horizontal (click-and-drag estilo carrossel).
    const boardRef = useRef(null);
    useEffect(() => {
      const el = boardRef.current;
      if (!el) return;
      let down = false, startX = 0, startScroll = 0;
      const onDown = (ev) => {
        if (ev.button !== 0) return;
        if (ev.target.closest('button, a, input, textarea, select')) return; // não atrapalha os botões
        down = true; startX = ev.pageX; startScroll = el.scrollLeft;
        el.classList.add('cursor-grabbing');
      };
      const onMove = (ev) => { if (down) el.scrollLeft = startScroll - (ev.pageX - startX); };
      const onUp = () => { down = false; el.classList.remove('cursor-grabbing'); };
      el.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        el.removeEventListener('mousedown', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }, []);

    const grupos = {};
    KANBAN_COLS.forEach(c => { grupos[c.id] = []; });
    (entregas || []).forEach(e => { (grupos[colunaDoStatus(e)] || grupos.aguard).push(e); });

    return h('div', { ref: boardRef, className: 'flex gap-4 overflow-x-auto pb-3 items-start cursor-grab select-none' },
      KANBAN_COLS.map(col => {
        const itens = grupos[col.id] || [];
        return h('div', { key: col.id, className: 'flex-shrink-0 w-[330px]' },
          h('div', { className: 'flex items-center gap-2 px-1 pb-3' },
            h('span', { className: `w-2 h-2 rounded-full ${col.dot}` }),
            h('span', { className: 'text-[11px] font-bold uppercase tracking-wider text-gray-500' }, col.nome),
            h('span', { className: `ml-auto text-[11px] font-bold text-white ${col.cnt} rounded-full px-2 py-0.5 min-w-[20px] text-center opacity-90` }, String(itens.length)),
          ),
          h('div', { className: 'space-y-3' },
            itens.length
              ? itens.map(e => h(CardKanban, {
                  key: e.id, entrega: e, coluna: col,
                  onCancelar, onVerTracking, onVerDetalhes, onRedespachar, onReportar, ehFrequente, showToast,
                  onChat, unread: (unreadMap && unreadMap[e.codigo_os]) || 0,
                }))
              : h('div', { className: 'text-[11px] text-gray-300 text-center py-4 border border-dashed border-gray-200 rounded-xl' }, 'Nenhuma entrega')
          )
        );
      })
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA: ENTREGAS — listagem em cards
  // ════════════════════════════════════════════════════════
  function TabEntregas({ API_URL, fetchAuth, showToast, setEstado }) {
    const [entregas, setEntregas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('');
    const [busca, setBusca] = useState('');
    const [filtroMargem, setFiltroMargem] = useState('todas'); // todas | positiva | negativa
    const [filtroProvider, setFiltroProvider] = useState('todos'); // todos | uber | noventanove
    const [ordenacao, setOrdenacao] = useState('recente');     // recente | antiga | margem_maior | margem_menor
    const [viewMode] = useState('kanban');                     // Kanban fixo (Lista removida)
    // Chat 99: contadores de nao-lidas por OS (badge nos cards) + abrir chat na aba propria
    const [unreadChat99, setUnreadChat99] = useState({});
    useEffect(() => {
      let vivo = true;
      const puxar = async () => {
        try {
          const r = await fetchAuth(`${API_URL}/logistics/chat99/unread-counts`);
          if (r && r.ok) { const d = await r.json(); if (vivo) setUnreadChat99(d.unread || {}); }
        } catch (_) {}
      };
      puxar();
      const t = setInterval(puxar, 15000);
      return () => { vivo = false; clearInterval(t); };
    }, [API_URL, fetchAuth]);
    const abrirChat99 = (e) => {
      if (setEstado) setEstado(st => ({ ...st, logisticaTab: 'chat', chat99OS: String(e.codigo_os) }));
    };
    const [dataFiltro, setDataFiltro] = useState(dataLocalBRT(new Date())); // YYYY-MM-DD em BRT; padrao = hoje
    // tick de 1 min — mantém o indicador de tempo ("atrasado") atualizado sem refetch
    const [, setTickTempo] = useState(0);
    useEffect(() => { const _id = setInterval(() => setTickTempo(t => t + 1), 60000); return () => clearInterval(_id); }, []);
    // carrega a tabela de Prazo Padrão (km → min) uma vez, p/ o SLA dos cards
    const [, setPrazoTick] = useState(0);
    useEffect(() => {
      (async () => {
        try {
          const r = await fetchAuth(`${API_URL}/bi/prazo-padrao`);
          const j = await r.json();
          const fx = Array.isArray(j) ? j : (j && j.faixas ? j.faixas : null);
          if (fx && fx.length) { setPrazoFaixas(fx); setPrazoTick(t => t + 1); }
        } catch (_) {}
      })();
    }, []);
    const [detalhesAberto, setDetalhesAberto] = useState(null); // {entrega, tracking, webhooks, loading}
    const [redespachoAberto, setRedespachoAberto] = useState(null); // {entrega, motivo}
    const [redespachando, setRedespachando] = useState(false);
    // Modal de cotação manual (Opção C)
    const [cotacaoModal, setCotacaoModal] = useState(null); // null | {state, codigoOS, dados, error}
    const [tickClock, setTickClock] = useState(0); // força re-render por segundo pro countdown
    // Mini-modal pra pedir código da OS (substitui prompt() nativo do navegador)
    const [pedirCodigoModal, setPedirCodigoModal] = useState(null); // null | {valor: string}

    // Motoboys frequentes: Set de telefones (so digitos) com > 3 pedidos.
    // Carregado uma vez; usado pra destacar (coroa) os cards.
    const [frequentesSet, setFrequentesSet] = useState(null);
    useEffect(() => {
      let vivo = true;
      (async () => {
        try {
          const res = await fetchAuth(`${API_URL}/logistics/frequentes`);
          const json = await res.json();
          if (vivo && res.ok && Array.isArray(json.frequentes)) {
            setFrequentesSet(new Set(json.frequentes.map(f => String(f.telefone || '').replace(/\D/g, '')).filter(Boolean)));
          }
        } catch (_) { /* silencioso: destaque e cosmetico */ }
      })();
      return () => { vivo = false; };
    }, [fetchAuth, API_URL]);
    const ehFrequente = React.useCallback((tel) => {
      if (!frequentesSet) return false;
      return frequentesSet.has(String(tel || '').replace(/\D/g, ''));
    }, [frequentesSet]);

    // Modal de reportar ocorrencia
    const [reportAberto, setReportAberto] = useState(null); // null | entrega

    const carregar = useCallback(async (silencioso) => {
      if (!silencioso) setLoading(true);
      try {
        const url = `${API_URL}/logistics/deliveries${filtroStatus ? `?status=${filtroStatus}` : ''}`;
        const res = await fetchAuth(url);
        const json = await res.json();
        setEntregas(json.entregas || []);
      } catch { if (!silencioso) showToast('Erro ao carregar entregas', 'error'); }
      finally { if (!silencioso) setLoading(false); }
    }, [fetchAuth, API_URL, filtroStatus]);

    // Carga inicial + auto-refresh a cada 30s — mantém os status em dia
    // sem o operador precisar recarregar a tela na mão (o poller/webhook
    // atualizam o backend; a tela acompanha sozinha).
    useEffect(() => {
      carregar();                                       // 1a carga: com spinner
      const i = setInterval(() => carregar(true), 30000); // refresh silencioso (sem piscar a tela)
      return () => clearInterval(i);
    }, [carregar]);

    // Timer de re-render por segundo enquanto o modal de cotação está aberto.
    // Necessário pra o countdown atualizar visualmente.
    useEffect(() => {
      if (!cotacaoModal || cotacaoModal.state !== 'ok') return;
      const t = setInterval(() => setTickClock(x => x + 1), 1000);
      return () => clearInterval(t);
    }, [cotacaoModal?.state]);

    // Abre o mini-modal pra pedir o código da OS.
    // Substitui o prompt() nativo do navegador que ficava feio no fluxo.
    function despacharOS() {
      setPedirCodigoModal({ valor: '' });
    }

    // 🆕 2026-05 Fase 5 — Cotação comparativa multi-provider.
    // O modal agora cota TODOS os providers ativos em paralelo via o hub
    // (/api/logistics/quotes/multi por provider) e despacha via /api/logistics/deliveries.
    // Substitui o fluxo antigo /uber/entregas/cotar|despachar (Opção A: corte cirúrgico).
    const [providersAtivos, setProvidersAtivos] = useState(null); // null=carregando | [{provider_code,display_name}]

    // Carrega a lista de providers ativos do hub (uma vez).
    useEffect(() => {
      let abortado = false;
      (async () => {
        try {
          const res = await fetchAuth(`${API_URL}/logistics/providers`);
          if (res.status === 404) { if (!abortado) setProvidersAtivos([]); return; }
          const d = await res.json();
          if (abortado) return;
          const ativos = (d && d.providers || []).filter(p => p.ativo);
          setProvidersAtivos(ativos);
        } catch { if (!abortado) setProvidersAtivos([]); }
      })();
      return () => { abortado = true; };
    }, [fetchAuth, API_URL]);

    // Confirma o código digitado no mini-modal e dispara a cotação multi-provider
    async function confirmarCodigoEcotar() {
      const codigoOS = pedirCodigoModal?.valor?.trim();
      if (!codigoOS) { showToast('Digite um código de OS', 'error'); return; }
      const codigoOSNum = parseInt(codigoOS);
      if (isNaN(codigoOSNum) || codigoOSNum <= 0) { showToast('Código inválido', 'error'); return; }
      setPedirCodigoModal(null);
      await cotarMultiProvider(codigoOSNum);
    }

    // Cota a OS em todos os providers ativos, em paralelo.
    // Resultado: cotacaoModal.porProvider = { [code]: { display_name, cotacoes: [...], error } }
    async function cotarMultiProvider(codigoOSNum) {
      const ativos = (providersAtivos && providersAtivos.length > 0)
        ? providersAtivos
        : [{ provider_code: 'uber', display_name: 'Uber Direct' }]; // fallback defensivo

      setCotacaoModal({
        state: 'cotando', codigoOS: codigoOSNum,
        porProvider: null, selecionado: null, error: null,
      });

      try {
        const resultados = await Promise.all(ativos.map(async (prov) => {
          try {
            const res = await fetchAuth(`${API_URL}/logistics/quotes/multi`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                codigoOS: codigoOSNum,
                providerCode: prov.provider_code,
                vehicleTypes: ['motorcycle', 'car'],
              }),
            });
            const json = await res.json();
            if (res.ok && json.success) {
              return { code: prov.provider_code, display_name: prov.display_name, cotacoes: json.cotacoes || [], error: null };
            }
            return { code: prov.provider_code, display_name: prov.display_name, cotacoes: [], error: json.error || 'Erro ao cotar' };
          } catch {
            return { code: prov.provider_code, display_name: prov.display_name, cotacoes: [], error: 'Erro de rede' };
          }
        }));

        const porProvider = {};
        resultados.forEach(r => { porProvider[r.code] = r; });

        // Tem ao menos uma cotação disponível em algum provider?
        const algumDisponivel = resultados.some(r => r.cotacoes.some(c => c.available));
        if (!algumDisponivel) {
          const primErro = resultados.find(r => r.error)?.error;
          setCotacaoModal({
            state: 'erro', codigoOS: codigoOSNum,
            porProvider, selecionado: null,
            error: primErro || 'Nenhum provedor retornou cotação disponível',
          });
          return;
        }

        // Prefill do telefone do destinatario (vem da OS; pode vir vazio -> admin digita).
        let _telPrefill = '';
        for (const r of resultados) {
          const c0 = (r.cotacoes || []).find(x => x.available && x.telefone_entrega);
          if (c0) { _telPrefill = c0.telefone_entrega; break; }
        }
        // Prefill dos nomes (remetente/cliente) — vem da OS; pode vir vazio.
        let _nomeRemPrefill = '', _nomeCliPrefill = '';
        for (const r of resultados) {
          const cN = (r.cotacoes || []).find(x => x.available);
          if (cN) { _nomeRemPrefill = cN.nome_coleta || ''; _nomeCliPrefill = cN.nome_entrega || ''; break; }
        }
        setCotacaoModal({
          state: 'ok', codigoOS: codigoOSNum,
          porProvider,
          selecionado: { veiculo: 'motorcycle' }, // veículo escolhido (provider é por botão)
          telefone: _telPrefill,
          nomeRemetente: _nomeRemPrefill,
          nomeCliente: _nomeCliPrefill,
          error: null,
        });
      } catch (err) {
        setCotacaoModal({
          state: 'erro', codigoOS: codigoOSNum,
          porProvider: null, selecionado: null, error: 'Erro ao cotar',
        });
      }
    }

    // Re-cota — usado no "Tentar de novo" e no "Cotar de novo" (quote expirada)
    async function recotarOS() {
      if (!cotacaoModal?.codigoOS) return;
      await cotarMultiProvider(cotacaoModal.codigoOS);
    }

    // Troca o veículo selecionado (Moto/Carro) — afeta os dois providers
    function selecionarVeiculo(veiculo) {
      if (!cotacaoModal) return;
      setCotacaoModal({ ...cotacaoModal, selecionado: { veiculo } });
    }

    // Despacha pelo provider escolhido (o "Provider Switcher": botão de cada card).
    async function despacharPorProvider(providerCode) {
      if (!cotacaoModal || cotacaoModal.state !== 'ok') return;
      const veiculo = cotacaoModal.selecionado?.veiculo || 'motorcycle';
      const bloco = cotacaoModal.porProvider?.[providerCode];
      const cot = bloco?.cotacoes?.find(c => c.vehicle_type === veiculo && c.available);
      if (!cot) { showToast('Sem cotação válida pra esse provedor/veículo', 'error'); return; }
      const _telDigitos = (cotacaoModal.telefone || '').replace(/\D/g, '');
      if (_telDigitos.length < 10) { showToast('Informe o telefone do cliente (com DDD) antes de despachar', 'error'); return; }
      if (Date.now() > cot.expires_at) {
        showToast('Cotação expirada — cote novamente', 'error');
        return;
      }

      setCotacaoModal({ ...cotacaoModal, state: 'despachando', despachandoProvider: providerCode });
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigoOS: cotacaoModal.codigoOS,
            providerCode,
            vehicleType: veiculo,
            quoteId: cot.quote_id,
            telefoneEntrega: cotacaoModal.telefone || '',
            nomeRemetente: cotacaoModal.nomeRemetente || '',
            nomeCliente: cotacaoModal.nomeCliente || '',
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          showToast(`OS ${cotacaoModal.codigoOS} despachada via ${bloco.display_name}!`, 'success');
          setCotacaoModal(null);
          carregar();
        } else {
          showToast(json.error || 'Erro ao despachar', 'error');
          setCotacaoModal({ ...cotacaoModal, state: 'ok', despachandoProvider: null });
        }
      } catch {
        showToast('Erro de rede ao despachar', 'error');
        setCotacaoModal({ ...cotacaoModal, state: 'ok', despachandoProvider: null });
      }
    }

    function fecharCotacaoModal() {
      if (cotacaoModal?.state === 'cotando' || cotacaoModal?.state === 'despachando') return;
      setCotacaoModal(null);
    }

    async function cancelarEntrega(entregaOuId) {
      // Aceita a entrega inteira (novo) ou so o id (compat).
      const entregaObj = (entregaOuId && typeof entregaOuId === 'object') ? entregaOuId : null;
      const id = entregaObj ? entregaObj.id : entregaOuId;
      const st = entregaObj ? entregaObj.status_canonico : null;

      // Doc oficial da 99 (Cancel Order): "If the courier has picked up the
      // package, order cancellation is not supported." A fronteira e a COLETA,
      // nao o aceite — depois que aceita (waiting/COURIER_ASSIGNED) e antes de
      // coletar, a 99 AINDA cancela. So a partir de PICKED_UP (delivering) e que
      // a 99 recusa e a corrida fica viva sendo cobrada.
      const JA_COLETOU = ['PICKED_UP', 'DROPOFF_EN_ROUTE', 'ARRIVED_DROPOFF'];

      if (st && JA_COLETOU.includes(st)) {
        const aviso =
          'ATENCAO: o entregador da 99 JA COLETOU o pacote.\n\n' +
          'A 99 NAO permite cancelar depois da coleta (regra deles) — a entrega\n' +
          'sera concluida e COBRADA. Cancelar aqui so marca como cancelado no seu\n' +
          'painel; a corrida continua viva na 99.\n\n' +
          'Tem certeza que quer cancelar mesmo assim?';
        if (!confirm(aviso)) return;
      } else {
        if (!confirm('Cancelar entrega no provedor e reabrir na Mapp?')) return;
      }
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${id}/cancel`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo: 'Cancelamento manual' })
        });
        if (res.ok) {
          let info = {};
          try { info = await res.json(); } catch (_e) {}
          if (info.providerCancelado === false) {
            showToast('Cancelado no painel, mas a 99 NAO confirmou: ' + (info.providerCancelMsg || 'cancele manualmente no app da 99'), 'error');
          } else {
            showToast('Entrega cancelada', 'success');
          }
          carregar();
        }
      } catch { showToast('Erro ao cancelar', 'error'); }
    }

    // Filtragem + ordenação client-side
    const entregasFiltradas = useMemo(() => {
      let lista = entregas;

      // Filtro de data (despacho) — comparado em BRT. Vazio = todas as datas.
      if (dataFiltro) {
        lista = lista.filter(e => dataLocalBRT(e.created_at) === dataFiltro);
      }

      // Busca por código OS
      if (busca.trim()) {
        const q = busca.trim().toLowerCase();
        lista = lista.filter(e =>
          String(e.codigo_os).includes(q) ||
          (e.endereco_coleta || '').toLowerCase().includes(q) ||
          (e.endereco_entrega || '').toLowerCase().includes(q) ||
          (e.entregador_nome || '').toLowerCase().includes(q)
        );
      }

      // Filtro de margem
      if (filtroMargem !== 'todas') {
        lista = lista.filter(e => {
          const m = parseFloat(e.valor_servico || 0) - parseFloat(e.valor_uber || 0);
          return filtroMargem === 'positiva' ? m >= 0 : m < 0;
        });
      }

      // Filtro de provedor (todos | uber | noventanove)
      if (filtroProvider !== 'todos') {
        lista = lista.filter(e => {
          const c = (e.provider_code || e.provider || '');
          const norm = (c === '99') ? 'noventanove' : c;
          return norm === filtroProvider;
        });
      }

      // Ordenação
      const ordenado = [...lista].sort((a, b) => {
        if (ordenacao === 'recente') return new Date(b.created_at) - new Date(a.created_at);
        if (ordenacao === 'antiga')  return new Date(a.created_at) - new Date(b.created_at);
        const ma = parseFloat(a.valor_servico || 0) - parseFloat(a.valor_uber || 0);
        const mb = parseFloat(b.valor_servico || 0) - parseFloat(b.valor_uber || 0);
        if (ordenacao === 'margem_maior') return mb - ma;
        if (ordenacao === 'margem_menor') return ma - mb;
        return 0;
      });

      return ordenado;
    }, [entregas, busca, filtroMargem, ordenacao, dataFiltro, filtroProvider]);

    // Resumo — total de margem da lista filtrada
    const resumo = useMemo(() => {
      const total = entregasFiltradas.reduce((acc, e) => {
        const m = parseFloat(e.valor_servico || 0) - parseFloat(e.valor_uber || 0);
        return acc + (isNaN(m) ? 0 : m);
      }, 0);
      const negativas = entregasFiltradas.filter(e =>
        parseFloat(e.valor_servico || 0) - parseFloat(e.valor_uber || 0) < 0
      ).length;
      return { total, negativas, qtd: entregasFiltradas.length };
    }, [entregasFiltradas]);

    // Tracking: abre a página oficial de rastreio do provedor em nova aba.
    // O tracking_url vem da resposta do Create Delivery e é salvo no banco no despacho.
    function abrirTracking(e) {
      // Prioriza a pagina de rastreio da Central (Tutts). Cai pro link do
      // provedor so em entregas antigas sem token. Sem nenhum dos dois = ainda
      // nao ha rastreio (entregador nao aceitou).
      if (e.rastreio_token) {
        window.open('https://centraltutts.online/r/' + e.rastreio_token, '_blank', 'noopener,noreferrer');
        return;
      }
      if (e.tracking_url) {
        window.open(e.tracking_url, '_blank', 'noopener,noreferrer');
        return;
      }
      showToast('Rastreio ainda nao disponivel (aguardando o entregador aceitar)', 'error');
    }

    // Detalhes: abre modal com tracking points + webhooks + info completa
    async function abrirDetalhes(e) {
      setDetalhesAberto({ entrega: e, tracking: [], webhooks: [], loading: true });
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}`);
        const json = await res.json();
        if (json.success) {
          setDetalhesAberto({
            entrega: json.entrega || e,
            tracking: json.tracking || [],
            webhooks: json.webhooks || [],
            loading: false,
          });
        } else {
          showToast(json.error || 'Erro ao carregar detalhes', 'error');
          setDetalhesAberto({ entrega: e, tracking: [], webhooks: [], loading: false });
        }
      } catch (err) {
        showToast('Erro ao buscar detalhes da entrega', 'error');
        setDetalhesAberto({ entrega: e, tracking: [], webhooks: [], loading: false });
      }
    }

    function fecharDetalhes() {
      setDetalhesAberto(null);
    }

    // Redespacho: cancela a delivery atual no provedor e cria nova com novo endereço
    function abrirRedespacho(e) {
      setRedespachoAberto({ entrega: e, motivo: '' });
    }

    function fecharRedespacho() {
      if (redespachando) return; // não fecha enquanto está rolando
      setRedespachoAberto(null);
    }

    async function confirmarRedespacho() {
      setRedespachando(true);
      try {
        // 🆕 Fase 6 — repontado pro hub. O /redispatch do hub cancela a
        // entrega atual e redespacha a MESMA OS (endereço vem da Mapp).
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${redespachoAberto.entrega.id}/redispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            motivo: (redespachoAberto.motivo || '').trim() || 'Redespacho solicitado',
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          showToast('Entrega redespachada', 'success');
          setRedespachoAberto(null);
          carregar();
        } else {
          showToast(json.error || 'Erro ao redespachar', 'error');
        }
      } catch (err) {
        showToast('Erro de rede ao redespachar', 'error');
      } finally {
        setRedespachando(false);
      }
    }

    return h('div', { className: (viewMode === 'kanban' ? 'max-w-full' : 'max-w-6xl') + ' mx-auto p-4 space-y-4' },

      // ── Header ──
      h('div', { className: 'flex items-center justify-between flex-wrap gap-3' },
        h('div', null,
          h('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Entregas'),
          h('p', { className: 'text-xs text-gray-500 mt-1' },
            `${resumo.qtd} entrega${resumo.qtd !== 1 ? 's' : ''} · `,
            'Margem total ',
            h('span', {
              className: resumo.total >= 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold',
            }, `${resumo.total >= 0 ? '+' : '−'} ${fmtMoney(Math.abs(resumo.total))}`),
            resumo.negativas > 0 && h('span', { className: 'text-red-600 ml-2' }, `· ${resumo.negativas} no prejuízo`),
          )
        ),
        h('div', { className: 'flex gap-2 flex-wrap items-center' },
          h('button', {
            onClick: despacharOS,
            className: 'px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-semibold',
          }, '+ Despachar OS'),
          h('button', {
            onClick: carregar,
            className: 'px-3 py-1.5 bg-gray-200 rounded-lg text-sm hover:bg-gray-300',
          }, '🔄'),
        )
      ),

      // ── Filtros ──
      h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-3' },
        h('input', {
          type: 'search',
          value: busca,
          onChange: e => setBusca(e.target.value),
          placeholder: '🔍 Buscar OS, endereço, entregador...',
          className: 'flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm',
        }),
        h('div', { className: 'flex items-center gap-1.5' },
          h('input', {
            type: 'date',
            value: dataFiltro,
            onChange: e => setDataFiltro(e.target.value),
            title: 'Filtrar por data de despacho',
            className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700',
          }),
          h('button', {
            onClick: () => setDataFiltro(dataLocalBRT(new Date())),
            title: 'Voltar para hoje',
            className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50',
          }, 'Hoje'),
          dataFiltro && h('button', {
            onClick: () => setDataFiltro(''),
            title: 'Ver todas as datas',
            className: 'px-2 py-2 text-gray-400 hover:text-gray-600 text-sm',
          }, '✕'),
        ),
        h('select', {
          value: filtroStatus,
          onChange: e => setFiltroStatus(e.target.value),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm',
        },
          h('option', { value: '' }, 'Todos os status'),
          // Só os status canônicos (UPPER) — o backend casa status_canonico
          // OU status_native, e as chaves legadas só duplicariam labels.
          STATUS_FILTRO_OPCOES.map(s => h('option', { key: s, value: s }, STATUS_LABELS[s].label))
        ),
        h('select', {
          value: filtroMargem,
          onChange: e => setFiltroMargem(e.target.value),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm',
        },
          h('option', { value: 'todas' }, 'Margem: todas'),
          h('option', { value: 'positiva' }, 'Margem: positiva'),
          h('option', { value: 'negativa' }, 'Margem: negativa (prejuízo)'),
        ),
        h('select', {
          value: filtroProvider,
          onChange: e => setFiltroProvider(e.target.value),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm',
          title: 'Filtrar por provedor logístico',
        },
          h('option', { value: 'todos' }, 'Todos os provedores'),
          h('option', { value: 'uber' }, 'Uber'),
          h('option', { value: 'noventanove' }, '99'),
        ),
        h('select', {
          value: ordenacao,
          onChange: e => setOrdenacao(e.target.value),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm',
        },
          h('option', { value: 'recente' }, 'Mais recente primeiro'),
          h('option', { value: 'antiga' }, 'Mais antiga primeiro'),
          h('option', { value: 'margem_menor' }, 'Margem: menor primeiro'),
          h('option', { value: 'margem_maior' }, 'Margem: maior primeiro'),
        ),
      ),

      // ── Lista de cards ──
      (loading && entregas.length === 0)
        ? h('div', { className: 'text-center py-12' },
            h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto' })
          )
        : viewMode === 'kanban'
          ? h(KanbanEntregas, {
              entregas: entregasFiltradas,
              onCancelar: cancelarEntrega,
              onVerTracking: abrirTracking,
              onVerDetalhes: abrirDetalhes,
              onRedespachar: abrirRedespacho,
              onReportar: (e) => setReportAberto(e),
              onChat: abrirChat99,
              unreadMap: unreadChat99,
              ehFrequente,
              showToast,
            })
          : entregasFiltradas.length === 0
          ? h('div', { className: 'bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400' },
              'Nenhuma entrega encontrada com esses filtros'
            )
          : h('div', { className: 'space-y-3' },
              entregasFiltradas.map(e => h(CardEntrega, {
                key: e.id,
                entrega: e,
                onCancelar: cancelarEntrega,
                onVerTracking: abrirTracking,
                onVerDetalhes: abrirDetalhes,
                onRedespachar: abrirRedespacho,
                showToast,
              }))
            ),

      // ── Modal de detalhes ──
      detalhesAberto && h(ModalDetalhesEntrega, {
        data: detalhesAberto,
        onClose: fecharDetalhes,
        showToast,
        fetchAuth,
        API_URL,
      }),

      // ── Modal de reportar ocorrencia / bloquear ──
      reportAberto && h(ModalReportarOcorrencia, {
        entrega: reportAberto,
        API_URL,
        fetchAuth,
        showToast,
        onClose: () => setReportAberto(null),
        onSucesso: carregar,
      }),

      // ── Modal de redespacho ──
      redespachoAberto && h('div', {
        className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
        onClick: (ev) => { if (ev.target === ev.currentTarget) fecharRedespacho(); },
      },
        h('div', { className: 'bg-white rounded-xl shadow-2xl max-w-lg w-full' },
          h('div', { className: 'border-b border-gray-200 px-5 py-4' },
            h('h3', { className: 'text-lg font-bold text-gray-800' },
              `Redespachar OS ${redespachoAberto.entrega.codigo_os}`),
            h('p', { className: 'text-xs text-gray-500 mt-1' },
              'A entrega atual será cancelada e a OS será redespachada.'),
          ),
          h('div', { className: 'p-5 space-y-3' },
            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800' },
              '⚠ Esta ação cancela a delivery atual no provedor (perdendo qualquer progresso de courier) e redespacha a mesma OS. O endereço vem da Mapp — se ele estiver errado, corrija na Mapp antes.'),

            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Endereço de entrega'),
              h('div', { className: 'text-sm text-gray-500 bg-gray-50 rounded p-2 border border-gray-200' },
                redespachoAberto.entrega.endereco_entrega || '—'),
            ),

            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Motivo (opcional)'),
              h('input', {
                type: 'text',
                value: redespachoAberto.motivo || '',
                onChange: e => setRedespachoAberto({ ...redespachoAberto, motivo: e.target.value }),
                placeholder: 'ex: courier não apareceu',
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
              }),
            ),
          ),
          h('div', { className: 'border-t border-gray-200 px-5 py-3 flex justify-end gap-2' },
            h('button', {
              onClick: fecharRedespacho,
              disabled: redespachando,
              className: 'px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50',
            }, 'Cancelar'),
            h('button', {
              onClick: confirmarRedespacho,
              disabled: redespachando,
              className: 'px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50',
            }, redespachando ? 'Redespachando…' : 'Confirmar redespacho'),
          ),
        )
      ),

      // ── Mini-modal pra pedir código da OS (substitui prompt() nativo) ──
      pedirCodigoModal && h('div', {
        className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
        onClick: (ev) => { if (ev.target === ev.currentTarget) setPedirCodigoModal(null); },
      },
        h('div', { className: 'bg-white rounded-xl shadow-2xl max-w-sm w-full' },
          h('div', { className: 'border-b border-gray-200 px-5 py-4' },
            h('h3', { className: 'text-base font-bold text-gray-800' }, 'Despachar OS'),
            h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'Digite o código da OS pra cotar')
          ),
          h('div', { className: 'p-5' },
            h('input', {
              type: 'number',
              autoFocus: true,
              value: pedirCodigoModal.valor,
              onChange: (e) => setPedirCodigoModal({ valor: e.target.value }),
              onKeyDown: (e) => {
                if (e.key === 'Enter') confirmarCodigoEcotar();
                if (e.key === 'Escape') setPedirCodigoModal(null);
              },
              placeholder: 'ex: 1129725',
              className: 'w-full px-4 py-3 border-2 border-purple-200 rounded-lg text-base font-mono focus:border-purple-500 focus:outline-none',
            }),
          ),
          h('div', { className: 'border-t border-gray-200 px-5 py-3 bg-gray-50 flex justify-end gap-2 rounded-b-xl' },
            h('button', {
              onClick: () => setPedirCodigoModal(null),
              className: 'px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-white',
            }, 'Cancelar'),
            h('button', {
              onClick: confirmarCodigoEcotar,
              className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700',
            }, 'Cotar →'),
          )
        )
      ),

      // ── Modal de cotação manual com seleção de veículo (Opção C + Desenho 1) ──
      // 🆕 2026-05 Fase 5 — Modal de cotação COMPARATIVA multi-provider.
      cotacaoModal && (function () {
        const m = cotacaoModal;
        const veiculo = m.selecionado?.veiculo || 'motorcycle';
        const porProvider = m.porProvider || {};
        const blocos = Object.values(porProvider);

        function labelVeiculo(t) {
          return t === 'motorcycle' ? 'Moto' : t === 'car' ? 'Carro'
               : t === 'van' ? 'Van' : t === 'bicycle' ? 'Bike' : t === 'walker' ? 'A pé' : t;
        }
        const fmt = (v) => 'R$ ' + (parseFloat(v || 0)).toFixed(2).replace('.', ',');

        // Cotação de um provider pro veículo selecionado.
        const cotacaoDe = (bloco) => (bloco.cotacoes || []).find(c => c.vehicle_type === veiculo);

        // Recomendado = entre os disponíveis, o de MAIOR margem (estratégia "menor custo").
        let codeRecomendado = null;
        if (m.state === 'ok') {
          let melhor = -Infinity;
          blocos.forEach(b => {
            const c = cotacaoDe(b);
            if (c && c.available && parseFloat(c.margem || 0) > melhor) {
              melhor = parseFloat(c.margem || 0);
              codeRecomendado = b.code;
            }
          });
        }

        // Countdown: menor expires_at entre as cotações disponíveis do veículo.
        let segRestantes = 0;
        if (m.state === 'ok') {
          let menorExp = Infinity;
          blocos.forEach(b => {
            const c = cotacaoDe(b);
            if (c && c.available && c.expires_at) menorExp = Math.min(menorExp, c.expires_at);
          });
          if (menorExp !== Infinity) segRestantes = Math.max(0, Math.floor((menorExp - Date.now()) / 1000));
        }
        const expirou = m.state === 'ok' && segRestantes === 0;
        const mmss = `${Math.floor(segRestantes / 60)}:${String(segRestantes % 60).padStart(2, '0')}`;

        // Endereços (de qualquer cotação disponível).
        let endColeta = '—', endEntrega = '—', obsOS = '', kmRota = null;
        for (const b of blocos) {
          const c = (b.cotacoes || []).find(x => x.available);
          if (c) {
            endColeta = c.endereco_coleta || '—';
            endEntrega = c.endereco_entrega || '—';
            obsOS = c.observacao || '';
            kmRota = (c.distancia_km != null) ? parseFloat(c.distancia_km) : null;
            break;
          }
        }

        // Card de um provider.
        function CardProvider(bloco) {
          const c = cotacaoDe(bloco);
          const disp = c && c.available;
          const ehRecomendado = bloco.code === codeRecomendado;
          const margem = disp ? parseFloat(c.margem || 0) : 0;
          const margemNeg = disp && margem < 0;
          const despachandoEste = m.state === 'despachando' && m.despachandoProvider === bloco.code;

          return h('div', {
            key: bloco.code,
            className: `rounded-xl p-3.5 border ${ehRecomendado ? 'border-2 border-purple-400' : 'border-gray-200'}`,
          },
            h('div', { className: 'flex items-center gap-2 mb-1' },
              h(ProviderLogo, { code: bloco.code, size: 24 }),
              h('span', { className: 'font-semibold text-sm text-gray-800' }, bloco.display_name),
              ehRecomendado && h('span', {
                className: 'ml-auto text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-700',
              }, 'Recomendado'),
            ),
            !disp
              ? h('div', { className: 'py-6 text-center text-xs text-gray-400' },
                  bloco.error || (c && c.error) || 'Sem cotação disponível')
              : h('div', null,
                  h('div', { className: 'flex items-baseline gap-1.5 mt-1' },
                    h('span', { className: 'text-2xl font-bold text-gray-900' }, fmt(c.valor_provider)),
                    h('span', { className: 'text-[11px] text-gray-500' }, 'custo provedor'),
                  ),
                  h('div', { className: 'mt-2 pt-2 border-t border-gray-100 text-xs space-y-1' },
                    h('div', { className: 'flex justify-between' },
                      h('span', { className: 'text-gray-500' }, 'Cobrado do cliente'),
                      h('span', null, fmt(c.valor_cliente))),
                    h('div', { className: 'flex justify-between' },
                      h('span', { className: 'text-gray-500' }, 'Margem'),
                      h('span', {
                        className: `font-medium ${margemNeg ? 'text-red-600' : 'text-green-600'}`,
                      }, `${margem >= 0 ? '+' : ''}${fmt(margem)} · ${parseFloat(c.margem_pct || 0).toFixed(0)}%`)),
                    h('div', { className: 'flex justify-between' },
                      h('span', { className: 'text-gray-500' }, 'ETA'),
                      h('span', null, c.eta_minutos != null ? `~ ${c.eta_minutos} min` : '—')),
                  ),
                  h('button', {
                    onClick: () => despacharPorProvider(bloco.code),
                    disabled: m.state !== 'ok' || expirou,
                    className: `w-full mt-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
                      ehRecomendado
                        ? (margemNeg ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-purple-600 text-white hover:bg-purple-700')
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`,
                  }, despachandoEste ? 'Despachando…'
                     : margemNeg ? `Despachar mesmo assim`
                     : `Despachar pela ${bloco.display_name}`),
                ),
          );
        }

        return h('div', {
          className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
          onClick: (ev) => { if (ev.target === ev.currentTarget) fecharCotacaoModal(); },
        },
          h('div', { className: 'bg-white rounded-xl shadow-2xl max-w-2xl w-full' },

            // Header
            h('div', { className: 'border-b border-gray-200 px-5 py-4 flex items-start justify-between' },
              h('div', null,
                h('h3', { className: 'text-base font-bold text-gray-800' }, `Cotar OS ${m.codigoOS}`),
                m.state === 'ok'
                  ? h('div', { className: 'mt-1 space-y-0.5' },
                      h('p', { className: 'text-xs text-gray-600' },
                        h('span', { className: 'font-semibold text-gray-500' }, '📍 Coleta: '), endColeta),
                      h('p', { className: 'text-xs text-gray-600' },
                        h('span', { className: 'font-semibold text-purple-600' }, '🎯 Entrega: '), endEntrega),
                      (kmRota != null) && h('p', { className: 'text-[11px] text-gray-400' },
                        `Distância da rota: ${kmRota.toFixed(1)} km`))
                  : h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'comparando provedores'),
              ),
              h('button', {
                onClick: fecharCotacaoModal,
                className: 'text-gray-400 hover:text-gray-700 text-xl leading-none',
              }, '✕'),
            ),

            // Body
            (m.state === 'cotando')
              ? h('div', { className: 'p-12 text-center' },
                  h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3' }),
                  h('p', { className: 'text-sm text-gray-500' }, 'Cotando nos provedores ativos…'))

            : (m.state === 'erro')
              ? h('div', { className: 'p-8 text-center' },
                  h('div', { className: 'text-3xl mb-2' }, '⚠️'),
                  h('p', { className: 'text-sm text-gray-700 mb-4' }, m.error || 'Erro ao cotar'),
                  h('button', {
                    onClick: recotarOS,
                    className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700',
                  }, 'Tentar de novo'))

            : h('div', { className: 'p-5' },
                // Seletor de veículo + countdown
                h('div', { className: 'flex items-center gap-2 mb-4' },
                  h('span', { className: 'text-[11px] font-semibold text-gray-500 uppercase' }, 'Veículo'),
                  ['motorcycle', 'car'].map(vt => h('button', {
                    key: vt,
                    onClick: () => selecionarVeiculo(vt),
                    className: `text-xs px-3 py-1 rounded-md ${
                      veiculo === vt ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`,
                  }, labelVeiculo(vt))),
                  h('div', { className: 'flex-1' }),
                  h('span', {
                    className: `text-[11px] ${expirou ? 'text-red-600 font-medium' : 'text-gray-500'}`,
                  }, expirou ? 'cotação expirada' : `expira em ${mmss}`),
                ),

                // Observacao da OS (read-only) — e o que o motoboy ve no app do provedor.
                obsOS && h('div', { className: 'mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2' },
                  h('div', { className: 'text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-0.5' }, '📝 Observação (vai pro motoboy)'),
                  h('div', { className: 'text-xs text-gray-700 leading-relaxed' }, obsOS)),

                // Telefone do cliente — prefill da OS, editavel, obrigatorio.
                h('div', { className: 'mb-4' },
                  h('label', { className: 'block text-[11px] font-semibold text-gray-500 uppercase mb-1' },
                    '📱 Telefone do cliente (recebe o código por WhatsApp)'),
                  h('input', {
                    type: 'tel',
                    value: m.telefone || '',
                    onChange: (ev) => setCotacaoModal(prev => ({ ...prev, telefone: ev.target.value })),
                    placeholder: 'Ex: 71993908345',
                    className: 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
                  }),
                  h('p', { className: 'text-[10px] text-gray-400 mt-1' },
                    'Obrigatório. O código de entrega da 99 será enviado para este número.')),

                // Nome do remetente (loja/coleta) e do cliente final — prefill da OS,
                // editaveis. Viram o remetente e o cliente que o motoboy ve no app.
                h('div', { className: 'grid grid-cols-2 gap-2 mb-4' },
                  h('div', {},
                    h('label', { className: 'block text-[11px] font-semibold text-gray-500 uppercase mb-1' },
                      '🏪 Nome do remetente (loja)'),
                    h('input', {
                      type: 'text',
                      value: m.nomeRemetente || '',
                      onChange: (ev) => setCotacaoModal(prev => ({ ...prev, nomeRemetente: ev.target.value })),
                      placeholder: 'Ex: Loja Centro',
                      className: 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
                    })),
                  h('div', {},
                    h('label', { className: 'block text-[11px] font-semibold text-gray-500 uppercase mb-1' },
                      '🎯 Nome do cliente final'),
                    h('input', {
                      type: 'text',
                      value: m.nomeCliente || '',
                      onChange: (ev) => setCotacaoModal(prev => ({ ...prev, nomeCliente: ev.target.value })),
                      placeholder: 'Ex: Oficina JF',
                      className: 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400',
                    }))),

                // Cards lado a lado
                h('div', {
                  className: `grid gap-3 ${blocos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`,
                }, blocos.map(CardProvider)),

                // Nota da estratégia
                h('div', { className: 'mt-4 bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-600 flex items-center gap-1.5' },
                  h('span', null, 'ℹ️'),
                  h('span', null, 'Recomendado = maior margem para o veículo selecionado. O despacho automático do worker usa a estratégia configurada.')),

                // Rodapé
                h('div', { className: 'flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100' },
                  expirou && h('button', {
                    onClick: recotarOS,
                    className: 'px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200',
                  }, 'Cotar de novo'),
                  h('button', {
                    onClick: fecharCotacaoModal,
                    className: 'px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200',
                  }, 'Cancelar')),
              )
          )
        );
      })()
    );
  }

  // ════════════════════════════════════════════════════════
  // MODAL: Detalhes de uma entrega
  // ════════════════════════════════════════════════════════
  function ModalDetalhesEntrega({ data, onClose, showToast, fetchAuth, API_URL }) {
    const { entrega: e, tracking, webhooks, loading } = data;
    // Valores p/ os cards do modal (mesma logica do CardEntrega — antes ausentes
    // neste escopo, o que quebrava o modal com ReferenceError: valorUber).
    const valorUber    = parseFloat(e.valor_uber || e.valor_provider || 0);
    const valorHub     = parseFloat(e.valor_servico || 0);
    const margemHub    = Math.round((valorHub - valorUber) * 100) / 100;
    const margemHubPct = valorUber > 0 ? Math.round((margemHub / valorUber) * 1000) / 10 : null;
    const margemPos    = margemHub >= 0;
    const [showDebug, setShowDebug] = useState(false);
    const [comprovante, setComprovante] = useState(null);      // proof_of_delivery
    const [loadingComprovante, setLoadingComprovante] = useState(false);
    const [erroComprovante, setErroComprovante] = useState(null);

    // Carrega comprovante de entrega (só Uber + DELIVERED)
    async function carregarComprovante() {
      setLoadingComprovante(true);
      setErroComprovante(null);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}/comprovante`);
        const json = await res.json();
        if (json.success) {
          setComprovante(json.comprovante);
        } else {
          setErroComprovante(json.detalhe || json.error || 'Comprovante não disponível');
        }
      } catch (err) {
        setErroComprovante('Erro ao buscar comprovante');
      } finally {
        setLoadingComprovante(false);
      }
    }

    // Monta src de imagem a partir do campo do comprovante Uber
    // Uber retorna: { document: { type, base64_contents }, signature: { type, base64_contents }, pictures: [...] }
    function imgSrc(campo) {
      if (!campo) return null;
      // 99Entrega: a foto vem como URL direta (string http...).
      if (typeof campo === 'string') {
        return /^https?:\/\//i.test(campo) ? campo : null;
      }
      // Uber: base64 dentro de { type, base64_contents }.
      const tipo = campo.type || 'image/jpeg';
      const b64  = campo.base64_contents || campo.data || null;
      if (b64) return `data:${tipo};base64,${b64}`;
      // fallback: objeto com url
      if (campo.url && /^https?:\/\//i.test(campo.url)) return campo.url;
      return null;
    }

    function copiarDeliveryId() {
      if (!e.uber_delivery_id) return;
      navigator.clipboard?.writeText(e.uber_delivery_id).then(
        () => showToast('ID da entrega copiado', 'success'),
        () => showToast('Erro ao copiar', 'error')
      );
    }

    return h('div', {
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
      onClick: (ev) => { if (ev.target === ev.currentTarget) onClose(); },
    },
      h('div', { className: 'bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto' },

        // Header do modal — OS + status + banner Uber ID (quando for Uber)
        h('div', { className: 'sticky top-0 bg-white border-b border-gray-200' },
          // Banner roxo "numero de entrega" — so exibe para entregas Uber
          e.uber_delivery_id && e.provider_code === 'uber' && h('div', {
            className: 'flex items-center justify-center gap-2 bg-purple-600 text-white text-sm font-medium px-5 py-2',
          },
            h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor', className: 'w-4 h-4 flex-shrink-0' },
              h('path', { fillRule: 'evenodd', d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z', clipRule: 'evenodd' })
            ),
            h('span', null,
              'O numero de entrega do pedido e ',
              h('strong', null, `#${e.codigo_os}`),
              ' (Uber ID: ',
              h('span', { className: 'font-mono' },
                (function(){
                  // 🔧 2026-06: Uber ID = ultimos 5 do UUID do tracking_url (apos /orders/),
                  // nao do del_... (que dava "WDRUW"/"BDBVA"). Fallback pro del_ se faltar URL.
                  try {
                    if (e.tracking_url) {
                      var m = String(e.tracking_url).match(/\/orders\/([0-9a-fA-F-]{36})/);
                      if (m && m[1]) return m[1].slice(-5).toUpperCase();
                      var any = String(e.tracking_url).match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
                      if (any) return any[0].slice(-5).toUpperCase();
                    }
                  } catch (err) {}
                  return e.uber_delivery_id ? String(e.uber_delivery_id).slice(-5).toUpperCase() : '-----';
                })()
              ),
              ')'
            ),
          ),
          h('div', { className: 'px-5 py-4 flex items-center justify-between' },
            h('div', null,
              h('h3', { className: 'text-xl font-bold text-gray-800' }, `OS ${e.codigo_os}`),
              h('div', { className: 'flex items-center gap-2 mt-1' },
                h(Badge, { entrega: e }),
              )
            ),
            h('button', {
              onClick: onClose,
              className: 'text-gray-400 hover:text-gray-600 text-2xl leading-none px-2',
            }, '×')
          ),
        ),

        // Body
        loading
          ? h('div', { className: 'p-12 text-center' },
              h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto' })
            )
          : h('div', { className: 'p-5 space-y-5' },

              // Endereços completos
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                h('div', null,
                  h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1' }, '📦 Coleta'),
                  h('div', { className: 'text-sm text-gray-800 leading-relaxed' }, e.endereco_coleta || '—'),
                  e.latitude_coleta && h('div', { className: 'text-[11px] text-gray-400 mt-1 font-mono' },
                    `${e.latitude_coleta}, ${e.longitude_coleta}`)
                ),
                h('div', null,
                  h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1' }, '📍 Entrega'),
                  h('div', { className: 'text-sm text-gray-800 leading-relaxed' }, e.endereco_entrega || '—'),
                  e.latitude_entrega && h('div', { className: 'text-[11px] text-gray-400 mt-1 font-mono' },
                    `${e.latitude_entrega}, ${e.longitude_entrega}`)
                ),
              ),

              // ── 3 cards operacionais no modal ──
              h('div', { className: 'grid grid-cols-3 gap-2' },
                h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
                  h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Custo do provedor'),
                  h('div', { className: 'text-base font-semibold' }, fmtMoney(valorUber)),
                  e.distancia_km && h('div', { className: 'text-[10px] text-gray-400 mt-0.5' },
                    `${parseFloat(e.distancia_km).toFixed(1)} km`)
                ),
                h('div', { className: 'bg-purple-50 rounded-lg px-3 py-2.5' },
                  h('div', { className: 'text-[11px] text-purple-600 mb-0.5' }, 'Valor pela regra (km)'),
                  h('div', { className: 'text-base font-semibold text-purple-800' }, fmtMoney(valorHub))
                ),
                h('div', { className: `rounded-lg px-3 py-2.5 ${margemPos ? 'bg-green-50' : 'bg-red-50'}` },
                  h('div', { className: `text-[11px] mb-0.5 ${margemPos ? 'text-green-700' : 'text-red-700'}` }, 'Margem'),
                  h('div', { className: `text-base font-semibold ${margemPos ? 'text-green-800' : 'text-red-800'}` },
                    `${margemPos ? '+ ' : '− '}${fmtMoney(Math.abs(margemHub))}`),
                  margemHubPct !== null && h('div', { className: `text-[10px] mt-0.5 ${margemPos ? 'text-green-600' : 'text-red-600'}` },
                    `${margemPos ? '+' : ''}${margemHubPct.toFixed(1)}%`)
                ),
              ),

              // Entregador completo
              e.entregador_nome && h('div', { className: 'bg-gray-50 rounded-lg p-4' },
                h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3' }, '🏍 Entregador'),
                h('div', { className: 'flex gap-4 items-start' },
                  // Foto grande à esquerda
                  e.entregador_foto && h('img', {
                    src: e.entregador_foto,
                    alt: e.entregador_nome,
                    className: 'w-20 h-20 rounded-full object-cover bg-purple-100 flex-shrink-0',
                    onError: (ev) => { ev.target.style.display = 'none'; },
                  }),
                  // Dados ao lado
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 text-sm flex-1 min-w-0' },
                    h('div', null, h('span', { className: 'text-gray-500' }, 'Nome: '), h('span', { className: 'font-semibold' }, e.entregador_nome)),
                    e.entregador_rating && h('div', null, h('span', { className: 'text-gray-500' }, 'Rating: '), `★ ${e.entregador_rating}`),
                    e.entregador_telefone && h('div', null, h('span', { className: 'text-gray-500' }, 'Telefone: '), fmtTelefoneBR(e.entregador_telefone)),
                    e.entregador_placa && h('div', null, h('span', { className: 'text-gray-500' }, 'Placa: '), e.entregador_placa),
                    e.entregador_veiculo && h('div', null, h('span', { className: 'text-gray-500' }, 'Veículo: '), e.entregador_veiculo),
                    e.entregador_documento && h('div', null, h('span', { className: 'text-gray-500' }, 'Doc: '), e.entregador_documento),
                    e.id_motoboy_mapp && h('div', null, h('span', { className: 'text-gray-500' }, 'id Mapp: '), e.id_motoboy_mapp),
                  ),
                ),
              ),

              // Tracking URL oficial do provedor
              e.tracking_url && h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3' },
                h('div', { className: 'text-xs uppercase tracking-wider text-purple-700 font-semibold mb-2' }, '🔗 Rastreio da entrega'),
                h('div', { className: 'flex items-center gap-2 flex-wrap' },
                  h('a', {
                    href: e.tracking_url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'text-sm text-purple-700 hover:text-purple-900 underline break-all flex-1 min-w-0',
                  }, e.tracking_url),
                  h('button', {
                    onClick: () => navigator.clipboard?.writeText(e.tracking_url).then(
                      () => showToast('Link de rastreio copiado', 'success')
                    ),
                    className: 'text-xs px-2.5 py-1.5 border border-purple-200 rounded-md hover:bg-purple-100 text-purple-700 flex-shrink-0',
                  }, 'Copiar'),
                )
              ),

              // Erro último, com traducao PT-BR dos erros mais comuns
              e.erro_ultimo && (function() {
                const ERROS_MAP = {
                  // Uber Direct
                  'pickup_address_not_serviceable':      'Endereco de coleta fora da area de cobertura da Uber',
                  'dropoff_address_not_serviceable':     'Endereco de entrega fora da area de cobertura da Uber',
                  'address_not_found':                   'Endereco nao encontrado (verifique o CEP ou logradouro)',
                  'geocode_failed':                      'Nao foi possivel geocodificar o endereco',
                  'invalid_address':                     'Endereco invalido ou incompleto',
                  'quote_expired':                       'Cotacao expirou — tente redespachar',
                  'quote_not_found':                     'Cotacao nao encontrada (pode ter expirado)',
                  'delivery_not_found':                  'Entrega nao encontrada na Uber',
                  'no_couriers_available':               'Nenhum entregador disponivel na regiao no momento',
                  'courier_unavailable':                 'Entregador indisponivel — tentando reatribuir',
                  'cannot_cancel':                       'Cancelamento nao permitido neste status (entregador ja coletou)',
                  'payment_failed':                      'Falha no pagamento junto a Uber — verifique credito da conta',
                  'rate_limited':                        'Muitas requisicoes — aguarde alguns segundos e tente novamente',
                  'unauthorized':                        'Credenciais Uber invalidas ou expiradas',
                  'forbidden':                           'Sem permissao — verifique configuracao do provider Uber',
                  'service_unavailable':                 'Servico Uber temporariamente indisponivel — tente novamente',
                  // 99Entrega
                  'cancel too frequently':               '99Entrega: muitos cancelamentos seguidos — aguarde antes de cancelar novamente',
                  'errno=-1':                            '99Entrega: erro interno no sistema deles — tente novamente em instantes',
                  'errno=1001':                          '99Entrega: limite de cancelamentos atingido — aguarde',
                  'estimate_id':                         '99Entrega: cotacao invalida ou expirada — tente redespachar',
                  'order_not_found':                     '99Entrega: pedido nao encontrado na plataforma deles',
                  'invalid_pickup':                      '99Entrega: ponto de coleta invalido (CEP ou coordenada)',
                  'invalid_dropoff':                     '99Entrega: ponto de entrega invalido (CEP ou coordenada)',
                  // Generico
                  'timeout':                             'Timeout na comunicacao com o provedor — tente novamente',
                  'network':                             'Falha de rede ao comunicar com o provedor',
                  'auth_failed':                         'Falha de autenticacao com o provedor — verifique as credenciais',
                };
                const raw = String(e.erro_ultimo || '').toLowerCase();
                const traducao = Object.entries(ERROS_MAP).find(([k]) => raw.includes(k.toLowerCase()));
                return h('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-3 space-y-1' },
                  h('div', { className: 'text-xs uppercase tracking-wider text-red-700 font-semibold' }, '\u26a0 Ultimo erro'),
                  traducao && h('div', { className: 'text-sm text-red-900 font-medium' }, traducao[1]),
                  h('div', { className: 'text-xs text-red-700 font-mono break-words opacity-70 pt-1 border-t border-red-100' }, e.erro_ultimo),
                );
              })(),

              // ── Códigos de verificação (coleta + entrega) ───────────────────────
              (e.pickup_code || e.dropoff_code) &&
              h('div', { className: 'border border-gray-200 rounded-xl overflow-hidden' },
                h('div', { className: 'bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between' },
                  h('span', { className: 'text-sm font-semibold text-gray-700' }, '🔑 Códigos de verificação'),
                  h('span', { className: 'text-xs text-gray-400' }, 'Apresente ao entregador / destinatário'),
                ),
                h('div', { className: 'p-4 space-y-3' },

                  // Código de COLETA
                  e.pickup_code && h('div', { className: 'flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3' },
                    h('div', null,
                      h('div', { className: 'text-xs uppercase tracking-wider text-amber-700 font-semibold mb-1' }, '📦 Código de coleta'),
                      h('div', { className: 'text-xs text-amber-600 mb-1' }, 'Atendente da loja informa ao motoboy ao entregar o pacote'),
                      h('div', { className: 'text-2xl font-bold tracking-widest text-amber-800 font-mono' }, e.pickup_code),
                    ),
                    h('div', { className: 'flex flex-col gap-1.5 ml-4' },
                      h('button', {
                        onClick: () => navigator.clipboard?.writeText(e.pickup_code).then(() => showToast('Código copiado', 'success')),
                        className: 'text-xs px-2.5 py-1.5 border border-amber-200 rounded-md hover:bg-amber-100 text-amber-700',
                      }, 'Copiar'),
                      h('button', {
                        onClick: async () => {
                          try {
                            const r = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}/reenviar-codigo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'coleta' }) });
                            const j = await r.json();
                            showToast(j.ok ? 'WhatsApp enviado para a loja!' : `Não enviado: ${j.motivo || j.error}`, j.ok ? 'success' : 'error');
                          } catch (_) { showToast('Erro ao enviar', 'error'); }
                        },
                        className: 'text-xs px-2.5 py-1.5 border border-amber-200 rounded-md hover:bg-amber-100 text-amber-700',
                      }, '📲 Reenviar WPP'),
                    ),
                  ),

                  // Código de ENTREGA
                  e.dropoff_code && h('div', { className: 'flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-4 py-3' },
                    h('div', null,
                      h('div', { className: 'text-xs uppercase tracking-wider text-purple-700 font-semibold mb-1' }, '📍 Código de entrega'),
                      h('div', { className: 'text-xs text-purple-600 mb-1' },
                        e.codigo_wpp_enviado
                          ? '✓ WhatsApp enviado ao destinatário'
                          : '⚠ WhatsApp ainda não enviado ao destinatário'
                      ),
                      h('div', { className: 'text-2xl font-bold tracking-widest text-purple-800 font-mono' }, e.dropoff_code),
                    ),
                    h('div', { className: 'flex flex-col gap-1.5 ml-4' },
                      h('button', {
                        onClick: () => navigator.clipboard?.writeText(e.dropoff_code).then(() => showToast('Código copiado', 'success')),
                        className: 'text-xs px-2.5 py-1.5 border border-purple-200 rounded-md hover:bg-purple-100 text-purple-700',
                      }, 'Copiar'),
                      h('button', {
                        onClick: async () => {
                          try {
                            const r = await fetchAuth(`${API_URL}/logistics/deliveries/${e.id}/reenviar-codigo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: 'entrega' }) });
                            const j = await r.json();
                            showToast(j.ok ? 'WhatsApp enviado ao destinatário!' : `Não enviado: ${j.motivo || j.error}`, j.ok ? 'success' : 'error');
                          } catch (_) { showToast('Erro ao enviar', 'error'); }
                        },
                        className: 'text-xs px-2.5 py-1.5 border border-purple-200 rounded-md hover:bg-purple-100 text-purple-700',
                      }, '📲 Reenviar WPP'),
                    ),
                  ),
                ),
              ),

              // ── Comprovante de entrega (Uber + 99Entrega, pós DELIVERED) ──────
              ((e.provider_code === 'uber' || e.provider_code === 'noventanove') && (['PICKED_UP','DROPOFF_EN_ROUTE','ARRIVED_DROPOFF','DELIVERED'].includes(e.status_canonico) || e.status_uber === 'delivered')) &&
              h('div', { className: 'border border-gray-200 rounded-xl overflow-hidden' },

                // Header do bloco
                h('div', { className: 'bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between' },
                  h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-sm font-semibold text-gray-700' }, '📸 Comprovante de entrega'),
                    h('span', { className: 'text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full' }, e.provider_code === 'noventanove' ? '99Entrega' : 'Uber Direct'),
                  ),
                  !comprovante && !loadingComprovante && h('button', {
                    onClick: carregarComprovante,
                    className: 'text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold',
                  }, 'Carregar comprovante'),
                ),

                h('div', { className: 'p-4' },

                  // Loading
                  loadingComprovante && h('div', { className: 'flex items-center justify-center gap-2 py-6 text-gray-500 text-sm' },
                    h('div', { className: 'w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin' }),
                    'Buscando comprovante na Uber...'
                  ),

                  // Erro
                  erroComprovante && !loadingComprovante && h('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800' },
                    h('div', { className: 'font-semibold mb-1' }, 'Comprovante não disponível'),
                    erroComprovante,
                  ),

                  // Comprovante carregado
                  comprovante && !loadingComprovante && h('div', { className: 'space-y-4' },

                    // Foto(s) da entrega
                    (function() {
                      const fotos = [];
                      // Campo principal: document (Uber)
                      const srcDoc = imgSrc(comprovante.document);
                      if (srcDoc) fotos.push({ src: srcDoc, label: 'Foto do local de entrega' });
                      // Campo pictures (array, Uber)
                      if (Array.isArray(comprovante.pictures)) {
                        comprovante.pictures.forEach((p, i) => {
                          const s = imgSrc(p.document || p);
                          if (s) fotos.push({ src: s, label: `Foto ${i + 2}` });
                        });
                      }
                      // 🆕 99Entrega: arrays de URL por tipo (entrega/coleta/devolucao)
                      (comprovante.fotos_entrega || []).forEach((u, i) => {
                        const s = imgSrc(u); if (s) fotos.push({ src: s, label: `Entrega ${i + 1}` });
                      });
                      (comprovante.fotos_coleta || []).forEach((u, i) => {
                        const s = imgSrc(u); if (s) fotos.push({ src: s, label: `Coleta ${i + 1}` });
                      });
                      (comprovante.fotos_devolucao || []).forEach((u, i) => {
                        const s = imgSrc(u); if (s) fotos.push({ src: s, label: `Devolucao ${i + 1}` });
                      });
                      // fallback generico: comprovante.fotos[]
                      if (fotos.length === 0 && Array.isArray(comprovante.fotos)) {
                        comprovante.fotos.forEach((u, i) => {
                          const s = imgSrc(u); if (s) fotos.push({ src: s, label: `Foto ${i + 1}` });
                        });
                      }
                      if (fotos.length === 0) return null;
                      return h('div', null,
                        h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2' },
                          `📷 ${fotos.length === 1 ? 'Foto da entrega' : `Fotos (${fotos.length})`}`),
                        h('div', { className: `grid gap-2 ${fotos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}` },
                          fotos.map(({ src, label }, i) =>
                            h('div', { key: i },
                              h('img', {
                                src,
                                alt: label,
                                className: 'w-full rounded-lg border border-gray-200 object-cover max-h-64',
                                onError: (ev) => {
                                  ev.target.parentElement.innerHTML = '<div class="text-xs text-gray-400 text-center py-6 border border-gray-200 rounded-lg">Imagem não disponível</div>';
                                },
                              }),
                              h('div', { className: 'text-[11px] text-gray-400 mt-1 text-center' }, label),
                            )
                          )
                        )
                      );
                    })(),

                    // Assinatura
                    (function() {
                      const srcSig = imgSrc(comprovante.signature);
                      if (!srcSig) return null;
                      return h('div', null,
                        h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2' }, '✍ Assinatura do recebedor'),
                        h('div', { className: 'bg-gray-50 rounded-lg border border-gray-200 p-3 flex justify-center' },
                          h('img', {
                            src: srcSig,
                            alt: 'Assinatura',
                            className: 'max-h-24 object-contain',
                            style: { filter: 'invert(0)' },
                          })
                        )
                      );
                    })(),

                    // Rodapé com botão de download
                    h('div', { className: 'flex items-center justify-between pt-2 border-t border-gray-100' },
                      h('div', { className: 'text-xs text-gray-400' },
                        e.finalizado_at ? `Entrega concluída em ${fmtDT(e.finalizado_at)}` : 'Entrega concluída'
                      ),
                      h('button', {
                        onClick: () => {
                          const dataStr = JSON.stringify(comprovante, null, 2);
                          const blob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `comprovante-OS${e.codigo_os}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        },
                        className: 'text-xs px-2.5 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600',
                      }, '⬇ Baixar dados brutos'),
                    ),
                  ),

                  // Estado inicial — antes de clicar em "Carregar"
                  !comprovante && !loadingComprovante && !erroComprovante &&
                  h('div', { className: 'text-center py-5 text-gray-400 text-sm' },
                    h('div', { className: 'text-2xl mb-2' }, '📄'),
                    'Clique em "Carregar comprovante" para buscar a foto e assinatura coletadas pelo entregador da Uber.'
                  ),
                ),
              ),

              // Timestamps
              h('div', { className: 'text-xs text-gray-500 pt-3 border-t border-gray-100 space-y-0.5' },
                h('div', null, `Despachada: ${fmtDT(e.created_at)}`),
                e.finalizado_at && h('div', null, `Finalizada: ${fmtDT(e.finalizado_at)}`),
                h('div', null, `Tentativas: ${e.tentativas || 0}`),
                e.cancelado_por && h('div', null, `Cancelada por: ${e.cancelado_por}${e.cancelado_motivo ? ' — ' + e.cancelado_motivo : ''}`),
              ),

              // ID da entrega (rotulado, com botão copiar) — último item antes do debug
              e.uber_delivery_id && h('div', { className: 'flex items-center justify-between gap-2 text-xs pt-2 border-t border-gray-100' },
                h('div', { className: 'min-w-0 flex-1' },
                  h('span', { className: 'text-gray-500' }, 'ID da entrega: '),
                  h('span', { className: 'font-mono text-gray-700 break-all' }, e.uber_delivery_id),
                ),
                h('button', {
                  onClick: copiarDeliveryId,
                  className: 'text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-gray-600 flex-shrink-0',
                  title: 'Copiar ID',
                }, '📋 Copiar'),
              ),

              // ── 🔧 Dados técnicos (colapsável) ──
              // 🆕 Trilha da entrega (criação → coleta → entrega + troca de moto / devolução)
              h(TrilhaEntrega, { entrega: e, webhooks: webhooks }),

              // Pra debug. Mostra tracking points brutos + webhooks recebidos.
              // Quase nunca é necessário no dia-a-dia, mas é vital quando algo dá errado.
              ((tracking && tracking.length > 0) || (webhooks && webhooks.length > 0)) && h('div', { className: 'pt-3 border-t border-gray-100' },
                h('button', {
                  onClick: () => setShowDebug(!showDebug),
                  className: 'w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-800 py-2 px-3 rounded-lg hover:bg-gray-50',
                },
                  h('span', { className: 'font-semibold' },
                    `🔧 Dados técnicos (${(tracking?.length || 0)} pts · ${(webhooks?.length || 0)} webhooks)`),
                  h('span', { className: 'text-base' }, showDebug ? '▴' : '▾'),
                ),
                showDebug && h('div', { className: 'mt-2 space-y-3' },
                  // Tracking points
                  tracking && tracking.length > 0 && h('div', null,
                    h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' },
                      `Pontos de tracking (${tracking.length})`),
                    h('div', { className: 'bg-gray-50 rounded-lg p-2 max-h-40 overflow-y-auto space-y-0.5' },
                      tracking.map((t, i) => h('div', { key: i, className: 'text-[11px] flex justify-between font-mono text-gray-600' },
                        h('span', null, `${parseFloat(t.latitude).toFixed(5)}, ${parseFloat(t.longitude).toFixed(5)}`),
                        h('span', { className: 'text-gray-400' }, `${t.status_uber || '—'} · ${fmtDT(t.created_at)}`)
                      ))
                    )
                  ),
                  // Webhooks recebidos
                  webhooks && webhooks.length > 0 && h('div', null,
                    h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' },
                      `Webhooks recebidos (${webhooks.length})`),
                    h('div', { className: 'bg-gray-50 rounded-lg p-2 max-h-40 overflow-y-auto space-y-0.5' },
                      webhooks.map((w, i) => h('div', { key: i, className: 'text-[11px] flex justify-between text-gray-600' },
                        h('span', { className: 'font-semibold' }, w.tipo),
                        h('span', { className: 'text-gray-400' },
                          `${w.processado ? '✓' : '✗'} ${fmtDT(w.created_at)}`,
                          w.erro && h('span', { className: 'text-red-600 ml-2' }, w.erro)
                        )
                      ))
                    )
                  ),
                ),
              )
            )
      )
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA 4: CONFIG - configuração da integração
  // ════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════
  // CardGuardrailGlobal — precificação por distância (tabela global configurável).
  // Piso de margem aplicado pelo despacho automático quando a OS
  // não casa com uma regra de cliente que defina margem própria.
  // global = default: a regra do cliente, quando configurada,
  // sobrescreve este padrão.
  // ════════════════════════════════════════════════════════
  // ──────────────────────────────────────────────────────────────────────
  // Liga/desliga o despacho automatico (PollingWorker) pela tela.
  // Estado em logistics_worker_state via /logistics/worker-state.
  // ──────────────────────────────────────────────────────────────────────
  function CardWorkerControl({ API_URL, fetchAuth, showToast }) {
    const [estado, setEstado] = useState(null);
    const [salvando, setSalvando] = useState(false);
    const apiRef = useRef(API_URL);
    const fetchRef = useRef(fetchAuth);
    const toastRef = useRef(showToast);
    useEffect(() => { apiRef.current = API_URL; fetchRef.current = fetchAuth; toastRef.current = showToast; });

    const carregar = useCallback(async () => {
      try {
        const res = await fetchRef.current(`${apiRef.current}/logistics/worker-state`);
        const json = await res.json();
        if (json && json.success) setEstado(json.estado);
      } catch (e) { /* silencioso */ }
    }, []);

    useEffect(() => {
      carregar();
      const t = setInterval(carregar, 20000);
      return () => clearInterval(t);
    }, [carregar]);

    async function setLigado(ligar) {
      setSalvando(true);
      try {
        const res = await fetchRef.current(`${apiRef.current}/logistics/worker-state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativo: ligar, auto_despacho: ligar }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setEstado(json.estado);
          toastRef.current(ligar ? 'Despacho automatico LIGADO' : 'Despacho automatico desligado', ligar ? 'success' : 'info');
        } else {
          toastRef.current((json && json.error) || 'Erro ao alterar o worker', 'error');
        }
      } catch (e) { toastRef.current('Erro de rede', 'error'); }
      finally { setSalvando(false); }
    }

    const ligado = !!(estado && estado.ativo && estado.auto_despacho);
    const ultimoCiclo = (estado && estado.ultimo_ciclo_em)
      ? new Date(estado.ultimo_ciclo_em).toLocaleString('pt-BR')
      : '\u2014';

    return h('div', { className: `rounded-xl border p-5 mb-4 ${ligado ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}` },
      h('div', { className: 'flex items-center justify-between gap-4' },
        h('div', null,
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-lg' }, ligado ? '\uD83D\uDFE2' : '\u26AA'),
            h('span', { className: 'font-bold text-gray-800' }, 'Despacho automatico'),
            h('span', { className: `text-[10px] font-semibold px-2 py-0.5 rounded-full ${ligado ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}` }, ligado ? 'LIGADO' : 'DESLIGADO')
          ),
          h('p', { className: 'text-xs text-gray-500 mt-1' },
            ligado
              ? 'O worker esta varrendo a Mapp e despachando as OS que casam com as regras ativas.'
              : 'O worker esta parado \u2014 nenhuma OS e despachada automaticamente.'),
          h('p', { className: 'text-[11px] text-gray-400 mt-1' }, `Ultimo ciclo: ${ultimoCiclo}`)
        ),
        h('button', {
          onClick: () => setLigado(!ligado),
          disabled: salvando || !estado,
          className: `relative w-14 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${ligado ? 'bg-green-600' : 'bg-gray-300'}`,
        }, h('span', { className: `absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${ligado ? 'right-0.5' : 'left-0.5'}` }))
      ),
      ligado
        ? h('p', { className: 'text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3' },
            '\u26A0\uFE0F Ligado: cada OS que casar com uma regra e despachada de verdade na 99/Uber (gera custo).')
        : null
    );
  }

  function CardGuardrailGlobal({ API_URL, fetchAuth, showToast }) {
    const { useState, useEffect, useCallback } = React;
    const [cfg, setCfg]         = useState(null);
    const [salvando, setSalvando] = useState(false);
    const [simKm, setSimKm]     = useState(8);

    const carregar = useCallback(async () => {
      try {
        const res  = await fetchAuth(`${API_URL}/logistics/config-global`);
        const json = await res.json();
        if (json && json.success && json.config) {
          setCfg({
            tabela_preco_ativa:       !!json.config.tabela_preco_ativa,
            alterar_valor_mapp_ativo: json.config.alterar_valor_mapp_ativo !== false,
            preco_valor_fixo:         json.config.preco_valor_fixo != null ? String(json.config.preco_valor_fixo) : '',
            preco_km_base:            json.config.preco_km_base != null ? String(json.config.preco_km_base) : '',
            preco_valor_km_adicional: json.config.preco_valor_km_adicional != null ? String(json.config.preco_valor_km_adicional) : '',
          });
        } else {
          setCfg({ tabela_preco_ativa: false, preco_valor_fixo: '', preco_km_base: '', preco_valor_km_adicional: '' });
        }
      } catch {
        showToast('Erro ao carregar configuração de preço', 'error');
        setCfg({ tabela_preco_ativa: false, preco_valor_fixo: '', preco_km_base: '', preco_valor_km_adicional: '' });
      }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar(); }, [carregar]);

    function up(k, v) { setCfg(prev => ({ ...prev, [k]: v })); }

    async function salvar() {
      setSalvando(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/config-global`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tabela_preco_ativa:       cfg.tabela_preco_ativa,
            preco_valor_fixo:         cfg.preco_valor_fixo         === '' ? null : Number(cfg.preco_valor_fixo),
            preco_km_base:            cfg.preco_km_base             === '' ? null : Number(cfg.preco_km_base),
            preco_valor_km_adicional: cfg.preco_valor_km_adicional  === '' ? null : Number(cfg.preco_valor_km_adicional),
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          showToast('Tabela de preço salva', 'success');
          carregar();
        } else {
          showToast((json && json.error) || 'Erro ao salvar', 'error');
        }
      } catch { showToast('Erro de rede ao salvar', 'error'); }
      finally  { setSalvando(false); }
    }

    if (!cfg) {
      return h('div', { className: 'bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-center' },
        h('div', { className: 'animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full' })
      );
    }

    // Cálculo do simulador — reativo aos campos da configuração
    const vf  = parseFloat(cfg.preco_valor_fixo)         || 0;
    const kb  = parseFloat(cfg.preco_km_base)             || 0;
    const vkm = parseFloat(cfg.preco_valor_km_adicional)  || 0;
    const excedente    = Math.max(0, simKm - kb);
    const totalSim     = Math.round((vf + excedente * vkm) * 100) / 100;
    const tabelaOk     = vf > 0 && kb > 0 && vkm > 0;
    const ativa        = cfg.tabela_preco_ativa;

    return h('div', { className: 'bg-white rounded-xl border border-gray-200 overflow-hidden' },

      // ── Header ──
      h('div', { className: 'flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100' },
        h('div', null,
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-base' }, '📏'),
            h('span', { className: 'font-semibold text-gray-800 text-sm' }, 'Precificação por distância'),
            ativa
              ? h('span', { className: 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700' }, 'ATIVA')
              : h('span', { className: 'text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500' }, 'DESATIVADA'),
          ),
          h('p', { className: 'text-xs text-gray-500 mt-1' },
            'Valor fixo até a distância base + R$/km excedente. Sobrescrito por cliente nas Regras abaixo.')
        ),
        h('button', {
          onClick: () => up('tabela_preco_ativa', !ativa),
          className: `relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${ativa ? 'bg-purple-600' : 'bg-gray-300'}`,
        }, h('span', { className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${ativa ? 'right-0.5' : 'left-0.5'}` }))
      ),

      h('div', { className: 'p-5 space-y-5' },

        // ── Campos de configuração ──
        h('div', { className: 'grid grid-cols-3 gap-4' },
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Valor fixo (R$)'),
            h('input', {
              type: 'number', step: '0.50', min: '0',
              value: cfg.preco_valor_fixo,
              onChange: e => up('preco_valor_fixo', e.target.value),
              placeholder: 'ex: 11,90',
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500',
            }),
            h('p', { className: 'text-[11px] text-gray-400 mt-1' }, 'cobrado até a distância base'),
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Distância base (km)'),
            h('input', {
              type: 'number', step: '0.5', min: '1',
              value: cfg.preco_km_base,
              onChange: e => up('preco_km_base', e.target.value),
              placeholder: 'ex: 2',
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500',
            }),
            h('p', { className: 'text-[11px] text-gray-400 mt-1' }, 'km incluídos no valor fixo'),
          ),
          h('div', null,
            h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Por km adicional (R$)'),
            h('input', {
              type: 'number', step: '0.10', min: '0',
              value: cfg.preco_valor_km_adicional,
              onChange: e => up('preco_valor_km_adicional', e.target.value),
              placeholder: 'ex: 1,90',
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500',
            }),
            h('p', { className: 'text-[11px] text-gray-400 mt-1' }, 'a partir do km excedente'),
          ),
        ),

        // ── Simulador interativo ──
        tabelaOk && h('div', { className: 'bg-gray-50 rounded-xl border border-gray-200 p-4' },
          h('div', { className: 'flex items-center gap-2 mb-3' },
            h('span', { className: 'text-xs font-semibold text-gray-600 uppercase' }, '🧮 Simulador'),
          ),
          // Slider de distância
          h('div', { className: 'flex items-center gap-3 mb-4' },
            h('span', { className: 'text-xs text-gray-500 whitespace-nowrap' }, 'Distância:'),
            h('input', {
              type: 'range', min: '1', max: '60', step: '1',
              value: simKm,
              onChange: e => setSimKm(parseInt(e.target.value, 10)),
              style: { flex: 1 },
            }),
            h('span', { className: 'text-sm font-semibold text-gray-800 min-w-[52px] text-right' }, `${simKm} km`),
          ),
          // Resultado
          h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1.5' },
            h('div', { className: 'flex justify-between items-center' },
              h('span', { className: 'text-xs text-purple-700' }, `Valor fixo (até ${kb} km)`),
              h('span', { className: 'text-xs font-semibold text-purple-800' },
                `R$ ${vf.toFixed(2).replace('.', ',')}`)
            ),
            excedente > 0 && h('div', { className: 'flex justify-between items-center' },
              h('span', { className: 'text-xs text-purple-700' },
                `+ ${excedente} km adicionais × R$ ${vkm.toFixed(2).replace('.', ',')}`),
              h('span', { className: 'text-xs font-semibold text-purple-800' },
                `R$ ${(excedente * vkm).toFixed(2).replace('.', ',')}`)
            ),
            h('div', { className: 'flex justify-between items-center pt-1.5 border-t border-purple-200 mt-1' },
              h('span', { className: 'text-xs font-semibold text-purple-900' }, 'Total cobrado do cliente'),
              h('span', { className: 'text-base font-bold text-purple-900' },
                `R$ ${totalSim.toFixed(2).replace('.', ',')}`)
            ),
          ),
        ),

        // ── Botão salvar ──
        h('div', { className: 'flex justify-end pt-1' },
          h('button', {
            onClick: salvar, disabled: salvando,
            className: 'px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50',
          }, salvando ? 'Salvando...' : 'Salvar tabela de preço'),
        ),
      ),
    );
  }


  function TabRegras({ API_URL, fetchAuth, showToast }) {
    const [regras, setRegras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(null); // null | 'novo' | {id, ...}

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dispatch-rules`);
        const json = await res.json();
        setRegras(json.regras || []);
      } catch { showToast('Erro ao carregar regras', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar(); }, []);

    function novoForm() {
      setEditando({
        cliente_nome: '',
        trecho_endereco: '',
        cliente_identificador: '',
        usar_uber: true,
        regioes_permitidas_csv: '',
        horario_inicio: '',
        horario_fim: '',
        valor_minimo: '',
        valor_maximo: '',
        preco_valor_fixo: '',
        preco_km_base: '',
        preco_valor_km_adicional: '',
        ativo: true,
        alterar_valor_mapp_ativo: true,
      });
    }

    function editarRegra(r) {
      setEditando({
        ...r,
        // usar_uber nao e coluna real — deriva de providers_preferidos pro checkbox
        // refletir certo e NAO zerar os providers ao salvar.
        usar_uber: (r.providers_preferidos || []).includes('uber'),
        // Compat: regras antigas só tinham cliente_nome (que era o trecho).
        // Se trecho_endereco estiver vazio, preenche com cliente_nome pra não perder o match.
        trecho_endereco: r.trecho_endereco || r.cliente_nome || '',
        regioes_permitidas_csv: (r.regioes_permitidas || []).join(', '),
        horario_inicio: r.horario_inicio || '',
        horario_fim: r.horario_fim || '',
        valor_minimo: r.valor_minimo || '',
        valor_maximo: r.valor_maximo || '',
        preco_valor_fixo: r.preco_valor_fixo ?? '',
        preco_km_base: r.preco_km_base ?? '',
        preco_valor_km_adicional: r.preco_valor_km_adicional ?? '',
      });
    }

    async function salvar() {
      if (!editando?.cliente_nome?.trim()) {
        showToast('Nome do cliente é obrigatório', 'error');
        return;
      }
      if (!editando?.trecho_endereco?.trim() || editando.trecho_endereco.trim().length < 5) {
        showToast('Trecho do endereço deve ter no mínimo 5 caracteres', 'error');
        return;
      }
      const payload = {
        cliente_nome: editando.cliente_nome.trim(),
        trecho_endereco: editando.trecho_endereco.trim(),
        cliente_identificador: editando.cliente_identificador?.trim() || null,
        usar_uber: !!editando.usar_uber,
        regioes_permitidas: editando.regioes_permitidas_csv,
        horario_inicio: editando.horario_inicio || null,
        horario_fim: editando.horario_fim || null,
        valor_minimo: editando.valor_minimo === '' ? null : parseFloat(editando.valor_minimo),
        valor_maximo: editando.valor_maximo === '' ? null : parseFloat(editando.valor_maximo),
        preco_valor_fixo: editando.preco_valor_fixo === '' ? null : parseFloat(editando.preco_valor_fixo || ''),
        preco_km_base: editando.preco_km_base === '' ? null : parseFloat(editando.preco_km_base || ''),
        preco_valor_km_adicional: editando.preco_valor_km_adicional === '' ? null : parseFloat(editando.preco_valor_km_adicional || ''),
        ativo: !!editando.ativo,
        alterar_valor_mapp_ativo: editando.alterar_valor_mapp_ativo !== false,
      };
      const metodo = editando.id ? 'PUT' : 'POST';
      const url = editando.id ? `${API_URL}/logistics/dispatch-rules/${editando.id}` : `${API_URL}/logistics/dispatch-rules`;
      try {
        const res = await fetchAuth(url, {
          method: metodo,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast(editando.id ? 'Regra atualizada' : 'Regra criada', 'success');
          setEditando(null);
          carregar();
        } else {
          const j = await res.json().catch(() => ({}));
          showToast(j.error || 'Erro ao salvar', 'error');
        }
      } catch { showToast('Erro de rede', 'error'); }
    }

    async function toggleAtivo(r) {
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dispatch-rules/${r.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativo: !r.ativo }),
        });
        if (res.ok) { showToast(r.ativo ? 'Regra desativada' : 'Regra ativada', 'success'); carregar(); }
      } catch { showToast('Erro', 'error'); }
    }

    async function excluir(r) {
      if (!confirm(`Excluir a regra do cliente "${r.cliente_nome}"?`)) return;
      try {
        const res = await fetchAuth(`${API_URL}/logistics/dispatch-rules/${r.id}`, { method: 'DELETE' });
        if (res.ok) { showToast('Regra excluída', 'success'); carregar(); }
      } catch { showToast('Erro ao excluir', 'error'); }
    }

    if (loading) return h('div', { className: 'flex items-center justify-center py-16' },
      h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full' })
    );

    const up = (k, v) => setEditando(e => ({ ...e, [k]: v }));

    return h('div', { className: 'max-w-5xl mx-auto p-4 space-y-4' },
      h('div', { className: 'flex items-center justify-between' },
        h('div', null,
          h('h2', { className: 'text-2xl font-bold text-gray-800' }, '📋 Regras por endereço de coleta'),
          h('p', { className: 'text-xs text-gray-500 mt-1' },
            'O worker só despacha OS cujo endereço de coleta casa com algum trecho cadastrado aqui. ',
            'A Mapp não retorna nome do cliente — match é por trecho do endereço. Sem regra ativa = sem despacho automático.')
        ),
        h('button', {
          onClick: novoForm,
          className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-semibold',
        }, '+ Nova regra')
      ),

      // Padrão global de margem — piso do despacho automático
      h(CardWorkerControl, { API_URL, fetchAuth, showToast }),
      h(CardGuardrailGlobal, { API_URL, fetchAuth, showToast }),

      // Lista de regras
      h('div', { className: 'bg-white rounded-xl border shadow-sm overflow-hidden' },
        regras.length === 0
          ? h('div', { className: 'p-12 text-center text-gray-400' },
              h('div', { className: 'text-4xl mb-2' }, '📭'),
              h('p', { className: 'font-semibold' }, 'Nenhuma regra cadastrada'),
              h('p', { className: 'text-xs mt-1' }, 'Enquanto não houver regras, o worker não vai despachar nada automaticamente.'))
          : h('table', { className: 'w-full text-sm' },
              h('thead', { className: 'bg-gray-50 text-xs uppercase text-gray-600' },
                h('tr', null,
                  h('th', { className: 'px-4 py-3 text-left' }, 'Status'),
                  h('th', { className: 'px-4 py-3 text-left' }, 'Cliente'),
                  h('th', { className: 'px-4 py-3 text-left' }, 'Trecho do endereço'),
                  h('th', { className: 'px-4 py-3 text-left' }, 'Regiões'),
                  h('th', { className: 'px-4 py-3 text-left' }, 'Horário'),
                  h('th', { className: 'px-4 py-3 text-right' }, 'Ações'),
                )),
              h('tbody', null,
                regras.map(r => h('tr', { key: r.id, className: 'border-t hover:bg-gray-50' },
                  h('td', { className: 'px-4 py-3' },
                    h('button', {
                      onClick: () => toggleAtivo(r),
                      className: `px-2 py-0.5 rounded-full text-xs font-bold ${r.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`,
                    }, r.ativo ? '● Ativa' : '○ Inativa')),
                  h('td', { className: 'px-4 py-3' },
                    h('div', { className: 'font-semibold text-gray-800' }, r.cliente_nome)),
                  h('td', { className: 'px-4 py-3 text-xs' },
                    h('div', { className: 'font-mono text-gray-700' }, r.trecho_endereco || r.cliente_nome),
                    r.cliente_identificador && h('div', { className: 'text-[11px] text-gray-500 mt-0.5' }, `+ alt: ${r.cliente_identificador}`)),
                  h('td', { className: 'px-4 py-3 text-xs' },
                    (r.regioes_permitidas && r.regioes_permitidas.length > 0)
                      ? r.regioes_permitidas.join(', ')
                      : h('span', { className: 'text-amber-600 font-semibold' }, '⚠ qualquer região')),
                  h('td', { className: 'px-4 py-3 text-xs' },
                    (r.horario_inicio && r.horario_fim)
                      ? `${r.horario_inicio} – ${r.horario_fim}`
                      : h('span', { className: 'text-gray-400' }, 'sempre')),
                  h('td', { className: 'px-4 py-3 text-right' },
                    h('button', { onClick: () => editarRegra(r), className: 'text-purple-600 text-xs hover:underline mr-3' }, 'Editar'),
                    h('button', { onClick: () => excluir(r), className: 'text-red-600 text-xs hover:underline' }, 'Excluir'))
                ))
              )
            )
      ),

      // Modal de edição
      editando && h('div', {
        className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
        onClick: e => { if (e.target === e.currentTarget) setEditando(null); },
      },
        h('div', { className: 'bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto' },
          h('div', { className: 'p-5 border-b sticky top-0 bg-white' },
            h('h3', { className: 'font-bold text-gray-800' },
              editando.id ? '✏️ Editar regra' : '➕ Nova regra'),
          ),
          h('div', { className: 'p-5 space-y-3' },

            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Nome do cliente *'),
              h('input', {
                type: 'text', value: editando.cliente_nome || '',
                onChange: e => up('cliente_nome', e.target.value),
                placeholder: 'ex: Auto Peças Pereira',
                className: 'w-full px-3 py-2 border rounded-lg text-sm',
              }),
              h('p', { className: 'text-xs text-gray-500 mt-1' },
                'Nome de exibição do cliente — usado nos cards e no dashboard de margem por cliente.')
            ),

            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Trecho do endereço de coleta *'),
              h('input', {
                type: 'text', value: editando.trecho_endereco || '',
                onChange: e => up('trecho_endereco', e.target.value),
                placeholder: 'ex: pernambuco, 1500',
                className: 'w-full px-3 py-2 border rounded-lg text-sm',
              }),
              h('p', { className: 'text-xs text-gray-500 mt-1' },
                '⚠ A Mapp não retorna nome de cliente — match é feito contra o ENDEREÇO de coleta da OS. ',
                'Coloque um trecho ÚNICO do endereço do cliente (mínimo 5 caracteres, lowercase, sem acento se possível).')
            ),

            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Identificador alternativo (opcional)'),
              h('input', {
                type: 'text', value: editando.cliente_identificador || '',
                onChange: e => up('cliente_identificador', e.target.value),
                placeholder: 'outro trecho de endereço (alternativa)',
                className: 'w-full px-3 py-2 border rounded-lg text-sm',
              }),
              h('p', { className: 'text-xs text-gray-500 mt-1' },
                'Segunda opção de match — se este trecho aparecer no endereço de coleta, também casa.')
            ),

            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Regiões permitidas (CSV)'),
              h('input', {
                type: 'text', value: editando.regioes_permitidas_csv || '',
                onChange: e => up('regioes_permitidas_csv', e.target.value),
                placeholder: 'salvador, lauro de freitas, simões filho',
                className: 'w-full px-3 py-2 border rounded-lg text-sm',
              }),
              h('p', { className: 'text-xs text-amber-700 mt-1 font-semibold' },
                '⚠ Deixar vazio = aceita qualquer região (não recomendado). Preencher evita que OS fora da cobertura sejam travadas na Mapp.')
            ),

            h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Horário início'),
                h('input', { type: 'time', value: editando.horario_inicio || '', onChange: e => up('horario_inicio', e.target.value), className: 'w-full px-3 py-2 border rounded-lg text-sm' })),
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Horário fim'),
                h('input', { type: 'time', value: editando.horario_fim || '', onChange: e => up('horario_fim', e.target.value), className: 'w-full px-3 py-2 border rounded-lg text-sm' })),
            ),

            h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Valor mínimo (R$)'),
                h('input', { type: 'number', step: '0.01', value: editando.valor_minimo || '', onChange: e => up('valor_minimo', e.target.value), placeholder: 'sem limite', className: 'w-full px-3 py-2 border rounded-lg text-sm' })),
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Valor máximo (R$)'),
                h('input', { type: 'number', step: '0.01', value: editando.valor_maximo || '', onChange: e => up('valor_maximo', e.target.value), placeholder: 'sem limite', className: 'w-full px-3 py-2 border rounded-lg text-sm' })),
            ),

            // Tabela de preço por distância — override do cliente
            h('div', { className: 'border border-purple-200 bg-purple-50 rounded-lg p-4' },
              h('div', { className: 'text-xs font-semibold text-purple-800 uppercase mb-3' }, '📏 Tabela de preço por distância — override deste cliente'),
              h('div', { className: 'grid grid-cols-3 gap-3 mb-2' },
                h('div', null,
                  h('label', { className: 'block text-xs text-purple-700 mb-1' }, 'Valor fixo (R$)'),
                  h('input', { type: 'number', step: '0.5', min: '0',
                    value: editando.preco_valor_fixo ?? '',
                    onChange: e => up('preco_valor_fixo', e.target.value),
                    placeholder: 'deixe vazio = usa global',
                    className: 'w-full px-2 py-1.5 border border-purple-200 rounded-lg text-sm bg-white' }),
                ),
                h('div', null,
                  h('label', { className: 'block text-xs text-purple-700 mb-1' }, 'Distância base (km)'),
                  h('input', { type: 'number', step: '0.5', min: '1',
                    value: editando.preco_km_base ?? '',
                    onChange: e => up('preco_km_base', e.target.value),
                    placeholder: 'ex: 5',
                    className: 'w-full px-2 py-1.5 border border-purple-200 rounded-lg text-sm bg-white' }),
                ),
                h('div', null,
                  h('label', { className: 'block text-xs text-purple-700 mb-1' }, 'Por km adicional (R$)'),
                  h('input', { type: 'number', step: '0.1', min: '0',
                    value: editando.preco_valor_km_adicional ?? '',
                    onChange: e => up('preco_valor_km_adicional', e.target.value),
                    placeholder: 'ex: 2,50',
                    className: 'w-full px-2 py-1.5 border border-purple-200 rounded-lg text-sm bg-white' }),
                ),
              ),
              h('p', { className: 'text-[11px] text-purple-600' },
                'Deixe todos em branco pra usar a tabela padrão global. Se preenchido, substitui o padrão inteiramente pra este cliente.'),
            ),

            h('div', { className: 'flex items-center gap-6 pt-2 border-t' },
              h('label', { className: 'inline-flex items-center text-sm' },
                h('input', { type: 'checkbox', checked: !!editando.usar_uber, onChange: e => up('usar_uber', e.target.checked), className: 'mr-2' }),
                'Usar Uber'),
              h('label', { className: 'inline-flex items-center text-sm' },
                h('input', { type: 'checkbox', checked: !!editando.ativo, onChange: e => up('ativo', e.target.checked), className: 'mr-2' }),
                'Regra ativa'),
            ),

            h('div', { className: 'flex items-center justify-between gap-3 pt-3 border-t' },
              h('div', null,
                h('div', { className: 'text-sm font-semibold text-gray-800' }, 'Alterar valor do cliente na Mapp'),
                h('p', { className: 'text-[11px] text-gray-500 mt-0.5' },
                  'Ligado: o Hub envia o valor recalculado pra Mapp. Desligado: o valor deste cliente na Mapp nao e alterado.')
              ),
              h('button', {
                type: 'button',
                onClick: () => up('alterar_valor_mapp_ativo', editando.alterar_valor_mapp_ativo === false),
                className: `relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${editando.alterar_valor_mapp_ativo !== false ? 'bg-purple-600' : 'bg-gray-300'}`,
              }, h('span', { className: `absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${editando.alterar_valor_mapp_ativo !== false ? 'right-0.5' : 'left-0.5'}` })),
            ),
          ),
          h('div', { className: 'p-5 border-t flex justify-end gap-2 bg-gray-50' },
            h('button', { onClick: () => setEditando(null), className: 'px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300' }, 'Cancelar'),
            h('button', { onClick: salvar, className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-semibold' },
              editando.id ? '💾 Salvar' : '➕ Criar'),
          )
        )
      )
    );
  }


  // ════════════════════════════════════════════════════════
  // COMPONENTE RAIZ
  // Usa props.estado.logisticaTab (controlado pelo OverflowNav do app.js)
  // ════════════════════════════════════════════════════════
  // =========================================================
  // Helpers de bloqueio/frequentes
  // =========================================================
  function soDigitos(v) { return String(v || '').replace(/\D/g, ''); }

  // =========================================================
  // MODAL: Reportar ocorrencia (+ bloquear entregador)
  // =========================================================
  function ModalReportarOcorrencia({ entrega, API_URL, fetchAuth, showToast, onClose, onSucesso }) {
    const e = entrega;
    const [descricao, setDescricao] = useState('');
    const [bloquear, setBloquear] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const prov = provedorInfo(e);
    const semContato = !e.entregador_telefone && !e.entregador_placa;

    async function enviar() {
      if (!descricao.trim()) { showToast && showToast('Descreva a ocorrencia', 'error'); return; }
      if (bloquear && semContato) { showToast && showToast('Sem telefone/placa: nao da pra bloquear com seguranca', 'error'); return; }
      setEnviando(true);
      try {
        const res = await fetchAuth(`${API_URL}/logistics/ocorrencias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo_os: e.codigo_os,
            delivery_id: e.id,
            provider_code: e.provider_code || prov.code,
            courier: { name: e.entregador_nome, phone: e.entregador_telefone, plate: e.entregador_placa },
            descricao: descricao.trim(),
            bloquear,
          }),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          showToast && showToast(bloquear ? 'Ocorrencia registrada e entregador bloqueado' : 'Ocorrencia registrada', 'success');
          onSucesso && onSucesso();
          onClose && onClose();
        } else {
          showToast && showToast(json.error || 'Erro ao reportar', 'error');
        }
      } catch (err) {
        showToast && showToast('Erro ao reportar: ' + err.message, 'error');
      } finally {
        setEnviando(false);
      }
    }

    return h('div', { className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50', onClick: onClose },
      h('div', { className: 'bg-white rounded-xl shadow-xl w-full max-w-md', onClick: (ev) => ev.stopPropagation() },
        h('div', { className: 'flex items-center justify-between px-5 py-4 border-b border-gray-100' },
          h('span', { className: 'text-base font-bold text-gray-800 flex items-center gap-2' }, '⚠️ Reportar ocorrencia'),
          h('button', { onClick: onClose, className: 'text-gray-400 hover:text-gray-600 text-xl leading-none' }, '×'),
        ),
        h('div', { className: 'px-5 py-4 space-y-4' },
          h('div', null,
            h('div', { className: 'text-[11px] text-gray-400 mb-1' }, 'Corrida'),
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-sm font-bold text-gray-800' }, `OS ${e.codigo_os}`),
              h(ProviderLogo, { code: prov.code, size: 16 }),
            ),
          ),
          h('div', { className: 'bg-gray-50 rounded-lg p-3 flex items-center gap-3' },
            h('div', { className: 'relative flex-shrink-0' },
              e.entregador_foto
                ? h('img', {
                    src: e.entregador_foto, alt: e.entregador_nome || 'Entregador',
                    className: 'w-10 h-10 rounded-full object-cover',
                    onError: (ev) => { ev.target.style.display = 'none'; const fb = ev.target.nextSibling; if (fb) fb.style.display = 'flex'; },
                  })
                : null,
              h('div', {
                className: 'w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-bold',
                style: e.entregador_foto ? { display: 'none' } : {},
              }, iniciaisDoNome(e.entregador_nome)),
            ),
            h('div', { className: 'min-w-0' },
              h('div', { className: 'text-sm font-semibold text-gray-800 truncate' }, e.entregador_nome || 'Entregador'),
              h('div', { className: 'text-xs text-gray-500 truncate' },
                [fmtTelefoneBR(e.entregador_telefone), e.entregador_placa].filter(Boolean).join(' · ') || 'sem telefone/placa'),
            ),
          ),
          h('div', null,
            h('label', { className: 'text-xs text-gray-600 block mb-1' }, 'Descreva a ocorrencia'),
            h('textarea', {
              value: descricao,
              onChange: (ev) => setDescricao(ev.target.value),
              placeholder: 'O que aconteceu? (ex: nao compareceu na coleta, sumiu com a mercadoria, ma conduta...)',
              className: 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y min-h-[90px] focus:border-purple-400 focus:outline-none',
            }),
          ),
          h('label', { className: 'flex items-start gap-2 cursor-pointer' },
            h('input', { type: 'checkbox', checked: bloquear, onChange: (ev) => setBloquear(ev.target.checked), className: 'w-4 h-4 mt-0.5' }),
            h('span', { className: 'text-xs text-gray-700 leading-relaxed' },
              h('span', { className: 'font-semibold' }, 'Bloquear este entregador'),
              h('span', { className: 'block text-gray-400' }, 'Se ele aceitar outra corrida nossa, o sistema cancela e reatribui automaticamente.'),
              semContato && h('span', { className: 'block text-red-500 mt-1' }, 'Sem telefone/placa nesta corrida — nao da pra bloquear.'),
            ),
          ),
        ),
        h('div', { className: 'flex justify-end gap-2 px-5 py-4 border-t border-gray-100' },
          h('button', { onClick: onClose, className: 'text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50' }, 'Cancelar'),
          h('button', {
            onClick: enviar, disabled: enviando,
            className: 'text-sm px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5',
          }, enviando ? 'Enviando...' : (bloquear ? '🚫 Reportar e bloquear' : 'Reportar')),
        ),
      ),
    );
  }

  // =========================================================
  // ABA: Entregadores barrados (blacklist)
  // =========================================================
  function TabBarrados({ API_URL, fetchAuth, showToast }) {
    const [dados, setDados] = useState(null); // {bloqueados, metricas}
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');

    const carregar = React.useCallback(async () => {
      setLoading(true);
      try {
        const q = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : '';
        const res = await fetchAuth(`${API_URL}/logistics/bloqueados${q}`);
        const json = await res.json();
        if (res.ok) setDados(json);
        else showToast && showToast(json.error || 'Erro ao carregar', 'error');
      } catch (err) { showToast && showToast('Erro: ' + err.message, 'error'); }
      finally { setLoading(false); }
    }, [API_URL, fetchAuth, busca, showToast]);

    useEffect(() => { carregar(); }, []); // carga inicial

    async function desbloquear(id, nome) {
      if (!window.confirm(`Desbloquear ${nome || 'este entregador'}?`)) return;
      try {
        const res = await fetchAuth(`${API_URL}/logistics/bloqueados/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (res.ok && json.ok) { showToast && showToast('Desbloqueado', 'success'); carregar(); }
        else showToast && showToast(json.error || 'Erro ao desbloquear', 'error');
      } catch (err) { showToast && showToast('Erro: ' + err.message, 'error'); }
    }

    const m = (dados && dados.metricas) || {};
    const lista = (dados && dados.bloqueados) || [];

    return h('div', { className: 'max-w-5xl mx-auto p-4 space-y-4' },
      h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
        h('h2', { className: 'text-2xl font-bold text-gray-800 flex items-center gap-2' }, '🚫 Entregadores barrados'),
        h('div', { className: 'flex gap-2' },
          h('input', {
            value: busca, onChange: (ev) => setBusca(ev.target.value),
            onKeyDown: (ev) => { if (ev.key === 'Enter') carregar(); },
            placeholder: 'Buscar por nome ou telefone',
            className: 'text-sm border border-gray-200 rounded-lg px-3 py-2 w-56 focus:border-purple-400 focus:outline-none',
          }),
          h('button', { onClick: carregar, className: 'text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600' }, '↻'),
        ),
      ),
      h('div', { className: 'grid grid-cols-3 gap-3' },
        [
          { l: 'Bloqueados ativos', v: m.bloqueados_ativos || 0, c: 'text-gray-800' },
          { l: 'Reatribuicoes (7 dias)', v: m.reatribuicoes_7d || 0, c: 'text-amber-600' },
          { l: 'Cancelamentos hoje', v: m.cancelamentos_hoje || 0, c: 'text-gray-800' },
        ].map((k, i) => h('div', { key: i, className: 'bg-gray-50 rounded-lg px-4 py-3' },
          h('div', { className: 'text-xs text-gray-500' }, k.l),
          h('div', { className: `text-2xl font-bold ${k.c}` }, String(k.v)),
        )),
      ),
      loading
        ? h('div', { className: 'py-16 text-center' }, h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto' }))
        : lista.length === 0
          ? h('div', { className: 'bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400' }, 'Nenhum entregador bloqueado')
          : h('div', { className: 'bg-white rounded-xl border border-gray-200 overflow-hidden' },
              h('div', { className: 'grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide' },
                h('div', { className: 'col-span-3' }, 'Entregador'),
                h('div', { className: 'col-span-3' }, 'Contato / placa'),
                h('div', { className: 'col-span-3' }, 'Motivo'),
                h('div', { className: 'col-span-2' }, 'Bloqueado em'),
                h('div', { className: 'col-span-1' }, ''),
              ),
              lista.map((b) => h('div', { key: b.id, className: 'grid grid-cols-12 gap-2 px-4 py-3 border-t border-gray-100 text-sm items-center' },
                h('div', { className: 'col-span-3 flex items-center gap-2 min-w-0' },
                  h('div', { className: 'relative flex-shrink-0' },
                    b.foto
                      ? h('img', {
                          src: b.foto, alt: b.nome || 'Entregador',
                          className: 'w-8 h-8 rounded-full object-cover',
                          onError: (ev) => { ev.target.style.display = 'none'; const fb = ev.target.nextSibling; if (fb) fb.style.display = 'flex'; },
                        })
                      : null,
                    h('div', {
                      className: 'w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-[11px] font-bold',
                      style: b.foto ? { display: 'none' } : {},
                    }, iniciaisDoNome(b.nome)),
                  ),
                  h('span', { className: 'font-semibold text-gray-800 truncate' }, b.nome || 'Entregador'),
                ),
                h('div', { className: 'col-span-3 text-xs text-gray-500' },
                  fmtTelefoneBR(b.telefone_norm) || 'sem telefone',
                  h('br'),
                  [b.placa_norm, b.provider_code].filter(Boolean).join(' · '),
                ),
                h('div', { className: 'col-span-3 text-xs text-gray-500 break-words' }, b.motivo || '—'),
                h('div', { className: 'col-span-2 text-xs text-gray-500' },
                  fmtDT(b.criado_em), h('br'), `por ${b.bloqueado_por || '—'}`),
                h('div', { className: 'col-span-1' },
                  h('button', { onClick: () => desbloquear(b.id, b.nome), className: 'text-[11px] px-2.5 py-1 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50' }, 'Desbloquear'),
                ),
              )),
            ),
      h('div', { className: 'text-xs text-gray-400 flex items-center gap-1.5' }, 'ℹ️ Bloqueio do nosso lado (a 99/Uber tem os protocolos deles). Casamos por telefone e placa.'),
    );
  }

  // =========================================================
  // ABA: Motoboys frequentes (> 3 pedidos)
  // =========================================================
  function TabFrequentes({ API_URL, fetchAuth, showToast }) {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busca, setBusca] = useState('');

    const carregar = React.useCallback(async () => {
      setLoading(true);
      try {
        const q = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : '';
        const res = await fetchAuth(`${API_URL}/logistics/frequentes${q}`);
        const json = await res.json();
        if (res.ok) setDados(json);
        else showToast && showToast(json.error || 'Erro ao carregar', 'error');
      } catch (err) { showToast && showToast('Erro: ' + err.message, 'error'); }
      finally { setLoading(false); }
    }, [API_URL, fetchAuth, busca, showToast]);

    useEffect(() => { carregar(); }, []);

    const m = (dados && dados.metricas) || {};
    const lista = (dados && dados.frequentes) || [];

    function fmtUltimo(ts) {
      if (!ts) return '—';
      const d = new Date(ts); const hoje = new Date();
      const diff = Math.floor((hoje - d) / 86400000);
      if (diff <= 0) return 'hoje';
      if (diff === 1) return 'ontem';
      return `${diff} dias`;
    }

    return h('div', { className: 'max-w-5xl mx-auto p-4 space-y-4' },
      h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
        h('h2', { className: 'text-2xl font-bold text-gray-800 flex items-center gap-2' }, '👑 Motoboys frequentes'),
        h('div', { className: 'flex gap-2' },
          h('input', {
            value: busca, onChange: (ev) => setBusca(ev.target.value),
            onKeyDown: (ev) => { if (ev.key === 'Enter') carregar(); },
            placeholder: 'Buscar por nome',
            className: 'text-sm border border-gray-200 rounded-lg px-3 py-2 w-52 focus:border-purple-400 focus:outline-none',
          }),
          h('button', { onClick: carregar, className: 'text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600' }, '↻'),
        ),
      ),
      h('div', { className: 'grid grid-cols-3 gap-3' },
        [
          { l: 'Parceiros frequentes', v: m.parceiros || 0, c: 'text-amber-600' },
          { l: `Pedidos (${m.dias || 30} dias)`, v: m.pedidos_periodo || 0, c: 'text-gray-800' },
          { l: 'Top parceiro', v: m.top_parceiro || 0, c: 'text-gray-800' },
        ].map((k, i) => h('div', { key: i, className: 'bg-gray-50 rounded-lg px-4 py-3' },
          h('div', { className: 'text-xs text-gray-500' }, k.l),
          h('div', { className: `text-2xl font-bold ${k.c}` }, String(k.v)),
        )),
      ),
      h('div', { className: 'text-xs text-gray-400' }, 'Regra: entregador com mais de 3 pedidos concluidos. Ordenado por volume.'),
      loading
        ? h('div', { className: 'py-16 text-center' }, h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto' }))
        : lista.length === 0
          ? h('div', { className: 'bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400' }, 'Nenhum motoboy frequente ainda')
          : h('div', { className: 'bg-white rounded-xl border border-gray-200 overflow-hidden' },
              h('div', { className: 'grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide' },
                h('div', { className: 'col-span-1' }, '#'),
                h('div', { className: 'col-span-4' }, 'Entregador'),
                h('div', { className: 'col-span-3' }, 'Contato / placa'),
                h('div', { className: 'col-span-2' }, 'Pedidos'),
                h('div', { className: 'col-span-2' }, 'Ultimo'),
              ),
              lista.map((f, i) => {
                const top = i === 0;
                return h('div', { key: (f.telefone || '') + i, className: `grid grid-cols-12 gap-2 px-4 py-3 border-t border-gray-100 text-sm items-center ${top ? 'bg-amber-50' : ''}` },
                  h('div', { className: `col-span-1 font-bold ${top ? 'text-amber-600' : 'text-gray-400'}` }, String(i + 1)),
                  h('div', { className: 'col-span-4 flex items-center gap-2 min-w-0' },
                    h('div', { className: 'relative flex-shrink-0' },
                    f.foto
                      ? h('img', {
                          src: f.foto,
                          alt: f.nome || 'Entregador',
                          className: `w-8 h-8 rounded-full object-cover ${top ? 'ring-2 ring-amber-300' : ''}`,
                          onError: (ev) => { ev.target.style.display = 'none'; const fb = ev.target.nextSibling; if (fb) fb.style.display = 'flex'; },
                        })
                      : null,
                    h('div', {
                      className: `w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${top ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-700'}`,
                      style: f.foto ? { display: 'none' } : {},
                    }, iniciaisDoNome(f.nome)),
                    top && h('span', { className: 'absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-100 border border-white flex items-center justify-center text-[9px]', title: 'Top parceiro' }, '👑'),
                  ),
                    h('span', { className: `font-semibold truncate ${top ? 'text-amber-700' : 'text-gray-800'}` }, f.nome || 'Entregador'),
                  ),
                  h('div', { className: 'col-span-3 text-xs text-gray-500' },
                    fmtTelefoneBR(f.telefone) || '—', h('br'),
                    [f.placa, f.provider].filter(Boolean).join(' · ')),
                  h('div', { className: 'col-span-2' }, h('span', { className: `font-bold ${top ? 'text-amber-700' : 'text-gray-800'}` }, String(f.pedidos))),
                  h('div', { className: 'col-span-2 text-xs text-gray-500' }, fmtUltimo(f.ultimo)),
                );
              }),
            ),
      h('div', { className: 'text-xs text-gray-400' }, 'ℹ️ Contagem por telefone do entregador (corridas concluidas via Hub).'),
    );
  }

  const ICONE_TUTTS_JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/7QCEUGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAGgcAigAYkZCTUQwYTAwMGFiODAxMDAwMDI2MDMwMDAwOWMwNDAwMDA2YTA1MDAwMDBlMDcwMDAwZjcwODAwMDBhYzBiMDAwMDA1MGMwMDAwZTQwYzAwMDBkNDBkMDAwMGQ0MTAwMDAwAP/bAIQABQYGCwgLCwsLCw0LCwsNDg4NDQ4ODw0ODg4NDxAQEBEREBAQEA8TEhMPEBETFBQTERMWFhYTFhUVFhkWGRYWEgEFBQUKBwoICQkICwgKCAsKCgkJCgoMCQoJCgkMDQsKCwsKCw0MCwsICwsMDAwNDQwMDQoLCg0MDQ0MExQTExOc/8IAEQgAlgCWAwEiAAIRAQMRAf/EAIMAAQABBQEBAAAAAAAAAAAAAAAHAgMEBQYBCBAAAQMBBQMIBAwGAwAAAAAAAQACAxEEBRIhMSJBURATIGFxgZGxMDJS4QYUFSNAYGJyodHw8TOCkrLB0kJDwhEBAAEDAgUDBAMBAAAAAAAAAREAITFBUWFxgZGhsdHwECDB4TBAYPH/2gAMAwEAAgADAAAAAY7HRbgAAAAAAABIkdyIR2AAAAAAAABIkdyIR2AdrRTxS/VV7jFfvtC/V55jOy46nzx0eK80xsaqtcycYSJHcie+x2DsZsiXd6zB1soQFMnnkAd3wEyZeTRvI+lXCxbUL6zYZV+fOH3fz/j2pjzNpRbo18Id7wOflJEjuRMm/HYJnxeT6rW4fPShAcmVe6GYIf29FPIT78xSncq4Hq9fp71yW4ckrhLVGy2mdepp6P5/2+oyLyRI7kTIvR2Do/eb22iysLGkX3X3I5dxYzrXHOvu1U8W73g8ujwy8+i50mJt+O2Os5PfaHe4qRI7kTb48dgA93miY1XfbeKpG4jP2XtLmMmjRdBq9jRcp5nQ9Fj7PCsOswqqS/SkSO5E9R2AAB1/IMG51eDolj3JxjZWgrAAJEjuRCOwAAAAAAAAJEjuRCO0iCO0iCO0iCO0iCO0iCO0iCO0iCO0iCO0iCO5ED//2gAIAQEAAQUC+sVhuszB0bmoROPIBVOjc1RxukdbLtMDSKKw2F1pNqsxiem2WVyfE5nRuuzRzPllZC29rYydopExzsRuOOst+ybF2WaONktvhjLMFpna1sLbwvGJ0N1Xe0NlvqJjn3tA6PoXFHWS/pNm74+cnvSTBArijpHfclZrFHzcNpk5yS7o8c96yYIFd9qZLHNdcEpt908w3oXEykV7WKWd9zClot9l+MRx3JMTDCIWTfP2mQEtnsUsAuJlZL2s0k7DZZBJNc80asItgfesoZB0LDeLrKnX+1Nnc17L+FLRfUkiN/5NcWmO/hS8Lz+MixWx1md8vtUlveZo7+T7+arVa32g9BkzZE+xJ0Tm+ihjDyLExTxMjZ0YbSWKOZsidCxyNiYviAXyeF8ntXxOMcrIXPTLEo5muNsfV3TjtjmplrY5DlcKgWFgTYWNUszY1NaDIo3lhJr6Kztws5ZLSxiktrj6b4+1G8E63PKdK531V//aAAgBAwABPwH6K5wbmVXkqmuDtFjFaVzVehKMTwK+5StpgYP1VTmjT4J+TG9abFgBNc6KCLFtHcUSMRx1ULW54TryuY8PJAqpY3VDgpGSOpXwU0ZOGmdEQ5zDXIqEPFRTs7UcZyLAetQx4Bysla7KQfzjXv4o2OubH1H63hGyvHDxXxZ/D8VJEWUrvQFdM1BCB/EaATpXU9ytJGIgAADLLoMeW6GigmL6g7t/I9rdXU70+1BuTB36BF5JxVz49JkpZWm9Gd5/5f4RNfpP/9oACAECAAE/Afor3hgqVXr5Kpjw7MLnBXDXNE06lXlnbjlDa+7ep46GOMfrEVanYWHryUmzEzP1s6cf1kmQCJrjU1w59XYrLBj2iTkfFFwL3c7Xq6vcrM1oBLDWvHdyuY8PL2jFXQ7qFWiJ+IPbnp3EKWOWSlR3DcrTC44MIrhFEQ98ZBFHHcrMJGgtwgDOleP5ImUihjDutWaLm20OpzPLaLDNBV9jfh3mzuzjP3K+r2ZDrTfhMYzgtFmLHDXD/q7/AGTPhLZTq5ze1h/81R+EdkH/AGE/yO/yFd96R23nObDqR0qXACuKumZ4KSRsYq9wYOLjQfir1vGSQudZJ5HMYPnMLaMZuyfkTX9irkjeIGule57pdvaJdQH1Rn1Z9/QtNjitApLGH9uo7DqO5X7c8Vja18bnbbqYDnuqSDrllx115LDNaRWOzl+1qIxn4jMKyfB2WYh9rkP3cWN57XZgd1VHZI42c02MBhFC3jXWvGvXmgKZcOjbbuiteDnWl2CtKOI1pXTsUdyWVmkDT96r/wC4kJkbWCjWho4AUHgPpP8A/9oACAEBAAY/AvrFjfVrKZU1d2LNpHaKL1XeB5Ms1m0jtFEGtFSVHTE9zq4qDIcnBg1d+t6eAHYWnUjkyjef5Stppb2inR2zpoz2vcquOFqYyN2Laz8h5rqY3+0Injn4ou9lvmmM9p1fD91iYcZdq/j7kWueARuzRL3YWucT+OQVBstaE9rH1c7Lf3/ghK8Vc7MdQ/NFtHOpvFKeacdfsOGvRc72W+f7KNnE18P3UY66/wBOak6xTx5HO9p3kgPYb55qNv2R+Ke7i4qMddf6c0/r2fH3cjACMTWgFu/JVw0J3tNPcsbHYmjUHUdFzvad5JpYMQDaagZ1VDrhd45IsBodR3LawtHGtUGN0CP2pKd1aIga0NFV7aCtNQU93st8z7k0Mzo6pHcuaw7fDtWzt/d1TRt4K549Kd6f9rZHf0S0txN1poQVlGe8hc43J1arajNeo5LY+bHifFfws/ve5AjUZrbjNeooNDMIBrqsQzB1C/hu8QuebsnhrktuP+k/mtmM16yB+aq/uG4dHDJr7S2T4rMeioXUW8o5Z7ulTULI9yzaFvHevWK9Y+C9YrSvfy5BbZ8PzWEblT2fP0Ge15rWnb0COK3lZNCz8FwHBVCr6JvZ59DWvZmtnZ8/TeqVk38VuCzcT9Vf/9oACAEBAQE/If8ARJ7xblG7TjrpvQEl8T1FDSMOEY9Po7gKdAl7FXArdPUU6bGD5jdrfQQMUQEE665pEiQmRs1Z95+o39GtSFdBmDWYjr9CZJ3IPSvP9er7Yqc3XsCVXENteWYRggnTgWq/uygOY1A1VEZ+h+ikRy1c1NbfP3ceg1FKyLkfegcWgIsbhNwOnesvMoKJvobULm7IZZsNlIu4qOgtyAuvu0OIgAMFNRxUTi2W5pW3ZnTSixOohcMxIWsmIbxOCLibulLLtyx9mx8HV+yqPeb5GPWm0RPy/RUu1I9cek/TlGdD7rW3I97niK4ISc7ny1xXpym3itrifkPyCuIyDrh9X0vMQCxEY2tZpw1fKJLrHspUZgCw6yWTex9u6SnQh6rR39kCRcpm1TVkBHAy8TSGEojid3OomtXc9A/MUUkHBu7rxW9LhjPQPgqyKi2DFqMT6ByInRdq5aBz9qgFyuAJJBm1poQrqFw4TkkiLtJyA7qB0Ye00rgwZuPumMRUjZMG77CX7b6g5Nwid9moF+8EeJqZkDO11k5XivDDeqE81ahyGXsg6HWpEEIWcJqoUMB4jM96hOIpQ9G55rU8GyVhNCNagaEh7Sc9EqzrbWO/6pWQ8GjAiGcz0o4uzuEdvc1DueCPEql9jDbke7f7C1FgmzDu6PinzNwse+KzOcdO+P4uVltn8UDL1o9CngMrKVZeu33Xdy3JyaI1tVntWUHGIfFLx0PdNOn2Br/lPejUXsUXaobr8RT9MlvHB3aMv0fyoquxzo6W1qOOMub9feMXLNWa1xt3e9b07WecUhuMnD634iCScazD1o9Kwo4xL5oC++gy9Ks3RfneheY3xTJWVl6/xRPm9X2ZCba57eatIhvn2FKt266/ygAFniV+x9hWC6JPrXrcW7Y/yv8A/9oADAMBAQIBAwEAABAIIIIIIIIIIIIIIIIIIIIIIwgoYUYsII2laGGpDkIRbpJ30REsJDacgwMDyIIIIEFRT1GIIIIJBGMIIIIIIIIIIIIIIIIIIIIIIIL/2gAIAQMBAT8Q/qmSQetQ3O/0hEzbehJUl/Fq4CXT5rSDKHO1DOL/AFu6i35MUK5jurmaB85VZ5iapv8ALUU8le7a2oLx0OMXvSujBp+qIJEWunD68BKnH4phMwHRPxVhDkS3OrcwMRQABdPk5oFCAKn4t0qFsDD3qwOVl+uRe2D8ONEICYn4eK0RcvdFcAdHvVxDKwzjpxp3AVsEtFgsZp5mBHwp2khAlM4426fYvLeh5mGnwFkwt4pKscLDQaH0dg18VPjcjZGI2pZ+29MWTYcc61x0j0Ulyq7t/wCz/9oACAECAQE/EP6s4YPK7HGo5hHP6RiZINZtQssl/DGNqu4IEpt++FDknMxQG4zy+tyUW/JHSiqZ0GHX9TVh1FULxR+Roov1xXvXbBUPAH1A0/hCaUZ8B0q3b5L1jRoEKoFQAf8ABfRXyWnOt0D6lsd8QDdnAFN9VND47dU12E2U4zhj8YUhD2KOBYlpTIaUoLck70CpiL9tQwynPVgpPhM3MMk2ic32IFPRHYY6wrYGmkJWDCxDKiKgbzFiSWFCA5hX/ALgqHq8qSo5BsbNxDLcoAAgEAYAwcvtsKLXiMkThyq/qcXi8BUA3wYuwf2f/9oACAEBAQE/EP8ARQKRYrRRAOezbQOQLCNO0gTRa+ZCHBINJFmyaUMxSc3IFaHkJiDTtIE04E485XAMpYM1+yAeyUvoTBSBmQBBNEbjUJncsseuGmMtArLXzfWEx21fSZc4UXJspOPhtYH2zFsBuWAWOZzqoyK6hhNgAvQKADhRjqI7CtE3Pl2p5ibAvLUl6Bywq4udkP0e1DZHMwQ7E82aQFXvCDcmVcIzwOs2gCTvi1h5Gu6l3LQudqMoslB9RhZPMVuyI3TlYCwMYIOscqndsp1wXTAsKmGCSsYJcHA0+ycjD15Bj6Mb46VbWQ8gfWKuJHSKfn9EvZj9PX2pHrtDoUu5b1yr1SddZ4yrcT1UKDLo6aNC3oYyBwF8ZVwetKrR1QjLKsDj4gYjeLcGeX2H+IAyjYgkSLwaRkbUISH9gx7KXjA8vsQvAUnTNCJY2Bw13mpnnEZG/EBXOobPbBUSGjj1LOkYrV8NRNqlxUbOj8lqd6ImTIsiCy5hNO2BW0B4gGhRQwhvJz+7oVIeDH3h4UAs51P4m32BNC392LoUGIE9Br5TRYOsDky4WcRCRqVDx4Xkp4VC1afNhcUChMgjIaI5jRNMV1MyMoiUIZLb2eRNCcMM2RYAHM0rkjiE0kXSMMOtqfiLdVBHEOgNoLBfsqHN5QXaSo3D6gQmWJlq3ML3dZF9iUIwlxNErTQms5Hcyo9ifkG7sVi34J7E+X8T2RtGF+0tj6152DQtQyzcC+gL90PzG9i5NqyQ4AeermSVlW2eVBr82g8KLw+ftqKKF8AfiaNRQV0gS0IVixNuWn0xTbj0QrRIXbR1Pwdaf1gxoS7ci19anVY9S9oHf73YiGEYTkl6jAN/0DPR1qFHg30J8ihQCYUI8ktRU0LqCuQhEnGvLST4T5rOZu8qTXlCH4hxYK8/7PP/AMVCPftchIR4UrsqTdUv8WkrB817/pNLUsAPzCzrSd+BN/QOtOqNwplea3/lsYQMOCPpOYD1l3b6VjQ2V4I8P8r/AP/Z';

  function TabRelatorio({ API_URL, fetchAuth, showToast }) {
    const [rows, setRows] = useState([]);
    const [totais, setTotais] = useState(null);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState('30d');
    const [provider, setProvider] = useState('');
    const [statusF, setStatusF] = useState('');

    const hojeBRT   = () => dataLocalBRT(new Date());
    const diasAtras = (nd) => dataLocalBRT(new Date(Date.now() - nd * 86400000));
    const [deCustom, setDeCustom]   = useState(diasAtras(29));
    const [ateCustom, setAteCustom] = useState(hojeBRT());

    const range = periodo === 'custom' ? { de: deCustom, ate: ateCustom }
      : periodo === '1d'  ? { de: hojeBRT(),    ate: hojeBRT() }
      : periodo === '7d'  ? { de: diasAtras(6),  ate: hojeBRT() }
      :                     { de: diasAtras(29), ate: hojeBRT() };
    const de = range.de, ate = range.ate;

    const qs = () => `de=${de}&ate=${ate}${provider ? '&provider=' + provider : ''}${statusF ? '&status=' + encodeURIComponent(statusF) : ''}`;

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/admin/relatorio/hub-corridas?${qs()}`);
        const json = await res.json();
        if (json.success) { setRows(json.corridas || []); setTotais(json.totais || null); }
        else showToast(json.error || 'Erro ao carregar relatório', 'error');
      } catch { showToast('Erro de rede no relatório', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL, de, ate, provider, statusF]);

    useEffect(() => { carregar(); }, [carregar]);

    const baixarCSV = async () => {
      try {
        const res = await fetchAuth(`${API_URL}/admin/relatorio/hub-corridas?${qs()}&formato=csv`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'relatorio-hub.csv'; a.click();
        URL.revokeObjectURL(url);
      } catch { showToast('Erro ao exportar CSV', 'error'); }
    };

    const brl = (n) => n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const km  = (n) => n == null ? '—' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const hubSvg = () => h('svg', { viewBox: '0 0 64 64', style: { width: '100%', height: '100%', padding: '3px' } },
      h('circle', { cx: 18, cy: 42, r: 4, fill: '#f67602' }),
      h('path', { d: 'M18 42 Q30 21 46 18', stroke: '#f67602', strokeWidth: 4, fill: 'none', strokeLinecap: 'round' }),
      h('path', { d: 'M46 18 l-7 -1 l3 7 z', fill: '#f67602' }),
      h('path', { d: 'M18 42 Q31 37 45 34', stroke: '#f67602', strokeWidth: 3.5, fill: 'none', strokeLinecap: 'round' }),
      h('path', { d: 'M45 34 l-6 -2 l2 6 z', fill: '#f67602' }),
      h('path', { d: 'M18 42 Q27 50 42 50', stroke: '#f67602', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }),
      h('path', { d: 'M42 50 l-6 -2 l0 6 z', fill: '#f67602' }),
    );
    const iconeCanal = (canal) => canal === 'tutts'
      ? h('span', { title: 'Tutts', style: { width: '20px', height: '20px', background: '#7c3aed', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 } },
          h('img', { src: ICONE_TUTTS_JPG, style: { width: '100%', height: '100%', objectFit: 'contain', padding: '2px' } }))
      : h('span', { title: 'Hub', style: { width: '20px', height: '20px', background: '#fff', border: '1px solid #f0e0d0', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 } }, hubSvg());
    const statusBadge = (s) => {
      const cor = { 'Entregue': 'bg-green-100 text-green-700', 'Cancelado': 'bg-gray-100 text-gray-500', 'Não entregue': 'bg-orange-100 text-orange-700', 'Em rota': 'bg-blue-100 text-blue-700', 'Pendente': 'bg-gray-100 text-gray-600', 'Devolvido': 'bg-amber-100 text-amber-700' }[s] || 'bg-gray-100 text-gray-600';
      return h('span', { className: `px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${cor}` }, s || '—');
    };
    const trajeto = (r) => h('div', null,
      h('div', { className: 'flex items-start gap-1.5' }, h('span', { className: 'text-purple-500 leading-4' }, '●'), h('span', { className: 'text-gray-600' }, r.endereco_coleta || '—')),
      h('div', { className: 'flex items-start gap-1.5 mt-1' }, h('span', { className: 'text-orange-500 leading-4' }, '▼'), h('span', { className: 'text-gray-700' }, r.endereco_entrega || '—')),
    );

    const pills = [['1d', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'], ['custom', 'Período']];

    return h('div', { className: 'max-w-7xl mx-auto p-4 space-y-4' },
      h('div', { className: 'flex items-center justify-between flex-wrap gap-3' },
        h('div', null,
          h('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Relatório de corridas'),
          h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'OS, endereços, motoboy, km e valor (valor pela tabela do cliente)'),
        ),
        h('div', { className: 'flex items-center gap-2 flex-wrap' },
          h('div', { className: 'inline-flex bg-gray-100 rounded-lg p-0.5' },
            pills.map(([p, lbl]) => h('button', { key: p, onClick: () => setPeriodo(p),
              className: `px-3 py-1.5 text-xs font-semibold rounded-md ${periodo === p ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}` }, lbl)),
          ),
          periodo === 'custom' && h('div', { className: 'flex items-center gap-1' },
            h('input', { type: 'date', value: deCustom, onChange: e => setDeCustom(e.target.value), className: 'px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700' }),
            h('span', { className: 'text-gray-400 text-xs' }, 'até'),
            h('input', { type: 'date', value: ateCustom, onChange: e => setAteCustom(e.target.value), className: 'px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700' }),
          ),
          h('select', { value: provider, onChange: e => setProvider(e.target.value), className: 'px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700' },
            h('option', { value: '' }, 'Todos'),
            h('option', { value: '99' }, '99'),
            h('option', { value: 'uber' }, 'Uber'),
          ),
          h('select', { value: statusF, onChange: e => setStatusF(e.target.value), className: 'px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700' },
            h('option', { value: '' }, 'Status: todos'),
            h('option', { value: 'Entregue' }, 'Entregue'),
            h('option', { value: 'Cancelado' }, 'Cancelado'),
            h('option', { value: 'Não entregue' }, 'Não entregue'),
            h('option', { value: 'Em rota' }, 'Em rota'),
            h('option', { value: 'Pendente' }, 'Pendente'),
            h('option', { value: 'Devolvido' }, 'Devolvido'),
          ),
          h('button', { onClick: carregar, className: 'px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700' }, '⟳'),
          h('button', { onClick: baixarCSV, className: 'px-3 py-1.5 bg-white border border-purple-300 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-50' }, '⬇ CSV'),
        ),
      ),

      totais && h('div', { className: 'grid grid-cols-3 gap-3' },
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3' },
          h('div', { className: 'text-[11px] text-gray-400' }, 'Corridas'),
          h('div', { className: 'text-2xl font-bold text-gray-800' }, totais.corridas),
        ),
        h('div', { className: 'bg-white rounded-xl border border-gray-200 p-3' },
          h('div', { className: 'text-[11px] text-gray-400' }, 'KM total'),
          h('div', { className: 'text-2xl font-bold text-gray-800' }, km(totais.km)),
        ),
        h('div', { className: 'bg-purple-50 rounded-xl border border-purple-200 p-3' },
          h('div', { className: 'text-[11px] text-purple-500' }, 'Valor total'),
          h('div', { className: 'text-2xl font-bold text-purple-700' }, 'R$ ' + brl(totais.valor)),
        ),
      ),

      loading
        ? h('div', { className: 'flex items-center justify-center py-16' },
            h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full' }))
        : h('div', { className: 'bg-white rounded-xl border border-gray-200 overflow-hidden' },
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'w-full text-xs' },
                h('thead', null,
                  h('tr', { className: 'bg-gray-50 text-left text-gray-500' },
                    ['OS', 'Cliente', 'Coleta / Entrega', 'Motoboy', 'Status', 'KM', 'Valor'].map((c, idx) =>
                      h('th', { key: c, className: `px-3 py-2 font-semibold ${idx >= 5 ? 'text-right' : ''}` }, c)),
                  ),
                ),
                h('tbody', null,
                  rows.length === 0
                    ? h('tr', null, h('td', { colSpan: 7, className: 'px-3 py-8 text-center text-gray-400' }, 'Nenhuma corrida no período'))
                    : rows.map((r, i) => h('tr', { key: r.os + '-' + i, className: 'border-t border-gray-100 hover:bg-gray-50 align-top' },
                        h('td', { className: 'px-3 py-2 font-semibold text-gray-700' }, r.os),
                        h('td', { className: 'px-3 py-2 text-gray-600 max-w-[130px] truncate' }, r.cliente_nome || '—'),
                        h('td', { className: 'px-3 py-2 min-w-[200px]' }, trajeto(r)),
                        h('td', { className: 'px-3 py-2' },
                          h('span', { className: 'inline-flex items-center gap-1.5' }, iconeCanal(r.canal), r.motoboy || '—')),
                        h('td', { className: 'px-3 py-2' }, statusBadge(r.status)),
                        h('td', { className: 'px-3 py-2 text-right whitespace-nowrap' }, km(r.km)),
                        h('td', { className: 'px-3 py-2 text-right font-semibold text-gray-800 whitespace-nowrap' }, brl(r.valor)),
                      )),
                ),
              ),
            ),
          ),
    );
  }

  function ModuloLogistica(props) {
    const { HeaderCompacto, usuario, Ee, socialProfile, isLoading, lastUpdate, onRefresh, onLogout, navegarSidebar, estado, setEstado } = props;

    // Aba ativa controlada pelo OverflowNav do app.js (via estado.logisticaTab)
    const aba = (estado && estado.logisticaTab) || 'dashboard';

    const abas = {
      dashboard: TabDashboard,
      tracking:  TabTracking,
      chat:      window.Chat99Panel || (() => h('div', { className: 'max-w-3xl mx-auto p-6 text-center text-red-700 bg-red-50 border border-red-200 rounded-lg' }, '\u26a0\ufe0f chat99-panel.js nao carregou. Verifique o index.html.')),
      entregas:  TabEntregas,
      regras:    TabRegras,
      relatorio: TabRelatorio,
      barrados:   TabBarrados,
      frequentes: TabFrequentes,
      // 🆕 2026-05 Hub logístico — painel de provedores (modulo-logistica-providers.js).
      // Componente externo (window global) — fallback se o script não carregou.
      provedores: window.ModuloLogisticaProviders || (() => h('div', {
        className: 'max-w-3xl mx-auto p-6 text-center text-red-700 bg-red-50 border border-red-200 rounded-lg'
      }, '⚠️ modulo-logistica-providers.js não foi carregado. Verifique o index.html.')),
    };
    const Atual = abas[aba] || TabDashboard;

    return h('div', { className: 'min-h-screen bg-gray-50' },
      // Header com a barra de navegação igual aos outros módulos
      HeaderCompacto && h(HeaderCompacto, {
        usuario: usuario,
        moduloAtivo: Ee,
        abaAtiva: aba,
        socialProfile: socialProfile,
        isLoading: isLoading,
        lastUpdate: lastUpdate,
        onRefresh: onRefresh,
        onLogout: onLogout,
        onGoHome: () => props.he && props.he('home'),
        onNavigate: navegarSidebar,
        onChangeTab: (abaId) => setEstado(e => ({ ...e, logisticaTab: abaId })),
      }),
      // Conteúdo da aba ativa
      h(Atual, props)
    );
  }

  // Expor globalmente para o app.js carregar (padrão dos outros módulos)
  window.ModuloLogisticaComponent = ModuloLogistica;
})();
