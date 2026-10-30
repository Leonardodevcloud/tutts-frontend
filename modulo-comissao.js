/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/**
 * modulo-comissao.js — COMISSAO_V1
 * COMISSAO_REGRAS_V1 — garantido no cálculo, Tutts × Hub, data/regra por centro
 *                      de custo, % personalizada e memória de cálculo.
 * COMISSAO_FIXO_V1   — cliente de contrato fixo (fora do BI): motoboys com valor
 *                      do contrato, valor pago, início/saída; comissão em % ou R$/mês.
 * ─────────────────────────────────────────────────────────────────────────
 * Aba "Comissão" do módulo Financeiro.
 *
 * Blocos: indicadores, comissão por vendedor e apuração por cliente (linhas
 * filhas por centro/motoboy), com seletor de competência. Painéis laterais:
 * Cadastro, Lançamento (com memória de cálculo), Extrato, Vendedores, Histórico.
 *
 * Conta (espelho de comissao.shared.js, recalculada a cada digitação):
 *   Faturamento real = bruto − garantido · Margem = real − repasse
 *   Imposto = margem × % · Lucro = margem − imposto · Comissão = lucro × faixa
 *   Faixa em R$/mês: comissão = R$ da faixa × dias do período ÷ dias do mês.
 *
 * Expõe window.ModuloComissaoComponent.
 */
(function () {
  'use strict';

  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useCallback = React.useCallback, useMemo = React.useMemo;

  // ── Formatadores ────────────────────────────────────────────────
  function r2(n) { return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100; }
  function fR(n) { return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fRneg(n) { var v = Number(n || 0); return (v < 0 ? '-' : '') + fR(Math.abs(v)); }
  function fData(iso) { if (!iso) return '—'; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function fDiaMes(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1]; }
  function fDataHora(ts) { if (!ts) return ''; var d = new Date(ts); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var MESES3 = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  function fComp(c) { if (!c) return ''; var p = c.split('-'); return MESES[Number(p[1]) - 1] + ' ' + p[0]; }
  function fComp3(c) { if (!c) return ''; var p = c.split('-'); return MESES3[Number(p[1]) - 1] + '/' + p[0].slice(2); }
  function compHoje() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function compAdd(c, n) { var p = c.split('-'); var t = Number(p[0]) * 12 + (Number(p[1]) - 1) + n; return Math.floor(t / 12) + '-' + String((t % 12) + 1).padStart(2, '0'); }
  function hojeIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function parseMoeda(s) {
    if (s === null || s === undefined || s === '') return 0;
    if (typeof s === 'number') return s;
    var t = String(s).trim().replace(/[R$\s]/g, '');
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    var n = Number(t); return isFinite(n) ? n : 0;
  }
  function moedaInput(n) { return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function diasNoMes(iso) { var p = String(iso).split('-'); return new Date(Date.UTC(Number(p[0]), Number(p[1]), 0)).getUTCDate(); }
  function diasEntre(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000) + 1; }
  function fatorMes(ini, fim) { return diasEntre(ini, fim) / diasNoMes(ini); }

  // ── Regras de faixa (espelho de comissao.shared.js) ─────────────
  var REGRA_PADRAO = { faixas: [{ ate: 3, pct: 20 }, { ate: 6, pct: 10 }, { ate: 12, pct: 5 }], sem_fim: false };
  function modoDe(r) { return r && r.modo === 'valor' ? 'valor' : 'pct'; }
  function resumoRegra(r) {
    var g = r || REGRA_PADRAO, ant = 0, valor = modoDe(g) === 'valor';
    var partes = (g.faixas || []).map(function (f, i) {
      var de = ant + 1; ant = Number(f.ate);
      var ult = i === g.faixas.length - 1;
      var faixa = ult && g.sem_fim ? de + '+' : (de === Number(f.ate) ? String(de) : de + '–' + f.ate);
      return (valor ? fR(f.valor) + '/mês' : Number(f.pct) + '%') + ' (' + faixa + ')';
    });
    return partes.join(' · ') + (g.sem_fim ? '' : ' · encerra no ' + (ant + 1) + 'º mês');
  }

  // ── Cálculo local (espelho de comissao.shared.js) ───────────────
  function calcularPeriodo(p) {
    var bruto = r2(p.faturamento_bruto), garantido = r2(p.garantido), repasse = r2(p.repasse_entregador), saldoIn = r2(p.saldo_pendente_entrada);
    var real = r2(bruto - garantido), repasseEfetivo = r2(repasse + saldoIn), liquida = r2(real - repasseEfetivo);
    var faixa = Number(p.faixa_pct || 0), impPct = Number(p.imposto_pct || 0);
    var fixa = p.comissao_fixa === undefined || p.comissao_fixa === null ? null : r2(p.comissao_fixa);
    var imposto = 0, lucro = liquida, comissao = 0;
    if (liquida > 0) { imposto = r2(liquida * impPct / 100); lucro = r2(liquida - imposto); comissao = r2(lucro * faixa / 100); }
    if (fixa !== null) comissao = fixa > 0 ? fixa : 0;
    var porV = p.dividida ? r2(comissao / 2) : comissao;
    return { faturamento_bruto: bruto, garantido: garantido, faturamento_real: real, repasse_entregador: repasse, saldo_pendente_entrada: saldoIn, repasse_efetivo: repasseEfetivo, comissao_liquida: liquida, imposto: imposto, lucro: lucro, comissao_fixa: fixa, comissao: comissao, comissao_por_vendedor: porV, negativo: liquida < 0 };
  }
  function calcularLancamento(o) {
    var calc = o.periodos.map(function (p, i) { return Object.assign({}, p, calcularPeriodo({ faturamento_bruto: p.faturamento_bruto, garantido: p.garantido, repasse_entregador: p.repasse_entregador, saldo_pendente_entrada: i === 0 ? o.saldo_pendente_entrada : 0, faixa_pct: p.faixa_pct, comissao_fixa: p.comissao_fixa, imposto_pct: o.imposto_pct, dividida: o.dividida })); });
    var soma = function (k) { return r2(calc.reduce(function (a, c) { return a + Number(c[k] || 0); }, 0)); };
    var neg = r2(calc.filter(function (c) { return c.negativo; }).reduce(function (a, c) { return a + c.comissao_liquida; }, 0));
    return { periodos: calc, faturamento_bruto: soma('faturamento_bruto'), garantido: soma('garantido'), faturamento_real: soma('faturamento_real'), repasse_entregador: soma('repasse_entregador'), repasse_efetivo: soma('repasse_efetivo'), comissao_liquida: soma('comissao_liquida'), imposto: soma('imposto'), lucro: soma('lucro'), comissao: soma('comissao'), comissao_por_vendedor: soma('comissao_por_vendedor'), saldo_pendente_saida: o.manter_saldo_negativo && neg < 0 ? r2(-neg) : 0, tem_negativo: neg < 0 };
  }
  function somarTotais(lista) {
    var ks = ['faturamento_bruto', 'garantido', 'faturamento_real', 'repasse_entregador', 'repasse_efetivo', 'comissao_liquida', 'imposto', 'lucro', 'comissao', 'comissao_por_vendedor', 'saldo_pendente_saida'];
    var out = {}; ks.forEach(function (k) { out[k] = r2(lista.reduce(function (a, t) { return a + Number((t && t[k]) || 0); }, 0)); });
    out.tem_negativo = lista.some(function (t) { return t && t.tem_negativo; });
    return out;
  }
  function comissaoFixaDoPeriodo(p) {
    if (p.faixa_modo !== 'valor' || p.encerrada) return undefined;
    return r2(Number(p.faixa_valor || 0) * fatorMes(p.inicio, p.fim));
  }

  function Ico(nome, cls, style) { return h('svg', { className: cls || 'ico', style: style || { width: 14, height: 14 }, 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome })); }
  var CORES_FAIXA = { 20: { bg: '#f3e8fb', fg: '#5d0b85' }, 10: { bg: '#eff6ff', fg: '#1e40af' }, 5: { bg: '#fffbeb', fg: '#92400e' }, 2.5: { bg: '#fffbeb', fg: '#92400e' }, 0: { bg: '#f3f4f6', fg: '#374151' } };
  var COR_PERS = { bg: '#f3e8fb', fg: '#5d0b85' };
  function TagFaixa(p) {
    var valor = p.modo === 'valor';
    var txt = p.encerrada ? 'Encerrada' : (valor ? fR(p.valor) + '/mês' : (p.pct + '%')) + (p.dividida ? ' ÷2' : '');
    var c = p.encerrada ? CORES_FAIXA[0] : (valor ? COR_PERS : (CORES_FAIXA[p.pct] || COR_PERS));
    return h('span', { className: 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap', style: { background: c.bg, color: c.fg }, title: p.title || '' }, txt);
  }
  function tagsPeriodos(periodos, dividida) {
    if (!periodos || !periodos.length) return h('span', { className: 'text-gray-400 text-[11px]' }, '—');
    var tags = periodos.map(function (q, i) { return h(TagFaixa, { key: i, pct: q.faixa_pct, valor: q.faixa_valor, modo: q.faixa_modo, encerrada: q.encerrada, dividida: dividida, title: q.faixa_rotulo }); });
    if (tags.length === 1) return tags[0];
    var out = []; tags.forEach(function (t, i) { if (i) out.push(h('span', { key: 's' + i }, '→')); out.push(t); });
    return h('span', { className: 'inline-flex items-center gap-1' }, out);
  }
  /* FIN_ABAS_V1: célula da faixa única de KPIs (container .fin-kpis) — destaque = número roxo, sem gradiente */
  function Card(p) {
    return h('div', null,
      h('div', { className: 'fin-kpi-l' }, p.rotulo),
      h('div', { className: 'fin-kpi-v', style: { color: p.destaque ? '#5d0b85' : (p.cor || '#111827') } }, p.valor),
      p.auxiliar ? h('div', { className: 'fin-kpi-s' }, p.auxiliar) : null
    );
  }
  /* FIN_ABAS_V1: campos/botões no padrão clean (classes .fin-* injetadas pelo ModuloFinanceiro.js) */
  var caixa = 'w-full fin-inp';
  var rotulo = 'fin-lbl';
  var btnP = 'fin-btn fin-btn-p';
  var btnS = 'fin-btn fin-btn-s';
  var chipCls = function (sel) { return 'px-3 py-1.5 rounded-[10px] text-[12.5px] font-semibold border disabled:opacity-40 ' + (sel ? 'text-white bg-purple-700 hover:bg-purple-800 border-purple-700' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-200'); };
  var secao = 'text-[11px] font-extrabold uppercase tracking-wider text-gray-500';
  var ajuda = 'text-[11px] text-gray-500 mt-1';
  function Lateral(p) {
    return h('div', { className: 'fixed inset-0 z-50 flex justify-end' },
      h('div', { className: 'absolute inset-0 bg-black/30', onClick: p.fechar, 'aria-hidden': 'true' }),
      h('div', { className: 'relative bg-white w-full h-full overflow-y-auto flex flex-col border border-gray-200', style: { maxWidth: p.largura || 560 }, role: 'dialog', 'aria-label': p.titulo },
        h('div', { className: 'sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-start gap-3 z-10' },
          h('div', { className: 'flex-1 min-w-0' },
            h('div', { className: 'text-[12px] text-gray-500' }, p.sobretitulo || ''),
            h('h2', { className: 'text-base font-semibold text-gray-900 truncate' }, p.titulo)),
          h('button', { type: 'button', onClick: p.fechar, 'aria-label': 'Fechar', className: 'w-9 h-9 rounded-[10px] border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50' }, '×')),
        h('div', { className: 'flex-1 px-5 py-4 flex flex-col gap-4' }, p.children),
        p.rodape ? h('div', { className: 'sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex justify-end gap-2 flex-wrap' }, p.rodape) : null
      ));
  }
  function Erro(p) { return p.msg ? h('div', { className: 'bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12.5px] text-red-800' }, p.msg) : null; }

  // ═══════════════════ EDITOR DE REGRA DE FAIXAS ═══════════════════
  /**
   * valor: null (padrão / herda) ou { modo?, faixas: [{ate, pct|valor}], sem_fim }
   * herdar: texto do botão de herança ("Regra do cliente") — sem ele, o botão é "Padrão 20/10/5".
   */
  function EditorRegra(p) {
    var r = p.valor;
    var modoAtual = !r ? (p.herdar ? 'herda' : 'padrao') : (modoDe(r) === 'valor' ? 'valor' : 'pct');
    function setModo(m) {
      if (m === 'herda' || m === 'padrao') return p.onChange(null);
      if (m === modoAtual) return;
      var base = r && r.faixas ? r.faixas : REGRA_PADRAO.faixas;
      var faixas = base.map(function (f) { return m === 'valor' ? { ate: f.ate, valor: f.valor != null ? f.valor : 0 } : { ate: f.ate, pct: f.pct != null ? f.pct : 0 }; });
      p.onChange(m === 'valor' ? { modo: 'valor', faixas: faixas, sem_fim: !!(r && r.sem_fim) } : { faixas: faixas, sem_fim: !!(r && r.sem_fim) });
    }
    function setFaixa(i, k, v) { var fs = r.faixas.map(function (f) { return Object.assign({}, f); }); fs[i][k] = v; p.onChange(Object.assign({}, r, { faixas: fs })); }
    function addFaixa() { var ult = r.faixas[r.faixas.length - 1]; var nova = { ate: Number(ult ? ult.ate : 0) + 6 }; nova[modoAtual === 'valor' ? 'valor' : 'pct'] = 0; p.onChange(Object.assign({}, r, { faixas: r.faixas.concat([nova]) })); }
    function remFaixa(i) { if (r.faixas.length < 2) return; p.onChange(Object.assign({}, r, { faixas: r.faixas.filter(function (_, j) { return j !== i; }) })); }
    var opcoes = p.herdar ? [['herda', p.herdar], ['pct', '% própria'], ['valor', 'R$ por mês']] : [['padrao', 'Padrão 20 / 10 / 5'], ['pct', '% personalizada'], ['valor', 'R$ por mês']];
    var ant = 0;
    return h('div', { className: 'space-y-2' },
      h('div', { className: 'flex gap-2 flex-wrap' }, opcoes.map(function (o) { return h('button', { key: o[0], type: 'button', disabled: p.desabilitado, className: chipCls(modoAtual === o[0]), onClick: function () { setModo(o[0]); } }, o[1]); })),
      !r ? (p.resumoHerdado ? h('div', { className: 'text-[12px] text-gray-500' }, p.resumoHerdado) : null) :
      h('div', { className: 'border border-purple-100 rounded-xl p-3 bg-white space-y-2' },
        h('div', { className: 'grid gap-2 text-[10.5px] font-bold uppercase tracking-wider text-gray-500', style: { gridTemplateColumns: '64px 80px 110px 1fr' } }, h('span', null, 'Do mês'), h('span', null, 'Até o mês'), h('span', null, modoAtual === 'valor' ? 'R$ por mês' : '% do lucro'), h('span', null, '')),
        r.faixas.map(function (f, i) {
          var de = ant + 1; ant = Number(f.ate) || de;
          var ult = i === r.faixas.length - 1;
          return h('div', { key: i, className: 'grid gap-2 items-center', style: { gridTemplateColumns: '64px 80px 110px 1fr' } },
            h('div', { className: 'text-[13px] text-gray-700 tabular-nums px-2' }, de),
            h('input', { type: 'number', min: de, max: 240, className: caixa + ' tabular-nums', 'aria-label': 'Até o mês (faixa ' + (i + 1) + ')', disabled: p.desabilitado, value: f.ate, onChange: function (e) { setFaixa(i, 'ate', e.target.value === '' ? '' : Number(e.target.value)); } }),
            modoAtual === 'valor'
              ? h('input', { className: caixa + ' text-right tabular-nums', 'aria-label': 'R$ por mês (faixa ' + (i + 1) + ')', disabled: p.desabilitado, value: f._txt !== undefined ? f._txt : moedaInput(f.valor), onChange: function (e) { setFaixa(i, '_txt', e.target.value); }, onBlur: function (e) { var fs = r.faixas.map(function (x) { return Object.assign({}, x); }); fs[i].valor = parseMoeda(e.target.value); delete fs[i]._txt; p.onChange(Object.assign({}, r, { faixas: fs })); } })
              : h('input', { type: 'number', min: 0, max: 100, step: '0.5', className: caixa + ' text-right tabular-nums', 'aria-label': '% do lucro (faixa ' + (i + 1) + ')', disabled: p.desabilitado, value: f.pct, onChange: function (e) { setFaixa(i, 'pct', e.target.value === '' ? '' : Number(e.target.value)); } }),
            h('div', { className: 'flex items-center gap-2 text-[11.5px] text-gray-500' }, ult && r.sem_fim ? 'e depois' : '', r.faixas.length > 1 && !p.desabilitado ? h('button', { type: 'button', className: 'ml-auto text-red-800 font-semibold', onClick: function () { remFaixa(i); }, 'aria-label': 'Remover faixa ' + (i + 1) }, 'Remover') : null));
        }),
        !p.desabilitado ? h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
          h('button', { type: 'button', className: 'text-[12.5px] font-semibold text-purple-700', onClick: addFaixa }, '+ Adicionar faixa'),
          h('label', { className: 'flex items-center gap-2 text-[12.5px] text-gray-700' }, h('input', { type: 'checkbox', className: 'accent-purple-700', checked: !!r.sem_fim, onChange: function (e) { p.onChange(Object.assign({}, r, { sem_fim: e.target.checked })); } }), 'Última faixa sem prazo final')) : null,
        h('div', { className: 'text-[11.5px] text-gray-500' }, resumoRegra(limparRegra(r)), modoAtual === 'valor' ? ' · proporcional aos dias quando o mês é quebrado; paga mesmo com margem negativa' : ''))
    );
  }
  function limparRegra(r) {
    if (!r) return null;
    var v = modoDe(r) === 'valor';
    var o = { faixas: r.faixas.map(function (f) { var x = { ate: Number(f.ate) }; if (v) x.valor = f._txt !== undefined ? parseMoeda(f._txt) : Number(f.valor || 0); else x.pct = Number(f.pct || 0); return x; }), sem_fim: !!r.sem_fim };
    if (v) o.modo = 'valor';
    return o;
  }

  // ═══════════════════ PAINEL: NOVO / EDITAR CLIENTE ═══════════════════
  function PainelCliente(p) {
    var api = p.api, edit = p.cliente || null;
    var tipoIni = edit ? (edit.tipo || 'bi') : 'bi';
    function estadoInicial() {
      var f = {
        tipo: tipoIni, cod_cliente: edit ? edit.cod_cliente : '', nome_cliente: edit ? edit.nome_cliente : '',
        nome_exibicao: edit ? (edit.nome_exibicao || edit.nome_cliente || '') : '',
        incluir: edit ? (edit.incluir || 'ambos') : 'ambos', regra_faixas: edit ? (edit.regra_faixas || null) : null,
        modo_cc: 'todos', todos: { data_inicio: '', regra_faixas: null }, centros: {}, motoboys: [],
        vendedor_1_id: edit ? edit.vendedor_1_id : '', vendedor_2_id: edit ? (edit.vendedor_2_id || '') : '',
        comissao_dividida: edit ? !!edit.comissao_dividida : false, ativo: edit ? edit.ativo !== false : true,
      };
      var us = (edit && edit.unidades) || [];
      if (tipoIni === 'fixo') {
        f.motoboys = us.map(function (u) { return { id: u.id, nome_motoboy: u.nome_motoboy || '', data_inicio: u.data_inicio || '', data_fim: u.data_fim || '', valor_contrato: moedaInput(u.valor_contrato), valor_motoboy: moedaInput(u.valor_motoboy), regra_faixas: u.regra_faixas || null }; });
        if (!f.motoboys.length) f.motoboys = [{ nome_motoboy: '', data_inicio: '', data_fim: '', valor_contrato: '', valor_motoboy: '', regra_faixas: null }];
      } else if (us.length === 1 && !us[0].centros.length) {
        f.modo_cc = 'todos'; f.todos = { data_inicio: us[0].data_inicio, regra_faixas: us[0].regra_faixas || null };
      } else if (us.length) {
        f.modo_cc = 'especificos';
        us.forEach(function (u) { u.centros.forEach(function (c) { f.centros[c] = { data_inicio: u.data_inicio, regra_faixas: u.regra_faixas || null }; }); });
      }
      return f;
    }
    var _f = useState(estadoInicial), form = _f[0], setForm = _f[1];
    var _b = useState(''), busca = _b[0], setBusca = _b[1];
    var _op = useState([]), opcoes = _op[0], setOpcoes = _op[1];
    var _cc = useState(null), ccInfo = _cc[0], setCcInfo = _cc[1];
    var _sv = useState(false), salvando = _sv[0], setSalvando = _sv[1];
    var _er = useState(null), erro = _er[0], setErro = _er[1];
    var vendedores = p.vendedores || [];
    var fixo = form.tipo === 'fixo';
    var set = function (k, v) { setForm(function (f) { var n = Object.assign({}, f); n[k] = v; return n; }); };

    useEffect(function () {
      if (fixo || !form.cod_cliente) { setCcInfo(null); return; }
      api('/comissao/clientes-central/' + form.cod_cliente + '/centros' + (edit ? '?ignorar_id=' + edit.id : '')).then(function (j) {
        setCcInfo(j);
        setForm(function (f) { return f.nome_exibicao ? f : Object.assign({}, f, { nome_exibicao: j.mascara || f.nome_cliente || '' }); });
      }).catch(function () { setCcInfo({ centros: [], mascara: '' }); });
    }, [form.cod_cliente, fixo, api, edit]);

    useEffect(function () {
      if (edit || fixo) return;
      var t = setTimeout(function () {
        api('/comissao/clientes-central?busca=' + encodeURIComponent(busca)).then(function (j) { setOpcoes(j.clientes || []); }).catch(function () {});
      }, 250);
      return function () { clearTimeout(t); };
    }, [busca, api, edit, fixo]);

    function alternarCc(nome, sugestao) {
      setForm(function (f) {
        var c = Object.assign({}, f.centros);
        if (c[nome]) delete c[nome]; else c[nome] = { data_inicio: f.todos.data_inicio || sugestao || '', regra_faixas: null };
        return Object.assign({}, f, { centros: c });
      });
    }
    function setCc(nome, k, v) { setForm(function (f) { var c = Object.assign({}, f.centros); c[nome] = Object.assign({}, c[nome]); c[nome][k] = v; return Object.assign({}, f, { centros: c }); }); }
    function setMb(i, k, v) { setForm(function (f) { var m = f.motoboys.slice(); m[i] = Object.assign({}, m[i]); m[i][k] = v; return Object.assign({}, f, { motoboys: m }); }); }
    function addMb() { setForm(function (f) { return Object.assign({}, f, { motoboys: f.motoboys.concat([{ nome_motoboy: '', data_inicio: '', data_fim: '', valor_contrato: '', valor_motoboy: '', regra_faixas: null }]) }); }); }
    function remMb(i) {
      var m = form.motoboys[i];
      if (m.id && !window.confirm('Tirar ' + (m.nome_motoboy || 'este motoboy') + ' do contrato?\n\nOs lançamentos dele em competências ABERTAS são apagados. Se ele só saiu, prefira informar a data de saída.')) return;
      setForm(function (f) { return Object.assign({}, f, { motoboys: f.motoboys.filter(function (_, j) { return j !== i; }) }); });
    }

    function montarCorpo() {
      var base = { nome_exibicao: form.nome_exibicao, regra_faixas: limparRegra(form.regra_faixas), vendedor_1_id: Number(form.vendedor_1_id), vendedor_2_id: form.comissao_dividida ? Number(form.vendedor_2_id) : null, comissao_dividida: !!form.comissao_dividida, ativo: !!form.ativo };
      if (fixo) {
        return Object.assign(base, { tipo: 'fixo', nome_cliente: form.nome_exibicao, unidades: form.motoboys.map(function (m) { return { id: m.id || null, nome_motoboy: m.nome_motoboy, data_inicio: m.data_inicio, data_fim: m.data_fim || null, valor_contrato: parseMoeda(m.valor_contrato), valor_motoboy: parseMoeda(m.valor_motoboy), regra_faixas: limparRegra(m.regra_faixas) }; }) });
      }
      var unidades = form.modo_cc === 'todos'
        ? [{ centros: [], data_inicio: form.todos.data_inicio, regra_faixas: limparRegra(form.todos.regra_faixas) }]
        : Object.keys(form.centros).sort().map(function (c) { return { centros: [c], data_inicio: form.centros[c].data_inicio, regra_faixas: limparRegra(form.centros[c].regra_faixas) }; });
      return Object.assign(base, { cod_cliente: Number(form.cod_cliente), nome_cliente: form.nome_cliente, incluir: form.incluir, unidades: unidades });
    }
    function salvar() {
      setErro(null);
      if (fixo) {
        if ((form.nome_exibicao || '').trim().length < 2) return setErro('Informe o nome do cliente do contrato');
        if (!form.motoboys.length) return setErro('Cadastre pelo menos um motoboy');
        for (var i = 0; i < form.motoboys.length; i++) {
          var m = form.motoboys[i];
          if ((m.nome_motoboy || '').trim().length < 2) return setErro('Informe o nome do motoboy ' + (i + 1));
          if (!m.data_inicio) return setErro('Informe a data de início de ' + m.nome_motoboy);
          if (m.data_fim && m.data_fim < m.data_inicio) return setErro('A saída de ' + m.nome_motoboy + ' está antes do início');
        }
      } else {
        if (!form.cod_cliente) return setErro('Selecione o cliente');
        if (form.modo_cc === 'todos' && !form.todos.data_inicio) return setErro('Informe a data de início');
        if (form.modo_cc === 'especificos') {
          var ks = Object.keys(form.centros);
          if (!ks.length) return setErro('Marque pelo menos um centro de custo (ou "Todos os centros")');
          for (var k = 0; k < ks.length; k++) if (!form.centros[ks[k]].data_inicio) return setErro('Informe a data de início de ' + ks[k]);
        }
      }
      if (!form.vendedor_1_id) return setErro('Selecione o vendedor responsável');
      if (form.comissao_dividida && !form.vendedor_2_id) return setErro('Selecione o segundo vendedor');
      if (form.comissao_dividida && String(form.vendedor_2_id) === String(form.vendedor_1_id)) return setErro('O segundo vendedor não pode ser o mesmo do primeiro');
      setSalvando(true);
      api(edit ? '/comissao/clientes/' + edit.id : '/comissao/clientes', { method: edit ? 'PUT' : 'POST', body: JSON.stringify(montarCorpo()) })
        .then(function (j) { p.aoSalvar(j && j.lancamentos_reabertos ? 'Cadastro salvo · ' + j.lancamentos_reabertos + ' lançamento(s) voltaram a aguardar lançamento' : 'Cadastro salvo'); })
        .catch(function (e) { setErro(e.message); }).finally(function () { setSalvando(false); });
    }
    function excluir() {
      if (!window.confirm('Excluir o cadastro de "' + (form.nome_exibicao || form.nome_cliente) + '"?\n\nOs lançamentos deste cliente em competências ABERTAS também serão apagados. Esta ação não pode ser desfeita.')) return;
      setSalvando(true); setErro(null);
      api('/comissao/clientes/' + edit.id, { method: 'DELETE' }).then(function () { p.aoExcluir(); }).catch(function (e) { setErro(e.message); }).finally(function () { setSalvando(false); });
    }
    var botoesVend = function (campo, excluirId) {
      return h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' }, vendedores.filter(function (v) { return v.ativo && String(v.id) !== String(excluirId); }).map(function (v) {
        var sel = String(form[campo]) === String(v.id);
        return h('button', { key: v.id, type: 'button', onClick: function () { set(campo, v.id); }, className: 'px-3 py-2 rounded-[10px] text-[13px] font-semibold border ' + (sel ? 'text-white bg-purple-700 hover:bg-purple-800 border-purple-700' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-200') }, v.nome);
      }));
    };
    var resumoCliente = (form.regra_faixas ? 'Regra do ' + (fixo ? 'contrato' : 'cliente') + ': ' + resumoRegra(limparRegra(form.regra_faixas)) : 'Regra do ' + (fixo ? 'contrato' : 'cliente') + ': padrão — ' + resumoRegra(REGRA_PADRAO));

    // ── blocos do formulário ──
    var blocoTipo = !edit ? h('div', { className: 'space-y-2' },
      h('div', { className: secao }, 'Tipo de cliente'),
      h('div', { className: 'flex gap-2 flex-wrap' },
        h('button', { type: 'button', className: chipCls(!fixo), onClick: function () { setForm(function (f) { return Object.assign({}, f, { tipo: 'bi', nome_exibicao: '' }); }); } }, 'Cliente do BI'),
        h('button', { type: 'button', className: chipCls(fixo), onClick: function () { setForm(function (f) { return Object.assign({}, f, { tipo: 'fixo', cod_cliente: '', nome_cliente: '', nome_exibicao: '', motoboys: f.motoboys.length ? f.motoboys : [{ nome_motoboy: '', data_inicio: '', data_fim: '', valor_contrato: '', valor_motoboy: '', regra_faixas: null }] }); }); } }, 'Contrato fixo (fora da Central)')),
      h('p', { className: ajuda }, fixo ? 'Para contratos que não passam pela Mapp/Central: os valores do mês vêm do que você cadastrar aqui.' : 'Entregas, faturamento, repasse e garantido vêm do BI.')) : null;

    var blocoClienteBi = h('div', null, h('label', { className: rotulo }, 'Cliente'),
      edit ? h('div', { className: 'px-3 py-2 border border-gray-100 bg-gray-50 rounded-lg text-sm' }, form.nome_cliente, h('span', { className: 'text-gray-500 text-xs ml-2' }, 'ID ' + form.cod_cliente))
      : form.cod_cliente ? h('div', { className: 'flex items-center gap-2 px-3 py-2 border border-purple-200 bg-purple-50 rounded-lg text-sm' },
          h('span', { className: 'font-semibold flex-1' }, form.nome_cliente), h('span', { className: 'text-gray-500 text-xs' }, 'ID ' + form.cod_cliente),
          h('button', { type: 'button', className: 'text-xs text-purple-700 font-semibold', onClick: function () { set('cod_cliente', ''); set('nome_cliente', ''); } }, 'trocar'))
      : h('div', null,
          h('input', { className: caixa, placeholder: 'Buscar por nome ou ID no cadastro da Central', 'aria-label': 'Buscar cliente', value: busca, onChange: function (e) { setBusca(e.target.value); } }),
          h('div', { className: 'mt-1 max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100' }, opcoes.slice(0, 60).map(function (c) {
            return h('button', { key: c.cod_cliente, type: 'button', disabled: c.ja_em_comissao, onClick: function () { setForm(function (f) { return Object.assign({}, f, { cod_cliente: c.cod_cliente, nome_cliente: c.nome, nome_exibicao: '', centros: {}, modo_cc: 'todos' }); }); },
              className: 'w-full text-left px-3 py-2 text-[13px] hover:bg-purple-50 disabled:opacity-40 flex items-center gap-2' },
              h('span', { className: 'flex-1 truncate' }, c.nome), h('span', { className: 'text-gray-500 text-xs' }, 'ID ' + c.cod_cliente),
              c.ja_em_comissao ? h('span', { className: 'text-[10px] text-amber-800 font-bold' }, 'JÁ EM COMISSÃO (TODOS OS CC)') : (c.tem_cadastro ? h('span', { className: 'text-[10px] text-purple-700 font-bold', title: c.centros_em_comissao.join(', ') }, c.centros_em_comissao.length + ' CC EM COMISSÃO') : null));
          }), opcoes.length === 0 ? h('div', { className: 'px-3 py-3 text-xs text-gray-500' }, 'Nenhum cliente encontrado') : null)));

    var blocoNome = h('div', null, h('label', { className: rotulo, htmlFor: 'com-nome' }, fixo ? 'Nome do cliente do contrato' : 'Nome de exibição'),
      h('input', { id: 'com-nome', className: caixa, value: form.nome_exibicao, placeholder: fixo ? 'Ex.: Auto Peças Exemplo — contrato fixo' : form.nome_cliente, onChange: function (e) { set('nome_exibicao', e.target.value); } }),
      !fixo ? h('p', { className: ajuda }, 'Padrão: máscara do BI (' + ((ccInfo && ccInfo.mascara) || form.nome_cliente || '—') + ').') : null);

    var blocoIncluir = !fixo ? h('div', { className: 'space-y-2' },
      h('div', { className: secao }, 'O que entra na comissão'),
      h('div', { className: 'flex gap-2 flex-wrap' }, [['tutts', 'Só Tutts'], ['hub', 'Só Hub'], ['ambos', 'Tutts + Hub']].map(function (o) { return h('button', { key: o[0], type: 'button', className: chipCls(form.incluir === o[0]), onClick: function () { set('incluir', o[0]); } }, o[1]); })),
      h('p', { className: ajuda }, 'Tutts = moto própria. Hub = OS do BI com profissional "App Externo". O garantido só desconta quando entra Tutts.')) : null;

    var blocoRegraCli = h('div', { className: 'space-y-2' },
      h('div', { className: secao }, 'Regra de comissão do ' + (fixo ? 'contrato' : 'cliente')),
      h(EditorRegra, { valor: form.regra_faixas, onChange: function (v) { set('regra_faixas', v); }, resumoHerdado: resumoRegra(REGRA_PADRAO) }),
      h('p', { className: ajuda }, 'Vale para ' + (fixo ? 'os motoboys' : 'os centros') + ' marcados com "Regra do ' + (fixo ? 'contrato' : 'cliente') + '".'));

    var herdarTxt = 'Regra do ' + (fixo ? 'contrato' : 'cliente');
    var blocoCentros = !fixo && form.cod_cliente ? h('div', { className: 'space-y-2' },
      h('div', { className: secao }, 'Centros de custo'),
      h('div', { className: 'flex gap-2 flex-wrap' }, [['todos', 'Todos os centros'], ['especificos', 'Centros específicos']].map(function (o) {
        var bloq = o[0] === 'todos' && ccInfo && ccInfo.todos_ocupado_por;
        return h('button', { key: o[0], type: 'button', disabled: !!bloq, title: bloq ? 'Já existe cadastro com todos os centros: ' + bloq : '', onClick: function () { set('modo_cc', o[0]); }, className: chipCls(form.modo_cc === o[0]) }, o[1]);
      })),
      form.modo_cc === 'todos' ? h('div', { className: 'border border-gray-200 rounded-xl p-3 space-y-3' },
        h('div', null, h('label', { className: rotulo, htmlFor: 'com-ini-todos' }, 'Data de início'),
          h('input', { id: 'com-ini-todos', type: 'date', className: caixa, value: form.todos.data_inicio, onChange: function (e) { set('todos', Object.assign({}, form.todos, { data_inicio: e.target.value })); } }),
          h('p', { className: ajuda }, 'As faixas contam a partir desta data exata. O que foi faturado antes não gera comissão.')),
        h('div', null, h('label', { className: rotulo }, 'Regra de %'), h(EditorRegra, { valor: form.todos.regra_faixas, herdar: herdarTxt, resumoHerdado: resumoCliente, onChange: function (v) { set('todos', Object.assign({}, form.todos, { regra_faixas: v })); } })))
      : !ccInfo ? h('div', { className: 'text-xs text-gray-500' }, 'Carregando centros...')
      : ccInfo.centros.length === 0 ? h('div', { className: 'text-xs text-amber-800' }, 'O BI não tem centro de custo para esta loja.')
      : h('div', { className: 'border border-gray-200 rounded-xl divide-y divide-gray-100' }, ccInfo.centros.map(function (c) {
          var cfg = form.centros[c.centro_custo]; var ocup = c.ocupado_por;
          return h('div', { key: c.centro_custo, className: 'p-3 space-y-2 ' + (cfg ? 'bg-purple-50/40' : '') },
            h('label', { className: 'flex items-center gap-2 text-[13px] ' + (ocup ? 'opacity-50' : 'cursor-pointer') },
              h('input', { type: 'checkbox', className: 'accent-purple-700', checked: !!cfg, disabled: !!ocup, onChange: function () { alternarCc(c.centro_custo, c.primeira_entrega); } }),
              h('span', { className: 'flex-1 truncate font-semibold' }, c.centro_custo),
              h('span', { className: 'text-[11px] text-gray-500 whitespace-nowrap' }, c.entregas_30d + ' entregas/30d'),
              ocup ? h('span', { className: 'text-[10px] text-amber-800 font-bold whitespace-nowrap', title: 'Em comissão no cadastro ' + ocup }, 'EM OUTRO CADASTRO') : null),
            cfg ? h('div', { className: 'pl-6 space-y-2' },
              h('div', null, h('label', { className: rotulo }, 'Data de início'), h('input', { type: 'date', className: caixa, 'aria-label': 'Data de início de ' + c.centro_custo, value: cfg.data_inicio, onChange: function (e) { setCc(c.centro_custo, 'data_inicio', e.target.value); } })),
              h('div', null, h('label', { className: rotulo }, 'Regra de %'), h(EditorRegra, { valor: cfg.regra_faixas, herdar: herdarTxt, resumoHerdado: resumoCliente, onChange: function (v) { setCc(c.centro_custo, 'regra_faixas', v); } }))) : null);
        })),
      form.modo_cc === 'especificos' ? h('p', { className: ajuda }, 'Cada centro conta os próprios meses a partir da sua data de início. O garantido da loja é rateado entre os centros pelas entregas Tutts de cada dia.') : null) : null;

    var blocoMotoboys = fixo ? h('div', { className: 'space-y-2' },
      h('div', { className: secao }, 'Motoboys do contrato'),
      form.motoboys.map(function (m, i) {
        return h('div', { key: m.id || ('n' + i), className: 'border border-gray-200 rounded-xl p-3 space-y-3' },
          h('div', { className: 'flex items-center gap-2' },
            h('div', { className: 'flex-1' }, h('label', { className: rotulo }, 'Motoboy'), h('input', { className: caixa, 'aria-label': 'Nome do motoboy ' + (i + 1), value: m.nome_motoboy, placeholder: 'Nome', onChange: function (e) { setMb(i, 'nome_motoboy', e.target.value); } })),
            form.motoboys.length > 1 ? h('button', { type: 'button', className: 'mt-5 text-[12px] font-semibold text-red-800 px-2 py-2', onClick: function () { remMb(i); } }, 'Remover') : null),
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', null, h('label', { className: rotulo }, 'Início'), h('input', { type: 'date', className: caixa, 'aria-label': 'Início de ' + (m.nome_motoboy || 'motoboy'), value: m.data_inicio, onChange: function (e) { setMb(i, 'data_inicio', e.target.value); } })),
            h('div', null, h('label', { className: rotulo }, 'Saída (opcional)'), h('input', { type: 'date', className: caixa, 'aria-label': 'Saída de ' + (m.nome_motoboy || 'motoboy'), value: m.data_fim || '', onChange: function (e) { setMb(i, 'data_fim', e.target.value); } })),
            h('div', null, h('label', { className: rotulo }, 'Valor do contrato (R$/mês)'), h('input', { className: caixa + ' text-right tabular-nums', 'aria-label': 'Valor do contrato de ' + (m.nome_motoboy || 'motoboy'), value: m.valor_contrato, placeholder: '0,00', onChange: function (e) { setMb(i, 'valor_contrato', e.target.value); }, onBlur: function (e) { setMb(i, 'valor_contrato', moedaInput(parseMoeda(e.target.value))); } })),
            h('div', null, h('label', { className: rotulo }, 'Pago ao motoboy (R$/mês)'), h('input', { className: caixa + ' text-right tabular-nums', 'aria-label': 'Valor pago a ' + (m.nome_motoboy || 'motoboy'), value: m.valor_motoboy, placeholder: '0,00', onChange: function (e) { setMb(i, 'valor_motoboy', e.target.value); }, onBlur: function (e) { setMb(i, 'valor_motoboy', moedaInput(parseMoeda(e.target.value))); } }))),
          h('div', null, h('label', { className: rotulo }, 'Regra de comissão'), h(EditorRegra, { valor: m.regra_faixas, herdar: herdarTxt, resumoHerdado: resumoCliente, onChange: function (v) { setMb(i, 'regra_faixas', v); } })));
      }),
      h('button', { type: 'button', className: btnS, onClick: addMb }, '+ Adicionar motoboy'),
      h('p', { className: ajuda }, 'Cada motoboy conta as faixas a partir do próprio início. Mês quebrado (entrada ou saída no meio do mês) é proporcional aos dias.')) : null;

    return h(Lateral, { titulo: edit ? 'Editar ' + (fixo ? 'contrato fixo' : 'cliente em comissão') : 'Novo cliente em comissão', sobretitulo: 'Cadastro', fechar: p.fechar, largura: 640,
      rodape: [edit ? h('button', { key: 'x', className: 'mr-auto px-4 py-2 rounded-[10px] text-sm font-semibold text-red-800 border border-red-200 hover:bg-red-50 disabled:opacity-50', disabled: salvando, onClick: excluir }, 'Excluir cadastro') : null, h('button', { key: 'c', className: btnS, onClick: p.fechar }, 'Cancelar'), h('button', { key: 's', className: btnP, disabled: salvando, onClick: salvar }, salvando ? 'Salvando...' : 'Salvar cadastro')] },
      h(Erro, { msg: erro }),
      blocoTipo,
      fixo ? blocoNome : blocoClienteBi,
      !fixo && form.cod_cliente ? blocoNome : null,
      blocoIncluir,
      fixo || form.cod_cliente ? blocoRegraCli : null,
      blocoCentros,
      blocoMotoboys,
      h('div', null, h('label', { className: rotulo }, 'Vendedor responsável'), vendedores.length ? botoesVend('vendedor_1_id', null) : h('p', { className: 'text-xs text-amber-800' }, 'Cadastre vendedores primeiro (botão "Vendedores").')),
      h('label', { className: 'flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer' },
        h('input', { type: 'checkbox', className: 'mt-1 accent-purple-700', checked: form.comissao_dividida, onChange: function (e) { set('comissao_dividida', e.target.checked); if (!e.target.checked) set('vendedor_2_id', ''); } }),
        h('div', null, h('div', { className: 'text-sm font-semibold text-gray-900' }, 'Dividir comissão'), h('div', { className: 'text-[11.5px] text-gray-500' }, 'Cada vendedor recebe metade. O total do cliente não muda.'))),
      form.comissao_dividida ? h('div', null, h('label', { className: rotulo }, 'Segundo vendedor'), botoesVend('vendedor_2_id', form.vendedor_1_id)) : null,
      edit ? h('label', { className: 'flex items-center gap-2 text-sm' }, h('input', { type: 'checkbox', className: 'accent-purple-700', checked: form.ativo, onChange: function (e) { set('ativo', e.target.checked); } }), 'Cadastro ativo') : null
    );
  }

  // ═══════════════════ MEMÓRIA DE CÁLCULO ═══════════════════
  function MemoriaCalculo(p) {
    var per = p.periodo, bi = p.bi, c = p.calc, fixo = p.fixo, l = per.lancamento;
    var linha = function (rot, val, cls) { return h('div', { className: 'flex items-start justify-between gap-3 text-[12px] py-0.5' }, h('span', { className: 'text-gray-500' }, rot), h('span', { className: 'tabular-nums font-semibold text-right ' + (cls || 'text-gray-900') }, val)); };
    var org = function (k) { var o = l && l.origem ? l.origem[k] : null; return o === 'manual' ? ' (ajustado à mão)' : o === 'fora' ? ' (fora da comissão)' : ''; };
    return h('div', { className: 'rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3 text-[12px]' },
      h('div', { className: 'text-[11px] font-extrabold uppercase tracking-wider text-gray-600' }, 'Memória de cálculo · ' + fDiaMes(per.inicio) + ' a ' + fDiaMes(per.fim)),
      l && l.gravado_em ? h('div', { className: 'text-[11px] text-gray-500' }, 'Valores de referência gravados em ' + fDataHora(l.gravado_em) + (l.lancado_por ? ' · lançado por ' + l.lancado_por : '') + '.') : null,
      fixo ? h('div', null,
        h('div', { className: 'font-bold text-gray-700 mb-1' }, 'De onde vieram os valores (cadastro do contrato)'),
        linha('Contrato do motoboy', fR(bi.valor_contrato_mes) + '/mês'),
        linha('Pago ao motoboy', fR(bi.valor_motoboy_mes) + '/mês'),
        linha('Dias no período', bi.dias + ' de ' + bi.dias_mes + ' (' + (bi.fator * 100).toFixed(2).replace('.', ',') + '% do mês)'),
        linha('Contrato no período', fR(bi.valor_contrato_mes) + ' × ' + bi.dias + '/' + bi.dias_mes + ' = ' + fR(bi.bruto)),
        linha('Motoboy no período', fR(bi.valor_motoboy_mes) + ' × ' + bi.dias + '/' + bi.dias_mes + ' = ' + fR(bi.repasse)))
      : h('div', null,
        h('div', { className: 'font-bold text-gray-700 mb-1' }, 'De onde vieram os valores (BI)'),
        h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[12px]' },
          h('thead', null, h('tr', { className: 'text-gray-500 text-left' }, h('th', { className: 'py-1 pr-2 font-semibold' }, ''), h('th', { className: 'py-1 px-2 font-semibold text-right' }, 'OS'), h('th', { className: 'py-1 px-2 font-semibold text-right' }, 'Entregas'), h('th', { className: 'py-1 px-2 font-semibold text-right' }, 'Bruto'), h('th', { className: 'py-1 pl-2 font-semibold text-right' }, 'Repasse'))),
          h('tbody', null, [['Tutts (moto própria)', bi.tutts, bi.incluir !== 'hub'], ['Hub (App Externo)', bi.hub, bi.incluir !== 'tutts']].map(function (x) {
            return h('tr', { key: x[0], className: 'border-t border-gray-200 ' + (x[2] ? '' : 'text-gray-400 line-through') }, h('td', { className: 'py-1 pr-2' }, x[0]), h('td', { className: 'py-1 px-2 text-right tabular-nums' }, x[1].os), h('td', { className: 'py-1 px-2 text-right tabular-nums' }, x[1].entregas), h('td', { className: 'py-1 px-2 text-right tabular-nums' }, fR(x[1].bruto)), h('td', { className: 'py-1 pl-2 text-right tabular-nums' }, fR(x[1].repasse)));
          })))),
        h('div', { className: 'text-[11px] text-gray-500 mt-1' }, 'Bruto e repasse contam uma vez por OS; entregas = pontos de entrega (a coleta não conta).' + (bi.centros && bi.centros.length ? ' Centros: ' + bi.centros.join(', ') + '.' : ' Todos os centros da loja.'))),
      !fixo && bi.incluir !== 'hub' ? h('div', null,
        h('div', { className: 'font-bold text-gray-700 mb-1' }, 'Garantido (planilha do garantido)'),
        !bi.garantido_dias ? linha('Garantido rateado', fR(bi.garantido)) :
        bi.garantido_dias.length === 0 ? h('div', { className: 'text-gray-500' }, 'Sem complemento de garantido neste período.') :
        h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[12px]' },
          h('thead', null, h('tr', { className: 'text-gray-500 text-left' }, ['Dia', 'Motoboy(s) · complemento', 'Loja', 'Rateio', 'Entra'].map(function (t, i) { return h('th', { key: t, className: 'py-1 px-1 font-semibold ' + (i >= 2 ? 'text-right' : '') }, t); }))),
          h('tbody', null, bi.garantido_dias.map(function (d) {
            var rat = d.base === 'integral' ? 'loja inteira' : (d.entregas_unidade + '/' + d.entregas_loja + ' = ' + String(d.pct).replace('.', ',') + '%' + (d.base === 'periodo' ? ' (dia sem entrega: proporção do período)' : ''));
            return h('tr', { key: d.data, className: 'border-t border-gray-200 align-top' }, h('td', { className: 'py-1 px-1 whitespace-nowrap' }, fDiaMes(d.data)),
              h('td', { className: 'py-1 px-1' }, d.profissionais.map(function (x) { return x.nome + ' ' + fR(x.complemento); }).join(' · ')),
              h('td', { className: 'py-1 px-1 text-right tabular-nums whitespace-nowrap' }, fR(d.garantido_loja)), h('td', { className: 'py-1 px-1 text-right text-gray-600' }, rat), h('td', { className: 'py-1 px-1 text-right tabular-nums font-semibold whitespace-nowrap' }, fR(d.valor)));
          })))),
        bi.garantido_dias && bi.garantido_dias.length ? linha('Garantido da loja / que entra aqui', fR(bi.garantido_loja) + ' / ' + fR(bi.garantido)) : null) : null,
      c ? h('div', null,
        h('div', { className: 'font-bold text-gray-700 mb-1' }, 'Conta do período'),
        linha('Faturamento bruto' + org('bruto_tutts') + org('bruto_hub'), fR(c.faturamento_bruto)),
        !fixo ? linha('(−) Garantido' + org('garantido'), '− ' + fR(c.garantido), 'text-amber-800') : null,
        linha('= Faturamento real', fR(c.faturamento_real)),
        linha('(−) ' + (fixo ? 'Pago ao motoboy' : 'Repasse ao entregador') + org('repasse_tutts') + (c.saldo_pendente_entrada > 0 ? ' + saldo pendente ' + fR(c.saldo_pendente_entrada) : ''), '− ' + fR(c.repasse_efetivo)),
        linha('= Margem', fRneg(c.comissao_liquida), c.comissao_liquida < 0 ? 'text-red-800' : null),
        linha('(−) Imposto (' + p.impostoPct + '% da margem' + (c.comissao_liquida <= 0 ? ', zero com margem negativa' : '') + ')', '− ' + fR(c.imposto)),
        linha('= Lucro', fRneg(c.lucro), c.lucro < 0 ? 'text-red-800' : null),
        per.faixa_modo === 'valor'
          ? linha('Comissão: ' + fR(per.faixa_valor) + '/mês × ' + diasEntre(per.inicio, per.fim) + '/' + diasNoMes(per.inicio) + ' dias' + (per.encerrada ? ' (faixa encerrada)' : ''), fR(c.comissao), 'text-purple-800')
          : linha('Comissão: lucro × ' + per.faixa_pct + '% (' + per.faixa_rotulo + ')' + (c.comissao_liquida <= 0 ? ' — margem negativa, sem comissão' : ''), fR(c.comissao), 'text-purple-800'),
        p.dividida ? linha('Para cada vendedor', fR(c.comissao_por_vendedor)) : null) : null
    );
  }

  // ═══════════════════ PAINEL: LANÇAMENTO ═══════════════════
  var CAMPOS = ['bruto_tutts', 'repasse_tutts', 'bruto_hub', 'repasse_hub', 'garantido'];
  function valoresDoBi(bi) { return { bruto_tutts: bi.tutts.bruto, repasse_tutts: bi.tutts.repasse, bruto_hub: bi.hub.bruto, repasse_hub: bi.hub.repasse, garantido: bi.garantido }; }
  function PainelLancamento(p) {
    var api = p.api;
    var _d = useState(null), dados = _d[0], setDados = _d[1];
    var _v = useState({}), vals = _v[0], setVals = _v[1]; // { 'uid|inicio': { campo: texto } }
    var _m = useState(false), manter = _m[0], setManter = _m[1];
    var _mem = useState({}), memAberta = _mem[0], setMemAberta = _mem[1];
    var _sv = useState(false), salvando = _sv[0], setSalvando = _sv[1];
    var _sy = useState(false), sincronizando = _sy[0], setSincronizando = _sy[1];
    var _er = useState(null), erro = _er[0], setErro = _er[1];

    function carregar() {
      return api('/comissao/lancamento?cliente_id=' + p.clienteId + '&competencia=' + p.competencia).then(function (j) {
        setDados(j);
        var v = {};
        j.unidades.forEach(function (e) {
          e.periodos.forEach(function (per) {
            var l = per.lancamento, ref = valoresDoBi(per.bi), o = {};
            CAMPOS.forEach(function (k) {
              var valor = l ? (l.legado ? (k === 'bruto_tutts' ? l.faturamento_bruto : k === 'repasse_tutts' ? l.repasse_entregador : k === 'garantido' ? l.garantido : 0) : l[k]) : ref[k];
              o[k] = moedaInput(valor);
            });
            v[e.unidade.id + '|' + per.inicio] = o;
          });
        });
        setVals(v);
        setManter(!!j.manter_saldo_negativo);
      }).catch(function (e) { setErro(e.message); });
    }
    useEffect(function () { carregar(); }, [p.clienteId, p.competencia, api]);

    var soLeitura = dados && dados.status && dados.status.status !== 'aberto';
    var fixo = dados && dados.cliente.tipo === 'fixo';
    var inc = dados ? dados.cliente.incluir : 'ambos';
    var temTutts = inc !== 'hub', temHub = inc !== 'tutts' && !fixo;
    var unidadesVis = dados ? dados.unidades.filter(function (e) { return !e.antes_do_inicio; }) : [];

    function numeros(uid, per) {
      var t = vals[uid + '|' + per.inicio] || {};
      var n = {}; CAMPOS.forEach(function (k) { n[k] = parseMoeda(t[k]); });
      if (!temTutts) { n.bruto_tutts = 0; n.repasse_tutts = 0; n.garantido = 0; }
      if (!temHub) { n.bruto_hub = 0; n.repasse_hub = 0; }
      if (fixo) n.garantido = 0;
      return n;
    }
    var calcs = useMemo(function () {
      if (!dados) return null;
      var porUnid = {};
      unidadesVis.forEach(function (e) {
        if (!e.periodos.length) return;
        var periodos = e.periodos.map(function (per) {
          var n = numeros(e.unidade.id, per);
          var fixa = per.lancamento && per.lancamento.comissao_fixa !== null && per.lancamento.comissao_fixa !== undefined ? per.lancamento.comissao_fixa : comissaoFixaDoPeriodo(per);
          return { faixa_pct: per.lancamento ? per.lancamento.faixa_pct : per.faixa_pct, comissao_fixa: fixa, faturamento_bruto: r2(n.bruto_tutts + n.bruto_hub), repasse_entregador: r2(n.repasse_tutts + n.repasse_hub), garantido: n.garantido };
        });
        porUnid[e.unidade.id] = calcularLancamento({ periodos: periodos, imposto_pct: e.imposto_pct, dividida: dados.cliente.comissao_dividida, saldo_pendente_entrada: e.saldo_entrada.valor, manter_saldo_negativo: manter });
      });
      return { porUnid: porUnid, total: somarTotais(Object.keys(porUnid).map(function (k) { return porUnid[k]; })) };
    }, [dados, vals, manter]);

    function setVal(uid, per, k, v) { setVals(function (a) { var n = Object.assign({}, a); var key = uid + '|' + per.inicio; n[key] = Object.assign({}, n[key]); n[key][k] = v; return n; }); }
    function restaurar(uid, per) { setVals(function (a) { var n = Object.assign({}, a); var ref = valoresDoBi(per.bi), o = {}; CAMPOS.forEach(function (k) { o[k] = moedaInput(ref[k]); }); n[uid + '|' + per.inicio] = o; return n; }); }
    function excluirLanc() {
      if (!window.confirm('Remover o lançamento de ' + fComp(p.competencia) + ' deste cliente?\n\nO cliente volta a "Aguardando lançamento" e os meses seguintes são recalculados.')) return;
      setErro(null); setSalvando(true);
      api('/comissao/lancamento?cliente_id=' + p.clienteId + '&competencia=' + p.competencia, { method: 'DELETE' }).then(function () { p.aoSalvar('Lançamento removido'); }).catch(function (e) { setErro(e.message); }).finally(function () { setSalvando(false); });
    }
    function salvar() {
      setErro(null); setSalvando(true);
      var unidades = unidadesVis.filter(function (e) { return !e.encerrado && e.periodos.length; }).map(function (e) {
        return { unidade_id: e.unidade.id, periodos: e.periodos.map(function (per) { return Object.assign({ inicio: per.inicio }, numeros(e.unidade.id, per)); }) };
      });
      api('/comissao/lancamento', { method: 'POST', body: JSON.stringify({ cliente_id: p.clienteId, competencia: p.competencia, manter_saldo_negativo: manter, unidades: unidades }) })
        .then(function () { p.aoSalvar(); }).catch(function (e) { setErro(e.message); }).finally(function () { setSalvando(false); });
    }
    function sincronizar() {
      setSincronizando(true); setErro(null);
      api('/comissao/garantido/sincronizar', { method: 'POST' }).then(function () { return carregar(); }).catch(function (e) { setErro(e.message); }).finally(function () { setSincronizando(false); });
    }

    var campo = function (uid, per, k, rotuloTxt, refValor, refNome) {
      var t = (vals[uid + '|' + per.inicio] || {})[k] || '';
      var difere = Math.abs(parseMoeda(t) - Number(refValor || 0)) >= 0.005;
      return h('div', null,
        h('label', { className: rotulo }, rotuloTxt),
        h('input', { className: caixa + ' text-right tabular-nums' + (k === 'garantido' ? ' border-amber-300' : ''), disabled: soLeitura, 'aria-label': rotuloTxt + ' ' + fDiaMes(per.inicio), value: t, onChange: function (e) { setVal(uid, per, k, e.target.value); }, onBlur: function (e) { setVal(uid, per, k, moedaInput(parseMoeda(e.target.value))); } }),
        h('div', { className: 'text-[10.5px] mt-0.5 ' + (difere ? 'text-amber-800' : 'text-purple-700') }, difere ? 'Ajustado à mão · ' + refNome + ': ' + fR(refValor) : 'Igual ao ' + refNome));
    };
    var linhaRes = function (rot, val, cls, neg) { return h('div', { className: 'flex items-center justify-between text-[12.5px] py-0.5' }, h('span', { className: 'text-gray-500' }, rot), h('span', { className: 'tabular-nums font-semibold ' + (neg ? 'text-red-800' : (cls || 'text-gray-900')) }, val)); };
    var refNome = fixo ? 'cadastro' : 'BI';

    return h(Lateral, { titulo: dados ? dados.cliente.nome : 'Carregando...', sobretitulo: 'Lançamento · ' + fComp(p.competencia) + (fixo ? ' · contrato fixo' : ''), fechar: p.fechar, largura: 720,
      rodape: [dados && (dados.lancado || dados.lancado_parcial) && !soLeitura ? h('button', { key: 'x', className: 'mr-auto px-4 py-2 rounded-[10px] text-sm font-semibold text-red-800 border border-red-200 hover:bg-red-50 disabled:opacity-50', disabled: salvando, onClick: excluirLanc }, 'Remover lançamento') : null, h('button', { key: 'c', className: btnS, onClick: p.fechar }, soLeitura ? 'Fechar' : 'Cancelar'), !soLeitura ? h('button', { key: 's', className: btnP, disabled: salvando || !dados, onClick: salvar }, salvando ? 'Salvando...' : 'Salvar lançamento') : null] },
      h(Erro, { msg: erro }),
      !dados ? h('div', { className: 'p-10 text-center text-gray-500 text-sm' }, 'Carregando...') : [
        soLeitura ? h('div', { key: 'ro', className: 'bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12.5px] text-gray-600' }, 'Competência ' + dados.status.status + ' — somente leitura. A memória de cálculo mostra os valores gravados no lançamento.') : null,
        calcs ? h('div', { key: 'kpi', className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
          h('div', { className: 'rounded-xl p-3 bg-purple-50 border border-purple-100' }, h('div', { className: 'text-[10.5px] font-extrabold uppercase tracking-wider text-purple-700' }, fixo ? 'Motoboys no mês' : 'Entregas no mês'), h('div', { className: 'text-xl font-extrabold text-purple-900' }, fixo ? String(unidadesVis.length) : (dados.bi_sem_dados ? 'Sem dados no BI' : String(dados.entregas_bi))), h('div', { className: 'text-[11px] text-gray-600' }, fixo ? 'contrato fixo' : dados.cliente.incluir_rotulo)),
          h('div', { className: 'rounded-xl p-3 bg-purple-50 border border-purple-100' }, h('div', { className: 'text-[10.5px] font-extrabold uppercase tracking-wider text-purple-700' }, fixo ? 'Contrato no mês' : 'Faturamento bruto'), h('div', { className: 'text-xl font-extrabold text-purple-900' }, fR(calcs.total.faturamento_bruto)), h('div', { className: 'text-[11px] text-gray-600' }, fixo ? 'proporcional aos dias' : 'puxado do BI')),
          h('div', { className: 'rounded-xl p-3 bg-amber-50 border border-amber-200' }, h('div', { className: 'text-[10.5px] font-extrabold uppercase tracking-wider text-amber-800' }, 'Faturamento real'), h('div', { className: 'text-xl font-extrabold text-amber-900' }, fR(calcs.total.faturamento_real)), h('div', { className: 'text-[11px] text-amber-800' }, fixo ? 'sem garantido' : 'bruto − ' + fR(calcs.total.garantido) + ' de garantido'))) : null,
        !fixo && temTutts ? h('div', { key: 'sy', className: 'flex items-center gap-2 text-[11.5px] text-gray-500 flex-wrap' },
          'Garantido da planilha atualizado em ' + (dados.garantido_sincronizado_em ? fDataHora(dados.garantido_sincronizado_em) : '—') + '.',
          !soLeitura ? h('button', { type: 'button', className: 'font-semibold text-purple-700 disabled:opacity-50', disabled: sincronizando, onClick: sincronizar }, sincronizando ? 'Atualizando...' : 'Atualizar agora') : null) : null,
        dados.saldo_entrada.valor > 0 ? h('div', { key: 'sn', className: 'bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12.5px] text-red-800' }, h('b', null, fR(dados.saldo_entrada.valor) + ' de saldo negativo pendente'), ' de ' + fComp(dados.saldo_entrada.origem) + ' é somado ao repasse neste mês.') : null,
        unidadesVis.map(function (e) {
          var u = e.unidade, cu = calcs && calcs.porUnid[u.id];
          return h('div', { key: u.id, className: 'border border-gray-200 rounded-xl p-3 space-y-3' },
            h('div', { className: 'flex items-start gap-2 flex-wrap' },
              h('div', { className: 'flex-1 min-w-0' },
                h('div', { className: 'text-[13.5px] font-bold text-gray-900' }, u.rotulo),
                h('div', { className: 'text-[11.5px] text-gray-500' }, 'desde ' + fData(u.data_inicio) + (u.data_fim ? ' · saída ' + fData(u.data_fim) : '') + ' · ' + e.mes_relacao + (u.regra_propria ? ' · regra própria' : '') + (fixo ? '' : ' · ' + e.entregas_bi + ' entregas'))),
              tagsPeriodos(e.periodos, dados.cliente.comissao_dividida)),
            e.encerrado ? h('div', { className: 'text-[12px] text-gray-500' }, 'Fora do período de comissão neste mês.') :
            e.periodos.map(function (per, i) {
              var ref = valoresDoBi(per.bi), cp = cu ? cu.periodos[i] : null, chave = u.id + '|' + per.inicio;
              var t = vals[chave] || {};
              var algumManual = CAMPOS.some(function (k) { return Math.abs(parseMoeda(t[k]) - Number(ref[k] || 0)) >= 0.005; });
              return h('div', { key: per.inicio, className: 'space-y-2 ' + (i ? 'border-t border-gray-100 pt-3' : '') },
                e.periodos.length > 1 ? h('div', { className: 'flex items-center justify-between text-[12px]' }, h('span', { className: 'font-bold text-gray-700' }, fDiaMes(per.inicio) + ' a ' + fDiaMes(per.fim)), h(TagFaixa, { pct: per.faixa_pct, valor: per.faixa_valor, modo: per.faixa_modo, encerrada: per.encerrada, dividida: dados.cliente.comissao_dividida })) : null,
                per.lancamento && per.lancamento.legado ? h('div', { className: 'text-[11.5px] text-gray-500' }, 'Lançado antes da separação Tutts/Hub e do garantido: o valor total aparece como Tutts.') : null,
                fixo ? h('div', { className: 'grid grid-cols-2 gap-3' }, campo(u.id, per, 'bruto_tutts', 'Contrato no período (R$)', ref.bruto_tutts, refNome), campo(u.id, per, 'repasse_tutts', 'Pago ao motoboy (R$)', ref.repasse_tutts, refNome)) : [
                  temTutts ? h('div', { key: 't', className: 'grid gap-3 items-start', style: { gridTemplateColumns: '64px minmax(0,1fr) minmax(0,1fr)' } }, h('div', { className: 'text-[12px] font-bold text-gray-700 pt-6' }, 'Tutts'), campo(u.id, per, 'bruto_tutts', 'Bruto (R$)', ref.bruto_tutts, refNome), campo(u.id, per, 'repasse_tutts', 'Repasse (R$)', ref.repasse_tutts, refNome)) : null,
                  temHub ? h('div', { key: 'h', className: 'grid gap-3 items-start', style: { gridTemplateColumns: '64px minmax(0,1fr) minmax(0,1fr)' } }, h('div', { className: 'text-[12px] font-bold text-gray-700 pt-6' }, 'Hub'), campo(u.id, per, 'bruto_hub', 'Bruto (R$)', ref.bruto_hub, refNome), campo(u.id, per, 'repasse_hub', 'Repasse (R$)', ref.repasse_hub, refNome)) : null,
                  temTutts ? h('div', { key: 'g', className: 'grid gap-3 items-start', style: { gridTemplateColumns: '64px minmax(0,1fr) minmax(0,1fr)' } }, h('div', { className: 'text-[12px] font-bold text-amber-800 pt-6' }, 'Garantido'), campo(u.id, per, 'garantido', 'Custo do garantido (R$)', ref.garantido, 'BI'),
                    h('div', { className: 'text-[11.5px] text-gray-500 pt-6' }, per.bi.garantido_rateio === 'entregas' ? 'Rateado pelas entregas Tutts do dia' + (per.bi.garantido_loja ? ' · loja: ' + fR(per.bi.garantido_loja) : '') : 'Garantido da loja inteira')) : null],
                h('div', { className: 'flex items-center gap-3 flex-wrap' },
                  h('button', { type: 'button', className: 'text-[12px] font-semibold text-purple-700', 'aria-expanded': !!memAberta[chave], onClick: function () { setMemAberta(function (m) { var n = Object.assign({}, m); n[chave] = !n[chave]; return n; }); } }, memAberta[chave] ? 'Esconder memória de cálculo' : 'Ver memória de cálculo'),
                  !soLeitura && algumManual ? h('button', { type: 'button', className: 'text-[12px] font-semibold text-gray-600', onClick: function () { restaurar(u.id, per); } }, 'Voltar aos valores do ' + refNome) : null,
                  cp ? h('span', { className: 'ml-auto text-[12.5px] text-gray-500' }, 'Comissão: ', h('b', { className: 'text-purple-800 tabular-nums' }, fR(cp.comissao))) : null),
                memAberta[chave] ? h(MemoriaCalculo, { periodo: per, bi: soLeitura && per.bi_gravado ? per.bi_gravado : per.bi, calc: cp, fixo: fixo, impostoPct: e.imposto_pct, dividida: dados.cliente.comissao_dividida }) : null,
                per.bi_gravado && !soLeitura && Math.abs(Number(per.bi_gravado.bruto) - Number(per.bi.bruto)) >= 0.01 ? h('div', { className: 'text-[11.5px] text-amber-800' }, 'O ' + refNome + ' mudou desde o lançamento (bruto gravado ' + fR(per.bi_gravado.bruto) + ', agora ' + fR(per.bi.bruto) + '). Use "Voltar aos valores" para atualizar.') : null);
            }));
        }),
        calcs ? h('div', { key: 'res', className: 'rounded-xl p-3 bg-purple-50 border border-purple-100' },
          h('div', { className: 'text-[11px] font-extrabold uppercase tracking-wider text-purple-800 mb-1' }, 'Resultado do mês'),
          linhaRes(fixo ? 'Contrato' : 'Faturamento bruto' + (temHub && temTutts ? ' (Tutts + Hub)' : ''), fR(calcs.total.faturamento_bruto)),
          !fixo ? linhaRes('(−) Garantido', '− ' + fR(calcs.total.garantido), 'text-amber-800') : null,
          linhaRes('Faturamento real', fR(calcs.total.faturamento_real)),
          linhaRes('(−) ' + (fixo ? 'Pago aos motoboys' : 'Repasse ao entregador') + (dados.saldo_entrada.valor > 0 ? ' + saldo pendente' : ''), '− ' + fR(calcs.total.repasse_efetivo)),
          linhaRes('Margem', fRneg(calcs.total.comissao_liquida), null, calcs.total.comissao_liquida < 0),
          linhaRes('Imposto (' + dados.imposto_pct + '% da margem)', '− ' + fR(calcs.total.imposto)),
          linhaRes('Lucro', fRneg(calcs.total.lucro), null, calcs.total.lucro < 0),
          h('div', { className: 'border-t border-purple-200 my-1' }),
          linhaRes(unidadesVis.length > 1 ? 'Comissão (cada ' + (fixo ? 'motoboy' : 'centro') + ' na sua faixa)' : 'Comissão do vendedor', fR(calcs.total.comissao), 'text-purple-800 text-[16px] font-extrabold'),
          dados.cliente.comissao_dividida ? linhaRes('Para cada vendedor', fR(calcs.total.comissao_por_vendedor), 'text-purple-900') : linhaRes('Vendedor', dados.cliente.vendedores)) : null,
        h('label', { key: 'ck', className: 'flex items-start gap-3 p-3 border rounded-xl cursor-pointer ' + (calcs && calcs.total.tem_negativo ? 'border-red-200 bg-red-50' : 'border-gray-200') },
          h('input', { type: 'checkbox', className: 'mt-1 accent-purple-700', disabled: soLeitura, checked: manter, onChange: function (e) { setManter(e.target.checked); } }),
          h('div', null, h('div', { className: 'text-sm font-semibold text-gray-900' }, 'Manter saldo negativo pendente'),
            h('div', { className: 'text-[11.5px] text-gray-500' }, 'Se a margem de um ' + (fixo ? 'motoboy' : 'centro') + ' ficar negativa, o valor soma ao repasse dele no mês seguinte.'),
            calcs && calcs.total.tem_negativo && manter ? h('div', { className: 'text-[11.5px] text-red-800 font-semibold mt-1' }, fR(calcs.total.saldo_pendente_saida) + ' será somado ao repasse de ' + fComp(compAdd(p.competencia, 1))) : null)),
        dados.lancado_por ? h('div', { key: 'lp', className: 'text-[11px] text-gray-500' }, 'Lançado por ' + dados.lancado_por + (dados.lancado_em ? ' em ' + fDataHora(dados.lancado_em) : '')) : null
      ]
    );
  }

  // ═══════════════════ PAINEL: EXTRATO ═══════════════════
  function PainelExtrato(p) {
    var api = p.api;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _ab = useState('extrato'), aba = _ab[0], setAba = _ab[1];
    var _er = useState(null), erro = _er[0], setErro = _er[1];
    var _rt = useState(null), retro = _rt[0], setRetro = _rt[1]; // { ate, fechar }
    var _rb = useState(false), retroBusy = _rb[0], setRetroBusy = _rb[1];
    var _rr = useState(null), retroRes = _rr[0], setRetroRes = _rr[1];
    function carregarExtrato() { return api('/comissao/extrato/' + p.clienteId + '?competencia=' + p.competencia).then(setD).catch(function (e) { setErro(e.message); }); }
    useEffect(function () { carregarExtrato(); }, [p.clienteId, p.competencia, api]);
    var mesesRetro = d ? d.meses.filter(function (m) { return m.previa && !m.encerrado && m.competencia < compHoje(); }) : [];
    var fixo = d && d.cliente.tipo === 'fixo';
    function executarRetro() {
      setRetroBusy(true); setRetroRes(null);
      api('/comissao/extrato/' + p.clienteId + '/lancar-anteriores', { method: 'POST', body: JSON.stringify({ ate: retro.ate, fechar_e_pagar: !!retro.fechar }) })
        .then(function (j) { setRetroRes(j); setRetro(null); p.mudou && p.mudou(); return carregarExtrato(); })
        .catch(function (e) { setErro(e.message); }).finally(function () { setRetroBusy(false); });
    }
    var th = function (t, right) { return h('th', { className: (right ? 'text-right' : 'text-left') }, t); };
    var td = function (t, cls) { return h('td', { className: 'px-2 py-1.5 tabular-nums whitespace-nowrap ' + (cls || '') }, t); };
    return h(Lateral, { titulo: d ? d.cliente.nome : 'Carregando...', sobretitulo: 'Extrato de comissão' + (d ? (fixo ? ' · contrato fixo' : ' · ID ' + d.cliente.cod_cliente) : ''), fechar: p.fechar, largura: 960,
      rodape: [h('button', { key: 'e', className: btnS, disabled: !d, onClick: function () { p.editar(d.cliente); } }, 'Editar cadastro'), h('button', { key: 'c', className: btnP, onClick: p.fechar }, 'Fechar')] },
      h(Erro, { msg: erro }),
      !d ? h('div', { className: 'p-10 text-center text-gray-500 text-sm' }, 'Carregando...') : [
        h('div', { key: 'r', className: 'grid grid-cols-2 lg:grid-cols-4 gap-3' },
          [['Vendedor(es)', d.cliente.vendedores], ['Entra na comissão', d.cliente.incluir_rotulo], ['Comissão dividida', d.cliente.comissao_dividida ? 'Sim' : 'Não'], ['Regra do ' + (fixo ? 'contrato' : 'cliente'), d.cliente.regra_resumo]].map(function (x, i) {
            return h('div', { key: i, className: 'bg-gray-50 rounded-xl p-3' }, h('div', { className: 'text-[10.5px] font-extrabold uppercase tracking-wider text-gray-500' }, x[0]), h('div', { className: 'text-[13px] font-bold text-gray-900' }, x[1]));
          })),
        h('div', { key: 'tabs', className: 'flex gap-1 border-b border-gray-200' }, [['extrato', 'Extrato'], ['historico', 'Histórico (' + d.historico.length + ')']].map(function (t) {
          return h('button', { key: t[0], type: 'button', onClick: function () { setAba(t[0]); }, className: 'px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px ' + (aba === t[0] ? 'border-purple-700 text-purple-800' : 'border-transparent text-gray-500') }, t[1]);
        })),
        aba === 'extrato' ? h('div', { key: 'ex', className: 'space-y-4' },
          mesesRetro.length > 0 && !retro ? h('div', { className: 'flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-800 flex-wrap' },
            h('span', { className: 'flex-1' }, h('b', null, mesesRetro.length + ' mês(es) anterior(es) sem lançamento'), ' (' + fComp3(mesesRetro[0].competencia) + ' a ' + fComp3(mesesRetro[mesesRetro.length - 1].competencia) + '). Aparecem como prévia e não entram no total.'),
            h('button', { className: btnP, onClick: function () { setRetro({ ate: mesesRetro[mesesRetro.length - 1].competencia, fechar: false }); } }, 'Lançar meses anteriores')) : null,
          retro ? h('div', { className: 'rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3' },
            h('div', { className: 'text-[13px] font-bold text-amber-800' }, 'Lançar meses anteriores com os valores do ' + (fixo ? 'cadastro' : 'BI')),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              h('div', null, h('label', { className: rotulo }, 'Até'),
                h('select', { className: caixa, value: retro.ate, onChange: function (e) { setRetro(Object.assign({}, retro, { ate: e.target.value })); } }, mesesRetro.map(function (m) { return h('option', { key: m.competencia, value: m.competencia }, fComp(m.competencia)); }))),
              h('label', { className: 'flex items-start gap-2 text-[12.5px] mt-5 cursor-pointer' }, h('input', { type: 'checkbox', className: 'mt-0.5 accent-purple-700', checked: retro.fechar, onChange: function (e) { setRetro(Object.assign({}, retro, { fechar: e.target.checked })); } }),
                h('span', null, h('b', null, 'Fechar e marcar como pago'), ' essas competências', h('span', { className: 'block text-[11px] text-gray-500' }, 'Só fecha a competência se nenhum outro cliente estiver pendente nela.')))),
            h('div', { className: 'overflow-x-auto max-h-56 overflow-y-auto border border-amber-200 rounded-lg bg-white' }, h('table', { className: 'w-full text-[12px] fin-tbl' },
              h('thead', null, h('tr', null, th('Mês'), th('Fat. bruto', 1), th('Garantido', 1), th('Repasse', 1), th('Faixa'), th('Comissão', 1))),
              h('tbody', null, mesesRetro.filter(function (m) { return m.competencia <= retro.ate; }).map(function (m) {
                return h('tr', { key: m.competencia }, td(fComp3(m.competencia), 'font-bold'), td(fR(m.faturamento_bruto), 'text-right'), td(fR(m.garantido), 'text-right'), td(fR(m.repasse_entregador), 'text-right'), td(m.faixa_rotulo), td(fR(m.comissao), 'text-right font-bold text-purple-800'));
              })))),
            h('p', { className: 'text-[11px] text-amber-800' }, 'Os valores podem ser ajustados depois, mês a mês, enquanto a competência estiver aberta.'),
            h('div', { className: 'flex justify-end gap-2' }, h('button', { className: btnS, disabled: retroBusy, onClick: function () { setRetro(null); } }, 'Cancelar'), h('button', { className: btnP, disabled: retroBusy, onClick: executarRetro }, retroBusy ? 'Lançando...' : 'Confirmar lançamentos'))) : null,
          retroRes ? h('div', { className: 'rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-[12.5px] text-green-800' },
            h('b', null, retroRes.criados.length + ' competência(s) lançada(s)'), retroRes.criados.length ? ' (' + retroRes.criados.map(function (c) { return fComp3(c.competencia); }).join(', ') + ')' : '',
            retroRes.fechados.length ? h('div', null, 'Fechadas e pagas: ' + retroRes.fechados.map(fComp3).join(', ')) : null,
            retroRes.nao_fechados.length ? h('div', { className: 'text-amber-800' }, 'Não fechadas (outros clientes pendentes): ' + retroRes.nao_fechados.map(function (n) { return fComp3(n.competencia) + ' — ' + n.pendentes.join(', '); }).join(' · ')) : null) : null,
          d.timelines.map(function (t) {
            return h('div', { key: t.unidade.id },
              h('div', { className: 'text-[12px] font-bold text-gray-700 mb-1' }, t.unidade.rotulo + ' · desde ' + fData(t.unidade.data_inicio) + (t.unidade.data_fim ? ' · saída ' + fData(t.unidade.data_fim) : '') + ' · ' + t.unidade.regra_resumo),
              h('div', { className: 'grid gap-1', style: { gridTemplateColumns: 'repeat(' + Math.min(t.blocos.length, 12) + ', minmax(0,1fr))' } }, t.blocos.map(function (b, i) {
                var valor = t.unidade.regra_efetiva && t.unidade.regra_efetiva.modo === 'valor';
                var c = b.pct_cheio === 0 && !valor ? CORES_FAIXA[0] : (CORES_FAIXA[b.pct_cheio] || COR_PERS);
                return h('div', { key: i, className: 'rounded-lg text-center py-1.5 leading-tight', style: { background: c.bg, color: c.fg, outline: b.na_competencia ? '2px solid #F67602' : 'none', outlineOffset: -1 }, title: 'Mês ' + b.mes + ': ' + fData(b.inicio) + ' a ' + fData(b.fim) },
                  h('div', { className: 'text-[10px] font-bold' }, fDiaMes(b.inicio)), h('div', { className: 'text-[11px] font-extrabold' }, valor ? 'R$' : b.pct + '%'));
              })),
              h('div', { className: 'text-[10.5px] text-gray-500 mt-1' }, (t.sem_fim ? 'Sem data de saída da comissão.' : 'Sai da comissão em ' + fData(t.saida) + '.') + ' Contorno laranja = competência selecionada.'));
          }),
          h('div', { className: 'overflow-x-auto border border-gray-200 rounded-xl' },
            h('table', { className: 'w-full text-[12px] fin-tbl' },
              h('thead', null, h('tr', null, th('Mês'), !fixo ? th('Entregas', 1) : null, th(fixo ? 'Contrato' : 'Fat. bruto', 1), !fixo ? th('Garantido', 1) : null, th('Fat. real', 1), th(fixo ? 'Motoboys' : 'Repasse', 1), th('Margem', 1), th('Imposto', 1), th('Lucro', 1), th('Faixa'), th('Comissão', 1))),
              h('tbody', null, d.meses.map(function (m) {
                return h('tr', { key: m.competencia, className: (m.selecionada ? 'bg-amber-50 ' : '') + (m.previa ? 'text-gray-500 italic' : ''), title: m.previa ? 'Sem lançamento (prévia)' : '' },
                  td(fComp3(m.competencia), 'font-bold ' + (m.previa ? '' : 'text-gray-900')), !fixo ? td(m.bi_sem_dados ? '—' : m.entregas, 'text-right') : null, td(fR(m.faturamento_bruto), 'text-right'),
                  !fixo ? td(m.garantido ? '− ' + fR(m.garantido) : '—', 'text-right text-amber-800') : null, td(fR(m.faturamento_real), 'text-right'),
                  td(h('span', null, fR(m.repasse_entregador), m.saldo_entrada > 0 ? h('span', { className: 'block text-[10px] text-red-800 not-italic' }, '+ ' + fR(m.saldo_entrada) + ' pendente') : null), 'text-right'),
                  td(fRneg(m.comissao_liquida), 'text-right ' + (m.comissao_liquida < 0 ? 'text-red-800' : '')), td(fR(m.imposto), 'text-right'), td(fRneg(m.lucro), 'text-right ' + (m.lucro < 0 ? 'text-red-800' : '')),
                  td(m.faixa_rotulo), td(m.previa ? (m.encerrado ? 'Fora do período' : 'Aguardando') : fR(m.comissao), 'text-right font-bold ' + (m.previa ? '' : 'text-purple-900')));
              }), h('tr', { className: 'bg-purple-50 font-extrabold text-gray-900' },
                td('Total'), !fixo ? td(d.total.entregas, 'text-right') : null, td(fR(d.total.faturamento_bruto), 'text-right'), !fixo ? td(fR(d.total.garantido), 'text-right') : null, td(fR(d.total.faturamento_real), 'text-right'), td(fR(d.total.repasse_entregador), 'text-right'), td(fR(d.total.comissao_liquida), 'text-right'), td(fR(d.total.imposto), 'text-right'), td(fR(d.total.lucro), 'text-right'), td(''), td(fR(d.total.comissao), 'text-right text-purple-900'))))),
          h('div', { className: 'text-[10.5px] text-gray-500' }, 'Linhas em itálico são prévias (mês sem lançamento). O total soma só os meses lançados.'))
        : h('div', { key: 'hi', className: 'divide-y divide-gray-100 border border-gray-200 rounded-xl' }, d.historico.length === 0 ? h('div', { className: 'p-4 text-xs text-gray-500' }, 'Sem registros.') : d.historico.map(function (l) {
            return h('div', { key: l.id, className: 'px-3 py-2 text-[12px]' },
              h('div', { className: 'flex items-center gap-2 flex-wrap' }, h('span', { className: 'px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-bold uppercase text-gray-700' }, l.acao), h('span', { className: 'font-semibold text-gray-900' }, l.entidade + (l.competencia ? ' · ' + fComp3(l.competencia) : '')), l.campo ? h('span', { className: 'text-gray-500' }, '· ' + l.campo) : null, h('span', { className: 'ml-auto text-gray-500 text-[11px]' }, fDataHora(l.criado_em) + ' · ' + (l.usuario || ''))),
              (l.valor_anterior != null || l.valor_novo != null) ? h('div', { className: 'text-gray-500 mt-0.5 break-all' }, l.valor_anterior != null ? h('span', { className: 'line-through mr-2' }, String(l.valor_anterior)) : null, l.valor_novo != null ? h('span', { className: 'text-gray-900' }, String(l.valor_novo)) : null) : null);
          }))
      ]
    );
  }

  // ═══════════════════ PAINEL: VENDEDORES ═══════════════════
  function PainelVendedores(p) {
    var api = p.api;
    var _l = useState([]), lista = _l[0], setLista = _l[1];
    var _u = useState([]), usuarios = _u[0], setUsuarios = _u[1];
    var _n = useState({ nome: '', user_cod: '' }), novo = _n[0], setNovo = _n[1];
    var _er = useState(null), erro = _er[0], setErro = _er[1];
    function carregar() { api('/comissao/vendedores?todos=1').then(function (j) { setLista(j.vendedores || []); }).catch(function (e) { setErro(e.message); }); }
    useEffect(function () { carregar(); api('/comissao/usuarios').then(function (j) { setUsuarios(j.usuarios || []); }).catch(function () {}); }, [api]);
    function criar() { setErro(null); api('/comissao/vendedores', { method: 'POST', body: JSON.stringify(novo) }).then(function () { setNovo({ nome: '', user_cod: '' }); carregar(); p.mudou(); }).catch(function (e) { setErro(e.message); }); }
    function alternar(v) { api('/comissao/vendedores/' + v.id, { method: 'PUT', body: JSON.stringify({ ativo: !v.ativo }) }).then(function () { carregar(); p.mudou(); }).catch(function (e) { setErro(e.message); }); }
    function renomear(v) { var n = window.prompt('Nome do vendedor', v.nome); if (!n || n === v.nome) return; api('/comissao/vendedores/' + v.id, { method: 'PUT', body: JSON.stringify({ nome: n }) }).then(function () { carregar(); p.mudou(); }).catch(function (e) { setErro(e.message); }); }
    return h(Lateral, { titulo: 'Vendedores', sobretitulo: 'Cadastro', fechar: p.fechar, rodape: [h('button', { key: 'c', className: btnP, onClick: p.fechar }, 'Fechar')] },
      h(Erro, { msg: erro }),
      h('div', { className: 'border border-gray-200 rounded-xl p-3 space-y-2' },
        h('div', { className: secao }, 'Novo vendedor'),
        h('input', { className: caixa, placeholder: 'Nome', 'aria-label': 'Nome do vendedor', value: novo.nome, onChange: function (e) { setNovo(Object.assign({}, novo, { nome: e.target.value })); } }),
        h('select', { className: caixa, 'aria-label': 'Usuário da Central', value: novo.user_cod, onChange: function (e) { setNovo(Object.assign({}, novo, { user_cod: e.target.value })); } }, h('option', { value: '' }, 'Vincular a um usuário da Central (opcional)'), usuarios.map(function (u) { return h('option', { key: u.cod_profissional, value: u.cod_profissional }, u.full_name + ' (' + u.cod_profissional + ')'); })),
        h('button', { className: btnP, disabled: novo.nome.trim().length < 2, onClick: criar }, 'Adicionar vendedor')),
      h('div', { className: 'divide-y divide-gray-100 border border-gray-200 rounded-xl' }, lista.map(function (v) {
        return h('div', { key: v.id, className: 'flex items-center gap-3 px-3 py-2' },
          h('div', { className: 'w-8 h-8 rounded-full bg-purple-100 text-purple-800 text-[11px] font-extrabold flex items-center justify-center' }, v.nome.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase()),
          h('div', { className: 'flex-1 min-w-0' }, h('div', { className: 'text-sm font-semibold ' + (v.ativo ? 'text-gray-900' : 'text-gray-500 line-through') }, v.nome), h('div', { className: 'text-[11px] text-gray-500' }, (v.clientes || 0) + ' cliente(s) em comissão' + (v.user_cod ? ' · usuário ' + v.user_cod : ''))),
          h('button', { className: 'text-[11.5px] text-purple-700 font-semibold', onClick: function () { renomear(v); } }, 'Renomear'),
          h('button', { className: 'text-[11.5px] font-semibold ' + (v.ativo ? 'text-red-800' : 'text-green-800'), onClick: function () { alternar(v); } }, v.ativo ? 'Desativar' : 'Reativar'));
      }), lista.length === 0 ? h('div', { className: 'p-4 text-xs text-gray-500' }, 'Nenhum vendedor cadastrado.') : null));
  }

  // ═══════════════════ PAINEL: HISTÓRICO GERAL ═══════════════════
  function PainelHistorico(p) {
    var _l = useState(null), logs = _l[0], setLogs = _l[1];
    useEffect(function () { p.api('/comissao/logs?competencia=' + p.competencia).then(function (j) { setLogs(j.logs || []); }).catch(function () { setLogs([]); }); }, [p.competencia, p.api]);
    return h(Lateral, { titulo: 'Histórico · ' + fComp(p.competencia), sobretitulo: 'Logs de auditoria', fechar: p.fechar, largura: 720, rodape: [h('button', { key: 'c', className: btnP, onClick: p.fechar }, 'Fechar')] },
      !logs ? h('div', { className: 'p-6 text-gray-500 text-sm' }, 'Carregando...') : logs.length === 0 ? h('div', { className: 'p-6 text-gray-500 text-sm' }, 'Nenhum registro nesta competência.') :
      h('div', { className: 'divide-y divide-gray-100 border border-gray-200 rounded-xl' }, logs.map(function (l) {
        return h('div', { key: l.id, className: 'px-3 py-2 text-[12px]' },
          h('div', { className: 'flex items-center gap-2 flex-wrap' }, h('span', { className: 'px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-bold uppercase text-gray-700' }, l.acao), h('span', { className: 'font-semibold text-gray-900' }, (l.nome_cliente ? l.nome_cliente + ' · ' : '') + l.entidade), l.campo ? h('span', { className: 'text-gray-500' }, '· ' + l.campo) : null, h('span', { className: 'ml-auto text-gray-500 text-[11px]' }, fDataHora(l.criado_em) + ' · ' + (l.usuario || ''))),
          (l.valor_anterior != null || l.valor_novo != null) ? h('div', { className: 'text-gray-500 mt-0.5 break-all' }, l.valor_anterior != null ? h('span', { className: 'line-through mr-2' }, String(l.valor_anterior)) : null, l.valor_novo != null ? h('span', { className: 'text-gray-900' }, String(l.valor_novo)) : null) : null);
      })));
  }

  // ═══════════════════ COMPONENTE PRINCIPAL ═══════════════════
  window.ModuloComissaoComponent = function (props) {
    var API_URL = props.API_URL, fetchAuth = props.fetchAuth, toast = props.ja, usuario = props.usuario;
    var role = usuario && usuario.role;
    var _c = useState(compHoje()), comp = _c[0], setComp = _c[1];
    var _d = useState(null), dados = _d[0], setDados = _d[1];
    var _lo = useState(true), carregando = _lo[0], setCarregando = _lo[1];
    var _er = useState(null), erro = _er[0], setErro = _er[1];
    var _v = useState([]), vendedores = _v[0], setVendedores = _v[1];
    var _im = useState(null), imposto = _im[0], setImposto = _im[1];
    var _pa = useState(null), painel = _pa[0], setPainel = _pa[1];
    var _bz = useState(false), busy = _bz[0], setBusy = _bz[1];
    var _ab = useState({}), abertos = _ab[0], setAbertos = _ab[1];

    var api = useCallback(async function (rota, opcoes) {
      opcoes = opcoes || {};
      var r = await fetchAuth(API_URL + rota, Object.assign({}, opcoes, { headers: Object.assign({ 'Content-Type': 'application/json' }, opcoes.headers || {}) }));
      var j = null; try { j = await r.json(); } catch (e) { j = null; }
      if (!r.ok) { var er = new Error((j && j.error) || ('HTTP ' + r.status)); er.sem_permissao = j && j.sem_permissao; throw er; }
      return j;
    }, [API_URL, fetchAuth]);

    var recarregar = useCallback(function () {
      setCarregando(true); setErro(null);
      Promise.all([api('/comissao/painel?competencia=' + comp), api('/comissao/vendedores'), api('/comissao/config')])
        .then(function (r) { setDados(r[0]); setVendedores(r[1].vendedores || []); setImposto(r[2].imposto_pct); setCarregando(false); })
        .catch(function (e) { setErro(e.sem_permissao ? 'sem permissão' : e.message); setCarregando(false); });
    }, [api, comp]);
    useEffect(function () { recarregar(); }, [recarregar]);

    if (!['admin_financeiro', 'admin_master'].includes(role) || erro === 'sem permissão') {
      return h('div', { className: 'bg-white rounded-[14px] border border-gray-200 p-10 text-center' }, h('div', { className: 'mb-2 flex justify-center' }, Ico('lock', 'ico', { width: 28, height: 28 })), h('p', { className: 'font-bold text-gray-900' }, 'Sem permissão'), h('p', { className: 'text-sm text-gray-500' }, 'O Controle de Comissões é exclusivo do perfil Financeiro.'));
    }

    function aviso(msg, tipo) { if (typeof toast === 'function') toast(msg, tipo || 'success'); }
    function fecharMes() {
      if (!window.confirm('Fechar a competência ' + fComp(comp) + '?\n\nDepois de fechada não é possível criar nem editar lançamentos.')) return;
      setBusy(true); api('/comissao/competencia/fechar', { method: 'POST', body: JSON.stringify({ competencia: comp }) }).then(function () { aviso('Competência fechada'); recarregar(); }).catch(function (e) { aviso(e.message, 'error'); }).finally(function () { setBusy(false); });
    }
    function marcarPago() {
      if (!window.confirm('Marcar a competência ' + fComp(comp) + ' como paga?')) return;
      setBusy(true); api('/comissao/competencia/pagar', { method: 'POST', body: JSON.stringify({ competencia: comp }) }).then(function () { aviso('Competência marcada como paga'); recarregar(); }).catch(function (e) { aviso(e.message, 'error'); }).finally(function () { setBusy(false); });
    }
    function exportar() {
      setBusy(true);
      fetchAuth(API_URL + '/comissao/exportar?competencia=' + comp).then(function (r) { if (!r.ok) throw new Error('Falha ao exportar'); return r.blob(); }).then(function (b) {
        var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'comissoes_' + comp + '.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
      }).catch(function (e) { aviso(e.message, 'error'); }).finally(function () { setBusy(false); });
    }
    function salvarImposto() {
      var v = window.prompt('% de imposto sobre a margem (não altera meses já lançados)', String(imposto));
      if (v === null) return; var n = parseMoeda(v); if (!(n >= 0 && n <= 100)) return aviso('Valor inválido', 'error');
      api('/comissao/config', { method: 'PUT', body: JSON.stringify({ imposto_pct: n }) }).then(function (j) { setImposto(j.imposto_pct); aviso('Imposto atualizado'); }).catch(function (e) { aviso(e.message, 'error'); });
    }
    function editarCadastro(c) { setPainel({ tipo: 'cliente', cliente: c }); }

    var st = dados && dados.status ? dados.status.status : 'aberto';
    var aberto = st === 'aberto';
    var ind = dados ? dados.indicadores : null;
    var th = function (t, right, sub, tip, cls) { return h('th', { className: (right ? 'text-right' : 'text-left') + ' whitespace-nowrap ' + (cls || ''), title: tip || '' }, t, sub ? h('div', { className: 'text-[11px] font-normal text-gray-500' }, sub) : null); };
    var tdN = function (v, extra) { return h('td', { className: 'px-3 py-2.5 text-right tabular-nums whitespace-nowrap ' + (extra || '') }, v); };

    function linhasCliente(e) {
      var t = e.totais || {}; var c = e.cliente; var fixo = c.tipo === 'fixo';
      var vis = (e.unidades || []).filter(function (u) { return !u.antes_do_inicio; });
      var multi = vis.length > 1;
      var aberta = !!abertos[c.id];
      var negCls = function (v) { return v < 0 ? 'text-red-800' : ''; };
      var cinza = e.lancado ? '' : 'text-gray-500';
      var comissaoAux = e.encerrado ? 'Fora do período' : e.lancado_parcial ? 'parcial · falta lançar' : !e.lancado ? 'prévia · aguardando lançamento' : (t.saldo_pendente_saida > 0 ? 'Saldo negativo → próximo mês' : (c.comissao_dividida ? fR(t.comissao_por_vendedor) + ' para cada' : c.vendedores));
      var rotulos = vis.map(function (u) { return u.unidade.rotulo; });
      var linhas = [h('tr', { key: 'c' + c.id, className: 'align-top' },
        h('td', { className: 'px-3 py-2.5 min-w-[240px]' },
          h('div', { className: 'flex items-start gap-1.5' },
            multi ? h('button', { type: 'button', className: 'mt-0.5 w-5 h-5 rounded border border-gray-200 text-gray-500 text-[11px] leading-none', 'aria-expanded': aberta, 'aria-label': (aberta ? 'Esconder ' : 'Mostrar ') + (fixo ? 'motoboys' : 'centros'), onClick: function () { setAbertos(function (a) { var n = Object.assign({}, a); n[c.id] = !n[c.id]; return n; }); } }, aberta ? '−' : '+') : null,
            h('div', { className: 'min-w-0' },
              h('button', { className: 'font-bold text-purple-800 hover:underline text-left', onClick: function () { setPainel({ tipo: 'extrato', clienteId: c.id }); } }, c.nome),
              h('div', { className: 'text-[10.5px] text-gray-500 whitespace-nowrap' }, (fixo ? 'Contrato fixo' : 'ID ' + c.cod_cliente + ' · ' + c.incluir_rotulo) + (multi ? '' : ' · início ' + fData(vis[0] ? vis[0].unidade.data_inicio : c.data_inicio))),
              h('div', { className: 'text-[10.5px] text-gray-500 truncate max-w-[260px]', title: rotulos.join(', ') }, fixo ? vis.length + ' motoboy(s)' : (multi ? vis.length + ' centros: ' + rotulos.join(', ') : rotulos[0] || '')))) ),
        h('td', { className: 'px-3 py-2.5 whitespace-nowrap' }, c.vendedores),
        h('td', { className: 'px-3 py-2.5 whitespace-nowrap text-gray-500' }, e.mes_relacao),
        h('td', { className: 'px-3 py-2.5 whitespace-nowrap' }, multi ? h('span', { className: 'text-[11px] text-gray-500' }, 'por ' + (fixo ? 'motoboy' : 'centro')) : tagsPeriodos(vis[0] ? vis[0].periodos : [], c.comissao_dividida)),
        tdN(fixo ? '—' : (e.bi_sem_dados ? h('span', { className: 'text-gray-500 text-[11px]' }, 'Sem dados') : e.entregas_bi)),
        tdN(fR(t.faturamento_bruto), cinza),
        tdN(t.garantido ? '− ' + fR(t.garantido) : '—', 'text-amber-800'),
        tdN(fR(t.faturamento_real), 'font-semibold ' + cinza),
        tdN(h('span', null, fR(t.repasse_entregador), e.saldo_entrada && e.saldo_entrada.valor > 0 ? h('div', { className: 'text-[10px] text-red-800' }, 'inclui ' + fR(e.saldo_entrada.valor) + ' pendente') : null), cinza),
        tdN(fRneg(t.comissao_liquida), negCls(t.comissao_liquida)),
        tdN(fR(t.imposto)),
        tdN(fRneg(t.lucro), negCls(t.lucro)),
        h('td', { className: 'px-3 py-2.5 text-right whitespace-nowrap ' + (e.lancado && !e.encerrado ? 'bg-purple-50/70' : '') },
          h('div', { className: 'tabular-nums text-[14px] ' + (e.lancado && !e.encerrado ? 'font-extrabold text-purple-800' : 'font-semibold text-gray-500 italic') }, e.encerrado ? fR(0) : fR(t.comissao)),
          h('div', { className: 'text-[10.5px] whitespace-nowrap ' + (e.lancado ? 'text-purple-700' : 'text-gray-500') }, comissaoAux)),
        h('td', { className: 'px-3 py-2.5 whitespace-nowrap' }, h('div', { className: 'flex gap-1.5' },
          h('button', { className: 'fin-btn fin-btn-sm ' + (e.lancado || !aberto ? 'fin-btn-s' : 'fin-btn-p'), disabled: !aberto && !e.lancado && !e.lancado_parcial, onClick: function () { setPainel({ tipo: 'lancamento', clienteId: c.id }); } }, aberto ? (e.lancado ? 'Editar' : 'Lançar') : 'Ver'),
          h('button', { className: 'fin-btn fin-btn-s fin-btn-sm', onClick: function () { setPainel({ tipo: 'extrato', clienteId: c.id }); } }, 'Extrato'),
          h('button', { className: 'px-2 py-1.5 rounded-[10px] border border-gray-200 text-gray-500 hover:text-purple-700 hover:border-purple-200', title: 'Editar cadastro', 'aria-label': 'Editar cadastro de ' + c.nome, onClick: function () { editarCadastro(c); } }, Ico('pencil', 'ico', { width: 14, height: 14 })))))];
      if (multi && aberta) {
        vis.forEach(function (u) {
          var tu = u.totais || {};
          linhas.push(h('tr', { key: 'u' + u.unidade.id, className: 'bg-gray-50/70 text-[12px] text-gray-600' },
            h('td', { className: 'px-3 py-2 pl-10' }, h('div', { className: 'font-semibold text-gray-800' }, u.unidade.rotulo), h('div', { className: 'text-[10.5px] text-gray-500' }, 'desde ' + fData(u.unidade.data_inicio) + (u.unidade.data_fim ? ' · saída ' + fData(u.unidade.data_fim) : '') + (u.unidade.regra_propria ? ' · regra própria' : ''))),
            h('td', null), h('td', { className: 'px-3 py-2 whitespace-nowrap' }, u.mes_relacao),
            h('td', { className: 'px-3 py-2 whitespace-nowrap' }, u.encerrado ? h(TagFaixa, { encerrada: true }) : tagsPeriodos(u.periodos, c.comissao_dividida)),
            tdN(fixo ? '—' : u.entregas_bi), tdN(fR(tu.faturamento_bruto)), tdN(tu.garantido ? '− ' + fR(tu.garantido) : '—', 'text-amber-800'), tdN(fR(tu.faturamento_real)), tdN(fR(tu.repasse_entregador)),
            tdN(fRneg(tu.comissao_liquida), negCls(tu.comissao_liquida)), tdN(fR(tu.imposto)), tdN(fRneg(tu.lucro), negCls(tu.lucro)),
            tdN(h('span', null, fR(tu.comissao), h('div', { className: 'text-[10px] text-gray-500' }, u.lancado ? 'lançado' : u.encerrado ? 'fora do período' : 'prévia'))), h('td', null)));
        });
      }
      return linhas;
    }

    // COMISSAO_WIDE_V1: a apuração não cabe no max-w-7xl do Financeiro — usa a largura da tela com 32px de margem.
    return h('div', { className: 'space-y-4', style: { marginLeft: 'calc(50% - 50vw + 32px)', marginRight: 'calc(50% - 50vw + 32px)', maxWidth: 'none' } },
      h('div', { className: 'flex flex-col lg:flex-row lg:items-end gap-3' },
        h('div', { className: 'flex-1' }, h('h1', { className: 'fin-page-t' }, 'Controle de comissões'), h('p', { className: 'fin-page-s' }, 'Valores do BI (Tutts e Hub) ou do contrato fixo; o garantido é descontado do faturamento; faixa e comissão seguem a data de início de cada centro ou motoboy.')),
        h('div', { className: 'flex items-center gap-2 flex-wrap' },
          h('div', { className: 'flex items-center border border-gray-200 rounded-lg bg-white' },
            h('button', { className: 'px-2.5 py-2 text-gray-500 hover:text-purple-700', onClick: function () { setComp(compAdd(comp, -1)); }, 'aria-label': 'Mês anterior' }, '‹'),
            h('input', { type: 'month', value: comp, 'aria-label': 'Competência', onChange: function (e) { if (e.target.value) setComp(e.target.value); }, className: 'px-1 py-1.5 text-sm font-semibold text-gray-900 focus:outline-none' }),
            h('button', { className: 'px-2.5 py-2 text-gray-500 hover:text-purple-700', onClick: function () { setComp(compAdd(comp, 1)); }, 'aria-label': 'Próximo mês' }, '›')),
          window.FinUI && window.FinUI.pilula ? window.FinUI.pilula({ aberto: 'verde', fechado: 'cinza', pago: 'azul' }[st] || 'cinza', st ? st.charAt(0).toUpperCase() + st.slice(1) : '—') : null,
          h('button', { className: btnS, disabled: busy || !dados, onClick: exportar }, 'Exportar fechamento'),
          aberto ? h('button', { className: btnS, disabled: busy || !dados || !dados.pode_fechar, title: dados && !dados.pode_fechar ? 'Só é possível fechar sem lançamentos pendentes' : '', onClick: fecharMes }, 'Fechar mês') : null,
          st === 'fechado' ? h('button', { className: btnS, disabled: busy, onClick: marcarPago }, 'Marcar como pago') : null,
          h('button', { className: btnP, disabled: !aberto, onClick: function () { setPainel({ tipo: 'cliente' }); } }, '+ Novo cliente'))),
      h('div', { className: 'flex items-center gap-3 text-[12px] text-gray-500 flex-wrap' },
        h('button', { className: 'font-semibold text-purple-700 hover:underline', onClick: function () { setPainel({ tipo: 'vendedores' }); } }, 'Vendedores (' + vendedores.length + ')'),
        h('span', null, '·'), h('button', { className: 'font-semibold text-purple-700 hover:underline', onClick: salvarImposto }, 'Imposto: ' + (imposto == null ? '—' : imposto + '%')),
        h('span', null, '·'), h('button', { className: 'font-semibold text-purple-700 hover:underline', onClick: function () { setPainel({ tipo: 'historico' }); } }, 'Histórico da competência'),
        dados && dados.status && dados.status.fechado_em ? h('span', { className: 'ml-auto text-gray-500' }, 'Fechado por ' + dados.status.fechado_por + ' em ' + fDataHora(dados.status.fechado_em) + (dados.status.pago_em ? ' · pago em ' + fDataHora(dados.status.pago_em) : '')) : null),

      h(Erro, { msg: erro && erro !== 'sem permissão' ? erro : null }),
      carregando && !dados ? h('div', { className: 'p-10 text-center text-gray-500 text-sm' }, 'Carregando...') : null,

      ind ? h('div', { className: 'fin-kpis' },
        h(Card, { rotulo: 'Comissão total a pagar', valor: fR(ind.comissao_total), destaque: true, auxiliar: ind.clientes_lancados + ' cliente(s) lançado(s) · ' + fR(ind.garantido_total || 0) + ' de garantido descontado' }),
        h(Card, { rotulo: 'Lançamentos pendentes', valor: String(ind.pendentes), cor: ind.pendentes > 0 ? '#92400e' : '#166534', auxiliar: ind.clientes_lancados + ' de ' + ind.clientes_ativos + ' clientes lançados' }),
        h(Card, { rotulo: 'Saldo negativo levado ao próximo mês', valor: fR(ind.saldo_negativo_total), cor: ind.saldo_negativo_total > 0 ? '#991b1b' : '#111827', auxiliar: ind.saldo_negativo_clientes.length ? ind.saldo_negativo_clientes.map(function (c) { return c.nome; }).join(', ') : 'Nenhum cliente com saldo pendente' }),
        h(Card, { rotulo: 'Mudam de faixa no próximo mês', valor: String(ind.mudam_faixa.length), auxiliar: ind.mudam_faixa.length ? ind.mudam_faixa.slice(0, 3).map(function (m) { var de = m.modo === 'valor' ? fR(m.de_valor) : m.de + '%'; var para = m.encerra ? 'encerra' : (m.modo === 'valor' ? fR(m.para_valor) : m.para + '%'); return m.nome + ': ' + de + ' → ' + para + ' em ' + fDiaMes(m.em); }).join(' · ') : 'Nenhuma mudança prevista' })) : null,

      dados ? h('div', null,
        h('div', { className: 'text-[12px] font-bold text-gray-700 mb-2' }, 'Comissão por vendedor · ' + fComp(comp)),
        dados.por_vendedor.length === 0 ? h('div', { className: 'text-xs text-gray-500' }, 'Nenhum vendedor cadastrado.') :
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3' }, dados.por_vendedor.map(function (v) {
          return h('div', { key: v.id, className: 'bg-white border border-gray-200 rounded-[14px] p-3 flex items-center gap-3' },
            h('div', { className: 'w-9 h-9 rounded-full bg-purple-100 text-purple-800 text-[11px] font-extrabold flex items-center justify-center' }, v.nome.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase()),
            h('div', { className: 'flex-1 min-w-0' }, h('div', { className: 'text-sm font-bold text-gray-900 truncate' }, v.nome), h('div', { className: 'text-[11px] text-gray-500' }, v.clientes + ' cliente(s) em comissão')),
            h('div', { className: 'text-[15px] font-extrabold text-purple-900 tabular-nums' }, fR(v.total)));
        }))) : null,

      dados ? h('div', { className: 'bg-white border border-gray-200 rounded-[14px] overflow-hidden' },
        h('div', { className: 'flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 flex-wrap' },
          h('div', { className: 'text-[13px] font-bold text-gray-900' }, 'Apuração por cliente · ' + fComp(comp)),
          h('div', { className: 'text-[11px] text-gray-500' }, 'Fat. real = bruto − garantido · Margem = fat. real − repasse · Imposto = ' + (imposto == null ? '—' : imposto) + '% da margem · Comissão = lucro × faixa (ou R$/mês da faixa)')),
        dados.clientes.length === 0 ? h('div', { className: 'p-8 text-center text-sm text-gray-500' }, 'Nenhum cliente em comissão nesta competência. Cadastre um cliente com "+ Novo cliente".') :
        h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[12.5px] min-w-[1380px] fin-tbl' },
          h('thead', null, h('tr', null, th('Cliente'), th('Vendedor(es)'), th('Mês da relação'), th('Faixa'), th('Entregas', 1, 'BI'), th('Fat. bruto', 1, 'Tutts + Hub'),
            th('Garantido', 1, 'complemento'), th('Fat. real', 1, 'bruto − garantido'), th('Repasse', 1, 'entregador'),
            th('Margem', 1, 'real − repasse', 'O que sobra para a Tutts depois do garantido e do entregador. Não é a comissão do vendedor.'),
            th('Imposto', 1, '% da margem'), th('Lucro', 1, 'margem − imposto'),
            th('Comissão vendedor', 1, 'lucro × faixa', 'Valor que o vendedor recebe. Dividida = metade para cada.', 'text-purple-800'),
            th('Lançamento'))),
          h('tbody', null, dados.clientes.reduce(function (acc, e) { return acc.concat(linhasCliente(e)); }, []))))) : null,

      painel && painel.tipo === 'cliente' ? h(PainelCliente, { api: api, vendedores: vendedores, cliente: painel.cliente || null, fechar: function () { setPainel(null); }, aoSalvar: function (msg) { setPainel(null); aviso(msg || 'Cadastro salvo'); recarregar(); }, aoExcluir: function () { setPainel(null); aviso('Cadastro excluído'); recarregar(); } }) : null,
      painel && painel.tipo === 'lancamento' ? h(PainelLancamento, { api: api, clienteId: painel.clienteId, competencia: comp, fechar: function () { setPainel(null); }, aoSalvar: function (msg) { setPainel(null); aviso(typeof msg === 'string' ? msg : 'Lançamento salvo'); recarregar(); } }) : null,
      painel && painel.tipo === 'extrato' ? h(PainelExtrato, { api: api, clienteId: painel.clienteId, competencia: comp, mudou: function () { aviso('Meses anteriores lançados'); recarregar(); }, fechar: function () { setPainel(null); }, editar: editarCadastro }) : null,
      painel && painel.tipo === 'vendedores' ? h(PainelVendedores, { api: api, fechar: function () { setPainel(null); }, mudou: function () { api('/comissao/vendedores').then(function (j) { setVendedores(j.vendedores || []); }); } }) : null,
      painel && painel.tipo === 'historico' ? h(PainelHistorico, { api: api, competencia: comp, fechar: function () { setPainel(null); } }) : null
    );
  };
})();
