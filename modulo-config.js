/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DEEMOJI_V1 */
/* PERM_V6: aba Permissões refeita (tipo de acesso explícito, salva 1 usuário, confere com o servidor) */
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

        // LOGIN_LIMITER_V2: desbloqueio manual por codigo (pega o travamento em memoria,
        // que nao aparece na lista abaixo)
        var codManualState = React.useState("");
        var codManual = codManualState[0], setCodManual = codManualState[1];
        var desbloquear = function(cod, nome) {
            if (!cod) return;
            if (!confirm("Desbloquear a conta de " + (nome || cod) + "?\n\nO bloqueio e as tentativas de login registradas serão removidos.")) return;
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
                        showToast(res.data && res.data.somente_rate_limit ? ("" + (nome || cod) + ": limite de tentativas zerado (não havia bloqueio no banco)") : ("Conta de " + (nome || cod) + " desbloqueada!"), "success");
                        setCodManual("");
                        carregar();
                    } else {
                        showToast("" + (res.data.error || "Erro ao desbloquear"), "error");
                    }
                })
                .catch(function() {
                    setProcessando(null);
                    showToast("Erro de conexão ao desbloquear", "error");
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
                    React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-lock" }))),
                    "Contas Bloqueadas (", ativos.length, ")"
                ),
                React.createElement("button", {
                    onClick: carregar,
                    disabled: loading,
                    className: "px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                }, loading ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Carregando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Atualizar"))
            ),
            React.createElement("p", { className: "text-sm text-gray-500 mb-4" },
                "Contas bloqueadas automaticamente após muitas tentativas de login falhas. Use \"Desbloquear\" para liberar o acesso e \"Senha\" caso o usuário tenha esquecido a senha."
            ),
            // LOGIN_LIMITER_V2: desbloqueio por codigo
            React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4" },
                React.createElement("div", { className: "flex-1 text-[12.5px] text-amber-900" },
                    React.createElement("b", null, "Usuário diz que continua bloqueado e não aparece na lista? "),
                    "Além do bloqueio no banco existe um limite de tentativas em memória (20 em 15 min por usuário). Informe o código pra zerar os dois."),
                React.createElement("input", { value: codManual, onChange: function(e) { setCodManual(e.target.value); }, placeholder: "Código do profissional", className: "w-44 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none" }),
                React.createElement("button", { disabled: !codManual.trim() || processando, onClick: function() { desbloquear(codManual.trim().replace("#", ""), null); },
                    className: "px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50" }, "Desbloquear")
            ),

            // Erro
            erro && React.createElement("div", {
                className: "bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4"
            }, "" + erro),

            // Loading
            loading && React.createElement("div", { className: "text-center py-10 text-gray-400" },
                React.createElement("span", { className: "text-3xl block mb-2" }, React.createElement("svg", { className: "ico", style: { width: 30, height: 30 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" }))),
                "Carregando contas bloqueadas..."
            ),

            // Vazio
            !loading && !erro && lista.length === 0 && React.createElement("div", { className: "text-center py-10 text-gray-500" },
                React.createElement("span", { className: "text-4xl block mb-2" }, React.createElement("svg", { className: "ico", style: { width: 38, height: 38, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" }))),
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
                                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-lock" }))),
                                React.createElement("div", null,
                                    React.createElement("p", { className: "font-semibold" },
                                        row.full_name || "(usuário não encontrado)"),
                                    React.createElement("p", { className: "text-sm text-gray-500" },
                                        "COD: ", row.cod_profissional),
                                    React.createElement("div", { className: "flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600" },
                                        React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-ban" })), row.attempts_count || 0, " tentativas"),
                                        React.createElement("span", null, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Libera em "), row.minutos_restantes, " min"),
                                        React.createElement("span", null, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-calendar" })), "Bloqueada até "), formatarData(row.blocked_until))
                                    )
                                )
                            ),
                            React.createElement("div", { className: "flex gap-2 flex-shrink-0" },
                                React.createElement("button", {
                                    onClick: function() { abrirModalSenha(row); },
                                    className: "px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-key" })), "Senha")),
                                React.createElement("button", {
                                    onClick: function() { desbloquear(row.cod_profissional, row.full_name); },
                                    disabled: emProcesso,
                                    className: "px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                                }, emProcesso ? "..." : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-lock" })), "Desbloquear"))
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
                            }, emProcesso ? "..." : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })), "Limpar registro"))
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
        var usuarioLogado = props.usuario || {};
        var ehMaster = usuarioLogado.role === "admin_master"; // PERM_V5
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
            admin_master:     { txt: "Master",     bar: "bg-purple-600", ring: "ring-purple-200", badge: "bg-purple-100 text-purple-700" },
            admin:            { txt: "Admin",      bar: "bg-blue-600",   ring: "ring-blue-200",   badge: "bg-blue-100 text-blue-700" },
            admin_financeiro: { txt: "Financeiro", bar: "bg-green-600",  ring: "ring-green-200",  badge: "bg-green-100 text-green-700" },
            user:             { txt: "Usuário",    bar: "bg-gray-400",   ring: "ring-gray-200",   badge: "bg-gray-100 text-gray-600" }
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
            if (filtroTipo === "__inativos") { if (u.ativo !== false) return false; }
            else if (filtroTipo !== "todos" && u.role !== filtroTipo) return false;
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
                var resp = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + cliente.id + "/provedores", { cache: "no-store" }); // NOSTORE_PROVEDORES_V1
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

        // PERM_V5: ativar/desativar (so master)
        var alternarAtivo = function(user) {
            var cod = getCod(user); if (cod && typeof cod === "string") cod = cod.replace("#", "");
            if (!cod) { showToast("Código do usuário não encontrado", "error"); return; }
            var ativar = user.ativo === false;
            if (!confirm(ativar ? ("Reativar o acesso de " + getNome(user) + "?") : ("Desativar " + getNome(user) + "?\n\nA pessoa não consegue mais entrar e as sessões abertas são derrubadas. Nada é apagado — dá pra reativar depois."))) return;
            fetchAuth(API_URL + "/users/" + encodeURIComponent(cod) + "/ativo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ativo: ativar }) })
                .then(function(resp) { return resp.json().then(function(d) { return { ok: resp.ok, d: d }; }); })
                .then(function(r) {
                    if (r.ok && r.d.success) { showToast(ativar ? "Usuário reativado" : "Usuário desativado", "success"); if (recarregar) recarregar(); }
                    else showToast("" + (r.d.error || "Erro"), "error");
                })
                .catch(function() { showToast("Erro ao alterar status", "error"); });
        };
        var excluir = function(user) {
            var cod = getCod(user);
            if (cod && typeof cod === "string") cod = cod.replace("#", "");
            if (!cod) { showToast("Código do usuário não encontrado", "error"); return; }
            if (!confirm("Excluir " + getNome(user) + "?\n\nEsta ação não pode ser desfeita!")) return;
            fetchAuth(API_URL + "/users/" + cod, { method: "DELETE" })
                .then(function(resp) {
                    if (resp.ok) {
                        showToast("Usuário excluído!", "success");
                        if (recarregar) recarregar();
                    } else {
                        resp.json().catch(function() { return {}; }).then(function(e) {
                            showToast("Erro: " + (e.error || resp.statusText), "error");
                        });
                    }
                })
                .catch(function() { showToast("Erro ao excluir", "error"); });
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

            var inativo = user.ativo === false;
            return React.createElement("div", {
                key: cod,
                className: "relative border rounded-2xl p-5 flex flex-col items-center text-center transition-all " +
                    (inativo ? "bg-gray-50 border-dashed opacity-75 hover:opacity-100" : "bg-white hover:shadow-md hover:border-purple-200")
            },
                React.createElement("div", { className: "absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl " + (inativo ? "bg-gray-300" : r.bar) }),
                inativo && React.createElement("span", { className: "absolute top-3 right-3 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-700", title: "Desativado" + (user.desativadoPor ? " por " + user.desativadoPor : "") }, "Inativo"),
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
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-key" })), "Senha")),
                    user.role === "user" && React.createElement("button", {
                        onClick: function() { abrirCadastroAdmin(user); },
                        title: "Preencher foto e WhatsApp pelo admin",
                        className: "px-3 py-2 rounded-lg text-xs font-semibold transition-colors " + (user.cadastro_completo ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100")
                    }, user.cadastro_completo ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" }))),
                    ehMaster && getCod(user) !== (usuarioLogado.codProfissional || usuarioLogado.cod_profissional) && React.createElement("button", {
                        onClick: function() { alternarAtivo(user); },
                        title: inativo ? "Reativar acesso" : "Desativar acesso (mantém histórico)",
                        className: "px-3 py-2 rounded-lg text-xs font-semibold transition-colors " + (inativo ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100")
                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: inativo ? "#i-power" : "#i-ban" }))),
                    user.role !== "admin_master" && React.createElement("button", {
                        onClick: function() { excluir(user); },
                        className: "px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))
                )
            );
        }

        // ---- Render dos cards com divisores de seção (com foto / sem foto) ----
        function renderCards() {
            if (paginaItens.length === 0) {
                return React.createElement("div", { className: "text-center py-12 text-gray-500" },
                    React.createElement("span", { className: "text-4xl block mb-2" }, React.createElement("svg", { className: "ico", style: { width: 38, height: 38 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" }))),
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
                            g === "foto" ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-camera" })), "Com foto") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-user" })), "Sem foto")),
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
                    React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" }))), "Usuários Cadastrados",
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
                        React.createElement("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" }))),
                        busca && React.createElement("button", {
                            onClick: function() { setBusca(""); resetPagina(); },
                            className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                    ),
                    React.createElement("select", {
                        value: filtroTipo,
                        onChange: function(e) { setFiltroTipo(e.target.value); resetPagina(); },
                        className: "border rounded-lg text-sm px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500"
                    },
                        React.createElement("option", { value: "todos" }, "Todos os tipos"),
                        React.createElement("option", { value: "admin_master" }, "Master"),
                        React.createElement("option", { value: "admin" }, "Admin"),
                        React.createElement("option", { value: "admin_financeiro" }, "Financeiro"),
                        React.createElement("option", { value: "user" }, "Usuário"),
                        React.createElement("option", { value: "__inativos" }, "Inativos")
                    )
                )
            ),
            // Chips de resumo
            React.createElement("div", { className: "flex flex-wrap gap-2 mb-5 text-xs" },
                chip("bg-purple-50 text-purple-700", "" + cont.admin_master + " Master"),
                chip("bg-blue-50 text-blue-700", "" + cont.admin + " Admin"),
                chip("bg-green-50 text-green-700", "" + cont.admin_financeiro + " Financeiro"),
                chip("bg-gray-100 text-gray-600", "" + cont.user + " Usuários"),
                chip("bg-amber-50 text-amber-700", "" + cont.comFoto + " com foto"),
                chip("bg-red-50 text-red-700", "" + usuarios.filter(function(u) { return u.ativo === false; }).length + " inativos")
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
    // PERM_V6: editor por usuário com tipo de acesso explícito (Acesso total / Personalizado /
    // Sem acesso). Salva UM usuário por vez, confere com o servidor depois de salvar e mostra
    // o que foi recusado. "Ver como" monta o menu com a mesma regra do login.
    function PermissoesADMView(props) {
        var h = React.createElement;
        var API_URL = props.API_URL;
        var fetchAuth = props.fetchAuth;
        var showToast = props.showToast;
        var usuarioLogado = props.usuario || {};

        var C = { roxo: "#770fa8", roxoEsc: "#5d0b85", fundoRoxo: "#3a1556", lilas: "#f3e8fb", lilasBorda: "#d8c3ea", lilasFundo: "#faf5ff",
                  laranja: "#f67602", borda: "#e5e7eb", bordaLeve: "#f3f4f6", texto: "#111827", texto2: "#374151", cinza: "#6b7280", cinza2: "#4b5563", fundo: "#f9fafb" };
        var FONTE_TIT = "Sora, Inter, system-ui, sans-serif";
        var TIPOS = [
            { id: "total", nome: "Acesso total", desc: "Tudo que o papel permite, inclusive módulos novos" },
            { id: "personalizado", nome: "Personalizado", desc: "Só os módulos e abas marcados abaixo" },
            { id: "nenhum", nome: "Sem acesso", desc: "Entra só nos módulos sempre liberados" }
        ];
        var CHIP = { total: ["#ecfdf5", "#065f46", "Total"], personalizado: ["#f3e8fb", "#5d0b85", "Personalizado"], nenhum: ["#fef2f2", "#991b1b", "Sem acesso"] };

        function limpa(t) { return String(t || "").replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim(); }
        function chaveAba(m, a) { return String(m) + "_" + String(a).replace(/-/g, ""); }
        function ico(nome, tam, cor) { return h("svg", { className: "ico", style: { width: tam || 16, height: tam || 16, color: cor || "currentColor", flexShrink: 0 }, "aria-hidden": "true" }, h("use", { href: "#i-" + nome })); }
        function iniciais(n) { var p = String(n || "?").trim().split(/\s+/); return ((p[0] || "")[0] || "?").toUpperCase() + ((p.length > 1 ? p[p.length - 1][0] : "") || "").toUpperCase(); }
        function primeiroNome(n) { return String(n || "").trim().split(/\s+/)[0] || "usuário"; }
        function papelTxt(r) { return r === "admin_financeiro" ? "Admin financeiro" : "Admin"; }
        function fmtData(d) { try { var x = new Date(d); return x.toLocaleDateString("pt-BR") + " às " + x.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch (_) { return ""; } }

        var sCat = React.useState(props.SISTEMA_MODULOS_CONFIG || []); var catalogo = sCat[0], setCatalogo = sCat[1];
        var sLista = React.useState(null); var lista = sLista[0], setLista = sLista[1];
        var sErro = React.useState(null); var erroCarga = sErro[0], setErroCarga = sErro[1];
        var sSel = React.useState(null); var selCod = sSel[0], setSelCod = sSel[1];
        var sRas = React.useState(null); var rascunho = sRas[0], setRascunho = sRas[1];
        var sBusca = React.useState(""); var busca = sBusca[0], setBusca = sBusca[1];
        var sFiltro = React.useState("todos"); var filtro = sFiltro[0], setFiltro = sFiltro[1];
        var sExp = React.useState(null); var expandido = sExp[0], setExpandido = sExp[1];
        var sSalv = React.useState(false); var salvando = sSalv[0], setSalvando = sSalv[1];
        var sRes = React.useState(null); var resultado = sRes[0], setResultado = sRes[1];
        var sCop = React.useState(false); var copiarAberto = sCop[0], setCopiarAberto = sCop[1];
        var sPrev = React.useState(false); var previa = sPrev[0], setPrevia = sPrev[1];

        // módulos que o master configura (sempre liberados aparecem travados)
        var MODULOS = (catalogo || []).filter(function (m) { return m && m.id; });

        function rascunhoDe(row) {
            var mods = {};
            (row.allowed_modules || []).forEach(function (id) { mods[id] = true; });
            var abas = {};
            var t = row.allowed_tabs || {};
            Object.keys(t).forEach(function (k) { if (t[k] === false) abas[k] = false; });
            return { tipo: row.acesso_tipo || "total", modulos: mods, abas: abas };
        }
        function assinatura(r) {
            if (!r) return "";
            var mods = Object.keys(r.modulos).filter(function (k) { return r.modulos[k]; }).sort();
            var abas = Object.keys(r.abas).filter(function (k) { return r.abas[k] === false; }).sort();
            return r.tipo + "|" + (r.tipo === "personalizado" ? mods.join(",") + "|" + abas.join(",") : "");
        }

        function carregar(manterSel) {
            setErroCarga(null);
            return Promise.all([
                fetchAuth(API_URL + "/modules-config").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
                fetchAuth(API_URL + "/admin-permissions").then(function (r) {
                    if (!r.ok) return r.json().catch(function () { return {}; }).then(function (e) { throw new Error(e.error || "Não deu para carregar as permissões."); });
                    return r.json();
                })
            ]).then(function (rs) {
                if (rs[0] && Array.isArray(rs[0].modulos) && rs[0].modulos.length) setCatalogo(rs[0].modulos);
                var rows = Array.isArray(rs[1]) ? rs[1] : [];
                setLista(rows);
                var alvo = manterSel || selCod;
                var achou = rows.find(function (x) { return x.cod_profissional === alvo; }) || rows[0] || null;
                if (achou && (!manterSel || manterSel === achou.cod_profissional)) {
                    setSelCod(achou.cod_profissional);
                    setRascunho(rascunhoDe(achou));
                }
                return rows;
            }).catch(function (e) { setErroCarga(e.message || "Não deu para carregar as permissões."); setLista([]); });
        }
        React.useEffect(function () { carregar(null); }, []);

        var linhas = lista || [];
        var sel = linhas.find(function (x) { return x.cod_profissional === selCod; }) || null;
        var sujo = !!(sel && rascunho && assinatura(rascunho) !== assinatura(rascunhoDe(sel)));

        function bloqueadoPapel(m, role) { return Array.isArray(m.bloqueadoPara) && m.bloqueadoPara.indexOf(role) >= 0; }
        // mesma regra do backend (registry.permissoesEfetivas) aplicada ao rascunho
        function efetivoDe(r, role) {
            var out = {};
            MODULOS.forEach(function (m) {
                var ok;
                if (m.sempreLiberado) ok = true;
                else if (bloqueadoPapel(m, role)) ok = false;
                else if (r.tipo === "total") ok = true;
                else if (r.tipo === "nenhum") ok = false;
                else ok = r.modulos[m.id] === true;
                out[m.id] = ok;
            });
            return out;
        }

        function selecionar(cod) {
            if (cod === selCod) return;
            if (sujo && !window.confirm("As alterações de " + primeiroNome(sel && sel.full_name) + " ainda não foram salvas. Descartar e trocar de usuário?")) return;
            var row = linhas.find(function (x) { return x.cod_profissional === cod; });
            setSelCod(cod); setRascunho(row ? rascunhoDe(row) : null); setResultado(null); setExpandido(null); setPrevia(false);
        }
        function mudar(fn) { setRascunho(function (r) { var n = { tipo: r.tipo, modulos: Object.assign({}, r.modulos), abas: Object.assign({}, r.abas) }; fn(n); return n; }); setResultado(null); }
        function setTipo(t) {
            mudar(function (n) {
                var nada = Object.keys(n.modulos).filter(function (k) { return n.modulos[k]; }).length === 0;
                if (t === "personalizado" && n.tipo === "total" && nada) {
                    MODULOS.forEach(function (m) { if (!m.sempreLiberado && !bloqueadoPapel(m, sel.role)) n.modulos[m.id] = true; });
                }
                n.tipo = t;
            });
        }
        function toggleModulo(m) {
            mudar(function (n) {
                if (n.tipo !== "personalizado") {
                    var base = efetivoDe(n, sel.role);
                    n.modulos = {};
                    MODULOS.forEach(function (x) { if (!x.sempreLiberado && base[x.id]) n.modulos[x.id] = true; });
                    n.tipo = "personalizado";
                }
                n.modulos[m.id] = !n.modulos[m.id];
            });
        }
        function toggleAba(m, a) {
            var k = chaveAba(m.id, a.id);
            mudar(function (n) { if (n.abas[k] === false) delete n.abas[k]; else n.abas[k] = false; });
        }
        function marcarTodos(v) {
            mudar(function (n) {
                n.tipo = "personalizado"; n.modulos = {}; n.abas = {};
                if (v) MODULOS.forEach(function (m) { if (!m.sempreLiberado && !bloqueadoPapel(m, sel.role)) n.modulos[m.id] = true; });
            });
        }
        function descartar() { if (sel) { setRascunho(rascunhoDe(sel)); setResultado(null); } }
        function copiarDe(cod) {
            var origem = linhas.find(function (x) { return x.cod_profissional === cod; });
            if (!origem) return;
            var r = rascunhoDe(origem);
            setRascunho(r); setCopiarAberto(false); setResultado(null);
            showToast("Permissões de " + primeiroNome(origem.full_name) + " copiadas. Confira e salve.", "success");
        }

        function salvar() {
            if (!sel || !rascunho || salvando) return;
            var mods = rascunho.tipo === "personalizado" ? Object.keys(rascunho.modulos).filter(function (k) { return rascunho.modulos[k]; }) : [];
            var abas = {};
            if (rascunho.tipo === "personalizado") Object.keys(rascunho.abas).forEach(function (k) {
                if (rascunho.abas[k] !== false) return;
                var m = MODULOS.find(function (x) { return (x.abas || []).some(function (a) { return chaveAba(x.id, a.id) === k; }); });
                if (m && rascunho.modulos[m.id]) abas[k] = false;
            });
            var cod = sel.cod_profissional;
            var enviado = { tipo: rascunho.tipo, mods: mods.slice().sort().join(","), abas: Object.keys(abas).sort().join(",") };
            setSalvando(true); setResultado(null);
            fetchAuth(API_URL + "/admin-permissions/" + encodeURIComponent(cod), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ acesso_tipo: rascunho.tipo, allowed_modules: mods, allowed_tabs: abas })
            }).then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (data) {
                    if (!res.ok || !data || data.success !== true || !data.user) throw new Error((data && data.error) || "O servidor não confirmou o salvamento.");
                    return data;
                });
            }).then(function (data) {
                var u = data.user;
                setLista(function (ls) { return (ls || []).map(function (x) { return x.cod_profissional === u.cod_profissional ? u : x; }); });
                if (selCod === cod) setRascunho(rascunhoDe(u));
                var gravado = rascunhoDe(u);
                var gravadoSig = { tipo: gravado.tipo, mods: Object.keys(gravado.modulos).sort().join(","), abas: Object.keys(gravado.abas).sort().join(",") };
                var diferencas = [];
                if (gravadoSig.tipo !== enviado.tipo) diferencas.push("O tipo de acesso ficou " + (CHIP[gravadoSig.tipo] ? CHIP[gravadoSig.tipo][2] : gravadoSig.tipo) + (gravadoSig.tipo === "nenhum" ? " porque nenhum módulo ficou marcado." : "."));
                var motivos = Array.isArray(data.motivos) ? data.motivos.slice() : [];
                if (!motivos.length && (gravadoSig.mods !== enviado.mods || gravadoSig.abas !== enviado.abas) && gravadoSig.tipo === "personalizado") {
                    diferencas.push("Alguns itens foram ajustados pelo servidor. A tela mostra agora o que ficou gravado.");
                }
                setResultado({ ok: true, cod: cod, nome: u.full_name, efetivo: u.efetivo, avisos: motivos.concat(diferencas) });
                showToast("Permissões de " + primeiroNome(u.full_name) + " salvas.", "success");
                // relê do banco em segundo plano: a tela sempre fica igual ao que está gravado
                carregar(cod);
            }).catch(function (e) {
                setResultado({ ok: false, cod: cod, nome: sel.full_name, erro: e.message || "O servidor não respondeu." });
            }).finally(function () { setSalvando(false); });
        }

        // ---------- contagens ----------
        var cont = { todos: linhas.length, personalizado: 0, total: 0, nenhum: 0 };
        linhas.forEach(function (x) { if (cont[x.acesso_tipo] !== undefined) cont[x.acesso_tipo]++; });
        var termo = busca.trim().toLowerCase();
        var visiveis = linhas.filter(function (x) {
            if (filtro !== "todos" && x.acesso_tipo !== filtro) return false;
            if (!termo) return true;
            return String(x.full_name || "").toLowerCase().indexOf(termo) >= 0 || String(x.cod_profissional || "").toLowerCase().indexOf(termo) >= 0;
        });

        function resumoLinha(x) {
            var ef = x.efetivo && x.efetivo.modulos ? x.efetivo.modulos : {};
            var n = MODULOS.filter(function (m) { return !m.sempreLiberado && ef[m.id]; }).length;
            if (x.acesso_tipo === "total") return papelTxt(x.role);
            if (x.acesso_tipo === "nenhum") return papelTxt(x.role) + " · nenhum módulo";
            return papelTxt(x.role) + " · " + n + (n === 1 ? " módulo" : " módulos");
        }

        // ---------- estilos ----------
        var card = { background: "#fff", border: "1px solid " + C.borda, borderRadius: 16 };
        var btnSec = { height: 40, padding: "0 14px", borderRadius: 10, border: "1px solid " + C.borda, background: "#fff", color: C.texto2, fontWeight: 600, fontSize: 13, display: "inline-flex", gap: 8, alignItems: "center", cursor: "pointer", fontFamily: "inherit" };
        function chip(tipo) { var c = CHIP[tipo] || CHIP.total; return h("span", { style: { fontSize: 11, fontWeight: 600, borderRadius: 99, padding: "3px 9px", background: c[0], color: c[1], whiteSpace: "nowrap" } }, c[2]); }
        function sw(on, travado) {
            return h("span", { "aria-hidden": "true", style: { width: 38, height: 22, borderRadius: 99, position: "relative", flexShrink: 0, background: on ? (travado ? "#c4a5e0" : C.roxo) : "#d1d5db", transition: "background .15s" } },
                h("span", { style: { position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", left: on ? 19 : 3, transition: "left .15s" } }));
        }

        if (lista === null) {
            return h("div", { style: Object.assign({}, card, { padding: 40, textAlign: "center", color: C.cinza }) }, "Carregando permissões…");
        }
        if (erroCarga) {
            return h("div", { style: Object.assign({}, card, { padding: 24, display: "flex", gap: 12, alignItems: "center", borderColor: "#fecaca" }) },
                ico("alert", 20, "#991b1b"),
                h("div", { style: { flex: 1 } }, h("b", null, "Não deu para carregar as permissões"), h("div", { style: { fontSize: 12, color: C.cinza2 } }, erroCarga)),
                h("button", { type: "button", style: Object.assign({}, btnSec, { background: C.roxo, color: "#fff", border: "none" }), onClick: function () { setLista(null); carregar(selCod); } }, "Tentar de novo"));
        }

        // ---------- lista de usuários ----------
        var painelLista = h("aside", { style: Object.assign({}, card, { flex: "1 1 300px", maxWidth: 380, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", alignSelf: "flex-start" }) },
            h("div", { style: { padding: "16px 16px 12px", display: "flex", flexDirection: "column", gap: 10, borderBottom: "1px solid " + C.bordaLeve } },
                h("h2", { style: { margin: 0, fontFamily: FONTE_TIT, fontSize: 17, color: C.texto } }, "Quem acessa o quê"),
                h("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: C.cinza2, fontWeight: 600 } }, "Buscar usuário",
                    h("input", { type: "search", value: busca, placeholder: "Nome ou código", onChange: function (e) { setBusca(e.target.value); },
                        style: { height: 38, border: "1px solid " + C.borda, borderRadius: 10, padding: "0 12px", fontSize: 13, fontFamily: "inherit", outline: "none" } })),
                h("div", { role: "group", "aria-label": "Filtrar por acesso", style: { display: "flex", gap: 6, flexWrap: "wrap" } },
                    [["todos", "Todos"], ["personalizado", "Personalizado"], ["total", "Total"], ["nenhum", "Sem acesso"]].map(function (f) {
                        var on = filtro === f[0];
                        return h("button", { key: f[0], type: "button", "aria-pressed": on, onClick: function () { setFiltro(f[0]); },
                            style: { height: 30, padding: "0 11px", borderRadius: 99, border: "1px solid " + (on ? C.roxo : C.borda), background: on ? C.lilas : "#fff", color: on ? C.roxoEsc : C.texto2, fontWeight: on ? 600 : 500, fontSize: 12, cursor: "pointer", fontFamily: "inherit" } },
                            f[1] + " · " + cont[f[0]]);
                    }))),
            h("div", { style: { maxHeight: 640, overflowY: "auto" } },
                visiveis.length === 0
                    ? h("div", { style: { padding: 24, textAlign: "center", color: C.cinza, fontSize: 13 } },
                        linhas.length === 0 ? "Nenhum Admin ou Admin financeiro ativo. Cadastre na aba Usuários." : "Ninguém com esse filtro.",
                        (termo || filtro !== "todos") && h("div", null, h("button", { type: "button", onClick: function () { setBusca(""); setFiltro("todos"); }, style: { marginTop: 8, background: "none", border: "none", color: C.roxo, fontWeight: 600, cursor: "pointer" } }, "Limpar filtros")))
                    : visiveis.map(function (x) {
                        var on = x.cod_profissional === selCod;
                        return h("button", { key: x.cod_profissional, type: "button", onClick: function () { selecionar(x.cod_profissional); }, "aria-current": on ? "true" : undefined,
                            style: { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", border: "none", borderBottom: "1px solid " + C.bordaLeve, cursor: "pointer", width: "100%", minHeight: 60, textAlign: "left", fontFamily: "inherit",
                                     background: on ? C.lilasFundo : "#fff", boxShadow: on ? "inset 3px 0 0 " + C.roxo : "none" } },
                            h("span", { style: { width: 36, height: 36, borderRadius: "50%", background: "#ede4f6", color: C.roxoEsc, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, iniciais(x.full_name)),
                            h("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 } },
                                h("b", { style: { fontSize: 13, color: C.texto, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, x.full_name || x.cod_profissional),
                                h("span", { style: { fontSize: 11, color: C.cinza } }, resumoLinha(x))),
                            on && sujo ? h("span", { title: "Alterações não salvas", style: { width: 8, height: 8, borderRadius: "50%", background: C.laranja, flexShrink: 0 } }) : null,
                            chip(x.acesso_tipo));
                    })));

        if (!sel || !rascunho) {
            return h("div", { style: { display: "flex", flexWrap: "wrap", gap: 20 } }, painelLista);
        }

        var ef = efetivoDe(rascunho, sel.role);
        var configuraveis = MODULOS.filter(function (m) { return !m.sempreLiberado && !bloqueadoPapel(m, sel.role); });
        var nLiberados = configuraveis.filter(function (m) { return ef[m.id]; }).length;
        var nAbas = 0;
        configuraveis.forEach(function (m) { if (ef[m.id]) (m.abas || []).forEach(function (a) { if (rascunho.tipo !== "personalizado" || rascunho.abas[chaveAba(m.id, a.id)] !== false) nAbas++; }); });

        // diferença em relação ao salvo (barra de alterações)
        var salvoEf = efetivoDe(rascunhoDe(sel), sel.role);
        var mudancas = [];
        if (rascunho.tipo !== sel.acesso_tipo) mudancas.push("Tipo: " + CHIP[rascunho.tipo][2]);
        configuraveis.forEach(function (m) { if (ef[m.id] !== salvoEf[m.id]) mudancas.push((ef[m.id] ? "+ " : "− ") + limpa(m.label)); });
        var abasSalvas = rascunhoDe(sel).abas;
        configuraveis.forEach(function (m) {
            if (!ef[m.id]) return;
            (m.abas || []).forEach(function (a) {
                var k = chaveAba(m.id, a.id);
                var agora = rascunho.tipo === "personalizado" && rascunho.abas[k] === false;
                var antes = sel.acesso_tipo === "personalizado" && abasSalvas[k] === false;
                if (agora !== antes && salvoEf[m.id]) mudancas.push((agora ? "− " : "+ ") + limpa(a.label));
            });
        });

        // ---------- cabeçalho do usuário ----------
        var outros = linhas.filter(function (x) { return x.cod_profissional !== sel.cod_profissional; });
        var cabecalho = h("div", { style: Object.assign({}, card, { padding: "18px 20px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "center" }) },
            h("div", { style: { display: "flex", gap: 14, alignItems: "center", minWidth: 0 } },
                h("span", { style: { width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg," + C.roxo + "," + C.roxoEsc + ")", color: "#fff", fontFamily: FONTE_TIT, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, iniciais(sel.full_name)),
                h("div", { style: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 } },
                    h("h2", { style: { margin: 0, fontFamily: FONTE_TIT, fontSize: 19, color: C.texto } }, sel.full_name || sel.cod_profissional),
                    h("span", { style: { fontSize: 12, color: C.cinza } }, papelTxt(sel.role) + " · cód. " + sel.cod_profissional +
                        (sel.permissoes_atualizadas_em ? " · salvo por " + (sel.permissoes_atualizadas_por || "—") + " em " + fmtData(sel.permissoes_atualizadas_em) : " · ainda não editado nesta tela")))),
            h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", position: "relative" } },
                h("button", { type: "button", style: btnSec, disabled: outros.length === 0, onClick: function () { setCopiarAberto(!copiarAberto); }, "aria-expanded": copiarAberto }, ico("copy", 16), "Copiar de outro usuário"),
                h("button", { type: "button", style: btnSec, onClick: function () { setPrevia(!previa); }, "aria-expanded": previa }, ico("eye", 16), "Ver como " + primeiroNome(sel.full_name)),
                copiarAberto && h("div", { role: "dialog", "aria-label": "Copiar permissões", style: { position: "absolute", right: 0, top: 46, zIndex: 30, width: 300, maxHeight: 340, overflowY: "auto", background: "#fff", border: "1px solid " + C.borda, borderRadius: 12, boxShadow: "0 12px 32px rgba(17,24,39,.14)", padding: 6 } },
                    h("div", { style: { padding: "8px 10px", fontSize: 12, color: C.cinza } }, "Copia para a tela. Só vale depois de salvar."),
                    outros.map(function (x) {
                        return h("button", { key: x.cod_profissional, type: "button", onClick: function () { copiarDe(x.cod_profissional); },
                            style: { display: "flex", width: "100%", gap: 10, alignItems: "center", padding: "10px", border: "none", background: "#fff", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "inherit", minHeight: 44 } },
                            h("span", { style: { flex: 1, minWidth: 0 } }, h("b", { style: { fontSize: 13, display: "block" } }, x.full_name), h("span", { style: { fontSize: 11, color: C.cinza } }, resumoLinha(x))),
                            chip(x.acesso_tipo));
                    }))));

        // ---------- tipo de acesso ----------
        var blocoTipo = h("div", { style: Object.assign({}, card, { padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }) },
            h("h3", { style: { margin: 0, fontSize: 14, color: C.texto } }, "Tipo de acesso"),
            h("div", { role: "radiogroup", "aria-label": "Tipo de acesso", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 } },
                TIPOS.map(function (t) {
                    var on = rascunho.tipo === t.id;
                    return h("button", { key: t.id, type: "button", role: "radio", "aria-checked": on, onClick: function () { setTipo(t.id); },
                        style: { textAlign: "left", padding: on ? "11px 13px" : "12px 14px", borderRadius: 12, border: (on ? "2px solid " + C.roxo : "1px solid " + C.borda), background: on ? C.lilasFundo : "#fff", display: "flex", flexDirection: "column", gap: 4, cursor: "pointer", fontFamily: "inherit" } },
                        h("b", { style: { fontSize: 13, color: on ? C.roxoEsc : C.texto } }, t.nome),
                        h("span", { style: { fontSize: 12, color: on ? C.cinza2 : C.cinza } }, t.desc));
                })));

        // ---------- módulos ----------
        function linhaModulo(m) {
            var travado = m.sempreLiberado || bloqueadoPapel(m, sel.role);
            var on = ef[m.id];
            var abas = m.abas || [];
            var nOn = abas.filter(function (a) { return rascunho.tipo !== "personalizado" || rascunho.abas[chaveAba(m.id, a.id)] !== false; }).length;
            var aberto = expandido === m.id && on && !travado && abas.length > 0;
            var det = travado ? (m.sempreLiberado ? "sempre liberado" : "não disponível para " + papelTxt(sel.role).toLowerCase())
                : !on ? "desligado" : abas.length ? (nOn + " de " + abas.length + " abas") : "sem abas";
            var topo = h("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", minHeight: 56, boxSizing: "border-box", background: aberto ? C.lilasFundo : (travado ? C.fundo : "#fff") } },
                h("button", { type: "button", role: "switch", "aria-checked": on, "aria-label": limpa(m.label), disabled: travado, onClick: function () { toggleModulo(m); },
                    style: { border: "none", background: "transparent", padding: 0, cursor: travado ? "not-allowed" : "pointer", display: "flex", alignItems: "center", minHeight: 44 } }, sw(on, travado)),
                h("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 } },
                    h("b", { style: { fontSize: 13, color: C.texto } }, limpa(m.label)),
                    h("span", { style: { fontSize: 11, color: aberto ? C.roxoEsc : C.cinza, fontWeight: aberto ? 600 : 400 } }, det)),
                travado && h("span", { style: { fontSize: 11, fontWeight: 600, color: C.cinza2, background: "#f3f4f6", borderRadius: 99, padding: "3px 9px", display: "inline-flex", gap: 5, alignItems: "center" } }, ico("lock", 12), m.sempreLiberado ? "Sempre" : "Bloqueado"),
                !travado && on && abas.length > 0 && h("button", { type: "button", "aria-expanded": aberto, "aria-label": (aberto ? "Recolher" : "Ver") + " abas de " + limpa(m.label), onClick: function () { setExpandido(aberto ? null : m.id); },
                    style: { width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", color: C.roxoEsc, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" } },
                    h("span", { style: { display: "inline-flex", transform: aberto ? "rotate(180deg)" : "none", transition: "transform .15s" } }, ico("arrowdown", 16))));
            return h("div", { key: m.id, style: { gridColumn: aberto ? "1 / -1" : "auto", border: "1px solid " + (aberto ? C.lilasBorda : (on && !travado ? C.lilasBorda : C.borda)), borderRadius: 12, overflow: "hidden" } },
                topo,
                aberto && h("div", { style: { padding: "12px 14px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 } },
                    abas.map(function (a) {
                        var k = chaveAba(m.id, a.id);
                        var liberada = rascunho.tipo !== "personalizado" || rascunho.abas[k] !== false;
                        return h("label", { key: k, style: { display: "flex", gap: 8, alignItems: "center", minHeight: 38, padding: "0 10px", borderRadius: 9, fontSize: 12, cursor: "pointer",
                                border: "1px solid " + (liberada ? C.lilasBorda : C.bordaLeve), background: liberada ? "#fff" : C.fundo, color: liberada ? C.texto : C.cinza } },
                            h("input", { type: "checkbox", checked: liberada, onChange: function () {
                                if (rascunho.tipo !== "personalizado") { toggleModuloParaPersonalizado(); }
                                toggleAba(m, a);
                            }, style: { accentColor: C.roxo, width: 16, height: 16, margin: 0 } }),
                            limpa(a.label));
                    })));
        }
        function toggleModuloParaPersonalizado() {
            mudar(function (n) {
                var base = efetivoDe(n, sel.role);
                n.modulos = {};
                MODULOS.forEach(function (x) { if (!x.sempreLiberado && base[x.id]) n.modulos[x.id] = true; });
                n.tipo = "personalizado";
            });
        }

        var ordenados = configuraveis.concat(MODULOS.filter(function (m) { return m.sempreLiberado || bloqueadoPapel(m, sel.role); }));
        var blocoModulos = h("div", { style: Object.assign({}, card, { padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }) },
            h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 } },
                h("div", { style: { display: "flex", flexDirection: "column", gap: 2 } },
                    h("h3", { style: { margin: 0, fontSize: 14, color: C.texto } }, "Módulos e abas"),
                    h("span", { style: { fontSize: 12, color: C.cinza } }, nLiberados + " de " + configuraveis.length + " módulos liberados · " + nAbas + " abas")),
                h("div", { style: { display: "flex", gap: 6 } },
                    h("button", { type: "button", onClick: function () { marcarTodos(true); }, style: Object.assign({}, btnSec, { height: 34, fontSize: 12 }) }, "Marcar todos"),
                    h("button", { type: "button", onClick: function () { marcarTodos(false); }, style: Object.assign({}, btnSec, { height: 34, fontSize: 12 }) }, "Desmarcar todos"))),
            rascunho.tipo === "total" && h("div", { style: { fontSize: 12, color: C.cinza2, background: C.fundo, borderRadius: 10, padding: "10px 12px" } },
                "Com acesso total, tudo fica liberado e módulos novos entram sozinhos. Mexer em qualquer chave muda para Personalizado."),
            rascunho.tipo === "nenhum" && h("div", { style: { fontSize: 12, color: "#991b1b", background: "#fef2f2", borderRadius: 10, padding: "10px 12px" } },
                "Sem acesso: entra só nos módulos sempre liberados. Ligar qualquer módulo muda para Personalizado."),
            h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8, gridAutoFlow: "row dense" } }, ordenados.map(linhaModulo)));

        // ---------- conferência pós-salvar ----------
        var blocoResultado = null;
        if (resultado && resultado.cod === sel.cod_profissional) {
            if (resultado.ok) {
                var efs = resultado.efetivo && resultado.efetivo.modulos ? resultado.efetivo.modulos : {};
                var nm = MODULOS.filter(function (m) { return !m.sempreLiberado && efs[m.id]; }).length;
                var na = 0;
                var abasRes = (resultado.efetivo && resultado.efetivo.abas) || {};
                MODULOS.forEach(function (m) { if (!m.sempreLiberado && efs[m.id]) (m.abas || []).forEach(function (a) { if (abasRes[chaveAba(m.id, a.id)] !== false) na++; }); });
                blocoResultado = h("div", { role: "status", style: Object.assign({}, card, { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, borderColor: "#a7f3d0" }) },
                    h("div", { style: { display: "flex", gap: 12, alignItems: "center" } },
                        h("span", { style: { width: 36, height: 36, borderRadius: "50%", background: "#ecfdf5", color: "#065f46", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, ico("check", 18)),
                        h("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 2 } },
                            h("b", { style: { fontSize: 14 } }, "Permissões de " + primeiroNome(resultado.nome) + " salvas"),
                            h("span", { style: { fontSize: 12, color: C.cinza } }, "Conferido com o servidor. O bloqueio vale na hora; o menu dela se atualiza ao recarregar a página ou voltar para a aba.")),
                        h("button", { type: "button", "aria-label": "Fechar aviso", onClick: function () { setResultado(null); }, style: { width: 36, height: 36, borderRadius: 9, border: "none", background: "transparent", color: C.cinza, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" } }, ico("x", 16))),
                    h("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 } },
                        [["Módulos", resultado.efetivo && resultado.efetivo.tipo === "total" ? "Todos" : String(nm)], ["Abas", resultado.efetivo && resultado.efetivo.tipo === "total" ? "Todas" : String(na)], ["Tipo", CHIP[(resultado.efetivo || {}).tipo || "total"][2]]].map(function (k) {
                            return h("div", { key: k[0], style: { background: C.fundo, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 4 } },
                                h("span", { style: { fontSize: 11, color: C.cinza } }, k[0]),
                                h("b", { style: { fontFamily: FONTE_TIT, fontSize: 18, color: k[0] === "Tipo" ? C.roxoEsc : C.texto } }, k[1]));
                        })),
                    resultado.avisos && resultado.avisos.length > 0 && h("div", { style: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 } },
                        h("b", { style: { color: "#92400e" } }, resultado.avisos.length === 1 ? "1 ajuste feito pelo servidor" : resultado.avisos.length + " ajustes feitos pelo servidor"),
                        resultado.avisos.map(function (t, i) { return h("span", { key: i, style: { color: C.texto2, fontSize: 13 } }, t); })));
            } else {
                blocoResultado = h("div", { role: "alert", style: Object.assign({}, card, { padding: "16px 20px", display: "flex", gap: 12, alignItems: "center", borderColor: "#fecaca", flexWrap: "wrap" }) },
                    h("span", { style: { width: 36, height: 36, borderRadius: "50%", background: "#fef2f2", color: "#991b1b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, ico("alert", 18)),
                    h("div", { style: { flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 2 } },
                        h("b", null, "Não deu para salvar as permissões de " + primeiroNome(resultado.nome)),
                        h("span", { style: { fontSize: 12, color: C.cinza2 } }, resultado.erro + " Suas marcações continuam na tela, nada foi perdido.")),
                    h("button", { type: "button", onClick: salvar, style: Object.assign({}, btnSec, { background: C.roxo, color: "#fff", border: "none" }) }, "Tentar de novo"));
            }
        }

        // ---------- ver como o usuário ----------
        var blocoPrevia = null;
        if (previa) {
            var menu = MODULOS.filter(function (m) { return ef[m.id]; });
            var focoId = expandido && ef[expandido] ? expandido : ((menu.find(function (m) { return !m.sempreLiberado && (m.abas || []).length; }) || {}).id);
            var foco = MODULOS.find(function (m) { return m.id === focoId; });
            var abasFoco = foco ? (foco.abas || []) : [];
            var vis = abasFoco.filter(function (a) { return rascunho.tipo !== "personalizado" || rascunho.abas[chaveAba(foco.id, a.id)] !== false; });
            var esc = abasFoco.filter(function (a) { return vis.indexOf(a) < 0; });
            blocoPrevia = h("div", { style: Object.assign({}, card, { overflow: "hidden", display: "flex", flexDirection: "column" }) },
                h("div", { style: { padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid " + C.bordaLeve, gap: 12 } },
                    h("div", { style: { display: "flex", flexDirection: "column", gap: 2 } },
                        h("b", { style: { fontSize: 15 } }, "O menu que " + primeiroNome(sel.full_name) + " vai ver"),
                        h("span", { style: { fontSize: 12, color: C.cinza } }, sujo ? "Com as alterações da tela (ainda não salvas)" : "Montado com a mesma regra do login")),
                    h("button", { type: "button", "aria-label": "Fechar prévia", onClick: function () { setPrevia(false); }, style: { width: 36, height: 36, borderRadius: 9, border: "1px solid " + C.borda, background: "#fff", color: C.texto2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" } }, ico("x", 16))),
                h("div", { style: { display: "flex", flexWrap: "wrap", minHeight: 280 } },
                    h("div", { style: { flex: "0 1 220px", minWidth: 180, background: "linear-gradient(180deg," + C.fundoRoxo + ",#26093a)", color: "#fff", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 } },
                        h("span", { style: { fontFamily: FONTE_TIT, fontWeight: 800, fontSize: 16, padding: "0 8px 12px" } }, "Tutts"),
                        menu.map(function (m) {
                            var on = foco && m.id === foco.id;
                            return h("button", { key: m.id, type: "button", onClick: function () { if ((m.abas || []).length && !m.sempreLiberado) setExpandido(m.id); },
                                style: { textAlign: "left", padding: "9px 12px", borderRadius: 10, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit", background: on ? "rgba(255,255,255,.14)" : "transparent", color: on ? "#fff" : "#e9d5f9", fontWeight: on ? 600 : 400 } }, limpa(m.label));
                        })),
                    h("div", { style: { flex: "1 1 300px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 } },
                        foco ? h(React.Fragment, null,
                            h("b", { style: { fontFamily: FONTE_TIT, fontSize: 16 } }, limpa(foco.label)),
                            h("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } }, vis.map(function (a) { return h("span", { key: a.id, style: { fontSize: 12, padding: "6px 10px", borderRadius: 99, background: C.lilas, color: C.roxoEsc, fontWeight: 500 } }, limpa(a.label)); })),
                            esc.length > 0 && h("span", { style: { fontSize: 12, color: C.cinza, borderTop: "1px dashed " + C.borda, paddingTop: 10 } }, "Escondidas: " + esc.map(function (a) { return limpa(a.label); }).join(", ")))
                            : h("span", { style: { color: C.cinza } }, "Só os módulos sempre liberados."))));
        }

        // ---------- barra de alterações ----------
        var barra = (sujo || salvando) && h("div", { style: { position: "sticky", bottom: 0, zIndex: 20, marginTop: 4, background: C.fundoRoxo, color: "#fff", borderRadius: 14, padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", boxShadow: "0 -6px 24px rgba(58,21,86,.18)" } },
            h("span", { style: { display: "flex", gap: 10, alignItems: "center", minWidth: 0, flex: "1 1 260px" } },
                h("span", { style: { width: 8, height: 8, borderRadius: "50%", background: C.laranja, flexShrink: 0 } }),
                h("b", { style: { whiteSpace: "nowrap" } }, mudancas.length === 1 ? "1 alteração não salva" : (mudancas.length || 1) + " alterações não salvas"),
                h("span", { style: { color: "#e9d5f9", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, mudancas.slice(0, 4).join(" · ") + (mudancas.length > 4 ? " · +" + (mudancas.length - 4) : ""))),
            h("div", { style: { display: "flex", gap: 8 } },
                h("button", { type: "button", onClick: descartar, disabled: salvando, style: { height: 40, padding: "0 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } }, "Descartar"),
                h("button", { type: "button", onClick: salvar, disabled: salvando, style: { height: 40, padding: "0 18px", borderRadius: 10, border: "none", background: "#fff", color: C.roxoEsc, fontWeight: 700, cursor: salvando ? "wait" : "pointer", fontFamily: "inherit", opacity: salvando ? .75 : 1 } },
                    salvando ? "Salvando…" : "Salvar permissões de " + primeiroNome(sel.full_name))));

        return h("div", { style: { display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start", fontFamily: "Inter, system-ui, sans-serif", fontSize: 13, color: C.texto } },
            painelLista,
            h("section", { style: { flex: "999 1 560px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 } },
                cabecalho, blocoResultado, blocoPrevia, blocoTipo, blocoModulos, barra));
    }

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
                        /* CLIENTES_API_ICONS_V4 */ React.createElement("svg", {className: "ico ico-lg text-purple-600", "aria-hidden": "true"}, React.createElement("use", {href: "#i-link"})),
                        "Clientes API - Solicitação de Serviço"
                    ),
                    React.createElement("p", {className: "text-gray-600 text-sm mb-4"}, "Cadastre clientes que podem solicitar corridas via página externa."),
                    
                    // Formulário de cadastro
                    React.createElement("div", {className: "bg-gray-50 rounded-lg p-4 mb-6"},
                        React.createElement("h3", {className: "font-bold text-gray-700 mb-3 flex items-center gap-2"}, React.createElement("svg", {className: "ico ico-lg text-purple-600", "aria-hidden": "true"}, React.createElement("use", {href: "#i-plus"})), "Novo Cliente"),
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
                                        ja("Cliente criado com sucesso!", "success");
                                        x({...p, novoClienteApi: {}, clientesApiLista: null});
                                    } else {
                                        ja(data.error || "Erro ao criar cliente", "error");
                                    }
                                } catch (err) {
                                    ja("Erro de conexão", "error");
                                }
                            },
                            className: "px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                        }, React.createElement("span", {className: "inline-flex items-center gap-2"}, React.createElement("svg", {className: "ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-check"})), "Cadastrar Cliente"))
                    ),
                    
                    // Lista de clientes
                    React.createElement("div", null,
                        React.createElement("div", {className: "flex items-center justify-between mb-3"},
                            React.createElement("h3", {className: "font-bold text-gray-700"}, "Clientes Cadastrados"),
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
                                className: "px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 inline-flex items-center gap-1.5"
                            }, React.createElement("svg", {className: "ico ico-sm", "aria-hidden": "true"}, React.createElement("use", {href: "#i-refresh"})), "Carregar")
                        ),
                        p.clientesApiLista && p.clientesApiLista.length === 0 && React.createElement("p", {className: "text-gray-500 text-sm text-center py-4"}, "Nenhum cliente cadastrado"),
                        p.clientesApiLista && p.clientesApiLista.length > 0 && React.createElement(React.Fragment, null,
                            /* CLIENTES_API_CARDS_V3 */
                            React.createElement("div", {className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"},
                                p.clientesApiLista.map(function(cliente) {
                                    function ico(n, extra) {
                                        return React.createElement("svg", {className: "ico " + (extra || ""), "aria-hidden": "true"},
                                            React.createElement("use", {href: "#i-" + n}));
                                    }
                                    function fmtBRL(v) {
                                        var n = Number(String(v).replace(",", "."));
                                        if (!isFinite(n)) return String(v);
                                        return n.toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2});
                                    }
                                    function dot(set) {
                                        return React.createElement("span", {className: "w-[5px] h-[5px] rounded-full flex-none mt-[6px]", style: {background: set ? "#166534" : "#e5e7eb"}});
                                    }
                                    var LOGOS = {uber: {label: "Uber Flash", logo: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiMwMDAiLz48dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMyIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlViZXI8L3RleHQ+PC9zdmc+"}, "99": {label: "99 Moto", logo: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiNGRkQ3MDAiLz48dGV4dCB4PSIyMCIgeT0iMjciIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0iIzFhMWExYSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+OTk8L3RleHQ+PC9zdmc+"}};
                                    function provChip(code) {
                                        var inf = LOGOS[code] || {label: code, logo: null};
                                        return React.createElement("span", {key: code, className: "inline-flex items-center gap-1 text-[12px] text-[#111827] font-medium"},
                                            inf.logo ? React.createElement("img", {src: inf.logo, style: {width: 16, height: 16, borderRadius: "50%", flexShrink: 0, objectFit: "cover"}}) : null,
                                            inf.label);
                                    }
                                    var cats = Array.isArray(cliente.categorias_disponiveis) ? cliente.categorias_disponiveis : [];
                                    var provs = Array.isArray(cliente.provedores_habilitados) ? cliente.provedores_habilitados : [];
                                    var extras = provs.filter(function(pv) { return pv !== "tutts"; });
                                    var temHub = extras.length > 0;
                                    var pj = cliente.preco_hub;
                                    if (typeof pj === "string") { try { pj = JSON.parse(pj); } catch (e) { pj = null; } }
                                    var temPreco = !!(pj && pj.valor_fixo != null);
                                    var freteSet = cats.length > 0;
                                    var freteTxt = freteSet ? cats.map(function(c) { return c.nome ? (c.sigla + " \u2014 " + c.nome) : c.sigla; }).join(", ") : "Modalidades globais";
                                    var provSet = extras.length > 0;
                                    var precoTxt = temPreco
                                        ? ("R$ " + fmtBRL(pj.valor_fixo) + (pj.valor_km_adicional != null ? " + R$ " + fmtBRL(pj.valor_km_adicional) + "/km" : " fixo"))
                                        : "Tabela global";
                                    var temEmpresa = cliente.empresa && cliente.empresa !== cliente.nome;
                                    var actBase = "w-[29px] h-[29px] grid place-items-center rounded-[7px] border border-transparent transition text-[#6b7280] hover:bg-[#f3f4f6] hover:border-[#e5e7eb] hover:text-[#111827]";

                                    return React.createElement("div", {
                                        key: cliente.id,
                                        className: "bg-white border border-[#e5e7eb] rounded-[10px] transition hover:border-[#d1d5db] hover:shadow-sm flex flex-col" + (cliente.ativo ? "" : " opacity-60")
                                    },
                                        // ---- FAIXA 1: IDENTIDADE ----
                                        React.createElement("div", {className: "px-3.5 pt-3.5 pb-3"},
                                            React.createElement("div", {className: "flex items-center justify-end mb-1.5"},
                                                cliente.ativo
                                                    ? React.createElement("span", {className: "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full flex-none", style: {background: "#f0fdf4", color: "#166534"}}, "Ativo")
                                                    : React.createElement("span", {className: "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full flex-none", style: {background: "#f3f4f6", color: "#6b7280"}}, "Inativo")
                                            ),
                                            React.createElement("h3", {
                                                className: "text-[14px] font-semibold tracking-[-.01em] leading-snug mb-1",
                                                title: cliente.nome,
                                                style: {display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"}
                                            }, cliente.nome),
                                            React.createElement("p", {className: "text-[12px] text-[#6b7280] truncate", title: cliente.email}, cliente.email),
                                            temEmpresa ? React.createElement("p", {className: "text-[11px] text-[#9ca3af] truncate mt-0.5", title: cliente.empresa}, cliente.empresa) : null
                                        ),
                                        // ---- FAIXA 2: CONFIGURACAO ----
                                        React.createElement("div", {className: "px-3.5 py-2.5 border-y border-[#e5e7eb] bg-[#ffffff] flex-1 space-y-0.5"},
                                            React.createElement("div", {className: "flex items-start gap-2 py-[3px]"},
                                                dot(freteSet),
                                                React.createElement("span", {className: "text-[12px] leading-snug " + (freteSet ? "text-[#111827] font-medium" : "text-[#9ca3af]")}, freteTxt)
                                            ),
                                            React.createElement("div", {className: "flex items-start gap-2 py-[3px]"},
                                                dot(provSet),
                                                provSet
                                                    ? React.createElement("span", {className: "flex items-center flex-wrap gap-x-3 gap-y-1"}, extras.map(provChip))
                                                    : React.createElement("span", {className: "text-[12px] text-[#9ca3af]"}, "S\u00f3 frota Tutts")
                                            ),
                                            React.createElement("div", {className: "flex items-start gap-2 py-[3px]"},
                                                dot(temPreco),
                                                React.createElement("span", {className: "text-[12px] truncate " + (temPreco ? "text-[#111827] font-medium" : "text-[#9ca3af]"), title: precoTxt}, precoTxt)
                                            )
                                        ),
                                        // ---- FAIXA 3: ACOES ----
                                        React.createElement("div", {className: "px-2.5 py-2 flex items-center gap-0.5"},
                                            React.createElement("button", {
                                                onClick: async function() {
                                                if (!confirm("Desativar/ativar este cliente?")) return;
                                                try {
                                                    var respSt = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + cliente.id + "/status", {
                                                        method: "PATCH",
                                                        body: JSON.stringify({ativo: !cliente.ativo})
                                                    });
                                                    if (!respSt.ok) { ja("Erro ao alterar status", "error"); return; }
                                                    ja("Status alterado!", "success");
                                                    x({...p, clientesApiLista: null});
                                                } catch (err) {
                                                    ja("Erro", "error");
                                                }
                                            },
                                                title: cliente.ativo ? "Desativar cliente" : "Ativar cliente",
                                                className: "w-[29px] h-[29px] grid place-items-center rounded-[7px] border transition " + (cliente.ativo ? "text-[#770fa8] bg-[#faf7fd] border-[#faf7fd]" : "text-[#6b7280] border-transparent hover:bg-[#f3f4f6] hover:border-[#e5e7eb] hover:text-[#111827]")
                                            }, ico("power")),
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
                                                className: actBase
                                            }, ico("pencil")),
                                            React.createElement("button", {
                                                onClick: async function() {
                                                var respCats = await fetch(API_URL + "/admin/solicitacao/clientes/" + cliente.id + "/categorias", {headers: {"Authorization": "Bearer " + getToken()}});
                                                var dataCats = respCats.ok ? await respCats.json() : {categorias: []};
                                                var catsAtivas = (dataCats.categorias || []).map(function(c) { return c.sigla; });
                                                x({...p, modalCategorias: {id: cliente.id, nome: cliente.nome, catsAtivas: catsAtivas, salvando: false}});
                                            },
                                                title: "Configurar modalidades de frete",
                                                className: actBase
                                            }, ico("tag")),
                                            React.createElement("button", {
                                                onClick: async function() {
                                                try {
                                                    var rp = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + cliente.id + "/provedores", { cache: "no-store" }); // NOSTORE_PROVEDORES_V1
                                                    var dp = rp.ok ? await rp.json() : {provedores: ['tutts']};
                                                    x({...p, modalProvedores: {id: cliente.id, nome: cliente.nome, selecionados: dp.provedores || ['tutts'], salvando: false}});
                                                } catch(e) { ja("Erro ao carregar provedores", "error"); }
                                            },
                                                title: "Configurar provedores log\u00edsticos",
                                                className: actBase
                                            }, ico("truck")),
                                            temHub ? React.createElement("button", {
                                                onClick: function() {
                                                    x({...p, modalPreco: {
                                                        id: cliente.id,
                                                        nome: cliente.nome,
                                                        ativo: pj ? (pj.ativo !== false) : true,
                                                        alterar_mapp: pj ? (pj.alterar_mapp !== false) : true,
                                                        restaurar_cancel: pj ? (pj.restaurar_cancel !== false) : true,
                                                        valor_fixo: pj && pj.valor_fixo != null ? String(pj.valor_fixo) : "",
                                                        km_base: pj && pj.km_base != null ? String(pj.km_base) : "",
                                                        valor_km_adicional: pj && pj.valor_km_adicional != null ? String(pj.valor_km_adicional) : "",
                                                        faixas_km: (pj && Array.isArray(pj.faixas_km)) ? pj.faixas_km.map(function (f) { return { inicio_km: f.inicio_km == null ? "" : String(f.inicio_km), valor_km: f.valor_km == null ? "" : String(f.valor_km) }; }) : [], // FAIXAS_CFG_INIT_V2
                                                        retorno_valor: pj && pj.retorno_valor != null ? String(pj.retorno_valor) : "",
                                                        retorno_percentual: pj && pj.retorno_percentual != null ? String(pj.retorno_percentual) : "",
                                                        retorno_modo: pj && pj.retorno_percentual != null ? "pct" : "fixo",
                                                        nome_remetente: cliente.nome_remetente || "",
                                                        package_type: cliente.package_type || "",
                                                        package_weight: cliente.package_weight || "",
                                                        aviso_entregador: cliente.aviso_entregador || "",
                                                        salvando: false
                                                    }});
                                                },
                                                title: "Configura\u00e7\u00f5es do Hub (pre\u00e7o e mensagem)",
                                                className: actBase + (temPreco ? " text-[#770fa8]" : "")
                                            }, ico("wallet")) : null,
                                            React.createElement("span", {className: "flex-1"}),
                                            React.createElement("button", {
                                                onClick: async function() {
                                                var total = parseInt(cliente.total_solicitacoes) || 0;
                                                var msg = "EXCLUIR cliente \"" + cliente.nome + "\" (" + cliente.email + ")?\n\n" +
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
                                                        ja("Cliente excluído com sucesso!", "success");
                                                        x({...p, clientesApiLista: null});
                                                    } else {
                                                        var erro = (data.error || "").toLowerCase();
                                                        if (erro.indexOf("foreign key") >= 0 || erro.indexOf("violates") >= 0 || erro.indexOf("constraint") >= 0) {
                                                            ja("Não é possível excluir: cliente possui corridas no histórico. Desative em vez de excluir.", "error");
                                                        } else {
                                                            ja("" + (data.error || "Erro ao excluir"), "error");
                                                        }
                                                    }
                                                } catch (err) {
                                                    ja("Erro de conexão ao excluir", "error");
                                                }
                                            },
                                                title: "Excluir cliente permanentemente",
                                                className: "w-[29px] h-[29px] grid place-items-center rounded-[7px] border border-transparent transition text-[#6b7280] hover:bg-[#f9fafb] hover:border-[#fecaca] hover:text-[#991b1b]"
                                            }, ico("trash"))
                                        )
                                    );
                                })
                            ),
                            React.createElement("p", {className: "text-[12px] text-[#9ca3af] mt-4 flex items-center gap-1.5"},
                                React.createElement("svg", {className: "ico ico-sm", "aria-hidden": "true"}, React.createElement("use", {href: "#i-check"})),
                                "Ponto verde: configurado neste cliente. Cinza: herda a configura\u00e7\u00e3o global."
                            )
                        )
                    ),
                    
                    // ==================== GRUPOS DE ENDEREÇOS COMPARTILHADOS ====================
                    React.createElement("div", {className: "mt-6 pt-6 border-t"},
                        React.createElement("div", {className: "flex items-center justify-between mb-3"},
                            React.createElement("div", null,
                                React.createElement("h3", {className: "font-bold text-gray-700 flex items-center gap-2"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-building" })), "Grupos de Endereços Compartilhados")),
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
                                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Carregar")),
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
                                                "" + (g.total_clientes || 0) + " cliente(s) · " + (g.total_enderecos || 0) + " endereço(s)"
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
                                            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })), "Editar")),
                                            React.createElement("button", {
                                                onClick: async function() {
                                                    var totalC = parseInt(g.total_clientes) || 0;
                                                    var totalE = parseInt(g.total_enderecos) || 0;
                                                    var msg = "Excluir grupo \"" + g.nome + "\"?\n\n";
                                                    if (totalC > 0 || totalE > 0) {
                                                        msg += "Este grupo tem " + totalC + " cliente(s) e " + totalE + " endereço(s).\n";
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
                                                            ja("Grupo excluído", "success");
                                                            x({...p, gruposEnderecosLista: null});
                                                        } else ja("Erro ao excluir grupo", "error");
                                                    } catch { ja("Erro de conexão", "error"); }
                                                },
                                                className: "px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))
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
                        { id: "lista", label: "Usuários" },
                        { id: "bloqueadas", label: "Contas Bloqueadas" }
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
                        React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" }))),
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
                                React.createElement("option", {value: "user"}, "Usuário (Motoboy)"),
                                React.createElement("option", {value: "admin"}, "Admin"),
                                React.createElement("option", {value: "admin_financeiro"}, "Admin Financeiro"),
                                "admin_master" === l.role && React.createElement("option", {value: "admin_master"}, "Master")
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
                                    ja("Usuário criado!", "success");
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
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Criar Usuário"))
                ),
                
                // Lista de usuários (redesign: cards 4/linha, foto primeiro, paginação)
                React.createElement(ListaUsuariosView, {
                    usuarios: A,
                    usuario: l,
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
                    React.createElement("h2", {className: "text-lg font-bold mb-4"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-zap" })), "Informações do Sistema")),
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
                            React.createElement("p", {className: "font-bold text-lg text-green-600"}, "Online ")
                        )
                    )
                ),
                React.createElement("div", {className: "bg-yellow-50 border border-yellow-200 rounded-xl p-6"},
                    React.createElement("h3", {className: "font-bold text-yellow-800 mb-2"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Zona de Perigo")),
                    React.createElement("p", {className: "text-yellow-700 text-sm mb-4"}, "Ações irreversíveis. Use com cuidado."),
                    React.createElement("div", {className: "flex flex-wrap gap-3"},
                        React.createElement("button", {
                            onClick: function() { if(confirm("Limpar cache local?")) { localStorage.clear(); sessionStorage.clear(); ja("Cache limpo!", "success"); } },
                            className: "px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
                        }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })), "Limpar Cache")),
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
                        }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Forçar Atualização"))
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
                            ja("Categorias salvas!", "success");
                            x({...p, modalCategorias: null, clientesApiLista: null});
                        } else {
                            var err = await resp.json().catch(function() { return {}; });
                            ja("" + (err.error || "Erro ao salvar"), "error");
                            x({...p, modalCategorias: {...mc, salvando: false}});
                        }
                    } catch (e) {
                        ja("Erro de conexão", "error");
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
                                React.createElement("p", {className: "font-bold text-gray-800 flex items-center gap-2"}, React.createElement("svg", {className: "ico ico-lg text-purple-600", "aria-hidden": "true"}, React.createElement("use", {href: "#i-tag"})), "Modalidades de frete"),
                                React.createElement("p", {className: "text-xs text-gray-500 mt-0.5"}, mc.nome, " — ative só o que este cliente pode solicitar")
                            ),
                            React.createElement("button", {onClick: fecharModal, className: "text-gray-400 hover:text-gray-600 text-lg leading-none"}, React.createElement("svg", { className: "ico", style: { width: 20, height: 20 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
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
                                            style: ativa ? {background: "#faf7fd", color: "#770fa8"} : {background: "#e5e7eb", color: "#9ca3af"}
                                        }, cat.sigla),
                                        React.createElement("span", {className: "text-sm " + (ativa ? "text-gray-800" : "text-gray-400")}, cat.nome)
                                    ),
                                    
                                    React.createElement("button", {
                                        onClick: function() { toggleCat(cat.sigla); },
                                        className: "relative w-9 h-5 rounded-full transition-colors flex-shrink-0 border-0",
                                        style: {background: ativa ? "#770fa8" : "#d1d5db"},
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
                            }, mc.salvando ? "Salvando..." : React.createElement("span", {className: "inline-flex items-center gap-2"}, React.createElement("svg", {className: "ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-check"})), "Salvar"))
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
                                ja("Cliente atualizado! " + dataG.enderecos_migrados + " endereço(s) migrado(s) pro grupo", "success");
                            } else {
                                ja("Cliente atualizado!", "success");
                            }
                        } else {
                            ja("Dados salvos, mas erro ao atribuir grupo", "warning");
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
                                React.createElement("svg", {className: "ico ico-lg text-blue-600", "aria-hidden": "true"}, React.createElement("use", {href: "#i-pencil"})),
                                React.createElement("span", {className: "font-bold text-blue-700"}, "Editar Cliente")
                            ),
                            React.createElement("button", {
                                onClick: fecharModal,
                                className: "text-gray-400 hover:text-gray-600"
                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                        ),
                        
                        // Seção: Dados gerais
                        React.createElement("div", {className: "mb-4"},
                            React.createElement("div", {className: "text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"}, React.createElement("svg", {className: "ico-sm ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-list"})), "Dados"),
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
                            React.createElement("label", {className: "text-xs text-gray-600 font-medium flex items-center gap-1.5"}, React.createElement("svg", {className: "ico-sm ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-pin"})), "Grupo de Endereços"),
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
                                    ? "Este cliente vê e edita os endereços de todo o grupo"
                                    : "Este cliente tem endereços próprios, não compartilha com ninguém"
                            )
                        ),
                        
                        // Seção: Senha (opcional)
                        React.createElement("div", {className: "mb-4 pt-3 border-t"},
                            React.createElement("div", {className: "text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5"}, React.createElement("svg", {className: "ico-sm ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-lock"})), "Alterar Senha (opcional)"),
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
                                }, ec.mostrar_senha ? React.createElement("svg", {className: "ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-eyeoff"})) : React.createElement("svg", {className: "ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-eye"})))
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
                            temSenha && ec.nova_senha.length > 0 && ec.nova_senha.length < 6 && React.createElement("div", {className: "text-xs text-red-600 mt-1"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Mínimo 6 caracteres")),
                            temSenha && ec.nova_senha.length >= 6 && ec.confirmar_senha.length > 0 && ec.nova_senha !== ec.confirmar_senha && React.createElement("div", {className: "text-xs text-red-600 mt-1"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Senhas não conferem")),
                            temSenha && ec.nova_senha.length >= 6 && ec.nova_senha === ec.confirmar_senha && React.createElement("div", {className: "text-xs text-green-600 mt-1"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Senha OK"))
                        ),
                        
                        ec.erro && React.createElement("div", {className: "mb-3 px-3 py-2 bg-red-100 text-red-700 rounded text-xs"}, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), ec.erro),
                        
                        React.createElement("div", {className: "flex gap-2"},
                            React.createElement("button", {
                                onClick: fecharModal,
                                className: "flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvar,
                                disabled: !podeSalvar,
                                className: "flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            }, ec.salvando ? "Salvando..." : React.createElement("span", {className: "inline-flex items-center gap-2"}, React.createElement("svg", {className: "ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-check"})), "Salvar"))
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
                            ja(g.id ? "Grupo atualizado!" : "Grupo criado!", "success");
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
                                React.createElement("span", {className: "text-xl"}, g.id ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" }))),
                                React.createElement("span", {className: "font-bold text-purple-700"}, g.id ? "Editar Grupo" : "Novo Grupo de Endereços")
                            ),
                            React.createElement("button", {onClick: fechar, className: "text-gray-400 hover:text-gray-600"}, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
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
                        g.erro && React.createElement("div", {className: "mb-3 px-3 py-2 bg-red-100 text-red-700 rounded text-xs"}, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), g.erro),
                        React.createElement("div", {className: "flex gap-2"},
                            React.createElement("button", {
                                onClick: fechar,
                                className: "flex-1 py-2 border rounded-lg text-sm hover:bg-gray-50"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvar,
                                disabled: !podeSalvar,
                                className: "flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                            }, g.salvando ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Salvando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar"))
                        )
                    )
                );
            })(),

            // ==================== MODAL ALTERAR SENHA ====================

            // Modal — Provedores logísticos por cliente
            p.modalProvedores && (function() {
                var mp = p.modalProvedores;
                var PROVEDORES = [
                    // [provedor-tutts-opcional-v1] O Tutts deixou de ser fixo. Ha
                    // operacoes que usam SO o Hub — forcar o Tutts fazia o portal
                    // do cliente abrir sempre com ele selecionado.
                    {code: "tutts", nome: "Tutts",      desc: "frota propria da plataforma",   fixo: false},
                    {code: "uber",  nome: "Uber Flash",  desc: "entregas expressas via Uber",    fixo: false},
                    {code: "99",    nome: "99 Moto",     desc: "entregas via 99",                fixo: false}
                ];
                var toggle = function(code) {
                    // [provedor-tutts-opcional-v1] Qualquer provedor pode ser
                    // marcado/desmarcado, INCLUSIVE o Tutts. A unica regra: nao
                    // pode ficar zero — sem provedor o cliente nao despacha nada.
                    //
                    // Usa a forma FUNCIONAL do setState: le sempre o estado mais
                    // recente. Com o objeto capturado no render, dois cliques
                    // seguidos podiam partir de uma lista velha e perder a
                    // selecao anterior.
                    x(function(prev) {
                        var base = (prev && prev.modalProvedores) ? prev.modalProvedores : mp;
                        var atual = Array.isArray(base.selecionados) ? base.selecionados : ['tutts'];
                        var novo = atual.includes(code)
                            ? atual.filter(function(c) { return c !== code; })
                            : atual.concat([code]);
                        if (novo.length === 0) return prev;   // ignora o clique que zeraria
                        return {...prev, modalProvedores: {...base, selecionados: novo}};
                    });
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
                            ja("Provedores salvos!", "success");
                            x({...p, modalProvedores: null});
                        } else {
                            ja("" + (data.error || "Erro"), "error");
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
                                React.createElement("p", {className: "font-bold text-gray-800 flex items-center gap-2"}, React.createElement("svg", {className: "ico ico-lg text-purple-600", "aria-hidden": "true"}, React.createElement("use", {href: "#i-truck"})), "Provedores logísticos"),
                                React.createElement("p", {className: "text-xs text-gray-500 mt-0.5"}, mp.nome, " — ative só os que este cliente pode usar")
                            ),
                            React.createElement("button", {
                                onClick: function() { if (!mp.salvando) x({...p, modalProvedores: null}); },
                                className: "text-gray-400 hover:text-gray-600 text-lg"
                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                        ),
                        React.createElement("div", {className: "px-5 py-4 space-y-2"},
                            PROVEDORES.map(function(prov) {
                                var ativo = (mp.selecionados || ['tutts']).includes(prov.code);
                                // ultimo ativo: nao da pra desmarcar (ficaria sem provedor)
                                var ehUltimo = ativo && (mp.selecionados || ['tutts']).length === 1;
                                return React.createElement("div", {
                                    key: prov.code,
                                    onClick: function() { toggle(prov.code); },
                                    className: "flex items-center justify-between p-3 border rounded-xl transition-colors " +
                                        // [provedor-tutts-opcional-v1] O ultimo selecionado continua
                                        // com cara de ATIVO (roxo) — so nao deixa desmarcar. Antes ele
                                        // ficava cinza e parecia desabilitado, mesmo estando marcado.
                                        (prov.fixo ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200" :
                                        ehUltimo ? "bg-purple-50 border-purple-200 cursor-not-allowed" :
                                        ativo ? "bg-purple-50 border-purple-200 cursor-pointer" :
                                        "bg-gray-50 border-gray-200 cursor-pointer hover:bg-gray-100")
                                },
                                    React.createElement("div", {className: "flex items-center gap-3"},
                                        React.createElement("div", {
                                            className: "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0",
                                            style: {
                                                background: prov.code === "tutts" ? "#770fa8" :
                                                           prov.code === "uber"  ? "#111827" : "#d97706",
                                                color: prov.code === "99" ? "#111827" : "white"
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
                                        style: {accentColor: "#770fa8"}
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
                            }, mp.salvando ? "Salvando..." : React.createElement("span", {className: "inline-flex items-center gap-2"}, React.createElement("svg", {className: "ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-check"})), "Salvar"))
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
                               alterar_mapp: mp.alterar_mapp !== false,
                               restaurar_cancel: mp.restaurar_cancel !== false,
                               valor_fixo: mp.valor_fixo === "" ? null : parseFloat(String(mp.valor_fixo).replace(",", ".")),
                               km_base: mp.km_base === "" ? null : parseFloat(String(mp.km_base).replace(",", ".")),
                               valor_km_adicional: mp.valor_km_adicional === "" ? null : parseFloat(String(mp.valor_km_adicional).replace(",", ".")),
                               retorno_valor: mp.retorno_modo === "pct" || mp.retorno_valor === "" || mp.retorno_valor == null
                                   ? null : parseFloat(String(mp.retorno_valor).replace(",", ".")),
                               retorno_percentual: mp.retorno_modo !== "pct" || mp.retorno_percentual === "" || mp.retorno_percentual == null
                                   ? null : parseFloat(String(mp.retorno_percentual).replace(",", ".")),
                               faixas_km: Array.isArray(mp.faixas_km) ? mp.faixas_km.map(function (f) { return { inicio_km: (f.inicio_km === "" || f.inicio_km == null) ? null : parseInt(String(f.inicio_km).replace(",", "."), 10), valor_km: (f.valor_km === "" || f.valor_km == null) ? null : parseFloat(String(f.valor_km).replace(",", ".")) }; }).filter(function (f) { return f.inicio_km != null && f.valor_km != null && f.valor_km >= 0; }) : null}; // FAIXAS_CFG_SAVE_V2
                        var resp = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + mp.id + "/preco-hub", {
                            method: "PUT",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify(body)
                        });
                        var data = await resp.json().catch(function() { return {}; });
                        // Mensagem pro entregador (99) — salva junto, exceto no "Limpar" (que so mexe no preco).
                        var respMsg = {ok: true};
                        if (!limpar) {
                            respMsg = await fetchAuth(API_URL + "/admin/solicitacao/clientes/" + mp.id + "/perfil-mensagem", {
                                method: "PATCH",
                                headers: {"Content-Type": "application/json"},
                                body: JSON.stringify({
                                    nome_remetente: (mp.nome_remetente || "").trim(),
                                    package_type: mp.package_type || "",
                                    package_weight: mp.package_weight || "",
                                    aviso_entregador: (mp.aviso_entregador || "").trim()
                                })
                            });
                        }
                        if (resp.ok && respMsg.ok) {
                            ja(limpar ? "Preço removido (herda global)" : "Configurações salvas!", "success");
                            x({...p, modalPreco: null, clientesApiLista: null});
                        } else {
                            ja("" + (data.error || "Erro"), "error");
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
                                React.createElement("p", {className: "font-bold text-gray-800 flex items-center gap-2"}, React.createElement("svg", {className: "ico ico-lg text-purple-600", "aria-hidden": "true"}, React.createElement("use", {href: "#i-settings"})), "Configurações do Hub"),
                                React.createElement("p", {className: "text-xs text-gray-500 mt-0.5"}, mp.nome, " — preço e mensagem deste cliente")
                            ),
                            React.createElement("button", {onClick: fechar, className: "text-gray-400 hover:text-gray-600 text-lg"}, React.createElement("svg", { className: "ico", style: { width: 20, height: 20 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                        ),
                        React.createElement("div", {className: "px-5 py-4"},
                            React.createElement("label", {className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4 cursor-pointer"},
                                React.createElement("input", {
                                    type: "checkbox", checked: mp.ativo !== false,
                                    onChange: function(e) { up("ativo", e.target.checked); },
                                    className: "w-4 h-4", style: {accentColor: "#770fa8"}
                                }),
                                React.createElement("span", {className: "text-sm text-gray-700"}, "Usar tabela própria deste cliente",
                                    React.createElement("span", {className: "block text-[11px] text-gray-400"}, "Desligado: herda a tabela global"))
                            ),
                            React.createElement("div", {className: "grid grid-cols-3 gap-3 mb-4"},
                                campo("Valor fixo (R$)", "valor_fixo", "cobrado até a base"),
                                campo("Distância base (km)", "km_base", "km inclusos"),
                                campo("Por km adic. (R$)", "valor_km_adicional", "a partir do excedente")
                            ),
                            React.createElement("div", {className: "border-t pt-3 mb-4"}, // MAPP_TOGGLE_CLIENTE_FRONT_V1
                                React.createElement("div", {className: "flex items-center justify-between mb-2"},
                                    React.createElement("span", {className: "text-sm text-gray-700"}, "Alterar valores na Mapp (cliente + motoboy)",
                                        React.createElement("span", {className: "block text-[11px] text-gray-400"}, "Ligado: o Hub grava os valores na Mapp no despacho")),
                                    React.createElement("button", {type: "button", onClick: function(){ up("alterar_mapp", mp.alterar_mapp === false); },
                                        className: "relative w-11 h-6 rounded-full transition-colors flex-shrink-0 " + (mp.alterar_mapp !== false ? "bg-purple-600" : "bg-gray-300")},
                                        React.createElement("span", {className: "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all " + (mp.alterar_mapp !== false ? "right-0.5" : "left-0.5")}))
                                ),
                                React.createElement("div", {className: "flex items-center justify-between"},
                                    React.createElement("span", {className: "text-sm text-gray-700"}, "Devolver valores originais ao cancelar",
                                        React.createElement("span", {className: "block text-[11px] text-gray-400"}, "Ligado: no cancelamento a Mapp volta aos valores originais")),
                                    React.createElement("button", {type: "button", onClick: function(){ up("restaurar_cancel", mp.restaurar_cancel === false); },
                                        className: "relative w-11 h-6 rounded-full transition-colors flex-shrink-0 " + (mp.restaurar_cancel !== false ? "bg-purple-600" : "bg-gray-300")},
                                        React.createElement("span", {className: "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all " + (mp.restaurar_cancel !== false ? "right-0.5" : "left-0.5")}))
                                )
                            ),
                            (function () { // FAIXAS_CFG_RENDER_V2
                                var faixas = Array.isArray(mp.faixas_km) ? mp.faixas_km : [];
                                var setFaixas = function (arr) { x({...p, modalPreco: {...mp, faixas_km: arr}}); };
                                var upF = function (i, campo, val) { var c = faixas.map(function (y) { return {...y}; }); c[i][campo] = val; setFaixas(c); };
                                var addF = function () { setFaixas(faixas.concat([{inicio_km: "", valor_km: ""}])); };
                                var rmF = function (i) { setFaixas(faixas.filter(function (_y, j) { return j !== i; })); };
                                return React.createElement("div", {className: "border-t pt-3 mb-4"},
                                    React.createElement("div", {className: "flex items-center justify-between mb-2"},
                                        React.createElement("span", {className: "text-[11px] font-semibold tracking-wide text-gray-500 uppercase"}, "Faixas por km (opcional)"),
                                        React.createElement("span", {className: "text-[10px] text-gray-400"}, "vazio = usa por km adic.")),
                                    faixas.map(function (f, i) {
                                        return React.createElement("div", {key: i, className: "flex items-center gap-1.5 mb-1.5"},
                                            React.createElement("span", {className: "text-[11px] text-gray-500"}, "a partir de"),
                                            React.createElement("input", {type: "number", step: "1", min: "0", value: f.inicio_km == null ? "" : f.inicio_km, onChange: function (e) { upF(i, "inicio_km", e.target.value); }, placeholder: "km", className: "w-16 px-1.5 py-1 border rounded text-sm text-center"}),
                                            React.createElement("span", {className: "text-[11px] text-gray-600"}, "km"),
                                            React.createElement("span", {className: "text-[11px] text-gray-500", style: {marginLeft: "auto"}}, "R$"),
                                            React.createElement("input", {type: "number", step: "0.1", min: "0", value: f.valor_km == null ? "" : f.valor_km, onChange: function (e) { upF(i, "valor_km", e.target.value); }, className: "w-16 px-1.5 py-1 border rounded text-sm text-center"}),
                                            React.createElement("span", {className: "text-[11px] text-gray-600"}, "/km"),
                                            React.createElement("button", {type: "button", onClick: function () { rmF(i); }, className: "p-1 rounded hover:bg-gray-100", title: "remover"}, React.createElement("svg", {className: "ico", style: {width: 14, height: 14, color: "#991b1b"}, "aria-hidden": "true"}, React.createElement("use", {href: "#i-trash"}))));
                                    }),
                                    React.createElement("button", {type: "button", onClick: addF, className: "mt-1 text-xs font-semibold text-purple-700 border border-purple-300 rounded-lg px-3 py-1.5 hover:bg-purple-50"}, React.createElement("svg", {className: "ico", style: {width: 13, height: 13, display: "inline", verticalAlign: "-2px", marginRight: 3}, "aria-hidden": "true"}, React.createElement("use", {href: "#i-plus"})), "Adicionar faixa"),
                                    React.createElement("p", {className: "text-[10px] text-gray-400 mt-1"}, "Cada faixa vale do km informado em diante, ate a proxima comecar. Ex: a partir de 3 = 1,50; de 7 = 1,80. Distancia quebrada sobe pro km de cima."));
                            })(),
                            (function() {
                                // [retorno-percentual-v1] radio fixo/percentual + previa do calculo
                                var modo = mp.retorno_modo || "fixo";
                                var pct = parseFloat(String(mp.retorno_percentual || "").replace(",", ".")) || 0;
                                var fix = parseFloat(String(mp.retorno_valor || "").replace(",", ".")) || 0;
                                var adic = modo === "pct" ? Math.round(vf * (pct / 100) * 100) / 100 : fix;
                                var opt = function(val, rotulo) {
                                    return React.createElement("label", {key: val, className: "flex items-center gap-1.5 cursor-pointer text-xs text-gray-700"},
                                        React.createElement("input", {type: "radio", checked: modo === val,
                                            onChange: function() { up("retorno_modo", val); },
                                            style: {accentColor: "#770fa8"}}),
                                        rotulo);
                                };
                                return React.createElement("div", {className: "mb-4 pt-3 border-t"},
                                    React.createElement("p", {className: "text-[11px] font-semibold tracking-wide text-gray-500 mb-2 uppercase flex items-center gap-1.5"}, React.createElement("svg", {className: "ico-sm ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-corner"})), "Adicional por retorno"),
                                    React.createElement("div", {className: "flex items-center gap-4 mb-2"}, opt("fixo", "Valor fixo"), opt("pct", "Percentual")),
                                    React.createElement("div", {className: "flex items-center gap-2"},
                                        React.createElement("input", {
                                            type: "number", step: modo === "pct" ? "1" : "0.10",
                                            min: "0", max: modo === "pct" ? "100" : undefined,
                                            value: (modo === "pct" ? mp.retorno_percentual : mp.retorno_valor) || "",
                                            onChange: function(e) { up(modo === "pct" ? "retorno_percentual" : "retorno_valor", e.target.value); },
                                            placeholder: modo === "pct" ? "ex: 50" : "ex: 8,00",
                                            className: "w-28 px-2 py-2 border rounded-lg text-sm"
                                        }),
                                        React.createElement("span", {className: "text-xs text-gray-600"}, modo === "pct" ? "% do valor da corrida" : "R$")
                                    ),
                                    (adic > 0 && vf > 0) ? React.createElement("p", {className: "text-[11px] text-purple-800 mt-2 bg-purple-50 rounded px-2 py-1 inline-block"},
                                        "Corrida de R$ " + brl(vf) + "  →  +R$ " + brl(adic) + "  →  total R$ " + brl(Math.round((vf + adic) * 100) / 100)) : null,
                                    React.createElement("p", {className: "text-[11px] text-gray-400 mt-1"},
                                        "Somado ao valor da corrida quando a entrega vira devolução. Em branco = não cobra retorno.")
                                );
                            })(),
                            React.createElement("div", {className: "pt-4 border-t"},
                                React.createElement("p", {className: "text-sm font-semibold text-gray-800 mb-1 flex items-center gap-1.5"}, React.createElement("svg", {className: "ico-sm ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-message"})), "Mensagem pro entregador (99)"),
                                React.createElement("p", {className: "text-[11px] text-gray-400 mb-3"}, "Em branco usa o global. A regra do Hub, se houver, tem prioridade."),
                                React.createElement("div", {className: "mb-3"},
                                    React.createElement("label", {className: "block text-[11px] font-semibold tracking-wide text-gray-500 mb-1 uppercase"}, "Nome do remetente"),
                                    React.createElement("input", {
                                        type: "text", value: mp.nome_remetente || "",
                                        onChange: function(e) { up("nome_remetente", e.target.value); },
                                        maxLength: 100, placeholder: "vazio = usa o global",
                                        className: "w-full px-2 py-2 border rounded-lg text-sm"
                                    })
                                ),
                                React.createElement("div", {className: "grid grid-cols-2 gap-3 mb-3"},
                                    React.createElement("div", null,
                                        React.createElement("label", {className: "block text-[11px] font-semibold tracking-wide text-gray-500 mb-1 uppercase"}, "Tipo de transporte"),
                                        React.createElement("select", {
                                            value: mp.package_type || "",
                                            onChange: function(e) { up("package_type", e.target.value); },
                                            className: "w-full px-2 py-2 border rounded-lg text-sm bg-white"
                                        },
                                            React.createElement("option", {value: ""}, "Global (padrao)"),
                                            React.createElement("option", {value: "medication"}, "Medicamentos"),
                                            React.createElement("option", {value: "documents"}, "Documentos"),
                                            React.createElement("option", {value: "food"}, "Alimentos"),
                                            React.createElement("option", {value: "groceries"}, "Mantimentos"),
                                            React.createElement("option", {value: "electronics"}, "Eletronicos"),
                                            React.createElement("option", {value: "apparel"}, "Vestuario"),
                                            React.createElement("option", {value: "others"}, "Outros")
                                        )
                                    ),
                                    React.createElement("div", null,
                                        React.createElement("label", {className: "block text-[11px] font-semibold tracking-wide text-gray-500 mb-1 uppercase"}, "Peso"),
                                        React.createElement("select", {
                                            value: mp.package_weight || "",
                                            onChange: function(e) { up("package_weight", e.target.value); },
                                            className: "w-full px-2 py-2 border rounded-lg text-sm bg-white"
                                        },
                                            React.createElement("option", {value: ""}, "Global (padrao)"),
                                            React.createElement("option", {value: "1kg"}, "Ate 1kg"),
                                            React.createElement("option", {value: "5kg"}, "Ate 5kg"),
                                            React.createElement("option", {value: "10kg"}, "Ate 10kg"),
                                            React.createElement("option", {value: "20kg"}, "Ate 20kg"),
                                            React.createElement("option", {value: "30kg"}, "Ate 30kg")
                                        )
                                    )
                                ),
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-[11px] font-semibold tracking-wide text-gray-500 mb-1 uppercase"}, "Observacao (" + (mp.aviso_entregador || "").length + "/127)"),
                                    React.createElement("textarea", {
                                        value: mp.aviso_entregador || "",
                                        onChange: function(e) { up("aviso_entregador", e.target.value.slice(0, 127)); },
                                        maxLength: 127, rows: 2, placeholder: "vazio = usa o aviso global",
                                        className: "w-full px-2 py-2 border rounded-lg text-sm resize-y"
                                    })
                                )
                            )
                        ),
                        React.createElement("div", {className: "px-5 py-3 bg-gray-50 border-t flex gap-3"},
                            React.createElement("button", {
                                onClick: function() { if (!mp.salvando) salvar(true); },
                                disabled: mp.salvando,
                                className: "px-3 py-2 border border-gray-300 text-gray-500 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                            }, "Limpar"),
                            React.createElement("button", {
                                onClick: fechar, disabled: mp.salvando,
                                className: "flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: function() { salvar(false); }, disabled: mp.salvando,
                                className: "flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 " +
                                    (mp.salvando ? "bg-purple-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700")
                            }, mp.salvando ? "Salvando..." : React.createElement("span", {className: "inline-flex items-center gap-2"}, React.createElement("svg", {className: "ico", "aria-hidden": "true"}, React.createElement("use", {href: "#i-check"})), "Salvar"))
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
                            ja(data.mensagem || "Cadastro salvo!", "success");
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
                                React.createElement("p", {className: "font-bold text-gray-800"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Cadastro pelo Admin")),
                                React.createElement("p", {className: "text-xs text-gray-500 mt-0.5"}, nome, " — COD ", cod)
                            ),
                            React.createElement("button", {onClick: fechar, className: "text-gray-400 hover:text-gray-600 text-lg"}, React.createElement("svg", { className: "ico", style: { width: 20, height: 20 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                        ),
                        React.createElement("div", {className: "px-5 py-4 space-y-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-xs font-semibold text-gray-600 mb-2"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-camera" })), "Foto do Profissional")),
                                p.cadastroAdminFoto
                                    ? React.createElement("div", {className: "relative"},
                                        React.createElement("img", {src: p.cadastroAdminFoto, className: "w-full h-40 object-cover rounded-xl"}),
                                        React.createElement("button", {
                                            onClick: function() { x({...p, cadastroAdminFoto: null}); },
                                            className: "absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold"
                                        }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                                      )
                                    : React.createElement("label", {
                                        className: "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                                      },
                                        React.createElement("span", {className: "text-3xl mb-1"}, React.createElement("svg", { className: "ico", style: { width: 30, height: 30 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-camera" }))),
                                        React.createElement("span", {className: "text-xs text-gray-500"}, "Clique para selecionar foto"),
                                        React.createElement("input", {type: "file", accept: "image/*", className: "hidden", onChange: onFoto})
                                      )
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-xs font-semibold text-gray-600 mb-1"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-phone" })), "WhatsApp")),
                                React.createElement("input", {
                                    type: "tel",
                                    placeholder: "(71) 9 9999-9999",
                                    value: p.cadastroAdminWhatsapp || "",
                                    onChange: function(e) { x({...p, cadastroAdminWhatsapp: e.target.value}); },
                                    className: "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                                })
                            ),
                            p.cadastroAdminErro && React.createElement("p", {className: "text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg"}, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), p.cadastroAdminErro)
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
                            }, p.cadastroAdminSalvando ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Salvando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Salvar"))
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
                            ja("Senha de " + userName + " alterada com sucesso!", "success");
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
                                    React.createElement("h3", {className: "text-lg font-bold"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-key" })), "Alterar Senha")),
                                    React.createElement("p", {className: "text-purple-200 text-sm mt-0.5"}, userName, " (", userCod, ")")
                                ),
                                React.createElement("button", {
                                    onClick: fecharModal,
                                    className: "w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
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
                                    }, mostrar ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-eyeoff" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-eye" })))
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
                                                senha.length === 0 && regra.id !== "match" ? "" : regra.ok ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" }))
                                            ),
                                            React.createElement("span", {className: regra.ok ? "font-medium" : ""}, regra.label)
                                        );
                                    }),
                                    // Aviso senha comum
                                    ehComum && React.createElement("div", {className: "flex items-center gap-2 text-sm text-red-500 mt-1"},
                                        React.createElement("span", {className: "text-base flex-shrink-0 w-5 text-center"}, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" }))),
                                        React.createElement("span", {className: "font-medium"}, "Senha muito comum")
                                    )
                                )
                            ),

                            // Mensagem de erro
                            erro && React.createElement("div", {className: "bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm"}, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), erro)
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
                            }, salvando ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clock" })), "Salvando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Alterar Senha"))
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
