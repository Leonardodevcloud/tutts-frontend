/* ============================================================================
 * ModuloFinanceiroSolicitacoesV2.js
 * Tela refatorada de "Solicitações de Saque" (substitui o bloco antigo
 * de ModuloFinanceiro.js linhas 1218-1824).
 *
 * Props recebidas:
 *   - q: lista completa de saques (state W do parent)
 *   - U: setter de q (pra optimistic updates)
 *   - p, x: state local + setter (compatível com o padrão atual)
 *   - z, B: array IDs selecionados + setter
 *   - solicitacoesPagina, setSolicitacoesPagina, solicitacoesPorPagina
 *   - Jl: handler de mudar status (aprovar/rejeitar/etc)
 *   - er: formatador de moeda
 *   - ja: toast notification
 *   - acertoRealizado, setAcertoRealizado
 *   - traduzirErroStarkFE
 *   - fetchAuth, API_URL
 *   - exportFn (botão exportar XLSX se existir)
 *
 * Mantém:
 *   - TODA lógica de filtros (status, atrasados, gratuidade, etc)
 *   - TODA lógica de bulk actions (selecionar, copiar, gerar lote)
 *   - Modal de gerar lote (renderizado pelo PARENT, V2 só dispara via state)
 *   - Modal de delete (renderizado pelo PARENT)
 *   - Modal de rejeição inline (foi pro DRAWER)
 *
 * Adiciona:
 *   - Hero rico (anel score + 4 KPIs + botão Gerar Lote no canto)
 *   - Toolbar com chips de filtro
 *   - Tabela compacta (clique abre drawer)
 *   - Drawer lateral com detalhes + ações (Aprovar/Rejeitar/Excluir/etc)
 *   - Tags ⚡ auto / ✋ manual
 *   - Linha do tempo no drawer
 * ============================================================================ */

window.SolicitacoesV2 = function SolicitacoesV2(props) {
  const {
    q, U, p, x, z, B,
    solicitacoesPagina, setSolicitacoesPagina, solicitacoesPorPagina,
    Jl, er, ja,
    acertoRealizado, setAcertoRealizado,
    traduzirErroStarkFE,
    fetchAuth, API_URL,
    exportarXLSXSaques,
    abrirQRPix, // 2026-04-30: botão 💠 ao lado da chave PIX abre PixQRCodeModal (saque manual)
  } = props;

  const e = React.createElement;
  const [drawerSaque, setDrawerSaque] = React.useState(null);
  const [drawerEditandoStatus, setDrawerEditandoStatus] = React.useState(false);
  const [drawerMotivoRej, setDrawerMotivoRej] = React.useState("");

  // ────────────────────────────────────────────────────────────────────────────
  // CÁLCULOS DE KPIs (mantém fórmulas exatas do hero antigo)
  // ────────────────────────────────────────────────────────────────────────────
  const isHorarioComercial = (dt) => {
    const t = new Date(dt);
    const a = t.getDay();
    const l = t.getHours() + t.getMinutes() / 60;
    return 0 !== a && (6 === a ? l >= 9 && l < 12 : l >= 9 && l < 18);
  };

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const saquesHoje = q.filter(s => new Date(s.created_at) >= inicioDia);
  const processadasHoje = saquesHoje.filter(s => "aguardando_aprovacao" !== s.status);
  const temposExec = saquesHoje
    .filter(s => ("aprovado" === s.status || "aprovado_gratuidade" === s.status) && s.updated_at && s.created_at && isHorarioComercial(s.created_at))
    .map(s => (new Date(s.updated_at) - new Date(s.created_at)) / 6e4)
    .filter(m => m > 0 && m <= 1440);
  const tempoMedio = temposExec.length > 0 ? Math.round(temposExec.reduce((a, b) => a + b, 0) / temposExec.length) : 0;
  const atrasados = saquesHoje.filter(s => "aguardando_aprovacao" === s.status && isHorarioComercial(s.created_at) && Date.now() - new Date(s.created_at).getTime() >= 36e5);
  const scoreSLA = 0 === atrasados.length ? 100 : Math.max(0, 100 - 20 * atrasados.length);
  const scoreTempo = tempoMedio <= 30 ? 100 : tempoMedio <= 60 ? 80 : tempoMedio <= 120 ? 60 : 40;
  const scoreFinal = Math.round((scoreSLA + scoreTempo) / 2);
  const totalAguardando = q.filter(s => "aguardando_aprovacao" === s.status).length;
  const movimentoHoje = processadasHoje.reduce((acc, s) => acc + parseFloat(s.requested_amount || 0), 0);

  // ────────────────────────────────────────────────────────────────────────────
  // FILTRO PRINCIPAL DA TABELA
  // ────────────────────────────────────────────────────────────────────────────
  const filtroAtual = p.filterStatus || "todas";
  const matchFiltro = (s) => {
    if (!p.filterStatus) return true;
    if ("atrasados" === p.filterStatus) {
      return "aguardando_aprovacao" === s.status && Date.now() - new Date(s.created_at).getTime() >= 36e5;
    }
    return s.status === p.filterStatus;
  };
  const filtradas = q.filter(matchFiltro);
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / solicitacoesPorPagina));
  const inicio = (solicitacoesPagina - 1) * solicitacoesPorPagina;
  const paginadas = filtradas.slice(inicio, inicio + solicitacoesPorPagina);

  // Contadores pra chips
  const cntAtrasados = q.filter(s => "aguardando_aprovacao" === s.status && Date.now() - new Date(s.created_at).getTime() >= 36e5).length;
  const cntAguardando = q.filter(s => "aguardando_aprovacao" === s.status).length;
  const cntAprovadas = q.filter(s => "aprovado" === s.status).length;
  const cntGratuidade = q.filter(s => "aprovado_gratuidade" === s.status).length;
  const cntRejeitadas = q.filter(s => "rejeitado" === s.status).length;
  const cntInativos = q.filter(s => "inativo" === s.status).length;

  // ────────────────────────────────────────────────────────────────────────────
  // HELPERS DE UI
  // ────────────────────────────────────────────────────────────────────────────
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

  const isAutoSaque = (s) => s.admin_name === "Sistema (Auto-Saque)";

  const statusLabelCurto = (s) => {
    if (s.stark_status === "pago" || s.status === "pago_stark") return { txt: "Pago", cor: "#065F46", bg: "#D1FAE5", dot: "#10B981" };
    if (s.stark_status === "em_lote") return { txt: "Em lote", cor: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" };
    if (s.stark_status === "processando") return { txt: "Processando", cor: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" };
    if (s.stark_status === "erro") return { txt: "Erro Stark", cor: "#991B1B", bg: "#FEE2E2", dot: "#EF4444" };
    if (s.status === "aprovado") return { txt: "Aprovado", cor: "#065F46", bg: "#D1FAE5", dot: "#10B981" };
    if (s.status === "aprovado_gratuidade") return { txt: "Aprov. (grat.)", cor: "#1E40AF", bg: "#DBEAFE", dot: "#3B82F6" };
    if (s.status === "rejeitado") return { txt: "Rejeitado", cor: "#991B1B", bg: "#FEE2E2", dot: "#EF4444" };
    if (s.status === "inativo") return { txt: "Inativo", cor: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" };
    if (s.status === "aguardando_pagamento_stark") return { txt: "Aguard. Pgto", cor: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" };
    return { txt: "Aguardando", cor: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" };
  };

  const formatHora = (dt) => new Date(dt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const formatData = (dt) => new Date(dt).toLocaleDateString("pt-BR");

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return e("div", { style: { display: "flex", flexDirection: "column", gap: 12 } },

    // ====================== HERO ======================
    e("div", {
      style: {
        background: "white",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "16px 22px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 24,
        alignItems: "center",
      }
    },
      // Score block
      e("div", { style: { display: "flex", alignItems: "center", gap: 14, paddingRight: 22, borderRight: "1px solid #E5E7EB" } },
        e("div", { style: { position: "relative", width: 64, height: 64 } },
          e("svg", { width: 64, height: 64, style: { transform: "rotate(-90deg)" } },
            e("circle", { cx: 32, cy: 32, r: 28, fill: "none", stroke: "#E5E7EB", strokeWidth: 5 }),
            e("circle", {
              cx: 32, cy: 32, r: 28, fill: "none",
              stroke: scoreFinal >= 80 ? "#1D9E75" : scoreFinal >= 50 ? "#F59E0B" : "#EF4444",
              strokeWidth: 5, strokeLinecap: "round",
              strokeDasharray: 175.9,
              strokeDashoffset: 175.9 - (175.9 * scoreFinal) / 100,
            })
          ),
          e("div", { style: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: scoreFinal >= 80 ? "#0F6E56" : scoreFinal >= 50 ? "#92400E" : "#991B1B" } }, scoreFinal)
        ),
        e("div", null,
          e("p", { style: { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 2px" } }, "Score do dia"),
          e("p", { style: { fontSize: 14, fontWeight: 600, color: scoreFinal >= 80 ? "#0F6E56" : scoreFinal >= 50 ? "#92400E" : "#991B1B", margin: 0 } }, scoreFinal >= 80 ? "Excelente" : scoreFinal >= 50 ? "Bom" : "Atenção"),
          e("p", { style: { fontSize: 11, color: "#9CA3AF", margin: "2px 0 0" } }, `SLA 1h: ${atrasados.length === 0 ? "100%" : "atenção"}`)
        )
      ),

      // 4 KPIs
      e("div", { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 } },
        e("div", null,
          e("p", { style: { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" } }, "Hoje"),
          e("p", { style: { fontSize: 22, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1 } }, saquesHoje.length),
          e("p", { style: { fontSize: 11, color: "#6b7280", marginTop: 4 } }, `${processadasHoje.length} processadas`)
        ),
        e("div", null,
          e("p", { style: { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" } }, "Tempo médio"),
          e("p", { style: { fontSize: 22, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1 } }, tempoMedio < 60 ? `${tempoMedio}min` : `${Math.floor(tempoMedio / 60)}h${tempoMedio % 60}m`),
          e("p", { style: { fontSize: 11, color: tempoMedio <= 30 ? "#0F6E56" : tempoMedio <= 60 ? "#BA7517" : "#991B1B", marginTop: 4 } }, tempoMedio <= 30 ? "Excelente" : tempoMedio <= 60 ? "Bom" : "Lento")
        ),
        e("div", null,
          e("p", { style: { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" } }, "Aguardando"),
          e("p", { style: { fontSize: 22, fontWeight: 600, color: "#111827", margin: 0, lineHeight: 1 } }, totalAguardando),
          e("p", { style: { fontSize: 11, color: "#6b7280", marginTop: 4 } }, totalAguardando === 0 ? "Nenhum em fila" : "em análise")
        ),
        e("div", null,
          e("p", { style: { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" } }, "Atrasados"),
          e("p", { style: { fontSize: 22, fontWeight: 600, color: atrasados.length === 0 ? "#111827" : "#991B1B", margin: 0, lineHeight: 1 } }, atrasados.length),
          e("p", { style: { fontSize: 11, color: atrasados.length === 0 ? "#0F6E56" : "#991B1B", marginTop: 4 } }, atrasados.length === 0 ? "Tudo no prazo" : "Ação necessária")
        )
      ),

      // Botão Gerar Lote
      e("div", { style: { display: "flex", flexDirection: "column", gap: 6, paddingLeft: 18, borderLeft: "1px solid #E5E7EB" } },
        e("button", {
          onClick: () => {
            const selecionadosValidos = q.filter(s =>
              z.includes(s.id) &&
              (s.status === 'aprovado' || s.status === 'aprovado_gratuidade' || s.status === 'aguardando_pagamento_stark') &&
              s.stark_status !== 'processando' && s.stark_status !== 'pago' && s.stark_status !== 'em_lote'
            );
            if (selecionadosValidos.length === 0) {
              ja('⚠️ Nenhum saque válido selecionado. Selecione apenas saques aprovados que não estejam em lote.', 'warning');
              return;
            }
            x(Object.assign({}, p, {
              modalGerarLote: true,
              loteValidos: selecionadosValidos,
              loteValorTotal: selecionadosValidos.reduce((a, s) => a + parseFloat(s.final_amount || 0), 0)
            }));
          },
          style: {
            background: "#534AB7", color: "white",
            border: "1px solid #534AB7",
            padding: "8px 14px", borderRadius: 8,
            fontSize: 12, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap",
          },
          title: z.length === 0 ? "Selecione saques antes de gerar o lote" : `Gerar lote com ${z.length} saques`,
        }, `+ Gerar Lote ${z.length > 0 ? `(${z.length})` : ""}`),
        e("button", {
          onClick: () => {
            const selecionados = q.filter(s => z.includes(s.id));
            const qtd = selecionados.length;
            if (qtd === 0) { ja("Selecione saques primeiro", "error"); return; }
            const totalProf = selecionados.reduce((a, s) => a + parseFloat(s.final_amount || 0), 0);
            const acima200 = selecionados.filter(s => parseFloat(s.final_amount || 0) > 200);
            let texto = "💰 *Aprovar saque, por favor!*\n\n";
            texto += "📊 *Quantidade realizada:* " + qtd + "\n";
            texto += "💵 *Valor total em saques:* R$ " + totalProf.toFixed(2).replace(".", ",") + "\n";
            if (acima200.length > 0) {
              texto += "\n⚠️ *Motoboys que solicitaram valor superior a R$200:*\n\n";
              acima200.forEach(s => { texto += "🏍️ " + (s.user_name || "Cód: " + s.user_cod) + " — *R$ " + parseFloat(s.final_amount).toFixed(2).replace(".", ",") + "*\n"; });
            }
            navigator.clipboard.writeText(texto.trim());
            ja("✅ Resumo copiado!", "success");
          },
          style: {
            background: "white", color: "#4B5563",
            border: "1px solid #E5E7EB",
            padding: "6px 14px", borderRadius: 8,
            fontSize: 11, fontWeight: 500,
            cursor: "pointer", whiteSpace: "nowrap",
          },
        }, "📋 Copiar resumo"),
      ),
    ),

    // ====================== TOOLBAR (chips de filtro + acerto + busca) ======================
    e("div", {
      style: {
        background: "white",
        border: "1px solid #E5E7EB",
        borderRadius: "10px 10px 0 0",
        borderBottom: "none",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
      }
    },
      ...[
        { id: "", label: "Todas", count: q.length },
        { id: "atrasados", label: "Atrasados", count: cntAtrasados },
        { id: "aguardando_aprovacao", label: "Aguardando", count: cntAguardando },
        { id: "aprovado", label: "Aprovadas", count: cntAprovadas },
        { id: "aprovado_gratuidade", label: "Gratuidade", count: cntGratuidade },
        { id: "rejeitado", label: "Rejeitadas", count: cntRejeitadas },
        { id: "inativo", label: "Inativos", count: cntInativos },
      ].map(chip => {
        const ativo = (p.filterStatus || "") === chip.id;
        return e("button", {
          key: chip.id || "todas",
          onClick: () => { setSolicitacoesPagina(1); x({ ...p, filterStatus: chip.id }); },
          style: {
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 999,
            fontSize: 11, fontWeight: 500,
            cursor: "pointer", border: "none",
            background: ativo ? "#534AB7" : "#F3F4F6",
            color: ativo ? "white" : "#4B5563",
          }
        },
          chip.label,
          e("span", {
            style: {
              background: ativo ? "rgba(255,255,255,0.25)" : "white",
              color: ativo ? "white" : "#6b7280",
              padding: "1px 6px", borderRadius: 8,
              fontSize: 10, fontWeight: 600,
            }
          }, chip.count.toLocaleString("pt-BR"))
        );
      }),

      e("div", { style: { width: 1, height: 18, background: "#E5E7EB", margin: "0 3px" } }),

      // Segmented Acerto Pendente / Realizado
      e("div", {
        style: {
          display: "inline-flex", border: "1px solid #E5E7EB",
          borderRadius: 6, overflow: "hidden", background: "#F9FAFB",
        }
      },
        e("button", {
          onClick: () => {
            setAcertoRealizado(false);
            try { localStorage.setItem("tutts_acerto_realizado", "false"); } catch (err) { }
          },
          style: {
            border: "none", padding: "4px 10px",
            fontSize: 11, fontWeight: 500, cursor: "pointer",
            background: !acertoRealizado ? "white" : "transparent",
            color: !acertoRealizado ? "#111827" : "#6b7280",
            boxShadow: !acertoRealizado ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
          }
        }, "Pendentes"),
        e("button", {
          onClick: () => {
            setAcertoRealizado(true);
            try { localStorage.setItem("tutts_acerto_realizado", "true"); } catch (err) { }
          },
          style: {
            border: "none", padding: "4px 10px",
            fontSize: 11, fontWeight: 500, cursor: "pointer",
            background: acertoRealizado ? "white" : "transparent",
            color: acertoRealizado ? "#111827" : "#6b7280",
            boxShadow: acertoRealizado ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
          }
        }, "Realizados"),
      ),

      e("div", { style: { flex: 1 } }),

      e("input", {
        type: "text",
        placeholder: "Buscar nome, CPF, código...",
        value: p.solicitacoesBusca || "",
        onChange: (ev) => { setSolicitacoesPagina(1); x({ ...p, solicitacoesBusca: ev.target.value }); },
        style: {
          border: "1px solid #E5E7EB", borderRadius: 6,
          padding: "4px 8px 4px 26px", fontSize: 11, width: 200,
          background: "white url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"11\" height=\"11\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%236b7280\" stroke-width=\"2\"><circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"M21 21l-4.35-4.35\"/></svg>') no-repeat 7px center",
        }
      }),
    ),

    // ====================== LAYOUT TABELA + DRAWER ======================
    e("div", {
      style: {
        display: "grid",
        gridTemplateColumns: drawerSaque ? "1fr 340px" : "1fr",
        gap: 12,
        alignItems: "start",
      }
    },
      // ---------- TABELA COMPACTA ----------
      e("div", { style: { background: "white", border: "1px solid #E5E7EB", borderRadius: "0 0 10px 10px", overflow: "hidden" } },
        e("div", { style: { overflowX: "auto" } },
          e("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 11.5 } },
            e("thead", null,
              e("tr", null,
                e("th", { style: thStyle({ width: 18 }) },
                  e("input", {
                    type: "checkbox",
                    checked: paginadas.length > 0 && paginadas.every(s => z.includes(s.id)),
                    onChange: (ev) => {
                      const ids = paginadas.map(s => s.id);
                      ev.target.checked
                        ? B([...new Set([...z, ...ids])])
                        : B(z.filter(id => !ids.includes(id)));
                    },
                  })
                ),
                e("th", { style: thStyle({ textAlign: "left" }) }, "Profissional"),
                e("th", { style: thStyle({ textAlign: "right" }) }, "Solicitado"),
                e("th", { style: thStyle({ textAlign: "right" }) }, "Recebido"),
                e("th", { style: thStyle({ textAlign: "left" }) }, "PIX"),
                e("th", { style: thStyle({ textAlign: "left" }) }, "Status"),
                e("th", { style: thStyle({ textAlign: "right", width: 80 }) }, "Data/Hora"),
              )
            ),
            e("tbody", null,
              paginadas.length === 0 && e("tr", null,
                e("td", { colSpan: 7, style: { padding: 32, textAlign: "center", color: "#9CA3AF", fontSize: 13 } },
                  "Nenhum saque encontrado com esse filtro"
                )
              ),
              paginadas.map(s => {
                const isAtrasado = "aguardando_aprovacao" === s.status && Date.now() - new Date(s.created_at).getTime() >= 36e5;
                const isPagoStark = "pago_stark" === s.status || s.stark_status === "pago";
                const isEmLote = s.stark_status === "em_lote";
                const isProcessandoPix = s.stark_status === "processando";
                const isSelected = z.includes(s.id);
                const isOpen = drawerSaque && drawerSaque.id === s.id;
                const status = statusLabelCurto(s);
                const auto = isAutoSaque(s);

                let bgRow = "white";
                if (isOpen) bgRow = "#F5F3FF";
                else if (isSelected) bgRow = "#EEF2FF";
                else if (isAtrasado && !isPagoStark && !isEmLote && !isProcessandoPix) bgRow = "#FEF2F2";
                else if (s.is_restricted && s.status !== "rejeitado" && !isPagoStark) bgRow = "#FEE2E2";
                // Gratuidade visível em qualquer status (não só aguardando) — fundo azul bem clarinho
                else if (s.has_gratuity) bgRow = "#EFF6FF";

                return e("tr", {
                  key: s.id,
                  onClick: () => { setDrawerSaque(s); setDrawerEditandoStatus(false); setDrawerMotivoRej(""); },
                  style: {
                    borderBottom: "1px solid #F3F4F6",
                    cursor: "pointer",
                    background: bgRow,
                    boxShadow: isOpen ? "inset 3px 0 0 #534AB7" : "none",
                  },
                },
                  e("td", { style: tdStyle(), onClick: (ev) => ev.stopPropagation() },
                    e("input", {
                      type: "checkbox",
                      checked: isSelected,
                      onChange: (ev) => {
                        ev.target.checked ? B([...z, s.id]) : B(z.filter(id => id !== s.id));
                      },
                    })
                  ),
                  // Profissional
                  e("td", { style: tdStyle() },
                    e("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                      e("div", {
                        style: {
                          width: 24, height: 24, borderRadius: "50%",
                          background: corAvatar(s.user_cod), color: "white",
                          fontSize: 9, fontWeight: 600,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }
                      }, iniciaisDe(s.user_name)),
                      e("div", null,
                        e("div", { style: { fontWeight: 500, color: "#111827", lineHeight: 1.2 } }, s.user_name || "—"),
                        e("div", { style: { fontFamily: "ui-monospace, monospace", fontSize: 10, color: "#9CA3AF" } }, s.user_cod || "")
                      )
                    )
                  ),
                  // Solicitado
                  e("td", { style: { ...tdStyle(), textAlign: "right" } },
                    e("span", { style: { fontWeight: 600, color: "#111827", fontVariantNumeric: "tabular-nums" } }, er(s.requested_amount))
                  ),
                  // Recebido (líquido)
                  e("td", { style: { ...tdStyle(), textAlign: "right" } },
                    e("span", { style: { fontWeight: 500, color: "#0F6E56", fontVariantNumeric: "tabular-nums" } }, er(s.final_amount))
                  ),
                  // PIX
                  e("td", { style: tdStyle(), onClick: (ev) => ev.stopPropagation() },
                    e("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
                      // Botão QR Code PIX (saque manual) — antes da chave, escondido se rejeitado
                      s.status !== "rejeitado" && abrirQRPix && e("button", {
                        onClick: (ev) => { ev.stopPropagation(); abrirQRPix(s); },
                        style: {
                          background: "transparent", border: "none",
                          cursor: "pointer", fontSize: 14,
                          padding: 0, lineHeight: 1, flexShrink: 0,
                          transition: "transform 0.15s",
                        },
                        onMouseEnter: (ev) => { ev.currentTarget.style.transform = "scale(1.25)"; },
                        onMouseLeave: (ev) => { ev.currentTarget.style.transform = "scale(1)"; },
                        title: "Gerar QR Code PIX (pagamento manual)"
                      }, "💠"),
                      e("span", {
                        style: { fontFamily: "ui-monospace, monospace", fontSize: 10.5, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 },
                        title: s.pix_key || "—"
                      }, s.pix_key || "—")
                    )
                  ),
                  // Status
                  e("td", { style: tdStyle() },
                    e("span", {
                      style: {
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 7px", borderRadius: 999,
                        fontSize: 10, fontWeight: 500,
                        background: status.bg, color: status.cor,
                      }
                    },
                      e("span", { style: { color: status.dot, fontSize: 10 } }, "●"),
                      status.txt
                    ),
                    auto && (s.status === "aprovado" || s.status === "aprovado_gratuidade" || isPagoStark || isEmLote || isProcessandoPix) && e("span", {
                      style: {
                        display: "inline-flex", alignItems: "center", marginLeft: 4,
                        padding: "1px 5px", background: "#EEF2FF",
                        color: "#4338CA", borderRadius: 3,
                        fontSize: 9, fontWeight: 500,
                      },
                      title: "Pago automaticamente pelo sistema"
                    }, "⚡ auto"),
                    s.has_gratuity && e("span", {
                      style: {
                        display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 4,
                        padding: "1px 6px", background: "#FEF3C7",
                        color: "#92400E", borderRadius: 3,
                        fontSize: 9, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.4px",
                      },
                      title: "Saque com gratuidade aplicada"
                    }, "🎁 grat."),
                    s.is_restricted && e("span", {
                      style: {
                        display: "inline-flex", alignItems: "center", marginLeft: 4,
                        padding: "1px 5px", background: "#FEE2E2",
                        color: "#991B1B", borderRadius: 3,
                        fontSize: 9, fontWeight: 500,
                      },
                      title: "Motoboy com restrição"
                    }, "🔒")
                  ),
                  // Data/Hora
                  e("td", { style: { ...tdStyle(), textAlign: "right", color: "#9CA3AF", fontVariantNumeric: "tabular-nums" } },
                    e("div", { style: { fontSize: 11, color: "#6B7280", fontWeight: 500, lineHeight: 1.2 } }, formatData(s.created_at)),
                    e("div", { style: { fontSize: 10, color: "#9CA3AF", marginTop: 1 } }, formatHora(s.created_at))
                  ),
                );
              })
            )
          )
        ),

        // Paginação
        e("div", { style: { padding: "10px 14px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 } },
          e("span", { style: { color: "#6b7280" } },
            `Mostrando ${filtradas.length === 0 ? 0 : inicio + 1}-${Math.min(inicio + solicitacoesPorPagina, filtradas.length)} de ${filtradas.length.toLocaleString("pt-BR")}`
          ),
          e("div", { style: { display: "flex", gap: 4, alignItems: "center" } },
            e("button", {
              onClick: () => setSolicitacoesPagina(1),
              disabled: solicitacoesPagina === 1,
              style: pagBtnStyle(solicitacoesPagina === 1),
            }, "⏮"),
            e("button", {
              onClick: () => setSolicitacoesPagina(p => Math.max(1, p - 1)),
              disabled: solicitacoesPagina === 1,
              style: pagBtnStyle(solicitacoesPagina === 1),
            }, "◀"),
            e("span", { style: { fontSize: 12, color: "#4B5563", padding: "0 8px" } },
              `${solicitacoesPagina} / ${totalPaginas}`
            ),
            e("button", {
              onClick: () => setSolicitacoesPagina(p => Math.min(totalPaginas, p + 1)),
              disabled: solicitacoesPagina === totalPaginas,
              style: pagBtnStyle(solicitacoesPagina === totalPaginas),
            }, "▶"),
            e("button", {
              onClick: () => setSolicitacoesPagina(totalPaginas),
              disabled: solicitacoesPagina === totalPaginas,
              style: pagBtnStyle(solicitacoesPagina === totalPaginas),
            }, "⏭"),
          )
        )
      ),

      // ---------- DRAWER LATERAL ----------
      drawerSaque && renderDrawer({
        e, drawerSaque, setDrawerSaque, setDrawerEditandoStatus, drawerEditandoStatus,
        drawerMotivoRej, setDrawerMotivoRej,
        Jl, er, ja, p, x, traduzirErroStarkFE, statusLabelCurto, isAutoSaque, formatHora, formatData,
        abrirQRPix,
      })
    ),
  );
};

// ────────────────────────────────────────────────────────────────────────────
// RENDER DRAWER (extraído pra função pra arquivo não ficar caótico)
// ────────────────────────────────────────────────────────────────────────────
function renderDrawer({ e, drawerSaque, setDrawerSaque, setDrawerEditandoStatus, drawerEditandoStatus, drawerMotivoRej, setDrawerMotivoRej, Jl, er, ja, p, x, traduzirErroStarkFE, statusLabelCurto, isAutoSaque, formatHora, formatData, abrirQRPix }) {
  const s = drawerSaque;
  const status = statusLabelCurto(s);
  const isPagoStark = "pago_stark" === s.status || s.stark_status === "pago";
  const isEmLote = s.stark_status === "em_lote";
  const isProcessandoPix = s.stark_status === "processando";
  const auto = isAutoSaque(s);
  const taxa = parseFloat(s.requested_amount || 0) - parseFloat(s.final_amount || 0);

  return e("div", {
    style: {
      background: "white",
      border: "1px solid #E5E7EB",
      borderRadius: 10,
      padding: 14,
      position: "sticky",
      top: 12,
      maxHeight: "calc(100vh - 24px)",
      overflowY: "auto",
    }
  },
    // Header
    e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 12, borderBottom: "1px solid #F3F4F6", marginBottom: 12 } },
      e("div", null,
        e("p", { style: { fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 } }, s.user_name || "—"),
        e("p", { style: { fontSize: 10, color: "#9CA3AF", margin: "2px 0 0", fontFamily: "ui-monospace, monospace" } }, `Cód. ${s.user_cod || "—"} · Saque #${s.id}`)
      ),
      e("button", {
        onClick: () => setDrawerSaque(null),
        style: { background: "transparent", border: "none", color: "#9CA3AF", fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 },
        title: "Fechar"
      }, "×")
    ),

    // Hero
    e("div", { style: { background: "#F9FAFB", borderRadius: 8, padding: "10px 12px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" } },
      e("div", null,
        e("p", { style: { fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 2px" } }, "Valor solicitado"),
        e("p", { style: { fontSize: 18, fontWeight: 700, color: "#111827", fontVariantNumeric: "tabular-nums", margin: 0 } }, er(s.requested_amount))
      ),
      e("span", {
        style: {
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 999,
          fontSize: 10, fontWeight: 600,
          background: status.bg, color: status.cor,
        }
      }, e("span", { style: { color: status.dot } }, "●"), status.txt)
    ),

    // Financeiro
    sectionDrawer(e, "Financeiro", [
      ["Valor solicitado", er(s.requested_amount)],
      ["Taxa", taxa > 0 ? e("span", { style: { color: "#BA7517" } }, `– ${er(taxa)}`) : "—"],
      ["Líquido pago", e("span", { style: { color: "#0F6E56", fontWeight: 600 } }, er(s.final_amount))],
      ["Débito Plific", s.debito_plific_at ? `✓ ${formatHora(s.debito_plific_at)}` : s.debito_erro ? e("span", { style: { color: "#991B1B" } }, "❌ Falha") : "—"],
      auto ? ["Origem", e("span", { style: { color: "#4338CA", fontWeight: 600 } }, "⚡ Auto-saque")] : ["Origem", e("span", { style: { color: "#6b7280" } }, "✋ Manual")],
      s.admin_name ? ["Aprovado por", s.admin_name] : null,
    ]),

    // PIX
    sectionDrawer(e, "PIX", [
      ["Tipo", s.pix_tipo || "—"],
      ["Chave", e("span", { style: { fontFamily: "ui-monospace, monospace", fontSize: 11 } }, s.pix_key || "—")],
      ["CPF cadastro", e("span", { style: { fontFamily: "ui-monospace, monospace", fontSize: 11 } }, s.cpf || "—")],
    ]),

    // Stark / Lote
    (s.stark_lote_id || s.stark_transfer_id || s.stark_erro) && sectionDrawer(e, "Stark Bank", [
      s.stark_lote_id ? ["Lote", `#${s.stark_lote_id}`] : null,
      s.stark_transfer_id ? ["Transfer ID", e("span", { style: { fontFamily: "ui-monospace, monospace", fontSize: 10 } }, String(s.stark_transfer_id).slice(-12))] : null,
      s.stark_erro ? ["Erro", e("span", { style: { color: "#991B1B", fontSize: 10 } }, traduzirErroStarkFE(s.stark_erro))] : null,
    ]),

    // Linha do tempo
    e("div", { style: { marginBottom: 14 } },
      e("p", { style: { fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.5px", color: "#9CA3AF", margin: "0 0 8px", fontWeight: 600 } }, "Linha do tempo"),
      e("div", { style: { position: "relative", paddingLeft: 16 } },
        e("div", { style: { position: "absolute", left: 4, top: 4, bottom: 4, width: 1, background: "#E5E7EB" } }),
        timelineItem(e, formatHora(s.created_at), "Solicitado pelo motoboy", "success"),
        s.debito_plific_at && timelineItem(e, formatHora(s.debito_plific_at), "Auto-débito Plific OK", "success"),
        s.debito_erro && !s.debito_plific_at && timelineItem(e, "—", "Débito Plific falhou", "error"),
        (s.status === "aprovado" || s.status === "aprovado_gratuidade") && s.updated_at && timelineItem(e, formatHora(s.updated_at), "Aprovado", "success"),
        s.stark_status === "em_lote" && timelineItem(e, "—", "Em lote (aguardando pagamento)", "warning"),
        s.stark_status === "processando" && timelineItem(e, "—", "Processando Pix", "warning"),
        isPagoStark && timelineItem(e, formatHora(s.updated_at || s.created_at), `Pago via Stark${auto ? " (auto)" : ""}`, "active"),
        s.status === "rejeitado" && timelineItem(e, formatHora(s.updated_at || s.created_at), `Rejeitado${s.reject_reason ? `: ${s.reject_reason}` : ""}`, "error"),
      )
    ),

    // Ações
    !drawerEditandoStatus && e("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 12 } },
      // Aprovar (só pra aguardando)
      s.status === "aguardando_aprovacao" && e("button", {
        onClick: () => {
          if (s.has_gratuity) Jl(s.id, "aprovado_gratuidade");
          else Jl(s.id, "aprovado");
          setDrawerSaque(null);
        },
        style: { ...drawerActionStyle, background: "#0F6E56", color: "white", borderColor: "#0F6E56", gridColumn: "1 / -1" },
      }, "✓ Aprovar saque"),
      s.status === "aguardando_aprovacao" && e("button", {
        onClick: () => setDrawerEditandoStatus("rejeitar"),
        style: { ...drawerActionStyle, color: "#991B1B", borderColor: "#FECACA" },
      }, "✕ Rejeitar"),
      s.status === "aguardando_aprovacao" && e("button", {
        onClick: () => { Jl(s.id, "inativo"); setDrawerSaque(null); },
        style: drawerActionStyle,
      }, "⏸ Marcar inativo"),
      // Geral
      e("button", {
        onClick: () => {
          if (abrirQRPix) abrirQRPix(s);
          else ja("Função QR não disponível", "error");
        },
        style: { ...drawerActionStyle, background: "#534AB7", color: "white", borderColor: "#534AB7" },
      }, "💠 Gerar QR Pix"),
      e("button", {
        onClick: () => {
          const dados = `Saque #${s.id}\nMotoboy: ${s.user_name} (cod ${s.user_cod})\nValor: ${er(s.requested_amount)}\nLíquido: ${er(s.final_amount)}\nPIX: ${s.pix_key}\nStatus: ${status.txt}`;
          navigator.clipboard.writeText(dados);
          ja("📋 Dados copiados!", "success");
        },
        style: drawerActionStyle,
      }, "📋 Copiar dados"),
      e("button", {
        onClick: () => x({ ...p, deleteConfirm: s }),
        style: { ...drawerActionStyle, color: "#991B1B", borderColor: "#FECACA" },
      }, "🗑️ Excluir"),
    ),

    // Form de rejeição
    drawerEditandoStatus === "rejeitar" && e("div", { style: { marginTop: 12, padding: 10, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 } },
      e("p", { style: { fontSize: 11, fontWeight: 600, color: "#991B1B", margin: "0 0 6px" } }, "Motivo da rejeição"),
      e("input", {
        type: "text",
        value: drawerMotivoRej,
        onChange: (ev) => setDrawerMotivoRej(ev.target.value),
        placeholder: "Ex: chave PIX inválida, valor incorreto...",
        autoFocus: true,
        style: { width: "100%", padding: "6px 10px", fontSize: 12, border: "1px solid #FECACA", borderRadius: 6, marginBottom: 6 },
      }),
      e("div", { style: { display: "flex", gap: 6 } },
        e("button", {
          onClick: () => {
            if (!drawerMotivoRej.trim()) { ja("Informe o motivo", "error"); return; }
            Jl(s.id, "rejeitado", drawerMotivoRej.trim());
            setDrawerSaque(null);
          },
          style: { flex: 1, padding: "6px", background: "#DC2626", color: "white", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" },
        }, "Confirmar rejeição"),
        e("button", {
          onClick: () => { setDrawerEditandoStatus(false); setDrawerMotivoRej(""); },
          style: { padding: "6px 10px", background: "white", color: "#4B5563", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer" },
        }, "Cancelar")
      )
    )
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────
function thStyle(extra) {
  return Object.assign({
    textAlign: "left",
    fontSize: 10, fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    padding: "8px 10px",
    background: "#F9FAFB",
    borderBottom: "1px solid #E5E7EB",
  }, extra || {});
}
function tdStyle(extra) {
  return Object.assign({
    padding: "8px 10px",
    verticalAlign: "middle",
  }, extra || {});
}
function pagBtnStyle(disabled) {
  return {
    padding: "4px 8px",
    background: disabled ? "#F3F4F6" : "#FFFFFF",
    color: disabled ? "#D1D5DB" : "#4B5563",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    fontSize: 11,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
const drawerActionStyle = {
  background: "white",
  border: "1px solid #E5E7EB",
  color: "#4B5563",
  padding: "7px",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 500,
  cursor: "pointer",
};
function sectionDrawer(e, titulo, rows) {
  const filtered = rows.filter(r => r);
  if (filtered.length === 0) return null;
  return e("div", { style: { marginBottom: 14 } },
    e("p", { style: { fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.5px", color: "#9CA3AF", margin: "0 0 6px", fontWeight: 600 } }, titulo),
    filtered.map(([label, value], idx) => e("div", {
      key: idx,
      style: {
        display: "flex", justifyContent: "space-between",
        fontSize: 11.5, padding: "4px 0",
        borderBottom: idx < filtered.length - 1 ? "1px solid #F3F4F6" : "none",
      }
    },
      e("span", { style: { color: "#6b7280" } }, label),
      e("span", { style: { color: "#111827", fontWeight: 500, fontVariantNumeric: "tabular-nums", textAlign: "right" } }, value),
    ))
  );
}
function timelineItem(e, hora, texto, tipo) {
  const colors = {
    success: { bg: "#10B981", ring: "#10B981" },
    warning: { bg: "#F59E0B", ring: "#F59E0B" },
    error: { bg: "#EF4444", ring: "#EF4444" },
    active: { bg: "#534AB7", ring: "#534AB7" },
    pending: { bg: "#D1D5DB", ring: "#D1D5DB" },
  };
  const c = colors[tipo] || colors.pending;
  return e("div", { style: { position: "relative", marginBottom: 8, fontSize: 11 } },
    e("div", {
      style: {
        position: "absolute", left: -15, top: 4,
        width: 8, height: 8, borderRadius: "50%",
        background: c.bg,
        border: "2px solid white",
        boxShadow: `0 0 0 1px ${c.ring}`,
      }
    }),
    e("span", { style: { color: "#9CA3AF", fontSize: 10, marginRight: 6, fontVariantNumeric: "tabular-nums" } }, hora),
    e("span", { style: { color: "#4B5563" } }, texto)
  );
}
