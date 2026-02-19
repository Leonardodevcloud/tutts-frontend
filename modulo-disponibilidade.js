// ==================== MÓDULO DISPONIBILIDADE ====================
// Arquivo: modulo-disponibilidade.js
// Conteúdo do módulo Disponibilidade - Carregado dinamicamente

(function() {
    'use strict';

    // ── Componente de input de código com estado local ──────────────────────
    // Evita o bug de cursor/dígito fantasma causado pelo re-render do async c()
    const CodInput = ({ rowId, initialValue, onCommit, lojaId, rowClass, "data-cod-input": dataCodInput }) => {
        const [val, setVal] = React.useState(initialValue || "");

        // Sincroniza se o valor externo mudar (ex: limpar linha)
        React.useEffect(() => {
            setVal(initialValue || "");
        }, [initialValue]);

        return React.createElement("input", {
            type: "text",
            value: val,
            onChange: e => setVal(e.target.value),          // ← só estado local, sem re-render do pai
            onBlur: () => onCommit(rowId, "cod_profissional", val),  // ← dispara a lógica async só no blur
            onKeyDown: e => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const all = document.querySelectorAll(`[data-loja-id="${lojaId}"] input[data-cod-input]`);
                    const idx = Array.from(all).findIndex(el => el === e.target);
                    const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
                    if (next >= 0 && next < all.length) { all[next].focus(); all[next].select(); }
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    onCommit(rowId, "cod_profissional", val);   // ← salva ao pressionar Enter
                    const all = document.querySelectorAll(`[data-loja-id="${lojaId}"] input[data-cod-input]`);
                    const idx = Array.from(all).findIndex(el => el === e.target);
                    if (idx + 1 < all.length) { all[idx + 1].focus(); all[idx + 1].select(); }
                }
            },
            "data-cod-input": dataCodInput,
            placeholder: "...",
            className: "w-full px-1 py-0.5 border border-gray-200 rounded text-center font-mono text-xs " + rowClass
        });
    };

    window.ModuloDisponibilidadeContent = function(props) {
        const {
            // Estado e setters
            p, x, 
            // Funções de toast e loading
            ja,
            // API
            API_URL,
            // Dados de profissionais
            pe, Ta,
            // Usuários
            A, l,
            // Auth
            fetchAuth
        } = props;

        // ===== CÓDIGO DO MÓDULO DISPONIBILIDADE =====
        // Fallback: se fetchAuth não vier nas props, usa fetch normal
        const _fetch = fetchAuth || fetch;
                    const e = p.dispData || {
                    regioes: [],
                    lojas: [],
                    linhas: []
                },
                t = p.dispSubTab || "panorama",
                a = p.dispLoading,
                r = async () => {
                    try {
                        x(e => ({
                            ...e,
                            dispLoading: !0
                        }));
                        const e = await _fetch(`${API_URL}/disponibilidade`);
                        if (!e.ok) throw new Error("Erro ao carregar");
                        const t = await e.json();
                        x(e => ({
                            ...e,
                            dispData: t,
                            dispLoading: !1,
                            dispLoaded: !0
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar disponibilidade:", e), ja("Erro ao carregar dados", "error"), x(e => ({
                            ...e,
                            dispLoading: !1,
                            dispLoaded: !0
                        }))
                    }
                };
            p.dispLoaded || a || (r(), 0 === pe.length && Ta());
            const o = async () => {
                const e = p.novaRegiao?.trim();
                if (e) try {
                    const t = await _fetch(`${API_URL}/disponibilidade/regioes`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            nome: e
                        })
                    });
                    if (!t.ok) {
                        const e = await t.json();
                        throw new Error(e.error || "Erro ao criar")
                    }
                    x(e => ({
                        ...e,
                        novaRegiao: ""
                    })), ja(`✅ Região "${e}" adicionada!`, "success"), r()
                } catch (e) {
                    ja(e.message, "error")
                } else ja("Digite o nome da região", "error")
            }, c = async (t, a, l) => {
                const r = [...e.linhas || []],
                    o = r.findIndex(e => e.id === t);
                if (-1 === o) return;
                const c = r[o];
                if ("cod_profissional" === a && l && "" !== l.trim()) try {
                    const e = await _fetch(`${API_URL}/disponibilidade/restricoes/verificar?cod_profissional=${l}&loja_id=${c.loja_id}`),
                        t = await e.json();
                    if (t.restrito) {
                        const e = t.todas_lojas ? "TODAS AS LOJAS" : `loja ${t.loja_codigo} - ${t.loja_nome}`;
                        return void alert(`🚫 MOTOBOY RESTRITO!\n\nCódigo: ${l}\nRestrito em: ${e}\n\nMotivo: ${t.motivo}\n\nEste motoboy não pode ser inserido nesta loja.`)
                    }
                } catch (e) {
                    console.error("Erro ao verificar restrição:", e)
                }
                r[o] = {
                    ...r[o],
                    [a]: l
                };
                let s = r[o].nome_profissional;
                if ("cod_profissional" === a)
                    if (l && "" !== l.trim()) {
                        if (l.length >= 1) {
                            const e = pe.find(e => e.codigo === l.toString());
                            if (e) s = e.nome, r[o].nome_profissional = e.nome;
                            else {
                                const e = A.find(e => e.codProfissional?.toLowerCase() === l.toLowerCase());
                                e ? (s = e.fullName, r[o].nome_profissional = e.fullName) : (s = "", r[o].nome_profissional = "")
                            }
                        }
                    } else s = "", r[o].nome_profissional = "";
                x(t => ({
                    ...t,
                    dispData: {
                        ...e,
                        linhas: r
                    }
                })), clearTimeout(window.dispDebounce), window.dispDebounce = setTimeout(async () => {
                    try {
                        const usuarioLogado = JSON.parse(sessionStorage.getItem("tutts_user") || "{}");
                        await _fetch(`${API_URL}/disponibilidade/linhas/${t}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                cod_profissional: r[o].cod_profissional || null,
                                nome_profissional: "cod_profissional" === a ? s || null : r[o].nome_profissional || null,
                                status: r[o].status,
                                observacao: r[o].observacao,
                                observacao_usuario: usuarioLogado?.fullName || "Sistema"
                            })
                        })
                    } catch (e) {
                        console.error("Erro ao salvar linha:", e)
                    }
                }, 500)
            }, s = async (e, t, a = !1) => {
                try {
                    await _fetch(`${API_URL}/disponibilidade/linhas`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            loja_id: e,
                            quantidade: t,
                            is_excedente: a
                        })
                    }), ja(`✅ ${t} ${a?"excedente(s)":"titular(es)"} adicionado(s)!`, "success"), r()
                } catch (e) {
                    ja("Erro ao adicionar linhas", "error")
                }
            }, n = {
                "A CONFIRMAR": "bg-yellow-100 text-yellow-800 border-yellow-300",
                CONFIRMADO: "bg-green-100 text-green-800 border-green-300",
                "A CAMINHO": "bg-orange-100 text-orange-800 border-orange-300",
                "EM LOJA": "bg-blue-100 text-blue-800 border-blue-300",
                FALTANDO: "bg-red-100 text-red-800 border-red-300",
                "SEM CONTATO": "bg-gray-100 text-gray-800 border-gray-300"
            }, m = {
                "A CONFIRMAR": "bg-yellow-50",
                CONFIRMADO: "bg-green-50",
                "A CAMINHO": "bg-orange-50",
                "EM LOJA": "bg-blue-50",
                FALTANDO: "bg-red-50",
                "SEM CONTATO": "bg-gray-50"
            };
            return a ? React.createElement("div", {
                className: "flex items-center justify-center py-12"
            }, React.createElement("div", {
                className: "text-center"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"
            }), React.createElement("p", {
                className: "mt-4 text-gray-600"
            }, "Carregando..."))) : React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "flex items-center justify-end gap-2 text-xs text-gray-500"
            }, React.createElement("span", {
                className: "flex items-center gap-1"
            }, React.createElement("span", {
                className: "w-2 h-2 bg-green-500 rounded-full animate-pulse"
            }), "Sincronização automática ativa (10s)")), React.createElement("div", {
                className: "bg-white rounded-xl shadow"
            }, React.createElement("div", {
                className: "flex border-b overflow-x-auto"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    dispSubTab: "panorama"
                }),
                className: "px-3 py-2 font-semibold text-sm whitespace-nowrap " + ("panorama" === t ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50" : "text-gray-600")
            }, "📊 Panorama"), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    dispSubTab: "principal"
                }),
                className: "px-3 py-2 font-semibold text-sm whitespace-nowrap " + ("principal" === t ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50" : "text-gray-600")
            }, "📋 Painel"), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        dispSubTab: "faltosos"
                    }));
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/faltosos`),
                            t = await e.json();
                        x(e => ({
                            ...e,
                            faltososLista: t
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar faltosos:", e)
                    }
                },
                className: "px-3 py-2 font-semibold text-sm whitespace-nowrap " + ("faltosos" === t ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50" : "text-gray-600")
            }, "⚠️ Faltosos"), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        dispSubTab: "espelho"
                    }));
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/espelho`),
                            t = await e.json();
                        x(e => ({
                            ...e,
                            espelhoDatas: t
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar datas espelho:", e)
                    }
                },
                className: "px-3 py-2 font-semibold text-sm whitespace-nowrap " + ("espelho" === t ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50" : "text-gray-600")
            }, "🪞 Espelho"), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        dispSubTab: "relatorios",
                        relatoriosLoading: !0
                    }));
                    try {
                        const [e, t, a, l, r] = await Promise.all([_fetch(`${API_URL}/disponibilidade/relatorios/metricas`).then(e => e.json()).catch(() => []), _fetch(`${API_URL}/disponibilidade/relatorios/ranking-lojas`).then(e => e.json()).catch(() => []), _fetch(`${API_URL}/disponibilidade/relatorios/ranking-faltosos`).then(e => e.json()).catch(() => []), _fetch(`${API_URL}/disponibilidade/relatorios/comparativo`).then(e => e.json()).catch(() => ({})), _fetch(`${API_URL}/disponibilidade/relatorios/heatmap`).then(e => e.json()).catch(() => ({
                            diasSemana: [],
                            lojas: []
                        }))]);
                        x(o => ({
                            ...o,
                            relatoriosData: {
                                metricas: Array.isArray(e) ? e : [],
                                rankingLojas: Array.isArray(t) ? t : [],
                                rankingFaltosos: Array.isArray(a) ? a : [],
                                comparativo: l || {},
                                heatmap: r || {
                                    diasSemana: [],
                                    lojas: []
                                }
                            },
                            relatoriosLoading: !1
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar relatórios:", e), x(e => ({
                            ...e,
                            relatoriosLoading: !1,
                            relatoriosData: {
                                metricas: [],
                                rankingLojas: [],
                                rankingFaltosos: [],
                                comparativo: {},
                                heatmap: {
                                    diasSemana: [],
                                    lojas: []
                                }
                            }
                        }))
                    }
                },
                className: "px-3 py-2 font-semibold text-sm whitespace-nowrap " + ("relatorios" === t ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50" : "text-gray-600")
            }, "📈 Relatórios"), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        dispSubTab: "motoboys",
                        motoboysBusca: "",
                        motoboysLojaFiltro: "",
                        motoboysDias: 30,
                        motoboysList: null,
                        motoboysLoading: !0
                    }));
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/motoboys?dias=30`),
                            t = await e.json();
                        x(e => ({
                            ...e,
                            motoboysList: t,
                            motoboysLoading: !1
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar motoboys:", e), x(e => ({
                            ...e,
                            motoboysLoading: !1
                        }))
                    }
                },
                className: "px-3 py-2 font-semibold text-sm whitespace-nowrap " + ("motoboys" === t ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50" : "text-gray-600")
            }, "🏍️ Motoboys"), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        dispSubTab: "restricoes",
                        restricoesLoading: !0
                    }));
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/restricoes`),
                            t = await e.json();
                        x(e => ({
                            ...e,
                            restricoesList: t,
                            restricoesLoading: !1
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar restrições:", e), x(e => ({
                            ...e,
                            restricoesLoading: !1
                        }))
                    }
                },
                className: "px-3 py-2 font-semibold text-sm whitespace-nowrap " + ("restricoes" === t ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50" : "text-gray-600")
            }, "🚫 Restrições"), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    dispSubTab: "config"
                }),
                className: "px-3 py-2 font-semibold text-sm whitespace-nowrap " + ("config" === t ? "text-purple-700 border-b-2 border-purple-600 bg-purple-50" : "text-gray-600")
            }, "⚙️ Config"))), "panorama" === t && React.createElement("div", null, React.createElement("div", {
                className: "bg-gray-800 text-white px-2 py-1.5 flex justify-between items-center text-[10px] flex-wrap gap-1"
            }, React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("span", {
                className: "font-bold"
            }, "PANORAMA DIÁRIO"), (() => {
                const t = e.linhas || [],
                    a = t.filter(e => !e.is_excedente && !e.is_reposicao).length,
                    l = t.filter(e => "EM LOJA" === e.status).length,
                    r = (t.filter(e => ["A CAMINHO", "CONFIRMADO", "EM LOJA"].includes(e.status)).length, Math.max(0, a - l)),
                    o = a > 0 ? Math.min(l / a * 100, 100).toFixed(0) : 0;
                return React.createElement("div", {
                    className: "flex items-center gap-2"
                }, React.createElement("span", {
                    className: "px-2 py-0.5 rounded text-xs font-bold " + (o >= 80 ? "bg-green-500" : o >= 50 ? "bg-yellow-500 text-black" : "bg-red-500")
                }, o, "% GERAL"), r > 0 && React.createElement("span", {
                    className: "px-2 py-0.5 rounded text-xs font-bold bg-red-600 animate-pulse"
                }, "⚠️ FALTAM ", r, " P/ 100%"))
            })()), React.createElement("div", {
                className: "flex items-center gap-1 flex-wrap"
            }, React.createElement("span", {
                className: "text-gray-400 text-[9px]"
            }, "Atualizado: ", (new Date).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
            })), React.createElement("select", {
                value: p.panoramaOrdem || "regiao",
                onChange: e => x({
                    ...p,
                    panoramaOrdem: e.target.value
                }),
                className: "px-1 py-0 bg-gray-700 border border-gray-600 rounded text-[9px]"
            }, React.createElement("option", {
                value: "regiao"
            }, "Por Região"), React.createElement("option", {
                value: "pior"
            }, "Pior → Melhor"), React.createElement("option", {
                value: "melhor"
            }, "Melhor → Pior"), React.createElement("option", {
                value: "alfa"
            }, "A → Z")), React.createElement("input", {
                type: "date",
                value: p.dispDataPlanilha || (new Date).toISOString().split("T")[0],
                onChange: e => x({
                    ...p,
                    dispDataPlanilha: e.target.value
                }),
                className: "px-1 py-0 border border-gray-600 rounded text-[10px] text-white bg-gray-700"
            }), React.createElement("button", {
                onClick: r,
                className: "px-1.5 py-0.5 bg-gray-700 text-white rounded hover:bg-gray-600 text-[10px]"
            }, "🔄"), React.createElement("button", {
                onClick: () => {
                    navigator.clipboard.writeText(`${API_URL}/disponibilidade/publico`), ja("✅ Link copiado!", "success")
                },
                className: "px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-[10px]",
                title: "Copiar link público (somente leitura)"
            }, "🔗 Link Público"))), React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                id: "panorama-table",
                style: {
                    fontSize: "9px",
                    borderCollapse: "collapse",
                    width: "100%"
                }
            }, React.createElement("thead", null, React.createElement("tr", {
                style: {
                    backgroundColor: "#f8fafc",
                    borderBottom: "2px solid #e2e8f0"
                }
            }, React.createElement("th", {
                style: {
                    padding: "4px 6px",
                    border: "1px solid #e2e8f0",
                    textAlign: "left",
                    fontWeight: "600",
                    color: "#475569"
                }
            }, "LOJAS"), React.createElement("th", {
                style: {
                    padding: "4px 4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: "600",
                    color: "#475569",
                    whiteSpace: "nowrap"
                }
            }, "A CAMINHO"), React.createElement("th", {
                style: {
                    padding: "4px 4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: "600",
                    color: "#475569"
                }
            }, "CONFIR."), React.createElement("th", {
                style: {
                    padding: "4px 4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: "600",
                    color: "#475569",
                    whiteSpace: "nowrap"
                }
            }, "EM LOJA"), React.createElement("th", {
                style: {
                    padding: "4px 4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: "600",
                    color: "#475569"
                }
            }, "IDEAL"), React.createElement("th", {
                style: {
                    padding: "4px 4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: "600",
                    color: "#475569"
                }
            }, "FALTA"), React.createElement("th", {
                style: {
                    padding: "4px 4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: "600",
                    color: "#475569",
                    whiteSpace: "nowrap"
                }
            }, "S/ CONTATO"), React.createElement("th", {
                style: {
                    padding: "4px 4px",
                    border: "1px solid #e2e8f0",
                    fontWeight: "600",
                    color: "#475569"
                }
            }, "%"))), React.createElement("tbody", null, (() => {
                const t = p.panoramaOrdem || "regiao",
                    a = e.regioes || [],
                    l = e.lojas || [],
                    r = e.linhas || [],
                    o = l.map(e => {
                        const t = r.filter(t => t.loja_id === e.id),
                            l = t.filter(e => !e.is_excedente && !e.is_reposicao).length,
                            o = t.filter(e => "A CAMINHO" === e.status).length,
                            c = t.filter(e => "CONFIRMADO" === e.status).length,
                            s = t.filter(e => "EM LOJA" === e.status).length,
                            n = t.filter(e => "SEM CONTATO" === e.status).length,
                            m = o + c + s,
                            i = Math.max(0, l - m),
                            d = l > 0 ? Math.min(s / l * 100, 100) : 0,
                            p = a.find(t => t.id === e.regiao_id);
                        return {
                            ...e,
                            titulares: l,
                            aCaminho: o,
                            confirmado: c,
                            emLoja: s,
                            semContato: n,
                            emOperacao: m,
                            falta: i,
                            perc: d,
                            regiao: p
                        }
                    });
                let c = {
                    aCaminho: 0,
                    confirmado: 0,
                    emLoja: 0,
                    titulares: 0,
                    falta: 0,
                    semContato: 0,
                    emOperacao: 0
                };
                o.forEach(e => {
                    c.aCaminho += e.aCaminho, c.confirmado += e.confirmado, c.emLoja += e.emLoja, c.titulares += e.titulares, c.falta += e.falta, c.semContato += e.semContato, c.emOperacao += e.emOperacao
                });
                const s = c.titulares > 0 ? Math.min(c.emLoja / c.titulares * 100, 100) : 0;
                return "pior" === t ? o.sort((e, t) => e.perc - t.perc) : "melhor" === t ? o.sort((e, t) => t.perc - e.perc) : "alfa" === t && o.sort((e, t) => e.nome.localeCompare(t.nome)), "regiao" === t ? React.createElement(React.Fragment, null, a.map(e => {
                    const t = o.filter(t => t.regiao_id === e.id);
                    return 0 === t.length ? null : React.createElement(React.Fragment, {
                        key: e.id
                    }, React.createElement("tr", null, React.createElement("td", {
                        colSpan: "8",
                        style: {
                            padding: "4px 6px",
                            border: "1px solid #cbd5e1",
                            backgroundColor: "#e2e8f0",
                            fontWeight: "700",
                            color: "#1e293b",
                            fontSize: "9px",
                            textAlign: "center"
                        }
                    }, e.nome, e.gestores ? ` (${e.gestores})` : "")), t.map(e => React.createElement("tr", {
                        key: e.id,
                        style: {
                            backgroundColor: e.perc < 50 ? "#fef2f2" : "white"
                        }
                    }, React.createElement("td", {
                        style: {
                            padding: "2px 6px",
                            border: "1px solid #e2e8f0",
                            backgroundColor: e.perc < 50 ? "#fef2f2" : "#fafafa",
                            fontWeight: "500",
                            whiteSpace: "nowrap"
                        }
                    }, e.perc < 50 && React.createElement("span", {
                        style: {
                            color: "#ef4444",
                            marginRight: "2px"
                        }
                    }, "🔴"), e.nome), React.createElement("td", {
                        style: {
                            padding: "2px 4px",
                            border: "1px solid #e2e8f0",
                            textAlign: "center",
                            fontWeight: "500",
                            color: e.aCaminho > 0 ? "#ea580c" : "#cbd5e1"
                        }
                    }, e.aCaminho), React.createElement("td", {
                        style: {
                            padding: "2px 4px",
                            border: "1px solid #e2e8f0",
                            textAlign: "center",
                            fontWeight: "500",
                            color: e.confirmado > 0 ? "#16a34a" : "#cbd5e1"
                        }
                    }, e.confirmado), React.createElement("td", {
                        style: {
                            padding: "2px 4px",
                            border: "1px solid #e2e8f0",
                            textAlign: "center",
                            fontWeight: "700",
                            color: e.emLoja > 0 ? "#2563eb" : "#cbd5e1"
                        }
                    }, e.emLoja), React.createElement("td", {
                        style: {
                            padding: "2px 4px",
                            border: "1px solid #e2e8f0",
                            textAlign: "center",
                            fontWeight: "500",
                            color: "#64748b"
                        }
                    }, e.titulares), React.createElement("td", {
                        style: {
                            padding: "2px 4px",
                            border: "1px solid #e2e8f0",
                            textAlign: "center",
                            fontWeight: "600",
                            color: e.falta > 0 ? "#dc2626" : "#cbd5e1"
                        }
                    }, e.falta > 0 ? -e.falta : 0), React.createElement("td", {
                        style: {
                            padding: "2px 4px",
                            border: "1px solid #e2e8f0",
                            textAlign: "center",
                            fontWeight: "500",
                            color: e.semContato > 0 ? "#d97706" : "#cbd5e1"
                        }
                    }, e.semContato), React.createElement("td", {
                        style: {
                            padding: "2px 4px",
                            border: "1px solid #e2e8f0",
                            textAlign: "center",
                            fontWeight: "700",
                            backgroundColor: e.perc < 50 ? "#fecaca" : e.perc < 80 ? "#fde68a" : e.perc >= 100 ? "#bbf7d0" : "#f1f5f9",
                            color: e.perc < 50 ? "#b91c1c" : e.perc < 80 ? "#a16207" : e.perc >= 100 ? "#15803d" : "#475569"
                        }
                    }, e.perc.toFixed(0), "%"))))
                }), React.createElement("tr", {
                    style: {
                        backgroundColor: "#f8fafc",
                        borderTop: "2px solid #cbd5e1"
                    }
                }, React.createElement("td", {
                    style: {
                        padding: "4px 6px",
                        border: "1px solid #e2e8f0",
                        fontWeight: "700",
                        fontSize: "9px",
                        color: "#1e293b"
                    }
                }, "TOTAL GERAL"), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "#ea580c"
                    }
                }, c.aCaminho), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "#16a34a"
                    }
                }, c.confirmado), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "#2563eb"
                    }
                }, c.emLoja), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "#64748b"
                    }
                }, c.titulares), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "700",
                        color: c.falta > 0 ? "#dc2626" : "#cbd5e1"
                    }
                }, c.falta > 0 ? -c.falta : 0), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: c.semContato > 0 ? "#d97706" : "#cbd5e1"
                    }
                }, c.semContato), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "800",
                        backgroundColor: s < 50 ? "#fecaca" : s < 80 ? "#fde68a" : s >= 100 ? "#bbf7d0" : "#f1f5f9",
                        color: s < 50 ? "#b91c1c" : s < 80 ? "#a16207" : s >= 100 ? "#15803d" : "#475569"
                    }
                }, s.toFixed(0), "%"))) : React.createElement(React.Fragment, null, o.map((e, t) => React.createElement("tr", {
                    key: e.id,
                    style: {
                        backgroundColor: e.perc < 50 ? "#fef2f2" : "white"
                    }
                }, React.createElement("td", {
                    style: {
                        padding: "2px 6px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: e.perc < 50 ? "#fef2f2" : "#fafafa",
                        fontWeight: "500",
                        whiteSpace: "nowrap"
                    }
                }, React.createElement("span", {
                    style: {
                        color: "#94a3b8",
                        fontSize: "8px",
                        marginRight: "3px"
                    }
                }, t + 1, "."), e.perc < 50 && React.createElement("span", {
                    style: {
                        color: "#ef4444",
                        marginRight: "2px"
                    }
                }, "🔴"), e.nome, React.createElement("span", {
                    style: {
                        color: "#94a3b8",
                        fontSize: "7px",
                        marginLeft: "3px"
                    }
                }, "(", e.regiao?.nome || "", ")")), React.createElement("td", {
                    style: {
                        padding: "2px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "500",
                        color: e.aCaminho > 0 ? "#ea580c" : "#cbd5e1"
                    }
                }, e.aCaminho), React.createElement("td", {
                    style: {
                        padding: "2px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "500",
                        color: e.confirmado > 0 ? "#16a34a" : "#cbd5e1"
                    }
                }, e.confirmado), React.createElement("td", {
                    style: {
                        padding: "2px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "700",
                        color: e.emLoja > 0 ? "#2563eb" : "#cbd5e1"
                    }
                }, e.emLoja), React.createElement("td", {
                    style: {
                        padding: "2px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "500",
                        color: "#64748b"
                    }
                }, e.titulares), React.createElement("td", {
                    style: {
                        padding: "2px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: e.falta > 0 ? "#dc2626" : "#cbd5e1"
                    }
                }, e.falta > 0 ? -e.falta : 0), React.createElement("td", {
                    style: {
                        padding: "2px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "500",
                        color: e.semContato > 0 ? "#d97706" : "#cbd5e1"
                    }
                }, e.semContato), React.createElement("td", {
                    style: {
                        padding: "2px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "700",
                        backgroundColor: e.perc < 50 ? "#fecaca" : e.perc < 80 ? "#fde68a" : e.perc >= 100 ? "#bbf7d0" : "#f1f5f9",
                        color: e.perc < 50 ? "#b91c1c" : e.perc < 80 ? "#a16207" : e.perc >= 100 ? "#15803d" : "#475569"
                    }
                }, e.perc.toFixed(0), "%"))), React.createElement("tr", {
                    style: {
                        backgroundColor: "#f8fafc",
                        borderTop: "2px solid #cbd5e1"
                    }
                }, React.createElement("td", {
                    style: {
                        padding: "4px 6px",
                        border: "1px solid #e2e8f0",
                        fontWeight: "700",
                        fontSize: "9px",
                        color: "#1e293b"
                    }
                }, "TOTAL GERAL"), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "#ea580c"
                    }
                }, c.aCaminho), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "#16a34a"
                    }
                }, c.confirmado), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "#2563eb"
                    }
                }, c.emLoja), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "#64748b"
                    }
                }, c.titulares), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "700",
                        color: c.falta > 0 ? "#dc2626" : "#cbd5e1"
                    }
                }, c.falta > 0 ? -c.falta : 0), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "600",
                        color: c.semContato > 0 ? "#d97706" : "#cbd5e1"
                    }
                }, c.semContato), React.createElement("td", {
                    style: {
                        padding: "3px 4px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        fontWeight: "800",
                        backgroundColor: s < 50 ? "#fecaca" : s < 80 ? "#fde68a" : s >= 100 ? "#bbf7d0" : "#f1f5f9",
                        color: s < 50 ? "#b91c1c" : s < 80 ? "#a16207" : s >= 100 ? "#15803d" : "#475569"
                    }
                }, s.toFixed(0), "%")))
            })())))), "relatorios" === t && React.createElement("div", {
                className: "space-y-4"
            }, p.relatoriosLoading ? React.createElement("div", {
                className: "flex items-center justify-center py-12"
            }, React.createElement("div", {
                className: "text-center"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"
            }), React.createElement("p", {
                className: "mt-4 text-gray-600"
            }, "Carregando relatórios..."))) : React.createElement(React.Fragment, null, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, "📊 Comparativo"), React.createElement("div", {
                className: "grid grid-cols-3 gap-4"
            }, [{
                key: "hoje",
                data: p.relatoriosData?.comparativo?.hoje,
                color: "blue"
            }, {
                key: "ontem",
                data: p.relatoriosData?.comparativo?.ontem,
                color: "gray"
            }, {
                key: "semanaPassada",
                data: p.relatoriosData?.comparativo?.semanaPassada,
                color: "purple"
            }].map(e => {
                const t = (p.relatoriosData?.comparativo?.labels || {})[e.key] || ("hoje" === e.key ? "MAIS RECENTE" : "ontem" === e.key ? "ANTERIOR" : "3º ANTERIOR");
                return React.createElement("div", {
                    key: e.key,
                    className: `p-4 rounded-lg bg-${e.color}-50 border border-${e.color}-200`
                }, React.createElement("h4", {
                    className: `font-bold text-${e.color}-800 text-center mb-2`
                }, t), e.data ? React.createElement("div", {
                    className: "space-y-1 text-sm"
                }, React.createElement("div", {
                    className: "flex justify-between"
                }, React.createElement("span", null, "% EM LOJA:"), React.createElement("span", {
                    className: "font-bold " + (e.data.perc >= 80 ? "text-green-600" : e.data.perc >= 50 ? "text-yellow-600" : "text-red-600")
                }, e.data.perc, "%")), React.createElement("div", {
                    className: "flex justify-between"
                }, React.createElement("span", null, "Em Loja:"), React.createElement("span", {
                    className: "font-bold text-blue-600"
                }, e.data.emLoja || 0)), React.createElement("div", {
                    className: "flex justify-between"
                }, React.createElement("span", null, "Titulares:"), React.createElement("span", {
                    className: "font-bold"
                }, e.data.titulares || 0)), React.createElement("div", {
                    className: "flex justify-between"
                }, React.createElement("span", null, "Faltando:"), React.createElement("span", {
                    className: "font-bold text-red-600"
                }, e.data.faltando || 0)), React.createElement("div", {
                    className: "flex justify-between"
                }, React.createElement("span", null, "Sem Contato:"), React.createElement("span", {
                    className: "font-bold text-orange-600"
                }, e.data.semContato || 0))) : React.createElement("p", {
                    className: "text-gray-400 text-center text-sm"
                }, "Sem dados"))
            })), p.relatoriosData?.comparativo?.hoje && p.relatoriosData?.comparativo?.ontem && React.createElement("div", {
                className: "mt-3 flex justify-center gap-4 text-sm"
            }, React.createElement("span", {
                className: "px-3 py-1 rounded-full bg-gray-100"
            }, "vs Ontem:", React.createElement("span", {
                className: "ml-1 font-bold " + (p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.ontem.perc >= 0 ? "text-green-600" : "text-red-600")
            }, p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.ontem.perc >= 0 ? "+" : "", (p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.ontem.perc).toFixed(1), "%")), p.relatoriosData?.comparativo?.semanaPassada && React.createElement("span", {
                className: "px-3 py-1 rounded-full bg-gray-100"
            }, "vs Semana:", React.createElement("span", {
                className: "ml-1 font-bold " + (p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.semanaPassada.perc >= 0 ? "text-green-600" : "text-red-600")
            }, p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.semanaPassada.perc >= 0 ? "+" : "", (p.relatoriosData.comparativo.hoje.perc - p.relatoriosData.comparativo.semanaPassada.perc).toFixed(1), "%")))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, "📈 Evolução % EM LOJA (7 dias)"), (() => {
                const e = Array.isArray(p.relatoriosData?.metricas) ? p.relatoriosData.metricas : [];
                return 0 === e.length ? React.createElement("p", {
                    className: "text-gray-400 text-center py-8"
                }, "Sem dados históricos. Salve espelhos diários para ver o gráfico.") : React.createElement("div", {
                    className: "h-48 flex items-end gap-2 justify-around bg-gray-50 rounded-lg p-4"
                }, e.slice(0, 7).reverse().map((e, t) => {
                    let a = "-";
                    if (e.data) {
                        const t = e.data.split("T")[0],
                            [l, r, o] = t.split("-");
                        a = `${o}/${r}`
                    }
                    const l = e.percOperacao || 0,
                        r = Math.max(10, l);
                    return React.createElement("div", {
                        key: t,
                        className: "flex flex-col items-center flex-1"
                    }, React.createElement("span", {
                        className: "text-xs font-bold mb-1"
                    }, l, "%"), React.createElement("div", {
                        className: "w-full rounded-t-lg transition-all " + (l >= 80 ? "bg-green-500" : l >= 50 ? "bg-yellow-500" : "bg-red-500"),
                        style: {
                            height: 1.5 * r + "px",
                            maxHeight: "140px"
                        }
                    }), React.createElement("span", {
                        className: "text-[10px] text-gray-500 mt-1"
                    }, a), React.createElement("span", {
                        className: "text-[9px] text-blue-600"
                    }, e.emLoja || 0, " em loja"))
                }))
            })()), React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-2 gap-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, "🏆 Ranking de Lojas (7 dias)"), React.createElement("div", {
                className: "space-y-1 max-h-64 overflow-y-auto"
            }, (() => {
                const e = Array.isArray(p.relatoriosData?.rankingLojas) ? p.relatoriosData.rankingLojas : [];
                return 0 === e.length ? React.createElement("p", {
                    className: "text-gray-400 text-center py-4"
                }, "Sem dados de lojas") : React.createElement(React.Fragment, null, React.createElement("p", {
                    className: "text-xs font-semibold text-green-700 mb-1"
                }, "✅ TOP 5 MELHORES"), e.slice(0, 5).map((e, t) => React.createElement("div", {
                    key: e.loja_id || t,
                    className: "flex items-center gap-2 p-1.5 bg-green-50 rounded text-xs"
                }, React.createElement("span", {
                    className: "font-bold text-green-700 w-5"
                }, t + 1, "º"), React.createElement("span", {
                    className: "flex-1 truncate"
                }, e.loja_nome || "-"), React.createElement("span", {
                    className: "text-gray-500 text-[10px]"
                }, e.regiao_nome || ""), React.createElement("span", {
                    className: "font-bold text-green-700"
                }, e.mediaPerc || 0, "%"))), e.length > 5 && React.createElement(React.Fragment, null, React.createElement("p", {
                    className: "text-xs font-semibold text-red-700 mt-3 mb-1"
                }, "⚠️ TOP 5 PIORES"), e.slice(-5).reverse().map((t, a) => React.createElement("div", {
                    key: `worst-${t.loja_id||a}`,
                    className: "flex items-center gap-2 p-1.5 bg-red-50 rounded text-xs"
                }, React.createElement("span", {
                    className: "font-bold text-red-700 w-5"
                }, e.length - 4 + a, "º"), React.createElement("span", {
                    className: "flex-1 truncate"
                }, t.loja_nome || "-"), React.createElement("span", {
                    className: "text-gray-500 text-[10px]"
                }, t.regiao_nome || ""), React.createElement("span", {
                    className: "font-bold text-red-700"
                }, t.mediaPerc || 0, "%")))))
            })())), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, "🚫 Ranking de Faltosos (30 dias)"), React.createElement("div", {
                className: "space-y-1 max-h-64 overflow-y-auto"
            }, (() => {
                const e = Array.isArray(p.relatoriosData?.rankingFaltosos) ? p.relatoriosData.rankingFaltosos : [];
                return 0 === e.length ? React.createElement("p", {
                    className: "text-gray-400 text-center py-4"
                }, "Nenhuma falta registrada") : e.slice(0, 10).map((e, t) => React.createElement("div", {
                    key: e.cod || e.nome || t,
                    className: "flex items-center gap-2 p-1.5 bg-red-50 rounded text-xs"
                }, React.createElement("span", {
                    className: "font-bold text-red-700 w-5"
                }, t + 1, "º"), React.createElement("span", {
                    className: "font-mono text-gray-600 w-12"
                }, e.cod || "-"), React.createElement("span", {
                    className: "flex-1 truncate"
                }, e.nome || "Sem nome"), React.createElement("span", {
                    className: "text-gray-500 text-[10px] truncate max-w-20"
                }, e.loja_nome || ""), React.createElement("span", {
                    className: "font-bold text-red-700 bg-red-200 px-1.5 rounded"
                }, e.totalFaltas || 0, "x")))
            })()))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, "🔥 Heatmap de Faltas por Dia da Semana (30 dias)"), (() => {
                const e = p.relatoriosData?.heatmap || {},
                    t = Array.isArray(e.lojas) ? e.lojas : [],
                    a = Array.isArray(e.diasSemana) ? e.diasSemana : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                return 0 === t.length ? React.createElement("p", {
                    className: "text-gray-400 text-center py-4"
                }, "Sem dados de faltas para gerar heatmap") : React.createElement("div", {
                    className: "overflow-x-auto"
                }, React.createElement("table", {
                    className: "w-full text-xs"
                }, React.createElement("thead", null, React.createElement("tr", {
                    className: "bg-gray-100"
                }, React.createElement("th", {
                    className: "px-2 py-1 text-left"
                }, "Loja"), a.map((e, t) => React.createElement("th", {
                    key: t,
                    className: "px-2 py-1 text-center w-12"
                }, e)), React.createElement("th", {
                    className: "px-2 py-1 text-center"
                }, "Total"))), React.createElement("tbody", null, t.slice(0, 15).map((e, t) => {
                    const a = Array.isArray(e.dias) ? e.dias : [0, 0, 0, 0, 0, 0, 0],
                        l = a.reduce((e, t) => e + t, 0),
                        r = Math.max(...a, 1);
                    return React.createElement("tr", {
                        key: e.loja_nome || t,
                        className: "border-t"
                    }, React.createElement("td", {
                        className: "px-2 py-1 font-medium truncate max-w-32"
                    }, e.loja_nome || "-"), a.map((e, t) => {
                        const a = e / r,
                            l = 0 === e ? "bg-gray-50" : a >= .8 ? "bg-red-500 text-white" : a >= .5 ? "bg-orange-400 text-white" : a >= .3 ? "bg-yellow-300" : "bg-yellow-100";
                        return React.createElement("td", {
                            key: t,
                            className: `px-2 py-1 text-center font-bold ${l}`
                        }, e || "-")
                    }), React.createElement("td", {
                        className: "px-2 py-1 text-center font-bold bg-gray-200"
                    }, l))
                }))))
            })(), React.createElement("div", {
                className: "flex justify-center gap-2 mt-3 text-[10px]"
            }, React.createElement("span", {
                className: "px-2 py-0.5 bg-gray-50 rounded"
            }, "0"), React.createElement("span", {
                className: "px-2 py-0.5 bg-yellow-100 rounded"
            }, "Baixo"), React.createElement("span", {
                className: "px-2 py-0.5 bg-yellow-300 rounded"
            }, "Médio"), React.createElement("span", {
                className: "px-2 py-0.5 bg-orange-400 text-white rounded"
            }, "Alto"), React.createElement("span", {
                className: "px-2 py-0.5 bg-red-500 text-white rounded"
            }, "Crítico"))))), "motoboys" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, "🏍️ Histórico de Motoboys"), React.createElement("div", {
                className: "flex flex-wrap gap-3 mb-4"
            }, React.createElement("div", {
                className: "flex-1 min-w-[200px]"
            }, React.createElement("input", {
                type: "text",
                placeholder: "🔍 Buscar por código ou nome...",
                value: p.motoboysBusca || "",
                onChange: e => x(t => ({
                    ...t,
                    motoboysBusca: e.target.value
                })),
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            })), React.createElement("select", {
                value: p.motoboysLojaFiltro || "",
                onChange: e => x(t => ({
                    ...t,
                    motoboysLojaFiltro: e.target.value
                })),
                className: "px-3 py-2 border rounded-lg text-sm"
            }, React.createElement("option", {
                value: ""
            }, "📍 Todas as Lojas"), (e.lojas || []).map(e => React.createElement("option", {
                key: e.id,
                value: e.id
            }, e.codigo, " - ", e.nome))), React.createElement("select", {
                value: p.motoboysDias || 30,
                onChange: e => x(t => ({
                    ...t,
                    motoboysDias: parseInt(e.target.value)
                })),
                className: "px-3 py-2 border rounded-lg text-sm"
            }, React.createElement("option", {
                value: 7
            }, "Últimos 7 dias"), React.createElement("option", {
                value: 15
            }, "Últimos 15 dias"), React.createElement("option", {
                value: 30
            }, "Últimos 30 dias"), React.createElement("option", {
                value: 60
            }, "Últimos 60 dias"), React.createElement("option", {
                value: 90
            }, "Últimos 90 dias")), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        motoboysLoading: !0
                    }));
                    try {
                        const e = new URLSearchParams;
                        e.append("dias", p.motoboysDias || 30), p.motoboysLojaFiltro && e.append("loja_id", p.motoboysLojaFiltro), p.motoboysBusca && e.append("busca", p.motoboysBusca);
                        const t = await _fetch(`${API_URL}/disponibilidade/motoboys?${e}`),
                            a = await t.json();
                        x(e => ({
                            ...e,
                            motoboysList: a,
                            motoboysLoading: !1
                        }))
                    } catch (e) {
                        console.error("Erro ao buscar motoboys:", e), ja("Erro ao buscar motoboys", "error"), x(e => ({
                            ...e,
                            motoboysLoading: !1
                        }))
                    }
                },
                className: "px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            }, "🔍 Buscar")), p.motoboysLoading && React.createElement("div", {
                className: "flex items-center justify-center py-8"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"
            }), React.createElement("span", {
                className: "ml-3 text-gray-600"
            }, "Carregando...")), !p.motoboysLoading && p.motoboysList && React.createElement("div", null, React.createElement("div", {
                className: "mb-4 p-3 bg-gray-100 rounded-lg flex items-center justify-between"
            }, React.createElement("span", {
                className: "text-sm text-gray-700"
            }, React.createElement("strong", null, p.motoboysList.total || 0), " motoboys encontrados (últimos ", React.createElement("strong", null, p.motoboysList.periodo_dias), " dias)")), React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-xs border-collapse"
            }, React.createElement("thead", null, React.createElement("tr", {
                className: "bg-gray-800 text-white"
            }, React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "COD"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "NOME"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "LOJA ATUAL"), React.createElement("th", {
                className: "px-2 py-2 text-center bg-green-700"
            }, "🏪 EM LOJA"), React.createElement("th", {
                className: "px-2 py-2 text-center bg-red-700"
            }, "❌ FALTAS"), React.createElement("th", {
                className: "px-2 py-2 text-center bg-orange-600"
            }, "📵 S/ CONTATO"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "LOJAS ONDE RODOU"))), React.createElement("tbody", null, (p.motoboysList.motoboys || []).map((e, t) => React.createElement("tr", {
                key: e.cod,
                className: `border-b ${t%2==0?"bg-white":"bg-gray-50"} hover:bg-blue-50`
            }, React.createElement("td", {
                className: "px-2 py-2 font-mono font-bold text-purple-700"
            }, e.cod), React.createElement("td", {
                className: "px-2 py-2 font-semibold"
            }, e.nome || "-"), React.createElement("td", {
                className: "px-2 py-2"
            }, e.loja_atual ? React.createElement("span", {
                className: "text-gray-700"
            }, React.createElement("span", {
                className: "font-semibold"
            }, e.loja_atual.codigo), " - ", e.loja_atual.nome, e.loja_atual.regiao_nome && React.createElement("span", {
                className: "text-gray-400 text-[10px] ml-1"
            }, "(", e.loja_atual.regiao_nome, ")")) : "-"), React.createElement("td", {
                className: "px-2 py-2 text-center"
            }, React.createElement("span", {
                className: "font-bold " + (e.estatisticas.em_loja.total > 0 ? "text-green-600" : "text-gray-400")
            }, e.estatisticas.em_loja.total, "x"), e.estatisticas.em_loja.ultima_vez && React.createElement("span", {
                className: "text-[9px] text-gray-400 block"
            }, "últ: ", new Date(e.estatisticas.em_loja.ultima_vez).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit"
            }))), React.createElement("td", {
                className: "px-2 py-2 text-center"
            }, React.createElement("span", {
                className: "font-bold " + (e.estatisticas.faltas.total > 0 ? "text-red-600" : "text-gray-400")
            }, e.estatisticas.faltas.total, "x"), e.estatisticas.faltas.ultima_falta && React.createElement("span", {
                className: "text-[9px] text-gray-400 block"
            }, "últ: ", new Date(e.estatisticas.faltas.ultima_falta).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit"
            }))), React.createElement("td", {
                className: "px-2 py-2 text-center"
            }, React.createElement("span", {
                className: "font-bold " + (e.estatisticas.sem_contato.total > 0 ? "text-orange-600" : "text-gray-400")
            }, e.estatisticas.sem_contato.total, "x"), e.estatisticas.sem_contato.max_dias_consecutivos > 0 && React.createElement("span", {
                className: "text-[9px] text-orange-500 block"
            }, "máx: ", e.estatisticas.sem_contato.max_dias_consecutivos, " dias seg.")), React.createElement("td", {
                className: "px-2 py-2"
            }, e.lojas_rodou && e.lojas_rodou.length > 0 ? React.createElement("div", {
                className: "flex flex-wrap gap-1"
            }, e.lojas_rodou.slice(0, 3).map(e => React.createElement("span", {
                key: e.id,
                className: "px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]"
            }, e.codigo)), e.lojas_rodou.length > 3 && React.createElement("span", {
                className: "px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px]"
            }, "+", e.lojas_rodou.length - 3)) : React.createElement("span", {
                className: "text-gray-400"
            }, "-"))))))), (!p.motoboysList.motoboys || 0 === p.motoboysList.motoboys.length) && React.createElement("div", {
                className: "text-center py-8 text-gray-500"
            }, React.createElement("p", {
                className: "text-4xl mb-2"
            }, "🏍️"), React.createElement("p", null, "Nenhum motoboy encontrado com os filtros selecionados."))), !p.motoboysLoading && !p.motoboysList && React.createElement("div", {
                className: "text-center py-8 text-gray-500"
            }, React.createElement("p", {
                className: "text-4xl mb-2"
            }, "🔍"), React.createElement("p", null, 'Use os filtros acima e clique em "Buscar" para ver o histórico dos motoboys.'))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h4", {
                className: "font-semibold text-gray-700 mb-2 text-sm"
            }, "📊 Legenda das Estatísticas"), React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
            }, React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("span", {
                className: "w-3 h-3 bg-green-500 rounded"
            }), React.createElement("span", null, React.createElement("strong", null, "EM LOJA:"), ' Quantas vezes recebeu status "EM LOJA" (trabalhou)')), React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("span", {
                className: "w-3 h-3 bg-red-500 rounded"
            }), React.createElement("span", null, React.createElement("strong", null, "FALTAS:"), ' Quantas vezes foi marcado como "FALTANDO"')), React.createElement("div", {
                className: "flex items-center gap-2"
            }, React.createElement("span", {
                className: "w-3 h-3 bg-orange-500 rounded"
            }), React.createElement("span", null, React.createElement("strong", null, "S/ CONTATO:"), ' Quantas vezes ficou "SEM CONTATO"'))))), "restricoes" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, "🚫 Cadastrar Nova Restrição"), React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4"
            }, React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold text-gray-700 mb-1"
            }, "Código *"), React.createElement("input", {
                type: "text",
                placeholder: "Ex: 12345",
                value: p.restricaoCod || "",
                onChange: e => {
                    const t = e.target.value;
                    x(e => ({
                        ...e,
                        restricaoCod: t
                    }));
                    const a = pe.find(e => e.codigo === t);
                    a && x(e => ({
                        ...e,
                        restricaoNome: a.nome
                    }))
                },
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold text-gray-700 mb-1"
            }, "Nome"), React.createElement("input", {
                type: "text",
                placeholder: "Auto-preenchido",
                value: p.restricaoNome || "",
                onChange: e => x(t => ({
                    ...t,
                    restricaoNome: e.target.value
                })),
                className: "w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
            })), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold text-gray-700 mb-1"
            }, "Loja"), React.createElement("select", {
                value: p.restricaoTodasLojas ? "TODAS" : p.restricaoLojaId || "",
                onChange: e => {
                    "TODAS" === e.target.value ? x(e => ({
                        ...e,
                        restricaoTodasLojas: !0,
                        restricaoLojaId: ""
                    })) : x(t => ({
                        ...t,
                        restricaoTodasLojas: !1,
                        restricaoLojaId: e.target.value
                    }))
                },
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            }, React.createElement("option", {
                value: ""
            }, "Selecione uma loja..."), React.createElement("option", {
                value: "TODAS",
                className: "font-bold text-red-600"
            }, "🚫 TODAS AS LOJAS"), (e.lojas || []).map(e => React.createElement("option", {
                key: e.id,
                value: e.id
            }, e.codigo, " - ", e.nome)))), React.createElement("div", null, React.createElement("label", {
                className: "block text-sm font-semibold text-gray-700 mb-1"
            }, "Motivo *"), React.createElement("input", {
                type: "text",
                placeholder: "Ex: Comportamento inadequado",
                value: p.restricaoMotivo || "",
                onChange: e => x(t => ({
                    ...t,
                    restricaoMotivo: e.target.value
                })),
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            }))), React.createElement("button", {
                onClick: async () => {
                    if (p.restricaoCod && p.restricaoMotivo)
                        if (p.restricaoTodasLojas || p.restricaoLojaId) try {
                            const e = await _fetch(`${API_URL}/disponibilidade/restricoes`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    cod_profissional: p.restricaoCod,
                                    nome_profissional: p.restricaoNome,
                                    loja_id: p.restricaoLojaId || null,
                                    todas_lojas: p.restricaoTodasLojas || !1,
                                    motivo: p.restricaoMotivo,
                                    criado_por: l?.fullName || l?.username
                                })
                            });
                            if (!e.ok) {
                                const t = await e.json();
                                throw new Error(t.error || "Erro ao cadastrar")
                            }
                            ja("✅ Restrição cadastrada com sucesso!", "success"), x(e => ({
                                ...e,
                                restricaoCod: "",
                                restricaoNome: "",
                                restricaoLojaId: "",
                                restricaoTodasLojas: !1,
                                restricaoMotivo: ""
                            }));
                            const t = await _fetch(`${API_URL}/disponibilidade/restricoes`),
                                a = await t.json();
                            x(e => ({
                                ...e,
                                restricoesList: a
                            }))
                        } catch (e) {
                            ja(e.message, "error")
                        } else ja('Selecione uma loja ou "Todas as Lojas"', "error");
                        else ja("Preencha o código e o motivo", "error")
                },
                className: "px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            }, "🚫 Cadastrar Restrição")), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-4"
            }, "📋 Restrições Ativas (", (p.restricoesList || []).length, ")"), p.restricoesLoading ? React.createElement("div", {
                className: "flex items-center justify-center py-8"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"
            }), React.createElement("span", {
                className: "ml-3 text-gray-600"
            }, "Carregando...")) : 0 === (p.restricoesList || []).length ? React.createElement("div", {
                className: "text-center py-8 text-gray-500"
            }, React.createElement("p", {
                className: "text-4xl mb-2"
            }, "✅"), React.createElement("p", null, "Nenhuma restrição ativa no momento.")) : React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-xs border-collapse"
            }, React.createElement("thead", null, React.createElement("tr", {
                className: "bg-red-700 text-white"
            }, React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "COD"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "NOME"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "LOJA"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "MOTIVO"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "CRIADO POR"), React.createElement("th", {
                className: "px-2 py-2 text-left"
            }, "DATA"), React.createElement("th", {
                className: "px-2 py-2 text-center"
            }, "AÇÃO"))), React.createElement("tbody", null, (p.restricoesList || []).map((e, t) => React.createElement("tr", {
                key: e.id,
                className: `border-b ${t%2==0?"bg-white":"bg-red-50"} hover:bg-red-100`
            }, React.createElement("td", {
                className: "px-2 py-2 font-mono font-bold text-red-700"
            }, e.cod_profissional), React.createElement("td", {
                className: "px-2 py-2 font-semibold"
            }, e.nome_profissional || "-"), React.createElement("td", {
                className: "px-2 py-2"
            }, e.todas_lojas ? React.createElement("span", {
                className: "px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold"
            }, "🚫 TODAS") : e.loja_nome ? React.createElement("span", null, e.loja_codigo, " - ", e.loja_nome) : "-"), React.createElement("td", {
                className: "px-2 py-2 max-w-[200px] truncate",
                title: e.motivo
            }, e.motivo), React.createElement("td", {
                className: "px-2 py-2 text-gray-600"
            }, e.criado_por || "-"), React.createElement("td", {
                className: "px-2 py-2 text-gray-600"
            }, new Date(e.created_at).toLocaleDateString("pt-BR")), React.createElement("td", {
                className: "px-2 py-2 text-center"
            }, React.createElement("button", {
                onClick: async () => {
                    if (confirm(`Remover restrição de ${e.cod_profissional} - ${e.nome_profissional||"N/A"}?`)) try {
                        await _fetch(`${API_URL}/disponibilidade/restricoes/${e.id}`, {
                            method: "DELETE"
                        }), ja("✅ Restrição removida!", "success");
                        const t = await _fetch(`${API_URL}/disponibilidade/restricoes`),
                            a = await t.json();
                        x(e => ({
                            ...e,
                            restricoesList: a
                        }))
                    } catch (e) {
                        ja("Erro ao remover restrição", "error")
                    }
                },
                className: "px-2 py-1 bg-green-600 text-white rounded text-[10px] font-bold hover:bg-green-700"
            }, "✅ Liberar"))))))))), "config" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, "🔗 Link Público (Somente Leitura)"), React.createElement("p", {
                className: "text-sm text-gray-600 mb-3"
            }, "Compartilhe este link com gestores para visualizar o panorama em tempo real, sem precisar de login. A página atualiza automaticamente a cada 2 minutos."), React.createElement("div", {
                className: "flex gap-2 flex-wrap"
            }, React.createElement("input", {
                type: "text",
                readOnly: !0,
                value: `${API_URL}/disponibilidade/publico`,
                className: "flex-1 px-3 py-2 bg-gray-100 border rounded-lg text-sm font-mono"
            }), React.createElement("button", {
                onClick: () => {
                    navigator.clipboard.writeText(`${API_URL}/disponibilidade/publico`), ja("✅ Link copiado!", "success")
                },
                className: "px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            }, "📋 Copiar Link"), React.createElement("button", {
                onClick: () => window.open(`${API_URL}/disponibilidade/publico`, "_blank"),
                className: "px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            }, "🔗 Abrir"))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, "🌍 Regiões"), React.createElement("div", {
                className: "flex gap-2 mb-4"
            }, React.createElement("input", {
                type: "text",
                placeholder: "Nome da região (ex: GOIÂNIA)",
                value: p.novaRegiao || "",
                onChange: e => x({
                    ...p,
                    novaRegiao: e.target.value.toUpperCase()
                }),
                className: "flex-1 px-3 py-2 border rounded-lg",
                onKeyPress: e => "Enter" === e.key && o()
            }), React.createElement("button", {
                onClick: o,
                className: "px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            }, "+ Adicionar")), React.createElement("div", {
                className: "space-y-2"
            }, (e.regioes || []).map(t => React.createElement("div", {
                key: t.id,
                className: "flex items-center gap-2 p-2 bg-purple-50 rounded-lg"
            }, React.createElement("span", {
                className: "font-semibold text-purple-800 min-w-[150px]"
            }, t.nome), React.createElement("input", {
                type: "text",
                placeholder: "Gestores (ex: LIS / LEO / ERICK)",
                value: t.gestores || "",
                onChange: async a => {
                    const l = a.target.value,
                        r = e.regioes.map(e => e.id === t.id ? {
                            ...e,
                            gestores: l
                        } : e);
                    x(t => ({
                        ...t,
                        dispData: {
                            ...e,
                            regioes: r
                        }
                    })), clearTimeout(window.gestoresDebounce), window.gestoresDebounce = setTimeout(async () => {
                        try {
                            await _fetch(`${API_URL}/disponibilidade/regioes/${t.id}`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    gestores: l
                                })
                            })
                        } catch (e) {
                            console.error("Erro ao salvar gestores:", e)
                        }
                    }, 500)
                },
                className: "flex-1 px-2 py-1 border border-purple-200 rounded text-sm"
            }), React.createElement("button", {
                onClick: () => (async (e, t) => {
                    if (window.confirm(`Remover região "${t}" e todas suas lojas?`)) try {
                        await _fetch(`${API_URL}/disponibilidade/regioes/${e}`, {
                            method: "DELETE"
                        }), ja(`🗑️ Região "${t}" removida!`, "success"), r()
                    } catch (e) {
                        ja("Erro ao remover região", "error")
                    }
                })(t.id, t.nome),
                className: "text-red-600 hover:text-red-800 font-bold px-2",
                title: "Remover região"
            }, "×"))), 0 === (e.regioes || []).length && React.createElement("p", {
                className: "text-gray-500 text-sm"
            }, "Nenhuma região cadastrada"))), React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, "🏪 Adicionar Loja"), React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-6 gap-3"
            }, React.createElement("select", {
                value: p.novaLojaRegiaoId || "",
                onChange: e => x({
                    ...p,
                    novaLojaRegiaoId: e.target.value
                }),
                className: "px-3 py-2 border rounded-lg"
            }, React.createElement("option", {
                value: ""
            }, "Selecione a Região"), (e.regioes || []).map(e => React.createElement("option", {
                key: e.id,
                value: e.id
            }, e.nome))), React.createElement("input", {
                type: "text",
                placeholder: "Código (ex: 249)",
                value: p.novaCodLoja || "",
                onChange: e => x({
                    ...p,
                    novaCodLoja: e.target.value
                }),
                className: "px-3 py-2 border rounded-lg"
            }), React.createElement("input", {
                type: "text",
                placeholder: "Nome da Loja",
                value: p.novaNomeLoja || "",
                onChange: e => x({
                    ...p,
                    novaNomeLoja: e.target.value.toUpperCase()
                }),
                className: "px-3 py-2 border rounded-lg"
            }), React.createElement("input", {
                type: "number",
                placeholder: "Titulares",
                min: "0",
                value: p.novaQtdTitulares || "",
                onChange: e => x({
                    ...p,
                    novaQtdTitulares: e.target.value
                }),
                className: "px-3 py-2 border rounded-lg",
                title: "Quantidade de linhas titulares"
            }), React.createElement("input", {
                type: "number",
                placeholder: "Excedentes",
                min: "0",
                value: p.novaQtdExcedentes || "",
                onChange: e => x({
                    ...p,
                    novaQtdExcedentes: e.target.value
                }),
                className: "px-3 py-2 border rounded-lg bg-red-50",
                title: "Quantidade de linhas excedentes"
            }), React.createElement("button", {
                onClick: async () => {
                    const e = p.novaCodLoja?.trim(),
                        t = p.novaNomeLoja?.trim(),
                        a = p.novaLojaRegiaoId,
                        l = parseInt(p.novaQtdTitulares) || 0,
                        o = parseInt(p.novaQtdExcedentes) || 0;
                    if (e && t && a)
                        if (0 !== l || 0 !== o) try {
                            if (!(await _fetch(`${API_URL}/disponibilidade/lojas`, {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        regiao_id: a,
                                        codigo: e,
                                        nome: t,
                                        qtd_titulares: l,
                                        qtd_excedentes: o
                                    })
                                })).ok) throw new Error("Erro ao criar loja");
                            x(e => ({
                                ...e,
                                novaCodLoja: "",
                                novaNomeLoja: "",
                                novaQtdTitulares: "",
                                novaQtdExcedentes: "",
                                novaLojaRegiaoId: ""
                            })), ja(`✅ Loja "${t}" adicionada com ${l} titular(es) e ${o} excedente(s)!`, "success"), r()
                        } catch (e) {
                            ja("Erro ao criar loja", "error")
                        } else ja("Adicione pelo menos 1 linha", "error");
                        else ja("Preencha todos os campos", "error")
                },
                className: "px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            }, "+ Adicionar Loja")), React.createElement("p", {
                className: "text-xs text-gray-500 mt-2"
            }, "💡 Titulares = linhas principais | Excedentes = linhas extras (aparecem em vermelho claro)")), (e.regioes || []).map(t => {
                const a = (e.lojas || []).filter(e => e.regiao_id === t.id);
                return 0 === a.length ? null : React.createElement("div", {
                    key: t.id,
                    className: "bg-white rounded-xl shadow p-4"
                }, React.createElement("h3", {
                    className: "font-bold text-gray-800 mb-3"
                }, "📍 ", t.nome, " ", t.gestores && React.createElement("span", {
                    className: "font-normal text-gray-500"
                }, "(", t.gestores, ")")), React.createElement("div", {
                    className: "overflow-x-auto"
                }, React.createElement("table", {
                    className: "w-full text-sm"
                }, React.createElement("thead", {
                    className: "bg-gray-100"
                }, React.createElement("tr", null, React.createElement("th", {
                    className: "px-3 py-2 text-left"
                }, "Código"), React.createElement("th", {
                    className: "px-3 py-2 text-left"
                }, "Nome da Loja"), React.createElement("th", {
                    className: "px-3 py-2 text-center"
                }, "Titulares"), React.createElement("th", {
                    className: "px-3 py-2 text-center"
                }, "Excedentes"), React.createElement("th", {
                    className: "px-3 py-2 text-center"
                }, "Total"), React.createElement("th", {
                    className: "px-3 py-2 text-center"
                }, "Ações"))), React.createElement("tbody", null, a.map(t => {
                    const a = (e.linhas || []).filter(e => e.loja_id === t.id),
                        l = a.filter(e => !e.is_excedente).length,
                        o = a.filter(e => e.is_excedente).length,
                        c = p.editandoLoja === t.id;
                    return React.createElement("tr", {
                        key: t.id,
                        className: "border-t"
                    }, React.createElement("td", {
                        className: "px-3 py-2"
                    }, c ? React.createElement("input", {
                        type: "text",
                        value: p.editLojaCodigo || "",
                        onChange: e => x({
                            ...p,
                            editLojaCodigo: e.target.value
                        }),
                        className: "w-20 px-2 py-1 border rounded text-xs"
                    }) : React.createElement("span", {
                        className: "font-mono font-bold"
                    }, t.codigo)), React.createElement("td", {
                        className: "px-3 py-2"
                    }, c ? React.createElement("input", {
                        type: "text",
                        value: p.editLojaNome || "",
                        onChange: e => x({
                            ...p,
                            editLojaNome: e.target.value.toUpperCase()
                        }),
                        className: "w-full px-2 py-1 border rounded text-xs"
                    }) : t.nome), React.createElement("td", {
                        className: "px-3 py-2 text-center"
                    }, React.createElement("span", {
                        className: "px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                    }, l)), React.createElement("td", {
                        className: "px-3 py-2 text-center"
                    }, React.createElement("span", {
                        className: "px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs"
                    }, o)), React.createElement("td", {
                        className: "px-3 py-2 text-center font-semibold"
                    }, a.length), React.createElement("td", {
                        className: "px-3 py-2 text-center"
                    }, c ? React.createElement(React.Fragment, null, React.createElement("button", {
                        onClick: async () => {
                            try {
                                await _fetch(`${API_URL}/disponibilidade/lojas/${t.id}`, {
                                    method: "PUT",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        codigo: p.editLojaCodigo,
                                        nome: p.editLojaNome
                                    })
                                }), x({
                                    ...p,
                                    editandoLoja: null
                                }), ja("✅ Loja atualizada!", "success"), r()
                            } catch (e) {
                                ja("Erro ao atualizar", "error")
                            }
                        },
                        className: "px-2 py-1 bg-green-100 text-green-700 rounded text-xs mr-1"
                    }, "✓"), React.createElement("button", {
                        onClick: () => x({
                            ...p,
                            editandoLoja: null
                        }),
                        className: "px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    }, "✕")) : React.createElement(React.Fragment, null, React.createElement("button", {
                        onClick: () => x({
                            ...p,
                            editandoLoja: t.id,
                            editLojaCodigo: t.codigo,
                            editLojaNome: t.nome
                        }),
                        className: "px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs mr-1",
                        title: "Editar loja"
                    }, "✏️"), React.createElement("button", {
                        onClick: () => s(t.id, 1, !1),
                        className: "px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1",
                        title: "Adicionar titular"
                    }, "+T"), React.createElement("button", {
                        onClick: () => s(t.id, 1, !0),
                        className: "px-2 py-1 bg-red-100 text-red-700 rounded text-xs mr-1",
                        title: "Adicionar excedente"
                    }, "+E"), React.createElement("button", {
                        onClick: () => (async (e, t) => {
                            if (window.confirm(`Remover loja "${t}"?`)) try {
                                await _fetch(`${API_URL}/disponibilidade/lojas/${e}`, {
                                    method: "DELETE"
                                }), ja("🗑️ Loja removida!", "success"), r()
                            } catch (e) {
                                ja("Erro ao remover loja", "error")
                            }
                        })(t.id, t.nome),
                        className: "px-2 py-1 bg-red-100 text-red-700 rounded text-xs",
                        title: "Remover loja"
                    }, "🗑️"))))
                })))))
            }), (e.linhas || []).length > 0 && React.createElement("div", {
                className: "bg-red-50 border border-red-200 rounded-xl p-4"
            }, React.createElement("div", {
                className: "flex items-center justify-between"
            }, React.createElement("div", null, React.createElement("h4", {
                className: "font-semibold text-red-800"
            }, "🧹 Limpar Todas as Linhas"), React.createElement("p", {
                className: "text-sm text-red-600"
            }, "Reseta todos os entregadores, mantém a estrutura de regiões e lojas.")), React.createElement("button", {
                onClick: async () => {
                    if (window.confirm("Limpar TODAS as linhas? (mantém a estrutura de regiões e lojas)")) try {
                        await _fetch(`${API_URL}/disponibilidade/limpar-linhas`, {
                            method: "DELETE"
                        }), ja("✅ Todas as linhas foram resetadas!", "success"), r()
                    } catch (e) {
                        ja("Erro ao limpar linhas", "error")
                    }
                },
                className: "px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            }, "Limpar Linhas")))), "principal" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-3"
            }, React.createElement("div", {
                className: "flex justify-between items-center flex-wrap gap-3"
            }, React.createElement("div", {
                className: "flex items-center gap-3"
            }, React.createElement("h2", {
                className: "text-lg font-bold text-gray-800"
            }, "📅 Disponibilidade"), React.createElement("div", {
                className: "flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200"
            }, React.createElement("span", {
                className: "text-sm font-semibold text-purple-700"
            }, "Data:"), React.createElement("input", {
                type: "date",
                value: p.dispDataPlanilha || (new Date).toISOString().split("T")[0],
                onChange: e => x({
                    ...p,
                    dispDataPlanilha: e.target.value
                }),
                className: "px-2 py-1 border border-purple-300 rounded text-sm font-semibold text-purple-800 bg-white"
            })), React.createElement("div", {
                className: "flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
            }, React.createElement("span", {
                className: "text-blue-500"
            }, "🔍"), React.createElement("input", {
                type: "text",
                placeholder: "Buscar código ou nome...",
                value: p.buscaEntregador || "",
                onChange: e => x({
                    ...p,
                    buscaEntregador: e.target.value
                }),
                className: "px-2 py-1 border border-blue-300 rounded text-sm bg-white w-48"
            }), p.buscaEntregador && React.createElement("button", {
                onClick: () => x({
                    ...p,
                    buscaEntregador: ""
                }),
                className: "text-blue-400 hover:text-blue-600"
            }, "×"))), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("button", {
                onClick: r,
                className: "px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 flex items-center gap-1 text-sm"
            }, "🔄 Atualizar"), React.createElement("button", {
                onClick: async () => {
                    const e = p.dispDataPlanilha || (new Date).toISOString().split("T")[0],
                        t = new Date(e + "T12:00:00").toLocaleDateString("pt-BR");
                    if (window.confirm(`⚠️ ATENÇÃO!\n\n📅 Data da planilha: ${t}\n\nIsso irá:\n• Salvar a planilha atual no Espelho (${t})\n• Registrar motoboys EM LOJA e SEM CONTATO\n• Remover motoboys com 3+ dias SEM CONTATO\n• Resetar todos os status para "A CONFIRMAR"\n• Limpar todas as observações\n• Converter linhas de reposição em excedentes\n\n✅ Os códigos e nomes serão MANTIDOS!\n\nDeseja continuar?`)) try {
                        x(e => ({
                            ...e,
                            dispLoading: !0
                        }));
                        const a = await _fetch(`${API_URL}/disponibilidade/resetar`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    data_planilha: e
                                })
                            }),
                            l = await a.json();
                        if (l.success) {
                            let e = `✅ Status resetado! Espelho salvo em ${t}`;
                            l.em_loja_registrados > 0 && (e += `\n🏪 ${l.em_loja_registrados} motoboy(s) EM LOJA registrado(s)`), l.sem_contato_registrados > 0 && (e += `\n📵 ${l.sem_contato_registrados} motoboy(s) SEM CONTATO registrado(s)`), l.removidos_por_sem_contato && l.removidos_por_sem_contato.length > 0 && (e += "\n\n🚫 REMOVIDOS POR 3 DIAS SEM CONTATO:", l.removidos_por_sem_contato.forEach(t => {
                                e += `\n• ${t.cod} - ${t.nome}`
                            })), ja(e, "success"), l.removidos_por_sem_contato && l.removidos_por_sem_contato.length > 0 && setTimeout(() => {
                                alert(`🚫 MOTOBOYS REMOVIDOS POR 3 DIAS SEM CONTATO:\n\n${l.removidos_por_sem_contato.map(e=>`${e.cod} - ${e.nome}`).join("\n")}`)
                            }, 500)
                        } else ja("Erro ao resetar", "error");
                        r()
                    } catch (e) {
                        console.error("Erro ao resetar:", e), ja("Erro ao resetar", "error"), x(e => ({
                            ...e,
                            dispLoading: !1
                        }))
                    }
                },
                className: "px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg font-semibold hover:bg-orange-200 flex items-center gap-1 text-sm"
            }, "🔄 Resetar Status"))), p.buscaEntregador && p.buscaEntregador.length >= 2 && React.createElement("div", {
                className: "mt-3 p-3 bg-blue-50 rounded-lg"
            }, React.createElement("p", {
                className: "text-xs font-semibold text-blue-700 mb-2"
            }, 'Resultados para "', p.buscaEntregador, '":'), React.createElement("div", {
                className: "space-y-1 max-h-40 overflow-y-auto"
            }, (() => {
                const t = p.buscaEntregador.toLowerCase(),
                    a = (e.linhas || []).filter(e => e.cod_profissional && e.cod_profissional.toLowerCase().includes(t) || e.nome_profissional && e.nome_profissional.toLowerCase().includes(t));
                return 0 === a.length ? React.createElement("p", {
                    className: "text-gray-500 text-sm"
                }, "Nenhum resultado encontrado") : a.slice(0, 10).map(t => {
                    const a = (e.lojas || []).find(e => e.id === t.loja_id);
                    return React.createElement("div", {
                        key: t.id,
                        className: "flex items-center justify-between p-2 bg-white rounded text-xs"
                    }, React.createElement("div", {
                        className: "flex items-center gap-2"
                    }, React.createElement("span", {
                        className: "font-mono font-bold"
                    }, t.cod_profissional || "-"), React.createElement("span", null, t.nome_profissional || "Sem nome")), React.createElement("div", {
                        className: "flex items-center gap-2"
                    }, React.createElement("span", {
                        className: "text-gray-500"
                    }, a?.nome || ""), React.createElement("span", {
                        className: "px-2 py-0.5 rounded text-[10px] font-bold " + ("EM LOJA" === t.status ? "bg-blue-100 text-blue-700" : "CONFIRMADO" === t.status ? "bg-green-100 text-green-700" : "A CAMINHO" === t.status ? "bg-orange-100 text-orange-700" : "FALTANDO" === t.status ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700")
                    }, t.status)))
                })
            })()))), p.modalFaltando && React.createElement("div", {
                className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
            }, React.createElement("h3", {
                className: "text-lg font-bold text-red-600 mb-4"
            }, "⚠️ Registrar Falta"), React.createElement("div", {
                className: "mb-4"
            }, React.createElement("p", {
                className: "text-sm text-gray-600 mb-2"
            }, React.createElement("strong", null, "Profissional:"), " ", p.faltandoLinha?.nome_profissional || p.faltandoLinha?.cod_profissional || "Não identificado"), React.createElement("label", {
                className: "text-sm font-semibold text-gray-700"
            }, "Motivo da falta *"), React.createElement("textarea", {
                value: p.faltandoMotivo || "",
                onChange: e => x({
                    ...p,
                    faltandoMotivo: e.target.value
                }),
                placeholder: "Digite o motivo da falta...",
                className: "w-full px-3 py-2 border rounded-lg mt-1 text-sm",
                rows: 3,
                autoFocus: !0
            })), React.createElement("div", {
                className: "flex gap-2"
            }, React.createElement("button", {
                onClick: () => x({
                    ...p,
                    modalFaltando: !1,
                    faltandoLinha: null,
                    faltandoMotivo: ""
                }),
                className: "flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
            }, "Cancelar"), React.createElement("button", {
                onClick: async () => {
                    const t = p.faltandoLinha,
                        a = p.faltandoMotivo?.trim();
                    if (!a) return void ja("Digite o motivo da falta", "error");
                    const l = p.dispDataPlanilha || (new Date).toISOString().split("T")[0];
                    try {
                        await _fetch(`${API_URL}/disponibilidade/linhas/${t.id}`, {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                cod_profissional: t.cod_profissional,
                                nome_profissional: t.nome_profissional,
                                status: "FALTANDO",
                                observacao: a
                            })
                        }), await _fetch(`${API_URL}/disponibilidade/faltosos`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                loja_id: t.loja_id,
                                cod_profissional: t.cod_profissional,
                                nome_profissional: t.nome_profissional,
                                motivo: a,
                                data_falta: l
                            })
                        });
                        const r = await _fetch(`${API_URL}/disponibilidade/linha-reposicao`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    loja_id: t.loja_id,
                                    after_linha_id: t.id
                                })
                            }),
                            o = await r.json(),
                            c = [...e.linhas || []],
                            s = c.findIndex(e => e.id === t.id); - 1 !== s && (c[s] = {
                            ...c[s],
                            status: "FALTANDO",
                            observacao: a
                        }), c.push(o), x(t => ({
                            ...t,
                            modalFaltando: !1,
                            faltandoLinha: null,
                            faltandoMotivo: "",
                            dispData: {
                                ...e,
                                linhas: c
                            }
                        })), ja("⚠️ Falta registrada e linha de reposição criada!", "success")
                    } catch (e) {
                        console.error("Erro ao registrar falta:", e), ja("Erro ao registrar falta", "error")
                    }
                },
                className: "flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            }, "✓ Confirmar Falta")))), 0 === (e.regioes || []).length ? React.createElement("div", {
                className: "bg-white rounded-xl shadow p-8 text-center"
            }, React.createElement("p", {
                className: "text-gray-500 text-lg"
            }, "Nenhuma estrutura configurada."), React.createElement("button", {
                onClick: () => x({
                    ...p,
                    dispSubTab: "config"
                }),
                className: "mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold"
            }, "⚙️ Configurar Estrutura")) : React.createElement(React.Fragment, null, React.createElement("div", {
                className: "flex flex-wrap gap-2"
            }, (e.regioes || []).map(t => {
                const a = (e.lojas || []).filter(e => e.regiao_id === t.id),
                    l = (e.linhas || []).filter(e => a.some(t => t.id === e.loja_id)),
                    r = l.filter(e => "EM LOJA" === e.status).length,
                    o = l.filter(e => !e.is_excedente && !e.is_reposicao).length;
                return React.createElement("button", {
                    key: t.id,
                    onClick: () => x({
                        ...p,
                        dispRegiaoAtiva: p.dispRegiaoAtiva === t.id ? null : t.id
                    }),
                    className: "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 text-sm " + (p.dispRegiaoAtiva === t.id ? "bg-purple-600 text-white shadow-lg" : "bg-white text-gray-700 border hover:bg-purple-50 hover:border-purple-300")
                }, "📍 ", t.nome, React.createElement("span", {
                    className: "text-xs px-2 py-0.5 rounded-full font-bold " + (p.dispRegiaoAtiva === t.id ? "bg-white/20 text-white" : r >= o && o > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")
                }, r, "/", o))
            })), p.dispRegiaoAtiva && (() => {
                const t = (e.regioes || []).find(e => e.id === p.dispRegiaoAtiva);
                if (!t) return null;
                const a = (e.lojas || []).filter(e => e.regiao_id === t.id);
                return React.createElement("div", {
                    className: "space-y-2"
                }, a.map(t => {
                    const a = (e.linhas || []).filter(e => e.loja_id === t.id),
                        l = (p.dispLojasAbertas || []).includes(t.id),
                        o = a.filter(e => "EM LOJA" === e.status).length,
                        totalTitulares = a.filter(e => !e.is_excedente && !e.is_reposicao).length,
                        i = a.filter(e => "FALTANDO" === e.status).length;
                    a.filter(e => e.is_reposicao).length;
                    let d = "bg-gray-100 hover:bg-gray-200";
                    return i > 0 ? d = "bg-red-100 hover:bg-red-200" : o >= totalTitulares && totalTitulares > 0 ? d = "bg-green-100 hover:bg-green-200" : o > 0 && (d = "bg-yellow-100 hover:bg-yellow-200"), React.createElement("div", {
                        key: t.id,
                        className: "bg-white rounded-lg shadow overflow-hidden"
                    }, React.createElement("button", {
                        onClick: () => {
                            const e = p.dispLojasAbertas || [];
                            x(l ? {
                                ...p,
                                dispLojasAbertas: e.filter(e => e !== t.id)
                            } : {
                                ...p,
                                dispLojasAbertas: [...e, t.id]
                            })
                        },
                        className: `w-full px-3 py-2 flex items-center justify-between ${d} transition-colors`
                    }, React.createElement("div", {
                        className: "flex items-center gap-2"
                    }, React.createElement("span", {
                        className: "transform transition-transform text-xs " + (l ? "rotate-90" : "")
                    }, "▶"), React.createElement("span", {
                        className: "font-mono font-bold text-purple-700 text-sm"
                    }, t.codigo), React.createElement("span", {
                        className: "font-semibold text-gray-800 text-sm"
                    }, t.nome)), React.createElement("div", {
                        className: "flex items-center gap-2"
                    }, i > 0 && React.createElement("span", {
                        className: "px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-semibold"
                    }, i, " faltando"), React.createElement("span", {
                        className: "text-xs font-semibold px-2 py-0.5 rounded " + (o >= totalTitulares ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-700")
                    }, o, "/", totalTitulares, " em loja"), React.createElement("button", {
                        onClick: ev => { ev.stopPropagation(); s(t.id, 1, false); },
                        className: "px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-semibold hover:bg-purple-200 transition-colors",
                        title: "Adicionar 1 titular"
                    }, "➕ Titular"), React.createElement("button", {
                        onClick: ev => { ev.stopPropagation(); s(t.id, 1, true); },
                        className: "px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded font-semibold hover:bg-red-200 transition-colors",
                        title: "Adicionar 1 excedente"
                    }, "➕ Excedente"))), l && React.createElement("div", {
                        className: "border-t",
                        "data-loja-id": t.id
                    }, React.createElement("table", {
                        className: "w-full text-xs"
                    }, React.createElement("thead", {
                        className: "bg-gray-50"
                    }, React.createElement("tr", null, React.createElement("th", {
                        className: "w-1"
                    }), React.createElement("th", {
                        className: "px-2 py-1 text-center w-20"
                    }, "COD"), React.createElement("th", {
                        className: "px-2 py-1 text-left"
                    }, "ENTREGADOR"), React.createElement("th", {
                        className: "px-2 py-1 text-center w-36"
                    }, "STATUS"), React.createElement("th", {
                        className: "px-2 py-1 text-left"
                    }, "OBS"), React.createElement("th", {
                        className: "px-1 py-1 text-center w-6"
                    }))), React.createElement("tbody", null, [...a].sort((e, t) => e.is_reposicao && !t.is_reposicao ? -1 : !e.is_reposicao && t.is_reposicao || e.is_excedente && !t.is_excedente ? 1 : !e.is_excedente && t.is_excedente ? -1 : 0).map((e, a) => React.createElement("tr", {
                        key: e.id,
                        className: `border-t ${e.is_reposicao?"bg-blue-50/50":e.is_excedente?"bg-red-50/50":""} ${e.is_excedente||e.is_reposicao||!m[e.status]?"":m[e.status]} hover:bg-gray-50`
                    }, React.createElement("td", {
                        className: "w-1 " + (e.is_reposicao ? "bg-blue-400" : e.is_excedente ? "bg-red-400" : "")
                    }), React.createElement("td", {
                        className: "px-1 py-0.5"
                    }, React.createElement(CodInput, {
                        key: e.id,
                        rowId: e.id,
                        initialValue: e.cod_profissional || "",
                        onCommit: c,
                        lojaId: t.id,
                        "data-cod-input": e.id,
                        rowClass: e.is_reposicao ? "bg-blue-50/50" : e.is_excedente ? "bg-red-50/50" : "bg-white"
                    })), React.createElement("td", {
                        className: "px-1 py-0.5"
                    }, React.createElement("div", {
                        className: "flex items-center gap-1"
                    }, e.is_reposicao && React.createElement("span", {
                        className: "text-[9px] text-blue-400 italic"
                    }, "reposição"), e.is_excedente && React.createElement("span", {
                        className: "text-[9px] text-red-400 italic"
                    }, "excedente"), React.createElement("span", {
                        className: "text-xs " + (e.nome_profissional ? "text-gray-800" : "text-gray-400 italic")
                    }, e.nome_profissional || (e.is_reposicao || e.is_excedente ? "" : "-")))), React.createElement("td", {
                        className: "px-1 py-0.5"
                    }, React.createElement("select", {
                        value: e.status || "A CONFIRMAR",
                        onChange: t => {
                            "FALTANDO" === t.target.value ? (e => {
                                x(t => ({
                                    ...t,
                                    modalFaltando: !0,
                                    faltandoLinha: e,
                                    faltandoMotivo: ""
                                }))
                            })(e) : c(e.id, "status", t.target.value)
                        },
                        className: `w-full px-1 py-0.5 border border-gray-200 rounded text-xs font-semibold ${n[e.status]||""}`
                    }, React.createElement("option", {
                        value: "A CONFIRMAR"
                    }, "A CONFIRMAR"), React.createElement("option", {
                        value: "CONFIRMADO"
                    }, "CONFIRMADO"), React.createElement("option", {
                        value: "A CAMINHO"
                    }, "A CAMINHO"), React.createElement("option", {
                        value: "EM LOJA"
                    }, "EM LOJA"), React.createElement("option", {
                        value: "FALTANDO"
                    }, "FALTANDO"), React.createElement("option", {
                        value: "SEM CONTATO"
                    }, "SEM CONTATO"))), React.createElement("td", {
                        className: "px-1 py-0.5"
                    }, React.createElement("div", {
                        className: "relative"
                    }, React.createElement("input", {
                        type: "text",
                        value: e.observacao || "",
                        onChange: t => c(e.id, "observacao", t.target.value),
                        placeholder: "...",
                        title: e.observacao_criada_por ? `📝 ${e.observacao_criada_por} - ${e.observacao_criada_em ? new Date(e.observacao_criada_em).toLocaleString("pt-BR") : ""}` : "Adicionar observação",
                        className: "w-full px-1 py-0.5 border border-gray-200 rounded text-xs " + (e.is_excedente ? "bg-red-50/50" : e.is_reposicao ? "bg-blue-50/50" : "bg-white") + (e.observacao_criada_por ? " border-purple-300" : "")
                    }), e.observacao && e.observacao_criada_por && React.createElement("span", {
                        className: "absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full",
                        title: `Por: ${e.observacao_criada_por}`
                    }))), React.createElement("td", {
                        className: "px-1 py-0.5 text-center"
                    }, React.createElement("button", {
                        onClick: () => (async e => {
                            try {
                                await _fetch(`${API_URL}/disponibilidade/linhas/${e}`, {
                                    method: "DELETE"
                                }), r()
                            } catch (e) {
                                ja("Erro ao remover linha", "error")
                            }
                        })(e.id),
                        className: "text-red-400 hover:text-red-600 text-xs",
                        title: "Remover"
                    }, "×"))))))))
                }), React.createElement("div", {
                    className: "flex gap-2 pt-2"
                }, React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        dispLojasAbertas: a.map(e => e.id)
                    }),
                    className: "px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                }, "📂 Expandir Todas"), React.createElement("button", {
                    onClick: () => x({
                        ...p,
                        dispLojasAbertas: []
                    }),
                    className: "px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                }, "📁 Recolher Todas")))
            })(), !p.dispRegiaoAtiva && React.createElement("div", {
                className: "bg-white rounded-xl shadow p-8 text-center"
            }, React.createElement("p", {
                className: "text-gray-500"
            }, "👆 Selecione uma região acima para ver as lojas"))), (e.regioes || []).length > 0 && React.createElement("div", {
                className: "bg-white rounded-xl shadow p-3"
            }, React.createElement("h4", {
                className: "font-semibold text-gray-700 mb-2 text-sm"
            }, "📊 Legenda"), React.createElement("div", {
                className: "flex flex-wrap gap-2 text-xs"
            }, React.createElement("span", {
                className: "px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold"
            }, "A CONFIRMAR"), React.createElement("span", {
                className: "px-2 py-1 bg-green-100 text-green-800 rounded font-semibold"
            }, "CONFIRMADO"), React.createElement("span", {
                className: "px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold"
            }, "EM LOJA"), React.createElement("span", {
                className: "px-2 py-1 bg-red-100 text-red-800 rounded font-semibold"
            }, "FALTANDO"), React.createElement("span", {
                className: "px-2 py-1 bg-red-50 text-red-700 rounded font-semibold border-l-4 border-red-400"
            }, "EXCEDENTE"), React.createElement("span", {
                className: "px-2 py-1 bg-blue-50 text-blue-700 rounded font-semibold border-l-4 border-blue-400"
            }, "REPOSIÇÃO")))), "faltosos" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, "🔍 Filtros"), React.createElement("div", {
                className: "grid grid-cols-1 md:grid-cols-4 gap-3"
            }, React.createElement("div", null, React.createElement("label", {
                className: "text-xs text-gray-600"
            }, "Data Início"), React.createElement("input", {
                type: "date",
                value: p.faltososDataInicio || "",
                onChange: e => x({
                    ...p,
                    faltososDataInicio: e.target.value
                }),
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            })), React.createElement("div", null, React.createElement("label", {
                className: "text-xs text-gray-600"
            }, "Data Fim"), React.createElement("input", {
                type: "date",
                value: p.faltososDataFim || "",
                onChange: e => x({
                    ...p,
                    faltososDataFim: e.target.value
                }),
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            })), React.createElement("div", null, React.createElement("label", {
                className: "text-xs text-gray-600"
            }, "Loja"), React.createElement("select", {
                value: p.faltososLojaId || "",
                onChange: e => x({
                    ...p,
                    faltososLojaId: e.target.value
                }),
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            }, React.createElement("option", {
                value: ""
            }, "Todas as lojas"), (e.lojas || []).map(e => React.createElement("option", {
                key: e.id,
                value: e.id
            }, e.codigo, " - ", e.nome)))), React.createElement("div", {
                className: "flex items-end gap-2"
            }, React.createElement("button", {
                onClick: async () => {
                    try {
                        let e = `${API_URL}/disponibilidade/faltosos?`;
                        p.faltososDataInicio && (e += `data_inicio=${p.faltososDataInicio}&`), p.faltososDataFim && (e += `data_fim=${p.faltososDataFim}&`), p.faltososLojaId && (e += `loja_id=${p.faltososLojaId}`);
                        const t = await _fetch(e),
                            a = await t.json();
                        x(e => ({
                            ...e,
                            faltososLista: a
                        }))
                    } catch (e) {
                        ja("Erro ao buscar faltosos", "error")
                    }
                },
                className: "flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            }, "🔍 Buscar"), React.createElement("button", {
                onClick: async () => {
                    x(e => ({
                        ...e,
                        faltososDataInicio: "",
                        faltososDataFim: "",
                        faltososLojaId: ""
                    }));
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/faltosos`),
                            t = await e.json();
                        x(e => ({
                            ...e,
                            faltososLista: t
                        }))
                    } catch (e) {
                        ja("Erro ao buscar faltosos", "error")
                    }
                },
                className: "px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
            }, "🔄 Limpar")))), React.createElement("div", {
                className: "bg-white rounded-xl shadow overflow-hidden"
            }, React.createElement("div", {
                className: "px-4 py-3 bg-gray-50 border-b flex justify-between items-center"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800"
            }, "📋 Registro de Faltas (", (p.faltososLista || []).length, ")")), React.createElement("div", {
                className: "overflow-x-auto"
            }, React.createElement("table", {
                className: "w-full text-xs"
            }, React.createElement("thead", {
                className: "bg-gray-100"
            }, React.createElement("tr", null, React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "DATA"), React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "REGIÃO"), React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "LOJA"), React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "COD"), React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "PROFISSIONAL"), React.createElement("th", {
                className: "px-3 py-2 text-left"
            }, "MOTIVO"), React.createElement("th", {
                className: "px-3 py-2 text-center w-16"
            }, "AÇÃO"))), React.createElement("tbody", null, 0 === (p.faltososLista || []).length ? React.createElement("tr", null, React.createElement("td", {
                colSpan: "7",
                className: "px-3 py-8 text-center text-gray-500"
            }, "Nenhum registro de falta encontrado.")) : (p.faltososLista || []).map(e => React.createElement("tr", {
                key: e.id,
                className: "border-t hover:bg-gray-50"
            }, React.createElement("td", {
                className: "px-3 py-2"
            }, new Date(e.data_falta).toLocaleDateString("pt-BR")), React.createElement("td", {
                className: "px-3 py-2"
            }, e.regiao_nome), React.createElement("td", {
                className: "px-3 py-2 font-mono"
            }, e.loja_codigo, " - ", e.loja_nome), React.createElement("td", {
                className: "px-3 py-2 font-mono"
            }, e.cod_profissional || "-"), React.createElement("td", {
                className: "px-3 py-2"
            }, e.nome_profissional || "-"), React.createElement("td", {
                className: "px-3 py-2 text-red-600"
            }, e.motivo), React.createElement("td", {
                className: "px-3 py-2 text-center"
            }, React.createElement("button", {
                onClick: async () => {
                    if (window.confirm(`Excluir registro de falta de ${e.nome_profissional||e.cod_profissional}?`)) try {
                        await _fetch(`${API_URL}/disponibilidade/faltosos/${e.id}`, {
                            method: "DELETE"
                        }), x(t => ({
                            ...t,
                            faltososLista: t.faltososLista.filter(t => t.id !== e.id)
                        })), ja("✅ Falta excluída", "success")
                    } catch (e) {
                        ja("Erro ao excluir", "error")
                    }
                },
                className: "text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded",
                title: "Excluir falta"
            }, "🗑️"))))))))), "espelho" === t && React.createElement("div", {
                className: "space-y-4"
            }, React.createElement("div", {
                className: "bg-white rounded-xl shadow p-4"
            }, React.createElement("h3", {
                className: "font-bold text-gray-800 mb-3"
            }, "🪞 Histórico de Planilhas"), React.createElement("div", {
                className: "flex gap-3 items-end"
            }, React.createElement("div", {
                className: "flex-1"
            }, React.createElement("label", {
                className: "text-xs text-gray-600"
            }, "Selecione a data"), React.createElement("select", {
                value: p.espelhoDataSelecionada || "",
                onChange: async e => {
                    const t = e.target.value;
                    if (x(e => ({
                            ...e,
                            espelhoDataSelecionada: t,
                            espelhoCarregando: !0
                        })), t) try {
                        const e = await _fetch(`${API_URL}/disponibilidade/espelho/${t}`),
                            a = await e.json();
                        console.log("Espelho carregado:", a), x(e => ({
                            ...e,
                            espelhoDados: a.dados,
                            espelhoCarregando: !1
                        }))
                    } catch (e) {
                        console.error("Erro ao carregar espelho:", e), ja("Erro ao carregar espelho", "error"), x(e => ({
                            ...e,
                            espelhoCarregando: !1
                        }))
                    } else x(e => ({
                        ...e,
                        espelhoDados: null,
                        espelhoCarregando: !1
                    }))
                },
                className: "w-full px-3 py-2 border rounded-lg text-sm"
            }, React.createElement("option", {
                value: ""
            }, "Selecione uma data..."), (p.espelhoDatas || []).map(e => {
                const t = e.data_registro?.split("T")[0] || e.data_registro,
                    [a, l, r] = (t || "").split("-"),
                    o = a && l && r ? `${r}/${l}/${a}` : t;
                return React.createElement("option", {
                    key: e.id,
                    value: t
                }, o)
            }))), React.createElement("button", {
                onClick: async () => {
                    try {
                        const e = await _fetch(`${API_URL}/disponibilidade/espelho`),
                            t = await e.json();
                        console.log("Datas espelho:", t), x(e => ({
                            ...e,
                            espelhoDatas: t
                        })), ja(`${t.length} data(s) encontrada(s)!`, "success")
                    } catch (e) {
                        ja("Erro ao carregar datas", "error")
                    }
                },
                className: "px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
            }, "🔄 Atualizar"), p.espelhoDataSelecionada && React.createElement("button", {
                onClick: async () => {
                    const e = (p.espelhoDatas || []).find(e => (e.data_registro?.split("T")[0] || e.data_registro) === p.espelhoDataSelecionada);
                    if (!e) return;
                    const t = p.espelhoDataSelecionada.split("-").reverse().join("/");
                    if (window.confirm(`⚠️ Excluir espelho de ${t}?\n\nEssa ação não pode ser desfeita.`)) try {
                        await _fetch(`${API_URL}/disponibilidade/espelho/${e.id}`, {
                            method: "DELETE"
                        });
                        const a = await _fetch(`${API_URL}/disponibilidade/espelho`),
                            l = await a.json();
                        x(e => ({
                            ...e,
                            espelhoDatas: l,
                            espelhoDataSelecionada: "",
                            espelhoDados: null
                        })), ja(`✅ Espelho de ${t} excluído`, "success")
                    } catch (e) {
                        ja("Erro ao excluir espelho", "error")
                    }
                },
                className: "px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200"
            }, "🗑️ Excluir")), React.createElement("p", {
                className: "text-xs text-gray-500 mt-2"
            }, 0 === (p.espelhoDatas || []).length ? 'Nenhum espelho salvo ainda. Use "Resetar Status" para criar o primeiro.' : `${(p.espelhoDatas||[]).length} espelho(s) disponível(is)`)), p.espelhoCarregando ? React.createElement("div", {
                className: "bg-white rounded-xl shadow p-8 text-center"
            }, React.createElement("div", {
                className: "animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"
            }), React.createElement("p", {
                className: "mt-2 text-gray-500"
            }, "Carregando...")) : p.espelhoDados ? React.createElement("div", {
                className: "space-y-4"
            }, (() => {
                const e = "string" == typeof p.espelhoDados ? JSON.parse(p.espelhoDados) : p.espelhoDados;
                return console.log("Dados do espelho:", e), e && e.regioes && 0 !== e.regioes.length ? (e.regioes || []).map(t => {
                    const a = (e.lojas || []).filter(e => e.regiao_id === t.id);
                    return 0 === a.length ? null : React.createElement("div", {
                        key: t.id,
                        className: "bg-white rounded-xl shadow overflow-hidden"
                    }, React.createElement("div", {
                        className: "bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2"
                    }, React.createElement("h3", {
                        className: "font-bold text-white text-sm"
                    }, "📍 ", t.nome)), a.map(t => {
                        const a = (e.linhas || []).filter(e => e.loja_id === t.id);
                        return React.createElement("div", {
                            key: t.id,
                            className: "border-t"
                        }, React.createElement("div", {
                            className: "px-3 py-2 bg-gray-50 font-semibold text-sm"
                        }, t.codigo, " - ", t.nome), React.createElement("table", {
                            className: "w-full text-xs"
                        }, React.createElement("tbody", null, [...a].sort((e, t) => e.is_reposicao && !t.is_reposicao ? -1 : !e.is_reposicao && t.is_reposicao || e.is_excedente && !t.is_excedente ? 1 : !e.is_excedente && t.is_excedente ? -1 : 0).map(e => React.createElement("tr", {
                            key: e.id,
                            className: `border-t ${e.is_excedente?"bg-red-50":""} ${e.is_reposicao?"bg-blue-50":""}`
                        }, React.createElement("td", {
                            className: `w-1 ${e.is_excedente?"bg-red-400":""} ${e.is_reposicao?"bg-blue-400":""}`
                        }), React.createElement("td", {
                            className: "px-2 py-1 font-mono w-20"
                        }, e.cod_profissional || "-"), React.createElement("td", {
                            className: "px-2 py-1"
                        }, React.createElement("div", {
                            className: "flex items-center gap-1"
                        }, e.is_reposicao && React.createElement("span", {
                            className: "text-[9px] text-blue-400 italic"
                        }, "reposição"), e.is_excedente && React.createElement("span", {
                            className: "text-[9px] text-red-400 italic"
                        }, "excedente"), React.createElement("span", null, e.nome_profissional || (e.is_reposicao || e.is_excedente ? "" : "-")))), React.createElement("td", {
                            className: "px-2 py-1 w-28"
                        }, React.createElement("span", {
                            className: "px-1 py-0.5 rounded text-xs " + ("EM LOJA" === e.status ? "bg-blue-100 text-blue-800" : "CONFIRMADO" === e.status ? "bg-green-100 text-green-800" : "FALTANDO" === e.status ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800")
                        }, e.status)), React.createElement("td", {
                            className: "px-2 py-1 text-gray-500"
                        }, e.observacao || ""))))))
                    }))
                }) : React.createElement("div", {
                    className: "bg-white rounded-xl shadow p-8 text-center"
                }, React.createElement("p", {
                    className: "text-gray-500"
                }, "Espelho vazio ou sem dados"))
            })()) : React.createElement("div", {
                className: "bg-white rounded-xl shadow p-8 text-center"
            }, React.createElement("p", {
                className: "text-gray-500"
            }, "Selecione uma data para visualizar o histórico"))))

    };

    window.ModuloDisponibilidadeLoaded = true;
    console.log("✅ Módulo Disponibilidade carregado!");

})();
