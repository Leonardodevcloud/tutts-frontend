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

    // Componente principal do módulo Config
    window.ModuloConfigComponent = function(props) {
        const {
            usuario,
            estado,
            setEstado,
            usuarios,
            setores,
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
            atualizarSetorUsuario,
            setorExpandido,
            setSetorExpandido,
            showSetorModal,
            setShowSetorModal,
            setorEdit,
            setSetorEdit,
            setorForm,
            setSetorForm,
            salvarSetor,
            excluirSetor,
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
                
                // Gerenciamento de Setores
                React.createElement("div", {className: "bg-white rounded-xl shadow-sm border p-6 mb-6"},
                    React.createElement("div", {className: "flex items-center justify-between mb-4"},
                        React.createElement("h2", {className: "text-lg font-bold flex items-center gap-2"},
                            React.createElement("span", null, "🏢"),
                            "Setores"
                        ),
                        React.createElement("button", {
                            onClick: function() {
                                setSetorEdit(null);
                                setSetorForm({nome: "", cor: "#6366f1", ativo: true});
                                setShowSetorModal(true);
                            },
                            className: "px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                        }, "➕ Novo Setor")
                    ),
                    setores.length === 0 
                        ? React.createElement("p", {className: "text-gray-500 text-center py-4"}, "Nenhum setor cadastrado")
                        : React.createElement("div", {className: "space-y-2"},
                            setores.map(function(setor) {
                                const isExpanded = setorExpandido === setor.id;
                                const usersInSetor = A.filter(u => u.setor_id === setor.id);
                                return React.createElement("div", {
                                    key: setor.id,
                                    className: "border rounded-lg overflow-hidden"
                                },
                                    React.createElement("div", {
                                        className: "flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50",
                                        onClick: () => setSetorExpandido(isExpanded ? null : setor.id)
                                    },
                                        React.createElement("div", {className: "flex items-center gap-3"},
                                            React.createElement("div", {
                                                className: "w-4 h-4 rounded-full",
                                                style: {backgroundColor: setor.cor || "#6366f1"}
                                            }),
                                            React.createElement("span", {className: "font-medium"}, setor.nome),
                                            React.createElement("span", {
                                                className: "text-xs px-2 py-0.5 rounded " + (setor.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")
                                            }, setor.ativo ? "Ativo" : "Inativo"),
                                            React.createElement("span", {className: "text-xs text-gray-500"}, usersInSetor.length, " usuários")
                                        ),
                                        React.createElement("div", {className: "flex items-center gap-2"},
                                            React.createElement("button", {
                                                onClick: function(e) {
                                                    e.stopPropagation();
                                                    setSetorEdit(setor);
                                                    setSetorForm({nome: setor.nome, cor: setor.cor || "#6366f1", ativo: setor.ativo});
                                                    setShowSetorModal(true);
                                                },
                                                className: "p-1.5 hover:bg-gray-200 rounded"
                                            }, "✏️"),
                                            React.createElement("button", {
                                                onClick: function(e) {
                                                    e.stopPropagation();
                                                    if (confirm("Excluir setor " + setor.nome + "?")) {
                                                        excluirSetor(setor.id);
                                                    }
                                                },
                                                className: "p-1.5 hover:bg-red-100 rounded text-red-600"
                                            }, "🗑️"),
                                            React.createElement("span", {className: "text-gray-400"}, isExpanded ? "▼" : "▶")
                                        )
                                    ),
                                    isExpanded && usersInSetor.length > 0 && React.createElement("div", {className: "border-t bg-gray-50 p-3"},
                                        React.createElement("div", {className: "grid grid-cols-2 md:grid-cols-3 gap-2"},
                                            usersInSetor.map(u => 
                                                React.createElement("div", {key: u.codProfissional, className: "text-sm text-gray-600"},
                                                    "• ", u.fullName
                                                )
                                            )
                                        )
                                    )
                                );
                            })
                        )
                ),
                
                // Modal de Setor
                showSetorModal && React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50",
                    onClick: () => setShowSetorModal(false)
                },
                    React.createElement("div", {
                        className: "bg-white rounded-xl p-6 w-full max-w-md mx-4",
                        onClick: e => e.stopPropagation()
                    },
                        React.createElement("h3", {className: "text-lg font-bold mb-4"}, setorEdit ? "✏️ Editar Setor" : "➕ Novo Setor"),
                        React.createElement("div", {className: "space-y-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold mb-1"}, "Nome"),
                                React.createElement("input", {
                                    type: "text",
                                    value: setorForm.nome,
                                    onChange: e => setSetorForm({...setorForm, nome: e.target.value}),
                                    className: "w-full px-3 py-2 border rounded-lg",
                                    placeholder: "Nome do setor"
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold mb-1"}, "Cor"),
                                React.createElement("input", {
                                    type: "color",
                                    value: setorForm.cor,
                                    onChange: e => setSetorForm({...setorForm, cor: e.target.value}),
                                    className: "w-full h-10 rounded-lg cursor-pointer"
                                })
                            ),
                            React.createElement("label", {className: "flex items-center gap-2"},
                                React.createElement("input", {
                                    type: "checkbox",
                                    checked: setorForm.ativo,
                                    onChange: e => setSetorForm({...setorForm, ativo: e.target.checked}),
                                    className: "w-4 h-4 rounded"
                                }),
                                React.createElement("span", {className: "text-sm"}, "Setor ativo")
                            )
                        ),
                        React.createElement("div", {className: "flex gap-3 mt-6"},
                            React.createElement("button", {
                                onClick: () => setShowSetorModal(false),
                                className: "flex-1 px-4 py-2 border rounded-lg font-semibold hover:bg-gray-100"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvarSetor,
                                disabled: !setorForm.nome.trim(),
                                className: "flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                            }, setorEdit ? "💾 Salvar" : "➕ Criar")
                        )
                    )
                ),
                
                // Lista de usuários — REDESIGN: cards 4/linha, com foto primeiro, paginação
                React.createElement("div", {className: "bg-white rounded-2xl shadow-sm border p-6"},
                    // Toolbar: título + busca + filtro de tipo
                    React.createElement("div", {className: "flex items-center justify-between mb-5 flex-wrap gap-3"},
                        React.createElement("h2", {className: "text-lg font-bold flex items-center gap-2"},
                            React.createElement("span", null, "📋"),
                            "Usuários Cadastrados ",
                            React.createElement("span", {className: "bg-purple-100 text-purple-700 text-sm font-semibold px-2.5 py-0.5 rounded-full"}, A.length)
                        ),
                        React.createElement("div", {className: "flex items-center gap-2 flex-wrap"},
                            // Campo de busca
                            React.createElement("div", {className: "relative"},
                                React.createElement("input", {
                                    type: "text",
                                    value: p.buscaUsuario || "",
                                    onChange: function(e) { x({...p, buscaUsuario: e.target.value, usuariosPagina: 1}); },
                                    className: "w-72 pl-10 pr-8 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
                                    placeholder: "Buscar por nome ou código..."
                                }),
                                React.createElement("span", {className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"}, "🔍"),
                                p.buscaUsuario && React.createElement("button", {
                                    onClick: function() { x({...p, buscaUsuario: "", usuariosPagina: 1}); },
                                    className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                }, "✕")
                            ),
                            // Filtro de tipo
                            React.createElement("select", {
                                value: p.filtroTipoUsuario || "todos",
                                onChange: function(e) { x({...p, filtroTipoUsuario: e.target.value, usuariosPagina: 1}); },
                                className: "border rounded-lg text-sm px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500"
                            },
                                React.createElement("option", {value: "todos"}, "Todos os tipos"),
                                React.createElement("option", {value: "admin_master"}, "👑 Master"),
                                React.createElement("option", {value: "admin"}, "👑 Admin"),
                                React.createElement("option", {value: "admin_financeiro"}, "💰 Financeiro"),
                                React.createElement("option", {value: "user"}, "👤 Usuário")
                            )
                        )
                    ),

                    // Lista filtrada + ordenada + paginada
                    (function() {
                        const busca = (p.buscaUsuario || "").toLowerCase().trim();
                        const filtroTipo = p.filtroTipoUsuario || "todos";
                        const POR_PAGINA = 40;

                        // 1) Filtrar por busca + tipo
                        let filtrados = A.filter(function(user) {
                            if (filtroTipo !== "todos" && user.role !== filtroTipo) return false;
                            if (!busca) return true;
                            const nome = (user.fullName || user.full_name || "").toLowerCase();
                            const cod = String(user.codProfissional || user.cod_profissional || "").toLowerCase();
                            return nome.includes(busca) || cod.includes(busca);
                        });

                        // 2) Ordenar: contas com foto sempre primeiro, depois alfabético
                        filtrados = filtrados.slice().sort(function(a, b) {
                            const fa = a.foto ? 0 : 1;
                            const fb = b.foto ? 0 : 1;
                            if (fa !== fb) return fa - fb;
                            return (a.fullName || a.full_name || "").localeCompare(b.fullName || b.full_name || "");
                        });

                        const total = filtrados.length;
                        const totalComFoto = filtrados.filter(function(u) { return !!u.foto; }).length;

                        if (total === 0) {
                            return React.createElement("div", {className: "text-center py-12 text-gray-500"},
                                React.createElement("span", {className: "text-4xl block mb-2"}, "🔍"),
                                (busca || filtroTipo !== "todos")
                                    ? "Nenhum usuário encontrado com esses filtros"
                                    : "Nenhum usuário cadastrado"
                            );
                        }

                        // 3) Paginação
                        const totalPaginas = Math.ceil(total / POR_PAGINA);
                        let pagina = p.usuariosPagina || 1;
                        if (pagina > totalPaginas) pagina = totalPaginas;
                        if (pagina < 1) pagina = 1;
                        const inicio = (pagina - 1) * POR_PAGINA;
                        const paginaItens = filtrados.slice(inicio, inicio + POR_PAGINA);

                        // Separar a página atual em com/sem foto (mantém a ordenação global)
                        const comFotoPag = paginaItens.filter(function(u) { return !!u.foto; });
                        const semFotoPag = paginaItens.filter(function(u) { return !u.foto; });

                        // Metadados visuais por tipo de usuário
                        const ROLE_INFO = {
                            admin_master:     { txt: "👑 Master",     bar: "bg-purple-600", ring: "ring-purple-200", badge: "bg-purple-100 text-purple-700" },
                            admin:            { txt: "👑 Admin",      bar: "bg-blue-600",   ring: "ring-blue-200",   badge: "bg-blue-100 text-blue-700" },
                            admin_financeiro: { txt: "💰 Financeiro", bar: "bg-green-600",  ring: "ring-green-200",  badge: "bg-green-100 text-green-700" },
                            user:             { txt: "👤 Usuário",    bar: "bg-gray-400",   ring: "ring-gray-200",   badge: "bg-gray-100 text-gray-600" }
                        };

                        // Renderizador de card individual
                        function renderCardUsuario(user) {
                            const r = ROLE_INFO[user.role] || ROLE_INFO.user;
                            const nome = user.fullName || user.full_name || "";
                            const cod = user.codProfissional || user.cod_profissional || "";
                            return React.createElement("div", {
                                key: cod,
                                className: "relative border rounded-2xl p-5 flex flex-col items-center text-center bg-white hover:shadow-md hover:border-purple-200 transition-all"
                            },
                                // Faixa de cor no topo (indica o tipo)
                                React.createElement("div", {className: "absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl " + r.bar}),
                                // Avatar (foto ou inicial)
                                user.foto
                                    ? React.createElement("img", {
                                        src: user.foto,
                                        alt: nome,
                                        className: "w-16 h-16 rounded-full object-cover ring-4 " + r.ring
                                    })
                                    : React.createElement("div", {
                                        className: "w-16 h-16 rounded-full ring-4 flex items-center justify-center text-white text-2xl font-bold " + r.ring + " " + r.bar
                                    }, nome ? nome.charAt(0).toUpperCase() : "?"),
                                // Nome
                                React.createElement("p", {
                                    className: "font-bold text-sm mt-3 leading-tight h-9 flex items-center justify-center overflow-hidden",
                                    title: nome
                                }, nome),
                                React.createElement("p", {className: "text-xs text-gray-400 mb-2"}, "COD: ", cod),
                                // Badge de tipo
                                React.createElement("span", {className: "text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 " + r.badge}, r.txt),
                                // Setor (select compacto — mantém edição inline)
                                React.createElement("select", {
                                    value: user.setor_id || "",
                                    onChange: async function(e) {
                                        const novoSetorId = e.target.value ? parseInt(e.target.value) : null;
                                        await atualizarSetorUsuario(cod, novoSetorId);
                                    },
                                    className: "w-full mb-4 px-2 py-1.5 border rounded-lg text-xs bg-gray-50 text-gray-600 focus:ring-2 focus:ring-indigo-500"
                                },
                                    React.createElement("option", {value: ""}, "🏢 Sem setor"),
                                    setores.filter(function(s) { return s.ativo; }).map(function(setor) {
                                        return React.createElement("option", {key: setor.id, value: setor.id}, setor.nome);
                                    })
                                ),
                                // Ações
                                React.createElement("div", {className: "flex gap-2 w-full mt-auto"},
                                    React.createElement("button", {
                                        onClick: function() {
                                            x({...p, senhaModal: true, senhaModalUser: user, senhaModalValue: "", senhaModalConfirm: "", senhaModalShow: false, senhaModalErro: ""});
                                        },
                                        className: "flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                                    }, "🔑 Senha"),
                                    user.role !== "admin_master" && React.createElement("button", {
                                        onClick: async function() {
                                            let userCod = cod;
                                            if (userCod && typeof userCod === "string") userCod = userCod.replace("#", "");
                                            if (!userCod) { ja("❌ Código do usuário não encontrado", "error"); return; }
                                            if (confirm("⚠️ Excluir " + nome + "?\n\nEsta ação não pode ser desfeita!")) {
                                                try {
                                                    const response = await fetchAuth(API_URL + "/users/" + userCod, {method: "DELETE"});
                                                    if (response.ok) { ja("🗑️ Usuário excluído!", "success"); Ia(); }
                                                    else {
                                                        const errData = await response.json().catch(function() { return {}; });
                                                        ja("❌ Erro: " + (errData.error || response.statusText), "error");
                                                    }
                                                } catch (err) { ja("❌ Erro ao excluir", "error"); }
                                            }
                                        },
                                        className: "px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                                    }, "🗑️")
                                )
                            );
                        }

                        const irParaPagina = function(n) {
                            x({...p, usuariosPagina: Math.min(Math.max(1, n), totalPaginas)});
                        };

                        return React.createElement("div", null,
                            // Linha de resumo
                            React.createElement("p", {className: "text-sm text-gray-500 mb-4"},
                                "Mostrando ", paginaItens.length, " de ", total, " usuário(s)",
                                (busca || filtroTipo !== "todos") ? " (filtrado)" : "",
                                " • ", totalComFoto, " com foto"
                            ),

                            // SEÇÃO: COM FOTO
                            comFotoPag.length > 0 && React.createElement("div", {className: "mb-6"},
                                React.createElement("div", {className: "flex items-center gap-2 mb-3"},
                                    React.createElement("span", {className: "text-sm font-bold text-gray-700"}, "📷 Com foto"),
                                    React.createElement("span", {className: "text-xs text-gray-400"}, comFotoPag.length),
                                    React.createElement("div", {className: "flex-1 h-px bg-gray-100"})
                                ),
                                React.createElement("div", {className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"},
                                    comFotoPag.map(renderCardUsuario)
                                )
                            ),

                            // SEÇÃO: SEM FOTO
                            semFotoPag.length > 0 && React.createElement("div", null,
                                React.createElement("div", {className: "flex items-center gap-2 mb-3"},
                                    React.createElement("span", {className: "text-sm font-bold text-gray-700"}, "👤 Sem foto"),
                                    React.createElement("span", {className: "text-xs text-gray-400"}, semFotoPag.length),
                                    React.createElement("div", {className: "flex-1 h-px bg-gray-100"})
                                ),
                                React.createElement("div", {className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"},
                                    semFotoPag.map(renderCardUsuario)
                                )
                            ),

                            // PAGINAÇÃO
                            totalPaginas > 1 && React.createElement("div", {className: "flex items-center justify-center gap-3 mt-6 pt-4 border-t"},
                                React.createElement("button", {
                                    onClick: function() { irParaPagina(pagina - 1); },
                                    disabled: pagina <= 1,
                                    className: "px-4 py-2 rounded-lg text-sm font-semibold border transition-colors " +
                                        (pagina <= 1 ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-gray-700 border-gray-300 hover:bg-gray-50")
                                }, "← Anterior"),
                                React.createElement("span", {className: "text-sm text-gray-600"},
                                    "Página ", pagina, " de ", totalPaginas
                                ),
                                React.createElement("button", {
                                    onClick: function() { irParaPagina(pagina + 1); },
                                    disabled: pagina >= totalPaginas,
                                    className: "px-4 py-2 rounded-lg text-sm font-semibold border transition-colors " +
                                        (pagina >= totalPaginas ? "text-gray-300 border-gray-200 cursor-not-allowed" : "text-gray-700 border-gray-300 hover:bg-gray-50")
                                }, "Próxima →")
                            )
                        );
                    })()
                )
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
            p.configTab === "permissoes" && verificarPermissaoAba("permissoes") && React.createElement("div", null,
                // Carregar permissões automaticamente
                !p.permsLoaded && (function() {
                    (async function() {
                        try {
                            const res = await fetchAuth(API_URL + "/admin-permissions");
                            if (res.ok) {
                                const adminsPerms = await res.json();
                                const permsObj = {};
                                adminsPerms.forEach(function(adm) {
                                    const mods = Array.isArray(adm.allowed_modules) ? adm.allowed_modules : [];
                                    const tabs = adm.allowed_tabs && typeof adm.allowed_tabs === 'object' ? adm.allowed_tabs : {};
                                    const modulosObj = {};
                                    
                                    // CORREÇÃO: Se não há módulos configurados, marcar como "não configurado"
                                    // Se há módulos, usar APENAS os que estão na lista
                                    SISTEMA_MODULOS_CONFIG.forEach(function(mod) {
                                        if (mods.length === 0) {
                                            // Sem configuração = acesso total
                                            modulosObj[mod.id] = true;
                                        } else {
                                            // Com configuração = APENAS os listados têm acesso
                                            modulosObj[mod.id] = mods.includes(mod.id);
                                        }
                                    });
                                    
                                    permsObj[adm.cod_profissional] = {
                                        modulos: modulosObj,
                                        abas: tabs,
                                        hasConfig: mods.length > 0
                                    };
                                });
                                x(prev => ({...prev, adminPerms: permsObj, permsLoaded: true}));
                            }
                        } catch (err) {
                            console.error("Erro ao carregar permissões:", err);
                            x(prev => ({...prev, permsLoaded: true}));
                        }
                    })();
                    return null;
                })(),
                
                React.createElement("div", {className: "bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4"},
                    React.createElement("div", {className: "flex items-center justify-between flex-wrap gap-3"},
                        React.createElement("div", null,
                            React.createElement("h2", {className: "text-lg font-bold text-blue-800"}, "🔐 Sistema de Permissões"),
                            React.createElement("p", {className: "text-blue-600 text-sm"}, "Clique em um admin para expandir e configurar")
                        ),
                        React.createElement("div", {className: "flex gap-2"},
                            React.createElement("button", {
                                onClick: async function() {
                                    s(true);
                                    try {
                                        const res = await fetchAuth(API_URL + "/admin-permissions");
                                        if (res.ok) {
                                            const adminsPerms = await res.json();
                                            const permsObj = {};
                                            adminsPerms.forEach(function(adm) {
                                                const mods = Array.isArray(adm.allowed_modules) ? adm.allowed_modules : [];
                                                const tabs = adm.allowed_tabs && typeof adm.allowed_tabs === 'object' ? adm.allowed_tabs : {};
                                                const modulosObj = {};
                                                SISTEMA_MODULOS_CONFIG.forEach(function(mod) {
                                                    if (mods.length === 0) {
                                                        modulosObj[mod.id] = true;
                                                    } else {
                                                        modulosObj[mod.id] = mods.includes(mod.id);
                                                    }
                                                });
                                                permsObj[adm.cod_profissional] = {
                                                    modulos: modulosObj,
                                                    abas: tabs,
                                                    hasConfig: mods.length > 0
                                                };
                                            });
                                            x({...p, adminPerms: permsObj, permsLoaded: true});
                                            ja("✅ Atualizado!", "success");
                                        }
                                    } catch (err) {
                                        ja("❌ Erro", "error");
                                    }
                                    s(false);
                                },
                                className: "px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                            }, "🔄"),
                            React.createElement("button", {
                                onClick: async function() {
                                    s(true);
                                    const adminsList = A.filter(function(u) { return u.role === "admin" || u.role === "admin_financeiro"; });
                                    let savedCount = 0;
                                    
                                    for (let i = 0; i < adminsList.length; i++) {
                                        const admin = adminsList[i];
                                        const cod = admin.codProfissional;
                                        const perms = p.adminPerms && p.adminPerms[cod] ? p.adminPerms[cod] : null;
                                        
                                        if (!perms) continue;
                                        
                                        // CORREÇÃO: Apenas incluir módulos que estão EXPLICITAMENTE true
                                        const allowedModules = [];
                                        const mods = perms.modulos || {};
                                        SISTEMA_MODULOS_CONFIG.forEach(function(mod) {
                                            if (mods[mod.id] === true) {
                                                allowedModules.push(mod.id);
                                            }
                                        });
                                        
                                        const allowedTabs = perms.abas || {};
                                        
                                        try {
                                            const res = await fetchAuth(API_URL + "/admin-permissions/" + encodeURIComponent(cod), {
                                                method: "PATCH",
                                                headers: {"Content-Type": "application/json"},
                                                body: JSON.stringify({ allowed_modules: allowedModules, allowed_tabs: allowedTabs })
                                            });
                                            if (res.ok) savedCount++;
                                        } catch (err) {
                                            console.error("Erro:", err);
                                        }
                                    }
                                    ja(savedCount > 0 ? "✅ Salvo!" : "⚠️ Nada para salvar", savedCount > 0 ? "success" : "warning");
                                    s(false);
                                },
                                className: "px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
                            }, "💾 Salvar")
                        )
                    )
                ),
                
                // Lista de admins colapsável
                A.filter(function(u) { return u.role === "admin" || u.role === "admin_financeiro"; }).length === 0
                    ? React.createElement("div", {className: "bg-white rounded-xl p-8 text-center text-gray-500"},
                        React.createElement("span", {className: "text-4xl block mb-2"}, "👤"),
                        "Nenhum administrador cadastrado"
                    )
                    : React.createElement("div", {className: "space-y-2"},
                        A.filter(function(u) { return u.role === "admin" || u.role === "admin_financeiro"; }).map(function(admin) {
                            const cod = admin.codProfissional;
                            const perms = p.adminPerms && p.adminPerms[cod] ? p.adminPerms[cod] : { modulos: {}, abas: {} };
                            const mods = perms.modulos || {};
                            const abas = perms.abas || {};
                            const isExpanded = p.expandedAdmin === cod;
                            
                            const modulosConfig = SISTEMA_MODULOS_CONFIG;
                            const modulosAtivos = modulosConfig.filter(function(m) { return mods[m.id] === true; }).length;
                            const abasRestritas = Object.keys(abas).filter(function(k) { return abas[k] === false; }).length;
                            
                            return React.createElement("div", {
                                key: cod,
                                className: "bg-white rounded-xl shadow-sm border overflow-hidden"
                            },
                                React.createElement("div", {
                                    className: "flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                                    onClick: function() {
                                        x({...p, expandedAdmin: isExpanded ? null : cod});
                                    }
                                },
                                    React.createElement("div", {className: "flex items-center gap-3"},
                                        React.createElement("div", {
                                            className: "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold " +
                                                (admin.role === "admin" ? "bg-blue-600" : "bg-green-600")
                                        }, admin.fullName ? admin.fullName.charAt(0).toUpperCase() : "?"),
                                        React.createElement("div", null,
                                            React.createElement("p", {className: "font-semibold"}, admin.fullName),
                                            React.createElement("p", {className: "text-xs text-gray-500"}, admin.role === "admin" ? "👑 Admin" : "💰 Admin Fin.")
                                        )
                                    ),
                                    React.createElement("div", {className: "flex items-center gap-3"},
                                        React.createElement("div", {className: "text-right"},
                                            React.createElement("p", {className: "text-sm font-medium " + (modulosAtivos === SISTEMA_MODULOS_CONFIG.length ? "text-green-600" : "text-orange-600")},
                                                modulosAtivos + "/" + SISTEMA_MODULOS_CONFIG.length + " módulos"
                                            ),
                                            abasRestritas > 0 && React.createElement("p", {className: "text-xs text-red-500"}, abasRestritas + " abas restritas")
                                        ),
                                        React.createElement("span", {className: "text-gray-400 text-xl"}, isExpanded ? "▼" : "▶")
                                    )
                                ),
                                
                                // ==================== SEÇÃO EXPANDIDA COM MÓDULOS E ABAS ====================
                                isExpanded && React.createElement("div", {className: "border-t p-4 bg-gray-50"},
                                    React.createElement("div", {className: "space-y-3"},
                                        modulosConfig.map(function(modConfig) {
                                            const modAtivo = mods[modConfig.id] === true;
                                            const modKey = modConfig.id;
                                            const modAbas = modConfig.abas || [];
                                            const isModExpanded = p.expandedModulo === cod + "_" + modKey;
                                            
                                            // Contar abas restritas deste módulo
                                            const abasRestritasDoModulo = modAbas.filter(function(aba) {
                                                const abaKey = modKey + "_" + aba.id.replace(/-/g, "");
                                                return abas[abaKey] === false;
                                            }).length;
                                            
                                            return React.createElement("div", {
                                                key: modKey,
                                                className: "border rounded-lg overflow-hidden bg-white " + (modAtivo ? "border-green-200" : "border-red-200")
                                            },
                                                // Header do módulo
                                                React.createElement("div", {
                                                    className: "flex items-center justify-between p-2 " + (modAtivo ? "bg-green-50" : "bg-red-50")
                                                },
                                                    React.createElement("div", {
                                                        className: "flex items-center gap-2 flex-1 cursor-pointer",
                                                        onClick: function() {
                                                            // Toggle expandir/colapsar módulo para ver abas
                                                            const expandKey = cod + "_" + modKey;
                                                            x({...p, expandedModulo: isModExpanded ? null : expandKey});
                                                        }
                                                    },
                                                        React.createElement("span", {className: "text-gray-400"}, isModExpanded && modAbas.length > 0 ? "▼" : modAbas.length > 0 ? "▶" : ""),
                                                        React.createElement("span", null, modConfig.icon),
                                                        React.createElement("span", {className: "font-medium text-sm"}, modConfig.label),
                                                        modAbas.length > 0 && React.createElement("span", {className: "text-xs text-gray-400"}, 
                                                            "(", modAbas.length, " abas",
                                                            abasRestritasDoModulo > 0 ? ", " + abasRestritasDoModulo + " restritas" : "",
                                                            ")"
                                                        )
                                                    ),
                                                    // Toggle do módulo
                                                    React.createElement("button", {
                                                        onClick: function(e) {
                                                            e.stopPropagation();
                                                            const newPerms = JSON.parse(JSON.stringify(p.adminPerms || {}));
                                                            if (!newPerms[cod]) newPerms[cod] = { modulos: {}, abas: {} };
                                                            if (!newPerms[cod].modulos) newPerms[cod].modulos = {};
                                                            newPerms[cod].modulos[modKey] = !modAtivo;
                                                            x({...p, adminPerms: newPerms});
                                                        },
                                                        className: "px-3 py-1 rounded text-xs font-bold transition-colors " + 
                                                            (modAtivo ? "bg-green-200 text-green-800 hover:bg-green-300" : "bg-red-200 text-red-800 hover:bg-red-300")
                                                    }, modAtivo ? "✓ Permitido" : "✗ Bloqueado")
                                                ),
                                                
                                                // ==================== LISTA DE ABAS DO MÓDULO ====================
                                                isModExpanded && modAbas.length > 0 && React.createElement("div", {
                                                    className: "border-t bg-gray-50 p-3"
                                                },
                                                    React.createElement("p", {className: "text-xs text-gray-500 mb-2 font-semibold"}, "📑 Abas do módulo:"),
                                                    React.createElement("div", {className: "grid grid-cols-2 md:grid-cols-3 gap-2"},
                                                        modAbas.map(function(aba) {
                                                            const abaKey = modKey + "_" + aba.id.replace(/-/g, "");
                                                            const abaPermitida = abas[abaKey] !== false;
                                                            
                                                            return React.createElement("div", {
                                                                key: abaKey,
                                                                className: "flex items-center justify-between p-2 rounded border text-sm " +
                                                                    (abaPermitida ? "bg-white border-gray-200" : "bg-red-50 border-red-200")
                                                            },
                                                                React.createElement("span", {
                                                                    className: abaPermitida ? "text-gray-700" : "text-red-700"
                                                                }, aba.label),
                                                                React.createElement("button", {
                                                                    onClick: function() {
                                                                        const newPerms = JSON.parse(JSON.stringify(p.adminPerms || {}));
                                                                        if (!newPerms[cod]) newPerms[cod] = { modulos: {}, abas: {} };
                                                                        if (!newPerms[cod].abas) newPerms[cod].abas = {};
                                                                        // Toggle: se está permitida (undefined ou true), bloquear (false)
                                                                        // Se está bloqueada (false), permitir (removendo a chave ou setando true)
                                                                        if (abaPermitida) {
                                                                            newPerms[cod].abas[abaKey] = false;
                                                                        } else {
                                                                            delete newPerms[cod].abas[abaKey];
                                                                        }
                                                                        x({...p, adminPerms: newPerms});
                                                                    },
                                                                    className: "w-6 h-6 rounded flex items-center justify-center text-xs font-bold transition-colors " +
                                                                        (abaPermitida ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200")
                                                                }, abaPermitida ? "✓" : "✗")
                                                            );
                                                        })
                                                    )
                                                )
                                            );
                                        })
                                    )
                                )
                            );
                        })
                    )
            ),
            
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
            p.configTab === "clientes-api" && "admin_master" === l.role && React.createElement("div", null,
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
                                return React.createElement("div", {
                                    key: cliente.id,
                                    className: "bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                                },
                                    React.createElement("div", null,
                                        React.createElement("p", {className: "font-medium text-gray-800"}, cliente.nome),
                                        React.createElement("p", {className: "text-sm text-gray-500"}, cliente.email, " • ", cliente.empresa || "Sem empresa"),
                                        React.createElement("p", {className: "text-xs text-gray-400 font-mono"}, "Cód: ", cliente.tutts_cod_cliente || cliente.tutts_codigo_cliente)
                                    ),
                                    React.createElement("div", {className: "flex items-center gap-2"},
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
            ),
            
            // ==================== TAB AUDITORIA ====================
            p.configTab === "auditoria" && ("admin_master" === l.role || "admin" === l.role) && 
                React.createElement(AuditLogs, { apiUrl: API_URL, showToast: ja }),

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
