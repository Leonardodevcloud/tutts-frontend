/**
 * modulo-bi-portais-cliente.js
 * Aba do BI (admin): cria/gerencia os acessos do Portal do Cliente (/relatorios).
 * Consome /api/bi-portal/admin/*  (API_URL ja inclui /api).
 * Padrao do projeto: h() = React.createElement, sem JSX, registra window.BiPortaisCliente.
 */
(function () {
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect;
  var ROXO = "#7c3aed";

  function BiPortaisCliente(props) {
    var API_URL = props.API_URL, fetchAuth = props.fetchAuth;
    var showToast = props.showToast || function () {};

    var s_clientes = useState([]); var clientes = s_clientes[0], setClientes = s_clientes[1];
    var s_portais = useState([]); var portais = s_portais[0], setPortais = s_portais[1];
    var s_cod = useState(""); var cod = s_cod[0], setCod = s_cod[1];
    var s_nome = useState(""); var nome = s_nome[0], setNome = s_nome[1];
    var s_login = useState(""); var login = s_login[0], setLogin = s_login[1];
    var s_senha = useState(""); var senha = s_senha[0], setSenha = s_senha[1];
    var s_centros = useState([]); var centros = s_centros[0], setCentros = s_centros[1];
    var s_sel = useState({}); var sel = s_sel[0], setSel = s_sel[1];
    var s_load = useState(false); var salvando = s_load[0], setSalvando = s_load[1];
    var s_loadC = useState(false); var loadingCentros = s_loadC[0], setLoadingCentros = s_loadC[1];

    function jget(url) { return fetchAuth(API_URL + url).then(function (r) { return r.json(); }); }
    function jsend(url, method, body) {
      return fetchAuth(API_URL + url, {
        method: method, headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
    }

    function carregarPortais() { jget("/bi-portal/admin/portais").then(setPortais).catch(function () {}); }

    useEffect(function () {
      jget("/bi-portal/admin/clientes").then(function (rows) { setClientes(rows || []); }).catch(function () {});
      carregarPortais();
    }, []);

    function onCliente(v) {
      setCod(v); setSel({}); setCentros([]);
      var c = clientes.filter(function (x) { return String(x.cod_cliente) === String(v); })[0];
      if (c && !nome) setNome(c.nome_cliente || "");
      if (!v) return;
      setLoadingCentros(true);
      jget("/bi-portal/admin/clientes/" + v + "/centros")
        .then(function (rows) { setCentros(rows || []); })
        .catch(function () {})
        .then(function () { setLoadingCentros(false); });
    }
    function toggleCentro(cc) { var n = Object.assign({}, sel); if (n[cc]) delete n[cc]; else n[cc] = true; setSel(n); }
    function marcarTodos(v) { var n = {}; if (v) centros.forEach(function (c) { n[c.centro_custo] = true; }); setSel(n); }
    function gerarSenha() { setSenha("Tutts@" + Math.random().toString(36).slice(2, 8)); }

    function criar() {
      var centrosSel = Object.keys(sel);
      if (!cod || !nome.trim() || !login.trim() || senha.length < 6) {
        showToast("Preencha cliente, nome, login e senha (min 6).", "error"); return;
      }
      setSalvando(true);
      jsend("/bi-portal/admin/portais", "POST", {
        cod_cliente: parseInt(cod, 10), nome_exibicao: nome.trim(),
        portal_login: login.trim().toLowerCase(), senha: senha, centros: centrosSel
      }).then(function (res) {
        if (res.ok) {
          showToast("Acesso criado.", "success");
          setNome(""); setLogin(""); setSenha(""); setSel({}); setCod(""); setCentros([]);
          carregarPortais();
        } else {
          showToast(res.j && res.j.erro === "login_em_uso" ? "Esse login ja existe." : "Nao foi possivel criar.", "error");
        }
      }).catch(function () { showToast("Erro ao criar acesso.", "error"); })
        .then(function () { setSalvando(false); });
    }

    function toggleAtivo(p) {
      jsend("/bi-portal/admin/portais/" + p.id, "PUT", { portal_ativo: !p.portal_ativo })
        .then(function () { carregarPortais(); });
    }
    function resetarSenha(p) {
      var nova = "Tutts@" + Math.random().toString(36).slice(2, 8);
      jsend("/bi-portal/admin/portais/" + p.id, "PUT", { senha: nova })
        .then(function (res) { if (res.ok) showToast("Nova senha: " + nova, "success"); });
    }
    function excluir(p) {
      if (!window.confirm("Remover o acesso de " + p.nome_exibicao + "?")) return;
      jsend("/bi-portal/admin/portais/" + p.id, "DELETE").then(function () { carregarPortais(); });
    }

    var qtdSel = Object.keys(sel).length;

    // ------- UI -------
    function label(t) { return h("label", { className: "block text-xs font-semibold text-gray-500 mb-1" }, t); }
    var inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200";

    var formCard = h("div", { className: "bg-white rounded-xl shadow p-6" },
      h("div", { className: "grid sm:grid-cols-2 gap-4" },
        h("div", null, label("Cliente"),
          h("select", { className: inputCls, value: cod, onChange: function (e) { onCliente(e.target.value); } },
            h("option", { value: "" }, "Selecione um cliente"),
            clientes.map(function (c) {
              return h("option", { key: c.cod_cliente, value: c.cod_cliente },
                c.cod_cliente + " - " + (c.nome_cliente || "sem nome"));
            })
          )
        ),
        h("div", null, label("Nome de exibicao no portal"),
          h("input", { className: inputCls, value: nome, onChange: function (e) { setNome(e.target.value); }, placeholder: "Ex.: Comollati Auto Pecas" })
        )
      ),
      h("div", { className: "mt-5" },
        h("div", { className: "flex items-center justify-between mb-2" },
          label("Centros de custo liberados"),
          h("div", { className: "flex gap-2" },
            h("button", { type: "button", onClick: function () { marcarTodos(true); }, className: "text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-600" }, "Todos"),
            h("button", { type: "button", onClick: function () { marcarTodos(false); }, className: "text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-600" }, "Limpar")
          )
        ),
        loadingCentros
          ? h("div", { className: "text-sm text-gray-400 py-3" }, "Carregando centros...")
          : (!cod
            ? h("div", { className: "text-sm text-gray-400 py-3" }, "Selecione um cliente para ver os centros.")
            : (centros.length === 0
              ? h("div", { className: "text-sm text-gray-400 py-3" }, "Sem centros para este cliente.")
              : h("div", { className: "grid sm:grid-cols-2 gap-2" },
                centros.map(function (c) {
                  var on = !!sel[c.centro_custo];
                  return h("label", {
                    key: c.centro_custo,
                    className: "flex items-center gap-3 p-3 rounded-lg border cursor-pointer " + (on ? "border-purple-400 bg-purple-50" : "border-gray-200")
                  },
                    h("input", { type: "checkbox", checked: on, onChange: function () { toggleCentro(c.centro_custo); }, className: "w-4 h-4 accent-purple-600" }),
                    h("span", { className: "flex-1" },
                      h("span", { className: "font-semibold text-sm" }, c.centro_custo),
                      h("span", { className: "block text-xs text-gray-400" }, (c.entregas_30d || 0) + " entregas / 30d")
                    )
                  );
                })
              )
            )
          ),
        h("div", { className: "text-xs text-gray-400 mt-2" },
          qtdSel === 0 ? "Nenhum centro marcado = o cliente vera TODOS os centros dele." : (qtdSel + " centro(s) selecionado(s).")
        )
      ),
      h("div", { className: "grid sm:grid-cols-2 gap-4 mt-5" },
        h("div", null, label("Login (email ou usuario)"),
          h("input", { className: inputCls, value: login, onChange: function (e) { setLogin(e.target.value); }, placeholder: "comollati" })
        ),
        h("div", null, label("Senha"),
          h("div", { className: "flex gap-2" },
            h("input", { className: inputCls, value: senha, onChange: function (e) { setSenha(e.target.value); }, placeholder: "min 6 caracteres" }),
            h("button", { type: "button", onClick: gerarSenha, className: "text-xs font-semibold px-3 rounded-lg border border-gray-200 text-gray-600 whitespace-nowrap" }, "Gerar")
          )
        )
      ),
      h("div", { className: "mt-6" },
        h("button", {
          onClick: criar, disabled: salvando,
          className: "text-white font-bold rounded-lg px-5 py-2.5 text-sm",
          style: { background: ROXO, opacity: salvando ? 0.6 : 1 }
        }, salvando ? "Criando..." : "Criar acesso")
      )
    );

    var listaCard = h("div", { className: "bg-white rounded-xl shadow p-6" },
      h("div", { className: "flex items-center justify-between mb-3" },
        h("h3", { className: "font-bold text-[15px]" }, "Acessos ativos"),
        h("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700" }, portais.length + " acesso(s)")
      ),
      portais.length === 0
        ? h("div", { className: "text-sm text-gray-400 py-4" }, "Nenhum acesso criado ainda.")
        : h("div", { className: "space-y-2" },
          portais.map(function (p) {
            return h("div", { key: p.id, className: "flex items-center gap-3 p-3 rounded-lg border border-gray-200" },
              h("div", {
                className: "w-9 h-9 rounded-lg grid place-items-center text-white text-xs font-bold",
                style: { background: ROXO }
              }, String(p.cod_cliente).slice(0, 4)),
              h("div", { className: "flex-1 min-w-0" },
                h("div", { className: "font-semibold text-sm truncate" }, p.nome_exibicao),
                h("div", { className: "text-xs text-gray-400 truncate" },
                  p.portal_login + " - " + (p.centros_liberados > 0 ? (p.centros_liberados + " centro(s)") : "todos os centros"))
              ),
              h("span", {
                className: "text-xs font-semibold px-2 py-0.5 rounded-full " + (p.portal_ativo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")
              }, p.portal_ativo ? "ativo" : "inativo"),
              h("button", { onClick: function () { toggleAtivo(p); }, className: "text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-600" }, p.portal_ativo ? "Desativar" : "Ativar"),
              h("button", { onClick: function () { resetarSenha(p); }, className: "text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-600" }, "Nova senha"),
              h("button", { onClick: function () { excluir(p); }, className: "text-xs font-semibold px-2.5 py-1 rounded-full border border-red-200 text-red-600" }, "Excluir")
            );
          })
        )
    );

    return h("div", null,
      h("div", { className: "mb-4" },
        h("h2", { className: "text-xl font-extrabold" }, "Portais do Cliente"),
        h("p", { className: "text-sm text-gray-500 mt-1" },
          "Crie um login para o cliente acompanhar as proprias entregas em /relatorios. Escolha o cliente e quais centros de custo ele enxerga.")
      ),
      h("div", { className: "grid lg:grid-cols-[1.15fr_.85fr] gap-6" }, formCard, listaCard)
    );
  }

  window.BiPortaisCliente = BiPortaisCliente;
})();
