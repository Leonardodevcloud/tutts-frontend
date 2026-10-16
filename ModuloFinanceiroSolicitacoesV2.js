/* REDESIGN_CLEAN_V1: telas no padrao clean aprovado (mockups 16/10). */
/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DEEMOJI_V1 */
/* FIN_CLEAN_V1: redesign clean (cabeçalho, faixa de KPIs, lista, drawer). */
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
    withdrawalCounts, // 🔧 contadores agregados do backend (Todas, Aprovadas, etc.)
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
  // FIN_CLEAN_V1: a busca (nome, CPF, código, chave Pix) agora filtra a lista — antes o campo nao fazia nada.
  const finTermo = String(p.solicitacoesBusca || "").trim().toLowerCase();
  const finSoDig = finTermo.replace(/\D/g, "");
  const matchBusca = (s) => {
    if (!finTermo) return true;
    const txt = [s.user_name, s.user_cod, s.pix_key].map(v => String(v || "").toLowerCase()).join(" ");
    if (txt.includes(finTermo)) return true;
    return finSoDig.length >= 3 && String(s.cpf || "").replace(/\D/g, "").includes(finSoDig);
  };
  const filtradas = q.filter(s => matchFiltro(s) && matchBusca(s));
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / solicitacoesPorPagina));
  const inicio = (solicitacoesPagina - 1) * solicitacoesPorPagina;
  const paginadas = filtradas.slice(inicio, inicio + solicitacoesPorPagina);

  // 🆕 2026-05: fotos (thumbnails) dos motoboys da página atual.
  // Usa o helper compartilhado window.FotosMotoboy — carrega só os visíveis.
  const codigosPagina = paginadas.map(s => s.user_cod).filter(Boolean);
  const fotosMotoboy = (typeof window.FotosMotoboy !== 'undefined' && window.FotosMotoboy.useFotos)
    ? window.FotosMotoboy.useFotos(codigosPagina, fetchAuth, API_URL)
    : {};

  // ────────────────────────────────────────────────────────────────────────────
  // 🔧 PERFORMANCE FIX (2026-05): Contadores pros badges
  // ────────────────────────────────────────────────────────────────────────────
  // Antes calculava varrendo q.filter(...) — exigia baixar TODA a tabela.
  // Agora prefere os totais agregados do backend (withdrawalCounts), que
  // são sempre o universo COMPLETO. Se não vier (loading inicial, endpoint
  // ainda não deployado, ou erro), cai no cálculo local sobre os 500 recentes.
  // 🐛 BUGFIX: testa wc.todas != null (não só wc truthy), porque ModuloFinanceiro
  // passa {} como fallback quando withdrawalCounts é null — isso era truthy e
  // levava a wc.todas === undefined → crash em .toLocaleString().
  const wc = (withdrawalCounts && withdrawalCounts.todas != null) ? withdrawalCounts : null;
  const cntTotal       = wc ? wc.todas       : q.length;
  const cntAtrasados   = wc ? wc.atrasados   : q.filter(s => "aguardando_aprovacao" === s.status && Date.now() - new Date(s.created_at).getTime() >= 36e5).length;
  const cntAguardando  = wc ? wc.aguardando  : q.filter(s => "aguardando_aprovacao" === s.status).length;
  const cntAprovadas   = wc ? wc.aprovadas   : q.filter(s => "aprovado" === s.status).length;
  const cntGratuidade  = wc ? wc.gratuidade  : q.filter(s => "aprovado_gratuidade" === s.status).length;
  const cntRejeitadas  = wc ? wc.rejeitadas  : q.filter(s => "rejeitado" === s.status).length;
  const cntInativos    = wc ? wc.inativos    : q.filter(s => "inativo" === s.status).length;

  // ────────────────────────────────────────────────────────────────────────────
  // HELPERS DE UI
  // ────────────────────────────────────────────────────────────────────────────
  /* FIN_CLEAN_V1: tela de Solicitações redesenhada no padrão clean (cabeçalho,
     faixa única de KPIs, card de lista com chips/busca/tabela, drawer de detalhe).
     Lógica (filtros, seleção, gerar lote, copiar resumo, Jl, deleteConfirm, QR) intacta. */
  const iniciaisDe = (nome) => {
    if (!nome) return "??";
    const partes = String(nome).trim().split(/\s+/).filter(p => p.length >= 2);
    if (partes.length === 0) return "??";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  const isAutoSaque = (s) => s.admin_name === "Sistema (Auto-Saque)";

  // FIN_CLEAN_V1: status = pílula suave (fundo 50 + texto 800 + ponto 6px 600)
  const statusLabelCurto = (s) => {
    if (s.stark_status === "pago" || s.status === "pago_stark") return { txt: "Pago", cor: "#166534", bg: "#f0fdf4", dot: "#16a34a" };
    if (s.stark_status === "em_lote") return { txt: "Em lote", cor: "#5d0b85", bg: "#faf7fd", dot: "#770fa8" };
    if (s.stark_status === "processando") return { txt: "Processando", cor: "#92400e", bg: "#fffbeb", dot: "#d97706" };
    if (s.stark_status === "erro") return { txt: "Erro Stark", cor: "#991b1b", bg: "#fef2f2", dot: "#dc2626" };
    if (s.status === "aprovado") return { txt: "Aprovado", cor: "#166534", bg: "#f0fdf4", dot: "#16a34a" };
    if (s.status === "aprovado_gratuidade") return { txt: "Aprov. gratuidade", cor: "#1e40af", bg: "#eff6ff", dot: "#2563eb" };
    if (s.status === "rejeitado") return { txt: "Rejeitado", cor: "#991b1b", bg: "#fef2f2", dot: "#dc2626" };
    if (s.status === "inativo") return { txt: "Inativo", cor: "#374151", bg: "#f3f4f6", dot: "#9ca3af" };
    if (s.status === "aguardando_pagamento_stark") return { txt: "Aguard. pagamento", cor: "#92400e", bg: "#fffbeb", dot: "#d97706" };
    return { txt: "Aguardando", cor: "#92400e", bg: "#fffbeb", dot: "#d97706" };
  };

  const formatHora = (dt) => new Date(dt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const formatData = (dt) => new Date(dt).toLocaleDateString("pt-BR");

  const ico = (nome, size, extra) => e("svg", { className: "ico", style: Object.assign({ fontSize: size || 16 }, extra || {}), "aria-hidden": "true" }, e("use", { href: "#i-" + nome }));

  // Subtítulo do cabeçalho: "Sexta, 16/10 · 148 pedidos hoje"
  const hojeTxt = (() => {
    try {
      const d = new Date();
      const dia = d.toLocaleDateString("pt-BR", { weekday: "long" }).replace("-feira", "");
      return dia.charAt(0).toUpperCase() + dia.slice(1) + ", " + d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    } catch (_) { return ""; }
  })();
  const valorAguardando = q.filter(s => "aguardando_aprovacao" === s.status).reduce((a, s) => a + parseFloat(s.requested_amount || 0), 0);
  const scoreTxt = scoreFinal >= 80 ? "Excelente" : scoreFinal >= 50 ? "Bom" : "Atenção";
  const scoreCor = scoreFinal >= 80 ? "#16a34a" : scoreFinal >= 50 ? "#d97706" : "#dc2626";
  const tempoTxt = tempoMedio < 60 ? `${tempoMedio} min` : `${Math.floor(tempoMedio / 60)}h${tempoMedio % 60}m`;
  const tempoQual = tempoMedio <= 30 ? "Excelente" : tempoMedio <= 60 ? "Bom" : "Lento";

  const kpiLbl = { fontSize: 12, color: "#6b7280" };
  const kpiNum = { fontFamily: "Sora, Inter, sans-serif", fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#111827", lineHeight: 1.25, margin: "2px 0" };
  const kpiSub = { fontSize: 11.5, color: "#6b7280" };
  const kpiCell = { flex: "1 1 150px", padding: "16px 20px", borderRight: "1px solid #f3f4f6", minWidth: 0 };

  // ────────────────────────────────────────────────────────────────────────────
  // AÇÕES DO CABEÇALHO (lógica idêntica à versão anterior)
  // ────────────────────────────────────────────────────────────────────────────
  const gerarLote = async () => {
    // 🆕 2026-05 FIX: o handler antigo só fazia setState({modalGerarLote:true})
    // mas o modal de fato NUNCA foi implementado no parent — refactor V2
    // deixou o state órfão e o botão "não fazia nada". Agora chamamos o
    // backend direto após confirmação simples (mesmo padrão da aba Acerto
    // em ModuloFinanceiro.js linha 6974: criarLote).
    const selecionadosValidos = q.filter(s =>
      z.includes(s.id) &&
      (s.status === 'aprovado' || s.status === 'aprovado_gratuidade' || s.status === 'aguardando_pagamento_stark') &&
      s.stark_status !== 'processando' && s.stark_status !== 'pago' && s.stark_status !== 'em_lote'
    );
    if (selecionadosValidos.length === 0) {
      ja('Nenhum saque válido selecionado. Selecione apenas saques aprovados que não estejam em lote.', 'warning');
      return;
    }
    const valorTotal = selecionadosValidos.reduce((a, s) => a + parseFloat(s.final_amount || 0), 0);
    const valorBR = valorTotal.toFixed(2).replace('.', ',');
    const ok = window.confirm(
      `Gerar lote com ${selecionadosValidos.length} saque(s)?\n\n` +
      `Valor total: R$ ${valorBR}\n\n` +
      `Os saques ficarão marcados como "em_lote" e aparecerão na aba Pix Stark para execução.`
    );
    if (!ok) return;

    // Guard contra clique duplo (idempotência client-side)
    if (p.gerandoLote) return;
    x(Object.assign({}, p, { gerandoLote: true }));

    try {
      const resp = await fetchAuth(API_URL + '/stark/lote/marcar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saque_ids: selecionadosValidos.map(s => s.id) })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        ja(`${data.marcados} saque(s) marcado(s) para lote. Acesse "Pix Stark" para executar.`, 'success');
        // Atualização otimista: mover saques marcados pra stark_status='em_lote'
        // sem precisar refetch completo (parent recarrega via polling/WS)
        const idsMarcados = new Set(selecionadosValidos.map(s => s.id));
        if (typeof U === 'function') {
          U(prev => Array.isArray(prev)
            ? prev.map(s => idsMarcados.has(s.id)
                ? Object.assign({}, s, {
                    stark_status: 'em_lote',
                    status: (s.status === 'aguardando_pagamento_stark'
                      ? (s.has_gratuity ? 'aprovado_gratuidade' : 'aprovado')
                      : s.status)
                  })
                : s)
            : prev);
        }
        // Limpar seleção
        if (typeof B === 'function') B([]);
      } else {
        ja(`${data.error || 'Erro ao gerar lote'}`, 'error');
      }
    } catch (err) {
      console.error('[Gerar Lote] Erro:', err);
      ja(`Erro de rede: ${err.message || 'verifique conexão'}`, 'error');
    } finally {
      x(prev => Object.assign({}, prev, { gerandoLote: false }));
    }
  };

  const copiarResumo = () => {
    const selecionados = q.filter(s => z.includes(s.id));
    const qtd = selecionados.length;
    if (qtd === 0) { ja("Selecione saques primeiro", "error"); return; }
    const totalProf = selecionados.reduce((a, s) => a + parseFloat(s.final_amount || 0), 0);
    const acima200 = selecionados.filter(s => parseFloat(s.final_amount || 0) > 200);
    let texto = "*Aprovar saque, por favor!*\n\n";
    texto += "*Quantidade realizada:* " + qtd + "\n";
    texto += "*Valor total em saques:* R$ " + totalProf.toFixed(2).replace(".", ",") + "\n";
    if (acima200.length > 0) {
      texto += "\n*Motoboys que solicitaram valor superior a R$200:*\n\n";
      acima200.forEach(s => { texto += "" + (s.user_name || "Cód: " + s.user_cod) + " — *R$ " + parseFloat(s.final_amount).toFixed(2).replace(".", ",") + "*\n"; });
    }
    navigator.clipboard.writeText(texto.trim());
    ja("Resumo copiado!", "success");
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return e("div", { style: { display: "flex", flexDirection: "column", gap: 16, color: "#111827", fontSize: 13 } },

    // ====================== CABEÇALHO ======================
    e("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 } },
      e("div", null,
        e("h1", { style: { margin: 0, fontFamily: "Sora, Inter, sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "#111827" } }, "Solicitações de saque"),
        e("p", { style: { margin: "4px 0 0", color: "#6b7280", fontSize: 13 } },
          `${hojeTxt ? hojeTxt + " · " : ""}${saquesHoje.length.toLocaleString("pt-BR")} ${saquesHoje.length === 1 ? "pedido" : "pedidos"} hoje`)
      ),
      e("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        e("button", {
          type: "button",
          onClick: copiarResumo,
          title: z.length === 0 ? "Selecione saques para copiar o resumo" : `Copiar resumo de ${z.length} saque(s)`,
          style: finBtnSec,
        }, ico("clipboard", 15), "Copiar resumo"),
        e("button", {
          type: "button",
          onClick: gerarLote,
          disabled: !!p.gerandoLote,
          title: p.gerandoLote
            ? "Gerando lote..."
            : (z.length === 0 ? "Selecione saques antes de gerar o lote" : `Gerar lote com ${z.length} saques`),
          style: Object.assign({}, finBtnPri, { opacity: p.gerandoLote ? 0.7 : 1, cursor: p.gerandoLote ? "wait" : "pointer" }),
        }, p.gerandoLote ? e(React.Fragment, null, ico("clock", 15), "Gerando...") : `Gerar lote${z.length > 0 ? ` · ${z.length}` : ""}`)
      )
    ),

    // ====================== FAIXA DE KPIs ======================
    e("section", { "aria-label": "Indicadores do dia", style: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14, display: "flex", flexWrap: "wrap", overflow: "hidden" } },
      e("div", { style: Object.assign({}, kpiCell, { flex: "1.4 1 260px", display: "flex", gap: 14, alignItems: "center" }) },
        e("div", { style: { position: "relative", width: 58, height: 58, flex: "none" } },
          e("svg", { width: 58, height: 58, style: { transform: "rotate(-90deg)", display: "block" }, "aria-hidden": "true" },
            e("circle", { cx: 29, cy: 29, r: 25, fill: "none", stroke: "#f3f4f6", strokeWidth: 6 }),
            e("circle", {
              cx: 29, cy: 29, r: 25, fill: "none", stroke: scoreCor, strokeWidth: 6, strokeLinecap: "round",
              strokeDasharray: 157.08, strokeDashoffset: 157.08 - (157.08 * scoreFinal) / 100,
            })
          ),
          e("div", { style: { position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 16, fontVariantNumeric: "tabular-nums", color: "#111827" } }, scoreFinal)
        ),
        e("div", { style: { minWidth: 0 } },
          e("div", { style: { fontWeight: 600, color: "#111827" } }, `Score do dia · ${scoreTxt}`),
          e("div", { style: { fontSize: 12, color: atrasados.length === 0 ? "#6b7280" : "#991b1b", marginTop: 2 } },
            atrasados.length === 0 ? "SLA de 1 hora cumprido em 100%" : `SLA de 1 hora: ${atrasados.length} fora do prazo`)
        )
      ),
      e("div", { style: kpiCell },
        e("div", { style: kpiLbl }, "Hoje"),
        e("div", { style: kpiNum }, saquesHoje.length.toLocaleString("pt-BR")),
        e("div", { style: kpiSub }, `${processadasHoje.length} processadas`)
      ),
      e("div", { style: kpiCell },
        e("div", { style: kpiLbl }, "Tempo médio"),
        e("div", { style: kpiNum }, tempoTxt),
        e("div", { style: kpiSub }, `${tempoQual} · até a decisão`)
      ),
      e("div", { style: kpiCell },
        e("div", { style: kpiLbl }, "Aguardando"),
        e("div", { style: Object.assign({}, kpiNum, { color: totalAguardando > 0 ? "#92400e" : "#111827" }) }, totalAguardando),
        e("div", { style: kpiSub }, totalAguardando === 0 ? "Nenhum em fila" : `${er(valorAguardando)} em análise`)
      ),
      e("div", { style: Object.assign({}, kpiCell, { borderRight: "none" }) },
        e("div", { style: kpiLbl }, "Atrasados"),
        e("div", { style: Object.assign({}, kpiNum, { color: atrasados.length > 0 ? "#991b1b" : "#111827" }) }, atrasados.length),
        e("div", { style: kpiSub }, atrasados.length === 0 ? "tudo dentro de 1 hora" : "ação necessária")
      )
    ),

    // ====================== LISTA + DRAWER ======================
    e("div", { style: { display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" } },
      e("section", { style: { flex: "999 1 640px", minWidth: 0, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" } },

        // ---------- Toolbar: chips + busca ----------
        e("div", { style: { padding: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", borderBottom: "1px solid #f3f4f6" } },
          e("div", { role: "group", "aria-label": "Filtrar por status", style: { display: "flex", flexWrap: "wrap", gap: 4 } },
            ...[
              { id: "", label: "Todas", count: cntTotal },
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
                type: "button",
                "aria-pressed": ativo,
                onClick: () => { setSolicitacoesPagina(1); x({ ...p, filterStatus: chip.id }); },
                style: {
                  display: "inline-flex", alignItems: "center", gap: 6,
                  height: 32, padding: "0 12px", borderRadius: 999,
                  fontSize: 12.5, fontWeight: ativo ? 600 : 500, cursor: "pointer",
                  border: ativo ? "1px solid #770fa8" : "1px solid #e5e7eb",
                  background: ativo ? "#770fa8" : "#ffffff",
                  color: ativo ? "#ffffff" : "#374151",
                }
              },
                chip.label,
                e("span", { style: { opacity: 0.7, fontVariantNumeric: "tabular-nums" } }, (chip.count != null ? chip.count : 0).toLocaleString("pt-BR"))
              );
            })
          ),
          /* VENC_MAP_V1: toggle "Acerto Pendentes/Realizados" removido — a competência
             do abatimento na MAP agora é automática (regra de dia da semana no backend).
             Saques com competência retroativa ao domingo anterior são sinalizados na coluna Vencimento. */
          e("label", { style: { marginLeft: "auto", flex: "0 1 260px", minWidth: 180, display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px", border: "1px solid #e5e7eb", borderRadius: 10, color: "#9ca3af", background: "#ffffff" } },
            ico("search", 14),
            e("input", {
              type: "search",
              "aria-label": "Buscar profissional",
              placeholder: "Nome, CPF ou código",
              value: p.solicitacoesBusca || "",
              onChange: (ev) => { setSolicitacoesPagina(1); x({ ...p, solicitacoesBusca: ev.target.value }); },
              style: { border: 0, outline: 0, flex: 1, minWidth: 0, font: "inherit", fontSize: 13, color: "#111827", background: "transparent" },
            })
          )
        ),

        // ---------- Tabela ----------
        e("div", { style: { overflowX: "auto" } },
          e("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 860 } },
            e("thead", null,
              e("tr", null,
                e("th", { style: finThStyle({ width: 18, paddingLeft: 14 }) },
                  e("input", {
                    type: "checkbox",
                    "aria-label": "Selecionar todos da página",
                    checked: paginadas.length > 0 && paginadas.every(s => z.includes(s.id)),
                    onChange: (ev) => {
                      const ids = paginadas.map(s => s.id);
                      ev.target.checked
                        ? B([...new Set([...z, ...ids])])
                        : B(z.filter(id => !ids.includes(id)));
                    },
                  })
                ),
                e("th", { style: finThStyle() }, "Profissional"),
                e("th", { style: finThStyle({ textAlign: "right" }) }, "Solicitado"),
                e("th", { style: finThStyle({ textAlign: "right" }) }, "Recebe"),
                e("th", { style: finThStyle() }, "Pix"),
                e("th", { style: finThStyle() }, "Status"),
                e("th", { style: finThStyle() }, "Pedido"),
                e("th", { style: finThStyle({ textAlign: "right", paddingRight: 14 }) }, "Vencimento"), /* VENC_MAP_V3 */
              )
            ),
            e("tbody", null,
              paginadas.length === 0 && e("tr", null,
                e("td", { colSpan: 8, style: { padding: "40px 16px", textAlign: "center", color: "#6b7280", fontSize: 13, borderTop: "1px solid #f3f4f6" } }, /* VENC_MAP_V3 +1 col */
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

                // FIN_CLEAN_V1: aberta = roxo 50 + inset; selecionada = cinza 50;
                // atrasado / restrito mantêm o tom vermelho 50 de alerta.
                let bgRow = "#ffffff";
                if (isOpen) bgRow = "#faf7fd";
                else if (isSelected) bgRow = "#f9fafb";
                else if (isAtrasado && !isPagoStark && !isEmLote && !isProcessandoPix) bgRow = "#fef2f2";
                else if (s.is_restricted && s.status !== "rejeitado" && !isPagoStark) bgRow = "#fef2f2";

                const minAtras = Math.round((Date.now() - new Date(s.created_at).getTime()) / 6e4);
                const ehHoje = new Date(s.created_at) >= inicioDia;
                const haTxt = "aguardando_aprovacao" === s.status && minAtras >= 0 && minAtras < 1440
                  ? (minAtras < 60 ? `há ${minAtras} min` : `há ${Math.floor(minAtras / 60)}h${String(minAtras % 60).padStart(2, "0")}`)
                  : null;

                return e("tr", {
                  key: s.id,
                  onClick: () => { setDrawerSaque(s); setDrawerEditandoStatus(false); setDrawerMotivoRej(""); },
                  style: {
                    borderTop: "1px solid #f3f4f6",
                    cursor: "pointer",
                    background: bgRow,
                    boxShadow: isOpen ? "inset 3px 0 0 #770fa8" : "none",
                  },
                },
                  e("td", { style: finTdStyle({ paddingLeft: 14 }), onClick: (ev) => ev.stopPropagation() },
                    e("input", {
                      type: "checkbox",
                      "aria-label": `Selecionar saque de ${s.user_name || s.user_cod || s.id}`,
                      checked: isSelected,
                      onChange: (ev) => {
                        ev.target.checked ? B([...z, s.id]) : B(z.filter(id => id !== s.id));
                      },
                    })
                  ),
                  // Profissional
                  e("td", { style: finTdStyle() },
                    e("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                      (fotosMotoboy && fotosMotoboy[s.user_cod])
                        ? e("img", {
                            src: fotosMotoboy[s.user_cod],
                            alt: "",
                            style: { width: 30, height: 30, borderRadius: 999, objectFit: "cover", flex: "none", border: "1px solid #e5e7eb" }
                          })
                        : e("span", {
                            "aria-hidden": "true",
                            style: { width: 30, height: 30, borderRadius: 999, background: "#f3e8fb", color: "#5d0b85", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flex: "none" }
                          }, iniciaisDe(s.user_name)),
                      e("div", { style: { minWidth: 0 } },
                        e("div", { style: { fontWeight: 600, color: "#111827", lineHeight: 1.25 } }, s.user_name || "—"),
                        e("div", { style: { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, color: "#6b7280" } }, s.user_cod || "")
                      )
                    )
                  ),
                  // Solicitado
                  e("td", { style: finTdStyle({ textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }) }, er(s.requested_amount)),
                  // Recebe (líquido)
                  e("td", { style: finTdStyle({ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, whiteSpace: "nowrap" }) }, er(s.final_amount)),
                  // PIX
                  e("td", { style: finTdStyle(), onClick: (ev) => ev.stopPropagation() },
                    e("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
                      // Botão QR Code PIX (saque manual) — escondido se rejeitado
                      s.status !== "rejeitado" && abrirQRPix && e("button", {
                        type: "button",
                        onClick: (ev) => { ev.stopPropagation(); abrirQRPix(s); },
                        title: "Gerar QR Code PIX (pagamento manual)",
                        "aria-label": "Gerar QR Code PIX",
                        style: { width: 26, height: 26, display: "grid", placeItems: "center", borderRadius: 8, border: "1px solid #e5e7eb", background: "#ffffff", color: "#770fa8", cursor: "pointer", padding: 0, flex: "none" },
                      }, ico("card", 13)),
                      e("span", {
                        style: { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11.5, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 },
                        title: s.pix_key || "—"
                      }, s.pix_key || "—")
                    )
                  ),
                  // Status
                  e("td", { style: finTdStyle() },
                    e("div", { style: { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" } },
                      finPilulaStatus(e, status),
                      auto && (s.status === "aprovado" || s.status === "aprovado_gratuidade" || isPagoStark || isEmLote || isProcessandoPix) && e("span", {
                        style: finTagStyle("#faf7fd", "#5d0b85"),
                        title: "Pago automaticamente pelo sistema"
                      }, ico("zap", 11), "auto"),
                      s.has_gratuity && e("span", {
                        style: finTagStyle("#eff6ff", "#1e40af"),
                        title: "Saque com gratuidade aplicada"
                      }, ico("gift", 11), "grat."),
                      s.is_restricted && e("span", {
                        style: finTagStyle("#fef2f2", "#991b1b"),
                        title: "Motoboy com restrição",
                        "aria-label": "Motoboy com restrição"
                      }, ico("lock", 11), "restrito")
                    )
                  ),
                  // Pedido (data/hora)
                  e("td", { style: finTdStyle({ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }) },
                    e("div", { style: { color: "#374151" } }, ehHoje ? formatHora(s.created_at) : `${formatData(s.created_at).slice(0, 5)} · ${formatHora(s.created_at)}`),
                    haTxt && e("div", { style: { fontSize: 11, color: isAtrasado ? "#991b1b" : "#6b7280", marginTop: 1 } }, haTxt)
                  ),
                  // Vencimento (competencia MAP) em coluna propria /* VENC_MAP_V3 */
                  e("td", { style: finTdStyle({ textAlign: "right", fontVariantNumeric: "tabular-nums", paddingRight: 14 }) },
                    s.vencimento_map
                      ? e("div", { style: { display: "inline-flex", flexDirection: "column", alignItems: "flex-end", lineHeight: 1.2 } },
                          e("span", {
                            style: { fontWeight: 600, color: s.vencimento_retroativo ? "#92400e" : "#374151" },
                            title: s.vencimento_retroativo ? "Competencia no DOMINGO ANTERIOR (saque seg/ter/qua ate 12h)" : "Competencia = data da realizacao"
                          }, String(s.vencimento_map).slice(8, 10) + "/" + String(s.vencimento_map).slice(5, 7) + "/" + String(s.vencimento_map).slice(0, 4)),
                          s.vencimento_retroativo && e("span", { style: { fontSize: 11, fontWeight: 500, color: "#92400e", marginTop: 1 } }, "dom. anterior")
                        )
                      : e("span", { style: { color: "#d1d5db" } }, "—")
                  ),
                );
              })
            )
          )
        ),

        // ---------- Paginação ----------
        e("div", { style: { padding: "12px 14px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, color: "#6b7280", fontSize: 12.5 } },
          e("span", null,
            `Mostrando ${filtradas.length === 0 ? 0 : inicio + 1}–${Math.min(inicio + solicitacoesPorPagina, filtradas.length)} de ${filtradas.length.toLocaleString("pt-BR")}`
          ),
          e("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
            e("button", {
              type: "button", title: "Primeira página", "aria-label": "Primeira página",
              onClick: () => setSolicitacoesPagina(1),
              disabled: solicitacoesPagina === 1,
              style: finPagBtnStyle(solicitacoesPagina === 1, true),
            }, "«"),
            e("button", {
              type: "button",
              onClick: () => setSolicitacoesPagina(p => Math.max(1, p - 1)),
              disabled: solicitacoesPagina === 1,
              style: finPagBtnStyle(solicitacoesPagina === 1),
            }, "Anterior"),
            e("span", { style: { color: "#374151", padding: "0 6px", fontVariantNumeric: "tabular-nums" } }, `${solicitacoesPagina} / ${totalPaginas}`),
            e("button", {
              type: "button",
              onClick: () => setSolicitacoesPagina(p => Math.min(totalPaginas, p + 1)),
              disabled: solicitacoesPagina === totalPaginas,
              style: finPagBtnStyle(solicitacoesPagina === totalPaginas),
            }, "Próxima"),
            e("button", {
              type: "button", title: "Última página", "aria-label": "Última página",
              onClick: () => setSolicitacoesPagina(totalPaginas),
              disabled: solicitacoesPagina === totalPaginas,
              style: finPagBtnStyle(solicitacoesPagina === totalPaginas, true),
            }, "»"),
          )
        )
      ),

      // ---------- DRAWER LATERAL ----------
      drawerSaque && finRenderDrawer({
        e, drawerSaque, setDrawerSaque, setDrawerEditandoStatus, drawerEditandoStatus,
        drawerMotivoRej, setDrawerMotivoRej,
        Jl, er, ja, p, x, traduzirErroStarkFE, statusLabelCurto, isAutoSaque, formatHora, formatData,
        abrirQRPix, ico,
      })
    ),
  );
};

// ────────────────────────────────────────────────────────────────────────────
// RENDER DRAWER (extraído pra função pra arquivo não ficar caótico)
// FIN_CLEAN_V1: cabeçalho nome + "Cód · Saque #", valor grande + status,
// lista dl, linha do tempo roxa, ações no padrão (principal / destrutivo / links).
// ────────────────────────────────────────────────────────────────────────────
function finRenderDrawer({ e, drawerSaque, setDrawerSaque, setDrawerEditandoStatus, drawerEditandoStatus, drawerMotivoRej, setDrawerMotivoRej, Jl, er, ja, p, x, traduzirErroStarkFE, statusLabelCurto, isAutoSaque, formatHora, formatData, abrirQRPix, ico }) {
  const s = drawerSaque;
  const status = statusLabelCurto(s);
  const isPagoStark = "pago_stark" === s.status || s.stark_status === "pago";
  const auto = isAutoSaque(s);
  const valReq = parseFloat(s.requested_amount || 0);
  const taxa = valReq - parseFloat(s.final_amount || 0);
  const taxaPct = valReq > 0 && taxa > 0 ? (taxa / valReq * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : null;
  const aguardando = s.status === "aguardando_aprovacao";
  const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11.5 };

  const linhas = [
    taxa > 0 ? ["Taxa" + (taxaPct ? ` (${taxaPct}%)` : ""), e("span", { style: { color: "#92400e" } }, `– ${er(taxa)}`)] : null,
    ["Recebe", e("span", { style: { fontWeight: 700 } }, er(s.final_amount))],
    (s.debito_plific_at || s.debito_erro)
      ? ["Débito Plific", s.debito_plific_at
          ? `${formatHora(s.debito_plific_at)} · OK`
          : e("span", { style: { color: "#991b1b" } }, "Falha")]
      : null,
    /* VENC_MAP_V1: competência (vencimento) enviada à MAP */
    s.vencimento_map ? ["Competência MAP", e("span", { style: { fontWeight: 600, color: s.vencimento_retroativo ? "#92400e" : "#111827" } }, finFmtVencMap(s.vencimento_map) + (s.vencimento_retroativo ? " · domingo anterior" : ""))] : null,
    ["Origem", auto
      ? e("span", { style: { color: "#5d0b85", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 } }, ico("zap", 12), "Auto-saque")
      : e("span", { style: { color: "#374151", display: "inline-flex", alignItems: "center", gap: 4 } }, ico("hand", 12), "Manual")],
    s.admin_name ? ["Aprovado por", s.admin_name] : null,
    s.pix_tipo ? ["Tipo Pix", s.pix_tipo] : null,
    ["Chave Pix", e("span", { style: mono }, s.pix_key || "—")],
    s.cpf ? ["CPF cadastro", e("span", { style: mono }, s.cpf)] : null,
    s.stark_lote_id ? ["Lote Stark", `#${s.stark_lote_id}`] : null,
    s.stark_transfer_id ? ["Transfer ID", e("span", { style: mono }, String(s.stark_transfer_id).slice(-12))] : null,
    s.stark_erro ? ["Erro Stark", e("span", { style: { color: "#991b1b" } }, traduzirErroStarkFE ? traduzirErroStarkFE(s.stark_erro) : s.stark_erro)] : null,
    s.reject_reason && s.status === "rejeitado" ? ["Motivo", e("span", { style: { color: "#991b1b" } }, s.reject_reason)] : null,
  ].filter(Boolean);

  const minAtras = Math.round((Date.now() - new Date(s.created_at).getTime()) / 6e4);

  const linkBtn = { background: "none", border: 0, padding: 0, font: "inherit", fontSize: 13, color: "#770fa8", cursor: "pointer", fontWeight: 500 };

  return e("aside", {
    "aria-label": "Detalhe do saque",
    style: {
      flex: "1 1 320px", maxWidth: 380, minWidth: 0,
      background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14,
      display: "flex", flexDirection: "column",
      position: "sticky", top: 12,
      maxHeight: "calc(100vh - 24px)", overflowY: "auto",
    }
  },
    // Header
    e("div", { style: { padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 10, borderBottom: "1px solid #f3f4f6" } },
      e("div", { style: { flex: 1, minWidth: 0 } },
        e("div", { style: { fontWeight: 700, fontSize: 15, color: "#111827" } }, s.user_name || "—"),
        e("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 } }, `Cód. ${s.user_cod || "—"} · Saque #${s.id}`)
      ),
      e("button", {
        type: "button",
        onClick: () => setDrawerSaque(null),
        "aria-label": "Fechar",
        title: "Fechar",
        style: { width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#ffffff", color: "#6b7280", cursor: "pointer", display: "grid", placeItems: "center", padding: 0, flex: "none" },
      }, ico("x", 14))
    ),

    e("div", { style: { padding: 18, display: "flex", flexDirection: "column", gap: 18 } },
      // Valor + status
      e("div", { style: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, flexWrap: "wrap" } },
        e("div", null,
          e("div", { style: { fontSize: 12, color: "#6b7280" } }, "Valor solicitado"),
          e("div", { style: { fontFamily: "Sora, Inter, sans-serif", fontSize: 30, fontWeight: 700, color: "#111827", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 } }, er(s.requested_amount))
        ),
        finPilulaStatus(e, status, true)
      ),

      // Detalhes
      e("dl", { style: { margin: 0, display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", rowGap: 8, columnGap: 12, fontSize: 12.5 } },
        ...linhas.reduce((acc, [label, value], idx) => {
          acc.push(e("dt", { key: "t" + idx, style: { color: "#6b7280" } }, label));
          acc.push(e("dd", { key: "d" + idx, style: { margin: 0, textAlign: "right", color: "#111827", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" } }, value));
          return acc;
        }, [])
      ),

      // Linha do tempo
      e("div", null,
        e("div", { style: { fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#9ca3af", marginBottom: 10 } }, "Linha do tempo"),
        e("ol", { style: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 } },
          finTimelineItem(e, formatHora(s.created_at), "Solicitado pelo motoboy", "ok"),
          s.debito_plific_at && finTimelineItem(e, formatHora(s.debito_plific_at), "Débito Plific OK", "ok"),
          s.vencimento_retroativo && finTimelineItem(e, finFmtVencMap(s.vencimento_map), "Competência no domingo anterior (MAP)", "ok"),
          s.debito_erro && !s.debito_plific_at && finTimelineItem(e, "—", "Débito Plific falhou", "error"),
          (s.status === "aprovado" || s.status === "aprovado_gratuidade") && s.updated_at && finTimelineItem(e, formatHora(s.updated_at), "Aprovado", "ok"),
          s.stark_status === "em_lote" && finTimelineItem(e, "—", "Em lote (aguardando pagamento)", "pending"),
          s.stark_status === "processando" && finTimelineItem(e, "—", "Processando Pix", "pending"),
          isPagoStark && finTimelineItem(e, formatHora(s.updated_at || s.created_at), `Pago via Stark${auto ? " (auto)" : ""}`, "ok"),
          s.status === "rejeitado" && finTimelineItem(e, formatHora(s.updated_at || s.created_at), `Rejeitado${s.reject_reason ? `: ${s.reject_reason}` : ""}`, "error"),
          aguardando && finTimelineItem(e, minAtras < 1 ? "agora" : minAtras < 60 ? `há ${minAtras} min` : `há ${Math.floor(minAtras / 60)}h`, "Aguardando aprovação", "pending"),
        )
      ),

      // Ações
      !drawerEditandoStatus && e("div", { style: { display: "flex", flexDirection: "column", gap: 8 } },
        aguardando && e("button", {
          type: "button",
          onClick: () => {
            if (s.has_gratuity) Jl(s.id, "aprovado_gratuidade");
            else Jl(s.id, "aprovado");
            setDrawerSaque(null);
          },
          style: Object.assign({}, finBtnPri, { height: 42, width: "100%", justifyContent: "center" }),
        }, ico("check", 15), "Aprovar saque"),
        aguardando && e("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 } },
          e("button", {
            type: "button",
            onClick: () => setDrawerEditandoStatus("rejeitar"),
            style: Object.assign({}, finBtnDestr, { justifyContent: "center", height: 38 }),
          }, "Rejeitar"),
          e("button", {
            type: "button",
            onClick: () => { Jl(s.id, "inativo"); setDrawerSaque(null); },
            style: Object.assign({}, finBtnSec, { justifyContent: "center", height: 38 }),
          }, "Marcar inativo")
        ),
        e("div", { style: { display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", paddingTop: 4 } },
          e("button", {
            type: "button",
            onClick: () => {
              if (abrirQRPix) abrirQRPix(s);
              else ja("Função QR não disponível", "error");
            },
            style: linkBtn,
          }, "Gerar QR Pix"),
          e("button", {
            type: "button",
            onClick: () => {
              const dados = `Saque #${s.id}\nMotoboy: ${s.user_name} (cod ${s.user_cod})\nValor: ${er(s.requested_amount)}\nLíquido: ${er(s.final_amount)}\nPIX: ${s.pix_key}\nStatus: ${status.txt}`;
              navigator.clipboard.writeText(dados);
              ja("Dados copiados!", "success");
            },
            style: linkBtn,
          }, "Copiar dados"),
          e("button", {
            type: "button",
            onClick: () => x({ ...p, deleteConfirm: s }),
            style: Object.assign({}, linkBtn, { color: "#991b1b" }),
          }, "Excluir")
        )
      ),

      // Form de rejeição (inline)
      drawerEditandoStatus === "rejeitar" && e("div", { style: { display: "flex", flexDirection: "column", gap: 8, paddingTop: 14, borderTop: "1px solid #f3f4f6" } },
        e("label", { htmlFor: "fin-motivo-rej-" + s.id, style: { fontSize: 12.5, fontWeight: 600, color: "#374151" } }, "Motivo da rejeição"),
        e("input", {
          id: "fin-motivo-rej-" + s.id,
          type: "text",
          value: drawerMotivoRej,
          onChange: (ev) => setDrawerMotivoRej(ev.target.value),
          placeholder: "Ex.: chave Pix inválida, valor incorreto",
          autoFocus: true,
          style: { width: "100%", boxSizing: "border-box", height: 40, padding: "0 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 10, color: "#111827", outlineColor: "#770fa8" },
        }),
        e("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 } },
          e("button", {
            type: "button",
            onClick: () => {
              if (!drawerMotivoRej.trim()) { ja("Informe o motivo", "error"); return; }
              Jl(s.id, "rejeitado", drawerMotivoRej.trim());
              setDrawerSaque(null);
            },
            style: Object.assign({}, finBtnDestr, { justifyContent: "center", height: 38 }),
          }, "Confirmar rejeição"),
          e("button", {
            type: "button",
            onClick: () => { setDrawerEditandoStatus(false); setDrawerMotivoRej(""); },
            style: Object.assign({}, finBtnSec, { justifyContent: "center", height: 38 }),
          }, "Cancelar")
        )
      )
    )
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS (FIN_CLEAN_V1)
// ────────────────────────────────────────────────────────────────────────────
const finBtnBase = {
  display: "inline-flex", alignItems: "center", gap: 8,
  height: 40, padding: "0 14px", borderRadius: 10,
  fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  fontFamily: "inherit",
};
const finBtnPri = Object.assign({}, finBtnBase, { padding: "0 16px", border: "1px solid #770fa8", background: "#770fa8", color: "#ffffff" });
const finBtnSec = Object.assign({}, finBtnBase, { border: "1px solid #e5e7eb", background: "#ffffff", color: "#374151" });
const finBtnDestr = Object.assign({}, finBtnBase, { border: "1px solid #fecaca", background: "#ffffff", color: "#991b1b" });

function finPilulaStatus(e, st, grande) {
  return e("span", {
    style: {
      display: "inline-flex", alignItems: "center", gap: 6,
      borderRadius: 999, padding: grande ? "4px 10px" : "3px 9px",
      fontWeight: 600, fontSize: 12, whiteSpace: "nowrap",
      background: st.bg, color: st.cor,
    }
  },
    e("span", { "aria-hidden": "true", style: { width: 6, height: 6, borderRadius: 999, background: st.dot, flex: "none" } }),
    st.txt
  );
}
function finTagStyle(bg, cor) {
  return {
    display: "inline-flex", alignItems: "center", gap: 3,
    padding: "1px 6px", borderRadius: 999,
    background: bg, color: cor,
    fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
  };
}
function finThStyle(extra) {
  return Object.assign({
    textAlign: "left",
    fontSize: 12, fontWeight: 600,
    color: "#6b7280",
    padding: "10px",
    background: "#f9fafb",
    whiteSpace: "nowrap",
  }, extra || {});
}
function finTdStyle(extra) {
  return Object.assign({
    padding: "10px",
    verticalAlign: "middle",
  }, extra || {});
}
function finPagBtnStyle(disabled, compacto) {
  return {
    height: 32,
    padding: compacto ? "0 10px" : "0 12px",
    background: "#ffffff",
    color: disabled ? "#d1d5db" : "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    fontSize: 12.5,
    fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
/* VENC_MAP_V1: formata a competência 'YYYY-MM-DD' (DATE) como 'DD/MM/YYYY' sem
   depender de fuso (não usa new Date, que deslocaria 1 dia em UTC-3). */
function finFmtVencMap(d) {
  if (!d) return "";
  const s = String(d).slice(0, 10);
  const p = s.split("-");
  if (p.length !== 3) return s;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

// FIN_CLEAN_V1: pontos roxos (cheio = concluído, vazado = pendente, vermelho = falha)
function finTimelineItem(e, hora, texto, tipo) {
  const dot = tipo === "pending"
    ? { border: "2px solid #770fa8", background: "#ffffff" }
    : { background: tipo === "error" ? "#dc2626" : "#770fa8" };
  return e("li", { style: { display: "flex", gap: 10 } },
    e("span", { "aria-hidden": "true", style: Object.assign({ width: 8, height: 8, borderRadius: 999, marginTop: 5, flex: "none", boxSizing: "border-box" }, dot) }),
    e("span", { style: { flex: 1, minWidth: 0, color: tipo === "pending" ? "#5d0b85" : tipo === "error" ? "#991b1b" : "#374151", fontWeight: tipo === "pending" ? 600 : 400 } }, texto),
    e("span", { style: { color: "#6b7280", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } }, hora)
  );
}
