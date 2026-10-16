/* REDESIGN_CLEAN_V1: telas no padrao clean aprovado (mockups 16/10). */
/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
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
  /* DISP_CLEAN_V1: com o painel aberto em telas largas, o conteúdo da Disponibilidade abre espaço à direita (sem sobrepor). */
  (function () {
    try {
      if (document.getElementById('disp-clean-style')) return;
      var st = document.createElement('style'); st.id = 'disp-clean-style';
      st.textContent = '@media (min-width:1280px){body.disp-drawer-aberto .disp-clean-root{margin-right:max(0px,calc(1020px - 50vw))}}';
      document.head.appendChild(st);
    } catch (_) {}
  })();

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
    useEffect(function () { try { document.body.classList.toggle('disp-drawer-aberto', !!aberto); } catch (_) {} return function () { try { document.body.classList.remove('disp-drawer-aberto'); } catch (_) {} }; }, [aberto]);
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
        className: 'fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center gap-2 text-white',
        style: { width: 44, height: 136, borderRadius: '12px 0 0 12px', background: '#770fa8', boxShadow: pulso ? '0 0 0 6px rgba(246,118,2,.35)' : 'none', transition: 'box-shadow .3s' } },
        Ico('bike', 18),
        h('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full', style: { background: '#f67602', color: '#26093a' } }, lista.length),
        h('span', { className: 'text-[9px] font-bold tracking-wider', style: { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } }, 'DISPONÍVEIS'));
    }

    var btnIco = 'w-[32px] h-[32px] rounded-lg border flex items-center justify-center disabled:opacity-50';
    return h('aside', { 'aria-label': 'Motoboys disponíveis', className: 'fixed z-40 flex flex-col overflow-hidden bg-white', style: { top: 108, right: 16, bottom: 16, width: 'min(372px, calc(100vw - 32px))', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 12px 32px rgba(17,24,39,.08)' } },
      // header — DISP_CLEAN_V1: cabeçalho branco, sem gradiente
      h('div', { className: 'flex flex-col gap-2.5 px-[18px] pt-4 pb-3.5', style: { borderBottom: '1px solid #f3f4f6' } },
        h('div', { className: 'flex items-center gap-2' },
          h('h2', { className: 'm-0 text-[15px] font-semibold', style: { color: '#111827' } }, 'Motoboys disponíveis'),
          h('span', { className: 'text-[12px] font-bold px-2 py-0.5 rounded-full', style: { background: '#faf7fd', color: '#5d0b85' } }, lista.length),
          h('span', { className: 'ml-auto flex items-center gap-1.5 text-[11.5px]', style: { color: '#6b7280' } }, h('span', { className: 'w-[7px] h-[7px] rounded-full', style: { background: '#16a34a' } }), 'ao vivo'),
          h('button', { type: 'button', onClick: function () { setAberto(false); }, 'aria-label': 'Recolher painel', title: 'Recolher painel', className: 'w-[30px] h-[30px] rounded-lg flex items-center justify-center hover:bg-gray-50', style: { border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280' } }, Ico('arrowright', 15))),
        h('p', { className: 'm-0 text-[12px]', style: { color: '#6b7280' } }, 'Cadastrados pela ativação, ainda sem vaga.'),
        // filtros em pílulas
        h('div', { className: 'flex flex-wrap items-center gap-1' },
          h('button', { type: 'button', onClick: function () { setFiltroRegiao(''); }, className: 'h-7 px-2.5 rounded-full text-[12px] ' + (!filtroRegiao ? 'font-semibold text-white' : 'bg-white'), style: !filtroRegiao ? { background: '#770fa8', border: '1px solid #770fa8' } : { border: '1px solid #e5e7eb', color: '#374151' } }, 'Todas · ' + lista.length),
          regioes.slice(0, 4).map(function (r) { var on = filtroRegiao === r.nome; return h('button', { key: r.nome, type: 'button', onClick: function () { setFiltroRegiao(on ? '' : r.nome); }, className: 'h-7 px-2.5 rounded-full text-[12px] ' + (on ? 'font-semibold text-white' : 'bg-white'), style: on ? { background: '#770fa8', border: '1px solid #770fa8' } : { border: '1px solid #e5e7eb', color: '#374151' } }, r.nome + ' · ' + r.n); }),
          regioes.length > 4 ? h('span', { className: 'text-[12px] px-1', style: { color: '#9ca3af' } }, '+' + (regioes.length - 4)) : null,
          h('button', { type: 'button', onClick: abrirNovo, className: 'ml-auto h-7 px-2.5 rounded-lg text-[12px] font-semibold hover:bg-gray-50', style: { border: '1px solid #e5e7eb', background: '#fff', color: '#374151' } }, '+ Inserir'))),

      // lista
      h('div', { className: 'flex-1 overflow-y-auto px-3 py-2.5 flex flex-col gap-2' },
        novo ? h('div', { className: 'rounded-xl p-3 flex flex-col gap-2', style: { border: '1px solid #e9d5f9', background: '#f9fafb' } },
          h('div', { className: 'text-[12.5px] font-semibold', style: { color: '#111827' } }, 'Inserir motoboy disponível'),
          h('input', { autoFocus: true, value: novo.cod, placeholder: 'Código do profissional', inputMode: 'numeric', onChange: function (e) { lookupCod(e.target.value); }, className: 'h-[40px] px-3 rounded-[10px] text-[15px] font-semibold border focus:outline-none', style: { borderColor: novo.lookup && !novo.lookup.encontrado ? '#dc2626' : '#c084e6' } }),
          novo.lookup ? (novo.lookup.encontrado
            ? h('div', { className: 'text-[12px] rounded-lg px-2.5 py-2', style: { background: '#fff', border: '1px solid #e5e7eb' } },
                h('div', { className: 'font-bold text-gray-800' }, novo.lookup.nome), h('div', { className: 'text-gray-500' }, [novo.lookup.regiao, novo.lookup.cidade, novo.lookup.telefone].filter(Boolean).join(' · ')),
                novo.lookup.ja_na_lista ? h('div', { className: 'font-semibold mt-1', style: { color: '#92400e' } }, 'Já está na lista (por ' + (novo.lookup.ja_na_lista.por || '—') + ')') : null,
                novo.lookup.escalado ? h('div', { className: 'font-semibold mt-1', style: { color: '#5d0b85' } }, 'Já está na escala: ' + novo.lookup.escalado.loja + ' (' + novo.lookup.escalado.status + ')') : null)
            : h('div', { className: 'text-[12px] font-semibold', style: { color: '#991b1b' } }, 'Código ' + novo.cod + ' não existe no cadastro da Central')) : null,
          h('input', { value: novo.disponibilidade, placeholder: 'Disponibilidade (ex.: manhã e tarde, seg a sáb)', onChange: function (e) { setNovo(Object.assign({}, novo, { disponibilidade: e.target.value })); }, className: 'h-[36px] px-3 rounded-lg text-[12.5px] border border-gray-200 focus:outline-none' }),
          h('textarea', { value: novo.observacao, rows: 2, placeholder: 'Observação', onChange: function (e) { setNovo(Object.assign({}, novo, { observacao: e.target.value })); }, className: 'px-3 py-2 rounded-lg text-[12.5px] border border-gray-200 focus:outline-none resize-none' }),
          h('div', { className: 'flex gap-1.5 justify-end' },
            h('button', { type: 'button', onClick: function () { setNovo(null); }, className: 'h-[32px] px-3 rounded-lg text-[12px] font-semibold border border-gray-200 bg-white text-gray-700' }, 'Cancelar'),
            h('button', { type: 'button', disabled: novo.busy || !novo.lookup || !novo.lookup.encontrado || !!novo.lookup.ja_na_lista, onClick: salvarNovo, className: 'h-[32px] px-3.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50', style: { background: '#770fa8' } }, novo.busy ? 'Salvando...' : 'Adicionar'))) : null,

        carregando ? h('div', { className: 'text-center text-gray-400 text-sm py-8' }, 'Carregando...') :
        visiveis.length === 0 ? h('div', { className: 'text-center text-gray-400 text-[12.5px] py-10 px-4' }, lista.length === 0 ? 'Nenhum motoboy disponível no momento. A ativação cadastra pelo CRM, ou use "+ Inserir".' : 'Nenhum motoboy nesta região.') :
        visiveis.map(function (item) {
          var novoRecente = Date.now() - new Date(item.criado_em).getTime() < 15 * 60 * 1000;
          var emEdicao = editando && editando.id === item.id;
          return h('article', { key: item.id, className: 'rounded-xl p-3 flex flex-col gap-2', style: { border: '1px solid ' + (emEdicao ? '#e9d5f9' : '#e5e7eb'), background: emEdicao ? '#faf7fd' : '#fff' } },
            h('div', { className: 'flex items-center gap-2' },
              item.foto ? h('img', { src: item.foto, alt: '', className: 'w-7 h-7 rounded-full object-cover' }) : h('span', { className: 'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-none', style: { background: '#f3e8fb', color: '#5d0b85' } }, iniciais(item.nome)),
              h('div', { className: 'flex-1 min-w-0' },
                h('div', { className: 'font-semibold text-[13px] truncate', style: { color: '#111827' }, title: item.nome }, item.nome || '—'),
                h('div', { className: 'text-[11.5px] font-mono', style: { color: '#5d0b85' } }, item.cod_profissional)),
              novoRecente ? h('span', { className: 'text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1', style: { background: '#f0fdf4', color: '#166534' } }, h('span', { className: 'w-1.5 h-1.5 rounded-full', style: { background: '#16a34a' } }), 'novo') : null),
            h('div', { className: 'flex items-center gap-1.5 text-[12px] text-gray-500 flex-wrap' },
              h('span', { className: 'font-semibold text-gray-700' }, item.regiao || 'SEM REGIÃO'), item.telefone ? h('span', null, '· ' + item.telefone) : null, item.disponibilidade ? h('span', { className: 'text-gray-500' }, '· ' + item.disponibilidade) : null),
            emEdicao
              ? h('div', { className: 'flex flex-col gap-1.5' },
                  h('input', { value: editando.disponibilidade || '', placeholder: 'Disponibilidade', onChange: function (e) { setEditando(Object.assign({}, editando, { disponibilidade: e.target.value })); }, className: 'h-[34px] px-2.5 rounded-lg text-[12px] border border-gray-200 focus:outline-none focus:border-[#770fa8]' }),
                  h('textarea', { autoFocus: true, rows: 3, value: editando.observacao || '', placeholder: 'Observação', onChange: function (e) { setEditando(Object.assign({}, editando, { observacao: e.target.value })); }, className: 'px-2.5 py-2 rounded-lg text-[12.5px] border focus:outline-none resize-none bg-white', style: { borderColor: '#c084e6' } }),
                  h('div', { className: 'flex gap-1.5 justify-end' },
                    h('button', { type: 'button', onClick: function () { setEditando(null); }, className: 'h-[30px] px-3 rounded-lg text-[12px] font-semibold border border-gray-200 bg-white text-gray-700' }, 'Cancelar'),
                    h('button', { type: 'button', disabled: busy, onClick: salvarEdicao, className: 'h-[30px] px-3.5 rounded-lg text-[12px] font-bold text-white', style: { background: '#770fa8' } }, 'Salvar')),
                  item.obs_historico && item.obs_historico.length > 1 ? h('div', { className: 'text-[10.5px] text-gray-500' }, 'Histórico: ' + item.obs_historico.slice(-3).map(function (o) { return (o.por || '—') + ' ' + fHora(o.em); }).join(' → ')) : null)
              : (item.observacao ? h('div', { className: 'text-[12px] text-gray-600 leading-snug' }, item.observacao) : h('div', { className: 'text-[12px] text-gray-400 italic' }, 'Sem observação — clique no lápis pra adicionar.')),
            h('div', { className: 'text-[10.5px] text-gray-400' }, 'Cadastrado ' + fHora(item.criado_em) + ' por ' + (item.criado_por || '—') + (item.origem === 'crm' ? ' (CRM)' : '')),
            !emEdicao ? h('div', { className: 'flex gap-1.5 mt-0.5' },
              h('button', { type: 'button', disabled: busy, onClick: function () { abrirAlocar(item); }, className: 'flex-1 h-[32px] rounded-lg text-[12px] font-semibold hover:bg-[#f3e8fb]', style: { border: '1px solid #e9d5f9', background: '#faf7fd', color: '#5d0b85' } }, 'Colocar na disponibilidade'),
              h('button', { type: 'button', disabled: busy, 'aria-label': 'Editar observação', onClick: function () { setEditando({ id: item.id, observacao: item.observacao || '', disponibilidade: item.disponibilidade || '' }); }, className: btnIco + ' border-gray-200 bg-white text-gray-600' }, Ico('pencil', 15)),
              h('button', { type: 'button', disabled: busy, 'aria-label': 'Excluir da lista', onClick: function () { excluir(item); }, className: btnIco + ' hover:bg-red-50', style: { borderColor: '#fecaca', background: '#fff', color: '#991b1b' } }, Ico('trash', 15))) : null);
        }),
        h('div', { className: 'mt-auto text-[11px] text-gray-400 text-center py-1.5' }, 'Ao colocar na Disponibilidade, o motoboy sai daqui e do CRM automaticamente.')),

      // modal alocar
      alocando ? h('div', { className: 'absolute inset-0 z-10 flex items-end', style: { background: 'rgba(17,24,39,.35)' }, onClick: function (e) { if (e.target === e.currentTarget && !alocando.busy) setAlocando(null); } },
        h('div', { className: 'w-full bg-white rounded-t-[14px] p-4 flex flex-col gap-3', style: { borderTop: '1px solid #e5e7eb' } },
          h('div', { className: 'text-[14px] font-semibold text-gray-900' }, 'Colocar na disponibilidade'),
          h('div', { className: 'text-[12.5px] text-gray-600' }, h('b', null, alocando.item.cod_profissional + ' · ' + (alocando.item.nome || '')), ' — ' + (alocando.item.regiao || '')),
          !alocando.lojas ? h('div', { className: 'text-[12px] text-gray-400' }, 'Carregando lojas...') :
          h('div', { className: 'flex flex-col gap-1.5' },
            h('label', { htmlFor: 'disp-loja', className: 'text-[12px] font-semibold text-gray-700' }, 'Loja / operação'),
            h('select', { id: 'disp-loja', value: alocando.lojaId, onChange: function (e) { setAlocando(Object.assign({}, alocando, { lojaId: e.target.value })); }, className: 'h-[40px] px-3 rounded-[10px] border border-gray-200 text-[13px] bg-white' },
              alocando.lojas.map(function (l) { return h('option', { key: l.id, value: String(l.id) }, l.nome + (l.regiao ? ' — ' + l.regiao : '') + (l.vazias ? ' · ' + l.vazias + ' vaga(s) livre(s)' : ' · nova linha excedente')); })),
            h('div', { className: 'text-[11px] text-gray-500' }, 'Usa uma linha vazia da loja; se não houver, cria uma linha excedente. Status inicial: A CONFIRMAR.')),
          h('div', { className: 'flex gap-2 justify-end' },
            h('button', { type: 'button', disabled: alocando.busy, onClick: function () { setAlocando(null); }, className: 'h-[36px] px-3.5 rounded-lg text-[12.5px] font-semibold border border-gray-200 bg-white text-gray-700' }, 'Cancelar'),
            h('button', { type: 'button', disabled: alocando.busy || !alocando.lojaId, onClick: confirmarAlocar, className: 'h-[36px] px-4 rounded-[10px] text-[12.5px] font-semibold text-white disabled:opacity-50', style: { background: '#770fa8' } }, alocando.busy ? 'Colocando...' : 'Confirmar')))) : null
    );
  };
})();
