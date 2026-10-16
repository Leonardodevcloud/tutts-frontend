/* REDESIGN_CLEAN_V1: telas no padrao clean aprovado (mockups 16/10). */
/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DISP_ICONS_V1 */
// ==================== MÓDULO DISPONIBILIDADE ====================
// Arquivo: modulo-disponibilidade.js
// Conteúdo do módulo Disponibilidade - Carregado dinamicamente

(function() {
    'use strict';
    console.log('%c📦 MODULO-DISPONIBILIDADE CARREGADO', 'background:#770fa8;color:#fff;font-size:14px;padding:4px 8px;border-radius:4px;');

    window.ModuloDisponibilidadeContent = function(props) {
        const {
            // Estado e setters
            p, x, 
            // Funções de toast e loading
            ja,
            // API
            API_URL,
            // Dados de profissionais
            pe, Ta,
            // Usuários
            A, l,
            // Auth
            fetchAuth,
            // Token getter for WebSocket
            getToken
        } = props;

        // ===== CÓDIGO DO MÓDULO DISPONIBILIDADE =====
        // Fallback: se fetchAuth não vier nas props, usa fetch normal
        const _baseFetch = fetchAuth || fetch;
        // Ref para wsId — atualizada pelo WebSocket onauth
        const _dispWsIdRef = React.useRef(null);
        const _fetch = function(url, opts) {
            opts = opts || {};
            if (_dispWsIdRef.current) {
                opts.headers = Object.assign({}, opts.headers || {}, { 'x-ws-id': _dispWsIdRef.current });
            }
            return _baseFetch(url, opts);
        };
                    const e = p.dispData || {
                    regioes: [],
                    lojas: [],
                    linhas: []
                },
                t = p.dispSubTab || "panorama",
                a = p.dispLoading,
                r = async () => {
                    try {
                        x(e => ({
                            ...e,
                            dispLoading: !0
                        }));
                        const e = await _fetch(`${API_URL}/disponibilidade`);
                        if (!e.ok) throw new Error("Erro ao carregar");
                        const t = await e.json();
                        x(e => ({
                            ...e,
                            dispData: t,
                            dispLoading: !1,
                            dispLoaded: !0
                        }));
                        // 🔧 v14 (2026-05-25): NÃO precisa mais buscar /perfil/fotos.
                        // O backend faz LEFT JOIN com users e devolve `foto` em cada linha
                        // (COALESCE foto_thumb → foto_selfie). Mesmo padrão do BI Garantido.
                        // Toda linha que vem do backend (GET, PUT response, broadcast WS)
                        // já carrega o campo `foto` preenchido (ou null se motoboy não tem foto).
                    } catch (e) {
                        console.error("Erro ao carregar disponibilidade:", e), ja("Erro ao carregar dados", "error"), x(e => ({
                            ...e,
                            dispLoading: !1,
                            dispLoaded: !0
                        }))
                    }
                };
            p.dispLoaded || a || (r(), 0 === pe.length && Ta());

            // ===== WEBSOCKET — Sincronização em tempo real entre admins =====
            const _dispWsRef = React.useRef(null);
            const _dispWsReconnect = React.useRef(null);
            const _dispWsReloadTimer = React.useRef(null);
            const _dispWsAuthFailed = React.useRef(false);
            // Anti-echo: linhas editadas localmente nos últimos 2s são ignoradas via WS
            const _dispLocalEdits = React.useRef({});
            // 🔧 v16 (2026-05-25): ref pro state atual — usado pra ler estado SÍNCRONO
            // dentro do handler `c`. Em React 18 (concurrent mode), o callback de
            // setState pode rodar ASSÍNCRONO, fazendo r/o ficarem null quando o
            // handler verifica logo depois. Solução: ler via ref que está sempre fresca.
            const _dispStateRef = React.useRef(p);
            _dispStateRef.current = p;
            // Refs estáveis (evita stale closure)
            const _dispReloadRef = React.useRef(r);
            _dispReloadRef.current = r;
            const _dispSetStateRef = React.useRef(x);
            _dispSetStateRef.current = x;

            // Registrar edição local (chamado por função c)
            window._dispMarkLocalEdit = function(linhaId) {
                _dispLocalEdits.current[linhaId] = Date.now();
            };

            React.useEffect(function() {
                if (!l || !API_URL) return;
                _dispWsAuthFailed.current = false;

                // DISPONIVEIS_V1: painel flutuante pede recarga da escala apos alocar
                var _onDispReload = function() { reloadDebounced(); };
                window.addEventListener('disponibilidade:reload', _onDispReload);
                function reloadDebounced() {
                    if (_dispWsReloadTimer.current) clearTimeout(_dispWsReloadTimer.current);
                    _dispWsReloadTimer.current = setTimeout(function() {
                        _dispWsReloadTimer.current = null;
                        if (_dispReloadRef.current) {
                            console.log('📡 [WS-Disp] Recarregando dados (estrutural)...');
                            _dispReloadRef.current();
                        }
                    }, 800);
                }

                function isLocalEdit(linhaId) {
                    var ts = _dispLocalEdits.current[linhaId];
                    if (!ts) return false;
                    if (Date.now() - ts < 2000) return true;
                    delete _dispLocalEdits.current[linhaId];
                    return false;
                }

                // Atualização cirúrgica de uma linha — sem reload
                function atualizarLinha(linhaAtualizada) {
                    if (isLocalEdit(linhaAtualizada.id)) {
                        console.log('📡 [WS-Disp] Ignorando echo local linha', linhaAtualizada.id);
                        return;
                    }
                    _dispSetStateRef.current(function(prev) {
                        var dispData = prev.dispData;
                        if (!dispData || !dispData.linhas) return prev;
                        var novasLinhas = dispData.linhas.map(function(li) {
                            return li.id === linhaAtualizada.id ? Object.assign({}, li, linhaAtualizada) : li;
                        });
                        return Object.assign({}, prev, { dispData: Object.assign({}, dispData, { linhas: novasLinhas }) });
                    });
                }

                // Adicionar linhas novas — sem reload
                function adicionarLinhas(loja_id, novasLinhas) {
                    _dispSetStateRef.current(function(prev) {
                        var dispData = prev.dispData;
                        if (!dispData) return prev;
                        var linhasAtuais = dispData.linhas || [];
                        // Evitar duplicatas
                        var idsExistentes = {};
                        linhasAtuais.forEach(function(li) { idsExistentes[li.id] = true; });
                        var linhasNovas = novasLinhas.filter(function(li) { return !idsExistentes[li.id]; });
                        if (linhasNovas.length === 0) return prev;
                        return Object.assign({}, prev, { dispData: Object.assign({}, dispData, { linhas: linhasAtuais.concat(linhasNovas) }) });
                    });
                }

                // Remover linha — sem reload
                function removerLinha(linhaId) {
                    _dispSetStateRef.current(function(prev) {
                        var dispData = prev.dispData;
                        if (!dispData || !dispData.linhas) return prev;
                        var novasLinhas = dispData.linhas.filter(function(li) { return li.id !== linhaId; });
                        if (novasLinhas.length === dispData.linhas.length) return prev;
                        return Object.assign({}, prev, { dispData: Object.assign({}, dispData, { linhas: novasLinhas }) });
                    });
                }

                function conectar() {
                    if (_dispWsAuthFailed.current) return;
                    try {
                        var wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://').replace('/api', '') + '/ws/disponibilidade';
                        console.log('🔌 [WS-Disp] Conectando:', wsUrl);
                        var ws = new WebSocket(wsUrl);

                        ws.onopen = function() {
                            console.log('✅ [WS-Disp] Conectado!');
                            var token = getToken ? getToken() : null;
                            if (token) {
                                ws.send(JSON.stringify({ type: 'AUTH', token: token }));
                            } else {
                                _dispWsAuthFailed.current = true;
                                ws.close();
                            }
                            if (_dispWsReconnect.current) {
                                clearTimeout(_dispWsReconnect.current);
                                _dispWsReconnect.current = null;
                            }
                        };

                        ws.onmessage = function(event) {
                            try {
                                var data = JSON.parse(event.data);
                                if (data.event === 'AUTH_SUCCESS') {
                                    _dispWsIdRef.current = data.wsId;
                                    _dispWsAuthFailed.current = false;
                                    console.log('✅ [WS-Disp] Autenticado, wsId:', data.wsId);
                                    return;
                                }
                                if (data.event === 'PONG' || data.event === 'CONNECTED') return;
                                if (data.event === 'AUTH_ERROR' || data.event === 'AUTH_EXPIRED') {
                                    _dispWsAuthFailed.current = true;
                                    return;
                                }

                                // Atualização cirúrgica por tipo de evento
                                if (data.event === 'DISP_LINHA_UPDATE' && data.data && data.data.id) {
                                    atualizarLinha(data.data);
                                } else if (data.event === 'DISP_LINHAS_ADD' && data.data && data.data.linhas) {
                                    adicionarLinhas(data.data.loja_id, data.data.linhas);
                                } else if (data.event === 'DISP_LINHA_DELETE' && data.data && data.data.id) {
                                    removerLinha(data.data.id);
                                } else if (data.event === 'DISP_RELOAD') {
                                    reloadDebounced();
                                } else if (data.event === 'DISPONIVEIS_CHANGED') { // DISPONIVEIS_V1
                                    window.dispatchEvent(new CustomEvent('disponiveis:changed', { detail: data.data || {} }));
                                }
                            } catch (err) {
                                console.error('❌ [WS-Disp] Erro:', err);
                            }
                        };

                        ws.onclose = function() {
                            _dispWsRef.current = null;
                            if (!_dispWsAuthFailed.current && !_dispWsReconnect.current) {
                                _dispWsReconnect.current = setTimeout(function() {
                                    _dispWsReconnect.current = null;
                                    conectar();
                                }, 5000);
                            }
                        };

                        ws.onerror = function() {};

                        _dispWsRef.current = ws;
                    } catch (err) {
                        console.error('❌ [WS-Disp] Falha:', err);
                    }
                }

                var pingInterval = setInterval(function() {
                    if (_dispWsRef.current && _dispWsRef.current.readyState === WebSocket.OPEN) {
                        _dispWsRef.current.send(JSON.stringify({ type: 'PING' }));
                    }
                }, 30000);

                conectar();

                return function() {
                    window.removeEventListener('disponibilidade:reload', _onDispReload); // DISPONIVEIS_V1
                    clearInterval(pingInterval);
                    if (_dispWsReconnect.current) clearTimeout(_dispWsReconnect.current);
                    if (_dispWsReloadTimer.current) clearTimeout(_dispWsReloadTimer.current);
                    if (_dispWsRef.current) {
                        _dispWsRef.current.onclose = null;
                        _dispWsRef.current.close();
                        _dispWsRef.current = null;
                    }
                };
            }, [l?.codProfissional]);
            // ===== FIM WEBSOCKET =====

            const o = async () => {
                const e = p.novaRegiao?.trim();
                if (e) try {
                    const t = await _fetch(`${API_URL}/disponibilidade/regioes`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            nome: e
                        })
                    });
                    if (!t.ok) {
                        const e = await t.json();
                        throw new Error(e.error || "Erro ao criar")
                    }
                    x(e => ({
                        ...e,
                        novaRegiao: ""
                    })), ja(`Região "${e}" adicionada!`, "success"), r()
                } catch (e) {
                    ja(e.message, "error")
                } else ja("Digite o nome da região", "error")
            }, c = (t, a, l) => {
                // 🔧 v16 (2026-05-25): FIX DEFINITIVO. Causa raiz identificada via logs v15:
                // o callback de x(prev => ...) é ASSÍNCRONO no React 18 (concurrent mode),
                // então r/o ficavam null quando o handler verificava logo depois → abort
                // antes do debounce → PUT nunca rodava.
                // SOLUÇÃO: lê estado SÍNCRONO via _dispStateRef.current (sempre fresco).
                // Toda lógica roda FORA do setState. setState só aplica o resultado.
                if (window._dispMarkLocalEdit) window._dispMarkLocalEdit(t);

                // 1) LÊ estado SÍNCRONO via ref (não depende de setState callback)
                const estadoAtual = _dispStateRef.current;
                const linhasOrig = estadoAtual?.dispData?.linhas || [];
                const idxAtual = linhasOrig.findIndex(item => item.id === t);
                if (idxAtual === -1) {
                    return;
                }

                // 2) Calcula nova linha SÍNCRONO (cópia, não muta original)
                const linhasAtuais = [...linhasOrig];
                linhasAtuais[idxAtual] = { ...linhasAtuais[idxAtual], [a]: l };
                let s = linhasAtuais[idxAtual].nome_profissional;

                // Lookup local de nome (UX hint) — defensive em pe/A
                if (a === "cod_profissional") {
                    if (l && "" !== l.trim() && l.length >= 1) {
                        try {
                            const m1 = (pe && typeof pe.find === 'function') ? pe.find(p => p.codigo === l.toString()) : null;
                            if (m1) {
                                s = m1.nome;
                                linhasAtuais[idxAtual] = { ...linhasAtuais[idxAtual], nome_profissional: m1.nome };
                            } else {
                                const m2 = (A && typeof A.find === 'function') ? A.find(u => u.codProfissional?.toLowerCase() === l.toLowerCase()) : null;
                                if (m2) {
                                    s = m2.fullName;
                                    linhasAtuais[idxAtual] = { ...linhasAtuais[idxAtual], nome_profissional: m2.fullName };
                                }
                            }
                        } catch (errLookup) {
                        }
                    } else if (!l || "" === l.trim()) {
                        s = "";
                        linhasAtuais[idxAtual] = { ...linhasAtuais[idxAtual], nome_profissional: "" };
                    }
                }

                // 3) APLICA setState (só pra refletir na UI — não usamos o callback pra lógica)
                try {
                    x(prev => ({ ...prev, dispData: { ...prev.dispData, linhas: linhasAtuais } }));
                } catch (errSetState) {
                }

                // 4) r e o já estão setados — segue pro debounce SEM depender do setState callback
                const r = linhasAtuais;
                const o = idxAtual;
                // Debounce: verificar restrição + buscar nome no CRM + salvar no backend
                const debounceKey = 'dispDebounce_' + t + '_' + a;
                clearTimeout(window[debounceKey]);
                window[debounceKey] = setTimeout(async () => {
                    try {
                        // Verificar restrição apenas para cod_profissional com valor
                        if ("cod_profissional" === a && l && "" !== l.trim()) {
                            // 🔧 FIX CADASTRO-CRM: resolve nome definitivo via backend.
                            // Fonte de verdade = crm_leads_capturados (aba Cadastro do CRM),
                            // com cadeia de fallback: CRM → planilha → disponibilidade → users.
                            // Definido em /api/crm/profissionais-cadastro/:cod.
                            try {
                                const nomeResp = await _fetch(`${API_URL}/crm/profissionais-cadastro/${encodeURIComponent(l)}`);
                                if (nomeResp.ok) {
                                    const nomeData = await nomeResp.json();
                                    if (nomeData && nomeData.encontrado && nomeData.profissional && nomeData.profissional.nome) {
                                        const nomeResolvido = nomeData.profissional.nome;
                                        // Só atualiza se o nome mudou (evita re-render desnecessário)
                                        if (nomeResolvido !== s) {
                                            s = nomeResolvido;
                                            r[o].nome_profissional = nomeResolvido;
                                            // Atualiza o state pra refletir o nome certo na UI
                                            x(prev => {
                                                const linhas = [...(prev.dispData?.linhas || [])];
                                                const idx = linhas.findIndex(e => e.id === t);
                                                if (idx !== -1 && linhas[idx].cod_profissional === l) {
                                                    // Só atualiza se o código ainda é o mesmo que buscamos
                                                    // (usuário pode ter trocado enquanto o fetch estava em voo)
                                                    linhas[idx] = { ...linhas[idx], nome_profissional: nomeResolvido };
                                                }
                                                return { ...prev, dispData: { ...prev.dispData, linhas } };
                                            });
                                        }
                                    } else {
                                        // Backend respondeu mas não achou — limpa nome pra não deixar hint stale
                                        s = "";
                                        r[o].nome_profissional = "";
                                        x(prev => {
                                            const linhas = [...(prev.dispData?.linhas || [])];
                                            const idx = linhas.findIndex(e => e.id === t);
                                            if (idx !== -1 && linhas[idx].cod_profissional === l) {
                                                linhas[idx] = { ...linhas[idx], nome_profissional: "" };
                                            }
                                            return { ...prev, dispData: { ...prev.dispData, linhas } };
                                        });
                                    }
                                }
                                // Se !nomeResp.ok (ex: 404, 500), mantém o que o lookup local achou
                            } catch (errNome) {
                                console.warn('[disponibilidade] lookup CRM falhou, mantendo hint local:', errNome.message);
                            }

                            try {
                                const resp = await _fetch(`${API_URL}/disponibilidade/restricoes/verificar?cod_profissional=${l}&loja_id=${r[o].loja_id}`),
                                    dados = await resp.json();
                                if (dados.restrito) {
                                    const lojaDesc = dados.todas_lojas ? "TODAS AS LOJAS" : `loja ${dados.loja_codigo} - ${dados.loja_nome}`;
                                    alert(`MOTOBOY RESTRITO!\n\nCódigo: ${l}\nRestrito em: ${lojaDesc}\n\nMotivo: ${dados.motivo}\n\nEste motoboy não pode ser inserido nesta loja.`);
                                    // Limpar o código do motoboy restrito
                                    x(prev => {
                                        const linhas = [...(prev.dispData?.linhas || [])];
                                        const idx = linhas.findIndex(e => e.id === t);
                                        if (idx !== -1) {
                                            linhas[idx] = { ...linhas[idx], cod_profissional: "", nome_profissional: "" };
                                        }
                                        return { ...prev, dispData: { ...prev.dispData, linhas } };
                                    });
                                    // Limpar no backend também
                                    await _fetch(`${API_URL}/disponibilidade/linhas/${t}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ cod_profissional: null, nome_profissional: null, status: r[o].status, observacao: r[o].observacao })
                                    });
                                    return;
                                }
                            } catch (err) {
                                console.error("Erro ao verificar restrição:", err);
                            }
                        }
                        const usuarioLogado = JSON.parse(sessionStorage.getItem("tutts_user") || "{}");
                        // 🔧 v11 (2026-05-24): LOGS EXPLÍCITOS pra debug
                        const putBody = {
                            cod_profissional: r[o].cod_profissional || null,
                            nome_profissional: "cod_profissional" === a ? s || null : r[o].nome_profissional || null,
                            status: r[o].status,
                            observacao: r[o].observacao,
                            observacao_usuario: usuarioLogado?.fullName || "Sistema",
                            status_usuario: usuarioLogado?.fullName || "Sistema"
                        };
                        const putResp = await _fetch(`${API_URL}/disponibilidade/linhas/${t}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(putBody)
                        });
                        if (putResp && putResp.ok) {
                            try {
                                const linhaAtualizada = await putResp.json();
                                if (linhaAtualizada && linhaAtualizada.id) {
                                    _dispLocalEdits.current[linhaAtualizada.id] = Date.now();
                                    // 🔧 v14: backend já devolve `foto` na linha (LEFT JOIN com users).
                                    // O merge abaixo já leva a foto automaticamente — não precisa mais
                                    // do fire-and-forget /perfil/fotos que existia em v11/v12/v13.
                                    _dispSetStateRef.current(function(prev) {
                                        var dd = prev.dispData;
                                        if (!dd || !dd.linhas) return prev;
                                        return Object.assign({}, prev, { dispData: Object.assign({}, dd, { linhas: dd.linhas.map(function(li) { return li.id === linhaAtualizada.id ? Object.assign({}, li, linhaAtualizada) : li; }) }) });
                                    });
                                }
                            } catch(parseErr) {
                            }
                        } else {
                            // 🔧 v11: PUT falhou — tenta extrair mensagem de erro do backend
                            let detalhe = '';
                            try { detalhe = await putResp.text(); } catch(_) {}
                            if (typeof ja === 'function') {
                                ja(`Erro ao salvar linha (${putResp.status})`, 'error');
                            }
                        }
                    } catch (e) {
                        console.error("Erro ao salvar linha:", e);
                        if (typeof ja === 'function') {
                            ja('Erro ao salvar linha: ' + e.message, 'error');
                        }
                    }
                }, 600)
            }, s = async (e, t, a = !1) => {
                // Optimistic update: faz o POST, pega as linhas reais de volta (com ID real do banco)
                // e insere direto no estado local. Não chama r() — assim não há refetch nem flash da tela.
                // Se falhar, toast de erro e estado local não muda (sem rollback necessário porque não mudamos nada antes).
                try {
                    const resp = await _fetch(`${API_URL}/disponibilidade/linhas`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ loja_id: e, quantidade: t, is_excedente: a })
                    });
                    const linhasNovas = await resp.json();
                    if (!Array.isArray(linhasNovas)) throw new Error("Resposta inválida");
                    
                    // Merge no estado: adiciona as novas linhas ao array existente sem tocar no resto.
                    x(prev => ({
                        ...prev,
                        dispData: {
                            ...prev.dispData,
                            linhas: [...(prev.dispData?.linhas || []), ...linhasNovas]
                        }
                    }));
                    ja(`${t} ${a ? "excedente(s)" : "titular(es)"} adicionado(s)!`, "success");
                } catch (e) {
                    ja("Erro ao adicionar linhas", "error");
                }
            },
            // Remove UMA linha específica (titular ou excedente) pelo ID.
            // Pergunta confirmação quando a linha tem motoboy associado pra evitar apagar alguém ativo.
            removerLinhaIndividual = async (linha, rotuloTipo, nomeLoja, reload, toast) => {
                const motoboy = (linha.nome_profissional || '').trim();
                const status = linha.status || 'A CONFIRMAR';
                
                let mensagem;
                if (motoboy) {
                    mensagem = `Remover ${rotuloTipo} da loja "${nomeLoja}"?\n\n` +
                               `Motoboy: ${motoboy}\n` +
                               `Status: ${status}\n\n` +
                               `Essa linha tem um motoboy vinculado. Confirma a remoção?`;
                } else {
                    mensagem = `Remover ${rotuloTipo} (linha vazia) da loja "${nomeLoja}"?`;
                }
                
                if (!window.confirm(mensagem)) return;
                
                // Optimistic remove: tira a linha do estado imediatamente (tela atualiza sem flash).
                // Se o DELETE falhar, colocamos de volta e avisamos o usuário (rollback).
                x(prev => ({
                    ...prev,
                    dispData: {
                        ...prev.dispData,
                        linhas: (prev.dispData?.linhas || []).filter(l => l.id !== linha.id)
                    }
                }));
                
                try {
                    // ?force=true sinaliza que a exclusão vem da aba admin/Config:
                    // backend pula a regra de limite mínimo de titulares e decrementa qtd_titulares
                    // da loja (reconfigurando, não ficando inconsistente).
                    const resp = await _fetch(`${API_URL}/disponibilidade/linhas/${linha.id}?force=true`, { method: "DELETE" });
                    if (!resp.ok) throw new Error("DELETE falhou");
                    toast(`${rotuloTipo} removido!`, "success");
                } catch (e) {
                    // Rollback: recoloca a linha no estado e avisa.
                    x(prev => ({
                        ...prev,
                        dispData: {
                            ...prev.dispData,
                            linhas: [...(prev.dispData?.linhas || []), linha]
                        }
                    }));
                    toast(`Erro ao remover ${rotuloTipo.toLowerCase()} — tente novamente`, "error");
                }
            },
            // Renderiza o popover que aparece embaixo do badge ao clicar.
            // Mostra a lista de linhas com nome+status+botão remover. Fecha no X ou clicando no badge de novo.
            renderPopoverLinhas = (linhas, titulo, onFechar, adicionarFn, reload, toast, nomeLoja) => {
                const rotuloTipo = titulo === 'Titulares' ? 'titular' : 'excedente';
                // Modal centralizado: backdrop escuro cobre a tela, modal no meio.
                // fixed inset-0 foge do overflow da tabela (que cortava o popover antigo).
                // onClick no backdrop fecha; stopPropagation no modal interno evita fechar ao clicar dentro.
                return React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                    onClick: onFechar
                },
                    React.createElement("div", {
                        className: "bg-white border border-gray-300 rounded-lg shadow-2xl w-full max-w-md",
                        onClick: (e) => e.stopPropagation(),
                        style: { textAlign: "left" }
                    },
                        // Header com título + nome da loja + botão fechar
                        React.createElement("div", {
                            className: "flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg"
                        },
                            React.createElement("div", null,
                                React.createElement("div", { className: "text-sm font-semibold text-gray-800" },
                                    `${titulo} (${linhas.length})`
                                ),
                                React.createElement("div", { className: "text-xs text-gray-500 mt-0.5 truncate max-w-[300px]" }, nomeLoja)
                            ),
                            React.createElement("button", {
                                onClick: onFechar,
                                className: "text-gray-400 hover:text-gray-700 text-lg leading-none px-2"
                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                        ),
                        // Lista de linhas (scroll interno se muitas)
                        linhas.length === 0
                            ? React.createElement("div", {
                                className: "px-4 py-6 text-sm text-gray-500 text-center italic"
                            }, `Nenhum ${rotuloTipo} cadastrado`)
                            : React.createElement("div", {
                                className: "max-h-[60vh] overflow-y-auto"
                            }, linhas.map((linha, idx) => React.createElement("div", {
                                key: linha.id,
                                className: "flex items-center justify-between px-4 py-2.5 border-b last:border-b-0 hover:bg-gray-50"
                            },
                                React.createElement("div", { className: "flex-1 min-w-0 mr-3" },
                                    React.createElement("div", { className: "text-sm font-medium text-gray-800 truncate" },
                                        linha.nome_profissional
                                            ? linha.nome_profissional
                                            : React.createElement("span", { className: "text-gray-400 italic" }, `${idx + 1}. (vazia)`)
                                    ),
                                    linha.nome_profissional && React.createElement("div", {
                                        className: "text-xs text-gray-500 mt-0.5"
                                    }, linha.status || 'A CONFIRMAR')
                                ),
                                React.createElement("button", {
                                    onClick: () => removerLinhaIndividual(linha, titulo.slice(0, -1), nomeLoja, reload, toast),
                                    className: "px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-sm flex-shrink-0",
                                    title: `Remover ${rotuloTipo}`
                                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))
                            ))),
                        // Footer com ação secundária de fechar
                        React.createElement("div", {
                            className: "px-4 py-2 border-t bg-gray-50 rounded-b-lg flex justify-end"
                        },
                            React.createElement("button", {
                                onClick: onFechar,
                                className: "px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                            }, "Fechar")
                        )
                    )
                );
            }, n = {
                "A CONFIRMAR": "bg-gray-100 text-gray-700 border-gray-200",
                CONFIRMADO: "bg-blue-50 text-blue-800 border-blue-200",
                "A CAMINHO": "bg-amber-50 text-amber-800 border-amber-200",
                "EM LOJA": "bg-green-50 text-green-800 border-green-200",
                FALTANDO: "bg-red-50 text-red-800 border-red-200",
                "SEM CONTATO": "bg-gray-100 text-gray-700 border-gray-300"
            }, m = {
                "A CONFIRMAR": "bg-gray-50",
                CONFIRMADO: "bg-blue-50",
                "A CAMINHO": "bg-amber-50",
                "EM LOJA": "bg-green-50",
                FALTANDO: "bg-red-50",
                "SEM CONTATO": "bg-gray-100"
            };
            /* DISP_CLEAN_V1 — redesign clean: tokens de status unificados em todas as telas da Disponibilidade.
               A confirmar = cinza, Confirmado = azul, A caminho = âmbar, Em loja = verde, Faltando = vermelho, Sem contato = cinza escuro. */
            const _h = React.createElement;
            const DS_SORA = "Sora, Inter, sans-serif";
            const DS_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
            const DS = {
                "A CONFIRMAR": { label: "A confirmar", cor: "#6b7280", txt: "#374151", bg: "#f3f4f6" },
                CONFIRMADO: { label: "Confirmado", cor: "#2563eb", txt: "#1e40af", bg: "#eff6ff" },
                "A CAMINHO": { label: "A caminho", cor: "#d97706", txt: "#92400e", bg: "#fffbeb" },
                "EM LOJA": { label: "Em loja", cor: "#16a34a", txt: "#166534", bg: "#f0fdf4" },
                FALTANDO: { label: "Faltando", cor: "#dc2626", txt: "#991b1b", bg: "#fef2f2" },
                "SEM CONTATO": { label: "Sem contato", cor: "#374151", txt: "#374151", bg: "#f3f4f6" }
            };
            const DS_ORDEM = ["A CONFIRMAR", "CONFIRMADO", "A CAMINHO", "EM LOJA", "FALTANDO", "SEM CONTATO"];
            // Fundo das linhas do Painel (bate com a legenda)
            const DS_ROW = { reposicao: "#eff6ff", excedente: "#fffbeb", falta: "#fef2f2" };
            const _dsIco = (nome, sz, cor) => _h("svg", { className: "ico", style: { width: sz || 16, height: sz || 16, color: cor }, "aria-hidden": "true" }, _h("use", { href: "#i-" + nome }));
            const _dsDot = (cor, sz) => _h("span", { "aria-hidden": "true", style: { width: sz || 6, height: sz || 6, borderRadius: 99, background: cor, flex: "none", display: "inline-block" } });
            const _dsPill = (status, texto) => {
                const s = DS[status] || DS["A CONFIRMAR"];
                return _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 99, padding: "2px 9px", fontWeight: 600, fontSize: 11.5, background: s.bg, color: s.txt, whiteSpace: "nowrap" } }, _dsDot(s.cor), texto || s.label);
            };
            const _dsFaixa = (pct, verdeEm) => pct >= (verdeEm || 80) ? ["#16a34a", "#166534"] : pct >= 50 ? ["#d97706", "#92400e"] : ["#dc2626", "#991b1b"];
            const _dsBar = (pct, cor, alt) => _h("div", { style: { flex: 1, height: alt || 6, borderRadius: 99, background: "#f3f4f6", overflow: "hidden", minWidth: 40 } }, _h("div", { style: { height: alt || 6, width: Math.max(0, Math.min(100, pct)) + "%", background: cor, borderRadius: 99 } }));
            const DS_CARD = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14 };
            const DS_BTN = { height: 38, padding: "0 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#ffffff", color: "#374151", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "inherit" };
            const DS_BTN_SM = { height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#ffffff", color: "#374151", fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", whiteSpace: "nowrap" };
            const _dsHoje = () => (new Date).toISOString().split("T")[0];
            const _dsKpi = (rotulo, valor, sub, cor, extra) => _h("div", { style: Object.assign({ padding: "16px 20px", borderRight: "1px solid #f3f4f6", minWidth: 0 }, extra || {}) },
                _h("div", { style: { fontSize: 12, color: "#6b7280" } }, rotulo),
                _h("div", { style: { fontFamily: DS_SORA, fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: cor || "#111827", lineHeight: 1.25, marginTop: 2 } }, valor),
                sub ? _h("div", { style: { fontSize: 11.5, color: "#6b7280", marginTop: 2 } }, sub) : null);

            /* DISP_CLEAN_V1 — Panorama do dia */
            const _dispPanoramaClean = () => {
                const linhasAll = e.linhas || [];
                const titularesN = linhasAll.filter(l => !l.is_excedente && !l.is_reposicao).length;
                const emLojaN = linhasAll.filter(l => "EM LOJA" === l.status).length;
                const aCaminhoN = linhasAll.filter(l => "A CAMINHO" === l.status).length;
                const confirmadoN = linhasAll.filter(l => "CONFIRMADO" === l.status).length;
                const semContato = linhasAll.filter(l => "SEM CONTATO" === l.status).length;
                const faltam100 = Math.max(0, titularesN - emLojaN);
                const percGeral = titularesN > 0 ? Math.round(Math.min(emLojaN / titularesN * 100, 100)) : 0;
                const faixaGeral = _dsFaixa(percGeral);
                const lojasCriticas = (e.lojas || []).filter(loja => {
                    const lojaLinhas = linhasAll.filter(l => l.loja_id === loja.id);
                    const lojaTit = lojaLinhas.filter(l => !l.is_excedente && !l.is_reposicao);
                    const lojaEmLoja = lojaTit.filter(l => l.status === "EM LOJA").length;
                    return lojaTit.length > 0 && (lojaEmLoja / lojaTit.length) < 0.5;
                });
                const horaSync = (new Date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

                // Linhas da tabela (mesmos cálculos de antes)
                const ordem = p.panoramaOrdem || "regiao",
                    regs = e.regioes || [],
                    lojas = e.lojas || [],
                    lin = e.linhas || [],
                    rows = lojas.map(lj => {
                        const tl = lin.filter(li => li.loja_id === lj.id),
                            tit = tl.filter(li => !li.is_excedente && !li.is_reposicao).length,
                            aCam = tl.filter(li => "A CAMINHO" === li.status).length,
                            conf = tl.filter(li => "CONFIRMADO" === li.status).length,
                            emL = tl.filter(li => "EM LOJA" === li.status).length,
                            semC = tl.filter(li => "SEM CONTATO" === li.status).length,
                            emOp = aCam + conf + emL,
                            falta = Math.max(0, tit - emOp),
                            perc = tit > 0 ? Math.min(emL / tit * 100, 100) : 0,
                            regiao = regs.find(rg => rg.id === lj.regiao_id);
                        return { ...lj, titulares: tit, aCaminho: aCam, confirmado: conf, emLoja: emL, semContato: semC, emOperacao: emOp, falta, perc, regiao };
                    });
                const tot = { aCaminho: 0, confirmado: 0, emLoja: 0, titulares: 0, falta: 0, semContato: 0, emOperacao: 0 };
                rows.forEach(rw => { tot.aCaminho += rw.aCaminho; tot.confirmado += rw.confirmado; tot.emLoja += rw.emLoja; tot.titulares += rw.titulares; tot.falta += rw.falta; tot.semContato += rw.semContato; tot.emOperacao += rw.emOperacao; });
                const totPerc = tot.titulares > 0 ? Math.min(tot.emLoja / tot.titulares * 100, 100) : 0;
                "pior" === ordem ? rows.sort((a1, b1) => a1.perc - b1.perc) : "melhor" === ordem ? rows.sort((a1, b1) => b1.perc - a1.perc) : "alfa" === ordem && rows.sort((a1, b1) => a1.nome.localeCompare(b1.nome));

                const tdNum = (v, cor, peso, txt) => _h("td", { style: { padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: peso || 400, color: v > 0 ? cor : "#d1d5db" } }, txt !== undefined ? txt : v);
                const tdCobertura = (perc, peso) => {
                    const fx = _dsFaixa(perc);
                    return _h("td", { style: { padding: "9px 18px" } }, _h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                        _dsBar(perc, fx[0]),
                        _h("b", { style: { width: 40, textAlign: "right", fontVariantNumeric: "tabular-nums", color: fx[1], fontWeight: peso || 700 } }, perc.toFixed(0) + "%")));
                };
                const trLoja = (rw, idx, comRegiao) => _h("tr", { key: rw.id, style: { borderTop: "1px solid #f3f4f6", background: rw.perc < 50 ? "#fef2f2" : "#ffffff" } },
                    _h("td", { style: { padding: "9px 18px", fontWeight: 500, whiteSpace: "nowrap", color: "#111827" } },
                        comRegiao ? _h("span", { style: { color: "#9ca3af", marginRight: 6, fontVariantNumeric: "tabular-nums" } }, (idx + 1) + ".") : null,
                        rw.nome,
                        comRegiao && rw.regiao ? _h("span", { style: { color: "#9ca3af", fontWeight: 400 } }, " · " + rw.regiao.nome) : null),
                    tdNum(rw.aCaminho, DS["A CAMINHO"].txt),
                    tdNum(rw.confirmado, DS.CONFIRMADO.txt),
                    tdNum(rw.emLoja, DS["EM LOJA"].txt, 600),
                    _h("td", { style: { padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#6b7280" } }, rw.titulares),
                    tdNum(rw.falta, DS.FALTANDO.txt, 600, rw.falta > 0 ? "−" + rw.falta : 0),
                    tdNum(rw.semContato, DS["SEM CONTATO"].txt),
                    tdCobertura(rw.perc));
                const trTotal = _h("tr", { style: { background: "#f9fafb", borderTop: "1px solid #e5e7eb" } },
                    _h("td", { style: { padding: "10px 18px", fontWeight: 700, color: "#111827" } }, "Total geral"),
                    tdNum(tot.aCaminho, DS["A CAMINHO"].txt, 700),
                    tdNum(tot.confirmado, DS.CONFIRMADO.txt, 700),
                    tdNum(tot.emLoja, DS["EM LOJA"].txt, 700),
                    _h("td", { style: { padding: "9px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#6b7280", fontWeight: 700 } }, tot.titulares),
                    tdNum(tot.falta, DS.FALTANDO.txt, 700, tot.falta > 0 ? "−" + tot.falta : 0),
                    tdNum(tot.semContato, DS["SEM CONTATO"].txt, 700),
                    tdCobertura(totPerc, 800));
                const th = (txt, esq, extra) => _h("th", { style: Object.assign({ padding: esq ? "10px 18px" : "10px", fontWeight: 600, textAlign: esq ? "left" : "right", whiteSpace: "nowrap" }, extra || {}) }, txt);

                return _h("div", { className: "space-y-4" },
                    // Cabeçalho da página
                    _h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 } },
                        _h("div", null,
                            _h("h1", { style: { margin: 0, fontFamily: DS_SORA, fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "#111827" } }, "Panorama do dia"),
                            _h("p", { style: { margin: "4px 0 0", color: "#6b7280", fontSize: 13, display: "flex", alignItems: "center", gap: 6 } }, _dsDot("#16a34a", 7), "Sincronizado às " + horaSync)),
                        _h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
                            _h("input", {
                                type: "date",
                                "aria-label": "Data da planilha",
                                value: p.dispDataPlanilha || _dsHoje(),
                                onChange: ev => x({ ...p, dispDataPlanilha: ev.target.value }),
                                style: DS_BTN
                            }),
                            _h("select", {
                                "aria-label": "Ordenação",
                                value: p.panoramaOrdem || "regiao",
                                onChange: ev => x({ ...p, panoramaOrdem: ev.target.value }),
                                style: DS_BTN
                            }, _h("option", { value: "regiao" }, "Ordenar: por região"), _h("option", { value: "pior" }, "Ordenar: pior → melhor"), _h("option", { value: "melhor" }, "Ordenar: melhor → pior"), _h("option", { value: "alfa" }, "Ordenar: A → Z")),
                            _h("button", {
                                type: "button",
                                onClick: () => { navigator.clipboard.writeText(`${API_URL}/disponibilidade/publico`), ja("Link copiado!", "success") },
                                title: "Copiar link público (somente leitura)",
                                style: { ...DS_BTN, fontWeight: 600 }
                            }, _dsIco("link", 15), "Copiar link público"),
                            _h("button", { type: "button", onClick: r, title: "Atualizar", "aria-label": "Atualizar", style: { ...DS_BTN, width: 38, padding: 0, justifyContent: "center" } }, _dsIco("refresh", 16)))),
                    // Faixa de KPIs
                    _h("section", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]", style: { ...DS_CARD, overflow: "hidden" } },
                        _h("div", { style: { padding: "16px 20px", borderRight: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 } },
                            _h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" } },
                                _h("span", { style: { fontSize: 12, color: "#6b7280" } }, "Cobertura geral"),
                                _h("span", { style: { fontSize: 12, color: "#6b7280" } }, faltam100 > 0 ? "faltam " + faltam100 + " para 100%" : "meta atingida")),
                            _h("div", { style: { fontFamily: DS_SORA, fontSize: 30, fontWeight: 700, color: faixaGeral[1], lineHeight: 1.15, fontVariantNumeric: "tabular-nums" } }, percGeral + "%"),
                            _h("div", { style: { display: "flex" } }, _dsBar(percGeral, faixaGeral[0]))),
                        _dsKpi("Em loja", _h(React.Fragment, null, emLojaN, _h("span", { style: { fontSize: 15, color: "#9ca3af", fontWeight: 600 } }, " / " + titularesN)), aCaminhoN + " a caminho · " + confirmadoN + " confirmado" + (confirmadoN === 1 ? "" : "s")),
                        _dsKpi("Sem contato", semContato, semContato === 1 ? "motoboy sem retorno" : "motoboys sem retorno", semContato > 0 ? "#374151" : "#111827"),
                        _dsKpi("Lojas críticas", lojasCriticas.length, "abaixo de 50%", lojasCriticas.length > 0 ? "#991b1b" : "#111827", { borderRight: 0 })),
                    // Precisam de atenção
                    lojasCriticas.length > 0 && _h("section", { style: { ...DS_CARD, padding: "6px 0", overflow: "hidden" } },
                        _h("div", { style: { padding: "10px 18px 8px", fontWeight: 600, fontSize: 14, color: "#111827", display: "flex", alignItems: "center", gap: 8 } }, "Precisam de atenção", _h("span", { style: { fontWeight: 400, fontSize: 12, color: "#6b7280" } }, lojasCriticas.length + " abaixo de 50%")),
                        lojasCriticas.slice(0, 5).map(loja => {
                            const lojaLinhas = linhasAll.filter(l => l.loja_id === loja.id);
                            const lojaTit = lojaLinhas.filter(l => !l.is_excedente && !l.is_reposicao);
                            const lojaEmLoja = lojaTit.filter(l => l.status === "EM LOJA").length;
                            const lojaPerc = lojaTit.length > 0 ? Math.round((lojaEmLoja / lojaTit.length) * 100) : 0;
                            const regiaoLoja = (e.regioes || []).find(rg => rg.id === loja.regiao_id);
                            const ir = () => x({ ...p, dispRegiaoAtiva: loja.regiao_id, dispSubTab: "principal", dispLojasAbertas: [loja.id] });
                            return _h("div", {
                                key: loja.id,
                                role: "button",
                                tabIndex: 0,
                                onClick: ir,
                                onKeyDown: ev => { (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), ir()) },
                                className: "hover:bg-gray-50",
                                title: "Clique para ir ao painel desta loja",
                                style: { display: "grid", gridTemplateColumns: "64px minmax(0, 1fr) auto 48px", gap: 12, alignItems: "center", padding: "10px 18px", borderTop: "1px solid #f3f4f6", cursor: "pointer", color: "#111827", fontSize: 13 }
                            },
                                _h("span", { style: { fontFamily: DS_MONO, fontSize: 12, color: "#5d0b85", fontWeight: 700 } }, loja.codigo),
                                _h("span", { style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, _h("b", { style: { fontWeight: 600 } }, loja.nome), regiaoLoja ? _h("span", { style: { color: "#6b7280" } }, " · " + regiaoLoja.nome) : null),
                                _h("span", { style: { color: "#6b7280", fontSize: 12, whiteSpace: "nowrap" } }, lojaEmLoja + " em loja de " + lojaTit.length),
                                _h("span", { style: { textAlign: "right", fontWeight: 700, color: "#991b1b", fontVariantNumeric: "tabular-nums" } }, lojaPerc + "%"));
                        })),
                    // Tabela
                    _h("section", { style: { ...DS_CARD, overflow: "hidden" } },
                        _h("div", { style: { padding: "12px 18px", display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "#6b7280", borderBottom: "1px solid #f3f4f6" } },
                            ["EM LOJA", "CONFIRMADO", "A CAMINHO", "FALTANDO", "SEM CONTATO"].map(st => _h("span", { key: st, style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _dsDot(DS[st].cor, 8), st === "FALTANDO" ? "Falta" : DS[st].label)),
                            _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" } }, _h("span", { style: { width: 14, height: 10, borderRadius: 3, background: "#fef2f2", border: "1px solid #fecaca" } }), "Loja abaixo de 50%")),
                        _h("div", { style: { overflowX: "auto" } },
                            _h("table", { id: "panorama-table", style: { width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 760 } },
                                _h("thead", null, _h("tr", { style: { color: "#6b7280", background: "#f9fafb", fontSize: 12 } },
                                    th("Loja", true), th("A caminho"), th("Confirm."), th("Em loja"), th("Ideal"), th("Falta"), th("S/ contato"), th("Cobertura", true, { width: 190 }))),
                                _h("tbody", null, "regiao" === ordem
                                    ? _h(React.Fragment, null, regs.map(rg => {
                                        const doGrupo = rows.filter(rw => rw.regiao_id === rg.id);
                                        return 0 === doGrupo.length ? null : _h(React.Fragment, { key: rg.id },
                                            _h("tr", { style: { background: "#f9fafb", borderTop: "1px solid #e5e7eb" } },
                                                _h("td", { colSpan: 8, style: { padding: "8px 18px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#6b7280" } }, rg.nome, rg.gestores ? " · " + rg.gestores : "")),
                                            doGrupo.map((rw, i2) => trLoja(rw, i2, false)));
                                    }), trTotal)
                                    : _h(React.Fragment, null, rows.map((rw, i2) => trLoja(rw, i2, true)), trTotal))))));
            };

            /* DISP_CLEAN_V1 — Painel (edição da escala do dia) */
            const _dispPainelClean = () => {
                const dataEscolhida = p.dispDataPlanilha || _dsHoje();
                const resetarDia = async () => {
                    const dataEsc = p.dispDataPlanilha || (new Date).toISOString().split("T")[0],
                        dataFmt = new Date(dataEsc + "T12:00:00").toLocaleDateString("pt-BR");
                    if (!window.confirm("Resetar disponibilidade do dia " + dataFmt + "?\n\n• Salva espelho do dia\n• Remove motoboys com 3+ dias SEM CONTATO\n• Reseta status para A CONFIRMAR\n• Limpa observações\n• Converte reposição em excedente")) return;
                    try {
                        x(es => ({ ...es, dispLoading: !0 }));
                        const a = await _fetch(`${API_URL}/disponibilidade/resetar`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ data_planilha: dataEsc })
                            }),
                            l = await a.json();
                        if (l.success) {
                            let msg = "Status resetado! Espelho salvo em " + dataFmt;
                            if (l.em_loja_registrados > 0) msg += " | " + l.em_loja_registrados + " em loja";
                            if (l.sem_contato_registrados > 0) msg += " | " + l.sem_contato_registrados + " sem contato";
                            ja(msg, "success");
                            if (l.removidos_por_sem_contato && l.removidos_por_sem_contato.length > 0) {
                                setTimeout(() => alert("Removidos por 3 dias SEM CONTATO:\n\n" + l.removidos_por_sem_contato.map(rm => rm.cod + " - " + rm.nome).join("\n")), 500);
                            }
                        } else ja("Erro ao resetar", "error");
                        r();
                    } catch (err) {
                        console.error("Erro ao resetar:", err);
                        ja("Erro ao resetar", "error");
                        x(es => ({ ...es, dispLoading: !1 }));
                    }
                };

                // Seletor segmentado de status (6 opções; Faltando abre o modal "Registrar Falta")
                const seletorStatus = (linha) => {
                    const status = linha.status || "A CONFIRMAR";
                    return _h("div", { role: "radiogroup", "aria-label": "Status do entregador", style: { display: "inline-flex", background: "#f3f4f6", borderRadius: 10, padding: 3, gap: 2, flexWrap: "nowrap" } },
                        DS_ORDEM.map(key => {
                            const st = DS[key];
                            const ativo = status === key;
                            return _h("button", {
                                key,
                                type: "button",
                                role: "radio",
                                "aria-checked": ativo ? "true" : "false",
                                title: "Marcar como " + st.label,
                                onClick: () => {
                                    if (key === "FALTANDO") {
                                        x(prev => ({ ...prev, modalFaltando: !0, faltandoLinha: linha, faltandoMotivo: "" }));
                                    } else {
                                        c(linha.id, "status", key);
                                    }
                                },
                                className: ativo ? "" : "hover:bg-white",
                                style: { border: 0, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: ativo ? 600 : 500, whiteSpace: "nowrap", cursor: "pointer", color: ativo ? "#ffffff" : "#6b7280", background: ativo ? st.cor : "transparent", fontFamily: "inherit" }
                            }, st.label);
                        }));
                };

                const linhaEntregador = (linha, lojaId) => {
                    const initials = (linha.nome_profissional || "").split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase() || "–";
                    const tipo = linha.is_reposicao ? "Reposição" : linha.is_excedente ? "Excedente" : "Titular";
                    const fundo = linha.is_reposicao ? DS_ROW.reposicao : linha.is_excedente ? DS_ROW.excedente : (linha.status === "FALTANDO" ? DS_ROW.falta : "#ffffff");
                    const obsText = linha.observacao || "";
                    const chips = [];
                    const dataMatch = obsText.match(/(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?/);
                    if (dataMatch) chips.push({ icon: "calendar", text: dataMatch[0], bg: "#fffbeb", fg: "#92400e" });
                    const horaMatch = obsText.match(/(\d{1,2})(?::?(\d{2}))?\s?h\b/i);
                    if (horaMatch) chips.push({ icon: "clock", text: horaMatch[0].toLowerCase(), bg: "#eff6ff", fg: "#1e40af" });
                    if (linha.status === "SEM CONTATO") chips.push({ icon: "phone", text: "sem contato", bg: "#f3f4f6", fg: "#374151" });
                    return _h("tr", { key: linha.id, style: { borderTop: "1px solid #f3f4f6", background: fundo } },
                        _h("td", { style: { padding: "10px 10px 10px 18px", width: 84 } },
                            _h("input", {
                                type: "text",
                                value: linha.cod_profissional || "",
                                onChange: ev => c(linha.id, "cod_profissional", ev.target.value),
                                "data-cod-input": linha.id,
                                "aria-label": "Código do entregador",
                                placeholder: "—",
                                className: "focus:outline-none focus:border-[#770fa8]",
                                style: { width: 66, height: 30, border: "1px solid #e5e7eb", borderRadius: 8, textAlign: "center", fontFamily: DS_MONO, fontSize: 12, color: "#374151", background: "#ffffff" }
                            })),
                        _h("td", { style: { padding: "10px", minWidth: 180 } },
                            _h("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                                linha.foto
                                    ? _h("img", { src: linha.foto, alt: linha.nome_profissional || "", style: { width: 30, height: 30, borderRadius: 99, objectFit: "cover", flex: "none", border: "1px solid #e5e7eb" } })
                                    : _h("span", { style: { width: 30, height: 30, borderRadius: 99, background: linha.nome_profissional ? "#f3e8fb" : "#f3f4f6", color: linha.nome_profissional ? "#5d0b85" : "#9ca3af", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flex: "none" } }, initials),
                                _h("div", { style: { minWidth: 0 } },
                                    _h("div", { style: { fontWeight: 600, fontSize: 13, color: linha.nome_profissional ? "#111827" : "#9ca3af", fontStyle: linha.nome_profissional ? "normal" : "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 } }, linha.nome_profissional || (linha.is_reposicao || linha.is_excedente ? "—" : "Vaga livre")),
                                    _h("div", { style: { fontSize: 11, color: "#9ca3af" } }, tipo)))),
                        _h("td", { style: { padding: "10px" } }, seletorStatus(linha)),
                        _h("td", { style: { padding: "10px", minWidth: 200 } },
                            _h("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" } },
                                chips.map((chip, ci) => _h("span", { key: ci, style: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 99, fontSize: 11, fontWeight: 500, background: chip.bg, color: chip.fg } }, _dsIco(chip.icon, 12), chip.text)),
                                _h("input", {
                                    type: "text",
                                    value: linha.observacao || "",
                                    onChange: ev => c(linha.id, "observacao", ev.target.value),
                                    placeholder: chips.length > 0 ? "" : "Observação",
                                    "aria-label": "Observação",
                                    title: linha.observacao_criada_por ? linha.observacao_criada_por : "",
                                    className: "focus:outline-none focus:border-[#770fa8]",
                                    style: { flex: 1, minWidth: 90, height: 30, padding: "0 8px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#374151", background: "#ffffff" }
                                }))),
                        _h("td", { style: { padding: "10px 18px 10px 4px", width: 44, textAlign: "center" } },
                            _h("button", {
                                type: "button",
                                onClick: () => {
                                    if (window.confirm("Remover esta linha?")) {
                                        _fetch(`${API_URL}/disponibilidade/linhas/${linha.id}`, { method: "DELETE" })
                                            .then(resp => resp.ok ? r() : ja("Erro ao remover", "error"));
                                    }
                                },
                                className: "hover:bg-red-50 hover:text-red-700",
                                style: { width: 28, height: 28, borderRadius: 8, border: 0, background: "transparent", color: "#9ca3af", display: "inline-grid", placeItems: "center", cursor: "pointer" },
                                title: "Remover linha",
                                "aria-label": "Remover linha"
                            }, _dsIco("x", 14))));
                };

                const lojaAcordeao = (t) => {
                    const a = (e.linhas || []).filter(li => li.loja_id === t.id),
                        aberta = (p.dispLojasAbertas || []).includes(t.id),
                        o = a.filter(li => "EM LOJA" === li.status).length,
                        totalTitulares = a.filter(li => !li.is_excedente && !li.is_reposicao).length,
                        i = a.filter(li => "FALTANDO" === li.status).length,
                        aCam = a.filter(li => "A CAMINHO" === li.status).length,
                        semC = a.filter(li => "SEM CONTATO" === li.status).length;
                    const pill = i > 0 ? _dsPill("FALTANDO", i + " faltando")
                        : (o >= totalTitulares && totalTitulares > 0) ? _dsPill("EM LOJA", "Completa")
                        : aCam > 0 ? _dsPill("A CAMINHO", aCam + " a caminho")
                        : semC > 0 ? _dsPill("SEM CONTATO", semC + " sem contato") : null;
                    const alternar = () => {
                        const atuais = p.dispLojasAbertas || [];
                        x(aberta ? { ...p, dispLojasAbertas: atuais.filter(id => id !== t.id) } : { ...p, dispLojasAbertas: [...atuais, t.id] });
                    };
                    const ordenadas = [...a].sort((e1, t1) => e1.is_reposicao && !t1.is_reposicao ? -1 : !e1.is_reposicao && t1.is_reposicao || e1.is_excedente && !t1.is_excedente ? 1 : !e1.is_excedente && t1.is_excedente ? -1 : 0);
                    return _h("section", { key: t.id, style: { ...DS_CARD, overflow: "hidden" } },
                        _h("div", {
                            role: "button",
                            tabIndex: 0,
                            "aria-expanded": aberta ? "true" : "false",
                            onClick: alternar,
                            onKeyDown: ev => { (ev.key === "Enter" || ev.key === " ") && ev.target === ev.currentTarget && (ev.preventDefault(), alternar()) },
                            className: "hover:bg-gray-50",
                            style: { padding: "14px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", cursor: "pointer", borderBottom: aberta ? "1px solid #f3f4f6" : "0" }
                        },
                            _h("span", { style: { display: "inline-flex", color: "#6b7280", transform: aberta ? "rotate(90deg)" : "none", transition: "transform .15s" } }, _dsIco("arrowright", 14)),
                            _h("span", { style: { fontFamily: DS_MONO, color: "#5d0b85", fontWeight: 700, fontSize: 13 } }, t.codigo),
                            _h("b", { style: { fontSize: 14, fontWeight: 600, color: "#111827" } }, t.nome),
                            pill,
                            _h("span", { style: { color: "#6b7280", fontSize: 13, fontVariantNumeric: "tabular-nums" } }, o + " de " + totalTitulares + " em loja"),
                            _h("div", { style: { marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" } },
                                _h("button", { type: "button", onClick: ev => { ev.stopPropagation(); s(t.id, 1, false); }, title: "Adicionar 1 titular", className: "hover:bg-gray-50", style: DS_BTN_SM }, _dsIco("plus", 13), "Adicionar titular"),
                                _h("button", { type: "button", onClick: ev => { ev.stopPropagation(); s(t.id, 1, true); }, title: "Adicionar 1 excedente", className: "hover:bg-gray-50", style: DS_BTN_SM }, _dsIco("plus", 13), "Adicionar excedente"))),
                        aberta && _h("div", { "data-loja-id": t.id, style: { overflowX: "auto" } },
                            _h("table", { style: { width: "100%", borderCollapse: "collapse", minWidth: 940, fontSize: 13 } },
                                _h("thead", null, _h("tr", { style: { color: "#6b7280", textAlign: "left", background: "#f9fafb", fontSize: 12 } },
                                    _h("th", { style: { padding: "9px 10px 9px 18px", fontWeight: 600 } }, "Cód."),
                                    _h("th", { style: { padding: "9px 10px", fontWeight: 600 } }, "Entregador"),
                                    _h("th", { style: { padding: "9px 10px", fontWeight: 600 } }, "Status · clique para mudar"),
                                    _h("th", { style: { padding: "9px 10px", fontWeight: 600 } }, "Observação"),
                                    _h("th", { style: { padding: "9px 18px 9px 4px" } }, _h("span", { className: "sr-only" }, "Ações")))),
                                _h("tbody", null,
                                    ordenadas.length === 0 && _h("tr", null, _h("td", { colSpan: 5, style: { padding: "18px", textAlign: "center", color: "#9ca3af", fontSize: 12.5 } }, "Nenhuma linha nesta loja. Use \"Adicionar titular\".")),
                                    ordenadas.map((linha, idx, arr) => {
                                        const isFirstExcedente = linha.is_excedente && (idx === 0 || !arr[idx - 1].is_excedente);
                                        return _h(React.Fragment, { key: linha.id },
                                            isFirstExcedente && _h("tr", { style: { borderTop: "1px solid #fde68a", background: "#fffbeb" } },
                                                _h("td", { colSpan: 5, style: { padding: "7px 18px" } },
                                                    _h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
                                                        _h("span", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#92400e" } }, "Excedentes · ", arr.filter(z => z.is_excedente).length),
                                                        _h("button", { type: "button", onClick: () => s(t.id, 1, true), style: { height: 26, padding: "0 10px", borderRadius: 8, border: "1px solid #fde68a", background: "#ffffff", color: "#92400e", fontSize: 11.5, fontWeight: 600, cursor: "pointer" } }, "+ Adicionar")))),
                                            linhaEntregador(linha, t.id));
                                    })))));
                };

                return _h("div", { className: "space-y-4" },
                    // Cabeçalho
                    _h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 } },
                        _h("h1", { style: { margin: "0 12px 0 0", fontFamily: DS_SORA, fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "#111827" } }, "Painel"),
                        _h("input", {
                            type: "date",
                            "aria-label": "Data da planilha",
                            value: dataEscolhida,
                            onChange: ev => x({ ...p, dispDataPlanilha: ev.target.value }),
                            style: DS_BTN
                        }),
                        _h("label", { style: { flex: "1 1 260px", display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px", border: "1px solid #e5e7eb", borderRadius: 10, background: "#ffffff", color: "#9ca3af" } },
                            _dsIco("search", 14),
                            _h("input", {
                                type: "text",
                                "aria-label": "Buscar motoboy",
                                placeholder: "Buscar código ou nome",
                                value: p.buscaEntregador || "",
                                onChange: ev => x({ ...p, buscaEntregador: ev.target.value }),
                                style: { flex: 1, minWidth: 0, border: 0, outline: 0, fontSize: 13, color: "#111827", background: "transparent", fontFamily: "inherit" }
                            }),
                            p.buscaEntregador && _h("button", {
                                type: "button",
                                onClick: () => x({ ...p, buscaEntregador: "" }),
                                style: { background: "none", border: "none", padding: 0, color: "#9ca3af", cursor: "pointer", display: "inline-flex" },
                                "aria-label": "Limpar busca"
                            }, _dsIco("x", 14))),
                        _h("button", { type: "button", onClick: r, className: "hover:bg-gray-50", style: { ...DS_BTN, fontWeight: 600 } }, _dsIco("refresh", 15), "Atualizar"),
                        _h("button", { type: "button", onClick: resetarDia, style: { ...DS_BTN, fontWeight: 600, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e" } }, "Resetar dia")),
                    // Resultados da busca
                    p.buscaEntregador && p.buscaEntregador.length >= 2 && _h("section", { style: { ...DS_CARD, overflow: "hidden" } },
                        _h("div", { style: { padding: "10px 18px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #f3f4f6" } }, 'Resultados para "', _h("b", { style: { color: "#111827" } }, p.buscaEntregador), '"'),
                        _h("div", { style: { maxHeight: 240, overflowY: "auto" } }, (() => {
                            const q = p.buscaEntregador.toLowerCase(),
                                achados = (e.linhas || []).filter(li => li.cod_profissional && li.cod_profissional.toLowerCase().includes(q) || li.nome_profissional && li.nome_profissional.toLowerCase().includes(q));
                            return 0 === achados.length ? _h("p", { style: { margin: 0, padding: "14px 18px", color: "#6b7280", fontSize: 13 } }, "Nenhum resultado encontrado") : achados.slice(0, 10).map(li => {
                                const lj = (e.lojas || []).find(z => z.id === li.loja_id);
                                return _h("div", { key: li.id, style: { display: "flex", alignItems: "center", gap: 12, padding: "9px 18px", borderTop: "1px solid #f3f4f6", fontSize: 13, flexWrap: "wrap" } },
                                    _h("span", { style: { fontFamily: DS_MONO, fontWeight: 700, color: "#374151", fontSize: 12, minWidth: 54 } }, li.cod_profissional || "-"),
                                    _h("span", { style: { fontWeight: 600, color: "#111827", flex: 1, minWidth: 120 } }, li.nome_profissional || "Sem nome"),
                                    _h("span", { style: { color: "#6b7280", fontSize: 12 } }, lj?.nome || ""),
                                    _dsPill(li.status || "A CONFIRMAR"));
                            });
                        })())),
                    p.modalFaltando && React.createElement("div", {
                className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] border border-gray-200 shadow-xl p-6 w-full max-w-md mx-4"
            }, React.createElement("h3", {
                className: "text-lg font-semibold text-gray-900 mb-4"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Registrar Falta")), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("p", {
                className: "text-sm text-gray-600 mb-2"
            }, React.createElement("strong", null, "Profissional:"), " ", p.faltandoLinha?.nome_profissional || p.faltandoLinha?.cod_profissional || "Não identificado"), React.createElement("label", {
                className: "text-sm font-semibold text-gray-700"
            }, "Motivo da falta *"), React.createElement("textarea", {
                value: p.faltandoMotivo || "",
                onChange: e => x({
                    ...p,
                    faltandoMotivo: e.target.value
                }),
                placeholder: "Digite o motivo da falta...",
                className: "w-full px-3 py-2 border border-gray-200 rounded-[10px] mt-1 text-sm focus:outline-none focus:border-[#770fa8]",
                rows: 3,
                autoFocus: !0
            })), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    modalFaltando: !1,
                    faltandoLinha: null,
                    faltandoMotivo: ""
                }),
                className: "flex-1 h-10 px-4 bg-white border border-gray-200 text-gray-700 rounded-[10px] font-semibold hover:bg-gray-50"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    const t = p.faltandoLinha,
                        a = p.faltandoMotivo?.trim();
                    if (!a) return void ja("Digite o motivo da falta", "error");
                    const l = p.dispDataPlanilha || (new Date).toISOString().split("T")[0];
                    try {
                        await _fetch(`${API_URL}/disponibilidade/linhas/${t.id}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                cod_profissional: t.cod_profissional,
                                nome_profissional: t.nome_profissional,
                                status: "FALTANDO",
                                observacao: a
                            })
                        }), await _fetch(`${API_URL}/disponibilidade/faltosos`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                loja_id: t.loja_id,
                                cod_profissional: t.cod_profissional,
                                nome_profissional: t.nome_profissional,
                                motivo: a,
                                data_falta: l
                            })
                        });
                        const r = await _fetch(`${API_URL}/disponibilidade/linha-reposicao`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    loja_id: t.loja_id,
                                    after_linha_id: t.id
                                })
                            }),
                            o = await r.json(),
                            c = [...e.linhas || []],
                            s = c.findIndex(e => e.id === t.id); - 1 !== s && (c[s] = {
                            ...c[s],
                            status: "FALTANDO",
                            observacao: a
                        }), c.push(o), x(t => ({
                            ...t,
                            modalFaltando: !1,
                            faltandoLinha: null,
                            faltandoMotivo: "",
                            dispData: {
                                ...e,
                                linhas: c
                            }
                        })), ja("Falta registrada e linha de reposição criada!", "success")
                    } catch (e) {
                        console.error("Erro ao registrar falta:", e), ja("Erro ao registrar falta", "error")
                    }
                },
                className: "flex-1 h-10 px-4 bg-white border border-red-200 text-red-800 rounded-[10px] font-semibold hover:bg-red-50"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Confirmar Falta"))))),
                    0 === (e.regioes || []).length
                        ? _h("div", { style: { ...DS_CARD, padding: 32, textAlign: "center" } },
                            _h("p", { style: { margin: 0, color: "#6b7280", fontSize: 15 } }, "Nenhuma estrutura configurada."),
                            _h("button", { type: "button", onClick: () => x({ ...p, dispSubTab: "config" }), style: { marginTop: 16, height: 40, padding: "0 16px", borderRadius: 10, border: 0, background: "#770fa8", color: "#ffffff", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" } }, _dsIco("settings", 16), "Configurar estrutura"))
                        : _h(React.Fragment, null,
                            // Chips de região
                            _h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 } },
                                (e.regioes || []).map(t => {
                                    const a = (e.lojas || []).filter(lj => lj.regiao_id === t.id),
                                        l = (e.linhas || []).filter(li => a.some(lj => lj.id === li.loja_id)),
                                        emL = l.filter(li => "EM LOJA" === li.status).length,
                                        tit = l.filter(li => !li.is_excedente && !li.is_reposicao).length,
                                        isAtiva = p.dispRegiaoAtiva === t.id;
                                    const pct = tit > 0 ? (emL / tit) * 100 : 0;
                                    const fx = _dsFaixa(pct, 100);
                                    return _h("button", {
                                        key: t.id,
                                        type: "button",
                                        "aria-pressed": isAtiva ? "true" : "false",
                                        onClick: () => x({ ...p, dispRegiaoAtiva: p.dispRegiaoAtiva === t.id ? null : t.id }),
                                        className: isAtiva ? "" : "hover:border-gray-300",
                                        style: { display: "flex", flexDirection: "column", gap: 8, padding: isAtiva ? "11.5px 13.5px" : "12px 14px", borderRadius: 12, color: "#111827", cursor: "pointer", textAlign: "left", background: isAtiva ? "#faf7fd" : "#ffffff", border: isAtiva ? "1.5px solid #770fa8" : "1px solid #e5e7eb", fontFamily: "inherit" }
                                    },
                                        _h("span", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 } },
                                            _h("b", { style: { fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 } }, t.nome),
                                            _h("span", { style: { fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 13, color: fx[1] } }, Math.round(pct) + "%")),
                                        _h("span", { style: { display: "flex" } }, _dsBar(pct, fx[0], 4)),
                                        _h("span", { style: { fontSize: 11.5, color: "#6b7280" } }, emL + " em loja de " + tit));
                                })),
                            p.dispRegiaoAtiva && (() => {
                                const t = (e.regioes || []).find(rg => rg.id === p.dispRegiaoAtiva);
                                if (!t) return null;
                                const a = (e.lojas || []).filter(lj => lj.regiao_id === t.id);
                                return _h("div", { className: "space-y-3" },
                                    a.map(lojaAcordeao),
                                    _h("div", { style: { display: "flex", gap: 8, paddingTop: 4, flexWrap: "wrap" } },
                                        _h("button", { type: "button", onClick: () => x({ ...p, dispLojasAbertas: a.map(lj => lj.id) }), className: "hover:bg-gray-50", style: DS_BTN_SM }, _dsIco("arrowdown", 13), "Expandir todas"),
                                        _h("button", { type: "button", onClick: () => x({ ...p, dispLojasAbertas: [] }), className: "hover:bg-gray-50", style: DS_BTN_SM }, "Recolher todas")));
                            })(),
                            !p.dispRegiaoAtiva && _h("div", { style: { ...DS_CARD, padding: "32px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" } },
                                _h("span", { style: { color: "#9ca3af", display: "inline-flex" } }, _dsIco("map", 22)),
                                _h("p", { style: { margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" } }, "Selecione uma região acima"),
                                _h("p", { style: { margin: 0, fontSize: 12.5, color: "#6b7280" } }, "As lojas e motoboys da região aparecem aqui"))),
                    // Legenda (cores de status + fundos das linhas)
                    (e.regioes || []).length > 0 && _h("div", { style: { display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", fontSize: 12, color: "#6b7280", padding: "2px 2px" } },
                        DS_ORDEM.map(st => _h("span", { key: st, style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _dsDot(DS[st].cor, 8), DS[st].label)),
                        _h("span", { "aria-hidden": "true", style: { width: 1, height: 14, background: "#e5e7eb" } }),
                        _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _h("span", { style: { width: 14, height: 10, borderRadius: 3, background: DS_ROW.excedente, border: "1px solid #fde68a" } }), "Excedente"),
                        _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _h("span", { style: { width: 14, height: 10, borderRadius: 3, background: DS_ROW.reposicao, border: "1px solid #bfdbfe" } }), "Reposição"),
                        _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _h("span", { style: { width: 14, height: 10, borderRadius: 3, background: DS_ROW.falta, border: "1px solid #fecaca" } }), "Titular com falta")));
            };
            return a ? React.createElement("div", {
                className: "flex items-center justify-center py-12"
            }, React.createElement("div", {
                className: "text-center"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"
            }), React.createElement("p", {
                className: "mt-4 text-gray-600"
            }, "Carregando..."))) : React.createElement("div", {
                className: "space-y-4 disp-clean-root" /* DISP_CLEAN_V1: abas limpas, sem barra de sync duplicada */
            }, React.createElement("div", {
                className: "bg-white rounded-[14px] border border-gray-200"
            }, React.createElement("div", {
                className: "flex gap-1 px-2 overflow-x-auto"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    dispSubTab: "panorama"
                }),
                className: "px-3 py-3 text-sm whitespace-nowrap border-b-2 " + ("panorama" === t ? "text-[#5d0b85] font-semibold border-[#770fa8]" : "text-gray-500 border-transparent hover:text-gray-700")
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "Panorama")), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    dispSubTab: "principal"
                }),
                className: "px-3 py-3 text-sm whitespace-nowrap border-b-2 " + ("principal" === t ? "text-[#5d0b85] font-semibold border-[#770fa8]" : "text-gray-500 border-transparent hover:text-gray-700")
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Painel")), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        dispSubTab: "faltosos"
                    }));
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/faltosos`),
                            t = await e.json();
                        x(e => ({
                            ...e,
                            faltososLista: t
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar faltosos:", e)
                    }
                },
                className: "px-3 py-3 text-sm whitespace-nowrap border-b-2 " + ("faltosos" === t ? "text-[#5d0b85] font-semibold border-[#770fa8]" : "text-gray-500 border-transparent hover:text-gray-700")
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Faltosos")), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        dispSubTab: "espelho"
                    }));
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/espelho`),
                            t = await e.json();
                        x(e => ({
                            ...e,
                            espelhoDatas: t
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar datas espelho:", e)
                    }
                },
                className: "px-3 py-3 text-sm whitespace-nowrap border-b-2 " + ("espelho" === t ? "text-[#5d0b85] font-semibold border-[#770fa8]" : "text-gray-500 border-transparent hover:text-gray-700")
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-copy" })), "Espelho")), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        dispSubTab: "relatorios",
                        relatoriosLoading: !0
                    }));
                    try {
                        const [e, t, a, l, r] = await Promise.all([_fetch(`${API_URL}/disponibilidade/relatorios/metricas`).then(e => e.json()).catch(() => []), _fetch(`${API_URL}/disponibilidade/relatorios/ranking-lojas`).then(e => e.json()).catch(() => []), _fetch(`${API_URL}/disponibilidade/relatorios/ranking-faltosos`).then(e => e.json()).catch(() => []), _fetch(`${API_URL}/disponibilidade/relatorios/comparativo`).then(e => e.json()).catch(() => ({})), _fetch(`${API_URL}/disponibilidade/relatorios/heatmap`).then(e => e.json()).catch(() => ({
                            diasSemana: [],
                            lojas: []
                        }))]);
                        x(o => ({
                            ...o,
                            relatoriosData: {
                                metricas: Array.isArray(e) ? e : [],
                                rankingLojas: Array.isArray(t) ? t : [],
                                rankingFaltosos: Array.isArray(a) ? a : [],
                                comparativo: l || {},
                                heatmap: r || {
                                    diasSemana: [],
                                    lojas: []
                                }
                            },
                            relatoriosLoading: !1
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar relatórios:", e), x(e => ({
                            ...e,
                            relatoriosLoading: !1,
                            relatoriosData: {
                                metricas: [],
                                rankingLojas: [],
                                rankingFaltosos: [],
                                comparativo: {},
                                heatmap: {
                                    diasSemana: [],
                                    lojas: []
                                }
                            }
                        }))
                    }
                },
                className: "px-3 py-3 text-sm whitespace-nowrap border-b-2 " + ("relatorios" === t ? "text-[#5d0b85] font-semibold border-[#770fa8]" : "text-gray-500 border-transparent hover:text-gray-700")
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trendup" })), "Relatórios")), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        dispSubTab: "motoboys",
                        motoboysBusca: "",
                        motoboysLojaFiltro: "",
                        motoboysDias: 30,
                        motoboysList: null,
                        motoboysLoading: !0
                    }));
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/motoboys?dias=30`),
                            t = await e.json();
                        x(e => ({
                            ...e,
                            motoboysList: t,
                            motoboysLoading: !1
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar motoboys:", e), x(e => ({
                            ...e,
                            motoboysLoading: !1
                        }))
                    }
                },
                className: "px-3 py-3 text-sm whitespace-nowrap border-b-2 " + ("motoboys" === t ? "text-[#5d0b85] font-semibold border-[#770fa8]" : "text-gray-500 border-transparent hover:text-gray-700")
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bike" })), "Motoboys")), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        dispSubTab: "restricoes",
                        restricoesLoading: !0
                    }));
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/restricoes`),
                            t = await e.json();
                        x(e => ({
                            ...e,
                            restricoesList: t,
                            restricoesLoading: !1
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar restrições:", e), x(e => ({
                            ...e,
                            restricoesLoading: !1
                        }))
                    }
                },
                className: "px-3 py-3 text-sm whitespace-nowrap border-b-2 " + ("restricoes" === t ? "text-[#5d0b85] font-semibold border-[#770fa8]" : "text-gray-500 border-transparent hover:text-gray-700")
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-ban" })), "Restrições")), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    dispSubTab: "config"
                }),
                className: "px-3 py-3 text-sm whitespace-nowrap border-b-2 " + ("config" === t ? "text-[#5d0b85] font-semibold border-[#770fa8]" : "text-gray-500 border-transparent hover:text-gray-700")
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-settings" })), "Config")))), "panorama" === t && _dispPanoramaClean(), "relatorios" === t && React.createElement("div", {
                className: "space-y-4"
            }, p.relatoriosLoading ? React.createElement("div", {
                className: "flex items-center justify-center py-12"
            }, React.createElement("div", {
                className: "text-center"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"
            }), React.createElement("p", {
                className: "mt-4 text-gray-600"
            }, "Carregando relatórios..."))) : React.createElement(React.Fragment, null, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "Comparativo")), React.createElement("div", {
                className: "grid grid-cols-3 gap-4"
            }, [{
                key: "hoje",
                data: p.relatoriosData?.comparativo?.hoje,
                color: "blue"
            }, {
                key: "ontem",
                data: p.relatoriosData?.comparativo?.ontem,
                color: "gray"
            }, {
                key: "semanaPassada",
                data: p.relatoriosData?.comparativo?.semanaPassada,
                color: "purple"
            }].map(e => {
                const t = (p.relatoriosData?.comparativo?.labels || {})[e.key] || ("hoje" === e.key ? "MAIS RECENTE" : "ontem" === e.key ? "ANTERIOR" : "3º ANTERIOR");
                return React.createElement("div", {
                    key: e.key,
                    className: `p-4 rounded-lg bg-${e.color}-50 border border-${e.color}-200`
                }, React.createElement("h4", {
                    className: `font-bold text-${e.color}-800 text-center mb-2`
                }, t), e.data ? React.createElement("div", {
                    className: "space-y-1 text-sm"
                }, React.createElement("div", {
                    className: "flex justify-between"
                }, React.createElement("span", null, "% EM LOJA:"), React.createElement("span", {
                    className: "font-bold " + (e.data.perc >= 80 ? "text-green-600" : e.data.perc >= 50 ? "text-yellow-600" : "text-red-600")
                }, e.data.perc, "%")), React.createElement("div", {
                    className: "flex justify-between"
                }, React.createElement("span", null, "Em Loja:"), React.createElement("span", {
                    className: "font-bold text-blue-600"
                }, e.data.emLoja || 0)), React.createElement("div", {
                    className: "flex justify-between"
                }, React.createElement("span", null, "Titulares:"), React.createElement("span", {
                    className: "font-bold"
                }, e.data.titulares || 0)), React.createElement("div", {
                    className: "flex justify-between"
                }, React.createElement("span", null, "Faltando:"), React.createElement("span", {
                    className: "font-bold text-red-600"
                }, e.data.faltando || 0)), React.createElement("div", {
                    className: "flex justify-between"
                }, React.createElement("span", null, "Sem Contato:"), React.createElement("span", {
                    className: "font-bold text-orange-600"
                }, e.data.semContato || 0))) : React.createElement("p", {
                    className: "text-gray-400 text-center text-sm"
                }, "Sem dados"))
            })), p.relatoriosData?.comparativo?.hoje && p.relatoriosData?.comparativo?.ontem && React.createElement("div", {
                className: "mt-3 flex justify-center gap-4 text-sm"
            }, React.createElement("span", {
                className: "px-3 py-1 rounded-full bg-gray-100"
            }, "vs Ontem:", React.createElement("span", {
                className: "ml-1 font-bold " + (p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.ontem.perc >= 0 ? "text-green-600" : "text-red-600")
            }, p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.ontem.perc >= 0 ? "+" : "", (p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.ontem.perc).toFixed(1), "%")), p.relatoriosData?.comparativo?.semanaPassada && React.createElement("span", {
                className: "px-3 py-1 rounded-full bg-gray-100"
            }, "vs Semana:", React.createElement("span", {
                className: "ml-1 font-bold " + (p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.semanaPassada.perc >= 0 ? "text-green-600" : "text-red-600")
            }, p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.semanaPassada.perc >= 0 ? "+" : "", (p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.semanaPassada.perc).toFixed(1), "%")))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trendup" })), "Evolução % EM LOJA (7 dias)")), (() => {
                const e = Array.isArray(p.relatoriosData?.metricas) ? p.relatoriosData.metricas : [];
                return 0 === e.length ? React.createElement("p", {
                    className: "text-gray-400 text-center py-8"
                }, "Sem dados históricos. Salve espelhos diários para ver o gráfico.") : React.createElement("div", {
                    className: "h-48 flex items-end gap-2 justify-around bg-gray-50 rounded-lg p-4"
                }, e.slice(0, 7).reverse().map((e, t) => {
                    let a = "-";
                    if (e.data) {
                        const t = e.data.split("T")[0],
                            [l, r, o] = t.split("-");
                        a = `${o}/${r}`
                    }
                    const l = e.percOperacao || 0,
                        r = Math.max(10, l);
                    return React.createElement("div", {
                        key: t,
                        className: "flex flex-col items-center flex-1"
                    }, React.createElement("span", {
                        className: "text-xs font-bold mb-1"
                    }, l, "%"), React.createElement("div", {
                        className: "w-full rounded-t-lg transition-all " + (l >= 80 ? "bg-green-500" : l >= 50 ? "bg-yellow-500" : "bg-red-500"),
                        style: {
                            height: 1.5 * r + "px",
                            maxHeight: "140px"
                        }
                    }), React.createElement("span", {
                        className: "text-[10px] text-gray-500 mt-1"
                    }, a), React.createElement("span", {
                        className: "text-[9px] text-blue-600"
                    }, e.emLoja || 0, " em loja"))
                }))
            })()), React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-2 gap-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trophy" })), "Ranking de Lojas (7 dias)")), React.createElement("div", {
                className: "space-y-1 max-h-64 overflow-y-auto"
            }, (() => {
                const e = Array.isArray(p.relatoriosData?.rankingLojas) ? p.relatoriosData.rankingLojas : [];
                return 0 === e.length ? React.createElement("p", {
                    className: "text-gray-400 text-center py-4"
                }, "Sem dados de lojas") : React.createElement(React.Fragment, null, React.createElement("p", {
                    className: "text-xs font-semibold text-green-700 mb-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "TOP 5 MELHORES")), e.slice(0, 5).map((e, t) => React.createElement("div", {
                    key: e.loja_id || t,
                    className: "flex items-center gap-2 p-1.5 bg-green-50 rounded text-xs"
                }, React.createElement("span", {
                    className: "font-bold text-green-700 w-5"
                }, t + 1, "º"), React.createElement("span", {
                    className: "flex-1 truncate"
                }, e.loja_nome || "-"), React.createElement("span", {
                    className: "text-gray-500 text-[10px]"
                }, e.regiao_nome || ""), React.createElement("span", {
                    className: "font-bold text-green-700"
                }, e.mediaPerc || 0, "%"))), e.length > 5 && React.createElement(React.Fragment, null, React.createElement("p", {
                    className: "text-xs font-semibold text-red-700 mt-3 mb-1"
                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "TOP 5 PIORES")), e.slice(-5).reverse().map((t, a) => React.createElement("div", {
                    key: `worst-${t.loja_id||a}`,
                    className: "flex items-center gap-2 p-1.5 bg-red-50 rounded text-xs"
                }, React.createElement("span", {
                    className: "font-bold text-red-700 w-5"
                }, e.length - 4 + a, "º"), React.createElement("span", {
                    className: "flex-1 truncate"
                }, t.loja_nome || "-"), React.createElement("span", {
                    className: "text-gray-500 text-[10px]"
                }, t.regiao_nome || ""), React.createElement("span", {
                    className: "font-bold text-red-700"
                }, t.mediaPerc || 0, "%")))))
            })())), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-ban" })), "Ranking de Faltosos (30 dias)")), React.createElement("div", {
                className: "space-y-1 max-h-64 overflow-y-auto"
            }, (() => {
                const e = Array.isArray(p.relatoriosData?.rankingFaltosos) ? p.relatoriosData.rankingFaltosos : [];
                return 0 === e.length ? React.createElement("p", {
                    className: "text-gray-400 text-center py-4"
                }, "Nenhuma falta registrada") : e.slice(0, 10).map((e, t) => React.createElement("div", {
                    key: e.cod || e.nome || t,
                    className: "flex items-center gap-2 p-1.5 bg-red-50 rounded text-xs"
                }, React.createElement("span", {
                    className: "font-bold text-red-700 w-5"
                }, t + 1, "º"), React.createElement("span", {
                    className: "font-mono text-gray-600 w-12"
                }, e.cod || "-"), React.createElement("span", {
                    className: "flex-1 truncate"
                }, e.nome || "Sem nome"), React.createElement("span", {
                    className: "text-gray-500 text-[10px] truncate max-w-20"
                }, e.loja_nome || ""), React.createElement("span", {
                    className: "font-bold text-red-700 bg-red-200 px-1.5 rounded"
                }, e.totalFaltas || 0, "x")))
            })()))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-zap" })), "Heatmap de Faltas por Dia da Semana (30 dias)")), (() => {
                const e = p.relatoriosData?.heatmap || {},
                    t = Array.isArray(e.lojas) ? e.lojas : [],
                    a = Array.isArray(e.diasSemana) ? e.diasSemana : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                return 0 === t.length ? React.createElement("p", {
                    className: "text-gray-400 text-center py-4"
                }, "Sem dados de faltas para gerar heatmap") : React.createElement("div", {
                    className: "overflow-x-auto"
                }, React.createElement("table", {
                    className: "w-full text-xs"
                }, React.createElement("thead", null, React.createElement("tr", {
                    className: "bg-gray-100"
                }, React.createElement("th", {
                    className: "px-2 py-1 text-left"
                }, "Loja"), a.map((e, t) => React.createElement("th", {
                    key: t,
                    className: "px-2 py-1 text-center w-12"
                }, e)), React.createElement("th", {
                    className: "px-2 py-1 text-center"
                }, "Total"))), React.createElement("tbody", null, t.slice(0, 15).map((e, t) => {
                    const a = Array.isArray(e.dias) ? e.dias : [0, 0, 0, 0, 0, 0, 0],
                        l = a.reduce((e, t) => e + t, 0),
                        r = Math.max(...a, 1);
                    return React.createElement("tr", {
                        key: e.loja_nome || t,
                        className: "border-t"
                    }, React.createElement("td", {
                        className: "px-2 py-1 font-medium truncate max-w-32"
                    }, e.loja_nome || "-"), a.map((e, t) => {
                        const a = e / r,
                            l = 0 === e ? "bg-gray-50" : a >= .8 ? "bg-red-500 text-white" : a >= .5 ? "bg-orange-400 text-white" : a >= .3 ? "bg-yellow-300" : "bg-yellow-100";
                        return React.createElement("td", {
                            key: t,
                            className: `px-2 py-1 text-center font-bold ${l}`
                        }, e || "-")
                    }), React.createElement("td", {
                        className: "px-2 py-1 text-center font-bold bg-gray-200"
                    }, l))
                }))))
            })(), React.createElement("div", {
                className: "flex justify-center gap-2 mt-3 text-[10px]"
            }, React.createElement("span", {
                className: "px-2 py-0.5 bg-gray-50 rounded"
            }, "0"), React.createElement("span", {
                className: "px-2 py-0.5 bg-yellow-100 rounded"
            }, "Baixo"), React.createElement("span", {
                className: "px-2 py-0.5 bg-yellow-300 rounded"
            }, "Médio"), React.createElement("span", {
                className: "px-2 py-0.5 bg-orange-400 text-white rounded"
            }, "Alto"), React.createElement("span", {
                className: "px-2 py-0.5 bg-red-500 text-white rounded"
            }, "Crítico"))))), "motoboys" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bike" })), "Histórico de Motoboys")), React.createElement("div", {
                className: "flex flex-wrap gap-3 mb-4"
            }, React.createElement("div", {
                className: "flex-1 min-w-[200px]"
            }, React.createElement("input", {
                type: "text",
                placeholder: "Buscar por código ou nome...",
                value: p.motoboysBusca || "",
                onChange: e => x(t => ({
                    ...t,
                    motoboysBusca: e.target.value
                })),
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            })), React.createElement("select", {
                value: p.motoboysLojaFiltro || "",
                onChange: e => x(t => ({
                    ...t,
                    motoboysLojaFiltro: e.target.value
                })),
                className: "px-3 py-2 border rounded-lg text-sm"
            }, React.createElement("option", {
                value: ""
            }, "Todas as Lojas"), (e.lojas || []).map(e => React.createElement("option", {
                key: e.id,
                value: e.id
            }, e.codigo, " - ", e.nome))), React.createElement("select", {
                value: p.motoboysDias || 30,
                onChange: e => x(t => ({
                    ...t,
                    motoboysDias: parseInt(e.target.value)
                })),
                className: "px-3 py-2 border rounded-lg text-sm"
            }, React.createElement("option", {
                value: 7
            }, "Últimos 7 dias"), React.createElement("option", {
                value: 15
            }, "Últimos 15 dias"), React.createElement("option", {
                value: 30
            }, "Últimos 30 dias"), React.createElement("option", {
                value: 60
            }, "Últimos 60 dias"), React.createElement("option", {
                value: 90
            }, "Últimos 90 dias")), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        motoboysLoading: !0
                    }));
                    try {
                        const e = new URLSearchParams;
                        e.append("dias", p.motoboysDias || 30), p.motoboysLojaFiltro && e.append("loja_id", p.motoboysLojaFiltro), p.motoboysBusca && e.append("busca", p.motoboysBusca);
                        const t = await _fetch(`${API_URL}/disponibilidade/motoboys?${e}`),
                            a = await t.json();
                        x(e => ({
                            ...e,
                            motoboysList: a,
                            motoboysLoading: !1
                        }))
                    } catch (e) {
                        console.error("Erro ao buscar motoboys:", e), ja("Erro ao buscar motoboys", "error"), x(e => ({
                            ...e,
                            motoboysLoading: !1
                        }))
                    }
                },
                className: "px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" })), "Buscar"))), p.motoboysLoading && React.createElement("div", {
                className: "flex items-center justify-center py-8"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"
            }), React.createElement("span", {
                className: "ml-3 text-gray-600"
            }, "Carregando...")), !p.motoboysLoading && p.motoboysList && React.createElement("div", null, React.createElement("div", {
                className: "mb-4 p-3 bg-gray-100 rounded-lg flex items-center justify-between"
            }, React.createElement("span", {
                className: "text-sm text-gray-700"
            }, React.createElement("strong", null, p.motoboysList.total || 0), " motoboys encontrados (últimos ", React.createElement("strong", null, p.motoboysList.periodo_dias), " dias)")), React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-xs border-collapse"
            }, React.createElement("thead", null, React.createElement("tr", {
                className: "bg-gray-800 text-white"
            }, React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "COD"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "NOME"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "LOJA ATUAL"), React.createElement("th", {
                className: "px-2 py-2 text-center bg-green-700"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-building" })), "EM LOJA")), React.createElement("th", {
                className: "px-2 py-2 text-center bg-red-700"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "FALTAS")), React.createElement("th", {
                className: "px-2 py-2 text-center bg-orange-600"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-phone" })), "S/ CONTATO"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "LOJAS ONDE RODOU"))), React.createElement("tbody", null, (p.motoboysList.motoboys || []).map((e, t) => React.createElement("tr", {
                key: e.cod,
                className: `border-b ${t%2==0?"bg-white":"bg-gray-50"} hover:bg-blue-50`
            }, React.createElement("td", {
                className: "px-2 py-2 font-mono font-bold text-purple-700"
            }, e.cod), React.createElement("td", {
                className: "px-2 py-2 font-semibold"
            }, e.nome || "-"), React.createElement("td", {
                className: "px-2 py-2"
            }, e.loja_atual ? React.createElement("span", {
                className: "text-gray-700"
            }, React.createElement("span", {
                className: "font-semibold"
            }, e.loja_atual.codigo), " - ", e.loja_atual.nome, e.loja_atual.regiao_nome && React.createElement("span", {
                className: "text-gray-400 text-[10px] ml-1"
            }, "(", e.loja_atual.regiao_nome, ")")) : "-"), React.createElement("td", {
                className: "px-2 py-2 text-center"
            }, React.createElement("span", {
                className: "font-bold " + (e.estatisticas.em_loja.total > 0 ? "text-green-600" : "text-gray-400")
            }, e.estatisticas.em_loja.total, "x"), e.estatisticas.em_loja.ultima_vez && React.createElement("span", {
                className: "text-[9px] text-gray-400 block"
            }, "últ: ", new Date(e.estatisticas.em_loja.ultima_vez).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit"
            }))), React.createElement("td", {
                className: "px-2 py-2 text-center"
            }, React.createElement("span", {
                className: "font-bold " + (e.estatisticas.faltas.total > 0 ? "text-red-600" : "text-gray-400")
            }, e.estatisticas.faltas.total, "x"), e.estatisticas.faltas.ultima_falta && React.createElement("span", {
                className: "text-[9px] text-gray-400 block"
            }, "últ: ", new Date(e.estatisticas.faltas.ultima_falta).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit"
            }))), React.createElement("td", {
                className: "px-2 py-2 text-center"
            }, React.createElement("span", {
                className: "font-bold " + (e.estatisticas.sem_contato.total > 0 ? "text-orange-600" : "text-gray-400")
            }, e.estatisticas.sem_contato.total, "x"), e.estatisticas.sem_contato.max_dias_consecutivos > 0 && React.createElement("span", {
                className: "text-[9px] text-orange-500 block"
            }, "máx: ", e.estatisticas.sem_contato.max_dias_consecutivos, " dias seg.")), React.createElement("td", {
                className: "px-2 py-2"
            }, e.lojas_rodou && e.lojas_rodou.length > 0 ? React.createElement("div", {
                className: "flex flex-wrap gap-1"
            }, e.lojas_rodou.slice(0, 3).map(e => React.createElement("span", {
                key: e.id,
                className: "px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]"
            }, e.codigo)), e.lojas_rodou.length > 3 && React.createElement("span", {
                className: "px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px]"
            }, "+", e.lojas_rodou.length - 3)) : React.createElement("span", {
                className: "text-gray-400"
            }, "-"))))))), (!p.motoboysList.motoboys || 0 === p.motoboysList.motoboys.length) && React.createElement("div", {
                className: "text-center py-8 text-gray-500"
            }, React.createElement("p", {
                className: "text-4xl mb-2"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bike" }))), React.createElement("p", null, "Nenhum motoboy encontrado com os filtros selecionados."))), !p.motoboysLoading && !p.motoboysList && React.createElement("div", {
                className: "text-center py-8 text-gray-500"
            }, React.createElement("p", {
                className: "text-4xl mb-2"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" }))), React.createElement("p", null, 'Use os filtros acima e clique em "Buscar" para ver o histórico dos motoboys.'))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h4", {
                className: "font-semibold text-gray-700 mb-2 text-sm"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "Legenda das Estatísticas")), React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
            }, React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("span", {
                className: "w-3 h-3 bg-green-500 rounded"
            }), React.createElement("span", null, React.createElement("strong", null, "EM LOJA:"), ' Quantas vezes recebeu status "EM LOJA" (trabalhou)')), React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("span", {
                className: "w-3 h-3 bg-red-500 rounded"
            }), React.createElement("span", null, React.createElement("strong", null, "FALTAS:"), ' Quantas vezes foi marcado como "FALTANDO"')), React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("span", {
                className: "w-3 h-3 bg-orange-500 rounded"
            }), React.createElement("span", null, React.createElement("strong", null, "S/ CONTATO:"), ' Quantas vezes ficou "SEM CONTATO"'))))), "restricoes" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-ban" })), "Cadastrar Nova Restrição")), React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold text-gray-700 mb-1"
            }, "Código *"), React.createElement("input", {
                type: "text",
                placeholder: "Ex: 12345",
                value: p.restricaoCod || "",
                onChange: e => {
                    const t = e.target.value;
                    x(e => ({
                        ...e,
                        restricaoCod: t
                    }));
                    const a = pe.find(e => e.codigo === t);
                    a && x(e => ({
                        ...e,
                        restricaoNome: a.nome
                    }))
                },
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold text-gray-700 mb-1"
            }, "Nome"), React.createElement("input", {
                type: "text",
                placeholder: "Auto-preenchido",
                value: p.restricaoNome || "",
                onChange: e => x(t => ({
                    ...t,
                    restricaoNome: e.target.value
                })),
                className: "w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold text-gray-700 mb-1"
            }, "Loja"), React.createElement("select", {
                value: p.restricaoTodasLojas ? "TODAS" : p.restricaoLojaId || "",
                onChange: e => {
                    "TODAS" === e.target.value ? x(e => ({
                        ...e,
                        restricaoTodasLojas: !0,
                        restricaoLojaId: ""
                    })) : x(t => ({
                        ...t,
                        restricaoTodasLojas: !1,
                        restricaoLojaId: e.target.value
                    }))
                },
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            }, React.createElement("option", {
                value: ""
            }, "Selecione uma loja..."), React.createElement("option", {
                value: "TODAS",
                className: "font-bold text-red-600"
            }, "TODAS AS LOJAS"), (e.lojas || []).map(e => React.createElement("option", {
                key: e.id,
                value: e.id
            }, e.codigo, " - ", e.nome)))), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold text-gray-700 mb-1"
            }, "Motivo *"), React.createElement("input", {
                type: "text",
                placeholder: "Ex: Comportamento inadequado",
                value: p.restricaoMotivo || "",
                onChange: e => x(t => ({
                    ...t,
                    restricaoMotivo: e.target.value
                })),
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            }))), React.createElement("button", {
                onClick: async () => {
                    if (p.restricaoCod && p.restricaoMotivo)
                        if (p.restricaoTodasLojas || p.restricaoLojaId) try {
                            const e = await _fetch(`${API_URL}/disponibilidade/restricoes`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    cod_profissional: p.restricaoCod,
                                    nome_profissional: p.restricaoNome,
                                    loja_id: p.restricaoLojaId || null,
                                    todas_lojas: p.restricaoTodasLojas || !1,
                                    motivo: p.restricaoMotivo,
                                    criado_por: l?.fullName || l?.username
                                })
                            });
                            if (!e.ok) {
                                const t = await e.json();
                                throw new Error(t.error || "Erro ao cadastrar")
                            }
                            ja("Restrição cadastrada com sucesso!", "success"), x(e => ({
                                ...e,
                                restricaoCod: "",
                                restricaoNome: "",
                                restricaoLojaId: "",
                                restricaoTodasLojas: !1,
                                restricaoMotivo: ""
                            }));
                            const t = await _fetch(`${API_URL}/disponibilidade/restricoes`),
                                a = await t.json();
                            x(e => ({
                                ...e,
                                restricoesList: a
                            }))
                        } catch (e) {
                            ja(e.message, "error")
                        } else ja('Selecione uma loja ou "Todas as Lojas"', "error");
                        else ja("Preencha o código e o motivo", "error")
                },
                className: "px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-ban" })), "Cadastrar Restrição"))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Restrições Ativas ("), (p.restricoesList || []).length, ")"), p.restricoesLoading ? React.createElement("div", {
                className: "flex items-center justify-center py-8"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"
            }), React.createElement("span", {
                className: "ml-3 text-gray-600"
            }, "Carregando...")) : 0 === (p.restricoesList || []).length ? React.createElement("div", {
                className: "text-center py-8 text-gray-500"
            }, React.createElement("p", {
                className: "text-4xl mb-2"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" }))), React.createElement("p", null, "Nenhuma restrição ativa no momento.")) : React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-xs border-collapse"
            }, React.createElement("thead", null, React.createElement("tr", {
                className: "bg-red-700 text-white"
            }, React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "COD"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "NOME"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "LOJA"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "MOTIVO"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "CRIADO POR"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "DATA"), React.createElement("th", {
                className: "px-2 py-2 text-center"
            }, "AÇÃO"))), React.createElement("tbody", null, (p.restricoesList || []).map((e, t) => React.createElement("tr", {
                key: e.id,
                className: `border-b ${t%2==0?"bg-white":"bg-red-50"} hover:bg-red-100`
            }, React.createElement("td", {
                className: "px-2 py-2 font-mono font-bold text-red-700"
            }, e.cod_profissional), React.createElement("td", {
                className: "px-2 py-2 font-semibold"
            }, e.nome_profissional || "-"), React.createElement("td", {
                className: "px-2 py-2"
            }, e.todas_lojas ? React.createElement("span", {
                className: "px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-ban" })), "TODAS")) : e.loja_nome ? React.createElement("span", null, e.loja_codigo, " - ", e.loja_nome) : "-"), React.createElement("td", {
                className: "px-2 py-2 max-w-[200px] truncate",
                title: e.motivo
            }, e.motivo), React.createElement("td", {
                className: "px-2 py-2 text-gray-600"
            }, e.criado_por || "-"), React.createElement("td", {
                className: "px-2 py-2 text-gray-600"
            }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                className: "px-2 py-2 text-center"
            }, React.createElement("button", {
                onClick: async () => {
                    if (confirm(`Remover restrição de ${e.cod_profissional} - ${e.nome_profissional||"N/A"}?`)) try {
                        await _fetch(`${API_URL}/disponibilidade/restricoes/${e.id}`, {
                            method: "DELETE"
                        }), ja("Restrição removida!", "success");
                        const t = await _fetch(`${API_URL}/disponibilidade/restricoes`),
                            a = await t.json();
                        x(e => ({
                            ...e,
                            restricoesList: a
                        }))
                    } catch (e) {
                        ja("Erro ao remover restrição", "error")
                    }
                },
                className: "px-2 py-1 bg-green-600 text-white rounded text-[10px] font-bold hover:bg-green-700"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Liberar")))))))))), "config" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-link" })), "Link Público (Somente Leitura)")), React.createElement("p", {
                className: "text-sm text-gray-600 mb-3"
            }, "Compartilhe este link com gestores para visualizar o panorama em tempo real, sem precisar de login. A página atualiza automaticamente a cada 2 minutos."), React.createElement("div", {
                className: "flex gap-2 flex-wrap"
            }, React.createElement("input", {
                type: "text",
                readOnly: !0,
                value: `${API_URL}/disponibilidade/publico`,
                className: "flex-1 px-3 py-2 bg-gray-100 border rounded-lg text-sm font-mono"
            }), React.createElement("button", {
                onClick: () => {
                    navigator.clipboard.writeText(`${API_URL}/disponibilidade/publico`), ja("Link copiado!", "success")
                },
                className: "px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Copiar Link")), React.createElement("button", {
                onClick: () => window.open(`${API_URL}/disponibilidade/publico`, "_blank"),
                className: "px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-link" })), "Abrir")))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-map" })), "Regiões")), React.createElement("div", {
                className: "flex gap-2 mb-4"
            }, React.createElement("input", {
                type: "text",
                placeholder: "Nome da região (ex: GOIÂNIA)",
                value: p.novaRegiao || "",
                onChange: e => x({
                    ...p,
                    novaRegiao: e.target.value.toUpperCase()
                }),
                className: "flex-1 px-3 py-2 border rounded-lg",
                onKeyPress: e => "Enter" === e.key && o()
            }), React.createElement("button", {
                onClick: o,
                className: "px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            }, "+ Adicionar")), React.createElement("div", {
                className: "space-y-2"
            }, (e.regioes || []).map(t => React.createElement("div", {
                key: t.id,
                className: "flex items-center gap-2 p-2 bg-purple-50 rounded-lg"
            }, React.createElement("span", {
                className: "font-semibold text-purple-800 min-w-[150px]"
            }, t.nome), React.createElement("input", {
                type: "text",
                placeholder: "Gestores (ex: LIS / LEO / ERICK)",
                value: t.gestores || "",
                onChange: async a => {
                    const l = a.target.value,
                        r = e.regioes.map(e => e.id === t.id ? {
                            ...e,
                            gestores: l
                        } : e);
                    x(t => ({
                        ...t,
                        dispData: {
                            ...e,
                            regioes: r
                        }
                    })), clearTimeout(window.gestoresDebounce), window.gestoresDebounce = setTimeout(async () => {
                        try {
                            await _fetch(`${API_URL}/disponibilidade/regioes/${t.id}`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    gestores: l
                                })
                            })
                        } catch (e) {
                            console.error("Erro ao salvar gestores:", e)
                        }
                    }, 500)
                },
                className: "flex-1 px-2 py-1 border border-purple-200 rounded text-sm"
            }), React.createElement("button", {
                onClick: () => (async (e, t) => {
                    if (window.confirm(`Remover região "${t}" e todas suas lojas?`)) try {
                        await _fetch(`${API_URL}/disponibilidade/regioes/${e}`, {
                            method: "DELETE"
                        }), ja(`Região "${t}" removida!`, "success"), r()
                    } catch (e) {
                        ja("Erro ao remover região", "error")
                    }
                })(t.id, t.nome),
                className: "text-red-600 hover:text-red-800 font-bold px-2",
                title: "Remover região"
            }, "×"))), 0 === (e.regioes || []).length && React.createElement("p", {
                className: "text-gray-500 text-sm"
            }, "Nenhuma região cadastrada"))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-building" })), "Adicionar Loja")), React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-6 gap-3"
            }, React.createElement("select", {
                value: p.novaLojaRegiaoId || "",
                onChange: e => x({
                    ...p,
                    novaLojaRegiaoId: e.target.value
                }),
                className: "px-3 py-2 border rounded-lg"
            }, React.createElement("option", {
                value: ""
            }, "Selecione a Região"), (e.regioes || []).map(e => React.createElement("option", {
                key: e.id,
                value: e.id
            }, e.nome))), React.createElement("input", {
                type: "text",
                placeholder: "Código (ex: 249)",
                value: p.novaCodLoja || "",
                onChange: e => x({
                    ...p,
                    novaCodLoja: e.target.value
                }),
                className: "px-3 py-2 border rounded-lg"
            }), React.createElement("input", {
                type: "text",
                placeholder: "Nome da Loja",
                value: p.novaNomeLoja || "",
                onChange: e => x({
                    ...p,
                    novaNomeLoja: e.target.value.toUpperCase()
                }),
                className: "px-3 py-2 border rounded-lg"
            }), React.createElement("input", {
                type: "number",
                placeholder: "Titulares",
                min: "0",
                value: p.novaQtdTitulares || "",
                onChange: e => x({
                    ...p,
                    novaQtdTitulares: e.target.value
                }),
                className: "px-3 py-2 border rounded-lg",
                title: "Quantidade de linhas titulares"
            }), React.createElement("input", {
                type: "number",
                placeholder: "Excedentes",
                min: "0",
                value: p.novaQtdExcedentes || "",
                onChange: e => x({
                    ...p,
                    novaQtdExcedentes: e.target.value
                }),
                className: "px-3 py-2 border rounded-lg bg-red-50",
                title: "Quantidade de linhas excedentes"
            }), React.createElement("button", {
                onClick: async () => {
                    const e = p.novaCodLoja?.trim(),
                        t = p.novaNomeLoja?.trim(),
                        a = p.novaLojaRegiaoId,
                        l = parseInt(p.novaQtdTitulares) || 0,
                        o = parseInt(p.novaQtdExcedentes) || 0;
                    if (e && t && a)
                        if (0 !== l || 0 !== o) try {
                            if (!(await _fetch(`${API_URL}/disponibilidade/lojas`, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        regiao_id: a,
                                        codigo: e,
                                        nome: t,
                                        qtd_titulares: l,
                                        qtd_excedentes: o
                                    })
                                })).ok) throw new Error("Erro ao criar loja");
                            x(e => ({
                                ...e,
                                novaCodLoja: "",
                                novaNomeLoja: "",
                                novaQtdTitulares: "",
                                novaQtdExcedentes: "",
                                novaLojaRegiaoId: ""
                            })), ja(`Loja "${t}" adicionada com ${l} titular(es) e ${o} excedente(s)!`, "success"), r()
                        } catch (e) {
                            ja("Erro ao criar loja", "error")
                        } else ja("Adicione pelo menos 1 linha", "error");
                        else ja("Preencha todos os campos", "error")
                },
                className: "px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            }, "+ Adicionar Loja")), React.createElement("p", {
                className: "text-xs text-gray-500 mt-2"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bulb" })), "Titulares = linhas principais | Excedentes = linhas extras (aparecem em vermelho claro)"))), (e.regioes || []).map(t => {
                const a = (e.lojas || []).filter(e => e.regiao_id === t.id);
                return 0 === a.length ? null : React.createElement("div", {
                    key: t.id,
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("h3", {
                    className: "font-bold text-gray-800 mb-3"
                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pin" })), t.nome, " ", t.gestores && React.createElement("span", {
                    className: "font-normal text-gray-500"
                }, "(", t.gestores, ")")), React.createElement("div", {
                    className: "overflow-x-auto"
                }, React.createElement("table", {
                    className: "w-full text-sm"
                }, React.createElement("thead", {
                    className: "bg-gray-100"
                }, React.createElement("tr", null, React.createElement("th", {
                    className: "px-3 py-2 text-left"
                }, "Código"), React.createElement("th", {
                    className: "px-3 py-2 text-left"
                }, "Nome da Loja"), React.createElement("th", {
                    className: "px-3 py-2 text-center"
                }, "Titulares"), React.createElement("th", {
                    className: "px-3 py-2 text-center"
                }, "Excedentes"), React.createElement("th", {
                    className: "px-3 py-2 text-center"
                }, "Total"), React.createElement("th", {
                    className: "px-3 py-2 text-center"
                }, "Ações"))), React.createElement("tbody", null, a.map(t => {
                    const a = (e.linhas || []).filter(e => e.loja_id === t.id),
                        l = a.filter(e => !e.is_excedente).length,
                        o = a.filter(e => e.is_excedente).length,
                        c = p.editandoLoja === t.id;
                    return React.createElement("tr", {
                        key: t.id,
                        className: "border-t"
                    }, React.createElement("td", {
                        className: "px-3 py-2"
                    }, c ? React.createElement("input", {
                        type: "text",
                        value: p.editLojaCodigo || "",
                        onChange: e => x({
                            ...p,
                            editLojaCodigo: e.target.value
                        }),
                        className: "w-20 px-2 py-1 border rounded text-xs"
                    }) : React.createElement("span", {
                        className: "font-mono font-bold"
                    }, t.codigo)), React.createElement("td", {
                        className: "px-3 py-2"
                    }, c ? React.createElement("input", {
                        type: "text",
                        value: p.editLojaNome || "",
                        onChange: e => x({
                            ...p,
                            editLojaNome: e.target.value.toUpperCase()
                        }),
                        className: "w-full px-2 py-1 border rounded text-xs"
                    }) : t.nome), React.createElement("td", {
                        className: "px-3 py-2 text-center"
                    },
                        // Badge clicável de titulares: abre modal com listagem das linhas desse tipo
                        // pra permitir remoção individual (feature nova, além do botão +T que só adiciona).
                        React.createElement("button", {
                            onClick: () => x({
                                ...p,
                                verLinhas: (p.verLinhas && p.verLinhas.lojaId === t.id && p.verLinhas.tipo === 'titular')
                                    ? null
                                    : { lojaId: t.id, tipo: 'titular' }
                            }),
                            className: "px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 cursor-pointer",
                            title: "Clique para gerenciar titulares"
                        }, l),
                        // Modal de gerenciamento — aparece só pra (loja, tipo) ativos
                        p.verLinhas && p.verLinhas.lojaId === t.id && p.verLinhas.tipo === 'titular' &&
                            renderPopoverLinhas(a.filter(e => !e.is_excedente), 'Titulares', () => x({ ...p, verLinhas: null }), s, r, ja, t.nome)
                    ), React.createElement("td", {
                        className: "px-3 py-2 text-center"
                    },
                        React.createElement("button", {
                            onClick: () => x({
                                ...p,
                                verLinhas: (p.verLinhas && p.verLinhas.lojaId === t.id && p.verLinhas.tipo === 'excedente')
                                    ? null
                                    : { lojaId: t.id, tipo: 'excedente' }
                            }),
                            className: "px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 cursor-pointer",
                            title: "Clique para gerenciar excedentes"
                        }, o),
                        p.verLinhas && p.verLinhas.lojaId === t.id && p.verLinhas.tipo === 'excedente' &&
                            renderPopoverLinhas(a.filter(e => e.is_excedente), 'Excedentes', () => x({ ...p, verLinhas: null }), s, r, ja, t.nome)
                    ), React.createElement("td", {
                        className: "px-3 py-2 text-center font-semibold"
                    }, a.length), React.createElement("td", {
                        className: "px-3 py-2 text-center"
                    }, c ? React.createElement(React.Fragment, null, React.createElement("button", {
                        onClick: async () => {
                            // Optimistic: aplica o novo código/nome no estado local imediatamente e fecha edição.
                            // Se o PUT falhar, reverte pro valor original.
                            const novoCodigo = p.editLojaCodigo;
                            const novoNome = p.editLojaNome;
                            const lojaOriginal = (p.dispData?.lojas || []).find(l => l.id === t.id);
                            
                            x(prev => ({
                                ...prev,
                                editandoLoja: null,
                                dispData: {
                                    ...prev.dispData,
                                    lojas: (prev.dispData?.lojas || []).map(l =>
                                        l.id === t.id ? { ...l, codigo: novoCodigo, nome: novoNome } : l
                                    )
                                }
                            }));
                            
                            try {
                                const resp = await _fetch(`${API_URL}/disponibilidade/lojas/${t.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ codigo: novoCodigo, nome: novoNome })
                                });
                                if (!resp.ok) throw new Error("PUT falhou");
                                ja("Loja atualizada!", "success");
                            } catch (e) {
                                // Rollback: restaura código/nome anteriores.
                                if (lojaOriginal) {
                                    x(prev => ({
                                        ...prev,
                                        dispData: {
                                            ...prev.dispData,
                                            lojas: (prev.dispData?.lojas || []).map(l =>
                                                l.id === t.id ? { ...l, codigo: lojaOriginal.codigo, nome: lojaOriginal.nome } : l
                                            )
                                        }
                                    }));
                                }
                                ja("Erro ao atualizar", "error");
                            }
                        },
                        className: "px-2 py-1 bg-green-100 text-green-700 rounded text-xs mr-1"
                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" }))), React.createElement("button", {
                        onClick: () => x({
                            ...p,
                            editandoLoja: null
                        }),
                        className: "px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))) : React.createElement(React.Fragment, null, React.createElement("button", {
                        onClick: () => x({
                            ...p,
                            editandoLoja: t.id,
                            editLojaCodigo: t.codigo,
                            editLojaNome: t.nome
                        }),
                        className: "px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs mr-1",
                        title: "Editar loja"
                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" }))), React.createElement("button", {
                        onClick: () => s(t.id, 1, !1),
                        className: "px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1",
                        title: "Adicionar titular"
                    }, "+T"), React.createElement("button", {
                        onClick: () => s(t.id, 1, !0),
                        className: "px-2 py-1 bg-red-100 text-red-700 rounded text-xs mr-1",
                        title: "Adicionar excedente"
                    }, "+E"), React.createElement("button", {
                        onClick: () => (async (lojaId, lojaNome) => {
                            if (!window.confirm(`Remover loja "${lojaNome}"?`)) return;
                            
                            // Optimistic: guarda loja + linhas pra rollback, remove tudo do estado local.
                            // Sem flash da tabela inteira — a linha da loja simplesmente some.
                            const lojasAntes = p.dispData?.lojas || [];
                            const linhasAntes = p.dispData?.linhas || [];
                            const lojaRemovida = lojasAntes.find(l => l.id === lojaId);
                            const linhasRemovidas = linhasAntes.filter(l => l.loja_id === lojaId);
                            
                            x(prev => ({
                                ...prev,
                                dispData: {
                                    ...prev.dispData,
                                    lojas: (prev.dispData?.lojas || []).filter(l => l.id !== lojaId),
                                    linhas: (prev.dispData?.linhas || []).filter(l => l.loja_id !== lojaId)
                                }
                            }));
                            
                            try {
                                const resp = await _fetch(`${API_URL}/disponibilidade/lojas/${lojaId}`, { method: "DELETE" });
                                if (!resp.ok) throw new Error("DELETE falhou");
                                ja("Loja removida!", "success");
                            } catch (e) {
                                // Rollback: recoloca loja e linhas.
                                if (lojaRemovida) {
                                    x(prev => ({
                                        ...prev,
                                        dispData: {
                                            ...prev.dispData,
                                            lojas: [...(prev.dispData?.lojas || []), lojaRemovida],
                                            linhas: [...(prev.dispData?.linhas || []), ...linhasRemovidas]
                                        }
                                    }));
                                }
                                ja("Erro ao remover loja", "error");
                            }
                        })(t.id, t.nome),
                        className: "px-2 py-1 bg-red-100 text-red-700 rounded text-xs",
                        title: "Remover loja"
                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" }))))))
                })))))
            }), (e.linhas || []).length > 0 && React.createElement("div", {
                className: "bg-red-50 border border-red-200 rounded-xl p-4"
            }, React.createElement("div", {
                className: "flex items-center justify-between"
            }, React.createElement("div", null, React.createElement("h4", {
                className: "font-semibold text-red-800"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })), "Limpar Todas as Linhas")), React.createElement("p", {
                className: "text-sm text-red-600"
            }, "Reseta todos os entregadores, mantém a estrutura de regiões e lojas.")), React.createElement("button", {
                onClick: async () => {
                    if (window.confirm("Limpar TODAS as linhas? (mantém a estrutura de regiões e lojas)")) try {
                        await _fetch(`${API_URL}/disponibilidade/limpar-linhas`, {
                            method: "DELETE"
                        }), ja("Todas as linhas foram resetadas!", "success"), r()
                    } catch (e) {
                        ja("Erro ao limpar linhas", "error")
                    }
                },
                className: "px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            }, "Limpar Linhas")))), "principal" === t && _dispPainelClean(), "faltosos" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" })), "Filtros")), React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-4 gap-3"
            }, React.createElement("div", null, React.createElement("label", {
                className: "text-xs text-gray-600"
            }, "Data Início"), React.createElement("input", {
                type: "date",
                value: p.faltososDataInicio || "",
                onChange: e => x({
                    ...p,
                    faltososDataInicio: e.target.value
                }),
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            })), React.createElement("div", null, React.createElement("label", {
                className: "text-xs text-gray-600"
            }, "Data Fim"), React.createElement("input", {
                type: "date",
                value: p.faltososDataFim || "",
                onChange: e => x({
                    ...p,
                    faltososDataFim: e.target.value
                }),
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            })), React.createElement("div", null, React.createElement("label", {
                className: "text-xs text-gray-600"
            }, "Loja"), React.createElement("select", {
                value: p.faltososLojaId || "",
                onChange: e => x({
                    ...p,
                    faltososLojaId: e.target.value
                }),
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            }, React.createElement("option", {
                value: ""
            }, "Todas as lojas"), (e.lojas || []).map(e => React.createElement("option", {
                key: e.id,
                value: e.id
            }, e.codigo, " - ", e.nome)))), React.createElement("div", {
                className: "flex items-end gap-2"
            }, React.createElement("button", {
                onClick: async () => {
                    try {
                        let e = `${API_URL}/disponibilidade/faltosos?`;
                        p.faltososDataInicio && (e += `data_inicio=${p.faltososDataInicio}&`), p.faltososDataFim && (e += `data_fim=${p.faltososDataFim}&`), p.faltososLojaId && (e += `loja_id=${p.faltososLojaId}`);
                        const t = await _fetch(e),
                            a = await t.json();
                        x(e => ({
                            ...e,
                            faltososLista: a
                        }))
                    } catch (e) {
                        ja("Erro ao buscar faltosos", "error")
                    }
                },
                className: "flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" })), "Buscar")), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        faltososDataInicio: "",
                        faltososDataFim: "",
                        faltososLojaId: ""
                    }));
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/faltosos`),
                            t = await e.json();
                        x(e => ({
                            ...e,
                            faltososLista: t
                        }))
                    } catch (e) {
                        ja("Erro ao buscar faltosos", "error")
                    }
                },
                className: "px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Limpar"))))), React.createElement("div", {
                className: "bg-white rounded-xl shadow overflow-hidden"
            }, React.createElement("div", {
                className: "px-4 py-3 bg-gray-50 border-b flex justify-between items-center"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Registro de Faltas ("), (p.faltososLista || []).length, ")")), React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-xs"
            }, React.createElement("thead", {
                className: "bg-gray-100"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "DATA"), React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "REGIÃO"), React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "LOJA"), React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "COD"), React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "PROFISSIONAL"), React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "MOTIVO"), React.createElement("th", {
                className: "px-3 py-2 text-center w-16"
            }, "AÇÃO"))), React.createElement("tbody", null, 0 === (p.faltososLista || []).length ? React.createElement("tr", null, React.createElement("td", {
                colSpan: "7",
                className: "px-3 py-8 text-center text-gray-500"
            }, "Nenhum registro de falta encontrado.")) : (p.faltososLista || []).map(e => React.createElement("tr", {
                key: e.id,
                className: "border-t hover:bg-gray-50"
            }, React.createElement("td", {
                className: "px-3 py-2"
            }, new Date(e.data_falta).toLocaleDateString("pt-BR")), React.createElement("td", {
                className: "px-3 py-2"
            }, e.regiao_nome), React.createElement("td", {
                className: "px-3 py-2 font-mono"
            }, e.loja_codigo, " - ", e.loja_nome), React.createElement("td", {
                className: "px-3 py-2 font-mono"
            }, e.cod_profissional || "-"), React.createElement("td", {
                className: "px-3 py-2"
            }, e.nome_profissional || "-"), React.createElement("td", {
                className: "px-3 py-2 text-red-600"
            }, e.motivo), React.createElement("td", {
                className: "px-3 py-2 text-center"
            }, React.createElement("button", {
                onClick: async () => {
                    if (window.confirm(`Excluir registro de falta de ${e.nome_profissional||e.cod_profissional}?`)) try {
                        await _fetch(`${API_URL}/disponibilidade/faltosos/${e.id}`, {
                            method: "DELETE"
                        }), x(t => ({
                            ...t,
                            faltososLista: t.faltososLista.filter(t => t.id !== e.id)
                        })), ja("Falta excluída", "success")
                    } catch (e) {
                        ja("Erro ao excluir", "error")
                    }
                },
                className: "text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded",
                title: "Excluir falta"
            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" }))))))))))), "espelho" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-copy" })), "Histórico de Planilhas")), React.createElement("div", {
                className: "flex gap-3 items-end"
            }, React.createElement("div", {
                className: "flex-1"
            }, React.createElement("label", {
                className: "text-xs text-gray-600"
            }, "Selecione a data"), React.createElement("select", {
                value: p.espelhoDataSelecionada || "",
                onChange: async e => {
                    const t = e.target.value;
                    if (x(e => ({
                            ...e,
                            espelhoDataSelecionada: t,
                            espelhoCarregando: !0
                        })), t) try {
                        const e = await _fetch(`${API_URL}/disponibilidade/espelho/${t}`),
                            a = await e.json();
                        console.log("Espelho carregado:", a), x(e => ({
                            ...e,
                            espelhoDados: a.dados,
                            espelhoCarregando: !1
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar espelho:", e), ja("Erro ao carregar espelho", "error"), x(e => ({
                            ...e,
                            espelhoCarregando: !1
                        }))
                    } else x(e => ({
                        ...e,
                        espelhoDados: null,
                        espelhoCarregando: !1
                    }))
                },
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            }, React.createElement("option", {
                value: ""
            }, "Selecione uma data..."), (p.espelhoDatas || []).map(e => {
                const t = e.data_registro?.split("T")[0] || e.data_registro,
                    [a, l, r] = (t || "").split("-"),
                    o = a && l && r ? `${r}/${l}/${a}` : t;
                return React.createElement("option", {
                    key: e.id,
                    value: t
                }, o)
            }))), React.createElement("button", {
                onClick: async () => {
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/espelho`),
                            t = await e.json();
                        console.log("Datas espelho:", t), x(e => ({
                            ...e,
                            espelhoDatas: t
                        })), ja(`${t.length} data(s) encontrada(s)!`, "success")
                    } catch (e) {
                        ja("Erro ao carregar datas", "error")
                    }
                },
                className: "px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Atualizar")), p.espelhoDataSelecionada && React.createElement("button", {
                onClick: async () => {
                    const e = (p.espelhoDatas || []).find(e => (e.data_registro?.split("T")[0] || e.data_registro) === p.espelhoDataSelecionada);
                    if (!e) return;
                    const t = p.espelhoDataSelecionada.split("-").reverse().join("/");
                    if (window.confirm(`Excluir espelho de ${t}?\n\nEssa ação não pode ser desfeita.`)) try {
                        await _fetch(`${API_URL}/disponibilidade/espelho/${e.id}`, {
                            method: "DELETE"
                        });
                        const a = await _fetch(`${API_URL}/disponibilidade/espelho`),
                            l = await a.json();
                        x(e => ({
                            ...e,
                            espelhoDatas: l,
                            espelhoDataSelecionada: "",
                            espelhoDados: null
                        })), ja(`Espelho de ${t} excluído`, "success")
                    } catch (e) {
                        ja("Erro ao excluir espelho", "error")
                    }
                },
                className: "px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200"
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })), "Excluir"))), React.createElement("p", {
                className: "text-xs text-gray-500 mt-2"
            }, 0 === (p.espelhoDatas || []).length ? 'Nenhum espelho salvo ainda. Use "Resetar Status" para criar o primeiro.' : `${(p.espelhoDatas||[]).length} espelho(s) disponível(is)`)), p.espelhoCarregando ? React.createElement("div", {
                className: "bg-white rounded-xl shadow p-8 text-center"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"
            }), React.createElement("p", {
                className: "mt-2 text-gray-500"
            }, "Carregando...")) : p.espelhoDados ? React.createElement("div", {
                className: "space-y-4"
            }, (() => {
                const e = "string" == typeof p.espelhoDados ? JSON.parse(p.espelhoDados) : p.espelhoDados;
                return console.log("Dados do espelho:", e), e && e.regioes && 0 !== e.regioes.length ? (e.regioes || []).map(t => {
                    const a = (e.lojas || []).filter(e => e.regiao_id === t.id);
                    return 0 === a.length ? null : React.createElement("div", {
                        key: t.id,
                        className: "bg-white rounded-xl shadow overflow-hidden"
                    }, React.createElement("div", {
                        className: "bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2"
                    }, React.createElement("h3", {
                        className: "font-bold text-white text-sm"
                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pin" })), t.nome)), a.map(t => {
                        const a = (e.linhas || []).filter(e => e.loja_id === t.id);
                        return React.createElement("div", {
                            key: t.id,
                            className: "border-t"
                        }, React.createElement("div", {
                            className: "px-3 py-2 bg-gray-50 font-semibold text-sm"
                        }, t.codigo, " - ", t.nome), React.createElement("table", {
                            className: "w-full text-xs"
                        }, React.createElement("tbody", null, [...a].sort((e, t) => e.is_reposicao && !t.is_reposicao ? -1 : !e.is_reposicao && t.is_reposicao || e.is_excedente && !t.is_excedente ? 1 : !e.is_excedente && t.is_excedente ? -1 : 0).map(e => React.createElement("tr", {
                            key: e.id,
                            className: `border-t ${e.is_excedente?"bg-red-50":""} ${e.is_reposicao?"bg-blue-50":""}`
                        }, React.createElement("td", {
                            className: `w-1 ${e.is_excedente?"bg-red-400":""} ${e.is_reposicao?"bg-blue-400":""}`
                        }), React.createElement("td", {
                            className: "px-2 py-1 font-mono w-20"
                        }, e.cod_profissional || "-"), React.createElement("td", {
                            className: "px-2 py-1"
                        }, React.createElement("div", {
                            className: "flex items-center gap-1"
                        }, e.is_reposicao && React.createElement("span", {
                            className: "text-[9px] text-blue-400 italic"
                        }, "reposição"), e.is_excedente && React.createElement("span", {
                            className: "text-[9px] text-red-400 italic"
                        }, "excedente"), React.createElement("span", null, e.nome_profissional || (e.is_reposicao || e.is_excedente ? "" : "-")))), React.createElement("td", {
                            className: "px-2 py-1 w-28"
                        }, React.createElement("span", {
                            className: "px-2 py-0.5 rounded-full text-xs font-semibold " + (n[e.status] || n["A CONFIRMAR"]) /* DISP_CLEAN_V1 */
                        }, e.status)), React.createElement("td", {
                            className: "px-2 py-1 text-gray-500"
                        }, e.observacao || ""))))))
                    }))
                }) : React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-8 text-center"
                }, React.createElement("p", {
                    className: "text-gray-500"
                }, "Espelho vazio ou sem dados"))
            })()) : React.createElement("div", {
                className: "bg-white rounded-xl shadow p-8 text-center"
            }, React.createElement("p", {
                className: "text-gray-500"
            }, "Selecione uma data para visualizar o histórico"))))

    };

    window.ModuloDisponibilidadeLoaded = true;
    console.log("✅ Módulo Disponibilidade carregado!");

})();
