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

        var abrirProvedores = async function(cliente) {
            try {
                var resp = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + cliente.id + "/provedores");
                var data = resp.ok ? await resp.json() : { provedores: ['tutts'] };
                setEstado({...estado, modalProvedores: {
                    id: cliente.id, nome: cliente.nome,
                    selecionados: data.provedores || ['tutts'],
                    salvando: false
                }});
            } catch(e) { showToast("Erro ao carregar provedores", "error"); }
        };

        var abrirCadastroAdmin = function(user) {
            setEstado({
                ...estado,
                cadastroAdminModal: true,
                cadastroAdminUser: user,
                cadastroAdminFoto: null,
                cadastroAdminWhatsapp: user.whatsapp || "",
                cadastroAdminSalvando: false,
                cadastroAdminErro: ""
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
                    user.role === "user" && React.createElement("button", {
                        onClick: function() { abrirCadastroAdmin(user); },
                        title: "Preencher foto e WhatsApp pelo admin",
                        className: "px-3 py-2 rounded-lg text-xs font-semibold transition-colors " + (user.cadastro_completo ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100")
                    }, user.cadastro_completo ? "✅" : "📋"),
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
            // 2026-07: acesso total = lista vazia (irrestrito). Assim modulo novo
            // entra sozinho pros admins full, sem precisar re-salvar toda vez.
            if (allowedModules.length === MODULOS.length) allowedModules = [];
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
                var innerFetchAuth = innerProps.fetchAuth;
                // aliases
                var p = innerP; var x = innerX; var ja = innerJa;
                var API_URL = innerApiUrl; var getToken = innerGetToken;
                var fetchAuth = innerFetchAuth;
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
                                                : React.createElement("p", {className: "text-xs text-gray-400 mt-1 italic"}, "Nenhuma categoria configurada"),
                                            (function() {
                                                var provs = Array.isArray(cliente.provedores_habilitados) ? cliente.provedores_habilitados : [];
                                                var extras = provs.filter(function(p) { return p !== "tutts"; });
                                                if (extras.length === 0) return null;
                                                var INFO = {
                                                    uber: { label: "Uber Flash", logo: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiMwMDAiLz48dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMyIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlViZXI8L3RleHQ+PC9zdmc+" },
                                                    "99": { label: "99 Moto",    logo: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiNGRkQ3MDAiLz48dGV4dCB4PSIyMCIgeT0iMjciIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0iIzFhMWExYSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+OTk8L3RleHQ+PC9zdmc+" }
                                                };
                                                return React.createElement("div", {className: "flex flex-wrap gap-1 mt-1"},
                                                    extras.map(function(code) {
                                                        var info = INFO[code] || {label: code, bg: "#888", color: "white"};
                                                        return React.createElement("span", {
                                                            key: code,
                                                            className: "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                                            style: {background:code==="uber"?"#f3f3f3":"#fffbe6",color:code==="uber"?"#1a1a1a":"#7a5c00",border:"0.5px solid "+(code==="uber"?"#d1d5db":"#f0d060")}
                                                        },
                                                            React.createElement("img",{
                                                                src: info.logo,
                                                                style:{width:16,height:16,borderRadius:"50%",flexShrink:0,objectFit:"cover"}
                                                            }),
                                                            " " + info.label
                                                        );
                                                    })
                                                );
                                            })()
                                        ),
                                        React.createElement("div", {className: "flex items-center gap-2 flex-shrink-0"},
                                        React.createElement("span", {
                                            className: cliente.ativo ? "px-2 py-1 bg-green-100 text-green-700 rounded text-xs" : "px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                                        }, cliente.ativo ? "✅ Ativo" : "❌ Inativo"),
                                        React.createElement("button", {
                                            onClick: async function() {
                                                if (!confirm("Desativar/ativar este cliente?")) return;
                                                try {
                                                    var respSt = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + cliente.id + "/status", {
                                                        method: "PATCH",
                                                        body: JSON.stringify({ativo: !cliente.ativo})
                                                    });
                                                    if (!respSt.ok) { ja("❌ Erro ao alterar status", "error"); return; }
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
                                            onClick: function() {
                                                x({...p, modalPerfilMensagem: {
                                                    id: cliente.id,
                                                    nome: cliente.nome || "",
                                                    nome_remetente: cliente.nome_remetente || "",
                                                    package_type: cliente.package_type || "",
                                                    package_weight: cliente.package_weight || "",
                                                    aviso_entregador: cliente.aviso_entregador || "",
                                                    salvando: false
                                                }});
                                            },
                                            title: "Mensagem pro entregador (99)",
                                            className: "px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                                        }, "💬"),
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
                                                try {
                                                    var rp = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + cliente.id + "/provedores");
                                                    var dp = rp.ok ? await rp.json() : {provedores: ['tutts']};
                                                    x({...p, modalProvedores: {id: cliente.id, nome: cliente.nome, selecionados: dp.provedores || ['tutts'], salvando: false}});
                                                } catch(e) { ja("Erro ao carregar provedores", "error"); }
                                            },
                                            title: "Configurar provedores logísticos",
                                            className: "px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200"
                                        }, "🚚"),
                                        (function() {
                                            var provs = Array.isArray(cliente.provedores_habilitados) ? cliente.provedores_habilitados : [];
                                            var temHub = provs.some(function(pv) { return pv !== "tutts"; });
                                            if (!temHub) return null;
                                            var pj = cliente.preco_hub;
                                            if (typeof pj === "string") { try { pj = JSON.parse(pj); } catch (e) { pj = null; } }
                                            var temPreco = pj && pj.valor_fixo != null;
                                            return React.createElement("button", {
                                                key: "preco-hub",
                                                onClick: function() {
                                                    x({...p, modalPreco: {
                                                        id: cliente.id,
                                                        nome: cliente.nome,
                                                        ativo: pj ? (pj.ativo !== false) : true,
                                                        valor_fixo: pj && pj.valor_fixo != null ? String(pj.valor_fixo) : "",
                                                        km_base: pj && pj.km_base != null ? String(pj.km_base) : "",
                                                        valor_km_adicional: pj && pj.valor_km_adicional != null ? String(pj.valor_km_adicional) : "",
                                                        salvando: false
                                                    }});
                                                },
                                                title: "Preço do Hub (por cliente)",
                                                className: "px-2 py-1 rounded text-xs " + (temPreco ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200")
                                            }, "💰");
                                        })(),
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
                                                    var resp = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + cliente.id, {
                                                        method: "DELETE"
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
            p.configTab === "clientes-api" && "admin_master" === l.role && React.createElement(_ClientesApiAutoLoad, {p: p, x: x, ja: ja, API_URL: API_URL, getToken: getToken, fetchAuth: fetchAuth}),
            
            // ==================== TAB AUDITORIA ====================
            p.configTab === "auditoria" && ("admin_master" === l.role || "admin" === l.role) && 
                React.createElement(AuditLogs, { apiUrl: API_URL, showToast: ja }),

            // ==================== TAB SAÚDE DO SISTEMA ====================
            // 🆕 v4 (2026-05-26): monitor de agentes RPA + botão de restart
            p.configTab === "saude-sistema" && "admin_master" === l.role && 
                React.createElement(window.SaudeSistemaView, { 
                    apiUrl: API_URL, 
                    fetchAuth: fetchAuth, 
                    showToast: ja, 
                    usuario: l 
                }),


            // ==================== MODAL CATEGORIAS DE FRETE ====================
            p.modalCategorias && (function() {
                var mc = p.modalCategorias;
                var TODAS_CATS = [
                    {sigla: "M",  nome: "Motofrete"},
                    {sigla: "MC", nome: "Motofrete (Expresso)"},
                    {sigla: "DC", nome: "Motofrete C"},
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

            // Modal — Provedores logísticos por cliente
            p.modalProvedores && (function() {
                var mp = p.modalProvedores;
                var PROVEDORES = [
                    {code: "tutts", nome: "Tutts",      desc: "provedor padrão — sempre ativo", fixo: true},
                    {code: "uber",  nome: "Uber Flash",  desc: "entregas expressas via Uber",    fixo: false},
                    {code: "99",    nome: "99 Moto",     desc: "entregas via 99",                fixo: false}
                ];
                var toggle = function(code) {
                    if (code === "tutts") return; // não pode desmarcar tutts
                    var atual = mp.selecionados || ['tutts'];
                    var novo = atual.includes(code)
                        ? atual.filter(function(c) { return c !== code; })
                        : [...atual, code];
                    if (!novo.includes("tutts")) novo = ["tutts", ...novo];
                    x({...p, modalProvedores: {...mp, selecionados: novo}});
                };
                var salvar = async function() {
                    x({...p, modalProvedores: {...mp, salvando: true}});
                    try {
                        var resp = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + mp.id + "/provedores", {
                            method: "PUT",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify({provedores: mp.selecionados})
                        });
                        var data = await resp.json().catch(function() { return {}; });
                        if (resp.ok) {
                            ja("✅ Provedores salvos!", "success");
                            x({...p, modalProvedores: null});
                        } else {
                            ja("❌ " + (data.error || "Erro"), "error");
                            x({...p, modalProvedores: {...mp, salvando: false}});
                        }
                    } catch(e) {
                        ja("Erro de conexão", "error");
                        x({...p, modalProvedores: {...mp, salvando: false}});
                    }
                };
                return React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                    onClick: function() { if (!mp.salvando) x({...p, modalProvedores: null}); }
                },
                    React.createElement("div", {
                        className: "bg-white rounded-2xl shadow-2xl w-full max-w-sm",
                        onClick: function(e) { e.stopPropagation(); }
                    },
                        React.createElement("div", {className: "px-5 py-4 border-b flex items-center justify-between"},
                            React.createElement("div", null,
                                React.createElement("p", {className: "font-bold text-gray-800"}, "🚚 Provedores logísticos"),
                                React.createElement("p", {className: "text-xs text-gray-500 mt-0.5"}, mp.nome, " — ative só os que este cliente pode usar")
                            ),
                            React.createElement("button", {
                                onClick: function() { if (!mp.salvando) x({...p, modalProvedores: null}); },
                                className: "text-gray-400 hover:text-gray-600 text-lg"
                            }, "✕")
                        ),
                        React.createElement("div", {className: "px-5 py-4 space-y-2"},
                            PROVEDORES.map(function(prov) {
                                var ativo = (mp.selecionados || ['tutts']).includes(prov.code);
                                return React.createElement("div", {
                                    key: prov.code,
                                    onClick: function() { toggle(prov.code); },
                                    className: "flex items-center justify-between p-3 border rounded-xl transition-colors " +
                                        (prov.fixo ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200" :
                                        ativo ? "bg-purple-50 border-purple-200 cursor-pointer" :
                                        "bg-gray-50 border-gray-200 cursor-pointer hover:bg-gray-100")
                                },
                                    React.createElement("div", {className: "flex items-center gap-3"},
                                        React.createElement("div", {
                                            className: "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0",
                                            style: {
                                                background: prov.code === "tutts" ? "#7c3aed" :
                                                           prov.code === "uber"  ? "#1a1a1a" : "#FFD700",
                                                color: prov.code === "99" ? "#1a1a1a" : "white"
                                            }
                                        },
                                            prov.code === "tutts"
                                                ? React.createElement("img", {
                                                    src: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/7QCEUGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAGgcAigAYkZCTUQwYTAwMGFiODAxMDAwMDI2MDMwMDAwOWMwNDAwMDA2YTA1MDAwMDBlMDcwMDAwZjcwODAwMDBhYzBiMDAwMDA1MGMwMDAwZTQwYzAwMDBkNDBkMDAwMGQ0MTAwMDAwAP/bAIQABQYGCwgLCwsLCw0LCwsNDg4NDQ4ODw0ODg4NDxAQEBEREBAQEA8TEhMPEBETFBQTERMWFhYTFhUVFhkWGRYWEgEFBQUKBwoICQkICwgKCAsKCgkJCgoMCQoJCgkMDQsKCwsKCw0MCwsICwsMDAwNDQwMDQoLCg0MDQ0MExQTExOc/8IAEQgAlgCWAwEiAAIRAQMRAf/EAIMAAQABBQEBAAAAAAAAAAAAAAAHAgMEBQYBCBAAAQMBBQMIBAwGAwAAAAAAAQACAxEEBRIhMSJBURATIGFxgZGxMDJS4QYUFSNAYGJyodHw8TOCkrLB0kJDwhEBAAEDAgUDBAMBAAAAAAAAAREAITFBUWFxgZGhsdHwECDB4TBAYPH/2gAMAwEAAgADAAAAAY7HRbgAAAAAAABIkdyIR2AAAAAAAABIkdyIR2AdrRTxS/VV7jFfvtC/V55jOy46nzx0eK80xsaqtcycYSJHcie+x2DsZsiXd6zB1soQFMnnkAd3wEyZeTRvI+lXCxbUL6zYZV+fOH3fz/j2pjzNpRbo18Id7wOflJEjuRMm/HYJnxeT6rW4fPShAcmVe6GYIf29FPIT78xSncq4Hq9fp71yW4ckrhLVGy2mdepp6P5/2+oyLyRI7kTIvR2Do/eb22iysLGkX3X3I5dxYzrXHOvu1U8W73g8ujwy8+i50mJt+O2Os5PfaHe4qRI7kTb48dgA93miY1XfbeKpG4jP2XtLmMmjRdBq9jRcp5nQ9Fj7PCsOswqqS/SkSO5E9R2AAB1/IMG51eDolj3JxjZWgrAAJEjuRCOwAAAAAAAAJEjuRCO0iCO0iCO0iCO0iCO0iCO0iCO0iCO0iCO0iCO5ED//2gAIAQEAAQUC+sVhuszB0bmoROPIBVOjc1RxukdbLtMDSKKw2F1pNqsxiem2WVyfE5nRuuzRzPllZC29rYydopExzsRuOOst+ybF2WaONktvhjLMFpna1sLbwvGJ0N1Xe0NlvqJjn3tA6PoXFHWS/pNm74+cnvSTBArijpHfclZrFHzcNpk5yS7o8c96yYIFd9qZLHNdcEpt908w3oXEykV7WKWd9zClot9l+MRx3JMTDCIWTfP2mQEtnsUsAuJlZL2s0k7DZZBJNc80asItgfesoZB0LDeLrKnX+1Nnc17L+FLRfUkiN/5NcWmO/hS8Lz+MixWx1md8vtUlveZo7+T7+arVa32g9BkzZE+xJ0Tm+ihjDyLExTxMjZ0YbSWKOZsidCxyNiYviAXyeF8ntXxOMcrIXPTLEo5muNsfV3TjtjmplrY5DlcKgWFgTYWNUszY1NaDIo3lhJr6Kztws5ZLSxiktrj6b4+1G8E63PKdK531V//aAAgBAwABPwH6K5wbmVXkqmuDtFjFaVzVehKMTwK+5StpgYP1VTmjT4J+TG9abFgBNc6KCLFtHcUSMRx1ULW54TryuY8PJAqpY3VDgpGSOpXwU0ZOGmdEQ5zDXIqEPFRTs7UcZyLAetQx4Bysla7KQfzjXv4o2OubH1H63hGyvHDxXxZ/D8VJEWUrvQFdM1BCB/EaATpXU9ytJGIgAADLLoMeW6GigmL6g7t/I9rdXU70+1BuTB36BF5JxVz49JkpZWm9Gd5/5f4RNfpP/9oACAECAAE/Afor3hgqVXr5Kpjw7MLnBXDXNE06lXlnbjlDa+7ep46GOMfrEVanYWHryUmzEzP1s6cf1kmQCJrjU1w59XYrLBj2iTkfFFwL3c7Xq6vcrM1oBLDWvHdyuY8PL2jFXQ7qFWiJ+IPbnp3EKWOWSlR3DcrTC44MIrhFEQ98ZBFHHcrMJGgtwgDOleP5ImUihjDutWaLm20OpzPLaLDNBV9jfh3mzuzjP3K+r2ZDrTfhMYzgtFmLHDXD/q7/AGTPhLZTq5ze1h/81R+EdkH/AGE/yO/yFd96R23nObDqR0qXACuKumZ4KSRsYq9wYOLjQfir1vGSQudZJ5HMYPnMLaMZuyfkTX9irkjeIGule57pdvaJdQH1Rn1Z9/QtNjitApLGH9uo7DqO5X7c8Vja18bnbbqYDnuqSDrllx115LDNaRWOzl+1qIxn4jMKyfB2WYh9rkP3cWN57XZgd1VHZI42c02MBhFC3jXWvGvXmgKZcOjbbuiteDnWl2CtKOI1pXTsUdyWVmkDT96r/wC4kJkbWCjWho4AUHgPpP8A/9oACAEBAAY/AvrFjfVrKZU1d2LNpHaKL1XeB5Ms1m0jtFEGtFSVHTE9zq4qDIcnBg1d+t6eAHYWnUjkyjef5Stppb2inR2zpoz2vcquOFqYyN2Laz8h5rqY3+0Injn4ou9lvmmM9p1fD91iYcZdq/j7kWueARuzRL3YWucT+OQVBstaE9rH1c7Lf3/ghK8Vc7MdQ/NFtHOpvFKeacdfsOGvRc72W+f7KNnE18P3UY66/wBOak6xTx5HO9p3kgPYb55qNv2R+Ke7i4qMddf6c0/r2fH3cjACMTWgFu/JVw0J3tNPcsbHYmjUHUdFzvad5JpYMQDaagZ1VDrhd45IsBodR3LawtHGtUGN0CP2pKd1aIga0NFV7aCtNQU93st8z7k0Mzo6pHcuaw7fDtWzt/d1TRt4K549Kd6f9rZHf0S0txN1poQVlGe8hc43J1arajNeo5LY+bHifFfws/ve5AjUZrbjNeooNDMIBrqsQzB1C/hu8QuebsnhrktuP+k/mtmM16yB+aq/uG4dHDJr7S2T4rMeioXUW8o5Z7ulTULI9yzaFvHevWK9Y+C9YrSvfy5BbZ8PzWEblT2fP0Ge15rWnb0COK3lZNCz8FwHBVCr6JvZ59DWvZmtnZ8/TeqVk38VuCzcT9Vf/9oACAEBAQE/If8ARJ7xblG7TjrpvQEl8T1FDSMOEY9Po7gKdAl7FXArdPUU6bGD5jdrfQQMUQEE665pEiQmRs1Z95+o39GtSFdBmDWYjr9CZJ3IPSvP9er7Yqc3XsCVXENteWYRggnTgWq/uygOY1A1VEZ+h+ikRy1c1NbfP3ceg1FKyLkfegcWgIsbhNwOnesvMoKJvobULm7IZZsNlIu4qOgtyAuvu0OIgAMFNRxUTi2W5pW3ZnTSixOohcMxIWsmIbxOCLibulLLtyx9mx8HV+yqPeb5GPWm0RPy/RUu1I9cek/TlGdD7rW3I97niK4ISc7ny1xXpym3itrifkPyCuIyDrh9X0vMQCxEY2tZpw1fKJLrHspUZgCw6yWTex9u6SnQh6rR39kCRcpm1TVkBHAy8TSGEojid3OomtXc9A/MUUkHBu7rxW9LhjPQPgqyKi2DFqMT6ByInRdq5aBz9qgFyuAJJBm1poQrqFw4TkkiLtJyA7qB0Ye00rgwZuPumMRUjZMG77CX7b6g5Nwid9moF+8EeJqZkDO11k5XivDDeqE81ahyGXsg6HWpEEIWcJqoUMB4jM96hOIpQ9G55rU8GyVhNCNagaEh7Sc9EqzrbWO/6pWQ8GjAiGcz0o4uzuEdvc1DueCPEql9jDbke7f7C1FgmzDu6PinzNwse+KzOcdO+P4uVltn8UDL1o9CngMrKVZeu33Xdy3JyaI1tVntWUHGIfFLx0PdNOn2Br/lPejUXsUXaobr8RT9MlvHB3aMv0fyoquxzo6W1qOOMub9feMXLNWa1xt3e9b07WecUhuMnD634iCScazD1o9Kwo4xL5oC++gy9Ks3RfneheY3xTJWVl6/xRPm9X2ZCba57eatIhvn2FKt266/ygAFniV+x9hWC6JPrXrcW7Y/yv8A/9oADAMBAQIBAwEAABAIIIIIIIIIIIIIIIIIIIIIIwgoYUYsII2laGGpDkIRbpJ30REsJDacgwMDyIIIIEFRT1GIIIIJBGMIIIIIIIIIIIIIIIIIIIIIIIL/2gAIAQMBAT8Q/qmSQetQ3O/0hEzbehJUl/Fq4CXT5rSDKHO1DOL/AFu6i35MUK5jurmaB85VZ5iapv8ALUU8le7a2oLx0OMXvSujBp+qIJEWunD68BKnH4phMwHRPxVhDkS3OrcwMRQABdPk5oFCAKn4t0qFsDD3qwOVl+uRe2D8ONEICYn4eK0RcvdFcAdHvVxDKwzjpxp3AVsEtFgsZp5mBHwp2khAlM4426fYvLeh5mGnwFkwt4pKscLDQaH0dg18VPjcjZGI2pZ+29MWTYcc61x0j0Ulyq7t/wCz/9oACAECAQE/EP6s4YPK7HGo5hHP6RiZINZtQssl/DGNqu4IEpt++FDknMxQG4zy+tyUW/JHSiqZ0GHX9TVh1FULxR+Roov1xXvXbBUPAH1A0/hCaUZ8B0q3b5L1jRoEKoFQAf8ABfRXyWnOt0D6lsd8QDdnAFN9VND47dU12E2U4zhj8YUhD2KOBYlpTIaUoLck70CpiL9tQwynPVgpPhM3MMk2ic32IFPRHYY6wrYGmkJWDCxDKiKgbzFiSWFCA5hX/ALgqHq8qSo5BsbNxDLcoAAgEAYAwcvtsKLXiMkThyq/qcXi8BUA3wYuwf2f/9oACAEBAQE/EP8ARQKRYrRRAOezbQOQLCNO0gTRa+ZCHBINJFmyaUMxSc3IFaHkJiDTtIE04E485XAMpYM1+yAeyUvoTBSBmQBBNEbjUJncsseuGmMtArLXzfWEx21fSZc4UXJspOPhtYH2zFsBuWAWOZzqoyK6hhNgAvQKADhRjqI7CtE3Pl2p5ibAvLUl6Bywq4udkP0e1DZHMwQ7E82aQFXvCDcmVcIzwOs2gCTvi1h5Gu6l3LQudqMoslB9RhZPMVuyI3TlYCwMYIOscqndsp1wXTAsKmGCSsYJcHA0+ycjD15Bj6Mb46VbWQ8gfWKuJHSKfn9EvZj9PX2pHrtDoUu5b1yr1SddZ4yrcT1UKDLo6aNC3oYyBwF8ZVwetKrR1QjLKsDj4gYjeLcGeX2H+IAyjYgkSLwaRkbUISH9gx7KXjA8vsQvAUnTNCJY2Bw13mpnnEZG/EBXOobPbBUSGjj1LOkYrV8NRNqlxUbOj8lqd6ImTIsiCy5hNO2BW0B4gGhRQwhvJz+7oVIeDH3h4UAs51P4m32BNC392LoUGIE9Br5TRYOsDky4WcRCRqVDx4Xkp4VC1afNhcUChMgjIaI5jRNMV1MyMoiUIZLb2eRNCcMM2RYAHM0rkjiE0kXSMMOtqfiLdVBHEOgNoLBfsqHN5QXaSo3D6gQmWJlq3ML3dZF9iUIwlxNErTQms5Hcyo9ifkG7sVi34J7E+X8T2RtGF+0tj6152DQtQyzcC+gL90PzG9i5NqyQ4AeermSVlW2eVBr82g8KLw+ftqKKF8AfiaNRQV0gS0IVixNuWn0xTbj0QrRIXbR1Pwdaf1gxoS7ci19anVY9S9oHf73YiGEYTkl6jAN/0DPR1qFHg30J8ihQCYUI8ktRU0LqCuQhEnGvLST4T5rOZu8qTXlCH4hxYK8/7PP/AMVCPftchIR4UrsqTdUv8WkrB817/pNLUsAPzCzrSd+BN/QOtOqNwplea3/lsYQMOCPpOYD1l3b6VjQ2V4I8P8r/AP/Z",
                                                    style: {width:"100%", height:"100%", objectFit:"contain", padding:"2px"}
                                                  })
                                                : React.createElement("img", {
                                                    src: prov.code === "uber" ? "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiMwMDAiLz48dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMyIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlViZXI8L3RleHQ+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiNGRkQ3MDAiLz48dGV4dCB4PSIyMCIgeT0iMjciIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0iIzFhMWExYSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+OTk8L3RleHQ+PC9zdmc+",
                                                    style: {width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%"}
                                                  })
                                        ),
                                        React.createElement("div", null,
                                            React.createElement("p", {className: "text-sm font-medium text-gray-800"}, prov.nome),
                                            React.createElement("p", {className: "text-xs text-gray-500"}, prov.desc)
                                        )
                                    ),
                                    React.createElement("input", {
                                        type: "checkbox",
                                        checked: ativo,
                                        disabled: prov.fixo,
                                        readOnly: true,
                                        className: "w-4 h-4",
                                        style: {accentColor: "#7c3aed"}
                                    })
                                );
                            })
                        ),
                        React.createElement("div", {className: "px-5 py-3 bg-gray-50 border-t flex gap-3"},
                            React.createElement("button", {
                                onClick: function() { if (!mp.salvando) x({...p, modalProvedores: null}); },
                                disabled: mp.salvando,
                                className: "flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvar,
                                disabled: mp.salvando,
                                className: "flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 " +
                                    (mp.salvando ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700")
                            }, mp.salvando ? "⏳ Salvando..." : "✅ Salvar")
                        )
                    )
                );
            })(),

            // Modal — Mensagem pro entregador (99) por cliente API
            p.modalPerfilMensagem && (function() {
                var pm = p.modalPerfilMensagem;
                var up = function(campo, val) { x({...p, modalPerfilMensagem: {...pm, [campo]: val}}); };
                var fechar = function() { if (!pm.salvando) x({...p, modalPerfilMensagem: null}); };
                var TIPOS = [
                    {v: "", label: "Global (padrao)"},
                    {v: "medication", label: "Medicamentos"},
                    {v: "documents", label: "Documentos"},
                    {v: "food", label: "Alimentos"},
                    {v: "groceries", label: "Mantimentos"},
                    {v: "electronics", label: "Eletronicos"},
                    {v: "apparel", label: "Vestuario"},
                    {v: "others", label: "Outros"}
                ];
                var PESOS = [
                    {v: "", label: "Global (padrao)"},
                    {v: "1kg", label: "Ate 1kg"},
                    {v: "5kg", label: "Ate 5kg"},
                    {v: "10kg", label: "Ate 10kg"},
                    {v: "20kg", label: "Ate 20kg"},
                    {v: "30kg", label: "Ate 30kg"}
                ];
                var salvar = async function() {
                    x({...p, modalPerfilMensagem: {...pm, salvando: true}});
                    try {
                        var resp = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + pm.id + "/perfil-mensagem", {
                            method: "PATCH",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify({
                                nome_remetente: (pm.nome_remetente || "").trim(),
                                package_type: pm.package_type || "",
                                package_weight: pm.package_weight || "",
                                aviso_entregador: (pm.aviso_entregador || "").trim()
                            })
                        });
                        var data = await resp.json().catch(function() { return {}; });
                        if (resp.ok) {
                            ja("✅ Mensagem salva!", "success");
                            x({...p, modalPerfilMensagem: null, clientesApiLista: null});
                        } else {
                            ja("❌ " + (data.error || "Erro"), "error");
                            x({...p, modalPerfilMensagem: {...pm, salvando: false}});
                        }
                    } catch (e) {
                        ja("Erro de conexão", "error");
                        x({...p, modalPerfilMensagem: {...pm, salvando: false}});
                    }
                };
                return React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                    onClick: fechar
                },
                    React.createElement("div", {
                        className: "bg-white rounded-2xl shadow-2xl w-full max-w-md",
                        onClick: function(e) { e.stopPropagation(); }
                    },
                        React.createElement("div", {className: "px-5 py-4 border-b flex items-center justify-between"},
                            React.createElement("div", null,
                                React.createElement("p", {className: "font-bold text-gray-800"}, "💬 Mensagem pro entregador (99)"),
                                React.createElement("p", {className: "text-xs text-gray-500 mt-0.5"}, pm.nome, " — em branco usa o global")
                            ),
                            React.createElement("button", {
                                onClick: fechar,
                                className: "text-gray-400 hover:text-gray-600 text-lg"
                            }, "✕")
                        ),
                        React.createElement("div", {className: "px-5 py-4 space-y-3"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-xs text-gray-600 mb-1"}, "Nome do remetente"),
                                React.createElement("input", {
                                    type: "text",
                                    value: pm.nome_remetente || "",
                                    onChange: function(e) { up("nome_remetente", e.target.value); },
                                    maxLength: 100,
                                    placeholder: "vazio = usa o global",
                                    className: "w-full px-3 py-2 border rounded-lg text-sm"
                                })
                            ),
                            React.createElement("div", {className: "grid grid-cols-2 gap-3"},
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-xs text-gray-600 mb-1"}, "Tipo de transporte"),
                                    React.createElement("select", {
                                        value: pm.package_type || "",
                                        onChange: function(e) { up("package_type", e.target.value); },
                                        className: "w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                    }, TIPOS.map(function(t) { return React.createElement("option", {key: t.v, value: t.v}, t.label); }))
                                ),
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-xs text-gray-600 mb-1"}, "Peso da mercadoria"),
                                    React.createElement("select", {
                                        value: pm.package_weight || "",
                                        onChange: function(e) { up("package_weight", e.target.value); },
                                        className: "w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                    }, PESOS.map(function(w) { return React.createElement("option", {key: w.v, value: w.v}, w.label); }))
                                )
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-xs text-gray-600 mb-1"}, "Observacao sobre o transporte (" + (pm.aviso_entregador || "").length + "/127)"),
                                React.createElement("textarea", {
                                    value: pm.aviso_entregador || "",
                                    onChange: function(e) { up("aviso_entregador", e.target.value.slice(0, 127)); },
                                    maxLength: 127,
                                    rows: 2,
                                    placeholder: "vazio = usa o aviso global",
                                    className: "w-full px-3 py-2 border rounded-lg text-sm resize-y"
                                })
                            )
                        ),
                        React.createElement("div", {className: "px-5 py-3 bg-gray-50 border-t flex gap-3"},
                            React.createElement("button", {
                                onClick: fechar,
                                disabled: pm.salvando,
                                className: "flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvar,
                                disabled: pm.salvando,
                                className: "flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 " +
                                    (pm.salvando ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700")
                            }, pm.salvando ? "⏳ Salvando..." : "✅ Salvar")
                        )
                    )
                );
            })(),

            // Modal — Preço do Hub por cliente (valor fixo / km base / km adicional)
            p.modalPreco && (function() {
                var mp = p.modalPreco;
                var up = function(campo, val) { x({...p, modalPreco: {...mp, [campo]: val}}); };
                var vf  = parseFloat(String(mp.valor_fixo).replace(",", ".")) || 0;
                var kb  = parseFloat(String(mp.km_base).replace(",", ".")) || 0;
                var vkm = parseFloat(String(mp.valor_km_adicional).replace(",", ".")) || 0;
                var brl = function(n) { return n.toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2}); };
                var fechar = function() { if (!mp.salvando) x({...p, modalPreco: null}); };
                var salvar = async function(limpar) {
                    x({...p, modalPreco: {...mp, salvando: true}});
                    try {
                        var body = limpar
                            ? {limpar: true}
                            : {ativo: mp.ativo !== false,
                               valor_fixo: mp.valor_fixo === "" ? null : parseFloat(String(mp.valor_fixo).replace(",", ".")),
                               km_base: mp.km_base === "" ? null : parseFloat(String(mp.km_base).replace(",", ".")),
                               valor_km_adicional: mp.valor_km_adicional === "" ? null : parseFloat(String(mp.valor_km_adicional).replace(",", "."))};
                        var resp = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + mp.id + "/preco-hub", {
                            method: "PUT",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify(body)
                        });
                        var data = await resp.json().catch(function() { return {}; });
                        if (resp.ok) {
                            ja(limpar ? "🧹 Preço removido (herda global)" : "✅ Preço salvo!", "success");
                            x({...p, modalPreco: null, clientesApiLista: null});
                        } else {
                            ja("❌ " + (data.error || "Erro"), "error");
                            x({...p, modalPreco: {...mp, salvando: false}});
                        }
                    } catch (e) {
                        ja("Erro de conexão", "error");
                        x({...p, modalPreco: {...mp, salvando: false}});
                    }
                };
                var campo = function(label, chave, hint) {
                    return React.createElement("div", null,
                        React.createElement("label", {className: "block text-[11px] font-semibold tracking-wide text-gray-500 mb-1 uppercase"}, label),
                        React.createElement("input", {
                            type: "number", step: "0.10", value: mp[chave],
                            onChange: function(e) { up(chave, e.target.value); },
                            className: "w-full px-2 py-2 border rounded-lg text-sm"
                        }),
                        React.createElement("span", {className: "block text-[10px] text-gray-400 mt-1"}, hint)
                    );
                };
                return React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                    onClick: fechar
                },
                    React.createElement("div", {
                        className: "bg-white rounded-2xl shadow-2xl w-full max-w-md",
                        onClick: function(e) { e.stopPropagation(); }
                    },
                        React.createElement("div", {className: "px-5 py-4 border-b flex items-center justify-between"},
                            React.createElement("div", null,
                                React.createElement("p", {className: "font-bold text-gray-800"}, "💰 Preço do Hub"),
                                React.createElement("p", {className: "text-xs text-gray-500 mt-0.5"}, mp.nome, " — tabela por distância deste cliente")
                            ),
                            React.createElement("button", {onClick: fechar, className: "text-gray-400 hover:text-gray-600 text-lg"}, "✕")
                        ),
                        React.createElement("div", {className: "px-5 py-4"},
                            React.createElement("label", {className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4 cursor-pointer"},
                                React.createElement("input", {
                                    type: "checkbox", checked: mp.ativo !== false,
                                    onChange: function(e) { up("ativo", e.target.checked); },
                                    className: "w-4 h-4", style: {accentColor: "#7c3aed"}
                                }),
                                React.createElement("span", {className: "text-sm text-gray-700"}, "Usar tabela própria deste cliente",
                                    React.createElement("span", {className: "block text-[11px] text-gray-400"}, "Desligado: herda a tabela global"))
                            ),
                            React.createElement("div", {className: "grid grid-cols-3 gap-3 mb-4"},
                                campo("Valor fixo (R$)", "valor_fixo", "cobrado até a base"),
                                campo("Distância base (km)", "km_base", "km inclusos"),
                                campo("Por km adic. (R$)", "valor_km_adicional", "a partir do excedente")
                            )
                        ),
                        React.createElement("div", {className: "px-5 py-3 bg-gray-50 border-t flex gap-3"},
                            React.createElement("button", {
                                onClick: function() { if (!mp.salvando) salvar(true); },
                                disabled: mp.salvando,
                                className: "px-3 py-2 border border-gray-300 text-gray-500 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                            }, "🧹 Limpar"),
                            React.createElement("button", {
                                onClick: fechar, disabled: mp.salvando,
                                className: "flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: function() { salvar(false); }, disabled: mp.salvando,
                                className: "flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 " +
                                    (mp.salvando ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700")
                            }, mp.salvando ? "⏳ Salvando..." : "✅ Salvar")
                        )
                    )
                );
            })(),

            // Modal — Admin preenche cadastro do motoboy (foto + WhatsApp)
            p.cadastroAdminModal && p.cadastroAdminUser && (function() {
                var u = p.cadastroAdminUser;
                var cod = u.cod_profissional || u.codProfissional || "";
                var nome = u.full_name || u.fullName || "";
                var salvar = async function() {
                    if (!p.cadastroAdminFoto && !p.cadastroAdminWhatsapp) {
                        x({...p, cadastroAdminErro: "Preencha pelo menos um campo"});
                        return;
                    }
                    x({...p, cadastroAdminSalvando: true, cadastroAdminErro: ""});
                    try {
                        var body = {};
                        if (p.cadastroAdminFoto) body.foto_selfie = p.cadastroAdminFoto;
                        if (p.cadastroAdminWhatsapp) body.whatsapp = p.cadastroAdminWhatsapp;
                        var resp = await fetchAuth(API_URL + "/admin/usuarios/" + cod + "/cadastro", {
                            method: "PATCH",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify(body)
                        });
                        var data = await resp.json().catch(function() { return {}; });
                        if (resp.ok) {
                            ja(data.mensagem || "✅ Cadastro salvo!", "success");
                            x({...p, cadastroAdminModal: false, cadastroAdminUser: null});
                        } else {
                            x({...p, cadastroAdminSalvando: false, cadastroAdminErro: data.error || "Erro ao salvar"});
                        }
                    } catch(e) {
                        x({...p, cadastroAdminSalvando: false, cadastroAdminErro: "Erro de conexão"});
                    }
                };
                var fechar = function() { if (!p.cadastroAdminSalvando) x({...p, cadastroAdminModal: false}); };
                var onFoto = function(e) {
                    var file = e.target.files && e.target.files[0];
                    if (!file) return;
                    var reader = new FileReader();
                    reader.onload = function(ev) { x({...p, cadastroAdminFoto: ev.target.result}); };
                    reader.readAsDataURL(file);
                };
                return React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                    onClick: fechar
                },
                    React.createElement("div", {
                        className: "bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden",
                        onClick: function(e) { e.stopPropagation(); }
                    },
                        React.createElement("div", {className: "px-5 py-4 border-b flex items-center justify-between"},
                            React.createElement("div", null,
                                React.createElement("p", {className: "font-bold text-gray-800"}, "📋 Cadastro pelo Admin"),
                                React.createElement("p", {className: "text-xs text-gray-500 mt-0.5"}, nome, " — COD ", cod)
                            ),
                            React.createElement("button", {onClick: fechar, className: "text-gray-400 hover:text-gray-600 text-lg"}, "✕")
                        ),
                        React.createElement("div", {className: "px-5 py-4 space-y-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-xs font-semibold text-gray-600 mb-2"}, "📸 Foto do Profissional"),
                                p.cadastroAdminFoto
                                    ? React.createElement("div", {className: "relative"},
                                        React.createElement("img", {src: p.cadastroAdminFoto, className: "w-full h-40 object-cover rounded-xl"}),
                                        React.createElement("button", {
                                            onClick: function() { x({...p, cadastroAdminFoto: null}); },
                                            className: "absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold"
                                        }, "✕")
                                      )
                                    : React.createElement("label", {
                                        className: "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                                      },
                                        React.createElement("span", {className: "text-3xl mb-1"}, "📷"),
                                        React.createElement("span", {className: "text-xs text-gray-500"}, "Clique para selecionar foto"),
                                        React.createElement("input", {type: "file", accept: "image/*", className: "hidden", onChange: onFoto})
                                      )
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-xs font-semibold text-gray-600 mb-1"}, "📱 WhatsApp"),
                                React.createElement("input", {
                                    type: "tel",
                                    placeholder: "(71) 9 9999-9999",
                                    value: p.cadastroAdminWhatsapp || "",
                                    onChange: function(e) { x({...p, cadastroAdminWhatsapp: e.target.value}); },
                                    className: "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                                })
                            ),
                            p.cadastroAdminErro && React.createElement("p", {className: "text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg"}, "❌ ", p.cadastroAdminErro)
                        ),
                        React.createElement("div", {className: "px-5 py-3 bg-gray-50 border-t flex gap-3"},
                            React.createElement("button", {
                                onClick: fechar,
                                disabled: p.cadastroAdminSalvando,
                                className: "flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvar,
                                disabled: p.cadastroAdminSalvando || (!p.cadastroAdminFoto && !p.cadastroAdminWhatsapp),
                                className: "flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white " + (p.cadastroAdminSalvando ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700") + " disabled:opacity-50"
                            }, p.cadastroAdminSalvando ? "⏳ Salvando..." : "✅ Salvar")
                        )
                    )
                );
            })(),

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
