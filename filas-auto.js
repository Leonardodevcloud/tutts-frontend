/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* FILAS_CLEAN_V1: redesign clean das Filas auto-gerenciáveis (admin). */
// ============================================================
// MÓDULO FILAS AUTO-GERENCIÁVEIS — visão ADMIN
// ============================================================
// Arquivo separado do filas.js (fila clássica) pra zero risco de regressão.
// Estrutura:
//   ModuloFilasAuto({ usuario, apiUrl, fetchAuth, showToast })
//     - Lista de centrais auto (cards)
//     - Clique numa central → tabs (Monitor, Config, Vínculos, Logs)
//     - Botão "+ Nova central auto" cria do zero
//
// Padrões respeitados:
//   - Foto do motoboy via fetch direto a /perfil/fotos (padrão Saques/Filas)
//   - Emojis no lugar de Tabler Icons (projeto não carrega Tabler)
//   - useRef pra callbacks repassados como prop (evita infinite loop)
//   - registrar em window.ModuloFilasAuto pra app.js consumir
// ============================================================

(function () {
  const e = React.createElement; /* FILAS_ICONS_V3 */

  // ════════════════════════════════════════════════════════════
  // FILAS_CLEAN_V1 — helpers visuais (paleta Roxo Tutts, cards brancos,
  // status em pílula suave, faixa de KPIs, modais brancos). Só visual.
  // ════════════════════════════════════════════════════════════
  const SORA = 'Sora, Inter, sans-serif';
  const TOM = {
    verde: ['#f0fdf4', '#166534', '#16a34a'], ambar: ['#fffbeb', '#92400e', '#d97706'],
    vermelho: ['#fef2f2', '#991b1b', '#dc2626'], azul: ['#eff6ff', '#1e40af', '#2563eb'],
    cinza: ['#f3f4f6', '#374151', '#6b7280'], roxo: ['#faf7fd', '#5d0b85', '#770fa8'],
  };
  const ico = (nome, sz, cor) => e('svg', { className: 'ico', style: { width: sz || 16, height: sz || 16, color: cor, flex: 'none' }, 'aria-hidden': 'true' }, e('use', { href: '#i-' + nome }));
  const dot = (cor) => e('span', { 'aria-hidden': 'true', style: { width: 6, height: 6, borderRadius: 99, background: cor, display: 'inline-block', flex: 'none' } });
  const pill = (tom, txt, title) => { const t = TOM[tom] || TOM.cinza; return e('span', { title: title, style: { display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 99, padding: '2px 9px', fontWeight: 600, fontSize: 11.5, lineHeight: '18px', background: t[0], color: t[1], whiteSpace: 'nowrap' } }, dot(t[2]), txt); };
  const CARD = 'bg-white border border-gray-200 rounded-[14px]';
  const BTN_PRI = 'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const BTN_SEC = 'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const BTN_DEST = 'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-white border border-red-200 hover:bg-red-50 text-red-800 text-sm font-semibold transition-colors';
  const BTN_SEC_SM = 'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[8px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium transition-colors whitespace-nowrap';
  const BTN_DEST_SM = 'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[8px] bg-white border border-red-200 hover:bg-red-50 text-red-800 text-xs font-semibold transition-colors whitespace-nowrap';
  const BTN_ICO_DEST = 'inline-flex items-center justify-center w-8 h-8 rounded-[8px] bg-white border border-red-200 text-red-800 hover:bg-red-50 transition-colors flex-shrink-0';
  const INPUT = 'w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-700 focus:ring-2 focus:ring-purple-100';
  const SELECT = 'h-[34px] px-2.5 rounded-[10px] border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:border-purple-700 focus:ring-2 focus:ring-purple-100 flex-shrink-0';
  const LABEL = 'block text-xs font-semibold text-gray-700 mb-1';
  const tituloPagina = (txt) => e('h1', { style: { fontFamily: SORA, fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1.25, letterSpacing: '-0.01em' } }, txt);
  const tituloCard = (txt, extra) => e('div', { className: 'flex items-center gap-2 min-w-0' }, e('h2', { className: 'text-[15px] font-semibold text-gray-900 truncate' }, txt), extra);
  const contador = (n) => e('span', { className: 'text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 tabular-nums whitespace-nowrap' }, n);
  const vazio = (txt, acao) => e('div', { className: 'text-center py-10 px-4' }, e('p', { className: 'text-sm text-gray-500' }, txt), acao ? e('div', { className: 'mt-3' }, acao) : null);
  const kpiCell = (rotulo, valor, opts) => { opts = opts || {}; return e('div', { key: rotulo, style: { flex: '1 1 150px', padding: '14px 20px', boxShadow: '-1px 0 0 #f3f4f6, 0 -1px 0 #f3f4f6', minWidth: 0 }, title: opts.title },
    e('div', { className: 'flex items-center gap-1.5', style: { fontSize: 12, color: '#6b7280' } }, opts.dot ? dot(opts.dot) : null, rotulo),
    e('div', { style: { fontFamily: SORA, fontSize: 26, fontWeight: 700, color: opts.cor || '#111827', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 } }, valor),
    opts.sub ? e('div', { style: { fontSize: 11.5, color: '#6b7280' } }, opts.sub) : null); };
  const kpiFaixa = (cells) => e('div', { className: CARD + ' flex flex-wrap overflow-hidden' }, cells.filter(Boolean));
  const modalBox = (o) => e('div', { className: 'fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4', onClick: o.onOverlay ? (ev) => { if (ev.target === ev.currentTarget) o.onOverlay(); } : undefined },
    e('div', { className: 'bg-white border border-gray-200 rounded-[14px] w-full ' + (o.largura || 'max-w-md') + ' max-h-[90vh] flex flex-col overflow-hidden', role: 'dialog', 'aria-modal': 'true' },
      e('div', { className: 'flex items-start justify-between gap-3 px-5 pt-5 pb-3 flex-shrink-0' },
        e('div', { className: 'min-w-0' }, e('h2', { className: 'text-base font-semibold text-gray-900' }, o.titulo), o.sub ? e('p', { className: 'text-sm text-gray-500 mt-0.5' }, o.sub) : null),
        o.onFechar ? e('button', { type: 'button', onClick: o.onFechar, className: 'w-8 h-8 -mr-1 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex-shrink-0', 'aria-label': 'Fechar' }, ico('x', 16)) : null),
      e('div', { className: 'px-5 pb-4 overflow-y-auto flex-1 min-h-0' }, o.corpo),
      o.rodape ? e('div', { className: 'px-5 py-3 border-t border-gray-100 flex justify-end gap-2 flex-wrap flex-shrink-0' }, o.rodape) : null));

  function ModuloFilasAuto(props) {
    const { usuario, apiUrl, fetchAuth, showToast } = props;
    const isAdmin = ['admin', 'admin_master'].includes(usuario?.role);

    // ── Estado ───────────────────────────────────────────────
    const [centrais, setCentrais] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [centralSelecionada, setCentralSelecionada] = React.useState(null);
    const [abaAtiva, setAbaAtiva] = React.useState('monitor'); // 'monitor' | 'config' | 'vinculos' | 'logs' | 'penalidades'
    const [penalidades, setPenalidades] = React.useState([]);
    const [loadingPenal, setLoadingPenal] = React.useState(false);
    const [filaCompleta, setFilaCompleta] = React.useState({ fila: [], em_rota: [], alertas: [], bloqueados: [], kpis: {} });
    const [logs, setLogs] = React.useState([]);
    const [vinculos, setVinculos] = React.useState([]);
    const [profissionais, setProfissionais] = React.useState([]);
    const [modalCentral, setModalCentral] = React.useState(null);
    const [modalVincular, setModalVincular] = React.useState(false);
    const [fotos, setFotos] = React.useState({}); // mapa cod → dataURL
    const [busca, setBusca] = React.useState('');
    // 🆕 2026-05-24: drag-and-drop pra reordenar fila + modal colocar manual
    const [dragData, setDragData] = React.useState(null);
    const [modalColocarFila, setModalColocarFila] = React.useState(false);

    // Geocoding (mesmo padrão do filas.js clássico)
    const [buscandoEndereco, setBuscandoEndereco] = React.useState(false);
    const [enderecoValidado, setEnderecoValidado] = React.useState(false);
    const [coordenadasEncontradas, setCoordenadasEncontradas] = React.useState(null);
    const [modoManual, setModoManual] = React.useState(false); // fallback quando geocode falha
    const [geocodeDown, setGeocodeDown] = React.useState(false); // indica que a API quebrou
    const debounceRef = React.useRef(null);
    const centralSelecionadaRef = React.useRef(null);  // sempre fresca pra usar no WS callback

    // Refs estáveis pra props (anti infinite-loop)
    const apiUrlRef = React.useRef(apiUrl);
    const fetchAuthRef = React.useRef(fetchAuth);
    const showToastRef = React.useRef(showToast);
    React.useEffect(() => {
      apiUrlRef.current = apiUrl;
      fetchAuthRef.current = fetchAuth;
      showToastRef.current = showToast;
    });
    const toast = React.useCallback((m, t) => showToastRef.current && showToastRef.current(m, t), []);

    // Busca endereço via Google Geocoding (mesmo endpoint da fila clássica)
    const buscarEndereco = React.useCallback(async (endereco) => {
      if (!endereco || endereco.length < 5) {
        setEnderecoValidado(false);
        setCoordenadasEncontradas(null);
        return;
      }
      setBuscandoEndereco(true);
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/geocode/google?endereco=${encodeURIComponent(endereco)}`);
        const d = await r.json().catch(() => ({}));

        // Detectar API quebrada: 500/503 ou REQUEST_DENIED → ativa fallback manual
        const apiQuebrou = r.status >= 500
          || (d && typeof d.error === 'string' && /Google|API|REQUEST_DENIED|billing/i.test(d.error));
        if (apiQuebrou) {
          console.warn('[FilasAuto] API de geocoding indisponível:', { status: r.status, body: d });
          setGeocodeDown(true);
          setEnderecoValidado(false);
          setCoordenadasEncontradas(null);
          toast('API de busca indisponível · use o modo manual abaixo', 'error');
          return;
        }

        const resultado = d.results && d.results[0];
        if (resultado && resultado.latitude && resultado.longitude) {
          setCoordenadasEncontradas({
            latitude: resultado.latitude,
            longitude: resultado.longitude,
            enderecoFormatado: resultado.endereco || endereco,
          });
          setEnderecoValidado(true);
          setGeocodeDown(false);
          toast('Endereço encontrado!', 'success');
        } else {
          setEnderecoValidado(false);
          setCoordenadasEncontradas(null);
          const msg = d.error || 'Endereço não encontrado · tente incluir rua + número + cidade';
          console.warn('[FilasAuto] geocode falhou:', { status: r.status, body: d });
          toast(msg, 'error');
        }
      } catch (e) {
        setEnderecoValidado(false);
        setCoordenadasEncontradas(null);
        setGeocodeDown(true);
        toast('Erro ao buscar endereço · use o modo manual', 'error');
      } finally {
        setBuscandoEndereco(false);
      }
    }, [toast]);

    const buscarEnderecoDebounced = React.useCallback((endereco) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => buscarEndereco(endereco), 800);
    }, [buscarEndereco]);

    // Reseta estado do geocoding quando modal abre/fecha
    React.useEffect(() => {
      if (!modalCentral) {
        setBuscandoEndereco(false);
        setEnderecoValidado(false);
        setCoordenadasEncontradas(null);
        setModoManual(false);
        setGeocodeDown(false);
        if (debounceRef.current) clearTimeout(debounceRef.current);
      } else if (modalCentral.id && modalCentral.latitude && modalCentral.longitude) {
        // Editando: marca como já validado
        setEnderecoValidado(true);
        setCoordenadasEncontradas({
          latitude: modalCentral.latitude,
          longitude: modalCentral.longitude,
          enderecoFormatado: modalCentral.endereco,
        });
      }
    }, [modalCentral?.id, modalCentral === null]);

    // ── Loaders ──────────────────────────────────────────────
    const carregarCentrais = React.useCallback(async () => {
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/centrais`);
        const d = await r.json();
        if (d.success) {
          // Filtra só as auto (o endpoint /centrais retorna todas)
          setCentrais((d.centrais || []).filter(c => c.tipo === 'auto'));
        }
      } catch (err) {
        console.error('[FilasAuto] carregarCentrais:', err);
      } finally {
        setLoading(false);
      }
    }, []);

    const carregarPenalidades = React.useCallback(async (centralId) => {
      if (!centralId) return;
      setLoadingPenal(true);
      try {
        const r = await fetchAuth(`${apiUrl}/filas/penalidades/${centralId}`);
        const d = await r.json();
        if (d.success) {
          // Merge: só atualiza se mudou (evita flash desnecessário)
          setPenalidades(prev => {
            const next = d.penalidades || [];
            if (JSON.stringify(prev.map(p=>p.id)) === JSON.stringify(next.map(p=>p.id))) return prev;
            return next;
          });
        }
      } catch (err) { console.error('[FilasAuto] carregarPenalidades:', err); }
      finally { setLoadingPenal(false); }
    }, [fetchAuth, apiUrl]);

    const anularPenalidade = React.useCallback(async (penalidade) => {
      if (!window.confirm(`Anular punição de ${penalidade.nome_profissional || penalidade.cod_profissional}?`)) return;
      try {
        const r = await fetchAuth(`${apiUrl}/filas/anular-penalidade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cod_profissional: penalidade.cod_profissional, central_id: penalidade.central_id }),
        });
        const d = await r.json();
        if (d.success) {
          showToast('Punição removida!', 'success');
          // Remove localmente imediato — sem esperar o reload
          setPenalidades(prev => prev.filter(x => x.cod_profissional !== penalidade.cod_profissional));
          // Sync com servidor em background
          carregarPenalidades(centralSelecionada?.id);
        } else {
          showToast(d.error || 'Erro ao anular', 'error');
        }
      } catch (err) { showToast('Erro de conexão', 'error'); }
    }, [fetchAuth, apiUrl, centralSelecionada, carregarPenalidades]);

    const carregarFilaCompleta = React.useCallback(async (centralId) => {
      if (!centralId) return;
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/auto/admin/fila-completa/${centralId}`);
        const d = await r.json();
        if (d.success) {
          // 🔄 2026-05-24: salvar também em_rota e alertas (estavam faltando)
          // Merge em vez de substituição — evita re-render completo (flash)
          setFilaCompleta(prev => {
            const next = {
              fila: d.fila || [],
              em_rota: d.em_rota || [],
              alertas: d.alertas || [],
              bloqueados: d.bloqueados || [],
              kpis: d.kpis || {},
              total_sem_disponibilidade: d.total_sem_disponibilidade || 0,
            };
            // Só atualiza se algo mudou (shallow compare por JSON)
            if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
            return next;
          });
          // Carrega fotos dos motoboys (inclui em_rota)
          const cods = [...new Set([
            ...(d.fila || []).map(p => p.cod_profissional),
            ...(d.em_rota || []).map(p => p.cod_profissional),
            ...(d.bloqueados || []).map(p => p.cod_profissional),
          ].filter(c => c && /^\d+$/.test(c)))];
          if (cods.length > 0) {
            try {
              const rf = await fetchAuthRef.current(`${apiUrlRef.current}/perfil/fotos?codigos=${cods.join(',')}`);
              if (rf.ok) {
                const df = await rf.json();
                setFotos(prev => ({ ...prev, ...(df.fotos || {}) }));
              }
            } catch (errF) { /* segue sem fotos */ }
          }
        }
      } catch (err) {
        console.error('[FilasAuto] carregarFilaCompleta:', err);
      }
    }, []);

    const carregarLogs = React.useCallback(async (centralId) => {
      if (!centralId) return;
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/auto/admin/logs/${centralId}?limit=50`);
        const d = await r.json();
        if (d.success) setLogs(d.logs || []);
      } catch (err) { console.error('[FilasAuto] carregarLogs:', err); }
    }, []);

    const carregarVinculos = React.useCallback(async (centralId) => {
      if (!centralId) return;
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/filas/centrais/${centralId}/vinculos`);
        const d = await r.json();
        if (d.success) setVinculos(d.vinculos || []);
      } catch (err) { console.error('[FilasAuto] carregarVinculos:', err); }
    }, []);

    const carregarProfissionais = React.useCallback(async () => {
      try {
        const r = await fetchAuthRef.current(`${apiUrlRef.current}/crm/profissionais-cadastro`);
        if (!r.ok) {
          console.warn('[FilasAuto] /crm/profissionais-cadastro retornou', r.status);
          return;
        }
        const d = await r.json();
        // Endpoint retorna {data: [{codigo, nome, telefone, ...}]} — mesmo formato
        // usado pela fila clássica (filas.js carregarProfissionais). Normaliza pros
        // campos que o resto do componente espera.
        const lista = Array.isArray(d?.data) ? d.data : [];
        const normalizada = lista
          .filter(p => p && p.codigo)
          .map(p => ({
            cod_profissional: String(p.codigo).trim(),
            nome_profissional: p.nome || `#${p.codigo}`,
            telefone: p.telefone || '',
          }))
          .sort((a, b) => (a.nome_profissional || '').localeCompare(b.nome_profissional || '', 'pt-BR'));
        setProfissionais(normalizada);
      } catch (err) {
        console.error('[FilasAuto] carregarProfissionais:', err?.message || err);
      }
    }, []);

    // ── Effects ──────────────────────────────────────────────
    React.useEffect(() => { if (isAdmin) { carregarCentrais(); carregarProfissionais(); } }, [isAdmin, carregarCentrais, carregarProfissionais]);

    React.useEffect(() => {
      if (!centralSelecionada) return;
      carregarFilaCompleta(centralSelecionada.id);
      carregarLogs(centralSelecionada.id);
      carregarVinculos(centralSelecionada.id);
      // Polling 5s no monitor + logs (configuração não muda sozinha)
      const i = setInterval(() => {
        if (abaAtiva === 'penalidades') {
          carregarPenalidades(centralSelecionada.id);
          return;
        }
        if (abaAtiva === 'monitor' || abaAtiva === 'logs') {
          carregarFilaCompleta(centralSelecionada.id);
          carregarLogs(centralSelecionada.id);
        }
      }, 5000);
      return () => clearInterval(i);
    }, [centralSelecionada, abaAtiva, carregarFilaCompleta, carregarLogs, carregarVinculos]);

    // Sync ref (sem dep circular)
    React.useEffect(() => { centralSelecionadaRef.current = centralSelecionada; }, [centralSelecionada]);

    // WS: ouvir FILA_PENALIDADE_NOVA em tempo real (mesmo canal /ws/disponibilidade)
    React.useEffect(() => {
      if (!isAdmin || !apiUrl) return;
      const token = window._authToken || document.cookie.split('; ').find(r => r.startsWith('accessToken='))?.split('=')[1];
      if (!token) return;
      let ws, pingId, reconnectId;
      function conectar() {
        try {
          ws = new WebSocket(apiUrl.replace('https://', 'wss://').replace('http://', 'ws://').replace('/api', '') + '/ws/disponibilidade');
          ws.onopen = () => ws.send(JSON.stringify({ type: 'AUTH', token }));
          ws.onmessage = (ev) => {
            try {
              const msg = JSON.parse(ev.data);
              if (msg.event === 'FILA_PENALIDADE_NOVA' && msg.data) {
                const p = msg.data;
                if (String(p.central_id) === String(centralSelecionadaRef.current?.id)) {
                  setPenalidades(prev => {
                    if (prev.some(x => x.cod_profissional === p.cod_profissional)) return prev;
                    return [{ ...p, created_at: new Date().toISOString() }, ...prev];
                  });
                }
              }
            } catch (_) {}
          };
          ws.onclose = () => { if (!reconnectId) reconnectId = setTimeout(() => { reconnectId = null; conectar(); }, 5000); };
          ws.onerror = () => {};
          pingId = setInterval(() => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'PING' })); }, 30000);
        } catch (_) {}
      }
      conectar();
      return () => {
        clearInterval(pingId);
        clearTimeout(reconnectId);
        if (ws) { ws.onclose = null; ws.close(); }
      };
    }, [isAdmin, apiUrl]);

    // ── Mutators ─────────────────────────────────────────────
    const salvarCentral = async (dados) => {
      try {
        // Validação client-side
        if (!dados.nome || !dados.nome.trim()) {
          toast('Informe o nome da central', 'error');
          return null;
        }

        // Determina coordenadas: modo manual usa dados.latitude/longitude direto;
        // modo geocoding usa coordenadasEncontradas
        let latFinal, lngFinal, enderecoFinal;
        if (modoManual) {
          const lat = parseFloat(dados.latitude);
          const lng = parseFloat(dados.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            toast('Latitude e longitude inválidas', 'error');
            return null;
          }
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            toast('Coordenadas fora da faixa válida', 'error');
            return null;
          }
          latFinal = lat;
          lngFinal = lng;
          enderecoFinal = dados.endereco || null;
        } else {
          if (!dados.endereco || !dados.endereco.trim()) {
            toast('Informe o endereço da central', 'error');
            return null;
          }
          // fix v2 (2026-05-28): salvarCentral é chamado de dois lugares:
          //   1. Modal de criação (renderModalCentral) — usa geocoding, sem coords em dados
          //   2. ConfigPanel (aba Configuração) — já tem lat/lng em dados direto
          // Se dados.id + dados.latitude + dados.longitude existem: é edição de central
          // existente — usa coords de dados sem exigir geocoding/revalidação.
          const temCoordsExistentes = dados.id && dados.latitude && dados.longitude;

          if (temCoordsExistentes) {
            latFinal = parseFloat(dados.latitude);
            lngFinal = parseFloat(dados.longitude);
            enderecoFinal = dados.endereco;
          } else if (!enderecoValidado || !coordenadasEncontradas) {
            toast('Aguarde a validação do endereço antes de salvar', 'error');
            return null;
          } else {
            latFinal = coordenadasEncontradas.latitude;
            lngFinal = coordenadasEncontradas.longitude;
            enderecoFinal = coordenadasEncontradas.enderecoFormatado || dados.endereco;
          }
        }

        const payload = {
          ...dados,
          latitude: latFinal,
          longitude: lngFinal,
          endereco: enderecoFinal,
        };

        const ehNova = !dados.id;
        const url = ehNova ? `${apiUrl}/filas/centrais` : `${apiUrl}/filas/centrais/${dados.id}`;
        const method = ehNova ? 'POST' : 'PUT';
        const r = await fetchAuth(url, { method, body: JSON.stringify(payload) });
        const d = await r.json().catch(() => ({}));
        
        // Erro HTTP (400/500) ou success falso
        if (!r.ok || !d.success) {
          const msg = d.error || `Erro HTTP ${r.status}`;
          console.error('[FilasAuto] salvar central falhou:', { status: r.status, body: d });
          toast('Erro: ' + msg, 'error');
          return null;
        }

        const centralId = ehNova ? (d.central?.id || d.id) : dados.id;
        if (!centralId) {
          console.error('[FilasAuto] backend retornou success mas sem id:', d);
          toast('Salvou mas backend não retornou id da central', 'error');
          return null;
        }

        // Aplica config específica de auto (PATCH)
        const cfgPayload = {
          tipo: 'auto',
          validacao_agente_ativa: dados.validacao_agente_ativa,
          varredura_intervalo_seg: dados.varredura_intervalo_seg,
          remover_ao_pegar_corrida: dados.remover_ao_pegar_corrida,
          mostrar_nomes_publicos: dados.mostrar_nomes_publicos,
          penalidade_min: dados.penalidade_min,
          barreira_horario_ativa: dados.barreira_horario_ativa,
          barreira_horario_corte: dados.barreira_horario_corte,
        };
        const rCfg = await fetchAuth(`${apiUrl}/filas/auto/admin/centrais/${centralId}/config`, {
          method: 'PATCH', body: JSON.stringify(cfgPayload),
        });
        const dCfg = await rCfg.json().catch(() => ({}));
        if (!rCfg.ok || !dCfg.success) {
          console.error('[FilasAuto] PATCH config falhou:', { status: rCfg.status, body: dCfg });
          toast('Central criada mas config falhou — abra a aba Configuração pra ajustar', 'error');
          // Mesmo com erro de config, central foi salva — fecha modal e atualiza lista
        } else {
          toast(ehNova ? 'Central auto criada!' : 'Atualizada!', 'success');
        }

        setModalCentral(null);
        await carregarCentrais();
        // Se acabou de criar, seleciona pra mostrar (mescla com config aplicada)
        if (ehNova && d.central) {
          setCentralSelecionada({ ...d.central, ...cfgPayload });
        }
        return centralId;
      } catch (err) {
        console.error('[FilasAuto] salvarCentral exception:', err);
        toast('Erro de conexão ao salvar', 'error');
        return null;
      }
    };

    const excluirCentral = async (c) => {
      if (!window.confirm(`Excluir a central "${c.nome}"?\n\nIsso vai apagar TODOS os motoboys que estão na fila dela.`)) return;
      try {
        const r = await fetchAuth(`${apiUrl}/filas/centrais/${c.id}`, { method: 'DELETE' });
        const d = await r.json();
        if (d.success) {
          toast('Central excluída', 'success');
          if (centralSelecionada?.id === c.id) setCentralSelecionada(null);
          carregarCentrais();
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro', 'error'); }
    };

    const reordenarMotoboy = async (codProf, novaPos) => {
      try {
        const r = await fetchAuth(`${apiUrl}/filas/auto/admin/reordenar`, {
          method: 'POST',
          body: JSON.stringify({ central_id: centralSelecionada.id, cod_profissional: codProf, nova_posicao: novaPos }),
        });
        const d = await r.json();
        if (d.success) {
          toast('Posição alterada', 'success');
          carregarFilaCompleta(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro ao reordenar', 'error'); }
    };

    const removerMotoboy = async (codProf, nome) => {
      const motivo = window.prompt(`Remover ${nome || codProf} da fila?\n\nMotivo (opcional):`, '');
      if (motivo === null) return; // cancelou
      try {
        const r = await fetchAuth(`${apiUrl}/filas/auto/admin/remover-emergencia`, {
          method: 'POST',
          body: JSON.stringify({ central_id: centralSelecionada.id, cod_profissional: codProf, motivo }),
        });
        const d = await r.json();
        if (d.success) {
          toast('Motoboy removido', 'success');
          carregarFilaCompleta(centralSelecionada.id);
          carregarLogs(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro ao remover', 'error'); }
    };

    // 🆕 2026-05-24: admin coloca motoboy manualmente na fila (igual fila clássica)
    const colocarNaFila = async (codProf, nome) => {
      try {
        const r = await fetchAuth(`${apiUrl}/filas/auto/admin/colocar-na-fila`, {
          method: 'POST',
          body: JSON.stringify({ central_id: centralSelecionada.id, cod_profissional: codProf }),
        });
        const d = await r.json();
        if (d.success) {
          toast(`${nome || codProf} colocado na posição ${d.posicao}`, 'success');
          setModalColocarFila(false);
          carregarFilaCompleta(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro ao colocar', 'error'); }
    };

    const vincularProfissional = async (codProf, nomeProf) => {
      try {
        const r = await fetchAuth(`${apiUrl}/filas/vinculos`, {
          method: 'POST',
          body: JSON.stringify({ central_id: centralSelecionada.id, cod_profissional: codProf, nome_profissional: nomeProf }),
        });
        const d = await r.json();
        if (d.success) {
          toast('Motoboy vinculado', 'success');
          carregarVinculos(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro ao vincular', 'error'); }
    };

    const desvincularProfissional = async (codProf) => {
      if (!window.confirm('Desvincular este motoboy?')) return;
      try {
        const r = await fetchAuth(`${apiUrl}/filas/vinculos/${codProf}`, { method: 'DELETE' });
        const d = await r.json();
        if (d.success) {
          toast('Desvinculado', 'success');
          carregarVinculos(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro', 'error'); }
    };

    const dispararVarreduraAgora = async () => {
      toast('Disparando varredura...', 'info');
      try {
        const r = await fetchAuth(`${apiUrl}/filas/auto/admin/varredura-agora`, { method: 'POST' });
        const d = await r.json();
        if (d.success) {
          const res = d.resultado || {};
          toast(`Varredura: ${res.validados || 0} ok, ${res.removidos || 0} removidos`, 'success');
          carregarFilaCompleta(centralSelecionada.id);
          carregarLogs(centralSelecionada.id);
        } else toast(d.error || 'Erro', 'error');
      } catch (err) { toast('Erro', 'error'); }
    };

    // ── Bloqueio: motoboys não têm acesso a essa tela ───────
    if (!isAdmin) {
      return e('div', { className: CARD + ' p-8 text-center text-sm text-gray-500' },
        'Esta tela é apenas para admin.'
      );
    }

    // ════════════════════════════════════════════════════════
    // RENDER — lista de centrais (quando nenhuma está selecionada)
    // FILAS_CLEAN_V1: cabeçalho Sora + faixa de KPIs + lista em linhas
    // ════════════════════════════════════════════════════════
    const modalCentralEl = () => modalCentral && renderModalCentral({
      dados: modalCentral,
      onChange: setModalCentral,
      onSalvar: salvarCentral,
      onCancelar: () => setModalCentral(null),
      buscarEnderecoDebounced,
      buscandoEndereco,
      enderecoValidado,
      coordenadasEncontradas,
      modoManual,
      setModoManual,
      geocodeDown,
    });

    if (!centralSelecionada) {
      const ativas = centrais.filter(c => c.ativa);
      const somaFila = centrais.reduce((a, c) => a + (parseInt(c.na_fila) || 0), 0);
      const somaRota = centrais.reduce((a, c) => a + (parseInt(c.em_rota) || 0), 0);
      const somaVinc = centrais.reduce((a, c) => a + (parseInt(c.total_vinculados) || 0), 0);
      const novaCentral = () => setModalCentral({
        tipo: 'auto',
        raio_metros: 900,
        validacao_agente_ativa: true,
        varredura_intervalo_seg: 30,
        remover_ao_pegar_corrida: true,
        mostrar_nomes_publicos: true,
        penalidade_min: 10,
        ativa: true,
      });
      return e('div', { className: 'space-y-5 -mx-2 sm:mx-0' /* FILAS_CLEAN_V1 */ },
        // Header
        e('div', { className: 'flex flex-wrap items-end justify-between gap-3' },
          e('div', null,
            tituloPagina('Filas auto-gerenciáveis'),
            e('p', { className: 'text-sm text-gray-500 mt-1' }, 'Motoboys se organizam · agente Playwright valida no sistema externo')
          ),
          e('button', { onClick: novaCentral, className: BTN_PRI }, ico('plus', 16), 'Nova central auto')
        ),
        !loading && centrais.length > 0 && kpiFaixa([
          kpiCell('Centrais ativas', ativas.length, { sub: `de ${centrais.length} cadastradas` }),
          kpiCell('Na fila agora', somaFila, { dot: '#d97706' }),
          kpiCell('Em rota', somaRota, { dot: '#2563eb' }),
          kpiCell('Motoboys vinculados', somaVinc),
        ]),
        // Lista
        e('div', { className: CARD + ' overflow-hidden' },
          loading
            ? vazio('Carregando...')
            : centrais.length === 0
              ? vazio('Nenhuma central auto-gerenciável ainda. Clique em "Nova central auto" pra começar.', e('button', { onClick: novaCentral, className: BTN_PRI }, ico('plus', 16), 'Nova central auto'))
              : e(React.Fragment, null,
                  e('div', { className: 'grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_130px_100px_100px_80px_80px_28px] gap-x-4 px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500' },
                    e('span', null, 'Central'), e('span', { className: 'hidden md:block' }, 'Agente'), e('span', null, 'Status'), e('span', { className: 'hidden md:block text-right' }, 'Vinculados'), e('span', { className: 'hidden md:block text-right' }, 'Na fila'), e('span', { className: 'hidden md:block text-right' }, 'Em rota'), e('span', { className: 'hidden md:block' })),
                  centrais.map((c) => e('button', {
                    key: c.id,
                    type: 'button',
                    id: `fila-card-${c.id}`,
                    onClick: () => {
                      window.__tuttsFilaShared = { nome: c.nome, ehAuto: true, ativa: c.ativa };
                      setCentralSelecionada(c);
                    },
                    className: 'w-full text-left grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_130px_100px_100px_80px_80px_28px] gap-x-4 gap-y-1 items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors'
                  },
                    e('div', { className: 'min-w-0' },
                      e('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, c.nome),
                      e('p', { className: 'text-xs text-gray-500 truncate' }, c.endereco || 'Sem endereço')
                    ),
                    e('div', { className: 'hidden md:block' }, c.validacao_agente_ativa ? pill('verde', 'Agente ativo') : pill('cinza', 'Agente desligado')),
                    e('div', null, c.ativa ? pill('verde', 'Ativa') : pill('cinza', 'Inativa')),
                    e('p', { className: 'hidden md:block text-sm text-gray-700 text-right tabular-nums' }, c.total_vinculados || 0),
                    e('p', { className: 'hidden md:block text-sm font-semibold text-gray-900 text-right tabular-nums' }, c.na_fila || 0),
                    e('p', { className: 'hidden md:block text-sm font-semibold text-gray-900 text-right tabular-nums' }, c.em_rota || 0),
                    e('span', { className: 'hidden md:inline-flex justify-end text-gray-400' }, ico('arrowright', 16)),
                    e('p', { className: 'md:hidden col-span-2 text-xs text-gray-500 tabular-nums' }, `${c.na_fila || 0} na fila · ${c.em_rota || 0} em rota · ${c.total_vinculados || 0} vinculado${(c.total_vinculados || 0) === 1 ? '' : 's'}`)
                  ))
                )
        ),
        // 🆕 FIX: modal precisa estar disponível TAMBÉM no early-return da lista,
        // senão clicar "Nova central auto" muda o state mas nada renderiza.
        modalCentralEl()
      );
    }

    // ════════════════════════════════════════════════════════
    // RENDER — central selecionada (tabs)
    // ════════════════════════════════════════════════════════
    // FILAS_DIARIA_VAGAS_FRONT_V1_ABAS: +2 abas. A Diária fica ao lado do
    // Garantido (são irmãs, e são mutuamente exclusivas — ver juntas ajuda a
    // entender que só uma vale). A Vagas fica no fim porque é trava de fila,
    // não de remuneração.
    const ABAS = [['monitor', 'Monitor', 'chart'], ['config', 'Configuração', 'settings'], ['vinculos', 'Vínculos', 'link'], ['penalidades', 'Punidos', 'ban'], ['garantido', 'Garantido', 'shield'], ['diaria', 'Diária', 'calendar'], ['vagas', 'Vagas', 'lock'], ['logs', 'Logs do agente', 'list']];
    return e('div', { className: 'space-y-5 -mx-2 sm:mx-0' /* FILAS_CLEAN_V1 */ },
      // Cabeçalho: voltar (breadcrumb) + título + status do agente + ação
      e('div', null,
        e('button', { onClick: () => setCentralSelecionada(null), className: 'inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-800 mb-1.5' }, ico('arrowleft', 14), 'Voltar · Filas auto-gerenciáveis'),
        e('div', { className: 'flex flex-wrap items-end justify-between gap-3' },
          e('div', { className: 'min-w-0' },
            e('div', { className: 'flex items-center gap-2.5 flex-wrap' },
              tituloPagina(centralSelecionada.nome),
              centralSelecionada.validacao_agente_ativa ? pill('verde', 'Agente ativo') : pill('cinza', 'Agente desligado'),
              centralSelecionada.ativa === false && pill('cinza', 'Inativa')
            ),
            e('p', { className: 'text-sm text-gray-500 mt-1 truncate' }, (centralSelecionada.endereco || '—') + ' · ' + vinculos.length + ' vinculados')
          ),
          abaAtiva === 'monitor' && e('button', { onClick: () => setModalColocarFila(true), className: BTN_PRI }, ico('plus', 16), 'Colocar na fila')
        )
      ),

      // Tabs (sublinhadas)
      e('div', { className: 'border-b border-gray-200 overflow-x-auto', role: 'tablist' },
        e('div', { className: 'flex gap-6 min-w-max' },
          ABAS.map(([aba, label, icone]) => {
            const at = abaAtiva === aba;
            return e('button', {
              key: aba, role: 'tab', 'aria-selected': at,
              onClick: () => setAbaAtiva(aba),
              className: 'inline-flex items-center gap-1.5 -mb-px py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors hover:text-gray-900',
              style: { color: at ? '#5d0b85' : '#6b7280', fontWeight: at ? 600 : 500, borderBottomColor: at ? '#770fa8' : 'transparent' }
            }, ico(icone, 15), label, aba === 'penalidades' && penalidades.length > 0 ? e('span', { className: 'ml-0.5 text-[11px] font-semibold text-red-800 bg-red-50 rounded-full px-1.5 tabular-nums' }, penalidades.length) : null);
          })
        )
      ),

      // === ABA MONITOR ===
      abaAtiva === 'monitor' && renderMonitor({
        filaCompleta, fotos, logs,
        reordenarMotoboy, removerMotoboy, dispararVarreduraAgora,
        // 🆕 2026-05-24: drag-and-drop e botão colocar manual
        dragData, setDragData,
        abrirModalColocarFila: () => setModalColocarFila(true),
        totalVinculados: vinculos.length,
      }),

      // === ABA CONFIG ===
      // 🔄 ConfigPanel é componente React (não função imperativa) — isola hooks
      abaAtiva === 'config' && e(ConfigPanel, {
        central: centralSelecionada,
        salvarCentral,
        excluirCentral,
      }),

      // === ABA VÍNCULOS ===
      abaAtiva === 'vinculos' && renderVinculos({
        vinculos, fotos, profissionais, busca, setBusca,
        modalVincular, setModalVincular,
        vincularProfissional, desvincularProfissional,
      }),

      // === ABA PUNIDOS ===
      abaAtiva === 'penalidades' && e('div', { className: CARD + ' overflow-hidden' },
        e('div', { className: 'flex flex-wrap items-center justify-between gap-3 px-4 py-3' },
          e('div', null,
            tituloCard('Motoboys punidos', contador(penalidades.length)),
            e('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'Punições são aplicadas automaticamente quando o motoboy sai da fila voluntariamente. Só remova se houver motivo legítimo (ex: emergência).')
          ),
          e('button', { onClick: () => carregarPenalidades(centralSelecionada.id), className: BTN_SEC }, loadingPenal ? e(React.Fragment, null, ico('clock', 16), 'Carregando...') : e(React.Fragment, null, ico('refresh', 16), 'Atualizar'))
        ),
        loadingPenal
          ? e('div', { className: 'border-t border-gray-100' }, vazio('Carregando...'))
          : penalidades.length === 0
            ? e('div', { className: 'border-t border-gray-100' }, vazio('Nenhum motoboy punido no momento.'))
            : e('div', null, penalidades.map(p => {
                const dt = new Date(p.bloqueado_ate);
                const agora = new Date();
                const totalMs = dt - new Date(p.created_at);
                const restMs  = dt - agora;
                const pct = Math.max(0, Math.min(100, 100 - (restMs / totalMs * 100)));
                const restMin = Math.ceil(restMs / 60000);
                const restLabel = restMin >= 60
                  ? `${Math.floor(restMin/60)}h ${restMin%60 > 0 ? restMin%60+'min' : ''}`.trim()
                  : `${restMin} min`;
                const ehManual = p.tipo === 'manual';
                const ehBarreira = p.tipo === 'barreira_horario';
                const badge = ehManual ? pill('roxo', 'manual') : ehBarreira ? pill('ambar', 'horário') : pill('vermelho', 'automática');
                const subLabel = ehManual
                  ? `Aplicada por ${p.aplicado_por_nome || 'admin'}`
                  : ehBarreira
                    ? (p.motivo_admin || 'Acesso após horário de corte')
                    : `${p.saidas_hoje || 0} saída(s) hoje`;
                return e('div', { key: p.id, className: 'px-4 py-3 border-t border-gray-100 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto] items-center' },
                  e('div', { className: 'min-w-0' },
                    e('div', { className: 'flex items-center gap-2 flex-wrap' },
                      e('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, p.nome_profissional || `#${p.cod_profissional}`),
                      badge
                    ),
                    e('p', { className: 'text-xs text-gray-500 mt-0.5' }, subLabel),
                    p.motivo_admin && !ehBarreira && e('p', { className: 'text-xs text-gray-500 mt-0.5' }, `Motivo: ${p.motivo_admin}`)
                  ),
                  // Barra de progresso do tempo restante
                  e('div', null,
                    e('div', { className: 'flex justify-between text-xs mb-1' },
                      e('span', { className: 'text-gray-500' }, 'Tempo restante'),
                      e('span', { className: 'font-semibold text-red-800 tabular-nums' }, restLabel)
                    ),
                    e('div', { className: 'h-1.5 bg-gray-100 rounded-full overflow-hidden' },
                      e('div', { className: 'h-full rounded-full transition-all', style: { width: pct + '%', background: '#dc2626' } })
                    )
                  ),
                  e('div', { className: 'sm:text-right' },
                    e('button', { onClick: () => anularPenalidade(p), className: BTN_SEC_SM }, ico('check', 14, '#16a34a'), 'Remover punição')
                  )
                );
              }))
      ),
      abaAtiva === 'logs' && renderLogs({ logs }),

      abaAtiva === 'garantido' && centralSelecionada && (typeof window.ModuloGarantidoAdmin !== 'undefined'
        ? e(window.ModuloGarantidoAdmin, { apiUrl, fetchAuth, showToast, central: centralSelecionada })
        : e('div', { className: CARD }, vazio('Recarregue a pagina (Ctrl+F5) para carregar o Garantido.'))),

      // FILAS_DIARIA_VAGAS_FRONT_V1_RENDER
      // O `typeof !== 'undefined'` é o mesmo do Garantido: os módulos são
      // lazy-loaded, e sem cache-bust no index.html o navegador serve o JS velho
      // — a aba existiria e o painel não. A mensagem manda dar Ctrl+F5 em vez de
      // quebrar em tela branca.
      abaAtiva === 'diaria' && centralSelecionada && (typeof window.ModuloDiariaAdmin !== 'undefined'
        ? e(window.ModuloDiariaAdmin, { apiUrl, fetchAuth, showToast, central: centralSelecionada })
        : e('div', { className: CARD }, vazio('Recarregue a pagina (Ctrl+F5) para carregar a Diária.'))),

      abaAtiva === 'vagas' && centralSelecionada && (typeof window.ModuloVagasAdmin !== 'undefined'
        ? e(window.ModuloVagasAdmin, { apiUrl, fetchAuth, showToast, central: centralSelecionada })
        : e('div', { className: CARD }, vazio('Recarregue a pagina (Ctrl+F5) para carregar as Vagas.'))),

      // Modal de nova/editar central
      modalCentralEl(),

      // 🆕 2026-05-24: Modal "Colocar na fila"
      modalColocarFila && centralSelecionada && renderModalColocarFila({
        vinculos,
        filaAtual: filaCompleta.fila || [],
        emRotaAtual: filaCompleta.em_rota || [],
        fotos,
        onColocar: colocarNaFila,
        onFechar: () => setModalColocarFila(false),
      })
    );
  }

  // ════════════════════════════════════════════════════════════
  // Componentes auxiliares (funções, não componentes React separados)
  // ════════════════════════════════════════════════════════════

  function avatar(cod, nome, foto, size) {
    size = size || 32;
    const partes = (nome || '').trim().split(/\s+/);
    const iniciais = partes.length >= 2
      ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      : (partes[0] || '?').substring(0, 2).toUpperCase();
    if (foto) {
      return e('img', {
        src: foto, alt: nome || '',
        style: { width: size + 'px', height: size + 'px', objectFit: 'cover', border: '1px solid #e5e7eb' },
        className: 'rounded-full flex-shrink-0'
      });
    }
    return e('div', {
      style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.36) + 'px' },
      className: 'rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-semibold flex-shrink-0'
    }, iniciais);
  }

  function formatarMinAtras(iso) {
    if (!iso) return '—';
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s}s atrás`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}min atrás`;
    const h = Math.floor(m / 60);
    return `${h}h${m % 60}min atrás`;
  }

  // 🆕 2026-05-24: formata minutos como "Xmin" ou "Xh Ymin" (padrão fila clássica)
  function formatarTempo(minutos) {
    const m = parseInt(minutos) || 0;
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest === 0 ? `${h}h` : `${h}h ${rest}min`;
  }

  // ──────────────────────────────────────────────────────────
  // Monitor
  // ──────────────────────────────────────────────────────────
  function renderMonitor(opts) {
    const {
      filaCompleta, fotos, logs,
      reordenarMotoboy, removerMotoboy, dispararVarreduraAgora,
      dragData, setDragData, abrirModalColocarFila, totalVinculados,
    } = opts;
    const fila = filaCompleta.fila || [];
    const emRota = filaCompleta.em_rota || [];
    const alertas = filaCompleta.alertas || [];
    const bloqueados = filaCompleta.bloqueados || [];
    const kpis = filaCompleta.kpis || {};
    const totalSemDisp = filaCompleta.total_sem_disponibilidade || 0;  // 🆕 2026-05-24

    const agentePill = (st) => st === 'validado' ? pill('verde', 'validado') : st === 'reprovado' ? pill('vermelho', 'reprovado') : pill('ambar', 'verificando');

    // Linha de motoboy aguardando — com drag-and-drop (igual fila clássica)
    const renderCardAguardando = (p, i) => {
      const arrastando = dragData === p.cod_profissional;
      return e('div', {
        key: p.cod_profissional,
        draggable: true,
        onDragStart: (ev) => {
          ev.dataTransfer.setData('text/plain', p.cod_profissional);
          ev.dataTransfer.effectAllowed = 'move';
          setDragData && setDragData(p.cod_profissional);
        },
        onDragEnd: () => setDragData && setDragData(null),
        onDragOver: (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; },
        onDrop: (ev) => {
          ev.preventDefault();
          const cod = ev.dataTransfer.getData('text/plain');
          if (cod && cod !== p.cod_profissional) reordenarMotoboy(cod, p.posicao);
          setDragData && setDragData(null);
        },
        className: 'px-4 py-3 border-t border-gray-100 cursor-grab active:cursor-grabbing transition-opacity ' + (arrastando ? 'opacity-50 bg-gray-50' : 'bg-white hover:bg-gray-50')
      },
        e('div', { className: 'flex items-center gap-3' },
          e('span', { className: 'text-gray-300 select-none hidden sm:inline', style: { fontSize: '14px' }, 'aria-hidden': 'true' }, '⠿'),
          e('span', { style: { width: 22, textAlign: 'right', fontFamily: SORA, fontWeight: 700, fontSize: 15, color: '#111827', fontVariantNumeric: 'tabular-nums', flex: 'none' } }, p.posicao),
          avatar(p.cod_profissional, p.nome_profissional, fotos[p.cod_profissional], 32),
          e('div', { className: 'flex-1 min-w-0' },
            e('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, p.nome_profissional || '—'),
            e('p', { className: 'text-xs text-gray-500 tabular-nums truncate' }, '#' + p.cod_profissional + ' · ' + formatarMinAtras(p.entrada_fila_at) + ' na fila')
          ),
          // Badge do agente (mantém info auto)
          e('span', { className: 'hidden sm:inline-flex' }, agentePill(p.agente_status)),
          e('button', {
            onClick: () => removerMotoboy(p.cod_profissional, p.nome_profissional),
            className: BTN_ICO_DEST,
            title: 'Remover da fila', 'aria-label': 'Remover da fila'
          }, ico('x', 15))
        ),
        // Status (mobile) + aviso "Sem Disponibilidade" (=== false explícito: backend desatualizado = undefined)
        e('div', { className: 'flex flex-wrap items-center gap-1.5 mt-2 sm:pl-[100px] ' + (p.disponibilidade_alocado === false ? '' : 'sm:hidden') },
          e('span', { className: 'contents sm:hidden' }, agentePill(p.agente_status)),
          p.disponibilidade_alocado === false && pill('vermelho', 'Sem disponibilidade · aloque na escala', 'Este motoboy entrou na fila mas não está alocado em nenhuma disponibilidade. Aloque-o para que apareça nos relatórios do dia.')
        )
      );
    };

    return e('div', { className: 'space-y-4' },
      // === KPIs: faixa única ===
      kpiFaixa([
        kpiCell('Aguardando', kpis.total_aguardando || 0, { dot: '#d97706' }),
        kpiCell('Em rota', kpis.total_em_rota || 0, { dot: '#2563eb' }),
        kpiCell('Alertas +90min', alertas.length, { cor: alertas.length > 0 ? '#991b1b' : '#9ca3af', dot: alertas.length > 0 ? '#dc2626' : null }),
        // 🆕 2026-05-24: KPI de motoboys na fila SEM alocação na disponibilidade
        totalSemDisp > 0 && kpiCell('Sem disponibilidade', totalSemDisp, { cor: '#991b1b', dot: '#dc2626', title: 'Motoboys aguardando na fila mas sem linha em disponibilidade. Aloque-os na escala para que apareçam nos relatórios.' }),
        kpiCell('Vinculados', totalVinculados || 0, { sub: 'motoboys nesta central' }),
      ]),

      // Alertas (se houver)
      alertas.length > 0 && e('div', { className: 'bg-white border border-red-200 rounded-[14px] overflow-hidden' },
        e('div', { className: 'flex flex-wrap items-center gap-2 px-4 py-3 bg-red-50' },
          ico('alert', 16, '#dc2626'),
          e('p', { className: 'text-sm font-semibold text-red-800' }, `Atenção: ${alertas.length} profissional(is) não retornou`),
          e('span', { className: 'text-xs text-red-800' }, '· tempo em rota > 1h30min')
        ),
        alertas.map(p => e('div', { key: p.cod_profissional, className: 'flex items-center gap-3 px-4 py-2.5 border-t border-red-100' },
          e('p', { className: 'flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate' }, p.nome_profissional || '—'),
          e('span', { className: 'text-sm font-semibold text-red-800 tabular-nums' }, `${formatarTempo(p.minutos_em_rota || 0)} em rota`),
          e('button', { onClick: () => removerMotoboy(p.cod_profissional, p.nome_profissional), className: BTN_ICO_DEST, title: 'Remover', 'aria-label': 'Remover' }, ico('x', 15))
        ))
      ),

      // === 2 COLUNAS: Fila de Espera | Em Rota ===
      e('div', { className: 'grid lg:grid-cols-2 gap-4 items-start' },
        // ── FILA DE ESPERA ──
        e('div', { className: CARD + ' overflow-hidden' },
          e('div', { className: 'flex items-center justify-between gap-2 px-4 py-3' },
            tituloCard('Fila de espera', contador(fila.length)),
            e('div', { className: 'flex items-center gap-3' },
              e('span', { className: 'text-xs text-gray-400 hidden sm:inline' }, 'arraste para reordenar'),
              e('button', { onClick: dispararVarreduraAgora, className: BTN_SEC_SM, title: 'Disparar varredura do agente agora' }, ico('refresh', 14), 'Varrer')
            )
          ),
          fila.length === 0
            ? e('div', { className: 'border-t border-gray-100' }, vazio('Nenhum motoboy aguardando.'))
            : e('div', null, fila.map((p, i) => renderCardAguardando(p, i)))
        ),

        // ── EM ROTA ──
        e('div', { className: CARD + ' overflow-hidden' },
          e('div', { className: 'flex items-center justify-between gap-2 px-4 py-3' }, tituloCard('Em rota', contador(emRota.length))),
          emRota.length === 0
            ? e('div', { className: 'border-t border-gray-100' }, vazio('Nenhum motoboy despachado.'))
            : e('div', null, emRota.map(p => {
                const atrasado = (p.minutos_em_rota || 0) > 90;
                return e('div', { key: p.cod_profissional, className: 'flex items-center gap-3 px-4 py-3 border-t border-gray-100' },
                  avatar(p.cod_profissional, p.nome_profissional, fotos[p.cod_profissional], 32),
                  e('div', { className: 'flex-1 min-w-0' },
                    e('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, p.nome_profissional || '—'),
                    e('p', { className: 'text-xs tabular-nums ' + (atrasado ? 'text-red-800 font-semibold' : 'text-gray-500') }, `${formatarTempo(p.minutos_em_rota || 0)} em rota`)
                  ),
                  atrasado ? pill('vermelho', '+1h30') : pill('azul', 'Em rota'),
                  e('button', {
                    onClick: () => removerMotoboy(p.cod_profissional, p.nome_profissional),
                    className: BTN_ICO_DEST,
                    title: 'Tirar de em-rota', 'aria-label': 'Tirar de em-rota'
                  }, ico('x', 15))
                );
              }))
        )
      ),

      // === Bloqueados pelo agente (info útil só pra fila auto) ===
      bloqueados.length > 0 && e('div', { className: CARD + ' overflow-hidden' },
        e('div', { className: 'px-4 py-3' }, tituloCard('Bloqueados pelo agente', contador(bloqueados.length))),
        bloqueados.map(b => e('div', { key: b.cod_profissional, className: 'flex items-center gap-3 px-4 py-2.5 border-t border-gray-100' },
          avatar(b.cod_profissional, b.nome_profissional, fotos[b.cod_profissional], 28),
          e('div', { className: 'flex-1 min-w-0' },
            e('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, b.nome_profissional || '—'),
            e('p', { className: 'text-xs text-gray-500 tabular-nums' }, '#' + b.cod_profissional)
          ),
          pill('vermelho', b.motivo || 'corrida ativa')
        ))
      ),

      // === Log resumido (últimos 5) ===
      logs && logs.length > 0 && e('div', { className: CARD + ' overflow-hidden' },
        e('div', { className: 'px-4 py-3' }, tituloCard('Log do agente', e('span', { className: 'text-xs text-gray-500' }, 'últimas ações'))),
        e('div', null, logs.slice(0, 5).map(l => renderLogLine(l)))
      )
    );
  }

  // ──────────────────────────────────────────────────────────
  // Modal: colocar motoboy na fila manualmente
  // 🆕 2026-05-24: igual padrão da fila clássica
  // ──────────────────────────────────────────────────────────
  function renderModalColocarFila(opts) {
    const { vinculos, filaAtual, emRotaAtual, fotos, onColocar, onFechar } = opts;
    const codsOcupados = new Set([
      ...(filaAtual || []).map(p => p.cod_profissional),
      ...(emRotaAtual || []).map(p => p.cod_profissional),
    ]);
    const disponiveis = (vinculos || []).filter(v => !codsOcupados.has(v.cod_profissional));

    return modalBox({
      titulo: 'Colocar na fila',
      sub: 'Motoboys vinculados fora da fila',
      onOverlay: onFechar,
      onFechar,
      corpo: disponiveis.length === 0
        ? vazio('Todos os motoboys vinculados já estão na fila ou em rota.')
        : e('div', { className: 'border border-gray-200 rounded-[10px] overflow-hidden' },
            disponiveis.map(v => {
              const cod = v.cod_profissional;
              const nome = v.nome_profissional || '—';
              return e('button', {
                key: cod,
                onClick: () => onColocar(cod, nome),
                className: 'w-full flex items-center gap-3 px-3 py-2.5 border-t border-gray-100 first:border-t-0 hover:bg-gray-50 transition-colors text-left',
              },
                avatar(cod, nome, fotos[cod], 28),
                e('div', { className: 'flex-1 min-w-0' },
                  e('p', { className: 'text-sm font-medium text-gray-900 truncate' }, nome),
                  e('p', { className: 'text-xs text-gray-500 tabular-nums' }, '#', cod)
                ),
                e('span', { className: 'inline-flex items-center gap-1 text-xs font-semibold text-purple-700 flex-shrink-0' }, ico('plus', 14), 'Adicionar')
              );
            })
          ),
      rodape: e('button', { onClick: onFechar, className: BTN_SEC }, 'Fechar')
    });
  }

  function kpi(label, value, cor) {
    return e('div', { className: 'p-3' },
      e('p', { className: 'text-xs text-gray-500' }, label),
      e('p', { className: 'text-xl font-semibold mt-0.5 tabular-nums', style: { color: cor || '#111827', fontFamily: SORA } }, value)
    );
  }

  // ──────────────────────────────────────────────────────────
  // ConfigPanel — componente React (não função imperativa!)
  // 🔄 2026-05-23: era function renderConfig com useState dentro, o que
  // violava as regras dos hooks (montagem/desmontagem condicional ao trocar
  // de aba causava React error #310). Agora é componente real, isolando os
  // hooks no próprio escopo do componente.
  // ──────────────────────────────────────────────────────────
  function ConfigPanel({ central, salvarCentral, excluirCentral }) {
    const [dados, setDados] = React.useState({ ...central });

    React.useEffect(() => { setDados({ ...central }); }, [central?.id]);

    const setCampo = (k, v) => setDados(d => ({ ...d, [k]: v }));
    const secao = (titulo, sub, ...filhos) => e('div', { className: CARD + ' p-4 space-y-3' },
      e('div', null, e('h2', { className: 'text-[15px] font-semibold text-gray-900' }, titulo), sub && e('p', { className: 'text-xs text-gray-500 mt-0.5' }, sub)),
      ...filhos);
    const linhaSelect = (titulo, sub, el) => e('div', { className: 'flex items-center justify-between gap-3 pt-3 border-t border-gray-100' },
      e('div', { className: 'min-w-0' }, e('p', { className: 'text-sm font-medium text-gray-900' }, titulo), sub && e('p', { className: 'text-xs text-gray-500' }, sub)),
      el);

    return e('div', { className: 'space-y-4' },
      e('div', { className: 'grid lg:grid-cols-2 gap-4 items-start' },
        secao('Identificação', null,
          labelInput('Nome', dados.nome || '', v => setCampo('nome', v)),
          labelInput('Endereço', dados.endereco || '', v => setCampo('endereco', v)),
        ),
        secao('Localização e raio', null,
          e('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
            labelInput('Latitude', dados.latitude || '', v => setCampo('latitude', v)),
            labelInput('Longitude', dados.longitude || '', v => setCampo('longitude', v)),
            labelInput('Raio (m)', dados.raio_metros || 900, v => setCampo('raio_metros', parseInt(v) || 900), 'number'),
          )
        ),
        secao('Validação automática', 'Agente Playwright',
          toggle('Bloquear se motoboy tem corrida ativa',
            'Agente busca no sistema externo · valida após entrada',
            dados.validacao_agente_ativa !== false,
            v => setCampo('validacao_agente_ativa', v)),
          toggle('Remover automaticamente ao pegar corrida',
            'Agente fica monitorando · tira da fila quando detecta nova corrida',
            dados.remover_ao_pegar_corrida !== false,
            v => setCampo('remover_ao_pegar_corrida', v)),
          linhaSelect('Frequência de varredura', 'Intervalo entre checagens do agente',
            e('select', {
              value: dados.varredura_intervalo_seg || 30,
              onChange: ev => setCampo('varredura_intervalo_seg', parseInt(ev.target.value)),
              className: SELECT
            },
              e('option', { value: 15 }, '15 segundos'),
              e('option', { value: 30 }, '30 segundos'),
              e('option', { value: 60 }, '1 minuto'),
              e('option', { value: 120 }, '2 minutos'),
            ))
        ),
        secao('Regras dos motoboys', null,
          toggle('Mostrar nomes de todos na fila',
            'Motoboys veem quem está à frente e atrás (transparência)',
            dados.mostrar_nomes_publicos !== false,
            v => setCampo('mostrar_nomes_publicos', v)),
          linhaSelect('Penalidade por sair voluntariamente', 'Tempo de bloqueio antes de poder reentrar',
            e('select', {
              value: dados.penalidade_min || 0,
              onChange: ev => setCampo('penalidade_min', parseInt(ev.target.value)),
              className: SELECT
            },
              e('option', { value: 0 }, 'Sem penalidade'),
              e('option', { value: 5 }, '5 minutos'),
              e('option', { value: 10 }, '10 minutos'),
              e('option', { value: 30 }, '30 minutos'),
            ))
        ),
        secao('Barreira de horário de ingresso', null,
          toggle('Ativar barreira de horário',
            'Bloqueia motoboys que tentam entrar na fila pela 1ª vez no dia após o horário configurado',
            dados.barreira_horario_ativa || false,
            v => setCampo('barreira_horario_ativa', v)),
          dados.barreira_horario_ativa && linhaSelect('Horário de corte', 'Após este horário, 1º ingresso do dia é bloqueado',
            e('input', {
              type: 'time',
              value: dados.barreira_horario_corte ? dados.barreira_horario_corte.slice(0,5) : '08:00',
              onChange: ev => setCampo('barreira_horario_corte', ev.target.value + ':00'),
              className: SELECT + ' tabular-nums'
            })),
          dados.barreira_horario_ativa && e('div', { className: 'flex items-start gap-2 rounded-[10px] bg-amber-50 px-3 py-2' },
            ico('alert', 15, '#d97706'),
            e('p', { className: 'text-xs text-amber-800 leading-relaxed' }, 'Motoboys bloqueados pela barreira aparecem na aba Punidos. Você pode liberar manualmente um a um se necessário.')
          )
        )
      ),

      e('div', { className: 'flex flex-wrap justify-between items-center gap-3' },
        e('button', { onClick: () => excluirCentral(dados), className: BTN_DEST }, ico('trash', 16), 'Excluir central'),
        e('button', { onClick: () => salvarCentral(dados), className: BTN_PRI }, ico('save', 16), 'Salvar')
      )
    );
  }

  function toggle(titulo, sub, checked, onChange) {
    return e('div', { className: 'flex items-center justify-between gap-3 py-0.5' },
      e('div', { className: 'flex-1 min-w-0' },
        e('p', { className: 'text-sm font-medium text-gray-900' }, titulo),
        sub && e('p', { className: 'text-xs text-gray-500' }, sub),
      ),
      e('label', {
        className: 'relative inline-block w-9 h-5 rounded-full cursor-pointer transition-colors flex-shrink-0',
        style: { background: checked ? '#770fa8' : '#d1d5db' },
        role: 'switch', 'aria-checked': !!checked, 'aria-label': titulo,
        onClick: () => onChange(!checked)
      },
        e('span', {
          className: 'absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all',
          style: { left: checked ? 'calc(100% - 18px)' : '2px' }
        })
      )
    );
  }

  function labelInput(label, value, onChange, type) {
    return e('div', null,
      e('label', { className: LABEL }, label),
      e('input', {
        type: type || 'text',
        value: value,
        onChange: ev => onChange(ev.target.value),
        className: INPUT
      })
    );
  }

  // ──────────────────────────────────────────────────────────
  // Vínculos
  // ──────────────────────────────────────────────────────────
  function renderVinculos(opts) {
    const { vinculos, fotos, profissionais, busca, setBusca, modalVincular, setModalVincular, vincularProfissional, desvincularProfissional } = opts;
    const codsVinculados = new Set(vinculos.map(v => String(v.cod_profissional)));
    const disponiveis = (profissionais || [])
      .filter(p => p.cod_profissional && !codsVinculados.has(String(p.cod_profissional)))
      .filter(p => {
        if (!busca) return true;
        const q = busca.toLowerCase();
        return (p.nome_profissional || '').toLowerCase().includes(q)
          || String(p.cod_profissional).includes(q);
      })
      .slice(0, 50);

    return e('div', { className: CARD + ' overflow-hidden' },
      e('div', { className: 'flex flex-wrap justify-between items-center gap-3 px-4 py-3' },
        tituloCard('Motoboys vinculados', contador(vinculos.length)),
        e('button', { onClick: () => setModalVincular(true), className: BTN_PRI }, ico('plus', 16), 'Vincular motoboy')
      ),

      vinculos.length === 0
        ? e('div', { className: 'border-t border-gray-100' }, vazio('Nenhum motoboy vinculado ainda.'))
        : e('div', null, vinculos.map(v => e('div', {
            key: v.cod_profissional,
            className: 'flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 hover:bg-gray-50'
          },
            avatar(v.cod_profissional, v.nome_profissional, fotos[v.cod_profissional], 32),
            e('div', { className: 'flex-1 min-w-0' },
              e('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, v.nome_profissional || '—'),
              e('p', { className: 'text-xs text-gray-500 tabular-nums' }, 'cod ', v.cod_profissional),
            ),
            e('button', {
              onClick: () => desvincularProfissional(v.cod_profissional),
              title: 'Desvincular',
              className: BTN_DEST_SM
            }, ico('x', 14), e('span', { className: 'hidden sm:inline' }, 'Desvincular'))
          ))),

      // Modal vincular
      modalVincular && modalBox({
        titulo: 'Vincular motoboy à central',
        onOverlay: () => setModalVincular(false),
        onFechar: () => { setModalVincular(false); setBusca(''); },
        corpo: e('div', { className: 'space-y-3 pt-1' },
          e('div', { className: 'relative' },
            e('span', { className: 'absolute left-3 top-1/2 -translate-y-1/2 inline-flex text-gray-400' }, ico('search', 15)),
            e('input', {
              autoFocus: true,
              placeholder: 'Buscar por nome ou código...',
              value: busca,
              onChange: ev => setBusca(ev.target.value),
              className: INPUT + ' pl-9'
            })
          ),
          disponiveis.length === 0
            ? vazio(busca ? 'Nenhum motoboy encontrado' : 'Digite pra buscar...')
            : e('div', { className: 'border border-gray-200 rounded-[10px] overflow-hidden' }, disponiveis.map(p => e('button', {
                key: p.cod_profissional,
                onClick: () => { vincularProfissional(p.cod_profissional, p.nome_profissional); setModalVincular(false); setBusca(''); },
                className: 'w-full flex items-center gap-3 px-3 py-2.5 border-t border-gray-100 first:border-t-0 hover:bg-gray-50 text-left'
              },
                avatar(p.cod_profissional, p.nome_profissional, null, 28),
                e('div', { className: 'flex-1 min-w-0' },
                  e('p', { className: 'text-sm font-medium text-gray-900 truncate' }, p.nome_profissional),
                  e('p', { className: 'text-xs text-gray-500 tabular-nums' }, 'cod ', p.cod_profissional)
                ),
                e('span', { className: 'inline-flex items-center gap-1 text-xs font-semibold text-purple-700 flex-shrink-0' }, ico('plus', 14), 'Vincular')
              )))
        ),
        rodape: e('button', { onClick: () => { setModalVincular(false); setBusca(''); }, className: BTN_SEC }, 'Fechar')
      })
    );
  }

  // ──────────────────────────────────────────────────────────
  // Logs (aba completa)
  // ──────────────────────────────────────────────────────────
  function renderLogs(opts) {
    const { logs } = opts;
    return e('div', { className: CARD + ' overflow-hidden' },
      e('div', { className: 'px-4 py-3' }, tituloCard('Histórico do agente', contador(`${logs.length} eventos`))),
      logs.length === 0
        ? e('div', { className: 'border-t border-gray-100' }, vazio('Nenhum evento ainda.'))
        : e('div', null, logs.map(l => renderLogLine(l)))
    );
  }

  function renderLogLine(l) {
    const tom = l.acao === 'removeu' || l.acao === 'admin_removeu' ? 'vermelho'
      : l.acao === 'validou' ? 'verde'
      : l.acao === 'bloqueou_entrada' ? 'ambar'
      : 'cinza';
    return e('div', {
      key: l.id, className: 'flex items-center gap-3 px-4 py-2 border-t border-gray-100 text-sm',
      title: l.detalhes ? JSON.stringify(l.detalhes) : ''
    },
      e('span', { className: 'w-16 sm:w-24 flex-shrink-0 text-xs text-gray-500 tabular-nums' }, formatarMinAtras(l.created_at)),
      e('span', { className: 'flex-shrink-0' }, pill(tom, l.acao.replace(/_/g, ' '))),
      e('span', { className: 'flex-1 min-w-0 truncate text-gray-700' },
        l.nome_profissional ? e('span', { className: 'font-medium text-gray-900' }, l.nome_profissional) : null,
        l.nome_profissional && l.motivo ? ' · ' : '',
        l.motivo ? e('span', { className: 'text-gray-500' }, l.motivo) : ''
      )
    );
  }

  // ──────────────────────────────────────────────────────────
  // Modal de criar/editar central
  // ──────────────────────────────────────────────────────────
  function renderModalCentral(opts) {
    const { dados, onChange, onSalvar, onCancelar,
            buscarEnderecoDebounced, buscandoEndereco, enderecoValidado, coordenadasEncontradas,
            modoManual, setModoManual, geocodeDown } = opts;
    const setCampo = (k, v) => onChange({ ...dados, [k]: v });

    const podeSalvar = dados.nome && (
      modoManual
        ? (dados.latitude && dados.longitude)
        : (dados.endereco && enderecoValidado && coordenadasEncontradas)
    );

    return modalBox({
      largura: 'max-w-lg',
      titulo: dados.id ? 'Editar central auto' : 'Nova central auto-gerenciável',
      sub: 'Motoboys se organizam · agente Playwright fiscaliza',
      onOverlay: onCancelar,
      onFechar: onCancelar,
      corpo: e('div', { className: 'space-y-4 pt-1' },
        // Nome
        labelInput('Nome *', dados.nome || '', v => setCampo('nome', v)),

        // Aviso quando API caiu
        geocodeDown && !modoManual && e('div', { className: 'rounded-[10px] bg-amber-50 p-3 space-y-2' },
          e('p', { className: 'inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800' }, ico('alert', 15, '#d97706'), 'Busca automática indisponível'),
          e('p', { className: 'text-xs text-amber-800' }, 'A API do Google de busca de endereço está fora. Use o modo manual:'),
          e('button', { onClick: () => setModoManual(true), className: BTN_SEC_SM }, ico('pin', 14), 'Inserir coordenadas manualmente')
        ),

        // ── MODO MANUAL (coordenadas) ──
        modoManual ? e(React.Fragment, null,
          labelInput('Endereço (opcional)', dados.endereco || '', v => setCampo('endereco', v)),
          e('div', { className: 'grid grid-cols-2 gap-3' },
            labelInput('Latitude *', dados.latitude || '', v => setCampo('latitude', v)),
            labelInput('Longitude *', dados.longitude || '', v => setCampo('longitude', v)),
          ),
          e('div', { className: 'rounded-[10px] bg-gray-50 p-3 text-xs text-gray-600 space-y-1' },
            e('p', { className: 'inline-flex items-center gap-1.5 font-semibold text-gray-900' }, ico('bulb', 14, '#6b7280'), 'Como pegar latitude/longitude'),
            e('p', null, 'Abra o Google Maps no local da loja → botão direito no ponto exato → o primeiro número é latitude, o segundo é longitude.'),
            e('button', { onClick: () => setModoManual(false), className: 'inline-flex items-center gap-1 text-purple-700 font-semibold hover:text-purple-800 mt-1' }, ico('arrowleft', 12), 'Voltar a buscar por endereço')
          )
        ) : e('div', null,
          // ── MODO BUSCA POR ENDEREÇO ──
          e('label', { className: LABEL }, 'Endereço *'),
          e('div', { className: 'relative' },
            e('input', {
              type: 'text',
              value: dados.endereco || '',
              placeholder: 'Ex: Rua das Flores, 123, Salvador BA',
              onChange: ev => {
                const v = ev.target.value;
                setCampo('endereco', v);
                buscarEnderecoDebounced(v);
              },
              className: INPUT + ' pr-10' + (enderecoValidado ? ' border-green-600' : '')
            }),
            e('span', { className: 'absolute right-3 top-1/2 -translate-y-1/2 inline-flex' }, buscandoEndereco ? ico('clock', 16, '#6b7280') : enderecoValidado ? ico('check', 16, '#16a34a') : ico('search', 16, '#9ca3af'))
          ),
          enderecoValidado && coordenadasEncontradas && e('p', { className: 'inline-flex items-center gap-1.5 text-xs text-green-800 mt-1.5 tabular-nums' }, dot('#16a34a'), `${coordenadasEncontradas.latitude.toFixed(6)}, ${coordenadasEncontradas.longitude.toFixed(6)}`),
          // Link discreto pra entrar no modo manual mesmo sem erro
          !geocodeDown && e('button', { onClick: () => setModoManual(true), className: 'block text-xs text-gray-500 hover:text-purple-700 underline mt-1.5' }, 'ou inserir coordenadas manualmente')
        ),

        // Raio
        labelInput('Raio (metros)', dados.raio_metros || 900, v => setCampo('raio_metros', parseInt(v) || 900), 'number'),

        e('div', { className: 'border border-gray-200 rounded-[10px] p-3 space-y-3' },
          e('p', { className: 'text-xs font-semibold text-gray-700' }, 'Validação do agente'),
          toggle('Bloquear se motoboy tem corrida ativa', 'Agente checa no sistema externo',
            dados.validacao_agente_ativa !== false, v => setCampo('validacao_agente_ativa', v)),
          toggle('Remover automaticamente ao pegar corrida', 'Tira da fila quando detecta nova corrida',
            dados.remover_ao_pegar_corrida !== false, v => setCampo('remover_ao_pegar_corrida', v)),
          e('div', { className: 'flex items-center justify-between gap-3 pt-3 border-t border-gray-100' },
            e('p', { className: 'text-sm font-medium text-gray-900' }, 'Frequência de varredura'),
            e('select', {
              value: dados.varredura_intervalo_seg || 30,
              onChange: ev => setCampo('varredura_intervalo_seg', parseInt(ev.target.value)),
              className: SELECT
            },
              e('option', { value: 15 }, '15s'),
              e('option', { value: 30 }, '30s'),
              e('option', { value: 60 }, '1min'),
              e('option', { value: 120 }, '2min'),
            )
          )
        ),

        e('div', { className: 'border border-gray-200 rounded-[10px] p-3 space-y-3' },
          e('p', { className: 'text-xs font-semibold text-gray-700' }, 'Regras dos motoboys'),
          toggle('Mostrar nomes na fila', 'Motoboys veem quem está à frente',
            dados.mostrar_nomes_publicos !== false, v => setCampo('mostrar_nomes_publicos', v)),
          e('div', { className: 'flex items-center justify-between gap-3 pt-3 border-t border-gray-100' },
            e('p', { className: 'text-sm font-medium text-gray-900' }, 'Penalidade ao sair voluntariamente'),
            e('select', {
              value: dados.penalidade_min || 0,
              onChange: ev => setCampo('penalidade_min', parseInt(ev.target.value)),
              className: SELECT
            },
              e('option', { value: 0 }, 'Sem penalidade'),
              e('option', { value: 5 }, '5 min'),
              e('option', { value: 10 }, '10 min'),
              e('option', { value: 30 }, '30 min'),
            )
          )
        )
      ),
      rodape: [
        e('button', { key: 'c', onClick: onCancelar, className: BTN_SEC }, 'Cancelar'),
        e('button', {
          key: 's',
          onClick: () => onSalvar(dados),
          disabled: !podeSalvar,
          className: BTN_PRI
        }, dados.id ? e(React.Fragment, null, ico('save', 16), 'Salvar') : e(React.Fragment, null, ico('bot', 16), 'Criar central auto'))
      ]
    });
  }

  // Exporta
  window.ModuloFilasAuto = ModuloFilasAuto;
  console.log('✅ ModuloFilasAuto carregado');
})();
