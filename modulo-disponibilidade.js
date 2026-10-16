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
                        className: "bg-white border border-gray-200 rounded-[14px] w-full max-w-md overflow-hidden" /* DISP_ABAS_V1: modal limpo */,
                        onClick: (e) => e.stopPropagation(),
                        style: { textAlign: "left" }
                    },
                        // Header com título + nome da loja + botão fechar
                        React.createElement("div", {
                            className: "flex items-start justify-between px-5 py-4 border-b border-gray-100 bg-white"
                        },
                            React.createElement("div", null,
                                React.createElement("div", { className: "text-base font-semibold text-gray-900" },
                                    `${titulo} (${linhas.length})`
                                ),
                                React.createElement("div", { className: "text-xs text-gray-500 mt-0.5 truncate max-w-[300px]" }, nomeLoja)
                            ),
                            React.createElement("button", {
                                onClick: onFechar,
                                "aria-label": "Fechar",
                                className: "w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                        ),
                        // Lista de linhas (scroll interno se muitas)
                        linhas.length === 0
                            ? React.createElement("div", {
                                className: "px-5 py-8 text-sm text-gray-500 text-center"
                            }, `Nenhum ${rotuloTipo} cadastrado`)
                            : React.createElement("div", {
                                className: "max-h-[60vh] overflow-y-auto"
                            }, linhas.map((linha, idx) => React.createElement("div", {
                                key: linha.id,
                                className: "flex items-center justify-between px-5 py-2.5 border-t border-gray-100 first:border-t-0 hover:bg-gray-50"
                            },
                                React.createElement("div", { className: "flex-1 min-w-0 mr-3" },
                                    React.createElement("div", { className: "text-sm font-medium text-gray-800 truncate" },
                                        linha.nome_profissional
                                            ? linha.nome_profissional
                                            : React.createElement("span", { className: "text-gray-400 italic" }, `${idx + 1}. (vazia)`)
                                    ),
                                    linha.nome_profissional && React.createElement("div", {
                                        className: "mt-1"
                                    }, _dsPill(linha.status || 'A CONFIRMAR'))
                                ),
                                React.createElement("button", {
                                    onClick: () => removerLinhaIndividual(linha, titulo.slice(0, -1), nomeLoja, reload, toast),
                                    className: "w-8 h-8 inline-flex items-center justify-center bg-white border border-red-200 text-red-800 hover:bg-red-50 rounded-lg flex-shrink-0",
                                    title: `Remover ${rotuloTipo}`,
                                    "aria-label": `Remover ${rotuloTipo}`
                                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))
                            ))),
                        // Footer com ação secundária de fechar
                        React.createElement("div", {
                            className: "px-5 py-3 border-t border-gray-100 bg-white flex justify-end"
                        },
                            React.createElement("button", {
                                onClick: onFechar,
                                className: "h-[38px] px-4 bg-white border border-gray-200 text-gray-700 rounded-[10px] text-sm font-semibold hover:bg-gray-50"
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

            /* DISP_ABAS_V1 — demais abas da Disponibilidade no padrão clean (Faltosos, Espelho, Relatórios, Motoboys, Restrições, Config).
               Mesmas chamadas de API, mesmos nomes de estado e handlers; só a apresentação mudou. */
            const DS_IN = "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]";
            const DS_BTN_PRI = { height: 38, padding: "0 16px", borderRadius: 10, border: 0, background: "#770fa8", color: "#ffffff", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" };
            const DS_BTN_DEST = { ...DS_BTN, fontWeight: 600, border: "1px solid #fecaca", color: "#991b1b", whiteSpace: "nowrap" };
            const DS_ICOBTN = { width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#ffffff", color: "#374151", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none", fontFamily: "inherit" };
            const DS_ICOBTN_DEST = { ...DS_ICOBTN, border: "1px solid #fecaca", color: "#991b1b" };
            const _dsLabel = (txt, htmlFor) => _h("label", { htmlFor, style: { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 } }, txt);
            const _dsCampo = (txt, ctrl, id) => _h("div", { style: { minWidth: 0 } }, _dsLabel(txt, id), ctrl);
            const _dsCabecalho = (titulo, sub, acoes) => _h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 } },
                _h("div", { style: { minWidth: 0 } },
                    _h("h1", { style: { margin: 0, fontFamily: DS_SORA, fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "#111827" } }, titulo),
                    sub ? _h("p", { style: { margin: "4px 0 0", color: "#6b7280", fontSize: 13 } }, sub) : null),
                acoes ? _h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } }, acoes) : null);
            const _dsCardTitulo = (txt, extra, dir) => _h("div", { style: { padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", borderBottom: "1px solid #f3f4f6" } },
                _h("div", { style: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" } },
                    _h("h2", { style: { margin: 0, fontSize: 15, fontWeight: 600, color: "#111827" } }, txt),
                    extra ? _h("span", { style: { fontSize: 12, color: "#6b7280" } }, extra) : null),
                dir || null);
            const _dsVazio = (txt, sub, acao) => _h("div", { style: { padding: "36px 18px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 } },
                _h("p", { style: { margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" } }, txt),
                sub ? _h("p", { style: { margin: 0, fontSize: 12.5, color: "#6b7280" } }, sub) : null,
                acao ? _h("div", { style: { marginTop: 10 } }, acao) : null);
            const _dsCarregando = (txt) => _h("div", { style: { padding: "36px 18px", textAlign: "center", color: "#6b7280", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 } },
                _h("span", { className: "animate-spin", style: { width: 16, height: 16, borderRadius: 99, border: "2px solid #e9d5f9", borderTopColor: "#770fa8", display: "inline-block" } }), txt || "Carregando...");
            const _dsTh = (txt, dir, extra) => { const ex = Object.assign({}, extra || {}); const k = ex.key; delete ex.key; return _h("th", { key: k, style: Object.assign({ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#6b7280", textAlign: dir ? "right" : "left", whiteSpace: "nowrap" }, ex) }, txt); };
            const DS_TD = { padding: "10px 14px", verticalAlign: "middle" };
            const DS_TD_NUM = { ...DS_TD, textAlign: "right", fontVariantNumeric: "tabular-nums" };
            const _dsTabela = (minW, cab, corpo) => _h("div", { style: { overflowX: "auto", position: "relative" } },
                _h("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#111827", minWidth: minW || 0 } },
                    _h("thead", null, _h("tr", { style: { background: "#f9fafb" } }, cab)),
                    _h("tbody", null, corpo)));
            const _dsTr = (key, cels, extra) => _h("tr", Object.assign({ key, style: { borderTop: "1px solid #f3f4f6" } }, extra || {}), cels);
            const _dsTom = { verde: ["#f0fdf4", "#166534", "#16a34a"], ambar: ["#fffbeb", "#92400e", "#d97706"], vermelho: ["#fef2f2", "#991b1b", "#dc2626"], azul: ["#eff6ff", "#1e40af", "#2563eb"], cinza: ["#f3f4f6", "#374151", "#6b7280"], roxo: ["#faf7fd", "#5d0b85", "#770fa8"] };
            const _dsPillTom = (tom, txt, semPonto) => { const c = _dsTom[tom] || _dsTom.cinza; return _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 99, padding: "2px 9px", fontWeight: 600, fontSize: 11.5, background: c[0], color: c[1], whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" } }, semPonto ? null : _dsDot(c[2]), txt); };
            const _dsTag = (txt) => _h("span", { style: { display: "inline-flex", alignItems: "center", borderRadius: 6, padding: "1px 7px", fontSize: 11, fontWeight: 600, background: "#f3f4f6", color: "#374151", fontFamily: DS_MONO, whiteSpace: "nowrap" } }, txt);
            const _dsIniciais = (nome) => String(nome || "?").split(" ").filter(Boolean).slice(0, 2).map(z => z[0]).join("").toUpperCase() || "?";
            const _dsAvatar = (nome) => _h("span", { "aria-hidden": "true", style: { width: 32, height: 32, borderRadius: 99, background: "#f3e8fb", color: "#5d0b85", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" } }, _dsIniciais(nome));
            const _dsDataBR = (v) => { if (!v) return "-"; const s = String(v).split("T")[0]; const [aa, mm, dd] = s.split("-"); return aa && mm && dd ? `${dd}/${mm}/${aa}` : new Date(v).toLocaleDateString("pt-BR"); };
            const _dsSecao = (filhos, extra) => _h("section", { style: { ...DS_CARD, overflow: "hidden", ...(extra || {}) } }, filhos);

            /* DISP_ABAS_V1 — Faltosos */
            const _dispFaltososClean = () => {
                const buscar = async () => {
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
                };
                const limpar = async () => {
                    x(e => ({
                        ...e,
                        faltososDataInicio: "",
                        faltososDataFim: "",
                        faltososLojaId: "",
                        faltososRegiao: ""
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
                };
                const excluir = async (e) => {
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
                };
                const todos = Array.isArray(p.faltososLista) ? p.faltososLista : [];
                const regioesLista = [...new Set(todos.map(f => f.regiao_nome).filter(Boolean))].sort();
                // Filtro de região é local (a API filtra por período e loja)
                const lista = p.faltososRegiao ? todos.filter(f => f.regiao_nome === p.faltososRegiao) : todos;
                const motoboysN = new Set(lista.map(f => f.cod_profissional || f.nome_profissional).filter(Boolean)).size;
                const lojasN = new Set(lista.map(f => f.loja_codigo).filter(Boolean)).size;
                const contMotivo = {};
                lista.forEach(f => { const k = (f.motivo || "").trim(); k && (contMotivo[k] = (contMotivo[k] || 0) + 1) });
                const topMotivo = Object.entries(contMotivo).sort((a1, b1) => b1[1] - a1[1])[0];
                const periodoTxt = p.faltososDataInicio || p.faltososDataFim ? "Período: " + (p.faltososDataInicio ? _dsDataBR(p.faltososDataInicio) : "início") + " a " + (p.faltososDataFim ? _dsDataBR(p.faltososDataFim) : "hoje") : "Todos os registros";
                return _h("div", { className: "space-y-4" },
                    _dsCabecalho("Faltosos", periodoTxt + " · " + lista.length + (lista.length === 1 ? " falta registrada" : " faltas registradas")),
                    _h("section", { className: "grid grid-cols-2 lg:grid-cols-4", style: { ...DS_CARD, overflow: "hidden" } },
                        _dsKpi("Faltas", lista.length, "no filtro atual", lista.length > 0 ? "#991b1b" : "#111827"),
                        _dsKpi("Motoboys", motoboysN, "com ao menos 1 falta"),
                        _dsKpi("Lojas afetadas", lojasN, "com falta registrada"),
                        _dsKpi("Motivo mais comum", _h("span", { style: { fontSize: 16, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: topMotivo ? topMotivo[0] : "" }, topMotivo ? topMotivo[0] : "—"), topMotivo ? topMotivo[1] + (topMotivo[1] === 1 ? " ocorrência" : " ocorrências") : "sem registros", null, { borderRight: 0 })),
                    _dsSecao(_h("div", { style: { padding: 16, display: "grid", gap: 12, alignItems: "end" }, className: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_1.2fr_auto]" },
                        _dsCampo("Data início", _h("input", { id: "flt-ini", type: "date", value: p.faltososDataInicio || "", onChange: e => x({ ...p, faltososDataInicio: e.target.value }), className: DS_IN }), "flt-ini"),
                        _dsCampo("Data fim", _h("input", { id: "flt-fim", type: "date", value: p.faltososDataFim || "", onChange: e => x({ ...p, faltososDataFim: e.target.value }), className: DS_IN }), "flt-fim"),
                        _dsCampo("Loja", _h("select", { id: "flt-loja", value: p.faltososLojaId || "", onChange: e => x({ ...p, faltososLojaId: e.target.value }), className: DS_IN },
                            _h("option", { value: "" }, "Todas as lojas"), (e.lojas || []).map(e => _h("option", { key: e.id, value: e.id }, e.codigo, " - ", e.nome))), "flt-loja"),
                        _dsCampo("Região", _h("select", { id: "flt-reg", value: p.faltososRegiao || "", onChange: ev => x({ ...p, faltososRegiao: ev.target.value }), className: DS_IN },
                            _h("option", { value: "" }, "Todas as regiões"), regioesLista.map(rg => _h("option", { key: rg, value: rg }, rg))), "flt-reg"),
                        _h("div", { style: { display: "flex", gap: 8 } },
                            _h("button", { type: "button", onClick: buscar, style: DS_BTN_PRI }, _dsIco("search", 15), "Buscar"),
                            _h("button", { type: "button", onClick: limpar, className: "hover:bg-gray-50", style: { ...DS_BTN, fontWeight: 600 } }, "Limpar")))),
                    _dsSecao([
                        _h(React.Fragment, { key: "t" }, _dsCardTitulo("Registro de faltas", lista.length + (lista.length === 1 ? " registro" : " registros"))),
                        0 === lista.length
                            ? _h(React.Fragment, { key: "v" }, _dsVazio("Nenhuma falta encontrada", "Ajuste o período, a loja ou a região para ver outros registros."))
                            : _h(React.Fragment, { key: "l" }, _dsTabela(820,
                                [_dsTh("Data", 0, { key: 1 }), _dsTh("Região", 0, { key: 2 }), _dsTh("Loja", 0, { key: 3 }), _dsTh("Profissional", 0, { key: 4 }), _dsTh("Motivo", 0, { key: 5 }), _h("th", { key: 6, style: { width: 56 } }, _h("span", { className: "sr-only" }, "Ações"))],
                                lista.map(f => _dsTr(f.id, [
                                    _h("td", { key: 1, style: { ...DS_TD, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: "#374151" } }, new Date(f.data_falta).toLocaleDateString("pt-BR")),
                                    _h("td", { key: 2, style: { ...DS_TD, color: "#6b7280", whiteSpace: "nowrap" } }, f.regiao_nome || "-"),
                                    _h("td", { key: 3, style: DS_TD }, _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 8 } }, _dsTag(f.loja_codigo || "-"), _h("span", { style: { fontWeight: 500 } }, f.loja_nome || ""))),
                                    _h("td", { key: 4, style: DS_TD }, _h("div", { style: { fontWeight: 600 } }, f.nome_profissional || "-"), f.cod_profissional ? _h("div", { style: { fontFamily: DS_MONO, fontSize: 11.5, color: "#6b7280" } }, f.cod_profissional) : null),
                                    _h("td", { key: 5, style: { ...DS_TD, maxWidth: 260 } }, f.motivo ? _dsPillTom("vermelho", f.motivo) : _h("span", { style: { color: "#9ca3af" } }, "-")),
                                    _h("td", { key: 6, style: { ...DS_TD, textAlign: "right" } }, _h("button", { type: "button", onClick: () => excluir(f), title: "Excluir falta", "aria-label": "Excluir falta", className: "hover:bg-red-50", style: DS_ICOBTN_DEST }, _dsIco("trash", 15)))
                                ]))))
                    ]));
            };

            /* DISP_ABAS_V1 — Espelho (histórico dos dias salvos) */
            const _dispEspelhoClean = () => {
                const selecionarData = async e => {
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
                };
                const atualizarDatas = async () => {
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
                };
                const excluirEspelho = async () => {
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
                };
                const datas = p.espelhoDatas || [];
                const dados = p.espelhoDados ? ("string" == typeof p.espelhoDados ? JSON.parse(p.espelhoDados) : p.espelhoDados) : null;
                const conteudo = () => {
                    if (p.espelhoCarregando) return _dsSecao(_dsCarregando("Carregando espelho..."));
                    if (!dados) return _dsSecao(_dsVazio(datas.length ? "Selecione uma data" : "Nenhum espelho salvo ainda", datas.length ? "Escolha um dia salvo acima para ver como estava a escala." : 'O espelho é salvo ao usar "Resetar dia" no Painel.'));
                    if (!dados.regioes || 0 === dados.regioes.length) return _dsSecao(_dsVazio("Espelho vazio ou sem dados"));
                    const lin = dados.linhas || [];
                    const tit = lin.filter(li => !li.is_excedente && !li.is_reposicao).length;
                    const emL = lin.filter(li => "EM LOJA" === li.status).length;
                    const falt = lin.filter(li => "FALTANDO" === li.status).length;
                    const semC = lin.filter(li => "SEM CONTATO" === li.status).length;
                    const perc = tit > 0 ? Math.round(Math.min(emL / tit * 100, 100)) : 0;
                    const fx = _dsFaixa(perc);
                    const ordenar = (arr) => [...arr].sort((e, t) => e.is_reposicao && !t.is_reposicao ? -1 : !e.is_reposicao && t.is_reposicao || e.is_excedente && !t.is_excedente ? 1 : !e.is_excedente && t.is_excedente ? -1 : 0);
                    return _h(React.Fragment, null,
                        _h("section", { className: "grid grid-cols-2 lg:grid-cols-4", style: { ...DS_CARD, overflow: "hidden" } },
                            _h("div", { style: { padding: "16px 20px", borderRight: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: 8, minWidth: 0 } },
                                _h("span", { style: { fontSize: 12, color: "#6b7280" } }, "Cobertura do dia"),
                                _h("div", { style: { fontFamily: DS_SORA, fontSize: 26, fontWeight: 700, color: fx[1], lineHeight: 1.2, fontVariantNumeric: "tabular-nums" } }, perc + "%"),
                                _h("div", { style: { display: "flex" } }, _dsBar(perc, fx[0]))),
                            _dsKpi("Em loja", _h(React.Fragment, null, emL, _h("span", { style: { fontSize: 15, color: "#9ca3af", fontWeight: 600 } }, " / " + tit)), "titulares"),
                            _dsKpi("Faltas", falt, falt === 1 ? "motoboy faltou" : "motoboys faltaram", falt > 0 ? DS.FALTANDO.txt : "#111827"),
                            _dsKpi("Sem contato", semC, "sem retorno no dia", "#111827", { borderRight: 0 })),
                        _dsSecao([
                            _h("div", { key: "leg", style: { padding: "12px 18px", display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "#6b7280", borderBottom: "1px solid #f3f4f6" } },
                                DS_ORDEM.map(st => _h("span", { key: st, style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _dsDot(DS[st].cor, 8), DS[st].label)),
                                _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" } }, _h("span", { style: { width: 14, height: 10, borderRadius: 3, background: DS_ROW.excedente, border: "1px solid #fde68a" } }), "Excedente"),
                                _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _h("span", { style: { width: 14, height: 10, borderRadius: 3, background: DS_ROW.reposicao, border: "1px solid #bfdbfe" } }), "Reposição")),
                            _h(React.Fragment, { key: "tb" }, _dsTabela(640,
                                [_dsTh("Código", 0, { key: 1, width: 96, paddingLeft: 18 }), _dsTh("Motoboy", 0, { key: 2 }), _dsTh("Status", 0, { key: 3, width: 150 }), _dsTh("Observação", 0, { key: 4 })],
                                (dados.regioes || []).map(rg => {
                                    const lojasRg = (dados.lojas || []).filter(lj => lj.regiao_id === rg.id);
                                    return 0 === lojasRg.length ? null : _h(React.Fragment, { key: rg.id },
                                        _h("tr", { style: { background: "#f9fafb", borderTop: "1px solid #e5e7eb" } },
                                            _h("td", { colSpan: 4, style: { padding: "8px 18px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#6b7280" } }, rg.nome, rg.gestores ? " · " + rg.gestores : "")),
                                        lojasRg.map(lj => {
                                            const ll = lin.filter(li => li.loja_id === lj.id);
                                            const llTit = ll.filter(li => !li.is_excedente && !li.is_reposicao).length;
                                            const llEm = ll.filter(li => "EM LOJA" === li.status).length;
                                            const llPerc = llTit > 0 ? Math.min(llEm / llTit * 100, 100) : 0;
                                            return _h(React.Fragment, { key: lj.id },
                                                _h("tr", { style: { borderTop: "1px solid #f3f4f6" } },
                                                    _h("td", { colSpan: 4, style: { padding: "10px 18px" } },
                                                        _h("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
                                                            _h("span", { style: { fontFamily: DS_MONO, fontSize: 12, color: "#5d0b85", fontWeight: 700 } }, lj.codigo),
                                                            _h("b", { style: { fontWeight: 600 } }, lj.nome),
                                                            _h("span", { style: { marginLeft: "auto", fontSize: 12, color: "#6b7280" } }, llEm + " em loja de " + llTit),
                                                            _h("b", { style: { fontVariantNumeric: "tabular-nums", color: _dsFaixa(llPerc)[1], fontSize: 12.5, width: 40, textAlign: "right" } }, Math.round(llPerc) + "%")))),
                                                ordenar(ll).map(li => _h("tr", { key: li.id, style: { borderTop: "1px solid #f3f4f6", background: li.is_reposicao ? DS_ROW.reposicao : li.is_excedente ? DS_ROW.excedente : "#ffffff" } },
                                                    _h("td", { style: { ...DS_TD, paddingLeft: 18, fontFamily: DS_MONO, fontSize: 12, color: "#374151" } }, li.cod_profissional || "-"),
                                                    _h("td", { style: DS_TD }, _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 8 } },
                                                        _h("span", { style: { fontWeight: 500 } }, li.nome_profissional || (li.is_reposicao || li.is_excedente ? "" : "-")),
                                                        li.is_reposicao ? _h("span", { style: { fontSize: 11, color: "#1e40af" } }, "reposição") : null,
                                                        li.is_excedente ? _h("span", { style: { fontSize: 11, color: "#92400e" } }, "excedente") : null)),
                                                    _h("td", { style: DS_TD }, _dsPill(li.status || "A CONFIRMAR")),
                                                    _h("td", { style: { ...DS_TD, color: "#6b7280", fontSize: 12.5 } }, li.observacao || ""))));
                                        }));
                                })))
                        ]));
                };
                return _h("div", { className: "space-y-4" },
                    _dsCabecalho("Espelho", "Histórico dos dias salvos · " + datas.length + (datas.length === 1 ? " espelho disponível" : " espelhos disponíveis"),
                        [_h("select", { key: "d", "aria-label": "Data do espelho", value: p.espelhoDataSelecionada || "", onChange: selecionarData, style: { ...DS_BTN, minWidth: 190 } },
                            _h("option", { value: "" }, "Selecione uma data..."),
                            datas.map(e => {
                                const t = e.data_registro?.split("T")[0] || e.data_registro,
                                    [a, l, r] = (t || "").split("-"),
                                    o = a && l && r ? `${r}/${l}/${a}` : t;
                                return _h("option", { key: e.id, value: t }, o)
                            })),
                        _h("button", { key: "a", type: "button", onClick: atualizarDatas, className: "hover:bg-gray-50", style: { ...DS_BTN, fontWeight: 600 } }, _dsIco("refresh", 15), "Atualizar"),
                        p.espelhoDataSelecionada ? _h("button", { key: "x", type: "button", onClick: excluirEspelho, className: "hover:bg-red-50", style: DS_BTN_DEST }, _dsIco("trash", 15), "Excluir espelho") : null]),
                    conteudo());
            };

            /* DISP_ABAS_V1 — Relatórios */
            const _dispRelatoriosClean = () => {
                if (p.relatoriosLoading) return _h("div", { className: "space-y-4" }, _dsCabecalho("Relatórios", "Comparativo, evolução e rankings da disponibilidade"), _dsSecao(_dsCarregando("Carregando relatórios...")));
                const rd = p.relatoriosData || {};
                const comp = rd.comparativo || {};
                const labels = comp.labels || {};
                const cols = [{ key: "hoje", data: comp.hoje, padrao: "Mais recente" }, { key: "ontem", data: comp.ontem, padrao: "Anterior" }, { key: "semanaPassada", data: comp.semanaPassada, padrao: "3º anterior" }];
                const delta = (a1, b1) => {
                    const v = a1 - b1, pos = v >= 0;
                    return _h("span", { style: { fontWeight: 700, color: pos ? "#166534" : "#991b1b", fontVariantNumeric: "tabular-nums" } }, (pos ? "+" : "") + v.toFixed(1) + "%");
                };
                const metricas = Array.isArray(rd.metricas) ? rd.metricas : [];
                const rankL = Array.isArray(rd.rankingLojas) ? rd.rankingLojas : [];
                const rankF = Array.isArray(rd.rankingFaltosos) ? rd.rankingFaltosos : [];
                const hm = rd.heatmap || {};
                const hmLojas = Array.isArray(hm.lojas) ? hm.lojas : [];
                const hmDias = Array.isArray(hm.diasSemana) && hm.diasSemana.length ? hm.diasSemana : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                const corHeat = (v, mx) => { const q = v / mx; return 0 === v ? ["#f9fafb", "#d1d5db"] : q >= .8 ? ["#dc2626", "#ffffff"] : q >= .5 ? ["#fecaca", "#991b1b"] : q >= .3 ? ["#fef2f2", "#991b1b"] : ["#fffbeb", "#92400e"]; };
                const linhaRank = (key, pos, nome, sub, perc) => {
                    const fx = _dsFaixa(perc);
                    return _h("div", { key, style: { display: "grid", gridTemplateColumns: "28px minmax(0,1fr) 120px 44px", gap: 10, alignItems: "center", padding: "9px 18px", borderTop: "1px solid #f3f4f6", fontSize: 13 } },
                        _h("span", { style: { color: "#9ca3af", fontVariantNumeric: "tabular-nums" } }, pos + "º"),
                        _h("span", { style: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, _h("b", { style: { fontWeight: 600 } }, nome), sub ? _h("span", { style: { color: "#6b7280" } }, " · " + sub) : null),
                        _h("span", { style: { display: "flex" } }, _dsBar(perc, fx[0])),
                        _h("b", { style: { textAlign: "right", color: fx[1], fontVariantNumeric: "tabular-nums" } }, perc + "%"));
                };
                const subRank = (txt) => _h("div", { style: { padding: "10px 18px 6px", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#6b7280", borderTop: "1px solid #f3f4f6" } }, txt);
                return _h("div", { className: "space-y-4" },
                    _dsCabecalho("Relatórios", "Comparativo, evolução e rankings da disponibilidade"),
                    // Comparativo em faixa
                    _h("section", { style: { ...DS_CARD, overflow: "hidden" } },
                        _h("div", { className: "grid grid-cols-1 md:grid-cols-3" },
                            cols.map((c, i) => {
                                const d = c.data;
                                const fx = d ? _dsFaixa(d.perc) : ["#9ca3af", "#6b7280"];
                                return _h("div", { key: c.key, style: { padding: "16px 20px", borderRight: i < 2 ? "1px solid #f3f4f6" : 0, borderBottom: "1px solid #f3f4f6", minWidth: 0 } },
                                    _h("div", { style: { fontSize: 12, color: "#6b7280" } }, labels[c.key] || c.padrao),
                                    d ? _h(React.Fragment, null,
                                        _h("div", { style: { fontFamily: DS_SORA, fontSize: 26, fontWeight: 700, color: fx[1], lineHeight: 1.25, marginTop: 2, fontVariantNumeric: "tabular-nums" } }, d.perc + "%", _h("span", { style: { fontFamily: "inherit", fontSize: 12, fontWeight: 500, color: "#6b7280", marginLeft: 6 } }, "em loja")),
                                        _h("div", { style: { display: "flex", margin: "8px 0" } }, _dsBar(d.perc, fx[0])),
                                        _h("div", { style: { display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: "#6b7280" } },
                                            _h("span", null, _h("b", { style: { color: DS["EM LOJA"].txt } }, d.emLoja || 0), " em loja de ", _h("b", { style: { color: "#111827" } }, d.titulares || 0)),
                                            _h("span", null, _h("b", { style: { color: DS.FALTANDO.txt } }, d.faltando || 0), " faltando"),
                                            _h("span", null, _h("b", { style: { color: "#374151" } }, d.semContato || 0), " sem contato")))
                                        : _h("div", { style: { fontSize: 13, color: "#9ca3af", marginTop: 6 } }, "Sem dados"));
                            })),
                        comp.hoje && comp.ontem ? _h("div", { style: { padding: "10px 20px", display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5, color: "#6b7280" } },
                            _h("span", null, "vs anterior: ", delta(comp.hoje.perc, comp.ontem.perc)),
                            comp.semanaPassada ? _h("span", null, "vs semana: ", delta(comp.hoje.perc, comp.semanaPassada.perc)) : null) : null),
                    // Evolução
                    _dsSecao([
                        _h(React.Fragment, { key: "t" }, _dsCardTitulo("Evolução % em loja", "últimos 7 dias", _h("span", { style: { display: "flex", gap: 12, fontSize: 12, color: "#6b7280" } },
                            _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _dsDot("#16a34a", 8), "≥ 80%"),
                            _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _dsDot("#d97706", 8), "≥ 50%"),
                            _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _dsDot("#dc2626", 8), "< 50%")))),
                        0 === metricas.length
                            ? _h(React.Fragment, { key: "v" }, _dsVazio("Sem dados históricos", "Salve espelhos diários para ver o gráfico."))
                            : _h("div", { key: "g", style: { padding: "18px 18px 14px", display: "flex", alignItems: "flex-end", gap: 12, height: 220 } },
                                metricas.slice(0, 7).reverse().map((m, i) => {
                                    let dl = "-";
                                    if (m.data) { const [, mm, dd] = m.data.split("T")[0].split("-"); dl = `${dd}/${mm}`; }
                                    const v = m.percOperacao || 0, fx = _dsFaixa(v);
                                    return _h("div", { key: i, style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" } },
                                        _h("span", { style: { fontSize: 12, fontWeight: 700, color: fx[1], fontVariantNumeric: "tabular-nums" } }, v + "%"),
                                        _h("div", { title: dl + ": " + v + "% · " + (m.emLoja || 0) + " em loja", style: { width: "100%", maxWidth: 56, height: Math.max(4, v * 1.3) + "px", background: fx[0], borderRadius: "6px 6px 2px 2px" } }),
                                        _h("span", { style: { fontSize: 11.5, color: "#374151", fontVariantNumeric: "tabular-nums" } }, dl),
                                        _h("span", { style: { fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" } }, (m.emLoja || 0) + " em loja"));
                                }))
                    ]),
                    _h("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4" },
                        _dsSecao([
                            _h(React.Fragment, { key: "t" }, _dsCardTitulo("Ranking de lojas", "média de 7 dias")),
                            0 === rankL.length ? _h(React.Fragment, { key: "v" }, _dsVazio("Sem dados de lojas")) : _h("div", { key: "l", style: { maxHeight: 420, overflowY: "auto" } },
                                subRank("5 melhores"),
                                rankL.slice(0, 5).map((it, i) => linhaRank("m" + (it.loja_id || i), i + 1, it.loja_nome || "-", it.regiao_nome || "", it.mediaPerc || 0)),
                                rankL.length > 5 ? subRank("5 piores") : null,
                                rankL.length > 5 ? rankL.slice(-5).reverse().map((it, i) => linhaRank("p" + (it.loja_id || i), rankL.length - i, it.loja_nome || "-", it.regiao_nome || "", it.mediaPerc || 0)) : null)
                        ]),
                        _dsSecao([
                            _h(React.Fragment, { key: "t" }, _dsCardTitulo("Ranking de faltosos", "últimos 30 dias")),
                            0 === rankF.length ? _h(React.Fragment, { key: "v" }, _dsVazio("Nenhuma falta registrada")) : _h("div", { key: "l", style: { maxHeight: 420, overflowY: "auto" } },
                                rankF.slice(0, 10).map((it, i) => _h("div", { key: it.cod || it.nome || i, style: { display: "grid", gridTemplateColumns: "28px 32px minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "9px 18px", borderTop: i ? "1px solid #f3f4f6" : 0, fontSize: 13 } },
                                    _h("span", { style: { color: "#9ca3af", fontVariantNumeric: "tabular-nums" } }, i + 1 + "º"),
                                    _dsAvatar(it.nome),
                                    _h("span", { style: { minWidth: 0 } },
                                        _h("span", { style: { display: "block", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, it.nome || "Sem nome"),
                                        _h("span", { style: { display: "block", fontSize: 11.5, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, _h("span", { style: { fontFamily: DS_MONO } }, it.cod || "-"), it.loja_nome ? " · " + it.loja_nome : "")),
                                    _dsPillTom("vermelho", (it.totalFaltas || 0) + (1 === it.totalFaltas ? " falta" : " faltas")))))
                        ])),
                    // Heatmap
                    _dsSecao([
                        _h(React.Fragment, { key: "t" }, _dsCardTitulo("Faltas por dia da semana", "últimos 30 dias · até 15 lojas")),
                        0 === hmLojas.length ? _h(React.Fragment, { key: "v" }, _dsVazio("Sem dados de faltas para o mapa de calor")) : _h(React.Fragment, { key: "hm" },
                            _dsTabela(620,
                                [_dsTh("Loja", 0, { key: "l", paddingLeft: 18 })].concat(hmDias.map((dn, i) => _h("th", { key: i, style: { padding: "10px 6px", fontWeight: 600, fontSize: 12, color: "#6b7280", textAlign: "center", width: 56 } }, dn)), [_dsTh("Total", 1, { key: "t", paddingRight: 18 })]),
                                hmLojas.slice(0, 15).map((lj, i) => {
                                    const ds = Array.isArray(lj.dias) ? lj.dias : [0, 0, 0, 0, 0, 0, 0],
                                        tot = ds.reduce((a1, b1) => a1 + b1, 0),
                                        mx = Math.max(...ds, 1);
                                    return _dsTr(lj.loja_nome || i, [
                                        _h("td", { key: "l", style: { ...DS_TD, paddingLeft: 18, fontWeight: 500, whiteSpace: "nowrap" } }, lj.loja_nome || "-")
                                    ].concat(ds.map((v, j) => { const c = corHeat(v, mx); return _h("td", { key: j, style: { padding: 3 } }, _h("div", { style: { height: 30, borderRadius: 6, background: c[0], color: c[1], fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", fontVariantNumeric: "tabular-nums" } }, v || "–")); }),
                                        [_h("td", { key: "t", style: { ...DS_TD_NUM, paddingRight: 18, fontWeight: 700 } }, tot)]));
                                })),
                            _h("div", { style: { padding: "10px 18px 14px", display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#6b7280", borderTop: "1px solid #f3f4f6" } },
                                [["#f9fafb", "Nenhuma", "#e5e7eb"], ["#fffbeb", "Baixo", "#fde68a"], ["#fef2f2", "Médio", "#fecaca"], ["#fecaca", "Alto", "#fecaca"], ["#dc2626", "Crítico", "#dc2626"]].map(([bg, tx, bd]) => _h("span", { key: tx, style: { display: "inline-flex", alignItems: "center", gap: 6 } }, _h("span", { style: { width: 14, height: 10, borderRadius: 3, background: bg, border: "1px solid " + bd } }), tx))))
                    ]));
            };

            /* DISP_ABAS_V1 — Motoboys (histórico) */
            const _dispMotoboysClean = () => {
                const buscar = async () => {
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
                };
                const ml = p.motoboysList;
                const lista = ml && Array.isArray(ml.motoboys) ? ml.motoboys : [];
                const dm = (v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                const celNum = (key, v, cor, sub) => _h("td", { key, style: DS_TD_NUM },
                    _h("div", { style: { fontWeight: 700, color: v > 0 ? cor : "#d1d5db" } }, v),
                    sub ? _h("div", { style: { fontSize: 11, color: "#6b7280", fontWeight: 400 } }, sub) : null);
                return _h("div", { className: "space-y-4" },
                    _dsCabecalho("Motoboys", ml ? (ml.total || 0) + " motoboys · últimos " + (ml.periodo_dias || p.motoboysDias || 30) + " dias" : "Histórico de presença, faltas e lojas por motoboy"),
                    _dsSecao(_h("form", { onSubmit: ev => { ev.preventDefault(); buscar(); }, style: { padding: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" } },
                        _h("div", { style: { position: "relative", flex: "1 1 240px", minWidth: 200 } },
                            _h("span", { style: { position: "absolute", left: 11, top: 11, color: "#9ca3af", display: "inline-flex" } }, _dsIco("search", 16)),
                            _h("input", { type: "text", "aria-label": "Buscar por código ou nome", placeholder: "Buscar por código ou nome", value: p.motoboysBusca || "", onChange: e => x(t => ({ ...t, motoboysBusca: e.target.value })), className: DS_IN, style: { paddingLeft: 34 } })),
                        _h("select", { "aria-label": "Loja", value: p.motoboysLojaFiltro || "", onChange: e => x(t => ({ ...t, motoboysLojaFiltro: e.target.value })), style: { ...DS_BTN, maxWidth: 260 } },
                            _h("option", { value: "" }, "Todas as lojas"), (e.lojas || []).map(e => _h("option", { key: e.id, value: e.id }, e.codigo, " - ", e.nome))),
                        _h("select", { "aria-label": "Período", value: p.motoboysDias || 30, onChange: e => x(t => ({ ...t, motoboysDias: parseInt(e.target.value) })), style: DS_BTN },
                            [7, 15, 30, 60, 90].map(d => _h("option", { key: d, value: d }, "Últimos " + d + " dias"))),
                        _h("button", { type: "submit", style: DS_BTN_PRI }, _dsIco("search", 15), "Buscar"))),
                    _dsSecao([
                        _h(React.Fragment, { key: "t" }, _dsCardTitulo("Histórico de motoboys", ml ? lista.length + " na lista" : null)),
                        p.motoboysLoading ? _h(React.Fragment, { key: "c" }, _dsCarregando())
                            : !ml ? _h(React.Fragment, { key: "n" }, _dsVazio("Busque para ver o histórico", 'Use os filtros acima e clique em "Buscar".'))
                            : 0 === lista.length ? _h(React.Fragment, { key: "v" }, _dsVazio("Nenhum motoboy encontrado", "Tente outro nome, loja ou período."))
                            : _h(React.Fragment, { key: "l" }, _dsTabela(860,
                                [_dsTh("Motoboy", 0, { key: 1, paddingLeft: 18 }), _dsTh("Loja atual", 0, { key: 2 }), _dsTh("Em loja", 1, { key: 3 }), _dsTh("Faltas", 1, { key: 4 }), _dsTh("Sem contato", 1, { key: 5 }), _dsTh("Lojas onde rodou", 0, { key: 6, paddingRight: 18 })],
                                lista.map(m => _dsTr(m.cod, [
                                    _h("td", { key: 1, style: { ...DS_TD, paddingLeft: 18 } }, _h("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, _dsAvatar(m.nome),
                                        _h("div", { style: { minWidth: 0 } }, _h("div", { style: { fontWeight: 600, whiteSpace: "nowrap" } }, m.nome || "-"), _h("div", { style: { fontFamily: DS_MONO, fontSize: 11.5, color: "#6b7280" } }, m.cod)))),
                                    _h("td", { key: 2, style: DS_TD }, m.loja_atual ? _h("div", null, _h("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, _dsTag(m.loja_atual.codigo), _h("span", { style: { fontWeight: 500 } }, m.loja_atual.nome)), m.loja_atual.regiao_nome ? _h("div", { style: { fontSize: 11.5, color: "#6b7280", marginTop: 2 } }, m.loja_atual.regiao_nome) : null) : _h("span", { style: { color: "#9ca3af" } }, "Sem loja")),
                                    celNum(3, m.estatisticas.em_loja.total, DS["EM LOJA"].txt, m.estatisticas.em_loja.ultima_vez ? "últ. " + dm(m.estatisticas.em_loja.ultima_vez) : null),
                                    celNum(4, m.estatisticas.faltas.total, DS.FALTANDO.txt, m.estatisticas.faltas.ultima_falta ? "últ. " + dm(m.estatisticas.faltas.ultima_falta) : null),
                                    celNum(5, m.estatisticas.sem_contato.total, "#374151", m.estatisticas.sem_contato.max_dias_consecutivos > 0 ? "máx. " + m.estatisticas.sem_contato.max_dias_consecutivos + " dias seg." : null),
                                    _h("td", { key: 6, style: { ...DS_TD, paddingRight: 18 } }, m.lojas_rodou && m.lojas_rodou.length > 0 ? _h("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } }, m.lojas_rodou.slice(0, 3).map(lj => _h(React.Fragment, { key: lj.id }, _dsTag(lj.codigo))), m.lojas_rodou.length > 3 ? _dsTag("+" + (m.lojas_rodou.length - 3)) : null) : _h("span", { style: { color: "#9ca3af" } }, "-"))
                                ])))),
                        _h("p", { key: "f", style: { margin: 0, padding: "10px 18px 12px", fontSize: 12, color: "#6b7280", borderTop: "1px solid #f3f4f6" } }, "Em loja = vezes com status Em loja · Faltas = vezes marcado como Faltando · Sem contato = vezes sem retorno no período.")
                    ]));
            };

            /* DISP_ABAS_V1 — Restrições */
            const _dispRestricoesClean = () => {
                const cadastrar = async () => {
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
                };
                const liberar = async (e) => {
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
                };
                const lista = p.restricoesList || [];
                return _h("div", { className: "space-y-4" },
                    _dsCabecalho("Restrições", lista.length + (lista.length === 1 ? " restrição ativa" : " restrições ativas") + " · motoboys impedidos de rodar em lojas"),
                    _dsSecao([
                        _h(React.Fragment, { key: "t" }, _dsCardTitulo("Nova restrição")),
                        _h("div", { key: "f", style: { padding: 16, display: "grid", gap: 12, alignItems: "end" }, className: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-[0.8fr_1.2fr_1.2fr_1.6fr_auto]" },
                            _dsCampo("Código *", _h("input", {
                                id: "rst-cod", type: "text", placeholder: "Ex: 12345", value: p.restricaoCod || "",
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
                                className: DS_IN
                            }), "rst-cod"),
                            _dsCampo("Nome", _h("input", { id: "rst-nome", type: "text", placeholder: "Preenchido pelo código", value: p.restricaoNome || "", onChange: e => x(t => ({ ...t, restricaoNome: e.target.value })), className: DS_IN }), "rst-nome"),
                            _dsCampo("Loja *", _h("select", {
                                id: "rst-loja",
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
                                className: DS_IN
                            }, _h("option", { value: "" }, "Selecione uma loja..."), _h("option", { value: "TODAS" }, "Todas as lojas"), (e.lojas || []).map(e => _h("option", { key: e.id, value: e.id }, e.codigo, " - ", e.nome))), "rst-loja"),
                            _dsCampo("Motivo *", _h("input", { id: "rst-mot", type: "text", placeholder: "Ex: Comportamento inadequado", value: p.restricaoMotivo || "", onChange: e => x(t => ({ ...t, restricaoMotivo: e.target.value })), className: DS_IN }), "rst-mot"),
                            _h("button", { type: "button", onClick: cadastrar, className: "hover:bg-red-50", style: DS_BTN_DEST }, _dsIco("ban", 15), "Cadastrar restrição"))
                    ]),
                    _dsSecao([
                        _h(React.Fragment, { key: "t" }, _dsCardTitulo("Restrições ativas", String(lista.length))),
                        p.restricoesLoading ? _h(React.Fragment, { key: "c" }, _dsCarregando())
                            : 0 === lista.length ? _h(React.Fragment, { key: "v" }, _dsVazio("Nenhuma restrição ativa", "Motoboys restritos aparecem aqui."))
                            : _h(React.Fragment, { key: "l" }, _dsTabela(820,
                                [_dsTh("Motoboy", 0, { key: 1, paddingLeft: 18 }), _dsTh("Loja", 0, { key: 2 }), _dsTh("Motivo", 0, { key: 3 }), _dsTh("Criado por", 0, { key: 4 }), _dsTh("Data", 0, { key: 5 }), _h("th", { key: 6, style: { width: 100 } }, _h("span", { className: "sr-only" }, "Ações"))],
                                lista.map(it => _dsTr(it.id, [
                                    _h("td", { key: 1, style: { ...DS_TD, paddingLeft: 18 } }, _h("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, _dsAvatar(it.nome_profissional || it.cod_profissional),
                                        _h("div", null, _h("div", { style: { fontWeight: 600, whiteSpace: "nowrap" } }, it.nome_profissional || "-"), _h("div", { style: { fontFamily: DS_MONO, fontSize: 11.5, color: "#6b7280" } }, it.cod_profissional)))),
                                    _h("td", { key: 2, style: DS_TD }, it.todas_lojas ? _dsPillTom("vermelho", "Todas as lojas") : it.loja_nome ? _h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" } }, _dsTag(it.loja_codigo), it.loja_nome) : "-"),
                                    _h("td", { key: 3, style: { ...DS_TD, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: it.motivo }, it.motivo),
                                    _h("td", { key: 4, style: { ...DS_TD, color: "#6b7280" } }, it.criado_por || "-"),
                                    _h("td", { key: 5, style: { ...DS_TD, color: "#6b7280", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } }, new Date(it.created_at).toLocaleDateString("pt-BR")),
                                    _h("td", { key: 6, style: { ...DS_TD, textAlign: "right", paddingRight: 18 } }, _h("button", { type: "button", onClick: () => liberar(it), title: "Remover a restrição", className: "hover:bg-gray-50", style: DS_BTN_SM }, _dsIco("check", 14), "Liberar"))
                                ]))))
                    ]));
            };

            /* DISP_ABAS_V1 — Config (link público, regiões, lojas e quantidades) */
            const _dispConfigClean = () => {
                const linkPub = `${API_URL}/disponibilidade/publico`;
                const removerRegiao = (async (e, t) => {
                    if (window.confirm(`Remover região "${t}" e todas suas lojas?`)) try {
                        await _fetch(`${API_URL}/disponibilidade/regioes/${e}`, {
                            method: "DELETE"
                        }), ja(`Região "${t}" removida!`, "success"), r()
                    } catch (e) {
                        ja("Erro ao remover região", "error")
                    }
                });
                const salvarGestores = async (t, a) => {
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
                };
                const adicionarLoja = async () => {
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
                };
                const salvarLoja = async (t) => {
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
                };
                const removerLoja = (async (lojaId, lojaNome) => {
                    if (!window.confirm(`Remover loja "${lojaNome}"?`)) return;
                    // Optimistic: guarda loja + linhas pra rollback, remove tudo do estado local.
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
                });
                const limparLinhas = async () => {
                    if (window.confirm("Limpar TODAS as linhas? (mantém a estrutura de regiões e lojas)")) try {
                        await _fetch(`${API_URL}/disponibilidade/limpar-linhas`, {
                            method: "DELETE"
                        }), ja("Todas as linhas foram resetadas!", "success"), r()
                    } catch (e) {
                        ja("Erro ao limpar linhas", "error")
                    }
                };
                const regioes = e.regioes || [];
                const qtdBadge = (n, tom, titulo, onClick) => _h("button", { type: "button", onClick, title: titulo, className: "hover:opacity-80", style: { border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 99, padding: "2px 10px", fontWeight: 600, fontSize: 12, background: _dsTom[tom][0], color: _dsTom[tom][1], fontVariantNumeric: "tabular-nums", fontFamily: "inherit" } }, _dsDot(_dsTom[tom][2]), n);
                const toggleVer = (lojaId, tipo) => x({
                    ...p,
                    verLinhas: (p.verLinhas && p.verLinhas.lojaId === lojaId && p.verLinhas.tipo === tipo)
                        ? null
                        : { lojaId, tipo }
                });
                return _h("div", { className: "space-y-4" },
                    _dsCabecalho("Configuração", regioes.length + (regioes.length === 1 ? " região" : " regiões") + " · " + (e.lojas || []).length + " lojas · " + (e.linhas || []).length + " linhas"),
                    // Link público
                    _dsSecao([
                        _h(React.Fragment, { key: "t" }, _dsCardTitulo("Link público", "somente leitura")),
                        _h("div", { key: "c", style: { padding: 16 } },
                            _h("p", { style: { margin: "0 0 10px", fontSize: 13, color: "#6b7280" } }, "Compartilhe com gestores para ver o panorama em tempo real, sem login. A página atualiza a cada 2 minutos."),
                            _h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
                                _h("input", { type: "text", readOnly: !0, "aria-label": "Link público", value: linkPub, className: DS_IN, style: { flex: "1 1 280px", width: "auto", fontFamily: DS_MONO, fontSize: 12, background: "#f9fafb" } }),
                                _h("button", { type: "button", onClick: () => { navigator.clipboard.writeText(linkPub), ja("Link copiado!", "success") }, className: "hover:bg-gray-50", style: { ...DS_BTN, fontWeight: 600 } }, _dsIco("copy", 15), "Copiar link"),
                                _h("button", { type: "button", onClick: () => window.open(linkPub, "_blank"), className: "hover:bg-gray-50", style: { ...DS_BTN, fontWeight: 600 } }, _dsIco("link", 15), "Abrir")))
                    ]),
                    _h("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4" },
                        // Regiões
                        _dsSecao([
                            _h(React.Fragment, { key: "t" }, _dsCardTitulo("Regiões", String(regioes.length))),
                            _h("div", { key: "f", style: { padding: 16, display: "flex", gap: 8, alignItems: "flex-end" } },
                                _h("div", { style: { flex: 1 } }, _dsCampo("Nova região", _h("input", { id: "cfg-reg", type: "text", placeholder: "Ex: GOIÂNIA", value: p.novaRegiao || "", onChange: e => x({ ...p, novaRegiao: e.target.value.toUpperCase() }), onKeyPress: e => "Enter" === e.key && o(), className: DS_IN }), "cfg-reg")),
                                _h("button", { type: "button", onClick: o, style: DS_BTN_PRI }, _dsIco("plus", 15), "Adicionar")),
                            0 === regioes.length ? _h(React.Fragment, { key: "v" }, _dsVazio("Nenhuma região cadastrada", "Adicione a primeira região acima.")) :
                                _h("div", { key: "l" }, regioes.map(t => _h("div", { key: t.id, style: { display: "grid", gridTemplateColumns: "minmax(110px, 0.8fr) minmax(0, 1.4fr) 32px", gap: 10, alignItems: "center", padding: "8px 16px", borderTop: "1px solid #f3f4f6" } },
                                    _h("b", { style: { fontWeight: 600, fontSize: 13, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, t.nome),
                                    _h("input", { type: "text", "aria-label": "Gestores de " + t.nome, placeholder: "Gestores (ex: LIS / LEO)", value: t.gestores || "", onChange: a => salvarGestores(t, a), className: DS_IN, style: { height: 34 } }),
                                    _h("button", { type: "button", onClick: () => removerRegiao(t.id, t.nome), title: "Remover região", "aria-label": "Remover região " + t.nome, className: "hover:bg-red-50", style: DS_ICOBTN_DEST }, _dsIco("trash", 14)))))
                        ]),
                        // Adicionar loja
                        _dsSecao([
                            _h(React.Fragment, { key: "t" }, _dsCardTitulo("Adicionar loja")),
                            _h("div", { key: "f", style: { padding: 16, display: "grid", gap: 12 }, className: "grid-cols-1 sm:grid-cols-2" },
                                _dsCampo("Região *", _h("select", { id: "cfg-lreg", value: p.novaLojaRegiaoId || "", onChange: e => x({ ...p, novaLojaRegiaoId: e.target.value }), className: DS_IN }, _h("option", { value: "" }, "Selecione a região"), regioes.map(e => _h("option", { key: e.id, value: e.id }, e.nome))), "cfg-lreg"),
                                _dsCampo("Código *", _h("input", { id: "cfg-lcod", type: "text", placeholder: "Ex: 249", value: p.novaCodLoja || "", onChange: e => x({ ...p, novaCodLoja: e.target.value }), className: DS_IN }), "cfg-lcod"),
                                _h("div", { className: "sm:col-span-2" }, _dsCampo("Nome da loja *", _h("input", { id: "cfg-lnome", type: "text", placeholder: "Nome da loja", value: p.novaNomeLoja || "", onChange: e => x({ ...p, novaNomeLoja: e.target.value.toUpperCase() }), className: DS_IN }), "cfg-lnome")),
                                _dsCampo("Titulares", _h("input", { id: "cfg-ltit", type: "number", min: "0", placeholder: "0", value: p.novaQtdTitulares || "", onChange: e => x({ ...p, novaQtdTitulares: e.target.value }), title: "Quantidade de linhas titulares", className: DS_IN }), "cfg-ltit"),
                                _dsCampo("Excedentes", _h("input", { id: "cfg-lexc", type: "number", min: "0", placeholder: "0", value: p.novaQtdExcedentes || "", onChange: e => x({ ...p, novaQtdExcedentes: e.target.value }), title: "Quantidade de linhas excedentes", className: DS_IN }), "cfg-lexc"),
                                _h("div", { className: "sm:col-span-2", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } },
                                    _h("span", { style: { fontSize: 12, color: "#6b7280" } }, "Titulares = linhas principais · Excedentes = linhas extras"),
                                    _h("button", { type: "button", onClick: adicionarLoja, style: DS_BTN_PRI }, _dsIco("plus", 15), "Adicionar loja")))
                        ])),
                    // Lojas por região
                    regioes.map(t => {
                        const a = (e.lojas || []).filter(e => e.regiao_id === t.id);
                        return 0 === a.length ? null : _h("section", { key: t.id, style: { ...DS_CARD, overflow: "hidden" } },
                            _dsCardTitulo(t.nome, (t.gestores ? t.gestores + " · " : "") + a.length + (a.length === 1 ? " loja" : " lojas")),
                            _dsTabela(720,
                                [_dsTh("Código", 0, { key: 1, paddingLeft: 18, width: 110 }), _dsTh("Nome da loja", 0, { key: 2 }), _dsTh("Titulares", 1, { key: 3 }), _dsTh("Excedentes", 1, { key: 4 }), _dsTh("Total", 1, { key: 5 }), _dsTh("Ações", 1, { key: 6, paddingRight: 18 })],
                                a.map(t => {
                                    const a = (e.linhas || []).filter(e => e.loja_id === t.id),
                                        l = a.filter(e => !e.is_excedente).length,
                                        o = a.filter(e => e.is_excedente).length,
                                        c = p.editandoLoja === t.id;
                                    return _dsTr(t.id, [
                                        _h("td", { key: 1, style: { ...DS_TD, paddingLeft: 18 } }, c ? _h("input", { type: "text", "aria-label": "Código da loja", value: p.editLojaCodigo || "", onChange: e => x({ ...p, editLojaCodigo: e.target.value }), className: DS_IN, style: { width: 84, height: 32 } }) : _h("span", { style: { fontFamily: DS_MONO, fontSize: 12, color: "#5d0b85", fontWeight: 700 } }, t.codigo)),
                                        _h("td", { key: 2, style: DS_TD }, c ? _h("input", { type: "text", "aria-label": "Nome da loja", value: p.editLojaNome || "", onChange: e => x({ ...p, editLojaNome: e.target.value.toUpperCase() }), className: DS_IN, style: { height: 32 } }) : _h("span", { style: { fontWeight: 500 } }, t.nome)),
                                        _h("td", { key: 3, style: DS_TD_NUM },
                                            // Badge clicável: abre modal com as linhas desse tipo para remoção individual
                                            qtdBadge(l, "azul", "Gerenciar titulares", () => toggleVer(t.id, "titular")),
                                            p.verLinhas && p.verLinhas.lojaId === t.id && p.verLinhas.tipo === 'titular' &&
                                                renderPopoverLinhas(a.filter(e => !e.is_excedente), 'Titulares', () => x({ ...p, verLinhas: null }), s, r, ja, t.nome)),
                                        _h("td", { key: 4, style: DS_TD_NUM },
                                            qtdBadge(o, "ambar", "Gerenciar excedentes", () => toggleVer(t.id, "excedente")),
                                            p.verLinhas && p.verLinhas.lojaId === t.id && p.verLinhas.tipo === 'excedente' &&
                                                renderPopoverLinhas(a.filter(e => e.is_excedente), 'Excedentes', () => x({ ...p, verLinhas: null }), s, r, ja, t.nome)),
                                        _h("td", { key: 5, style: { ...DS_TD_NUM, fontWeight: 700 } }, a.length),
                                        _h("td", { key: 6, style: { ...DS_TD, paddingRight: 18 } }, _h("div", { style: { display: "flex", gap: 6, justifyContent: "flex-end" } },
                                            c ? [
                                                _h("button", { key: "s", type: "button", onClick: () => salvarLoja(t), title: "Salvar", "aria-label": "Salvar loja", className: "hover:bg-gray-50", style: { ...DS_ICOBTN, color: "#166534" } }, _dsIco("check", 15)),
                                                _h("button", { key: "c", type: "button", onClick: () => x({ ...p, editandoLoja: null }), title: "Cancelar edição", "aria-label": "Cancelar edição", className: "hover:bg-gray-50", style: DS_ICOBTN }, _dsIco("x", 15))
                                            ] : [
                                                _h("button", { key: "e", type: "button", onClick: () => x({ ...p, editandoLoja: t.id, editLojaCodigo: t.codigo, editLojaNome: t.nome }), title: "Editar loja", "aria-label": "Editar loja", className: "hover:bg-gray-50", style: DS_ICOBTN }, _dsIco("pencil", 14)),
                                                _h("button", { key: "t", type: "button", onClick: () => s(t.id, 1, !1), title: "Adicionar titular", className: "hover:bg-gray-50", style: { ...DS_BTN_SM, height: 32, padding: "0 9px" } }, "+ Titular"),
                                                _h("button", { key: "x", type: "button", onClick: () => s(t.id, 1, !0), title: "Adicionar excedente", className: "hover:bg-gray-50", style: { ...DS_BTN_SM, height: 32, padding: "0 9px" } }, "+ Excedente"),
                                                _h("button", { key: "r", type: "button", onClick: () => removerLoja(t.id, t.nome), title: "Remover loja", "aria-label": "Remover loja", className: "hover:bg-red-50", style: DS_ICOBTN_DEST }, _dsIco("trash", 14))
                                            ]))
                                    ]);
                                })));
                    }),
                    // Zona de risco
                    (e.linhas || []).length > 0 && _dsSecao(_h("div", { style: { padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" } },
                        _h("div", null,
                            _h("h2", { style: { margin: 0, fontSize: 15, fontWeight: 600, color: "#111827" } }, "Limpar todas as linhas"),
                            _h("p", { style: { margin: "4px 0 0", fontSize: 13, color: "#6b7280" } }, "Reseta todos os entregadores e mantém a estrutura de regiões e lojas.")),
                        _h("button", { type: "button", onClick: limparLinhas, className: "hover:bg-red-50", style: DS_BTN_DEST }, _dsIco("trash", 15), "Limpar linhas"))));
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
            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-settings" })), "Config")))), "panorama" === t && _dispPanoramaClean(), "relatorios" === t && _dispRelatoriosClean(), "motoboys" === t && _dispMotoboysClean(), "restricoes" === t && _dispRestricoesClean(), "config" === t && _dispConfigClean(), "principal" === t && _dispPainelClean(), "faltosos" === t && _dispFaltososClean(), "espelho" === t && _dispEspelhoClean() /* DISP_ABAS_V1 */)

    };

    window.ModuloDisponibilidadeLoaded = true;
    console.log("✅ Módulo Disponibilidade carregado!");

})();
