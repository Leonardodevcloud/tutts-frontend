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
            salvarRelatorio, excluirRelatorio, gerarLinkWaze, copiarParaClipboard, aplicarFormatacao,
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


        /* OPER_ABAS_V1 — helpers visuais das demais abas do Operacional (padrão clean aprovado).
           Só apresentação: estados, handlers e chamadas de API continuam os mesmos. */
        const _oh = React.createElement;
        const OP_SORA = "Sora, Inter, sans-serif";
        const OP_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
        const OP_CARD = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14 };
        const OP_IN = "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]";
        const OP_TXA = "w-full px-3 py-2.5 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]";
        const OP_LBL = "block text-xs font-semibold text-gray-700 mb-1.5";
        const OP_BTN_PRI = "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-[#770fa8] hover:bg-[#5d0b85] text-white text-[13px] font-semibold whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed";
        const OP_BTN_SEC = "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[13px] font-semibold whitespace-nowrap disabled:opacity-50";
        const OP_BTN_SEC_SM = "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold whitespace-nowrap disabled:opacity-50";
        const OP_ICO_BTN = "inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 flex-none disabled:opacity-40 disabled:cursor-not-allowed";
        const OP_ICO_DEST = "inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-800 flex-none";
        const _opIco = (nome, sz, cor) => _oh("svg", { className: "ico", style: { width: sz || 16, height: sz || 16, color: cor, flex: "none" }, "aria-hidden": "true" }, _oh("use", { href: "#i-" + nome }));
        const _opDot = (cor, sz) => _oh("span", { "aria-hidden": "true", style: { width: sz || 6, height: sz || 6, borderRadius: 99, background: cor, flex: "none", display: "inline-block" } });
        const _OP_TOM = { verde: ["#f0fdf4", "#166534", "#16a34a"], ambar: ["#fffbeb", "#92400e", "#d97706"], vermelho: ["#fef2f2", "#991b1b", "#dc2626"], azul: ["#eff6ff", "#1e40af", "#2563eb"], cinza: ["#f3f4f6", "#374151", "#6b7280"], roxo: ["#faf7fd", "#5d0b85", "#770fa8"] };
        const _opPill = (tom, txt, semPonto) => { const c = _OP_TOM[tom] || _OP_TOM.cinza; return _oh("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 99, padding: "2px 9px", fontWeight: 600, fontSize: 11.5, background: c[0], color: c[1], whiteSpace: "nowrap" } }, semPonto ? null : _opDot(c[2]), txt); };
        const _opChip = (ico, txt, key) => _oh("span", { key, style: { display: "inline-flex", alignItems: "center", gap: 5, borderRadius: 99, padding: "2px 9px", fontWeight: 500, fontSize: 11.5, background: "#f3f4f6", color: "#374151", whiteSpace: "nowrap" } }, ico ? _opIco(ico, 12) : null, txt);
        const _opMeta = (ico, txt, key) => _oh("span", { key, style: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#6b7280", whiteSpace: "nowrap" } }, _opIco(ico, 14, "#9ca3af"), txt);
        const _opCab = (titulo, sub, acoes) => _oh("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 } },
            _oh("div", { style: { minWidth: 0 } },
                _oh("h1", { style: { margin: 0, fontFamily: OP_SORA, fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "#111827" } }, titulo),
                sub ? _oh("p", { style: { margin: "4px 0 0", color: "#6b7280", fontSize: 13 } }, sub) : null),
            acoes ? _oh("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } }, acoes) : null);
        const _opKpi = (rotulo, valor, sub, cor, ultimo, extra) => _oh("div", { style: { padding: "16px 20px", borderRight: ultimo ? 0 : "1px solid #f3f4f6", minWidth: 0 } },
            _oh("div", { style: { fontSize: 12, color: "#6b7280" } }, rotulo),
            _oh("div", { style: { fontFamily: OP_SORA, fontSize: 26, fontWeight: 700, color: cor || "#111827", fontVariantNumeric: "tabular-nums", lineHeight: 1.3 } }, valor),
            sub ? _oh("div", { style: { fontSize: 11.5, color: "#6b7280" } }, sub) : null,
            extra || null);
        const _opBar = (pct, cor, alt) => _oh("div", { style: { flex: 1, height: alt || 6, borderRadius: 99, background: "#f3f4f6", overflow: "hidden", minWidth: 40 } }, _oh("div", { style: { height: "100%", width: Math.max(0, Math.min(100, pct)) + "%", background: cor || "#770fa8", borderRadius: 99, transition: "width .3s" } }));
        const _opVazio = (txt, sub, acao) => _oh("div", { style: { ...OP_CARD, padding: "40px 18px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 } },
            _oh("p", { style: { margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" } }, txt),
            sub ? _oh("p", { style: { margin: 0, fontSize: 12.5, color: "#6b7280" } }, sub) : null,
            acao ? _oh("div", { style: { marginTop: 10 } }, acao) : null);
        const _opCarregando = (txt) => _oh("div", { style: { ...OP_CARD, padding: "40px 18px", textAlign: "center", color: "#6b7280", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 } },
            _oh("span", { className: "animate-spin", style: { width: 16, height: 16, borderRadius: 99, border: "2px solid #e9d5f9", borderTopColor: "#770fa8", display: "inline-block" } }), txt || "Carregando...");
        const _opAbas = (itens, ativo, onSel) => _oh("div", { role: "tablist", style: { display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", overflowX: "auto" } },
            itens.map(it => _oh("button", { key: it.id, type: "button", role: "tab", "aria-selected": ativo === it.id ? "true" : "false", onClick: () => onSel(it.id),
                className: ativo === it.id ? "" : "hover:text-gray-700",
                style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 12px", marginBottom: -1, border: 0, background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, whiteSpace: "nowrap", color: ativo === it.id ? "#5d0b85" : "#6b7280", fontWeight: ativo === it.id ? 600 : 500, borderBottom: ativo === it.id ? "2px solid #770fa8" : "2px solid transparent" } },
                it.label, it.n !== undefined ? _oh("span", { style: { borderRadius: 99, padding: "0 7px", fontSize: 11.5, fontWeight: 600, background: ativo === it.id ? "#f3e8fb" : "#f3f4f6", color: ativo === it.id ? "#5d0b85" : "#6b7280", fontVariantNumeric: "tabular-nums" } }, it.n) : null)));
        const _opIniciais = (nome) => String(nome || "?").split(" ").filter(Boolean).slice(0, 2).map(z => z[0]).join("").toUpperCase() || "?";
        const _opAvatar = (nome, foto, sz) => foto
            ? _oh("img", { src: foto, alt: "", style: { width: sz || 36, height: sz || 36, borderRadius: 99, objectFit: "cover", flex: "none", border: "1px solid #e5e7eb" } })
            : _oh("span", { "aria-hidden": "true", style: { width: sz || 36, height: sz || 36, borderRadius: 99, background: "#f3e8fb", color: "#5d0b85", fontSize: (sz || 36) > 30 ? 13 : 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" } }, _opIniciais(nome));
        // Modal padrão: fundo branco, cabeçalho branco (título 16px + texto cinza), rodapé com botões
        const _opModal = (o) => _oh("div", { className: "fixed inset-0 bg-black/40 flex items-start md:items-center justify-center z-50 p-3 md:p-6 overflow-y-auto", onClick: o.onBackdrop },
            _oh("div", { role: "dialog", "aria-modal": "true", "aria-label": typeof o.titulo === "string" ? o.titulo : undefined, className: "w-full my-auto flex flex-col", style: { ...OP_CARD, maxWidth: o.largura || 640, maxHeight: "94vh", overflow: "hidden" } },
                _oh("div", { style: { padding: "18px 22px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 } },
                    _oh("div", { style: { minWidth: 0 } },
                        _oh("h2", { style: { margin: 0, fontSize: 16, fontWeight: 600, color: "#111827" } }, o.titulo),
                        o.sub ? _oh("p", { style: { margin: "3px 0 0", fontSize: 13, color: "#6b7280" } }, o.sub) : null),
                    o.onClose ? _oh("button", { type: "button", onClick: o.onClose, "aria-label": "Fechar", className: "hover:bg-gray-100", style: { width: 32, height: 32, borderRadius: 8, border: 0, background: "transparent", color: "#6b7280", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" } }, _opIco("x", 18)) : null),
                _oh("div", Object.assign({ style: { padding: 22, overflowY: "auto", flex: 1 } }, o.corpoProps || {}), o.corpo),
                _oh("div", { style: { padding: "14px 22px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", background: "#ffffff" } }, o.rodape)));
        const _opRedirect = (titulo, texto, botao, ir) => _oh("div", { className: "space-y-4" },
            _opCab(titulo, "Gerenciado no módulo Financeiro"),
            _opVazio(texto, "Esta aba é só um atalho; os dados e as ações ficam no Financeiro.", _oh("button", { type: "button", onClick: ir, className: OP_BTN_SEC }, botao, _opIco("arrowright", 15))));

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
            // Conteúdo das abas (OPER_ABAS_V1: o contêiner só ocupa espaço nas abas que ele mesmo renderiza — evita padding duplo nas demais)
            React.createElement("div", {className: ["indicacoes", "promo-novatos", "avisos"].includes(p.opTab || "indicacoes") ? "max-w-7xl mx-auto p-6" : "hidden"},
                // Conteúdo Indicação
                /* OPER_ABAS_V1 — Indicações / Promo Novatos: atalhos para o Financeiro (estado vazio limpo) */
                (p.opTab || "indicacoes") === "indicacoes" && _opRedirect("Indicações", "A gestão de indicações fica no módulo Financeiro.", "Ir para Indicações no Financeiro", () => { he("financeiro"); x({finTab: "indicacoes"}); }),
                p.opTab === "promo-novatos" && _opRedirect("Promo Novatos", "As promoções de novatos ficam no módulo Financeiro.", "Ir para Promo Novatos no Financeiro", () => { he("financeiro"); x({finTab: "promo-novatos"}); }),
                /* OPER_ABAS_V1 — Avisos: gestão por região, lista no padrão */
                p.opTab === "avisos" && (() => {
                    const lista = Array.isArray(avisosData) ? avisosData : [];
                    const ativos = lista.filter(a => a.ativo).length;
                    const views = lista.reduce((acc, a) => acc + (Number(a.total_visualizacoes) || 0), 0);
                    const novo = () => { setAvisoEdit(null); setAvisoForm({ titulo: '', regioes: [], todas_regioes: false, data_inicio: '', data_fim: '', recorrencia_tipo: 'uma_vez', recorrencia_intervalo: 24, imagem_url: '' }); setAvisoModal(true); };
                    const fData = v => new Date(v?.slice(0,10) + "T12:00:00").toLocaleDateString("pt-BR");
                    return _oh("div", { className: "space-y-4" },
                        _opCab("Avisos", "Avisos exibidos aos usuários por região · " + lista.length + (lista.length === 1 ? " aviso" : " avisos"),
                            _oh("button", { type: "button", onClick: novo, className: OP_BTN_PRI }, _opIco("plus", 15), "Novo aviso")),
                        lista.length > 0 && _oh("section", { className: "grid grid-cols-1 sm:grid-cols-3", style: { ...OP_CARD, overflow: "hidden" } },
                            _opKpi("Ativos", ativos, "aparecem para os usuários", ativos > 0 ? "#166534" : "#111827"),
                            _opKpi("Inativos", lista.length - ativos, "pausados ou encerrados"),
                            _opKpi("Visualizações", views.toLocaleString("pt-BR"), "somando todos os avisos", null, true)),
                        lista.length === 0 ? _opVazio("Nenhum aviso cadastrado", "Crie um aviso para comunicar algo aos usuários de uma ou mais regiões.", _oh("button", { type: "button", onClick: novo, className: OP_BTN_PRI }, _opIco("plus", 15), "Novo aviso"))
                        : _oh("section", { style: { ...OP_CARD, overflow: "hidden" } },
                            lista.map((aviso, idx) => _oh("div", {
                                key: aviso.id,
                                className: "flex flex-col sm:flex-row gap-4",
                                style: { padding: "16px 18px", borderTop: idx ? "1px solid #f3f4f6" : 0 }
                            },
                                aviso.imagem_url ? _oh("img", { src: aviso.imagem_url, alt: "", style: { width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb", flex: "none", opacity: aviso.ativo ? 1 : .6 } }) : null,
                                _oh("div", { style: { flex: 1, minWidth: 0 } },
                                    _oh("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
                                        _oh("h3", { style: { margin: 0, fontSize: 15, fontWeight: 600, color: aviso.ativo ? "#111827" : "#6b7280" } }, aviso.titulo),
                                        aviso.ativo ? _opPill("verde", "Ativo") : _opPill("cinza", "Inativo")),
                                    _oh("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 } },
                                        aviso.todas_regioes ? _opChip("map", "Todas as regiões") : (aviso.regioes || []).map((r, i) => _opChip("pin", r, i))),
                                    _oh("div", { style: { display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: 8 } },
                                        _opMeta("calendar", fData(aviso.data_inicio) + " – " + fData(aviso.data_fim)),
                                        _opMeta("refresh", aviso.recorrencia_tipo === "uma_vez" ? "Uma vez por usuário" : aviso.recorrencia_tipo === "diario" ? "Uma vez por dia" : `A cada ${aviso.recorrencia_intervalo}h`),
                                        _opMeta("eye", (aviso.total_visualizacoes || 0) + " visualizações"))),
                                _oh("div", { style: { display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" } },
                                    _oh("button", {
                                        type: "button",
                                        onClick: () => { setAvisoEdit(aviso); setAvisoForm({ titulo: aviso.titulo, regioes: aviso.regioes || [], todas_regioes: aviso.todas_regioes, data_inicio: aviso.data_inicio?.slice(0,16), data_fim: aviso.data_fim?.slice(0,16), recorrencia_tipo: aviso.recorrencia_tipo, recorrencia_intervalo: aviso.recorrencia_intervalo, imagem_url: aviso.imagem_url }); setAvisoModal(true); },
                                        className: OP_BTN_SEC_SM
                                    }, _opIco("pencil", 13), "Editar"),
                                    _oh("button", {
                                        type: "button",
                                        onClick: async () => { await fetchAuth(`${API_URL}/avisos-op/${aviso.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...aviso, ativo: !aviso.ativo})}); carregarAvisos(); },
                                        className: OP_BTN_SEC_SM
                                    }, aviso.ativo ? _opIco("power", 13) : _opIco("play", 13), aviso.ativo ? "Desativar" : "Ativar"),
                                    _oh("button", { type: "button", onClick: () => deletarAviso(aviso.id), title: "Excluir aviso", "aria-label": "Excluir aviso", className: OP_ICO_DEST }, _opIco("trash", 14)))
                            ))));
                })()
            ),
            // Modal de criar/editar aviso — OPER_ABAS_V1: modal limpo
            avisoModal && _opModal({
                titulo: avisoEdit ? "Editar aviso" : "Novo aviso",
                sub: "Configure o aviso que será exibido aos usuários",
                largura: 760,
                onClose: () => { setAvisoModal(false); setAvisoEdit(null); },
                corpo: _oh("div", { className: "space-y-5" },
                    // Título
                    _oh("div", null,
                        _oh("label", { htmlFor: "aviso-titulo", className: OP_LBL }, "Título do aviso *"),
                        _oh("input", {
                            id: "aviso-titulo",
                            type: "text",
                            value: avisoForm.titulo,
                            onChange: e => setAvisoForm(f => ({...f, titulo: e.target.value})),
                            placeholder: "Ex: Manutenção programada",
                            className: OP_IN
                        })
                    ),
                    // Regiões
                    _oh("div", null,
                        _oh("span", { className: OP_LBL }, "Regiões *"),
                        _oh("label", { className: "inline-flex items-center gap-2 mb-2 cursor-pointer text-[13px] text-gray-700" },
                            _oh("input", {
                                type: "checkbox",
                                checked: avisoForm.todas_regioes,
                                onChange: e => setAvisoForm(f => ({...f, todas_regioes: e.target.checked, regioes: []})),
                                className: "w-4 h-4 rounded text-purple-700"
                            }),
                            "Todas as regiões"
                        ),
                        !avisoForm.todas_regioes && _oh("div", { className: "max-h-56 overflow-y-auto border border-gray-200 rounded-[10px] p-2 grid grid-cols-2 md:grid-cols-3 gap-1" },
                            avisosRegioes.map(regiao => _oh("label", {
                                key: regiao,
                                className: "flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg text-[13px] text-gray-700"
                            },
                                _oh("input", {
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
                                regiao
                            ))
                        )
                    ),
                    // Período
                    _oh("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" },
                        _oh("div", null,
                            _oh("label", { htmlFor: "aviso-ini", className: OP_LBL }, "Início *"),
                            _oh("input", { id: "aviso-ini", type: "datetime-local", value: avisoForm.data_inicio, onChange: e => setAvisoForm(f => ({...f, data_inicio: e.target.value})), className: OP_IN })
                        ),
                        _oh("div", null,
                            _oh("label", { htmlFor: "aviso-fim", className: OP_LBL }, "Fim *"),
                            _oh("input", { id: "aviso-fim", type: "datetime-local", value: avisoForm.data_fim, onChange: e => setAvisoForm(f => ({...f, data_fim: e.target.value})), className: OP_IN })
                        )
                    ),
                    // Recorrência
                    _oh("div", { className: "grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4" },
                        _oh("div", null,
                            _oh("label", { htmlFor: "aviso-rec", className: OP_LBL }, "Recorrência"),
                            _oh("select", { id: "aviso-rec", value: avisoForm.recorrencia_tipo, onChange: e => setAvisoForm(f => ({...f, recorrencia_tipo: e.target.value})), className: OP_IN },
                                _oh("option", {value: "uma_vez"}, "Exibir apenas uma vez por usuário"),
                                _oh("option", {value: "diario"}, "Exibir uma vez por dia"),
                                _oh("option", {value: "intervalo_horas"}, "Exibir a cada X horas")
                            )
                        ),
                        avisoForm.recorrencia_tipo === "intervalo_horas" && _oh("div", null,
                            _oh("label", { htmlFor: "aviso-int", className: OP_LBL }, "Intervalo (horas)"),
                            _oh("input", { id: "aviso-int", type: "number", min: "1", value: avisoForm.recorrencia_intervalo, onChange: e => setAvisoForm(f => ({...f, recorrencia_intervalo: parseInt(e.target.value) || 1})), className: OP_IN })
                        )
                    ),
                    // Upload de imagem
                    _oh("div", null,
                        _oh("span", { className: OP_LBL }, "Imagem do aviso"),
                        _oh("div", { className: "border border-dashed border-gray-300 rounded-[12px] p-5 text-center bg-gray-50" },
                            avisoForm.imagem_url ? _oh("div", { className: "space-y-3" },
                                _oh("img", { src: avisoForm.imagem_url, alt: "Pré-visualização do aviso", className: "max-h-48 mx-auto rounded-[10px] border border-gray-200" }),
                                _oh("button", { type: "button", onClick: () => setAvisoForm(f => ({...f, imagem_url: ''})), className: OP_BTN_SEC_SM + " !text-red-800 !border-red-200" }, _opIco("trash", 13), "Remover imagem")
                            ) : _oh("div", { className: "flex flex-col items-center gap-2" },
                                _oh("span", { style: { color: "#9ca3af", display: "inline-flex" } }, _opIco("camera", 22)),
                                _oh("p", { className: "text-[13px] text-gray-500 m-0" }, "PNG ou JPG para acompanhar o aviso"),
                                _oh("input", { type: "file", accept: "image/*", onChange: handleAvisoImageUpload, className: "hidden", id: "aviso-img-upload" }),
                                _oh("label", { htmlFor: "aviso-img-upload", className: OP_BTN_SEC_SM + " cursor-pointer" }, "Selecionar imagem")
                            )
                        )
                    )
                ),
                rodape: [
                    _oh("button", { key: "c", type: "button", onClick: () => { setAvisoModal(false); setAvisoEdit(null); }, className: OP_BTN_SEC }, "Cancelar"),
                    _oh("button", {
                        key: "s",
                        type: "button",
                        onClick: salvarAviso,
                        disabled: !avisoForm.titulo || !avisoForm.data_inicio || !avisoForm.data_fim || (!avisoForm.todas_regioes && avisoForm.regioes.length === 0),
                        className: OP_BTN_PRI
                    }, avisoEdit ? _opIco("save", 15) : _opIco("plus", 15), avisoEdit ? "Salvar alterações" : "Criar aviso")
                ]
            }),
            // ==================== CONTEÚDO NOVAS OPERAÇÕES ====================
            /* OPER_ABAS_V1 — Novas Operações: faixa de KPIs, abas no padrão e lista de cards limpos */
            p.opTab === "novas-operacoes" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-4"},
                    _opCab("Novas operações", "Cadastre e acompanhe a implantação de operações de entrega",
                        React.createElement("button", {
                        type: "button",
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
                        className: OP_BTN_PRI
                    }, _opIco("plus", 15), "Nova operação")),

                    // KPIs (faixa única)
                    React.createElement("section", {className: "grid grid-cols-2 lg:grid-cols-4", style: { ...OP_CARD, overflow: "hidden" }},
                        _opKpi("Total", operacoesData?.length || 0, "operações cadastradas"),
                        _opKpi("Em execução", operacoesData?.filter(o => o.status !== 'concluido').length || 0, "em implantação", "#92400e"),
                        _opKpi("Concluídas", operacoesData?.filter(o => o.status === 'concluido').length || 0, "implantadas", "#166534"),
                        _opKpi("Veículos totais", operacoesData?.reduce((acc, o) => acc + (o.quantidade_motos || 0), 0) || 0, "somando todas as operações", null, true)
                    ),

                    // Abas + lista
                    React.createElement("div", { className: "space-y-3" },
                        _opAbas([
                            { id: 'execucao', label: "Em execução", n: operacoesData?.filter(o => o.status !== 'concluido').length || 0 },
                            { id: 'concluidas', label: "Concluídas", n: operacoesData?.filter(o => o.status === 'concluido').length || 0 }
                        ], operacaoSubTab, setOperacaoSubTab),

                    (function() {
                        const operacoesFiltradas = operacaoSubTab === 'execucao'
                            ? operacoesData?.filter(o => o.status !== 'concluido') || []
                            : operacoesData?.filter(o => o.status === 'concluido') || [];

                        if (operacoesFiltradas.length === 0) {
                            return _opVazio(
                                operacaoSubTab === 'execucao' ? "Nenhuma operação em execução" : "Nenhuma operação concluída ainda",
                                operacaoSubTab === 'execucao' ? "Clique em \"Nova operação\" para começar." : "As operações concluídas aparecem aqui."
                            );
                        }

                        return React.createElement("div", {className: "space-y-2.5"},
                            operacoesFiltradas.map(op => {
                                const contador = calcularContadorRegressivo(op.data_inicio);
                                const checklist = checklistMotos[op.id] || {};
                                const motosEncontradas = Object.values(checklist).filter(v => v).length;
                                const todasMotosEncontradas = motosEncontradas === op.quantidade_motos;
                                const aberto = operacaoExpandida === op.id;
                                const modChip = op.modalidade === 'hub' ? ["map", "Hub"]
                                    : op.modalidade === 'hibrida' ? ["shuffle", "Híbrida"]
                                    : op.modalidade === 'clt' ? ["idcard", "CLT"]
                                    : op.modalidade === 'dedicado' ? ["target", "Dedicado"]
                                    : op.modelo === 'nuvem' ? ["cloud", "Nuvem"]
                                    : op.modelo === 'dedicado' ? ["target", "Dedicado"]
                                    : ["zap", "Flash"];
                                const stTom = op.status === 'ativo' ? ["verde", "Ativa"]
                                    : op.status === 'concluido' ? ["azul", "Concluída"]
                                    : op.status === 'pausado' ? ["ambar", "Pausada"]
                                    : ["cinza", op.status ? (op.status.charAt(0).toUpperCase() + op.status.slice(1)) : "Sem status"];
                                const cdTom = contador.status === 'iniciado' ? 'azul'
                                    : (contador.status === 'hoje' || contador.status === 'amanha') ? 'ambar'
                                    : 'cinza';
                                const veicIco = op.tipo_veiculo === 'carro' ? "car" : "bike";
                                const veicLabel = op.tipo_veiculo === 'carro' ? 'veículo' : 'moto';
                                const dataFmt = op.data_inicio ? new Date(op.data_inicio.split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                                const rotulo = (txt) => React.createElement("p", { style: { margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#6b7280" } }, txt);

                                return React.createElement("div", {
                                    key: op.id,
                                    style: { ...OP_CARD, borderColor: aberto ? "#d1d5db" : "#e5e7eb" }
                                },
                                    React.createElement("div", {
                                        onClick: () => setOperacaoExpandida(prev => prev === op.id ? null : op.id),
                                        role: "button",
                                        tabIndex: 0,
                                        "aria-expanded": aberto ? "true" : "false",
                                        onKeyDown: ev => { (ev.key === "Enter" || ev.key === " ") && ev.target === ev.currentTarget && (ev.preventDefault(), setOperacaoExpandida(prev => prev === op.id ? null : op.id)); },
                                        className: "flex items-center gap-3.5 p-4 cursor-pointer flex-wrap sm:flex-nowrap"
                                    },
                                        React.createElement("div", {className: "flex-1 min-w-0"},
                                            React.createElement("div", {className: "flex items-center gap-2 flex-wrap"},
                                                React.createElement("span", {style: { fontWeight: 600, fontSize: 15, color: "#111827" }}, op.nome_cliente),
                                                _opPill(stTom[0], stTom[1]),
                                                _opChip(modChip[0], modChip[1])
                                            ),
                                            React.createElement("div", {className: "flex items-center gap-x-4 gap-y-1 flex-wrap mt-1.5"},
                                                _opMeta("pin", op.regiao || "-"),
                                                _opMeta(veicIco, op.quantidade_motos + " " + veicLabel + (op.quantidade_motos > 1 ? "s" : "")),
                                                _opMeta("calendar", dataFmt),
                                                _opPill(cdTom, contador.texto, true)
                                            )
                                        ),
                                        React.createElement("div", {onClick: e => e.stopPropagation(), className: "flex items-center gap-1.5 flex-none"},
                                            React.createElement("button", {type: "button", onClick: () => gerarRelatorioOperacao(op), title: "Relatório Word", "aria-label": "Relatório Word", className: OP_ICO_BTN}, _opIco("filetext", 15)),
                                            React.createElement("button", {
                                                type: "button",
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
                                                "aria-label": "Editar operação",
                                                className: OP_ICO_BTN
                                            }, _opIco("pencil", 15)),
                                            op.status !== 'concluido' && React.createElement("button", {
                                                type: "button",
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
                                                "aria-label": op.status === 'ativo' ? 'Pausar operação' : 'Ativar operação',
                                                className: OP_ICO_BTN
                                            }, op.status === 'ativo' ? _opIco("power", 15) : _opIco("play", 15)),
                                            React.createElement("button", {
                                                type: "button",
                                                onClick: async () => {
                                                    if (confirm(`Excluir operação "${op.nome_cliente}"?`)) {
                                                        await fetchAuth(`${API_URL}/operacoes/${op.id}`, { method: 'DELETE' });
                                                        carregarOperacoes();
                                                        if (notificarOperacaoSalva) notificarOperacaoSalva();
                                                        ja('Operação excluída!', 'success');
                                                    }
                                                },
                                                title: "Excluir",
                                                "aria-label": "Excluir operação",
                                                className: OP_ICO_DEST
                                            }, _opIco("trash", 15))
                                        ),
                                        React.createElement("span", {style: { color: "#9ca3af", display: "inline-flex", transition: "transform .15s", transform: aberto ? "rotate(180deg)" : "none" }}, _opIco("arrowdown", 15))
                                    ),
                                    aberto && React.createElement("div", {className: "px-4 pb-4 pt-3 space-y-3", style: { borderTop: "1px solid #f3f4f6" }},
                                        React.createElement("div", null,
                                            rotulo("Endereço"),
                                            React.createElement("p", {className: "text-[13px] text-gray-700 m-0"}, op.endereco || '-')
                                        ),
                                        op.observacoes && React.createElement("div", null,
                                            rotulo("Observações"),
                                            React.createElement("p", {className: "text-[13px] text-gray-700 m-0"}, op.observacoes)
                                        ),
                                        (op.obrigatoriedade_bau || op.possui_garantido) && React.createElement("div", {className: "flex flex-wrap gap-2"},
                                            op.obrigatoriedade_bau && _opPill("ambar", "Baú obrigatório"),
                                            op.possui_garantido && _opPill("verde", "Garantido: R$ " + parseFloat(op.valor_garantido || 0).toFixed(2))
                                        ),
                                        op.faixas_km && op.faixas_km.filter(f => f.valor_motoboy > 0).length > 0 && React.createElement("div", null,
                                            rotulo("Valores por faixa de KM"),
                                            React.createElement("div", {className: "flex flex-wrap gap-1.5"},
                                                op.faixas_km.filter(f => f.valor_motoboy > 0).map((faixa, idx) =>
                                                    React.createElement("span", {key: idx, style: { padding: "3px 9px", borderRadius: 8, background: "#f9fafb", border: "1px solid #e5e7eb", fontSize: 12, color: "#374151", fontVariantNumeric: "tabular-nums" }}, faixa.km_inicio, "–", faixa.km_fim, " km: R$ ", parseFloat(faixa.valor_motoboy).toFixed(2))
                                                )
                                            )
                                        ),
                                        op.status !== 'concluido' && React.createElement("div", null,
                                            rotulo("Checklist de veículos · " + motosEncontradas + "/" + op.quantidade_motos),
                                            React.createElement("div", {className: "flex flex-wrap gap-2"},
                                                Array.from({length: op.quantidade_motos}, (_, i) =>
                                                    React.createElement("label", {key: i, className: "flex items-center gap-2 px-3 h-8 rounded-lg cursor-pointer text-xs font-semibold border " + (checklist[i] ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50')},
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
                                            React.createElement("span", {className: "text-xs text-gray-500"}, "Criado por ", op.criado_por || '-'),
                                            op.status !== 'concluido' && React.createElement("button", {
                                                type: "button",
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
                                                className: OP_BTN_SEC_SM
                                            }, _opIco("check", 14), "Marcar como concluída")
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
            /* OPER_ABAS_V1: modal limpo, cards de opção sem caixas coloridas */
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
                        "aria-pressed": opts.sel ? "true" : "false",
                        className: "relative text-left rounded-[12px] border p-4 transition-colors " +
                            (opts.sel ? "border-[#770fa8] bg-[#faf7fd]" : "border-gray-200 bg-white hover:border-gray-300") +
                            (opts.col ? " flex flex-col gap-2" : " flex items-center gap-3")
                    },
                        opts.sel && React.createElement("span", { className: "absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#770fa8] text-white grid place-items-center" }, React.createElement("svg", { className: "ico", style: { width: 12, height: 12, color: "#ffffff" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" }))),
                        React.createElement("span", { className: "w-12 h-12 rounded-xl grid place-items-center text-2xl flex-none " + (opts.sel ? "bg-white" : "bg-violet-50") + (opts.emoji ? "" : " hidden") }, opts.emoji),
                        React.createElement("span", { className: "block" },
                            React.createElement("span", { className: "block font-semibold text-gray-900 text-sm" }, opts.titulo),
                            React.createElement("span", { className: "block text-xs text-gray-500 mt-0.5" }, opts.desc),
                            opts.badge && React.createElement("span", { className: "inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700" }, opts.badge)
                        )
                    );
                };

                return React.createElement("div", { className: "fixed inset-0 bg-black/50 flex items-start md:items-center justify-center z-50 p-3 md:p-6 overflow-y-auto" },
                    React.createElement("div", { className: "bg-white rounded-[14px] border border-gray-200 w-full max-w-5xl max-h-[94vh] overflow-y-auto my-auto" },
                        React.createElement("div", { className: "bg-white border-b border-gray-100 text-gray-900 px-6 py-5 sticky top-0 z-10" },
                            React.createElement("div", { className: "flex justify-between items-center" },
                                React.createElement("div", { className: "flex items-center gap-3" },
                                    React.createElement("div", { className: "hidden" }, operacaoEdit ? React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-pencil" })) : React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" }))),
                                    React.createElement("div", null,
                                        React.createElement("h2", { className: "text-base font-semibold" }, operacaoEdit ? "Editar operação" : "Nova operação"),
                                        React.createElement("p", { className: "text-gray-500 text-sm" }, step === 1 ? "Escolha o tipo de veículo e a modalidade" : (isClt ? "Contratação CLT — remuneração e benefícios" : "Preencha os dados da operação"))
                                    )
                                ),
                                React.createElement("button", { type: "button", "aria-label": "Fechar", onClick: () => setOperacaoModal(false), className: "w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100" }, React.createElement("svg", { className: "ico", style: { width: 18, height: 18 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" })))
                            ),
                            React.createElement("div", { className: "flex gap-2 mt-4" },
                                React.createElement("div", { className: "flex-1 flex items-center gap-2 px-3 py-2 rounded-[10px] " + (step === 1 ? "bg-[#faf7fd] text-[#5d0b85] border border-[#e9d5f9]" : "bg-white text-gray-500 border border-gray-200") },
                                    React.createElement("span", { className: "w-6 h-6 rounded-full grid place-items-center text-xs font-bold " + (step === 1 ? "bg-[#770fa8] text-white" : "bg-green-600 text-white") }, step === 1 ? "1" : React.createElement("svg", { className: "ico", style: { width: 14, height: 14, color: "#ffffff" }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-check" }))),
                                    React.createElement("span", { className: "text-sm font-semibold" }, "Veículo & Modalidade")
                                ),
                                React.createElement("div", { className: "flex-1 flex items-center gap-2 px-3 py-2 rounded-[10px] " + (step === 2 ? "bg-[#faf7fd] text-[#5d0b85] border border-[#e9d5f9]" : "bg-white text-gray-500 border border-gray-200") },
                                    React.createElement("span", { className: "w-6 h-6 rounded-full grid place-items-center text-xs font-bold " + (step === 2 ? "bg-[#770fa8] text-white" : "bg-gray-200 text-gray-600") }, "2"),
                                    React.createElement("span", { className: "text-sm font-semibold" }, "Detalhes da operação")
                                )
                            )
                        ),
                        React.createElement("div", { className: "p-6 space-y-6" },
                          step === 1 && React.createElement("div", { className: "space-y-6" },
                            React.createElement("div", null,
                                React.createElement("h3", { className: "text-[15px] font-semibold text-gray-900 mb-3 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-bike" })), "Tipo de veículo "), React.createElement("span", { className: "text-gray-400" }, "*")),
                                React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                                    choiceCard({ sel: operacaoForm.tipo_veiculo === 'moto', onClick: () => selVeic('moto'), emoji: "", titulo: "Moto", desc: "Entregas urbanas, leve e ágil" }),
                                    choiceCard({ sel: operacaoForm.tipo_veiculo === 'carro', onClick: () => selVeic('carro'), emoji: "", titulo: "Carro utilitário", desc: "Cargas maiores e volumosas" })
                                )
                            ),
                            React.createElement("div", null,
                                React.createElement("h3", { className: "text-[15px] font-semibold text-gray-900 mb-3 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-puzzle" })), "Modalidade "), React.createElement("span", { className: "text-gray-400" }, "*")),
                                React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
                                    choiceCard({ col: true, sel: operacaoForm.modalidade === 'dedicado', onClick: () => selMod('dedicado'), emoji: "", titulo: "Dedicado", desc: "Frota fixa para um cliente", badge: "exclusivo", badgeClass: "" }),
                                    choiceCard({ col: true, sel: operacaoForm.modalidade === 'hub', onClick: () => selMod('hub'), emoji: "", titulo: "Hub", desc: "Pool compartilhado por região", badge: "compartilhado", badgeClass: "" }),
                                    choiceCard({ col: true, sel: operacaoForm.modalidade === 'hibrida', onClick: () => selMod('hibrida'), emoji: "", titulo: "Híbrida", desc: "Dedicado + Hub no mesmo contrato", badge: "dedicado + hub", badgeClass: "" }),
                                    choiceCard({ col: true, sel: operacaoForm.modalidade === 'clt', onClick: () => selMod('clt'), emoji: "", titulo: "CLT", desc: "Carteira assinada, salário fixo", badge: "contratação", badgeClass: "" })
                                )
                            ),
                            (operacaoForm.modalidade && !isHub) && React.createElement("div", null,
                                React.createElement("h3", { className: "text-[15px] font-semibold text-gray-900 mb-3 flex items-center gap-2" }, "Quantidade " + (isClt ? "de vagas CLT" : "de veículos") + " ", React.createElement("span", { className: "text-gray-400" }, "*")),
                                React.createElement("div", { className: "bg-white border border-gray-200 rounded-[12px] p-4 flex items-center gap-4 flex-wrap" },
                                    React.createElement("div", null,
                                        React.createElement("p", { className: "font-semibold text-gray-900 text-sm" }, isClt ? "Quantas vagas CLT nessa operação?" : "Quantos veículos nessa operação?"),
                                        React.createElement("span", { className: "inline-block mt-1 text-[11px] text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full font-semibold" }, "sugestão: " + (SUG[operacaoForm.modalidade] || 1))
                                    ),
                                    React.createElement("div", { className: "ml-auto flex items-center border border-gray-200 rounded-[10px] overflow-hidden bg-white" },
                                        React.createElement("button", { type: "button", onClick: () => setOperacaoForm(f => ({ ...f, quantidade_motos: Math.max(1, (parseInt(f.quantidade_motos) || 1) - 1) })), "aria-label": "Diminuir", className: "w-10 h-10 text-gray-700 text-lg hover:bg-gray-50" }, "−"),
                                        React.createElement("input", { type: "number", min: "1", value: operacaoForm.quantidade_motos, onChange: e => setOperacaoForm(f => ({ ...f, quantidade_motos: parseInt(e.target.value) || 1 })), "aria-label": "Quantidade", className: "w-16 h-10 text-center text-base font-semibold border-x border-gray-200 focus:outline-none tabular-nums" }),
                                        React.createElement("button", { type: "button", onClick: () => setOperacaoForm(f => ({ ...f, quantidade_motos: (parseInt(f.quantidade_motos) || 0) + 1 })), "aria-label": "Aumentar", className: "w-10 h-10 text-gray-700 text-lg hover:bg-gray-50" }, "+")
                                    )
                                )
                            )
                          ),
                          step === 2 && React.createElement("div", { className: "space-y-6" },
                            React.createElement("div", { className: "bg-white border border-gray-200 rounded-[14px] p-4" },
                                React.createElement("div", { className: "flex items-center justify-between mb-4" },
                                    React.createElement("h3", { className: "text-[15px] font-semibold text-gray-900 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-clipboard" })), "Dados Básicos")),
                                    React.createElement("span", { className: "text-xs text-gray-500" }, (VEH[operacaoForm.tipo_veiculo] || '—') + " · " + (MOD[operacaoForm.modalidade] || '—') + (isHub ? "" : " · " + (operacaoForm.quantidade_motos || 0) + (isClt ? " vaga(s)" : " veículo(s)")))
                                ),
                                React.createElement("div", { className: "grid md:grid-cols-2 gap-4" },
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Região *"),
                                        React.createElement("input", { type: "text", value: operacaoForm.regiao, onChange: e => setOperacaoForm(f => ({ ...f, regiao: e.target.value })), placeholder: "Ex: Brasília, Goiânia, São Paulo...", className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                                    ),
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Nome do Cliente *"),
                                        React.createElement("input", { type: "text", value: operacaoForm.nome_cliente, onChange: e => setOperacaoForm(f => ({ ...f, nome_cliente: e.target.value })), placeholder: "Nome da empresa/loja", className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                                    ),
                                    React.createElement("div", { className: "md:col-span-2" },
                                        React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Endereço *"),
                                        React.createElement("input", { type: "text", value: operacaoForm.endereco, onChange: e => setOperacaoForm(f => ({ ...f, endereco: e.target.value })), placeholder: "Endereço completo da operação", className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                                    )
                                )
                            ),
                            React.createElement("div", { className: "bg-white border border-gray-200 rounded-[14px] p-4" },
                                React.createElement("h3", { className: "text-[15px] font-semibold text-gray-900 mb-4 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-settings" })), "Configurações")),
                                React.createElement("div", { className: "grid md:grid-cols-2 gap-4" },
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Data de Início *"),
                                        React.createElement("input", { type: "date", value: operacaoForm.data_inicio, onChange: e => setOperacaoForm(f => ({ ...f, data_inicio: e.target.value })), className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                                    )
                                ),
                                React.createElement("div", { className: "grid md:grid-cols-2 gap-4 mt-4" },
                                    !isCarro && React.createElement("label", { className: "flex items-center gap-3 p-3.5 bg-white rounded-[12px] border border-gray-200 cursor-pointer hover:bg-gray-50" },
                                        React.createElement("input", { type: "checkbox", checked: operacaoForm.obrigatoriedade_bau, onChange: e => setOperacaoForm(f => ({ ...f, obrigatoriedade_bau: e.target.checked })), className: "w-5 h-5 rounded text-violet-600" }),
                                        React.createElement("div", null,
                                            React.createElement("span", { className: "font-semibold text-gray-700" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-package" })), "Obrigatoriedade de Baú")),
                                            React.createElement("p", { className: "text-sm text-gray-500" }, "Veículo precisa ter baú?")
                                        )
                                    ),
                                    !isClt && React.createElement("label", { className: "flex items-center gap-3 p-3.5 bg-white rounded-[12px] border border-gray-200 cursor-pointer hover:bg-gray-50" },
                                        React.createElement("input", { type: "checkbox", checked: operacaoForm.possui_garantido, onChange: e => setOperacaoForm(f => ({ ...f, possui_garantido: e.target.checked, valor_garantido: e.target.checked ? operacaoForm.valor_garantido : '' })), className: "w-5 h-5 rounded text-violet-600" }),
                                        React.createElement("div", null,
                                            React.createElement("span", { className: "font-semibold text-gray-700" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Possui Garantido")),
                                            React.createElement("p", { className: "text-sm text-gray-500" }, "Loja paga garantido?")
                                        )
                                    )
                                ),
                                (!isClt && operacaoForm.possui_garantido) && React.createElement("div", { className: "mt-4" },
                                    React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Valor do Garantido (R$)")),
                                    React.createElement("input", { type: "number", step: "0.01", min: "0", value: operacaoForm.valor_garantido, onChange: e => setOperacaoForm(f => ({ ...f, valor_garantido: e.target.value })), placeholder: "0.00", className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb] md:!w-1/3" })
                                )
                            ),
                            !isClt && React.createElement("div", { className: "bg-white border border-gray-200 rounded-[14px] p-4" },
                                React.createElement("h3", { className: "text-[15px] font-semibold text-gray-900 mb-4 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-wallet" })), "Valores Pagos por Faixa de KM")),
                                React.createElement("p", { className: "text-sm text-gray-500 mb-4" }, "Preencha os valores de cada faixa de quilometragem"),
                                React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-3" },
                                    operacaoForm.faixas_km.map(function(faixa, idx) {
                                        return React.createElement("div", { key: idx, className: "bg-white p-3 rounded-[10px] border border-gray-200" },
                                            React.createElement("p", { className: "text-xs font-semibold text-gray-600 mb-2 text-center" }, faixa.km_inicio + " km à " + faixa.km_fim + " km"),
                                            React.createElement("div", { className: "relative" },
                                                React.createElement("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" }, "R$"),
                                                React.createElement("input", { type: "number", step: "0.01", min: "0", value: faixa.valor_motoboy || '', onChange: function(e) { var nf = operacaoForm.faixas_km.slice(); nf[idx] = Object.assign({}, nf[idx], { valor_motoboy: e.target.value }); setOperacaoForm(f => ({ ...f, faixas_km: nf })); }, placeholder: "0.00", className: "w-full h-[34px] pl-9 pr-3 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb] text-center" })
                                            )
                                        );
                                    })
                                )
                            ),
                            isClt && React.createElement("div", { className: "bg-white border border-gray-200 rounded-[14px] p-4" },
                                React.createElement("h3", { className: "text-[15px] font-semibold text-gray-900 mb-4 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-idcard" })), "Remuneração CLT")),
                                React.createElement("div", { className: "grid md:grid-cols-3 gap-4" },
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Salário base (R$) *"),
                                        React.createElement("input", { type: "number", step: "0.01", min: "0", value: operacaoForm.salario, onChange: e => setOperacaoForm(f => ({ ...f, salario: e.target.value })), placeholder: "0.00", className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                                    ),
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Início da jornada *"),
                                        React.createElement("input", { type: "time", value: operacaoForm.horario_inicio, onChange: e => setOperacaoForm(f => ({ ...f, horario_inicio: e.target.value })), className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                                    ),
                                    React.createElement("div", null,
                                        React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Fim da jornada *"),
                                        React.createElement("input", { type: "time", value: operacaoForm.horario_fim, onChange: e => setOperacaoForm(f => ({ ...f, horario_fim: e.target.value })), className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                                    )
                                ),
                                React.createElement("div", { className: "mt-4" },
                                    React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Escala / observação de horário"),
                                    React.createElement("input", { type: "text", value: operacaoForm.escala_obs, onChange: e => setOperacaoForm(f => ({ ...f, escala_obs: e.target.value })), placeholder: "Ex.: 6x1, seg a sáb, 1h de almoço", className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                                ),
                                React.createElement("h3", { className: "text-[15px] font-semibold text-gray-900 mt-6 mb-2 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-gift" })), "Benefícios")),
                                React.createElement("p", { className: "text-sm text-gray-500 mb-3" }, "Ative e informe o valor de cada um"),
                                React.createElement("div", { className: "space-y-2" },
                                    BENS.map(function(b) {
                                        var on = !!(bens[b.k] && bens[b.k].on);
                                        return React.createElement("div", { key: b.k, className: "rounded-[12px] border bg-white overflow-hidden " + (on ? "border-[#770fa8]" : "border-gray-200") },
                                            React.createElement("div", { onClick: function() { toggleBen(b.k); }, className: "flex items-center gap-3 px-4 py-3 cursor-pointer " + (on ? "bg-[#faf7fd]" : "") },
                                                React.createElement("span", { className: "w-10 h-6 rounded-full relative transition-all flex-none " + (on ? "bg-[#770fa8]" : "bg-gray-300") },
                                                    React.createElement("span", { className: "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all " + (on ? "left-[18px]" : "left-0.5") })
                                                ),
                                                React.createElement("span", { className: "text-lg" }, b.i),
                                                React.createElement("span", { className: "font-semibold text-gray-700 text-sm" }, b.t)
                                            ),
                                            on && React.createElement("div", { className: "px-4 pb-4 pt-1" },
                                                React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Valor mensal (R$)"),
                                                React.createElement("input", { type: "number", step: "0.01", min: "0", value: (bens[b.k] && bens[b.k].valor) || '', onChange: function(e) { setBenField(b.k, 'valor', e.target.value); }, placeholder: "0.00", className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb] md:!w-1/3" })
                                            )
                                        );
                                    }),
                                    (function() {
                                        var on = !!(bens.outros && bens.outros.on);
                                        return React.createElement("div", { className: "rounded-[12px] border bg-white overflow-hidden " + (on ? "border-[#770fa8]" : "border-gray-200") },
                                            React.createElement("div", { onClick: function() { toggleBen('outros'); }, className: "flex items-center gap-3 px-4 py-3 cursor-pointer " + (on ? "bg-[#faf7fd]" : "") },
                                                React.createElement("span", { className: "w-10 h-6 rounded-full relative transition-all flex-none " + (on ? "bg-[#770fa8]" : "bg-gray-300") },
                                                    React.createElement("span", { className: "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all " + (on ? "left-[18px]" : "left-0.5") })
                                                ),
                                                React.createElement("span", { className: "text-lg" }, React.createElement("svg", { className: "ico", style: { width: 20, height: 20 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" }))),
                                                React.createElement("span", { className: "font-semibold text-gray-700 text-sm" }, "Outros bônus")
                                            ),
                                            on && React.createElement("div", { className: "px-4 pb-4 pt-1 grid md:grid-cols-2 gap-3" },
                                                React.createElement("div", null,
                                                    React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Descrição"),
                                                    React.createElement("input", { type: "text", value: (bens.outros && bens.outros.desc) || '', onChange: function(e) { setBenField('outros', 'desc', e.target.value); }, placeholder: "Ex.: bônus produtividade, prêmio assiduidade...", className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                                                ),
                                                React.createElement("div", null,
                                                    React.createElement("label", { className: "block text-xs font-semibold text-gray-700 mb-1.5" }, "Valor mensal (R$)"),
                                                    React.createElement("input", { type: "number", step: "0.01", min: "0", value: (bens.outros && bens.outros.valor) || '', onChange: function(e) { setBenField('outros', 'valor', e.target.value); }, placeholder: "0.00", className: "w-full h-[38px] px-3 rounded-[10px] border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                                                )
                                            )
                                        );
                                    })()
                                )
                            ),
                            React.createElement("div", { className: "bg-white border border-gray-200 rounded-[14px] p-4" },
                                React.createElement("h3", { className: "text-[15px] font-semibold text-gray-900 mb-4 flex items-center gap-2" }, React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-filetext" })), "Observações")),
                                React.createElement("textarea", { value: operacaoForm.observacoes, onChange: e => setOperacaoForm(f => ({ ...f, observacoes: e.target.value })), placeholder: "Informações adicionais sobre a operação...", rows: 3, className: "w-full px-3 py-2.5 rounded-[10px] border border-gray-200 bg-white text-[13px] focus:outline-none focus:border-[#770fa8] focus:ring-2 focus:ring-[#f3e8fb]" })
                            )
                          )
                        ),
                        React.createElement("div", { className: "flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-white sticky bottom-0" },
                            step === 1
                                ? React.createElement("button", { onClick: () => setOperacaoModal(false), className: "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[13px] font-semibold" }, "Cancelar")
                                : React.createElement("button", { onClick: () => setOperacaoForm(f => ({ ...f, _step: 1 })), className: "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-[10px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[13px] font-semibold" }, "← Voltar"),
                            React.createElement("div", { className: "flex-1 text-sm text-gray-500" }, step === 1 ? (podeAvancar ? ((VEH[operacaoForm.tipo_veiculo]) + " · " + (MOD[operacaoForm.modalidade])) : "Selecione veículo e modalidade") : "Passo 2 de 2"),
                            step === 1
                                ? React.createElement("button", { disabled: !podeAvancar, onClick: () => setOperacaoForm(f => ({ ...f, _step: 2 })), className: "inline-flex items-center justify-center h-10 px-4 rounded-[10px] text-[13px] font-semibold text-white bg-[#770fa8] " + (podeAvancar ? "hover:bg-[#5d0b85]" : "opacity-40 cursor-not-allowed") }, "Continuar →")
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
                                    className: "inline-flex items-center justify-center h-10 px-4 rounded-[10px] text-[13px] font-semibold text-white bg-[#770fa8] hover:bg-[#5d0b85]"
                                  }, operacaoEdit ? React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-save" })), "Salvar Alterações") : React.createElement("span", { className: "inline-flex items-center gap-1.5" }, React.createElement("svg", { className: "ico", style: { width: 16, height: 16 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-plus" })), "Criar operação"))
                        )
                    )
                );
            })(),
            // ==================== CONTEÚDO RECRUTAMENTO ====================
            /* OPER_ABAS_V1 — Recrutamento: progresso geral em faixa de KPIs, abas no padrão e cards de necessidade com barras finas */
            p.opTab === "recrutamento" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-4"},
                    _opCab("Recrutamento", "Necessidades de motoboys por cliente" + (recrutamentoData.length ? " · " + recrutamentoData.filter(r => r.status === 'em_andamento').length + " em andamento" : ""), [
                        React.createElement("button", {
                            key: "r",
                            type: "button",
                            onClick: carregarRecrutamento,
                            disabled: recrutamentoLoading,
                            title: "Atualizar",
                            "aria-label": "Atualizar",
                            className: OP_BTN_SEC + " !px-0 w-10"
                        }, _opIco("refresh", 16)),
                        React.createElement("button", {
                            key: "n",
                            type: "button",
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
                            className: OP_BTN_PRI
                        }, _opIco("plus", 15), "Nova necessidade")
                    ]),

                    // Progresso geral (faixa de KPIs)
                    recrutamentoStats && (() => {
                        const atr = parseInt(recrutamentoStats.total_motos_atribuidas) || 0;
                        const nec = parseInt(recrutamentoStats.total_motos_necessarias) || 0;
                        const pct = Math.round((atr / Math.max(1, nec || 1)) * 100);
                        return React.createElement("section", {className: "grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr]", style: { ...OP_CARD, overflow: "hidden" }},
                            _opKpi("Demandas", recrutamentoStats.total_necessidades || 0, "cadastradas"),
                            _opKpi("Em andamento", recrutamentoStats.em_andamento || 0, "recrutando", "#92400e"),
                            _opKpi("Concluídas", recrutamentoStats.concluidas || 0, "fechadas", "#166534"),
                            _opKpi("Motos atribuídas", React.createElement(React.Fragment, null, atr, React.createElement("span", { style: { fontSize: 15, color: "#9ca3af", fontWeight: 600 } }, " / " + nec)), null, null, true,
                                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginTop: 6 } }, _opBar(pct, pct >= 100 ? "#16a34a" : "#770fa8"), React.createElement("b", { style: { fontSize: 12, color: pct >= 100 ? "#166534" : "#5d0b85", fontVariantNumeric: "tabular-nums" } }, Math.min(100, pct) + "%")))
                        );
                    })(),

                    // Sub-abas
                    _opAbas([
                        { id: 'em_andamento', label: "Em andamento", n: recrutamentoData.filter(r => r.status === 'em_andamento').length },
                        { id: 'concluido', label: "Concluídas", n: recrutamentoData.filter(r => r.status === 'concluido').length },
                        { id: 'todos', label: "Todas", n: recrutamentoData.length }
                    ], recrutamentoSubTab, setRecrutamentoSubTab),

                    // Loading
                    recrutamentoLoading && _opCarregando("Carregando necessidades..."),

                    // Lista de necessidades
                    !recrutamentoLoading && React.createElement("div", {className: "space-y-3"},
                        (recrutamentoData
                            .filter(r => recrutamentoSubTab === 'todos' ? true : r.status === recrutamentoSubTab)
                            .length === 0) && _opVazio("Nenhuma necessidade encontrada", "Clique em \"Nova necessidade\" para cadastrar."),

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

                                // Painel de atribuição (titular / backup) — mesma lógica para os dois tipos
                                const painel = (tipo, titulo, qtd, atribuidos, progresso, corBarra) => {
                                    const chave = `${nec.id}_${tipo}`;
                                    const busca = recrutamentoCodBusca[chave];
                                    const completo = atribuidos >= qtd;
                                    return React.createElement("div", { style: { border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 } },
                                        React.createElement("div", { className: "flex justify-between items-center mb-2" },
                                            React.createElement("h4", { style: { margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" } }, titulo),
                                            React.createElement("span", { style: { fontSize: 12.5, fontWeight: 700, color: completo ? "#166534" : "#374151", fontVariantNumeric: "tabular-nums" } }, atribuidos, " / ", qtd)
                                        ),
                                        React.createElement("div", { style: { display: "flex", marginBottom: 10 } }, _opBar(Math.min(100, progresso), progresso === 100 ? "#16a34a" : corBarra, 4)),
                                        React.createElement("div", { className: "max-h-40 overflow-y-auto", style: { marginBottom: 8 } },
                                            (nec.atribuicoes?.filter(a => a.tipo === tipo) || []).map(attr =>
                                                React.createElement("div", { key: attr.id, style: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: "1px solid #f3f4f6" } },
                                                    _opAvatar(attr.nome_profissional || attr.cod_profissional, null, 26),
                                                    React.createElement("div", { style: { flex: 1, minWidth: 0, fontSize: 13 } },
                                                        React.createElement("span", { style: { fontWeight: 600, color: "#111827" } }, attr.nome_profissional || "Sem nome"),
                                                        React.createElement("span", { style: { fontFamily: OP_MONO, fontSize: 11.5, color: "#6b7280", marginLeft: 8 } }, attr.cod_profissional)
                                                    ),
                                                    React.createElement("button", { type: "button", onClick: () => removerAtribuicaoRecrutamento(attr.id), title: "Remover", "aria-label": "Remover " + (attr.nome_profissional || attr.cod_profissional), className: "inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-800" }, _opIco("x", 14))
                                                )
                                            )
                                        ),
                                        atribuidos < qtd && React.createElement("div", { className: "flex gap-2 items-start" },
                                            React.createElement("div", { className: "flex-1 min-w-0" },
                                                React.createElement("input", {
                                                    type: "text",
                                                    placeholder: "Código do motoboy",
                                                    "aria-label": "Código do motoboy (" + titulo.toLowerCase() + ")",
                                                    value: busca?.codigo || '',
                                                    onChange: (e) => {
                                                        const codigo = e.target.value;
                                                        setRecrutamentoCodBusca(prev => ({
                                                            ...prev,
                                                            [chave]: { ...prev[chave], codigo, nome: '', erro: '' }
                                                        }));
                                                        if (codigo.length >= 3) {
                                                            buscarProfissionalRecrutamento(nec.id, tipo, codigo);
                                                        }
                                                    },
                                                    className: OP_IN
                                                }),
                                                busca?.loading && React.createElement("p", { className: "text-xs text-gray-500 mt-1 mb-0" }, "Buscando..."),
                                                busca?.nome && React.createElement("p", { className: "text-xs text-green-800 mt-1 mb-0 inline-flex items-center gap-1" }, _opIco("check", 12, "#16a34a"), busca.nome),
                                                busca?.erro && React.createElement("p", { className: "text-xs text-red-800 mt-1 mb-0" }, busca.erro)
                                            ),
                                            React.createElement("button", {
                                                type: "button",
                                                onClick: () => atribuirProfissionalRecrutamento(nec.id, tipo),
                                                disabled: !busca?.nome,
                                                title: "Atribuir",
                                                "aria-label": "Atribuir motoboy",
                                                className: OP_BTN_PRI + " !h-[38px] !px-0 w-[38px]"
                                            }, _opIco("plus", 16))
                                        )
                                    );
                                };

                                const stPill = nec.status === 'concluido' ? _opPill("verde", "Concluído") : nec.status === 'cancelado' ? _opPill("vermelho", "Cancelado") : _opPill("ambar", "Em andamento");
                                const prazoPill = nec.status === 'concluido' ? null : _opPill(diasRestantes < 0 ? "vermelho" : diasRestantes <= 3 ? "ambar" : "cinza",
                                    diasRestantes < 0 ? `${Math.abs(diasRestantes)} dias atrasado` : diasRestantes === 0 ? 'Vence hoje' : diasRestantes === 1 ? 'Vence amanhã' : `${diasRestantes} dias restantes`, true);

                                return React.createElement("div", { key: nec.id, style: { ...OP_CARD, padding: 18 } },
                                    React.createElement("div", { className: "flex justify-between items-start gap-3 flex-wrap" },
                                        React.createElement("div", { style: { minWidth: 0 } },
                                            React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                                                React.createElement("h3", { style: { margin: 0, fontSize: 15, fontWeight: 600, color: "#111827" } }, nec.nome_cliente),
                                                stPill,
                                                prazoPill
                                            ),
                                            React.createElement("div", { className: "flex flex-wrap gap-x-4 gap-y-1 mt-1.5" },
                                                _opMeta("calendar", "Conclusão " + new Date(nec.data_conclusao?.split('T')[0] + "T12:00:00").toLocaleDateString('pt-BR')),
                                                _opMeta("users", "Criado por " + (nec.criado_por || '-') + " em " + new Date(nec.created_at).toLocaleDateString('pt-BR'))
                                            )
                                        ),
                                        React.createElement("div", { className: "flex gap-1.5" },
                                            React.createElement("button", {
                                                type: "button",
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
                                                title: "Editar",
                                                "aria-label": "Editar necessidade",
                                                className: OP_ICO_BTN
                                            }, _opIco("pencil", 15)),
                                            React.createElement("button", { type: "button", onClick: () => deletarRecrutamento(nec.id), title: "Excluir", "aria-label": "Excluir necessidade", className: OP_ICO_DEST }, _opIco("trash", 15))
                                        )
                                    ),

                                    // Progresso total do card (barra fina)
                                    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, margin: "14px 0 4px" } },
                                        React.createElement("span", { style: { fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" } }, "Progresso total"),
                                        _opBar(progressoTotal, progressoTotal === 100 ? "#16a34a" : "#770fa8"),
                                        React.createElement("b", { style: { fontSize: 12.5, width: 40, textAlign: "right", color: progressoTotal === 100 ? "#166534" : "#5d0b85", fontVariantNumeric: "tabular-nums" } }, progressoTotal, "%")
                                    ),

                                    // Observação
                                    nec.observacao && React.createElement("p", { style: { margin: "8px 0 0", fontSize: 13, color: "#6b7280" } }, nec.observacao),

                                    // Titulares e backups
                                    React.createElement("div", { className: "grid md:grid-cols-2 gap-3", style: { marginTop: 14 } },
                                        painel('titular', "Motos titulares", nec.quantidade_motos, motosAtribuidas, progressoMotos, "#770fa8"),
                                        nec.quantidade_backup > 0 && painel('backup', "Motos backup", nec.quantidade_backup, backupsAtribuidos, progressoBackups, "#2563eb"),
                                        nec.quantidade_backup === 0 && React.createElement("div", { style: { border: "1px dashed #e5e7eb", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#6b7280" } }, "Sem necessidade de backup")
                                    )
                                );
                            })
                    )
                ),

                // Modal de criar/editar necessidade — OPER_ABAS_V1
                recrutamentoModal && _opModal({
                    titulo: recrutamentoEdit ? "Editar necessidade" : "Nova necessidade de recrutamento",
                    sub: "Preencha os dados da necessidade de motos",
                    largura: 520,
                    onClose: () => { setRecrutamentoModal(false); setRecrutamentoEdit(null); },
                    corpo: React.createElement("div", { className: "space-y-4" },
                        React.createElement("div", null,
                            React.createElement("label", { htmlFor: "rec-cli", className: OP_LBL }, "Nome do cliente *"),
                            React.createElement("input", { id: "rec-cli", type: "text", value: recrutamentoForm.nome_cliente, onChange: (e) => setRecrutamentoForm(f => ({...f, nome_cliente: e.target.value})), placeholder: "Ex: Magazine Luiza", className: OP_IN })
                        ),
                        React.createElement("div", null,
                            React.createElement("label", { htmlFor: "rec-data", className: OP_LBL }, "Data de conclusão *"),
                            React.createElement("input", { id: "rec-data", type: "date", value: recrutamentoForm.data_conclusao, onChange: (e) => setRecrutamentoForm(f => ({...f, data_conclusao: e.target.value})), className: OP_IN })
                        ),
                        React.createElement("div", { className: "grid grid-cols-2 gap-4" },
                            React.createElement("div", null,
                                React.createElement("label", { htmlFor: "rec-qtd", className: OP_LBL }, "Quantidade de motos *"),
                                React.createElement("input", { id: "rec-qtd", type: "number", min: "1", value: recrutamentoForm.quantidade_motos, onChange: (e) => setRecrutamentoForm(f => ({...f, quantidade_motos: parseInt(e.target.value) || 1})), className: OP_IN })
                            ),
                            React.createElement("div", null,
                                React.createElement("label", { htmlFor: "rec-bkp", className: OP_LBL }, "Quantidade de backup"),
                                React.createElement("input", { id: "rec-bkp", type: "number", min: "0", value: recrutamentoForm.quantidade_backup, onChange: (e) => setRecrutamentoForm(f => ({...f, quantidade_backup: parseInt(e.target.value) || 0})), className: OP_IN })
                            )
                        ),
                        React.createElement("div", null,
                            React.createElement("label", { htmlFor: "rec-obs", className: OP_LBL }, "Observação (opcional)"),
                            React.createElement("textarea", { id: "rec-obs", value: recrutamentoForm.observacao, onChange: (e) => setRecrutamentoForm(f => ({...f, observacao: e.target.value})), placeholder: "Ex: Preferência por motoboys com experiência em delivery de documentos", rows: 3, className: OP_TXA })
                        )
                    ),
                    rodape: [
                        React.createElement("button", { key: "c", type: "button", onClick: () => { setRecrutamentoModal(false); setRecrutamentoEdit(null); }, className: OP_BTN_SEC }, "Cancelar"),
                        React.createElement("button", {
                            key: "s",
                            type: "button",
                            onClick: salvarRecrutamento,
                            disabled: !recrutamentoForm.nome_cliente || !recrutamentoForm.data_conclusao || !recrutamentoForm.quantidade_motos,
                            className: OP_BTN_PRI
                        }, recrutamentoEdit ? _opIco("save", 15) : _opIco("plus", 15), recrutamentoEdit ? "Salvar alterações" : "Criar necessidade")
                    ]
                })
            ),
            // ==================== CONTEÚDO LOCALIZAÇÃO CLIENTES ====================
            /* OPER_ABAS_V1 — Localização Clientes: filtros e tabela no padrão; Roteirizador vira a ação principal */
            p.opTab === "localizacao-clientes" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-4"},
                    _opCab("Localização de clientes", "Endereços de coleta (Ponto 1) dos clientes do BI" + (localizacaoClientes?.length ? " · " + localizacaoClientes.length + " clientes" : ""), [
                        React.createElement("button", {
                            key: "a",
                            type: "button",
                            onClick: carregarLocalizacaoClientes,
                            disabled: localizacaoLoading,
                            className: OP_BTN_SEC
                        }, _opIco("refresh", 15), localizacaoLoading ? "Carregando..." : "Atualizar"),
                        // BOTÃO DO ROTEIRIZADOR
                        React.createElement("button", {
                            key: "r",
                            type: "button",
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
                            className: OP_BTN_PRI
                        }, _opIco("map", 15), "Roteirizador")
                    ]),

                    // Lista | Mapa (segmentado)
                    React.createElement("div", { role: "tablist", style: { display: "inline-flex", padding: 3, gap: 2, borderRadius: 10, background: "#f3f4f6" } },
                        [["lista", "clipboard", "Lista"], ["mapa", "map", "Mapa"]].map(([id, ico, txt]) => React.createElement("button", {
                            key: id,
                            type: "button",
                            role: "tab",
                            "aria-selected": localizacaoSubTab === id ? "true" : "false",
                            onClick: id === 'mapa' ? () => {
                                setLocalizacaoSubTab('mapa');
                                setTimeout(() => window.initMapaClientes(localizacaoClientes), 100);
                            } : () => setLocalizacaoSubTab('lista'),
                            style: { display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 14px", borderRadius: 8, border: localizacaoSubTab === id ? "1px solid #e5e7eb" : "1px solid transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: localizacaoSubTab === id ? "#ffffff" : "transparent", color: localizacaoSubTab === id ? "#5d0b85" : "#6b7280" }
                        }, _opIco(ico, 14), txt))
                    ),

                    // Conteúdo da sub-aba Lista
                    localizacaoSubTab === 'lista' && React.createElement(React.Fragment, null,
                        // Barra de busca
                        React.createElement("div", { style: { ...OP_CARD, padding: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
                            React.createElement("div", { style: { position: "relative", flex: "1 1 260px" } },
                                React.createElement("span", { style: { position: "absolute", left: 11, top: 11, color: "#9ca3af", display: "inline-flex" } }, _opIco("search", 16)),
                                React.createElement("input", {
                                    type: "text",
                                    "aria-label": "Buscar cliente",
                                    value: localizacaoFiltro,
                                    onChange: e => setLocalizacaoFiltro(e.target.value),
                                    placeholder: "Buscar por código ou nome do cliente",
                                    className: OP_IN,
                                    style: { paddingLeft: 34 }
                                })
                            ),
                            localizacaoFiltro && React.createElement("button", {
                                type: "button",
                                onClick: () => setLocalizacaoFiltro(""),
                                className: OP_BTN_SEC + " !h-[38px]"
                            }, _opIco("x", 14), "Limpar")
                        ),

                        // Lista de clientes
                        localizacaoLoading
                            ? _opCarregando("Carregando dados dos clientes...")
                            : localizacaoClientes?.length === 0
                                ? _opVazio("Nenhum cliente encontrado", "Faça upload de dados no módulo BI para ver os clientes aqui.", React.createElement("button", { type: "button", onClick: carregarLocalizacaoClientes, className: OP_BTN_SEC }, _opIco("refresh", 15), "Atualizar"))
                                : (function() {
                                    const filtro = localizacaoFiltro.toLowerCase().trim();
                                    const clientesFiltrados = filtro
                                        ? localizacaoClientes.filter(c =>
                                            String(c.cod_cliente).toLowerCase().includes(filtro) ||
                                            (c.nome_cliente || "").toLowerCase().includes(filtro)
                                        )
                                        : localizacaoClientes;
                                    const TD = { padding: "10px 14px", verticalAlign: "top", borderTop: "1px solid #f3f4f6" };
                                    const th = (txt, dir, extra) => React.createElement("th", { style: Object.assign({ padding: "10px 14px", fontWeight: 600, fontSize: 12, color: "#6b7280", textAlign: dir ? "right" : "left", whiteSpace: "nowrap" }, extra || {}) }, txt);
                                    return clientesFiltrados.length === 0
                                        ? _opVazio("Nenhum cliente encontrado com \"" + localizacaoFiltro + "\"", "Confira o código ou o nome digitado.")
                                        : React.createElement("section", { style: { ...OP_CARD, overflow: "hidden" } },
                                            React.createElement("div", { style: { overflowX: "auto" } },
                                                React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#111827", minWidth: 860 } },
                                                    React.createElement("thead", null, React.createElement("tr", { style: { background: "#f9fafb" } },
                                                        th("Cliente", 0, { paddingLeft: 18 }), th("Endereço de coleta"), th("Entregas", 1), th("Coordenadas"), th("Waze", 1, { paddingRight: 18 }))),
                                                    React.createElement("tbody", null,
                                                        clientesFiltrados.map(cliente => {
                                                            const ends = cliente.enderecos || [];
                                                            const celCliente = (n) => React.createElement("td", { rowSpan: n, style: { ...TD, paddingLeft: 18, width: 260 } },
                                                                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                                                                    React.createElement("span", { style: { fontFamily: OP_MONO, fontSize: 12, fontWeight: 700, color: "#5d0b85" } }, cliente.cod_cliente),
                                                                    React.createElement("span", { style: { fontWeight: 600 } }, cliente.nome_cliente)),
                                                                cliente.centro_custo ? React.createElement("div", { style: { fontSize: 12, color: "#374151", marginTop: 3 } }, "Centro de custo: ", cliente.centro_custo) : null,
                                                                React.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 } }, ends.length, ends.length === 1 ? " endereço de coleta" : " endereços de coleta"));
                                                            if (ends.length === 0) return React.createElement("tr", { key: cliente.cod_cliente + (cliente.centro_custo || '') }, celCliente(1), React.createElement("td", { colSpan: 4, style: { ...TD, color: "#9ca3af" } }, "Sem endereços"));
                                                            return React.createElement(React.Fragment, { key: cliente.cod_cliente + (cliente.centro_custo || '') },
                                                                ends.map((end, idx) => React.createElement("tr", { key: idx },
                                                                    idx === 0 ? celCliente(ends.length) : null,
                                                                    React.createElement("td", { style: TD },
                                                                        React.createElement("div", { style: { fontWeight: 500 } }, end.endereco || "Sem endereço"),
                                                                        React.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 } }, [end.bairro, end.cidade, end.estado].filter(Boolean).join(" - ") || "Localização não especificada")),
                                                                    React.createElement("td", { style: { ...TD, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 } }, (end.total_entregas || 0).toLocaleString("pt-BR")),
                                                                    React.createElement("td", { style: TD }, end.latitude && end.longitude
                                                                        ? React.createElement("span", { title: end.latitude?.toFixed(4) + ", " + end.longitude?.toFixed(4) }, _opPill("verde", end.latitude?.toFixed(4) + ", " + end.longitude?.toFixed(4)))
                                                                        : _opPill("ambar", "Sem coordenadas")),
                                                                    React.createElement("td", { style: { ...TD, paddingRight: 18 } },
                                                                        React.createElement("div", { style: { display: "flex", gap: 6, justifyContent: "flex-end" } },
                                                                            React.createElement("a", {
                                                                                href: gerarLinkWaze(end.endereco + " " + (end.cidade || ""), end.latitude, end.longitude),
                                                                                target: "_blank",
                                                                                rel: "noopener noreferrer",
                                                                                className: OP_BTN_SEC_SM
                                                                            }, _opIco("car", 13), "Abrir"),
                                                                            React.createElement("button", {
                                                                                type: "button",
                                                                                onClick: () => copiarParaClipboard(
                                                                                    gerarLinkWaze(end.endereco + " " + (end.cidade || ""), end.latitude, end.longitude),
                                                                                    "Waze"
                                                                                ),
                                                                                title: "Copiar link do Waze",
                                                                                "aria-label": "Copiar link do Waze",
                                                                                className: OP_ICO_BTN
                                                                            }, _opIco("copy", 14))))
                                                                )));
                                                        })))));
                                })()
                    ),

                    // Conteúdo da sub-aba Mapa
                    localizacaoSubTab === 'mapa' && React.createElement("section", { style: { ...OP_CARD, overflow: "hidden" } },
                        // Legenda
                        React.createElement("div", { style: { padding: "12px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#6b7280" } },
                            React.createElement("span", { style: { fontWeight: 600, color: "#374151" } }, "Legenda"),
                            React.createElement("span", { className: "inline-flex items-center gap-1.5" }, _opIco("building", 14), "Clientes"),
                            React.createElement("span", { className: "inline-flex items-center gap-1.5" }, _opIco("star", 14), "Cliente 767")
                        ),
                        // Container do mapa
                        React.createElement("div", {
                            id: "mapa-clientes-leaflet",
                            style: { height: "500px", width: "100%" }
                        }),
                        // Info
                        React.createElement("div", { style: { padding: "10px 18px", borderTop: "1px solid #f3f4f6", fontSize: 12, color: "#6b7280", textAlign: "center" } },
                            "Clique em um marcador para ver detalhes e abrir no Waze"
                        )
                    )
                )
            ),
            // ==================== CONTEÚDO RELATÓRIO DIÁRIO ====================
            /* OPER_ABAS_V1 — Relatório Diário: feed de cards brancos (autor, título, data, texto, imagem) */
            p.opTab === "relatorio-diario" && React.createElement("div", {className: "max-w-7xl mx-auto p-6"},
                React.createElement("div", {className: "space-y-4"},
                    _opCab("Relatório diário", "Atividades e observações do dia registradas pela equipe" + (relatoriosDiarios?.length ? " · " + relatoriosDiarios.length + (relatoriosDiarios.length === 1 ? " relatório" : " relatórios") : ""),
                        React.createElement("button", { type: "button", onClick: abrirNovoRelatorio, className: OP_BTN_PRI }, _opIco("plus", 15), "Novo relatório")),

                    // Lista de relatórios
                    relatoriosLoading
                        ? _opCarregando("Carregando relatórios...")
                        : relatoriosDiarios?.length === 0
                            ? _opVazio("Nenhum relatório ainda", "Registre o que aconteceu no dia para a equipe acompanhar.", React.createElement("button", { type: "button", onClick: abrirNovoRelatorio, className: OP_BTN_PRI }, _opIco("plus", 15), "Criar primeiro relatório"))
                            : React.createElement("div", {className: "space-y-3"},
                                relatoriosDiarios.map(rel => React.createElement("article", {
                                    key: rel.id,
                                    style: { ...OP_CARD, overflow: "hidden" }
                                },
                                    // Autor + data + ações
                                    React.createElement("div", { style: { padding: "16px 18px 0", display: "flex", alignItems: "center", gap: 12 } },
                                        _opAvatar(rel.usuario_nome, rel.usuario_foto, 36),
                                        React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                                            React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "#111827" } }, rel.usuario_nome || "-"),
                                            React.createElement("div", { style: { fontSize: 12, color: "#6b7280", fontVariantNumeric: "tabular-nums" } },
                                                new Date(rel.created_at).toLocaleDateString('pt-BR', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })
                                            )
                                        ),
                                        React.createElement("div", { className: "flex gap-1.5" },
                                            React.createElement("button", { type: "button", onClick: () => abrirEditarRelatorio(rel), className: OP_ICO_BTN, title: "Editar", "aria-label": "Editar relatório" }, _opIco("pencil", 14)),
                                            React.createElement("button", { type: "button", onClick: () => excluirRelatorio(rel.id), className: OP_ICO_DEST, title: "Excluir", "aria-label": "Excluir relatório" }, _opIco("trash", 14))
                                        )
                                    ),
                                    // Conteúdo
                                    React.createElement("div", { style: { padding: "12px 18px 16px" } },
                                        React.createElement("h3", { style: { margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#111827" } }, rel.titulo),
                                        React.createElement("div", {
                                            className: "whitespace-pre-wrap",
                                            style: { fontSize: 13.5, lineHeight: 1.55, color: "#374151" },
                                            dangerouslySetInnerHTML: { __html: (rel.conteudo || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/_(.*?)_/g, '<em>$1</em>') }
                                        }),
                                        rel.imagem_url && React.createElement("button", { type: "button", onClick: () => setRelatorioImagemAmpliada(rel.imagem_url), "aria-label": "Ampliar imagem", style: { display: "block", marginTop: 12, padding: 0, border: 0, background: "transparent", cursor: "zoom-in" } },
                                            React.createElement("img", {
                                                src: rel.imagem_url,
                                                alt: "Imagem do relatório",
                                                className: "hover:opacity-90",
                                                style: { display: "block", maxWidth: "100%", width: 420, borderRadius: 10, border: "1px solid #e5e7eb" }
                                            })
                                        )
                                    ),
                                    // Visualizações
                                    React.createElement("div", { style: { padding: "10px 18px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
                                        _opMeta("eye", rel.visualizacoes && rel.visualizacoes.length > 0 ? rel.visualizacoes.length + (rel.visualizacoes.length === 1 ? " visualização" : " visualizações") : "Nenhuma visualização ainda"),
                                        rel.visualizacoes && rel.visualizacoes.length > 0 && React.createElement("div", { className: "flex items-center", style: { gap: 4 } },
                                            rel.visualizacoes.slice(0, 10).map((vis, idx) =>
                                                React.createElement("span", {
                                                    key: idx,
                                                    style: { display: "inline-flex" },
                                                    title: vis.usuario_nome + " - " + new Date(vis.visualizado_em).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})
                                                }, _opAvatar(vis.usuario_nome, vis.usuario_foto, 24))
                                            ),
                                            rel.visualizacoes.length > 10 && React.createElement("span", { style: { fontSize: 12, color: "#6b7280", marginLeft: 4 } }, "+", rel.visualizacoes.length - 10)
                                        )
                                    )
                                ))
                            )
                )
            ),
            // Modal de criar/editar relatório — OPER_ABAS_V1: modal limpo
            showRelatorioModal && _opModal({
                titulo: relatorioEdit ? "Editar relatório" : "Novo relatório",
                sub: (l.fullName || l.username) + " · " + new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                }),
                largura: 760,
                onBackdrop: (e) => { if (e.target === e.currentTarget) setShowRelatorioModal(false); },
                onClose: () => setShowRelatorioModal(false),
                corpoProps: { onKeyDown: (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); } },
                corpo: React.createElement("div", { className: "space-y-4" },
                    // Título
                    React.createElement("div", null,
                        React.createElement("label", { htmlFor: "relatorio-titulo", className: OP_LBL }, "Título *"),
                        React.createElement("input", {
                            id: "relatorio-titulo",
                            type: "text",
                            value: relatorioForm.titulo,
                            onChange: e => setRelatorioForm(prev => ({...prev, titulo: e.target.value})),
                            placeholder: "Ex: Relatório de entregas - Zona Norte",
                            className: OP_IN
                        })
                    ),
                    // Conteúdo + formatação
                    React.createElement("div", null,
                        React.createElement("div", { className: "flex items-center justify-between gap-2 mb-1.5" },
                            React.createElement("label", { htmlFor: "relatorio-conteudo", className: "text-xs font-semibold text-gray-700" }, "Conteúdo"),
                            React.createElement("div", { className: "flex gap-1" },
                                React.createElement("button", {
                                    type: "button",
                                    onClick: () => aplicarFormatacao('bold'),
                                    className: OP_ICO_BTN + " !w-7 !h-7 font-bold text-[13px]",
                                    title: "Negrito (selecione o texto primeiro)",
                                    "aria-label": "Negrito"
                                }, "B"),
                                React.createElement("button", {
                                    type: "button",
                                    onClick: () => aplicarFormatacao('italic'),
                                    className: OP_ICO_BTN + " !w-7 !h-7 italic text-[13px]",
                                    title: "Itálico (selecione o texto primeiro)",
                                    "aria-label": "Itálico"
                                }, "I")
                            )
                        ),
                        React.createElement("textarea", {
                            id: "relatorio-conteudo",
                            value: relatorioForm.conteudo,
                            onChange: e => setRelatorioForm(prev => ({...prev, conteudo: e.target.value})),
                            placeholder: "Descreva suas atividades, observações, ocorrências...\n\nDica: Use **texto** para negrito e _texto_ para itálico",
                            rows: 10,
                            className: OP_TXA + " resize-none"
                        })
                    ),
                    // Upload de imagem
                    React.createElement("div", null,
                        React.createElement("span", { className: OP_LBL }, "Imagem (opcional)"),
                        React.createElement("input", {
                            type: "file",
                            accept: "image/*",
                            onChange: e => setRelatorioForm(prev => ({...prev, imagem: e.target.files?.[0] || null})),
                            className: "hidden",
                            id: "relatorio-imagem"
                        }),
                        React.createElement("label", {
                            htmlFor: "relatorio-imagem",
                            className: "cursor-pointer flex items-center gap-3 border border-dashed border-gray-300 rounded-[12px] p-4 bg-gray-50 hover:border-gray-400"
                        },
                            React.createElement("span", { style: { color: "#9ca3af", display: "inline-flex" } }, _opIco(relatorioForm.imagem ? "link" : "camera", 20)),
                            relatorioForm.imagem
                                ? React.createElement("span", { className: "text-[13px]" },
                                    React.createElement("span", { className: "font-semibold text-gray-900" }, relatorioForm.imagem.name),
                                    React.createElement("span", { className: "text-gray-500" }, " · clique para trocar")
                                )
                                : React.createElement("span", { className: "text-[13px] text-gray-500" }, "Clique para selecionar uma imagem (PNG ou JPG até 5MB)")
                        )
                    )
                ),
                rodape: [
                    React.createElement("button", {
                        key: "c",
                        type: "button",
                        onClick: (e) => { e.preventDefault(); e.stopPropagation(); setShowRelatorioModal(false); },
                        className: OP_BTN_SEC
                    }, "Cancelar"),
                    React.createElement("button", {
                        key: "s",
                        type: "button",
                        onClick: (e) => { e.preventDefault(); e.stopPropagation(); salvarRelatorio(e); return false; },
                        disabled: !relatorioForm.titulo.trim(),
                        className: OP_BTN_PRI
                    }, relatorioEdit ? _opIco("save", 15) : _opIco("filetext", 15), relatorioEdit ? "Salvar alterações" : "Criar relatório")
                ]
            }),
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
                        "aria-label": "Fechar imagem",
                        className: "absolute -top-11 right-0 w-9 h-9 inline-flex items-center justify-center rounded-lg text-white hover:bg-white/10" /* OPER_ABAS_V1 */
                    }, React.createElement("svg", { className: "ico", style: { width: 20, height: 20 }, "aria-hidden": "true" }, React.createElement("use", { href: "#i-x" }))),
                    React.createElement("img", {
                        src: relatorioImagemAmpliada,
                        alt: "Imagem do relatório ampliada",
                        className: "max-w-full max-h-[85vh] rounded-[10px]",
                        onClick: (e) => e.stopPropagation()
                    })
                )
            )
        );
    };

    window.ModuloOperacionalLoaded = true;
    console.log("✅ Módulo Operacional carregado!");

})();
