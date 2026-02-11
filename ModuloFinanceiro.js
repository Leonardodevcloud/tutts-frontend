// MÓDULO FINANCEIRO - TUTTS v2.0
(function() {
    'use strict';
    
    window.formatarMoeda = window.formatarMoeda || function(valor) {
        return parseFloat(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    };
    
    window.parseSaldoBR = window.parseSaldoBR || function(valor) {
        if (typeof valor === "number") return valor;
        if (!valor) return 0;
        const str = String(valor);
        return str.includes(",") ? parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0 : parseFloat(str) || 0;
    };
    
    window.renderModuloFinanceiro = function(props) {
        const {
            c, s, p, x, q, U, Q, H, Z, Y, K, X, z, B, V, J,
            A, S, j, C, k, P, T, D, L, I, F, $, M, O, G, W,
            ee, te, ae, le, re, oe, ce, se, ne, me,
            // Planilha de profissionais com cidades (NOVO)
            planilhaProfissionais, cidadesIndicacao,
            Me, Oe, qe, Ue, ze, Be,
            Ke, Xe, Ze, Ye, et, tt, at, lt, it, dt, ut, gt, bt, Rt,
            nt, mt, rt, ot, pt, xt, ct, st, Qe, He, Ge, We,
            plificState, setPlificState, modalDebitoPlific, setModalDebitoPlific,
            debitoFormPlific, setDebitoFormPlific, saldoPlificUser, setSaldoPlificUser,
            solicitacoesPagina, setSolicitacoesPagina, conciliacaoPagina, setConciliacaoPagina,
            solicitacoesPorPagina, conciliacaoPorPagina, acertoRealizado, setAcertoRealizado,
            // Proteção contra débito duplicado
            processandoWithdrawals, setProcessandoWithdrawals,
            // Validação server-side
            validacaoData, setValidacaoData, validacaoLoading, setValidacaoLoading, carregarValidacao,
            // ⚡ Contadores do backend
            withdrawalCounts,
            l, Ee, he, o, f, E, e,
            er, ja, ul, fetchAuth, API_URL, navegarSidebar,
            HeaderCompacto, Toast, LoadingOverlay, PixQRCodeModal, i, n,
            elegibilidadeNovatos, setElegibilidadeNovatos, regioesNovatos, setRegioesNovatos,
            clientesBINovatos, setClientesBINovatos, clientesSelecionados, setClientesSelecionados,
            carregandoClientes, carregarClientesPorRegiao,
            socialProfile, relatorioNaoLido, setRelatorioNaoLido,
            relatorioImagemAmpliada, setRelatorioImagemAmpliada,
            relatoriosNaoLidos, setRelatoriosNaoLidos, marcarRelatorioComoLido,
            todoNotifModal, setTodoNotifModal, todoPendentesNotif,
            Ua, za, Ba, Va, Ja, Qa, Ha, Ga, Wa, Za, Ya, Ka, gl, vl, wl, _l, Cl,
            Rl, El, hl, fl, Nl, yl, bl, Jl, Hl, Gl, Ml, Ol, Sl, Tl, Fl, Pl,
            lancarDebitoPlific,
            consultarSaldoPlific,
            consultarSaldosLotePlific,
            exportarSaldosCSVPlific,
            fe, Ne, ye, ve, we, _e, je, Ce, Ae, Se, ke, Pe, Te, De, Le, Ie, Fe, $e,
            y, v, w, _
        } = props;
        
        // Helper para obter cidade do profissional logado (NOVO)
        const getCidadeProfissional = (codProfissional) => {
            if (!planilhaProfissionais || planilhaProfissionais.length === 0 || !codProfissional) return null;
            const prof = planilhaProfissionais.find(p => p.codigo === String(codProfissional));
            return prof ? prof.cidade : null;
        };
        
        // Cidade do usuário logado (para motoboys)
        const cidadeUsuarioLogado = l && l.role === "user" && (l.cod_profissional || l.codProfissional)
            ? getCidadeProfissional(l.cod_profissional || l.codProfissional) 
            : null;
        
        // ⚡ Contadores do backend (precisos, sem carregar todos os registros)
        const wc = withdrawalCounts || {};
        
        // Normalizar string para comparação (remove acentos, lowercase, trim)
        const normalizarTexto = (texto) => {
            if (!texto) return "";
            return texto.toString().toLowerCase().trim()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };
        
        // Filtrar promoções para mostrar apenas da região do motoboy (se for user)
        // Compara de forma flexível: a região da promoção deve conter a cidade do usuário
        const promocoesFiltradas = l && l.role === "user" && cidadeUsuarioLogado
            ? ee.filter(promo => {
                if (!promo.regiao) return false;
                const regiaoNorm = normalizarTexto(promo.regiao);
                const cidadeNorm = normalizarTexto(cidadeUsuarioLogado);
                // Match exato OU região contém a cidade OU cidade contém a região
                return regiaoNorm === cidadeNorm || 
                       regiaoNorm.includes(cidadeNorm) || 
                       cidadeNorm.includes(regiaoNorm);
            })
            : ee;
        
        // Debug - remover depois
        if (l && l.role === "user") {
            console.log("🔍 [DEBUG Indicações] Usuário:", l.cod_profissional || l.codProfissional);
            console.log("🔍 [DEBUG Indicações] Cidade do usuário:", cidadeUsuarioLogado);
            console.log("🔍 [DEBUG Indicações] Total promoções:", ee.length);
            console.log("🔍 [DEBUG Indicações] Promoções filtradas:", promocoesFiltradas.length);
            console.log("🔍 [DEBUG Indicações] Planilha carregada:", planilhaProfissionais?.length || 0, "profissionais");
        }
        
        // ========== FUNÇÃO EXPORTAR VALIDAÇÃO EXCEL ==========
        const exportarValidacaoExcel = () => {
            const tipoFiltro = p.validacaoTipo || "solicitacao";
            const dataInicio = p.validacaoDataInicio;
            const dataFim = p.validacaoDataFim;
            
            // Aplicar os mesmos filtros da visualização
            const dadosFiltrados = q.filter(item => {
                if (!dataInicio && !dataFim) return true;
                let dataComparacao;
                const toLocalDate = (dt) => { const d = new Date(dt); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
                if (tipoFiltro === "solicitacao") {
                    if (!item.created_at) return false;
                    dataComparacao = toLocalDate(item.created_at);
                } else if (tipoFiltro === "lancamento") {
                    if (!item.lancamento_at) return false;
                    dataComparacao = toLocalDate(item.lancamento_at);
                } else {
                    if (!item.debito_plific_at) return false;
                    dataComparacao = toLocalDate(item.debito_plific_at);
                }
                if (dataInicio && dataFim) return dataComparacao >= dataInicio && dataComparacao <= dataFim;
                if (dataInicio) return dataComparacao >= dataInicio;
                return dataComparacao <= dataFim;
            });
            
            if (dadosFiltrados.length === 0) {
                ja("Nenhum dado encontrado com os filtros selecionados", "warning");
                return;
            }
            
            const formatarDataExcel = (dataISO) => {
                if (!dataISO) return "-";
                const dt = new Date(dataISO);
                return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            };
            
            const formatarValorExcel = (valor) => parseFloat(valor || 0).toFixed(2).replace(".", ",");
            
            const traduzirStatus = (status) => {
                const map = { "aprovado": "Aprovado", "aprovado_gratuidade": "Aprovado c/ Gratuidade", "rejeitado": "Rejeitado", "aguardando_aprovacao": "Aguardando" };
                return map[status] || status || "-";
            };
            
            const traduzirTipoFiltro = (tipo) => {
                const map = { "solicitacao": "Data da Solicitação", "lancamento": "Data de Lançamento", "debito": "Data do Débito" };
                return map[tipo] || tipo;
            };
            
            // Estatísticas
            const totalAprovadas = dadosFiltrados.filter(e => e.status === "aprovado" || e.status === "aprovado_gratuidade").length;
            const totalSemGrat = dadosFiltrados.filter(e => e.status === "aprovado").length;
            const totalComGrat = dadosFiltrados.filter(e => e.status === "aprovado_gratuidade").length;
            const totalRejeitadas = dadosFiltrados.filter(e => e.status === "rejeitado").length;
            const valorTotal = dadosFiltrados.filter(e => e.status?.includes("aprovado")).reduce((a, e) => a + parseFloat(e.requested_amount || 0), 0);
            
            // Construir dados Excel
            const dadosExcel = [];
            dadosExcel.push(["RELATÓRIO DE VALIDAÇÃO - TUTTS"]);
            dadosExcel.push(["Gerado em:", new Date().toLocaleString("pt-BR")]);
            dadosExcel.push(["Filtro:", traduzirTipoFiltro(tipoFiltro)]);
            
            if (dataInicio && dataFim && dataInicio === dataFim) {
                dadosExcel.push(["Período:", new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR")]);
            } else if (dataInicio && dataFim) {
                dadosExcel.push(["Período:", new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR") + " até " + new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR")]);
            } else {
                dadosExcel.push(["Período:", "Todos"]);
            }
            
            dadosExcel.push([]);
            dadosExcel.push(["=== RESUMO ==="]);
            dadosExcel.push(["Total Registros:", dadosFiltrados.length]);
            dadosExcel.push(["Total Aprovadas:", totalAprovadas]);
            dadosExcel.push(["Sem Gratuidade:", totalSemGrat]);
            dadosExcel.push(["Com Gratuidade:", totalComGrat]);
            dadosExcel.push(["Rejeitadas:", totalRejeitadas]);
            dadosExcel.push(["Valor Total Aprovado:", "R$ " + formatarValorExcel(valorTotal)]);
            dadosExcel.push(["Taxa (4.5%):", "R$ " + formatarValorExcel(valorTotal * 0.045)]);
            dadosExcel.push([]);
            dadosExcel.push([]);
            
            // Cabeçalho tabela
            dadosExcel.push(["ID", "Código", "Nome", "CPF", "Data Solicitação", "Data Aprovação", "Data Lançamento", "Data Débito", "Valor Solicitado", "Valor Final", "Taxa", "Status", "Gratuidade", "OMIE"]);
            
            // Dados
            dadosFiltrados.forEach(item => {
                const valSolic = parseFloat(item.requested_amount || 0);
                dadosExcel.push([
                    item.id || "-",
                    item.user_cod || "-",
                    item.user_name || "-",
                    item.cpf || "-",
                    formatarDataExcel(item.created_at),
                    formatarDataExcel(item.approved_at),
                    formatarDataExcel(item.lancamento_at),
                    formatarDataExcel(item.debito_plific_at),
                    valSolic,
                    parseFloat(item.final_amount || 0),
                    valSolic * 0.045,
                    traduzirStatus(item.status),
                    item.has_gratuity ? "Sim" : "Não",
                    item.conciliacao_omie ? "Sim" : "Não"
                ]);
            });
            
            // Criar e baixar Excel
            const ws = XLSX.utils.aoa_to_sheet(dadosExcel);
            ws["!cols"] = [{ wch: 8 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 10 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Validação");
            const nomeArquivo = "Validacao_" + tipoFiltro + "_" + new Date().toISOString().split("T")[0].replace(/-/g, "") + ".xlsx";
            XLSX.writeFile(wb, nomeArquivo);
            ja("Exportação concluída: " + dadosFiltrados.length + " registros", "success");
        };
        // ========== FIM FUNÇÃO EXPORTAR ==========
        
            return React.createElement("div", {
                className: "min-h-screen bg-gray-50"
            }, i && React.createElement(Toast, i), n && React.createElement(LoadingOverlay, null), 
            // Modal de Relatório Não Lido (ciência)
            relatorioNaoLido && React.createElement("div", {
                className: "fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
            },
                React.createElement("div", {className: "bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"},
                    // Header
                    React.createElement("div", {className: "bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 flex items-center gap-3"},
                        React.createElement("span", {className: "text-3xl"}, "📢"),
                        React.createElement("div", null,
                            React.createElement("h3", {className: "text-lg font-bold"}, "Novo Relatório Diário"),
                            React.createElement("p", {className: "text-teal-100 text-sm"}, 
                                relatoriosNaoLidos.length > 1 
                                    ? `${relatoriosNaoLidos.length} relatórios pendentes de leitura`
                                    : "1 relatório pendente de leitura"
                            )
                        )
                    ),
                    // Info do autor
                    React.createElement("div", {className: "p-4 bg-gray-50 border-b flex items-center gap-3"},
                        relatorioNaoLido.usuario_foto 
                            ? React.createElement("img", {
                                src: relatorioNaoLido.usuario_foto,
                                className: "w-12 h-12 rounded-full object-cover border-2 border-teal-200"
                            })
                            : React.createElement("div", {
                                className: "w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-lg"
                            }, (relatorioNaoLido.usuario_nome || "?").charAt(0).toUpperCase()),
                        React.createElement("div", null,
                            React.createElement("p", {className: "font-bold text-gray-800"}, relatorioNaoLido.titulo),
                            React.createElement("p", {className: "text-sm text-gray-500"}, 
                                relatorioNaoLido.usuario_nome, " • ", 
                                new Date(relatorioNaoLido.created_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })
                            )
                        )
                    ),
                    // Conteúdo
                    React.createElement("div", {className: "p-4 overflow-y-auto flex-1"},
                        React.createElement("div", {
                            className: "text-gray-700 whitespace-pre-wrap",
                            dangerouslySetInnerHTML: { __html: (relatorioNaoLido.conteudo || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/_(.*?)_/g, '<em>$1</em>') }
                        }),
                        relatorioNaoLido.imagem_url && React.createElement("div", {className: "mt-4"},
                            React.createElement("img", {
                                src: relatorioNaoLido.imagem_url,
                                className: "max-w-full rounded-lg shadow cursor-pointer hover:opacity-90",
                                onClick: () => setRelatorioImagemAmpliada(relatorioNaoLido.imagem_url)
                            })
                        )
                    ),
                    // Footer com botão de ciência
                    React.createElement("div", {className: "p-4 bg-gray-50 border-t"},
                        React.createElement("button", {
                            onClick: () => marcarRelatorioComoLido(relatorioNaoLido.id),
                            className: "w-full px-6 py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 flex items-center justify-center gap-2 shadow-lg"
                        }, "✅ Estou Ciente")
                    )
                )
            ),
            // Modal de imagem ampliada (relatório)
            relatorioImagemAmpliada && React.createElement("div", {
                className: "fixed inset-0 bg-black/90 flex items-center justify-center z-[110] p-4",
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
            ),
            V && React.createElement(PixQRCodeModal, {
                withdrawal: V,
                onClose: () => J(null),
                showToast: ja
            }), 
            // Modal de notificação de tarefas pendentes
            todoNotifModal && todoPendentesNotif.length > 0 && React.createElement("div", {
                className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            }, React.createElement("div", {
                className: "bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white"
            }, React.createElement("h2", {className: "text-xl font-bold flex items-center gap-2"}, "⚠️ Atenção!"),
                React.createElement("p", {className: "text-orange-100 text-sm"}, "Você possui tarefas pendentes")
            ), React.createElement("div", {className: "p-4 max-h-60 overflow-y-auto"},
                React.createElement("p", {className: "text-gray-600 mb-3"}, "📋 ", todoPendentesNotif.length, " tarefa(s) precisam da sua atenção:"),
                React.createElement("div", {className: "space-y-2"},
                    todoPendentesNotif.slice(0, 5).map(t => React.createElement("div", {
                        key: t.id,
                        className: "bg-orange-50 border-l-4 border-orange-500 p-3 rounded"
                    }, React.createElement("p", {className: "font-semibold text-gray-800"}, t.titulo),
                        t.data_prazo && React.createElement("p", {className: "text-xs text-orange-600"}, "📅 Vence: ", new Date(t.data_prazo).toLocaleDateString("pt-BR"))
                    ))
                ),
                todoPendentesNotif.length > 5 && React.createElement("p", {className: "text-sm text-gray-500 mt-2"}, "... e mais ", todoPendentesNotif.length - 5, " tarefa(s)")
            ), React.createElement("div", {className: "flex gap-3 p-4 border-t"},
                React.createElement("button", {
                    onClick: () => setTodoNotifModal(false),
                    className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                }, "Fechar"),
                React.createElement("button", {
                    onClick: () => { setTodoNotifModal(false); he("todo"); },
                    className: "flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                }, "📋 Ir para Tarefas")
            ))),
            // ========== HEADER COM NAVEGAÇÃO - FINANCEIRO ==========
            React.createElement(HeaderCompacto, {
                usuario: l,
                moduloAtivo: Ee,
                abaAtiva: p.finTab || "home-fin",
                socialProfile: socialProfile,
                isLoading: f,
                lastUpdate: E,
                onRefresh: ul,
                onLogout: () => o(null),
                onGoHome: () => he("home"),
                onNavigate: navegarSidebar,
                onChangeTab: (abaId) => x({...p, finTab: abaId})
            }),
            p.deleteConfirm && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
            }, React.createElement("h3", {
                className: "text-xl font-bold text-red-600 mb-4"
            }, "⚠️ Confirmar Exclusão"), React.createElement("p", {
                className: "text-gray-700 mb-2"
            }, "Tem certeza que deseja excluir esta solicitação?"), React.createElement("div", {
                className: "bg-gray-50 rounded-lg p-4 mb-4"
            }, React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Profissional:"), " ", p.deleteConfirm.user_name), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Código:"), " ", p.deleteConfirm.user_cod), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Valor:"), " ", er(p.deleteConfirm.requested_amount)), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Data:"), " ", new Date(p.deleteConfirm.created_at).toLocaleString("pt-BR"))), React.createElement("p", {
                className: "text-red-600 text-sm mb-4 font-semibold"
            }, "Esta ação não pode ser desfeita!"), React.createElement("div", {
                className: "flex gap-3"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    deleteConfirm: null
                }),
                className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            }, "Cancelar"), React.createElement("button", {
                onClick: () => (async e => {
                    try {
                        await fetchAuth(`${API_URL}/withdrawals/${e}`, {
                            method: "DELETE"
                        }), ja("🗑️ Solicitação excluída!", "success"), x({
                            ...p,
                            deleteConfirm: null
                        }), Ua()
                    } catch (e) {
                        ja("Erro ao excluir", "error")
                    }
                })(p.deleteConfirm.id),
                className: "flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            }, "🗑️ Excluir")))), 
            
            // =============================================
            // HOME FINANCEIRO - Página Inicial do Módulo
            // =============================================
            ("home-fin" === p.finTab || !p.finTab) && React.createElement("div", {className: "min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50"},
                // Hero Section com Logo
                React.createElement("div", {className: "flex flex-col items-center justify-center py-12"},
                    React.createElement("img", {
                        src: "https://github.com/Leonardodevcloud/tutts-frontend/blob/main/tutts%20FI.png?raw=true",
                        alt: "Tutts Financeiro",
                        className: "w-64 h-64 object-contain mb-6 drop-shadow-2xl"
                    }),
                    React.createElement("h1", {className: "text-3xl font-bold text-gray-800 mb-2"}, "Módulo Financeiro"),
                    React.createElement("p", {className: "text-gray-500 text-center max-w-xl"}, 
                        "Gestão completa de saques, gratuidades, validações e controle financeiro dos profissionais."
                    )
                ),
                
                // Cards de Navegação
                React.createElement("div", {className: "max-w-6xl mx-auto px-6 pb-12"},
                    React.createElement("div", {className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"},
                        
                        // Card Solicitações
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "solicitacoes"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-green-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-green-500 to-emerald-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative"},
                                    React.createElement("span", {className: "text-3xl"}, "📋"),
                                    y.solicitacoes > 0 && React.createElement("span", {className: "absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"}, y.solicitacoes > 9 ? "9+" : y.solicitacoes)
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Solicitações"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Saques emergenciais pendentes de aprovação e histórico completo.")
                            )
                        ),
                        
                        // Card Validação
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "validacao"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-blue-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-blue-500 to-cyan-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative"},
                                    React.createElement("span", {className: "text-3xl"}, "📊"),
                                    y.validacao > 0 && React.createElement("span", {className: "absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"}, y.validacao > 9 ? "9+" : y.validacao)
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Validação"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Aprovação de ajustes de OS e retornos enviados pelos entregadores.")
                            )
                        ),
                        
                        // Card Conciliação
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "conciliacao"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-teal-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-teal-500 to-cyan-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"},
                                    React.createElement("span", {className: "text-3xl"}, "✅")
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Conciliação"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Marcar saques como efetivamente pagos e controle de pagamentos.")
                            )
                        ),
                        
                        // Card Resumo
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "resumo"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-purple-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-purple-500 to-violet-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"},
                                    React.createElement("span", {className: "text-3xl"}, "🔍")
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Resumo"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Busca detalhada por profissional com histórico completo de saques.")
                            )
                        ),
                        
                        // Card Gratuidades
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "gratuidades"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-pink-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-pink-500 to-rose-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative"},
                                    React.createElement("span", {className: "text-3xl"}, "🎁"),
                                    y.gratuidades > 0 && React.createElement("span", {className: "absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"}, y.gratuidades > 9 ? "9+" : y.gratuidades)
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Gratuidades"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Gerenciar saques gratuitos como premiações e bonificações.")
                            )
                        ),
                        
                        // Card Restritos
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "restritos"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-red-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-red-500 to-rose-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"},
                                    React.createElement("span", {className: "text-3xl"}, "🚫")
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Restritos"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Profissionais bloqueados de realizar saques emergenciais.")
                            )
                        ),
                        
                        // Card Indicações
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "indicacoes"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-amber-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-amber-500 to-orange-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"},
                                    React.createElement("span", {className: "text-3xl"}, "👥")
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Indicações"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Programa de indicação de novos profissionais e bonificações.")
                            )
                        ),
                        
                        // Card Promo Novatos
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "promo-novatos"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-indigo-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-indigo-500 to-blue-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"},
                                    React.createElement("span", {className: "text-3xl"}, "🚀")
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Promoções"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Promoções e campanhas especiais para novos entregadores.")
                            )
                        ),
                        
                        // Card Loja
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "loja"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-violet-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-violet-500 to-purple-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative"},
                                    React.createElement("span", {className: "text-3xl"}, "🛒"),
                                    y.loja > 0 && React.createElement("span", {className: "absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"}, y.loja > 9 ? "9+" : y.loja)
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Loja"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Lojinha Tutts com produtos, pedidos e gestão de estoque.")
                            )
                        ),
                        
                        // Card Relatórios
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "relatorios"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-cyan-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-cyan-500 to-teal-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"},
                                    React.createElement("span", {className: "text-3xl"}, "📈")
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Relatórios"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Relatórios gerenciais e exportação de dados financeiros.")
                            )
                        ),
                        
                        // Card Horários
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "horarios"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-sky-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-sky-500 to-blue-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-sky-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"},
                                    React.createElement("span", {className: "text-3xl"}, "🕐")
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Horários"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Configurar horários de funcionamento para saques.")
                            )
                        ),
                        
                        // Card Avisos
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "avisos"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-yellow-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-yellow-500 to-amber-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"},
                                    React.createElement("span", {className: "text-3xl"}, "📢")
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Avisos"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Comunicados e avisos para os profissionais no app.")
                            )
                        ),
                        
                        // Card Backup
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "backup"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border border-gray-100 hover:border-gray-300"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-gray-500 to-slate-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("div", {className: "w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"},
                                    React.createElement("span", {className: "text-3xl"}, "💾")
                                ),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2"}, "Backup"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Exportar e fazer backup dos dados do sistema.")
                            )
                        ),
                        React.createElement("div", {
                            onClick: () => { x({...p, finTab: "saldo-plific"}); },
                            className: "bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all cursor-pointer group overflow-hidden border border-purple-200"
                        },
                            React.createElement("div", {className: "h-2 bg-gradient-to-r from-purple-500 to-indigo-600"}),
                            React.createElement("div", {className: "p-6"},
                                React.createElement("span", {className: "text-3xl"}, "💳"),
                                React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-2 mt-2"}, "Saldo Plific"),
                                React.createElement("p", {className: "text-sm text-gray-500"}, "Consultar saldos.")
                            )
                        )
                    ),
                    
                    // Resumo Rápido com contadores
                    React.createElement("div", {className: "mt-10"},
                        React.createElement("h2", {className: "text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"},
                            React.createElement("span", null, "⚡"),
                            "Pendências"
                        ),
                        React.createElement("div", {className: "grid grid-cols-2 md:grid-cols-4 gap-4"},
                            React.createElement("div", {className: "bg-white rounded-xl p-4 shadow text-center border-l-4 border-green-500"},
                                React.createElement("p", {className: "text-3xl font-bold text-green-600"}, y.solicitacoes || 0),
                                React.createElement("p", {className: "text-xs text-gray-500"}, "Saques Pendentes")
                            ),
                            React.createElement("div", {className: "bg-white rounded-xl p-4 shadow text-center border-l-4 border-blue-500"},
                                React.createElement("p", {className: "text-3xl font-bold text-blue-600"}, y.validacao || 0),
                                React.createElement("p", {className: "text-xs text-gray-500"}, "Ajustes p/ Validar")
                            ),
                            React.createElement("div", {className: "bg-white rounded-xl p-4 shadow text-center border-l-4 border-pink-500"},
                                React.createElement("p", {className: "text-3xl font-bold text-pink-600"}, y.gratuidades || 0),
                                React.createElement("p", {className: "text-xs text-gray-500"}, "Gratuidades Pendentes")
                            ),
                            React.createElement("div", {className: "bg-white rounded-xl p-4 shadow text-center border-l-4 border-violet-500"},
                                React.createElement("p", {className: "text-3xl font-bold text-violet-600"}, y.loja || 0),
                                React.createElement("p", {className: "text-xs text-gray-500"}, "Pedidos Loja")
                            )
                        )
                    )
                )
            ),
            
            React.createElement("div", {
                className: "max-w-7xl mx-auto p-6"
            }, ("solicitacoes" === p.finTab) && React.createElement(React.Fragment, null, (() => {
                const e = e => {
                        const t = new Date(e),
                            a = t.getDay(),
                            l = t.getHours() + t.getMinutes() / 60;
                        return 0 !== a && (6 === a ? l >= 9 && l < 12 : l >= 9 && l < 18)
                    },
                    t = new Date;
                t.setHours(0, 0, 0, 0);
                const a = q.filter(e => new Date(e.created_at) >= t),
                    l = a.filter(e => "aguardando_aprovacao" !== e.status),
                    r = (a.filter(e => "aguardando_aprovacao" === e.status), a.filter(t => ("aprovado" === t.status || "aprovado_gratuidade" === t.status) && t.updated_at && t.created_at && e(t.created_at)).map(e => (new Date(e.updated_at) - new Date(e.created_at)) / 6e4).filter(e => e > 0 && e <= 1440)),
                    o = r.length > 0 ? Math.round(r.reduce((e, t) => e + t, 0) / r.length) : 0,
                    c = a.filter(t => "aguardando_aprovacao" === t.status && e(t.created_at) && Date.now() - new Date(t.created_at).getTime() >= 36e5),
                    s = 0 === c.length ? 100 : Math.max(0, 100 - 20 * c.length),
                    n = o <= 30 ? 100 : o <= 60 ? 80 : o <= 120 ? 60 : 40,
                    m = Math.round((s + n) / 2);
                return React.createElement(React.Fragment, null, React.createElement("div", {
                    className: "bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 mb-6 text-white"
                }, React.createElement("div", {
                    className: "flex flex-col md:flex-row items-center gap-6"
                }, React.createElement("div", {
                    className: "relative w-32 h-32"
                }, React.createElement("svg", {
                    className: "w-32 h-32 transform -rotate-90"
                }, React.createElement("circle", {
                    cx: "64",
                    cy: "64",
                    r: "56",
                    stroke: "rgba(255,255,255,0.2)",
                    strokeWidth: "12",
                    fill: "none"
                }), React.createElement("circle", {
                    cx: "64",
                    cy: "64",
                    r: "56",
                    stroke: m >= 80 ? "#10b981" : m >= 50 ? "#f59e0b" : "#ef4444",
                    strokeWidth: "12",
                    fill: "none",
                    strokeDasharray: 3.52 * m + " 352",
                    strokeLinecap: "round"
                })), React.createElement("div", {
                    className: "absolute inset-0 flex flex-col items-center justify-center"
                }, React.createElement("span", {
                    className: "text-3xl font-bold"
                }, m), React.createElement("span", {
                    className: "text-xs opacity-70"
                }, "SCORE"))), React.createElement("div", {
                    className: "flex-1 grid grid-cols-2 md:grid-cols-4 gap-4"
                }, React.createElement("div", {
                    className: "bg-white/10 rounded-lg p-3 text-center"
                }, React.createElement("p", {
                    className: "text-white/70 text-xs"
                }, "Hoje"), React.createElement("p", {
                    className: "text-2xl font-bold"
                }, a.length), React.createElement("p", {
                    className: "text-xs text-white/60"
                }, l.length, " processadas")), React.createElement("div", {
                    className: "bg-white/10 rounded-lg p-3 text-center"
                }, React.createElement("p", {
                    className: "text-white/70 text-xs"
                }, "Tempo Médio"), React.createElement("p", {
                    className: "text-2xl font-bold"
                }, o < 60 ? `${o}min` : `${Math.floor(o/60)}h${o%60}m`), React.createElement("p", {
                    className: "text-xs " + (o <= 60 ? "text-green-300" : "text-red-300")
                }, o <= 30 ? "✅ Excelente" : o <= 60 ? "⚠️ Bom" : "🚨 Lento")), React.createElement("div", {
                    className: "bg-white/10 rounded-lg p-3 text-center"
                }, React.createElement("p", {
                    className: "text-white/70 text-xs"
                }, "Pendentes"), React.createElement("p", {
                    className: "text-2xl font-bold"
                }, q.filter(e => "aguardando_aprovacao" === e.status).length), React.createElement("p", {
                    className: "text-xs text-white/60"
                }, "aguardando")), React.createElement("div", {
                    className: "bg-white/10 rounded-lg p-3 text-center"
                }, React.createElement("p", {
                    className: "text-white/70 text-xs"
                }, "Prazo (1h)"), React.createElement("p", {
                    className: "text-2xl font-bold " + (0 === c.length ? "text-green-300" : "text-red-300")
                }, 0 === c.length ? "✅" : `${c.length} 🚨`), React.createElement("p", {
                    className: "text-xs text-white/60"
                }, 0 === c.length ? "Nenhum atraso" : "Ação necessária!"))))))
            })(), (() => {
                const e = q.filter(e => {
                    if ("aguardando_aprovacao" !== e.status) return !1;
                    return (Date.now() - new Date(e.created_at).getTime()) / 36e5 >= 1
                });
                return 0 === e.length ? null : React.createElement("div", {
                    className: "bg-red-50 border-2 border-red-400 rounded-xl p-4 mb-6 animate-pulse"
                }, React.createElement("div", {
                    className: "flex items-center gap-3"
                }, React.createElement("span", {
                    className: "text-3xl"
                }, "🚨"), React.createElement("div", {
                    className: "flex-1"
                }, React.createElement("p", {
                    className: "text-red-800 font-bold text-lg"
                }, "ATENÇÃO: ", e.length, " saque(s) aguardando há mais de 1 hora!"), React.createElement("p", {
                    className: "text-red-600 text-sm mt-1"
                }, "Profissionais aguardando: ", e.map(e => e.user_name || e.user_cod).join(", "))), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        filterStatus: "atrasados"
                    }),
                    className: "px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 whitespace-nowrap"
                }, "👀 Ver Atrasados")))
            })(), React.createElement("div", {
                className: "bg-white rounded-xl shadow overflow-hidden"
            }, React.createElement("div", {
                className: "p-4 border-b"
            }, React.createElement("div", {
                className: "flex flex-wrap gap-2"
            }, React.createElement("button", {
                onClick: () => { setSolicitacoesPagina(1); x({
                    ...p,
                    filterStatus: ""
                }); },
                className: "px-4 py-2 rounded-lg font-semibold text-sm " + (p.filterStatus ? "bg-gray-100 hover:bg-gray-200" : "bg-purple-600 text-white")
            }, "📋 Todas (", parseInt(wc.total) || q.length, ")"), React.createElement("button", {
                onClick: () => { setSolicitacoesPagina(1); x({
                    ...p,
                    filterStatus: "atrasados"
                }); },
                className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("atrasados" === p.filterStatus ? "bg-red-600 text-white" : "bg-gray-100 hover:bg-gray-200")
            }, "🚨 Atrasados (", parseInt(wc.atrasadas) || q.filter(e => "aguardando_aprovacao" === e.status && Date.now() - new Date(e.created_at).getTime() >= 36e5).length, ")"), React.createElement("button", {
                onClick: () => { setSolicitacoesPagina(1); x({
                    ...p,
                    filterStatus: "aguardando_aprovacao"
                }); },
                className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("aguardando_aprovacao" === p.filterStatus ? "bg-yellow-500 text-white" : "bg-gray-100 hover:bg-gray-200")
            }, "⏳ Aguardando (", parseInt(wc.aguardando) || q.filter(e => "aguardando_aprovacao" === e.status).length, ")"), React.createElement("button", {
                onClick: () => { setSolicitacoesPagina(1); x({
                    ...p,
                    filterStatus: "aprovado"
                }); 
                // ⚡ Carregar aprovadas sob demanda (não vem no init)
                if (q.filter(e => "aprovado" === e.status).length === 0) {
                    fetchAuth(`${API_URL}/withdrawals?status=approved&limit=200`).then(r => r.json()).then(data => { if (Array.isArray(data)) U([...q, ...data]); });
                }
                },
                className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("aprovado" === p.filterStatus ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-gray-200")
            }, "✅ Aprovadas (", parseInt(wc.aprovadas) || q.filter(e => "aprovado" === e.status).length, ")"), React.createElement("button", {
                onClick: () => { setSolicitacoesPagina(1); x({
                    ...p,
                    filterStatus: "aprovado_gratuidade"
                }); 
                if (q.filter(e => "aprovado_gratuidade" === e.status).length === 0) {
                    fetchAuth(`${API_URL}/withdrawals?status=aprovado_gratuidade&limit=200`).then(r => r.json()).then(data => { if (Array.isArray(data)) U([...q, ...data]); });
                }
                },
                className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("aprovado_gratuidade" === p.filterStatus ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200")
            }, "🎁 Aprov. Gratuidade (", parseInt(wc.gratuidade) || q.filter(e => "aprovado_gratuidade" === e.status).length, ")"), React.createElement("button", {
                onClick: () => { setSolicitacoesPagina(1); x({
                    ...p,
                    filterStatus: "rejeitado"
                }); 
                if (q.filter(e => "rejeitado" === e.status).length === 0) {
                    fetchAuth(`${API_URL}/withdrawals?status=rejected&limit=200`).then(r => r.json()).then(data => { if (Array.isArray(data)) U([...q, ...data]); });
                }
                },
                className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("rejeitado" === p.filterStatus ? "bg-red-600 text-white" : "bg-gray-100 hover:bg-gray-200")
            }, "❌ Rejeitadas (", parseInt(wc.rejeitadas) || q.filter(e => "rejeitado" === e.status).length, ")"), React.createElement("button", {
                onClick: () => { setSolicitacoesPagina(1); x({
                    ...p,
                    filterStatus: "inativo"
                }); },
                className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("inativo" === p.filterStatus ? "bg-orange-500 text-white" : "bg-gray-100 hover:bg-gray-200")
            }, "⚠️ Inativo (", q.filter(e => "inativo" === e.status).length, ")"),
            // Toggle de Acerto
            React.createElement("div", {
                className: "ml-auto flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2"
            },
                React.createElement("span", {
                    className: "text-xs font-medium " + (acertoRealizado ? "text-gray-400" : "text-orange-600 font-bold")
                }, "Acerto Pendente"),
                React.createElement("button", {
                    onClick: () => { const novoValor = !acertoRealizado; setAcertoRealizado(novoValor); try { localStorage.setItem("tutts_acerto_realizado", JSON.stringify(novoValor)); } catch(e) {} },
                    className: "relative w-12 h-6 rounded-full transition-colors " + (acertoRealizado ? "bg-green-500" : "bg-orange-500")
                },
                    React.createElement("span", {
                        className: "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform " + (acertoRealizado ? "right-1" : "left-1")
                    })
                ),
                React.createElement("span", {
                    className: "text-xs font-medium " + (acertoRealizado ? "text-green-600 font-bold" : "text-gray-400")
                }, "Acerto Realizado")
            )
        )), z.length > 0 && React.createElement("div", {
                className: "bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 mb-4 shadow-lg"
            }, React.createElement("div", {
                className: "flex items-center justify-between flex-wrap gap-4"
            }, React.createElement("div", {
                className: "flex items-center gap-4"
            }, React.createElement("div", {
                className: "bg-white/20 rounded-lg px-4 py-2"
            }, React.createElement("p", {
                className: "text-white/70 text-xs"
            }, "Selecionadas"), React.createElement("p", {
                className: "text-white text-2xl font-bold"
            }, z.length)), React.createElement("div", {
                className: "bg-white/20 rounded-lg px-4 py-2"
            }, React.createElement("p", {
                className: "text-white/70 text-xs"
            }, "Total Solicitado"), React.createElement("p", {
                className: "text-white text-2xl font-bold"
            }, er(q.filter(e => z.includes(e.id)).reduce((e, t) => e + parseFloat(t.requested_amount || 0), 0)))), React.createElement("div", {
                className: "bg-white/20 rounded-lg px-4 py-2"
            }, React.createElement("p", {
                className: "text-white/70 text-xs"
            }, "Total Profissional"), React.createElement("p", {
                className: "text-white text-2xl font-bold"
            }, er(q.filter(e => z.includes(e.id)).reduce((e, t) => e + parseFloat(t.final_amount || 0), 0))))), React.createElement("button", {
                onClick: () => B([]),
                className: "bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            }, "✕ Limpar seleção"))), React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-sm table-fixed"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-2 py-3 text-center w-[40px]"
            }, React.createElement("input", {
                type: "checkbox",
                checked: q.filter(e => !p.filterStatus || ("atrasados" === p.filterStatus ? "aguardando_aprovacao" === e.status && Date.now() - new Date(e.created_at).getTime() >= 36e5 : e.status === p.filterStatus)).length > 0 && q.filter(e => !p.filterStatus || ("atrasados" === p.filterStatus ? "aguardando_aprovacao" === e.status && Date.now() - new Date(e.created_at).getTime() >= 36e5 : e.status === p.filterStatus)).every(e => z.includes(e.id)),
                onChange: e => {
                    const t = q.filter(e => !p.filterStatus || ("atrasados" === p.filterStatus ? "aguardando_aprovacao" === e.status && Date.now() - new Date(e.created_at).getTime() >= 36e5 : e.status === p.filterStatus));
                    e.target.checked ? B([...new Set([...z, ...t.map(e => e.id)])]) : B(z.filter(e => !t.map(e => e.id).includes(e)))
                },
                className: "w-4 h-4",
                title: "Selecionar todos"
            })), React.createElement("th", {
                className: "px-2 py-3 text-left w-[90px]"
            }, "Data"), React.createElement("th", {
                className: "px-2 py-3 text-left w-[140px]"
            }, "Nome"), React.createElement("th", {
                className: "px-2 py-3 text-left w-[110px]"
            }, "CPF"), React.createElement("th", {
                className: "px-2 py-3 text-left w-[70px]"
            }, "Código"), React.createElement("th", {
                className: "px-2 py-3 text-right w-[90px]"
            }, "Solicitado"), React.createElement("th", {
                className: "px-2 py-3 text-right w-[90px]"
            }, "Valor Prof."), React.createElement("th", {
                className: "px-2 py-3 text-left w-[120px]"
            }, "PIX"), React.createElement("th", {
                className: "px-2 py-3 text-center w-[160px]"
            }, "Status"), React.createElement("th", {
                className: "px-2 py-3 text-center w-[100px]"
            }, "Débito"), React.createElement("th", {
                className: "px-2 py-3 text-center w-[50px]"
            }, "Ações"))), React.createElement("tbody", null, (() => {
                // Filtra por status
                const filtradas = q.filter(e => !p.filterStatus || ("atrasados" === p.filterStatus ? "aguardando_aprovacao" === e.status && Date.now() - new Date(e.created_at).getTime() >= 36e5 : e.status === p.filterStatus));
                // Aplica paginação
                const inicio = (solicitacoesPagina - 1) * solicitacoesPorPagina;
                const fim = inicio + solicitacoesPorPagina;
                const paginadas = filtradas.slice(inicio, fim);
                return paginadas;
            })().map(e => {
                const t = "aguardando_aprovacao" === e.status && Date.now() - new Date(e.created_at).getTime() >= 36e5,
                    a = Math.floor((Date.now() - new Date(e.created_at).getTime()) / 6e4),
                    l = Math.floor(a / 60),
                    r = a % 60,
                    o = "aprovado" === e.status,
                    c = "aprovado_gratuidade" === e.status,
                    s = "rejeitado" === e.status,
                    n = s ? "font-bold text-red-800 bg-red-100" : c ? "font-bold text-blue-800 bg-blue-100 border-l-4 border-l-blue-500" : o ? "font-bold bg-green-100" : "",
                    m = new Date(e.created_at),
                    i = m.toLocaleDateString("pt-BR"),
                    d = m.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit"
                    });
                return React.createElement("tr", {
                    key: e.id,
                    className: `border-t hover:bg-gray-50 ${z.includes(e.id)?"bg-purple-50":""} ${!t||s||o||c?"":"bg-red-50 border-l-4 border-l-red-500"} ${n} ${!e.has_gratuity||o||s||c?"":"row-blue"} ${e.is_restricted&&!s?"row-red":""}`
                }, React.createElement("td", {
                    className: "px-2 py-3 text-center"
                }, React.createElement("input", {
                    type: "checkbox",
                    checked: z.includes(e.id),
                    onChange: t => {
                        t.target.checked ? B([...z, e.id]) : B(z.filter(t => t !== e.id))
                    },
                    className: "w-4 h-4"
                })), React.createElement("td", {
                    className: "px-2 py-3 text-xs " + (s ? "text-red-800 font-bold" : c ? "text-blue-800 font-bold" : o ? "text-green-800 font-bold" : "")
                }, React.createElement("div", {
                    className: "flex flex-col"
                }, React.createElement("span", {
                    className: "font-medium"
                }, i), React.createElement("span", {
                    className: "text-[10px] text-gray-500"
                }, d)), "aguardando_aprovacao" === e.status && React.createElement("div", {
                    className: "mt-1 px-2 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1 " + (t ? "bg-red-500 text-white animate-pulse" : a >= 90 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600")
                }, t ? "🚨" : a >= 90 ? "⚠️" : "⏱️", l > 0 ? `${l}h ${r}m` : `${r}min`, t && React.createElement("span", {
                    className: "text-[10px] ml-1"
                }, "ATRASADO"))), React.createElement("td", {
                    className: "px-2 py-3 text-xs " + (s ? "text-red-800 font-bold" : c ? "text-blue-800 font-bold" : o ? "text-green-800 font-bold" : "")
                }, React.createElement("span", {className: "block max-w-[100px] break-words leading-tight"}, e.user_name)), React.createElement("td", {
                    className: "px-2 py-3 text-xs " + (s ? "text-red-800 font-bold" : c ? "text-blue-800 font-bold" : o ? "text-green-800 font-bold" : "")
                }, e.cpf), React.createElement("td", {
                    className: "px-2 py-3 font-mono text-xs " + (s ? "text-red-800 font-bold" : c ? "text-blue-800 font-bold" : o ? "text-green-800 font-bold" : "")
                }, e.user_cod), React.createElement("td", {
                    className: "px-2 py-3 text-right text-xs " + (s ? "text-red-800 font-bold" : c ? "text-blue-800 font-bold" : o ? "text-green-800 font-bold" : "font-semibold")
                }, er(e.requested_amount)), React.createElement("td", {
                    className: "px-2 py-3 text-right text-xs " + (s ? "text-red-800 font-bold" : c ? "text-blue-800 font-bold" : o ? "text-green-800 font-bold" : "")
                }, er(e.final_amount)), React.createElement("td", {
                    className: "px-2 py-3 " + (s ? "text-red-800 font-bold" : c ? "text-blue-800 font-bold" : o ? "text-green-800 font-bold" : "")
                }, React.createElement("div", {
                    className: "flex items-center gap-1"
                }, React.createElement("span", {
                    className: "text-[10px] truncate flex-1",
                    title: e.pix_key
                }, e.pix_key), !s && React.createElement("button", {
                    onClick: () => { console.log("🔍 Clicou QR PIX:", e); J(e); },
                    className: "text-lg hover:scale-125 transition-transform",
                    title: "Gerar QR Code PIX"
                }, "💠")), e.has_gratuity && React.createElement("p", {
                    className: "text-[10px] font-bold text-blue-700 mt-0.5"
                }, "🎁 GRATUIDADE")), React.createElement("td", {
                    className: "px-2 py-3"
                }, React.createElement("select", {
                    value: p[`showReject_${e.id}`] ? "rejeitado" : e.status,
                    onChange: t => {
                        const novoStatus = t.target.value;
                        const withdrawalId = e.id;
                        
                        // =============== PROTEÇÃO: VERIFICAR SE ESTÁ PROCESSANDO ===============
                        if (p[`processing_${withdrawalId}`]) {
                            ja("⏳ Aguarde o processamento atual...", "warning");
                            t.target.value = e.status; // Reverter para valor original
                            return;
                        }
                        
                        // =============== PROTEÇÃO: VERIFICAR SE JÁ ESTÁ APROVADO ===============
                        if (novoStatus === "aprovado" || novoStatus === "aprovado_gratuidade") {
                            // Verificar se já está aprovado
                            if (e.status === "aprovado" || e.status === "aprovado_gratuidade") {
                                ja("⚠️ Este saque já está aprovado!", "warning");
                                t.target.value = e.status;
                                return;
                            }
                            
                            // Pedir confirmação antes de aprovar
                            if (!confirm(`Confirma a aprovação do saque de ${er(e.requested_amount)} para ${e.user_name}?\n\nEsta ação realizará o DÉBITO automaticamente e não pode ser desfeita.`)) {
                                t.target.value = e.status;
                                return;
                            }
                        }
                        
                        // Processar mudança de status
                        if (novoStatus === "rejeitado") {
                            x({
                                ...p,
                                [`showReject_${withdrawalId}`]: true,
                                [`pendingStatus_${withdrawalId}`]: novoStatus
                            });
                        } else {
                            Jl(withdrawalId, novoStatus);
                        }
                    },
                    // =============== DESABILITAR DURANTE PROCESSAMENTO OU JÁ APROVADO ===============
                    disabled: p[`processing_${e.id}`] || e.status === "aprovado" || e.status === "aprovado_gratuidade",
                    className: "px-1 py-1 border rounded text-xs w-full " + 
                        (p[`processing_${e.id}`] ? "opacity-50 cursor-not-allowed bg-yellow-50 animate-pulse" : "") +
                        ((e.status === "aprovado" || e.status === "aprovado_gratuidade") ? "bg-green-50 cursor-not-allowed text-green-700" : "")
                }, 
                // Mostrar "Processando..." se estiver processando
                p[`processing_${e.id}`] ? React.createElement("option", {
                    value: e.status
                }, "⏳ Processando...") : React.createElement(React.Fragment, null,
                    React.createElement("option", {
                        value: "aguardando_aprovacao"
                    }, "⏳ Aguardando"), 
                    // Mostrar "Aprovado" apenas para saques SEM gratuidade
                    !e.has_gratuity && React.createElement("option", {
                        value: "aprovado"
                    }, "✅ Aprovado"), 
                    // Mostrar "c/ Gratuidade" apenas para saques COM gratuidade
                    e.has_gratuity && React.createElement("option", {
                        value: "aprovado_gratuidade"
                    }, "✅ c/ Gratuidade"), 
                    React.createElement("option", {
                        value: "rejeitado"
                    }, "❌ Rejeitado"), 
                    React.createElement("option", {
                        value: "inativo"
                    }, "⚠️ Inativo")
                )), p[`showReject_${e.id}`] && React.createElement("div", {
                    className: "mt-2 space-y-2"
                }, React.createElement("input", {
                    type: "text",
                    placeholder: "Motivo da rejeição...",
                    value: p[`reject_${e.id}`] || "",
                    onChange: t => x({
                        ...p,
                        [`reject_${e.id}`]: t.target.value
                    }),
                    className: "w-full px-2 py-1 border rounded text-xs"
                }), React.createElement("div", {
                    className: "flex gap-1"
                }, React.createElement("button", {
                    onClick: () => {
                        p[`reject_${e.id}`] ? Jl(e.id, "rejeitado", p[`reject_${e.id}`]) : ja("Informe o motivo", "error")
                    },
                    className: "flex-1 px-2 py-1 bg-red-600 text-white rounded text-xs"
                }, "Confirmar"), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        [`showReject_${e.id}`]: !1
                    }),
                    className: "px-2 py-1 bg-gray-400 text-white rounded text-xs"
                }, "✕"))), e.reject_reason && "rejeitado" === e.status && React.createElement("p", {
                    className: "text-[10px] text-red-600 mt-1 truncate"
                }, "Motivo: ", e.reject_reason), e.admin_name && "aguardando_aprovacao" !== e.status && React.createElement("p", {
                    className: "text-[10px] text-purple-600 mt-1 font-medium"
                }, "👤 ", e.admin_name)), 
                // Célula de Data do Débito
                React.createElement("td", {
                    className: "px-2 py-3 text-center text-xs"
                }, e.debito_plific_at ? React.createElement("div", {className: "flex flex-col"},
                    React.createElement("span", {className: "font-medium text-green-600"}, new Date(e.debito_plific_at).toLocaleDateString("pt-BR")),
                    React.createElement("span", {className: "text-[10px] text-gray-500"}, new Date(e.debito_plific_at).toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"}))
                ) : (e.status === "aprovado" || e.status === "aprovado_gratuidade") ? React.createElement("span", {className: "text-orange-500"}, "Pendente") : React.createElement("span", {className: "text-gray-400"}, "-")),
                React.createElement("td", {
                    className: "px-2 py-3 text-center"
                }, React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        deleteConfirm: e
                    }),
                    className: "px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700",
                    title: "Excluir"
                }, "🗑️")))
            }))), 
            // Controles de paginação
            (() => {
                const filtradas = q.filter(e => !p.filterStatus || ("atrasados" === p.filterStatus ? "aguardando_aprovacao" === e.status && Date.now() - new Date(e.created_at).getTime() >= 36e5 : e.status === p.filterStatus));
                const totalPaginas = Math.ceil(filtradas.length / solicitacoesPorPagina);
                if (totalPaginas <= 1) return null;
                return React.createElement("div", {
                    className: "flex items-center justify-between bg-white rounded-xl shadow p-4 mt-4"
                }, 
                    React.createElement("div", { className: "text-sm text-gray-600" },
                        `Mostrando ${Math.min((solicitacoesPagina - 1) * solicitacoesPorPagina + 1, filtradas.length)}-${Math.min(solicitacoesPagina * solicitacoesPorPagina, filtradas.length)} de ${filtradas.length} solicitações`
                    ),
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("button", {
                            onClick: () => setSolicitacoesPagina(1),
                            disabled: solicitacoesPagina === 1,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (solicitacoesPagina === 1 ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
                        }, "⏮️"),
                        React.createElement("button", {
                            onClick: () => setSolicitacoesPagina(p => Math.max(1, p - 1)),
                            disabled: solicitacoesPagina === 1,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (solicitacoesPagina === 1 ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
                        }, "◀️ Anterior"),
                        React.createElement("span", { className: "px-4 py-1 bg-purple-100 text-purple-700 rounded font-bold" },
                            `${solicitacoesPagina} / ${totalPaginas}`
                        ),
                        React.createElement("button", {
                            onClick: () => setSolicitacoesPagina(p => Math.min(totalPaginas, p + 1)),
                            disabled: solicitacoesPagina === totalPaginas,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (solicitacoesPagina === totalPaginas ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
                        }, "Próxima ▶️"),
                        React.createElement("button", {
                            onClick: () => setSolicitacoesPagina(totalPaginas),
                            disabled: solicitacoesPagina === totalPaginas,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (solicitacoesPagina === totalPaginas ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
                        }, "⏭️")
                    )
                );
            })()
            ))), "validacao" === p.finTab && React.createElement(React.Fragment, null, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4 mb-6"
            }, React.createElement("div", {
                className: "flex flex-wrap gap-4 items-end"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Filtrar por"), React.createElement("select", {
                value: p.validacaoTipo || "solicitacao",
                onChange: e => {
                    x({ ...p, validacaoTipo: e.target.value });
                    if (p.validacaoDataInicio && p.validacaoDataFim) carregarValidacao(e.target.value, p.validacaoDataInicio, p.validacaoDataFim);
                },
                className: "px-4 py-2 border rounded-lg"
            }, React.createElement("option", {
                value: "solicitacao"
            }, "📅 Data da Solicitação"), React.createElement("option", {
                value: "lancamento"
            }, "📝 Data de Lançamento"), React.createElement("option", {
                value: "debito"
            }, "💳 Data do Débito"))), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Data Início"), React.createElement("input", {
                type: "date",
                value: p.validacaoDataInicio || "",
                onChange: e => {
                    const novoInicio = e.target.value;
                    x({ ...p, validacaoDataInicio: novoInicio });
                    if (novoInicio && p.validacaoDataFim) carregarValidacao(p.validacaoTipo || "solicitacao", novoInicio, p.validacaoDataFim);
                },
                className: "px-4 py-2 border rounded-lg"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Data Fim"), React.createElement("input", {
                type: "date",
                value: p.validacaoDataFim || "",
                onChange: e => {
                    const novoFim = e.target.value;
                    x({ ...p, validacaoDataFim: novoFim });
                    if (p.validacaoDataInicio && novoFim) carregarValidacao(p.validacaoTipo || "solicitacao", p.validacaoDataInicio, novoFim);
                },
                className: "px-4 py-2 border rounded-lg"
            })), React.createElement("button", {
                onClick: () => {
                    const now = new Date();
                    const e = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
                    x({ ...p, validacaoDataInicio: e, validacaoDataFim: e });
                    carregarValidacao(p.validacaoTipo || "solicitacao", e, e);
                },
                className: "px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            }, "📆 Hoje"), React.createElement("button", {
                onClick: () => {
                    x({ ...p, validacaoDataInicio: "", validacaoDataFim: "" });
                    setValidacaoData(null);
                },
                className: "px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            }, "🔄 Limpar"), React.createElement("button", {
                onClick: exportarValidacaoExcel,
                className: "px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            }, "📥 Exportar Excel"))), validacaoLoading ? React.createElement("div", { className: "flex items-center justify-center py-12" }, React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" }), React.createElement("span", { className: "ml-3 text-gray-600" }, "Carregando validação...")) : (() => {
                const e = p.validacaoTipo || "solicitacao",
                    t = p.validacaoDataInicio,
                    a = p.validacaoDataFim,
                    l = (t && a && validacaoData) ? validacaoData : q.filter(l => {
                        if (!t && !a) return !0;
                        let r;
                        const toLocalDate = (dt) => { const d = new Date(dt); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
                        if ("solicitacao" === e) {
                            if (!l.created_at) return !1;
                            r = toLocalDate(l.created_at);
                        } else if ("lancamento" === e) {
                            if (!l.lancamento_at) return !1;
                            r = toLocalDate(l.lancamento_at);
                        } else {
                            if (!l.debito_plific_at) return !1;
                            r = toLocalDate(l.debito_plific_at);
                        }
                        return t && a ? r >= t && r <= a : t ? r >= t : !a || r <= a
                    }),
                    r = l.length,
                    o = l.filter(e => "rejeitado" === e.status).length,
                    c = l.filter(e => "aprovado" === e.status || "aprovado_gratuidade" === e.status).length,
                    s = l.filter(e => "aprovado" === e.status).length,
                    n = l.filter(e => "aprovado_gratuidade" === e.status).length,
                    m = l.filter(e => "aprovado" === e.status).reduce((e, t) => e + parseFloat(t.requested_amount || 0), 0),
                    i = .045 * m,
                    d = l.filter(e => "aprovado_gratuidade" === e.status).reduce((e, t) => e + parseFloat(t.requested_amount || 0), 0),
                    x = .045 * d,
                    u = m + d;
                return React.createElement(React.Fragment, null, React.createElement("div", {
                    className: "bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
                }, React.createElement("p", {
                    className: "text-blue-800 font-semibold"
                }, "solicitacao" === e ? "📅 Filtrando por Data da Solicitação" : "lancamento" === e ? "📝 Filtrando por Data de Lançamento" : "💳 Filtrando por Data do Débito", t && a && t === a && ` - ${new Date(t+"T12:00:00").toLocaleDateString("pt-BR")}`, t && a && t !== a && ` - ${new Date(t+"T12:00:00").toLocaleDateString("pt-BR")} até ${new Date(a+"T12:00:00").toLocaleDateString("pt-BR")}`, !t && !a && " - Todos os períodos")), React.createElement("div", {
                    className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4"
                }, React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4 border-l-4 border-gray-500"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "📥 Total Recebidas"), React.createElement("p", {
                    className: "text-3xl font-bold text-gray-700"
                }, r)), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4 border-l-4 border-green-500"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "✅ Total Aprovadas"), React.createElement("p", {
                    className: "text-3xl font-bold text-green-600"
                }, c)), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4 border-l-4 border-blue-500"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "✅ Sem Gratuidade"), React.createElement("p", {
                    className: "text-3xl font-bold text-blue-600"
                }, s)), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4 border-l-4 border-purple-500"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "🎁 Com Gratuidade"), React.createElement("p", {
                    className: "text-3xl font-bold text-purple-600"
                }, n)), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4 border-l-4 border-red-500"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "❌ Rejeitadas"), React.createElement("p", {
                    className: "text-3xl font-bold text-red-600"
                }, o))), React.createElement("div", {
                    className: "grid grid-cols-1 md:grid-cols-3 gap-4"
                }, React.createElement("div", {
                    className: "bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow p-6 text-white"
                }, React.createElement("p", {
                    className: "text-sm opacity-90"
                }, "💵 Valor Total Aprovado"), React.createElement("p", {
                    className: "text-4xl font-bold mt-2"
                }, er(u)), React.createElement("p", {
                    className: "text-xs opacity-75 mt-2"
                }, "Soma de ", c, " aprovações (com + sem gratuidade)")), React.createElement("div", {
                    className: "bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow p-6 text-white"
                }, React.createElement("p", {
                    className: "text-sm opacity-90"
                }, "💰 Lucro com Saque (4,5%)"), React.createElement("p", {
                    className: "text-4xl font-bold mt-2"
                }, er(i)), React.createElement("p", {
                    className: "text-xs opacity-75 mt-2"
                }, "Baseado em ", s, " aprovações sem gratuidade (", er(m), ")")), React.createElement("div", {
                    className: "bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow p-6 text-white"
                }, React.createElement("p", {
                    className: "text-sm opacity-90"
                }, "📉 Deixou de Arrecadar"), React.createElement("p", {
                    className: "text-4xl font-bold mt-2"
                }, er(x)), React.createElement("p", {
                    className: "text-xs opacity-75 mt-2"
                }, "Baseado em ", n, " aprovações com gratuidade (", er(d), ")"))))
            })()), "conciliacao" === p.finTab && React.createElement(React.Fragment, null, 
                // Filtros de Conciliação
                React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4 mb-4"
                }, 
                    React.createElement("div", {className: "flex flex-wrap items-end gap-4"},
                        // Filtro por Data de Solicitação
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-xs font-semibold text-gray-600 mb-1"}, "📅 Data Solicitação"),
                            React.createElement("input", {
                                type: "date",
                                value: p.concDataSolicitacao || "",
                                onChange: e => { setConciliacaoPagina(1); x({...p, concDataSolicitacao: e.target.value}); },
                                className: "px-3 py-2 border rounded-lg text-sm"
                            })
                        ),
                        // Filtro por Data de Realização
                        React.createElement("div", null,
                            React.createElement("label", {className: "block text-xs font-semibold text-gray-600 mb-1"}, "✅ Data Realização"),
                            React.createElement("input", {
                                type: "date",
                                value: p.concDataRealizacao || "",
                                onChange: e => { setConciliacaoPagina(1); x({...p, concDataRealizacao: e.target.value}); },
                                className: "px-3 py-2 border rounded-lg text-sm"
                            })
                        ),
                        // Filtro de Gratuidade
                        React.createElement("div", {className: "flex items-center gap-2"},
                            React.createElement("button", {
                                onClick: () => { setConciliacaoPagina(1); x({...p, concApenasGratuidade: !p.concApenasGratuidade}); },
                                className: "px-4 py-2 rounded-lg text-sm font-semibold " + 
                                    (p.concApenasGratuidade ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200")
                            }, "🎁 Apenas Gratuidades")
                        ),
                        // Botão Limpar Filtros
                        (p.concDataSolicitacao || p.concDataRealizacao || p.concApenasGratuidade) && React.createElement("button", {
                            onClick: () => { setConciliacaoPagina(1); x({...p, concDataSolicitacao: "", concDataRealizacao: "", concApenasGratuidade: false}); },
                            className: "px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200"
                        }, "✕ Limpar Filtros")
                    )
                ),
                // Cards dinâmicos baseados nos filtros
                (() => {
                    // Aplicar os mesmos filtros para calcular os cards
                    const dadosFiltrados = q.filter(e => {
                        if (!e.status?.includes("aprovado")) return false;
                        if (p.concDataSolicitacao) {
                            const dataSolic = (() => { const d = new Date(e.created_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                            if (dataSolic !== p.concDataSolicitacao) return false;
                        }
                        if (p.concDataRealizacao) {
                            if (!e.approved_at) return false;
                            const dataReal = (() => { const d = new Date(e.approved_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                            if (dataReal !== p.concDataRealizacao) return false;
                        }
                        if (p.concApenasGratuidade && !e.has_gratuity) return false;
                        return true;
                    });
                    
                    const totalAprovados = dadosFiltrados.length;
                    const totalConciliados = dadosFiltrados.filter(e => e.conciliacao_omie).length;
                    const pendenteConciliacao = totalAprovados - totalConciliados;
                    const totalGratuidades = dadosFiltrados.filter(e => e.has_gratuity).length;
                    
                    return React.createElement("div", {
                        className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
                    }, 
                        React.createElement("div", {
                            className: "bg-white rounded-xl shadow p-4"
                        }, React.createElement("p", {
                            className: "text-sm text-gray-600"
                        }, "Aprovados"), React.createElement("p", {
                            className: "text-2xl font-bold text-green-600"
                        }, totalAprovados)),
                        React.createElement("div", {
                            className: "bg-white rounded-xl shadow p-4"
                        }, React.createElement("p", {
                            className: "text-sm text-gray-600"
                        }, "Conciliados"), React.createElement("p", {
                            className: "text-2xl font-bold text-purple-600"
                        }, totalConciliados)),
                        React.createElement("div", {
                            className: "bg-white rounded-xl shadow p-4"
                        }, React.createElement("p", {
                            className: "text-sm text-gray-600"
                        }, "Pend. Conc."), React.createElement("p", {
                            className: "text-2xl font-bold text-yellow-600"
                        }, pendenteConciliacao)),
                        React.createElement("div", {
                            className: "bg-white rounded-xl shadow p-4"
                        }, React.createElement("p", {
                            className: "text-sm text-gray-600"
                        }, "🎁 Gratuidades"), React.createElement("p", {
                            className: "text-2xl font-bold text-blue-600"
                        }, totalGratuidades))
                    );
                })(),
                React.createElement("div", {
                className: "bg-white rounded-xl shadow overflow-hidden"
            }, React.createElement("table", {
                className: "w-full text-sm"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Datas"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Nome"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "CPF"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Código"), React.createElement("th", {
                className: "px-4 py-3 text-right"
            }, "Solicitado"), React.createElement("th", {
                className: "px-4 py-3 text-right"
            }, "Valor Profissional"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Gratuidade"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "OMIE"))), React.createElement("tbody", null, (() => {
                // Filtrar dados
                const filtrados = q.filter(e => {
                    // Filtro base: apenas aprovados
                    if (!e.status?.includes("aprovado")) return false;
                    
                    // Filtro por data de solicitação
                    if (p.concDataSolicitacao) {
                        const dataSolic = (() => { const d = new Date(e.created_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                        if (dataSolic !== p.concDataSolicitacao) return false;
                    }
                    
                    // Filtro por data de realização
                    if (p.concDataRealizacao) {
                        if (!e.approved_at) return false;
                        const dataReal = (() => { const d = new Date(e.approved_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                        if (dataReal !== p.concDataRealizacao) return false;
                    }
                    
                    // Filtro apenas gratuidades
                    if (p.concApenasGratuidade && !e.has_gratuity) return false;
                    
                    return true;
                });
                
                // Aplicar paginação
                const inicio = (conciliacaoPagina - 1) * conciliacaoPorPagina;
                const fim = inicio + conciliacaoPorPagina;
                return filtrados.slice(inicio, fim);
            })().map(e => {
                const t = new Date(e.created_at),
                    a = t.toLocaleDateString("pt-BR"),
                    l = t.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit"
                    }),
                    r = e.approved_at ? new Date(e.approved_at) : null,
                    o = r ? r.toLocaleDateString("pt-BR") : "-",
                    c = r ? r.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit"
                    }) : "",
                    s = e.has_gratuity;
                return React.createElement("tr", {
                    key: e.id,
                    className: "border-t hover:bg-gray-50 " + (s ? "bg-blue-50 border-l-4 border-l-blue-500" : "")
                }, React.createElement("td", {
                    className: "px-4 py-3"
                }, React.createElement("div", {
                    className: "flex flex-col text-[10px]"
                }, React.createElement("span", {
                    className: "text-gray-600"
                }, "Solicitado: ", React.createElement("span", {
                    className: "font-medium text-gray-800"
                }, a), " às ", React.createElement("span", {
                    className: "font-medium text-gray-800"
                }, l)), React.createElement("span", {
                    className: "text-green-600"
                }, "Realizado: ", React.createElement("span", {
                    className: "font-medium text-green-700"
                }, o), c && React.createElement(React.Fragment, null, " às ", React.createElement("span", {
                    className: "font-medium text-green-700"
                }, c))))), React.createElement("td", {
                    className: "px-4 py-3"
                }, e.user_name), React.createElement("td", {
                    className: "px-4 py-3"
                }, e.cpf), React.createElement("td", {
                    className: "px-4 py-3 font-mono"
                }, e.user_cod), React.createElement("td", {
                    className: "px-4 py-3 text-right"
                }, er(e.requested_amount)), React.createElement("td", {
                    className: "px-4 py-3 text-right font-semibold"
                }, er(e.final_amount)), React.createElement("td", {
                    className: "px-4 py-3 text-center"
                }, s ? React.createElement("span", {
                    className: "text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded"
                }, "SIM") : React.createElement("span", {
                    className: "text-xs text-gray-400"
                }, "-")), React.createElement("td", {
                    className: "px-4 py-3 text-center"
                }, React.createElement("input", {
                    type: "checkbox",
                    checked: e.conciliacao_omie,
                    onChange: t => (async (e, t, a) => {
                        try {
                            await fetchAuth(`${API_URL}/withdrawals/${e}/conciliacao`, {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    [t]: a
                                })
                            }), Ua(), Va()
                        } catch (e) {
                            ja("Erro", "error")
                        }
                    })(e.id, "conciliacaoOmie", t.target.checked),
                    className: "w-5 h-5"
                })))
            }))),
            // Controles de paginação da Conciliação
            (() => {
                const filtrados = q.filter(e => {
                    if (!e.status?.includes("aprovado")) return false;
                    if (p.concDataSolicitacao) {
                        const dataSolic = (() => { const d = new Date(e.created_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                        if (dataSolic !== p.concDataSolicitacao) return false;
                    }
                    if (p.concDataRealizacao) {
                        if (!e.approved_at) return false;
                        const dataReal = (() => { const d = new Date(e.approved_at); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); })();
                        if (dataReal !== p.concDataRealizacao) return false;
                    }
                    if (p.concApenasGratuidade && !e.has_gratuity) return false;
                    return true;
                });
                const totalPaginas = Math.ceil(filtrados.length / conciliacaoPorPagina);
                if (totalPaginas <= 1) return null;
                return React.createElement("div", {
                    className: "flex items-center justify-between bg-white rounded-xl shadow p-4 mt-4"
                }, 
                    React.createElement("div", { className: "text-sm text-gray-600" },
                        `Mostrando ${Math.min((conciliacaoPagina - 1) * conciliacaoPorPagina + 1, filtrados.length)}-${Math.min(conciliacaoPagina * conciliacaoPorPagina, filtrados.length)} de ${filtrados.length} registros`
                    ),
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("button", {
                            onClick: () => setConciliacaoPagina(1),
                            disabled: conciliacaoPagina === 1,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (conciliacaoPagina === 1 ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
                        }, "⏮️"),
                        React.createElement("button", {
                            onClick: () => setConciliacaoPagina(pg => Math.max(1, pg - 1)),
                            disabled: conciliacaoPagina === 1,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (conciliacaoPagina === 1 ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
                        }, "◀️ Anterior"),
                        React.createElement("span", { className: "px-4 py-1 bg-purple-100 text-purple-700 rounded font-bold" },
                            `${conciliacaoPagina} / ${totalPaginas}`
                        ),
                        React.createElement("button", {
                            onClick: () => setConciliacaoPagina(pg => Math.min(totalPaginas, pg + 1)),
                            disabled: conciliacaoPagina === totalPaginas,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (conciliacaoPagina === totalPaginas ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
                        }, "Próxima ▶️"),
                        React.createElement("button", {
                            onClick: () => setConciliacaoPagina(totalPaginas),
                            disabled: conciliacaoPagina === totalPaginas,
                            className: "px-3 py-1 rounded text-sm font-semibold " + (conciliacaoPagina === totalPaginas ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
                        }, "⏭️")
                    )
                );
            })()
            )), "resumo" === p.finTab && React.createElement(React.Fragment, null, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4 mb-6"
            }, React.createElement("div", {
                className: "flex gap-4"
            }, React.createElement("input", {
                type: "text",
                placeholder: "🔍 Buscar por código do profissional...",
                value: p.searchCod || "",
                onChange: e => x({
                    ...p,
                    searchCod: e.target.value
                }),
                className: "flex-1 px-4 py-2 border rounded-lg"
            }), p.searchCod && React.createElement("button", {
                onClick: () => x({
                    ...p,
                    searchCod: ""
                }),
                className: "px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold"
            }, "✕ Limpar"))), p.searchCod && (() => {
                const e = q.filter(e => e.user_cod.toLowerCase().includes(p.searchCod.toLowerCase()));
                return React.createElement(React.Fragment, null, React.createElement("div", {
                    className: "grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
                }, React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "Total"), React.createElement("p", {
                    className: "text-2xl font-bold text-purple-600"
                }, e.length)), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "Aguardando"), React.createElement("p", {
                    className: "text-2xl font-bold text-yellow-600"
                }, e.filter(e => "aguardando_aprovacao" === e.status).length)), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "Aprovadas"), React.createElement("p", {
                    className: "text-2xl font-bold text-green-600"
                }, e.filter(e => "aprovado" === e.status).length)), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "Aprov. Gratuidade"), React.createElement("p", {
                    className: "text-2xl font-bold text-blue-600"
                }, e.filter(e => "aprovado_gratuidade" === e.status).length)), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "Rejeitadas"), React.createElement("p", {
                    className: "text-2xl font-bold text-red-600"
                }, e.filter(e => "rejeitado" === e.status).length))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow overflow-hidden"
                }, React.createElement("div", {
                    className: "p-4 border-b"
                }, React.createElement("div", {
                    className: "flex flex-wrap gap-2"
                }, React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        resumoFilter: ""
                    }),
                    className: "px-4 py-2 rounded-lg font-semibold text-sm " + (p.resumoFilter ? "bg-gray-100 hover:bg-gray-200" : "bg-purple-600 text-white")
                }, "📋 Todas (", e.length, ")"), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        resumoFilter: "aguardando_aprovacao"
                    }),
                    className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("aguardando_aprovacao" === p.resumoFilter ? "bg-yellow-500 text-white" : "bg-gray-100 hover:bg-gray-200")
                }, "⏳ Aguardando (", e.filter(e => "aguardando_aprovacao" === e.status).length, ")"), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        resumoFilter: "aprovado"
                    }),
                    className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("aprovado" === p.resumoFilter ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-gray-200")
                }, "✅ Aprovadas (", e.filter(e => "aprovado" === e.status).length, ")"), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        resumoFilter: "aprovado_gratuidade"
                    }),
                    className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("aprovado_gratuidade" === p.resumoFilter ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200")
                }, "🎁 Aprov. Gratuidade (", e.filter(e => "aprovado_gratuidade" === e.status).length, ")"), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        resumoFilter: "rejeitado"
                    }),
                    className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("rejeitado" === p.resumoFilter ? "bg-red-600 text-white" : "bg-gray-100 hover:bg-gray-200")
                }, "❌ Rejeitadas (", e.filter(e => "rejeitado" === e.status).length, ")"), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        resumoFilter: "inativo"
                    }),
                    className: "px-4 py-2 rounded-lg font-semibold text-sm " + ("inativo" === p.resumoFilter ? "bg-orange-500 text-white" : "bg-gray-100 hover:bg-gray-200")
                }, "⚠️ Inativo (", e.filter(e => "inativo" === e.status).length, ")"))), React.createElement("div", {
                    className: "overflow-x-auto"
                }, React.createElement("table", {
                    className: "w-full text-sm"
                }, React.createElement("thead", {
                    className: "bg-gray-50"
                }, React.createElement("tr", null, React.createElement("th", {
                    className: "px-4 py-3 text-left"
                }, "Datas"), React.createElement("th", {
                    className: "px-4 py-3 text-left"
                }, "Nome"), React.createElement("th", {
                    className: "px-4 py-3 text-left"
                }, "CPF"), React.createElement("th", {
                    className: "px-4 py-3 text-left"
                }, "Código"), React.createElement("th", {
                    className: "px-4 py-3 text-right"
                }, "Solicitado"), React.createElement("th", {
                    className: "px-4 py-3 text-right"
                }, "Valor Profissional"), React.createElement("th", {
                    className: "px-4 py-3 text-left"
                }, "PIX"), React.createElement("th", {
                    className: "px-4 py-3 text-center"
                }, "Gratuidade"), React.createElement("th", {
                    className: "px-4 py-3 text-center"
                }, "Status"))), React.createElement("tbody", null, e.filter(e => !p.resumoFilter || e.status === p.resumoFilter).map(e => {
                    const t = new Date(e.created_at),
                        a = t.toLocaleDateString("pt-BR"),
                        l = t.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit"
                        }),
                        r = e.approved_at ? new Date(e.approved_at) : null,
                        o = r ? r.toLocaleDateString("pt-BR") : "-",
                        c = r ? r.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit"
                        }) : "",
                        s = "aprovado" === e.status || "aprovado_gratuidade" === e.status;
                    return React.createElement("tr", {
                        key: e.id,
                        className: `border-t hover:bg-gray-50 ${e.has_gratuity?"bg-blue-50 border-l-4 border-l-blue-500":""} ${e.is_restricted?"row-red":""}`
                    }, React.createElement("td", {
                        className: "px-4 py-3"
                    }, React.createElement("div", {
                        className: "flex flex-col text-[10px]"
                    }, React.createElement("span", {
                        className: "text-gray-600"
                    }, "Solicitado: ", React.createElement("span", {
                        className: "font-medium text-gray-800"
                    }, a), " às ", React.createElement("span", {
                        className: "font-medium text-gray-800"
                    }, l)), s && React.createElement("span", {
                        className: "text-green-600"
                    }, "Realizado: ", React.createElement("span", {
                        className: "font-medium text-green-700"
                    }, o), c && React.createElement(React.Fragment, null, " às ", React.createElement("span", {
                        className: "font-medium text-green-700"
                    }, c))))), React.createElement("td", {
                        className: "px-4 py-3"
                    }, e.user_name), React.createElement("td", {
                        className: "px-4 py-3"
                    }, e.cpf), React.createElement("td", {
                        className: "px-4 py-3 font-mono"
                    }, e.user_cod), React.createElement("td", {
                        className: "px-4 py-3 text-right font-semibold"
                    }, er(e.requested_amount)), React.createElement("td", {
                        className: "px-4 py-3 text-right"
                    }, er(e.final_amount)), React.createElement("td", {
                        className: "px-4 py-3"
                    }, React.createElement("span", {
                        className: "text-xs max-w-[120px] truncate"
                    }, e.pix_key)), React.createElement("td", {
                        className: "px-4 py-3 text-center"
                    }, e.has_gratuity ? React.createElement("span", {
                        className: "text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded"
                    }, "SIM") : React.createElement("span", {
                        className: "text-xs text-gray-400"
                    }, "-")), React.createElement("td", {
                        className: "px-4 py-3"
                    }, React.createElement("span", {
                        className: "px-2 py-1 rounded text-xs font-bold " + ("aprovado" === e.status ? "bg-green-500 text-white" : "aprovado_gratuidade" === e.status ? "bg-blue-500 text-white" : "rejeitado" === e.status ? "bg-red-500 text-white" : "inativo" === e.status ? "bg-orange-500 text-white" : "bg-yellow-500 text-white")
                    }, "aguardando_aprovacao" === e.status ? "⏳ Aguardando" : "aprovado" === e.status ? "✅ Aprovado" : "aprovado_gratuidade" === e.status ? "🎁 c/ Gratuidade" : "rejeitado" === e.status ? "❌ Rejeitado" : "⚠️ Inativo"), e.reject_reason && "rejeitado" === e.status && React.createElement("p", {
                        className: "text-xs text-red-600 mt-1"
                    }, "Motivo: ", e.reject_reason), e.admin_name && "aguardando_aprovacao" !== e.status && React.createElement("p", {
                        className: "text-xs text-purple-600 mt-1 font-medium"
                    }, "👤 ", e.admin_name)))
                }))))))
            })(), !p.searchCod && React.createElement("div", {
                className: "bg-white rounded-xl shadow p-8 text-center"
            }, React.createElement("p", {
                className: "text-gray-500 text-lg"
            }, "🔍 Digite o código do profissional para ver o resumo"))), "gratuidades" === p.finTab && React.createElement("div", {
                className: "space-y-6"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-6"
            }, React.createElement("h3", {
                className: "text-lg font-semibold mb-4"
            }, "➕ Cadastrar Gratuidade"), React.createElement("div", {
                className: "grid md:grid-cols-2 lg:grid-cols-6 gap-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-xs font-semibold mb-1 text-gray-600"
            }, "Código *"), React.createElement("input", {
                type: "text",
                placeholder: "Código",
                value: p.gratUserCod || "",
                onChange: async e => {
                    const t = e.target.value;
                    if (x({
                            ...p,
                            gratUserCod: t,
                            gratUserName: ""
                        }), t.length >= 3) {
                        const e = A.find(e => e.codProfissional?.toLowerCase() === t.toLowerCase());
                        e && x(a => ({
                            ...a,
                            gratUserCod: t,
                            gratUserName: e.fullName
                        }))
                    }
                },
                className: "w-full px-4 py-2 border rounded-lg"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-xs font-semibold mb-1 text-gray-600"
            }, "Nome"), React.createElement("input", {
                type: "text",
                placeholder: "Nome do usuário",
                value: p.gratUserName || "",
                readOnly: !0,
                className: "w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-700"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-xs font-semibold mb-1 text-gray-600"
            }, "Quantidade *"), React.createElement("input", {
                type: "number",
                placeholder: "Qtd",
                value: p.gratQty || "",
                onChange: e => x({
                    ...p,
                    gratQty: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-xs font-semibold mb-1 text-gray-600"
            }, "Valor (R$) *"), React.createElement("input", {
                type: "number",
                placeholder: "Valor",
                value: p.gratValue || "",
                onChange: e => x({
                    ...p,
                    gratValue: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-xs font-semibold mb-1 text-gray-600"
            }, "Motivo"), React.createElement("input", {
                type: "text",
                placeholder: "Motivo",
                value: p.gratReason || "",
                onChange: e => x({
                    ...p,
                    gratReason: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg"
            })), React.createElement("div", {
                className: "flex items-end"
            }, React.createElement("button", {
                onClick: Hl,
                disabled: c || !p.gratUserName,
                className: "w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold disabled:opacity-50"
            }, "➕ Adicionar"))), p.gratUserCod && !p.gratUserName && p.gratUserCod.length >= 3 && React.createElement("p", {
                className: "text-red-500 text-xs mt-2"
            }, "⚠️ Usuário não encontrado com este código"), p.gratUserName && React.createElement("p", {
                className: "text-green-600 text-xs mt-2"
            }, "✅ Usuário encontrado: ", p.gratUserName)), React.createElement("div", {
                className: "bg-white rounded-xl shadow overflow-hidden"
            }, React.createElement("table", {
                className: "w-full text-sm"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Código"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Nome"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Qtd"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Rest."), React.createElement("th", {
                className: "px-4 py-3 text-right"
            }, "Valor"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Motivo"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Cadastrado por"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Status"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Ação"))), React.createElement("tbody", null, Q.map(e => React.createElement("tr", {
                key: e.id,
                className: "border-t " + ("ativa" === e.status ? "bg-green-50" : "")
            }, React.createElement("td", {
                className: "px-4 py-3 font-mono"
            }, e.user_cod), React.createElement("td", {
                className: "px-4 py-3 font-semibold"
            }, e.user_name || "-"), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, e.quantity), React.createElement("td", {
                className: "px-4 py-3 text-center font-bold"
            }, e.remaining), React.createElement("td", {
                className: "px-4 py-3 text-right"
            }, er(e.value)), React.createElement("td", {
                className: "px-4 py-3"
            }, e.reason || "-"), React.createElement("td", {
                className: "px-4 py-3 text-xs text-gray-600"
            }, e.created_by || "-"), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, React.createElement("span", {
                className: "px-2 py-1 rounded text-xs font-bold " + ("ativa" === e.status ? "bg-green-500 text-white" : "bg-gray-400 text-white")
            }, e.status)), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, React.createElement("button", {
                onClick: () => {
                    confirm(`⚠️ Excluir gratuidade de ${e.user_name||e.user_cod}?\n\nValor: ${er(e.value)}\nRestante: ${e.remaining}/${e.quantity}\n\nEsta ação não pode ser desfeita!`) && (async e => {
                        s(!0);
                        try {
                            await fetchAuth(`${API_URL}/gratuities/${e}`, {
                                method: "DELETE"
                            }), ja("🗑️ Gratuidade excluída!", "success"), za()
                        } catch (e) {
                            ja("Erro ao excluir", "error")
                        }
                        s(!1)
                    })(e.id)
                },
                className: "px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            }, "🗑️ Excluir")))))))), "restritos" === p.finTab && React.createElement("div", {
                className: "space-y-6"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-6"
            }, React.createElement("h3", {
                className: "text-lg font-semibold mb-4"
            }, "➕ Adicionar Restrição"), React.createElement("div", {
                className: "grid md:grid-cols-4 gap-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-xs font-semibold mb-1 text-gray-600"
            }, "Código *"), React.createElement("input", {
                type: "text",
                placeholder: "Código",
                value: p.restUserCod || "",
                onChange: async e => {
                    const t = e.target.value;
                    if (x({
                            ...p,
                            restUserCod: t,
                            restUserName: ""
                        }), t.length >= 3) {
                        const e = A.find(e => e.codProfissional?.toLowerCase() === t.toLowerCase());
                        e && x(a => ({
                            ...a,
                            restUserCod: t,
                            restUserName: e.fullName
                        }))
                    }
                },
                className: "w-full px-4 py-2 border rounded-lg"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-xs font-semibold mb-1 text-gray-600"
            }, "Nome"), React.createElement("input", {
                type: "text",
                placeholder: "Nome do usuário",
                value: p.restUserName || "",
                readOnly: !0,
                className: "w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-700"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-xs font-semibold mb-1 text-gray-600"
            }, "Motivo *"), React.createElement("input", {
                type: "text",
                placeholder: "Motivo",
                value: p.restReason || "",
                onChange: e => x({
                    ...p,
                    restReason: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg"
            })), React.createElement("div", {
                className: "flex items-end"
            }, React.createElement("button", {
                onClick: Gl,
                disabled: c || !p.restUserName,
                className: "w-full px-4 py-2 bg-red-600 text-white rounded-lg font-semibold disabled:opacity-50"
            }, "🚫 Adicionar"))), p.restUserCod && !p.restUserName && p.restUserCod.length >= 3 && React.createElement("p", {
                className: "text-red-500 text-xs mt-2"
            }, "⚠️ Usuário não encontrado com este código"), p.restUserName && React.createElement("p", {
                className: "text-green-600 text-xs mt-2"
            }, "✅ Usuário encontrado: ", p.restUserName)), React.createElement("div", {
                className: "bg-white rounded-xl shadow overflow-hidden"
            }, React.createElement("table", {
                className: "w-full text-sm"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Código"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Nome"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Motivo"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Cadastrado por"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Data"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Status"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Ação"))), React.createElement("tbody", null, Z.map(e => React.createElement("tr", {
                key: e.id,
                className: "border-t " + ("ativo" === e.status ? "bg-red-50" : "")
            }, React.createElement("td", {
                className: "px-4 py-3 font-mono"
            }, e.user_cod), React.createElement("td", {
                className: "px-4 py-3 font-semibold"
            }, e.user_name || "-"), React.createElement("td", {
                className: "px-4 py-3"
            }, e.reason), React.createElement("td", {
                className: "px-4 py-3 text-xs text-gray-600"
            }, e.created_by || "-"), React.createElement("td", {
                className: "px-4 py-3"
            }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, React.createElement("span", {
                className: "px-2 py-1 rounded text-xs font-bold " + ("ativo" === e.status ? "bg-red-500 text-white" : "bg-gray-400 text-white")
            }, e.status)), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, "ativo" === e.status && React.createElement("button", {
                onClick: () => (async e => {
                    try {
                        await fetchAuth(`${API_URL}/restricted/${e}/remove`, {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                removedReason: "Suspensa pelo admin"
                            })
                        }), ja("✅ Restrição removida!", "success"), Ba()
                    } catch (e) {
                        ja("Erro", "error")
                    }
                })(e.id),
                className: "px-3 py-1 bg-green-600 text-white rounded text-xs"
            }, "Suspender")))))))), "indicacoes" === p.finTab && React.createElement(React.Fragment, null, p.modalRejeitar && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
            }, React.createElement("h3", {
                className: "text-xl font-bold text-red-600 mb-4"
            }, "❌ Rejeitar Indicação"), React.createElement("div", {
                className: "bg-gray-50 rounded-lg p-4 mb-4"
            }, React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Profissional:"), " ", p.modalRejeitar.user_name), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Indicado:"), " ", p.modalRejeitar.indicado_nome), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Região:"), " ", p.modalRejeitar.regiao)), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Motivo da Rejeição *"), React.createElement("textarea", {
                value: p.motivoRejeicao || "",
                onChange: e => x({
                    ...p,
                    motivoRejeicao: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                rows: "3",
                placeholder: "Informe o motivo..."
            })), React.createElement("div", {
                className: "flex gap-3"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    modalRejeitar: null,
                    motivoRejeicao: ""
                }),
                className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            }, "Cancelar"), React.createElement("button", {
                onClick: () => (async e => {
                    if (p.motivoRejeicao) {
                        s(!0);
                        try {
                            if (!(await fetchAuth(`${API_URL}/indicacoes/${e}/rejeitar`, {
                                    method: "PATCH",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        motivo_rejeicao: p.motivoRejeicao,
                                        resolved_by: l.fullName
                                    })
                                })).ok) throw new Error("Erro ao rejeitar");
                            ja("❌ Indicação rejeitada", "success"), x({
                                ...p,
                                modalRejeitar: null,
                                motivoRejeicao: ""
                            }), await wl()
                        } catch (e) {
                            ja(e.message, "error")
                        }
                        s(!1)
                    } else ja("Informe o motivo da rejeição", "error")
                })(p.modalRejeitar.id),
                disabled: !p.motivoRejeicao || c,
                className: "flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
            }, c ? "..." : "❌ Rejeitar")))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-6 mb-6"
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-4"
            }, React.createElement("h2", {
                className: "text-xl font-bold text-green-800"
            }, p.editPromo ? "✏️ Editar Promoção" : "📣 Cadastrar Nova Promoção"), p.editPromo && React.createElement("button", {
                onClick: () => x({
                    ...p,
                    editPromo: null,
                    promoRegiao: "",
                    promoValor: "",
                    promoDetalhes: ""
                }),
                className: "text-sm text-gray-500 hover:text-gray-700"
            }, "✕ Cancelar edição")), React.createElement("div", {
                className: "grid md:grid-cols-2 gap-4 mb-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Região *"), React.createElement("select", {
                value: p.promoRegiao || "",
                onChange: e => x({
                    ...p,
                    promoRegiao: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg bg-white"
            }, 
                React.createElement("option", { value: "" }, "Selecione a região..."),
                (cidadesIndicacao || []).map(cidade => 
                    React.createElement("option", { key: cidade, value: cidade }, cidade)
                )
            )), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Valor do Bônus (R$) *"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: p.promoValor || "",
                onChange: e => x({
                    ...p,
                    promoValor: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                placeholder: "Ex: 100.00"
            }))), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Detalhes da Promoção (opcional)"), React.createElement("textarea", {
                value: p.promoDetalhes || "",
                onChange: e => x({
                    ...p,
                    promoDetalhes: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                rows: "3",
                placeholder: "Ex: Vaga para instalador com experiência em fibra óptica. Início imediato. Benefícios: vale transporte + alimentação..."
            })), React.createElement("button", {
                onClick: p.editPromo ? Ol : Ml,
                disabled: c,
                className: "w-full md:w-auto px-6 py-2 text-white rounded-lg font-semibold disabled:opacity-50 " + (p.editPromo ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700")
            }, c ? "..." : p.editPromo ? "💾 Salvar Alterações" : "➕ Criar Promoção")), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-6 mb-6"
            }, React.createElement("h3", {
                className: "font-semibold mb-4"
            }, "📋 Promoções Cadastradas"), 0 === (l.role === "user" ? promocoesFiltradas : ee).length ? React.createElement("p", {
                className: "text-gray-500 text-center py-4"
            }, l.role === "user" && cidadeUsuarioLogado 
                ? "Nenhuma promoção disponível para " + cidadeUsuarioLogado 
                : "Nenhuma promoção cadastrada") : React.createElement("div", {
                className: "grid md:grid-cols-4 gap-3"
            }, (l.role === "user" ? promocoesFiltradas : ee).map(e => React.createElement("div", {
                key: e.id,
                className: "border rounded-lg p-3 " + ("ativa" === e.status ? "border-green-300 bg-green-50" : "border-gray-300 bg-gray-50")
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-1"
            }, React.createElement("span", {
                className: "px-2 py-0.5 rounded text-xs font-bold " + ("ativa" === e.status ? "bg-green-500 text-white" : "bg-gray-500 text-white")
            }, "ativa" === e.status ? "✅" : "⏸️"), React.createElement("div", {
                className: "flex gap-1"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    editPromo: e,
                    promoRegiao: e.regiao,
                    promoValor: e.valor_bonus,
                    promoDetalhes: e.detalhes || ""
                }),
                className: "text-xs text-blue-500 hover:text-blue-700"
            }, "✏️"), React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/promocoes/${e.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "ativa" === e.status ? "inativa" : "ativa"
                        })
                    }), gl()
                },
                className: "text-xs text-gray-500 hover:text-gray-700"
            }, "ativa" === e.status ? "⏸️" : "▶️"))), React.createElement("p", {
                className: "font-semibold text-sm"
            }, "📍 ", e.regiao), React.createElement("p", {
                className: "text-lg font-bold text-green-600"
            }, er(e.valor_bonus)), e.detalhes && React.createElement("p", {
                className: "text-xs text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3",
                title: e.detalhes
            }, e.detalhes))))), React.createElement("div", {
                className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            }, React.createElement("div", {
                className: "bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center"
            }, React.createElement("p", {
                className: "text-3xl font-bold text-yellow-600"
            }, ae.filter(e => "pendente" === e.status).length), React.createElement("p", {
                className: "text-sm text-yellow-700"
            }, "Pendentes")), React.createElement("div", {
                className: "bg-green-50 border border-green-200 rounded-xl p-4 text-center"
            }, React.createElement("p", {
                className: "text-3xl font-bold text-green-600"
            }, ae.filter(e => "aprovada" === e.status).length), React.createElement("p", {
                className: "text-sm text-green-700"
            }, "Aprovadas")), React.createElement("div", {
                className: "bg-red-50 border border-red-200 rounded-xl p-4 text-center"
            }, React.createElement("p", {
                className: "text-3xl font-bold text-red-600"
            }, ae.filter(e => "rejeitada" === e.status).length), React.createElement("p", {
                className: "text-sm text-red-700"
            }, "Rejeitadas")), React.createElement("div", {
                className: "bg-gray-50 border border-gray-200 rounded-xl p-4 text-center"
            }, React.createElement("p", {
                className: "text-3xl font-bold text-gray-600"
            }, ae.filter(e => "expirada" === e.status).length), React.createElement("p", {
                className: "text-sm text-gray-700"
            }, "Expiradas"))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-6"
            }, React.createElement("h3", {
                className: "font-semibold mb-4"
            }, "👥 Indicações Recebidas"), 0 === ae.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8"
            }, "Nenhuma indicação recebida") : React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-sm"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Data"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Profissional"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Indicado"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Contato"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Região"), React.createElement("th", {
                className: "px-2 py-3 text-center text-xs"
            }, "Bônus"), React.createElement("th", {
                className: "px-2 py-3 text-center text-xs"
            }, "Expira"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Status"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Crédito Lançado"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Ações"))), React.createElement("tbody", null, ae.map(e => {
                const t = Math.ceil((new Date(e.expires_at) - new Date) / 864e5),
                    a = e.indicado_contato ? e.indicado_contato.replace(/\D/g, "") : "",
                    r = a ? `https://wa.me/55${a}` : "#";
                return React.createElement("tr", {
                    key: e.id,
                    className: "border-t " + ("pendente" === e.status ? "bg-yellow-50" : "")
                }, React.createElement("td", {
                    className: "px-2 py-3 whitespace-nowrap text-xs"
                }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                    className: "px-2 py-3"
                }, React.createElement("p", {
                    className: "font-semibold text-xs"
                }, e.user_name), React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, e.user_cod)), React.createElement("td", {
                    className: "px-2 py-3"
                }, React.createElement("p", {
                    className: "font-semibold text-xs"
                }, e.indicado_nome), e.indicado_cpf && React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, e.indicado_cpf)), React.createElement("td", {
                    className: "px-2 py-3"
                }, React.createElement("a", {
                    href: r,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "text-green-600 hover:text-green-800 font-semibold text-xs flex items-center gap-1"
                }, "📱 ", e.indicado_contato)), React.createElement("td", {
                    className: "px-2 py-3 text-xs"
                }, e.regiao), React.createElement("td", {
                    className: "px-2 py-3 text-center font-bold text-green-600 text-xs"
                }, er(e.valor_bonus)), React.createElement("td", {
                    className: "px-2 py-3 text-center"
                }, "pendente" === e.status ? React.createElement("span", {
                    className: "text-xs font-bold " + (t <= 5 ? "text-red-600" : "text-gray-600")
                }, t > 0 ? `${t}d` : "Exp") : "-"), React.createElement("td", {
                    className: "px-3 py-3 text-center"
                }, React.createElement("div", {
                    className: "flex flex-col items-center"
                }, React.createElement("span", {
                    className: "px-2 py-1 rounded-full text-xs font-bold " + ("pendente" === e.status ? "bg-yellow-500 text-white" : "aprovada" === e.status ? "bg-green-500 text-white" : "rejeitada" === e.status ? "bg-red-500 text-white" : "bg-gray-500 text-white")
                }, "pendente" === e.status ? "⏳ Pendente" : "aprovada" === e.status ? "✅ Aprovada" : "rejeitada" === e.status ? "❌ Rejeitada" : "⏰ Expirada"), ("aprovada" === e.status || "rejeitada" === e.status) && e.resolved_by && React.createElement("span", {
                    className: "text-xs text-gray-500 mt-1"
                }, e.resolved_by))), React.createElement("td", {
                    className: "px-3 py-3 text-center"
                }, "aprovada" === e.status && React.createElement("div", {
                    className: "flex flex-col items-center"
                }, React.createElement("input", {
                    type: "checkbox",
                    checked: e.credito_lancado || !1,
                    onChange: async t => {
                        try {
                            await fetchAuth(`${API_URL}/indicacoes/${e.id}/credito`, {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    credito_lancado: t.target.checked,
                                    lancado_por: l.fullName
                                })
                            }), wl()
                        } catch (e) {
                            ja("Erro ao atualizar", "error")
                        }
                    },
                    className: "w-5 h-5 cursor-pointer"
                }), e.credito_lancado && e.lancado_por && React.createElement("span", {
                    className: "text-xs text-gray-500 mt-1"
                }, e.lancado_por))), React.createElement("td", {
                    className: "px-3 py-3 text-center"
                }, "pendente" === e.status && React.createElement("div", {
                    className: "flex gap-2 justify-center"
                }, React.createElement("button", {
                    onClick: () => (async e => {
                        s(!0);
                        try {
                            if (!(await fetchAuth(`${API_URL}/indicacoes/${e}/aprovar`, {
                                    method: "PATCH",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        resolved_by: l.fullName
                                    })
                                })).ok) throw new Error("Erro ao aprovar");
                            ja("✅ Indicação aprovada!", "success"), await wl()
                        } catch (e) {
                            ja(e.message, "error")
                        }
                        s(!1)
                    })(e.id),
                    className: "px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                }, "✅ Aprovar"), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        modalRejeitar: e
                    }),
                    className: "px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                }, "❌ Rejeitar")), "rejeitada" === e.status && e.motivo_rejeicao && React.createElement("span", {
                    className: "text-xs text-red-600",
                    title: e.motivo_rejeicao
                }, "📝 ", e.motivo_rejeicao.substring(0, 20), "...")))
            })))))), "promo-novatos" === p.finTab && React.createElement(React.Fragment, null, p.modalRejeitarNovatos && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl p-6 w-full max-w-md"
            }, React.createElement("h3", {
                className: "text-lg font-bold mb-4"
            }, "❌ Rejeitar Inscrição"), React.createElement("p", {
                className: "text-sm text-gray-600 mb-3"
            }, "Profissional: ", React.createElement("strong", null, p.modalRejeitarNovatos.user_name), React.createElement("br", null), "Cliente: ", React.createElement("strong", null, p.modalRejeitarNovatos.cliente)), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Motivo da Rejeição *"), React.createElement("textarea", {
                value: p.motivoRejeicaoNovato || "",
                onChange: e => x({
                    ...p,
                    motivoRejeicaoNovato: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                rows: "3",
                placeholder: "Informe o motivo..."
            })), React.createElement("div", {
                className: "flex gap-3"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    modalRejeitarNovatos: null,
                    motivoRejeicaoNovato: ""
                }),
                className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            }, "Cancelar"), React.createElement("button", {
                onClick: () => rejeitarInscNovato(p.modalRejeitarNovatos.id),
                disabled: !p.motivoRejeicaoNovato || c,
                className: "flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
            }, c ? "..." : "❌ Rejeitar")))), React.createElement("div", {
                className: "bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl shadow-lg mb-6 text-white overflow-hidden"
            }, React.createElement("div", {
                className: "p-4 flex justify-between items-center cursor-pointer hover:bg-white/10 transition",
                onClick: () => $e(!Fe)
            }, React.createElement("div", {
                className: "flex items-center gap-3"
            }, React.createElement("span", {
                className: "text-2xl"
            }, "🎯"), React.createElement("div", null, React.createElement("h2", {
                className: "text-lg font-bold"
            }, "Quiz de Procedimentos"), React.createElement("p", {
                className: "text-purple-200 text-xs"
            }, "Clique para ", Fe ? "recolher" : "expandir", " configurações"))), React.createElement("div", {
                className: "flex items-center gap-3"
            }, React.createElement("span", {
                className: "px-3 py-1 rounded-full text-xs font-bold " + (fe.ativo ? "bg-green-500" : "bg-red-500")
            }, fe.ativo ? "✅ ATIVO" : "❌ INATIVO"), React.createElement("span", {
                className: "text-2xl transition-transform",
                style: {
                    transform: Fe ? "rotate(180deg)" : "rotate(0deg)"
                }
            }, "▼"))), Fe && React.createElement("div", {
                className: "p-6 pt-2 border-t border-white/20"
            }, React.createElement("div", {
                className: "flex justify-end mb-4"
            }, React.createElement("button", {
                onClick: () => Ne({
                    ...fe,
                    ativo: !fe.ativo
                }),
                className: "px-4 py-2 rounded-lg font-semibold text-sm " + (fe.ativo ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600")
            }, fe.ativo ? "⏸️ Desativar Quiz" : "▶️ Ativar Quiz")), React.createElement("div", {
                className: "grid md:grid-cols-2 gap-4 mb-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Título da Promoção"), React.createElement("input", {
                type: "text",
                value: fe.titulo,
                onChange: e => Ne({
                    ...fe,
                    titulo: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg text-gray-800",
                placeholder: "Acerte os procedimentos..."
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Valor da Gratuidade (R$)"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: fe.valor_gratuidade,
                onChange: e => Ne({
                    ...fe,
                    valor_gratuidade: parseFloat(e.target.value) || 0
                }),
                className: "w-full px-4 py-2 border rounded-lg text-gray-800"
            }))), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "block text-sm font-semibold mb-2"
            }, "📸 4 Imagens do Carrossel"), React.createElement("div", {
                className: "grid grid-cols-2 md:grid-cols-4 gap-3"
            }, [0, 1, 2, 3].map(e => React.createElement("div", {
                key: e,
                className: "relative"
            }, React.createElement("div", {
                className: "aspect-video bg-white/20 rounded-lg overflow-hidden border-2 border-dashed border-white/50 flex items-center justify-center"
            }, fe.imagens[e] ? React.createElement("img", {
                src: fe.imagens[e],
                alt: `Imagem ${e+1}`,
                className: "w-full h-full object-cover"
            }) : React.createElement("span", {
                className: "text-white/70 text-sm"
            }, "Imagem ", e + 1)), React.createElement("input", {
                type: "file",
                accept: "image/*",
                onChange: t => (async (e, t) => {
                    if (!t) return;
                    const a = new FileReader;
                    a.onload = t => {
                        const a = [...fe.imagens];
                        a[e] = t.target.result, Ne({
                            ...fe,
                            imagens: a
                        })
                    }, a.readAsDataURL(t)
                })(e, t.target.files[0]),
                className: "absolute inset-0 opacity-0 cursor-pointer"
            }), fe.imagens[e] && React.createElement("button", {
                onClick: () => {
                    const t = [...fe.imagens];
                    t[e] = null, Ne({
                        ...fe,
                        imagens: t
                    })
                },
                className: "absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
            }, "✕"))))), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "block text-sm font-semibold mb-2"
            }, "❓ 5 Afirmações (CERTO ou ERRADO)"), React.createElement("div", {
                className: "space-y-3"
            }, [0, 1, 2, 3, 4].map(e => React.createElement("div", {
                key: e,
                className: "flex gap-3 items-center bg-white/10 rounded-lg p-3"
            }, React.createElement("span", {
                className: "font-bold text-lg"
            }, e + 1, "."), React.createElement("input", {
                type: "text",
                value: fe.perguntas[e]?.texto || "",
                onChange: t => {
                    const a = [...fe.perguntas];
                    a[e] = {
                        ...a[e],
                        texto: t.target.value
                    }, Ne({
                        ...fe,
                        perguntas: a
                    })
                },
                className: "flex-1 px-3 py-2 border rounded-lg text-gray-800",
                placeholder: `Afirmação ${e+1}...`
            }), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("button", {
                onClick: () => {
                    const t = [...fe.perguntas];
                    t[e] = {
                        ...t[e],
                        resposta: !0
                    }, Ne({
                        ...fe,
                        perguntas: t
                    })
                },
                className: "px-3 py-2 rounded-lg font-semibold text-sm " + (!0 === fe.perguntas[e]?.resposta ? "bg-green-500" : "bg-white/20 hover:bg-white/30")
            }, "CERTO"), React.createElement("button", {
                onClick: () => {
                    const t = [...fe.perguntas];
                    t[e] = {
                        ...t[e],
                        resposta: !1
                    }, Ne({
                        ...fe,
                        perguntas: t
                    })
                },
                className: "px-3 py-2 rounded-lg font-semibold text-sm " + (!1 === fe.perguntas[e]?.resposta ? "bg-red-500" : "bg-white/20 hover:bg-white/30")
            }, "ERRADO")))))), React.createElement("button", {
                onClick: Fl,
                disabled: c,
                className: "w-full py-3 bg-white text-purple-700 rounded-lg font-bold hover:bg-purple-50 disabled:opacity-50"
            }, c ? "Salvando..." : "💾 Salvar Configuração do Quiz"))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-6 mb-6"
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-4"
            }, React.createElement("h3", {
                className: "font-bold text-lg text-purple-700"
            }, "📊 Histórico do Quiz"), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("span", {
                className: "px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold"
            }, ye.length, " participantes"), React.createElement("span", {
                className: "px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold"
            }, ye.filter(e => e.passou).length, " contemplados"))), React.createElement("div", {
                className: "grid grid-cols-4 gap-3 mb-4"
            }, React.createElement("div", {
                className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"
            }, React.createElement("p", {
                className: "text-2xl font-bold text-blue-600"
            }, ye.length), React.createElement("p", {
                className: "text-xs text-blue-700"
            }, "Total")), React.createElement("div", {
                className: "bg-green-50 border border-green-200 rounded-lg p-3 text-center"
            }, React.createElement("p", {
                className: "text-2xl font-bold text-green-600"
            }, ye.filter(e => e.passou).length), React.createElement("p", {
                className: "text-xs text-green-700"
            }, "Contemplados")), React.createElement("div", {
                className: "bg-red-50 border border-red-200 rounded-lg p-3 text-center"
            }, React.createElement("p", {
                className: "text-2xl font-bold text-red-600"
            }, ye.filter(e => !e.passou).length), React.createElement("p", {
                className: "text-xs text-red-700"
            }, "Não passou")), React.createElement("div", {
                className: "bg-purple-50 border border-purple-200 rounded-lg p-3 text-center"
            }, React.createElement("p", {
                className: "text-2xl font-bold text-purple-600"
            }, er(ye.filter(e => e.passou).length * (fe.valor_gratuidade || 500))), React.createElement("p", {
                className: "text-xs text-purple-700"
            }, "Total Gratuidades"))), 0 === ye.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8"
            }, "Nenhum participante ainda") : React.createElement("div", {
                className: "overflow-x-auto max-h-80"
            }, React.createElement("table", {
                className: "w-full text-sm"
            }, React.createElement("thead", {
                className: "bg-gray-100 sticky top-0"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-3 py-2 text-left font-semibold"
            }, "Data/Hora"), React.createElement("th", {
                className: "px-3 py-2 text-left font-semibold"
            }, "Profissional"), React.createElement("th", {
                className: "px-3 py-2 text-left font-semibold"
            }, "COD"), React.createElement("th", {
                className: "px-3 py-2 text-center font-semibold"
            }, "Acertos"), React.createElement("th", {
                className: "px-3 py-2 text-center font-semibold"
            }, "Resultado"), React.createElement("th", {
                className: "px-3 py-2 text-center font-semibold"
            }, "Gratuidade"))), React.createElement("tbody", null, ye.map(e => React.createElement("tr", {
                key: e.id,
                className: "border-b hover:bg-gray-50 " + (e.passou ? "bg-green-50" : "")
            }, React.createElement("td", {
                className: "px-3 py-2 text-xs text-gray-600"
            }, new Date(e.created_at).toLocaleDateString("pt-BR"), " ", new Date(e.created_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            })), React.createElement("td", {
                className: "px-3 py-2 font-medium"
            }, e.user_name), React.createElement("td", {
                className: "px-3 py-2 text-gray-600"
            }, e.user_cod), React.createElement("td", {
                className: "px-3 py-2 text-center"
            }, React.createElement("span", {
                className: "font-bold " + (5 === e.acertos ? "text-green-600" : "text-red-600")
            }, e.acertos, "/5")), React.createElement("td", {
                className: "px-3 py-2 text-center"
            }, React.createElement("span", {
                className: "px-2 py-1 rounded-full text-xs font-bold " + (e.passou ? "bg-green-500 text-white" : "bg-red-400 text-white")
            }, e.passou ? "✅ Contemplado" : "❌ Não passou")), React.createElement("td", {
                className: "px-3 py-2 text-center"
            }, e.passou ? React.createElement("span", {
                className: "font-bold text-green-600"
            }, er(fe.valor_gratuidade || 500)) : React.createElement("span", {
                className: "text-gray-400"
            }, "-")))))))), React.createElement("hr", {
                className: "my-6 border-gray-300"
            }), React.createElement("h3", {
                className: "text-lg font-bold text-gray-700 mb-4"
            }, "📋 Promoções por Cliente/Região"), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-6 mb-6"
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-4"
            }, React.createElement("h2", {
                className: "text-xl font-bold text-green-800"
            }, p.editPromoNovatos ? "✏️ Editar Promoção" : "🚀 Cadastrar Nova Promoção"), p.editPromoNovatos && React.createElement("button", {
                onClick: () => {
                    x({
                        ...p,
                        editPromoNovatos: null,
                        novatosRegiao: "",
                        novatosApelido: "",
                        novatosValor: "",
                        novatosQtdEntregas: "",
                        novatosDetalhes: ""
                    });
                    setClientesSelecionados([]);
                    setClientesBINovatos([]);
                },
                className: "text-sm text-gray-500 hover:text-gray-700"
            }, "✕ Cancelar edição")), 
            
            // Linha 1: Região e Apelido
            React.createElement("div", {
                className: "grid md:grid-cols-2 gap-4 mb-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Região *"), React.createElement("select", {
                value: p.novatosRegiao || "",
                onChange: e => {
                    const novaRegiao = e.target.value;
                    x({
                        ...p,
                        novatosRegiao: novaRegiao
                    });
                    setClientesSelecionados([]);
                    carregarClientesPorRegiao(novaRegiao);
                },
                className: "w-full px-4 py-2 border rounded-lg bg-white"
            }, React.createElement("option", { value: "" }, "Selecione uma região..."),
               React.createElement("option", { value: "Todas" }, "🌍 Todas as Regiões"),
               regioesNovatos.map(regiao => React.createElement("option", { key: regiao, value: regiao }, regiao))
            )), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Apelido da Promoção *"), React.createElement("input", {
                type: "text",
                value: p.novatosApelido || "",
                onChange: e => x({
                    ...p,
                    novatosApelido: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                placeholder: "Ex: Porto Seco, Magazine Luiza..."
            }))),
            
            // Linha 2: Multi-select de Clientes
            p.novatosRegiao && React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Clientes * ", carregandoClientes && React.createElement("span", { className: "text-gray-400" }, "(carregando...)")),
            
            // Select de clientes disponíveis
            React.createElement("select", {
                onChange: e => {
                    if (!e.target.value) return;
                    const cliente = clientesBINovatos.find(c => String(c.cod_cliente) === e.target.value);
                    if (cliente && !clientesSelecionados.some(c => c.cod_cliente === cliente.cod_cliente)) {
                        setClientesSelecionados([...clientesSelecionados, cliente]);
                    }
                    e.target.value = "";
                },
                className: "w-full px-4 py-2 border rounded-lg bg-white mb-2",
                disabled: carregandoClientes || clientesBINovatos.length === 0
            }, React.createElement("option", { value: "" }, carregandoClientes ? "Carregando clientes..." : clientesBINovatos.length === 0 ? "Nenhum cliente encontrado para esta região" : `Selecione um cliente (${clientesBINovatos.length} disponíveis)...`),
               clientesBINovatos.filter(c => !clientesSelecionados.some(s => s.cod_cliente === c.cod_cliente)).map(cliente => 
                   React.createElement("option", { 
                       key: cliente.cod_cliente, 
                       value: cliente.cod_cliente 
                   }, cliente.mascara ? `${cliente.mascara} (${cliente.cod_cliente})` : `${cliente.nome_original} (${cliente.cod_cliente})`)
               )
            ),
            
            // Chips de clientes selecionados
            clientesSelecionados.length > 0 && React.createElement("div", {
                className: "flex flex-wrap gap-2 mt-2"
            }, clientesSelecionados.map(cliente => React.createElement("span", {
                key: cliente.cod_cliente,
                className: "inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            }, React.createElement("span", null, cliente.mascara || cliente.nome_display || cliente.nome_original), React.createElement("span", { className: "text-xs text-blue-500" }, "(", cliente.cod_cliente, ")"), React.createElement("button", {
                onClick: () => setClientesSelecionados(clientesSelecionados.filter(c => c.cod_cliente !== cliente.cod_cliente)),
                className: "ml-1 text-blue-500 hover:text-red-500 font-bold"
            }, "×")))),
            
            clientesSelecionados.length > 0 && React.createElement("p", {
                className: "text-xs text-green-600 mt-1"
            }, "✅ ", clientesSelecionados.length, " cliente(s) selecionado(s)")),
            
            // Linha 3: Valor, Meta e Detalhes
            React.createElement("div", {
                className: "grid md:grid-cols-2 gap-4 mb-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Valor do Bônus (R$) *"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: p.novatosValor || "",
                onChange: e => x({
                    ...p,
                    novatosValor: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                placeholder: "Ex: 150.00"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Meta de Entregas *"), React.createElement("input", {
                type: "number",
                value: p.novatosQtdEntregas || "",
                onChange: e => x({
                    ...p,
                    novatosQtdEntregas: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                placeholder: "Ex: 50"
            }))), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Detalhes da Promoção (opcional)"), React.createElement("textarea", {
                value: p.novatosDetalhes || "",
                onChange: e => x({
                    ...p,
                    novatosDetalhes: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                rows: "2",
                placeholder: "Ex: Vaga para motoboy com moto própria..."
            })), React.createElement("div", {
                className: "flex items-center gap-4"
            }, React.createElement("button", {
                onClick: p.editPromoNovatos ? Tl : Pl,
                disabled: c || clientesSelecionados.length === 0,
                className: "px-6 py-2 text-white rounded-lg font-semibold disabled:opacity-50 " + (p.editPromoNovatos ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700")
            }, c ? "..." : p.editPromoNovatos ? "💾 Salvar Alterações" : "➕ Criar Promoção"), React.createElement("p", {
                className: "text-xs text-gray-500"
            }, "⏱️ Inscrições expiram automaticamente em 15 dias"))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-6 mb-6"
            }, React.createElement("h3", {
                className: "font-semibold mb-4"
            }, "📋 Promoções Novatos Cadastradas"), 0 === ce.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-4"
            }, "Nenhuma promoção cadastrada") : React.createElement("div", {
                className: "grid md:grid-cols-3 gap-3"
            }, ce.map(e => React.createElement("div", {
                key: e.id,
                className: "border rounded-lg p-3 " + ("ativa" === e.status ? "border-green-300 bg-green-50" : "border-gray-300 bg-gray-50")
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-1"
            }, React.createElement("span", {
                className: "px-2 py-0.5 rounded text-xs font-bold " + ("ativa" === e.status ? "bg-green-500 text-white" : "bg-gray-500 text-white")
            }, "ativa" === e.status ? "✅" : "⏸️"), React.createElement("div", {
                className: "flex gap-1"
            }, React.createElement("button", {
                onClick: async () => {
                    x({
                        ...p,
                        editPromoNovatos: e,
                        novatosRegiao: e.regiao,
                        novatosApelido: e.apelido || e.cliente,
                        novatosValor: e.valor_bonus,
                        novatosQtdEntregas: e.quantidade_entregas || 50,
                        novatosDetalhes: e.detalhes || ""
                    });
                    // Carregar clientes da região e preencher os selecionados
                    await carregarClientesPorRegiao(e.regiao);
                    if (e.clientes_vinculados && e.clientes_vinculados.length > 0) {
                        setClientesSelecionados(e.clientes_vinculados.map(c => ({
                            cod_cliente: c.cod_cliente,
                            nome_display: c.nome_cliente,
                            nome_original: c.nome_cliente
                        })));
                    }
                },
                className: "text-xs text-blue-500 hover:text-blue-700",
                title: "Editar"
            }, "✏️"), React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/promocoes-novatos/${e.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "ativa" === e.status ? "inativa" : "ativa"
                        })
                    }), Cl()
                },
                className: "text-xs text-gray-500 hover:text-gray-700",
                title: "ativa" === e.status ? "Desativar" : "Ativar"
            }, "ativa" === e.status ? "⏸️" : "▶️"), React.createElement("button", {
                onClick: () => (async e => {
                    if (confirm("Tem certeza que deseja excluir esta promoção?")) {
                        s(!0);
                        try {
                            const t = await fetchAuth(`${API_URL}/promocoes-novatos/${e}`, {
                                method: "DELETE"
                            });
                            if (!t.ok) {
                                const e = await t.json();
                                throw new Error(e.error || "Erro ao excluir")
                            }
                            ja("🗑️ Promoção excluída!", "success"), await Cl()
                        } catch (e) {
                            ja(e.message, "error")
                        } finally {
                            s(!1)
                        }
                    }
                })(e.id),
                className: "text-xs text-red-500 hover:text-red-700",
                title: "Excluir"
            }, "🗑️"))), React.createElement("p", {
                className: "font-semibold text-sm"
            }, "📍 ", e.regiao), React.createElement("p", {
                className: "text-sm text-gray-700 font-bold"
            }, "🏷️ ", e.apelido || e.cliente), 
            // Mostrar clientes vinculados
            e.clientes_vinculados && e.clientes_vinculados.length > 0 && React.createElement("div", {
                className: "mt-1"
            }, React.createElement("p", {
                className: "text-xs text-gray-500"
            }, "Clientes (", e.clientes_vinculados.length, "):"), React.createElement("div", {
                className: "flex flex-wrap gap-1 mt-1"
            }, e.clientes_vinculados.slice(0, 3).map(c => React.createElement("span", {
                key: c.cod_cliente,
                className: "text-xs bg-blue-100 text-blue-700 px-1 rounded"
            }, c.nome_cliente || c.cod_cliente)), e.clientes_vinculados.length > 3 && React.createElement("span", {
                className: "text-xs text-gray-400"
            }, "+", e.clientes_vinculados.length - 3, " mais"))),
            React.createElement("p", {
                className: "text-lg font-bold text-green-600"
            }, er(e.valor_bonus)), React.createElement("p", {
                className: "text-xs text-blue-600 font-semibold"
            }, "🎯 Meta: ", e.quantidade_entregas || 50, " entregas"), e.detalhes && React.createElement("p", {
                className: "text-xs text-gray-600 mt-1 whitespace-pre-wrap line-clamp-2",
                title: e.detalhes
            }, e.detalhes))))), React.createElement("div", {
                className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            }, React.createElement("div", {
                className: "bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center"
            }, React.createElement("p", {
                className: "text-3xl font-bold text-yellow-600"
            }, ne.filter(e => {
                const totalEntregas = e.total_entregas || 0;
                const metaEntregas = e.meta_entregas || 50;
                const metaAtingida = totalEntregas >= metaEntregas;
                const expirado = e.expires_at && new Date() > new Date(e.expires_at);
                return !metaAtingida && !expirado && !e.credito_lancado;
            }).length), React.createElement("p", {
                className: "text-sm text-yellow-700"
            }, "Pendentes")), React.createElement("div", {
                className: "bg-green-50 border border-green-200 rounded-xl p-4 text-center"
            }, React.createElement("p", {
                className: "text-3xl font-bold text-green-600"
            }, ne.filter(e => {
                const totalEntregas = e.total_entregas || 0;
                const metaEntregas = e.meta_entregas || 50;
                return totalEntregas >= metaEntregas && !e.credito_lancado;
            }).length), React.createElement("p", {
                className: "text-sm text-green-700"
            }, "Completos")), React.createElement("div", {
                className: "bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"
            }, React.createElement("p", {
                className: "text-3xl font-bold text-blue-600"
            }, ne.filter(e => e.credito_lancado).length), React.createElement("p", {
                className: "text-sm text-blue-700"
            }, "Lançados")), React.createElement("div", {
                className: "bg-gray-50 border border-gray-200 rounded-xl p-4 text-center"
            }, React.createElement("p", {
                className: "text-3xl font-bold text-gray-600"
            }, ne.filter(e => {
                const totalEntregas = e.total_entregas || 0;
                const metaEntregas = e.meta_entregas || 50;
                const metaAtingida = totalEntregas >= metaEntregas;
                const expirado = e.expires_at && new Date() > new Date(e.expires_at);
                return expirado && !metaAtingida && !e.credito_lancado;
            }).length), React.createElement("p", {
                className: "text-sm text-gray-700"
            }, "Expirados"))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-6"
            }, React.createElement("h3", {
                className: "font-semibold mb-4"
            }, "🚀 Inscrições Promo"), 0 === ne.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8"
            }, "Nenhuma inscrição recebida") : React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-sm"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Data"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Profissional"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "COD"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Região"), React.createElement("th", {
                className: "px-2 py-3 text-left text-xs"
            }, "Cliente"), React.createElement("th", {
                className: "px-2 py-3 text-center text-xs"
            }, "Bônus"), React.createElement("th", {
                className: "px-2 py-3 text-center text-xs"
            }, "Expira"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Progresso"), React.createElement("th", {
                className: "px-2 py-3 text-center text-xs"
            }, "Crédito"), React.createElement("th", {
                className: "px-2 py-3 text-center text-xs"
            }, ""))), React.createElement("tbody", null, 
            // Ordenar inscrições: 1) Contempladas sem crédito no topo, 2) Por progresso desc
            [...ne].sort((a, b) => {
                const aTotal = a.total_entregas || 0;
                const bTotal = b.total_entregas || 0;
                const aMeta = a.meta_entregas || 50;
                const bMeta = b.meta_entregas || 50;
                const aAtingida = aTotal >= aMeta;
                const bAtingida = bTotal >= bMeta;
                const aSemCredito = aAtingida && !a.credito_lancado;
                const bSemCredito = bAtingida && !b.credito_lancado;
                
                // Contempladas sem crédito primeiro
                if (aSemCredito && !bSemCredito) return -1;
                if (!aSemCredito && bSemCredito) return 1;
                
                // Depois por percentual de progresso (maior primeiro)
                const aPerc = (aTotal / aMeta) * 100;
                const bPerc = (bTotal / bMeta) * 100;
                return bPerc - aPerc;
            }).map(e => {
                const t = e.expires_at ? new Date(e.expires_at) : null,
                    a = t && new Date > t,
                    totalEntregas = e.total_entregas || 0,
                    metaEntregas = e.meta_entregas || 50,
                    metaAtingida = e.meta_atingida || totalEntregas >= metaEntregas,
                    percentual = Math.min(100, Math.round((totalEntregas / metaEntregas) * 100));
                
                // Determinar status visual - AUTOMÁTICO
                let statusTexto, statusClasse, statusIcone;
                if (e.credito_lancado) {
                    statusTexto = "Lançado";
                    statusClasse = "bg-blue-100 text-blue-700";
                    statusIcone = "💰";
                } else if (metaAtingida) {
                    statusTexto = "Completo";
                    statusClasse = "bg-green-100 text-green-700";
                    statusIcone = "✅";
                } else if (a) {
                    statusTexto = "Expirado";
                    statusClasse = "bg-gray-200 text-gray-700";
                    statusIcone = "⏰";
                } else {
                    statusTexto = "Pendente";
                    statusClasse = "bg-yellow-100 text-yellow-700";
                    statusIcone = "⏳";
                }
                
                return React.createElement("tr", {
                    key: e.id,
                    className: "border-b " + (e.credito_lancado ? "bg-blue-50" : metaAtingida ? "bg-green-50" : a ? "bg-gray-100" : "")
                }, React.createElement("td", {
                    className: "px-2 py-3 text-xs"
                }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                    className: "px-2 py-3 text-xs font-medium"
                }, e.user_name), React.createElement("td", {
                    className: "px-2 py-3 text-xs"
                }, e.user_cod), React.createElement("td", {
                    className: "px-2 py-3 text-xs"
                }, e.regiao), React.createElement("td", {
                    className: "px-2 py-3 text-xs"
                }, e.cliente), React.createElement("td", {
                    className: "px-2 py-3 text-center text-xs font-bold text-green-600"
                }, er(e.valor_bonus)), React.createElement("td", {
                    className: "px-2 py-3 text-center text-xs"
                }, t ? React.createElement("span", {
                    className: a ? "text-red-500" : "text-gray-600"
                }, t.toLocaleDateString("pt-BR")) : "-"), 
                
                // Coluna de Progresso com barra e status
                React.createElement("td", {
                    className: "px-3 py-3"
                }, React.createElement("div", {
                    className: "flex flex-col items-center gap-1"
                }, 
                // Barra de progresso
                React.createElement("div", {
                    className: "w-full bg-gray-200 rounded-full h-2"
                }, React.createElement("div", {
                    className: "h-2 rounded-full transition-all " + (percentual >= 100 ? "bg-green-500" : percentual >= 50 ? "bg-yellow-500" : "bg-orange-500"),
                    style: { width: percentual + "%" }
                })),
                // Texto do progresso
                React.createElement("span", {
                    className: "text-xs font-bold " + (percentual >= 100 ? "text-green-600" : "text-gray-600")
                }, totalEntregas, "/", metaEntregas),
                // Badge de status
                React.createElement("span", {
                    className: "px-2 py-0.5 rounded-full text-xs font-bold " + statusClasse
                }, statusIcone, " ", statusTexto))),
                
                // Coluna de Crédito - botão aparece quando meta atingida
                React.createElement("td", {
                    className: "px-2 py-3 text-center"
                }, metaAtingida ? (
                    e.credito_lancado ? React.createElement("div", null, React.createElement("span", {
                        className: "text-xs text-blue-600 font-bold"
                    }, "💰 Lançado"), e.lancado_por && React.createElement("p", {
                        className: "text-xs text-gray-400"
                    }, e.lancado_por)) : React.createElement("button", {
                        onClick: async () => {
                            s(!0);
                            try {
                                if (!(await fetchAuth(`${API_URL}/inscricoes-novatos/${e.id}/credito`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            credito_lancado: !0,
                                            lancado_por: l.fullName
                                        })
                                    })).ok) throw new Error("Erro ao creditar");
                                ja("✅ Crédito lançado!", "success"), await Sl()
                            } catch (err) {
                                ja("Erro ao creditar", "error")
                            } finally {
                                s(!1)
                            }
                        },
                        className: "px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 font-semibold",
                        disabled: c
                    }, "💰 Lançar")
                ) : React.createElement("span", {
                    className: "text-xs text-gray-400"
                }, "-")),
                
                // Coluna de Ações (deletar)
                React.createElement("td", {
                    className: "px-2 py-3 text-center"
                }, React.createElement("button", {
                    onClick: async () => {
                        if (!confirm("Tem certeza que deseja excluir esta inscrição?")) return;
                        s(!0);
                        try {
                            const resp = await fetchAuth(`${API_URL}/inscricoes-novatos/${e.id}`, {
                                method: "DELETE"
                            });
                            if (!resp.ok) throw new Error("Erro ao excluir");
                            ja("🗑️ Inscrição excluída!", "success");
                            await Sl();
                        } catch (err) {
                            ja("Erro ao excluir inscrição", "error");
                        } finally {
                            s(!1);
                        }
                    },
                    className: "p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors",
                    disabled: c,
                    title: "Excluir inscrição"
                }, "🗑️")))
            })))))), "loja" === p.finTab && React.createElement(React.Fragment, null, React.createElement("div", {
                className: "bg-white rounded-xl shadow mb-6"
            }, React.createElement("div", {
                className: "flex border-b"
            }, ["produtos", "estoque", "pedidos", "sugestoes"].map(e => React.createElement("button", {
                key: e,
                onClick: () => {
                    mt(e), "estoque" === e && Ja(), "produtos" === e && (Ha(), Ja()), "pedidos" === e && Wa(), "sugestoes" === e && Ya()
                },
                className: "flex-1 px-4 py-3 text-sm font-semibold relative " + (nt === e ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50" : "text-gray-600 hover:bg-gray-50")
            }, "produtos" === e && "🏷️ Produtos", "estoque" === e && "📦 Estoque", "pedidos" === e && "🛍️ Pedidos", "sugestoes" === e && React.createElement(React.Fragment, null, "💡 Sugestões", ut.filter(e => "pendente" === e.status).length > 0 && React.createElement("span", {
                className: "absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
            }, ut.filter(e => "pendente" === e.status).length))))), React.createElement("div", {
                className: "p-6"
            }, "estoque" === nt && React.createElement(React.Fragment, null, React.createElement("div", {
                className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
            }, React.createElement("div", null, React.createElement("h2", {
                className: "text-xl font-bold text-gray-800"
            }, "📦 Controle de Estoque"), React.createElement("p", {
                className: "text-sm text-gray-500"
            }, "Gerencie produtos, entradas e saídas")), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("div", {
                className: "flex bg-gray-100 rounded-lg p-1"
            }, React.createElement("button", {
                onClick: () => {
                    xt("lista")
                },
                className: "px-3 py-1.5 rounded-lg text-sm font-semibold transition-all " + ("lista" === pt ? "bg-white shadow text-purple-700" : "text-gray-600 hover:text-gray-800")
            }, "📋 Produtos"), React.createElement("button", {
                onClick: () => {
                    xt("movimentacoes"), Qa()
                },
                className: "px-3 py-1.5 rounded-lg text-sm font-semibold transition-all " + ("movimentacoes" === pt ? "bg-white shadow text-purple-700" : "text-gray-600 hover:text-gray-800")
            }, "📊 Histórico")), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaEstoqueModal: !0,
                    lojaEstoqueEdit: null
                }),
                className: "px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            }, "➕ Novo Item"))), React.createElement("div", {
                className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("p", {
                className: "text-sm text-gray-600"
            }, "Total de Itens"), React.createElement("p", {
                className: "text-2xl font-bold text-purple-600"
            }, Ze.length)), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("p", {
                className: "text-sm text-gray-600"
            }, "Itens Ativos"), React.createElement("p", {
                className: "text-2xl font-bold text-green-600"
            }, Ze.filter(e => "ativo" === e.status).length)), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("p", {
                className: "text-sm text-gray-600"
            }, "Qtd. Total em Estoque"), React.createElement("p", {
                className: "text-2xl font-bold text-blue-600"
            }, Ze.reduce((e, t) => t.tem_tamanho && t.tamanhos ? e + t.tamanhos.reduce((e, t) => e + (t.quantidade || 0), 0) : e + (t.quantidade || 0), 0))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("p", {
                className: "text-sm text-gray-600"
            }, "Valor Total"), React.createElement("p", {
                className: "text-2xl font-bold text-green-600"
            }, "R$ ", Ze.reduce((e, t) => {
                const a = t.tem_tamanho && t.tamanhos ? t.tamanhos.reduce((e, t) => e + (t.quantidade || 0), 0) : t.quantidade || 0;
                return e + parseFloat(t.valor) * a
            }, 0).toFixed(2).replace(".", ",")))), "lista" === pt && React.createElement("div", {
                className: "grid gap-4"
            }, 0 === Ze.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8"
            }, "Nenhum item no estoque") : Ze.map(e => {
                const t = e.tem_tamanho && e.tamanhos ? e.tamanhos.reduce((e, t) => e + (t.quantidade || 0), 0) : e.quantidade || 0,
                    a = t > 0 && t <= 3,
                    l = 0 === t;
                return React.createElement("div", {
                    key: e.id,
                    className: "border-2 rounded-xl p-4 hover:shadow-md transition-shadow " + (l ? "border-red-200 bg-red-50" : a ? "border-yellow-200 bg-yellow-50" : "border-gray-200")
                }, React.createElement("div", {
                    className: "flex gap-4"
                }, e.imagem_url && React.createElement("img", {
                    src: e.imagem_url,
                    alt: e.nome,
                    className: "w-24 h-24 object-contain rounded-lg bg-gray-100"
                }), React.createElement("div", {
                    className: "flex-1"
                }, React.createElement("div", {
                    className: "flex justify-between items-start"
                }, React.createElement("div", null, React.createElement("h3", {
                    className: "font-bold text-gray-800 text-lg"
                }, e.nome), e.marca && React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "Marca: ", e.marca), React.createElement("p", {
                    className: "text-lg font-bold text-green-600"
                }, "R$ ", parseFloat(e.valor).toFixed(2).replace(".", ","))), React.createElement("div", {
                    className: "flex flex-col items-end gap-1"
                }, React.createElement("span", {
                    className: "px-3 py-1 rounded-full text-xs font-bold " + ("ativo" === e.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
                }, "ativo" === e.status ? "✅ Ativo" : "❌ Inativo"), l && React.createElement("span", {
                    className: "px-2 py-0.5 bg-red-500 text-white text-xs rounded-full"
                }, "SEM ESTOQUE"), a && !l && React.createElement("span", {
                    className: "px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full"
                }, "ESTOQUE BAIXO"))), e.tem_tamanho && e.tamanhos && e.tamanhos.length > 0 ? React.createElement("div", {
                    className: "mt-3"
                }, React.createElement("p", {
                    className: "text-xs text-gray-500 mb-1"
                }, "Tamanhos em estoque:"), React.createElement("div", {
                    className: "flex flex-wrap gap-2"
                }, e.tamanhos.map(e => React.createElement("span", {
                    key: e.id,
                    className: "px-3 py-1 rounded-lg text-sm font-semibold " + (e.quantidade <= 0 ? "bg-red-100 text-red-700" : e.quantidade <= 3 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700")
                }, e.tamanho, ": ", React.createElement("strong", null, e.quantidade))))) : React.createElement("div", {
                    className: "mt-3 flex items-center gap-2"
                }, React.createElement("span", {
                    className: "text-sm text-gray-600"
                }, "Quantidade:"), React.createElement("span", {
                    className: "px-3 py-1 rounded-lg text-lg font-bold " + (e.quantidade <= 0 ? "bg-red-100 text-red-700" : e.quantidade <= 3 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700")
                }, e.quantidade))), React.createElement("div", {
                    className: "flex flex-col gap-2"
                }, React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        lojaMovModal: !0,
                        lojaMovItem: e,
                        lojaMovTipo: "entrada"
                    }),
                    className: "px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-200 flex items-center gap-1"
                }, "📥 Entrada"), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        lojaMovModal: !0,
                        lojaMovItem: e,
                        lojaMovTipo: "saida"
                    }),
                    className: "px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-200 flex items-center gap-1"
                }, "📤 Saída"), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        lojaEstoqueModal: !0,
                        lojaEstoqueEdit: e
                    }),
                    className: "px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
                }, "✏️ Editar"), React.createElement("button", {
                    onClick: async () => {
                        confirm("Excluir este item do estoque?") && (await fetchAuth(`${API_URL}/loja/estoque/${e.id}`, {
                            method: "DELETE"
                        }), Ja(), ja("🗑️ Item excluído!", "success"))
                    },
                    className: "px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200"
                }, "🗑️"))))
            })), "movimentacoes" === pt && React.createElement("div", {
                className: "bg-white rounded-xl shadow"
            }, React.createElement("div", {
                className: "p-4 border-b"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800"
            }, "📊 Histórico de Movimentações"), React.createElement("p", {
                className: "text-sm text-gray-500"
            }, "Todas as entradas e saídas do estoque")), React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-sm"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Data/Hora"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Produto"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Tipo"), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Tam."), React.createElement("th", {
                className: "px-4 py-3 text-center"
            }, "Qtd."), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Motivo"), React.createElement("th", {
                className: "px-4 py-3 text-left"
            }, "Por"))), React.createElement("tbody", null, 0 === it.length ? React.createElement("tr", null, React.createElement("td", {
                colSpan: "7",
                className: "text-center py-8 text-gray-500"
            }, "Nenhuma movimentação registrada")) : it.map(e => React.createElement("tr", {
                key: e.id,
                className: "border-t hover:bg-gray-50"
            }, React.createElement("td", {
                className: "px-4 py-3 text-xs"
            }, new Date(e.created_at).toLocaleDateString("pt-BR"), React.createElement("br", null), React.createElement("span", {
                className: "text-gray-500"
            }, new Date(e.created_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            }))), React.createElement("td", {
                className: "px-4 py-3"
            }, React.createElement("p", {
                className: "font-semibold"
            }, e.produto_nome), e.marca && React.createElement("p", {
                className: "text-xs text-gray-500"
            }, e.marca)), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, React.createElement("span", {
                className: "px-2 py-1 rounded-full text-xs font-bold " + ("entrada" === e.tipo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
            }, "entrada" === e.tipo ? "📥 Entrada" : "📤 Saída")), React.createElement("td", {
                className: "px-4 py-3 text-center font-semibold"
            }, e.tamanho || "-"), React.createElement("td", {
                className: "px-4 py-3 text-center"
            }, React.createElement("span", {
                className: "text-lg font-bold " + ("entrada" === e.tipo ? "text-green-600" : "text-red-600")
            }, "entrada" === e.tipo ? "+" : "-", e.quantidade)), React.createElement("td", {
                className: "px-4 py-3 text-sm text-gray-600"
            }, e.motivo || "-"), React.createElement("td", {
                className: "px-4 py-3 text-sm"
            }, e.created_by || "-"))))))), p.lojaEstoqueModal && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            }, React.createElement("div", {
                className: "p-6"
            }, React.createElement("h2", {
                className: "text-xl font-bold mb-4"
            }, p.lojaEstoqueEdit ? "✏️ Editar Item" : "➕ Novo Item no Estoque"), React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Nome do Produto *"), React.createElement("input", {
                type: "text",
                value: p.lojaEstoqueNome ?? p.lojaEstoqueEdit?.nome ?? "",
                onChange: e => x({
                    ...p,
                    lojaEstoqueNome: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                placeholder: "Ex: Camiseta Polo"
            })), React.createElement("div", {
                className: "grid grid-cols-2 gap-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Marca"), React.createElement("input", {
                type: "text",
                value: p.lojaEstoqueMarca ?? p.lojaEstoqueEdit?.marca ?? "",
                onChange: e => x({
                    ...p,
                    lojaEstoqueMarca: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                placeholder: "Ex: Nike"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Valor (R$) *"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: p.lojaEstoqueValor ?? p.lojaEstoqueEdit?.valor ?? "",
                onChange: e => x({
                    ...p,
                    lojaEstoqueValor: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                placeholder: "99.90"
            }))), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Imagem do Produto"), React.createElement("div", {
                className: "space-y-2"
            }, (p.lojaEstoqueImagem || p.lojaEstoqueEdit?.imagem_url) && React.createElement("div", {
                className: "relative inline-block"
            }, React.createElement("img", {
                src: p.lojaEstoqueImagem || p.lojaEstoqueEdit?.imagem_url,
                alt: "Preview",
                className: "w-20 h-20 object-cover rounded-lg border"
            }), React.createElement("button", {
                type: "button",
                onClick: () => x({
                    ...p,
                    lojaEstoqueImagem: ""
                }),
                className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
            }, "✕")), React.createElement("label", {
                className: "block cursor-pointer"
            }, React.createElement("div", {
                className: "px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-center font-semibold hover:bg-purple-200 transition-colors text-sm"
            }, p.uploadingEstoqueImage ? "⏳ Enviando..." : "📷 Fazer Upload"), React.createElement("input", {
                type: "file",
                accept: "image/*",
                className: "hidden",
                disabled: p.uploadingEstoqueImage,
                onChange: async e => {
                    const t = e.target.files?.[0];
                    if (t)
                        if (t.size > 15728640) ja("Imagem muito grande (máx 15MB)", "error");
                        else {
                            x({
                                ...p,
                                uploadingEstoqueImage: !0
                            });
                            try {
                                const e = new FileReader;
                                e.onload = e => {
                                    const t = e.target.result;
                                    x({
                                        ...p,
                                        lojaEstoqueImagem: t,
                                        uploadingEstoqueImage: !1
                                    }), ja("✅ Imagem carregada!", "success")
                                }, e.onerror = () => {
                                    throw new Error("Erro ao ler arquivo")
                                }, e.readAsDataURL(t)
                            } catch (e) {
                                console.error("Erro upload:", e), ja("Erro ao carregar imagem", "error"), x({
                                    ...p,
                                    uploadingEstoqueImage: !1
                                })
                            }
                        }
                }
            })), React.createElement("details", {
                className: "text-xs"
            }, React.createElement("summary", {
                className: "cursor-pointer text-gray-500"
            }, "Ou cole uma URL"), React.createElement("input", {
                type: "text",
                placeholder: "https://...",
                value: p.lojaEstoqueImagem ?? p.lojaEstoqueEdit?.imagem_url ?? "",
                onChange: e => x({
                    ...p,
                    lojaEstoqueImagem: e.target.value
                }),
                className: "w-full px-3 py-1 border rounded mt-1 text-sm"
            })))), React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "checkbox",
                id: "temTamanho",
                checked: p.lojaEstoqueTemTamanho ?? p.lojaEstoqueEdit?.tem_tamanho ?? !1,
                onChange: e => x({
                    ...p,
                    lojaEstoqueTemTamanho: e.target.checked
                }),
                className: "w-5 h-5"
            }), React.createElement("label", {
                htmlFor: "temTamanho",
                className: "text-sm font-semibold"
            }, "Este produto tem tamanhos")), (p.lojaEstoqueTemTamanho ?? p.lojaEstoqueEdit?.tem_tamanho) && React.createElement("div", null, React.createElement("div", {
                className: "flex gap-2 mb-3"
            }, React.createElement("button", {
                type: "button",
                onClick: () => x({
                    ...p,
                    lojaEstoqueTipoTamanho: "letras"
                }),
                className: "flex-1 px-3 py-2 rounded-lg text-sm font-semibold border-2 " + ("letras" === (p.lojaEstoqueTipoTamanho ?? p.lojaEstoqueEdit?.tipo_tamanho ?? "letras") ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600")
            }, "PP, P, M, G..."), React.createElement("button", {
                type: "button",
                onClick: () => x({
                    ...p,
                    lojaEstoqueTipoTamanho: "numeros"
                }),
                className: "flex-1 px-3 py-2 rounded-lg text-sm font-semibold border-2 " + ("numeros" === (p.lojaEstoqueTipoTamanho ?? p.lojaEstoqueEdit?.tipo_tamanho) ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600")
            }, "Numeração (34, 36...)")), "letras" === (p.lojaEstoqueTipoTamanho ?? p.lojaEstoqueEdit?.tipo_tamanho ?? "letras") ? React.createElement(React.Fragment, null, React.createElement("label", {
                className: "block text-sm font-semibold mb-2"
            }, "Tamanhos e Quantidades"), React.createElement("div", {
                className: "grid grid-cols-2 gap-2"
            }, ["PP", "P", "M", "G", "GG", "XG", "XXG"].map(e => {
                const t = (p.lojaEstoqueEdit?.tamanhos || []).find(t => t.tamanho === e);
                return React.createElement("div", {
                    key: e,
                    className: "flex items-center gap-2 bg-gray-50 p-2 rounded"
                }, React.createElement("span", {
                    className: "w-10 text-sm font-bold text-purple-700"
                }, e), React.createElement("input", {
                    type: "number",
                    min: "0",
                    value: p[`lojaEstoqueTam_${e}`] ?? t?.quantidade ?? 0,
                    onChange: t => x({
                        ...p,
                        [`lojaEstoqueTam_${e}`]: parseInt(t.target.value) || 0
                    }),
                    className: "flex-1 px-2 py-1 border rounded text-center",
                    placeholder: "0"
                }))
            }))) : React.createElement(React.Fragment, null, React.createElement("label", {
                className: "block text-sm font-semibold mb-2"
            }, "Numerações e Quantidades"), React.createElement("div", {
                className: "space-y-2"
            }, (p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                num: e.tamanho,
                qtd: e.quantidade
            })) ?? [{
                num: "",
                qtd: 0
            }]).map((e, t) => React.createElement("div", {
                key: t,
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "text",
                placeholder: "Ex: 38",
                value: e.num,
                onChange: e => {
                    const a = [...p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                        num: e.tamanho,
                        qtd: e.quantidade
                    })) ?? [{
                        num: "",
                        qtd: 0
                    }]];
                    a[t].num = e.target.value, x({
                        ...p,
                        lojaEstoqueNumeracoes: a
                    })
                },
                className: "w-20 px-2 py-1 border rounded text-center font-bold"
            }), React.createElement("input", {
                type: "number",
                min: "0",
                placeholder: "Qtd",
                value: e.qtd,
                onChange: e => {
                    const a = [...p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                        num: e.tamanho,
                        qtd: e.quantidade
                    })) ?? [{
                        num: "",
                        qtd: 0
                    }]];
                    a[t].qtd = parseInt(e.target.value) || 0, x({
                        ...p,
                        lojaEstoqueNumeracoes: a
                    })
                },
                className: "w-20 px-2 py-1 border rounded text-center"
            }), React.createElement("button", {
                type: "button",
                onClick: () => {
                    const e = [...p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                        num: e.tamanho,
                        qtd: e.quantidade
                    })) ?? [{
                        num: "",
                        qtd: 0
                    }]];
                    e.splice(t, 1), x({
                        ...p,
                        lojaEstoqueNumeracoes: e.length ? e : [{
                            num: "",
                            qtd: 0
                        }]
                    })
                },
                className: "px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
            }, "🗑️"))), React.createElement("button", {
                type: "button",
                onClick: () => {
                    const e = [...p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                        num: e.tamanho,
                        qtd: e.quantidade
                    })) ?? [{
                        num: "",
                        qtd: 0
                    }]];
                    e.push({
                        num: "",
                        qtd: 0
                    }), x({
                        ...p,
                        lojaEstoqueNumeracoes: e
                    })
                },
                className: "w-full px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200"
            }, "➕ Adicionar Numeração")))), !(p.lojaEstoqueTemTamanho ?? p.lojaEstoqueEdit?.tem_tamanho) && React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Quantidade em Estoque *"), React.createElement("input", {
                type: "number",
                min: "0",
                value: p.lojaEstoqueQtd ?? p.lojaEstoqueEdit?.quantidade ?? 0,
                onChange: e => x({
                    ...p,
                    lojaEstoqueQtd: parseInt(e.target.value) || 0
                }),
                className: "w-full px-4 py-2 border rounded-lg"
            }))), React.createElement("div", {
                className: "flex gap-3 mt-6"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaEstoqueModal: !1,
                    lojaEstoqueEdit: null,
                    lojaEstoqueNome: "",
                    lojaEstoqueMarca: "",
                    lojaEstoqueValor: "",
                    lojaEstoqueImagem: "",
                    lojaEstoqueTemTamanho: !1,
                    lojaEstoqueQtd: 0,
                    lojaEstoqueTipoTamanho: null,
                    lojaEstoqueNumeracoes: null
                }),
                className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    const e = p.lojaEstoqueNome ?? p.lojaEstoqueEdit?.nome,
                        t = p.lojaEstoqueValor ?? p.lojaEstoqueEdit?.valor;
                    if (!e || !t) return void ja("Preencha nome e valor", "error");
                    const a = p.lojaEstoqueTemTamanho ?? p.lojaEstoqueEdit?.tem_tamanho,
                        r = p.lojaEstoqueTipoTamanho ?? p.lojaEstoqueEdit?.tipo_tamanho ?? "letras";
                    let o = [];
                    if (a)
                        if ("letras" === r)["PP", "P", "M", "G", "GG", "XG", "XXG"].forEach(e => {
                            const t = p[`lojaEstoqueTam_${e}`] ?? (p.lojaEstoqueEdit?.tamanhos || []).find(t => t.tamanho === e)?.quantidade ?? 0;
                            t > 0 && o.push({
                                tamanho: e,
                                quantidade: t
                            })
                        });
                        else {
                            (p.lojaEstoqueNumeracoes ?? p.lojaEstoqueEdit?.tamanhos?.map(e => ({
                                num: e.tamanho,
                                qtd: e.quantidade
                            })) ?? []).forEach(e => {
                                e.num && e.qtd > 0 && o.push({
                                    tamanho: e.num,
                                    quantidade: e.qtd
                                })
                            })
                        } const c = {
                        nome: e,
                        marca: p.lojaEstoqueMarca ?? p.lojaEstoqueEdit?.marca ?? "",
                        valor: parseFloat(t),
                        quantidade: a ? 0 : p.lojaEstoqueQtd ?? p.lojaEstoqueEdit?.quantidade ?? 0,
                        tem_tamanho: a,
                        tipo_tamanho: r,
                        tamanhos: o,
                        imagem_url: p.lojaEstoqueImagem ?? p.lojaEstoqueEdit?.imagem_url ?? "",
                        created_by: l.fullName
                    };
                    if (!!p.lojaEstoqueEdit) await fetchAuth(`${API_URL}/loja/estoque/${p.lojaEstoqueEdit.id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(c)
                    }), ja("✅ Item atualizado!", "success");
                    else {
                        const e = await fetchAuth(`${API_URL}/loja/estoque`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify(c)
                            }),
                            t = await e.json(),
                            r = a ? o.reduce((e, t) => e + t.quantidade, 0) : c.quantidade || 0;
                        r > 0 && await fetchAuth(`${API_URL}/loja/estoque/${t.id}/entrada`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                quantidade: r,
                                motivo: "Estoque inicial",
                                created_by: l.fullName
                            })
                        }), ja("✅ Item adicionado!", "success")
                    }
                    x({
                        ...p,
                        lojaEstoqueModal: !1,
                        lojaEstoqueEdit: null,
                        lojaEstoqueNome: "",
                        lojaEstoqueMarca: "",
                        lojaEstoqueValor: "",
                        lojaEstoqueImagem: "",
                        lojaEstoqueTemTamanho: !1,
                        lojaEstoqueQtd: 0
                    }), Ja(), Qa()
                },
                className: "flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            }, p.lojaEstoqueEdit ? "💾 Salvar" : "➕ Adicionar"))))), p.lojaMovModal && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-2xl shadow-2xl max-w-md w-full"
            }, React.createElement("div", {
                className: `p-4 rounded-t-2xl ${"entrada"===p.lojaMovTipo?"bg-green-600":"bg-red-600"} text-white`
            }, React.createElement("h2", {
                className: "text-xl font-bold"
            }, "entrada" === p.lojaMovTipo ? "📥 Registrar Entrada" : "📤 Registrar Saída"), React.createElement("p", {
                className: "text-sm opacity-80"
            }, p.lojaMovItem?.nome)), React.createElement("div", {
                className: "p-6 space-y-4"
            }, p.lojaMovItem?.tem_tamanho && p.lojaMovItem?.tamanhos?.length > 0 && React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-2"
            }, "Tamanho"), React.createElement("select", {
                value: p.lojaMovTamanho || "",
                onChange: e => x({
                    ...p,
                    lojaMovTamanho: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg"
            }, React.createElement("option", {
                value: ""
            }, "Selecione o tamanho"), p.lojaMovItem.tamanhos.map(e => React.createElement("option", {
                key: e.tamanho,
                value: e.tamanho
            }, e.tamanho, " (atual: ", e.quantidade, ")")))), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-2"
            }, "Quantidade *"), React.createElement("input", {
                type: "number",
                min: "1",
                value: p.lojaMovQtd || "",
                onChange: e => x({
                    ...p,
                    lojaMovQtd: parseInt(e.target.value) || 0
                }),
                className: "w-full px-4 py-2 border rounded-lg text-2xl font-bold text-center",
                placeholder: "0"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-2"
            }, "Motivo"), React.createElement("input", {
                type: "text",
                value: p.lojaMovMotivo || "",
                onChange: e => x({
                    ...p,
                    lojaMovMotivo: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                placeholder: "entrada" === p.lojaMovTipo ? "Ex: Compra de fornecedor" : "Ex: Produto danificado"
            })), React.createElement("div", {
                className: "flex gap-3 mt-6"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaMovModal: !1,
                    lojaMovItem: null,
                    lojaMovTipo: null,
                    lojaMovQtd: 0,
                    lojaMovMotivo: "",
                    lojaMovTamanho: ""
                }),
                className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    if (!p.lojaMovQtd || p.lojaMovQtd <= 0) return void ja("Informe a quantidade", "error");
                    if (p.lojaMovItem?.tem_tamanho && !p.lojaMovTamanho) return void ja("Selecione o tamanho", "error");
                    const e = "entrada" === p.lojaMovTipo ? "entrada" : "saida";
                    await fetchAuth(`${API_URL}/loja/estoque/${p.lojaMovItem.id}/${e}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            quantidade: p.lojaMovQtd,
                            tamanho: p.lojaMovTamanho || null,
                            motivo: p.lojaMovMotivo || ("entrada" === p.lojaMovTipo ? "Entrada manual" : "Saída manual"),
                            created_by: l.fullName
                        })
                    }), ja("entrada" === p.lojaMovTipo ? "📥 Entrada registrada!" : "📤 Saída registrada!", "success"), x({
                        ...p,
                        lojaMovModal: !1,
                        lojaMovItem: null,
                        lojaMovTipo: null,
                        lojaMovQtd: 0,
                        lojaMovMotivo: "",
                        lojaMovTamanho: ""
                    }), Ja(), Qa()
                },
                className: "flex-1 px-4 py-2 text-white rounded-lg font-semibold " + ("entrada" === p.lojaMovTipo ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")
            }, "entrada" === p.lojaMovTipo ? "📥 Confirmar Entrada" : "📤 Confirmar Saída")))))), "produtos" === nt && React.createElement(React.Fragment, null, React.createElement("div", {
                className: "flex justify-between items-center mb-6"
            }, React.createElement("h2", {
                className: "text-xl font-bold text-gray-800"
            }, "🏷️ Produtos à Venda"), React.createElement("button", {
                onClick: () => {
                    Ja(), x({
                        ...p,
                        lojaProdutoModal: !0,
                        lojaProdutoEdit: null
                    })
                },
                className: "px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            }, "➕ Novo Produto")), React.createElement("div", {
                className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            }, 0 === Ke.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8 col-span-full"
            }, "Nenhum produto cadastrado") : Ke.map(e => React.createElement("div", {
                key: e.id,
                className: "border rounded-xl overflow-hidden hover:shadow-lg transition-shadow " + ("ativo" !== e.status ? "opacity-60" : "")
            }, e.imagem_url && React.createElement("img", {
                src: e.imagem_url,
                alt: e.nome,
                className: "w-full h-40 object-cover"
            }), React.createElement("div", {
                className: "p-4"
            }, React.createElement("div", {
                className: "flex justify-between items-start mb-2"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800"
            }, e.nome), React.createElement("span", {
                className: "px-2 py-0.5 rounded text-xs font-bold " + ("ativo" === e.status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
            }, "ativo" === e.status ? "Ativo" : "Inativo")), e.marca && React.createElement("p", {
                className: "text-sm text-gray-500"
            }, e.marca), React.createElement("p", {
                className: "text-xl font-bold text-green-600 mt-2"
            }, "R$ ", parseFloat(e.valor).toFixed(2).replace(".", ",")), React.createElement("div", {
                className: "mt-3 text-xs text-gray-500"
            }, e.parcelas_config && e.parcelas_config.filter(e => e && parseFloat(e.valor_parcela) > 0).length > 0 ? React.createElement("div", {
                className: "flex flex-wrap gap-1"
            }, e.parcelas_config.filter(e => e && parseFloat(e.valor_parcela) > 0).map((e, t) => React.createElement("span", {
                key: t,
                className: "bg-purple-100 text-purple-700 px-2 py-0.5 rounded"
            }, e.parcelas, "x R$ ", parseFloat(e.valor_parcela).toFixed(2).replace(".", ",")))) : React.createElement("p", {
                className: "text-gray-400"
            }, "Sem parcelas configuradas")), React.createElement("div", {
                className: "flex gap-2 mt-3"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaProdutoModal: !0,
                    lojaProdutoEdit: e
                }),
                className: "flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200"
            }, "✏️ Editar"), React.createElement("button", {
                onClick: async () => {
                    confirm("Excluir este produto?") && (await fetchAuth(`${API_URL}/loja/produtos/${e.id}`, {
                        method: "DELETE"
                    }), Ha(), ja("🗑️ Produto excluído!", "success"))
                },
                className: "px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200"
            }, "🗑️")))))), p.lojaProdutoModal && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            }, React.createElement("div", {
                className: "p-6"
            }, React.createElement("h2", {
                className: "text-xl font-bold mb-4"
            }, p.lojaProdutoEdit ? "✏️ Editar Produto" : "➕ Novo Produto à Venda"), React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Produto do Estoque *"), React.createElement("select", {
                value: p.lojaProdutoEstoqueId ?? p.lojaProdutoEdit?.estoque_id ?? "",
                onChange: e => {
                    const t = Ze.find(t => t.id === parseInt(e.target.value));
                    x({
                        ...p,
                        lojaProdutoEstoqueId: e.target.value,
                        lojaProdutoNome: t?.nome || "",
                        lojaProdutoMarca: t?.marca || "",
                        lojaProdutoValor: t?.valor || "",
                        lojaProdutoImagem: t?.imagem_url || ""
                    })
                },
                className: "w-full px-4 py-2 border rounded-lg bg-white"
            }, React.createElement("option", {
                value: ""
            }, "Selecione..."), Ze.filter(e => "ativo" === e.status).map(e => React.createElement("option", {
                key: e.id,
                value: e.id
            }, e.nome, " - R$ ", parseFloat(e.valor).toFixed(2))))), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Nome do Produto *"), React.createElement("input", {
                type: "text",
                value: p.lojaProdutoNome ?? p.lojaProdutoEdit?.nome ?? "",
                onChange: e => x({
                    ...p,
                    lojaProdutoNome: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Descrição"), React.createElement("textarea", {
                value: p.lojaProdutoDesc ?? p.lojaProdutoEdit?.descricao ?? "",
                onChange: e => x({
                    ...p,
                    lojaProdutoDesc: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg",
                rows: 3,
                placeholder: "Descreva o produto..."
            })), React.createElement("div", {
                className: "grid grid-cols-2 gap-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Marca"), React.createElement("input", {
                type: "text",
                value: p.lojaProdutoMarca ?? p.lojaProdutoEdit?.marca ?? "",
                onChange: e => x({
                    ...p,
                    lojaProdutoMarca: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Valor Original (R$)"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: p.lojaProdutoValor ?? p.lojaProdutoEdit?.valor ?? "",
                onChange: e => x({
                    ...p,
                    lojaProdutoValor: e.target.value
                }),
                className: "w-full px-4 py-2 border rounded-lg"
            }))), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold mb-1"
            }, "Imagem do Produto"), React.createElement("div", {
                className: "space-y-2"
            }, (p.lojaProdutoImagem || p.lojaProdutoEdit?.imagem_url) && React.createElement("div", {
                className: "relative inline-block"
            }, React.createElement("img", {
                src: p.lojaProdutoImagem || p.lojaProdutoEdit?.imagem_url,
                alt: "Preview",
                className: "w-24 h-24 object-cover rounded-lg border"
            }), React.createElement("button", {
                type: "button",
                onClick: () => x({
                    ...p,
                    lojaProdutoImagem: ""
                }),
                className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
            }, "✕")), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("label", {
                className: "flex-1 cursor-pointer"
            }, React.createElement("div", {
                className: "px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-center font-semibold hover:bg-purple-200 transition-colors"
            }, p.uploadingImage ? "⏳ Enviando..." : "📷 Fazer Upload"), React.createElement("input", {
                type: "file",
                accept: "image/*",
                className: "hidden",
                disabled: p.uploadingImage,
                onChange: async e => {
                    const t = e.target.files?.[0];
                    if (t)
                        if (t.size > 15728640) ja("Imagem muito grande (máx 15MB)", "error");
                        else {
                            x({
                                ...p,
                                uploadingImage: !0
                            });
                            try {
                                const e = new FileReader;
                                e.onload = e => {
                                    const t = e.target.result;
                                    x({
                                        ...p,
                                        lojaProdutoImagem: t,
                                        uploadingImage: !1
                                    }), ja("✅ Imagem carregada!", "success")
                                }, e.onerror = () => {
                                    throw new Error("Erro ao ler arquivo")
                                }, e.readAsDataURL(t)
                            } catch (e) {
                                console.error("Erro upload:", e), ja("Erro ao carregar imagem", "error"), x({
                                    ...p,
                                    uploadingImage: !1
                                })
                            }
                        }
                }
            }))), React.createElement("details", {
                className: "text-sm"
            }, React.createElement("summary", {
                className: "cursor-pointer text-gray-500 hover:text-gray-700"
            }, "Ou cole uma URL"), React.createElement("input", {
                type: "text",
                placeholder: "https://...",
                value: p.lojaProdutoImagem ?? p.lojaProdutoEdit?.imagem_url ?? "",
                onChange: e => x({
                    ...p,
                    lojaProdutoImagem: e.target.value
                }),
                className: "w-full px-3 py-2 border rounded-lg mt-2 text-sm"
            })))), React.createElement("div", {
                className: "bg-purple-50 rounded-lg p-4"
            }, React.createElement("div", {
                className: "flex justify-between items-center mb-3"
            }, React.createElement("h3", {
                className: "font-bold text-purple-800"
            }, "💰 Opções de Parcelamento"), React.createElement("button", {
                type: "button",
                onClick: () => {
                    const e = p.lojaProdutoParcelas ?? (p.lojaProdutoEdit?.parcelas_config ? [...p.lojaProdutoEdit.parcelas_config] : []);
                    x({
                        ...p,
                        lojaProdutoParcelas: [...e, {
                            parcelas: 1,
                            valor_parcela: ""
                        }]
                    })
                },
                className: "px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
            }, "➕ Adicionar")), React.createElement("div", {
                className: "space-y-2"
            }, 0 === ((p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config) || []).length ? React.createElement("p", {
                className: "text-sm text-gray-500 text-center py-3 bg-white rounded-lg"
            }, "Nenhuma opção de parcelamento.", React.createElement("br", null), 'Clique em "➕ Adicionar" acima.') : ((p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config) || []).map((e, t) => React.createElement("div", {
                key: t,
                className: "flex gap-2 items-center bg-white p-3 rounded-lg border"
            }, React.createElement("div", {
                className: "w-24"
            }, React.createElement("label", {
                className: "block text-xs text-gray-500 mb-1"
            }, "Parcelas"), React.createElement("select", {
                value: e.parcelas || 1,
                onChange: e => {
                    const a = [...(p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config) || []];
                    a[t] = {
                        ...a[t],
                        parcelas: parseInt(e.target.value)
                    }, x({
                        ...p,
                        lojaProdutoParcelas: a
                    })
                },
                className: "w-full px-2 py-1.5 border rounded text-sm bg-white"
            }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(e => React.createElement("option", {
                key: e,
                value: e
            }, e, "x")))), React.createElement("div", {
                className: "flex-1"
            }, React.createElement("label", {
                className: "block text-xs text-gray-500 mb-1"
            }, "Valor da Parcela (R$)"), React.createElement("input", {
                type: "number",
                step: "0.01",
                value: e.valor_parcela ?? "",
                onChange: e => {
                    const a = [...(p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config) || []];
                    a[t] = {
                        ...a[t],
                        valor_parcela: e.target.value
                    }, x({
                        ...p,
                        lojaProdutoParcelas: a
                    })
                },
                className: "w-full px-2 py-1.5 border rounded text-sm",
                placeholder: "0.00"
            })), React.createElement("div", {
                className: "w-24 text-right"
            }, React.createElement("label", {
                className: "block text-xs text-gray-500 mb-1"
            }, "Total"), React.createElement("span", {
                className: "text-sm font-bold text-green-600"
            }, "R$ ", ((e.parcelas || 1) * (parseFloat(e.valor_parcela) || 0)).toFixed(2).replace(".", ","))), React.createElement("button", {
                type: "button",
                onClick: () => {
                    const e = [...(p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config) || []];
                    e.splice(t, 1), x({
                        ...p,
                        lojaProdutoParcelas: e
                    })
                },
                className: "p-2 text-red-500 hover:bg-red-50 rounded"
            }, "🗑️")))))), React.createElement("div", {
                className: "flex gap-3 mt-6"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaProdutoModal: !1,
                    lojaProdutoEdit: null,
                    lojaProdutoParcelas: null
                }),
                className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    const e = p.lojaProdutoNome ?? p.lojaProdutoEdit?.nome,
                        t = p.lojaProdutoValor ?? p.lojaProdutoEdit?.valor;
                    if (!e || !t) return void ja("Preencha nome e valor", "error");
                    const a = p.lojaProdutoParcelas ?? p.lojaProdutoEdit?.parcelas_config ?? [];
                    if (0 === a.length) return void ja("Adicione pelo menos uma opção de parcelamento", "error");
                    for (const e of a)
                        if (!e.valor_parcela || parseFloat(e.valor_parcela) <= 0) return void ja("Preencha o valor de todas as parcelas", "error");
                    const r = {
                        estoque_id: p.lojaProdutoEstoqueId ?? p.lojaProdutoEdit?.estoque_id,
                        nome: e,
                        descricao: p.lojaProdutoDesc ?? p.lojaProdutoEdit?.descricao ?? "",
                        marca: p.lojaProdutoMarca ?? p.lojaProdutoEdit?.marca ?? "",
                        valor: parseFloat(t),
                        imagem_url: p.lojaProdutoImagem ?? p.lojaProdutoEdit?.imagem_url ?? "",
                        parcelas_config: a.map(e => ({
                            parcelas: parseInt(e.parcelas) || 1,
                            valor_parcela: parseFloat(e.valor_parcela) || 0
                        })),
                        created_by: l.fullName
                    };
                    p.lojaProdutoEdit ? (await fetchAuth(`${API_URL}/loja/produtos/${p.lojaProdutoEdit.id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            ...r,
                            status: p.lojaProdutoEdit.status
                        })
                    }), ja("✅ Produto atualizado!", "success")) : (await fetchAuth(`${API_URL}/loja/produtos`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(r)
                    }), ja("✅ Produto adicionado!", "success")), x({
                        ...p,
                        lojaProdutoModal: !1,
                        lojaProdutoEdit: null,
                        lojaProdutoParcelas: null
                    }), Ha()
                },
                className: "flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            }, p.lojaProdutoEdit ? "💾 Salvar" : "➕ Adicionar")))))), "pedidos" === nt && React.createElement(React.Fragment, null, React.createElement("h2", {
                className: "text-xl font-bold text-gray-800 mb-6"
            }, "🛍️ Pedidos"), React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-sm"
            }, React.createElement("thead", {
                className: "bg-gray-50"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-3 py-3 text-left"
            }, "Data"), React.createElement("th", {
                className: "px-3 py-3 text-left"
            }, "Profissional"), React.createElement("th", {
                className: "px-3 py-3 text-left"
            }, "Produto"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Tam."), React.createElement("th", {
                className: "px-3 py-3 text-right"
            }, "Valor"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Parcelas"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Status"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Débito Lançado"), React.createElement("th", {
                className: "px-3 py-3 text-center"
            }, "Ações"))), React.createElement("tbody", null, 0 === et.length ? React.createElement("tr", null, React.createElement("td", {
                colSpan: "9",
                className: "text-center py-8 text-gray-500"
            }, "Nenhum pedido")) : et.map(e => React.createElement("tr", {
                key: e.id,
                className: "border-t hover:bg-gray-50"
            }, React.createElement("td", {
                className: "px-3 py-3 text-xs"
            }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                className: "px-3 py-3"
            }, React.createElement("p", {
                className: "font-semibold text-sm"
            }, e.user_name), React.createElement("p", {
                className: "text-xs text-gray-500"
            }, "COD: ", e.user_cod)), React.createElement("td", {
                className: "px-3 py-3 text-sm"
            }, e.produto_nome), React.createElement("td", {
                className: "px-3 py-3 text-center font-bold"
            }, e.tamanho || "-"), React.createElement("td", {
                className: "px-3 py-3 text-right"
            }, React.createElement("p", {
                className: "font-bold"
            }, "R$ ", parseFloat(e.valor_final).toFixed(2).replace(".", ",")), e.parcelas > 1 && React.createElement("p", {
                className: "text-xs text-gray-500"
            }, e.parcelas, "x R$ ", parseFloat(e.valor_parcela).toFixed(2).replace(".", ","))), React.createElement("td", {
                className: "px-3 py-3 text-center text-xs"
            }, e.tipo_abatimento), React.createElement("td", {
                className: "px-3 py-3 text-center"
            }, React.createElement("span", {
                className: "px-2 py-1 rounded text-xs font-bold " + ("pendente" === e.status ? "bg-yellow-100 text-yellow-700" : "aprovado" === e.status ? "bg-green-100 text-green-700" : "rejeitado" === e.status ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700")
            }, "pendente" === e.status ? "⏳" : "aprovado" === e.status ? "✅" : "❌"), e.observacao && "rejeitado" === e.status && React.createElement("p", {
                className: "text-xs text-red-600 mt-1 max-w-[100px] truncate",
                title: e.observacao
            }, e.observacao)), React.createElement("td", {
                className: "px-3 py-3 text-center"
            }, "aprovado" === e.status && React.createElement("div", {
                className: "flex flex-col items-center"
            }, React.createElement("input", {
                type: "checkbox",
                checked: e.debito_lancado || !1,
                onChange: async t => {
                    await fetchAuth(`${API_URL}/loja/pedidos/${e.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            debito_lancado: t.target.checked,
                            debito_lancado_em: t.target.checked ? (new Date).toISOString() : null,
                            debito_lancado_por: t.target.checked ? l.fullName : null
                        })
                    }), Wa(), ja(t.target.checked ? "✅ Débito marcado!" : "Débito desmarcado", "success")
                },
                className: "w-5 h-5 accent-green-600"
            }), e.debito_lancado && e.debito_lancado_em && React.createElement("p", {
                className: "text-xs text-gray-500 mt-1"
            }, new Date(e.debito_lancado_em).toLocaleDateString("pt-BR"), React.createElement("br", null), new Date(e.debito_lancado_em).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            }))), "aprovado" !== e.status && React.createElement("span", {
                className: "text-gray-400"
            }, "-")), React.createElement("td", {
                className: "px-3 py-3 text-center"
            }, React.createElement("div", {
                className: "flex gap-1 justify-center"
            }, "pendente" === e.status && React.createElement(React.Fragment, null, React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/loja/pedidos/${e.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "aprovado",
                            admin_id: l.codProfissional,
                            admin_name: l.fullName
                        })
                    }), Wa(), ja("✅ Pedido aprovado!", "success")
                },
                className: "px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700",
                title: "Aprovar"
            }, "✅"), React.createElement("button", {
                onClick: async () => {
                    const t = prompt("Motivo da rejeição:");
                    t && (await fetchAuth(`${API_URL}/loja/pedidos/${e.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "rejeitado",
                            admin_id: l.codProfissional,
                            admin_name: l.fullName,
                            observacao: t
                        })
                    }), Wa(), ja("❌ Pedido rejeitado", "success"))
                },
                className: "px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700",
                title: "Rejeitar"
            }, "❌")), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaPedidoDeleteConfirm: e
                }),
                className: "px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700",
                title: "Excluir"
            }, "🗑️")))))))), p.lojaPedidoDeleteConfirm && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
            }, React.createElement("h3", {
                className: "text-xl font-bold text-red-600 mb-4"
            }, "⚠️ Excluir Pedido"), React.createElement("p", {
                className: "text-gray-700 mb-4"
            }, "Tem certeza que deseja excluir este pedido?"), React.createElement("div", {
                className: "bg-gray-50 rounded-lg p-4 mb-4"
            }, React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Profissional:"), " ", p.lojaPedidoDeleteConfirm.user_name), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Produto:"), " ", p.lojaPedidoDeleteConfirm.produto_nome), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Valor:"), " R$ ", parseFloat(p.lojaPedidoDeleteConfirm.valor_final).toFixed(2).replace(".", ",")), React.createElement("p", {
                className: "text-sm"
            }, React.createElement("strong", null, "Status:"), " ", p.lojaPedidoDeleteConfirm.status)), React.createElement("p", {
                className: "text-red-600 text-sm mb-4 font-semibold"
            }, "Esta ação não pode ser desfeita!"), React.createElement("div", {
                className: "flex gap-3"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaPedidoDeleteConfirm: null
                }),
                className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/loja/pedidos/${p.lojaPedidoDeleteConfirm.id}`, {
                        method: "DELETE"
                    }), x({
                        ...p,
                        lojaPedidoDeleteConfirm: null
                    }), Wa(), ja("🗑️ Pedido excluído!", "success")
                },
                className: "flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            }, "🗑️ Excluir"))))), "sugestoes" === nt && React.createElement(React.Fragment, null, React.createElement("div", {
                className: "flex justify-between items-center mb-6"
            }, React.createElement("div", null, React.createElement("h2", {
                className: "text-xl font-bold text-gray-800"
            }, "💡 Sugestões de Produtos"), React.createElement("p", {
                className: "text-sm text-gray-500"
            }, "Veja o que os profissionais gostariam de ter na loja")), React.createElement("div", {
                className: "flex gap-2 text-sm"
            }, React.createElement("span", {
                className: "px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold"
            }, "⏳ ", ut.filter(e => "pendente" === e.status).length, " Pendentes"), React.createElement("span", {
                className: "px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold"
            }, "✅ ", ut.filter(e => "respondido" === e.status).length, " Respondidas"))), React.createElement("div", {
                className: "space-y-4"
            }, 0 === ut.length ? React.createElement("p", {
                className: "text-gray-500 text-center py-8"
            }, "Nenhuma sugestão recebida") : ut.map(e => React.createElement("div", {
                key: e.id,
                className: "border-2 rounded-xl p-4 " + ("pendente" === e.status ? "border-yellow-200 bg-yellow-50" : "respondido" === e.status ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")
            }, React.createElement("div", {
                className: "flex justify-between items-start gap-4"
            }, React.createElement("div", {
                className: "flex-1"
            }, React.createElement("div", {
                className: "flex items-center gap-2 mb-2"
            }, React.createElement("span", {
                className: "font-bold text-gray-800"
            }, e.user_name), React.createElement("span", {
                className: "text-xs text-gray-500"
            }, "COD: ", e.user_cod), React.createElement("span", {
                className: "px-2 py-0.5 rounded-full text-xs font-bold " + ("pendente" === e.status ? "bg-yellow-200 text-yellow-800" : "respondido" === e.status ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800")
            }, "pendente" === e.status ? "⏳ Pendente" : "respondido" === e.status ? "✅ Respondido" : "❌ Recusado")), React.createElement("p", {
                className: "text-gray-700 bg-white p-3 rounded-lg border"
            }, e.sugestao), React.createElement("p", {
                className: "text-xs text-gray-500 mt-2"
            }, "Enviado em ", new Date(e.created_at).toLocaleDateString("pt-BR"), " às ", new Date(e.created_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            })), e.resposta && React.createElement("div", {
                className: "mt-3 p-3 rounded-lg " + ("respondido" === e.status ? "bg-green-100" : "bg-red-100")
            }, React.createElement("p", {
                className: "text-xs font-semibold text-gray-600"
            }, "Resposta de ", e.respondido_por, ":"), React.createElement("p", {
                className: "text-sm text-gray-800 mt-1"
            }, e.resposta))), "pendente" === e.status && React.createElement("div", {
                className: "flex flex-col gap-2"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaSugestaoResponder: e,
                    lojaSugestaoResposta: ""
                }),
                className: "px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700"
            }, "✅ Responder"), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaSugestaoRecusar: e,
                    lojaSugestaoResposta: ""
                }),
                className: "px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
            }, "❌ Recusar"), React.createElement("button", {
                onClick: async () => {
                    confirm("Excluir esta sugestão?") && (await fetchAuth(`${API_URL}/loja/sugestoes/${e.id}`, {
                        method: "DELETE"
                    }), Ya(), ja("🗑️ Sugestão excluída!", "success"))
                },
                className: "px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-300"
            }, "🗑️")))))), p.lojaSugestaoResponder && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-2xl shadow-2xl max-w-md w-full"
            }, React.createElement("div", {
                className: "bg-green-600 p-4 rounded-t-2xl text-white"
            }, React.createElement("h2", {
                className: "text-xl font-bold"
            }, "✅ Responder Sugestão")), React.createElement("div", {
                className: "p-6"
            }, React.createElement("div", {
                className: "bg-gray-50 p-3 rounded-lg mb-4"
            }, React.createElement("p", {
                className: "text-sm text-gray-600"
            }, React.createElement("strong", null, p.lojaSugestaoResponder.user_name, ":")), React.createElement("p", {
                className: "text-gray-800"
            }, p.lojaSugestaoResponder.sugestao)), React.createElement("textarea", {
                value: p.lojaSugestaoResposta || "",
                onChange: e => x({
                    ...p,
                    lojaSugestaoResposta: e.target.value
                }),
                placeholder: "Escreva sua resposta... Ex: Ótima sugestão! Vamos providenciar esse produto.",
                className: "w-full px-4 py-3 border rounded-xl h-24 resize-none"
            }), React.createElement("div", {
                className: "flex gap-3 mt-4"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaSugestaoResponder: null,
                    lojaSugestaoResposta: ""
                }),
                className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/loja/sugestoes/${p.lojaSugestaoResponder.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "respondido",
                            resposta: p.lojaSugestaoResposta || "Obrigado pela sugestão!",
                            respondido_por: l.fullName
                        })
                    }), ja("✅ Sugestão respondida!", "success"), x({
                        ...p,
                        lojaSugestaoResponder: null,
                        lojaSugestaoResposta: ""
                    }), Ya()
                },
                className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            }, "✅ Enviar Resposta"))))), p.lojaSugestaoRecusar && React.createElement("div", {
                className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            }, React.createElement("div", {
                className: "bg-white rounded-2xl shadow-2xl max-w-md w-full"
            }, React.createElement("div", {
                className: "bg-red-600 p-4 rounded-t-2xl text-white"
            }, React.createElement("h2", {
                className: "text-xl font-bold"
            }, "❌ Recusar Sugestão")), React.createElement("div", {
                className: "p-6"
            }, React.createElement("div", {
                className: "bg-gray-50 p-3 rounded-lg mb-4"
            }, React.createElement("p", {
                className: "text-sm text-gray-600"
            }, React.createElement("strong", null, p.lojaSugestaoRecusar.user_name, ":")), React.createElement("p", {
                className: "text-gray-800"
            }, p.lojaSugestaoRecusar.sugestao)), React.createElement("textarea", {
                value: p.lojaSugestaoResposta || "",
                onChange: e => x({
                    ...p,
                    lojaSugestaoResposta: e.target.value
                }),
                placeholder: "Motivo da recusa... Ex: Infelizmente não conseguimos esse produto no momento.",
                className: "w-full px-4 py-3 border rounded-xl h-24 resize-none"
            }), React.createElement("div", {
                className: "flex gap-3 mt-4"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    lojaSugestaoRecusar: null,
                    lojaSugestaoResposta: ""
                }),
                className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    await fetchAuth(`${API_URL}/loja/sugestoes/${p.lojaSugestaoRecusar.id}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: "recusado",
                            resposta: p.lojaSugestaoResposta || "Não foi possível atender esta sugestão.",
                            respondido_por: l.fullName
                        })
                    }), ja("❌ Sugestão recusada", "success"), x({
                        ...p,
                        lojaSugestaoRecusar: null,
                        lojaSugestaoResposta: ""
                    }), Ya()
                },
                className: "flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            }, "❌ Confirmar Recusa"))))))))), "relatorios" === p.finTab && React.createElement(React.Fragment, null, (() => {
                const e = new Date,
                    t = e.getMonth(),
                    a = e.getFullYear(),
                    l = void 0 !== p.relMes ? parseInt(p.relMes) : t,
                    r = void 0 !== p.relAno ? parseInt(p.relAno) : a,
                    o = e => {
                        const t = new Date(e),
                            a = t.getDay(),
                            l = t.getHours() + t.getMinutes() / 60;
                        return 0 !== a && (6 === a ? l >= 9 && l < 12 : l >= 9 && l < 18)
                    },
                    c = q.filter(e => {
                        const t = new Date(e.created_at);
                        return t.getMonth() === l && t.getFullYear() === r
                    }),
                    s = c.filter(e => "aprovado" === e.status || "aprovado_gratuidade" === e.status),
                    n = c.filter(e => "aprovado" === e.status),
                    m = c.filter(e => "aprovado_gratuidade" === e.status),
                    i = 2025,
                    d = e => {
                        const t = new Date(e);
                        return t.getFullYear() > i || !(t.getFullYear() < i) && (t.getMonth() > 11 || !(t.getMonth() < 11) && t.getDate() >= 13)
                    },
                    u = s.filter(e => !(!e.updated_at || !e.created_at) && (!!o(e.created_at) && !!d(e.created_at))).map(e => (new Date(e.updated_at) - new Date(e.created_at)) / 6e4).filter(e => e > 0 && e <= 1440),
                    g = u.length > 0 ? Math.round(u.reduce((e, t) => e + t, 0) / u.length) : 0,
                    b = s.filter(e => {
                        if (!e.updated_at || !e.created_at || !o(e.created_at)) return !1;
                        if (!d(e.created_at)) return !1;
                        const t = (new Date(e.updated_at) - new Date(e.created_at)) / 6e4;
                        return t > 60 && t <= 1440
                    }),
                    R = [],
                    E = new Date(r, l + 1, 0).getDate();
                for (let e = 1; e <= E; e++) {
                    if (r === i && 11 === l && e < 13) {
                        R.push({
                            dia: e,
                            tempoMedio: 0,
                            qtd: 0
                        });
                        continue
                    }
                    const t = s.filter(t => new Date(t.created_at).getDate() === e && o(t.created_at)),
                        a = t.filter(e => e.updated_at).map(e => (new Date(e.updated_at) - new Date(e.created_at)) / 6e4).filter(e => e > 0 && e <= 1440),
                        c = a.length > 0 ? Math.round(a.reduce((e, t) => e + t, 0) / a.length) : 0;
                    R.push({
                        dia: e,
                        tempoMedio: c,
                        qtd: t.length
                    })
                }
                const h = Math.max(...R.map(e => e.tempoMedio), 1),
                    f = {};
                n.forEach(e => {
                    const t = e.user_cod + "|" + e.user_name;
                    f[t] || (f[t] = {
                        cod: e.user_cod,
                        nome: e.user_name,
                        qtd: 0,
                        valor: 0,
                        lucro: 0
                    }), f[t].qtd++, f[t].valor += parseFloat(e.final_amount || 0), f[t].lucro += parseFloat(e.requested_amount || 0) - parseFloat(e.final_amount || 0)
                });
                const N = Object.values(f).sort((e, t) => t.qtd - e.qtd).slice(0, 10),
                    y = {};
                m.forEach(e => {
                    const t = e.user_cod + "|" + e.user_name;
                    y[t] || (y[t] = {
                        cod: e.user_cod,
                        nome: e.user_name,
                        qtd: 0,
                        valor: 0,
                        deixouArrecadar: 0
                    }), y[t].qtd++, y[t].valor += parseFloat(e.final_amount || 0), y[t].deixouArrecadar += .045 * parseFloat(e.requested_amount || 0)
                });
                const v = Object.values(y).sort((e, t) => t.qtd - e.qtd).slice(0, 10),
                    w = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
                    _ = w[l],
                    j = c.filter(e => "rejeitado" === e.status),
                    C = c.filter(e => "aguardando_aprovacao" === e.status),
                    A = c.reduce((e, t) => e + parseFloat(t.requested_amount || 0), 0),
                    S = s.reduce((e, t) => e + parseFloat(t.final_amount || 0), 0),
                    k = n.reduce((e, t) => e + (parseFloat(t.requested_amount || 0) - parseFloat(t.final_amount || 0)), 0),
                    P = m.reduce((e, t) => e + .045 * parseFloat(t.requested_amount || 0), 0),
                    T = [{
                        nome: "Semana 1",
                        dias: [1, 7]
                    }, {
                        nome: "Semana 2",
                        dias: [8, 14]
                    }, {
                        nome: "Semana 3",
                        dias: [15, 21]
                    }, {
                        nome: "Semana 4",
                        dias: [22, 31]
                    }].map(e => {
                        const t = s.filter(t => {
                            const a = new Date(t.created_at).getDate();
                            return a >= e.dias[0] && a <= e.dias[1]
                        });
                        return {
                            nome: e.nome,
                            valor: t.reduce((e, t) => e + parseFloat(t.final_amount || 0), 0),
                            qtd: t.length
                        }
                    }),
                    D = Math.max(...T.map(e => e.valor), 1),
                    L = 0 === l ? 11 : l - 1,
                    I = 0 === l ? r - 1 : r,
                    F = q.filter(e => {
                        const t = new Date(e.created_at);
                        return t.getMonth() === L && t.getFullYear() === I && ("aprovado" === e.status || "aprovado_gratuidade" === e.status)
                    }).reduce((e, t) => e + parseFloat(t.final_amount || 0), 0),
                    $ = F > 0 ? (S - F) / F * 100 : 0;
                return React.createElement(React.Fragment, null, React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4 mb-6"
                }, React.createElement("div", {
                    className: "flex flex-wrap gap-4 items-center justify-between"
                }, React.createElement("div", {
                    className: "flex gap-4 items-center"
                }, React.createElement("span", {
                    className: "font-semibold text-gray-700"
                }, "📅 Período:"), React.createElement("select", {
                    value: l,
                    onChange: e => x({
                        ...p,
                        relMes: e.target.value
                    }),
                    className: "px-4 py-2 border rounded-lg"
                }, w.map((e, t) => React.createElement("option", {
                    key: t,
                    value: t
                }, e))), React.createElement("select", {
                    value: r,
                    onChange: e => x({
                        ...p,
                        relAno: e.target.value
                    }),
                    className: "px-4 py-2 border rounded-lg"
                }, [2024, 2025, 2026].map(e => React.createElement("option", {
                    key: e,
                    value: e
                }, e)))), React.createElement("button", {
                    onClick: () => {
                        const e = `\n                        <html>\n                        <head>\n                          <title>Relatório ${_} ${r}</title>\n                          <style>\n                            body { font-family: Arial, sans-serif; padding: 40px; font-size: 12px; }\n                            h1 { color: #166534; border-bottom: 3px solid #166534; padding-bottom: 10px; }\n                            h2 { color: #374151; margin-top: 25px; }\n                            .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }\n                            .card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }\n                            .card-value { font-size: 20px; font-weight: bold; color: #166534; }\n                            .card-label { font-size: 11px; color: #6b7280; }\n                            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }\n                            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }\n                            th { background: #166534; color: white; }\n                            .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 10px; }\n                          </style>\n                        </head>\n                        <body>\n                          <h1>📊 Relatório Financeiro - ${_} ${r}</h1>\n                          <p><strong>Gerado em:</strong> ${(new Date).toLocaleString("pt-BR")}</p>\n                          <div class="cards">\n                            <div class="card"><div class="card-value">R$ ${A.toFixed(2)}</div><div class="card-label">Total Solicitado</div></div>\n                            <div class="card"><div class="card-value">R$ ${S.toFixed(2)}</div><div class="card-label">Total Pago</div></div>\n                            <div class="card"><div class="card-value" style="color:#059669">R$ ${k.toFixed(2)}</div><div class="card-label">Lucro (Taxas)</div></div>\n                            <div class="card"><div class="card-value" style="color:#dc2626">R$ ${P.toFixed(2)}</div><div class="card-label">Deixou Arrecadar</div></div>\n                          </div>\n                          <h2>📋 Detalhamento</h2>\n                          <table>\n                            <thead><tr><th>Data</th><th>Profissional</th><th>Código</th><th>Solicitado</th><th>Pago</th><th>Status</th></tr></thead>\n                            <tbody>\n                              ${c.slice(0,100).map(e=>`\n                                <tr>\n                                  <td>${new Date(e.created_at).toLocaleDateString("pt-BR")}</td>\n                                  <td>${e.user_name||"-"}</td>\n                                  <td>${e.user_cod}</td>\n                                  <td>R$ ${parseFloat(e.requested_amount).toFixed(2)}</td>\n                                  <td>R$ ${parseFloat(e.final_amount).toFixed(2)}</td>\n                                  <td>${"aprovado"===e.status?"✅":"aprovado_gratuidade"===e.status?"🎁":"rejeitado"===e.status?"❌":"⏳"}</td>\n                                </tr>\n                              `).join("")}\n                            </tbody>\n                          </table>\n                          <div class="footer"><p>Central do Entregador Tutts</p></div>\n                        </body>\n                        </html>\n                      `,
                            t = window.open("", "_blank");
                        t.document.write(e), t.document.close(), t.print()
                    },
                    className: "px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                }, "📄 Gerar PDF"))), React.createElement("div", {
                    className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
                }, React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "Total Solicitado"), React.createElement("p", {
                    className: "text-2xl font-bold text-blue-600"
                }, er(A))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "Total Pago"), React.createElement("p", {
                    className: "text-2xl font-bold text-green-600"
                }, er(S))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "💰 Lucro (Taxas 4,5%)"), React.createElement("p", {
                    className: "text-2xl font-bold text-violet-600"
                }, er(k))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("p", {
                    className: "text-sm text-gray-600"
                }, "❌ Deixou Arrecadar"), React.createElement("p", {
                    className: "text-2xl font-bold text-red-600"
                }, er(P)))), React.createElement("div", {
                    className: "grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
                }, React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-3 text-center"
                }, React.createElement("p", {
                    className: "text-2xl font-bold text-purple-600"
                }, c.length), React.createElement("p", {
                    className: "text-xs text-gray-600"
                }, "Total")), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-3 text-center"
                }, React.createElement("p", {
                    className: "text-2xl font-bold text-green-600"
                }, n.length), React.createElement("p", {
                    className: "text-xs text-gray-600"
                }, "Aprovados")), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-3 text-center"
                }, React.createElement("p", {
                    className: "text-2xl font-bold text-blue-600"
                }, m.length), React.createElement("p", {
                    className: "text-xs text-gray-600"
                }, "Com Gratuidade")), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-3 text-center"
                }, React.createElement("p", {
                    className: "text-2xl font-bold text-red-600"
                }, j.length), React.createElement("p", {
                    className: "text-xs text-gray-600"
                }, "Rejeitados")), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-3 text-center"
                }, React.createElement("p", {
                    className: "text-2xl font-bold text-yellow-600"
                }, C.length), React.createElement("p", {
                    className: "text-xs text-gray-600"
                }, "Pendentes"))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4 mb-6"
                }, React.createElement("h3", {
                    className: "font-bold text-gray-800 mb-2"
                }, "📊 Comparativo com Mês Anterior"), React.createElement("div", {
                    className: "flex items-center gap-4 flex-wrap"
                }, React.createElement("span", null, "Mês anterior: ", React.createElement("strong", null, er(F))), React.createElement("span", null, "→"), React.createElement("span", null, "Mês atual: ", React.createElement("strong", null, er(S))), React.createElement("span", {
                    className: "px-3 py-1 rounded-full text-sm font-bold " + ($ >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
                }, $ >= 0 ? "↑" : "↓", " ", Math.abs($).toFixed(1), "%"))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-4 mb-6"
                }, React.createElement("h3", {
                    className: "font-bold text-gray-800 mb-4"
                }, "📈 Evolução por Semana"), React.createElement("div", {
                    className: "flex items-end justify-around gap-4",
                    style: {
                        height: "180px"
                    }
                }, T.map((e, t) => React.createElement("div", {
                    key: t,
                    className: "flex flex-col items-center"
                }, React.createElement("span", {
                    className: "text-xs font-semibold text-green-700 mb-1"
                }, er(e.valor)), React.createElement("div", {
                    className: "bg-gradient-to-t from-green-600 to-green-400 rounded-t w-16",
                    style: {
                        height: `${Math.max(e.valor/D*140,10)}px`
                    }
                }), React.createElement("span", {
                    className: "text-xs font-semibold mt-2"
                }, e.nome), React.createElement("span", {
                    className: "text-xs text-gray-500"
                }, e.qtd, " saque(s)"))))), React.createElement("div", {
                    className: "border-t-4 border-purple-500 pt-6 mt-6"
                }, React.createElement("h2", {
                    className: "text-xl font-bold text-purple-800 mb-4"
                }, "📊 Métricas de Atendimento")), React.createElement("div", {
                    className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
                }, React.createElement("div", {
                    className: "bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow p-4 text-white"
                }, React.createElement("p", {
                    className: "text-blue-100 text-sm"
                }, "⏱️ Tempo Médio Geral"), React.createElement("p", {
                    className: "text-3xl font-bold"
                }, g < 60 ? `${g}min` : `${Math.floor(g/60)}h${g%60}m`), React.createElement("p", {
                    className: "text-xs text-blue-200"
                }, "de atendimento")), React.createElement("div", {
                    className: "bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow p-4 text-white"
                }, React.createElement("p", {
                    className: "text-green-100 text-sm"
                }, "✅ Total Aprovados"), React.createElement("p", {
                    className: "text-3xl font-bold"
                }, s.length), React.createElement("p", {
                    className: "text-xs text-green-200"
                }, "saques no período")), React.createElement("div", {
                    className: "bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow p-4 text-white"
                }, React.createElement("p", {
                    className: "text-red-100 text-sm"
                }, "🚨 Acima de 1h"), React.createElement("p", {
                    className: "text-3xl font-bold"
                }, b.length), React.createElement("p", {
                    className: "text-xs text-red-200"
                }, "saques demorados")), React.createElement("div", {
                    className: "bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow p-4 text-white"
                }, React.createElement("p", {
                    className: "text-purple-100 text-sm"
                }, "🎁 Com Gratuidade"), React.createElement("p", {
                    className: "text-3xl font-bold"
                }, m.length), React.createElement("p", {
                    className: "text-xs text-purple-200"
                }, "saques sem taxa"))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-6 mb-6"
                }, React.createElement("h3", {
                    className: "text-lg font-bold text-gray-800 mb-4"
                }, "📊 Tempo Médio de Atendimento por Dia"), React.createElement("div", {
                    className: "overflow-x-auto"
                }, React.createElement("div", {
                    className: "flex items-end gap-1 min-w-max",
                    style: {
                        height: "200px"
                    }
                }, R.map((e, t) => React.createElement("div", {
                    key: t,
                    className: "flex flex-col items-center",
                    style: {
                        width: "28px"
                    }
                }, React.createElement("div", {
                    className: "text-xs text-gray-500 mb-1"
                }, e.tempoMedio > 0 ? `${e.tempoMedio}m` : ""), React.createElement("div", {
                    className: "w-5 rounded-t " + (e.tempoMedio > 60 ? "bg-red-500" : e.tempoMedio > 30 ? "bg-yellow-500" : "bg-green-500"),
                    style: {
                        height: `${Math.max(e.tempoMedio/h*150,e.tempoMedio>0?10:0)}px`
                    },
                    title: `Dia ${e.dia}: ${e.tempoMedio}min (${e.qtd} saques)`
                }), React.createElement("div", {
                    className: "text-xs text-gray-600 mt-1"
                }, e.dia))))), React.createElement("div", {
                    className: "flex gap-4 mt-4 text-xs"
                }, React.createElement("span", {
                    className: "flex items-center gap-1"
                }, React.createElement("span", {
                    className: "w-3 h-3 bg-green-500 rounded"
                }), " Até 30min"), React.createElement("span", {
                    className: "flex items-center gap-1"
                }, React.createElement("span", {
                    className: "w-3 h-3 bg-yellow-500 rounded"
                }), " 30-60min"), React.createElement("span", {
                    className: "flex items-center gap-1"
                }, React.createElement("span", {
                    className: "w-3 h-3 bg-red-500 rounded"
                }), " Acima de 60min"))), React.createElement("div", {
                    className: "grid md:grid-cols-2 gap-6 mb-6"
                }, React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-6"
                }, React.createElement("h3", {
                    className: "text-lg font-bold text-gray-800 mb-4"
                }, "🏆 Top 10 - Mais Solicitam Saques"), 0 === N.length ? React.createElement("p", {
                    className: "text-gray-500 text-center py-4"
                }, "Nenhum dado no período") : React.createElement("div", {
                    className: "space-y-2"
                }, N.map((e, t) => React.createElement("div", {
                    key: t,
                    className: "flex items-center justify-between p-3 rounded-lg " + (0 === t ? "bg-yellow-50 border border-yellow-200" : 1 === t ? "bg-gray-100" : 2 === t ? "bg-orange-50" : "bg-gray-50")
                }, React.createElement("div", {
                    className: "flex items-center gap-3"
                }, React.createElement("span", {
                    className: "text-xl " + (0 === t ? "🥇" : 1 === t ? "🥈" : 2 === t ? "🥉" : "")
                }, t >= 3 ? `${t+1}º` : ""), React.createElement("div", null, React.createElement("p", {
                    className: "font-semibold text-gray-800"
                }, e.nome || e.cod), React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, "Cód: ", e.cod))), React.createElement("div", {
                    className: "text-right"
                }, React.createElement("p", {
                    className: "font-bold text-green-600"
                }, er(e.valor)), React.createElement("p", {
                    className: "text-xs text-gray-600"
                }, e.qtd, " saques"), React.createElement("p", {
                    className: "text-xs text-blue-600"
                }, "Lucro: ", er(e.lucro))))))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-6"
                }, React.createElement("h3", {
                    className: "text-lg font-bold text-gray-800 mb-4"
                }, "🎁 Top 10 - Saques com Gratuidade"), 0 === v.length ? React.createElement("p", {
                    className: "text-gray-500 text-center py-4"
                }, "Nenhum dado no período") : React.createElement("div", {
                    className: "space-y-2"
                }, v.map((e, t) => React.createElement("div", {
                    key: t,
                    className: "flex items-center justify-between p-3 rounded-lg " + (0 === t ? "bg-purple-50 border border-purple-200" : "bg-gray-50")
                }, React.createElement("div", {
                    className: "flex items-center gap-3"
                }, React.createElement("span", {
                    className: "text-xl " + (0 === t ? "🥇" : 1 === t ? "🥈" : 2 === t ? "🥉" : "")
                }, t >= 3 ? `${t+1}º` : ""), React.createElement("div", null, React.createElement("p", {
                    className: "font-semibold text-gray-800"
                }, e.nome || e.cod), React.createElement("p", {
                    className: "text-xs text-gray-500"
                }, "Cód: ", e.cod))), React.createElement("div", {
                    className: "text-right"
                }, React.createElement("p", {
                    className: "font-bold text-purple-600"
                }, er(e.valor)), React.createElement("p", {
                    className: "text-xs text-gray-600"
                }, e.qtd, " saques"), React.createElement("p", {
                    className: "text-xs text-red-600"
                }, "Deixou: ", er(e.deixouArrecadar)))))))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-6"
                }, React.createElement("h3", {
                    className: "text-lg font-bold text-gray-800 mb-4"
                }, "🚨 Saques Realizados Acima de 1 Hora (", b.length, ")"), 0 === b.length ? React.createElement("p", {
                    className: "text-gray-500 text-center py-4"
                }, "✅ Nenhum saque acima de 1 hora no período!") : React.createElement("div", {
                    className: "overflow-x-auto"
                }, React.createElement("table", {
                    className: "w-full text-sm"
                }, React.createElement("thead", {
                    className: "bg-red-50"
                }, React.createElement("tr", null, React.createElement("th", {
                    className: "px-3 py-2 text-left"
                }, "Profissional"), React.createElement("th", {
                    className: "px-3 py-2 text-left"
                }, "Data"), React.createElement("th", {
                    className: "px-3 py-2 text-right"
                }, "Valor"), React.createElement("th", {
                    className: "px-3 py-2 text-right"
                }, "Tempo"))), React.createElement("tbody", null, b.slice(0, 20).map((e, t) => {
                    const a = Math.round((new Date(e.updated_at) - new Date(e.created_at)) / 6e4);
                    return React.createElement("tr", {
                        key: t,
                        className: "border-b hover:bg-red-50"
                    }, React.createElement("td", {
                        className: "px-3 py-2"
                    }, React.createElement("p", {
                        className: "font-semibold"
                    }, e.user_name), React.createElement("p", {
                        className: "text-xs text-gray-500"
                    }, e.user_cod)), React.createElement("td", {
                        className: "px-3 py-2"
                    }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                        className: "px-3 py-2 text-right"
                    }, er(e.final_amount)), React.createElement("td", {
                        className: "px-3 py-2 text-right"
                    }, React.createElement("span", {
                        className: "px-2 py-1 bg-red-100 text-red-700 rounded font-semibold"
                    }, a < 60 ? `${a}min` : `${Math.floor(a/60)}h${a%60}m`)))
                }))), b.length > 20 && React.createElement("p", {
                    className: "text-center text-gray-500 text-sm mt-2"
                }, "Mostrando 20 de ", b.length, " registros"))))
            })()), "horarios" === p.finTab && React.createElement(React.Fragment, null, Me.loading ? React.createElement("div", {
                className: "flex items-center justify-center py-12"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"
            }), React.createElement("span", {
                className: "ml-3"
            }, "Carregando...")) : React.createElement("div", {
                className: "space-y-6"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, "🕐 Horários de Atendimento"), React.createElement("p", {
                className: "text-sm text-gray-600 mb-4"
            }, "Configure os horários de funcionamento para cada dia da semana."), React.createElement("div", {
                className: "space-y-2"
            }, Me.horarios.map(e => React.createElement("div", {
                key: e.id,
                className: "flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            }, React.createElement("div", {
                className: "w-32 font-semibold text-sm"
            }, bl[e.dia_semana]), React.createElement("label", {
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "checkbox",
                checked: e.ativo,
                onChange: t => Rl(e.id, {
                    ...e,
                    ativo: t.target.checked
                }),
                className: "w-4 h-4"
            }), React.createElement("span", {
                className: "text-sm"
            }, "Aberto")), e.ativo && React.createElement(React.Fragment, null, React.createElement("input", {
                type: "time",
                value: e.hora_inicio || "09:00",
                onChange: t => Rl(e.id, {
                    ...e,
                    hora_inicio: t.target.value
                }),
                className: "px-2 py-1 border rounded text-sm"
            }), React.createElement("span", {
                className: "text-gray-500"
            }, "às"), React.createElement("input", {
                type: "time",
                value: e.hora_fim || "18:00",
                onChange: t => Rl(e.id, {
                    ...e,
                    hora_fim: t.target.value
                }),
                className: "px-2 py-1 border rounded text-sm"
            })), !e.ativo && React.createElement("span", {
                className: "text-red-500 text-sm font-semibold"
            }, "FECHADO"))))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, "📅 Horários Especiais (Feriados, Datas específicas)"), React.createElement("div", {
                className: "bg-blue-50 p-4 rounded-lg mb-4"
            }, React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-5 gap-3"
            }, React.createElement("input", {
                type: "date",
                value: p.novoEspData || "",
                onChange: e => x(t => ({
                    ...t,
                    novoEspData: e.target.value
                })),
                className: "px-3 py-2 border rounded text-sm"
            }), React.createElement("input", {
                type: "text",
                placeholder: "Descrição (ex: Feriado)",
                value: p.novoEspDesc || "",
                onChange: e => x(t => ({
                    ...t,
                    novoEspDesc: e.target.value
                })),
                className: "px-3 py-2 border rounded text-sm"
            }), React.createElement("label", {
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "checkbox",
                checked: p.novoEspFechado || !1,
                onChange: e => x(t => ({
                    ...t,
                    novoEspFechado: e.target.checked
                })),
                className: "w-4 h-4"
            }), React.createElement("span", {
                className: "text-sm"
            }, "Fechado")), !p.novoEspFechado && React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "time",
                value: p.novoEspInicio || "09:00",
                onChange: e => x(t => ({
                    ...t,
                    novoEspInicio: e.target.value
                })),
                className: "px-2 py-1 border rounded text-sm w-24"
            }), React.createElement("span", null, "às"), React.createElement("input", {
                type: "time",
                value: p.novoEspFim || "18:00",
                onChange: e => x(t => ({
                    ...t,
                    novoEspFim: e.target.value
                })),
                className: "px-2 py-1 border rounded text-sm w-24"
            })), React.createElement("button", {
                onClick: El,
                className: "px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700"
            }, "+ Adicionar"))), 0 === Me.especiais.length ? React.createElement("p", {
                className: "text-gray-500 text-sm"
            }, "Nenhum horário especial programado.") : React.createElement("div", {
                className: "space-y-2"
            }, Me.especiais.map(e => {
                let t = "Data inválida";
                try {
                    console.log("esp.data original:", e.data, typeof e.data);
                    let a = e.data;
                    if (a && "object" == typeof a && (a = a.toISOString ? a.toISOString() : String(a)), a) {
                        const e = String(a).substring(0, 10).split("-");
                        3 === e.length && 4 === e[0].length && (t = `${e[2]}/${e[1]}/${e[0]}`)
                    }
                } catch (t) {
                    console.error("Erro ao formatar data:", t, e.data)
                }
                return React.createElement("div", {
                    key: e.id,
                    className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                }, React.createElement("div", {
                    className: "flex items-center gap-4"
                }, React.createElement("span", {
                    className: "font-mono font-bold text-purple-600"
                }, t), React.createElement("span", {
                    className: "text-sm text-gray-700"
                }, e.descricao), e.fechado ? React.createElement("span", {
                    className: "px-2 py-0.5 bg-red-500 text-white text-xs rounded font-bold"
                }, "FECHADO") : React.createElement("span", {
                    className: "text-sm text-green-600 font-semibold"
                }, e.hora_inicio, " às ", e.hora_fim)), React.createElement("button", {
                    onClick: () => (async e => {
                        if (confirm("Remover este horário especial?")) try {
                            await fetchAuth(`${API_URL}/horarios/especiais/${e}`, {
                                method: "DELETE"
                            }), ja("✅ Removido!", "success");
                            const t = await fetchAuth(`${API_URL}/horarios/especiais`),
                                a = await t.json();
                            Oe(e => ({
                                ...e,
                                especiais: a
                            }))
                        } catch (e) {
                            ja("Erro", "error")
                        }
                    })(e.id),
                    className: "px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                }, "🗑️ Remover"))
            }))))), "avisos" === p.finTab && React.createElement(React.Fragment, null, qe.loading ? React.createElement("div", {
                className: "flex items-center justify-center py-12"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"
            }), React.createElement("span", {
                className: "ml-3"
            }, "Carregando...")) : React.createElement("div", {
                className: "space-y-6"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, "📢 Criar Novo Aviso"), React.createElement("p", {
                className: "text-sm text-gray-600 mb-4"
            }, "Os avisos criados aqui serão exibidos para os usuários na tela de Saque Emergencial."), React.createElement("div", {
                className: "bg-yellow-50 p-4 rounded-lg"
            }, React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-2 gap-3 mb-3"
            }, React.createElement("input", {
                type: "text",
                placeholder: "Título do aviso",
                value: p.novoAvisoTitulo || "",
                onChange: e => x(t => ({
                    ...t,
                    novoAvisoTitulo: e.target.value
                })),
                className: "px-3 py-2 border rounded text-sm"
            }), React.createElement("select", {
                value: p.novoAvisoTipo || "info",
                onChange: e => x(t => ({
                    ...t,
                    novoAvisoTipo: e.target.value
                })),
                className: "px-3 py-2 border rounded text-sm"
            }, React.createElement("option", {
                value: "info"
            }, "ℹ️ Informativo (Azul)"), React.createElement("option", {
                value: "warning"
            }, "⚠️ Atenção (Amarelo)"), React.createElement("option", {
                value: "error"
            }, "🚨 Urgente (Vermelho)"), React.createElement("option", {
                value: "success"
            }, "✅ Positivo (Verde)"))), React.createElement("textarea", {
                placeholder: "Mensagem do aviso...",
                value: p.novoAvisoMensagem || "",
                onChange: e => x(t => ({
                    ...t,
                    novoAvisoMensagem: e.target.value
                })),
                className: "w-full px-3 py-2 border rounded text-sm mb-3",
                rows: 3
            }), React.createElement("div", {
                className: "flex items-center justify-between flex-wrap gap-3"
            }, React.createElement("label", {
                className: "flex items-center gap-2"
            }, React.createElement("input", {
                type: "checkbox",
                checked: p.novoAvisoExibirFora || !1,
                onChange: e => x(t => ({
                    ...t,
                    novoAvisoExibirFora: e.target.checked
                })),
                className: "w-4 h-4"
            }), React.createElement("span", {
                className: "text-sm"
            }, "Exibir apenas fora do horário de atendimento")), React.createElement("button", {
                onClick: hl,
                className: "px-6 py-2 bg-yellow-500 text-white rounded-lg font-semibold text-sm hover:bg-yellow-600"
            }, "+ Criar Aviso")))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, "✅ Avisos Ativos (", qe.avisos.filter(e => e.ativo).length, ")"), 0 === qe.avisos.filter(e => e.ativo).length ? React.createElement("div", {
                className: "text-center py-8 text-gray-500"
            }, React.createElement("p", {
                className: "text-4xl mb-2"
            }, "📭"), React.createElement("p", null, "Nenhum aviso ativo no momento.")) : React.createElement("div", {
                className: "space-y-3"
            }, qe.avisos.filter(e => e.ativo).map(e => React.createElement("div", {
                key: e.id,
                className: "p-4 rounded-lg border-l-4 " + ("error" === e.tipo ? "bg-red-50 border-red-500" : "warning" === e.tipo ? "bg-yellow-50 border-yellow-500" : "success" === e.tipo ? "bg-green-50 border-green-500" : "bg-blue-50 border-blue-500")
            }, React.createElement("div", {
                className: "flex items-start justify-between gap-4"
            }, React.createElement("div", {
                className: "flex-1"
            }, React.createElement("div", {
                className: "flex items-center gap-2 mb-2"
            }, React.createElement("span", {
                className: "text-lg"
            }, "error" === e.tipo ? "🚨" : "warning" === e.tipo ? "⚠️" : "success" === e.tipo ? "✅" : "ℹ️"), React.createElement("span", {
                className: "font-bold"
            }, e.titulo), e.exibir_fora_horario && React.createElement("span", {
                className: "px-2 py-0.5 bg-orange-200 text-orange-700 text-[10px] rounded-full font-semibold"
            }, "🕐 Só fora do horário")), React.createElement("p", {
                className: "text-sm text-gray-700"
            }, e.mensagem), React.createElement("p", {
                className: "text-xs text-gray-400 mt-2"
            }, "Criado em: ", new Date(e.created_at).toLocaleString("pt-BR"))), React.createElement("div", {
                className: "flex flex-col gap-2"
            }, React.createElement("button", {
                onClick: () => fl(e),
                className: "px-3 py-1.5 bg-gray-500 text-white rounded text-xs font-bold hover:bg-gray-600"
            }, "⏸️ Desativar"), React.createElement("button", {
                onClick: () => Nl(e.id),
                className: "px-3 py-1.5 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600"
            }, "🗑️ Excluir"))))))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, "📜 Histórico de Avisos (", qe.avisos.filter(e => !e.ativo).length, ")"), 0 === qe.avisos.filter(e => !e.ativo).length ? React.createElement("div", {
                className: "text-center py-6 text-gray-400"
            }, React.createElement("p", {
                className: "text-sm"
            }, "Nenhum aviso no histórico.")) : React.createElement("div", {
                className: "space-y-2"
            }, qe.avisos.filter(e => !e.ativo).map(e => React.createElement("div", {
                key: e.id,
                className: "p-3 rounded-lg bg-gray-100 border border-gray-200 opacity-70"
            }, React.createElement("div", {
                className: "flex items-start justify-between gap-4"
            }, React.createElement("div", {
                className: "flex-1"
            }, React.createElement("div", {
                className: "flex items-center gap-2 mb-1"
            }, React.createElement("span", {
                className: "text-sm"
            }, "error" === e.tipo ? "🚨" : "warning" === e.tipo ? "⚠️" : "success" === e.tipo ? "✅" : "ℹ️"), React.createElement("span", {
                className: "font-semibold text-sm text-gray-600"
            }, e.titulo), React.createElement("span", {
                className: "px-1.5 py-0.5 bg-gray-400 text-white text-[10px] rounded"
            }, "INATIVO")), React.createElement("p", {
                className: "text-xs text-gray-500"
            }, e.mensagem), React.createElement("p", {
                className: "text-[10px] text-gray-400 mt-1"
            }, "Criado: ", new Date(e.created_at).toLocaleString("pt-BR"))), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("button", {
                onClick: () => fl(e),
                className: "px-2 py-1 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-600"
            }, "▶️ Ativar"), React.createElement("button", {
                onClick: () => Nl(e.id),
                className: "px-2 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600"
            }, "🗑️"))))))))), "backup" === p.finTab && React.createElement(React.Fragment, null, (() => {
                const e = (e, t) => {
                        const a = JSON.stringify(e, null, 2),
                            l = new Blob([a], {
                                type: "application/json"
                            }),
                            r = URL.createObjectURL(l),
                            o = document.createElement("a");
                        o.href = r, o.download = t, o.click(), URL.revokeObjectURL(r), ja(`✅ ${t} exportado com sucesso!`, "success")
                    },
                    t = (e, t, a) => {
                        const l = [t.map(e => e.label).join(";"), ...e.map(e => t.map(t => {
                                let a = e[t.key] || "";
                                return "string" == typeof a && a.includes(";") && (a = `"${a}"`), a
                            }).join(";"))].join("\n"),
                            r = new Blob(["\ufeff" + l], {
                                type: "text/csv;charset=utf-8"
                            }),
                            o = URL.createObjectURL(r),
                            c = document.createElement("a");
                        c.href = o, c.download = a, c.click(), URL.revokeObjectURL(o), ja(`✅ ${a} exportado com sucesso!`, "success")
                    },
                    a = (new Date).toISOString().split("T")[0],
                    l = [{
                        key: "id",
                        label: "ID"
                    }, {
                        key: "user_cod",
                        label: "Código"
                    }, {
                        key: "user_name",
                        label: "Nome"
                    }, {
                        key: "cpf",
                        label: "CPF"
                    }, {
                        key: "pix_key",
                        label: "Chave PIX"
                    }, {
                        key: "requested_amount",
                        label: "Valor Solicitado"
                    }, {
                        key: "final_amount",
                        label: "Valor Final"
                    }, {
                        key: "status",
                        label: "Status"
                    }, {
                        key: "reject_reason",
                        label: "Motivo Rejeição"
                    }, {
                        key: "admin_name",
                        label: "Admin"
                    }, {
                        key: "created_at",
                        label: "Data Criação"
                    }, {
                        key: "updated_at",
                        label: "Data Atualização"
                    }],
                    r = [{
                        key: "id",
                        label: "ID"
                    }, {
                        key: "codProfissional",
                        label: "Código"
                    }, {
                        key: "fullName",
                        label: "Nome"
                    }, {
                        key: "role",
                        label: "Tipo"
                    }, {
                        key: "createdAt",
                        label: "Data Cadastro"
                    }],
                    o = [{
                        key: "id",
                        label: "ID"
                    }, {
                        key: "user_cod",
                        label: "Código"
                    }, {
                        key: "user_name",
                        label: "Nome"
                    }, {
                        key: "reason",
                        label: "Motivo"
                    }, {
                        key: "created_at",
                        label: "Data"
                    }],
                    c = [{
                        key: "id",
                        label: "ID"
                    }, {
                        key: "user_cod",
                        label: "Código"
                    }, {
                        key: "user_name",
                        label: "Nome"
                    }, {
                        key: "reason",
                        label: "Motivo"
                    }, {
                        key: "created_at",
                        label: "Data"
                    }],
                    s = [{
                        key: "id",
                        label: "ID"
                    }, {
                        key: "indicador_cod",
                        label: "Cód Indicador"
                    }, {
                        key: "indicador_nome",
                        label: "Nome Indicador"
                    }, {
                        key: "indicado_nome",
                        label: "Nome Indicado"
                    }, {
                        key: "indicado_contato",
                        label: "Contato"
                    }, {
                        key: "status",
                        label: "Status"
                    }, {
                        key: "created_at",
                        label: "Data"
                    }],
                    n = {
                        data_backup: (new Date).toISOString(),
                        versao: "1.0",
                        dados: {
                            withdrawals: q,
                            users: A,
                            gratuities: Q,
                            restricted: Z,
                            indicacoes: ae
                        },
                        estatisticas: {
                            total_withdrawals: q.length,
                            total_users: A.length,
                            total_gratuities: Q.length,
                            total_restricted: Z.length,
                            total_indicacoes: ae.length
                        }
                    };
                return React.createElement("div", {
                    className: "space-y-6"
                }, React.createElement("div", {
                    className: "bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white"
                }, React.createElement("h2", {
                    className: "text-2xl font-bold flex items-center gap-2"
                }, "💾 Backup e Exportação de Dados"), React.createElement("p", {
                    className: "text-blue-100 mt-2"
                }, "Exporte seus dados para manter backups seguros ou analisar em outras ferramentas.")), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-6"
                }, React.createElement("div", {
                    className: "flex items-center justify-between"
                }, React.createElement("div", null, React.createElement("h3", {
                    className: "text-lg font-bold text-gray-800 flex items-center gap-2"
                }, "🗄️ Backup Completo"), React.createElement("p", {
                    className: "text-sm text-gray-600 mt-1"
                }, "Exporta todos os dados do sistema em um único arquivo JSON."), React.createElement("div", {
                    className: "flex gap-4 mt-2 text-xs text-gray-500"
                }, React.createElement("span", null, "📋 ", q.length, " solicitações"), React.createElement("span", null, "👥 ", A.length, " usuários"), React.createElement("span", null, "🎁 ", Q.length, " gratuidades"), React.createElement("span", null, "🚫 ", Z.length, " restritos"), React.createElement("span", null, "🤝 ", ae.length, " indicações"))), React.createElement("button", {
                    onClick: () => e(n, `backup_completo_${a}.json`),
                    className: "px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2"
                }, "⬇️ Baixar Backup Completo"))), React.createElement("div", {
                    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
                }, React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-5"
                }, React.createElement("h3", {
                    className: "font-bold text-gray-800 flex items-center gap-2 mb-3"
                }, "📋 Solicitações de Saque"), React.createElement("p", {
                    className: "text-sm text-gray-600 mb-3"
                }, q.length, " registros"), React.createElement("div", {
                    className: "flex gap-2"
                }, React.createElement("button", {
                    onClick: () => t(q, l, `solicitacoes_${a}.csv`),
                    className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"
                }, "📊 CSV"), React.createElement("button", {
                    onClick: () => e(q, `solicitacoes_${a}.json`),
                    className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm"
                }, "📄 JSON"))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-5"
                }, React.createElement("h3", {
                    className: "font-bold text-gray-800 flex items-center gap-2 mb-3"
                }, "👥 Usuários"), React.createElement("p", {
                    className: "text-sm text-gray-600 mb-3"
                }, A.length, " registros"), React.createElement("div", {
                    className: "flex gap-2"
                }, React.createElement("button", {
                    onClick: () => t(A, r, `usuarios_${a}.csv`),
                    className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"
                }, "📊 CSV"), React.createElement("button", {
                    onClick: () => e(A, `usuarios_${a}.json`),
                    className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm"
                }, "📄 JSON"))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-5"
                }, React.createElement("h3", {
                    className: "font-bold text-gray-800 flex items-center gap-2 mb-3"
                }, "🎁 Gratuidades"), React.createElement("p", {
                    className: "text-sm text-gray-600 mb-3"
                }, Q.length, " registros"), React.createElement("div", {
                    className: "flex gap-2"
                }, React.createElement("button", {
                    onClick: () => t(Q, o, `gratuidades_${a}.csv`),
                    className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"
                }, "📊 CSV"), React.createElement("button", {
                    onClick: () => e(Q, `gratuidades_${a}.json`),
                    className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm"
                }, "📄 JSON"))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-5"
                }, React.createElement("h3", {
                    className: "font-bold text-gray-800 flex items-center gap-2 mb-3"
                }, "🚫 Lista de Restritos"), React.createElement("p", {
                    className: "text-sm text-gray-600 mb-3"
                }, Z.length, " registros"), React.createElement("div", {
                    className: "flex gap-2"
                }, React.createElement("button", {
                    onClick: () => t(Z, c, `restritos_${a}.csv`),
                    className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"
                }, "📊 CSV"), React.createElement("button", {
                    onClick: () => e(Z, `restritos_${a}.json`),
                    className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm"
                }, "📄 JSON"))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-5"
                }, React.createElement("h3", {
                    className: "font-bold text-gray-800 flex items-center gap-2 mb-3"
                }, "🤝 Indicações"), React.createElement("p", {
                    className: "text-sm text-gray-600 mb-3"
                }, ae.length, " registros"), React.createElement("div", {
                    className: "flex gap-2"
                }, React.createElement("button", {
                    onClick: () => t(ae, s, `indicacoes_${a}.csv`),
                    className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 text-sm"
                }, "📊 CSV"), React.createElement("button", {
                    onClick: () => e(ae, `indicacoes_${a}.json`),
                    className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-sm"
                }, "📄 JSON"))), React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-5"
                }, React.createElement("h3", {
                    className: "font-bold text-gray-800 flex items-center gap-2 mb-3"
                }, "🔍 Solicitações por Status"), React.createElement("div", {
                    className: "space-y-2"
                }, React.createElement("button", {
                    onClick: () => t(q.filter(e => "aprovado" === e.status || "aprovado_gratuidade" === e.status), l, `aprovados_${a}.csv`),
                    className: "w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 text-sm text-left"
                }, "✅ Aprovados (", q.filter(e => "aprovado" === e.status || "aprovado_gratuidade" === e.status).length, ")"), React.createElement("button", {
                    onClick: () => t(q.filter(e => "aguardando_aprovacao" === e.status), l, `pendentes_${a}.csv`),
                    className: "w-full px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold hover:bg-yellow-200 text-sm text-left"
                }, "⏳ Pendentes (", q.filter(e => "aguardando_aprovacao" === e.status).length, ")"), React.createElement("button", {
                    onClick: () => t(q.filter(e => "rejeitado" === e.status), l, `rejeitados_${a}.csv`),
                    className: "w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 text-sm text-left"
                }, "❌ Rejeitados (", q.filter(e => "rejeitado" === e.status).length, ")")))), React.createElement("div", {
                    className: "bg-amber-50 border border-amber-200 rounded-xl p-4"
                }, React.createElement("h4", {
                    className: "font-semibold text-amber-800 flex items-center gap-2"
                }, "💡 Dicas de Backup"), React.createElement("ul", {
                    className: "text-sm text-amber-700 mt-2 space-y-1"
                }, React.createElement("li", null, "• Faça backups regularmente (recomendado: semanalmente)"), React.createElement("li", null, "• O arquivo JSON pode ser usado para restaurar dados"), React.createElement("li", null, "• O arquivo CSV pode ser aberto no Excel ou Google Sheets"), React.createElement("li", null, "• Guarde os backups em local seguro (Google Drive, OneDrive, etc.)"))))
            })())), "saldo-plific" === p.finTab && React.createElement("div", {className: "max-w-7xl mx-auto p-6 space-y-6"},
    // Header
    React.createElement("div", {className: "bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white"},
        React.createElement("h2", {className: "text-2xl font-bold mb-2"}, "💳 Saldo Plific"),
        React.createElement("p", {className: "text-purple-100"}, "Consulte e gerencie saldos dos profissionais")
    ),
    
    // Consulta Individual
    React.createElement("div", {className: "bg-white rounded-xl shadow-lg p-6"},
        React.createElement("h3", {className: "text-lg font-bold text-gray-800 mb-4"}, "🔍 Consulta Individual"),
        React.createElement("div", {className: "flex gap-3 items-end flex-wrap"},
            React.createElement("div", {className: "flex-1 min-w-[200px]"},
                React.createElement("label", {className: "block text-sm font-medium text-gray-700 mb-1"}, "ID do Profissional"),
                React.createElement("input", {
                    type: "number",
                    value: plificState.idBusca,
                    onChange: function(e) { setPlificState(Object.assign({}, plificState, {idBusca: e.target.value})); },
                    placeholder: "Digite o ID...",
                    className: "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                })
            ),
            React.createElement("button", {
                onClick: function() { consultarSaldoPlific(plificState.idBusca); },
                disabled: plificState.loading,
                className: "px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            }, plificState.loading ? "Consultando..." : "🔍 Consultar")
        ),
        plificState.consultaIndividual && plificState.consultaIndividual.profissional && React.createElement("div", {className: "mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200"},
            React.createElement("div", {className: "grid grid-cols-2 md:grid-cols-5 gap-4"},
                React.createElement("div", null,
                    React.createElement("p", {className: "text-sm text-gray-500"}, "Nome"),
                    React.createElement("p", {className: "font-semibold text-gray-800"}, plificState.consultaIndividual.profissional.nome || "-")
                ),
                React.createElement("div", null,
                    React.createElement("p", {className: "text-sm text-gray-500"}, "CPF"),
                    React.createElement("p", {className: "font-semibold text-gray-800"}, plificState.consultaIndividual.profissional.cpf || "-")
                ),
                React.createElement("div", null,
                    React.createElement("p", {className: "text-sm text-gray-500"}, "Celular"),
                    React.createElement("p", {className: "font-semibold text-gray-800"}, plificState.consultaIndividual.profissional.celular || "-")
                ),
                React.createElement("div", null,
                    React.createElement("p", {className: "text-sm text-gray-500"}, "Saldo"),
                    React.createElement("p", {className: "text-2xl font-bold " + (parseSaldoBR(plificState.consultaIndividual.profissional.saldo) >= 0 ? "text-green-600" : "text-red-600")}, "R$ " + parseSaldoBR(plificState.consultaIndividual.profissional.saldo).toFixed(2).replace(".", ","))
                ),
                React.createElement("div", {className: "flex items-end"},
                    React.createElement("button", {
                        onClick: function() { setModalDebitoPlific(plificState.consultaIndividual.profissional); setDebitoFormPlific({valor: "", descricao: ""}); },
                        className: "px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    }, "💳 Lançar Débito")
                )
            )
        )
    ),
    
    // Histórico de Saldos
    React.createElement("div", {className: "bg-white rounded-xl shadow-lg p-6"},
        React.createElement("div", {className: "flex items-center justify-between mb-4 flex-wrap gap-2"},
            React.createElement("div", null,
                React.createElement("h3", {className: "text-lg font-bold text-gray-800"}, "📊 Histórico de Saldos"),
                plificState.total > 0 && React.createElement("p", {className: "text-sm text-gray-500"}, 
                    plificState.total + " profissionais | Soma total: R$ " + (plificState.somaTotal || 0).toFixed(2).replace(".", ",")
                )
            ),
            React.createElement("div", {className: "flex gap-2"},
                React.createElement("button", {
                    onClick: function() { consultarSaldosLotePlific(1); },
                    disabled: plificState.loadingLote,
                    className: "px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                }, plificState.loadingLote ? "⏳ Carregando..." : "🔄 Atualizar"),
                plificState.consultaLote.length > 0 && React.createElement("button", {
                    onClick: exportarSaldosCSVPlific,
                    className: "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                }, "📥 CSV")
            )
        ),
        plificState.loadingLote ? React.createElement("div", {className: "text-center py-12"},
            React.createElement("div", {className: "animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"}),
            React.createElement("p", {className: "mt-4 text-gray-500"}, "Consultando saldos... isso pode demorar alguns segundos")
        ) : plificState.consultaLote.length > 0 ? React.createElement(React.Fragment, null,
            React.createElement("div", {className: "overflow-x-auto"},
                React.createElement("table", {className: "w-full"},
                    React.createElement("thead", {className: "bg-gray-100"},
                        React.createElement("tr", null,
                            React.createElement("th", {className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"}, "#"),
                            React.createElement("th", {className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"}, "Código"),
                            React.createElement("th", {className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"}, "Nome"),
                            React.createElement("th", {className: "px-4 py-3 text-left text-xs font-semibold text-gray-600"}, "CPF"),
                            React.createElement("th", {className: "px-4 py-3 text-right text-xs font-semibold text-gray-600"}, "Saldo"),
                            React.createElement("th", {className: "px-4 py-3 text-center text-xs font-semibold text-gray-600"}, "Ações")
                        )
                    ),
                    React.createElement("tbody", null,
                        plificState.consultaLote.map(function(prof, idx) {
                            var saldoNum = typeof prof.saldo === "string" ? parseFloat(prof.saldo.replace(/\./g, "").replace(",", ".")) : parseFloat(prof.saldo || 0);
                            var posicao = ((plificState.pagina - 1) * 15) + idx + 1;
                            return React.createElement("tr", {key: prof.codigo || idx, className: idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"},
                                React.createElement("td", {className: "px-4 py-3 text-sm text-gray-400"}, posicao),
                                React.createElement("td", {className: "px-4 py-3 text-sm font-mono"}, prof.codigo),
                                React.createElement("td", {className: "px-4 py-3 text-sm font-medium"}, prof.nome || "-"),
                                React.createElement("td", {className: "px-4 py-3 text-sm text-gray-600"}, prof.cpf || "-"),
                                React.createElement("td", {className: "px-4 py-3 text-sm text-right font-bold " + (saldoNum > 0 ? "text-green-600" : saldoNum < 0 ? "text-red-600" : "text-gray-400")}, 
                                    "R$ " + saldoNum.toFixed(2).replace(".", ",")
                                ),
                                React.createElement("td", {className: "px-4 py-3 text-center"},
                                    React.createElement("button", {
                                        onClick: function() { setModalDebitoPlific({...prof, id: prof.codigo}); setDebitoFormPlific({valor: "", descricao: ""}); },
                                        className: "px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-xs font-medium"
                                    }, "💳 Débito")
                                )
                            );
                        })
                    )
                )
            ),
            // Paginação
            plificState.totalPaginas > 1 && React.createElement("div", {className: "flex items-center justify-between mt-4 pt-4 border-t"},
                React.createElement("p", {className: "text-sm text-gray-500"},
                    "Página " + plificState.pagina + " de " + plificState.totalPaginas
                ),
                React.createElement("div", {className: "flex gap-2"},
                    React.createElement("button", {
                        onClick: function() { consultarSaldosLotePlific(plificState.pagina - 1); },
                        disabled: plificState.pagina <= 1 || plificState.loadingLote,
                        className: "px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    }, "← Anterior"),
                    React.createElement("button", {
                        onClick: function() { consultarSaldosLotePlific(plificState.pagina + 1); },
                        disabled: plificState.pagina >= plificState.totalPaginas || plificState.loadingLote,
                        className: "px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    }, "Próxima →")
                )
            )
        ) : React.createElement("div", {className: "text-center py-12 text-gray-500"},
            React.createElement("div", {className: "text-5xl mb-4"}, "📊"),
            React.createElement("p", {className: "font-medium"}, "Histórico de Saldos"),
            React.createElement("p", {className: "text-sm mt-2"}, "Clique em \"Atualizar\" para carregar os saldos de todos os profissionais"),
            React.createElement("p", {className: "text-xs mt-1 text-gray-400"}, "Ordenado do maior para o menor saldo")
        )
    ),
    
    // Modal de Débito
    modalDebitoPlific && React.createElement("div", {className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", onClick: function() { setModalDebitoPlific(null); }},
        React.createElement("div", {className: "bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4", onClick: function(e) { e.stopPropagation(); }},
            React.createElement("h3", {className: "text-xl font-bold text-gray-800 mb-4"}, "💳 Lançar Débito"),
            React.createElement("div", {className: "bg-gray-50 rounded-lg p-3 mb-4"},
                React.createElement("p", {className: "text-sm text-gray-600"}, "Profissional:"),
                React.createElement("p", {className: "font-semibold text-lg"}, modalDebitoPlific.nome || "ID " + (modalDebitoPlific.idProf || modalDebitoPlific.id || modalDebitoPlific.codigo)),
                React.createElement("p", {className: "text-sm text-gray-500"}, "Saldo atual: R$ " + parseSaldoBR(modalDebitoPlific.saldo).toFixed(2).replace(".", ","))
            ),
            React.createElement("div", {className: "space-y-4"},
                React.createElement("div", null,
                    React.createElement("label", {className: "block text-sm font-medium text-gray-700 mb-1"}, "Valor do Débito *"),
                    React.createElement("input", {
                        type: "number",
                        step: "0.01",
                        min: "0.01",
                        value: debitoFormPlific.valor,
                        onChange: function(e) { setDebitoFormPlific(Object.assign({}, debitoFormPlific, {valor: e.target.value})); },
                        placeholder: "0,00",
                        className: "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    })
                ),
                React.createElement("div", null,
                    React.createElement("label", {className: "block text-sm font-medium text-gray-700 mb-1"}, "Descrição *"),
                    React.createElement("input", {
                        type: "text",
                        value: debitoFormPlific.descricao,
                        onChange: function(e) { setDebitoFormPlific(Object.assign({}, debitoFormPlific, {descricao: e.target.value})); },
                        placeholder: "Ex: Saque emergencial, Taxa de serviço...",
                        className: "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    })
                )
            ),
            React.createElement("div", {className: "flex gap-3 mt-6"},
                React.createElement("button", {
                    onClick: function() { setModalDebitoPlific(null); },
                    className: "flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                }, "Cancelar"),
                React.createElement("button", {
                    onClick: async function() {
                        var idProf = modalDebitoPlific.idProf || modalDebitoPlific.id || modalDebitoPlific.codigo;
                        var sucesso = await lancarDebitoPlific(idProf, debitoFormPlific.valor, debitoFormPlific.descricao);
                        if (sucesso) { setModalDebitoPlific(null); }
                    },
                    disabled: !debitoFormPlific.valor || !debitoFormPlific.descricao || plificState.loadingDebito,
                    className: "flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                }, plificState.loadingDebito ? "Processando..." : "💳 Confirmar Débito")
            )
        )
    ),
    
    // Info
    React.createElement("div", {className: "bg-amber-50 border border-amber-200 rounded-lg p-4"},
        React.createElement("p", {className: "text-sm text-amber-800 font-medium"}, "ℹ️ Informações"),
        React.createElement("ul", {className: "text-xs text-amber-700 mt-2 space-y-1"},
            React.createElement("li", null, "• Rate limit: máximo 10 requisições por segundo"),
            React.createElement("li", null, "• Cache: saldos são cacheados por 5 minutos"),
            React.createElement("li", null, "• Consulta em lote: máximo 100 profissionais por vez")
        )
    )
))
    };
    
    console.log("✅ ModuloFinanceiro.js carregado");
})();
