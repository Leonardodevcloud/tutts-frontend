/**
 * modulo-escala.js — ESCALA_V1
 * Aba do BI: quantos profissionais cada loja precisa por dia e quantos rodaram.
 *
 * Consome /bi/escala/* (API_URL ja inclui /api). Padrao da casa: h()=createElement.
 *
 * Tres telas numa so aba: panorama, cadastro de minimos e detalhe do dia.
 * O cadastro nao apaga o que nao veio no payload (o POST de prazos faz
 * DELETE-ALL e por isso salvar com a tela desatualizada apaga tudo).
 */
(function () {
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect;

  var SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  function icone(d, tam) {
    return h("svg", {
      width: tam || 15, height: tam || 15, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round",
      strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 }
    }, h("path", { d: d }));
  }
  var I_VOLTAR = "M19 12H5M11 18l-6-6 6-6";
  var I_LIXO = "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6";
  var I_ALERTA = "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01";

  function hoje() { return new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10); }
  function diasAtras(n) { return new Date(Date.now() - 3 * 3600000 - n * 86400000).toISOString().slice(0, 10); }

  // ── celulas ────────────────────────────────────────────────────
  function kpi(rotulo, valor, cor) {
    return h("div", { className: "flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3" },
      h("div", { className: "text-[10px] font-semibold uppercase tracking-wide text-gray-500" }, rotulo),
      h("div", {
        className: "text-2xl font-bold mt-1",
        style: { color: cor || "#0f172a", fontVariantNumeric: "tabular-nums" }
      }, valor)
    );
  }

  function celulaSaldo(saldo) {
    var cor = saldo < 0 ? "#b91c1c" : saldo === 0 ? "#64748b" : "#15803d";
    return h("span", { className: "font-bold", style: { color: cor, fontVariantNumeric: "tabular-nums" } },
      (saldo > 0 ? "+" : "") + saldo);
  }

  function celulaCobertura(pct) {
    if (pct === null || pct === undefined) return h("span", { className: "text-gray-400" }, "—");
    var abaixo = pct < 100;
    return h("span", {
      className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold " +
        (abaixo ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"),
      style: { fontVariantNumeric: "tabular-nums", minWidth: 52 }
    }, pct + "%");
  }

  // ════════════════════════════════════════════════════════════════
  // SELETOR cliente -> centro de custo
  //
  // Lista os clientes pelo nome de exibicao (mascara do BI quando existe) e,
  // depois que um cliente e escolhido, so entao oferece OS CENTROS DAQUELE
  // CLIENTE. Centro de custo so faz sentido dentro de um cliente: um combo
  // global de centros mistura codigos de lojas diferentes.
  // ════════════════════════════════════════════════════════════════
  function SeletorCliente(props) {
    var opcoes = props.opcoes || { clientes: [], centros_por_cliente: {} };
    var cod = props.codCliente, cc = props.centroCusto;
    var sBusca = useState(""); var busca = sBusca[0], setBusca = sBusca[1];
    var sAberto = useState(false); var aberto = sAberto[0], setAberto = sAberto[1];

    var selecionado = null;
    for (var i = 0; i < opcoes.clientes.length; i++) {
      if (String(opcoes.clientes[i].cod_cliente) === String(cod)) { selecionado = opcoes.clientes[i]; break; }
    }
    var centros = (cod !== null && cod !== undefined && cod !== "")
      ? (opcoes.centros_por_cliente[String(cod)] || []) : [];

    var termo = busca.trim().toLowerCase();
    var filtrados = opcoes.clientes.filter(function (c) {
      if (!termo) return true;
      return String(c.nome).toLowerCase().indexOf(termo) >= 0 ||
        String(c.nome_real || "").toLowerCase().indexOf(termo) >= 0 ||
        String(c.cod_cliente).indexOf(termo) >= 0;
    }).slice(0, 60);

    return h("div", { className: "flex gap-2 flex-wrap items-end" },

      // cliente
      h("div", { className: "relative", style: { minWidth: 280 } },
        h("label", { htmlFor: "sel-cliente", className: "block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1" }, "Loja"),
        h("input", {
          id: "sel-cliente",
          type: "text",
          value: aberto ? busca : (selecionado ? (selecionado.nome + "  ·  " + selecionado.cod_cliente) : ""),
          placeholder: "Buscar loja por nome ou código",
          onFocus: function () { setAberto(true); setBusca(""); },
          onBlur: function () { setTimeout(function () { setAberto(false); }, 160); },
          onChange: function (e) { setBusca(e.target.value); },
          className: "w-full border border-gray-300 rounded-lg px-3 text-sm",
          style: { minHeight: 38 }
        }),
        aberto && h("div", {
          className: "absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto",
          style: { maxHeight: 260 }
        },
          filtrados.length === 0 && h("div", { className: "px-3 py-3 text-xs text-gray-400" }, "Nenhuma loja encontrada"),
          filtrados.map(function (c) {
            return h("button", {
              key: c.cod_cliente,
              type: "button",
              onMouseDown: function () { props.onChange(c.cod_cliente, ""); setAberto(false); },
              className: "w-full text-left px-3 py-2 hover:bg-purple-50 border-b border-gray-50",
              style: { minHeight: 38 }
            },
              h("span", { className: "text-xs font-semibold text-gray-800" }, c.nome),
              h("span", { className: "ml-1.5 text-[10px] text-gray-400", style: { fontVariantNumeric: "tabular-nums" } }, c.cod_cliente),
              c.mascara && c.nome_real && c.nome_real !== c.mascara &&
                h("div", { className: "text-[10px] text-gray-400" }, c.nome_real),
              c.centros > 0 && h("span", { className: "ml-2 text-[10px] text-purple-600" }, c.centros + " centro(s)")
            );
          })
        )
      ),

      // centro de custo — so depois de escolher a loja
      h("div", { style: { minWidth: 220 } },
        h("label", { htmlFor: "sel-cc", className: "block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1" }, "Centro de custo"),
        h("select", {
          id: "sel-cc",
          value: cc || "",
          disabled: !selecionado,
          onChange: function (e) { props.onChange(cod, e.target.value); },
          className: "w-full border border-gray-300 rounded-lg px-2 text-sm disabled:bg-gray-50 disabled:text-gray-400",
          style: { minHeight: 38 }
        },
          h("option", { value: "" }, selecionado ? "Todos os centros da loja" : "Escolha a loja primeiro"),
          centros.map(function (x) {
            return h("option", { key: x.centro_custo, value: x.centro_custo },
              x.centro_custo + " (" + x.entregas + " entregas)");
          })
        ),
        selecionado && centros.length === 0 &&
          h("span", { className: "block text-[10px] text-gray-400 mt-1" }, "Essa loja não usa centro de custo")
      ),

      props.children
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PANORAMA
  // ════════════════════════════════════════════════════════════════
  function Panorama(props) {
    var API_URL = props.API_URL, fetchAuth = props.fetchAuth, showToast = props.showToast;

    var sDe = useState(diasAtras(27)); var de = sDe[0], setDe = sDe[1];
    var sAte = useState(hoje()); var ate = sAte[0], setAte = sAte[1];
    var sDados = useState(null); var dados = sDados[0], setDados = sDados[1];
    var sLoad = useState(false); var loading = sLoad[0], setLoading = sLoad[1];
    var sErro = useState(null); var erro = sErro[0], setErro = sErro[1];
    var sFCod = useState(""); var fCod = sFCod[0], setFCod = sFCod[1];
    var sFCC = useState(""); var fCC = sFCC[0], setFCC = sFCC[1];
    // DETALHE_LOJA_V1: loja aberta na tabela da esquerda (null = visao somada)
    var sAberta = useState(null); var aberta = sAberta[0], setAberta = sAberta[1];

    var carregar = function () {
      setLoading(true); setErro(null);
      var q = "?de=" + de + "&ate=" + ate;
      if (fCod) q += "&cod_cliente=" + encodeURIComponent(fCod);
      if (fCC) q += "&centro_custo=" + encodeURIComponent(fCC);
      fetchAuth(API_URL + "/bi/escala/panorama" + q)
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.error) { setErro(j.error); setDados(null); }
          else { setDados(j); setAberta(null); }
        })
        .catch(function () { setErro("Erro de conexão"); })
        .finally(function () { setLoading(false); });
    };
    useEffect(carregar, []);

    if (loading) return h("div", { className: "text-center text-gray-500 py-10 text-sm" }, "Carregando escala...");

    // KPI_POR_LOJA_V1: os KPIs e a tabela da esquerda so tem conteudo com uma
    // loja aberta. A visao somada juntava lojas de porte diferente num numero
    // que nao descrevia nenhuma delas.
    var k = null;
    if (aberta && dados && dados.dias_por_loja && dados.dias_por_loja[aberta.chave]) {
      var serieK = dados.dias_por_loja[aberta.chave];
      var avaliados = serieK.filter(function (d) { return d.status !== "sem_operacao"; });
      var somaMin = 0, somaReal = 0, faltas = 0;
      avaliados.forEach(function (d) {
        somaMin += d.minimo; somaReal += d.reais;
        if (d.status === "falta") faltas += 1;
      });
      k = {
        dias_analisados: avaliados.length,
        dias_abaixo: faltas,
        dias_sem_operacao: serieK.length - avaliados.length,
        saldo: somaReal - somaMin,
        cobertura_media: somaMin > 0 ? Math.round((somaReal / somaMin) * 100) : null
      };
    }
    // DETALHE_LOJA_V1: com loja aberta, a tabela da esquerda usa a serie dela
    // DETALHE_LOJA_V1: com loja aberta a tabela usa SO a serie dela. Sem
    // fallback pra soma: cair na soma exibindo o nome da loja no titulo e o
    // que fez parecer que o filtro nao funcionava.
    var linhasDia = [];
    var serieAusente = false;
    if (dados) {
      if (aberta) {
        var serie = dados.dias_por_loja && dados.dias_por_loja[aberta.chave];
        if (serie) linhasDia = serie;
        else serieAusente = true;
      } else {
        linhasDia = []; // sem loja aberta: nada na esquerda
      }
    }

    return h("div", { className: "space-y-4" },

      // filtros
      h("div", { className: "bg-white border border-gray-200 rounded-xl p-3 flex items-end gap-3 flex-wrap" },
        h("div", null,
          h("label", { htmlFor: "esc-de", className: "block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1" }, "De"),
          h("input", {
            id: "esc-de", type: "date", value: de, onChange: function (e) { setDe(e.target.value); },
            className: "border border-gray-300 rounded-lg px-3 text-sm", style: { minHeight: 38 }
          })
        ),
        h("div", null,
          h("label", { htmlFor: "esc-ate", className: "block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1" }, "Até"),
          h("input", {
            id: "esc-ate", type: "date", value: ate, onChange: function (e) { setAte(e.target.value); },
            className: "border border-gray-300 rounded-lg px-3 text-sm", style: { minHeight: 38 }
          })
        ),
        h(SeletorCliente, {
          opcoes: props.opcoes,
          codCliente: fCod,
          centroCusto: fCC,
          onChange: function (cod, cc) { setFCod(cod); setFCC(cc); }
        }),
        h("button", {
          onClick: carregar, style: { minHeight: 38 },
          className: "px-4 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
        }, "Aplicar"),
        (fCod || fCC) && h("button", {
          onClick: function () { setFCod(""); setFCC(""); },
          style: { minHeight: 38 },
          className: "px-3 rounded-lg border border-gray-300 bg-white text-gray-600 text-sm font-semibold"
        }, "Limpar loja"),
        h("div", { className: "flex-1" }),
        h("button", {
          onClick: function () { props.irPara("config"); }, style: { minHeight: 38 },
          className: "px-4 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-sm font-semibold hover:bg-purple-100"
        }, "Configurar mínimos")
      ),

      erro && h("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700" }, erro),

      dados && dados.sem_configuracao && h("div", { className: "bg-amber-50 border border-amber-200 rounded-xl p-5 text-center" },
        h("p", { className: "text-sm text-amber-900 font-semibold mb-1" }, "Nenhum mínimo cadastrado ainda"),
        h("p", { className: "text-xs text-amber-800 mb-3" }, "O painel compara o que rodou contra o mínimo de cada loja. Sem cadastro, não há o que comparar."),
        h("button", {
          onClick: function () { props.irPara("config"); },
          className: "px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold"
        }, "Cadastrar agora")
      ),

      !k && dados && !dados.sem_configuracao && h("div", { className: "flex gap-3" },
        kpi("Dias com operação", "—", "#cbd5e1"),
        kpi("Dias abaixo do mínimo", "—", "#cbd5e1"),
        kpi("Cobertura média", "—", "#cbd5e1"),
        kpi("Saldo no período", "—", "#cbd5e1"),
        kpi("Dias sem operação", "—", "#cbd5e1")
      ),

      k && h("div", { className: "flex gap-3" },
        kpi("Dias com operação", String(k.dias_analisados)),
        kpi("Dias abaixo do mínimo",
          String(k.dias_abaixo) + (k.ocorrencias_abaixo > k.dias_abaixo ? ("  (" + k.ocorrencias_abaixo + " ocorrências)") : ""),
          k.dias_abaixo > 0 ? "#b91c1c" : "#15803d"),
        kpi("Cobertura média", k.cobertura_media === null ? "—" : k.cobertura_media + "%",
          (k.cobertura_media !== null && k.cobertura_media < 100) ? "#b91c1c" : "#15803d"),
        kpi("Saldo no período", (k.saldo > 0 ? "+" : "") + k.saldo, k.saldo < 0 ? "#b91c1c" : "#15803d"),
        kpi("Dias sem operação", String(k.dias_sem_operacao || 0), "#64748b")
      ),

      dados && !dados.sem_configuracao && h("div", { className: "flex gap-3 items-start flex-wrap" },

        // por dia
        h("div", { className: "bg-white border border-gray-200 rounded-xl overflow-hidden", style: { flex: "1 1 520px", minWidth: 420 } },
          h("div", { className: "px-4 py-3 border-b border-gray-200 flex items-baseline justify-between gap-2 flex-wrap" },
            h("h3", { className: "font-bold text-gray-900 text-sm" },
              aberta ? ("Por dia — " + aberta.nome + (aberta.centro_custo ? (" · " + aberta.centro_custo) : "")) : "Por dia"),
            aberta
              ? h("button", {
                  onClick: function () { setAberta(null); },
                  className: "text-[11px] font-semibold text-purple-700 hover:underline"
                }, "← limpar seleção")
              : h("span", { className: "text-[11px] text-gray-400" }, "clique numa loja ao lado")
          ),
          h("div", { className: "overflow-x-auto" },
            h("table", { className: "w-full text-xs" },
              h("thead", { className: "bg-gray-100" },
                h("tr", null,
                  h("th", { scope: "col", className: "text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Data"),
                  h("th", { scope: "col", className: "text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Mínimo"),
                  h("th", { scope: "col", className: "text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Real"),
                  h("th", { scope: "col", className: "text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Saldo"),
                  h("th", { scope: "col", className: "text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Cobertura")
                )
              ),
              h("tbody", null,
                linhasDia.map(function (d) {
                  var semOp = d.status === "sem_operacao";
                  return h("tr", {
                    key: d.dia,
                    className: "border-b border-gray-50 hover:bg-purple-50",
                    style: semOp ? { background: "#fafafa" } : null
                  },
                    h("td", { className: "px-4 py-2" },
                      h("span", {
                        className: semOp ? "text-gray-400" : "font-semibold text-gray-800",
                        style: { fontVariantNumeric: "tabular-nums" }
                      }, d.dia_br),
                      h("span", { className: "ml-1.5 text-[10px] text-gray-400" }, SEMANA[d.dow]),
                      semOp && h("span", {
                        className: "ml-2 text-[10px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5",
                        title: "Nenhum profissional rodou — feriado, folga ou loja fechada. Fora da conta."
                      }, "sem operação"),
                      !aberta && d.lojas_abaixo > 0 && h("span", { className: "ml-2 text-[10px] text-red-600 font-semibold" },
                        d.lojas_abaixo + (d.lojas_abaixo === 1 ? " loja em falta" : " lojas em falta"))
                    ),
                    h("td", { className: "px-3 py-2 text-right text-gray-500", style: { fontVariantNumeric: "tabular-nums" } }, d.minimo),
                    h("td", { className: "px-3 py-2 text-right font-bold", style: { fontVariantNumeric: "tabular-nums", color: semOp ? "#94a3b8" : "#0f172a" } }, d.reais),
                    h("td", { className: "px-3 py-2 text-right" },
                      (d.saldo === null || d.saldo === undefined) ? h("span", { className: "text-gray-300" }, "—") : celulaSaldo(d.saldo)),
                    h("td", { className: "px-4 py-2 text-right" }, celulaCobertura(d.cobertura))
                  );
                }),
                serieAusente && h("tr", null,
                  h("td", { colSpan: 5, className: "px-4 py-5 text-center text-sm text-amber-800 bg-amber-50" },
                    "O detalhe desta loja não veio na resposta. Se o backend acabou de subir, recarregue; se persistir, é sinal de que o deploy do backend ainda não incluiu esta versão.")
                ),
                !serieAusente && !aberta && h("tr", null,
                  h("td", { colSpan: 5, className: "px-4 py-10 text-center text-gray-400 text-sm" },
                    "Selecione uma loja na tabela ao lado para ver o detalhe dia a dia.")
                ),
                !serieAusente && aberta && linhasDia.length === 0 && h("tr", null,
                  h("td", { colSpan: 5, className: "px-4 py-6 text-center text-gray-400 text-sm" }, "Sem dias avaliados no período para esta loja.")
                )
              )
            )
          )
        ),

        // por cliente
        h("div", { className: "bg-white border border-gray-200 rounded-xl overflow-hidden", style: { flex: "1 1 420px", minWidth: 380 } },
          h("div", { className: "px-4 py-3 border-b border-gray-200 flex items-baseline justify-between" },
            h("h3", { className: "font-bold text-gray-900 text-sm" }, "Por loja"),
            h("span", { className: "text-[11px] text-gray-400" }, "ordenado por dias em falta")
          ),
          h("div", { className: "overflow-x-auto" },
            h("table", { className: "w-full text-xs" },
              h("thead", { className: "bg-gray-100" },
                h("tr", null,
                  h("th", { scope: "col", className: "text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Loja"),
                  h("th", { scope: "col", className: "text-right px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Mín"),
                  h("th", { scope: "col", className: "text-right px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Dias em falta"),
                  h("th", { scope: "col", className: "text-right px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Saldo"),
                  h("th", { scope: "col", className: "text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Cobertura")
                )
              ),
              h("tbody", null,
                (dados.clientes || []).map(function (c) {
                  var chave = c.cod_cliente + "|" + (c.centro_custo || "");
                  var ativa = aberta && aberta.chave === chave;
                  return h("tr", {
                    key: chave,
                    className: "border-b border-gray-50 cursor-pointer hover:bg-purple-50",
                    style: ativa ? { background: "#f5f3ff" } : null,
                    onClick: function () {
                      setAberta(ativa ? null : {
                        chave: chave, nome: c.nome_cliente,
                        cod_cliente: c.cod_cliente, centro_custo: c.centro_custo
                      });
                    }
                  },
                    h("td", { className: "px-4 py-2" },
                      h("span", { className: "text-gray-800 " + (ativa ? "font-bold" : "") }, c.nome_cliente),
                      h("span", { className: "ml-1.5 text-[10px] text-gray-400", style: { fontVariantNumeric: "tabular-nums" } }, c.cod_cliente),
                      c.centro_custo && h("div", { className: "text-[10px] text-gray-400" }, c.centro_custo)
                    ),
                    h("td", { className: "px-2 py-2 text-right text-gray-500", style: { fontVariantNumeric: "tabular-nums" } }, c.minimo_atual),
                    h("td", {
                      className: "px-2 py-2 text-right font-semibold",
                      style: { fontVariantNumeric: "tabular-nums", color: c.dias_abaixo > 0 ? "#b91c1c" : "#64748b" }
                    }, c.dias_abaixo,
                      h("div", { className: "text-[9px] font-normal text-gray-400" }, "de " + c.dias_avaliados)
                    ),
                    h("td", { className: "px-2 py-2 text-right" }, celulaSaldo(c.saldo)),
                    // cobertura consolidada do periodo filtrado
                    h("td", { className: "px-4 py-2 text-right" }, celulaCobertura(c.cobertura))
                  );
                })
              )
            )
          ),
          h("div", { className: "px-4 py-2.5 border-t border-gray-200 bg-amber-50 flex items-start gap-2" },
            h("span", { className: "text-amber-700 mt-0.5" }, icone(I_ALERTA, 14)),
            h("span", { className: "text-[11px] text-amber-900 leading-snug" },
              "Saldo negativo = rodou menos profissionais que o mínimo. Dias sem escala (mínimo 0) e dias sem nenhum profissional (feriado, folga ou loja fechada) ficam fora da conta. Despacho por app externo não entra na contagem.")
          )
        )
      )
    );
  }

  // ════════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO DOS MÍNIMOS
  // ════════════════════════════════════════════════════════════════
  function Config(props) {
    var API_URL = props.API_URL, fetchAuth = props.fetchAuth, showToast = props.showToast;

    var sLinhas = useState([]); var linhas = sLinhas[0], setLinhas = sLinhas[1];
    var sSem = useState([]); var semMinimo = sSem[0], setSemMinimo = sSem[1];
    var sSujo = useState({}); var sujo = sSujo[0], setSujo = sSujo[1];
    var sLoad = useState(true); var loading = sLoad[0], setLoading = sLoad[1];
    var sSalvando = useState(false); var salvando = sSalvando[0], setSalvando = sSalvando[1];
    var sBusca = useState(""); var busca = sBusca[0], setBusca = sBusca[1];
    var sNovoCod = useState(""); var novoCod = sNovoCod[0], setNovoCod = sNovoCod[1];
    var sNovoCC = useState(""); var novoCC = sNovoCC[0], setNovoCC = sNovoCC[1];

    var carregar = function () {
      setLoading(true);
      fetchAuth(API_URL + "/bi/escala/minimos")
        .then(function (r) { return r.json(); })
        .then(function (j) {
          setLinhas(j.minimos || []);
          setSemMinimo(j.sem_minimo || []);
          setSujo({});
        })
        .catch(function () { showToast("Erro ao carregar mínimos", "error"); })
        .finally(function () { setLoading(false); });
    };
    useEffect(carregar, []);

    var mudar = function (idx, campo, valor) {
      setLinhas(function (prev) {
        var novo = prev.slice();
        novo[idx] = Object.assign({}, novo[idx]);
        novo[idx][campo] = valor;
        return novo;
      });
      setSujo(function (p) { var n = Object.assign({}, p); n[idx] = true; return n; });
    };

    var adicionar = function (cod, nome, cc) {
      setLinhas(function (prev) {
        return prev.concat([{
          id: null, cod_cliente: cod, nome_cliente: nome || ("Cliente " + cod),
          centro_custo: cc || "", min_semana: 0, min_sabado: 0, min_domingo: 0,
          vigente_desde: hoje()
        }]);
      });
      setSujo(function (p) { var n = Object.assign({}, p); n[linhas.length] = true; return n; });
    };

    var salvar = function () {
      var pendentes = linhas.filter(function (_, i) { return sujo[i]; });
      if (pendentes.length === 0) { showToast("Nada alterado", "info"); return; }
      setSalvando(true);
      fetchAuth(API_URL + "/bi/escala/minimos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linhas: pendentes })
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.error) { showToast(j.error, "error"); return; }
          showToast("Mínimos salvos", "success");
          carregar();
        })
        .catch(function () { showToast("Erro ao salvar", "error"); })
        .finally(function () { setSalvando(false); });
    };

    var remover = function (linha, idx) {
      if (!linha.id) {
        setLinhas(function (prev) { return prev.filter(function (_, i) { return i !== idx; }); });
        return;
      }
      if (!window.confirm("Remover o mínimo de " + linha.nome_cliente + "?")) return;
      fetchAuth(API_URL + "/bi/escala/minimos/" + linha.id, { method: "DELETE" })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.error) { showToast(j.error, "error"); return; }
          showToast("Removido", "success");
          carregar();
        })
        .catch(function () { showToast("Erro ao remover", "error"); });
    };

    if (loading) return h("div", { className: "text-center text-gray-500 py-10 text-sm" }, "Carregando cadastro...");

    var termo = busca.trim().toLowerCase();
    var visiveis = linhas.map(function (l, i) { return { l: l, i: i }; }).filter(function (x) {
      if (!termo) return true;
      return String(x.l.nome_cliente || "").toLowerCase().indexOf(termo) >= 0 ||
        String(x.l.cod_cliente).indexOf(termo) >= 0 ||
        String(x.l.centro_custo || "").toLowerCase().indexOf(termo) >= 0;
    });
    var qtdSuja = Object.keys(sujo).length;

    var numInput = function (linha, idx, campo, rotulo, destaque) {
      return h("input", {
        type: "number", min: 0, max: 999, value: linha[campo],
        "aria-label": rotulo,
        onChange: function (e) { mudar(idx, campo, e.target.value); },
        className: "w-16 text-center rounded-lg border text-sm " +
          (destaque ? "border-purple-400 font-bold text-gray-900" : "border-gray-200 text-gray-600"),
        style: { minHeight: 36, fontVariantNumeric: "tabular-nums" }
      });
    };

    return h("div", { className: "space-y-4" },

      h("div", { className: "flex items-center gap-3 flex-wrap" },
        h("button", {
          onClick: function () { props.irPara("panorama"); },
          "aria-label": "Voltar ao panorama",
          className: "rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center",
          style: { width: 44, height: 44 }
        }, icone(I_VOLTAR, 18)),
        h("div", { className: "flex-1 min-w-[220px]" },
          h("h3", { className: "font-bold text-gray-900 text-base" }, "Disponibilidade — mínimo por loja"),
          h("p", { className: "text-xs text-gray-500" }, "Quantos profissionais cada loja precisa ter rodando por dia")
        ),
        qtdSuja > 0 && h("span", { className: "text-[11px] text-amber-700 font-semibold" },
          qtdSuja + (qtdSuja === 1 ? " alteração não salva" : " alterações não salvas")),
        h("button", {
          onClick: carregar, style: { minHeight: 44 },
          className: "px-4 rounded-lg border border-gray-300 bg-white text-gray-600 text-sm font-semibold hover:bg-gray-50"
        }, "Descartar"),
        h("button", {
          onClick: salvar, disabled: salvando || qtdSuja === 0, style: { minHeight: 44 },
          className: "px-5 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
        }, salvando ? "Salvando..." : "Salvar alterações")
      ),

      h("div", { className: "flex items-center gap-2 px-3 rounded-xl border border-gray-300 bg-white", style: { minHeight: 40 } },
        h("label", { htmlFor: "esc-busca", className: "sr-only" }, "Buscar loja"),
        h("input", {
          id: "esc-busca", type: "search", value: busca,
          onChange: function (e) { setBusca(e.target.value); },
          placeholder: "Buscar loja, código ou centro de custo",
          className: "flex-1 border-0 outline-none text-sm bg-transparent"
        })
      ),

      // Adicionar loja: escolhe a loja, depois o centro daquela loja.
      h("div", { className: "bg-white border border-gray-200 rounded-xl p-3" },
        h("div", { className: "text-xs font-bold text-gray-800 mb-2" }, "Adicionar loja ao painel"),
        h(SeletorCliente, {
          opcoes: props.opcoes,
          codCliente: novoCod,
          centroCusto: novoCC,
          onChange: function (cod, cc) { setNovoCod(cod); setNovoCC(cc); }
        },
          h("button", {
            onClick: function () {
              if (!novoCod) { showToast("Escolha a loja", "error"); return; }
              var jaTem = linhas.some(function (l) {
                return String(l.cod_cliente) === String(novoCod) &&
                  String(l.centro_custo || "") === String(novoCC || "");
              });
              if (jaTem) { showToast("Essa loja/centro já está na lista", "error"); return; }
              var nome = "Cliente " + novoCod;
              (props.opcoes.clientes || []).forEach(function (c) {
                if (String(c.cod_cliente) === String(novoCod)) nome = c.nome;
              });
              adicionar(novoCod, nome, novoCC);
              setNovoCod(""); setNovoCC("");
            },
            style: { minHeight: 38 },
            className: "px-4 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
          }, "Adicionar")
        ),
        semMinimo.length > 0 && h("p", { className: "text-[11px] text-gray-500 mt-2" },
          semMinimo.length + " loja(s) rodaram nos últimos 30 dias e ainda não têm mínimo — elas ficam fora do painel até serem cadastradas.")
      ),

      h("div", { className: "bg-white border border-gray-200 rounded-xl overflow-hidden" },
        h("div", { className: "overflow-x-auto" },
          h("table", { className: "w-full text-xs" },
            h("thead", { className: "bg-gray-100" },
              h("tr", null,
                h("th", { scope: "col", className: "text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Loja"),
                h("th", { scope: "col", className: "text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Centro de custo"),
                h("th", { scope: "col", className: "text-center px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Seg a sex"),
                h("th", { scope: "col", className: "text-center px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Sábado"),
                h("th", { scope: "col", className: "text-center px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Domingo"),
                h("th", { scope: "col", className: "text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Vigente desde"),
                h("th", { scope: "col", className: "px-4 py-2" }, h("span", { className: "sr-only" }, "Ações"))
              )
            ),
            h("tbody", null,
              visiveis.map(function (x) {
                var l = x.l, idx = x.i, alterada = !!sujo[idx];
                return h("tr", {
                  key: (l.id || "novo") + "-" + idx,
                  className: "border-b border-gray-50",
                  style: alterada ? { background: "#faf5ff" } : null
                },
                  h("td", { className: "px-4 py-2" },
                    h("span", { className: "font-semibold text-gray-800" }, l.nome_cliente),
                    h("span", { className: "ml-1.5 text-[10px] text-gray-400", style: { fontVariantNumeric: "tabular-nums" } }, l.cod_cliente)
                  ),
                  h("td", { className: "px-3 py-2" },
                    // centros DAQUELA loja, nao uma lista global de codigos
                    h("select", {
                      value: l.centro_custo || "",
                      "aria-label": "Centro de custo",
                      onChange: function (e) { mudar(idx, "centro_custo", e.target.value); },
                      className: "w-40 rounded-lg border border-gray-200 px-2 text-xs text-gray-600",
                      style: { minHeight: 36 }
                    },
                      h("option", { value: "" }, "Todos os centros"),
                      ((props.opcoes.centros_por_cliente || {})[String(l.cod_cliente)] || []).map(function (x) {
                        return h("option", { key: x.centro_custo, value: x.centro_custo }, x.centro_custo);
                      }),
                      // valor gravado que nao esta mais na lista dos ultimos 120 dias
                      l.centro_custo && !((props.opcoes.centros_por_cliente || {})[String(l.cod_cliente)] || [])
                        .some(function (x) { return x.centro_custo === l.centro_custo; }) &&
                        h("option", { value: l.centro_custo }, l.centro_custo + " (sem movimento recente)")
                    )
                  ),
                  h("td", { className: "px-2 py-2 text-center" }, numInput(l, idx, "min_semana", "Mínimo de segunda a sexta", true)),
                  h("td", { className: "px-2 py-2 text-center" }, numInput(l, idx, "min_sabado", "Mínimo no sábado", false)),
                  h("td", { className: "px-2 py-2 text-center" }, numInput(l, idx, "min_domingo", "Mínimo no domingo", false)),
                  h("td", { className: "px-3 py-2" },
                    h("input", {
                      type: "date", value: l.vigente_desde || hoje(),
                      "aria-label": "Vigente desde",
                      onChange: function (e) { mudar(idx, "vigente_desde", e.target.value); },
                      className: "rounded-lg border border-gray-200 px-2 text-xs text-gray-600",
                      style: { minHeight: 36 }
                    })
                  ),
                  h("td", { className: "px-4 py-2 text-right" },
                    h("button", {
                      onClick: function () { remover(l, idx); },
                      "aria-label": "Remover este mínimo",
                      className: "text-gray-400 hover:text-red-600 rounded-lg",
                      style: { width: 30, height: 30 }
                    }, icone(I_LIXO, 15))
                  )
                );
              }),
              visiveis.length === 0 && h("tr", null,
                h("td", { colSpan: 7, className: "px-4 py-6 text-center text-gray-400 text-sm" },
                  termo ? "Nada encontrado." : "Nenhum mínimo cadastrado ainda.")
              )
            )
          )
        ),
        h("div", { className: "px-4 py-3 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-500 leading-snug" },
          "O mínimo vale a partir da data de vigência. Ao alterar, o histórico anterior continua sendo avaliado pelo valor que valia naquele dia — mudar o número hoje não reescreve o passado. Para trocar o mínimo a partir de uma data, adicione uma linha nova com a nova vigência em vez de editar a existente."
        )
      )
    );
  }

  // ════════════════════════════════════════════════════════════════
  function BiEscala(props) {
    var sTela = useState("panorama"); var tela = sTela[0], setTela = sTela[1];
    var sOpc = useState({ clientes: [], centros_por_cliente: {} });
    var opcoes = sOpc[0], setOpcoes = sOpc[1];

    // Lojas e centros vem uma vez e servem as duas telas.
    useEffect(function () {
      props.fetchAuth(props.API_URL + "/bi/escala/opcoes")
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j.error) setOpcoes(j); })
        .catch(function () {});
    }, []);

    var comuns = {
      API_URL: props.API_URL,
      fetchAuth: props.fetchAuth,
      showToast: props.showToast || function () {},
      irPara: setTela,
      opcoes: opcoes
    };
    return h("div", { className: "space-y-4" },
      tela === "panorama" ? h(Panorama, comuns) : h(Config, comuns)
    );
  }

  window.BiEscala = BiEscala;
  console.log("✅ Módulo Escala v1 carregado");
})();
