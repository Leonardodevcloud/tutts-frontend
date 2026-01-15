// ==================== MÓDULO CONFIG ====================
// Arquivo: modulo-config.js
// Carregado dinamicamente quando usuário acessa Configurações

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
                                placeholder: "Mínimo 4 caracteres"
                            })
                        ),
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold mb-1 text-gray-700"}, "Tipo de Usuário"),
                            React.createElement("select", {
                                value: p.newUserRole || "user",
                                onChange: function(e) { x({...p, newUserRole: e.target.value}); },
                                className: "w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            },
                                React.createElement("option", {value: "user"}, "👤 Usuário Comum (Entregador)"),
                                React.createElement("option", {value: "admin"}, "👑 Administrador"),
                                React.createElement("option", {value: "admin_financeiro"}, "💰 Admin Financeiro")
                            )
                        )
                    ),
                    React.createElement("button", {
                        onClick: async function() {
                            if (!p.newUserName || !p.newUserCod || !p.newUserPass) {
                                ja("Preencha todos os campos", "error");
                                return;
                            }
                            s(true);
                            try {
                                const res = await fetch(API_URL + "/users/register", {
                                    method: "POST",
                                    headers: {"Content-Type": "application/json"},
                                    body: JSON.stringify({
                                        fullName: p.newUserName,
                                        codProfissional: p.newUserCod,
                                        password: p.newUserPass,
                                        role: p.newUserRole || "user"
                                    })
                                });
                                if (res.ok) {
                                    ja("✅ Usuário criado com sucesso!", "success");
                                    x({...p, newUserName: "", newUserCod: "", newUserPass: "", newUserRole: "user"});
                                    Ia();
                                } else {
                                    const data = await res.json();
                                    ja("❌ " + (data.error || "Erro ao criar"), "error");
                                }
                            } catch (err) {
                                ja("❌ Erro ao criar usuário", "error");
                            }
                            s(false);
                        },
                        className: "w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                    }, "➕ Criar Usuário")
                ),
                
                // ===== SEÇÃO DE SETORES =====
                React.createElement("div", {className: "bg-white rounded-xl shadow-sm border p-6 mb-6"},
                    React.createElement("div", {className: "flex items-center justify-between mb-4"},
                        React.createElement("h2", {className: "text-lg font-bold flex items-center gap-2"},
                            React.createElement("span", null, "🏢"),
                            "Setores (",
                            setores.length,
                            ")"
                        ),
                        React.createElement("button", {
                            onClick: () => {
                                setSetorEdit(null);
                                setSetorForm({ nome: '', descricao: '', cor: '#6366f1' });
                                setShowSetorModal(true);
                            },
                            className: "px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm"
                        }, "➕ Novo Setor")
                    ),
                    setores.length === 0 
                        ? React.createElement("p", {className: "text-gray-500 text-center py-4"}, 
                            "Nenhum setor cadastrado. Crie setores para organizar os usuários."
                        )
                        : React.createElement("div", {className: "space-y-3"},
                            setores.map(setor => {
                                const usuariosDoSetor = A.filter(u => u.setor_id === setor.id);
                                const isExpandido = setorExpandido === setor.id;
                                
                                return React.createElement("div", {
                                    key: setor.id,
                                    className: "border rounded-lg overflow-hidden transition-all " + (isExpandido ? "ring-2 ring-indigo-500" : "")
                                },
                                    React.createElement("div", {
                                        className: "p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer",
                                        onClick: () => setSetorExpandido(isExpandido ? null : setor.id)
                                    },
                                        React.createElement("div", {className: "flex items-center gap-3"},
                                            React.createElement("div", {
                                                className: "w-4 h-10 rounded",
                                                style: { backgroundColor: setor.cor || '#6366f1' }
                                            }),
                                            React.createElement("div", null,
                                                React.createElement("p", {className: "font-semibold flex items-center gap-2"},
                                                    setor.nome,
                                                    !setor.ativo && React.createElement("span", {className: "text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded"}, "Inativo")
                                                ),
                                                React.createElement("p", {className: "text-sm text-gray-500"},
                                                    usuariosDoSetor.length, " usuário(s)",
                                                    setor.descricao ? " • " + setor.descricao : ""
                                                )
                                            )
                                        ),
                                        React.createElement("div", {className: "flex items-center gap-2"},
                                            React.createElement("button", {
                                                onClick: (e) => {
                                                    e.stopPropagation();
                                                    setSetorEdit(setor);
                                                    setSetorForm({ nome: setor.nome, descricao: setor.descricao || '', cor: setor.cor || '#6366f1' });
                                                    setShowSetorModal(true);
                                                },
                                                className: "px-3 py-1.5 bg-blue-100 text-blue-700 rounded font-semibold hover:bg-blue-200 text-sm"
                                            }, "✏️"),
                                            React.createElement("button", {
                                                onClick: (e) => { e.stopPropagation(); excluirSetor(setor); },
                                                className: "px-3 py-1.5 bg-red-100 text-red-700 rounded font-semibold hover:bg-red-200 text-sm"
                                            }, "🗑️"),
                                            React.createElement("span", {
                                                className: "text-gray-400 text-xl ml-2 transition-transform " + (isExpandido ? "rotate-180" : "")
                                            }, "▼")
                                        )
                                    ),
                                    
                                    isExpandido && React.createElement("div", {className: "border-t bg-gray-50 p-4"},
                                        React.createElement("p", {className: "text-sm font-semibold text-gray-600 mb-3"}, 
                                            "👥 Usuários neste setor:"
                                        ),
                                        usuariosDoSetor.length === 0
                                            ? React.createElement("p", {className: "text-sm text-gray-400 italic"}, 
                                                "Nenhum usuário vinculado a este setor"
                                            )
                                            : React.createElement("div", {className: "space-y-2"},
                                                usuariosDoSetor.map(user => 
                                                    React.createElement("div", {
                                                        key: user.codProfissional,
                                                        className: "flex items-center justify-between bg-white p-3 rounded-lg border"
                                                    },
                                                        React.createElement("div", {className: "flex items-center gap-3"},
                                                            React.createElement("div", {
                                                                className: "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm " +
                                                                    (user.role === "admin_master" ? "bg-purple-600" :
                                                                     user.role === "admin" ? "bg-blue-600" :
                                                                     user.role === "admin_financeiro" ? "bg-green-600" : "bg-gray-500")
                                                            }, user.fullName ? user.fullName.charAt(0).toUpperCase() : "?"),
                                                            React.createElement("div", null,
                                                                React.createElement("p", {className: "font-medium text-sm"}, user.fullName),
                                                                React.createElement("p", {className: "text-xs text-gray-500"}, 
                                                                    "COD: ", user.codProfissional
                                                                )
                                                            )
                                                        ),
                                                        React.createElement("button", {
                                                            onClick: async () => {
                                                                if (confirm('Remover "' + user.fullName + '" do setor "' + setor.nome + '"?')) {
                                                                    await atualizarSetorUsuario(user.codProfissional, null);
                                                                }
                                                            },
                                                            className: "px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm font-medium hover:bg-red-200"
                                                        }, "✕ Remover")
                                                    )
                                                )
                                            )
                                    )
                                );
                            })
                        )
                ),
                
                // Modal de Criar/Editar Setor
                showSetorModal && React.createElement("div", {
                    className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                    onClick: (e) => { if (e.target === e.currentTarget) setShowSetorModal(false); }
                },
                    React.createElement("div", {className: "bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"},
                        React.createElement("div", {className: "bg-indigo-600 text-white p-4"},
                            React.createElement("h3", {className: "text-lg font-bold"}, setorEdit ? "✏️ Editar Setor" : "🏢 Novo Setor")
                        ),
                        React.createElement("div", {className: "p-4 space-y-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Nome *"),
                                React.createElement("input", {
                                    type: "text",
                                    value: setorForm.nome,
                                    onChange: e => setSetorForm(prev => ({...prev, nome: e.target.value})),
                                    placeholder: "Ex: Operacional, Financeiro, Logística...",
                                    className: "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Descrição"),
                                React.createElement("input", {
                                    type: "text",
                                    value: setorForm.descricao,
                                    onChange: e => setSetorForm(prev => ({...prev, descricao: e.target.value})),
                                    placeholder: "Descrição opcional do setor",
                                    className: "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Cor"),
                                React.createElement("div", {className: "flex items-center gap-2"},
                                    React.createElement("input", {
                                        type: "color",
                                        value: setorForm.cor,
                                        onChange: e => setSetorForm(prev => ({...prev, cor: e.target.value})),
                                        className: "w-12 h-10 rounded cursor-pointer"
                                    }),
                                    React.createElement("span", {className: "text-sm text-gray-500"}, setorForm.cor)
                                )
                            )
                        ),
                        React.createElement("div", {className: "p-4 bg-gray-50 flex gap-3"},
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
                    React.createElement("h2", {className: "text-lg font-bold mb-4 flex items-center gap-2"},
                        React.createElement("span", null, "📋"),
                        "Usuários Cadastrados (",
                        A.length,
                        ")"
                    ),
                    React.createElement("div", {className: "space-y-3"},
                        A.map(function(user) {
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
                                            onClick: async function() {
                                                const newPass = prompt("Nova senha para " + user.fullName + ":");
                                                if (newPass && newPass.length >= 6) {
                                                    try {
                                                        await fetchAuth(API_URL + "/users/reset-password", {
                                                            method: "POST",
                                                            headers: {"Content-Type": "application/json"},
                                                            body: JSON.stringify({codProfissional: user.codProfissional, newPassword: newPass})
                                                        });
                                                        ja("✅ Senha alterada!", "success");
                                                    } catch (err) {
                                                        ja("❌ Erro ao alterar senha", "error");
                                                    }
                                                } else if (newPass) {
                                                    ja("Senha muito curta (mín. 6)", "error");
                                                }
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
                )
            ),
            
            // ==================== TAB PERMISSÕES ====================
            p.configTab === "permissoes" && verificarPermissaoAba("permissoes") && React.createElement("div", null,
                // Carregar permissões automaticamente
                !p.permsLoaded && (function() {
                    (async function() {
                        try {
                            const res = await fetch(API_URL + "/admin-permissions");
                            if (res.ok) {
                                const adminsPerms = await res.json();
                                const permsObj = {};
                                adminsPerms.forEach(function(adm) {
                                    const mods = Array.isArray(adm.allowed_modules) ? adm.allowed_modules : [];
                                    const tabs = adm.allowed_tabs && typeof adm.allowed_tabs === 'object' ? adm.allowed_tabs : {};
                                    const modulosObj = {};
                                    SISTEMA_MODULOS_CONFIG.forEach(function(mod) {
                                        modulosObj[mod.id] = mods.length === 0 || mods.includes(mod.id);
                                    });
                                    permsObj[adm.cod_profissional] = {
                                        modulos: modulosObj,
                                        abas: tabs
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
                                        const res = await fetch(API_URL + "/admin-permissions");
                                        if (res.ok) {
                                            const adminsPerms = await res.json();
                                            const permsObj = {};
                                            adminsPerms.forEach(function(adm) {
                                                const mods = Array.isArray(adm.allowed_modules) ? adm.allowed_modules : [];
                                                const tabs = adm.allowed_tabs && typeof adm.allowed_tabs === 'object' ? adm.allowed_tabs : {};
                                                const modulosObj = {};
                                                SISTEMA_MODULOS_CONFIG.forEach(function(mod) {
                                                    modulosObj[mod.id] = mods.length === 0 || mods.includes(mod.id);
                                                });
                                                permsObj[adm.cod_profissional] = {
                                                    modulos: modulosObj,
                                                    abas: tabs
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
                                        
                                        const allowedModules = [];
                                        const mods = perms.modulos || {};
                                        SISTEMA_MODULOS_CONFIG.forEach(function(mod) {
                                            if (mods[mod.id] !== false) allowedModules.push(mod.id);
                                        });
                                        
                                        const allowedTabs = perms.abas || {};
                                        
                                        try {
                                            const res = await fetch(API_URL + "/admin-permissions/" + encodeURIComponent(cod), {
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
                            const modulosAtivos = modulosConfig.filter(function(m) { return mods[m.id] !== false; }).length;
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
                                
                                isExpanded && React.createElement("div", {className: "border-t p-4 bg-gray-50"},
                                    React.createElement("div", {className: "space-y-3"},
                                        modulosConfig.map(function(modConfig) {
                                            const modAtivo = mods[modConfig.id] !== false;
                                            const modKey = modConfig.id;
                                            
                                            return React.createElement("div", {
                                                key: modKey,
                                                className: "border rounded-lg overflow-hidden bg-white " + (modAtivo ? "border-green-200" : "border-gray-200")
                                            },
                                                React.createElement("div", {
                                                    className: "flex items-center justify-between p-2 cursor-pointer " + (modAtivo ? "bg-green-50" : "bg-gray-100"),
                                                    onClick: function() {
                                                        const newPerms = JSON.parse(JSON.stringify(p.adminPerms || {}));
                                                        if (!newPerms[cod]) newPerms[cod] = { modulos: {}, abas: {} };
                                                        if (!newPerms[cod].modulos) newPerms[cod].modulos = {};
                                                        newPerms[cod].modulos[modKey] = !modAtivo;
                                                        x({...p, adminPerms: newPerms});
                                                    }
                                                },
                                                    React.createElement("div", {className: "flex items-center gap-2"},
                                                        React.createElement("span", null, modConfig.icon),
                                                        React.createElement("span", {className: "font-medium text-sm"}, modConfig.label)
                                                    ),
                                                    React.createElement("span", {
                                                        className: "px-2 py-0.5 rounded text-xs font-bold " + (modAtivo ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600")
                                                    }, modAtivo ? "✓" : "✗")
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
                                            className: "px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                                        }, "🔄")
                                    )
                                );
                            })
                        )
                    )
                )
            ),
            
            // ==================== TAB AUDITORIA ====================
            p.configTab === "auditoria" && ("admin_master" === l.role || "admin" === l.role) && 
                React.createElement(AuditLogs, { apiUrl: API_URL, showToast: ja })
        ));
    };

    // Marcar que o módulo foi carregado
    window.ModuloConfigLoaded = true;
    console.log("✅ Módulo Config carregado com sucesso!");

})();
