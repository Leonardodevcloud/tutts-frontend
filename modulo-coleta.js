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

        // Props compartilhadas do layout do sistema (header, nav, etc.)
        const HeaderCompacto = props.HeaderCompacto;
        const Toast = props.Toast;
        const LoadingOverlay = props.LoadingOverlay;
        const Ee = props.Ee;
        const socialProfile = props.socialProfile;
        const ul = props.ul;
        const oLogout = props.o;
        const he = props.he;
        const navegarSidebar = props.navegarSidebar;
        const isLoadingGlobal = props.n;
        const toastData = props.i;
        const isLoading = props.f;
        const lastUpdate = props.E;

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
        // MODO MOTOBOY - UI mobile-first, sem header do sistema
        // ================================================================
        if (isMotoboy) return h(ViewMotoboy, { fetchApi, showToast });

        // ================================================================
        // MODO ADMIN - usa o layout padrão do sistema (HeaderCompacto)
        // ================================================================
        return h('div', { className: 'min-h-screen bg-gray-50' },
            toastData && Toast && h(Toast, toastData),
            isLoadingGlobal && LoadingOverlay && h(LoadingOverlay),
            HeaderCompacto && h(HeaderCompacto, {
                usuario: usuario,
                moduloAtivo: Ee,
                abaAtiva: null,
                socialProfile: socialProfile,
                isLoading: isLoading,
                lastUpdate: lastUpdate,
                onRefresh: ul,
                onLogout: function() { oLogout && oLogout(null); },
                onGoHome: function() { he && he('home'); },
                onNavigate: navegarSidebar,
                onChangeTab: null
            }),
            h(ViewAdmin, { fetchApi, showToast })
        );
    };

    // ==================== VIEW MOTOBOY (mobile-first) ====================
    function ViewMotoboy({ fetchApi, showToast }) {
        const [tab, setTab] = useState('cadastrar'); // cadastrar | consultar | wallet
        const [regioes, setRegioes] = useState([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            fetchApi('/motoboy/coleta/minhas-regioes')
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
                const resp = await fetchApi('/motoboy/coleta', {
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
            fetchApi('/motoboy/coleta/enderecos' + q)
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
                const r = await fetchApi('/motoboy/coleta/enderecos/' + pendenteId + '/foto');
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
            fetchApi('/motoboy/coleta/ganhos')
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

        return h('div', { className: 'max-w-7xl mx-auto p-4 md:p-6' },
            h('div', { className: 'bg-white rounded-lg shadow-sm border border-gray-200 mb-4' },
                h('div', { className: 'flex gap-1 p-1' },
                    [
                        { id: 'fila', label: '⏳ Fila de Validação' },
                        { id: 'regioes', label: '🌎 Regiões' },
                        { id: 'stats', label: '📊 Estatísticas' }
                    ].map(t => h('button', {
                        key: t.id,
                        onClick: () => setTab(t.id),
                        className: 'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ' +
                            (tab === t.id ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100')
                    }, t.label))
                )
            ),
            tab === 'fila' && h(AdminFila, { fetchApi, showToast }),
            tab === 'regioes' && h(AdminRegioes, { fetchApi, showToast }),
            tab === 'stats' && h(AdminStats, { fetchApi, showToast })
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
            fetchApi('/admin/coleta/fila')
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
                    const r = await fetchApi('/admin/coleta/fila/' + p.id + '/foto');
                    setFotoAtual(r.foto);
                } catch {}
            }
        };

        const aprovar = async () => {
            setProcessando(true);
            try {
                await fetchApi('/admin/coleta/fila/' + detalhe.id + '/aprovar', {
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
                await fetchApi('/admin/coleta/fila/' + detalhe.id + '/rejeitar', {
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
        const [regioesCrm, setRegioesCrm] = useState([]); // regiões disponíveis no CRM (pra autocomplete)
        const [editarRegiao, setEditarRegiao] = useState(null); // { id?, nome, uf, cidade, grupo_enderecos_id, ativo }
        const [gerenciarMotoboys, setGerenciarMotoboys] = useState(null); // regiao
        const [verClientesDoGrupo, setVerClientesDoGrupo] = useState(null); // { grupo_id, nome }

        const carregar = useCallback(() => {
            setLoading(true);
            fetchApi('/admin/coleta/regioes')
                .then(setRegioes)
                .catch(err => showToast('❌ ' + err.message, 'error'))
                .finally(() => setLoading(false));
        }, []);

        useEffect(() => {
            carregar();
            fetchApi('/admin/grupos-enderecos').then(setGrupos).catch(() => {});
            fetchApi('/admin/coleta/regioes-crm').then(setRegioesCrm).catch(() => {});
        }, []);

        // Mapa grupo_id → total_clientes (do endpoint grupos-enderecos)
        const clientesPorGrupo = useMemo(() => {
            const map = {};
            grupos.forEach(g => { map[g.id] = parseInt(g.total_clientes) || 0; });
            return map;
        }, [grupos]);

        const salvar = async () => {
            if (!editarRegiao.nome?.trim()) return showToast('Nome obrigatório', 'warning');
            if (!editarRegiao.grupo_enderecos_id) return showToast('Grupo obrigatório', 'warning');
            try {
                const url = editarRegiao.id
                    ? '/admin/coleta/regioes/' + editarRegiao.id
                    : '/admin/coleta/regioes';
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
                await fetchApi('/admin/coleta/regioes/' + r.id, { method: 'DELETE' });
                showToast('🗑️ Excluído', 'success');
                carregar();
            } catch (err) { showToast('❌ ' + err.message, 'error'); }
        };

        return h('div', null,
            // Banner explicativo do fluxo
            h('div', { className: 'bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4 mb-4' },
                h('div', { className: 'flex items-start gap-3' },
                    h('div', { className: 'text-2xl' }, '💡'),
                    h('div', { className: 'flex-1' },
                        h('h3', { className: 'font-bold text-purple-900 mb-1' }, 'Como funciona o fluxo'),
                        h('p', { className: 'text-sm text-purple-800 mb-2' },
                            'Motoboys cuja ',
                            h('strong', null, 'Região/Cidade no CRM'),
                            ' bate com o nome da região aqui serão automaticamente habilitados. Endereços aprovados caem no ',
                            h('strong', null, 'Grupo de Endereços'),
                            ' configurado, e todos os clientes vinculados àquele grupo passam a enxergá-los.'
                        ),
                        h('div', { className: 'flex items-center gap-2 flex-wrap text-xs mb-2' },
                            h('span', { className: 'bg-white border border-purple-300 rounded px-2 py-1 font-medium' }, '🏍️ Motoboys do CRM'),
                            h('span', { className: 'text-purple-500' }, '→ match de região →'),
                            h('span', { className: 'bg-white border border-purple-300 rounded px-2 py-1 font-medium' }, '📍 Região'),
                            h('span', { className: 'text-purple-500' }, '→ cadastram →'),
                            h('span', { className: 'bg-white border border-purple-300 rounded px-2 py-1 font-medium' }, '📚 Grupo'),
                            h('span', { className: 'text-purple-500' }, '→'),
                            h('span', { className: 'bg-white border border-purple-300 rounded px-2 py-1 font-medium' }, '🏢 Clientes')
                        ),
                        h('p', { className: 'text-xs text-purple-700' },
                            '⚙️ A vinculação ', h('strong', null, 'cliente → grupo'),
                            ' é feita em ', h('strong', null, 'Configurações → Grupos de Endereços'),
                            '. Motoboys são vinculados ', h('strong', null, 'automaticamente'),
                            ' pela Região/Cidade do CRM (mesma lógica do módulo de Indicações/Promoções).'
                        )
                    )
                )
            ),

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
                regioes.map(r => {
                    const qtdClientes = clientesPorGrupo[r.grupo_enderecos_id] || 0;
                    return h('div', {
                        key: r.id,
                        className: 'bg-white border-2 rounded-lg p-3 ' + (r.ativo ? 'border-purple-200' : 'border-gray-200 opacity-60')
                    },
                        h('div', { className: 'flex items-start justify-between gap-2 mb-2' },
                            h('div', { className: 'flex-1 min-w-0' },
                                h('div', { className: 'font-bold text-purple-800' }, '📍 ' + r.nome),
                                h('div', { className: 'text-xs text-gray-500' }, (r.cidade || '') + (r.uf ? ' - ' + r.uf : ''))
                            ),
                            !r.ativo && h('span', { className: 'text-xs bg-gray-200 px-1.5 py-0.5 rounded' }, 'INATIVO')
                        ),

                        // Destaque do fluxo: grupo + clientes que recebem
                        r.grupo_enderecos_id ? h('button', {
                            onClick: () => setVerClientesDoGrupo({ grupo_id: r.grupo_enderecos_id, nome: r.grupo_nome }),
                            className: 'w-full text-left bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-2 my-2 hover:from-purple-100 hover:to-indigo-100 transition-colors'
                        },
                            h('div', { className: 'text-xs text-purple-600 font-medium' }, '📚 Grupo'),
                            h('div', { className: 'text-sm font-bold text-purple-900 truncate' }, r.grupo_nome || '(sem grupo)'),
                            h('div', { className: 'text-xs text-purple-700 mt-0.5' },
                                '🏢 ', h('strong', null, qtdClientes), ' cliente(s) receberão os endereços ',
                                h('span', { className: 'text-purple-500 underline' }, 'ver')
                            )
                        ) : h('div', { className: 'bg-red-50 border border-red-200 rounded-lg p-2 my-2 text-xs text-red-700' },
                            '⚠️ Sem grupo vinculado — endereços não serão salvos'
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
                            }, '👥 Ver ' + (r.total_motoboys || 0) + ' motoboy(s)'),
                            h('button', {
                                onClick: () => setEditarRegiao({ ...r }),
                                className: 'flex-1 py-1 bg-gray-100 text-gray-700 rounded text-xs'
                            }, '✏️ Editar'),
                            h('button', {
                                onClick: () => excluir(r),
                                className: 'flex-1 py-1 bg-red-100 text-red-700 rounded text-xs'
                            }, '🗑️')
                        )
                    );
                })
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
                            h('label', { className: 'text-xs font-medium' }, 'Nome da Região *'),
                            h('input', {
                                type: 'text',
                                list: 'regioes-crm-list',
                                value: editarRegiao.nome || '',
                                onChange: e => setEditarRegiao({ ...editarRegiao, nome: e.target.value }),
                                placeholder: 'Digite ou escolha uma região do CRM',
                                className: 'w-full px-3 py-2 border rounded text-sm'
                            }),
                            // datalist: autocomplete nativo HTML5, sem dependência de JS
                            h('datalist', { id: 'regioes-crm-list' },
                                regioesCrm.map(r => h('option', { key: r, value: r }))
                            ),
                            h('p', { className: 'text-xs text-gray-500 mt-1' },
                                '💡 ', h('strong', null, regioesCrm.length), ' regiões disponíveis no CRM. ',
                                'O nome deve bater com a Região/Cidade dos motoboys no CRM pra funcionar.'
                            )
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
            }),

            // Modal clientes que recebem os endereços deste grupo
            verClientesDoGrupo && h(ModalClientesGrupo, {
                grupoId: verClientesDoGrupo.grupo_id,
                nomeGrupo: verClientesDoGrupo.nome,
                fetchApi, showToast,
                onClose: () => setVerClientesDoGrupo(null)
            })
        );
    }

    // ==================== MODAL CLIENTES DO GRUPO ====================
    function ModalClientesGrupo({ grupoId, nomeGrupo, fetchApi, showToast, onClose }) {
        const [dados, setDados] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            fetchApi('/admin/grupos-enderecos/' + grupoId)
                .then(setDados)
                .catch(err => showToast('❌ ' + err.message, 'error'))
                .finally(() => setLoading(false));
        }, [grupoId]);

        return h('div', {
            onClick: onClose,
            className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'
        },
            h('div', {
                onClick: e => e.stopPropagation(),
                className: 'bg-white rounded-xl shadow-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto'
            },
                h('div', { className: 'flex items-center justify-between mb-4' },
                    h('div', null,
                        h('h3', { className: 'font-bold' }, '📚 ' + (nomeGrupo || 'Grupo')),
                        h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'Clientes que receberão os endereços aprovados')
                    ),
                    h('button', { onClick: onClose, className: 'text-gray-400' }, '✕')
                ),

                loading ? h('div', { className: 'text-center py-6 text-gray-400' }, '⏳ Carregando...')
                : !dados ? h('div', { className: 'text-center py-6 text-gray-400 text-sm' }, 'Erro ao carregar')
                : h('div', null,
                    h('div', { className: 'bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3' },
                        h('div', { className: 'text-xs text-purple-700' }, 'Total de endereços já no grupo'),
                        h('div', { className: 'text-2xl font-bold text-purple-800' }, dados.total_enderecos || 0)
                    ),

                    h('h4', { className: 'text-xs font-bold text-gray-500 uppercase mb-2' },
                        'Clientes API (' + (dados.clientes?.length || 0) + ')'
                    ),
                    !dados.clientes || dados.clientes.length === 0
                    ? h('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800' },
                        '⚠️ Nenhum cliente vinculado a este grupo ainda. Vincule em ',
                        h('strong', null, 'Configurações → Grupos de Endereços'),
                        ' ou editando o cliente API individualmente.'
                    )
                    : h('div', { className: 'space-y-1' },
                        dados.clientes.map(c => h('div', {
                            key: c.id,
                            className: 'bg-gray-50 rounded p-2 border border-gray-200'
                        },
                            h('div', { className: 'font-medium text-sm' }, c.nome || '(sem nome)'),
                            c.empresa && h('div', { className: 'text-xs text-gray-600' }, '🏢 ' + c.empresa),
                            c.email && h('div', { className: 'text-xs text-gray-500' }, '✉️ ' + c.email)
                        ))
                    )
                )
            )
        );
    }

    // ==================== MODAL MOTOBOYS DA REGIÃO (READ-ONLY) ====================
    // Motoboys são descobertos AUTOMATICAMENTE via match do CRM.
    // Não há ação de adicionar/remover — apenas visualização.
    function ModalMotoboys({ regiao, fetchApi, showToast, onClose }) {
        const [motoboys, setMotoboys] = useState(null); // null = loading
        const [busca, setBusca] = useState('');

        useEffect(() => {
            fetchApi('/admin/coleta/regioes/' + regiao.id + '/motoboys')
                .then(setMotoboys)
                .catch(err => { showToast('❌ ' + err.message, 'error'); setMotoboys([]); });
        }, [regiao.id]);

        const filtrados = useMemo(() => {
            if (!motoboys) return [];
            if (!busca.trim()) return motoboys;
            const t = busca.trim().toLowerCase();
            return motoboys.filter(m =>
                (m.full_name || '').toLowerCase().includes(t) ||
                (m.cod_profissional || '').toLowerCase().includes(t)
            );
        }, [motoboys, busca]);

        return h('div', {
            onClick: onClose,
            className: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'
        },
            h('div', {
                onClick: e => e.stopPropagation(),
                className: 'bg-white rounded-xl shadow-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto'
            },
                h('div', { className: 'flex items-center justify-between mb-3' },
                    h('div', null,
                        h('h3', { className: 'font-bold' }, '👥 Motoboys em "' + regiao.nome + '"'),
                        h('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'Vinculação automática via CRM')
                    ),
                    h('button', { onClick: onClose, className: 'text-gray-400' }, '✕')
                ),

                // Banner explicativo
                h('div', { className: 'bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3 text-xs text-blue-800' },
                    '💡 Esta lista é gerada automaticamente. Motoboys cujo campo ',
                    h('strong', null, 'Região ou Cidade'),
                    ' no CRM bate com "', h('strong', null, regiao.nome), '" aparecem aqui.'
                ),

                motoboys === null
                ? h('div', { className: 'text-center py-6 text-gray-400 text-sm' }, '⏳ Carregando...')
                : motoboys.length === 0
                ? h('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800' },
                    '⚠️ Nenhum motoboy do CRM tem Região ou Cidade "', h('strong', null, regiao.nome),
                    '". Verifique se o nome da região aqui bate exatamente com o cadastro no CRM.'
                )
                : h('div', null,
                    h('input', {
                        type: 'text',
                        value: busca,
                        onChange: e => setBusca(e.target.value),
                        placeholder: '🔍 Filtrar por nome ou código...',
                        className: 'w-full px-3 py-2 border rounded text-sm mb-2'
                    }),
                    h('h4', { className: 'text-xs font-bold text-gray-500 uppercase mb-2' },
                        'Vinculados automaticamente (' + motoboys.length + ')'
                    ),
                    h('div', { className: 'space-y-1 max-h-80 overflow-y-auto' },
                        filtrados.map(m => h('div', {
                            key: m.cod_profissional,
                            className: 'flex items-center justify-between bg-gray-50 rounded p-2 text-sm'
                        },
                            h('div', { className: 'min-w-0 flex-1' },
                                h('div', { className: 'font-medium truncate' }, m.full_name || '(sem nome)'),
                                h('div', { className: 'text-xs text-gray-500' },
                                    'Cód: ' + m.cod_profissional,
                                    m.celular ? ' • ' + m.celular : ''
                                )
                            )
                        ))
                    ),
                    filtrados.length === 0 && h('div', { className: 'text-center py-4 text-gray-400 text-sm' },
                        'Nenhum resultado no filtro'
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
            fetchApi('/admin/coleta/stats')
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
