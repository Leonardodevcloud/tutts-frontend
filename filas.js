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
    const [minhaPenalidade, setMinhaPenalidade] = React.useState(null);
    const [modalSaida, setModalSaida] = React.useState(false);
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
        if (tipo === 'nota_liberada') { tocarBeep(3); vibrar([200,100,200,100,300]); notificarBrowser('📦 Nota Liberada!', notif.mensagem); }
        else if (tipo === 'roteiro_despachado') { tocarBeep(5); vibrar([300,150,300,150,500]); notificarBrowser('🚀 Roteiro Despachado!', notif.mensagem); }
        else if (tipo === 'corrida_unica') { tocarBeep(4); vibrar([200,100,400]); notificarBrowser('👑 Corrida Única!', notif.mensagem); }
        else { tocarBeep(2); vibrar([200,100,200]); notificarBrowser('🔔 Fila', notif?.mensagem || 'Nova notificação'); }
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
            showToast('✅ Bairros atualizados (' + bairros.length + ')', 'success');
            setModalBairros(null);
        } catch (e) { showToast('Erro', 'error'); }
    };
    const adicionarBairroModal = (bairro) => { if(!modalBairros)return; const nome = bairro.toUpperCase(); if((modalBairros.bairros||[]).includes(nome)) return; setModalBairros({...modalBairros, bairros:[...(modalBairros.bairros||[]), nome]}); };
    const removerBairroByIndex = (idx) => { if(!modalBairros)return; var novo=(modalBairros.bairros||[]).filter(function(_,i){return i!==idx;}); setModalBairros({...modalBairros, bairros:novo}); };
    const liberarNotaComBairros = async () => { if(!modalBairros||!centralSelecionada)return; var cod=modalBairros.cod_profissional; var bairros=modalBairros.bairros||[]; await salvarBairrosProfissional(cod, bairros); try{ var r=await fetchAuth(apiUrl+'/filas/liberar-nota',{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); var d=await r.json(); if(d.success){ showToast('📦 '+d.notas_liberadas+'ª nota liberada com '+bairros.length+' bairro(s)!','success'); carregarFila(centralSelecionada.id); setModalBairros(null); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };

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
                showToast(`✅ ${d.nome} entrou na fila (posição ${d.posicao})`, 'success');
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
    const carregarMinhaPenalidade = async () => { try{ const r=await fetchAuth(`${apiUrl}/filas/minha-penalidade`); const d=await r.json(); if(d.success) setMinhaPenalidade(d); }catch(e){} };

    // BUSCA ENDEREÇO GOOGLE
    const buscarEndereco = async (endereco) => {
        if (!endereco || endereco.length < 5) { setEnderecoValidado(false); setCoordenadasEncontradas(null); return; }
        setBuscandoEndereco(true);
        try { const response = await fetchAuth(`${apiUrl}/geocode/google?endereco=${encodeURIComponent(endereco)}`); const data = await response.json(); const resultado = data.results && data.results[0]; if (resultado && resultado.latitude && resultado.longitude) { setCoordenadasEncontradas({ latitude: resultado.latitude, longitude: resultado.longitude, enderecoFormatado: resultado.endereco || endereco }); setEnderecoValidado(true); showToast('📍 Endereço encontrado!', 'success'); } else { setEnderecoValidado(false); setCoordenadasEncontradas(null); showToast('Endereço não encontrado', 'error'); } } catch (e) { setEnderecoValidado(false); setCoordenadasEncontradas(null); showToast('Erro ao buscar', 'error'); }
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
    const carregarCentrais = async () => { try { const r=await fetchAuth(`${apiUrl}/filas/centrais`); const d=await r.json(); if(d.success){ setCentrais(d.centrais); } } catch(e){} finally{ setLoading(false); } };
    const carregarFila = async (id) => { if(!id)return; try{ const r=await fetchAuth(`${apiUrl}/filas/centrais/${id}/fila`); const d=await r.json(); if(d.success) setFilaAtual(d); }catch(e){} };
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
    const enviarParaRota = async (cod) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/enviar-rota`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); const d=await r.json(); if(d.success){ showToast(`🚀 Despachado! (${d.tempo_espera} min espera, ${d.notas_liberadas||0} notas)`,'success'); carregarFila(centralSelecionada.id); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const liberarNota = async (cod) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/liberar-nota`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); const d=await r.json(); if(d.success){ showToast(`📦 ${d.notas_liberadas}ª nota liberada para ${d.profissional}!`,'success'); carregarFila(centralSelecionada.id); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const enviarParaRotaUnica = async (cod) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/enviar-rota-unica`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); const d=await r.json(); if(d.success){ showToast(`👑 Corrida única! (${d.tempo_espera} min) Retorna na posição ${d.posicao_retorno}`,'success'); carregarFila(centralSelecionada.id); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const moverParaUltimo = async (cod) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/mover-ultimo`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); const d=await r.json(); if(d.success){ showToast(d.message || `Movido: ${d.posicao_anterior}º → ${d.posicao_nova}º`,'success'); carregarFila(centralSelecionada.id); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const removerDaFila = async (cod) => { const obs=window.prompt('Motivo (opcional):'); if(obs===null)return; try{ const r=await fetchAuth(`${apiUrl}/filas/remover`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id,observacao:obs})}); const d=await r.json(); if(d.success){ showToast('Removido!','success'); carregarFila(centralSelecionada.id); } }catch(e){ showToast('Erro','error'); } };

    // DRAG-DROP REORDENAR
    const reordenarFila = async (cod, novaPosicao) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/reordenar`,{method:'POST',body:JSON.stringify({central_id:centralSelecionada.id,cod_profissional:cod,nova_posicao:novaPosicao})}); const d=await r.json(); if(d.success){ showToast(`Movido: ${d.posicao_anterior}º → ${d.posicao_nova}º`,'success'); carregarFila(centralSelecionada.id); } }catch(e){ showToast('Erro','error'); } };

    // AÇÕES USER
    const entrarNaFila = async () => { desbloquearAudio(); if(!minhaLocalizacao){ showToast('Aguarde GPS','error'); solicitarGPS(); return; } try{ const r=await fetchAuth(`${apiUrl}/filas/entrar`,{method:'POST',body:JSON.stringify({latitude:minhaLocalizacao.latitude,longitude:minhaLocalizacao.longitude})}); const d=await r.json(); if(d.success){ showToast(d.prioridade ? `👑 Retornou com prioridade! Posição: ${d.posicao}` : `Entrou! Posição: ${d.posicao}`,'success'); carregarMinhaPosicao(); }else{ showToast(d.mensagem||d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const sairDaFila = async () => { try{ const r=await fetchAuth(`${apiUrl}/filas/sair`,{method:'POST'}); const d=await r.json(); if(d.success){ setModalSaida(false); const pen=d.penalidade; if(pen) showToast(`Saiu da fila. Bloqueado por ${pen.minutos_bloqueio} min.`,'warning'); else showToast('Saiu!','success'); carregarMinhaPosicao(); carregarMinhaPenalidade(); } }catch(e){ showToast('Erro','error'); } };
    const buscarNotificacao = async () => { try{ const r=await fetchAuth(`${apiUrl}/filas/minha-notificacao`); const d=await r.json(); if(d.success && d.tem_notificacao){ const notif=d.notificacao; const notifKey=notif.created_at||notif.id; if(notifKey!==ultimaNotifRef.current){ ultimaNotifRef.current=notifKey; setNotificacao(notif); setMostrarNotificacao(true); dispararAlerta(notif); } }else{ ultimaNotifRef.current=null; } }catch(e){} };
    const marcarNotificacaoLida = async () => { desbloquearAudio(); try{ await fetchAuth(`${apiUrl}/filas/notificacao-lida`,{method:'POST'}); setMostrarNotificacao(false); setNotificacao(null); }catch(e){} };

    // EFFECTS
    React.useEffect(() => { if(isAdmin){ carregarCentrais(); carregarProfissionais(); }else{ carregarMinhaCentral(); carregarMinhaPenalidade(); solicitarGPS(); try{ if('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }catch(e){} } }, []);
    React.useEffect(() => { if(!isAdmin||!centralSelecionada)return; carregarFila(centralSelecionada.id); carregarVinculos(centralSelecionada.id); carregarBairrosConfig(centralSelecionada.id); carregarRegioes(centralSelecionada.id); carregarPenalidades(centralSelecionada.id); const i=setInterval(()=>{carregarFila(centralSelecionada.id);carregarPenalidades(centralSelecionada.id);},5000); return()=>clearInterval(i); }, [centralSelecionada]);
    React.useEffect(() => { if(!isAdmin||centralSelecionada)return; const i=setInterval(()=>carregarCentrais(),8000); return()=>clearInterval(i); }, [centralSelecionada]);
    React.useEffect(() => { if(isAdmin||!minhaCentral)return; carregarMinhaPosicao(); buscarNotificacao(); const i=setInterval(()=>{carregarMinhaPosicao();solicitarGPS();buscarNotificacao();carregarMinhaPenalidade();},5000); return()=>clearInterval(i); }, [minhaCentral]);
    React.useEffect(() => { if(abaAtiva==='relatorios'&&centralSelecionada){ carregarEstatisticas(centralSelecionada.id); carregarHistorico(centralSelecionada.id); } }, [abaAtiva,centralSelecionada,filtroData]);
    React.useEffect(() => { if(minhaLocalizacao&&minhaCentral?.latitude&&minhaCentral?.longitude){ setDistanciaCentral(Math.round(calcularDistanciaHaversine(minhaLocalizacao.latitude,minhaLocalizacao.longitude,parseFloat(minhaCentral.latitude),parseFloat(minhaCentral.longitude)))); } }, [minhaLocalizacao,minhaCentral]);
    React.useEffect(() => { if(modalCentral){ if(modalCentral.id){ setEnderecoValidado(true); setCoordenadasEncontradas({latitude:modalCentral.latitude,longitude:modalCentral.longitude,enderecoFormatado:modalCentral.endereco}); }else{ setEnderecoValidado(false); setCoordenadasEncontradas(null); } } }, [modalCentral]);

    const formatarTempo = (m) => { if(!m||m<0)return'0 min'; if(m<60)return`${Math.round(m)} min`; return`${Math.floor(m/60)}h ${Math.round(m%60)}min`; };
    const formatarHora = (d) => d?new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'-';
    const formatarCronometro = (dataISO) => { if(!dataISO)return''; const s=Math.floor((Date.now()-new Date(dataISO).getTime())/1000); const m=Math.floor(s/60); const sec=s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; };

    // ==================== RENDERIZAÇÃO ADMIN ====================
    if (isAdmin) {
        // Card de profissional na fila de espera (com drag-drop)
        const renderCardAguardando = (p, i) => {
            return React.createElement('div', {
                key: p.cod_profissional,
                draggable: true,
                onDragStart: (e) => { e.dataTransfer.setData('text/plain', p.cod_profissional); e.dataTransfer.effectAllowed = 'move'; setDragData(p.cod_profissional); },
                onDragEnd: () => setDragData(null),
                onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
                onDrop: (e) => { e.preventDefault(); const cod = e.dataTransfer.getData('text/plain'); if(cod && cod !== p.cod_profissional) reordenarFila(cod, p.posicao); setDragData(null); },
                className: `bg-white rounded-lg p-3 border flex items-center justify-between cursor-grab active:cursor-grabbing transition-all ${dragData === p.cod_profissional ? 'opacity-50 scale-95' : ''} ${p.motivo_posicao === 'retorno_prioritario' ? 'border-yellow-400 bg-yellow-50' : p.motivo_posicao === 'movido_ultimo' ? 'border-red-400 bg-red-50' : ''}`
            },
                React.createElement('div', { className: 'flex items-center gap-3 flex-1 min-w-0' },
                    React.createElement('span', { className: 'text-gray-400 cursor-grab', style: { fontSize: '18px' } }, '⠿'),
                    React.createElement('span', { className: `w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i === 0 ? 'bg-green-100 text-green-700' : p.motivo_posicao === 'movido_ultimo' ? 'bg-red-100 text-red-700' : p.motivo_posicao === 'retorno_prioritario' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}` }, p.posicao),
                    React.createElement('div', { className: 'min-w-0' },
                        React.createElement('p', { className: 'font-medium truncate' }, p.nome_profissional),
                        React.createElement('p', { className: 'text-xs text-gray-500' }, `#${p.cod_profissional} • ⏱️ ${formatarTempo(p.minutos_esperando)}`),
                        p.motivo_posicao === 'retorno_prioritario' && React.createElement('p', { className: 'text-xs text-yellow-700 font-medium' }, '👑 Retorno prioritário'),
                        p.motivo_posicao === 'movido_ultimo' && React.createElement('p', { className: 'text-xs text-red-700 font-medium' }, '⬇️ Movido para o final')
                    )
                ),
                React.createElement('div', { className: 'flex flex-col items-end gap-1 flex-shrink-0' },
                    p.notas_liberadas > 0 && React.createElement('div', { className: 'flex items-center gap-1' },
                        React.createElement('span', { className: 'text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full' }, `📦 ${p.notas_liberadas} nota(s)`),
                        p.primeira_nota_at && React.createElement('span', { className: 'text-xs font-mono text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full' }, `⏱${formatarCronometro(p.primeira_nota_at)}`)
                    ),
                    p.bairros && p.bairros.length > 0 && React.createElement('div', { className: 'flex flex-wrap gap-1 justify-end items-center', style: { maxWidth: '200px' } },
                        // 🚀 2026-05: cada chip agora é clicável — clica nele e remove SÓ aquele bairro
                        p.bairros.map((b, bi) => React.createElement('button', {
                            key: bi,
                            onClick: () => removerUmBairroProfissional(p.cod_profissional, p.bairros, bi),
                            style: { fontSize: '10px' },
                            className: 'inline-flex items-center gap-0.5 font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors',
                            title: 'Clique pra remover este bairro'
                        }, `📍${b}`, React.createElement('span', { className: 'opacity-60', style: { fontSize: '9px' } }, '✕'))),
                        // Botão editar (abre modal com lista atual + adicionar mais)
                        React.createElement('button', {
                            onClick: () => abrirEdicaoBairros(p),
                            style: { fontSize: '10px' },
                            className: 'text-blue-600 hover:text-blue-800 font-bold px-1',
                            title: 'Editar lista de bairros'
                        }, '✏️'),
                        // Botão limpar todos (mantém o ✕ que tava antes mas com aviso visual)
                        React.createElement('button', {
                            onClick: () => { if (window.confirm('Limpar TODOS os bairros deste motoboy?')) limparBairrosProfissional(p.cod_profissional); },
                            style: { fontSize: '10px' },
                            className: 'text-red-500 hover:text-red-700 font-bold px-1',
                            title: 'Limpar todos os bairros'
                        }, '🗑️')
                    ),
                    React.createElement('div', { className: 'flex gap-1' },
                        React.createElement('button', { onClick: () => { setModalBairros({ cod_profissional: p.cod_profissional, nome: p.nome_profissional, bairros: p.bairros || [], notaNum: (parseInt(p.notas_liberadas)||0)+1 }); }, className: 'px-2 py-1 bg-purple-600 text-white rounded-lg text-xs', title: `Liberar ${(parseInt(p.notas_liberadas)||0)+1}ª Nota + Bairros` }, `📦 ${(parseInt(p.notas_liberadas)||0)+1}ª`),
                        React.createElement('button', { onClick: () => enviarParaRota(p.cod_profissional), className: 'px-2 py-1 bg-green-600 text-white rounded-lg text-xs', title: 'Despachar Roteiro' }, '🚀'),
                        React.createElement('button', { onClick: () => enviarParaRotaUnica(p.cod_profissional), className: 'px-2 py-1 bg-yellow-500 text-white rounded-lg text-xs', title: 'Corrida Única' }, '👑'),
                        React.createElement('button', { onClick: () => moverParaUltimo(p.cod_profissional), className: 'px-2 py-1 bg-orange-500 text-white rounded-lg text-xs', title: 'Mover para Último' }, '⬇️'),
                        React.createElement('button', { onClick: () => removerDaFila(p.cod_profissional), className: 'px-2 py-1 bg-red-100 text-red-600 rounded-lg text-xs', title: 'Remover' }, '❌')
                    )
                )
            );
        };

        // HOME - Grid de centrais (quando nenhuma selecionada)
        if (!centralSelecionada) {
            return React.createElement('div', { className: 'space-y-6' },
                React.createElement('div', { className: 'bg-white rounded-xl shadow p-4' },
                    React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-4' },
                        React.createElement('div', { className: 'flex items-center gap-3' }, React.createElement('span', { className: 'text-2xl' }, '📋'), React.createElement('div', null, React.createElement('h1', { className: 'text-xl font-bold text-gray-800' }, 'Filas de Entrega'), React.createElement('p', { className: 'text-sm text-gray-500' }, 'Selecione uma fila para gerenciar'))),
                        React.createElement('button', { onClick: () => setModalCentral({}), className: 'px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700' }, '➕ Nova Fila')
                    )
                ),
                centrais.length === 0 ? React.createElement('div', { className: 'text-center py-16 text-gray-500' }, React.createElement('span', { className: 'text-6xl block mb-4' }, '📭'), React.createElement('p', { className: 'text-lg' }, 'Nenhuma fila cadastrada ainda')) :
                React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' },
                    centrais.map(c => React.createElement('div', {
                        key: c.id,
                        onClick: () => setCentralSelecionada(c),
                        className: `bg-white rounded-2xl shadow-lg border-2 hover:shadow-xl transition-all cursor-pointer overflow-hidden ${c.ativa ? 'border-purple-200 hover:border-purple-400' : 'border-gray-200 opacity-60'}`
                    },
                        React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white' },
                            React.createElement('h3', { className: 'text-lg font-bold' }, c.nome),
                            React.createElement('p', { className: 'text-purple-200 text-xs truncate' }, c.endereco || 'Sem endereço')
                        ),
                        React.createElement('div', { className: 'p-4' },
                            React.createElement('div', { className: 'flex gap-3 mb-3' },
                                React.createElement('div', { className: 'flex-1 bg-blue-50 rounded-xl p-3 text-center' },
                                    React.createElement('p', { className: 'text-2xl font-bold text-blue-700' }, c.na_fila || 0),
                                    React.createElement('p', { className: 'text-xs text-blue-600 font-medium' }, 'Na Fila')
                                ),
                                React.createElement('div', { className: 'flex-1 bg-green-50 rounded-xl p-3 text-center' },
                                    React.createElement('p', { className: 'text-2xl font-bold text-green-700' }, c.em_rota || 0),
                                    React.createElement('p', { className: 'text-xs text-green-600 font-medium' }, 'Em Rota')
                                )
                            ),
                            React.createElement('div', { className: 'flex items-center justify-between' },
                                React.createElement('span', { className: 'text-xs text-gray-500' }, `👥 ${c.total_vinculados || 0} vinculados`),
                                React.createElement('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${c.ativa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}` }, c.ativa ? '🟢 Ativa' : '🔴 Inativa')
                            )
                        )
                    ))
                ),
                // Modal criar central (precisa estar aqui também)
                modalCentral && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
                    React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto' },
                        React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-2xl text-white' }, React.createElement('h2', { className: 'text-xl font-bold' }, '➕ Nova Fila')),
                        React.createElement('form', { className: 'p-6 space-y-4', onSubmit: (e) => { e.preventDefault(); if (!enderecoValidado) { showToast('Busque o endereço primeiro', 'error'); return; } const fd = new FormData(e.target); salvarCentral({ nome: fd.get('nome'), endereco: coordenadasEncontradas?.enderecoFormatado || fd.get('endereco'), latitude: coordenadasEncontradas?.latitude, longitude: coordenadasEncontradas?.longitude, raio_metros: parseInt(fd.get('raio_metros')) }); } },
                            React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Nome *'), React.createElement('input', { name: 'nome', required: true, className: 'w-full px-3 py-2 border rounded-lg' })),
                            React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '📍 Endereço *'), React.createElement('div', { className: 'relative' }, React.createElement('input', { name: 'endereco', required: true, className: `w-full px-3 py-2 border rounded-lg pr-10 ${enderecoValidado ? 'border-green-500 bg-green-50' : ''}`, onChange: (e) => buscarEnderecoDebounced(e.target.value) }), React.createElement('span', { className: 'absolute right-3 top-2.5 text-xl' }, buscandoEndereco ? '⏳' : enderecoValidado ? '✅' : '🔍'))),
                            coordenadasEncontradas && React.createElement('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-3' }, React.createElement('p', { className: 'text-sm text-green-800' }, `✅ ${coordenadasEncontradas.latitude?.toFixed?.(6)}, ${coordenadasEncontradas.longitude?.toFixed?.(6)}`)),
                            React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Raio (metros)'), React.createElement('input', { name: 'raio_metros', type: 'number', defaultValue: 900, required: true, className: 'w-full px-3 py-2 border rounded-lg' })),
                            React.createElement('div', { className: 'flex gap-3 pt-4' }, React.createElement('button', { type: 'button', onClick: () => { setModalCentral(null); setEnderecoValidado(false); setCoordenadasEncontradas(null); }, className: 'flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium' }, 'Cancelar'), React.createElement('button', { type: 'submit', disabled: !enderecoValidado, className: `flex-1 px-4 py-2 rounded-lg font-medium ${!enderecoValidado ? 'bg-gray-300 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'}` }, '💾 Salvar'))
                        )
                    )
                )
            );
        }

        // DETALHE DA CENTRAL SELECIONADA
        return React.createElement('div', { className: 'space-y-6' },
            React.createElement('div', { className: 'bg-white rounded-xl shadow p-4' },
                React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-4' },
                    React.createElement('div', { className: 'flex items-center gap-3' },
                        React.createElement('button', { onClick: () => { setCentralSelecionada(null); carregarCentrais(); }, className: 'w-10 h-10 flex items-center justify-center bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors font-bold text-lg' }, '←'),
                        React.createElement('div', null, React.createElement('h1', { className: 'text-xl font-bold text-gray-800' }, centralSelecionada.nome), React.createElement('p', { className: 'text-sm text-gray-500' }, centralSelecionada.endereco))
                    ),
                    React.createElement('button', { onClick: () => setModalCentral({}), className: 'px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700' }, '➕ Nova Fila')
                )
            ),
            React.createElement('div', { className: 'bg-white rounded-xl shadow' },
                React.createElement('div', { className: 'border-b flex gap-1 p-2 flex-wrap' },
                    ['monitoramento', 'vinculos', 'penalidades', 'relatorios', 'config'].map(aba => React.createElement('button', { key: aba, onClick: () => onChangeTab(aba), className: `px-4 py-2 rounded-lg font-medium transition-all ${abaAtiva === aba ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:bg-gray-100'}` },
                        aba === 'monitoramento' ? '📊 Monitor' : aba === 'vinculos' ? '👥 Vínculos' : aba === 'penalidades' ? '🚫 Penalidades' : aba === 'relatorios' ? '📈 Relatórios' : '⚙️ Config'))
                ),
                React.createElement('div', { className: 'p-6' },
                    // MONITORAMENTO
                    abaAtiva === 'monitoramento' && centralSelecionada && React.createElement('div', { className: 'space-y-6' },
                        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
                            React.createElement('div', { className: 'bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white' }, React.createElement('div', { className: 'text-3xl mb-1' }, '⏳'), React.createElement('div', { className: 'text-2xl font-bold' }, filaAtual.total_aguardando || 0), React.createElement('div', { className: 'text-sm opacity-80' }, 'Aguardando')),
                            React.createElement('div', { className: 'bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white' }, React.createElement('div', { className: 'text-3xl mb-1' }, '🏍️'), React.createElement('div', { className: 'text-2xl font-bold' }, filaAtual.total_em_rota || 0), React.createElement('div', { className: 'text-sm opacity-80' }, 'Em Rota')),
                            React.createElement('div', { className: `bg-gradient-to-br ${filaAtual.alertas?.length > 0 ? 'from-red-500 to-red-600 animate-pulse' : 'from-gray-400 to-gray-500'} rounded-xl p-4 text-white` }, React.createElement('div', { className: 'text-3xl mb-1' }, '🚨'), React.createElement('div', { className: 'text-2xl font-bold' }, filaAtual.alertas?.length || 0), React.createElement('div', { className: 'text-sm opacity-80' }, 'Alertas (+90min)')),
                            React.createElement('div', { className: 'bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white' }, React.createElement('div', { className: 'text-3xl mb-1' }, '📍'), React.createElement('div', { className: 'text-2xl font-bold' }, centralSelecionada.total_vinculados || 0), React.createElement('div', { className: 'text-sm opacity-80' }, 'Vinculados'))
                        ),
                        filaAtual.alertas?.length > 0 && React.createElement('div', { className: 'bg-red-50 border-2 border-red-400 rounded-xl p-4 animate-pulse' },
                            React.createElement('div', { className: 'flex items-center gap-3 mb-3' }, React.createElement('span', { className: 'text-3xl' }, '🚨'), React.createElement('div', null, React.createElement('p', { className: 'text-red-800 font-bold text-lg' }, `ATENÇÃO: ${filaAtual.alertas.length} profissional(is) não retornou!`), React.createElement('p', { className: 'text-red-600 text-sm' }, 'Tempo em rota > 1h30min'))),
                            React.createElement('div', { className: 'grid md:grid-cols-2 gap-2' }, filaAtual.alertas.map(p => React.createElement('div', { key: p.cod_profissional, className: 'bg-white border border-red-300 rounded-lg p-3 flex justify-between items-center' }, React.createElement('div', null, React.createElement('p', { className: 'font-bold' }, p.nome_profissional), React.createElement('p', { className: 'text-sm text-red-600' }, `⏱️ ${formatarTempo(p.minutos_em_rota)} em rota`)), React.createElement('button', { onClick: () => removerDaFila(p.cod_profissional), className: 'px-3 py-1 bg-red-600 text-white rounded-lg text-sm' }, '❌'))))
                        ),
                        React.createElement('div', { className: 'grid md:grid-cols-2 gap-6' },
                            React.createElement('div', { className: 'bg-blue-50 rounded-xl p-4 border border-blue-200' },
                                React.createElement('div', { className: 'flex items-center justify-between mb-4' },
                                    React.createElement('h3', { className: 'font-bold text-blue-800' }, '⏳ Fila de Espera (arraste para reordenar)'),
                                    React.createElement('button', {
                                        onClick: abrirModalColocarFila,
                                        className: 'px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1',
                                        title: 'Colocar um motoboy vinculado direto na fila'
                                    }, '➕ Colocar na fila')
                                ),
                                filaAtual.aguardando?.length === 0 ? React.createElement('div', { className: 'text-center py-8 text-gray-500' }, '📭 Nenhum na fila') :
                                React.createElement('div', { className: 'space-y-2' }, filaAtual.aguardando.map((p, i) => renderCardAguardando(p, i)))
                            ),
                            React.createElement('div', { className: 'bg-green-50 rounded-xl p-4 border border-green-200' },
                                React.createElement('h3', { className: 'font-bold text-green-800 mb-4' }, '🏍️ Em Rota'),
                                filaAtual.em_rota?.length === 0 ? React.createElement('div', { className: 'text-center py-8 text-gray-500' }, '🏠 Nenhum em rota') :
                                React.createElement('div', { className: 'space-y-2' }, filaAtual.em_rota.map(p => React.createElement('div', { key: p.cod_profissional, className: `bg-white rounded-lg p-3 border ${p.minutos_em_rota > 90 ? 'border-red-300 bg-red-50' : p.corrida_unica ? 'border-yellow-300 bg-yellow-50' : ''} flex flex-col gap-2` },
                                    React.createElement('div', { className: 'flex items-center justify-between' },
                                        React.createElement('div', { className: 'flex items-center gap-3' }, React.createElement('span', { className: 'text-2xl' }, p.corrida_unica ? '👑' : '🏍️'), React.createElement('div', null, React.createElement('p', { className: 'font-medium' }, p.nome_profissional), React.createElement('p', { className: `text-xs ${p.minutos_em_rota > 90 ? 'text-red-600 font-bold' : 'text-gray-500'}` }, `⏱️ ${formatarTempo(p.minutos_em_rota)} em rota`, p.corrida_unica && ' • Corrida Única'))),
                                        React.createElement('button', { onClick: () => removerDaFila(p.cod_profissional), className: 'px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm' }, '❌')
                                    ),
                                    p.bairros && p.bairros.length > 0 && React.createElement('div', { className: 'flex flex-wrap gap-1 ml-11' },
                                        p.bairros.map((b, bi) => React.createElement('span', { key: bi, style: { fontSize: '10px' }, className: 'font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full' }, `📍${b}`))
                                    )
                                )))
                            )
                        )
                    ),
                    // PENALIDADES
                    abaAtiva === 'penalidades' && centralSelecionada && React.createElement('div', { className: 'space-y-4' },
                        React.createElement('h3', { className: 'font-bold text-lg' }, '🚫 Penalidades Ativas'),
                        penalidades.length === 0 ? React.createElement('p', { className: 'text-gray-500 text-center py-8' }, 'Nenhuma penalidade ativa') :
                        React.createElement('div', { className: 'space-y-2' }, penalidades.map(p => React.createElement('div', { key: p.id, className: 'bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between' },
                            React.createElement('div', null,
                                React.createElement('p', { className: 'font-bold text-red-800' }, p.nome_profissional || `#${p.cod_profissional}`),
                                React.createElement('p', { className: 'text-sm text-red-600' }, `Saídas hoje: ${p.saidas_hoje} • Bloqueado até: ${new Date(p.bloqueado_ate).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}`)
                            ),
                            React.createElement('button', { onClick: () => anularPenalidade(p.cod_profissional), className: 'px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm' }, '✅ Anular')
                        )))
                    ),
                    // VINCULOS
                    abaAtiva === 'vinculos' && centralSelecionada && React.createElement('div', { className: 'space-y-4' },
                        React.createElement('div', { className: 'flex justify-between items-center' }, React.createElement('h3', { className: 'font-bold text-lg' }, `Profissionais vinculados à ${centralSelecionada.nome}`), React.createElement('button', { onClick: () => setModalVinculo(true), className: 'px-4 py-2 bg-purple-600 text-white rounded-lg' }, '➕ Vincular')),
                        React.createElement('div', { className: 'bg-white rounded-lg border overflow-hidden' },
                            React.createElement('table', { className: 'w-full' },
                                React.createElement('thead', { className: 'bg-gray-50' }, React.createElement('tr', null, React.createElement('th', { className: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase' }, 'Código'), React.createElement('th', { className: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase' }, 'Nome'), React.createElement('th', { className: 'px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase' }, 'Status'), React.createElement('th', { className: 'px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase' }, 'Ações'))),
                                React.createElement('tbody', { className: 'divide-y' }, vinculos.length === 0 ? React.createElement('tr', null, React.createElement('td', { colSpan: 4, className: 'px-4 py-8 text-center text-gray-500' }, 'Nenhum vinculado')) : vinculos.map(p => React.createElement('tr', { key: p.cod_profissional, className: 'hover:bg-gray-50' }, React.createElement('td', { className: 'px-4 py-3 font-mono text-sm' }, p.cod_profissional), React.createElement('td', { className: 'px-4 py-3 font-medium' }, p.nome_profissional), React.createElement('td', { className: 'px-4 py-3 text-center' }, React.createElement('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${p.status_fila === 'em_rota' ? 'bg-green-100 text-green-700' : p.status_fila === 'aguardando' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}` }, p.status_fila === 'em_rota' ? '🏍️ Em Rota' : p.status_fila === 'aguardando' ? '⏳ Na Fila' : '💤 Fora')), React.createElement('td', { className: 'px-4 py-3 text-center' }, React.createElement('button', { onClick: () => desvincularProfissional(p.cod_profissional), className: 'px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm' }, '🗑️')))))
                            )
                        )
                    ),
                    // RELATORIOS
                    abaAtiva === 'relatorios' && centralSelecionada && React.createElement('div', { className: 'space-y-6' },
                        React.createElement('div', { className: 'flex items-center gap-4' }, React.createElement('label', { className: 'font-medium' }, 'Data:'), React.createElement('input', { type: 'date', value: filtroData, onChange: (e) => setFiltroData(e.target.value), className: 'px-3 py-2 border rounded-lg' }), React.createElement('button', { onClick: () => { carregarEstatisticas(centralSelecionada.id); carregarHistorico(centralSelecionada.id); }, className: 'px-4 py-2 bg-purple-600 text-white rounded-lg' }, '🔍 Filtrar')),
                        estatisticas && React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' }, React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' }, React.createElement('p', { className: 'text-sm text-gray-600' }, 'Total de Saídas'), React.createElement('p', { className: 'text-3xl font-bold text-purple-600' }, estatisticas.total_saidas)), React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' }, React.createElement('p', { className: 'text-sm text-gray-600' }, 'Tempo Médio Espera'), React.createElement('p', { className: 'text-3xl font-bold text-blue-600' }, `${estatisticas.tempo_medio_espera} min`))),
                        estatisticas?.ranking?.length > 0 && React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' }, React.createElement('h3', { className: 'font-bold text-lg mb-4' }, '🏆 Ranking'), React.createElement('div', { className: 'space-y-2' }, estatisticas.ranking.map((p, i) => React.createElement('div', { key: p.cod_profissional, className: 'flex items-center justify-between p-3 bg-gray-50 rounded-lg' }, React.createElement('div', { className: 'flex items-center gap-3' }, React.createElement('span', { className: 'text-xl' }, i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}º`), React.createElement('span', { className: 'font-medium' }, p.nome_profissional)), React.createElement('span', { className: 'font-bold text-purple-600' }, `${p.total_saidas} saídas`))))),
                        React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' }, React.createElement('h3', { className: 'font-bold text-lg mb-4' }, '📋 Histórico'), React.createElement('div', { className: 'overflow-x-auto' }, React.createElement('table', { className: 'w-full' }, React.createElement('thead', { className: 'bg-gray-50' }, React.createElement('tr', null, React.createElement('th', { className: 'px-3 py-2 text-left text-xs font-medium text-gray-500' }, 'Hora'), React.createElement('th', { className: 'px-3 py-2 text-left text-xs font-medium text-gray-500' }, 'Profissional'), React.createElement('th', { className: 'px-3 py-2 text-center text-xs font-medium text-gray-500' }, 'Ação'), React.createElement('th', { className: 'px-3 py-2 text-right text-xs font-medium text-gray-500' }, 'Tempo'))), React.createElement('tbody', { className: 'divide-y' }, historico.map((h, i) => React.createElement('tr', { key: i, className: 'hover:bg-gray-50' }, React.createElement('td', { className: 'px-3 py-2 text-sm' }, formatarHora(h.created_at)), React.createElement('td', { className: 'px-3 py-2 text-sm font-medium' }, h.nome_profissional), React.createElement('td', { className: 'px-3 py-2 text-center' }, React.createElement('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${h.acao === 'entrada' ? 'bg-blue-100 text-blue-700' : h.acao === 'enviado_rota' ? 'bg-green-100 text-green-700' : h.acao === 'penalidade_anulada' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}` }, h.acao === 'entrada' ? '📥 Entrada' : h.acao === 'enviado_rota' ? '🚀 Enviado' : h.acao === 'retorno' || h.acao === 'retorno_prioridade' ? '🔄 Retorno' : h.acao === 'removido' ? '❌ Removido' : h.acao === 'reordenado' ? '↕️ Reordenado' : h.acao === 'penalidade_anulada' ? '✅ Penalidade anulada' : '👋 Saiu')), React.createElement('td', { className: 'px-3 py-2 text-right text-sm text-gray-500' }, h.tempo_espera_minutos ? `${h.tempo_espera_minutos} min espera` : h.tempo_rota_minutos ? `${h.tempo_rota_minutos} min rota` : '-')))))))
                    ),
                    // CONFIG (com Regiões)
                    abaAtiva === 'config' && React.createElement('div', { className: 'space-y-6' },
                        React.createElement('h3', { className: 'font-bold text-lg' }, 'Centrais Cadastradas'),
                        React.createElement('div', { className: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' }, centrais.map(c => React.createElement('div', { key: c.id, className: `bg-white rounded-xl p-4 shadow border ${c.ativa ? 'border-green-200' : 'border-red-200 opacity-60'}` },
                            React.createElement('div', { className: 'flex justify-between items-start mb-3' }, React.createElement('div', null, React.createElement('h4', { className: 'font-bold text-gray-800' }, c.nome), React.createElement('p', { className: 'text-sm text-gray-500' }, c.endereco)), React.createElement('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${c.ativa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}` }, c.ativa ? 'Ativa' : 'Inativa')),
                            React.createElement('div', { className: 'text-sm text-gray-600 mb-3' }, React.createElement('p', null, `📍 Lat: ${parseFloat(c.latitude).toFixed(6)}`), React.createElement('p', null, `📏 Raio: ${c.raio_metros}m`)),
                            React.createElement('div', { className: 'flex gap-2' }, React.createElement('button', { onClick: () => setModalCentral(c), className: 'flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium' }, '✏️ Editar'), React.createElement('button', { onClick: async () => { if (!window.confirm('Excluir?')) return; try { const r = await fetchAuth(`${apiUrl}/filas/centrais/${c.id}`, { method: 'DELETE' }); const d = await r.json(); if (d.success) { showToast('Excluída!', 'success'); carregarCentrais(); } else showToast(d.error, 'error'); } catch (e) { showToast('Erro', 'error'); } }, className: 'px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium' }, '🗑️'))
                        ))),
                        // REGIÕES
                        centralSelecionada && React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' },
                            React.createElement('h3', { className: 'font-bold text-lg mb-4' }, '🗺️ Regiões de Rotas — ', centralSelecionada.nome),
                            React.createElement('div', { className: 'flex gap-2 mb-4' },
                                React.createElement('input', { type: 'text', value: novaRegiaoInput, onChange: (e) => setNovaRegiaoInput(e.target.value.toUpperCase()), onKeyDown: (e) => { if(e.key==='Enter'&&novaRegiaoInput.trim()){ criarRegiao(novaRegiaoInput); setNovaRegiaoInput(''); } }, placeholder: 'Nome da região...', className: 'flex-1 px-3 py-2 border rounded-lg text-sm' }),
                                React.createElement('button', { onClick: () => { if(novaRegiaoInput.trim()){ criarRegiao(novaRegiaoInput); setNovaRegiaoInput(''); } }, className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium' }, '➕ Criar Região')
                            ),
                            regioes.length === 0 ? React.createElement('p', { className: 'text-gray-400 text-sm text-center py-4' }, 'Nenhuma região criada') :
                            React.createElement('div', { className: 'space-y-3' }, regioes.map(r => React.createElement('div', { key: r.id, className: 'border border-indigo-200 rounded-lg p-3' },
                                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                                    React.createElement('span', { className: 'font-bold text-indigo-800' }, `🗺️ ${r.nome}`),
                                    React.createElement('div', { className: 'flex items-center gap-2' },
                                        React.createElement('span', { className: 'text-xs text-gray-500' }, `${r.total_bairros} bairro(s)`),
                                        React.createElement('button', { onClick: () => removerRegiao(r.id), className: 'text-red-500 text-xs font-bold' }, '✕')
                                    )
                                ),
                                React.createElement('div', { className: 'flex flex-wrap gap-1' },
                                    bairrosConfig.filter(b => b.regiao_id === r.id).sort((a,b) => a.nome.localeCompare(b.nome)).map(b => React.createElement('span', { key: b.id, className: 'inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium' }, `📍 ${b.nome}`, React.createElement('button', { onClick: () => atualizarBairroRegiao(b.id, null), className: 'text-red-400 ml-1', title: 'Remover da região' }, '✕')))
                                )
                            )))
                        ),
                        // BAIRROS
                        centralSelecionada && React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' },
                            React.createElement('div', { className: 'flex items-center justify-between mb-4' },
                                React.createElement('h3', { className: 'font-bold text-lg' }, '📍 Bairros — ', centralSelecionada.nome),
                                React.createElement('span', { className: 'text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold' }, bairrosConfig.length + ' cadastrados')
                            ),
                            React.createElement('div', { className: 'flex gap-2 mb-4' },
                                React.createElement('input', { type: 'text', id: 'config-bairro-input', placeholder: 'Nome do bairro...', className: 'flex-1 px-3 py-2 border rounded-lg text-sm', style: { textTransform: 'uppercase' }, onKeyDown: function(e) { if(e.key==='Enter'&&e.target.value.trim()){ adicionarBairroConfig(e.target.value); e.target.value=''; } } }),
                                regioes.length > 0 && React.createElement('select', { id: 'config-bairro-regiao', className: 'px-2 py-2 border rounded-lg text-sm' }, React.createElement('option', { value: '' }, 'Sem região'), regioes.map(r => React.createElement('option', { key: r.id, value: r.id }, r.nome))),
                                React.createElement('button', { onClick: function() { var inp=document.getElementById('config-bairro-input'); var sel=document.getElementById('config-bairro-regiao'); if(inp&&inp.value.trim()){ adicionarBairroConfig(inp.value, sel?sel.value:null); inp.value=''; } }, className: 'px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium' }, '➕')
                            ),
                            // Bairros sem região
                            React.createElement('div', { className: 'mb-3' },
                                React.createElement('p', { className: 'text-xs font-semibold text-gray-500 mb-2' }, 'SEM REGIÃO'),
                                React.createElement('div', { className: 'flex flex-wrap gap-2' },
                                    bairrosConfig.filter(b => !b.regiao_id).sort((a,b) => a.nome.localeCompare(b.nome)).map(b => React.createElement('div', { key: b.id, className: 'inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full' },
                                        React.createElement('span', { className: 'text-sm font-medium text-blue-700' }, '📍 ' + b.nome),
                                        regioes.length > 0 && React.createElement('select', { value: '', onChange: (e) => { if(e.target.value) atualizarBairroRegiao(b.id, e.target.value); }, className: 'text-xs border rounded px-1 py-0.5', style: { maxWidth: '90px' } }, React.createElement('option', { value: '' }, '→ Região'), regioes.map(r => React.createElement('option', { key: r.id, value: r.id }, r.nome))),
                                        React.createElement('button', { onClick: function() { if(window.confirm('Remover "'+b.nome+'"?')) removerBairroConfig(b.id); }, className: 'text-red-400 hover:text-red-600 text-xs font-bold' }, '✕')
                                    ))
                                )
                            )
                        ),
                        !centralSelecionada && null
                    )
                )
            ),
            // MODAL CRIAR/EDITAR CENTRAL
            modalCentral && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
                React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto' },
                    React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-2xl text-white' }, React.createElement('h2', { className: 'text-xl font-bold' }, modalCentral.id ? '✏️ Editar Central' : '➕ Nova Central')),
                    React.createElement('form', { className: 'p-6 space-y-4', onSubmit: (e) => { e.preventDefault(); if (!enderecoValidado && !modalCentral.id) { showToast('Busque o endereço primeiro', 'error'); return; } const fd = new FormData(e.target); salvarCentral({ id: modalCentral.id, nome: fd.get('nome'), endereco: coordenadasEncontradas?.enderecoFormatado || fd.get('endereco'), latitude: coordenadasEncontradas?.latitude || modalCentral.latitude, longitude: coordenadasEncontradas?.longitude || modalCentral.longitude, raio_metros: parseInt(fd.get('raio_metros')), ativa: fd.get('ativa') === 'on' }); } },
                        React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Nome *'), React.createElement('input', { name: 'nome', defaultValue: modalCentral.nome || '', required: true, className: 'w-full px-3 py-2 border rounded-lg' })),
                        React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '📍 Endereço *'), React.createElement('div', { className: 'relative' }, React.createElement('input', { name: 'endereco', defaultValue: modalCentral.endereco || '', required: true, className: `w-full px-3 py-2 border rounded-lg pr-10 ${enderecoValidado ? 'border-green-500 bg-green-50' : ''}`, onChange: (e) => buscarEnderecoDebounced(e.target.value) }), React.createElement('span', { className: 'absolute right-3 top-2.5 text-xl' }, buscandoEndereco ? '⏳' : enderecoValidado ? '✅' : '🔍'))),
                        coordenadasEncontradas && React.createElement('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-3' }, React.createElement('p', { className: 'text-sm text-green-800' }, `✅ ${coordenadasEncontradas.latitude?.toFixed?.(6)}, ${coordenadasEncontradas.longitude?.toFixed?.(6)}`)),
                        React.createElement('div', null, React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Raio (metros)'), React.createElement('input', { name: 'raio_metros', type: 'number', defaultValue: modalCentral.raio_metros || 900, required: true, className: 'w-full px-3 py-2 border rounded-lg' })),
                        modalCentral.id && React.createElement('div', { className: 'flex items-center gap-2' }, React.createElement('input', { name: 'ativa', type: 'checkbox', defaultChecked: modalCentral.ativa !== false, className: 'w-4 h-4' }), React.createElement('label', { className: 'text-sm font-medium text-gray-700' }, 'Central ativa')),
                        React.createElement('div', { className: 'flex gap-3 pt-4' }, React.createElement('button', { type: 'button', onClick: () => { setModalCentral(null); setEnderecoValidado(false); setCoordenadasEncontradas(null); }, className: 'flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium' }, 'Cancelar'), React.createElement('button', { type: 'submit', disabled: !enderecoValidado && !modalCentral.id, className: `flex-1 px-4 py-2 rounded-lg font-medium ${(!enderecoValidado && !modalCentral.id) ? 'bg-gray-300 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'}` }, '💾 Salvar'))
                    )
                )
            ),
            // MODAL VINCULAR
            modalVinculo && centralSelecionada && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
                React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden' },
                    React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white' }, React.createElement('h2', { className: 'text-xl font-bold' }, '👥 Vincular Profissional'), React.createElement('p', { className: 'text-purple-200 text-sm' }, `à ${centralSelecionada.nome}`)),
                    React.createElement('div', { className: 'p-4 overflow-y-auto max-h-[60vh]' }, React.createElement('input', { type: 'text', placeholder: '🔍 Buscar...', className: 'w-full px-3 py-2 border rounded-lg mb-4', onChange: (e) => { const s = e.target.value.toLowerCase(); document.querySelectorAll('.prof-item').forEach(el => { el.style.display = el.textContent.toLowerCase().includes(s) ? '' : 'none'; }); } }), React.createElement('div', { className: 'space-y-2' }, profissionaisDisponiveis.map(p => React.createElement('div', { key: p.cod_profissional, className: 'prof-item flex items-center justify-between p-3 bg-gray-50 rounded-lg' }, React.createElement('div', null, React.createElement('p', { className: 'font-medium' }, p.full_name), React.createElement('p', { className: 'text-xs text-gray-500' }, `#${p.cod_profissional}`)), React.createElement('button', { onClick: () => { vincularProfissional(p.cod_profissional, p.full_name); setModalVinculo(false); }, className: 'px-3 py-1 bg-purple-600 text-white rounded-lg text-sm' }, '➕'))))),
                    React.createElement('div', { className: 'p-4 border-t' }, React.createElement('button', { onClick: () => setModalVinculo(false), className: 'w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium' }, 'Fechar'))
                )
            ),
            // MODAL BAIRROS → LIBERAR NOTA
            modalBairros && centralSelecionada && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2' },
                React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col' },
                    React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white flex-shrink-0' },
                        React.createElement('h2', { className: 'text-lg font-bold' },
                            modalBairros.modoEdicao
                                ? '✏️ Editar Bairros'
                                : '📦 Liberar ' + (modalBairros.notaNum || '') + 'ª Nota'
                        ),
                        React.createElement('p', { className: 'text-purple-200 text-sm' }, modalBairros.nome)
                    ),
                    React.createElement('div', { className: 'p-4 space-y-4 overflow-y-auto flex-1' },
                        // BAIRROS SELECIONADOS
                        React.createElement('div', null, React.createElement('p', { className: 'text-xs font-semibold text-gray-500 mb-2' }, 'BAIRROS DA NOTA ', (modalBairros.bairros||[]).length > 0 && React.createElement('span', { className: 'text-purple-600' }, '(' + (modalBairros.bairros||[]).length + ')')),
                            (modalBairros.bairros||[]).length === 0 ? React.createElement('p', { className: 'text-sm text-gray-400 italic' }, 'Selecione os bairros abaixo') :
                            React.createElement('div', { className: 'flex flex-wrap gap-2' }, (modalBairros.bairros||[]).map(function(b, i) { return React.createElement('span', { key: i, onClick: function() { removerBairroByIndex(i); }, className: 'inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold cursor-pointer hover:bg-red-100 hover:text-red-600 transition-colors' }, '📍 ' + b, React.createElement('span', { className: 'text-xs ml-1' }, '✕')); }))
                        ),
                        // REGIÕES COM BAIRROS
                        regioes.length > 0 && regioes.map(function(r) {
                            var bairrosRegiao = bairrosConfig.filter(function(b){ return b.regiao_id === r.id; }).sort(function(a,b){ return a.nome.localeCompare(b.nome); });
                            if (bairrosRegiao.length === 0) return null;
                            return React.createElement('div', { key: r.id, className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
                                React.createElement('p', { className: 'text-sm font-bold text-indigo-800 mb-2' }, '🗺️ ' + r.nome),
                                React.createElement('div', { className: 'flex flex-wrap gap-2' }, bairrosRegiao.map(function(b) {
                                    return React.createElement('div', { key: b.id, className: 'inline-flex items-center gap-1' },
                                        React.createElement('button', { onClick: function() { adicionarBairroModal(b.nome); }, className: 'px-3 py-1.5 bg-white text-indigo-700 rounded-l-full text-sm font-medium hover:bg-purple-100 hover:text-purple-700 transition-colors active:scale-95 border border-indigo-200' }, '+ ' + b.nome),
                                        React.createElement('button', { onClick: function() { if(window.confirm('Remover "'+b.nome+'" do cadastro?')) removerBairroConfig(b.id); }, className: 'px-1.5 py-1.5 bg-white text-red-400 rounded-r-full text-xs hover:bg-red-100 hover:text-red-600 border border-l-0 border-indigo-200', title: 'Remover bairro do cadastro' }, '✕')
                                    );
                                }))
                            );
                        }),
                        // BAIRROS SEM REGIÃO
                        (function() {
                            var semRegiao = bairrosConfig.filter(function(b){ return !b.regiao_id; }).sort(function(a,b){ return a.nome.localeCompare(b.nome); });
                            return React.createElement('div', { className: 'bg-gray-50 rounded-xl p-3 border border-gray-200' },
                                React.createElement('p', { className: 'text-sm font-bold text-gray-700 mb-2' }, regioes.length > 0 ? '📍 SEM REGIÃO' : '📍 BAIRROS DISPONÍVEIS'),
                                semRegiao.length === 0 ? React.createElement('p', { className: 'text-sm text-gray-400 italic' }, 'Nenhum bairro sem região') :
                                React.createElement('div', { className: 'flex flex-wrap gap-2' }, semRegiao.map(function(b) {
                                    return React.createElement('div', { key: b.id, className: 'inline-flex items-center gap-0' },
                                        React.createElement('button', { onClick: function() { adicionarBairroModal(b.nome); }, className: 'px-3 py-1.5 bg-white text-gray-700 rounded-l-full text-sm font-medium hover:bg-purple-100 hover:text-purple-700 transition-colors active:scale-95 border border-gray-200' }, '+ ' + b.nome),
                                        React.createElement('button', { onClick: function() { if(window.confirm('Remover "'+b.nome+'" do cadastro?')) removerBairroConfig(b.id); }, className: 'px-1.5 py-1.5 bg-white text-red-400 rounded-r-full text-xs hover:bg-red-100 hover:text-red-600 border border-l-0 border-gray-200', title: 'Remover bairro' }, '✕')
                                    );
                                }))
                            );
                        })(),
                        // NOVO BAIRRO
                        React.createElement('div', null, React.createElement('p', { className: 'text-xs font-semibold text-gray-500 mb-2' }, 'ADICIONAR NOVO BAIRRO'),
                            React.createElement('div', { className: 'flex gap-2' },
                                React.createElement('input', { type: 'text', value: novoBairroInput, onChange: function(e) { setNovoBairroInput(e.target.value.toUpperCase()); }, onKeyDown: function(e) { if(e.key==='Enter'&&novoBairroInput.trim()){ adicionarBairroConfig(novoBairroInput); adicionarBairroModal(novoBairroInput.trim()); setNovoBairroInput(''); } }, placeholder: 'NOME DO BAIRRO...', className: 'flex-1 px-3 py-2 border rounded-lg text-sm' }),
                                React.createElement('button', { onClick: function() { if(novoBairroInput.trim()){ adicionarBairroConfig(novoBairroInput); adicionarBairroModal(novoBairroInput.trim()); setNovoBairroInput(''); } }, className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium' }, '➕')
                            )
                        )
                    ),
                    React.createElement('div', { className: 'p-4 border-t flex gap-3 flex-shrink-0' },
                        React.createElement('button', { onClick: function() { setModalBairros(null); }, className: 'flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium' }, 'Cancelar'),
                        modalBairros.modoEdicao
                            ? React.createElement('button', { onClick: function() { salvarEdicaoBairros(); }, className: 'flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-lg' }, '💾 Salvar Bairros')
                            : React.createElement('button', { onClick: function() { liberarNotaComBairros(); }, className: 'flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-lg' }, '📦 Liberar ' + (modalBairros.notaNum || '') + 'ª Nota')
                    )
                )
            ),

            // 🚀 2026-05: MODAL Colocar Vinculado na Fila
            modalColocarFila && centralSelecionada && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
                React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col' },
                    // Header
                    React.createElement('div', { className: 'bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center justify-between' },
                        React.createElement('div', null,
                            React.createElement('h2', { className: 'text-lg font-bold' }, '➕ Colocar na Fila'),
                            React.createElement('p', { className: 'text-blue-200 text-sm' }, centralSelecionada.nome)
                        ),
                        React.createElement('button', {
                            onClick: () => setModalColocarFila(null),
                            className: 'text-white/80 hover:text-white text-2xl leading-none'
                        }, '×')
                    ),
                    // Filtro
                    React.createElement('div', { className: 'p-3 border-b' },
                        React.createElement('input', {
                            type: 'text',
                            value: modalColocarFila.filtro,
                            onChange: (e) => setModalColocarFila({ ...modalColocarFila, filtro: e.target.value }),
                            placeholder: '🔍 Buscar por nome ou código...',
                            className: 'w-full px-3 py-2 border rounded-lg text-sm'
                        })
                    ),
                    // Lista
                    React.createElement('div', { className: 'flex-1 overflow-y-auto p-2' },
                        (() => {
                            const filtro = (modalColocarFila.filtro || '').toLowerCase().trim();
                            const lista = filtro
                                ? modalColocarFila.vinculados.filter(v =>
                                    (v.nome_profissional || '').toLowerCase().includes(filtro) ||
                                    String(v.cod_profissional || '').includes(filtro))
                                : modalColocarFila.vinculados;
                            if (modalColocarFila.vinculados.length === 0) {
                                return React.createElement('div', { className: 'text-center py-8 text-gray-400' },
                                    React.createElement('div', { className: 'text-4xl mb-2' }, '✅'),
                                    React.createElement('div', { className: 'text-sm' }, 'Todos os vinculados já estão na fila ou em rota')
                                );
                            }
                            if (lista.length === 0) {
                                return React.createElement('div', { className: 'text-center py-8 text-gray-400 text-sm' }, 'Nenhum resultado');
                            }
                            return React.createElement('div', { className: 'space-y-1' },
                                lista.map(v => React.createElement('button', {
                                    key: v.cod_profissional,
                                    onClick: () => colocarMotoboyNaFila(v.cod_profissional),
                                    className: 'w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors text-left border border-transparent hover:border-blue-200'
                                },
                                    React.createElement('div', null,
                                        React.createElement('div', { className: 'text-sm font-medium text-gray-800' }, v.nome_profissional || '(sem nome)'),
                                        React.createElement('div', { className: 'text-xs text-gray-500' }, '#' + v.cod_profissional)
                                    ),
                                    React.createElement('span', { className: 'text-blue-600 text-lg' }, '➕')
                                ))
                            );
                        })()
                    ),
                    // Footer
                    React.createElement('div', { className: 'p-3 border-t flex gap-2' },
                        React.createElement('button', {
                            onClick: () => setModalColocarFila(null),
                            className: 'flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm'
                        }, 'Fechar')
                    )
                )
            )
        );
    }

    // ==================== RENDERIZAÇÃO USER ====================
    if (loading) return React.createElement('div', { className: 'flex items-center justify-center min-h-[400px]' }, React.createElement('div', { className: 'text-center' }, React.createElement('div', { className: 'w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4' }), React.createElement('p', { className: 'text-gray-600' }, 'Carregando...')));
    if (!minhaCentral) return React.createElement('div', { className: 'min-h-[400px] flex items-center justify-center' }, React.createElement('div', { className: 'text-center bg-white rounded-2xl shadow-lg p-8 max-w-md mx-4' }, React.createElement('span', { className: 'text-6xl block mb-4' }, '🚫'), React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-2' }, 'Sem Acesso à Fila'), React.createElement('p', { className: 'text-gray-600' }, 'Você não está vinculado a nenhuma central.')));

    const podeChekin = gpsStatus === 'permitido' && (distanciaCentral === null || distanciaCentral <= minhaCentral.raio_metros);
    const penalizado = minhaPenalidade?.bloqueado && minhaPenalidade?.minutos_restantes > 0;

    return React.createElement('div', { className: 'max-w-lg mx-auto p-4 space-y-6' },
        // POPUP NOTIFICAÇÃO
        mostrarNotificacao && notificacao && React.createElement('div', { className: 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4', onClick: () => { marcarNotificacaoLida(); } },
            React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full', onClick: (e) => e.stopPropagation(), style: { animation: 'notifPulse 0.5s ease-out' } },
                React.createElement('div', { className: 'text-center mb-4' }, React.createElement('span', { className: 'text-6xl block mb-3' }, notificacao.tipo === 'nota_liberada' ? '📦' : notificacao.tipo === 'roteiro_despachado' ? '🚀' : notificacao.tipo === 'corrida_unica' ? '👑' : '🔔'), React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-2' }, notificacao.tipo === 'nota_liberada' ? 'Nota Liberada!' : notificacao.tipo === 'roteiro_despachado' ? 'Roteiro Despachado!' : notificacao.tipo === 'corrida_unica' ? 'Corrida Única!' : 'Notificação')),
                React.createElement('div', { className: 'bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200' }, React.createElement('p', { className: 'text-sm text-purple-800 leading-relaxed text-center' }, notificacao.mensagem)),
                React.createElement('button', { onClick: () => { marcarNotificacaoLida(); }, className: 'w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-lg hover:bg-purple-700' }, '✅ Entendi')
            )
        ),
        // MODAL CONFIRMAÇÃO SAÍDA (com penalidade)
        modalSaida && React.createElement('div', { className: 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4' },
            React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full' },
                React.createElement('div', { className: 'text-center mb-4' }, React.createElement('span', { className: 'text-5xl block mb-3' }, '⚠️'), React.createElement('h2', { className: 'text-xl font-bold text-red-800 mb-2' }, 'Atenção!')),
                React.createElement('div', { className: 'bg-red-50 rounded-xl p-4 mb-4 border border-red-200' },
                    React.createElement('p', { className: 'text-sm text-red-800 leading-relaxed text-center font-medium' },
                        `Se você sair da fila agora, só poderá retornar dentro de ${minhaPenalidade?.proxima_penalidade_minutos >= 60 ? (minhaPenalidade.proxima_penalidade_minutos >= 1440 ? '24 horas' : Math.floor(minhaPenalidade.proxima_penalidade_minutos / 60) + ' horas') : (minhaPenalidade?.proxima_penalidade_minutos || 30) + ' minutos'}.`
                    ),
                    (minhaPenalidade?.saidas_hoje || 0) > 0 && React.createElement('p', { className: 'text-xs text-red-600 text-center mt-2' }, `Você já saiu ${minhaPenalidade.saidas_hoje}x hoje.`)
                ),
                React.createElement('div', { className: 'flex gap-3' },
                    React.createElement('button', { onClick: () => setModalSaida(false), className: 'flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold' }, 'Ficar'),
                    React.createElement('button', { onClick: sairDaFila, className: 'flex-1 py-3 bg-red-600 text-white rounded-xl font-bold' }, 'Sair')
                )
            )
        ),
        // HEADER
        React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg' },
            React.createElement('div', { className: 'flex items-center gap-3 mb-2' }, React.createElement('span', { className: 'text-2xl' }, '📍'), React.createElement('div', null, React.createElement('h1', { className: 'text-lg font-bold' }, minhaCentral.central_nome), React.createElement('p', { className: 'text-purple-200 text-xs' }, minhaCentral.endereco))),
            React.createElement('div', { className: `flex items-center gap-2 p-2 rounded-lg ${gpsStatus === 'permitido' ? 'bg-green-500/20' : gpsStatus === 'negado' ? 'bg-red-500/20' : 'bg-yellow-500/20'}` },
                React.createElement('span', { className: 'text-lg' }, gpsStatus === 'permitido' ? '📡' : gpsStatus === 'negado' ? '🚫' : '⏳'),
                React.createElement('div', { className: 'flex-1' }, React.createElement('p', { className: 'font-medium text-xs' }, gpsStatus === 'permitido' ? 'GPS Ativo' : gpsStatus === 'negado' ? 'GPS Bloqueado' : 'Verificando GPS...'), distanciaCentral !== null && gpsStatus === 'permitido' && React.createElement('p', { className: `text-xs ${distanciaCentral <= minhaCentral.raio_metros ? 'text-green-200' : 'text-red-200'}` }, `Você está a ${distanciaCentral}m (máx ${minhaCentral.raio_metros}m)`)),
                gpsStatus === 'negado' && React.createElement('button', { onClick: solicitarGPS, className: 'px-2 py-1 bg-white/20 rounded-lg text-xs' }, 'Tentar')
            )
        ),
        // PENALIDADE ATIVA
        penalizado && React.createElement('div', { className: 'bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center' },
            React.createElement('span', { className: 'text-5xl block mb-4' }, '🚫'),
            React.createElement('h2', { className: 'text-lg font-bold text-red-800 mb-2' }, 'Bloqueado'),
            React.createElement('p', { className: 'text-red-600 mb-2' }, `Você saiu voluntariamente da fila e está bloqueado por mais ${minhaPenalidade.minutos_restantes} minuto(s).`),
            React.createElement('p', { className: 'text-xs text-red-500' }, `Saídas hoje: ${minhaPenalidade.saidas_hoje}`)
        ),
        // GPS NEGADO
        !penalizado && gpsStatus === 'negado' ? React.createElement('div', { className: 'bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center' }, React.createElement('span', { className: 'text-5xl block mb-4' }, '📍'), React.createElement('h2', { className: 'text-lg font-bold text-red-800 mb-2' }, 'GPS Necessário'), React.createElement('p', { className: 'text-red-600 mb-4' }, 'Permita acesso à localização.'), React.createElement('button', { onClick: solicitarGPS, className: 'px-6 py-3 bg-red-600 text-white rounded-xl font-bold' }, '🔓 Permitir')) :
        !penalizado && React.createElement(React.Fragment, null,
            // EM ROTA
            minhaPosicao?.status === 'em_rota' && React.createElement('div', { className: `border-2 rounded-2xl p-6 ${minhaPosicao.corrida_unica ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}` },
                React.createElement('div', { className: 'flex items-center gap-4 mb-4' }, React.createElement('span', { className: 'text-5xl' }, minhaPosicao.corrida_unica ? '👑' : '🏍️'), React.createElement('div', null, React.createElement('h2', { className: `text-xl font-bold ${minhaPosicao.corrida_unica ? 'text-yellow-800' : 'text-green-800'}` }, minhaPosicao.corrida_unica ? 'Corrida Única!' : 'Você está em Rota!'), React.createElement('p', { className: minhaPosicao.corrida_unica ? 'text-yellow-600' : 'text-green-600' }, `⏱️ ${formatarTempo(minhaPosicao.minutos_em_rota)} em serviço`))),
                // Cooldown ativo: mensagem + sem botão
                minhaPosicao.cooldown_restante > 0 ? React.createElement('div', { className: 'bg-orange-50 border border-orange-300 rounded-xl p-4' },
                    React.createElement('p', { className: 'text-sm text-orange-800 font-medium text-center leading-relaxed' },
                        `📦 Você foi despachado com ${minhaPosicao.notas_liberadas || 0} entrega(s). Finalize-as e retorne para a fila.`
                    )
                ) :
                // Cooldown expirado: mostrar mensagem + botão retorno
                React.createElement(React.Fragment, null,
                    React.createElement('div', { className: `rounded-xl p-4 mb-4 ${minhaPosicao.corrida_unica ? 'bg-yellow-100 border border-yellow-300' : 'bg-green-100 border border-green-300'}` },
                        React.createElement('p', { className: `text-sm leading-relaxed ${minhaPosicao.corrida_unica ? 'text-yellow-800' : 'text-green-800'}` },
                            minhaPosicao.corrida_unica
                                ? '👑 Seu roteiro já foi definido, e você saiu com apenas uma corrida! Retire a mercadoria na expedição e boas entregas!'
                                : minhaPosicao.notas_liberadas > 0
                                ? `✅ Todas as ${minhaPosicao.notas_liberadas} nota(s) foram liberadas. Siga para o roteiro!`
                                : '🚀 Seu roteiro já foi definido. Retire a mercadoria na expedição e boas entregas!'
                        ),
                        minhaPosicao.corrida_unica && minhaPosicao.posicao_original && React.createElement('p', { className: 'text-yellow-700 text-sm mt-2 font-medium' }, `🎁 Ao retornar, você volta para a posição ${minhaPosicao.posicao_original}`)
                    ),
                    React.createElement('button', { onClick: entrarNaFila, disabled: !podeChekin, className: `w-full py-4 rounded-xl font-bold text-lg ${!podeChekin ? 'bg-gray-300 text-gray-500' : minhaPosicao.corrida_unica ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-green-600 text-white hover:bg-green-700'}` }, minhaPosicao.corrida_unica ? '👑 Retornar com Prioridade' : '🔄 Retornar para a Fila')
                )
            ),
            // AGUARDANDO
            minhaPosicao?.status === 'aguardando' && React.createElement('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-6' },
                React.createElement('div', { className: 'text-center mb-6' }, React.createElement('p', { className: 'text-blue-600 text-sm mb-2' }, 'Sua posição na fila'), React.createElement('div', { className: 'text-6xl font-bold text-blue-800 mb-2' }, minhaPosicao.minha_posicao, 'º'), React.createElement('p', { className: 'text-blue-600' }, `⏱️ ${formatarTempo(minhaPosicao.minutos_esperando)}`)),
                minhaPosicao.notas_liberadas > 0 && React.createElement('div', { className: 'bg-purple-50 border-2 border-purple-300 rounded-xl p-4 mb-4 animate-pulse' },
                    React.createElement('div', { className: 'flex items-center gap-3 mb-2' }, React.createElement('span', { className: 'text-3xl' }, '📦'), React.createElement('div', null, React.createElement('p', { className: 'font-bold text-purple-800 text-lg' }, `${minhaPosicao.notas_liberadas}ª da fila`), React.createElement('p', { className: 'text-purple-600 text-sm' }, `${minhaPosicao.notas_liberadas} nota(s) já liberada(s)`))),
                    React.createElement('div', { className: 'bg-white rounded-lg p-3 border border-purple-200' }, React.createElement('p', { className: 'text-sm text-purple-800' }, `A ${minhaPosicao.notas_liberadas}ª nota já foi liberada! Verifique o APP Tutts e realize a coleta.`))
                ),
                React.createElement('div', { className: 'flex items-center justify-center gap-2 p-3 bg-purple-100 rounded-lg border-2 border-purple-300 mb-6' }, React.createElement('span', { className: 'w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold' }, minhaPosicao.minha_posicao), React.createElement('span', { className: 'font-bold text-purple-800' }, 'Você está na posição ', minhaPosicao.minha_posicao, 'º')),
                React.createElement('button', { onClick: () => { carregarMinhaPenalidade(); setModalSaida(true); }, className: 'w-full py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200' }, '👋 Sair da Fila')
            ),
            // FORA DA FILA
            !minhaPosicao?.na_fila && React.createElement('div', { className: 'bg-white rounded-2xl shadow-lg p-6' },
                React.createElement('div', { className: 'text-center mb-6' }, React.createElement('span', { className: 'text-6xl block mb-4' }, '🏁'), React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, 'Pronto para coletar pedidos?'), React.createElement('p', { className: 'text-gray-600' }, 'Entre na fila e aguarde a disponibilidade de corridas!')),
                React.createElement('button', { onClick: entrarNaFila, disabled: !podeChekin, className: `w-full py-4 rounded-xl font-bold text-lg ${!podeChekin ? 'bg-gray-300 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'}` }, gpsStatus !== 'permitido' ? '📍 Aguardando GPS...' : distanciaCentral > minhaCentral.raio_metros ? `📍 Muito longe (${distanciaCentral}m)` : '🚀 Entrar na Fila'),
                distanciaCentral !== null && distanciaCentral > minhaCentral.raio_metros && React.createElement('p', { className: 'text-center text-red-500 text-sm mt-2' }, `Aproxime-se (você está a ${distanciaCentral}m, máx ${minhaCentral.raio_metros}m)`)
            )
        )
    );
}

window.ModuloFilas = ModuloFilas;
