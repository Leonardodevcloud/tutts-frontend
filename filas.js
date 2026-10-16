/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* FILAS_CLEAN_V1: redesign clean do módulo Filas tradicionais (admin + motoboy). */
/* FILAS_ICONS_V3 */
// ============================================================
// MÓDULO DE FILAS - FRONTEND V2
// Features: drag-drop, penalidades, cooldown, regiões, cronômetro
// ============================================================

function ModuloFilas({ usuario, apiUrl, showToast, abaAtiva, onChangeTab }) {
    const [loading, setLoading] = React.useState(true);
    const [centrais, setCentrais] = React.useState([]);
    const [centralSelecionada, setCentralSelecionada] = React.useState(null);
    const [filaAtual, setFilaAtual] = React.useState({ aguardando: [], em_rota: [], alertas: [] });
    const [profissionaisDisponiveis, setProfissionaisDisponiveis] = React.useState([]);
    const [modalCentral, setModalCentral] = React.useState(null);
    const [modalVinculo, setModalVinculo] = React.useState(false);
    const [estatisticas, setEstatisticas] = React.useState(null);
    const [historico, setHistorico] = React.useState([]);
    const [filtroData, setFiltroData] = React.useState(new Date().toISOString().split('T')[0]);
    const [vinculos, setVinculos] = React.useState([]);
    const [buscandoEndereco, setBuscandoEndereco] = React.useState(false);
    const [enderecoValidado, setEnderecoValidado] = React.useState(false);
    const [coordenadasEncontradas, setCoordenadasEncontradas] = React.useState(null);
    const [minhaCentral, setMinhaCentral] = React.useState(null);
    const [minhaPosicao, setMinhaPosicao] = React.useState(null);
    const [gpsStatus, setGpsStatus] = React.useState('verificando');
    const [minhaLocalizacao, setMinhaLocalizacao] = React.useState(null);
    const [distanciaCentral, setDistanciaCentral] = React.useState(null);
    const [notificacao, setNotificacao] = React.useState(null);
    const [mostrarNotificacao, setMostrarNotificacao] = React.useState(false);
    const ultimaNotifRef = React.useRef(null);
    const audioCtxRef = React.useRef(null);
    const audioDesbloqueadoRef = React.useRef(false);

    // V2 states
    const [modalBairros, setModalBairros] = React.useState(null);
    const [bairrosConfig, setBairrosConfig] = React.useState([]);
    const [novoBairroInput, setNovoBairroInput] = React.useState('');
    const [regioes, setRegioes] = React.useState([]);
    const [novaRegiaoInput, setNovaRegiaoInput] = React.useState('');
    const [penalidades, setPenalidades] = React.useState([]);
    // 🆕 2026-05-24: aba interna isolada (a aba externa do app.js agora é só "tradicionais"/"auto")
    const [abaInterna, setAbaInterna] = React.useState('monitoramento');
    const [minhaPenalidade, setMinhaPenalidade] = React.useState(null);
    const [modalSaida, setModalSaida] = React.useState(false);
    const [garantidoAviso, setGarantidoAviso] = React.useState(null);
    // 🆕 2026-05: estados do modal de punição manual (admin)
    const [modalPunir, setModalPunir] = React.useState(false);
    const [punirCod, setPunirCod] = React.useState('');
    const [punirMinutos, setPunirMinutos] = React.useState(480); // default 8h
    const [punirCustom, setPunirCustom] = React.useState(false);
    const [punirCustomValor, setPunirCustomValor] = React.useState('');
    const [punirMotivo, setPunirMotivo] = React.useState('');
    const [punirEnviando, setPunirEnviando] = React.useState(false);
    const [dragData, setDragData] = React.useState(null);
    const [timerTick, setTimerTick] = React.useState(0);

    // Timer tick para cronômetros ao vivo (a cada segundo)
    React.useEffect(() => { const i = setInterval(() => setTimerTick(t => t + 1), 1000); return () => clearInterval(i); }, []);

    // 🔓 Desbloquear áudio
    const desbloquearAudio = () => {
        if (audioDesbloqueadoRef.current) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination); gain.gain.value = 0.001;
            osc.start(); osc.stop(ctx.currentTime + 0.01);
            audioCtxRef.current = ctx; audioDesbloqueadoRef.current = true;
        } catch(e) {}
    };
    React.useEffect(() => {
        const handler = () => desbloquearAudio();
        document.addEventListener('click', handler, { once: false });
        document.addEventListener('touchstart', handler, { once: false });
        return () => { document.removeEventListener('click', handler); document.removeEventListener('touchstart', handler); };
    }, []);

    const tocarBeep = (vezes) => {
        try {
            let ctx = audioCtxRef.current;
            if (!ctx || ctx.state === 'closed') { ctx = new (window.AudioContext || window.webkitAudioContext)(); audioCtxRef.current = ctx; }
            if (ctx.state === 'suspended') ctx.resume();
            const tocar = (delay) => { const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 880; osc.type = 'sine'; gain.gain.value = 0.4; osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.15); };
            for (let i = 0; i < (vezes || 2); i++) tocar(i * 0.25);
        } catch(e) {}
    };
    const vibrar = (padrao) => { try { if (navigator.vibrate) navigator.vibrate(padrao || [200, 100, 200]); } catch(e) {} };
    const notificarBrowser = (titulo, corpo) => {
        try { if (!('Notification' in window)) return; if (Notification.permission === 'granted') { new Notification(titulo, { body: corpo, icon: '/icon-192.png' }); } else if (Notification.permission !== 'denied') { Notification.requestPermission().then(p => { if (p === 'granted') new Notification(titulo, { body: corpo, icon: '/icon-192.png' }); }); } } catch(e) {}
    };
    const dispararAlerta = (notif) => {
        const tipo = notif?.tipo || '';
        if (tipo === 'nota_liberada') { tocarBeep(3); vibrar([200,100,200,100,300]); notificarBrowser('Nota Liberada!', notif.mensagem); }
        else if (tipo === 'roteiro_despachado') { tocarBeep(5); vibrar([300,150,300,150,500]); notificarBrowser('Roteiro Despachado!', notif.mensagem); }
        else if (tipo === 'corrida_unica') { tocarBeep(4); vibrar([200,100,400]); notificarBrowser('Corrida Única!', notif.mensagem); }
        else { tocarBeep(2); vibrar([200,100,200]); notificarBrowser('Fila', notif?.mensagem || 'Nova notificação'); }
    };

    const isAdmin = ['admin', 'admin_master'].includes(usuario?.role);

    // BAIRROS
    const carregarBairrosConfig = async (centralId) => { if(!centralId)return; try{ const r=await fetchAuth(`${apiUrl}/filas/bairros-config/${centralId}`); const d=await r.json(); if(d.success) setBairrosConfig(d.bairros||[]); }catch(e){} };
    const adicionarBairroConfig = async (nome, regiaoId) => { if(!centralSelecionada||!nome?.trim())return; try{ const r=await fetchAuth(`${apiUrl}/filas/bairros-config`,{method:'POST',body:JSON.stringify({central_id:centralSelecionada.id,nome:nome.trim().toUpperCase(),regiao_id:regiaoId||null})}); const d=await r.json(); if(d.success){ showToast('Bairro adicionado!','success'); carregarBairrosConfig(centralSelecionada.id); } }catch(e){ showToast('Erro','error'); } };
    const removerBairroConfig = async (id) => { try{ await fetchAuth(`${apiUrl}/filas/bairros-config/${id}`,{method:'DELETE'}); carregarBairrosConfig(centralSelecionada?.id); showToast('Removido!','success'); }catch(e){} };
    const atualizarBairroRegiao = async (bairroId, regiaoId) => { try{ await fetchAuth(`${apiUrl}/filas/bairros-config/${bairroId}`,{method:'PUT',body:JSON.stringify({regiao_id:regiaoId||null})}); carregarBairrosConfig(centralSelecionada?.id); }catch(e){} };
    const salvarBairrosProfissional = async (cod, bairros) => { if(!centralSelecionada)return; try{ await fetchAuth(`${apiUrl}/filas/atribuir-bairros`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id,bairros})}); carregarFila(centralSelecionada.id); }catch(e){ showToast('Erro','error'); } };
    const limparBairrosProfissional = async (cod) => { if(!centralSelecionada)return; try{ await fetchAuth(`${apiUrl}/filas/limpar-bairros`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); showToast('Bairros limpos!','success'); carregarFila(centralSelecionada.id); }catch(e){ showToast('Erro','error'); } };
    // 🚀 2026-05: remove SÓ 1 bairro pelo índice (mantém os outros)
    const removerUmBairroProfissional = async (cod, bairros, idx) => {
        if (!centralSelecionada) return;
        const novos = (bairros || []).filter((_, i) => i !== idx);
        try {
            await fetchAuth(`${apiUrl}/filas/atribuir-bairros`, {
                method: 'POST',
                body: JSON.stringify({ cod_profissional: cod, central_id: centralSelecionada.id, bairros: novos })
            });
            carregarFila(centralSelecionada.id);
        } catch (e) { showToast('Erro', 'error'); }
    };
    // 🚀 2026-05: abre modal de edição de bairros (sem liberar nova nota)
    const abrirEdicaoBairros = (p) => {
        setModalBairros({
            cod_profissional: p.cod_profissional,
            nome: p.nome_profissional,
            bairros: p.bairros || [],
            modoEdicao: true, // 👈 sinaliza pro modal não chamar liberar-nota
        });
    };
    // 🚀 2026-05: salva edição (só atribui bairros, não libera nota)
    const salvarEdicaoBairros = async () => {
        if (!modalBairros || !centralSelecionada) return;
        const cod = modalBairros.cod_profissional;
        const bairros = modalBairros.bairros || [];
        try {
            await salvarBairrosProfissional(cod, bairros);
            showToast('Bairros atualizados (' + bairros.length + ')', 'success');
            setModalBairros(null);
        } catch (e) { showToast('Erro', 'error'); }
    };
    const adicionarBairroModal = (bairro) => { if(!modalBairros)return; const nome = bairro.toUpperCase(); if((modalBairros.bairros||[]).includes(nome)) return; setModalBairros({...modalBairros, bairros:[...(modalBairros.bairros||[]), nome]}); };
    const removerBairroByIndex = (idx) => { if(!modalBairros)return; var novo=(modalBairros.bairros||[]).filter(function(_,i){return i!==idx;}); setModalBairros({...modalBairros, bairros:novo}); };
    const liberarNotaComBairros = async () => { if(!modalBairros||!centralSelecionada)return; var cod=modalBairros.cod_profissional; var bairros=modalBairros.bairros||[]; await salvarBairrosProfissional(cod, bairros); try{ var r=await fetchAuth(apiUrl+'/filas/liberar-nota',{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); var d=await r.json(); if(d.success){ showToast(''+d.notas_liberadas+'ª nota liberada com '+bairros.length+' bairro(s)!','success'); carregarFila(centralSelecionada.id); setModalBairros(null); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };

    // 🚀 2026-05: COLOCAR NA FILA (admin coloca vinculado direto)
    const [modalColocarFila, setModalColocarFila] = useState(null); // null | { vinculados: [], filtro: '' }
    const abrirModalColocarFila = async () => {
        if (!centralSelecionada) return;
        try {
            const r = await fetchAuth(`${apiUrl}/filas/vinculados-disponiveis/${centralSelecionada.id}`);
            const d = await r.json();
            if (d.success) {
                setModalColocarFila({ vinculados: d.vinculados || [], filtro: '' });
            } else {
                showToast(d.error || 'Erro ao carregar vinculados', 'error');
            }
        } catch (e) { showToast('Erro', 'error'); }
    };
    const colocarMotoboyNaFila = async (cod) => {
        if (!centralSelecionada) return;
        try {
            const r = await fetchAuth(`${apiUrl}/filas/colocar-na-fila`, {
                method: 'POST',
                body: JSON.stringify({ cod_profissional: cod, central_id: centralSelecionada.id })
            });
            const d = await r.json();
            if (d.success) {
                showToast(`${d.nome} entrou na fila (posição ${d.posicao})`, 'success');
                setModalColocarFila(null);
                carregarFila(centralSelecionada.id);
            } else {
                showToast(d.error || 'Erro', 'error');
            }
        } catch (e) { showToast('Erro', 'error'); }
    };

    // REGIÕES
    const carregarRegioes = async (centralId) => { if(!centralId)return; try{ const r=await fetchAuth(`${apiUrl}/filas/regioes/${centralId}`); const d=await r.json(); if(d.success) setRegioes(d.regioes||[]); }catch(e){} };
    const criarRegiao = async (nome) => { if(!centralSelecionada||!nome?.trim())return; try{ const r=await fetchAuth(`${apiUrl}/filas/regioes`,{method:'POST',body:JSON.stringify({central_id:centralSelecionada.id,nome:nome.trim()})}); const d=await r.json(); if(d.success){ showToast('Região criada!','success'); carregarRegioes(centralSelecionada.id); } }catch(e){ showToast('Erro','error'); } };
    const removerRegiao = async (id) => { if(!window.confirm('Remover região? Os bairros ficarão sem região.'))return; try{ await fetchAuth(`${apiUrl}/filas/regioes/${id}`,{method:'DELETE'}); carregarRegioes(centralSelecionada?.id); carregarBairrosConfig(centralSelecionada?.id); showToast('Removida!','success'); }catch(e){} };

    // PENALIDADES
    const carregarPenalidades = async (centralId) => { if(!centralId)return; try{ const r=await fetchAuth(`${apiUrl}/filas/penalidades/${centralId}`); const d=await r.json(); if(d.success) setPenalidades(d.penalidades||[]); }catch(e){} };
    const anularPenalidade = async (cod) => { if(!centralSelecionada||!window.confirm('Anular penalidade deste profissional?'))return; try{ const r=await fetchAuth(`${apiUrl}/filas/anular-penalidade`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); const d=await r.json(); if(d.success){ showToast('Penalidade anulada!','success'); carregarPenalidades(centralSelecionada.id); }else showToast(d.error||'Erro','error'); }catch(e){ showToast('Erro','error'); } };
    // 🆕 2026-05: aplicar punição manual
    const abrirModalPunir = () => {
        setPunirCod(''); setPunirMinutos(480); setPunirCustom(false);
        setPunirCustomValor(''); setPunirMotivo(''); setModalPunir(true);
    };
    const aplicarPunicao = async () => {
        if (!centralSelecionada) return;
        if (!punirCod) { showToast('Selecione um motoboy', 'warning'); return; }
        let mins = punirMinutos;
        if (punirCustom) {
            const v = parseInt(punirCustomValor);
            if (!Number.isFinite(v) || v < 1 || v > 10080) {
                showToast('Tempo personalizado inválido (1 a 10080 min)', 'error'); return;
            }
            mins = v;
        }
        if (punirEnviando) return; // guard contra clique duplo
        setPunirEnviando(true);
        try {
            const r = await fetchAuth(`${apiUrl}/filas/aplicar-penalidade`, {
                method: 'POST',
                body: JSON.stringify({
                    cod_profissional: punirCod,
                    central_id: centralSelecionada.id,
                    minutos: mins,
                    motivo: punirMotivo.trim() || undefined
                })
            });
            const d = await r.json();
            if (r.ok && d.success) {
                const aviso = d.penalidade?.ja_havia_penalidade_maior
                    ? 'Punição registrada (motoboy já tinha bloqueio maior — mantido)'
                    : `Punição aplicada: ${mins} min`;
                showToast(aviso, 'success');
                setModalPunir(false);
                carregarPenalidades(centralSelecionada.id);
                carregarFila(centralSelecionada.id);
            } else {
                showToast(d.error || 'Erro ao aplicar', 'error');
            }
        } catch (e) {
            showToast('Erro de rede', 'error');
        } finally {
            setPunirEnviando(false);
        }
    };
    const formatarBloqueioRestante = (bloqueadoAte) => {
        if (!bloqueadoAte) return '';
        const ms = new Date(bloqueadoAte).getTime() - Date.now();
        if (ms <= 0) return 'expirado';
        const totalMin = Math.ceil(ms / 60000);
        if (totalMin >= 60) {
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            return m > 0 ? `${h}h${String(m).padStart(2,'0')}min restantes` : `${h}h restantes`;
        }
        return `${totalMin}min restantes`;
    };
    const carregarMinhaPenalidade = async () => { try{ const r=await fetchAuth(`${apiUrl}/filas/minha-penalidade`); const d=await r.json(); if(d.success) setMinhaPenalidade(d); }catch(e){} };

    // BUSCA ENDEREÇO GOOGLE
    const buscarEndereco = async (endereco) => {
        if (!endereco || endereco.length < 5) { setEnderecoValidado(false); setCoordenadasEncontradas(null); return; }
        setBuscandoEndereco(true);
        try { const response = await fetchAuth(`${apiUrl}/geocode/google?endereco=${encodeURIComponent(endereco)}`); const data = await response.json(); const resultado = data.results && data.results[0]; if (resultado && resultado.latitude && resultado.longitude) { setCoordenadasEncontradas({ latitude: resultado.latitude, longitude: resultado.longitude, enderecoFormatado: resultado.endereco || endereco }); setEnderecoValidado(true); showToast('Endereço encontrado!', 'success'); } else { setEnderecoValidado(false); setCoordenadasEncontradas(null); showToast('Endereço não encontrado', 'error'); } } catch (e) { setEnderecoValidado(false); setCoordenadasEncontradas(null); showToast('Erro ao buscar', 'error'); }
        finally { setBuscandoEndereco(false); }
    };
    const debounceRef = React.useRef(null);
    const buscarEnderecoDebounced = (endereco) => { if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => buscarEndereco(endereco), 800); };

    // GPS
    const solicitarGPS = () => {
        if (!navigator.geolocation) { setGpsStatus('indisponivel'); return; }
        setGpsStatus('verificando');
        navigator.geolocation.getCurrentPosition(
            (pos) => { setMinhaLocalizacao({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setGpsStatus('permitido'); },
            (err) => { setGpsStatus(err.code === err.PERMISSION_DENIED ? 'negado' : 'indisponivel'); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    };
    const calcularDistanciaHaversine = (lat1, lon1, lat2, lon2) => { const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180; const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2; return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); };

    // CARREGAMENTOS
    const carregarCentrais = async () => { try { const r=await fetchAuth(`${apiUrl}/filas/centrais`); const d=await r.json(); if(d.success){ /* 🆕 2026-05-24: filtra centrais auto-gerenciáveis — elas têm aba própria */ setCentrais((d.centrais || []).filter(c => c.tipo !== 'auto')); } } catch(e){} finally{ setLoading(false); } };
    const carregarFila = async (id) => {
        if(!id) return;
        try{
            const r = await fetchAuth(`${apiUrl}/filas/centrais/${id}/fila`);
            const d = await r.json();
            if(d.success){
                // 🆕 2026-05: injeta a foto dos motoboys da fila (aguardando + em_rota)
                try{
                    const todos = [...(d.aguardando||[]), ...(d.em_rota||[])];
                    const cods = [...new Set(todos.map(p => p.cod_profissional).filter(Boolean))];
                    if(cods.length > 0){
                        const rf = await fetchAuth(`${apiUrl}/perfil/fotos?codigos=${cods.join(',')}`);
                        if(rf.ok){
                            const df = await rf.json();
                            const mapaF = df.fotos || {};
                            if(d.aguardando) d.aguardando = d.aguardando.map(p => ({...p, foto: mapaF[p.cod_profissional]||null}));
                            if(d.em_rota) d.em_rota = d.em_rota.map(p => ({...p, foto: mapaF[p.cod_profissional]||null}));
                        }
                    }
                }catch(errF){}
                setFilaAtual(d);
            }
        }catch(e){}
    };
    const carregarVinculos = async (id) => { if(!id)return; try{ const r=await fetchAuth(`${apiUrl}/filas/centrais/${id}/vinculos`); const d=await r.json(); if(d.success) setVinculos(d.vinculos); }catch(e){} };
    const carregarMinhaCentral = async () => { try{ const r=await fetchAuth(`${apiUrl}/filas/minha-central`); const d=await r.json(); if(d.success){ if(d.vinculado){ setMinhaCentral(d.central); setMinhaPosicao(d.posicao_atual); }else{ setMinhaCentral(null); } } }catch(e){} finally{ setLoading(false); } };
    const carregarMinhaPosicao = async () => { try{ const r=await fetchAuth(`${apiUrl}/filas/minha-posicao`); const d=await r.json(); if(d.success) setMinhaPosicao(d); }catch(e){} };
    const carregarEstatisticas = async (id) => { if(!id)return; try{ const r=await fetchAuth(`${apiUrl}/filas/estatisticas/${id}?data=${filtroData}`); const d=await r.json(); if(d.success) setEstatisticas(d); }catch(e){} };
    const carregarHistorico = async (id) => { if(!id)return; try{ const r=await fetchAuth(`${apiUrl}/filas/historico/${id}?data_inicio=${filtroData}&data_fim=${filtroData}`); const d=await r.json(); if(d.success) setHistorico(d.historico); }catch(e){} };
    // 🔧 FIX CADASTRO-CRM: Lista de profissionais pra vínculo vem do CRM
    // (crm_leads_capturados → planilha → fallbacks), não da tabela users.
    // Antes: GET /api/users filter role==='user' — só pegava motoboy com login.
    // Agora: GET /api/crm/profissionais-cadastro — pega todos do cadastro CRM.
    // Mapeia {codigo, nome} → {cod_profissional, full_name} pra manter o
    // resto do componente (modal, vincularProfissional) intacto.
    const carregarProfissionais = async () => {
        try {
            const r = await fetchAuth(`${apiUrl}/crm/profissionais-cadastro`);
            if (!r.ok) {
                console.warn('[filas] /crm/profissionais-cadastro retornou', r.status);
                return;
            }
            const d = await r.json();
            const lista = Array.isArray(d?.data) ? d.data : [];
            // Mapear pro formato esperado pelo componente
            const normalizada = lista
                .filter(p => p && p.codigo) // só com código válido
                .map(p => ({
                    cod_profissional: String(p.codigo).trim(),
                    full_name: p.nome || `#${p.codigo}`,
                    telefone: p.telefone || '',
                    cidade: p.cidade || '',
                    regiao: p.regiao || '',
                    origem: p.origem || ''
                }))
                .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'pt-BR'));
            setProfissionaisDisponiveis(normalizada);
        } catch (e) {
            console.error('[filas] Erro ao carregar profissionais do CRM:', e?.message || e);
        }
    };

    // AÇÕES ADMIN
    const salvarCentral = async (dados) => { try{ const m=dados.id?'PUT':'POST'; const u=dados.id?`${apiUrl}/filas/centrais/${dados.id}`:`${apiUrl}/filas/centrais`; const r=await fetchAuth(u,{method:m,body:JSON.stringify(dados)}); const d=await r.json(); if(d.success){ showToast(dados.id?'Atualizada!':'Criada!','success'); setModalCentral(null); setEnderecoValidado(false); setCoordenadasEncontradas(null); carregarCentrais(); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro ao salvar','error'); } };
    const vincularProfissional = async (cod,nome) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/vinculos`,{method:'POST',body:JSON.stringify({central_id:centralSelecionada.id,cod_profissional:cod,nome_profissional:nome})}); const d=await r.json(); if(d.success){ showToast('Vinculado!','success'); carregarCentrais(); carregarVinculos(centralSelecionada.id); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const desvincularProfissional = async (cod) => { if(!window.confirm('Desvincular?'))return; try{ const r=await fetchAuth(`${apiUrl}/filas/vinculos/${cod}`,{method:'DELETE'}); const d=await r.json(); if(d.success){ showToast('Desvinculado!','success'); carregarCentrais(); carregarFila(centralSelecionada?.id); carregarVinculos(centralSelecionada?.id); } }catch(e){ showToast('Erro','error'); } };
    const enviarParaRota = async (cod) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/enviar-rota`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); const d=await r.json(); if(d.success){ showToast(`Despachado! (${d.tempo_espera} min espera, ${d.notas_liberadas||0} notas)`,'success'); carregarFila(centralSelecionada.id); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const liberarNota = async (cod) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/liberar-nota`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); const d=await r.json(); if(d.success){ showToast(`${d.notas_liberadas}ª nota liberada para ${d.profissional}!`,'success'); carregarFila(centralSelecionada.id); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const enviarParaRotaUnica = async (cod) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/enviar-rota-unica`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); const d=await r.json(); if(d.success){ showToast(`Corrida única! (${d.tempo_espera} min) Retorna na posição ${d.posicao_retorno}`,'success'); carregarFila(centralSelecionada.id); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const moverParaUltimo = async (cod) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/mover-ultimo`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); const d=await r.json(); if(d.success){ showToast(d.message || `Movido: ${d.posicao_anterior}º → ${d.posicao_nova}º`,'success'); carregarFila(centralSelecionada.id); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const removerDaFila = async (cod) => { const obs=window.prompt('Motivo (opcional):'); if(obs===null)return; try{ const r=await fetchAuth(`${apiUrl}/filas/remover`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id,observacao:obs})}); const d=await r.json(); if(d.success){ showToast('Removido!','success'); carregarFila(centralSelecionada.id); } }catch(e){ showToast('Erro','error'); } };

    // DRAG-DROP REORDENAR
    const reordenarFila = async (cod, novaPosicao) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/reordenar`,{method:'POST',body:JSON.stringify({central_id:centralSelecionada.id,cod_profissional:cod,nova_posicao:novaPosicao})}); const d=await r.json(); if(d.success){ showToast(`Movido: ${d.posicao_anterior}º → ${d.posicao_nova}º`,'success'); carregarFila(centralSelecionada.id); } }catch(e){ showToast('Erro','error'); } };

    // AÇÕES USER
    const entrarNaFila = async () => { desbloquearAudio(); if(!minhaLocalizacao){ showToast('Aguarde GPS','error'); solicitarGPS(); return; } try{ const r=await fetchAuth(`${apiUrl}/filas/entrar`,{method:'POST',body:JSON.stringify({latitude:minhaLocalizacao.latitude,longitude:minhaLocalizacao.longitude})}); const d=await r.json(); if(d.success){ showToast(d.prioridade ? `Retornou com prioridade! Posição: ${d.posicao}` : `Entrou! Posição: ${d.posicao}`,'success'); if(d.garantido && d.garantido.primeiro_do_dia && d.garantido.atrasado){ setGarantidoAviso(d.garantido); } carregarMinhaPosicao(); }else{ showToast(d.mensagem||d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const sairDaFila = async () => { try{ const r=await fetchAuth(`${apiUrl}/filas/sair`,{method:'POST'}); const d=await r.json(); if(d.success){ setModalSaida(false); const pen=d.penalidade; if(pen) showToast(`Saiu da fila. Bloqueado por ${pen.minutos_bloqueio} min.`,'warning'); else showToast('Saiu!','success'); carregarMinhaPosicao(); carregarMinhaPenalidade(); } }catch(e){ showToast('Erro','error'); } };
    const buscarNotificacao = async () => { try{ const r=await fetchAuth(`${apiUrl}/filas/minha-notificacao`); const d=await r.json(); if(d.success && d.tem_notificacao){ const notif=d.notificacao; const notifKey=notif.created_at||notif.id; if(notifKey!==ultimaNotifRef.current){ ultimaNotifRef.current=notifKey; setNotificacao(notif); setMostrarNotificacao(true); dispararAlerta(notif); } }else{ ultimaNotifRef.current=null; } }catch(e){} };
    const marcarNotificacaoLida = async () => { desbloquearAudio(); try{ await fetchAuth(`${apiUrl}/filas/notificacao-lida`,{method:'POST'}); setMostrarNotificacao(false); setNotificacao(null); }catch(e){} };

    // EFFECTS
    React.useEffect(() => { if(isAdmin){ carregarCentrais(); carregarProfissionais(); }else{ carregarMinhaCentral(); carregarMinhaPenalidade(); solicitarGPS(); try{ if('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }catch(e){} } }, []);
    React.useEffect(() => { if(!isAdmin||!centralSelecionada)return; carregarFila(centralSelecionada.id); carregarVinculos(centralSelecionada.id); carregarBairrosConfig(centralSelecionada.id); carregarRegioes(centralSelecionada.id); carregarPenalidades(centralSelecionada.id); const i=setInterval(()=>{carregarFila(centralSelecionada.id);carregarPenalidades(centralSelecionada.id);},5000); return()=>clearInterval(i); }, [centralSelecionada]);
    React.useEffect(() => { if(!isAdmin||centralSelecionada)return; const i=setInterval(()=>carregarCentrais(),8000); return()=>clearInterval(i); }, [centralSelecionada]);
    React.useEffect(() => { if(isAdmin||!minhaCentral)return; carregarMinhaPosicao(); buscarNotificacao(); const i=setInterval(()=>{carregarMinhaPosicao();solicitarGPS();buscarNotificacao();carregarMinhaPenalidade();},5000); return()=>clearInterval(i); }, [minhaCentral]);
    React.useEffect(() => { if(abaInterna==='relatorios'&&centralSelecionada){ carregarEstatisticas(centralSelecionada.id); carregarHistorico(centralSelecionada.id); } }, [abaInterna,centralSelecionada,filtroData]);
    React.useEffect(() => { if(minhaLocalizacao&&minhaCentral?.latitude&&minhaCentral?.longitude){ setDistanciaCentral(Math.round(calcularDistanciaHaversine(minhaLocalizacao.latitude,minhaLocalizacao.longitude,parseFloat(minhaCentral.latitude),parseFloat(minhaCentral.longitude)))); } }, [minhaLocalizacao,minhaCentral]);
    React.useEffect(() => { if(modalCentral){ if(modalCentral.id){ setEnderecoValidado(true); setCoordenadasEncontradas({latitude:modalCentral.latitude,longitude:modalCentral.longitude,enderecoFormatado:modalCentral.endereco}); }else{ setEnderecoValidado(false); setCoordenadasEncontradas(null); } } }, [modalCentral]);

    const formatarTempo = (m) => { if(!m||m<0)return'0 min'; if(m<60)return`${Math.round(m)} min`; return`${Math.floor(m/60)}h ${Math.round(m%60)}min`; };
    const formatarHora = (d) => d?new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'-';
    const formatarCronometro = (dataISO) => { if(!dataISO)return''; const s=Math.floor((Date.now()-new Date(dataISO).getTime())/1000); const m=Math.floor(s/60); const sec=s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; };

    // ==================== FILAS_CLEAN_V1: helpers visuais ====================
    /* FILAS_CLEAN_V1 — redesign clean do módulo Filas (tradicionais): cabeçalho Sora, faixa de KPIs,
       abas sublinhadas, linhas limpas com status em pílula suave, modais brancos. Só visual: handlers/API intactos. */
    const h = React.createElement;
    const SORA = 'Sora, Inter, sans-serif';
    const TOM = {
        verde: ['#f0fdf4', '#166534', '#16a34a'], ambar: ['#fffbeb', '#92400e', '#d97706'],
        vermelho: ['#fef2f2', '#991b1b', '#dc2626'], azul: ['#eff6ff', '#1e40af', '#2563eb'],
        cinza: ['#f3f4f6', '#374151', '#6b7280'], roxo: ['#faf7fd', '#5d0b85', '#770fa8']
    };
    const ico = (nome, sz, cor) => h('svg', { className: 'ico', style: { width: sz || 16, height: sz || 16, color: cor, flex: 'none' }, 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome }));
    const dot = (cor) => h('span', { 'aria-hidden': 'true', style: { width: 6, height: 6, borderRadius: 99, background: cor, display: 'inline-block', flex: 'none' } });
    const pill = (tom, txt, title) => { const t = TOM[tom] || TOM.cinza; return h('span', { title: title, style: { display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 99, padding: '2px 9px', fontWeight: 600, fontSize: 11.5, lineHeight: '18px', background: t[0], color: t[1], whiteSpace: 'nowrap' } }, dot(t[2]), txt); };
    const CARD = 'bg-white border border-gray-200 rounded-[14px]';
    const BTN_PRI = 'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const BTN_SEC = 'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const BTN_DEST = 'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-white border border-red-200 hover:bg-red-50 text-red-800 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const BTN_PRI_SM = 'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[8px] bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition-colors';
    const BTN_SEC_SM = 'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[8px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium transition-colors';
    const BTN_DEST_SM = 'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[8px] bg-white border border-red-200 hover:bg-red-50 text-red-800 text-xs font-semibold transition-colors';
    const BTN_ICO = 'inline-flex items-center justify-center w-8 h-8 rounded-[8px] bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors flex-shrink-0';
    const BTN_ICO_DEST = 'inline-flex items-center justify-center w-8 h-8 rounded-[8px] bg-white border border-red-200 text-red-800 hover:bg-red-50 transition-colors flex-shrink-0';
    const INPUT_AUTO = 'h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-700 focus:ring-2 focus:ring-purple-100';
    const INPUT = 'w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-700 focus:ring-2 focus:ring-purple-100';
    const LABEL = 'block text-xs font-semibold text-gray-700 mb-1';
    const TH = 'px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap';
    const TD = 'px-4 py-3 border-t border-gray-100 text-sm text-gray-700';
    const tituloPagina = (txt) => h('h1', { style: { fontFamily: SORA, fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1.25, letterSpacing: '-0.01em' } }, txt);
    const tituloCard = (txt, extra) => h('div', { className: 'flex items-center gap-2 min-w-0' }, h('h2', { className: 'text-[15px] font-semibold text-gray-900 truncate' }, txt), extra);
    const contador = (n) => h('span', { className: 'text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 tabular-nums' }, n);
    const vazio = (txt, acao) => h('div', { className: 'text-center py-10 px-4' }, h('p', { className: 'text-sm text-gray-500' }, txt), acao ? h('div', { className: 'mt-3' }, acao) : null);
    const kpiCell = (rotulo, valor, opts) => { opts = opts || {}; return h('div', { key: rotulo, style: { flex: '1 1 150px', padding: '14px 20px', boxShadow: '-1px 0 0 #f3f4f6, 0 -1px 0 #f3f4f6', minWidth: 0 }, title: opts.title },
        h('div', { className: 'flex items-center gap-1.5', style: { fontSize: 12, color: '#6b7280' } }, opts.dot ? dot(opts.dot) : null, rotulo),
        h('div', { style: { fontFamily: SORA, fontSize: 26, fontWeight: 700, color: opts.cor || '#111827', fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 } }, valor),
        opts.sub ? h('div', { style: { fontSize: 11.5, color: '#6b7280' } }, opts.sub) : null); };
    const kpiFaixa = (cells) => h('div', { className: CARD + ' flex flex-wrap overflow-hidden' }, cells.filter(Boolean));
    const iniciaisDe = (nome) => { const partes = (nome || '').trim().split(/\s+/); return partes.length >= 2 ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase() : (partes[0] || '?').substring(0, 2).toUpperCase(); };
    const avatar = (foto, nome, sz) => foto
        ? h('img', { src: foto, alt: nome || '', className: 'rounded-full object-cover border border-gray-200 flex-shrink-0', style: { width: sz || 32, height: sz || 32 } })
        : h('div', { className: 'rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-semibold flex-shrink-0', style: { width: sz || 32, height: sz || 32, fontSize: Math.round((sz || 32) * 0.36) } }, iniciaisDe(nome));
    const modalBox = (o) => h('div', { className: 'fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4', onClick: o.onOverlay ? (ev) => { if (ev.target === ev.currentTarget) o.onOverlay(); } : undefined },
        h('div', { className: 'bg-white border border-gray-200 rounded-[14px] w-full ' + (o.largura || 'max-w-md') + ' max-h-[90vh] flex flex-col overflow-hidden', role: 'dialog', 'aria-modal': 'true' },
            h('div', { className: 'flex items-start justify-between gap-3 px-5 pt-5 pb-3 flex-shrink-0' },
                h('div', { className: 'min-w-0' }, h('h2', { className: 'text-base font-semibold text-gray-900' }, o.titulo), o.sub ? h('p', { className: 'text-sm text-gray-500 mt-0.5 truncate' }, o.sub) : null),
                o.onFechar ? h('button', { type: 'button', onClick: o.onFechar, disabled: o.fecharDisabled, className: 'w-8 h-8 -mr-1 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex-shrink-0', 'aria-label': 'Fechar' }, ico('x', 16)) : null),
            h('div', { className: 'px-5 pb-4 overflow-y-auto flex-1 min-h-0' }, o.corpo),
            o.rodape ? h('div', { className: 'px-5 py-3 border-t border-gray-100 flex justify-end gap-2 flex-wrap flex-shrink-0' }, o.rodape) : null));

    // Modal criar/editar central — usado na lista (criar) e no detalhe (editar). Submits preservados por chamada.
    const renderModalCentral = (onSubmit, desabilitado) => {
        const fechar = () => { setModalCentral(null); setEnderecoValidado(false); setCoordenadasEncontradas(null); };
        return modalBox({
            largura: 'max-w-lg',
            titulo: modalCentral.id ? 'Editar central' : 'Nova fila',
            sub: modalCentral.id ? (modalCentral.nome || '') : 'Cadastre a central onde os motoboys entram na fila',
            onFechar: fechar,
            corpo: h('form', { id: 'filas-form-central', className: 'space-y-4 pt-1', onSubmit: onSubmit },
                h('div', null, h('label', { className: LABEL }, 'Nome *'), h('input', { name: 'nome', defaultValue: modalCentral.nome || '', required: true, className: INPUT })),
                h('div', null, h('label', { className: LABEL }, 'Endereço *'),
                    h('div', { className: 'relative' },
                        h('input', { name: 'endereco', defaultValue: modalCentral.endereco || '', required: true, className: INPUT + ' pr-10' + (enderecoValidado ? ' border-green-600' : ''), onChange: (e) => buscarEnderecoDebounced(e.target.value) }),
                        h('span', { className: 'absolute right-3 top-1/2 -translate-y-1/2 inline-flex' }, buscandoEndereco ? ico('clock', 16, '#6b7280') : enderecoValidado ? ico('check', 16, '#16a34a') : ico('search', 16, '#9ca3af'))),
                    coordenadasEncontradas && h('p', { className: 'text-xs text-green-800 mt-1.5 tabular-nums inline-flex items-center gap-1.5' }, dot('#16a34a'), `${coordenadasEncontradas.latitude?.toFixed?.(6)}, ${coordenadasEncontradas.longitude?.toFixed?.(6)}`)),
                h('div', null, h('label', { className: LABEL }, 'Raio (metros)'), h('input', { name: 'raio_metros', type: 'number', defaultValue: modalCentral.raio_metros || 900, required: true, className: INPUT })),
                modalCentral.id && h('label', { className: 'flex items-center gap-2 text-sm text-gray-700 font-medium' }, h('input', { name: 'ativa', type: 'checkbox', defaultChecked: modalCentral.ativa !== false, className: 'w-4 h-4 accent-purple-700' }), 'Central ativa'),
                modalCentral.id && h('div', { className: 'border border-gray-200 rounded-[10px] p-3 space-y-2' },
                    h('label', { className: 'flex items-center gap-2 text-sm font-semibold text-gray-900' },
                        h('input', { name: 'abertura_horario_ativa', type: 'checkbox', defaultChecked: modalCentral.abertura_horario_ativa === true, className: 'w-4 h-4 accent-purple-700' }),
                        'Travar horário de abertura'),
                    h('p', { className: 'text-xs text-gray-500 leading-relaxed' }, 'Bloqueia a entrada na fila antes do horário. A fila só libera para todos os motoboys a partir do horário definido.'),
                    h('div', { className: 'flex items-center gap-2' },
                        h('label', { className: 'text-xs font-semibold text-gray-700' }, 'Liberar a partir de:'),
                        h('input', { name: 'abertura_horario', type: 'time', defaultValue: (modalCentral.abertura_horario ? String(modalCentral.abertura_horario).slice(0, 5) : '07:30'), className: INPUT_AUTO }))
                ),
                h('div', { className: 'flex justify-end gap-2 pt-3 -mx-5 px-5 border-t border-gray-100' },
                    h('button', { type: 'button', onClick: fechar, className: BTN_SEC }, 'Cancelar'),
                    h('button', { type: 'submit', disabled: desabilitado, className: BTN_PRI }, ico('save', 16), 'Salvar'))
            )
        });
    };

    // ==================== RENDERIZAÇÃO ADMIN ====================
    if (isAdmin) {
        // Linha da fila de espera (drag-drop preservado)
        const renderCardAguardando = (p, i) => {
            const notaNum = (parseInt(p.notas_liberadas) || 0) + 1;
            const proxNotaTexto = notaNum === 1 ? h('span', { className: 'inline-flex items-center gap-1.5' }, ico('rocket', 14), 'Despachar com 1ª nota') : `Liberar ${notaNum}ª nota`;
            const arrastando = dragData === p.cod_profissional;
            const statusPills = [
                p.notas_liberadas > 0 && h('span', { key: 'n' }, pill('roxo', `${p.notas_liberadas} ${p.notas_liberadas == 1 ? 'nota' : 'notas'}`, 'Notas liberadas')),
                p.notas_liberadas > 0 && p.primeira_nota_at && h('span', { key: 't', className: 'inline-flex items-center gap-1 text-xs text-gray-500 tabular-nums', title: 'Tempo desde a 1ª nota' }, ico('clock', 13), formatarCronometro(p.primeira_nota_at)),
                h('span', { key: 's' }, i === 0 ? pill('verde', 'Próximo') : pill('ambar', 'Aguardando'))
            ];
            return h('div', {
                key: p.cod_profissional,
                draggable: true,
                onDragStart: (e) => { e.dataTransfer.setData('text/plain', p.cod_profissional); e.dataTransfer.effectAllowed = 'move'; setDragData(p.cod_profissional); },
                onDragEnd: () => setDragData(null),
                onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
                onDrop: (e) => { e.preventDefault(); const cod = e.dataTransfer.getData('text/plain'); if (cod && cod !== p.cod_profissional) reordenarFila(cod, p.posicao); setDragData(null); },
                className: 'px-4 py-3 border-t border-gray-100 cursor-grab active:cursor-grabbing transition-opacity ' + (arrastando ? 'opacity-50 bg-gray-50' : 'bg-white hover:bg-gray-50')
            },
                h('div', { className: 'flex items-center gap-3' },
                    h('span', { className: 'text-gray-300 select-none hidden sm:inline', style: { fontSize: 14 }, 'aria-hidden': 'true' }, '⠿'),
                    h('span', { style: { width: 22, textAlign: 'right', fontFamily: SORA, fontWeight: 700, fontSize: 15, color: '#111827', fontVariantNumeric: 'tabular-nums', flex: 'none' } }, p.posicao),
                    avatar(p.foto, p.nome_profissional, 32),
                    h('div', { className: 'flex-1 min-w-0' },
                        h('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, p.nome_profissional),
                        h('p', { className: 'text-xs text-gray-500 tabular-nums truncate' }, '#' + p.cod_profissional + ' · ' + formatarTempo(p.minutos_esperando) + ' na fila')
                    ),
                    h('div', { className: 'hidden sm:flex items-center gap-1.5 flex-shrink-0' }, statusPills)
                ),
                // Sinalizações (status no mobile + retorno prioritário / movido / sem disponibilidade)
                h('div', { className: 'flex flex-wrap items-center gap-1.5 mt-2 sm:pl-[100px] ' + ((p.motivo_posicao === 'retorno_prioritario' || p.motivo_posicao === 'movido_ultimo' || p.disponibilidade_alocado === false) ? '' : 'sm:hidden') },
                    h('span', { className: 'contents sm:hidden' }, statusPills),
                    p.motivo_posicao === 'retorno_prioritario' && pill('ambar', 'Retorno prioritário'),
                    p.motivo_posicao === 'movido_ultimo' && pill('cinza', 'Movido para o final'),
                    // 🆕 2026-05-24 (v4): aviso "Sem Disponibilidade" — === false explícito (backend desatualizado = undefined)
                    p.disponibilidade_alocado === false && pill('vermelho', 'Sem disponibilidade · aloque na escala', 'Este motoboy entrou na fila mas não está alocado em nenhuma disponibilidade. Aloque-o para que apareça nos relatórios do dia.')
                ),
                // Bairros — chips removíveis + editar + limpar
                p.bairros && p.bairros.length > 0 && h('div', { className: 'flex flex-wrap gap-1.5 items-center mt-2 sm:pl-[100px]' },
                    h('span', { className: 'text-[11px] font-semibold text-gray-500 mr-0.5' }, 'Bairros'),
                    p.bairros.map((b, bi) => h('button', {
                        key: bi,
                        onClick: () => removerUmBairroProfissional(p.cod_profissional, p.bairros, bi),
                        className: 'inline-flex items-center gap-1 h-6 pl-2 pr-1.5 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-800 transition-colors',
                        title: 'Clique pra remover este bairro'
                    }, b, ico('x', 12, '#9ca3af'))),
                    h('button', { onClick: () => abrirEdicaoBairros(p), className: 'inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-semibold text-purple-700 hover:bg-purple-50', title: 'Editar lista' }, ico('pencil', 12), 'Editar'),
                    h('button', { onClick: () => { if (window.confirm('Limpar TODOS os bairros deste motoboy?')) limparBairrosProfissional(p.cod_profissional); }, className: 'inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-red-800 hover:bg-red-50', title: 'Limpar todos', 'aria-label': 'Limpar todos os bairros' }, ico('trash', 13))
                ),
                // Ações
                h('div', { className: 'flex flex-nowrap sm:flex-wrap items-center gap-1.5 mt-2.5 sm:pl-[100px]' },
                    h('button', { onClick: () => { setModalBairros({ cod_profissional: p.cod_profissional, nome: p.nome_profissional, bairros: p.bairros || [], notaNum }); }, className: BTN_PRI_SM + ' flex-1 sm:flex-none whitespace-nowrap min-w-0 overflow-hidden', title: `Liberar ${notaNum}ª Nota + atribuir bairros` }, proxNotaTexto),
                    h('button', { onClick: () => enviarParaRota(p.cod_profissional), className: BTN_SEC_SM, title: 'Despachar Roteiro', 'aria-label': 'Despachar Roteiro' }, ico('rocket', 14), h('span', { className: 'hidden sm:inline' }, 'Despachar roteiro')),
                    h('button', { onClick: () => enviarParaRotaUnica(p.cod_profissional), className: BTN_ICO, title: 'Corrida Única', 'aria-label': 'Corrida Única' }, ico('crown', 15)),
                    h('button', { onClick: () => moverParaUltimo(p.cod_profissional), className: BTN_ICO, title: 'Mover pro final (limpa bairros)', 'aria-label': 'Mover pro final' }, ico('arrowdown', 15)),
                    h('button', { onClick: () => removerDaFila(p.cod_profissional), className: BTN_ICO_DEST, title: 'Remover da fila', 'aria-label': 'Remover da fila' }, ico('x', 15))
                )
            );
        };

        // HOME - lista de centrais (quando nenhuma selecionada)
        if (!centralSelecionada) {
            const ativas = centrais.filter(c => c.ativa);
            const somaFila = centrais.reduce((a, c) => a + (parseInt(c.na_fila) || 0), 0);
            const somaRota = centrais.reduce((a, c) => a + (parseInt(c.em_rota) || 0), 0);
            const somaVinc = centrais.reduce((a, c) => a + (parseInt(c.total_vinculados) || 0), 0);
            return h('div', { className: 'space-y-5 -mx-2 sm:mx-0' /* FILAS_CLEAN_V1 */ },
                h('div', { className: 'flex flex-wrap items-end justify-between gap-3' },
                    h('div', null,
                        tituloPagina('Filas de entrega'),
                        h('p', { className: 'text-sm text-gray-500 mt-1' }, `${centrais.length} ${centrais.length === 1 ? 'central' : 'centrais'} · clique em uma central para gerenciar`)
                    ),
                    h('button', { onClick: () => setModalCentral({}), className: BTN_PRI }, ico('plus', 16), 'Nova fila')
                ),
                centrais.length > 0 && kpiFaixa([
                    kpiCell('Centrais ativas', ativas.length, { sub: `de ${centrais.length} cadastradas` }),
                    kpiCell('Na fila agora', somaFila, { dot: '#d97706' }),
                    kpiCell('Em rota', somaRota, { dot: '#2563eb' }),
                    kpiCell('Motoboys vinculados', somaVinc)
                ]),
                h('div', { className: CARD + ' overflow-hidden' },
                    centrais.length === 0
                        ? vazio('Nenhuma fila cadastrada ainda.', h('button', { onClick: () => setModalCentral({}), className: BTN_PRI }, ico('plus', 16), 'Nova fila'))
                        : h(React.Fragment, null,
                            h('div', { className: 'grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_110px_110px_90px_90px_28px] gap-x-4 px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500' },
                                h('span', null, 'Central'), h('span', null, 'Status'), h('span', { className: 'hidden md:block text-right' }, 'Vinculados'), h('span', { className: 'hidden md:block text-right' }, 'Na fila'), h('span', { className: 'hidden md:block text-right' }, 'Em rota'), h('span', { className: 'hidden md:block' })),
                            centrais.map((c) => h('button', {
                                key: c.id,
                                type: 'button',
                                id: `fila-card-${c.id}`,
                                onClick: () => {
                                    window.__tuttsFilaShared = { nome: c.nome, ehAuto: c.tipo === 'auto', ativa: c.ativa };
                                    setCentralSelecionada(c);
                                },
                                className: 'w-full text-left grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_110px_110px_90px_90px_28px] gap-x-4 gap-y-1 items-center px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors'
                            },
                                h('div', { className: 'min-w-0' },
                                    h('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, c.nome),
                                    h('p', { className: 'text-xs text-gray-500 truncate' }, c.endereco || 'Sem endereço')
                                ),
                                h('div', { className: 'md:order-none' }, c.ativa ? pill('verde', 'Ativa') : pill('cinza', 'Inativa')),
                                h('p', { className: 'hidden md:block text-sm text-gray-700 text-right tabular-nums' }, c.total_vinculados || 0),
                                h('p', { className: 'hidden md:block text-sm font-semibold text-gray-900 text-right tabular-nums' }, c.na_fila || 0),
                                h('p', { className: 'hidden md:block text-sm font-semibold text-gray-900 text-right tabular-nums' }, c.em_rota || 0),
                                h('span', { className: 'hidden md:inline-flex justify-end text-gray-400' }, ico('arrowright', 16)),
                                h('p', { className: 'md:hidden col-span-2 text-xs text-gray-500 tabular-nums' }, `${c.na_fila || 0} na fila · ${c.em_rota || 0} em rota · ${c.total_vinculados || 0} vinculado${(c.total_vinculados || 0) === 1 ? '' : 's'}`)
                            ))
                        )
                ),
                // Modal criar central (precisa estar aqui também)
                modalCentral && renderModalCentral((e) => { e.preventDefault(); if (!enderecoValidado) { showToast('Busque o endereço primeiro', 'error'); return; } const fd = new FormData(e.target); salvarCentral({ nome: fd.get('nome'), endereco: coordenadasEncontradas?.enderecoFormatado || fd.get('endereco'), latitude: coordenadasEncontradas?.latitude, longitude: coordenadasEncontradas?.longitude, raio_metros: parseInt(fd.get('raio_metros')) }); }, !enderecoValidado)
            );
        }

        // DETALHE DA CENTRAL SELECIONADA
        const ehAutoCentral = centralSelecionada.tipo === 'auto';
        const badgeCentral = !centralSelecionada.ativa ? pill('cinza', 'Inativa') : ehAutoCentral ? pill('roxo', 'Auto') : pill('cinza', 'Manual');
        const ABAS = [['monitoramento', 'Monitor', 'chart'], ['vinculos', 'Vínculos', 'link'], ['penalidades', 'Penalidades', 'ban'], ['relatorios', 'Relatórios', 'filetext'], ['garantido', 'Garantido', 'shield'], ['config', 'Config', 'settings']];
        const nAguard = filaAtual.aguardando?.length || 0;
        const nRota = filaAtual.em_rota?.length || 0;

        return h('div', { className: 'space-y-5 -mx-2 sm:mx-0' /* FILAS_CLEAN_V1 */ },
            // Cabeçalho: voltar (breadcrumb) + título + ações
            h('div', null,
                h('button', { onClick: () => { setCentralSelecionada(null); carregarCentrais(); }, className: 'inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-800 mb-1.5', title: 'Voltar pra lista de centrais' }, ico('arrowleft', 14), 'Filas de entrega'),
                h('div', { className: 'flex flex-wrap items-end justify-between gap-3' },
                    h('div', { className: 'min-w-0' },
                        h('div', { className: 'flex items-center gap-2.5 flex-wrap' }, tituloPagina(centralSelecionada.nome), badgeCentral),
                        h('p', { className: 'text-sm text-gray-500 mt-1 truncate' }, (centralSelecionada.endereco || '—') + ' · ' + (centralSelecionada.total_vinculados || 0) + ' vinculados')
                    ),
                    h('button', { onClick: abrirModalColocarFila, className: BTN_PRI }, ico('plus', 16), 'Colocar na fila')
                )
            ),

            // Abas internas (sublinhadas)
            h('div', { className: 'border-b border-gray-200 overflow-x-auto', role: 'tablist' },
                h('div', { className: 'flex gap-6 min-w-max' },
                    ABAS.map(([id, label, icone]) => {
                        const at = abaInterna === id;
                        return h('button', {
                            key: id, role: 'tab', 'aria-selected': at,
                            onClick: () => setAbaInterna(id),
                            className: 'inline-flex items-center gap-1.5 -mb-px py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors hover:text-gray-900',
                            style: { color: at ? '#5d0b85' : '#6b7280', fontWeight: at ? 600 : 500, borderBottomColor: at ? '#770fa8' : 'transparent' }
                        }, ico(icone, 15), label);
                    })
                )
            ),

            h('div', null,
                // MONITORAMENTO
                abaInterna === 'monitoramento' && centralSelecionada && h('div', { className: 'space-y-4' },
                    kpiFaixa([
                        kpiCell('Aguardando', filaAtual.total_aguardando || 0, { dot: '#d97706' }),
                        kpiCell('Em rota', filaAtual.total_em_rota || 0, { dot: '#2563eb' }),
                        kpiCell('Alertas +90min', filaAtual.alertas?.length || 0, { cor: filaAtual.alertas?.length > 0 ? '#991b1b' : '#9ca3af', dot: filaAtual.alertas?.length > 0 ? '#dc2626' : null }),
                        // 🆕 2026-05-24: KPI de motoboys na fila SEM alocação na disponibilidade
                        (filaAtual.total_sem_disponibilidade || 0) > 0 && kpiCell('Sem disponibilidade', filaAtual.total_sem_disponibilidade || 0, { cor: '#991b1b', dot: '#dc2626', title: 'Motoboys aguardando na fila mas sem linha em disponibilidade. Aloque-os na escala para que apareçam nos relatórios.' }),
                        kpiCell('Vinculados', centralSelecionada.total_vinculados || 0, { sub: 'motoboys nesta central' })
                    ]),
                    // Alertas (> 1h30 em rota)
                    filaAtual.alertas?.length > 0 && h('div', { className: 'bg-white border border-red-200 rounded-[14px] overflow-hidden' },
                        h('div', { className: 'flex flex-wrap items-center gap-2 px-4 py-3 bg-red-50' },
                            ico('alert', 16, '#dc2626'),
                            h('p', { className: 'text-sm font-semibold text-red-800' }, `Atenção: ${filaAtual.alertas.length} profissional(is) não retornou`),
                            h('span', { className: 'text-xs text-red-800' }, '· tempo em rota > 1h30min')
                        ),
                        filaAtual.alertas.map(p => h('div', { key: p.cod_profissional, className: 'flex items-center gap-3 px-4 py-2.5 border-t border-red-100' },
                            h('p', { className: 'flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate' }, p.nome_profissional),
                            h('span', { className: 'text-sm font-semibold text-red-800 tabular-nums' }, `${formatarTempo(p.minutos_em_rota)} em rota`),
                            h('button', { onClick: () => removerDaFila(p.cod_profissional), className: BTN_ICO_DEST, title: 'Remover da fila', 'aria-label': 'Remover da fila' }, ico('x', 15))
                        ))
                    ),
                    h('div', { className: 'grid lg:grid-cols-2 gap-4 items-start' },
                        // FILA DE ESPERA
                        h('div', { className: CARD + ' overflow-hidden' },
                            h('div', { className: 'flex items-center justify-between gap-2 px-4 py-3' },
                                tituloCard('Fila de espera', contador(nAguard)),
                                h('span', { className: 'text-xs text-gray-400 hidden sm:inline' }, 'arraste para reordenar')
                            ),
                            nAguard === 0
                                ? h('div', { className: 'border-t border-gray-100' }, vazio('Nenhum motoboy aguardando.'))
                                : h('div', null, filaAtual.aguardando.map((p, i) => renderCardAguardando(p, i)))
                        ),
                        // EM ROTA
                        h('div', { className: CARD + ' overflow-hidden' },
                            h('div', { className: 'flex items-center justify-between gap-2 px-4 py-3' }, tituloCard('Em rota', contador(nRota))),
                            nRota === 0
                                ? h('div', { className: 'border-t border-gray-100' }, vazio('Nenhum motoboy despachado.'))
                                : h('div', null, filaAtual.em_rota.map(p => h('div', { key: p.cod_profissional, className: 'px-4 py-3 border-t border-gray-100' },
                                    h('div', { className: 'flex items-center gap-3' },
                                        avatar(p.foto, p.nome_profissional, 32),
                                        h('div', { className: 'flex-1 min-w-0' },
                                            h('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, p.nome_profissional),
                                            h('p', { className: 'text-xs tabular-nums ' + (p.minutos_em_rota > 90 ? 'text-red-800 font-semibold' : 'text-gray-500') }, `${formatarTempo(p.minutos_em_rota)} em rota`, p.corrida_unica ? ' · Corrida Única' : '')
                                        ),
                                        h('span', { className: 'hidden sm:inline-flex' }, p.minutos_em_rota > 90 ? pill('vermelho', '+1h30 em rota') : p.corrida_unica ? pill('azul', 'Corrida única') : pill('azul', 'Em rota')),
                                        h('button', { onClick: () => removerDaFila(p.cod_profissional), className: BTN_ICO_DEST, title: 'Remover', 'aria-label': 'Remover' }, ico('x', 15))
                                    ),
                                    h('div', { className: 'flex flex-wrap gap-1 mt-2 pl-11 ' + (p.bairros && p.bairros.length > 0 ? '' : 'sm:hidden') },
                                        h('span', { className: 'contents sm:hidden' }, p.minutos_em_rota > 90 ? pill('vermelho', '+1h30 em rota') : p.corrida_unica ? pill('azul', 'Corrida única') : pill('azul', 'Em rota')),
                                        (p.bairros || []).map((b, bi) => h('span', { key: bi, className: 'inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700' }, b))
                                    )
                                )))
                        )
                    )
                ),
                // PENALIDADES
                abaInterna === 'penalidades' && centralSelecionada && h('div', { className: CARD + ' overflow-hidden' },
                    h('div', { className: 'flex flex-wrap items-center justify-between gap-3 px-4 py-3' },
                        h('div', null, tituloCard('Penalidades ativas', contador(penalidades.length)), h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'Bloqueios automáticos (saída voluntária) e punições manuais')),
                        h('button', { onClick: abrirModalPunir, className: BTN_PRI }, ico('plus', 16), 'Aplicar punição')
                    ),
                    penalidades.length === 0 ? h('div', { className: 'border-t border-gray-100' }, vazio('Nenhuma penalidade ativa.')) :
                    h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full min-w-[720px]' },
                        h('thead', { className: 'bg-gray-50' }, h('tr', null, h('th', { className: TH }, 'Motoboy'), h('th', { className: TH }, 'Tipo'), h('th', { className: TH }, 'Detalhe'), h('th', { className: TH }, 'Bloqueado até'), h('th', { className: TH + ' text-right' }, 'Restante'), h('th', { className: TH + ' text-right' }, 'Ação'))),
                        h('tbody', null, penalidades.map(p => {
                            const ehManual = p.tipo === 'manual';
                            // 🆕 2026-05-05: DATA + hora do fim do bloqueio ("Hoje HH:MM" / "DD/MM HH:MM" / com ano se outro ano)
                            const dtBloqueio = new Date(p.bloqueado_ate);
                            const hojeStr = new Date().toDateString();
                            const ehHoje = dtBloqueio.toDateString() === hojeStr;
                            const ehMesmoAno = dtBloqueio.getFullYear() === new Date().getFullYear();
                            const horaBloqueio = ehHoje
                                ? 'Hoje ' + dtBloqueio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                : dtBloqueio.toLocaleString('pt-BR', ehMesmoAno
                                    ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
                                    : { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            const restante = formatarBloqueioRestante(p.bloqueado_ate);
                            const detalhe = ehManual ? (p.aplicado_por_nome ? 'Aplicada por ' + p.aplicado_por_nome : 'Aplicada manualmente') : `Saídas hoje: ${p.saidas_hoje || 0}`;
                            return h('tr', { key: p.id, className: 'hover:bg-gray-50' },
                                h('td', { className: TD }, h('p', { className: 'font-semibold text-gray-900' }, p.nome_profissional || `#${p.cod_profissional}`), h('p', { className: 'text-xs text-gray-500 tabular-nums' }, '#' + p.cod_profissional)),
                                h('td', { className: TD }, ehManual ? pill('roxo', 'Manual') : pill('vermelho', 'Automática')),
                                h('td', { className: TD + ' text-gray-600' }, detalhe),
                                h('td', { className: TD + ' tabular-nums whitespace-nowrap' }, horaBloqueio),
                                h('td', { className: TD + ' text-right tabular-nums whitespace-nowrap font-semibold text-gray-900' }, restante),
                                h('td', { className: TD + ' text-right' }, h('button', { onClick: () => anularPenalidade(p.cod_profissional), className: BTN_SEC_SM }, ico('check', 14, '#16a34a'), 'Anular'))
                            );
                        }))
                    ))
                ),
                // VINCULOS
                abaInterna === 'vinculos' && centralSelecionada && h('div', { className: CARD + ' overflow-hidden' },
                    h('div', { className: 'flex flex-wrap items-center justify-between gap-3 px-4 py-3' },
                        h('div', { className: 'min-w-0' }, tituloCard('Profissionais vinculados', contador(vinculos.length)), h('p', { className: 'text-xs text-gray-500 mt-0.5 truncate' }, `Vinculados à ${centralSelecionada.nome}`)),
                        h('button', { onClick: () => setModalVinculo(true), className: BTN_PRI }, ico('plus', 16), 'Vincular')
                    ),
                    h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full min-w-[520px]' },
                        h('thead', { className: 'bg-gray-50' }, h('tr', null, h('th', { className: TH }, 'Código'), h('th', { className: TH }, 'Nome'), h('th', { className: TH }, 'Status'), h('th', { className: TH + ' text-right' }, 'Ações'))),
                        h('tbody', null, vinculos.length === 0
                            ? h('tr', null, h('td', { colSpan: 4, className: 'border-t border-gray-100' }, vazio('Nenhum profissional vinculado.')))
                            : vinculos.map(p => h('tr', { key: p.cod_profissional, className: 'hover:bg-gray-50' },
                                h('td', { className: TD + ' tabular-nums text-gray-500' }, p.cod_profissional),
                                h('td', { className: TD + ' font-semibold text-gray-900' }, p.nome_profissional),
                                h('td', { className: TD }, p.status_fila === 'em_rota' ? pill('azul', 'Em rota') : p.status_fila === 'aguardando' ? pill('ambar', 'Na fila') : pill('cinza', 'Fora')),
                                h('td', { className: TD + ' text-right' }, h('button', { onClick: () => desvincularProfissional(p.cod_profissional), className: BTN_ICO_DEST, title: 'Desvincular', 'aria-label': 'Desvincular' }, ico('trash', 14)))
                            )))
                    ))
                ),
                // RELATORIOS
                abaInterna === 'relatorios' && centralSelecionada && h('div', { className: 'space-y-4' },
                    h('div', { className: CARD + ' p-4 flex flex-wrap items-end gap-3' },
                        h('div', null, h('label', { className: LABEL }, 'Data'), h('input', { type: 'date', value: filtroData, onChange: (e) => setFiltroData(e.target.value), className: INPUT_AUTO })),
                        h('button', { onClick: () => { carregarEstatisticas(centralSelecionada.id); carregarHistorico(centralSelecionada.id); }, className: BTN_PRI }, ico('search', 16), 'Filtrar')
                    ),
                    estatisticas && kpiFaixa([
                        kpiCell('Total de saídas', estatisticas.total_saidas),
                        kpiCell('Tempo médio de espera', `${estatisticas.tempo_medio_espera} min`)
                    ]),
                    h('div', { className: 'grid lg:grid-cols-3 gap-4 items-start' },
                        estatisticas?.ranking?.length > 0 && h('div', { className: CARD + ' overflow-hidden' },
                            h('div', { className: 'px-4 py-3' }, tituloCard('Ranking de saídas')),
                            estatisticas.ranking.map((p, i) => h('div', { key: p.cod_profissional, className: 'flex items-center gap-3 px-4 py-2.5 border-t border-gray-100' },
                                h('span', { style: { width: 24, fontFamily: SORA, fontWeight: 700, fontSize: 14, color: i < 3 ? '#5d0b85' : '#6b7280', fontVariantNumeric: 'tabular-nums' } }, `${i + 1}º`),
                                h('span', { className: 'flex-1 min-w-0 text-sm font-medium text-gray-900 truncate' }, p.nome_profissional),
                                h('span', { className: 'text-sm font-semibold text-gray-900 tabular-nums' }, `${p.total_saidas} saídas`)
                            ))
                        ),
                        h('div', { className: CARD + ' overflow-hidden ' + (estatisticas?.ranking?.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3') },
                            h('div', { className: 'px-4 py-3' }, tituloCard('Histórico', contador(historico.length))),
                            h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full min-w-[520px]' },
                                h('thead', { className: 'bg-gray-50' }, h('tr', null, h('th', { className: TH }, 'Hora'), h('th', { className: TH }, 'Profissional'), h('th', { className: TH }, 'Ação'), h('th', { className: TH + ' text-right' }, 'Tempo'))),
                                h('tbody', null, historico.length === 0
                                    ? h('tr', null, h('td', { colSpan: 4, className: 'border-t border-gray-100' }, vazio('Nenhuma movimentação nesta data.')))
                                    : historico.map((hh, i) => h('tr', { key: i, className: 'hover:bg-gray-50' },
                                        h('td', { className: TD + ' tabular-nums text-gray-500' }, formatarHora(hh.created_at)),
                                        h('td', { className: TD + ' font-medium text-gray-900' }, hh.nome_profissional),
                                        h('td', { className: TD }, hh.acao === 'entrada' ? pill('ambar', 'Entrada') : hh.acao === 'enviado_rota' ? pill('azul', 'Enviado') : (hh.acao === 'retorno' || hh.acao === 'retorno_prioridade') ? pill('verde', 'Retorno') : hh.acao === 'removido' ? pill('vermelho', 'Removido') : hh.acao === 'reordenado' ? pill('cinza', 'Reordenado') : hh.acao === 'penalidade_anulada' ? pill('verde', 'Penalidade anulada') : pill('cinza', 'Saiu')),
                                        h('td', { className: TD + ' text-right tabular-nums text-gray-500' }, hh.tempo_espera_minutos ? `${hh.tempo_espera_minutos} min espera` : hh.tempo_rota_minutos ? `${hh.tempo_rota_minutos} min rota` : '-')
                                    )))
                            ))
                        )
                    )
                ),
                // GARANTIDO (painel proprio, auto-contido)
                abaInterna === 'garantido' && centralSelecionada && (typeof window.ModuloGarantidoAdmin !== 'undefined'
                    ? h(window.ModuloGarantidoAdmin, { apiUrl, fetchAuth, showToast, central: centralSelecionada })
                    : h('div', { className: CARD }, vazio('Recarregue a pagina (Ctrl+F5) para carregar o Garantido.'))),
                // CONFIG (com Regiões)
                abaInterna === 'config' && h('div', { className: 'space-y-4' },
                    h('div', { className: CARD + ' overflow-hidden' },
                        h('div', { className: 'px-4 py-3' }, tituloCard('Centrais cadastradas', contador(centrais.length))),
                        h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full min-w-[640px]' },
                            h('thead', { className: 'bg-gray-50' }, h('tr', null, h('th', { className: TH }, 'Central'), h('th', { className: TH }, 'Status'), h('th', { className: TH }, 'Coordenadas'), h('th', { className: TH + ' text-right' }, 'Raio'), h('th', { className: TH + ' text-right' }, 'Ações'))),
                            h('tbody', null, centrais.map(c => h('tr', { key: c.id, className: 'hover:bg-gray-50' },
                                h('td', { className: TD }, h('p', { className: 'font-semibold text-gray-900' }, c.nome), h('p', { className: 'text-xs text-gray-500' }, c.endereco)),
                                h('td', { className: TD }, c.ativa ? pill('verde', 'Ativa') : pill('cinza', 'Inativa')),
                                h('td', { className: TD + ' tabular-nums text-gray-500 text-xs' }, `${parseFloat(c.latitude).toFixed(6)}, ${parseFloat(c.longitude).toFixed(6)}`),
                                h('td', { className: TD + ' text-right tabular-nums' }, `${c.raio_metros}m`),
                                h('td', { className: TD + ' text-right whitespace-nowrap' },
                                    h('div', { className: 'inline-flex gap-1.5' },
                                        h('button', { onClick: () => setModalCentral(c), className: BTN_SEC_SM }, ico('pencil', 14), 'Editar'),
                                        h('button', { onClick: async () => { if (!window.confirm('Excluir?')) return; try { const r = await fetchAuth(`${apiUrl}/filas/centrais/${c.id}`, { method: 'DELETE' }); const d = await r.json(); if (d.success) { showToast('Excluída!', 'success'); carregarCentrais(); } else showToast(d.error, 'error'); } catch (e) { showToast('Erro', 'error'); } }, className: BTN_ICO_DEST, title: 'Excluir', 'aria-label': 'Excluir central' }, ico('trash', 14))
                                    )
                                )
                            )))
                        ))
                    ),
                    // REGIÕES
                    centralSelecionada && h('div', { className: CARD + ' p-4 space-y-3' },
                        h('div', null, tituloCard('Regiões de rotas', contador(regioes.length)), h('p', { className: 'text-xs text-gray-500 mt-0.5' }, centralSelecionada.nome)),
                        h('div', { className: 'flex gap-2' },
                            h('input', { type: 'text', value: novaRegiaoInput, onChange: (e) => setNovaRegiaoInput(e.target.value.toUpperCase()), onKeyDown: (e) => { if (e.key === 'Enter' && novaRegiaoInput.trim()) { criarRegiao(novaRegiaoInput); setNovaRegiaoInput(''); } }, placeholder: 'Nome da região...', className: INPUT + ' flex-1' }),
                            h('button', { onClick: () => { if (novaRegiaoInput.trim()) { criarRegiao(novaRegiaoInput); setNovaRegiaoInput(''); } }, className: BTN_PRI + ' flex-shrink-0' }, ico('plus', 16), h('span', { className: 'hidden sm:inline' }, 'Criar região'))
                        ),
                        regioes.length === 0 ? h('p', { className: 'text-sm text-gray-500 text-center py-4' }, 'Nenhuma região criada.') :
                        h('div', { className: 'border border-gray-200 rounded-[10px] overflow-hidden' }, regioes.map(r => h('div', { key: r.id, className: 'px-3 py-2.5 border-t border-gray-100 first:border-t-0' },
                            h('div', { className: 'flex items-center justify-between gap-2' },
                                h('span', { className: 'text-sm font-semibold text-gray-900' }, `${r.nome}`),
                                h('div', { className: 'flex items-center gap-2' },
                                    h('span', { className: 'text-xs text-gray-500 tabular-nums' }, `${r.total_bairros} bairro(s)`),
                                    h('button', { onClick: () => removerRegiao(r.id), className: 'inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-800 hover:bg-red-50', title: 'Remover região', 'aria-label': 'Remover região' }, ico('x', 14))
                                )
                            ),
                            h('div', { className: 'flex flex-wrap gap-1.5 mt-1.5' },
                                bairrosConfig.filter(b => b.regiao_id === r.id).sort((a, b) => a.nome.localeCompare(b.nome)).map(b => h('span', { key: b.id, className: 'inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700' }, `${b.nome}`, h('button', { onClick: () => atualizarBairroRegiao(b.id, null), className: 'inline-flex text-gray-400 hover:text-red-800', title: 'Remover da região', 'aria-label': 'Remover da região' }, ico('x', 12))))
                            )
                        )))
                    ),
                    // BAIRROS
                    centralSelecionada && h('div', { className: CARD + ' p-4 space-y-3' },
                        h('div', null, tituloCard('Bairros', contador(bairrosConfig.length + ' cadastrados')), h('p', { className: 'text-xs text-gray-500 mt-0.5' }, centralSelecionada.nome)),
                        h('div', { className: 'flex flex-wrap gap-2' },
                            h('input', { type: 'text', id: 'config-bairro-input', placeholder: 'Nome do bairro...', className: INPUT_AUTO + ' flex-1 min-w-[160px]', style: { textTransform: 'uppercase' }, onKeyDown: function (e) { if (e.key === 'Enter' && e.target.value.trim()) { adicionarBairroConfig(e.target.value); e.target.value = ''; } } }),
                            regioes.length > 0 && h('select', { id: 'config-bairro-regiao', className: INPUT_AUTO }, h('option', { value: '' }, 'Sem região'), regioes.map(r => h('option', { key: r.id, value: r.id }, r.nome))),
                            h('button', { onClick: function () { var inp = document.getElementById('config-bairro-input'); var sel = document.getElementById('config-bairro-regiao'); if (inp && inp.value.trim()) { adicionarBairroConfig(inp.value, sel ? sel.value : null); inp.value = ''; } }, className: BTN_PRI }, ico('plus', 16), 'Adicionar')
                        ),
                        // Bairros sem região
                        h('div', null,
                            h('p', { className: 'text-xs font-semibold text-gray-500 mb-2' }, 'Sem região'),
                            h('div', { className: 'flex flex-wrap gap-1.5' },
                                bairrosConfig.filter(b => !b.regiao_id).sort((a, b) => a.nome.localeCompare(b.nome)).map(b => h('div', { key: b.id, className: 'inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 bg-white border border-gray-200 rounded-full' },
                                    h('span', { className: 'text-xs font-medium text-gray-700' }, b.nome),
                                    regioes.length > 0 && h('select', { value: '', onChange: (e) => { if (e.target.value) atualizarBairroRegiao(b.id, e.target.value); }, className: 'text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-1 py-0.5', style: { maxWidth: '96px' } }, h('option', { value: '' }, '→ Região'), regioes.map(r => h('option', { key: r.id, value: r.id }, r.nome))),
                                    h('button', { onClick: function () { if (window.confirm('Remover "' + b.nome + '"?')) removerBairroConfig(b.id); }, className: 'inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-red-800 hover:bg-red-50', title: 'Remover bairro', 'aria-label': 'Remover bairro' }, ico('x', 12))
                                ))
                            )
                        )
                    ),
                    !centralSelecionada && null
                )
            ),
            // MODAL CRIAR/EDITAR CENTRAL
            modalCentral && renderModalCentral((e) => { e.preventDefault(); if (!enderecoValidado && !modalCentral.id) { showToast('Busque o endereço primeiro', 'error'); return; } const fd = new FormData(e.target); salvarCentral({ id: modalCentral.id, nome: fd.get('nome'), endereco: coordenadasEncontradas?.enderecoFormatado || fd.get('endereco'), latitude: coordenadasEncontradas?.latitude || modalCentral.latitude, longitude: coordenadasEncontradas?.longitude || modalCentral.longitude, raio_metros: parseInt(fd.get('raio_metros')), ativa: fd.get('ativa') === 'on', abertura_horario_ativa: fd.get('abertura_horario_ativa') === 'on', abertura_horario: fd.get('abertura_horario') || null }); }, !enderecoValidado && !modalCentral.id),
            // MODAL VINCULAR
            modalVinculo && centralSelecionada && modalBox({
                titulo: 'Vincular profissional',
                sub: `à ${centralSelecionada.nome}`,
                onFechar: () => setModalVinculo(false),
                corpo: h('div', { className: 'space-y-3 pt-1' },
                    h('div', { className: 'relative' },
                        h('span', { className: 'absolute left-3 top-1/2 -translate-y-1/2 inline-flex text-gray-400' }, ico('search', 15)),
                        h('input', { type: 'text', placeholder: 'Buscar por nome ou código...', className: INPUT + ' pl-9', onChange: (e) => { const s = e.target.value.toLowerCase(); document.querySelectorAll('.prof-item').forEach(el => { el.style.display = el.textContent.toLowerCase().includes(s) ? '' : 'none'; }); } })
                    ),
                    h('div', { className: 'border border-gray-200 rounded-[10px] overflow-hidden' }, profissionaisDisponiveis.map(p => h('div', { key: p.cod_profissional, className: 'prof-item flex items-center gap-3 px-3 py-2.5 border-t border-gray-100 first:border-t-0' },
                        avatar(null, p.full_name, 28),
                        h('div', { className: 'flex-1 min-w-0' }, h('p', { className: 'text-sm font-medium text-gray-900 truncate' }, p.full_name), h('p', { className: 'text-xs text-gray-500 tabular-nums' }, `#${p.cod_profissional}`)),
                        h('button', { onClick: () => { vincularProfissional(p.cod_profissional, p.full_name); setModalVinculo(false); }, className: BTN_SEC_SM }, ico('plus', 14), 'Vincular')
                    )))
                ),
                rodape: h('button', { onClick: () => setModalVinculo(false), className: BTN_SEC }, 'Fechar')
            }),
            // MODAL BAIRROS → LIBERAR NOTA
            modalBairros && centralSelecionada && (() => {
                const chipAdd = (b) => h('div', { key: b.id, className: 'inline-flex items-stretch rounded-full border border-gray-200 bg-white overflow-hidden' },
                    h('button', { onClick: function () { adicionarBairroModal(b.nome); }, className: 'inline-flex items-center gap-1 h-8 pl-3 pr-2 text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-800 transition-colors active:scale-95' }, ico('plus', 13), b.nome),
                    h('button', { onClick: function () { if (window.confirm('Remover "' + b.nome + '" do cadastro?')) removerBairroConfig(b.id); }, className: 'inline-flex items-center px-1.5 border-l border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-800', title: 'Remover bairro do cadastro', 'aria-label': 'Remover bairro do cadastro' }, ico('x', 12)));
                const semRegiao = bairrosConfig.filter(function (b) { return !b.regiao_id; }).sort(function (a, b) { return a.nome.localeCompare(b.nome); });
                return modalBox({
                    largura: 'max-w-2xl',
                    titulo: modalBairros.modoEdicao ? 'Editar bairros' : 'Liberar ' + (modalBairros.notaNum || '') + 'ª Nota',
                    sub: modalBairros.nome,
                    onFechar: function () { setModalBairros(null); },
                    corpo: h('div', { className: 'space-y-4 pt-1' },
                        // BAIRROS SELECIONADOS
                        h('div', null,
                            h('p', { className: 'text-xs font-semibold text-gray-700 mb-2' }, 'Bairros da nota ', (modalBairros.bairros || []).length > 0 && h('span', { className: 'text-purple-700 tabular-nums' }, '(' + (modalBairros.bairros || []).length + ')')),
                            (modalBairros.bairros || []).length === 0 ? h('p', { className: 'text-sm text-gray-400' }, 'Selecione os bairros abaixo') :
                            h('div', { className: 'flex flex-wrap gap-1.5' }, (modalBairros.bairros || []).map(function (b, i) { return h('span', { key: i, onClick: function () { removerBairroByIndex(i); }, className: 'inline-flex items-center gap-1 h-8 pl-3 pr-2 rounded-full text-sm font-semibold bg-purple-50 text-purple-800 border border-purple-200 cursor-pointer hover:bg-red-50 hover:text-red-800 hover:border-red-200 transition-colors', title: 'Clique para remover' }, b, ico('x', 13)); }))
                        ),
                        // REGIÕES COM BAIRROS
                        regioes.length > 0 && regioes.map(function (r) {
                            var bairrosRegiao = bairrosConfig.filter(function (b) { return b.regiao_id === r.id; }).sort(function (a, b) { return a.nome.localeCompare(b.nome); });
                            if (bairrosRegiao.length === 0) return null;
                            return h('div', { key: r.id, className: 'border-t border-gray-100 pt-3' },
                                h('p', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2' }, ico('map', 14, '#6b7280'), r.nome),
                                h('div', { className: 'flex flex-wrap gap-1.5' }, bairrosRegiao.map(chipAdd))
                            );
                        }),
                        // BAIRROS SEM REGIÃO
                        h('div', { className: 'border-t border-gray-100 pt-3' },
                            h('p', { className: 'inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-2' }, ico('pin', 14, '#6b7280'), regioes.length > 0 ? 'Sem região' : 'Bairros disponíveis'),
                            semRegiao.length === 0 ? h('p', { className: 'text-sm text-gray-400' }, 'Nenhum bairro sem região') :
                            h('div', { className: 'flex flex-wrap gap-1.5' }, semRegiao.map(chipAdd))
                        ),
                        // NOVO BAIRRO
                        h('div', { className: 'border-t border-gray-100 pt-3' },
                            h('label', { className: LABEL }, 'Adicionar novo bairro'),
                            h('div', { className: 'flex gap-2' },
                                h('input', { type: 'text', value: novoBairroInput, onChange: function (e) { setNovoBairroInput(e.target.value.toUpperCase()); }, onKeyDown: function (e) { if (e.key === 'Enter' && novoBairroInput.trim()) { adicionarBairroConfig(novoBairroInput); adicionarBairroModal(novoBairroInput.trim()); setNovoBairroInput(''); } }, placeholder: 'NOME DO BAIRRO...', className: INPUT + ' flex-1' }),
                                h('button', { onClick: function () { if (novoBairroInput.trim()) { adicionarBairroConfig(novoBairroInput); adicionarBairroModal(novoBairroInput.trim()); setNovoBairroInput(''); } }, className: BTN_SEC + ' flex-shrink-0', 'aria-label': 'Adicionar bairro' }, ico('plus', 16), 'Adicionar')
                            )
                        )
                    ),
                    rodape: [
                        h('button', { key: 'c', onClick: function () { setModalBairros(null); }, className: BTN_SEC }, 'Cancelar'),
                        modalBairros.modoEdicao
                            ? h('button', { key: 's', onClick: function () { salvarEdicaoBairros(); }, className: BTN_PRI }, ico('save', 16), 'Salvar bairros')
                            : h('button', { key: 'l', onClick: function () { liberarNotaComBairros(); }, className: BTN_PRI }, ico('package', 16), 'Liberar ' + (modalBairros.notaNum || '') + 'ª Nota')
                    ]
                });
            })(),

            // 🚀 2026-05: MODAL Colocar Vinculado na Fila
            modalColocarFila && centralSelecionada && modalBox({
                titulo: 'Colocar na fila',
                sub: centralSelecionada.nome,
                onFechar: () => setModalColocarFila(null),
                corpo: h('div', { className: 'space-y-3 pt-1' },
                    h('div', { className: 'relative' },
                        h('span', { className: 'absolute left-3 top-1/2 -translate-y-1/2 inline-flex text-gray-400' }, ico('search', 15)),
                        h('input', { type: 'text', value: modalColocarFila.filtro, onChange: (e) => setModalColocarFila({ ...modalColocarFila, filtro: e.target.value }), placeholder: 'Buscar por nome ou código...', className: INPUT + ' pl-9' })
                    ),
                    (() => {
                        const filtro = (modalColocarFila.filtro || '').toLowerCase().trim();
                        const lista = filtro
                            ? modalColocarFila.vinculados.filter(v =>
                                (v.nome_profissional || '').toLowerCase().includes(filtro) ||
                                String(v.cod_profissional || '').includes(filtro))
                            : modalColocarFila.vinculados;
                        if (modalColocarFila.vinculados.length === 0) return vazio('Todos os vinculados já estão na fila ou em rota.');
                        if (lista.length === 0) return vazio('Nenhum resultado.');
                        return h('div', { className: 'border border-gray-200 rounded-[10px] overflow-hidden' },
                            lista.map(v => h('button', {
                                key: v.cod_profissional,
                                onClick: () => colocarMotoboyNaFila(v.cod_profissional),
                                className: 'w-full flex items-center gap-3 px-3 py-2.5 border-t border-gray-100 first:border-t-0 hover:bg-gray-50 transition-colors text-left'
                            },
                                avatar(null, v.nome_profissional, 28),
                                h('div', { className: 'flex-1 min-w-0' },
                                    h('div', { className: 'text-sm font-medium text-gray-900 truncate' }, v.nome_profissional || '(sem nome)'),
                                    h('div', { className: 'text-xs text-gray-500 tabular-nums' }, '#' + v.cod_profissional)
                                ),
                                h('span', { className: 'inline-flex items-center gap-1 text-xs font-semibold text-purple-700' }, ico('plus', 14), 'Adicionar')
                            ))
                        );
                    })()
                ),
                rodape: h('button', { onClick: () => setModalColocarFila(null), className: BTN_SEC }, 'Fechar')
            }),
            // 🆕 2026-05: MODAL APLICAR PUNIÇÃO MANUAL (admin)
            modalPunir && modalBox({
                titulo: 'Aplicar punição manual',
                sub: centralSelecionada.nome,
                onOverlay: () => { if (!punirEnviando) setModalPunir(false); },
                onFechar: () => !punirEnviando && setModalPunir(false),
                fecharDisabled: punirEnviando,
                corpo: h('div', { className: 'space-y-4 pt-1' },
                    // Seletor motoboy
                    h('div', null,
                        h('label', { className: LABEL }, 'Motoboy'),
                        h('select', { value: punirCod, onChange: e => setPunirCod(e.target.value), className: INPUT, disabled: punirEnviando },
                            h('option', { value: '' }, vinculos.length === 0 ? 'Nenhum motoboy vinculado a esta central' : 'Selecione um motoboy vinculado…'),
                            vinculos.map(v => h('option', { key: v.cod_profissional, value: v.cod_profissional }, `${v.cod_profissional} — ${v.nome_profissional}`))
                        )
                    ),
                    // Chips tempo
                    h('div', null,
                        h('label', { className: LABEL }, 'Tempo de bloqueio'),
                        h('div', { className: 'flex flex-wrap gap-1.5' },
                            [
                                { v: 30, l: '30 min' }, { v: 60, l: '1h' }, { v: 120, l: '2h' },
                                { v: 240, l: '4h' }, { v: 480, l: '8h' }, { v: 1440, l: '24h' },
                                { v: 2880, l: '48h' }
                            ].map(opt => h('button', {
                                key: opt.v,
                                onClick: () => { setPunirCustom(false); setPunirMinutos(opt.v); },
                                disabled: punirEnviando,
                                className: 'h-8 px-3 rounded-full text-xs font-semibold border transition-colors ' +
                                    (!punirCustom && punirMinutos === opt.v ? 'bg-purple-50 border-purple-700 text-purple-800' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')
                            }, opt.l)),
                            h('button', {
                                onClick: () => { setPunirCustom(true); },
                                disabled: punirEnviando,
                                className: 'h-8 px-3 rounded-full text-xs font-semibold border transition-colors ' +
                                    (punirCustom ? 'bg-purple-50 border-purple-700 text-purple-800' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')
                            }, 'Personalizado')
                        ),
                        punirCustom && h('div', { className: 'flex items-center gap-2 mt-2' },
                            h('input', { type: 'number', min: 1, max: 10080, value: punirCustomValor, onChange: e => setPunirCustomValor(e.target.value), placeholder: 'Minutos (1 a 10080)', className: INPUT + ' flex-1', disabled: punirEnviando }),
                            h('span', { className: 'text-xs text-gray-500' }, 'min')
                        ),
                        !punirCustom && h('p', { className: 'text-xs text-gray-500 mt-1.5 tabular-nums' },
                            (() => {
                                const fim = new Date(Date.now() + punirMinutos * 60000);
                                const ehHoje = fim.toDateString() === new Date().toDateString();
                                const txt = ehHoje
                                    ? 'Hoje ' + fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                    : fim.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                                return 'Bloqueio até ' + txt;
                            })()
                        )
                    ),
                    // Motivo opcional
                    h('div', null,
                        h('label', { className: LABEL }, 'Motivo (opcional, interno)'),
                        h('textarea', { rows: 2, maxLength: 500, value: punirMotivo, onChange: e => setPunirMotivo(e.target.value), placeholder: 'Ex: insistência em pegar entregas após aviso', className: 'w-full px-3 py-2 rounded-[10px] border border-gray-200 text-sm focus:outline-none focus:border-purple-700 focus:ring-2 focus:ring-purple-100', disabled: punirEnviando }),
                        h('p', { className: 'text-xs text-gray-500 mt-1' }, 'Apenas para registro interno. Não é exibido pro motoboy.')
                    ),
                    // Aviso remoção da fila
                    h('div', { className: 'flex items-start gap-2 rounded-[10px] bg-amber-50 px-3 py-2' },
                        ico('alert', 15, '#d97706'),
                        h('p', { className: 'text-xs text-amber-800' }, 'Se o motoboy estiver na fila, será removido automaticamente.')
                    )
                ),
                rodape: [
                    h('button', { key: 'c', onClick: () => setModalPunir(false), disabled: punirEnviando, className: BTN_SEC }, 'Cancelar'),
                    h('button', { key: 'a', onClick: aplicarPunicao, disabled: punirEnviando || !punirCod, className: BTN_DEST }, punirEnviando ? h('span', { className: 'inline-flex items-center gap-1.5' }, ico('clock', 16), 'Aplicando...') : h('span', { className: 'inline-flex items-center gap-1.5' }, ico('ban', 16), 'Aplicar punição'))
                ]
            })
        );
    }

    // ==================== RENDERIZAÇÃO USER ====================
    if (loading) return h('div', { className: 'flex items-center justify-center min-h-[400px]' }, h('div', { className: 'text-center' }, h('div', { className: 'w-10 h-10 border-[3px] border-purple-100 border-t-purple-700 rounded-full animate-spin mx-auto mb-3' }), h('p', { className: 'text-sm text-gray-500' }, 'Carregando...')));
    if (!minhaCentral) return h('div', { className: 'min-h-[400px] flex items-center justify-center' }, h('div', { className: CARD + ' text-center p-8 max-w-md mx-4' }, h('div', { className: 'mb-3' }, pill('cinza', 'Sem vínculo')), h('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'Sem Acesso à Fila'), h('p', { className: 'text-sm text-gray-500' }, 'Você não está vinculado a nenhuma central.')));

    // 🆕 2026-05: Se a central é tipo 'auto', delega pro módulo separado
    // (filas-auto-motoboy.js). O fluxo de admin acima continua intacto.
    if (minhaCentral.tipo === 'auto') {
        if (typeof window.ModuloFilasAutoMotoboy !== 'undefined') {
            return React.createElement(window.ModuloFilasAutoMotoboy, {
                usuario: usuario,
                apiUrl: apiUrl,
                fetchAuth: fetchAuth,
                showToast: showToast,
                minhaCentral: minhaCentral,
                minhaLocalizacao: minhaLocalizacao,
                gpsStatus: gpsStatus,
                solicitarGPS: solicitarGPS,
                distanciaCentral: distanciaCentral,
            });
        } else {
            return h('div', { className: 'min-h-[400px] flex items-center justify-center p-4' },
                h('div', { className: CARD + ' text-center p-8 max-w-md' },
                    h('div', { className: 'mb-3' }, pill('ambar', 'Atenção')),
                    h('p', { className: 'text-gray-700' }, 'Módulo de fila auto não carregado.'),
                    h('p', { className: 'text-xs text-gray-500 mt-2' }, 'Recarregue a página (Ctrl+F5).')
                )
            );
        }
    }

    const podeChekin = gpsStatus === 'permitido' && (distanciaCentral === null || distanciaCentral <= minhaCentral.raio_metros);
    const penalizado = minhaPenalidade?.bloqueado && minhaPenalidade?.minutos_restantes > 0;

    // 🆕 2026-05-31: trava de horário de abertura (mesma regra do backend, fuso America/Bahia).
    // Recalculado a cada render (polling de 5s), independente do relógio do celular.
    const _calcAbertura = () => {
        if (!minhaCentral?.abertura_horario_ativa || !minhaCentral?.abertura_horario) return { travado: false, abertura: null, faltamMin: 0 };
        const abertura = String(minhaCentral.abertura_horario).slice(0, 5);
        const [hA, mA] = abertura.split(':').map(Number);
        const agoraBahia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bahia' }));
        const minutosAgora = agoraBahia.getHours() * 60 + agoraBahia.getMinutes();
        const minutosAbertura = hA * 60 + mA;
        return { travado: minutosAgora < minutosAbertura, abertura, faltamMin: Math.max(0, minutosAbertura - minutosAgora) };
    };
    const _ab = _calcAbertura();
    const travadoPorHorario = _ab.travado;
    // FILAS_CLEAN_V1 (motoboy): cartões brancos, status em pílula, botões grandes (48px) mobile-first
    const BTN_GRANDE = 'w-full h-12 rounded-[12px] text-base font-semibold inline-flex items-center justify-center gap-2 transition-colors';
    const numeroGrande = (v, sufixo) => h('div', { style: { fontFamily: SORA, fontSize: 56, fontWeight: 700, color: '#111827', lineHeight: 1, fontVariantNumeric: 'tabular-nums' } }, v, sufixo ? h('span', { style: { fontSize: 28 } }, sufixo) : null);

    return h('div', { className: 'max-w-md mx-auto space-y-3 -mx-1 sm:mx-auto' /* FILAS_CLEAN_V1 */ },
        // POPUP NOTIFICAÇÃO
        mostrarNotificacao && notificacao && h('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4', onClick: () => { marcarNotificacaoLida(); } },
            h('div', { className: 'bg-white rounded-[16px] border border-gray-200 p-6 max-w-sm w-full', onClick: (e) => e.stopPropagation(), style: { animation: 'notifPulse 0.5s ease-out' } },
                h('div', { className: 'text-center mb-4' },
                    h('div', { className: 'mb-3 inline-flex' }, notificacao.tipo === 'nota_liberada' ? pill('roxo', 'Nota') : notificacao.tipo === 'roteiro_despachado' ? pill('azul', 'Roteiro') : notificacao.tipo === 'corrida_unica' ? pill('azul', 'Corrida única') : pill('cinza', 'Aviso')),
                    h('h2', { className: 'text-xl font-semibold text-gray-900', style: { fontFamily: SORA } }, notificacao.tipo === 'nota_liberada' ? 'Nota Liberada!' : notificacao.tipo === 'roteiro_despachado' ? 'Roteiro Despachado!' : notificacao.tipo === 'corrida_unica' ? 'Corrida Única!' : 'Notificação')),
                h('div', { className: 'bg-gray-50 rounded-[12px] p-4 mb-4' }, h('p', { className: 'text-sm text-gray-700 leading-relaxed text-center' }, notificacao.mensagem)),
                h('button', { onClick: () => { marcarNotificacaoLida(); }, className: BTN_GRANDE + ' bg-purple-700 hover:bg-purple-800 text-white' }, ico('check', 18), 'Entendi')
            )
        ),
        // AVISO GARANTIDO (1º ingresso do dia após horário)
        garantidoAviso && h('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4', onClick: () => setGarantidoAviso(null) },
            h('div', { className: 'bg-white rounded-[16px] border border-gray-200 p-6 max-w-sm w-full', onClick: (e) => e.stopPropagation() },
                h('div', { className: 'text-center mb-4' },
                    h('div', { className: 'mb-3 inline-flex' }, pill('ambar', 'Garantia')),
                    h('h2', { className: 'text-lg font-semibold text-gray-900' }, 'Garantia ajustada')
                ),
                h('p', { className: 'text-sm text-gray-700 leading-relaxed text-center mb-4' },
                    `Prezado ${usuario?.nome || usuario?.full_name || ''}, você está ingressando pela primeira vez na fila após o horário combinado (${garantidoAviso.hora_desconto || garantidoAviso.hora_inicio}). Sua garantia será ajustada proporcionalmente ao seu horário de ingresso.`),
                h('div', { className: 'border border-gray-200 rounded-[12px] p-4 mb-4 text-center' },
                    h('p', { className: 'text-xs text-gray-500 mb-1' }, 'Sua garantia hoje'),
                    h('p', { style: { fontFamily: SORA, fontSize: 30, fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' } }, `R$ ${Number(garantidoAviso.valor_garantido).toFixed(2).replace('.', ',')}`)
                ),
                h('button', { onClick: () => setGarantidoAviso(null), className: BTN_GRANDE + ' bg-purple-700 hover:bg-purple-800 text-white' }, ico('check', 18), 'Entendi')
            )
        ),
        // MODAL CONFIRMAÇÃO SAÍDA (com penalidade)
        modalSaida && h('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
            h('div', { className: 'bg-white rounded-[16px] border border-gray-200 p-6 max-w-sm w-full' },
                h('div', { className: 'text-center mb-4' }, h('div', { className: 'mb-3 inline-flex' }, pill('vermelho', 'Atenção')), h('h2', { className: 'text-lg font-semibold text-gray-900' }, 'Atenção!')),
                h('div', { className: 'bg-red-50 rounded-[12px] p-4 mb-4' },
                    h('p', { className: 'text-sm text-red-800 leading-relaxed text-center font-medium' },
                        `Se você sair da fila agora, só poderá retornar dentro de ${minhaPenalidade?.proxima_penalidade_minutos >= 60 ? (minhaPenalidade.proxima_penalidade_minutos >= 1440 ? '24 horas' : Math.floor(minhaPenalidade.proxima_penalidade_minutos / 60) + ' horas') : (minhaPenalidade?.proxima_penalidade_minutos || 30) + ' minutos'}.`
                    ),
                    (minhaPenalidade?.saidas_hoje || 0) > 0 && h('p', { className: 'text-xs text-red-800 text-center mt-2' }, `Você já saiu ${minhaPenalidade.saidas_hoje}x hoje.`)
                ),
                h('div', { className: 'flex gap-3' },
                    h('button', { onClick: () => setModalSaida(false), className: BTN_GRANDE + ' flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' }, 'Ficar'),
                    h('button', { onClick: sairDaFila, className: BTN_GRANDE + ' flex-1 bg-white border border-red-200 text-red-800 hover:bg-red-50' }, 'Sair')
                )
            )
        ),
        // HEADER — central + GPS
        h('div', { className: CARD + ' p-4' },
            h('div', { className: 'flex items-start gap-3' },
                h('div', { className: 'flex-1 min-w-0' },
                    h('h1', { className: 'text-lg font-semibold text-gray-900 truncate', style: { fontFamily: SORA } }, minhaCentral.central_nome),
                    h('p', { className: 'text-xs text-gray-500 truncate' }, minhaCentral.endereco)
                )
            ),
            h('div', { className: 'flex items-center gap-2 mt-3 pt-3 border-t border-gray-100' },
                gpsStatus === 'permitido' ? pill('verde', 'GPS ativo') : gpsStatus === 'negado' ? pill('vermelho', 'GPS bloqueado') : pill('ambar', 'Verificando GPS...'),
                h('p', { className: 'flex-1 min-w-0 text-xs tabular-nums truncate ' + (distanciaCentral !== null && distanciaCentral > minhaCentral.raio_metros ? 'text-red-800' : 'text-gray-500') }, distanciaCentral !== null && gpsStatus === 'permitido' ? `Você está a ${distanciaCentral}m (máx ${minhaCentral.raio_metros}m)` : ''),
                gpsStatus === 'negado' && h('button', { onClick: solicitarGPS, className: BTN_SEC_SM }, 'Tentar')
            )
        ),
        // 🆕 2026-05-31: TRAVA DE HORÁRIO DE ABERTURA (prioridade máxima sobre o resto)
        travadoPorHorario && h('div', { className: CARD + ' p-6 text-center' },
            h('div', { className: 'mb-3 inline-flex' }, pill('ambar', 'Fila fechada')),
            h('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'Fila ainda não liberada'),
            h('p', { className: 'text-sm text-gray-500 mb-4 leading-relaxed' }, `A fila será liberada para todos os motoboys a partir das ${_ab.abertura}.`),
            h('p', { className: 'text-xs text-gray-500' }, 'Abre em'),
            h('p', { style: { fontFamily: SORA, fontSize: 36, fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 } }, _ab.faltamMin >= 60 ? `${Math.floor(_ab.faltamMin / 60)}h ${String(_ab.faltamMin % 60).padStart(2, '0')}min` : `${_ab.faltamMin} min`),
            h('p', { className: 'text-xs text-gray-500 mt-3 inline-flex items-center gap-1.5' }, ico('lock', 14), 'O botão de entrar é liberado automaticamente no horário.')
        ),
        // PENALIDADE ATIVA
        !travadoPorHorario && penalizado && h('div', { className: CARD + ' p-6 text-center' },
            h('div', { className: 'mb-3 inline-flex' }, pill('vermelho', 'Bloqueado')),
            h('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'Bloqueado'),
            h('p', { className: 'text-sm text-gray-600 mb-2' }, `Você saiu voluntariamente da fila e está bloqueado por mais ${minhaPenalidade.minutos_restantes} minuto(s).`),
            h('p', { className: 'text-xs text-gray-500 tabular-nums' }, `Saídas hoje: ${minhaPenalidade.saidas_hoje}`)
        ),
        // GPS NEGADO
        !travadoPorHorario && !penalizado && gpsStatus === 'negado' ? h('div', { className: CARD + ' p-6 text-center' }, h('div', { className: 'mb-3 inline-flex' }, pill('vermelho', 'Localização')), h('h2', { className: 'text-lg font-semibold text-gray-900 mb-1' }, 'GPS Necessário'), h('p', { className: 'text-sm text-gray-500 mb-4' }, 'Permita acesso à localização.'), h('button', { onClick: solicitarGPS, className: BTN_GRANDE + ' bg-purple-700 hover:bg-purple-800 text-white' }, ico('pin', 18), 'Permitir')) :
        !travadoPorHorario && !penalizado && h(React.Fragment, null,
            // EM ROTA
            minhaPosicao?.status === 'em_rota' && h('div', { className: CARD + ' p-5' },
                h('div', { className: 'flex items-center justify-between gap-3 mb-3' },
                    h('h2', { className: 'text-lg font-semibold text-gray-900' }, minhaPosicao.corrida_unica ? 'Corrida Única!' : 'Você está em Rota!'),
                    minhaPosicao.corrida_unica ? pill('azul', 'Corrida única') : pill('azul', 'Em rota')
                ),
                h('p', { className: 'text-sm text-gray-500 tabular-nums mb-4' }, `${formatarTempo(minhaPosicao.minutos_em_rota)} em serviço`),
                // Cooldown ativo: mensagem + sem botão
                minhaPosicao.cooldown_restante > 0 ? h('div', { className: 'bg-amber-50 rounded-[12px] p-4' },
                    h('p', { className: 'text-sm text-amber-800 font-medium text-center leading-relaxed' },
                        `Você foi despachado com ${minhaPosicao.notas_liberadas || 0} entrega(s). Finalize-as e retorne para a fila.`
                    )
                ) :
                // Cooldown expirado: mostrar mensagem + botão retorno
                h(React.Fragment, null,
                    h('div', { className: 'bg-gray-50 rounded-[12px] p-4 mb-4' },
                        h('p', { className: 'text-sm leading-relaxed text-gray-700' },
                            minhaPosicao.corrida_unica
                                ? 'Seu roteiro já foi definido, e você saiu com apenas uma corrida! Retire a mercadoria na expedição e boas entregas!'
                                : minhaPosicao.notas_liberadas > 0
                                ? `Todas as ${minhaPosicao.notas_liberadas} nota(s) foram liberadas. Siga para o roteiro!`
                                : 'Seu roteiro já foi definido. Retire a mercadoria na expedição e boas entregas!'
                        ),
                        minhaPosicao.corrida_unica && minhaPosicao.posicao_original && h('p', { className: 'text-sm text-gray-900 mt-2 font-semibold' }, `Ao retornar, você volta para a posição ${minhaPosicao.posicao_original}`)
                    ),
                    h('button', { onClick: entrarNaFila, disabled: !podeChekin, className: BTN_GRANDE + ' ' + (!podeChekin ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-700 text-white hover:bg-purple-800') }, minhaPosicao.corrida_unica ? h('span', { className: 'inline-flex items-center gap-2' }, ico('crown', 18), 'Retornar com Prioridade') : h('span', { className: 'inline-flex items-center gap-2' }, ico('refresh', 18), 'Retornar para a Fila'))
                )
            ),
            // AGUARDANDO
            minhaPosicao?.status === 'aguardando' && h('div', { className: CARD + ' p-5' },
                h('div', { className: 'flex items-center justify-between mb-2' }, h('p', { className: 'text-sm text-gray-500' }, 'Sua posição na fila'), pill('ambar', 'Aguardando')),
                h('div', { className: 'text-center py-3' },
                    numeroGrande(minhaPosicao.minha_posicao, 'º'),
                    h('p', { className: 'text-sm text-gray-500 mt-2 tabular-nums' }, `${formatarTempo(minhaPosicao.minutos_esperando)} na fila`)
                ),
                minhaPosicao.notas_liberadas > 0 && h('div', { className: 'bg-purple-50 border border-purple-200 rounded-[12px] p-4 my-3' },
                    h('div', { className: 'flex items-center justify-between gap-2 mb-1' },
                        h('p', { className: 'font-semibold text-purple-800' }, `${minhaPosicao.notas_liberadas}ª da fila`),
                        pill('roxo', `${minhaPosicao.notas_liberadas} nota(s) já liberada(s)`)
                    ),
                    h('p', { className: 'text-sm text-purple-800' }, `A ${minhaPosicao.notas_liberadas}ª nota já foi liberada! Verifique o APP Tutts e realize a coleta.`)
                ),
                h('p', { className: 'text-center text-sm font-semibold text-gray-900 mb-4' }, 'Você está na posição ', minhaPosicao.minha_posicao, 'º'),
                h('button', { onClick: () => { carregarMinhaPenalidade(); setModalSaida(true); }, className: BTN_GRANDE + ' bg-white border border-red-200 text-red-800 hover:bg-red-50' }, ico('logout', 18), 'Sair da Fila')
            ),
            // FORA DA FILA
            !minhaPosicao?.na_fila && h('div', { className: CARD + ' p-5' },
                h('div', { className: 'text-center mb-5' }, h('div', { className: 'mb-3 inline-flex' }, pill('cinza', 'Fora da fila')), h('h2', { className: 'text-xl font-semibold text-gray-900', style: { fontFamily: SORA } }, 'Pronto para coletar pedidos?'), h('p', { className: 'text-sm text-gray-500 mt-1' }, 'Entre na fila e aguarde a disponibilidade de corridas!')),
                h('button', { onClick: entrarNaFila, disabled: !podeChekin, className: BTN_GRANDE + ' ' + (!podeChekin ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-700 text-white hover:bg-purple-800') }, gpsStatus !== 'permitido' ? h('span', { className: 'inline-flex items-center gap-2' }, ico('pin', 18), 'Aguardando GPS...') : distanciaCentral > minhaCentral.raio_metros ? `Muito longe (${distanciaCentral}m)` : h('span', { className: 'inline-flex items-center gap-2' }, ico('rocket', 18), 'Entrar na Fila')),
                distanciaCentral !== null && distanciaCentral > minhaCentral.raio_metros && h('p', { className: 'text-center text-red-800 text-sm mt-2' }, `Aproxime-se (você está a ${distanciaCentral}m, máx ${minhaCentral.raio_metros}m)`)
            )
        )
    );
}

window.ModuloFilas = ModuloFilas;
