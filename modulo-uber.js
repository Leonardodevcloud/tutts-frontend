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
    // Margem por cliente
    const [margemData, setMargemData] = useState(null);
    const [margemLoading, setMargemLoading] = useState(false);
    const [periodo, setPeriodo] = useState('7d'); // 1d | 7d | 30d

    const carregar = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/uber/metricas`);
        const json = await res.json();
        setData(json.metricas || {});
      } catch { showToast('Erro ao carregar métricas', 'error'); }
      finally { setLoading(false); }
    }, [fetchAuth, API_URL]);

    const carregarMargem = useCallback(async () => {
      setMargemLoading(true);
      try {
        const res = await fetchAuth(`${API_URL}/uber/dashboard/margem-clientes?periodo=${periodo}`);
        const json = await res.json();
        if (json.success) setMargemData(json);
        else showToast(json.error || 'Erro ao carregar margem', 'error');
      } catch { showToast('Erro de rede ao carregar margem', 'error'); }
      finally { setMargemLoading(false); }
    }, [fetchAuth, API_URL, periodo]);

    useEffect(() => { carregar(); }, []);
    useEffect(() => { carregarMargem(); }, [carregarMargem]);

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

    // Cálculos pro gráfico CSS-only (margem por dia)
    const porDia = margemData?.por_dia || [];
    const valoresDia = porDia.map(d => parseFloat(d.margem || 0));
    const maxAbs = Math.max(1, ...valoresDia.map(v => Math.abs(v))); // evita div-zero

    return h('div', { className: 'max-w-7xl mx-auto p-4 space-y-6' },
      h('div', { className: 'flex items-center justify-between' },
        h('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Dashboard Uber Direct'),
        h('button', {
          onClick: () => { carregar(); carregarMargem(); },
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
      ),

      // ════════════════════════════════════════════════════════
      // SEÇÃO: MARGEM POR CLIENTE
      // ════════════════════════════════════════════════════════
      h('div', { className: 'bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4' },
        // Header com filtro de período
        h('div', { className: 'flex items-center justify-between flex-wrap gap-3' },
          h('div', null,
            h('h3', { className: 'text-lg font-bold text-gray-800' }, '💼 Margem por cliente'),
            h('p', { className: 'text-xs text-gray-500 mt-1' },
              'Quanto cada cliente está rendendo (ou custando) quando despachado pelo Uber. ',
              h('span', { className: 'text-gray-400' }, 'Margem = valor cliente Mapp − custo Uber.'))
          ),
          h('div', { className: 'flex gap-1 bg-gray-100 rounded-lg p-1' },
            ['1d', '7d', '30d'].map(p => h('button', {
              key: p,
              onClick: () => setPeriodo(p),
              className: `px-3 py-1.5 text-xs font-semibold rounded-md ${
                periodo === p ? 'bg-white text-purple-700 shadow' : 'text-gray-600 hover:text-gray-800'
              }`,
            }, p === '1d' ? 'Hoje' : p === '7d' ? '7 dias' : '30 dias'))
          ),
        ),

        margemLoading
          ? h('div', { className: 'text-center py-12' },
              h('div', { className: 'animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto' }))
          : !margemData || margemData.por_cliente.length === 0
            ? h('div', { className: 'text-center py-12 text-gray-400' },
                h('p', { className: 'font-semibold' }, 'Nenhuma entrega no período'),
                h('p', { className: 'text-xs mt-1' }, 'Ajuste o filtro de período ou despache OSs pra ver os dados aqui.'))
            : [
                // Totais gerais
                h('div', { key: 'totais', className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
                  h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
                    h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Entregas'),
                    h('div', { className: 'text-base font-semibold text-gray-800' }, margemData.totais.qtd_total || 0)
                  ),
                  h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
                    h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Receita'),
                    h('div', { className: 'text-base font-semibold text-gray-800' }, fmtMoney(parseFloat(margemData.totais.receita || 0)))
                  ),
                  h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
                    h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Custo Uber'),
                    h('div', { className: 'text-base font-semibold text-gray-800' }, fmtMoney(parseFloat(margemData.totais.custo || 0)))
                  ),
                  (function () {
                    const m = parseFloat(margemData.totais.margem || 0);
                    const pos = m >= 0;
                    return h('div', { className: `rounded-lg px-3 py-2.5 ${pos ? 'bg-green-50' : 'bg-red-50'}` },
                      h('div', { className: `text-[11px] mb-0.5 ${pos ? 'text-green-700' : 'text-red-700'}` }, 'Margem total'),
                      h('div', { className: `text-base font-semibold ${pos ? 'text-green-800' : 'text-red-800'}` },
                        `${pos ? '+ ' : '− '}${fmtMoney(Math.abs(m))}`)
                    );
                  })(),
                ),

                // Mini-gráfico: margem por dia (CSS only, sem libs)
                porDia.length > 0 && h('div', { key: 'chart', className: 'pt-2' },
                  h('div', { className: 'text-xs text-gray-500 mb-2' }, `Margem por dia (${porDia.length} dia${porDia.length !== 1 ? 's' : ''})`),
                  h('div', { className: 'flex items-end gap-1 h-32 border-b border-gray-200' },
                    porDia.map((d, i) => {
                      const v = parseFloat(d.margem || 0);
                      const pos = v >= 0;
                      const pct = (Math.abs(v) / maxAbs) * 100;
                      // Barras positivas crescem pra cima, negativas pra baixo
                      return h('div', {
                        key: i,
                        className: 'flex-1 flex flex-col justify-end items-center group relative',
                        title: `${new Date(d.dia).toLocaleDateString('pt-BR')}: ${pos ? '+' : '−'} ${fmtMoney(Math.abs(v))} (${d.qtd} entrega${d.qtd != 1 ? 's' : ''})`,
                      },
                        h('div', {
                          className: `w-full ${pos ? 'bg-green-400 hover:bg-green-500' : 'bg-red-400 hover:bg-red-500'} rounded-t transition-all`,
                          style: { height: `${Math.max(2, pct)}%` },
                        }),
                      );
                    })
                  ),
                  h('div', { className: 'flex justify-between text-[10px] text-gray-400 mt-1' },
                    porDia.length > 0 && h('span', null, new Date(porDia[0].dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
                    porDia.length > 1 && h('span', null, new Date(porDia[porDia.length - 1].dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
                  )
                ),

                // Tabela por cliente
                h('div', { key: 'tabela', className: 'overflow-x-auto' },
                  h('table', { className: 'w-full text-sm' },
                    h('thead', { className: 'bg-gray-50 text-xs uppercase text-gray-600' },
                      h('tr', null,
                        h('th', { className: 'px-3 py-2 text-left' }, 'Cliente'),
                        h('th', { className: 'px-3 py-2 text-right' }, 'Qtd'),
                        h('th', { className: 'px-3 py-2 text-right' }, 'Receita'),
                        h('th', { className: 'px-3 py-2 text-right' }, 'Custo Uber'),
                        h('th', { className: 'px-3 py-2 text-right' }, 'Margem'),
                        h('th', { className: 'px-3 py-2 text-right' }, 'Margem méd.'),
                        h('th', { className: 'px-3 py-2 text-right' }, '%'),
                        h('th', { className: 'px-3 py-2 text-right' }, '% Cancel.'),
                      )),
                    h('tbody', null,
                      margemData.por_cliente.map((c, i) => {
                        const m = parseFloat(c.margem_total || 0);
                        const pos = m >= 0;
                        return h('tr', {
                          key: i,
                          className: `border-t hover:bg-gray-50 ${m < 0 ? 'bg-red-50/40' : ''}`,
                        },
                          h('td', { className: 'px-3 py-2' },
                            h('div', { className: 'font-semibold text-gray-800' }, c.cliente),
                            !c.regra_id && h('div', { className: 'text-[10px] text-gray-400' }, 'Sem regra cadastrada'),
                          ),
                          h('td', { className: 'px-3 py-2 text-right text-gray-700' }, c.qtd),
                          h('td', { className: 'px-3 py-2 text-right text-gray-700' }, fmtMoney(parseFloat(c.receita_total || 0))),
                          h('td', { className: 'px-3 py-2 text-right text-gray-700' }, fmtMoney(parseFloat(c.custo_uber_total || 0))),
                          h('td', { className: `px-3 py-2 text-right font-semibold ${pos ? 'text-green-700' : 'text-red-700'}` },
                            `${pos ? '+' : '−'} ${fmtMoney(Math.abs(m))}`),
                          h('td', { className: 'px-3 py-2 text-right text-gray-600' },
                            `${parseFloat(c.margem_media || 0) >= 0 ? '+' : '−'} ${fmtMoney(Math.abs(parseFloat(c.margem_media || 0)))}`),
                          h('td', { className: `px-3 py-2 text-right font-semibold ${pos ? 'text-green-600' : 'text-red-600'}` },
                            `${parseFloat(c.margem_pct || 0).toFixed(1)}%`),
                          h('td', { className: 'px-3 py-2 text-right text-gray-600' },
                            `${parseFloat(c.taxa_cancelamento || 0).toFixed(0)}%`),
                        );
                      })
                    )
                  )
                ),
              ]
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
                h('div', { className: 'flex items-center justify-between mb-1 gap-2' },
                  h('span', { className: 'text-sm font-bold' }, `OS ${e.codigo_os}`),
                  h('div', { className: 'flex items-center gap-1.5' },
                    h(Badge, { status: e.status_uber }),
                    e.tracking_url && h('a', {
                      href: e.tracking_url,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      onClick: (ev) => ev.stopPropagation(),
                      title: 'Abrir tracking oficial Uber',
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
                    h(Badge, { status: selecionada.status_uber })
                  )
                ),
                // Botão tracking oficial Uber
                selecionada.tracking_url && h('a', {
                  href: selecionada.tracking_url,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'flex items-center gap-1.5 text-xs px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex-shrink-0',
                  title: 'Abrir página oficial de rastreio do Uber em nova aba',
                }, '🔗 Tracking Uber'),
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
  function CardEntrega({ entrega, onCancelar, onVerTracking, onVerDetalhes, onRedespachar, showToast }) {
    const e = entrega;

    const valorCliente   = parseFloat(e.valor_servico || 0);
    const valorProfMapp  = parseFloat(e.valor_profissional || 0);
    const valorUber      = parseFloat(e.valor_uber || 0);
    const margem         = valorCliente - valorUber;
    const margemPositiva = margem >= 0;

    const podeCancelar = !['delivered', 'cancelado', 'canceled', 'fallback_fila'].includes(e.status_uber);
    const temEntregador = !!e.entregador_nome;

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
            h('span', { className: 'text-lg md:text-xl font-bold text-gray-800' }, `OS ${e.codigo_os}`),
            h(Badge, { status: e.status_uber }),
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
            disabled: !e.tracking_url,
            title: e.tracking_url ? 'Abrir rastreio no Uber' : 'Sem URL de rastreio',
            className: `text-xs px-3 py-1.5 border rounded-lg ${
              e.tracking_url
                ? 'border-gray-200 hover:bg-gray-50 text-gray-700'
                : 'border-gray-100 text-gray-300 cursor-not-allowed'
            }`,
          }, 'Tracking'),
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
    const [detalhesAberto, setDetalhesAberto] = useState(null); // {entrega, tracking, webhooks, loading}
    const [redespachoAberto, setRedespachoAberto] = useState(null); // {entrega, novo_endereco, ...}
    const [redespachando, setRedespachando] = useState(false);
    // Modal de cotação manual (Opção C)
    const [cotacaoModal, setCotacaoModal] = useState(null); // null | {state, codigoOS, dados, error}
    const [tickClock, setTickClock] = useState(0); // força re-render por segundo pro countdown

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

    // Timer de re-render por segundo enquanto o modal de cotação está aberto.
    // Necessário pra o countdown atualizar visualmente.
    useEffect(() => {
      if (!cotacaoModal || cotacaoModal.state !== 'ok') return;
      const t = setInterval(() => setTickClock(x => x + 1), 1000);
      return () => clearInterval(t);
    }, [cotacaoModal?.state]);

    // Abre modal de cotação manual: pede código da OS, cota na Uber, mostra valores.
    // Substitui o prompt() antigo que despachava direto sem mostrar preço.
    async function despacharOS() {
      const codigoOS = prompt('Código da OS para cotar no Uber:');
      if (!codigoOS) return;
      const codigoOSNum = parseInt(codigoOS);
      if (isNaN(codigoOSNum) || codigoOSNum <= 0) {
        showToast('Código inválido', 'error');
        return;
      }
      // Abre modal em estado "cotando" e dispara cotação
      setCotacaoModal({ state: 'cotando', codigoOS: codigoOSNum, dados: null, error: null });
      try {
        const res = await fetchAuth(`${API_URL}/uber/entregas/cotar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigoOS: codigoOSNum }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setCotacaoModal({ state: 'ok', codigoOS: codigoOSNum, dados: json, error: null });
        } else {
          setCotacaoModal({ state: 'erro', codigoOS: codigoOSNum, dados: null, error: json.error || 'Erro ao cotar' });
        }
      } catch (err) {
        setCotacaoModal({ state: 'erro', codigoOS: codigoOSNum, dados: null, error: 'Erro de rede ao cotar' });
      }
    }

    // Botão "Tentar de novo" no modal — reusa o estado pra cotar mais uma vez
    async function recotarOS() {
      if (!cotacaoModal?.codigoOS) return;
      const cod = cotacaoModal.codigoOS;
      setCotacaoModal({ state: 'cotando', codigoOS: cod, dados: null, error: null });
      try {
        const res = await fetchAuth(`${API_URL}/uber/entregas/cotar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigoOS: cod }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setCotacaoModal({ state: 'ok', codigoOS: cod, dados: json, error: null });
        } else {
          setCotacaoModal({ state: 'erro', codigoOS: cod, dados: null, error: json.error || 'Erro ao cotar' });
        }
      } catch {
        setCotacaoModal({ state: 'erro', codigoOS: cod, dados: null, error: 'Erro de rede ao cotar' });
      }
    }

    // Confirma o despacho usando o quote_id da cotação atual (não cota 2x)
    async function confirmarDespacho() {
      if (!cotacaoModal?.dados?.quote_id) return;
      // Verifica se a quote ainda tá válida (fail-safe — o botão deveria estar desabilitado)
      if (Date.now() > cotacaoModal.dados.expires_at) {
        showToast('Cotação expirada — cote novamente', 'error');
        return;
      }
      setCotacaoModal({ ...cotacaoModal, state: 'despachando' });
      try {
        const res = await fetchAuth(`${API_URL}/uber/entregas/despachar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigoOS: cotacaoModal.codigoOS,
            quote_id: cotacaoModal.dados.quote_id,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          showToast(`OS ${cotacaoModal.codigoOS} despachada com sucesso!`, 'success');
          setCotacaoModal(null);
          carregar();
        } else {
          showToast(json.error || 'Erro ao despachar', 'error');
          // Se a quote expirou no servidor (410), volta pra estado ok pra usuário poder recotar
          if (res.status === 410) {
            setCotacaoModal({ ...cotacaoModal, state: 'ok', dados: { ...cotacaoModal.dados, expires_at: 0 } });
          } else {
            setCotacaoModal({ ...cotacaoModal, state: 'ok' });
          }
        }
      } catch {
        showToast('Erro de rede ao despachar', 'error');
        setCotacaoModal({ ...cotacaoModal, state: 'ok' });
      }
    }

    function fecharCotacaoModal() {
      if (cotacaoModal?.state === 'cotando' || cotacaoModal?.state === 'despachando') return;
      setCotacaoModal(null);
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

    // Tracking: abre a página oficial de rastreio do Uber Direct em nova aba.
    // O tracking_url vem da resposta do Create Delivery e é salvo no banco no despacho.
    function abrirTracking(e) {
      if (!e.tracking_url) {
        showToast('Sem URL de rastreio (entrega antiga sem tracking_url salvo)', 'error');
        return;
      }
      window.open(e.tracking_url, '_blank', 'noopener,noreferrer');
    }

    // Detalhes: abre modal com tracking points + webhooks + info completa
    async function abrirDetalhes(e) {
      setDetalhesAberto({ entrega: e, tracking: [], webhooks: [], loading: true });
      try {
        const res = await fetchAuth(`${API_URL}/uber/entregas/${e.codigo_os}`);
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

    // Redespacho: cancela a delivery atual no Uber e cria nova com novo endereço
    function abrirRedespacho(e) {
      setRedespachoAberto({
        entrega: e,
        novo_endereco: e.endereco_entrega || '',
        nome_destinatario: '',
        telefone_destinatario: '',
        complemento: '',
      });
    }

    function fecharRedespacho() {
      if (redespachando) return; // não fecha enquanto está rolando
      setRedespachoAberto(null);
    }

    async function confirmarRedespacho() {
      if (!redespachoAberto?.novo_endereco?.trim() || redespachoAberto.novo_endereco.trim().length < 8) {
        showToast('Endereço novo deve ter pelo menos 8 caracteres', 'error');
        return;
      }
      setRedespachando(true);
      try {
        const res = await fetchAuth(`${API_URL}/uber/entregas/${redespachoAberto.entrega.id}/redespachar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            novo_endereco: redespachoAberto.novo_endereco.trim(),
            nome_destinatario: redespachoAberto.nome_destinatario || null,
            telefone_destinatario: redespachoAberto.telefone_destinatario || null,
            complemento: redespachoAberto.complemento || null,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          showToast(`Redespachado! Nova entrega id=${json.entrega_nova_id}`, 'success');
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
                onRedespachar: abrirRedespacho,
                showToast,
              }))
            ),

      // ── Modal de detalhes ──
      detalhesAberto && h(ModalDetalhesEntrega, {
        data: detalhesAberto,
        onClose: fecharDetalhes,
        showToast,
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
              'A entrega atual será cancelada no Uber e uma nova será criada com o novo endereço.'),
          ),
          h('div', { className: 'p-5 space-y-3' },
            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800' },
              '⚠ Esta ação cancela a delivery atual no Uber (perdendo qualquer progresso de courier) e cria uma nova com a mesma coleta + novo destino. Use apenas se o endereço de entrega original estava errado.'),

            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Endereço atual'),
              h('div', { className: 'text-sm text-gray-500 bg-gray-50 rounded p-2 border border-gray-200' },
                redespachoAberto.entrega.endereco_entrega || '—'),
            ),

            h('div', null,
              h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Novo endereço de entrega *'),
              h('textarea', {
                value: redespachoAberto.novo_endereco,
                onChange: e => setRedespachoAberto({ ...redespachoAberto, novo_endereco: e.target.value }),
                placeholder: 'Rua, número, bairro, cidade, estado, CEP',
                rows: 2,
                className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
              }),
            ),

            h('div', { className: 'grid grid-cols-2 gap-2' },
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Nome destinatário'),
                h('input', {
                  type: 'text',
                  value: redespachoAberto.nome_destinatario,
                  onChange: e => setRedespachoAberto({ ...redespachoAberto, nome_destinatario: e.target.value }),
                  placeholder: 'opcional',
                  className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                }),
              ),
              h('div', null,
                h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Telefone'),
                h('input', {
                  type: 'tel',
                  value: redespachoAberto.telefone_destinatario,
                  onChange: e => setRedespachoAberto({ ...redespachoAberto, telefone_destinatario: e.target.value }),
                  placeholder: '+55...',
                  className: 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm',
                }),
              ),
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

      // ── Modal de cotação manual (Opção C) ──
      cotacaoModal && (function () {
        const m = cotacaoModal;
        const d = m.dados;
        const segundosRestantes = d ? Math.max(0, Math.floor((d.expires_at - Date.now()) / 1000)) : 0;
        const expirou = d && segundosRestantes === 0;
        const margem = d ? parseFloat(d.margem || 0) : 0;
        const margemPositiva = margem >= 0;
        const margemNegativaForte = margem < 0;
        const mm = Math.floor(segundosRestantes / 60);
        const ss = segundosRestantes % 60;

        return h('div', {
          className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
          onClick: (ev) => { if (ev.target === ev.currentTarget) fecharCotacaoModal(); },
        },
          h('div', { className: 'bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto' },

            // Header
            h('div', { className: 'border-b border-gray-200 px-5 py-4' },
              h('h3', { className: 'text-lg font-bold text-gray-800' }, `Cotação OS ${m.codigoOS}`),
              h('p', { className: 'text-xs text-gray-500 mt-1' },
                'Confirme o valor da Uber antes de despachar. A entrega só é criada quando você clica em Confirmar.')
            ),

            // Body — depende do estado
            m.state === 'cotando' || m.state === 'despachando'
              ? h('div', { className: 'p-12 text-center' },
                  h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3' }),
                  h('p', { className: 'text-sm text-gray-500' },
                    m.state === 'cotando' ? 'Cotando na Uber…' : 'Despachando…'))

              : m.state === 'erro'
              ? h('div', { className: 'p-5' },
                  h('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-4 mb-4' },
                    h('div', { className: 'flex items-start gap-2' },
                      h('span', { className: 'text-red-600 text-lg flex-shrink-0' }, '⚠'),
                      h('div', { className: 'flex-1' },
                        h('div', { className: 'text-sm font-semibold text-red-800 mb-1' }, 'Erro ao cotar'),
                        h('div', { className: 'text-xs text-red-700 break-words' }, m.error || 'Erro desconhecido'),
                        h('div', { className: 'text-xs text-red-600 mt-2' },
                          'A OS continua livre na Mapp pra ser despachada manualmente ou pelos motoboys internos.')
                      )
                    )
                  ),
                  h('div', { className: 'flex justify-end gap-2' },
                    h('button', {
                      onClick: fecharCotacaoModal,
                      className: 'px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50',
                    }, 'Fechar'),
                    h('button', {
                      onClick: recotarOS,
                      className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700',
                    }, 'Tentar novamente'),
                  )
                )

              : // state === 'ok'
                h('div', { className: 'p-5 space-y-4' },

                  // Endereços
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                    h('div', null,
                      h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' }, '📦 Coleta'),
                      h('div', { className: 'text-sm text-gray-800' }, d.endereco_coleta || '—')
                    ),
                    h('div', null,
                      h('div', { className: 'text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1' }, '📍 Entrega'),
                      h('div', { className: 'text-sm text-gray-800' }, d.endereco_entrega || '—')
                    ),
                  ),

                  // 4 cards de valores
                  h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
                    h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
                      h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Cliente paga'),
                      h('div', { className: 'text-base font-semibold text-gray-800' }, fmtMoney(parseFloat(d.valor_cliente || 0)))
                    ),
                    h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
                      h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Profissional Mapp'),
                      h('div', { className: 'text-base font-semibold text-gray-800' }, fmtMoney(parseFloat(d.valor_profissional || 0)))
                    ),
                    h('div', { className: 'bg-purple-50 rounded-lg px-3 py-2.5' },
                      h('div', { className: 'text-[11px] text-purple-700 mb-0.5' }, 'Custo Uber'),
                      h('div', { className: 'text-base font-semibold text-purple-800' }, fmtMoney(parseFloat(d.valor_uber || 0)))
                    ),
                    h('div', {
                      className: `rounded-lg px-3 py-2.5 ${margemPositiva ? 'bg-green-50' : 'bg-red-50'}`,
                    },
                      h('div', { className: `text-[11px] mb-0.5 ${margemPositiva ? 'text-green-700' : 'text-red-700'}` }, 'Margem'),
                      h('div', {
                        className: `text-base font-semibold ${margemPositiva ? 'text-green-800' : 'text-red-800'}`,
                      }, `${margemPositiva ? '+ ' : '− '}${fmtMoney(Math.abs(margem))}`),
                      h('div', { className: `text-[10px] ${margemPositiva ? 'text-green-600' : 'text-red-600'}` },
                        `${parseFloat(d.margem_pct || 0).toFixed(1)}%`)
                    ),
                  ),

                  // ETA
                  h('div', { className: 'flex items-center gap-2 text-xs text-gray-600' },
                    h('span', null, '⏱'),
                    h('span', null, 'ETA estimado: '),
                    h('span', { className: 'font-semibold text-gray-800' }, `${d.eta_minutos || '?'} min`),
                  ),

                  // Warning de margem negativa (forte)
                  margemNegativaForte && h('div', { className: 'bg-red-50 border-2 border-red-300 rounded-lg p-3' },
                    h('div', { className: 'flex items-start gap-2' },
                      h('span', { className: 'text-red-600 text-lg flex-shrink-0' }, '⚠'),
                      h('div', null,
                        h('div', { className: 'text-sm font-semibold text-red-800' },
                          `Esta entrega vai dar prejuízo de ${fmtMoney(Math.abs(margem))}`),
                        h('div', { className: 'text-xs text-red-700 mt-0.5' },
                          'O custo da Uber está acima do valor que o cliente paga. Tem certeza que quer despachar?')
                      )
                    )
                  ),

                  // Timer countdown
                  h('div', {
                    className: `flex items-center justify-between text-xs px-3 py-2 rounded-lg ${
                      expirou ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
                    }`,
                  },
                    h('span', null, expirou ? '⌛ Cotação expirada' : '⏱ Cotação válida por:'),
                    h('span', { className: 'font-mono font-semibold' },
                      expirou ? '00:00' : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`)
                  ),
                ),

            // Footer com ações (só aparece no estado 'ok')
            m.state === 'ok' && h('div', { className: 'border-t border-gray-200 px-5 py-3 flex justify-between gap-2 bg-gray-50' },
              h('button', {
                onClick: fecharCotacaoModal,
                className: 'px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-white',
              }, 'Cancelar'),
              h('div', { className: 'flex gap-2' },
                expirou && h('button', {
                  onClick: recotarOS,
                  className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700',
                }, 'Cotar de novo'),
                !expirou && h('button', {
                  onClick: confirmarDespacho,
                  className: `px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                    margemNegativaForte
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`,
                }, margemNegativaForte ? 'Despachar mesmo assim' : 'Confirmar despacho'),
              )
            )
          )
        );
      })()
    );
  }

  // ════════════════════════════════════════════════════════
  // MODAL: Detalhes de uma entrega Uber
  // ════════════════════════════════════════════════════════
  function ModalDetalhesEntrega({ data, onClose, showToast }) {
    const { entrega: e, tracking, webhooks, loading } = data;

    function copiarDeliveryId() {
      if (!e.uber_delivery_id) return;
      navigator.clipboard?.writeText(e.uber_delivery_id).then(
        () => showToast('Delivery ID copiado', 'success'),
        () => showToast('Erro ao copiar', 'error')
      );
    }

    return h('div', {
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
      onClick: (ev) => { if (ev.target === ev.currentTarget) onClose(); },
    },
      h('div', { className: 'bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto' },

        // Header do modal
        h('div', { className: 'sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between' },
          h('div', null,
            h('h3', { className: 'text-xl font-bold text-gray-800' }, `OS ${e.codigo_os}`),
            h('div', { className: 'flex items-center gap-2 mt-1' },
              h(Badge, { status: e.status_uber }),
              e.uber_delivery_id && h('button', {
                onClick: copiarDeliveryId,
                className: 'text-xs text-gray-500 hover:text-gray-700 font-mono',
                title: 'Copiar delivery ID',
              }, `📋 ${truncMeio(e.uber_delivery_id, 14, 6)}`)
            )
          ),
          h('button', {
            onClick: onClose,
            className: 'text-gray-400 hover:text-gray-600 text-2xl leading-none px-2',
          }, '×')
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

              // Valores e margem
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
                h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
                  h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Cliente paga'),
                  h('div', { className: 'text-base font-semibold' }, fmtMoney(parseFloat(e.valor_servico || 0)))
                ),
                h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
                  h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Profissional Mapp'),
                  h('div', { className: 'text-base font-semibold' }, fmtMoney(parseFloat(e.valor_profissional || 0)))
                ),
                h('div', { className: 'bg-gray-50 rounded-lg px-3 py-2.5' },
                  h('div', { className: 'text-[11px] text-gray-500 mb-0.5' }, 'Custo Uber'),
                  h('div', { className: 'text-base font-semibold' }, fmtMoney(parseFloat(e.valor_uber || 0)))
                ),
                (function () {
                  const m = parseFloat(e.valor_servico || 0) - parseFloat(e.valor_uber || 0);
                  const pos = m >= 0;
                  return h('div', { className: `rounded-lg px-3 py-2.5 ${pos ? 'bg-green-50' : 'bg-red-50'}` },
                    h('div', { className: `text-[11px] mb-0.5 ${pos ? 'text-green-700' : 'text-red-700'}` }, 'Margem'),
                    h('div', { className: `text-base font-semibold ${pos ? 'text-green-800' : 'text-red-800'}` },
                      `${pos ? '+ ' : '− '}${fmtMoney(Math.abs(m))}`)
                  );
                })(),
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

              // Tracking URL oficial do Uber
              e.tracking_url && h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3' },
                h('div', { className: 'text-xs uppercase tracking-wider text-purple-700 font-semibold mb-2' }, '🔗 Rastreio Uber Direct'),
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

              // Tracking points
              tracking && tracking.length > 0 && h('div', null,
                h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2' },
                  `📍 Pontos de tracking (${tracking.length})`),
                h('div', { className: 'bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1' },
                  tracking.map((t, i) => h('div', { key: i, className: 'text-xs flex justify-between font-mono' },
                    h('span', null, `${parseFloat(t.latitude).toFixed(5)}, ${parseFloat(t.longitude).toFixed(5)}`),
                    h('span', { className: 'text-gray-500' }, `${t.status_uber || '—'} · ${fmtDT(t.created_at)}`)
                  ))
                )
              ),

              // Webhooks recebidos
              webhooks && webhooks.length > 0 && h('div', null,
                h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2' },
                  `📨 Webhooks recebidos (${webhooks.length})`),
                h('div', { className: 'bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1' },
                  webhooks.map((w, i) => h('div', { key: i, className: 'text-xs flex justify-between' },
                    h('span', { className: 'font-semibold' }, w.tipo),
                    h('span', { className: 'text-gray-500' },
                      `${w.processado ? '✓' : '✗'} ${fmtDT(w.created_at)}`,
                      w.erro && h('span', { className: 'text-red-600 ml-2' }, w.erro)
                    )
                  ))
                )
              ),

              // Erro último, se houver
              e.erro_ultimo && h('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-3' },
                h('div', { className: 'text-xs uppercase tracking-wider text-red-700 font-semibold mb-1' }, '⚠ Último erro'),
                h('div', { className: 'text-sm text-red-800 font-mono break-words' }, e.erro_ultimo)
              ),

              // Timestamps
              h('div', { className: 'text-xs text-gray-500 pt-3 border-t border-gray-100 space-y-0.5' },
                h('div', null, `Despachada: ${fmtDT(e.created_at)}`),
                e.finalizado_at && h('div', null, `Finalizada: ${fmtDT(e.finalizado_at)}`),
                h('div', null, `Tentativas: ${e.tentativas || 0}`),
                e.cancelado_por && h('div', null, `Cancelada por: ${e.cancelado_por}${e.cancelado_motivo ? ' — ' + e.cancelado_motivo : ''}`),
              )
            )
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
        trecho_endereco: '',
        cliente_identificador: '',
        usar_uber: true,
        regioes_permitidas_csv: '',
        horario_inicio: '',
        horario_fim: '',
        valor_minimo: '',
        valor_maximo: '',
        margem_minima_aceita: '',
        margem_pct_minima: '',
        ativo: true,
      });
    }

    function editarRegra(r) {
      setEditando({
        ...r,
        // Compat: regras antigas só tinham cliente_nome (que era o trecho).
        // Se trecho_endereco estiver vazio, preenche com cliente_nome pra não perder o match.
        trecho_endereco: r.trecho_endereco || r.cliente_nome || '',
        regioes_permitidas_csv: (r.regioes_permitidas || []).join(', '),
        horario_inicio: r.horario_inicio || '',
        horario_fim: r.horario_fim || '',
        valor_minimo: r.valor_minimo || '',
        valor_maximo: r.valor_maximo || '',
        margem_minima_aceita: r.margem_minima_aceita ?? '',
        margem_pct_minima: r.margem_pct_minima ?? '',
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
        margem_minima_aceita: editando.margem_minima_aceita === '' ? null : parseFloat(editando.margem_minima_aceita),
        margem_pct_minima: editando.margem_pct_minima === '' ? null : parseFloat(editando.margem_pct_minima),
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
                      className: `px-2 py-0.5 rounded-full text-xs font-bold ${r.ativo && r.usar_uber ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`,
                    }, r.ativo && r.usar_uber ? '● Ativa' : '○ Inativa')),
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

            // ── Filtros de margem (Opção C) ──
            h('div', { className: 'pt-3 border-t border-gray-100' },
              h('div', { className: 'text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2' }, '💰 Filtro de margem'),
              h('div', { className: 'grid grid-cols-2 gap-3' },
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Margem mínima (R$)'),
                  h('input', {
                    type: 'number', step: '0.01',
                    value: editando.margem_minima_aceita ?? '',
                    onChange: e => up('margem_minima_aceita', e.target.value),
                    placeholder: 'deixe vazio',
                    className: 'w-full px-3 py-2 border rounded-lg text-sm',
                  })
                ),
                h('div', null,
                  h('label', { className: 'block text-xs font-semibold text-gray-600 mb-1 uppercase' }, 'Margem mínima (%)'),
                  h('input', {
                    type: 'number', step: '0.1',
                    value: editando.margem_pct_minima ?? '',
                    onChange: e => up('margem_pct_minima', e.target.value),
                    placeholder: 'deixe vazio',
                    className: 'w-full px-3 py-2 border rounded-lg text-sm',
                  })
                ),
              ),
              h('p', { className: 'text-xs text-gray-500 mt-2' },
                '⚠ OSs com margem (valor cliente − custo Uber) abaixo desses limites NÃO serão despachadas automaticamente. ',
                'Se ambos forem definidos, a OS precisa passar nos dois. Deixe vazio pra desativar o filtro.')
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
