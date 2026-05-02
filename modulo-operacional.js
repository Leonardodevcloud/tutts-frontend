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
            // Regiões e Setores
            aa, setores,
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
                (p.opTab || "indicacoes") === "indicacoes" && React.createElement("div", {className: "bg-teal-50 border border-teal-200 rounded-xl p-8 text-center"},
                    React.createElement("span", {className: "text-5xl mb-4 block"}, "👥"),
                    React.createElement("h2", {className: "text-xl font-bold text-teal-800 mb-2"}, "Gestão de Indicações"),
                    React.createElement("p", {className: "text-teal-600 mb-4"}, "Para gerenciar indicações, acesse o módulo Financeiro na aba correspondente."),
                    React.createElement("button", {
                        onClick: () => { he("financeiro"); x({finTab: "indicacoes"}); },
                        className: "px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700"
                    }, "Ir para Indicações →")
                ),
                // Conteúdo Promo Novatos
                p.opTab === "promo-novatos" && React.createElement("div", {className: "bg-teal-50 border border-teal-200 rounded-xl p-8 text-center"},
                    React.createElement("span", {className: "text-5xl mb-4 block"}, "🚀"),
                    React.createElement("h2", {className: "text-xl font-bold text-teal-800 mb-2"}, "Promoção Novatos"),
                    React.createElement("p", {className: "text-teal-600 mb-4"}, "Para gerenciar promoções de novatos, acesse o módulo Financeiro na aba correspondente."),
                    React.createElement("button", {
                        onClick: () => { he("financeiro"); x({finTab: "promo-novatos"}); },
                        className: "px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700"
                    }, "Ir para Promo Novatos →")
                ),
                // Conteúdo Avisos
                p.opTab === "avisos" && React.createElement("div", {className: "space-y-6"},
                    // Header
                    React.createElement("div", {className: "flex justify-between items-center"},
                        React.createElement("div", null,
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, "📢 Gestão de Avisos"),
                            React.createElement("p", {className: "text-gray-600"}, "Crie avisos que aparecerão para os usuários por região")
                        ),
                        React.createElement("button", {
                            onClick: () => { setAvisoEdit(null); setAvisoForm({ titulo: '', regioes: [], todas_regioes: false, data_inicio: '', data_fim: '', recorrencia_tipo: 'uma_vez', recorrencia_intervalo: 24, imagem_url: '' }); setAvisoModal(true); },
                            className: "px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 flex items-center gap-2"
                        }, "➕ Novo Aviso")
                    ),
                    // Lista de avisos
                    React.createElement("div", {className: "grid gap-4"},
                        (!avisosData || avisosData.length === 0) ? React.createElement("div", {className: "bg-white rounded-xl p-8 text-center shadow"},
                            React.createElement("span", {className: "text-5xl block mb-4"}, "📭"),
                            React.createElement("p", {className: "text-gray-500"}, "Nenhum aviso cadastrado"),
                            React.createElement("p", {className: "text-sm text-gray-400"}, "Clique em \"Novo Aviso\" para criar o primeiro")
                        ) : (Array.isArray(avisosData) ? avisosData : []).map(aviso => React.createElement("div", {
                            key: aviso.id,
                            className: "bg-white rounded-xl shadow-lg overflow-hidden " + (aviso.ativo ? "border-l-4 border-teal-500" : "border-l-4 border-gray-300 opacity-60")
                        },
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "flex justify-between items-start"},
                                    React.createElement("div", {className: "flex-1"},
                                        React.createElement("div", {className: "flex items-center gap-3 mb-2"},
                                            React.createElement("h3", {className: "text-lg font-bold text-gray-800"}, aviso.titulo),
                                            React.createElement("span", {className: "px-2 py-0.5 rounded-full text-xs font-semibold " + (aviso.ativo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}, aviso.ativo ? "Ativo" : "Inativo")
                                        ),
                                        React.createElement("div", {className: "flex flex-wrap gap-2 mb-3"},
                                            aviso.todas_regioes ? React.createElement("span", {className: "px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"}, "🌎 Todas as Regiões") :
                                            aviso.regioes?.map((r, i) => React.createElement("span", {key: i, className: "px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"}, "📍 ", r))
                                        ),
                                        React.createElement("div", {className: "flex flex-wrap gap-4 text-sm text-gray-600"},
                                            React.createElement("span", null, "📅 ", new Date(aviso.data_inicio?.slice(0,10) + "T12:00:00").toLocaleDateString("pt-BR"), " - ", new Date(aviso.data_fim?.slice(0,10) + "T12:00:00").toLocaleDateString("pt-BR")),
                                            React.createElement("span", null, "🔄 ", aviso.recorrencia_tipo === "uma_vez" ? "Uma vez" : aviso.recorrencia_tipo === "diario" ? "Diário" : `A cada ${aviso.recorrencia_intervalo}h`),
                                            React.createElement("span", null, "👁️ ", aviso.total_visualizacoes || 0, " visualizações")
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
                                    }, "✏️ Editar"),
                                    React.createElement("button", {
                                        onClick: async () => { await fetchAuth(`${API_URL}/avisos-op/${aviso.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...aviso, ativo: !aviso.ativo})}); carregarAvisos(); },
                                        className: "px-4 py-2 rounded-lg font-semibold " + (aviso.ativo ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" : "bg-green-100 text-green-700 hover:bg-green-200")
                                    }, aviso.ativo ? "⏸️ Desativar" : "▶️ Ativar"),
                                    React.createElement("button", {
                                        onClick: () => deletarAviso(aviso.id),
                                        className: "px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200"
                                    }, "🗑️ Excluir")
                                )
                            )
                        ))
                    )
                )
            ),
            // Modal de criar/editar aviso
            avisoModal && React.createElement("div", {className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"},
                React.createElement("div", {className: "bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto"},
                    React.createElement("div", {className: "bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white"},
                        React.createElement("h2", {className: "text-xl font-bold"}, avisoEdit ? "✏️ Editar Aviso" : "➕ Novo Aviso"),
                        React.createElement("p", {className: "text-teal-100 text-sm"}, "Configure o aviso que será exibido aos usuários")
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
                                className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
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
                                    className: "w-5 h-5 rounded text-teal-600"
                                }),
                                React.createElement("span", {className: "text-gray-700"}, "🌎 Todas as regiões")
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
                                        className: "w-4 h-4 rounded text-teal-600"
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
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Data/Hora Fim *"),
                                React.createElement("input", {
                                    type: "datetime-local",
                                    value: avisoForm.data_fim,
                                    onChange: e => setAvisoForm(f => ({...f, data_fim: e.target.value})),
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                })
                            )
                        ),
                        // Recorrência
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Recorrência"),
                            React.createElement("select", {
                                value: avisoForm.recorrencia_tipo,
                                onChange: e => setAvisoForm(f => ({...f, recorrencia_tipo: e.target.value})),
                                className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
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
                                    }, "🗑️ Remover imagem")
                                ) : React.createElement("div", null,
                                    React.createElement("span", {className: "text-4xl block mb-2"}, "📷"),
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
                                        className: "px-4 py-2 bg-teal-100 text-teal-700 rounded-lg cursor-pointer hover:bg-teal-200"
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
                            className: "flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        }, avisoEdit ? "💾 Salvar Alterações" : "➕ Criar Aviso")
                    )
                )
            ),
            // ==================== CONTEÚDO NOVAS OPERAÇÕES ====================
            p.opTab === "novas-operacoes" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-6"},
                    // Header
                    React.createElement("div", {className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4"},
                        React.createElement("div", null,
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, "🏢 Novas Operações"),
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
                                quantidade_motos: 1,
                                obrigatoriedade_bau: false,
                                possui_garantido: false,
                                valor_garantido: '',
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
                        className: "px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 flex items-center gap-2 shadow-lg"
                    }, "➕ Nova Operação")
                ),
                
                // Cards de estatísticas
                React.createElement("div", {className: "grid grid-cols-2 md:grid-cols-4 gap-4"},
                    React.createElement("div", {className: "bg-white rounded-xl p-4 shadow border-l-4 border-teal-500"},
                        React.createElement("p", {className: "text-sm text-gray-500"}, "Total"),
                        React.createElement("p", {className: "text-2xl font-bold text-teal-600"}, operacoesData?.length || 0)
                    ),
                    React.createElement("div", {className: "bg-white rounded-xl p-4 shadow border-l-4 border-orange-500"},
                        React.createElement("p", {className: "text-sm text-gray-500"}, "Em Execução"),
                        React.createElement("p", {className: "text-2xl font-bold text-orange-600"}, operacoesData?.filter(o => o.status !== 'concluido').length || 0)
                    ),
                    React.createElement("div", {className: "bg-white rounded-xl p-4 shadow border-l-4 border-green-500"},
                        React.createElement("p", {className: "text-sm text-gray-500"}, "Concluídas"),
                        React.createElement("p", {className: "text-2xl font-bold text-green-600"}, operacoesData?.filter(o => o.status === 'concluido').length || 0)
                    ),
                    React.createElement("div", {className: "bg-white rounded-xl p-4 shadow border-l-4 border-blue-500"},
                        React.createElement("p", {className: "text-sm text-gray-500"}, "Motos Totais"),
                        React.createElement("p", {className: "text-2xl font-bold text-blue-600"}, operacoesData?.reduce((acc, o) => acc + (o.quantidade_motos || 0), 0) || 0)
                    )
                ),
                
                // Sub-abas: Em Execução / Concluídas
                React.createElement("div", {className: "bg-white rounded-xl shadow overflow-hidden"},
                    // Tabs
                    React.createElement("div", {className: "flex border-b"},
                        React.createElement("button", {
                            onClick: () => setOperacaoSubTab('execucao'),
                            className: "flex-1 px-6 py-4 text-center font-semibold transition-all " + 
                                (operacaoSubTab === 'execucao' ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' : 'text-gray-500 hover:bg-gray-50')
                        }, "🚀 Em Execução (", operacoesData?.filter(o => o.status !== 'concluido').length || 0, ")"),
                        React.createElement("button", {
                            onClick: () => setOperacaoSubTab('concluidas'),
                            className: "flex-1 px-6 py-4 text-center font-semibold transition-all " + 
                                (operacaoSubTab === 'concluidas' ? 'bg-green-50 text-green-700 border-b-2 border-green-500' : 'text-gray-500 hover:bg-gray-50')
                        }, "✅ Concluídas (", operacoesData?.filter(o => o.status === 'concluido').length || 0, ")")
                    ),
                    
                    // Lista de operações filtrada
                    (function() {
                        const operacoesFiltradas = operacaoSubTab === 'execucao' 
                            ? operacoesData?.filter(o => o.status !== 'concluido') || []
                            : operacoesData?.filter(o => o.status === 'concluido') || [];
                        
                        if (operacoesFiltradas.length === 0) {
                            return React.createElement("div", {className: "p-12 text-center"},
                                React.createElement("span", {className: "text-6xl block mb-4"}, operacaoSubTab === 'execucao' ? "📭" : "🎉"),
                                React.createElement("p", {className: "text-gray-500 text-lg"}, 
                                    operacaoSubTab === 'execucao' ? "Nenhuma operação em execução" : "Nenhuma operação concluída ainda"
                                ),
                                React.createElement("p", {className: "text-gray-400 text-sm"}, 
                                    operacaoSubTab === 'execucao' ? "Clique em \"Nova Operação\" para começar" : "As operações concluídas aparecerão aqui"
                                )
                            );
                        }
                        
                        return React.createElement("div", {className: "divide-y"},
                            operacoesFiltradas.map(op => {
                                const contador = calcularContadorRegressivo(op.data_inicio);
                                const checklist = checklistMotos[op.id] || {};
                                const motosEncontradas = Object.values(checklist).filter(v => v).length;
                                const todasMotosEncontradas = motosEncontradas === op.quantidade_motos;
                                
                                return React.createElement("div", {
                                    key: op.id,
                                    className: "p-6 hover:bg-gray-50 transition-colors"
                                },
                                    React.createElement("div", {className: "flex flex-col lg:flex-row lg:items-start justify-between gap-4"},
                                        // Info principal
                                        React.createElement("div", {className: "flex-1"},
                                            // Nome e badges
                                            React.createElement("div", {className: "flex flex-wrap items-center gap-3 mb-2"},
                                                React.createElement("h4", {className: "text-lg font-bold text-gray-800"}, op.nome_cliente),
                                                React.createElement("span", {
                                                    className: "px-2 py-0.5 rounded-full text-xs font-semibold " + 
                                                    (op.modelo === 'nuvem' ? 'bg-blue-100 text-blue-700' : 
                                                     op.modelo === 'dedicado' ? 'bg-purple-100 text-purple-700' : 
                                                     'bg-yellow-100 text-yellow-700')
                                                }, op.modelo === 'nuvem' ? '☁️ Nuvem' : op.modelo === 'dedicado' ? '🎯 Dedicado' : '⚡ Flash'),
                                                React.createElement("span", {
                                                    className: "px-2 py-0.5 rounded-full text-xs font-semibold " + 
                                                    (op.status === 'ativo' ? 'bg-green-100 text-green-700' : 
                                                     op.status === 'concluido' ? 'bg-blue-100 text-blue-700' :
                                                     op.status === 'pausado' ? 'bg-yellow-100 text-yellow-700' : 
                                                     'bg-gray-100 text-gray-600')
                                                }, op.status === 'ativo' ? '✅ Ativo' : op.status === 'concluido' ? '✔️ Concluído' : op.status === 'pausado' ? '⏸️ Pausado' : '❌ ' + op.status)
                                            ),
                                            // Informações
                                            React.createElement("div", {className: "flex flex-wrap gap-4 text-sm text-gray-600"},
                                                React.createElement("span", null, "📍 ", op.regiao),
                                                React.createElement("span", null, "📌 ", op.endereco?.substring(0, 40), op.endereco?.length > 40 ? '...' : ''),
                                                React.createElement("span", null, "🏍️ ", op.quantidade_motos, " moto(s)"),
                                                op.obrigatoriedade_bau && React.createElement("span", {className: "text-orange-600"}, "📦 Baú obrigatório"),
                                                op.possui_garantido && React.createElement("span", {className: "text-green-600"}, "💰 Garantido: R$ ", parseFloat(op.valor_garantido || 0).toFixed(2))
                                            ),
                                            // DATA DE INÍCIO DESTACADA COM CONTADOR
                                            React.createElement("div", {
                                                className: "mt-3 inline-flex items-center gap-3 px-4 py-2 rounded-lg " +
                                                (contador.status === 'hoje' ? 'bg-green-100 border-2 border-green-400' :
                                                 contador.status === 'amanha' ? 'bg-yellow-100 border-2 border-yellow-400' :
                                                 contador.status === 'proximo' ? 'bg-orange-100 border-2 border-orange-300' :
                                                 contador.status === 'iniciado' ? 'bg-blue-100 border-2 border-blue-300' :
                                                 'bg-gray-100 border border-gray-300')
                                            },
                                                React.createElement("span", {className: "text-lg"}, "📅"),
                                                React.createElement("div", null,
                                                    React.createElement("p", {className: "text-xs text-gray-500 font-medium"}, "Data de Início"),
                                                    React.createElement("p", {className: "font-bold text-gray-800"}, 
                                                        new Date(op.data_inicio?.split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                                                    )
                                                ),
                                                React.createElement("span", {
                                                    className: "px-3 py-1 rounded-full text-sm font-bold " +
                                                    (contador.status === 'hoje' ? 'bg-green-500 text-white' :
                                                     contador.status === 'amanha' ? 'bg-yellow-500 text-white' :
                                                     contador.status === 'proximo' ? 'bg-orange-500 text-white' :
                                                     contador.status === 'iniciado' ? 'bg-blue-500 text-white' :
                                                     'bg-gray-500 text-white')
                                                }, contador.texto)
                                            ),
                                            // Criado por
                                            React.createElement("p", {className: "text-xs text-gray-400 mt-2"}, 
                                                "Criado por: ", op.criado_por || '-'
                                            )
                                        ),
                                        // Ações
                                        React.createElement("div", {className: "flex flex-wrap gap-2"},
                                            React.createElement("button", {
                                                onClick: () => gerarRelatorioOperacao(op),
                                                className: "px-4 py-2 bg-teal-100 text-teal-700 rounded-lg font-semibold hover:bg-teal-200 text-sm"
                                            }, "📄 Word"),
                                            React.createElement("button", {
                                                onClick: () => {
                                                    setOperacaoEdit(op);
                                                    setOperacaoForm({
                                                        regiao: op.regiao || '',
                                                        nome_cliente: op.nome_cliente || '',
                                                        endereco: op.endereco || '',
                                                        modelo: op.modelo || 'nuvem',
                                                        quantidade_motos: op.quantidade_motos || 1,
                                                        obrigatoriedade_bau: op.obrigatoriedade_bau || false,
                                                        possui_garantido: op.possui_garantido || false,
                                                        valor_garantido: op.valor_garantido || '',
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
                                                className: "px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 text-sm"
                                            }, "✏️ Editar"),
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
                                                    ja(novoStatus === 'ativo' ? '✅ Operação ativada!' : '⏸️ Operação pausada!', 'success');
                                                },
                                                className: "px-4 py-2 rounded-lg font-semibold text-sm " + 
                                                    (op.status === 'ativo' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200')
                                            }, op.status === 'ativo' ? '⏸️' : '▶️'),
                                            React.createElement("button", {
                                                onClick: async () => {
                                                    if (confirm(`Excluir operação "${op.nome_cliente}"?`)) {
                                                        await fetchAuth(`${API_URL}/operacoes/${op.id}`, { method: 'DELETE' });
                                                        carregarOperacoes();
                                                        if (notificarOperacaoSalva) notificarOperacaoSalva();
                                                        ja('🗑️ Operação excluída!', 'success');
                                                    }
                                                },
                                                className: "px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 text-sm"
                                            }, "🗑️")
                                        )
                                    ),
                                    
                                    // OBSERVAÇÕES (sempre visível se existir)
                                    op.observacoes && React.createElement("div", {className: "mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"},
                                        React.createElement("p", {className: "text-sm font-semibold text-yellow-800 mb-1"}, "📝 Observações:"),
                                        React.createElement("p", {className: "text-sm text-yellow-900"}, op.observacoes)
                                    ),
                                    
                                    // Faixas de KM
                                    op.faixas_km && op.faixas_km.filter(f => f.valor_motoboy > 0).length > 0 && React.createElement("div", {className: "mt-4 pt-4 border-t"},
                                        React.createElement("p", {className: "text-sm font-semibold text-gray-700 mb-2"}, "💰 Valores por Faixa de KM:"),
                                        React.createElement("div", {className: "flex flex-wrap gap-2"},
                                            op.faixas_km.filter(f => f.valor_motoboy > 0).map((faixa, idx) => 
                                                React.createElement("span", {
                                                    key: idx,
                                                    className: "px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-sm"
                                                }, faixa.km_inicio, "-", faixa.km_fim, "km: R$ ", parseFloat(faixa.valor_motoboy).toFixed(2))
                                            )
                                        )
                                    ),
                                    
                                    // Checklist de Motos (só para não concluídas)
                                    op.status !== 'concluido' && React.createElement("div", {className: "mt-4 pt-4 border-t"},
                                        React.createElement("div", {className: "flex items-center justify-between mb-3"},
                                            React.createElement("p", {className: "text-sm font-semibold text-gray-700 flex items-center gap-2"}, 
                                                "🏍️ Checklist de Motos",
                                                React.createElement("span", {
                                                    className: "px-2 py-0.5 rounded-full text-xs font-semibold " +
                                                    (todasMotosEncontradas ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')
                                                }, motosEncontradas, "/", op.quantidade_motos)
                                            ),
                                            todasMotosEncontradas && React.createElement("span", {className: "text-green-600 text-sm font-semibold"}, "✅ Completo!")
                                        ),
                                        React.createElement("div", {className: "flex flex-wrap gap-2"},
                                            Array.from({length: op.quantidade_motos}, (_, i) => 
                                                React.createElement("label", {
                                                    key: i,
                                                    className: "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm " +
                                                    (checklist[i] ? 'bg-green-100 border border-green-400' : 'bg-gray-100 border border-gray-300 hover:border-gray-400')
                                                },
                                                    React.createElement("input", {
                                                        type: "checkbox",
                                                        checked: checklist[i] || false,
                                                        onChange: (e) => {
                                                            setChecklistMotos(prev => ({
                                                                ...prev,
                                                                [op.id]: {
                                                                    ...prev[op.id],
                                                                    [i]: e.target.checked
                                                                }
                                                            }));
                                                        },
                                                        className: "w-4 h-4 rounded text-green-600"
                                                    }),
                                                    React.createElement("span", {className: checklist[i] ? 'text-green-700 font-semibold' : 'text-gray-600'}, "Moto ", i + 1)
                                                )
                                            )
                                        )
                                    ),
                                    
                                    // Botão Demanda Concluída (só para não concluídas)
                                    op.status !== 'concluido' && React.createElement("div", {className: "mt-4 pt-4 border-t flex justify-end"},
                                        React.createElement("button", {
                                            onClick: async () => {
                                                if (!todasMotosEncontradas) {
                                                    if (!confirm(`⚠️ Apenas ${motosEncontradas} de ${op.quantidade_motos} motos foram confirmadas.\n\nDeseja concluir mesmo assim?`)) {
                                                        return;
                                                    }
                                                }
                                                if (confirm(`✅ Confirmar conclusão da demanda "${op.nome_cliente}"?`)) {
                                                    await fetchAuth(`${API_URL}/operacoes/${op.id}`, {
                                                        method: 'PUT',
                                                        headers: {'Content-Type': 'application/json'},
                                                        body: JSON.stringify({ status: 'concluido' })
                                                    });
                                                    carregarOperacoes();
                                                    if (notificarOperacaoSalva) notificarOperacaoSalva();
                                                    ja('🎉 Demanda concluída com sucesso!', 'success');
                                                }
                                            },
                                            className: "px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 shadow flex items-center gap-2"
                                        }, "✅ Demanda Concluída")
                                    )
                                );
                            })
                        );
                    })()
                )
                )
            ),
            // ==================== MODAL NOVA OPERAÇÃO ====================
            operacaoModal && React.createElement("div", {className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"},
                React.createElement("div", {className: "bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto"},
                    // Header do Modal
                    React.createElement("div", {className: "bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white sticky top-0 z-10"},
                        React.createElement("div", {className: "flex justify-between items-center"},
                            React.createElement("div", null,
                                React.createElement("h2", {className: "text-xl font-bold"}, operacaoEdit ? "✏️ Editar Operação" : "➕ Nova Operação"),
                                React.createElement("p", {className: "text-teal-100 text-sm"}, "Preencha os dados da operação")
                            ),
                            React.createElement("button", {
                                onClick: () => setOperacaoModal(false),
                                className: "text-white/80 hover:text-white text-2xl"
                            }, "✕")
                        )
                    ),
                    // Conteúdo do Modal
                    React.createElement("div", {className: "p-6 space-y-6"},
                        // Seção: Dados Básicos
                        React.createElement("div", {className: "bg-gray-50 rounded-xl p-4"},
                            React.createElement("h3", {className: "font-semibold text-gray-800 mb-4 flex items-center gap-2"}, "📋 Dados Básicos"),
                            React.createElement("div", {className: "grid md:grid-cols-2 gap-4"},
                                // Região
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Região *"),
                                    React.createElement("input", {
                                        type: "text",
                                        value: operacaoForm.regiao,
                                        onChange: e => setOperacaoForm(f => ({...f, regiao: e.target.value})),
                                        placeholder: "Ex: Brasília, Goiânia, São Paulo...",
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    })
                                ),
                                // Nome do Cliente
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Nome do Cliente *"),
                                    React.createElement("input", {
                                        type: "text",
                                        value: operacaoForm.nome_cliente,
                                        onChange: e => setOperacaoForm(f => ({...f, nome_cliente: e.target.value})),
                                        placeholder: "Nome da empresa/loja",
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    })
                                ),
                                // Endereço (colspan 2)
                                React.createElement("div", {className: "md:col-span-2"},
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Endereço *"),
                                    React.createElement("input", {
                                        type: "text",
                                        value: operacaoForm.endereco,
                                        onChange: e => setOperacaoForm(f => ({...f, endereco: e.target.value})),
                                        placeholder: "Endereço completo da operação",
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    })
                                )
                            )
                        ),
                        
                        // Seção: Configurações
                        React.createElement("div", {className: "bg-gray-50 rounded-xl p-4"},
                            React.createElement("h3", {className: "font-semibold text-gray-800 mb-4 flex items-center gap-2"}, "⚙️ Configurações"),
                            React.createElement("div", {className: "grid md:grid-cols-3 gap-4"},
                                // Modelo
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Modelo *"),
                                    React.createElement("select", {
                                        value: operacaoForm.modelo,
                                        onChange: e => setOperacaoForm(f => ({...f, modelo: e.target.value})),
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                                    },
                                        React.createElement("option", {value: "nuvem"}, "☁️ Nuvem"),
                                        React.createElement("option", {value: "dedicado"}, "🎯 Dedicado"),
                                        React.createElement("option", {value: "flash"}, "⚡ Flash")
                                    )
                                ),
                                // Quantidade de Motos
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Quantidade de Motos *"),
                                    React.createElement("input", {
                                        type: "number",
                                        min: "1",
                                        value: operacaoForm.quantidade_motos,
                                        onChange: e => setOperacaoForm(f => ({...f, quantidade_motos: parseInt(e.target.value) || 1})),
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                    })
                                ),
                                // Data de Início
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Data de Início *"),
                                    React.createElement("input", {
                                        type: "date",
                                        value: operacaoForm.data_inicio,
                                        onChange: e => setOperacaoForm(f => ({...f, data_inicio: e.target.value})),
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                    })
                                )
                            ),
                            // Checkboxes
                            React.createElement("div", {className: "grid md:grid-cols-2 gap-4 mt-4"},
                                // Obrigatoriedade de Baú
                                React.createElement("label", {className: "flex items-center gap-3 p-4 bg-white rounded-xl border cursor-pointer hover:bg-gray-50"},
                                    React.createElement("input", {
                                        type: "checkbox",
                                        checked: operacaoForm.obrigatoriedade_bau,
                                        onChange: e => setOperacaoForm(f => ({...f, obrigatoriedade_bau: e.target.checked})),
                                        className: "w-5 h-5 rounded text-teal-600"
                                    }),
                                    React.createElement("div", null,
                                        React.createElement("span", {className: "font-semibold text-gray-700"}, "📦 Obrigatoriedade de Baú"),
                                        React.createElement("p", {className: "text-sm text-gray-500"}, "Motoboy precisa ter baú?")
                                    )
                                ),
                                // Garantido
                                React.createElement("label", {className: "flex items-center gap-3 p-4 bg-white rounded-xl border cursor-pointer hover:bg-gray-50"},
                                    React.createElement("input", {
                                        type: "checkbox",
                                        checked: operacaoForm.possui_garantido,
                                        onChange: e => setOperacaoForm(f => ({...f, possui_garantido: e.target.checked, valor_garantido: e.target.checked ? operacaoForm.valor_garantido : ''})),
                                        className: "w-5 h-5 rounded text-teal-600"
                                    }),
                                    React.createElement("div", null,
                                        React.createElement("span", {className: "font-semibold text-gray-700"}, "💰 Possui Garantido"),
                                        React.createElement("p", {className: "text-sm text-gray-500"}, "Loja paga garantido?")
                                    )
                                )
                            ),
                            // Campo de Valor Garantido (aparece se possui_garantido)
                            operacaoForm.possui_garantido && React.createElement("div", {className: "mt-4"},
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "💰 Valor do Garantido (R$)"),
                                React.createElement("input", {
                                    type: "number",
                                    step: "0.01",
                                    min: "0",
                                    value: operacaoForm.valor_garantido,
                                    onChange: e => setOperacaoForm(f => ({...f, valor_garantido: e.target.value})),
                                    placeholder: "0.00",
                                    className: "w-full md:w-1/3 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                })
                            )
                        ),
                        
                        // Seção: Faixas de KM
                        React.createElement("div", {className: "bg-gray-50 rounded-xl p-4"},
                            React.createElement("h3", {className: "font-semibold text-gray-800 mb-4 flex items-center gap-2"}, "💰 Valores Pagos aos Motoboys por Faixa de KM"),
                            React.createElement("p", {className: "text-sm text-gray-500 mb-4"}, "Preencha os valores de cada faixa de quilometragem"),
                            React.createElement("div", {className: "grid grid-cols-2 md:grid-cols-5 gap-3"},
                                operacaoForm.faixas_km.map((faixa, idx) => 
                                    React.createElement("div", {key: idx, className: "bg-white p-3 rounded-xl border"},
                                        React.createElement("p", {className: "text-xs font-semibold text-gray-600 mb-2 text-center"}, 
                                            faixa.km_inicio, " km à ", faixa.km_fim, " km"
                                        ),
                                        React.createElement("div", {className: "relative"},
                                            React.createElement("span", {className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"}, "R$"),
                                            React.createElement("input", {
                                                type: "number",
                                                step: "0.01",
                                                min: "0",
                                                value: faixa.valor_motoboy || '',
                                                onChange: e => {
                                                    const novasFaixas = [...operacaoForm.faixas_km];
                                                    novasFaixas[idx].valor_motoboy = e.target.value;
                                                    setOperacaoForm(f => ({...f, faixas_km: novasFaixas}));
                                                },
                                                placeholder: "0.00",
                                                className: "w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 text-center"
                                            })
                                        )
                                    )
                                )
                            )
                        ),
                        
                        // Seção: Observações
                        React.createElement("div", {className: "bg-gray-50 rounded-xl p-4"},
                            React.createElement("h3", {className: "font-semibold text-gray-800 mb-4 flex items-center gap-2"}, "📝 Observações"),
                            React.createElement("textarea", {
                                value: operacaoForm.observacoes,
                                onChange: e => setOperacaoForm(f => ({...f, observacoes: e.target.value})),
                                placeholder: "Informações adicionais sobre a operação...",
                                rows: 3,
                                className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                            })
                        ),
                        
                        // Botões
                        React.createElement("div", {className: "flex gap-3 pt-4"},
                            React.createElement("button", {
                                onClick: () => setOperacaoModal(false),
                                className: "flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
                            }, "Cancelar"),
                            React.createElement("button", {
                                onClick: async () => {
                                    // Validações
                                    if (!operacaoForm.regiao || !operacaoForm.nome_cliente || !operacaoForm.endereco || !operacaoForm.data_inicio) {
                                        ja('❌ Preencha todos os campos obrigatórios!', 'error');
                                        return;
                                    }
                                    
                                    s(true);
                                    try {
                                        const url = operacaoEdit 
                                            ? `${API_URL}/operacoes/${operacaoEdit.id}`
                                            : `${API_URL}/operacoes`;
                                        
                                        const response = await fetchAuth(url, {
                                            method: operacaoEdit ? 'PUT' : 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                ...operacaoForm,
                                                criado_por: l.fullName
                                            })
                                        });
                                        
                                        if (response.ok) {
                                            ja(operacaoEdit ? '✅ Operação atualizada!' : '✅ Operação criada!', 'success');
                                            setOperacaoModal(false);
                                            carregarOperacoes();
                                            if (notificarOperacaoSalva) notificarOperacaoSalva(); // Notificar calendário de incentivos
                                        } else {
                                            throw new Error('Erro ao salvar');
                                        }
                                    } catch (error) {
                                        ja('❌ Erro ao salvar operação', 'error');
                                    }
                                    s(false);
                                },
                                className: "flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700"
                            }, operacaoEdit ? "💾 Salvar Alterações" : "➕ Criar Operação")
                        )
                    )
                )
            ),
            // ==================== CONTEÚDO RECRUTAMENTO ====================
            p.opTab === "recrutamento" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-6"},
                    // Header
                    React.createElement("div", {className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4"},
                        React.createElement("div", null,
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, "🏍️ Recrutamento de Motos"),
                            React.createElement("p", {className: "text-gray-600"}, "Gerencie as necessidades de recrutamento de motoboys")
                        ),
                        React.createElement("div", {className: "flex gap-3"},
                            React.createElement("button", {
                                onClick: carregarRecrutamento,
                                disabled: recrutamentoLoading,
                                className: "px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 disabled:opacity-50"
                            }, "🔄"),
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
                                className: "px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 flex items-center gap-2 shadow-lg"
                            }, "➕ Nova Necessidade")
                        )
                    ),
                    
                    // Card de Progresso Geral
                    recrutamentoStats && React.createElement("div", {className: "bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white"},
                        React.createElement("div", {className: "flex items-center justify-between mb-4"},
                            React.createElement("h3", {className: "text-xl font-bold"}, "📊 Progresso Geral de Recrutamento"),
                            React.createElement("span", {className: "text-4xl"}, "🎯")
                        ),
                        React.createElement("div", {className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-4"},
                            React.createElement("div", {className: "text-center"},
                                React.createElement("p", {className: "text-3xl font-bold"}, recrutamentoStats.total_necessidades || 0),
                                React.createElement("p", {className: "text-sm opacity-80"}, "Total Demandas")
                            ),
                            React.createElement("div", {className: "text-center"},
                                React.createElement("p", {className: "text-3xl font-bold text-yellow-300"}, recrutamentoStats.em_andamento || 0),
                                React.createElement("p", {className: "text-sm opacity-80"}, "Em Andamento")
                            ),
                            React.createElement("div", {className: "text-center"},
                                React.createElement("p", {className: "text-3xl font-bold text-green-300"}, recrutamentoStats.concluidas || 0),
                                React.createElement("p", {className: "text-sm opacity-80"}, "Concluídas")
                            ),
                            React.createElement("div", {className: "text-center"},
                                React.createElement("p", {className: "text-3xl font-bold"}, 
                                    (parseInt(recrutamentoStats.total_motos_atribuidas) || 0), " / ", (parseInt(recrutamentoStats.total_motos_necessarias) || 0)
                                ),
                                React.createElement("p", {className: "text-sm opacity-80"}, "Motos Atribuídas")
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
                            React.createElement("div", {className: "w-full h-4 bg-white/30 rounded-full overflow-hidden"},
                                React.createElement("div", {
                                    className: "h-full bg-white rounded-full transition-all duration-500",
                                    style: { width: `${Math.min(100, Math.round(((parseInt(recrutamentoStats.total_motos_atribuidas) || 0) / Math.max(1, parseInt(recrutamentoStats.total_motos_necessarias) || 1)) * 100))}%` }
                                })
                            )
                        )
                    ),
                    
                    // Sub-abas
                    React.createElement("div", {className: "bg-white rounded-xl shadow overflow-hidden"},
                        React.createElement("div", {className: "flex border-b"},
                            React.createElement("button", {
                                onClick: () => setRecrutamentoSubTab('em_andamento'),
                                className: "flex-1 px-4 py-3 text-sm font-semibold " + 
                                    (recrutamentoSubTab === 'em_andamento' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-600 hover:bg-gray-50')
                            }, "🚀 Em Andamento (", recrutamentoData.filter(r => r.status === 'em_andamento').length, ")"),
                            React.createElement("button", {
                                onClick: () => setRecrutamentoSubTab('concluido'),
                                className: "flex-1 px-4 py-3 text-sm font-semibold " + 
                                    (recrutamentoSubTab === 'concluido' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-600 hover:bg-gray-50')
                            }, "✅ Concluídas (", recrutamentoData.filter(r => r.status === 'concluido').length, ")"),
                            React.createElement("button", {
                                onClick: () => setRecrutamentoSubTab('todos'),
                                className: "flex-1 px-4 py-3 text-sm font-semibold " + 
                                    (recrutamentoSubTab === 'todos' ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' : 'text-gray-600 hover:bg-gray-50')
                            }, "📋 Todas (", recrutamentoData.length, ")")
                        )
                    ),
                    
                    // Loading
                    recrutamentoLoading && React.createElement("div", {className: "bg-white rounded-xl shadow p-12 text-center"},
                        React.createElement("div", {className: "inline-block w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"}),
                        React.createElement("p", {className: "text-gray-500"}, "Carregando necessidades...")
                    ),
                    
                    // Lista de necessidades
                    !recrutamentoLoading && React.createElement("div", {className: "space-y-4"},
                        (recrutamentoData
                            .filter(r => recrutamentoSubTab === 'todos' ? true : r.status === recrutamentoSubTab)
                            .length === 0) && React.createElement("div", {className: "bg-white rounded-xl shadow p-12 text-center"},
                            React.createElement("span", {className: "text-6xl block mb-4"}, "📭"),
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
                                    className: "bg-white rounded-2xl shadow-lg overflow-hidden border-l-4 " +
                                        (nec.status === 'concluido' ? 'border-green-500' : 
                                         diasRestantes < 0 ? 'border-red-500' :
                                         diasRestantes <= 3 ? 'border-yellow-500' : 'border-teal-500')
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
                                                    }, nec.status === 'concluido' ? '✅ Concluído' : 
                                                       nec.status === 'cancelado' ? '❌ Cancelado' : '🚀 Em Andamento')
                                                ),
                                                React.createElement("div", {className: "flex items-center gap-4 text-sm text-gray-600"},
                                                    React.createElement("span", {className: "flex items-center gap-1"},
                                                        "📅 Conclusão: ",
                                                        React.createElement("strong", null, new Date(nec.data_conclusao?.split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR'))
                                                    ),
                                                    React.createElement("span", {
                                                        className: "px-2 py-1 rounded text-xs font-bold " +
                                                            (diasRestantes < 0 ? 'bg-red-100 text-red-700' :
                                                             diasRestantes <= 3 ? 'bg-yellow-100 text-yellow-700' :
                                                             'bg-teal-100 text-teal-700')
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
                                                    className: "px-3 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200"
                                                }, "✏️"),
                                                React.createElement("button", {
                                                    onClick: () => deletarRecrutamento(nec.id),
                                                    className: "px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                                }, "🗑️")
                                            )
                                        ),
                                        
                                        // Barra de progresso geral do card
                                        React.createElement("div", {className: "mb-4"},
                                            React.createElement("div", {className: "flex justify-between text-sm mb-1"},
                                                React.createElement("span", {className: "text-gray-600"}, "Progresso Total"),
                                                React.createElement("span", {className: "font-bold " + (progressoTotal === 100 ? 'text-green-600' : 'text-teal-600')}, 
                                                    progressoTotal, "%"
                                                )
                                            ),
                                            React.createElement("div", {className: "w-full h-3 bg-gray-200 rounded-full overflow-hidden"},
                                                React.createElement("div", {
                                                    className: "h-full rounded-full transition-all duration-500 " +
                                                        (progressoTotal === 100 ? 'bg-green-500' : 'bg-teal-500'),
                                                    style: { width: `${progressoTotal}%` }
                                                })
                                            )
                                        ),
                                        
                                        // Observação
                                        nec.observacao && React.createElement("p", {className: "text-sm text-gray-500 italic mb-4"}, 
                                            "📝 ", nec.observacao
                                        ),
                                        
                                        // Grid de seções: Titulares e Backups
                                        React.createElement("div", {className: "grid md:grid-cols-2 gap-4"},
                                            // Seção Motos Titulares
                                            React.createElement("div", {className: "bg-gray-50 rounded-xl p-4"},
                                                React.createElement("div", {className: "flex justify-between items-center mb-3"},
                                                    React.createElement("h4", {className: "font-bold text-gray-700"}, 
                                                        "🏍️ Motos Titulares"
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
                                                            className: "flex items-center justify-between bg-white rounded-lg p-2 shadow-sm"
                                                        },
                                                            React.createElement("div", null,
                                                                React.createElement("span", {className: "font-mono text-teal-600 font-bold"}, attr.cod_profissional),
                                                                attr.nome_profissional && React.createElement("span", {className: "ml-2 text-gray-600 text-sm"}, attr.nome_profissional)
                                                            ),
                                                            React.createElement("button", {
                                                                onClick: () => removerAtribuicaoRecrutamento(attr.id),
                                                                className: "text-red-500 hover:text-red-700 text-sm"
                                                            }, "✕")
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
                                                                "✅ ", recrutamentoCodBusca[`${nec.id}_titular`].nome
                                                            ),
                                                        recrutamentoCodBusca[`${nec.id}_titular`]?.erro && 
                                                            React.createElement("p", {className: "text-xs text-red-500 mt-1"}, 
                                                                "❌ ", recrutamentoCodBusca[`${nec.id}_titular`].erro
                                                            )
                                                    ),
                                                    React.createElement("button", {
                                                        onClick: () => atribuirProfissionalRecrutamento(nec.id, 'titular'),
                                                        disabled: !recrutamentoCodBusca[`${nec.id}_titular`]?.nome,
                                                        className: "px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    }, "➕")
                                                )
                                            ),
                                            
                                            // Seção Motos Backup
                                            nec.quantidade_backup > 0 && React.createElement("div", {className: "bg-blue-50 rounded-xl p-4"},
                                                React.createElement("div", {className: "flex justify-between items-center mb-3"},
                                                    React.createElement("h4", {className: "font-bold text-gray-700"}, 
                                                        "🔄 Motos Backup"
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
                                                            className: "flex items-center justify-between bg-white rounded-lg p-2 shadow-sm"
                                                        },
                                                            React.createElement("div", null,
                                                                React.createElement("span", {className: "font-mono text-blue-600 font-bold"}, attr.cod_profissional),
                                                                attr.nome_profissional && React.createElement("span", {className: "ml-2 text-gray-600 text-sm"}, attr.nome_profissional)
                                                            ),
                                                            React.createElement("button", {
                                                                onClick: () => removerAtribuicaoRecrutamento(attr.id),
                                                                className: "text-red-500 hover:text-red-700 text-sm"
                                                            }, "✕")
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
                                                                "✅ ", recrutamentoCodBusca[`${nec.id}_backup`].nome
                                                            ),
                                                        recrutamentoCodBusca[`${nec.id}_backup`]?.erro && 
                                                            React.createElement("p", {className: "text-xs text-red-500 mt-1"}, 
                                                                "❌ ", recrutamentoCodBusca[`${nec.id}_backup`].erro
                                                            )
                                                    ),
                                                    React.createElement("button", {
                                                        onClick: () => atribuirProfissionalRecrutamento(nec.id, 'backup'),
                                                        disabled: !recrutamentoCodBusca[`${nec.id}_backup`]?.nome,
                                                        className: "px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    }, "➕")
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
                        React.createElement("div", {className: "p-6 border-b bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-t-2xl"},
                            React.createElement("h3", {className: "text-xl font-bold"}, 
                                recrutamentoEdit ? "✏️ Editar Necessidade" : "➕ Nova Necessidade de Recrutamento"
                            ),
                            React.createElement("p", {className: "text-sm opacity-80"}, 
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
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                })
                            ),
                            // Data de conclusão
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Data de Conclusão *"),
                                React.createElement("input", {
                                    type: "date",
                                    value: recrutamentoForm.data_conclusao,
                                    onChange: (e) => setRecrutamentoForm(f => ({...f, data_conclusao: e.target.value})),
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                })
                            ),
                            // Quantidades
                            React.createElement("div", {className: "grid grid-cols-2 gap-4"},
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "🏍️ Quantidade de Motos *"),
                                    React.createElement("input", {
                                        type: "number",
                                        min: "1",
                                        value: recrutamentoForm.quantidade_motos,
                                        onChange: (e) => setRecrutamentoForm(f => ({...f, quantidade_motos: parseInt(e.target.value) || 1})),
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                    })
                                ),
                                React.createElement("div", null,
                                    React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "🔄 Quantidade de Backup"),
                                    React.createElement("input", {
                                        type: "number",
                                        min: "0",
                                        value: recrutamentoForm.quantidade_backup,
                                        onChange: (e) => setRecrutamentoForm(f => ({...f, quantidade_backup: parseInt(e.target.value) || 0})),
                                        className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                    })
                                )
                            ),
                            // Observação
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "📝 Observação (opcional)"),
                                React.createElement("textarea", {
                                    value: recrutamentoForm.observacao,
                                    onChange: (e) => setRecrutamentoForm(f => ({...f, observacao: e.target.value})),
                                    placeholder: "Ex: Preferência por motoboys com experiência em delivery de documentos",
                                    rows: 3,
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
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
                                className: "flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            }, recrutamentoEdit ? "💾 Salvar Alterações" : "➕ Criar Necessidade")
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
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, "📍 Localização Clientes"),
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
                                className: "px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                            }, "🗺️ Roteirizador"),
                            React.createElement("button", {
                                onClick: carregarLocalizacaoClientes,
                                disabled: localizacaoLoading,
                                className: "px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 flex items-center gap-2 shadow-lg disabled:opacity-50"
                            }, localizacaoLoading ? "🔄 Carregando..." : "🔄 Atualizar")
                        )
                    ),
                    
                    // Sub-abas Lista e Mapa
                    React.createElement("div", {className: "bg-white rounded-xl shadow overflow-hidden"},
                        React.createElement("div", {className: "flex border-b"},
                            React.createElement("button", {
                                onClick: () => setLocalizacaoSubTab('lista'),
                                className: "flex-1 px-6 py-3 text-sm font-semibold transition-all " + (localizacaoSubTab === 'lista' ? "bg-teal-50 text-teal-700 border-b-2 border-teal-600" : "text-gray-600 hover:bg-gray-50")
                            }, "📋 Lista"),
                            React.createElement("button", {
                                onClick: () => { 
                                    setLocalizacaoSubTab('mapa'); 
                                    setTimeout(() => window.initMapaClientes(localizacaoClientes), 100);
                                },
                                className: "flex-1 px-6 py-3 text-sm font-semibold transition-all " + (localizacaoSubTab === 'mapa' ? "bg-teal-50 text-teal-700 border-b-2 border-teal-600" : "text-gray-600 hover:bg-gray-50")
                            }, "🗺️ Mapa")
                        )
                    ),
                    
                    // Conteúdo da sub-aba Lista
                    localizacaoSubTab === 'lista' && React.createElement(React.Fragment, null,
                        // Barra de busca
                        React.createElement("div", {className: "bg-white rounded-xl p-4 shadow"},
                            React.createElement("div", {className: "flex gap-3 items-center"},
                                React.createElement("span", {className: "text-2xl"}, "🔍"),
                                React.createElement("input", {
                                    type: "text",
                                    value: localizacaoFiltro,
                                    onChange: e => setLocalizacaoFiltro(e.target.value),
                                    placeholder: "Buscar por código ou nome do cliente...",
                                    className: "flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                }),
                                localizacaoFiltro && React.createElement("button", {
                                    onClick: () => setLocalizacaoFiltro(""),
                                    className: "px-4 py-2 text-gray-500 hover:text-gray-700"
                                }, "✕ Limpar")
                            )
                        ),
                        
                        // Lista de clientes
                        localizacaoLoading 
                            ? React.createElement("div", {className: "bg-white rounded-xl p-8 shadow text-center"},
                                React.createElement("div", {className: "w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"}),
                                React.createElement("p", {className: "text-gray-600"}, "Carregando dados dos clientes...")
                            )
                            : localizacaoClientes?.length === 0
                                ? React.createElement("div", {className: "bg-white rounded-xl p-8 shadow text-center"},
                                    React.createElement("span", {className: "text-5xl block mb-4"}, "📭"),
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
                                        ? React.createElement("div", {className: "bg-white rounded-xl p-8 shadow text-center"},
                                            React.createElement("span", {className: "text-3xl block mb-2"}, "🔍"),
                                            React.createElement("p", {className: "text-gray-500"}, "Nenhum cliente encontrado com \"", localizacaoFiltro, "\"")
                                        )
                                        : clientesFiltrados.map(cliente => React.createElement("div", {
                                            key: cliente.cod_cliente + (cliente.centro_custo || ''),
                                            className: "bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-teal-500"
                                        },
                                            // Cabeçalho do cliente
                                            React.createElement("div", {className: "bg-gradient-to-r from-teal-50 to-white p-4 border-b"},
                                                React.createElement("div", {className: "flex items-center justify-between"},
                                                    React.createElement("div", {className: "flex items-center gap-3"},
                                                        React.createElement("span", {className: "text-2xl"}, "🏢"),
                                                        React.createElement("div", null,
                                                            React.createElement("p", {className: "font-bold text-teal-800 text-lg"}, 
                                                                cliente.cod_cliente, " - ", cliente.nome_cliente
                                                            ),
                                                            cliente.centro_custo && React.createElement("p", {className: "text-sm font-semibold text-purple-600"}, 
                                                                "📦 ", cliente.centro_custo
                                                            ),
                                                            React.createElement("p", {className: "text-sm text-gray-500"}, 
                                                                cliente.enderecos?.length || 0, " endereço(s) de coleta"
                                                            )
                                                        )
                                                    ),
                                                    React.createElement("span", {className: "px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold"},
                                                        "📍 ", cliente.enderecos?.length || 0
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
                                                            React.createElement("p", {className: "font-semibold text-gray-800"}, "📌 ", end.endereco || "Sem endereço"),
                                                            React.createElement("p", {className: "text-sm text-gray-600"}, 
                                                                [end.bairro, end.cidade, end.estado].filter(Boolean).join(" - ") || "Localização não especificada"
                                                            ),
                                                            React.createElement("div", {className: "flex items-center gap-4 mt-2"},
                                                                React.createElement("span", {className: "text-xs text-gray-500"}, 
                                                                    "📦 ", end.total_entregas || 0, " entregas"
                                                                ),
                                                                end.latitude && end.longitude
                                                                    ? React.createElement("span", {className: "text-xs text-green-600 flex items-center gap-1"},
                                                                        "✅ Coordenadas: ", end.latitude?.toFixed(4), ", ", end.longitude?.toFixed(4)
                                                                    )
                                                                    : React.createElement("span", {className: "text-xs text-orange-500"},
                                                                        "⚠️ Sem coordenadas"
                                                                    )
                                                            )
                                                        ),
                                                        // Botões de ação - apenas Waze
                                                        React.createElement("div", {className: "flex flex-wrap gap-2"},
                                                            React.createElement("a", {
                                                                href: gerarLinkWaze(end.endereco + " " + (end.cidade || ""), end.latitude, end.longitude),
                                                                target: "_blank",
                                                                rel: "noopener noreferrer",
                                                                className: "px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-semibold hover:bg-cyan-600 flex items-center gap-2 shadow"
                                                            }, "🚗 Waze"),
                                                            React.createElement("button", {
                                                                onClick: () => copiarParaClipboard(
                                                                    gerarLinkWaze(end.endereco + " " + (end.cidade || ""), end.latitude, end.longitude),
                                                                    "Waze"
                                                                ),
                                                                className: "px-3 py-2 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-semibold hover:bg-cyan-200"
                                                            }, "📋")
                                                        )
                                                    )
                                                ))
                                            )
                                        ));
                                })()
                            )
                    ),
                    
                    // Conteúdo da sub-aba Mapa
                    localizacaoSubTab === 'mapa' && React.createElement("div", {className: "bg-white rounded-xl shadow overflow-hidden"},
                        // Legenda
                        React.createElement("div", {className: "p-4 border-b bg-gray-50 flex items-center gap-6"},
                            React.createElement("span", {className: "text-sm text-gray-600 font-semibold"}, "Legenda:"),
                            React.createElement("span", {className: "flex items-center gap-1 text-sm"}, "🏢 Clientes"),
                            React.createElement("span", {className: "flex items-center gap-1 text-sm"}, "⭐ Cliente 767")
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
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, "📝 Relatório Diário"),
                            React.createElement("p", {className: "text-gray-600"}, "Registre suas atividades e observações do dia")
                        ),
                        React.createElement("button", {
                            onClick: abrirNovoRelatorio,
                            className: "px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 flex items-center gap-2 shadow-lg"
                        }, "➕ Criar Relatório")
                    ),
                    
                    // Lista de relatórios
                    relatoriosLoading 
                        ? React.createElement("div", {className: "bg-white rounded-xl p-8 shadow text-center"},
                            React.createElement("div", {className: "w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"}),
                            React.createElement("p", {className: "text-gray-600"}, "Carregando relatórios...")
                        )
                        : relatoriosDiarios?.length === 0
                            ? React.createElement("div", {className: "bg-white rounded-xl p-12 shadow text-center"},
                                React.createElement("span", {className: "text-6xl block mb-4"}, "📋"),
                                React.createElement("p", {className: "text-gray-500 text-lg"}, "Nenhum relatório encontrado"),
                                React.createElement("p", {className: "text-sm text-gray-400 mt-2"}, "Clique em \"+ Criar Relatório\" para começar"),
                                React.createElement("button", {
                                    onClick: abrirNovoRelatorio,
                                    className: "mt-6 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700"
                                }, "➕ Criar Primeiro Relatório")
                            )
                            : React.createElement("div", {className: "space-y-4"},
                                relatoriosDiarios.map(rel => React.createElement("div", {
                                    key: rel.id,
                                    className: "bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-teal-500"
                                },
                                    // Header do relatório
                                    React.createElement("div", {className: "bg-gradient-to-r from-teal-50 to-white p-4 border-b"},
                                        React.createElement("div", {className: "flex items-center justify-between"},
                                            React.createElement("div", {className: "flex items-center gap-3"},
                                                rel.usuario_foto 
                                                    ? React.createElement("img", {
                                                        src: rel.usuario_foto,
                                                        className: "w-12 h-12 rounded-full object-cover border-2 border-teal-200"
                                                    })
                                                    : React.createElement("div", {
                                                        className: "w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-lg"
                                                    }, (rel.usuario_nome || "?").charAt(0).toUpperCase()),
                                                React.createElement("div", null,
                                                    React.createElement("p", {className: "font-bold text-teal-800"}, rel.titulo),
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
                                                }, "✏️"),
                                                React.createElement("button", {
                                                    onClick: () => excluirRelatorio(rel.id),
                                                    className: "p-2 text-red-600 hover:bg-red-50 rounded-lg",
                                                    title: "Excluir"
                                                }, "🗑️")
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
                                            React.createElement("span", {className: "text-sm text-gray-500 font-medium"}, "👁️ Visualizações:"),
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
                                                                    className: "w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-xs border-2 border-white shadow-sm"
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
                    React.createElement("div", {className: "bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 flex items-center justify-between"},
                        React.createElement("h3", {className: "text-lg font-bold"}, relatorioEdit ? "✏️ Editar Relatório" : "📝 Novo Relatório"),
                        React.createElement("button", {
                            onClick: () => setShowRelatorioModal(false),
                            className: "text-white/80 hover:text-white text-2xl"
                        }, "✕")
                    ),
                    
                    // Info do usuário e data
                    React.createElement("div", {className: "p-4 bg-gray-50 border-b flex items-center gap-3"},
                        socialProfile?.profile_photo 
                            ? React.createElement("img", {
                                src: socialProfile.profile_photo,
                                className: "w-10 h-10 rounded-full object-cover border-2 border-teal-200"
                            })
                            : React.createElement("div", {
                                className: "w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold"
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
                        // ===== SELEÇÃO DE DESTINATÁRIOS NO TOPO =====
                        React.createElement("div", {className: "bg-purple-50 rounded-xl p-4 space-y-3 border-2 border-purple-200"},
                            React.createElement("label", {className: "block text-sm font-bold text-purple-800"}, "📢 Quem deve ver este relatório?"),
                            
                            React.createElement("div", {className: "flex flex-wrap gap-3"},
                                // Toggle Para Todos
                                React.createElement("div", {
                                    className: `flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${relatorioForm.para_todos ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-gray-700 border hover:border-gray-400'}`,
                                    onClick: () => setRelatorioForm(prev => ({...prev, para_todos: true, setores_destino: []}))
                                },
                                    React.createElement("span", null, "🌐"),
                                    React.createElement("span", {className: "font-semibold"}, "Todos os usuários")
                                ),
                                
                                // Toggle Por Setores
                                React.createElement("div", {
                                    className: `flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${!relatorioForm.para_todos ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-gray-700 border hover:border-gray-400'}`,
                                    onClick: () => {
                                        // Ao clicar em "Setores específicos", já seleciona o setor "Monitoramento" por padrão
                                        const setorMonitoramento = setores.find(s => s.nome.toLowerCase() === 'monitoramento');
                                        const setoresDefault = setorMonitoramento ? [setorMonitoramento.id] : [];
                                        setRelatorioForm(prev => ({...prev, para_todos: false, setores_destino: setoresDefault}));
                                    }
                                },
                                    React.createElement("span", null, "🏢"),
                                    React.createElement("span", {className: "font-semibold"}, "Setores específicos")
                                )
                            ),
                            
                            // Lista de Setores (só aparece se não for para todos)
                            !relatorioForm.para_todos && React.createElement("div", {className: "flex flex-wrap gap-2 mt-2"},
                                setores.length === 0 
                                    ? React.createElement("p", {className: "text-sm text-gray-500"}, 
                                        "Nenhum setor cadastrado."
                                    )
                                    : setores.filter(s => s.ativo).map(setor => 
                                        React.createElement("div", {
                                            key: setor.id,
                                            className: `flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all text-sm ${
                                                relatorioForm.setores_destino?.includes(setor.id) 
                                                    ? 'text-white shadow-md' 
                                                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400'
                                            }`,
                                            style: relatorioForm.setores_destino?.includes(setor.id) 
                                                ? { backgroundColor: setor.cor || '#6366f1' } 
                                                : {},
                                            onClick: () => {
                                                setRelatorioForm(prev => {
                                                    const atual = prev.setores_destino || [];
                                                    const novo = atual.includes(setor.id)
                                                        ? atual.filter(id => id !== setor.id)
                                                        : [...atual, setor.id];
                                                    return {...prev, setores_destino: novo};
                                                });
                                            }
                                        },
                                            !relatorioForm.setores_destino?.includes(setor.id) && React.createElement("div", {
                                                className: "w-3 h-3 rounded-full",
                                                style: { backgroundColor: setor.cor || '#6366f1' }
                                            }),
                                            React.createElement("span", {className: "font-medium"}, setor.nome),
                                            relatorioForm.setores_destino?.includes(setor.id) && React.createElement("span", null, "✓")
                                        )
                                    )
                            )
                        ),
                        
                        // Título
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Título *"),
                            React.createElement("input", {
                                type: "text",
                                value: relatorioForm.titulo,
                                onChange: e => setRelatorioForm(prev => ({...prev, titulo: e.target.value})),
                                placeholder: "Ex: Relatório de entregas - Zona Norte",
                                className: "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            })
                        ),
                        
                        // Barra de formatação
                        React.createElement("div", {className: "flex flex-wrap items-center gap-2 p-2 bg-gray-100 rounded-lg"},
                            React.createElement("span", {className: "text-sm text-gray-500 mr-2"}, "Emojis:"),
                            ['✅', '❌', '👤', '💜', '⚠️', '🚨', '✍🏼', '🔥', '🛵', '💰', '📍', '🖊️'].map(emoji => 
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
                                className: "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                            })
                        ),
                        
                        // Upload de imagem
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-1"}, "Imagem/Arquivo (opcional)"),
                            React.createElement("div", {className: "border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-teal-500 transition-colors"},
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
                                        ? React.createElement("div", {className: "text-teal-600"},
                                            React.createElement("span", {className: "text-2xl"}, "📎"),
                                            React.createElement("p", {className: "font-semibold"}, relatorioForm.imagem.name),
                                            React.createElement("p", {className: "text-sm text-gray-500"}, "Clique para trocar")
                                        )
                                        : React.createElement("div", {className: "text-gray-500"},
                                            React.createElement("span", {className: "text-3xl"}, "📷"),
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
                            className: "flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        }, relatorioEdit ? "💾 Salvar Alterações" : "📝 Criar Relatório")
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
            p.opTab === "incentivos" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-6"},
                    // Header
                    React.createElement("div", {className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"},
                        React.createElement("div", null,
                            React.createElement("h2", {className: "text-2xl font-bold text-gray-800"}, "🎯 Acompanhamento de Incentivos, Promoções e Novas Operações"),
                            React.createElement("p", {className: "text-gray-600"}, "Gerencie demandas operacionais e acompanhe custos")
                        ),
                        React.createElement("button", {
                            onClick: () => { 
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
                                    cor: '#0d9488'
                                }); 
                                setIncentivoModal(true); 
                            },
                            className: "px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 flex items-center gap-2 shadow-lg"
                        }, "➕ Criar Demanda")
                    ),
                    
                    // Cards de estatísticas
                    React.createElement("div", {className: "grid grid-cols-2 md:grid-cols-5 gap-4"},
                        React.createElement("div", {className: "bg-white rounded-xl p-4 shadow border-l-4 border-green-500"},
                            React.createElement("p", {className: "text-sm text-gray-500"}, "Ativos Agora"),
                            React.createElement("p", {className: "text-2xl font-bold text-green-600"}, incentivosStats?.ativos || 0)
                        ),
                        React.createElement("div", {className: "bg-white rounded-xl p-4 shadow border-l-4 border-orange-500"},
                            React.createElement("p", {className: "text-sm text-gray-500"}, "Vencendo em 7 dias"),
                            React.createElement("p", {className: "text-2xl font-bold text-orange-600"}, incentivosStats?.vencendo_em_breve || 0)
                        ),
                        React.createElement("div", {className: "bg-white rounded-xl p-4 shadow border-l-4 border-yellow-500"},
                            React.createElement("p", {className: "text-sm text-gray-500"}, "Pausados"),
                            React.createElement("p", {className: "text-2xl font-bold text-yellow-600"}, incentivosStats?.pausados || 0)
                        ),
                        React.createElement("div", {className: "bg-white rounded-xl p-4 shadow border-l-4 border-gray-400"},
                            React.createElement("p", {className: "text-sm text-gray-500"}, "Encerrados"),
                            React.createElement("p", {className: "text-2xl font-bold text-gray-600"}, incentivosStats?.encerrados || 0)
                        ),
                        React.createElement("div", {className: "bg-white rounded-xl p-4 shadow border-l-4 border-teal-500"},
                            React.createElement("p", {className: "text-sm text-gray-500"}, "Total"),
                            React.createElement("p", {className: "text-2xl font-bold text-teal-600"}, incentivosStats?.total || 0)
                        ),
                        // Card de Total Investido no Mês
                        React.createElement("div", {className: "bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 shadow border-l-4 border-emerald-600 col-span-2 md:col-span-5"},
                            React.createElement("div", {className: "flex items-center justify-between"},
                                React.createElement("div", null,
                                    React.createElement("p", {className: "text-sm text-emerald-700 font-medium"}, "💰 Total Investido no Mês"),
                                    React.createElement("p", {className: "text-xs text-emerald-600"}, "Soma dos incentivos + promoções do mês selecionado")
                                ),
                                React.createElement("p", {className: "text-3xl font-bold text-emerald-700"}, 
                                    "R$ ", (() => {
                                        const calMes = new Date(incentivosCalendarioMes);
                                        const inicioMes = new Date(calMes.getFullYear(), calMes.getMonth(), 1).toISOString().split('T')[0];
                                        const fimMes = new Date(calMes.getFullYear(), calMes.getMonth() + 1, 0).toISOString().split('T')[0];
                                        return (incentivosData || []).filter(inc => {
                                            const di = (inc.data_inicio || '').slice(0, 10);
                                            const df = (inc.data_fim || '').slice(0, 10);
                                            return di <= fimMes && df >= inicioMes;
                                        }).reduce((acc, inc) => {
                                            if (inc.tipo === 'incentivo' && inc.calculo?.valor_total) {
                                                return acc + inc.calculo.valor_total;
                                            }
                                            if (inc.tipo === 'promocao' && inc.valor) {
                                                const valorNum = parseFloat(inc.valor.replace(/[^\d.,]/g, '').replace(',', '.'));
                                                if (!isNaN(valorNum)) return acc + valorNum;
                                            }
                                            return acc;
                                        }, 0);
                                    })().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                )
                            )
                        )
                    ),
                    
                    // Calendário
                    React.createElement("div", {className: "bg-white rounded-xl shadow-lg overflow-hidden"},
                        // Header do calendário
                        React.createElement("div", {className: "bg-gradient-to-r from-teal-600 to-teal-700 p-4 flex items-center justify-between"},
                            React.createElement("button", {
                                onClick: () => {
                                    const novaData = new Date(incentivosCalendarioMes);
                                    novaData.setMonth(novaData.getMonth() - 1);
                                    setIncentivosCalendarioMes(novaData);
                                },
                                className: "p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                            }, "◀"),
                            React.createElement("h3", {className: "text-xl font-bold text-white"},
                                new Date(incentivosCalendarioMes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())
                            ),
                            React.createElement("button", {
                                onClick: () => {
                                    const novaData = new Date(incentivosCalendarioMes);
                                    novaData.setMonth(novaData.getMonth() + 1);
                                    setIncentivosCalendarioMes(novaData);
                                },
                                className: "p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                            }, "▶")
                        ),
                        
                        // Dias da semana
                        React.createElement("div", {className: "grid grid-cols-7 bg-gray-100 border-b"},
                            ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => 
                                React.createElement("div", {key: dia, className: "p-3 text-center font-semibold text-gray-600 text-sm"}, dia)
                            )
                        ),
                        
                        // Grid do calendário
                        React.createElement("div", {className: "grid grid-cols-7"},
                            (function() {
                                const mesAtual = new Date(incentivosCalendarioMes);
                                const ano = mesAtual.getFullYear();
                                const mes = mesAtual.getMonth();
                                const primeiroDia = new Date(ano, mes, 1);
                                const ultimoDia = new Date(ano, mes + 1, 0);
                                const diasNoMes = ultimoDia.getDate();
                                const diaSemanaInicio = primeiroDia.getDay();
                                
                                const hoje = new Date();
                                hoje.setHours(0,0,0,0);
                                
                                const dias = [];
                                
                                // Dias vazios antes do primeiro dia
                                for (let i = 0; i < diaSemanaInicio; i++) {
                                    dias.push(React.createElement("div", {key: 'empty-' + i, className: "min-h-24 bg-gray-50 border-b border-r"}));
                                }
                                
                                // Dias do mês
                                for (let dia = 1; dia <= diasNoMes; dia++) {
                                    const dataAtual = new Date(ano, mes, dia);
                                    const isHoje = dataAtual.getTime() === hoje.getTime();
                                    
                                    // Filtrar incentivos para este dia
                                    const incentivosNoDia = (incentivosData || []).filter(inc => {
                                        const inicio = new Date(inc.data_inicio?.split('T')[0] + "T12:00:00");
                                        const fim = new Date(inc.data_fim?.split('T')[0] + "T12:00:00");
                                        inicio.setHours(0,0,0,0);
                                        fim.setHours(23,59,59,999);
                                        return dataAtual >= inicio && dataAtual <= fim;
                                    });
                                    
                                    // Filtrar operações que iniciam neste dia
                                    const operacoesNoDia = (operacoesData || []).filter(op => {
                                        if (!op.data_inicio) return false;
                                        const inicio = new Date(op.data_inicio?.split('T')[0] + "T12:00:00");
                                        inicio.setHours(0,0,0,0);
                                        return dataAtual.getTime() === inicio.getTime();
                                    });
                                    
                                    // Combinar todos os itens do dia
                                    const todosItensNoDia = [
                                        ...incentivosNoDia.map(inc => ({ ...inc, _tipo: 'incentivo_promo' })),
                                        ...operacoesNoDia.map(op => ({ ...op, _tipo: 'operacao' }))
                                    ];
                                    
                                    dias.push(
                                        React.createElement("div", {
                                            key: dia,
                                            className: "min-h-24 border-b border-r p-1 " + (isHoje ? "bg-teal-50" : "bg-white") + " hover:bg-gray-50 transition-colors"
                                        },
                                            // Número do dia
                                            React.createElement("div", {className: "flex justify-between items-start mb-1"},
                                                React.createElement("span", {
                                                    className: "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold " + 
                                                        (isHoje ? "bg-teal-600 text-white" : "text-gray-700")
                                                }, dia),
                                                todosItensNoDia.length > 0 && React.createElement("span", {
                                                    className: "text-xs text-gray-400"
                                                }, todosItensNoDia.length)
                                            ),
                                            // Itens do dia
                                            React.createElement("div", {className: "space-y-1 overflow-hidden max-h-16"},
                                                todosItensNoDia.slice(0, 3).map((item, idx) => {
                                                    // É uma operação
                                                    if (item._tipo === 'operacao') {
                                                        return React.createElement("div", {
                                                            key: 'op-' + item.id,
                                                            className: "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity",
                                                            style: { 
                                                                backgroundColor: '#7c3aed', 
                                                                color: 'white'
                                                            },
                                                            title: 'Nova Operação: ' + item.nome_cliente
                                                        }, 
                                                            '🏢 ' + item.nome_cliente
                                                        );
                                                    }
                                                    
                                                    // É um incentivo/promoção
                                                    return React.createElement("div", {
                                                        key: 'inc-' + item.id,
                                                        onClick: () => {
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
                                                                cor: item.cor || '#0d9488'
                                                            });
                                                            (item.clientes_vinculados || []).forEach(function(cod) { fetchCentrosCusto(cod); });
                                                            setIncentivoModal(true);
                                                        },
                                                        className: "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity",
                                                        style: { 
                                                            backgroundColor: item.cor || '#0d9488', 
                                                            color: 'white',
                                                            opacity: item.status === 'pausado' ? 0.5 : 1
                                                        },
                                                        title: item.titulo + (item.status === 'pausado' ? ' (Pausado)' : '')
                                                    }, 
                                                        (item.tipo === 'incentivo' ? '⭐' : '🏷️') + ' ' + item.titulo
                                                    );
                                                }),
                                                todosItensNoDia.length > 3 && React.createElement("div", {
                                                    className: "text-xs text-gray-400 text-center"
                                                }, "+", todosItensNoDia.length - 3, " mais")
                                            )
                                        )
                                    );
                                }
                                
                                return dias;
                            })()
                        )
                    ),
                    
                    // Lista de todas as demandas (incentivos + promoções + operações)
                    React.createElement("div", {className: "bg-white rounded-xl shadow-lg overflow-hidden"},
                        React.createElement("div", {className: "p-4 bg-gray-50 border-b flex items-center justify-between"},
                            React.createElement("h3", {className: "font-bold text-gray-800"}, "📋 Todas as Demandas"),
                            React.createElement("div", {className: "flex gap-2 text-xs"},
                                React.createElement("span", {className: "px-2 py-1 bg-teal-100 text-teal-700 rounded"}, "🏷️ Promoção"),
                                React.createElement("span", {className: "px-2 py-1 bg-yellow-100 text-yellow-700 rounded"}, "⭐ Incentivo"),
                                React.createElement("span", {className: "px-2 py-1 bg-purple-100 text-purple-700 rounded"}, "🏢 Nova Operação")
                            )
                        ),
                        (function() {
                            // Combinar incentivos + operações
                            const todasDemandas = [
                                ...(incentivosData || []).map(inc => ({ ...inc, _tipo: inc.tipo })),
                                ...(operacoesData || []).filter(op => op.status !== 'concluido').map(op => ({ 
                                    ...op, 
                                    _tipo: 'operacao',
                                    titulo: op.nome_cliente,
                                    data_fim: op.data_inicio // operação só tem data início
                                }))
                            ].sort((a, b) => new Date(b.data_inicio) - new Date(a.data_inicio));
                            
                            if (todasDemandas.length === 0) {
                                return React.createElement("div", {className: "p-8 text-center"},
                                    React.createElement("span", {className: "text-5xl block mb-4"}, "📭"),
                                    React.createElement("p", {className: "text-gray-500"}, "Nenhuma demanda cadastrada"),
                                    React.createElement("p", {className: "text-sm text-gray-400"}, "Clique em \"Criar Demanda\" para criar a primeira")
                                );
                            }
                            
                            return React.createElement("div", {className: "divide-y max-h-[500px] overflow-y-auto"},
                                todasDemandas.map((item, idx) => {
                                    const hoje = new Date();
                                    hoje.setHours(0,0,0,0);
                                    const inicio = new Date(item.data_inicio?.split('T')[0] + "T12:00:00");
                                    const fim = item.data_fim ? new Date(item.data_fim?.split('T')[0] + "T12:00:00") : inicio;
                                    const isAtivo = item.status === 'ativo' && hoje >= inicio && hoje <= fim;
                                    const isVencendo = item.status === 'ativo' && fim >= hoje && fim <= new Date(hoje.getTime() + 7*24*60*60*1000);
                                    const isEncerrado = fim < hoje;
                                    
                                    // É uma OPERAÇÃO
                                    if (item._tipo === 'operacao') {
                                        const contador = calcularContadorRegressivo(item.data_inicio);
                                        return React.createElement("div", {
                                            key: 'op-' + item.id,
                                            className: "p-4 hover:bg-gray-50 transition-colors"
                                        },
                                            React.createElement("div", {className: "flex items-start justify-between gap-4"},
                                                React.createElement("div", {className: "flex items-start gap-3 flex-1"},
                                                    // Indicador de cor roxo para operação
                                                    React.createElement("div", {
                                                        className: "w-3 h-12 rounded-full flex-shrink-0",
                                                        style: { backgroundColor: '#7c3aed' }
                                                    }),
                                                    React.createElement("div", {className: "flex-1"},
                                                        React.createElement("div", {className: "flex items-center gap-2 flex-wrap"},
                                                            React.createElement("span", {className: "text-lg"}, "🏢"),
                                                            React.createElement("h4", {className: "font-bold text-gray-800"}, item.nome_cliente),
                                                            React.createElement("span", {className: "px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold"}, "Nova Operação"),
                                                            contador.status === 'hoje' && React.createElement("span", {className: "px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold animate-pulse"}, "🚀 HOJE!"),
                                                            contador.status === 'amanha' && React.createElement("span", {className: "px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold"}, "⏰ Amanhã"),
                                                            contador.status === 'iniciado' && React.createElement("span", {className: "px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold"}, "✅ Iniciado")
                                                        ),
                                                        // Informações da operação
                                                        React.createElement("div", {className: "flex flex-wrap gap-3 mt-2 text-sm text-gray-500"},
                                                            React.createElement("span", null, "📅 Início: ", new Date(item.data_inicio?.split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR')),
                                                            React.createElement("span", null, "📍 ", item.regiao),
                                                            React.createElement("span", null, "🏍️ ", item.quantidade_motos, " moto(s)"),
                                                            item.possui_garantido && React.createElement("span", {className: "text-green-600"}, "💰 Garantido")
                                                        ),
                                                        // Card da operação
                                                        React.createElement("div", {className: "mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg"},
                                                            React.createElement("div", {className: "flex items-center justify-between flex-wrap gap-2"},
                                                                React.createElement("div", null,
                                                                    React.createElement("span", {className: "text-sm text-purple-800 font-medium"}, "📌 Endereço: "),
                                                                    React.createElement("span", {className: "text-sm text-gray-700"}, item.endereco?.substring(0, 50), item.endereco?.length > 50 ? '...' : '')
                                                                ),
                                                                contador.dias > 0 && React.createElement("div", {className: "text-right"},
                                                                    React.createElement("span", {className: "text-sm text-purple-600"}, "Faltam: "),
                                                                    React.createElement("span", {className: "font-bold text-purple-800"}, contador.dias, " dia(s)")
                                                                )
                                                            ),
                                                            React.createElement("div", {className: "mt-2 pt-2 border-t border-purple-200 flex gap-4 text-xs"},
                                                                React.createElement("span", {className: "text-purple-700"}, "Modelo: ", 
                                                                    item.modelo === 'nuvem' ? '☁️ Nuvem' : item.modelo === 'dedicado' ? '🎯 Dedicado' : '⚡ Flash'
                                                                ),
                                                                item.obrigatoriedade_bau && React.createElement("span", {className: "text-orange-600"}, "📦 Baú obrigatório")
                                                            )
                                                        )
                                                    )
                                                ),
                                                // Link para ir à aba de operações
                                                React.createElement("button", {
                                                    onClick: () => x({...p, opTab: 'novas-operacoes'}),
                                                    className: "p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200",
                                                    title: "Ver na aba Novas Operações"
                                                }, "👁️")
                                            )
                                        );
                                    }
                                    
                                    // É INCENTIVO ou PROMOÇÃO
                                    return React.createElement("div", {
                                        key: 'inc-' + item.id,
                                        className: "p-4 hover:bg-gray-50 transition-colors " + (item.status === 'pausado' ? 'opacity-60' : '')
                                    },
                                        React.createElement("div", {className: "flex items-start justify-between gap-4"},
                                            React.createElement("div", {className: "flex items-start gap-3 flex-1"},
                                                // Indicador de cor
                                                React.createElement("div", {
                                                    className: "w-3 rounded-full flex-shrink-0 " + (item.tipo === 'incentivo' ? 'h-auto self-stretch min-h-12' : 'h-12'),
                                                    style: { backgroundColor: item.cor || '#0d9488' }
                                                }),
                                                React.createElement("div", {className: "flex-1"},
                                                    React.createElement("div", {className: "flex items-center gap-2 flex-wrap"},
                                                        React.createElement("span", {className: "text-lg"}, 
                                                            item.tipo === 'incentivo' ? '⭐' : '🏷️'
                                                        ),
                                                        React.createElement("h4", {className: "font-bold text-gray-800"}, item.titulo),
                                                        // Status badges
                                                        isAtivo && React.createElement("span", {className: "px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold"}, "🟢 Ativo"),
                                                        isVencendo && React.createElement("span", {className: "px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold"}, "⚠️ Vencendo"),
                                                        item.status === 'pausado' && React.createElement("span", {className: "px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold"}, "⏸️ Pausado"),
                                                        isEncerrado && item.status !== 'pausado' && React.createElement("span", {className: "px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold"}, "✓ Encerrado")
                                                    ),
                                                    
                                                    // Informações básicas
                                                    React.createElement("div", {className: "flex flex-wrap gap-3 mt-2 text-sm text-gray-500"},
                                                        React.createElement("span", null, "📅 ", new Date(item.data_inicio?.split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR'), " → ", new Date(item.data_fim?.split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR')),
                                                        item.hora_inicio && item.hora_fim && React.createElement("span", null, "🕐 ", item.hora_inicio?.slice(0,5), " - ", item.hora_fim?.slice(0,5))
                                                    ),
                                                    
                                                    // Card para tipo PROMOÇÃO
                                                    item.tipo === 'promocao' && React.createElement("div", {className: "mt-3 p-3 bg-teal-50 border border-teal-200 rounded-lg"},
                                                        React.createElement("div", {className: "flex items-center justify-between flex-wrap gap-2"},
                                                            React.createElement("div", null,
                                                                React.createElement("span", {className: "text-sm text-teal-800 font-medium"}, "💵 Valor/Benefício: "),
                                                                React.createElement("span", {className: "font-bold text-teal-900"}, item.valor || '-')
                                                            )
                                                        ),
                                                        // Clientes vinculados
                                                        (item.clientes_nomes || []).length > 0 && React.createElement("div", {className: "mt-2 pt-2 border-t border-teal-200"},
                                                            React.createElement("span", {className: "text-xs text-teal-700"}, "🏢 Clientes: "),
                                                            React.createElement("span", {className: "text-xs text-gray-600"}, 
                                                                (item.clientes_nomes || []).map(c => c.nome_display).join(', ')
                                                            )
                                                        )
                                                    ),
                                                    
                                                    // Card de cálculo para tipo INCENTIVO
                                                    item.tipo === 'incentivo' && React.createElement("div", {className: "mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"},
                                                        React.createElement("div", {className: "flex items-center justify-between flex-wrap gap-2"},
                                                            React.createElement("div", null,
                                                                React.createElement("span", {className: "text-sm text-yellow-800 font-medium"}, "💰 Valor por OS: "),
                                                                React.createElement("span", {className: "font-bold text-yellow-900"}, "R$ ", parseFloat(item.valor_incentivo || 0).toFixed(2))
                                                            ),
                                                            item.calculo ? React.createElement("div", {className: "flex items-center gap-4"},
                                                                React.createElement("div", {className: "text-right"},
                                                                    React.createElement("span", {className: "text-sm text-gray-600"}, "OS no período: "),
                                                                    React.createElement("span", {className: "font-bold text-gray-800"}, item.calculo.quantidade_os)
                                                                ),
                                                                React.createElement("div", {className: "text-right"},
                                                                    React.createElement("span", {className: "text-sm text-gray-600"}, "Custo Total: "),
                                                                    React.createElement("span", {className: "font-bold text-lg " + (item.calculo.valor_total > 0 ? 'text-green-600' : 'text-gray-400')}, 
                                                                        "R$ ", (item.calculo.valor_total || 0).toFixed(2)
                                                                    )
                                                                )
                                                            ) : React.createElement("span", {className: "text-sm text-yellow-600 italic"}, "⏳ Aguardando dados do BI...")
                                                        ),
                                                        // Clientes vinculados
                                                        (item.clientes_nomes || []).length > 0 && React.createElement("div", {className: "mt-2 pt-2 border-t border-yellow-200"},
                                                            React.createElement("span", {className: "text-xs text-yellow-700"}, "🏢 Clientes: "),
                                                            React.createElement("span", {className: "text-xs text-gray-600"}, 
                                                                (item.clientes_nomes || []).map(c => c.nome_display).join(', ')
                                                            )
                                                        )
                                                    )
                                                )
                                            ),
                                            // Ações
                                            React.createElement("div", {className: "flex gap-2"},
                                                React.createElement("button", {
                                                    onClick: () => {
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
                                                            cor: item.cor || '#0d9488'
                                                        });
                                                        (item.clientes_vinculados || []).forEach(function(cod) { fetchCentrosCusto(cod); });
                                                        setIncentivoModal(true);
                                                    },
                                                    className: "p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                                }, "✏️"),
                                                React.createElement("button", {
                                                    onClick: () => deletarIncentivo(item.id),
                                                    className: "p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                                                }, "🗑️")
                                            )
                                        )
                                    );
                                })
                            );
                        })()
                    )
                )
            ),
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
                    React.createElement("div", {className: "bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white"},
                        React.createElement("h2", {className: "text-xl font-bold"}, incentivoEdit ? "✏️ Editar Demanda" : "➕ Nova Demanda"),
                        React.createElement("p", {className: "text-teal-100 text-sm"}, "Configure os detalhes da demanda")
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
                                className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            })
                        ),
                        
                        // Tipo e Cor
                        React.createElement("div", {className: "grid grid-cols-2 gap-4"},
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Tipo"),
                                React.createElement("select", {
                                    value: incentivoForm.tipo,
                                    onChange: e => setIncentivoForm(f => ({...f, tipo: e.target.value})),
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                },
                                    React.createElement("option", {value: "promocao"}, "🏷️ Promoção"),
                                    React.createElement("option", {value: "incentivo"}, "⭐ Incentivo")
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
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Data Fim *"),
                                React.createElement("input", {
                                    type: "date",
                                    value: incentivoForm.data_fim,
                                    onChange: e => setIncentivoForm(f => ({...f, data_fim: e.target.value})),
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                })
                            )
                        ),
                        
                        // ========== CAMPOS ESPECÍFICOS PARA TIPO INCENTIVO ==========
                        incentivoForm.tipo === 'incentivo' && React.createElement("div", {className: "bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-4"},
                            React.createElement("div", {className: "flex items-center gap-2 text-yellow-800 font-semibold"},
                                React.createElement("span", null, "⭐"),
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
                                        placeholder: "🔍 Buscar cliente por nome ou código...",
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
                                    "✓ ", (incentivoForm.clientes_vinculados || []).length, " cliente(s) selecionado(s)"
                                )
                            )
                        ),
                        
                        // ========== CAMPOS ESPECÍFICOS PARA TIPO PROMOÇÃO ==========
                        incentivoForm.tipo === 'promocao' && React.createElement("div", {className: "bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-4"},
                            React.createElement("div", {className: "flex items-center gap-2 text-teal-800 font-semibold"},
                                React.createElement("span", null, "🏷️"),
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
                                    className: "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-teal-500"
                                })
                            ),
                            
                            // Clientes Vinculados (Multi-select com busca)
                            React.createElement("div", null,
                                React.createElement("label", {className: "block text-sm font-semibold text-gray-700 mb-2"}, "Clientes Vinculados *"),
                                
                                // Campo de busca
                                React.createElement("div", {className: "relative mb-2"},
                                    React.createElement("input", {
                                        type: "text",
                                        placeholder: "🔍 Buscar cliente por nome ou código...",
                                        className: "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 text-sm",
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
                                            className: "flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg p-2"
                                        },
                                            React.createElement("div", {className: "flex-1 min-w-0"},
                                                React.createElement("span", {className: "text-sm font-semibold text-teal-800 truncate block"}, cliente?.nome_display || ("Cliente " + codCliente)),
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
                                                    className: "flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 " + (isSelected ? 'bg-teal-50' : '')
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
                                                        className: "w-5 h-5 rounded text-teal-600"
                                                    }),
                                                    React.createElement("div", {className: "flex-1"},
                                                        React.createElement("span", {className: "font-medium text-gray-800"}, cliente.nome_display),
                                                        cliente.mascara && React.createElement("span", {className: "ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded"}, "Máscara")
                                                    ),
                                                    React.createElement("span", {className: "text-xs text-gray-400"}, "Cód: ", cliente.cod_cliente)
                                                );
                                            })
                                    ),
                                (incentivoForm.clientes_vinculados || []).length > 0 && React.createElement("p", {className: "text-xs text-teal-700 mt-2"}, 
                                    "✓ ", (incentivoForm.clientes_vinculados || []).length, " cliente(s) selecionado(s)"
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
                                }, "🟢 Ativo"),
                                React.createElement("button", {
                                    type: "button",
                                    onClick: () => setIncentivoForm(f => ({...f, status: 'pausado'})),
                                    className: "flex-1 px-4 py-3 rounded-xl font-semibold transition-colors " +
                                        ((incentivoForm.status || incentivoEdit?.status) === 'pausado' 
                                            ? "bg-yellow-500 text-white" 
                                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200")
                                }, "⏸️ Pausado")
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
                            className: "flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        }, incentivoEdit ? "💾 Salvar Alterações" : "➕ Criar Demanda")
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
                    }, "✕"),
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
