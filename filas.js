// ============================================================
// MÓDULO DE FILAS - FRONTEND
// Sistema de Gerenciamento de Filas Logísticas
// ============================================================
// INSTRUÇÕES: 
// 1. Salve este arquivo como "filas.js" no mesmo diretório do app.js
// 2. Adicione <script src="/filas.js" defer></script> no index.html ANTES do app.js
// 3. Adicione o módulo no SISTEMA_MODULOS_CONFIG do app.js
// 4. Adicione a renderização condicional no App
// ============================================================

// Componente Principal do Módulo de Filas
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
    
    // Estados para usuário comum (motoboy)
    const [minhaCentral, setMinhaCentral] = React.useState(null);
    const [minhaPosicao, setMinhaPosicao] = React.useState(null);
    const [gpsStatus, setGpsStatus] = React.useState('verificando');
    const [minhaLocalizacao, setMinhaLocalizacao] = React.useState(null);
    const [distanciaCentral, setDistanciaCentral] = React.useState(null);
    
    const isAdmin = ['admin', 'admin_master'].includes(usuario?.role);
    
    // ==================== GEOLOCALIZAÇÃO ====================
    
    const solicitarGPS = () => {
        if (!navigator.geolocation) {
            setGpsStatus('indisponivel');
            return;
        }
        setGpsStatus('verificando');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setMinhaLocalizacao({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                setGpsStatus('permitido');
                if (minhaCentral?.latitude && minhaCentral?.longitude) {
                    const dist = calcularDistanciaHaversine(
                        position.coords.latitude,
                        position.coords.longitude,
                        parseFloat(minhaCentral.latitude),
                        parseFloat(minhaCentral.longitude)
                    );
                    setDistanciaCentral(Math.round(dist));
                }
            },
            (error) => {
                console.error('Erro GPS:', error);
                setGpsStatus(error.code === error.PERMISSION_DENIED ? 'negado' : 'indisponivel');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    };
    
    const calcularDistanciaHaversine = (lat1, lon1, lat2, lon2) => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };
    
    // ==================== CARREGAMENTO DE DADOS ====================
    
    const carregarCentrais = async () => {
        try {
            const response = await fetchAuth(`${apiUrl}/filas/centrais`);
            const data = await response.json();
            if (data.success) {
                setCentrais(data.centrais);
                if (data.centrais.length > 0 && !centralSelecionada) {
                    setCentralSelecionada(data.centrais[0]);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar centrais:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const carregarFila = async (centralId) => {
        if (!centralId) return;
        try {
            const response = await fetchAuth(`${apiUrl}/filas/centrais/${centralId}/fila`);
            const data = await response.json();
            if (data.success) setFilaAtual(data);
        } catch (error) {
            console.error('Erro ao carregar fila:', error);
        }
    };
    
    const carregarVinculos = async (centralId) => {
        if (!centralId) return;
        try {
            const response = await fetchAuth(`${apiUrl}/filas/centrais/${centralId}/vinculos`);
            const data = await response.json();
            if (data.success) setVinculos(data.vinculos);
        } catch (error) {
            console.error('Erro ao carregar vínculos:', error);
        }
    };
    
    const carregarMinhaCentral = async () => {
        try {
            const response = await fetchAuth(`${apiUrl}/filas/minha-central`);
            const data = await response.json();
            if (data.success) {
                if (data.vinculado) {
                    setMinhaCentral(data.central);
                    setMinhaPosicao(data.posicao_atual);
                } else {
                    setMinhaCentral(null);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar minha central:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const carregarMinhaPosicao = async () => {
        try {
            const response = await fetchAuth(`${apiUrl}/filas/minha-posicao`);
            const data = await response.json();
            if (data.success) setMinhaPosicao(data);
        } catch (error) {
            console.error('Erro ao carregar posição:', error);
        }
    };
    
    const carregarEstatisticas = async (centralId) => {
        if (!centralId) return;
        try {
            const response = await fetchAuth(`${apiUrl}/filas/estatisticas/${centralId}?data=${filtroData}`);
            const data = await response.json();
            if (data.success) setEstatisticas(data);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };
    
    const carregarHistorico = async (centralId) => {
        if (!centralId) return;
        try {
            const response = await fetchAuth(`${apiUrl}/filas/historico/${centralId}?data_inicio=${filtroData}&data_fim=${filtroData}`);
            const data = await response.json();
            if (data.success) setHistorico(data.historico);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    };
    
    const carregarProfissionais = async () => {
        try {
            const response = await fetchAuth(`${apiUrl}/users`);
            const data = await response.json();
            if (Array.isArray(data)) {
                setProfissionaisDisponiveis(data.filter(u => u.role === 'user'));
            }
        } catch (error) {
            console.error('Erro ao carregar profissionais:', error);
        }
    };
    
    // ==================== AÇÕES ADMIN ====================
    
    const salvarCentral = async (dados) => {
        try {
            const method = dados.id ? 'PUT' : 'POST';
            const url = dados.id ? `${apiUrl}/filas/centrais/${dados.id}` : `${apiUrl}/filas/centrais`;
            const response = await fetchAuth(url, { method, body: JSON.stringify(dados) });
            const data = await response.json();
            if (data.success) {
                showToast(dados.id ? 'Central atualizada!' : 'Central criada!', 'success');
                setModalCentral(null);
                carregarCentrais();
            } else {
                showToast(data.error || 'Erro ao salvar', 'error');
            }
        } catch (error) {
            showToast('Erro ao salvar central', 'error');
        }
    };
    
    const vincularProfissional = async (cod_profissional, nome_profissional) => {
        if (!centralSelecionada) return;
        try {
            const response = await fetchAuth(`${apiUrl}/filas/vinculos`, {
                method: 'POST',
                body: JSON.stringify({ central_id: centralSelecionada.id, cod_profissional, nome_profissional })
            });
            const data = await response.json();
            if (data.success) {
                showToast('Profissional vinculado!', 'success');
                carregarCentrais();
                carregarVinculos(centralSelecionada.id);
            } else {
                showToast(data.error || 'Erro ao vincular', 'error');
            }
        } catch (error) {
            showToast('Erro ao vincular profissional', 'error');
        }
    };
    
    const desvincularProfissional = async (cod_profissional) => {
        if (!window.confirm('Confirma desvincular este profissional?')) return;
        try {
            const response = await fetchAuth(`${apiUrl}/filas/vinculos/${cod_profissional}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                showToast('Profissional desvinculado!', 'success');
                carregarCentrais();
                carregarFila(centralSelecionada?.id);
                carregarVinculos(centralSelecionada?.id);
            }
        } catch (error) {
            showToast('Erro ao desvincular', 'error');
        }
    };
    
    const enviarParaRota = async (cod_profissional) => {
        if (!centralSelecionada) return;
        try {
            const response = await fetchAuth(`${apiUrl}/filas/enviar-rota`, {
                method: 'POST',
                body: JSON.stringify({ cod_profissional, central_id: centralSelecionada.id })
            });
            const data = await response.json();
            if (data.success) {
                showToast(`Enviado para roteiro! (esperou ${data.tempo_espera} min)`, 'success');
                carregarFila(centralSelecionada.id);
            } else {
                showToast(data.error || 'Erro ao enviar', 'error');
            }
        } catch (error) {
            showToast('Erro ao enviar para roteiro', 'error');
        }
    };
    
    const removerDaFila = async (cod_profissional) => {
        const observacao = window.prompt('Motivo da remoção (opcional):');
        if (observacao === null) return;
        try {
            const response = await fetchAuth(`${apiUrl}/filas/remover`, {
                method: 'POST',
                body: JSON.stringify({ cod_profissional, central_id: centralSelecionada.id, observacao })
            });
            const data = await response.json();
            if (data.success) {
                showToast('Removido da fila!', 'success');
                carregarFila(centralSelecionada.id);
            }
        } catch (error) {
            showToast('Erro ao remover', 'error');
        }
    };
    
    // ==================== AÇÕES USER ====================
    
    const entrarNaFila = async () => {
        if (!minhaLocalizacao) {
            showToast('Aguarde o GPS...', 'error');
            solicitarGPS();
            return;
        }
        try {
            const response = await fetchAuth(`${apiUrl}/filas/entrar`, {
                method: 'POST',
                body: JSON.stringify({ latitude: minhaLocalizacao.latitude, longitude: minhaLocalizacao.longitude })
            });
            const data = await response.json();
            if (data.success) {
                showToast(`Você entrou na fila! Posição: ${data.posicao}`, 'success');
                carregarMinhaPosicao();
            } else {
                showToast(data.mensagem || data.error || 'Erro ao entrar na fila', 'error');
            }
        } catch (error) {
            showToast('Erro ao entrar na fila', 'error');
        }
    };
    
    const sairDaFila = async () => {
        if (!window.confirm('Confirma sair da fila?')) return;
        try {
            const response = await fetchAuth(`${apiUrl}/filas/sair`, { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                showToast('Você saiu da fila', 'success');
                carregarMinhaPosicao();
            }
        } catch (error) {
            showToast('Erro ao sair da fila', 'error');
        }
    };
    
    // ==================== EFFECTS ====================
    
    React.useEffect(() => {
        if (isAdmin) {
            carregarCentrais();
            carregarProfissionais();
        } else {
            carregarMinhaCentral();
            solicitarGPS();
        }
    }, []);
    
    React.useEffect(() => {
        if (!isAdmin || !centralSelecionada) return;
        carregarFila(centralSelecionada.id);
        carregarVinculos(centralSelecionada.id);
        const interval = setInterval(() => carregarFila(centralSelecionada.id), 5000);
        return () => clearInterval(interval);
    }, [centralSelecionada]);
    
    React.useEffect(() => {
        if (isAdmin || !minhaCentral) return;
        carregarMinhaPosicao();
        const interval = setInterval(() => { carregarMinhaPosicao(); solicitarGPS(); }, 10000);
        return () => clearInterval(interval);
    }, [minhaCentral]);
    
    React.useEffect(() => {
        if (abaAtiva === 'relatorios' && centralSelecionada) {
            carregarEstatisticas(centralSelecionada.id);
            carregarHistorico(centralSelecionada.id);
        }
    }, [abaAtiva, centralSelecionada, filtroData]);
    
    React.useEffect(() => {
        if (minhaLocalizacao && minhaCentral?.latitude && minhaCentral?.longitude) {
            const dist = calcularDistanciaHaversine(
                minhaLocalizacao.latitude, minhaLocalizacao.longitude,
                parseFloat(minhaCentral.latitude), parseFloat(minhaCentral.longitude)
            );
            setDistanciaCentral(Math.round(dist));
        }
    }, [minhaLocalizacao, minhaCentral]);
    
    // ==================== HELPERS ====================
    
    const formatarTempo = (minutos) => {
        if (!minutos) return '0 min';
        if (minutos < 60) return `${Math.round(minutos)} min`;
        return `${Math.floor(minutos / 60)}h ${Math.round(minutos % 60)}min`;
    };
    
    const formatarHora = (data) => data ? new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';
    
    // ==================== RENDERIZAÇÃO ADMIN ====================
    
    if (isAdmin) {
        return React.createElement('div', { className: 'space-y-6' },
            // Header
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
            
            // Abas
            React.createElement('div', { className: 'bg-white rounded-xl shadow' },
                React.createElement('div', { className: 'border-b flex gap-1 p-2' },
                    ['monitoramento', 'vinculos', 'relatorios', 'config'].map(aba =>
                        React.createElement('button', {
                            key: aba,
                            onClick: () => onChangeTab(aba),
                            className: `px-4 py-2 rounded-lg font-medium transition-all ${abaAtiva === aba ? 'bg-purple-100 text-purple-800' : 'text-gray-600 hover:bg-gray-100'}`
                        }, aba === 'monitoramento' ? '📊 Monitoramento' : aba === 'vinculos' ? '👥 Vínculos' : aba === 'relatorios' ? '📈 Relatórios' : '⚙️ Configurações')
                    )
                ),
                
                React.createElement('div', { className: 'p-6' },
                    // Aba Monitoramento
                    abaAtiva === 'monitoramento' && centralSelecionada && React.createElement('div', { className: 'space-y-6' },
                        // Cards de resumo
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
                        
                        // Alerta de profissionais que não retornaram
                        filaAtual.alertas?.length > 0 && React.createElement('div', { className: 'bg-red-50 border-2 border-red-400 rounded-xl p-4 animate-pulse' },
                            React.createElement('div', { className: 'flex items-center gap-3 mb-3' },
                                React.createElement('span', { className: 'text-3xl' }, '🚨'),
                                React.createElement('div', null,
                                    React.createElement('p', { className: 'text-red-800 font-bold text-lg' }, `ATENÇÃO: ${filaAtual.alertas.length} profissional(is) não retornou(aram)!`),
                                    React.createElement('p', { className: 'text-red-600 text-sm' }, 'Tempo em rota superior a 1h30min. Favor verificar.')
                                )
                            ),
                            React.createElement('div', { className: 'grid md:grid-cols-2 gap-2' },
                                filaAtual.alertas.map(prof => React.createElement('div', { key: prof.cod_profissional, className: 'bg-white border border-red-300 rounded-lg p-3 flex justify-between items-center' },
                                    React.createElement('div', null,
                                        React.createElement('p', { className: 'font-bold text-gray-800' }, prof.nome_profissional),
                                        React.createElement('p', { className: 'text-sm text-red-600' }, `⏱️ ${formatarTempo(prof.minutos_em_rota)} em rota`)
                                    ),
                                    React.createElement('button', { onClick: () => removerDaFila(prof.cod_profissional), className: 'px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700' }, '❌ Remover')
                                ))
                            )
                        ),
                        
                        // Fila de Espera e Em Rota
                        React.createElement('div', { className: 'grid md:grid-cols-2 gap-6' },
                            // Fila de Espera
                            React.createElement('div', { className: 'bg-blue-50 rounded-xl p-4 border border-blue-200' },
                                React.createElement('h3', { className: 'font-bold text-blue-800 mb-4 flex items-center gap-2' }, React.createElement('span', { className: 'text-xl' }, '⏳'), 'Fila de Espera'),
                                filaAtual.aguardando?.length === 0
                                    ? React.createElement('div', { className: 'text-center py-8 text-gray-500' }, React.createElement('span', { className: 'text-4xl block mb-2' }, '📭'), 'Nenhum na fila')
                                    : React.createElement('div', { className: 'space-y-2' },
                                        filaAtual.aguardando.map((prof, idx) => React.createElement('div', { key: prof.cod_profissional, className: 'bg-white rounded-lg p-3 border border-blue-100 flex items-center justify-between' },
                                            React.createElement('div', { className: 'flex items-center gap-3' },
                                                React.createElement('span', { className: `w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}` }, prof.posicao),
                                                React.createElement('div', null,
                                                    React.createElement('p', { className: 'font-medium text-gray-800' }, prof.nome_profissional),
                                                    React.createElement('p', { className: 'text-xs text-gray-500' }, `#${prof.cod_profissional} • ⏱️ ${formatarTempo(prof.minutos_esperando)}`)
                                                )
                                            ),
                                            React.createElement('div', { className: 'flex gap-2' },
                                                React.createElement('button', { onClick: () => enviarParaRota(prof.cod_profissional), className: 'px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700', title: 'Enviar para Roteiro' }, '🚀'),
                                                React.createElement('button', { onClick: () => removerDaFila(prof.cod_profissional), className: 'px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200', title: 'Remover' }, '❌')
                                            )
                                        ))
                                    )
                            ),
                            // Em Rota
                            React.createElement('div', { className: 'bg-green-50 rounded-xl p-4 border border-green-200' },
                                React.createElement('h3', { className: 'font-bold text-green-800 mb-4 flex items-center gap-2' }, React.createElement('span', { className: 'text-xl' }, '🏍️'), 'Em Rota'),
                                filaAtual.em_rota?.length === 0
                                    ? React.createElement('div', { className: 'text-center py-8 text-gray-500' }, React.createElement('span', { className: 'text-4xl block mb-2' }, '🏠'), 'Nenhum em rota')
                                    : React.createElement('div', { className: 'space-y-2' },
                                        filaAtual.em_rota.map(prof => React.createElement('div', { key: prof.cod_profissional, className: `bg-white rounded-lg p-3 border ${prof.minutos_em_rota > 90 ? 'border-red-300 bg-red-50' : 'border-green-100'} flex items-center justify-between` },
                                            React.createElement('div', { className: 'flex items-center gap-3' },
                                                React.createElement('span', { className: 'text-2xl' }, '🏍️'),
                                                React.createElement('div', null,
                                                    React.createElement('p', { className: 'font-medium text-gray-800' }, prof.nome_profissional),
                                                    React.createElement('p', { className: `text-xs ${prof.minutos_em_rota > 90 ? 'text-red-600 font-bold' : 'text-gray-500'}` }, `#${prof.cod_profissional} • ⏱️ ${formatarTempo(prof.minutos_em_rota)} em rota`)
                                                )
                                            ),
                                            React.createElement('button', { onClick: () => removerDaFila(prof.cod_profissional), className: 'px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200', title: 'Remover' }, '❌')
                                        ))
                                    )
                            )
                        )
                    ),
                    
                    // Aba Vínculos
                    abaAtiva === 'vinculos' && centralSelecionada && React.createElement('div', { className: 'space-y-4' },
                        React.createElement('div', { className: 'flex justify-between items-center' },
                            React.createElement('h3', { className: 'font-bold text-lg' }, `Profissionais vinculados à ${centralSelecionada.nome}`),
                            React.createElement('button', { onClick: () => setModalVinculo(true), className: 'px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700' }, '➕ Vincular Profissional')
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
                                    vinculos.length === 0
                                        ? React.createElement('tr', null, React.createElement('td', { colSpan: 4, className: 'px-4 py-8 text-center text-gray-500' }, 'Nenhum profissional vinculado'))
                                        : vinculos.map(prof => React.createElement('tr', { key: prof.cod_profissional, className: 'hover:bg-gray-50' },
                                            React.createElement('td', { className: 'px-4 py-3 font-mono text-sm' }, prof.cod_profissional),
                                            React.createElement('td', { className: 'px-4 py-3 font-medium' }, prof.nome_profissional),
                                            React.createElement('td', { className: 'px-4 py-3 text-center' },
                                                React.createElement('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${prof.status_fila === 'em_rota' ? 'bg-green-100 text-green-700' : prof.status_fila === 'aguardando' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}` },
                                                    prof.status_fila === 'em_rota' ? '🏍️ Em Rota' : prof.status_fila === 'aguardando' ? '⏳ Na Fila' : '💤 Fora'
                                                )
                                            ),
                                            React.createElement('td', { className: 'px-4 py-3 text-center' },
                                                React.createElement('button', { onClick: () => desvincularProfissional(prof.cod_profissional), className: 'px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200' }, '🗑️ Desvincular')
                                            )
                                        ))
                                )
                            )
                        )
                    ),
                    
                    // Aba Relatórios
                    abaAtiva === 'relatorios' && centralSelecionada && React.createElement('div', { className: 'space-y-6' },
                        React.createElement('div', { className: 'flex items-center gap-4' },
                            React.createElement('label', { className: 'font-medium' }, 'Data:'),
                            React.createElement('input', { type: 'date', value: filtroData, onChange: (e) => setFiltroData(e.target.value), className: 'px-3 py-2 border rounded-lg' }),
                            React.createElement('button', { onClick: () => { carregarEstatisticas(centralSelecionada.id); carregarHistorico(centralSelecionada.id); }, className: 'px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700' }, '🔍 Filtrar')
                        ),
                        estatisticas && React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
                            React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' },
                                React.createElement('p', { className: 'text-sm text-gray-600' }, 'Total de Saídas'),
                                React.createElement('p', { className: 'text-3xl font-bold text-purple-600' }, estatisticas.total_saidas)
                            ),
                            React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' },
                                React.createElement('p', { className: 'text-sm text-gray-600' }, 'Tempo Médio de Espera'),
                                React.createElement('p', { className: 'text-3xl font-bold text-blue-600' }, `${estatisticas.tempo_medio_espera} min`)
                            )
                        ),
                        estatisticas?.ranking?.length > 0 && React.createElement('div', { className: 'bg-white rounded-xl p-4 shadow border' },
                            React.createElement('h3', { className: 'font-bold text-lg mb-4' }, '🏆 Ranking do Dia'),
                            React.createElement('div', { className: 'space-y-2' },
                                estatisticas.ranking.map((prof, idx) => React.createElement('div', { key: prof.cod_profissional, className: 'flex items-center justify-between p-3 bg-gray-50 rounded-lg' },
                                    React.createElement('div', { className: 'flex items-center gap-3' },
                                        React.createElement('span', { className: 'text-xl' }, idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`),
                                        React.createElement('span', { className: 'font-medium' }, prof.nome_profissional)
                                    ),
                                    React.createElement('span', { className: 'font-bold text-purple-600' }, `${prof.total_saidas} saídas`)
                                ))
                            )
                        ),
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
                                        historico.map((h, idx) => React.createElement('tr', { key: idx, className: 'hover:bg-gray-50' },
                                            React.createElement('td', { className: 'px-3 py-2 text-sm' }, formatarHora(h.created_at)),
                                            React.createElement('td', { className: 'px-3 py-2 text-sm font-medium' }, h.nome_profissional),
                                            React.createElement('td', { className: 'px-3 py-2 text-center' },
                                                React.createElement('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${h.acao === 'entrada' ? 'bg-blue-100 text-blue-700' : h.acao === 'enviado_rota' ? 'bg-green-100 text-green-700' : h.acao === 'retorno' ? 'bg-purple-100 text-purple-700' : h.acao === 'removido' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}` },
                                                    h.acao === 'entrada' ? '📥 Entrada' : h.acao === 'enviado_rota' ? '🚀 Enviado' : h.acao === 'retorno' ? '🔄 Retorno' : h.acao === 'removido' ? '❌ Removido' : h.acao === 'saida_voluntaria' ? '👋 Saiu' : h.acao
                                                )
                                            ),
                                            React.createElement('td', { className: 'px-3 py-2 text-right text-sm text-gray-500' }, h.tempo_espera_minutos ? `${h.tempo_espera_minutos} min espera` : h.tempo_rota_minutos ? `${h.tempo_rota_minutos} min rota` : '-')
                                        ))
                                    )
                                )
                            )
                        )
                    ),
                    
                    // Aba Config
                    abaAtiva === 'config' && React.createElement('div', { className: 'space-y-4' },
                        React.createElement('h3', { className: 'font-bold text-lg' }, 'Centrais Cadastradas'),
                        React.createElement('div', { className: 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' },
                            centrais.map(central => React.createElement('div', { key: central.id, className: `bg-white rounded-xl p-4 shadow border ${central.ativa ? 'border-green-200' : 'border-red-200 opacity-60'}` },
                                React.createElement('div', { className: 'flex justify-between items-start mb-3' },
                                    React.createElement('div', null,
                                        React.createElement('h4', { className: 'font-bold text-gray-800' }, central.nome),
                                        React.createElement('p', { className: 'text-sm text-gray-500' }, central.endereco)
                                    ),
                                    React.createElement('span', { className: `px-2 py-1 rounded-full text-xs font-medium ${central.ativa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}` }, central.ativa ? 'Ativa' : 'Inativa')
                                ),
                                React.createElement('div', { className: 'text-sm text-gray-600 mb-3' },
                                    React.createElement('p', null, `📍 Lat: ${central.latitude}, Lng: ${central.longitude}`),
                                    React.createElement('p', null, `📏 Raio: ${central.raio_metros}m`)
                                ),
                                React.createElement('div', { className: 'flex gap-2' },
                                    React.createElement('button', { onClick: () => setModalCentral(central), className: 'flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200' }, '✏️ Editar'),
                                    React.createElement('button', {
                                        onClick: async () => {
                                            if (!window.confirm('Confirma excluir esta central?')) return;
                                            try {
                                                const response = await fetchAuth(`${apiUrl}/filas/centrais/${central.id}`, { method: 'DELETE' });
                                                const data = await response.json();
                                                if (data.success) { showToast('Central excluída!', 'success'); carregarCentrais(); }
                                                else showToast(data.error, 'error');
                                            } catch (e) { showToast('Erro ao excluir', 'error'); }
                                        },
                                        className: 'px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200'
                                    }, '🗑️')
                                )
                            ))
                        )
                    ),
                    
                    !centralSelecionada && abaAtiva !== 'config' && React.createElement('div', { className: 'text-center py-12 text-gray-500' },
                        React.createElement('span', { className: 'text-5xl block mb-4' }, '👆'),
                        React.createElement('p', { className: 'text-lg' }, 'Selecione uma central para gerenciar')
                    )
                )
            ),
            
            // Modal Criar/Editar Central
            modalCentral && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
                React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-md' },
                    React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-2xl text-white' },
                        React.createElement('h2', { className: 'text-xl font-bold' }, modalCentral.id ? '✏️ Editar Central' : '➕ Nova Central')
                    ),
                    React.createElement('form', {
                        className: 'p-6 space-y-4',
                        onSubmit: (e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target);
                            salvarCentral({ id: modalCentral.id, nome: fd.get('nome'), endereco: fd.get('endereco'), latitude: parseFloat(fd.get('latitude')), longitude: parseFloat(fd.get('longitude')), raio_metros: parseInt(fd.get('raio_metros')), ativa: fd.get('ativa') === 'on' });
                        }
                    },
                        React.createElement('div', null,
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Nome da Central'),
                            React.createElement('input', { name: 'nome', defaultValue: modalCentral.nome || '', required: true, className: 'w-full px-3 py-2 border rounded-lg', placeholder: 'Ex: Fila Comando' })
                        ),
                        React.createElement('div', null,
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Endereço'),
                            React.createElement('input', { name: 'endereco', defaultValue: modalCentral.endereco || '', required: true, className: 'w-full px-3 py-2 border rounded-lg', placeholder: 'Rua, número, bairro, cidade' })
                        ),
                        React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
                            React.createElement('div', null,
                                React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Latitude'),
                                React.createElement('input', { name: 'latitude', type: 'number', step: 'any', defaultValue: modalCentral.latitude || '', required: true, className: 'w-full px-3 py-2 border rounded-lg', placeholder: '-16.6869' })
                            ),
                            React.createElement('div', null,
                                React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Longitude'),
                                React.createElement('input', { name: 'longitude', type: 'number', step: 'any', defaultValue: modalCentral.longitude || '', required: true, className: 'w-full px-3 py-2 border rounded-lg', placeholder: '-49.2648' })
                            )
                        ),
                        React.createElement('div', null,
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Raio permitido (metros)'),
                            React.createElement('input', { name: 'raio_metros', type: 'number', defaultValue: modalCentral.raio_metros || 900, required: true, className: 'w-full px-3 py-2 border rounded-lg', placeholder: '900' })
                        ),
                        modalCentral.id && React.createElement('div', { className: 'flex items-center gap-2' },
                            React.createElement('input', { name: 'ativa', type: 'checkbox', defaultChecked: modalCentral.ativa !== false, className: 'w-4 h-4' }),
                            React.createElement('label', { className: 'text-sm font-medium text-gray-700' }, 'Central ativa')
                        ),
                        React.createElement('div', { className: 'flex gap-3 pt-4' },
                            React.createElement('button', { type: 'button', onClick: () => setModalCentral(null), className: 'flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300' }, 'Cancelar'),
                            React.createElement('button', { type: 'submit', className: 'flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700' }, '💾 Salvar')
                        )
                    )
                )
            ),
            
            // Modal Vincular
            modalVinculo && centralSelecionada && React.createElement('div', { className: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4' },
                React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden' },
                    React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white' },
                        React.createElement('h2', { className: 'text-xl font-bold' }, '👥 Vincular Profissional'),
                        React.createElement('p', { className: 'text-purple-200 text-sm' }, `à ${centralSelecionada.nome}`)
                    ),
                    React.createElement('div', { className: 'p-4 overflow-y-auto max-h-[60vh]' },
                        React.createElement('input', { type: 'text', placeholder: '🔍 Buscar por nome ou código...', className: 'w-full px-3 py-2 border rounded-lg mb-4', onChange: (e) => { const s = e.target.value.toLowerCase(); document.querySelectorAll('.prof-item').forEach(el => { el.style.display = el.textContent.toLowerCase().includes(s) ? '' : 'none'; }); } }),
                        React.createElement('div', { className: 'space-y-2' },
                            profissionaisDisponiveis.map(prof => React.createElement('div', { key: prof.cod_profissional, className: 'prof-item flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100' },
                                React.createElement('div', null,
                                    React.createElement('p', { className: 'font-medium' }, prof.full_name),
                                    React.createElement('p', { className: 'text-xs text-gray-500' }, `#${prof.cod_profissional}`)
                                ),
                                React.createElement('button', { onClick: () => { vincularProfissional(prof.cod_profissional, prof.full_name); setModalVinculo(false); }, className: 'px-3 py-1 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700' }, '➕ Vincular')
                            ))
                        )
                    ),
                    React.createElement('div', { className: 'p-4 border-t' },
                        React.createElement('button', { onClick: () => setModalVinculo(false), className: 'w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300' }, 'Fechar')
                    )
                )
            )
        );
    }
    
    // ==================== RENDERIZAÇÃO USER ====================
    
    if (loading) {
        return React.createElement('div', { className: 'flex items-center justify-center min-h-[400px]' },
            React.createElement('div', { className: 'text-center' },
                React.createElement('div', { className: 'w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4' }),
                React.createElement('p', { className: 'text-gray-600' }, 'Carregando...')
            )
        );
    }
    
    if (!minhaCentral) {
        return React.createElement('div', { className: 'min-h-[400px] flex items-center justify-center' },
            React.createElement('div', { className: 'text-center bg-white rounded-2xl shadow-lg p-8 max-w-md mx-4' },
                React.createElement('span', { className: 'text-6xl block mb-4' }, '🚫'),
                React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-2' }, 'Sem Acesso à Fila'),
                React.createElement('p', { className: 'text-gray-600' }, 'Você não está vinculado a nenhuma central de fila.'),
                React.createElement('p', { className: 'text-gray-500 text-sm mt-2' }, 'Entre em contato com um administrador para ser vinculado.')
            )
        );
    }
    
    const podeChekin = gpsStatus === 'permitido' && (distanciaCentral === null || distanciaCentral <= minhaCentral.raio_metros);
    
    return React.createElement('div', { className: 'max-w-lg mx-auto p-4 space-y-6' },
        // Header
        React.createElement('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg' },
            React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
                React.createElement('span', { className: 'text-4xl' }, '📍'),
                React.createElement('div', null,
                    React.createElement('h1', { className: 'text-xl font-bold' }, minhaCentral.central_nome),
                    React.createElement('p', { className: 'text-purple-200 text-sm' }, minhaCentral.endereco)
                )
            ),
            React.createElement('div', { className: `flex items-center gap-2 p-3 rounded-xl ${gpsStatus === 'permitido' ? 'bg-green-500/20' : gpsStatus === 'negado' ? 'bg-red-500/20' : 'bg-yellow-500/20'}` },
                React.createElement('span', { className: 'text-xl' }, gpsStatus === 'permitido' ? '📡' : gpsStatus === 'negado' ? '🚫' : '⏳'),
                React.createElement('div', { className: 'flex-1' },
                    React.createElement('p', { className: 'font-medium text-sm' }, gpsStatus === 'permitido' ? 'GPS Ativo' : gpsStatus === 'negado' ? 'GPS Bloqueado' : gpsStatus === 'indisponivel' ? 'GPS Indisponível' : 'Verificando GPS...'),
                    distanciaCentral !== null && gpsStatus === 'permitido' && React.createElement('p', { className: `text-xs ${distanciaCentral <= minhaCentral.raio_metros ? 'text-green-200' : 'text-red-200'}` }, `Você está a ${distanciaCentral}m da central (máx ${minhaCentral.raio_metros}m)`)
                ),
                gpsStatus === 'negado' && React.createElement('button', { onClick: solicitarGPS, className: 'px-3 py-1 bg-white/20 rounded-lg text-sm font-medium' }, 'Tentar novamente')
            )
        ),
        
        gpsStatus === 'negado' ? React.createElement('div', { className: 'bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center' },
            React.createElement('span', { className: 'text-5xl block mb-4' }, '📍'),
            React.createElement('h2', { className: 'text-lg font-bold text-red-800 mb-2' }, 'Permissão de Localização Necessária'),
            React.createElement('p', { className: 'text-red-600 mb-4' }, 'Para usar a fila, você precisa permitir o acesso à sua localização.'),
            React.createElement('button', { onClick: solicitarGPS, className: 'px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700' }, '🔓 Permitir Localização')
        ) : React.createElement(React.Fragment, null,
            // Em Rota
            minhaPosicao?.status === 'em_rota' && React.createElement('div', { className: 'bg-green-50 border-2 border-green-300 rounded-2xl p-6' },
                React.createElement('div', { className: 'flex items-center gap-4 mb-4' },
                    React.createElement('span', { className: 'text-5xl' }, '🏍️'),
                    React.createElement('div', null,
                        React.createElement('h2', { className: 'text-xl font-bold text-green-800' }, 'Você está em Rota!'),
                        React.createElement('p', { className: 'text-green-600' }, `⏱️ ${formatarTempo(minhaPosicao.minutos_em_rota)} em serviço`)
                    )
                ),
                React.createElement('button', { onClick: entrarNaFila, disabled: !podeChekin, className: `w-full py-4 rounded-xl font-bold text-lg transition-all ${!podeChekin ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'}` }, '🔄 Retornar para a Fila')
            ),
            
            // Na Fila
            minhaPosicao?.status === 'aguardando' && React.createElement('div', { className: 'bg-blue-50 border-2 border-blue-300 rounded-2xl p-6' },
                React.createElement('div', { className: 'text-center mb-6' },
                    React.createElement('p', { className: 'text-blue-600 text-sm mb-2' }, 'Sua posição na fila'),
                    React.createElement('div', { className: 'text-6xl font-bold text-blue-800 mb-2' }, minhaPosicao.minha_posicao),
                    React.createElement('p', { className: 'text-blue-600' }, `de ${minhaPosicao.total_na_fila} • ⏱️ ${formatarTempo(minhaPosicao.minutos_esperando)}`)
                ),
                (minhaPosicao.na_frente?.length > 0 || minhaPosicao.atras?.length > 0) && React.createElement('div', { className: 'space-y-2 mb-6' },
                    minhaPosicao.na_frente?.map(p => React.createElement('div', { key: p.cod_profissional, className: 'flex items-center gap-2 p-2 bg-white/50 rounded-lg' },
                        React.createElement('span', { className: 'w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold' }, p.posicao),
                        React.createElement('span', { className: 'text-sm text-gray-700' }, p.nome_profissional)
                    )),
                    React.createElement('div', { className: 'flex items-center gap-2 p-3 bg-purple-100 rounded-lg border-2 border-purple-300' },
                        React.createElement('span', { className: 'w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold' }, minhaPosicao.minha_posicao),
                        React.createElement('span', { className: 'font-bold text-purple-800' }, 'Você')
                    ),
                    minhaPosicao.atras?.map(p => React.createElement('div', { key: p.cod_profissional, className: 'flex items-center gap-2 p-2 bg-white/50 rounded-lg' },
                        React.createElement('span', { className: 'w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold' }, p.posicao),
                        React.createElement('span', { className: 'text-sm text-gray-700' }, p.nome_profissional)
                    ))
                ),
                React.createElement('button', { onClick: sairDaFila, className: 'w-full py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200' }, '👋 Sair da Fila')
            ),
            
            // Fora da Fila
            !minhaPosicao?.na_fila && React.createElement('div', { className: 'bg-white rounded-2xl shadow-lg p-6' },
                React.createElement('div', { className: 'text-center mb-6' },
                    React.createElement('span', { className: 'text-6xl block mb-4' }, '🏁'),
                    React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, 'Pronto para trabalhar?'),
                    React.createElement('p', { className: 'text-gray-600' }, 'Entre na fila e aguarde ser chamado!')
                ),
                React.createElement('button', { onClick: entrarNaFila, disabled: !podeChekin, className: `w-full py-4 rounded-xl font-bold text-lg transition-all ${!podeChekin ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'}` },
                    gpsStatus !== 'permitido' ? '📍 Aguardando GPS...' : distanciaCentral !== null && distanciaCentral > minhaCentral.raio_metros ? `📍 Muito longe (${distanciaCentral}m)` : '🚀 Entrar na Fila'
                ),
                distanciaCentral !== null && distanciaCentral > minhaCentral.raio_metros && React.createElement('p', { className: 'text-center text-red-500 text-sm mt-2' }, `Aproxime-se da central (você está a ${distanciaCentral}m, máximo ${minhaCentral.raio_metros}m)`)
            )
        )
    );
}

// Expor globalmente
window.ModuloFilas = ModuloFilas;
