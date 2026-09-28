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
  // PANORAMA
  // ════════════════════════════════════════════════════════════════
  function Panorama(props) {
    var API_URL = props.API_URL, fetchAuth = props.fetchAuth, showToast = props.showToast;

    var sDe = useState(diasAtras(27)); var de = sDe[0], setDe = sDe[1];
    var sAte = useState(hoje()); var ate = sAte[0], setAte = sAte[1];
    var sDados = useState(null); var dados = sDados[0], setDados = sDados[1];
    var sLoad = useState(false); var loading = sLoad[0], setLoading = sLoad[1];
    var sErro = useState(null); var erro = sErro[0], setErro = sErro[1];

    var carregar = function () {
      setLoading(true); setErro(null);
      fetchAuth(API_URL + "/bi/escala/panorama?de=" + de + "&ate=" + ate)
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.error) { setErro(j.error); setDados(null); }
          else setDados(j);
        })
        .catch(function () { setErro("Erro de conexão"); })
        .finally(function () { setLoading(false); });
    };
    useEffect(carregar, []);

    if (loading) return h("div", { className: "text-center text-gray-500 py-10 text-sm" }, "Carregando escala...");

    var k = dados && dados.kpis;

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
        h("button", {
          onClick: carregar, style: { minHeight: 38 },
          className: "px-4 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700"
        }, "Aplicar"),
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

      k && h("div", { className: "flex gap-3" },
        kpi("Dias analisados", String(k.dias_analisados)),
        kpi("Dias abaixo do mínimo", String(k.dias_abaixo), k.dias_abaixo > 0 ? "#b91c1c" : "#15803d"),
        kpi("Cobertura média", k.cobertura_media === null ? "—" : k.cobertura_media + "%",
          (k.cobertura_media !== null && k.cobertura_media < 100) ? "#b91c1c" : "#15803d"),
        kpi("Saldo no período", (k.saldo > 0 ? "+" : "") + k.saldo, k.saldo < 0 ? "#b91c1c" : "#15803d")
      ),

      dados && !dados.sem_configuracao && h("div", { className: "flex gap-3 items-start flex-wrap" },

        // por dia
        h("div", { className: "bg-white border border-gray-200 rounded-xl overflow-hidden", style: { flex: "1 1 520px", minWidth: 420 } },
          h("div", { className: "px-4 py-3 border-b border-gray-200 flex items-baseline justify-between" },
            h("h3", { className: "font-bold text-gray-900 text-sm" }, "Por dia"),
            h("span", { className: "text-[11px] text-gray-400" }, "somando todas as lojas do filtro")
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
                (dados.dias || []).map(function (d) {
                  return h("tr", { key: d.dia, className: "border-b border-gray-50 hover:bg-purple-50" },
                    h("td", { className: "px-4 py-2" },
                      h("span", { className: "font-semibold text-gray-800", style: { fontVariantNumeric: "tabular-nums" } }, d.dia_br),
                      h("span", { className: "ml-1.5 text-[10px] text-gray-400" }, SEMANA[d.dow]),
                      d.lojas_abaixo > 0 && h("span", { className: "ml-2 text-[10px] text-red-600 font-semibold" },
                        d.lojas_abaixo + (d.lojas_abaixo === 1 ? " loja em falta" : " lojas em falta"))
                    ),
                    h("td", { className: "px-3 py-2 text-right text-gray-500", style: { fontVariantNumeric: "tabular-nums" } }, d.minimo),
                    h("td", { className: "px-3 py-2 text-right font-bold text-gray-900", style: { fontVariantNumeric: "tabular-nums" } }, d.reais),
                    h("td", { className: "px-3 py-2 text-right" }, celulaSaldo(d.saldo)),
                    h("td", { className: "px-4 py-2 text-right" }, celulaCobertura(d.cobertura))
                  );
                }),
                (dados.dias || []).length === 0 && h("tr", null,
                  h("td", { colSpan: 5, className: "px-4 py-6 text-center text-gray-400 text-sm" }, "Sem dias avaliados no período.")
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
                  h("th", { scope: "col", className: "text-right px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-600" }, "Saldo")
                )
              ),
              h("tbody", null,
                (dados.clientes || []).map(function (c) {
                  return h("tr", { key: c.cod_cliente + "|" + (c.centro_custo || ""), className: "border-b border-gray-50" },
                    h("td", { className: "px-4 py-2" },
                      h("span", { className: "text-gray-800" }, c.nome_cliente),
                      h("span", { className: "ml-1.5 text-[10px] text-gray-400", style: { fontVariantNumeric: "tabular-nums" } }, c.cod_cliente),
                      c.centro_custo && h("div", { className: "text-[10px] text-gray-400" }, c.centro_custo)
                    ),
                    h("td", { className: "px-2 py-2 text-right text-gray-500", style: { fontVariantNumeric: "tabular-nums" } }, c.minimo_atual),
                    h("td", {
                      className: "px-2 py-2 text-right font-semibold",
                      style: { fontVariantNumeric: "tabular-nums", color: c.dias_abaixo > 0 ? "#b91c1c" : "#64748b" }
                    }, c.dias_abaixo),
                    h("td", { className: "px-4 py-2 text-right" }, celulaSaldo(c.saldo))
                  );
                })
              )
            )
          ),
          h("div", { className: "px-4 py-2.5 border-t border-gray-200 bg-amber-50 flex items-start gap-2" },
            h("span", { className: "text-amber-700 mt-0.5" }, icone(I_ALERTA, 14)),
            h("span", { className: "text-[11px] text-amber-900 leading-snug" },
              "Saldo negativo = rodou menos profissionais que o mínimo. Despacho por app externo não entra na contagem.")
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

    var adicionar = function (cod, nome) {
      setLinhas(function (prev) {
        return prev.concat([{
          id: null, cod_cliente: cod, nome_cliente: nome || ("Cliente " + cod),
          centro_custo: "", min_semana: 0, min_sabado: 0, min_domingo: 0,
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
          h("h3", { className: "font-bold text-gray-900 text-base" }, "Mínimo de profissionais por loja"),
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

      semMinimo.length > 0 && h("div", { className: "bg-amber-50 border border-amber-200 rounded-xl p-3" },
        h("div", { className: "flex items-center gap-2 mb-2" },
          h("span", { className: "text-amber-700" }, icone(I_ALERTA, 15)),
          h("span", { className: "text-xs text-amber-900 font-semibold" },
            semMinimo.length + " loja(s) com movimento nos últimos 30 dias e sem mínimo cadastrado — ficam fora do painel")
        ),
        h("div", { className: "flex flex-wrap gap-1.5" },
          semMinimo.map(function (s) {
            return h("button", {
              key: s.cod_cliente,
              onClick: function () { adicionar(s.cod_cliente, s.nome_cliente); },
              className: "px-2 py-1 rounded-lg border border-amber-300 bg-white text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
            }, "+ " + (s.nome_cliente || s.cod_cliente) + " (" + s.dias_com_movimento + "d)");
          })
        )
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
                    h("input", {
                      type: "text", value: l.centro_custo || "",
                      placeholder: "todos",
                      "aria-label": "Centro de custo",
                      onChange: function (e) { mudar(idx, "centro_custo", e.target.value); },
                      className: "w-32 rounded-lg border border-gray-200 px-2 text-xs text-gray-600",
                      style: { minHeight: 36 }
                    })
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
    var comuns = {
      API_URL: props.API_URL,
      fetchAuth: props.fetchAuth,
      showToast: props.showToast || function () {},
      irPara: setTela
    };
    return h("div", { className: "space-y-4" },
      tela === "panorama" ? h(Panorama, comuns) : h(Config, comuns)
    );
  }

  window.BiEscala = BiEscala;
  console.log("✅ Módulo Escala v1 carregado");
})();
