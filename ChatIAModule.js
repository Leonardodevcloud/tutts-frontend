/* UI_UNIFICADO_V1: emojis -> sprite de icones; cores na paleta unica (CORES_TOKENS_V1). */
/* DEEMOJI_V1 */
/* BI_ABAS_V1: Chat IA no padrão clean — cabeçalho Sora 24, cards brancos sem sombra/gradiente,
   bolhas (usuário roxo-50 / IA branca com borda), SQL em bloco mono cinza, Enviar como ação principal.
   Lógica, estados e chamadas de API inalterados. */
/**
 * Chat IA Module v6.1 — Frontend Component
 * - Painel de treinamento como sub-aba ANTES e DURANTE o chat
 * - Memórias orgânicas com contexto do prompt que as gerou
 * - Distinção visual entre memórias auto vs manual
 */
(function() {
  const { useState, useEffect, useRef } = React;
  const el = React.createElement;
  const CATS = [
    { id: 'geral', label: 'Geral', cor: 'bg-gray-100 text-gray-700' },
    { id: 'negocio', label: 'Regra de Negócio', cor: 'bg-blue-100 text-blue-700' },
    { id: 'calculo', label: 'Cálculo', cor: 'bg-amber-100 text-amber-700' },
    { id: 'glossario', label: 'Glossário', cor: 'bg-green-100 text-green-700' },
    { id: 'formato', label: 'Formatação', cor: 'bg-purple-100 text-purple-700' },
  ];

  // BI_ABAS_V1: foco roxo nos campos (inline styles não suportam :focus)
  if (typeof document !== 'undefined' && !document.getElementById('chatia-foco-css')) {
    var st = document.createElement('style'); st.id = 'chatia-foco-css';
    st.textContent = '.chatia-campo:focus{outline:none;border-color:#770fa8 !important;box-shadow:0 0 0 3px #f3e8fb}';
    document.head.appendChild(st);
  }

  function ChatIAModule({ apiUrl, fetchAuth }) {
    // Estados
    var _u = function(v) { return useState(v); };
    var _msgs = _u([]), msgs = _msgs[0], setMsgs = _msgs[1];
    var _inp = _u(''), input = _inp[0], setInput = _inp[1];
    var _ld = _u(false), loading = _ld[0], setLoading = _ld[1];
    var _fil = _u({ cod_cliente: [], nomes_clientes: [], centro_custo: [], data_inicio: '', data_fim: '', regiao: '' }), filtros = _fil[0], setFiltros = _fil[1];
    var _ini = _u(false), iniciado = _ini[0], setIniciado = _ini[1];
    var _cli = _u([]), clientes = _cli[0], setClientes = _cli[1];
    var _cen = _u([]), centros = _cen[0], setCentros = _cen[1];
    var _fl = _u(false), filtrosLoading = _fl[0], setFiltrosLoading = _fl[1];
    var _da = _u(null), dropAberto = _da[0], setDropAberto = _da[1];
    var _bc = _u(''), buscaCliente = _bc[0], setBuscaCliente = _bc[1];
    var _convs = _u([]), conversas = _convs[0], setConversas = _convs[1];
    var _ca = _u(null), conversaAtual = _ca[0], setConversaAtual = _ca[1];
    var _cl2 = _u(false), conversasLoading = _cl2[0], setConversasLoading = _cl2[1];
    var _sb = _u(false), sidebarAberta = _sb[0], setSidebarAberta = _sb[1];
    var _ex = _u(false), exportando = _ex[0], setExportando = _ex[1];
    var _rg = _u([]), regioes = _rg[0], setRegioes = _rg[1];
    var _apc = _u('filtros'), abaPreChat = _apc[0], setAbaPreChat = _apc[1];
    var _dc = _u(''), dadosContexto = _dc[0], setDadosContexto = _dc[1];
    var _pcl = _u(false), preCarregando = _pcl[0], setPreCarregando = _pcl[1];
    var _at = _u('instrucoes'), abaTreinar = _at[0], setAbaTreinar = _at[1];
    var _ctx = _u([]), contextos = _ctx[0], setContextos = _ctx[1];
    var _ctxl = _u(false), contextosLoading = _ctxl[0], setContextosLoading = _ctxl[1];
    var _nc = _u({ titulo: '', conteudo: '', categoria: 'geral' }), novoCtx = _nc[0], setNovoCtx = _nc[1];
    var _ec = _u(null), editandoCtx = _ec[0], setEditandoCtx = _ec[1];
    var _mem = _u([]), memorias = _mem[0], setMemorias = _mem[1];
    var _nm = _u(''), novaMemoria = _nm[0], setNovaMemoria = _nm[1];
    var _pt = _u(false), painelTreinar = _pt[0], setPainelTreinar = _pt[1];
    var chatEndRef = useRef(null), dataLoaded = useRef(false);

    useEffect(function() { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
    useEffect(function() {
      if (dataLoaded.current) return; dataLoaded.current = true; setFiltrosLoading(true);
      Promise.all([fetchAuth(apiUrl + '/bi/chat-ia/filtros').then(function(r) { return r.json(); }), fetchAuth(apiUrl + '/bi/regioes').then(function(r) { return r.json(); }).catch(function() { return []; })]).then(function(r) { setClientes(r[0].clientes || []); setRegioes(Array.isArray(r[1]) ? r[1] : []); setFiltrosLoading(false); }).catch(function() { setFiltrosLoading(false); });
      if (!window.Chart && !document.getElementById('chartjs-cdn')) { var s = document.createElement('script'); s.id = 'chartjs-cdn'; s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'; document.head.appendChild(s); }
    }, []);

    function loadCtx() { setContextosLoading(true); fetchAuth(apiUrl + '/bi/chat-ia/contexto').then(function(r) { return r.json(); }).then(function(d) { setContextos(d.contextos || []); setContextosLoading(false); }).catch(function() { setContextosLoading(false); }); }
    function loadMem() { fetchAuth(apiUrl + '/bi/chat-ia/memorias').then(function(r) { return r.json(); }).then(function(d) { setMemorias(d.memorias || []); }).catch(function() {}); }
    function saveCtx() { if (!novoCtx.titulo.trim() || !novoCtx.conteudo.trim()) return; fetchAuth(editandoCtx ? apiUrl + '/bi/chat-ia/contexto/' + editandoCtx : apiUrl + '/bi/chat-ia/contexto', { method: editandoCtx ? 'PUT' : 'POST', body: JSON.stringify(novoCtx) }).then(function() { setNovoCtx({ titulo: '', conteudo: '', categoria: 'geral' }); setEditandoCtx(null); loadCtx(); }).catch(function() {}); }
    function delCtx(id) { if (!confirm('Remover?')) return; fetchAuth(apiUrl + '/bi/chat-ia/contexto/' + id, { method: 'DELETE' }).then(function() { loadCtx(); }).catch(function() {}); }
    function togCtx(c) { fetchAuth(apiUrl + '/bi/chat-ia/contexto/' + c.id, { method: 'PUT', body: JSON.stringify({ ativo: !c.ativo }) }).then(function() { loadCtx(); }).catch(function() {}); }
    function saveMem() { if (!novaMemoria.trim()) return; fetchAuth(apiUrl + '/bi/chat-ia/memorias', { method: 'POST', body: JSON.stringify({ conteudo: novaMemoria.trim() }) }).then(function() { setNovaMemoria(''); loadMem(); }).catch(function() {}); }
    function delMem(id) { fetchAuth(apiUrl + '/bi/chat-ia/memorias/' + id, { method: 'DELETE' }).then(function() { loadMem(); }).catch(function() {}); }

    function enviar(to) {
      var p = (to || input).trim(); if (!p || loading) return; setInput(''); setLoading(true);
      setMsgs(function(prev) { return [].concat(prev, [{ prompt: p, loading: true }]); });
      fetchAuth(apiUrl + '/bi/chat-ia', { method: 'POST', body: JSON.stringify({ prompt: p, historico: msgs.map(function(m) { return { prompt: m.prompt, resposta: m.resposta }; }), filtros: filtros, conversa_id: conversaAtual, dados_contexto: dadosContexto }) }).then(function(r) { return r.json(); }).then(function(data) {
        var resp = data.resposta || 'Erro', _c = [], _t; var cr = /\[CHART\]\s*\n?([\s\S]*?)\n?\[\/CHART\]/g, cm;
        while ((cm = cr.exec(resp)) !== null) { try { _c.push(JSON.parse(cm[1].trim())); } catch(e) {} }
        _t = resp.replace(/\[CHART\]\s*\n?[\s\S]*?\n?\[\/CHART\]/g, '\n__CHART__\n').split('__CHART__');
        setMsgs(function(prev) { var u = prev.slice(); u[u.length - 1] = { prompt: p, resposta: resp, sql: data.sql, dados: data.dados, loading: false, _charts: _c, _textParts: _t, _msgId: Date.now() }; return u; }); setLoading(false);
      }).catch(function(err) { setMsgs(function(prev) { var u = prev.slice(); u[u.length - 1] = { prompt: p, resposta: '' + err.message, loading: false, _charts: [], _textParts: ['' + err.message], _msgId: Date.now() }; return u; }); setLoading(false); });
    }

    function selRegiao(rid) {
      if (!rid) { setFiltros(function(p) { return Object.assign({}, p, { regiao: '', cod_cliente: [], nomes_clientes: [], centro_custo: [] }); }); setCentros([]); return; }
      var rg = regioes.find(function(r) { return String(r.id) === rid; });
      if (rg && rg.clientes) { var itens = typeof rg.clientes === 'string' ? JSON.parse(rg.clientes) : rg.clientes; if (Array.isArray(itens)) { var cds = [], nms = [], ccs = [], ccMap = {}; itens.forEach(function(i) { var c = typeof i === 'number' ? i : parseInt(i.cod_cliente); if (!isNaN(c) && cds.indexOf(c) === -1) { cds.push(c); var cl = clientes.find(function(x) { return parseInt(x.cod_cliente) === c; }); nms.push(cl ? cl.nome_fantasia : 'Cod ' + c); ccMap[String(c)] = []; } if (i.centro_custo) { ccs.push(i.centro_custo); if (ccMap[String(c)]) ccMap[String(c)].push(i.centro_custo); } }); setFiltros(function(p) { return Object.assign({}, p, { regiao: rid, cod_cliente: cds, nomes_clientes: nms, centro_custo: ccs, cliente_centro_map: ccMap }); }); if (cds.length > 0) fetchAuth(apiUrl + '/bi/chat-ia/filtros?cod_cliente=' + cds.join(',')).then(function(r) { return r.json(); }).then(function(d) { setCentros(d.centros_do_cliente || []); }).catch(function() {}); } }
    }

    function togCli(c) {
      var cod = parseInt(c.cod_cliente), sel = filtros.cod_cliente.indexOf(cod) !== -1;
      var nc = sel ? filtros.cod_cliente.filter(function(x) { return parseInt(x) !== cod; }) : [].concat(filtros.cod_cliente, [cod]);
      var nn = sel ? filtros.nomes_clientes.filter(function(_, i) { return parseInt(filtros.cod_cliente[i]) !== cod; }) : [].concat(filtros.nomes_clientes, [c.nome_fantasia]);
      setFiltros(function(p) { return Object.assign({}, p, { cod_cliente: nc, nomes_clientes: nn, centro_custo: [] }); });
      if (nc.length > 0) fetchAuth(apiUrl + '/bi/chat-ia/filtros?cod_cliente=' + nc.join(',')).then(function(r) { return r.json(); }).then(function(d) { setCentros(d.centros_do_cliente || []); }).catch(function() {}); else setCentros([]);
    }

    function fmtMd(t) { return t.replace(/```[\s\S]*?```/g, function(m) { return '<pre class="bg-gray-50 border border-gray-200 text-gray-700 p-3 rounded-lg text-xs overflow-x-auto my-2 font-mono">' + m.replace(/```\w*\n?/g, '').replace(/```/g, '') + '</pre>'; }).replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>').replace(/#{3}\s(.+)/g, '<h4 class="font-bold text-gray-800 text-sm mt-3 mb-1">$1</h4>').replace(/#{2}\s(.+)/g, '<h3 class="font-bold text-gray-800 text-base mt-4 mb-1">$1</h3>').replace(/#{1}\s(.+)/g, '<h2 class="font-bold text-gray-900 text-lg mt-4 mb-1">$1</h2>').replace(/\n- (.+)/g, function(_, c) { return '<div class="flex items-start gap-2 ml-3 my-0.5"><span class="text-gray-400 mt-0.5">•</span><span>' + c + '</span></div>'; }).replace(/\|(.+)\|/g, function(row) { var cells = row.split('|').filter(function(c) { return c.trim(); }); if (cells.every(function(c) { return /^[\s-:]+$/.test(c); })) return ''; return '<tr>' + cells.map(function(c) { return '<td class="border-t border-gray-100 px-3 py-2 text-xs">' + c.trim() + '</td>'; }).join('') + '</tr>'; }).replace(/(<tr.*<\/tr>)/gs, '<div class="overflow-x-auto my-3"><table class="border-collapse border border-gray-200 w-full text-xs">$1</table></div>').replace(/🟢/g,'<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs font-bold"></span>').replace(/🔴/g,'<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold"></span>').replace(/🟡/g,'<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">!</span>').replace(/\n{2,}/g, '<br>').replace(/\n/g, '<br>'); }

    function renderChart(ct, cfg) {
      if (!ct || ct.dataset.chartDone || !window.Chart) return; ct.dataset.chartDone = '1';
      var w = document.createElement('div'); w.style.cssText = 'background:#ffffff;border-radius:12px;padding:16px;border:1px solid #e5e7eb;min-height:320px;position:relative;overflow:visible;'; /* BI_ABAS_V1 */ var cvs = document.createElement('canvas'); w.appendChild(cvs); ct.style.overflow = 'visible'; ct.appendChild(w);
      try { var cT = cfg.type==='horizontalBar'?'bar':cfg.type==='area'?'line':cfg.type==='stackedBar'?'bar':cfg.type==='combo'?'bar':cfg.type, isHz=cfg.type==='horizontalBar',isSt=cfg.type==='stackedBar'||cfg.options?.stacked,isA=cfg.type==='area',isPie=cT==='pie'||cT==='doughnut',p=['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#ec4899','#6366f1','#06b6d4']; var nDs=(cfg.datasets||[]).length,pPar=(!isPie&&nDs<=2)?['#770fa8','#f67602']:null; /* BI_ABAS_V1: principal/comparação */ var ds=(cfg.datasets||[]).map(function(d,i){var dt=d.type||cT,bc=d.color||(pPar?pPar[i]:p[i%p.length]),bg=d.colors||(isPie?p:(isA?bc+'20':bc));return{label:d.label||'',data:d.data||[],backgroundColor:bg,borderColor:(dt==='line'||isA)?bc:isPie?'#fff':bg,borderWidth:(dt==='line'||isA)?2.5:isPie?2:0,fill:isA||d.fill,tension:0.4,borderRadius:dt==='bar'?6:0,pointRadius:(dt==='line'||isA)?4:0,pointHoverRadius:7,pointBackgroundColor:bc,pointBorderColor:'#fff',pointBorderWidth:2,type:d.type||undefined,yAxisID:d.yAxisID||undefined,order:d.type==='line'?0:1};}); var h1=ds.some(function(d){return d.yAxisID==='y1';}),sc=!isPie&&cT!=='radar'?{x:{grid:{display:false},ticks:{font:{size:11},maxRotation:45,color:'#6b7280'},stacked:isSt},y:{grid:{color:'#f3f4f6'},ticks:{font:{size:11},color:'#6b7280',callback:function(v){return typeof v==='number'&&v>=1000?(v/1000).toFixed(1)+'k':v;}},beginAtZero:true,stacked:isSt}}:{}; if(h1)sc.y1={position:'right',grid:{display:false},ticks:{font:{size:11},color:'#6b7280',callback:function(v){return v+'%';}},beginAtZero:true}; var sv=cfg.options?.showValues; new Chart(cvs,{type:cT,data:{labels:cfg.labels||[],datasets:ds},options:{responsive:true,maintainAspectRatio:false,animation:{duration:700,easing:'easeOutQuart'},indexAxis:isHz?'y':'x',plugins:{title:{display:!!cfg.title,text:cfg.title||'',font:{size:15,weight:'600'},color:'#111827',padding:{bottom:20}},legend:{display:(cfg.options?.legend!==false)&&(ds.length>1||isPie),position:'bottom',labels:{padding:20,usePointStyle:true,pointStyle:'circle',font:{size:12}}},tooltip:{enabled:true,backgroundColor:'#111827',padding:12,cornerRadius:8,titleFont:{size:13},bodyFont:{size:12},position:'nearest',caretSize:6,caretPadding:8,callbacks:{label:function(ctx){var lbl=ctx.dataset.label||'';var v=isPie?ctx.parsed:(ctx.parsed.y!==undefined?ctx.parsed.y:ctx.parsed);if(isPie){var total=ctx.dataset.data.reduce(function(a,b){return a+(b||0);},0);var pct=total>0?((v/total)*100).toFixed(1)+'%':'';return ' '+lbl+': '+v.toLocaleString('pt-BR')+' ('+pct+')';}if(typeof v==='number'){if(ctx.dataset.yAxisID==='y1')return ' '+(lbl?lbl+': ':'')+v.toFixed(1)+'%';if(v>=1000)return ' '+(lbl?lbl+': ':'')+v.toLocaleString('pt-BR');return ' '+(lbl?lbl+': ':'')+v;}return ' '+(lbl?lbl+': ':'')+v;}}}},scales:sc,interaction:{intersect:false,mode:isPie?'nearest':'index'}},plugins:sv?[{id:'v',afterDatasetsDraw:function(ch){var cx=ch.ctx;ch.data.datasets.forEach(function(d2,i2){var m2=ch.getDatasetMeta(i2);if(m2.type==='line')return;m2.data.forEach(function(b,j){var v=d2.data[j];if(!v)return;cx.fillStyle='#374151';cx.font='bold 11px sans-serif';cx.textAlign='center';cx.textBaseline='bottom';cx.fillText(typeof v==='number'&&v>=1000?(v/1000).toFixed(1)+'k':v,b.x,b.y-4);});});}}]:[]});
      } catch(e) { console.error('Chart err:', e); }
    }

    // ═══ BI_ABAS_V1: helpers visuais (padrão clean) ═══
    function ic(nome, sz, extra) { return el('svg', { className: 'ico', style: Object.assign({ width: sz || 16, height: sz || 16, flexShrink: 0 }, extra || {}), 'aria-hidden': 'true' }, el('use', { href: '#i-' + nome })); }
    var S_CARD = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14 };
    var S_BTN_PRI = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, padding: '0 16px', borderRadius: 10, border: '1px solid #770fa8', background: '#770fa8', color: '#ffffff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
    var S_BTN_SEC = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, padding: '0 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#ffffff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
    var S_BTN_ICO = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: '#6b7280', cursor: 'pointer', flexShrink: 0 };
    var S_LABEL = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 };
    var S_INPUT = { width: '100%', height: 38, boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0 12px', fontSize: 13, color: '#111827', background: '#ffffff' };
    var S_H3 = { margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' };
    function tabBtn(ativa, onClick, conteudo, extra) {
      return el('button', { type: 'button', role: 'tab', 'aria-selected': ativa, onClick: onClick, style: Object.assign({ border: 'none', background: 'transparent', cursor: 'pointer', padding: '12px 10px', marginBottom: -1, fontSize: 13, fontWeight: ativa ? 600 : 500, color: ativa ? '#5d0b85' : '#6b7280', borderBottom: '2px solid ' + (ativa ? '#770fa8' : 'transparent'), display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }, extra || {}) }, conteudo);
    }
    function pill(tom, txt, key) {
      var T = { roxo: ['#faf7fd', '#5d0b85', '#770fa8'], azul: ['#eff6ff', '#1e40af', '#2563eb'], ambar: ['#fffbeb', '#92400e', '#d97706'], verde: ['#f0fdf4', '#166534', '#16a34a'], vermelho: ['#fef2f2', '#991b1b', '#dc2626'], cinza: ['#f3f4f6', '#374151', '#9ca3af'] }[tom] || ['#f3f4f6', '#374151', '#9ca3af'];
      return el('span', { key: key, style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: T[0], color: T[1], whiteSpace: 'nowrap' } }, el('span', { style: { width: 6, height: 6, borderRadius: 999, background: T[2] } }), txt);
    }
    var CAT_TOM = { geral: 'cinza', negocio: 'azul', calculo: 'ambar', glossario: 'verde', formato: 'roxo' };

    // ═══ PAINEL TREINAMENTO ═══
    function PT() {
      var mA = memorias.filter(function(m) { return m.origem === 'auto' || !m.origem; }), mM = memorias.filter(function(m) { return m.origem === 'manual'; });
      var nInstr = contextos.filter(function(c) { return c.ativo; }).length;
      return el('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        el('div', { role: 'tablist', 'aria-label': 'Treinar IA', style: { display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb' } },
          tabBtn(abaTreinar === 'instrucoes', function() { setAbaTreinar('instrucoes'); if (!contextos.length) loadCtx(); }, 'Instruções (' + nInstr + ')'),
          tabBtn(abaTreinar === 'memorias', function() { setAbaTreinar('memorias'); loadMem(); }, 'Memórias (' + memorias.length + ')')
        ),
        abaTreinar === 'instrucoes' && el('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          el('div', null,
            el('p', { style: { margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' } }, 'Ensine a IA sobre sua operação'),
            el('p', { style: { margin: '2px 0 0', fontSize: 12.5, color: '#6b7280' } }, 'Instruções são regras fixas seguidas em todas as conversas.')),
          el('div', { style: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 } },
            el('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap' } },
              el('div', { style: { flex: '1 1 240px' } }, el('label', { htmlFor: 'chatia-ctx-titulo', style: S_LABEL }, 'Título'), el('input', { id: 'chatia-ctx-titulo', type: 'text', placeholder: 'Ex.: SLA Comollati', value: novoCtx.titulo, onChange: function(e) { setNovoCtx(function(p) { return Object.assign({}, p, { titulo: e.target.value }); }); }, className: 'chatia-campo', style: S_INPUT })),
              el('div', { style: { flex: '0 1 200px' } }, el('label', { htmlFor: 'chatia-ctx-cat', style: S_LABEL }, 'Categoria'), el('select', { id: 'chatia-ctx-cat', value: novoCtx.categoria, onChange: function(e) { setNovoCtx(function(p) { return Object.assign({}, p, { categoria: e.target.value }); }); }, className: 'chatia-campo', style: S_INPUT }, CATS.map(function(c) { return el('option', { key: c.id, value: c.id }, c.label); })))
            ),
            el('div', null, el('label', { htmlFor: 'chatia-ctx-conteudo', style: S_LABEL }, 'Instrução'), el('textarea', { id: 'chatia-ctx-conteudo', placeholder: 'Escreva a instrução...', value: novoCtx.conteudo, onChange: function(e) { setNovoCtx(function(p) { return Object.assign({}, p, { conteudo: e.target.value }); }); }, rows: 3, className: 'chatia-campo', style: Object.assign({}, S_INPUT, { height: 'auto', padding: '9px 12px', resize: 'vertical', lineHeight: 1.45 }) })),
            el('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
              editandoCtx && el('button', { type: 'button', onClick: function() { setEditandoCtx(null); setNovoCtx({ titulo: '', conteudo: '', categoria: 'geral' }); }, style: S_BTN_SEC }, 'Cancelar'),
              el('button', { type: 'button', onClick: saveCtx, disabled: !novoCtx.titulo.trim() || !novoCtx.conteudo.trim(), style: Object.assign({}, S_BTN_PRI, { height: 38, opacity: (!novoCtx.titulo.trim() || !novoCtx.conteudo.trim()) ? 0.45 : 1, cursor: (!novoCtx.titulo.trim() || !novoCtx.conteudo.trim()) ? 'not-allowed' : 'pointer' }) }, editandoCtx ? el(React.Fragment, null, ic('pencil', 15), 'Atualizar instrução') : el(React.Fragment, null, ic('plus', 15), 'Adicionar instrução'))
            )
          ),
          contextosLoading ? el('div', { style: { textAlign: 'center', padding: '20px 0', color: '#6b7280', fontSize: 13 } }, 'Carregando instruções...') : contextos.length === 0 ? el('div', { style: { textAlign: 'center', padding: '24px 0', color: '#6b7280', fontSize: 13 } }, 'Nenhuma instrução ainda. Use o formulário acima para criar a primeira.') :
          el('div', { style: { border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' } }, contextos.map(function(ctx, i) { var cat = CATS.find(function(c) { return c.id === ctx.categoria; }) || CATS[0]; return el('div', { key: ctx.id, style: { padding: '12px 14px', borderTop: i === 0 ? 'none' : '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', gap: 12, opacity: ctx.ativo ? 1 : 0.6, background: '#ffffff' } },
              el('div', { style: { flex: 1, minWidth: 0 } },
                el('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 } }, pill(CAT_TOM[cat.id] || 'cinza', cat.label), !ctx.ativo && pill('cinza', 'Desativada')),
                el('div', { style: { fontWeight: 600, fontSize: 13, color: '#111827' } }, ctx.titulo),
                el('p', { style: { margin: '2px 0 0', fontSize: 12.5, color: '#6b7280', whiteSpace: 'pre-wrap' } }, ctx.conteudo.length > 150 ? ctx.conteudo.substring(0, 150) + '...' : ctx.conteudo)),
              el('div', { style: { display: 'flex', gap: 2 } },
                el('button', { type: 'button', onClick: function() { togCtx(ctx); }, title: ctx.ativo ? 'Desativar instrução' : 'Ativar instrução', 'aria-label': ctx.ativo ? 'Desativar instrução' : 'Ativar instrução', style: S_BTN_ICO }, ic(ctx.ativo ? 'power' : 'play', 15)),
                el('button', { type: 'button', onClick: function() { setEditandoCtx(ctx.id); setNovoCtx({ titulo: ctx.titulo, conteudo: ctx.conteudo, categoria: ctx.categoria }); }, title: 'Editar instrução', 'aria-label': 'Editar instrução', style: S_BTN_ICO }, ic('pencil', 15)),
                el('button', { type: 'button', onClick: function() { delCtx(ctx.id); }, title: 'Remover instrução', 'aria-label': 'Remover instrução', style: Object.assign({}, S_BTN_ICO, { color: '#dc2626' }) }, ic('trash', 15)))
            ); }))
        ),
        abaTreinar === 'memorias' && el('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
          el('div', { style: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 } },
            el('p', { style: { margin: 0, fontSize: 13, fontWeight: 600, color: '#111827' } }, 'Como funciona o aprendizado automático'),
            el('p', { style: { margin: 0, fontSize: 12.5, color: '#6b7280' } }, 'Durante a conversa, a IA detecta automaticamente suas preferências e regras quando você usa certas expressões. Tudo o que ela aprender aparece aqui — com o contexto do que você disse.'),
            el('p', { style: { margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: '#374151' } }, 'Use frases como estas no chat para a IA aprender:'),
            el('div', { className: 'grid grid-cols-1 md:grid-cols-2', style: { gap: 6 } },
              [
                '"Sempre que eu pedir faturamento, separa por centro de custo"',
                '"Prefiro ver gráficos de barra horizontal"',
                '"A partir de agora, mostra a taxa de prazo em %"',
                '"Aqui a gente chama motoboy de moto"',
                '"Quando eu pedir ranking, mostra os top 10"',
                '"Não precisa mostrar os cancelados"',
                '"Na Tutts a gente considera retorno acima de 3% como crítico"',
                '"Minha preferência é ver dados por semana, não por dia"',
                '"Lembra que o cliente 767 é o Comollati"',
                '"Inclui sempre o nome do motoboy nos rankings"'
              ].map(function(ex, i) {
                return el('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#374151' } },
                  el('span', { style: { width: 4, height: 4, borderRadius: 999, background: '#9ca3af', marginTop: 7, flexShrink: 0 } }),
                  el('span', null, ex)
                );
              })
            ),
            el('p', { style: { margin: '2px 0 0', fontSize: 12, color: '#6b7280' } }, 'Você também pode adicionar memórias manualmente no campo abaixo.')
          ),
          el('div', null,
            el('label', { htmlFor: 'chatia-mem', style: S_LABEL }, 'Nova memória'),
            el('div', { style: { display: 'flex', gap: 8 } }, el('input', { id: 'chatia-mem', type: 'text', placeholder: 'Ex.: Retorno acima de 3% é crítico', value: novaMemoria, onChange: function(e) { setNovaMemoria(e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') saveMem(); }, className: 'chatia-campo', style: Object.assign({}, S_INPUT, { flex: 1 }) }), el('button', { type: 'button', onClick: saveMem, disabled: !novaMemoria.trim(), style: Object.assign({}, S_BTN_PRI, { height: 38, opacity: novaMemoria.trim() ? 1 : 0.45, cursor: novaMemoria.trim() ? 'pointer' : 'not-allowed' }) }, ic('save', 15), 'Salvar memória'))),
          memorias.length > 0 && el('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, pill('azul', mA.length + ' aprendida(s)'), pill('roxo', mM.length + ' manual(is)')),
          memorias.length === 0 ? el('div', { style: { textAlign: 'center', padding: '24px 0' } }, el('p', { style: { margin: 0, color: '#374151', fontSize: 13, fontWeight: 600 } }, 'Nenhuma memória ainda'), el('p', { style: { margin: '2px 0 0', color: '#6b7280', fontSize: 12.5 } }, 'Converse com a IA para ela aprender, ou adicione uma acima.')) :
          el('div', { style: { border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' } }, memorias.map(function(mem, i) { var isA2 = mem.origem === 'auto' || !mem.origem; return el('div', { key: mem.id, style: { padding: '12px 14px', borderTop: i === 0 ? 'none' : '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', gap: 12 } },
              el('div', { style: { flex: 1, minWidth: 0 } },
                el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' } }, isA2 ? pill('azul', 'Aprendida') : pill('roxo', 'Manual'), el('span', { style: { fontSize: 11.5, color: '#6b7280' } }, new Date(mem.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }))),
                el('p', { style: { margin: 0, fontSize: 13, color: '#111827', fontWeight: 500 } }, mem.conteudo),
                isA2 && mem.prompt_origem && el('div', { style: { marginTop: 8, background: '#f9fafb', borderRadius: 8, padding: '8px 10px', border: '1px solid #f3f4f6' } }, el('p', { style: { margin: 0, fontSize: 11.5, color: '#6b7280', fontWeight: 600 } }, 'Você disse:'), el('p', { style: { margin: '2px 0 0', fontSize: 12, color: '#374151' } }, '"' + (mem.prompt_origem.length > 150 ? mem.prompt_origem.substring(0, 150) + '...' : mem.prompt_origem) + '"'))
              ),
              el('button', { type: 'button', onClick: function() { delMem(mem.id); }, title: 'Remover memória', 'aria-label': 'Remover memória', style: Object.assign({}, S_BTN_ICO, { color: '#dc2626' }) }, ic('trash', 15))
            ); }))
        )
      );
    }

    // ═══ Filtro resumo ═══
    var fR = ''; if (iniciado) { var pp = []; if (filtros.regiao) { var rg2 = regioes.find(function(r) { return String(r.id) === String(filtros.regiao); }); if (rg2) pp.push('' + rg2.nome); } if (filtros.nomes_clientes.length > 0) pp.push('' + (filtros.nomes_clientes.length <= 2 ? filtros.nomes_clientes.join(', ') : filtros.nomes_clientes.length + ' clientes')); else pp.push('Todos'); if (filtros.centro_custo.length > 0) pp.push(filtros.centro_custo.length <= 2 ? filtros.centro_custo.join(', ') : filtros.centro_custo.length + ' centros'); if (filtros.data_inicio) pp.push('' + filtros.data_inicio + ' a ' + filtros.data_fim); fR = pp.join(' · '); }

    // ═══ Ações (mesma lógica de antes, só extraídas para reuso) ═══
    function abrirConversas() { setSidebarAberta(!sidebarAberta); if (!sidebarAberta) { setConversasLoading(true); fetchAuth(apiUrl + '/bi/chat-ia/conversas').then(function(r) { return r.json(); }).then(function(d) { setConversas(d.conversas || []); setConversasLoading(false); }).catch(function() { setConversasLoading(false); }); } }
    function exportar() { setExportando(true); fetchAuth(apiUrl + '/bi/chat-ia/exportar', { method: 'POST', body: JSON.stringify({ mensagens: msgs.map(function(m) { return { prompt: m.prompt, resposta: m.resposta }; }), filtros: filtros }) }).then(function(r) { return r.blob(); }).then(function(b) { var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'chat-ia-' + new Date().toISOString().slice(0, 10) + '.docx'; a.click(); URL.revokeObjectURL(u); setExportando(false); }).catch(function() { setExportando(false); }); }
    function salvarConversa() { fetchAuth(apiUrl + '/bi/chat-ia/conversas', { method: 'POST', body: JSON.stringify({ titulo: (msgs[0]?.prompt||'').substring(0, 60) || 'Conversa', filtros: filtros }) }).then(function(r) { return r.json(); }).then(function(d) { if (d.conversa) setConversaAtual(d.conversa.id); }).catch(function() {}); }
    function novaConversa() { setIniciado(false); setMsgs([]); setConversaAtual(null); setDadosContexto(''); setFiltros({ cod_cliente: [], nomes_clientes: [], centro_custo: [], data_inicio: '', data_fim: '', regiao: '', cliente_centro_map: null }); setDropAberto(null); setPainelTreinar(false); setAbaPreChat('filtros'); }
    function abrirConversa(conv) { fetchAuth(apiUrl + '/bi/chat-ia/conversas/' + conv.id).then(function(r) { return r.json(); }).then(function(d) { if (d.historico) { setMsgs(d.historico.map(function(h) { var _c2 = [], _t2; var cr2 = /\[CHART\]\s*\n?([\s\S]*?)\n?\[\/CHART\]/g, cm2; while ((cm2 = cr2.exec(h.resposta || '')) !== null) { try { _c2.push(JSON.parse(cm2[1].trim())); } catch(e) {} } _t2 = (h.resposta || '').replace(/\[CHART\]\s*\n?[\s\S]*?\n?\[\/CHART\]/g, '\n__CHART__\n').split('__CHART__'); return { prompt: h.prompt, resposta: h.resposta, sql: h.sql, dados: h.dados, loading: false, _charts: _c2, _textParts: _t2, _msgId: Date.now() + Math.random() }; })); setConversaAtual(conv.id); if (d.conversa?.filtros) try { setFiltros(JSON.parse(d.conversa.filtros)); } catch(e) {} setIniciado(true); setSidebarAberta(false); } }).catch(function() {}); }
    function apagarConversa(conv) { if (confirm('Deletar?')) fetchAuth(apiUrl + '/bi/chat-ia/conversas/' + conv.id, { method: 'DELETE' }).then(function() { setConversas(function(p) { return p.filter(function(c) { return c.id !== conv.id; }); }); if (conversaAtual === conv.id) { setConversaAtual(null); setMsgs([]); } }).catch(function() {}); }
    function iniciarConversa() {
      setDropAberto(null); setPreCarregando(true);
      fetchAuth(apiUrl + '/bi/chat-ia/pre-carregar', { method: 'POST', body: JSON.stringify({ filtros: filtros }) })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.dados_contexto) setDadosContexto(d.dados_contexto);
          console.log('Dados pré-carregados:', d.resumo);
          setIniciado(true); setPreCarregando(false);
        })
        .catch(function(e) {
          console.error('Erro pre-load:', e);
          setIniciado(true); setPreCarregando(false);
        });
    }
    function removerCliente(i) { var nc2 = filtros.cod_cliente.filter(function(_, j) { return j !== i; }); var nn2 = filtros.nomes_clientes.filter(function(_, j) { return j !== i; }); setFiltros(function(p) { return Object.assign({}, p, { cod_cliente: nc2, nomes_clientes: nn2, centro_custo: [] }); }); if (nc2.length > 0) fetchAuth(apiUrl + '/bi/chat-ia/filtros?cod_cliente=' + nc2.join(',')).then(function(r) { return r.json(); }).then(function(d) { setCentros(d.centros_do_cliente || []); }).catch(function() {}); else setCentros([]); }

    var nTreino = contextos.filter(function(c) { return c.ativo; }).length + memorias.length;
    var podeEnviar = !!input.trim() && !loading;
    var S_DROP = { position: 'absolute', zIndex: 50, top: '100%', marginTop: 4, left: 0, right: 0, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(17,24,39,0.08)', overflow: 'hidden' };
    var S_SELECT_BOX = function(ativo, desab) { return Object.assign({}, S_INPUT, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: desab ? 'not-allowed' : 'pointer', background: desab ? '#f9fafb' : '#ffffff', borderColor: ativo ? '#770fa8' : '#e5e7eb', boxShadow: ativo ? '0 0 0 3px #f3e8fb' : 'none' }); };

    // ═══ RENDER ═══
    return el('div', { 'data-bi-abas': 'chat-ia', style: { display: 'flex', flexDirection: 'column', gap: 16, color: '#111827', fontSize: 13, padding: '8px 0 0' }, onClick: function(e) { if (!e.target.closest('[data-dropdown]') && dropAberto) setDropAberto(null); } },
      // CABEÇALHO DA PÁGINA
      el('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 } },
        el('div', { style: { minWidth: 0 } },
          el('h1', { style: { margin: 0, fontFamily: 'Sora, Inter, sans-serif', fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', color: '#111827' } }, 'Chat IA'),
          el('p', { style: { margin: '4px 0 0', color: '#6b7280', fontSize: 13 } }, iniciado ? 'Analista de dados · ' + fR : 'Analista de dados · configure os filtros e treine a IA antes de começar')),
        iniciado && el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
          el('button', { type: 'button', onClick: function() { setPainelTreinar(!painelTreinar); if (!painelTreinar) { loadCtx(); loadMem(); } }, 'aria-expanded': painelTreinar, style: Object.assign({}, S_BTN_SEC, painelTreinar ? { background: '#faf7fd', borderColor: '#e9d5f9', color: '#5d0b85' } : {}) }, ic('brain', 15), 'Treinar IA'),
          el('button', { type: 'button', onClick: abrirConversas, 'aria-expanded': sidebarAberta, style: Object.assign({}, S_BTN_SEC, sidebarAberta ? { background: '#faf7fd', borderColor: '#e9d5f9', color: '#5d0b85' } : {}) }, ic('folder', 15), 'Conversas'),
          msgs.length > 0 && el('button', { type: 'button', onClick: exportar, disabled: exportando, style: Object.assign({}, S_BTN_SEC, { opacity: exportando ? 0.6 : 1, cursor: exportando ? 'wait' : 'pointer' }) }, ic(exportando ? 'clock' : 'download', 15), exportando ? 'Exportando...' : 'Exportar'),
          msgs.length > 0 && !conversaAtual && el('button', { type: 'button', onClick: salvarConversa, title: 'Salvar conversa', 'aria-label': 'Salvar conversa', style: Object.assign({}, S_BTN_SEC, { width: 38, padding: 0 }) }, ic('save', 15)),
          el('button', { type: 'button', onClick: novaConversa, style: S_BTN_SEC }, ic('plus', 15), 'Nova conversa')
        )
      ),

      // PAINEL TREINAR (durante chat)
      iniciado && painelTreinar && el('section', { 'aria-label': 'Treinar IA', style: Object.assign({}, S_CARD, { padding: 18 }) },
        el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
          el('h3', { style: S_H3 }, 'Treinar IA'),
          el('button', { type: 'button', onClick: function() { setPainelTreinar(false); }, title: 'Fechar', 'aria-label': 'Fechar painel de treino', style: S_BTN_ICO }, ic('x', 16))),
        PT()),

      // CONVERSAS SALVAS
      sidebarAberta && el('section', { 'aria-label': 'Conversas salvas', style: Object.assign({}, S_CARD, { overflow: 'hidden' }) },
        el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f3f4f6' } },
          el('div', null, el('h3', { style: S_H3 }, 'Conversas salvas'), el('p', { style: { margin: '2px 0 0', fontSize: 12, color: '#6b7280' } }, conversasLoading ? 'Carregando...' : conversas.length + (conversas.length === 1 ? ' conversa' : ' conversas'))),
          el('button', { type: 'button', onClick: function() { setSidebarAberta(false); }, title: 'Fechar', 'aria-label': 'Fechar conversas salvas', style: S_BTN_ICO }, ic('x', 16))),
        conversasLoading ? el('p', { style: { textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '24px 0', margin: 0 } }, 'Carregando conversas...') : conversas.length === 0 ? el('p', { style: { textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '24px 0', margin: 0 } }, 'Nenhuma conversa salva. Use o botão Salvar durante uma conversa.') :
        el('div', { style: { maxHeight: 288, overflowY: 'auto' } }, conversas.map(function(conv, i) { var atual = conversaAtual === conv.id; return el('div', { key: conv.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px 10px 18px', borderTop: i === 0 ? 'none' : '1px solid #f3f4f6', background: atual ? '#faf7fd' : '#ffffff', boxShadow: atual ? 'inset 3px 0 0 #770fa8' : 'none' } },
          el('button', { type: 'button', onClick: function() { abrirConversa(conv); }, style: { flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' } },
            el('span', { style: { display: 'block', fontSize: 13, fontWeight: 600, color: atual ? '#5d0b85' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, conv.titulo),
            el('span', { style: { display: 'block', fontSize: 12, color: '#6b7280', marginTop: 1 } }, (conv.total_mensagens || 0) + ' mensagens · ' + new Date(conv.updated_at).toLocaleDateString('pt-BR'))),
          el('button', { type: 'button', onClick: function(e) { e.stopPropagation(); apagarConversa(conv); }, title: 'Excluir conversa', 'aria-label': 'Excluir conversa ' + conv.titulo, style: Object.assign({}, S_BTN_ICO, { color: '#9ca3af' }) }, ic('trash', 15))); }))),

      // ═══ TELA PRÉ-CHAT COM SUB-ABAS ═══
      !iniciado && el('section', { style: Object.assign({}, S_CARD, { overflow: 'visible' }) },
        el('div', { role: 'tablist', 'aria-label': 'Preparar conversa', style: { display: 'flex', gap: 4, padding: '0 14px', borderBottom: '1px solid #e5e7eb' } },
          tabBtn(abaPreChat === 'filtros', function() { setAbaPreChat('filtros'); }, el(React.Fragment, null, ic('filter', 15), 'Filtros da conversa')),
          tabBtn(abaPreChat === 'treinar', function() { setAbaPreChat('treinar'); loadCtx(); loadMem(); }, el(React.Fragment, null, ic('brain', 15), 'Treinar IA', nTreino > 0 && el('span', { style: { marginLeft: 2, padding: '0 7px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: '#f3e8fb', color: '#5d0b85' } }, nTreino)))
        ),
        abaPreChat === 'filtros' && el('div', { style: { padding: 20, display: 'flex', flexDirection: 'column', gap: 16 } },
          el('p', { style: { margin: 0, fontSize: 13, color: '#6b7280' } }, 'A IA respeita esses filtros em todas as consultas da conversa.'),
          regioes.length > 0 && el('div', { style: { maxWidth: 420 } }, el('label', { htmlFor: 'chatia-regiao', style: S_LABEL }, 'Região'), el('select', { id: 'chatia-regiao', value: filtros.regiao || '', onChange: function(e) { selRegiao(e.target.value); }, className: 'chatia-campo', style: S_INPUT }, el('option', { value: '' }, 'Sem filtro de região'), regioes.map(function(rg3) { var it = typeof rg3.clientes === 'string' ? JSON.parse(rg3.clientes) : (rg3.clientes || []); return el('option', { key: rg3.id, value: rg3.id }, rg3.nome + ' (' + (Array.isArray(it) ? new Set(it.map(function(i2) { return typeof i2 === 'number' ? i2 : i2.cod_cliente; })).size : 0) + ')'); })), filtros.regiao && el('p', { style: { margin: '6px 0 0', fontSize: 12, color: '#6b7280' } }, '' + filtros.nomes_clientes.length + ' cliente(s) na região')),
          el('div', { className: 'grid grid-cols-1 md:grid-cols-2', style: { gap: 16 } },
            el('div', { style: { position: 'relative' }, 'data-dropdown': true },
              el('span', { id: 'chatia-lbl-cli', style: S_LABEL }, 'Clientes'),
              el('div', { role: 'button', tabIndex: 0, 'aria-haspopup': 'listbox', 'aria-expanded': dropAberto === 'cliente', 'aria-labelledby': 'chatia-lbl-cli', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDropAberto(dropAberto === 'cliente' ? null : 'cliente'); } }, onClick: function() { setDropAberto(dropAberto === 'cliente' ? null : 'cliente'); }, style: S_SELECT_BOX(dropAberto === 'cliente', false) }, el('span', { style: { color: filtros.cod_cliente.length === 0 ? '#6b7280' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, filtros.cod_cliente.length === 0 ? 'Todos' : filtros.nomes_clientes.length <= 2 ? filtros.nomes_clientes.join(', ') : filtros.nomes_clientes.length + ' selecionados'), ic('arrowdown', 14, { color: '#6b7280', transform: dropAberto === 'cliente' ? 'rotate(180deg)' : 'none' })),
              filtros.cod_cliente.length > 0 && el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } }, filtros.nomes_clientes.map(function(n, i) { return el('span', { key: i, style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 4px 2px 10px', background: '#faf7fd', border: '1px solid #e9d5f9', color: '#5d0b85', fontSize: 12, fontWeight: 500, borderRadius: 999 } }, n.length > 20 ? n.substring(0, 20) + '...' : n, el('button', { type: 'button', onClick: function(e) { e.stopPropagation(); removerCliente(i); }, title: 'Remover ' + n, 'aria-label': 'Remover ' + n, style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, border: 'none', background: 'transparent', color: '#5d0b85', cursor: 'pointer', borderRadius: 999 } }, ic('x', 12))); })),
              dropAberto === 'cliente' && el('div', { style: S_DROP },
                el('div', { style: { padding: 8, borderBottom: '1px solid #f3f4f6' } }, el('div', { style: { position: 'relative' } }, ic('search', 14, { position: 'absolute', left: 10, top: 12, color: '#9ca3af' }), el('input', { type: 'text', 'aria-label': 'Buscar cliente', placeholder: 'Buscar cliente ou código', value: buscaCliente, onChange: function(e) { setBuscaCliente(e.target.value); }, onClick: function(e) { e.stopPropagation(); }, className: 'chatia-campo', style: Object.assign({}, S_INPUT, { paddingLeft: 30 }), autoFocus: true }))),
                el('div', { role: 'listbox', 'aria-multiselectable': true, style: { overflowY: 'auto', maxHeight: 220 } }, clientes.filter(function(c) { return !buscaCliente || c.nome_fantasia.toLowerCase().includes(buscaCliente.toLowerCase()) || String(c.cod_cliente).includes(buscaCliente); }).map(function(c) { var sel = filtros.cod_cliente.indexOf(parseInt(c.cod_cliente)) !== -1; return el('label', { key: c.cod_cliente, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 13, background: sel ? '#faf7fd' : '#ffffff' }, onClick: function(e) { e.stopPropagation(); } }, el('input', { type: 'checkbox', checked: sel, onChange: function() { togCli(c); }, style: { accentColor: '#770fa8', width: 15, height: 15 } }), el('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#111827' } }, c.nome_fantasia), el('span', { style: { color: '#6b7280', fontSize: 12, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' } }, '#' + c.cod_cliente)); })),
                filtros.cod_cliente.length > 0 && el('div', { style: { padding: '8px 12px', borderTop: '1px solid #f3f4f6', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, el('span', { style: { fontSize: 12, color: '#6b7280' } }, filtros.cod_cliente.length + ' selecionado(s)'), el('button', { type: 'button', onClick: function(e) { e.stopPropagation(); setFiltros(function(p) { return Object.assign({}, p, { cod_cliente: [], nomes_clientes: [], centro_custo: [] }); }); setCentros([]); }, style: { border: 'none', background: 'transparent', fontSize: 12, fontWeight: 600, color: '#991b1b', cursor: 'pointer' } }, 'Limpar seleção')))),
            el('div', { style: { position: 'relative' }, 'data-dropdown': true },
              el('span', { id: 'chatia-lbl-cc', style: S_LABEL }, 'Centro de custo'),
              el('div', { role: 'button', tabIndex: filtros.cod_cliente.length === 0 ? -1 : 0, 'aria-disabled': filtros.cod_cliente.length === 0, 'aria-haspopup': 'listbox', 'aria-expanded': dropAberto === 'centro', 'aria-labelledby': 'chatia-lbl-cc', onKeyDown: function(e) { if ((e.key === 'Enter' || e.key === ' ') && filtros.cod_cliente.length > 0) { e.preventDefault(); setDropAberto(dropAberto === 'centro' ? null : 'centro'); } }, onClick: function() { if (filtros.cod_cliente.length > 0) setDropAberto(dropAberto === 'centro' ? null : 'centro'); }, style: S_SELECT_BOX(dropAberto === 'centro', filtros.cod_cliente.length === 0) }, el('span', { style: { color: filtros.centro_custo.length === 0 ? '#6b7280' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, filtros.cod_cliente.length === 0 ? 'Selecione um cliente primeiro' : filtros.centro_custo.length === 0 ? 'Todos' : filtros.centro_custo.join(', ')), filtros.cod_cliente.length > 0 && ic('arrowdown', 14, { color: '#6b7280', transform: dropAberto === 'centro' ? 'rotate(180deg)' : 'none' })),
              dropAberto === 'centro' && el('div', { role: 'listbox', 'aria-multiselectable': true, style: Object.assign({}, S_DROP, { maxHeight: 208, overflowY: 'auto' }) }, centros.map(function(cc) { var sel = filtros.centro_custo.indexOf(cc) !== -1; return el('label', { key: cc, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 13, background: sel ? '#faf7fd' : '#ffffff' }, onClick: function(e) { e.stopPropagation(); } }, el('input', { type: 'checkbox', checked: sel, onChange: function() { setFiltros(function(p) { var n = sel ? p.centro_custo.filter(function(x) { return x !== cc; }) : [].concat(p.centro_custo, [cc]); return Object.assign({}, p, { centro_custo: n }); }); }, style: { accentColor: '#770fa8', width: 15, height: 15 } }), el('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, cc)); }))),
            el('div', null, el('label', { htmlFor: 'chatia-ini', style: S_LABEL }, 'Início'), el('input', { id: 'chatia-ini', type: 'date', value: filtros.data_inicio, onChange: function(e) { setFiltros(function(p) { return Object.assign({}, p, { data_inicio: e.target.value }); }); }, className: 'chatia-campo', style: S_INPUT })),
            el('div', null, el('label', { htmlFor: 'chatia-fim', style: S_LABEL }, 'Fim'), el('input', { id: 'chatia-fim', type: 'date', value: filtros.data_fim, onChange: function(e) { setFiltros(function(p) { return Object.assign({}, p, { data_fim: e.target.value }); }); }, className: 'chatia-campo', style: S_INPUT }))
          ),
          el('div', { style: { display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f3f4f6' } },
            el('button', { type: 'button', onClick: iniciarConversa, disabled: preCarregando, style: Object.assign({}, S_BTN_PRI, { opacity: preCarregando ? 0.7 : 1, cursor: preCarregando ? 'wait' : 'pointer' }) }, preCarregando ? el(React.Fragment, null, ic('clock', 15), 'Carregando dados do período...') : el(React.Fragment, null, ic('message', 15), 'Iniciar conversa')))
        ),
        abaPreChat === 'treinar' && el('div', { style: { padding: 20 } }, PT())
      ),

      // ═══ CONVERSA ═══
      iniciado && el(React.Fragment, null,
        (filtros.cod_cliente.length > 0 || filtros.data_inicio) && el('div', { style: Object.assign({}, S_CARD, { padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }) }, el('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#374151' } }, ic('lock', 14, { color: '#6b7280' }), 'Filtros da conversa'), filtros.nomes_clientes.length > 0 && pill('roxo', filtros.nomes_clientes.length <= 2 ? filtros.nomes_clientes.join(', ') : filtros.nomes_clientes.length + ' clientes'), filtros.data_inicio && pill('roxo', filtros.data_inicio + ' a ' + filtros.data_fim), el('span', { style: { color: '#6b7280', marginLeft: 'auto' } }, 'Aplicados automaticamente')),
        msgs.length === 0 && el('section', { 'aria-label': 'Sugestões', style: Object.assign({}, S_CARD, { padding: 18 }) }, el('h3', { style: Object.assign({}, S_H3, { marginBottom: 4 }) }, 'Sugestões'), el('p', { style: { margin: '0 0 12px', fontSize: 12.5, color: '#6b7280' } }, 'Comece com uma destas perguntas ou escreva a sua abaixo.'), el('div', { className: 'grid grid-cols-1 md:grid-cols-2', style: { gap: 8 } }, (filtros.cod_cliente.length > 0 ? ['Faturamento líquido do período', 'Motoboys com prazo abaixo de 70%', 'Evolução dia a dia da taxa de prazo', 'Retornos — tipos e tendência', 'Entregas por hora do dia', 'Top 10 motoboys por prazo'] : ['Panorama geral da operação', 'Top 10 motoboys com gráfico', 'Clientes com retorno acima de 5%', 'Faturamento por cliente', 'Motos por dia e média de entregas', 'Evolução semanal de entregas']).map(function(x, i) { return el('button', { key: i, type: 'button', onClick: function() { enviar(x); }, className: 'hover:bg-gray-50', style: { textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#ffffff', fontSize: 13, color: '#374151', cursor: 'pointer' } }, ic('arrowright', 14, { color: '#770fa8' }), x); }))),
        msgs.length > 0 && el('div', { role: 'log', 'aria-live': 'polite', style: { display: 'flex', flexDirection: 'column', gap: 16 } }, msgs.map(function(msg, i) { return el('div', { key: i, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          el('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, el('div', { style: { background: '#faf7fd', border: '1px solid #f3e8fb', color: '#3a1556', borderRadius: '14px 14px 4px 14px', padding: '10px 14px', maxWidth: '80%' } }, el('p', { style: { margin: 0, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' } }, msg.prompt))),
          msg.resposta && !msg.loading && el('div', { style: { display: 'flex', justifyContent: 'flex-start' } }, el('div', { style: { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px 14px 14px 4px', padding: '14px 16px', width: '100%', maxWidth: '90%', minWidth: 0, boxSizing: 'border-box' } },
            msg.sql && el('details', { style: { marginBottom: 10 } }, el('summary', { style: { fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer' } }, 'Ver SQL'), el('pre', { style: { margin: '8px 0 0', background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', fontSize: 12, lineHeight: 1.5, padding: 12, borderRadius: 10, overflowX: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }, msg.sql)),
            el('div', null, (function() { var tp = msg._textParts || [msg.resposta], cc2 = msg._charts || [], els = []; for (var pi = 0; pi < tp.length; pi++) { if (tp[pi].trim()) els.push(el('div', { key: 't' + pi, className: 'text-gray-700 text-sm leading-relaxed', dangerouslySetInnerHTML: { __html: fmtMd(tp[pi]) } })); if (pi < cc2.length) els.push(el('div', { key: 'c' + pi, className: 'my-4', ref: (function(c) { return function(ct) { renderChart(ct, c); }; })(cc2[pi]) })); } return els; })()),
            msg.dados && msg.dados.total > 0 && el('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #f3f4f6' } }, el('span', { style: { fontSize: 12, color: '#6b7280' } }, '' + msg.dados.total + ' registros')))),
          msg.loading && el('div', { style: { display: 'flex', justifyContent: 'flex-start' } }, el('div', { role: 'status', style: { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 } }, el('div', { style: { display: 'flex', gap: 4 } }, el('div', { className: 'animate-bounce', style: { width: 7, height: 7, borderRadius: 999, background: '#c084e6' } }), el('div', { className: 'animate-bounce', style: { width: 7, height: 7, borderRadius: 999, background: '#c084e6', animationDelay: '150ms' } }), el('div', { className: 'animate-bounce', style: { width: 7, height: 7, borderRadius: 999, background: '#c084e6', animationDelay: '300ms' } })), el('span', { style: { fontSize: 13, color: '#6b7280' } }, 'Analisando...')))); }), el('div', { ref: chatEndRef })),
        el('div', { style: { position: 'sticky', bottom: 0, background: '#f9fafb', paddingTop: 8, paddingBottom: 8 } },
          el('div', { style: Object.assign({}, S_CARD, { padding: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }) },
            el('label', { htmlFor: 'chatia-input', className: 'sr-only' }, 'Pergunta para a IA'),
            el('textarea', { id: 'chatia-input', value: input, onChange: function(e) { setInput(e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }, placeholder: 'Pergunte algo sobre os dados', rows: 2, style: { flex: 1, minWidth: 0, resize: 'none', border: 'none', outline: 'none', fontSize: 13.5, color: '#111827', padding: '6px 6px', background: 'transparent', lineHeight: 1.45 } }),
            msgs.length > 0 && el('button', { type: 'button', onClick: function() { setMsgs([]); }, title: 'Limpar mensagens', 'aria-label': 'Limpar mensagens', style: Object.assign({}, S_BTN_ICO, { width: 40, height: 40, color: '#9ca3af' }) }, ic('trash', 16)),
            el('button', { type: 'button', onClick: function() { enviar(); }, disabled: !podeEnviar, style: Object.assign({}, S_BTN_PRI, { opacity: podeEnviar ? 1 : 0.45, cursor: podeEnviar ? 'pointer' : 'not-allowed' }) }, loading ? el(React.Fragment, null, ic('clock', 15), 'Enviando') : el(React.Fragment, null, ic('arrowright', 15), 'Enviar'))),
          el('p', { style: { margin: '6px 0 0', fontSize: 11.5, color: '#6b7280', textAlign: 'center' } }, 'Enter envia · Shift+Enter quebra linha · Powered by Gemini'))
      )
    );
  }

  window.ChatIAModule = ChatIAModule;
})();
