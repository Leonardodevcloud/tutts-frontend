/**
 * modulo-bi-portais-cliente.js
 * Aba do BI (admin): cria/gerencia acessos do Portal do Cliente (/relatorios).
 * MULTI-LOJA: um acesso agrupa VÁRIAS lojas, cada uma com seus centros de custo.
 * Consome /api/bi-portal/admin/*  (API_URL ja inclui /api). Padrao: h()=createElement.
 */
(function () {
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect;
  var ROXO = "#7c3aed";
  var inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200";
  function label(t) { return h("label", { className: "block text-xs font-semibold text-gray-500 mb-1" }, t); }

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
    function gerarSenha() { setSenha("Tutts@" + Math.random().toString(36).slice(2, 8)); }

    function payloadClientes() {
      return lojas.map(function (l) { return { cod_cliente: l.cod, centros: Object.keys(l.sel) }; });
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
      return h("div", { key: l.cod, className: "border border-gray-200 rounded-xl overflow-hidden mt-3" },
        h("div", { className: "flex items-center justify-between px-3 py-2.5", style: { background: "#faf7ff", borderBottom: "1px solid #eee" } },
          h("div", { className: "font-bold text-sm flex items-center gap-2" },
            h("span", { className: "text-white rounded-md px-1.5 py-0.5 text-[11px]", style: { background: ROXO } }, l.cod), l.nome),
          h("div", { className: "flex items-center gap-2" },
            h("span", { className: "text-[11px] text-gray-500" }, qtd === 0 ? "todos os centros" : (qtd + " de " + l.centros.length)),
            h("button", { type: "button", onClick: function () { marcarTodos(l.cod, true); }, className: "text-[11px] font-semibold px-2 py-0.5 rounded-full border border-purple-200 text-purple-700" }, "Todos"),
            h("button", { type: "button", onClick: function () { marcarTodos(l.cod, false); }, className: "text-[11px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 text-gray-600" }, "Limpar"),
            h("button", { type: "button", onClick: function () { removerLoja(l.cod); }, className: "text-[11px] font-semibold px-2 py-0.5 rounded-full border border-red-200 text-red-600" }, "remover")
          )
        ),
        h("div", { className: "p-3" },
          l.loading ? h("div", { className: "text-sm text-gray-400 py-2" }, "Carregando centros...")
            : (l.centros.length === 0 ? h("div", { className: "text-sm text-gray-400 py-2" }, "Sem centros para esta loja.")
              : h("div", { className: "grid sm:grid-cols-2 gap-2" },
                l.centros.map(function (c) {
                  var on = !!l.sel[c.centro_custo];
                  return h("label", { key: c.centro_custo, className: "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer " + (on ? "border-purple-400 bg-purple-50" : "border-gray-200") },
                    h("input", { type: "checkbox", checked: on, onChange: function () { toggleCentro(l.cod, c.centro_custo); }, className: "w-4 h-4 accent-purple-600" }),
                    h("span", { className: "flex-1" },
                      h("span", { className: "font-semibold text-sm" }, c.centro_custo),
                      h("span", { className: "block text-xs text-gray-400" }, (c.entregas_30d || 0) + " entregas / 30d"))
                  );
                })
              )),
          h("div", { className: "text-[11px] text-gray-400 mt-2" }, "Nenhum centro marcado = o cliente vê TODOS os centros desta loja.")
        )
      );
    }

    var formCard = h("div", { className: "bg-white rounded-xl shadow p-6" },
      h("div", null, label("Nome de exibicao no portal"),
        h("input", { className: inputCls, value: nome, onChange: function (e) { setNome(e.target.value); }, placeholder: "Ex.: Grupo Comollati" })),
      h("div", { className: "mt-5" },
        h("div", { className: "flex items-center justify-between mb-1" },
          label("Lojas do acesso"),
          h("span", { className: "text-[11px] text-gray-400" }, lojas.length + " loja(s)")),
        h("div", { className: "flex gap-2 items-end" },
          h("select", { className: inputCls, value: addCod, onChange: function (e) { setAddCod(e.target.value); } },
            h("option", { value: "" }, "+ Adicionar loja..."),
            disponiveis.map(function (c) { return h("option", { key: c.cod_cliente, value: c.cod_cliente }, c.cod_cliente + " - " + (c.nome_cliente || "sem nome")); })),
          h("button", { type: "button", onClick: function () { adicionarLoja(addCod); }, className: "text-sm font-semibold px-4 rounded-lg border whitespace-nowrap", style: { borderColor: ROXO, color: ROXO, height: 38 } }, "Adicionar")
        ),
        lojas.length === 0 ? h("div", { className: "text-sm text-gray-400 py-3" }, "Adicione uma ou mais lojas a este acesso.") : lojas.map(cardLoja)
      ),
      h("div", { className: "grid sm:grid-cols-2 gap-4 mt-5 pt-5", style: { borderTop: "1px solid #eee" } },
        h("div", null, label("Login (email ou usuario)"),
          h("input", { className: inputCls, value: login, onChange: function (e) { setLogin(e.target.value); }, placeholder: "comollati" })),
        h("div", null, label(editId ? "Nova senha (deixe vazio p/ manter)" : "Senha"),
          h("div", { className: "flex gap-2" },
            h("input", { className: inputCls, value: senha, onChange: function (e) { setSenha(e.target.value); }, placeholder: "min 6 caracteres" }),
            h("button", { type: "button", onClick: gerarSenha, className: "text-xs font-semibold px-3 rounded-lg border border-gray-200 text-gray-600 whitespace-nowrap" }, "Gerar")))
      ),
      h("div", { className: "mt-6 flex gap-2" },
        h("button", { onClick: salvar, disabled: salvando, className: "text-white font-bold rounded-lg px-5 py-2.5 text-sm", style: { background: ROXO, opacity: salvando ? 0.6 : 1 } },
          salvando ? "Salvando..." : (editId ? "Salvar alteracoes" : "Criar acesso")),
        editId ? h("button", { onClick: limparForm, className: "font-semibold rounded-lg px-4 py-2.5 text-sm border border-gray-200 text-gray-600" }, "Cancelar edicao") : null
      )
    );

    function pill(txt) { return h("span", { className: "inline-block text-[11px] font-semibold rounded-full px-2 py-0.5 mr-1 mt-1", style: { background: "#eef2ff", color: "#4338ca" } }, txt); }
    var listaCard = h("div", { className: "bg-white rounded-xl shadow p-6" },
      h("div", { className: "flex items-center justify-between mb-3" },
        h("h3", { className: "font-bold text-[15px]" }, "Acessos ativos"),
        h("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700" }, portais.length + " acesso(s)")),
      portais.length === 0 ? h("div", { className: "text-sm text-gray-400 py-4" }, "Nenhum acesso criado ainda.")
        : h("div", { className: "space-y-2" },
          portais.map(function (p) {
            var cls = (p.clientes || []);
            return h("div", { key: p.id, className: "p-3 rounded-lg border border-gray-200" },
              h("div", { className: "flex items-start gap-3" },
                h("div", { className: "w-9 h-9 rounded-lg grid place-items-center text-white text-xs font-bold flex-shrink-0", style: { background: ROXO } }, String((cls[0] && cls[0].cod_cliente) || "").slice(0, 4)),
                h("div", { className: "flex-1 min-w-0" },
                  h("div", { className: "font-semibold text-sm truncate" }, p.nome_exibicao),
                  h("div", { className: "text-xs text-gray-400 truncate" }, p.portal_login),
                  h("div", { className: "mt-0.5" }, cls.length ? cls.map(function (c) { return pill(c.cod_cliente + " · " + (c.centros > 0 ? (c.centros + " centros") : "todos")); }) : h("span", { className: "text-[11px] text-gray-400" }, "sem loja"))),
                h("span", { className: "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 " + (p.portal_ativo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500") }, p.portal_ativo ? "ativo" : "inativo")),
              h("div", { className: "flex gap-2 mt-2 flex-wrap" },
                h("button", { onClick: function () { editar(p); }, className: "text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-200 text-purple-700" }, "Editar"),
                h("button", { onClick: function () { toggleAtivo(p); }, className: "text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-600" }, p.portal_ativo ? "Desativar" : "Ativar"),
                h("button", { onClick: function () { resetarSenha(p); }, className: "text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-600" }, "Nova senha"),
                h("button", { onClick: function () { excluir(p); }, className: "text-xs font-semibold px-2.5 py-1 rounded-full border border-red-200 text-red-600" }, "Excluir"))
            );
          })
        )
    );

    return h("div", null,
      h("div", { className: "mb-4" },
        h("h2", { className: "text-xl font-extrabold" }, "Portais do Cliente"),
        h("p", { className: "text-sm text-gray-500 mt-1" }, "Crie um login que pode agrupar VÁRIAS lojas, cada uma com seus centros de custo. Na visualizacao, o cliente escolhe qual loja ver.")),
      h("div", { className: "grid lg:grid-cols-[1.2fr_.8fr] gap-6" }, formCard, listaCard)
    );
  }

  window.BiPortaisCliente = BiPortaisCliente;
})();
