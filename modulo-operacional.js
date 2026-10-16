/* REDESIGN_CLEAN_V1: telas no padrao clean aprovado (mockups 16/10). */
/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DEEMOJI_V1 */
// ==================== MÓDULO OPERACIONAL ====================
// Arquivo: modulo-operacional.js
// Renderização do módulo Operacional - Carregado dinamicamente

(function() {
    'use strict';

    window.ModuloOperacionalComponent = function(props) {
        // Desestruturar todas as props
        const {
            // Básicos
            l, p, x, ja, s, n, f, i, E,
            API_URL, getToken, fetchAuth,
            // Componentes
            HeaderCompacto, Toast, LoadingOverlay,
            // Navegação
            Ee, socialProfile, ul, o, he, navegarSidebar,
            // Avisos
            avisoModal, setAvisoModal, avisoEdit, setAvisoEdit,
            avisoForm, setAvisoForm, avisosData, avisosRegioes,
            carregarAvisos, salvarAviso, deletarAviso, handleAvisoImageUpload,
            // Operações
            operacaoModal, setOperacaoModal, operacaoEdit, setOperacaoEdit,
            operacaoForm, setOperacaoForm, operacoesData,
            operacaoSubTab, setOperacaoSubTab, carregarOperacoes, notificarOperacaoSalva,
            gerarRelatorioOperacao, calcularContadorRegressivo,
            checklistMotos, setChecklistMotos,
            operacaoExpandida, setOperacaoExpandida,
            // Recrutamento
            recrutamentoModal, setRecrutamentoModal,
            recrutamentoEdit, setRecrutamentoEdit,
            recrutamentoForm, setRecrutamentoForm,
            recrutamentoData, recrutamentoSubTab, setRecrutamentoSubTab,
            recrutamentoCodBusca, setRecrutamentoCodBusca, recrutamentoLoading,
            recrutamentoStats, setRecrutamentoStats,
            carregarRecrutamento, salvarRecrutamento,
            buscarProfissionalRecrutamento, atribuirProfissionalRecrutamento,
            removerAtribuicaoRecrutamento, deletarRecrutamento,
            // Localização
            localizacaoSubTab, setLocalizacaoSubTab,
            localizacaoFiltro, setLocalizacaoFiltro,
            localizacaoClientes, carregarLocalizacaoClientes,
            localizacaoLoading,
            // Relatórios
            showRelatorioModal, setShowRelatorioModal,
            relatorioForm, setRelatorioForm,
            relatorioEdit, setRelatorioEdit,
            relatorioImagemAmpliada, setRelatorioImagemAmpliada,
            relatoriosDiarios, relatoriosNaoLidos, relatoriosLoading,
            abrirNovoRelatorio, abrirEditarRelatorio,
            salvarRelatorio, excluirRelatorio, gerarLinkWaze,
            // Regiões
            aa,
            // Incentivos Operacionais
            incentivosData, setIncentivosData, incentivosStats,
            incentivoModal, setIncentivoModal, incentivoEdit, setIncentivoEdit,
            incentivoForm, setIncentivoForm, carregarIncentivos, salvarIncentivo, deletarIncentivo,
            incentivosCalendarioMes, setIncentivosCalendarioMes,
            incentivoClientesBi, incentivoClientesLoading, carregarClientesBiIncentivos
        } = props;

        // 🔧 Centro de Custo: cache via ref (evita stale closure) + fetch por cliente
        const [ccCache, setCcCache] = React.useState({});
        const ccCacheRef = React.useRef({});
        const fetchCentrosCusto = async (codCliente) => {
            if (ccCacheRef.current[codCliente]) return;
            console.log('🔍 Buscando centros de custo para cliente:', codCliente);
            try {
                const r = await fetchAuth(`${API_URL}/bi/centros-custo/${codCliente}`);
                const d = await r.json();
                console.log('📦 CCs recebidos para', codCliente, ':', d);
                var ccs = Array.isArray(d) ? d : [];
                ccCacheRef.current[codCliente] = ccs;
                setCcCache(prev => ({ ...prev, [codCliente]: ccs }));
            } catch(e) {
                console.warn('❌ Erro ao buscar CCs:', codCliente, e);
                ccCacheRef.current[codCliente] = [];
                setCcCache(prev => ({ ...prev, [codCliente]: [] }));
            }
        };

            return React.createElement("div", {
                className: "min-h-screen bg-gray-50"
            }, i && React.createElement(Toast, i), n && React.createElement(LoadingOverlay, null),
            // ========== HEADER COM NAVEGAÇÃO - OPERACIONAL ==========
            React.createElement(HeaderCompacto, {
                usuario: l,
                moduloAtivo: Ee,
                abaAtiva: p.opTab || "indicacoes",
                socialProfile: socialProfile,
                isLoading: f,
                lastUpdate: E,
                onRefresh: ul,
                onLogout: () => o(null),
                onGoHome: () => he("home"),
                onNavigate: navegarSidebar,
                onChangeTab: (abaId) => x({...p, opTab: abaId})
            }),
            // Conteúdo das abas
            React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                // Conteúdo Indicação
                (p.opTab || "indicacoes") === "indicacoes" && React.createElement("div", {className: "bg-purple-50 border border-purple-200 rounded-xl p-8 text-center"},
                    React.createElement("span", {className: "text-5xl mb-4 block"}, React.createElement("svg", { className: "ico", style: { width: 48, height: 48 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-users" }))),
                    React.createElement("h2", {className: "text-xl font-bold text-purple-800 mb-2"}, "Gestão de Indicações"),
                    React.createElement("p", {className: "text-purple-700 mb-4"}, "Para gerenciar indicações, acesse o módulo Financeiro na aba correspondente."),
                    React.createElement("button", {
                        onClick: () => { he("financeiro"); x({finTab: "indicacoes"}); },
                        className: "px-6 py-3 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800"
                    }, "Ir para Indicações →")
                ),
                // Conteúdo Promo Novatos
                p.opTab === "promo-novatos" && React.createElement("div", {className: "bg-purple-50 border border-purple-200 rounded-xl p-8 text-center"},
                    React.createElement("span", {className: "text-5xl mb-4 block"}, React.createElement("svg", { className: "ico", style: { width: 48, height: 48 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-rocket" }))),
                    React.createElement("h2", {className: "text-xl font-bold text-purple-800 mb-2"}, "Promoção Novatos"),
                    React.createElement("p", {className: "text-purple-700 mb-4"}, "Para gerenciar promoções de novatos, acesse o módulo Financeiro na aba correspondente."),
                    React.createElement("button", {
                        onClick: () => { he("financeiro"); x({finTab: "promo-novatos"}); },
                        className: "px-6 py-3 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800"
                    }, "Ir para Promo Novatos →")
                ),
                // Conteúdo Avisos
                p.opTab === "avisos" && React.createElement("div", {className: "space-y-6"},
                    // Header
                    React.createElement("div", {className: "flex justify-between items-center"},
                        React.createElement("div", null,
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bell" })), "Gestão de Avisos")),
                            React.createElement("p", {className: "text-gray-600"}, "Crie avisos que aparecerão para os usuários por região")
                        ),
                        React.createElement("button", {
                            onClick: () => { setAvisoEdit(null); setAvisoForm({ titulo: '', regioes: [], todas_regioes: false, data_inicio: '', data_fim: '', recorrencia_tipo: 'uma_vez', recorrencia_intervalo: 24, imagem_url: '' }); setAvisoModal(true); },
                            className: "px-6 py-3 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 flex items-center gap-2"
                        }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Novo Aviso"))
                    ),
                    // Lista de avisos
                    React.createElement("div", {className: "grid gap-4"},
                        (!avisosData || avisosData.length === 0) ? React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 p-8 text-center"},
                            React.createElement("span", {className: "text-5xl block mb-4"}, React.createElement("svg", { className: "ico", style: { width: 48, height: 48 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-mail" }))),
                            React.createElement("p", {className: "text-gray-500"}, "Nenhum aviso cadastrado"),
                            React.createElement("p", {className: "text-sm text-gray-400"}, "Clique em \"Novo Aviso\" para criar o primeiro")
                        ) : (Array.isArray(avisosData) ? avisosData : []).map(aviso => React.createElement("div", {
                            key: aviso.id,
                            className: "bg-white rounded-[14px] border border-gray-200 overflow-hidden " + (aviso.ativo ? "" : "opacity-60")
                        },
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "flex justify-between items-start"},
                                    React.createElement("div", {className: "flex-1"},
                                        React.createElement("div", {className: "flex items-center gap-3 mb-2"},
                                            React.createElement("h3", {className: "text-lg font-bold text-gray-800"}, aviso.titulo),
                                            React.createElement("span", {className: "px-2 py-0.5 rounded-full text-xs font-semibold " + (aviso.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}, aviso.ativo ? "Ativo" : "Inativo")
                                        ),
                                        React.createElement("div", {className: "flex flex-wrap gap-2 mb-3"},
                                            aviso.todas_regioes ? React.createElement("span", {className: "px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-map" })), "Todas as Regiões")) :
                                            aviso.regioes?.map((r, i) => React.createElement("span", {key: i, className: "px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"}, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pin" })), r))
                                        ),
                                        React.createElement("div", {className: "flex flex-wrap gap-4 text-sm text-gray-600"},
                                            React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-calendar" })), new Date(aviso.data_inicio?.slice(0,10) + "T12:00:00").toLocaleDateString("pt-BR"), " - ", new Date(aviso.data_fim?.slice(0,10) + "T12:00:00").toLocaleDateString("pt-BR")),
                                            React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), aviso.recorrencia_tipo === "uma_vez" ? "Uma vez" : aviso.recorrencia_tipo === "diario" ? "Diário" : `A cada ${aviso.recorrencia_intervalo}h`),
                                            React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-eye" })), aviso.total_visualizacoes || 0, " visualizações")
                                        )
                                    ),
                                    aviso.imagem_url && React.createElement("img", {
                                        src: aviso.imagem_url,
                                        className: "w-24 h-24 object-cover rounded-lg ml-4"
                                    })
                                ),
                                React.createElement("div", {className: "flex gap-2 mt-4 pt-4 border-t"},
                                    React.createElement("button", {
                                        onClick: () => { setAvisoEdit(aviso); setAvisoForm({ titulo: aviso.titulo, regioes: aviso.regioes || [], todas_regioes: aviso.todas_regioes, data_inicio: aviso.data_inicio?.slice(0,16), data_fim: aviso.data_fim?.slice(0,16), recorrencia_tipo: aviso.recorrencia_tipo, recorrencia_intervalo: aviso.recorrencia_intervalo, imagem_url: aviso.imagem_url }); setAvisoModal(true); },
                                        className: "px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200"
                                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })), "Editar")),
                                    React.createElement("button", {
                                        onClick: async () => { await fetchAuth(`${API_URL}/avisos-op/${aviso.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...aviso, ativo: !aviso.ativo})}); carregarAvisos(); },
                                        className: "px-4 py-2 rounded-lg font-semibold " + (aviso.ativo ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200")
                                    }, aviso.ativo ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-power" })), "Desativar") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-play" })), "Ativar")),
                                    React.createElement("button", {
                                        onClick: () => deletarAviso(aviso.id),
                                        className: "px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200"
                                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })), "Excluir"))
                                )
                            )
                        ))
                    )
                )
            ),
            // Modal de criar/editar aviso
            avisoModal && React.createElement("div", {className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"},
                React.createElement("div", {className: "bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto"},
                    React.createElement("div", {className: "bg-white border-b border-gray-200 text-gray-900 p-6" /* OPER_CLEAN_V1 */},
                        React.createElement("h2", {className: "text-xl font-bold"}, avisoEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })), "Editar Aviso") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Novo Aviso")),
                        React.createElement("p", {className: "text-gray-500 text-sm"}, "Configure o aviso que será exibido aos usuários")
                    ),
                    React.createElement("div", {className: "p-6 space-y-6"},
                        // Título
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Título do Aviso *"),
                            React.createElement("input", {
                                type: "text",
                                value: avisoForm.titulo,
                                onChange: e => setAvisoForm(f => ({...f, titulo: e.target.value})),
                                placeholder: "Ex: Manutenção programada",
                                className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                            })
                        ),
                        // Regiões
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Regiões *"),
                            React.createElement("label", {className: "flex items-center gap-2 mb-3 cursor-pointer"},
                                React.createElement("input", {
                                    type: "checkbox",
                                    checked: avisoForm.todas_regioes,
                                    onChange: e => setAvisoForm(f => ({...f, todas_regioes: e.target.checked, regioes: []})),
                                    className: "w-5 h-5 rounded text-purple-700"
                                }),
                                React.createElement("span", {className: "text-gray-700"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-map" })), "Todas as regiões"))
                            ),
                            !avisoForm.todas_regioes && React.createElement("div", {className: "max-h-64 overflow-y-auto border rounded-xl p-3 space-y-2 grid grid-cols-2 md:grid-cols-3 gap-2"},
                                avisosRegioes.map(regiao => React.createElement("label", {
                                    key: regiao,
                                    className: "flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                },
                                    React.createElement("input", {
                                        type: "checkbox",
                                        checked: avisoForm.regioes.includes(regiao),
                                        onChange: e => {
                                            if (e.target.checked) {
                                                setAvisoForm(f => ({...f, regioes: [...f.regioes, regiao]}));
                                            } else {
                                                setAvisoForm(f => ({...f, regioes: f.regioes.filter(r => r !== regiao)}));
                                            }
                                        },
                                        className: "w-4 h-4 rounded text-purple-700"
                                    }),
                                    React.createElement("span", {className: "text-gray-700"}, regiao)
                                ))
                            )
                        ),
                        // Período
                        React.createElement("div", {className: "grid grid-cols-2 gap-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Data/Hora Início *"),
                                React.createElement("input", {
                                    type: "datetime-local",
                                    value: avisoForm.data_inicio,
                                    onChange: e => setAvisoForm(f => ({...f, data_inicio: e.target.value})),
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Data/Hora Fim *"),
                                React.createElement("input", {
                                    type: "datetime-local",
                                    value: avisoForm.data_fim,
                                    onChange: e => setAvisoForm(f => ({...f, data_fim: e.target.value})),
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                })
                            )
                        ),
                        // Recorrência
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Recorrência"),
                            React.createElement("select", {
                                value: avisoForm.recorrencia_tipo,
                                onChange: e => setAvisoForm(f => ({...f, recorrencia_tipo: e.target.value})),
                                className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                            },
                                React.createElement("option", {value: "uma_vez"}, "Exibir apenas uma vez por usuário"),
                                React.createElement("option", {value: "diario"}, "Exibir uma vez por dia"),
                                React.createElement("option", {value: "intervalo_horas"}, "Exibir a cada X horas")
                            ),
                            avisoForm.recorrencia_tipo === "intervalo_horas" && React.createElement("div", {className: "mt-3"},
                                React.createElement("label", {className: "block text-sm text-gray-600 mb-1"}, "Intervalo em horas"),
                                React.createElement("input", {
                                    type: "number",
                                    min: "1",
                                    value: avisoForm.recorrencia_intervalo,
                                    onChange: e => setAvisoForm(f => ({...f, recorrencia_intervalo: parseInt(e.target.value) || 1})),
                                    className: "w-32 px-4 py-2 border rounded-xl"
                                })
                            )
                        ),
                        // Upload de imagem
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Imagem do Aviso"),
                            React.createElement("div", {className: "border-2 border-dashed rounded-xl p-6 text-center"},
                                avisoForm.imagem_url ? React.createElement("div", {className: "space-y-3"},
                                    React.createElement("img", {
                                        src: avisoForm.imagem_url,
                                        className: "max-h-48 mx-auto rounded-lg"
                                    }),
                                    React.createElement("button", {
                                        onClick: () => setAvisoForm(f => ({...f, imagem_url: ''})),
                                        className: "text-red-600 text-sm hover:underline"
                                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })), "Remover imagem"))
                                ) : React.createElement("div", null,
                                    React.createElement("span", {className: "text-4xl block mb-2"}, React.createElement("svg", { className: "ico", style: { width: 38, height: 38 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-camera" }))),
                                    React.createElement("p", {className: "text-gray-500 mb-3"}, "Arraste uma imagem ou clique para selecionar"),
                                    React.createElement("input", {
                                        type: "file",
                                        accept: "image/*",
                                        onChange: handleAvisoImageUpload,
                                        className: "hidden",
                                        id: "aviso-img-upload"
                                    }),
                                    React.createElement("label", {
                                        htmlFor: "aviso-img-upload",
                                        className: "px-4 py-2 bg-purple-100 text-purple-700 rounded-lg cursor-pointer hover:bg-purple-100"
                                    }, "Selecionar Imagem")
                                )
                            )
                        )
                    ),
                    // Botões
                    React.createElement("div", {className: "flex gap-3 p-6 border-t bg-gray-50"},
                        React.createElement("button", {
                            onClick: () => { setAvisoModal(false); setAvisoEdit(null); },
                            className: "flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
                        }, "Cancelar"),
                        React.createElement("button", {
                            onClick: salvarAviso,
                            disabled: !avisoForm.titulo || !avisoForm.data_inicio || !avisoForm.data_fim || (!avisoForm.todas_regioes && avisoForm.regioes.length === 0),
                            className: "flex-1 px-4 py-3 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        }, avisoEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar Alterações") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Criar Aviso"))
                    )
                )
            ),
            // ==================== CONTEÚDO NOVAS OPERAÇÕES ====================
            p.opTab === "novas-operacoes" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-6"},
                    // Header
                    React.createElement("div", {className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4"},
                        React.createElement("div", null,
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-building" })), "Novas Operações")),
                            React.createElement("p", {className: "text-gray-600"}, "Cadastre e gerencie operações de entrega")
                        ),
                        React.createElement("button", {
                        onClick: () => { 
                            setOperacaoEdit(null); 
                            setOperacaoForm({
                                regiao: '',
                                nome_cliente: '',
                                endereco: '',
                                modelo: 'nuvem',
                                tipo_veiculo: '',
                                modalidade: '',
                                quantidade_motos: 1,
                                obrigatoriedade_bau: false,
                                possui_garantido: false,
                                valor_garantido: '',
                                salario: '',
                                horario_inicio: '08:00',
                                horario_fim: '18:00',
                                escala_obs: '',
                                beneficios: {},
                                _step: 1,
                                data_inicio: '',
                                observacoes: '',
                                faixas_km: [
                                    { km_inicio: 1, km_fim: 10, valor_motoboy: '' },
                                    { km_inicio: 11, km_fim: 15, valor_motoboy: '' },
                                    { km_inicio: 16, km_fim: 20, valor_motoboy: '' },
                                    { km_inicio: 21, km_fim: 25, valor_motoboy: '' },
                                    { km_inicio: 26, km_fim: 30, valor_motoboy: '' },
                                    { km_inicio: 31, km_fim: 35, valor_motoboy: '' },
                                    { km_inicio: 36, km_fim: 40, valor_motoboy: '' },
                                    { km_inicio: 41, km_fim: 45, valor_motoboy: '' },
                                    { km_inicio: 46, km_fim: 50, valor_motoboy: '' },
                                    { km_inicio: 51, km_fim: 60, valor_motoboy: '' }
                                ]
                            }); 
                            setOperacaoModal(true); 
                        },
                        className: "px-6 py-3 bg-purple-700 text-white rounded-[10px] font-semibold hover:bg-purple-800 flex items-center gap-2"
                    }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Nova Operação"))
                ),
                
                // KPIs (faixa compacta)
                React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 flex divide-x divide-gray-100 overflow-hidden"},
                    React.createElement("div", {className: "flex-1 p-4"},
                        React.createElement("p", {className: "text-[11px] font-semibold uppercase tracking-wide text-gray-400"}, "Total"),
                        React.createElement("p", {className: "text-2xl font-bold text-gray-800"}, operacoesData?.length || 0)
                    ),
                    React.createElement("div", {className: "flex-1 p-4"},
                        React.createElement("p", {className: "text-[11px] font-semibold uppercase tracking-wide text-gray-400"}, "Em execução"),
                        React.createElement("p", {className: "text-2xl font-bold text-amber-600"}, operacoesData?.filter(o => o.status !== 'concluido').length || 0)
                    ),
                    React.createElement("div", {className: "flex-1 p-4"},
                        React.createElement("p", {className: "text-[11px] font-semibold uppercase tracking-wide text-gray-400"}, "Concluídas"),
                        React.createElement("p", {className: "text-2xl font-bold text-green-600"}, operacoesData?.filter(o => o.status === 'concluido').length || 0)
                    ),
                    React.createElement("div", {className: "flex-1 p-4"},
                        React.createElement("p", {className: "text-[11px] font-semibold uppercase tracking-wide text-gray-400"}, "Veículos totais"),
                        React.createElement("p", {className: "text-2xl font-bold text-violet-600"}, operacoesData?.reduce((acc, o) => acc + (o.quantidade_motos || 0), 0) || 0)
                    )
                ),

                // Tabs + lista
                React.createElement("div", null,
                    React.createElement("div", {className: "flex gap-6 border-b border-gray-200 mb-4"},
                        React.createElement("button", {
                            onClick: () => setOperacaoSubTab('execucao'),
                            className: "relative pb-3 pt-1 text-sm font-semibold transition-colors " +
                                (operacaoSubTab === 'execucao' ? 'text-violet-700' : 'text-gray-400 hover:text-gray-600')
                        },
                            React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-rocket" })), "Em execução"),
                            React.createElement("span", {className: "ml-2 px-2 py-0.5 rounded-full text-xs " + (operacaoSubTab === 'execucao' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500')}, operacoesData?.filter(o => o.status !== 'concluido').length || 0),
                            operacaoSubTab === 'execucao' && React.createElement("span", {className: "absolute left-0 right-0 -bottom-px h-0.5 bg-violet-600 rounded"})
                        ),
                        React.createElement("button", {
                            onClick: () => setOperacaoSubTab('concluidas'),
                            className: "relative pb-3 pt-1 text-sm font-semibold transition-colors " +
                                (operacaoSubTab === 'concluidas' ? 'text-violet-700' : 'text-gray-400 hover:text-gray-600')
                        },
                            React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Concluídas"),
                            React.createElement("span", {className: "ml-2 px-2 py-0.5 rounded-full text-xs " + (operacaoSubTab === 'concluidas' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500')}, operacoesData?.filter(o => o.status === 'concluido').length || 0),
                            operacaoSubTab === 'concluidas' && React.createElement("span", {className: "absolute left-0 right-0 -bottom-px h-0.5 bg-violet-600 rounded"})
                        )
                    ),

                    (function() {
                        const operacoesFiltradas = operacaoSubTab === 'execucao'
                            ? operacoesData?.filter(o => o.status !== 'concluido') || []
                            : operacoesData?.filter(o => o.status === 'concluido') || [];

                        if (operacoesFiltradas.length === 0) {
                            return React.createElement("div", {className: "bg-white rounded-2xl border border-gray-100 p-12 text-center"},
                                React.createElement("span", {className: "text-5xl block mb-3"}, operacaoSubTab === 'execucao' ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-mail" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-party" }))),
                                React.createElement("p", {className: "text-gray-500"}, operacaoSubTab === 'execucao' ? "Nenhuma operação em execução" : "Nenhuma operação concluída ainda"),
                                React.createElement("p", {className: "text-gray-400 text-sm mt-1"}, operacaoSubTab === 'execucao' ? "Clique em \"Nova Operação\" para começar" : "As operações concluídas aparecerão aqui")
                            );
                        }

                        return React.createElement("div", {className: "space-y-2.5"},
                            operacoesFiltradas.map(op => {
                                const contador = calcularContadorRegressivo(op.data_inicio);
                                const checklist = checklistMotos[op.id] || {};
                                const motosEncontradas = Object.values(checklist).filter(v => v).length;
                                const todasMotosEncontradas = motosEncontradas === op.quantidade_motos;
                                const aberto = operacaoExpandida === op.id;
                                const modChip = op.modalidade === 'hub' ? ['bg-purple-50 text-purple-700', React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-map" })), "Hub")]
                                    : op.modalidade === 'hibrida' ? ['bg-fuchsia-50 text-fuchsia-700', React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-shuffle" })), "Híbrida")]
                                    : op.modalidade === 'clt' ? ['bg-amber-50 text-amber-700', React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-idcard" })), "CLT")]
                                    : op.modalidade === 'dedicado' ? ['bg-violet-50 text-violet-700', React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-target" })), "Dedicado")]
                                    : op.modelo === 'nuvem' ? ['bg-blue-50 text-blue-700', React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-cloud" })), "Nuvem")]
                                    : op.modelo === 'dedicado' ? ['bg-violet-50 text-violet-700', React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-target" })), "Dedicado")]
                                    : ['bg-gray-100 text-gray-600', React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-zap" })), "Flash")];
                                const dotCls = op.status === 'ativo' ? 'bg-green-500 ring-green-100'
                                    : op.status === 'concluido' ? 'bg-blue-500 ring-blue-100'
                                    : op.status === 'pausado' ? 'bg-amber-500 ring-amber-100'
                                    : 'bg-gray-400 ring-gray-100';
                                const cdCls = contador.status === 'iniciado' ? 'bg-blue-50 text-blue-700'
                                    : (contador.status === 'hoje' || contador.status === 'amanha') ? 'bg-amber-50 text-amber-700'
                                    : 'bg-gray-100 text-gray-600';
                                const veicEmoji = op.tipo_veiculo === 'carro' ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-car" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bike" }));
                                const veicLabel = op.tipo_veiculo === 'carro' ? 'veículo' : 'moto';
                                const dataFmt = op.data_inicio ? new Date(op.data_inicio.split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

                                return React.createElement("div", {
                                    key: op.id,
                                    className: "bg-white rounded-2xl border transition-all " + (aberto ? 'border-violet-200 shadow-md' : 'border-gray-100 shadow-sm hover:border-gray-200')
                                },
                                    React.createElement("div", {
                                        onClick: () => setOperacaoExpandida(prev => prev === op.id ? null : op.id),
                                        className: "flex items-center gap-3.5 p-4 cursor-pointer"
                                    },
                                        React.createElement("span", {className: "w-2.5 h-2.5 rounded-full ring-4 flex-none " + dotCls}),
                                        React.createElement("div", {className: "flex-1 min-w-0"},
                                            React.createElement("div", {className: "flex items-center gap-2 flex-wrap"},
                                                React.createElement("span", {className: "font-bold text-gray-800"}, op.nome_cliente),
                                                React.createElement("span", {className: "text-[11px] font-bold px-2 py-0.5 rounded-full " + modChip[0]}, modChip[1])
                                            ),
                                            React.createElement("div", {className: "flex items-center gap-x-4 gap-y-1 flex-wrap mt-1 text-xs text-gray-500"},
                                                React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pin" })), op.regiao),
                                                React.createElement("span", null, veicEmoji, " ", op.quantidade_motos, " ", veicLabel, op.quantidade_motos > 1 ? "s" : ""),
                                                React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-calendar" })), dataFmt),
                                                React.createElement("span", {className: "px-2 py-0.5 rounded-md text-[11px] font-bold " + cdCls}, contador.texto)
                                            )
                                        ),
                                        React.createElement("div", {onClick: e => e.stopPropagation(), className: "flex items-center gap-1.5 flex-none"},
                                            React.createElement("button", {onClick: () => gerarRelatorioOperacao(op), title: "Relatório Word", className: "w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm"}, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" }))),
                                            React.createElement("button", {
                                                onClick: () => {
                                                    setOperacaoEdit(op);
                                                    setOperacaoForm({
                                                        regiao: op.regiao || '',
                                                        nome_cliente: op.nome_cliente || '',
                                                        endereco: op.endereco || '',
                                                        modelo: op.modelo || 'nuvem',
                                                        tipo_veiculo: op.tipo_veiculo || 'moto',
                                                        modalidade: op.modalidade || 'dedicado',
                                                        quantidade_motos: op.quantidade_motos || 1,
                                                        obrigatoriedade_bau: op.obrigatoriedade_bau || false,
                                                        possui_garantido: op.possui_garantido || false,
                                                        valor_garantido: op.valor_garantido || '',
                                                        salario: op.salario || '',
                                                        horario_inicio: op.horario_inicio || '08:00',
                                                        horario_fim: op.horario_fim || '18:00',
                                                        escala_obs: op.escala_obs || '',
                                                        beneficios: op.beneficios || {},
                                                        _step: 2,
                                                        data_inicio: op.data_inicio?.split('T')[0] || '',
                                                        observacoes: op.observacoes || '',
                                                        faixas_km: op.faixas_km && op.faixas_km.length > 0 ? op.faixas_km : [
                                                            { km_inicio: 1, km_fim: 10, valor_motoboy: '' },
                                                            { km_inicio: 11, km_fim: 15, valor_motoboy: '' },
                                                            { km_inicio: 16, km_fim: 20, valor_motoboy: '' },
                                                            { km_inicio: 21, km_fim: 25, valor_motoboy: '' },
                                                            { km_inicio: 26, km_fim: 30, valor_motoboy: '' },
                                                            { km_inicio: 31, km_fim: 35, valor_motoboy: '' },
                                                            { km_inicio: 36, km_fim: 40, valor_motoboy: '' },
                                                            { km_inicio: 41, km_fim: 45, valor_motoboy: '' },
                                                            { km_inicio: 46, km_fim: 50, valor_motoboy: '' },
                                                            { km_inicio: 51, km_fim: 60, valor_motoboy: '' }
                                                        ]
                                                    });
                                                    setOperacaoModal(true);
                                                },
                                                title: "Editar",
                                                className: "w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm"
                                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" }))),
                                            op.status !== 'concluido' && React.createElement("button", {
                                                onClick: async () => {
                                                    const novoStatus = op.status === 'ativo' ? 'pausado' : 'ativo';
                                                    await fetchAuth(`${API_URL}/operacoes/${op.id}`, {
                                                        method: 'PUT',
                                                        headers: {'Content-Type': 'application/json'},
                                                        body: JSON.stringify({ status: novoStatus })
                                                    });
                                                    carregarOperacoes();
                                                    if (notificarOperacaoSalva) notificarOperacaoSalva();
                                                    ja(novoStatus === 'ativo' ? 'Operação ativada!' : 'Operação pausada!', 'success');
                                                },
                                                title: op.status === 'ativo' ? 'Pausar' : 'Ativar',
                                                className: "w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm"
                                            }, op.status === 'ativo' ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-power" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-play" }))),
                                            React.createElement("button", {
                                                onClick: async () => {
                                                    if (confirm(`Excluir operação "${op.nome_cliente}"?`)) {
                                                        await fetchAuth(`${API_URL}/operacoes/${op.id}`, { method: 'DELETE' });
                                                        carregarOperacoes();
                                                        if (notificarOperacaoSalva) notificarOperacaoSalva();
                                                        ja('Operação excluída!', 'success');
                                                    }
                                                },
                                                title: "Excluir",
                                                className: "w-9 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-sm"
                                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))
                                        ),
                                        React.createElement("span", {className: "text-gray-300 text-xs transition-transform flex-none " + (aberto ? 'rotate-180' : '')}, "")
                                    ),
                                    aberto && React.createElement("div", {className: "px-4 pb-4 border-t border-gray-100 pt-3 space-y-3"},
                                        React.createElement("div", null,
                                            React.createElement("p", {className: "text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-0.5"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pin" })), "Endereço")),
                                            React.createElement("p", {className: "text-sm text-gray-700"}, op.endereco || '-')
                                        ),
                                        op.observacoes && React.createElement("div", null,
                                            React.createElement("p", {className: "text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-0.5"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Observações")),
                                            React.createElement("p", {className: "text-sm text-gray-700"}, op.observacoes)
                                        ),
                                        (op.obrigatoriedade_bau || op.possui_garantido) && React.createElement("div", {className: "flex flex-wrap gap-2 text-xs"},
                                            op.obrigatoriedade_bau && React.createElement("span", {className: "px-2 py-1 bg-orange-50 text-orange-700 rounded-md font-semibold"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-package" })), "Baú obrigatório")),
                                            op.possui_garantido && React.createElement("span", {className: "px-2 py-1 bg-green-50 text-green-700 rounded-md font-semibold"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Garantido: R$ "), parseFloat(op.valor_garantido || 0).toFixed(2))
                                        ),
                                        op.faixas_km && op.faixas_km.filter(f => f.valor_motoboy > 0).length > 0 && React.createElement("div", null,
                                            React.createElement("p", {className: "text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Valores por faixa de KM")),
                                            React.createElement("div", {className: "flex flex-wrap gap-1.5"},
                                                op.faixas_km.filter(f => f.valor_motoboy > 0).map((faixa, idx) =>
                                                    React.createElement("span", {key: idx, className: "px-2.5 py-1 bg-gray-50 text-gray-600 rounded-md text-xs"}, faixa.km_inicio, "-", faixa.km_fim, "km: R$ ", parseFloat(faixa.valor_motoboy).toFixed(2))
                                                )
                                            )
                                        ),
                                        op.status !== 'concluido' && React.createElement("div", null,
                                            React.createElement("p", {className: "text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1"}, veicEmoji, " Checklist de veículos  ", motosEncontradas, "/", op.quantidade_motos),
                                            React.createElement("div", {className: "flex flex-wrap gap-2"},
                                                Array.from({length: op.quantidade_motos}, (_, i) =>
                                                    React.createElement("label", {key: i, className: "flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-xs font-semibold border " + (checklist[i] ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')},
                                                        React.createElement("input", {
                                                            type: "checkbox",
                                                            checked: checklist[i] || false,
                                                            onChange: (e) => setChecklistMotos(prev => ({...prev, [op.id]: {...prev[op.id], [i]: e.target.checked}})),
                                                            className: "w-3.5 h-3.5 rounded text-green-600"
                                                        }),
                                                        (op.tipo_veiculo === 'carro' ? 'Veículo ' : 'Moto '), i + 1
                                                    )
                                                )
                                            )
                                        ),
                                        React.createElement("div", {className: "flex items-center justify-between gap-3 flex-wrap pt-1"},
                                            React.createElement("span", {className: "text-xs text-gray-400"}, "Criado por ", op.criado_por || '-'),
                                            op.status !== 'concluido' && React.createElement("button", {
                                                onClick: async () => {
                                                    if (!todasMotosEncontradas) {
                                                        if (!confirm(`Apenas ${motosEncontradas} de ${op.quantidade_motos} veículos foram confirmados.\n\nDeseja concluir mesmo assim?`)) {
                                                            return;
                                                        }
                                                    }
                                                    if (confirm(`Confirmar conclusão da demanda "${op.nome_cliente}"?`)) {
                                                        await fetchAuth(`${API_URL}/operacoes/${op.id}`, {
                                                            method: 'PUT',
                                                            headers: {'Content-Type': 'application/json'},
                                                            body: JSON.stringify({ status: 'concluido' })
                                                        });
                                                        carregarOperacoes();
                                                        if (notificarOperacaoSalva) notificarOperacaoSalva();
                                                        ja('Demanda concluída com sucesso!', 'success');
                                                    }
                                                },
                                                className: "px-4 py-2 rounded-lg text-sm font-bold border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                                            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Marcar como concluída"))
                                        )
                                    )
                                );
                            })
                        );
                    })()
                )
                )
            ),
            // ==================== MODAL NOVA OPERAÇÃO ====================
            operacaoModal && (function() {
                var step = operacaoForm._step || 1;
                var isClt = operacaoForm.modalidade === 'clt';
                var isCarro = operacaoForm.tipo_veiculo === 'carro';
                var isHub = operacaoForm.modalidade === 'hub';
                var SUG = { dedicado: 5, hub: 10, hibrida: 8, clt: 1 };
                var VEH = { moto: 'Moto', carro: 'Carro utilitário' };
                var MOD = { dedicado: 'Dedicado', hub: 'Hub', hibrida: 'Híbrida', clt: 'CLT' };
                var bens = operacaoForm.beneficios || {};
                var podeAvancar = operacaoForm.tipo_veiculo && operacaoForm.modalidade && (isHub || operacaoForm.quantidade_motos);
                var BENS = [
                    { k: 'va', i: React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), t: 'Vale alimentação' },
                    { k: 'vr', i: React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-utensils" })), t: 'Vale refeição' },
                    { k: 'comb', i: React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-fuel" })), t: 'Auxílio combustível' },
                    { k: 'vt', i: React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bus" })), t: 'Vale transporte' },
                    { k: 'net', i: React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), t: 'Bônus internet' }
                ];
                var toggleBen = function(k) {
                    setOperacaoForm(function(fm) {
                        var b = Object.assign({}, fm.beneficios || {});
                        var cur = b[k] || {};
                        b[k] = Object.assign({}, cur, { on: !cur.on });
                        return Object.assign({}, fm, { beneficios: b });
                    });
                };
                var setBenField = function(k, field, val) {
                    setOperacaoForm(function(fm) {
                        var b = Object.assign({}, fm.beneficios || {});
                        var cur = Object.assign({}, b[k] || {});
                        cur[field] = val;
                        b[k] = cur;
                        return Object.assign({}, fm, { beneficios: b });
                    });
                };
                var selVeic = function(v) {
                    setOperacaoForm(function(fm) {
                        var patch = { tipo_veiculo: v };
                        if (v === 'carro') patch.obrigatoriedade_bau = false;
                        return Object.assign({}, fm, patch);
                    });
                };
                var selMod = function(m) {
                    setOperacaoForm(function(fm) {
                        return Object.assign({}, fm, { modalidade: m, quantidade_motos: SUG[m] || 1 });
                    });
                };
                var choiceCard = function(opts) {
                    return React.createElement("button", {
                        type: "button",
                        onClick: opts.onClick,
                        className: "relative text-left rounded-2xl border-2 p-4 transition-all " +
                            (opts.sel ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200" : "border-gray-200 bg-white hover:border-violet-300") +
                            (opts.col ? " flex flex-col gap-2" : " flex items-center gap-3")
                    },
                        opts.sel && React.createElement("span", { className: "absolute top-2 right-2 w-6 h-6 rounded-lg bg-violet-600 text-white grid place-items-center text-sm" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" }))),
                        React.createElement("span", { className: "w-12 h-12 rounded-xl grid place-items-center text-2xl flex-none " + (opts.sel ? "bg-white" : "bg-violet-50") + (opts.emoji ? "" : " hidden") }, opts.emoji),
                        React.createElement("span", { className: "block" },
                            React.createElement("span", { className: "block font-bold text-gray-800 text-sm" }, opts.titulo),
                            React.createElement("span", { className: "block text-xs text-gray-500 mt-0.5" }, opts.desc),
                            opts.badge && React.createElement("span", { className: "inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full " + opts.badgeClass }, opts.badge)
                        )
                    );
                };

                return React.createElement("div", { className: "fixed inset-0 bg-black/50 flex items-start md:items-center justify-center z-50 p-3 md:p-6 overflow-y-auto" },
                    React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] overflow-y-auto my-auto" },
                        React.createElement("div", { className: "bg-white border-b border-gray-200 text-gray-900 p-6 sticky top-0 z-10" },
                            React.createElement("div", { className: "flex justify-between items-center" },
                                React.createElement("div", { className: "flex items-center gap-3" },
                                    React.createElement("div", { className: "hidden" }, operacaoEdit ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" }))),
                                    React.createElement("div", null,
                                        React.createElement("h2", { className: "text-xl font-bold" }, operacaoEdit ? "Editar Operação" : "Nova Operação"),
                                        React.createElement("p", { className: "text-gray-500 text-sm" }, step === 1 ? "Escolha o tipo de veículo e a modalidade" : (isClt ? "Contratação CLT — remuneração e benefícios" : "Preencha os dados da operação"))
                                    )
                                ),
                                React.createElement("button", { onClick: () => setOperacaoModal(false), className: "text-gray-400 hover:text-gray-700 text-2xl" }, React.createElement("svg", { className: "ico", style: { width: 26, height: 26 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                            ),
                            React.createElement("div", { className: "flex gap-2 mt-4" },
                                React.createElement("div", { className: "flex-1 flex items-center gap-2 px-3 py-2 rounded-xl " + (step === 1 ? "bg-purple-50 text-purple-800 border border-purple-200" : "bg-gray-50 text-gray-500 border border-gray-200") },
                                    React.createElement("span", { className: "w-6 h-6 rounded-lg grid place-items-center text-xs font-bold " + (step === 1 ? "bg-violet-600 text-white" : "bg-emerald-500 text-white") }, step === 1 ? "1" : React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" }))),
                                    React.createElement("span", { className: "text-sm font-semibold" }, "Veículo & Modalidade")
                                ),
                                React.createElement("div", { className: "flex-1 flex items-center gap-2 px-3 py-2 rounded-xl " + (step === 2 ? "bg-purple-50 text-purple-800 border border-purple-200" : "bg-gray-50 text-gray-500 border border-gray-200") },
                                    React.createElement("span", { className: "w-6 h-6 rounded-lg grid place-items-center text-xs font-bold " + (step === 2 ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-600") }, "2"),
                                    React.createElement("span", { className: "text-sm font-semibold" }, "Detalhes da operação")
                                )
                            )
                        ),
                        React.createElement("div", { className: "p-6 space-y-6" },
                          step === 1 && React.createElement("div", { className: "space-y-6" },
                            React.createElement("div", null,
                                React.createElement("h3", { className: "font-bold text-gray-800 mb-3 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#d97706" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-alert" })), "Tipo de veículo "), React.createElement("span", { className: "text-violet-600" }, "*")),
                                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                                    choiceCard({ sel: operacaoForm.tipo_veiculo === 'moto', onClick: () => selVeic('moto'), emoji: "", titulo: "Moto", desc: "Entregas urbanas, leve e ágil" }),
                                    choiceCard({ sel: operacaoForm.tipo_veiculo === 'carro', onClick: () => selVeic('carro'), emoji: "", titulo: "Carro utilitário", desc: "Cargas maiores e volumosas" })
                                )
                            ),
                            React.createElement("div", null,
                                React.createElement("h3", { className: "font-bold text-gray-800 mb-3 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-puzzle" })), "Modalidade "), React.createElement("span", { className: "text-violet-600" }, "*")),
                                React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
                                    choiceCard({ col: true, sel: operacaoForm.modalidade === 'dedicado', onClick: () => selMod('dedicado'), emoji: "", titulo: "Dedicado", desc: "Frota fixa para um cliente", badge: "exclusivo", badgeClass: "bg-indigo-100 text-indigo-700" }),
                                    choiceCard({ col: true, sel: operacaoForm.modalidade === 'hub', onClick: () => selMod('hub'), emoji: "", titulo: "Hub", desc: "Pool compartilhado por região", badge: "compartilhado", badgeClass: "bg-purple-100 text-purple-700" }),
                                    choiceCard({ col: true, sel: operacaoForm.modalidade === 'hibrida', onClick: () => selMod('hibrida'), emoji: "", titulo: "Híbrida", desc: "Dedicado + Hub no mesmo contrato", badge: "dedicado + hub", badgeClass: "bg-fuchsia-100 text-fuchsia-700" }),
                                    choiceCard({ col: true, sel: operacaoForm.modalidade === 'clt', onClick: () => selMod('clt'), emoji: "", titulo: "CLT", desc: "Carteira assinada, salário fixo", badge: "contratação", badgeClass: "bg-amber-100 text-amber-700" })
                                )
                            ),
                            (operacaoForm.modalidade && !isHub) && React.createElement("div", null,
                                React.createElement("h3", { className: "font-bold text-gray-800 mb-3 flex items-center gap-2" }, "Quantidade " + (isClt ? "de vagas CLT" : "de veículos") + " ", React.createElement("span", { className: "text-violet-600" }, "*")),
                                React.createElement("div", { className: "bg-violet-50 border-2 border-dashed border-violet-200 rounded-2xl p-4 flex items-center gap-4 flex-wrap" },
                                    React.createElement("div", null,
                                        React.createElement("p", { className: "font-bold text-gray-800 text-sm" }, isClt ? "Quantas vagas CLT nessa operação?" : "Quantos veículos nessa operação?"),
                                        React.createElement("span", { className: "inline-block mt-1 text-xs text-violet-700 bg-white border border-violet-100 px-2.5 py-1 rounded-full font-semibold" }, "sugestão: " + (SUG[operacaoForm.modalidade] || 1))
                                    ),
                                    React.createElement("div", { className: "ml-auto flex items-center border-2 border-gray-200 rounded-xl overflow-hidden bg-white" },
                                        React.createElement("button", { type: "button", onClick: () => setOperacaoForm(f => ({ ...f, quantidade_motos: Math.max(1, (parseInt(f.quantidade_motos) || 1) - 1) })), className: "w-11 h-11 text-violet-700 text-xl hover:bg-violet-50" }, "−"),
                                        React.createElement("input", { type: "number", min: "1", value: operacaoForm.quantidade_motos, onChange: e => setOperacaoForm(f => ({ ...f, quantidade_motos: parseInt(e.target.value) || 1 })), className: "w-16 h-11 text-center text-lg font-bold border-x border-gray-200 focus:outline-none" }),
                                        React.createElement("button", { type: "button", onClick: () => setOperacaoForm(f => ({ ...f, quantidade_motos: (parseInt(f.quantidade_motos) || 0) + 1 })), className: "w-11 h-11 text-violet-700 text-xl hover:bg-violet-50" }, "+")
                                    )
                                )
                            )
                          ),
                          step === 2 && React.createElement("div", { className: "space-y-6" },
                            React.createElement("div", { className: "bg-gray-50 rounded-xl p-4" },
                                React.createElement("div", { className: "flex items-center justify-between mb-4" },
                                    React.createElement("h3", { className: "font-semibold text-gray-800 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Dados Básicos")),
                                    React.createElement("span", { className: "text-xs text-gray-500" }, (VEH[operacaoForm.tipo_veiculo] || '—') + " · " + (MOD[operacaoForm.modalidade] || '—') + (isHub ? "" : " · " + (operacaoForm.quantidade_motos || 0) + (isClt ? " vaga(s)" : " veículo(s)")))
                                ),
                                React.createElement("div", { className: "grid md:grid-cols-2 gap-4" },
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1" }, "Região *"),
                                        React.createElement("input", { type: "text", value: operacaoForm.regiao, onChange: e => setOperacaoForm(f => ({ ...f, regiao: e.target.value })), placeholder: "Ex: Brasília, Goiânia, São Paulo...", className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                    ),
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1" }, "Nome do Cliente *"),
                                        React.createElement("input", { type: "text", value: operacaoForm.nome_cliente, onChange: e => setOperacaoForm(f => ({ ...f, nome_cliente: e.target.value })), placeholder: "Nome da empresa/loja", className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                    ),
                                    React.createElement("div", { className: "md:col-span-2" },
                                        React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1" }, "Endereço *"),
                                        React.createElement("input", { type: "text", value: operacaoForm.endereco, onChange: e => setOperacaoForm(f => ({ ...f, endereco: e.target.value })), placeholder: "Endereço completo da operação", className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                    )
                                )
                            ),
                            React.createElement("div", { className: "bg-gray-50 rounded-xl p-4" },
                                React.createElement("h3", { className: "font-semibold text-gray-800 mb-4 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-settings" })), "Configurações")),
                                React.createElement("div", { className: "grid md:grid-cols-2 gap-4" },
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1" }, "Data de Início *"),
                                        React.createElement("input", { type: "date", value: operacaoForm.data_inicio, onChange: e => setOperacaoForm(f => ({ ...f, data_inicio: e.target.value })), className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                    )
                                ),
                                React.createElement("div", { className: "grid md:grid-cols-2 gap-4 mt-4" },
                                    !isCarro && React.createElement("label", { className: "flex items-center gap-3 p-4 bg-white rounded-xl border cursor-pointer hover:bg-gray-50" },
                                        React.createElement("input", { type: "checkbox", checked: operacaoForm.obrigatoriedade_bau, onChange: e => setOperacaoForm(f => ({ ...f, obrigatoriedade_bau: e.target.checked })), className: "w-5 h-5 rounded text-violet-600" }),
                                        React.createElement("div", null,
                                            React.createElement("span", { className: "font-semibold text-gray-700" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-package" })), "Obrigatoriedade de Baú")),
                                            React.createElement("p", { className: "text-sm text-gray-500" }, "Veículo precisa ter baú?")
                                        )
                                    ),
                                    !isClt && React.createElement("label", { className: "flex items-center gap-3 p-4 bg-white rounded-xl border cursor-pointer hover:bg-gray-50" },
                                        React.createElement("input", { type: "checkbox", checked: operacaoForm.possui_garantido, onChange: e => setOperacaoForm(f => ({ ...f, possui_garantido: e.target.checked, valor_garantido: e.target.checked ? operacaoForm.valor_garantido : '' })), className: "w-5 h-5 rounded text-violet-600" }),
                                        React.createElement("div", null,
                                            React.createElement("span", { className: "font-semibold text-gray-700" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Possui Garantido")),
                                            React.createElement("p", { className: "text-sm text-gray-500" }, "Loja paga garantido?")
                                        )
                                    )
                                ),
                                (!isClt && operacaoForm.possui_garantido) && React.createElement("div", { className: "mt-4" },
                                    React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Valor do Garantido (R$)")),
                                    React.createElement("input", { type: "number", step: "0.01", min: "0", value: operacaoForm.valor_garantido, onChange: e => setOperacaoForm(f => ({ ...f, valor_garantido: e.target.value })), placeholder: "0.00", className: "w-full md:w-1/3 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                )
                            ),
                            !isClt && React.createElement("div", { className: "bg-gray-50 rounded-xl p-4" },
                                React.createElement("h3", { className: "font-semibold text-gray-800 mb-4 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Valores Pagos por Faixa de KM")),
                                React.createElement("p", { className: "text-sm text-gray-500 mb-4" }, "Preencha os valores de cada faixa de quilometragem"),
                                React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-3" },
                                    operacaoForm.faixas_km.map(function(faixa, idx) {
                                        return React.createElement("div", { key: idx, className: "bg-white p-3 rounded-xl border" },
                                            React.createElement("p", { className: "text-xs font-semibold text-gray-600 mb-2 text-center" }, faixa.km_inicio + " km à " + faixa.km_fim + " km"),
                                            React.createElement("div", { className: "relative" },
                                                React.createElement("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" }, "R$"),
                                                React.createElement("input", { type: "number", step: "0.01", min: "0", value: faixa.valor_motoboy || '', onChange: function(e) { var nf = operacaoForm.faixas_km.slice(); nf[idx] = Object.assign({}, nf[idx], { valor_motoboy: e.target.value }); setOperacaoForm(f => ({ ...f, faixas_km: nf })); }, placeholder: "0.00", className: "w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 text-center" })
                                            )
                                        );
                                    })
                                )
                            ),
                            isClt && React.createElement("div", { className: "bg-gray-50 rounded-xl p-4" },
                                React.createElement("h3", { className: "font-semibold text-gray-800 mb-4 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-idcard" })), "Remuneração CLT")),
                                React.createElement("div", { className: "grid md:grid-cols-3 gap-4" },
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1" }, "Salário base (R$) *"),
                                        React.createElement("input", { type: "number", step: "0.01", min: "0", value: operacaoForm.salario, onChange: e => setOperacaoForm(f => ({ ...f, salario: e.target.value })), placeholder: "0.00", className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                    ),
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1" }, "Início da jornada *"),
                                        React.createElement("input", { type: "time", value: operacaoForm.horario_inicio, onChange: e => setOperacaoForm(f => ({ ...f, horario_inicio: e.target.value })), className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                    ),
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1" }, "Fim da jornada *"),
                                        React.createElement("input", { type: "time", value: operacaoForm.horario_fim, onChange: e => setOperacaoForm(f => ({ ...f, horario_fim: e.target.value })), className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                    )
                                ),
                                React.createElement("div", { className: "mt-4" },
                                    React.createElement("label", { className: "block text-sm font-semibold text-gray-700 mb-1" }, "Escala / observação de horário"),
                                    React.createElement("input", { type: "text", value: operacaoForm.escala_obs, onChange: e => setOperacaoForm(f => ({ ...f, escala_obs: e.target.value })), placeholder: "Ex.: 6x1, seg a sáb, 1h de almoço", className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                ),
                                React.createElement("h3", { className: "font-semibold text-gray-800 mt-6 mb-2 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-gift" })), "Benefícios")),
                                React.createElement("p", { className: "text-sm text-gray-500 mb-3" }, "Ative e informe o valor de cada um"),
                                React.createElement("div", { className: "space-y-2" },
                                    BENS.map(function(b) {
                                        var on = !!(bens[b.k] && bens[b.k].on);
                                        return React.createElement("div", { key: b.k, className: "rounded-xl border-2 bg-white overflow-hidden " + (on ? "border-violet-500" : "border-gray-200") },
                                            React.createElement("div", { onClick: function() { toggleBen(b.k); }, className: "flex items-center gap-3 px-4 py-3 cursor-pointer " + (on ? "bg-violet-50" : "") },
                                                React.createElement("span", { className: "w-10 h-6 rounded-full relative transition-all flex-none " + (on ? "bg-violet-600" : "bg-gray-300") },
                                                    React.createElement("span", { className: "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all " + (on ? "left-[18px]" : "left-0.5") })
                                                ),
                                                React.createElement("span", { className: "text-lg" }, b.i),
                                                React.createElement("span", { className: "font-semibold text-gray-700 text-sm" }, b.t)
                                            ),
                                            on && React.createElement("div", { className: "px-4 pb-4 pt-1" },
                                                React.createElement("label", { className: "block text-xs font-semibold text-gray-600 mb-1" }, "Valor mensal (R$)"),
                                                React.createElement("input", { type: "number", step: "0.01", min: "0", value: (bens[b.k] && bens[b.k].valor) || '', onChange: function(e) { setBenField(b.k, 'valor', e.target.value); }, placeholder: "0.00", className: "w-full md:w-1/3 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                            )
                                        );
                                    }),
                                    (function() {
                                        var on = !!(bens.outros && bens.outros.on);
                                        return React.createElement("div", { className: "rounded-xl border-2 bg-white overflow-hidden " + (on ? "border-violet-500" : "border-gray-200") },
                                            React.createElement("div", { onClick: function() { toggleBen('outros'); }, className: "flex items-center gap-3 px-4 py-3 cursor-pointer " + (on ? "bg-violet-50" : "") },
                                                React.createElement("span", { className: "w-10 h-6 rounded-full relative transition-all flex-none " + (on ? "bg-violet-600" : "bg-gray-300") },
                                                    React.createElement("span", { className: "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all " + (on ? "left-[18px]" : "left-0.5") })
                                                ),
                                                React.createElement("span", { className: "text-lg" }, React.createElement("svg", { className: "ico", style: { width: 20, height: 20 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" }))),
                                                React.createElement("span", { className: "font-semibold text-gray-700 text-sm" }, "Outros bônus")
                                            ),
                                            on && React.createElement("div", { className: "px-4 pb-4 pt-1 grid md:grid-cols-2 gap-3" },
                                                React.createElement("div", null,
                                                    React.createElement("label", { className: "block text-xs font-semibold text-gray-600 mb-1" }, "Descrição"),
                                                    React.createElement("input", { type: "text", value: (bens.outros && bens.outros.desc) || '', onChange: function(e) { setBenField('outros', 'desc', e.target.value); }, placeholder: "Ex.: bônus produtividade, prêmio assiduidade...", className: "w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                                ),
                                                React.createElement("div", null,
                                                    React.createElement("label", { className: "block text-xs font-semibold text-gray-600 mb-1" }, "Valor mensal (R$)"),
                                                    React.createElement("input", { type: "number", step: "0.01", min: "0", value: (bens.outros && bens.outros.valor) || '', onChange: function(e) { setBenField('outros', 'valor', e.target.value); }, placeholder: "0.00", className: "w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                                                )
                                            )
                                        );
                                    })()
                                )
                            ),
                            React.createElement("div", { className: "bg-gray-50 rounded-xl p-4" },
                                React.createElement("h3", { className: "font-semibold text-gray-800 mb-4 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Observações")),
                                React.createElement("textarea", { value: operacaoForm.observacoes, onChange: e => setOperacaoForm(f => ({ ...f, observacoes: e.target.value })), placeholder: "Informações adicionais sobre a operação...", rows: 3, className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500" })
                            )
                          )
                        ),
                        React.createElement("div", { className: "flex items-center gap-3 p-6 border-t bg-gray-50 sticky bottom-0" },
                            step === 1
                                ? React.createElement("button", { onClick: () => setOperacaoModal(false), className: "px-6 py-3 bg-white border text-gray-700 rounded-xl font-semibold hover:bg-gray-100" }, "Cancelar")
                                : React.createElement("button", { onClick: () => setOperacaoForm(f => ({ ...f, _step: 1 })), className: "px-6 py-3 bg-white border text-gray-700 rounded-xl font-semibold hover:bg-gray-100" }, "← Voltar"),
                            React.createElement("div", { className: "flex-1 text-sm text-gray-500" }, step === 1 ? (podeAvancar ? ((VEH[operacaoForm.tipo_veiculo]) + " · " + (MOD[operacaoForm.modalidade])) : "Selecione veículo e modalidade") : "Passo 2 de 2"),
                            step === 1
                                ? React.createElement("button", { disabled: !podeAvancar, onClick: () => setOperacaoForm(f => ({ ...f, _step: 2 })), className: "px-6 py-3 rounded-xl font-semibold text-white " + (podeAvancar ? "bg-violet-600 hover:bg-violet-700" : "bg-violet-300 cursor-not-allowed") }, "Continuar →")
                                : React.createElement("button", {
                                    onClick: async () => {
                                        if (!operacaoForm.regiao || !operacaoForm.nome_cliente || !operacaoForm.endereco || !operacaoForm.data_inicio) { ja('Preencha todos os campos obrigatórios!', 'error'); return; }
                                        if (isClt && !operacaoForm.salario) { ja('Informe o salário base da operação CLT!', 'error'); return; }
                                        s(true);
                                        try {
                                            const url = operacaoEdit ? `${API_URL}/operacoes/${operacaoEdit.id}` : `${API_URL}/operacoes`;
                                            const response = await fetchAuth(url, { method: operacaoEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...operacaoForm, criado_por: l.fullName }) });
                                            if (response.ok) {
                                                ja(operacaoEdit ? 'Operação atualizada!' : 'Operação criada!', 'success');
                                                setOperacaoModal(false);
                                                carregarOperacoes();
                                                if (notificarOperacaoSalva) notificarOperacaoSalva();
                                            } else { throw new Error('Erro ao salvar'); }
                                        } catch (error) { ja('Erro ao salvar operação', 'error'); }
                                        s(false);
                                    },
                                    className: "px-6 py-3 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-700"
                                  }, operacaoEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar Alterações") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Criar Operação"))
                        )
                    )
                );
            })(),
            // ==================== CONTEÚDO RECRUTAMENTO ====================
            p.opTab === "recrutamento" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-6"},
                    // Header
                    React.createElement("div", {className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4"},
                        React.createElement("div", null,
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bike" })), "Recrutamento de Motos")),
                            React.createElement("p", {className: "text-gray-600"}, "Gerencie as necessidades de recrutamento de motoboys")
                        ),
                        React.createElement("div", {className: "flex gap-3"},
                            React.createElement("button", {
                                onClick: carregarRecrutamento,
                                disabled: recrutamentoLoading,
                                className: "px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50"
                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" }))),
                            React.createElement("button", {
                                onClick: () => {
                                    setRecrutamentoEdit(null);
                                    setRecrutamentoForm({
                                        nome_cliente: '',
                                        data_conclusao: '',
                                        quantidade_motos: 1,
                                        quantidade_backup: 0,
                                        observacao: ''
                                    });
                                    setRecrutamentoModal(true);
                                },
                                className: "px-6 py-3 bg-purple-700 text-white rounded-[10px] font-semibold hover:bg-purple-800 flex items-center gap-2"
                            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Nova Necessidade"))
                        )
                    ),
                    
                    // Card de Progresso Geral
                    recrutamentoStats && React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 p-6 text-gray-900"},
                        React.createElement("div", {className: "flex items-center justify-between mb-4"},
                            React.createElement("h3", {className: "text-xl font-bold"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-chart" })), "Progresso Geral de Recrutamento")),
                            React.createElement("span", {className: "text-4xl"}, React.createElement("svg", { className: "ico", style: { width: 38, height: 38 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-target" })))
                        ),
                        React.createElement("div", {className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-4"},
                            React.createElement("div", {className: "text-center"},
                                React.createElement("p", {className: "text-3xl font-bold"}, recrutamentoStats.total_necessidades || 0),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Total Demandas")
                            ),
                            React.createElement("div", {className: "text-center"},
                                React.createElement("p", {className: "text-3xl font-bold text-amber-800"}, recrutamentoStats.em_andamento || 0),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Em Andamento")
                            ),
                            React.createElement("div", {className: "text-center"},
                                React.createElement("p", {className: "text-3xl font-bold text-green-800"}, recrutamentoStats.concluidas || 0),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Concluídas")
                            ),
                            React.createElement("div", {className: "text-center"},
                                React.createElement("p", {className: "text-3xl font-bold"}, 
                                    (parseInt(recrutamentoStats.total_motos_atribuidas) || 0), " / ", (parseInt(recrutamentoStats.total_motos_necessarias) || 0)
                                ),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Motos Atribuídas")
                            )
                        ),
                        // Barra de progresso geral
                        React.createElement("div", null,
                            React.createElement("div", {className: "flex justify-between text-sm mb-1"},
                                React.createElement("span", null, "Progresso Total"),
                                React.createElement("span", null, 
                                    Math.round(((parseInt(recrutamentoStats.total_motos_atribuidas) || 0) / Math.max(1, parseInt(recrutamentoStats.total_motos_necessarias) || 1)) * 100), "%"
                                )
                            ),
                            React.createElement("div", {className: "w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"},
                                React.createElement("div", {
                                    className: "h-full bg-purple-700 rounded-full transition-all duration-500",
                                    style: { width: `${Math.min(100, Math.round(((parseInt(recrutamentoStats.total_motos_atribuidas) || 0) / Math.max(1, parseInt(recrutamentoStats.total_motos_necessarias) || 1)) * 100))}%` }
                                })
                            )
                        )
                    ),
                    
                    // Sub-abas
                    React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 overflow-hidden"},
                        React.createElement("div", {className: "flex border-b"},
                            React.createElement("button", {
                                onClick: () => setRecrutamentoSubTab('em_andamento'),
                                className: "flex-1 px-4 py-3 text-sm font-semibold " + 
                                    (recrutamentoSubTab === 'em_andamento' ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700' : 'text-gray-600 hover:bg-gray-50')
                            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-rocket" })), "Em Andamento ("), recrutamentoData.filter(r => r.status === 'em_andamento').length, ")"),
                            React.createElement("button", {
                                onClick: () => setRecrutamentoSubTab('concluido'),
                                className: "flex-1 px-4 py-3 text-sm font-semibold " + 
                                    (recrutamentoSubTab === 'concluido' ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700' : 'text-gray-600 hover:bg-gray-50')
                            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Concluídas ("), recrutamentoData.filter(r => r.status === 'concluido').length, ")"),
                            React.createElement("button", {
                                onClick: () => setRecrutamentoSubTab('todos'),
                                className: "flex-1 px-4 py-3 text-sm font-semibold " + 
                                    (recrutamentoSubTab === 'todos' ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-700' : 'text-gray-600 hover:bg-gray-50')
                            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Todas ("), recrutamentoData.length, ")")
                        )
                    ),
                    
                    // Loading
                    recrutamentoLoading && React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 p-12 text-center"},
                        React.createElement("div", {className: "inline-block w-12 h-12 border-4 border-purple-700 border-t-transparent rounded-full animate-spin mb-4"}),
                        React.createElement("p", {className: "text-gray-500"}, "Carregando necessidades...")
                    ),
                    
                    // Lista de necessidades
                    !recrutamentoLoading && React.createElement("div", {className: "space-y-4"},
                        (recrutamentoData
                            .filter(r => recrutamentoSubTab === 'todos' ? true : r.status === recrutamentoSubTab)
                            .length === 0) && React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 p-12 text-center"},
                            React.createElement("span", {className: "text-6xl block mb-4"}, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-mail" }))),
                            React.createElement("p", {className: "text-gray-500 text-lg"}, "Nenhuma necessidade encontrada"),
                            React.createElement("p", {className: "text-gray-400 text-sm"}, "Clique em \"Nova Necessidade\" para cadastrar")
                        ),
                        
                        recrutamentoData
                            .filter(r => recrutamentoSubTab === 'todos' ? true : r.status === recrutamentoSubTab)
                            .map(nec => {
                                const motosAtribuidas = nec.atribuicoes?.filter(a => a.tipo === 'titular').length || 0;
                                const backupsAtribuidos = nec.atribuicoes?.filter(a => a.tipo === 'backup').length || 0;
                                const progressoMotos = Math.round((motosAtribuidas / Math.max(1, nec.quantidade_motos)) * 100);
                                const progressoBackups = nec.quantidade_backup > 0 ? Math.round((backupsAtribuidos / nec.quantidade_backup) * 100) : 100;
                                const progressoTotal = Math.round(((motosAtribuidas + backupsAtribuidos) / Math.max(1, nec.quantidade_motos + nec.quantidade_backup)) * 100);
                                
                                // Calcular dias restantes
                                const hoje = new Date();
                                const dataConclusao = new Date(nec.data_conclusao?.split('T')[0] + "T12:00:00");
                                const diasRestantes = Math.ceil((dataConclusao - hoje) / (1000 * 60 * 60 * 24));
                                
                                return React.createElement("div", {
                                    key: nec.id,
                                    className: "bg-white rounded-[14px] border border-gray-200 overflow-hidden " +
                                        (nec.status === 'concluido' ? 'border-green-500' : 
                                         diasRestantes < 0 ? 'border-red-500' :
                                         diasRestantes <= 3 ? 'border-yellow-500' : 'border-purple-700')
                                },
                                    // Header do card
                                    React.createElement("div", {className: "p-6"},
                                        React.createElement("div", {className: "flex justify-between items-start mb-4"},
                                            React.createElement("div", null,
                                                React.createElement("div", {className: "flex items-center gap-3 mb-2"},
                                                    React.createElement("h3", {className: "text-xl font-bold text-gray-800"}, nec.nome_cliente),
                                                    React.createElement("span", {
                                                        className: "px-3 py-1 rounded-full text-xs font-bold " +
                                                            (nec.status === 'concluido' ? 'bg-green-100 text-green-700' : 
                                                             nec.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                                                             'bg-yellow-100 text-yellow-700')
                                                    }, nec.status === 'concluido' ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Concluído") : 
                                                       nec.status === 'cancelado' ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Cancelado") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-rocket" })), "Em Andamento"))
                                                ),
                                                React.createElement("div", {className: "flex items-center gap-4 text-sm text-gray-600"},
                                                    React.createElement("span", {className: "flex items-center gap-1"},
                                                        React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-calendar" })), "Conclusão: "),
                                                        React.createElement("strong", null, new Date(nec.data_conclusao?.split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR'))
                                                    ),
                                                    React.createElement("span", {
                                                        className: "px-2 py-1 rounded text-xs font-bold " +
                                                            (diasRestantes < 0 ? 'bg-red-100 text-red-700' :
                                                             diasRestantes <= 3 ? 'bg-yellow-100 text-yellow-700' :
                                                             'bg-purple-100 text-purple-700')
                                                    }, diasRestantes < 0 ? `${Math.abs(diasRestantes)} dias atrasado` :
                                                       diasRestantes === 0 ? 'Hoje!' :
                                                       diasRestantes === 1 ? 'Amanhã' :
                                                       `${diasRestantes} dias restantes`)
                                                )
                                            ),
                                            React.createElement("div", {className: "flex gap-2"},
                                                React.createElement("button", {
                                                    onClick: () => {
                                                        setRecrutamentoEdit(nec);
                                                        setRecrutamentoForm({
                                                            nome_cliente: nec.nome_cliente,
                                                            data_conclusao: nec.data_conclusao?.split('T')[0] || '',
                                                            quantidade_motos: nec.quantidade_motos,
                                                            quantidade_backup: nec.quantidade_backup,
                                                            observacao: nec.observacao || ''
                                                        });
                                                        setRecrutamentoModal(true);
                                                    },
                                                    className: "px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-100"
                                                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" }))),
                                                React.createElement("button", {
                                                    onClick: () => deletarRecrutamento(nec.id),
                                                    className: "px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))
                                            )
                                        ),
                                        
                                        // Barra de progresso geral do card
                                        React.createElement("div", {className: "mb-4"},
                                            React.createElement("div", {className: "flex justify-between text-sm mb-1"},
                                                React.createElement("span", {className: "text-gray-600"}, "Progresso Total"),
                                                React.createElement("span", {className: "font-bold " + (progressoTotal === 100 ? 'text-green-600' : 'text-purple-700')}, 
                                                    progressoTotal, "%"
                                                )
                                            ),
                                            React.createElement("div", {className: "w-full h-3 bg-gray-200 rounded-full overflow-hidden"},
                                                React.createElement("div", {
                                                    className: "h-full rounded-full transition-all duration-500 " +
                                                        (progressoTotal === 100 ? 'bg-green-500' : 'bg-purple-700'),
                                                    style: { width: `${progressoTotal}%` }
                                                })
                                            )
                                        ),
                                        
                                        // Observação
                                        nec.observacao && React.createElement("p", {className: "text-sm text-gray-500 italic mb-4"}, 
                                            React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), nec.observacao
                                        ),
                                        
                                        // Grid de seções: Titulares e Backups
                                        React.createElement("div", {className: "grid md:grid-cols-2 gap-4"},
                                            // Seção Motos Titulares
                                            React.createElement("div", {className: "bg-gray-50 rounded-xl p-4"},
                                                React.createElement("div", {className: "flex justify-between items-center mb-3"},
                                                    React.createElement("h4", {className: "font-bold text-gray-700"}, 
                                                        "Motos Titulares"
                                                    ),
                                                    React.createElement("span", {className: "text-sm font-bold " + 
                                                        (motosAtribuidas >= nec.quantidade_motos ? 'text-green-600' : 'text-orange-600')
                                                    }, motosAtribuidas, " / ", nec.quantidade_motos)
                                                ),
                                                // Barra de progresso titulares
                                                React.createElement("div", {className: "w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3"},
                                                    React.createElement("div", {
                                                        className: "h-full rounded-full transition-all duration-500 " +
                                                            (progressoMotos === 100 ? 'bg-green-500' : 'bg-orange-500'),
                                                        style: { width: `${Math.min(100, progressoMotos)}%` }
                                                    })
                                                ),
                                                // Lista de atribuídos
                                                React.createElement("div", {className: "space-y-2 mb-3 max-h-40 overflow-y-auto"},
                                                    (nec.atribuicoes?.filter(a => a.tipo === 'titular') || []).map(attr => 
                                                        React.createElement("div", {
                                                            key: attr.id,
                                                            className: "flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200"
                                                        },
                                                            React.createElement("div", null,
                                                                React.createElement("span", {className: "font-mono text-purple-700 font-bold"}, attr.cod_profissional),
                                                                attr.nome_profissional && React.createElement("span", {className: "ml-2 text-gray-600 text-sm"}, attr.nome_profissional)
                                                            ),
                                                            React.createElement("button", {
                                                                onClick: () => removerAtribuicaoRecrutamento(attr.id),
                                                                className: "text-red-500 hover:text-red-700 text-sm"
                                                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                                                        )
                                                    )
                                                ),
                                                // Campo para adicionar
                                                motosAtribuidas < nec.quantidade_motos && React.createElement("div", {className: "flex gap-2"},
                                                    React.createElement("div", {className: "flex-1"},
                                                        React.createElement("input", {
                                                            type: "text",
                                                            placeholder: "Código do motoboy",
                                                            value: recrutamentoCodBusca[`${nec.id}_titular`]?.codigo || '',
                                                            onChange: (e) => {
                                                                const codigo = e.target.value;
                                                                setRecrutamentoCodBusca(prev => ({
                                                                    ...prev,
                                                                    [`${nec.id}_titular`]: { ...prev[`${nec.id}_titular`], codigo, nome: '', erro: '' }
                                                                }));
                                                                if (codigo.length >= 3) {
                                                                    buscarProfissionalRecrutamento(nec.id, 'titular', codigo);
                                                                }
                                                            },
                                                            className: "w-full px-3 py-2 border rounded-lg text-sm"
                                                        }),
                                                        recrutamentoCodBusca[`${nec.id}_titular`]?.loading && 
                                                            React.createElement("p", {className: "text-xs text-gray-400 mt-1"}, "Buscando..."),
                                                        recrutamentoCodBusca[`${nec.id}_titular`]?.nome && 
                                                            React.createElement("p", {className: "text-xs text-green-600 mt-1"}, 
                                                                React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), recrutamentoCodBusca[`${nec.id}_titular`].nome
                                                            ),
                                                        recrutamentoCodBusca[`${nec.id}_titular`]?.erro && 
                                                            React.createElement("p", {className: "text-xs text-red-500 mt-1"}, 
                                                                React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), recrutamentoCodBusca[`${nec.id}_titular`].erro
                                                            )
                                                    ),
                                                    React.createElement("button", {
                                                        onClick: () => atribuirProfissionalRecrutamento(nec.id, 'titular'),
                                                        disabled: !recrutamentoCodBusca[`${nec.id}_titular`]?.nome,
                                                        className: "px-4 py-2 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })))
                                                )
                                            ),
                                            
                                            // Seção Motos Backup
                                            nec.quantidade_backup > 0 && React.createElement("div", {className: "bg-blue-50 rounded-xl p-4"},
                                                React.createElement("div", {className: "flex justify-between items-center mb-3"},
                                                    React.createElement("h4", {className: "font-bold text-gray-700"}, 
                                                        "Motos Backup"
                                                    ),
                                                    React.createElement("span", {className: "text-sm font-bold " + 
                                                        (backupsAtribuidos >= nec.quantidade_backup ? 'text-green-600' : 'text-blue-600')
                                                    }, backupsAtribuidos, " / ", nec.quantidade_backup)
                                                ),
                                                // Barra de progresso backups
                                                React.createElement("div", {className: "w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3"},
                                                    React.createElement("div", {
                                                        className: "h-full rounded-full transition-all duration-500 " +
                                                            (progressoBackups === 100 ? 'bg-green-500' : 'bg-blue-500'),
                                                        style: { width: `${Math.min(100, progressoBackups)}%` }
                                                    })
                                                ),
                                                // Lista de atribuídos
                                                React.createElement("div", {className: "space-y-2 mb-3 max-h-40 overflow-y-auto"},
                                                    (nec.atribuicoes?.filter(a => a.tipo === 'backup') || []).map(attr => 
                                                        React.createElement("div", {
                                                            key: attr.id,
                                                            className: "flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200"
                                                        },
                                                            React.createElement("div", null,
                                                                React.createElement("span", {className: "font-mono text-blue-600 font-bold"}, attr.cod_profissional),
                                                                attr.nome_profissional && React.createElement("span", {className: "ml-2 text-gray-600 text-sm"}, attr.nome_profissional)
                                                            ),
                                                            React.createElement("button", {
                                                                onClick: () => removerAtribuicaoRecrutamento(attr.id),
                                                                className: "text-red-500 hover:text-red-700 text-sm"
                                                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                                                        )
                                                    )
                                                ),
                                                // Campo para adicionar
                                                backupsAtribuidos < nec.quantidade_backup && React.createElement("div", {className: "flex gap-2"},
                                                    React.createElement("div", {className: "flex-1"},
                                                        React.createElement("input", {
                                                            type: "text",
                                                            placeholder: "Código do motoboy",
                                                            value: recrutamentoCodBusca[`${nec.id}_backup`]?.codigo || '',
                                                            onChange: (e) => {
                                                                const codigo = e.target.value;
                                                                setRecrutamentoCodBusca(prev => ({
                                                                    ...prev,
                                                                    [`${nec.id}_backup`]: { ...prev[`${nec.id}_backup`], codigo, nome: '', erro: '' }
                                                                }));
                                                                if (codigo.length >= 3) {
                                                                    buscarProfissionalRecrutamento(nec.id, 'backup', codigo);
                                                                }
                                                            },
                                                            className: "w-full px-3 py-2 border rounded-lg text-sm"
                                                        }),
                                                        recrutamentoCodBusca[`${nec.id}_backup`]?.loading && 
                                                            React.createElement("p", {className: "text-xs text-gray-400 mt-1"}, "Buscando..."),
                                                        recrutamentoCodBusca[`${nec.id}_backup`]?.nome && 
                                                            React.createElement("p", {className: "text-xs text-green-600 mt-1"}, 
                                                                React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), recrutamentoCodBusca[`${nec.id}_backup`].nome
                                                            ),
                                                        recrutamentoCodBusca[`${nec.id}_backup`]?.erro && 
                                                            React.createElement("p", {className: "text-xs text-red-500 mt-1"}, 
                                                                React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), recrutamentoCodBusca[`${nec.id}_backup`].erro
                                                            )
                                                    ),
                                                    React.createElement("button", {
                                                        onClick: () => atribuirProfissionalRecrutamento(nec.id, 'backup'),
                                                        disabled: !recrutamentoCodBusca[`${nec.id}_backup`]?.nome,
                                                        className: "px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })))
                                                )
                                            ),
                                            
                                            // Se não tem backup, ocupar espaço vazio ou mostrar info
                                            nec.quantidade_backup === 0 && React.createElement("div", {className: "bg-gray-100 rounded-xl p-4 flex items-center justify-center"},
                                                React.createElement("p", {className: "text-gray-400 text-sm"}, "Sem necessidade de backup")
                                            )
                                        ),
                                        
                                        // Rodapé com info de criação
                                        React.createElement("p", {className: "text-xs text-gray-400 mt-4 text-right"}, 
                                            "Criado por: ", nec.criado_por || '-', " em ", new Date(nec.created_at).toLocaleDateString('pt-BR')
                                        )
                                    )
                                );
                            })
                    )
                ),
                
                // Modal de criar/editar necessidade
                recrutamentoModal && React.createElement("div", {className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"},
                    React.createElement("div", {className: "bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"},
                        // Header do modal
                        React.createElement("div", {className: "p-6 border-b border-gray-200 bg-white text-gray-900 rounded-t-2xl"},
                            React.createElement("h3", {className: "text-xl font-bold"}, 
                                recrutamentoEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })), "Editar Necessidade") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Nova Necessidade de Recrutamento")
                            ),
                            React.createElement("p", {className: "text-sm text-gray-500"}, 
                                "Preencha os dados da necessidade de motos"
                            )
                        ),
                        // Corpo do modal
                        React.createElement("div", {className: "p-6 space-y-4"},
                            // Nome do cliente
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Nome do Cliente *"),
                                React.createElement("input", {
                                    type: "text",
                                    value: recrutamentoForm.nome_cliente,
                                    onChange: (e) => setRecrutamentoForm(f => ({...f, nome_cliente: e.target.value})),
                                    placeholder: "Ex: Magazine Luiza",
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                })
                            ),
                            // Data de conclusão
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Data de Conclusão *"),
                                React.createElement("input", {
                                    type: "date",
                                    value: recrutamentoForm.data_conclusao,
                                    onChange: (e) => setRecrutamentoForm(f => ({...f, data_conclusao: e.target.value})),
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                })
                            ),
                            // Quantidades
                            React.createElement("div", {className: "grid grid-cols-2 gap-4"},
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bike" })), "Quantidade de Motos *")),
                                    React.createElement("input", {
                                        type: "number",
                                        min: "1",
                                        value: recrutamentoForm.quantidade_motos,
                                        onChange: (e) => setRecrutamentoForm(f => ({...f, quantidade_motos: parseInt(e.target.value) || 1})),
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                    })
                                ),
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Quantidade de Backup")),
                                    React.createElement("input", {
                                        type: "number",
                                        min: "0",
                                        value: recrutamentoForm.quantidade_backup,
                                        onChange: (e) => setRecrutamentoForm(f => ({...f, quantidade_backup: parseInt(e.target.value) || 0})),
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                    })
                                )
                            ),
                            // Observação
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Observação (opcional)")),
                                React.createElement("textarea", {
                                    value: recrutamentoForm.observacao,
                                    onChange: (e) => setRecrutamentoForm(f => ({...f, observacao: e.target.value})),
                                    placeholder: "Ex: Preferência por motoboys com experiência em delivery de documentos",
                                    rows: 3,
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                })
                            )
                        ),
                        // Footer do modal
                        React.createElement("div", {className: "p-6 border-t bg-gray-50 flex gap-3 rounded-b-2xl"},
                            React.createElement("button", {
                                onClick: () => { setRecrutamentoModal(false); setRecrutamentoEdit(null); },
                                className: "flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: salvarRecrutamento,
                                disabled: !recrutamentoForm.nome_cliente || !recrutamentoForm.data_conclusao || !recrutamentoForm.quantidade_motos,
                                className: "flex-1 px-4 py-3 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            }, recrutamentoEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar Alterações") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Criar Necessidade"))
                        )
                    )
                )
            ),
            // ==================== CONTEÚDO LOCALIZAÇÃO CLIENTES ====================
            p.opTab === "localizacao-clientes" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-6"},
                    // Header
                    React.createElement("div", {className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4"},
                        React.createElement("div", null,
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pin" })), "Localização Clientes")),
                            React.createElement("p", {className: "text-gray-600"}, "Endereços de coleta (Ponto 1) dos clientes do BI")
                        ),
                        React.createElement("div", {className: "flex gap-3"},
                            // BOTÃO DO ROTEIRIZADOR
                            React.createElement("button", {
                                onClick: async () => {
                                    console.log("🗺️ Botão Roteirizador clicado!");
                                    console.log("🗺️ localizacaoClientes:", localizacaoClientes?.length || 0);
                                    
                                    let dadosClientes = localizacaoClientes;
                                    if (!dadosClientes || dadosClientes.length === 0) {
                                        console.log("🗺️ Carregando clientes...");
                                        await carregarLocalizacaoClientes();
                                        // Aguarda um pouco para os dados carregarem
                                        await new Promise(r => setTimeout(r, 500));
                                        dadosClientes = localizacaoClientes;
                                    }
                                    
                                    console.log("🗺️ Abrindo modal via DOM...");
                                    
                                    // Criar container se não existir
                                    let portalDiv = document.getElementById('roteirizador-portal');
                                    if (!portalDiv) {
                                        portalDiv = document.createElement('div');
                                        portalDiv.id = 'roteirizador-portal';
                                        document.body.appendChild(portalDiv);
                                    }
                                    
                                    // Função para fechar o modal
                                    const fecharModal = () => {
                                        console.log("🗺️ Fechando modal");
                                        const portal = document.getElementById('roteirizador-portal');
                                        if (portal) {
                                            ReactDOM.unmountComponentAtNode(portal);
                                            portal.remove();
                                        }
                                    };
                                    
                                    // Renderizar o modal
                                    ReactDOM.render(
                                        React.createElement(RoteirizadorModule, {
                                            enderecosBi: dadosClientes,
                                            onClose: fecharModal,
                                            showToast: ja
                                        }),
                                        portalDiv
                                    );
                                    
                                    console.log("🗺️ Modal renderizado!");
                                },
                                className: "px-6 py-3 bg-purple-700 text-white rounded-[10px] font-semibold hover:bg-purple-800 flex items-center gap-2 transition-colors"
                            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-map" })), "Roteirizador")),
                            React.createElement("button", {
                                onClick: carregarLocalizacaoClientes,
                                disabled: localizacaoLoading,
                                className: "px-6 py-3 bg-purple-700 text-white rounded-[10px] font-semibold hover:bg-purple-800 flex items-center gap-2 disabled:opacity-50"
                            }, localizacaoLoading ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Carregando...") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-refresh" })), "Atualizar"))
                        )
                    ),
                    
                    // Sub-abas Lista e Mapa
                    React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 overflow-hidden"},
                        React.createElement("div", {className: "flex border-b"},
                            React.createElement("button", {
                                onClick: () => setLocalizacaoSubTab('lista'),
                                className: "flex-1 px-6 py-3 text-sm font-semibold transition-all " + (localizacaoSubTab === 'lista' ? "bg-purple-50 text-purple-700 border-b-2 border-purple-700" : "text-gray-600 hover:bg-gray-50")
                            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Lista")),
                            React.createElement("button", {
                                onClick: () => { 
                                    setLocalizacaoSubTab('mapa'); 
                                    setTimeout(() => window.initMapaClientes(localizacaoClientes), 100);
                                },
                                className: "flex-1 px-6 py-3 text-sm font-semibold transition-all " + (localizacaoSubTab === 'mapa' ? "bg-purple-50 text-purple-700 border-b-2 border-purple-700" : "text-gray-600 hover:bg-gray-50")
                            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-map" })), "Mapa"))
                        )
                    ),
                    
                    // Conteúdo da sub-aba Lista
                    localizacaoSubTab === 'lista' && React.createElement(React.Fragment, null,
                        // Barra de busca
                        React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 p-4"},
                            React.createElement("div", {className: "flex gap-3 items-center"},
                                React.createElement("span", {className: "text-2xl"}, React.createElement("svg", { className: "ico", style: { width: 26, height: 26 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" }))),
                                React.createElement("input", {
                                    type: "text",
                                    value: localizacaoFiltro,
                                    onChange: e => setLocalizacaoFiltro(e.target.value),
                                    placeholder: "Buscar por código ou nome do cliente...",
                                    className: "flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                }),
                                localizacaoFiltro && React.createElement("button", {
                                    onClick: () => setLocalizacaoFiltro(""),
                                    className: "px-4 py-2 text-gray-500 hover:text-gray-700"
                                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })), "Limpar"))
                            )
                        ),
                        
                        // Lista de clientes
                        localizacaoLoading 
                            ? React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 p-8 text-center"},
                                React.createElement("div", {className: "w-12 h-12 border-4 border-purple-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"}),
                                React.createElement("p", {className: "text-gray-600"}, "Carregando dados dos clientes...")
                            )
                            : localizacaoClientes?.length === 0
                                ? React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 p-8 text-center"},
                                    React.createElement("span", {className: "text-5xl block mb-4"}, React.createElement("svg", { className: "ico", style: { width: 48, height: 48 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-mail" }))),
                                    React.createElement("p", {className: "text-gray-500"}, "Nenhum cliente encontrado"),
                                    React.createElement("p", {className: "text-sm text-gray-400 mt-2"}, "Faça upload de dados no módulo BI para ver os clientes aqui")
                                )
                                : React.createElement("div", {className: "space-y-4"},
                                    // Filtrar clientes
                                    (function() {
                                        const filtro = localizacaoFiltro.toLowerCase().trim();
                                        const clientesFiltrados = filtro 
                                            ? localizacaoClientes.filter(c => 
                                                String(c.cod_cliente).toLowerCase().includes(filtro) || 
                                                (c.nome_cliente || "").toLowerCase().includes(filtro)
                                            )
                                            : localizacaoClientes;
                                    
                                    return clientesFiltrados.length === 0
                                        ? React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 p-8 text-center"},
                                            React.createElement("span", {className: "text-3xl block mb-2"}, React.createElement("svg", { className: "ico", style: { width: 30, height: 30 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-search" }))),
                                            React.createElement("p", {className: "text-gray-500"}, "Nenhum cliente encontrado com \"", localizacaoFiltro, "\"")
                                        )
                                        : clientesFiltrados.map(cliente => React.createElement("div", {
                                            key: cliente.cod_cliente + (cliente.centro_custo || ''),
                                            className: "bg-white rounded-[14px] border border-gray-200 overflow-hidden"
                                        },
                                            // Cabeçalho do cliente
                                            React.createElement("div", {className: "bg-white p-4 border-b border-gray-100"},
                                                React.createElement("div", {className: "flex items-center justify-between"},
                                                    React.createElement("div", {className: "flex items-center gap-3"},
                                                        React.createElement("span", {className: "text-2xl"}, React.createElement("svg", { className: "ico", style: { width: 26, height: 26 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-building" }))),
                                                        React.createElement("div", null,
                                                            React.createElement("p", {className: "font-bold text-purple-800 text-lg"}, 
                                                                cliente.cod_cliente, " - ", cliente.nome_cliente
                                                            ),
                                                            cliente.centro_custo && React.createElement("p", {className: "text-sm font-semibold text-purple-600"}, 
                                                                React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-package" })), cliente.centro_custo
                                                            ),
                                                            React.createElement("p", {className: "text-sm text-gray-500"}, 
                                                                cliente.enderecos?.length || 0, " endereço(s) de coleta"
                                                            )
                                                        )
                                                    ),
                                                    React.createElement("span", {className: "px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold"},
                                                        React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pin" })), cliente.enderecos?.length || 0
                                                    )
                                                )
                                            ),
                                            // Lista de endereços
                                            React.createElement("div", {className: "divide-y"},
                                                (cliente.enderecos || []).map((end, idx) => React.createElement("div", {
                                                    key: idx,
                                                    className: "p-4 hover:bg-gray-50 transition-colors"
                                                },
                                                    React.createElement("div", {className: "flex flex-col md:flex-row md:items-center justify-between gap-4"},
                                                        // Info do endereço
                                                        React.createElement("div", {className: "flex-1"},
                                                            React.createElement("p", {className: "font-semibold text-gray-800"}, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pin" })), end.endereco || "Sem endereço"),
                                                            React.createElement("p", {className: "text-sm text-gray-600"}, 
                                                                [end.bairro, end.cidade, end.estado].filter(Boolean).join(" - ") || "Localização não especificada"
                                                            ),
                                                            React.createElement("div", {className: "flex items-center gap-4 mt-2"},
                                                                React.createElement("span", {className: "text-xs text-gray-500"}, 
                                                                    React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-package" })), end.total_entregas || 0, " entregas"
                                                                ),
                                                                end.latitude && end.longitude
                                                                    ? React.createElement("span", {className: "text-xs text-green-600 flex items-center gap-1"},
                                                                        React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), "Coordenadas: "), end.latitude?.toFixed(4), ", ", end.longitude?.toFixed(4)
                                                                    )
                                                                    : React.createElement("span", {className: "text-xs text-orange-500"},
                                                                        "Sem coordenadas"
                                                                    )
                                                            )
                                                        ),
                                                        // Botões de ação - apenas Waze
                                                        React.createElement("div", {className: "flex flex-wrap gap-2"},
                                                            React.createElement("a", {
                                                                href: gerarLinkWaze(end.endereco + " " + (end.cidade || ""), end.latitude, end.longitude),
                                                                target: "_blank",
                                                                rel: "noopener noreferrer",
                                                                className: "px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-semibold hover:bg-purple-800 flex items-center gap-2"
                                                            }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-car" })), "Waze")),
                                                            React.createElement("button", {
                                                                onClick: () => copiarParaClipboard(
                                                                    gerarLinkWaze(end.endereco + " " + (end.cidade || ""), end.latitude, end.longitude),
                                                                    "Waze"
                                                                ),
                                                                className: "px-3 py-2 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-semibold hover:bg-cyan-200"
                                                            }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })))
                                                        )
                                                    )
                                                ))
                                            )
                                        ));
                                })()
                            )
                    ),
                    
                    // Conteúdo da sub-aba Mapa
                    localizacaoSubTab === 'mapa' && React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 overflow-hidden"},
                        // Legenda
                        React.createElement("div", {className: "p-4 border-b bg-gray-50 flex items-center gap-6"},
                            React.createElement("span", {className: "text-sm text-gray-600 font-semibold"}, "Legenda:"),
                            React.createElement("span", {className: "flex items-center gap-1 text-sm"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-building" })), "Clientes")),
                            React.createElement("span", {className: "flex items-center gap-1 text-sm"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-star" })), "Cliente 767"))
                        ),
                        // Container do mapa
                        React.createElement("div", {
                            id: "mapa-clientes-leaflet",
                            style: { height: "500px", width: "100%" }
                        }),
                        // Info
                        React.createElement("div", {className: "p-4 border-t bg-gray-50 text-center text-sm text-gray-500"},
                            "Clique em um marcador para ver detalhes e abrir no Waze"
                        )
                    )
                )
            ),
            // ==================== CONTEÚDO RELATÓRIO DIÁRIO ====================
            p.opTab === "relatorio-diario" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-6"},
                    // Header
                    React.createElement("div", {className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4"},
                        React.createElement("div", null,
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Relatório Diário")),
                            React.createElement("p", {className: "text-gray-600"}, "Registre suas atividades e observações do dia")
                        ),
                        React.createElement("button", {
                            onClick: abrirNovoRelatorio,
                            className: "px-6 py-3 bg-purple-700 text-white rounded-[10px] font-semibold hover:bg-purple-800 flex items-center gap-2"
                        }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Criar Relatório"))
                    ),
                    
                    // Lista de relatórios
                    relatoriosLoading 
                        ? React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 p-8 text-center"},
                            React.createElement("div", {className: "w-12 h-12 border-4 border-purple-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"}),
                            React.createElement("p", {className: "text-gray-600"}, "Carregando relatórios...")
                        )
                        : relatoriosDiarios?.length === 0
                            ? React.createElement("div", {className: "bg-white rounded-[14px] border border-gray-200 p-12 text-center"},
                                React.createElement("span", {className: "text-6xl block mb-4"}, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" }))),
                                React.createElement("p", {className: "text-gray-500 text-lg"}, "Nenhum relatório encontrado"),
                                React.createElement("p", {className: "text-sm text-gray-400 mt-2"}, "Clique em \"+ Criar Relatório\" para começar"),
                                React.createElement("button", {
                                    onClick: abrirNovoRelatorio,
                                    className: "mt-6 px-6 py-3 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800"
                                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Criar Primeiro Relatório"))
                            )
                            : React.createElement("div", {className: "space-y-4"},
                                relatoriosDiarios.map(rel => React.createElement("div", {
                                    key: rel.id,
                                    className: "bg-white rounded-[14px] border border-gray-200 overflow-hidden"
                                },
                                    // Header do relatório
                                    React.createElement("div", {className: "bg-white p-4 border-b border-gray-100"},
                                        React.createElement("div", {className: "flex items-center justify-between"},
                                            React.createElement("div", {className: "flex items-center gap-3"},
                                                rel.usuario_foto 
                                                    ? React.createElement("img", {
                                                        src: rel.usuario_foto,
                                                        className: "w-12 h-12 rounded-full object-cover border-2 border-purple-200"
                                                    })
                                                    : React.createElement("div", {
                                                        className: "w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg"
                                                    }, (rel.usuario_nome || "?").charAt(0).toUpperCase()),
                                                React.createElement("div", null,
                                                    React.createElement("p", {className: "font-bold text-purple-800"}, rel.titulo),
                                                    React.createElement("p", {className: "text-sm text-gray-500"}, 
                                                        rel.usuario_nome, " • ", 
                                                        new Date(rel.created_at).toLocaleDateString('pt-BR', {
                                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })
                                                    )
                                                )
                                            ),
                                            React.createElement("div", {className: "flex gap-2"},
                                                React.createElement("button", {
                                                    onClick: () => abrirEditarRelatorio(rel),
                                                    className: "p-2 text-blue-600 hover:bg-blue-50 rounded-lg",
                                                    title: "Editar"
                                                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" }))),
                                                React.createElement("button", {
                                                    onClick: () => excluirRelatorio(rel.id),
                                                    className: "p-2 text-red-600 hover:bg-red-50 rounded-lg",
                                                    title: "Excluir"
                                                }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#dc2626" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-trash" })))
                                            )
                                        )
                                    ),
                                    // Conteúdo do relatório
                                    React.createElement("div", {className: "p-4"},
                                        React.createElement("div", {
                                            className: "text-gray-700 whitespace-pre-wrap",
                                            dangerouslySetInnerHTML: { __html: (rel.conteudo || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/_(.*?)_/g, '<em>$1</em>') }
                                        }),
                                        rel.imagem_url && React.createElement("div", {className: "mt-4"},
                                            React.createElement("img", {
                                                src: rel.imagem_url,
                                                className: "max-w-full md:max-w-md rounded-lg shadow cursor-pointer hover:opacity-90 transition-opacity",
                                                onClick: () => setRelatorioImagemAmpliada(rel.imagem_url)
                                            })
                                        )
                                    ),
                                    // Seção de Visualizações
                                    React.createElement("div", {className: "px-4 pb-4 border-t pt-3 bg-gray-50"},
                                        React.createElement("div", {className: "flex items-center gap-2 flex-wrap"},
                                            React.createElement("span", {className: "text-sm text-gray-500 font-medium"}, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-eye" })), "Visualizações:")),
                                            rel.visualizacoes && rel.visualizacoes.length > 0
                                                ? React.createElement("div", {className: "flex items-center gap-1 flex-wrap"},
                                                    rel.visualizacoes.slice(0, 10).map((vis, idx) => 
                                                        React.createElement("div", {
                                                            key: idx,
                                                            className: "relative group",
                                                            title: vis.usuario_nome + " - " + new Date(vis.visualizado_em).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})
                                                        },
                                                            vis.usuario_foto 
                                                                ? React.createElement("img", {
                                                                    src: vis.usuario_foto,
                                                                    className: "w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm hover:scale-110 transition-transform cursor-pointer"
                                                                })
                                                                : React.createElement("div", {
                                                                    className: "w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs border-2 border-white shadow-sm"
                                                                }, (vis.usuario_nome || "?").charAt(0).toUpperCase())
                                                        )
                                                    ),
                                                    rel.visualizacoes.length > 10 && React.createElement("span", {
                                                        className: "text-xs text-gray-500 ml-1"
                                                    }, "+", rel.visualizacoes.length - 10)
                                                )
                                                : React.createElement("span", {className: "text-sm text-gray-400 italic"}, "Nenhuma visualização ainda")
                                        )
                                    )
                                ))
                            )
                )
            ),
            // Modal de criar/editar relatório
            showRelatorioModal && React.createElement("div", {
                className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                onClick: (e) => { if (e.target === e.currentTarget) setShowRelatorioModal(false); }
            },
                React.createElement("div", {className: "bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"},
                    // Header do modal
                    React.createElement("div", {className: "bg-white border-b border-gray-200 text-gray-900 p-4 flex items-center justify-between"},
                        React.createElement("h3", {className: "text-lg font-bold"}, relatorioEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })), "Editar Relatório") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Novo Relatório")),
                        React.createElement("button", {
                            onClick: () => setShowRelatorioModal(false),
                            className: "text-gray-400 hover:text-gray-700 text-2xl"
                        }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                    ),
                    
                    // Info do usuário e data
                    React.createElement("div", {className: "p-4 bg-gray-50 border-b flex items-center gap-3"},
                        socialProfile?.profile_photo 
                            ? React.createElement("img", {
                                src: socialProfile.profile_photo,
                                className: "w-10 h-10 rounded-full object-cover border-2 border-purple-200"
                            })
                            : React.createElement("div", {
                                className: "w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold"
                            }, (l.fullName || "?").charAt(0).toUpperCase()),
                        React.createElement("div", null,
                            React.createElement("p", {className: "font-semibold text-gray-800"}, l.fullName || l.username),
                            React.createElement("p", {className: "text-sm text-gray-500"}, 
                                new Date().toLocaleDateString('pt-BR', {
                                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })
                            )
                        )
                    ),
                    
                    // Formulário
                    React.createElement("div", {
                        className: "p-4 space-y-4 overflow-y-auto flex-1",
                        onKeyDown: (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }
                    },
                        // Título
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Título *"),
                            React.createElement("input", {
                                type: "text",
                                value: relatorioForm.titulo,
                                onChange: e => setRelatorioForm(prev => ({...prev, titulo: e.target.value})),
                                placeholder: "Ex: Relatório de entregas - Zona Norte",
                                className: "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                            })
                        ),
                        
                        // Barra de formatação
                        React.createElement("div", {className: "flex flex-wrap items-center gap-2 p-2 bg-gray-100 rounded-lg"},
                            React.createElement("span", {className: "text-sm text-gray-500 mr-2"}, "Emojis:"),
                            ['', '', '', '', '', '', '', '', '', '', '', ''].map(emoji => 
                                React.createElement("button", {
                                    key: emoji,
                                    type: "button",
                                    onClick: () => inserirEmoji(emoji),
                                    className: "p-1.5 hover:bg-white rounded text-lg transition-colors",
                                    title: "Inserir " + emoji
                                }, emoji)
                            ),
                            React.createElement("div", {className: "h-6 w-px bg-gray-300 mx-2"}),
                            React.createElement("button", {
                                type: "button",
                                onClick: () => aplicarFormatacao('bold'),
                                className: "p-1.5 hover:bg-white rounded font-bold text-gray-700",
                                title: "Negrito (selecione o texto primeiro)"
                            }, "B"),
                            React.createElement("button", {
                                type: "button",
                                onClick: () => aplicarFormatacao('italic'),
                                className: "p-1.5 hover:bg-white rounded italic text-gray-700",
                                title: "Itálico (selecione o texto primeiro)"
                            }, "I")
                        ),
                        
                        // Campo de conteúdo
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Conteúdo"),
                            React.createElement("textarea", {
                                id: "relatorio-conteudo",
                                value: relatorioForm.conteudo,
                                onChange: e => setRelatorioForm(prev => ({...prev, conteudo: e.target.value})),
                                placeholder: "Descreva suas atividades, observações, ocorrências...\n\nDica: Use **texto** para negrito e _texto_ para itálico",
                                rows: 10,
                                className: "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
                            })
                        ),
                        
                        // Upload de imagem
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Imagem/Arquivo (opcional)"),
                            React.createElement("div", {className: "border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-purple-400 transition-colors"},
                                React.createElement("input", {
                                    type: "file",
                                    accept: "image/*",
                                    onChange: e => setRelatorioForm(prev => ({...prev, imagem: e.target.files?.[0] || null})),
                                    className: "hidden",
                                    id: "relatorio-imagem"
                                }),
                                React.createElement("label", {
                                    htmlFor: "relatorio-imagem",
                                    className: "cursor-pointer"
                                },
                                    relatorioForm.imagem 
                                        ? React.createElement("div", {className: "text-purple-700"},
                                            React.createElement("span", {className: "text-2xl"}, React.createElement("svg", { className: "ico", style: { width: 26, height: 26 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-link" }))),
                                            React.createElement("p", {className: "font-semibold"}, relatorioForm.imagem.name),
                                            React.createElement("p", {className: "text-sm text-gray-500"}, "Clique para trocar")
                                        )
                                        : React.createElement("div", {className: "text-gray-500"},
                                            React.createElement("span", {className: "text-3xl"}, React.createElement("svg", { className: "ico", style: { width: 30, height: 30 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-camera" }))),
                                            React.createElement("p", null, "Clique para selecionar uma imagem"),
                                            React.createElement("p", {className: "text-sm"}, "PNG, JPG até 5MB")
                                        )
                                )
                            )
                        )
                    ),
                    
                    // Footer do modal
                    React.createElement("div", {className: "p-4 bg-gray-50 border-t flex gap-3"},
                        React.createElement("button", {
                            type: "button",
                            onClick: (e) => { e.preventDefault(); e.stopPropagation(); setShowRelatorioModal(false); },
                            className: "flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100"
                        }, "Cancelar"),
                        React.createElement("button", {
                            type: "button",
                            onClick: (e) => { e.preventDefault(); e.stopPropagation(); salvarRelatorio(e); return false; },
                            disabled: !relatorioForm.titulo.trim(),
                            className: "flex-1 px-6 py-3 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        }, relatorioEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar Alterações") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Criar Relatório"))
                    )
                )
            ),
            // ==================== CONTEÚDO SCORE PROF ====================
            // 🚀 2026-05: usa Score v2 quando disponível, fallback pra ScoreAdmin (v1)
            // 🔧 FIX: usa fetchAuth (padrão Tutts) em vez de localStorage direto.
            // O Tutts usa httpOnly cookies + Bearer via getToken() — montar fetch
            // na mão sem isso resultava em 401 + loop infinito de toast.
            p.opTab === "score-prof" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                typeof window.ModuloScoreV2Component !== 'undefined'
                    ? React.createElement(window.ModuloScoreV2Component, {
                        fetchApi: async (url, opts) => {
                            const r = await fetchAuth(API_URL + url, opts || {});
                            if (!r.ok) {
                                const err = await r.json().catch(() => ({ error: 'Erro ' + r.status }));
                                throw new Error(err.error || err.details || 'Erro ' + r.status);
                            }
                            return r.json();
                        },
                        showToast: ja
                    })
                    : React.createElement(ScoreAdmin, {
                        apiUrl: API_URL,
                        showToast: ja
                    })
            ),
            // ==================== CONTEÚDO INCENTIVOS ====================
            /* OPER_CLEAN_V1 — Acompanhamento: faixa de KPIs, calendário limpo com marcas por tipo, filtro em pílulas e cards de demanda */
            p.opTab === "incentivos" && (() => {
                const h = React.createElement;
                const SORA = "Sora, Inter, sans-serif";
                const CARD = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14 };
                const ico = (nome, sz, cor) => h("svg", { className: "ico", style: { width: sz || 16, height: sz || 16, color: cor }, "aria-hidden": "true" }, h("use", { href: "#i-" + nome }));
                const dot = (cor, sz) => h("span", { "aria-hidden": "true", style: { width: sz || 6, height: sz || 6, borderRadius: 99, background: cor, flex: "none", display: "inline-block" } });
                const TIPO = { incentivo: ["Incentivo", "#770fa8"], promocao: ["Promoção", "#f67602"], operacao: ["Nova operação", "#2563eb"] };
                const TOM = { verde: ["#f0fdf4", "#166534", "#16a34a"], ambar: ["#fffbeb", "#92400e", "#d97706"], cinza: ["#f3f4f6", "#374151", "#6b7280"], roxo: ["#faf7fd", "#5d0b85", "#770fa8"], azul: ["#eff6ff", "#1e40af", "#2563eb"] };
                const pill = (tom, txt) => { const t = TOM[tom]; return h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 99, padding: "2px 9px", fontWeight: 600, fontSize: 11.5, background: t[0], color: t[1], whiteSpace: "nowrap" } }, dot(t[2]), txt); };
                const brl = v => "R$ " + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const fData = d => d ? new Date(String(d).split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : "—";
                const abrirNova = () => {
                    setIncentivoEdit(null);
                    setIncentivoForm({
                        titulo: '',
                        tipo: 'promocao',
                        data_inicio: '',
                        data_fim: '',
                        hora_inicio: '',
                        hora_fim: '',
                        valor: '',
                        valor_incentivo: '',
                        clientes_vinculados: [],
                        centros_vinculados: {},
                        cor: '#16a34a'
                    });
                    setIncentivoModal(true);
                };
                const abrirEdicao = (item) => {
                    setIncentivoEdit(item);
                    setIncentivoForm({
                        titulo: item.titulo,
                        tipo: item.tipo,
                        data_inicio: item.data_inicio?.slice(0, 10),
                        data_fim: item.data_fim?.slice(0, 10),
                        hora_inicio: item.hora_inicio?.slice(0, 5) || '',
                        hora_fim: item.hora_fim?.slice(0, 5) || '',
                        valor: item.valor || '',
                        valor_incentivo: item.valor_incentivo || '',
                        clientes_vinculados: item.clientes_vinculados || [],
                        centros_vinculados: item.centros_vinculados || {},
                        cor: item.cor || '#16a34a'
                    });
                    (item.clientes_vinculados || []).forEach(function(cod) { fetchCentrosCusto(cod); });
                    setIncentivoModal(true);
                };

                // Total investido no mês (mesma regra de antes)
                const calMes = new Date(incentivosCalendarioMes);
                const inicioMes = new Date(calMes.getFullYear(), calMes.getMonth(), 1).toISOString().split('T')[0];
                const fimMes = new Date(calMes.getFullYear(), calMes.getMonth() + 1, 0).toISOString().split('T')[0];
                const doMes = (incentivosData || []).filter(inc => {
                    const di = (inc.data_inicio || '').slice(0, 10);
                    const df = (inc.data_fim || '').slice(0, 10);
                    return di <= fimMes && df >= inicioMes;
                });
                const totalInvestido = doMes.reduce((acc, inc) => {
                    if (inc.tipo === 'incentivo' && inc.calculo?.valor_total) {
                        return acc + inc.calculo.valor_total;
                    }
                    if (inc.tipo === 'promocao' && inc.valor) {
                        const valorNum = parseFloat(inc.valor.replace(/[^\d.,]/g, '').replace(',', '.'));
                        if (!isNaN(valorNum)) return acc + valorNum;
                    }
                    return acc;
                }, 0);
                const osNoMes = doMes.reduce((acc, inc) => acc + (Number(inc.calculo?.quantidade_os) || 0), 0);
                const nomeMes = calMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

                const kpi = (rotulo, valor, cor, sub, ultimo) => h("div", { style: { padding: "16px 20px", borderRight: ultimo ? 0 : "1px solid #f3f4f6", minWidth: 0 } },
                    h("div", { style: { fontSize: 12, color: "#6b7280" } }, rotulo),
                    h("div", { style: { fontFamily: SORA, fontSize: 26, fontWeight: 700, color: cor || "#111827", fontVariantNumeric: "tabular-nums", lineHeight: 1.3 } }, valor),
                    sub ? h("div", { style: { fontSize: 11.5, color: "#6b7280" } }, sub) : null);

                // Calendário
                const mesAtual = new Date(incentivosCalendarioMes);
                const ano = mesAtual.getFullYear();
                const mes = mesAtual.getMonth();
                const diasNoMes = new Date(ano, mes + 1, 0).getDate();
                const diaSemanaInicio = new Date(ano, mes, 1).getDay();
                const hojeCal = new Date();
                hojeCal.setHours(0, 0, 0, 0);
                const celulas = [];
                for (let i = 0; i < diaSemanaInicio; i++) celulas.push(h("div", { key: 'empty-' + i, "aria-hidden": "true" }));
                for (let dia = 1; dia <= diasNoMes; dia++) {
                    const dataAtual = new Date(ano, mes, dia);
                    const isHoje = dataAtual.getTime() === hojeCal.getTime();
                    const incentivosNoDia = (incentivosData || []).filter(inc => {
                        const inicio = new Date(inc.data_inicio?.split('T')[0] + "T12:00:00");
                        const fim = new Date(inc.data_fim?.split('T')[0] + "T12:00:00");
                        inicio.setHours(0, 0, 0, 0);
                        fim.setHours(23, 59, 59, 999);
                        return dataAtual >= inicio && dataAtual <= fim;
                    });
                    const operacoesNoDia = (operacoesData || []).filter(op => {
                        if (!op.data_inicio) return false;
                        const inicio = new Date(op.data_inicio?.split('T')[0] + "T12:00:00");
                        inicio.setHours(0, 0, 0, 0);
                        return dataAtual.getTime() === inicio.getTime();
                    });
                    const tipos = [];
                    if (incentivosNoDia.some(inc => inc.tipo === 'incentivo')) tipos.push('incentivo');
                    if (incentivosNoDia.some(inc => inc.tipo !== 'incentivo')) tipos.push('promocao');
                    if (operacoesNoDia.length) tipos.push('operacao');
                    const nomes = incentivosNoDia.map(inc => inc.titulo + (inc.status === 'pausado' ? ' (Pausado)' : '')).concat(operacoesNoDia.map(op => 'Nova Operação: ' + op.nome_cliente));
                    // OPER_CLEAN_V1: clicar no dia filtra a lista de demandas daquele dia (clicar de novo limpa).
                    const diaIso = ano + '-' + String(mes + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
                    const diaSel = p.opIncDia === diaIso;
                    celulas.push(h("button", {
                        key: dia,
                        type: "button",
                        "aria-pressed": diaSel ? "true" : "false",
                        "aria-label": "Dia " + dia + (nomes.length ? ": " + nomes.join(', ') : ""),
                        onClick: () => x({ ...p, opIncDia: diaSel ? null : diaIso }),
                        title: nomes.length ? nomes.join('\n') : undefined,
                        style: { border: diaSel ? "1.5px solid #770fa8" : "1.5px solid transparent", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", borderRadius: 8, fontSize: 12, fontVariantNumeric: "tabular-nums", background: isHoje ? "#770fa8" : "transparent", color: isHoje ? "#ffffff" : "#374151", fontWeight: isHoje ? 700 : 400 }
                    },
                        h("span", null, dia),
                        h("span", { style: { display: "flex", gap: 2, justifyContent: "center", minHeight: 5 } }, tipos.map(tp => h("span", { key: tp, style: { width: 5, height: 5, borderRadius: 99, background: isHoje ? "#ffffff" : TIPO[tp][1] } })))));
                }
                const mudarMes = (delta) => {
                    const novaData = new Date(incentivosCalendarioMes);
                    novaData.setMonth(novaData.getMonth() + delta);
                    setIncentivosCalendarioMes(novaData);
                };
                const navBtn = (rotulo, icone, delta, girar) => h("button", { type: "button", "aria-label": rotulo, title: rotulo, onClick: () => mudarMes(delta), className: "hover:bg-gray-50", style: { width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#ffffff", color: "#374151", display: "inline-grid", placeItems: "center", cursor: "pointer" } }, h("span", { style: { display: "inline-flex", transform: girar ? "rotate(180deg)" : "none" } }, ico(icone, 14)));

                // Demandas (incentivos + promoções + operações)
                const todasDemandas = [
                    ...(incentivosData || []).map(inc => ({ ...inc, _tipo: inc.tipo })),
                    ...(operacoesData || []).filter(op => op.status !== 'concluido').map(op => ({
                        ...op,
                        _tipo: 'operacao',
                        titulo: op.nome_cliente,
                        data_fim: op.data_inicio // operação só tem data início
                    }))
                ].sort((a, b) => new Date(b.data_inicio) - new Date(a.data_inicio));
                const filtro = p.opIncFiltro || "todas";
                const diaFiltro = p.opIncDia ? new Date(p.opIncDia + "T12:00:00") : null;
                const noDia = (d) => {
                    if (!diaFiltro) return true;
                    const ini = new Date(String(d.data_inicio || '').split('T')[0] + "T00:00:00");
                    const fim = new Date(String(d.data_fim || d.data_inicio || '').split('T')[0] + "T23:59:59");
                    return diaFiltro >= ini && diaFiltro <= fim;
                };
                const visiveis = todasDemandas.filter(noDia).filter(d => filtro === "todas" || (filtro === "operacao" ? d._tipo === "operacao" : filtro === "incentivo" ? d._tipo === "incentivo" : (d._tipo !== "incentivo" && d._tipo !== "operacao")));
                const contagem = { todas: todasDemandas.length, incentivo: todasDemandas.filter(d => d._tipo === "incentivo").length, promocao: todasDemandas.filter(d => d._tipo !== "incentivo" && d._tipo !== "operacao").length, operacao: todasDemandas.filter(d => d._tipo === "operacao").length };
                const filtroBtn = (id, rotulo) => {
                    const on = filtro === id;
                    return h("button", { key: id, type: "button", "aria-pressed": on ? "true" : "false", onClick: () => x({ ...p, opIncFiltro: id }), className: on ? "" : "hover:bg-gray-50", style: { height: 32, padding: "0 12px", borderRadius: 99, border: on ? "1px solid #770fa8" : "1px solid #e5e7eb", background: on ? "#770fa8" : "#ffffff", color: on ? "#ffffff" : "#374151", fontWeight: on ? 600 : 400, fontSize: 13, cursor: "pointer" } }, rotulo, h("span", { style: { marginLeft: 6, opacity: on ? 0.85 : 1, color: on ? "#ffffff" : "#9ca3af", fontVariantNumeric: "tabular-nums" } }, contagem[id]));
                };
                const metrica = (rotulo, valor, cor) => h("div", { style: { minWidth: 64 } },
                    h("div", { style: { fontSize: 11.5, color: "#6b7280", whiteSpace: "nowrap" } }, rotulo),
                    h("div", { style: { fontWeight: 700, fontVariantNumeric: "tabular-nums", color: cor || "#111827", whiteSpace: "nowrap" } }, valor));
                const acaoBtn = (rotulo, icone, onClick, destrutivo) => h("button", { type: "button", "aria-label": rotulo, title: rotulo, onClick, className: destrutivo ? "hover:bg-red-50" : "hover:bg-gray-50", style: { width: 32, height: 32, borderRadius: 8, border: "1px solid " + (destrutivo ? "#fecaca" : "#e5e7eb"), background: "#ffffff", color: destrutivo ? "#991b1b" : "#374151", display: "inline-grid", placeItems: "center", cursor: "pointer" } }, ico(icone, 15));

                const cardDemanda = (item) => {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const inicio = new Date(item.data_inicio?.split('T')[0] + "T12:00:00");
                    const fim = item.data_fim ? new Date(item.data_fim?.split('T')[0] + "T12:00:00") : inicio;
                    const isAtivo = item.status === 'ativo' && hoje >= inicio && hoje <= fim;
                    const isVencendo = item.status === 'ativo' && fim >= hoje && fim <= new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const isEncerrado = fim < hoje;
                    const ehOp = item._tipo === 'operacao';
                    const tipo = TIPO[ehOp ? 'operacao' : (item.tipo === 'incentivo' ? 'incentivo' : 'promocao')];
                    let status = null, detalhes = [], metricas = [], acoes = [], extra = null;
                    if (ehOp) {
                        const contador = calcularContadorRegressivo(item.data_inicio);
                        status = contador.status === 'hoje' ? pill("roxo", "Começa hoje")
                            : contador.status === 'amanha' ? pill("ambar", "Começa amanhã")
                            : contador.status === 'iniciado' ? pill("verde", "Iniciada")
                            : contador.dias > 0 ? pill("azul", "Faltam " + contador.dias + " dia(s)") : null;
                        const modelo = item.modalidade === 'hub' ? "Hub" : item.modalidade === 'hibrida' ? "Híbrida" : item.modalidade === 'clt' ? "CLT" : item.modalidade === 'dedicado' ? "Dedicado" : item.modelo === 'nuvem' ? "Nuvem" : item.modelo === 'dedicado' ? "Dedicado" : "Flash";
                        detalhes = [tipo[0], "início " + new Date(item.data_inicio?.split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR'), item.regiao, modelo].filter(Boolean);
                        extra = [item.endereco ? (item.endereco.substring(0, 50) + (item.endereco.length > 50 ? '...' : '')) : null, item.possui_garantido ? "Garantido" : null, item.obrigatoriedade_bau ? "Baú obrigatório" : null].filter(Boolean).join(" · ");
                        metricas = [metrica("Motos", item.quantidade_motos || 0), metrica("Faltam", contador.dias > 0 ? contador.dias + " dia(s)" : "—")];
                        acoes = [acaoBtn("Ver na aba Novas Operações", "eye", () => x({...p, opTab: 'novas-operacoes'}))];
                    } else {
                        const diasFim = Math.round((fim - hoje) / 86400000);
                        status = item.status === 'pausado' ? pill("cinza", "Pausada")
                            : isEncerrado ? pill("cinza", "Encerrada")
                            : isVencendo ? pill("ambar", diasFim === 0 ? "Vence hoje" : "Vence em " + diasFim + " dia" + (diasFim === 1 ? "" : "s"))
                            : isAtivo ? pill("verde", "Ativa")
                            : pill("roxo", "Começa " + fData(item.data_inicio));
                        const periodo = fData(item.data_inicio) + " a " + fData(item.data_fim) + (item.hora_inicio && item.hora_fim ? " · " + item.hora_inicio.slice(0, 5) + "–" + item.hora_fim.slice(0, 5) : "");
                        const clientes = (item.clientes_nomes || []).map(c => c.nome_display).join(', ');
                        detalhes = [tipo[0], periodo, clientes || null].filter(Boolean);
                        if (item.tipo === 'incentivo') {
                            metricas = [
                                metrica("Por OS", "R$ " + parseFloat(item.valor_incentivo || 0).toFixed(2).replace('.', ',')),
                                metrica("OS no período", item.calculo ? (Number(item.calculo.quantidade_os) || 0).toLocaleString('pt-BR') : "—"),
                                item.calculo ? metrica("Custo", brl(item.calculo.valor_total || 0), item.calculo.valor_total > 0 ? "#111827" : "#9ca3af") : metrica("Custo", h("span", { style: { fontSize: 12.5, fontWeight: 500 } }, "Aguardando BI"), "#9ca3af")
                            ];
                        } else {
                            metricas = [metrica("Valor/Benefício", item.valor || '-')];
                        }
                        acoes = [acaoBtn("Editar demanda", "pencil", () => abrirEdicao(item)), acaoBtn("Excluir demanda", "trash", () => deletarIncentivo(item.id), true)];
                    }
                    return h("article", { key: (ehOp ? 'op-' : 'inc-') + item.id, className: item.status === 'pausado' ? 'opacity-60' : '', style: { ...CARD, padding: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 20px" } },
                        h("div", { style: { flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 } },
                            h("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                                dot(tipo[1], 9),
                                h("b", { style: { fontSize: 14, fontWeight: 600, color: "#111827" } }, item.titulo),
                                status),
                            h("div", { style: { color: "#6b7280", fontSize: 12.5 } }, detalhes.join(" · ")),
                            extra ? h("div", { style: { color: "#9ca3af", fontSize: 12 } }, extra) : null),
                        h("div", { style: { display: "flex", gap: 22, textAlign: "right", alignItems: "center", flexWrap: "wrap" } }, metricas),
                        h("div", { style: { display: "flex", gap: 6 } }, acoes));
                };

                return h("div", { className: "max-w-7xl mx-auto p-6" },
                    h("div", { className: "space-y-4" },
                        // Cabeçalho
                        h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 } },
                            h("div", null,
                                h("h1", { style: { margin: 0, fontFamily: SORA, fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "#111827" } }, "Incentivos, promoções e novas operações"),
                                h("p", { style: { margin: "4px 0 0", color: "#6b7280", fontSize: 14 } }, nomeMes + " · gerencie demandas operacionais e acompanhe custos")),
                            h("button", { type: "button", onClick: abrirNova, className: "hover:bg-purple-800", style: { height: 40, padding: "0 16px", borderRadius: 10, border: 0, background: "#770fa8", color: "#ffffff", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" } }, ico("plus", 16), "Criar demanda")),
                        // Faixa de KPIs
                        h("section", { className: "grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]", style: { ...CARD, overflow: "hidden" } },
                            h("div", { className: "col-span-2 md:col-span-1", style: { padding: "16px 20px", borderRight: "1px solid #f3f4f6", minWidth: 0 } },
                                h("div", { style: { fontSize: 12, color: "#6b7280" } }, "Investido no mês"),
                                h("div", { style: { fontFamily: SORA, fontSize: 28, fontWeight: 700, color: "#111827", fontVariantNumeric: "tabular-nums", lineHeight: 1.3 } }, brl(totalInvestido)),
                                h("div", { style: { fontSize: 11.5, color: "#6b7280" } }, "incentivos + promoções" + (osNoMes ? " · " + osNoMes.toLocaleString('pt-BR') + " OS" : ""))),
                            kpi("Ativas agora", incentivosStats?.ativos || 0, "#166534", "de " + (incentivosStats?.total || 0) + " no total"),
                            kpi("Vencem em 7 dias", incentivosStats?.vencendo_em_breve || 0, "#92400e"),
                            kpi("Pausadas", incentivosStats?.pausados || 0),
                            kpi("Encerradas", incentivosStats?.encerrados || 0, "#6b7280", null, true)),
                        h("div", { style: { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" } },
                            // Calendário
                            h("section", { "aria-label": "Calendário", style: { ...CARD, flex: "1 1 320px", maxWidth: 420, padding: 16 } },
                                h("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } },
                                    navBtn("Mês anterior", "arrowleft", -1),
                                    h("b", { style: { flex: 1, textAlign: "center", fontSize: 14, color: "#111827" } }, nomeMes),
                                    navBtn("Próximo mês", "arrowright", 1)),
                                h("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, textAlign: "center", fontSize: 11, color: "#9ca3af", marginBottom: 4 } },
                                    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => h("span", { key: i }, d))),
                                h("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 } }, celulas),
                                h("div", { style: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14, fontSize: 11.5, color: "#6b7280" } },
                                    ['incentivo', 'promocao', 'operacao'].map(tp => h("span", { key: tp, style: { display: "inline-flex", alignItems: "center", gap: 5 } }, dot(TIPO[tp][1], 8), TIPO[tp][0])))),
                            // Lista de demandas
                            h("section", { style: { flex: "999 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 } },
                                h("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" } },
                                    filtroBtn("todas", "Todas"), filtroBtn("incentivo", "Incentivo"), filtroBtn("promocao", "Promoção"), filtroBtn("operacao", "Nova operação"),
                                    p.opIncDia && h("button", { type: "button", onClick: () => x({ ...p, opIncDia: null }), "aria-label": "Limpar filtro do dia", style: { height: 32, padding: "0 12px", borderRadius: 99, border: "1px solid #e9d5f9", background: "#faf7fd", color: "#5d0b85", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 } }, "Dia " + p.opIncDia.split("-").reverse().slice(0, 2).join("/"), ico("x", 12))),
                                visiveis.length === 0
                                    ? h("div", { style: { ...CARD, padding: 32, textAlign: "center" } },
                                        h("p", { style: { margin: 0, color: "#111827", fontWeight: 600 } }, todasDemandas.length === 0 ? "Nenhuma demanda cadastrada" : "Nenhuma demanda neste filtro"),
                                        h("p", { style: { margin: "4px 0 0", fontSize: 13, color: "#6b7280" } }, todasDemandas.length === 0 ? "Clique em \"Criar demanda\" para criar a primeira" : "Escolha outro tipo acima"))
                                    : visiveis.map(cardDemanda)))));
            })(),
            // Modal de criar/editar incentivo
            incentivoModal && React.createElement("div", {
                className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
                onClick: () => setIncentivoModal(false)
            },
                React.createElement("div", {
                    className: "bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto",
                    onClick: e => e.stopPropagation()
                },
                    // Header do modal
                    React.createElement("div", {className: "bg-white border-b border-gray-200 text-gray-900 p-6" /* OPER_CLEAN_V1 */},
                        React.createElement("h2", {className: "text-xl font-bold"}, incentivoEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })), "Editar Demanda") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Nova Demanda")),
                        React.createElement("p", {className: "text-gray-500 text-sm"}, "Configure os detalhes da demanda")
                    ),
                    
                    // Formulário
                    React.createElement("div", {className: "p-6 space-y-5"},
                        // Título
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Título *"),
                            React.createElement("input", {
                                type: "text",
                                value: incentivoForm.titulo,
                                onChange: e => setIncentivoForm(f => ({...f, titulo: e.target.value})),
                                placeholder: "Ex: Bônus de Produtividade - Dezembro",
                                className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                            })
                        ),
                        
                        // Tipo e Cor
                        React.createElement("div", {className: "grid grid-cols-2 gap-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Tipo"),
                                React.createElement("select", {
                                    value: incentivoForm.tipo,
                                    onChange: e => setIncentivoForm(f => ({...f, tipo: e.target.value})),
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                },
                                    React.createElement("option", {value: "promocao"}, "Promoção"),
                                    React.createElement("option", {value: "incentivo"}, "Incentivo")
                                )
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Cor no calendário"),
                                React.createElement("div", {className: "flex gap-2 flex-wrap"},
                                    ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#ca8a04', '#64748b'].map(cor =>
                                        React.createElement("button", {
                                            key: cor,
                                            type: "button",
                                            onClick: () => setIncentivoForm(f => ({...f, cor: cor})),
                                            className: "w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 " + (incentivoForm.cor === cor ? 'ring-2 ring-offset-2 ring-gray-400' : ''),
                                            style: { backgroundColor: cor }
                                        })
                                    )
                                )
                            )
                        ),
                        
                        // Período
                        React.createElement("div", {className: "grid grid-cols-2 gap-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Data Início *"),
                                React.createElement("input", {
                                    type: "date",
                                    value: incentivoForm.data_inicio,
                                    onChange: e => setIncentivoForm(f => ({...f, data_inicio: e.target.value})),
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Data Fim *"),
                                React.createElement("input", {
                                    type: "date",
                                    value: incentivoForm.data_fim,
                                    onChange: e => setIncentivoForm(f => ({...f, data_fim: e.target.value})),
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                })
                            )
                        ),
                        
                        // ========== CAMPOS ESPECÍFICOS PARA TIPO INCENTIVO ==========
                        incentivoForm.tipo === 'incentivo' && React.createElement("div", {className: "bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-4"},
                            React.createElement("div", {className: "flex items-center gap-2 text-yellow-800 font-semibold"},
                                React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-star" }))),
                                React.createElement("span", null, "Configurações do Incentivo")
                            ),
                            
                            // Horário Início e Fim
                            React.createElement("div", {className: "grid grid-cols-2 gap-4"},
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Horário Início *"),
                                    React.createElement("input", {
                                        type: "time",
                                        value: incentivoForm.hora_inicio || '',
                                        onChange: e => setIncentivoForm(f => ({...f, hora_inicio: e.target.value})),
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500"
                                    })
                                ),
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Horário Fim *"),
                                    React.createElement("input", {
                                        type: "time",
                                        value: incentivoForm.hora_fim || '',
                                        onChange: e => setIncentivoForm(f => ({...f, hora_fim: e.target.value})),
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500"
                                    })
                                )
                            ),
                            
                            // Valor do Incentivo (por OS)
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Valor do Incentivo (por OS) *"),
                                React.createElement("div", {className: "relative"},
                                    React.createElement("span", {className: "absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"}, "R$"),
                                    React.createElement("input", {
                                        type: "number",
                                        step: "0.01",
                                        min: "0",
                                        value: incentivoForm.valor_incentivo || '',
                                        onChange: e => setIncentivoForm(f => ({...f, valor_incentivo: e.target.value})),
                                        placeholder: "0,00",
                                        className: "w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500"
                                    })
                                ),
                                React.createElement("p", {className: "text-xs text-gray-500 mt-1"}, "Este valor será multiplicado pela quantidade de OS no período")
                            ),
                            
                            // Clientes Vinculados (Multi-select com busca)
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Clientes Vinculados *"),
                                
                                // Campo de busca
                                React.createElement("div", {className: "relative mb-2"},
                                    React.createElement("input", {
                                        type: "text",
                                        placeholder: "Buscar cliente por nome ou código...",
                                        className: "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 text-sm",
                                        onChange: e => {
                                            const busca = e.target.value.toLowerCase();
                                            const container = e.target.closest('.space-y-4').querySelector('[data-clientes-lista]');
                                            if (container) {
                                                container.querySelectorAll('[data-cliente-item]').forEach(item => {
                                                    const nome = item.getAttribute('data-nome').toLowerCase();
                                                    const cod = item.getAttribute('data-cod');
                                                    item.style.display = (nome.includes(busca) || cod.includes(busca)) ? '' : 'none';
                                                });
                                            }
                                        }
                                    })
                                ),
                                
                                // Clientes selecionados (badges + CC selector)
                                (incentivoForm.clientes_vinculados || []).length > 0 && React.createElement("div", {className: "space-y-2 mb-2"},
                                    (incentivoForm.clientes_vinculados || []).map(codCliente => {
                                        const cliente = (incentivoClientesBi || []).find(c => c.cod_cliente === codCliente);
                                        const ccs = ccCache[codCliente] || [];
                                        const ccSelecionado = (incentivoForm.centros_vinculados || {})[String(codCliente)] || '';
                                        return React.createElement("div", {
                                            key: codCliente,
                                            className: "flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2"
                                        },
                                            React.createElement("div", {className: "flex-1 min-w-0"},
                                                React.createElement("span", {className: "text-sm font-semibold text-yellow-800 truncate block"}, cliente?.nome_display || ("Cliente " + codCliente)),
                                                ccs.length > 0 && React.createElement("select", {
                                                    value: ccSelecionado,
                                                    onChange: e => setIncentivoForm(f => ({
                                                        ...f,
                                                        centros_vinculados: { ...(f.centros_vinculados || {}), [String(codCliente)]: e.target.value }
                                                    })),
                                                    className: "mt-1 w-full text-xs border rounded-md px-2 py-1 bg-white"
                                                },
                                                    React.createElement("option", {value: ""}, "Todos os centros de custo"),
                                                    ccs.map(cc => React.createElement("option", {key: cc.centro_custo, value: cc.centro_custo}, cc.centro_custo + " (" + cc.total_entregas + ")"))
                                                ),
                                                ccs.length === 0 && React.createElement("span", {className: "text-[10px] text-gray-400 block mt-1"}, "Sem centros de custo")
                                            ),
                                            React.createElement("button", {
                                                type: "button",
                                                onClick: () => setIncentivoForm(f => {
                                                    var cv = {...(f.centros_vinculados || {})};
                                                    delete cv[String(codCliente)];
                                                    return {...f, clientes_vinculados: (f.clientes_vinculados || []).filter(c => c !== codCliente), centros_vinculados: cv};
                                                }),
                                                className: "text-red-400 hover:text-red-600 font-bold text-lg px-1"
                                            }, "×")
                                        );
                                    })
                                ),
                                
                                incentivoClientesLoading 
                                    ? React.createElement("div", {className: "text-center py-4 text-gray-500"}, "Carregando clientes...")
                                    : React.createElement("div", {"data-clientes-lista": true, className: "border rounded-xl max-h-48 overflow-y-auto"},
                                        (incentivoClientesBi || []).length === 0 
                                            ? React.createElement("div", {className: "p-4 text-center text-gray-500"}, "Nenhum cliente encontrado no BI")
                                            : (incentivoClientesBi || []).map(cliente => {
                                                const isSelected = (incentivoForm.clientes_vinculados || []).includes(cliente.cod_cliente);
                                                return React.createElement("label", {
                                                    key: cliente.cod_cliente,
                                                    "data-cliente-item": true,
                                                    "data-nome": cliente.nome_display || '',
                                                    "data-cod": String(cliente.cod_cliente),
                                                    className: "flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 " + (isSelected ? 'bg-yellow-50' : '')
                                                },
                                                    React.createElement("input", {
                                                        type: "checkbox",
                                                        checked: isSelected,
                                                        onChange: e => {
                                                            if (e.target.checked) {
                                                                setIncentivoForm(f => ({...f, clientes_vinculados: [...(f.clientes_vinculados || []), cliente.cod_cliente]}));
                                                                fetchCentrosCusto(cliente.cod_cliente);
                                                            } else {
                                                                setIncentivoForm(f => ({...f, clientes_vinculados: (f.clientes_vinculados || []).filter(c => c !== cliente.cod_cliente)}));
                                                            }
                                                        },
                                                        className: "w-5 h-5 rounded text-yellow-600"
                                                    }),
                                                    React.createElement("div", {className: "flex-1"},
                                                        React.createElement("span", {className: "font-medium text-gray-800"}, cliente.nome_display),
                                                        cliente.mascara && React.createElement("span", {className: "ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded"}, "Máscara")
                                                    ),
                                                    React.createElement("span", {className: "text-xs text-gray-400"}, "Cód: ", cliente.cod_cliente)
                                                );
                                            })
                                    ),
                                (incentivoForm.clientes_vinculados || []).length > 0 && React.createElement("p", {className: "text-xs text-yellow-700 mt-2"}, 
                                    React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), (incentivoForm.clientes_vinculados || []).length, " cliente(s) selecionado(s)"
                                )
                            )
                        ),
                        
                        // ========== CAMPOS ESPECÍFICOS PARA TIPO PROMOÇÃO ==========
                        incentivoForm.tipo === 'promocao' && React.createElement("div", {className: "bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-4"},
                            React.createElement("div", {className: "flex items-center gap-2 text-purple-800 font-semibold"},
                                React.createElement("span", null, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-tag" }))),
                                React.createElement("span", null, "Configurações da Promoção")
                            ),
                            
                            // Valor/Benefício
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Valor/Benefício *"),
                                React.createElement("input", {
                                    type: "text",
                                    value: incentivoForm.valor,
                                    onChange: e => setIncentivoForm(f => ({...f, valor: e.target.value})),
                                    placeholder: "Ex: R$ 50,00 por entrega extra, 10% de bônus, etc.",
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-400"
                                })
                            ),
                            
                            // Clientes Vinculados (Multi-select com busca)
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Clientes Vinculados *"),
                                
                                // Campo de busca
                                React.createElement("div", {className: "relative mb-2"},
                                    React.createElement("input", {
                                        type: "text",
                                        placeholder: "Buscar cliente por nome ou código...",
                                        className: "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400 text-sm",
                                        onChange: e => {
                                            const busca = e.target.value.toLowerCase();
                                            const container = e.target.closest('.space-y-4').querySelector('[data-clientes-lista-promo]');
                                            if (container) {
                                                container.querySelectorAll('[data-cliente-item]').forEach(item => {
                                                    const nome = item.getAttribute('data-nome').toLowerCase();
                                                    const cod = item.getAttribute('data-cod');
                                                    item.style.display = (nome.includes(busca) || cod.includes(busca)) ? '' : 'none';
                                                });
                                            }
                                        }
                                    })
                                ),
                                
                                // Clientes selecionados (badges + CC selector)
                                (incentivoForm.clientes_vinculados || []).length > 0 && React.createElement("div", {className: "space-y-2 mb-2"},
                                    (incentivoForm.clientes_vinculados || []).map(codCliente => {
                                        const cliente = (incentivoClientesBi || []).find(c => c.cod_cliente === codCliente);
                                        const ccs = ccCache[codCliente] || [];
                                        const ccSelecionado = (incentivoForm.centros_vinculados || {})[String(codCliente)] || '';
                                        return React.createElement("div", {
                                            key: codCliente,
                                            className: "flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg p-2"
                                        },
                                            React.createElement("div", {className: "flex-1 min-w-0"},
                                                React.createElement("span", {className: "text-sm font-semibold text-purple-800 truncate block"}, cliente?.nome_display || ("Cliente " + codCliente)),
                                                ccs.length > 0 && React.createElement("select", {
                                                    value: ccSelecionado,
                                                    onChange: e => setIncentivoForm(f => ({
                                                        ...f,
                                                        centros_vinculados: { ...(f.centros_vinculados || {}), [String(codCliente)]: e.target.value }
                                                    })),
                                                    className: "mt-1 w-full text-xs border rounded-md px-2 py-1 bg-white"
                                                },
                                                    React.createElement("option", {value: ""}, "Todos os centros de custo"),
                                                    ccs.map(cc => React.createElement("option", {key: cc.centro_custo, value: cc.centro_custo}, cc.centro_custo + " (" + cc.total_entregas + ")"))
                                                ),
                                                ccs.length === 0 && React.createElement("span", {className: "text-[10px] text-gray-400 block mt-1"}, "Sem centros de custo")
                                            ),
                                            React.createElement("button", {
                                                type: "button",
                                                onClick: () => setIncentivoForm(f => {
                                                    var cv = {...(f.centros_vinculados || {})};
                                                    delete cv[String(codCliente)];
                                                    return {...f, clientes_vinculados: (f.clientes_vinculados || []).filter(c => c !== codCliente), centros_vinculados: cv};
                                                }),
                                                className: "text-red-400 hover:text-red-600 font-bold text-lg px-1"
                                            }, "×")
                                        );
                                    })
                                ),
                                
                                incentivoClientesLoading 
                                    ? React.createElement("div", {className: "text-center py-4 text-gray-500"}, "Carregando clientes...")
                                    : React.createElement("div", {"data-clientes-lista-promo": true, className: "border rounded-xl max-h-48 overflow-y-auto bg-white"},
                                        (incentivoClientesBi || []).length === 0 
                                            ? React.createElement("div", {className: "p-4 text-center text-gray-500"}, "Nenhum cliente encontrado no BI")
                                            : (incentivoClientesBi || []).map(cliente => {
                                                const isSelected = (incentivoForm.clientes_vinculados || []).includes(cliente.cod_cliente);
                                                return React.createElement("label", {
                                                    key: cliente.cod_cliente,
                                                    "data-cliente-item": true,
                                                    "data-nome": cliente.nome_display || '',
                                                    "data-cod": String(cliente.cod_cliente),
                                                    className: "flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 " + (isSelected ? 'bg-purple-50' : '')
                                                },
                                                    React.createElement("input", {
                                                        type: "checkbox",
                                                        checked: isSelected,
                                                        onChange: e => {
                                                            if (e.target.checked) {
                                                                setIncentivoForm(f => ({...f, clientes_vinculados: [...(f.clientes_vinculados || []), cliente.cod_cliente]}));
                                                                fetchCentrosCusto(cliente.cod_cliente);
                                                            } else {
                                                                setIncentivoForm(f => ({...f, clientes_vinculados: (f.clientes_vinculados || []).filter(c => c !== cliente.cod_cliente)}));
                                                            }
                                                        },
                                                        className: "w-5 h-5 rounded text-purple-700"
                                                    }),
                                                    React.createElement("div", {className: "flex-1"},
                                                        React.createElement("span", {className: "font-medium text-gray-800"}, cliente.nome_display),
                                                        cliente.mascara && React.createElement("span", {className: "ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded"}, "Máscara")
                                                    ),
                                                    React.createElement("span", {className: "text-xs text-gray-400"}, "Cód: ", cliente.cod_cliente)
                                                );
                                            })
                                    ),
                                (incentivoForm.clientes_vinculados || []).length > 0 && React.createElement("p", {className: "text-xs text-purple-700 mt-2"}, 
                                    React.createElement("svg", { className: "ico", style: { width: 16, height: 16, color: "#16a34a" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" })), (incentivoForm.clientes_vinculados || []).length, " cliente(s) selecionado(s)"
                                )
                            )
                        ),
                        
                        // Status (apenas para edição)
                        incentivoEdit && React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Status"),
                            React.createElement("div", {className: "flex gap-3"},
                                React.createElement("button", {
                                    type: "button",
                                    onClick: () => setIncentivoForm(f => ({...f, status: 'ativo'})),
                                    className: "flex-1 px-4 py-3 rounded-xl font-semibold transition-colors " +
                                        ((incentivoForm.status || incentivoEdit?.status) === 'ativo' 
                                            ? "bg-green-600 text-white" 
                                            : "bg-green-100 text-green-700 hover:bg-green-200")
                                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-circle" })), "Ativo")),
                                React.createElement("button", {
                                    type: "button",
                                    onClick: () => setIncentivoForm(f => ({...f, status: 'pausado'})),
                                    className: "flex-1 px-4 py-3 rounded-xl font-semibold transition-colors " +
                                        ((incentivoForm.status || incentivoEdit?.status) === 'pausado' 
                                            ? "bg-yellow-500 text-white" 
                                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200")
                                }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-power" })), "Pausado"))
                            )
                        )
                    ),
                    
                    // Footer do modal
                    React.createElement("div", {className: "p-4 bg-gray-50 border-t flex gap-3"},
                        React.createElement("button", {
                            type: "button",
                            onClick: () => setIncentivoModal(false),
                            className: "flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100"
                        }, "Cancelar"),
                        React.createElement("button", {
                            type: "button",
                            onClick: () => salvarIncentivo(),
                            disabled: !incentivoForm.titulo.trim() || !incentivoForm.data_inicio || !incentivoForm.data_fim || 
                                (incentivoForm.tipo === 'incentivo' && (!incentivoForm.hora_inicio || !incentivoForm.hora_fim || !incentivoForm.valor_incentivo || (incentivoForm.clientes_vinculados || []).length === 0)) ||
                                (incentivoForm.tipo === 'promocao' && (!incentivoForm.valor || (incentivoForm.clientes_vinculados || []).length === 0)),
                            className: "flex-1 px-6 py-3 bg-purple-700 text-white rounded-xl font-semibold hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        }, incentivoEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar Alterações") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Criar Demanda"))
                    )
                )
            ),
            // Modal de imagem ampliada
            relatorioImagemAmpliada && React.createElement("div", {
                className: "fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4",
                onClick: () => setRelatorioImagemAmpliada(null)
            },
                React.createElement("div", {className: "relative max-w-4xl max-h-[90vh]"},
                    React.createElement("button", {
                        onClick: () => setRelatorioImagemAmpliada(null),
                        className: "absolute -top-10 right-0 text-white text-3xl hover:text-gray-300"
                    }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" }))),
                    React.createElement("img", {
                        src: relatorioImagemAmpliada,
                        className: "max-w-full max-h-[85vh] rounded-lg shadow-2xl",
                        onClick: (e) => e.stopPropagation()
                    })
                )
            )
        );
    };

    window.ModuloOperacionalLoaded = true;
    console.log("✅ Módulo Operacional carregado!");

})();
