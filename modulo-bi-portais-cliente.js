/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/**
 * modulo-bi-portais-cliente.js
 * Aba do BI (admin): cria/gerencia acessos do Portal do Cliente (/relatorios).
 * MULTI-LOJA: um acesso agrupa VÁRIAS lojas, cada uma com seus centros de custo.
 * Consome /api/bi-portal/admin/*  (API_URL ja inclui /api). Padrao: h()=createElement.
 */
(function () {
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect;
  var ROXO = "#770fa8";
  /* BI_ABAS_V1: Portais do cliente no padrão clean (cabeçalho Sora 24, cards brancos sem sombra,
     labels visíveis 12px, inputs 38px raio 10, status em pílula suave). Lógica e chamadas inalteradas. */
  var inputCls = "w-full h-[38px] bg-white border border-gray-200 rounded-[10px] px-3 text-[13px] text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100";
  function label(t, id) { return h("label", { htmlFor: id, className: "block text-xs font-semibold text-gray-700 mb-1.5" }, t); }
  function ico(nome, sz, extra) { return h("svg", { className: "ico", style: Object.assign({ width: sz || 15, height: sz || 15, flexShrink: 0 }, extra || {}), "aria-hidden": "true" }, h("use", { href: "#i-" + nome })); }
  var btnSec = "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[10px] text-[12.5px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap";
  var btnDes = "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[10px] text-[12.5px] font-semibold border bg-white whitespace-nowrap";
  function pillSt(on, txt) {
    var t = on ? ["#f0fdf4", "#166534", "#16a34a"] : ["#f3f4f6", "#374151", "#9ca3af"];
    return h("span", { className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0", style: { background: t[0], color: t[1] } },
      h("span", { style: { width: 6, height: 6, borderRadius: 999, background: t[2] } }), txt);
  }

  function BiPortaisCliente(props) {
    var API_URL = props.API_URL, fetchAuth = props.fetchAuth;
    var showToast = props.showToast || function () {};

    var s_clientes = useState([]); var clientes = s_clientes[0], setClientes = s_clientes[1];
    var s_portais = useState([]); var portais = s_portais[0], setPortais = s_portais[1];
    var s_nome = useState(""); var nome = s_nome[0], setNome = s_nome[1];
    var s_login = useState(""); var login = s_login[0], setLogin = s_login[1];
    var s_senha = useState(""); var senha = s_senha[0], setSenha = s_senha[1];
    var s_lojas = useState([]); var lojas = s_lojas[0], setLojas = s_lojas[1]; // [{cod,nome,centros:[],sel:{},loading}]
    var s_add = useState(""); var addCod = s_add[0], setAddCod = s_add[1];
    var s_edit = useState(null); var editId = s_edit[0], setEditId = s_edit[1];
    var s_load = useState(false); var salvando = s_load[0], setSalvando = s_load[1];

    function jget(url) { return fetchAuth(API_URL + url).then(function (r) { return r.json(); }); }
    function jsend(url, method, body) {
      return fetchAuth(API_URL + url, {
        method: method, headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
    }
    function carregarPortais() { jget("/bi-portal/admin/portais").then(function (r) { setPortais(r || []); }).catch(function () {}); }

    useEffect(function () {
      jget("/bi-portal/admin/clientes").then(function (rows) { setClientes(rows || []); }).catch(function () {});
      carregarPortais();
    }, []);

    function limparForm() { setNome(""); setLogin(""); setSenha(""); setLojas([]); setAddCod(""); setEditId(null); }

    // adiciona uma loja ao acesso (carrega seus centros)
    function adicionarLoja(cod) {
      if (!cod) return;
      if (lojas.some(function (l) { return String(l.cod) === String(cod); })) { setAddCod(""); return; }
      var c = clientes.filter(function (x) { return String(x.cod_cliente) === String(cod); })[0];
      var nova = { cod: parseInt(cod, 10), nome: (c && c.nome_cliente) || String(cod), centros: [], sel: {}, loading: true };
      setLojas(lojas.concat([nova]));
      setAddCod("");
      jget("/bi-portal/admin/clientes/" + cod + "/centros").then(function (rows) {
        setLojas(function (prev) {
          return prev.map(function (l) { return String(l.cod) === String(cod) ? Object.assign({}, l, { centros: rows || [], loading: false }) : l; });
        });
      }).catch(function () {
        setLojas(function (prev) { return prev.map(function (l) { return String(l.cod) === String(cod) ? Object.assign({}, l, { loading: false }) : l; }); });
      });
    }
    function removerLoja(cod) { setLojas(lojas.filter(function (l) { return String(l.cod) !== String(cod); })); }
    function toggleCentro(cod, cc) {
      setLojas(lojas.map(function (l) {
        if (String(l.cod) !== String(cod)) return l;
        var sel = Object.assign({}, l.sel); if (sel[cc]) delete sel[cc]; else sel[cc] = true;
        return Object.assign({}, l, { sel: sel });
      }));
    }
    function marcarTodos(cod, v) {
      setLojas(lojas.map(function (l) {
        if (String(l.cod) !== String(cod)) return l;
        var sel = {}; if (v) l.centros.forEach(function (c) { sel[c.centro_custo] = true; });
        return Object.assign({}, l, { sel: sel });
      }));
    }
    function setFiltroLoja(cod, txt) {
      setLojas(lojas.map(function (l) { return String(l.cod) === String(cod) ? Object.assign({}, l, { filtro: txt }) : l; }));
    }
    function gerarSenha() { setSenha("Tutts@" + Math.random().toString(36).slice(2, 8)); }

    function payloadClientes() {
      return lojas.map(function (l) {
        var disponiveis = (l.centros || []).map(function (c) { return c.centro_custo; });
        var sel = Object.keys(l.sel);
        // marcou TODOS os centros disponíveis = "sem restrição" (vê tudo, inclusive
        // entregas com centro em branco). Evita filtrar por ANY() e zerar a loja.
        var todos = disponiveis.length > 0 && sel.length >= disponiveis.length;
        return { cod_cliente: l.cod, centros: todos ? [] : sel };
      });
    }
    function salvar() {
      if (!nome.trim() || !login.trim() || senha.length < 6 || lojas.length === 0) {
        showToast("Preencha nome, login, senha (min 6) e ao menos 1 loja.", "error"); return;
      }
      setSalvando(true);
      var body = { nome_exibicao: nome.trim(), portal_login: login.trim().toLowerCase(), senha: senha, clientes: payloadClientes() };
      var url = editId ? ("/bi-portal/admin/portais/" + editId) : "/bi-portal/admin/portais";
      var method = editId ? "PUT" : "POST";
      jsend(url, method, body).then(function (res) {
        if (res.ok) { showToast(editId ? "Acesso atualizado." : "Acesso criado.", "success"); limparForm(); carregarPortais(); }
        else { showToast(res.j && res.j.erro === "login_em_uso" ? "Esse login ja existe." : "Nao foi possivel salvar.", "error"); }
      }).catch(function () { showToast("Erro ao salvar acesso.", "error"); })
        .then(function () { setSalvando(false); });
    }

    // editar: carrega o acesso no form (com as lojas + centros marcados)
    function editar(p) {
      setEditId(p.id); setNome(p.nome_exibicao || ""); setLogin(p.portal_login || ""); setSenha("");
      var base = (p.clientes || []).map(function (c) { return { cod: c.cod_cliente, nome: c.nome || String(c.cod_cliente), centros: [], sel: {}, loading: true, _selWanted: null }; });
      setLojas(base);
      // busca centros de cada loja e marca os liberados (via /me? nao — pega do proprio acesso)
      (p.clientes || []).forEach(function (c) {
        Promise.all([
          jget("/bi-portal/admin/clientes/" + c.cod_cliente + "/centros"),
          jget("/bi-portal/admin/portais/" + p.id + "/centros?cliente=" + c.cod_cliente).catch(function () { return { centros: [] }; })
        ]).then(function (arr) {
          var todos = arr[0] || [];
          var liberados = (arr[1] && arr[1].centros) || [];
          var sel = {}; liberados.forEach(function (cc) { sel[cc] = true; });
          setLojas(function (prev) { return prev.map(function (l) { return String(l.cod) === String(c.cod_cliente) ? Object.assign({}, l, { centros: todos, sel: sel, loading: false }) : l; }); });
        }).catch(function () {
          setLojas(function (prev) { return prev.map(function (l) { return String(l.cod) === String(c.cod_cliente) ? Object.assign({}, l, { loading: false }) : l; }); });
        });
      });
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) {}
    }
    function toggleAtivo(p) { jsend("/bi-portal/admin/portais/" + p.id, "PUT", { portal_ativo: !p.portal_ativo }).then(carregarPortais); }
    function resetarSenha(p) { var nova = "Tutts@" + Math.random().toString(36).slice(2, 8); jsend("/bi-portal/admin/portais/" + p.id, "PUT", { senha: nova }).then(function (res) { if (res.ok) showToast("Nova senha: " + nova, "success"); }); }
    function excluir(p) { if (!window.confirm("Remover o acesso de " + p.nome_exibicao + "?")) return; jsend("/bi-portal/admin/portais/" + p.id, "DELETE").then(carregarPortais); }

    // ---- lojas ainda nao adicionadas (pro dropdown) ----
    var jaAdd = {}; lojas.forEach(function (l) { jaAdd[String(l.cod)] = true; });
    var disponiveis = clientes.filter(function (c) { return !jaAdd[String(c.cod_cliente)]; });

    // ---- card de uma loja no form ----
    function cardLoja(l) {
      var qtd = Object.keys(l.sel).length;
      var termo = (l.filtro || "").toLowerCase();
      var visiveis = termo ? l.centros.filter(function (c) { return String(c.centro_custo).toLowerCase().indexOf(termo) !== -1; }) : l.centros;
      return h("div", { key: l.cod, className: "border border-gray-200 rounded-[12px] overflow-hidden mt-3" },
        h("div", { className: "flex items-center justify-between gap-2 flex-wrap px-3 py-2.5", style: { background: "#f9fafb", borderBottom: "1px solid #e5e7eb" } },
          h("div", { className: "font-semibold text-[13px] text-gray-900 flex items-center gap-2 min-w-0" },
            h("span", { className: "rounded-md px-1.5 py-0.5 text-[11.5px] font-bold", style: { background: "#f3e8fb", color: "#5d0b85", fontVariantNumeric: "tabular-nums" } }, l.cod),
            h("span", { className: "truncate" }, l.nome)),
          h("div", { className: "flex items-center gap-1.5 flex-wrap" },
            h("span", { className: "text-xs text-gray-500 mr-1" }, qtd === 0 ? "Todos os centros" : (qtd + " de " + l.centros.length + " centros")),
            h("button", { type: "button", onClick: function () { marcarTodos(l.cod, true); }, className: btnSec + " h-7 px-2.5 text-xs" }, "Marcar todos"),
            h("button", { type: "button", onClick: function () { marcarTodos(l.cod, false); }, className: btnSec + " h-7 px-2.5 text-xs" }, "Limpar"),
            h("button", { type: "button", onClick: function () { removerLoja(l.cod); }, title: "Remover loja " + l.cod, className: btnDes + " h-7 px-2.5 text-xs", style: { borderColor: "#fecaca", color: "#991b1b" } }, "Remover")
          )
        ),
        h("div", { className: "p-3" },
          l.loading ? h("div", { className: "text-[13px] text-gray-500 py-2" }, "Carregando centros...")
            : (l.centros.length === 0 ? h("div", { className: "text-[13px] text-gray-500 py-2" }, "Sem centros para esta loja.")
              : h("div", null,
                (l.centros.length > 8
                  ? h("div", { className: "relative mb-2" },
                      ico("search", 14, { position: "absolute", left: 11, top: 12, color: "#9ca3af" }),
                      h("input", {
                        className: inputCls + " pl-8", value: l.filtro || "", "aria-label": "Buscar centro de custo",
                        onChange: function (e) { setFiltroLoja(l.cod, e.target.value); },
                        placeholder: "Buscar centro (" + l.centros.length + " no total)"
                      }))
                  : null),
                h("div", { className: "grid sm:grid-cols-2 gap-2", style: { maxHeight: "320px", overflowY: "auto", paddingRight: "4px" } },
                  visiveis.length === 0
                    ? h("div", { className: "text-[13px] text-gray-500 py-2 col-span-2" }, "Nenhum centro encontrado.")
                    : visiveis.map(function (c) {
                      var on = !!l.sel[c.centro_custo];
                      return h("label", { key: c.centro_custo, className: "flex items-center gap-3 p-2.5 rounded-[10px] border cursor-pointer " + (on ? "border-purple-300 bg-purple-50" : "border-gray-200 bg-white hover:bg-gray-50") },
                        h("input", { type: "checkbox", checked: on, onChange: function () { toggleCentro(l.cod, c.centro_custo); }, className: "w-4 h-4", style: { accentColor: ROXO } }),
                        h("span", { className: "flex-1 min-w-0" },
                          h("span", { className: "block font-semibold text-[13px] text-gray-900 truncate" }, c.centro_custo),
                          h("span", { className: "block text-xs text-gray-500" }, (c.entregas_30d || 0) + " entregas em 30 dias"))
                      );
                    })
                )
              )),
          h("div", { className: "text-xs text-gray-500 mt-2" }, "Nenhum centro marcado = o cliente vê todos os centros desta loja.")
        )
      );
    }

    var formCard = h("section", { "aria-labelledby": "bipc-form-titulo", className: "bg-white border border-gray-200 rounded-[14px] p-5" },
      h("div", { className: "flex items-start justify-between gap-3 mb-4" },
        h("div", null,
          h("h2", { id: "bipc-form-titulo", className: "text-[15px] font-semibold text-gray-900" }, editId ? "Editar acesso" : "Novo acesso"),
          h("p", { className: "text-[13px] text-gray-500 mt-0.5" }, editId ? ("Alterando " + (nome || "acesso") + ". Deixe a senha vazia para manter a atual.") : "Defina o nome, as lojas liberadas e o login do cliente.")),
        editId ? h("span", { className: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0", style: { background: "#faf7fd", color: "#5d0b85" } }, h("span", { style: { width: 6, height: 6, borderRadius: 999, background: "#770fa8" } }), "Editando") : null),
      h("div", null, label("Nome de exibição no portal", "bipc-nome"),
        h("input", { id: "bipc-nome", className: inputCls, value: nome, onChange: function (e) { setNome(e.target.value); }, placeholder: "Ex.: Grupo Comollati" })),
      h("div", { className: "mt-5" },
        h("div", { className: "flex items-center justify-between" },
          label("Lojas do acesso", "bipc-add-loja"),
          h("span", { className: "text-xs text-gray-500 mb-1.5" }, lojas.length + " loja(s)")),
        h("div", { className: "flex gap-2 items-end" },
          h("select", { id: "bipc-add-loja", className: inputCls, value: addCod, onChange: function (e) { setAddCod(e.target.value); } },
            h("option", { value: "" }, "Escolha uma loja para adicionar"),
            disponiveis.map(function (c) { return h("option", { key: c.cod_cliente, value: c.cod_cliente }, c.cod_cliente + " - " + (c.nome_cliente || "sem nome")); })),
          h("button", { type: "button", onClick: function () { adicionarLoja(addCod); }, disabled: !addCod, className: "inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] text-[13px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap disabled:opacity-50" }, ico("plus"), "Adicionar loja")
        ),
        lojas.length === 0 ? h("div", { className: "text-[13px] text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-[12px] mt-3" }, "Nenhuma loja ainda. Adicione uma ou mais lojas a este acesso.") : lojas.map(cardLoja)
      ),
      h("div", { className: "grid sm:grid-cols-2 gap-4 mt-5 pt-5", style: { borderTop: "1px solid #f3f4f6" } },
        h("div", null, label("Login (e-mail ou usuário)", "bipc-login"),
          h("input", { id: "bipc-login", className: inputCls, value: login, onChange: function (e) { setLogin(e.target.value); }, placeholder: "Ex.: comollati", autoComplete: "off" })),
        h("div", null, label(editId ? "Nova senha (vazio mantém a atual)" : "Senha", "bipc-senha"),
          h("div", { className: "flex gap-2" },
            h("input", { id: "bipc-senha", className: inputCls, value: senha, onChange: function (e) { setSenha(e.target.value); }, placeholder: "Mínimo 6 caracteres", autoComplete: "new-password" }),
            h("button", { type: "button", onClick: gerarSenha, className: "inline-flex items-center gap-1.5 h-[38px] px-3 rounded-[10px] text-[13px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap" }, ico("key"), "Gerar")))
      ),
      h("div", { className: "mt-5 pt-4 flex gap-2 justify-end flex-wrap", style: { borderTop: "1px solid #f3f4f6" } },
        editId ? h("button", { type: "button", onClick: limparForm, className: "inline-flex items-center h-10 px-4 rounded-[10px] text-[13px] font-semibold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50" }, "Cancelar edição") : null,
        h("button", { type: "button", onClick: salvar, disabled: salvando, className: "inline-flex items-center gap-1.5 h-10 px-4 rounded-[10px] text-[13px] font-semibold text-white", style: { background: ROXO, opacity: salvando ? 0.6 : 1, cursor: salvando ? "wait" : "pointer" } },
          salvando ? "Salvando..." : (editId ? h(React.Fragment, null, ico("save"), "Salvar alterações") : h(React.Fragment, null, ico("plus"), "Criar acesso")))
      )
    );

    function pill(txt, key) { return h("span", { key: key, className: "inline-flex items-center text-xs font-semibold rounded-full px-2 py-0.5 mr-1 mt-1", style: { background: "#faf7fd", color: "#5d0b85", border: "1px solid #f3e8fb", fontVariantNumeric: "tabular-nums" } }, txt); }
    var nAtivos = portais.filter(function (p) { return p.portal_ativo; }).length;
    var listaCard = h("section", { "aria-labelledby": "bipc-lista-titulo", className: "bg-white border border-gray-200 rounded-[14px] overflow-hidden self-start" },
      h("div", { className: "flex items-center justify-between gap-2 px-5 py-4", style: { borderBottom: "1px solid #f3f4f6" } },
        h("div", null,
          h("h2", { id: "bipc-lista-titulo", className: "text-[15px] font-semibold text-gray-900" }, "Acessos"),
          h("p", { className: "text-[13px] text-gray-500 mt-0.5" }, portais.length + " acesso(s) · " + nAtivos + " ativo(s)"))),
      portais.length === 0 ? h("div", { className: "text-[13px] text-gray-500 py-10 px-5 text-center" }, "Nenhum acesso criado ainda. Use o formulário para criar o primeiro.")
        : h("div", null,
          portais.map(function (p, i) {
            var cls = (p.clientes || []);
            var emEdicao = editId === p.id;
            return h("div", { key: p.id, className: "px-5 py-3.5", style: { borderTop: i === 0 ? "none" : "1px solid #f3f4f6", background: emEdicao ? "#faf7fd" : "#ffffff", boxShadow: emEdicao ? "inset 3px 0 0 #770fa8" : "none" } },
              h("div", { className: "flex items-start gap-3" },
                h("div", { className: "flex-1 min-w-0" },
                  h("div", { className: "font-semibold text-[13px] text-gray-900 truncate" }, p.nome_exibicao),
                  h("div", { className: "text-xs text-gray-500 truncate" }, p.portal_login),
                  h("div", { className: "mt-0.5" }, cls.length ? cls.map(function (c) { return pill(c.cod_cliente + " · " + (c.centros > 0 ? (c.centros + " centros") : "todos"), c.cod_cliente); }) : h("span", { className: "text-xs text-gray-500" }, "Sem loja"))),
                pillSt(!!p.portal_ativo, p.portal_ativo ? "Ativo" : "Inativo")),
              h("div", { className: "flex gap-1.5 mt-2.5 flex-wrap" },
                h("button", { type: "button", onClick: function () { editar(p); }, className: btnSec }, ico("pencil", 13), "Editar"),
                h("button", { type: "button", onClick: function () { toggleAtivo(p); }, className: btnSec }, ico("power", 13), p.portal_ativo ? "Desativar" : "Ativar"),
                h("button", { type: "button", onClick: function () { resetarSenha(p); }, className: btnSec }, ico("key", 13), "Nova senha"),
                h("button", { type: "button", onClick: function () { excluir(p); }, className: btnDes, style: { borderColor: "#fecaca", color: "#991b1b" } }, ico("trash", 13), "Excluir"))
            );
          })
        )
    );

    return h("div", { className: "flex flex-col gap-4", style: { color: "#111827" } },
      h("div", null,
        h("h1", { style: { margin: 0, fontFamily: "Sora, Inter, sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "#111827" } }, "Portais do cliente"),
        h("p", { style: { margin: "4px 0 0", fontSize: 13, color: "#6b7280" } }, "Crie um login que agrupa várias lojas, cada uma com seus centros de custo. No portal, o cliente escolhe qual loja ver.")),
      h("div", { className: "grid lg:grid-cols-[1.2fr_.8fr] gap-4 items-start" }, formCard, listaCard)
    );
  }

  window.BiPortaisCliente = BiPortaisCliente;
})();
