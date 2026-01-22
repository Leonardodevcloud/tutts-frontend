// ============================================================
// MÓDULO DE FILAS - FRONTEND COMPLETO
// Com integração Google Geocoding, WebSocket para notificações,
// Corrida Única, Prioridade de Retorno, Mover para Último
// Versão: 2.0 - Janeiro 2026
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
    const [wsConectado, setWsConectado] = React.useState(false);
    const wsRef = React.useRef(null);
    const isAdmin = ['admin', 'admin_master'].includes(usuario?.role);

    // ==================== WEBSOCKET PARA NOTIFICAÇÕES ====================
    const conectarWebSocket = () => {
        if (isAdmin) return; // Admin não precisa de notificações de motoboy
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('⚠️ [Filas] Sem token para WebSocket');
            return;
        }
        
        // Determinar URL do WebSocket
        // apiUrl exemplo: "https://tutts-backend-production.up.railway.app/api"
        // Precisamos extrair: "tutts-backend-production.up.railway.app"
        let wsHost;
        try {
            const urlObj = new URL(apiUrl);
            wsHost = urlObj.host; // Pega host sem protocolo e sem path
        } catch (e) {
            // Fallback: remover manualmente
            wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/api.*$/, '').replace(/\/$/, '');
        }
        
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${wsHost}/ws/filas`;
        
        console.log('🔌 [Filas] Conectando WebSocket:', wsUrl);
        console.log('🔌 [Filas] apiUrl original:', apiUrl);
        console.log('🔌 [Filas] wsHost extraído:', wsHost);
        
        try {
            wsRef.current = new WebSocket(wsUrl);
            
            wsRef.current.onopen = () => {
                console.log('✅ [Filas] WebSocket conectado');
                // Enviar autenticação
                wsRef.current.send(JSON.stringify({ type: 'AUTH', token }));
            };
            
            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📩 [Filas] Mensagem WS:', data);
                    
                    if (data.event === 'AUTH_SUCCESS') {
                        setWsConectado(true);
                        console.log('✅ [Filas] Autenticado no WebSocket');
                    }
                    
                    // ===== NOTIFICAÇÕES DE ROTEIRO =====
                    if (data.event === 'ROTEIRO_DESPACHADO') {
                        // Tocar som de notificação
                        tocarSomNotificacao();
                        
                        // Vibrar dispositivo (se suportado)
                        if (navigator.vibrate) {
                            navigator.vibrate([200, 100, 200, 100, 200]);
                        }
                        
                        // Mostrar toast com a mensagem
                        showToast(data.data.mensagem, 'success');
                        
                        // Mostrar notificação do sistema (se permitido)
                        mostrarNotificacaoSistema(
                            data.data.tipo === 'corrida_unica' ? '👑 Corrida Única!' : '🚀 Roteiro Despachado!',
                            data.data.mensagem
                        );
                        
                        // Atualizar posição
                        carregarMinhaPosicao();
                    }
                    
                    // ===== NOTIFICAÇÃO DE POSIÇÃO ALTERADA =====
                    if (data.event === 'POSICAO_ALTERADA') {
                        tocarSomNotificacao();
                        showToast(data.data.mensagem, 'warning');
                        carregarMinhaPosicao();
                    }
                    
                } catch (e) {
                    console.error('❌ [Filas] Erro ao processar mensagem WS:', e);
                }
            };
            
            wsRef.current.onclose = (event) => {
                console.log('🔌 [Filas] WebSocket desconectado. Code:', event.code, 'Reason:', event.reason);
                setWsConectado(false);
                // Reconectar após 5 segundos (apenas se não foi fechamento intencional)
                if (event.code !== 1000) {
                    setTimeout(conectarWebSocket, 5000);
                }
            };
            
            wsRef.current.onerror = (error) => {
                console.error('❌ [Filas] Erro WebSocket:', error);
                console.error('❌ [Filas] URL tentada:', wsUrl);
                setWsConectado(false);
            };
            
        } catch (e) {
            console.error('❌ [Filas] Erro ao criar WebSocket:', e);
        }
    };
    
    // Função para tocar som de notificação
    const tocarSomNotificacao = () => {
        try {
            // Criar contexto de áudio
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Criar oscilador para beep
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 880; // Nota A5
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            
            oscillator.start();
            
            // Sequência de beeps
            setTimeout(() => { oscillator.frequency.value = 1047; }, 150); // C6
            setTimeout(() => { oscillator.frequency.value = 1319; }, 300); // E6
            setTimeout(() => { oscillator.stop(); audioContext.close(); }, 500);
            
        } catch (e) {
            console.log('⚠️ Não foi possível tocar som:', e);
        }
    };
    
    // Função para mostrar notificação do sistema
    const mostrarNotificacaoSistema = async (titulo, corpo) => {
        if (!('Notification' in window)) return;
        
        if (Notification.permission === 'granted') {
            new Notification(titulo, {
                body: corpo,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-72.png',
                vibrate: [200, 100, 200],
                tag: 'tutts-fila',
                renotify: true
            });
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                new Notification(titulo, { body: corpo, icon: '/icons/icon-192.png' });
            }
        }
    };
    
    // Solicitar permissão de notificação ao montar
    React.useEffect(() => {
        if (!isAdmin && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);
    
    // Conectar WebSocket ao montar (apenas para motoboys)
    React.useEffect(() => {
        if (!isAdmin && apiUrl) {
            // Pequeno delay para garantir que tudo está montado
            const timer = setTimeout(() => {
                conectarWebSocket();
            }, 1000);
            return () => {
                clearTimeout(timer);
                if (wsRef.current) {
                    wsRef.current.close(1000, 'Componente desmontado');
                }
            };
        }
    }, [apiUrl]);

    // BUSCA ENDEREÇO GOOGLE
    const buscarEndereco = async (endereco) => {
        if (!endereco || endereco.length < 5) { setEnderecoValidado(false); setCoordenadasEncontradas(null); return; }
        setBuscandoEndereco(true);
        try {
            const response = await fetch(`${apiUrl}/geocode/google?endereco=${encodeURIComponent(endereco)}`);
            const data = await response.json();
            const resultado = data.results && data.results[0];
            if (resultado && resultado.latitude && resultado.longitude) {
                setCoordenadasEncontradas({ latitude: resultado.latitude, longitude: resultado.longitude, enderecoFormatado: resultado.endereco || endereco });
                setEnderecoValidado(true);
                showToast('📍 Endereço encontrado!', 'success');
            } else { setEnderecoValidado(false); setCoordenadasEncontradas(null); showToast('Endereço não encontrado', 'error'); }
        } catch (e) { setEnderecoValidado(false); setCoordenadasEncontradas(null); showToast('Erro ao buscar', 'error'); }
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
    const calcularDistanciaHaversine = (lat1, lon1, lat2, lon2) => {
        const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    // CARREGAMENTOS
    const carregarCentrais = async () => { try { const r = await fetchAuth(`${apiUrl}/filas/centrais`); const d = await r.json(); if(d.success){ setCentrais(d.centrais); if(d.centrais.length>0&&!centralSelecionada) setCentralSelecionada(d.centrais[0]); } } catch(e){} finally{ setLoading(false); } };
    const carregarFila = async (id) => { if(!id)return; try{ const r=await fetchAuth(`${apiUrl}/filas/centrais/${id}/fila`); const d=await r.json(); if(d.success) setFilaAtual(d); }catch(e){} };
    const carregarVinculos = async (id) => { if(!id)return; try{ const r=await fetchAuth(`${apiUrl}/filas/centrais/${id}/vinculos`); const d=await r.json(); if(d.success) setVinculos(d.vinculos); }catch(e){} };
    const carregarMinhaCentral = async () => { try{ const r=await fetchAuth(`${apiUrl}/filas/minha-central`); const d=await r.json(); if(d.success){ if(d.vinculado){ setMinhaCentral(d.central); setMinhaPosicao(d.posicao_atual); }else{ setMinhaCentral(null); } } }catch(e){} finally{ setLoading(false); } };
    const carregarMinhaPosicao = async () => { try{ const r=await fetchAuth(`${apiUrl}/filas/minha-posicao`); const d=await r.json(); if(d.success) setMinhaPosicao(d); }catch(e){} };
    const carregarEstatisticas = async (id) => { if(!id)return; try{ const r=await fetchAuth(`${apiUrl}/filas/estatisticas/${id}?data=${filtroData}`); const d=await r.json(); if(d.success) setEstatisticas(d); }catch(e){} };
    const carregarHistorico = async (id) => { if(!id)return; try{ const r=await fetchAuth(`${apiUrl}/filas/historico/${id}?data_inicio=${filtroData}&data_fim=${filtroData}`); const d=await r.json(); if(d.success) setHistorico(d.historico); }catch(e){} };
    const carregarProfissionais = async () => { try{ const r=await fetchAuth(`${apiUrl}/users`); const d=await r.json(); if(Array.isArray(d)) setProfissionaisDisponiveis(d.filter(u=>u.role==='user')); }catch(e){} };

    // AÇÕES ADMIN
    const salvarCentral = async (dados) => { try{ const m=dados.id?'PUT':'POST'; const u=dados.id?`${apiUrl}/filas/centrais/${dados.id}`:`${apiUrl}/filas/centrais`; const r=await fetchAuth(u,{method:m,body:JSON.stringify(dados)}); const d=await r.json(); if(d.success){ showToast(dados.id?'Atualizada!':'Criada!','success'); setModalCentral(null); setEnderecoValidado(false); setCoordenadasEncontradas(null); carregarCentrais(); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro ao salvar','error'); } };
    const vincularProfissional = async (cod,nome) => { if(!centralSelecionada)return; try{ const r=await fetchAuth(`${apiUrl}/filas/vinculos`,{method:'POST',body:JSON.stringify({central_id:centralSelecionada.id,cod_profissional:cod,nome_profissional:nome})}); const d=await r.json(); if(d.success){ showToast('Vinculado!','success'); carregarCentrais(); carregarVinculos(centralSelecionada.id); }else{ showToast(d.error||'Erro','error'); } }catch(e){ showToast('Erro','error'); } };
    const desvincularProfissional = async (cod) => { if(!window.confirm('Desvincular?'))return; try{ const r=await fetchAuth(`${apiUrl}/filas/vinculos/${cod}`,{method:'DELETE'}); const d=await r.json(); if(d.success){ showToast('Desvinculado!','success'); carregarCentrais(); carregarFila(centralSelecionada?.id); carregarVinculos(centralSelecionada?.id); } }catch(e){ showToast('Erro','error'); } };
    
    // ===== AÇÃO: Enviar para Rota (com notificação) =====
    const enviarParaRota = async (cod) => { 
        if(!centralSelecionada)return; 
        try{ 
            const r=await fetchAuth(`${apiUrl}/filas/enviar-rota`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); 
            const d=await r.json(); 
            if(d.success){ 
                showToast(`🚀 Enviado! (${d.tempo_espera} min espera)`,'success'); 
                carregarFila(centralSelecionada.id); 
            }else{ 
                showToast(d.error||'Erro','error'); 
            } 
        }catch(e){ showToast('Erro','error'); } 
    };
    
    // ===== NOVA AÇÃO: Enviar para Rota Única =====
    const enviarParaRotaUnica = async (cod) => { 
        if(!centralSelecionada)return; 
        if(!window.confirm('⚠️ Confirma enviar como CORRIDA ÚNICA?\n\nO motoboy receberá bônus e terá prioridade no retorno.')) return;
        try{ 
            const r=await fetchAuth(`${apiUrl}/filas/enviar-rota-unica`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); 
            const d=await r.json(); 
            if(d.success){ 
                showToast(`👑 Corrida Única enviada! Posição de retorno: ${d.posicao_retorno}º`,'success'); 
                carregarFila(centralSelecionada.id); 
            }else{ 
                showToast(d.error||'Erro','error'); 
            } 
        }catch(e){ showToast('Erro','error'); } 
    };
    
    // ===== NOVA AÇÃO: Mover para Último =====
    const moverParaUltimo = async (cod) => { 
        if(!centralSelecionada)return; 
        if(!window.confirm('⚠️ Confirma mover para o FINAL da fila?\n\nO motoboy recusou o roteiro.')) return;
        try{ 
            const r=await fetchAuth(`${apiUrl}/filas/mover-ultimo`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id})}); 
            const d=await r.json(); 
            if(d.success){ 
                showToast(`📍 Movido da ${d.posicao_anterior}ª para ${d.posicao_nova}ª posição`,'warning'); 
                carregarFila(centralSelecionada.id); 
            }else{ 
                showToast(d.error||'Erro','error'); 
            } 
        }catch(e){ showToast('Erro','error'); } 
    };
    
    const removerDaFila = async (cod) => { const obs=window.prompt('Motivo (opcional):'); if(obs===null)return; try{ const r=await fetchAuth(`${apiUrl}/filas/remover`,{method:'POST',body:JSON.stringify({cod_profissional:cod,central_id:centralSelecionada.id,observacao:obs})}); const d=await r.json(); if(d.success){ showToast('Removido!','success'); carregarFila(centralSelecionada.id); } }catch(e){ showToast('Erro','error'); } };

    // AÇÕES USER
    const entrarNaFila = async () => { 
        if(!minhaLocalizacao){ showToast('Aguarde GPS','error'); solicitarGPS(); return; } 
        try{ 
            const r=await fetchAuth(`${apiUrl}/filas/entrar`,{method:'POST',body:JSON.stringify({latitude:minhaLocalizacao.latitude,longitude:minhaLocalizacao.longitude})}); 
            const d=await r.json(); 
            if(d.success){ 
                showToast(d.prioridade ? `👑 Entrou com prioridade! Posição: ${d.posicao}` : `Entrou! Posição: ${d.posicao}`,'success'); 
                carregarMinhaPosicao(); 
            }else{ 
                showToast(d.mensagem||d.error||'Erro','error'); 
            } 
        }catch(e){ showToast('Erro','error'); } 
    };
    const sairDaFila = async () => { if(!window.confirm('Sair da fila?'))return; try{ const r=await fetchAuth(`${apiUrl}/filas/sair`,{method:'POST'}); const d=await r.json(); if(d.success){ showToast('Saiu!','success'); carregarMinhaPosicao(); } }catch(e){ showToast('Erro','error'); } };

    // EFFECTS
    React.useEffect(() => { if(isAdmin){ carregarCentrais(); carregarProfissionais(); }else{ carregarMinhaCentral(); solicitarGPS(); } }, []);
    React.useEffect(() => { if(!isAdmin||!centralSelecionada)return; carregarFila(centralSelecionada.id); carregarVinculos(centralSelecionada.id); const i=setInterval(()=>carregarFila(centralSelecionada.id),5000); return()=>clearInterval(i); }, [centralSelecionada]);
    React.useEffect(() => { if(isAdmin||!minhaCentral)return; carregarMinhaPosicao(); const i=setInterval(()=>{carregarMinhaPosicao();solicitarGPS();},10000); return()=>clearInterval(i); }, [minhaCentral]);
    React.useEffect(() => { if(abaAtiva==='relatorios'&&centralSelecionada){ carregarEstatisticas(centralSelecionada.id); carregarHistorico(centralSelecionada.id); } }, [abaAtiva,centralSelecionada,filtroData]);
    React.useEffect(() => { if(minhaLocalizacao&&minhaCentral?.latitude&&minhaCentral?.longitude){ setDistanciaCentral(Math.round(calcularDistanciaHaversine(minhaLocalizacao.latitude,minhaLocalizacao.longitude,parseFloat(minhaCentral.latitude),parseFloat(minhaCentral.longitude)))); } }, [minhaLocalizacao,minhaCentral]);
    React.useEffect(() => { if(modalCentral){ if(modalCentral.id){ setEnderecoValidado(true); setCoordenadasEncontradas({latitude:modalCentral.latitude,longitude:modalCentral.longitude,enderecoFormatado:modalCentral.endereco}); }else{ setEnderecoValidado(false); setCoordenadasEncontradas(null); } } }, [modalCentral]);

    const formatarTempo = (m) => { if(!m)return'0 min'; if(m<60)return`${Math.round(m)} min`; return`${Math.floor(m/60)}h ${Math.round(m%60)}min`; };
    const formatarHora = (d) => d?new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'-';

    // ==================== RENDERIZAÇÃO ADMIN ====================
    if (isAdmin) {
        return React.createElement('div', { className: 'space-y-6' },
            // HEADER
            React.createElement('div', { className: 'bg-white rounded-xl shadow p-4' },
                React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-4' },
                    React.createElement('div', { className: 'flex items-center gap-3' },
                        React.createElement('span', { className: 'text-2xl' }, '👥'),
                        React.createElement('div', null, 
                            React.createElement('h1', { className: 'text-xl font-bold text-gray-800' }, 'Gestão de Filas'), 
                            React.createElement('p', { className: 'text-sm text-gray-500' }, 'Centrais e profissionais')
                        )
                    ),
                    React.createElement('div', { className: 'flex items-center gap-3' },
                        React.createElement('select', { 
                            value: centralSelecionada?.id || '', 
                            onChange: (e) => setCentralSelecionada(centrais.find(c => c.id === parseInt(e.target.value))), 
                            className: 'px-4 py-2 border rounded-lg font-medium' 
                        },
                            React.createElement('option', { value: '' }, 'Selecione uma central'),
                            centrais.map(c => React.createElement('option', { key: c.id, value: c.id }, `${c.nome} (${c.na_fila || 0} na fila)`))
                        ),
                        React.createElement('button', { 
                            onClick: () => setModalCentral({}), 
                            className: 'px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700' 
                        }, '➕ Nova Central')
                    )
                )
            ),
            // TABS E CONTEÚDO
            React.createElement('div', { className: 'bg-white rounded-xl shadow' },
                // TABS
                React.createElement('div', { className: 'border-b flex gap-1 p-2' },
                    ['monitoramento', 'vinculos', 'relatorios', 'config'].map(aba => 
                        React.createElement('button', { 
                            key: aba, 
                            onClick: () => onChangeTab(aba), 
                            className: `px-4 py-2 rounded-lg font-medium transition-all ${abaAtiva === aba ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:bg-gray-100'}` 
                        }, aba === 'monitoramento' ? '📊 Monitoramento' : aba === 'vinculos' ? '👥 Vínculos' : aba === 'relatorios' ? '📈 Relatórios' : '⚙️ Configurações')
                    )
                ),
                // CONTEÚDO DAS TABS
                React.createElement('div', { className: 'p-6' },
                    // ==================== MONITORAMENTO ====================
                    abaAtiva === 'monitoramento' && centralSelecionada && React.createElement('div', { className: 'space-y-6' },
                        // CARDS DE ESTATÍSTICAS
                        React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
                            React.createElement('div', { className: 'bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white' }, 
                                React.createElement('div', { className: 'text-3xl mb-1' }, '⏳'), 
                                React.createElement('div', { className: 'text-2xl font-bold' }, filaAtual.total_aguardando || 0), 
                                React.createElement('div', { className: 'text-sm opacity-80' }, 'Aguardando')
                            ),
                            React.createElement('div', { className: 'bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white' }, 
                                React.createElement('div', { className: 'text-3xl mb-1' }, '🏍️'), 
                                React.createElement('div', { className: 'text-2xl font-bold' }, filaAtual.total_em_rota || 0), 
                                React.createElement('div', { className: 'text-sm opacity-80' }, 'Em Rota')
                            ),
                            React.createElement('div', { className: `bg-gradient-to-br ${filaAtual.alertas?.length > 0 ? 'from-red-500 to-red-600 animate-pulse' : 'from-gray-400 to-gray-500'} rounded-xl p-4 text-white` }, 
                                React.createElement('div', { className: 'text-3xl mb-1' }, '🚨'), 
                                React.createElement('div', { className: 'text-2xl font-bold' }, filaAtual.alertas?.length || 0), 
                                React.createElement('div', { className: 'text-sm opacity-80' }, 'Alertas (+90min)')
                            ),
                            React.createElement('div', { className: 'bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white' }, 
                                React.createElement('div', { className: 'text-3xl mb-1' }, '📍'), 
                                React.createElement('div', { className: 'text-2xl font-bold' }, centralSelecionada.total_vinculados || 0), 
                                React.createElement('div', { className: 'text-sm opacity-80' }, 'Vinculados')
                            )
                        ),
                        // ALERTAS
                        filaAtual.alertas?.length > 0 && React.createElement('div', { className: 'bg-red-50 border-2 border-red-400 rounded-xl p-4 animate-pulse' },
                            React.createElement('div', { className: 'flex items-center gap-3 mb-3' }, 
                                React.createElement('span', { className: 'text-3xl' }, '🚨'), 
                                React.createElement('div', null, 
                                    React.createElement('p', { className: 'text-red-800 font-bold text-lg' }, `ATENÇÃO: ${filaAtual.alertas.length} profissional(is) não retornou!`), 
                                    React.createElement('p', { className: 'text-red-600 text-sm' }, 'Tempo em rota > 1h30min')
                                )
                            ),
                            React.createElement('div', { className: 'grid md:grid-cols-2 gap-2' }, 
                                filaAtual.alertas.map(p => 
                                    React.createElement('div', { key: p.cod_profissional, className: 'bg-white border border-red-300 rounded-lg p-3 flex justify-between items-center' }, 
                                        React.createElement('div', null, 
                                            React.createElement('p', { className: 'font-bold' }, p.nome_profissional), 
                                            React.createElement('p', { className: 'text-sm text-red-600' }, `⏱️ ${formatarTempo(p.minutos_em_rota)} em rota`)
                                        ), 
                                        React.createElement('button', { onClick: () => removerDaFila(p.cod_profissional), className: 'px-3 py-1 bg-red-600 text-white rounded-lg text-sm' }, '❌')
                                    )
                                )
                            )
                        ),
                        // FILA DE ESPERA E EM ROTA
                        React.createElement('div', { className: 'grid md:grid-cols-2 gap-6' },
                            // ===== FILA DE ESPERA =====
                            React.createElement('div', { className: 'bg-blue-50 rounded-xl p-4 border border-blue-200' },
                                React.createElement('h3', { className: 'font-bold text-blue-800 mb-4' }, '⏳ Fila de Espera'),
                                filaAtual.aguardando?.length === 0 ? 
                                    React.createElement('div', { className: 'text-center py-8 text-gray-500' }, '📭 Nenhum na fila') :
                                    React.createElement('div', { className: 'space-y-2' }, 
                                        filaAtual.aguardando.map((p, i) => 
                                            React.createElement('div', { 
                                                key: p.cod_profissional, 
                                                className: `bg-white rounded-lg p-3 border flex items-center justify-between ${p.retornou_corrida_unica ? 'border-yellow-400 bg-yellow-50' : ''}`
                                            },
                                                React.createElement('div', { className: 'flex items-center gap-3' }, 
                                                    // Posição com indicador especial
                                                    React.createElement('div', { className: 'relative' },
                                                        React.createElement('span', { 
                                                            className: `w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}` 
                                                        }, p.posicao),
                                                        // ===== COROA PARA QUEM VOLTOU DE CORRIDA ÚNICA =====
                                                        p.retornou_corrida_unica && React.createElement('span', { 
                                                            className: 'absolute -top-2 -right-2 text-lg',
                                                            title: 'Rota anterior com único pedido'
                                                        }, '👑')
                                                    ),
                                                    React.createElement('div', null, 
                                                        React.createElement('p', { className: 'font-medium flex items-center gap-1' }, 
                                                            p.nome_profissional,
                                                            // Tag de retorno prioritário
                                                            p.retornou_corrida_unica && React.createElement('span', { 
                                                                className: 'text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full ml-1'
                                                            }, 'Prioridade')
                                                        ), 
                                                        React.createElement('p', { className: 'text-xs text-gray-500' }, `#${p.cod_profissional} • ⏱️ ${formatarTempo(p.minutos_esperando)}`)
                                                    )
                                                ),
                                                // ===== 4 BOTÕES DE AÇÃO =====
                                                React.createElement('div', { className: 'flex gap-1' }, 
                                                    // Botão Despachar Roteiro Normal
                                                    React.createElement('button', { 
                                                        onClick: () => enviarParaRota(p.cod_profissional), 
                                                        className: 'px-2 py-1 bg-green-600 text-white rounded-lg text-sm',
                                                        title: 'Despachar Roteiro'
                                                    }, '🚀'),
                                                    // Botão Despachar Corrida Única
                                                    React.createElement('button', { 
                                                        onClick: () => enviarParaRotaUnica(p.cod_profissional), 
                                                        className: 'px-2 py-1 bg-yellow-500 text-white rounded-lg text-sm',
                                                        title: 'Corrida Única (com bônus)'
                                                    }, '👑'),
                                                    // Botão Mover para Último
                                                    React.createElement('button', { 
                                                        onClick: () => moverParaUltimo(p.cod_profissional), 
                                                        className: 'px-2 py-1 bg-orange-500 text-white rounded-lg text-sm',
                                                        title: 'Mover para Último'
                                                    }, '⬇️'),
                                                    // Botão Remover
                                                    React.createElement('button', { 
                                                        onClick: () => removerDaFila(p.cod_profissional), 
                                                        className: 'px-2 py-1 bg-red-100 text-red-600 rounded-lg text-sm',
                                                        title: 'Remover da Fila'
                                                    }, '❌')
                                                )
                                            )
                                        )
                                    )
                            ),
                            // ===== EM ROTA =====
                            React.createElement('div', { className: 'bg-green-50 rounded-xl p-4 border border-green-200' },
                                React.createElement('h3', { className: 'font-bold text-green-800 mb-4' }, '🏍️ Em Rota'),
                                filaAtual.em_rota?.length === 0 ? 
                                    React.createElement('div', { className: 'text-center py-8 text-gray-500' }, '🏠 Nenhum em rota') :
                                    React.createElement('div', { className: 'space-y-2' }, 
                                        filaAtual.em_rota.map(p => 
                                            React.createElement('div', { 
                                                key: p.cod_profissional, 
                                                className: `bg-white rounded-lg p-3 border ${p.minutos_em_rota > 90 ? 'border-red-300 bg-red-50' : ''} ${p.corrida_unica ? 'border-yellow-400' : ''} flex items-center justify-between` 
                                            },
                                                React.createElement('div', { className: 'flex items-center gap-3' }, 
                                                    React.createElement('span', { className: 'text-2xl' }, p.corrida_unica ? '👑' : '🏍️'), 
                                                    React.createElement('div', null, 
                                                        React.createElement('p', { className: 'font-medium flex items-center gap-1' }, 
                                                            p.nome_profissional,
                                                            p.corrida_unica && React.createElement('span', { 
                                                                className: 'text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full'
                                                            }, 'Única')
                                                        ), 
                                                        React.createElement('p', { className: `text-xs ${p.minutos_em_rota > 90 ? 'text-red-600 font-bold' : 'text-gray-500'}` }, 
                                                            `⏱️ ${formatarTempo(p.minutos_em_rota)} em rota`
                                                        )
                                                    )
                                                ),
                                                React.createElement('button', { 
                                                    onClick: () => removerDaFila(p.cod_profissional), 
                                                    className: 'px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm' 
                                                }, '❌')
                                            )
                                        )
                                    )
                            )
                        ),
                        // ===== LEGENDA DOS BOTÕES =====
                        React.createElement('div', { className: 'bg-gray-50 rounded-lg p-3 border' },
                            React.createElement('p', { className: 'text-sm font-medium text-gray-700 mb-2' }, '📌 Legenda dos Botões:'),
                            React.createElement('div', { className: 'flex flex-wrap gap-4 text-xs text-gray-600' },
                                React.createElement('span', null, '🚀 Despachar Roteiro'),
                                React.createElement('span', null, '👑 Corrida Única (bônus + prioridade)'),
                                React.createElement('span', null, '⬇️ Mover para Último'),
                                React.createElement('span', null, '❌ Remover da Fila')
                            )
                        )
                    ),
                    // ==================== VÍNCULOS ====================
                    abaAtiva === 'vinculos' && centralSelecionada && React.createElement('div', { className: 'space-y-4' },
                        React.createElement('div', { className: 'flex justify-between items-center' }, 
                            React.createElement('h3', { className: 'font-bold text-lg' }, `Profissionais vinculados à ${centralSelecionada.nome}`), 
                            React.createElement('button', { onClick: () => setModalVinculo(true), className: 'px-4 py-2 bg-purple-600 text-white rounded-lg' }, '➕ Vincular')
                        ),
                        React.createElement('div', { className: 'bg-white rounded-lg border overflow-hidden' },
                            React.createElement('table', { className: 'w-full' },
                                React.createElement('thead', { className: 'bg-gray-50' }, 
                                    React.createElement('tr', null, 
                                        React.createElement('th', { className: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase' }, 'Código'), 
                                        React.createElement('th', { className: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase' }, 'Nome'), 
                                        React.createElement('th', { className: 'px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase' }, 'Status'), 
                                        React.createElement('th', { className: 'px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase' }, 'Ações')
                                    )
                                ),
                                React.createElement('tbody', { className: 'divide-y' }, 
                                    vinculos.length === 0 ? 
                                        React.createElement('tr', null, React.createElement('td', { colSpan: 4, className: 'px-4 py-8 text-center text-gray-500' }, 'Nenhum vinculado')) : 
                                        vinculos.map(p => 
                                            React.createElement('tr', { key: p.cod_profissional, className: 'hover:bg-gray-50' }, 
                                                React.createElement('td', { className: 'px-4 py-3 font-mono text-sm' }, p.cod_profissional), 
                                                React.createElement('td', { className: 'px-4 py-3 font-medium' }, p.nome_profissional), 
                                                React.createElement('td', { className: 'px-4 py-3 text-center' }, 
                                                    React.createElement('span', { 
                                                        className: `px-2 py-1 rounded-full text-xs font-medium ${p.status_fila === 'em_rota' ? 'bg-green-100 text-green-700' : p.status_fila === 'aguardando' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}` 
                                                    }, p.status_fila === 'em_rota' ? '🏍️ Em Rota' : p.status_fila === 'aguardando' ? '⏳ Na Fila' : '💤 Fora')
                                                ), 
                                                React.createElement('td', { className: 'px-4 py-3 text-center' }, 
                                                    React.createElement('button', { onClick: () => desvincularProfissional(p.cod_profissional), className: 'px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm' }, '🗑️')
                                                )
                                            )
                                        )
                                )
                            )
                        )
                    ),
                    // ==================== RELATÓRIOS ====================
                    abaAtiva === 'relatorios' && centralSelecionada && React.createElement('div', { className: 'space-y-6' },
                        // Filtro de data
                        React.createElement('div', { className: 'flex items-center gap-4' }, 
                            React.createElement('label', { className: 'font-medium' }, 'Data:'), 
                            React.createElement('input', { type: 'date', value: filtroData, onChange: (e) => setFiltroData(e.target.value), className: 'px-3 py-2 border rounded-lg' }), 
                            React.createElement('button', { onClick: () => { carregarEstatisticas(centralSelecionada.id); carregarHistorico(centralSelecionada.id); }, className: 'px-4 py-2 bg-purple-600 text-white rounded-lg' }, '🔍 Filtrar')
                        ),
                        // Cards de estatísticas
                        estatisticas && React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' }, 
                            React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' }, 
                                React.createElement('p', { className: 'text-sm text-gray-600' }, 'Total de Saídas'), 
                                React.createElement('p', { className: 'text-3xl font-bold text-purple-600' }, estatisticas.total_saidas)
                            ), 
                            React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' }, 
                                React.createElement('p', { className: 'text-sm text-gray-600' }, 'Tempo Médio Espera'), 
                                React.createElement('p', { className: 'text-3xl font-bold text-blue-600' }, `${estatisticas.tempo_medio_espera} min`)
                            )
                        ),
                        // Ranking
                        estatisticas?.ranking?.length > 0 && React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' }, 
                            React.createElement('h3', { className: 'font-bold text-lg mb-4' }, '🏆 Ranking'), 
                            React.createElement('div', { className: 'space-y-2' }, 
                                estatisticas.ranking.map((p, i) => 
                                    React.createElement('div', { key: p.cod_profissional, className: 'flex items-center justify-between p-3 bg-gray-50 rounded-lg' }, 
                                        React.createElement('div', { className: 'flex items-center gap-3' }, 
                                            React.createElement('span', { className: 'text-xl' }, i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`), 
                                            React.createElement('span', { className: 'font-medium' }, p.nome_profissional)
                                        ), 
                                        React.createElement('span', { className: 'font-bold text-purple-600' }, `${p.total_saidas} saídas`)
                                    )
                                )
                            )
                        ),
                        // Histórico
                        React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' }, 
                            React.createElement('h3', { className: 'font-bold text-lg mb-4' }, '📋 Histórico'), 
                            React.createElement('div', { className: 'overflow-x-auto' }, 
                                React.createElement('table', { className: 'w-full' }, 
                                    React.createElement('thead', { className: 'bg-gray-50' }, 
                                        React.createElement('tr', null, 
                                            React.createElement('th', { className: 'px-3 py-2 text-left text-xs font-medium text-gray-500' }, 'Hora'), 
                                            React.createElement('th', { className: 'px-3 py-2 text-left text-xs font-medium text-gray-500' }, 'Profissional'), 
                                            React.createElement('th', { className: 'px-3 py-2 text-center text-xs font-medium text-gray-500' }, 'Ação'), 
                                            React.createElement('th', { className: 'px-3 py-2 text-right text-xs font-medium text-gray-500' }, 'Tempo')
                                        )
                                    ), 
                                    React.createElement('tbody', { className: 'divide-y' }, 
                                        historico.map((h, i) => 
                                            React.createElement('tr', { key: i, className: 'hover:bg-gray-50' }, 
                                                React.createElement('td', { className: 'px-3 py-2 text-sm' }, formatarHora(h.created_at)), 
                                                React.createElement('td', { className: 'px-3 py-2 text-sm font-medium' }, h.nome_profissional), 
                                                React.createElement('td', { className: 'px-3 py-2 text-center' }, 
                                                    React.createElement('span', { 
                                                        className: `px-2 py-1 rounded-full text-xs font-medium ${
                                                            h.acao === 'entrada' ? 'bg-blue-100 text-blue-700' : 
                                                            h.acao === 'enviado_rota' ? 'bg-green-100 text-green-700' : 
                                                            h.acao === 'enviado_rota_unica' ? 'bg-yellow-100 text-yellow-700' : 
                                                            h.acao === 'retorno_prioridade' ? 'bg-yellow-100 text-yellow-700' : 
                                                            h.acao === 'movido_ultimo' ? 'bg-orange-100 text-orange-700' : 
                                                            'bg-gray-100 text-gray-700'
                                                        }` 
                                                    }, 
                                                        h.acao === 'entrada' ? '📥 Entrada' : 
                                                        h.acao === 'enviado_rota' ? '🚀 Enviado' : 
                                                        h.acao === 'enviado_rota_unica' ? '👑 Única' : 
                                                        h.acao === 'retorno' ? '🔄 Retorno' : 
                                                        h.acao === 'retorno_prioridade' ? '👑 Ret. Prior.' : 
                                                        h.acao === 'movido_ultimo' ? '⬇️ Mov. Último' : 
                                                        h.acao === 'removido' ? '❌ Removido' : 
                                                        '👋 Saiu'
                                                    )
                                                ), 
                                                React.createElement('td', { className: 'px-3 py-2 text-right text-sm text-gray-500' }, 
                                                    h.tempo_espera_minutos ? `${h.tempo_espera_minutos} min espera` : 
                                                    h.tempo_rota_minutos ? `${h.tempo_rota_minutos} min rota` : '-'
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    ),
                    // ==================== CONFIGURAÇÕES ====================
                    abaAtiva === 'config' && React.createElement('div', { className: 'space-y-4' },
                        React.createElement('h3', { className: 'font-bold text-lg' }, 'Centrais Cadastradas'),
                        React.createElement('div', { className: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' }, 
                            centrais.map(c => 
                                React.createElement('div', { key: c.id, className: `bg-white rounded-xl p-4 shadow border ${c.ativa ? 'border-green-200' : 'border-red-200 opacity-60'}` },
                                    React.createElement('div', { className: 'flex justify-between items-start mb-3' }, 
                                        React.createElement('div', null, 
                                            React.createElement('h4', { className: 'font-bold text-gray-800' }, c.nome), 
                                            React.createElement('p', { className: 'text-sm text-gray-500' }, c.endereco)
                                        ), 
                                        React.createElement('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${c.ativa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}` }, c.ativa ? 'Ativa' : 'Inativa')
                                    ),
                                    React.createElement('div', { className: 'text-sm text-gray-600 mb-3' }, 
                                        React.createElement('p', null, `📍 Lat: ${parseFloat(c.latitude).toFixed(6)}`), 
                                        React.createElement('p', null, `📍 Lng: ${parseFloat(c.longitude).toFixed(6)}`), 
                                        React.createElement('p', null, `📏 Raio: ${c.raio_metros}m`)
                                    ),
                                    React.createElement('div', { className: 'flex gap-2' }, 
                                        React.createElement('button', { onClick: () => setModalCentral(c), className: 'flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium' }, '✏️ Editar'), 
                                        React.createElement('button', { 
                                            onClick: async () => { 
                                                if (!window.confirm('Excluir?')) return; 
                                                try { 
                                                    const r = await fetchAuth(`${apiUrl}/filas/centrais/${c.id}`, { method: 'DELETE' }); 
                                                    const d = await r.json(); 
                                                    if (d.success) { showToast('Excluída!', 'success'); carregarCentrais(); } 
                                                    else showToast(d.error, 'error'); 
                                                } catch (e) { showToast('Erro', 'error'); } 
                                            }, 
                                            className: 'px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium' 
                                        }, '🗑️')
                                    )
                                )
                            )
                        )
                    ),
                    // Placeholder quando nenhuma central selecionada
                    !centralSelecionada && abaAtiva !== 'config' && React.createElement('div', { className: 'text-center py-12 text-gray-500' }, 
                        React.createElement('span', { className: 'text-5xl block mb-4' }, '👆'), 
                        React.createElement('p', { className: 'text-lg' }, 'Selecione uma central')
                    )
                )
            ),
            // ==================== MODAL CRIAR/EDITAR CENTRAL ====================
            modalCentral && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
                React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto' },
                    React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-2xl text-white' }, 
                        React.createElement('h2', { className: 'text-xl font-bold' }, modalCentral.id ? '✏️ Editar Central' : '➕ Nova Central'), 
                        React.createElement('p', { className: 'text-purple-200 text-sm' }, 'Digite o endereço para buscar coordenadas')
                    ),
                    React.createElement('form', { 
                        className: 'p-6 space-y-4', 
                        onSubmit: (e) => { 
                            e.preventDefault(); 
                            if (!enderecoValidado && !modalCentral.id) { showToast('Busque o endereço primeiro', 'error'); return; } 
                            const fd = new FormData(e.target); 
                            salvarCentral({ 
                                id: modalCentral.id, 
                                nome: fd.get('nome'), 
                                endereco: coordenadasEncontradas?.enderecoFormatado || fd.get('endereco'), 
                                latitude: coordenadasEncontradas?.latitude || modalCentral.latitude, 
                                longitude: coordenadasEncontradas?.longitude || modalCentral.longitude, 
                                raio_metros: parseInt(fd.get('raio_metros')), 
                                ativa: fd.get('ativa') === 'on' 
                            }); 
                        } 
                    },
                        React.createElement('div', null, 
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Nome da Central *'), 
                            React.createElement('input', { name: 'nome', defaultValue: modalCentral.nome || '', required: true, className: 'w-full px-3 py-2 border rounded-lg', placeholder: 'Ex: Fila Comando' })
                        ),
                        React.createElement('div', null, 
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '📍 Endereço * (digite e aguarde)'), 
                            React.createElement('div', { className: 'relative' }, 
                                React.createElement('input', { 
                                    name: 'endereco', 
                                    defaultValue: modalCentral.endereco || '', 
                                    required: true, 
                                    className: `w-full px-3 py-2 border rounded-lg pr-10 ${enderecoValidado ? 'border-green-500 bg-green-50' : ''}`, 
                                    placeholder: 'Rua, número, cidade', 
                                    onChange: (e) => buscarEnderecoDebounced(e.target.value) 
                                }), 
                                React.createElement('span', { className: 'absolute right-3 top-2.5 text-xl' }, buscandoEndereco ? '⏳' : enderecoValidado ? '✅' : '🔍')
                            ), 
                            buscandoEndereco && React.createElement('p', { className: 'text-sm text-blue-600 mt-1' }, '🔍 Buscando no Google...')
                        ),
                        coordenadasEncontradas && React.createElement('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-4' }, 
                            React.createElement('p', { className: 'text-sm font-medium text-green-800 mb-2' }, '✅ Coordenadas encontradas:'), 
                            React.createElement('div', { className: 'grid grid-cols-2 gap-4' }, 
                                React.createElement('div', null, 
                                    React.createElement('label', { className: 'block text-xs text-green-600' }, 'Latitude'), 
                                    React.createElement('p', { className: 'font-mono text-sm' }, coordenadasEncontradas.latitude?.toFixed?.(8) || coordenadasEncontradas.latitude)
                                ), 
                                React.createElement('div', null, 
                                    React.createElement('label', { className: 'block text-xs text-green-600' }, 'Longitude'), 
                                    React.createElement('p', { className: 'font-mono text-sm' }, coordenadasEncontradas.longitude?.toFixed?.(8) || coordenadasEncontradas.longitude)
                                )
                            ), 
                            coordenadasEncontradas.enderecoFormatado && React.createElement('p', { className: 'text-xs text-green-700 mt-2' }, '📍 ', coordenadasEncontradas.enderecoFormatado)
                        ),
                        React.createElement('div', null, 
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Raio de check-in (metros)'), 
                            React.createElement('input', { name: 'raio_metros', type: 'number', defaultValue: modalCentral.raio_metros || 900, required: true, className: 'w-full px-3 py-2 border rounded-lg' }), 
                            React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, 'Distância máxima para check-in')
                        ),
                        modalCentral.id && React.createElement('div', { className: 'flex items-center gap-2' }, 
                            React.createElement('input', { name: 'ativa', type: 'checkbox', defaultChecked: modalCentral.ativa !== false, className: 'w-4 h-4' }), 
                            React.createElement('label', { className: 'text-sm font-medium text-gray-700' }, 'Central ativa')
                        ),
                        React.createElement('div', { className: 'flex gap-3 pt-4' }, 
                            React.createElement('button', { 
                                type: 'button', 
                                onClick: () => { setModalCentral(null); setEnderecoValidado(false); setCoordenadasEncontradas(null); }, 
                                className: 'flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium' 
                            }, 'Cancelar'), 
                            React.createElement('button', { 
                                type: 'submit', 
                                disabled: !enderecoValidado && !modalCentral.id, 
                                className: `flex-1 px-4 py-2 rounded-lg font-medium ${(!enderecoValidado && !modalCentral.id) ? 'bg-gray-300 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'}` 
                            }, '💾 Salvar')
                        )
                    )
                )
            ),
            // ==================== MODAL VINCULAR PROFISSIONAL ====================
            modalVinculo && centralSelecionada && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
                React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden' },
                    React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white' }, 
                        React.createElement('h2', { className: 'text-xl font-bold' }, '👥 Vincular Profissional'), 
                        React.createElement('p', { className: 'text-purple-200 text-sm' }, `à ${centralSelecionada.nome}`)
                    ),
                    React.createElement('div', { className: 'p-4 overflow-y-auto max-h-[60vh]' }, 
                        React.createElement('input', { 
                            type: 'text', 
                            placeholder: '🔍 Buscar...', 
                            className: 'w-full px-3 py-2 border rounded-lg mb-4', 
                            onChange: (e) => { 
                                const s = e.target.value.toLowerCase(); 
                                document.querySelectorAll('.prof-item').forEach(el => { 
                                    el.style.display = el.textContent.toLowerCase().includes(s) ? '' : 'none'; 
                                }); 
                            } 
                        }), 
                        React.createElement('div', { className: 'space-y-2' }, 
                            profissionaisDisponiveis.map(p => 
                                React.createElement('div', { key: p.cod_profissional, className: 'prof-item flex items-center justify-between p-3 bg-gray-50 rounded-lg' }, 
                                    React.createElement('div', null, 
                                        React.createElement('p', { className: 'font-medium' }, p.full_name), 
                                        React.createElement('p', { className: 'text-xs text-gray-500' }, `#${p.cod_profissional}`)
                                    ), 
                                    React.createElement('button', { 
                                        onClick: () => { vincularProfissional(p.cod_profissional, p.full_name); setModalVinculo(false); }, 
                                        className: 'px-3 py-1 bg-purple-600 text-white rounded-lg text-sm' 
                                    }, '➕')
                                )
                            )
                        )
                    ),
                    React.createElement('div', { className: 'p-4 border-t' }, 
                        React.createElement('button', { onClick: () => setModalVinculo(false), className: 'w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium' }, 'Fechar')
                    )
                )
            )
        );
    }

    // ==================== RENDERIZAÇÃO USER (MOTOBOY) ====================
    if (loading) return React.createElement('div', { className: 'flex items-center justify-center min-h-[400px]' }, 
        React.createElement('div', { className: 'text-center' }, 
            React.createElement('div', { className: 'w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4' }), 
            React.createElement('p', { className: 'text-gray-600' }, 'Carregando...')
        )
    );
    
    if (!minhaCentral) return React.createElement('div', { className: 'min-h-[400px] flex items-center justify-center' }, 
        React.createElement('div', { className: 'text-center bg-white rounded-2xl shadow-lg p-8 max-w-md mx-4' }, 
            React.createElement('span', { className: 'text-6xl block mb-4' }, '🚫'), 
            React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-2' }, 'Sem Acesso à Fila'), 
            React.createElement('p', { className: 'text-gray-600' }, 'Você não está vinculado a nenhuma central.'), 
            React.createElement('p', { className: 'text-gray-500 text-sm mt-2' }, 'Contate um administrador.')
        )
    );
    
    const podeChekin = gpsStatus === 'permitido' && (distanciaCentral === null || distanciaCentral <= minhaCentral.raio_metros);
    
    return React.createElement('div', { className: 'max-w-lg mx-auto p-4 space-y-6' },
        // HEADER COM INFO DA CENTRAL
        React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white shadow-lg' },
            React.createElement('div', { className: 'flex items-center gap-3 mb-2' }, 
                React.createElement('span', { className: 'text-2xl' }, '📍'), 
                React.createElement('div', null, 
                    React.createElement('h1', { className: 'text-lg font-bold' }, minhaCentral.central_nome), 
                    React.createElement('p', { className: 'text-purple-200 text-xs' }, minhaCentral.endereco)
                )
            ),
            // Status do GPS
            React.createElement('div', { className: `flex items-center gap-2 p-2 rounded-lg ${gpsStatus === 'permitido' ? 'bg-green-500/20' : gpsStatus === 'negado' ? 'bg-red-500/20' : 'bg-yellow-500/20'}` },
                React.createElement('span', { className: 'text-lg' }, gpsStatus === 'permitido' ? '📡' : gpsStatus === 'negado' ? '🚫' : '⏳'),
                React.createElement('div', { className: 'flex-1' }, 
                    React.createElement('p', { className: 'font-medium text-xs' }, gpsStatus === 'permitido' ? 'GPS Ativo' : gpsStatus === 'negado' ? 'GPS Bloqueado' : 'Verificando GPS...'), 
                    distanciaCentral !== null && gpsStatus === 'permitido' && React.createElement('p', { className: `text-xs ${distanciaCentral <= minhaCentral.raio_metros ? 'text-green-200' : 'text-red-200'}` }, `Você está a ${distanciaCentral}m (máx ${minhaCentral.raio_metros}m)`)
                ),
                gpsStatus === 'negado' && React.createElement('button', { onClick: solicitarGPS, className: 'px-2 py-1 bg-white/20 rounded-lg text-xs' }, 'Tentar')
            ),
            // ===== INDICADOR DE CONEXÃO WEBSOCKET =====
            React.createElement('div', { 
                className: `flex items-center gap-2 mt-2 p-2 rounded-lg cursor-pointer ${wsConectado ? 'bg-green-500/20' : 'bg-orange-500/20'}`,
                onClick: () => {
                    if (!wsConectado) {
                        console.log('🔄 [Filas] Reconectando manualmente...');
                        conectarWebSocket();
                    }
                }
            },
                React.createElement('span', { className: 'text-sm' }, wsConectado ? '🔔' : '🔕'),
                React.createElement('p', { className: 'text-xs' }, 
                    wsConectado ? 'Notificações ativas' : 'Toque para reconectar'
                )
            )
        ),
        // CONTEÚDO PRINCIPAL
        gpsStatus === 'negado' ? 
            React.createElement('div', { className: 'bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center' }, 
                React.createElement('span', { className: 'text-5xl block mb-4' }, '📍'), 
                React.createElement('h2', { className: 'text-lg font-bold text-red-800 mb-2' }, 'GPS Necessário'), 
                React.createElement('p', { className: 'text-red-600 mb-4' }, 'Permita acesso à localização.'), 
                React.createElement('button', { onClick: solicitarGPS, className: 'px-6 py-3 bg-red-600 text-white rounded-xl font-bold' }, '🔓 Permitir')
            ) :
        React.createElement(React.Fragment, null,
            // ===== EM ROTA =====
            minhaPosicao?.status === 'em_rota' && React.createElement('div', { className: `border-2 rounded-2xl p-6 ${minhaPosicao.corrida_unica ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}` },
                React.createElement('div', { className: 'flex items-center gap-4 mb-4' }, 
                    React.createElement('span', { className: 'text-5xl' }, minhaPosicao.corrida_unica ? '👑' : '🏍️'), 
                    React.createElement('div', null, 
                        React.createElement('h2', { className: `text-xl font-bold ${minhaPosicao.corrida_unica ? 'text-yellow-800' : 'text-green-800'}` }, 
                            minhaPosicao.corrida_unica ? 'Corrida Única!' : 'Você está em Rota!'
                        ), 
                        React.createElement('p', { className: minhaPosicao.corrida_unica ? 'text-yellow-600' : 'text-green-600' }, 
                            `⏱️ ${formatarTempo(minhaPosicao.minutos_em_rota)} em serviço`
                        ),
                        // Aviso de prioridade no retorno
                        minhaPosicao.corrida_unica && React.createElement('p', { className: 'text-yellow-700 text-sm mt-1 font-medium' }, 
                            '✨ Você terá prioridade ao retornar!'
                        )
                    )
                ),
                React.createElement('button', { 
                    onClick: entrarNaFila, 
                    disabled: !podeChekin, 
                    className: `w-full py-4 rounded-xl font-bold text-lg ${!podeChekin ? 'bg-gray-300 text-gray-500' : minhaPosicao.corrida_unica ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-green-600 text-white hover:bg-green-700'}` 
                }, minhaPosicao.corrida_unica ? '👑 Retornar com Prioridade' : '🔄 Retornar para a Fila')
            ),
            // ===== AGUARDANDO NA FILA =====
            minhaPosicao?.status === 'aguardando' && React.createElement('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-6' },
                React.createElement('div', { className: 'text-center mb-6' }, 
                    React.createElement('p', { className: 'text-blue-600 text-sm mb-2' }, 'Sua posição na fila'), 
                    React.createElement('div', { className: 'text-6xl font-bold text-blue-800 mb-2' }, minhaPosicao.minha_posicao), 
                    React.createElement('p', { className: 'text-blue-600' }, `de ${minhaPosicao.total_na_fila} • ⏱️ ${formatarTempo(minhaPosicao.minutos_esperando)}`)
                ),
                // Lista de quem está na frente e atrás
                (minhaPosicao.na_frente?.length > 0 || minhaPosicao.atras?.length > 0) && React.createElement('div', { className: 'space-y-2 mb-6' },
                    minhaPosicao.na_frente?.map(p => 
                        React.createElement('div', { key: p.cod_profissional, className: 'flex items-center gap-2 p-2 bg-white/50 rounded-lg' }, 
                            React.createElement('span', { className: 'w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold' }, p.posicao), 
                            React.createElement('span', { className: 'text-sm' }, p.nome_profissional),
                            p.retornou_corrida_unica && React.createElement('span', { className: 'text-sm' }, '👑')
                        )
                    ),
                    // Minha posição destacada
                    React.createElement('div', { className: 'flex items-center gap-2 p-3 bg-purple-100 rounded-lg border-2 border-purple-300' }, 
                        React.createElement('span', { className: 'w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold' }, minhaPosicao.minha_posicao), 
                        React.createElement('span', { className: 'font-bold text-purple-800' }, 'Você')
                    ),
                    minhaPosicao.atras?.map(p => 
                        React.createElement('div', { key: p.cod_profissional, className: 'flex items-center gap-2 p-2 bg-white/50 rounded-lg' }, 
                            React.createElement('span', { className: 'w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold' }, p.posicao), 
                            React.createElement('span', { className: 'text-sm' }, p.nome_profissional),
                            p.retornou_corrida_unica && React.createElement('span', { className: 'text-sm' }, '👑')
                        )
                    )
                ),
                React.createElement('button', { onClick: sairDaFila, className: 'w-full py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200' }, '👋 Sair da Fila')
            ),
            // ===== NÃO ESTÁ NA FILA =====
            !minhaPosicao?.na_fila && React.createElement('div', { className: 'bg-white rounded-2xl shadow-lg p-6' },
                React.createElement('div', { className: 'text-center mb-6' }, 
                    React.createElement('span', { className: 'text-6xl block mb-4' }, '🏁'), 
                    React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, 'Pronto para coletar pedidos?'), 
                    React.createElement('p', { className: 'text-gray-600' }, 'Entre na fila e aguarde a disponibilidade de corridas!')
                ),
                React.createElement('button', { 
                    onClick: entrarNaFila, 
                    disabled: !podeChekin, 
                    className: `w-full py-4 rounded-xl font-bold text-lg ${!podeChekin ? 'bg-gray-300 text-gray-500' : 'bg-purple-600 text-white hover:bg-purple-700'}` 
                }, gpsStatus !== 'permitido' ? '📍 Aguardando GPS...' : distanciaCentral > minhaCentral.raio_metros ? `📍 Muito longe (${distanciaCentral}m)` : '🚀 Entrar na Fila'),
                distanciaCentral !== null && distanciaCentral > minhaCentral.raio_metros && React.createElement('p', { className: 'text-center text-red-500 text-sm mt-2' }, `Aproxime-se (você está a ${distanciaCentral}m, máx ${minhaCentral.raio_metros}m)`)
            )
        )
    );
}

window.ModuloFilas = ModuloFilas;
