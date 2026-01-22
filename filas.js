// ============================================================
// MÓDULO DE FILAS - FRONTEND
// Versão: 2.1 - Sem WebSocket (apenas polling)
// Funcionalidades: Corrida Única, Prioridade de Retorno, Mover para Último
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
    const isAdmin = ['admin', 'admin_master'].includes(usuario?.role);

    // ==================== HELPERS ====================
    const getAuthHeaders = () => ({
        'Authorization': `Bearer ${sessionStorage.getItem('tutts_token')}`,
        'Content-Type': 'application/json'
    });

    const formatarTempo = (minutos) => {
        if (!minutos) return '0 min';
        if (minutos < 60) return `${minutos} min`;
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas}h ${mins}min`;
    };

    // ==================== CARREGAMENTO INICIAL ====================
    React.useEffect(() => {
        if (isAdmin) {
            carregarCentrais();
        } else {
            carregarMinhaCentral();
        }
    }, []);

    // Auto-refresh a cada 30 segundos
    React.useEffect(() => {
        const interval = setInterval(() => {
            if (isAdmin && centralSelecionada) {
                carregarFila(centralSelecionada.id);
            } else if (!isAdmin && minhaCentral) {
                carregarMinhaPosicao();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [centralSelecionada, minhaCentral]);

    // ==================== FUNÇÕES ADMIN ====================
    const carregarCentrais = async () => {
        try {
            const response = await fetch(`${apiUrl}/filas/centrais`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) {
                setCentrais(data.centrais);
                if (data.centrais.length > 0 && !centralSelecionada) {
                    setCentralSelecionada(data.centrais[0]);
                    carregarFila(data.centrais[0].id);
                    carregarVinculos(data.centrais[0].id);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar centrais:', error);
            showToast('Erro ao carregar centrais', 'error');
        } finally {
            setLoading(false);
        }
    };

    const carregarFila = async (centralId) => {
        try {
            const response = await fetch(`${apiUrl}/filas/centrais/${centralId}/fila`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) {
                setFilaAtual({
                    aguardando: data.aguardando || [],
                    em_rota: data.em_rota || [],
                    alertas: data.alertas || []
                });
            }
        } catch (error) {
            console.error('Erro ao carregar fila:', error);
        }
    };

    const carregarVinculos = async (centralId) => {
        try {
            const response = await fetch(`${apiUrl}/filas/centrais/${centralId}/vinculos`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) setVinculos(data.vinculos);
        } catch (error) {
            console.error('Erro ao carregar vínculos:', error);
        }
    };

    const carregarEstatisticas = async (centralId) => {
        try {
            const response = await fetch(`${apiUrl}/filas/estatisticas/${centralId}?data=${filtroData}`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) setEstatisticas(data);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    const carregarHistorico = async (centralId) => {
        try {
            const response = await fetch(`${apiUrl}/filas/historico/${centralId}?limit=50`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) setHistorico(data.historico);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    };

    // Enviar para rota normal
    const enviarParaRota = async (codProfissional) => {
        try {
            const response = await fetch(`${apiUrl}/filas/enviar-rota`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ cod_profissional: codProfissional, central_id: centralSelecionada.id })
            });
            const data = await response.json();
            if (data.success) {
                showToast(`Profissional enviado para rota! Tempo de espera: ${formatarTempo(data.tempo_espera)}`, 'success');
                carregarFila(centralSelecionada.id);
            } else {
                showToast(data.error || 'Erro ao enviar para rota', 'error');
            }
        } catch (error) {
            showToast('Erro ao enviar para rota', 'error');
        }
    };

    // Enviar para rota única (com bônus e prioridade de retorno)
    const enviarParaRotaUnica = async (codProfissional) => {
        try {
            const response = await fetch(`${apiUrl}/filas/enviar-rota-unica`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ cod_profissional: codProfissional, central_id: centralSelecionada.id })
            });
            const data = await response.json();
            if (data.success) {
                showToast(`👑 Corrida única enviada! Tempo: ${formatarTempo(data.tempo_espera)} | Retorno prioritário na posição ${data.posicao_retorno}`, 'success');
                carregarFila(centralSelecionada.id);
            } else {
                showToast(data.error || 'Erro ao enviar corrida única', 'error');
            }
        } catch (error) {
            showToast('Erro ao enviar corrida única', 'error');
        }
    };

    // Mover para último (recusou roteiro)
    const moverParaUltimo = async (codProfissional) => {
        try {
            const response = await fetch(`${apiUrl}/filas/mover-ultimo`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ cod_profissional: codProfissional, central_id: centralSelecionada.id })
            });
            const data = await response.json();
            if (data.success) {
                if (data.message) {
                    showToast(data.message, 'info');
                } else {
                    showToast(`Movido da posição ${data.posicao_anterior} para ${data.posicao_nova}`, 'success');
                }
                carregarFila(centralSelecionada.id);
            } else {
                showToast(data.error || 'Erro ao mover para último', 'error');
            }
        } catch (error) {
            showToast('Erro ao mover para último', 'error');
        }
    };

    // Remover da fila
    const removerDaFila = async (codProfissional) => {
        if (!confirm('Tem certeza que deseja remover este profissional da fila?')) return;
        try {
            const response = await fetch(`${apiUrl}/filas/remover`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ cod_profissional: codProfissional, central_id: centralSelecionada.id })
            });
            const data = await response.json();
            if (data.success) {
                showToast('Profissional removido da fila', 'success');
                carregarFila(centralSelecionada.id);
            } else {
                showToast(data.error || 'Erro ao remover', 'error');
            }
        } catch (error) {
            showToast('Erro ao remover da fila', 'error');
        }
    };

    // ==================== FUNÇÕES USUÁRIO ====================
    const carregarMinhaCentral = async () => {
        try {
            const response = await fetch(`${apiUrl}/filas/minha-central`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success && data.vinculado) {
                setMinhaCentral(data.central);
                if (data.na_fila) {
                    carregarMinhaPosicao();
                }
                iniciarGPS();
            } else {
                setMinhaCentral(null);
            }
        } catch (error) {
            console.error('Erro ao carregar minha central:', error);
        } finally {
            setLoading(false);
        }
    };

    const carregarMinhaPosicao = async () => {
        try {
            const response = await fetch(`${apiUrl}/filas/minha-posicao`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) {
                setMinhaPosicao(data.na_fila ? data : null);
            }
        } catch (error) {
            console.error('Erro ao carregar minha posição:', error);
        }
    };

    const iniciarGPS = () => {
        if (!navigator.geolocation) {
            setGpsStatus('indisponivel');
            return;
        }
        setGpsStatus('obtendo');
        navigator.geolocation.watchPosition(
            (position) => {
                const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
                setMinhaLocalizacao(loc);
                setGpsStatus('ativo');
                if (minhaCentral) {
                    const dist = calcularDistancia(loc.lat, loc.lng, parseFloat(minhaCentral.latitude), parseFloat(minhaCentral.longitude));
                    setDistanciaCentral(Math.round(dist));
                }
            },
            (error) => {
                console.error('Erro GPS:', error);
                setGpsStatus('erro');
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
    };

    const calcularDistancia = (lat1, lon1, lat2, lon2) => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    const entrarNaFila = async () => {
        if (!minhaLocalizacao) {
            showToast('Aguarde o GPS...', 'error');
            return;
        }
        try {
            const response = await fetch(`${apiUrl}/filas/entrar`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ latitude: minhaLocalizacao.lat, longitude: minhaLocalizacao.lng })
            });
            const data = await response.json();
            if (data.success) {
                const msg = data.prioridade ? `🎉 Você retornou com prioridade! Posição: ${data.posicao}` : `Você entrou na fila! Posição: ${data.posicao}`;
                showToast(msg, 'success');
                carregarMinhaPosicao();
            } else {
                showToast(data.mensagem || data.error || 'Erro ao entrar na fila', 'error');
            }
        } catch (error) {
            showToast('Erro ao entrar na fila', 'error');
        }
    };

    const sairDaFila = async () => {
        if (!confirm('Tem certeza que deseja sair da fila?')) return;
        try {
            const response = await fetch(`${apiUrl}/filas/sair`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (data.success) {
                showToast('Você saiu da fila', 'success');
                setMinhaPosicao(null);
            } else {
                showToast(data.error || 'Erro ao sair da fila', 'error');
            }
        } catch (error) {
            showToast('Erro ao sair da fila', 'error');
        }
    };

    // ==================== GESTÃO DE CENTRAIS ====================
    const buscarCoordenadas = async (endereco) => {
        if (!endereco || endereco.length < 10) {
            showToast('Digite um endereço completo', 'error');
            return;
        }
        setBuscandoEndereco(true);
        setEnderecoValidado(false);
        try {
            const response = await fetch(`${apiUrl}/geocode?address=${encodeURIComponent(endereco)}`, { headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success && data.results && data.results.length > 0) {
                const loc = data.results[0].geometry.location;
                setCoordenadasEncontradas({ lat: loc.lat, lng: loc.lng, endereco_formatado: data.results[0].formatted_address });
                setEnderecoValidado(true);
                showToast('Endereço encontrado!', 'success');
            } else {
                showToast('Endereço não encontrado', 'error');
            }
        } catch (error) {
            showToast('Erro ao buscar endereço', 'error');
        } finally {
            setBuscandoEndereco(false);
        }
    };

    const salvarCentral = async (dados) => {
        try {
            const url = dados.id ? `${apiUrl}/filas/centrais/${dados.id}` : `${apiUrl}/filas/centrais`;
            const method = dados.id ? 'PUT' : 'POST';
            const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(dados) });
            const data = await response.json();
            if (data.success) {
                showToast(`Central ${dados.id ? 'atualizada' : 'criada'} com sucesso!`, 'success');
                setModalCentral(null);
                carregarCentrais();
            } else {
                showToast(data.error || 'Erro ao salvar central', 'error');
            }
        } catch (error) {
            showToast('Erro ao salvar central', 'error');
        }
    };

    const vincularProfissional = async (codProfissional, nomeProfissional) => {
        try {
            const response = await fetch(`${apiUrl}/filas/vinculos`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ central_id: centralSelecionada.id, cod_profissional: codProfissional, nome_profissional: nomeProfissional })
            });
            const data = await response.json();
            if (data.success) {
                showToast('Profissional vinculado!', 'success');
                carregarVinculos(centralSelecionada.id);
                carregarCentrais();
                setModalVinculo(false);
            } else {
                showToast(data.error || 'Erro ao vincular', 'error');
            }
        } catch (error) {
            showToast('Erro ao vincular profissional', 'error');
        }
    };

    const desvincularProfissional = async (codProfissional) => {
        if (!confirm('Deseja desvincular este profissional?')) return;
        try {
            const response = await fetch(`${apiUrl}/filas/vinculos/${codProfissional}`, { method: 'DELETE', headers: getAuthHeaders() });
            const data = await response.json();
            if (data.success) {
                showToast('Profissional desvinculado', 'success');
                carregarVinculos(centralSelecionada.id);
                carregarCentrais();
            } else {
                showToast(data.error || 'Erro ao desvincular', 'error');
            }
        } catch (error) {
            showToast('Erro ao desvincular', 'error');
        }
    };

    // ==================== RENDER ====================
    if (loading) {
        return React.createElement('div', { className: 'flex items-center justify-center p-8' },
            React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600' })
        );
    }

    // ==================== VISÃO DO MOTOBOY ====================
    if (!isAdmin) {
        if (!minhaCentral) {
            return React.createElement('div', { className: 'p-6 text-center' },
                React.createElement('div', { className: 'bg-yellow-500/20 rounded-xl p-6' },
                    React.createElement('p', { className: 'text-xl' }, '⚠️'),
                    React.createElement('p', { className: 'mt-2' }, 'Você não está vinculado a nenhuma central.'),
                    React.createElement('p', { className: 'text-sm text-gray-400 mt-1' }, 'Entre em contato com o administrador.')
                )
            );
        }

        return React.createElement('div', { className: 'p-4 space-y-4' },
            // Header com nome da central
            React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white' },
                React.createElement('div', { className: 'flex items-start gap-3' },
                    React.createElement('span', { className: 'text-2xl' }, '📍'),
                    React.createElement('div', null,
                        React.createElement('h2', { className: 'font-bold text-lg' }, minhaCentral.central_nome || minhaCentral.nome),
                        React.createElement('p', { className: 'text-sm opacity-80' }, minhaCentral.endereco)
                    )
                ),
                // Status GPS
                React.createElement('div', { className: `flex items-center gap-2 mt-3 p-2 rounded-lg ${gpsStatus === 'ativo' ? 'bg-green-500/20' : 'bg-orange-500/20'}` },
                    React.createElement('span', { className: 'text-sm' }, gpsStatus === 'ativo' ? '📡' : '⏳'),
                    React.createElement('p', { className: 'text-xs' }, 
                        gpsStatus === 'ativo' ? `GPS Ativo - Você está a ${distanciaCentral || '...'}m (máx ${minhaCentral.raio_metros}m)` :
                        gpsStatus === 'obtendo' ? 'Obtendo localização...' :
                        gpsStatus === 'erro' ? 'Erro no GPS - Verifique permissões' : 'GPS indisponível'
                    )
                )
            ),

            // Card de posição ou ações
            minhaPosicao ? (
                minhaPosicao.status === 'aguardando' ? 
                    React.createElement('div', { className: 'bg-white rounded-xl p-6 shadow-lg' },
                        React.createElement('div', { className: 'text-center' },
                            React.createElement('p', { className: 'text-gray-500 text-sm' }, 'Sua posição na fila'),
                            React.createElement('p', { className: 'text-6xl font-bold text-purple-600 my-2' }, minhaPosicao.minha_posicao),
                            React.createElement('p', { className: 'text-gray-400' }, `de ${minhaPosicao.total_na_fila} • ⏱️ ${formatarTempo(minhaPosicao.minutos_esperando)}`)
                        ),
                        // Lista de quem está na frente
                        minhaPosicao.na_frente && minhaPosicao.na_frente.length > 0 && 
                            React.createElement('div', { className: 'mt-4 pt-4 border-t' },
                                minhaPosicao.na_frente.map(p => 
                                    React.createElement('div', { key: p.cod_profissional, className: 'flex items-center gap-2 py-1 text-sm' },
                                        React.createElement('span', { className: 'bg-gray-100 text-gray-600 px-2 py-0.5 rounded' }, p.posicao),
                                        React.createElement('span', null, p.nome_profissional?.split(' ')[0]),
                                        p.retornou_corrida_unica && React.createElement('span', { className: 'text-yellow-500', title: 'Retorno prioritário' }, '👑')
                                    )
                                )
                            ),
                        // Botão sair
                        React.createElement('button', {
                            onClick: sairDaFila,
                            className: 'mt-4 w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium'
                        }, '🚪 Sair da Fila')
                    )
                : // Em rota
                    React.createElement('div', { className: 'bg-white rounded-xl p-6 shadow-lg' },
                        React.createElement('div', { className: 'text-center' },
                            React.createElement('span', { className: 'text-4xl' }, '🚚'),
                            React.createElement('p', { className: 'text-xl font-bold text-green-600 mt-2' }, 'Você está em rota!'),
                            React.createElement('p', { className: 'text-gray-500' }, `Há ${formatarTempo(minhaPosicao.minutos_em_rota)}`),
                            minhaPosicao.corrida_unica && 
                                React.createElement('div', { className: 'mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3' },
                                    React.createElement('p', { className: 'text-yellow-700 font-medium' }, '👑 Corrida Única'),
                                    React.createElement('p', { className: 'text-yellow-600 text-sm' }, `Ao retornar, você voltará para a posição ${minhaPosicao.posicao_original}`)
                                )
                        ),
                        React.createElement('button', {
                            onClick: entrarNaFila,
                            disabled: gpsStatus !== 'ativo' || (distanciaCentral > minhaCentral.raio_metros),
                            className: `mt-4 w-full py-3 rounded-lg font-medium ${
                                gpsStatus === 'ativo' && distanciaCentral <= minhaCentral.raio_metros
                                    ? minhaPosicao.corrida_unica ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`
                        }, minhaPosicao.corrida_unica ? '👑 Retornar com Prioridade' : '🔄 Retornar à Fila')
                    )
            ) : (
                // Não está na fila
                React.createElement('div', { className: 'bg-white rounded-xl p-6 shadow-lg text-center' },
                    React.createElement('span', { className: 'text-4xl' }, '👋'),
                    React.createElement('p', { className: 'text-lg font-medium mt-2' }, 'Você não está na fila'),
                    React.createElement('button', {
                        onClick: entrarNaFila,
                        disabled: gpsStatus !== 'ativo' || (distanciaCentral > minhaCentral.raio_metros),
                        className: `mt-4 w-full py-3 rounded-lg font-medium ${
                            gpsStatus === 'ativo' && distanciaCentral <= minhaCentral.raio_metros
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`
                    }, gpsStatus === 'ativo' && distanciaCentral <= minhaCentral.raio_metros ? '✅ Entrar na Fila' : '📍 Aproxime-se da central')
                )
            )
        );
    }

    // ==================== VISÃO ADMIN ====================
    return React.createElement('div', { className: 'p-4' },
        // Tabs
        React.createElement('div', { className: 'flex gap-2 mb-4 overflow-x-auto' },
            ['Monitoramento', 'Vínculos', 'Relatórios', 'Configurações'].map(tab =>
                React.createElement('button', {
                    key: tab,
                    onClick: () => onChangeTab(tab.toLowerCase()),
                    className: `px-4 py-2 rounded-lg font-medium whitespace-nowrap ${abaAtiva === tab.toLowerCase() ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`
                }, tab)
            )
        ),

        // Seletor de Central
        centrais.length > 0 && React.createElement('div', { className: 'mb-4' },
            React.createElement('select', {
                value: centralSelecionada?.id || '',
                onChange: (e) => {
                    const central = centrais.find(c => c.id === parseInt(e.target.value));
                    setCentralSelecionada(central);
                    if (central) {
                        carregarFila(central.id);
                        carregarVinculos(central.id);
                    }
                },
                className: 'w-full p-3 rounded-lg border bg-white'
            }, centrais.map(c => React.createElement('option', { key: c.id, value: c.id }, `${c.nome} (${c.na_fila || 0} na fila)`)))
        ),

        // Conteúdo das tabs
        abaAtiva === 'monitoramento' && centralSelecionada && React.createElement('div', { className: 'space-y-4' },
            // Cards de resumo
            React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                React.createElement('div', { className: 'bg-purple-100 p-4 rounded-xl text-center' },
                    React.createElement('p', { className: 'text-3xl font-bold text-purple-600' }, filaAtual.aguardando.length),
                    React.createElement('p', { className: 'text-sm text-purple-700' }, 'Aguardando')
                ),
                React.createElement('div', { className: 'bg-green-100 p-4 rounded-xl text-center' },
                    React.createElement('p', { className: 'text-3xl font-bold text-green-600' }, filaAtual.em_rota.length),
                    React.createElement('p', { className: 'text-sm text-green-700' }, 'Em Rota')
                ),
                React.createElement('div', { className: 'bg-orange-100 p-4 rounded-xl text-center' },
                    React.createElement('p', { className: 'text-3xl font-bold text-orange-600' }, filaAtual.alertas.length),
                    React.createElement('p', { className: 'text-sm text-orange-700' }, 'Alertas (+90min)')
                ),
                React.createElement('div', { className: 'bg-blue-100 p-4 rounded-xl text-center' },
                    React.createElement('p', { className: 'text-3xl font-bold text-blue-600' }, vinculos.length),
                    React.createElement('p', { className: 'text-sm text-blue-700' }, 'Vinculados')
                )
            ),

            // Fila de espera
            React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow' },
                React.createElement('h3', { className: 'font-bold text-lg mb-3 flex items-center gap-2' }, '⏳ Fila de Espera'),
                filaAtual.aguardando.length === 0 ?
                    React.createElement('p', { className: 'text-gray-500 text-center py-4' }, '🎉 Nenhum na fila') :
                    React.createElement('div', { className: 'space-y-2' },
                        filaAtual.aguardando.map(prof =>
                            React.createElement('div', { 
                                key: prof.cod_profissional, 
                                className: `flex items-center justify-between p-3 rounded-lg ${prof.retornou_corrida_unica ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`
                            },
                                React.createElement('div', { className: 'flex items-center gap-3' },
                                    React.createElement('span', { className: 'bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold' }, prof.posicao),
                                    React.createElement('div', null,
                                        React.createElement('p', { className: 'font-medium flex items-center gap-2' }, 
                                            prof.nome_profissional,
                                            prof.retornou_corrida_unica && React.createElement('span', { className: 'text-yellow-500', title: 'Retorno com prioridade' }, '👑')
                                        ),
                                        React.createElement('p', { className: 'text-xs text-gray-500' }, `⏱️ ${formatarTempo(prof.minutos_esperando)}`)
                                    )
                                ),
                                // Botões de ação
                                React.createElement('div', { className: 'flex gap-1' },
                                    React.createElement('button', {
                                        onClick: () => enviarParaRota(prof.cod_profissional),
                                        className: 'p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm',
                                        title: 'Despachar Roteiro'
                                    }, '🚀'),
                                    React.createElement('button', {
                                        onClick: () => enviarParaRotaUnica(prof.cod_profissional),
                                        className: 'p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm',
                                        title: 'Corrida Única (bônus + prioridade)'
                                    }, '👑'),
                                    React.createElement('button', {
                                        onClick: () => moverParaUltimo(prof.cod_profissional),
                                        className: 'p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm',
                                        title: 'Mover para Último'
                                    }, '⬇️'),
                                    React.createElement('button', {
                                        onClick: () => removerDaFila(prof.cod_profissional),
                                        className: 'p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm',
                                        title: 'Remover da Fila'
                                    }, '❌')
                                )
                            )
                        )
                    )
            ),

            // Em rota
            React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow' },
                React.createElement('h3', { className: 'font-bold text-lg mb-3 flex items-center gap-2' }, '🚚 Em Rota'),
                filaAtual.em_rota.length === 0 ?
                    React.createElement('p', { className: 'text-gray-500 text-center py-4' }, '🏠 Nenhum em rota') :
                    React.createElement('div', { className: 'space-y-2' },
                        filaAtual.em_rota.map(prof =>
                            React.createElement('div', { key: prof.cod_profissional, className: `flex items-center justify-between p-3 rounded-lg ${prof.minutos_em_rota > 90 ? 'bg-red-50 border border-red-200' : 'bg-green-50'}` },
                                React.createElement('div', null,
                                    React.createElement('p', { className: 'font-medium' }, prof.nome_profissional),
                                    React.createElement('p', { className: `text-xs ${prof.minutos_em_rota > 90 ? 'text-red-500' : 'text-green-600'}` }, 
                                        `⏱️ ${formatarTempo(prof.minutos_em_rota)}`,
                                        prof.corrida_unica && ' • 👑 Corrida Única'
                                    )
                                ),
                                prof.minutos_em_rota > 90 && React.createElement('span', { className: 'text-red-500 text-xl' }, '⚠️')
                            )
                        )
                    )
            ),

            // Legenda
            React.createElement('div', { className: 'bg-gray-50 rounded-xl p-4' },
                React.createElement('p', { className: 'font-medium text-sm mb-2' }, '🎯 Legenda dos Botões:'),
                React.createElement('div', { className: 'flex flex-wrap gap-3 text-xs' },
                    React.createElement('span', null, '🚀 Despachar Roteiro'),
                    React.createElement('span', null, '👑 Corrida Única (bônus + prioridade)'),
                    React.createElement('span', null, '⬇️ Mover para Último'),
                    React.createElement('span', null, '❌ Remover da Fila')
                )
            )
        ),

        // Aba Vínculos
        abaAtiva === 'vínculos' && centralSelecionada && React.createElement('div', { className: 'space-y-4' },
            React.createElement('button', {
                onClick: () => setModalVinculo(true),
                className: 'w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium'
            }, '➕ Vincular Profissional'),
            
            React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow' },
                React.createElement('h3', { className: 'font-bold mb-3' }, `Profissionais Vinculados (${vinculos.length})`),
                vinculos.length === 0 ?
                    React.createElement('p', { className: 'text-gray-500 text-center py-4' }, 'Nenhum profissional vinculado') :
                    React.createElement('div', { className: 'space-y-2' },
                        vinculos.map(v =>
                            React.createElement('div', { key: v.cod_profissional, className: 'flex items-center justify-between p-3 bg-gray-50 rounded-lg' },
                                React.createElement('div', null,
                                    React.createElement('p', { className: 'font-medium' }, v.nome_profissional),
                                    React.createElement('p', { className: 'text-xs text-gray-500' }, `Cod: ${v.cod_profissional}`)
                                ),
                                React.createElement('button', {
                                    onClick: () => desvincularProfissional(v.cod_profissional),
                                    className: 'px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-sm'
                                }, 'Desvincular')
                            )
                        )
                    )
            )
        ),

        // Aba Relatórios
        abaAtiva === 'relatórios' && centralSelecionada && React.createElement('div', { className: 'space-y-4' },
            React.createElement('input', {
                type: 'date',
                value: filtroData,
                onChange: (e) => { setFiltroData(e.target.value); carregarEstatisticas(centralSelecionada.id); },
                className: 'w-full p-3 rounded-lg border'
            }),
            React.createElement('button', {
                onClick: () => { carregarEstatisticas(centralSelecionada.id); carregarHistorico(centralSelecionada.id); },
                className: 'w-full py-3 bg-purple-600 text-white rounded-lg'
            }, '🔍 Carregar Relatórios'),
            
            estatisticas && React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
                React.createElement('div', { className: 'bg-white p-4 rounded-xl shadow text-center' },
                    React.createElement('p', { className: 'text-2xl font-bold text-purple-600' }, estatisticas.total_saidas),
                    React.createElement('p', { className: 'text-sm text-gray-500' }, 'Saídas no dia')
                ),
                React.createElement('div', { className: 'bg-white p-4 rounded-xl shadow text-center' },
                    React.createElement('p', { className: 'text-2xl font-bold text-green-600' }, `${estatisticas.tempo_medio_espera} min`),
                    React.createElement('p', { className: 'text-sm text-gray-500' }, 'Tempo médio')
                )
            )
        ),

        // Aba Configurações
        abaAtiva === 'configurações' && React.createElement('div', { className: 'space-y-4' },
            React.createElement('button', {
                onClick: () => setModalCentral({ nome: '', endereco: '', latitude: '', longitude: '', raio_metros: 900 }),
                className: 'w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium'
            }, '➕ Nova Central'),
            
            React.createElement('div', { className: 'space-y-2' },
                centrais.map(c =>
                    React.createElement('div', { key: c.id, className: 'bg-white p-4 rounded-xl shadow' },
                        React.createElement('div', { className: 'flex justify-between items-start' },
                            React.createElement('div', null,
                                React.createElement('p', { className: 'font-bold' }, c.nome),
                                React.createElement('p', { className: 'text-sm text-gray-500' }, c.endereco),
                                React.createElement('p', { className: 'text-xs text-gray-400' }, `Raio: ${c.raio_metros}m`)
                            ),
                            React.createElement('button', {
                                onClick: () => setModalCentral(c),
                                className: 'px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm'
                            }, '✏️ Editar')
                        )
                    )
                )
            )
        ),

        // Modal Vincular Profissional
        modalVinculo && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50' },
            React.createElement('div', { className: 'bg-white rounded-xl p-6 w-full max-w-md' },
                React.createElement('h3', { className: 'font-bold text-lg mb-4' }, 'Vincular Profissional'),
                React.createElement('input', {
                    type: 'text',
                    placeholder: 'Código do profissional',
                    id: 'vinculo-cod',
                    className: 'w-full p-3 border rounded-lg mb-3'
                }),
                React.createElement('input', {
                    type: 'text',
                    placeholder: 'Nome do profissional',
                    id: 'vinculo-nome',
                    className: 'w-full p-3 border rounded-lg mb-4'
                }),
                React.createElement('div', { className: 'flex gap-2' },
                    React.createElement('button', {
                        onClick: () => setModalVinculo(false),
                        className: 'flex-1 py-2 bg-gray-200 rounded-lg'
                    }, 'Cancelar'),
                    React.createElement('button', {
                        onClick: () => {
                            const cod = document.getElementById('vinculo-cod').value;
                            const nome = document.getElementById('vinculo-nome').value;
                            if (cod && nome) vincularProfissional(cod, nome);
                        },
                        className: 'flex-1 py-2 bg-purple-600 text-white rounded-lg'
                    }, 'Vincular')
                )
            )
        ),

        // Modal Central
        modalCentral && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50' },
            React.createElement('div', { className: 'bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto' },
                React.createElement('h3', { className: 'font-bold text-lg mb-4' }, modalCentral.id ? 'Editar Central' : 'Nova Central'),
                React.createElement('div', { className: 'space-y-3' },
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Nome da central',
                        defaultValue: modalCentral.nome,
                        onChange: (e) => modalCentral.nome = e.target.value,
                        className: 'w-full p-3 border rounded-lg'
                    }),
                    React.createElement('div', { className: 'flex gap-2' },
                        React.createElement('input', {
                            type: 'text',
                            placeholder: 'Endereço completo',
                            defaultValue: modalCentral.endereco,
                            onChange: (e) => modalCentral.endereco = e.target.value,
                            className: 'flex-1 p-3 border rounded-lg'
                        }),
                        React.createElement('button', {
                            onClick: () => buscarCoordenadas(modalCentral.endereco),
                            disabled: buscandoEndereco,
                            className: 'px-4 py-2 bg-blue-500 text-white rounded-lg'
                        }, buscandoEndereco ? '...' : '🔍')
                    ),
                    coordenadasEncontradas && React.createElement('div', { className: 'bg-green-50 p-3 rounded-lg text-sm' },
                        React.createElement('p', null, `✅ ${coordenadasEncontradas.endereco_formatado}`),
                        React.createElement('p', { className: 'text-xs text-gray-500' }, `Lat: ${coordenadasEncontradas.lat}, Lng: ${coordenadasEncontradas.lng}`)
                    ),
                    React.createElement('input', {
                        type: 'number',
                        placeholder: 'Raio em metros (padrão: 900)',
                        defaultValue: modalCentral.raio_metros,
                        onChange: (e) => modalCentral.raio_metros = parseInt(e.target.value),
                        className: 'w-full p-3 border rounded-lg'
                    })
                ),
                React.createElement('div', { className: 'flex gap-2 mt-4' },
                    React.createElement('button', {
                        onClick: () => { setModalCentral(null); setCoordenadasEncontradas(null); },
                        className: 'flex-1 py-2 bg-gray-200 rounded-lg'
                    }, 'Cancelar'),
                    React.createElement('button', {
                        onClick: () => {
                            const dados = {
                                ...modalCentral,
                                latitude: coordenadasEncontradas?.lat || modalCentral.latitude,
                                longitude: coordenadasEncontradas?.lng || modalCentral.longitude
                            };
                            if (!dados.nome || !dados.endereco || !dados.latitude || !dados.longitude) {
                                showToast('Preencha todos os campos e busque o endereço', 'error');
                                return;
                            }
                            salvarCentral(dados);
                        },
                        className: 'flex-1 py-2 bg-purple-600 text-white rounded-lg'
                    }, 'Salvar')
                )
            )
        )
    );
}

// Exportar
if (typeof window !== 'undefined') {
    window.ModuloFilas = ModuloFilas;
}
