// ==================== MÓDULO CONFIG ====================
// Arquivo: modulo-config.js
// Carregado dinamicamente quando usuário acessa Configurações
// VERSÃO CORRIGIDA - Sistema de permissões de abas restaurado

(function() {
    'use strict';

    // ==================== VIEW: CONTAS BLOQUEADAS ====================
    // Sub-aba de Usuários — lista contas bloqueadas por múltiplas tentativas
    // de login falhas. Permite desbloquear e abrir o modal de alteração de senha.
    function ContasBloqueadasView(props) {
        var API_URL = props.API_URL;
        var fetchAuth = props.fetchAuth;
        var showToast = props.showToast;
        var estado = props.estado;
        var setEstado = props.setEstado;

        var listaState = React.useState([]);
        var lista = listaState[0], setLista = listaState[1];
        var loadingState = React.useState(true);
        var loading = loadingState[0], setLoading = loadingState[1];
        var erroState = React.useState("");
        var erro = erroState[0], setErro = erroState[1];
        var processandoState = React.useState(null); // cod_profissional em processamento
        var processando = processandoState[0], setProcessando = processandoState[1];

        // Ref com valores mais recentes (padrão do projeto: evita closures velhas
        // e mantém o useCallback com deps vazias)
        var refs = React.useRef({});
        refs.current = { API_URL: API_URL, fetchAuth: fetchAuth, showToast: showToast };

        var carregar = React.useCallback(function() {
            var r = refs.current;
            setLoading(true);
            setErro("");
            r.fetchAuth(r.API_URL + "/users/blocked-accounts")
                .then(function(resp) {
                    if (!resp.ok) throw new Error("HTTP " + resp.status);
                    return resp.json();
                })
                .then(function(data) {
                    setLista(Array.isArray(data) ? data : []);
                    setLoading(false);
                })
                .catch(function() {
                    setErro("Não foi possível carregar as contas bloqueadas.");
                    setLoading(false);
                });
        }, []);

        React.useEffect(function() { carregar(); }, [carregar]);

        var desbloquear = function(cod, nome) {
            if (!cod) return;
            if (!confirm("🔓 Desbloquear a conta de " + (nome || cod) + "?\n\nO bloqueio e as tentativas de login registradas serão removidos.")) return;
            setProcessando(cod);
            fetchAuth(API_URL + "/users/unblock-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ codProfissional: cod })
            })
                .then(function(resp) {
                    return resp.json().then(function(d) { return { ok: resp.ok, data: d }; });
                })
                .then(function(res) {
                    setProcessando(null);
                    if (res.ok) {
                        showToast("🔓 Conta de " + (nome || cod) + " desbloqueada!", "success");
                        carregar();
                    } else {
                        showToast("❌ " + (res.data.error || "Erro ao desbloquear"), "error");
                    }
                })
                .catch(function() {
                    setProcessando(null);
                    showToast("❌ Erro de conexão ao desbloquear", "error");
                });
        };

        // Abre o modal de alteração de senha já existente no ModuloConfigComponent
        var abrirModalSenha = function(row) {
            setEstado({
                ...estado,
                senhaModal: true,
                senhaModalUser: {
                    cod_profissional: row.cod_profissional,
                    full_name: row.full_name || row.cod_profissional
                },
                senhaModalValue: "", senhaModalConfirm: "", senhaModalShow: false, senhaModalErro: ""
            });
        };

        var formatarData = function(iso) {
            if (!iso) return "—";
            try {
                return new Date(iso).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                });
            } catch (e) { return "—"; }
        };

        var ativos = lista.filter(function(x) { return x.ativo; });
        var expirados = lista.filter(function(x) { return !x.ativo; });

        return React.createElement("div", { className: "bg-white rounded-xl shadow-sm border p-6" },
            // Header
            React.createElement("div", { className: "flex items-center justify-between mb-1 flex-wrap gap-3" },
                React.createElement("h2", { className: "text-lg font-bold flex items-center gap-2" },
                    React.createElement("span", null, "🔒"),
                    "Contas Bloqueadas (", ativos.length, ")"
                ),
                React.createElement("button", {
                    onClick: carregar,
                    disabled: loading,
                    className: "px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                }, loading ? "⏳ Carregando..." : "🔄 Atualizar")
            ),
            React.createElement("p", { className: "text-sm text-gray-500 mb-4" },
                "Contas bloqueadas automaticamente após muitas tentativas de login falhas. Use \"Desbloquear\" para liberar o acesso e \"Senha\" caso o usuário tenha esquecido a senha."
            ),

            // Erro
            erro && React.createElement("div", {
                className: "bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4"
            }, "⚠️ " + erro),

            // Loading
            loading && React.createElement("div", { className: "text-center py-10 text-gray-400" },
                React.createElement("span", { className: "text-3xl block mb-2" }, "⏳"),
                "Carregando contas bloqueadas..."
            ),

            // Vazio
            !loading && !erro && lista.length === 0 && React.createElement("div", { className: "text-center py-10 text-gray-500" },
                React.createElement("span", { className: "text-4xl block mb-2" }, "✅"),
                "Nenhuma conta bloqueada no momento."
            ),

            // Bloqueios ATIVOS
            !loading && ativos.length > 0 && React.createElement("div", { className: "space-y-3" },
                ativos.map(function(row) {
                    var emProcesso = processando === row.cod_profissional;
                    return React.createElement("div", {
                        key: "ativo-" + row.id,
                        className: "border border-red-200 bg-red-50/50 rounded-lg p-4"
                    },
                        React.createElement("div", { className: "flex items-start justify-between flex-wrap gap-3" },
                            React.createElement("div", { className: "flex items-center gap-3" },
                                React.createElement("div", {
                                    className: "w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white text-lg flex-shrink-0"
                                }, "🔒"),
                                React.createElement("div", null,
                                    React.createElement("p", { className: "font-semibold" },
                                        row.full_name || "(usuário não encontrado)"),
                                    React.createElement("p", { className: "text-sm text-gray-500" },
                                        "COD: ", row.cod_profissional),
                                    React.createElement("div", { className: "flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600" },
                                        React.createElement("span", null, "🚫 ", row.attempts_count || 0, " tentativas"),
                                        React.createElement("span", null, "⏱️ Libera em ", row.minutos_restantes, " min"),
                                        React.createElement("span", null, "📅 Bloqueada até ", formatarData(row.blocked_until))
                                    )
                                )
                            ),
                            React.createElement("div", { className: "flex gap-2 flex-shrink-0" },
                                React.createElement("button", {
                                    onClick: function() { abrirModalSenha(row); },
                                    className: "px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                                }, "🔑 Senha"),
                                React.createElement("button", {
                                    onClick: function() { desbloquear(row.cod_profissional, row.full_name); },
                                    disabled: emProcesso,
                                    className: "px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                                }, emProcesso ? "⏳..." : "🔓 Desbloquear")
                            )
                        )
                    );
                })
            ),

            // Bloqueios EXPIRADOS (registro residual — já liberados pelo tempo)
            !loading && expirados.length > 0 && React.createElement("div", { className: "mt-6" },
                React.createElement("p", { className: "text-sm font-semibold text-gray-500 mb-2" },
                    "Bloqueios expirados (", expirados.length, ") — já liberados pelo tempo, registro residual"
                ),
                React.createElement("div", { className: "space-y-2" },
                    expirados.map(function(row) {
                        var emProcesso = processando === row.cod_profissional;
                        return React.createElement("div", {
                            key: "exp-" + row.id,
                            className: "border rounded-lg p-3 flex items-center justify-between gap-3 opacity-70"
                        },
                            React.createElement("div", null,
                                React.createElement("p", { className: "font-medium text-sm" },
                                    row.full_name || "(usuário não encontrado)",
                                    React.createElement("span", { className: "text-gray-400" },
                                        " • COD: ", row.cod_profissional)
                                ),
                                React.createElement("p", { className: "text-xs text-gray-400" },
                                    "Expirou em ", formatarData(row.blocked_until))
                            ),
                            React.createElement("button", {
                                onClick: function() { desbloquear(row.cod_profissional, row.full_name); },
                                disabled: emProcesso,
                                className: "px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition-colors disabled:opacity-50"
                            }, emProcesso ? "⏳..." : "🧹 Limpar registro")
                        );
                    })
                )
            )
        );
    }

    // ==================== VIEW: LISTA DE USUÁRIOS ====================
    // Sub-aba "Usuários" — grid de cards (4 por linha), contas com foto
    // primeiro, busca, filtro por tipo e paginação (40 por página).
    function ListaUsuariosView(props) {
        var usuarios = props.usuarios || [];
        var estado = props.estado;
        var setEstado = props.setEstado;
        var API_URL = props.API_URL;
        var fetchAuth = props.fetchAuth;
        var showToast = props.showToast;
        var recarregar = props.recarregar;

        var POR_PAGINA = 40;

        var buscaState = React.useState("");
        var busca = buscaState[0], setBusca = buscaState[1];
        var filtroState = React.useState("todos");
        var filtroTipo = filtroState[0], setFiltroTipo = filtroState[1];
        var paginaState = React.useState(1);
        var pagina = paginaState[0], setPagina = paginaState[1];

        // Helpers de campo (tolera camelCase e snake_case)
        var getNome = function(u) { return u.fullName || u.full_name || ""; };
        var getCod = function(u) { return u.codProfissional || u.cod_profissional || ""; };
        var temFoto = function(u) { return !!u.foto; };

        var ROLE = {
            admin_master:     { txt: "👑 Master",     bar: "bg-purple-600", ring: "ring-purple-200", badge: "bg-purple-100 text-purple-700" },
            admin:            { txt: "👑 Admin",      bar: "bg-blue-600",   ring: "ring-blue-200",   badge: "bg-blue-100 text-blue-700" },
            admin_financeiro: { txt: "💰 Financeiro", bar: "bg-green-600",  ring: "ring-green-200",  badge: "bg-green-100 text-green-700" },
            user:             { txt: "👤 Usuário",    bar: "bg-gray-400",   ring: "ring-gray-200",   badge: "bg-gray-100 text-gray-600" }
        };
        var roleInfo = function(r) { return ROLE[r] || ROLE.user; };

        // Contagens por tipo (sobre o total)
        var cont = { admin_master: 0, admin: 0, admin_financeiro: 0, user: 0, comFoto: 0 };
        usuarios.forEach(function(u) {
            if (cont[u.role] !== undefined) { cont[u.role]++; } else { cont.user++; }
            if (temFoto(u)) cont.comFoto++;
        });

        // Filtragem
        var buscaNorm = busca.toLowerCase().trim();
        var filtrados = usuarios.filter(function(u) {
            if (filtroTipo !== "todos" && u.role !== filtroTipo) return false;
            if (!buscaNorm) return true;
            return getNome(u).toLowerCase().indexOf(buscaNorm) !== -1 ||
                   String(getCod(u)).toLowerCase().indexOf(buscaNorm) !== -1;
        });

        // Ordenação: com foto primeiro, depois por nome
        var ordenados = filtrados.slice().sort(function(a, b) {
            var fa = temFoto(a) ? 0 : 1, fb = temFoto(b) ? 0 : 1;
            if (fa !== fb) return fa - fb;
            return getNome(a).localeCompare(getNome(b), "pt-BR");
        });

        // Paginação
        var totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA));
        var paginaAtual = Math.min(pagina, totalPaginas);
        var inicio = (paginaAtual - 1) * POR_PAGINA;
        var paginaItens = ordenados.slice(inicio, inicio + POR_PAGINA);

        var resetPagina = function() { setPagina(1); };

        // ---- Ações ----
        var abrirSenha = function(user) {
            setEstado({
                ...estado,
                senhaModal: true, senhaModalUser: user,
                senhaModalValue: "", senhaModalConfirm: "", senhaModalShow: false, senhaModalErro: ""
            });
        };

        var excluir = function(user) {
            var cod = getCod(user);
            if (cod && typeof cod === "string") cod = cod.replace("#", "");
            if (!cod) { showToast("❌ Código do usuário não encontrado", "error"); return; }
            if (!confirm("⚠️ Excluir " + getNome(user) + "?\n\nEsta ação não pode ser desfeita!")) return;
            fetchAuth(API_URL + "/users/" + cod, { method: "DELETE" })
                .then(function(resp) {
                    if (resp.ok) {
                        showToast("🗑️ Usuário excluído!", "success");
                        if (recarregar) recarregar();
                    } else {
                        resp.json().catch(function() { return {}; }).then(function(e) {
                            showToast("❌ Erro: " + (e.error || resp.statusText), "error");
                        });
                    }
                })
                .catch(function() { showToast("❌ Erro ao excluir", "error"); });
        };

        // ---- Card de usuário ----
        function cardUsuario(user) {
            var r = roleInfo(user.role);
            var nome = getNome(user);
            var cod = getCod(user);
            var avatar = temFoto(user)
                ? React.createElement("img", {
                    src: user.foto, alt: nome,
                    className: "w-16 h-16 rounded-full object-cover ring-4 " + r.ring
                })
                : React.createElement("div", {
                    className: "w-16 h-16 rounded-full ring-4 " + r.ring + " " + r.bar +
                        " flex items-center justify-center text-white text-2xl font-bold",
                }, nome ? nome.charAt(0).toUpperCase() : "?");

            return React.createElement("div", {
                key: cod,
                className: "relative border rounded-2xl p-5 flex flex-col items-center text-center " +
                    "bg-white hover:shadow-md hover:border-purple-200 transition-all"
            },
                React.createElement("div", { className: "absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl " + r.bar }),
                avatar,
                React.createElement("p", {
                    className: "font-bold text-sm mt-3 leading-tight h-9 flex items-center justify-center",
                    title: nome
                }, nome),
                React.createElement("p", { className: "text-xs text-gray-400 mb-2" }, "COD: ", cod),
                React.createElement("span", { className: "text-xs font-semibold px-2.5 py-0.5 rounded-full mb-4 " + r.badge }, r.txt),
                React.createElement("div", { className: "flex gap-2 w-full mt-auto" },
                    React.createElement("button", {
                        onClick: function() { abrirSenha(user); },
                        className: "flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    }, "🔑 Senha"),
                    user.role !== "admin_master" && React.createElement("button", {
                        onClick: function() { excluir(user); },
                        className: "px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                    }, "🗑️")
                )
            );
        }

        // ---- Render dos cards com divisores de seção (com foto / sem foto) ----
        function renderCards() {
            if (paginaItens.length === 0) {
                return React.createElement("div", { className: "text-center py-12 text-gray-500" },
                    React.createElement("span", { className: "text-4xl block mb-2" }, "🔍"),
                    (buscaNorm || filtroTipo !== "todos")
                        ? "Nenhum usuário encontrado com esses filtros"
                        : "Nenhum usuário cadastrado"
                );
            }
            var blocos = [];
            var grupoAtual = null;
            var gridAtual = [];
            var flush = function() {
                if (gridAtual.length > 0) {
                    blocos.push(React.createElement("div", {
                        key: "grid-" + blocos.length,
                        className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    }, gridAtual));
                    gridAtual = [];
                }
            };
            paginaItens.forEach(function(u) {
                var g = temFoto(u) ? "foto" : "sem";
                if (g !== grupoAtual) {
                    flush();
                    grupoAtual = g;
                    blocos.push(React.createElement("div", {
                        key: "sep-" + blocos.length,
                        className: "flex items-center gap-2 mt-2 mb-1"
                    },
                        React.createElement("span", { className: "text-sm font-bold text-gray-700" },
                            g === "foto" ? "📷 Com foto" : "👤 Sem foto"),
                        React.createElement("div", { className: "flex-1 h-px bg-gray-100" })
                    ));
                }
                gridAtual.push(cardUsuario(u));
            });
            flush();
            return React.createElement("div", { className: "space-y-3" }, blocos);
        }

        // ---- Controles de paginação ----
        function renderPaginacao() {
            if (totalPaginas <= 1) return null;
            return React.createElement("div", { className: "flex items-center justify-center gap-2 mt-6 flex-wrap" },
                React.createElement("button", {
                    onClick: function() { setPagina(Math.max(1, paginaAtual - 1)); },
                    disabled: paginaAtual <= 1,
                    className: "px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                }, "← Anterior"),
                React.createElement("span", { className: "text-sm text-gray-600 px-2" },
                    "Página ", paginaAtual, " de ", totalPaginas),
                React.createElement("button", {
                    onClick: function() { setPagina(Math.min(totalPaginas, paginaAtual + 1)); },
                    disabled: paginaAtual >= totalPaginas,
                    className: "px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                }, "Próxima →")
            );
        }

        function chip(cls, label) {
            return React.createElement("span", { className: "px-3 py-1 rounded-full font-medium " + cls }, label);
        }

        return React.createElement("div", { className: "bg-white rounded-xl shadow-sm border p-6" },
            // Toolbar
            React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-3 mb-4" },
                React.createElement("h2", { className: "text-lg font-bold flex items-center gap-2" },
                    React.createElement("span", null, "📋"), "Usuários Cadastrados",
                    React.createElement("span", { className: "bg-purple-100 text-purple-700 text-sm font-semibold px-2.5 py-0.5 rounded-full" },
                        usuarios.length)
                ),
                React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                    React.createElement("div", { className: "relative" },
                        React.createElement("input", {
                            type: "text", value: busca,
                            onChange: function(e) { setBusca(e.target.value); resetPagina(); },
                            placeholder: "Buscar por nome ou código...",
                            className: "w-64 pl-10 pr-8 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        }),
                        React.createElement("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }, "🔍"),
                        busca && React.createElement("button", {
                            onClick: function() { setBusca(""); resetPagina(); },
                            className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        }, "✕")
                    ),
                    React.createElement("select", {
                        value: filtroTipo,
                        onChange: function(e) { setFiltroTipo(e.target.value); resetPagina(); },
                        className: "border rounded-lg text-sm px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500"
                    },
                        React.createElement("option", { value: "todos" }, "Todos os tipos"),
                        React.createElement("option", { value: "admin_master" }, "👑 Master"),
                        React.createElement("option", { value: "admin" }, "👑 Admin"),
                        React.createElement("option", { value: "admin_financeiro" }, "💰 Financeiro"),
                        React.createElement("option", { value: "user" }, "👤 Usuário")
                    )
                )
            ),
            // Chips de resumo
            React.createElement("div", { className: "flex flex-wrap gap-2 mb-5 text-xs" },
                chip("bg-purple-50 text-purple-700", "👑 " + cont.admin_master + " Master"),
                chip("bg-blue-50 text-blue-700", "👑 " + cont.admin + " Admin"),
                chip("bg-green-50 text-green-700", "💰 " + cont.admin_financeiro + " Financeiro"),
                chip("bg-gray-100 text-gray-600", "👤 " + cont.user + " Usuários"),
                chip("bg-amber-50 text-amber-700", "📷 " + cont.comFoto + " com foto")
            ),
            // Info de resultado filtrado
            (buscaNorm || filtroTipo !== "todos") && React.createElement("p", { className: "text-sm text-gray-500 mb-3" },
                "Mostrando ", ordenados.length, " de ", usuarios.length, " usuários"),
            // Grid de cards
            renderCards(),
            // Paginação
            renderPaginacao()
        );
    }

    // ==================== VIEW: PERMISSÕES ADM ====================
    // Redesign da aba Permissões: cards de admin com barra de progresso,
    // busca, e modal "Replicar permissões" (copia módulos + abas de um
    // admin para vários de uma vez, gravando direto no banco).
    function PermissoesADMView(props) {
        var usuarios = props.usuarios || [];
        var API_URL = props.API_URL;
        var fetchAuth = props.fetchAuth;
        var showToast = props.showToast;
        var setLoading = props.setLoading;
        var usuarioLogado = props.usuario || {};
        var recarregar = props.recarregar;
        var ehMaster = usuarioLogado.role === "admin_master";
        var MODULOS = props.SISTEMA_MODULOS_CONFIG || [];
        var TOTAL = MODULOS.length;

        var admins = usuarios.filter(function(u) {
            return u.role === "admin" || u.role === "admin_financeiro";
        });

        var sPerms   = React.useState({});    var perms = sPerms[0],   setPerms = sPerms[1];
        var sBusca   = React.useState("");    var busca = sBusca[0],   setBusca = sBusca[1];
        var sExp     = React.useState(null);  var exp = sExp[0],       setExp = sExp[1];
        var sExpMod  = React.useState(null);  var expMod = sExpMod[0], setExpMod = sExpMod[1];
        var sModal   = React.useState(false); var modalOpen = sModal[0], setModalOpen = sModal[1];
        var sOrigem  = React.useState("");    var origem = sOrigem[0], setOrigem = sOrigem[1];
        var sAlvos   = React.useState({});    var alvos = sAlvos[0],   setAlvos = sAlvos[1];
        var sBusy    = React.useState(false); var busy = sBusy[0],     setBusy = sBusy[1];

        // --- Normaliza resposta da API ---
        function normalizar(lista) {
            var obj = {};
            lista.forEach(function(adm) {
                var mods = Array.isArray(adm.allowed_modules) ? adm.allowed_modules : [];
                var tabs = (adm.allowed_tabs && typeof adm.allowed_tabs === "object") ? adm.allowed_tabs : {};
                var modulosObj = {};
                MODULOS.forEach(function(m) {
                    modulosObj[m.id] = mods.length === 0 ? true : mods.includes(m.id);
                });
                obj[adm.cod_profissional] = { modulos: modulosObj, abas: tabs };
            });
            return obj;
        }

        // --- Carregar permissões (mount + botão atualizar) ---
        function carregar(comToast) {
            setLoading(true);
            fetchAuth(API_URL + "/admin-permissions")
                .then(function(res) { return res.ok ? res.json() : Promise.reject(); })
                .then(function(data) {
                    setPerms(normalizar(data));
                    if (comToast) showToast("✅ Atualizado!", "success");
                })
                .catch(function() { showToast("❌ Erro ao carregar permissões", "error"); })
                .finally(function() { setLoading(false); });
        }
        React.useEffect(function() { carregar(false); }, []);

        // --- Monta payload do PATCH a partir de um objeto de perms ---
        function payloadDe(cod, fonte) {
            var pr = (fonte && fonte[cod]) ? fonte[cod] : { modulos: {}, abas: {} };
            var allowedModules = [];
            MODULOS.forEach(function(m) {
                if (pr.modulos && pr.modulos[m.id] === true) allowedModules.push(m.id);
            });
            return { allowed_modules: allowedModules, allowed_tabs: pr.abas || {} };
        }
        function patchAdmin(cod, fonte) {
            return fetchAuth(API_URL + "/admin-permissions/" + encodeURIComponent(cod), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadDe(cod, fonte))
            }).then(function(res) { return res.ok; }).catch(function() { return false; });
        }

        // --- Salvar todos ---
        function salvarTodos() {
            setLoading(true);
            var lista = admins.filter(function(a) { return perms[a.codProfissional]; });
            Promise.all(lista.map(function(a) { return patchAdmin(a.codProfissional, perms); }))
                .then(function(rs) {
                    var ok = rs.filter(Boolean).length;
                    showToast(ok > 0 ? ("✅ " + ok + " admin(s) salvos!") : "⚠️ Nada para salvar",
                              ok > 0 ? "success" : "warning");
                })
                .finally(function() { setLoading(false); });
        }

        // --- Toggles ---
        function mutar(fn) {
            var novo = JSON.parse(JSON.stringify(perms));
            fn(novo);
            setPerms(novo);
        }
        function garante(obj, cod) {
            if (!obj[cod]) obj[cod] = { modulos: {}, abas: {} };
            if (!obj[cod].modulos) obj[cod].modulos = {};
            if (!obj[cod].abas) obj[cod].abas = {};
        }
        function toggleModulo(cod, modId, atual) {
            mutar(function(n) { garante(n, cod); n[cod].modulos[modId] = !atual; });
        }
        function toggleAba(cod, abaKey, permitida) {
            mutar(function(n) {
                garante(n, cod);
                if (permitida) n[cod].abas[abaKey] = false;
                else delete n[cod].abas[abaKey];
            });
        }
        function marcarModulos(cod, valor) {
            mutar(function(n) {
                garante(n, cod);
                MODULOS.forEach(function(m) { n[cod].modulos[m.id] = valor; });
            });
        }

        // --- Replicar (grava direto no banco) ---
        function abrirReplicar(codOrigem) {
            setOrigem(codOrigem || "");
            setAlvos({});
            setModalOpen(true);
        }
        function aplicarReplicar() {
            if (!origem) { showToast("Escolha o admin de origem", "error"); return; }
            var origemPerms = perms[origem];
            if (!origemPerms) { showToast("Permissões da origem não carregadas", "error"); return; }
            var lista = Object.keys(alvos).filter(function(c) { return alvos[c]; });
            if (lista.length === 0) { showToast("Selecione ao menos um admin de destino", "error"); return; }

            setBusy(true);
            var novo = JSON.parse(JSON.stringify(perms));
            lista.forEach(function(c) {
                novo[c] = {
                    modulos: JSON.parse(JSON.stringify(origemPerms.modulos || {})),
                    abas: JSON.parse(JSON.stringify(origemPerms.abas || {}))
                };
            });
            setPerms(novo);
            Promise.all(lista.map(function(c) { return patchAdmin(c, novo); }))
                .then(function(rs) {
                    var ok = rs.filter(Boolean).length;
                    setModalOpen(false);
                    showToast(ok === lista.length
                        ? ("✅ Replicado para " + ok + " admin(s)!")
                        : ("⚠️ " + ok + "/" + lista.length + " salvos"),
                        ok === lista.length ? "success" : "warning");
                })
                .finally(function() { setBusy(false); });
        }

        // --- Excluir admin (somente admin_master) ---
        function excluirAdmin(admin) {
            var cod = admin.codProfissional;
            if (!confirm("⚠️ Excluir o admin \"" + (admin.fullName || cod) + "\"?\n\n" +
                "A conta será removida. O histórico de auditoria e os registros do sistema são preservados.\n\n" +
                "Esta ação não pode ser desfeita.")) return;
            setLoading(true);
            fetchAuth(API_URL + "/users/" + encodeURIComponent(cod), { method: "DELETE" })
                .then(function(res) {
                    if (res.ok) {
                        showToast("🗑️ Admin excluído!", "success");
                        setExp(null);
                        if (recarregar) recarregar();
                    } else {
                        return res.json().catch(function() { return {}; }).then(function(e) {
                            showToast("❌ " + (e.error || "Erro ao excluir"), "error");
                        });
                    }
                })
                .catch(function() { showToast("❌ Erro ao excluir", "error"); })
                .finally(function() { setLoading(false); });
        }

        // --- Métricas de um admin ---
        function statsDe(cod) {
            var pr = perms[cod] || { modulos: {}, abas: {} };
            var mods = pr.modulos || {}, abas = pr.abas || {};
            var ativos = MODULOS.filter(function(m) { return mods[m.id] === true; }).length;
            var restr = Object.keys(abas).filter(function(k) { return abas[k] === false; }).length;
            return { ativos: ativos, restr: restr };
        }

        // ---- Resumo ----
        var totalAdmins = admins.length;
        var acessoTotal = 0, comRestricoes = 0;
        admins.forEach(function(a) {
            var st = statsDe(a.codProfissional);
            if (st.ativos === TOTAL && st.restr === 0) acessoTotal++;
            else comRestricoes++;
        });

        function corAvatar(role) { return role === "admin" ? "bg-blue-600" : "bg-green-600"; }
        function labelRole(role) { return role === "admin" ? "👑 Admin" : "💰 Admin Fin."; }

        function metricCard(label, valor, cor) {
            return React.createElement("div", { className: "bg-gray-50 rounded-lg p-3" },
                React.createElement("p", { className: "text-xs text-gray-500" }, label),
                React.createElement("p", { className: "text-2xl font-bold " + cor }, valor)
            );
        }

        // ---- Pílula de toggle (módulo) ----
        function pilulaModulo(ativo, onClick) {
            return React.createElement("button", {
                onClick: onClick,
                className: "px-3 py-1 rounded-full text-xs font-bold transition-colors flex-shrink-0 " +
                    (ativo ? "bg-green-100 text-green-700 hover:bg-green-200"
                           : "bg-red-100 text-red-700 hover:bg-red-200")
            }, ativo ? "✓ Permitido" : "✗ Bloqueado");
        }

        // ---- Bloco de módulos de um admin ----
        function blocoModulos(admin) {
            var cod = admin.codProfissional;
            return React.createElement("div", { className: "border-t bg-gray-50 p-3" },
                // atalhos
                React.createElement("div", { className: "flex flex-wrap gap-2 mb-3 items-center" },
                    React.createElement("button", {
                        onClick: function() { marcarModulos(cod, true); },
                        className: "px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white hover:bg-gray-50"
                    }, "✓ Marcar todos"),
                    React.createElement("button", {
                        onClick: function() { marcarModulos(cod, false); },
                        className: "px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white hover:bg-gray-50"
                    }, "✗ Limpar tudo"),
                    React.createElement("button", {
                        onClick: function() { abrirReplicar(cod); },
                        className: "px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
                    }, "📋 Usar como modelo"),
                    ehMaster && React.createElement("button", {
                        onClick: function() { excluirAdmin(admin); },
                        className: "ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    }, "🗑️ Excluir admin")
                ),
                // lista de módulos
                React.createElement("div", { className: "space-y-1.5" },
                    MODULOS.map(function(mod) {
                        var pr = perms[cod] || { modulos: {}, abas: {} };
                        var modAtivo = (pr.modulos || {})[mod.id] === true;
                        var modAbas = mod.abas || [];
                        var abaKeyBase = mod.id;
                        var modExpKey = cod + "_" + mod.id;
                        var isModExp = expMod === modExpKey;
                        var restrModulo = modAbas.filter(function(aba) {
                            var k = abaKeyBase + "_" + aba.id.replace(/-/g, "");
                            return (pr.abas || {})[k] === false;
                        }).length;

                        return React.createElement("div", {
                            key: mod.id,
                            className: "border rounded-lg overflow-hidden bg-white " +
                                (modAtivo ? "border-green-200" : "border-red-200")
                        },
                            React.createElement("div", {
                                className: "flex items-center gap-2 p-2 " + (modAtivo ? "bg-green-50" : "bg-red-50")
                            },
                                React.createElement("div", {
                                    className: "flex items-center gap-2 flex-1 min-w-0 " + (modAbas.length > 0 ? "cursor-pointer" : ""),
                                    onClick: function() {
                                        if (modAbas.length > 0) setExpMod(isModExp ? null : modExpKey);
                                    }
                                },
                                    React.createElement("span", { className: "text-gray-400 w-3 text-center" },
                                        modAbas.length > 0 ? (isModExp ? "▼" : "▶") : ""),
                                    React.createElement("span", null, mod.icon),
                                    React.createElement("span", { className: "font-medium text-sm truncate" }, mod.label),
                                    modAbas.length > 0 && React.createElement("span", { className: "text-xs text-gray-400 flex-shrink-0" },
                                        "(" + modAbas.length + " abas" +
                                        (restrModulo > 0 ? ", " + restrModulo + " restritas" : "") + ")")
                                ),
                                pilulaModulo(modAtivo, function() { toggleModulo(cod, mod.id, modAtivo); })
                            ),
                            // abas
                            isModExp && modAbas.length > 0 && React.createElement("div", { className: "border-t bg-gray-50 p-3" },
                                React.createElement("p", { className: "text-xs text-gray-500 mb-2 font-semibold" }, "📑 Abas do módulo"),
                                React.createElement("div", { className: "flex flex-wrap gap-2" },
                                    modAbas.map(function(aba) {
                                        var k = abaKeyBase + "_" + aba.id.replace(/-/g, "");
                                        var permitida = (pr.abas || {})[k] !== false;
                                        return React.createElement("button", {
                                            key: k,
                                            onClick: function() { toggleAba(cod, k, permitida); },
                                            className: "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors " +
                                                (permitida ? "bg-white border-green-200 text-green-700 hover:bg-green-50"
                                                           : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100")
                                        }, (permitida ? "✓ " : "✗ ") + aba.label);
                                    })
                                )
                            )
                        );
                    })
                )
            );
        }

        // ---- Card de admin ----
        function cardAdmin(admin) {
            var cod = admin.codProfissional;
            var st = statsDe(cod);
            var full = st.ativos === TOTAL;
            var pct = TOTAL > 0 ? Math.round(st.ativos / TOTAL * 100) : 0;
            var aberto = exp === cod;

            return React.createElement("div", {
                key: cod,
                className: "bg-white rounded-xl shadow-sm border overflow-hidden"
            },
                React.createElement("div", {
                    className: "flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                    onClick: function() { setExp(aberto ? null : cod); }
                },
                    React.createElement("div", {
                        className: "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 " + corAvatar(admin.role)
                    }, admin.fullName ? admin.fullName.charAt(0).toUpperCase() : "?"),
                    React.createElement("div", { className: "min-w-0 flex-1" },
                        React.createElement("p", { className: "font-semibold truncate" }, admin.fullName),
                        React.createElement("p", { className: "text-xs text-gray-500" }, labelRole(admin.role))
                    ),
                    // barra de progresso de módulos
                    React.createElement("div", { className: "w-32 flex-shrink-0 hidden sm:block" },
                        React.createElement("div", { className: "flex justify-between text-xs mb-1" },
                            React.createElement("span", { className: "text-gray-500" }, "módulos"),
                            React.createElement("span", { className: "font-semibold " + (full ? "text-green-600" : "text-orange-600") },
                                st.ativos + "/" + TOTAL)
                        ),
                        React.createElement("div", { className: "h-1.5 bg-gray-100 rounded-full overflow-hidden" },
                            React.createElement("div", {
                                className: "h-full rounded-full " + (full ? "bg-green-500" : "bg-purple-600"),
                                style: { width: pct + "%" }
                            })
                        )
                    ),
                    // chip de status (verde só em acesso realmente total)
                    (st.restr > 0
                        ? React.createElement("span", { className: "bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0" },
                            st.restr + " abas restritas")
                        : full
                            ? React.createElement("span", { className: "bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0" },
                                "acesso total")
                            : React.createElement("span", { className: "bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0" },
                                "abas liberadas")),
                    React.createElement("span", { className: "text-gray-400 text-lg flex-shrink-0" }, aberto ? "▼" : "▶")
                ),
                aberto && blocoModulos(admin)
            );
        }

        // ---- Modal Replicar ----
        function renderModal() {
            if (!modalOpen) return null;
            var alvosAdmins = admins.filter(function(a) { return a.codProfissional !== origem; });
            var marcados = alvosAdmins.filter(function(a) { return alvos[a.codProfissional]; }).length;
            var todosMarcados = alvosAdmins.length > 0 && marcados === alvosAdmins.length;

            return React.createElement("div", {
                className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                onClick: function() { if (!busy) setModalOpen(false); }
            },
                React.createElement("div", {
                    className: "bg-white rounded-xl w-full max-w-md flex flex-col max-h-[90vh]",
                    onClick: function(e) { e.stopPropagation(); }
                },
                    // header
                    React.createElement("div", { className: "p-5 border-b" },
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("h3", { className: "text-lg font-bold flex items-center gap-2" },
                                React.createElement("span", null, "📋"), "Replicar permissões"),
                            React.createElement("button", {
                                onClick: function() { if (!busy) setModalOpen(false); },
                                className: "text-gray-400 hover:text-gray-600 text-xl"
                            }, "✕")
                        ),
                        React.createElement("p", { className: "text-sm text-gray-500 mt-1" },
                            "Copia os módulos e abas de um admin para vários de uma vez.")
                    ),
                    // corpo
                    React.createElement("div", { className: "p-5 overflow-y-auto space-y-4" },
                        React.createElement("div", null,
                            React.createElement("label", { className: "block text-sm font-semibold mb-1" }, "Copiar de"),
                            React.createElement("select", {
                                value: origem,
                                onChange: function(e) { setOrigem(e.target.value); setAlvos({}); },
                                className: "w-full px-3 py-2 border rounded-lg"
                            },
                                React.createElement("option", { value: "" }, "— selecione o admin —"),
                                admins.map(function(a) {
                                    var st = statsDe(a.codProfissional);
                                    return React.createElement("option", { key: a.codProfissional, value: a.codProfissional },
                                        a.fullName + " (" + st.ativos + "/" + TOTAL + " módulos)");
                                })
                            )
                        ),
                        React.createElement("div", null,
                            React.createElement("div", { className: "flex items-center justify-between mb-1" },
                                React.createElement("label", { className: "text-sm font-semibold" }, "Aplicar em"),
                                origem && alvosAdmins.length > 0 && React.createElement("button", {
                                    onClick: function() {
                                        var novo = {};
                                        if (!todosMarcados) alvosAdmins.forEach(function(a) { novo[a.codProfissional] = true; });
                                        setAlvos(novo);
                                    },
                                    className: "text-xs text-purple-600 font-semibold hover:underline"
                                }, todosMarcados ? "Limpar seleção" : "Selecionar todos")
                            ),
                            !origem
                                ? React.createElement("p", { className: "text-sm text-gray-400 py-3 text-center border rounded-lg" },
                                    "Escolha o admin de origem acima")
                                : React.createElement("div", { className: "border rounded-lg divide-y max-h-52 overflow-y-auto" },
                                    alvosAdmins.map(function(a) {
                                        var marcado = !!alvos[a.codProfissional];
                                        return React.createElement("label", {
                                            key: a.codProfissional,
                                            className: "flex items-center gap-3 p-2.5 cursor-pointer hover:bg-gray-50"
                                        },
                                            React.createElement("input", {
                                                type: "checkbox", checked: marcado,
                                                onChange: function() {
                                                    var novo = Object.assign({}, alvos);
                                                    if (marcado) delete novo[a.codProfissional];
                                                    else novo[a.codProfissional] = true;
                                                    setAlvos(novo);
                                                },
                                                className: "w-4 h-4 rounded"
                                            }),
                                            React.createElement("div", {
                                                className: "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold " + corAvatar(a.role)
                                            }, a.fullName ? a.fullName.charAt(0).toUpperCase() : "?"),
                                            React.createElement("span", { className: "text-sm flex-1" }, a.fullName),
                                            React.createElement("span", { className: "text-xs text-gray-400" }, labelRole(a.role))
                                        );
                                    })
                                )
                        ),
                        React.createElement("div", { className: "flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg p-3" },
                            React.createElement("span", null, "⚠️"),
                            React.createElement("p", { className: "text-xs text-amber-800" },
                                "Os módulos e abas dos admins selecionados serão sobrescritos e salvos imediatamente no banco.")
                        )
                    ),
                    // footer
                    React.createElement("div", { className: "p-5 border-t flex gap-3 justify-end" },
                        React.createElement("button", {
                            onClick: function() { if (!busy) setModalOpen(false); },
                            disabled: busy,
                            className: "px-4 py-2 border rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50"
                        }, "Cancelar"),
                        React.createElement("button", {
                            onClick: aplicarReplicar,
                            disabled: busy || !origem || marcados === 0,
                            className: "px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                        }, busy ? "Aplicando..." : ("Aplicar a " + marcados + " admin" + (marcados === 1 ? "" : "s")))
                    )
                )
            );
        }

        // ---- Filtragem ----
        var buscaNorm = busca.toLowerCase().trim();
        var adminsFiltrados = admins.filter(function(a) {
            if (!buscaNorm) return true;
            return (a.fullName || "").toLowerCase().indexOf(buscaNorm) !== -1 ||
                   String(a.codProfissional || "").toLowerCase().indexOf(buscaNorm) !== -1;
        });

        return React.createElement("div", null,
            // header
            React.createElement("div", { className: "bg-white rounded-xl shadow-sm border p-5 mb-4" },
                React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-3 mb-4" },
                    React.createElement("div", null,
                        React.createElement("h2", { className: "text-lg font-bold flex items-center gap-2" },
                            React.createElement("span", null, "🔐"), "Sistema de Permissões"),
                        React.createElement("p", { className: "text-sm text-gray-500" },
                            "Clique em um admin para expandir e configurar")
                    ),
                    React.createElement("div", { className: "flex gap-2 flex-wrap" },
                        React.createElement("button", {
                            onClick: function() { abrirReplicar(""); },
                            className: "px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 flex items-center gap-1.5"
                        }, "📋 Replicar permissões"),
                        React.createElement("button", {
                            onClick: function() { carregar(true); },
                            title: "Atualizar",
                            className: "px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200"
                        }, "🔄"),
                        React.createElement("button", {
                            onClick: salvarTodos,
                            className: "px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-1.5"
                        }, "💾 Salvar")
                    )
                ),
                React.createElement("div", { className: "grid grid-cols-3 gap-3" },
                    metricCard("Administradores", totalAdmins, "text-gray-800"),
                    metricCard("Acesso total", acessoTotal, "text-green-600"),
                    metricCard("Com restrições", comRestricoes, "text-orange-600")
                )
            ),
            // busca
            admins.length > 0 && React.createElement("div", { className: "relative mb-4" },
                React.createElement("input", {
                    type: "text", value: busca,
                    onChange: function(e) { setBusca(e.target.value); },
                    placeholder: "Buscar administrador...",
                    className: "w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                }),
                React.createElement("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }, "🔍")
            ),
            // lista
            admins.length === 0
                ? React.createElement("div", { className: "bg-white rounded-xl p-8 text-center text-gray-500" },
                    React.createElement("span", { className: "text-4xl block mb-2" }, "👤"),
                    "Nenhum administrador cadastrado")
                : adminsFiltrados.length === 0
                    ? React.createElement("div", { className: "bg-white rounded-xl p-8 text-center text-gray-500" },
                        React.createElement("span", { className: "text-4xl block mb-2" }, "🔍"),
                        "Nenhum admin encontrado")
                    : React.createElement("div", { className: "space-y-2" },
                        adminsFiltrados.map(cardAdmin)),
            renderModal()
        );
    }

// ClientesApiAutoLoad definido fora do render - referencia estavel
    var _ClientesApiAutoLoad = function ClientesApiAutoLoad(innerProps) {
                var innerP = innerProps.p;
                var innerX = innerProps.x;
                var innerJa = innerProps.ja;
                var innerApiUrl = innerProps.API_URL;
                var innerGetToken = innerProps.getToken;
                // aliases para o resto do corpo que usa os nomes curtos
                var p = innerP;
                var x = innerX;
                var ja = innerJa;
                var API_URL = innerApiUrl;
                var getToken = innerGetToken;
                React.useEffect(function() {
                    if (!innerP.clientesApiLista) {
                        fetch(innerApiUrl + "/admin/solicitacao/clientes", {
                            headers: {"Authorization": "Bearer " + innerGetToken()}
                        }).then(function(r) { return r.ok ? r.json() : Promise.reject(r); })
                          .then(function(data) { innerX({...innerP, clientesApiLista: data.clientes || data}); })
                          .catch(function() { innerJa("Erro ao carregar clientes", "error"); });
                    }
                }, [!!innerP.clientesApiLista]);
                return React.createElement("div", null,
                React.createElement("div", {className: "bg-white rounded-xl shadow-sm border p-6 mb-6"},
                    React.createElement("h2", {className: "text-lg font-bold mb-4 flex items-center gap-2"},
                        React.createElement("span", null, "🔗"),
                        "Clientes API - Solicitação de Serviço"
                    ),
                    React.createElement("p", {className: "text-gray-600 text-sm mb-4"}, "Cadastre clientes que podem solicitar corridas via página externa."),
                    
                    // Formulário de cadastro
                    React.createElement("div", {className: "bg-gray-50 rounded-lg p-4 mb-6"},
                        React.createElement("h3", {className: "font-bold text-gray-700 mb-3"}, "➕ Novo Cliente"),
                        React.createElement("div", {className: "grid md:grid-cols-2 gap-4 mb-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Nome *"),
                                React.createElement("input", {
                                    type: "text",
                                    value: p.novoClienteApi?.nome || "",
                                    onChange: function(e) { x({...p, novoClienteApi: {...(p.novoClienteApi || {}), nome: e.target.value}}); },
                                    className: "w-full px-3 py-2 border rounded-lg text-sm",
                                    placeholder: "Nome do cliente"
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Email *"),
                                React.createElement("input", {
                                    type: "email",
                                    value: p.novoClienteApi?.email || "",
                                    onChange: function(e) { x({...p, novoClienteApi: {...(p.novoClienteApi || {}), email: e.target.value}}); },
                                    className: "w-full px-3 py-2 border rounded-lg text-sm",
                                    placeholder: "email@empresa.com"
                                })
                            )
                        ),
                        React.createElement("div", {className: "grid md:grid-cols-2 gap-4 mb-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Senha *"),
                                React.createElement("input", {
                                    type: "password",
                                    value: p.novoClienteApi?.senha || "",
                                    onChange: function(e) { x({...p, novoClienteApi: {...(p.novoClienteApi || {}), senha: e.target.value}}); },
                                    className: "w-full px-3 py-2 border rounded-lg text-sm",
                                    placeholder: "Senha de acesso"
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Empresa"),
                                React.createElement("input", {
                                    type: "text",
                                    value: p.novoClienteApi?.empresa || "",
                                    onChange: function(e) { x({...p, novoClienteApi: {...(p.novoClienteApi || {}), empresa: e.target.value}}); },
                                    className: "w-full px-3 py-2 border rounded-lg text-sm",
                                    placeholder: "Nome da empresa"
                                })
                            )
                        ),
                        React.createElement("div", {className: "grid md:grid-cols-2 gap-4 mb-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Token API Tutts *"),
                                React.createElement("input", {
                                    type: "text",
                                    value: p.novoClienteApi?.tutts_token || "",
                                    onChange: function(e) { x({...p, novoClienteApi: {...(p.novoClienteApi || {}), tutts_token: e.target.value}}); },
                                    className: "w-full px-3 py-2 border rounded-lg text-sm font-mono",
                                    placeholder: "Token fornecido pela Tutts"
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Código Cliente Tutts *"),
                                React.createElement("input", {
                                    type: "text",
                                    value: p.novoClienteApi?.tutts_cod_cliente || "",
                                    onChange: function(e) { x({...p, novoClienteApi: {...(p.novoClienteApi || {}), tutts_cod_cliente: e.target.value}}); },
                                    className: "w-full px-3 py-2 border rounded-lg text-sm font-mono",
                                    placeholder: "Código do cliente na Tutts"
                                })
                            )
                        ),
                        React.createElement("button", {
                            onClick: async function() {
                                const c = p.novoClienteApi || {};
                                if (!c.nome || !c.email || !c.senha || !c.tutts_token || !c.tutts_cod_cliente) {
                                    ja("Preencha todos os campos obrigatórios", "error");
                                    return;
                                }
                                try {
                                    const resp = await fetch(API_URL + "/admin/solicitacao/clientes", {
                                        method: "POST",
                                        headers: {"Content-Type": "application/json", "Authorization": "Bearer " + getToken()},
                                        body: JSON.stringify(c)
                                    });
                                    const data = await resp.json();
                                    if (resp.ok) {
                                        ja("✅ Cliente criado com sucesso!", "success");
                                        x({...p, novoClienteApi: {}, clientesApiLista: null});
                                    } else {
                                        ja(data.error || "Erro ao criar cliente", "error");
                                    }
                                } catch (err) {
                                    ja("Erro de conexão", "error");
                                }
                            },
                            className: "px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        }, "✅ Cadastrar Cliente")
                    ),
                    
                    // Lista de clientes
                    React.createElement("div", null,
                        React.createElement("div", {className: "flex items-center justify-between mb-3"},
                            React.createElement("h3", {className: "font-bold text-gray-700"}, "📋 Clientes Cadastrados"),
                            React.createElement("button", {
                                onClick: async function() {
                                    try {
                                        const resp = await fetch(API_URL + "/admin/solicitacao/clientes", {
                                            headers: {"Authorization": "Bearer " + getToken()}
                                        });
                                        const data = await resp.json();
                                        if (resp.ok) {
                                            x({...p, clientesApiLista: data.clientes || data});
                                        }
                                    } catch (err) {
                                        ja("Erro ao carregar clientes", "error");
                                    }
                                },
                                className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            }, "🔄 Carregar")
                        ),
                        p.clientesApiLista && p.clientesApiLista.length === 0 && React.createElement("p", {className: "text-gray-500 text-sm text-center py-4"}, "Nenhum cliente cadastrado"),
                        p.clientesApiLista && p.clientesApiLista.length > 0 && React.createElement("div", {className: "space-y-2"},
                            p.clientesApiLista.map(function(cliente) {
                                var cats = Array.isArray(cliente.categorias_disponiveis) ? cliente.categorias_disponiveis : [];
                                return React.createElement("div", {
                                    key: cliente.id,
                                    className: "bg-gray-50 rounded-lg p-3"
                                },
                                    React.createElement("div", {className: "flex items-start justify-between gap-2"},
                                        React.createElement("div", {className: "flex-1 min-w-0"},
                                            React.createElement("p", {className: "font-medium text-gray-800"}, cliente.nome),
                                            React.createElement("p", {className: "text-sm text-gray-500"}, cliente.email, " • ", cliente.empresa || "Sem empresa"),
                                            React.createElement("p", {className: "text-xs text-gray-400 font-mono"}, "Cód: ", cliente.tutts_cod_cliente || cliente.tutts_codigo_cliente),
                                            cats.length > 0
                                                ? React.createElement("div", {className: "flex flex-wrap gap-1 mt-1.5"},
                                                    cats.map(function(c) {
                                                        return React.createElement("span", {
                                                            key: c.sigla,
                                                            className: "px-2 py-0.5 rounded-full text-xs font-medium",
                                                            style: {background: "#EEEDFE", color: "#3C3489", border: "0.5px solid #AFA9EC"}
                                                        }, c.sigla + " — " + c.nome);
                                                    })
                                                  )
                                                : React.createElement("p", {className: "text-xs text-gray-400 mt-1 italic"}, "Nenhuma categoria configurada")
                                        ),
                                        React.createElement("div", {className: "flex items-center gap-2 flex-shrink-0"},
                                        React.createElement("span", {
                                            className: cliente.ativo ? "px-2 py-1 bg-green-100 text-green-700 rounded text-xs" : "px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                                        }, cliente.ativo ? "✅ Ativo" : "❌ Inativo"),
                                        React.createElement("button", {
                                            onClick: async function() {
                                                if (!confirm("Desativar/ativar este cliente?")) return;
                                                try {
                                                    await fetch(API_URL + "/admin/solicitacao/clientes/" + cliente.id + "/status", {
                                                        method: "PATCH",
                                                        headers: {"Content-Type": "application/json", "Authorization": "Bearer " + getToken()},
                                                        body: JSON.stringify({ativo: !cliente.ativo})
                                                    });
                                                    ja("Status alterado!", "success");
                                                    x({...p, clientesApiLista: null});
                                                } catch (err) {
                                                    ja("Erro", "error");
                                                }
                                            },
                                            title: cliente.ativo ? "Desativar cliente" : "Ativar cliente",
                                            className: "px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                                        }, "🔄"),
                                        React.createElement("button", {
                                            onClick: async function() {
                                                // Abre modal de edição + carrega lista de grupos pra o select
                                                var gruposFetched = [];
                                                try {
                                                    var respG = await fetch(API_URL + "/admin/grupos-enderecos", { headers: {"Authorization": "Bearer " + getToken()} });
                                                    if (respG.ok) gruposFetched = await respG.json();
                                                } catch {}
                                                x({...p, 
                                                    editarClienteSolicitacao: {
                                                        id: cliente.id,
                                                        nome: cliente.nome || "",
                                                        email: cliente.email || "",
                                                        empresa: cliente.empresa || "",
                                                        grupo_enderecos_id: cliente.grupo_enderecos_id || "",
                                                        grupos_disponiveis: gruposFetched,
                                                        nova_senha: "",
                                                        confirmar_senha: "",
                                                        mostrar_senha: false,
                                                        salvando: false,
                                                        erro: ""
                                                    }
                                                });
                                            },
                                            title: "Editar cliente (nome, email, empresa, grupo, senha)",
                                            className: "px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                        }, "✏️"),
                                        React.createElement("button", {
                                            onClick: async function() {
                                                var respCats = await fetch(API_URL + "/admin/solicitacao/clientes/" + cliente.id + "/categorias", {headers: {"Authorization": "Bearer " + getToken()}});
                                                var dataCats = respCats.ok ? await respCats.json() : {categorias: []};
                                                var catsAtivas = (dataCats.categorias || []).map(function(c) { return c.sigla; });
                                                x({...p, modalCategorias: {id: cliente.id, nome: cliente.nome, catsAtivas: catsAtivas, salvando: false}});
                                            },
                                            title: "Configurar modalidades de frete",
                                            className: "px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                                        }, "🏷️"),
                                        React.createElement("button", {
                                            onClick: async function() {
                                                var total = parseInt(cliente.total_solicitacoes) || 0;
                                                var msg = "⚠️ EXCLUIR cliente \"" + cliente.nome + "\" (" + cliente.email + ")?\n\n" +
                                                    (total > 0
                                                        ? "Este cliente possui " + total + " solicitação(ões) no histórico.\n" +
                                                          "A exclusão provavelmente FALHARÁ por referência de chave estrangeira.\n" +
                                                          "Recomendação: desative em vez de excluir.\n\n" +
                                                          "Deseja tentar excluir mesmo assim?"
                                                        : "Nenhuma solicitação no histórico — exclusão segura.\n\n" +
                                                          "Esta ação é IRREVERSÍVEL e também apagará todos os endereços salvos.\n\n" +
                                                          "Confirmar exclusão?");
                                                if (!confirm(msg)) return;
                                                try {
                                                    var resp = await fetch(API_URL + "/admin/solicitacao/clientes/" + cliente.id, {
                                                        method: "DELETE",
                                                        headers: {"Authorization": "Bearer " + getToken()}
                                                    });
                                                    var data = await resp.json().catch(function() { return {}; });
                                                    if (resp.ok) {
                                                        ja("🗑️ Cliente excluído com sucesso!", "success");
                                                        x({...p, clientesApiLista: null});
                                                    } else {
                                                        var erro = (data.error || "").toLowerCase();
                                                        if (erro.indexOf("foreign key") >= 0 || erro.indexOf("violates") >= 0 || erro.indexOf("constraint") >= 0) {
                                                            ja("❌ Não é possível excluir: cliente possui corridas no histórico. Desative em vez de excluir.", "error");
                                                        } else {
                                                            ja("❌ " + (data.error || "Erro ao excluir"), "error");
                                                        }
                                                    }
                                                } catch (err) {
                                                    ja("❌ Erro de conexão ao excluir", "error");
                                                }
                                            },
                                            title: "Excluir cliente permanentemente",
                                            className: "px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                        }, "🗑️")
                                        )
                                    )
                                );
                            })
                        )
                    ),
                    
                    // ==================== GRUPOS DE ENDEREÇOS COMPARTILHADOS ====================
                    React.createElement("div", {className: "mt-6 pt-6 border-t"},
                        React.createElement("div", {className: "flex items-center justify-between mb-3"},
                            React.createElement("div", null,
                                React.createElement("h3", {className: "font-bold text-gray-700 flex items-center gap-2"}, "📚 Grupos de Endereços Compartilhados"),
                                React.createElement("p", {className: "text-xs text-gray-500"}, "Agrupe clientes para que compartilhem o mesmo pool de endereços salvos")
                            ),
                            React.createElement("div", {className: "flex gap-2"},
                                React.createElement("button", {
                                    onClick: async function() {
                                        try {
                                            var resp = await fetch(API_URL + "/admin/grupos-enderecos", {headers: {"Authorization": "Bearer " + getToken()}});
                                            if (resp.ok) {
                                                var data = await resp.json();
                                                x({...p, gruposEnderecosLista: data});
                                            }
                                        } catch (err) { ja("Erro ao carregar grupos", "error"); }
                                    },
                                    className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                }, "🔄 Carregar"),
                                React.createElement("button", {
                                    onClick: function() {
                                        x({...p, editarGrupoEnderecos: {id: null, nome: "", descricao: "", ativo: true, salvando: false, erro: ""}});
                                    },
                                    className: "px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                                }, "+ Novo Grupo")
                            )
                        ),
                        p.gruposEnderecosLista && p.gruposEnderecosLista.length === 0 && 
                            React.createElement("p", {className: "text-gray-500 text-sm text-center py-4"}, "Nenhum grupo cadastrado. Clique em \"+ Novo Grupo\" para criar."),
                        p.gruposEnderecosLista && p.gruposEnderecosLista.length > 0 && 
                            React.createElement("div", {className: "space-y-2"},
                                p.gruposEnderecosLista.map(function(g) {
                                    return React.createElement("div", {
                                        key: g.id,
                                        className: "bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between"
                                    },
                                        React.createElement("div", {className: "flex-1"},
                                            React.createElement("div", {className: "flex items-center gap-2"},
                                                React.createElement("p", {className: "font-medium text-purple-900"}, g.nome),
                                                !g.ativo && React.createElement("span", {className: "text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded"}, "INATIVO")
                                            ),
                                            g.descricao && React.createElement("p", {className: "text-xs text-gray-600 mt-0.5"}, g.descricao),
                                            React.createElement("p", {className: "text-xs text-purple-600 mt-1"},
                                                "👥 " + (g.total_clientes || 0) + " cliente(s) · 📍 " + (g.total_enderecos || 0) + " endereço(s)"
                                            )
                                        ),
                                        React.createElement("div", {className: "flex items-center gap-2"},
                                            React.createElement("button", {
                                                onClick: function() {
                                                    x({...p, editarGrupoEnderecos: {
                                                        id: g.id, nome: g.nome || "", descricao: g.descricao || "", ativo: g.ativo, salvando: false, erro: ""
                                                    }});
                                                },
                                                className: "px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                                            }, "✏️ Editar"),
                                            React.createElement("button", {
                                                onClick: async function() {
                                                    var totalC = parseInt(g.total_clientes) || 0;
                                                    var totalE = parseInt(g.total_enderecos) || 0;
                                                    var msg = "Excluir grupo \"" + g.nome + "\"?\n\n";
                                                    if (totalC > 0 || totalE > 0) {
                                                        msg += "⚠️ Este grupo tem " + totalC + " cliente(s) e " + totalE + " endereço(s).\n";
                                                        msg += "Os clientes voltarão a ter endereços individuais.\n";
                                                        msg += "Os endereços continuarão existindo, mas voltam a ser privados de quem os cadastrou.\n\n";
                                                    }
                                                    msg += "Confirmar exclusão?";
                                                    if (!confirm(msg)) return;
                                                    try {
                                                        var resp = await fetch(API_URL + "/admin/grupos-enderecos/" + g.id, {
                                                            method: "DELETE",
                                                            headers: {"Authorization": "Bearer " + getToken()}
                                                        });
                                                        if (resp.ok) {
                                                            ja("🗑️ Grupo excluído", "success");
                                                            x({...p, gruposEnderecosLista: null});
                                                        } else ja("Erro ao excluir grupo", "error");
                                                    } catch { ja("Erro de conexão", "error"); }
                                                },
                                                className: "px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                            }, "🗑️")
                                        )
                                    );
                                })
                            )
                    )
                )
            );
        };

    // Componente principal do módulo Config
    window.ModuloConfigComponent = function(props) {
        const {
            usuario,
            estado,
            setEstado,
            usuarios,
            showToast,
            setLoading,
            carregarUsuarios,
            API_URL,
            fetchAuth,
            getToken,
            SISTEMA_MODULOS_CONFIG,
            APP_VERSION,
            VERSION_KEY,
            HeaderCompacto,
            Toast,
            LoadingOverlay,
            AuditLogs,
            moduloAtivo,
            socialProfile,
            isLoading,
            lastUpdate,
            onRefresh,
            onLogout,
            onGoHome,
            onNavigate,
            toastData
        } = props;

        const l = usuario;
        const p = estado;
        const x = setEstado;
        const A = usuarios;
        const s = setLoading;
        const ja = showToast;
        const Ia = carregarUsuarios;
        const Ee = moduloAtivo;
        const i = toastData;
        const n = isLoading;
        const f = isLoading;
        const E = lastUpdate;
        const ul = onRefresh;
        const he = onGoHome;

        // Verificar permissão de aba
        const verificarPermissaoAba = function(abaId) {
            if ("admin_master" === l.role) return true;
            const abas = l.permissions && l.permissions.abas ? l.permissions.abas : {};
            if (Object.keys(abas).length === 0) return true;
            return abas["config_" + abaId] !== false;
        };

        return React.createElement("div", {
            className: "min-h-screen bg-gray-100"
        }, 
        i && React.createElement(Toast, i), 
        n && React.createElement(LoadingOverlay, null),
        
        // ========== HEADER COM NAVEGAÇÃO - CONFIG ==========
        React.createElement(HeaderCompacto, {
            usuario: l,
            moduloAtivo: Ee,
            abaAtiva: p.configTab || "usuarios",
            socialProfile: socialProfile,
            isLoading: f,
            lastUpdate: E,
            onRefresh: ul,
            onLogout: onLogout,
            onGoHome: () => he("home"),
            onNavigate: onNavigate,
            onChangeTab: (abaId) => x({...p, configTab: abaId})
        }),
        
        // CONTEÚDO DO CONFIG
        React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
            
            // ==================== TAB USUÁRIOS ====================
            (!p.configTab || p.configTab === "usuarios") && verificarPermissaoAba("usuarios") && React.createElement("div", null,

                // ========== SUB-ABAS DE USUÁRIOS ==========
                React.createElement("div", {className: "flex gap-1 mb-6 border-b border-gray-200"},
                    [
                        { id: "lista", label: "👥 Usuários" },
                        { id: "bloqueadas", label: "🔒 Contas Bloqueadas" }
                    ].map(function(sub) {
                        var ativa = (p.usuariosSubTab || "lista") === sub.id;
                        return React.createElement("button", {
                            key: sub.id,
                            onClick: function() { x({...p, usuariosSubTab: sub.id}); },
                            className: "px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px " +
                                (ativa
                                    ? "border-purple-600 text-purple-700"
                                    : "border-transparent text-gray-500 hover:text-gray-700")
                        }, sub.label);
                    })
                ),

                // ========== SUB-ABA: LISTA DE USUÁRIOS ==========
                (!p.usuariosSubTab || p.usuariosSubTab === "lista") && React.createElement(React.Fragment, null,

                // Criar usuário
                React.createElement("div", {className: "bg-white rounded-xl shadow-sm border p-6 mb-6"},
                    React.createElement("h2", {className: "text-lg font-bold mb-4 flex items-center gap-2"},
                        React.createElement("span", null, "➕"),
                        "Criar Novo Usuário"
                    ),
                    React.createElement("div", {className: "grid md:grid-cols-2 gap-4 mb-4"},
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Nome Completo"),
                            React.createElement("input", {
                                type: "text",
                                value: p.newUserName || "",
                                onChange: function(e) { x({...p, newUserName: e.target.value}); },
                                className: "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
                                placeholder: "Ex: João Silva"
                            })
                        ),
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Código Profissional"),
                            React.createElement("input", {
                                type: "text",
                                value: p.newUserCod || "",
                                onChange: function(e) { x({...p, newUserCod: e.target.value}); },
                                className: "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
                                placeholder: "Ex: 12345"
                            })
                        )
                    ),
                    React.createElement("div", {className: "grid md:grid-cols-2 gap-4 mb-4"},
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Senha"),
                            React.createElement("input", {
                                type: "password",
                                value: p.newUserPass || "",
                                onChange: function(e) { x({...p, newUserPass: e.target.value}); },
                                className: "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
                                placeholder: "Mín 8 chars (a-z, A-Z, 0-9)"
                            })
                        ),
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Tipo de Usuário"),
                            React.createElement("select", {
                                value: p.newRole || "user",
                                onChange: function(e) { x({...p, newRole: e.target.value}); },
                                className: "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            },
                                React.createElement("option", {value: "user"}, "👤 Usuário (Motoboy)"),
                                React.createElement("option", {value: "admin"}, "👑 Admin"),
                                React.createElement("option", {value: "admin_financeiro"}, "💰 Admin Financeiro"),
                                "admin_master" === l.role && React.createElement("option", {value: "admin_master"}, "👑 Master")
                            )
                        )
                    ),
                    React.createElement("button", {
                        onClick: async function() {
                            if (!p.newUserName || !p.newUserCod || !p.newUserPass) {
                                ja("Preencha todos os campos", "error");
                                return;
                            }
                            if (p.newUserPass.length < 8) {
                                ja("Senha deve ter no mínimo 8 caracteres com maiúscula, minúscula e número", "error");
                                return;
                            }
                            s(true);
                            try {
                                const res = await fetchAuth(API_URL + "/users/register", {
                                    method: "POST",
                                    headers: {"Content-Type": "application/json"},
                                    body: JSON.stringify({
                                        codProfissional: p.newUserCod,
                                        fullName: p.newUserName,
                                        password: p.newUserPass,
                                        role: p.newRole || "user"
                                    })
                                });
                                if (res.ok) {
                                    ja("✅ Usuário criado!", "success");
                                    x({...p, newUserName: "", newUserCod: "", newUserPass: "", newRole: "user"});
                                    Ia();
                                } else {
                                    const err = await res.json();
                                    ja(err.error || "Erro ao criar usuário", "error");
                                }
                            } catch (err) {
                                ja("Erro de conexão", "error");
                            }
                            s(false);
                        },
                        className: "w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all"
                    }, "✅ Criar Usuário")
                ),
                
                // Lista de usuários (redesign: cards 4/linha, foto primeiro, paginação)
                React.createElement(ListaUsuariosView, {
                    usuarios: A,
                    estado: p,
                    setEstado: x,
                    API_URL: API_URL,
                    fetchAuth: fetchAuth,
                    showToast: ja,
                    recarregar: Ia
                })
                ),

                // ========== SUB-ABA: CONTAS BLOQUEADAS ==========
                p.usuariosSubTab === "bloqueadas" && React.createElement(ContasBloqueadasView, {
                    API_URL: API_URL,
                    fetchAuth: fetchAuth,
                    showToast: ja,
                    estado: p,
                    setEstado: x
                })
            ),
            
            // ==================== TAB PERMISSÕES ADM ====================
            p.configTab === "permissoes" && verificarPermissaoAba("permissoes") && React.createElement(PermissoesADMView, {
                usuarios: A,
                API_URL: API_URL,
                fetchAuth: fetchAuth,
                showToast: ja,
                setLoading: s,
                usuario: l,
                recarregar: Ia,
                SISTEMA_MODULOS_CONFIG: SISTEMA_MODULOS_CONFIG
            }),
            
            // ==================== TAB SISTEMA ====================
            p.configTab === "sistema" && verificarPermissaoAba("sistema") && React.createElement("div", null,
                React.createElement("div", {className: "bg-white rounded-xl shadow-sm border p-6 mb-6"},
                    React.createElement("h2", {className: "text-lg font-bold mb-4"}, "⚡ Informações do Sistema"),
                    React.createElement("div", {className: "grid md:grid-cols-2 gap-4"},
                        React.createElement("div", {className: "bg-gray-50 rounded-lg p-4"},
                            React.createElement("p", {className: "text-sm text-gray-500"}, "Versão"),
                            React.createElement("p", {className: "font-bold text-lg"}, "Sistema Tutts v" + APP_VERSION)
                        ),
                        React.createElement("div", {className: "bg-gray-50 rounded-lg p-4"},
                            React.createElement("p", {className: "text-sm text-gray-500"}, "Usuário Logado"),
                            React.createElement("p", {className: "font-bold text-lg"}, l.fullName)
                        ),
                        React.createElement("div", {className: "bg-gray-50 rounded-lg p-4"},
                            React.createElement("p", {className: "text-sm text-gray-500"}, "Total de Usuários"),
                            React.createElement("p", {className: "font-bold text-lg"}, A.length)
                        ),
                        React.createElement("div", {className: "bg-gray-50 rounded-lg p-4"},
                            React.createElement("p", {className: "text-sm text-gray-500"}, "API Backend"),
                            React.createElement("p", {className: "font-bold text-lg text-green-600"}, "Online ✓")
                        )
                    )
                ),
                React.createElement("div", {className: "bg-yellow-50 border border-yellow-200 rounded-xl p-6"},
                    React.createElement("h3", {className: "font-bold text-yellow-800 mb-2"}, "⚠️ Zona de Perigo"),
                    React.createElement("p", {className: "text-yellow-700 text-sm mb-4"}, "Ações irreversíveis. Use com cuidado."),
                    React.createElement("div", {className: "flex flex-wrap gap-3"},
                        React.createElement("button", {
                            onClick: function() { if(confirm("Limpar cache local?")) { localStorage.clear(); sessionStorage.clear(); ja("Cache limpo!", "success"); } },
                            className: "px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
                        }, "🗑️ Limpar Cache"),
                        React.createElement("button", {
                            onClick: function() { 
                                if(confirm("Forçar atualização do aplicativo? O app será recarregado.")) { 
                                    localStorage.removeItem(VERSION_KEY);
                                    if ('caches' in window) {
                                        caches.keys().then(names => names.forEach(name => caches.delete(name)));
                                    }
                                    if ('serviceWorker' in navigator) {
                                        navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()));
                                    }
                                    setTimeout(() => window.location.reload(true), 500);
                                } 
                            },
                            className: "px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        }, "🔄 Forçar Atualização")
                    )
                )
            ),
            
            // ==================== TAB CLIENTES API ====================
            p.configTab === "clientes-api" && "admin_master" === l.role && React.createElement(_ClientesApiAutoLoad, {p: p, x: x, ja: ja, API_URL: API_URL, getToken: getToken}),
            
            // ==================== TAB AUDITORIA ====================
            p.configTab === "auditoria" && ("admin_master" === l.role || "admin" === l.role) && 
                React.createElement(AuditLogs, { apiUrl: API_URL, showToast: ja }),


            // ==================== MODAL CATEGORIAS DE FRETE ====================
            p.modalCategorias && (function() {
                var mc = p.modalCategorias;
                var TODAS_CATS = [
                    {sigla: "M",  nome: "Motofrete"},
                    {sigla: "MC", nome: "Motofrete (Expresso)"},
                    {sigla: "U",  nome: "Carro Utilitário"},
                    {sigla: "UC", nome: "Carro Utilitário (Expresso)"},
                    {sigla: "D",  nome: "Tutts Fast"}
                ];
                var fecharModal = function() { x({...p, modalCategorias: null}); };
                var toggleCat = function(sigla) {
                    var ativas = mc.catsAtivas.slice();
                    var idx = ativas.indexOf(sigla);
                    if (idx >= 0) ativas.splice(idx, 1); else ativas.push(sigla);
                    x({...p, modalCategorias: {...mc, catsAtivas: ativas}});
                };
                var salvar = async function() {
                    x({...p, modalCategorias: {...mc, salvando: true}});
                    try {
                        var categorias = TODAS_CATS.filter(function(c) { return mc.catsAtivas.indexOf(c.sigla) >= 0; });
                        var resp = await fetch(API_URL + "/admin/solicitacao/clientes/" + mc.id + "/categorias", {
                            method: "PUT",
                            headers: {"Content-Type": "application/json", "Authorization": "Bearer " + getToken()},
                            body: JSON.stringify({categorias: categorias})
                        });
                        if (resp.ok) {
                            ja("✅ Categorias salvas!", "success");
                            x({...p, modalCategorias: null, clientesApiLista: null});
                        } else {
                            var err = await resp.json().catch(function() { return {}; });
                            ja("❌ " + (err.error || "Erro ao salvar"), "error");
                            x({...p, modalCategorias: {...mc, salvando: false}});
                        }
                    } catch (e) {
                        ja("❌ Erro de conexão", "error");
                        x({...p, modalCategorias: {...mc, salvando: false}});
                    }
                };
                return React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                    onClick: fecharModal
                },
                    React.createElement("div", {
                        className: "bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden",
                        onClick: function(e) { e.stopPropagation(); }
                    },
                        React.createElement("div", {className: "px-5 py-4 border-b flex items-center justify-between"},
                            React.createElement("div", null,
                                React.createElement("p", {className: "font-bold text-gray-800"}, "🏷️ Modalidades de frete"),
                                React.createElement("p", {className: "text-xs text-gray-500 mt-0.5"}, mc.nome, " — ative só o que este cliente pode solicitar")
                            ),
                            React.createElement("button", {onClick: fecharModal, className: "text-gray-400 hover:text-gray-600 text-lg leading-none"}, "✕")
                        ),
                        React.createElement("div", {className: "px-5 py-4 space-y-2"},
                            TODAS_CATS.map(function(cat) {
                                var ativa = mc.catsAtivas.indexOf(cat.sigla) >= 0;
                                return React.createElement("div", {
                                    key: cat.sigla,
                                    className: "flex items-center justify-between p-3 rounded-lg border " + (ativa ? "border-purple-200 bg-purple-50" : "border-gray-200 bg-gray-50")
                                },
                                    React.createElement("div", {className: "flex items-center gap-3"},
                                        React.createElement("span", {
                                            className: "text-xs font-bold px-2 py-0.5 rounded",
                                            style: ativa ? {background: "#EEEDFE", color: "#3C3489"} : {background: "#e5e7eb", color: "#9ca3af"}
                                        }, cat.sigla),
                                        React.createElement("span", {className: "text-sm " + (ativa ? "text-gray-800" : "text-gray-400")}, cat.nome)
                                    ),
                                    React.createElement("button", {
                                        onClick: function() { toggleCat(cat.sigla); },
                                        className: "relative w-9 h-5 rounded-full transition-colors flex-shrink-0 border-0",
                                        style: {background: ativa ? "#534AB7" : "#d1d5db"},
                                        "aria-label": "Toggle " + cat.sigla
                                    },
                                        React.createElement("span", {
                                            className: "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                                            style: {left: ativa ? "18px" : "2px"}
                                        })
                                    )
                                );
                            })
                        ),
                        React.createElement("div", {className: "px-5 py-3 bg-gray-50 border-t flex gap-3"},
                            React.createElement("button", {
                                onClick: fecharModal,
                                className: "flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-100"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvar,
                                disabled: mc.salvando,
                                className: "flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white " + (mc.salvando ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700")
                            }, mc.salvando ? "⏳ Salvando..." : "✅ Salvar")
                        )
                    )
                );
            })(),

            // ==================== MODAL EDITAR CLIENTE DE SOLICITAÇÃO ====================
            p.editarClienteSolicitacao && (function() {
                var ec = p.editarClienteSolicitacao;
                var temSenha = (ec.nova_senha || "").length > 0 || (ec.confirmar_senha || "").length > 0;
                var senhaValida = !temSenha || (ec.nova_senha.length >= 6 && ec.nova_senha === ec.confirmar_senha);
                var podeSalvar = ec.nome.trim() && ec.email.trim() && senhaValida && !ec.salvando;
                
                var atualizarCampo = function(campo, valor) {
                    x({...p, editarClienteSolicitacao: {...p.editarClienteSolicitacao, [campo]: valor, erro: ""}});
                };
                
                var fecharModal = function() {
                    x({...p, editarClienteSolicitacao: null});
                };
                
                var salvar = async function() {
                    if (!podeSalvar) return;
                    x({...p, editarClienteSolicitacao: {...p.editarClienteSolicitacao, salvando: true, erro: ""}});
                    try {
                        // 1. Atualizar dados gerais
                        var respDados = await fetch(API_URL + "/admin/solicitacao/clientes/" + ec.id, {
                            method: "PATCH",
                            headers: {"Content-Type": "application/json", "Authorization": "Bearer " + getToken()},
                            body: JSON.stringify({
                                nome: ec.nome.trim(),
                                email: ec.email.trim(),
                                empresa: ec.empresa.trim()
                            })
                        });
                        if (!respDados.ok) {
                            var dataErr = await respDados.json().catch(function() { return {}; });
                            x({...p, editarClienteSolicitacao: {...p.editarClienteSolicitacao, salvando: false, erro: dataErr.error || "Erro ao atualizar dados"}});
                            return;
                        }
                        
                        // 2. Atualizar senha se foi preenchida
                        if (temSenha) {
                            var respSenha = await fetch(API_URL + "/admin/solicitacao/clientes/" + ec.id + "/senha", {
                                method: "PATCH",
                                headers: {"Content-Type": "application/json", "Authorization": "Bearer " + getToken()},
                                body: JSON.stringify({nova_senha: ec.nova_senha})
                            });
                            if (!respSenha.ok) {
                                var dataErr2 = await respSenha.json().catch(function() { return {}; });
                                x({...p, editarClienteSolicitacao: {...p.editarClienteSolicitacao, salvando: false, erro: dataErr2.error || "Dados salvos, mas falhou ao trocar senha"}});
                                return;
                            }
                        }
                        
                        // 3. Atualizar grupo de endereços (pode ser "" = null = sem grupo)
                        var novoGrupo = ec.grupo_enderecos_id ? parseInt(ec.grupo_enderecos_id) : null;
                        var respGrupo = await fetch(API_URL + "/admin/solicitacao/clientes/" + ec.id + "/grupo", {
                            method: "PATCH",
                            headers: {"Content-Type": "application/json", "Authorization": "Bearer " + getToken()},
                            body: JSON.stringify({grupo_enderecos_id: novoGrupo})
                        });
                        if (respGrupo.ok) {
                            var dataG = await respGrupo.json().catch(function() { return {}; });
                            if (dataG.enderecos_migrados > 0) {
                                ja("✅ Cliente atualizado! " + dataG.enderecos_migrados + " endereço(s) migrado(s) pro grupo", "success");
                            } else {
                                ja("✅ Cliente atualizado!", "success");
                            }
                        } else {
                            ja("⚠️ Dados salvos, mas erro ao atribuir grupo", "warning");
                        }
                        
                        x({...p, editarClienteSolicitacao: null, clientesApiLista: null});
                    } catch (err) {
                        x({...p, editarClienteSolicitacao: {...p.editarClienteSolicitacao, salvando: false, erro: "Erro de conexão"}});
                    }
                };
                
                return React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                    onClick: fecharModal
                },
                    React.createElement("div", {
                        className: "bg-white rounded-xl shadow-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto",
                        onClick: function(e) { e.stopPropagation(); }
                    },
                        React.createElement("div", {className: "flex items-center justify-between mb-4"},
                            React.createElement("div", {className: "flex items-center gap-2"},
                                React.createElement("span", {className: "text-xl"}, "✏️"),
                                React.createElement("span", {className: "font-bold text-blue-700"}, "Editar Cliente")
                            ),
                            React.createElement("button", {
                                onClick: fecharModal,
                                className: "text-gray-400 hover:text-gray-600"
                            }, "✕")
                        ),
                        
                        // Seção: Dados gerais
                        React.createElement("div", {className: "mb-4"},
                            React.createElement("div", {className: "text-xs font-bold text-gray-500 uppercase mb-2"}, "📋 Dados"),
                            React.createElement("label", {className: "text-xs text-gray-600 font-medium"}, "Nome *"),
                            React.createElement("input", {
                                type: "text",
                                value: ec.nome,
                                onChange: function(e) { atualizarCampo("nome", e.target.value); },
                                className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 mb-2 focus:ring-2 focus:ring-blue-400 outline-none",
                                placeholder: "Nome do cliente"
                            }),
                            React.createElement("label", {className: "text-xs text-gray-600 font-medium"}, "Email *"),
                            React.createElement("input", {
                                type: "email",
                                value: ec.email,
                                onChange: function(e) { atualizarCampo("email", e.target.value); },
                                className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 mb-2 focus:ring-2 focus:ring-blue-400 outline-none",
                                placeholder: "cliente@email.com"
                            }),
                            React.createElement("label", {className: "text-xs text-gray-600 font-medium"}, "Empresa"),
                            React.createElement("input", {
                                type: "text",
                                value: ec.empresa,
                                onChange: function(e) { atualizarCampo("empresa", e.target.value); },
                                className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 mb-2 focus:ring-2 focus:ring-blue-400 outline-none",
                                placeholder: "Nome da empresa (opcional)"
                            }),
                            React.createElement("label", {className: "text-xs text-gray-600 font-medium"}, "📚 Grupo de Endereços"),
                            React.createElement("select", {
                                value: ec.grupo_enderecos_id || "",
                                onChange: function(e) { atualizarCampo("grupo_enderecos_id", e.target.value); },
                                className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                            },
                                React.createElement("option", {value: ""}, "— Sem grupo (individual) —"),
                                (ec.grupos_disponiveis || []).filter(function(g) { return g.ativo; }).map(function(g) {
                                    return React.createElement("option", {key: g.id, value: g.id}, g.nome + " (" + (g.total_clientes || 0) + " clientes, " + (g.total_enderecos || 0) + " endereços)");
                                })
                            ),
                            React.createElement("div", {className: "text-xs text-gray-500 mt-1"}, 
                                ec.grupo_enderecos_id 
                                    ? "💡 Este cliente vê e edita os endereços de todo o grupo"
                                    : "💡 Este cliente tem endereços próprios, não compartilha com ninguém"
                            )
                        ),
                        
                        // Seção: Senha (opcional)
                        React.createElement("div", {className: "mb-4 pt-3 border-t"},
                            React.createElement("div", {className: "text-xs font-bold text-gray-500 uppercase mb-2"}, "🔒 Alterar Senha (opcional)"),
                            React.createElement("div", {className: "text-xs text-gray-500 mb-2"}, "Deixe em branco para manter a senha atual"),
                            React.createElement("label", {className: "text-xs text-gray-600 font-medium"}, "Nova senha"),
                            React.createElement("div", {className: "relative mt-1 mb-2"},
                                React.createElement("input", {
                                    type: ec.mostrar_senha ? "text" : "password",
                                    value: ec.nova_senha,
                                    onChange: function(e) { atualizarCampo("nova_senha", e.target.value); },
                                    className: "w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none",
                                    placeholder: "Mínimo 6 caracteres",
                                    autoComplete: "new-password"
                                }),
                                React.createElement("button", {
                                    type: "button",
                                    onClick: function() { atualizarCampo("mostrar_senha", !ec.mostrar_senha); },
                                    className: "absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm"
                                }, ec.mostrar_senha ? "🙈" : "👁️")
                            ),
                            temSenha && React.createElement("label", {className: "text-xs text-gray-600 font-medium"}, "Confirmar senha"),
                            temSenha && React.createElement("input", {
                                type: ec.mostrar_senha ? "text" : "password",
                                value: ec.confirmar_senha,
                                onChange: function(e) { atualizarCampo("confirmar_senha", e.target.value); },
                                className: "w-full px-3 py-2 border rounded-lg text-sm mt-1 outline-none " +
                                    (temSenha && ec.nova_senha !== ec.confirmar_senha
                                        ? "border-red-300 bg-red-50"
                                        : temSenha && ec.nova_senha.length >= 6
                                            ? "border-green-300 bg-green-50"
                                            : "border-gray-300"),
                                placeholder: "Digite novamente",
                                autoComplete: "new-password"
                            }),
                            temSenha && ec.nova_senha.length > 0 && ec.nova_senha.length < 6 && React.createElement("div", {className: "text-xs text-red-600 mt-1"}, "⚠️ Mínimo 6 caracteres"),
                            temSenha && ec.nova_senha.length >= 6 && ec.confirmar_senha.length > 0 && ec.nova_senha !== ec.confirmar_senha && React.createElement("div", {className: "text-xs text-red-600 mt-1"}, "⚠️ Senhas não conferem"),
                            temSenha && ec.nova_senha.length >= 6 && ec.nova_senha === ec.confirmar_senha && React.createElement("div", {className: "text-xs text-green-600 mt-1"}, "✅ Senha OK")
                        ),
                        
                        ec.erro && React.createElement("div", {className: "mb-3 px-3 py-2 bg-red-100 text-red-700 rounded text-xs"}, "❌ ", ec.erro),
                        
                        React.createElement("div", {className: "flex gap-2"},
                            React.createElement("button", {
                                onClick: fecharModal,
                                className: "flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvar,
                                disabled: !podeSalvar,
                                className: "flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            }, ec.salvando ? "⏳ Salvando..." : "💾 Salvar")
                        )
                    )
                );
            })(),

            // ==================== MODAL CRIAR/EDITAR GRUPO DE ENDEREÇOS ====================
            p.editarGrupoEnderecos && (function() {
                var g = p.editarGrupoEnderecos;
                var podeSalvar = g.nome && g.nome.trim() && !g.salvando;
                
                var atualizar = function(campo, valor) {
                    x({...p, editarGrupoEnderecos: {...p.editarGrupoEnderecos, [campo]: valor, erro: ""}});
                };
                var fechar = function() { x({...p, editarGrupoEnderecos: null}); };
                
                var salvar = async function() {
                    if (!podeSalvar) return;
                    x({...p, editarGrupoEnderecos: {...p.editarGrupoEnderecos, salvando: true, erro: ""}});
                    try {
                        var url = g.id 
                            ? API_URL + "/admin/grupos-enderecos/" + g.id
                            : API_URL + "/admin/grupos-enderecos";
                        var method = g.id ? "PATCH" : "POST";
                        var resp = await fetch(url, {
                            method: method,
                            headers: {"Content-Type": "application/json", "Authorization": "Bearer " + getToken()},
                            body: JSON.stringify({nome: g.nome.trim(), descricao: g.descricao.trim(), ativo: g.ativo})
                        });
                        if (resp.ok) {
                            ja(g.id ? "✅ Grupo atualizado!" : "✅ Grupo criado!", "success");
                            x({...p, editarGrupoEnderecos: null, gruposEnderecosLista: null});
                        } else {
                            var dataErr = await resp.json().catch(function() { return {}; });
                            x({...p, editarGrupoEnderecos: {...p.editarGrupoEnderecos, salvando: false, erro: dataErr.error || "Erro ao salvar"}});
                        }
                    } catch {
                        x({...p, editarGrupoEnderecos: {...p.editarGrupoEnderecos, salvando: false, erro: "Erro de conexão"}});
                    }
                };
                
                return React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                    onClick: fechar
                },
                    React.createElement("div", {
                        className: "bg-white rounded-xl shadow-2xl w-full max-w-md p-5",
                        onClick: function(e) { e.stopPropagation(); }
                    },
                        React.createElement("div", {className: "flex items-center justify-between mb-4"},
                            React.createElement("div", {className: "flex items-center gap-2"},
                                React.createElement("span", {className: "text-xl"}, g.id ? "✏️" : "➕"),
                                React.createElement("span", {className: "font-bold text-purple-700"}, g.id ? "Editar Grupo" : "Novo Grupo de Endereços")
                            ),
                            React.createElement("button", {onClick: fechar, className: "text-gray-400 hover:text-gray-600"}, "✕")
                        ),
                        React.createElement("label", {className: "text-xs text-gray-600 font-medium"}, "Nome do Grupo *"),
                        React.createElement("input", {
                            type: "text",
                            value: g.nome,
                            onChange: function(e) { atualizar("nome", e.target.value); },
                            className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 mb-3 focus:ring-2 focus:ring-purple-400 outline-none",
                            placeholder: "Ex: Rede Goiânia, Filiais BA",
                            autoFocus: true
                        }),
                        React.createElement("label", {className: "text-xs text-gray-600 font-medium"}, "Descrição (opcional)"),
                        React.createElement("textarea", {
                            value: g.descricao,
                            onChange: function(e) { atualizar("descricao", e.target.value); },
                            className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mt-1 mb-3 focus:ring-2 focus:ring-purple-400 outline-none resize-none",
                            rows: 2,
                            placeholder: "Descreva este grupo..."
                        }),
                        g.id && React.createElement("label", {className: "flex items-center gap-2 mb-3 cursor-pointer"},
                            React.createElement("input", {
                                type: "checkbox",
                                checked: g.ativo,
                                onChange: function(e) { atualizar("ativo", e.target.checked); },
                                className: "w-4 h-4"
                            }),
                            React.createElement("span", {className: "text-sm"}, "Grupo ativo")
                        ),
                        g.erro && React.createElement("div", {className: "mb-3 px-3 py-2 bg-red-100 text-red-700 rounded text-xs"}, "❌ ", g.erro),
                        React.createElement("div", {className: "flex gap-2"},
                            React.createElement("button", {
                                onClick: fechar,
                                className: "flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvar,
                                disabled: !podeSalvar,
                                className: "flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                            }, g.salvando ? "⏳ Salvando..." : "💾 Salvar")
                        )
                    )
                );
            })(),

            // ==================== MODAL ALTERAR SENHA ====================
            p.senhaModal && p.senhaModalUser && (function() {
                var senha = p.senhaModalValue || "";
                var confirmar = p.senhaModalConfirm || "";
                var mostrar = p.senhaModalShow || false;
                var erro = p.senhaModalErro || "";
                var salvando = p.senhaModalSaving || false;
                var userName = p.senhaModalUser.fullName || p.senhaModalUser.full_name || "";
                var userCod = p.senhaModalUser.codProfissional || p.senhaModalUser.cod_profissional || "";

                // Validações
                var regras = [
                    { id: "min8", label: "Mínimo 8 caracteres", ok: senha.length >= 8 },
                    { id: "lower", label: "Pelo menos 1 letra minúscula (a-z)", ok: /[a-z]/.test(senha) },
                    { id: "upper", label: "Pelo menos 1 letra maiúscula (A-Z)", ok: /[A-Z]/.test(senha) },
                    { id: "number", label: "Pelo menos 1 número (0-9)", ok: /[0-9]/.test(senha) },
                    { id: "match", label: "Senhas coincidem", ok: senha.length > 0 && senha === confirmar }
                ];
                var todasOk = regras.every(function(r) { return r.ok; });
                var senhasComuns = ["12345678", "password", "senha123", "tutts123", "admin123"];
                var ehComum = senhasComuns.some(function(s) { return senha.toLowerCase() === s; });

                var fecharModal = function() {
                    x({...p, senhaModal: false, senhaModalUser: null, senhaModalValue: "", senhaModalConfirm: "", senhaModalShow: false, senhaModalErro: "", senhaModalSaving: false});
                };

                var salvarSenha = async function() {
                    if (!todasOk) return;
                    if (ehComum) {
                        x({...p, senhaModalErro: "Senha muito comum. Escolha uma mais segura."});
                        return;
                    }
                    x({...p, senhaModalSaving: true, senhaModalErro: ""});
                    try {
                        var response = await fetchAuth(API_URL + "/users/reset-password", {
                            method: "POST",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify({codProfissional: userCod, newPassword: senha})
                        });
                        if (response.ok) {
                            ja("✅ Senha de " + userName + " alterada com sucesso!", "success");
                            fecharModal();
                        } else {
                            var errData = await response.json().catch(function() { return {}; });
                            x({...p, senhaModalSaving: false, senhaModalErro: errData.error || "Erro ao alterar senha"});
                        }
                    } catch (err) {
                        x({...p, senhaModalSaving: false, senhaModalErro: "Erro de conexão. Tente novamente."});
                    }
                };

                return React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                    onClick: function(e) { if (e.target === e.currentTarget) fecharModal(); }
                },
                    React.createElement("div", {
                        className: "bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden",
                        onClick: function(e) { e.stopPropagation(); }
                    },
                        // Header do modal
                        React.createElement("div", {className: "bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 text-white"},
                            React.createElement("div", {className: "flex items-center justify-between"},
                                React.createElement("div", null,
                                    React.createElement("h3", {className: "text-lg font-bold"}, "🔑 Alterar Senha"),
                                    React.createElement("p", {className: "text-purple-200 text-sm mt-0.5"}, userName, " (", userCod, ")")
                                ),
                                React.createElement("button", {
                                    onClick: fecharModal,
                                    className: "w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                }, "✕")
                            )
                        ),

                        // Body do modal
                        React.createElement("div", {className: "px-6 py-5 space-y-4"},

                            // Campo nova senha
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1.5"}, "Nova Senha"),
                                React.createElement("div", {className: "relative"},
                                    React.createElement("input", {
                                        type: mostrar ? "text" : "password",
                                        value: senha,
                                        onChange: function(e) { x({...p, senhaModalValue: e.target.value, senhaModalErro: ""}); },
                                        onKeyDown: function(e) { if (e.key === "Enter") document.getElementById("tutts-senha-confirmar") && document.getElementById("tutts-senha-confirmar").focus(); },
                                        className: "w-full px-4 py-2.5 border-2 rounded-lg pr-12 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors " + (senha.length > 0 && !todasOk ? "border-orange-300" : senha.length > 0 && todasOk ? "border-green-300" : "border-gray-200"),
                                        placeholder: "Digite a nova senha",
                                        autoFocus: true
                                    }),
                                    React.createElement("button", {
                                        type: "button",
                                        onClick: function() { x({...p, senhaModalShow: !mostrar}); },
                                        className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                                    }, mostrar ? "🙈" : "👁️")
                                )
                            ),

                            // Campo confirmar senha
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1.5"}, "Confirmar Senha"),
                                React.createElement("input", {
                                    id: "tutts-senha-confirmar",
                                    type: mostrar ? "text" : "password",
                                    value: confirmar,
                                    onChange: function(e) { x({...p, senhaModalConfirm: e.target.value, senhaModalErro: ""}); },
                                    onKeyDown: function(e) { if (e.key === "Enter" && todasOk && !ehComum) salvarSenha(); },
                                    className: "w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors " + (confirmar.length > 0 && senha !== confirmar ? "border-red-300" : confirmar.length > 0 && senha === confirmar ? "border-green-300" : "border-gray-200"),
                                    placeholder: "Confirme a nova senha"
                                })
                            ),

                            // Gabarito de requisitos
                            React.createElement("div", {className: "bg-gray-50 rounded-xl p-4"},
                                React.createElement("p", {className: "text-xs font-bold text-gray-500 uppercase tracking-wide mb-2.5"}, "Requisitos da senha"),
                                React.createElement("div", {className: "space-y-1.5"},
                                    regras.map(function(regra) {
                                        return React.createElement("div", {
                                            key: regra.id,
                                            className: "flex items-center gap-2 text-sm transition-all " + (senha.length === 0 && regra.id !== "match" ? "text-gray-400" : regra.ok ? "text-green-600" : "text-red-500")
                                        },
                                            React.createElement("span", {className: "text-base flex-shrink-0 w-5 text-center"},
                                                senha.length === 0 && regra.id !== "match" ? "○" : regra.ok ? "✓" : "✗"
                                            ),
                                            React.createElement("span", {className: regra.ok ? "font-medium" : ""}, regra.label)
                                        );
                                    }),
                                    // Aviso senha comum
                                    ehComum && React.createElement("div", {className: "flex items-center gap-2 text-sm text-red-500 mt-1"},
                                        React.createElement("span", {className: "text-base flex-shrink-0 w-5 text-center"}, "✗"),
                                        React.createElement("span", {className: "font-medium"}, "Senha muito comum")
                                    )
                                )
                            ),

                            // Mensagem de erro
                            erro && React.createElement("div", {className: "bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm"}, "❌ ", erro)
                        ),

                        // Footer do modal
                        React.createElement("div", {className: "px-6 py-4 bg-gray-50 border-t flex gap-3"},
                            React.createElement("button", {
                                onClick: fecharModal,
                                className: "flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvarSenha,
                                disabled: !todasOk || ehComum || salvando,
                                className: "flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all " + (todasOk && !ehComum && !salvando ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm" : "bg-gray-200 text-gray-400 cursor-not-allowed")
                            }, salvando ? "⏳ Salvando..." : "✅ Alterar Senha")
                        )
                    )
                );
            })()
        ));
    };

    // Marcar que o módulo foi carregado
    window.ModuloConfigLoaded = true;
    console.log("✅ Módulo Config carregado com sucesso! (versão corrigida com abas)");

})();
