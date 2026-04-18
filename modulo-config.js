// ==================== MÓDULO CONFIG ====================
// Arquivo: modulo-config.js
// Carregado dinamicamente quando usuário acessa Configurações
// VERSÃO CORRIGIDA - Sistema de permissões de abas restaurado

(function() {
    'use strict';

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
                
                // Lista de usuários
                React.createElement("div", {className: "bg-white rounded-xl shadow-sm border p-6"},
                    React.createElement("div", {className: "flex items-center justify-between mb-4 flex-wrap gap-3"},
                        React.createElement("h2", {className: "text-lg font-bold flex items-center gap-2"},
                            React.createElement("span", null, "📋"),
                            "Usuários Cadastrados (",
                            A.length,
                            ")"
                        ),
                        // Campo de busca
                        React.createElement("div", {className: "relative flex-1 max-w-md"},
                            React.createElement("input", {
                                type: "text",
                                value: p.buscaUsuario || "",
                                onChange: function(e) { x({...p, buscaUsuario: e.target.value}); },
                                className: "w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
                                placeholder: "Buscar por nome ou código..."
                            }),
                            React.createElement("span", {className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"}, "🔍"),
                            p.buscaUsuario && React.createElement("button", {
                                onClick: function() { x({...p, buscaUsuario: ""}); },
                                className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            }, "✕")
                        )
                    ),
                    
                    // Filtrar usuários pela busca
                    (function() {
                        const busca = (p.buscaUsuario || "").toLowerCase().trim();
                        const usuariosFiltrados = busca 
                            ? A.filter(function(user) {
                                const nome = (user.fullName || "").toLowerCase();
                                const cod = String(user.codProfissional || "").toLowerCase();
                                return nome.includes(busca) || cod.includes(busca);
                            })
                            : A;
                        
                        if (usuariosFiltrados.length === 0) {
                            return React.createElement("div", {className: "text-center py-8 text-gray-500"},
                                React.createElement("span", {className: "text-4xl block mb-2"}, "🔍"),
                                busca 
                                    ? "Nenhum usuário encontrado para \"" + p.buscaUsuario + "\""
                                    : "Nenhum usuário cadastrado"
                            );
                        }
                        
                        return React.createElement("div", null,
                            busca && React.createElement("p", {className: "text-sm text-gray-500 mb-3"},
                                "Mostrando ", usuariosFiltrados.length, " de ", A.length, " usuários"
                            ),
                            React.createElement("div", {className: "space-y-3"},
                                usuariosFiltrados.map(function(user) {
                            return React.createElement("div", {
                                key: user.codProfissional,
                                className: "border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                            },
                                React.createElement("div", {className: "flex items-center justify-between"},
                                    React.createElement("div", {className: "flex items-center gap-3"},
                                        React.createElement("div", {
                                            className: "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold " +
                                                (user.role === "admin_master" ? "bg-purple-600" :
                                                 user.role === "admin" ? "bg-blue-600" :
                                                 user.role === "admin_financeiro" ? "bg-green-600" : "bg-gray-500")
                                        }, user.fullName ? user.fullName.charAt(0).toUpperCase() : "?"),
                                        React.createElement("div", null,
                                            React.createElement("p", {className: "font-semibold"}, user.fullName),
                                            React.createElement("p", {className: "text-sm text-gray-500"},
                                                "COD: ", user.codProfissional, " • ",
                                                user.role === "admin_master" ? "👑 Master" :
                                                user.role === "admin" ? "👑 Admin" :
                                                user.role === "admin_financeiro" ? "💰 Financeiro" : "👤 Usuário"
                                            )
                                        )
                                    ),
                                    React.createElement("div", {className: "flex gap-2"},
                                        React.createElement("button", {
                                            onClick: function() {
                                                x({...p, senhaModal: true, senhaModalUser: user, senhaModalValue: "", senhaModalConfirm: "", senhaModalShow: false, senhaModalErro: ""});
                                            },
                                            className: "px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                                        }, "🔑 Senha"),
                                        user.role !== "admin_master" && React.createElement("button", {
                                            onClick: async function() {
                                                let userCod = user.codProfissional || user.cod_profissional;
                                                if (userCod && typeof userCod === 'string') {
                                                    userCod = userCod.replace('#', '');
                                                }
                                                if (!userCod) {
                                                    ja("❌ Código do usuário não encontrado", "error");
                                                    return;
                                                }
                                                if (confirm("⚠️ Excluir " + (user.fullName || user.full_name) + "?\n\nEsta ação não pode ser desfeita!")) {
                                                    try {
                                                        const response = await fetchAuth(API_URL + "/users/" + userCod, {method: "DELETE"});
                                                        if (response.ok) {
                                                            ja("🗑️ Usuário excluído!", "success");
                                                            Ia();
                                                        } else {
                                                            const errData = await response.json().catch(() => ({}));
                                                            ja("❌ Erro: " + (errData.error || response.statusText), "error");
                                                        }
                                                    } catch (err) {
                                                        ja("❌ Erro ao excluir", "error");
                                                    }
                                                }
                                            },
                                            className: "px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                                        }, "🗑️")
                                    )
                                ),
                                // Linha do Setor
                                React.createElement("div", {className: "mt-3 pt-3 border-t flex items-center gap-2"},
                                    React.createElement("span", {className: "text-sm text-gray-600"}, "🏢 Setor:"),
                                    React.createElement("select", {
                                        value: user.setor_id || '',
                                        onChange: async (e) => {
                                            const novoSetorId = e.target.value ? parseInt(e.target.value) : null;
                                            await atualizarSetorUsuario(user.codProfissional || user.cod_profissional, novoSetorId);
                                        },
                                        className: "px-3 py-1.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500"
                                    },
                                        React.createElement("option", {value: ""}, "-- Sem setor --"),
                                        setores.filter(s => s.ativo).map(setor =>
                                            React.createElement("option", {
                                                key: setor.id,
                                                value: setor.id
                                            }, setor.nome)
                                        )
                                    ),
                                    user.setor_nome && React.createElement("span", {
                                        className: "ml-2 px-2 py-0.5 rounded text-xs font-medium text-white",
                                        style: { backgroundColor: user.setor_cor || '#6366f1' }
                                    }, user.setor_nome)
                                )
                            );
                        })
                            )
                        );
                    })()
                )
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
                    )
                )
            ),
            
            // ==================== TAB AUDITORIA ====================
            p.configTab === "auditoria" && ("admin_master" === l.role || "admin" === l.role) && 
                React.createElement(AuditLogs, { apiUrl: API_URL, showToast: ja }),

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
