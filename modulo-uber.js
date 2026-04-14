// ==================== MÓDULO UBER DIRECT ====================
// Arquivo: modulo-uber.js
// Admin: Dashboard, Tracking em tempo real, Entregas, Configuração
// Integração Mapp <-> Uber Direct via Central Tutts
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

  const STATUS_LABELS = {
    aguardando_cotacao:    { label: 'Aguardando cotação',  cor: 'bg-gray-100 text-gray-700' },
    cotacao_recebida:      { label: 'Cotação OK',           cor: 'bg-blue-100 text-blue-700' },
    enviado_uber:          { label: 'Enviado p/ Uber',      cor: 'bg-purple-100 text-purple-700' },
    entregador_atribuido:  { label: 'Entregador atribuído', cor: 'bg-indigo-100 text-indigo-700' },
    pickup:                { label: 'A caminho da coleta',  cor: 'bg-amber-100 text-amber-700' },
    pickup_complete:       { label: 'Coletou',              cor: 'bg-amber-200 text-amber-800' },
    dropoff:               { label: 'A caminho da entrega', cor: 'bg-orange-100 text-orange-700' },
    delivered:             { label: 'Entregue',             cor: 'bg-green-100 text-green-700' },
    canceled:              { label: 'Cancelado',            cor: 'bg-red-100 text-red-700' },
    cancelado:             { label: 'Cancelado',            cor: 'bg-red-100 text-red-700' },
    fallback_fila:         { label: 'Fallback p/ fila',     cor: 'bg-yellow-100 text-yellow-800' },
    erro:                  { label: 'Erro',                 cor: 'bg-red-200 text-red-900' },
  };

  function Badge({ status }) {
    const s = STATUS_LABELS[status] || { label: status, cor: 'bg-gray-100 text-gray-700' };
    return h('span', { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cor}` }, s.label);
  }

  // ════════════════════════════════════════════════════════
  // ABA 1: DASHBOARD - métricas
  // ════════════════════════════════════════════════════════
  function TabDashboard({ API_URL, fetchAuth, showToast }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/uber/metricas`);
        const json = await res.json();
        setData(json.metricas || {});
      } catch { showToast('Erro ao carregar métricas', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar(); }, []);

    if (loading || !data) return h('div', { className: 'flex items-center justify-center py-16' },
      h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full' })
    );

    const kpis = [
      { label: 'Total entregas', value: data.total || 0, icon: '📦', bg: 'bg-purple-50', tc: 'text-purple-600' },
      { label: 'Entregues', value: data.entregues || 0, icon: '✅', bg: 'bg-green-50', tc: 'text-green-600' },
      { label: 'Em andamento', value: data.em_andamento || 0, icon: '🛵', bg: 'bg-blue-50', tc: 'text-blue-600' },
      { label: 'Cancelados', value: data.cancelados || 0, icon: '❌', bg: 'bg-red-50', tc: 'text-red-600' },
      { label: 'Fallback p/ fila', value: data.fallback || 0, icon: '↩️', bg: 'bg-yellow-50', tc: 'text-yellow-600' },
      { label: 'Custo total Uber', value: fmtMoney(parseFloat(data.custo_total_uber || 0)), icon: '💰', bg: 'bg-emerald-50', tc: 'text-emerald-600', small: true },
      { label: 'Valor médio', value: fmtMoney(parseFloat(data.valor_medio_uber || 0)), icon: '📊', bg: 'bg-indigo-50', tc: 'text-indigo-600', small: true },
      { label: 'ETA médio', value: `${Math.round(parseFloat(data.eta_medio || 0))} min`, icon: '⏱️', bg: 'bg-pink-50', tc: 'text-pink-600' },
    ];

    return h('div', { className: 'max-w-7xl mx-auto p-4 space-y-6' },
      h('div', { className: 'flex items-center justify-between' },
        h('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Dashboard Uber Direct'),
        h('button', {
          onClick: carregar,
          className: 'px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700'
        }, '🔄 Atualizar')
      ),
      h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
        kpis.map(k => h('div', { key: k.label, className: `${k.bg} rounded-xl border border-gray-100 shadow-sm p-4` },
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('span', { className: 'text-xl' }, k.icon),
            h('span', { className: 'text-xs font-semibold text-gray-500 uppercase' }, k.label)
          ),
          h('p', { className: `${k.small ? 'text-lg' : 'text-3xl'} font-bold ${k.tc}` }, k.value)
        ))
      )
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

    const carregarAtivas = useCallback(async () => {
      try {
        const res = await fetchAuth(`${API_URL}/uber/tracking/ativas`);
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
    }, [selecionada]);

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
                h('div', { className: 'flex items-center justify-between mb-1' },
                  h('span', { className: 'text-sm font-bold' }, `OS ${e.codigo_os}`),
                  h(Badge, { status: e.status_uber })
                ),
                e.entregador_nome && h('p', { className: 'text-xs text-gray-600' }, `🛵 ${e.entregador_nome}`),
                h('p', { className: 'text-xs text-gray-400 truncate' }, e.endereco_entrega)
              ))
        ),
        // Mapa + detalhes
        h('div', { className: 'lg:col-span-2 space-y-3' },
          selecionada ? [
            h('div', { key: 'info', className: 'bg-white rounded-xl border shadow-sm p-4' },
              h('h3', { className: 'font-bold text-gray-800 mb-2' }, `OS ${selecionada.codigo_os}`),
              selecionada.entregador_nome && h('div', { className: 'grid grid-cols-2 gap-2 text-xs text-gray-600' },
                h('div', null, h('strong', null, 'Entregador: '), selecionada.entregador_nome),
                h('div', null, h('strong', null, 'Telefone: '), selecionada.entregador_telefone || '—'),
                h('div', null, h('strong', null, 'Veículo: '), selecionada.entregador_veiculo || '—'),
                h('div', null, h('strong', null, 'Placa: '), selecionada.entregador_placa || '—')
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

  // Card individual de entrega — extraído pra ficar legível
  function CardEntrega({ entrega, onCancelar, onVerTracking, onVerDetalhes }) {
    const e = entrega;

    const valorCliente   = parseFloat(e.valor_servico || 0);
    const valorProfMapp  = parseFloat(e.valor_profissional || 0);
    const valorUber      = parseFloat(e.valor_uber || 0);
    const margem         = valorCliente - valorUber;
    const margemPositiva = margem >= 0;

    const podeCancelar = !['delivered', 'cancelado', 'canceled', 'fallback_fila'].includes(e.status_uber);
    const temEntregador = !!e.entregador_nome;

    const duracao = calcularDuracao(e.created_at, e.finalizado_at);

    function copiarTel() {
      if (!e.entregador_telefone) return;
      navigator.clipboard?.writeText(e.entregador_telefone).then(
        () => showToast('Telefone copiado', 'success'),
        () => showToast('Não foi possível copiar', 'error')
      );
    }

    function ligar() {
      if (!e.entregador_telefone) return;
      window.location.href = `tel:${e.entregador_telefone}`;
    }

    return h('div', {
      className: 'bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 space-y-4',
    },

      // ── Cabeçalho ──
      h('div', { className: 'flex items-center justify-between gap-3 pb-3 border-b border-gray-100' },
        h('div', { className: 'flex items-center gap-3 min-w-0' },
          h('span', { className: 'text-lg md:text-xl font-bold text-gray-800' }, `OS ${e.codigo_os}`),
          h(Badge, { status: e.status_uber }),
        ),
        h('div', { className: 'flex gap-2 flex-shrink-0' },
          onVerTracking && h('button', {
            onClick: () => onVerTracking(e),
            className: 'text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700',
          }, 'Tracking'),
          onVerDetalhes && h('button', {
            onClick: () => onVerDetalhes(e),
            className: 'text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700',
          }, 'Detalhes'),
          podeCancelar && h('button', {
            onClick: () => onCancelar(e.id),
            className: 'text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50',
          }, 'Cancelar'),
        )
      ),

      // ── Endereços lado a lado ──
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
        h('div', null,
          h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' }, '📦 Coleta'),
          h('div', { className: 'text-sm text-gray-800 leading-relaxed break-words' }, e.endereco_coleta || '—')
        ),
        h('div', null,
          h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' }, '📍 Entrega'),
          h('div', { className: 'text-sm text-gray-800 leading-relaxed break-words' }, e.endereco_entrega || '—')
        ),
      ),

      // ── 4 cards de valores: cliente Mapp / prof Mapp / Uber / margem ──
      h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
        h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
          h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Cliente paga'),
          h('div', { className: 'text-base font-semibold text-gray-800' }, fmtMoney(valorCliente))
        ),
        h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
          h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Profissional Mapp'),
          h('div', { className: 'text-base font-semibold text-gray-800' }, fmtMoney(valorProfMapp))
        ),
        h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
          h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Custo Uber'),
          h('div', { className: 'text-base font-semibold text-gray-800' }, fmtMoney(valorUber))
        ),
        h('div', {
          className: `rounded-lg px-3 py-2.5 ${margemPositiva ? 'bg-green-50' : 'bg-red-50'}`,
        },
          h('div', { className: `text-[11px] mb-0.5 ${margemPositiva ? 'text-green-700' : 'text-red-700'}` }, 'Margem'),
          h('div', {
            className: `text-base font-semibold ${margemPositiva ? 'text-green-800' : 'text-red-800'}`,
          }, `${margemPositiva ? '+ ' : '− '}${fmtMoney(Math.abs(margem))}`)
        ),
      ),

      // ── Bloco do entregador ──
      temEntregador
        ? h('div', { className: 'flex items-center gap-3 p-3 bg-gray-50 rounded-lg' },
            // Avatar
            h('div', {
              className: 'w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center font-semibold text-sm text-purple-700 flex-shrink-0',
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
            'Aguardando atribuição de entregador...'
          ),

      // ── Rodapé com timestamps ──
      h('div', { className: 'flex items-center justify-between gap-2 pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex-wrap' },
        h('span', null,
          'Despachada ', fmtDT(e.created_at),
          e.finalizado_at ? ` · Finalizada ${fmtDT(e.finalizado_at)}` : '',
          duracao ? ` · Duração ${duracao}` : '',
        ),
        e.uber_delivery_id && h('span', { className: 'font-mono' }, truncMeio(e.uber_delivery_id, 12, 4))
      ),
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA: ENTREGAS — listagem em cards
  // ════════════════════════════════════════════════════════
  function TabEntregas({ API_URL, fetchAuth, showToast }) {
    const [entregas, setEntregas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('');
    const [busca, setBusca] = useState('');
    const [filtroMargem, setFiltroMargem] = useState('todas'); // todas | positiva | negativa
    const [ordenacao, setOrdenacao] = useState('recente');     // recente | antiga | margem_maior | margem_menor

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const url = `${API_URL}/uber/entregas${filtroStatus ? `?status=${filtroStatus}` : ''}`;
        const res = await fetchAuth(url);
        const json = await res.json();
        setEntregas(json.entregas || []);
      } catch { showToast('Erro ao carregar entregas', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL, filtroStatus]);

    useEffect(() => { carregar(); }, [carregar]);

    async function despacharOS() {
      const codigoOS = prompt('Código da OS para despachar para o Uber:');
      if (!codigoOS) return;
      try {
        const res = await fetchAuth(`${API_URL}/uber/entregas/despachar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigoOS: parseInt(codigoOS) })
        });
        const json = await res.json();
        if (json.success) { showToast('OS despachada com sucesso!', 'success'); carregar(); }
        else showToast(json.error || 'Erro ao despachar', 'error');
      } catch { showToast('Erro ao despachar', 'error'); }
    }

    async function cancelarEntrega(id) {
      if (!confirm('Cancelar entrega no Uber e reabrir na Mapp?')) return;
      try {
        const res = await fetchAuth(`${API_URL}/uber/entregas/${id}/cancelar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo: 'Cancelamento manual' })
        });
        if (res.ok) { showToast('Entrega cancelada', 'success'); carregar(); }
      } catch { showToast('Erro ao cancelar', 'error'); }
    }

    // Filtragem + ordenação client-side
    const entregasFiltradas = useMemo(() => {
      let lista = entregas;

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
    }, [entregas, busca, filtroMargem, ordenacao]);

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

    function abrirTracking(e) {
      // Sinal pra outras abas — usuário pode ir manualmente pra Tracking
      // (não temos roteamento entre abas aqui, então só mostramos a OS no clipboard)
      navigator.clipboard?.writeText(String(e.codigo_os));
      showToast(`OS ${e.codigo_os} copiada — abra a aba Tracking`, 'info');
    }

    function abrirDetalhes(e) {
      // Detalhes futuros poderiam abrir um modal — por ora, copia delivery_id
      if (e.uber_delivery_id) {
        navigator.clipboard?.writeText(e.uber_delivery_id);
        showToast('Delivery ID copiado', 'success');
      }
    }

    return h('div', { className: 'max-w-6xl mx-auto p-4 space-y-4' },

      // ── Header ──
      h('div', { className: 'flex items-center justify-between flex-wrap gap-3' },
        h('div', null,
          h('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Entregas Uber'),
          h('p', { className: 'text-xs text-gray-500 mt-1' },
            `${resumo.qtd} entrega${resumo.qtd !== 1 ? 's' : ''} · `,
            'Margem total ',
            h('span', {
              className: resumo.total >= 0 ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold',
            }, `${resumo.total >= 0 ? '+' : '−'} ${fmtMoney(Math.abs(resumo.total))}`),
            resumo.negativas > 0 && h('span', { className: 'text-red-600 ml-2' }, `· ${resumo.negativas} no prejuízo`),
          )
        ),
        h('div', { className: 'flex gap-2 flex-wrap' },
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
        h('select', {
          value: filtroStatus,
          onChange: e => setFiltroStatus(e.target.value),
          className: 'px-3 py-2 border border-gray-200 rounded-lg text-sm',
        },
          h('option', { value: '' }, 'Todos os status'),
          Object.keys(STATUS_LABELS).map(s => h('option', { key: s, value: s }, STATUS_LABELS[s].label))
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
      loading
        ? h('div', { className: 'text-center py-12' },
            h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto' })
          )
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
              }))
            )
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA 4: CONFIG - configuração da integração
  // ════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════
  // ABA: REGRAS DE CLIENTE (opt-in por cliente + região)
  // ════════════════════════════════════════════════════════
  function TabRegras({ API_URL, fetchAuth, showToast }) {
    const [regras, setRegras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(null); // null | 'novo' | {id, ...}

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/uber/regras`);
        const json = await res.json();
        setRegras(json.regras || []);
      } catch { showToast('Erro ao carregar regras', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar(); }, []);

    function novoForm() {
      setEditando({
        cliente_nome: '',
        cliente_identificador: '',
        usar_uber: true,
        regioes_permitidas_csv: '',
        horario_inicio: '',
        horario_fim: '',
        valor_minimo: '',
        valor_maximo: '',
        ativo: true,
      });
    }

    function editarRegra(r) {
      setEditando({
        ...r,
        regioes_permitidas_csv: (r.regioes_permitidas || []).join(', '),
        horario_inicio: r.horario_inicio || '',
        horario_fim: r.horario_fim || '',
        valor_minimo: r.valor_minimo || '',
        valor_maximo: r.valor_maximo || '',
      });
    }

    async function salvar() {
      if (!editando?.cliente_nome?.trim() || editando.cliente_nome.trim().length < 5) {
        showToast('Trecho do endereço deve ter no mínimo 5 caracteres', 'error');
        return;
      }
      const payload = {
        cliente_nome: editando.cliente_nome.trim(),
        cliente_identificador: editando.cliente_identificador?.trim() || null,
        usar_uber: !!editando.usar_uber,
        regioes_permitidas: editando.regioes_permitidas_csv,  // backend normaliza
        horario_inicio: editando.horario_inicio || null,
        horario_fim: editando.horario_fim || null,
        valor_minimo: editando.valor_minimo === '' ? null : parseFloat(editando.valor_minimo),
        valor_maximo: editando.valor_maximo === '' ? null : parseFloat(editando.valor_maximo),
        ativo: !!editando.ativo,
      };
      const metodo = editando.id ? 'PUT' : 'POST';
      const url = editando.id ? `${API_URL}/uber/regras/${editando.id}` : `${API_URL}/uber/regras`;
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
        const res = await fetchAuth(`${API_URL}/uber/regras/${r.id}`, {
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
        const res = await fetchAuth(`${API_URL}/uber/regras/${r.id}`, { method: 'DELETE' });
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
            'O worker só despacha pra Uber OS cujo endereço de coleta casa com algum trecho cadastrado aqui. ',
            'A Mapp não retorna nome do cliente — match é por trecho do endereço. Sem regra ativa = sem despacho automático.')
        ),
        h('button', {
          onClick: novoForm,
          className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-semibold',
        }, '+ Nova regra')
      ),

      // Lista de regras
      h('div', { className: 'bg-white rounded-xl border shadow-sm overflow-hidden' },
        regras.length === 0
          ? h('div', { className: 'p-12 text-center text-gray-400' },
              h('div', { className: 'text-4xl mb-2' }, '📭'),
              h('p', { className: 'font-semibold' }, 'Nenhuma regra cadastrada'),
              h('p', { className: 'text-xs mt-1' }, 'Enquanto não houver regras, o worker não vai despachar nada pra Uber automaticamente.'))
          : h('table', { className: 'w-full text-sm' },
              h('thead', { className: 'bg-gray-50 text-xs uppercase text-gray-600' },
                h('tr', null,
                  h('th', { className: 'px-4 py-3 text-left' }, 'Status'),
                  h('th', { className: 'px-4 py-3 text-left' }, 'Trecho do endereço'),
                  h('th', { className: 'px-4 py-3 text-left' }, 'Regiões'),
                  h('th', { className: 'px-4 py-3 text-left' }, 'Horário'),
                  h('th', { className: 'px-4 py-3 text-left' }, 'Valor (R$)'),
                  h('th', { className: 'px-4 py-3 text-right' }, 'Ações'),
                )),
              h('tbody', null,
                regras.map(r => h('tr', { key: r.id, className: 'border-t hover:bg-gray-50' },
                  h('td', { className: 'px-4 py-3' },
                    h('button', {
                      onClick: () => toggleAtivo(r),
                      className: `px-2 py-0.5 rounded-full text-xs font-bold ${r.ativo && r.usar_uber ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`,
                    }, r.ativo && r.usar_uber ? '● Ativa' : '○ Inativa')),
                  h('td', { className: 'px-4 py-3' },
                    h('div', { className: 'font-semibold text-gray-800' }, r.cliente_nome),
                    r.cliente_identificador && h('div', { className: 'text-xs text-gray-500' }, `id: ${r.cliente_identificador}`)),
                  h('td', { className: 'px-4 py-3 text-xs' },
                    (r.regioes_permitidas && r.regioes_permitidas.length > 0)
                      ? r.regioes_permitidas.join(', ')
                      : h('span', { className: 'text-amber-600 font-semibold' }, '⚠ qualquer região')),
                  h('td', { className: 'px-4 py-3 text-xs' },
                    (r.horario_inicio && r.horario_fim)
                      ? `${r.horario_inicio} – ${r.horario_fim}`
                      : h('span', { className: 'text-gray-400' }, 'sempre')),
                  h('td', { className: 'px-4 py-3 text-xs' },
                    (r.valor_minimo || r.valor_maximo)
                      ? `${r.valor_minimo || 0} – ${r.valor_maximo || '∞'}`
                      : h('span', { className: 'text-gray-400' }, '—')),
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
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Trecho do endereço de coleta *'),
              h('input', {
                type: 'text', value: editando.cliente_nome || '',
                onChange: e => up('cliente_nome', e.target.value),
                placeholder: 'ex: pernambuco, 1500',
                className: 'w-full px-3 py-2 border rounded-lg text-sm',
              }),
              h('p', { className: 'text-xs text-gray-500 mt-1' },
                '⚠ A Mapp não retorna nome de cliente — match é feito contra o ENDEREÇO de coleta da OS. ',
                'Coloque um trecho ÚNICO do endereço do cliente (mínimo 5 caracteres, lowercase, sem acento se possível). ',
                'Quanto mais específico, melhor.')
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
                '⚠ Deixar vazio = aceita qualquer região (não recomendado). Preencher evita que OS fora da cobertura Uber sejam travadas na Mapp.')
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

            h('div', { className: 'flex items-center gap-6 pt-2 border-t' },
              h('label', { className: 'inline-flex items-center text-sm' },
                h('input', { type: 'checkbox', checked: !!editando.usar_uber, onChange: e => up('usar_uber', e.target.checked), className: 'mr-2' }),
                'Usar Uber'),
              h('label', { className: 'inline-flex items-center text-sm' },
                h('input', { type: 'checkbox', checked: !!editando.ativo, onChange: e => up('ativo', e.target.checked), className: 'mr-2' }),
                'Regra ativa'),
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

  function TabConfig({ API_URL, fetchAuth, showToast }) {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/uber/config`);
        const json = await res.json();
        setConfig(json.config || {});
      } catch { showToast('Erro ao carregar config', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL]);

    useEffect(() => { carregar(); }, []);

    async function salvar() {
      setSalvando(true);
      try {
        // Não enviar campos mascarados
        const payload = { ...config };
        ['client_secret', 'mapp_api_token', 'webhook_secret'].forEach(k => {
          if (payload[k] === '••••••••') delete payload[k];
        });

        const res = await fetchAuth(`${API_URL}/uber/config`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) { showToast('Configuração salva!', 'success'); carregar(); }
        else showToast('Erro ao salvar', 'error');
      } finally { setSalvando(false); }
    }

    async function testarMapp() {
      try {
        const res = await fetchAuth(`${API_URL}/uber/config/testar-mapp`, { method: 'POST' });
        const json = await res.json();
        if (json.success) showToast(json.message, 'success');
        else showToast(json.error || 'Falha no teste', 'error');
      } catch { showToast('Erro ao testar', 'error'); }
    }

    async function testarCotacaoUber() {
      const enderecoColeta = prompt('Endereço de COLETA (rua, bairro, cidade - UF - CEP):');
      if (!enderecoColeta) return;
      const enderecoEntrega = prompt('Endereço de ENTREGA (rua, bairro, cidade - UF - CEP):');
      if (!enderecoEntrega) return;

      try {
        const res = await fetchAuth(`${API_URL}/uber/teste-cotacao`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coleta:  { endereco: enderecoColeta },
            entrega: { endereco: enderecoEntrega },
          }),
        });
        const json = await res.json();
        if (json.success) {
          const c = json.cotacao;
          showToast(`✅ Cotação OK: R$${c.valor.toFixed(2)} | ETA ${c.eta_minutos}min | quote_id: ${c.quote_id}`, 'success');
        } else {
          showToast(`❌ ${json.error}`, 'error');
        }
      } catch (e) { showToast('Erro na requisição', 'error'); }
    }

    if (loading || !config) return h('div', { className: 'flex items-center justify-center py-16' },
      h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full' })
    );

    const update = (k, v) => setConfig(c => ({ ...c, [k]: v }));

    const Field = (label, key, type = 'text', placeholder = '') =>
      h('div', { className: 'mb-3' },
        h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, label),
        h('input', {
          type, value: config[key] || '',
          onChange: e => update(key, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value),
          placeholder,
          className: 'w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent'
        })
      );

    return h('div', { className: 'max-w-4xl mx-auto p-4 space-y-4' },
      h('h2', { className: 'text-2xl font-bold text-gray-800' }, '⚙️ Configuração Uber Direct'),

      h('div', { className: 'bg-white rounded-xl border shadow-sm p-6' },
        h('div', { className: 'flex items-center justify-between mb-4 pb-4 border-b' },
          h('div', null,
            h('h3', { className: 'font-bold text-gray-800' }, 'Status da integração'),
            h('p', { className: 'text-xs text-gray-500 mt-1' }, 'Quando ativo, o worker faz polling na Mapp e despacha pra Uber')
          ),
          h('label', { className: 'inline-flex items-center cursor-pointer' },
            h('input', { type: 'checkbox', checked: !!config.ativo, onChange: e => update('ativo', e.target.checked), className: 'sr-only peer' }),
            h('div', { className: "w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 relative" })
          )
        ),

        h('label', { className: 'inline-flex items-center mb-4' },
          h('input', { type: 'checkbox', checked: !!config.auto_despacho, onChange: e => update('auto_despacho', e.target.checked), className: 'mr-2' }),
          h('span', { className: 'text-sm text-gray-700' }, 'Despacho automático (worker decide sozinho qual OS enviar)')
        ),

        h('label', { className: 'inline-flex items-center mb-4 ml-4' },
          h('input', { type: 'checkbox', checked: !!config.sandbox_mode, onChange: e => update('sandbox_mode', e.target.checked), className: 'mr-2' }),
          h('span', { className: 'text-sm text-amber-700 font-semibold' }, '🤖 Modo SANDBOX (RoboCourier — não gera entregas reais)')
        ),

        h('h4', { className: 'font-bold text-gray-700 mt-4 mb-2' }, '🚗 Credenciais Uber Direct'),
        Field('Client ID', 'client_id', 'text', 'Seu client_id da Uber'),
        Field('Client Secret', 'client_secret', 'password', '••••••••'),
        Field('Customer ID', 'customer_id', 'text', 'Seu customer_id'),
        Field('Webhook Secret', 'webhook_secret', 'password', 'Para validar HMAC dos webhooks'),

        h('button', {
          onClick: testarCotacaoUber,
          className: 'mt-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200'
        }, '🧪 Testar cotação Uber (sem criar entrega)'),

        h('h4', { className: 'font-bold text-gray-700 mt-6 mb-2' }, '🔌 API Mapp/Tutts'),
        Field('URL da API Mapp', 'mapp_api_url', 'text', 'https://seuDominio.com/sem/v1/rotas.php'),
        Field('Token Mapp', 'mapp_api_token', 'password', '••••••••'),
        h('button', {
          onClick: testarMapp,
          className: 'mt-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200'
        }, '🧪 Testar conexão com Mapp'),

        h('h4', { className: 'font-bold text-gray-700 mt-6 mb-2' }, '⏱️ Comportamento'),
        Field('Intervalo de polling (segundos)', 'polling_intervalo_seg', 'number', '30'),
        Field('Janela temporal do worker (minutos)', 'worker_janela_minutos', 'number', '30 — OS mais antigas que isso são ignoradas'),
        Field('Timeout sem entregador (minutos)', 'timeout_sem_entregador_min', 'number', '10'),
        Field('Telefone suporte (fallback E.164)', 'telefone_suporte', 'text', '(71) 99999-8888'),
        Field('Valor declarado da encomenda (centavos)', 'manifest_total_value_centavos', 'number', '10000 = R$ 100,00'),

        h('div', { className: 'flex justify-end gap-2 mt-6 pt-4 border-t' },
          h('button', { onClick: carregar, className: 'px-4 py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300' }, 'Cancelar'),
          h('button', {
            onClick: salvar, disabled: salvando,
            className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50'
          }, salvando ? 'Salvando...' : '💾 Salvar')
        )
      ),

      h('div', { className: 'bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800' },
        h('p', { className: 'font-bold mb-2' }, '📌 URLs de webhook para configurar no painel Uber Direct:'),
        h('code', { className: 'block bg-white p-2 rounded mb-1' }, `${API_URL.replace(/\/api$/, '')}/api/uber/webhook/status`),
        h('code', { className: 'block bg-white p-2 rounded' }, `${API_URL.replace(/\/api$/, '')}/api/uber/webhook/courier`)
      )
    );
  }

  // ════════════════════════════════════════════════════════
  // COMPONENTE RAIZ
  // Usa props.estado.uberTab (controlado pelo OverflowNav do app.js)
  // ════════════════════════════════════════════════════════
  function ModuloUber(props) {
    const { HeaderCompacto, usuario, Ee, socialProfile, isLoading, lastUpdate, onRefresh, onLogout, navegarSidebar, estado, setEstado } = props;

    // Aba ativa controlada pelo OverflowNav do app.js (via estado.uberTab)
    const aba = (estado && estado.uberTab) || 'dashboard';

    const abas = {
      dashboard: TabDashboard,
      tracking:  TabTracking,
      entregas:  TabEntregas,
      regras:    TabRegras,
      config:    TabConfig,
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
        onChangeTab: (abaId) => setEstado(e => ({ ...e, uberTab: abaId })),
      }),
      // Conteúdo da aba ativa
      h(Atual, props)
    );
  }

  // Expor globalmente para o app.js carregar (padrão dos outros módulos)
  window.ModuloUberComponent = ModuloUber;
})();
