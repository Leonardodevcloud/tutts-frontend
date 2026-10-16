/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* BI_ICONS_V1 */
/* BI_ABAS_V1: aba Garantido no padrão clean (cabeçalho Sora 24, faixa única de KPIs,
   filtros num card branco, tabela padrão com status em pílula suave).
   Todo o arquivo agora vive dentro de um IIFE e os helpers têm prefixo "bigar"
   — antes eles eram globais (ex.: thStyle) e colidiam com outros arquivos. */
/* ============================================================================
 * BIGarantidoV2.js
 * Tela da aba "Garantido" do BI.
 *
 * O QUE PRESERVA (igual antes):
 *   - Sub-abas "Garantido" / "Semanal" / "Por cliente" (Semanal e Por cliente
 *     continuam renderizadas pelo parent via renderSemanal/renderCliente)
 *   - Lógica de status (auto vs salvo)
 *   - Modal de reprovação com motivo (setGarantidoModalStatus — no parent)
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

(function () {
  'use strict';

  // ──────────────────────────────────────────────────────────────────────────
  // TOKENS / HELPERS (escopo do arquivo — prefixo bigar)
  // ──────────────────────────────────────────────────────────────────────────
  var BIGAR_SORA = "Sora, Inter, sans-serif";

  // Tons das pílulas (fundo 50 + texto 800 + ponto 600 + borda 200)
  var BIGAR_TOM = {
    roxo:    { bg: "#faf7fd", fg: "#5d0b85", dot: "#770fa8", bd: "#e9d5f9" },
    verde:   { bg: "#f0fdf4", fg: "#166534", dot: "#16a34a", bd: "#bbf7d0" },
    ambar:   { bg: "#fffbeb", fg: "#92400e", dot: "#d97706", bd: "#fde68a" },
    vermelho:{ bg: "#fef2f2", fg: "#991b1b", dot: "#dc2626", bd: "#fecaca" },
    azul:    { bg: "#eff6ff", fg: "#1e40af", dot: "#2563eb", bd: "#bfdbfe" },
    cinza:   { bg: "#f3f4f6", fg: "#374151", dot: "#9ca3af", bd: "#e5e7eb" },
  };

  var BIGAR_STATUS_PAG = {
    analise:     { tom: "ambar",    label: "Análise" },
    nao_rodou:   { tom: "cinza",    label: "Não rodou" },
    ultrapassou: { tom: "azul",     label: "Ultrapassou" },
    lancado:     { tom: "verde",    label: "Lançado" },
    reprovado:   { tom: "vermelho", label: "Reprovado" },
  };

  function bigarIco(e, nome, size, extra) {
    return e("svg", { className: "ico", style: Object.assign({ width: size || 16, height: size || 16, flexShrink: 0 }, extra || {}), "aria-hidden": "true" },
      e("use", { href: "#i-" + nome }));
  }

  function bigarPill(e, tomKey, texto, title) {
    var t = BIGAR_TOM[tomKey] || BIGAR_TOM.cinza;
    return e("span", {
      title: title,
      style: {
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
        fontSize: 12, fontWeight: 600, background: t.bg, color: t.fg,
      }
    },
      e("span", { style: { width: 6, height: 6, borderRadius: 999, background: t.dot, flexShrink: 0 } }),
      texto
    );
  }

  var bigarBtnPri = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    height: 38, padding: "0 16px", borderRadius: 10, border: "1px solid #770fa8",
    background: "#770fa8", color: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
  var bigarBtnSec = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    height: 38, padding: "0 14px", borderRadius: 10, border: "1px solid #e5e7eb",
    background: "#ffffff", color: "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
  var bigarInput = {
    height: 38, boxSizing: "border-box", border: "1px solid #e5e7eb", borderRadius: 10,
    padding: "0 12px", fontSize: 13, color: "#111827", background: "#ffffff", width: 150,
  };
  var bigarCard = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14 };

  function bigarCampo(e, id, label, input) {
    return e("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
      e("label", { htmlFor: id, style: { fontSize: 12, fontWeight: 600, color: "#374151" } }, label),
      input
    );
  }

  function bigarKpi(e, label, valor, sub, ultimo) {
    return e("div", {
      style: { flex: "1 1 160px", padding: "16px 20px", borderRight: ultimo ? "0" : "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6", marginBottom: -1, minWidth: 0 }
    },
      e("div", { style: { fontSize: 12, color: "#6b7280" } }, label),
      e("div", { style: { fontFamily: BIGAR_SORA, fontSize: 24, fontWeight: 700, color: "#111827", fontVariantNumeric: "tabular-nums", lineHeight: 1.25, margin: "2px 0", whiteSpace: "nowrap" } }, valor),
      sub ? e("div", { style: { fontSize: 11.5, color: "#6b7280" } }, sub) : null
    );
  }

  // Chip de situação (filtro rápido) — neutro, com ponto da cor semântica
  function bigarChip(e, opt, ativoAtual, onClick) {
    var ativo = (ativoAtual || "todos") === opt.id;
    var t = opt.tom ? BIGAR_TOM[opt.tom] : null;
    return e("button", {
      key: opt.id,
      type: "button",
      "aria-pressed": ativo,
      onClick: function () { onClick(opt.id); },
      style: {
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 32, padding: "0 12px", borderRadius: 999,
        fontSize: 12.5, fontWeight: ativo ? 600 : 500, cursor: "pointer",
        border: "1px solid " + (ativo ? "#e9d5f9" : "#e5e7eb"),
        background: ativo ? "#f3e8fb" : "#ffffff",
        color: ativo ? "#5d0b85" : "#374151",
      }
    },
      t ? e("span", { style: { width: 6, height: 6, borderRadius: 999, background: t.dot } }) : null,
      opt.label
    );
  }

  function bigarTh(extra) {
    return Object.assign({
      textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280",
      padding: "10px 14px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap",
    }, extra || {});
  }
  function bigarTd(extra) {
    return Object.assign({ padding: "10px 14px", verticalAlign: "middle", borderTop: "1px solid #f3f4f6" }, extra || {});
  }

  // Foco roxo nos campos (inline styles não suportam :focus)
  if (typeof document !== "undefined" && !document.getElementById("bigar-foco-css")) {
    var bigarSt = document.createElement("style"); bigarSt.id = "bigar-foco-css";
    bigarSt.textContent = ".bigar-campo:focus{outline:none;border-color:#770fa8 !important;box-shadow:0 0 0 3px #f3e8fb}";
    document.head.appendChild(bigarSt);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COMPONENTE
  // ──────────────────────────────────────────────────────────────────────────
  window.BIGarantidoV2 = function BIGarantidoV2(props) {
    var garantidoData = props.garantidoData,
      garantidoStats = props.garantidoStats,
      garantidoStatusMap = props.garantidoStatusMap,
      garantidoLoading = props.garantidoLoading,
      garantidoFiltros = props.garantidoFiltros,
      setGarantidoFiltros = props.setGarantidoFiltros,
      garantidoSubTab = props.garantidoSubTab,
      setGarantidoSubTab = props.setGarantidoSubTab,
      carregarGarantido = props.carregarGarantido,
      salvarStatusGarantido = props.salvarStatusGarantido,
      setGarantidoModalStatus = props.setGarantidoModalStatus,
      setGarantidoMotivoReprovado = props.setGarantidoMotivoReprovado,
      il = props.il,
      renderSemanal = props.renderSemanal,
      renderCliente = props.renderCliente;

    var e = React.createElement;

    var fmtBRL = function (v) { return "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    var fmtBRLshort = function (v) { return "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 }); };
    var fmtData = function (s) { return s ? new Date(s + "T12:00:00").toLocaleDateString("pt-BR") : "—"; };

    var iniciaisDe = function (nome) {
      if (!nome) return "??";
      var partes = String(nome).trim().split(/\s+/).filter(function (p) { return p.length >= 2; });
      if (partes.length === 0) return "??";
      if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
      return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    };

    // Aplicar filtro rápido (chips)
    var aplicarFiltroRapido = function (status) {
      setGarantidoFiltros(function (f) { return Object.assign({}, f, { filtro_status: status }); });
      setTimeout(carregarGarantido, 100);
    };

    var periodoTxt = (garantidoFiltros.data_inicio || garantidoFiltros.data_fim)
      ? fmtData(garantidoFiltros.data_inicio) + " a " + fmtData(garantidoFiltros.data_fim)
      : "Período automático";
    var qtdRegistros = (garantidoData || []).length;
    var st = garantidoStats || null;

    var setF = function (campo) {
      return function (ev) {
        var v = ev.target.value;
        setGarantidoFiltros(function (f) { var n = Object.assign({}, f); n[campo] = v; return n; });
      };
    };

    var subTabs = [
      { id: "analise", label: "Garantido" },
      { id: "semanal", label: "Semanal" },
      { id: "cliente", label: "Por cliente" },
    ];

    return e("div", {
      className: "max-w-7xl mx-auto",
      style: { display: "flex", flexDirection: "column", gap: 16, padding: "8px 0 24px", color: "#111827", fontSize: 13 }
    },

      // ====================== CABEÇALHO ======================
      e("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 } },
        e("div", { style: { minWidth: 0 } },
          e("h1", { style: { margin: 0, fontFamily: BIGAR_SORA, fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "#111827" } }, "Mínimo garantido"),
          e("p", { style: { margin: "4px 0 0", color: "#6b7280", fontSize: 13 } },
            "Negociado vs produção · " + periodoTxt + " · " + qtdRegistros.toLocaleString("pt-BR") + (qtdRegistros === 1 ? " registro" : " registros"))
        ),
        e("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          e("button", {
            type: "button",
            onClick: carregarGarantido,
            disabled: garantidoLoading,
            style: Object.assign({}, bigarBtnSec, { opacity: garantidoLoading ? 0.6 : 1, cursor: garantidoLoading ? "wait" : "pointer" })
          }, bigarIco(e, "refresh", 15), garantidoLoading ? "Carregando..." : "Atualizar")
        )
      ),

      // ====================== FAIXA DE KPIs ======================
      st && e("section", {
        "aria-label": "Resumo do garantido",
        style: Object.assign({}, bigarCard, { display: "flex", flexWrap: "wrap", overflow: "hidden" })
      },
        bigarKpi(e, "Negociado", fmtBRLshort(st.total_negociado || 0), "Mínimo combinado no período"),
        bigarKpi(e, "Produção", fmtBRLshort(st.total_produzido || 0), "Valor produzido pelos profissionais"),
        bigarKpi(e, "A pagar", fmtBRLshort(st.total_complemento || 0), "Complemento do garantido", !(st.valor_nao_rodou > 0)),
        (st.valor_nao_rodou > 0) ? bigarKpi(e, "Não rodou", fmtBRLshort(st.valor_nao_rodou || 0), "Garantido de quem não rodou", true) : null
      ),

      // ====================== FILTROS ======================
      e("section", {
        "aria-label": "Filtros",
        style: Object.assign({}, bigarCard, { padding: 16, display: "flex", flexDirection: "column", gap: 14 })
      },
        e("div", { style: { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" } },
          bigarCampo(e, "bigar-ini", "Data início",
            e("input", { className: "bigar-campo", id: "bigar-ini", type: "date", value: garantidoFiltros.data_inicio || "", onChange: setF("data_inicio"), style: bigarInput })),
          bigarCampo(e, "bigar-fim", "Data fim",
            e("input", { className: "bigar-campo", id: "bigar-fim", type: "date", value: garantidoFiltros.data_fim || "", onChange: setF("data_fim"), style: bigarInput })),
          bigarCampo(e, "bigar-cli", "Cód. cliente",
            e("input", { className: "bigar-campo", id: "bigar-cli", type: "text", inputMode: "numeric", value: garantidoFiltros.cod_cliente || "", onChange: setF("cod_cliente"), placeholder: "Ex.: 767", style: Object.assign({}, bigarInput, { width: 130 }) })),
          bigarCampo(e, "bigar-prof", "Cód. profissional",
            e("input", { className: "bigar-campo", id: "bigar-prof", type: "text", inputMode: "numeric", value: garantidoFiltros.cod_prof || "", onChange: setF("cod_prof"), placeholder: "Ex.: 12345", style: Object.assign({}, bigarInput, { width: 140 }) })),
          e("div", { style: { flex: 1 } }),
          e("button", {
            type: "button",
            onClick: carregarGarantido,
            disabled: garantidoLoading,
            style: Object.assign({}, bigarBtnPri, { opacity: garantidoLoading ? 0.7 : 1, cursor: garantidoLoading ? "wait" : "pointer" })
          }, bigarIco(e, "filter", 15), "Filtrar")
        ),
        e("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid #f3f4f6" } },
          e("span", { style: { fontSize: 12, fontWeight: 600, color: "#374151", marginRight: 4 } }, "Situação"),
          [
            { id: "todos", label: "Todos" },
            { id: "abaixo", label: "Abaixo", tom: "vermelho" },
            { id: "acima", label: "Acima", tom: "verde" },
            { id: "nao_rodou", label: "Não rodou", tom: "cinza" },
            { id: "rodou", label: "Rodou", tom: "azul" },
          ].map(function (c) { return bigarChip(e, c, garantidoFiltros.filtro_status, aplicarFiltroRapido); })
        )
      ),

      // ====================== LISTA (abas internas + conteúdo) ======================
      e("section", { style: Object.assign({}, bigarCard, { overflow: "hidden" }) },
        e("div", { role: "tablist", "aria-label": "Visões do garantido", style: { display: "flex", gap: 4, padding: "0 12px", borderBottom: "1px solid #e5e7eb", overflowX: "auto" } },
          subTabs.map(function (t) {
            var ativa = garantidoSubTab === t.id;
            return e("button", {
              key: t.id,
              type: "button",
              role: "tab",
              "aria-selected": ativa,
              onClick: function () { setGarantidoSubTab(t.id); },
              style: {
                border: "none", background: "transparent", cursor: "pointer", whiteSpace: "nowrap",
                padding: "12px 10px", marginBottom: -1, fontSize: 13,
                fontWeight: ativa ? 600 : 500, color: ativa ? "#5d0b85" : "#6b7280",
                borderBottom: "2px solid " + (ativa ? "#770fa8" : "transparent"),
              }
            }, t.label);
          })
        ),

        // LOADING
        garantidoLoading && e("div", { style: { padding: 48, textAlign: "center" } },
          e("div", {
            style: {
              display: "inline-block", width: 28, height: 28,
              border: "3px solid #e5e7eb", borderTopColor: "#770fa8",
              borderRadius: "50%", animation: "tuttsSpin 0.8s linear infinite", marginBottom: 10,
            }
          }),
          e("p", { style: { color: "#6b7280", fontSize: 13, margin: 0 } }, "Carregando dados do garantido...")
        ),

        // SUB-ABA: ANÁLISE
        !garantidoLoading && garantidoSubTab === "analise" && bigarRenderTabelaAnalise({
          e: e, garantidoData: garantidoData, garantidoStatusMap: garantidoStatusMap, garantidoStats: garantidoStats,
          salvarStatusGarantido: salvarStatusGarantido, setGarantidoModalStatus: setGarantidoModalStatus,
          setGarantidoMotivoReprovado: setGarantidoMotivoReprovado,
          il: il, fmtBRL: fmtBRL, fmtData: fmtData, iniciaisDe: iniciaisDe, carregarGarantido: carregarGarantido,
        }),

        // SUB-ABA: SEMANAL (renderizada pelo parent)
        !garantidoLoading && garantidoSubTab === "semanal" && (renderSemanal
          ? e("div", { style: { padding: 16 } }, renderSemanal())
          : e("div", { style: { padding: 40, textAlign: "center", color: "#6b7280" } }, "Visão semanal indisponível.")),

        // SUB-ABA: POR CLIENTE (renderizada pelo parent)
        !garantidoLoading && garantidoSubTab === "cliente" && (renderCliente
          ? e("div", { style: { padding: 16 } }, renderCliente())
          : e("div", { style: { padding: 40, textAlign: "center", color: "#6b7280" } }, "Visão por cliente indisponível."))
      )
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TABELA DA SUB-ABA "GARANTIDO"
  // ──────────────────────────────────────────────────────────────────────────
  function bigarRenderTabelaAnalise(a) {
    var e = a.e, garantidoData = a.garantidoData, garantidoStatusMap = a.garantidoStatusMap || {},
      garantidoStats = a.garantidoStats, salvarStatusGarantido = a.salvarStatusGarantido,
      setGarantidoModalStatus = a.setGarantidoModalStatus, setGarantidoMotivoReprovado = a.setGarantidoMotivoReprovado,
      il = a.il, fmtBRL = a.fmtBRL, fmtData = a.fmtData, iniciaisDe = a.iniciaisDe;

    if (!garantidoData || garantidoData.length === 0) {
      return e("div", { style: { padding: "48px 16px", textAlign: "center" } },
        e("p", { style: { fontSize: 14, fontWeight: 600, color: "#374151", margin: 0 } }, "Nenhum registro de garantido"),
        e("p", { style: { fontSize: 13, color: "#6b7280", margin: "4px 0 14px" } }, "Ajuste o período ou os filtros e tente de novo."),
        a.carregarGarantido ? e("button", { type: "button", onClick: a.carregarGarantido, style: bigarBtnSec }, bigarIco(e, "refresh", 15), "Atualizar") : null
      );
    }

    // Ordenar e agrupar por cliente
    var sorted = garantidoData.slice().sort(function (x, y) {
      var ca = String(x.cod_cliente_garantido || "");
      var cb = String(y.cod_cliente_garantido || "");
      if (ca !== cb) return ca.localeCompare(cb, "pt-BR", { numeric: true });
      return (x.profissional || "").localeCompare(y.profissional || "", "pt-BR");
    });
    var grupos = {};
    sorted.forEach(function (r) {
      var k = String(r.cod_cliente_garantido || "Sem cliente");
      if (!grupos[k]) grupos[k] = [];
      grupos[k].push(r);
    });

    var COLS = 6;

    var renderRow = function (row, idx) {
      var statusKey = row.cod_prof + "_" + row.data + "_" + row.cod_cliente_garantido;
      var statusInfo = garantidoStatusMap[statusKey];
      var statusSalvo = (statusInfo && statusInfo.status) || null;
      var autoStatus = null;
      if (row.status === "nao_rodou" || (row.entregas === 0 && (!row.valor_produzido || row.valor_produzido === 0))) {
        autoStatus = "nao_rodou";
      } else if (row.valor_produzido > row.valor_negociado) {
        autoStatus = "ultrapassou";
      }
      var statusEfetivo = statusSalvo || autoStatus || "analise";

      // Situação (acima/abaixo/igual/não rodou)
      var sit;
      if (autoStatus === "nao_rodou") sit = { tom: "cinza", label: "Não rodou" };
      else if (row.valor_produzido > row.valor_negociado) sit = { tom: "verde", label: "Acima" };
      else if (row.valor_produzido < row.valor_negociado) sit = { tom: "vermelho", label: "Abaixo" };
      else sit = { tom: "cinza", label: "Igual" };

      var pct = row.valor_negociado > 0 ? Math.min(100, (row.valor_produzido / row.valor_negociado) * 100) : 0;
      var atingiu = row.valor_produzido >= row.valor_negociado;

      var pag = BIGAR_STATUS_PAG[statusEfetivo] || BIGAR_STATUS_PAG.analise;
      var tPag = BIGAR_TOM[pag.tom];

      return e("tr", { key: idx },
        // Profissional + data
        e("td", { style: bigarTd() },
          e("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
            // Foto real do motoboy quando o backend traz `row.foto`; senão, iniciais.
            row.foto
              ? e("img", {
                  src: row.foto, alt: row.profissional || "",
                  style: { width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #e5e7eb" },
                  onError: function (ev) { ev.target.style.display = "none"; }
                })
              : e("div", {
                  "aria-hidden": "true",
                  style: {
                    width: 30, height: 30, borderRadius: "50%", background: "#f3e8fb", color: "#5d0b85",
                    fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }
                }, iniciaisDe(row.profissional)),
            e("div", { style: { minWidth: 0 } },
              e("div", { style: { fontWeight: 600, color: "#111827", fontSize: 13, lineHeight: 1.3 } }, row.profissional || "—"),
              e("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 1, fontVariantNumeric: "tabular-nums" } },
                row.cod_prof + " · " + fmtData(row.data))
            )
          )
        ),

        // Situação
        e("td", { style: bigarTd() }, bigarPill(e, sit.tom, sit.label)),

        // Entregas
        e("td", { style: bigarTd({ textAlign: "right", color: "#111827", fontVariantNumeric: "tabular-nums" }) }, row.entregas || 0),

        // Negociado vs Produção (barra)
        e("td", { style: bigarTd() },
          e("div", { style: { display: "flex", flexDirection: "column", gap: 5, width: 170 } },
            e("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, fontVariantNumeric: "tabular-nums" } },
              e("span", { style: { color: "#111827", fontWeight: 600 } }, fmtBRL(row.valor_produzido || 0)),
              e("span", { style: { color: "#6b7280" } }, "de " + fmtBRL(row.valor_negociado || 0))
            ),
            e("div", { style: { height: 4, background: "#f3f4f6", borderRadius: 999, overflow: "hidden" }, role: "img", "aria-label": Math.round(pct) + "% do negociado" },
              e("div", { style: { height: "100%", width: pct + "%", background: atingiu ? "#16a34a" : "#dc2626", borderRadius: 999 } })
            )
          )
        ),

        // Complemento
        e("td", { style: bigarTd({ textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }) },
          row.complemento > 0
            ? e("span", { style: { color: "#991b1b", fontWeight: 600 } }, "+" + fmtBRL(row.complemento))
            : e("span", { style: { color: "#6b7280" } }, fmtBRL(row.complemento || 0))
        ),

        // Status de pagamento (select em formato de pílula)
        e("td", { style: bigarTd({ width: 190 }) },
          e("div", { style: { display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" } },
            e("select", {
              value: statusEfetivo,
              "aria-label": "Status de pagamento de " + (row.profissional || row.cod_prof),
              onChange: function (ev) {
                var novo = ev.target.value;
                if (novo === "reprovado") {
                  setGarantidoModalStatus(row);
                  setGarantidoMotivoReprovado("");
                } else {
                  salvarStatusGarantido(row, novo);
                }
              },
              style: {
                height: 30, padding: "0 8px", fontSize: 12, fontWeight: 600, borderRadius: 8, maxWidth: 160,
                border: "1px solid " + tPag.bd, background: tPag.bg, color: tPag.fg, cursor: "pointer",
              }
            },
              e("option", { value: "analise" }, "Análise"),
              e("option", { value: "nao_rodou" }, "Não Rodou"),
              e("option", { value: "ultrapassou" }, "Ultrapassou"),
              e("option", { value: "lancado" }, "Lançado"),
              e("option", { value: "reprovado" }, "Reprovado")
            ),
            !statusSalvo && autoStatus && e("span", { style: { fontSize: 11, color: "#6b7280" } }, "Automático"),
            statusInfo && statusInfo.alterado_por && e("span", { style: { fontSize: 11, color: "#6b7280" } },
              statusInfo.alterado_por + (statusInfo.alterado_em ? " · " + new Date(statusInfo.alterado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "")),
            statusEfetivo === "reprovado" && statusInfo && statusInfo.motivo_reprovado && e("span", {
              style: { fontSize: 11, color: "#991b1b", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 },
              title: statusInfo.motivo_reprovado
            }, bigarIco(e, "filetext", 12), statusInfo.motivo_reprovado)
          )
        )
      );
    };

    return e("div", { style: { overflowX: "auto" } },
      e("table", { style: { width: "100%", minWidth: 860, borderCollapse: "collapse", fontSize: 13 } },
        e("thead", null,
          e("tr", null,
            e("th", { style: bigarTh() }, "Profissional"),
            e("th", { style: bigarTh() }, "Situação"),
            e("th", { style: bigarTh({ textAlign: "right" }) }, "Entregas"),
            e("th", { style: bigarTh() }, "Produção / negociado"),
            e("th", { style: bigarTh({ textAlign: "right" }) }, "Complemento"),
            e("th", { style: bigarTh() }, "Pagamento")
          )
        ),
        e("tbody", null,
          Object.keys(grupos).map(function (clienteKey) {
            var linhas = grupos[clienteKey];
            var nomeCliente = il && typeof il === "function" ? il(clienteKey) : null;
            // Fallbacks pra nome do cliente: máscara → nome_cliente_garantido → onde_rodou parsed
            var nomeFinal = nomeCliente || (linhas[0] && linhas[0].nome_cliente_garantido) || "";
            if (!nomeFinal && linhas[0] && linhas[0].onde_rodou) {
              var m = String(linhas[0].onde_rodou).match(/[-\s]+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s]+?)(?:\s*\/|\s*$)/);
              if (m && m[1]) nomeFinal = m[1].trim();
            }
            var totalNeg = linhas.reduce(function (s, r) { return s + (r.valor_negociado || 0); }, 0);
            var totalProd = linhas.reduce(function (s, r) { return s + (r.valor_produzido || 0); }, 0);
            var diff = totalProd - totalNeg;

            // Subgrupos por centro de custo (onde_rodou)
            var linhasPorCentro = {};
            linhas.forEach(function (r) {
              var k = r.onde_rodou || "(sem centro)";
              if (!linhasPorCentro[k]) linhasPorCentro[k] = [];
              linhasPorCentro[k].push(r);
            });
            var centrosCusto = Object.keys(linhasPorCentro);
            var temMultiplosCentros = centrosCusto.length > 1;

            return [
              // Cabeçalho do cliente
              e("tr", { key: "head-" + clienteKey },
                e("td", { colSpan: COLS, style: { padding: "10px 14px", background: "#f9fafb", borderTop: "1px solid #e5e7eb" } },
                  e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, flexWrap: "wrap", gap: 8 } },
                    e("span", { style: { fontWeight: 600, color: "#111827", display: "inline-flex", alignItems: "center", gap: 8 } },
                      e("span", {
                        style: {
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          minWidth: 28, padding: "0 7px", height: 22, background: "#f3e8fb", color: "#5d0b85",
                          borderRadius: 6, fontSize: 11.5, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                        }
                      }, clienteKey),
                      nomeFinal || ""
                    ),
                    e("span", { style: { display: "flex", gap: 16, fontSize: 12, color: "#6b7280", flexWrap: "wrap", fontVariantNumeric: "tabular-nums" } },
                      e("span", null, linhas.length + (linhas.length > 1 ? " profissionais" : " profissional")),
                      e("span", null, "Negociado ", e("strong", { style: { color: "#111827", fontWeight: 600 } }, fmtBRL(totalNeg))),
                      e("span", null, "Produção ", e("strong", { style: { color: "#111827", fontWeight: 600 } }, fmtBRL(totalProd))),
                      e("span", null, "Diferença ", e("strong", { style: { fontWeight: 600, color: diff < 0 ? "#991b1b" : "#166534" } }, (diff >= 0 ? "+" : "") + fmtBRL(diff)))
                    )
                  )
                )
              )
            ].concat(centrosCusto.reduce(function (acc, centro) {
              var linhasCentro = linhasPorCentro[centro];
              if (temMultiplosCentros) {
                acc.push(
                  e("tr", { key: "centro-" + clienteKey + "-" + centro },
                    e("td", { colSpan: COLS, style: { padding: "8px 14px", fontSize: 12, color: "#374151", fontWeight: 600, borderTop: "1px solid #f3f4f6" } },
                      e("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 } },
                        bigarIco(e, "pin", 13, { color: "#9ca3af" }), centro,
                        e("span", { style: { color: "#6b7280", fontWeight: 400 } },
                          "· " + linhasCentro.length + (linhasCentro.length > 1 ? " profissionais" : " profissional"))
                      )
                    )
                  )
                );
              }
              linhasCentro.forEach(function (row, i) { acc.push(renderRow(row, clienteKey + "-" + centro + "-" + i)); });
              return acc;
            }, []));
          }).reduce(function (acc, arr) { return acc.concat(arr); }, []),

          // Linha de totais
          garantidoStats && e("tr", { key: "total" },
            e("td", { colSpan: 2, style: { padding: "12px 14px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", fontWeight: 600, color: "#111827" } }, "Total geral"),
            e("td", { style: { padding: "12px 14px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" } },
              garantidoStats.total_entregas || garantidoData.reduce(function (s, r) { return s + (r.entregas || 0); }, 0)),
            e("td", { style: { padding: "12px 14px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" } },
              fmtBRL(garantidoStats.total_produzido || 0) + " de " + fmtBRL(garantidoStats.total_negociado || 0)),
            e("td", { style: { padding: "12px 14px", background: "#f9fafb", borderTop: "1px solid #e5e7eb", textAlign: "right", color: "#991b1b", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } },
              fmtBRL(garantidoStats.total_complemento || 0)),
            e("td", { style: { padding: "12px 14px", background: "#f9fafb", borderTop: "1px solid #e5e7eb" } }, "")
          )
        )
      )
    );
  }

  // Animação spin (keyframes injetadas uma vez)
  if (typeof document !== "undefined" && !document.getElementById("tutts-spin-keyframes")) {
    var styleEl = document.createElement("style");
    styleEl.id = "tutts-spin-keyframes";
    styleEl.textContent = "@keyframes tuttsSpin { to { transform: rotate(360deg); } }";
    document.head.appendChild(styleEl);
  }
})();
