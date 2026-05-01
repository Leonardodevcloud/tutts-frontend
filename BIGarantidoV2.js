/* ============================================================================
 * BIGarantidoV2.js
 * Tela refatorada da aba "Garantido" do BI (substitui o bloco antigo
 * de app.js linhas 17619-18175).
 *
 * O QUE MUDA:
 *   - Hero verde gigante → ícone + título compacto numa linha
 *   - 4 cards KPI gigantes → KPIs inline ao lado do título
 *   - Filtros 5-coluna grid → linha compacta com labels pequenas
 *   - Pills de filtro rápido → chips estilo Linear
 *   - Cabeçalho de cliente roxo gritante → roxo claro com stats inline
 *   - Tabela: barra de progresso visual Negociado vs Produção
 *   - Status pagamento mantido funcional (select com opções)
 *
 * O QUE PRESERVA (igual antes):
 *   - Sub-abas "Análise" / "Semanal" / "Por Cliente" (renderizadas pelo parent)
 *   - Lógica de status (auto vs salvo)
 *   - Modal de reprovação com motivo
 *   - Todos os filtros (filtro_status, datas, códigos)
 *   - Função salvarStatusGarantido
 *
 * Props necessárias:
 *   - garantidoData, garantidoStats, garantidoStatusMap, garantidoLoading
 *   - garantidoFiltros, setGarantidoFiltros
 *   - garantidoSubTab, setGarantidoSubTab
 *   - carregarGarantido, salvarStatusGarantido
 *   - setGarantidoModalStatus, setGarantidoMotivoReprovado
 *   - il (lookup de nome cliente por código)
 *   - renderSemanal, renderCliente: funções que renderizam as sub-abas (do parent)
 * ============================================================================ */

window.BIGarantidoV2 = function BIGarantidoV2(props) {
  const {
    garantidoData,
    garantidoStats,
    garantidoStatusMap,
    garantidoLoading,
    garantidoFiltros,
    setGarantidoFiltros,
    garantidoSubTab,
    setGarantidoSubTab,
    carregarGarantido,
    salvarStatusGarantido,
    setGarantidoModalStatus,
    setGarantidoMotivoReprovado,
    il,
    renderSemanal,
    renderCliente,
  } = props;

  const e = React.createElement;

  // Helpers locais
  const fmtBRL = (v) => "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtBRLshort = (v) => "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  const fmtData = (s) => s ? new Date(s + "T12:00:00").toLocaleDateString("pt-BR") : "—";

  const iniciaisDe = (nome) => {
    if (!nome) return "??";
    const partes = String(nome).trim().split(/\s+/).filter(p => p.length >= 2);
    if (partes.length === 0) return "??";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };
  const corAvatar = (cod) => {
    const seed = String(cod || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const gradients = [
      "linear-gradient(135deg, #534AB7, #378ADD)",
      "linear-gradient(135deg, #BA7517, #EF9F27)",
      "linear-gradient(135deg, #1D9E75, #5DCAA5)",
      "linear-gradient(135deg, #BE185D, #EC4899)",
      "linear-gradient(135deg, #0E7490, #06B6D4)",
    ];
    return gradients[seed % gradients.length];
  };

  // Aplicar filtro rápido (chips)
  const aplicarFiltroRapido = (status) => {
    setGarantidoFiltros(f => ({ ...f, filtro_status: status }));
    setTimeout(carregarGarantido, 100);
  };

  return e("div", {
    className: "max-w-7xl mx-auto p-6",
    style: { display: "flex", flexDirection: "column", gap: 12 }
  },

    // ====================== TOOLBAR (header + KPIs + filtros) ======================
    e("div", {
      style: {
        background: "white",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "14px 18px",
      }
    },
      // Top: título + KPIs inline
      e("div", {
        style: {
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #F3F4F6",
          flexWrap: "wrap", gap: 12,
        }
      },
        // Title block
        e("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
          e("div", {
            style: {
              width: 32, height: 32, borderRadius: 8,
              background: "#DCFCE7", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 16,
            }
          }, "💰"),
          e("div", null,
            e("p", { style: { fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 } }, "Mínimo Garantido"),
            e("p", { style: { fontSize: 11, color: "#6b7280", margin: "1px 0 0" } }, "Comparativo entre negociado e produção · " + new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }))
          )
        ),

        // KPIs inline
        garantidoStats && e("div", { style: { display: "flex", gap: 22, alignItems: "center" } },
          kpiInline(e, "Negociado", fmtBRLshort(garantidoStats.total_negociado || 0), "#534AB7"),
          kpiInline(e, "Produção", fmtBRLshort(garantidoStats.total_produzido || 0), "#111827"),
          kpiInline(e, "A pagar", fmtBRLshort(garantidoStats.total_complemento || 0), "#BA7517"),
          (garantidoStats.valor_nao_rodou > 0) && kpiInline(e, "Não rodou", fmtBRLshort(garantidoStats.valor_nao_rodou || 0), "#9CA3AF"),
        ),
      ),

      // Bottom: filtros compactos
      e("div", {
        style: {
          display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap",
        }
      },
        filterField(e, "Data início",
          e("input", {
            type: "date",
            value: garantidoFiltros.data_inicio || "",
            onChange: (ev) => setGarantidoFiltros(f => ({ ...f, data_inicio: ev.target.value })),
            style: filterInputStyle,
          })
        ),
        filterField(e, "Data fim",
          e("input", {
            type: "date",
            value: garantidoFiltros.data_fim || "",
            onChange: (ev) => setGarantidoFiltros(f => ({ ...f, data_fim: ev.target.value })),
            style: filterInputStyle,
          })
        ),
        e("div", { style: { width: 1, height: 32, background: "#E5E7EB", margin: "0 4px", alignSelf: "end", marginBottom: 5 } }),
        filterField(e, "Cód. cliente",
          e("input", {
            type: "text",
            value: garantidoFiltros.cod_cliente || "",
            onChange: (ev) => setGarantidoFiltros(f => ({ ...f, cod_cliente: ev.target.value })),
            placeholder: "Ex: 767",
            style: filterInputStyle,
          })
        ),
        filterField(e, "Cód. profissional",
          e("input", {
            type: "text",
            value: garantidoFiltros.cod_prof || "",
            onChange: (ev) => setGarantidoFiltros(f => ({ ...f, cod_prof: ev.target.value })),
            placeholder: "Ex: 12345",
            style: filterInputStyle,
          })
        ),
        e("div", { style: { flex: 1 } }),
        e("button", {
          onClick: carregarGarantido,
          disabled: garantidoLoading,
          style: {
            background: "white", color: "#4B5563",
            border: "1px solid #E5E7EB", borderRadius: 6,
            padding: "6px 12px", fontSize: 12,
            cursor: garantidoLoading ? "wait" : "pointer",
            height: 30, alignSelf: "end",
            opacity: garantidoLoading ? 0.6 : 1,
          }
        }, garantidoLoading ? "🔄 Carregando..." : "↻ Atualizar"),
        e("button", {
          onClick: carregarGarantido,
          disabled: garantidoLoading,
          style: {
            background: "#534AB7", color: "white",
            border: "none", borderRadius: 6,
            padding: "6px 14px", fontSize: 12, fontWeight: 500,
            cursor: garantidoLoading ? "wait" : "pointer",
            height: 30, alignSelf: "end",
          }
        }, "Filtrar"),
      ),
    ),

    // ====================== CHIPS DE FILTRO + ABAS ======================
    e("div", {
      style: {
        background: "white",
        border: "1px solid #E5E7EB",
        borderRadius: "10px 10px 0 0",
        borderBottom: "none",
        padding: "8px 14px",
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      }
    },
      ...[
        { id: "todos", label: "Todos", color: "default" },
        { id: "abaixo", label: "Abaixo", color: "red" },
        { id: "acima", label: "Acima", color: "green" },
        { id: "nao_rodou", label: "Não rodou", color: "gray" },
        { id: "rodou", label: "Rodou", color: "blue" },
      ].map(c => chipFiltro(e, c, garantidoFiltros.filtro_status, aplicarFiltroRapido)),

      e("div", { style: { width: 1, height: 18, background: "#E5E7EB", margin: "0 4px" } }),

      // Sub-tabs
      e("div", {
        style: {
          display: "inline-flex", border: "1px solid #E5E7EB",
          borderRadius: 6, overflow: "hidden", background: "#F9FAFB",
        }
      },
        ...[
          { id: "analise", label: "Garantido" },
          { id: "semanal", label: "Semanal" },
          { id: "cliente", label: "Por cliente" },
        ].map(t => {
          const ativa = garantidoSubTab === t.id;
          return e("button", {
            key: t.id,
            onClick: () => setGarantidoSubTab(t.id),
            style: {
              border: "none", padding: "4px 12px",
              fontSize: 11, fontWeight: 500,
              color: ativa ? "#111827" : "#6b7280",
              background: ativa ? "white" : "transparent",
              boxShadow: ativa ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              cursor: "pointer",
            }
          }, t.label);
        })
      ),

      e("div", { style: { flex: 1 } }),
    ),

    // ====================== LOADING ======================
    garantidoLoading && e("div", {
      style: { background: "white", border: "1px solid #E5E7EB", padding: 48, textAlign: "center", borderRadius: "0 0 10px 10px" }
    },
      e("div", {
        style: {
          display: "inline-block", width: 36, height: 36,
          border: "3px solid #E5E7EB", borderTopColor: "#534AB7",
          borderRadius: "50%", animation: "tuttsSpin 0.8s linear infinite",
          marginBottom: 10,
        }
      }),
      e("p", { style: { color: "#6b7280", fontSize: 13, margin: 0 } }, "Carregando dados do garantido...")
    ),

    // ====================== CONTEÚDO SUB-ABA: ANÁLISE ======================
    !garantidoLoading && garantidoSubTab === "analise" && renderTabelaAnalise({
      e, garantidoData, garantidoStatusMap, garantidoStats,
      salvarStatusGarantido, setGarantidoModalStatus, setGarantidoMotivoReprovado,
      il, fmtBRL, fmtData, iniciaisDe, corAvatar,
    }),

    // ====================== SUB-ABA: SEMANAL (preserva implementação antiga via callback) ======================
    !garantidoLoading && garantidoSubTab === "semanal" && (renderSemanal ? renderSemanal() : e("div", {
      style: { background: "white", border: "1px solid #E5E7EB", padding: 32, textAlign: "center", borderRadius: "0 0 10px 10px", color: "#9CA3AF" }
    }, "Sub-aba Semanal indisponível")),

    // ====================== SUB-ABA: POR CLIENTE ======================
    !garantidoLoading && garantidoSubTab === "cliente" && (renderCliente ? renderCliente() : e("div", {
      style: { background: "white", border: "1px solid #E5E7EB", padding: 32, textAlign: "center", borderRadius: "0 0 10px 10px", color: "#9CA3AF" }
    }, "Sub-aba Por Cliente indisponível")),
  );
};

// ────────────────────────────────────────────────────────────────────────────
// RENDER TABELA ANÁLISE (a parte refeita)
// ────────────────────────────────────────────────────────────────────────────
function renderTabelaAnalise({ e, garantidoData, garantidoStatusMap, garantidoStats, salvarStatusGarantido, setGarantidoModalStatus, setGarantidoMotivoReprovado, il, fmtBRL, fmtData, iniciaisDe, corAvatar }) {
  if (!garantidoData || garantidoData.length === 0) {
    return e("div", {
      style: { background: "white", border: "1px solid #E5E7EB", padding: 48, textAlign: "center", color: "#9CA3AF", borderRadius: "0 0 10px 10px" }
    },
      e("div", { style: { fontSize: 32, marginBottom: 8 } }, "📊"),
      e("p", { style: { fontSize: 13, margin: 0 } }, "Nenhum dado encontrado. Ajuste os filtros ou verifique a planilha.")
    );
  }

  // Ordenar e agrupar por cliente
  const sorted = [...garantidoData].sort((a, b) => {
    const ca = String(a.cod_cliente_garantido || "");
    const cb = String(b.cod_cliente_garantido || "");
    if (ca !== cb) return ca.localeCompare(cb, "pt-BR", { numeric: true });
    return (a.profissional || "").localeCompare(b.profissional || "", "pt-BR");
  });

  // Agrupar
  const grupos = {};
  sorted.forEach(r => {
    const k = String(r.cod_cliente_garantido || "Sem cliente");
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push(r);
  });

  const renderRow = (row, idx) => {
    const statusKey = row.cod_prof + "_" + row.data + "_" + row.cod_cliente_garantido;
    const statusInfo = garantidoStatusMap[statusKey];
    const statusSalvo = statusInfo?.status || null;
    let autoStatus = null;
    if (row.status === "nao_rodou" || (row.entregas === 0 && (!row.valor_produzido || row.valor_produzido === 0))) {
      autoStatus = "nao_rodou";
    } else if (row.valor_produzido > row.valor_negociado) {
      autoStatus = "ultrapassou";
    }
    const statusEfetivo = statusSalvo || autoStatus || "analise";

    // Determinar status visual (acima/abaixo/igual)
    let statusIcon = "—";
    let statusIconBg = "#F3F4F6";
    let statusIconColor = "#6b7280";
    if (autoStatus === "nao_rodou") {
      statusIcon = "○";
      statusIconBg = "#1F2937";
      statusIconColor = "white";
    } else if (row.valor_produzido > row.valor_negociado) {
      statusIcon = "↑";
      statusIconBg = "#D1FAE5";
      statusIconColor = "#065F46";
    } else if (row.valor_produzido < row.valor_negociado) {
      statusIcon = "↓";
      statusIconBg = "#FEE2E2";
      statusIconColor = "#991B1B";
    }

    // Barra de progresso (% atingido)
    const pct = row.valor_negociado > 0
      ? Math.min(100, (row.valor_produzido / row.valor_negociado) * 100)
      : 0;
    const barColor = row.valor_produzido >= row.valor_negociado ? "#10B981" : "#EF4444";

    return e("tr", {
      key: idx,
      style: {
        borderBottom: "1px solid #F3F4F6",
        background: statusEfetivo === "lancado" ? "#F0FDF4" :
                    statusEfetivo === "reprovado" ? "#FEF2F2" :
                    statusEfetivo === "nao_rodou" ? "#FAFAFA" : "white",
      }
    },
      // Status icon
      e("td", { style: tdBordered({ textAlign: "center" }) },
        e("span", {
          style: {
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, borderRadius: "50%",
            fontSize: 12, fontWeight: 700,
            background: statusIconBg, color: statusIconColor,
          },
          title: autoStatus === "nao_rodou" ? "Não rodou" : row.valor_produzido > row.valor_negociado ? "Acima" : row.valor_produzido < row.valor_negociado ? "Abaixo" : "Igual"
        }, statusIcon)
      ),

      // Profissional + data
      e("td", { style: tdBordered() },
        e("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
          e("div", {
            style: {
              width: 28, height: 28, borderRadius: "50%",
              background: corAvatar(row.cod_prof), color: "white",
              fontSize: 10, fontWeight: 600,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }
          }, iniciaisDe(row.profissional)),
          e("div", null,
            e("div", { style: { fontWeight: 500, color: "#111827", fontSize: 13, lineHeight: 1.3 } }, row.profissional || "—"),
            e("div", { style: { fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#6B7280", marginTop: 1 } },
              row.cod_prof + " · " + fmtData(row.data))
          )
        )
      ),

      // Entregas
      e("td", { style: tdBordered({ textAlign: "center", color: "#374151", fontVariantNumeric: "tabular-nums", fontSize: 13 }) }, row.entregas || 0),

      // Negociado vs Produção (barra)
      e("td", { style: tdBordered() },
        e("div", { style: { display: "flex", flexDirection: "column", gap: 4, width: 160 } },
          e("div", { style: { height: 5, background: "#F3F4F6", borderRadius: 3, overflow: "hidden" } },
            e("div", { style: { height: "100%", width: pct + "%", background: barColor, transition: "width 0.3s" } })
          ),
          e("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12 } },
            e("span", { style: { color: row.valor_produzido >= row.valor_negociado ? "#0F6E56" : "#991B1B", fontWeight: 600, fontVariantNumeric: "tabular-nums" } },
              fmtBRL(row.valor_produzido || 0)),
            e("span", { style: { color: "#6B7280", fontVariantNumeric: "tabular-nums" } },
              "/ " + fmtBRL(row.valor_negociado || 0))
          )
        )
      ),

      // Complemento
      e("td", { style: tdBordered({ textAlign: "right" }) },
        e("span", {
          style: {
            display: "inline-flex", alignItems: "center", gap: 3,
            padding: "3px 10px", borderRadius: 999,
            fontSize: 12, fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            background: row.complemento > 0 ? "#FEE2E2" : "#D1FAE5",
            color: row.complemento > 0 ? "#991B1B" : "#065F46",
          }
        }, row.complemento > 0 ? "+" : "", fmtBRL(row.complemento || 0))
      ),

      // Status pagamento (select compacto + meta inline)
      e("td", { style: tdBordered({ width: 180, borderRight: "none" }) },
        e("div", { style: { display: "flex", flexDirection: "column", gap: 2 } },
          e("select", {
            value: statusEfetivo,
            onChange: (ev) => {
              const novo = ev.target.value;
              if (novo === "reprovado") {
                setGarantidoModalStatus(row);
                setGarantidoMotivoReprovado("");
              } else {
                salvarStatusGarantido(row, novo);
              }
            },
            style: {
              padding: "3px 6px",
              fontSize: 11, fontWeight: 500,
              borderRadius: 4,
              border: "1px solid",
              maxWidth: 150,
              borderColor: statusEfetivo === "lancado" ? "#86EFAC" :
                           statusEfetivo === "reprovado" ? "#FCA5A5" :
                           statusEfetivo === "nao_rodou" ? "#D1D5DB" :
                           statusEfetivo === "ultrapassou" ? "#93C5FD" : "#FCD34D",
              background: statusEfetivo === "lancado" ? "#D1FAE5" :
                          statusEfetivo === "reprovado" ? "#FEE2E2" :
                          statusEfetivo === "nao_rodou" ? "#F3F4F6" :
                          statusEfetivo === "ultrapassou" ? "#DBEAFE" : "#FEF3C7",
              color: statusEfetivo === "lancado" ? "#065F46" :
                     statusEfetivo === "reprovado" ? "#991B1B" :
                     statusEfetivo === "nao_rodou" ? "#374151" :
                     statusEfetivo === "ultrapassou" ? "#1E40AF" : "#92400E",
              cursor: "pointer",
            }
          },
            e("option", { value: "analise" }, "🔍 Análise"),
            e("option", { value: "nao_rodou" }, "⚫ Não Rodou"),
            e("option", { value: "ultrapassou" }, "🔵 Ultrapassou"),
            e("option", { value: "lancado" }, "✅ Lançado"),
            e("option", { value: "reprovado" }, "❌ Reprovado")
          ),
          // Meta compacta + escura
          !statusSalvo && autoStatus && e("span", {
            style: { fontSize: 10, color: "#6B7280", fontStyle: "italic" }
          }, "auto"),
          statusInfo?.alterado_por && e("span", {
            style: { fontSize: 10, color: "#6B7280" }
          }, statusInfo.alterado_por +
            (statusInfo.alterado_em ? " · " + new Date(statusInfo.alterado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "")),
          statusEfetivo === "reprovado" && statusInfo?.motivo_reprovado && e("span", {
            style: { fontSize: 10, color: "#991B1B", fontStyle: "italic", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
            title: statusInfo.motivo_reprovado
          }, "📝 " + statusInfo.motivo_reprovado)
        )
      ),
    );
  };

  return e("div", {
    style: { background: "white", border: "1px solid #E5E7EB", borderRadius: "0 0 10px 10px", overflow: "hidden" }
  },
    e("div", { style: { overflowX: "auto" } },
      e("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
        e("thead", null,
          e("tr", null,
            e("th", { style: { ...thStyle(), width: 32 } }, ""),
            e("th", { style: thStyle() }, "Profissional"),
            e("th", { style: { ...thStyle(), textAlign: "center" } }, "Entregas"),
            e("th", { style: thStyle() }, "Negociado vs Produção"),
            e("th", { style: { ...thStyle(), textAlign: "right" } }, "Complemento"),
            e("th", { style: { ...thStyle(), borderRight: "none" } }, "Pagamento"),
          )
        ),
        e("tbody", null,
          ...Object.keys(grupos).map(clienteKey => {
            const linhas = grupos[clienteKey];
            const nomeCliente = il && typeof il === "function" ? il(clienteKey) : null;
            // Fallbacks pra nome do cliente: máscara → nome_cliente_garantido → onde_rodou parsed
            let nomeFinal = nomeCliente || (linhas[0]?.nome_cliente_garantido) || "";
            if (!nomeFinal && linhas[0]?.onde_rodou) {
              // Tenta extrair nome do "onde_rodou" tipo "17 - Embrepar / 17- EMBREPAR"
              const m = String(linhas[0].onde_rodou).match(/[-\s]+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s]+?)(?:\s*\/|\s*$)/);
              if (m && m[1]) nomeFinal = m[1].trim();
            }
            const totalNeg = linhas.reduce((s, r) => s + (r.valor_negociado || 0), 0);
            const totalProd = linhas.reduce((s, r) => s + (r.valor_produzido || 0), 0);
            const diff = totalProd - totalNeg;

            // 2026-05-01: subgrupos por centro de custo (onde_rodou)
            // Ordena linhas por onde_rodou pra ficar agrupado
            const linhasPorCentro = {};
            linhas.forEach(r => {
              const k = r.onde_rodou || "(sem centro)";
              if (!linhasPorCentro[k]) linhasPorCentro[k] = [];
              linhasPorCentro[k].push(r);
            });
            // Se só tem 1 centro de custo, não vale a pena mostrar sub-cabeçalho
            const centrosCusto = Object.keys(linhasPorCentro);
            const temMultiplosCentros = centrosCusto.length > 1;

            return [
              // Cabeçalho do cliente (mais sutil)
              e("tr", { key: "head-" + clienteKey, style: { background: "#FAF7FF", borderTop: "1px solid #E5E7EB" } },
                e("td", { colSpan: 6, style: { padding: "10px 12px" } },
                  e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, flexWrap: "wrap", gap: 8 } },
                    e("span", {
                      style: { fontWeight: 600, color: "#534AB7", display: "inline-flex", alignItems: "center", gap: 8 }
                    },
                      e("span", {
                        style: {
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          minWidth: 26, padding: "0 7px", height: 22,
                          background: "#534AB7", color: "white",
                          borderRadius: 5, fontSize: 11, fontWeight: 700,
                        }
                      }, clienteKey),
                      nomeFinal || ""
                    ),
                    e("span", { style: { display: "flex", gap: 16, fontSize: 12, color: "#4B5563", flexWrap: "wrap" } },
                      e("span", null, linhas.length + " prof" + (linhas.length > 1 ? "s" : "")),
                      e("span", null, "Negociado: ", e("strong", { style: { color: "#111827", fontWeight: 600 } }, fmtBRL(totalNeg))),
                      e("span", null, "Produção: ", e("strong", { style: { color: "#111827", fontWeight: 600 } }, fmtBRL(totalProd))),
                      e("span", { style: { color: diff < 0 ? "#991B1B" : "#0F6E56" } }, "Δ ", e("strong", { style: { fontWeight: 600 } }, (diff >= 0 ? "+" : "") + fmtBRL(diff))),
                    )
                  )
                )
              ),
              // 2026-05-01: iterar por centro de custo
              ...centrosCusto.flatMap(centro => {
                const linhasCentro = linhasPorCentro[centro];
                const subRows = [];
                // Sub-cabeçalho de centro de custo (só se cliente tem MAIS DE UM centro)
                if (temMultiplosCentros) {
                  subRows.push(
                    e("tr", { key: "centro-" + clienteKey + "-" + centro, style: { background: "#F9FAFB" } },
                      e("td", {
                        colSpan: 6,
                        style: {
                          padding: "6px 12px 6px 24px",
                          fontSize: 11,
                          color: "#6B7280",
                          fontWeight: 500,
                          borderTop: "1px solid #F3F4F6",
                        }
                      },
                        "📍 ", centro,
                        e("span", { style: { color: "#9CA3AF", marginLeft: 8, fontWeight: 400 } },
                          "· " + linhasCentro.length + " " + (linhasCentro.length > 1 ? "profs" : "prof"))
                      )
                    )
                  );
                }
                // Linhas de motoboys desse centro
                linhasCentro.forEach((row, i) => {
                  subRows.push(renderRow(row, clienteKey + "-" + centro + "-" + i));
                });
                return subRows;
              })
            ];
          }).flat(),

          // Linha de totais
          garantidoStats && e("tr", { style: { background: "#F9FAFB", borderTop: "2px solid #D1D5DB", fontWeight: 600 } },
            e("td", { style: { padding: "12px", color: "#4B5563", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", borderRight: "1px solid #F3F4F6" }, colSpan: 2 }, "Total geral"),
            e("td", { style: { padding: "12px", textAlign: "center", color: "#111827", fontVariantNumeric: "tabular-nums", fontSize: 13, borderRight: "1px solid #F3F4F6" } },
              garantidoStats.total_entregas || garantidoData.reduce((s, r) => s + (r.entregas || 0), 0)),
            e("td", { style: { padding: "12px", color: "#111827", fontSize: 12, borderRight: "1px solid #F3F4F6" } },
              fmtBRL(garantidoStats.total_produzido || 0) + " / " + fmtBRL(garantidoStats.total_negociado || 0)),
            e("td", { style: { padding: "12px", textAlign: "right", color: "#991B1B", fontVariantNumeric: "tabular-nums", fontSize: 13, borderRight: "1px solid #F3F4F6" } },
              fmtBRL(garantidoStats.total_complemento || 0)),
            e("td", { style: { padding: "12px" } }, ""),
          )
        )
      )
    )
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS DE COMPONENTES PEQUENOS
// ────────────────────────────────────────────────────────────────────────────
function kpiInline(e, label, value, color) {
  return e("div", { style: { display: "flex", flexDirection: "column" } },
    e("span", { style: { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.4px" } }, label),
    e("span", { style: { fontSize: 16, fontWeight: 600, color, lineHeight: 1, marginTop: 2, fontVariantNumeric: "tabular-nums" } }, value)
  );
}

function filterField(e, label, input) {
  return e("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
    e("label", { style: { fontSize: 10, color: "#6b7280", fontWeight: 500 } }, label),
    input
  );
}

const filterInputStyle = {
  border: "1px solid #E5E7EB",
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: 12,
  background: "white",
  width: 130,
  height: 30,
  boxSizing: "border-box",
};

function chipFiltro(e, opt, ativoAtual, onClick) {
  const ativo = (ativoAtual || "todos") === opt.id;
  // Cores por tipo
  const styles = {
    default: { bg: ativo ? "#534AB7" : "#F3F4F6", color: ativo ? "white" : "#4B5563" },
    red: { bg: ativo ? "#DC2626" : "#FEE2E2", color: ativo ? "white" : "#991B1B" },
    green: { bg: ativo ? "#0F6E56" : "#D1FAE5", color: ativo ? "white" : "#065F46" },
    gray: { bg: ativo ? "#1F2937" : "#F3F4F6", color: ativo ? "white" : "#6b7280" },
    blue: { bg: ativo ? "#1D4ED8" : "#DBEAFE", color: ativo ? "white" : "#1E40AF" },
  };
  const s = styles[opt.color] || styles.default;
  return e("button", {
    key: opt.id,
    onClick: () => onClick(opt.id),
    style: {
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 500,
      cursor: "pointer", border: "none",
      background: s.bg, color: s.color,
    }
  }, opt.label);
}

function thStyle() {
  return {
    textAlign: "left",
    fontSize: 11, fontWeight: 600,
    color: "#4B5563",
    textTransform: "uppercase", letterSpacing: "0.4px",
    padding: "10px 12px",
    background: "#F9FAFB",
    borderBottom: "1px solid #E5E7EB",
    borderRight: "1px solid #F3F4F6",
  };
}

// Helper: célula com bordas (estilo "table-bordered" pra eliminar sensação de vazio)
function tdBordered(extra) {
  return Object.assign({
    padding: "10px 12px",
    verticalAlign: "middle",
    borderRight: "1px solid #F3F4F6",
    borderBottom: "1px solid #F3F4F6",
  }, extra || {});
}

// Animação spin (precisa estar em CSS — vai pro index.html)
if (typeof document !== "undefined" && !document.getElementById("tutts-spin-keyframes")) {
  const styleEl = document.createElement("style");
  styleEl.id = "tutts-spin-keyframes";
  styleEl.textContent = "@keyframes tuttsSpin { to { transform: rotate(360deg); } }";
  document.head.appendChild(styleEl);
}
