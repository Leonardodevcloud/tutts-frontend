// ==================== MÓDULO UBER DIRECT ====================
// Arquivo: modulo-uber.js
// Admin: Dashboard, Tracking em tempo real, Entregas, Configuração
// Integração Mapp <-> Uber Direct via Central Tutts
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
  function TabEntregas({ API_URL, fetchAuth, showToast }) {
    const [entregas, setEntregas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('');

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

    return h('div', { className: 'max-w-7xl mx-auto p-4 space-y-4' },
      h('div', { className: 'flex items-center justify-between' },
        h('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Entregas Uber'),
        h('div', { className: 'flex gap-2' },
          h('select', { value: filtroStatus, onChange: e => setFiltroStatus(e.target.value), className: 'px-3 py-1.5 border rounded-lg text-sm' },
            h('option', { value: '' }, 'Todos os status'),
            Object.keys(STATUS_LABELS).map(s => h('option', { key: s, value: s }, STATUS_LABELS[s].label))
          ),
          h('button', { onClick: despacharOS, className: 'px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700' }, '+ Despachar OS'),
          h('button', { onClick: carregar, className: 'px-3 py-1.5 bg-gray-200 rounded-lg text-sm hover:bg-gray-300' }, '🔄')
        )
      ),
      loading
        ? h('div', { className: 'text-center py-12' }, h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto' }))
        : h('div', { className: 'bg-white rounded-xl border shadow-sm overflow-x-auto' },
            h('table', { className: 'w-full text-sm' },
              h('thead', { className: 'bg-gray-50 text-xs uppercase text-gray-500' },
                h('tr', null,
                  ['OS', 'Status', 'Entregador', 'Coleta → Entrega', 'Valor Uber', 'Criado em', 'Ações'].map(c => h('th', { key: c, className: 'px-3 py-2 text-left' }, c))
                )
              ),
              h('tbody', null,
                entregas.length === 0
                  ? h('tr', null, h('td', { colSpan: 7, className: 'text-center py-8 text-gray-400' }, 'Nenhuma entrega encontrada'))
                  : entregas.map(e => h('tr', { key: e.id, className: 'border-t hover:bg-gray-50' },
                      h('td', { className: 'px-3 py-2 font-bold' }, e.codigo_os),
                      h('td', { className: 'px-3 py-2' }, h(Badge, { status: e.status_uber })),
                      h('td', { className: 'px-3 py-2 text-xs' }, e.entregador_nome || '—'),
                      h('td', { className: 'px-3 py-2 text-xs text-gray-500 max-w-xs truncate' }, `${e.endereco_coleta || '?'} → ${e.endereco_entrega || '?'}`),
                      h('td', { className: 'px-3 py-2' }, fmtMoney(parseFloat(e.valor_uber || 0))),
                      h('td', { className: 'px-3 py-2 text-xs' }, fmtDT(e.created_at)),
                      h('td', { className: 'px-3 py-2' },
                        !['delivered', 'cancelado', 'fallback_fila'].includes(e.status_uber) && h('button', {
                          onClick: () => cancelarEntrega(e.id),
                          className: 'text-red-600 hover:text-red-800 text-xs'
                        }, 'Cancelar')
                      )
                    ))
              )
            )
          )
    );
  }

  // ════════════════════════════════════════════════════════
  // ABA 4: CONFIG - configuração da integração
  // ════════════════════════════════════════════════════════
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

        h('h4', { className: 'font-bold text-gray-700 mt-4 mb-2' }, '🚗 Credenciais Uber Direct'),
        Field('Client ID', 'client_id', 'text', 'Seu client_id da Uber'),
        Field('Client Secret', 'client_secret', 'password', '••••••••'),
        Field('Customer ID', 'customer_id', 'text', 'Seu customer_id'),
        Field('Webhook Secret', 'webhook_secret', 'password', 'Para validar HMAC dos webhooks'),

        h('h4', { className: 'font-bold text-gray-700 mt-6 mb-2' }, '🔌 API Mapp/Tutts'),
        Field('URL da API Mapp', 'mapp_api_url', 'text', 'https://seuDominio.com/sem/v1/rotas.php'),
        Field('Token Mapp', 'mapp_api_token', 'password', '••••••••'),
        h('button', {
          onClick: testarMapp,
          className: 'mt-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200'
        }, '🧪 Testar conexão com Mapp'),

        h('h4', { className: 'font-bold text-gray-700 mt-6 mb-2' }, '⏱️ Comportamento'),
        Field('Intervalo de polling (segundos)', 'polling_intervalo_seg', 'number', '30'),
        Field('Timeout sem entregador (minutos)', 'timeout_sem_entregador_min', 'number', '10'),

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
    // O app.js passa a aba ativa via props.estado.uberTab
    // Se ainda não existe, default = 'dashboard'
    const aba = props.estado?.uberTab || 'dashboard';

    const abas = {
      dashboard: TabDashboard,
      tracking:  TabTracking,
      entregas:  TabEntregas,
      config:    TabConfig,
    };
    const Atual = abas[aba] || TabDashboard;

    return h('div', { className: 'min-h-screen bg-gray-50' },
      h(Atual, props)
    );
  }

  // Expor globalmente para o app.js carregar (padrão dos outros módulos)
  window.ModuloUberComponent = ModuloUber;
})();
