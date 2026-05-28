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
  const e = React.createElement;

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
          toast('📍 Endereço encontrado!', 'success');
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
          if (!enderecoValidado || !coordenadasEncontradas) {
            toast('Aguarde a validação do endereço (✅) antes de salvar', 'error');
            return null;
          }
          latFinal = coordenadasEncontradas.latitude;
          lngFinal = coordenadasEncontradas.longitude;
          enderecoFinal = coordenadasEncontradas.enderecoFormatado || dados.endereco;
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
      return e('div', { className: 'p-8 text-center text-gray-500' },
        'Esta tela é apenas para admin.'
      );
    }

    // ════════════════════════════════════════════════════════
    // RENDER — lista de centrais (quando nenhuma está selecionada)
    // ════════════════════════════════════════════════════════
    if (!centralSelecionada) {
      return e(React.Fragment, null,
        // 🆕 2026-05-24: CSS pra animações (stagger + zoom-fade + hover)
        e('style', null, `
          @keyframes filaCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes filaCardZoomOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(1.03); } }
          @keyframes filaTelaZoomIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
          .fila-card { opacity: 0; animation: filaCardIn 280ms ease forwards; transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease; }
          .fila-card:hover { border-color: rgba(0,0,0,0.18); transform: translateY(-1px); box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
          .fila-card:active { transform: scale(0.985); }
          .fila-card.is-clicked { animation: filaCardZoomOut 280ms ease forwards; pointer-events: none; }
        `),
        e('div', { className: 'space-y-4 p-2' },
        // Header
        e('div', { className: 'flex items-center justify-between gap-3' },
          e('div', null,
            e('h2', { className: 'text-lg font-semibold text-gray-800 flex items-center gap-2' },
              e('span', null, '🤖'), 'Filas auto-gerenciáveis'
            ),
            e('p', { className: 'text-sm text-gray-500 mt-0.5' },
              'Motoboys se organizam · agente Playwright valida no sistema externo'
            )
          ),
          e('button', {
            onClick: () => setModalCentral({
              tipo: 'auto',
              raio_metros: 900,
              validacao_agente_ativa: true,
              varredura_intervalo_seg: 30,
              remover_ao_pegar_corrida: true,
              mostrar_nomes_publicos: true,
              penalidade_min: 10,
              ativa: true,
            }),
            className: 'px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-1'
          }, '➕ Nova central auto')
        ),

        // Lista
        loading
          ? e('div', { className: 'text-center py-12 text-gray-400' }, 'Carregando...')
          : centrais.length === 0
            ? e('div', {
                className: 'border border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50'
              },
                e('div', { className: 'text-4xl mb-2' }, '🤖'),
                e('p', { className: 'text-gray-700 font-medium' }, 'Nenhuma central auto-gerenciável ainda'),
                e('p', { className: 'text-gray-500 text-sm mt-1' }, 'Clique em "Nova central auto" pra começar'),
              )
            : e('div', {
                className: 'fila-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
              },
                centrais.map((c, idx) => {
                  const corBarra = !c.ativa ? '#B4B2A9' : '#534AB7'; // roxa pra auto, cinza pra inativa
                  return e('div', {
                    key: c.id,
                    id: `fila-card-${c.id}`,
                    className: `fila-card bg-white border ${c.ativa ? 'border-gray-200' : 'border-gray-200 opacity-55'}`,
                    style: {
                      borderRadius: '12px',
                      padding: '14px 16px 14px 12px',
                      display: 'flex',
                      gap: '12px',
                      cursor: 'pointer',
                      animationDelay: `${Math.min(idx * 35, 350)}ms`
                    },
                    onClick: (ev) => {
                      const card = ev.currentTarget;
                      card.classList.add('is-clicked');
                      window.__tuttsFilaShared = { nome: c.nome, ehAuto: true, ativa: c.ativa };
                      setTimeout(() => setCentralSelecionada(c), 280);
                    }
                  },
                    // Barra lateral roxa (auto)
                    e('div', { style: { width: '3px', background: corBarra, borderRadius: '999px', flexShrink: 0 } }),
                    // Conteúdo
                    e('div', { style: { flex: 1, minWidth: 0 } },
                      // Header (nome + endereço + badge)
                      e('div', {
                        style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }
                      },
                        e('div', { style: { minWidth: 0 } },
                          e('p', { style: { fontSize: '14px', fontWeight: 500, margin: '0 0 2px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c.nome),
                          e('p', { style: { fontSize: '11px', color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                            `${c.endereco || 'Sem endereço'} · ${c.total_vinculados || 0} vinculado${(c.total_vinculados || 0) === 1 ? '' : 's'}`
                          )
                        ),
                        !c.ativa
                          ? e('span', { style: { fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#FCEBEB', color: '#791F1F', fontWeight: 500, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' } }, 'Inativa')
                          : e('span', { style: { fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#EEEDFE', color: '#3C3489', fontWeight: 500, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' } }, '🤖 Auto')
                      ),
                      // Stats
                      e('div', { style: { display: 'flex', gap: '18px' } },
                        e('div', null,
                          e('p', { style: { fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em' } }, 'Na fila'),
                          e('p', { style: { fontSize: '24px', fontWeight: 500, margin: '2px 0 0', lineHeight: 1, color: '#111827' } }, c.na_fila || 0)
                        ),
                        e('div', { style: { width: '0.5px', background: 'rgba(0,0,0,0.08)' } }),
                        e('div', null,
                          e('p', { style: { fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em' } }, 'Em rota'),
                          e('p', { style: { fontSize: '24px', fontWeight: 500, margin: '2px 0 0', lineHeight: 1, color: '#111827' } }, c.em_rota || 0)
                        )
                      )
                    )
                  );
                })
              )
        ),
        // 🆕 FIX: modal precisa estar disponível TAMBÉM no early-return da lista,
        // senão clicar "Nova central auto" muda o state mas nada renderiza.
        modalCentral && renderModalCentral({
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
        })
      );
    }

    // ════════════════════════════════════════════════════════
    // RENDER — central selecionada (tabs)
    // ════════════════════════════════════════════════════════
    return e('div', { className: 'space-y-3', style: { animation: 'filaTelaZoomIn 280ms ease' } },
      // CSS pra animação de entrada (caso o usuário entre direto na tela)
      e('style', null, `@keyframes filaTelaZoomIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`),
      // Header com voltar
      e('div', { className: 'flex items-center gap-2' },
        e('button', {
          onClick: () => setCentralSelecionada(null),
          className: 'text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1'
        }, '← Voltar'),
        e('span', { className: 'text-gray-300' }, '·'),
        e('h2', { className: 'text-lg font-semibold text-gray-800 flex items-center gap-2' },
          e('span', null, '📍'), centralSelecionada.nome
        ),
        e('span', {
          className: `text-[10px] px-2 py-0.5 rounded font-medium ml-auto ${centralSelecionada.validacao_agente_ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`
        }, centralSelecionada.validacao_agente_ativa ? '🤖 agente ativo' : 'agente desligado')
      ),

      // Tabs
      e('div', { className: 'bg-white border border-gray-200 rounded-xl p-1 flex gap-1' },
        ['monitor', 'config', 'vinculos', 'penalidades', 'logs'].map(aba => e('button', {
          key: aba,
          onClick: () => setAbaAtiva(aba),
          className: `flex-1 px-3 py-1.5 rounded-lg text-sm font-medium ${abaAtiva === aba ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`
        }, aba === 'monitor' ? 'Monitor' : aba === 'config' ? 'Configuração' : aba === 'vinculos' ? 'Vínculos' : aba === 'penalidades' ? `🚫 Punidos${penalidades.length > 0 ? ' (' + penalidades.length + ')' : ''}` : 'Logs do agente'))
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

      // === ABA LOGS ===
      abaAtiva === 'penalidades' && e('div', { className: 'space-y-3' },
        // Header
        e('div', { className: 'flex items-center justify-between' },
          e('h3', { className: 'font-semibold text-gray-800' }, '🚫 Motoboys punidos'),
          e('button', {
            onClick: () => carregarPenalidades(centralSelecionada.id),
            className: 'text-xs px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600'
          }, loadingPenal ? '⏳ Carregando...' : '🔄 Atualizar')
        ),
        // Info
        e('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800' },
          'Punições são aplicadas automaticamente quando o motoboy sai da fila voluntariamente. ',
          'Só remova se houver motivo legítimo (ex: emergência).'
        ),
        // Lista
        loadingPenal
          ? e('div', { className: 'text-center py-8 text-gray-400' }, '⏳ Carregando...')
          : penalidades.length === 0
            ? e('div', { className: 'text-center py-10 text-gray-400' },
                e('span', { className: 'text-4xl block mb-2' }, '✅'),
                e('p', { className: 'text-sm' }, 'Nenhum motoboy punido no momento')
              )
            : e('div', { className: 'space-y-2' }, penalidades.map(p => {
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
                const badgeClass = ehManual ? 'bg-purple-100 text-purple-700'
                  : ehBarreira ? 'bg-orange-100 text-orange-700'
                  : 'bg-red-100 text-red-700';
                const badgeLabel = ehManual ? 'manual' : ehBarreira ? '⏰ horário' : 'automática';
                const subLabel = ehManual
                  ? `Aplicada por ${p.aplicado_por_nome || 'admin'}`
                  : ehBarreira
                    ? (p.motivo_admin || 'Acesso após horário de corte')
                    : `${p.saidas_hoje || 0} saída(s) hoje`;
                return e('div', { key: p.id, className: 'bg-white border border-red-200 rounded-xl p-4' },
                  e('div', { className: 'flex items-start justify-between gap-3 mb-3' },
                    e('div', { className: 'flex-1 min-w-0' },
                      e('div', { className: 'flex items-center gap-2 mb-0.5' },
                        e('p', { className: 'font-bold text-gray-800 truncate' }, p.nome_profissional || `#${p.cod_profissional}`),
                        e('span', { className: `text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeClass}` }, badgeLabel)
                      ),
                      e('p', { className: 'text-xs text-gray-500' }, subLabel)
                    ),
                    e('button', {
                      onClick: () => anularPenalidade(p),
                      className: 'flex-shrink-0 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700'
                    }, '✅ Remover punição')
                  ),
                  // Barra de progresso do tempo restante
                  e('div', { className: 'mb-1.5' },
                    e('div', { className: 'flex justify-between text-[11px] text-gray-500 mb-1' },
                      e('span', null, '⏳ Tempo restante'),
                      e('span', { className: 'font-medium text-red-600' }, restLabel)
                    ),
                    e('div', { className: 'h-1.5 bg-red-100 rounded-full overflow-hidden' },
                      e('div', { className: 'h-full bg-red-400 rounded-full transition-all', style: { width: pct + '%' } })
                    )
                  ),
                  p.motivo_admin && e('p', { className: 'text-xs text-gray-500 mt-1.5 italic' }, `Motivo: ${p.motivo_admin}`)
                );
              }))
      ),
      abaAtiva === 'logs' && renderLogs({ logs }),

      // Modal de nova/editar central
      modalCentral && renderModalCentral({
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
      }),

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
        style: { width: size + 'px', height: size + 'px', objectFit: 'cover', border: '0.5px solid #E5E7EB' },
        className: 'rounded-full flex-shrink-0'
      });
    }
    return e('div', {
      style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.36) + 'px' },
      className: 'rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-semibold flex-shrink-0'
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

    // Card de motoboy aguardando — com drag-and-drop (igual fila clássica)
    const renderCardAguardando = (p, i) => {
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
        className: `border rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all ${dragData === p.cod_profissional ? 'opacity-50 scale-95' : ''} border-gray-200 bg-white`
      },
        // Linha 1: handle + posição + avatar + nome
        e('div', { className: 'flex items-center gap-2.5 mb-2' },
          e('span', { className: 'text-gray-300', style: { fontSize: '14px' } }, '⠿'),
          e('div', {
            className: `w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${i === 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`
          }, p.posicao),
          avatar(p.cod_profissional, p.nome_profissional, fotos[p.cod_profissional], 28),
          e('div', { className: 'flex-1 min-w-0' },
            e('p', { className: 'font-medium text-sm text-gray-900 truncate' }, p.nome_profissional || '—'),
            e('div', { className: 'flex items-center gap-2 text-xs text-gray-500' },
              e('span', null, '#', p.cod_profissional),
              e('span', null, '·'),
              e('span', null, formatarMinAtras(p.entrada_fila_at), ' na fila')
            )
          ),
          // Badge do agente (mantém info auto)
          p.agente_status === 'validado'
            ? e('span', { className: 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700' }, '✓ validado')
            : p.agente_status === 'reprovado'
              ? e('span', { className: 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700' }, '× reprovado')
              : e('span', { className: 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800' }, 'verificando')
        ),
        // 🆕 2026-05-24 (v4): aviso "Sem Disponibilidade" — motoboy na fila mas sem linha em disponibilidade_linhas
        // Força admin a alocar (caso contrário ele não vai aparecer nos relatórios/dashboards do dia)
        // 🔧 v4: comparação === false explícita pra não disparar quando backend está desatualizado (undefined)
        p.disponibilidade_alocado === false && e('div', {
          className: 'flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mb-2',
          title: 'Este motoboy entrou na fila mas não está alocado em nenhuma disponibilidade. Aloque-o para que apareça nos relatórios do dia.'
        },
          e('span', { className: 'text-base' }, '⚠️'),
          e('span', { className: 'text-xs font-semibold text-red-700' }, 'Sem Disponibilidade'),
          e('span', { className: 'text-[10px] text-red-600 ml-auto' }, 'Aloque na escala'),
        ),
        // Linha 2: ação remover (mantida)
        e('div', { className: 'flex justify-end' },
          e('button', {
            onClick: () => removerMotoboy(p.cod_profissional, p.nome_profissional),
            className: 'text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded',
            title: 'Remover da fila'
          }, '× Remover')
        )
      );
    };

    return e('div', { className: 'space-y-4' },
      // Header com botão "Colocar na fila" (padrão clássica)
      e('div', { className: 'flex items-center justify-end' },
        e('button', {
          onClick: abrirModalColocarFila,
          className: 'px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1',
        }, '➕ ', e('span', { className: 'hidden sm:inline' }, 'Colocar na fila'))
      ),

      // === KPIs (3 cards padrão clássica: Aguardando, Em Rota, Alertas +90min + 4º Sem Disp. quando houver) ===
      e('div', { className: `grid gap-2 ${totalSemDisp > 0 ? 'grid-cols-4' : 'grid-cols-3'}` },
        e('div', { className: 'bg-white border border-gray-200 rounded-xl p-3' },
          e('div', { className: 'text-xs text-gray-500 mb-1' }, 'Aguardando'),
          e('div', { className: 'text-2xl font-semibold text-blue-700' }, kpis.total_aguardando || 0)
        ),
        e('div', { className: 'bg-white border border-gray-200 rounded-xl p-3' },
          e('div', { className: 'text-xs text-gray-500 mb-1' }, 'Em Rota'),
          e('div', { className: 'text-2xl font-semibold text-green-700' }, kpis.total_em_rota || 0)
        ),
        e('div', { className: `bg-white border rounded-xl p-3 ${alertas.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'}` },
          e('div', { className: 'text-xs text-gray-500 mb-1' }, 'Alertas +90min'),
          e('div', { className: `text-2xl font-semibold ${alertas.length > 0 ? 'text-red-700' : 'text-gray-400'}` }, alertas.length)
        ),
        // 🆕 2026-05-24: KPI de motoboys na fila SEM alocação na disponibilidade
        totalSemDisp > 0 && e('div', {
          className: 'bg-red-50 border border-red-300 rounded-xl p-3',
          title: 'Motoboys aguardando na fila mas sem linha em disponibilidade. Aloque-os na escala para que apareçam nos relatórios.'
        },
          e('div', { className: 'text-xs text-red-700 mb-1 font-medium' }, '⚠️ Sem Disp.'),
          e('div', { className: 'text-2xl font-semibold text-red-700' }, totalSemDisp)
        )
      ),

      // Linha contexto vinculados
      e('div', { className: 'text-xs text-gray-400 text-right -mt-2' },
        '📍 ', totalVinculados || 0, ' motoboys vinculados a esta central'
      ),

      // Alertas (se houver)
      alertas.length > 0 && e('div', { className: 'bg-red-50 border-2 border-red-400 rounded-xl p-4 animate-pulse' },
        e('div', { className: 'flex items-center gap-3 mb-3' },
          e('span', { className: 'text-3xl' }, '🚨'),
          e('div', null,
            e('p', { className: 'text-red-800 font-bold text-lg' }, `ATENÇÃO: ${alertas.length} profissional(is) não retornou!`),
            e('p', { className: 'text-red-600 text-sm' }, 'Tempo em rota > 1h30min')
          )
        ),
        e('div', { className: 'grid md:grid-cols-2 gap-2' },
          alertas.map(p => e('div', {
            key: p.cod_profissional,
            className: 'bg-white border border-red-300 rounded-lg p-3 flex justify-between items-center',
          },
            e('div', null,
              e('p', { className: 'font-bold' }, p.nome_profissional || '—'),
              e('p', { className: 'text-sm text-red-600' }, `⏱️ ${formatarTempo(p.minutos_em_rota || 0)} em rota`)
            ),
            e('button', {
              onClick: () => removerMotoboy(p.cod_profissional, p.nome_profissional),
              className: 'px-3 py-1 bg-red-600 text-white rounded-lg text-sm',
            }, '❌')
          ))
        )
      ),

      // === LAYOUT 2 COLUNAS: Fila de Espera | Em Rota ===
      e('div', { className: 'grid md:grid-cols-2 gap-4' },
        // ── Coluna 1: FILA DE ESPERA ──
        e('div', { className: 'bg-white border border-gray-200 rounded-xl p-3' },
          e('div', { className: 'flex items-center justify-between mb-3 px-1' },
            e('div', { className: 'text-xs font-semibold text-gray-500 uppercase tracking-wide' },
              'Fila de Espera · ',
              e('span', { className: 'text-gray-700' }, fila.length),
              ' motoboys'
            ),
            e('div', { className: 'flex items-center gap-2' },
              e('button', {
                onClick: dispararVarreduraAgora,
                className: 'text-[10px] px-2 py-0.5 bg-white border border-gray-200 hover:bg-gray-50 rounded text-gray-600',
                title: 'Disparar varredura do agente agora',
              }, '🔄 Varrer'),
              e('span', { className: 'text-[10px] text-gray-400' }, 'arraste pra reordenar')
            )
          ),
          fila.length === 0
            ? e('div', { className: 'text-center py-8 text-gray-400 text-sm' }, '📭 Nenhum motoboy aguardando')
            : e('div', { className: 'space-y-2' }, fila.map((p, i) => renderCardAguardando(p, i)))
        ),

        // ── Coluna 2: EM ROTA ──
        e('div', { className: 'bg-white border border-gray-200 rounded-xl p-3' },
          e('div', { className: 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1' },
            'Em Rota · ',
            e('span', { className: 'text-gray-700' }, emRota.length),
            ' motoboys'
          ),
          emRota.length === 0
            ? e('div', { className: 'text-center py-8 text-gray-400 text-sm' }, '🏠 Nenhum despachado')
            : e('div', { className: 'space-y-2' }, emRota.map(p => e('div', {
                key: p.cod_profissional,
                className: `border rounded-lg p-3 ${(p.minutos_em_rota || 0) > 90 ? 'border-red-300 bg-red-50' : 'border-gray-200'} flex flex-col gap-2`,
              },
                e('div', { className: 'flex items-center justify-between' },
                  e('div', { className: 'flex items-center gap-3' },
                    avatar(p.cod_profissional, p.nome_profissional, fotos[p.cod_profissional], 32),
                    e('div', null,
                      e('p', { className: 'font-medium text-sm' }, p.nome_profissional || '—'),
                      e('p', {
                        className: `text-xs ${(p.minutos_em_rota || 0) > 90 ? 'text-red-600 font-bold' : 'text-gray-500'}`,
                      }, `⏱️ ${formatarTempo(p.minutos_em_rota || 0)} em rota`)
                    )
                  ),
                  e('button', {
                    onClick: () => removerMotoboy(p.cod_profissional, p.nome_profissional),
                    className: 'text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded',
                    title: 'Tirar de em-rota',
                  }, '×')
                )
              )))
        )
      ),

      // === Bloqueados (mantém o card original — info útil só pra fila auto) ===
      bloqueados.length > 0 && e('div', { className: 'space-y-2' },
        e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium' },
          `Bloqueados pelo agente · ${bloqueados.length}`
        ),
        e('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-2.5 space-y-1.5' },
          bloqueados.map(b => e('div', {
            key: b.cod_profissional,
            className: 'flex items-center gap-2 text-xs',
          },
            avatar(b.cod_profissional, b.nome_profissional, fotos[b.cod_profissional], 24),
            e('span', { className: 'flex-1 text-red-900' },
              b.nome_profissional || '—', ' · ', b.cod_profissional
            ),
            e('span', { className: 'text-[10px] text-red-700 bg-white px-2 py-0.5 rounded' },
              b.motivo || 'corrida ativa'
            )
          ))
        )
      ),

      // === Log resumido (últimos 5) ===
      logs && logs.length > 0 && e('div', { className: 'space-y-2' },
        e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium' }, 'Log do agente · últimas ações'),
        e('div', {
          className: 'bg-gray-50 rounded-lg p-2.5 space-y-0.5',
          style: { fontFamily: 'ui-monospace, monospace', fontSize: '11px', lineHeight: 1.7 },
        }, logs.slice(0, 5).map(l => renderLogLine(l)))
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

    return e('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4',
      style: { background: 'rgba(0,0,0,0.45)' },
      onClick: onFechar,
    },
      e('div', {
        className: 'bg-white rounded-2xl p-5 max-w-md w-full max-h-[80vh] flex flex-col',
        onClick: (ev) => ev.stopPropagation(),
      },
        e('div', { className: 'flex items-center justify-between mb-4' },
          e('h3', { className: 'text-lg font-bold text-gray-800' }, 'Colocar na fila'),
          e('button', { onClick: onFechar, className: 'text-gray-400 hover:text-gray-600 text-xl' }, '×')
        ),
        disponiveis.length === 0
          ? e('div', { className: 'text-center py-8 text-gray-400 text-sm' },
              'Todos os motoboys vinculados já estão na fila ou em rota'
            )
          : e('div', { className: 'flex-1 overflow-y-auto space-y-2' },
              disponiveis.map(v => {
                const cod = v.cod_profissional;
                const nome = v.nome_profissional || '—';
                return e('button', {
                  key: cod,
                  onClick: () => onColocar(cod, nome),
                  className: 'w-full flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-300 transition-colors text-left',
                },
                  avatar(cod, nome, fotos[cod], 32),
                  e('div', { className: 'flex-1 min-w-0' },
                    e('p', { className: 'font-medium text-sm truncate' }, nome),
                    e('p', { className: 'text-xs text-gray-500' }, '#', cod)
                  ),
                  e('span', { className: 'text-blue-600 text-sm font-medium flex-shrink-0' }, '➕ Adicionar')
                );
              })
            )
      )
    );
  }

  function kpi(label, value, cor) {
    return e('div', { className: 'bg-gray-50 rounded-lg p-2.5' },
      e('p', { className: 'text-[10px] uppercase text-gray-500 tracking-wide font-medium' }, label),
      e('p', { className: 'text-xl font-semibold mt-0.5', style: cor ? { color: cor } : null }, value)
    );
  }

  // ──────────────────────────────────────────────────────────
  // Configuração da central
  // ──────────────────────────────────────────────────────────
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

    return e('div', { className: 'bg-white border border-gray-200 rounded-xl p-4 space-y-4' },
      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium' }, 'Identificação'),
      e('div', { className: 'space-y-2' },
        labelInput('Nome', dados.nome || '', v => setCampo('nome', v)),
        labelInput('Endereço', dados.endereco || '', v => setCampo('endereco', v)),
      ),

      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-2' }, 'Localização e raio'),
      e('div', { className: 'grid grid-cols-3 gap-2' },
        labelInput('Latitude', dados.latitude || '', v => setCampo('latitude', v)),
        labelInput('Longitude', dados.longitude || '', v => setCampo('longitude', v)),
        labelInput('Raio (m)', dados.raio_metros || 900, v => setCampo('raio_metros', parseInt(v) || 900), 'number'),
      ),

      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-2' }, 'Validação automática (agente Playwright)'),
      e('div', { className: 'bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2' },
        toggle('Bloquear se motoboy tem corrida ativa',
          'Agente busca no sistema externo · valida após entrada',
          dados.validacao_agente_ativa !== false,
          v => setCampo('validacao_agente_ativa', v)),
        toggle('Remover automaticamente ao pegar corrida',
          'Agente fica monitorando · tira da fila quando detecta nova corrida',
          dados.remover_ao_pegar_corrida !== false,
          v => setCampo('remover_ao_pegar_corrida', v)),
        e('div', { className: 'flex items-center justify-between py-1 border-t border-gray-200 pt-2' },
          e('div', null,
            e('p', { className: 'text-xs font-medium text-gray-800' }, 'Frequência de varredura'),
            e('p', { className: 'text-[11px] text-gray-500' }, 'Intervalo entre checagens do agente'),
          ),
          e('select', {
            value: dados.varredura_intervalo_seg || 30,
            onChange: ev => setCampo('varredura_intervalo_seg', parseInt(ev.target.value)),
            className: 'text-xs px-2 py-1 border border-gray-300 rounded bg-white'
          },
            e('option', { value: 15 }, '15 segundos'),
            e('option', { value: 30 }, '30 segundos'),
            e('option', { value: 60 }, '1 minuto'),
            e('option', { value: 120 }, '2 minutos'),
          )
        )
      ),

      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-2' }, 'Regras dos motoboys'),
      e('div', { className: 'bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2' },
        toggle('Mostrar nomes de todos na fila',
          'Motoboys veem quem está à frente e atrás (transparência)',
          dados.mostrar_nomes_publicos !== false,
          v => setCampo('mostrar_nomes_publicos', v)),
        e('div', { className: 'flex items-center justify-between py-1 border-t border-gray-200 pt-2' },
          e('div', null,
            e('p', { className: 'text-xs font-medium text-gray-800' }, 'Penalidade por sair voluntariamente'),
            e('p', { className: 'text-[11px] text-gray-500' }, 'Tempo de bloqueio antes de poder reentrar'),
          ),
          e('select', {
            value: dados.penalidade_min || 0,
            onChange: ev => setCampo('penalidade_min', parseInt(ev.target.value)),
            className: 'text-xs px-2 py-1 border border-gray-300 rounded bg-white'
          },
            e('option', { value: 0 }, 'Sem penalidade'),
            e('option', { value: 5 }, '5 minutos'),
            e('option', { value: 10 }, '10 minutos'),
            e('option', { value: 30 }, '30 minutos'),
          )
        )
      ),

      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-2' }, '⏰ Barreira de horário de ingresso'),
      e('div', { className: 'bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3' },
        toggle('Ativar barreira de horário',
          'Bloqueia motoboys que tentam entrar na fila pela 1ª vez no dia após o horário configurado',
          dados.barreira_horario_ativa || false,
          v => setCampo('barreira_horario_ativa', v)),
        dados.barreira_horario_ativa && e('div', { className: 'flex items-center justify-between py-1 border-t border-gray-200 pt-2' },
          e('div', null,
            e('p', { className: 'text-xs font-medium text-gray-800' }, 'Horário de corte'),
            e('p', { className: 'text-[11px] text-gray-500' }, 'Após este horário, 1º ingresso do dia é bloqueado')
          ),
          e('input', {
            type: 'time',
            value: dados.barreira_horario_corte ? dados.barreira_horario_corte.slice(0,5) : '08:00',
            onChange: ev => setCampo('barreira_horario_corte', ev.target.value + ':00'),
            className: 'text-xs px-2 py-1 border border-gray-300 rounded bg-white font-mono'
          })
        ),
        dados.barreira_horario_ativa && e('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg px-3 py-2' },
          e('p', { className: 'text-[11px] text-amber-700 leading-relaxed' },
            '⚠️ Motoboys bloqueados pela barreira aparecem na aba Punidos. Você pode liberar manualmente um a um se necessário.'
          )
        )
      ),

      e('div', { className: 'flex justify-between items-center pt-3 border-t border-gray-200' },
        e('button', {
          onClick: () => excluirCentral(dados),
          className: 'text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded'
        }, '🗑️ Excluir central'),
        e('button', {
          onClick: () => salvarCentral(dados),
          className: 'text-xs px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium'
        }, '💾 Salvar')
      )
    );
  }

  function toggle(titulo, sub, checked, onChange) {
    return e('div', { className: 'flex items-center justify-between py-1' },
      e('div', { className: 'flex-1' },
        e('p', { className: 'text-xs font-medium text-gray-800' }, titulo),
        sub && e('p', { className: 'text-[11px] text-gray-500' }, sub),
      ),
      e('label', {
        className: `relative inline-block w-9 h-5 rounded-full cursor-pointer transition-colors ${checked ? 'bg-purple-600' : 'bg-gray-300'}`,
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
      e('label', { className: 'text-[11px] text-gray-500 block mb-1' }, label),
      e('input', {
        type: type || 'text',
        value: value,
        onChange: ev => onChange(ev.target.value),
        className: 'w-full h-9 px-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-100'
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

    return e('div', { className: 'space-y-3' },
      e('div', { className: 'flex justify-between items-center' },
        e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium' },
          `Vinculados · ${vinculos.length}`
        ),
        e('button', {
          onClick: () => setModalVincular(true),
          className: 'text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg'
        }, '+ Vincular motoboy')
      ),

      e('div', { className: 'bg-white border border-gray-200 rounded-lg divide-y divide-gray-100' },
        vinculos.length === 0
          ? e('p', { className: 'text-center text-gray-400 py-6 text-sm' }, 'Nenhum motoboy vinculado ainda')
          : vinculos.map(v => e('div', {
              key: v.cod_profissional,
              className: 'flex items-center gap-3 p-2.5'
            },
              avatar(v.cod_profissional, v.nome_profissional, fotos[v.cod_profissional], 32),
              e('div', { className: 'flex-1 min-w-0' },
                e('p', { className: 'text-sm text-gray-800 truncate' }, v.nome_profissional || '—'),
                e('p', { className: 'text-[11px] text-gray-400' }, 'cod ', v.cod_profissional),
              ),
              e('button', {
                onClick: () => desvincularProfissional(v.cod_profissional),
                title: 'Desvincular',
                className: 'text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded'
              }, '× desvincular')
            ))
      ),

      // Modal vincular
      modalVincular && e('div', {
        className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
        onClick: () => setModalVincular(false)
      },
        e('div', {
          className: 'bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col',
          onClick: ev => ev.stopPropagation()
        },
          e('div', { className: 'p-4 border-b border-gray-200' },
            e('p', { className: 'font-medium text-gray-800' }, 'Vincular motoboy à central'),
            e('input', {
              autoFocus: true,
              placeholder: '🔍 Buscar por nome ou código...',
              value: busca,
              onChange: ev => setBusca(ev.target.value),
              className: 'w-full mt-2 h-9 px-3 text-sm border border-gray-300 rounded-md'
            })
          ),
          e('div', { className: 'flex-1 overflow-y-auto p-2' },
            disponiveis.length === 0
              ? e('p', { className: 'text-center text-gray-400 py-6 text-sm' },
                  busca ? 'Nenhum motoboy encontrado' : 'Digite pra buscar...')
              : disponiveis.map(p => e('button', {
                  key: p.cod_profissional,
                  onClick: () => { vincularProfissional(p.cod_profissional, p.nome_profissional); setModalVincular(false); setBusca(''); },
                  className: 'w-full flex items-center gap-3 p-2.5 hover:bg-purple-50 rounded-lg text-left'
                },
                  avatar(p.cod_profissional, p.nome_profissional, null, 28),
                  e('div', { className: 'flex-1 min-w-0' },
                    e('p', { className: 'text-sm text-gray-800 truncate' }, p.nome_profissional),
                    e('p', { className: 'text-[10px] text-gray-400' }, 'cod ', p.cod_profissional)
                  )
                ))
          ),
          e('div', { className: 'p-3 border-t border-gray-200 flex justify-end' },
            e('button', {
              onClick: () => { setModalVincular(false); setBusca(''); },
              className: 'text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded'
            }, 'Fechar')
          )
        )
      )
    );
  }

  // ──────────────────────────────────────────────────────────
  // Logs (aba completa)
  // ──────────────────────────────────────────────────────────
  function renderLogs(opts) {
    const { logs } = opts;
    return e('div', { className: 'bg-white border border-gray-200 rounded-lg p-3' },
      e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium mb-2' }, `Histórico do agente · ${logs.length} eventos`),
      logs.length === 0
        ? e('p', { className: 'text-center text-gray-400 py-6 text-sm' }, 'Nenhum evento ainda')
        : e('div', {
            className: 'space-y-0.5',
            style: { fontFamily: 'ui-monospace, monospace', fontSize: '11px', lineHeight: 1.7 }
          }, logs.map(l => renderLogLine(l)))
    );
  }

  function renderLogLine(l) {
    const cor = l.acao === 'removeu' || l.acao === 'admin_removeu' ? '#A32D2D'
      : l.acao === 'validou' ? '#27500A'
      : l.acao === 'bloqueou_entrada' ? '#854F0B'
      : '#6B7280';
    const sym = l.acao === 'removeu' || l.acao === 'admin_removeu' ? '×'
      : l.acao === 'validou' ? '✓'
      : l.acao === 'bloqueou_entrada' ? '!'
      : '·';
    return e('p', {
      key: l.id, className: 'text-gray-600 truncate',
      title: l.detalhes ? JSON.stringify(l.detalhes) : ''
    },
      e('span', { className: 'text-gray-400' }, formatarMinAtras(l.created_at), ' · '),
      e('span', { style: { color: cor } }, sym, ' '),
      l.nome_profissional ? l.nome_profissional + ' · ' : '',
      l.acao.replace(/_/g, ' '),
      l.motivo ? ' · ' + l.motivo : ''
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

    return e('div', {
      className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
      onClick: onCancelar
    },
      e('div', {
        className: 'bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto',
        onClick: ev => ev.stopPropagation()
      },
        e('div', { className: 'p-5 space-y-3' },
          e('div', null,
            e('p', { className: 'text-lg font-semibold flex items-center gap-2' },
              '🤖 ', dados.id ? 'Editar central auto' : 'Nova central auto-gerenciável'
            ),
            e('p', { className: 'text-xs text-gray-500 mt-1' },
              'Motoboys se organizam · agente Playwright fiscaliza'
            )
          ),

          // Nome
          labelInput('Nome *', dados.nome || '', v => setCampo('nome', v)),

          // Aviso quando API caiu
          geocodeDown && !modoManual && e('div', {
            className: 'bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs space-y-2'
          },
            e('p', { className: 'font-medium text-amber-900' }, '⚠️ Busca automática indisponível'),
            e('p', { className: 'text-amber-700' },
              'A API do Google de busca de endereço está fora. Use o modo manual:'),
            e('button', {
              onClick: () => setModoManual(true),
              className: 'px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium'
            }, '📐 Inserir coordenadas manualmente')
          ),

          // ── MODO MANUAL (coordenadas) ──
          modoManual ? e(React.Fragment, null,
            labelInput('Endereço (opcional)', dados.endereco || '', v => setCampo('endereco', v)),
            e('div', { className: 'grid grid-cols-2 gap-2' },
              labelInput('Latitude *', dados.latitude || '',
                v => setCampo('latitude', v)),
              labelInput('Longitude *', dados.longitude || '',
                v => setCampo('longitude', v)),
            ),
            e('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3 text-[11px] text-purple-900 space-y-1' },
              e('p', { className: 'font-medium' }, '💡 Como pegar latitude/longitude'),
              e('p', { className: 'text-purple-700' },
                'Abra o Google Maps no local da loja → botão direito no ponto exato → o primeiro número é latitude, o segundo é longitude.'),
              e('button', {
                onClick: () => setModoManual(false),
                className: 'text-purple-700 underline text-[11px] mt-1'
              }, '← Voltar a buscar por endereço')
            )
          ) : e(React.Fragment, null,
            // ── MODO BUSCA POR ENDEREÇO ──
            e('div', null,
              e('label', { className: 'text-[11px] text-gray-500 block mb-1' }, '📍 Endereço *'),
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
                  className: `w-full h-9 px-2 pr-9 text-xs border rounded-md focus:outline-none focus:ring-1 ${enderecoValidado ? 'border-green-500 bg-green-50 focus:ring-green-100' : 'border-gray-300 focus:border-purple-500 focus:ring-purple-100'}`
                }),
                e('span', {
                  className: 'absolute right-2 top-1/2 -translate-y-1/2 text-base'
                }, buscandoEndereco ? '⏳' : enderecoValidado ? '✅' : '🔍')
              ),
              enderecoValidado && coordenadasEncontradas && e('p', {
                className: 'text-[10px] text-green-700 mt-1'
              }, `📌 ${coordenadasEncontradas.latitude.toFixed(6)}, ${coordenadasEncontradas.longitude.toFixed(6)}`),
              // Link discreto pra entrar no modo manual mesmo sem erro
              !geocodeDown && e('button', {
                onClick: () => setModoManual(true),
                className: 'text-[10px] text-gray-400 hover:text-purple-600 underline mt-1'
              }, 'ou inserir coordenadas manualmente')
            )
          ),

          // Raio
          labelInput('Raio (metros)', dados.raio_metros || 900,
            v => setCampo('raio_metros', parseInt(v) || 900), 'number'),

          e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-1' }, 'Validação do agente'),
          e('div', { className: 'bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2' },
            toggle('Bloquear se motoboy tem corrida ativa', 'Agente checa no sistema externo',
              dados.validacao_agente_ativa !== false, v => setCampo('validacao_agente_ativa', v)),
            toggle('Remover automaticamente ao pegar corrida', 'Tira da fila quando detecta nova corrida',
              dados.remover_ao_pegar_corrida !== false, v => setCampo('remover_ao_pegar_corrida', v)),
            e('div', { className: 'flex items-center justify-between pt-2 border-t border-gray-200' },
              e('p', { className: 'text-xs text-gray-700' }, 'Frequência de varredura'),
              e('select', {
                value: dados.varredura_intervalo_seg || 30,
                onChange: ev => setCampo('varredura_intervalo_seg', parseInt(ev.target.value)),
                className: 'text-xs px-2 py-1 border border-gray-300 rounded bg-white'
              },
                e('option', { value: 15 }, '15s'),
                e('option', { value: 30 }, '30s'),
                e('option', { value: 60 }, '1min'),
                e('option', { value: 120 }, '2min'),
              )
            )
          ),

          e('p', { className: 'text-[11px] uppercase text-gray-500 tracking-wide font-medium pt-1' }, 'Regras dos motoboys'),
          e('div', { className: 'bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2' },
            toggle('Mostrar nomes na fila', 'Motoboys veem quem está à frente',
              dados.mostrar_nomes_publicos !== false, v => setCampo('mostrar_nomes_publicos', v)),
            e('div', { className: 'flex items-center justify-between pt-2 border-t border-gray-200' },
              e('p', { className: 'text-xs text-gray-700' }, 'Penalidade ao sair voluntariamente'),
              e('select', {
                value: dados.penalidade_min || 0,
                onChange: ev => setCampo('penalidade_min', parseInt(ev.target.value)),
                className: 'text-xs px-2 py-1 border border-gray-300 rounded bg-white'
              },
                e('option', { value: 0 }, 'Sem penalidade'),
                e('option', { value: 5 }, '5 min'),
                e('option', { value: 10 }, '10 min'),
                e('option', { value: 30 }, '30 min'),
              )
            )
          ),

          e('div', { className: 'flex justify-end gap-2 pt-3' },
            e('button', {
              onClick: onCancelar,
              className: 'text-xs px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50'
            }, 'Cancelar'),
            e('button', {
              onClick: () => onSalvar(dados),
              disabled: !podeSalvar,
              className: 'text-xs px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed'
            }, dados.id ? '💾 Salvar' : '🤖 Criar central auto')
          )
        )
      )
    );
  }

  // Exporta
  window.ModuloFilasAuto = ModuloFilasAuto;
  console.log('✅ ModuloFilasAuto carregado');
})();
