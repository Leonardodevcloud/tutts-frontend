/**
 * modulo-disponiveis-painel.js — DISPONIVEIS_V1
 * ─────────────────────────────────────────────────────────────────────────
 * Coluna flutuante "Motoboys disponíveis" do módulo Disponibilidade.
 * Lista compartilhada com o CRM WhatsApp (ativação cadastra, suporte aloca).
 *
 * Tempo real: o módulo Disponibilidade repassa o evento WS DISPONIVEIS_CHANGED
 * como `window` CustomEvent 'disponiveis:changed' (com a lista inteira);
 * este painel também recarrega por REST ao montar e a cada 30s (fallback).
 *
 * Ações: inserir (código → autofill), editar observação, excluir,
 * "Colocar na Disponibilidade" (escolhe a loja → cria linha → PUT com o cod;
 * o backend então tira o motoboy da lista e avisa todo mundo).
 *
 * Expõe window.PainelDisponiveis.
 */
(function () {
  'use strict';
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useCallback = React.useCallback, useRef = React.useRef, useMemo = React.useMemo;

  function Ico(nome, sz) { return h('svg', { className: 'ico', style: { width: sz || 14, height: sz || 14 }, 'aria-hidden': 'true' }, h('use', { href: '#i-' + nome })); }
  function fHora(ts) { if (!ts) return ''; var d = new Date(ts); var hoje = new Date(); var mesmo = d.toDateString() === hoje.toDateString(); return (mesmo ? 'Hoje ' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ') + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function iniciais(n) { return String(n || '?').split(' ').filter(Boolean).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase(); }
  var LS_KEY = 'tutts_disponiveis_painel_aberto';

  window.PainelDisponiveis = function (props) {
    var API_URL = props.API_URL, fetchAuth = props.fetchAuth, toast = props.ja, usuario = props.usuario;
    var _ab = useState(function () { try { return localStorage.getItem(LS_KEY) !== '0'; } catch (_) { return true; } }), aberto = _ab[0], setAberto = _ab[1];
    var _li = useState([]), lista = _li[0], setLista = _li[1];
    var _lo = useState(true), carregando = _lo[0], setCarregando = _lo[1];
    var _fr = useState(''), filtroRegiao = _fr[0], setFiltroRegiao = _fr[1];
    var _ed = useState(null), editando = _ed[0], setEditando = _ed[1];     // { id, observacao, disponibilidade }
    var _al = useState(null), alocando = _al[0], setAlocando = _al[1];     // { item, lojas, regioes, lojaId, busy }
    var _nv = useState(null), novo = _nv[0], setNovo = _nv[1];             // { cod, lookup, disponibilidade, observacao, busy }
    var _pu = useState(false), pulso = _pu[0], setPulso = _pu[1];
    var _bz = useState(false), busy = _bz[0], setBusy = _bz[1];
    var ultimoTotal = useRef(null);

    var api = useCallback(async function (rota, opcoes) {
      opcoes = opcoes || {};
      var r = await fetchAuth(API_URL + rota, Object.assign({}, opcoes, { headers: Object.assign({ 'Content-Type': 'application/json' }, opcoes.headers || {}) }));
      var j = null; try { j = await r.json(); } catch (e) { j = null; }
      if (!r.ok) throw new Error((j && j.error) || ('HTTP ' + r.status));
      return j;
    }, [API_URL, fetchAuth]);

    var carregar = useCallback(function () {
      api('/disponiveis').then(function (j) { setLista(j.lista || []); setCarregando(false); }).catch(function () { setCarregando(false); });
    }, [api]);

    useEffect(function () {
      carregar();
      var t = setInterval(carregar, 30000);
      function onEvt(e) {
        var d = e.detail || {};
        if (Array.isArray(d.lista)) setLista(d.lista);
        if (d.acao === 'inserido' && d.item) { setPulso(true); setTimeout(function () { setPulso(false); }, 4000); if (typeof toast === 'function' && d.por !== (usuario && usuario.fullName)) toast('Novo motoboy disponível: ' + d.item.cod_profissional + ' · ' + (d.item.nome || '').split(' ')[0] + ' — ' + (d.item.regiao || '—'), 'info'); }
        if (d.acao === 'alocado' && d.item && typeof toast === 'function') toast((d.item.nome || d.item.cod_profissional) + ' entrou na Disponibilidade e saiu da lista' + (d.detalhe ? ' (' + d.detalhe + ')' : ''), 'success');
      }
      window.addEventListener('disponiveis:changed', onEvt);
      return function () { clearInterval(t); window.removeEventListener('disponiveis:changed', onEvt); };
    }, [carregar]);

    useEffect(function () { try { localStorage.setItem(LS_KEY, aberto ? '1' : '0'); } catch (_) {} }, [aberto]);
    useEffect(function () { if (ultimoTotal.current !== null && lista.length > ultimoTotal.current && !aberto) { setPulso(true); setTimeout(function () { setPulso(false); }, 4000); } ultimoTotal.current = lista.length; }, [lista.length, aberto]);

    var regioes = useMemo(function () { var m = {}; lista.forEach(function (i) { var r = i.regiao || 'SEM REGIÃO'; m[r] = (m[r] || 0) + 1; }); return Object.keys(m).sort().map(function (k) { return { nome: k, n: m[k] }; }); }, [lista]);
    var visiveis = filtroRegiao ? lista.filter(function (i) { return (i.regiao || 'SEM REGIÃO') === filtroRegiao; }) : lista;
    function aviso(m, t) { if (typeof toast === 'function') toast(m, t || 'success'); }

    // ── excluir ──
    function excluir(item) {
      var motivo = window.prompt('Remover ' + (item.nome || item.cod_profissional) + ' da lista?\n\nMotivo (opcional):', '');
      if (motivo === null) return;
      setBusy(true);
      api('/disponiveis/' + item.id, { method: 'DELETE', body: JSON.stringify({ motivo: motivo }) }).then(function () { aviso('Removido da lista'); carregar(); }).catch(function (e) { aviso(e.message, 'error'); }).finally(function () { setBusy(false); });
    }
    // ── editar obs ──
    function salvarEdicao() {
      setBusy(true);
      api('/disponiveis/' + editando.id, { method: 'PATCH', body: JSON.stringify({ observacao: editando.observacao, disponibilidade: editando.disponibilidade }) }).then(function () { aviso('Observação salva'); setEditando(null); carregar(); }).catch(function (e) { aviso(e.message, 'error'); }).finally(function () { setBusy(false); });
    }
    // ── inserir ──
    function abrirNovo() { setNovo({ cod: '', lookup: null, disponibilidade: '', observacao: '', busy: false }); }
    function lookupCod(cod) {
      var c = String(cod || '').replace(/\D/g, '');
      setNovo(function (n) { return Object.assign({}, n, { cod: c, lookup: null }); });
      if (c.length < 2) return;
      api('/disponiveis/lookup/' + c).then(function (j) { setNovo(function (n) { return n && n.cod === c ? Object.assign({}, n, { lookup: j }) : n; }); }).catch(function () {});
    }
    function salvarNovo() {
      if (!novo.lookup || !novo.lookup.encontrado) return aviso('Código não encontrado no cadastro', 'error');
      setNovo(Object.assign({}, novo, { busy: true }));
      api('/disponiveis', { method: 'POST', body: JSON.stringify({ cod: novo.cod, disponibilidade: novo.disponibilidade, observacao: novo.observacao }) })
        .then(function () { aviso('Motoboy adicionado à lista'); setNovo(null); carregar(); })
        .catch(function (e) { aviso(e.message, 'error'); setNovo(function (n) { return Object.assign({}, n, { busy: false }); }); });
    }
    // ── colocar na disponibilidade ──
    function abrirAlocar(item) {
      setAlocando({ item: item, lojas: null, regioes: null, lojaId: '', busy: false });
      api('/disponibilidade').then(function (d) {
        var lojas = (d.lojas || []).map(function (l) { var reg = (d.regioes || []).find(function (r) { return r.id === l.regiao_id; }); var vazias = (d.linhas || []).filter(function (li) { return li.loja_id === l.id && !li.cod_profissional; }).length; return { id: l.id, nome: l.nome, regiao: reg ? reg.nome : '', vazias: vazias }; });
        // lojas da mesma região do motoboy primeiro
        var reg = String(item.regiao || '').toUpperCase();
        lojas.sort(function (a, b) { var am = String(a.regiao).toUpperCase() === reg ? 0 : 1, bm = String(b.regiao).toUpperCase() === reg ? 0 : 1; return am - bm || (b.vazias - a.vazias) || a.nome.localeCompare(b.nome); });
        setAlocando(function (s) { return s ? Object.assign({}, s, { lojas: lojas, lojaId: lojas[0] ? String(lojas[0].id) : '' }) : s; });
      }).catch(function (e) { aviso('Erro ao carregar lojas: ' + e.message, 'error'); setAlocando(null); });
    }
    function confirmarAlocar() {
      var lojaId = Number(alocando.lojaId); if (!lojaId) return;
      setAlocando(Object.assign({}, alocando, { busy: true }));
      api('/disponibilidade').then(function (d) {
        var vazia = (d.linhas || []).find(function (li) { return li.loja_id === lojaId && !li.cod_profissional; });
        if (vazia) return vazia.id;
        return api('/disponibilidade/linhas', { method: 'POST', body: JSON.stringify({ loja_id: lojaId, quantidade: 1, is_excedente: true }) }).then(function (r) { var ls = r.linhas || (Array.isArray(r) ? r : [r]); return ls[0].id; });
      }).then(function (linhaId) {
        return api('/disponibilidade/linhas/' + linhaId, { method: 'PUT', body: JSON.stringify({ cod_profissional: alocando.item.cod_profissional, nome_profissional: alocando.item.nome, status: 'A CONFIRMAR', observacao: alocando.item.observacao || null, observacao_usuario: usuario && (usuario.fullName || usuario.full_name), status_usuario: usuario && (usuario.fullName || usuario.full_name) }) });
      }).then(function () { aviso((alocando.item.nome || alocando.item.cod_profissional) + ' colocado na Disponibilidade'); setAlocando(null); carregar(); if (typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('disponibilidade:reload')); })
        .catch(function (e) { aviso(e.message, 'error'); setAlocando(function (s) { return s ? Object.assign({}, s, { busy: false }) : s; }); });
    }

    // ── aba recolhida ──
    if (!aberto) {
      return h('button', { type: 'button', onClick: function () { setAberto(true); }, 'aria-label': 'Abrir motoboys disponíveis',
        className: 'fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center gap-2 text-white shadow-2xl',
        style: { width: 44, height: 136, borderRadius: '12px 0 0 12px', background: 'linear-gradient(180deg,#4D0669,#770FA8)', boxShadow: pulso ? '0 0 0 6px rgba(246,118,2,.35), 0 10px 30px rgba(61,21,86,.3)' : '0 10px 30px rgba(61,21,86,.3)', transition: 'box-shadow .3s' } },
        Ico('bike', 18),
        h('span', { className: 'text-[11px] font-extrabold px-2 py-0.5 rounded-full', style: { background: '#F67602' } }, lista.length),
        h('span', { className: 'text-[9px] font-bold tracking-wider', style: { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } }, 'DISPONÍVEIS'));
    }

    var btnIco = 'w-[34px] h-[34px] rounded-lg border flex items-center justify-center disabled:opacity-50';
    return h('aside', { 'aria-label': 'Motoboys disponíveis', className: 'fixed z-40 flex flex-col overflow-hidden bg-white', style: { top: 108, right: 16, bottom: 16, width: 372, border: '1px solid #e9d5ff', borderRadius: 16, boxShadow: '0 20px 50px rgba(61,21,86,.18)' } },
      // header
      h('div', { className: 'flex items-center gap-2.5 text-white px-4 py-3', style: { background: 'linear-gradient(135deg,#4D0669,#770FA8)' } },
        Ico('bike', 20),
        h('div', { className: 'flex-1 min-w-0' }, h('div', { className: 'font-extrabold text-[15px] leading-tight' }, 'Motoboys disponíveis'), h('div', { className: 'text-[11px]', style: { color: '#e9d5ff' } }, 'cadastrados pela ativação · sem vaga ainda')),
        h('span', { className: 'flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full', style: { background: 'rgba(255,255,255,.14)' } }, h('span', { className: 'w-[7px] h-[7px] rounded-full', style: { background: '#4ade80' } }), 'ao vivo'),
        h('button', { type: 'button', onClick: function () { setAberto(false); }, 'aria-label': 'Recolher painel', className: 'w-[30px] h-[30px] rounded-lg flex items-center justify-center', style: { background: 'rgba(255,255,255,.14)' } }, Ico('arrowright', 16))),
      // filtros
      h('div', { className: 'flex flex-wrap items-center gap-1.5 px-3 py-2.5 border-b border-gray-100' },
        h('button', { type: 'button', onClick: function () { setFiltroRegiao(''); }, className: 'text-[11px] font-bold px-2.5 py-1 rounded-full ' + (!filtroRegiao ? 'text-white' : 'bg-gray-100 text-gray-700'), style: !filtroRegiao ? { background: '#6d28d9' } : null }, 'Todas · ' + lista.length),
        regioes.slice(0, 4).map(function (r) { return h('button', { key: r.nome, type: 'button', onClick: function () { setFiltroRegiao(filtroRegiao === r.nome ? '' : r.nome); }, className: 'text-[11px] font-semibold px-2.5 py-1 rounded-full ' + (filtroRegiao === r.nome ? 'text-white' : 'bg-gray-100 text-gray-700'), style: filtroRegiao === r.nome ? { background: '#6d28d9' } : null }, r.nome + ' · ' + r.n); }),
        regioes.length > 4 ? h('span', { className: 'text-[11px] text-gray-400 px-1' }, '+' + (regioes.length - 4)) : null,
        h('button', { type: 'button', onClick: abrirNovo, className: 'ml-auto h-[30px] px-2.5 rounded-lg text-[12px] font-bold', style: { border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#6d28d9' } }, '+ Inserir')),

      // lista
      h('div', { className: 'flex-1 overflow-y-auto px-3 py-2.5 flex flex-col gap-2' },
        novo ? h('div', { className: 'rounded-xl p-3 flex flex-col gap-2', style: { border: '1px solid #c4b5fd', background: '#faf5ff' } },
          h('div', { className: 'text-[12px] font-extrabold text-purple-900' }, 'Inserir motoboy disponível'),
          h('input', { autoFocus: true, value: novo.cod, placeholder: 'Código do profissional', inputMode: 'numeric', onChange: function (e) { lookupCod(e.target.value); }, className: 'h-[40px] px-3 rounded-lg text-[15px] font-bold border-2 focus:outline-none', style: { borderColor: novo.lookup && !novo.lookup.encontrado ? '#dc2626' : '#7c3aed' } }),
          novo.lookup ? (novo.lookup.encontrado
            ? h('div', { className: 'text-[12px] rounded-lg px-2.5 py-2', style: { background: '#fff', border: '1px solid #e9d5ff' } },
                h('div', { className: 'font-bold text-gray-800' }, novo.lookup.nome), h('div', { className: 'text-gray-500' }, [novo.lookup.regiao, novo.lookup.cidade, novo.lookup.telefone].filter(Boolean).join(' · ')),
                novo.lookup.ja_na_lista ? h('div', { className: 'text-amber-700 font-semibold mt-1' }, 'Já está na lista (por ' + (novo.lookup.ja_na_lista.por || '—') + ')') : null,
                novo.lookup.escalado ? h('div', { className: 'text-purple-700 font-semibold mt-1' }, 'Já está na escala: ' + novo.lookup.escalado.loja + ' (' + novo.lookup.escalado.status + ')') : null)
            : h('div', { className: 'text-[12px] text-red-700 font-semibold' }, 'Código ' + novo.cod + ' não existe no cadastro da Central')) : null,
          h('input', { value: novo.disponibilidade, placeholder: 'Disponibilidade (ex.: manhã e tarde, seg a sáb)', onChange: function (e) { setNovo(Object.assign({}, novo, { disponibilidade: e.target.value })); }, className: 'h-[36px] px-3 rounded-lg text-[12.5px] border border-gray-200 focus:outline-none' }),
          h('textarea', { value: novo.observacao, rows: 2, placeholder: 'Observação', onChange: function (e) { setNovo(Object.assign({}, novo, { observacao: e.target.value })); }, className: 'px-3 py-2 rounded-lg text-[12.5px] border border-gray-200 focus:outline-none resize-none' }),
          h('div', { className: 'flex gap-1.5 justify-end' },
            h('button', { type: 'button', onClick: function () { setNovo(null); }, className: 'h-[32px] px-3 rounded-lg text-[12px] font-semibold border border-gray-200 bg-white text-gray-700' }, 'Cancelar'),
            h('button', { type: 'button', disabled: novo.busy || !novo.lookup || !novo.lookup.encontrado || !!novo.lookup.ja_na_lista, onClick: salvarNovo, className: 'h-[32px] px-3.5 rounded-lg text-[12px] font-bold text-white disabled:opacity-50', style: { background: '#7c3aed' } }, novo.busy ? 'Salvando...' : 'Adicionar'))) : null,

        carregando ? h('div', { className: 'text-center text-gray-400 text-sm py-8' }, 'Carregando...') :
        visiveis.length === 0 ? h('div', { className: 'text-center text-gray-400 text-[12.5px] py-10 px-4' }, lista.length === 0 ? 'Nenhum motoboy disponível no momento. A ativação cadastra pelo CRM, ou use "+ Inserir".' : 'Nenhum motoboy nesta região.') :
        visiveis.map(function (item) {
          var novoRecente = Date.now() - new Date(item.criado_em).getTime() < 15 * 60 * 1000;
          var emEdicao = editando && editando.id === item.id;
          return h('article', { key: item.id, className: 'rounded-xl p-3 flex flex-col gap-1.5', style: { border: '1px solid ' + (emEdicao ? '#c4b5fd' : '#e5e7eb'), background: emEdicao ? '#faf5ff' : '#fff' } },
            h('div', { className: 'flex items-center gap-2' },
              item.foto ? h('img', { src: item.foto, alt: '', className: 'w-7 h-7 rounded-full object-cover' }) : h('span', { className: 'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold', style: { background: '#ede9fe', color: '#6d28d9' } }, iniciais(item.nome)),
              h('span', { className: 'text-[12px] font-extrabold px-1.5 py-0.5 rounded font-mono', style: { background: '#ede9fe', color: '#6d28d9' } }, item.cod_profissional),
              h('div', { className: 'font-bold text-[13px] flex-1 min-w-0 truncate', title: item.nome }, item.nome || '—'),
              novoRecente ? h('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded-full', style: { background: '#d1fae5', color: '#047857' } }, 'novo') : null),
            h('div', { className: 'flex items-center gap-1.5 text-[12px] text-gray-700 flex-wrap' },
              h('span', { className: 'font-bold text-gray-900' }, item.regiao || 'SEM REGIÃO'), item.telefone ? h('span', null, '· ' + item.telefone) : null, item.disponibilidade ? h('span', { className: 'text-gray-500' }, '· ' + item.disponibilidade) : null),
            emEdicao
              ? h('div', { className: 'flex flex-col gap-1.5' },
                  h('input', { value: editando.disponibilidade || '', placeholder: 'Disponibilidade', onChange: function (e) { setEditando(Object.assign({}, editando, { disponibilidade: e.target.value })); }, className: 'h-[34px] px-2.5 rounded-lg text-[12px] border border-purple-200 focus:outline-none' }),
                  h('textarea', { autoFocus: true, rows: 3, value: editando.observacao || '', placeholder: 'Observação', onChange: function (e) { setEditando(Object.assign({}, editando, { observacao: e.target.value })); }, className: 'px-2.5 py-2 rounded-lg text-[12.5px] border-2 focus:outline-none resize-none bg-white', style: { borderColor: '#7c3aed' } }),
                  h('div', { className: 'flex gap-1.5 justify-end' },
                    h('button', { type: 'button', onClick: function () { setEditando(null); }, className: 'h-[30px] px-3 rounded-lg text-[12px] font-semibold border border-gray-200 bg-white text-gray-700' }, 'Cancelar'),
                    h('button', { type: 'button', disabled: busy, onClick: salvarEdicao, className: 'h-[30px] px-3.5 rounded-lg text-[12px] font-bold text-white', style: { background: '#7c3aed' } }, 'Salvar')),
                  item.obs_historico && item.obs_historico.length > 1 ? h('div', { className: 'text-[10.5px] text-gray-500' }, 'Histórico: ' + item.obs_historico.slice(-3).map(function (o) { return (o.por || '—') + ' ' + fHora(o.em); }).join(' → ')) : null)
              : (item.observacao ? h('div', { className: 'text-[12px] text-gray-600 leading-snug' }, item.observacao) : h('div', { className: 'text-[12px] text-gray-400 italic' }, 'Sem observação — clique no lápis pra adicionar.')),
            h('div', { className: 'text-[10.5px] text-gray-400' }, 'Cadastrado ' + fHora(item.criado_em) + ' por ' + (item.criado_por || '—') + (item.origem === 'crm' ? ' (CRM)' : '')),
            !emEdicao ? h('div', { className: 'flex gap-1.5 mt-0.5' },
              h('button', { type: 'button', disabled: busy, onClick: function () { abrirAlocar(item); }, className: 'flex-1 h-[34px] rounded-lg text-[12px] font-bold', style: { border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#6d28d9' } }, 'Colocar na Disponibilidade'),
              h('button', { type: 'button', disabled: busy, 'aria-label': 'Editar observação', onClick: function () { setEditando({ id: item.id, observacao: item.observacao || '', disponibilidade: item.disponibilidade || '' }); }, className: btnIco + ' border-gray-200 bg-white text-gray-600' }, Ico('pencil', 15)),
              h('button', { type: 'button', disabled: busy, 'aria-label': 'Excluir da lista', onClick: function () { excluir(item); }, className: btnIco, style: { borderColor: '#fecaca', background: '#fef2f2', color: '#dc2626' } }, Ico('trash', 15))) : null);
        }),
        h('div', { className: 'mt-auto text-[11px] text-gray-400 text-center py-1.5' }, 'Ao colocar na Disponibilidade, o motoboy sai daqui e do CRM automaticamente.')),

      // modal alocar
      alocando ? h('div', { className: 'absolute inset-0 z-10 flex items-end', style: { background: 'rgba(17,24,39,.35)' }, onClick: function (e) { if (e.target === e.currentTarget && !alocando.busy) setAlocando(null); } },
        h('div', { className: 'w-full bg-white rounded-t-2xl p-4 flex flex-col gap-3', style: { boxShadow: '0 -10px 30px rgba(0,0,0,.15)' } },
          h('div', { className: 'text-[14px] font-extrabold text-gray-900' }, 'Colocar na Disponibilidade'),
          h('div', { className: 'text-[12.5px] text-gray-600' }, h('b', null, alocando.item.cod_profissional + ' · ' + (alocando.item.nome || '')), ' — ' + (alocando.item.regiao || '')),
          !alocando.lojas ? h('div', { className: 'text-[12px] text-gray-400' }, 'Carregando lojas...') :
          h('div', { className: 'flex flex-col gap-1.5' },
            h('label', { htmlFor: 'disp-loja', className: 'text-[11px] font-bold uppercase tracking-wide text-gray-500' }, 'Loja / operação'),
            h('select', { id: 'disp-loja', value: alocando.lojaId, onChange: function (e) { setAlocando(Object.assign({}, alocando, { lojaId: e.target.value })); }, className: 'h-[40px] px-3 rounded-lg border border-gray-300 text-[13px] bg-white' },
              alocando.lojas.map(function (l) { return h('option', { key: l.id, value: String(l.id) }, l.nome + (l.regiao ? ' — ' + l.regiao : '') + (l.vazias ? ' · ' + l.vazias + ' vaga(s) livre(s)' : ' · nova linha excedente')); })),
            h('div', { className: 'text-[11px] text-gray-500' }, 'Usa uma linha vazia da loja; se não houver, cria uma linha excedente. Status inicial: A CONFIRMAR.')),
          h('div', { className: 'flex gap-2 justify-end' },
            h('button', { type: 'button', disabled: alocando.busy, onClick: function () { setAlocando(null); }, className: 'h-[36px] px-3.5 rounded-lg text-[12.5px] font-semibold border border-gray-200 bg-white text-gray-700' }, 'Cancelar'),
            h('button', { type: 'button', disabled: alocando.busy || !alocando.lojaId, onClick: confirmarAlocar, className: 'h-[36px] px-4 rounded-lg text-[12.5px] font-bold text-white disabled:opacity-50', style: { background: '#7c3aed' } }, alocando.busy ? 'Colocando...' : 'Confirmar')))) : null
    );
  };
})();
