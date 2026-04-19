// ==================== MÓDULO COLETA DE ENDEREÇOS ====================
// Arquivo: modulo-coleta.js
// Base colaborativa: motoboys cadastram endereços, admin valida, todos usam.
// Self-contained: gerencia próprio estado e fetch.
//
// Comportamento dual-mode baseado em usuario.role:
//   - 'user' (motoboy): cadastrar, consultar, wallet — UI mobile-first
//   - 'admin' / 'admin_master': regiões, vínculos, fila de validação
// =====================================================================

(function() {
    'use strict';

    const { useState, useEffect, useCallback, useMemo, useRef } = React;
    const h = React.createElement;

    // Utilitário Haversine pra mostrar distância das sugestões de match no mapa
    function distMetros(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const toRad = d => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Comprime imagem antes de enviar: max 1280px, JPEG 75%
    function comprimirImagem(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 1280;
                    let w = img.width, hImg = img.height;
                    if (w > hImg && w > MAX) { hImg = Math.round(hImg * MAX / w); w = MAX; }
                    else if (hImg > MAX) { w = Math.round(w * MAX / hImg); hImg = MAX; }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = hImg;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, hImg);
                    resolve(canvas.toDataURL('image/jpeg', 0.75));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    window.ModuloColetaComponent = function(props) {
        const usuario = props.usuario || props.l;
        const apiUrl = props.API_URL;
        const getToken = props.getToken;
        const showToast = props.showToast || props.ja || (() => {});

        const isAdmin = usuario?.role === 'admin' || usuario?.role === 'admin_master';
        const isMotoboy = !isAdmin; // role = 'user'

        const fetchApi = useCallback(async (endpoint, options = {}) => {
            const token = getToken();
            const res = await fetch(apiUrl + endpoint, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token,
                    ...(options.headers || {})
                },
                credentials: 'include'
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
            return data;
        }, [apiUrl, getToken]);

        // ================================================================
        // MODO MOTOBOY
        // ================================================================
        if (isMotoboy) return h(ViewMotoboy, { fetchApi, showToast });

        // ================================================================
        // MODO ADMIN
        // ================================================================
        return h(ViewAdmin, { fetchApi, showToast });
    };

    // ==================== VIEW MOTOBOY (mobile-first) ====================
    function ViewMotoboy({ fetchApi, showToast }) {
        const [tab, setTab] = useState('cadastrar'); // cadastrar | consultar | wallet
        const [regioes, setRegioes] = useState([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            fetchApi('/api/motoboy/coleta/minhas-regioes')
                .then(setRegioes)
                .catch(err => showToast('❌ ' + err.message, 'error'))
                .finally(() => setLoading(false));
        }, []);

        if (loading) {
            return h('div', { className: 'min-h-screen flex items-center justify-center' },
                h('div', { className: 'text-center' },
                    h('div', { className: 'animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3' }),
                    h('p', { className: 'text-gray-600 text-sm' }, 'Carregando...')
                )
            );
        }

        if (regioes.length === 0) {
            return h('div', { className: 'max-w-md mx-auto p-4 mt-8' },
                h('div', { className: 'bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5 text-center' },
                    h('div', { className: 'text-5xl mb-3' }, '📍'),
                    h('div', { className: 'font-bold text-yellow-800 mb-1' }, 'Ainda sem regiões vinculadas'),
                    h('div', { className: 'text-sm text-yellow-700' }, 'Entre em contato com o admin para ser incluído em uma região e começar a cadastrar endereços.')
                )
            );
        }

        return h('div', { className: 'min-h-screen bg-gray-50 pb-20' },
            // Header mobile
            h('div', { className: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 sticky top-0 z-30 shadow-md' },
                h('div', { className: 'flex items-center justify-between' },
                    h('div', null,
                        h('h1', { className: 'font-bold text-lg' }, '📍 Coleta de Endereços'),
                        h('p', { className: 'text-xs text-purple-100' }, regioes.length + ' região(ões) vinculada(s)')
                    )
                )
            ),

            // Conteúdo da aba
            tab === 'cadastrar' && h(TabCadastrar, { fetchApi, showToast, regioes }),
            tab === 'consultar' && h(TabConsultar, { fetchApi, showToast }),
            tab === 'wallet' && h(TabWallet, { fetchApi, showToast }),

            // Bottom navigation mobile
            h('div', { className: 'fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40' },
                h('div', { className: 'flex justify-around max-w-md mx-auto' },
                    [
                        { id: 'cadastrar', icon: '➕', label: 'Cadastrar' },
                        { id: 'consultar', icon: '🔍', label: 'Consultar' },
                        { id: 'wallet', icon: '💰', label: 'Ganhos' }
                    ].map(t => h('button', {
                        key: t.id,
                        onClick: () => setTab(t.id),
                        className: 'flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ' +
                            (tab === t.id ? 'text-purple-600 bg-purple-50' : 'text-gray-500')
                    },
                        h('span', { className: 'text-xl' }, t.icon),
                        h('span', { className: 'text-xs font-medium' }, t.label)
                    ))
                )
            )
        );
    }

    // ==================== TAB CADASTRAR ====================
    function TabCadastrar({ fetchApi, showToast, regioes }) {
        const [regiaoId, setRegiaoId] = useState(regioes[0]?.id || '');
        const [nomeCliente, setNomeCliente] = useState('');
        const [gps, setGps] = useState(null); // { lat, lng, accuracy }
        const [capturandoGps, setCapturandoGps] = useState(false);
        const [foto, setFoto] = useState(null); // base64
        const [fotoPreview, setFotoPreview] = useState(null);
        const [enviando, setEnviando] = useState(false);
        const [resultado, setResultado] = useState(null); // resposta da api após cadastro
        const fileInputRef = useRef(null);

        const capturarGps = () => {
            if (!navigator.geolocation) {
                showToast('❌ GPS não disponível', 'error');
                return;
            }
            setCapturandoGps(true);
            navigator.geolocation.getCurrentPosition(
                pos => {
                    setGps({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: Math.round(pos.coords.accuracy)
                    });
                    setCapturandoGps(false);
                    showToast('📍 Localização capturada', 'success');
                },
                err => {
                    setCapturandoGps(false);
                    showToast('❌ ' + (err.code === 1 ? 'Permissão de GPS negada' : 'Erro ao capturar GPS'), 'error');
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        };

        const selecionarFoto = async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                const base64 = await comprimirImagem(file);
                setFoto(base64);
                setFotoPreview(base64);
            } catch {
                showToast('❌ Erro ao processar foto', 'error');
            }
        };

        const limparForm = () => {
            setNomeCliente(''); setGps(null); setFoto(null); setFotoPreview(null);
            setResultado(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };

        const enviar = async () => {
            if (!regiaoId) return showToast('Selecione uma região', 'warning');
            if (!nomeCliente.trim()) return showToast('Digite o nome do cliente', 'warning');
            if (!gps) return showToast('Capture a localização primeiro', 'warning');

            setEnviando(true);
            try {
                const resp = await fetchApi('/api/motoboy/coleta', {
                    method: 'POST',
                    body: JSON.stringify({
                        regiao_id: parseInt(regiaoId),
                        nome_cliente: nomeCliente.trim(),
                        latitude: gps.lat,
                        longitude: gps.lng,
                        foto_base64: foto
                    })
                });
                setResultado(resp);
                showToast(resp.mensagem || '✅ Cadastrado!', 'success');
            } catch (err) {
                // Erro 409 (duplicata) vem como mensagem simples; só mostramos
                showToast('❌ ' + err.message, 'error');
            } finally {
                setEnviando(false);
            }
        };

        // Tela de resultado pós-cadastro
        if (resultado) {
            const aprovado = resultado.auto_aprovado;
            return h('div', { className: 'max-w-md mx-auto p-4' },
                h('div', {
                    className: 'rounded-xl p-6 text-center ' +
                        (aprovado ? 'bg-green-50 border-2 border-green-300' : 'bg-blue-50 border-2 border-blue-300')
                },
                    h('div', { className: 'text-6xl mb-3' }, aprovado ? '✅' : '⏳'),
                    h('div', { className: 'font-bold text-lg mb-2' },
                        aprovado ? 'Aprovado Automaticamente!' : 'Em Análise'
                    ),
                    h('div', { className: 'text-sm text-gray-700 mb-3' }, resultado.mensagem),
                    resultado.confianca > 0 && h('div', { className: 'text-xs text-gray-600 mb-1' },
                        'Confiança IA: ', h('strong', null, resultado.confianca + '%')
                    ),
                    resultado.match_google && h('div', { className: 'text-xs text-gray-600 mb-3' },
                        'Google encontrou: "', h('strong', null, resultado.match_google.nome), '"'
                    ),
                    h('div', {
                        className: 'text-lg font-bold mb-4 ' + (aprovado ? 'text-green-700' : 'text-blue-700')
                    },
                        aprovado ? '💰 R$ 1,00 confirmado' : '💰 R$ 1,00 previsto'
                    ),
                    h('button', {
                        onClick: limparForm,
                        className: 'w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700'
                    }, '+ Cadastrar outro')
                )
            );
        }

        return h('div', { className: 'max-w-md mx-auto p-4 space-y-4' },
            // Região
            h('div', { className: 'bg-white rounded-xl shadow p-4' },
                h('label', { className: 'text-xs font-bold text-gray-600 uppercase mb-1 block' }, '📍 Região'),
                h('select', {
                    value: regiaoId,
                    onChange: e => setRegiaoId(e.target.value),
                    className: 'w-full px-3 py-2 border rounded-lg text-sm bg-white'
                }, regioes.map(r => h('option', { key: r.id, value: r.id }, r.nome + (r.cidade ? ' - ' + r.cidade : ''))))
            ),

            // Nome do cliente (CAPS)
            h('div', { className: 'bg-white rounded-xl shadow p-4' },
                h('label', { className: 'text-xs font-bold text-gray-600 uppercase mb-1 block' }, '🏪 Nome do Cliente *'),
                h('input', {
                    type: 'text',
                    value: nomeCliente,
                    onChange: e => setNomeCliente(e.target.value.toUpperCase()),
                    style: { textTransform: 'uppercase' },
                    placeholder: 'EX: BOM DIA PECAS',
                    className: 'w-full px-3 py-2 border rounded-lg text-sm'
                })
            ),

            // GPS
            h('div', { className: 'bg-white rounded-xl shadow p-4' },
                h('label', { className: 'text-xs font-bold text-gray-600 uppercase mb-2 block' }, '📍 Localização *'),
                h('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-2 mb-3' },
                    h('div', { className: 'text-xs text-red-700 font-medium' }, '⚠️ Só capture se estiver EXATAMENTE na frente do local!')
                ),
                gps ? h('div', { className: 'space-y-2' },
                    h('div', { className: 'bg-green-50 border border-green-300 rounded-lg p-3' },
                        h('div', { className: 'text-xs text-green-700 font-bold mb-1' }, '✅ Localização capturada'),
                        h('div', { className: 'text-xs text-gray-600 font-mono' }, gps.lat.toFixed(6) + ', ' + gps.lng.toFixed(6)),
                        h('div', { className: 'text-xs text-gray-500 mt-0.5' }, 'Precisão: ~' + gps.accuracy + 'm')
                    ),
                    h('button', {
                        onClick: capturarGps,
                        disabled: capturandoGps,
                        className: 'w-full py-2 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-50'
                    }, '🔄 Recapturar')
                ) : h('button', {
                    onClick: capturarGps,
                    disabled: capturandoGps,
                    className: 'w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50'
                }, capturandoGps ? '⏳ Capturando...' : '📍 Capturar localização atual')
            ),

            // Foto
            h('div', { className: 'bg-white rounded-xl shadow p-4' },
                h('label', { className: 'text-xs font-bold text-gray-600 uppercase mb-1 block' }, '📸 Foto da Fachada (opcional)'),
                h('div', { className: 'text-xs text-gray-500 mb-2' }, 'Com foto, aumenta a chance de aprovação automática'),
                fotoPreview ? h('div', { className: 'space-y-2' },
                    h('img', { src: fotoPreview, className: 'w-full rounded-lg max-h-60 object-cover' }),
                    h('button', {
                        onClick: () => { setFoto(null); setFotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; },
                        className: 'w-full py-2 border border-red-300 text-red-700 rounded-lg text-sm'
                    }, '🗑️ Remover foto')
                ) : h('div', null,
                    h('input', {
                        type: 'file',
                        accept: 'image/*',
                        capture: 'environment',
                        ref: fileInputRef,
                        onChange: selecionarFoto,
                        className: 'hidden',
                        id: 'foto-fachada'
                    }),
                    h('label', {
                        htmlFor: 'foto-fachada',
                        className: 'block w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-600 cursor-pointer hover:border-purple-400'
                    }, '📷 Tirar foto da fachada')
                )
            ),

            // Enviar
            h('button', {
                onClick: enviar,
                disabled: enviando || !regiaoId || !nomeCliente.trim() || !gps,
                className: 'w-full py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed'
            }, enviando ? '⏳ Enviando...' : '✅ Enviar Cadastro')
        );
    }

    // ==================== TAB CONSULTAR ====================
    function TabConsultar({ fetchApi, showToast }) {
        const [dados, setDados] = useState({ aprovados: [], meus_pendentes: [] });
        const [loading, setLoading] = useState(true);
        const [filtro, setFiltro] = useState('');
        const [modalFoto, setModalFoto] = useState(null);

        const carregar = useCallback(() => {
            setLoading(true);
            const q = filtro.trim() ? '?q=' + encodeURIComponent(filtro) : '';
            fetchApi('/api/motoboy/coleta/enderecos' + q)
                .then(setDados)
                .catch(err => showToast('❌ ' + err.message, 'error'))
                .finally(() => setLoading(false));
        }, [filtro]);

        useEffect(() => {
            const t = setTimeout(carregar, 300);
            return () => clearTimeout(t);
        }, [carregar]);

        const abrirFoto = async (pendenteId) => {
            try {
                const r = await fetchApi('/api/motoboy/coleta/enderecos/' + pendenteId + '/foto');
                setModalFoto(r.foto);
            } catch {
                showToast('Foto indisponível', 'warning');
            }
        };

        const abrirMaps = (lat, lng) => window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        const abrirWaze = (lat, lng) => window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');

        return h('div', { className: 'max-w-md mx-auto p-4 space-y-3' },
            h('input', {
                type: 'text',
                value: filtro,
                onChange: e => setFiltro(e.target.value),
                placeholder: '🔍 Filtrar por nome ou endereço...',
                className: 'w-full px-3 py-2 border rounded-lg text-sm'
            }),

            loading && h('div', { className: 'text-center py-8 text-gray-400' }, '⏳ Carregando...'),

            !loading && dados.meus_pendentes.length > 0 && h('div', null,
                h('h3', { className: 'text-xs font-bold text-gray-500 uppercase mb-2' }, 'Meus cadastros pendentes'),
                h('div', { className: 'space-y-2' },
                    dados.meus_pendentes.map(p => h('div', {
                        key: 'p-' + p.id,
                        className: 'rounded-lg p-3 border-2 ' +
                            (p.status === 'rejeitado' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200')
                    },
                        h('div', { className: 'flex items-start justify-between gap-2' },
                            h('div', { className: 'flex-1' },
                                h('div', { className: 'font-bold text-sm' }, p.apelido || p.nome_cliente),
                                h('div', { className: 'text-xs text-gray-600 mt-0.5' }, p.endereco_completo || '(em análise)'),
                                h('div', { className: 'text-xs mt-1 ' + (p.status === 'rejeitado' ? 'text-red-700' : 'text-yellow-700') },
                                    p.status === 'rejeitado' ? '❌ Rejeitado: ' + (p.motivo_rejeicao || '') : '⏳ Aguardando admin'
                                )
                            )
                        )
                    ))
                )
            ),

            !loading && dados.aprovados.length > 0 && h('div', null,
                h('h3', { className: 'text-xs font-bold text-gray-500 uppercase mb-2 mt-4' }, 'Endereços das minhas regiões (' + dados.aprovados.length + ')'),
                h('div', { className: 'space-y-2' },
                    dados.aprovados.map(e => h('div', {
                        key: 'a-' + e.id,
                        className: 'bg-white rounded-lg p-3 shadow border border-gray-200'
                    },
                        h('div', { className: 'font-bold text-sm text-purple-800' }, '⭐ ' + (e.apelido || '(sem nome)')),
                        h('div', { className: 'text-xs text-gray-700 mt-0.5 break-words' }, e.endereco_completo || '-'),
                        e.regiao_nome && h('div', { className: 'text-xs text-gray-500 mt-0.5' }, '📍 ' + e.regiao_nome),
                        h('div', { className: 'flex gap-1 mt-2 pt-2 border-t border-gray-100' },
                            e.tem_foto && e.pendente_id && h('button', {
                                onClick: () => abrirFoto(e.pendente_id),
                                className: 'flex-1 py-1.5 text-xs bg-gray-100 text-gray-700 rounded'
                            }, '📷 Foto'),
                            h('button', {
                                onClick: () => abrirMaps(e.latitude, e.longitude),
                                className: 'flex-1 py-1.5 text-xs bg-blue-100 text-blue-700 rounded'
                            }, '🗺️ Maps'),
                            h('button', {
                                onClick: () => abrirWaze(e.latitude, e.longitude),
                                className: 'flex-1 py-1.5 text-xs bg-indigo-100 text-indigo-700 rounded'
                            }, '🚗 Waze')
                        )
                    ))
                )
            ),

            !loading && dados.aprovados.length === 0 && dados.meus_pendentes.length === 0 && h('div', {
                className: 'text-center py-8 text-gray-400'
            },
                h('div', { className: 'text-4xl mb-2' }, '📭'),
                h('div', { className: 'text-sm' }, filtro ? 'Nenhum resultado' : 'Nenhum endereço ainda')
            ),

            // Modal foto
            modalFoto && h('div', {
                onClick: () => setModalFoto(null),
                className: 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4'
            },
                h('img', { src: modalFoto, className: 'max-w-full max-h-full rounded-lg' }),
                h('button', {
                    onClick: () => setModalFoto(null),
                    className: 'absolute top-4 right-4 text-white text-3xl'
                }, '✕')
            )
        );
    }

    // ==================== TAB WALLET ====================
    function TabWallet({ fetchApi, showToast }) {
        const [dados, setDados] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            fetchApi('/api/motoboy/coleta/ganhos')
                .then(setDados)
                .catch(err => showToast('❌ ' + err.message, 'error'))
                .finally(() => setLoading(false));
        }, []);

        if (loading) return h('div', { className: 'text-center py-8 text-gray-400' }, '⏳ Carregando...');
        if (!dados) return null;

        const { saldo, historico } = dados;
        const fmt = v => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');

        return h('div', { className: 'max-w-md mx-auto p-4 space-y-4' },
            // Cards de saldo
            h('div', { className: 'grid grid-cols-2 gap-3' },
                h('div', { className: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-4 shadow-lg' },
                    h('div', { className: 'text-xs opacity-90 mb-1' }, '✅ Confirmado'),
                    h('div', { className: 'text-2xl font-bold' }, fmt(saldo.total_confirmado)),
                    h('div', { className: 'text-xs opacity-80 mt-1' }, saldo.qtd_confirmada + ' endereço(s)')
                ),
                h('div', { className: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-4 shadow-lg' },
                    h('div', { className: 'text-xs opacity-90 mb-1' }, '⏳ Previsto'),
                    h('div', { className: 'text-2xl font-bold' }, fmt(saldo.total_previsto)),
                    h('div', { className: 'text-xs opacity-80 mt-1' }, saldo.qtd_prevista + ' endereço(s)')
                )
            ),

            h('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800' },
                '💡 Valores acumulados. Pagamento será combinado posteriormente.'
            ),

            // Histórico
            h('div', null,
                h('h3', { className: 'text-xs font-bold text-gray-500 uppercase mb-2' }, 'Histórico recente'),
                historico.length === 0 ? h('div', { className: 'text-center py-6 text-gray-400 text-sm' }, 'Nenhum cadastro ainda')
                : h('div', { className: 'space-y-2' },
                    historico.map(g => h('div', {
                        key: g.id,
                        className: 'bg-white rounded-lg p-3 shadow-sm border border-gray-100'
                    },
                        h('div', { className: 'flex items-center justify-between gap-2' },
                            h('div', { className: 'flex-1 min-w-0' },
                                h('div', { className: 'font-medium text-sm truncate' }, g.nome_cliente),
                                h('div', { className: 'text-xs text-gray-500' }, g.regiao_nome || '-'),
                                h('div', {
                                    className: 'text-xs mt-0.5 ' +
                                        (g.status === 'confirmado' ? 'text-green-600' :
                                         g.status === 'previsto' ? 'text-blue-600' : 'text-gray-500')
                                }, g.status === 'confirmado' ? '✅ Confirmado' :
                                   g.status === 'previsto' ? '⏳ Aguardando validação' : '💳 Pago')
                            ),
                            h('div', {
                                className: 'font-bold ' +
                                    (g.status === 'confirmado' ? 'text-green-600' : 'text-blue-600')
                            }, fmt(g.valor))
                        )
                    ))
                )
            )
        );
    }

    // ==================== VIEW ADMIN ====================
    function ViewAdmin({ fetchApi, showToast }) {
        const [tab, setTab] = useState('fila');

        return h('div', { className: 'p-4 bg-gray-50 min-h-screen' },
            h('div', { className: 'max-w-7xl mx-auto' },
                h('div', { className: 'flex items-center justify-between mb-4' },
                    h('h1', { className: 'text-xl font-bold text-gray-800' }, '📍 Coleta de Endereços — Admin')
                ),
                h('div', { className: 'flex gap-2 mb-4 border-b' },
                    [
                        { id: 'fila', label: '⏳ Fila de Validação' },
                        { id: 'regioes', label: '🌎 Regiões' },
                        { id: 'stats', label: '📊 Estatísticas' }
                    ].map(t => h('button', {
                        key: t.id,
                        onClick: () => setTab(t.id),
                        className: 'px-4 py-2 text-sm font-medium border-b-2 transition-colors ' +
                            (tab === t.id ? 'text-purple-600 border-purple-600' : 'text-gray-500 border-transparent')
                    }, t.label))
                ),
                tab === 'fila' && h(AdminFila, { fetchApi, showToast }),
                tab === 'regioes' && h(AdminRegioes, { fetchApi, showToast }),
                tab === 'stats' && h(AdminStats, { fetchApi, showToast })
            )
        );
    }

    // ==================== ADMIN - FILA ====================
    function AdminFila({ fetchApi, showToast }) {
        const [pendentes, setPendentes] = useState([]);
        const [loading, setLoading] = useState(true);
        const [detalhe, setDetalhe] = useState(null);
        const [fotoAtual, setFotoAtual] = useState(null);
        const [nomeEdit, setNomeEdit] = useState('');
        const [acao, setAcao] = useState(''); // 'rejeitando'
        const [motivoRejeicao, setMotivoRejeicao] = useState('');
        const [processando, setProcessando] = useState(false);

        const carregar = useCallback(() => {
            setLoading(true);
            fetchApi('/api/admin/coleta/fila')
                .then(setPendentes)
                .catch(err => showToast('❌ ' + err.message, 'error'))
                .finally(() => setLoading(false));
        }, []);

        useEffect(() => { carregar(); }, []);

        const abrirDetalhe = async p => {
            setDetalhe(p);
            setNomeEdit(p.nome_cliente);
            setFotoAtual(null);
            setAcao(''); setMotivoRejeicao('');
            if (p.tem_foto) {
                try {
                    const r = await fetchApi('/api/admin/coleta/fila/' + p.id + '/foto');
                    setFotoAtual(r.foto);
                } catch {}
            }
        };

        const aprovar = async () => {
            setProcessando(true);
            try {
                await fetchApi('/api/admin/coleta/fila/' + detalhe.id + '/aprovar', {
                    method: 'POST',
                    body: JSON.stringify({ nome_cliente_editado: nomeEdit.trim() })
                });
                showToast('✅ Aprovado!', 'success');
                setDetalhe(null); carregar();
            } catch (err) { showToast('❌ ' + err.message, 'error'); }
            finally { setProcessando(false); }
        };

        const rejeitar = async () => {
            if (!motivoRejeicao.trim()) return showToast('Informe o motivo', 'warning');
            setProcessando(true);
            try {
                await fetchApi('/api/admin/coleta/fila/' + detalhe.id + '/rejeitar', {
                    method: 'POST',
                    body: JSON.stringify({ motivo: motivoRejeicao.trim() })
                });
                showToast('🗑️ Rejeitado', 'success');
                setDetalhe(null); carregar();
            } catch (err) { showToast('❌ ' + err.message, 'error'); }
            finally { setProcessando(false); }
        };

        return h('div', null,
            loading ? h('div', { className: 'text-center py-8 text-gray-400' }, '⏳ Carregando...')
            : pendentes.length === 0 ? h('div', { className: 'text-center py-12 bg-white rounded-lg' },
                h('div', { className: 'text-5xl mb-2' }, '🎉'),
                h('div', { className: 'text-sm text-gray-600' }, 'Nenhum endereço pendente de validação!')
            )
            : h('div', { className: 'bg-white rounded-lg shadow overflow-hidden' },
                h('table', { className: 'w-full' },
                    h('thead', { className: 'bg-gray-50 border-b' },
                        h('tr', null,
                            ['Motoboy', 'Nome cliente', 'Região', 'Confiança', 'Foto', 'Data', ''].map(l =>
                                h('th', { key: l, className: 'text-left px-3 py-2 text-xs font-medium text-gray-600' }, l)
                            )
                        )
                    ),
                    h('tbody', null,
                        pendentes.map(p => h('tr', { key: p.id, className: 'border-b hover:bg-gray-50' },
                            h('td', { className: 'px-3 py-2 text-sm' }, p.motoboy_nome || p.cod_profissional),
                            h('td', { className: 'px-3 py-2 text-sm font-medium' }, p.nome_cliente),
                            h('td', { className: 'px-3 py-2 text-xs text-gray-600' }, p.regiao_nome),
                            h('td', { className: 'px-3 py-2 text-sm' },
                                h('span', {
                                    className: 'px-2 py-0.5 rounded text-xs font-medium ' +
                                        (p.confianca_ia >= 70 ? 'bg-green-100 text-green-700' :
                                         p.confianca_ia >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                         'bg-red-100 text-red-700')
                                }, p.confianca_ia + '%')
                            ),
                            h('td', { className: 'px-3 py-2 text-sm' }, p.tem_foto ? '📷' : '—'),
                            h('td', { className: 'px-3 py-2 text-xs text-gray-500' },
                                new Date(p.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                            ),
                            h('td', { className: 'px-3 py-2' },
                                h('button', {
                                    onClick: () => abrirDetalhe(p),
                                    className: 'px-3 py-1 bg-blue-600 text-white rounded text-xs'
                                }, 'Revisar')
                            )
                        ))
                    )
                )
            ),

            // Modal de detalhe
            detalhe && h('div', {
                onClick: () => !processando && setDetalhe(null),
                className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'
            },
                h('div', {
                    onClick: e => e.stopPropagation(),
                    className: 'bg-white rounded-xl shadow-2xl w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto'
                },
                    h('div', { className: 'flex items-center justify-between mb-4' },
                        h('h3', { className: 'font-bold text-lg' }, 'Revisar Cadastro #' + detalhe.id),
                        h('button', { onClick: () => setDetalhe(null), className: 'text-gray-400' }, '✕')
                    ),
                    h('div', { className: 'grid md:grid-cols-2 gap-4' },
                        h('div', null,
                            fotoAtual ? h('img', { src: fotoAtual, className: 'w-full rounded-lg' })
                            : h('div', { className: 'bg-gray-100 rounded-lg h-64 flex items-center justify-center text-gray-400 text-sm' }, 'Sem foto')
                        ),
                        h('div', { className: 'space-y-3' },
                            h('div', null,
                                h('div', { className: 'text-xs text-gray-500' }, 'Motoboy'),
                                h('div', { className: 'text-sm font-medium' }, detalhe.motoboy_nome || detalhe.cod_profissional)
                            ),
                            h('div', null,
                                h('div', { className: 'text-xs text-gray-500' }, 'Região'),
                                h('div', { className: 'text-sm' }, detalhe.regiao_nome)
                            ),
                            h('div', null,
                                h('label', { className: 'text-xs text-gray-500' }, 'Nome do cliente (editável)'),
                                h('input', {
                                    type: 'text',
                                    value: nomeEdit,
                                    onChange: e => setNomeEdit(e.target.value.toUpperCase()),
                                    style: { textTransform: 'uppercase' },
                                    className: 'w-full px-2 py-1 border rounded text-sm mt-0.5'
                                })
                            ),
                            h('div', null,
                                h('div', { className: 'text-xs text-gray-500' }, 'Localização'),
                                h('div', { className: 'text-sm font-mono' }, detalhe.latitude + ', ' + detalhe.longitude),
                                h('a', {
                                    href: `https://www.google.com/maps/search/?api=1&query=${detalhe.latitude},${detalhe.longitude}`,
                                    target: '_blank',
                                    className: 'text-xs text-blue-600 hover:underline'
                                }, '🗺️ Ver no Google Maps')
                            ),
                            h('div', null,
                                h('div', { className: 'text-xs text-gray-500' }, 'Endereço formatado (Google)'),
                                h('div', { className: 'text-sm' }, detalhe.endereco_formatado || '(Google não retornou)')
                            ),
                            h('div', null,
                                h('div', { className: 'text-xs text-gray-500' }, 'Análise IA'),
                                h('div', { className: 'text-sm' },
                                    'Confiança: ', h('strong', null, detalhe.confianca_ia + '%')
                                ),
                                detalhe.match_google && h('div', { className: 'text-xs text-gray-600 mt-1' },
                                    'Match: "', detalhe.match_google.nome || '-', '"'
                                )
                            )
                        )
                    ),
                    acao === 'rejeitando' ? h('div', { className: 'mt-4 pt-4 border-t' },
                        h('label', { className: 'text-xs font-medium text-gray-700' }, 'Motivo da rejeição *'),
                        h('textarea', {
                            value: motivoRejeicao,
                            onChange: e => setMotivoRejeicao(e.target.value),
                            placeholder: 'Ex: Foto não corresponde ao local, endereço duplicado, etc.',
                            rows: 2,
                            className: 'w-full px-2 py-1 border rounded text-sm mt-1 resize-none'
                        }),
                        h('div', { className: 'flex gap-2 mt-3' },
                            h('button', {
                                onClick: () => setAcao(''),
                                className: 'flex-1 py-2 border rounded text-sm'
                            }, 'Cancelar'),
                            h('button', {
                                onClick: rejeitar,
                                disabled: processando,
                                className: 'flex-1 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-50'
                            }, processando ? '⏳' : '🗑️ Confirmar rejeição')
                        )
                    ) : h('div', { className: 'flex gap-2 mt-4 pt-4 border-t' },
                        h('button', {
                            onClick: () => setAcao('rejeitando'),
                            disabled: processando,
                            className: 'flex-1 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium'
                        }, '❌ Rejeitar'),
                        h('button', {
                            onClick: aprovar,
                            disabled: processando || !nomeEdit.trim(),
                            className: 'flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50'
                        }, processando ? '⏳' : '✅ Aprovar')
                    )
                )
            )
        );
    }

    // ==================== ADMIN - REGIÕES ====================
    function AdminRegioes({ fetchApi, showToast }) {
        const [regioes, setRegioes] = useState([]);
        const [loading, setLoading] = useState(true);
        const [grupos, setGrupos] = useState([]);
        const [editarRegiao, setEditarRegiao] = useState(null); // { id?, nome, uf, cidade, grupo_enderecos_id, ativo }
        const [gerenciarMotoboys, setGerenciarMotoboys] = useState(null); // regiao

        const carregar = useCallback(() => {
            setLoading(true);
            fetchApi('/api/admin/coleta/regioes')
                .then(setRegioes)
                .catch(err => showToast('❌ ' + err.message, 'error'))
                .finally(() => setLoading(false));
        }, []);

        useEffect(() => {
            carregar();
            fetchApi('/api/admin/grupos-enderecos').then(setGrupos).catch(() => {});
        }, []);

        const salvar = async () => {
            if (!editarRegiao.nome?.trim()) return showToast('Nome obrigatório', 'warning');
            if (!editarRegiao.grupo_enderecos_id) return showToast('Grupo obrigatório', 'warning');
            try {
                const url = editarRegiao.id
                    ? '/api/admin/coleta/regioes/' + editarRegiao.id
                    : '/api/admin/coleta/regioes';
                await fetchApi(url, {
                    method: editarRegiao.id ? 'PATCH' : 'POST',
                    body: JSON.stringify(editarRegiao)
                });
                showToast('✅ Salvo!', 'success');
                setEditarRegiao(null);
                carregar();
            } catch (err) { showToast('❌ ' + err.message, 'error'); }
        };

        const excluir = async (r) => {
            if (!confirm(`Excluir a região "${r.nome}"?\n\nOs motoboys vinculados serão desvinculados e os itens na fila serão removidos.`)) return;
            try {
                await fetchApi('/api/admin/coleta/regioes/' + r.id, { method: 'DELETE' });
                showToast('🗑️ Excluído', 'success');
                carregar();
            } catch (err) { showToast('❌ ' + err.message, 'error'); }
        };

        return h('div', null,
            h('div', { className: 'flex justify-end mb-4' },
                h('button', {
                    onClick: () => setEditarRegiao({ nome: '', uf: '', cidade: '', grupo_enderecos_id: '', ativo: true }),
                    className: 'px-4 py-2 bg-purple-600 text-white rounded-lg text-sm'
                }, '+ Nova Região')
            ),
            loading ? h('div', { className: 'text-center py-8 text-gray-400' }, '⏳ Carregando...')
            : regioes.length === 0 ? h('div', { className: 'text-center py-12 bg-white rounded-lg' },
                h('div', { className: 'text-gray-400 text-sm' }, 'Nenhuma região cadastrada')
            )
            : h('div', { className: 'grid md:grid-cols-2 lg:grid-cols-3 gap-3' },
                regioes.map(r => h('div', {
                    key: r.id,
                    className: 'bg-white border-2 rounded-lg p-3 ' + (r.ativo ? 'border-purple-200' : 'border-gray-200 opacity-60')
                },
                    h('div', { className: 'flex items-start justify-between gap-2 mb-2' },
                        h('div', null,
                            h('div', { className: 'font-bold text-purple-800' }, '📍 ' + r.nome),
                            h('div', { className: 'text-xs text-gray-500' }, (r.cidade || '') + (r.uf ? ' - ' + r.uf : '')),
                            h('div', { className: 'text-xs text-gray-600 mt-1' }, '→ Grupo: ', h('strong', null, r.grupo_nome || '(sem grupo)'))
                        ),
                        !r.ativo && h('span', { className: 'text-xs bg-gray-200 px-1.5 py-0.5 rounded' }, 'INATIVO')
                    ),
                    h('div', { className: 'grid grid-cols-3 gap-1 text-center text-xs my-2' },
                        h('div', { className: 'bg-blue-50 rounded p-1' },
                            h('div', { className: 'font-bold text-blue-700' }, r.total_motoboys || 0),
                            h('div', { className: 'text-gray-500' }, 'Motoboys')
                        ),
                        h('div', { className: 'bg-green-50 rounded p-1' },
                            h('div', { className: 'font-bold text-green-700' }, r.total_aprovados || 0),
                            h('div', { className: 'text-gray-500' }, 'Aprovados')
                        ),
                        h('div', { className: 'bg-amber-50 rounded p-1' },
                            h('div', { className: 'font-bold text-amber-700' }, r.total_pendentes || 0),
                            h('div', { className: 'text-gray-500' }, 'Fila')
                        )
                    ),
                    h('div', { className: 'flex gap-1 mt-2' },
                        h('button', {
                            onClick: () => setGerenciarMotoboys(r),
                            className: 'flex-1 py-1 bg-blue-100 text-blue-700 rounded text-xs'
                        }, '👥 Motoboys'),
                        h('button', {
                            onClick: () => setEditarRegiao({ ...r }),
                            className: 'flex-1 py-1 bg-gray-100 text-gray-700 rounded text-xs'
                        }, '✏️ Editar'),
                        h('button', {
                            onClick: () => excluir(r),
                            className: 'flex-1 py-1 bg-red-100 text-red-700 rounded text-xs'
                        }, '🗑️')
                    )
                ))
            ),

            // Modal editar/criar região
            editarRegiao && h('div', {
                onClick: () => setEditarRegiao(null),
                className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'
            },
                h('div', {
                    onClick: e => e.stopPropagation(),
                    className: 'bg-white rounded-xl shadow-2xl w-full max-w-md p-5'
                },
                    h('h3', { className: 'font-bold mb-4' }, editarRegiao.id ? '✏️ Editar Região' : '+ Nova Região'),
                    h('div', { className: 'space-y-3' },
                        h('div', null,
                            h('label', { className: 'text-xs font-medium' }, 'Nome *'),
                            h('input', {
                                type: 'text',
                                value: editarRegiao.nome || '',
                                onChange: e => setEditarRegiao({ ...editarRegiao, nome: e.target.value }),
                                className: 'w-full px-3 py-2 border rounded text-sm'
                            })
                        ),
                        h('div', { className: 'grid grid-cols-2 gap-2' },
                            h('div', null,
                                h('label', { className: 'text-xs font-medium' }, 'Cidade'),
                                h('input', {
                                    type: 'text',
                                    value: editarRegiao.cidade || '',
                                    onChange: e => setEditarRegiao({ ...editarRegiao, cidade: e.target.value }),
                                    className: 'w-full px-3 py-2 border rounded text-sm'
                                })
                            ),
                            h('div', null,
                                h('label', { className: 'text-xs font-medium' }, 'UF'),
                                h('input', {
                                    type: 'text',
                                    maxLength: 2,
                                    value: editarRegiao.uf || '',
                                    onChange: e => setEditarRegiao({ ...editarRegiao, uf: e.target.value.toUpperCase() }),
                                    style: { textTransform: 'uppercase' },
                                    className: 'w-full px-3 py-2 border rounded text-sm'
                                })
                            )
                        ),
                        h('div', null,
                            h('label', { className: 'text-xs font-medium' }, 'Grupo de Endereços *'),
                            h('select', {
                                value: editarRegiao.grupo_enderecos_id || '',
                                onChange: e => setEditarRegiao({ ...editarRegiao, grupo_enderecos_id: e.target.value }),
                                className: 'w-full px-3 py-2 border rounded text-sm bg-white'
                            },
                                h('option', { value: '' }, '— Selecione —'),
                                grupos.map(g => h('option', { key: g.id, value: g.id }, g.nome))
                            )
                        ),
                        editarRegiao.id && h('label', { className: 'flex items-center gap-2 cursor-pointer' },
                            h('input', {
                                type: 'checkbox',
                                checked: !!editarRegiao.ativo,
                                onChange: e => setEditarRegiao({ ...editarRegiao, ativo: e.target.checked }),
                                className: 'w-4 h-4'
                            }),
                            h('span', { className: 'text-sm' }, 'Região ativa')
                        )
                    ),
                    h('div', { className: 'flex gap-2 mt-5' },
                        h('button', {
                            onClick: () => setEditarRegiao(null),
                            className: 'flex-1 py-2 border rounded text-sm'
                        }, 'Cancelar'),
                        h('button', {
                            onClick: salvar,
                            className: 'flex-1 py-2 bg-purple-600 text-white rounded text-sm'
                        }, '💾 Salvar')
                    )
                )
            ),

            // Modal gerenciar motoboys
            gerenciarMotoboys && h(ModalMotoboys, {
                regiao: gerenciarMotoboys,
                fetchApi, showToast,
                onClose: () => { setGerenciarMotoboys(null); carregar(); }
            })
        );
    }

    // ==================== MODAL MOTOBOYS DA REGIÃO ====================
    function ModalMotoboys({ regiao, fetchApi, showToast, onClose }) {
        const [vinculados, setVinculados] = useState([]);
        const [busca, setBusca] = useState('');
        const [sugestoes, setSugestoes] = useState([]);

        const carregar = () => {
            fetchApi('/api/admin/coleta/regioes/' + regiao.id + '/motoboys')
                .then(setVinculados).catch(() => {});
        };
        useEffect(carregar, []);

        useEffect(() => {
            if (!busca.trim() || busca.length < 2) { setSugestoes([]); return; }
            const t = setTimeout(() => {
                fetchApi('/api/admin/coleta/motoboys-disponiveis?q=' + encodeURIComponent(busca))
                    .then(setSugestoes).catch(() => {});
            }, 300);
            return () => clearTimeout(t);
        }, [busca]);

        const vincular = async (cod) => {
            try {
                await fetchApi('/api/admin/coleta/regioes/' + regiao.id + '/motoboys', {
                    method: 'POST',
                    body: JSON.stringify({ cod_profissional: cod })
                });
                showToast('✅ Vinculado', 'success');
                setBusca(''); setSugestoes([]);
                carregar();
            } catch (err) { showToast('❌ ' + err.message, 'error'); }
        };

        const desvincular = async (cod) => {
            if (!confirm('Desvincular este motoboy?')) return;
            try {
                await fetchApi('/api/admin/coleta/regioes/' + regiao.id + '/motoboys/' + cod, { method: 'DELETE' });
                showToast('🗑️ Desvinculado', 'success');
                carregar();
            } catch (err) { showToast('❌ ' + err.message, 'error'); }
        };

        return h('div', {
            onClick: onClose,
            className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'
        },
            h('div', {
                onClick: e => e.stopPropagation(),
                className: 'bg-white rounded-xl shadow-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto'
            },
                h('div', { className: 'flex items-center justify-between mb-4' },
                    h('h3', { className: 'font-bold' }, '👥 Motoboys em "' + regiao.nome + '"'),
                    h('button', { onClick: onClose, className: 'text-gray-400' }, '✕')
                ),

                h('div', { className: 'mb-4' },
                    h('label', { className: 'text-xs font-medium' }, 'Adicionar motoboy'),
                    h('input', {
                        type: 'text',
                        value: busca,
                        onChange: e => setBusca(e.target.value),
                        placeholder: 'Buscar por nome ou código...',
                        className: 'w-full px-3 py-2 border rounded text-sm mt-1'
                    }),
                    sugestoes.length > 0 && h('div', { className: 'mt-2 border rounded max-h-40 overflow-y-auto' },
                        sugestoes.map(u => h('div', {
                            key: u.cod_profissional,
                            onClick: () => vincular(u.cod_profissional),
                            className: 'p-2 hover:bg-purple-50 cursor-pointer border-b text-sm'
                        },
                            h('div', { className: 'font-medium' }, u.full_name || '(sem nome)'),
                            h('div', { className: 'text-xs text-gray-500' }, 'Cód: ' + u.cod_profissional)
                        ))
                    )
                ),

                h('div', null,
                    h('h4', { className: 'text-xs font-bold text-gray-500 uppercase mb-2' },
                        'Vinculados (' + vinculados.length + ')'
                    ),
                    vinculados.length === 0 ? h('div', { className: 'text-center py-4 text-gray-400 text-sm' }, 'Nenhum motoboy vinculado')
                    : h('div', { className: 'space-y-1' },
                        vinculados.map(v => h('div', {
                            key: v.id,
                            className: 'flex items-center justify-between bg-gray-50 rounded p-2 text-sm'
                        },
                            h('div', null,
                                h('div', { className: 'font-medium' }, v.full_name || '(sem nome)'),
                                h('div', { className: 'text-xs text-gray-500' }, v.cod_profissional)
                            ),
                            h('button', {
                                onClick: () => desvincular(v.cod_profissional),
                                className: 'text-red-600 text-xs px-2 py-1 hover:bg-red-50 rounded'
                            }, '🗑️ Remover')
                        ))
                    )
                )
            )
        );
    }

    // ==================== ADMIN - STATS ====================
    function AdminStats({ fetchApi, showToast }) {
        const [stats, setStats] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            fetchApi('/api/admin/coleta/stats')
                .then(setStats)
                .catch(err => showToast('❌ ' + err.message, 'error'))
                .finally(() => setLoading(false));
        }, []);

        if (loading) return h('div', { className: 'text-center py-8 text-gray-400' }, '⏳ Carregando...');
        if (!stats) return null;

        const fmt = v => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');

        return h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
            h('div', { className: 'bg-white rounded-lg p-4 shadow' },
                h('div', { className: 'text-xs text-gray-500' }, 'Endereços aprovados'),
                h('div', { className: 'text-2xl font-bold text-green-600' }, stats.total_aprovados || 0)
            ),
            h('div', { className: 'bg-white rounded-lg p-4 shadow' },
                h('div', { className: 'text-xs text-gray-500' }, 'Fila pendente'),
                h('div', { className: 'text-2xl font-bold text-amber-600' }, stats.total_fila || 0)
            ),
            h('div', { className: 'bg-white rounded-lg p-4 shadow' },
                h('div', { className: 'text-xs text-gray-500' }, 'Rejeitados'),
                h('div', { className: 'text-2xl font-bold text-red-600' }, stats.total_rejeitados || 0)
            ),
            h('div', { className: 'bg-white rounded-lg p-4 shadow' },
                h('div', { className: 'text-xs text-gray-500' }, 'Motoboys ativos'),
                h('div', { className: 'text-2xl font-bold text-blue-600' }, stats.motoboys_ativos || 0)
            ),
            h('div', { className: 'bg-green-50 border border-green-200 rounded-lg p-4 col-span-2 md:col-span-2' },
                h('div', { className: 'text-xs text-green-700' }, 'Total confirmado (a pagar)'),
                h('div', { className: 'text-3xl font-bold text-green-700' }, fmt(stats.total_confirmado))
            ),
            h('div', { className: 'bg-blue-50 border border-blue-200 rounded-lg p-4 col-span-2 md:col-span-2' },
                h('div', { className: 'text-xs text-blue-700' }, 'Total previsto (em análise)'),
                h('div', { className: 'text-3xl font-bold text-blue-700' }, fmt(stats.total_previsto))
            )
        );
    }

})();
