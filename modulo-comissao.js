/**
 * modulo-comissao.js — COMISSAO_V1
 * ─────────────────────────────────────────────────────────────────────────
 * Aba "Comissão" do módulo Financeiro. Implementa a especificação
 * "Central Tutts · Controle de Comissões" v1.1 (28/09/2026).
 *
 * Blocos: indicadores, comissão por vendedor e apuração por cliente, com
 * seletor de competência. Painéis laterais: Novo cliente, Lançamento,
 * Extrato, Vendedores, Histórico. Modal de configuração (% imposto).
 *
 * Entregas, faturamento bruto e repasse vêm do BI (pré-preenchidos e
 * editáveis no lançamento). Cálculo local espelha o backend
 * (comissao.shared.js) pro "Resultado do mês" responder a cada digitação.
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
  function parseMoeda(s) {
    if (s === null || s === undefined || s === '') return 0;
    if (typeof s === 'number') return s;
    var t = String(s).trim().replace(/[R$\s]/g, '');
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    var n = Number(t); return isFinite(n) ? n : 0;
  }
  function moedaInput(n) { return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // ── Cálculo local (espelho de comissao.shared.js) ───────────────
  function calcularPeriodo(p) {
    var bruto = r2(p.faturamento_bruto), repasse = r2(p.repasse_entregador), saldoIn = r2(p.saldo_pendente_entrada);
    var repasseEfetivo = r2(repasse + saldoIn), liquida = r2(bruto - repasseEfetivo);
    var faixa = Number(p.faixa_pct || 0), impPct = Number(p.imposto_pct || 0);
    var imposto = 0, lucro = liquida, comissao = 0, porV = 0;
    if (liquida > 0) { imposto = r2(liquida * impPct / 100); lucro = r2(liquida - imposto); comissao = r2(lucro * faixa / 100); porV = p.dividida ? r2(comissao / 2) : comissao; }
    return { faturamento_bruto: bruto, repasse_entregador: repasse, saldo_pendente_entrada: saldoIn, repasse_efetivo: repasseEfetivo, comissao_liquida: liquida, imposto: imposto, lucro: lucro, comissao: comissao, comissao_por_vendedor: porV, negativo: liquida < 0 };
  }
  function calcularLancamento(o) {
    var calc = o.periodos.map(function (p, i) { return Object.assign({}, p, calcularPeriodo({ faturamento_bruto: p.faturamento_bruto, repasse_entregador: p.repasse_entregador, saldo_pendente_entrada: i === 0 ? o.saldo_pendente_entrada : 0, faixa_pct: p.faixa_pct, imposto_pct: o.imposto_pct, dividida: o.dividida })); });
    var soma = function (k) { return r2(calc.reduce(function (a, c) { return a + Number(c[k] || 0); }, 0)); };
    var neg = r2(calc.filter(function (c) { return c.negativo; }).reduce(function (a, c) { return a + c.comissao_liquida; }, 0));
    return { periodos: calc, faturamento_bruto: soma('faturamento_bruto'), repasse_entregador: soma('repasse_entregador'), repasse_efetivo: soma('repasse_efetivo'), comissao_liquida: soma('comissao_liquida'), imposto: soma('imposto'), lucro: soma('lucro'), comissao: soma('comissao'), comissao_por_vendedor: soma('comissao_por_vendedor'), saldo_pendente_saida: o.manter_saldo_negativo && neg < 0 ? r2(-neg) : 0, tem_negativo: neg < 0 };
  }

  // ── UI helpers ──────────────────────────────────────────────────
  function Ico(nome, cls, style) { return h('svg', { className: cls || 'ico', style: style || { width: 14, height: 14 }, 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome })); }
  var CORES_FAIXA = { 20: { bg: '#4D0669', fg: '#fff' }, 10: { bg: '#e9d5ff', fg: '#6b21a8' }, 5: { bg: '#ffedd5', fg: '#c2410c' }, 2.5: { bg: '#ffedd5', fg: '#c2410c' }, 0: { bg: '#e5e7eb', fg: '#4b5563' } };
  function TagFaixa(p) {
    var txt = p.encerrada ? 'Encerrada' : (p.pct + '%' + (p.dividida ? ' ÷2' : ''));
    var c = CORES_FAIXA[p.encerrada ? 0 : p.pct] || CORES_FAIXA[0];
    return h('span', { className: 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap', style: { background: c.bg, color: c.fg }, title: p.title || '' }, txt);
  }
  function Card(p) {
    return h('div', { className: p.destaque ? 'rounded-xl p-4 text-white flex flex-col gap-1' : 'bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1', style: p.destaque ? { background: 'linear-gradient(135deg,#7c3aed,#9333ea)' } : null },
      h('div', { className: 'text-[10.5px] font-extrabold uppercase tracking-wider', style: { color: p.destaque ? '#e9d5ff' : '#94a3b8' } }, p.rotulo),
      h('div', { className: 'text-[22px] font-extrabold tabular-nums leading-tight', style: { color: p.destaque ? '#fff' : (p.cor || '#0f172a') } }, p.valor),
      p.auxiliar ? h('div', { className: 'text-[11px]', style: { color: p.destaque ? '#ddd6fe' : '#94a3b8' } }, p.auxiliar) : null
    );
  }
  var caixa = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300';
  var rotulo = 'block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1';
  var btnP = 'px-4 py-2 rounded-lg text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50';
  var btnS = 'px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50';
  var btnL = 'px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50';
  function Lateral(p) {
    return h('div', { className: 'fixed inset-0 z-50 flex justify-end' },
      h('div', { className: 'absolute inset-0 bg-black/30', onClick: p.fechar, 'aria-hidden': 'true' }),
      h('div', { className: 'relative bg-white w-full h-full overflow-y-auto shadow-2xl flex flex-col', style: { maxWidth: p.largura || 560 }, role: 'dialog', 'aria-label': p.titulo },
        h('div', { className: 'sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-start gap-3 z-10' },
          h('div', { className: 'flex-1 min-w-0' },
            h('div', { className: 'text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400' }, p.sobretitulo || ''),
            h('h2', { className: 'text-xl font-extrabold text-purple-900 truncate' }, p.titulo)),
          h('button', { type: 'button', onClick: p.fechar, 'aria-label': 'Fechar', className: 'w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50' }, '×')),
        h('div', { className: 'flex-1 px-5 py-4 flex flex-col gap-4' }, p.children),
        p.rodape ? h('div', { className: 'sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex justify-end gap-2' }, p.rodape) : null
      ));
  }

  // ═══════════════════ PAINEL: NOVO / EDITAR CLIENTE (item 4) ═══════════════════
  function PainelCliente(p) {
    var api = p.api, edit = p.cliente || null;
    var _b = useState(''), busca = _b[0], setBusca = _b[1];
    var _op = useState([]), opcoes = _op[0], setOpcoes = _op[1];
    var _f = useState({ cod_cliente: edit ? edit.cod_cliente : '', nome_cliente: edit ? edit.nome_cliente : '', nome_exibicao: edit ? (edit.nome_exibicao || edit.nome_cliente || '') : '', centros_custo: edit ? (edit.centros_custo || []) : [], modo_cc: edit && edit.centros_custo && edit.centros_custo.length ? 'especificos' : 'todos', data_inicio: edit ? edit.data_inicio : '', vendedor_1_id: edit ? edit.vendedor_1_id : '', vendedor_2_id: edit ? (edit.vendedor_2_id || '') : '', comissao_dividida: edit ? !!edit.comissao_dividida : false, ativo: edit ? edit.ativo !== false : true });
    var form = _f[0], setForm = _f[1];
    // COMISSAO_CC_V1: centros de custo da loja (mesma consulta do Portais Cliente)
    var _cc = useState(null), ccInfo = _cc[0], setCcInfo = _cc[1];
    useEffect(function () {
      if (!form.cod_cliente) { setCcInfo(null); return; }
      api('/comissao/clientes-central/' + form.cod_cliente + '/centros' + (edit ? '?ignorar_id=' + edit.id : '')).then(function (j) {
        setCcInfo(j);
        setForm(function (f) { return f.nome_exibicao ? f : Object.assign({}, f, { nome_exibicao: j.mascara || f.nome_cliente || '' }); });
      }).catch(function () { setCcInfo({ centros: [], mascara: '' }); });
    }, [form.cod_cliente, api, edit]);
    function alternarCc(nome) { setForm(function (f) { var s = f.centros_custo.slice(); var i = s.indexOf(nome); if (i >= 0) s.splice(i, 1); else s.push(nome); return Object.assign({}, f, { centros_custo: s }); }); }
    var _pv = useState(null), previa = _pv[0], setPrevia = _pv[1];
    var _sv = useState(false), salvando = _sv[0], setSalvando = _sv[1];
    var _er = useState(null), erro = _er[0], setErro = _er[1];
    var vendedores = p.vendedores || [];
    var set = function (k, v) { setForm(function (f) { var n = Object.assign({}, f); n[k] = v; return n; }); };

    useEffect(function () {
      if (edit) return;
      var t = setTimeout(function () {
        api('/comissao/clientes-central?busca=' + encodeURIComponent(busca)).then(function (j) { setOpcoes(j.clientes || []); }).catch(function () {});
      }, 250);
      return function () { clearTimeout(t); };
    }, [busca, api, edit]);

    useEffect(function () {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.data_inicio)) { setPrevia(null); return; }
      api('/comissao/faixas-preview?data_inicio=' + form.data_inicio + '&dividida=' + (form.comissao_dividida ? 1 : 0)).then(setPrevia).catch(function () { setPrevia(null); });
    }, [form.data_inicio, form.comissao_dividida, api]);

    function salvar() {
      setErro(null);
      if (!form.cod_cliente) return setErro('Selecione o cliente');
      if (!form.data_inicio) return setErro('Informe a data de início');
      if (!form.vendedor_1_id) return setErro('Selecione o vendedor responsável');
      if (form.comissao_dividida && !form.vendedor_2_id) return setErro('Selecione o segundo vendedor');
      if (form.comissao_dividida && String(form.vendedor_2_id) === String(form.vendedor_1_id)) return setErro('O segundo vendedor não pode ser o mesmo do primeiro');
      if (form.modo_cc === 'especificos' && !form.centros_custo.length) return setErro('Selecione pelo menos um centro de custo (ou marque "Todos")');
      setSalvando(true);
      var body = { cod_cliente: Number(form.cod_cliente), nome_cliente: form.nome_cliente, nome_exibicao: form.nome_exibicao, centros_custo: form.modo_cc === 'especificos' ? form.centros_custo : [], data_inicio: form.data_inicio, vendedor_1_id: Number(form.vendedor_1_id), vendedor_2_id: form.comissao_dividida ? Number(form.vendedor_2_id) : null, comissao_dividida: !!form.comissao_dividida, ativo: !!form.ativo };
      api(edit ? '/comissao/clientes/' + edit.id : '/comissao/clientes', { method: edit ? 'PUT' : 'POST', body: JSON.stringify(body) })
        .then(function () { p.aoSalvar(); }).catch(function (e) { setErro(e.message); }).finally(function () { setSalvando(false); });
    }

    // COMISSAO_DEL_V1: excluir cadastro (cadastrou errado)
    function excluir() {
      if (!window.confirm('Excluir o cadastro de "' + (form.nome_exibicao || form.nome_cliente) + '"?\n\nOs lançamentos deste cliente em competências ABERTAS também serão apagados. Esta ação não pode ser desfeita.')) return;
      setSalvando(true); setErro(null);
      api('/comissao/clientes/' + edit.id, { method: 'DELETE' }).then(function () { p.aoExcluir(); }).catch(function (e) { setErro(e.message); }).finally(function () { setSalvando(false); });
    }
    var botoesVend = function (campo, excluir) {
      return h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' }, vendedores.filter(function (v) { return v.ativo && String(v.id) !== String(excluir); }).map(function (v) {
        var sel = String(form[campo]) === String(v.id);
        return h('button', { key: v.id, type: 'button', onClick: function () { set(campo, v.id); }, className: 'px-3 py-2 rounded-lg text-[13px] font-semibold border ' + (sel ? 'bg-purple-800 text-white border-purple-800' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300') }, v.nome);
      }));
    };

    return h(Lateral, { titulo: edit ? 'Editar cliente em comissão' : 'Novo cliente em comissão', sobretitulo: 'Cadastro', fechar: p.fechar,
      rodape: [edit ? h('button', { key: 'x', className: 'mr-auto px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50', disabled: salvando, onClick: excluir }, 'Excluir cadastro') : null, h('button', { key: 'c', className: btnS, onClick: p.fechar }, 'Cancelar'), h('button', { key: 's', className: btnP, disabled: salvando, onClick: salvar }, salvando ? 'Salvando...' : 'Salvar cliente')] },
      erro ? h('div', { className: 'bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12.5px] text-red-700' }, erro) : null,
      h('div', null, h('label', { className: rotulo }, 'Cliente'),
        edit ? h('div', { className: 'px-3 py-2 border border-gray-100 bg-gray-50 rounded-lg text-sm' }, form.nome_cliente, h('span', { className: 'text-gray-400 text-xs ml-2' }, 'ID ' + form.cod_cliente))
        : h('div', null,
            form.cod_cliente ? h('div', { className: 'flex items-center gap-2 px-3 py-2 border border-purple-200 bg-purple-50 rounded-lg text-sm' },
              h('span', { className: 'font-semibold flex-1' }, form.nome_cliente), h('span', { className: 'text-gray-400 text-xs' }, 'ID ' + form.cod_cliente),
              h('button', { type: 'button', className: 'text-xs text-purple-700 font-semibold', onClick: function () { set('cod_cliente', ''); set('nome_cliente', ''); } }, 'trocar'))
            : h('div', null,
                h('input', { className: caixa, placeholder: 'Buscar por nome ou ID no cadastro da Central', value: busca, onChange: function (e) { setBusca(e.target.value); } }),
                h('div', { className: 'mt-1 max-h-56 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100' }, opcoes.slice(0, 60).map(function (c) {
                  return h('button', { key: c.cod_cliente, type: 'button', disabled: c.ja_em_comissao, onClick: function () { set('cod_cliente', c.cod_cliente); set('nome_cliente', c.nome); set('nome_exibicao', ''); set('centros_custo', []); set('modo_cc', 'todos'); },
                    className: 'w-full text-left px-3 py-2 text-[13px] hover:bg-purple-50 disabled:opacity-40 flex items-center gap-2' },
                    h('span', { className: 'flex-1 truncate' }, c.nome), h('span', { className: 'text-gray-400 text-xs' }, 'ID ' + c.cod_cliente),
                    c.ja_em_comissao ? h('span', { className: 'text-[10px] text-amber-700 font-bold' }, 'JÁ EM COMISSÃO (TODOS OS CC)') : (c.tem_cadastro ? h('span', { className: 'text-[10px] text-purple-700 font-bold', title: c.centros_em_comissao.join(', ') }, c.centros_em_comissao.length + ' CC EM COMISSÃO') : null));
                }), opcoes.length === 0 ? h('div', { className: 'px-3 py-3 text-xs text-gray-400' }, 'Nenhum cliente encontrado') : null)))),
      form.cod_cliente ? h('div', { className: 'space-y-3' },
        h('div', null, h('label', { className: rotulo }, 'Nome de exibição'),
          h('input', { className: caixa, value: form.nome_exibicao, placeholder: form.nome_cliente, onChange: function (e) { set('nome_exibicao', e.target.value); } }),
          h('p', { className: 'text-[11px] text-gray-400 mt-1' }, 'Padrão: máscara do BI (' + ((ccInfo && ccInfo.mascara) || form.nome_cliente || '—') + '). Use pra identificar a loja/CC, ex.: "Varejão — Tancredo Neves".')),
        h('div', null, h('label', { className: rotulo }, 'Centros de custo que entram na comissão'),
          h('div', { className: 'flex gap-2 mb-2' }, [['todos', 'Todos os centros'], ['especificos', 'Centros específicos']].map(function (o) {
            var sel = form.modo_cc === o[0]; var bloq = o[0] === 'todos' && ccInfo && ccInfo.todos_ocupado_por;
            return h('button', { key: o[0], type: 'button', disabled: !!bloq, title: bloq ? 'Já existe cadastro com todos os centros: ' + bloq : '', onClick: function () { set('modo_cc', o[0]); }, className: 'px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border disabled:opacity-40 ' + (sel ? 'bg-purple-800 text-white border-purple-800' : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300') }, o[1]);
          })),
          form.modo_cc === 'especificos' ? (!ccInfo ? h('div', { className: 'text-xs text-gray-400' }, 'Carregando centros...') : ccInfo.centros.length === 0 ? h('div', { className: 'text-xs text-amber-700' }, 'O BI não tem centro de custo para esta loja.') :
            h('div', { className: 'max-h-52 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100' }, ccInfo.centros.map(function (c) {
              var sel = form.centros_custo.indexOf(c.centro_custo) >= 0; var ocup = c.ocupado_por;
              return h('label', { key: c.centro_custo, className: 'flex items-center gap-2 px-3 py-1.5 text-[12.5px] ' + (ocup ? 'opacity-50' : 'cursor-pointer hover:bg-purple-50') },
                h('input', { type: 'checkbox', className: 'accent-purple-700', checked: sel, disabled: !!ocup, onChange: function () { alternarCc(c.centro_custo); } }),
                h('span', { className: 'flex-1 truncate font-medium' }, c.centro_custo),
                h('span', { className: 'text-[10.5px] text-gray-400 whitespace-nowrap' }, c.entregas_30d + ' entregas/30d'),
                ocup ? h('span', { className: 'text-[10px] text-amber-700 font-bold whitespace-nowrap', title: 'Em comissão no cadastro ' + ocup }, 'EM OUTRO CADASTRO') : null);
            })))
          : h('p', { className: 'text-[11px] text-gray-400' }, 'Entregas, faturamento e repasse de toda a loja (todos os centros de custo do BI).'))) : null,
      h('div', null, h('label', { className: rotulo }, 'Data de início do cliente'),
        h('input', { type: 'date', className: caixa, value: form.data_inicio, onChange: function (e) { set('data_inicio', e.target.value); } }),
        h('p', { className: 'text-[11px] text-gray-400 mt-1' }, 'As faixas contam a partir desta data exata (pode ser no meio do mês). O que for faturado antes não gera comissão.')),
      h('div', null, h('label', { className: rotulo }, 'Vendedor responsável'), vendedores.length ? botoesVend('vendedor_1_id', null) : h('p', { className: 'text-xs text-amber-700' }, 'Cadastre vendedores primeiro (botão "Vendedores").')),
      h('label', { className: 'flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer' },
        h('input', { type: 'checkbox', className: 'mt-1 accent-purple-700', checked: form.comissao_dividida, onChange: function (e) { set('comissao_dividida', e.target.checked); if (!e.target.checked) set('vendedor_2_id', ''); } }),
        h('div', null, h('div', { className: 'text-sm font-semibold text-gray-800' }, 'Dividir comissão'), h('div', { className: 'text-[11.5px] text-gray-500' }, 'Cada vendedor recebe metade do % de cada período. O total do cliente não muda.'))),
      form.comissao_dividida ? h('div', null, h('label', { className: rotulo }, 'Segundo vendedor'), botoesVend('vendedor_2_id', form.vendedor_1_id)) : null,
      previa ? h('div', { className: 'rounded-xl p-3 bg-purple-50 border border-purple-100' },
        h('div', { className: 'text-[11px] font-extrabold uppercase tracking-wider text-purple-800 mb-2' }, 'Faixas calculadas'),
        previa.faixas.map(function (f, i) { return h('div', { key: i, className: 'flex items-center justify-between text-[12.5px] py-1' }, h('span', null, h('b', null, f.pct + '%' + (form.comissao_dividida ? ' para cada vendedor' : ' do lucro')), h('span', { className: 'text-gray-500' }, ' · ' + f.rotulo)), h('span', { className: 'text-gray-600 tabular-nums' }, fData(f.inicio) + ' a ' + fData(f.fim))); }),
        h('div', { className: 'text-[11.5px] text-gray-500 mt-1 border-t border-purple-100 pt-1.5' }, 'A partir de ' + fData(previa.saida) + ' o cliente sai do período de comissão.')) : null,
      edit ? h('label', { className: 'flex items-center gap-2 text-sm' }, h('input', { type: 'checkbox', className: 'accent-purple-700', checked: form.ativo, onChange: function (e) { set('ativo', e.target.checked); } }), 'Cadastro ativo') : null
    );
  }

  // ═══════════════════ PAINEL: LANÇAMENTO (item 5) ═══════════════════
  function PainelLancamento(p) {
    var api = p.api;
    var _d = useState(null), dados = _d[0], setDados = _d[1];
    var _v = useState([]), vals = _v[0], setVals = _v[1]; // [{faturamento_bruto:'', repasse_entregador:''}]
    var _m = useState(false), manter = _m[0], setManter = _m[1];
    var _sv = useState(false), salvando = _sv[0], setSalvando = _sv[1];
    var _er = useState(null), erro = _er[0], setErro = _er[1];

    useEffect(function () {
      api('/comissao/lancamento?cliente_id=' + p.clienteId + '&competencia=' + p.competencia).then(function (j) {
        setDados(j);
        setVals(j.periodos.map(function (per) { var l = per.lancamento; return { faturamento_bruto: moedaInput(l ? l.faturamento_bruto : per.bi.bruto), repasse_entregador: moedaInput(l ? l.repasse_entregador : per.bi.repasse), origem_bruto: l ? 'lancado' : 'bi', origem_repasse: l ? 'lancado' : 'bi' }; }));
        setManter(!!j.manter_saldo_negativo);
      }).catch(function (e) { setErro(e.message); });
    }, [p.clienteId, p.competencia, api]);

    var soLeitura = dados && dados.status && dados.status.status !== 'aberto';
    var calc = useMemo(function () {
      if (!dados) return null;
      return calcularLancamento({ periodos: dados.periodos.map(function (per, i) { return { faixa_pct: per.faixa_pct, faturamento_bruto: parseMoeda(vals[i] && vals[i].faturamento_bruto), repasse_entregador: parseMoeda(vals[i] && vals[i].repasse_entregador) }; }), imposto_pct: dados.imposto_pct, dividida: dados.cliente.comissao_dividida, saldo_pendente_entrada: dados.saldo_entrada.valor, manter_saldo_negativo: manter });
    }, [dados, vals, manter]);

    function setVal(i, k, v) { setVals(function (a) { var n = a.slice(); n[i] = Object.assign({}, n[i]); n[i][k] = v; n[i]['origem_' + (k === 'faturamento_bruto' ? 'bruto' : 'repasse')] = 'manual'; return n; }); }
    function restaurarBi(i) { setVals(function (a) { var n = a.slice(); n[i] = { faturamento_bruto: moedaInput(dados.periodos[i].bi.bruto), repasse_entregador: moedaInput(dados.periodos[i].bi.repasse), origem_bruto: 'bi', origem_repasse: 'bi' }; return n; }); }
    function excluirLanc() {
      if (!window.confirm('Remover o lançamento de ' + fComp(p.competencia) + ' deste cliente?\n\nO cliente volta a "Aguardando lançamento" e os meses seguintes são recalculados.')) return;
      setErro(null); setSalvando(true);
      api('/comissao/lancamento?cliente_id=' + p.clienteId + '&competencia=' + p.competencia, { method: 'DELETE' }).then(function () { p.aoSalvar('Lançamento removido'); }).catch(function (e) { setErro(e.message); }).finally(function () { setSalvando(false); });
    }
    function salvar() {
      setErro(null); setSalvando(true);
      api('/comissao/lancamento', { method: 'POST', body: JSON.stringify({ cliente_id: p.clienteId, competencia: p.competencia, manter_saldo_negativo: manter, periodos: dados.periodos.map(function (per, i) { return { inicio: per.inicio, faturamento_bruto: parseMoeda(vals[i].faturamento_bruto), repasse_entregador: parseMoeda(vals[i].repasse_entregador) }; }) }) })
        .then(function () { p.aoSalvar(); }).catch(function (e) { setErro(e.message); }).finally(function () { setSalvando(false); });
    }

    var linha = function (rot, val, cls, neg) { return h('div', { className: 'flex items-center justify-between text-[12.5px] py-0.5' }, h('span', { className: 'text-gray-500' }, rot), h('span', { className: 'tabular-nums font-semibold ' + (neg ? 'text-red-600' : (cls || 'text-gray-800')) }, val)); };

    return h(Lateral, { titulo: dados ? dados.cliente.nome : 'Carregando...', sobretitulo: 'Lançamento · ' + fComp(p.competencia), fechar: p.fechar,
      rodape: [dados && dados.lancado && !soLeitura ? h('button', { key: 'x', className: 'mr-auto px-4 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50', disabled: salvando, onClick: excluirLanc }, 'Remover lançamento') : null, h('button', { key: 'c', className: btnS, onClick: p.fechar }, soLeitura ? 'Fechar' : 'Cancelar'), !soLeitura ? h('button', { key: 's', className: btnP, disabled: salvando || !dados, onClick: salvar }, salvando ? 'Salvando...' : 'Salvar lançamento') : null] },
      erro ? h('div', { className: 'bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12.5px] text-red-700' }, erro) : null,
      !dados ? h('div', { className: 'p-10 text-center text-gray-400 text-sm' }, 'Carregando...') : [
        soLeitura ? h('div', { key: 'ro', className: 'bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12.5px] text-gray-600' }, 'Competência ' + dados.status.status + ' — somente leitura.') : null,
        h('div', { key: 'bi', className: 'rounded-xl p-3 bg-purple-50 border border-purple-100 flex items-center justify-between' },
          h('div', null, h('div', { className: 'text-[10.5px] font-extrabold uppercase tracking-wider text-purple-700' }, 'Qtd. entregas no mês'), h('div', { className: 'text-xl font-extrabold text-purple-900' }, dados.bi_sem_dados ? 'Sem dados no BI' : (dados.entregas_bi + ' entregas'))),
          h('span', { className: 'px-2 py-0.5 rounded-full bg-purple-800 text-white text-[10.5px] font-bold' }, 'Puxado do BI')),
        dados.periodos.length > 1 ? h('div', { key: 'av', className: 'bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12.5px] text-amber-800' }, 'O cliente muda de faixa neste mês. Lance os valores separados por período.') : null,
        dados.saldo_entrada.valor > 0 ? h('div', { key: 'sn', className: 'bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12.5px] text-red-700' }, h('b', null, fR(dados.saldo_entrada.valor) + ' de saldo negativo pendente'), ' de ' + fComp(dados.saldo_entrada.origem) + ' será somado ao repasse do entregador neste mês.') : null,
        dados.periodos.map(function (per, i) {
          var v = vals[i] || {};
          return h('div', { key: i, className: 'border border-gray-200 rounded-xl p-3 space-y-2' },
            h('div', { className: 'flex items-center justify-between' },
              h('div', { className: 'text-[13px] font-bold text-gray-800' }, fDiaMes(per.inicio) + ' a ' + fDiaMes(per.fim)),
              h('div', { className: 'flex items-center gap-2' }, per.bi.tem_dados ? h('span', { className: 'text-[10.5px] text-gray-400' }, per.bi.entregas + ' entregas') : null, h(TagFaixa, { pct: per.faixa_pct, encerrada: per.encerrada, dividida: dados.cliente.comissao_dividida, title: per.faixa_rotulo }))),
            h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', null, h('label', { className: rotulo }, 'Faturamento bruto (R$)'),
                h('input', { className: caixa + ' text-right tabular-nums', disabled: soLeitura, value: v.faturamento_bruto || '', onChange: function (e) { setVal(i, 'faturamento_bruto', e.target.value); }, onBlur: function (e) { setVal(i, 'faturamento_bruto', moedaInput(parseMoeda(e.target.value))); } }),
                h('div', { className: 'text-[10.5px] mt-0.5 ' + (v.origem_bruto === 'bi' ? 'text-purple-700' : 'text-gray-400') }, v.origem_bruto === 'bi' ? 'Puxado do BI' : (v.origem_bruto === 'lancado' ? 'Lançado' : 'Ajustado manualmente') + (per.bi.tem_dados ? ' · BI: ' + fR(per.bi.bruto) : ''))),
              h('div', null, h('label', { className: rotulo }, 'Repasse entregador (R$)'),
                h('input', { className: caixa + ' text-right tabular-nums', disabled: soLeitura, value: v.repasse_entregador || '', onChange: function (e) { setVal(i, 'repasse_entregador', e.target.value); }, onBlur: function (e) { setVal(i, 'repasse_entregador', moedaInput(parseMoeda(e.target.value))); } }),
                h('div', { className: 'text-[10.5px] mt-0.5 ' + (v.origem_repasse === 'bi' ? 'text-purple-700' : 'text-gray-400') }, v.origem_repasse === 'bi' ? 'Puxado do BI' : (v.origem_repasse === 'lancado' ? 'Lançado' : 'Ajustado manualmente') + (per.bi.tem_dados ? ' · BI: ' + fR(per.bi.repasse) : '')))),
            !soLeitura && per.bi.tem_dados && (v.origem_bruto !== 'bi' || v.origem_repasse !== 'bi') ? h('button', { type: 'button', className: 'text-[11.5px] text-purple-700 font-semibold', onClick: function () { restaurarBi(i); } }, '↺ Restaurar valores do BI') : null
          );
        }),
        calc ? h('div', { key: 'res', className: 'rounded-xl p-3 bg-purple-50 border border-purple-100' },
          h('div', { className: 'text-[11px] font-extrabold uppercase tracking-wider text-purple-800 mb-1' }, 'Resultado do mês'),
          linha('Comissão líquida (bruto − repasse' + (dados.saldo_entrada.valor > 0 ? ' − saldo' : '') + ')', fRneg(calc.comissao_liquida), null, calc.comissao_liquida < 0),
          linha('Imposto (' + dados.imposto_pct + '%)', fR(calc.imposto)),
          linha('Lucro', fRneg(calc.lucro), null, calc.lucro < 0),
          linha('Comissão do mês', fR(calc.comissao), 'text-purple-900 text-[14px]'),
          dados.cliente.comissao_dividida ? linha('Para cada vendedor', fR(calc.comissao_por_vendedor), 'text-purple-900') : linha('Vendedor', dados.cliente.vendedores)) : null,
        h('label', { key: 'ck', className: 'flex items-start gap-3 p-3 border rounded-xl cursor-pointer ' + (calc && calc.tem_negativo ? 'border-red-300 bg-red-50' : 'border-gray-200') },
          h('input', { type: 'checkbox', className: 'mt-1 accent-purple-700', disabled: soLeitura, checked: manter, onChange: function (e) { setManter(e.target.checked); } }),
          h('div', null, h('div', { className: 'text-sm font-semibold text-gray-800' }, 'Manter saldo negativo pendente'),
            h('div', { className: 'text-[11.5px] text-gray-500' }, 'Se a comissão líquida do mês ficar negativa, o valor é somado ao repasse do entregador no mês seguinte.'),
            calc && calc.tem_negativo && manter ? h('div', { className: 'text-[11.5px] text-red-700 font-semibold mt-1' }, fR(calc.saldo_pendente_saida) + ' será somado ao repasse de ' + fComp(compAdd(p.competencia, 1))) : null)),
        dados.lancado ? h('div', { key: 'lp', className: 'text-[11px] text-gray-400' }, 'Lançado por ' + (dados.lancado_por || '—') + (dados.lancado_em ? ' em ' + fDataHora(dados.lancado_em) : '')) : null
      ]
    );
  }

  // ═══════════════════ PAINEL: EXTRATO (item 7) ═══════════════════
  function PainelExtrato(p) {
    var api = p.api;
    var _d = useState(null), d = _d[0], setD = _d[1];
    var _ab = useState('extrato'), aba = _ab[0], setAba = _ab[1];
    var _er = useState(null), erro = _er[0], setErro = _er[1];
    useEffect(function () { api('/comissao/extrato/' + p.clienteId + '?competencia=' + p.competencia).then(setD).catch(function (e) { setErro(e.message); }); }, [p.clienteId, p.competencia, api]);
    var th = function (t, right) { return h('th', { className: (right ? 'text-right' : 'text-left') + ' px-2 py-2 text-[10px] font-extrabold uppercase tracking-wide' }, t); };
    var td = function (t, cls) { return h('td', { className: 'px-2 py-1.5 tabular-nums whitespace-nowrap ' + (cls || '') }, t); };
    return h(Lateral, { titulo: d ? d.cliente.nome : 'Carregando...', sobretitulo: 'Extrato de comissão · ID ' + (d ? d.cliente.cod_cliente : ''), fechar: p.fechar, largura: 860,
      rodape: [h('button', { key: 'e', className: btnS, onClick: function () { p.editar(d.cliente); } }, 'Editar cadastro'), h('button', { key: 'c', className: btnP, onClick: p.fechar }, 'Fechar')] },
      erro ? h('div', { className: 'bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12.5px] text-red-700' }, erro) : null,
      !d ? h('div', { className: 'p-10 text-center text-gray-400 text-sm' }, 'Carregando...') : [
        h('div', { key: 'r', className: 'grid grid-cols-2 lg:grid-cols-4 gap-3' },
          [['Vendedor(es)', d.cliente.vendedores], ['Data de início', fData(d.cliente.data_inicio)], ['Comissão dividida', d.cliente.comissao_dividida ? 'Sim' : 'Não'], ['Centros de custo', d.cliente.centros_custo && d.cliente.centros_custo.length ? d.cliente.centros_custo.join(', ') : 'Todos']].map(function (x, i) {
            return h('div', { key: i, className: 'bg-gray-50 rounded-xl p-3' }, h('div', { className: 'text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400' }, x[0]), h('div', { className: 'text-sm font-bold text-gray-800' }, x[1]));
          })),
        h('div', { key: 'tabs', className: 'flex gap-1 border-b border-gray-200' }, [['extrato', 'Extrato'], ['historico', 'Histórico (' + d.historico.length + ')']].map(function (t) {
          return h('button', { key: t[0], type: 'button', onClick: function () { setAba(t[0]); }, className: 'px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px ' + (aba === t[0] ? 'border-purple-700 text-purple-800' : 'border-transparent text-gray-500') }, t[1]);
        })),
        aba === 'extrato' ? h('div', { key: 'ex', className: 'space-y-4' },
          h('div', null,
            h('div', { className: 'text-[12px] font-bold text-gray-700 mb-2' }, 'Linha do tempo das faixas (12 meses a partir do início)'),
            h('div', { className: 'grid gap-1', style: { gridTemplateColumns: 'repeat(12, minmax(0,1fr))' } }, d.timeline.map(function (b, i) {
              var c = CORES_FAIXA[b.pct_cheio] || CORES_FAIXA[0];
              return h('div', { key: i, className: 'rounded-lg text-center py-1.5 leading-tight', style: { background: c.bg, color: c.fg, outline: b.na_competencia ? '2px solid #F67602' : 'none', outlineOffset: -1 }, title: fData(b.inicio) + ' a ' + fData(b.fim) },
                h('div', { className: 'text-[10px] font-bold' }, fDiaMes(b.inicio)), h('div', { className: 'text-[11px] font-extrabold' }, b.pct + '%'));
            })),
            h('div', { className: 'text-[10.5px] text-gray-400 mt-1' }, 'Cada bloco começa na data indicada. Contorno laranja = períodos dentro da competência selecionada. Saída em ' + fData(d.cliente.saida) + '.')),
          h('div', { className: 'overflow-x-auto border border-gray-200 rounded-xl' },
            h('table', { className: 'w-full text-[12px]' },
              h('thead', { className: 'bg-purple-900 text-white' }, h('tr', null, th('Mês'), th('Entregas', 1), th('Fat. bruto', 1), th('Repasse', 1), th('Com. líq.', 1), th('Imposto', 1), th('Lucro', 1), th('Faixa'), th('Comissão', 1))),
              h('tbody', null, d.meses.map(function (m) {
                return h('tr', { key: m.competencia, className: (m.selecionada ? 'bg-orange-50 ' : '') + 'border-t border-gray-100 ' + (m.previa ? 'text-gray-400 italic' : '') , title: m.previa ? 'Sem lançamento (prévia com dados do BI)' : '' },
                  td(fComp3(m.competencia), 'font-bold ' + (m.previa ? '' : 'text-gray-800')), td(m.bi_sem_dados ? '—' : m.entregas, 'text-right'), td(fR(m.faturamento_bruto), 'text-right'),
                  td(h('span', null, fR(m.repasse_entregador), m.saldo_entrada > 0 ? h('span', { className: 'block text-[10px] text-red-600 not-italic' }, '+ ' + fR(m.saldo_entrada) + ' pendente') : null), 'text-right'),
                  td(fRneg(m.comissao_liquida), 'text-right ' + (m.comissao_liquida < 0 ? 'text-red-600' : '')), td(fR(m.imposto), 'text-right'), td(fRneg(m.lucro), 'text-right ' + (m.lucro < 0 ? 'text-red-600' : '')),
                  td(m.faixa_rotulo), td(m.previa ? (m.encerrado ? 'Fora do período' : 'Aguardando') : fR(m.comissao), 'text-right font-bold ' + (m.previa ? '' : 'text-purple-900')));
              }), h('tr', { className: 'bg-purple-50 border-t-2 border-purple-200 font-extrabold text-gray-900' },
                td('Total'), td(d.total.entregas, 'text-right'), td(fR(d.total.faturamento_bruto), 'text-right'), td(fR(d.total.repasse_entregador), 'text-right'), td(fR(d.total.comissao_liquida), 'text-right'), td(fR(d.total.imposto), 'text-right'), td(fR(d.total.lucro), 'text-right'), td(''), td(fR(d.total.comissao), 'text-right text-purple-900'))))),
          h('div', { className: 'text-[10.5px] text-gray-400' }, 'Linhas em cinza itálico são prévias (mês sem lançamento, valores do BI). O total soma só os meses lançados.'))
        : h('div', { key: 'hi', className: 'divide-y divide-gray-100 border border-gray-200 rounded-xl' }, d.historico.length === 0 ? h('div', { className: 'p-4 text-xs text-gray-400' }, 'Sem registros.') : d.historico.map(function (l) {
            return h('div', { key: l.id, className: 'px-3 py-2 text-[12px]' },
              h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-bold uppercase text-gray-600' }, l.acao), h('span', { className: 'font-semibold text-gray-800' }, l.entidade + (l.competencia ? ' · ' + fComp3(l.competencia) : '')), l.campo ? h('span', { className: 'text-gray-500' }, '· ' + l.campo) : null, h('span', { className: 'ml-auto text-gray-400 text-[11px]' }, fDataHora(l.criado_em) + ' · ' + (l.usuario || ''))),
              (l.valor_anterior != null || l.valor_novo != null) ? h('div', { className: 'text-gray-500 mt-0.5 break-all' }, l.valor_anterior != null ? h('span', { className: 'line-through mr-2' }, String(l.valor_anterior)) : null, l.valor_novo != null ? h('span', { className: 'text-gray-800' }, String(l.valor_novo)) : null) : null);
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
      erro ? h('div', { className: 'bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12.5px] text-red-700' }, erro) : null,
      h('div', { className: 'border border-gray-200 rounded-xl p-3 space-y-2' },
        h('div', { className: 'text-[11px] font-extrabold uppercase tracking-wider text-gray-500' }, 'Novo vendedor'),
        h('input', { className: caixa, placeholder: 'Nome', value: novo.nome, onChange: function (e) { setNovo(Object.assign({}, novo, { nome: e.target.value })); } }),
        h('select', { className: caixa, value: novo.user_cod, onChange: function (e) { setNovo(Object.assign({}, novo, { user_cod: e.target.value })); } }, h('option', { value: '' }, 'Vincular a um usuário da Central (opcional)'), usuarios.map(function (u) { return h('option', { key: u.cod_profissional, value: u.cod_profissional }, u.full_name + ' (' + u.cod_profissional + ')'); })),
        h('button', { className: btnP, disabled: novo.nome.trim().length < 2, onClick: criar }, 'Adicionar')),
      h('div', { className: 'divide-y divide-gray-100 border border-gray-200 rounded-xl' }, lista.map(function (v) {
        return h('div', { key: v.id, className: 'flex items-center gap-3 px-3 py-2' },
          h('div', { className: 'w-8 h-8 rounded-full bg-purple-100 text-purple-800 text-[11px] font-extrabold flex items-center justify-center' }, v.nome.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase()),
          h('div', { className: 'flex-1 min-w-0' }, h('div', { className: 'text-sm font-semibold ' + (v.ativo ? 'text-gray-800' : 'text-gray-400 line-through') }, v.nome), h('div', { className: 'text-[11px] text-gray-400' }, (v.clientes || 0) + ' cliente(s) em comissão' + (v.user_cod ? ' · usuário ' + v.user_cod : ''))),
          h('button', { className: 'text-[11.5px] text-purple-700 font-semibold', onClick: function () { renomear(v); } }, 'Renomear'),
          h('button', { className: 'text-[11.5px] font-semibold ' + (v.ativo ? 'text-red-600' : 'text-green-700'), onClick: function () { alternar(v); } }, v.ativo ? 'Desativar' : 'Reativar'));
      }), lista.length === 0 ? h('div', { className: 'p-4 text-xs text-gray-400' }, 'Nenhum vendedor cadastrado.') : null));
  }

  // ═══════════════════ PAINEL: HISTÓRICO GERAL (8.3) ═══════════════════
  function PainelHistorico(p) {
    var _l = useState(null), logs = _l[0], setLogs = _l[1];
    useEffect(function () { p.api('/comissao/logs?competencia=' + p.competencia).then(function (j) { setLogs(j.logs || []); }).catch(function () { setLogs([]); }); }, [p.competencia, p.api]);
    return h(Lateral, { titulo: 'Histórico · ' + fComp(p.competencia), sobretitulo: 'Logs de auditoria', fechar: p.fechar, largura: 720, rodape: [h('button', { key: 'c', className: btnP, onClick: p.fechar }, 'Fechar')] },
      !logs ? h('div', { className: 'p-6 text-gray-400 text-sm' }, 'Carregando...') : logs.length === 0 ? h('div', { className: 'p-6 text-gray-400 text-sm' }, 'Nenhum registro nesta competência.') :
      h('div', { className: 'divide-y divide-gray-100 border border-gray-200 rounded-xl' }, logs.map(function (l) {
        return h('div', { key: l.id, className: 'px-3 py-2 text-[12px]' },
          h('div', { className: 'flex items-center gap-2 flex-wrap' }, h('span', { className: 'px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-bold uppercase text-gray-600' }, l.acao), h('span', { className: 'font-semibold text-gray-800' }, (l.nome_cliente ? l.nome_cliente + ' · ' : '') + l.entidade), l.campo ? h('span', { className: 'text-gray-500' }, '· ' + l.campo) : null, h('span', { className: 'ml-auto text-gray-400 text-[11px]' }, fDataHora(l.criado_em) + ' · ' + (l.usuario || ''))),
          (l.valor_anterior != null || l.valor_novo != null) ? h('div', { className: 'text-gray-500 mt-0.5 break-all' }, l.valor_anterior != null ? h('span', { className: 'line-through mr-2' }, String(l.valor_anterior)) : null, l.valor_novo != null ? h('span', { className: 'text-gray-800' }, String(l.valor_novo)) : null) : null);
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
    var _pa = useState(null), painel = _pa[0], setPainel = _pa[1]; // {tipo:'cliente'|'lancamento'|'extrato'|'vendedores'|'historico'|'config', ...}
    var _bz = useState(false), busy = _bz[0], setBusy = _bz[1];

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
      return h('div', { className: 'bg-white rounded-xl border border-gray-200 p-10 text-center' }, h('div', { className: 'text-3xl mb-2' }, Ico('lock', 'ico', { width: 28, height: 28 })), h('p', { className: 'font-bold text-gray-800' }, 'Sem permissão'), h('p', { className: 'text-sm text-gray-500' }, 'O Controle de Comissões é exclusivo do perfil Financeiro.'));
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
      var v = window.prompt('% de imposto sobre a comissão líquida (não altera meses já lançados)', String(imposto));
      if (v === null) return; var n = parseMoeda(v); if (!(n >= 0 && n <= 100)) return aviso('Valor inválido', 'error');
      api('/comissao/config', { method: 'PUT', body: JSON.stringify({ imposto_pct: n }) }).then(function (j) { setImposto(j.imposto_pct); aviso('Imposto atualizado'); }).catch(function (e) { aviso(e.message, 'error'); });
    }

    var st = dados && dados.status ? dados.status.status : 'aberto';
    var aberto = st === 'aberto';
    var ind = dados ? dados.indicadores : null;
    var badgeSt = { aberto: 'bg-green-100 text-green-700', fechado: 'bg-gray-200 text-gray-700', pago: 'bg-blue-100 text-blue-700' }[st];
    var th = function (t, right) { return h('th', { className: (right ? 'text-right' : 'text-left') + ' px-3 py-2.5 text-[10.5px] font-extrabold uppercase tracking-wide text-gray-500 whitespace-nowrap' }, t); };

    return h('div', { className: 'space-y-4' },
      // Cabeçalho
      h('div', { className: 'flex flex-col lg:flex-row lg:items-end gap-3' },
        h('div', { className: 'flex-1' }, h('h2', { className: 'text-xl font-extrabold text-gray-900' }, 'Controle de comissões'), h('p', { className: 'text-[12.5px] text-gray-500' }, 'Entregas, faturamento e repasse vêm do BI; faixa e comissão são calculadas pela data de início de cada cliente.')),
        h('div', { className: 'flex items-center gap-2 flex-wrap' },
          h('div', { className: 'flex items-center border border-gray-200 rounded-lg bg-white' },
            h('button', { className: 'px-2.5 py-2 text-gray-500 hover:text-purple-700', onClick: function () { setComp(compAdd(comp, -1)); }, 'aria-label': 'Mês anterior' }, '‹'),
            h('input', { type: 'month', value: comp, onChange: function (e) { if (e.target.value) setComp(e.target.value); }, className: 'px-1 py-1.5 text-sm font-semibold text-gray-800 focus:outline-none' }),
            h('button', { className: 'px-2.5 py-2 text-gray-500 hover:text-purple-700', onClick: function () { setComp(compAdd(comp, 1)); }, 'aria-label': 'Próximo mês' }, '›')),
          h('span', { className: 'px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ' + badgeSt }, st),
          h('button', { className: btnS, disabled: busy || !dados, onClick: exportar }, 'Exportar fechamento'),
          aberto ? h('button', { className: btnS, disabled: busy || !dados || !dados.pode_fechar, title: dados && !dados.pode_fechar ? 'Só é possível fechar sem lançamentos pendentes' : '', onClick: fecharMes }, 'Fechar mês') : null,
          st === 'fechado' ? h('button', { className: btnS, disabled: busy, onClick: marcarPago }, 'Marcar como pago') : null,
          h('button', { className: btnP + ' bg-orange-500 hover:bg-orange-600', disabled: !aberto, onClick: function () { setPainel({ tipo: 'cliente' }); } }, '+ Novo cliente'))),
      h('div', { className: 'flex items-center gap-3 text-[12px] text-gray-500 flex-wrap' },
        h('button', { className: 'font-semibold text-purple-700 hover:underline', onClick: function () { setPainel({ tipo: 'vendedores' }); } }, 'Vendedores (' + vendedores.length + ')'),
        h('span', null, '·'), h('button', { className: 'font-semibold text-purple-700 hover:underline', onClick: salvarImposto }, 'Imposto: ' + (imposto == null ? '—' : imposto + '%')),
        h('span', null, '·'), h('button', { className: 'font-semibold text-purple-700 hover:underline', onClick: function () { setPainel({ tipo: 'historico' }); } }, 'Histórico da competência'),
        dados && dados.status && dados.status.fechado_em ? h('span', { className: 'ml-auto text-gray-400' }, 'Fechado por ' + dados.status.fechado_por + ' em ' + fDataHora(dados.status.fechado_em) + (dados.status.pago_em ? ' · pago em ' + fDataHora(dados.status.pago_em) : '')) : null),

      erro ? h('div', { className: 'bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12.5px] text-red-700' }, erro) : null,
      carregando && !dados ? h('div', { className: 'p-10 text-center text-gray-400 text-sm' }, 'Carregando...') : null,

      // Indicadores (6.1)
      ind ? h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 gap-3' },
        h(Card, { rotulo: 'Comissão total a pagar', valor: fR(ind.comissao_total), destaque: true, auxiliar: ind.clientes_lancados + ' cliente(s) lançado(s) em ' + fComp(comp).toLowerCase() }),
        h(Card, { rotulo: 'Lançamentos pendentes', valor: String(ind.pendentes), cor: ind.pendentes > 0 ? '#c2410c' : '#15803d', auxiliar: ind.clientes_lancados + ' de ' + ind.clientes_ativos + ' clientes lançados' }),
        h(Card, { rotulo: 'Saldo negativo levado ao próximo mês', valor: fR(ind.saldo_negativo_total), cor: ind.saldo_negativo_total > 0 ? '#b91c1c' : '#0f172a', auxiliar: ind.saldo_negativo_clientes.length ? ind.saldo_negativo_clientes.map(function (c) { return c.nome; }).join(', ') : 'Nenhum cliente com saldo pendente' }),
        h(Card, { rotulo: 'Mudam de faixa no próximo mês', valor: String(ind.mudam_faixa.length), auxiliar: ind.mudam_faixa.length ? ind.mudam_faixa.slice(0, 3).map(function (m) { return m.nome + ': ' + m.de + '% → ' + (m.encerra ? 'encerra' : m.para + '%') + ' em ' + fDiaMes(m.em); }).join(' · ') : 'Nenhuma mudança prevista' })) : null,

      // Por vendedor (6.2)
      dados ? h('div', null,
        h('div', { className: 'text-[12px] font-bold text-gray-700 mb-2' }, 'Comissão por vendedor · ' + fComp(comp)),
        dados.por_vendedor.length === 0 ? h('div', { className: 'text-xs text-gray-400' }, 'Nenhum vendedor cadastrado.') :
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3' }, dados.por_vendedor.map(function (v) {
          return h('div', { key: v.id, className: 'bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3' },
            h('div', { className: 'w-9 h-9 rounded-full bg-purple-100 text-purple-800 text-[11px] font-extrabold flex items-center justify-center' }, v.nome.split(' ').map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase()),
            h('div', { className: 'flex-1 min-w-0' }, h('div', { className: 'text-sm font-bold text-gray-800 truncate' }, v.nome), h('div', { className: 'text-[11px] text-gray-400' }, v.clientes + ' cliente(s) em comissão')),
            h('div', { className: 'text-[15px] font-extrabold text-purple-900 tabular-nums' }, fR(v.total)));
        }))) : null,

      // Apuração por cliente (6.3)
      dados ? h('div', { className: 'bg-white border border-gray-200 rounded-xl overflow-hidden' },
        h('div', { className: 'flex items-center justify-between px-4 py-3 border-b border-gray-100' },
          h('div', { className: 'text-[13px] font-bold text-gray-800' }, 'Apuração por cliente · ' + fComp(comp)),
          h('div', { className: 'text-[11px] text-gray-400' }, 'Lucro = (bruto − repasse) − imposto de ' + (imposto == null ? '—' : imposto) + '% sobre a comissão líquida')),
        dados.clientes.length === 0 ? h('div', { className: 'p-8 text-center text-sm text-gray-400' }, 'Nenhum cliente em comissão nesta competência. Cadastre um cliente com "+ Novo cliente".') :
        h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[12.5px]' },
          h('thead', { className: 'bg-gray-50' }, h('tr', null, th('Cliente'), th('Vendedor(es)'), th('Mês da relação'), th('Faixa'), th('Entregas', 1), th('Fat. bruto', 1), th('Repasse', 1), th('Com. líquida', 1), th('Imposto', 1), th('Lucro', 1), th('Comissão', 1), th('Lançamento'))),
          h('tbody', null, dados.clientes.map(function (e) {
            var t = e.totais || {}; var c = e.cliente;
            var negCls = function (v) { return v < 0 ? 'text-red-600' : ''; };
            var comissaoAux = e.encerrado ? 'Fora do período' : !e.lancado ? 'Aguardando lançamento' : (t.saldo_pendente_saida > 0 ? 'Saldo negativo → próximo mês' : (c.comissao_dividida ? fR(t.comissao_por_vendedor) + ' para cada' : c.vendedores));
            return h('tr', { key: c.id, className: 'border-t border-gray-100 hover:bg-gray-50/60 align-top' },
              h('td', { className: 'px-3 py-2.5' }, h('button', { className: 'font-bold text-purple-800 hover:underline text-left', onClick: function () { setPainel({ tipo: 'extrato', clienteId: c.id }); } }, c.nome), h('div', { className: 'text-[10.5px] text-gray-400' }, 'ID ' + c.cod_cliente + ' · início ' + fData(c.data_inicio)),
                c.centros_custo && c.centros_custo.length ? h('div', { className: 'flex flex-wrap gap-1 mt-1' }, c.centros_custo.slice(0, 3).map(function (cc) { return h('span', { key: cc, className: 'px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-mono', title: cc }, cc.length > 18 ? cc.slice(0, 17) + '…' : cc); }), c.centros_custo.length > 3 ? h('span', { className: 'text-[10px] text-gray-400', title: c.centros_custo.join(', ') }, '+' + (c.centros_custo.length - 3)) : null) : h('div', { className: 'text-[10px] text-gray-400 mt-0.5' }, 'todos os CC')),
              h('td', { className: 'px-3 py-2.5 whitespace-nowrap' }, c.vendedores),
              h('td', { className: 'px-3 py-2.5 whitespace-nowrap text-gray-600' }, e.mes_relacao),
              h('td', { className: 'px-3 py-2.5 whitespace-nowrap' }, e.periodos.length > 1 ? h('span', { className: 'inline-flex items-center gap-1' }, h(TagFaixa, { pct: e.periodos[0].faixa_pct, encerrada: e.periodos[0].encerrada, dividida: c.comissao_dividida }), '→', h(TagFaixa, { pct: e.periodos[1].faixa_pct, encerrada: e.periodos[1].encerrada, dividida: c.comissao_dividida })) : h(TagFaixa, { pct: e.periodos[0].faixa_pct, encerrada: e.periodos[0].encerrada, dividida: c.comissao_dividida })),
              h('td', { className: 'px-3 py-2.5 text-right tabular-nums' }, e.bi_sem_dados ? h('span', { className: 'text-gray-400 text-[11px]' }, 'Sem dados no BI') : e.entregas_bi),
              h('td', { className: 'px-3 py-2.5 text-right tabular-nums ' + (e.lancado ? '' : 'text-gray-400') }, fR(t.faturamento_bruto)),
              h('td', { className: 'px-3 py-2.5 text-right tabular-nums ' + (e.lancado ? '' : 'text-gray-400') }, fR(t.repasse_entregador), e.saldo_entrada && e.saldo_entrada.valor > 0 ? h('div', { className: 'text-[10px] text-red-600 whitespace-nowrap' }, 'inclui ' + fR(e.saldo_entrada.valor) + ' pendente') : null),
              h('td', { className: 'px-3 py-2.5 text-right tabular-nums ' + negCls(t.comissao_liquida) }, fRneg(t.comissao_liquida)),
              h('td', { className: 'px-3 py-2.5 text-right tabular-nums' }, fR(t.imposto)),
              h('td', { className: 'px-3 py-2.5 text-right tabular-nums ' + negCls(t.lucro) }, fRneg(t.lucro)),
              h('td', { className: 'px-3 py-2.5 text-right' }, h('div', { className: 'font-extrabold tabular-nums ' + (e.lancado ? 'text-purple-900' : 'text-gray-400') }, e.lancado ? fR(t.comissao) : (e.encerrado ? fR(0) : '—')), h('div', { className: 'text-[10.5px] text-gray-400 whitespace-nowrap' }, comissaoAux)),
              h('td', { className: 'px-3 py-2.5 whitespace-nowrap' }, h('div', { className: 'flex gap-1.5' },
                h('button', { className: btnL + ' ' + (e.lancado ? 'bg-gray-700' : 'bg-orange-500'), disabled: !aberto && !e.lancado, onClick: function () { setPainel({ tipo: 'lancamento', clienteId: c.id }); } }, aberto ? (e.lancado ? 'Editar' : 'Lançar') : 'Ver'),
                h('button', { className: btnL + ' bg-purple-700', onClick: function () { setPainel({ tipo: 'extrato', clienteId: c.id }); } }, 'Extrato'),
                h('button', { className: 'px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-purple-700 hover:border-purple-300', title: 'Editar cadastro', 'aria-label': 'Editar cadastro', onClick: function () { setPainel({ tipo: 'cliente', cliente: { id: c.id, cod_cliente: c.cod_cliente, nome_cliente: c.nome_cliente || c.nome, nome_exibicao: c.nome_exibicao, centros_custo: c.centros_custo || [], data_inicio: c.data_inicio, vendedor_1_id: c.vendedor_1_id, vendedor_2_id: c.vendedor_2_id, comissao_dividida: c.comissao_dividida, ativo: c.ativo } }); } }, Ico('pencil', 'ico', { width: 14, height: 14 })))));
          }))))) : null,

      // Painéis
      painel && painel.tipo === 'cliente' ? h(PainelCliente, { api: api, vendedores: vendedores, cliente: painel.cliente || null, fechar: function () { setPainel(null); }, aoSalvar: function () { setPainel(null); aviso('Cliente salvo'); recarregar(); }, aoExcluir: function () { setPainel(null); aviso('Cadastro excluído'); recarregar(); } }) : null,
      painel && painel.tipo === 'lancamento' ? h(PainelLancamento, { api: api, clienteId: painel.clienteId, competencia: comp, fechar: function () { setPainel(null); }, aoSalvar: function (msg) { setPainel(null); aviso(typeof msg === 'string' ? msg : 'Lançamento salvo'); recarregar(); } }) : null,
      painel && painel.tipo === 'extrato' ? h(PainelExtrato, { api: api, clienteId: painel.clienteId, competencia: comp, fechar: function () { setPainel(null); }, editar: function (cli) { setPainel({ tipo: 'cliente', cliente: { id: cli.id, cod_cliente: cli.cod_cliente, nome_cliente: cli.nome_cliente || cli.nome, nome_exibicao: cli.nome_exibicao, centros_custo: cli.centros_custo || [], data_inicio: cli.data_inicio, vendedor_1_id: cli.vendedor_1_id, vendedor_2_id: cli.vendedor_2_id, comissao_dividida: cli.comissao_dividida, ativo: cli.ativo } }); } }) : null,
      painel && painel.tipo === 'vendedores' ? h(PainelVendedores, { api: api, fechar: function () { setPainel(null); }, mudou: function () { api('/comissao/vendedores').then(function (j) { setVendedores(j.vendedores || []); }); } }) : null,
      painel && painel.tipo === 'historico' ? h(PainelHistorico, { api: api, competencia: comp, fechar: function () { setPainel(null); } }) : null
    );
  };
})();
